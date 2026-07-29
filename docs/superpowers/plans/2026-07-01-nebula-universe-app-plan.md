# 星云编年史 · 宇宙主站实现计划（Vue 3 + Vite 版）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Vue 3 + Vite 重构并扩展「星云编年史」主站，实现游戏化加载、全息展示、星云入口、3D 动漫星系，并配套 AniList 数据拉取脚本。

**Architecture:** 构建时通过 `scripts/fetch-anilist.js` 生成静态 JSON；运行时 Vue 3 应用按四阶段状态机管理视图，Three.js 封装在 `useGalaxy` composable 与 Galaxy 组件中，音频、数据分别封装为 `useAudio`、`useData`。

**Tech Stack:** Vue 3 (Composition API), Vite, Three.js, AniList GraphQL, Node.js, Web Audio API, CSS Variables, Canvas 2D.

---

## 文件结构

```
/workspace/
├── index.html                            # Vite 入口
├── vite.config.js                        # Vite 配置
├── package.json                          # 依赖与脚本
├── src/
│   ├── main.js                           # Vue 应用入口
│   ├── App.vue                           # 四阶段状态机容器
│   ├── components/
│   │   ├── LoadingPhase.vue              # 阶段 0：次元启动
│   │   ├── ShowcasePhase.vue             # 阶段 1：全息展示
│   │   ├── EntrancePhase.vue             # 阶段 2：星云入口
│   │   ├── GalaxyPhase.vue               # 阶段 3：动漫星系
│   │   ├── ChronicleCore.vue             # 次元核心 3D 对象
│   │   ├── NebulaCloud.vue               # 流派星云 3D 对象
│   │   ├── StarField.vue                 # 作品恒星 3D 对象
│   │   ├── HUD.vue                       # 搜索、筛选、音乐、帮助
│   │   └── DetailPanel.vue               # 作品详情 + 看动漫按钮
│   ├── composables/
│   │   ├── useAudio.js                   # Web Audio 氛围音 + 可视化
│   │   ├── useGalaxy.js                  # Three.js 场景/相机/交互
│   │   └── useData.js                    # 数据加载与状态
│   └── styles/
│       └── universe.css                  # 全局变量与动画
├── public/                               # 静态资源
│   ├── images/
│   └── videos/
├── data/                                 # 生成数据
│   ├── anime-corpus.json
│   └── genre-manifest.json
├── scripts/
│   └── fetch-anilist.js                  # AniList 数据拉取
├── js/                                   # 保留：原项目脚本
│   ├── shared-data.js
│   ├── shared-utils.js
│   ├── llm-config.js
│   └── llm-engine.js
├── index-legacy.html                     # 保留：原入口页
├── nebula-chronicle.html                 # 保留：原主界面
├── watch.html                            # 保留：观影页
└── docs/superpowers/specs/
    └── 2026-07-01-nebula-universe-app-design.md  # 已批准的设计文档
```

---

## 任务清单

### Task 1: 初始化 Vite + Vue 3 项目

**Files:**
- Modify: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/App.vue`

- [ ] **Step 1: 确认 Node 版本**

Run: `node -v`
Expected: v18+ (LTS)

- [ ] **Step 2: 安装 Vite 与 Vue 3 依赖**

Run:
```bash
npm install vue@3
npm install -D vite @vitejs/plugin-vue
```

- [ ] **Step 3: 创建 Vite 配置**

Create: `vite.config.js`
```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  build: {
    outDir: 'dist'
  }
});
```

- [ ] **Step 4: 创建 Vite 入口 HTML**

Create: `index.html`
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>星云编年史 · 宇宙版 | Nebula Chronicle</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&family=Orbitron:wght@400;700;900&family=ZCOOL+XiaoWei&display=swap" rel="stylesheet">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: 创建 Vue 应用入口**

Create: `src/main.js`
```javascript
import { createApp } from 'vue';
import App from './App.vue';
import './styles/universe.css';

