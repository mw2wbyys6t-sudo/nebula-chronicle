// src/engines/universe/TimelineEngine.js
// 年份时间轴引擎：把作品按年代组织成螺旋银河

import { DataEngine } from '../data/DataEngine.js';

// 配置参数
const CONFIG = {
  baseRadius: 90,        // 最内圈年份的轨道半径
  radiusStep: 28,        // 每增加一年，半径增量
  angleOffsetStep: 0.55, // 每年螺旋错开角度
  yearHeightScale: 1.8,  // 年份轴上下分布系数
  maxYearSpread: 40      // 同一年作品在轨道上的小幅度散开
};

export const TimelineEngine = {
  config: CONFIG,

  buildYears() {
    const years = DataEngine.years.value;
    return years.map((year, i) => {
      const works = DataEngine.byYear(year);
      return {
        year,
        index: i,
        works,
        workCount: works.length,
        radius: CONFIG.baseRadius + i * CONFIG.radiusStep,
        angleOffset: i * CONFIG.angleOffsetStep,
        color: this.yearColor(year),
        y: (year - 2000) * CONFIG.yearHeightScale
      };
    });
  },

  yearColor(year) {
    const minYear = 1960;
    const maxYear = 2026;
    const t = Math.max(0, Math.min(1, (year - minYear) / (maxYear - minYear)));
    const hue = 180 + t * 160; // 青(180) → 紫(280) → 粉(340)
    // 注意：此处不能引用全局 THREE（未在本模块导入），GalaxyEngine 会在自己的
    // buildStars 里把 hsl 字符串喂给 new THREE.Color()，所以这里返回 CSS hsl 即可。
    return `hsl(${hue}, 82%, 62%)`;
  },

  positionFor(anime, indexInYear = null, totalInYear = null) {
    const yearData = this.buildYears().find(y => y.year === anime.year);
    if (!yearData) return { x: 0, y: 0, z: 0, angle: 0, radius: 0 };

    const idx = indexInYear ?? 0;
    const total = totalInYear ?? 1;

    // 同一年作品在轨道上均匀分布，并加入螺旋相位
    const angle = yearData.angleOffset + (idx / total) * Math.PI * 2;
    const radius = yearData.radius;

    // 小幅随机散开，避免完全重合
    const spread = CONFIG.maxYearSpread;
    const r = radius + (Math.sin(idx * 1.7) * spread);

    return {
      x: Math.cos(angle) * r,
      y: yearData.y + Math.sin(idx * 2.3) * (spread * 0.5),
      z: Math.sin(angle) * r,
      angle,
      radius: r,
      year: anime.year,
      color: yearData.color
    };
  },

  positionsForAll() {
    const positions = new Map();
    const yearMap = DataEngine.yearGroups.value;

    for (const [year, works] of yearMap) {
      works.forEach((anime, i) => {
        positions.set(String(anime.id), this.positionFor(anime, i, works.length));
      });
    }

    return positions;
  },

  // 获取某一年在 3D 空间中的目标相机位置
  cameraTargetForYear(year, distance = 140) {
    const yearData = this.buildYears().find(y => y.year === year);
    if (!yearData) return null;

    return {
      x: 0,
      y: yearData.y,
      z: yearData.radius + distance,
      radius: yearData.radius + distance,
      theta: 0,
      phi: Math.PI / 2.2,
      lookAt: { x: 0, y: yearData.y, z: 0 }
    };
  },

  // 获取相邻年份
  adjacentYears(year) {
    const years = DataEngine.years.value;
    const idx = years.indexOf(year);
    return {
      prev: idx > 0 ? years[idx - 1] : null,
      next: idx < years.length - 1 ? years[idx + 1] : null
    };
  }
};
