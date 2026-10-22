import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `VIS-34` (feature `71`) — o nome do fuso da loja tem **um** dono em TypeScript, e é
 * `packages/core/src/time/zone.ts` (`STORE_TIME_ZONE`).
 *
 * Até a `71` o literal estava escrito em **cinco** lugares — o selo da situação em `core`, dois
 * arquivos do cartão do GA no painel, a linha de prazo do pedido na loja e o importador. Cinco
 * escritas do mesmo nome divergem **sem quebrar nada**: um fuso trocado num lugar só faz a mesma
 * entrega ter "dia 12" numa tela e "dia 13" noutra, com build, `tsc` e teste de componente verdes.
 *
 * O banco tem a cópia DELIBERADA (`public.store_time_zone()`), e quem a compara com o dono é
 * `visitasSchema.test.ts`. Este guarda cuida do lado TypeScript: **sem allowlist**.
 *
 * **Fora do escopo, declarado**: `tools/catalog-import`. O importador roda à mão, em Node, e não
 * importa `@estrelinha/core` por alias; o comentário dele cita o fuso em prosa para explicar por que
 * as datas do CSV não levam offset.
 *
 * Só **produção**: arquivos de teste citam o literal de propósito (o próprio dono é testado contra
 * ele, e a migration é mutada com ele).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O nome, montado em duas metades: este arquivo nunca o escreve inteiro em código. */
const FUSO = ['America', 'Sao_Paulo'].join('/')

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = [
  'apps/store/src',
  'apps/store/server',
  'apps/backoffice/src',
  'packages/core/src',
  'packages/ui/src',
  'packages/supabase/src',
  'packages/auth/src',
  'supabase/functions',
]

/** O único arquivo autorizado a escrever o nome. */
const DONO = 'packages/core/src/time/zone.ts'

/** Os quatro que tinham o literal e passaram a importar o dono (`design.md`, D2). */
const CONSUMIDORES = [
  'packages/core/src/orders/situation.ts',
  'apps/backoffice/src/features/google-analytics/model/copy.ts',
  'apps/backoffice/src/features/google-analytics/ui/AnalyticsSecretField.tsx',
  'apps/store/src/entities/order/lib/orderMeta.ts',
]

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

type Arquivo = { nome: string; fonte: string }

const ehTeste = (nome: string): boolean => /\.(test|spec)\.[cm]?[jt]sx?$/.test(nome)

const ler = (relativo: string): Arquivo[] => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (['node_modules', '__tests__', 'dist', '.server'].includes(entrada.name)) continue
        andar(caminho)
        continue
      }
      if (!/\.[cm]?[jt]sx?$/.test(entrada.name) || ehTeste(entrada.name)) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').slice(ROOT.replace(/\\/g, '/').length + 1),
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
}

const arquivos = ESCOPO.flatMap(ler)

/** A régua: o nome do fuso em CÓDIGO (comentário não conta). */
const escreveOFuso = (fonte: string): boolean => semComentario(fonte).includes(FUSO)

const citadores = (lista: Arquivo[]): string[] =>
  lista.filter((a) => escreveOFuso(a.fonte)).map((a) => a.nome)

/** Importa `STORE_TIME_ZONE` do dono (pelo subpath ou por caminho relativo com `.ts`) e o USA. */
const importaODono = (fonte: string): boolean => {
  const codigo = semComentario(fonte)
  const importa =
    /import\s*\{[^}]*\bSTORE_TIME_ZONE\b[^}]*\}\s*from\s*['"](?:@estrelinha\/core\/time|(?:\.\.?\/)+time\/zone\.ts)['"]/.test(
      codigo,
    )
  const usos = codigo.match(/\bSTORE_TIME_ZONE\b/g)?.length ?? 0
  return importa && usos >= 2
}

const fonteDe = (nome: string): string => {
  const a = arquivos.find((x) => x.nome === nome)
  if (!a) throw new Error(`arquivo fora da varredura: ${nome}`)
  return a.fonte
}

describe('VIS-34 — o fuso da loja tem um dono só em TypeScript', () => {
  it('a varredura leu os dois apps, o servidor, os pacotes e as functions — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(900)
    // Um arquivo de cada raiz (`L-035`): um caminho errado leria zero e passaria calado.
    expect(nomes).toContain('apps/store/src/app/App.tsx')
    expect(nomes).toContain('apps/store/server/page.ts')
    expect(nomes).toContain('apps/backoffice/src/app/App.tsx')
    expect(nomes).toContain('packages/core/src/orders/situation.ts')
    expect(nomes).toContain('supabase/functions/_shared/http.ts')
    // Só produção: nenhum arquivo de teste entrou.
    expect(nomes.filter(ehTeste)).toEqual([])
    expect(nomes.some((n) => n.includes('/__tests__/'))).toBe(false)
  })

  it('o dono existe e escreve o nome — a metade que impede a régua de medir o nada', () => {
    expect(escreveOFuso(fonteDe(DONO))).toBe(true)
  })

  it('só o dono escreve o nome do fuso — sem allowlist', () => {
    expect(citadores(arquivos)).toEqual([DONO])
  })

  it.each(CONSUMIDORES)('%s importa STORE_TIME_ZONE do dono e o usa', (nome) => {
    expect(importaODono(fonteDe(nome))).toBe(true)
  })

  describe('sensores', () => {
    it('a escrita antiga reinjetada num dos quatro É acusada', () => {
      const alvo = 'apps/backoffice/src/features/google-analytics/model/copy.ts'
      const mutante = arquivos.map((a) =>
        a.nome === alvo ? { ...a, fonte: `const FUSO = '${FUSO}'\n${a.fonte}` } : a,
      )
      expect([...citadores(mutante)].sort()).toEqual([DONO, alvo].sort())
    })

    it('o literal com aspas duplas e em template também É acusado', () => {
      expect(escreveOFuso(`const z = "${FUSO}"`)).toBe(true)
      expect(escreveOFuso('const z = `' + FUSO + '`')).toBe(true)
    })

    it('a prosa em comentário NÃO é acusada — com LF e com CRLF', () => {
      expect(escreveOFuso(`// o fuso é ${FUSO}\nconst x = 1`)).toBe(false)
      expect(escreveOFuso(`// o fuso é ${FUSO}\r\nconst x = 1`)).toBe(false)
      expect(escreveOFuso(`/* o fuso é ${FUSO} */\r\nconst x = 1`)).toBe(false)
    })

    it('um glob de dois asteriscos num comentário de linha não cega a régua (BL-027)', () => {
      const fonte = `// varre apps/**\nconst z = '${FUSO}'\n/* um bloco qualquer */\nconst y = 2`
      expect(escreveOFuso(fonte)).toBe(true)
    })

    it('importar sem usar, ou declarar um nome local igual, não conta como importar o dono', () => {
      expect(importaODono(`import { STORE_TIME_ZONE } from '@estrelinha/core/time'\nconst x = 1`)).toBe(false)
      expect(importaODono(`const STORE_TIME_ZONE = 'x'\nfoo(STORE_TIME_ZONE)`)).toBe(false)
      expect(
        importaODono(`import { STORE_TIME_ZONE } from '../time/zone'\nfoo(STORE_TIME_ZONE)`),
      ).toBe(false)
      expect(
        importaODono(`import { STORE_TIME_ZONE } from '../time/zone.ts'\nfoo(STORE_TIME_ZONE)`),
      ).toBe(true)
    })
  })
})
