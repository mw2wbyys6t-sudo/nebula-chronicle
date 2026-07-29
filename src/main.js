import { createApp, nextTick } from 'vue';
import App from './App.vue';
import './styles/universe.css';

const app = createApp(App);
app.mount('#app');

// Vue 挂载完成后立即移除 boot-curtain，避免遮挡页面内容
nextTick(() => {
  setTimeout(() => {
    if (typeof window.__ncRemoveCurtain === 'function') {
      window.__ncRemoveCurtain();
    } else {
      // 兜底：直接操作 DOM
      const c = document.getElementById('boot-curtain');
      if (c) {
        c.classList.add('gone');
        setTimeout(() => { try { c.remove(); } catch(e) {} }, 600);
      }
    }
  }, 150);
});
