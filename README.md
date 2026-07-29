# 星云编年史 · Nebula Chronicle

> 一款融合动漫编年史可视化、AI 语音助手与手势控制的沉浸式网页应用。

## 项目简介

《星云编年史》以 1963 年至今的经典日本动画为数据基础，将时间轴化作可探索的星云次元。用户可以通过语音或手势与系统交互，让 LLM 助手帮忙查找、播放作品，也能在闲暇时切换到闲聊模式进行日常对话。

本项目基于 Vue 3 + Vite 构建，纯前端实现，无需后端即可运行；LLM 与 TTS 能力直接调用浏览器及第三方 API。

## 主要功能

### 1. 动漫编年史可视化
- 基于 Three.js 的星云背景与螺旋时间轴
- 按年份、类型、作品展示经典动画卡片
- 点击作品可查看详情，并跳转播放页

### 2. 知识图谱引擎
- 基于 `knowledge-graph.json`（6.1MB）的动漫关系图谱
- 支持关系查询、路径发现、智能推荐
- LRU 缓存优化，KnowledgeEngine 引擎驱动

### 3. LLM 多轮语音助手
- **命令模式**：通过语音/文字指令查找作品、控制播放、询问信息
- **闲聊模式**：切换后进入日常对话，支持多轮上下文记忆（默认保留最近 10 轮）
- 语音合成（Web Speech API）自动朗读助手回复
- 支持 `.env` 配置自有 API Key

### 4. 手势与语音控制
- 集成 MediaPipe Hands，支持摄像头手势识别
- 语音指令可控制播放、暂停、上一部、下一部等操作
- 播放页支持 Bilibili BV 号或本地视频源

### 5. Liquid Glass 风格统一入口页
- **统一入口 `/index.html`**：融合沉浸启动动画与轻量登录页的一体化首页
  - **沉浸模式**：Three.js 3D 星云世界启动动画，GSAP 时间线编排
    - 星云苏醒 → 玻璃凝聚 → 角色觉醒 → 编年史展开 → 星图散开成粒子 → 星云漩涡 → 标题水印 + 登录界面升起 → 角色凝聚为守护星座环
  - **轻量模式**：8 位 ISML 冠军女主角海报轮播 + 左侧角色信息卡片 + 右侧 Liquid Glass 登录卡片
    - 轮播切换时角色信息、主题色、玻璃卡片光效实时联动
    - Canvas 粒子背景与鼠标跟随玻璃高光
  - 双模式一键切换：右上角「轻量模式 / 沉浸动画」按钮
  - 智能降级：移动端、WebGL 不支持或偏好减少动画时自动进入轻量模式
  - 交互反馈：输入框主题色循环发光、按钮流光扫过/涟漪、登录成功星尘爆发、空格跳过动画
  - 程序化环境背景音乐（需用户手动开启）
- 角色海报：薇尔莉特 · 伊芙加登、秋山澪、立华奏、夏娜、加藤惠、雷姆、伊蕾娜、御坂美琴

### 6. 全局错误边界与 UI 音效
- 任何子组件渲染错误均不会白屏，显示"星辰信号中断"降级 UI
- Web Audio API 合成 UI 音效：select / hover / swipe / back / phaseChange / error 等
- 支持 `prefers-reduced-motion` 减少动画偏好
- 移动端触摸优化（防双击缩放、44px 最小触控区域）

### 7. 角色展示短片
- `/videos/character_showcase.mp4`：8 位萌王角色 Ken Burns 展示短片
- 1920×1080 / 41.6 秒 / 约 15 MB，可直接作为项目宣传或 BGM 背景素材

## 项目结构

