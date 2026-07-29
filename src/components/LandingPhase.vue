<template>
  <section class="phase-landing" @mousemove="onMouseMove">
    <div class="distant-nebula">
      <div
        class="nebula-image"
        :style="{ backgroundImage: `url(${baseUrl}images/generated/minimax-nebula-bg.png)` }"
      ></div>
      <div class="nebula-veil"></div>
      <div class="css-bokeh">
        <div class="bokeh b1"></div>
        <div class="bokeh b2"></div>
        <div class="bokeh b3"></div>
        <div class="bokeh b4"></div>
        <div class="bokeh b5"></div>
        <div class="bokeh b6"></div>
      </div>
    </div>

    <div v-if="shouldUseVideo && videoLoaded !== false" class="gate-video-wrap">
      <video
        ref="bgVideo"
        class="gate-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/anime-sakura-poster.jpg'"
        :src="baseUrl + 'images/generated/anime-nebula-sakura.mp4'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="gate-video-mask"></div>
    </div>

    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <div class="entrance-glow"></div>

    <div class="gate-scene">
      <div class="gate-arch">
        <div class="arch-frame">
          <svg class="arch-svg" viewBox="0 0 400 560" preserveAspectRatio="none">
            <defs>
              <linearGradient id="archGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff9ec4"/>
                <stop offset="33%" stop-color="#ffb7d0"/>
                <stop offset="66%" stop-color="#c9b1ff"/>
                <stop offset="100%" stop-color="#b8e0ff"/>
              </linearGradient>
              <linearGradient id="archGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#fff0f5"/>
                <stop offset="50%" stop-color="#ffb7d0"/>
                <stop offset="100%" stop-color="#c9b1ff"/>
              </linearGradient>
              <filter id="archGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <path class="arch-path" d="M50,540 L50,210 Q50,50 200,40 Q350,50 350,210 L350,540" fill="none" stroke="url(#archGrad)" stroke-width="3.5" stroke-linecap="round" filter="url(#archGlow)"/>
            <path class="arch-path inner" d="M72,540 L72,220 Q72,80 200,70 Q328,80 328,220 L328,540" fill="none" stroke="url(#archGrad2)" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
            <path class="arch-deco top-ribbon" d="M130,95 Q200,30 270,95" fill="none" stroke="#ff9ec4" stroke-width="1.2" stroke-linecap="round" opacity="0.6" filter="url(#softGlow)"/>
            <g class="arch-ornament-top" transform="translate(200,52)">
              <path d="M0,-16 C-4,-16 -8,-12 -8,-8 C-8,-4 -4,0 0,4 C4,0 8,-4 8,-8 C8,-12 4,-16 0,-16Z" fill="#ffb7d0" filter="url(#archGlow)"/>
              <circle cx="0" cy="-6" r="3" fill="#ffd700" opacity="0.9"/>
              <path d="M-18,-4 L-22,-8 L-26,-4 L-22,0Z" fill="#c9b1ff" opacity="0.7"/>
              <path d="M18,-4 L22,-8 L26,-4 L22,0Z" fill="#b8e0ff" opacity="0.7"/>
              <circle cx="-14" cy="6" r="2" fill="#ff9ec4" opacity="0.8"/>
              <circle cx="14" cy="6" r="2" fill="#ff9ec4" opacity="0.8"/>
            </g>
            <g class="arch-deco-dots">
              <circle cx="58" cy="180" r="3" fill="#ffb7d0" opacity="0.8" filter="url(#softGlow)"/>
              <circle cx="342" cy="180" r="3" fill="#ffb7d0" opacity="0.8" filter="url(#softGlow)"/>
              <circle cx="68" cy="300" r="2.5" fill="#c9b1ff" opacity="0.7"/>
              <circle cx="332" cy="300" r="2.5" fill="#c9b1ff" opacity="0.7"/>
              <circle cx="60" cy="420" r="3" fill="#b8e0ff" opacity="0.7"/>
              <circle cx="340" cy="420" r="3" fill="#b8e0ff" opacity="0.7"/>
              <circle cx="100" cy="130" r="2" fill="#ffd700" opacity="0.6"/>
              <circle cx="300" cy="130" r="2" fill="#ffd700" opacity="0.6"/>
              <path d="M80,240 L83,234 L86,240 L83,246Z" fill="#fff0f5" opacity="0.7"/>
              <path d="M320,240 L323,234 L326,240 L323,246Z" fill="#fff0f5" opacity="0.7"/>
              <path d="M75,360 L79,356 L83,360 L79,364Z" fill="#ffb7d0" opacity="0.6"/>
              <path d="M325,360 L329,356 L333,360 L329,364Z" fill="#ffb7d0" opacity="0.6"/>
              <path class="tiny-heart" d="M120,170 C120,166 116,164 114,166 C112,164 108,166 108,170 C108,174 114,178 114,178 C114,178 120,174 120,170Z" fill="#ff9ec4" opacity="0.5"/>
              <path class="tiny-heart" d="M292,170 C292,166 288,164 286,166 C284,164 280,166 280,170 C280,174 286,178 286,178 C286,178 292,174 292,170Z" fill="#ff9ec4" opacity="0.5"/>
              <path d="M160,85 L162,81 L164,85 L168,87 L164,89 L162,93 L160,89 L156,87Z" fill="#ffd700" opacity="0.5"/>
              <path d="M240,85 L242,81 L244,85 L248,87 L244,89 L242,93 L240,89 L236,87Z" fill="#ffd700" opacity="0.5"/>
            </g>
            <path class="arch-deco runes" d="M60,530 L340,530" stroke="url(#archGrad2)" stroke-width="1" stroke-linecap="round" opacity="0.4" stroke-dasharray="6 8"/>
            <circle cx="200" cy="530" r="3" fill="#ffd700" opacity="0.6" filter="url(#softGlow)"/>
          </svg>
        </div>

        <div class="gate-inner">
          <div
            v-if="causticLoaded"
            class="gate-caustic"
            :style="{ backgroundImage: `url(${baseUrl}images/effects/glass-caustic.jpg)` }"
          ></div>
          <div class="gate-energy-ring ring-pink"></div>
          <div class="gate-energy-ring ring-lavender delay1"></div>
          <div class="gate-energy-ring ring-sky delay2"></div>
          <div class="gate-energy-ring ring-gold delay3"></div>

          <div class="gate-crystal-wrap">
            <div
              class="gate-crystal"
              :style="{ backgroundImage: `url(${baseUrl}images/generated/title-glass-disc.jpg)` }"
            ></div>
            <div class="crystal-glow"></div>
            <div class="crystal-rays"></div>
            <div class="crystal-shimmer"></div>
          </div>
        </div>
      </div>

      <div class="gate-title-area">
        <div class="title-ornament"
          :style="{ backgroundImage: `url(${baseUrl}images/effects/title-ornament.png)` }"
        ></div>
        <div class="brand-en">✧ Nebula Chronicle ✧</div>
        <h1 class="brand-title">
          <span
            v-for="(char, i) in titleChars"
            :key="i"
            class="title-char"
            :style="{ animationDelay: `${0.8 + i * 0.1}s` }"
          >{{ char }}<span class="char-sparkle" :style="{ animationDelay: `${1.5 + i * 0.15}s` }">✦</span></span>
        </h1>
        <div class="title-line"></div>
        <p class="brand-sub">♡ 8位守护者集结完毕 · 次元航路开通 ♡</p>
      </div>

      <div class="guardians-left">
        <div
          v-for="(char, i) in leftGuardians"
          :key="char.file"
          class="guardian-col-node"
          :style="colNodeStyle(i, 'left')"
          @mouseenter="hoveredNode = `l${i}`"
          @mouseleave="hoveredNode = null"
        >
          <div class="g-rune" :class="{ active: hoveredNode === `l${i}` }"></div>
          <div class="g-aura" :class="{ active: hoveredNode === `l${i}` }"></div>
          <div class="g-star-ring" :class="{ active: hoveredNode === `l${i}` }"></div>
          <div class="g-hover-sparkles" :class="{ active: hoveredNode === `l${i}` }">
            <span class="hs s1">♡</span>
            <span class="hs s2">✧</span>
            <span class="hs s3">☆</span>
            <span class="hs s4">✿</span>
          </div>
          <div class="g-portal">
            <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" loading="lazy" decoding="async" />
          </div>
          <div class="g-name">{{ char.name }}</div>
        </div>
      </div>

      <div class="guardians-right">
        <div
          v-for="(char, i) in rightGuardians"
          :key="char.file"
          class="guardian-col-node"
          :style="colNodeStyle(i, 'right')"
          @mouseenter="hoveredNode = `r${i}`"
          @mouseleave="hoveredNode = null"
        >
          <div class="g-rune" :class="{ active: hoveredNode === `r${i}` }"></div>
          <div class="g-aura" :class="{ active: hoveredNode === `r${i}` }"></div>
          <div class="g-star-ring" :class="{ active: hoveredNode === `r${i}` }"></div>
          <div class="g-hover-sparkles" :class="{ active: hoveredNode === `r${i}` }">
            <span class="hs s1">♡</span>
            <span class="hs s2">✧</span>
            <span class="hs s3">☆</span>
            <span class="hs s4">✿</span>
          </div>
          <div class="g-portal">
            <img :src="baseUrl + 'images/login/' + char.file" :alt="char.name" loading="lazy" decoding="async" />
          </div>
          <div class="g-name">{{ char.name }}</div>
        </div>
      </div>

      <button
        ref="enterBtnRef"
        class="enter-btn"
        :disabled="isTransitioning || !interactiveReady"
        :class="{ transitioning: isTransitioning, ready: interactiveReady }"
        @click="enter"
      >
        <span class="enter-core">
          <span class="enter-text">✿ 开启次元之旅 ✿</span>
          <span class="enter-shine"></span>
        </span>
        <span class="enter-sparkles">
          <i v-for="n in 12" :key="n" :style="{ '--i': n }"></i>
        </span>
        <span class="enter-sparkles-constant">
          <i v-for="n in 8" :key="'c'+n" :style="{ '--ci': n }"></i>
        </span>
      </button>
    </div>

    <div class="corner-hud top-left">
      <span class="hud-emoji">✧</span>
      <span class="hud-line"></span>
      <span class="hud-text">次元坐标：已锁定 ♡</span>
    </div>
    <div class="corner-hud top-right">
      <span class="hud-text">守护者：8/8 集结完毕 ☆</span>
      <span class="hud-line"></span>
      <span class="hud-emoji">✿</span>
    </div>
    <div class="corner-hud bottom-left">
      <span class="hud-emoji">♪</span>
      <span class="hud-line v"></span>
      <span class="hud-text">次元能量：满溢 ♡</span>
    </div>
    <div class="corner-hud bottom-right">
      <span class="hud-text">等待召唤师指令 ✧</span>
      <span class="hud-line v"></span>
      <span class="hud-emoji">☆</span>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useAudio } from '../composables/useAudio.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';

