// src/engines/interaction/GestureActionEngine.js
// 统一语义动作中枢：手势 / 语音 / 键盘 / UI 操作 都转换为此引擎的动作
// 职责单一：根据当前状态执行应用级语义动作，不关心输入来源

import { StateEngine } from '../core/StateEngine.js';
import { bus } from '../core/EventBus.js';
import { DataEngine } from '../data/DataEngine.js';

const ALL_YEARS = [];

function getYears() {
  if (ALL_YEARS.length) return ALL_YEARS;
  const data = DataEngine.data.value || [];
  const set = new Set(data.map(a => Math.floor((a.year || 2000) / 10) * 10).filter(y => y >= 1960 && y <= 2030));
  const arr = [...set].sort((a, b) => a - b);
  ALL_YEARS.push(...arr);
  return arr;
}

export const GestureActionEngine = {
  init() {
    return this;
  },

  // ===== 光标/悬停 =====
  move(x, y) {
    bus.emit('action:cursor', { x, y });
  },

  hover(id) {
    StateEngine.hover(id);
  },

  // ===== 选择 / 打开详情 =====
  select(id) {
    const target = id || StateEngine.state.hoveredId;
    if (target) {
      StateEngine.select(target);
      bus.emit('toast', '已打开详情');
      bus.emit('action:focus-anime', target);
    }
  },

  // ===== 返回（上下文感知）=====
  back() {
    if (StateEngine.state.selectedId) {
      StateEngine.select(null);
      bus.emit('toast', '返回列表');
      return;
    }
    if (StateEngine.state.searchQuery) {
      StateEngine.clearSearch();
      bus.emit('toast', '已清除搜索');
      return;
    }
    if (StateEngine.state.activeGenres.length > 0 || StateEngine.state.activeGenre) {
      StateEngine.clearFilter();
      bus.emit('toast', '已清除流派筛选');
      return;
    }
    if (StateEngine.state.year) {
      StateEngine.set('year', null);
      bus.emit('toast', '已清除年份筛选');
      return;
    }
    bus.emit('toast', '返回入口');
    setTimeout(() => bus.emit('phase:changed', 'landing'), 300);
  },

  // ===== 年份切换 =====
  nextYear() {
    this._stepYear(1);
  },

  prevYear() {
    this._stepYear(-1);
  },

  focusYear(year) {
    if (year == null) {
      StateEngine.set('year', null);
      return;
    }
    const decade = Math.floor(year / 10) * 10;
    StateEngine.focusYear(decade);
    bus.emit('toast', `${decade}年代`);
    bus.emit('action:focus-year', decade);
  },

  _stepYear(step) {
    const years = getYears();
    if (!years.length) return;
    let cur = StateEngine.state.year;
    let idx = cur ? years.indexOf(cur) : (step > 0 ? -1 : years.length - 1);
    idx = Math.max(0, Math.min(years.length - 1, idx + step));
    const next = years[idx];
    if (next !== cur) {
      StateEngine.focusYear(next);
      bus.emit('toast', `${next}年代`);
    }
  },

  // ===== 流派筛选 =====
  focusGenre(genre) {
    if (!genre) {
      StateEngine.clearFilter();
      return;
    }
    StateEngine.filterGenre(genre);
    bus.emit('toast', `已点亮 ${genre} 作品`);
  },

  // ===== 搜索 =====
  search(query) {
    if (!query || !String(query).trim()) {
      StateEngine.clearSearch();
      return;
    }
    const results = DataEngine.search(query);
    const ids = results.map(r => r.id);
    StateEngine.setSearch(query, ids);
    bus.emit('toast', results.length ? `找到 ${results.length} 个结果` : `未找到「${query}」`);
    bus.emit('action:search', { query, results: ids });

    if (results.length) {
      StateEngine.select(results[0].id);
      bus.emit('action:focus-anime', results[0].id);
    }
  },

  // ===== 聚焦某部作品（用于语音/搜索）=====
  focusAnime(id) {
    if (!id) return;
    StateEngine.select(id);
    bus.emit('action:focus-anime', id);
  },

  // ===== 缩放 =====
  zoom(delta) {
    bus.emit('action:zoom', delta);
  },

  // ===== 重置 =====
  reset() {
    StateEngine.clearFilter();
    StateEngine.clearSearch();
    StateEngine.select(null);
    StateEngine.set('year', null);
    bus.emit('toast', '已重置宇宙视图');
    bus.emit('action:reset-camera');
  },

  resetFilters() {
    StateEngine.clearFilter();
    StateEngine.clearSearch();
    StateEngine.set('year', null);
    StateEngine.select(null);
    bus.emit('toast', '已重置');
  },

  // ===== 切换全屏 =====
  toggleFullscreen() {
    bus.emit('input:fullscreen');
  },

  // ===== 切换语音 =====
  toggleVoice() {
    bus.emit('action:toggle-voice');
  },

  // ===== 切换解说 =====
  toggleNarrator() {
    bus.emit('action:toggle-narrator');
  },

  // ===== 帮助 =====
  showHelp() {
    bus.emit('action:show-help');
  }
};