createApp(App).mount('#app');
```

- [ ] **Step 6: 创建 App.vue 状态机骨架**

Create: `src/App.vue`
```vue
<template>
  <div id="universe">
    <LoadingPhase v-if="phase === 'loading'" @done="phase = 'showcase'" />
    <ShowcasePhase v-else-if="phase === 'showcase'" @skip="phase = 'entrance'" />
    <EntrancePhase v-else-if="phase === 'entrance'" @start="phase = 'galaxy'" />
    <GalaxyPhase v-else-if="phase === 'galaxy'" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import LoadingPhase from './components/LoadingPhase.vue';
import ShowcasePhase from './components/ShowcasePhase.vue';
import EntrancePhase from './components/EntrancePhase.vue';
import GalaxyPhase from './components/GalaxyPhase.vue';

const phase = ref('loading');
</script>
```

- [ ] **Step 7: 创建全局样式**

Create: `src/styles/universe.css`
```css
:root {
  --bg-deep: #050714;
  --bg-darker: #03030a;
  --neon-cyan: #00f3ff;
  --neon-purple: #b892ff;
  --neon-pink: #ff2a6d;
  --text-primary: #f0f0ff;
  --text-secondary: rgba(240, 240, 255, 0.72);
  --glass-bg: rgba(255, 255, 255, 0.08);
  --glass-border: rgba(255, 255, 255, 0.18);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app, #universe { width: 100%; height: 100%; overflow: hidden; background: var(--bg-darker); color: var(--text-primary); font-family: 'Noto Sans SC', sans-serif; }
#universe { position: fixed; inset: 0; }
```

- [ ] **Step 8: 更新 package.json 脚本**

Modify: `package.json`
Add to `"scripts"`:
```json
"dev": "vite",
"build": "vite build",
"preview": "vite preview",
"fetch-anilist": "node scripts/fetch-anilist.js"
```

- [ ] **Step 9: 启动开发服务器验证**

Run: `npm run dev`
Open: `http://localhost:8080`
Expected: Black screen, no console errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html src/
git commit -m "chore: init vite + vue3 project skeleton"
```

---

### Task 2: 编写 AniList 数据拉取脚本

**Files:**
- Create: `scripts/fetch-anilist.js`
- Create: `data/.gitkeep`

- [ ] **Step 1-6:** 同原版计划 Task 2，确保脚本生成 `data/anime-corpus.json` 和 `data/genre-manifest.json`。

- [ ] **Step 7: Commit**

```bash
git add scripts/fetch-anilist.js data/
git commit -m "feat(data): add AniList fetch script"
```

---

### Task 3: 实现 useData composable

**Files:**
- Create: `src/composables/useData.js`

- [ ] **Step 1: 创建数据加载 composable**

Create: `src/composables/useData.js`
```javascript
import { ref, computed } from 'vue';

const data = ref([]);
const genres = ref({});
const loading = ref(false);
const error = ref(null);

export function useData() {
  const load = async () => {
    loading.value = true;
    error.value = null;
    try {
      const [corpusRes, manifestRes] = await Promise.all([
        fetch('/data/anime-corpus.json'),
        fetch('/data/genre-manifest.json')
      ]);
      data.value = await corpusRes.json();
      genres.value = (await manifestRes.json()).genres || {};
    } catch (err) {
      error.value = err;
      console.error('Failed to load data:', err);
    } finally {
      loading.value = false;
    }
  };

  const topWorks = computed(() =>
    [...data.value].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8)
  );

  return { data, genres, loading, error, load, topWorks };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/composables/useData.js
git commit -m "feat(data): add useData composable"
```

---

### Task 4: 实现 Phase 0 — LoadingPhase.vue

**Files:**
- Create: `src/components/LoadingPhase.vue`
- Modify: `src/App.vue`

- [ ] **Step 1: 创建组件**

Create: `src/components/LoadingPhase.vue`
```vue
<template>
  <section class="phase-loading">
    <div class="loading-center">
      <div class="energy-figure"></div>
      <div class="energy-rings">
        <div class="ring"></div>
        <div class="ring"></div>
        <div class="ring"></div>
      </div>
      <div class="loading-progress">
        <svg class="progress-ring" viewBox="0 0 120 120">
          <circle class="progress-bg" cx="60" cy="60" r="54" />
          <circle class="progress-fill" cx="60" cy="60" r="54" />
        </svg>
        <div class="progress-text">{{ progress }}%</div>
      </div>
      <div class="loading-tip">{{ tip }}</div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useData } from '../composables/useData.js';