const emit = defineEmits(['start']);
const baseUrl = import.meta.env.BASE_URL;

const isTransitioning = ref(false);
const hoveredNode = ref(null);
const parallax = ref({ x: 0, y: 0 });
const videoLoaded = ref(null);
const bgVideo = ref(null);
const causticLoaded = ref(true);
// 按钮交互就绪标志：等视图动画全部完成后才允许点击，防止 box model 计算异常
const interactiveReady = ref(false);
const enterBtnRef = ref(null);
let enterLock = false;
let mouseRafId = null;
let lastMouseEvent = { clientX: 0, clientY: 0 };

const { init: initAudio } = useAudio();
const { shouldUseVideo } = useVideoBackground();

const characters = [
  { name: '御坂美琴', file: 'misaka-mikoto.jpg' },
  { name: '夏娜', file: 'shana.jpg' },
  { name: '立华奏', file: 'tachibana-kanade.jpg' },
  { name: '雷姆', file: 'rem.jpg' },
  { name: '薇尔莉特', file: 'violet-evergarden.png' },
  { name: '秋山澪', file: 'akiyama-mio.jpg' },
  { name: '伊蕾娜', file: 'elaina.jpg' },
  { name: '加藤惠', file: 'kato-megumi.jpg' }
];

const leftGuardians = computed(() => characters.slice(0, 4));
const rightGuardians = computed(() => characters.slice(4, 8));
const titleChars = computed(() => '星云编年史'.split(''));

