<template>
  <section class="phase-loading" :class="{ 'is-complete': isComplete }">
    <canvas ref="starfield" class="starfield"></canvas>

    <div v-if="shouldUseVideo && videoLoaded !== false && videoEnabled" class="energy-core-wrap">
      <video
        ref="loadingVideo"
        class="energy-core-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/nebula-trailer-frame.jpg'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="energy-core-mask"></div>
      <div class="energy-core-ring"></div>
    </div>

    <div class="magic-circle-bg">
      <div
        class="magic-circle-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/magic-circle.jpg)` }"
      ></div>
      <div class="magic-circle-overlay"></div>
    </div>

    <svg class="svg-magic-circle" viewBox="0 0 600 600">
      <defs>
        <filter id="pinkGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fff5f0" stop-opacity="0.9"/>
          <stop offset="30%" stop-color="#ff9ec4" stop-opacity="0.5"/>
          <stop offset="60%" stop-color="#c9b1ff" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#1a0a2e" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle class="draw-circle outer" cx="300" cy="300" r="270" />
      <circle class="draw-circle mid" cx="300" cy="300" r="220" />
      <circle class="draw-circle inner" cx="300" cy="300" r="170" />
      <polygon class="draw-poly star" points="300,80 360,230 520,230 390,320 430,480 300,400 170,480 210,320 80,230 240,230" />
      <g class="rune-ring">
        <text v-for="(rune, i) in 12" :key="i"
          :transform="`rotate(${i * 30} 300 300) translate(0, -250)`"
          text-anchor="middle"
          class="rune-char"
          :class="{ lit: progress >= i * 8 }"
          x="300" y="300"
        >{{ runeSymbols[i % runeSymbols.length] }}</text>
      </g>
    </svg>

    <div class="summoning-stars">
      <div
        v-for="i in 8"
        :key="i"
        class="summon-star"
        :class="{ lit: progress >= 25 + i * 9, 'fully-lit': progress >= 100 }"
        :style="starStyle(i - 1)"
      >
        <div class="star-glow"></div>
        <div class="star-shape">
          <svg viewBox="0 0 24 24" width="20" height="20"><polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" fill="currentColor"/></svg>
        </div>
      </div>
    </div>

    <svg class="constellation-lines" viewBox="0 0 600 600" :style="constellationOpacity">
      <polyline :points="starPointsPolyline(8, 260)" />
      <polyline :points="starPointsPolyline(8, 200)" />
    </svg>

    <div class="summoning-text">
      <Transition name="tip-fade" mode="out-in">
        <div :key="tip" class="summon-title">{{ tip }}</div>
      </Transition>
      <Transition name="tip-fade" mode="out-in">
        <div :key="progressText" class="summon-sub">{{ progressText }}</div>
      </Transition>
      <!-- 真实数据加载进度条 -->
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progress + '%' }">
          <span class="progress-shine"></span>
        </div>
        <span class="progress-pct">{{ progress }}%</span>
      </div>
    </div>

    <!-- 跳过按钮：数据加载完成后可点击跳过仪式动画 -->
    <button v-if="progress >= 100 && !isComplete" class="skip-btn" @click="skipAhead">
      <span>跳过 ✧</span>
    </button>

    <div class="burst-overlay"></div>
    <div class="bokeh-layer"></div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';

const emit = defineEmits(['done']);
const baseUrl = import.meta.env.BASE_URL;

const runeSymbols = ['✦','♡','✧','★','✿','♪','❋','❤','✩','❀','☆','✾'];

const progress = ref(0);
const tip = ref('正在召唤守护星座…');
const progressText = ref('');
const isComplete = ref(false);
const videoLoaded = ref(null);
const videoEnabled = ref(false); // 延迟启用视频，避免抢占数据加载带宽
const loadingVideo = ref(null);

const { shouldUseVideo } = useVideoBackground();

// 设备分级：移动端适当减少粒子数量，但保留大部分视觉效果
const isMobile = typeof navigator !== 'undefined' && (
  /Mobi|Android|iPhone/i.test(navigator.userAgent) ||
  (navigator.hardwareConcurrency || 4) <= 4
);
const particleScale = isMobile ? 0.75 : 1;

function onVideoLoaded() {
  videoLoaded.value = true;
}

