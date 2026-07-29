// src/composables/useUiSound.js
// 用 Web Audio API 合成 UI 音效，零外部资源、零网络请求
// 音色风格：水晶 / 电子 / 梦幻，贴合星云主题
import { ref } from 'vue';

let ctx = null;
let masterGain = null;
const enabled = ref(true);

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.15; // 全局音量，UI 音要轻
    masterGain.connect(ctx.destination);
  } catch (e) {
    return null;
  }
  return ctx;
}

// 用户首次交互后解锁 AudioContext（浏览器策略要求）
function unlock() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume();
}

// 通用音色：振荡器 + 包络
function tone({ freq = 440, type = 'sine', duration = 0.15, attack = 0.005, decay = 0.1, volume = 0.5, freqEnd = null, delay = 0 }) {
  const c = ensureCtx();
  if (!c || !enabled.value) return;

  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + duration);
  }

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + attack + decay);

  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const useUiSound = {
  enabled,

  init() {
    // 在首次 pointer/keydown 时解锁
    const handler = () => {
      unlock();
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
    window.addEventListener('pointerdown', handler);
    window.addEventListener('keydown', handler);
  },

  toggle() {
    enabled.value = !enabled.value;
    return enabled.value;
  },

  // 选中恒星：清亮的水晶双音
  select() {
    tone({ freq: 880, freqEnd: 1320, type: 'sine', duration: 0.2, volume: 0.4, decay: 0.18 });
    tone({ freq: 1760, freqEnd: 2640, type: 'sine', duration: 0.25, volume: 0.15, decay: 0.22, delay: 0.02 });
  },

  // 悬停恒星：极轻的高频微光
  hover() {
    tone({ freq: 1200, freqEnd: 1600, type: 'sine', duration: 0.08, volume: 0.08, decay: 0.06 });
  },

  // 挥手切年份：柔和扫频
  swipe() {
    tone({ freq: 520, freqEnd: 780, type: 'triangle', duration: 0.2, volume: 0.2, attack: 0.01, decay: 0.15 });
  },

  // 返回/握拳：低沉回落
  back() {
    tone({ freq: 440, freqEnd: 220, type: 'sine', duration: 0.2, volume: 0.25, decay: 0.18 });
  },

  // 进入新阶段（phase 切换）：上行琶音
  phaseChange() {
    const notes = [523, 659, 784, 1047]; // C E G C
    notes.forEach((f, i) => {
      tone({ freq: f, type: 'sine', duration: 0.4, volume: 0.2, decay: 0.35, delay: i * 0.08 });
    });
  },

  // 错误/无结果：低音短振
  error() {
    tone({ freq: 200, freqEnd: 150, type: 'sawtooth', duration: 0.15, volume: 0.12, decay: 0.12 });
  }
};