function colNodeStyle(i, side) {
  return {
    '--float-delay': `${i * 0.25}s`,
    '--side': side === 'left' ? '1' : '-1'
  };
}

function onMouseMove(e) {
  // RAF 节流：避免每次 mousemove 都触发 98 个粒子的依赖更新
  if (mouseRafId) return;
  mouseRafId = requestAnimationFrame(() => {
    mouseRafId = null;
    parallax.value = {
      x: (lastMouseEvent.clientX / window.innerWidth - 0.5) * 2,
      y: (lastMouseEvent.clientY / window.innerHeight - 0.5) * 2
    };
  });
  lastMouseEvent = e;
}

function enter() {
  if (enterLock || isTransitioning.value) return;
  enterLock = true;
  isTransitioning.value = true;
  try {
    initAudio().catch(() => {});
  } catch (e) {}
  setTimeout(() => {
    emit('start');
    setTimeout(() => { enterLock = false; isTransitioning.value = false; }, 2000);
  }, 900);
}

const particleCanvas = ref(null);
let particleRaf = null;
let resizeHandler = null;

function drawPetal(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size, size * 0.6);
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.bezierCurveTo(3, -5, 5, -2, 5, 0);
  ctx.bezierCurveTo(5, 3, 2, 5, 0, 5);
  ctx.bezierCurveTo(-2, 5, -5, 3, -5, 0);
  ctx.bezierCurveTo(-5, -2, -3, -5, 0, -5);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.quadraticCurveTo(0.5, 0, 0, 4.5);
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.3;
  ctx.stroke();
  ctx.restore();
}

function draw4Star(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const outerX = Math.cos(angle) * size;
    const outerY = Math.sin(angle) * size;
    const innerAngle = angle + Math.PI / 4;
    const innerX = Math.cos(innerAngle) * size * 0.3;
    const innerY = Math.sin(innerAngle) * size * 0.3;
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function draw5Star(ctx, x, y, size, rotation, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outerAngle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 5;
    const outerX = Math.cos(outerAngle) * size;
    const outerY = Math.sin(outerAngle) * size;
    const innerX = Math.cos(innerAngle) * size * 0.4;
    const innerY = Math.sin(innerAngle) * size * 0.4;
    if (i === 0) ctx.moveTo(outerX, outerY);
    else ctx.lineTo(outerX, outerY);
    ctx.lineTo(innerX, innerY);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 5, size / 5);
  ctx.beginPath();
  ctx.moveTo(0, 2);
  ctx.bezierCurveTo(-5, -3, -5, -6, -2, -6);
  ctx.bezierCurveTo(-0.5, -6, 0, -4.5, 0, -4);
  ctx.bezierCurveTo(0, -4.5, 0.5, -6, 2, -6);
  ctx.bezierCurveTo(5, -6, 5, -3, 0, 2);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

const P_COLORS = ['#ffb7d0', '#ff9ec4', '#c9b1ff', '#b8e0ff', '#ffd700', '#fff0f5'];

function initParticles() {
  const canvas = particleCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;

  const petalColors = ['#ffb7d0', '#ff9ec4', '#fff0f5', '#ffd6e7'];
  const starColors = ['#c9b1ff', '#b8e0ff', '#ffd700', '#fff0f5', '#ffb7d0'];
  const heartColors = ['#ff9ec4', '#ffb7d0', '#c9b1ff'];

  const petals = Array.from({ length: 45 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 4 + 2.5,
    speedY: Math.random() * -0.4 - 0.15,
    speedX: Math.random() * 0.3 - 0.15,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: Math.random() * 0.02 + 0.01,
    alpha: Math.random() * 0.4 + 0.3,
    color: petalColors[Math.floor(Math.random() * petalColors.length)]
  }));

  const stars = Array.from({ length: 35 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2.5 + 1,
    points: Math.random() > 0.5 ? 4 : 5,
    speedY: Math.random() * -0.2 - 0.05,
    speedX: (Math.random() - 0.5) * 0.15,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.02,
    alpha: Math.random() * 0.6 + 0.2,
    twinkle: Math.random() * Math.PI * 2,
    color: starColors[Math.floor(Math.random() * starColors.length)]
  }));

  const hearts = Array.from({ length: 8 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 3 + 2,
    speedY: Math.random() * -0.3 - 0.1,
    speedX: (Math.random() - 0.5) * 0.2,
    alpha: Math.random() * 0.3 + 0.2,
    pulse: Math.random() * Math.PI * 2,
    color: heartColors[Math.floor(Math.random() * heartColors.length)]
  }));

  const bokehs = Array.from({ length: 10 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 60 + 30,
    speedY: Math.random() * -0.1 - 0.02,
    speedX: (Math.random() - 0.5) * 0.05,
    alpha: Math.random() * 0.08 + 0.03,
    color: P_COLORS[Math.floor(Math.random() * P_COLORS.length)]
  }));

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  resizeHandler = resize;
  window.addEventListener('resize', resize);

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (const b of bokehs) {
      b.y += b.speedY;
      b.x += b.speedX + parallax.value.x * 0.05;
      if (b.y < -b.size) { b.y = height + b.size; b.x = Math.random() * width; }
      if (b.x < -b.size) b.x = width + b.size;
      if (b.x > width + b.size) b.x = -b.size;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.size);
      grd.addColorStop(0, b.color);
      grd.addColorStop(1, 'transparent');
      ctx.globalAlpha = b.alpha * (0.7 + 0.3 * Math.sin(Date.now() * 0.001 + b.x));
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of petals) {
      p.y += p.speedY;
      p.wobble += p.wobbleSpeed;
      p.x += p.speedX + Math.sin(p.wobble) * 0.3 + parallax.value.x * 0.15;
      p.rot += p.rotSpeed;
      if (p.y < -20) { p.y = height + 20; p.x = Math.random() * width; }
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      ctx.globalAlpha = p.alpha * (0.7 + 0.3 * Math.sin(Date.now() * 0.002 + p.x));
      drawPetal(ctx, p.x, p.y, p.size, p.rot, p.color);
    }

    for (const s of stars) {
      s.y += s.speedY;
      s.x += s.speedX + parallax.value.x * 0.1;
      s.rot += s.rotSpeed;
      s.twinkle += 0.05;
      if (s.y < -10) { s.y = height + 10; s.x = Math.random() * width; }
      const twinkleAlpha = s.alpha * (0.4 + 0.6 * Math.abs(Math.sin(s.twinkle)));
      ctx.globalAlpha = twinkleAlpha;
      if (s.points === 4) {
        draw4Star(ctx, s.x, s.y, s.size, s.rot, s.color);
      } else {
        draw5Star(ctx, s.x, s.y, s.size, s.rot, s.color);
      }
      ctx.globalAlpha = twinkleAlpha * 0.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = s.color;
      ctx.fill();
    }

    for (const h of hearts) {
      h.y += h.speedY;
      h.x += h.speedX + parallax.value.x * 0.12;
      h.pulse += 0.03;
      if (h.y < -15) { h.y = height + 15; h.x = Math.random() * width; }
      ctx.globalAlpha = h.alpha * (0.6 + 0.4 * Math.sin(h.pulse));
      drawHeart(ctx, h.x, h.y, h.size * (0.9 + 0.1 * Math.sin(h.pulse)), h.color);
    }

    ctx.globalAlpha = 1;
    particleRaf = requestAnimationFrame(draw);
  }
  draw();
}

