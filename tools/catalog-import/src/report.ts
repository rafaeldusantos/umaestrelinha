import type { SkuDiscard } from './map/sku.ts'

export type Entity = 'categorias' | 'produtos' | 'variacoes' | 'pedidos' | 'itens'

const ENTITIES: readonly Entity[] = ['categorias', 'produtos', 'variacoes', 'pedidos', 'itens']

export interface EntityCounts {
  lidos: number
  criados: number
  atualizados: number
  pulados: number
}

export interface SkippedProduct {
  slug: string
  nuvemshop_id: number
  motivo: string
}

export interface FailedImage {
  storageBase: string
  url: string
  motivo: string
}

export interface CuratedCategory {
  nuvemshop_id: number
  slug: string
  motivo: string
}

/** Um campo de vitrine que a origem queria mudar e a loja manteve (CAT-12). */
export interface PreservedShowcase {
  entidade: Entity
  slug: string
  campo: string
  origem: string
  loja: string
}

export interface ReportData {
  entidades: Record<Entity, EntityCounts>
  imagens: { novas: number; reusadas: number; falhadas: number }
  /**
   * Feature 26 (`COR-03`) — quantas variações receberam foto própria e quantas ficaram sem.
   *
   * **Os dois números, separados.** Só "N com foto" não permite conferir o total: a diferença entre
   * "gravou 3.245" e "gravou 12 porque o vínculo da origem não é o que se supunha" fica invisível.
   * Antes desta feature a coluna estava `null` em 3.245 de 3.245.
   */
  fotosDeVariacao: { com: number; sem: number }
  categoriasInativadas: CuratedCategory[]
  /**
   * Lista SEPARADA das desativadas de propósito: desativar preserva a linha e é reversível num
   * clique; excluir apaga. Juntar as duas num campo só faria o relatório dizer "curada" para dois
   * desfechos que exigem ações diferentes de quem lê.
   */
  categoriasExcluidas: CuratedCategory[]
  produtosPulados: SkippedProduct[]
  skusDescartados: SkuDiscard[]
  imagensFalhadas: FailedImage[]
  vitrinePreservada: PreservedShowcase[]
  /**
   * Feature 22 — quantos produtos receberam a **semente** de material afetivo, inferida do nome.
   *
   * Sai no relatório porque número que ninguém vê é número que ninguém confere: sem esta linha, a
   * diferença entre "semeou 400 produtos" e "semeou zero porque a regex quebrou" é invisível.
   */
  materialSemeado: number
  /**
   * Feature 28 — a semente das perguntas frequentes.
   *
   * **Cinco números, e não um.** "criou 3.476 vínculos" não diz se a execução fez trabalho ou se
   * pulou tudo: `produtosPulados` (já tinham curadoria) e `produtosSemBloco` (a descrição não traz
   * FAQ) são desfechos legítimos e diferentes entre si, e sem eles a segunda execução — que grava
   * zero de propósito — pareceria uma falha silenciosa.
   */
  faq: FaqSeedCounts
  /** Feature 35 — o espelho de pedidos e clientes vindo dos dois CSV. */
  pedidos: PedidosReport
  parouPorErro: string | null
}

/**
 * A **distribuição observada** do de-para — `ESP-14`.
 *
 * É a única coisa que transforma o de-para de declaração em medição. Sem ela, "importou 35 pedidos"
 * não diz se as combinações que apareceram são as que a tabela previa; com ela, a soma das triplas
 * tem de bater com o número de pedidos lidos, e qualquer combinação nova salta aos olhos.
 */
export interface DistribuicaoObservada {
  tripla: string
  vezes: number
  status: string
  paymentStatus: string
}

/** Um pedido que entrou na fila de material. Nominal, para triagem no dia do cutover. */
export interface PedidoNaFila {
  order_number: string
  cliente: string
  criadoEm: string
  itens: number
}

export interface TotalQueNaoFecha {
  order_number: string
  somaDosItens: number
  subtotal: number
}

