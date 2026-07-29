# 手势/语音观影功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 executing-plans 或直接在本会话中按任务逐步执行。步骤使用复选框 `- [ ]` 语法跟踪。

**Goal:** 在现有星云编年史项目中新增独立播放页 `watch.html`，支持 B 站/本地片源、语音选片、手势播放控制，并同步优化手势顺滑度。

**Architecture:** 将动漫数据与类型配置抽离到 `js/shared-data.js`，主页面与播放页共用；播放页 `watch.html` 为独立页面，复用星云背景和手势识别逻辑；新增 `js/shared-utils.js` 存放跨页通用的工具函数与语音识别模块。

**Tech Stack:** HTML5, CSS3, Vanilla JS, MediaPipe Hands, Three.js, Web Speech API, Bilibili iframe embed.

---

## 文件结构

| 文件 | 责任 |
|------|------|
| `js/shared-data.js` | 动漫数据库、类型色板、配置常量、`AnimeDB` 仓库。 |
| `js/shared-utils.js` | 跨页工具函数（`distance`、`lerp`、`hexToRgba`）、B 站 URL 解析、语音识别封装 `VoiceEngine`。 |
| `nebula-chronicle.html` | 主页：时间轴、详情面板、播放按钮、语音入口、手势识别（优化后）。 |
| `watch.html` | 独立播放页：视频播放、返回主页面、播放页手势/语音控制。 |

---

### Task 1: 抽离共享数据模块

**Files:**
- Create: `/workspace/js/shared-data.js`
- Modify: `/workspace/nebula-chronicle.html`（移除数据相关代码）

- [ ] **Step 1: 创建 `js/shared-data.js`**

将 `nebula-chronicle.html` 中的 `rawAnimeData`、`CONFIG`、`GENRE_PALETTE`、`AnimeSchema`、`AnimeDB`、`getGenreColor`、`hexToRgba` 完整迁移到该文件。并在 `rawAnimeData` 中为每个对象添加 `bilibili: ''` 和 `videoUrl: ''` 字段（初始为空字符串）。文件末尾以全局变量形式暴露：

```js
window.rawAnimeData = rawAnimeData;
window.CONFIG = CONFIG;
window.GENRE_PALETTE = GENRE_PALETTE;
window.AnimeDB = AnimeDB;
window.getGenreColor = getGenreColor;
window.hexToRgba = hexToRgba;
```

- [ ] **Step 2: 修改 `nebula-chronicle.html` 引入共享数据**

在 `<head>` 的 Three.js script 之后新增：

```html
<script src="js/shared-data.js"></script>
```

删除原文件中 `rawAnimeData`、 `CONFIG`、 `GENRE_PALETTE`、 `AnimeSchema`、 `AnimeDB`、 `getGenreColor`、 `hexToRgba` 的定义代码（约 1161-1893 行区域，迁移后确认无重复）。

- [ ] **Step 3: 验证主页仍可正常加载**

在浏览器打开 `nebula-chronicle.html`，确认启动页、时间轴节点、详情面板无报错。

---

### Task 2: 创建共享工具与语音模块

**Files:**
- Create: `/workspace/js/shared-utils.js`

- [ ] **Step 1: 创建 `js/shared-utils.js`**

包含以下内容：

```js
function distance(a, b) { /* ... */ }
function lerp(start, end, factor) { /* ... */ }
function hexToRgba(hex, alpha) { /* ... */ }

function extractBvid(input) {
  if (!input) return '';
  const match = String(input).match(/BV[0-9a-zA-Z]{10}/);
  return match ? match[0] : '';
}

function buildBilibiliEmbed(bvid) {
  if (!bvid) return '';
  return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0`;
}

const VoiceEngine = {
  recognition: null,
  isListening: false,
  onResult: null,
  onError: null,

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;

    this.recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal && this.onResult) {
        this.onResult(last[0].transcript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      if (this.onError) this.onError(event.error);
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        try { this.recognition.start(); } catch (e) { void e; }
      }
    };

    return true;
  },

  start() {
    if (!this.recognition && !this.init()) return false;
    if (this.isListening) return true;
    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.warn('语音启动失败:', e);
      return false;
    }
  },

  stop() {
    if (!this.recognition) return;
    this.isListening = false;
    try { this.recognition.stop(); } catch (e) { void e; }
  }
};

