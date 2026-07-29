<template>
  <section class="phase-universe">
    <div class="deep-space"></div>
    <div v-if="shouldUseVideo && videoLoaded !== false" class="universe-video-wrap">
      <video
        ref="bgVideo"
        class="universe-video"
        :class="{ 'is-loaded': videoLoaded === true }"
        autoplay
        muted
        loop
        playsinline
        :poster="baseUrl + 'images/generated/anime-starry-poster.jpg'"
        :src="baseUrl + 'images/generated/anime-starry-universe.mp4'"
        @error="onVideoError"
        @loadeddata="onVideoLoaded"
      ></video>
      <div class="universe-video-veil"></div>
    </div>
    <div class="star-dust"></div>
    <canvas ref="universeCanvas" id="universe-canvas"></canvas>

    <div class="cockpit-frame">
      <svg class="cockpit-svg" viewBox="0 0 1920 1080" preserveAspectRatio="none">
        <defs>
          <linearGradient id="frameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#ff9ec4" stop-opacity="0.0"/>
            <stop offset="15%" stop-color="#ff9ec4" stop-opacity="0.3"/>
            <stop offset="50%" stop-color="#c9b1ff" stop-opacity="0.35"/>
            <stop offset="85%" stop-color="#b8e0ff" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#b8e0ff" stop-opacity="0.0"/>
          </linearGradient>
          <linearGradient id="frameGradV" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#ff9ec4" stop-opacity="0.0"/>
            <stop offset="15%" stop-color="#ff9ec4" stop-opacity="0.25"/>
            <stop offset="50%" stop-color="#c9b1ff" stop-opacity="0.3"/>
            <stop offset="85%" stop-color="#b8e0ff" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#b8e0ff" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="M0,60 Q80,20 240,15 Q600,8 960,8 Q1320,8 1680,15 Q1840,20 1920,60 L1920,0 L0,0 Z" fill="url(#frameGrad)" opacity="0.6"/>
        <path d="M0,1020 Q80,1060 240,1065 Q600,1072 960,1072 Q1320,1072 1680,1065 Q1840,1060 1920,1020 L1920,1080 L0,1080 Z" fill="url(#frameGrad)" opacity="0.6"/>
        <path d="M60,0 Q20,80 15,240 Q8,500 8,540 Q8,580 15,840 Q20,1000 60,1080 L0,1080 L0,0 Z" fill="url(#frameGradV)" opacity="0.5"/>
        <path d="M1860,0 Q1900,80 1905,240 Q1912,500 1912,540 Q1912,580 1905,840 Q1900,1000 1860,1080 L1920,1080 L1920,0 Z" fill="url(#frameGradV)" opacity="0.5"/>
        <text x="100" y="100" fill="#ff9ec4" font-size="18" opacity="0.6">✦</text>
        <text x="1800" y="100" fill="#b8e0ff" font-size="18" opacity="0.6">✦</text>
        <text x="100" y="1000" fill="#c9b1ff" font-size="18" opacity="0.6">✦</text>
        <text x="1800" y="1000" fill="#ff9ec4" font-size="18" opacity="0.6">✦</text>
      </svg>
    </div>

    <div class="cockpit-readout top-left">
      <span class="readout-label">✨</span>
      <span class="readout-val">NEBULA.NAV v3.2</span>
    </div>
    <div class="cockpit-readout top-right">
      <span class="readout-val" ref="coordReadout">COORD: α-Centauri</span>
      <span class="readout-label">🗺️</span>
    </div>
    <div class="cockpit-readout bottom-left">
      <span class="readout-label">💫</span>
      <span class="readout-val">STABLE · 98.7%</span>
    </div>
    <div class="cockpit-readout bottom-right">
      <span class="readout-val" ref="starCountReadout">{{ dataCount }} STARS INDEXED</span>
      <span class="readout-label">📊</span>
    </div>

    <div v-if="loading" class="universe-loading">
      <div class="loading-spinner"></div>
      <p>{{ dataLoading ? '正在加载星云数据库…' : '正在构建动漫宇宙…' }}</p>
    </div>

    <HUD
      v-if="hudReady"
      :count="dataCount"
      :voice-active="voiceActive"
      :voice-supported="voiceSupported"
      :narrator-enabled="narratorEnabled"
      :narrator-supported="narratorSupported"
      :active-year="activeYear"
      @filter-genre="onFilterGenre"
      @search="onSearch"
      @reset-camera="onResetCamera"
      @focus-nebula="onFocusNebula"
      @focus-year="onFocusYear"
      @toggle-fullscreen="onToggleFullscreen"
      @toggle-voice="onToggleVoice"
      @toggle-narrator="onToggleNarrator"
    />

    <NodePanel
      v-if="hudReady"
      :anime="selectedAnime"
      :relations="selectedRelations"
      :visible="!!selectedAnime"
      @close="onClosePanel"
      @locate="onLocateStar"
      @focus-related="onFocusRelated"
    />

    <div v-if="hoveredAnime" class="star-tooltip" :style="tooltipStyle">
      <div class="tooltip-title">{{ hoveredAnime.titleRomaji }}</div>
      <div class="tooltip-meta">
        {{ hoveredAnime.year }} · {{ hoveredAnime.genres?.[0] }} · Score: {{ hoveredAnime.score || hoveredAnime.averageScore || 'N/A' }}
      </div>
    </div>

    <!-- 手势摄像头 -->
    <div class="camera-section" :class="{ minimized: cameraMinimized }">
      <div v-if="!gestureReady && !gestureError" class="gesture-start" @click="startGesture">
        <span>🖐</span>
        <div>开启手势</div>
      </div>

      <template v-else>
        <div class="camera-container">
          <video ref="gestureVideo" class="gesture-video" autoplay playsinline muted></video>
          <canvas ref="gestureCanvas" class="gesture-canvas"></canvas>
          <div class="camera-controls">
            <button class="camera-btn" :title="cameraMinimized ? '展开' : '最小化'" @click="cameraMinimized = !cameraMinimized">
              {{ cameraMinimized ? '+' : '−' }}
            </button>
            <button class="camera-btn" title="关闭" @click="stopGesture">×</button>
          </div>
        </div>
        <div v-if="!gestureError" class="gesture-badge">{{ gestureText }}</div>
        <div v-if="gestureError" class="gesture-error">
          {{ gestureError }}
          <button class="retry-btn" @click="startGesture">重试</button>
        </div>
      </template>
    </div>

    <!-- 手势热区提示 -->
    <div v-if="gestureReady && !handDetected" class="gesture-hint">
      <span class="hint-icon">✋</span>
      <span>请将手移入摄像头画面</span>
    </div>

    <!-- 手势新手引导 -->
    <div v-if="showGestureGuide" class="gesture-guide" @click="closeGestureGuide">
      <div class="guide-card" @click.stop>
        <h3>手势导航指南</h3>
        <div class="guide-grid">
          <div class="guide-item">
            <div class="guide-icon">☝️</div>
            <div class="guide-title">食指移动</div>
            <div class="guide-desc">移动光标探索恒星</div>
          </div>
          <div class="guide-item">
            <div class="guide-icon">👌</div>
            <div class="guide-title">捏合手指</div>
            <div class="guide-desc">选中当前恒星</div>
          </div>
          <div class="guide-item">
            <div class="guide-icon">✊</div>
            <div class="guide-title">握拳</div>
            <div class="guide-desc">返回 / 关闭面板</div>
          </div>
          <div class="guide-item">
            <div class="guide-icon">👋</div>
            <div class="guide-title">左右挥手</div>
            <div class="guide-desc">切换年份</div>
          </div>
        </div>
        <div class="guide-tip">提示：将光标停在恒星上，会自动选中</div>
        <button class="guide-close" @click="closeGestureGuide">明白了</button>
      </div>
    </div>

    <!-- 手势光标层 -->
    <canvas v-show="gestureReady" ref="cursorCanvas" class="cursor-layer"></canvas>

    <!-- AI / 语音反馈 -->
    <div v-if="aiFeedback" class="ai-feedback">{{ aiFeedback }}</div>

    <!-- 星轨时间轴 -->
    <OrbitTimeline />
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, defineAsyncComponent } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';
import { KnowledgeEngine } from '../engines/data/KnowledgeEngine.js';
import { GalaxyEngine } from '../engines/universe/GalaxyEngine.js';
import { SpiralUniverse } from '../engines/universe/SpiralUniverse.js';
import { InteractionEngine } from '../engines/interaction/InteractionEngine.js';
import { GestureEngine } from '../engines/interaction/GestureEngine.js';
import { VoiceEngine } from '../engines/interaction/VoiceEngine.js';
import { AIEngine } from '../engines/ai/AIEngine.js';
import { VoiceNarrator } from '../engines/ai/VoiceNarrator.js';
import { VoicePlayer } from '../composables/useVoice.js';
import { StateEngine } from '../engines/core/StateEngine.js';
import { bus } from '../engines/core/EventBus.js';
import { FeedbackEngine } from '../engines/feedback/FeedbackEngine.js';
import { GestureActionEngine } from '../engines/interaction/GestureActionEngine.js';
import { useVideoBackground } from '../composables/useVideoBackground.js';
import OrbitTimeline from './OrbitTimeline.vue';
import { useUiSound } from '../composables/useUiSound.js';

