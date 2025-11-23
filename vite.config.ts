import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // This effectively "polyfills" process.env for the browser, 
      // preventing "ReferenceError: process is not defined" crashes on Vercel.
      'process.env': env
    },
    build: {
      // Increases the chunk size warning limit to 1600kB to reduce console noise
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // Separates node_modules into a separate vendor chunk for better caching and performance
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          },
        },
      },
    },
  };
});