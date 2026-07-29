// src/engines/universe/GalaxyEngine.js
// AnimeVerse 3D 星系渲染引擎：年份银河 + 知识图谱连线
// Three.js 按需引入，配合 Vite/Rolldown tree-shaking 把 three chunk 从 528KB 压到 ~220KB

import {
  Scene, PerspectiveCamera, WebGLRenderer,
  Group, Points, LineSegments, Mesh, Sprite, SpriteMaterial,
  SphereGeometry, BufferGeometry, BufferAttribute, Float32BufferAttribute,
  PointsMaterial, LineBasicMaterial, MeshBasicMaterial, ShaderMaterial,
  CanvasTexture, FogExp2,
  Raycaster, Vector2, Vector3,
  Color, AdditiveBlending, SRGBColorSpace, LinearFilter, NormalBlending
} from 'three';
import { DataEngine } from '../data/DataEngine.js';
import { KnowledgeEngine } from '../data/KnowledgeEngine.js';
import { TimelineEngine } from './TimelineEngine.js';
import { StateEngine } from '../core/StateEngine.js';
import { bus } from '../core/EventBus.js';

function createGlowTexture(size = 128) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  g.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function getDeviceTier() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (memory <= 4 || cores <= 4 || isMobile) return 'low';
  if (memory >= 8 && cores >= 8 && dpr <= 2) return 'high';
  return 'medium';
}

