// src/engines/data/DataEngine.js
// 动漫数据加载、索引与查询引擎
// 优化点：
//   1. 离线缓存（localStorage + sessionStorage）二次访问免下载
//   2. 知识图谱（6MB）走后台懒加载 + 可中断
//   3. 请求带超时、失败回退到缓存
//   4. 搜索索引 O(1) 倒排，避免每帧 O(n) 扫描
//   5. 图片懒加载交给组件层，本引擎只处理数据
//   6. 中文/日文归一化搜索，提升中文搜索命中率

import { ref, computed } from 'vue';

const base = import.meta.env.BASE_URL;

const data = ref([]);
const genres = ref({});
const graph = ref({ nodes: [], edges: [] });
const loaded = ref(false);           // 核心数据已就绪（首屏可渲染）
const fullyLoaded = ref(false);      // 全集 1711 部已加载
const loading = ref(false);
const loadProgress = ref(0);
const loadFromCache = ref(false);
const coreLoaded = ref(false);       // 80 部热门作品已加载
const error = ref(null);
const graphLoaded = ref(false);
const graphLoading = ref(false);
let loadPromise = null;

// 搜索索引（数据加载后构建，将 O(n) 扫描降为 O(k) 查找）
let indexById = new Map();
let indexByYear = new Map();
let indexByGenre = new Map();
let indexByTitleToken = new Map(); // 分词倒排索引
let indexBuilt = false;

// 缓存配置
const CACHE_PREFIX = 'nc-cache:';
const CORPUS_CACHE_KEY = CACHE_PREFIX + 'anime-corpus:v2';
const GENRE_CACHE_KEY = CACHE_PREFIX + 'genre-manifest:v1';
const CORE_CACHE_KEY = CACHE_PREFIX + 'anime-core:v1';
// 7 天 TTL：数据不常变，二次访问秒开；TTL 到期后台静默刷新
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const years = computed(() =>
  [...new Set(data.value.map(a => a.year).filter(Boolean))].sort((a, b) => a - b)
);

const yearGroups = computed(() => {
  const map = new Map();
  for (const anime of data.value) {
    if (!map.has(anime.year)) map.set(anime.year, []);
    map.get(anime.year).push(anime);
  }
  return map;
});

/** 带超时的 fetch；超时后 AbortController 真正中断网络请求 */
function fetchWithTimeout(url, ms = 15000, signal = null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  // 允许外部 signal 级联中断
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}

/** 安全读取 localStorage（隐私模式 / 配额满会抛错，直接降级） */
function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.ts && Date.now() - parsed.ts > CACHE_TTL_MS) return null; // TTL 过期
    return parsed.value;
  } catch (e) {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
  } catch (e) {
    // 配额满或隐私模式，静默失败——只影响二次访问速度，不影响功能
  }
}

