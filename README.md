<p align="center">
  <img src="public/favicon.svg" alt="Nebula Chronicle" width="100" />
  <br /><br />
  <a href="https://github.com/mw2wbyys6t-sudo/nebula-chronicle/stargazers">
    <img src="https://img.shields.io/github/stars/mw2wbyys6t-sudo/nebula-chronicle?style=social&label=Star" alt="Stars" />
  </a>
  &nbsp;
  <a href="https://github.com/mw2wbyys6t-sudo/nebula-chronicle/forks">
    <img src="https://img.shields.io/github/forks/mw2wbyys6t-sudo/nebula-chronicle?style=social&label=Fork" alt="Forks" />
  </a>
  &nbsp;
  <img src="https://img.shields.io/github/license/mw2wbyys6t-sudo/nebula-chronicle?color=blue" alt="License" />
  <br /><br />
  <a href="https://mw2wbyys6t-sudo.github.io/nebula-chronicle/">
    <img src="https://img.shields.io/badge/在线体验-Live%20Demo-8A2BE2?style=for-the-badge&logo=githubpages" alt="Live Demo" />
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/Vue-3.5-42b883?style=for-the-badge&logo=vuedotjs" alt="Vue 3" />
  &nbsp;
  <img src="https://img.shields.io/badge/Vite-8-646cff?style=for-the-badge&logo=vite" alt="Vite" />
  &nbsp;
  <img src="https://img.shields.io/badge/Three.js-0.185-black?style=for-the-badge&logo=threedotjs" alt="Three.js" />
  &nbsp;
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License" />
</p>

<h1 align="center">星云编年史 · Nebula Chronicle</h1>

<p align="center">
  <b>指尖划过六十载动漫银河 · 声音唤醒经典回忆 · AI 陪你重回热血年代</b>
</p>

<p align="center">
  <a href="https://mw2wbyys6t-sudo.github.io/nebula-chronicle/">在线体验</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#核心功能">核心功能</a> ·
  <a href="#技术栈">技术栈</a> ·
  <a href="#开发路线图">路线图</a>
</p>

---

## 项目简介

《星云编年史》是一个**沉浸式动漫宇宙探索平台**，以 1963 年至今的经典日本动画为数据基础，将时间轴化作可探索的星云次元。

用户可以通过**语音或手势**与系统交互，让 LLM 助手查找、播放作品，也能在闲暇时切换到闲聊模式进行日常对话。从宇宙级的星云旋转到像素级的玻璃卡片光效，每一个细节都在致敬六十年的动漫文化。

> **纯前端实现，无需后端即可运行**。LLM 与 TTS 能力直接调用浏览器及第三方 API。

