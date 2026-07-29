// src/composables/useProgressiveImage.js
// 渐进式图片加载：先显示本地兜底图，再异步加载外链 CDN 封面
// 解决沙箱/弱网环境下 anilist.co 外链裂图的问题
import { ref, onMounted, onUnmounted } from 'vue';

/**
 * @param {Object} anime - 作品对象
 * @returns { src, loaded, error }
 *   src: 当前应显示的图片 URL（先兜底，加载完成后切到 CDN）
 *   loaded: CDN 图是否已加载完成（用于淡入）
 *   error: CDN 图是否加载失败
 */
export function useProgressiveImage(anime) {
  const src = ref(null);
  const loaded = ref(false);
  const error = ref(false);
  let observer = null;
  let preloader = null;

  const localFallback = anime?.coverFallback || null;
  const remoteSrc = anime?.coverImage || null;

  onMounted(() => {
    // 先用本地兜底图占位，视觉上不闪
    src.value = localFallback;

    // 如果没有外链或外链就是本地图，直接标记完成
    if (!remoteSrc || remoteSrc === localFallback || remoteSrc.startsWith('blob:') || remoteSrc.startsWith('data:')) {
      src.value = remoteSrc || localFallback;
      loaded.value = true;
      return;
    }

    // 用 IntersectionObserver 懒加载，进入视口才发请求
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            startLoad();
            observer.disconnect();
          }
        });
      }, { rootMargin: '200px' });
      // 下一 tick 等 DOM 就绪
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-progressive-img]');
        if (el) observer.observe(el);
        else startLoad(); // 找不到观察目标就直接加载
      });
    } else {
      startLoad();
    }
  });

  function startLoad() {
    preloader = new Image();
    preloader.onload = () => {
      src.value = remoteSrc;
      loaded.value = true;
    };
    preloader.onerror = () => {
      error.value = true;
      // 保持使用本地兜底
      src.value = localFallback;
      loaded.value = true;
    };
    preloader.src = remoteSrc;
  }

  onUnmounted(() => {
    if (observer) observer.disconnect();
    if (preloader) {
      preloader.onload = null;
      preloader.onerror = null;
      preloader = null;
    }
  });

  return { src, loaded, error };
}
