// src/engines/feedback/CursorRenderer.js
// 手势光标视觉渲染器：拖尾、状态光环、捏合冲击波、蓄力环、挥手流光

const STATE_COLORS = {
  pointing: '#00f3ff',
  pinching: '#fffd75',
  fist: '#ff2a6d',
  open: '#b892ff',
  swiping: '#00f3ff'
};

const STATE_LABELS = {
  pointing: '指向',
  pinching: '捏合',
  fist: '握拳',
  open: '张开',
  swiping: '挥手'
};

// 光标形状配置
const CURSOR_SHAPES = {
  pointing: 'dot',
  pinching: 'diamond',
  fist: 'x',
  open: 'ring',
  swiping: 'arrow'
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 243, b: 255 };
}

function lerpColor(colorA, colorB, t) {
  const ca = hexToRgb(colorA);
  const cb = hexToRgb(colorB);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const b = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${b})`;
}

// 速度色温：低速冷青 -> 高速热粉
function speedColor(speed, baseColor) {
  const t = Math.min(1, speed / 400);
  if (t < 0.3) return baseColor;
  return t > 0.7 ? '#ff2a6d' : (t > 0.45 ? '#fffd75' : baseColor);
}

export class CursorRenderer {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.rafId = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.pos = { x: 0.5, y: 0.5 };
    this.lastPos = { x: 0.5, y: 0.5 };
    this.velocity = { x: 0, y: 0 };
    this.state = 'pointing';
    this.direction = '';

    this.trail = []; // 拖尾粒子
    this.rings = []; // 冲击波环
    this.arrows = []; // 挥手箭头
    this.flashes = []; // 屏幕闪光
    this.charge = { fist: 0, open: 0 }; // 蓄力进度
    this.fistTriggered = false;

    this.dwellProgress = 0; // 悬停停留选择进度
    this.hoverId = null; // 当前悬停的作品 id
    this.hoverPulse = 0; // 悬停脉冲动画相位

    this.lastTrailTime = 0;
    this.isActive = false;
  }

  init(canvas) {
    if (this.canvas) return this;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', this.onResize);
    this.isActive = true;
    this.render(performance.now());
    return this;
  }

  onResize = () => {
    this.resize();
  };

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(rect.width, window.innerWidth);
    const h = Math.max(rect.height, window.innerHeight);
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setPosition(x, y) {
    this.lastPos = { ...this.pos };
    this.pos = { x, y };
    this.velocity = {
      x: (this.pos.x - this.lastPos.x) * window.innerWidth,
      y: (this.pos.y - this.lastPos.y) * window.innerHeight
    };
  }

  setState(state, direction = '') {
    if (this.state !== state || this.direction !== direction) {
      this.state = state || 'pointing';
      this.direction = direction || '';
    }
  }

  onPinchStart() {
    this.spawnRing(1.0, STATE_COLORS.pinching, 0.35);
  }

  onPinchComplete() {
    this.spawnRing(2.2, '#ffffff', 0.55);
    this.spawnRing(1.5, STATE_COLORS.pinching, 0.45);
    this.spawnScreenFlash(STATE_COLORS.pinching);
  }

  // 屏幕闪光效果
  spawnScreenFlash(color) {
    if (!this.flashes) this.flashes = [];
    this.flashes.push({ life: 1.0, color });
  }

  onFistProgress(progress) {
    this.charge.fist = progress;
    // 握拳进度高时触发暗角预告
    if (progress > 0.85 && !this.fistTriggered) {
      this.fistTriggered = true;
      this.spawnScreenFlash(STATE_COLORS.fist);
    }
    if (progress < 0.1) this.fistTriggered = false;
  }

  onFistComplete() {
    this.charge.fist = 0;
    this.fistTriggered = false;
    this.spawnScreenFlash(STATE_COLORS.fist);
  }

  onOpenProgress(progress) {
    this.charge.open = progress;
  }

  onOpenComplete() {
    this.charge.open = 0;
    this.spawnScreenFlash(STATE_COLORS.open);
  }

  onDwellProgress(progress) {
    this.dwellProgress = progress;
  }

  onHoverAnime(id) {
    this.hoverId = id;
  }

  onSwipe(direction) {
    const color = direction === 'right' ? '#00f3ff' : '#b892ff';
    this.arrows.push({
      direction,
      x: this.pos.x,
      y: this.pos.y,
      life: 1.0,
      color,
      size: 0,
      blade: true
    });
    this.spawnScreenFlash(color);
  }

  spawnRing(intensity, color, alpha) {
    this.rings.push({
      x: this.pos.x,
      y: this.pos.y,
      radius: 12,
      maxRadius: 80 * intensity,
      life: 1.0,
      decay: 0.035,
      color,
      alpha,
      width: 3 * intensity
    });
  }

  spawnTrailParticle() {
    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    if (speed < 2) return;

    const baseColor = STATE_COLORS[this.state] || STATE_COLORS.pointing;
    const hotColor = speedColor(speed, baseColor);
    const count = Math.min(10, Math.floor(speed / 22) + 2);

    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1);
      const color = lerpColor(baseColor, hotColor, t * 0.8);
      this.trail.push({
        x: this.pos.x + (Math.random() - 0.5) * 0.012,
        y: this.pos.y + (Math.random() - 0.5) * 0.012,
        vx: (Math.random() - 0.5) * 0.0007,
        vy: (Math.random() - 0.5) * 0.0007,
        life: 1.0,
        decay: 0.022 + Math.random() * 0.018,
        size: (2.8 + Math.random() * 4) * (1 + speed / 280),
        color
      });
    }
  }

  toScreen(p) {
    return {
      x: p.x * window.innerWidth,
      y: p.y * window.innerHeight
    };
  }

  render(now) {
    if (!this.isActive || !this.ctx) return;
    this.rafId = requestAnimationFrame((t) => this.render(t));

    // 用真实帧间隔（ms），让动画在 60/120/144Hz 下速度一致
    const dt = this.lastFrame ? Math.min(50, now - this.lastFrame) : 16.67;
    this.lastFrame = now;
    // 归一化到 60fps 基准（各 _render 方法通过 this._dtFactor 使用）
    this._dtFactor = dt / 16.67;

    // 悬停恒星时脉冲相位推进
    if (this.hoverId) {
      this.hoverPulse += dt * 0.004;
    } else {
      this.hoverPulse = 0;
    }

    // 生成拖尾
    if (now - this.lastTrailTime > 12) {
      this.spawnTrailParticle();
      this.lastTrailTime = now;
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    // 绘制屏幕闪光
    this._renderFlashes(w, h);

    // 绘制拖尾
    this._renderTrail();

    // 绘制冲击波环
    this._renderRings();

    // 绘制挥手光刃
    this._renderBlades();

    // 绘制主光标
    this._renderCursor(w, h);
  }

  _renderFlashes(w, h) {
    if (!this.flashes || this.flashes.length === 0) return;
    const dtF = this._dtFactor || 1;
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= 0.04 * dtF;
      if (f.life <= 0) {
        this.flashes.splice(i, 1);
        continue;
      }
      const alpha = f.life * 0.18;
      const rgb = hexToRgb(f.color);
      this.ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
      this.ctx.fillRect(0, 0, w, h);
    }
  }

  _renderTrail() {
    if (this.trail.length === 0) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.life -= p.decay;
      if (p.life <= 0) {
        this.trail.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      const pos = this.toScreen(p);
      const alpha = Math.floor(p.life * 200).toString(16).padStart(2, '0');
      const size = Math.max(0.5, p.size * p.life);

      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + alpha;
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  _renderRings() {
    if (this.rings.length === 0) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= r.decay;
      if (r.life <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      r.radius += (r.maxRadius - r.radius) * 0.12;
      const pos = this.toScreen(r);
      const alpha = Math.floor(r.life * r.alpha * 255).toString(16).padStart(2, '0');
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color + alpha;
      this.ctx.lineWidth = r.width * r.life;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  _renderBlades() {
    if (this.arrows.length === 0) return;
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'screen';
    const dtF = this._dtFactor || 1;

    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const a = this.arrows[i];
      a.life -= 0.025 * dtF;
      a.size += (1.0 - a.size) * 0.12 * dtF;
      if (a.life <= 0) {
        this.arrows.splice(i, 1);
        continue;
      }
      const pos = this.toScreen(a);
      const dx = a.direction === 'right' ? 1 : -1;
      const rgb = hexToRgb(a.color);

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);
      this.ctx.globalAlpha = a.life;
      this.ctx.shadowColor = a.color;
      this.ctx.shadowBlur = 20;
      this.ctx.strokeStyle = `rgba(255,255,255,${a.life * 0.9})`;
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';

      // 光刃主体
      this.ctx.beginPath();
      this.ctx.moveTo(-120 * a.size * dx, -3 * a.size);
      this.ctx.lineTo(0, 0);
      this.ctx.lineTo(-120 * a.size * dx, 3 * a.size);
      this.ctx.stroke();

      // 光刃尾焰
      this.ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a.life * 0.6})`;
      this.ctx.lineWidth = 8;
      this.ctx.beginPath();
      this.ctx.moveTo(-80 * a.size * dx, 0);
      this.ctx.lineTo(-140 * a.size * dx, 0);
      this.ctx.stroke();

      this.ctx.restore();
    }

    this.ctx.restore();
  }

  _renderCursor(w, h) {
    const cursorPos = this.toScreen(this.pos);
    const color = STATE_COLORS[this.state] || STATE_COLORS.pointing;
    const shape = CURSOR_SHAPES[this.state] || 'dot';
    const rgb = hexToRgb(color);

    // 握拳时屏幕暗角收缩
    if (this.charge.fist > 0.1) {
      const vig = this.ctx.createRadialGradient(
        cursorPos.x, cursorPos.y, 40,
        cursorPos.x, cursorPos.y, Math.max(w, h) * (0.6 - this.charge.fist * 0.25)
      );
      vig.addColorStop(0, 'transparent');
      vig.addColorStop(1, `rgba(255,42,109,${0.25 + this.charge.fist * 0.25})`);
      this.ctx.fillStyle = vig;
      this.ctx.fillRect(0, 0, w, h);
    }

    // 外圈光晕
    const glow = this.ctx.createRadialGradient(cursorPos.x, cursorPos.y, 0, cursorPos.x, cursorPos.y, 50);
    glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(cursorPos.x, cursorPos.y, 50, 0, Math.PI * 2);
    this.ctx.fill();

    // 蓄力环（fist / open）
    const chargeProgress = Math.max(this.charge.fist, this.charge.open);
    if (chargeProgress > 0.05) {
      const chargeColor = this.charge.fist > this.charge.open ? STATE_COLORS.fist : STATE_COLORS.open;
      const chargeRgb = hexToRgb(chargeColor);
      const radius = 28 + chargeProgress * 14;
      this.ctx.beginPath();
      this.ctx.arc(cursorPos.x, cursorPos.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * chargeProgress);
      this.ctx.strokeStyle = `rgba(${chargeRgb.r},${chargeRgb.g},${chargeRgb.b},${0.7 + chargeProgress * 0.3})`;
      this.ctx.lineWidth = 4;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    // 悬停恒星吸附环
    if (this.hoverId) {
      const pulse = 0.7 + Math.sin(this.hoverPulse * Math.PI * 2) * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(cursorPos.x, cursorPos.y, 34 + pulse * 6, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(0, 243, 255, ${0.35 + pulse * 0.25})`;
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([6, 6]);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // 悬停停留选择进度环
    if (this.dwellProgress > 0.01) {
      const dwellRgb = hexToRgb(STATE_COLORS.pinching);
      this.ctx.beginPath();
      this.ctx.arc(cursorPos.x, cursorPos.y, 42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.dwellProgress);
      this.ctx.strokeStyle = `rgba(${dwellRgb.r},${dwellRgb.g},${dwellRgb.b},${0.6 + this.dwellProgress * 0.4})`;
      this.ctx.lineWidth = 5;
      this.ctx.lineCap = 'round';
      this.ctx.shadowColor = STATE_COLORS.pinching;
      this.ctx.shadowBlur = 14;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // 状态形状
    this.ctx.save();
    this.ctx.translate(cursorPos.x, cursorPos.y);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 12;

    if (shape === 'dot') {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
    } else if (shape === 'diamond') {
      this.ctx.beginPath();
      this.ctx.moveTo(0, -10);
      this.ctx.lineTo(10, 0);
      this.ctx.lineTo(0, 10);
      this.ctx.lineTo(-10, 0);
      this.ctx.closePath();
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fill();
    } else if (shape === 'x') {
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(-8, -8);
      this.ctx.lineTo(8, 8);
      this.ctx.moveTo(8, -8);
      this.ctx.lineTo(-8, 8);
      this.ctx.stroke();
    } else if (shape === 'ring') {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else if (shape === 'arrow') {
      const dx = this.direction === 'right' ? 1 : -1;
      this.ctx.beginPath();
      this.ctx.moveTo(-10 * dx, -8);
      this.ctx.lineTo(6 * dx, 0);
      this.ctx.lineTo(-10 * dx, 8);
      this.ctx.stroke();
    }

    this.ctx.restore();

    // 状态文字（光标下方）
    this.ctx.font = 'bold 12px Orbitron, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = color;
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 8;
    const label = STATE_LABELS[this.state] + (this.direction ? (this.direction === 'right' ? ' ›' : ' ‹') : '');
    this.ctx.fillText(label, cursorPos.x, cursorPos.y + 38);
    this.ctx.shadowBlur = 0;
  }

  dispose() {
    this.isActive = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.canvas = null;
    this.ctx = null;
  }
}