function onVideoLoaded() { videoLoaded.value = true; }
function onVideoError(e) {
  console.warn('[LandingPhase] 视频加载失败:', e);
  videoLoaded.value = false;
}

let videoObserver = null;
function setupVideoObserver() {
  if (!bgVideo.value || !('IntersectionObserver' in window)) return;
  videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = bgVideo.value;
      if (!video) return;
      if (entry.isIntersecting) video.play?.().catch(() => {});
      else video.pause?.();
    });
  }, { threshold: 0.05 });
  videoObserver.observe(bgVideo.value);
}

let readyTimer = null;

onMounted(() => {
  initParticles();
  setupVideoObserver();
  // 等入场动画完成后（2.5s title 动画，+ 按钮浮动延迟 0.4s）再启用交互，
  // 缩短到 2.2 秒（从 3.2s），让用户更快可以点击
  nextTick(() => {
    readyTimer = setTimeout(() => { interactiveReady.value = true; }, 2200);
  });
});

onUnmounted(() => {
  if (readyTimer) clearTimeout(readyTimer);
  if (mouseRafId) cancelAnimationFrame(mouseRafId);
  if (particleRaf) cancelAnimationFrame(particleRaf);
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  if (videoObserver) videoObserver.disconnect();
  if (bgVideo.value) {
    try { bgVideo.value.pause(); bgVideo.value.removeAttribute('src'); bgVideo.value.load(); } catch (e) {}
  }
});
</script>

<style scoped>
.phase-landing {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1a0a2e 0%, #2d1040 30%, #1a0a2e 60%, #0d0520 100%);
  color: #fff;
  cursor: default;
}

.cg-vignette::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 50;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(10,2,20,0.5) 80%, rgba(5,1,12,0.85) 100%);
}

.distant-nebula {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.nebula-image {
  position: absolute;
  inset: -10%;
  background-position: center;
  background-size: cover;
  opacity: 0.35;
  filter: blur(10px) brightness(0.45) saturate(1.3) hue-rotate(-15deg);
  animation: nebula-drift 30s ease-in-out infinite;
}

.nebula-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 65% 55% at 50% 55%, transparent 0%, rgba(26,10,46,0.3) 40%, rgba(26,10,46,0.85) 75%),
    linear-gradient(180deg, rgba(26,10,46,0.5) 0%, transparent 25%, transparent 50%, rgba(26,10,46,0.5) 100%);
}

.css-bokeh {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.bokeh {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  animation: bokeh-float 20s ease-in-out infinite;
}

.bokeh.b1 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, rgba(255,183,208,0.15), transparent 70%);
  top: 10%; left: 15%;
  animation-delay: 0s;
}

.bokeh.b2 {
  width: 250px; height: 250px;
  background: radial-gradient(circle, rgba(201,177,255,0.12), transparent 70%);
  top: 50%; right: 10%;
  animation-delay: -5s;
}

.bokeh.b3 {
  width: 200px; height: 200px;
  background: radial-gradient(circle, rgba(184,224,255,0.1), transparent 70%);
  bottom: 20%; left: 25%;
  animation-delay: -10s;
}

.bokeh.b4 {
  width: 180px; height: 180px;
  background: radial-gradient(circle, rgba(255,158,196,0.12), transparent 70%);
  top: 30%; right: 30%;
  animation-delay: -3s;
}