GestureActionEngine.init();
useUiSound.init();

const HUD = defineAsyncComponent(() => import('./HUD.vue'));
const NodePanel = defineAsyncComponent(() => import('./NodePanel.vue'));

const baseUrl = import.meta.env.BASE_URL;
const { shouldUseVideo } = useVideoBackground();
const videoLoaded = ref(null);
const bgVideo = ref(null);
function onVideoLoaded() { videoLoaded.value = true; }
function onVideoError() { videoLoaded.value = false; }
const universeCanvas = ref(null);
const gestureVideo = ref(null);
const gestureCanvas = ref(null);
const cursorCanvas = ref(null);

const hudReady = ref(false);
const loading = ref(true);
const dataLoading = ref(true);
const dataCount = ref(0);

const selectedAnime = ref(null);
const selectedRelations = ref([]);
const hoveredAnime = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });
const cameraMinimized = ref(false);

const gestureReady = computed(() => GestureEngine.isReady.value && GestureEngine.isRunning.value);
const gestureError = computed(() => GestureEngine.error.value);
const gestureText = computed(() => GestureEngine.gestureText.value);
const handDetected = computed(() => GestureEngine.handDetected.value);
const voiceActive = computed(() => VoiceEngine.isListening.value);
const voiceSupported = computed(() => VoiceEngine.isSupported.value);
const narratorEnabled = computed(() => !VoiceNarrator.muted);
const narratorSupported = computed(() => VoicePlayer.isSupported.value);
const activeYear = computed(() => StateEngine.state.year);
const showGestureGuide = ref(false);
const GUIDE_STORAGE_KEY = 'animeverse-gesture-guide-seen';

