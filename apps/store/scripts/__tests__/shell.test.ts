// Feature 69 — o shell que a função `api/page` embute (SSV-04). Achado da verificação (M27): nenhum
// teste executava a recusa, e um `dist/index.html` que não é o da loja passaria para o bundle.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error — módulo .mjs do script de build, sem declaração de tipos.
import { lerShell } from '../shell.mjs'

const dir = mkdtempSync(join(tmpdir(), 'shell-69-'))
const arquivo = (nome: string, conteudo: string) => {
  const caminho = join(dir, nome)
  writeFileSync(caminho, conteudo)
  return caminho
}

describe('lerShell — o build só embute o shell da loja', () => {
  it('devolve o conteúdo de um index.html com a raiz do SPA', () => {
    const html = '<!doctype html><html><head><title>x</title></head><body><div id="root"></div></body></html>'
    expect(lerShell(arquivo('ok.html', html))).toBe(html)
  })

  it('arquivo ausente LANÇA, citando o vite build', () => {
    expect(() => lerShell(join(dir, 'nao-existe.html'))).toThrow(/vite build/)
  })

  it('arquivo sem `id="root"` LANÇA — não é o shell da loja', () => {
    expect(() => lerShell(arquivo('outro.html', '<html><body>404</body></html>'))).toThrow(/id="root"/)
  })
})

describe('lerShell — arquivo vazio', () => {
  it('index.html VAZIO LANÇA — embutir `""` serviria uma página em branco em toda URL', () => {
    expect(() => lerShell(arquivo('vazio.html', ''))).toThrow(/id="root"/)
  })
})

// A FIAÇÃO do script (achado da verificação, N04): `lerShell` ter teste não prova que o build o
// chama e PARA. O script roda de verdade, numa cópia dentro de `apps/store` (para o `esbuild` resolver
// pelo `node_modules` de cima), com uma entrada e um tsconfig MÍNIMOS — sem eles o esbuild falharia
// sozinho e o teste passaria pelo motivo errado (rodada 3 da verificação). O par positivo prova que,
// com o mesmo ambiente e um shell válido, o build SAI 0 e gera o bundle com o shell dentro.
describe('build-server.mjs — sem shell, o build PARA; com shell, gera o bundle', () => {
  const loja = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

  const rodar = (comShell: string | null) => {
    const raiz = mkdtempSync(join(loja, '.tmp-build-server-'))
    try {
      mkdirSync(join(raiz, 'scripts'))
      mkdirSync(join(raiz, 'server'))
      for (const f of ['build-server.mjs', 'shell.mjs']) copyFileSync(join(loja, 'scripts', f), join(raiz, 'scripts', f))
      writeFileSync(join(raiz, 'server/page.ts'), 'declare const __SHELL__: string\nexport default { shell: __SHELL__ }\n')
      writeFileSync(join(raiz, 'tsconfig.server.json'), '{}\n')
      if (comShell !== null) {
        mkdirSync(join(raiz, 'dist'))
        writeFileSync(join(raiz, 'dist/index.html'), comShell)
      }
      const r = spawnSync(process.execPath, [join(raiz, 'scripts/build-server.mjs')], { encoding: 'utf8' })
      const bundle = join(raiz, '.server/page.mjs')
      return { status: r.status, stderr: r.stderr, bundle: existsSync(bundle) ? readFileSync(bundle, 'utf8') : null }
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  }

  it('sem `dist/index.html`: exit ≠ 0, mensagem do `vite build`, nenhum `.server/page.mjs`', () => {
    const r = rodar(null)
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/build-server: .*vite build/)
    expect(r.bundle).toBeNull()
  })

  it('com `dist/index.html` VAZIO: exit ≠ 0 e nenhum bundle', () => {
    const r = rodar('')
    expect(r.status).not.toBe(0)
    expect(r.bundle).toBeNull()
  })

  it('par positivo — com o shell da loja: exit 0 e o bundle traz o shell embutido', () => {
    const r = rodar('<html><body><div id="root"></div><!-- marca-do-build-69 --></body></html>')
    expect(r.status).toBe(0)
    expect(r.bundle).toContain('marca-do-build-69')
  })
})
