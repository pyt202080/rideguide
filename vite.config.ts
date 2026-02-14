import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel에서 제공하는 환경 변수를 클라이언트 코드의 process.env로 매핑
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: false
  },
  server: {
    port: 3000
  }
});