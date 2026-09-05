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

  it('confere as cinco entidades de forma independente', () => {
    // Eram três até a feature 35, que acrescentou `pedidos` e `itens`. A asserção GANHOU casos:
    // continuar exigindo exatamente três esconderia um `balance` novo que não fecha.
    const r = createReport()
    r.read('categorias', 39); r.created('categorias', 39)
    r.read('produtos', 2); r.created('produtos', 1)
    r.read('variacoes', 5); r.created('variacoes', 5)
    r.read('pedidos', 35); r.created('pedidos', 35)
    r.read('itens', 59); r.created('itens', 58)

    const por = Object.fromEntries(r.balances().map(b => [b.entidade, b.confere]))
    expect(por).toEqual({
      categorias: true, produtos: false, variacoes: true, pedidos: true, itens: false,
    })
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

describe('report — fotos de variação (COR-03)', () => {
  it('conta as com foto e as sem foto separadamente', () => {
    const r = createReport()
    r.variantPhotoSet(); r.variantPhotoSet(); r.variantPhotoSet()
    r.variantPhotoMissing()

    expect(r.data().fotosDeVariacao).toEqual({ com: 3, sem: 1 })
  })

  it('mostra OS DOIS números, em linha própria — só "N com foto" não permite conferir o total', () => {
    const r = createReport()
    r.variantPhotoSet()
    r.variantPhotoMissing(); r.variantPhotoMissing()

    expect(r.toText()).toContain('variações     com foto 1 · sem foto 2')
  })
})

describe('report — listas nominais', () => {
  it('nomeia as categorias desativadas por curadoria (CAT-11)', () => {
    const r = createReport()
    r.categoryCurated({ nuvemshop_id: 35119124, slug: 'black-friday', motivo: 'urgência fabricada' })
    r.categoryCurated({ nuvemshop_id: 32697621, slug: 'rastreio', motivo: 'não é categoria de produto' })

    expect(r.data().categoriasInativadas).toHaveLength(2)
    expect(r.toText()).toContain('categorias desativadas por curadoria:')
    expect(r.toText()).toContain('black-friday — urgência fabricada')
    expect(r.toText()).toContain('rastreio — não é categoria de produto')
  })

  // 23 · T19 — desativar preserva a linha; excluir apaga. Quem lê o relatório precisa distinguir.
  it('nomeia as categorias EXCLUÍDAS por curadoria, em seção separada', () => {
    const r = createReport()
    r.categoryExcluded({ nuvemshop_id: 32697621, slug: 'rastreio', motivo: 'não é categoria de produto' })

    expect(r.data().categoriasExcluidas).toHaveLength(1)
    expect(r.toText()).toContain('categorias excluídas por curadoria:')
    expect(r.toText()).toContain('rastreio — não é categoria de produto')
  })

  it('excluída não entra na lista das desativadas, e vice-versa', () => {
    const r = createReport()
    r.categoryExcluded({ nuvemshop_id: 32697621, slug: 'rastreio', motivo: 'não é categoria' })
    r.categoryCurated({ nuvemshop_id: 35119124, slug: 'black-friday', motivo: 'urgência fabricada' })

    expect(r.data().categoriasExcluidas.map(c => c.slug)).toEqual(['rastreio'])
    expect(r.data().categoriasInativadas.map(c => c.slug)).toEqual(['black-friday'])
  })

  it('sem exclusão nenhuma, a seção não aparece no texto', () => {
    const r = createReport()
    r.categoryCurated({ nuvemshop_id: 35119124, slug: 'black-friday', motivo: 'urgência fabricada' })

    expect(r.toText()).not.toContain('categorias excluídas por curadoria:')
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

describe('report — pedidos e clientes (feature 35)', () => {
  it('a distribuição observada acumula a mesma tripla e soma o total de pedidos', () => {
    const r = createReport()
    r.read('pedidos', 3); r.created('pedidos', 3)
    r.observedTriple('Aberto | Confirmado | Entregue', 'delivered', 'approved')
    r.observedTriple('Aberto | Confirmado | Entregue', 'delivered', 'approved')
    r.observedTriple('Arquivado | Recusado | Não está embalado', 'pending', 'expired')

    const d = r.data().pedidos.distribuicao
    expect(d).toHaveLength(2)
    expect(d.find(x => x.tripla.startsWith('Aberto'))?.vezes).toBe(2)
    expect(d.reduce((a, x) => a + x.vezes, 0)).toBe(r.data().entidades.pedidos.lidos)
  })

  it('a taxa de casamento é null sem item — zero itens não é 0%', () => {
    expect(createReport().matchRate()).toBeNull()
  })

  it('item órfão é contado E nomeado', () => {
    const r = createReport()
    r.itemMatched(true, 'Casou')
    r.itemMatched(false, 'Pirâmide com cabelo')
    expect(r.matchRate()).toBe(0.5)
    expect(r.data().pedidos.itensOrfaos).toEqual([{ nome: 'Pirâmide com cabelo', sugestao: null }])
  })

  it('taxa ABAIXO do piso derruba o código de saída, mesmo com tudo fechando', () => {
    const r = createReport()
    r.read('itens', 5); r.created('itens', 5)
    r.itemMatched(true, 'a')
    for (const nome of ['b', 'c', 'd', 'e']) r.itemMatched(false, nome)
    expect(r.balances().every(b => b.confere)).toBe(true)
    expect(r.matchRate()).toBe(0.2)
    expect(r.exitCode()).toBe(1)
  })

  it('SENSOR: exatamente no piso, sai zero', () => {
    // Prova que o teste acima mede o piso, e não "qualquer órfão derruba". O piso é detector de
    // ordem errada (catálogo vazio ⇒ 0%), não alvo de qualidade: a taxa real medida é 40,7%.
    const r = createReport()
    r.read('itens', 4); r.created('itens', 4)
    r.itemMatched(true, 'a')
    for (const nome of ['b', 'c', 'd']) r.itemMatched(false, nome)
    expect(r.matchRate()).toBe(0.25)
    expect(r.exitCode()).toBe(0)
  })

  it('a sugestão por SKU acompanha o órfão, e sai marcada como NÃO aplicada', () => {
    const r = createReport()
    r.read('pedidos', 1); r.created('pedidos', 1)
    r.read('itens', 1); r.created('itens', 1)
    r.itemMatched(false, 'Corrente Veneziana de Prata 925 (45cm)', 'Corrente Singapura em Prata 925')
    expect(r.data().pedidos.itensOrfaos[0].sugestao).toBe('Corrente Singapura em Prata 925')
    expect(r.toText()).toContain('o SKU sugeriria: Corrente Singapura em Prata 925  (NÃO aplicado)')
    expect(r.toText()).toContain('confira à mão antes de ligar')
  })

  it('o texto traz a distribuição, a fila nominal e o aviso de piso', () => {
    const r = createReport()
    r.read('pedidos', 1); r.created('pedidos', 1)
    r.read('itens', 2); r.created('itens', 2)
    r.observedTriple('Aberto | Confirmado | Não está embalado', 'paid', 'approved')
    r.itemMatched(false, 'Órfão um'); r.itemMatched(false, 'Órfão dois')
    r.materialQueued({ order_number: 'NS-163', cliente: 'Fulana', criadoEm: '2026-07-13T00:00:00-03:00', itens: 6 })
    r.outOfRange(35)

    const texto = r.toText()
    expect(texto).toContain('distribuição observada do de-para (soma 1)')
    expect(texto).toContain('NS-163')
    expect(texto).toContain('ABAIXO DO PISO')
    expect(texto).toContain('fora do recorte (loja anterior) ..... 35')
  })

  it('sem pedidos lidos e sem recorte, a seção não aparece', () => {
    expect(createReport().toText()).not.toContain('pedidos e clientes')
  })

  it('o que foi sobrescrito por flag é NOMEADO, não só contado', () => {
    const r = createReport()
    r.read('pedidos', 1); r.created('pedidos', 1)
    r.stateResynced('NS-165')
    r.itemsReimported('NS-166')
    const texto = r.toText()
    expect(texto).toContain('estado operacional SOBRESCRITO pela origem (1)')
    expect(texto).toContain('NS-165')
    expect(texto).toContain('NS-166')
  })
})
