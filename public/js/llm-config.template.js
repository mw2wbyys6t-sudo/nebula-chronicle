/**
 * 星云编年史 · LLM 配置模板
 * 复制本文件为 llm-config.js 并填入你的 API Key。
 * llm-config.js 已加入 .gitignore，不会被提交。
 */

const LLM_CONFIG = {
    provider: 'longcat',
    baseURL: 'https://api.longcat.chat/openai',
    apiKey: 'ak_你的APIKey',
    model: 'LongCat-2.0-Preview',
    temperature: 0.3,
    maxTokens: 512,
    tts: {
        lang: 'zh-CN',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0
    }
};

window.LLM_CONFIG = LLM_CONFIG;
