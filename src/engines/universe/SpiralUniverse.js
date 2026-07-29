// src/engines/universe/SpiralUniverse.js
// 2D 螺旋宇宙降级方案：当 WebGL 不可用时，提供同样震撼的 Canvas 2D 视觉体验
// 核心隐喻：恒星=作品，星云=流派，宇宙=所有作品。浏览=探索。

import { DataEngine } from '../data/DataEngine.js';

const COLORS = {
  cyan: '#00f3ff',
  purple: '#b892ff',
  pink: '#ff2a6d',
  white: '#ffffff'
};

// 动画缓动
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.hypot(dx, dy);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 243, b: 255 };
}

function colorWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getDeviceTier() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (memory <= 4 || cores <= 4 || isMobile) return 'low';
  if (memory >= 8 && cores >= 8 && dpr <= 2) return 'high';
  return 'medium';
}

export class SpiralUniverse {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = 0;
    this.height = 0;

    // 设备分级配置
    this.tier = getDeviceTier();
    this.CONFIG = {
      starDustCount: this.tier === 'low' ? 1500 : this.tier === 'medium' ? 3500 : 5000,
      maxConnections: this.tier === 'low' ? 400 : this.tier === 'medium' ? 800 : 1200,
      genreParticles: this.tier === 'low' ? 40 : this.tier === 'medium' ? 80 : 120,
      hoverGridSize: 120, // 世界坐标空间索引格子大小
      renderCullMargin: 1.4, // 视口裁剪边距倍数
      throttleHoverMs: 16  // hover 检测节流
    };

    // 相机状态
    this.scale = 0.35;
    this.targetScale = 0.35;
    this.offsetX = 0;
    this.targetOffsetX = 0;
    this.offsetY = 0;
    this.targetOffsetY = 0;
    this.rotation = 0;
    this.targetRotation = 0;
    this.autoRotate = true;

    this.MIN_SCALE = 0.06;
    this.MAX_SCALE = 3.0;

    // 交互状态
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.hoveredNode = null;
    this.selectedNode = null;
    this.searchHighlight = null;
    this.searchResults = new Set(); // 搜索命中集合
    this.searchMode = false;        // 是否处于搜索聚焦模式
    this.searchPulseTime = 0;       // 搜索脉冲相位
    this.activeGenre = null;        // 当前高亮流派
    this.activeYear = null;         // 当前高亮年份
    this.inputMode = 'mouse';       // mouse | hand | voice
    this.lastHoverCheck = 0;

    // 动画状态
    this.time = 0;
    this.birthProgress = 0; // 0→1 宇宙诞生动画
    this.nodes = [];
    this.genreClouds = [];
    this.starDust = [];
    this.connections = [];
    this.ripples = [];
    this.spiralArms = []; // 旋臂光带路径
    this.spatialGrid = new Map(); // 节点空间索引
    this.visibleNodes = []; // 当前视口内节点缓存
    this.visibleStarDust = []; // 当前视口内星尘缓存
    this.visibleGenreClouds = []; // 当前视口内星云缓存
    this.visibleConnections = []; // 当前视口内连线缓存

    // 回调（预留纯手势模式接口）
    this.onNodeHover = null;
    this.onNodeClick = null;
    this.onCameraChange = null;
    this.onSearchComplete = null;

    this.running = false;
    this.rafId = null;
    this.isVisible = true;
    this.visibilityHandler = null;
    this.frameCount = 0;