.bokeh.b5 {
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(255,215,0,0.06), transparent 70%);
  bottom: 10%; right: 20%;
  animation-delay: -8s;
}

.bokeh.b6 {
  width: 160px; height: 160px;
  background: radial-gradient(circle, rgba(255,240,245,0.08), transparent 70%);
  top: 60%; left: 5%;
  animation-delay: -15s;
}

@keyframes bokeh-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
  33% { transform: translate(20px, -15px) scale(1.1); opacity: 0.9; }
  66% { transform: translate(-15px, 20px) scale(0.95); opacity: 0.7; }
}

.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.gate-video-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  width: min(340px, 52vw);
  height: min(460px, 70vh);
  transform: translate(-50%, -45%);
  z-index: 3;
  border-radius: 50% 50% 10px 10px / 60% 60% 5px 5px;
  overflow: hidden;
  opacity: 0;
  animation: gate-fade-in 1.2s ease-out 0.3s forwards;
}

.gate-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.5s ease;
  filter: saturate(1.2) brightness(0.55);
}

.gate-video.is-loaded {
  opacity: 0.75;
}

.gate-video-mask {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at center, transparent 35%, rgba(26,10,46,0.5) 70%, rgba(26,10,46,0.95) 100%);
  pointer-events: none;
}

.entrance-glow {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 150vmax;
  height: 150vmax;
  transform: translate(-50%, -50%) scale(0);
  background:
    radial-gradient(circle, rgba(255,240,245,0.5) 0%, rgba(255,183,208,0.35) 15%, rgba(201,177,255,0.2) 30%, rgba(184,224,255,0.1) 45%, transparent 65%);
  opacity: 0;
  pointer-events: none;
  z-index: 3;
  animation: entrance-burst 1.4s ease-out forwards;
}

.gate-scene {
  position: relative;
  z-index: 10;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.gate-arch {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -45%);
  width: min(400px, 62vw);
  height: min(560px, 82vh);
  pointer-events: none;
  opacity: 0;
  animation: gate-fade-in 1.5s ease-out 0.2s forwards;
}

.arch-frame {
  position: absolute;
  inset: 0;
  z-index: 5;
}

.arch-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 18px rgba(255,158,196,0.5)) drop-shadow(0 0 35px rgba(201,177,255,0.3));
}

.arch-path {
  stroke-dasharray: 1700;
  stroke-dashoffset: 1700;
  animation: arch-draw 2.2s ease-out 0.5s forwards;
}

.arch-path.inner {
  stroke-dasharray: 1500;
  stroke-dashoffset: 1500;
  animation-delay: 0.8s;
}

.arch-ornament-top {
  opacity: 0;
  animation: fade-in 0.8s ease-out 1.8s forwards;
}

.arch-deco-dots circle,
.arch-deco-dots path {
  opacity: 0;
  animation: fade-in 0.6s ease-out forwards;
}

.arch-deco-dots circle:nth-child(odd) { animation-delay: 1.2s; }
.arch-deco-dots circle:nth-child(even) { animation-delay: 1.4s; }
.arch-deco-dots path:nth-child(odd) { animation-delay: 1.5s; }
.arch-deco-dots path:nth-child(even) { animation-delay: 1.6s; }

.gate-inner {
  position: absolute;
  left: 50%;
  top: 15%;
  transform: translateX(-50%);
  width: 78%;
  height: 72%;
  border-radius: 50% 50% 5% 5% / 42% 42% 2% 2%;
  overflow: hidden;
  z-index: 3;
}

.gate-caustic {
  position: absolute;
  inset: -20%;
  background-position: center;
  background-size: cover;
  opacity: 0.2;
  mix-blend-mode: screen;
  animation: caustic-shift 8s ease-in-out infinite;
}

.gate-energy-ring {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  border-width: 1px;
  border-style: solid;
  animation: ring-expand 4s ease-out infinite;
}

.gate-energy-ring.ring-pink {
  border-color: rgba(255,158,196,0.35);
  animation-delay: 0s;
}

.gate-energy-ring.ring-lavender {
  border-color: rgba(201,177,255,0.3);
  animation-delay: 1s;
}

.gate-energy-ring.ring-sky {
  border-color: rgba(184,224,255,0.25);
  animation-delay: 2s;
}

.gate-energy-ring.ring-gold {
  border-color: rgba(255,215,0,0.2);
  animation-delay: 3s;
  inset: 12%;
}

.gate-crystal-wrap {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: min(110px, 18vw);
  height: min(110px, 18vw);
  z-index: 6;
}

.gate-crystal {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  border: 2px solid rgba(255,183,208,0.6);
  box-shadow:
    0 0 30px rgba(255,158,196,0.6),
    0 0 60px rgba(201,177,255,0.4),
    0 0 90px rgba(184,224,255,0.2),
    0 0 120px rgba(255,215,0,0.1),
    inset 0 0 25px rgba(255,240,245,0.15);
  animation: crystal-breathe 3s ease-in-out infinite, crystal-spin 20s linear infinite;
}

.crystal-glow {
  position: absolute;
  inset: -50%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,158,196,0.3) 0%, rgba(201,177,255,0.2) 35%, rgba(184,224,255,0.1) 55%, transparent 75%);
  filter: blur(30px);
  animation: crystal-glow-pulse 3s ease-in-out infinite;
}

.crystal-rays {
  position: absolute;
  inset: -70%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg, rgba(255,183,208,0.12) 4deg, transparent 12deg,
    transparent 45deg, rgba(201,177,255,0.1) 49deg, transparent 57deg,
    transparent 90deg, rgba(255,240,245,0.12) 94deg, transparent 102deg,
    transparent 135deg, rgba(184,224,255,0.08) 139deg, transparent 147deg,
    transparent 180deg, rgba(255,215,0,0.08) 184deg, transparent 192deg,
    transparent 225deg, rgba(255,158,196,0.1) 229deg, transparent 237deg,
    transparent 270deg, rgba(255,240,245,0.08) 274deg, transparent 282deg,
    transparent 315deg, rgba(201,177,255,0.08) 319deg, transparent 327deg
  );
  animation: rays-rotate 15s linear infinite;
  opacity: 0.8;
}

