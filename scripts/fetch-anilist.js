import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const DELAY_MS = 800;
const MAX_RETRIES = 5;

// AniList official genres as returned by the GenreCollection query.
const OFFICIAL_GENRES = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Hentai',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller'
];

const GENRE_PALETTE = {
  'Action': '#ff4444',
  'Adventure': '#ffcc00',
  'Comedy': '#ffee66',
  'Drama': '#b892ff',
  'Ecchi': '#ff99cc',
  'Fantasy': '#b026ff',
  'Hentai': '#ff69b4',
  'Horror': '#aa66ff',
  'Mahou Shoujo': '#ff88cc',
  'Mecha': '#00ccff',
  'Music': '#66ffaa',
  'Mystery': '#aa66ff',
  'Psychological': '#00f3ff',
  'Romance': '#ff88cc',
  'Sci-Fi': '#00f3ff',
  'Slice of Life': '#66ffaa',
  'Sports': '#ffcc00',
  'Supernatural': '#b026ff',
  'Thriller': '#aa66ff'
};

const DECADES = [
  { label: '1960s', start: 19600101, end: 19691231 },
  { label: '1970s', start: 19700101, end: 19791231 },
  { label: '1980s', start: 19800101, end: 19891231 },
  { label: '1990s', start: 19900101, end: 19991231 },
  { label: '2000s', start: 20000101, end: 20091231 },
  { label: '2010s', start: 20100101, end: 20191231 },
  { label: '2020s', start: 20200101, end: 20291231 }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAniList(query, variables = {}) {
  const res = await fetch(ANILIST_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AniList HTTP ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`AniList GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function fetchWithRetry(query, variables, attempt = 0) {
  try {
    return await fetchAniList(query, variables);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const backoff = Math.min(2000 * 2 ** attempt, 30000);
    console.warn(`  Retry ${attempt + 1}/${MAX_RETRIES} after ${backoff}ms: ${err.message}`);
    await sleep(backoff);
    return fetchWithRetry(query, variables, attempt + 1);
  }
}

const PAGE_QUERY = `
query Page(
  $page: Int,
  $perPage: Int,
  $sort: [MediaSort],
  $type: MediaType,
  $genre: String,
  $startDate_greater: FuzzyDateInt,
  $startDate_lesser: FuzzyDateInt
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(
      type: $type,
      sort: $sort,
      genre: $genre,
      startDate_greater: $startDate_greater,
      startDate_lesser: $startDate_lesser
    ) {
      id
      title { romaji native english }
      description
      coverImage { large medium }
      averageScore
      popularity
      genres
      tags { name rank }
      startDate { year }
      studios { nodes { name } }
      staff(perPage: 3) { edges { role node { name { full } } } }
      format
      episodes
    }
  }
}`;

function normalizeMedia(m) {
  const director = (m.staff?.edges || []).find(e =>
    e.role?.toLowerCase().includes('director')
  )?.node?.name?.full || '';
  return {
    id: m.id,
    titleRomaji: m.title?.romaji || '',
    titleNative: m.title?.native || '',
    titleEnglish: m.title?.english || '',
    year: m.startDate?.year || 0,
    genres: m.genres || [],
    tags: (m.tags || []).slice(0, 5).map(t => t.name),
    description: (m.description || '').replace(/<[^>]+>/g, ' ').trim(),
    coverImage: m.coverImage?.large || m.coverImage?.medium || '',
    averageScore: m.averageScore || 0,
    popularity: m.popularity || 0,
    studios: (m.studios?.nodes || []).map(s => s.name),
    director,
    format: m.format || '',
    episodes: m.episodes || 0
  };
}

function loadExistingCorpus(corpusPath) {
  if (!fs.existsSync(corpusPath)) return new Map();
  try {
    const arr = JSON.parse(fs.readFileSync(corpusPath, 'utf-8'));
    const map = new Map();
    for (const anime of arr) {
      if (anime && anime.id != null) map.set(anime.id, anime);
    }
    console.log(`Loaded ${map.size} existing anime from ${corpusPath}`);
    return map;
  } catch (err) {
    console.warn(`Could not load existing corpus: ${err.message}`);
    return new Map();
  }
}

async function fetchStrategy(label, baseVars, sort, maxPages, resultsMap) {
  let page = 1;
  let hasNext = true;
  let fetched = 0;
  while (hasNext && page <= maxPages) {
    const data = await fetchWithRetry(PAGE_QUERY, { ...baseVars, page, perPage: 50, type: 'ANIME', sort });
    const media = data.Page.media || [];
    fetched += media.length;
    for (const m of media) {
      resultsMap.set(m.id, normalizeMedia(m));
    }
    hasNext = data.Page.pageInfo.hasNextPage;
    page += 1;
    if (hasNext && page <= maxPages) await sleep(DELAY_MS);
  }
  console.log(`  ${label}: +${fetched} entries (unique total: ${resultsMap.size})`);
}

async function fetchAllData(targetCount, existingMap, missingGenres) {
  const resultsMap = new Map(existingMap);

  // 1. Fill in any genres that are missing from the existing corpus.
  if (missingGenres.length) {
    console.log(`Fetching representatives for ${missingGenres.length} missing official genre(s)...`);
    for (const genre of missingGenres) {
      await fetchStrategy(`genre:${genre}`, { genre }, ['POPULARITY_DESC'], 2, resultsMap);
    }
  } else {
    console.log('All official genres already represented.');
  }

  // 2. Ensure coverage across decades.
  console.log('Fetching top-scoring anime from each decade...');
  for (const decade of DECADES) {
    await fetchStrategy(
      `decade:${decade.label}`,
      { startDate_greater: decade.start, startDate_lesser: decade.end },
      ['SCORE_DESC'],
      2,
      resultsMap
    );
  }

  // 3. Broad global sorts to reach the target count.
  console.log('Fetching global popularity sort...');
  await fetchStrategy('global:POPULARITY_DESC', {}, ['POPULARITY_DESC'], 12, resultsMap);

  console.log('Fetching global score sort...');
  await fetchStrategy('global:SCORE_DESC', {}, ['SCORE_DESC'], 6, resultsMap);

  console.log('Fetching global trending sort...');
  await fetchStrategy('global:TRENDING_DESC', {}, ['TRENDING_DESC'], 4, resultsMap);

  // 4. If still below target, keep paginating by popularity.
  if (resultsMap.size < targetCount) {
    console.log(`Still below target (${resultsMap.size}/${targetCount}); paginating further...`);
    await fetchStrategy('global:POPULARITY_DESC_EXTRA', {}, ['POPULARITY_DESC'], 8, resultsMap);
  }

  return Array.from(resultsMap.values());
}

function buildReport(animeList) {
  const genreCounts = {};
  for (const anime of animeList) {
    for (const g of anime.genres || []) {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    }
  }

  const years = animeList.map(a => a.year).filter(y => y > 0).sort((a, b) => a - b);
  const missingGenres = OFFICIAL_GENRES.filter(g => !genreCounts[g]);

  return {
    total: animeList.length,
    genreCounts,
    oldestYear: years[0] || 0,
    newestYear: years[years.length - 1] || 0,
    missingGenres
  };
}

async function main() {
  const target = parseInt(process.argv[2], 10) || 500;

  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const corpusPath = path.join(dataDir, 'anime-corpus.json');
  const manifestPath = path.join(dataDir, 'genre-manifest.json');

  const existingMap = loadExistingCorpus(corpusPath);
  const existingGenres = new Set();
  existingMap.forEach(a => (a.genres || []).forEach(g => existingGenres.add(g)));
  const missingGenres = OFFICIAL_GENRES.filter(g => !existingGenres.has(g));

  let animeList;
  if (existingMap.size >= target && missingGenres.length === 0) {
    console.log(`Existing corpus has ${existingMap.size} anime and covers all ${OFFICIAL_GENRES.length} official genres; skipping API fetch.`);
    animeList = Array.from(existingMap.values());
  } else {
    console.log(`Fetching at least ${target} unique anime from AniList...`);
    console.log('');
    animeList = await fetchAllData(target, existingMap, missingGenres);
  }

  const genreMap = {};
  for (const anime of animeList) {
    for (const g of anime.genres || []) {
      if (!genreMap[g]) {
        genreMap[g] = { count: 0, color: GENRE_PALETTE[g] || '#00f3ff' };
      }
      genreMap[g].count += 1;
    }
  }

  // Ensure every official genre appears in the manifest, even if count is zero.
  for (const g of OFFICIAL_GENRES) {
    if (!genreMap[g]) {
      genreMap[g] = { count: 0, color: GENRE_PALETTE[g] || '#00f3ff' };
    }
  }

  fs.writeFileSync(corpusPath, JSON.stringify(animeList, null, 2), 'utf-8');
  fs.writeFileSync(manifestPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: animeList.length,
    genres: genreMap
  }, null, 2), 'utf-8');

  const report = buildReport(animeList);

  console.log('');
  console.log('==== AniList Fetch Report ====');
  console.log(`Total unique anime: ${report.total}`);
  console.log(`Year range: ${report.oldestYear || 'unknown'} - ${report.newestYear || 'unknown'}`);
  console.log(`Official genres covered: ${OFFICIAL_GENRES.length - report.missingGenres.length}/${OFFICIAL_GENRES.length}`);
  if (report.missingGenres.length) {
    console.log(`Missing genres: ${report.missingGenres.join(', ')}`);
  }
  console.log('Genre counts:');
  for (const g of OFFICIAL_GENRES) {
    console.log(`  ${g}: ${report.genreCounts[g] || 0}`);
  }
  console.log('==============================');

  if (report.total < target) {
    console.warn(`Warning: fetched ${report.total} anime, below target ${target}.`);
  }
  if (report.missingGenres.length) {
    console.warn('Warning: some official genres have no representatives.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