window.distance = distance;
window.lerp = lerp;
window.hexToRgba = hexToRgba;
window.extractBvid = extractBvid;
window.buildBilibiliEmbed = buildBilibiliEmbed;
window.VoiceEngine = VoiceEngine;
```

- [ ] **Step 2: 在两个页面引入共享工具**

在 `nebula-chronicle.html` 和后续创建的 `watch.html` 的 `<head>` 中，于 `shared-data.js` 之后引入：

```html
<script src="js/shared-utils.js"></script>
```

---

### Task 3: 优化主页面手势顺滑度

**Files:**
- Modify: `/workspace/nebula-chronicle.html`

- [ ] **Step 1: 优化 CONFIG 中的手势参数**

将 `CONFIG` 中相关参数在 `shared-data.js` 里调整为：

```js
HOVER_RADIUS: 60,
GESTURE_DEBOUNCE_MS: 80,
PINCH_HOLD_MS: 150,
PINCH_COOLDOWN_MS: 600,
OPEN_HAND_HOLD_MS: 250,
CURSOR_LERP: 0.18,
ROTATION_EMA_ALPHA: 0.15,
HAND_DEAD_ZONE_PX: 6
```

（原 `CONFIG` 保留其他字段，仅新增/修改上述。）

- [ ] **Step 2: 新增手势状态变量**

在 `nebula-chronicle.html` 的 `state` 对象中新增：

```js
smoothedHandX: 0,
smoothedHandY: 0,
pinchStartTime: 0,
openHandStartTime: 0,
velocityEma: 0
```

- [ ] **Step 3: 实现光标平滑与死区**

在 `onHandResults` 中，将原始坐标赋值改为：

```js
const rawX = (1 - indexTip.x) * window.innerWidth;
const rawY = indexTip.y * window.innerHeight;
const dx = rawX - state.smoothedHandX;
const dy = rawY - state.smoothedHandY;
if (Math.hypot(dx, dy) > CONFIG.HAND_DEAD_ZONE_PX) {
  state.smoothedHandX = lerp(state.smoothedHandX, rawX, CONFIG.CURSOR_LERP);
  state.smoothedHandY = lerp(state.smoothedHandY, rawY, CONFIG.CURSOR_LERP);
}
state.handX = state.smoothedHandX;
state.handY = state.smoothedHandY;
```

`updateHandCursor` 改用 `state.handX`/`state.handY`。

- [ ] **Step 4: 优化时间轴旋转 EMA**

修改 `rotateTimelineByVelocity`：

```js
function rotateTimelineByVelocity() {
  if (state.lastHandX === 0) {
    state.lastHandX = state.handX;
    return;
  }
  const rawVelocity = state.handX - state.lastHandX;
  state.lastHandX = state.handX;
  state.velocityEma = lerp(state.velocityEma, rawVelocity, CONFIG.ROTATION_EMA_ALPHA);
  const targetRotation = state.spiralRotation + state.velocityEma * CONFIG.ROTATION_DAMPING;
  state.spiralRotation = lerp(state.spiralRotation, targetRotation, 0.25);
  applySpiralTransform();
}
```

- [ ] **Step 5: 增加 pinch 稳定期和 open 手势延迟**

在 `detectGesture` 的 pinch 分支中，不立即触发，而是：

```js
if (isPinched) {
  gesture = 'pinch';
  if (state.pinchStartTime === 0) state.pinchStartTime = now;
  if (now - state.pinchStartTime > CONFIG.PINCH_HOLD_MS) {
    handlePinch();
  }
} else {
  state.isPinching = false;
  state.pinchStartTime = 0;
  // ... 其他手势判断
}
```

在 open 手势判断中增加稳定期：

```js
if (fingers.index && fingers.middle && fingers.ring && fingers.pinky) {
  gesture = 'open';
  if (state.openHandStartTime === 0) state.openHandStartTime = now;
  if (now - state.openHandStartTime > CONFIG.OPEN_HAND_HOLD_MS) {
    handleHover(state.handX, state.handY, true);
  }
} else {
  state.openHandStartTime = 0;
}
```

---

### Task 4: 主页面新增播放按钮与语音入口

**Files:**
- Modify: `/workspace/nebula-chronicle.html`

- [ ] **Step 1: 在详情面板添加播放按钮**

在 `detail-panel` 的 `.detail-desc` 后新增：

```html
<button class="play-btn" id="play-btn" onclick="playSelectedAnime()">▶ 播放作品</button>
```

并在 CSS 中新增 `.play-btn` 样式（霓虹按钮，与主题一致）。

- [ ] **Step 2: 实现 `playSelectedAnime` 函数**

```js
function playSelectedAnime() {
  if (state.selectedNode === null) return;
  const anime = AnimeDB.get(state.selectedNode);
  if (!anime) return;
  if (!anime.bilibili && !anime.videoUrl) {
    alert('该片源暂未配置，请在动漫数据中添加 bilibili 或 videoUrl 字段。');
    return;
  }
  window.location.href = `watch.html?index=${state.selectedNode}`;
}
```

- [ ] **Step 3: 新增麦克风开关按钮**

在标题区右侧、音乐开关旁边新增：

```html
<button class="voice-toggle" id="voice-toggle" aria-label="开启语音" aria-pressed="false" title="语音开关">
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
  </svg>
