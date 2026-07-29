// src/engines/ai/intent-parser.js
// 本地语音意图解析器：把自然语言转成结构化意图

import { DataEngine } from '../data/DataEngine.js';

const GENRE_ALIASES = {
  '治愈': 'Slice of Life',
  '致郁': 'Drama',
  '催泪': 'Drama',
  '动作': 'Action',
  '冒险': 'Adventure',
  '奇幻': 'Fantasy',
  '科幻': 'Sci-Fi',
  '恐怖': 'Horror',
  '恋爱': 'Romance',
  '爱情': 'Romance',
  '校园': 'Slice of Life',
  '搞笑': 'Comedy',
  '悬疑': 'Mystery',
  '运动': 'Sports',
  '青春': 'Slice of Life',
  '神魔': 'Supernatural',
  '机战': 'Sci-Fi',
  '音乐': 'Music',
  '日常': 'Slice of Life'
};

function normalizeGenre(raw) {
  const key = String(raw || '').trim();
  return GENRE_ALIASES[key] || key;
}

function extractYear(text) {
  const match = text.match(/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function extractTitle(text) {
  // 去掉常见动词和助词，取剩余部分作为标题
  const cleaned = text
    .replace(/(打开|看|播放|定位|搜索|查找|我想看|给我|推荐|有没有|一部|这个|那个)/g, '')
    .trim();
  return cleaned || null;
}

export function parseIntent(text) {
  const t = String(text || '').trim();
  const lower = t.toLowerCase();

  // 1. 聚焦年份
  const year = extractYear(t);
  if (year && /(去|飞|到|看|找).*?(年|银河|年代)/.test(t)) {
    return { action: 'focus-year', year, raw: t };
  }

  // 2. 返回 / 清除 / 首页
  if (/^(返回|回去|退出|关闭|取消)$/.test(t)) return { action: 'back', raw: t };
  if (/^(首页|主页|开始|重来|重置|清除|全部)$/.test(t)) return { action: 'clear', raw: t };

  // 3. 推荐 / 筛选
  if (/(推荐|有什么|找|筛选|过滤|给我).*?(番|动画|作品|类型)/.test(t)) {
    // 尝试从文本中提取流派别名
    let genre = null;
    for (const [alias, en] of Object.entries(GENRE_ALIASES)) {
      if (t.includes(alias)) {
        genre = en;
        break;
      }
    }
    return { action: 'recommend', genre, raw: t };
  }

  // 4. 打开某部作品
  if (/(打开|看|播放|定位|搜索|查找|我想看|给我).*?/.test(t)) {
    const title = extractTitle(t);
    if (title && title.length >= 1) {
      const matched = DataEngine.fuzzyFindByTitle(title);
      if (matched) {
        return { action: 'focus-anime', id: matched.id, title: matched.titleRomaji, raw: t };
      }
      return { action: 'focus-anime', title, raw: t, id: null };
    }
  }

  // 5. 年份单独出现
  if (year) {
    return { action: 'focus-year', year, raw: t };
  }

  return { action: 'unknown', raw: t };
}