const aiFeedback = ref('');
let aiFeedbackTimer = null;

const tooltipStyle = computed(() => ({
  left: `${tooltipPos.value.x + 16}px`,
  top: `${tooltipPos.value.y + 16}px`
}));

let galaxyApi = null;
let spiralApi = null;
let cleanupFns = [];
let hoveredId = null;
let lastDwellId = null;
let hoverStartTime = 0;
let dwellRafId = null;
let dwellProgress = 0;
const DWELL_SELECT_MS = 900; // 手势悬停停留选择阈值
const isFallback2D = ref(false);
let currentGestureState = '';
let zoomEdgeTimer = null;

// 输入事件节流
let pointerThrottleTimer = null;
let pendingPointer = null;
const POINTER_THROTTLE_MS = 16;

onMounted(async () => {
  try {
    // 1. 加载数据
    dataLoading.value = true;
    await DataEngine.load();
    dataLoading.value = false;
    dataCount.value = DataEngine.data.value.length;

    // 1.5 初始化 AI 引擎与语音导游（数据未完全加载也可先绑定事件）
    AIEngine.init();
    VoiceNarrator.init();
    VoiceNarrator.muted = StateEngine.state.narratorMuted;

    // 2. 初始化 3D 宇宙；若失败则自动降级到 2D 螺旋宇宙
    let webglOk = false;
    try {
      galaxyApi = GalaxyEngine(universeCanvas, {
        onError: (msg) => {
          console.warn('[UniversePhase] WebGL 错误:', msg);
        },
        onReady: () => {
          loading.value = false;
        }
      });
      webglOk = galaxyApi.init();
      if (!webglOk) throw new Error('WebGL init returned false');
    } catch (err) {
      console.warn('[UniversePhase] WebGL 不可用，自动降级到 2D 螺旋宇宙:', err);
      webglOk = false;
      // 彻底丢弃失败的 galaxyApi，避免后续统一接口误调用
      if (galaxyApi) {
        try { galaxyApi.dispose?.(); } catch (e) {}
        galaxyApi = null;
      }
    }

    if (!webglOk) {
      isFallback2D.value = true;
      spiralApi = new SpiralUniverse(universeCanvas.value);
      await spiralApi.init();
      spiralApi.start();
      spiralApi.onNodeHover = (node) => {
        updateHover(node ? node.id : null);
      };
      spiralApi.onNodeClick = (node) => {
        if (node) StateEngine.select(node.id);
      };
      loading.value = false;
    }

    // 3. 绑定交互引擎
    // 注：鼠标/手势/键盘动作统一走 bus 事件，避免回调与 bus 监听重复执行
    InteractionEngine.init({
      canvas: universeCanvas.value
    });

    // 4. 全局事件监听
    // 鼠标/键盘/手势/语音的原始输入统一由 InteractionEngine 路由到 GestureActionEngine，
    // 这里只监听状态变化与语义动作，避免重复处理。
    cleanupFns.push(
      bus.on('input:fullscreen', () => {
        onToggleFullscreen();
      }),
      bus.on('input:pointer', (payload) => {
        // 节流：避免每帧都执行 raycast 和 hover 更新
        pendingPointer = payload;
        if (!pointerThrottleTimer) {
          pointerThrottleTimer = setTimeout(() => {
            pointerThrottleTimer = null;
            if (!pendingPointer) return;
            const p = pendingPointer;
            pendingPointer = null;
            apiSetPointer(p.x, p.y);
            const id = apiRaycast();
            updateHover(id);

            // 手势模式下：光标跟随手部，并触发悬停停留选择
            if (StateEngine.state.inputMode === 'hand') {
              tooltipPos.value = { x: p.x, y: p.y };
              updateDwellSelection(id);
            }
          }, POINTER_THROTTLE_MS);
        }
      }),
      bus.on('state:selectedId', ({ value }) => {
        selectedAnime.value = value ? DataEngine.byId(value) : null;
        selectedRelations.value = value ? KnowledgeEngine.neighbors(value, null, 8) : [];
      }),
      bus.on('state:hoveredId', ({ value }) => {
        hoveredAnime.value = value ? DataEngine.byId(value) : null;
      }),
      bus.on('state:year', ({ value }) => {
        if (value) apiFocusYear(value);
      }),
      bus.on('state:activeGenre', ({ value }) => {
        apiHighlightGenre(value);
      }),
      bus.on('ai:narrate', (text) => {
        showAiFeedback(text);
      }),
      bus.on('voice:text', (text) => {
        AIEngine.process(text);
      }),
      bus.on('action:search', (payload) => {
        onSearch(payload);
      }),
      bus.on('search:cleared', () => {
        if (galaxyApi) galaxyApi.resetHighlight?.();
      }),
      bus.on('action:focus-year', (year) => {
        if (year != null) apiFocusYear(year);
      }),
      bus.on('action:focus-anime', (id) => {
        if (id) apiFocusAnime(id);
      }),
      bus.on('action:reset-camera', () => {
        onResetCamera();
      }),
      // 手势语义动作统一由 InteractionEngine 路由到 GestureActionEngine，
      // 这里只处理与 3D/2D 渲染直接相关的手势副作用（光标、相机边缘旋转/缩放）。
      bus.on('gesture:state', ({ state }) => {
        currentGestureState = state || '';
      }),
      bus.on('gesture:move', (payload) => {
        if (StateEngine.state.inputMode !== 'hand') return;
        // 如果手势模式下没有悬停到恒星，手部移动控制相机旋转/缩放
        if (!hoveredId && galaxyApi && !selectedAnime.value) {
          const { x, y } = payload;
          const edgeSize = 0.18;
          let rotDx = 0, rotDy = 0;
          if (x < edgeSize) rotDx = -(edgeSize - x) / edgeSize;
          else if (x > 1 - edgeSize) rotDx = (x - (1 - edgeSize)) / edgeSize;
          if (y < edgeSize) rotDy = (edgeSize - y) / edgeSize;
          else if (y > 1 - edgeSize) rotDy = -(y - (1 - edgeSize)) / edgeSize;

          // 张开手掌时，上下边缘控制缩放；其他状态左右边缘控制旋转
          const isOpenForZoom = currentGestureState === 'open' || currentGestureState === 'pointing';
          if (isOpenForZoom && Math.abs(rotDy) > 0.02 && Math.abs(rotDx) < 0.05) {
            const zoomDir = y < edgeSize ? -1 : 1;
            GestureActionEngine.zoom(zoomDir * 2.5);
            // 缩放节流，避免连续触发过快
            if (zoomEdgeTimer) clearTimeout(zoomEdgeTimer);
            zoomEdgeTimer = setTimeout(() => {}, 120);
          } else if (Math.abs(rotDx) > 0.02 || Math.abs(rotDy) > 0.02) {
            galaxyApi.rotateCameraByVelocity?.(rotDx * 1.2, rotDy * 0.8);
          }
        }
      })
    );

    // 5. 知识图谱后台加载完成后，若已选中恒星则刷新关系
    const stopGraphWatch = watch(DataEngine.graphLoaded, (ready) => {
      if (ready && selectedAnime.value) {
        selectedRelations.value = KnowledgeEngine.neighbors(selectedAnime.value.id, null, 8);
      }
    });
    cleanupFns.push(stopGraphWatch);

    // 6. 绑定手势就绪状态
    const stopGestureWatch = watch(gestureReady, (ready) => {
      apiSetHandControl(ready);
      if (ready) apiSetInputMode('hand');
      else if (StateEngine.state.inputMode === 'hand') apiSetInputMode('mouse');
    });
    cleanupFns.push(stopGestureWatch);

    // 初始化语音与手势能力（不自动请求摄像头/麦克风，等用户点击按钮后再启动）
    try {
      VoiceEngine.init();
      await GestureEngine.init();
      if (cursorCanvas.value) {
        FeedbackEngine.init(cursorCanvas.value);
      }
    } catch (e) {
      console.warn('[UniversePhase] 交互引擎预初始化失败:', e);
    }

    // 7. 鼠标 tooltip 备用
    const onPointerMove = (e) => {
      if (!gestureReady.value) {
        tooltipPos.value = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener('pointermove', onPointerMove);
    cleanupFns.push(() => window.removeEventListener('pointermove', onPointerMove));

    hudReady.value = true;
  } catch (err) {
    console.error('[UniversePhase] 初始化失败:', err);
    // 即使整体初始化失败，也尝试降级到 2D 宇宙
    try {
      isFallback2D.value = true;
      spiralApi = new SpiralUniverse(universeCanvas.value);
      await spiralApi.init();
      spiralApi.start();
      spiralApi.onNodeHover = (node) => updateHover(node ? node.id : null);
      spiralApi.onNodeClick = (node) => { if (node) StateEngine.select(node.id); };
    } catch (e2) {
      console.error('[UniversePhase] 2D 降级也失败了:', e2);
    }
    loading.value = false;
  }
});

// ===== 统一操作接口（兼容3D和2D降级模式） =====
function apiAvailable() {
  return galaxyApi || spiralApi;
}

function apiSetPointer(x, y) {
  if (galaxyApi) galaxyApi.setPointerFromScreen?.(x, y);
  else if (spiralApi) spiralApi.setPointerFromScreen(x, y);
}

function apiRaycast() {
  if (galaxyApi) return galaxyApi.raycast?.();
  return spiralApi?.hoveredNode?.id || null;
}

function apiSelect(id) {
  if (id) useUiSound.select();
  else useUiSound.back();
  if (galaxyApi) galaxyApi.select?.(id);
  else if (spiralApi && id) spiralApi.focusOnNode(id);
}

function apiZoom(delta) {
  if (galaxyApi) galaxyApi.zoom?.(delta * 0.25);
  else if (spiralApi) {
    const factor = delta > 0 ? 0.93 : 1.07;
    spiralApi.gestureZoom(factor, window.innerWidth / 2, window.innerHeight / 2);
  }
}

function apiRotate(dx, dy) {
  if (galaxyApi) galaxyApi.rotateCameraByVelocity?.(dx, dy);
  else if (spiralApi) {
    // 2D 模式下将 normalized 旋转量转换为屏幕像素偏移，拖拽手感与 3D 对齐
    spiralApi.gestureMove(dx * window.innerWidth * 0.5, dy * window.innerHeight * 0.5);
  }
}

function apiHighlightHovered(id) {
  if (galaxyApi) galaxyApi.highlightHovered?.(id);
  // 2D模式下hover由内部事件驱动
}

function apiFocusAnime(id) {
  if (galaxyApi) galaxyApi.focusOnAnime?.(id);
  else if (spiralApi) spiralApi.focusOnNode(id);
}

function apiHighlightGenre(genre) {
  if (galaxyApi) galaxyApi.highlightGenre?.(genre);
  else if (spiralApi) spiralApi.focusOnGenre(genre);
}

function apiFocusYear(year) {
  if (galaxyApi) galaxyApi.focusOnYear?.(year);
  else if (spiralApi) spiralApi.focusOnYear?.(year);
}

function apiSetHandControl(ready) {
  if (galaxyApi) galaxyApi.setHandControl?.(ready);
  // 2D模式下手势控制由gestureMove/gestureZoom处理
}

function apiSetInputMode(mode) {
  if (galaxyApi) galaxyApi.setInputMode?.(mode);
  if (spiralApi) spiralApi.setInputMode?.(mode);
  StateEngine.set('inputMode', mode);
}

function apiAnimateCamera(config) {
  if (galaxyApi) galaxyApi.animateCamera?.(config);
  else if (spiralApi) spiralApi.resetView();
}

function apiResetCamera() {
  if (galaxyApi) galaxyApi.resetCameraState?.();
  else if (spiralApi) spiralApi.resetView();
}

function apiDispose() {
  if (galaxyApi) galaxyApi.dispose?.();
  if (spiralApi) spiralApi.destroy?.();
}

onUnmounted(() => {
  cleanupFns.forEach(fn => typeof fn === 'function' && fn());
  if (dwellRafId) cancelAnimationFrame(dwellRafId);
  if (pointerThrottleTimer) clearTimeout(pointerThrottleTimer);
  if (zoomEdgeTimer) clearTimeout(zoomEdgeTimer);
  if (aiFeedbackTimer) clearTimeout(aiFeedbackTimer);
  InteractionEngine.dispose();
  AIEngine.dispose?.();
  VoiceNarrator.dispose?.();
  VoiceEngine.stop();
  GestureEngine.stop();
  FeedbackEngine.dispose();
  DataEngine.abortGraphLoad?.();
  apiDispose();
});

function updateHover(id) {
  if (hoveredId === id) return;
  // 悬停到新恒星时播放轻音（新目标才响，避免抖动重复）
  if (id) useUiSound.hover();
  hoveredId = id;
  StateEngine.hover(id);
  apiHighlightHovered(id);
}

function updateDwellSelection(id) {
  // 仅在有真实悬停目标、且处于手势模式时启用停留选择
  // 如果已打开详情面板，dwell 用于关闭面板（返回）
  if (!id) {
    if (dwellRafId) {
      cancelAnimationFrame(dwellRafId);
      dwellRafId = null;
    }
    lastDwellId = null;
    dwellProgress = 0;
    bus.emit('gesture:dwell-progress', 0);
    return;
  }

  // 如果悬停目标改变，重置 dwell 计时器
  if (lastDwellId !== id) {
    if (dwellRafId) {
      cancelAnimationFrame(dwellRafId);
      dwellRafId = null;
    }
    lastDwellId = id;
    hoverStartTime = performance.now();
    dwellProgress = 0;
    bus.emit('gesture:dwell-progress', 0);
  }

  if (!dwellRafId) {
    const step = () => {
      const elapsed = performance.now() - hoverStartTime;
      dwellProgress = Math.min(1, elapsed / DWELL_SELECT_MS);
      bus.emit('gesture:dwell-progress', dwellProgress);
      if (dwellProgress >= 1) {
        dwellRafId = null;
        // 完成选择：先选中，再重置状态
        if (selectedAnime.value && selectedAnime.value.id === id) {
          // 已经选中，再次 dwell 不做操作
        } else {
          apiSelect(id);
          StateEngine.select(id);
        }
        lastDwellId = null;
        dwellProgress = 0;
        bus.emit('gesture:dwell-progress', 0);
        bus.emit('gesture:dwell-complete');
      } else {
        dwellRafId = requestAnimationFrame(step);
      }
    };
    dwellRafId = requestAnimationFrame(step);
  }
}

function startGesture() {
  GestureEngine.init().then(() => {
    GestureEngine.start(gestureVideo.value, gestureCanvas.value);
    // 首次开启手势时显示新手引导
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(GUIDE_STORAGE_KEY)) {
      showGestureGuide.value = true;
    }
  });
}

function stopGesture() {
  GestureEngine.stop();
  showGestureGuide.value = false;
}

function closeGestureGuide() {
  showGestureGuide.value = false;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(GUIDE_STORAGE_KEY, '1');
  }
}

