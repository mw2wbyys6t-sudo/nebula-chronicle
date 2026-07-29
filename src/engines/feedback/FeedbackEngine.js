// src/engines/feedback/FeedbackEngine.js
// 统一反馈调度引擎：将手势/交互事件转换为视觉反馈

import { bus } from '../core/EventBus.js';
import { CursorRenderer } from './CursorRenderer.js';

export const FeedbackEngine = {
  cursorRenderer: null,
  cleanupFns: [],
  currentGestureState: '',

  init(canvas) {
    if (this.cursorRenderer) return this;

    this.cursorRenderer = new CursorRenderer();
    this.cursorRenderer.init(canvas);

    let lastFist = 0;
    let lastOpen = 0;

    this.cleanupFns = [
      bus.on('gesture:move', ({ x, y }) => {
        this.cursorRenderer.setPosition(x, y);
      }),
      bus.on('gesture:state', ({ state, direction }) => {
        this.currentGestureState = state || '';
        this.cursorRenderer.setState(state, direction);
      }),
      bus.on('gesture:pinch:start', () => {
        this.cursorRenderer.onPinchStart();
      }),
      bus.on('gesture:pinch:complete', () => {
        this.cursorRenderer.onPinchComplete();
      }),
      bus.on('gesture:fist:progress', (progress) => {
        this.cursorRenderer.onFistProgress(progress);
        // 检测握拳动作完成（从高位快速回落）
        if (lastFist > 0.7 && progress < 0.2) {
          this.cursorRenderer.onFistComplete();
        }
        lastFist = progress;
      }),
      bus.on('gesture:open:progress', (progress) => {
        this.cursorRenderer.onOpenProgress(progress);
        // 检测张开动作完成
        if (lastOpen > 0.7 && progress < 0.2) {
          this.cursorRenderer.onOpenComplete();
        }
        lastOpen = progress;
      }),
      bus.on('gesture:swipe:direction', (direction) => {
        this.cursorRenderer.onSwipe(direction);
      }),
      bus.on('gesture:dwell-progress', (progress) => {
        this.cursorRenderer.onDwellProgress(progress);
      }),
      bus.on('gesture:dwell-complete', () => {
        this.cursorRenderer.onPinchComplete();
      }),
      bus.on('anime:hovered', (id) => {
        this.cursorRenderer.onHoverAnime(id);
      })
    ];

    return this;
  },

  dispose() {
    this.cleanupFns.forEach(fn => typeof fn === 'function' && fn());
    this.cleanupFns = [];
    if (this.cursorRenderer) {
      this.cursorRenderer.dispose();
      this.cursorRenderer = null;
    }
    this.currentGestureState = '';
  }
};
