/**
 * 星云编年史 · LLM 语音助手引擎
 * 基于美团 LongCat（OpenAI 兼容格式）+ 浏览器语音合成
 */

const LLMActionType = {
    PLAY: 'play',
    INFO: 'info',
    RECOMMEND: 'recommend',
    NAVIGATE: 'navigate',
    CLOSE: 'close',
    CHAT: 'chat'
};

/**
 * LLM API 客户端
 */
const LLMClient = {
    async chat(messages, options = {}) {
        const config = window.LLM_CONFIG || {};
        if (!config.apiKey) {
            throw new Error('LLM API Key 未配置，请检查 js/llm-config.js');
        }
        if (!config.baseURL) {
            throw new Error('LLM baseURL 未配置');
        }

        const model = options.model || config.model || 'LongCat-Flash-Lite';
        const url = config.baseURL.replace(/\/$/, '') + '/v1/chat/completions';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: config.temperature ?? 0.3,
                max_tokens: config.maxTokens ?? 512
            })
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`LLM 请求失败 ${response.status}: ${text}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (typeof content !== 'string') {
            throw new Error('LLM 返回格式异常');
        }
        return content;
    }
};

/**
 * 语音合成引擎
 */
const TTSEngine = {
    isSupported() {
        return 'speechSynthesis' in window;
    },

    speak(text) {
        if (!this.isSupported() || !text) return false;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        const config = (window.LLM_CONFIG && window.LLM_CONFIG.tts) || {};
        utterance.lang = config.lang || 'zh-CN';
        utterance.rate = config.rate ?? 1.0;
        utterance.pitch = config.pitch ?? 1.0;
        utterance.volume = config.volume ?? 1.0;
        window.speechSynthesis.speak(utterance);
        return true;
    },

    stop() {
        if (this.isSupported()) {
            window.speechSynthesis.cancel();
        }
    }
};

/**
 * 动漫数据库摘要（用于 prompts）
 */
function buildAnimeSummary() {
    const db = window.AnimeDB;
    if (!db || !db.all) return '';
    return db.all.map((a, i) => {
        const tags = Array.isArray(a.tags) && a.tags.length ? `标签：${a.tags.join('、')}` : '';
        return `[${i}] ${a.title}（${a.year}，${a.genre}）${a.aliases ? '别名：' + a.aliases + ' ' : ''}${tags}`;
    }).join('\n');
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(context = {}) {
    const page = context.page || 'main'; // main | watch
    const summary = buildAnimeSummary();

    const pageInstructions = page === 'watch'
        ? `当前用户在播放页。可执行动作：
- play：继续/暂停当前视频（target 可省略或填"播放"/"暂停"）
- close：返回首页 nebula-chronicle.html
- chat：回答动漫相关问题`
        : `当前用户在首页时间轴。可执行动作：
- play：跳转播放页 watch.html?index=<索引> 观看指定动漫
- info：在首页打开对应动漫详情面板
- recommend：从库中推荐一部动漫，并说明理由
- navigate：将时间轴定位到某一年或某一类型（target 为年份或类型名）
- close：关闭详情面板
- chat：自然语言回答`;

    return `你是「星云编年史」的语音助手，帮助用户通过语音探索二次元动漫历史、查看详情或播放动漫。

## 可用动漫库
${summary || '（暂无动漫数据）'}

## 当前页面
${pageInstructions}

## 响应格式（必须严格返回合法 JSON，不要添加任何解释或 markdown）
{
  "action": "play|info|recommend|navigate|close|chat",
  "target": "目标标题、索引、年份或类型，如不需要可空字符串",
  "message": "用中文口语回复用户，简要自然"
}

## 示例
用户：播放新世纪福音战士
{"action":"play","target":"新世纪福音战士","message":"好的，为你播放新世纪福音战士"}

用户：介绍一下铁臂阿童木
{"action":"info","target":"铁臂阿童木","message":"铁臂阿童木是1963年手冢治虫创作的经典科幻动画，是机器人少年阿童木的冒险故事"}

用户：推荐一部动漫
{"action":"recommend","target":"","message":"推荐你看《千与千寻》，宫崎骏的奇幻杰作"}

用户：返回
{"action":"close","target":"","message":"好的，返回首页"}

用户：什么是动漫
{"action":"chat","target":"","message":"动漫是动画和漫画的合称，这里展示的是日本动画的发展历程"}

