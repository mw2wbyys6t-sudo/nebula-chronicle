<template>
  <section class="phase-showcase" @mouseenter="isHovering = true" @mouseleave="isHovering = false">
    <canvas ref="gridCanvas" class="hologrid-canvas"></canvas>

    <div v-if="shouldUseVideo && videoLoaded !== false" class="data-stream-bg">
      <video
        ref="dataVideo"
        class="data-stream-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/anime-hall-poster.jpg'"
        :src="baseUrl + 'images/generated/anime-magic-hall.mp4'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="data-stream-overlay"></div>
    </div>

    <div class="showcase-core">
      <div class="core-energy">
        <div class="core-inner"></div>
        <div class="core-pulse"></div>
      </div>
      <div class="core-rings">
        <div class="core-ring rainbow-ring"></div>
        <div class="core-ring rainbow-ring"></div>
        <div class="core-ring rainbow-ring"></div>
      </div>
      <div class="core-label">✧ MAGIC CORE ✧</div>
    </div>

    <div v-if="!ready" class="showcase-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">まほう準備中...</p>
      <p class="loading-sub">历代名作正在汇聚 ♡</p>
    </div>

    <div v-else class="showcase-orbit">
      <div
        v-for="(work, i) in topWorks"
        :key="work.id"
        class="holo-card-wrapper"
        :class="`genre-${(work.genres?.[0] || 'Sci-Fi').replace(/\s+/g, '-')}`"
        :style="wrapperStyle(i)"
      >
        <div class="holo-card" :style="cardFloatStyle(i)">
          <div class="card-corners">
            <span class="corner tl">✦</span><span class="corner tr">✦</span>
            <span class="corner bl">✦</span><span class="corner br">✦</span>
          </div>
          <div class="card-watermark">♡</div>
          <div class="card-glow" :style="glowStyle(work)"></div>
          <div class="card-shimmer-rainbow"></div>
          <div class="card-frame"></div>
          <img :src="work.coverFallback || work.coverImage || (baseUrl + 'images/generated/nebula-bg.jpg')" :alt="work.titleRomaji" loading="lazy" decoding="async" @error="onImgError($event, work)">
          <div class="card-scanlines"></div>
          <div class="card-shimmer"></div>
          <div class="card-data-bar">
            <span class="data-dot"></span>
            <span class="data-text">ID:{{ String(work.id).slice(-4) }}</span>
          </div>
          <div class="holo-card-title">{{ work.titleRomaji }}</div>
          <div class="holo-card-meta">
            <span>{{ work.year }}</span>
            <span class="divider">♡</span>
            <span>{{ work.score ? work.score.toFixed(1) : '—' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="showcase-hud-top">
      <div class="hud-corner tl">
        <div class="hud-line"></div>
        <div class="hud-text">✿ 星霊殿堂 ✿</div>
      </div>
      <div class="hud-corner tr">
        <div class="hud-text">♡ 英雄たちの歌 ♡</div>
        <div class="hud-line"></div>
      </div>
    </div>

    <div class="showcase-hud-bottom">
      <div class="hud-corner bl">
        <div class="hud-line v"></div>
        <div class="hud-text">✧ 魔力安定 ✧</div>
      </div>
      <div class="hud-corner br">
        <div class="hud-text">♪ 作品収集中 ♪</div>
        <div class="hud-line v"></div>
      </div>
    </div>

    <div class="auto-progress-wrap">
      <div class="auto-progress-track">
        <div
          class="auto-progress-bar"
          :style="{ width: autoProgressPercent + '%', animationPlayState: isHovering ? 'paused' : 'running' }"
        ></div>
      </div>
      <div class="auto-progress-label">
        <span>✿ 自动前往次元之门 ✿</span>
        <span class="auto-progress-time">{{ remainingSeconds }}s</span>
      </div>
    </div>

    <div class="showcase-hint">
      <span class="hint-bracket">✿</span>
      回転展示 · クリックでスキップ
      <span class="hint-bracket">✿</span>
    </div>
    <button class="skip-btn" @click="emit('skip')">
      <span class="skip-text">✨ 前往次元之门 ✨</span>
      <span class="sparkle sparkle-1"></span>
      <span class="sparkle sparkle-2"></span>
      <span class="sparkle sparkle-3"></span>
      <span class="sparkle sparkle-4"></span>
    </button>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';

const emit = defineEmits(['skip']);
const baseUrl = import.meta.env.BASE_URL;
const ready = ref(false);
const videoLoaded = ref(null);
const dataVideo = ref(null);
const gridCanvas = ref(null);
const { shouldUseVideo } = useVideoBackground();

let gridRafId = null;
let gridResizeHandler = null;
let autoArmed = false;
let progressTimer = null;
const AUTO_ADVANCE_MS = 15000;
const autoProgressPercent = ref(0);
const remainingSeconds = ref(Math.ceil(AUTO_ADVANCE_MS / 1000));
const isHovering = ref(false);

const topWorks = computed(() => DataEngine.topWorks(8));
const genres = computed(() => DataEngine.genres.value);

function onVideoLoaded() {
  videoLoaded.value = true;
}

function onVideoError(e) {
  console.warn('[ShowcasePhase] 视频加载失败:', e);
  videoLoaded.value = false;
}

function onImgError(e, work) {
  // 外链封面（anilist CDN）加载失败时切换到本地兜底，避免裂图
  const fallback = work.coverFallback || (baseUrl + 'images/generated/nebula-bg.jpg');
  if (e.target.src !== fallback) e.target.src = fallback;
}

const glowStyle = (work) => {
  const genre = work.genres?.[0] || 'Sci-Fi';
  const color = genres.value.genres?.[genre]?.color || genres.value[genre]?.color || '#ff9ec4';
  return {
    boxShadow: `0 0 24px ${color}55, 0 0 50px ${color}22, inset 0 0 20px ${color}18`
  };
};

const wrapperStyle = (i) => {
  const count = topWorks.value.length || 1;
  const angle = (i / count) * Math.PI * 2;
  const radius = 280;
  return {
    transform: `rotateY(${angle * 180 / Math.PI}deg) translateZ(${radius}px)`,
  };
};

const cardFloatStyle = (i) => {
  return { animationDelay: `${i * 0.35}s` };
};

function initGrid() {
  const canvas = gridCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  let t = 0;

  const pastelColors = [
    'rgba(255, 158, 196, 0.6)',
    'rgba(201, 177, 255, 0.5)',
    'rgba(184, 224, 255, 0.5)',
    'rgba(255, 215, 0, 0.4)',
    'rgba(255, 255, 255, 0.5)'
  ];

  const bokehParticles = [];
  for (let i = 0; i < 45; i++) {
    bokehParticles.push({
      x: Math.random(),
      y: Math.random(),
      radius: 4 + Math.random() * 18,
      speedY: 0.00015 + Math.random() * 0.0004,
      speedX: (Math.random() - 0.5) * 0.0001,
      phase: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * pastelColors.length),
      alpha: 0.15 + Math.random() * 0.35
    });
  }

  const stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 1 + Math.random() * 2.5,
      points: Math.random() > 0.5 ? 4 : 5,
      twinkleSpeed: 0.02 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      colorIdx: Math.floor(Math.random() * pastelColors.length)
    });
  }

  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  }
  gridResizeHandler = resize;
  window.addEventListener('resize', resize);

  function drawStar(x, y, points, outerR, innerR, rotation, alpha, color) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points + rotation - Math.PI / 2;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = color;
    ctx.shadowBlur = outerR * 2;
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    t += 0.016;
    ctx.clearRect(0, 0, w, h);

    for (const p of bokehParticles) {
      p.y -= p.speedY;
      p.x += p.speedX * Math.sin(t * 0.3 + p.phase);
      if (p.y < -0.1) {
        p.y = 1.1;
        p.x = Math.random();
      }
      const px = p.x * w;
      const py = p.y * h;
      const pulseAlpha = p.alpha * (0.6 + 0.4 * Math.sin(t * 0.5 + p.phase));
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, p.radius);
      gradient.addColorStop(0, pastelColors[p.colorIdx].replace(/[\d.]+\)$/, `${pulseAlpha})`));
      gradient.addColorStop(1, 'rgba(255, 158, 196, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const s of stars) {
      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * s.twinkleSpeed + s.phase));
      const sx = s.x * w;
      const sy = s.y * h;
      const outerR = s.size;
      const innerR = s.size * 0.4;
      const rot = t * 0.3 + s.phase;
      drawStar(sx, sy, s.points, outerR, innerR, rot, twinkle, pastelColors[s.colorIdx]);
    }

    gridRafId = requestAnimationFrame(draw);
  }
  draw();
}

