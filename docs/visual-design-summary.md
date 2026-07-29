# 星云编年史 · 启动页视觉方案总结

> 针对 `/workspace/liquid-glass-demo.html` 的视觉优化方案  
> 日期：2026-06-25  
> 设计师：AI 视觉设计 Agent

---

## 一、参考来源与可借鉴趋势

通过检索 2025–2026 年二次元手游启动页、Apple Liquid Glass / Vision Pro UI、移动端视觉趋势等资料，提炼出 5 条可直接落地的视觉趋势：

| # | 趋势 | 核心特征 | 参考来源 |
|---|---|---|---|
| 1 | **Liquid Glass / 流光玻璃** | 半透明、折射、动态高光、悬浮感、圆润边缘；界面像真实玻璃一样随背景与光线变化。 | Apple WWDC 2025 / iOS 26 / visionOS 26 官方设计语言 |
| 2 | **空间化 3D 沉浸启动页** | 用 WebGL/Three.js 构建可交互的 3D 场景，角色或元素在深度空间中运动，强化第一印象。 | 2025 启动画面设计趋势分析、Vision Pro 空间界面 |
| 3 | **二次元手游「星空 × 角色」构图** | 深色宇宙背景 + 角色环绕/星座排列 + 史诗感大标题；角色是视觉主角，UI 是辅助。 | Honkai: Star Rail、星塔旅人、星际水手等 2025 二次元游戏 |
| 4 | **动态叙事微动效** | 用粒子扩散、光流、渐变变形替代硬切；情绪曲线从神秘 → 惊叹 → 庄严 → 稳定。 | 2025 移动端 UI 趋势报告、游戏启动页案例 |
| 5 | **克制化低饱和渐变 + 表现主义字体** | 背景用低饱和蓝紫渐变，标题用巨型/高对比字体成为视觉锚点；避免高饱和撞色。 | 2025 视觉设计趋势、Apple 发布会级标题处理 |

---

## 二、针对 liquid-glass-demo.html 的视觉优化建议

### 2.1 色彩与氛围

- **深空背景**：当前 `#050714 → #03030a` 已符合基调。建议在 `#space-bg` 上叠加一张低透明度星云图（`nebula-bg.jpg`），让背景从“纯黑渐变”升级为“有体积感的深空”。
- **光斑层次**：现有 3 个 `.orb` 尺寸接近，建议增加一个超大、极淡的中央紫色光晕（`1200px` 级别，透明度 `0.15`），强化“星云漩涡中心”的纵深感。
- **角色辉光**：为 8 张卡片边框/体积光使用角色主题色时，加入 `0.3s` 色相微动，让每张卡片在轨道中呈现“呼吸”效果。

### 2.2 字体与标题

- **中文标题**：`font-weight: 900` + `letter-spacing: 0.15em` 已足够大气。建议为「星云编年史」增加一层极淡的 `text-shadow` 动画（`0s ~ 2s` 内光晕从 `0` 扩散到 `40px`），模拟标题从星云中“点亮”。
- **英文副标题**：`NEBULA CHRONICLE` 可使用更宽的字距（`letter-spacing: 0.6em`）并加入 `text-shadow: 0 0 30px rgba(0,243,255,0.6)`，使其成为霓虹青蓝的光标。
- **新增装饰线**：在副标题下方放置 `title-ornament.png`（居中，宽度 `min(600px, 80vw)`），强化标题的仪式感。

### 2.3 玻璃质感（Liquid Glass）

当前 `MeshPhysicalMaterial` 参数：

```js
transmission: 0.25, roughness: 0.15, thickness: 0.5, clearcoat: 1.0
```

建议调整为：

```js
transmission: 0.55,   // 提升真实折射感
roughness: 0.12,      // 更光滑
thickness: 1.2,       // 增加玻璃体积
ior: 1.5,             // 玻璃折射率
clearcoat: 1.0,
clearcoatRoughness: 0.08,
envMapIntensity: 1.2  // 配合环境/焦散贴图
```

