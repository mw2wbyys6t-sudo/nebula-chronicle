<template>
  <div class="hud" :class="{ 'panel-open': !!anime }">
    <div class="hud-top">
      <div class="hud-brand">
        <span class="logo-mark">AV</span>
        <span class="brand-text">动漫宇宙 <em>AnimeVerse</em></span>
      </div>
      <div class="hud-controls">
        <div class="search-box" v-if="!anime">
          <input
            type="text"
            class="search-input"
            placeholder="搜索作品、公司、标签..."
            v-model="searchText"
            @input="onSearchInput"
            @keyup.enter="doSearch"
            @blur="onSearchBlur"
          />
          <button class="search-btn" @click="doSearch" v-if="searchText">
            <span v-if="searchQuery">×</span>
            <span v-else>🔍</span>
          </button>
          <div class="search-suggestions" v-if="showSuggestions && suggestions.length">
            <div
              v-for="s in suggestions.slice(0, 6)"
              :key="s.id"
              class="suggestion-item"
              @mousedown.prevent="selectSuggestion(s)"
            >
              <span class="suggestion-title">{{ s.titleRomaji }}</span>
              <span class="suggestion-meta">{{ s.year }} · {{ (s.genres || []).slice(0, 1).join('') }}</span>
            </div>
          </div>
        </div>
        <button class="ctrl-btn" :class="{ active: voiceActive }" @click="$emit('toggle-voice')" :title="voiceActive ? '关闭语音' : '开启语音'">
          <span class="ctrl-ico">🎤</span>
        </button>
        <button class="ctrl-btn" :class="{ active: !narratorEnabled }" @click="$emit('toggle-narrator')" :title="narratorEnabled ? '静音解说' : '开启解说'">
          <span class="ctrl-ico">{{ narratorEnabled ? '🔊' : '🔇' }}</span>
        </button>
        <button class="ctrl-btn" @click="$emit('toggle-fullscreen')" title="全屏">
          <span class="ctrl-ico">⛶</span>
        </button>
        <button class="ctrl-btn" :class="{ active: showFavorites }" @click="showFavorites = !showFavorites" title="收藏">
          <span class="ctrl-ico">{{ favoritesCount > 0 ? '★' : '☆' }}</span>
          <span v-if="favoritesCount > 0" class="fav-count">{{ favoritesCount }}</span>
        </button>
        <button class="ctrl-btn help-btn" @click="showHelp = true" title="帮助">?</button>
      </div>
    </div>

    <div class="hud-genres" v-if="!anime">
      <button 
        class="genre-chip" 
        :class="{ active: activeGenres.length === 0 && !searchQuery }"
        @click="clearFilters"
      >全部</button>
      <button 
        v-for="g in visibleGenres" 
        :key="g"
        class="genre-chip"
        :class="{ active: activeGenres.includes(g) }"
        :style="{ '--chip-color': genreColors[g] || '#c9b1ff' }"
        @click="toggleGenre(g)"
      >{{ g }}</button>
      <button class="genre-chip year-chip" v-if="activeYear" @click="focusYear(null)">
        {{ activeYear }}年代 <span class="chip-clear">×</span>
      </button>
      <button class="genre-chip search-chip" v-if="searchQuery" @click="clearSearch">
        搜索: {{ searchQuery }} <span class="chip-clear">×</span>
      </button>
    </div>

    <!-- 收藏面板 -->
    <transition name="slide-right">
      <div v-if="showFavorites" class="favorites-panel" @click.self="showFavorites = false">
        <div class="fav-card">
          <div class="fav-header">
            <h3>★ 我的收藏</h3>
            <button class="fav-close" @click="showFavorites = false">×</button>
          </div>
          <div v-if="favoriteAnimes.length === 0" class="fav-empty">
            还没有收藏的作品<br>
            <span>在作品详情中点击 ★ 收藏</span>
          </div>
          <div v-else class="fav-list">
            <div
              v-for="a in favoriteAnimes"
              :key="a.id"
              class="fav-item"
              @click="focusAnime(a)"
            >
              <img class="fav-thumb" :src="a.coverImage || a.coverFallback" :alt="a.titleRomaji" loading="lazy" decoding="async">
              <div class="fav-info">
                <div class="fav-title">{{ a.titleRomaji }}</div>
                <div class="fav-meta">{{ a.year }} · {{ (a.genres || []).slice(0, 2).join(' / ') }}</div>
              </div>
              <button class="fav-remove" @click.stop="removeFavorite(a.id)" title="取消收藏">×</button>
            </div>
          </div>
          <button v-if="favoriteAnimes.length > 0" class="fav-clear" @click="clearAllFavorites">清空收藏</button>
        </div>
      </div>
    </transition>

    <div class="hud-bottom" v-if="viewMode === '3d'">
      <div class="hud-gesture-hint" v-if="inputMode === 'hand' && !anime">
        <span class="hint-icon">✋</span>
        <span class="hint-text">{{ currentHint }}</span>
        <span class="dwell-bar" v-if="dwellProgress > 0">
          <span class="dwell-fill" :style="{ width: dwellProgress * 100 + '%' }"></span>
        </span>
      </div>
      <div class="hud-gesture-hint" v-else-if="inputMode === 'voice'">
        <span class="hint-icon">🎙️</span>
        <span class="hint-text">{{ lastCommand || '说出指令，如「下一年」「龙珠」「返回」' }}</span>
      </div>

      <div class="hud-status" v-if="!anime">
        <span class="stat-badge"><em>{{ count }}</em> 颗恒星</span>
      </div>
    </div>

    <div class="gesture-indicator" v-if="inputMode === 'hand' && currentGesture && viewMode === '3d'">
      <span class="indicator-icon">{{ gestureIcons[currentGesture] || '✋' }}</span>
      <span class="indicator-text">{{ gestureNames[currentGesture] || currentGesture }}</span>
    </div>

    <transition name="toast">
      <div class="action-toast" v-if="toastMessage">
        {{ toastMessage }}
      </div>
    </transition>

    <!-- 帮助面板 -->
    <transition name="help">
      <div v-if="showHelp" class="help-overlay" @click="showHelp = false">
        <div class="help-card" @click.stop>
          <button class="help-close" @click="showHelp = false">×</button>
          <h3>宇宙导航指南</h3>

          <div class="help-section">
            <div class="help-title">🖐 手势控制</div>
            <div class="help-grid">
              <div class="help-item"><span class="help-icon">☝️</span><span>食指移动光标</span></div>
              <div class="help-item"><span class="help-icon">🤏</span><span>捏合选择作品</span></div>
              <div class="help-item"><span class="help-icon">✊</span><span>握拳返回</span></div>
              <div class="help-item"><span class="help-icon">👋</span><span>左右挥手切换年代</span></div>
              <div class="help-item"><span class="help-icon">🖐️</span><span>张开手掌打开详情</span></div>
              <div class="help-item"><span class="help-icon">⏱️</span><span>悬停 0.9 秒自动选中</span></div>
            </div>
          </div>

          <div class="help-section">
            <div class="help-title">🎙️ 语音指令</div>
            <div class="help-voice">
              <span>“带我去 2008 年”</span>
              <span>“打开 你的名字”</span>
              <span>“推荐治愈番”</span>
              <span>“返回” / “清除”</span>
            </div>
          </div>

          <div class="help-section">
            <div class="help-title">⌨️ 键盘快捷键</div>
            <div class="help-keys">
              <span><kbd>←</kbd> <kbd>→</kbd> 切换年代</span>
              <span><kbd>↑</kbd> <kbd>↓</kbd> 缩放</span>
              <span><kbd>Esc</kbd> 返回</span>
              <span><kbd>F</kbd> 全屏</span>
            </div>
          </div>

          <div class="help-tip">底部星轨可直接点击年代，详情面板内可浏览同星座作品。</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { bus } from '../engines/core/EventBus.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { DataEngine } from '../engines/data/DataEngine.js';

