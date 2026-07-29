# 星云编年史 · 登录/入口页实施指南

> 可直接交给 ChatGPT 或自行按步骤实现。
> 定位：高端二次元角色企划风格登录/入口页，非主界面。

---

## 一、最终文件结构

```
/workspace/
├── index.html                              # 唯一入口页（重写）
├── favicon.svg                             # 保持现有
├── images/
│   ├── generated/
│   │   ├── nebula-bg.jpg                   # 保持现有，加载画面背景
│   │   ├── nebula-trailer-v3-a.mp4         # 你通过 UpDream 生成的视频 1
│   │   ├── nebula-trailer-v3-b.mp4         # 你通过 UpDream 生成的视频 2
│   │   └── nebula-trailer-v3-c.mp4         # 可选视频 3
│   └── login/                              # 8 张角色海报保持现有
│       ├── akiyama-mio.jpg
│       ├── tachibana-kanade.jpg
│       ├── shana.jpg
│       ├── kato-megumi.jpg
│       ├── rem.jpg
│       ├── violet-evergarden.png
│       ├── elaina.jpg
│       └── misaka-mikoto.jpg
├── audio/                                  # 新增：音效占位
│   ├── ambient-loading.mp3                 # 加载氛围音
│   ├── card-appear.mp3                     # 角色卡片浮现音
│   └── button-click.mp3                    # 按钮点击音
├── docs/
│   ├── nebula-entrance-v2-design.md        # 设计文档
│   └── nebula-entrance-v2-implementation-guide.md  # 本文档
├── check-syntax.js                         # 更新检查文件列表
└── README.md                               # 更新说明
```

**需要删除的旧文件：**
- `/workspace/liquid-glass-demo.html`
- `/workspace/login-v2.html`

---

## 二、页面整体流程

```
访问 index.html
    │
    ▼
Phase 0: 加载画面（2.5–4 秒）
    │
    ▼
Phase 1: 琉璃玻璃角色展示（6–8 秒）
    │
    ▼
Phase 2: 入口界面（常驻）
    │
    ▼
点击「开始旅程」
    │
    ▼
播放音效 + 星门放大/白屏/粒子爆发
    │
    ▼
跳转至主应用（默认预留接口，目标 URL 可配置）
```

---

## 三、Phase 0: 加载画面

### 3.1 视觉要求

- 全屏深空背景 `#03030a`
- 多层 radial-gradient 光晕（紫/青/粉），缓慢脉动
- 细粒子飘动（Canvas 或 CSS）
- 中央加载环：双色渐变（青 `#00f3ff` → 紫 `#7c4dff`），细线旋转
- 底部小字「NEBULA CHRONICLE」水印（opacity 0.12，letter-spacing 0.3em）

### 3.2 预加载资源

```javascript
const assetsToLoad = [
  // 字体已通过 Google Fonts link 加载
  'images/generated/nebula-bg.jpg',
  'images/login/akiyama-mio.jpg',
  'images/login/tachibana-kanade.jpg',
  'images/login/shana.jpg',
  'images/login/kato-megumi.jpg',
  'images/login/rem.jpg',
  'images/login/violet-evergarden.png',
  'images/login/elaina.jpg',
  'images/login/misaka-mikoto.jpg',
  'images/generated/nebula-trailer-v3-a.mp4',
  'images/generated/nebula-trailer-v3-b.mp4',
  // 'images/generated/nebula-trailer-v3-c.mp4', // 可选
  'audio/ambient-loading.mp3',
  'audio/card-appear.mp3',
  'audio/button-click.mp3'
];
```

### 3.3 加载完成条件

- 所有图片 `load` 事件完成
- 至少第一个视频 `canplaythrough` 完成
- Three.js（如使用）初始化完成
- 最小展示时间：2.5 秒

### 3.4 退出过渡

加载环放大 + 淡出，Phase 1 标题从上方淡入，背景光晕收缩到中央形成星门。

---

## 四、Phase 1: 琉璃玻璃角色展示

### 4.1 布局

- 标题「NEBULA CHRONICLE」绝对定位在画面上方 18% 处，水平居中
- 8 张角色玻璃卡片围绕画面中心呈环形排列
- 中央保留一个半透明星门/漩涡作为视觉锚点

### 4.2 标题样式（Apple 风）

