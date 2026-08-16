import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // 关键：Electron 用 file:// 加载，资源必须相对路径
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
