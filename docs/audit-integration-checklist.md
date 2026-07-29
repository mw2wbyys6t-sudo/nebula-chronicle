# 星云编年史 · 宇宙主站集成审计清单

> **审计日期**：2026-07-02  
> **审计对象**：`/workspace/src` 下的 Vue 3 + Vite 实现（App.vue / components / composables）及相关数据脚本  
> **依据文档**：
> - `/workspace/docs/superpowers/specs/2026-07-01-nebula-universe-app-design.md`
> - `/workspace/docs/superpowers/plans/2026-07-01-nebula-universe-app-plan.md`
> - `/workspace/docs/visual-optimization-proposal-v3.md`
> - `/workspace/docs/review-report.md`

---

## 1. Summary（摘要）

当前实现已搭好 Vue 3 + Vite 四阶段骨架（Loading → Showcase → Entrance → Galaxy），`useData` / `useAudio` / `useGalaxy` 三大 composable 已就位，Galaxy 阶段具备基础 Three.js 场景、相机控制、hover/click 交互与详情面板。但项目**尚未达到可构建、可联调状态**，主要问题如下：

1. **构建失败**：`EntrancePhase.vue:477` 与 `GalaxyPhase.vue:134` 出现 `<template<template>` 的代码拼接损坏，导致 `npm run build` 无法通过。
2. **并行修改未收敛**：审计过程中 `useGalaxy.js`、`ShowcasePhase.vue`、`EntrancePhase.vue` 等文件状态持续变化，曾出现重复 import、重复 `<script setup>` 等损坏痕迹，说明多 Agent 并行写入存在合并冲突。
3. **数据层未达标**：`data/anime-corpus.json` 仅 50 部作品，远低于设计要求的 500–1000；且缺少 `titleChinese`、导演提取逻辑有误。
4. **交互未闭环**：HUD 的搜索框仅有 `v-model`，流派筛选仅改变本地状态，均未与 `useGalaxy` 的星系渲染联动；hover 恒星无视觉放大反馈。
5. **视觉与性能待打磨**：Loading 进度为假进度、星云目前只是 `THREE.Points` 而非体积雾/着色器、星座连线为 O(n²) 双重循环、缺少 LOD/Frustum Culling。

---

## 2. P0 / P1 / P2 集成检查清单

### P0 — 阻塞构建与 MVP 核心功能（必须先完成）

- [ ] **修复代码拼接损坏**
  - `src/components/EntrancePhase.vue:477`：`</style>` 后紧跟 `<template<template>`，需恢复为正常的 `<template>`。
  - `src/components/GalaxyPhase.vue:134`：同上。
  - 全仓库扫描 `<style>...</style><template`、重复 `import { ... } from 'import` 等拼接痕迹。
- [ ] **跑通 `npm run build`**，确保无新 error / warning。
- [ ] **数据量达标**：修改 `scripts/fetch-anilist.js` 并重新拉取，使 `data/anime-corpus.json` 达到 500–1000 部。
- [ ] **数据字段对齐设计规范**：
  - 增加 `titleChinese`（可先用 `titleEnglish` 占位或接入翻译逻辑，但不能缺失）。
  - 修复 `director` 提取逻辑：当前按 role 包含 `director` 匹配，可能匹配到配音演员（如 Frieren 的 `Brigitte Lecordier`），应精确匹配 `Director` / `Chief Director` 并优先取 `original` 制作人员。
  - 补充年代分层采样（1960s–2020s），避免全部集中在高分新作。
- [ ] **HUD 搜索/筛选与星系联动**：`HUD.vue` 的 `searchText` / `activeGenre` 必须能传递给 `useGalaxy` 并实际过滤/高亮恒星。
- [ ] **hover 视觉反馈**：`useGalaxy.js` 中 hover 恒星时，需通过 `setMatrixAt` / `setColorAt` 实现实例放大或光晕变色。
- [ ] **星座连线性能基线**：当前 `buildConstellations` 为 O(n²)，600 颗星约 18 万次比较，需加距离/关系上限或空间索引，避免低端设备卡顿。
- [ ] **选中态与 tooltip 状态隔离**：点击打开 `DetailPanel` 后，全局 `body.style.cursor = 'pointer'` 应恢复，避免遮挡面板交互。

### P1 — Beta 体验闭环（构建稳定后推进）

