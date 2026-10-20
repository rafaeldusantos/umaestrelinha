// Feature 70 (SMV-05, SMV-06) — o `robots.txt` gerado no build a partir de `STORE_PUBLIC_URL`.
//
// Duas metades, no molde de `shell.test.ts`: a regra pura (`robots.mjs`) e a FIAÇÃO do script
// (`build-robots.mjs`), executado de verdade numa cópia dentro de `apps/store`, com o PAR POSITIVO
// no mesmo ambiente (`L-041`): sem ele, a falha que se exige poderia vir do ambiente incompleto, e o
// mutante que tira a parada do script passaria.
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
// @ts-expect-error — módulo .mjs do script de build, sem declaração de tipos.
import { ORIGEM_LOCAL, gerarRobots, origemDoRobots } from '../robots.mjs'

const loja = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
/** O modelo de verdade, por caminho literal — a régua nunca é o objeto medido. */
const MODELO = readFileSync(join(loja, 'public/robots.txt'), 'utf8')
const linhasSitemap = (texto: string) => texto.split(/\r?\n/).filter(l => /^\s*sitemap\s*:/i.test(l))

// Os temporários moram no `node_modules/.cache` da RAIZ, e não em `apps/store`: lá dentro eles caíam
// na varredura de `chaveDeServidorForaDoNavegador.test.ts`, que achava um diretório no meio da leitura
// e apagado logo depois — ENOENT em 1 de 4 execuções (achado da verificação da 70). Dentro de
// `node_modules` nenhuma varredura entra, e o `esbuild` continua resolvendo pelo `node_modules` de cima.
const TEMP = join(resolve(dirname(fileURLToPath(import.meta.url)), '../../../..'), 'node_modules', '.cache', 'estrelinha-testes')
mkdirSync(TEMP, { recursive: true })

describe('origemDoRobots — de onde sai a linha `Sitemap:`', () => {
  it('a env, sem barra final', () => {
    expect(origemDoRobots({ STORE_PUBLIC_URL: 'https://umaestrelinha.com.br/' })).toBe('https://umaestrelinha.com.br')
    expect(origemDoRobots({ STORE_PUBLIC_URL: 'https://umaestrelinha.com.br', VERCEL: '1' })).toBe(
      'https://umaestrelinha.com.br',
    )
  })

  it('SMV-06: na Vercel sem a env, LANÇA com a mensagem que diz o que fazer', () => {
    expect(() => origemDoRobots({ VERCEL: '1' })).toThrow(/STORE_PUBLIC_URL não está definida no build da Vercel/)
    expect(() => origemDoRobots({ VERCEL: '1', STORE_PUBLIC_URL: '   ' })).toThrow(/STORE_PUBLIC_URL/)
  })

  it('fora da Vercel sem a env, a origem local da loja', () => {
    expect(ORIGEM_LOCAL).toBe('http://localhost:8082')
    expect(origemDoRobots({})).toBe('http://localhost:8082')
  })

  it('env que não é origem LANÇA — relativa, outro esquema, ou com caminho', () => {
    expect(() => origemDoRobots({ STORE_PUBLIC_URL: '/loja' })).toThrow(/absoluta/)
    expect(() => origemDoRobots({ STORE_PUBLIC_URL: 'ftp://loja.test' })).toThrow(/http ou https/)
    expect(() => origemDoRobots({ STORE_PUBLIC_URL: 'https://loja.test/loja' })).toThrow(/só a origem/)
  })
})

describe('gerarRobots — o modelo mais UMA linha absoluta (SMV-05)', () => {
  const gerado = gerarRobots(MODELO, 'https://umaestrelinha.com.br')

  it('exatamente uma linha `Sitemap:`, absoluta, sem barra dupla', () => {
    expect(linhasSitemap(gerado)).toEqual(['Sitemap: https://umaestrelinha.com.br/sitemap.xml'])
    expect(gerado).not.toContain('//sitemap.xml')
  })

  it('as demais linhas são as do modelo, na mesma ordem', () => {
    const resto = gerado.split('\n').filter(l => !/^\s*sitemap\s*:/i.test(l))
    expect(resto.join('\n').replace(/\s+$/, '')).toBe(MODELO.replace(/\s+$/, ''))
  })

  it('modelo que já traz uma linha `Sitemap:` LANÇA — o segundo dono voltando por edição', () => {
    expect(() => gerarRobots(`${MODELO}\nSitemap: https://outra.test/sitemap.xml\n`, 'https://loja.test')).toThrow(
      /já traz uma linha `Sitemap:`/,
    )
    expect(() => gerarRobots('User-agent: *\nsitemap:https://x.test/s.xml', 'https://loja.test')).toThrow()
  })
})