export function GalaxyEngine(canvasRef, options = {}) {
  let renderer, scene, camera, galaxyGroup;
  let starPoints, ringLines, relationLines, coreMesh;
  let bgStarField;            // 背景静态星野（深度感）
  let nebulaDust;             // 星云尘埃粒子
  let glowTexture;
  let selectionRing;          // 选中恒星外的脉冲环
  let hoverLabelSprite;       // 悬停恒星的名字标签
  let hoverLabelCtx;
  let hoverLabelCanvas;
  let labelTexture;
  let yearLabelSprites = [];  // 年份环上的年代标签
  let animationId;
  let resizeHandler;
  const cleanupFns = [];

  const raycaster = new Raycaster();
  const pointer = new Vector2();

  // 标签画布（高 dpr）
  const LABEL_W = 512, LABEL_H = 96;

  const INITIAL_CAMERA = {
    theta: 0,
    phi: Math.PI / 2.5,
    radius: 260,
    target: new Vector3(0, 0, 0)
  };

  const cameraState = {
    theta: INITIAL_CAMERA.theta,
    phi: INITIAL_CAMERA.phi,
    radius: 1800, // 从远处开始，fly-in 动画 dolly 进来
    target: INITIAL_CAMERA.target.clone(),
    animating: false,
    flyIn: { active: true, t: 0, duration: 2.8 }
  };

  // 手势控制状态
  const handControl = {
    enabled: false,
    pos: { x: 0.5, y: 0.5 },
    lastPos: { x: 0.5, y: 0.5 },
    velocity: { x: 0, y: 0 },
    lastMoveTime: 0,
    zoomVelocity: 0,
    firstMove: true,
    sensitivity: 2.4,      // 手势移动转相机旋转的灵敏度
    edgeSensitivity: 0.35, // 边缘持续旋转强度
    deadZone: 0.08,        // 中心死区（避免手轻微抖动引起旋转）
    smooth: 0.18,          // 速度平滑系数
    inputMode: 'mouse'     // mouse | hand
  };

  let isVisible = true;
  let isPaused = false;
  let visibilityHandler = null;
  let lastFrameTime = performance.now();

  const hoveredId = { value: null };
  const selectedId = { value: null };
  const idToIndex = new Map();
  const indexToId = new Map();
  let starPositions = new Float32Array(0);
  let starColors = new Float32Array(0);
  let starSizes = new Float32Array(0);
  let starTwinklePhase = new Float32Array(0);
  let starTwinkleSpeed = new Float32Array(0);
  let starOriginalColors = new Float32Array(0);

  // 缓存 year/genre -> index[]，避免高亮时 O(n) 查表
  const indicesByYear = new Map();
  const indicesByGenre = new Map();
  let currentSearchIds = new Set();

  const tier = getDeviceTier();
  const MAX_RELATION_LINES = tier === 'low' ? 80 : tier === 'medium' ? 150 : 300;

  function init() {
    if (!canvasRef.value) return false;

    // 严格预检 WebGL：部分浏览器虽能创建 WebGLRenderer，但上下文异常会导致黑屏
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
    if (!gl) {
      if (options.onError) options.onError('当前环境不支持 WebGL');
      return false;
    }

    try {
      scene = new Scene();
      scene.fog = new FogExp2(0x03030a, 0.0018);

      camera = new PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 4000);
      updateCamera();

      renderer = new WebGLRenderer({ canvas: canvasRef.value, antialias: tier !== 'low', alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, tier === 'low' ? 1 : 2));
      renderer.setClearColor(0x000000, 0);

      galaxyGroup = new Group();
      scene.add(galaxyGroup);

      glowTexture = createGlowTexture(128);

      buildCore();
      buildStars();
      buildBackgroundStars();
      buildNebulaDust();
      buildYearRings();
      buildSelectionRing();

      resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', resizeHandler);

      visibilityHandler = () => {
        isVisible = document.visibilityState !== 'hidden';
        if (isVisible) lastFrameTime = performance.now();
      };
      document.addEventListener('visibilitychange', visibilityHandler);

      bindEvents();
      animate();
      if (options.onReady) options.onReady();
      return true;
    } catch (err) {
      console.error('[GalaxyEngine] 初始化失败:', err);
      if (options.onError) options.onError('当前环境不支持 WebGL');
      return false;
    }
  }

  function buildCore() {
    const geometry = new SphereGeometry(6, 32, 32);
    const material = new MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.9
    });
    coreMesh = new Mesh(geometry, material);

    const glowGeo = new SphereGeometry(18, 32, 32);
    const glowMat = new MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.12
    });
    const glow = new Mesh(glowGeo, glowMat);
    coreMesh.add(glow);

    galaxyGroup.add(coreMesh);
  }

  function buildStars() {
    const data = DataEngine.data.value;
    const count = data.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    // 每颗星独立的闪烁相位与速度
    const twinklePhase = new Float32Array(count);
    const twinkleSpeed = new Float32Array(count);

    const color = new Color();
    const positionsMap = TimelineEngine.positionsForAll();

    data.forEach((anime, i) => {
      const pos = positionsMap.get(String(anime.id)) || { x: 0, y: 0, z: 0 };
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
      twinklePhase[i] = Math.random() * Math.PI * 2;
      twinkleSpeed[i] = 0.5 + Math.random() * 2.5;

      const yearColor = typeof pos.color === 'string'
        ? new Color(pos.color)
        : (pos.color || new Color(0x00f3ff));
      colors[i * 3] = yearColor.r;
      colors[i * 3 + 1] = yearColor.g;
      colors[i * 3 + 2] = yearColor.b;

      const score = anime.score || 70;
      const popularity = anime.popularity || 0;
      // 高分作品更大更亮，人气作品也额外放大（顶级作品一眼可见）
      const sizeBoost = Math.min(1, Math.log10(popularity + 1) / 5);
      sizes[i] = 1.5 + (score / 100) * 4 + sizeBoost * 2.5;

      idToIndex.set(String(anime.id), i);
      indexToId.set(i, String(anime.id));

      // 构建 year/genre 索引缓存
      const year = anime.year;
      if (year != null) {
        if (!indicesByYear.has(year)) indicesByYear.set(year, []);
        indicesByYear.get(year).push(i);
      }
      (anime.genres || []).forEach(g => {
        if (!indicesByGenre.has(g)) indicesByGenre.set(g, []);
        indicesByGenre.get(g).push(i);
      });
    });

    starPositions = positions;
    starColors = colors;
    starSizes = sizes;
    starTwinklePhase = twinklePhase;
    starTwinkleSpeed = twinkleSpeed;
    starOriginalColors = new Float32Array(colors);

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('size', new BufferAttribute(sizes, 1));
    geometry.setAttribute('aTwinklePhase', new BufferAttribute(twinklePhase, 1));
    geometry.setAttribute('aTwinkleSpeed', new BufferAttribute(twinkleSpeed, 1));

    // 使用自定义 ShaderMaterial 实现每颗星独立闪烁，保留 PointsMaterial 的柔光效果
    const material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: glowTexture },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float aTwinklePhase;
        attribute float aTwinkleSpeed;
        attribute float size;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          // 闪烁：正弦波动，速度/相位各异
          vTwinkle = 0.6 + 0.4 * sin(uTime * aTwinkleSpeed + aTwinklePhase);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 30.0 * uPixelRatio * vTwinkle / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vTwinkle;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          if (tex.a < 0.05) discard;
          gl_FragColor = vec4(vColor * vTwinkle * 1.2, tex.a * 0.9);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false
    });

    if (starPoints) {
      galaxyGroup.remove(starPoints);
      starPoints.geometry.dispose();
      starPoints.material.dispose();
    }

    starPoints = new Points(geometry, material);
    galaxyGroup.add(starPoints);
  }

  /** 背景静态星野：数千颗远距离暗星，营造深空纵深感 */
  function buildBackgroundStars() {
    const COUNT = tier === 'low' ? 800 : tier === 'medium' ? 1500 : 2500;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    const palette = [
      new Color(0xffffff), new Color(0xffe4e8), new Color(0xd8e4ff),
      new Color(0xfff0d0), new Color(0xe8d8ff), new Color(0xd0f0ff)
    ];

    for (let i = 0; i < COUNT; i++) {
      // 球形分布在一个半径 2000-5000 的球壳上
      const r = 2000 + Math.random() * 3000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      positions[i*3+1] = r * Math.cos(phi) * 0.5; // 压扁成银盘形状
      positions[i*3+2] = r * Math.sin(phi) * Math.sin(theta);

      const c = palette[Math.floor(Math.random() * palette.length)];
      const brightness = 0.3 + Math.random() * 0.7;
      colors[i*3]   = c.r * brightness;
      colors[i*3+1] = c.g * brightness;
      colors[i*3+2] = c.b * brightness;

      sizes[i] = 1 + Math.random() * 2.5;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    geo.setAttribute('size', new BufferAttribute(sizes, 1));

    const mat = new PointsMaterial({
      size: 3,
      vertexColors: true,
      map: glowTexture,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    bgStarField = new Points(geo, mat);
    galaxyGroup.add(bgStarField);
  }

  /** 星云尘埃：彩色粒子云，填充星系内空间 */
  function buildNebulaDust() {
    if (tier === 'low') return;
    const COUNT = tier === 'medium' ? 400 : 800;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);

    const dustColors = [
      new Color(0xff9ec4), // 粉
      new Color(0xc9b1ff), // 紫
      new Color(0xb8e0ff), // 青
      new Color(0xffd700), // 金
      new Color(0xffb7d0)  // 樱
    ];

    for (let i = 0; i < COUNT; i++) {
      // 分布在螺旋臂上
      const arm = Math.floor(Math.random() * 3);
      const armAngle = (arm / 3) * Math.PI * 2;
      const dist = 100 + Math.random() * 500;
      const angle = armAngle + dist * 0.008 + (Math.random() - 0.5) * 0.8;
      positions[i*3]   = Math.cos(angle) * dist + (Math.random() - 0.5) * 80;
      positions[i*3+1] = (Math.random() - 0.5) * 60 + (dist - 300) * 0.02;
      positions[i*3+2] = Math.sin(angle) * dist + (Math.random() - 0.5) * 80;

      const c = dustColors[Math.floor(Math.random() * dustColors.length)];
      const alpha = 0.15 + Math.random() * 0.3;
      colors[i*3]   = c.r;
      colors[i*3+1] = c.g;
      colors[i*3+2] = c.b;
      sizes[i] = 15 + Math.random() * 40;
      // 把 alpha 编码进颜色亮度
      colors[i*3] *= alpha;
      colors[i*3+1] *= alpha;
      colors[i*3+2] *= alpha;
    }

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(positions, 3));
    geo.setAttribute('color', new BufferAttribute(colors, 3));
    geo.setAttribute('size', new BufferAttribute(sizes, 1));

    const mat = new PointsMaterial({
      size: 1,
      vertexColors: true,
      map: glowTexture,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    nebulaDust = new Points(geo, mat);
    galaxyGroup.add(nebulaDust);
  }

  function buildYearRings() {
    const years = TimelineEngine.buildYears();
    const points = [];

    years.forEach(y => {
      const segments = 64;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2 + y.angleOffset;
        const x = Math.cos(angle) * y.radius;
        const z = Math.sin(angle) * y.radius;
        points.push(x, y.y, z);
      }
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3));

    const material = new LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.08
    });

    ringLines = new LineSegments(geometry, material);
    galaxyGroup.add(ringLines);

    // 年代标签漂浮在每个轨道环上
    buildYearLabels(years);
  }

  function makeTextSprite(text, { color = '#ffb7d0', fontSize = 56, bgColor = null, padding = 12 } = {}) {
    const canvas = document.createElement('canvas');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LABEL_W * dpr;
    canvas.height = LABEL_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, LABEL_W, LABEL_H);
    ctx.font = `bold ${fontSize}px "Noto Sans SC", "PingFang SC", Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (bgColor) {
      const metrics = ctx.measureText(text);
      const w = metrics.width + padding * 2;
      const h = fontSize + padding * 2;
      const x = LABEL_W / 2;
      const y = LABEL_H / 2;
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(x - w/2, y - h/2, w, h, 8);
      ctx.fill();
    }

    // 外发光
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.fillText(text, LABEL_W / 2, LABEL_H / 2);
    ctx.shadowBlur = 0;

    const tex = new CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter || LinearFilter;
    tex.magFilter = LinearFilter;
    tex.colorSpace = SRGBColorSpace;
    const mat = new SpriteMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
      opacity: 0.9
    });
    const sprite = new Sprite(mat);
    sprite.userData.canvas = canvas;
    sprite.userData.texture = tex;
    return sprite;
  }

  function buildYearLabels(years) {
    // 清旧标签
    yearLabelSprites.forEach(s => {
      galaxyGroup.remove(s);
      s.material.map?.dispose?.();
      s.material.dispose();
    });
    yearLabelSprites = [];

    years.forEach(y => {
      const sprite = makeTextSprite(`${y.year}`, {
        color: '#c9b1ff',
        fontSize: 44,
        bgColor: 'rgba(20, 10, 40, 0.5)'
      });
      sprite.position.set(y.radius + 18, y.y, 0);
      sprite.scale.set(60, 12, 1);
      galaxyGroup.add(sprite);
      yearLabelSprites.push(sprite);
    });
  }

  function buildSelectionRing() {
    if (selectionRing) return;
    // 外层金色光晕
    const haloGeo = new SphereGeometry(1, 32, 32);
    const haloMat = new MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.08,
      blending: AdditiveBlending,
      depthWrite: false
    });
    selectionRing = new Mesh(haloGeo, haloMat);
    selectionRing.visible = false;
    galaxyGroup.add(selectionRing);

    // 内层亮环（线框）
    const ringGeo = new SphereGeometry(1, 3, 16); // 低多边形，像水晶
    const ringMat = new MeshBasicMaterial({
      color: 0xff9ec4,
      transparent: true,
      opacity: 0.6,
      wireframe: true,
      blending: AdditiveBlending,
      depthWrite: false
    });
    selectionRing.userData.wireframe = new Mesh(ringGeo, ringMat);
    selectionRing.userData.wireframe.scale.setScalar(1.3);
    selectionRing.add(selectionRing.userData.wireframe);
  }

  function updateHoverLabel(text, worldPos) {
    if (!hoverLabelSprite) {
      hoverLabelCanvas = document.createElement('canvas');
      hoverLabelCanvas.width = LABEL_W * 2;
      hoverLabelCanvas.height = LABEL_H * 2;
      hoverLabelCtx = hoverLabelCanvas.getContext('2d');
      labelTexture = new CanvasTexture(hoverLabelCanvas);
      labelTexture.colorSpace = SRGBColorSpace;
      const mat = new SpriteMaterial({
        map: labelTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0.95
      });
      hoverLabelSprite = new Sprite(mat);
      hoverLabelSprite.scale.set(120, 30, 1);
      hoverLabelSprite.visible = false;
      galaxyGroup.add(hoverLabelSprite);
    }

    if (!text) {
      hoverLabelSprite.visible = false;
      return;
    }

    const ctx = hoverLabelCtx;
    const W = hoverLabelCanvas.width, H = hoverLabelCanvas.height;
    ctx.clearRect(0, 0, W, H);
    const dpr = 2;
    ctx.font = `bold ${56 * dpr}px "Noto Sans SC", "PingFang SC", Orbitron, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 截断过长标题
    let display = text;
    if (display.length > 22) display = display.slice(0, 20) + '…';

    const metrics = ctx.measureText(display);
    const pad = 20 * dpr;
    const boxW = metrics.width + pad * 2;
    const boxH = 80 * dpr;

    // 背景胶囊
    ctx.fillStyle = 'rgba(10, 4, 24, 0.85)';
    ctx.beginPath();
    const r = boxH / 2;
    const cx = W/2, cy = H/2;
    ctx.roundRect(cx - boxW/2, cy - boxH/2, boxW, boxH, r);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 158, 196, 0.5)';
    ctx.lineWidth = 2 * dpr;
    ctx.stroke();

    // 文字 + 发光
    ctx.shadowColor = '#ff9ec4';
    ctx.shadowBlur = 24 * dpr;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(display, cx, cy);
    ctx.shadowBlur = 0;

    labelTexture.needsUpdate = true;
    hoverLabelSprite.position.copy(worldPos);
    hoverLabelSprite.position.y += 18;
    hoverLabelSprite.visible = true;
    // 根据距离缩放
    const dist = camera.position.distanceTo(worldPos);
    const scale = Math.max(60, Math.min(160, dist * 0.4));
    hoverLabelSprite.scale.set(scale * 2, scale * 0.5, 1);
  }

  function buildRelations(seedId) {
    if (relationLines) {
      galaxyGroup.remove(relationLines);
      relationLines.geometry.dispose();
      relationLines = null;
    }
    if (!seedId) return;

    const related = KnowledgeEngine.related(seedId)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, MAX_RELATION_LINES);

    if (!related.length) return;

    const idx = idToIndex.get(String(seedId));
    if (idx === undefined) return;

    const positions = [];
    const colors = [];
    const sx = starPositions[idx * 3];
    const sy = starPositions[idx * 3 + 1];
    const sz = starPositions[idx * 3 + 2];
    const c = new Color();

    related.forEach(r => {
      const tIdx = idToIndex.get(String(r.neighbor));
      if (tIdx === undefined) return;

      positions.push(sx, sy, sz);
      positions.push(starPositions[tIdx * 3], starPositions[tIdx * 3 + 1], starPositions[tIdx * 3 + 2]);

      const typeColor = {
        'sequel': 0xff2a6d,
        'prequel': 0xff2a6d,
        'same-studio': 0x00f3ff,
        'same-author': 0xb892ff,
        'same-genre': 0x66ffaa,
        'same-music': 0xffcc00,
        'same-era': 0xaaaaaa
      }[r.type] || 0xffffff;

      c.setHex(typeColor);
      colors.push(c.r, c.g, c.b);
      colors.push(c.r, c.g, c.b);
    });

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));

    const material = new LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending
    });

    relationLines = new LineSegments(geometry, material);
    galaxyGroup.add(relationLines);
  }

  function updateCamera() {
    const x = cameraState.target.x + cameraState.radius * Math.sin(cameraState.phi) * Math.sin(cameraState.theta);
    const y = cameraState.target.y + cameraState.radius * Math.cos(cameraState.phi);
    const z = cameraState.target.z + cameraState.radius * Math.sin(cameraState.phi) * Math.cos(cameraState.theta);
    camera.position.set(x, y, z);
    camera.lookAt(cameraState.target);
  }

  function setPointerFromScreen(x, y) {
    pointer.x = (x / window.innerWidth) * 2 - 1;
    pointer.y = -(y / window.innerHeight) * 2 + 1;
  }

  function raycast() {
    if (!starPoints) return null;
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObject(starPoints);
    if (intersects.length) {
      const idx = intersects[0].index;
      return indexToId.get(idx) || null;
    }
    return null;
  }

  function highlightHovered(id) {
    if (hoveredId.value === id) return;
    hoveredId.value = id;

    // 悬停时显示作品名标签
    if (hoverLabelSprite) {
      if (id) {
        const idx = idToIndex.get(String(id));
        if (idx != null) {
          const anime = DataEngine.byId(id);
          if (anime) {
            const pos = new Vector3(
              starPositions[idx * 3],
              starPositions[idx * 3 + 1],
              starPositions[idx * 3 + 2]
            );
            updateHoverLabel(anime.titleRomaji, pos);
          }
        }
      } else if (!selectedId.value) {
        updateHoverLabel(null);
      }
    }

    const colors = starPoints.geometry.attributes.color.array;
    const count = colors.length / 3;

    // 快速路径：无悬停且未选中时直接恢复原始颜色
    if (!id && !selectedId.value) {
      if (colors.length === starOriginalColors.length) {
        colors.set(starOriginalColors);
      } else {
        for (let i = 0; i < colors.length; i++) colors[i] = starOriginalColors[i];
      }
      starPoints.geometry.attributes.color.needsUpdate = true;
      return;
    }

    for (let i = 0; i < count; i++) {
      const idStr = indexToId.get(i);
      const isHovered = idStr === id;
      const isSelected = idStr === selectedId.value;
      const isDimmed = (id || selectedId.value) && !isHovered && !isSelected;

      if (isHovered || isSelected) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (isDimmed) {
        colors[i * 3] = starOriginalColors[i * 3] * 0.35;
        colors[i * 3 + 1] = starOriginalColors[i * 3 + 1] * 0.35;
        colors[i * 3 + 2] = starOriginalColors[i * 3 + 2] * 0.35;
      } else {
        colors[i * 3] = starOriginalColors[i * 3];
        colors[i * 3 + 1] = starOriginalColors[i * 3 + 1];
        colors[i * 3 + 2] = starOriginalColors[i * 3 + 2];
      }
    }

    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function select(id) {
    selectedId.value = id;
    StateEngine.select(id);
    buildRelations(id);

    // 定位选中脉冲环
    if (selectionRing) {
      if (id) {
        const idx = idToIndex.get(String(id));
        if (idx != null) {
          selectionRing.position.set(
            starPositions[idx * 3],
            starPositions[idx * 3 + 1],
            starPositions[idx * 3 + 2]
          );
          selectionRing.visible = true;
          selectionRing.scale.setScalar(14);
        }
      } else {
        selectionRing.visible = false;
      }
    }
    highlightHovered(hoveredId.value);
  }

  function highlightYear(year) {
    if (!year) {
      resetHighlight();
      return;
    }
    const colors = starPoints.geometry.attributes.color.array;
    const matchSet = new Set(indicesByYear.get(year) || []);

    // 先全部按暗色铺底
    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i] * 0.25;
    }
    // 仅点亮命中
    matchSet.forEach(idx => {
      colors[idx * 3] = 1;
      colors[idx * 3 + 1] = 1;
      colors[idx * 3 + 2] = 1;
    });
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function highlightGenre(genre) {
    if (!genre) {
      resetHighlight();
      return;
    }
    const colors = starPoints.geometry.attributes.color.array;
    const matchSet = new Set(indicesByGenre.get(genre) || []);
    const genreColor = DataEngine.genres.value.genres?.[genre]?.color || '#00f3ff';
    const c = new Color(genreColor);

    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i] * 0.2;
    }
    matchSet.forEach(idx => {
      colors[idx * 3] = c.r;
      colors[idx * 3 + 1] = c.g;
      colors[idx * 3 + 2] = c.b;
    });
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function highlightSearchResults(ids) {
    if (!ids || ids.length === 0) {
      resetHighlight();
      return;
    }
    currentSearchIds = new Set(ids.map(String));
    const colors = starPoints.geometry.attributes.color.array;
    const matchIdx = new Set();
    currentSearchIds.forEach(id => {
      const idx = idToIndex.get(String(id));
      if (idx !== undefined) matchIdx.add(idx);
    });

    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i] * 0.25;
    }
    matchIdx.forEach(idx => {
      colors[idx * 3] = 1;
      colors[idx * 3 + 1] = 0.35;
      colors[idx * 3 + 2] = 0.75;
    });
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function resetHighlight() {
    currentSearchIds.clear();
    const colors = starPoints.geometry.attributes.color.array;
    for (let i = 0; i < colors.length; i++) {
      colors[i] = starOriginalColors[i];
    }
    starPoints.geometry.attributes.color.needsUpdate = true;
  }

  function focusOnYear(year) {
    const target = TimelineEngine.cameraTargetForYear(year);
    if (!target) return;
    animateCamera({
      target: { x: target.x, y: target.y, z: target.z },
      radius: target.radius,
      theta: target.theta,
      phi: target.phi
    });
  }

  function focusOnAnime(id) {
    const idx = idToIndex.get(String(id));
    if (idx === undefined) return;
    const x = starPositions[idx * 3];
    const y = starPositions[idx * 3 + 1];
    const z = starPositions[idx * 3 + 2];

    animateCamera({
      target: { x, y, z },
      radius: 60,
      theta: cameraState.theta + Math.PI * 0.3,
      phi: Math.PI / 2.3
    });
  }

  function focusOnSearchResults(results) {
    if (!results || results.length === 0) return;
    const matched = [];
    results.forEach(r => {
      const id = r.id || r;
      const idx = idToIndex.get(String(id));
      if (idx !== undefined) matched.push(idx);
    });
    if (matched.length === 0) return;

    highlightSearchResults(results.map(r => r.id || r));

    // 计算命中作品的质心并聚焦
    const cx = matched.reduce((s, i) => s + starPositions[i * 3], 0) / matched.length;
    const cy = matched.reduce((s, i) => s + starPositions[i * 3 + 1], 0) / matched.length;
    const cz = matched.reduce((s, i) => s + starPositions[i * 3 + 2], 0) / matched.length;

    // 估算包围半径
    let maxDist = 0;
    matched.forEach(i => {
      const dx = starPositions[i * 3] - cx;
      const dy = starPositions[i * 3 + 1] - cy;
      const dz = starPositions[i * 3 + 2] - cz;
      maxDist = Math.max(maxDist, Math.sqrt(dx * dx + dy * dy + dz * dz));
    });
    const radius = Math.max(60, Math.min(260, maxDist * 1.8 + 40));

    animateCamera({
      target: { x: cx, y: cy, z: cz },
      radius,
      theta: cameraState.theta + Math.PI * 0.25,
      phi: Math.PI / 2.4
    });
  }

  function animateCamera(targetConfig) {
    cameraState.animating = true;
    const startTarget = cameraState.target.clone();
    const endTarget = new Vector3(targetConfig.target?.x || 0, targetConfig.target?.y || 0, targetConfig.target?.z || 0);
    const startRadius = cameraState.radius;
    const endRadius = targetConfig.radius ?? cameraState.radius;
    const startTheta = cameraState.theta;
    const endTheta = targetConfig.theta ?? cameraState.theta;
    const startPhi = cameraState.phi;
    const endPhi = targetConfig.phi ?? cameraState.phi;

    const duration = 1500;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      cameraState.target.lerpVectors(startTarget, endTarget, ease);
      cameraState.radius = startRadius + (endRadius - startRadius) * ease;
      cameraState.theta = startTheta + (endTheta - startTheta) * ease;
      cameraState.phi = startPhi + (endPhi - startPhi) * ease;
      updateCamera();

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        cameraState.animating = false;
      }
    }
    requestAnimationFrame(step);
  }

  // 相机阻尼：把瞬时输入累积到 velocity，每帧按 lerp 衰减，产生惯性丝滑感
  const camVelocity = { theta: 0, phi: 0, radius: 0 };

  function rotateCameraByVelocity(dTheta, dPhi = 0) {
    if (cameraState.animating || cameraState.flyIn.active) return;
    camVelocity.theta += dTheta;
    camVelocity.phi += dPhi;
  }

  function zoom(delta) {
    if (cameraState.animating || cameraState.flyIn.active) return;
    camVelocity.radius += delta;
  }

  function updateCameraDamping(dt) {
    if (cameraState.animating || cameraState.flyIn.active) return;
    const lerp = 1 - Math.pow(0.001, dt / 1000); // 帧率无关阻尼
    cameraState.theta += camVelocity.theta;
    cameraState.phi = Math.max(0.15, Math.min(Math.PI - 0.15, cameraState.phi + camVelocity.phi));
    cameraState.radius = Math.max(40, Math.min(900, cameraState.radius + camVelocity.radius));
    camVelocity.theta *= (1 - lerp);
    camVelocity.phi *= (1 - lerp);
    camVelocity.radius *= (1 - lerp);
    // 速度极小时归零，避免浮点漂移
    if (Math.abs(camVelocity.theta) < 1e-5) camVelocity.theta = 0;
    if (Math.abs(camVelocity.phi) < 1e-5) camVelocity.phi = 0;
    if (Math.abs(camVelocity.radius) < 1e-5) camVelocity.radius = 0;
  }

  function bindEvents() {
    cleanupFns.length = 0;
    const sub = (event, handler) => cleanupFns.push(bus.on(event, handler));

    sub('timeline:focus-year', (year) => {
      highlightYear(year);
      focusOnYear(year);
    });

    sub('timeline:filter-genre', (genre) => {
      highlightGenre(genre);
    });

    sub('timeline:clear-filter', () => {
      resetHighlight();
    });

    sub('anime:selected', (id) => {
      selectedId.value = id;
      buildRelations(id);
      highlightHovered(hoveredId.value);
      focusOnAnime(id);
    });

    // ---- 手势控制 3D 相机 ----
    sub('gesture:move', ({ x, y }) => {
      markActive();
      if (!handControl.enabled) return;
      handControl.pos = { x, y };
      handControl.lastMoveTime = performance.now();
      // 首次移动只记录位置，避免从 (0.5,0.5) 跳变导致相机猛转
      if (handControl.firstMove) {
        handControl.lastPos = { x, y };
        handControl.firstMove = false;
      }
    });

    sub('gesture:pinch:start', () => {
      if (!handControl.enabled) return;
      // 捏合 = 放大聚焦
      handControl.zoomVelocity -= 2.2;
    });

    sub('gesture:open:progress', (progress) => {
      if (!handControl.enabled) return;
      // 张开手掌持续 = 缩小拉远
      if (progress > 0.85) {
        handControl.zoomVelocity += 0.08;
      }
    });

    sub('gesture:fist:progress', (progress) => {
      if (!handControl.enabled) return;
      // 握拳持续 = 进一步放大
      if (progress > 0.85) {
        handControl.zoomVelocity -= 0.08;
      }
    });
  }

  function updateHandControl(dt) {
    if (!handControl.enabled || cameraState.animating) return;

    const now = performance.now();
    const inactive = now - handControl.lastMoveTime > 250;

    // 计算手势移动 delta
    const dx = handControl.pos.x - handControl.lastPos.x;
    const dy = handControl.pos.y - handControl.lastPos.y;
    handControl.lastPos = { ...handControl.pos };

    // 平滑速度
    const targetVx = inactive ? 0 : dx;
    const targetVy = inactive ? 0 : dy;
    handControl.velocity.x += (targetVx - handControl.velocity.x) * handControl.smooth;
    handControl.velocity.y += (targetVy - handControl.velocity.y) * handControl.smooth;

    // 基于移动速度旋转相机（dt 归一化到 60fps）
    const dtFactor = Math.min(dt / 16.67, 3);
    if (!inactive) {
      cameraState.theta -= handControl.velocity.x * handControl.sensitivity * dtFactor;
      cameraState.phi = Math.max(0.15, Math.min(Math.PI - 0.15,
        cameraState.phi - handControl.velocity.y * handControl.sensitivity * dtFactor));
    }

    // 边缘持续旋转（手停在边缘时缓慢环顾）
    const cx = handControl.pos.x - 0.5;
    const cy = handControl.pos.y - 0.5;
    const edgeX = Math.max(0, Math.abs(cx) - 0.35) * Math.sign(cx);
    const edgeY = Math.max(0, Math.abs(cy) - 0.35) * Math.sign(cy);
    if (!inactive && (Math.abs(edgeX) > 0.001 || Math.abs(edgeY) > 0.001)) {
      cameraState.theta -= edgeX * handControl.edgeSensitivity * dt * 0.001;
      cameraState.phi = Math.max(0.15, Math.min(Math.PI - 0.15,
        cameraState.phi - edgeY * handControl.edgeSensitivity * dt * 0.001));
    }

    // 缩放速度应用与衰减
    if (Math.abs(handControl.zoomVelocity) > 0.001) {
      cameraState.radius = Math.max(40, Math.min(900,
        cameraState.radius + handControl.zoomVelocity * dtFactor));
      handControl.zoomVelocity *= Math.pow(0.88, dtFactor);
    }

    updateCamera();
  }

  function setHandControl(enabled) {
    handControl.enabled = enabled;
    if (enabled) {
      handControl.pos = { x: 0.5, y: 0.5 };
      handControl.lastPos = { x: 0.5, y: 0.5 };
      handControl.velocity = { x: 0, y: 0 };
      handControl.zoomVelocity = 0;
      handControl.lastMoveTime = performance.now();
      handControl.firstMove = true;
      handControl.inputMode = 'hand';
    } else {
      handControl.inputMode = 'mouse';
    }
  }

  function setInputMode(mode) {
    handControl.inputMode = mode;
    if (mode === 'hand') {
      setHandControl(true);
    } else {
      setHandControl(false);
    }
  }

  function resetCameraState() {
    cameraState.theta = INITIAL_CAMERA.theta;
    cameraState.phi = INITIAL_CAMERA.phi;
    cameraState.radius = INITIAL_CAMERA.radius;
    cameraState.target.copy(INITIAL_CAMERA.target);
    updateCamera();
  }

  let idleTimer = 0;
  let lastInteractionAt = performance.now();

  // 任何用户输入都会标记"活跃"，2.5 秒无操作后降帧到 30fps
  function markActive() {
    lastInteractionAt = performance.now();
  }
  // 暴露给外部在 pointermove/手势move 时调用
  // （通过 bus 事件在 bindEvents 里订阅）

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (!isVisible || isPaused) {
      lastFrameTime = performance.now();
      return;
    }

    const now = performance.now();
    const dt = Math.min(now - lastFrameTime, 50);
    lastFrameTime = now;

    // 空闲降帧：2.5 秒无交互时，每两帧才渲染一次（≈30fps），
    // 有相机动画/手势控制时始终全速
    const idle = now - lastInteractionAt > 2500;
    const needsFullRate = cameraState.animating || handControl.enabled || !idle;
    if (!needsFullRate) {
      idleTimer++;
      if (idleTimer % 2 !== 0) return; // 跳过一帧
    } else {
      idleTimer = 0;
    }

    // 电影入场动画：从远处 dolly-in，带缓动
    if (cameraState.flyIn.active) {
      const fly = cameraState.flyIn;
      fly.t += dt / 1000;
      const p = Math.min(1, fly.t / fly.duration);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - p, 3);
      cameraState.radius = 1800 + (INITIAL_CAMERA.radius - 1800) * ease;
      // 同时相机从上方俯视角缓缓降到水平视角
      cameraState.phi = 0.4 + (INITIAL_CAMERA.phi - 0.4) * ease;
      if (p >= 1) {
        cameraState.flyIn.active = false;
        cameraState.radius = INITIAL_CAMERA.radius;
        cameraState.phi = INITIAL_CAMERA.phi;
      }
    }

    // 更新恒星闪烁 shader 的时间 uniform
    if (starPoints && starPoints.material.uniforms) {
      starPoints.material.uniforms.uTime.value = now * 0.001;
    }

    if (coreMesh) coreMesh.rotation.y += 0.002 * (dt / 16.67);
    if (galaxyGroup && !cameraState.animating && !handControl.enabled) {
      // 自动巡航：无交互时缓慢旋转，营造太空漂流感
      galaxyGroup.rotation.y += 0.0003 * (dt / 16.67);
    }
    // 背景星空和尘埃以不同速度旋转，增加视差深度
    if (bgStarField) {
      bgStarField.rotation.y += 0.00005 * (dt / 16.67);
      bgStarField.rotation.x = Math.sin(performance.now() * 0.00003) * 0.02;
    }
    if (nebulaDust) {
      nebulaDust.rotation.y -= 0.0001 * (dt / 16.67);
    }

    // 选中恒星脉冲环：外层金色光晕呼吸，内层水晶线框反向旋转
    if (selectionRing && selectionRing.visible) {
      const t = performance.now() * 0.003;
      const pulse = 1 + Math.sin(t) * 0.2;
      selectionRing.scale.setScalar(pulse * 18);
      selectionRing.material.opacity = 0.08 + Math.sin(t * 1.5) * 0.04;
      const wire = selectionRing.userData.wireframe;
      if (wire) {
        wire.rotation.y = t * 0.5;
        wire.rotation.x = t * 0.3;
        wire.scale.setScalar(1 + Math.sin(t * 2) * 0.1);
        wire.material.opacity = 0.4 + Math.sin(t * 2) * 0.2;
      }
    }

    // 让标签始终朝向相机（Sprite 天然 billboard，无需手动，但年份标签要更新透明度）
    yearLabelSprites.forEach(s => {
      const dist = camera.position.length();
      s.material.opacity = Math.max(0, Math.min(0.5, (dist - 100) / 400));
    });

    // 相机阻尼惯性
    updateCameraDamping(dt);
    updateHandControl(dt);
    renderer.render(scene, camera);
  }

  function dispose() {
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resizeHandler);
    if (visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    // 解绑所有 bus 监听器
    if (cleanupFns) cleanupFns.forEach(fn => { try { fn(); } catch (e) {} });
    cleanupFns.length = 0;
    // Three.js 资源释放：geometry + material + texture 缺一不可
    // 顶层 Points/Line
    if (starPoints) { starPoints.geometry?.dispose(); starPoints.material?.dispose?.(); }
    if (ringLines) { ringLines.geometry?.dispose(); ringLines.material?.dispose?.(); }
    if (relationLines) { relationLines.geometry?.dispose(); relationLines.material?.dispose?.(); }
    // 核心球体 + 子节点（发光外壳等）—— traverse 释放所有几何体和材质
    if (galaxyGroup) {
      galaxyGroup.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    if (glowTexture) glowTexture.dispose();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss?.();
    }
  }

  function pause() {
    isPaused = true;
  }

  function resume() {
    isPaused = false;
    lastFrameTime = performance.now();
  }

  return {
    init,
    dispose,
    pause,
    resume,
    setPointerFromScreen,
    raycast,
    highlightHovered,
    select,
    highlightYear,
    highlightGenre,
    highlightSearchResults,
    resetHighlight,
    focusOnYear,
    focusOnAnime,
    focusOnSearchResults,
    rotateCameraByVelocity,
    zoom,
    setHandControl,
    setInputMode,
    resetCameraState,
    animateCamera,
    get hoveredId() { return hoveredId.value; },
    get selectedId() { return selectedId.value; }
  };
}