const props = defineProps({
  count: { type: Number, default: 0 },
  voiceActive: { type: Boolean, default: false },
  voiceSupported: { type: Boolean, default: true },
  narratorEnabled: { type: Boolean, default: true },
  narratorSupported: { type: Boolean, default: true },
  activeYear: { type: Number, default: null }
});

const emit = defineEmits([
  'filter-genre', 'search', 'reset-camera', 'focus-nebula',
  'focus-year', 'toggle-fullscreen', 'toggle-voice', 'toggle-narrator'
]);

const showHelp = ref(false);
const showFavorites = ref(false);
const currentGesture = ref(null);
const dwellProgress = ref(0);
const toastMessage = ref('');
const searchText = ref('');
const showSuggestions = ref(false);
const suggestions = ref([]);
const lastCommand = ref('');
let toastTimer = null;
let idleTimer = null;
let searchTimer = null;

const inputMode = computed(() => StateEngine.state.inputMode);
const activeGenre = computed(() => StateEngine.state.activeGenre);
const activeGenres = computed(() => StateEngine.state.activeGenres);
const searchQuery = computed(() => StateEngine.state.searchQuery);
const viewMode = computed(() => StateEngine.state.viewMode);
const anime = computed(() => StateEngine.state.selectedId ? DataEngine.byId(StateEngine.state.selectedId) : null);
const favoritesCount = computed(() => StateEngine.state.favorites.length);
const favoriteAnimes = computed(() =>
  StateEngine.state.favorites
    .map(id => DataEngine.byId(id))
    .filter(Boolean)
);