describe('build-robots.mjs — executado de verdade', () => {
  const rodar = (env: Record<string, string>, comDist = true) => {
    const raiz = mkdtempSync(join(TEMP, 'tmp-build-robots-'))
    try {
      mkdirSync(join(raiz, 'scripts'))
      mkdirSync(join(raiz, 'public'))
      for (const f of ['build-robots.mjs', 'robots.mjs']) copyFileSync(join(loja, 'scripts', f), join(raiz, 'scripts', f))
      writeFileSync(join(raiz, 'public/robots.txt'), MODELO)
      if (comDist) {
        mkdirSync(join(raiz, 'dist'))
        // O que o `vite build` deixa: a cópia do modelo.
        writeFileSync(join(raiz, 'dist/robots.txt'), MODELO)
      }
      // O ambiente do processo SEM as duas envs herdadas da máquina — o teste mede o script, não ela.
      const base = { ...process.env }
      delete base.VERCEL
      delete base.STORE_PUBLIC_URL
      const r = spawnSync(process.execPath, [join(raiz, 'scripts/build-robots.mjs')], {
        encoding: 'utf8',
        env: { ...base, ...env },
      })
      const saida = join(raiz, 'dist/robots.txt')
      return { status: r.status, stderr: r.stderr, robots: existsSync(saida) ? readFileSync(saida, 'utf8') : null }
    } finally {
      rmSync(raiz, { recursive: true, force: true })
    }
  }

  it('SMV-06: na Vercel sem `STORE_PUBLIC_URL`: exit ≠ 0, a mensagem, e o robots.txt SEM linha `Sitemap:`', () => {
    const r = rodar({ VERCEL: '1' })
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/build-robots: STORE_PUBLIC_URL não está definida no build da Vercel/)
    expect(linhasSitemap(r.robots)).toEqual([])
  })

  it('par positivo — na Vercel COM a env: exit 0 e a linha da origem, sem barra dupla', () => {
    const r = rodar({ VERCEL: '1', STORE_PUBLIC_URL: 'https://umaestrelinha.com.br/' })
    expect(r.status).toBe(0)
    expect(linhasSitemap(r.robots)).toEqual(['Sitemap: https://umaestrelinha.com.br/sitemap.xml'])
    expect(r.robots).toBe(gerarRobots(MODELO, 'https://umaestrelinha.com.br'))
  })

  it('fora da Vercel sem a env: exit 0 e a origem local', () => {
    const r = rodar({})
    expect(r.status).toBe(0)
    expect(linhasSitemap(r.robots)).toEqual(['Sitemap: http://localhost:8082/sitemap.xml'])
  })

  it('sem `dist/` (o `vite build` não rodou): exit ≠ 0 e nada escrito', () => {
    const r = rodar({ STORE_PUBLIC_URL: 'https://umaestrelinha.com.br' }, false)
    expect(r.status).not.toBe(0)
    expect(r.stderr).toMatch(/build-robots: .*vite build/)
    expect(r.robots).toBeNull()
  })
})

// O Turbo FILTRA o ambiente de cada task: variável que não está em `tasks.build.env` não chega ao
// build, e o cache devolveria o `robots.txt` (e o bundle) de outra origem. A Vercel roda o build do
// app sem Turbo, então isto protege o build da raiz e o cache — e nenhum outro teste lia o arquivo
// (achado da verificação da 70, M20).
describe('turbo.json — o build enxerga a origem e guarda o bundle da função', () => {
  const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
  /** `turbo.json` aceita comentário `//`; removido linha a linha antes do parse (CRLF normalizado). */
  const lerTurbo = (texto: string) =>
    JSON.parse(texto.replace(/\r\n/g, '\n').replace(/^\s*\/\/.*$/gm, '')) as {
      tasks: { build: { env?: string[]; outputs?: string[] } }
    }
  const faltando = (texto: string): string[] => {
    const build = lerTurbo(texto).tasks.build
    return [
      ...['STORE_PUBLIC_URL', 'VERCEL'].filter(v => !(build.env ?? []).includes(v)),
      ...['dist/**', '.server/**'].filter(o => !(build.outputs ?? []).includes(o)),
    ]
  }
  const TURBO = readFileSync(join(RAIZ, 'turbo.json'), 'utf8')

  it('`tasks.build.env` tem STORE_PUBLIC_URL e VERCEL, e `outputs` tem dist/** e .server/**', () => {
    expect(faltando(TURBO)).toEqual([])
  })

  it('sensor — a mesma régua acusa a env e a saída retiradas', () => {
    expect(faltando(TURBO.replace('"STORE_PUBLIC_URL",', '').replace(', "STORE_PUBLIC_URL"', ''))).toContain('STORE_PUBLIC_URL')
    expect(faltando(TURBO.replace('"VERCEL"', '"OUTRA"'))).toContain('VERCEL')
    expect(faltando(TURBO.replace(', ".server/**"', ''))).toContain('.server/**')
  })
})
