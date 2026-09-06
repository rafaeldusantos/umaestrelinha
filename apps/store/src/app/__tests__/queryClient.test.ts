import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { PROMOTIONS_STALE_TIME } from '@estrelinha/core/hooks/usePromotions'

import { STORE_STALE_TIME, createQueryClient } from '../queryClient'

/**
 * `PRF-07` — o que já foi respondido não é pedido de novo por cinco minutos.
 *
 * O padrão do React Query é `staleTime: 0`, e com ele **toda** consulta nasce velha: sair da
 * categoria para a home e voltar refazia a consulta inteira. Medido em 2026-09-05, a da categoria
 * custava 307 KB comprimidos — pagos de novo por um dado que uma pessoa edita algumas vezes por
 * semana.
 *
 * A régua aqui é dupla: o padrão existe **e** ele não atropela quem já tinha decidido o seu.
 */

const AQUI = dirname(fileURLToPath(import.meta.url))

describe('o QueryClient da loja declara o padrão de 5 minutos', () => {
  it('`staleTime` padrão é 5 minutos', () => {
    const client = createQueryClient()

    expect(STORE_STALE_TIME).toBe(1000 * 60 * 5)
    expect(client.getDefaultOptions().queries?.staleTime).toBe(STORE_STALE_TIME)
  })

  it('o valor é o MESMO que as consultas que já o praticavam — não é um terceiro número', () => {
    // `usePromotions` e `store_settings` declaravam 5 minutos cada um, desde antes desta feature.
    // O padrão os alcança em vez de inventar outro valor; divergir aqui faria a loja ter duas
    // noções de "recente" ao mesmo tempo, e nada acusaria.
    expect(STORE_STALE_TIME).toBe(PROMOTIONS_STALE_TIME)
  })

  it('consulta SEM `staleTime` próprio herda o padrão', () => {
    const client = createQueryClient()

    const opcoes = client.defaultQueryOptions({ queryKey: ['products', 'colares'] })

    expect(opcoes.staleTime).toBe(STORE_STALE_TIME)
  })

  it('consulta COM `staleTime` próprio mantém o dela — a da chamada vence a do cliente', () => {
    const client = createQueryClient()

    // O valor é deliberadamente diferente de 5 minutos: com o mesmo número, este teste passaria
    // mesmo se a opção da chamada estivesse sendo ignorada, que é o defeito que ele existe para
    // pegar.
    const propria = client.defaultQueryOptions({ queryKey: ['store_settings'], staleTime: 1234 })

    expect(propria.staleTime).toBe(1234)
  })

  it('`store_settings` continua declarando o `staleTime` dela, no arquivo dela', () => {
    // A outra metade da asserção acima: o mecanismo respeita a opção da chamada, e a consulta que
    // depende disso continua declarando a sua. Lido do disco porque o hook não expõe as opções.
    const fonte = readFileSync(
      resolve(AQUI, '../../../../../packages/core/src/hooks/useStoreSettings.ts'),
      'utf8',
    )

    expect(fonte).toContain("queryKey: ['store_settings']")
    expect(fonte).toMatch(/staleTime:\s*1000 \* 60 \* 5/)
  })

  it('nenhuma opção padrão de MUTAÇÃO foi declarada — só `queries`', () => {
    // Mutação não tem cache a herdar. Um default aqui seria afirmação sem consumidor, e a primeira
    // mutação a se comportar de forma estranha custaria uma investigação inteira.
    const client = createQueryClient()

    expect(client.getDefaultOptions().mutations).toBeUndefined()
    expect(Object.keys(client.getDefaultOptions())).toEqual(['queries'])
  })

  it('cada chamada devolve um cliente PRÓPRIO — o cache não vaza entre testes nem entre janelas', () => {
    // `createQueryClient` é fábrica, não singleton exportado: dois testes que compartilhassem cache
    // veriam o dado um do outro, e a suíte passaria a depender da ordem de execução.
    expect(createQueryClient()).not.toBe(createQueryClient())
  })

  it('o `App.tsx` usa a fábrica, e não um `new QueryClient()` solto', () => {
    // Sem esta asserção, tudo acima poderia estar certo e a loja continuar com o cliente padrão:
    // o módulo estaria correto e ninguém o consumiria.
    const app = readFileSync(resolve(AQUI, '../App.tsx'), 'utf8')

    expect(app).toContain('createQueryClient()')
    expect(app).not.toMatch(/new QueryClient\(/)
  })
})