function onToggleVoice() {
  VoiceEngine.toggle();
}

function onToggleNarrator() {
  const muted = VoiceNarrator.toggleMute();
  StateEngine.set('narratorMuted', muted);
}

function onClosePanel() {
  useUiSound.back();
  StateEngine.select(null);
}

function onLocateStar(anime) {
  if (!anime || !apiAvailable()) return;
  StateEngine.select(null);
  apiFocusAnime(anime.id);
}

function onFocusRelated(anime) {
  if (!anime) return;
  StateEngine.select(anime.id);
}

function onFilterGenre(genre) {
  GestureActionEngine.focusGenre(genre);
}

function onFocusYear(year) {
  useUiSound.swipe();
  GestureActionEngine.focusYear(year);
}

function onSearch(payload) {
  // 来自 HUD / 语音的字符串搜索请求交给 GestureActionEngine 统一处理；
  // 来自 GestureActionEngine 的回包对象只负责高亮结果，避免循环触发。
  if (typeof payload === 'string') {
    GestureActionEngine.search(payload);
    return;
  }
  if (payload && typeof payload === 'object') {
    if (payload.results && galaxyApi) {
      galaxyApi.highlightSearchResults?.(payload.results);
    }
    if (payload.query && spiralApi) {
      spiralApi.focusOnSearchResults?.(DataEngine.search(payload.query));
    }
  }
}

