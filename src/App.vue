<template>
  <div id="universe">
    <!-- 错误降级 UI -->
    <div v-if="fatalError" class="fatal-error">
      <div class="fatal-card">
        <div class="fatal-icon">✦</div>
        <h2>星辰信号中断</h2>
        <p>次元震荡导致当前阶段渲染异常：{{ fatalError.message }}</p>
        <div class="fatal-actions">
          <button class="fatal-btn" @click="retryPhase">重新召唤</button>
          <button class="fatal-btn secondary" @click="reload">刷新页面</button>
        </div>
      </div>
    </div>

    <template v-else>
      <div class="cg-vignette-overlay"></div>
      <div class="cg-film-grain"></div>
      <div class="cg-light-leak"></div>
      <Transition name="phase" mode="out-in" @before-leave="onBeforeLeave" @after-enter="onAfterEnter">
        <LoadingPhase v-if="phase === 'loading'" @done="goTo('showcase')" />
        <ShowcasePhase v-else-if="phase === 'showcase'" @skip="goTo('landing')" @done="goTo('landing')" />
        <LandingPhase v-else-if="phase === 'landing'" @start="goTo('universe')" />
        <UniversePhase v-else-if="phase === 'universe'" />
      </Transition>

      <div class="phase-flash" :class="{ active: flashActive }"></div>
      <div class="phase-rainbow" :class="{ active: flashActive }"></div>
      <div class="phase-chromatic" :class="{ active: flashActive }"></div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, onErrorCaptured, defineAsyncComponent } from 'vue';
import { bus } from './engines/core/EventBus.js';
import LoadingPhase from './components/LoadingPhase.vue';
import LandingPhase from './components/LandingPhase.vue';
import ShowcasePhase from './components/ShowcasePhase.vue';
import { useUiSound } from './composables/useUiSound.js';

// UniversePhase 含 three.js (551KB)，使用异步组件，首屏不加载
// 用户点击 Landing 幕的"开启次元之旅"时才动态拉取
const UniversePhase = defineAsyncComponent(() => import('./components/UniversePhase.vue'));

const phase = ref('loading');
const flashActive = ref(false);
const fatalError = ref(null);

// 初始化 UI 音效（在用户首次交互时解锁 AudioContext）
useUiSound.init();

function goTo(next) {
  if (phase.value === next) return;
  flashActive.value = true;
  useUiSound.phaseChange();
  const delay = next === 'universe' ? 180 : 320;
  setTimeout(() => {
    phase.value = next;
  }, delay);
  setTimeout(() => {
    flashActive.value = false;
  }, next === 'universe' ? 900 : 700);
}

function onBeforeLeave() {
  document.body.classList.add('phase-switching');
}

function onAfterEnter() {
  document.body.classList.remove('phase-switching');
}

// 全局错误边界：任何子组件抛错都不会白屏，显示降级 UI
onErrorCaptured((err, instance, info) => {
  console.error('[App] 捕获到渲染错误:', err, info);
  fatalError.value = {
    message: err?.message || String(err),
    phase: phase.value
  };
  return false;
});

function reload() {
  location.reload();
}

function retryPhase() {
  fatalError.value = null;
  phase.value = 'loading';
}

// 监听引擎请求的阶段切换（如握拳返回入口 landing）
function onPhaseChanged(target) {
  if (target === 'landing' && phase.value === 'universe') {
    goTo('landing');
  }
}

onMounted(() => {
  bus.on('phase:changed', onPhaseChanged);
});

onUnmounted(() => {
  bus.off('phase:changed', onPhaseChanged);
});
</script>

<style>
.cg-vignette-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(10, 4, 24, 0.6) 100%);
  mix-blend-mode: multiply;
}

.cg-film-grain {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  animation: grainShift 0.4s steps(4) infinite;
}

@keyframes grainShift {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-1%, 1%); }
  50% { transform: translate(1%, -1%); }
  75% { transform: translate(-1%, -1%); }
}

.cg-light-leak {
  position: fixed;
  inset: 0;
  z-index: 9996;
  pointer-events: none;
  background:
    radial-gradient(ellipse 600px 400px at 15% 20%, rgba(255, 158, 196, 0.04), transparent 70%),
    radial-gradient(ellipse 500px 350px at 85% 80%, rgba(201, 177, 255, 0.035), transparent 70%),
    radial-gradient(ellipse 300px 200px at 80% 15%, rgba(255, 215, 0, 0.02), transparent 70%);
  mix-blend-mode: screen;
  animation: lightLeakDrift 12s ease-in-out infinite alternate;
}

@keyframes lightLeakDrift {
  0% { opacity: 0.6; transform: translate(0, 0); }
  50% { opacity: 1; transform: translate(10px, -5px); }
  100% { opacity: 0.7; transform: translate(-5px, 8px); }
}