function onVideoError(e) {
  console.warn('[LoadingPhase] 视频加载失败，降级:', e);
  videoLoaded.value = false;
}

// 延迟设置视频 src：等核心数据加载到 80% 后再请求视频，避免抢占带宽
function enableVideo() {
  if (!shouldUseVideo.value || videoEnabled.value) return;
  videoEnabled.value = true;
  requestAnimationFrame(() => {
    if (loadingVideo.value) {
      loadingVideo.value.src = baseUrl + 'images/generated/nebula-trailer-v3-b.mp4';
    }
  });
}

const tips = [
  { at: 0, title: '正在召唤守护星座…', sub: '✨ 魔法正在汇聚 ✨' },
  { at: 30, title: '点亮核心星辰…', sub: 'kira kira ✧' },
  { at: 60, title: '连接次元航路…', sub: '🌸 樱色能量满溢 🌸' },
  { at: 85, title: '完整星图展开中…', sub: '♪ 银河正在显现 ♪' },
  { at: 100, title: '次元之门已开启', sub: '✿ 欢迎来到星云编年史 ✿' }
];

const starfield = ref(null);
let starRafId = null;
let starResizeHandler = null;

const constellationOpacity = computed(() => ({
  opacity: progress.value >= 50 ? Math.min((progress.value - 50) / 40, 1) : 0
}));

function starStyle(i) {
  const angle = (i / 8) * 360 - 90;
  return {
    '--angle': `${angle}deg`,
    '--light-delay': `${i * 0.15}s`
  };
}

function starPointsPolyline(count, radius) {
  const points = [];
  for (let i = 0; i <= count; i++) {
    const angle = ((i % count) / count) * Math.PI * 2 - Math.PI / 2;
    const x = 300 + Math.cos(angle) * radius;
    const y = 300 + Math.sin(angle) * radius;
    points.push(`${x},${y}`);
  }
  return points.join(' ');
}

function updateTip() {
  let current = tips[0];
  for (const t of tips) {
    if (progress.value >= t.at) current = t;
  }
  tip.value = current.title;
  progressText.value = current.sub;
}

