import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers for smaller bundle size
    target: 'es2015',

    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
      },
    },

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Manual chunk splitting strategy
        manualChunks: (id) => {
          // Vendor chunks - separate large libraries
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }

            // UI library (Radix UI components)
            if (id.includes('@radix-ui')) {
              return 'vendor-ui';
            }

            // 3D libraries (Three.js and React Three Fiber)
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-3d';
            }

            // Supabase and query libraries
            if (id.includes('@supabase') || id.includes('@tanstack')) {
              return 'vendor-data';
            }

            // Charts and visualization
            if (id.includes('recharts') || id.includes('chart')) {
              return 'vendor-charts';
            }

            // Other vendor code
            return 'vendor-other';
          }

          // Application chunks - separate by feature
          // Components chunks
          if (id.includes('/components/StrategicOpsPanel')) {
            return 'feature-strategic';
          }
          if (id.includes('/components/SmartLabCockpit')) {
            return 'feature-lab';
          }
          if (id.includes('/components/MedicCockpit')) {
            return 'feature-medic';
          }
          if (id.includes('/components/MedicalAIInterface')) {
            return 'feature-ai';
          }

          // Services and utilities
          if (id.includes('/services/')) {
            return 'services';
          }
          if (id.includes('/utils/')) {
            return 'utils';
          }
          if (id.includes('/repositories/')) {
            return 'repositories';
          }
        },

        // Naming pattern for chunks
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/js/[name]-[hash].js`;
        },

        // Entry file naming
        entryFileNames: 'assets/js/[name]-[hash].js',

        // Asset file naming
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Source maps for production debugging
    sourcemap: mode !== 'production',

    // CSS code splitting
    cssCodeSplit: true,
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
    exclude: [
      '@react-three/fiber',
      '@react-three/drei',
    ],
  },
}));
