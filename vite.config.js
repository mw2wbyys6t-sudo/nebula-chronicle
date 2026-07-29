import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 构建优化：把大依赖拆到独立 vendor chunk，业务代码交给 Vite/Rolldown 自动分块
// 注意：不能手动把业务模块分到固定 chunk，否则会造成模块循环依赖
// （例如 DataEngine 同时被 AIEngine 和 GalaxyEngine 引用，强制分包会导致两个 chunk 互相 import）
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
  base: '/wonderful-screen/',
  server: {
    host: '0.0.0.0',
    port: 8080
  },
  build: {
    outDir: 'dist',
    target: 'es2018',
    // 适当提高 chunk 大小警告阈值（three.js 本身较大）
    chunkSizeWarningLimit: 900,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks,
        // 给 chunk 文件加 content hash 利于 CDN 缓存
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    // 构建时压缩报告（便于查看产物体积）
    reportCompressedSize: false
  },
  // 预构建配置：把大依赖提前打包，提升 dev 启动速度
  optimizeDeps: {
    include: ['vue', 'three']
  }
});