export interface PedidosReport {
  /** Pedidos da loja anterior, descartados pelo recorte. Contados, nunca silenciados. */
  foraDoRecorte: number
  distribuicao: DistribuicaoObservada[]
  itensTotais: number
  itensCasados: number
  /**
   * Itens que não casaram com o catálogo. O snapshot deles foi preservado.
   *
   * `sugestao` é o produto que o SKU apontaria — **não aplicado**, porque a unicidade do SKU no
   * catálogo local é fabricada por `dedupeSkus`. Está aqui para a revisão à mão.
   */
  itensOrfaos: Array<{ nome: string; sugestao: string | null }>
  totaisQueNaoFecham: TotalQueNaoFecha[]
  semTelefone: number
  pedidosSemItem: number
  filaDeMaterial: PedidoNaFila[]
  clientesDerivados: number
  /** Do CSV de clientes: quem nunca comprou. Não vira linha em `customers` (`AD-023`). */
  clientesSemPedido: number
  /** `order_number` dos pedidos cujo estado operacional foi sobrescrito por `--ressincronizar-estado`. */
  estadoRessincronizado: string[]
  /** `order_number` dos pedidos cujos itens foram apagados e regravados. */
  itensReimportados: string[]
}

/**
 * O piso de casamento — `ESP-31`.
 *
 * **É um detector de ordem errada, não um alvo de qualidade.** O que ele existe para pegar é rodar a
 * fase de pedidos com o catálogo local vazio, que produz **0%** de casamento e passaria em verde sem
 * ele. Item órfão isolado é normal e esperado: metade do histórico perdeu o nome no rebranding.
 *
 * Medido contra o catálogo real: **40,7%** (24 de 59), casando só por nome. O piso fica bem abaixo
 * disso de propósito — apertá-lo até encostar na medição faria um único produto renomeado derrubar
 * o gate, e um gate que reprova por variação normal ensina a ignorá-lo.
 */
export const TAXA_MINIMA_DE_CASAMENTO = 0.25

export interface FaqSeedCounts {
  entradasCriadas: number
  vinculosCriados: number
  vinculosComRespostaPropria: number
  produtosPulados: number
  produtosSemBloco: number
  /**
   * Pares descartados por repetirem, no MESMO produto, uma pergunta que ele já tinha.
   *
   * Existe porque aconteceu: um produto do catálogo repete "As joias são realmente feitas à mão?"
   * na descrição, e a PK `(product_id, faq_id)` recusa o lote inteiro. Sem esta linha, o descarte
   * seria silencioso — e "3.475 em vez de 3.476" é exatamente o tipo de diferença que ninguém
   * investiga sem um número que a nomeie.
   */
  duplicadasNoProduto: number
}

export interface Balance {
  entidade: Entity
  lidos: number
  somados: number
  confere: boolean
}

const zero = (): EntityCounts => ({ lidos: 0, criados: 0, atualizados: 0, pulados: 0 })