- 为玻璃卡片叠加一层极淡的 `glass-caustic.jpg` 作为环境反射/焦散纹理，增强“光线在玻璃内部流动”的感觉。
- 角色图像边缘建议保留 `1px` 高亮描边（使用 `alphaMap` 或 Shader），模拟玻璃切面的高光。

### 2.4 粒子与特效

- **星点**：当前使用 `PointsMaterial` 无贴图，在高分屏上会显得像方块。建议加载 `particle-glow.png` 作为 `map`，并开启 `transparent: true`、`blending: THREE.AdditiveBlending`、`sizeAttenuation: true`。
- **漩涡粒子**：Phase 6 漩涡释放时，混合使用 `particle-glow.png`（冷色）与 `particle-glow-warm.png`（金色/白色），让粒子从角色主题色向中心白炽渐变。
- **星座连线**：将当前 `LineBasicMaterial` 替换为带纹理的 `Sprite` 或 `LineSegments` + `light-streak.png`，使连线呈现“发光能量束”而非细线。
- **中央魔法阵**：在 Phase 4 展开星图时，于卡片中心浮现 `magic-circle.jpg`（带透明度渐变和缓慢旋转），明确“编年史展开”的叙事节点。

### 2.5 角色排列与动画节奏

- **Phase 4 排列**：建议采用「菱形 + 四角」的 8 点星座布局，而非纯圆环。这样 8 张卡片在画面中的纵深感更强，也更容易连线成“星图”。
  - 上、下、左、右各 1 张（距离中心 `5.0`）
  - 四角各 1 张（距离中心 `5.5`，前后错落 `±0.8`）
- **Phase 8 登录就绪**：两侧角色建议微微朝向中央（`rotation.y` 约 `±0.25`），形成“拱卫登录框”的构图，而不是完全平行。
- **悬浮呼吸**：登录界面升起后，两侧角色保持缓慢的 `y` 轴正弦浮动（振幅 `0.08`，周期 `3s ~ 5s`），让背景不死板。

### 2.6 登录卡片

- 当前登录卡片的玻璃质感已不错。建议：
  - 增加 `glass-caustic.jpg` 作为 `background-image` 并设 `mix-blend-mode: overlay`，模拟表面光影流动。
  - 输入框聚焦时的光晕从青色扩展到角色主题色循环，强化“星图标识/星云密钥”的科幻感。

---

## 三、新增 / 修改的素材清单

### 3.1 已存在素材

| 文件 | 路径 | 用途 | 状态 |
|---|---|---|---|
| 8 张角色海报 | `/workspace/images/login/*.jpg/png` | 玻璃卡片贴图 | 已存在 |
| 星云背景 | `/workspace/images/generated/nebula-bg.jpg` | 深空背景叠加层 | 已存在 |
| 魔法阵/星图 | `/workspace/images/generated/magic-circle.jpg` | Phase 4 中央星座阵 | 已存在 |
| 玻璃圆盘 | `/workspace/images/generated/title-glass-disc.jpg` | 标题底座纹理 | 已存在 |

### 3.2 本次新增素材

| 文件 | 路径 | 用途 | 生成方式 |
|---|---|---|---|
| 粒子光晕（冷色） | `/workspace/images/effects/particle-glow.png` | 星点、漩涡粒子贴图 | Pillow 程序化生成 |
| 粒子光晕（暖色） | `/workspace/images/effects/particle-glow-warm.png` | 漩涡高潮粒子贴图 | Pillow 程序化生成 |
| 光条 | `/workspace/images/effects/light-streak.png` | 星座连线纹理 | Pillow 程序化生成 |
| 标题装饰线 | `/workspace/images/effects/title-ornament.png` | 标题下方装饰 | Pillow 程序化生成 |
| 玻璃焦散 | `/workspace/images/effects/glass-caustic.jpg` | 玻璃表面/环境反射纹理 | Pillow 程序化生成 |

> 说明：本次环境未配置 Seedream / Imagen API Key，无法调用云端图像生成。因此使用 Pillow 程序化生成了 5 张轻量特效贴图；若后续需要更高精度的史诗背景或角色立绘，可替换为 AI 生成图。

---

## 四、与现有代码的对接方式

