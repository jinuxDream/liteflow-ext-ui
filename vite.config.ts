import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isLib = mode === 'lib';

  const baseConfig = {
    plugins: [
      react(),
      ...(isLib ? [dts({
        insertTypesEntry: true,
      })] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@liteflow-editor': path.resolve(__dirname, './src'),
      },
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true,
          modifyVars: {
            '@primary-color': '#1890ff',
          },
        },
      },
    },
  };

  if (isLib) {
    return {
      ...baseConfig,
      build: {
        lib: {
          entry: path.resolve(__dirname, 'src/index.ts'),
          name: 'LiteFlowEditor',
          fileName: (format) => `index.${format}.js`,
          formats: ['es', 'umd'],
        },
        rollupOptions: {
          external: ['react', 'react-dom', 'antd', '@antv/x6'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              antd: 'antd',
              '@antv/x6': 'X6',
            },
          },
        },
        cssCodeSplit: false,
      },
    };
  }

  return {
    ...baseConfig,
    root: 'demo',
    publicDir: false,
    build: {
      outDir: '../dist-demo',
      emptyOutDir: true,
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:10005/',
          changeOrigin: true,
        }
      }
    }
  };
});
