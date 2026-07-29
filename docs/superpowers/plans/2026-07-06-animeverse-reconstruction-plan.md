# AnimeVerse 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 "星云编年史" 从一个普通 Vue 动漫网站升级为 **AnimeVerse —— AI 沉浸式动漫宇宙**，以"探索动漫历史与作品关系"为核心体验。

**Architecture:** 将现有代码拆分为多个独立 Engine（Timeline/Galaxy/Interaction/AI/Renderer/Audio），用统一状态中枢驱动，Three.js 负责宇宙渲染，Vue 负责 HUD/面板/场景切换，语音与手势作为一级输入方式。

**Tech Stack:** Vue 3 + Vite + Three.js + Web Speech API + MediaPipe Hands + Web Audio API + 可选 LLM（豆包/火山方舟）。

---

## 一、当前状态快照

- 入口流程：`LoadingPhase` → `LandingPhase` → `GalaxyPhase`
- `useGalaxy.js`：单一静态 3D 星系，作品随机分布
- `useData.js`：仅加载 `anime-corpus.json` + `genre-manifest.json`
- `useGesture.js` / `useVoice.js`：基础手势/语音，命令有限
- `HUD.vue`：搜索 + 流派筛选 + 语音开关
- `DetailPanel.vue`：右侧作品详情
- `public/data/anime-sources.json`：片源配置
- 已有旧版脚本：`public/js/llm-engine.js`、`public/js/shared-data.js` 等

---

## 二、目标架构（Engine 化）

所有新代码按职责放入 `src/engines/`：

```text
src/engines/
  core/
    StateEngine.js          # 统一状态：phase、year、selectedId、hoveredId、mode
    EventBus.js             # 引擎间通信
  data/
    DataEngine.js           # 数据加载、索引、查询（替代 useData）
    KnowledgeEngine.js      # 知识图谱：关系、路径、推荐
  universe/
    TimelineEngine.js       # 年份时间轴生成
    GalaxyEngine.js         # 3D 星系渲染与交互（替换 useGalaxy）
    NebulaEngine.js         # Shader 星云、体积云
    ParticleEngine.js       # 粒子系统
  interaction/
    InteractionEngine.js    # 统一输入：鼠标/键盘/手势/语音路由
    GestureEngine.js        # 手势识别（替换 useGesture）
    VoiceEngine.js          # 语音识别（替换 useVoice）
  ai/
    AIEngine.js             # LLM 导航、推荐、解说
  audio/
    AudioEngine.js          # 空间音频与 BGM（替换 useAudio）
```

保留 `src/components/` 但职责收窄为 UI 外壳：
- `LoadingPhase.vue`：仪式化加载
- `LandingPhase.vue`：宇宙入口
- `UniversePhase.vue`：主宇宙（替代 GalaxyPhase）
- `HUD.vue` / `DetailPanel.vue` / `NodePanel.vue`：UI 面板

---

## 三、分阶段实施路线图

### Phase 0：架构奠基与数据增强（本期目标）
1. 创建 `src/engines/` 目录与 Engine 接口规范。
2. 扩展 `anime-corpus.json` 字段：year、studios、directors、authors、characters、music、awards、relations、synopsis、tags、popularity。
3. 新增 `knowledge-graph.json`：作品关系边（same-studio、same-author、same-genre、same-year、same-music、sequel、prequel、recommended）。
4. 实现 `DataEngine` 和 `KnowledgeEngine`。
5. 实现 `TimelineEngine`：按年份聚合作品，生成银河条带。
6. 重写 `GalaxyEngine`：支持按年份分布的恒星、星座连线、关系光路。
7. 新建 `UniversePhase.vue`：替换 GalaxyPhase，集成 Timeline + Galaxy + HUD。
8. 实现 `InteractionEngine`：统一鼠标/键盘/手势/语音输入路由。
9. 扩展手势命令：握拳进入、张开返回、双手缩放、挥手切年份。
10. 扩展语音命令："带我去2008年"、"推荐治愈番"、"打开CLANNAD"、"返回"。
11. 接入 `AIEngine` 雏形：调用 LLM 解析语音意图并触发导航。
12. 保留现有 Loading/Landing 入口，Landing 标题改为 AnimeVerse。
13. 构建、部署、验证。