const allGenres = computed(() => {
  const g = new Set();
  DataEngine.data.value?.forEach(a => a.genres?.forEach(x => g.add(x)));
  return [...g].slice(0, 10);
});

const visibleGenres = computed(() => allGenres.value.slice(0, 8));

const genreColors = {
  'Action': '#ef4444',
  'Adventure': '#f59e0b',
  'Comedy': '#eab308',
  'Drama': '#8b5cf6',
  'Fantasy': '#06b6d4',
  'Romance': '#ec4899',
  'Sci-Fi': '#3b82f6',
  'Slice of Life': '#10b981',
  'Sports': '#f97316',
  'Supernatural': '#a855f7',
  'Mystery': '#6366f1',
  'Thriller': '#dc2626'
};

const gestureIcons = {
  pinch: '🤏',
  fist: '✊',
  open: '🖐️',
  point: '☝️',
  wave: '👋',
  swipe: '👉',
  pinching: '🤏',
  swiping: '👋'
};

const gestureNames = {
  pinch: '捏合选择',
  pinching: '准备选择',
  fist: '握拳返回',
  open: '张开查看',
  point: '指向探索',
  wave: '挥手切换',
  swipe: '挥手切换',
  swiping: '挥手切换',
  pointing: '指向探索'
};

const currentHint = computed(() => {
  if (anime.value) return '握拳返回列表';
  if (searchQuery.value) return `搜索「${searchQuery.value}」· 捏合选择 · 握拳返回`;
  if (activeGenres.value.length > 0) return `筛选「${activeGenres.value.join('·')}」· 捏合选择 · 握拳返回`;
  if (activeGenre.value) return `筛选「${activeGenre.value}」· 捏合选择 · 握拳返回`;
  if (activeYear.value) return `${activeYear.value}年代 · 左右挥手切换年份`;
  return '捏合选择恒星 · 挥手切换年份 · 握拳返回';
});

function showToast(msg) {
  toastMessage.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastMessage.value = '', 2000);
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer);
  if (!searchText.value.trim()) {
    suggestions.value = [];
    showSuggestions.value = false;
    if (searchQuery.value) clearSearch();
    return;
  }
  searchTimer = setTimeout(() => {
    const results = DataEngine.search(searchText.value);
    suggestions.value = results;
    showSuggestions.value = true;
  }, 200);
}

function doSearch() {
  const q = searchText.value.trim();
  if (!q) {
    clearSearch();
    return;
  }
  showSuggestions.value = false;
  bus.emit('action:search', q);
}

function selectSuggestion(item) {
  searchText.value = item.titleRomaji;
  showSuggestions.value = false;
  bus.emit('action:search', item.titleRomaji);
  StateEngine.select(item.id);
  bus.emit('action:focus-anime', item.id);
}

function onSearchBlur() {
  setTimeout(() => { showSuggestions.value = false; }, 200);
}

function clearSearch() {
  searchText.value = '';
  suggestions.value = [];
  StateEngine.clearSearch();
  showToast('已清除搜索');
}

function clearFilters() {
  StateEngine.clearFilter();
  if (searchQuery.value) clearSearch();
}

function filterGenre(g) {
  StateEngine.filterGenre(g);
  showToast(`已筛选：${g}`);
}

