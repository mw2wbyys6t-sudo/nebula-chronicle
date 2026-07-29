// src/composables/useVoice.js
// 语音合成（TTS）统一接口
// 用于：开机欢迎、操作反馈、作品介绍、新手引导、纯手势模式语音提示
// 支持 Web Speech API 本地语音，未来可无缝替换为克隆动漫人物声音的云端 API

import { ref, onUnmounted } from 'vue';

const SPEECH_RATE = 1.05;
const SPEECH_PITCH = 1.0;

// 状态
const isSupported = ref('speechSynthesis' in window);
const isSpeaking = ref(false);
const isReady = ref(false);
const voiceMap = ref({});
let preferredVoice = null;
let clonedVoice = null; // 预留：克隆角色声音 Blob / AudioBuffer
let speechQueue = [];
let utterance = null;
let unlockResolver = null;
let unlocked = false;

// 等待用户交互解锁语音播放（浏览器自动播放策略）
function waitForUnlock() {
  if (unlocked) return Promise.resolve();
  if (!unlockResolver) {
    unlockResolver = new Promise(resolve => {
      const handler = () => {
        unlocked = true;
        document.removeEventListener('click', handler);
        document.removeEventListener('touchstart', handler);
        resolve();
      };
      document.addEventListener('click', handler, { once: true });
      document.addEventListener('touchstart', handler, { once: true });
    });
  }
  return unlockResolver;
}

// 预热：加载可用 voices，避免首次播放用默认音色的不一致问题
function warmup() {
  if (!isSupported.value) return;

  const populate = () => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // 优先选择中文女声
    preferredVoice = voices.find(v => v.lang.startsWith('zh') && v.name.includes('Female'))
      || voices.find(v => v.lang.startsWith('zh'))
      || voices.find(v => v.lang.startsWith('zh-CN'))
      || voices.find(v => v.lang.startsWith('zh-TW'))
      || voices.find(v => v.lang.startsWith('ja')) // 动漫感 fallback
      || voices.find(v => v.lang.startsWith('en'))
      || voices[0];

    voiceMap.value = voices.reduce((map, v) => {
      map[v.lang] = map[v.lang] || [];
      map[v.lang].push(v);
      return map;
    }, {});

    isReady.value = true;
  };

  populate();
  window.speechSynthesis.onvoiceschanged = populate;
}

// 播放队列中的下一条
async function playNext() {
  if (!isSupported.value || speechQueue.length === 0) {
    isSpeaking.value = false;
    return;
  }

  await waitForUnlock();

  isSpeaking.value = true;
  const text = speechQueue.shift();

  // 取消当前可能卡住的语音
  window.speechSynthesis.cancel();

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = SPEECH_RATE;
  utterance.pitch = SPEECH_PITCH;
  if (preferredVoice) utterance.voice = preferredVoice;

  utterance.onend = () => {
    utterance = null;
    playNext();
  };
  utterance.onerror = (e) => {
    console.warn('[useVoice] TTS error:', e.error);
    utterance = null;
    playNext();
  };

  window.speechSynthesis.speak(utterance);
}

// 暴露的 API
export function useVoice() {
  return {
    isSupported,
    isReady,
    isSpeaking,

    // 预热 voices
    warmup,

    // 朗读一段文本
    speak(text, { priority = false } = {}) {
      if (!isSupported.value || !text) return;

      // 预留：如果已加载克隆角色声音，使用 Audio 播放克隆音频
      if (clonedVoice) {
        // 未来实现：将 text 通过 TTS 服务端转换为角色音频后播放
        // playClonedAudio(text);
      }

      if (priority) {
        // 高优先级：清空队列并立即播放
        speechQueue = [text];
        window.speechSynthesis.cancel();
        if (utterance) {
          // 等待 onerror/onend 触发 playNext 会自然播放新队列
          utterance.onend = () => playNext();
          utterance.onerror = () => playNext();
        } else {
          playNext();
        }
      } else {
        speechQueue.push(text);
        if (!isSpeaking.value) playNext();
      }
    },

    // 停止播放并清空队列
    stop() {
      speechQueue = [];
      window.speechSynthesis.cancel();
      isSpeaking.value = false;
    },

    // 设置首选系统语音
    setVoice(voice) {
      preferredVoice = voice;
    },

    // 预留：设置克隆角色声音（AudioBuffer / Blob / URL）
    setClonedVoice(voiceAsset) {
      clonedVoice = voiceAsset;
    },

    // 获取可用语音列表
    getVoices() {
      return window.speechSynthesis?.getVoices() || [];
    }
  };
}

// 全局单例，方便非组件代码调用
export const VoicePlayer = {
  isSupported,
  isReady,
  isSpeaking,
  warmup,
  speak(text, opts) {
    return useVoice().speak(text, opts);
  },
  stop() {
    return useVoice().stop();
  },
  setVoice(voice) {
    return useVoice().setVoice(voice);
  },
  setClonedVoice(voiceAsset) {
    return useVoice().setClonedVoice(voiceAsset);
  }
};

// 默认预热
warmup();
