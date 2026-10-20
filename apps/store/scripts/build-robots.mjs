// Feature 70 (SMV-05, SMV-06) — escreve `dist/robots.txt` depois do `vite build`.
//
// O `vite build` copia `public/robots.txt` (o MODELO, sem a linha `Sitemap:`) para `dist/`; este
// passo o reescreve com a linha que sai de `STORE_PUBLIC_URL`. Falha — e com isso falha o deploy —
// quando roda na Vercel sem a env, ou com uma env que não é origem. A regra está em `robots.mjs`.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gerarRobots, origemDoRobots } from './robots.mjs'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MODELO = resolve(raiz, 'public/robots.txt')
const SAIDA = resolve(raiz, 'dist/robots.txt')

try {
  if (!existsSync(resolve(raiz, 'dist'))) {
    throw new Error('dist/ não existe. Rode o `vite build` antes — o robots.txt é escrito no build.')
  }
  const origem = origemDoRobots(process.env)
  writeFileSync(SAIDA, gerarRobots(readFileSync(MODELO, 'utf8'), origem))
  console.log(`build-robots: ${SAIDA} (Sitemap: ${origem}/sitemap.xml)`)
} catch (e) {
  console.error(`build-robots: ${e.message}`)
  process.exit(1)
}
