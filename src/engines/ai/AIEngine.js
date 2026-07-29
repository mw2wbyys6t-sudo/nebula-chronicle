// src/engines/ai/AIEngine.js
// AI 导航引擎：解析语音/文本意图，生成导航建议与解说
// 统一 LLM 路径：支持本地意图解析 + LongCat/OpenAI 兼容 LLM 调用

import { parseIntent } from './intent-parser.js';
import { DataEngine } from '../data/DataEngine.js';
import { KnowledgeEngine } from '../data/KnowledgeEngine.js';
import { bus } from '../core/EventBus.js';

/**
 * 读取 LLM 配置
 * 优先级：import.meta.env > window.LLM_CONFIG > 默认空
 */
function getLLMConfig() {
  const env = import.meta.env;
  if (env.VITE_LLM_API_KEY && env.VITE_LLM_BASE_URL) {
    return {
      apiKey: env.VITE_LLM_API_KEY,
      baseURL: env.VITE_LLM_BASE_URL,
      model: env.VITE_LLM_MODEL || 'LongCat-Flash-Lite',
      temperature: parseFloat(env.VITE_LLM_TEMPERATURE || '0.3'),
      maxTokens: parseInt(env.VITE_LLM_MAX_TOKENS || '512', 10)
    };
  }
  // 兼容旧版 public/js/llm-config.js 的 window.LLM_CONFIG
  if (typeof window !== 'undefined' && window.LLM_CONFIG && window.LLM_CONFIG.apiKey) {
    return {
      apiKey: window.LLM_CONFIG.apiKey,
      baseURL: window.LLM_CONFIG.baseURL,
      model: window.LLM_CONFIG.model || 'LongCat-Flash-Lite',
      temperature: window.LLM_CONFIG.temperature ?? 0.3,
      maxTokens: window.LLM_CONFIG.maxTokens ?? 512
    };
  }
  return null;
}

/**
 * 安全解析 LLM 返回的 JSON
 */
function parseActionJSON(content) {
  if (!content) return null;
  const trimmed = content.trim();

  try { return JSON.parse(trimmed); } catch (e) { void e; }

  // 提取代码块中的 JSON
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try { return JSON.parse(codeBlock[1].trim()); } catch (e) { void e; }
  }

  // 提取第一个 { ... }
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) { void e; }
  }
  return null;
}