### Phase 1：AI 宇宙导航深化
- AI 主动推荐路径
- AI 解说动漫历史
- AI 生成探索路线
- 多轮语音对话

### Phase 2：视觉升级
- Shader 体积星云
- Bloom + DOF
- 电影级转场
- 空间音频
- 镜头惯性

### Phase 3：社交与扩展
- 用户收藏星系
- 个性化宇宙
- VR/AR 适配预留
- 多人大厅预留

---

## 四、Phase 0 详细任务

### Task 1: 创建 Engine 目录结构与基础接口

**Files:**
- Create: `src/engines/core/EventBus.js`
- Create: `src/engines/core/StateEngine.js`

**目标：** 所有 Engine 通过 EventBus 通信，StateEngine 保存全局状态。

- [ ] **Step 1: 创建 EventBus**

```javascript
// src/engines/core/EventBus.js
class EventBus {
  constructor() {
    this.events = new Map();
  }
  on(event, handler) {
    if (!this.events.has(event)) this.events.set(event, new Set());
    this.events.get(event).add(handler);
    return () => this.events.get(event).delete(handler);
  }
  emit(event, payload) {
    const handlers = this.events.get(event);
    if (handlers) handlers.forEach(h => h(payload));
  }
}
export const bus = new EventBus();
```

- [ ] **Step 2: 创建 StateEngine**

```javascript
// src/engines/core/StateEngine.js
import { reactive, readonly } from 'vue';

const state = reactive({
  phase: 'loading',        // loading | landing | universe
  year: null,              // 当前聚焦年份
  selectedId: null,        // 选中作品 id
  hoveredId: null,         // 悬停作品 id
  activeGenre: null,       // 当前流派筛选
  camera: { theta: 0, phi: Math.PI / 3, radius: 180 },
  voiceIntent: null,       // 最近一次语音意图
  gesture: null,           // 最近一次手势
  loading: false,
});

export const StateEngine = {
  state: readonly(state),
  set(k, v) { state[k] = v; bus.emit(`state:${k}`, v); bus.emit('state:changed', { k, v }); },
  get(k) { return state[k]; },
  patch(obj) { Object.assign(state, obj); bus.emit('state:changed', obj); }
};

import { bus } from './EventBus.js';
```

- [ ] **Step 3: Commit**

```bash
git add src/engines/core/EventBus.js src/engines/core/StateEngine.js
git commit -m "feat(engines): add EventBus and StateEngine"
```

---

### Task 2: 扩展 anime-corpus.json 数据结构

**Files:**
- Modify: `public/data/anime-corpus.json`

**目标：** 每部动漫包含完整元数据，用于 Timeline 和 Knowledge Graph。

**约定字段：**

```json
{
  "id": "clannad-2007",
  "titleRomaji": "CLANNAD",
  "titleJa": "クラナド",
  "year": 2007,
  "season": "Fall",
  "genres": ["Drama", "Romance", "Slice of Life"],
  "studios": ["Kyoto Animation"],
  "directors": ["Ishihara Tatsuya"],
  "authors": ["Maeda Jun"],
  "music": ["Shinji Orito", "Magome Togoshi"],
  "characters": ["Okazaki Tomoya", "Furukawa Nagisa"],
  "score": 8.7,
  "popularity": 95,
  "coverImage": "./images/0.jpg",
  "synopsis": "...",
  "tags": ["催泪", "校园", "京都动画"],
  "awards": ["Kobe Animation Award 2008"],
  "relations": {
    "sequel": ["clannad-after-story-2008"],
    "prequel": [],
    "sameStudio": ["kanon-2006", "air-2005"],
    "sameAuthor": []
  }
}
```

- [ ] **Step 1: 编写脚本生成扩展字段**

```bash
node scripts/enrich-corpus.js
```

- [ ] **Step 2: 提交数据更新**

```bash
git add public/data/anime-corpus.json
git commit -m "data: enrich anime corpus with year, studios, authors, music, relations"
```

---

### Task 3: 创建 knowledge-graph.json

**Files:**
- Create: `scripts/build-knowledge-graph.js`
- Create: `public/data/knowledge-graph.json`

**目标：** 基于 corpus 自动生成作品关系边。

- [ ] **Step 1: 编写脚本**