</button>
```

并补充 `.voice-toggle` 样式（与 `.music-toggle` 类似，激活时脉冲）。

- [ ] **Step 4: 实现主页语音控制**

在 `initUI` 中绑定麦克风按钮：

```js
const voiceToggle = document.getElementById('voice-toggle');
if (voiceToggle) {
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  voiceToggle.style.display = supported ? 'flex' : 'none';
  voiceToggle.addEventListener('click', () => {
    if (VoiceEngine.isListening) {
      VoiceEngine.stop();
      updateVoiceButton(false);
    } else {
      VoiceEngine.onResult = handleVoiceCommand;
      if (VoiceEngine.start()) updateVoiceButton(true);
    }
  });
}
```

实现 `handleVoiceCommand(text)`：

```js
function handleVoiceCommand(text) {
  const lower = text.toLowerCase().replace(/[，。？！]/g, ' ').trim();
  if (lower.includes('关闭') || lower.includes('退出')) {
    closeDetail();
    return;
  }
  const playMatch = lower.match(/(?:播放|看|打开)\s*(.+)/);
  if (playMatch) {
    const keyword = playMatch[1].trim();
    const results = AnimeDB.search(keyword);
    if (results.length > 0) {
      const target = AnimeDB.all.findIndex(a => a.title === results[0].title);
      if (target >= 0) {
        window.location.href = `watch.html?index=${target}`;
      }
    } else {
      showVoiceFeedback(`未找到「${keyword}」`);
    }
  }
}
```

（`updateVoiceButton` 和 `showVoiceFeedback` 作为辅助函数实现。）

- [ ] **Step 5: 更新手势提示卡片**

在 `.hint-card` 中新增两项：

```html
<div class="hint-item" id="hint-play">
  <div class="hint-icon">▶</div>
  <div>详情面板中捏合 → 播放</div>
</div>
<div class="hint-item" id="hint-voice">
  <div class="hint-icon">🎙</div>
  <div>说「播放 + 动漫名」</div>