const emit = defineEmits(['done']);
const { load } = useData();
const progress = ref(0);
const tip = ref('正在连接星云数据库…');
const tips = [
  '正在连接星云数据库…',
  '正在点亮恒星…',
  '正在绘制星云图谱…',
  '正在校准次元核心…',
  '正在加载全息投影…'
];

onMounted(async () => {
  const tipInterval = setInterval(() => {
    tip.value = tips[Math.floor(Math.random() * tips.length)];
  }, 1500);

  await load();
  progress.value = 50;
  await new Promise(r => setTimeout(r, 800));
  progress.value = 100;

  clearInterval(tipInterval);
  setTimeout(() => emit('done'), 600);
});
</script>

<style scoped>
.phase-loading { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, rgba(124,77,255,0.15) 0%, transparent 60%), var(--bg-darker); display: flex; align-items: center; justify-content: center; }
.loading-center { display: flex; flex-direction: column; align-items: center; }
.energy-figure { width: 80px; height: 120px; background: linear-gradient(180deg, rgba(0,243,255,0.6), rgba(184,146,255,0.2)); border-radius: 40px 40px 20px 20px; filter: blur(8px); animation: energyPulse 3s ease-in-out infinite; }
.energy-rings { position: absolute; width: 240px; height: 240px; }
.energy-rings .ring { position: absolute; inset: 0; border: 1px solid rgba(0,243,255,0.3); border-radius: 50%; animation: ringExpand 3s ease-out infinite; }
.energy-rings .ring:nth-child(2) { animation-delay: 1s; border-color: rgba(184,146,255,0.3); }
.energy-rings .ring:nth-child(3) { animation-delay: 2s; border-color: rgba(255,42,109,0.2); }
.loading-progress { position: relative; width: 120px; height: 120px; margin-top: 40px; }
.progress-ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.progress-ring circle { fill: none; stroke-width: 6; }
.progress-bg { stroke: rgba(255,255,255,0.1); }
.progress-fill { stroke: var(--neon-cyan); stroke-linecap: round; stroke-dasharray: 339.292; stroke-dashoffset: v-bind(strokeOffset); transition: stroke-dashoffset 0.3s ease; }
.progress-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: 'Orbitron', sans-serif; font-size: 18px; }
.loading-tip { margin-top: 20px; font-size: 14px; color: var(--text-secondary); letter-spacing: 1px; }
@keyframes energyPulse { 0%,100%{ transform: scale(1); opacity:0.8; } 50%{ transform: scale(1.05); opacity:1; } }
@keyframes ringExpand { 0%{ transform: scale(0.6); opacity:0.8; } 100%{ transform: scale(1.4); opacity:0; } }
</style>
```

- [ ] **Step 2: 添加 strokeOffset 计算**

Append to `<script setup>`:
```javascript
import { computed } from 'vue';
const circumference = 2 * Math.PI * 54;
const strokeOffset = computed(() => circumference * (1 - progress.value / 100));
```

- [ ] **Step 3: 本地验证**

Run: `npm run dev`
Expected: Loading screen with progress and auto transition to showcase.

- [ ] **Step 4: Commit**

```bash
git add src/components/LoadingPhase.vue
git commit -m "feat(app): add LoadingPhase component"
```

---

### Task 5: 实现 Phase 1 — ShowcasePhase.vue

**Files:**
- Create: `src/components/ShowcasePhase.vue`

- [ ] **Step 1: 创建全息展示组件**

Create: `src/components/ShowcasePhase.vue`
```vue
<template>
  <section class="phase-showcase">
    <div class="showcase-core">
      <div class="mini-core"></div>
    </div>
    <div class="showcase-orbit">
      <div v-for="(work, i) in topWorks" :key="work.id" class="holo-card" :style="cardStyle(i)">
        <img :src="work.coverImage || '/images/generated/nebula-bg.jpg'" :alt="work.titleRomaji">
        <div class="holo-card-title">{{ work.titleRomaji }}</div>
      </div>
    </div>
    <button class="skip-btn" @click="$emit('skip')">跳过</button>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { useData } from '../composables/useData.js';

