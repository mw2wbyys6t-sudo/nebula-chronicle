// src/engines/data/KnowledgeEngine.js
// 知识图谱引擎：关系查询、路径发现、推荐
// 带 LRU 缓存，避免重复 BFS 遍历

import { DataEngine } from './DataEngine.js';

// LRU 缓存（capacity=200，避免内存膨胀）
const CACHE_CAPACITY = 200;
const recommendCache = new Map();
const neighborsCache = new Map();

function cacheGet(cache, key) {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key);
  // LRU：移到末尾（最近使用）
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function cacheSet(cache, key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  // 超容量时删除最旧条目
  if (cache.size > CACHE_CAPACITY) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

export const KnowledgeEngine = {
  /** 清空所有缓存（数据重新加载后调用） */
  clearCache() {
    recommendCache.clear();
    neighborsCache.clear();
  },

  related(id, type = null) {
    const edges = DataEngine.graph.value?.edges || [];
    const matched = edges.filter(
      e => String(e.source) === String(id) || String(e.target) === String(id)
    );
    const filtered = type ? matched.filter(e => e.type === type) : matched;
    return filtered.map(e => ({
      ...e,
      neighbor: String(e.source) === String(id) ? e.target : e.source
    }));
  },

  neighbors(id, type = null, limit = 12) {
    const cacheKey = `${id}:${type || 'all'}:${limit}`;
    const cached = cacheGet(neighborsCache, cacheKey);
    if (cached) return cached;

    const list = this.related(id, type)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, limit)
      .map(e => ({
        anime: DataEngine.byId(e.neighbor),
        relation: e.type,
        weight: e.weight
      }))
      .filter(item => item.anime);

    cacheSet(neighborsCache, cacheKey, list);
    return list;
  },

  path(fromId, toId, maxHops = 4) {
    const visited = new Set();
    const queue = [[String(fromId)]];

    while (queue.length) {
      const path = queue.shift();
      const nodeId = path[path.length - 1];
      if (nodeId === String(toId)) return path;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const neighbors = this.related(nodeId).map(r => String(r.neighbor));
      for (const n of neighbors) {
        if (path.length < maxHops + 1) {
          queue.push([...path, n]);
        }
      }
    }
    return null;
  },

  recommend(seedId, limit = 6) {
    const cacheKey = `${seedId}:${limit}`;
    const cached = cacheGet(recommendCache, cacheKey);
    if (cached) return cached;

    const related = this.related(seedId);
    related.sort((a, b) => b.weight - a.weight);
    const result = related
      .slice(0, limit)
      .map(r => DataEngine.byId(r.neighbor))
      .filter(Boolean);

    cacheSet(recommendCache, cacheKey, result);
    return result;
  },

  recommendByGenre(genre, limit = 8) {
    return DataEngine.byGenre(genre)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  },

  recommendByYear(year, limit = 8) {
    return DataEngine.byYear(year)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }
};
