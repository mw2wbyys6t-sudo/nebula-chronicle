import { ref, computed, watchEffect } from 'vue';
import { DataEngine } from '../engines/data/DataEngine.js';

const data = ref([]);
const genres = ref({});
const loading = ref(false);
const error = ref(null);
let initialized = false;

// 与 DataEngine 保持同步，避免重复请求
function syncWithDataEngine() {
  if (DataEngine.data.value && DataEngine.data.value.length > 0) {
    data.value = DataEngine.data.value;
  }
  if (DataEngine.genres.value) {
    const g = DataEngine.genres.value;
    genres.value = g.genres || g || {};
  }
}

export function useData() {
  const load = async () => {
    if (initialized) return;
    initialized = true;

    // 优先复用 DataEngine 已加载的数据
    syncWithDataEngine();
    if (data.value.length > 0 && Object.keys(genres.value).length > 0) {
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      await DataEngine.load();
      syncWithDataEngine();
    } catch (err) {
      error.value = err;
      console.error('Failed to load data:', err);
    } finally {
      loading.value = false;
    }
  };

  // 组件首次使用时就尝试加载
  watchEffect(() => {
    if (!initialized) load();
  });

  const topWorks = computed(() =>
    [...data.value].sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8)
  );

  return { data, genres, loading, error, load, topWorks };
}