function onResetCamera() {
  if (galaxyApi) {
    apiAnimateCamera({
      target: { x: 0, y: 0, z: 0 },
      radius: 260,
      theta: 0,
      phi: Math.PI / 2.5
    });
  } else {
    apiResetCamera();
  }
}

function onFocusNebula(genre) {
  GestureActionEngine.focusGenre(genre);
}

function onToggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.().catch(() => {});
  }
}

function showAiFeedback(text) {
  aiFeedback.value = text;
  if (aiFeedbackTimer) clearTimeout(aiFeedbackTimer);
  aiFeedbackTimer = setTimeout(() => {
    aiFeedback.value = '';
  }, 3500);
}
</script>

<style scoped>
.phase-universe {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #0a0618 0%, #060310 100%);
  overflow: hidden;
  animation: universeFadeIn 1.2s ease-out;
}
@keyframes universeFadeIn {
  from { opacity: 0; filter: brightness(2) blur(8px); }
  to { opacity: 1; filter: brightness(1) blur(0); }
}

.cg-vignette::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background: radial-gradient(ellipse at center, transparent 50%, rgba(10, 6, 24, 0.6) 100%);
}

.deep-space {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(ellipse at 50% 50%, #1a0a30 0%, #0d0620 40%, #060310 100%);
  pointer-events: none;
}

.universe-video-wrap {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
}

.universe-video {
  position: absolute;
  width: 110%;
  height: 110%;
  top: -5%;
  left: -5%;
  object-fit: cover;
  opacity: 0;
  filter: saturate(1.2) brightness(0.45) hue-rotate(-10deg);
  transition: opacity 2s ease;
}

.universe-video.is-loaded {
  opacity: 0.6;
}

.universe-video-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 30% 40%, rgba(255,158,196,0.08), transparent 50%),
    radial-gradient(ellipse at 70% 60%, rgba(201,177,255,0.08), transparent 50%),
    linear-gradient(180deg, rgba(10,6,24,0.3) 0%, transparent 30%, transparent 70%, rgba(10,6,24,0.5) 100%);
  pointer-events: none;
}

