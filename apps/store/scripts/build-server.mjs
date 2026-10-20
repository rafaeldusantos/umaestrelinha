// Feature 69 (T11, `AD-053`) — empacota a função `api/page` depois do `vite build`.
//
// O shell é o `dist/index.html` DESTE build, embutido no bundle como constante (`__SHELL__`): a
// página servida e os assets que ela referencia saem do mesmo build por construção (SSV-04), sem
// `fs` nem HTTP em runtime. Por isso o build FALHA sem `dist/index.html` — empacotar um shell vazio
// ou velho serviria uma loja em branco, ou apontando para assets de outro deploy.
//
// A saída é `.server/page.mjs` (gitignored), e `api/page.mjs` (versionado) só a reexporta. É o
// layout medido no spike; se o preview mostrar que a Vercel não detecta a função assim, o plano B é
// trocar `SAIDA` por `api/page.mjs` e tirar a reexportação — este é o único ponto a mudar.
//
// `paths` do `tsconfig.server.json` resolvem `@estrelinha/core/*` para o fonte (sem build por
// pacote), e o banner devolve `require` ao ESM — o supabase-js tem dependência CommonJS.
import { build } from 'esbuild'
import { lerShell } from './shell.mjs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SHELL = resolve(raiz, 'dist/index.html')
const SAIDA = resolve(raiz, '.server/page.mjs')

let shell
try {
  shell = lerShell(SHELL)
} catch (e) {
  console.error(`build-server: ${e.message}`)
  process.exit(1)
}

await build({
  entryPoints: [resolve(raiz, 'server/page.ts')],
  outfile: SAIDA,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  tsconfig: resolve(raiz, 'tsconfig.server.json'),
  define: { __SHELL__: JSON.stringify(shell) },
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: 'warning',
})
console.log(`build-server: ${SAIDA} (shell de ${shell.length} bytes)`)