onMounted(async () => {
  initGrid();
  try {
    await DataEngine.load();
  } catch (err) {
    console.warn('[ShowcasePhase] 数据加载失败，仍展示已缓存/空集合:', err);
  }
  ready.value = true;
  startAutoAdvance();
});

let autoStartTime = 0;
let pausedElapsed = 0;
let hoverPauseStart = 0;

function startAutoAdvance() {
  if (progressTimer) clearInterval(progressTimer);
  autoArmed = true;
  autoStartTime = Date.now();
  pausedElapsed = 0;
  hoverPauseStart = 0;

  progressTimer = setInterval(() => {
    let elapsed = Date.now() - autoStartTime - pausedElapsed;
    if (isHovering.value) {
      if (hoverPauseStart === 0) hoverPauseStart = Date.now();
      elapsed -= Date.now() - hoverPauseStart;
    } else if (hoverPauseStart !== 0) {
      pausedElapsed += Date.now() - hoverPauseStart;
      hoverPauseStart = 0;
    }
    elapsed = Math.max(0, Math.min(elapsed, AUTO_ADVANCE_MS));
    const pct = (elapsed / AUTO_ADVANCE_MS) * 100;
    autoProgressPercent.value = pct;
    remainingSeconds.value = Math.max(0, Math.ceil((AUTO_ADVANCE_MS - elapsed) / 1000));

    if (elapsed >= AUTO_ADVANCE_MS && autoArmed) {
      clearInterval(progressTimer);
      progressTimer = null;
      autoArmed = false;
      emit('skip');
    }
  }, 100);
}

