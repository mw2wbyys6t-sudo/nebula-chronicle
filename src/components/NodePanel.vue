<template>
  <div class="node-panel" :class="{ open: visible }">
    <button class="node-close" @click="close">×</button>

    <div v-if="anime" class="node-content">
      <div class="node-cover-wrap">
        <img :src="coverImage" :alt="anime.titleRomaji" loading="lazy" decoding="async" @error="onCoverError">
        <div class="node-score" v-if="anime.score || anime.averageScore">
          {{ anime.score || anime.averageScore }}
        </div>
      </div>

      <h2 class="node-title">{{ anime.titleRomaji }}</h2>
      <p v-if="anime.titleEnglish || anime.titleJa" class="node-subtitle">
        {{ anime.titleEnglish || anime.titleJa }}
      </p>

      <div class="node-meta">
        <span class="node-year">{{ anime.year }}</span>
        <span v-if="anime.format" class="node-format">{{ anime.format }}</span>
        <span v-if="anime.season && anime.season !== 'Unknown'" class="node-season">{{ anime.season }}</span>
        <span v-if="anime.episodes" class="node-episodes">{{ anime.episodes }} 集</span>
        <span v-for="g in displayedGenres" :key="g" class="node-genre">{{ g }}</span>
      </div>

      <div v-if="anime.popularity" class="node-row">
        <span class="node-label">人气</span>
        <span class="node-value">{{ anime.popularity.toLocaleString() }}</span>
      </div>

      <div v-if="anime.studios?.length" class="node-row">
        <span class="node-label">制作</span>
        <span class="node-value">{{ anime.studios.slice(0, 3).join(' / ') }}</span>
      </div>

      <div v-if="displayedDirectors.length" class="node-row">
        <span class="node-label">导演</span>
        <span class="node-value">{{ displayedDirectors.join(' / ') }}</span>
      </div>

      <div v-if="anime.authors?.length" class="node-row">
        <span class="node-label">作者 / 编剧</span>
        <span class="node-value">{{ anime.authors.slice(0, 3).join(' / ') }}</span>
      </div>

      <div v-if="displayedMusic.length" class="node-row">
        <span class="node-label">音乐</span>
        <span class="node-value">{{ displayedMusic.join(' / ') }}</span>
      </div>

      <div v-if="displayedCharacters.length" class="node-row">
        <span class="node-label">角色</span>
        <span class="node-value">{{ displayedCharacters.join(' / ') }}</span>
      </div>

      <div v-if="displayedAwards.length" class="node-row">
        <span class="node-label">奖项</span>
        <span class="node-value">{{ displayedAwards.join(' / ') }}</span>
      </div>

      <div v-if="displayedTags.length" class="node-tags">
        <span v-for="tag in displayedTags" :key="tag" class="node-tag">{{ tag }}</span>
      </div>

      <p class="node-desc">{{ anime.synopsis || anime.description || '暂无简介。' }}</p>

      <div v-if="recommendations.length" class="node-recommendations">
        <div class="node-section-title">相关推荐</div>
        <div class="relation-list">
          <div
            v-for="rec in recommendations"
            :key="rec.id"
            class="relation-card"
            @click="focusRelated(rec)"
          >
            <img class="relation-thumb" :src="rec.coverImage || rec.coverFallback" :alt="rec.titleRomaji" loading="lazy" decoding="async">
            <div class="relation-info">
              <div class="relation-title">{{ rec.titleRomaji }}</div>
              <div class="relation-type">{{ rec.year }} · {{ rec.genres?.[0] }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="relations.length" class="node-relations">
        <div class="node-section-title">知识图谱连接</div>
        <div class="relation-list">
          <div
            v-for="item in relations"
            :key="item.anime.id"
            class="relation-card"
            @click="focusRelated(item.anime)"
          >
            <div class="relation-color" :style="{ background: relationColor(item.relation) }"></div>
            <div class="relation-info">
              <div class="relation-title">{{ item.anime.titleRomaji }}</div>
              <div class="relation-type">{{ relationLabel(item.relation) }} · {{ item.anime.year }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="constellation.length" class="node-constellation">
        <div class="node-section-title">同星座作品</div>
        <div class="constellation-grid">
          <div
            v-for="item in constellation"
            :key="item.anime.id"
            class="constellation-card"
            @click="focusRelated(item.anime)"
          >
            <img class="constellation-thumb" :src="item.anime.coverImage || item.anime.coverFallback" :alt="item.anime.titleRomaji" loading="lazy" decoding="async">
            <div class="constellation-info">
              <div class="constellation-title">{{ item.anime.titleRomaji }}</div>
              <div class="constellation-reason">{{ item.reason }} · {{ item.anime.year }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="node-actions">
        <button class="locate-btn" @click="locate">在宇宙中定位</button>
        <button class="explain-btn" @click="explain">AI 解说</button>
        <button class="fav-btn" :class="{ active: isFav }" @click="toggleFav">
          {{ isFav ? '★ 已收藏' : '☆ 收藏' }}
        </button>
        <a class="watch-btn" :href="watchLink" target="_blank" rel="noopener">进入放映厅</a>
      </div>
    </div>

    <div v-else class="node-empty">
      <p>选择一颗恒星，探索它的故事。</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { KnowledgeEngine } from '../engines/data/KnowledgeEngine.js';
import { DataEngine } from '../engines/data/DataEngine.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { bus } from '../engines/core/EventBus.js';

const props = defineProps({
  anime: { type: Object, default: null },
  relations: { type: Array, default: () => [] },
  visible: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'locate', 'focus-related']);

const displayedGenres = computed(() => props.anime?.genres?.slice(0, 3) || []);
const displayedTags = computed(() => props.anime?.tags?.slice(0, 6) || []);
const displayedDirectors = computed(() => props.anime?.directors?.slice(0, 3) || []);
const displayedMusic = computed(() => props.anime?.music?.slice(0, 3) || []);
const displayedCharacters = computed(() => props.anime?.characters?.slice(0, 5) || []);
const displayedAwards = computed(() => props.anime?.awards?.slice(0, 3) || []);

const recommendations = computed(() => {
  if (!props.anime) return [];
  return KnowledgeEngine.recommend(props.anime.id, 6);
});

// 星座卡片墙：同年代 + 同流派作品
const constellation = computed(() => {
  if (!props.anime) return [];
  const sameYear = DataEngine.data.value.filter(
    a => a.id !== props.anime.id && Math.abs((a.year || 0) - (props.anime.year || 0)) <= 2
  );
  const sameGenre = DataEngine.data.value.filter(
    a => a.id !== props.anime.id && (props.anime.genres || []).some(g => a.genres?.includes(g))
  );
  const map = new Map();
  sameYear.forEach(a => map.set(a.id, { anime: a, reason: '同年代', score: (a.popularity || 0) + 100 }));
  sameGenre.forEach(a => {
    const existing = map.get(a.id);
    if (existing) {
      existing.reason = '同年代 · 同流派';
      existing.score += 200;
    } else {
      map.set(a.id, { anime: a, reason: '同流派', score: a.popularity || 0 });
    }
  });
  return [...map.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
});

const baseUrl = import.meta.env.BASE_URL;
const coverImage = computed(() => {
  return props.anime?.coverImage || (baseUrl + 'images/generated/nebula-bg.jpg');
});

const watchLink = computed(() => {
  if (!props.anime) return '#';
  // 拼接 BASE_URL 以便子路径部署（GitHub Pages 下为 /wonderful-screen/）
  return `${baseUrl}watch.html?title=${encodeURIComponent(props.anime.titleRomaji)}`;
});

const RELATION_COLORS = {
  sequel: '#ff2a6d',
  prequel: '#ff2a6d',
  'same-studio': '#00f3ff',
  'same-author': '#b892ff',
  'same-genre': '#66ffaa',
  'same-music': '#ffcc00',
  'same-era': '#aaaaaa'
};

const RELATION_LABELS = {
  sequel: '续作',
  prequel: '前传',
  'same-studio': '同制作',
  'same-author': '同作者',
  'same-genre': '同流派',
  'same-music': '同音乐',
  'same-era': '同年代'
};

function relationColor(type) {
  return RELATION_COLORS[type] || '#ffffff';
}

function relationLabel(type) {
  return RELATION_LABELS[type] || type;
}

function close() {
  emit('close');
}

function locate() {
  if (props.anime) emit('locate', props.anime);
}

function explain() {
  if (props.anime) bus.emit('ai:explain', props.anime.id);
}

const isFav = computed(() => {
  if (!props.anime) return false;
  return StateEngine.isFavorite(props.anime.id);
});

function toggleFav() {
  if (!props.anime) return;
  StateEngine.toggleFavorite(props.anime.id);
  bus.emit('toast', isFav.value ? '已收藏' : '已取消收藏');
}

function focusRelated(anime) {
  emit('focus-related', anime);
}

// 外链封面（anilist.co）加载失败时回退到本地图片，避免裂图
function onCoverError(e) {
  if (!props.anime) return;
  const fallback = props.anime.coverFallback || (baseUrl + 'images/generated/nebula-bg.jpg');
  if (e.target.src !== fallback) {
    e.target.src = fallback;
  }
}
</script>

<style scoped>
.node-panel {
  position: fixed;
  right: -480px;
  top: 0;
  width: 440px;
  height: 100%;
  z-index: 120;
  background: rgba(20, 10, 40, 0.95);
  border-left: 3px solid;
  border-image: linear-gradient(180deg, #ff9ec4, #c9b1ff, #ff9ec4) 1;
  border-radius: 16px 0 0 16px;
  padding: 28px;
  padding-top: 70px;
  transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow-y: auto;
  backdrop-filter: blur(20px);
  box-shadow: -10px 0 40px rgba(255, 158, 196, 0.3), -5px 0 20px rgba(201, 177, 255, 0.2);
}

.node-panel::before {
  content: '✦';
  position: absolute;
  top: 60px;
  left: 30px;
  font-size: 16px;
  color: rgba(255, 215, 0, 0.6);
  animation: sparkle 2s ease-in-out infinite;
}

.node-panel::after {
  content: '♡';
  position: absolute;
  top: 120px;
  right: 40px;
  font-size: 14px;
  color: rgba(255, 158, 196, 0.5);
  animation: float 3s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
  50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.node-panel::-webkit-scrollbar {
  width: 8px;
}

.node-panel::-webkit-scrollbar-track {
  background: rgba(201, 177, 255, 0.1);
  border-radius: 4px;
}

.node-panel::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #ff9ec4, #c9b1ff);
  border-radius: 4px;
}

.node-panel::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #ffb8d4, #d8c8ff);
}

.node-panel.open {
  right: 0;
}

.node-panel.open .node-content > * {
  animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.node-panel.open .node-content > *:nth-child(1) { animation-delay: 0.05s; }
.node-panel.open .node-content > *:nth-child(2) { animation-delay: 0.1s; }
.node-panel.open .node-content > *:nth-child(3) { animation-delay: 0.15s; }
.node-panel.open .node-content > *:nth-child(4) { animation-delay: 0.2s; }
.node-panel.open .node-content > *:nth-child(5) { animation-delay: 0.25s; }
.node-panel.open .node-content > *:nth-child(6) { animation-delay: 0.3s; }
.node-panel.open .node-content > *:nth-child(7) { animation-delay: 0.35s; }
.node-panel.open .node-content > *:nth-child(8) { animation-delay: 0.4s; }

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

.node-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 36px;
  height: 36px;
  border: none;
  background: linear-gradient(135deg, #ff9ec4, #c9b1ff);
  color: white;
  font-size: 22px;
  cursor: pointer;
  z-index: 2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 15px rgba(255, 158, 196, 0.5);
  transition: all 0.3s ease;
  line-height: 1;
}

.node-close:hover {
  transform: scale(1.1) rotate(90deg);
  box-shadow: 0 0 25px rgba(255, 158, 196, 0.8);
}

.node-cover-wrap {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 8px 25px rgba(255, 158, 196, 0.3);
}

.node-cover-wrap::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(20, 10, 40, 0.6) 100%);
  z-index: 1;
  pointer-events: none;
}

.node-cover-wrap img {
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  display: block;
}

.node-score {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.25), rgba(255, 158, 196, 0.25));
  border: 2px solid #ffd700;
  color: #ffd700;
  font-family: 'Courier New', 'Noto Sans SC', monospace;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
  z-index: 2;
}

.node-title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 6px;
  line-height: 1.3;
  color: #fff0f5;
  text-shadow: 0 0 10px rgba(255, 158, 196, 0.5);
}