// 简繁/日中常用汉字归一化表，提升中文搜索命中率
const SC_TO_TC_MAP = {
  '进': '進', '击': '撃', '国': '國', '龙': '龍', '门': '門', '来': '來', '过': '過',
  '说': '說', '对': '對', '开': '開', '关': '關', '电': '電', '话': '話', '丽': '麗',
  '战': '戰', '场': '場', '热': '熱', '爱': '愛', '梦': '夢', '学': '學', '园': '園',
  '强': '強', '义': '義', '间': '間', '问': '問', '闻': '聞', '觉': '覚', '灵': '霊',
  '异': '異', '转': '転', '让': '譲', '东': '東', '风': '風', '书': '書', '见': '見',
  '贝': '貝', '从': '従', '动': '動', '会': '會', '个': '個', '伦': '倫', '优': '優',
  '伪': '偽', '伞': '傘', '伟': '偉', '创': '創', '剑': '劍', '剧': '劇', '务': '務',
  '单': '單', '卫': '衛', '发': '發', '变': '變', '员': '員', '响': '響', '团': '團',
  '圣': '聖', '复': '復', '夺': '奪', '奴': '奴', '妙': '妙', '姐': '姐', '姬': '姫',
  '嫁': '嫁', '字': '字', '宅': '宅', '实': '実', '客': '客', '宫': '宮', '家': '家',
  '密': '密', '将': '將', '尸': '屍', '属': '屬', '岭': '嶺', '巫': '巫', '带': '帶',
  '库': '庫', '废': '廃', '张': '張', '影': '影', '征': '征',
  '御': '御', '忍': '忍', '怪': '怪', '恋': '恋', '恐': '恐', '惠': '恵', '惨': '惨',
  '惩': '懲', '戏': '戯', '拂': '払', '拜': '拝', '拟': '擬', '挥': '揮',
  '敌': '敵', '斩': '斬', '断': '断', '时': '時', '晓': '暁', '晚': '晩', '普': '普',
  '曲': '曲', '最': '最', '杀': '殺', '极': '極', '枪': '槍', '樱': '桜', '歌': '歌',
  '武': '武', '残': '残', '气': '気', '求': '求', '汉': '漢', '测': '測', '海': '海',
  '涂': '塗', '灭': '滅', '灾': '災', '点': '点', '烧': '焼',
  '狱': '獄', '王': '王', '现': '現', '画': '画', '疗': '療', '盗': '盗',
  '码': '碼', '离': '離', '种': '種', '空': '空', '站': '駅', '笔': '筆', '第': '第',
  '等': '等', '算': '算', '紫': '紫', '红': '紅', '终': '終', '经': '経', '结': '結',
  '给': '給', '绝': '絶', '绣': '綉', '网': '網', '罪': '罪', '美': '美', '职': '職',
  '脑': '脳', '脚': '脚', '腾': '騰', '舞': '舞', '航': '航', '舰': '艦', '花': '花',
  '苍': '蒼', '蓝': '藍', '藏': '蔵', '虏': '虜', '虫': '虫', '血': '血', '补': '補',
  '装': '装', '裤': '褲', '观': '観', '视': '視', '解': '解', '言': '言',
  '计': '計', '记': '記', '设': '設', '诈': '詐', '诗': '詩', '语': '語',
  '误': '誤', '请': '請', '课': '課', '调': '調', '谎': '謊', '象': '象', '责': '責',
  '财': '財', '贤': '賢', '赛': '賽', '赞': '賛', '赠': '贈', '赢': '贏', '走': '走',
  '超': '超', '路': '路', '车': '車', '轻': '軽', '辉': '輝', '辞': '辞',
  '边': '辺', '达': '達', '运': '運', '远': '遠', '连': '連',
  '选': '選', '遗': '遺', '邮': '郵', '都': '都', '酱': '醤', '里': '里', '钟': '鐘',
  '银': '銀', '铁': '鉄', '锁': '鎖', '镇': '鎮', '长': '長',
  '阳': '陽', '阴': '陰', '阵': '陣', '阶': '階', '隐': '隠', '隶': '隷',
  '难': '難', '雨': '雨', '雾': '霧', '霭': '靄', '静': '静', '面': '面', '音': '音',
  '顶': '頂', '项': '項', '顺': '順', '须': '須', '领': '領', '频': '頻', '题': '題',
  '颜': '顔', '飞': '飛', '饭': '飯', '饮': '飲', '馆': '館', '马': '馬',
  '驱': '駆', '验': '験', '骑': '騎', '鬼': '鬼', '魔': '魔', '鱼': '魚', '鲜': '鮮',
  '鸟': '鳥', '鸡': '鶏', '黑': '黒'
};

function normalizeCJK(text) {
  return String(text).split('').map(ch => SC_TO_TC_MAP[ch] || ch).join('');
}

