// src/engines/ai/VoiceNarrator.js
// 语音导游引擎：统一管理开机、导航、作品解说等场景的语音播报
// 支持 Web Speech API 本地语音，并预留动漫角色声音克隆接口

import { reactive } from 'vue';
import { VoicePlayer } from '../../composables/useVoice.js';
import { bus } from '../core/EventBus.js';

const state = reactive({
  enabled: true,
  character: 'default', // 'default' | 'system' | 自定义角色 ID
  clonedVoiceUrl: null, // 预留：克隆角色音频 URL
  muted: false
});

export const VoiceNarrator = {
  get enabled() { return state.enabled; },
  set enabled(value) { state.enabled = value; },
  get character() { return state.character; },
  set character(value) { state.character = value; },
  get clonedVoiceUrl() { return state.clonedVoiceUrl; },
  set clonedVoiceUrl(value) { state.clonedVoiceUrl = value; },
  get muted() { return state.muted; },
  set muted(value) { state.muted = value; },

  init() {
    if (this._cleanup) this.dispose();
    VoicePlayer.warmup();
    this._bindEvents();
    return this;
  },

  _bindEvents() {
    const offs = [];
    // 监听 AI 解说文本，自动朗读
    offs.push(bus.on('ai:narrate', (text) => {
      if (this.enabled && !this.muted) this.speak(text, { priority: true });
    }));
    // 监听选中作品，自动播放作品介绍
    offs.push(bus.on('anime:selected', (id) => {
      if (!id || !this.enabled || this.muted) return;
      // 使用 AIEngine.explain 生成介绍，延迟一点避免打断操作反馈
      setTimeout(() => bus.emit('ai:explain', id), 400);
    }));
    this._cleanup = () => offs.forEach(fn => fn());
  },

  dispose() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    this.stop();
  },

  // 统一播报接口
  speak(text, options = {}) {
    if (!text || !this.enabled || this.muted) return;
    VoicePlayer.speak(text, options);
  },

  // 停止播报
  stop() {
    VoicePlayer.stop();
  },

  // 静音 / 取消静音
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stop();
    return this.muted;
  },

  setEnabled(value) {
    this.enabled = value;
    if (!value) this.stop();
  },

  // ===== 场景化语音 =====

  welcome() {
    this.speak('欢迎来到星云编年史，我是你的 AI 导航员。接下来，我将带你穿越动漫宇宙。', { priority: true });
  },

  enterUniverse() {
    this.speak('次元跃迁完成。眼前每一颗恒星，都是一部动漫作品。移动手指，去发现属于你的星云。', { priority: true });
  },

  selectAnime(anime) {
    if (!anime) return;
    const lines = [
      `${anime.titleRomaji}`,
      anime.year ? `${anime.year}年作品` : '',
      anime.genres?.length ? `类型：${anime.genres.slice(0, 3).join('、')}` : '',
      anime.score ? `评分 ${anime.score} 分` : ''
    ];
    this.speak(lines.filter(Boolean).join('，'));
  },

  focusYear(year) {
    this.speak(`正在前往 ${year} 年的动漫银河。`, { priority: true });
  },

  filterGenre(genre) {
    this.speak(`已为你点亮所有 ${genre} 作品。`, { priority: true });
  },

  back() {
    this.speak('返回上一级。', { priority: true });
  },

  noResult(query) {
    this.speak(`未找到与 ${query} 相关的作品，请尝试其他关键词。`, { priority: true });
  },

  resetCamera() {
    this.speak('视角已重置。', { priority: true });
  },

  // ===== 动漫角色声音克隆接口（预留） =====

  // 设置当前使用的角色
  setCharacter(characterId) {
    this.character = characterId;
  },

  // 加载克隆角色声音（后续可对接云端克隆服务或本地模型）
  async loadClonedVoice(characterId, audioUrl) {
    this.setCharacter(characterId);
    this.clonedVoiceUrl = audioUrl;

    // 预留：未来在此调用外部克隆 API，将 audioUrl 转换成可用 voice
    // const voice = await cloneVoiceService.load(characterId, audioUrl);
    // VoicePlayer.setClonedVoice(voice);

    console.log(`[VoiceNarrator] 已加载角色 ${characterId} 的克隆声音配置: ${audioUrl}`);
    return true;
  },

  // 检查是否支持克隆声音
  isCloningSupported() {
    return false; // 当前版本未接入克隆服务
  }
};