.crystal-shimmer {
  position: absolute;
  inset: -20%;
  border-radius: 50%;
  background: conic-gradient(
    from var(--shimmer-angle, 0deg),
    transparent 0deg,
    rgba(255,255,255,0.15) 10deg,
    rgba(255,183,208,0.1) 20deg,
    transparent 40deg,
    transparent 120deg,
    rgba(201,177,255,0.1) 130deg,
    rgba(255,255,255,0.12) 140deg,
    transparent 160deg,
    transparent 240deg,
    rgba(184,224,255,0.08) 250deg,
    rgba(255,215,0,0.1) 260deg,
    transparent 280deg
  );
  animation: shimmer-rotate 4s linear infinite;
  mix-blend-mode: screen;
  opacity: 0.7;
}

@keyframes shimmer-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.gate-title-area {
  position: absolute;
  top: 6%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
  z-index: 12;
}

.title-ornament {
  width: 120px;
  height: 16px;
  margin: 0 auto 6px;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
  opacity: 0;
  filter: drop-shadow(0 0 10px rgba(255,158,196,0.6));
  animation: fade-in-down 0.8s ease-out 0.3s forwards;
}

.brand-en {
  font-size: 11px;
  letter-spacing: 6px;
  color: rgba(255,183,208,0.6);
  opacity: 0;
  animation: fade-in-down 0.8s ease-out 0.4s forwards;
}

.brand-title {
  font-size: clamp(36px, 7vw, 64px);
  font-weight: 900;
  letter-spacing: clamp(6px, 1.5vw, 14px);
  margin: 2px 0;
  color: #fff;
  text-shadow:
    0 0 30px rgba(255,158,196,0.6),
    0 0 60px rgba(201,177,255,0.3),
    0 0 100px rgba(255,183,208,0.15);
  background: linear-gradient(180deg, #fff 0%, #ffe8f2 40%, #ffc0dc 70%, #c9b1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-char {
  display: inline-block;
  position: relative;
  opacity: 0;
  transform: translateY(20px) scale(0.8);
  animation: char-appear 0.6s cubic-bezier(0.4,0,0.2,1) forwards;
}

.char-sparkle {
  position: absolute;
  top: -8px;
  right: -10px;
  font-size: 10px;
  color: #ffd700;
  text-shadow: 0 0 6px rgba(255,215,0,0.8), 0 0 12px rgba(255,183,208,0.4);
  opacity: 0;
  animation: char-sparkle-anim 2s ease-in-out infinite;
  -webkit-text-fill-color: #ffd700;
}

@keyframes char-sparkle-anim {
  0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
  50% { opacity: 1; transform: scale(1) rotate(180deg); }
}

.title-line {
  width: 180px;
  height: 1px;
  margin: 6px auto;
  background: linear-gradient(90deg, transparent, #ff9ec4, #ffb7d0, #c9b1ff, #b8e0ff, transparent);
  opacity: 0;
  filter: blur(0.3px);
  box-shadow: 0 0 12px rgba(255,158,196,0.5);
  animation: line-appear 1s ease-out 1.5s forwards;
}

.brand-sub {
  font-size: 13px;
  color: rgba(255,200,220,0.65);
  letter-spacing: 3px;
  margin: 0;
  opacity: 0;
  animation: fade-in-up 0.8s ease-out 1.7s forwards;
}

.guardians-left,
.guardians-right {
  position: absolute;
  top: 50%;
  transform: translateY(-45%);
  display: flex;
  flex-direction: column;
  gap: 14px;
  z-index: 11;
  pointer-events: auto;
  opacity: 0;
  animation: guardians-in 1s ease-out 0.6s forwards;
}

.guardians-left {
  left: max(4%, 20px);
  align-items: flex-end;
}

.guardians-right {
  right: max(4%, 20px);
  align-items: flex-start;
}

.guardian-col-node {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s ease;
  animation: col-float 4s ease-in-out infinite;
  animation-delay: var(--float-delay);
}

.guardian-col-node:hover {
  transform: translateX(calc(var(--side) * 6px)) scale(1.1);
}

.g-rune {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid rgba(255,183,208,0.25);
  opacity: 0.4;
  transition: all 0.3s ease;
}

.g-rune::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px solid rgba(201,177,255,0.2);
}

.g-rune.active {
  opacity: 1;
  border-color: rgba(255,158,196,0.7);
  box-shadow: 0 0 15px rgba(255,158,196,0.5);
  animation: rune-pulse 2s ease-in-out infinite;
}

.g-aura {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,158,196,0.45) 0%, rgba(201,177,255,0.2) 50%, transparent 70%);
  opacity: 0;
  filter: blur(10px);
  transition: opacity 0.3s ease;
}

.g-aura.active {
  opacity: 1;
  animation: aura-pulse 2s ease-in-out infinite;
}

