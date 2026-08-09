import { describe, expect, it } from 'vitest'

import { createReport } from '../report.ts'

describe('report — conferência de totais (CAT-08)', () => {
  it('fecha quando lidos = criados + atualizados + pulados', () => {
    const r = createReport()
    r.read('produtos', 10)
    r.created('produtos', 6)
    r.updated('produtos', 3)
    r.skipped('produtos', { slug: 'sem-preco', nuvemshop_id: 1, motivo: 'sem_preco' })

    expect(r.balances().find(b => b.entidade === 'produtos')!.confere).toBe(true)
    expect(r.exitCode()).toBe(0)
  })

  it('NÃO fecha — e sai diferente de zero — quando um lido não virou saída nenhuma', () => {
    // É o defeito que esta conferência existe para pegar: um produto engolido por exceção em ramo
    // intermediário some sem que ninguém perceba num lote de 690.
    const r = createReport()
    r.read('produtos', 10)
    r.created('produtos', 6)
    r.updated('produtos', 3)

    const balance = r.balances().find(b => b.entidade === 'produtos')!
    expect(balance.confere).toBe(false)
    expect(balance.lidos).toBe(10)
    expect(balance.somados).toBe(9)
    expect(r.exitCode()).toBe(1)
  })

  it('confere as três entidades de forma independente', () => {
    const r = createReport()
    r.read('categorias', 39); r.created('categorias', 39)
    r.read('produtos', 2); r.created('produtos', 1)
    r.read('variacoes', 5); r.created('variacoes', 5)

    const por = Object.fromEntries(r.balances().map(b => [b.entidade, b.confere]))
    expect(por).toEqual({ categorias: true, produtos: false, variacoes: true })
    expect(r.exitCode()).toBe(1)
  })

  it('relatório vazio fecha e sai zero', () => {
    expect(createReport().exitCode()).toBe(0)
  })
})

describe('report — parada limpa (CAT-06)', () => {
  it('sai diferente de zero quando abortou, mesmo com os totais fechando', () => {
    const r = createReport()
    r.read('produtos', 1)
    r.created('produtos', 1)
    r.aborted('Nuvemshop devolveu 429 após 4 tentativas')

    expect(r.balances().every(b => b.confere)).toBe(true)
    expect(r.exitCode()).toBe(1)
    expect(r.data().parouPorErro).toBe('Nuvemshop devolveu 429 após 4 tentativas')
    expect(r.toText()).toContain('PAROU: Nuvemshop devolveu 429 após 4 tentativas')
  })
})

describe('report — imagens (CAT-03, CAT-07)', () => {
  it('conta novas, reusadas e falhadas separadamente', () => {
    const r = createReport()
    r.imageNew(); r.imageNew()
    r.imageReused()
    r.imageFailed({ storageBase: 'nuvemshop/1/9', url: 'https://cdn/x.png', motivo: 'HTTP 403' })

    expect(r.data().imagens).toEqual({ novas: 2, reusadas: 1, falhadas: 1 })
  })

  it('imagem falhada NÃO derruba o código de saída — produto não é descartado por uma foto', () => {
    const r = createReport()
    r.read('produtos', 1); r.created('produtos', 1)
    r.imageFailed({ storageBase: 'nuvemshop/1/9', url: 'https://cdn/x.png', motivo: 'HTTP 403' })

    expect(r.exitCode()).toBe(0)
  })

  it('nomeia cada imagem falhada com o motivo, no texto', () => {
    const r = createReport()
    r.imageFailed({ storageBase: 'nuvemshop/1/9', url: 'https://cdn/x.png', motivo: 'HTTP 403' })
    expect(r.toText()).toContain('nuvemshop/1/9 — HTTP 403')
  })
})

describe('report — listas nominais', () => {
  it('nomeia as categorias desativadas por curadoria (CAT-11)', () => {
    const r = createReport()
    r.categoryCurated({ nuvemshop_id: 35119124, slug: 'black-friday', motivo: 'urgência fabricada' })
    r.categoryCurated({ nuvemshop_id: 32697621, slug: 'rastreio', motivo: 'não é categoria de produto' })

    expect(r.data().categoriasInativadas).toHaveLength(2)
    expect(r.toText()).toContain('black-friday — urgência fabricada')
    expect(r.toText()).toContain('rastreio — não é categoria de produto')
  })

  it('nomeia cada produto pulado com o motivo (CAT-08)', () => {
    const r = createReport()
    r.skipped('produtos', {
      slug: 'pingente-figa-colecao-fragmentos', nuvemshop_id: 282225744, motivo: 'sem_preco',
    })
    expect(r.data().produtosPulados[0].slug).toBe('pingente-figa-colecao-fragmentos')
    expect(r.toText()).toContain('pingente-figa-colecao-fragmentos — sem_preco')
  })

  it('acumula os SKUs descartados e mostra o total mesmo truncando a lista', () => {
    const r = createReport()
    r.skusDiscarded(Array.from({ length: 25 }, (_, i) => ({
      sku: `BA-${i}`, product_slug: `produto-${i}`, variant_nuvemshop_id: i, motivo: 'lote' as const,
    })))

    expect(r.data().skusDescartados).toHaveLength(25)
    expect(r.toText()).toContain('SKUs descartados por duplicidade: 25')
    expect(r.toText()).toContain('e mais 5')
  })

  it('registra a curadoria preservada na re-execução (CAT-12)', () => {
    const r = createReport()
    r.showcasePreserved({
      entidade: 'categorias', slug: 'black-friday', campo: 'active', origem: 'true', loja: 'false',
    })
    expect(r.data().vitrinePreservada).toHaveLength(1)
    expect(r.toText()).toContain('categorias/black-friday.active: loja=false origem=true')
  })
})

describe('report — JSON estável para diff entre execuções (CAT-08)', () => {
  it('duas execuções equivalentes produzem exatamente o mesmo JSON', () => {
    const build = () => {
      const r = createReport()
      r.read('produtos', 2); r.created('produtos', 2)
      r.imageNew()
      r.categoryCurated({ nuvemshop_id: 1, slug: 'x', motivo: 'y' })
      return r.toJSON()
    }
    expect(build()).toBe(build())
  })

  it('ordena as chaves, para que o diff mostre só o que mudou de verdade', () => {
    const r = createReport()
    const chaves = Object.keys(JSON.parse(r.toJSON()))
    expect(chaves).toEqual([...chaves].sort())
  })

  it('o JSON carrega os contadores das três entidades', () => {
    const r = createReport()
    r.read('categorias', 39); r.created('categorias', 39)
    const parsed = JSON.parse(r.toJSON())
    expect(parsed.entidades.categorias).toEqual({ atualizados: 0, criados: 39, lidos: 39, pulados: 0 })
  })
})

describe('report — texto para o operador', () => {
  it('marca a linha que não fecha com NÃO', () => {
    const r = createReport()
    r.read('produtos', 5); r.created('produtos', 1)
    expect(r.toText()).toMatch(/produtos.*NÃO/)
  })

  it('marca com sim a linha que fecha', () => {
    const r = createReport()
    r.read('produtos', 1); r.created('produtos', 1)
    expect(r.toText()).toMatch(/produtos.*sim/)
  })
})
