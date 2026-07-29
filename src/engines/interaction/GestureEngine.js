import { ref } from 'vue';
import { bus } from '../core/EventBus.js';

const CONFIG = {
  CAMERA_WIDTH: 320,
  CAMERA_HEIGHT: 240,
  PINCH_THRESHOLD: 0.055,
  PINCH_COOLDOWN_MS: 650,
  OPEN_HOLD_MS: 650,
  FIST_HOLD_MS: 550,
  SWIPE_THRESHOLD: 0.16,
  SWIPE_COOLDOWN_MS: 800,
  CURSOR_LERP: 0.42,
  HAND_DEAD_ZONE_PX: 2.5,
  ZOOM_THRESHOLD: 0.12,
  CAMERA_TIMEOUT_MS: 10000
};

let mediaPipeLoaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`加载失败: ${src}`));
    document.head.appendChild(script);
  });
}

async function loadMediaPipe() {
  if (mediaPipeLoaded) return;
  await Promise.all([
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'),
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js'),
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'),
    loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js')
  ]);
  mediaPipeLoaded = true;
}

export const GestureEngine = {
  config: CONFIG,
  isReady: ref(false),
  isRunning: ref(false),
  error: ref(null),
  gestureText: ref(''),
  handX: ref(0.5),
  handY: ref(0.5),
  handDetected: ref(false),

  hands: null,
  camera: null,
  videoRef: null,
  canvasRef: null,
  cameraTimer: null,

  cursor: { x: 0.5, y: 0.5 },
  lastCursor: { x: 0.5, y: 0.5 },
  lastMoveEmitted: false,
  lastPinchTime: 0,
  lastSwipeTime: 0,
  lastFistTime: 0,
  lastOpenTime: 0,
  openStartTime: 0,
  fistStartTime: 0,
  lastHandX: 0,
  swipeHistory: [],
  pinchState: false,
  pinchStartTime: 0,
  currentState: '',
  currentDirection: '',
  idleTimer: null,

  async init() {
    if (this.hands) return;
    try {
      await loadMediaPipe();
      if (typeof window.Hands === 'undefined' || typeof window.Camera === 'undefined') {
        throw new Error('MediaPipe 库未正确加载');
      }
      this.isReady.value = true;
    } catch (err) {
      this.error.value = err.message;
      this.isReady.value = false;
      console.error('[GestureEngine] 初始化失败:', err);
    }
  },

  async start(videoRef, canvasRef) {
    if (!this.isReady.value) await this.init();
    if (!this.isReady.value || !window.Hands || !window.Camera) return false;

    if (!videoRef || !canvasRef) {
      this.error.value = '手势渲染元素未准备好，请稍后重试';
      this.isRunning.value = false;
      console.warn('[GestureEngine] start 缺少 videoRef 或 canvasRef');
      return false;
    }

    this.videoRef = videoRef;
    this.canvasRef = canvasRef;
    this.isRunning.value = true;
    this.error.value = null;

    try {
      this.canvasRef.width = CONFIG.CAMERA_WIDTH;
      this.canvasRef.height = CONFIG.CAMERA_HEIGHT;

      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
      this.hands.onResults(this.onResults.bind(this));

      this.camera = new window.Camera(videoRef, {
        onFrame: async () => {
          if (this.isRunning.value && this.hands) {
            await this.hands.send({ image: videoRef });
          }
        },
        width: CONFIG.CAMERA_WIDTH,
        height: CONFIG.CAMERA_HEIGHT
      });

      await Promise.race([
        this.camera.start(),
        new Promise((_, reject) => {
          this.cameraTimer = setTimeout(() => reject(new Error('摄像头启动超时')), CONFIG.CAMERA_TIMEOUT_MS);
        })
      ]);

      clearTimeout(this.cameraTimer);
      return true;
    } catch (err) {
      let message = err.message || '摄像头初始化失败';
      if (err.name === 'NotAllowedError' || /permission|denied|allow/i.test(message)) {
        message = '摄像头权限被拒绝，请在浏览器地址栏允许摄像头访问后重试';
      } else if (/notfound|not found|in use/i.test(message)) {
        message = '未检测到可用摄像头，请检查设备连接';
      }
      this.error.value = message;
      this.isRunning.value = false;
      console.error('[GestureEngine] 启动失败:', err);
      return false;
    }
  },

  stop() {
    this.isRunning.value = false;
    if (this.camera) {
      try {
        this.camera.stop?.();
      } catch (e) {}
      this.camera = null;
    }
    if (this.hands) {
      try {
        this.hands.close?.();
      } catch (e) {}
      this.hands = null;
    }
    if (this.videoRef && this.videoRef.srcObject) {
      try {
        this.videoRef.srcObject.getTracks?.().forEach(track => track.stop());
        this.videoRef.srcObject = null;
      } catch (e) {}
    }
    clearTimeout(this.cameraTimer);
    clearTimeout(this.idleTimer);
    this.cursor = { x: 0.5, y: 0.5 };
    this.lastCursor = { x: 0.5, y: 0.5 };
    this.handX.value = 0.5;
    this.handY.value = 0.5;
    this.gestureText.value = '';
    this.pinchState = false;
    this.pinchStartTime = 0;
    this.currentState = '';
    this.currentDirection = '';
    this.fistStartTime = 0;
    this.openStartTime = 0;
    this.handDetected.value = false;
    bus.emit('gesture:state', { state: '' });
    bus.emit('gesture:idle');
  },

  onResults(results) {
    const ctx = this.canvasRef?.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvasRef.width, this.canvasRef.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-this.canvasRef.width, 0);
      ctx.drawImage(this.videoRef, 0, 0, this.canvasRef.width, this.canvasRef.height);
      ctx.restore();
    }

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
      this.gestureText.value = '';
      if (this.handDetected.value) {
        this.handDetected.value = false;
        clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(() => {
          this.currentState = '';
          bus.emit('gesture:idle');
        }, 500);
      }
      return;
    }

    this.handDetected.value = true;
    clearTimeout(this.idleTimer);
    const landmarks = results.multiHandLandmarks[0];
    this.detectGesture(landmarks);

    if (ctx) {
      this.drawSkeleton(ctx, landmarks);
    }
  },

  _emitRecognized(gestureName) {
    bus.emit('gesture:recognized', gestureName);
  },

  detectGesture(landmarks) {
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const wrist = landmarks[0];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const middleMCP = landmarks[9];

    const rawX = 1 - indexTip.x;
    const rawY = indexTip.y;

    this.cursor.x += (rawX - this.cursor.x) * CONFIG.CURSOR_LERP;
    this.cursor.y += (rawY - this.cursor.y) * CONFIG.CURSOR_LERP;

    const dx = Math.abs(this.cursor.x - this.lastCursor.x) * window.innerWidth;
    const dy = Math.abs(this.cursor.y - this.lastCursor.y) * window.innerHeight;
    const moved = dx > CONFIG.HAND_DEAD_ZONE_PX || dy > CONFIG.HAND_DEAD_ZONE_PX;

    if (moved || !this.lastMoveEmitted) {
      this.handX.value = this.cursor.x;
      this.handY.value = this.cursor.y;
      bus.emit('gesture:move', { x: this.cursor.x, y: this.cursor.y, velocity: { x: dx, y: dy } });
      this.lastCursor = { x: this.cursor.x, y: this.cursor.y };
      this.lastMoveEmitted = true;
    }

    const pinchDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
    const now = performance.now();

    const isIndexExtended = indexTip.y < middleMCP.y;
    const isMiddleExtended = middleTip.y < middleMCP.y;
    const isRingExtended = ringTip.y < middleMCP.y;
    const isPinkyExtended = pinkyTip.y < middleMCP.y;

    const isFist = !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;

    const isOpen = isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended;

    let detectedState = '';
    let detectedDirection = '';
    this.swipeHistory.push({ x: wrist.x, t: now });
    this.swipeHistory = this.swipeHistory.filter(p => now - p.t < 400);
    if (this.swipeHistory.length >= 2 && now - this.lastSwipeTime > CONFIG.SWIPE_COOLDOWN_MS) {
      const first = this.swipeHistory[0].x;
      const last = this.swipeHistory[this.swipeHistory.length - 1].x;
      const delta = first - last;
      if (Math.abs(delta) > CONFIG.SWIPE_THRESHOLD) {
        this.lastSwipeTime = now;
        const dir = delta > 0 ? -1 : 1;
        const direction = dir > 0 ? 'right' : 'left';
        this.gestureText.value = dir > 0 ? '右挥 · 下一年' : '左挥 · 上一年';
        this._emitRecognized('swipe');
        bus.emit('gesture:swipe', dir);
        bus.emit('gesture:swipe:direction', direction);
        detectedState = 'swiping';
        detectedDirection = direction;
      }
    }

    if (pinchDist < CONFIG.PINCH_THRESHOLD) {
      if (!this.pinchState) {
        this.pinchState = true;
        this.pinchStartTime = now;
        this._emitRecognized('pinch');
        bus.emit('gesture:pinch:start');
      }
      if (now - this.pinchStartTime > 120 && now - this.lastPinchTime > CONFIG.PINCH_COOLDOWN_MS) {
        this.lastPinchTime = now;
        this.pinchState = false;
        this.gestureText.value = '捏合 · 选择';
        bus.emit('gesture:pinch-complete');
        bus.emit('gesture:pinch:complete');
        bus.emit('gesture:select');
      }
      if (!detectedState) detectedState = 'pinching';
    } else {
      if (this.pinchState) {
        this.pinchState = false;
      }
    }

    let fistProgress = 0;
    if (isFist) {
      if (!this.fistStartTime) this.fistStartTime = now;
      fistProgress = Math.min(1, (now - this.fistStartTime) / CONFIG.FIST_HOLD_MS);
      bus.emit('gesture:fist:progress', fistProgress);
      if (fistProgress >= 1 && now - this.lastFistTime > CONFIG.PINCH_COOLDOWN_MS) {
        this.lastFistTime = now;
        this.gestureText.value = '握拳 · 返回';
        this._emitRecognized('fist');
        bus.emit('gesture:fist-complete');
        bus.emit('gesture:back');
        this.fistStartTime = now + 1000;
      }
      if (!detectedState) detectedState = 'fist';
    } else {
      this.fistStartTime = 0;
      bus.emit('gesture:fist:progress', 0);
    }

    let openProgress = 0;
    if (isOpen) {
      if (!this.openStartTime) this.openStartTime = now;
      openProgress = Math.min(1, (now - this.openStartTime) / CONFIG.OPEN_HOLD_MS);
      bus.emit('gesture:open:progress', openProgress);
      // 设计文档：🖐 五指张开 = 打开详情面板（不是返回）
      // 与 ✊ 握拳（返回）区分开，避免两个手势语义冲突
      if (openProgress >= 1 && now - this.lastOpenTime > CONFIG.PINCH_COOLDOWN_MS) {
        this.lastOpenTime = now;
        this.gestureText.value = '张开 · 打开详情';
        this._emitRecognized('open');
        bus.emit('gesture:open-complete');
        bus.emit('gesture:select');
        this.openStartTime = now + 1000;
      }
      if (!detectedState) detectedState = 'open';
    } else {
      this.openStartTime = 0;
      bus.emit('gesture:open:progress', 0);
    }

    if (!detectedState) {
      detectedState = 'pointing';
      if (this.currentState !== 'pointing') {
        this._emitRecognized('point');
      }
    }

    if (this.currentState !== detectedState || this.currentDirection !== detectedDirection) {
      this.currentState = detectedState;
      this.currentDirection = detectedDirection;
      bus.emit('gesture:state', { state: detectedState, direction: detectedDirection });
    }

    if (!this.gestureText.value) {
      this.gestureText.value = isOpen ? '张开手掌' : (isFist ? '握拳' : '指向');
    }
  },

  drawSkeleton(ctx, landmarks) {
    ctx.fillStyle = '#a78bfa';
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.6)';
    ctx.lineWidth = 1.5;

    for (const lm of landmarks) {
      ctx.beginPath();
      ctx.arc(lm.x * ctx.canvas.width, lm.y * ctx.canvas.height, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