.g-star-ring {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.g-star-ring::before,
.g-star-ring::after {
  content: '✦ ✧ ✦ ✧ ✦ ✧';
  position: absolute;
  font-size: 7px;
  color: #ffd700;
  text-shadow: 0 0 6px rgba(255,215,0,0.7), 0 0 12px rgba(255,158,196,0.4);
  white-space: nowrap;
  letter-spacing: 8px;
  top: 50%;
  left: 50%;
  transform-origin: center;
}

.g-star-ring::before {
  transform: translate(-50%, -50%);
  animation: star-ring-rotate 6s linear infinite;
}

.g-star-ring::after {
  content: '☆ ♡ ☆ ♡ ☆ ♡';
  color: #ff9ec4;
  font-size: 6px;
  transform: translate(-50%, -50%) rotate(15deg);
  animation: star-ring-rotate 8s linear infinite reverse;
}

.g-star-ring.active {
  opacity: 1;
}

@keyframes star-ring-rotate {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

.g-hover-sparkles {
  position: absolute;
  inset: -20px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.g-hover-sparkles .hs {
  position: absolute;
  font-size: 10px;
  opacity: 0;
}

.g-hover-sparkles .hs.s1 { top: -8px; left: 50%; color: #ff9ec4; }
.g-hover-sparkles .hs.s2 { top: 50%; right: -10px; color: #c9b1ff; }
.g-hover-sparkles .hs.s3 { bottom: -8px; left: 50%; color: #ffd700; }
.g-hover-sparkles .hs.s4 { top: 50%; left: -10px; color: #b8e0ff; }

.g-hover-sparkles.active {
  opacity: 1;
}

.g-hover-sparkles.active .hs {
  animation: hs-float 2s ease-in-out infinite;
}

.g-hover-sparkles.active .hs.s1 { animation-delay: 0s; }
.g-hover-sparkles.active .hs.s2 { animation-delay: 0.3s; }
.g-hover-sparkles.active .hs.s3 { animation-delay: 0.6s; }
.g-hover-sparkles.active .hs.s4 { animation-delay: 0.9s; }

@keyframes hs-float {
  0%, 100% { opacity: 0; transform: translateY(0) scale(0.5); }
  50% { opacity: 1; transform: translateY(-6px) scale(1); }
}

.g-portal {
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid rgba(255,183,208,0.45);
  box-shadow:
    0 0 20px rgba(255,158,196,0.35),
    0 0 40px rgba(201,177,255,0.15),
    inset 0 0 10px rgba(0,0,0,0.4);
}

.g-portal img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.15);
}

.g-name {
  position: absolute;
  top: calc(100% + 14px);
  font-size: 10px;
  color: rgba(255,180,210,0.85);
  white-space: nowrap;
  text-shadow: 0 0 10px rgba(255,105,180,0.6), 0 0 20px rgba(255,158,196,0.3);
  opacity: 0;
  transition: opacity 0.3s ease;
  letter-spacing: 1px;
}

.guardian-col-node:hover .g-name {
  opacity: 1;
}

.enter-btn {
  position: absolute;
  left: 50%;
  bottom: 9%;
  transform: translateX(-50%);
  pointer-events: auto;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0;
  animation: fade-in-up 0.8s ease-out 2s forwards;
  z-index: 15;
  /* 明确尺寸 + will-change，减少布局抖动，避免 "Could not compute box model" */
  width: 260px;
  min-height: 80px;
  will-change: transform, opacity;
  contain: layout style paint;
}

/* 按钮未就绪时降低透明度，提示不可点击 */
.enter-btn:not(.ready) {
  filter: grayscale(0.4);
}
.enter-btn:not(.ready):not(:disabled) {
  pointer-events: none;
}
.enter-btn:disabled {
  cursor: wait;
}
.enter-btn.ready .enter-text {
  animation: ready-pulse 2s ease-in-out infinite;
}
@keyframes ready-pulse {
  0%, 100% { filter: drop-shadow(0 0 8px rgba(255, 180, 210, 0.6)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 200, 230, 1)); }
}

.enter-core {
  position: relative;
  display: block;
  padding: 16px 56px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255,158,196,0.25), rgba(201,177,255,0.25), rgba(184,224,255,0.15));
  border: 1.5px solid rgba(255,183,208,0.55);
  box-shadow:
    0 0 25px rgba(255,158,196,0.35),
    0 0 50px rgba(201,177,255,0.2),
    0 0 75px rgba(255,215,0,0.1),
    inset 0 0 20px rgba(255,240,245,0.08);
  overflow: hidden;
  transition: all 0.3s ease;
}

.enter-btn:hover .enter-core:not(:disabled) {
  transform: translateY(-2px) scale(1.04);
  background: linear-gradient(135deg, rgba(255,158,196,0.4), rgba(201,177,255,0.35), rgba(255,215,0,0.15));
  border-color: rgba(255,183,208,0.8);
  box-shadow:
    0 0 40px rgba(255,158,196,0.55),
    0 0 70px rgba(201,177,255,0.35),
    0 0 100px rgba(255,215,0,0.2),
    inset 0 0 25px rgba(255,240,245,0.15);
}

.enter-btn:disabled .enter-core { opacity: 0.7; cursor: wait; }

.enter-text {
  position: relative;
  z-index: 2;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 4px;
  text-shadow: 0 0 15px rgba(255,158,196,0.8), 0 0 30px rgba(201,177,255,0.4);
}

.enter-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 20%, rgba(255,240,245,0.3) 50%, transparent 80%);
  transform: translateX(-100%);
  animation: shine 3s ease-in-out infinite;
}

.enter-sparkles i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  box-shadow: 0 0 8px #ff9ec4, 0 0 16px rgba(201,177,255,0.5);
}

.enter-btn:hover .enter-sparkles i {
  animation: sparkle-burst 1.2s ease-out infinite;
  animation-delay: calc(var(--i) * 0.08s);
}

.enter-sparkles-constant {
  position: absolute;
  inset: -20px;
  pointer-events: none;
}

.enter-sparkles-constant i {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #fff0f5;
  opacity: 0;
  box-shadow: 0 0 6px #ffb7d0, 0 0 12px #c9b1ff;
  animation: sparkle-constant 3s ease-in-out infinite;
  animation-delay: calc(var(--ci) * 0.4s);
}