function toggleGenre(g) {
  StateEngine.toggleGenre(g);
  const active = StateEngine.state.activeGenres;
  if (active.length === 0) {
    showToast('已清除流派筛选');
  } else {
    showToast(`筛选：${active.join(' · ')}`);
  }
}

function focusAnime(a) {
  showFavorites.value = false;
  StateEngine.select(a.id);
  bus.emit('action:focus-anime', a.id);
}

function removeFavorite(id) {
  StateEngine.toggleFavorite(id);
  showToast('已取消收藏');
}

function clearAllFavorites() {
  StateEngine.clearFavorites();
  showToast('已清空收藏');
}

function focusYear(y) {
  StateEngine.focusYear(y);
}

function onGestureRecognized(g) {
  currentGesture.value = g;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    currentGesture.value = null;
  }, 800);
}

const handlers = {
  'gesture:recognized': onGestureRecognized,
  'gesture:idle': () => { currentGesture.value = null; },
  'gesture:dwell-progress': (p) => { dwellProgress.value = p; },
  'toast': (msg) => showToast(msg),
  'voice:text': (text) => { lastCommand.value = text; }
};

onMounted(() => {
  Object.entries(handlers).forEach(([e, fn]) => bus.on(e, fn));
  searchText.value = searchQuery.value || '';
});

onUnmounted(() => {
  Object.entries(handlers).forEach(([e, fn]) => bus.off(e, fn));
  if (toastTimer) clearTimeout(toastTimer);
  if (idleTimer) clearTimeout(idleTimer);
  if (searchTimer) clearTimeout(searchTimer);
});
</script>

<style scoped>
.hud {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  padding: 16px 24px 20px;
  transition: padding-right 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.hud.panel-open {
  padding-right: 480px;
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.hud-brand {
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff9ec4 0%, #c9b1ff 100%);
  color: #140a28;
  font-weight: 900;
  font-size: 15px;
  letter-spacing: -0.5px;
  box-shadow: 0 4px 16px rgba(255, 158, 196, 0.4);
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #fff 0%, #ffe4ee 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 1px;
}

.brand-text em {
  font-style: normal;
  font-size: 11px;
  font-weight: 400;
  display: block;
  background: linear-gradient(135deg, #ff9ec4 0%, #c9b1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-top: 2px;
}

.hud-controls {
  display: flex;
  gap: 8px;
  pointer-events: auto;
  align-items: center;
}

.search-box {
  position: relative;
  pointer-events: auto;
  margin-right: 4px;
}

.search-input {
  width: 240px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 158, 196, 0.2);
  padding: 0 40px 0 16px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: all 0.25s;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.search-input:focus {
  border-color: rgba(255, 158, 196, 0.5);
  background: rgba(255, 255, 255, 0.1);
  width: 280px;
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.15);
}

.search-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #ff9ec4;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.search-btn:hover {
  background: rgba(255, 158, 196, 0.15);
}

.search-suggestions {
  position: absolute;
  top: 48px;
  left: 0;
  right: 0;
  background: rgba(20, 10, 40, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 158, 196, 0.25);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 200;
}

.suggestion-item {
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  transition: background 0.15s;
}

.suggestion-item:hover {
  background: rgba(255, 158, 196, 0.15);
}

.suggestion-title {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
}

.suggestion-meta {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
  white-space: nowrap;
}

.ctrl-btn {
  pointer-events: auto;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 158, 196, 0.2);
  color: #ffb7d0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.25s;
}

.ctrl-btn:hover {
  background: rgba(255, 158, 196, 0.15);
  border-color: rgba(255, 158, 196, 0.4);
  transform: translateY(-2px);
  color: #fff;
}

.ctrl-btn.active {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.3) 0%, rgba(201, 177, 255, 0.3) 100%);
  border-color: rgba(255, 158, 196, 0.5);
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.3);
  color: #fff;
}

.ctrl-btn.help-btn {
  font-family: Georgia, serif;
  font-weight: 700;
  font-size: 17px;
}

.hud-genres {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  pointer-events: auto;
}

.genre-chip {
  padding: 7px 16px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 158, 196, 0.15);
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s;
  pointer-events: auto;
}

.genre-chip:hover {
  background: rgba(255, 158, 196, 0.12);
  color: #fff;
  transform: translateY(-1px);
}

