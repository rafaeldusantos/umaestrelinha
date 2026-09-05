/**
 * Casar o item do CSV com o catálogo local — e **recusar** casar quando a evidência é ambígua.
 *
 * O arquivo de vendas **não tem `product_id`**. Traz `Nome do Produto` (com a variação entre
 * parênteses, às vezes aninhados) e `SKU`. Medido contra os 35 pedidos e 59 itens reais, com o
 * catálogo de 691 produtos importado no banco local:
 *
 * | como casou | itens | % |
 * | --- | --: | --: |
 * | nome completo, exato | 7 | 11,9% |
 * | nome sem o grupo de parênteses final | 17 | 28,8% |
 * | **órfão** — produto renomeado no rebranding, ou fora do catálogo | 35 | 59,3% |
 *
 * **O SKU não entra**, e o porquê está em `matchItem`. O item órfão preserva nome, preço e
 * quantidade — o snapshot está certo dos dois jeitos, e é ele que a tela mostra. O vínculo é
 * conveniência; vínculo **errado** é dado sujo permanente.
 *
 * A taxa não é uniforme, e é isso que salva a feature: **os 4 pedidos que entram na fila de material
 * casam 100%**. Pedido velho carrega nome velho; trabalho em aberto carrega nome de hoje.
 */

// ---------------------------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------------------------

/**
 * Tira acento e caixa, colapsa espaço. **Não tira pontuação**, de propósito: hífen e parêntese
 * distinguem produtos de verdade no catálogo (`Corrente Veneziana em Aço Inoxidável` vs.
 * `Corrente Veneziana de Prata 925 (45cm)`), e apagá-los criaria colisão onde não há.
 *
 * O corte do acento é `\p{Diacritic}` e **não** uma faixa literal de combinantes — uma faixa escrita
 * com os caracteres crus fica invisível no editor e some numa normalização de arquivo, sem quebrar
 * nada visível: a função simplesmente pararia de tirar acento. Mesmo raciocínio de
 * `normalizeText` em `@estrelinha/core/material`.
 */
