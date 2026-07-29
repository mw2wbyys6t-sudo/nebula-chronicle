import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// 构建优化：大依赖拆分独立 vendor chunk，业务代码交给 Vite/Rolldown 自动分块
// 注意：不能手动分业务模块，否则会造成模块循环依赖
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
    target: 'es2018',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    sourcemap: false,
    minify: 'esbuild',
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
  // 预构建：将大依赖提前打包，提升 dev 启动速度
  optimizeDeps: {
    include: ['vue', 'three']
  }
});
