// MiniOS · Genera los íconos PNG de la PWA con sharp.
//   npm run gen:icons
// Los PNG se commitean en public/; no se regeneran en cada build.
//
//  - icon-192 / icon-512      "any": esquinas REDONDEADAS con transparencia
//                             (es lo que Android dibuja en el splash).
//  - icon-maskable-512        "maskable": fondo a sangre completa; Android lo
//                             recorta con su máscara. El logo queda dentro de
//                             la zona segura (círculo central del 80 %).
//  - apple-touch-icon (180)   opaco y a sangre; iOS aplica su propio redondeo.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import sharp from 'sharp'

const OUT = fileURLToPath(new URL('../public', import.meta.url))

const GRADIENT = `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2dd4bf"/>
      <stop offset="0.6" stop-color="#0d9488"/>
      <stop offset="1" stop-color="#0f766e"/>
    </linearGradient>
  </defs>`

// El logo ocupa x 64–416, y 150–382 → centro (240,266). Se centra en (256,256);
// `scale` lo encoge hacia el centro.
const logo = (scale = 1) => `
  <g transform="translate(256 256) scale(${scale}) translate(-240 -266)">
    <g fill="none" stroke="#ffffff" stroke-width="20" stroke-linecap="round" stroke-linejoin="round">
      <path d="M136 220 v150 a12 12 0 0 0 12 12 h216 a12 12 0 0 0 12 -12 v-150"/>
      <path d="M120 150 h272 l24 70 a44 44 0 0 1 -88 0 a44 44 0 0 1 -88 0 a44 44 0 0 1 -88 0 a44 44 0 0 1 -88 0 z" fill="#ffffff" stroke="none"/>
      <rect x="228" y="286" width="80" height="96" rx="6"/>
    </g>
  </g>`

const svg = (rx, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${GRADIENT}
  <rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>${logo(scale)}
</svg>`

const rounded = svg(112, 1) // ~22 % de radio → esquinas redondeadas
const maskable = svg(0, 0.9) // a sangre, logo en zona segura
const apple = svg(0, 1)

async function png(source, size, file) {
  await sharp(Buffer.from(source)).resize(size, size).png().toFile(join(OUT, file))
  console.log('✓', file)
}

await writeFile(join(OUT, 'icon.svg'), rounded) // fuente "any" (también sirve de favicon grande)
await png(rounded, 192, 'icon-192.png')
await png(rounded, 512, 'icon-512.png')
await png(maskable, 512, 'icon-maskable-512.png')
await png(apple, 180, 'apple-touch-icon.png')