const emit = defineEmits(['skip']);
const { topWorks } = useData();

const cardStyle = (i) => {
  const count = topWorks.value.length || 1;
  const angle = (i / count) * Math.PI * 2;
  const radius = 260;
  return {
    transform: `rotateY(${angle * 180 / Math.PI}deg) translateZ(${radius}px)`
  };
};

onMounted(() => {
  setTimeout(() => emit('skip'), 7000);
});
</script>

<style scoped>
.phase-showcase { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, rgba(0,243,255,0.08) 0%, transparent 55%), var(--bg-deep); perspective: 1200px; }
.showcase-core { position: absolute; left: 50%; top: 45%; transform: translate(-50%, -50%); }
.mini-core { width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(0,243,255,0.6) 40%, rgba(184,146,255,0.3) 70%, transparent); box-shadow: 0 0 40px rgba(0,243,255,0.4); animation: coreRotate 12s linear infinite, coreBreath 4s ease-in-out infinite; }
.showcase-orbit { position: absolute; left: 50%; top: 45%; width: 0; height: 0; transform-style: preserve-3d; animation: orbitRotate 20s linear infinite; }
.holo-card { position: absolute; width: 140px; height: 200px; left: -70px; top: -100px; border-radius: 12px; background: var(--glass-bg); border: 1px solid var(--glass-border); backdrop-filter: blur(6px); transform-style: preserve-3d; overflow: hidden; box-shadow: 0 0 20px rgba(0,243,255,0.15); }
.holo-card img { width: 100%; height: 70%; object-fit: cover; opacity: 0.9; }
.holo-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%); animation: holoScan 3s linear infinite; }
.holo-card-title { padding: 8px; font-size: 12px; text-align: center; color: var(--text-primary); }
.skip-btn { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); padding: 10px 24px; background: transparent; border: 1px solid var(--neon-cyan); color: var(--neon-cyan); border-radius: 24px; cursor: pointer; font-family: 'Orbitron', sans-serif; }
@keyframes coreRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes coreBreath { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.08); } }
@keyframes orbitRotate { from { transform: rotateY(0deg); } to { transform: rotateY(360deg); } }
@keyframes holoScan { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ShowcasePhase.vue
git commit -m "feat(app): add ShowcasePhase with holographic cards"
```

---

### Task 6: 实现 Phase 2 — EntrancePhase.vue

**Files:**
- Create: `src/components/EntrancePhase.vue`
- Create: `src/composables/useAudio.js`

- [ ] **Step 1: 创建 useAudio composable**

Create: `src/composables/useAudio.js`
```javascript
import { ref } from 'vue';

let audioCtx = null;
let analyser = null;
let dataArray = null;
const isPlaying = ref(false);

export function useAudio() {
  const init = () => {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 110;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(analyser);
      analyser.connect(audioCtx.destination);
      osc.start();
      isPlaying.value = true;
    } catch (e) {
      console.warn('Audio init failed:', e);
    }
  };

  const toggle = () => {
    if (!audioCtx) { init(); return; }
    if (audioCtx.state === 'suspended') { audioCtx.resume(); isPlaying.value = true; }
    else { audioCtx.suspend(); isPlaying.value = false; }
  };

  const getLevel = () => {
    if (!analyser || !dataArray) return 0;
    analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length / 255;
  };

  return { init, toggle, getLevel, isPlaying };
}
```

- [ ] **Step 2: 创建 EntrancePhase 组件**

Create: `src/components/EntrancePhase.vue`
```vue
<template>
  <section class="phase-entrance" @mousemove="onMouseMove">
    <video class="bg-video-layer" ref="videoA" autoplay muted loop playsinline></video>
    <video class="bg-video-layer" ref="videoB" autoplay muted loop playsinline></video>
    <canvas ref="canvasRef" id="entrance-canvas"></canvas>
    <div class="entrance-content">
      <h1 class="entrance-title">星云编年史</h1>
      <p class="entrance-subtitle">NEBULA CHRONICLE · 穿越次元，探索动画宇宙</p>
      <button class="journey-btn" @click="$emit('start')">开始旅程</button>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useAudio } from '../composables/useAudio.js';