function initStarfield() {
  const canvas = starfield.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const sakuraColors = ['#ffb7d0', '#ff9ec4', '#ffc4e0', '#d4b8ff', '#c9b1ff', '#b8e0ff', '#ffd700', '#fff0f5'];

  // 根据 device 分级调整粒子数
  const petalCount = Math.round(60 * particleScale);
  const sparkleCount = Math.round(120 * particleScale);
  const bokehCount = Math.round(15 * particleScale);

  const petals = Array.from({ length: petalCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 6 + 4,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    speedY: Math.random() * 0.8 + 0.3,
    speedX: Math.random() * 0.6 - 0.3 + Math.sin(Math.random() * Math.PI * 2) * 0.5,
    phase: Math.random() * Math.PI * 2,
    color: sakuraColors[Math.floor(Math.random() * sakuraColors.length)],
    alpha: Math.random() * 0.5 + 0.3,
    type: 'petal'
  }));

  const sparkles = Array.from({ length: sparkleCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2.5 + 0.5,
    alpha: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.02 + 0.008,
    drift: (Math.random() - 0.5) * 0.1,
    color: sakuraColors[Math.floor(Math.random() * sakuraColors.length)],
    type: 'sparkle',
    spikes: Math.random() > 0.5 ? 4 : 5
  }));

  const bokehs = Array.from({ length: bokehCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 80 + 30,
    alpha: Math.random() * 0.15 + 0.05,
    color: sakuraColors[Math.floor(Math.random() * 4)],
    speedY: Math.random() * 0.15 + 0.05,
    phase: Math.random() * Math.PI * 2
  }));

  function drawPetal(x, y, s, rot, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.7, -s * 0.5, s * 0.7, s * 0.3, 0, s);
    ctx.bezierCurveTo(-s * 0.7, s * 0.3, -s * 0.7, -s * 0.5, 0, -s);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawStar(x, y, s, spikes, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? s : s * 0.35;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  // 预渲染 sparkle 到离屏 canvas，避免每帧 shadowBlur 开销
  const sparkleCache = new Map();
  function getSparkleSprite(color, size, spikes) {
    const key = `${color}_${size.toFixed(1)}_${spikes}`;
    if (sparkleCache.has(key)) return sparkleCache.get(key);
    const off = document.createElement('canvas');
    const ss = Math.max(size * 8, 16);
    off.width = ss; off.height = ss;
    const sctx = off.getContext('2d');
    sctx.translate(ss / 2, ss / 2);
    sctx.shadowColor = color;
    sctx.shadowBlur = size * 3;
    sctx.fillStyle = color;
    sctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? size * 1.5 : size * 0.5;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) sctx.moveTo(px, py);
      else sctx.lineTo(px, py);
    }
    sctx.closePath();
    sctx.fill();
    const sprite = { canvas: off, halfW: ss / 2, halfH: ss / 2 };
    sparkleCache.set(key, sprite);
    return sprite;
  }

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  starResizeHandler = resize;
  window.addEventListener('resize', resize);

  let time = 0;
  let lastTime = performance.now();
  function draw(now) {
    const dt = Math.min((now - lastTime) / 16, 2); // 帧率补偿
    lastTime = now;
    time += 0.016 * dt;
    ctx.clearRect(0, 0, width, height);

    for (const b of bokehs) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.5 + b.phase);
      const ga = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size * pulse);
      ga.addColorStop(0, b.color + Math.floor(b.alpha * 255 * pulse).toString(16).padStart(2, '0'));
      ga.addColorStop(0.5, b.color + Math.floor(b.alpha * 100 * pulse).toString(16).padStart(2, '0'));
      ga.addColorStop(1, 'transparent');
      ctx.fillStyle = ga;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * pulse, 0, Math.PI * 2);
      ctx.fill();
      b.y += b.speedY * dt;
      if (b.y < -b.size) { b.y = height + b.size; b.x = Math.random() * width; }
    }

    for (const p of petals) {
      const wobble = Math.sin(time * 2 + p.phase) * 1.5;
      ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(time + p.phase));
      drawPetal(p.x + wobble, p.y, p.size, p.rot + Math.sin(time + p.phase) * 0.3, p.color);
      p.y += p.speedY * dt;
      p.x += (p.speedX + Math.sin(time + p.phase) * 0.3) * dt;
      p.rot += p.rotSpeed * dt;
      if (p.y > height + 20) { p.y = -20; p.x = Math.random() * width; }
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
    }

    // 使用预渲染 sprite 替代每帧 shadowBlur，大幅降低 CPU 开销
    for (const s of sparkles) {
      s.alpha += s.speed * dt;
      s.x += s.drift * dt;
      s.y += s.drift * 0.3 * dt;
      if (s.x < -20) s.x = width + 20;
      if (s.x > width + 20) s.x = -20;
      const opacity = (Math.sin(s.alpha) + 1) / 2 * 0.8 + 0.1;
      ctx.globalAlpha = opacity;
      const sprite = getSparkleSprite(s.color, s.size, s.spikes);
      ctx.drawImage(sprite.canvas, s.x - sprite.halfW, s.y - sprite.halfH);
    }

    ctx.globalAlpha = 1;
    if (!isComplete.value) {
      starRafId = requestAnimationFrame(draw);
    }
  }
  starRafId = requestAnimationFrame(draw);
}

const AUTO_ADVANCE_DELAY = 2600;
const COMPLETE_HOLD_DELAY = 1600;

function skipAhead() {
  if (isComplete.value) return;
  isComplete.value = true;
  if (starRafId) { cancelAnimationFrame(starRafId); starRafId = null; }
  setTimeout(() => emit('done'), 600);
}