.node-subtitle {
  font-size: 13px;
  color: #e6d5ff;
  margin-bottom: 14px;
}

.node-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
}

.node-year {
  font-family: 'Courier New', 'Noto Sans SC', monospace;
  font-size: 13px;
  color: #ff9ec4;
  font-weight: 600;
}

.node-genre {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(201, 177, 255, 0.3);
  background: rgba(201, 177, 255, 0.1);
  font-size: 11px;
  color: #e6d5ff;
}

.node-format,
.node-season,
.node-episodes {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 158, 196, 0.4);
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.15), rgba(201, 177, 255, 0.15));
  font-size: 11px;
  color: #ff9ec4;
}

.node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 14px 0;
}

.node-tag {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 158, 196, 0.35);
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.12), rgba(201, 177, 255, 0.12));
  font-size: 11px;
  color: rgba(255, 228, 238, 0.95);
}

.node-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 158, 196, 0.1);
  font-size: 13px;
}

.node-label {
  color: #c9b1ff;
  flex-shrink: 0;
}

.node-value {
  color: #fff0f5;
  text-align: right;
}

.node-desc {
  margin: 18px 0;
  font-size: 14px;
  line-height: 1.8;
  color: rgba(255, 240, 245, 0.85);
}

.node-section-title {
  font-size: 13px;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  letter-spacing: 1px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
}

