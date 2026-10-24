// Feature `76` · T13 — `MAC-27`: o observador de interseção do app (a sentinela do fim da lista) e o
// debounce do campo de busca têm UM dono cada. A lista de clientes é o segundo consumidor das duas
// peças; escrever um segundo `IntersectionObserver` ou um segundo `useDebounce(texto, …)` de busca é o
// defeito 01 em miniatura, e nada quebra quando as duas divergem.
//
// Âncora dupla: os arquivos de produção lidos E o dono encontrado com a forma procurada.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DONO_DO_OBSERVADOR = 'shared/lib/useSentinela.ts'
const DONO_DO_DEBOUNCE_DA_BUSCA = 'shared/ui/CampoDeBusca.tsx'

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const producao = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : producao(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const lidos = producao(SRC).map((c) => ({ rel: relative(SRC, c).split('\\').join('/'), texto: semComentario(readFileSync(c, 'utf8').replace(/\r\n/g, '\n')) }))

const OBSERVADOR = /\bnew\s+IntersectionObserver\s*\(/
const DEBOUNCE_DE_BUSCA = /\buseDebounce\s*\(\s*texto\b/

const acusados = (re: RegExp, permitido: string, arquivos = lidos) => arquivos.filter((a) => re.test(a.texto) && a.rel !== permitido).map((a) => a.rel)

describe('um dono do observador e do debounce da busca (MAC-27)', () => {
  it('âncora: o app foi lido e cada dono tem a forma procurada', () => {
    expect(lidos.length).toBeGreaterThan(100)
    expect(OBSERVADOR.test(lidos.find((a) => a.rel === DONO_DO_OBSERVADOR)!.texto)).toBe(true)
    expect(DEBOUNCE_DE_BUSCA.test(lidos.find((a) => a.rel === DONO_DO_DEBOUNCE_DA_BUSCA)!.texto)).toBe(true)
  })

  it('só `shared/lib/useSentinela.ts` cria um IntersectionObserver', () => {
    expect(acusados(OBSERVADOR, DONO_DO_OBSERVADOR)).toEqual([])
  })

  it('só `shared/ui/CampoDeBusca.tsx` debounça o texto de uma busca', () => {
    expect(acusados(DEBOUNCE_DE_BUSCA, DONO_DO_DEBOUNCE_DA_BUSCA)).toEqual([])
  })

  it('o antigo endereço da sentinela não existe mais, e ninguém a importa de lá', () => {
    expect(lidos.map((a) => a.rel)).not.toContain('widgets/order-list/model/useSentinela.ts')
    expect(lidos.filter((a) => /model\/useSentinela/.test(a.texto)).map((a) => a.rel)).toEqual([])
  })

  it('os dois consumidores de pedidos usam os donos', () => {
    expect(lidos.find((a) => a.rel === 'widgets/order-list/ui/ListaDePedidos.tsx')!.texto).toMatch(/from '@\/shared\/lib\/useSentinela'/)
    expect(lidos.find((a) => a.rel === 'features/order-search/ui/BuscaDePedidos.tsx')!.texto).toMatch(/<CampoDeBusca\b/)
  })
})

describe('sensores', () => {
  const fake = (rel: string, texto: string) => [{ rel, texto: semComentario(texto) }]
  it('acusa um segundo observador, em qualquer arquivo', () => {
    expect(acusados(OBSERVADOR, DONO_DO_OBSERVADOR, fake('widgets/x/ui/Lista.tsx', 'const o = new IntersectionObserver(() => {})'))).toEqual(['widgets/x/ui/Lista.tsx'])
  })
  it('acusa um segundo debounce de busca', () => {
    expect(acusados(DEBOUNCE_DE_BUSCA, DONO_DO_DEBOUNCE_DA_BUSCA, fake('features/y/ui/Busca.tsx', 'const termo = useDebounce(texto, 300)'))).toEqual(['features/y/ui/Busca.tsx'])
  })
  it('o comentário que cita a forma não conta, com LF e com CRLF', () => {
    expect(acusados(OBSERVADOR, DONO_DO_OBSERVADOR, fake('a.ts', '// new IntersectionObserver(\nconst x = 1'))).toEqual([])
    expect(acusados(OBSERVADOR, DONO_DO_OBSERVADOR, fake('a.ts', '/* new IntersectionObserver( */\nconst x = 1'))).toEqual([])
    expect(semComentario('a // new IntersectionObserver(\r\nb')).not.toMatch(/IntersectionObserver/)
  })
  it('inverso: outro uso de useDebounce (que não é texto de busca) passa', () => {
    expect(acusados(DEBOUNCE_DE_BUSCA, DONO_DO_DEBOUNCE_DA_BUSCA, fake('a.ts', 'const v = useDebounce(valor, 100)'))).toEqual([])
  })
})
