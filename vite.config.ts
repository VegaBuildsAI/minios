import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Cloudflare Pages sirve los assets desde el mismo origen → base relativa.
  const assetBase = env.VITE_ASSET_BASE || '/'

  return {
    base: assetBase,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'MiniOS — Mini-ERP para Minisúper',
          short_name: 'MiniOS',
          description: 'Caja, inventario, proveedores, bitácora y reportes desde el celular.',
          lang: 'es-CR',
          // La app móvil es clara: la barra de estado se funde con el fondo.
          theme_color: '#f3f0e8',
          background_color: '#f3f0e8',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/app',
          scope: '/',
          // "any" (esquinas redondeadas, las usa el splash) y "maskable"
          // (a sangre, Android lo recorta) van en archivos SEPARADOS.
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: null,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }
})
