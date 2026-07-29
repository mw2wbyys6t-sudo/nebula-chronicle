/*
 * ============================================================
 *  星云编年史 · 共享数据层
 * ============================================================
 *  主页面与播放页共用，避免重复维护。
 *  新增作品：在 rawAnimeData 数组中追加对象即可。
 *  新增分类：在 GENRE_PALETTE 中添加名称与主题色。
 * ============================================================
 */

// ===== 动漫数据库（后续只需扩展此数组） =====
const rawAnimeData = [
    {
        year: 1963,
        title: "铁臂阿童木",
        genre: "科幻",
        desc: `手冢治虫创作的经典科幻动画，讲述了机器人少年阿童木的冒险故事，是日本动画走向世界的先驱之作。`,
        image: "images/0.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1965,
        title: "森林大帝",
        genre: "冒险",
        desc: `手冢治虫的另一部经典作品，讲述了白狮雷欧的成长历程，深刻探讨了自然与人类的关系。`,
        image: "images/1.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1972,
        title: "魔神Z",
        genre: "机甲",
        desc: `永井豪创作的超级机器人动画开山之作，奠定了日本机甲动画的基础，影响深远。`,
        image: "images/2.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1974,
        title: "宇宙战舰大和号",
        genre: "科幻",
        desc: `日本动画史上的里程碑作品，以其宏大的宇宙叙事和深刻的人文关怀开创了SF动画新纪元。`,
        image: "images/3.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1979,
        title: "机动战士高达",
        genre: "机甲",
        desc: `富野由悠季创作的写实机器人动画，首次将战争与政治的严肃主题引入机器人动画。`,
        image: "images/4.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1979,
        title: "银河铁道999",
        genre: "科幻",
        desc: `松本零士的宇宙浪漫史诗，讲述了少年星野铁郎乘坐银河列车的成长之旅。`,
        image: "images/5.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1981,
        title: "福星小子",
        genre: "喜剧",
        desc: `高桥留美子的早期代表作，以其独特的幽默感和想象力成为80年代喜剧动画的标杆。`,
        image: "images/6.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1982,
        title: "超时空要塞",
        genre: "机甲",
        desc: `将机甲战斗与偶像音乐完美融合的开创性作品，确立了「歌姬」在动画中的重要地位。`,
        image: "images/7.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1984,
        title: "风之谷",
        genre: "奇幻",
        desc: `宫崎骏执导的动画电影，讲述了娜乌西卡在污染世界中寻找生存之道的故事，环保主题深刻。`,
        image: "images/8.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1986,
        title: "天空之城",
        genre: "冒险",
        desc: `宫崎骏的经典冒险动画，以飞行岛屿拉普达为背景，充满了对科技与自然的思考。`,
        image: "images/9.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1986,
        title: "龙珠",
        genre: "战斗",
        desc: `鸟山明创作的热血战斗漫画改编，孙悟空的冒险故事风靡全球，成为日本流行文化符号。`,
        image: "images/10.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1988,
        title: "龙猫",
        genre: "奇幻",
        desc: `宫崎骏最温暖的作品之一，讲述了姐妹俩与森林精灵龙猫的奇妙相遇，治愈无数观众。`,
        image: "images/11.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1988,
        title: "阿基拉",
        genre: "科幻",
        desc: `大友克洋执导的赛博朋克动画电影，以其惊人的视觉效果和深刻的社会批判成为动画史上的里程碑。`,
        image: "images/12.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1992,
        title: "美少女战士",
        genre: "魔法",
        desc: `武内直子创作的魔法少女动画，开创了「变身系」魔法少女的先河，影响了一代少女。`,
        image: "images/13.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1995,
        title: "新世纪福音战士",
        genre: "机甲",
        desc: `庵野秀明执导的心理机甲动画，以其深刻的心理描写和宗教隐喻彻底改变了动画界。`,
        image: "images/14.jpg",
        bilibili: "BV1NL411M7mT",
        videoUrl: ""
    },
    {
        year: 1995,
        title: "攻壳机动队",
        genre: "科幻",
        desc: `押井守执导的赛博朋克经典，探讨了意识、灵魂与机械的哲学边界，影响了《黑客帝国》。`,
        image: "images/15.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1996,
        title: "名侦探柯南",
        genre: "推理",
        desc: `青山刚昌创作的长寿推理动画，小学生侦探江户川柯南的破案故事持续至今。`,
        image: "images/16.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1997,
        title: "幽灵公主",
        genre: "奇幻",
        desc: `宫崎骏的史诗级作品，以室町时代为背景，探讨了人类文明与自然神灵的冲突。`,
        image: "images/17.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1997,
        title: "海贼王",
        genre: "冒险",
        desc: `尾田荣一郎创作的热血冒险漫画，路飞寻找ONE PIECE的冒险成为当代最具影响力的作品之一。`,
        image: "images/18.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1998,
        title: "星际牛仔",
        genre: "科幻",
        desc: `渡边信一郎执导的太空西部片，以其独特的爵士氛围和成人向叙事成为cult经典。`,
        image: "images/19.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1998,
        title: "Serial Experiments Lain",
        genre: "科幻",
        desc: `实验性动画作品，深刻探讨了网络时代的人类身份认同，具有强烈的预言性质。`,
        image: "images/20.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1999,
        title: " Hunter x Hunter",
        genre: "冒险",
        desc: `富坚义博创作的少年漫画，以其独特的念能力系统和复杂剧情被誉为少年漫画的巅峰。`,
        image: "images/21.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 1999,
        title: "火影忍者",
        genre: "战斗",
        desc: `岸本齐史创作的热血忍者漫画，漩涡鸣人的成长故事激励了无数少年。`,
        image: "images/22.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2001,
        title: "千与千寻",
        genre: "奇幻",
        desc: `宫崎骏的奥斯卡获奖作品，讲述了千寻在神灵世界的成长冒险，是日本动画的国际巅峰。`,
        image: "images/23.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2003,
        title: "钢之炼金术师",
        genre: "奇幻",
        desc: `荒川弘创作的黑暗奇幻作品，以其严谨的设定和深刻的人性探讨成为21世纪最佳动画之一。`,
        image: "images/24.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2004,
        title: "死神",
        genre: "战斗",
        desc: `久保带人创作的死神题材漫画，以其独特的视觉风格和战斗系统广受欢迎。`,
        image: "images/25.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2006,
        title: "死亡笔记",
        genre: "悬疑",
        desc: `大场鸫原作、小畑健作画的智斗漫画，夜神月与L的智力对决堪称经典。`,
        image: "images/26.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2006,
        title: "Code Geass",
        genre: "机甲",
        desc: `以反乌托邦为背景的机甲动画，鲁路修的智慧与复仇构成了一部精彩的政治惊悚剧。`,
        image: "images/27.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2007,
        title: "天元突破红莲螺岩",
        genre: "机甲",
        desc: `今石洋之执导的热血机甲动画，以其夸张的表现力和燃情叙事成为热血动画的顶点。`,
        image: "images/28.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2009,
        title: "化物语",
        genre: "奇幻",
        desc: `新房昭之执导的西尾维新改编动画，以其独特的视觉风格和对话艺术开创了「物语系列」。`,
        image: "images/29.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2011,
        title: "魔法少女小圆",
        genre: "魔法",
        desc: `虚渊玄编剧的黑暗魔法少女动画，彻底颠覆了魔法少女题材的固有印象。`,
        image: "images/30.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2011,
        title: "命运石之门",
        genre: "科幻",
        desc: `以时间旅行为核心的科幻视觉小说改编，以其严谨的设定和感人的剧情成为科幻动画经典。`,
        image: "images/31.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2012,
        title: "进击的巨人",
        genre: "战斗",
        desc: `谏山创创作的黑暗奇幻漫画，以其惊人的剧情反转和深刻的世界观成为现象级作品。`,
        image: "images/32.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2013,
        title: "斩服少女",
        genre: "战斗",
        desc: `今石洋之执导的夸张战斗动画，以其独特的视觉风格和女性 empowerment 主题备受好评。`,
        image: "images/33.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2013,
        title: "你的名字",
        genre: "爱情",
        desc: `新海诚执导的动画电影，以其精美的画面和感人的跨时空爱情故事创下票房纪录。`,
        image: "images/34.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2016,
        title: "Re:从零开始",
        genre: "奇幻",
        desc: `以时间轮回为核心的异世界动画，菜月昴的死亡回归之旅探讨了意志与救赎。`,
        image: "images/35.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2016,
        title: "鬼灭之刃",
        genre: "战斗",
        desc: `吾峠呼世晴创作的鬼杀队故事，以其精美的动画和感人的兄妹情成为现象级作品。`,
        image: "images/36.jpg",
        bilibili: "BV1Wb411K7u6",
        videoUrl: ""
    },
    {
        year: 2019,
        title: "咒术回战",
        genre: "战斗",
        desc: `芥见下下创作的咒术师战斗漫画，以其现代化的设定和精彩的战斗场面广受欢迎。`,
        image: "images/37.jpg",
        bilibili: "BV1A5411K7NH",
        videoUrl: ""
    },
    {
        year: 2020,
        title: "电锯人",
        genre: "黑暗",
        desc: `藤本树创作的黑暗少年漫画，以其独特的叙事风格和出人意料的剧情发展引发热议。`,
        image: "images/38.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2022,
        title: "赛博朋克:边缘行者",
        genre: "科幻",
        desc: `基于《赛博朋克2077》的动画，以其惊艳的视觉效果和悲剧性故事获得全球好评。`,
        image: "images/39.jpg",
        bilibili: "",
        videoUrl: ""
    },
    {
        year: 2023,
        title: "葬送的芙莉莲",
        genre: "奇幻",
        desc: `以勇者死后世界为视角的奇幻动画，以其独特的叙事节奏和深刻的生命思考备受赞誉。`,
        image: "images/40.jpg",
        bilibili: "BV18j411i7iu",
        videoUrl: ""
    },
    {
        year: 2024,
        title: "迷宫饭",
        genre: "冒险",
        desc: `九井谅子创作的地下城美食漫画，以其独特的设定和温馨的团队故事成为年度佳作。`,
        image: "images/41.jpg",
        bilibili: "",
        videoUrl: ""
    }
];