- [ ] **LoadingPhase 真实进度**：基于 `data/anime-corpus.json`、`genre-manifest.json`、字体、首帧图片的实际加载进度更新 `progress`，而非写死 50 → 100。
- [ ] **LoadingPhase 游戏化角色**：将当前 CSS `energy-figure` 替换为 SVG 角色剪影或能量体，并增加手绘感光晕与呼吸动画。
- [ ] **ShowcasePhase 全息质感**：补齐 RGB 分离 glitch、扫描线、玻璃折射高光；当前已有 `card-glitch` / `card-scanlines` 等结构，需验证视觉强度并修复重复拼接导致的样式冗余。
- [ ] **EntrancePhase 过渡动画**：点击「开始旅程」后增加全屏白闪/星爆过渡，再进入 Galaxy。
- [ ] **EntrancePhase 全息标题**：标题文字增加扫描线、微弱 RGB 分离，与 `nebula-chronicle.html` 封面风格对齐。
- [ ] **useGalaxy 星云体积化**：将 `THREE.Points` 升级为数(shader)体积雾或分层粒子云，体现「每流派一片巨大星云」。
- [ ] **useGalaxy 性能分级**：增加 LOD、Frustum Culling、移动端粒子预算控制，提供「轻量模式」开关。
- [ ] **HUD 搜索实时过滤**：输入关键词时高亮匹配恒星并临时拉近相机。
- [ ] **DetailPanel 信息完整化**：展示标签、工作室、导演、格式、集数，并保留「看动漫」跳转。
- [ ] **移动端适配**：HUD 顶部布局在窄屏下不重叠；Galaxy 阶段提供 2D 星图/列表降级。
- [ ] **组件化拆分**：按设计规范拆出 `ChronicleCore.vue` / `NebulaCloud.vue` / `StarField.vue`，降低 `useGalaxy.js` 单文件复杂度。

### P2 — 质感打磨与工程化（正式版前）

- [ ] **useAudio 氛围音升级**：当前为 110Hz 单音正弦波，建议升级为程序化氛围音或接入免版税 BGM，并保留开关。
- [ ] **HUD 语音开关**：设计规范要求右上角有语音开关，当前缺失。
- [ ] **无障碍与降级**：完整实现 `prefers-reduced-motion` 降级；WebGL 不可用时提供静态星图 fallback。
- [ ] **传播素材**：补齐 `favicon.ico` / `og-image.jpg` 等（可基于现有角色海报合成）。
- [ ] **`watch.html` 联调**：确认 `watch.html?title=...` 能正确接收参数并展示对应作品。
- [ ] **应用 review-report.md 建议**：将旧页面的 WebGL 降级、资源清理、RAF 暂停、CSP/SRI 等经验迁移到新 app。
- [ ] **借鉴 visual-optimization-proposal-v3**：将 Liquid Glass 质感、情绪连续性、角色守护概念酌情引入 Showcase / Entrance 阶段。

---

## 3. 冲突矩阵（Conflict Matrix）

| 改动区域 | 数据扩张 | 视觉升级 | 交互完成 | 冲突说明 |
|---|---|---|---|---|
| `data/*.json` | ● | ○ | ○ | 字段变更（`titleChinese`、`director`、`genres`）会直接影响 `ShowcasePhase`、`DetailPanel`、`useGalaxy` 的颜色/分布/信息展示。 |
| `scripts/fetch-anilist.js` | ● | - | - | 数据量、字段、去重逻辑变更后必须重新生成 JSON。 |
| `src/composables/useGalaxy.js` | ○ | ● | ● | **高冲突区**：视觉升级会改核心/星云/恒星的材质与几何；交互完成会改 API（筛选、hover、选中）与事件回调。建议先定 API 再动视觉。 |
| `src/components/GalaxyPhase.vue` | ○ | ○ | ● | 与 `HUD`、`DetailPanel` 的事件接口、与 `useGalaxy` 的初始化契约（`init` / `onSelect` / `onError`）需要保持一致。 |
| `src/components/HUD.vue` | - | ○ | ● | 搜索/筛选事件需要 `GalaxyPhase` / `useGalaxy` 消费；UI 视觉升级不应改变事件名。 |
| `src/components/EntrancePhase.vue` | - | ● | ○ | 依赖 `useAudio.getLevel()` 做音频可视化；若 `useAudio` 接口或音频源改变，需同步调整。 |
| `src/components/ShowcasePhase.vue` | ○ | ● | - | 数据字段变化会影响全息卡片内容；视觉升级会改卡片材质/动效。 |
| `src/components/LoadingPhase.vue` | - | ● | - | 相对独立，主要依赖 `useData.load()` 的完成事件。 |
| `src/composables/useAudio.js` | - | ● | ○ | 若从单音 osc 升级为 BGM，需保证 `getLevel()` / `getFreqBands()` 仍能驱动可视化。 |
| `src/composables/useData.js` | ● | ○ | ○ | 增加字段/计算属性会影响 `ShowcasePhase` 和 `DetailPanel`。 |