**在线体验**：[https://mw2wbyys6t-sudo.github.io/nebula-chronicle/](https://mw2wbyys6t-sudo.github.io/nebula-chronicle/)

---

## 项目亮点

<table>
  <tr>
    <td align="center" width="25%">
      <b>🌌 3D 星云宇宙</b><br/>
      <sub>Three.js 渲染的螺旋星云，40+ 经典作品化作星辰</sub>
    </td>
    <td align="center" width="25%">
      <b>🔮 Liquid Glass UI</b><br/>
      <sub>玻璃拟态设计，实时主题色联动与流光动效</sub>
    </td>
    <td align="center" width="25%">
      <b>🤖 AI 语音助手</b><br/>
      <sub>LLM 驱动，命令+闲聊双模式，语音合成自动朗读</sub>
    </td>
    <td align="center" width="25%">
      <b>✋ 手势控制</b><br/>
      <sub>MediaPipe 摄像头识别，挥挥手就能操控播放</sub>
    </td>
  </tr>
</table>

---

## 效果展示

### 星云宣传影片

三大星云主题宣传片，由 AI 视频生成模型（Seedance 2.0）制作，展示八位萌王角色在星云宇宙中的群像：

<table>
  <tr>
    <td align="center"><b>星云环影 · Trailer A</b></td>
    <td align="center"><b>群像蒙太奇 · Trailer B</b></td>
    <td align="center"><b>玻璃卡仪式 · Trailer C</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/gifs/nebula-trailer-a.gif" alt="Nebula Trailer A" width="280" /></td>
    <td align="center"><img src="docs/gifs/nebula-trailer-b.gif" alt="Nebula Trailer B" width="280" /></td>
    <td align="center"><img src="docs/gifs/nebula-trailer-c.gif" alt="Nebula Trailer C" width="280" /></td>
  </tr>
</table>

### 背景动画素材

用于入口页和宇宙阶段的循环背景动画，涵盖星云、魔法大厅与樱花飘落三种主题：

<table>
  <tr>
    <td align="center"><b>星空宇宙</b></td>
    <td align="center"><b>魔法大厅</b></td>
    <td align="center"><b>星云樱花</b></td>
  </tr>
  <tr>
    <td align="center"><img src="docs/gifs/starry-universe.gif" alt="Starry Universe" width="280" /></td>
    <td align="center"><img src="docs/gifs/magic-hall.gif" alt="Magic Hall" width="280" /></td>
    <td align="center"><img src="docs/gifs/nebula-sakura.gif" alt="Nebula Sakura" width="280" /></td>
  </tr>
</table>

### 角色海报

8 位 ISML（国际最萌大会）冠军女主角登录页海报，轮播切换时角色信息、主题色、玻璃卡片光效实时联动：

<table>
  <tr>
    <td align="center"><img src="public/images/login/violet-evergarden.png" alt="薇尔莉特" width="180" /></td>
    <td align="center"><img src="public/images/login/akiyama-mio.jpg" alt="秋山澪" width="180" /></td>
    <td align="center"><img src="public/images/login/tachibana-kanade.jpg" alt="立华奏" width="180" /></td>
    <td align="center"><img src="public/images/login/shana.jpg" alt="夏娜" width="180" /></td>
  </tr>
  <tr>
    <td align="center"><b>薇尔莉特 · 伊芙加登</b><br/><sub>紫罗兰永恒花园</sub></td>
    <td align="center"><b>秋山 澪</b><br/><sub>K-ON!</sub></td>
    <td align="center"><b>立华 奏</b><br/><sub>Angel Beats!</sub></td>
    <td align="center"><b>夏娜</b><br/><sub>灼眼的夏娜</sub></td>
  </tr>
  <tr>
    <td align="center"><img src="public/images/login/kato-megumi.jpg" alt="加藤惠" width="180" /></td>
    <td align="center"><img src="public/images/login/rem.jpg" alt="雷姆" width="180" /></td>
    <td align="center"><img src="public/images/login/elaina.jpg" alt="伊蕾娜" width="180" /></td>
    <td align="center"><img src="public/images/login/misaka-mikoto.jpg" alt="御坂美琴" width="180" /></td>
  </tr>
  <tr>
    <td align="center"><b>加藤 惠</b><br/><sub>路人女主的养成方法</sub></td>
    <td align="center"><b>雷姆</b><br/><sub>Re:从零开始的异世界生活</sub></td>
    <td align="center"><b>伊蕾娜</b><br/><sub>魔女之旅</sub></td>
    <td align="center"><b>御坂 美琴</b><br/><sub>某科学的超电磁炮</sub></td>
  </tr>
</table>

### AI 生成视觉素材

入口页和宇宙阶段使用的 AI 生成背景图、玻璃光盘、魔法阵等视觉元素：

<table>
  <tr>
    <td align="center"><b>星云背景</b></td>
    <td align="center"><b>玻璃光盘</b></td>
    <td align="center"><b>魔法阵</b></td>
    <td align="center"><b>樱花大厅</b></td>
  </tr>
  <tr>
    <td align="center"><img src="public/images/generated/nebula-bg.jpg" alt="Nebula BG" width="200" /></td>
    <td align="center"><img src="public/images/generated/title-glass-disc.jpg" alt="Glass Disc" width="200" /></td>
    <td align="center"><img src="public/images/generated/magic-circle.jpg" alt="Magic Circle" width="200" /></td>
    <td align="center"><img src="public/images/generated/anime-sakura-poster.jpg" alt="Sakura Hall" width="200" /></td>
  </tr>
</table>

---

## 核心功能

### 1. 沉浸式入口页（双模式）

统一入口 `/index.html` 融合了沉浸启动动画与轻量登录页：

| 模式 | 说明 |
|------|------|
| **沉浸模式** | Three.js 3D 星云世界启动动画，GSAP 时间线编排。星云苏醒 → 玻璃凝聚 → 角色觉醒 → 编年史展开 → 星图散开成粒子 → 星云漩涡 → 标题水印 + 登录界面升起 → 角色凝聚为守护星座环 |
| **轻量模式** | 8 位 ISML 冠军女主角海报轮播 + 左侧角色信息卡片 + 右侧 Liquid Glass 登录卡片。轮播切换时角色信息、主题色、玻璃卡片光效实时联动。Canvas 粒子背景与鼠标跟随玻璃高光 |

- 双模式一键切换（右上角按钮）
- 智能降级：移动端、WebGL 不支持或偏好减少动画时自动进入轻量模式
- 交互反馈：输入框主题色循环发光、按钮流光扫过/涟漪、登录成功星尘爆发、空格跳过动画
- 程序化环境背景音乐（需用户手动开启）

### 2. 动漫编年史可视化

- 基于 Three.js 的星云背景与螺旋时间轴
- 按年份、类型、作品展示经典动画卡片（1963–至今，40+ 部作品）
- 点击作品可查看详情，并跳转播放页

### 3. 知识图谱引擎

- 从 `anime-corpus.json` 内嵌的 `relations` 字段纯内存构建关系图谱（`buildGraphFromCorpus`，<10ms）
- 支持关系查询、路径发现、智能推荐
- LRU 缓存优化，KnowledgeEngine 引擎驱动
- 无需额外下载 6MB 图谱文件，首屏加载量大幅减少

### 4. LLM 多轮语音助手

- **命令模式**：通过语音/文字指令查找作品、控制播放、询问信息
- **闲聊模式**：切换后进入日常对话，支持多轮上下文记忆（默认保留最近 10 轮）
- 语音合成（Web Speech API）自动朗读助手回复
- 支持 `.env` 配置自有 API Key

### 5. 手势与语音控制

- 集成 MediaPipe Hands，支持摄像头手势识别
- 语音指令可控制播放、暂停、上一部、下一部等操作
- 播放页支持 Bilibili BV 号或本地视频源

### 6. 全局错误边界与 UI 音效

- 任何子组件渲染错误均不会白屏，显示"星辰信号中断"降级 UI
- Web Audio API 合成 UI 音效：select / hover / swipe / back / phaseChange / error 等
- 支持 `prefers-reduced-motion` 减少动画偏好
- 移动端触摸优化（防双击缩放、44px 最小触控区域）

### 7. 角色展示短片

- 8 位萌王角色 Ken Burns 展示短片 + 星云主题视频素材
- 可直接作为项目宣传或 BGM 背景素材

---

## 交互流程

```
┌──────────────────────────────────────────────────────────────────────┐
│                         用户进入星云编年史                           │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
                  ┌────────────────┐
                  │  Loading 阶段  │ ◄── 资源预加载 / WebGL 检测
                  └───────┬────────┘
                          │
              ┌───────────┴───────────┐
              ▼                       ▼
     ┌────────────────┐    ┌────────────────┐
     │  沉浸模式        │    │  轻量模式        │
     │  (3D 星云动画)   │    │  (角色轮播登录)   │
     └───────┬────────┘    └───────┬────────┘
             │                     │
             └──────────┬──────────┘
                        ▼
               ┌────────────────┐
               │  Showcase 阶段  │ ◄── 角色海报轮播 + 信息卡片
               └───────┬────────┘
                       ▼
               ┌────────────────┐
               │  Landing 阶段   │ ◄── Liquid Glass 登录
               └───────┬────────┘
                       ▼
               ┌────────────────────────────────────┐
               │  Universe 阶段（星云宇宙主界面）      │
               │                                    │
               │  ┌─────────┐  ┌──────────┐        │
               │  │ 螺旋时间轴│  │ 动漫卡片集 │        │
               │  └─────────┘  └──────────┘        │
               │  ┌─────────┐  ┌──────────┐        │
               │  │ 知识图谱  │  │ AI 语音助手│        │
               │  └─────────┘  └──────────┘        │
               │  ┌─────────┐  ┌──────────┐        │
               │  │ 手势控制  │  │ HUD 抬头显示│       │
               │  └─────────┘  └──────────┘        │
               └──────────┬─────────────────────────┘
                          │
                          ▼
               ┌────────────────┐
               │  Watch 播放页   │ ◄── Bilibili / 本地视频源
               └────────────────┘
```

---

## 架构概览

### 阶段流转

应用采用 **四阶段流转** 设计，通过 `App.vue` 中的 `<Transition>` 组件管理切换：

```
Loading → Showcase → Landing → Universe
   │          │         │          │
   │          │         │          └─ Three.js 星云宇宙（异步加载）
   │          │         └─ Liquid Glass 登录页
   │          └─ 角色海报轮播
   └─ 初始化与资源预加载
```

### 引擎架构

```
                    ┌─────────────┐
                    │  EventBus   │ ◄── 全局事件总线
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼─────┐     ┌─────▼─────┐     ┌──────▼──────┐
   │   AI      │     │  Data     │     │  Universe   │
   │  Engine   │     │  Engine   │     │   Engine    │
   ├───────────┤     ├───────────┤     ├─────────────┤
   │ Intent    │     │ Anime     │     │ Galaxy      │
   │ Parser    │     │ Data      │     │ Spiral      │
   │ Narrator  │     │ Knowledge │     │ Timeline    │
   └───────────┘     │ Graph     │     └─────────────┘
                     └───────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Interaction │
                    │   Engine    │
                    ├─────────────┤
                    │ Gesture     │
                    │ Voice       │
                    └─────────────┘
```

---

## 项目结构

```
nebula-chronicle/
├── src/                              # Vue 3 源码
│   ├── components/                   # 8 个 Vue 组件
│   │   ├── LoadingPhase.vue          # 加载阶段
│   │   ├── ShowcasePhase.vue         # 展示阶段（角色轮播）
│   │   ├── LandingPhase.vue          # 登录阶段
│   │   ├── EntrancePhase.vue         # 入口过渡
│   │   ├── UniversePhase.vue         # 星云宇宙阶段（异步加载）
│   │   ├── HUD.vue                   # 平视显示器
│   │   ├── NodePanel.vue             # 节点面板
│   │   └── OrbitTimeline.vue         # 轨道时间轴
│   ├── composables/                  # 6 个可组合函数
│   │   ├── useAudio.js               # 音频控制
│   │   ├── useData.js                # 数据管理
│   │   ├── useVoice.js               # 语音交互
│   │   ├── useUiSound.js             # UI 音效合成
│   │   ├── useProgressiveImage.js    # 渐进式图片懒加载
│   │   └── useVideoBackground.js     # 视频背景
│   ├── engines/                      # 引擎模块
│   │   ├── ai/                       # AI 引擎（3 个文件）
│   │   ├── core/                     # 核心引擎（2 个文件）
│   │   ├── data/                     # 数据引擎（2 个文件）
│   │   ├── interaction/              # 交互引擎（5 个文件）
│   │   ├── universe/                 # 宇宙引擎（3 个文件）
│   │   └── feedback/                 # 反馈引擎（2 个文件）
│   ├── styles/
│   │   └── universe.css              # 宇宙主题样式
│   ├── App.vue                       # 根组件（含错误边界）
│   └── main.js                       # 应用入口
├── public/                           # 静态资源
│   ├── data/                         # 3 个数据文件（详见下方数据说明）
│   ├── images/                       # 图片资源
│   │   ├── {0-41}.jpg                # 动漫作品封面（42 张）
│   │   ├── login/                    # 8 位角色登录海报
│   │   ├── effects/                  # 特效贴图（5 张）
│   │   └── generated/                # AI 生成素材（视频 + 海报）
│   ├── fonts/                        # NotoSansCJK 字体
│   ├── js/                           # 4 个公共 JS 文件
│   ├── watch.html                    # 视频播放页
│   └── favicon.svg                   # 网站图标
├── scripts/                          # 工具脚本（12 个）
├── docs/                             # 设计文档 + GIF 素材
│   ├── gifs/                         # README 展示用 GIF 动图
│   └── *.md                          # 9 篇设计文档
├── index.html                        # 主入口页
├── package.json                      # 依赖与脚本配置
├── vite.config.js                    # Vite 构建配置
├── .env.example                      # 环境变量模板
└── .github/workflows/pages.yml       # GitHub Pages CI/CD
```

---

## 快速开始

### 环境要求

- **Node.js** >= 18
- **npm** >= 9

### 一键启动

```bash
# 克隆仓库
git clone https://github.com/mw2wbyys6t-sudo/nebula-chronicle.git
cd nebula-chronicle

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

打开浏览器访问 `http://localhost:8080/`，即可看到星云编年史的入口页动画。

> **提示**：首次启动建议使用 Chrome / Edge 浏览器，以获得最佳的 WebGL 与 Web Speech API 兼容性。

### 生产构建

```bash
# 构建优化产物
npm run build

# 本地预览构建结果
npm run preview
```

构建产物输出到 `dist/` 目录，可直接部署到任何静态托管服务。

### 配置 LLM API Key（可选）

AI 语音助手需要配置 LLM 接口才能使用。不配置时，语音识别和手势控制功能仍可正常工作。

1. 复制配置模板：
   ```bash
   cp .env.example .env
   ```
2. 编辑 `.env`，填入你的 API Key 与模型地址：
   ```env
   VITE_LLM_API_KEY=your_api_key_here
   VITE_LLM_BASE_URL=https://your-api-endpoint.com/v1
   VITE_LLM_MODEL=your_model_name
   VITE_LLM_TEMPERATURE=0.3
   VITE_LLM_MAX_TOKENS=512
   ```
3. `.env` 已加入 `.gitignore`，Key 不会被提交到仓库。

> **兼容性**：支持任何 OpenAI 兼容接口，包括 LongCat、Modellix、Ollama 本地模型等。

---

## 部署

### GitHub Pages（推荐）

项目已配置 GitHub Actions 自动部署：

1. Fork 或克隆本仓库
2. 推送代码到 `main` 分支
3. 前往仓库 **Settings → Pages → Source** 选择 **GitHub Actions**
4. 每次推送自动构建并部署

部署地址：`https://<username>.github.io/nebula-chronicle/`

> **注意**：若仓库名不是 `nebula-chronicle`，需修改 `vite.config.js` 中的 `base` 字段为 `/<your-repo-name>/`。

### 其他静态托管

将 `dist/` 目录上传到以下平台即可：

| 平台 | 部署方式 |
|------|---------|
| [Vercel](https://vercel.com) | `vercel --prod` |
| [Netlify](https://netlify.com) | 拖拽 `dist/` 到 Dashboard |
| [Cloudflare Pages](https://pages.cloudflare.com) | 连接 GitHub 仓库自动构建 |

---

## 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Vue 3 | ^3.5.39 | 响应式 UI 组件系统 |
| 构建 | Vite | ^8.1.3 | 极速 HMR 与优化打包 |
| 3D 渲染 | Three.js | ^0.185.1 | 星云宇宙、螺旋时间轴 |
| 手势识别 | MediaPipe Hands | — | 摄像头手势交互控制 |
| 语音交互 | Web Speech API | — | 语音识别 + 语音合成 (TTS) |
| LLM | OpenAI 兼容接口 | — | AI 语音助手（命令/闲聊双模式） |
| 图像生成 | GPT Image 2 / Seedance 2.0 | — | AI 生成背景图与宣传视频 |
| 动画编排 | GSAP | — | 入口页时间线动画序列 |
| 样式 | CSS3 Liquid Glass | — | 玻璃拟态 UI 设计风格 |
| 知识图谱 | 自研 KnowledgeEngine | — | 动漫关系查询与智能推荐 |

---

## 数据说明

项目内置了丰富的动漫数据，涵盖 1963 年至今的经典作品：

| 数据文件 | 大小 | 用途 |
|---------|------|------|
| `anime-core.json` | 146KB | 动漫核心条目（标题、类型、评分、年份等） |
| `anime-corpus.json` | 4.3MB | 完整动漫语料库（含内嵌 relations，用于 LLM 上下文增强与知识图谱构建） |
| `genre-manifest.json` | 2KB | 19 种类型清单及颜色映射 |

> **优化说明**：原 `knowledge-graph.json`（6.1MB）已移除，知识图谱改由 `DataEngine.buildGraphFromCorpus()` 从 corpus 内嵌的 relations 字段纯内存构建，首屏加载减少 6MB。

---

## 脚本工具

| 脚本 | 类型 | 用途 |
|------|------|------|
| `fetch-anilist.js` | Node.js | 从 AniList 抓取动漫数据 |
| `build-knowledge-graph.js` | Node.js | 构建知识图谱 JSON |
| `enrich-corpus.js` | Node.js | 丰富语料库内容 |
| `call-sensenova.js` | Node.js | 调用 SenseNova 图像生成 API |
| `call-minimax.js` | Node.js | 调用 MiniMax 视频生成 API |
| `generate_videos_modellix.py` | Python | 通过 Modellix API 生成宣传视频 |
| `generate_pv.py` | Python | PV 视频生成辅助 |
| `generate_remaining_characters.py` | Python | 补充生成剩余角色图片 |
| `create_video_reference_frames.py` | Python | 制作视频参考帧 |
| `make_composite_frame.py` | Python | 合成视频帧 |
| `verify_phases.py` | Python | 验证应用各阶段渲染 |
| `check-galaxy-smoke.py` | Python | 检查星云特效渲染 |

> Python 脚本需要设置 `MODELLIX_API_KEY` 环境变量。

---

## 设计文档

项目 `docs/` 目录包含完整的设计文档：

| 文档 | 内容 |
|------|------|
| `splash-animation-spec.md` | 启动动画规格说明 |
| `nebula-entrance-v2-implementation-guide.md` | 入口页 v2 实现指南 |
| `visual-design-summary.md` | 视觉设计总结 |
| `visual-optimization-proposal-v3.md` | 视觉优化提案 v3 |
| `visual-upgrade-progress-v1.md` | 视觉升级进度记录 |
| `video-generation-report.md` | AI 视频生成报告 |
| `updream-video-generation-guide.md` | 视频生成操作指南 |
| `audit-integration-checklist.md` | 审计集成检查清单 |
| `review-report.md` | 评审报告 |

---

## 角色阵容

8 位 ISML（国际最萌大会）冠军女主角，构成星云编年史的核心角色：

| # | 角色 | 作品 | 主题色 | 萌王届 |
|---|------|------|--------|--------|
| 1 | 薇尔莉特 · 伊芙加登 | 紫罗兰永恒花园 | 蓝紫 | 2019 |
| 2 | 秋山澪 | K-ON! | 靛蓝 | 2013 |
| 3 | 立华奏 | Angel Beats! | 白银 | 2010 |
| 4 | 夏娜 | 灼眼的夏娜 | 绯红 | 2009 |
| 5 | 加藤惠 | 路人女主的养成方法 | 樱粉 | 2017 |
| 6 | 雷姆 | Re:从零开始的异世界生活 | 水蓝 | 2017 |
| 7 | 伊蕾娜 | 魔女之旅 | 琥珀 | 2021 |
| 8 | 御坂美琴 | 某科学的超电磁炮 | 电光紫 | 2010 |

---

## 注意事项

- `.env` 包含私人 API Key，已被 `.gitignore` 排除，**请勿手动提交**
- 首次加载主应用时会请求摄像头权限（手势识别），**仅用于本地处理，不会上传**
- 播放页默认读取 `shared-data.js` 中的 Bilibili BV 号或 `videoUrl`，未配置时显示"暂无片源"
- `UniversePhase` 组件含 Three.js（551KB），使用**异步组件按需加载**，首屏不会加载
- 入口页支持**空格键快速跳过动画**，适合二次访问
- 推荐使用 **Chrome / Edge** 浏览器以获得最佳 WebGL 与 Web Speech API 兼容性

---

## 性能优化记录

### 首屏加载优化

| 优化项 | 说明 |
|--------|------|
| **boot-curtain 三重保障** | `window.load` + Vue 挂载后 `nextTick` + 7s 超时兜底，确保加载遮罩永不卡死 |
| **视频延迟加载** | LoadingPhase 进度 ≥ 80% 后才请求视频 src，避免抢占核心数据带宽 |
| **知识图谱内存化** | 移除 6MB `knowledge-graph.json`，改由 `buildGraphFromCorpus` 从 corpus 内嵌 relations 纯内存构建（<10ms） |
| **Google Fonts 超时降级** | 3 秒超时后放弃远程字体，回退本地 `NotoSansCJKsc-Bold.otf` |

### 数据可靠性

| 优化项 | 说明 |
|--------|------|
| **指数退避重试** | `retryFetch` 最多 3 次重试，间隔 500ms → 1s → 2s，避免请求风暴 |
| **空数据兜底** | 核心集 + 全集均失败时返回 1 条欢迎数据，保证 UI 不白屏 |
| **localStorage 缓存** | 命中缓存立即返回，后台静默刷新 |

### 渲染与交互优化

| 优化项 | 说明 |
|--------|------|
| **粒子设备分级** | 移动端粒子数 ×0.75，桌面端全量，Canvas 渲染平滑 |
| **RAF 节流** | mousemove 事件通过 `requestAnimationFrame` 节流，避免每帧触发 98 个粒子更新 |
| **相位 crossfade** | `Transition` 去掉 `mode="out-in"`，四相位绝对定位重叠，opacity 交叉溶解无黑屏 |
| **film grain 降级** | Universe 阶段降低 grain 透明度至 0.015（不暂停），保留宇宙尘埃氛围 |
| **按钮交互防抖** | LandingPhase 2.6s 后启用交互，固定按钮尺寸防止 box model 计算异常 |

### 构建优化

| 优化项 | 说明 |
|--------|------|
| **Terser 压缩** | 移除 `console.log/info/debug`，保留 `warn/error` 用于线上诊断 |
| **target es2020** | 可选链 / 空值合并不转译，代码更小，2020 年后浏览器全覆盖 |
| **代码分割** | Three.js / Vue / 业务代码分离打包，UniversePhase 异步按需加载 |

---

## 开发路线图

### 已完成

- [x] Vue 3 + Vite 基础架构搭建
- [x] Three.js 星云宇宙可视化
- [x] 8 位角色登录页（Liquid Glass 风格）
- [x] LLM 语音助手（命令 + 闲聊双模式）
- [x] MediaPipe 手势识别控制
- [x] 知识图谱引擎（内存构建，无需下载 6MB 图谱文件）
- [x] AI 生成宣传视频（3 部星云主题）
- [x] 全局错误边界与 UI 音效
- [x] GitHub Pages CI/CD 自动部署
- [x] 沉浸模式 + 轻量模式双入口

### 进行中

- [ ] 更多动漫作品数据补充（目标 100+ 部）
- [ ] 角色关系图谱可视化（力导向图）

### 规划中

- [ ] PWA 离线支持
- [ ] 多语言国际化（i18n）
- [ ] 用户收藏与观看历史
- [ ] 社区评分与评论系统
- [ ] VR 星云探索模式

---

## 贡献指南

欢迎任何形式的贡献！无论是提交 Bug、建议新功能，还是直接提交 Pull Request。

### 提交 PR 步骤

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 代码规范

- Vue 组件使用 `<script setup>` 语法
- CSS 类名使用 BEM 命名规范
- 引擎模块遵循单一职责原则
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式

---

## 常见问题

<details>
<summary><b>为什么页面加载后只看到黑色背景？</b></summary>

这通常是因为 WebGL 不可用或正在加载资源。请确保使用 Chrome / Edge 浏览器，并检查网络连接。页面会自动降级到轻量模式。
</details>

<details>
<summary><b>AI 语音助手无法使用？</b></summary>

语音助手需要配置 `.env` 文件中的 LLM API Key。请参照「快速开始 → 配置 LLM API Key」章节进行配置。未配置时，语音识别和手势控制功能仍可正常工作。
</details>

<details>
<summary><b>如何添加新的动漫作品？</b></summary>

编辑 `public/data/anime-core.json`，按照现有条目格式添加新作品数据，同时更新封面图片到 `public/images/` 目录。
</details>

<details>
<summary><b>摄像头权限被拒绝怎么办？</b></summary>

手势识别功能需要摄像头权限。您可以在浏览器设置中重新授权。即使不授权，应用的其他功能（语音、点击交互）仍可正常使用。
</details>

---

<p align="center">
  <sub>如果这个项目对你有帮助，欢迎 ⭐ Star 支持！</sub>
  <br /><br />
  <img src="https://img.shields.io/badge/Made%20with-%E2%9D%A4%EF%B8%8F-8A2BE2?style=for-the-badge" alt="Made with love" />
  &nbsp;
  <img src="https://img.shields.io/badge/Powered%20by-AI%20%2B%20Vue%20%2B%20Three.js-42b883?style=for-the-badge" alt="Tech Stack" />
</p>

<p align="center">
  <strong>Author</strong>: mw2wbyys6t-sudo &nbsp;·&nbsp; <strong>License</strong>: MIT
  <br />
  <sub>星云编年史 &copy; 2025 · 六十年动漫，一颗星云</sub>
</p>
