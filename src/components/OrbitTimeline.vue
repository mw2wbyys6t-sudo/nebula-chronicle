<template>
  <div class="orbit-timeline" v-if="!selectedId">
    <div class="timeline-track">
      <div
        v-for="year in years"
        :key="year"
        class="timeline-node"
        :class="{ active: activeYear === year }"
        @click="selectYear(year)"
      >
        <span class="node-dot"></span>
        <span class="node-year">{{ year }}</span>
        <span class="node-count">{{ countByYear[year] || 0 }}</span>
      </div>
    </div>
    <div class="timeline-glow"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { StateEngine } from '../engines/core/StateEngine.js';
import { DataEngine } from '../engines/data/DataEngine.js';
import { bus } from '../engines/core/EventBus.js';

const activeYear = computed(() => StateEngine.state.year);
const selectedId = computed(() => StateEngine.state.selectedId);

const data = computed(() => DataEngine.data.value || []);

const years = computed(() => {
  const set = new Set(data.value.map(a => Math.floor((a.year || 2000) / 10) * 10).filter(y => y >= 1960 && y <= 2030));
  return [...set].sort((a, b) => a - b);
});

const countByYear = computed(() => {
  const map = {};
  data.value.forEach(a => {
    const decade = Math.floor((a.year || 2000) / 10) * 10;
    map[decade] = (map[decade] || 0) + 1;
  });
  return map;
});

function selectYear(year) {
  StateEngine.focusYear(year);
  bus.emit('toast', `${year}年代`);
}
</script>

<style scoped>
.orbit-timeline {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  pointer-events: none;
}

.timeline-track {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 100px;
  background: rgba(20, 10, 40, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 158, 196, 0.2);
  pointer-events: auto;
  position: relative;
}

.timeline-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 44px;
  position: relative;
}

.timeline-node:hover {
  background: rgba(255, 158, 196, 0.12);
  transform: translateY(-4px);
}

.timeline-node.active {
  background: linear-gradient(135deg, rgba(255, 158, 196, 0.25), rgba(201, 177, 255, 0.25));
}

.node-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  box-shadow: 0 0 8px rgba(255, 158, 196, 0.3);
  transition: all 0.3s ease;
}

.timeline-node:hover .node-dot {
  background: #ff9ec4;
  transform: scale(1.3);
  box-shadow: 0 0 16px rgba(255, 158, 196, 0.6);
}

.timeline-node.active .node-dot {
  background: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.7);
  transform: scale(1.4);
}

.node-year {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 0.5px;
}

.timeline-node.active .node-year {
  color: #ffd700;
}

.node-count {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.45);
}

.timeline-glow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  height: 20px;
  background: radial-gradient(ellipse at center, rgba(255, 158, 196, 0.2), transparent 70%);
  pointer-events: none;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .orbit-timeline {
    bottom: 16px;
    left: 16px;
    right: 16px;
    transform: none;
    overflow-x: auto;
  }

  .timeline-track {
    gap: 4px;
    padding: 10px 14px;
    border-radius: 20px;
  }

  .timeline-node {
    min-width: 38px;
    padding: 6px 8px;
  }

  .node-year {
    font-size: 11px;
  }
}
</style>