### 4.1 CSS 层

```css
/* 深空背景叠加星云 */
#space-bg {
    background:
        url('images/generated/nebula-bg.jpg') center/cover no-repeat,
        radial-gradient(ellipse at 20% 30%, rgba(77, 166, 255, 0.12) 0%, transparent 50%),
        /* ... 保留原有渐变 ... */
}

/* 标题装饰 */
.title-ornament {
    width: min(600px, 80vw);
    height: auto;
    margin: 12px 0 24px;
    opacity: 0.85;
}

/* 玻璃卡片焦散 */
.glass-card::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 32px;
    background: url('images/effects/glass-caustic.jpg') center/cover;
    mix-blend-mode: overlay;
    opacity: 0.18;
    pointer-events: none;
}
```

### 4.2 Three.js 层

```js
// 加载纹理
const texLoader = new THREE.TextureLoader();
const particleTexture = texLoader.load('images/effects/particle-glow.png');
const streakTexture = texLoader.load('images/effects/light-streak.png');
const magicCircleTexture = texLoader.load('images/generated/magic-circle.jpg');
const causticTexture = texLoader.load('images/effects/glass-caustic.jpg');

// 星点 / 漩涡粒子
const particleMaterial = new THREE.PointsMaterial({
    size: 0.12,
    map: particleTexture,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    vertexColors: true
});

// 星座连线（使用纹理精灵替代 LineBasicMaterial 可获得更强光感）
// 实现思路：在卡片之间生成细长的 Plane/Sprite，贴 light-streak.png

// 中央魔法阵精灵
const magicSpriteMat = new THREE.SpriteMaterial({
    map: magicCircleTexture,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    color: 0x88ccff
});

// 玻璃卡片环境反射增强
// 将 causticTexture 作为 envMap 或叠加在 card.material 的 lightMap 中
```

### 4.3 HTML 层

在 `#title-layer` 中增加装饰图：

```html
<div id="title-layer">
    <div class="title-disc"></div>
    <h1>星云编年史</h1>
    <p class="subtitle">NEBULA CHRONICLE</p>
    <img src="images/effects/title-ornament.png" alt="" class="title-ornament">
    <p class="tagline">群星已就位，编年史待启</p>
</div>
```

### 4.4 推荐接入顺序

1. **Phase 1**：将 `#space-bg` 替换为星云图 + 渐变叠加。
2. **Phase 3**：为角色卡片应用新的 `MeshPhysicalMaterial` 参数与焦散纹理。
3. **Phase 4**：加载 `magic-circle.jpg` 并淡入旋转；星座连线使用 `light-streak.png` 增强光感。
4. **Phase 6**：为漩涡粒子设置 `particle-glow.png` / `particle-glow-warm.png`。
5. **Phase 7**：标题层加入 `title-ornament.png` 与光晕动画。
6. **Phase 8**：登录卡片叠加焦散纹理；两侧角色启用缓慢呼吸浮动。

---

## 五、核心建议摘要

1. **背景升级**：用 `nebula-bg.jpg` 替换纯黑渐变，增加中央超大光晕，让“星云苏醒”更有体积感。
2. **玻璃质感升级**：调高 `transmission/ior/thickness`，叠加 `glass-caustic.jpg`，让角色卡片更像 Apple Liquid Glass。
3. **粒子升级**：星点和漩涡粒子贴上 `particle-glow.png`，连线使用 `light-streak.png`，避免方块像素感。
4. **星图仪式感**：Phase 4 中央浮现 `magic-circle.jpg`，标题下方加入 `title-ornament.png`。
5. **角色排列优化**：由纯圆环改为菱形/星座式 8 点布局，登录就绪后角色微微朝向中央并持续呼吸浮动。

---

## 六、待后续确认

- 是否需要进一步用云端 AI 生成更高精度的史诗背景或角色立绘（当前环境缺少 API Key）。
- 登录框升起后，两侧 8 张卡片是否全部保留，还是在移动端仅保留 4 张以提升性能。
- 是否需要为 `prefers-reduced-motion` 提供静态降级版本（保留星云背景 + 直接显示登录卡片）。