onMounted(async () => {
  initStarfield();
  updateTip();

  // 监听真实加载进度，平滑映射到 0-85 区间（后面 15% 留给仪式动效）
  const stopWatch = watch(() => DataEngine.loadProgress.value, (p) => {
    if (p > 0 && p < 1) {
      progress.value = Math.max(progress.value, Math.round(p * 85));
      // 核心数据加载到 80% 后启用视频
      if (p >= 0.8) enableVideo();
    }
  });

  try {
    const dataStart = Date.now();
    await DataEngine.load();
    const dataElapsed = Date.now() - dataStart;
    const fromCache = DataEngine.loadFromCache.value;
    const minLoadDelay = fromCache ? 400 : Math.max(0, 1200 - dataElapsed);

    // 数据就绪后启用视频（如果尚未启用）
    enableVideo();

    // 数据就绪，推进到仪式动效
    progress.value = 85;
    updateTip();
    await new Promise(r => setTimeout(r, 300 + minLoadDelay * 0.3));
    progress.value = 95;
    updateTip();
    await new Promise(r => setTimeout(r, 400 + minLoadDelay * 0.4));
    progress.value = 100;
    updateTip();

    setTimeout(() => {
      isComplete.value = true;
      // 完成后停止粒子动画，释放 CPU
      if (starRafId) { cancelAnimationFrame(starRafId); starRafId = null; }
      setTimeout(() => emit('done'), COMPLETE_HOLD_DELAY);
    }, fromCache ? 1200 : AUTO_ADVANCE_DELAY);
  } catch (err) {
    console.error('[LoadingPhase] 数据加载失败，继续进入展示阶段:', err);
    tip.value = '部分星辰信号微弱，仍可继续航行…';
    progressText.value = '⚠ 离线模式';
    progress.value = 100;
    setTimeout(() => {
      isComplete.value = true;
      if (starRafId) { cancelAnimationFrame(starRafId); starRafId = null; }
      setTimeout(() => emit('done'), COMPLETE_HOLD_DELAY);
    }, 1800);
  } finally {
    stopWatch();
  }
});

onUnmounted(() => {
  if (starRafId) cancelAnimationFrame(starRafId);
  if (starResizeHandler) window.removeEventListener('resize', starResizeHandler);
  if (loadingVideo.value) {
    loadingVideo.value.pause?.();
    loadingVideo.value.src = '';
  }
});
</script>

<style scoped>
.phase-loading {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #1a0a2e 0%, #2d1050 40%, #1f0a35 70%, #0d0520 100%);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.starfield {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.energy-core-wrap {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(260px, 40vw);
  height: min(260px, 40vw);
  transform: translate(-50%, -50%);
  z-index: 2;
  border-radius: 50%;
  overflow: hidden;
  animation: core-enter 1.5s ease-out 0.5s both;
}

.energy-core-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.5s ease;
  filter: hue-rotate(280deg) saturate(1.2) brightness(0.45);
  border-radius: 50%;
}

.energy-core-video.is-loaded {
  opacity: 0.7;
  animation: core-swirl 20s linear infinite;
}

.energy-core-mask {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, transparent 25%, rgba(26, 10, 46, 0.5) 65%, rgba(13, 5, 32, 0.95) 100%);
  pointer-events: none;
}

.energy-core-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 158, 196, 0.5);
  box-shadow: 0 0 40px rgba(255, 158, 196, 0.3), inset 0 0 30px rgba(201, 177, 255, 0.2);
  animation: ring-glow 3s ease-in-out infinite;
}

.magic-circle-bg {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(720px, 105vw);
  height: min(720px, 105vw);
  transform: translate(-50%, -50%);
  z-index: 1;
  opacity: 0;
  animation: fade-in 1.5s ease-out forwards;
}

.magic-circle-image {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.2;
  filter: hue-rotate(280deg) saturate(1.6) brightness(1.1);
  mix-blend-mode: screen;
  animation: magic-spin 80s linear infinite;
}

.magic-circle-overlay {
  position: absolute;
  inset: 15%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 158, 196, 0.12) 0%, rgba(201, 177, 255, 0.08) 40%, transparent 70%);
  filter: blur(30px);
  animation: glow-pulse 5s ease-in-out infinite;
}

.svg-magic-circle {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(560px, 82vw);
  height: min(560px, 82vw);
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  overflow: visible;
  animation: svg-spin-reverse 55s linear infinite;
}

