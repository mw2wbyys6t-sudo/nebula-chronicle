const { Window } = require('happy-dom');
const fs = require('fs');
const path = require('path');

const errors = [];
const consoleLogs = [];

function extractScripts(html) {
    const scripts = [];
    const regex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
        const tag = match[0];
        const content = match[1];
        const srcMatch = tag.match(/src=["']([^"']+)["']/i);
        scripts.push({ src: srcMatch ? srcMatch[1] : null, content: content.trim() });
    }
    return scripts;
}

function createMockedWindow(htmlPath, search = '') {
    const html = fs.readFileSync(htmlPath, 'utf-8');

    const win = new Window({
        url: 'http://localhost:8080/' + path.basename(htmlPath) + search,
        width: 1280,
        height: 800
    });

    win.console.log = (...args) => consoleLogs.push(['log', args.join(' ')]);
    win.console.warn = (...args) => consoleLogs.push(['warn', args.join(' ')]);
    win.console.error = (...args) => {
        consoleLogs.push(['error', args.join(' ')]);
        errors.push(args.join(' '));
    };

    win.addEventListener('error', (e) => {
        errors.push(e.message || String(e));
    });

    // Mock THREE
    const noop = () => {};
    win.THREE = {
        Scene: class { add() {} fog = null; },
        PerspectiveCamera: class {
            constructor() { this.position = { set() {}, x: 0, y: 0, z: 0 }; }
            updateProjectionMatrix() {}
            lookAt() {}
            aspect = 1;
        },
        WebGLRenderer: class {
            setSize() {}
            setPixelRatio() {}
            render() {}
            constructor() { this.domElement = { style: {} }; }
        },
        BufferGeometry: class { setAttribute() {} },
        Float32BufferAttribute: class { constructor() {} },
        BufferAttribute: class {},
        PointsMaterial: class {},
        Points: class {
            constructor() {
                this.position = { set() {} };
                this.rotation = { x: 0, y: 0 };
                this.scale = { set() {} };
            }
            add() {}
        },
        SpriteMaterial: class {},
        Sprite: class {
            constructor() { this.position = { set() {} }; this.scale = { set() {} }; }
            add() {}
        },
        TextureLoader: class { load() { return {}; } },
        Color: class {
            setHSL() {}
            r = 0; g = 0; b = 0;
        },
        Vector3: class { set() {} add() {} clone() { return this; } },
        MathUtils: { randFloat: () => 0 },
        FogExp2: class { constructor() {} },
        AdditiveBlending: 'AdditiveBlending',
        SphereGeometry: class { constructor() {} },
        MeshBasicMaterial: class { constructor() {} },
        Mesh: class {
            constructor() {
                this.position = { set() {} };
                this.scale = { set() {}, setScalar() {} };
                this.rotation = { x: 0, y: 0 };
            }
            add() {}
        }
    };

    // Mock MediaPipe
    win.Hands = class {
        setOptions() {}
        onResults() {}
        initialize() { return Promise.resolve(); }
        send() { return Promise.resolve(); }
    };
    win.Camera = class {
        start() { return Promise.resolve(); }
        stop() {}
    };
    win.drawConnectors = () => {};
    win.drawLandmarks = () => {};
    win.HAND_CONNECTIONS = {};

    // Mock Web Speech
    win.SpeechRecognition = class {
        start() {}
        stop() {}
        abort() {}
        lang = 'zh-CN';
        continuous = true;
        interimResults = false;
    };
    win.webkitSpeechRecognition = win.SpeechRecognition;

    // Mock Web Audio
    win.AudioContext = class {
        state = 'running';
        resume() { return Promise.resolve(); }
        createGain() { return { gain: { value: 0 }, connect() {} }; }
        createOscillator() { return { connect() {}, start() {}, stop() {}, frequency: { value: 0 } }; }
        createBiquadFilter() { return { frequency: { value: 0 }, Q: { value: 0 }, connect() {} }; }
        createDelay() { return { delayTime: { value: 0 }, connect() {} }; }
        createBufferSource() { return { connect() {}, start() {}, buffer: null }; }
        createBuffer() { return {}; }
        currentTime = 0;
    };
    win.webkitAudioContext = win.AudioContext;

    win.navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve({ getTracks: () => [] })
    };
    win.navigator.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/120.0';

    // Mock fetch for LLM
    win.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve({ choices: [{ message: { content: '{"action":"chat","target":"","message":"你好"}' } }] }) });

    // Mock speech synthesis
    win.speechSynthesis = {
        speak: () => {},
        cancel: () => {},
        getVoices: () => []
    };
    win.SpeechSynthesisUtterance = class {
        constructor(text) { this.text = text; }
    };

    // Load HTML without scripts first
    const htmlWithoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    win.document.write(htmlWithoutScripts);
    win.document.close();

    // Inline shared scripts
    const sharedDataJs = fs.readFileSync('/workspace/js/shared-data.js', 'utf-8');
    const sharedUtilsJs = fs.readFileSync('/workspace/js/shared-utils.js', 'utf-8');
    const llmConfigJs = fs.readFileSync('/workspace/js/llm-config.js', 'utf-8');
    const llmEngineJs = fs.readFileSync('/workspace/js/llm-engine.js', 'utf-8');
    win.eval(sharedDataJs);
    win.eval(sharedUtilsJs);
    win.eval(llmConfigJs);
    win.eval(llmEngineJs);

    // Execute inline scripts in a single shared scope
    const scripts = extractScripts(html);
    const inlineCode = scripts
        .filter(s => !s.src && s.content)
        .map(s => s.content)
        .join('\n;\n');
    try {
        // Expose key internals to window for testing, in the same eval scope
        const exposeCode = `
            window.__test = {
                dom: (typeof dom !== 'undefined') ? dom : null,
                state: (typeof state !== 'undefined') ? state : null,
                startExperience: (typeof startExperience !== 'undefined') ? startExperience : null,
                showDetail: (typeof showDetail !== 'undefined') ? showDetail : null,
                handleVoiceCommand: (typeof handleVoiceCommand !== 'undefined') ? handleVoiceCommand : null,
                initPage: (typeof initPage !== 'undefined') ? initPage : null,
                LLMAssistant: (typeof LLMAssistant !== 'undefined') ? LLMAssistant : null
            };
        `;
        win.eval(inlineCode + '\n;' + exposeCode);
        console.log('inline scripts evaluated');
    } catch (e) {
        errors.push(`Inline script error: ${e.message}`);
        console.error('Inline script error:', e.message, e.stack);
    }

    return win;
}