.node-section-title::before {
  content: '✧';
  -webkit-text-fill-color: #ffd700;
}

.node-relations,
.node-recommendations,
.node-constellation {
  margin-bottom: 24px;
}

.constellation-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.constellation-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.08), rgba(201, 177, 255, 0.08));
  border: 1px solid rgba(255, 158, 196, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
}

.constellation-card:hover {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.15), rgba(201, 177, 255, 0.15));
  border-color: #ff9ec4;
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 158, 196, 0.2);
}

.constellation-thumb {
  width: 46px;
  height: 60px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 158, 196, 0.25);
}

.constellation-info {
  min-width: 0;
}

.constellation-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: #fff0f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.constellation-reason {
  font-size: 10px;
  color: #c9b1ff;
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.relation-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.08), rgba(201, 177, 255, 0.08));
  border: 1px solid rgba(255, 158, 196, 0.15);
  cursor: pointer;
  transition: all 0.3s ease;
}

.relation-card:hover {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.15), rgba(201, 177, 255, 0.15));
  border-color: #ff9ec4;
  transform: translateX(-4px);
  box-shadow: -4px 4px 15px rgba(255, 158, 196, 0.3);
}

.relation-color {
  width: 8px;
  height: 40px;
  border-radius: 4px;
  flex-shrink: 0;
}

