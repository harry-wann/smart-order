import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { generateIconMap, isIconAsset } from './scripts/generate-icon-map.mjs'

const iconAssetsDirectory = fileURLToPath(new URL('./src/assets', import.meta.url))

// https://vite.dev/config/
export default defineConfig(() => {
  generateIconMap()

  return {
    plugins: [
      react(),
      svgr(),
      tailwindcss(),
      {
        name: 'regenerate-icon-map',
        configureServer(server) {
          server.watcher.add(iconAssetsDirectory)

          const regenerateOnIconChange = (filePath) => {
            if (!isIconAsset(filePath, iconAssetsDirectory)) return

            try {
              generateIconMap()
            } catch (error) {
              server.config.logger.error(error.message)
            }
          }

          server.watcher.on('add', regenerateOnIconChange)
          server.watcher.on('unlink', regenerateOnIconChange)
        },
      },
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