onUnmounted(() => {
  if (gridRafId) cancelAnimationFrame(gridRafId);
  if (gridResizeHandler) window.removeEventListener('resize', gridResizeHandler);
  if (progressTimer) clearInterval(progressTimer);
  autoArmed = false;
  if (dataVideo.value) {
    try { dataVideo.value.pause?.(); dataVideo.value.removeAttribute('src'); dataVideo.value.load(); } catch (e) {}
  }
});
</script>

<style scoped>
.phase-showcase {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(201, 177, 255, 0.12) 0%, transparent 55%),
    radial-gradient(ellipse at 30% 70%, rgba(255, 158, 196, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 60%, rgba(184, 224, 255, 0.06) 0%, transparent 45%),
    linear-gradient(180deg, #1a0a2e 0%, #2d1050 50%, #1f0a35 100%);
  perspective: 1200px;
  color: #fff;
  overflow: hidden;
}

.cg-vignette::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(26, 10, 46, 0.7) 100%);
  pointer-events: none;
  z-index: 20;
}

.hologrid-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.data-stream-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.data-stream-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.5s ease;
  filter: saturate(1.1) brightness(0.5);
}

.data-stream-video.is-loaded {
  opacity: 0.5;
}

.data-stream-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 30%, rgba(26, 10, 46, 0.7) 70%),
    linear-gradient(180deg, rgba(26, 10, 46, 0.5) 0%, transparent 30%, transparent 50%, rgba(31, 10, 53, 0.6) 100%);
  pointer-events: none;
}

.showcase-core {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  z-index: 2;
}

.core-energy {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
}

.core-inner {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #ffffff 0%, #ff9ec4 20%, #c9b1ff 45%, rgba(184, 224, 255, 0.6) 65%, transparent 80%);
  box-shadow:
    0 0 40px rgba(255, 158, 196, 0.6),
    0 0 80px rgba(201, 177, 255, 0.35),
    0 0 120px rgba(184, 224, 255, 0.15),
    inset 0 0 20px rgba(255, 255, 255, 0.3);
  animation: coreBreath 3s ease-in-out infinite;
}

.core-pulse {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  border: 1px solid rgba(255, 158, 196, 0.3);
  animation: corePulse 2s ease-out infinite;
}

.core-pulse::before,
.core-pulse::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(201, 177, 255, 0.25);
  animation: corePulse 2s ease-out infinite;
}

.core-pulse::before { animation-delay: 0.6s; border-color: rgba(201, 177, 255, 0.25); }
.core-pulse::after { animation-delay: 1.2s; border-color: rgba(184, 224, 255, 0.2); }

.core-label {
  position: absolute;
  top: calc(100% + 16px);
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 10px;
  letter-spacing: 3px;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff, #b8e0ff, #ffd700, #ff9ec4);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbowShift 4s linear infinite;
  white-space: nowrap;
  text-shadow: none;
  filter: drop-shadow(0 0 6px rgba(255, 158, 196, 0.4));
}