```javascript
// scripts/build-knowledge-graph.js
import fs from 'fs';
const corpus = JSON.parse(fs.readFileSync('./public/data/anime-corpus.json', 'utf8'));

const edges = [];
const addEdge = (source, target, type, weight) => {
  if (source === target) return;
  edges.push({ source, target, type, weight });
};

for (const a of corpus) {
  for (const b of corpus) {
    if (a.id === b.id) continue;
    if (Math.abs(a.year - b.year) <= 2) addEdge(a.id, b.id, 'same-era', 0.2);
    if (a.studios?.some(s => b.studios?.includes(s))) addEdge(a.id, b.id, 'same-studio', 0.7);
    if (a.authors?.some(s => b.authors?.includes(s))) addEdge(a.id, b.id, 'same-author', 0.8);
    if (a.genres?.some(g => b.genres?.includes(g))) addEdge(a.id, b.id, 'same-genre', 0.4);
    if (a.music?.some(m => b.music?.includes(m))) addEdge(a.id, b.id, 'same-music', 0.6);
    if (a.relations?.sequel?.includes(b.id)) addEdge(a.id, b.id, 'sequel', 1.0);
    if (a.relations?.prequel?.includes(b.id)) addEdge(a.id, b.id, 'prequel', 1.0);
  }
}

fs.writeFileSync('./public/data/knowledge-graph.json', JSON.stringify({ nodes: corpus.map(c => ({ id: c.id, title: c.titleRomaji, year: c.year, genres: c.genres })), edges }, null, 2));
```

- [ ] **Step 2: 运行脚本并提交**

```bash
node scripts/build-knowledge-graph.js
git add public/data/knowledge-graph.json scripts/build-knowledge-graph.js
git commit -m "data: add auto-generated knowledge graph"
```

---

### Task 4: DataEngine 与 KnowledgeEngine

**Files:**
- Create: `src/engines/data/DataEngine.js`
- Create: `src/engines/data/KnowledgeEngine.js`

- [ ] **Step 1: DataEngine**

```javascript
// src/engines/data/DataEngine.js
import { ref } from 'vue';
const base = import.meta.env.BASE_URL;

const data = ref([]);
const genres = ref({});
const graph = ref({ nodes: [], edges: [] });

export const DataEngine = {
  data,
  genres,
  graph,
  async load() {
    const [corpusRes, genreRes, graphRes] = await Promise.all([
      fetch(`${base}data/anime-corpus.json`),
      fetch(`${base}data/genre-manifest.json`),
      fetch(`${base}data/knowledge-graph.json`)
    ]);
    data.value = await corpusRes.json();
    genres.value = await genreRes.json();
    graph.value = await graphRes.json();
  },
  byId(id) { return data.value.find(a => a.id === id); },
  byYear(year) { return data.value.filter(a => a.year === year); },
  byGenre(genre) { return data.value.filter(a => a.genres?.includes(genre)); },
  years() { return [...new Set(data.value.map(a => a.year).filter(Boolean))].sort((a, b) => a - b); },
  search(q) {
    const term = q.toLowerCase();
    return data.value.filter(a =>
      a.titleRomaji?.toLowerCase().includes(term) ||
      a.titleJa?.includes(q) ||
      a.tags?.some(t => t.toLowerCase().includes(term)) ||
      a.studios?.some(s => s.toLowerCase().includes(term)) ||
      a.authors?.some(s => s.toLowerCase().includes(term))
    );
  }
};
```

- [ ] **Step 2: KnowledgeEngine**

```javascript
// src/engines/data/KnowledgeEngine.js
import { DataEngine } from './DataEngine.js';

export const KnowledgeEngine = {
  related(id, type = null) {
    const edges = DataEngine.graph.value.edges.filter(e => e.source === id || e.target === id);
    return (type ? edges.filter(e => e.type === type) : edges)
      .map(e => ({ ...e, neighbor: e.source === id ? e.target : e.source }));
  },
  path(fromId, toId, maxHops = 3) {
    // BFS 找最短关系路径
    const visited = new Set();
    const queue = [[fromId]];
    while (queue.length) {
      const path = queue.shift();
      const node = path[path.length - 1];
      if (node === toId) return path;
      if (visited.has(node)) continue;
      visited.add(node);
      const neighbors = this.related(node).map(r => r.neighbor);
      for (const n of neighbors) {
        if (path.length < maxHops) queue.push([...path, n]);
      }
    }
    return null;
  },
  recommend(seedId, limit = 6) {
    const related = this.related(seedId);
    related.sort((a, b) => b.weight - a.weight);
    return related.slice(0, limit).map(r => DataEngine.byId(r.neighbor)).filter(Boolean);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/engines/data/DataEngine.js src/engines/data/KnowledgeEngine.js
git commit -m "feat(engines): add DataEngine and KnowledgeEngine"
```

