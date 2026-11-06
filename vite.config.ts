import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ isSsrBuild }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        manifest: !isSsrBuild,
        copyPublicDir: !isSsrBuild,
        rollupOptions: {
          output: {
            manualChunks: isSsrBuild ? undefined : {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'markdown': ['marked', 'gray-matter', 'highlight.js/lib/core'],
            }
          }
        },
        chunkSizeWarningLimit: 1000,
      },
    };
});