---

## 4. 安全集成顺序

为避免继续出现文件拼接/合并冲突，建议按以下顺序串行推进：

1. **统一基线 & 修复构建**
   - 暂停所有并行写入，锁定当前文件。
   - 修复 `EntrancePhase.vue` / `GalaxyPhase.vue` 的 `<template<template>` 损坏。
   - 全仓库扫描并清理重复代码块。
   - 运行 `npm run build` 直到通过，作为后续所有改动的 CI 门禁。

2. **数据层先行**
   - 修改 `fetch-anilist.js`：修正 `director`、增加 `titleChinese`、补充年代采样、去重。
   - 重新生成 `data/anime-corpus.json` / `data/genre-manifest.json`（500–1000 部）。
   - 验证 `useData.load()` 能正确读取新字段。

3. **`useGalaxy.js` API 与性能基线**
   - 稳定对外接口：`init()`、`filter(genre/query)`、`hoveredAnime`、`selectedId`、`cameraInfo`、`onSelect`、`onError`。
   - 增加 InstancedMesh hover 高亮、星座连线上限、资源清理、resize/事件解绑。
   - 先不替换材质，保证交互可测。

4. **交互闭环**
   - `GalaxyPhase.vue` 接收 `HUD` 的 `filter-genre` / `search` 事件并调用 `useGalaxy.filter()`。
   - `DetailPanel` 展示完整字段，点击「看动漫」跳转 `watch.html?title=...`。
   - 验证 hover tooltip、点击选中、面板关闭全流程。

5. **视觉升级**
   - `LoadingPhase`：真实进度 + SVG 能量体。
   - `ShowcasePhase`：全息 glitch、玻璃质感。
   - `EntrancePhase`：白闪过渡、全息标题、完整视频轮播。
   - `useGalaxy`：体积星云、LOD、Bloom（可选）。

6. **工程化收尾**
   - 移动端降级、`prefers-reduced-motion`、CSP、SRI、`favicon`/`og-image`。
   - 与 `watch.html` 端到端联调。
   - 最终 `npm run build` 与本地预览。

---

## 5. Build Status

| 检查项 | 结果 | 备注 |
|---|---|---|
| `npm install` | ✅ 通过 | 76 packages，0 vulnerabilities |
| `npm run build` | ❌ 失败 | 见下方错误 |
| 新产生的 warning | - | 构建在 transform 阶段中断，未进入打包阶段 |

**当前构建错误：**

```
[plugin vite:vue] /workspace/src/components/EntrancePhase.vue:477:1
RolldownError: Element is missing end tag.
SyntaxError: Element is missing end tag.
```

**根因定位：**

- `src/components/EntrancePhase.vue:477` 处内容为 `<template<template>`，即 `</style>` 后紧跟一个损坏的 `<template` 标签，导致 Vue SFC 解析失败。
- `src/components/GalaxyPhase.vue:134` 存在同样损坏。

**额外观察：**

- 审计初期 `npm run build` 还报过 `src/composables/useGalaxy.js:347` 存在 `import { ref, onUnmounted } from 'import { ref, onUnmounted } from 'vue';` 的语法错误；
- `ShowcasePhase.vue` 早期也出现过多个 `<script setup>` 与模板重复拼接；
- 上述文件在审计过程中状态持续变化，说明**多 Agent 并行写入尚未收敛**，必须先统一基线再推进功能。

---

## 附录：快速自检命令

```bash
# 1. 扫描拼接损坏
grep -rn "<template<template" src/
grep -rn "from 'import {" src/

# 2. 构建验证
npm run build

# 3. 数据量检查
jq 'length' data/anime-corpus.json
jq '.genres | keys | length' data/genre-manifest.json
```