## 规则
- 用户说"播放/看/打开 + 动漫名" → action: "play"，target 为准确标题或索引
- 用户说"介绍一下 + 动漫名" → action: "info"，target 为动漫名
- 用户说"推荐" → action: "recommend"，target 空字符串
- 用户说"返回/关闭/退出" → action: "close"，target 空字符串
- 用户问作品相关内容 → action: "chat"，结合库中信息回答
- 若找不到目标作品，action 为 "chat"，message 说明未找到
- 年份只返回 4 位数字，类型使用库中出现的 genre
- 必须且只返回一行合法 JSON，不要添加注释、代码块或额外文字`;
}

/**
 * 安全解析 LLM 返回的 JSON
 */
function parseAction(content) {
    if (!content) return null;
    const trimmed = content.trim();

    // 尝试直接解析
    try {
        return JSON.parse(trimmed);
    } catch (e) {
        void e;
    }

    // 尝试提取代码块中的 JSON
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch (e) {
            void e;
        }
    }

    // 尝试提取第一个 { ... }
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch (e) {
            void e;
        }
    }

    return null;
}

/**
 * 根据标题或索引查找动漫
 */
function findAnime(target) {
    const db = window.AnimeDB;
    if (!db) return null;

    if (typeof target === 'number' || /^\d+$/.test(String(target).trim())) {
        const idx = parseInt(target, 10);
        if (idx >= 0 && idx < db.count) {
            return { anime: db.get(idx), index: idx };
        }
    }

    const keyword = String(target).trim();
    if (!keyword) return null;

    const results = db.search(keyword);
    if (results.length > 0) {
        const title = results[0].title;
        const idx = db.all.findIndex(a => a.title === title);
        return { anime: results[0], index: idx };
    }

    return null;
}

/**
 * LLM 语音助手
 */
const LLMAssistant = {
    isProcessing: false,
    chatMode: false,      // true: 闲聊模式，false: 命令模式
    history: [],          // 闲聊历史 { role, content }
    maxHistory: 10,       // 保留最近 10 轮
    onAction: null,       // function(action)
    onFeedback: null,     // function(message)
    onChatUpdate: null,   // function(history)

    setChatMode(enabled) {
        this.chatMode = !!enabled;
        if (!enabled) this.clearHistory();
    },

    toggleChatMode() {
        this.setChatMode(!this.chatMode);
        return this.chatMode;
    },

    clearHistory() {
        this.history = [];
        if (this.onChatUpdate) this.onChatUpdate(this.history);
    },

    addHistory(role, content) {
        this.history.push({ role, content });
        if (this.history.length > this.maxHistory * 2) {
            this.history = this.history.slice(-this.maxHistory * 2);
        }
        if (this.onChatUpdate) this.onChatUpdate(this.history);
    },

    async process(text, context = {}) {
        if (this.isProcessing) return;
        this.isProcessing = true;
        this._feedback('思考中…');

        try {
            const messages = this._buildMessages(text, context);
            const content = await LLMClient.chat(messages);
            const action = parseAction(content) || {
                action: LLMActionType.CHAT,
                target: '',
                message: content
            };

            // 闲聊模式下，所有回复统一按 chat 处理，不执行跳转/打开面板等动作
            if (this.chatMode) {
                action.action = LLMActionType.CHAT;
            }

            this.addHistory('user', text);
            this.addHistory('assistant', action.message || '');
            this._execute(action, context);
        } catch (error) {
            console.warn('LLM 处理失败，降级到本地命令:', error.message);
            this._fallback(text, context);
        } finally {
            this.isProcessing = false;
        }
    },

    _buildMessages(text, context) {
        const systemPrompt = buildSystemPrompt(context) +
            '\n\n## 闲聊模式说明\n' +
            (this.chatMode
                ? '当前处于闲聊模式。用户说的话都是日常闲聊，请用轻松自然的口吻回复，不需要执行任何操作。'
                : '当前处于命令模式。请根据用户指令执行对应操作并返回 JSON。');

        const messages = [{ role: 'system', content: systemPrompt }];

        // 命令模式下也保留少量历史，让 LLM 能联系上下文理解指代
        const recentHistory = this.history.slice(-Math.min(this.history.length, 6));
        messages.push(...recentHistory);

        messages.push({ role: 'user', content: text });
        return messages;
    },

    _feedback(message) {
        if (this.onFeedback) this.onFeedback(message);
    },

    _execute(action, context) {
        const { action: type, target = '', message = '' } = action;
        const normalizedType = String(type).toLowerCase();

        // 朗读回复
        if (message) {
            TTSEngine.speak(message);
        }

        // 执行动作
        const result = { handled: false };
        switch (normalizedType) {
            case LLMActionType.PLAY: {
                const found = findAnime(target);
                if (found && found.index >= 0) {
                    result.handled = true;
                    result.action = LLMActionType.PLAY;
                    result.index = found.index;
                    result.title = found.anime.title;
                }
                break;
            }
            case LLMActionType.INFO: {
                const found = findAnime(target);
                if (found && found.index >= 0) {
                    result.handled = true;
                    result.action = LLMActionType.INFO;
                    result.index = found.index;
                    result.title = found.anime.title;
                }
                break;
            }
            case LLMActionType.RECOMMEND: {
                const db = window.AnimeDB;
                if (db && db.count > 0) {
                    const idx = Math.floor(Math.random() * db.count);
                    result.handled = true;
                    result.action = LLMActionType.INFO;
                    result.index = idx;
                    result.title = db.get(idx).title;
                }
                break;
            }
            case LLMActionType.NAVIGATE: {
                result.handled = true;
                result.action = LLMActionType.NAVIGATE;
                result.target = target;
                break;
            }
            case LLMActionType.CLOSE: {
                result.handled = true;
                result.action = LLMActionType.CLOSE;
                break;
            }
            case LLMActionType.CHAT:
            default: {
                result.handled = true;
                result.action = LLMActionType.CHAT;
                result.message = message || '收到';
            }
        }

        this._feedback(message);
        if (this.onAction) this.onAction(result, context);
    },

    _fallback(text, context) {
        // 兜底：保留原有的关键词匹配，由调用方覆盖实现
        this._feedback('语音助手暂时不可用，请稍后再试');
        if (this.onAction) {
            this.onAction({ handled: false, action: 'fallback', text }, context);
        }
    }
};

window.LLMClient = LLMClient;
window.TTSEngine = TTSEngine;
window.LLMAssistant = LLMAssistant;
window.LLMActionType = LLMActionType;