@keyframes sparkle-constant {
  0% { opacity: 0; transform: translate(-50%,-50%) rotate(calc(var(--ci)*45deg)) translateX(20px) scale(0); }
  30% { opacity: 1; transform: translate(-50%,-50%) rotate(calc(var(--ci)*45deg)) translateX(40px) scale(1); }
  70% { opacity: 0.6; }
  100% { opacity: 0; transform: translate(-50%,-50%) rotate(calc(var(--ci)*45deg)) translateX(60px) scale(0.3); }
}

.enter-btn.transitioning .enter-core {
  animation: btn-warp 0.9s ease-out forwards;
}

.corner-hud {
  position: absolute;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  letter-spacing: 1.5px;
  color: rgba(255,183,208,0.55);
  opacity: 0;
  animation: fade-in 1s ease-out 2.3s forwards;
}

.hud-emoji {
  font-size: 10px;
  color: rgba(255,158,196,0.7);
  text-shadow: 0 0 6px rgba(255,158,196,0.5);
}

.corner-hud.top-left { top: 4%; left: 4%; }
.corner-hud.top-right { top: 4%; right: 4%; flex-direction: row-reverse; }
.corner-hud.bottom-left { bottom: 4%; left: 4%; align-items: flex-end; }
.corner-hud.bottom-right { bottom: 4%; right: 4%; flex-direction: row-reverse; align-items: flex-end; }

.hud-line {
  width: 36px;
  height: 1.5px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(255,158,196,0.6), rgba(201,177,255,0.3), transparent);
}

.corner-hud.top-right .hud-line { background: linear-gradient(270deg, rgba(255,158,196,0.6), rgba(201,177,255,0.3), transparent); }
.corner-hud.bottom-right .hud-line { background: linear-gradient(270deg, rgba(255,158,196,0.6), rgba(201,177,255,0.3), transparent); }

.hud-line.v {
  width: 1.5px;
  height: 28px;
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(255,158,196,0.6), rgba(201,177,255,0.3), transparent);
}

.corner-hud.bottom-right .hud-line.v { background: linear-gradient(0deg, rgba(255,158,196,0.6), rgba(201,177,255,0.3), transparent); }
.corner-hud.bottom-left .hud-line.v { background: linear-gradient(180deg, rgba(255,158,196,0.6), rgba(201,177,255,0.3), transparent); }

@keyframes nebula-drift {
  0%, 100% { transform: scale(1) translate(0,0); }
  50% { transform: scale(1.08) translate(-2%, 1%); }
}

@keyframes entrance-burst {
  0% { opacity: 0; transform: translate(-50%,-50%) scale(0); }
  35% { opacity: 0.9; }
  100% { opacity: 0; transform: translate(-50%,-50%) scale(1.8); }
}

@keyframes gate-fade-in {
  from { opacity: 0; transform: translate(-50%,-45%) scale(0.85); }
  to { opacity: 1; transform: translate(-50%,-45%) scale(1); }
}

@keyframes arch-draw { to { stroke-dashoffset: 0; } }

@keyframes caustic-shift {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.18; }
  50% { transform: scale(1.08) rotate(4deg); opacity: 0.3; }
}

@keyframes ring-expand {
  0% { transform: scale(0.8); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

@keyframes crystal-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}

@keyframes crystal-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes crystal-glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(0.95); }
  50% { opacity: 0.85; transform: scale(1.18); }
}

@keyframes rays-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes fade-in-up { from { opacity: 0; transform: translateY(20px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
@keyframes fade-in-down { from { opacity: 0; transform: translateY(-15px); } to { opacity: 1; transform: translateY(0); } }

@keyframes char-appear {
  from { opacity: 0; transform: translateY(20px) scale(0.8); filter: blur(8px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

@keyframes line-appear {
  from { opacity: 0; transform: scaleX(0); }
  to { opacity: 0.8; transform: scaleX(1); }
}

@keyframes guardians-in {
  from { opacity: 0; transform: translateY(-45%) translateX(calc(var(--side,1)*-20px)); }
  to { opacity: 1; transform: translateY(-45%) translateX(0); }
}

.guardians-left { --side: 1; }
.guardians-right { --side: -1; }

@keyframes col-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes rune-pulse {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.15); }
}

@keyframes aura-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.75; }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  40%, 100% { transform: translateX(100%); }
}

@keyframes sparkle-burst {
  0% { opacity: 1; transform: translate(-50%,-50%) rotate(calc(var(--i)*30deg)) translateX(0); }
  100% { opacity: 0; transform: translate(-50%,-50%) rotate(calc(var(--i)*30deg)) translateX(55px); }
}

@keyframes btn-warp {
  0% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.15); filter: brightness(1.6); box-shadow: 0 0 80px rgba(255,183,208,0.8), 0 0 120px rgba(201,177,255,0.5); }
  100% { transform: scale(3); opacity: 0; filter: brightness(2.5); }
}

@media (max-width: 768px) {
  .guardians-left { left: 8px; gap: 10px; }
  .guardians-right { right: 8px; gap: 10px; }
  .g-portal { width: 38px; height: 38px; }
  .g-rune { width: 30px; height: 30px; top: calc(100% + 4px); }
  .g-name { font-size: 8px; top: calc(100% + 10px); }
  .g-star-ring { inset: -10px; }
  .gate-arch { width: min(320px, 80vw); height: min(480px, 75vh); }
  .gate-crystal-wrap { width: min(80px, 20vw); height: min(80px, 20vw); }
  .enter-core { padding: 12px 40px; border-radius: 24px; }
  .enter-text { font-size: 13px; letter-spacing: 2px; }
  /* 移动端隐藏装饰性 HUD，减少 DOM 占用 */
  .corner-hud { display: none; }
  .brand-sub { font-size: 11px; letter-spacing: 2px; }
  .char-sparkle { font-size: 8px; top: -6px; right: -8px; }
}
</style>
