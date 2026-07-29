import { createApp, nextTick } from 'vue';
import App from './App.vue';
import './styles/universe.css';

const app = createApp(App);

// 全局错误处理：生产环境下静默降级，避免白屏
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err?.message || err, info);
};
app.config.warnHandler = (msg, instance, trace) => {
  // 生产环境忽略非关键警告
  if (import.meta.env.DEV) {
    console.warn('[Vue Warn]', msg);
  }
};

// 性能标记
if (typeof performance !== 'undefined' && performance.mark) {
  performance.mark('nc-app-create');
}

app.mount('#app');

if (typeof performance !== 'undefined' && performance.mark) {
  performance.mark('nc-app-mounted');
  try {
    performance.measure('nc-boot', 'nc-app-create', 'nc-app-mounted');
  } catch (e) {}
}

// Vue 挂载完成后移除 boot-curtain，加 nextTick 确保 DOM 就绪
nextTick(() => {
  setTimeout(() => {
    if (typeof window.__ncRemoveCurtain === 'function') {
      window.__ncRemoveCurtain();
    } else {
      const c = document.getElementById('boot-curtain');
      if (c) {
        c.classList.add('gone');
        setTimeout(() => { try { c.remove(); } catch(e) {} }, 700);
      }
    }
  }, 150);
});