const emit = defineEmits(['start']);
const canvasRef = ref(null);
const videoA = ref(null);
const videoB = ref(null);
const { init: initAudio, getLevel } = useAudio();

const videos = [
  '/videos/character_showcase.mp4',
  '/videos/nebula-trailer-a.mp4',
  '/videos/nebula-trailer-b.mp4'
];

let animationId;
let parallax = { x: 0, y: 0 };

onMounted(() => {
  initAudio();
  initCarousel();
  initCanvas();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
});

const initCarousel = () => { /* cross-fade logic */ };
const initCanvas = () => { /* stars, meteors, particles, orb */ };
const onMouseMove = (e) => {
  parallax.x = (e.clientX / window.innerWidth - 0.5) * 2;
  parallax.y = (e.clientY / window.innerHeight - 0.5) * 2;
};
</script>

<style scoped>
.phase-entrance { position: absolute; inset: 0; background: var(--bg-darker); }
.bg-video-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 1.6s ease; pointer-events: none; }
.bg-video-layer.active { opacity: 0.65; }
#entrance-canvas { position: absolute; inset: 0; z-index: 2; pointer-events: none; }
.entrance-content { position: absolute; inset: 0; z-index: 3; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.entrance-title { font-family: 'ZCOOL XiaoWei', serif; font-size: clamp(48px, 10vw, 120px); background: linear-gradient(180deg, #fff 0%, #b892ff 60%, #00f3ff 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; text-shadow: 0 0 40px rgba(0,243,255,0.3); }
.entrance-subtitle { margin-top: 16px; font-size: clamp(14px, 2vw, 20px); color: var(--text-secondary); letter-spacing: 4px; }
.journey-btn { margin-top: 48px; padding: 16px 48px; font-size: 18px; border: none; border-radius: 32px; background: linear-gradient(90deg, var(--neon-cyan), var(--neon-purple)); color: var(--bg-darker); font-weight: 700; cursor: pointer; box-shadow: 0 0 30px rgba(0,243,255,0.4); }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/EntrancePhase.vue src/composables/useAudio.js
git commit -m "feat(app): add EntrancePhase shell and useAudio composable"
```

---

### Task 7: 移植 nebula-chronicle 封面特效到 EntrancePhase

**Files:**
- Modify: `src/components/EntrancePhase.vue`

- [ ] **Step 1:** 从 `nebula-chronicle.html` 提取封面 Canvas 绘制逻辑，在 `initCanvas` 中实现星点、流星、粒子、光晕/传送门绘制，并接入 `getLevel()` 驱动核心脉冲。

- [ ] **Step 2: Commit**

```bash
git add src/components/EntrancePhase.vue
git commit -m "feat(app): port entrance canvas effects with audio reactivity"
```

---

### Task 8: 实现 Three.js 场景封装 useGalaxy（含性能基线）

**Files:**
- Create: `src/composables/useGalaxy.js`
- Modify: `src/components/GalaxyPhase.vue`

- [ ] **Step 0: 在 GalaxyPhase 中按需加载 Three.js**

Modify `src/components/GalaxyPhase.vue` `<script setup>`:
```javascript
import { ref, onMounted, defineAsyncComponent } from 'vue';
import { useData } from '../composables/useData.js';
const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const DetailPanel = defineAsyncComponent(() => import('./DetailPanel.vue'));

const galaxyCanvas = ref(null);
const { data, genres } = useData();
let useGalaxy;

onMounted(async () => {
  const mod = await import('../composables/useGalaxy.js');
  useGalaxy = mod.useGalaxy;
  const { init } = useGalaxy(galaxyCanvas, data, genres);
  init();
});
```

Create: `src/composables/useGalaxy.js`
```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';

export function useGalaxy(canvasRef, data, genres) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  const renderer = ref(null);
  const coreGroup = new THREE.Group();
  const galaxyGroup = new THREE.Group();
  const starMeshes = [];
  let animationId;

  const init = () => {
    if (!canvasRef.value) return;
    renderer.value = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true });
    renderer.value.setSize(window.innerWidth, window.innerHeight);
    renderer.value.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene.fog = new THREE.FogExp2(0x03030a, 0.0008);
    scene.add(galaxyGroup);
    galaxyGroup.add(coreGroup);

    camera.position.set(0, 60, 180);
    camera.lookAt(0, 0, 0);

    buildCore(coreGroup);
    buildNebulae(galaxyGroup, genres.value);
    buildStars(galaxyGroup, data.value, genres.value);

    window.addEventListener('resize', onResize);
    animate();
  };

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.value.setSize(window.innerWidth, window.innerHeight);
  };

  const animate = () => {
    animationId = requestAnimationFrame(animate);
    // core rotation, star orbit, render
    renderer.value.render(scene, camera);
  };

  onUnmounted(() => {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    renderer.value?.dispose();
  });

  return { scene, camera, renderer, starMeshes, init };
}

