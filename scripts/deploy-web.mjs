// MiniOS · Sube el build (dist/) al bucket público 'web' de Supabase Storage.
// Uso:
//   SUPABASE_URL=https://<ref>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
//   node scripts/deploy-web.mjs
//
// Requiere haber corrido antes: npm run build
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPA_URL || !KEY) {
  console.error('Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const BUCKET = 'web'
const distDir = fileURLToPath(new URL('../dist', import.meta.url))

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
}

async function walk(dir) {
  const out = []
  for (const name of await readdir(dir)) {
    const p = join(dir, name)
    const s = await stat(p)
    if (s.isDirectory()) out.push(...(await walk(p)))
    else out.push(p)
  }
  return out
}

async function main() {
  const supabase = createClient(SUPA_URL, KEY, { auth: { persistSession: false } })

  // Asegura el bucket (por si no se corrió la migración 0004).
  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {})

  let files
  try {
    files = await walk(distDir)
  } catch {
    console.error('No existe dist/. Corré primero: npm run build')
    process.exit(1)
  }

  let ok = 0
  for (const abs of files) {
    const key = relative(distDir, abs).split('\\').join('/')
    const body = await readFile(abs)
    const contentType = TYPES[extname(abs).toLowerCase()] ?? 'application/octet-stream'
    const { error } = await supabase.storage.from(BUCKET).upload(key, body, {
      contentType,
      upsert: true,
      cacheControl: key === 'index.html' ? '0' : '3600',
    })
    if (error) {
      console.error(`✗ ${key}: ${error.message}`)
    } else {
      ok++
      console.log(`✓ ${key}`)
    }
  }

  const site = `${SUPA_URL}/storage/v1/object/public/${BUCKET}/index.html`
  console.log(`\nListo: ${ok}/${files.length} archivos subidos.`)
  console.log(`Sitio: ${site}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