.star-dust {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  width: 2px;
  height: 2px;
  background: transparent;
  border-radius: 50%;
  box-shadow:
    120px 80px 0 0 #fff,
    240px 150px 0 0 #ff9ec4,
    380px 50px 0 0 #c9b1ff,
    500px 200px 0 0 #b8e0ff,
    650px 120px 0 0 #fff,
    780px 300px 0 0 #ffd6e7,
    900px 80px 0 0 #e0d4ff,
    1050px 250px 0 0 #fff,
    1200px 180px 0 0 #ff9ec4,
    1350px 60px 0 0 #c9b1ff,
    1500px 220px 0 0 #fff,
    1650px 140px 0 0 #b8e0ff,
    80px 350px 0 0 #ffd6e7,
    200px 480px 0 0 #fff,
    350px 400px 0 0 #e0d4ff,
    520px 550px 0 0 #ff9ec4,
    680px 420px 0 0 #fff,
    820px 600px 0 0 #c9b1ff,
    950px 380px 0 0 #b8e0ff,
    1100px 520px 0 0 #fff,
    1280px 450px 0 0 #ffd6e7,
    1420px 580px 0 0 #fff,
    1580px 400px 0 0 #ff9ec4,
    1750px 500px 0 0 #c9b1ff,
    100px 680px 0 0 #fff,
    280px 750px 0 0 #b8e0ff,
    420px 620px 0 0 #e0d4ff,
    580px 800px 0 0 #ff9ec4,
    720px 700px 0 0 #fff,
    880px 850px 0 0 #ffd6e7,
    1020px 650px 0 0 #c9b1ff,
    1180px 780px 0 0 #fff,
    1320px 680px 0 0 #b8e0ff,
    1480px 820px 0 0 #ff9ec4,
    1620px 720px 0 0 #fff,
    60px 900px 0 0 #e0d4ff,
    220px 980px 0 0 #fff,
    380px 880px 0 0 #ffd6e7,
    540px 1000px 0 0 #c9b1ff,
    700px 920px 0 0 #ff9ec4,
    860px 1020px 0 0 #fff,
    1000px 880px 0 0 #b8e0ff,
    1150px 960px 0 0 #fff,
    1300px 900px 0 0 #e0d4ff,
    1460px 1000px 0 0 #ffd6e7,
    1600px 940px 0 0 #fff,
    1780px 850px 0 0 #c9b1ff;
  animation: twinkle 4s ease-in-out infinite alternate;
}

.star-dust::before {
  content: '';
  position: absolute;
  width: 1px;
  height: 1px;
  background: transparent;
  border-radius: 50%;
  box-shadow:
    180px 120px 0 0 #fff,
    320px 220px 0 0 #ffb7d0,
    460px 80px 0 0 #d4c4ff,
    600px 300px 0 0 #c8e4ff,
    750px 180px 0 0 #fff,
    880px 380px 0 0 #ff9ec4,
    1020px 130px 0 0 #c9b1ff,
    1180px 320px 0 0 #fff,
    1320px 220px 0 0 #b8e0ff,
    1480px 100px 0 0 #ffd6e7,
    140px 420px 0 0 #e0d4ff,
    280px 550px 0 0 #fff,
    440px 480px 0 0 #ff9ec4,
    600px 620px 0 0 #c9b1ff,
    760px 500px 0 0 #fff,
    920px 680px 0 0 #b8e0ff,
    1080px 450px 0 0 #ffb7d0,
    1240px 600px 0 0 #fff,
    1400px 520px 0 0 #d4c4ff,
    1560px 650px 0 0 #fff,
    1700px 480px 0 0 #ff9ec4,
    160px 750px 0 0 #c8e4ff,
    340px 850px 0 0 #fff,
    480px 720px 0 0 #ffd6e7,
    640px 900px 0 0 #c9b1ff,
    800px 780px 0 0 #fff,
    960px 950px 0 0 #ffb7d0,
    1120px 720px 0 0 #e0d4ff,
    1260px 880px 0 0 #fff,
    1420px 780px 0 0 #b8e0ff,
    1560px 920px 0 0 #ff9ec4,
    1700px 800px 0 0 #fff;
  animation: twinkle 5s ease-in-out infinite alternate-reverse;
  animation-delay: -1.5s;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

#universe-canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  cursor: grab;
}