---

### Task 5: TimelineEngine 年份时间轴

**Files:**
- Create: `src/engines/universe/TimelineEngine.js`

**目标：** 把作品按年份组织成银河条带，每一年是一个环/轨道。

- [ ] **Step 1: 实现 TimelineEngine**

```javascript
// src/engines/universe/TimelineEngine.js
import { DataEngine } from '../data/DataEngine.js';

export const TimelineEngine = {
  buildYears() {
    const years = DataEngine.years();
    return years.map((year, i) => {
      const works = DataEngine.byYear(year);
      return {
        year,
        index: i,
        works,
        radius: 80 + i * 35,        // 年份越新，轨道半径越大
        angleOffset: i * 0.4,       // 螺旋错开
        color: this.yearColor(year)
      };
    });
  },
  yearColor(year) {
    const t = (year - 1960) / 66;
    const hue = 180 + t * 160; // 青 → 紫 → 粉
    return `hsl(${hue}, 80%, 60%)`;
  },
  positionFor(year, indexInYear, totalInYear) {
    const years = this.buildYears();
    const y = years.find(item => item.year === year);
    if (!y) return { x: 0, y: 0, z: 0 };
    const angle = y.angleOffset + (indexInYear / totalInYear) * Math.PI * 2;
    return {
      x: Math.cos(angle) * y.radius,
      y: (year - 2000) * 2, // 年份轴微微上下分布
      z: Math.sin(angle) * y.radius
    };
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add src/engines/universe/TimelineEngine.js
git commit -m "feat(engines): add TimelineEngine for year-based galaxy layout"
```

---

### Task 6: GalaxyEngine 重写（年份银河 + 知识图谱连线）

**Files:**
- Create: `src/engines/universe/GalaxyEngine.js`
- Delete: `src/composables/useGalaxy.js`（保留到 GalaxyEngine 稳定后再删除）

**目标：** 用 TimelineEngine 布局恒星，用 KnowledgeEngine 画关系光路。

由于代码较长，这里给出接口与关键函数：

```javascript
// src/engines/universe/GalaxyEngine.js
import * as THREE from 'three';
import { TimelineEngine } from './TimelineEngine.js';
import { DataEngine } from '../data/DataEngine.js';
import { KnowledgeEngine } from '../data/KnowledgeEngine.js';

export function GalaxyEngine(canvasRef, options = {}) {
  let renderer, scene, camera, galaxyGroup, starMesh, lineMesh, yearRingMesh;
  const positions = new Map(); // id -> Vector3
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const init = () => { /* WebGL 初始化、灯光、场景 */ };
  const buildStars = () => { /* 用 TimelineEngine.positionFor 生成恒星 */ };
  const buildYearRings = () => { /* 每一年画一个半透明轨道环 */ };
  const buildRelations = (seedId) => { /* 以 seedId 为中心画关系线 */ };
  const highlightYear = (year) => { /* 高亮某一年所有恒星 */ };
  const highlightGenre = (genre) => { /* 高亮某流派 */ };
  const focusOnYear = (year) => { /* 相机飞到对应年份 */ };
  const dispose = () => { /* 释放资源 */ };

  return { init, buildStars, buildYearRings, buildRelations, highlightYear, highlightGenre, focusOnYear, dispose };
}
```

- [ ] **Step 1: 创建 GalaxyEngine 骨架并初始化 WebGL**
- [ ] **Step 2: 接入 TimelineEngine 生成恒星位置**
- [ ] **Step 3: 画年份轨道环**
- [ ] **Step 4: 接入 KnowledgeEngine 画关系线**
- [ ] **Step 5: Commit**

---

### Task 7: UniversePhase.vue 替代 GalaxyPhase.vue

**Files:**
- Create: `src/components/UniversePhase.vue`
- Modify: `src/App.vue` 引用 UniversePhase

**目标：** 新主界面，集成 Timeline + Galaxy + HUD + 手势/语音。

