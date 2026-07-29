// scripts/enrich-corpus.js
// 规范化 anime-corpus.json 字段，补齐 AnimeVerse 需要的元数据

import fs from 'fs';

const inputPath = './public/data/anime-corpus.json';
const outputPath = './public/data/anime-corpus.json';

const corpus = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// 一些常见作者的兜底映射（基于标题关键词，不完美但可用于演示）
const knownAuthors = {
  'Frieren': 'Yamahara Abe',
  'Gintama': 'Hideaki Sorachi',
  'Fullmetal Alchemist': 'Hiromu Arakawa',
  'Attack on Titan': 'Hajime Isayama',
  'One Piece': 'Eiichiro Oda',
  'Naruto': 'Masashi Kishimoto',
  'Death Note': 'Tsugumi Ohba',
  'Steins;Gate': 'Naotaka Hayashi',
  'CLANNAD': 'Jun Maeda',
  'Hunter x Hunter': 'Yoshihiro Togashi',
  'Demon Slayer': 'Koyoharu Gotouge',
  'Jujutsu Kaisen': 'Gege Akutami',
  'My Hero Academia': 'Kohei Horikoshi',
  'Sword Art Online': 'Reki Kawahara',
  'Re:Zero': 'Tappei Nagatsuki',
  'Your Name': 'Makoto Shinkai',
  'Spirited Away': 'Hayao Miyazaki',
  'Evangelion': 'Hideaki Anno',
  'Cowboy Bebop': 'Keiko Nobumoto',
  'Code Geass': 'Ichiro Okouchi',
  'Toradora': 'Yuyuko Takemiya',
  'Violet Evergarden': 'Kana Akatsuki',
  'A Silent Voice': 'Yoshitoki Oima',
  'Made in Abyss': 'Akihito Tsukushi',
  'Mob Psycho 100': 'ONE',
  'One Punch Man': 'ONE',
  'Bakemonogatari': 'Nisio Isin',
  'March Comes in Like a Lion': 'Chica Umino',
  'Haikyuu': 'Haruichi Furudate',
  'Kaguya-sama': 'Aka Akasaka'
};

function guessAuthor(title) {
  for (const [key, author] of Object.entries(knownAuthors)) {
    if (title?.includes(key)) return author;
  }
  return 'Original Work';
}

function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

const enriched = corpus.map((anime, index) => {
  const title = anime.titleRomaji || anime.titleEnglish || '';

  return {
    // 身份字段
    id: String(anime.id || `anime-${index}`),
    titleRomaji: anime.titleRomaji || anime.titleEnglish || 'Unknown',
    titleJa: anime.titleNative || anime.titleRomaji || '',
    titleEnglish: anime.titleEnglish || anime.titleRomaji || '',

    // 时间
    year: anime.year || 2000,
    season: anime.season || 'Unknown',
    format: anime.format || 'TV',
    episodes: anime.episodes || null,

    // 分类
    genres: toArray(anime.genres),
    tags: toArray(anime.tags),

    // 评分与热度
    score: anime.averageScore || anime.score || 70,
    popularity: anime.popularity || 0,

    // 视觉
    coverImage: anime.coverImage || `./images/${index % 42}.jpg`,
    bannerImage: anime.bannerImage || null,

    // 文字
    synopsis: anime.description || anime.synopsis || '',

    // 制作
    studios: toArray(anime.studios),
    directors: toArray(anime.director || anime.directors),
    authors: toArray(anime.authors || anime.author).length
      ? toArray(anime.authors || anime.author)
      : [guessAuthor(title)],
    music: toArray(anime.music).length
      ? toArray(anime.music)
      : ['Original Soundtrack'],

    // 角色（基于 tags 或占位）
    characters: toArray(anime.characters).length
      ? toArray(anime.characters)
      : ['Protagonist'],

    // 荣誉
    awards: toArray(anime.awards).length
      ? toArray(anime.awards)
      : [],

    // 关系（先占位，knowledge-graph 生成时再扩充）
    relations: {
      sequel: toArray(anime.relations?.sequel),
      prequel: toArray(anime.relations?.prequel),
      sameStudio: [],
      sameAuthor: [],
      sameGenre: [],
      sameEra: []
    },

    // 统计
    rank: index + 1
  };
});

// 第二遍：基于 studio/author/genre/year 填充 sameStudio / sameAuthor / sameGenre / sameEra
for (const a of enriched) {
  for (const b of enriched) {
    if (a.id === b.id) continue;

    if (a.studios?.some(s => b.studios?.includes(s)) && !a.relations.sameStudio.includes(b.id)) {
      a.relations.sameStudio.push(b.id);
    }
    if (a.authors?.some(s => b.authors?.includes(s)) && !a.relations.sameAuthor.includes(b.id)) {
      a.relations.sameAuthor.push(b.id);
    }
    if (a.genres?.some(g => b.genres?.includes(g)) && !a.relations.sameGenre.includes(b.id)) {
      a.relations.sameGenre.push(b.id);
    }
    if (Math.abs(a.year - b.year) <= 2 && !a.relations.sameEra.includes(b.id)) {
      a.relations.sameEra.push(b.id);
    }
  }

  // 限制数量，避免过大
  a.relations.sameStudio = a.relations.sameStudio.slice(0, 10);
  a.relations.sameAuthor = a.relations.sameAuthor.slice(0, 10);
  a.relations.sameGenre = a.relations.sameGenre.slice(0, 15);
  a.relations.sameEra = a.relations.sameEra.slice(0, 15);
}

fs.writeFileSync(outputPath, JSON.stringify(enriched, null, 2));
console.log(`✅ 已规范化 ${enriched.length} 条动漫数据，保存到 ${outputPath}`);