// ===== 配置常量 =====
const CONFIG = {
    CAMERA_WIDTH: 320,
    CAMERA_HEIGHT: 240,
    PINCH_THRESHOLD: 0.05,
    HOVER_RADIUS: 60,
    GESTURE_DEBOUNCE_MS: 80,
    DETAIL_OPEN_COOLDOWN_MS: 900,
    PINCH_COOLDOWN_MS: 600,
    PINCH_HOLD_MS: 150,
    OPEN_HAND_HOLD_MS: 250,
    PARTICLE_INTERVAL_MS: 500,
    PARTICLE_LIFETIME_MS: 20000,
    CAMERA_TIMEOUT_MS: 10000,
    SPIRAL_TURNS: 3,
    SPIRAL_MIN_RADIUS: 8,
    SPIRAL_MAX_RADIUS: 40,
    NEBULA_3D_PARTICLES: 2500,
    NEBULA_3D_CLOUDS: 5,
    STARTUP_DELAY_MS: 1200,
    ROTATION_DAMPING: 0.15,
    ROTATION_EMA_ALPHA: 0.15,
    CURSOR_LERP: 0.18,
    HAND_DEAD_ZONE_PX: 6
};

// ===== 数据层：类型配置 =====
const GENRE_PALETTE = {
    '科幻':  '#00f3ff',
    '冒险':  '#ffcc00',
    '机甲':  '#4488ff',
    '喜剧':  '#ffee66',
    '奇幻':  '#b026ff',
    '战斗':  '#ff4444',
    '魔法':  '#ff66dd',
    '推理':  '#00ffaa',
    '悬疑':  '#aa66ff',
    '爱情':  '#ff88cc',
    '黑暗':  '#cc3333'
};