.genre-chip.active {
  background: var(--chip-color, linear-gradient(135deg, #ff9ec4, #c9b1ff));
  color: #140a28;
  border-color: transparent;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--chip-color, #ff9ec4) 40%, transparent);
  font-weight: 600;
}

.year-chip {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 158, 196, 0.2));
  border-color: rgba(255, 215, 0, 0.4);
  color: #ffd700;
}

.search-chip {
  background: linear-gradient(135deg, rgba(100, 200, 255, 0.2), rgba(255, 158, 196, 0.2));
  border-color: rgba(100, 200, 255, 0.4);
  color: #7dd3fc;
}

.chip-clear {
  margin-left: 4px;
  opacity: 0.7;
}

.hud-bottom {
  position: absolute;
  bottom: 92px;
  left: 24px;
  right: auto;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 16px;
  max-width: min(420px, calc(100vw - 48px));
}

.hud-gesture-hint {
  pointer-events: none;
  background: rgba(20, 10, 40, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 158, 196, 0.25);
  padding: 10px 18px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  min-width: 240px;
  max-width: 380px;
  position: relative;
  overflow: hidden;
}

.hint-icon {
  font-size: 22px;
  animation: pulse 2s ease-in-out infinite;
}

.hint-text {
  flex: 1;
  line-height: 1.4;
}

.dwell-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0 0 14px 14px;
  overflow: hidden;
}

.dwell-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff);
  transition: width 0.1s linear;
}

.hud-status {
  display: flex;
  gap: 10px;
  align-items: center;
  pointer-events: none;
}

.stat-badge {
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
  padding: 9px 16px;
  border-radius: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 158, 196, 0.15);
}

.stat-badge em {
  font-style: normal;
  font-weight: 700;
  font-size: 17px;
  color: #ff9ec4;
  margin-right: 4px;
}

.gesture-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(20, 10, 40, 0.85);
  backdrop-filter: blur(16px);
  border: 2px solid rgba(255, 158, 196, 0.5);
  padding: 14px 24px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  gap: 10px;
  pointer-events: none;
  animation: gesturePop 0.3s ease-out;
  z-index: 150;
}

.indicator-icon {
  font-size: 32px;
}

.indicator-text {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.action-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.92), rgba(201, 177, 255, 0.92));
  backdrop-filter: blur(16px);
  padding: 14px 28px;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 600;
  color: #140a28;
  box-shadow: 0 8px 32px rgba(255, 158, 196, 0.5);
  pointer-events: none;
  z-index: 200;
}

.toast-enter-active {
  animation: toastIn 0.3s ease-out;
}

.toast-leave-active {
  animation: toastOut 0.3s ease-in forwards;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); }
}

@keyframes gesturePop {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes toastIn {
  0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(20px); }
  100% { opacity: 1; transform: translate(-50%, -50%) scale(1) translateY(0); }
}

@keyframes toastOut {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9) translateY(-10px); }
}

/* 帮助面板 */
.help-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 6, 24, 0.85);
  backdrop-filter: blur(10px);
  padding: 24px;
}

.help-card {
  position: relative;
  width: min(560px, 100%);
  max-height: 80vh;
  overflow-y: auto;
  padding: 32px;
  border-radius: 20px;
  background: rgba(20, 10, 40, 0.96);
  border: 1px solid rgba(255, 158, 196, 0.3);
  box-shadow: 0 0 60px rgba(255, 158, 196, 0.15), 0 8px 40px rgba(0, 0, 0, 0.5);
  color: #fff;
}

.help-card h3 {
  margin: 0 0 24px;
  font-size: 22px;
  font-weight: 700;
  color: #ff9ec4;
  letter-spacing: 2px;
  text-align: center;
}

.help-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 158, 196, 0.4);
  background: rgba(255, 158, 196, 0.1);
  color: #ff9ec4;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.25s;
}

.help-close:hover {
  background: rgba(255, 158, 196, 0.2);
  transform: rotate(90deg);
}

.help-section {
  margin-bottom: 22px;
}

.help-title {
  font-size: 14px;
  font-weight: 700;
  color: #c9b1ff;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.help-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.help-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.help-icon {
  font-size: 18px;
  width: 28px;
  text-align: center;
}

