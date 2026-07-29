<template>
  <section class="phase-entrance" @mousemove="onMouseMove" :class="{ transitioning: isTransitioning }">
    <!-- AI 生成星云背景兜底 -->
    <div class="bg-image-layer" :style="bgLayerStyle"></div>

    <!-- 视频轮播：三图层固定 src，通过 active 类交叉淡入淡出 -->
    <video class="bg-video-layer" ref="videoA" autoplay muted loop playsinline></video>
    <video class="bg-video-layer" ref="videoB" autoplay muted loop playsinline></video>
    <video class="bg-video-layer" ref="videoC" autoplay muted loop playsinline></video>

    <!-- 旋转魔法阵层 -->
    <div class="magic-circle-wrap" :style="magicCircleStyle">
      <div class="magic-circle-layer" :style="magicCircleLayerStyle"></div>
    </div>

    <!-- 手绘感光斑 -->
    <div class="cover-orb cover-orb-1" :style="orbStyle(-1, 0.3)"></div>
    <div class="cover-orb cover-orb-2" :style="orbStyle(1, 0.25)"></div>
    <div class="cover-orb cover-orb-3" :style="orbStyle(0, 0.2)"></div>
    <div class="cover-orb cover-orb-4"></div>

    <!-- 次元传送门 -->
    <div class="cover-portal" :style="portalStyle"></div>

    <!-- 星点画布 -->
    <canvas ref="canvasRef" id="entrance-canvas"></canvas>

    <!-- 流星层 -->
    <div class="cover-shooting-stars" ref="shootingStarsRef"></div>

    <!-- 漂浮粒子 -->
    <div class="cover-particles" ref="particlesRef"></div>

    <!-- 内容层 -->
    <div class="entrance-content" :style="contentStyle">
      <h1 class="entrance-title" data-text="星云编年史">星云编年史</h1>
      <p class="entrance-subtitle">NEBULA CHRONICLE · 穿越次元，探索动画宇宙</p>
      <img class="title-ornament" :src="baseUrl + 'images/effects/title-ornament.png'" alt="" loading="lazy" decoding="async">
      <button class="journey-btn" @click="onStart" :disabled="isTransitioning">开始旅程</button>
    </div>

    <!-- 进入星系转场层 -->
    <div class="warp-overlay" v-if="isTransitioning">
      <div class="warp-flash"></div>
      <div class="warp-starburst"></div>
      <div class="warp-vignette"></div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useAudio } from '../composables/useAudio.js';

const emit = defineEmits(['start']);
const baseUrl = import.meta.env.BASE_URL;
const canvasRef = ref(null);
const shootingStarsRef = ref(null);
const particlesRef = ref(null);
const videoA = ref(null);
const videoB = ref(null);
const videoC = ref(null);

const { init: initAudio, getLevel } = useAudio();

let animationId = null;
let shootingTimer = null;
let carouselInterval = null;
let resizeHandler = null;
const parallax = ref({ x: 0, y: 0 });
const audioPulse = ref(0);
const isTransitioning = ref(false);

const videos = [
  baseUrl + 'images/generated/anime-nebula-sakura.mp4',
  baseUrl + 'images/generated/anime-starry-universe.mp4',
  baseUrl + 'images/generated/anime-magic-hall.mp4'
];

const orbStyle = (dir, strength) => ({
  transform: `translate(${parallax.value.x * -30 * dir * strength}px, ${parallax.value.y * -30 * dir * strength}px) scale(${1 + audioPulse.value * 0.05})`
});

const portalStyle = computed(() => ({
  transform: `translate(-50%, -55%) scale(${1 + audioPulse.value * 0.08})`,
  boxShadow: `
    0 0 ${80 + audioPulse.value * 60}px rgba(0, 243, 255, ${0.12 + audioPulse.value * 0.1}),
    inset 0 0 ${60 + audioPulse.value * 40}px rgba(124, 77, 255, ${0.1 + audioPulse.value * 0.1})
  `
}));

const bgLayerStyle = computed(() => ({
  backgroundImage: `url('${baseUrl}images/generated/minimax-nebula-bg.png')`
}));

const magicCircleLayerStyle = computed(() => ({
  backgroundImage: `url('${baseUrl}images/generated/magic-circle.jpg')`
}));