/** 构建搜索索引：id/年份/流派/标题分词倒排 */
function buildIndex() {
  if (indexBuilt) return;
  indexById = new Map();
  indexByYear = new Map();
  indexByGenre = new Map();
  indexByTitleToken = new Map();

  for (const anime of data.value) {
    indexById.set(String(anime.id), anime);

    if (anime.year) {
      if (!indexByYear.has(anime.year)) indexByYear.set(anime.year, []);
      indexByYear.get(anime.year).push(anime);
    }

    if (anime.genres) {
      for (const g of anime.genres) {
        if (!indexByGenre.has(g)) indexByGenre.set(g, []);
        indexByGenre.get(g).push(anime);
      }
    }

    const titles = [anime.titleRomaji, anime.titleJa, anime.titleEnglish]
      .filter(Boolean)
      .map(s => String(s).toLowerCase());
    const tokens = new Set();
    for (const title of titles) {
      tokens.add(title);
      for (let i = 0; i < title.length - 1; i++) {
        tokens.add(title.slice(i, i + 2));
      }
      for (const ch of title) {
        tokens.add(ch);
      }
    }
    if (anime.tags) {
      for (const tag of anime.tags) tokens.add(String(tag).toLowerCase());
    }
    if (anime.studios) {
      for (const s of anime.studios) tokens.add(String(s).toLowerCase());
    }

    for (const token of tokens) {
      if (!indexByTitleToken.has(token)) indexByTitleToken.set(token, new Set());
      indexByTitleToken.get(token).add(anime);
    }
  }

  indexBuilt = true;
  console.log(`[DataEngine] 索引构建完成: ${indexById.size} id, ${indexByYear.size} 年份, ${indexByGenre.size} 流派, ${indexByTitleToken.size} 标题token`);
}

function searchByIndex(term) {
  const lower = term.toLowerCase();
  const results = new Set();

  const exact = indexByTitleToken.get(lower);
  if (exact) exact.forEach(a => results.add(a));

  for (const [token, animes] of indexByTitleToken) {
    if (token.startsWith(lower) || token.includes(lower)) {
      animes.forEach(a => results.add(a));
    }
  }

  return [...results];
}

/**
 * 用 XHR 加载 JSON 并支持进度回调（fetch 不支持 download progress）
 */
function xhrLoadJson(url, timeoutMs, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = timeoutMs;
    xhr.responseType = 'json';
    xhr.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let json = xhr.response;
        if (typeof json === 'string') {
          try { json = JSON.parse(json); } catch (e) { reject(e); return; }
        }
        resolve(json);
      } else {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Timeout'));
    xhr.send();
  });
}

/**
 * 统一的 JSON 加载器：先读缓存（即时），再发起网络（后台刷新）
 * 返回 { value, fromCache } 结构
 * @param onProgress {Function} 0-1 进度回调
 */
async function loadCachedJson(url, cacheKey, timeoutMs, onProgress) {
  const cached = cacheGet(cacheKey);

  if (cached) {
    // 命中缓存：立即返回；进度直接满，后台静默刷新但不 await
    if (onProgress) onProgress(1);
    const networkPromise = xhrLoadJson(url, timeoutMs).then(json => {
      cacheSet(cacheKey, json);
      return json;
    }).catch(err => {
      console.warn(`[DataEngine] 后台刷新 ${url} 失败，继续使用缓存:`, err.message);
    });
    return { value: cached, fromCache: true, networkPromise };
  }

  // 无缓存：必须等网络，带进度
  try {
    const json = await xhrLoadJson(url, timeoutMs, onProgress);
    cacheSet(cacheKey, json);
    return { value: json, fromCache: false, networkPromise: Promise.resolve(json) };
  } catch (err) {
    // 网络失败尝试用过期缓存（TTL 过期但仍可能可用）
    try {
      const stale = localStorage.getItem(cacheKey);
      if (stale) {
        const parsed = JSON.parse(stale);
        if (parsed?.value) {
          console.warn(`[DataEngine] 网络失败，使用过期缓存: ${url}`);
          return { value: parsed.value, fromCache: true, networkPromise: null };
        }
      }
    } catch (e) {}
    throw err;
  }
}