```css
.title-main {
  position: absolute;
  top: 18%;
  left: 50%;
  transform: translateX(-50%);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang SC', sans-serif;
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 300;
  letter-spacing: 0.2em;
  color: #f5f5f7;
  text-transform: uppercase;
  opacity: 0;
  text-shadow: 0 0 40px rgba(0, 243, 255, 0.25);
}
```

### 4.3 玻璃卡片样式

```css
.glass-card {
  position: absolute;
  width: 140px;
  height: 196px;
  border-radius: 18px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 0 30px rgba(0, 243, 255, 0.08);
  transform-style: preserve-3d;
}

.glass-card::before {
  /* 顶部高光 */
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
  border-radius: 18px 18px 0 0;
  pointer-events: none;
  z-index: 2;
}

.glass-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.92;
  filter: saturate(1.05) contrast(1.02);
}
```

### 4.4 动画时间线（总时长 7 秒）

| 时间 | 动画 |
|------|------|
| 0.0s | 标题淡入 + 轻微下移（opacity 0→1, translateY -20px→0），持续 1s |
| 0.3s | 中央星门亮起并缓慢旋转 |
| 0.8s | 第 1 张卡片从星门中心 scale 0→1 浮现，持续 0.8s，ease-out-back |
| 1.0s | 第 2 张卡片浮现 |
| 1.2s | 第 3 张卡片浮现 |
| 1.4s | 第 4 张卡片浮现 |
| 1.6s | 第 5 张卡片浮现 |
| 1.8s | 第 6 张卡片浮现 |
| 2.0s | 第 7 张卡片浮现 |
| 2.2s | 第 8 张卡片浮现 |
| 2.5s–5.0s | 8 张卡片整体环绕星门缓慢旋转（每圈 20–30s），同时每张卡片独立上下浮动（周期 3–5s） |
| 5.0s–6.0s | 卡片散开、放大、透明度降低，营造华丽退场感 |
| 6.0s–7.0s | 卡片淡出，背景平滑过渡为视频轮播 |

### 4.5 卡片位置计算

```javascript
const radiusX = Math.min(window.innerWidth * 0.32, 360);
const radiusY = Math.min(window.innerHeight * 0.22, 180);
const centerX = window.innerWidth / 2;
const centerY = window.innerHeight * 0.58;

characters.forEach((char, i) => {
  const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
  const x = centerX + radiusX * Math.cos(angle) - cardWidth / 2;
  const y = centerY + radiusY * Math.sin(angle) - cardHeight / 2;
});
```

### 4.6 参考效果

- 卡片浮现参考《魔卡少女樱》库洛牌展开/封印解除：光效、依次出现、有仪式感
- 退场参考玻璃碎片飞散但柔和，不是爆炸

---

## 五、Phase 2: 入口界面

### 5.1 布局

- 背景：全屏视频轮播（2–3 个视频循环）
- 标题：保持 Phase 1 的标题，轻微呼吸动画
- 底部中央：Apple 风格「开始旅程」按钮

### 5.2 视频轮播实现

```html
<video id="bg-video" autoplay muted loop playsinline></video>
```

```javascript
const videos = [
  'images/generated/nebula-trailer-v3-a.mp4',
  'images/generated/nebula-trailer-v3-b.mp4',
  'images/generated/nebula-trailer-v3-c.mp4'
].filter(v => /* 存在性检测 */ true);

let currentVideo = 0;
const videoEl = document.getElementById('bg-video');

function playNext() {
  videoEl.style.opacity = 0;
  setTimeout(() => {
    currentVideo = (currentVideo + 1) % videos.length;
    videoEl.src = videos[currentVideo];
    videoEl.load();
    videoEl.play();
    videoEl.style.opacity = 1;
  }, 800);
}

videoEl.addEventListener('ended', playNext);
```

### 5.3 开始旅程按钮（Apple 风）

```html
<button id="enter-btn" class="apple-button">
  <span>开始旅程</span>
</button>
```

```css
.apple-button {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 48px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', sans-serif;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.95);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.23, 1, 0.32, 1);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.apple-button:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.35);
  transform: translateX(-50%) scale(1.04);
  box-shadow: 0 8px 40px rgba(0, 243, 255, 0.2);
}

.apple-button:active {
  transform: translateX(-50%) scale(0.98);
}
```