.core-rings {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
}

.core-ring {
  position: absolute;
  top: -55px;
  left: -55px;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 1px solid rgba(255, 158, 196, 0.25);
  animation: ringSpin 7s linear infinite;
}

.rainbow-ring {
  border-color: transparent;
  background: conic-gradient(from 0deg, transparent, rgba(255, 158, 196, 0.4), rgba(201, 177, 255, 0.3), rgba(184, 224, 255, 0.3), rgba(255, 215, 0, 0.3), transparent);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 1.5px), #000 calc(100% - 1.5px));
}

.core-ring:nth-child(2) {
  top: -75px;
  left: -75px;
  width: 150px;
  height: 150px;
  animation-duration: 11s;
  animation-direction: reverse;
}

.core-ring:nth-child(3) {
  top: -95px;
  left: -95px;
  width: 190px;
  height: 190px;
  animation-duration: 15s;
}

.showcase-loading {
  position: absolute;
  left: 50%;
  top: 55%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  z-index: 5;
}

.loading-spinner {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #ff9ec4;
  border-right-color: #c9b1ff;
  border-bottom-color: #b8e0ff;
  box-shadow: 0 0 12px rgba(255, 158, 196, 0.3), inset 0 0 8px rgba(201, 177, 255, 0.2);
  animation: spin 1.2s linear infinite;
  position: relative;
}

.loading-spinner::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1px solid transparent;
  border-top-color: rgba(255, 215, 0, 0.6);
  border-left-color: rgba(255, 158, 196, 0.4);
  animation: spin 0.8s linear infinite reverse;
}

.loading-text {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 12px;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff, #ff9ec4);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbowShift 2s linear infinite;
  letter-spacing: 2px;
  margin: 0;
}

.loading-sub {
  font-size: 12px;
  color: rgba(255, 158, 196, 0.5);
  letter-spacing: 1px;
  margin: 0;
}

.showcase-orbit {
  position: absolute;
  left: 50%;
  top: 45%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  animation: orbitRotate 28s linear infinite;
  z-index: 3;
}

.holo-card-wrapper {
  position: absolute;
  width: 140px;
  height: 200px;
  left: -70px;
  top: -100px;
  transform-style: preserve-3d;
}

.holo-card {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(45, 16, 80, 0.85) 0%, rgba(26, 10, 46, 0.9) 100%);
  border: 1px solid rgba(255, 158, 196, 0.3);
  transform-style: preserve-3d;
  overflow: hidden;
  animation: cardFloat 5s ease-in-out infinite;
  transition: filter 0.2s ease, transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  position: relative;
}

.holo-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.4), rgba(201, 177, 255, 0.3), rgba(184, 224, 255, 0.3), rgba(255, 215, 0, 0.3));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 6;
}

.holo-card:hover {
  filter: brightness(1.2);
  transform: scale(1.1) translateZ(30px);
  box-shadow:
    0 0 30px rgba(255, 158, 196, 0.4),
    0 0 60px rgba(201, 177, 255, 0.2),
    inset 0 0 20px rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 158, 196, 0.6);
}

.card-corners .corner {
  position: absolute;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #ffd700;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.6);
  z-index: 6;
  animation: sparkleTwinkle 2s ease-in-out infinite;
}
.corner.tl { top: 2px; left: 2px; }
.corner.tr { top: 2px; right: 2px; animation-delay: 0.5s; }
.corner.bl { bottom: 2px; left: 2px; animation-delay: 1s; }
.corner.br { bottom: 2px; right: 2px; animation-delay: 1.5s; }

.card-watermark {
  position: absolute;
  bottom: 30%;
  right: 8px;
  font-size: 28px;
  color: rgba(255, 158, 196, 0.08);
  z-index: 2;
  pointer-events: none;
  transform: rotate(-15deg);
}

.card-glow {
  position: absolute;
  inset: -2px;
  border-radius: 16px;
  pointer-events: none;
  z-index: 0;
  opacity: 0.5;
}

.card-frame {
  position: absolute;
  inset: 4px;
  border-radius: 11px;
  border: 1px solid rgba(201, 177, 255, 0.15);
  pointer-events: none;
  z-index: 4;
}