export const DataEngine = {
  data,
  genres,
  graph,
  loaded,
  loading,
  fullyLoaded,
  coreLoaded,
  loadProgress,
  loadFromCache,
  error,
  graphLoaded,
  graphLoading,
  years,
  yearGroups,

  async load() {
    if (loaded.value) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      loading.value = true;
      error.value = null;
      loadProgress.value = 0.05;

      const localCovers = Array.from({ length: 42 }, (_, i) => `${base}images/${i}.jpg`);
      const mapCovers = (list) => list.map((anime, i) => ({
        ...anime,
        coverImage: anime.coverImage || localCovers[i % localCovers.length],
        coverFallback: localCovers[i % localCovers.length]
      }));

      try {
        // 策略：先用 146KB 核心集（top 80 热门）让首屏秒开，
        // 然后后台加载 4.3MB 全集，不阻塞 UI
        const [coreResult, genreResult] = await Promise.all([
          loadCachedJson(`${base}data/anime-core.json`, CORE_CACHE_KEY, 10000, (p) => {
            loadProgress.value = 0.1 + p * 0.5; // core 占 50% 进度
          }),
          loadCachedJson(`${base}data/genre-manifest.json`, GENRE_CACHE_KEY, 8000, () => {
            loadProgress.value = Math.max(loadProgress.value, 0.6);
          })
        ]);

        loadFromCache.value = coreResult.fromCache;
        genres.value = genreResult.value;
        // 核心数据就绪，首屏可渲染（80 部热门作品）
        data.value = mapCovers(coreResult.value);
        coreLoaded.value = true;
        loaded.value = true;
        loadProgress.value = 0.65;
        buildIndex();
        // 先建一个基于核心数据的图
        setTimeout(() => this.buildGraphFromCorpus(), 0);

        loading.value = false;
        loadProgress.value = 0.7;

        // 后台加载全集 4.3MB（不 await，不阻塞 UI）
        loadCachedJson(`${base}data/anime-corpus.json`, CORPUS_CACHE_KEY, 30000, (p) => {
          loadProgress.value = 0.7 + p * 0.3;
        }).then(fullResult => {
          const fullData = mapCovers(fullResult.value);
          data.value = fullData;
          fullyLoaded.value = true;
          loadProgress.value = 1;
          indexBuilt = false;
          buildIndex();
          this.buildGraphFromCorpus();
          console.log(`[DataEngine] 全集加载完成: ${fullData.length} 部作品`);
        }).catch(err => {
          console.warn('[DataEngine] 全集加载失败，继续使用核心集:', err.message);
          loadProgress.value = 1;
          fullyLoaded.value = true;
        });

      } catch (err) {
        // 核心集也失败了，尝试直接加载全集作为兜底
        console.warn('[DataEngine] 核心集加载失败，尝试全集:', err);
        try {
          const [fullResult, genreResult] = await Promise.all([
            loadCachedJson(`${base}data/anime-corpus.json`, CORPUS_CACHE_KEY, 30000, (p) => {
              loadProgress.value = 0.1 + p * 0.85;
            }),
            loadCachedJson(`${base}data/genre-manifest.json`, GENRE_CACHE_KEY, 10000)
          ]);
          genres.value = genreResult.value;
          data.value = mapCovers(fullResult.value);
          coreLoaded.value = true;
          loaded.value = true;
          fullyLoaded.value = true;
          loadProgress.value = 1;
          buildIndex();
          setTimeout(() => this.buildGraphFromCorpus(), 0);
          loading.value = false;
        } catch (e2) {
          error.value = e2.message;
          console.error('[DataEngine] 加载完全失败:', e2);
          loading.value = false;
          throw e2;
        }
      } finally {
        loadPromise = null;
      }
    })();

    return loadPromise;
  },

  /**
   * 从 corpus 中每部作品已内嵌的 relations 字段构建知识图谱边。
   * 替代原来下载 6MB knowledge-graph.json 的方案，纯内存计算，<10ms。
   * corpus 中的 relations 结构：
   *   { sequel, prequel, sameStudio, sameAuthor, sameGenre, sameEra }: string[]
   */
  buildGraphFromCorpus() {
    if (graphLoading.value) return;
    graphLoading.value = true;
    try {
      const edges = [];
      // camelCase → kebab-case 类型映射，与 KnowledgeEngine/GalaxyEngine 的颜色表一致
      const TYPE_MAP = {
        sequel: 'sequel',
        prequel: 'prequel',
        sameStudio: 'same-studio',
        sameAuthor: 'same-author',
        sameGenre: 'same-genre',
        sameEra: 'same-era'
      };
      // 各关系类型默认权重
      const WEIGHTS = {
        sequel: 0.95, prequel: 0.95,
        'same-studio': 0.6, 'same-author': 0.8,
        'same-genre': 0.4, 'same-era': 0.3
      };
      const existingIds = new Set(data.value.map(a => String(a.id)));

      for (const anime of data.value) {
        const rels = anime.relations;
        if (!rels) continue;
        const sourceId = String(anime.id);
        for (const [camelKey, targets] of Object.entries(rels)) {
          const type = TYPE_MAP[camelKey];
          if (!type || !Array.isArray(targets)) continue;
          for (const target of targets) {
            const targetId = String(target);
            // 只保留指向真实存在作品的边，避免悬挂引用
            if (!existingIds.has(targetId)) continue;
            edges.push({
              source: sourceId,
              target: targetId,
              type,
              weight: WEIGHTS[type] ?? 0.5
            });
          }
        }
      }

      // 去重（corpus 中 A→B 和 B→A 可能同时存在，KnowledgeEngine.related
      // 本身已双向查找，但去重可减少后续遍历开销）
      const seen = new Set();
      const deduped = [];
      for (const e of edges) {
        const key = [e.source, e.target, e.type].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(e);
      }

      graph.value = { nodes: [], edges: deduped };
      graphLoaded.value = true;
      console.log(`[DataEngine] 知识图谱从 corpus 构建完成: ${deduped.length} 条边`);
    } catch (err) {
      console.warn('[DataEngine] 图谱构建失败:', err);
      graph.value = { nodes: [], edges: [] };
    } finally {
      graphLoading.value = false;
    }
  },

  /** 保留 abortGraphLoad 以兼容调用方（现在是 no-op，因为建图是同步的） */
  abortGraphLoad() {
    graphLoading.value = false;
  },

  byId(id) {
    if (indexBuilt) return indexById.get(String(id));
    return data.value.find(a => String(a.id) === String(id));
  },

  byYear(year) {
    if (indexBuilt && indexByYear.has(year)) return indexByYear.get(year);
    return data.value.filter(a => a.year === year);
  },

  byGenre(genre) {
    if (indexBuilt && indexByGenre.has(genre)) return indexByGenre.get(genre);
    return data.value.filter(a => a.genres?.includes(genre));
  },

  search(q) {
    const term = String(q || '').toLowerCase().trim();
    if (!term) return [];

    const variants = new Set([term, normalizeCJK(term)]);
    if (term.includes('的')) variants.add(term.replace(/的/g, 'の'));
    if (term.includes('の')) variants.add(term.replace(/の/g, '的'));

    if (indexBuilt) {
      const results = new Set();
      for (const v of variants) {
        const hits = searchByIndex(v);
        hits.forEach(a => results.add(a));
      }
      const idOrder = new Map(data.value.map((a, i) => [a, i]));
      return [...results].sort((a, b) => (idOrder.get(a) ?? 0) - (idOrder.get(b) ?? 0));
    }

    return data.value.filter(a =>
      [...variants].some(t =>
        a.titleRomaji?.toLowerCase().includes(t) ||
        a.titleJa?.toLowerCase().includes(t) ||
        a.titleEnglish?.toLowerCase().includes(t) ||
        a.aliases?.some(alias => String(alias).toLowerCase().includes(t)) ||
        a.tags?.some(tag => String(tag).toLowerCase().includes(t)) ||
        a.studios?.some(s => String(s).toLowerCase().includes(t)) ||
        a.authors?.some(s => String(s).toLowerCase().includes(t)) ||
        a.directors?.some(s => String(s).toLowerCase().includes(t))
      )
    );
  },

  fuzzyFindByTitle(title) {
    const term = String(title).toLowerCase().trim();
    if (!term) return null;

    if (indexBuilt) {
      const exact = indexByTitleToken.get(term);
      if (exact && exact.size === 1) return [...exact][0];
    }

    return data.value.find(a =>
      a.titleRomaji?.toLowerCase().includes(term) ||
      a.titleJa?.toLowerCase().includes(term) ||
      a.titleEnglish?.toLowerCase().includes(term)
    );
  },

  topWorks(limit = 8) {
    return [...data.value]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }
};
