/**
 * 星云编年史 · 共享工具层
 * 主页面与播放页共用的工具函数、B站链接解析、语音识别封装。
 */

function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

/**
 * 从用户输入中提取 B 站 BV 号
 * 支持 BV 号本身或完整 URL
 */
function extractBvid(input) {
    if (!input) return '';
    const match = String(input).match(/BV[0-9a-zA-Z]{10}/);
    return match ? match[0] : '';
}

/**
 * 根据 BV 号生成 B 站嵌入播放器地址
 */
function buildBilibiliEmbed(bvid) {
    if (!bvid) return '';
    return `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0`;
}

/**
 * 语音识别引擎封装
 * 基于浏览器原生 Web Speech API
 */
const VoiceEngine = {
    recognition: null,
    isListening: false,
    onResult: null,
    onError: null,
    onStateChange: null,

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    },

    init() {
        if (this.recognition) return true;
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return false;

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'zh-CN';
        this.recognition.continuous = true;
        this.recognition.interimResults = false;

        this.recognition.onresult = (event) => {
            const last = event.results[event.results.length - 1];
            if (last.isFinal && this.onResult) {
                this.onResult(last[0].transcript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            // no-speech 等错误很常见，不中断监听
            if (event.error !== 'no-speech' && this.onError) {
                this.onError(event.error);
            }
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                try {
                    this.recognition.start();
                } catch (e) {
                    this.isListening = false;
                    this._notifyStateChange();
                }
            }
        };

        return true;
    },

    start() {
        if (!this.recognition && !this.init()) return false;
        if (this.isListening) return true;
        try {
            this.recognition.start();
            this.isListening = true;
            this._notifyStateChange();
            return true;
        } catch (e) {
            console.warn('语音启动失败:', e);
            this.isListening = false;
            this._notifyStateChange();
            return false;
        }
    },

    stop() {
        if (!this.recognition) return;
        this.isListening = false;
        try {
            this.recognition.stop();
        } catch (e) {
            void e;
        }
        this._notifyStateChange();
    },

    toggle() {
        if (this.isListening) this.stop();
        else this.start();
        return this.isListening;
    },

    _notifyStateChange() {
        if (this.onStateChange) this.onStateChange(this.isListening);
    }
};

window.distance = distance;
window.lerp = lerp;
window.extractBvid = extractBvid;
window.buildBilibiliEmbed = buildBilibiliEmbed;
window.VoiceEngine = VoiceEngine;