export const normalizar = (valor: string): string =>
  (valor ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Remove o último grupo de parênteses **balanceado** do fim do nome.
 *
 * O recorte ingênuo — cortar no primeiro `(` — erra em `(Folheado a ouro (Prata 925))`, que é o
 * arranjo mais comum do catálogo. Medido: a taxa de casamento cai de **50,8% para 40,7%**.
 *
 * Devolve `null` quando não há grupo no fim, para o chamador distinguir "não tinha variação" de
 * "tinha e foi removida".
 */
export const stripVariant = (nome: string): string | null => {
  const s = (nome ?? '').trimEnd()
  if (!s.endsWith(')')) return null

  let profundidade = 0
  for (let i = s.length - 1; i >= 0; i -= 1) {
    if (s[i] === ')') profundidade += 1
    else if (s[i] === '(') {
      profundidade -= 1
      if (profundidade === 0) return s.slice(0, i).trimEnd()
    }
  }
  return null
}

/** O conteúdo do grupo final, ou `null`. É o que carrega os valores da variação. */
export const variantPart = (nome: string): string | null => {
  const base = stripVariant(nome)
  if (base === null) return null
  return nome.trimEnd().slice(base.length).trim().replace(/^\(|\)$/g, '').trim()
}

/**
 * Separa os valores da variação por vírgula **de nível zero**.
 *
 * `(2 cm, Não, Sem Corrente)` são três valores; `(Folheado a ouro (Prata 925))` é **um**. Split
 * ingênuo por `,` daria o mesmo resultado nestes dois, mas quebraria no dia em que um valor tiver
 * vírgula dentro de parêntese — e o catálogo real já tem valor com parêntese dentro.
 */
export const splitVariantValues = (parte: string): string[] => {
  const out: string[] = []
  let atual = ''
  let profundidade = 0
  for (const c of parte) {
    if (c === '(') profundidade += 1
    if (c === ')') profundidade -= 1
    if (c === ',' && profundidade === 0) { out.push(atual.trim()); atual = ''; continue }
    atual += c
  }
  if (atual.trim() !== '') out.push(atual.trim())
  return out.filter(v => v !== '')
}

/** Chave de variação: valores normalizados e **ordenados**, para não depender da ordem dos eixos. */
export const variantKey = (valores: readonly string[]): string =>
  valores.map(normalizar).sort().join('|')

// ---------------------------------------------------------------------------------------------
// O índice
// ---------------------------------------------------------------------------------------------

export interface ProdutoLocal {
  id: string
  name: string
  nuvemshop_id: number | null
  requires_material: boolean | null
  material_kinds: unknown
}

export interface VariacaoLocal {
  id: string
  product_id: string
  sku: string | null
  option_values: Record<string, string> | null
}

export interface CatalogIndex {
  porNome: Map<string, ProdutoLocal>
  /** SKU → produtos que o usam. Tamanho > 1 é o que torna o SKU inútil como chave. */
  porSku: Map<string, Set<string>>
  variacaoPorSku: Map<string, VariacaoLocal>
  /** `${product_id}::${variantKey}` → variação. */
  porProdutoEValores: Map<string, VariacaoLocal>
  produtoPorId: Map<string, ProdutoLocal>
}

export const buildIndex = (
  produtos: readonly ProdutoLocal[],
  variacoes: readonly VariacaoLocal[],
): CatalogIndex => {
  const porNome = new Map<string, ProdutoLocal>()
  const produtoPorId = new Map<string, ProdutoLocal>()
  for (const p of produtos) {
    porNome.set(normalizar(p.name), p)
    produtoPorId.set(p.id, p)
  }

  const porSku = new Map<string, Set<string>>()
  const variacaoPorSku = new Map<string, VariacaoLocal>()
  const porProdutoEValores = new Map<string, VariacaoLocal>()

  for (const v of variacoes) {
    const sku = (v.sku ?? '').trim()
    if (sku !== '') {
      if (!porSku.has(sku)) porSku.set(sku, new Set())
      porSku.get(sku)?.add(v.product_id)
      variacaoPorSku.set(sku, v)
    }
    const valores = Object.values(v.option_values ?? {})
    if (valores.length > 0) {
      porProdutoEValores.set(`${v.product_id}::${variantKey(valores)}`, v)
    }
  }

  return { porNome, porSku, variacaoPorSku, porProdutoEValores, produtoPorId }
}

// ---------------------------------------------------------------------------------------------
// O casamento
// ---------------------------------------------------------------------------------------------

export type MatchKind = 'nome' | 'nome-base'

export interface Match {
  kind: MatchKind
  produto: ProdutoLocal
  variacao: VariacaoLocal | null
}

/** O `product_id` de item que não casou. `text` e `not null` no banco — precisa de algum valor. */
export const orphanProductId = (nome: string): string => `nuvemshop:${normalizar(nome)}`

/**
 * O casamento é **por nome, e só por nome**.
 *
 * 1. nome completo, exato — o item cujo nome no pedido é o nome do produto hoje;
 * 2. nome sem o grupo final balanceado — o caso comum, em que o parêntese é a variação.
 *
 * ## Por que o SKU ficou de fora — medido, não suposto
 *
 * A primeira versão tinha um terceiro passo: "SKU que aponta para um único produto no catálogo
 * local". Ele subia a taxa de 40,7% para **74,6%**, e estava **errado**, por dois motivos que só
 * apareceram rodando contra o banco de verdade:
 *
 * 1. **A unicidade local é FABRICADA.** `dedupeSkus` (feature 21) nulifica o SKU de todas as
 *    variações menos a primeira, porque `product_variants.sku` é `UNIQUE` global. `BA-002` aparece
 *    **316 vezes em 68 produtos** na origem e sobrevive numa variação **arbitrária** — a que a
 *    paginação da API entregou primeiro. Perguntar ao catálogo local "este SKU é único?" devolve
 *    `sim` para um código que não identifica nada.
 * 2. **A feature 21 já tinha medido isto**: *"nesta loja o SKU é um código de material, não um
 *    identificador de linha vendável"* — 1.466 duplicados entre 2.405 preenchidos.
 *
 * O estrago foi medido nos 35 pedidos reais: dos 20 vínculos que só o SKU produzia, **pelo menos um
 * é claramente errado** — `NS-162` ligava "Corrente **Veneziana** de Prata 925 (45cm)" a "Corrente
 * **Singapura** em Prata 925". São correntes diferentes, e nada quebraria.
 *
 * O que se perde é real: pedido antigo cujo produto foi renomeado no rebranding fica sem vínculo.
 * O que se ganha é que **nenhum item aponta para o produto errado**. O snapshot — nome, preço,
 * quantidade — está certo dos dois jeitos, e é ele que a tela mostra. `suggestBySku` devolve o
 * candidato para o RELATÓRIO, sem gravá-lo: a informação não se perde, só não vira dado.
 */
export const matchItem = (nome: string, index: CatalogIndex): Match | null => {
  const exato = index.porNome.get(normalizar(nome))
  if (exato) return { kind: 'nome', produto: exato, variacao: resolverVariacao(exato, nome, index) }

  const base = stripVariant(nome)
  if (base !== null) {
    const porBase = index.porNome.get(normalizar(base))
    if (porBase) {
      return { kind: 'nome-base', produto: porBase, variacao: resolverVariacao(porBase, nome, index) }
    }
  }

  return null
}

/**
 * O produto que o SKU **sugeriria**, para o relatório — nunca para o banco.
 *
 * Existe para que a perda de vínculo seja visível e revisável: quem ler o relatório vê "este item
 * órfão talvez seja aquele produto" e decide à mão. Gravar a sugestão seria exatamente o vínculo
 * fabricado que `matchItem` recusa.
 */
export const suggestBySku = (sku: string | null, index: CatalogIndex): ProdutoLocal | null => {
  const codigo = (sku ?? '').trim()
  if (codigo === '') return null
  const produtos = index.porSku.get(codigo)
  if (!produtos || produtos.size !== 1) return null
  const [produtoId] = [...produtos]
  return index.produtoPorId.get(produtoId) ?? null
}

/**
 * A variação, quando os valores do parêntese casam com um `option_values` daquele produto.
 *
 * Não casar a variação **não** impede o item de casar o produto: são duas perguntas, e a segunda
 * falha muito mais (eixo renomeado, valor reescrito). `variant_id` fica nulo e o snapshot segue.
 */
const resolverVariacao = (
  produto: ProdutoLocal,
  nome: string,
  index: CatalogIndex,
): VariacaoLocal | null => {
  const parte = variantPart(nome)
  if (parte === null) return null
  const valores = splitVariantValues(parte)
  if (valores.length === 0) return null
  return index.porProdutoEValores.get(`${produto.id}::${variantKey(valores)}`) ?? null
}
