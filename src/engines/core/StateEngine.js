// src/engines/core/StateEngine.js
// AnimeVerse 统一状态中枢：所有 Engine 读取/写入的唯一事实来源

import { reactive, readonly } from 'vue';
import { bus } from './EventBus.js';

// 收藏列表持久化 key
const FAVORITES_KEY = 'animeverse-favorites';

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveFavorites(list) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn('[StateEngine] 收藏保存失败:', e);
  }
}

const state = reactive({
  phase: 'loading',          // loading | landing | universe
  viewMode: '3d',            // 2d | 3d
  year: null,                // 当前聚焦年份
  selectedId: null,          // 选中作品 id
  hoveredId: null,           // 悬停作品 id
  activeGenre: null,         // 当前主流派筛选（单选，向后兼容）
  activeGenres: [],          // 多类型过滤（多选数组）
  searchQuery: null,         // 搜索关键词
  searchResults: [],         // 搜索结果 id 列表
  favorites: loadFavorites(), // 收藏作品 id 列表
  camera: {
    theta: 0,
    phi: Math.PI / 2.5,
    radius: 260
  },
  cameraTarget: null,        // 相机目标位置 { theta, phi, radius, x, y, z }
  voiceIntent: null,         // 最近一次语音意图
  gesture: null,             // 最近一次手势
  aiMessage: null,           // AI 导航提示文本
  loading: false,            // 全局加载状态
  inputMode: 'mouse',        // mouse | hand | voice
  narratorMuted: false       // AI 语音导游是否静音
});

export const StateEngine = {
  state: readonly(state),

  set(key, value) {
    if (!(key in state)) {
      console.warn(`[StateEngine] 未知状态键: ${key}`);
      return;
    }
    const prev = state[key];
    state[key] = value;
    bus.emit(`state:${key}`, { value, prev });
    bus.emit('state:changed', { key, value, prev });
  },

  get(key) {
    return state[key];
  },

  patch(obj) {
    const changes = {};
    for (const key of Object.keys(obj)) {
      if (key in state) {
        changes[key] = { prev: state[key], value: obj[key] };
        state[key] = obj[key];
      }
    }
    bus.emit('state:patched', changes);
    bus.emit('state:changed', changes);
  },

  select(id) {
    this.set('selectedId', id);
    if (id) {
      bus.emit('anime:selected', id);
    }
  },

  hover(id) {
    if (state.hoveredId === id) return;
    this.set('hoveredId', id);
    bus.emit('anime:hovered', id);
  },

  focusYear(year) {
    this.set('year', year);
    this.set('activeGenre', null);
    bus.emit('timeline:focus-year', year);
  },

  filterGenre(genre) {
    this.set('activeGenre', genre);
    this.set('activeGenres', genre ? [genre] : []);
    this.set('year', null);
    bus.emit('timeline:filter-genre', genre);
  },

  /** 多类型过滤：切换某流派的选中状态 */
  toggleGenre(genre) {
    if (!genre) {
      this.clearFilter();
      return;
    }
    const current = [...state.activeGenres];
    const idx = current.indexOf(genre);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(genre);
    }
    state.activeGenres = current;
    // activeGenre 取第一个作为"主"类型（向后兼容）
    state.activeGenre = current[0] || null;
    bus.emit('state:activeGenres', { value: current, prev: [] });
    bus.emit('state:activeGenre', { value: state.activeGenre, prev: null });
    bus.emit('timeline:filter-genre', state.activeGenre);
    if (current.length === 0) {
      this.set('year', null);
      bus.emit('timeline:clear-filter');
    }
  },

  clearFilter() {
    state.activeGenre = null;
    state.activeGenres = [];
    state.year = null;
    bus.emit('state:activeGenre', { value: null, prev: null });
    bus.emit('state:activeGenres', { value: [], prev: [] });
    bus.emit('timeline:clear-filter');
  },

  /** 收藏管理 */
  toggleFavorite(id) {
    if (!id) return;
    const sid = String(id);
    const idx = state.favorites.findIndex(f => String(f) === sid);
    if (idx >= 0) {
      state.favorites.splice(idx, 1);
      bus.emit('favorite:removed', sid);
    } else {
      state.favorites.push(sid);
      bus.emit('favorite:added', sid);
    }
    saveFavorites(state.favorites);
    bus.emit('favorites:changed', state.favorites);
  },

  isFavorite(id) {
    if (!id) return false;
    return state.favorites.some(f => String(f) === String(id));
  },

  clearFavorites() {
    state.favorites = [];
    saveFavorites(state.favorites);
    bus.emit('favorites:changed', state.favorites);
  },

  navigate(phase) {
    this.set('phase', phase);
    bus.emit('phase:changed', phase);
  },

  toggleViewMode() {
    const next = state.viewMode === '3d' ? '2d' : '3d';
    this.set('viewMode', next);
    bus.emit('view:changed', next);
  },

  setViewMode(mode) {
    if (mode !== '2d' && mode !== '3d') return;
    this.set('viewMode', mode);
    bus.emit('view:changed', mode);
  },

  setSearch(query, results = []) {
    state.searchQuery = query;
    state.searchResults = results;
    bus.emit('search:changed', { query, results });
  },

  clearSearch() {
    state.searchQuery = null;
    state.searchResults = [];
    bus.emit('search:cleared');
  },

  setCameraTarget(target, animate = true) {
    state.cameraTarget = target;
    bus.emit('camera:target', { target, animate });
  },

  resetCamera() {
    state.cameraTarget = null;
    bus.emit('camera:reset');
  }
};