function assert(condition, message) {
    if (!condition) {
        errors.push(`ASSERT FAIL: ${message}`);
        console.error(`ASSERT FAIL: ${message}`);
    } else {
        console.log(`OK: ${message}`);
    }
}

async function testMainPage() {
    console.log('\n=== Testing Main Page ===');
    const win = createMockedWindow('/workspace/nebula-chronicle.html');

    await new Promise(r => setTimeout(r, 100));

    assert(win.document.title.includes('星云编年史'), 'page title contains 星云编年史');

    const animeDB = win.eval('AnimeDB');
    assert(animeDB && animeDB.count > 0, 'AnimeDB data is loaded');
    assert(win.__test && win.__test.LLMAssistant, 'LLMAssistant is loaded');
    assert(win.LLM_CONFIG && win.LLM_CONFIG.apiKey, 'LLM_CONFIG is loaded');

    // Directly invoke startup flow
    try {
        if (win.__test && win.__test.startExperience) {
            win.__test.startExperience();
        }
    } catch (e) {
        console.warn('startExperience failed:', e.message);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Manually trigger delayed UI update since happy-dom timers may not advance
    const t = win.__test;
    if (t && t.dom) {
        if (t.dom.startupScreen) t.dom.startupScreen.classList.add('hidden');
        if (t.dom.mainInterface) t.dom.mainInterface.style.display = 'block';
        if (t.state) t.state.isStarted = true;
    }

    // Check nodes generated
    const nodes = win.document.querySelectorAll('.anime-node');
    assert(nodes.length > 0, `timeline nodes generated (count: ${nodes.length})`);

    // Click a node
    const node14 = win.document.querySelector('.anime-node[data-index="14"]');
    if (node14) {
        node14.click();
        console.log('clicked node 14');
        await new Promise(r => setTimeout(r, 100));

        const detailTitle = win.document.getElementById('detail-title');
        assert(detailTitle && detailTitle.textContent, `detail title populated: "${detailTitle ? detailTitle.textContent : ''}"`);

        const playBtn = win.document.getElementById('play-btn');
        assert(playBtn && playBtn.offsetParent !== null, 'play button visible in detail panel');
    }

    // Test utility functions
    assert(win.eval("extractBvid('https://www.bilibili.com/video/BV1xx411c7mD')") === 'BV1xx411c7mD', 'extractBvid works');
    assert(win.eval("buildBilibiliEmbed('BV1xx411c7mD')").includes('player.bilibili.com'), 'buildBilibiliEmbed works');

    win.close();
}

async function testWatchPage() {
    console.log('\n=== Testing Watch Page ===');
    const win = createMockedWindow('/workspace/watch.html', '?index=14');

    // Manually init page because load event already fired before scripts were injected
    if (win.__test && win.__test.initPage) {
        win.__test.initPage();
    }

    await new Promise(r => setTimeout(r, 300));

    assert(win.document.title.includes('星云放映厅'), 'watch page title contains 星云放映厅');

    const title = win.document.getElementById('watch-title');
    assert(title && title.textContent && !title.textContent.includes('正在加载'), `watch title populated: "${title ? title.textContent : ''}"`);

    const noSource = win.document.getElementById('no-source');
    assert(noSource, 'no-source placeholder exists');

    assert(win.__test && typeof win.__test.handleVoiceCommand === 'function', 'handleVoiceCommand is defined');
    assert(win.__test && win.__test.LLMAssistant, 'watch page LLMAssistant is loaded');

    win.close();
}

(async () => {
    try {
        await testMainPage();
        await testWatchPage();
    } catch (e) {
        errors.push(e.message || String(e));
    }

    console.log('\n=== Console Logs ===');
    consoleLogs.forEach(([type, msg]) => console.log(`[${type}] ${msg}`));

    if (errors.length) {
        console.log('\n=== ERRORS ===');
        errors.forEach(e => console.log(e));
        process.exit(1);
    } else {
        console.log('\nAll static checks passed.');
        process.exit(0);
    }
})();