```vue
<template>
  <section class="phase-universe">
    <canvas ref="canvas" id="universe-canvas"></canvas>
    <HUD @filter-year="onFilterYear" @filter-genre="onFilterGenre" @search="onSearch" @toggle-voice="toggleVoice" />
    <NodePanel v-if="selectedAnime" :anime="selectedAnime" @close="selectedAnime = null" />
    <div class="year-ribbon">{{ activeYear || '全宇宙' }}</div>
  </section>
</template>
```

- [ ] **Step 1: 创建 UniversePhase.vue 模板**
- [ ] **Step 2: 在 onMounted 中初始化 DataEngine、GalaxyEngine、InteractionEngine**
- [ ] **Step 3: 绑定 StateEngine 监听，响应 year/selectedId 变化**
- [ ] **Step 4: 修改 App.vue 用 UniversePhase 替换 GalaxyPhase**
- [ ] **Step 5: Commit**

---

### Task 8: InteractionEngine 统一输入路由

**Files:**
- Create: `src/engines/interaction/InteractionEngine.js`
- Create: `src/engines/interaction/GestureEngine.js`（包装 MediaPipe）
- Create: `src/engines/interaction/VoiceEngine.js`（包装 Web Speech）

**目标：** 所有输入统一路由，支持鼠标/键盘/手势/语音。

```javascript
// src/engines/interaction/InteractionEngine.js
import { bus } from '../core/EventBus.js';
import { StateEngine } from '../core/StateEngine.js';

export const InteractionEngine = {
  init({ canvas, gestureVideo, gestureCanvas }) {
    this.bindMouse(canvas);
    this.bindKeyboard();
    // 可选启动手势
  },
  bindMouse(canvas) {
    canvas.addEventListener('pointermove', e => bus.emit('input:pointer', { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('click', () => bus.emit('input:select'));
    canvas.addEventListener('wheel', e => bus.emit('input:zoom', e.deltaY));
  },
  bindKeyboard() {
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape') bus.emit('input:back');
      if (e.key === 'ArrowLeft') bus.emit('input:swipe', -1);
      if (e.key === 'ArrowRight') bus.emit('input:swipe', 1);
    });
  }
};
```