.card-shimmer-rainbow {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  border-radius: 14px;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgba(255, 158, 196, 0.08) 40%,
    rgba(201, 177, 255, 0.1) 48%,
    rgba(184, 224, 255, 0.08) 55%,
    rgba(255, 215, 0, 0.1) 62%,
    transparent 72%
  );
  transform: translateX(-120%);
  animation: rainbowShimmer 5s ease-in-out infinite;
}

.holo-card img {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 65%;
  object-fit: cover;
  opacity: 0.9;
  filter: contrast(1.05) saturate(1.2) brightness(0.95);
  border-radius: 10px 10px 0 0;
}

.card-scanlines {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(255, 158, 196, 0.02) 3px,
    rgba(255, 158, 196, 0.02) 4px
  );
  opacity: 1;
  border-radius: 14px;
}

.card-shimmer {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.06) 50%, transparent 60%);
  transform: translateX(-120%);
  animation: holoShimmer 5s ease-in-out infinite;
  border-radius: 14px;
}

.card-data-bar {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.2), rgba(201, 177, 255, 0.15));
  border-radius: 8px;
  border: 1px solid rgba(255, 158, 196, 0.2);
}

.data-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #ff9ec4;
  box-shadow: 0 0 6px #ff9ec4, 0 0 10px rgba(255, 158, 196, 0.4);
  animation: dataBlink 1.5s ease-in-out infinite;
}

.data-text {
  font-family: 'Courier New', 'Noto Sans SC', monospace;
  font-size: 7px;
  color: rgba(255, 158, 196, 0.8);
  letter-spacing: 0.5px;
  text-shadow: 0 0 4px rgba(255, 158, 196, 0.3);
}

.holo-card-title {
  position: relative;
  z-index: 4;
  padding: 8px 8px 2px;
  font-size: 11px;
  text-align: center;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 0 8px rgba(255, 158, 196, 0.5), 0 0 16px rgba(201, 177, 255, 0.2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.holo-card-meta {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: 'Courier New', 'Noto Sans SC', monospace;
  font-size: 9px;
  color: rgba(201, 177, 255, 0.7);
  letter-spacing: 1px;
}

.divider {
  color: rgba(255, 158, 196, 0.5);
  font-size: 8px;
}

.showcase-hud-top,
.showcase-hud-bottom {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 10;
  pointer-events: none;
  display: flex;
  justify-content: space-between;
  padding: 24px 32px;
}

.showcase-hud-top { top: 0; }
.showcase-hud-bottom { bottom: 0; }

.hud-corner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.hud-corner.tl { flex-direction: row; }
.hud-corner.tr { flex-direction: row-reverse; }
.hud-corner.bl { flex-direction: row; align-items: flex-end; }
.hud-corner.br { flex-direction: row-reverse; align-items: flex-end; }

.hud-line {
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 158, 196, 0.4), transparent);
}

.hud-corner.tr .hud-line {
  background: linear-gradient(270deg, rgba(201, 177, 255, 0.4), transparent);
}

.hud-line.v {
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, rgba(184, 224, 255, 0.4), transparent);
}

.hud-corner.br .hud-line.v {
  background: linear-gradient(0deg, rgba(255, 215, 0, 0.3), transparent);
}

.hud-text {
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 9px;
  letter-spacing: 2px;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff, #b8e0ff);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: rainbowShift 5s linear infinite;
  filter: drop-shadow(0 0 4px rgba(255, 158, 196, 0.2));
}

.showcase-hint {
  position: absolute;
  bottom: 95px;
  left: 50%;
  transform: translateX(-50%);
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 10px;
  color: rgba(255, 158, 196, 0.4);
  letter-spacing: 2px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-progress-wrap {
  position: absolute;
  bottom: 68px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  width: 240px;
  pointer-events: none;
}

.auto-progress-track {
  width: 100%;
  height: 3px;
  background: rgba(255, 182, 216, 0.15);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 0 4px rgba(255, 158, 196, 0.1);
}

.auto-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #ff9ec4, #c9b1ff, #b8e0ff, #ffd700);
  border-radius: 3px;
  box-shadow: 0 0 8px rgba(255, 158, 196, 0.6);
  transition: width 0.1s linear;
}

.auto-progress-label {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 10px;
  color: rgba(255, 182, 216, 0.55);
  letter-spacing: 1px;
}

.auto-progress-time {
  color: rgba(255, 215, 0, 0.7);
  font-family: 'Courier New', 'Noto Sans SC', monospace;
}

.hint-bracket {
  color: rgba(255, 215, 0, 0.5);
  animation: bracketBlink 2s ease-in-out infinite;
  font-size: 10px;
}