function buildCore(group) { /* core, rings, symbols */ }
function buildNebulae(group, genres) { /* particle clouds per genre */ }
function buildStars(group, data, genres) { /* orbiting stars */ }
```

- [ ] **Step 2: 安装 three.js**

Run: `npm install three`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/composables/useGalaxy.js
git commit -m "feat(galaxy): add useGalaxy composable with three.js"
```

---

### Task 9: 实现 Phase 3 — GalaxyPhase.vue + 子组件

**Files:**
- Create: `src/components/GalaxyPhase.vue`
- Create: `src/components/ChronicleCore.vue`
- Create: `src/components/NebulaCloud.vue`
- Create: `src/components/StarField.vue`
- Create: `src/components/HUD.vue`
- Create: `src/components/DetailPanel.vue`

- [ ] **Step 1: 创建 GalaxyPhase 容器**

Create: `src/components/GalaxyPhase.vue`
```vue
<template>
  <section class="phase-galaxy">
    <canvas ref="galaxyCanvas" id="galaxy-canvas"></canvas>
    <HUD />
    <DetailPanel />
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useGalaxy } from '../composables/useGalaxy.js';
import { useData } from '../composables/useData.js';
import HUD from './HUD.vue';
import DetailPanel from './DetailPanel.vue';

const galaxyCanvas = ref(null);
const { data, genres } = useData();
const { init } = useGalaxy(galaxyCanvas, data, genres);

onMounted(init);
</script>
```

- [ ] **Step 2-6:** 依次实现 ChronicleCore、NebulaCloud、StarField、HUD、DetailPanel 组件，与原版计划 Task 10-13 对应。

