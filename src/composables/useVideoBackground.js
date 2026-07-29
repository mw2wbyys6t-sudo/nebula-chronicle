// src/composables/useVideoBackground.js
// 判断当前环境是否适合播放背景视频，并做好降级兼容

import { ref, onMounted } from 'vue';

export function useVideoBackground() {
  const shouldUseVideo = ref(false);
  const videoSupported = ref(false);
  const reason = ref('checking');

  onMounted(() => {
    // 1. 尊重用户减少动画的偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      reason.value = 'reduced-motion';
      return;
    }

    // 2. 检测网络环境：省流量模式或慢网禁用视频
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      if (connection.saveData) {
        reason.value = 'save-data';
        return;
      }
      const effectiveType = connection.effectiveType;
      if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        reason.value = 'slow-network';
        return;
      }
    }

    // 3. 检测是否支持 MP4 (avc1)
    const testVideo = document.createElement('video');
    const canPlayMp4 = testVideo.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '';
    if (!canPlayMp4) {
      reason.value = 'unsupported-codec';
      return;
    }

    // 4. 检测移动设备：仅在高性能设备上启用
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
    if (isMobile && isLowMemory) {
      reason.value = 'low-memory-mobile';
      return;
    }

    videoSupported.value = true;
    shouldUseVideo.value = true;
    reason.value = 'enabled';
  });

  return { shouldUseVideo, videoSupported, reason };
}
