// src/engines/interaction/GestureNavigationEngine.js
// 纯手势观看模式导航引擎（预留架构）
// 目标：未来用户无需鼠标，仅通过手势即可完成全部浏览操作
// 当前阶段：预留核心接口与状态机，不启用实际手势识别，但所有调用点已埋好

import { ref, computed } from 'vue';
import { StateEngine } from '../core/StateEngine.js';
import { bus } from '../core/EventBus.js';
import { GestureActionEngine } from './GestureActionEngine.js';

// 手势 → 操作的映射表（可配置）
const DEFAULT_GESTURE_MAP = {
  pointing: 'cursor',      // 食指指向 = 移动光标
  pinch: 'select',         // 捏合 = 点击/选中
  fist: 'back',            // 握拳 = 返回/关闭面板
  open: 'idle',            // 张开手掌 = 无操作/保持
  swipeLeft: 'prevYear',   // 向左挥手 = 上一个年份
  swipeRight: 'nextYear',  // 向右挥手 = 下一个年份
  swipeUp: 'zoomIn',       // 向上挥手 = 放大
  swipeDown: 'zoomOut'     // 向下挥手 = 缩小
};

class GestureNavigationEngine {
  constructor() {
    this.enabled = ref(false);
    this.gestureMap = { ...DEFAULT_GESTURE_MAP };
    this.lastGesture = ref(null);
    this.lastAction = ref(null);
    this.cooldownMs = 600; // 同一手势冷却时间，防止误触发
    this.lastTriggerTime = 0;

    // 手势持续状态（用于"按住拖动"类操作）
    this.pinchHolding = ref(false);
    this.fistHolding = ref(false);

    // 纯手势模式下的语音反馈队列
    this.voiceQueue = [];
  }

  // 是否启用纯手势观看模式
  get isEnabled() {
    return computed(() => this.enabled.value);
  }

  // 预留：启用纯手势模式
  enable() {
    this.enabled.value = true;
    StateEngine.set('inputMode', 'gestureOnly');
    StateEngine.set('gestureNavigation', true);
    bus.emit('gesture-nav:enabled');
  }

  // 预留：关闭纯手势模式
  disable() {
    this.enabled.value = false;
    StateEngine.set('inputMode', 'mouse');
    StateEngine.set('gestureNavigation', false);
    bus.emit('gesture-nav:disabled');
  }

  toggle() {
    this.enabled.value ? this.disable() : this.enable();
  }

  // 预留：自定义手势映射
  setGestureMap(map) {
    this.gestureMap = { ...this.gestureMap, ...map };
  }

  // 核心：将识别到的手势转换为应用操作
  // 未来 GestureEngine 识别到手势后，直接调用此方法
  dispatch(gestureName, payload = {}) {
    if (!this.enabled.value) return false;

    const now = Date.now();
    if (now - this.lastTriggerTime < this.cooldownMs && gestureName === this.lastGesture.value) {
      return false; // 冷却中
    }
    this.lastTriggerTime = now;
    this.lastGesture.value = gestureName;

    const action = this.gestureMap[gestureName];
    if (!action) return false;

    this.lastAction.value = action;
    this._executeAction(action, payload);
    return true;
  }

  // 持续手势状态更新（用于拖动、缩放等连续操作）
  updateHoldState(gestureName, isHolding, payload = {}) {
    if (!this.enabled.value) return;

    if (gestureName === 'pinch') {
      this.pinchHolding.value = isHolding;
    } else if (gestureName === 'fist') {
      this.fistHolding.value = isHolding;
    }

    // 持续捏合 + 手部移动 = 拖拽宇宙
    if (this.pinchHolding.value && payload.dx != null && payload.dy != null) {
      bus.emit('input:rotate', { dx: payload.dx * 2, dy: payload.dy * 2 });
    }
  }

  _executeAction(action, payload) {
    switch (action) {
      case 'cursor':
        // 光标移动由 GestureEngine 直接驱动，这里只记录状态
        break;
      case 'select':
        bus.emit('input:select');
        break;
      case 'back':
        bus.emit('input:back');
        break;
      case 'prevYear':
        bus.emit('gesture:swipe', -1);
        break;
      case 'nextYear':
        bus.emit('gesture:swipe', 1);
        break;
      case 'zoomIn':
        bus.emit('input:zoom', -1);
        break;
      case 'zoomOut':
        bus.emit('input:zoom', 1);
        break;
      default:
        break;
    }
  }

  // 预留：语音引导队列（配合 TTS 使用）
  // 例如：用户进入纯手势模式后，语音提示"捏合选择，握拳返回"
  enqueueVoice(text) {
    this.voiceQueue.push(text);
    bus.emit('voice:enqueue', text);
  }

  // 预留：获取当前可用的手势提示列表
  getAvailableGestures() {
    return Object.entries(this.gestureMap).map(([gesture, action]) => ({
      gesture,
      action,
      label: this._getGestureLabel(gesture),
      actionLabel: this._getActionLabel(action)
    }));
  }

  _getGestureLabel(gesture) {
    const labels = {
      pointing: '👆 食指指向',
      pinch: '👌 捏合',
      fist: '✊ 握拳',
      open: '🖐 张开手掌',
      swipeLeft: '👈 向左挥手',
      swipeRight: '👉 向右挥手',
      swipeUp: '👆 向上挥手',
      swipeDown: '👇 向下挥手'
    };
    return labels[gesture] || gesture;
  }

  _getActionLabel(action) {
    const labels = {
      cursor: '移动光标',
      select: '选中/打开',
      back: '返回/关闭',
      idle: '保持',
      prevYear: '上一年份',
      nextYear: '下一年份',
      zoomIn: '放大视角',
      zoomOut: '缩小视角'
    };
    return labels[action] || action;
  }
}

export const gestureNavigation = new GestureNavigationEngine();