function getGenreColor(genre) {
    return GENRE_PALETTE[genre] || '#00f3ff';
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ===== 数据层：模型与校验 =====
const AnimeSchema = {
    required: ['year', 'title', 'genre', 'desc'],
    optional: ['image', 'studio', 'director', 'aliases', 'tags', 'bilibili', 'videoUrl'],

    validate(anime) {
        const errors = [];
        for (const key of this.required) {
            if (anime[key] === undefined || anime[key] === null || anime[key] === '') {
                errors.push(`缺少必填字段: ${key}`);
            }
        }
        if (anime.genre && !GENRE_PALETTE[anime.genre]) {
            errors.push(`未知分类 "${anime.genre}"，请先在 GENRE_PALETTE 中定义`);
        }
        return errors;
    }
};

// ===== 数据层：仓库 =====
const AnimeDB = {
    _data: [],

    init(items) {
        this._data = items.map(item => this.normalize(item));
        this.validateAll();
        return this;
    },

    normalize(anime) {
        return {
            year: anime.year,
            title: anime.title,
            genre: anime.genre,
            desc: anime.desc,
            image: anime.image || '',
            studio: anime.studio || '',
            director: anime.director || '',
            aliases: anime.aliases || '',
            tags: Array.isArray(anime.tags) ? anime.tags : [],
            bilibili: anime.bilibili || '',
            videoUrl: anime.videoUrl || ''
        };
    },

    get all() { return this._data; },
    get count() { return this._data.length; },

    get(index) { return this._data[index]; },
    add(anime) { return this._insert(anime, this._data.length); },
    insert(index, anime) { return this._insert(anime, index); },

    _insert(anime, index) {
        const errors = AnimeSchema.validate(anime);
        if (errors.length) {
            console.error('AnimeDB 添加失败:', errors.join('; '));
            return false;
        }
        this._data.splice(index, 0, this.normalize(anime));
        return true;
    },

    update(index, patch) {
        if (index < 0 || index >= this._data.length) return false;
        const updated = { ...this._data[index], ...patch };
        const errors = AnimeSchema.validate(updated);
        if (errors.length) {
            console.error('AnimeDB 更新失败:', errors.join('; '));
            return false;
        }
        this._data[index] = this.normalize(updated);
        return true;
    },

    remove(index) {
        if (index < 0 || index >= this._data.length) return false;
        this._data.splice(index, 1);
        return true;
    },

    validateAll() {
        this._data.forEach((anime, index) => {
            const errors = AnimeSchema.validate(anime);
            if (errors.length) {
                console.warn(`AnimeDB 第 ${index} 条校验警告 [${anime.title || '?'}]:`, errors.join('; '));
            }
        });
    },

    filterByGenre(genre) { return this._data.filter(a => a.genre === genre); },
    filterByYearRange(start, end) { return this._data.filter(a => a.year >= start && a.year <= end); },

    search(keyword) {
        const k = String(keyword).toLowerCase();
        return this._data.filter(a =>
            String(a.title).toLowerCase().includes(k) ||
            String(a.desc).toLowerCase().includes(k) ||
            String(a.genre).includes(keyword)
        );
    },

    findByTitle(title) {
        const k = String(title).toLowerCase();
        return this._data.find(a => String(a.title).toLowerCase() === k);
    },

    toJSON() { return JSON.stringify(this._data, null, 2); },

    fromJSON(json) {
        try {
            const items = JSON.parse(json);
            if (!Array.isArray(items)) throw new Error('数据必须是数组');
            this.init(items);
            return true;
        } catch (e) {
            console.error('AnimeDB 导入失败:', e.message);
            return false;
        }
    }
};

// 初始化数据
AnimeDB.init(rawAnimeData);

// 暴露到全局，供页面脚本使用
window.rawAnimeData = rawAnimeData;
window.CONFIG = CONFIG;
window.GENRE_PALETTE = GENRE_PALETTE;
window.AnimeDB = AnimeDB;
window.getGenreColor = getGenreColor;
window.hexToRgba = hexToRgba;
