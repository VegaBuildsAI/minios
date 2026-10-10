// MiniOS · Edge Function: web
// Sirve el index.html del SPA como text/html (Storage lo degrada a text/plain
// por seguridad; las Functions sí pueden devolver HTML). Los assets (JS/CSS)
// se sirven directo desde el bucket 'web' de Storage con su content-type correcto.
// El SPA usa HashRouter, así que esta única ruta cubre toda la navegación.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const INDEX_URL = `${SUPABASE_URL}/storage/v1/object/public/web/index.html`

Deno.serve(async () => {
  const res = await fetch(INDEX_URL, { cache: 'no-store' })
  if (!res.ok) {
    return new Response('index.html no encontrado en el bucket web. Corré: npm run build && npm run deploy:web', {
      status: 502,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  const html = await res.text()
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
})