#universe-canvas:active {
  cursor: grabbing;
}

.cockpit-frame {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  opacity: 0;
  animation: cockpit-fade-in 1.5s ease-out 0.3s forwards;
}

.cockpit-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.cockpit-readout {
  position: absolute;
  z-index: 22;
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Courier New', 'Noto Sans SC', monospace;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  opacity: 0;
  animation: cockpit-fade-in 1.2s ease-out 0.8s forwards;
  pointer-events: none;
}

.cockpit-readout.top-left {
  top: 80px;
  left: 24px;
  opacity: 0.4;
}
.cockpit-readout.top-right {
  top: 80px;
  right: 24px;
  flex-direction: row-reverse;
  opacity: 0 !important;
  display: none;
}
.cockpit-readout.bottom-left {
  bottom: 100px;
  left: 24px;
  align-items: flex-end;
  opacity: 0.3;
}
.cockpit-readout.bottom-right {
  bottom: 180px;
  right: 24px;
  flex-direction: row-reverse;
  align-items: flex-end;
  opacity: 0 !important;
  display: none;
}

.readout-label {
  color: #ff9ec4;
  font-size: 12px;
  padding: 4px 10px;
  border: 1px solid rgba(255, 158, 196, 0.4);
  border-radius: 12px;
  background: rgba(255, 158, 196, 0.08);
  backdrop-filter: blur(4px);
}

.readout-val {
  color: #c9b1ff;
  text-shadow: 0 0 8px rgba(201, 177, 255, 0.5), 0 0 16px rgba(255, 158, 196, 0.2);
}

.star-tooltip {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  background: rgba(20, 10, 40, 0.92);
  border: 1px solid rgba(255, 158, 196, 0.35);
  border-radius: 12px;
  padding: 12px 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 0 24px rgba(255, 158, 196, 0.15), 0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 12px rgba(201, 177, 255, 0.05);
  max-width: 260px;
  position: relative;
  overflow: hidden;
}

.star-tooltip::before {
  content: '';
  position: absolute;
  top: 0;
  left: 10%;
  right: 10%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ff9ec4, #c9b1ff, transparent);
  opacity: 0.7;
  border-radius: 0 0 2px 2px;
}

.tooltip-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffb7d0;
  margin-bottom: 6px;
  text-shadow: 0 0 10px rgba(255, 158, 196, 0.5), 0 0 20px rgba(255, 158, 196, 0.2);
}

.tooltip-meta {
  font-size: 11px;
  color: rgba(201, 177, 255, 0.7);
  font-family: 'Courier New', 'Noto Sans SC', monospace;
  letter-spacing: 0.5px;
}

.universe-loading {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #ffb7d0;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(20, 10, 40, 0.3) 0%, rgba(10, 6, 24, 0.95) 70%);
}

.loading-spinner {
  width: 56px;
  height: 56px;
  border: 2px solid rgba(201, 177, 255, 0.15);
  border-top-color: #ff9ec4;
  border-right-color: rgba(201, 177, 255, 0.5);
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.2), inset 0 0 12px rgba(201, 177, 255, 0.1);
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes cockpit-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 手势摄像头 */
.camera-section {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  transition: all 0.3s ease;
}

.camera-container {
  position: relative;
  width: 200px;
  height: 150px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 158, 196, 0.35);
  background: rgba(20, 10, 40, 0.85);
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 158, 196, 0.1), inset 0 0 20px rgba(201, 177, 255, 0.04);
}

.camera-section.minimized .camera-container {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border-color: rgba(255, 158, 196, 0.5);
}

.gesture-video,
.gesture-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-section.minimized .gesture-video,
.camera-section.minimized .gesture-canvas {
  opacity: 0;
}

.camera-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.camera-container:hover .camera-controls,
.camera-controls:focus-within {
  opacity: 1;
}

.camera-btn {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid rgba(255, 158, 196, 0.4);
  background: rgba(20, 10, 40, 0.85);
  color: #ff9ec4;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.camera-btn:hover {
  background: rgba(255, 158, 196, 0.15);
  box-shadow: 0 0 12px rgba(255, 158, 196, 0.3);
}

.gesture-start {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  background: rgba(20, 10, 40, 0.85);
  border: 1px solid rgba(255, 158, 196, 0.4);
  color: #ff9ec4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 11px;
  gap: 4px;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.gesture-start:hover {
  background: rgba(255, 158, 196, 0.12);
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.25);
  border-color: rgba(255, 158, 196, 0.6);
  transform: translateY(-2px);
}

.gesture-start span {
  font-size: 24px;
}