.svg-magic-circle .draw-circle,
.svg-magic-circle .draw-poly {
  fill: none;
  stroke: rgba(255, 158, 196, 0.7);
  stroke-width: 1.2;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: url(#pinkGlow);
  stroke-dasharray: 1800;
  stroke-dashoffset: 1800;
  animation: draw-line 4s ease-out forwards;
}

.svg-magic-circle .draw-circle.mid {
  stroke: rgba(201, 177, 255, 0.6);
  stroke-width: 0.9;
  animation-delay: 0.5s;
}

.svg-magic-circle .draw-circle.inner {
  stroke: rgba(255, 215, 0, 0.45);
  stroke-width: 0.7;
  animation-delay: 1s;
}

.svg-magic-circle .draw-poly {
  stroke: rgba(255, 158, 196, 0.5);
  stroke-width: 0.8;
  animation-delay: 1.5s;
}

.svg-magic-circle .draw-poly.star {
  stroke: rgba(255, 215, 0, 0.6);
  stroke-width: 1;
  animation-delay: 2s;
}

.rune-ring {
  animation: rune-spin 90s linear infinite;
}

.rune-char {
  font-size: 16px;
  fill: rgba(255, 158, 196, 0.25);
  transition: fill 0.6s ease, filter 0.6s ease;
  text-anchor: middle;
  dominant-baseline: middle;
}

.rune-char.lit {
  fill: #ff9ec4;
  filter: drop-shadow(0 0 6px rgba(255, 158, 196, 0.8)) drop-shadow(0 0 12px rgba(201, 177, 255, 0.4));
}

.summoning-stars {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(560px, 82vw);
  height: min(560px, 82vw);
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}

.summon-star {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 28px;
  height: 28px;
  transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1));
  opacity: 0.2;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  color: #ff9ec4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summon-star.lit {
  opacity: 1;
  transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.3);
  color: #ffd700;
}

.summon-star.fully-lit {
  animation: star-burst 0.8s ease-out forwards;
  animation-delay: var(--light-delay);
}

.star-glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffd700 0%, #ff9ec4 30%, transparent 70%);
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.5s ease;
}

.summon-star.lit .star-glow {
  opacity: 0.7;
  animation: halo-pulse 2.5s ease-in-out infinite;
}

.star-shape {
  position: relative;
  z-index: 2;
  filter: drop-shadow(0 0 6px currentColor);
}

.constellation-lines {
  position: absolute;
  left: 50%;
  top: 45%;
  width: min(560px, 82vw);
  height: min(560px, 82vw);
  transform: translate(-50%, -50%);
  z-index: 3;
  pointer-events: none;
  transition: opacity 1s ease;
}

.constellation-lines polyline {
  fill: none;
  stroke: rgba(255, 158, 196, 0.5);
  stroke-width: 0.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 4px rgba(255, 158, 196, 0.5));
  stroke-dasharray: 300;
  stroke-dashoffset: 0;
  animation: line-draw 2s ease-out forwards, line-shimmer 3s ease-in-out 2s infinite;
}

.summoning-text {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 10;
  animation: text-enter 1s ease-out 1.2s both;
}

.summon-title {
  font-size: 17px;
  color: #ffb7d0;
  letter-spacing: 4px;
  text-shadow: 0 0 16px rgba(255, 158, 196, 0.6), 0 0 32px rgba(201, 177, 255, 0.3);
  margin-bottom: 8px;
  font-weight: 600;
}

.summon-sub {
  font-size: 12px;
  color: rgba(201, 177, 255, 0.7);
  letter-spacing: 2px;
}

/* 真实加载进度条 */
.progress-track {
  position: relative;
  margin: 18px auto 0;
  width: min(280px, 60vw);
  height: 4px;
  background: rgba(255, 158, 196, 0.12);
  border-radius: 2px;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff, #ffd700);
  border-radius: 2px;
  transition: width 0.3s ease-out;
  position: relative;
  box-shadow: 0 0 12px rgba(255, 158, 196, 0.6);
}

.progress-fill::after {
  content: '';
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 16px rgba(255, 255, 255, 0.9), 0 0 24px rgba(255, 215, 0, 0.6);
}

.progress-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
  animation: progressShine 1.5s linear infinite;
}

@keyframes progressShine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.progress-pct {
  position: absolute;
  right: -42px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  font-family: 'Courier New', monospace;
  color: rgba(255, 215, 0, 0.8);
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.4);
}

.burst-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 245, 240, 0.95) 0%, rgba(255, 158, 196, 0.6) 25%, rgba(201, 177, 255, 0.3) 55%, transparent 80%);
  opacity: 0;
  pointer-events: none;
  z-index: 20;
}

