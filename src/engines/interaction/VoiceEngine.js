// src/engines/interaction/VoiceEngine.js
// 语音识别引擎：基于 Web Speech API，把文本交给 AIEngine 解析

import { ref } from 'vue';
import { bus } from '../core/EventBus.js';

export const VoiceEngine = {
  isListening: ref(false),
  isSupported: ref(false),
  feedback: ref(''),
  transcript: ref(''),

  recognition: null,
  restartCount: 0,
  maxRestarts: 5,
  // 用户是否主动要求停止（区分"异常断开"与"主动 stop"）
  manuallyStopped: false,
  restartTimer: null,

  init() {
    if (this.recognition) return this.isSupported.value;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.isSupported.value = false;
      this.feedback.value = '浏览器不支持语音识别';
      return false;
    }

    try {
      this.recognition = new SpeechRecognition();
    } catch (e) {
      this.isSupported.value = false;
      this.feedback.value = '语音识别初始化失败';
      return false;
    }
    this.recognition.lang = 'zh-CN';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.isSupported.value = true;

    this.recognition.onstart = () => {
      this.isListening.value = true;
      this.restartCount = 0;
      this.feedback.value = '正在聆听…';
      bus.emit('voice:status', 'listening');
    };

    this.recognition.onend = () => {
      this.isListening.value = false;
      bus.emit('voice:status', 'stopped');
      // 仅当非主动停止且未超过重试上限时，带退避自动重启
      if (!this.manuallyStopped && this.restartCount < this.maxRestarts) {
        this.restartCount++;
        // 指数退避：300ms → 600ms → 1200ms → 2400ms → 4800ms
        const backoff = Math.min(300 * Math.pow(2, this.restartCount - 1), 5000);
        clearTimeout(this.restartTimer);
        this.restartTimer = setTimeout(() => {
          if (!this.manuallyStopped) this.start();
        }, backoff);
      } else if (this.restartCount >= this.maxRestarts) {
        this.feedback.value = '语音识别多次重连失败，请点击麦克风重试';
      }
    };

    this.recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      this.transcript.value = text;
      this.feedback.value = `听到：${text}`;
      bus.emit('voice:text', text);
    };

    this.recognition.onerror = (e) => {
      // 这些属于正常"没说话"的噪声，不提示
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'audio-capture') {
        this.feedback.value = '未检测到麦克风';
        return;
      }
      // not-allowed / service-not-allowed 属于权限问题，不再重试
      if (/not-allowed|service-not-allowed/i.test(e.error)) {
        this.manuallyStopped = true;
        this.feedback.value = '麦克风权限被拒绝';
        return;
      }
      this.feedback.value = `语音错误：${e.error}`;
      console.warn('[VoiceEngine] 识别错误:', e.error);
    };

    return true;
  },

  start() {
    if (!this.recognition) this.init();
    if (!this.isSupported.value) return false;
    this.manuallyStopped = false;
    try {
      this.recognition.start();
      return true;
    } catch (err) {
      // 已在运行时 start() 会抛 InvalidStateError，可忽略
      if (err.name !== 'InvalidStateError') {
        console.warn('[VoiceEngine] 启动失败:', err);
      }
      return false;
    }
  },

  stop() {
    this.manuallyStopped = true;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore
      }
    }
    this.isListening.value = false;
  },

  toggle() {
    if (this.isListening.value) {
      this.stop();
    } else {
      this.restartCount = 0;
      this.start();
    }
  },

  showFeedback(text, duration = 2500) {
    this.feedback.value = text;
    if (duration > 0) {
      setTimeout(() => {
        if (this.feedback.value === text) this.feedback.value = '';
      }, duration);
    }
  }
};