    this.resize = this.resize.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this._bindEvents();
  }

  // 初始化并生成宇宙数据
  async init() {
    await DataEngine.load();
    this._buildGalaxy();
    this._buildSpiralArms();
    this._buildStarDust();
    this._buildGenreClouds();
    this._buildConnections();
    this._buildSpatialGrid();
    this.resize();
    this.birthProgress = 0;

    this.visibilityHandler = () => {
      this.isVisible = document.visibilityState !== 'hidden';
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
    return this;
  }

  _buildGalaxy() {
    const works = DataEngine.data.value;
    const genres = DataEngine.genres.value;

    if (!works || works.length === 0) return;

    // 按年份螺旋排列
    const minYear = Math.min(...works.map(w => w.year || 1980));
    const maxYear = Math.max(...works.map(w => w.year || 2024));
    const yearRange = Math.max(1, maxYear - minYear);

    this.nodes = works.map((work, i) => {
      const year = work.year || (minYear + (i % yearRange));
      const yearT = (year - minYear) / yearRange;

      // 螺旋参数：年份越新越靠外
      const spiralAngle = yearT * Math.PI * 6 + (i * 0.37);
      const spiralRadius = 120 + yearT * 1800 + (Math.random() - 0.5) * 200;

      // 在螺旋臂附近加入随机散射，形成星云团
      const armOffset = (Math.random() - 0.5) * 260 * (0.3 + yearT * 0.7);
      const x = Math.cos(spiralAngle) * spiralRadius + Math.cos(spiralAngle + Math.PI / 2) * armOffset;
      const y = Math.sin(spiralAngle) * spiralRadius + Math.sin(spiralAngle + Math.PI / 2) * armOffset;

      // 评分决定大小
      const score = work.score || work.popularity || 50;
      const baseSize = 2.5 + (score / 100) * 7;

      // 流派决定颜色
      const genre = work.genres?.[0] || 'Sci-Fi';
      const genreData = genres?.genres?.[genre] || genres?.[genre] || {};
      const color = genreData.color || COLORS.cyan;

      return {
        id: work.id,
        work,
        x,
        y,
        originalX: x,
        originalY: y,
        size: baseSize,
        color,
        genre,
        year,
        score,
        pulsePhase: Math.random() * Math.PI * 2,
        birthDelay: Math.random() * 0.8,
        alpha: 0.6 + (score / 100) * 0.4
      };
    });

    // 初始相机指向宇宙中心
    this.targetOffsetX = 0;
    this.targetOffsetY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  _buildStarDust() {
    // 根据设备性能调整背景星尘数量，营造深空感
    const count = this.CONFIG.starDustCount;
    this.starDust = Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 6000,
      y: (Math.random() - 0.5) * 6000,
      z: Math.random() * 2 + 0.2, // 远近层级
      size: Math.random() * 1.2 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      twinkleSpeed: Math.random() * 0.03 + 0.005,
      twinklePhase: Math.random() * Math.PI * 2
    }));
  }

  _buildGenreClouds() {
    const genres = DataEngine.genres.value;
    const genreMap = genres?.genres || genres || {};

    // 预建 id -> node 映射，避免 O(n^2) 查找
    const nodeById = new Map();
    this.nodes.forEach(n => nodeById.set(n.id, n));

    this.genreClouds = Object.entries(genreMap).map(([name, info]) => {
      const works = DataEngine.byGenre(name);
      if (!works || works.length === 0) return null;

      // 星云中心取该流派作品的平均位置
      const matched = works.map(w => nodeById.get(w.id)).filter(Boolean);
      if (matched.length === 0) return null;

      const cx = matched.reduce((s, n) => s + n.x, 0) / matched.length;
      const cy = matched.reduce((s, n) => s + n.y, 0) / matched.length;

      const color = info.color || COLORS.cyan;
      const count = Math.min(this.CONFIG.genreParticles, Math.max(30, Math.floor(works.length / 5)));

      return {
        name,
        color,
        x: cx,
        y: cy,
        particles: Array.from({ length: count }, () => ({
          ox: (Math.random() - 0.5) * 380,
          oy: (Math.random() - 0.5) * 380,
          angle: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.0005 + 0.0001,
          radius: Math.random() * 180 + 40,
          size: Math.random() * 2.5 + 0.8,
          alpha: Math.random() * 0.25 + 0.08
        }))
      };
    }).filter(Boolean);
  }

  _buildSpiralArms() {
    // 生成4条主要旋臂光带路径
    const arms = 4;
    const pointsPerArm = 120;
    const maxRadius = 2000;
    const armWidth = 90;

    this.spiralArms = Array.from({ length: arms }, (_, armIndex) => {
      const armOffset = (armIndex / arms) * Math.PI * 2;
      const points = [];
      for (let i = 0; i <= pointsPerArm; i++) {
        const t = i / pointsPerArm;
        const angle = armOffset + t * Math.PI * 5;
        const radius = 100 + t * maxRadius;
        points.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          width: armWidth * (0.6 + 0.4 * (1 - t)),
          alpha: 0.06 * (1 - t * 0.6)
        });
      }
      return { points, color: armIndex % 2 === 0 ? COLORS.cyan : COLORS.purple };
    });
  }

  _buildConnections() {
    // 同流派/同年份/同工作室的作品之间建立弱连接
    const maxConnections = this.CONFIG.maxConnections;
    const connections = [];
    const nodes = this.nodes;

    // 按流派连接
    const genreGroups = {};
    nodes.forEach(n => {
      if (!genreGroups[n.genre]) genreGroups[n.genre] = [];
      genreGroups[n.genre].push(n);
    });

    Object.values(genreGroups).forEach(group => {
      group.sort((a, b) => (a.year || 0) - (b.year || 0));
      for (let i = 0; i < group.length - 1 && connections.length < maxConnections; i++) {
        const a = group[i];
        const b = group[i + 1];
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < 500) {
          connections.push({ a, b, color: a.color, alpha: 0.12, type: 'genre' });
        }
      }
    });

    this.connections = connections;
  }

  _buildSpatialGrid() {
    this.spatialGrid.clear();
    const size = this.CONFIG.hoverGridSize;
    for (const node of this.nodes) {
      const gx = Math.floor(node.x / size);
      const gy = Math.floor(node.y / size);
      const key = `${gx},${gy}`;
      if (!this.spatialGrid.has(key)) this.spatialGrid.set(key, []);
      this.spatialGrid.get(key).push(node);
    }
  }

  _getGridNodes(worldX, worldY) {
    const size = this.CONFIG.hoverGridSize;
    const gx = Math.floor(worldX / size);
    const gy = Math.floor(worldY / size);
    const results = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        const nodes = this.spatialGrid.get(key);
        if (nodes) results.push(...nodes);
      }
    }
    return results;
  }

  _updateVisibleNodes() {
    // 计算当前视口对应的世界坐标范围
    const margin = this.CONFIG.renderCullMargin;
    const halfW = (this.width / 2) / this.scale;
    const halfH = (this.height / 2) / this.scale;

    // 世界坐标中心
    const cx = -this.offsetX;
    const cy = -this.offsetY;

    // 粗略包围盒（带旋转的安全边界）
    const range = Math.max(halfW, halfH) * margin;
    const minX = cx - range;
    const maxX = cx + range;
    const minY = cy - range;
    const maxY = cy + range;

    this.visibleNodes = this.nodes.filter(n => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY);
  }

  _updateVisibilityCaches() {
    this._updateVisibleNodes();

    const margin = this.CONFIG.renderCullMargin;
    const halfW = (this.width / 2) / this.scale;
    const halfH = (this.height / 2) / this.scale;
    const range = Math.max(halfW, halfH) * margin;
    const minX = -this.offsetX - range;
    const maxX = -this.offsetX + range;
    const minY = -this.offsetY - range;
    const maxY = -this.offsetY + range;

    // 星尘裁剪
    this.visibleStarDust = this.starDust.filter(s => {
      const x = s.x + this.offsetX * 0.02 * s.z;
      const y = s.y + this.offsetY * 0.02 * s.z;
      return x >= minX && x <= maxX && y >= minY && y <= maxY;
    });

    // 星云裁剪
    this.visibleGenreClouds = this.genreClouds.filter(c =>
      c.x >= minX && c.x <= maxX && c.y >= minY && c.y <= maxY
    );

    // 连线裁剪：只要任一端点在视口内即可
    this.visibleConnections = this.connections.filter(c => {
      const ax = c.a.x, ay = c.a.y, bx = c.b.x, by = c.b.y;
      return (ax >= minX && ax <= maxX && ay >= minY && ay <= maxY) ||
             (bx >= minX && bx <= maxX && by >= minY && by <= maxY);
    });
  }

  _bindEvents() {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  _unbindEvents() {
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);
  }

  resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const w = Math.floor(rect.width);
    const h = Math.floor(rect.height);
    if (w === this.width && h === this.height) return;

    this.width = w;
    this.height = h;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  // 世界坐标 → 屏幕坐标
  worldToScreen(wx, wy) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const rx = wx * cos - wy * sin;
    const ry = wx * sin + wy * cos;
    return {
      x: cx + (rx + this.offsetX) * this.scale,
      y: cy + (ry + this.offsetY) * this.scale
    };
  }

  // 屏幕坐标 → 世界坐标
  screenToWorld(sx, sy) {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const rx = (sx - cx) / this.scale - this.offsetX;
    const ry = (sy - cy) / this.scale - this.offsetY;
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    return {
      x: rx * cos - ry * sin,
      y: rx * sin + ry * cos
    };
  }

  handleMouseDown(e) {
    this.isDragging = true;
    this.autoRotate = false;
    this.lastMouse = { x: e.clientX, y: e.clientY };
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.velocity = { x: 0, y: 0 };
  }

  handleMouseMove(e) {
    const now = performance.now();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.targetOffsetX += dx / this.scale;
      this.targetOffsetY += dy / this.scale;
      this.velocity = { x: dx, y: dy };
      this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    // hover 检测节流，降低高频 pointermove 开销
    if (now - this.lastHoverCheck >= this.CONFIG.throttleHoverMs) {
      this._updateHover(mx, my);
    }
  }

  handleMouseUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    // 惯性：快速甩动时继续滑行
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed > 3) {
      this.velocity.x *= 12;
      this.velocity.y *= 12;
    } else {
      this.velocity = { x: 0, y: 0 };
    }

    // 如果是点击（移动很小），退出搜索模式；选中统一由外部 input:select 处理
    if (speed < 5 && !this.hoveredNode && this.searchMode) {
      this.clearSearchMode();
    }
  }

  handleWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldBefore = this.screenToWorld(mx, my);
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.targetScale = clamp(this.targetScale * zoomFactor, this.MIN_SCALE, this.MAX_SCALE);

    // 以鼠标位置为锚点缩放
    requestAnimationFrame(() => {
      const worldAfter = this.screenToWorld(mx, my);
      this.targetOffsetX += worldAfter.x - worldBefore.x;
      this.targetOffsetY += worldAfter.y - worldBefore.y;
    });

    this.autoRotate = false;
  }

  handleTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.autoRotate = false;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.lastPinchDist = Math.hypot(dx, dy);
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.targetOffsetX += dx / this.scale;
      this.targetOffsetY += dy / this.scale;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (this.lastPinchDist > 0) {
        const factor = dist / this.lastPinchDist;
        this.targetScale = clamp(this.targetScale * factor, this.MIN_SCALE, this.MAX_SCALE);
      }
      this.lastPinchDist = dist;
    }
  }

  handleTouchEnd(e) {
    this.isDragging = false;
    this.lastPinchDist = 0;
  }

  _updateHover(mx, my) {
    const now = performance.now();
    if (now - this.lastHoverCheck < this.CONFIG.throttleHoverMs) return;
    this.lastHoverCheck = now;

    const world = this.screenToWorld(mx, my);
    let closest = null;
    let closestDist = Infinity;
    const threshold = 22 / this.scale;

    // 使用空间索引，只检查相邻格子
    const candidates = this._getGridNodes(world.x, world.y);
    for (const node of candidates) {
      const d = dist(world.x, world.y, node.x, node.y);
      if (d < threshold && d < closestDist) {
        closestDist = d;
        closest = node;
      }
    }

    if (closest !== this.hoveredNode) {
      this.hoveredNode = closest;
      if (this.onNodeHover) this.onNodeHover(closest);
    }
  }

  selectNode(node) {
    this.selectedNode = node;
    this.ripples.push({ x: node.x, y: node.y, r: 0, alpha: 1, color: node.color });
    if (this.onNodeClick) this.onNodeClick(node);
  }

  // 搜索命中后的聚焦动画（预留纯手势语音搜索接口）
  focusOnNode(nodeOrId) {
    const node = typeof nodeOrId === 'object' ? nodeOrId : this.nodes.find(n => String(n.id) === String(nodeOrId));
    if (!node) return;

    this.searchMode = true;
    this.searchResults.clear();
    this.searchResults.add(node.id);
    this.searchHighlight = node;
    this.selectedNode = node;
    this.searchPulseTime = 0;
    this.autoRotate = false;

    // 目标：让该节点位于屏幕中央，并放大到合适尺寸
    this.targetScale = 0.9;
    this.targetOffsetX = -node.x;
    this.targetOffsetY = -node.y;

    // 选中波纹
    this.ripples.push({ x: node.x, y: node.y, r: 0, alpha: 1, color: node.color });
    this.ripples.push({ x: node.x, y: node.y, r: 0, alpha: 0.7, color: COLORS.white });

    if (this.onNodeClick) this.onNodeClick(node);
    if (this.onSearchComplete) this.onSearchComplete({ query: '', results: 1, first: node });
  }

  // 多结果搜索模式：高亮所有命中，暗化其他
  focusOnSearchResults(results) {
    if (!results || results.length === 0) {
      this.clearSearchMode();
      return;
    }

    this.searchMode = true;
    this.searchResults.clear();
    results.forEach(r => {
      const id = r.id || r;
      this.searchResults.add(String(id));
    });
    this.searchPulseTime = 0;
    this.autoRotate = false;

    // 计算所有命中节点的外接中心
    const matchedNodes = this.nodes.filter(n => this.searchResults.has(String(n.id)));
    if (matchedNodes.length === 0) {
      this.clearSearchMode();
      return;
    }

    const cx = matchedNodes.reduce((s, n) => s + n.x, 0) / matchedNodes.length;
    const cy = matchedNodes.reduce((s, n) => s + n.y, 0) / matchedNodes.length;

    this.targetOffsetX = -cx;
    this.targetOffsetY = -cy;

    const maxDist = Math.max(...matchedNodes.map(n => dist(n.x, n.y, cx, cy)));
    this.targetScale = clamp(500 / (maxDist + 120), 0.25, 1.0);

    if (this.onSearchComplete) this.onSearchComplete({ query: '', results: matchedNodes.length, first: matchedNodes[0] });
  }

  clearSearchMode() {
    this.searchMode = false;
    this.searchResults.clear();
    this.searchHighlight = null;
  }

  focusOnGenre(genre) {
    this.highlightGenre(genre);
  }

  highlightGenre(genre) {
    if (!genre) {
      this.activeGenre = null;
      return;
    }

    const works = DataEngine.byGenre(genre);
    if (!works || works.length === 0) return;

    const nodeById = new Map();
    this.nodes.forEach(n => nodeById.set(n.id, n));
    const matchedNodes = works.map(w => nodeById.get(w.id)).filter(Boolean);
    if (matchedNodes.length === 0) return;

    this.activeGenre = genre;
    this.activeYear = null;
    this.autoRotate = false;

    // 计算该流派节点的外接中心
    const cx = matchedNodes.reduce((s, n) => s + n.x, 0) / matchedNodes.length;
    const cy = matchedNodes.reduce((s, n) => s + n.y, 0) / matchedNodes.length;

    this.targetOffsetX = -cx;
    this.targetOffsetY = -cy;

    // 根据节点分布自动调整缩放
    const maxDist = Math.max(...matchedNodes.map(n => dist(n.x, n.y, cx, cy)));
    this.targetScale = clamp(400 / (maxDist + 100), 0.2, 1.2);

    // 流派高亮闪烁
    let flashes = 0;
    const flash = () => {
      matchedNodes.forEach(n => { n.highlightUntil = flashes % 2 === 0 ? Date.now() + 300 : Date.now(); });
      flashes++;
      if (flashes < 6) setTimeout(flash, 250);
    };
    flash();
  }

  focusOnYear(year) {
    this.highlightYear(year);
  }

  highlightYear(year) {
    if (!year) {
      this.activeYear = null;
      return;
    }

    const works = DataEngine.byYear(year);
    if (!works || works.length === 0) return;

    const nodeById = new Map();
    this.nodes.forEach(n => nodeById.set(n.id, n));
    const matchedNodes = works.map(w => nodeById.get(w.id)).filter(Boolean);
    if (matchedNodes.length === 0) return;

    this.activeYear = year;
    this.activeGenre = null;
    this.autoRotate = false;

    const cx = matchedNodes.reduce((s, n) => s + n.x, 0) / matchedNodes.length;
    const cy = matchedNodes.reduce((s, n) => s + n.y, 0) / matchedNodes.length;

    this.targetOffsetX = -cx;
    this.targetOffsetY = -cy;

    const maxDist = Math.max(...matchedNodes.map(n => dist(n.x, n.y, cx, cy)));
    this.targetScale = clamp(450 / (maxDist + 120), 0.25, 1.2);

    // 年份高亮闪烁
    let flashes = 0;
    const flash = () => {
      matchedNodes.forEach(n => { n.highlightUntil = flashes % 2 === 0 ? Date.now() + 300 : Date.now(); });
      flashes++;
      if (flashes < 6) setTimeout(flash, 250);
    };
    flash();
  }

  setInputMode(mode) {
    this.inputMode = mode;
    if (mode === 'hand') {
      this.autoRotate = false;
    }
  }

  // 预留纯手势接口：外部手势引擎调用
  gestureMove(dx, dy) {
    this.autoRotate = false;
    this.targetOffsetX += dx / this.scale;
    this.targetOffsetY += dy / this.scale;
  }

  gestureZoom(factor, anchorX, anchorY) {
    this.autoRotate = false;
    const worldBefore = this.screenToWorld(anchorX, anchorY);
    this.targetScale = clamp(this.targetScale * factor, this.MIN_SCALE, this.MAX_SCALE);
    requestAnimationFrame(() => {
      const worldAfter = this.screenToWorld(anchorX, anchorY);
      this.targetOffsetX += worldAfter.x - worldBefore.x;
      this.targetOffsetY += worldAfter.y - worldBefore.y;
    });
  }

  gestureSelectAt(screenX, screenY) {
    this._updateHover(screenX, screenY);
    if (this.hoveredNode) {
      this.selectNode(this.hoveredNode);
      return this.hoveredNode;
    }
    return null;
  }

  // 外部输入（手势/语音/键盘）设置光标位置，用于更新 hover 状态
  setPointerFromScreen(x, y) {
    if (this.isDragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = x - rect.left;
    const my = y - rect.top;
    this._updateHover(mx, my);
  }

  resetView() {
    this.autoRotate = true;
    this.targetScale = 0.35;
    this.targetOffsetX = 0;
    this.targetOffsetY = 0;
    this.targetRotation = 0;
    this.activeGenre = null;
    this.activeYear = null;
    this.searchMode = false;
    this.searchResults.clear();
    this.searchHighlight = null;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  destroy() {
    this.stop();
    this._unbindEvents();
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  _loop() {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this._loop());

    // 后台/不可见时跳过渲染，节省性能
    if (!this.isVisible) {
      this.lastTime = performance.now();
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.time += dt;
    this.frameCount++;
    this._update(dt);
    this._render();
  }

  _update(dt) {
    // 宇宙诞生动画
    if (this.birthProgress < 1) {
      this.birthProgress = Math.min(1, this.birthProgress + dt * 0.4);
    }

    // 平滑插值相机
    const smooth = 1 - Math.pow(0.001, dt);
    const prevScale = this.scale;
    this.scale = lerp(this.scale, this.targetScale, smooth);
    this.offsetX = lerp(this.offsetX, this.targetOffsetX, smooth);
    this.offsetY = lerp(this.offsetY, this.targetOffsetY, smooth);
    this.rotation = lerp(this.rotation, this.targetRotation, smooth);

    // 惯性滑行
    if (!this.isDragging && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
      this.targetOffsetX += this.velocity.x / this.scale * dt;
      this.targetOffsetY += this.velocity.y / this.scale * dt;
      this.velocity.x *= Math.pow(0.95, dt * 60);
      this.velocity.y *= Math.pow(0.95, dt * 60);
      if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
      if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
    }

    // 自动旋转
    if (this.autoRotate && !this.isDragging) {
      this.targetRotation += dt * 0.03;
    }

    // 波纹扩散
    this.ripples.forEach(r => {
      r.r += dt * 120;
      r.alpha -= dt * 0.8;
    });
    this.ripples = this.ripples.filter(r => r.alpha > 0);

    // 相机显著变化时更新视口缓存
    const cameraChanged = Math.abs(this.scale - prevScale) > 0.001 ||
                          this.velocity.x !== 0 || this.velocity.y !== 0 ||
                          this.isDragging || this.autoRotate;
    if (cameraChanged || this.visibleNodes.length === 0) {
      this._updateVisibilityCaches();
    }
  }

  _render() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 深空背景
    ctx.fillStyle = '#03030a';
    ctx.fillRect(0, 0, w, h);

    // 中心辐射雾
    const cx = w / 2;
    const cy = h / 2;
    const fog = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.7);
    fog.addColorStop(0, 'rgba(0, 80, 120, 0.15)');
    fog.addColorStop(0.4, 'rgba(40, 0, 80, 0.08)');
    fog.addColorStop(1, 'transparent');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 0, w, h);

    // 绘制旋臂光带
    this._renderSpiralArms(ctx);

    // 绘制背景星尘
    this._renderStarDust(ctx);

    // 绘制流派星云
    this._renderGenreClouds(ctx);

    // 绘制星座连线
    this._renderConnections(ctx);

    // 绘制波纹
    this._renderRipples(ctx);

    // 绘制恒星
    this._renderNodes(ctx);

    // 绘制搜索高亮提示圈
    if (this.searchHighlight) {
      this._renderSearchHighlight(ctx);
    }
  }

  _renderSpiralArms(ctx) {
    if (this.scale > 1.2) return; // 太近不画旋臂，避免遮挡

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const arm of this.spiralArms) {
      const points = arm.points;
      if (points.length < 2) continue;

      ctx.beginPath();
      const first = this.worldToScreen(points[0].x, points[0].y);
      ctx.moveTo(first.x, first.y);

      for (let i = 1; i < points.length; i++) {
        const p = this.worldToScreen(points[i].x, points[i].y);
        const prev = this.worldToScreen(points[i - 1].x, points[i - 1].y);
        const mx = (prev.x + p.x) / 2;
        const my = (prev.y + p.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
      }

      const last = this.worldToScreen(points[points.length - 1].x, points[points.length - 1].y);
      ctx.lineTo(last.x, last.y);

      // 动态流动效果
      const flowAlpha = 0.4 + 0.3 * Math.sin(this.time * 1.5);
      const gradient = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
      const rgb = hexToRgb(arm.color);
      gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      gradient.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.04 * flowAlpha * this.birthProgress})`);
      gradient.addColorStop(0.7, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.08 * flowAlpha * this.birthProgress})`);
      gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = points[0].width * this.scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 旋臂核心亮线
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < points.length; i++) {
        const p = this.worldToScreen(points[i].x, points[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.15 * flowAlpha * this.birthProgress})`;
      ctx.lineWidth = Math.max(0.5, 2 * this.scale);
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderStarDust(ctx) {
    const t = this.time;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const star of this.visibleStarDust) {
      const pos = this.worldToScreen(star.x, star.y);

      // 视差：远星移动慢，近星移动快
      const parallaxX = (this.offsetX * 0.02 * star.z);
      const parallaxY = (this.offsetY * 0.02 * star.z);
      const x = pos.x + parallaxX;
      const y = pos.y + parallaxY;

      //  born-in effect
      const born = this.birthProgress > star.z * 0.3 ? 1 : this.birthProgress / (star.z * 0.3 + 0.01);
      if (born <= 0) continue;

      const twinkle = 0.7 + 0.3 * Math.sin(t * star.twinkleSpeed * 60 + star.twinklePhase);
      const size = star.size * born * (0.5 + 0.5 * star.z);
      const alpha = star.alpha * twinkle * born;

      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.3, size * this.scale * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    ctx.restore();
  }

  _renderGenreClouds(ctx) {
    const t = this.time;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const cloud of this.visibleGenreClouds) {
      const pos = this.worldToScreen(cloud.x, cloud.y);

      for (const p of cloud.particles) {
        const angle = p.angle + t * p.speed * 60;
        const rx = p.radius * Math.cos(angle);
        const ry = p.radius * Math.sin(angle) * 0.6;
        const x = pos.x + (rx + p.ox) * this.scale;
        const y = pos.y + (ry + p.oy) * this.scale;

        const born = this.birthProgress;
        if (born <= 0.1) continue;

        const size = p.size * born * this.scale;
        const alpha = p.alpha * born * (0.7 + 0.3 * Math.sin(t * 2 + angle));

        if (size < 0.3) continue;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = colorWithAlpha(cloud.color, alpha);
        ctx.fill();
      }

      // 星云名标签（只在合适缩放时显示）
      if (this.scale > 0.25 && this.scale < 1.5) {
        ctx.font = `12px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = colorWithAlpha(cloud.color, 0.5 * this.birthProgress);
        ctx.fillText(cloud.name, pos.x, pos.y);
      }
    }

    ctx.restore();
  }

  _renderConnections(ctx) {
    if (this.scale < 0.15) return; // 太远不画线，避免杂乱

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const c of this.visibleConnections) {
      const a = this.worldToScreen(c.a.x, c.a.y);
      const b = this.worldToScreen(c.b.x, c.b.y);

      // 连线透明度随距离衰减
      const screenDist = dist(a.x, a.y, b.x, b.y);
      if (screenDist > 250) continue;

      const alpha = c.alpha * (1 - screenDist / 250) * this.birthProgress;
      if (alpha < 0.02) continue;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = colorWithAlpha(c.color, alpha);
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderRipples(ctx) {
    if (this.ripples.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const r of this.ripples) {
      const pos = this.worldToScreen(r.x, r.y);
      const radius = r.r * this.scale;
      if (radius < 1) continue;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = colorWithAlpha(r.color, r.alpha * 0.8);
      ctx.lineWidth = 2 * this.scale;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = colorWithAlpha(r.color, r.alpha * 0.4);
      ctx.lineWidth = 1 * this.scale;
      ctx.stroke();
    }

    ctx.restore();
  }

  _renderNodes(ctx) {
    const t = this.time;
    const hovered = this.hoveredNode;
    const selected = this.selectedNode;
    const now = Date.now();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // 搜索模式下，更新搜索脉冲相位
    if (this.searchMode) {
      this.searchPulseTime += 0.016;
    }

    // 按大小排序（仅对视口内节点排序，降低开销）
    const sorted = this.visibleNodes.length > 0 ? this.visibleNodes : this.nodes;
    // 每帧对少量节点排序仍可接受；节点很多时只排序一次或使用稳定顺序
    if (sorted.length > 1 && (this.frameCount & 3) === 0) {
      sorted.sort((a, b) => b.size - a.size);
    }

    for (const node of sorted) {
      const pos = this.worldToScreen(node.x, node.y);
      const birth = this.birthProgress > node.birthDelay ?
        Math.min(1, (this.birthProgress - node.birthDelay) / (1 - node.birthDelay)) : 0;
      if (birth <= 0) continue;

      const isHovered = hovered === node;
      const isSelected = selected === node;
      const isSearchResult = this.searchResults.has(String(node.id));
      const isSearchHighlight = this.searchHighlight === node;
      const isGenreHighlight = node.highlightUntil && node.highlightUntil > now;
      const isActiveGenre = this.activeGenre && node.genre === this.activeGenre;
      const isActiveYear = this.activeYear && node.year === this.activeYear;
      const isActiveMatch = isActiveGenre || isActiveYear || isSearchResult || isSelected || isHovered;

      // 搜索/流派/年份模式下的暗化逻辑
      let dimFactor = 1;
      if (this.searchMode && !isSearchResult) {
        dimFactor = 0.15;
      } else if ((this.activeGenre || this.activeYear) && !isActiveMatch) {
        dimFactor = 0.25;
      }

      // 基础脉冲 + 搜索结果强脉冲
      let pulse = 1 + 0.12 * Math.sin(t * 2 + node.pulsePhase);
      if (isSearchResult) {
        pulse *= 1 + 0.35 * Math.sin(this.searchPulseTime * 6);
      }
      const baseSize = node.size * birth * pulse;

      // hover/selected/搜索结果放大
      let hoverScale = 1;
      if (isHovered) hoverScale = 1.5;
      else if (isSelected || isSearchHighlight) hoverScale = 1.35;
      else if (isSearchResult || isActiveGenre || isActiveYear) hoverScale = 1.2;
      const size = baseSize * this.scale * hoverScale;
      if (size < 0.5) continue;

      // 亮度
      const baseAlpha = node.alpha * birth * dimFactor;
      const alpha = isHovered || isSelected || isSearchHighlight || isGenreHighlight || isSearchResult || isActiveGenre || isActiveYear ?
        Math.min(1, baseAlpha * 1.8) : baseAlpha;

      // 光晕
      const glowSize = size * (isHovered ? 5 : (isSelected || isSearchHighlight ? 4.5 : (isSearchResult || isActiveGenre || isActiveYear ? 3.5 : 2.5)));
      if (glowSize > 1) {
        const glow = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, glowSize);
        glow.addColorStop(0, colorWithAlpha(node.color, alpha * 0.6));
        glow.addColorStop(0.5, colorWithAlpha(node.color, alpha * 0.2));
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, glowSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // 核心星点
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();

      // 颜色内核
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(0.3, size * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = colorWithAlpha(node.color, alpha);
      ctx.fill();

      // 悬停时额外目标环，增强手势/鼠标交互反馈
      if (isHovered) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(this.time * 1.5);
        ctx.beginPath();
        ctx.arc(0, 0, size * 3.2, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha('#ffffff', 0.45 + 0.25 * Math.sin(this.time * 4));
        ctx.lineWidth = 1.2;
        ctx.setLineDash([8, 5]);
        ctx.stroke();
        ctx.restore();
      }

      // 选中/高亮/搜索结果外环
      if (isSelected || isSearchHighlight || isGenreHighlight || isSearchResult || isActiveGenre || isActiveYear) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, size * 2.5, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha(node.color, (isSearchResult && !isSearchHighlight) || isActiveGenre || isActiveYear ? 0.35 : 0.6);
        ctx.lineWidth = (isSearchResult || isActiveGenre || isActiveYear) ? 1 : 1.5;
        ctx.stroke();
      }

      // 搜索高亮特殊标记：粉色旋转虚线环
      if (isSearchHighlight) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(t * 2);
        ctx.beginPath();
        ctx.arc(0, 0, size * 4, 0, Math.PI * 2);
        ctx.strokeStyle = colorWithAlpha(COLORS.pink, 0.8);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.restore();
      }

      // 高分作品十字光芒
      if (node.score > 85 && size > 2) {
        const rayLen = size * 4;
        ctx.strokeStyle = colorWithAlpha(node.color, alpha * 0.4);
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pos.x - rayLen, pos.y);
        ctx.lineTo(pos.x + rayLen, pos.y);
        ctx.moveTo(pos.x, pos.y - rayLen);
        ctx.lineTo(pos.x, pos.y + rayLen);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _renderSearchHighlight(ctx) {
    const node = this.searchHighlight;
    const pos = this.worldToScreen(node.x, node.y);
    const t = this.time;
    const radius = (30 + 10 * Math.sin(t * 8)) * this.scale;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(COLORS.pink, 0.8);
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.4, 0, Math.PI * 2);
    ctx.strokeStyle = colorWithAlpha(COLORS.pink, 0.3);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.stroke();

    ctx.restore();
  }
}