const magicCircleStyle = computed(() => ({
  transform: `translate(-50%, -55%) scale(${1 + audioPulse.value * 0.04})`
}));

const contentStyle = computed(() => ({
  transform: `translate(${parallax.value.x * 12}px, ${parallax.value.y * 12}px) scale(${isTransitioning.value ? 1.15 : 1})`,
  opacity: isTransitioning.value ? 0 : 1
}));

onMounted(() => {
  // 音频需用户手势解锁，这里只做静默初始化（AudioContext 会保持 suspended）
  initAudio().catch(() => {});
  initCarousel();
  initCanvas();
  initShootingStars();
  initParticles();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  clearTimeout(shootingTimer);
  clearInterval(carouselInterval);
  window.removeEventListener('resize', resizeHandler);
  // 释放背景视频：暂停并清空 src，防止内存泄漏与后台继续缓冲
  [videoA, videoB, videoC].forEach(v => {
    const el = v.value;
    if (!el) return;
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {}
  });
});

function onStart() {
  if (isTransitioning.value) return;
  isTransitioning.value = true;
  setTimeout(() => emit('start'), 1200);
}

function initCarousel() {
  if (!videoA.value || !videoB.value || !videoC.value) return;
  const layers = [videoA.value, videoB.value, videoC.value];
  const loadOk = [true, true, true];

  layers.forEach((video, i) => {
    video.src = videos[i];
    video.addEventListener('error', () => {
      console.warn(`背景视频加载失败: ${videos[i]}`);
      loadOk[i] = false;
      video.classList.remove('active');
    }, { once: true });
  });

  // 默认第一张激活；若加载失败，carousel 会跳过它
  videoA.value.classList.add('active');

  let idx = 0;
  carouselInterval = setInterval(() => {
    const current = layers[idx];
    let nextIdx = idx;
    let attempts = 0;
    do {
      nextIdx = (nextIdx + 1) % layers.length;
      attempts++;
    } while (!loadOk[nextIdx] && attempts < layers.length);

    if (attempts >= layers.length) return; // 全部失败则停止轮播

    const next = layers[nextIdx];
    current.classList.remove('active');
    next.classList.add('active');
    idx = nextIdx;
  }, 8000);
}

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height, stars = [];
  const STAR_COUNT = 220;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    createStars();
  }

  function createStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.6 + 0.3,
        speed: Math.random() * 0.4 + 0.05,
        opacity: Math.random() * 0.8 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  }

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const pulse = getLevel();
    audioPulse.value = pulse;

    // 音频可视化：低频脉冲背景
    if (pulse > 0.15) {
      const g = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, Math.max(width, height) * 0.6);
      g.addColorStop(0, `rgba(0, 243, 255, ${pulse * 0.08})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    }

    // 转场时加速星空下坠，营造跃入感
    const warpSpeed = isTransitioning.value ? 8 : 1;

    stars.forEach(star => {
      star.y += star.speed * warpSpeed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      star.twinklePhase += star.twinkleSpeed;
      const baseAlpha = star.opacity * (0.6 + 0.4 * Math.sin(star.twinklePhase));
      const alpha = Math.min(1, baseAlpha + pulse * 0.4);

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size * (1 + pulse * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 240, 255, ${alpha})`;
      ctx.fill();

      if (star.size > 1.2) {
        ctx.save();
        ctx.translate(star.x, star.y);
        ctx.rotate(frame * 0.002 + star.twinklePhase);
        ctx.strokeStyle = `rgba(200, 230, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-star.size * 3, 0);
        ctx.lineTo(star.size * 3, 0);
        ctx.moveTo(0, -star.size * 3);
        ctx.lineTo(0, star.size * 3);
        ctx.stroke();
        ctx.restore();
      }
    });

    frame++;
    animationId = requestAnimationFrame(draw);
  }

  resizeHandler = () => resize();
  window.addEventListener('resize', resizeHandler);
  resize();
  draw();
}

function initShootingStars() {
  const container = shootingStarsRef.value;
  if (!container) return;

  function spawn() {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    star.style.top = `${Math.random() * 60}%`;
    star.style.left = `${30 + Math.random() * 70}%`;
    star.style.animationDuration = `${1.2 + Math.random() * 1.2}s`;
    container.appendChild(star);
    setTimeout(() => star.remove(), 3000);
  }

  function loop() {
    spawn();
    shootingTimer = setTimeout(loop, 2000 + Math.random() * 3500);
  }

  shootingTimer = setTimeout(loop, 800);
}

function initParticles() {
  const container = particlesRef.value;
  if (!container) return;

  const colors = [
    'rgba(0, 243, 255, 0.6)',
    'rgba(184, 146, 255, 0.6)',
    'rgba(255, 90, 205, 0.5)',
    'rgba(255, 255, 255, 0.7)'
  ];
  const count = 32;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'cover-particle';
    const size = Math.random() * 4 + 1;
    p.style.width = `${size}px`;
    p.style.height = `${size}px`;
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = `${12 + Math.random() * 20}s`;
    p.style.animationDelay = `${Math.random() * -20}s`;
    p.style.opacity = Math.random() * 0.6 + 0.2;
    container.appendChild(p);
  }
}

function onMouseMove(e) {
  parallax.value = {
    x: (e.clientX / window.innerWidth - 0.5) * 2,
    y: (e.clientY / window.innerHeight - 0.5) * 2
  };
}
</script>

<style scoped>
.phase-entrance {
  position: absolute;
  inset: 0;
  background: var(--bg-darker);
  overflow: hidden;
}

.bg-image-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0.7;
  pointer-events: none;
}

.bg-video-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.6s ease;
  pointer-events: none;
  z-index: 1;
}

.bg-video-layer.active {
  opacity: 0.55;
}

.magic-circle-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(680px, 110vw);
  height: min(680px, 110vw);
  z-index: 1;
  pointer-events: none;
}

.magic-circle-layer {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0.12;
  filter: hue-rotate(20deg) saturate(1.4);
  mix-blend-mode: screen;
  will-change: transform;
  animation: magicRotate 60s linear infinite;
}

@keyframes magicRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cover-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(40px);
  transition: transform 0.1s ease-out;
}

.cover-orb-1 {
  width: 480px;
  height: 480px;
  background: radial-gradient(circle, #4da6ff 0%, rgba(45, 90, 245, 0.6) 70%, transparent 100%);
  top: -100px;
  left: -100px;
  animation: coverOrbFloat 16s ease-in-out infinite;
}

.cover-orb-2 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #b892ff 0%, rgba(124, 77, 255, 0.5) 70%, transparent 100%);
  bottom: -80px;
  right: -80px;
  animation: coverOrbFloat 16s ease-in-out infinite;
  animation-delay: -5s;
}

.cover-orb-3 {
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, #52d1c1 0%, rgba(0, 153, 204, 0.5) 70%, transparent 100%);
  top: 50%;
  left: 50%;
  margin-left: -160px;
  margin-top: -160px;
  animation: coverOrbFloat 16s ease-in-out infinite;
  animation-delay: -10s;
}

.cover-orb-4 {
  width: 1200px;
  height: 1200px;
  background: radial-gradient(circle, rgba(124, 77, 255, 0.22) 0%, rgba(45, 90, 245, 0.08) 40%, transparent 70%);
  top: 50%;
  left: 50%;
  margin-left: -600px;
  margin-top: -600px;
  opacity: 0.18;
  animation: coverOrbFloat 24s ease-in-out infinite;
  animation-delay: -13s;
}

@keyframes coverOrbFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(40px, -50px) scale(1.08); }
  50% { transform: translate(-30px, 30px) scale(0.95); }
  75% { transform: translate(50px, 40px) scale(1.03); }
}

.cover-portal {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(520px, 90vw);
  height: min(520px, 90vw);
  transform: translate(-50%, -55%);
  z-index: 1;
  pointer-events: none;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 243, 255, 0.08) 0%, rgba(124, 77, 255, 0.05) 40%, transparent 70%);
  transition: box-shadow 0.1s ease-out;
}

#entrance-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.cover-shooting-stars {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
}

.shooting-star {
  position: absolute;
  width: 100px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.9), transparent);
  transform: rotate(-45deg);
  opacity: 0;
  animation: shootingStar 2s ease-out forwards;
  filter: drop-shadow(0 0 6px rgba(0, 243, 255, 0.8));
}

@keyframes shootingStar {
  0% { opacity: 0; transform: translateX(0) translateY(0) rotate(-45deg); }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translateX(-400px) translateY(400px) rotate(-45deg); }
}

.cover-particles {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
}

.cover-particle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, transparent 70%);
  animation: coverParticleFloat linear infinite;
}

@keyframes coverParticleFloat {
  0% { transform: translateY(110vh) translateX(0) scale(0); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translateY(-10vh) translateX(30px) scale(1); opacity: 0; }
}

.entrance-content {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  pointer-events: none;
  transition: transform 0.8s ease-out, opacity 0.8s ease-out;
}

.entrance-title {
  font-family: 'ZCOOL XiaoWei', serif;
  font-size: clamp(48px, 10vw, 120px);
  background: linear-gradient(180deg, #fff 0%, #b892ff 55%, #00f3ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: brightness(1.1) drop-shadow(0 0 30px rgba(0, 243, 255, 0.5)) drop-shadow(0 0 60px rgba(176, 38, 255, 0.35));
  animation: titleGlow 3s ease-in-out infinite alternate;
  position: relative;
}

.entrance-title::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, #fff 0%, #b892ff 55%, #00f3ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  opacity: 0.35;
  transform: translateY(2px);
  filter: blur(2px);
  z-index: -1;
}

.entrance-subtitle {
  margin-top: 16px;
  font-size: clamp(14px, 2vw, 20px);
  color: var(--text-secondary);
  letter-spacing: 4px;
  text-shadow: 0 0 12px rgba(0, 243, 255, 0.35);
}

.title-ornament {
  margin-top: 18px;
  width: 220px;
  max-width: 70vw;
  opacity: 0.85;
  filter: drop-shadow(0 0 12px rgba(0, 243, 255, 0.4));
}

.journey-btn {
  margin-top: 48px;
  padding: 16px 48px;
  font-size: 18px;
  border: none;
  border-radius: 32px;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple));
  color: var(--bg-darker);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.4);
  pointer-events: auto;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.journey-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 50px rgba(0, 243, 255, 0.6);
}

.journey-btn:disabled {
  cursor: default;
}

@keyframes titleGlow {
  0% { filter: brightness(1.05) drop-shadow(0 0 20px rgba(0, 243, 255, 0.35)) drop-shadow(0 0 40px rgba(176, 38, 255, 0.25)); }
  100% { filter: brightness(1.35) drop-shadow(0 0 40px rgba(0, 243, 255, 0.55)) drop-shadow(0 0 80px rgba(176, 38, 255, 0.45)); }
}

/* 转场特效 */
.warp-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}

.warp-flash {
  position: absolute;
  inset: 0;
  background: white;
  opacity: 0;
  animation: warpFlash 1.2s ease-out forwards;
}

.warp-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, transparent 30%, rgba(0, 243, 255, 0.25) 70%, rgba(255, 255, 255, 0.9) 100%);
  opacity: 0;
  animation: warpVignette 1.2s ease-out forwards;
}

.warp-starburst {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(0, 243, 255, 0.6) 30%, transparent 70%);
  opacity: 0;
  animation: starburst 1.2s ease-out forwards;
}

@keyframes warpFlash {
  0% { opacity: 0; }
  25% { opacity: 0.95; }
  60% { opacity: 0.3; }
  100% { opacity: 0; }
}

@keyframes warpVignette {
  0% { opacity: 0; transform: scale(0.8); }
  30% { opacity: 1; }
  100% { opacity: 1; transform: scale(1.8); }
}

@keyframes starburst {
  0% { width: 0; height: 0; opacity: 1; }
  40% { opacity: 1; }
  100% { width: 300vmax; height: 300vmax; opacity: 0; }
}

/* 转场期间整体缩放 */
.phase-entrance.transitioning .bg-image-layer,
.phase-entrance.transitioning .bg-video-layer,
.phase-entrance.transitioning .cover-orb,
.phase-entrance.transitioning .cover-portal,
.phase-entrance.transitioning #entrance-canvas {
  animation: warpZoom 1.2s ease-out forwards;
}

@keyframes warpZoom {
  0% { transform: scale(1); }
  100% { transform: scale(1.25); }
}
</style>