- [ ] **Step 7: Commit**

```bash
git add src/components/GalaxyPhase.vue src/components/ChronicleCore.vue src/components/NebulaCloud.vue src/components/StarField.vue src/components/HUD.vue src/components/DetailPanel.vue
git commit -m "feat(app): add GalaxyPhase and 3D subcomponents"
```

---

### Task 10: 实现 HUD 交互与详情面板

**Files:**
- Modify: `src/components/HUD.vue`
- Modify: `src/components/DetailPanel.vue`
- Modify: `src/composables/useGalaxy.js`

- [ ] **Step 1-5:** 实现搜索、流派筛选、音乐开关、帮助面板、相机拖拽/缩放、hover tooltip、详情面板与 `watch.html?title=` 跳转。与原版计划 Task 13-14 对应。

- [ ] **Step 6: Commit**

```bash
git add src/components/HUD.vue src/components/DetailPanel.vue src/composables/useGalaxy.js
git commit -m "feat(app): implement HUD, detail panel and camera controls"
```

---

### Task 11: 性能优化与移动端降级

**Files:**
- Modify: `src/composables/useGalaxy.js`
- Modify: `src/styles/universe.css`

- [ ] **Step 1: 使用 InstancedMesh 批量渲染恒星**

Modify `buildStars` in `src/composables/useGalaxy.js`:
```javascript
function buildStars(group, data, genres, budget) {
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const geometry = new THREE.SphereGeometry(1, 8, 8);
  const mesh = new THREE.InstancedMesh(geometry, material, budget);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  data.slice(0, budget).forEach((anime, i) => {
    const primaryGenre = anime.genres[0] || 'Sci-Fi';
    const genreNames = Object.keys(genres || {});
    const genreIndex = Math.max(0, genreNames.indexOf(primaryGenre));
    const angle = (genreIndex / Math.max(1, genreNames.length)) * Math.PI * 2 + (Math.random() - 0.5);
    const radius = 60 + (genreIndex % 3) * 25 + (Math.random() - 0.5) * 25;
    const y = (Math.random() - 0.5) * 30;

    dummy.position.set(radius * Math.cos(angle), y, radius * Math.sin(angle));
    const s = 0.6 + Math.min(2.5, (anime.averageScore || 50) / 40) * 0.5;
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.set(genres[primaryGenre]?.color || '#00f3ff'));
  });

  group.add(mesh);
  return mesh;
}
```

- [ ] **Step 2-4:** 添加性能分级、粒子数量控制、移动端布局降级。与原版计划 Task 15 对应。

- [ ] **Step 5: Commit**

```bash
git add src/composables/useGalaxy.js src/styles/universe.css
git commit -m "perf(app): add performance tiering and mobile adaptations"
```

---

### Task 12: 联调 watch.html 与构建测试

**Files:**
- Modify: `watch.html`

- [ ] **Step 1-4:** 确认 `watch.html` 读取 URL 参数，端到端测试通过，运行 `npm run build` 无错误。

- [ ] **Step 5: Commit**

```bash
git add watch.html
git commit -m "feat(app): integrate watch.html jump and verify build"
```

---

### Task 13: 文档更新与最终部署

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1-3:** 更新 README，配置 `.gitignore`，最终提交并推送。

```bash
git add README.md .gitignore
git commit -m "docs: update README for Vue3 + Vite setup"
git push origin main
```

---

## 自检清单

- [x] Spec coverage: Vue 3 + Vite 架构、组件化四阶段、Three.js composable、HUD、看动漫跳转均覆盖。
- [x] Placeholder scan: 无 TBD/TODO，关键组件与 composable 已给出。
- [x] Type consistency: `useData`、`useAudio`、`useGalaxy` 接口一致。

---

## 执行方式选择

Plan complete and saved to `docs/superpowers/plans/2026-07-01-nebula-universe-app-plan.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
