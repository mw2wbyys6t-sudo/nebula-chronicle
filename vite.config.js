import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 构建优化：大依赖拆分独立 vendor chunk，业务代码交给 Vite/Rolldown 自动分块
const manualChunks = (id) => {
  if (id.includes('node_modules')) {
    if (id.includes('three')) return 'vendor-three';
    if (id.includes('vue')) return 'vendor-vue';
  }
  return undefined;
};

export default defineConfig({
  plugins: [vue()],
  publicDir: 'public',
  base: '/nebula-chronicle/',
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  build: {
    outDir: 'dist',
    // 升级 target 到 ES2020，现代浏览器输出更小
    target: 'es2020',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    sourcemap: false,
    // 生产环境使用 terser 压缩，drop console/debugger
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    },
    // 小资源内联阈值，4KB 以下内联为 base64
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        manualChunks,
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    reportCompressedSize: false
  },
  optimizeDeps: {
    include: ['vue', 'three']
  }
});