```
wonderful-screen/
├── src/                          # Vue 3 源码
│   ├── components/               # 8 个 Vue 组件
│   │   ├── LoadingPhase.vue      # 加载阶段
│   │   ├── ShowcasePhase.vue     # 展示阶段
│   │   ├── LandingPhase.vue      # 登录阶段
│   │   ├── UniversePhase.vue     # 星云宇宙阶段
│   │   ├── HUD.vue               # 平视显示器
│   │   ├── NodePanel.vue         # 节点面板
│   │   └── OrbitTimeline.vue     # 轨道时间轴
│   ├── composables/              # 可组合函数
│   │   ├── useAudio.js           # 音频控制
│   │   ├── useData.js            # 数据管理
│   │   ├── useVoice.js           # 语音交互
│   │   ├── useUiSound.js         # UI 音效合成
│   │   ├── useProgressiveImage.js # 渐进式图片懒加载
│   │   └── useVideoBackground.js # 视频背景
│   ├── engines/                  # 引擎模块
│   │   ├── ai/                   # AI 引擎、语音旁白、意图解析
│   │   ├── core/                 # EventBus、StateEngine
│   │   ├── data/                 # DataEngine、KnowledgeEngine
│   │   ├── interaction/          # 手势、语音、交互引擎
│   │   ├── universe/             # GalaxyEngine、SpiralUniverse
│   │   └── feedback/             # CursorRenderer、FeedbackEngine
│   ├── styles/                   # 全局样式
│   ├── App.vue                   # 根组件（含错误边界）
│   └── main.js                   # 入口
├── public/                       # 静态资源
│   ├── data/                     # 数据文件
│   │   ├── anime-core.json       # 动漫核心条目数据（146KB）
│   │   ├── anime-corpus.json     # 动漫语料库（4.3MB）
│   │   ├── genre-manifest.json   # 类型清单
│   │   └── knowledge-graph.json  # 知识图谱（6.1MB）
│   ├── images/                   # 封面图、角色海报、特效贴图
│   ├── fonts/                    # 字体文件
│   └── js/                       # 公共 JS（LLM 引擎、共享数据）
├── dist/                         # 构建产物（npm run build 生成）
├── docs/                         # 设计文档与规划
├── scripts/                      # 工具脚本
├── index.html                    # 入口页
├── package.json                  # 依赖配置
├── vite.config.js                # Vite 构建配置
├── .env.example                  # 环境变量模板
└── .github/workflows/pages.yml   # GitHub Pages CI/CD
```

## 快速开始

### 开发模式

```bash
npm install
npm run dev
```

然后打开浏览器访问 `http://localhost:8080/`

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录，可直接部署到任何静态托管服务。

### 预览构建产物

```bash
npm run preview
```

### 配置 LLM API Key

1. 复制配置模板：
   ```bash
   cp .env.example .env
   ```
2. 编辑 `.env`，填入你的 API Key 与模型地址：
   ```
   VITE_LLM_API_KEY=your_api_key_here
   VITE_LLM_BASE_URL=https://your-api-endpoint.com/v1
   VITE_LLM_MODEL=your_model_name
   ```
3. `.env` 已加入 `.gitignore`，Key 不会被提交到仓库。

## 部署

### GitHub Pages

项目已配置 GitHub Actions 自动部署：
1. 推送代码到 `main` 分支
2. 前往仓库 Settings → Pages → Source 选择 **GitHub Actions**
3. 每次推送自动构建并部署到 `https://<username>.github.io/wonderful-screen/`

### 其他静态托管

将 `dist/` 目录上传到 Vercel / Netlify / Cloudflare Pages 等平台即可。

## 技术栈

- **框架**：Vue 3.5 + Vite 8
- **3D 渲染**：Three.js 0.185
- **手势识别**：MediaPipe Hands
- **语音交互**：Web Speech API（语音识别 + 语音合成）
- **LLM**：兼容 OpenAI 风格接口（LongCat / Modellix 等）
- **图像生成**：GPT Image 2（角色海报）
- **测试**：Playwright（页面功能）、Node.js Function 构造器（语法检查）

## 测试

### 语法检查

```bash
node check-syntax.js
```

### 页面功能测试（需先启动开发服务器）

```bash
npm run dev &
python3 test-pages.py
```

## 数据说明

| 数据文件 | 大小 | 用途 |
|---------|------|------|
| `anime-core.json` | 146KB | 动漫核心条目数据（标题、类型、评分等） |
| `anime-corpus.json` | 4.3MB | 完整动漫语料库 |
| `genre-manifest.json` | 2KB | 19 种类型清单及颜色映射 |
| `knowledge-graph.json` | 6.1MB | 动漫关系图谱（节点 + 边） |

## 注意事项

- `.env` 包含私人 API Key，已被 `.gitignore` 排除，请勿手动提交。
- 首次加载主应用时会请求摄像头权限，用于手势识别；仅用于本地处理，不会上传。
- 播放页默认优先读取 `shared-data.js` 中的 `bilibili` BV 号或 `videoUrl`，未配置时会显示"暂无片源"占位。
- `UniversePhase` 组件含 Three.js（551KB），使用异步组件按需加载，首屏不会加载。

## 在线体验

静态网页体验链接：https://mw2wbyys6t-sudo.github.io/wonderful-screen/

---

**作者**：mw2wbyys6t-sudo  
**License**：MIT