.gesture-badge {
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(20, 10, 40, 0.9);
  border: 1px solid rgba(255, 158, 196, 0.35);
  color: #ff9ec4;
  font-size: 11px;
  letter-spacing: 0.5px;
  backdrop-filter: blur(8px);
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  box-shadow: 0 0 12px rgba(255, 158, 196, 0.1);
}

.gesture-error {
  max-width: 180px;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 42, 109, 0.1);
  border: 1px solid rgba(255, 158, 196, 0.3);
  color: #ffb7d0;
  font-size: 12px;
}

.retry-btn {
  margin-top: 8px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 158, 196, 0.4);
  background: rgba(255, 158, 196, 0.1);
  color: #ff9ec4;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 158, 196, 0.2);
  box-shadow: 0 0 12px rgba(255, 158, 196, 0.2);
}

.cursor-layer {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 40;
}

.ai-feedback {
  position: fixed;
  bottom: 200px;
  right: 20px;
  z-index: 25;
  padding: 12px 18px;
  border-radius: 12px;
  background: rgba(20, 10, 40, 0.92);
  border: 1px solid rgba(255, 158, 196, 0.3);
  border-left: 3px solid #ff9ec4;
  color: #e8dfff;
  font-size: 13px;
  backdrop-filter: blur(10px);
  max-width: 280px;
  pointer-events: none;
  line-height: 1.5;
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.1), 0 4px 16px rgba(0, 0, 0, 0.3);
}

.gesture-hint {
  position: fixed;
  bottom: 200px;
  right: 20px;
  z-index: 26;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(20, 10, 40, 0.92);
  border: 1px solid rgba(255, 158, 196, 0.4);
  color: #ff9ec4;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(255, 158, 196, 0.15);
  animation: hintPulse 2s ease-in-out infinite;
  pointer-events: none;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
  letter-spacing: 0.5px;
}

.hint-icon {
  font-size: 16px;
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.85; transform: translateY(0); box-shadow: 0 0 20px rgba(255, 158, 196, 0.15); }
  50% { opacity: 1; transform: translateY(-3px); box-shadow: 0 0 30px rgba(255, 158, 196, 0.25), 0 0 40px rgba(201, 177, 255, 0.1); }
}

/* 手势新手引导 */
.gesture-guide {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 6, 24, 0.8);
  backdrop-filter: blur(8px);
  animation: guideFadeIn 0.3s ease;
}

@keyframes guideFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.guide-card {
  width: min(520px, 90vw);
  padding: 32px 36px;
  border-radius: 16px;
  background: rgba(20, 10, 40, 0.96);
  border: 1px solid rgba(255, 158, 196, 0.35);
  box-shadow: 0 0 60px rgba(255, 158, 196, 0.15), 0 8px 40px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(201, 177, 255, 0.04);
  color: #fff;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.guide-card::before {
  content: '✦';
  position: absolute;
  top: 12px;
  left: 16px;
  color: #ff9ec4;
  font-size: 14px;
  opacity: 0.5;
}

.guide-card::after {
  content: '✧';
  position: absolute;
  bottom: 12px;
  right: 16px;
  color: #c9b1ff;
  font-size: 14px;
  opacity: 0.5;
}

.guide-card h3 {
  margin: 0 0 24px;
  font-size: 22px;
  font-weight: 700;
  color: #ff9ec4;
  letter-spacing: 2px;
  text-shadow: 0 0 12px rgba(255, 158, 196, 0.5), 0 0 24px rgba(255, 158, 196, 0.2);
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  margin-bottom: 20px;
}

.guide-item {
  padding: 18px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: all 0.25s ease;
}

.guide-item:hover {
  background: rgba(255, 158, 196, 0.06);
  border-color: rgba(255, 158, 196, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(255, 158, 196, 0.1);
}

.guide-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.guide-title {
  font-size: 14px;
  font-weight: 700;
  color: #ffb7d0;
  margin-bottom: 4px;
}

.guide-desc {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}

.guide-tip {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 24px;
  padding: 12px 18px;
  border-radius: 12px;
  background: rgba(255, 158, 196, 0.06);
  border: 1px solid rgba(255, 158, 196, 0.2);
  border-left: 3px solid rgba(255, 158, 196, 0.5);
}

.guide-close {
  padding: 12px 44px;
  border-radius: 20px;
  border: 1px solid rgba(255, 158, 196, 0.5);
  background: rgba(255, 158, 196, 0.1);
  color: #ff9ec4;
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
}

.guide-close:hover {
  background: rgba(255, 158, 196, 0.2);
  box-shadow: 0 0 24px rgba(255, 158, 196, 0.3);
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .camera-section {
    bottom: 12px;
    right: 12px;
  }
  .camera-container {
    width: 140px;
    height: 105px;
  }
  .ai-feedback {
    bottom: 150px;
    right: 12px;
    font-size: 12px;
  }
  .gesture-hint {
    bottom: 140px;
    right: 12px;
    font-size: 11px;
    padding: 8px 12px;
  }
  .cockpit-readout {
    font-size: 8px;
    letter-spacing: 0.5px;
    gap: 6px;
  }
  .readout-label {
    font-size: 10px;
    padding: 3px 8px;
  }
  .cockpit-readout.top-left { top: 40px; left: 12px; }
  .cockpit-readout.top-right { top: 40px; right: 12px; }
  .cockpit-readout.bottom-left { bottom: 12px; left: 12px; }
  .cockpit-readout.bottom-right { bottom: 12px; right: 12px; }
  .guide-card {
    padding: 24px 20px;
    border-radius: 14px;
  }
  .guide-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .guide-card h3 {
    font-size: 18px;
  }
}
</style>