- [ ] **Step 1: 创建 InteractionEngine**
- [ ] **Step 2: 将 GestureEngine / VoiceEngine 迁移到 engines/interaction/**
- [ ] **Step 3: 在 UniversePhase 中初始化 InteractionEngine**
- [ ] **Step 4: Commit**

---

### Task 9: AIEngine 语音意图解析

**Files:**
- Create: `src/engines/ai/AIEngine.js`
- Create: `src/engines/ai/intent-parser.js`

**目标：** 把自然语言转成结构化意图。

```javascript
// src/engines/ai/intent-parser.js
export function parseIntent(text) {
  const t = text.trim();

  const yearMatch = t.match(/(\d{4})/);
  if (/去.*年|飞到.*年|.*年.*银河/.test(t) && yearMatch) {
    return { action: 'focus-year', year: parseInt(yearMatch[1]) };
  }
  if (/推荐|有什么|找.*番/.test(t)) {
    const genre = extractGenre(t);
    return { action: 'recommend', genre };
  }
  if (/打开|看|播放|定位/.test(t)) {
    const title = extractTitle(t);
    return { action: 'focus-anime', title };
  }
  if (/返回|回去|退出/.test(t)) return { action: 'back' };
  if (/首页|主页|开始/.test(t)) return { action: 'home' };

  return { action: 'unknown', raw: t };
}
```

- [ ] **Step 1: 实现本地意图解析器**
- [ ] **Step 2: 创建 AIEngine，可切换本地/LLM 模式**
- [ ] **Step 3: 在 VoiceEngine 中调用 AIEngine 解析结果**
- [ ] **Step 4: Commit**

---

### Task 10: 扩展语音/手势命令

**Files:**
- Modify: `src/engines/interaction/GestureEngine.js`
- Modify: `src/engines/interaction/VoiceEngine.js`

**手势映射：**
- 食指伸出移动 → 光标移动
- 握拳并持续 250ms → 进入选中
- 张开手掌持续 250ms → 返回
- 双手拉开 → 放大时间轴
- 双手合拢 → 缩小时间轴
- 向左挥手 → 上一年
- 向右挥手 → 下一年

**语音映射：**
- "带我去2008年" → focus-year 2008
- "推荐治愈番" → recommend genre=治愈
- "打开CLANNAD" → focus-anime CLANNAD
- "返回" → back
- "回到首页" → home

- [ ] **Step 1: 在 GestureEngine 中添加 year 切换手势识别**
- [ ] **Step 2: 在 VoiceEngine 中接入 AIEngine 解析意图**
- [ ] **Step 3: 在 UniversePhase 中根据意图触发状态变化**
- [ ] **Step 4: Commit**

---

### Task 11: AudioEngine 空间化升级

**Files:**
- Create: `src/engines/audio/AudioEngine.js`

**目标：** 根据当前年份/流派切换氛围音乐，支持空间音效反馈。

- [ ] **Step 1: 创建 AudioEngine，基于现有 useAudio 但支持场景切换**
- [ ] **Step 2: 在 UniversePhase 中根据 activeYear 切换和弦色彩**
- [ ] **Step 3: Commit**

---

### Task 12: HUD 与 NodePanel 适配新架构

**Files:**
- Modify: `src/components/HUD.vue`
- Modify: `src/components/DetailPanel.vue`（或新建 `NodePanel.vue`）

**HUD 新增：**
- 年份选择下拉/滑块
- AI 语音输入按钮
- 关系图开关
- 当前年份显示

**NodePanel（详情面板）新增：**
- 显示 year、studios、directors、authors、music
- "相关推荐" 列表（来自 KnowledgeEngine）
- "关系路径" 按钮

- [ ] **Step 1: 修改 HUD 添加年份相关 UI**
- [ ] **Step 2: 扩展 NodePanel 显示完整元数据**
- [ ] **Step 3: Commit**

---

### Task 13: Loading/Landing 仪式感升级

**Files:**
- Modify: `src/components/LoadingPhase.vue`
- Modify: `src/components/LandingPhase.vue`

**LoadingPhase：**
- 提示文字改为宇宙叙事风格
- 例如："正在连接 AnimeVerse 核心..."、"正在绘制时间轴..."、"正在点亮恒星..."

**LandingPhase：**
- 主标题改为 `AnimeVerse`
- 副标题改为 `探索动漫六十载宇宙`
- 按钮改为 `进入宇宙`

- [ ] **Step 1: 修改 LoadingPhase 提示文案**
- [ ] **Step 2: 修改 LandingPhase 品牌文案**
- [ ] **Step 3: Commit**

---

### Task 14: 构建、验证、部署

**Files:**
- Run: `npm run build`
- Deploy: `git subtree push --prefix dist origin gh-pages`

- [ ] **Step 1: 运行 `npm run build` 检查错误**
- [ ] **Step 2: 本地 `npm run preview` 验证**
- [ ] **Step 3: 推送到 gh-pages**
- [ ] **Step 4: 线上访问验证**
- [ ] **Step 5: Commit 任何修复**

---

## 五、验收标准

Phase 0 完成后，用户应能：

1. 打开网站看到 Loading → Landing → Universe 三阶段。
2. 进入主界面后看到按年份组织的 3D 星系， older 作品在内圈， newer 在外圈。
3. 看到年份轨道环，颜色随年份渐变。
4. 鼠标悬停作品看到提示，点击打开 NodePanel。
5. 在 NodePanel 看到 year、studios、authors、music、推荐作品。
6. 语音说"带我去2008年"，相机飞到 2008 年银河。
7. 语音说"推荐治愈番"，高亮所有治愈作品并展示推荐列表。
8. 手势：握拳进入作品，张开返回，挥手切换年份。
9. 整体 UI 保持 Liquid Glass + Space UI 风格。

---

## 六、风险与回退

- **WebGL 性能：** 年份环和关系线增多后可能掉帧。需保留 LOD 和性能分级。
- **数据缺失：** 部分旧 anime-corpus 字段缺失，脚本需补默认值。
- **LLM 不可用：** AIEngine 默认本地意图解析，LLM 作为可选增强。
- **手势/语音兼容性：** 保留鼠标/键盘作为主要交互兜底。

---

## 七、后续阶段（Phase 1+）预览

- **Phase 1：** AI 导游、主动推荐路径、多轮语音对话。
- **Phase 2：** Shader 体积云、Bloom/DOF、电影级转场、空间音频。
- **Phase 3：** 用户收藏、个性化宇宙、VR/AR 预留接口。
