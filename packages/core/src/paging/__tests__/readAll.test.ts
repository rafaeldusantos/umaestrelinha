import { describe, it, expect, vi } from 'vitest'
import { POSTGREST_PAGE_SIZE, readAllPages } from '../readAll.ts'

/**
 * `SMP-16`, `SMP-19` — a leitura completa conferida contra a contagem exata.
 *
 * A propriedade que este arquivo existe para guardar é **silenciosa**: o PostgREST trunca em 1.000
 * linhas sem erro e sem header de aviso. Um teste que só verifique "leu tudo" com 3 linhas de
 * fixture nunca chega perto do teto — foi assim que a feature 21 quebrou o importador **só no
 * volume real**. Por isso os casos abaixo forjam a divergência entre contagem e leitura, que é o
 * único sinal disponível.
 */

/** Gera `n` linhas identificáveis, para as asserções falarem de conteúdo e não só de tamanho. */
const linhas = (n: number, offset = 0) =>
  Array.from({ length: n }, (_, i) => ({ id: offset + i }))

/** Um leitor honesto sobre um corpo de dados fixo. */
const leitorDe = (todas: { id: number }[]) =>
  vi.fn(async (from: number, to: number) => todas.slice(from, to + 1))

describe('readAllPages — leitura completa', () => {
  it('devolve todas as linhas quando a leitura bate com a contagem', async () => {
    const todas = linhas(2345)
    const lidas = await readAllPages({ total: todas.length, readPage: leitorDe(todas) })

    expect(lidas).toHaveLength(2345)
    // Conteúdo, não só contagem: uma paginação que repetisse a primeira página teria o mesmo total.
    expect(lidas[0]).toEqual({ id: 0 })
    expect(lidas[2344]).toEqual({ id: 2344 })
  })

  it('pagina em faixas inclusivas de 1.000 — a semântica do `range` do PostgREST', async () => {
    const todas = linhas(2345)
    const readPage = leitorDe(todas)
    await readAllPages({ total: todas.length, readPage })

    expect(readPage.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ])
  })

  it('o teto padrão é 1.000 — o número do PostgREST, não um arredondamento', () => {
    expect(POSTGREST_PAGE_SIZE).toBe(1000)
  })

  it('`pageSize` explícito é respeitado', async () => {
    const todas = linhas(5)
    const readPage = leitorDe(todas)
    await readAllPages({ total: 5, readPage, pageSize: 2 })

    expect(readPage.mock.calls).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ])
  })

  it('total 0 não lê página nenhuma', async () => {
    const readPage = leitorDe([])
    const lidas = await readAllPages({ total: 0, readPage })

    expect(lidas).toEqual([])
    expect(readPage).not.toHaveBeenCalled()
  })

  it('total múltiplo exato do teto custa uma requisição vazia a mais, e não falha', async () => {
    // 2.000 linhas em páginas de 1.000: o laço tenta [0,999] e [1000,1999] e para — o `from < total`
    // já corta. O caso existe porque a borda é onde uma condição `<=` mal escrita quebraria.
    const todas = linhas(2000)
    const readPage = leitorDe(todas)
    const lidas = await readAllPages({ total: 2000, readPage })

    expect(lidas).toHaveLength(2000)
    expect(readPage.mock.calls).toHaveLength(2)
  })
})

describe('readAllPages — a recusa que impede resultado parcial', () => {
  it('lança quando a leitura vem TRUNCADA, nomeando lido e esperado', async () => {
    // O caso real, e ele é preciso: a consulta tem um teto duro de 1.000 linhas, então a primeira
    // página vem cheia e a **segunda vem vazia** — não há erro em lugar nenhum, só menos linha.
    // Foi assim que a feature 21 quebrou o importador, e só no volume real.
    const todas = linhas(3233)
    const readPage = vi.fn(async (from: number, to: number) =>
      from === 0 ? todas.slice(from, to + 1) : [],
    )

    await expect(readAllPages({ total: 3233, readPage })).rejects.toThrow(/1000 de 3233/)
  })

  it('lança quando a leitura devolve VAZIO com contagem positiva', async () => {
    await expect(
      readAllPages({ total: 10, readPage: async () => [] }),
    ).rejects.toThrow(/incompleta/)
  })

  it('página vazia interrompe o laço em vez de girar até o total', async () => {
    // Sem o `break`, um `readPage` que devolve `[]` faria 1.000 requisições antes de falhar.
    const readPage = vi.fn(async () => [] as { id: number }[])
    await expect(readAllPages({ total: 1_000_000, readPage })).rejects.toThrow(/incompleta/)

    expect(readPage).toHaveBeenCalledTimes(1)
  })

  it('lança também quando vem linha A MAIS — divergência é divergência nos dois sentidos', async () => {
    // Uma leitura sem ordem estável repete linhas entre páginas. O total sobe, e um teste que só
    // conferisse `lidas.length >= total` deixaria passar exatamente esse defeito.
    const readPage = vi.fn(async () => linhas(1000))
    await expect(readAllPages({ total: 1500, readPage, pageSize: 1000 })).rejects.toThrow(
      /2000 de 1500/,
    )
  })

  it('a consequência do chamador viaja na mensagem — a paginação não a inventa', async () => {
    await expect(
      readAllPages({
        total: 5,
        readPage: async () => [],
        label: 'sitemap',
        consequence: 'sitemap parcial descreve um catálogo menor do que o que existe',
      }),
    ).rejects.toThrow(/leitura incompleta de sitemap: 0 de 5 linhas — sitemap parcial/)
  })
})