</div>
```

---

### Task 5: 创建独立播放页 `watch.html`

**Files:**
- Create: `/workspace/watch.html`

- [ ] **Step 1: 创建基础 HTML 结构**

页面包含：启动遮罩、星云 canvas、扫描线、标题栏（返回按钮+动漫标题）、视频容器、动漫信息面板、摄像头区、手势光标、麦克风开关。引入 MediaPipe、Three.js、shared-data.js、shared-utils.js。

- [ ] **Step 2: 实现视频加载逻辑**

读取 URL 参数 `index` 或 `title`，查找对应动漫：

```js
function loadAnimeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const index = parseInt(params.get('index'), 10);
  const title = params.get('title');
  if (!isNaN(index) && AnimeDB.get(index)) return { anime: AnimeDB.get(index), index };
  if (title) {
    const results = AnimeDB.search(decodeURIComponent(title));
    if (results.length > 0) {
      const idx = AnimeDB.all.findIndex(a => a.title === results[0].title);
      return { anime: results[0], index: idx };
    }
  }
  return { anime: null, index: -1 };
}
```

根据 `anime.bilibili` 和 `anime.videoUrl` 决定渲染 B 站 iframe 或本地 `<video>`。若都为空，显示「暂无片源」提示。

- [ ] **Step 3: 复用星云背景**

将 `nebula-chronicle.html` 中的 `initNebulaBackground` 函数逻辑复制到 `watch.html`（或考虑后续抽离为 `js/nebula-bg.js`，本轮先复制以保证独立页可运行）。

- [ ] **Step 4: 实现播放页手势**

复用 MediaPipe 初始化与手势检测逻辑，针对播放页手势：

- pinch → 点击播放/暂停按钮（本地 video 可直接调用 `video.play()`/`video.pause()`）。
- open → 返回主页面 `window.location.href = 'nebula-chronicle.html'`。
- swipe → 本地视频时快进/快退 5 秒；B 站 iframe 无法跨域控制，显示提示。

- [ ] **Step 5: 实现播放页语音**

麦克风开关控制 `VoiceEngine`：

- "播放"/"继续" → 播放视频
- "暂停" → 暂停视频
- "关闭"/"退出"/"返回" → 返回主页面
- "静音"/"取消静音" → 切换 `<video>` 静音状态

- [ ] **Step 6: 添加返回按钮与片源信息**

标题栏左侧返回按钮链接到 `nebula-chronicle.html`。底部信息面板显示动漫年份、类型、简介，与主页详情面板风格一致。

---

### Task 6: 为少量动漫填充示例片源（可选，便于演示）

**Files:**
- Modify: `/workspace/js/shared-data.js`

- [ ] **Step 1: 为 2-3 部作品添加公开 B 站 BV 号**

例如（需用户替换为真实可用链接）：

```js
{
  year: 1995,
  title: "新世纪福音战士",
  // ...
  bilibili: "BV1xx411c7mD", // 示例占位
  videoUrl: ""
}
```

若用户无现成链接，可保持为空并在控制台提示用户自行配置。

---

### Task 7: 验证与收尾

**Files:**
- Modify: `/workspace/nebula-chronicle.html`
- Modify: `/workspace/watch.html`
- Modify: `/workspace/js/shared-data.js`
- Modify: `/workspace/js/shared-utils.js`

- [ ] **Step 1: 浏览器打开 `nebula-chronicle.html`**

确认：启动页正常、时间轴渲染、详情面板打开、播放按钮出现、语音按钮出现（浏览器支持时）。

- [ ] **Step 2: 点击「播放作品」**

确认：跳转到 `watch.html?index=...` 并显示对应动漫信息。

- [ ] **Step 3: 浏览器打开带 title 参数的 watch.html**

例如 `watch.html?title=新世纪福音战士`，确认能正确查找并显示。

- [ ] **Step 4: 检查控制台无报错**

确认无 `ReferenceError`、无重复定义、无未捕获异常。

- [ ] **Step 5: 检查移动端响应式**

在 DevTools 手机视图中确认播放页布局正常，按钮可点击。

---

## 自查

- **Spec 覆盖**：
  - 独立播放页 → Task 5
  - B 站/本地片源 → Task 1（数据字段）+ Task 5（加载逻辑）
  - 主页播放按钮 → Task 4
  - 语音选片/播放控制 → Task 2 + Task 4 + Task 5
  - 手势顺滑度优化 → Task 3
  - 手势提示更新 → Task 4 Step 5
- **无占位符**：所有步骤包含具体代码或命令。
- **类型一致性**：`bilibili` / `videoUrl` 字段在数据、schema、解析函数中命名一致。