.phase-enter-active,
.phase-leave-active {
  transition: opacity 0.55s cubic-bezier(0.4, 0, 0.2, 1), transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), filter 0.55s ease-out;
}

.phase-enter-from {
  opacity: 0;
  transform: scale(1.05);
  filter: blur(10px) saturate(1.6) brightness(1.4);
}

.phase-leave-to {
  opacity: 0;
  transform: scale(0.97);
  filter: blur(6px) brightness(0.7);
}

.phase-flash {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 45%, rgba(255, 255, 255, 1) 0%, rgba(255, 200, 230, 0.9) 18%, rgba(201, 177, 255, 0.55) 40%, rgba(184, 224, 255, 0.3) 60%, transparent 82%);
  opacity: 0;
  transition: opacity 0.12s ease-out;
}

.phase-flash.active {
  opacity: 1;
  animation: flashFade 0.9s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.phase-rainbow {
  position: fixed;
  inset: 0;
  z-index: 99;
  pointer-events: none;
  background: conic-gradient(from 0deg at 50% 50%,
    rgba(255, 158, 196, 0.5),
    rgba(201, 177, 255, 0.5),
    rgba(184, 224, 255, 0.5),
    rgba(255, 215, 0, 0.35),
    rgba(255, 158, 196, 0.5));
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(70px);
}

.phase-rainbow.active {
  animation: rainbowBurst 1.1s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

.phase-chromatic {
  position: fixed;
  inset: 0;
  z-index: 101;
  pointer-events: none;
  opacity: 0;
}

.phase-chromatic.active {
  animation: chromaticAberration 0.6s ease-out forwards;
}

.phase-chromatic::before,
.phase-chromatic::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 100, 150, 0.0), transparent 40%);
}

.phase-chromatic::before {
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 2px,
    rgba(255, 100, 150, 0.0) 2px,
    rgba(255, 100, 150, 0.0) 4px
  );
  mix-blend-mode: screen;
}

@keyframes flashFade {
  0% { opacity: 0; transform: scale(0.5); }
  15% { opacity: 1; transform: scale(1.0); }
  100% { opacity: 0; transform: scale(1.5); }
}

@keyframes rainbowBurst {
  0% { opacity: 0; transform: scale(0.25) rotate(0deg); }
  25% { opacity: 0.8; transform: scale(1.15) rotate(45deg); }
  100% { opacity: 0; transform: scale(2.2) rotate(180deg); }
}

@keyframes chromaticAberration {
  0% { opacity: 0; }
  15% { opacity: 0.15; }
  100% { opacity: 0; }
}

/* 全局可访问性：键盘焦点可见 */
:focus-visible {
  outline: 2px solid #ff9ec4;
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus:not(:focus-visible) {
  outline: none;
}

/* 全局重置 */
html, body, #universe {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #060310;
  color-scheme: dark;
}

/* 错误降级 UI */
.fatal-error {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #1a0a2e 0%, #060310 70%);
  font-family: 'Noto Sans SC', sans-serif;
}

.fatal-card {
  text-align: center;
  padding: 48px 56px;
  background: rgba(20, 10, 40, 0.95);
  border: 1px solid rgba(255, 158, 196, 0.35);
  border-radius: 20px;
  box-shadow: 0 0 60px rgba(255, 158, 196, 0.2), 0 8px 40px rgba(0, 0, 0, 0.5);
  max-width: 90vw;
}

.fatal-icon {
  font-size: 48px;
  color: #ff9ec4;
  margin-bottom: 16px;
  animation: fatalPulse 2s ease-in-out infinite;
}

.fatal-card h2 {
  color: #ffb7d0;
  font-size: 22px;
  margin: 0 0 12px;
  letter-spacing: 2px;
}

.fatal-card p {
  color: rgba(201, 177, 255, 0.7);
  font-size: 13px;
  margin: 0 0 28px;
  max-width: 400px;
  line-height: 1.6;
  word-break: break-word;
}

.fatal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.fatal-btn {
  padding: 10px 28px;
  border-radius: 20px;
  border: 1.5px solid #ffd700;
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.25), rgba(201, 177, 255, 0.2));
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  letter-spacing: 1px;
  transition: all 0.25s;
}

.fatal-btn:hover {
  background: rgba(255, 158, 196, 0.4);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  transform: translateY(-1px);
}

.fatal-btn.secondary {
  border-color: rgba(255, 158, 196, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

@keyframes fatalPulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* 尊重用户的减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* 移动端触摸优化 */
@media (max-width: 768px), (pointer: coarse) {
  * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
  }
  button, a {
    touch-action: manipulation;
    min-height: 44px;
    min-width: 44px;
  }
}
</style>