export const AIEngine = {
  mode: 'local', // local | llm
  llmConfig: null,
  isProcessing: false,
  history: [],
  maxHistory: 10,
  _cleanup: null,

  init() {
    if (this._cleanup) this.dispose();
    const offExplain = bus.on('ai:explain', (animeId) => this.explainAndNarrate(animeId));
    this._cleanup = offExplain;
    // 启动时探测 LLM 配置，自动切换模式
    this.refreshConfig();
    return this;
  },

  dispose() {
    if (this._cleanup) {
      this._cleanup();
      this._cleanup = null;
    }
    this.history = [];
  },

  /** 刷新 LLM 配置，有则切到 llm 模式 */
  refreshConfig() {
    this.llmConfig = getLLMConfig();
    if (this.llmConfig) {
      this.mode = 'llm';
      console.log('[AIEngine] LLM 模式已启用，模型:', this.llmConfig.model);
    } else {
      this.mode = 'local';
      console.log('[AIEngine] LLM 未配置，使用本地意图解析');
    }
  },

  setMode(mode) {
    this.mode = mode;
  },

  async understand(text) {
    if (this.mode === 'llm' && this.llmConfig) {
      try {
        return await this.askLLM(text);
      } catch (err) {
        console.warn('[AIEngine] LLM 失败，回退到本地解析:', err.message);
      }
    }
    return parseIntent(text);
  },

  /** 调用 LongCat / OpenAI 兼容接口（带超时与重试） */
  async askLLM(text) {
    const config = this.llmConfig;
    if (!config) throw new Error('LLM 未配置');

    const systemPrompt = this.buildSystemPrompt();
    const messages = [
      { role: 'system', content: systemPrompt },
      ...this.history.slice(-6),
      { role: 'user', content: text }
    ];

    const url = config.baseURL.replace(/\/$/, '').replace(/\/v1$/, '') + '/v1/chat/completions';

    // 带超时与单次重试的 fetch 包装
    const doFetch = (attempt = 0) => new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens
        }),
        signal: controller.signal
      }).then(resolve, (err) => {
        if (attempt < 1 && (err.name === 'AbortError' || /network|failed|timeout/i.test(err.message))) {
          // 一次重试
          setTimeout(() => doFetch(attempt + 1).then(resolve, reject), 400);
        } else {
          reject(err);
        }
      }).finally(() => clearTimeout(timeout));
    });

    let response;
    try {
      response = await doFetch();
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('LLM 请求超时');
      throw new Error(`LLM 网络错误: ${err.message}`);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`LLM 请求失败 ${response.status}: ${errText.slice(0, 200)}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error('LLM 返回非 JSON 响应');
    }
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('LLM 返回格式异常');

    // 记录历史
    this.history.push({ role: 'user', content: text });
    this.history.push({ role: 'assistant', content });
    if (this.history.length > this.maxHistory * 2) {
      this.history = this.history.slice(-this.maxHistory * 2);
    }

    // 尝试解析为结构化动作
    const action = parseActionJSON(content);
    if (action && action.action) {
      return this.normalizeLLMAction(action);
    }
    // 无法解析为结构化，降级为 chat
    return { action: 'chat', message: content };
  },

  /** 将 LLM 返回的动作归一化为本地 intent 格式 */
  normalizeLLMAction(raw) {
    const action = String(raw.action || 'chat').toLowerCase();
    const target = String(raw.target || '').trim();
    const message = String(raw.message || '');

    switch (action) {
      case 'play':
      case 'info':
      case 'focus-anime': {
        if (target) {
          const anime = DataEngine.fuzzyFindByTitle(target);
          if (anime) {
            return { action: 'focus-anime', id: anime.id, title: anime.titleRomaji, message };
          }
        }
        return { action: 'chat', message: message || `未找到「${target}」` };
      }
      case 'recommend': {
        // 推荐高评分作品
        const top = DataEngine.topWorks(1)[0];
        if (top) {
          return { action: 'focus-anime', id: top.id, title: top.titleRomaji, message };
        }
        return { action: 'chat', message: message || '暂无可推荐的作品' };
      }
      case 'navigate':
      case 'focus-year': {
        const year = parseInt(target, 10);
        if (year > 1900 && year < 2100) {
          return { action: 'focus-year', year, message };
        }
        // 可能是流派
        if (target) {
          return { action: 'recommend', genre: target, message };
        }
        return { action: 'chat', message: message || '请指定年份或类型' };
      }
      case 'close':
      case 'back':
        return { action: 'back', message };
      case 'clear':
      case 'reset':
        return { action: 'clear', message };
      case 'chat':
      default:
        return { action: 'chat', message };
    }
  },

  /** 构建系统提示词 */
  buildSystemPrompt() {
    return `你是「星云编年史」的语音助手，帮助用户通过语音探索二次元动漫宇宙。

## 能力
- focus-anime：定位到指定动漫（需 target 为标题）
- focus-year：导航到某一年（需 target 为 4 位年份）
- recommend：推荐动漫（target 可为流派名）
- back：返回上一级
- clear：重置视图
- chat：自然语言闲聊

## 响应格式（严格返回 JSON）
{
  "action": "focus-anime|focus-year|recommend|back|clear|chat",
  "target": "标题/年份/流派，如不需要可空字符串",
  "message": "用中文口语简要回复用户"
}

## 规则
- 用户说"打开/播放/看 + 动漫名" → action: "focus-anime"，target 为标题
- 用户说"带我去 2008 年" → action: "focus-year"，target: "2008"
- 用户说"推荐治愈番/科幻" → action: "recommend"，target 为流派
- 用户说"返回/关闭" → action: "back"
- 用户说"重置/清除" → action: "clear"
- 其他问题 → action: "chat"，自然回复

## 注意
- 必须且只返回一行合法 JSON，不要添加注释、代码块或额外文字
- message 用中文口语，简短自然`;
  },

  clearHistory() {
    this.history = [];
  },

  // 生成 AI 导航提示语
  narrate(intent, result) {
    if (intent.message) return intent.message;

    switch (intent.action) {
      case 'focus-year':
        return `正在前往 ${intent.year} 年的动漫银河。`;
      case 'focus-anime':
        return result
          ? `已定位到 ${result.titleRomaji}（${result.year}）。`
          : `未找到 ${intent.title}，请尝试其他名称。`;
      case 'recommend':
        return intent.genre
          ? `为你点亮所有${intent.genre}作品。`
          : '正在推荐高评分动漫。';
      case 'back':
        return '返回上一级。';
      case 'clear':
        return '宇宙视图已重置。';
      case 'chat':
        return intent.message || '我没有理解，请尝试说"带我去2008年"或"推荐治愈番"。';
      default:
        return '我没有理解，请尝试说"带我去2008年"或"推荐治愈番"。';
    }
  },

  // 对外接口：处理文本并广播意图
  async process(text) {
    if (this.isProcessing) return null;
    this.isProcessing = true;
    bus.emit('ai:thinking', true);

    try {
      const intent = await this.understand(text);
      const result = intent.id ? DataEngine.byId(intent.id) : null;
      const narration = this.narrate(intent, result);

      bus.emit('voice:intent', intent);
      bus.emit('ai:narrate', narration);

      return { intent, narration };
    } catch (err) {
      console.error('[AIEngine] 处理失败:', err);
      bus.emit('ai:narrate', '处理失败，请重试。');
      return null;
    } finally {
      this.isProcessing = false;
      bus.emit('ai:thinking', false);
    }
  },

  // 处理作品解说请求
  explainAndNarrate(animeId) {
    const explanation = this.explain(animeId);
    if (explanation) {
      bus.emit('ai:narrate', explanation);
    }
    return explanation;
  },

  // 获取某部作品的 AI 解说
  explain(animeId) {
    const anime = DataEngine.byId(animeId);
    if (!anime) return '';

    const related = KnowledgeEngine.neighbors(animeId, null, 3);
    const lines = [
      `${anime.titleRomaji} 是 ${anime.year} 年的 ${anime.genres?.join('、') || '动画'}作品。`,
      anime.studios?.length ? `由 ${anime.studios.slice(0, 2).join('、')} 制作。` : '',
      anime.score ? `评分 ${anime.score} 分。` : '',
      anime.synopsis ? anime.synopsis.slice(0, 80) + '…' : '',
      related.length ? `与它相关的作品有：${related.map(r => r.anime.titleRomaji).join('、')}。` : ''
    ];
    return lines.filter(Boolean).join('');
  }
};