.help-voice,
.help-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.help-voice span,
.help-keys span {
  padding: 8px 14px;
  border-radius: 100px;
  background: rgba(255, 158, 196, 0.08);
  border: 1px solid rgba(255, 158, 196, 0.18);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

.help-keys kbd {
  display: inline-block;
  min-width: 24px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: monospace;
  font-size: 12px;
  margin-right: 4px;
}

.help-tip {
  margin-top: 8px;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(255, 215, 0, 0.08);
  border-left: 3px solid rgba(255, 215, 0, 0.5);
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  line-height: 1.5;
}

.help-enter-active,
.help-leave-active {
  transition: opacity 0.25s ease;
}

.help-enter-from,
.help-leave-to {
  opacity: 0;
}

.help-enter-active .help-card,
.help-leave-active .help-card {
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.help-enter-from .help-card,
.help-leave-to .help-card {
  transform: scale(0.95) translateY(10px);
}

@media (max-width: 768px) {
  .hud {
    padding: 12px 16px 16px;
  }
  
  .hud.panel-open {
    padding-right: 16px;
  }
  
  .brand-text {
    font-size: 16px;
  }
  
  .brand-text em {
    display: none;
  }
  
  .hud-controls {
    gap: 6px;
  }

  .search-box {
    display: none;
  }
  
  .ctrl-btn {
    width: 36px;
    height: 36px;
    font-size: 16px;
  }
  
  .hud-genres {
    margin-top: 10px;
    gap: 6px;
  }
  
  .genre-chip {
    padding: 5px 12px;
    font-size: 11px;
  }
  
  .hud-bottom {
    left: 16px;
    right: auto;
    bottom: 86px;
    max-width: calc(100vw - 32px);
  }
  
  .hud-gesture-hint {
    min-width: auto;
    max-width: none;
    padding: 9px 14px;
    font-size: 12px;
  }

  .help-grid {
    grid-template-columns: 1fr;
  }

  .help-card {
    padding: 24px;
  }

  .help-card h3 {
    font-size: 18px;
  }
}

/* 收藏面板 */
.favorites-panel {
  position: fixed;
  inset: 0;
  z-index: 250;
  background: rgba(10, 6, 24, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: flex-end;
  pointer-events: auto;
}

.fav-card {
  width: min(380px, 100%);
  height: 100%;
  background: rgba(20, 10, 40, 0.96);
  border-left: 1px solid rgba(255, 158, 196, 0.3);
  box-shadow: -8px 0 40px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.fav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.fav-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
  letter-spacing: 1px;
}

.fav-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid rgba(255, 158, 196, 0.3);
  background: transparent;
  color: #ff9ec4;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

.fav-close:hover {
  background: rgba(255, 158, 196, 0.15);
}

.fav-empty {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  padding: 60px 20px;
  line-height: 1.8;
}

.fav-empty span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.fav-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255, 158, 196, 0.06);
  border: 1px solid rgba(255, 158, 196, 0.12);
  cursor: pointer;
  transition: all 0.25s;
}

.fav-item:hover {
  background: rgba(255, 158, 196, 0.12);
  border-color: rgba(255, 158, 196, 0.3);
  transform: translateX(-4px);
}

.fav-thumb {
  width: 42px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 158, 196, 0.2);
}

.fav-info {
  flex: 1;
  min-width: 0;
}

.fav-title {
  font-size: 13px;
  font-weight: 600;
  color: #fff0f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.fav-meta {
  font-size: 11px;
  color: #c9b1ff;
}

.fav-remove {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 100, 100, 0.15);
  color: #ff6464;
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.fav-remove:hover {
  background: rgba(255, 100, 100, 0.3);
}

.fav-clear {
  margin-top: 16px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 100, 100, 0.3);
  background: rgba(255, 100, 100, 0.08);
  color: #ff6464;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.fav-clear:hover {
  background: rgba(255, 100, 100, 0.15);
}

.fav-count {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: #ff9ec4;
  color: #140a28;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.ctrl-btn {
  position: relative;
}

/* 收藏面板滑入动画 */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: opacity 0.3s ease;
}

.slide-right-enter-active .fav-card,
.slide-right-leave-active .fav-card {
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from,
.slide-right-leave-to {
  opacity: 0;
}

.slide-right-enter-from .fav-card,
.slide-right-leave-to .fav-card {
  transform: translateX(100%);
}

@media (max-width: 768px) {
  .fav-card {
    width: 100%;
    padding: 16px;
  }
}
</style>