.bokeh-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background:
    radial-gradient(ellipse 200px 200px at 20% 30%, rgba(255,158,196,0.08) 0%, transparent 70%),
    radial-gradient(ellipse 250px 250px at 80% 20%, rgba(201,177,255,0.06) 0%, transparent 70%),
    radial-gradient(ellipse 180px 180px at 70% 80%, rgba(184,224,255,0.05) 0%, transparent 70%),
    radial-gradient(ellipse 220px 220px at 15% 75%, rgba(255,215,0,0.04) 0%, transparent 70%);
  animation: bokeh-drift 12s ease-in-out infinite;
}

.phase-loading.is-complete .burst-overlay {
  animation: burst-out 0.9s ease-out forwards;
}

.phase-loading.is-complete .magic-circle-bg,
.phase-loading.is-complete .svg-magic-circle,
.phase-loading.is-complete .energy-core-wrap,
.phase-loading.is-complete .summoning-stars,
.phase-loading.is-complete .constellation-lines,
.phase-loading.is-complete .summoning-text {
  animation: shrink-in 0.9s ease-in forwards;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes core-enter {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

@keyframes core-swirl {
  from { transform: scale(1.1) rotate(0deg); }
  to { transform: scale(1.1) rotate(360deg); }
}

@keyframes ring-glow {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 30px rgba(255,158,196,0.2), inset 0 0 20px rgba(201,177,255,0.15); }
  50% { opacity: 1; box-shadow: 0 0 50px rgba(255,158,196,0.4), inset 0 0 35px rgba(201,177,255,0.3); }
}

@keyframes magic-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes svg-spin-reverse {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}

@keyframes rune-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes draw-line {
  to { stroke-dashoffset: 0; }
}

@keyframes line-draw {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}

@keyframes halo-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.2); }
}

@keyframes star-burst {
  0% { transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.3); }
  50% { transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.8); }
  100% { transform: rotate(var(--angle)) translateX(calc(min(560px, 82vw) / 2 - 30px)) rotate(calc(var(--angle) * -1)) scale(1.3); }
}

@keyframes line-shimmer {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

@keyframes text-enter {
  from { opacity: 0; transform: translateX(-50%) translateY(20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes burst-out {
  0% { opacity: 0; transform: scale(0.15); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: scale(3); }
}

@keyframes shrink-in {
  to { opacity: 0; transform: scale(0.05); filter: blur(25px); }
}

@keyframes bokeh-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-10px, 8px) scale(1.05); }
}

@media (max-width: 768px) {
  .energy-core-wrap {
    width: min(200px, 50vw);
    height: min(200px, 50vw);
  }
  .svg-magic-circle {
    width: min(420px, 90vw);
    height: min(420px, 90vw);
  }
  .summoning-stars,
  .constellation-lines {
    width: min(420px, 90vw);
    height: min(420px, 90vw);
  }
  .summon-star {
    transform: rotate(var(--angle)) translateX(calc(min(420px, 90vw) / 2 - 24px)) rotate(calc(var(--angle) * -1));
    width: 22px;
    height: 22px;
  }
  .summon-star.lit {
    transform: rotate(var(--angle)) translateX(calc(min(420px, 90vw) / 2 - 24px)) rotate(calc(var(--angle) * -1)) scale(1.2);
  }
  .rune-char { font-size: 11px; }
  .summon-title { font-size: 14px; letter-spacing: 2px; }
  .summon-sub { font-size: 10px; letter-spacing: 1px; }
}

/* 进度文案淡入淡出过渡 */
.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.tip-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 跳过按钮 */
.skip-btn {
  position: absolute;
  bottom: 5%;
  right: 5%;
  z-index: 15;
  padding: 8px 20px;
  border: 1px solid rgba(255, 215, 0, 0.4);
  border-radius: 20px;
  background: rgba(20, 10, 40, 0.6);
  color: rgba(255, 215, 0, 0.9);
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all 0.25s ease;
  animation: skipFadeIn 0.5s ease-out;
}
.skip-btn:hover {
  background: rgba(255, 215, 0, 0.15);
  border-color: rgba(255, 215, 0, 0.7);
  box-shadow: 0 0 16px rgba(255, 215, 0, 0.3);
  transform: translateY(-1px);
}
@keyframes skipFadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