/** Ordena chaves em profundidade, para que dois relatórios só difiram no que mudou de verdade. */
const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stable((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

export const createReport = () => {
  const data: ReportData = {
    entidades: {
      categorias: zero(), produtos: zero(), variacoes: zero(), pedidos: zero(), itens: zero(),
    },
    imagens: { novas: 0, reusadas: 0, falhadas: 0 },
    fotosDeVariacao: { com: 0, sem: 0 },
    categoriasInativadas: [],
    categoriasExcluidas: [],
    produtosPulados: [],
    skusDescartados: [],
    imagensFalhadas: [],
    vitrinePreservada: [],
    materialSemeado: 0,
    faq: {
      entradasCriadas: 0,
      vinculosCriados: 0,
      vinculosComRespostaPropria: 0,
      produtosPulados: 0,
      produtosSemBloco: 0,
      duplicadasNoProduto: 0,
    },
    pedidos: {
      foraDoRecorte: 0,
      distribuicao: [],
      itensTotais: 0,
      itensCasados: 0,
      itensOrfaos: [],
      totaisQueNaoFecham: [],
      semTelefone: 0,
      pedidosSemItem: 0,
      filaDeMaterial: [],
      clientesDerivados: 0,
      clientesSemPedido: 0,
      estadoRessincronizado: [],
      itensReimportados: [],
    },
    parouPorErro: null,
  }

  const p = data.pedidos

  /** `null` quando não houve item — a taxa de zero itens não é 0%, é indefinida. */
  const taxaDeCasamento = (): number | null =>
    p.itensTotais === 0 ? null : p.itensCasados / p.itensTotais

  /**
   * A conferência de `CAT-08`: tudo que foi lido tem de ter virado uma das três saídas.
   *
   * Não é zelo de contador. Um produto que a API devolveu e que não foi criado, nem atualizado, nem
   * pulado, sumiu **em silêncio** — e num lote de 690 ninguém percebe olhando. É a única checagem
   * que pega perda por exceção engolida em ramo intermediário.
   */
  const balances = (): Balance[] =>
    ENTITIES.map(entidade => {
      const c = data.entidades[entidade]
      const somados = c.criados + c.atualizados + c.pulados
      return { entidade, lidos: c.lidos, somados, confere: c.lidos === somados }
    })

  return {
    read: (entidade: Entity, n = 1) => { data.entidades[entidade].lidos += n },
    created: (entidade: Entity, n = 1) => { data.entidades[entidade].criados += n },
    updated: (entidade: Entity, n = 1) => { data.entidades[entidade].atualizados += n },

    skipped: (entidade: Entity, produto?: SkippedProduct) => {
      data.entidades[entidade].pulados += 1
      if (produto) data.produtosPulados.push(produto)
    },

    imageNew: () => { data.imagens.novas += 1 },
    imageReused: () => { data.imagens.reusadas += 1 },
    imageFailed: (falha: FailedImage) => {
      data.imagens.falhadas += 1
      data.imagensFalhadas.push(falha)
    },

    variantPhotoSet: () => { data.fotosDeVariacao.com += 1 },
    variantPhotoMissing: () => { data.fotosDeVariacao.sem += 1 },

    skusDiscarded: (discards: readonly SkuDiscard[]) => { data.skusDescartados.push(...discards) },
    categoryCurated: (categoria: CuratedCategory) => { data.categoriasInativadas.push(categoria) },
    categoryExcluded: (categoria: CuratedCategory) => { data.categoriasExcluidas.push(categoria) },
    showcasePreserved: (campo: PreservedShowcase) => { data.vitrinePreservada.push(campo) },
    materialSeeded: (n = 1) => { data.materialSemeado += n },
    faqSeeded: (counts: FaqSeedCounts) => { data.faq = { ...counts } },

    // --- Feature 35 -------------------------------------------------------------------------
    outOfRange: (n = 1) => { p.foraDoRecorte += n },

    /** Acumula a tripla observada. Mesma tripla incrementa; nova entra na lista. */
    observedTriple: (tripla: string, status: string, paymentStatus: string) => {
      const existente = p.distribuicao.find(d => d.tripla === tripla)
      if (existente) { existente.vezes += 1; return }
      p.distribuicao.push({ tripla, vezes: 1, status, paymentStatus })
    },

    itemMatched: (casou: boolean, nome: string, sugestao: string | null = null) => {
      p.itensTotais += 1
      if (casou) { p.itensCasados += 1; return }
      p.itensOrfaos.push({ nome, sugestao })
    },

    totalMismatch: (linha: TotalQueNaoFecha) => { p.totaisQueNaoFecham.push(linha) },
    orderWithoutPhone: () => { p.semTelefone += 1 },
    orderWithoutItems: () => { p.pedidosSemItem += 1 },
    materialQueued: (pedido: PedidoNaFila) => { p.filaDeMaterial.push(pedido) },
    customersDerived: (n: number) => { p.clientesDerivados = n },
    customersWithoutOrders: (n: number) => { p.clientesSemPedido = n },
    stateResynced: (orderNumber: string) => { p.estadoRessincronizado.push(orderNumber) },
    itemsReimported: (orderNumber: string) => { p.itensReimportados.push(orderNumber) },
    matchRate: taxaDeCasamento,

    /** Parada limpa (`CAT-06`): registra o motivo e garante saída diferente de zero. */
    aborted: (motivo: string) => { data.parouPorErro = motivo },

    data: (): ReportData => data,
    balances,

    /**
     * `0` só quando **tudo** fecha e nada abortou.
     *
     * Imagem falhada NÃO derruba o código de saída: `CAT-07` diz que um produto nunca é descartado
     * por causa de uma foto, e um import de 689 produtos que sai vermelho por 3 imagens perdidas
     * ensina a ignorar o código de saída — que é pior do que não tê-lo.
     *
     * A **taxa de casamento abaixo do piso**, essa sim derruba (`ESP-31`). Item órfão isolado é
     * normal — metade do histórico perdeu o nome no rebranding. Metade da lista órfã de uma vez é
     * sintoma, e o mais provável é rodar a fase com o catálogo local vazio: 100% de órfãos que
     * passariam em verde sem este piso.
     */
    exitCode: (): number => {
      const taxa = taxaDeCasamento()
      const casamentoOk = taxa === null || taxa >= TAXA_MINIMA_DE_CASAMENTO
      return data.parouPorErro === null && balances().every(b => b.confere) && casamentoOk ? 0 : 1
    },

    toJSON: (): string => JSON.stringify(stable(data), null, 2),

    toText: (): string => {
      const linhas: string[] = []
      linhas.push('RELATÓRIO DO IMPORT — Nuvemshop → Supabase', '')
      linhas.push('entidade      lidos  criados  atualizados  pulados  confere')
      for (const b of balances()) {
        const c = data.entidades[b.entidade]
        linhas.push(
          b.entidade.padEnd(13) +
          String(c.lidos).padStart(5) +
          String(c.criados).padStart(9) +
          String(c.atualizados).padStart(13) +
          String(c.pulados).padStart(9) +
          (b.confere ? '  sim' : '  NÃO'),
        )
      }
      linhas.push('')
      linhas.push(`imagens       novas ${data.imagens.novas} · reusadas ${data.imagens.reusadas} · falhadas ${data.imagens.falhadas}`)
      linhas.push(`variações     com foto ${data.fotosDeVariacao.com} · sem foto ${data.fotosDeVariacao.sem}`)
      linhas.push(`material      semeado em ${data.materialSemeado} produto(s) que ainda não tinham decisão`)
      linhas.push('')
      linhas.push('perguntas frequentes:')
      linhas.push(`  entradas criadas na biblioteca ....... ${data.faq.entradasCriadas}`)
      linhas.push(`  vínculos criados .................... ${data.faq.vinculosCriados}`)
      linhas.push(`  desses, com resposta própria ........ ${data.faq.vinculosComRespostaPropria}`)
      linhas.push(`  produtos pulados (já tinham) ........ ${data.faq.produtosPulados}`)
      linhas.push(`  produtos sem bloco na descrição ..... ${data.faq.produtosSemBloco}`)
      linhas.push(`  pares repetidos no mesmo produto .... ${data.faq.duplicadasNoProduto}`)

      if (data.categoriasInativadas.length > 0) {
        linhas.push('', 'categorias desativadas por curadoria:')
        for (const c of data.categoriasInativadas) linhas.push(`  ${c.slug} — ${c.motivo}`)
      }
      if (data.categoriasExcluidas.length > 0) {
        linhas.push('', 'categorias excluídas por curadoria:')
        for (const c of data.categoriasExcluidas) linhas.push(`  ${c.slug} — ${c.motivo}`)
      }
      if (data.produtosPulados.length > 0) {
        linhas.push('', 'produtos pulados:')
        for (const p of data.produtosPulados) linhas.push(`  ${p.slug} — ${p.motivo}`)
      }
      if (data.skusDescartados.length > 0) {
        linhas.push('', `SKUs descartados por duplicidade: ${data.skusDescartados.length}`)
        for (const s of data.skusDescartados.slice(0, 20)) {
          linhas.push(`  ${s.sku} — ${s.product_slug} (variação ${s.variant_nuvemshop_id}, ${s.motivo})`)
        }
        if (data.skusDescartados.length > 20) {
          linhas.push(`  … e mais ${data.skusDescartados.length - 20} (lista completa no JSON)`)
        }
      }
      if (data.imagensFalhadas.length > 0) {
        linhas.push('', 'imagens que falharam (o produto entrou sem elas):')
        for (const i of data.imagensFalhadas) linhas.push(`  ${i.storageBase} — ${i.motivo}`)
      }
      if (data.vitrinePreservada.length > 0) {
        linhas.push('', 'curadoria da loja preservada (origem divergiu e NÃO foi aplicada):')
        for (const v of data.vitrinePreservada) {
          linhas.push(`  ${v.entidade}/${v.slug}.${v.campo}: loja=${v.loja} origem=${v.origem}`)
        }
      }
      if (data.entidades.pedidos.lidos > 0 || p.foraDoRecorte > 0) {
        const taxa = taxaDeCasamento()
        linhas.push('', '— pedidos e clientes (feature 35) —')
        linhas.push(`  fora do recorte (loja anterior) ..... ${p.foraDoRecorte}`)
        linhas.push(`  clientes derivadas dos pedidos ...... ${p.clientesDerivados}`)
        linhas.push(`  clientes sem pedido (não gravadas) .. ${p.clientesSemPedido}`)
        linhas.push(`  pedidos sem telefone ................ ${p.semTelefone}`)
        linhas.push(`  pedidos sem item .................... ${p.pedidosSemItem}`)
        linhas.push(
          `  itens casados com o catálogo ........ ${p.itensCasados}/${p.itensTotais}` +
          (taxa === null ? '' : ` (${(taxa * 100).toFixed(1)}%${taxa < TAXA_MINIMA_DE_CASAMENTO ? ' — ABAIXO DO PISO' : ''})`),
        )

        if (p.distribuicao.length > 0) {
          const soma = p.distribuicao.reduce((a, d) => a + d.vezes, 0)
          linhas.push('', `  distribuição observada do de-para (soma ${soma}):`)
          for (const d of [...p.distribuicao].sort((a, b) => b.vezes - a.vezes)) {
            linhas.push(`    ${String(d.vezes).padStart(3)}×  ${d.tripla.padEnd(46)} → status=${d.status} payment=${d.paymentStatus}`)
          }
        }

        if (p.filaDeMaterial.length > 0) {
          linhas.push('', `  entraram na fila de material (${p.filaDeMaterial.length}) — triagem no cutover:`)
          for (const f of p.filaDeMaterial) {
            linhas.push(`    ${f.order_number} · ${f.criadoEm.slice(0, 10)} · ${f.itens} item(ns) · ${f.cliente}`)
          }
        }

        if (p.itensOrfaos.length > 0) {
          const comSugestao = p.itensOrfaos.filter(o => o.sugestao !== null).length
          linhas.push('', `  itens sem produto no catálogo (${p.itensOrfaos.length}) — snapshot preservado:`)
          for (const o of p.itensOrfaos.slice(0, 20)) {
            linhas.push(`    ${o.nome}`)
            // A sugestão é do SKU, e o SKU não identifica nesta loja (dedupeSkus fabrica a
            // unicidade). Sai como "talvez", para revisão à mão — nunca como vínculo gravado.
            if (o.sugestao !== null) linhas.push(`      ↳ o SKU sugeriria: ${o.sugestao}  (NÃO aplicado)`)
          }
          if (p.itensOrfaos.length > 20) {
            linhas.push(`    … e mais ${p.itensOrfaos.length - 20} (lista completa no JSON)`)
          }
          if (comSugestao > 0) {
            linhas.push(`    ${comSugestao} órfão(s) têm sugestão por SKU — confira à mão antes de ligar.`)
          }
        }

        if (p.totaisQueNaoFecham.length > 0) {
          linhas.push('', '  totais que NÃO fecham com a soma dos itens:')
          for (const t of p.totaisQueNaoFecham) {
            linhas.push(`    ${t.order_number}: itens=${t.somaDosItens.toFixed(2)} subtotal=${t.subtotal.toFixed(2)}`)
          }
        }

        if (p.estadoRessincronizado.length > 0) {
          linhas.push('', `  estado operacional SOBRESCRITO pela origem (${p.estadoRessincronizado.length}):`)
          linhas.push(`    ${p.estadoRessincronizado.join(', ')}`)
        }
        if (p.itensReimportados.length > 0) {
          linhas.push('', `  itens apagados e regravados (${p.itensReimportados.length}):`)
          linhas.push(`    ${p.itensReimportados.join(', ')}`)
        }
      }

      if (data.parouPorErro !== null) {
        linhas.push('', `PAROU: ${data.parouPorErro}`)
      }
      return linhas.join('\n')
    },
  }
}

export type Report = ReturnType<typeof createReport>
