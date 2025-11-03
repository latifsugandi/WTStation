import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, './src/shared'),
        '@main': resolve(__dirname, './src/main')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, './src/shared'),
        '@preload': resolve(__dirname, './src/preload')
      }
    }
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src/renderer/src'),
        '@shared': resolve(__dirname, './src/shared')
      }
    },
    css: {
      postcss: './postcss.config.cjs'
    }
  }
})