### 5.4 点击过渡

```javascript
document.getElementById('enter-btn').addEventListener('click', () => {
  playAudio('button-click.mp3');
  
  // 1. 按钮涟漪
  // 2. 星门放大
  // 3. 白屏覆盖
  // 4. 粒子爆发
  // 5. 跳转
  
  setTimeout(() => {
    window.location.href = 'main-app.html'; // 配置你的主应用地址
  }, 1200);
});
```

---

## 六、音效预配置

### 6.1 音频管理器

```javascript
const audioMap = {};

function loadAudio(url) {
  const audio = new Audio(url);
  audio.preload = 'auto';
  audioMap[url] = audio;
}

function playAudio(url, volume = 0.6) {
  const audio = audioMap[url];
  if (!audio) return;
  audio.currentTime = 0;
  audio.volume = volume;
  audio.play().catch(() => {});
}

// 初始化加载
loadAudio('audio/ambient-loading.mp3');
loadAudio('audio/card-appear.mp3');
loadAudio('audio/button-click.mp3');
```

### 6.2 触发时机

| 音效 | 触发时机 |
|------|---------|
| `ambient-loading.mp3` | Phase 0 开始循环播放，Phase 1 淡出 |
| `card-appear.mp3` | 每张卡片浮现时播放（stagger，音量小） |
| `button-click.mp3` | 点击「开始旅程」时播放 |

---

## 七、响应式适配

### 7.1 断点

```css
/* 桌面 */
@media (min-width: 1024px) {
  .glass-card { width: 140px; height: 196px; }
}

/* 平板 */
@media (max-width: 1023px) and (min-width: 768px) {
  .glass-card { width: 110px; height: 154px; }
}

/* 手机 */
@media (max-width: 767px) {
  .glass-card { width: 78px; height: 110px; }
  .title-main { font-size: 20px; letter-spacing: 0.15em; }
  .apple-button { padding: 14px 36px; font-size: 14px; }
}
```

### 7.2 移动端降级

- 如果性能不足，减少粒子数量
- 如果 prefers-reduced-motion，跳过 Phase 1 复杂动画，直接显示 Phase 2

---

## 八、性能优化

1. 图片懒加载：Phase 1 开始前预加载角色图
2. 视频压缩：每个视频 ≤ 10 MB，1080p
3. 使用 `will-change: transform, opacity` 谨慎优化动画元素
4. 加载画面时隐藏视频元素，避免并发加载
5. 使用 `requestAnimationFrame` 做粒子动画

---

## 九、ChatGPT 提示词（可选）

如果你把本文档交给 ChatGPT 生成代码，可以使用以下提示词：

```
请根据以下设计文档，生成一个完整的单文件 HTML 页面 `/workspace/index.html`。
要求：
1. 所有 CSS 和 JS 都内联在 HTML 中
2. 实现三个阶段的完整动画：加载画面、琉璃玻璃角色展示、视频轮播入口
3. 使用现有 8 张角色图片：images/login/akiyama-mio.jpg 等
4. 视频路径使用 images/generated/nebula-trailer-v3-a.mp4 等（文件可能不存在，代码需兼容）
5. 标题使用 Apple 风格字体和排版
6. 按钮为圆角玻璃质感，hover 有放大和光晕
7. 预配置音效接口（音频文件可能不存在）
8. 删除页面中的用户名/密码输入框
9. 代码优雅降级，兼容 file:// / solo-remote-file:// 等本地协议
10. 响应式适配移动端

设计文档如下：
[粘贴本文档内容]
```

---

## 十、测试清单

- [ ] `index.html` 本地服务器访问正常
- [ ] 加载画面显示 2.5 秒以上
- [ ] 8 张角色卡片按环形依次浮现
- [ ] 卡片玻璃质感可见（高光、边框、模糊）
- [ ] 卡片退场自然过渡到视频背景
- [ ] 视频轮播正常切换
- [ ] 「开始旅程」按钮 hover/active 效果正常
- [ ] 点击按钮播放音效并触发过渡动画
- [ ] 移动端显示正常
- [ ] `file://` 协议下不报错（视频应被隐藏）
- [ ] `liquid-glass-demo.html` 和 `login-v2.html` 已删除
- [ ] GitHub Pages 部署后在线访问正常