.skip-btn {
  position: absolute;
  bottom: 44px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 36px;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.25) 0%, rgba(201, 177, 255, 0.2) 50%, rgba(184, 224, 255, 0.15) 100%);
  border: 1.5px solid #ffd700;
  color: #fff;
  border-radius: 24px;
  cursor: pointer;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  font-size: 13px;
  letter-spacing: 2px;
  backdrop-filter: blur(10px);
  box-shadow:
    0 0 16px rgba(255, 158, 196, 0.25),
    0 0 32px rgba(201, 177, 255, 0.1),
    inset 0 0 12px rgba(255, 255, 255, 0.05),
    0 0 0 1px rgba(255, 215, 0, 0.15);
  transition: all 0.3s ease;
  overflow: visible;
  z-index: 10;
  text-shadow: 0 0 8px rgba(255, 158, 196, 0.5);
}

.skip-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  transition: left 0.5s ease;
}

.skip-btn:hover {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.4) 0%, rgba(201, 177, 255, 0.3) 50%, rgba(255, 215, 0, 0.2) 100%);
  border-color: #fff;
  box-shadow:
    0 0 28px rgba(255, 158, 196, 0.5),
    0 0 56px rgba(201, 177, 255, 0.3),
    0 0 80px rgba(255, 215, 0, 0.2),
    inset 0 0 16px rgba(255, 255, 255, 0.1);
  text-shadow:
    0 0 8px rgba(255, 255, 255, 0.8),
    0 0 16px rgba(255, 158, 196, 0.6),
    0 0 24px rgba(201, 177, 255, 0.4);
  transform: translateX(-50%) scale(1.05);
}

.skip-btn:hover::before { left: 100%; }

.sparkle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: #ffd700;
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  box-shadow: 0 0 6px #ffd700, 0 0 12px rgba(255, 215, 0, 0.5);
}

.sparkle-1 { top: -4px; left: 20%; animation: sparkleFloat 1.5s ease-in-out infinite; }
.sparkle-2 { top: 60%; right: -6px; animation: sparkleFloat 1.5s ease-in-out infinite 0.4s; background: #ff9ec4; box-shadow: 0 0 6px #ff9ec4, 0 0 12px rgba(255, 158, 196, 0.5); }
.sparkle-3 { bottom: -2px; left: 70%; animation: sparkleFloat 1.5s ease-in-out infinite 0.8s; background: #c9b1ff; box-shadow: 0 0 6px #c9b1ff, 0 0 12px rgba(201, 177, 255, 0.5); }
.sparkle-4 { top: 30%; left: -4px; animation: sparkleFloat 1.5s ease-in-out infinite 1.2s; background: #b8e0ff; box-shadow: 0 0 6px #b8e0ff, 0 0 12px rgba(184, 224, 255, 0.5); }

.skip-btn:hover .sparkle { opacity: 1; }

.skip-text { position: relative; display: inline-block; z-index: 1; }

@keyframes spin { to { transform: rotate(360deg); } }

@keyframes coreBreath {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
}

@keyframes corePulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}

@keyframes ringSpin {
  from { transform: rotateX(72deg) rotateZ(0deg); }
  to { transform: rotateX(72deg) rotateZ(360deg); }
}

@keyframes orbitRotate {
  from { transform: rotateY(0deg); }
  to { transform: rotateY(360deg); }
}

@keyframes cardFloat {
  0%, 100% { transform: translateY(0) translateZ(0); }
  50% { transform: translateY(-14px) translateZ(10px); }
}

@keyframes holoShimmer {
  0%, 70% { transform: translateX(-120%); }
  85% { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}

@keyframes rainbowShimmer {
  0%, 65% { transform: translateX(-120%); }
  85% { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}

@keyframes rainbowShift {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

@keyframes dataBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes sparkleTwinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

@keyframes sparkleFloat {
  0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
  50% { opacity: 1; transform: scale(1) translateY(-6px); }
}

@keyframes bracketBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@media (max-width: 768px) {
  .hud-text { font-size: 8px; letter-spacing: 1px; }
  .hud-line { width: 30px; }
  .showcase-hud-top, .showcase-hud-bottom { padding: 16px; }
  .holo-card-wrapper { width: 110px; height: 160px; left: -55px; top: -80px; }
  .skip-btn { font-size: 11px; padding: 10px 28px; letter-spacing: 1px; }
}
</style>
