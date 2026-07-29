// src/engines/interaction/InteractionEngine.js
// 统一输入路由引擎：鼠标 / 键盘 / 手势 / 语音 → GestureActionEngine → 业务逻辑

import { bus } from '../core/EventBus.js';
import { StateEngine } from '../core/StateEngine.js';
import { GestureActionEngine } from './GestureActionEngine.js';

export const InteractionEngine = {
  isDragging: false,
  lastPointer: { x: 0, y: 0 },
  keyboardEnabled: true,
  mouseEnabled: true,
  gestureAction: null,
  // 保存所有需要清理的副作用（DOM 监听 / bus 订阅）
  _cleanupFns: [],
  _initialized: false,

  init({ canvas, onPointerMove, onSelect, onZoom, onBack } = {}) {
    // 避免 UniversePhase 重挂载 / 热更新时重复绑定
    if (this._initialized) this.dispose();
    this._initialized = true;
    this.canvas = canvas;
    this.gestureAction = GestureActionEngine.init();
    this.bindMouse(canvas, onPointerMove, onSelect, onZoom);
    this.bindKeyboard(onBack);
    this.bindGlobal();
  },

  dispose() {
    this._cleanupFns.forEach(fn => {
      try { fn(); } catch (e) { void e; }
    });
    this._cleanupFns = [];
    this.canvas = null;
    this._initialized = false;
  },

  bindMouse(canvas, onPointerMove, onSelect, onZoom) {
    if (!this.mouseEnabled || !canvas) return;

    const DRAG_THRESHOLD = 5;
    let downPos = null;
    let dragMoved = false;

    const handlePointerMove = (e) => {
      StateEngine.set('inputMode', 'mouse');
      const payload = { x: e.clientX, y: e.clientY, normalized: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight } };
      bus.emit('input:pointer', payload);
      if (onPointerMove) onPointerMove(payload);

      if (this.isDragging && downPos) {
        const dx = e.clientX - this.lastPointer.x;
        const dy = e.clientY - this.lastPointer.y;
        if (Math.abs(e.clientX - downPos.x) > DRAG_THRESHOLD ||
            Math.abs(e.clientY - downPos.y) > DRAG_THRESHOLD) {
          dragMoved = true;
        }
        bus.emit('input:rotate', { dx: dx * 0.008, dy: dy * 0.005 });
        this.lastPointer = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerDown = (e) => {
      this.isDragging = true;
      dragMoved = false;
      downPos = { x: e.clientX, y: e.clientY };
      this.lastPointer = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture?.(e.pointerId);
    };

    const handlePointerUp = (e) => {
      this.isDragging = false;
      canvas.releasePointerCapture?.(e.pointerId);
    };

    const handleClick = () => {
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      bus.emit('input:select');
      if (onSelect) onSelect();
    };

    const handleWheel = (e) => {
      e.preventDefault();
      bus.emit('input:zoom', e.deltaY);
      if (onZoom) onZoom(e.deltaY);
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointerup', handlePointerUp);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    this._cleanupFns.push(() => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointerup', handlePointerUp);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('wheel', handleWheel);
    });
  },

  bindKeyboard(onBack) {
    if (!this.keyboardEnabled) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          bus.emit('input:back');
          if (onBack) onBack();
          break;
        case 'ArrowLeft':
          bus.emit('input:swipe', -1);
          break;
        case 'ArrowRight':
          bus.emit('input:swipe', 1);
          break;
        case 'ArrowUp':
          bus.emit('input:zoom', -80);
          break;
        case 'ArrowDown':
          bus.emit('input:zoom', 80);
          break;
        case 'f':
          if (e.target === document.body) bus.emit('input:fullscreen');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    this._cleanupFns.push(() => window.removeEventListener('keydown', handleKeyDown));
  },

  bindGlobal() {
    const unsubs = [
      bus.on('gesture:move', (pos) => {
        StateEngine.set('inputMode', 'hand');
        this.gestureAction.move(pos.x, pos.y);
      }),
      bus.on('gesture:select', () => this.gestureAction.select()),
      bus.on('gesture:back', () => this.gestureAction.back()),
      bus.on('gesture:swipe', (dir) => {
        if (dir > 0) this.gestureAction.nextYear();
        else this.gestureAction.prevYear();
      }),
      bus.on('gesture:zoom', (delta) => this.gestureAction.zoom(delta)),
      bus.on('voice:intent', (intent) => {
        StateEngine.set('inputMode', 'voice');
        StateEngine.set('voiceIntent', intent);
        this.dispatchVoiceIntent(intent);
      }),
      bus.on('input:swipe', (dir) => {
        if (dir > 0) this.gestureAction.nextYear();
        else this.gestureAction.prevYear();
      }),
      bus.on('input:back', () => this.gestureAction.back()),
      bus.on('input:select', () => this.gestureAction.select()),
      bus.on('input:zoom', (delta) => this.gestureAction.zoom(delta))
    ];
    this._cleanupFns.push(...unsubs);
  },

  dispatchVoiceIntent(intent) {
    if (!intent || !intent.action) return;
    switch (intent.action) {
      case 'focus-year':
        this.gestureAction.focusYear(intent.year);
        break;
      case 'focus-anime':
        if (intent.id) this.gestureAction.focusAnime(intent.id);
        else if (intent.title) this.gestureAction.search(intent.title);
        break;
      case 'recommend':
        this.gestureAction.focusGenre(intent.genre);
        break;
      case 'back':
        this.gestureAction.back();
        break;
      case 'home':
        StateEngine.navigate('landing');
        break;
      case 'clear':
      case 'reset':
        this.gestureAction.reset();
        break;
      case 'search':
        this.gestureAction.search(intent.query || intent.title);
        break;
      case 'chat':
        if (intent.message) bus.emit('toast', intent.message);
        break;
      case 'unknown':
      default:
        if (intent.message) bus.emit('toast', intent.message);
        break;
    }
  }
};