.relation-thumb {
  width: 40px;
  height: 52px;
  border-radius: 10px;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255, 158, 196, 0.3);
  box-shadow: 0 2px 8px rgba(255, 158, 196, 0.2);
}

.relation-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 3px;
  color: #fff0f5;
}

.relation-type {
  font-size: 11px;
  color: #c9b1ff;
}

.node-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}

.watch-btn,
.locate-btn,
.fav-btn,
.explain-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  border-radius: 50px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  flex: 1;
  font-size: 14px;
}

.explain-btn {
  background: transparent;
  border: 2px solid rgba(201, 177, 255, 0.5);
  color: #c9b1ff;
}

.explain-btn:hover {
  background: rgba(201, 177, 255, 0.12);
  border-color: #c9b1ff;
  box-shadow: 0 0 16px rgba(201, 177, 255, 0.3);
}

.fav-btn {
  background: transparent;
  border: 2px solid rgba(255, 215, 0, 0.4);
  color: rgba(255, 215, 0, 0.8);
}

.fav-btn:hover {
  background: rgba(255, 215, 0, 0.1);
  border-color: #ffd700;
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
}

.fav-btn.active {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 158, 196, 0.15));
  border-color: #ffd700;
  color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

.watch-btn {
  background: linear-gradient(135deg, #ff9ec4, #c9b1ff, #ff9ec4);
  background-size: 200% 200%;
  color: #140a28;
  box-shadow: 0 4px 20px rgba(255, 158, 196, 0.4);
}

.watch-btn:hover {
  background-position: 100% 100%;
  box-shadow: 0 6px 30px rgba(255, 158, 196, 0.6), 0 0 20px rgba(201, 177, 255, 0.4);
  transform: translateY(-2px);
}

.locate-btn {
  background: transparent;
  border: 2px solid;
  border-image: linear-gradient(135deg, #ff9ec4, #c9b1ff) 1;
  color: #ff9ec4;
  position: relative;
  overflow: hidden;
}

.locate-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 158, 196, 0.2), transparent);
  transition: left 0.5s ease;
}

.locate-btn:hover::before {
  left: 100%;
}

.locate-btn:hover {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.15), rgba(201, 177, 255, 0.15));
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.3);
  color: #fff0f5;
}

.node-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c9b1ff;
  font-size: 14px;
  gap: 12px;
}

.node-empty::before {
  content: '☆';
  font-size: 48px;
  color: rgba(255, 215, 0, 0.5);
  animation: sparkle 2s ease-in-out infinite;
}

@media (max-width: 768px) {
  .node-panel {
    width: 100%;
    right: -100%;
    padding: 20px;
    padding-top: 70px;
    border-radius: 16px 16px 0 0;
    border-left: none;
    border-top: 3px solid;
    border-image: linear-gradient(90deg, #ff9ec4, #c9b1ff, #ff9ec4) 1;
  }

  .constellation-grid {
    grid-template-columns: 1fr;
  }
}
</style>
