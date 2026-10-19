// A fila de sugestões — feature 67 (`VFL-18`, `VFL-19`, `VFL-22`, `VFL-25`, `VFL-26`).
//
// Puro. A regra de "o que sugerir" NÃO mora aqui: é `suggestMarks` + `groupSuggestions`, de
// `@estrelinha/core/filters` — a mesma função que o bloco do formulário do produto chama (`VFL-31`).
// Esta peça só traduz o que a regra devolve para o que a tela mostra: o rótulo "Grupo › Valor", o
// título do motivo, as colunas de cada peça ("26 de 144", "Hoje"), os recortes e a contagem.
//
// Os recortes só FILTRAM a lista de motivos (`VFL-25`): grupo de filtro, fonte e a busca pelo texto
// do motivo. A busca usa a dobra da `51` (`dobrarTexto`) — "rose" acha "Rosé", "CHAVEIRO" acha
// "Chaveiro" — sobre o motivo E o valor sugerido, porque é por um dos dois que a Adri procura.

import {
  groupSuggestions,
  suggestMarks,
  type FilterCatalog,
  type Suggestion,
  type SuggestionDismissal,
  type SuggestionGroup,
  type SuggestionSource,
} from '@estrelinha/core/filters'
import type { AdminFilterGroup } from '@/entities/filter'
import type { ProdutoParaMarcar } from '@/entities/product'
import { dobrarTexto } from '@/shared/lib/texto'

export type FonteDaFila = 'todas' | SuggestionSource

export interface RecorteDaFila {
  /** `''` ⇒ todos os grupos de filtro. */
  grupo: string
  fonte: FonteDaFila
  termo: string
  /** `''` ⇒ todos os valores. O atalho da marcação em massa abre a fila recortada por um (`VFL-33`). */
  valor: string
}

export const RECORTE_DA_FILA_INICIAL: RecorteDaFila = { grupo: '', fonte: 'todas', termo: '', valor: '' }

/** O catálogo do painel na forma que a regra de `core` lê. */
export const catalogoDaRegra = (groups: readonly AdminFilterGroup[]): FilterCatalog => ({
  groups: groups.map(g => ({ id: g.id, name: g.name, slug: g.slug, is_active: g.is_active, sort_order: g.sort_order })),
  values: groups.flatMap(g =>
    g.values.map(v => ({
      id: v.id,
      group_id: v.group_id,
      name: v.name,
      slug: v.slug,
      sort_order: v.sort_order,
      suggest_terms: v.suggest_terms ?? [],
    })),
  ),
})

export interface ValorDaFila {
  id: string
  nome: string
  grupoId: string
  grupoNome: string
}

export const valoresPorId = (groups: readonly AdminFilterGroup[]): Map<string, ValorDaFila> => {
  const m = new Map<string, ValorDaFila>()
  for (const g of groups) for (const v of g.values) m.set(v.id, { id: v.id, nome: v.name, grupoId: g.id, grupoNome: g.name })
  return m
}

/** As sugestões pendentes agrupadas por motivo — as duas chamadas de `core`, nada mais. */
export const montarFila = (
  groups: readonly AdminFilterGroup[],
  produtos: readonly ProdutoParaMarcar[],
  recusas: readonly SuggestionDismissal[],
): SuggestionGroup[] =>
  groups.length === 0
    ? []
    : groupSuggestions(suggestMarks({ catalog: catalogoDaRegra(groups), products: produtos, dismissals: recusas }))

export const recortarFila = (
  fila: readonly SuggestionGroup[],
  recorte: RecorteDaFila,
  valores: ReadonlyMap<string, ValorDaFila>,
): SuggestionGroup[] => {
  const termo = dobrarTexto(recorte.termo.trim())
  return fila.filter(g => {
    const v = valores.get(g.value_id)
    if (recorte.valor !== '' && g.value_id !== recorte.valor) return false
    if (recorte.grupo !== '' && v?.grupoId !== recorte.grupo) return false
    if (recorte.fonte !== 'todas' && g.source !== recorte.fonte) return false
    if (termo !== '' && !dobrarTexto(`${g.reason} ${v?.nome ?? ''}`).includes(termo)) return false
    return true
  })
}

/** Quantas sugestões pendentes há — é o "N pendentes" e o "Sugestões (N)" de `/admin/filtros`. */
export const totalPendente = (fila: readonly SuggestionGroup[]): number =>
  fila.reduce((soma, g) => soma + g.suggestions.length, 0)

export const pecasLabel = (n: number): string => (n === 1 ? '1 peça' : `${n} peças`)

export const rotuloDoValor = (v: ValorDaFila | undefined): string => (v ? `${v.grupoNome} › ${v.nome}` : 'Valor apagado')

/** O alvo, como a linha da lista o diz: "nesta opção" ou "peça toda". */
export const alvoLabel = (g: Pick<SuggestionGroup, 'target'>): string => (g.target === 'option' ? 'nesta opção' : 'peça toda')

/** O título do motivo aberto: `Cor = “Prata 925” ⇒ Acabamento › Prata 925`. */
export const tituloDoMotivo = (g: SuggestionGroup, v: ValorDaFila | undefined): string =>
  g.source === 'option'
    ? `${g.option_name} = “${g.evidence}” ⇒ ${rotuloDoValor(v)}`
    : `${g.reason} ⇒ ${rotuloDoValor(v)}`

export const FONTE_LABEL: Record<SuggestionSource, string> = {
  option: 'Opção da peça',
  name: 'Nome da peça',
  tag: 'Tag da peça',
}

/** Quantas trocam a marcação da peça toda (`VFL-27`). */
export const quantasTrocam = (g: SuggestionGroup, selecionadas?: ReadonlySet<string>): number =>
  g.suggestions.filter(s => s.replacesWholeMark && (!selecionadas || selecionadas.has(s.product_id))).length

export interface LinhaDaPeca {
  produto: ProdutoParaMarcar
  sugestao: Suggestion
  /** Variações ATIVAS que carregam a opção (só para o alvo opção). */
  casam: number
  /** Variações ativas da peça. */
  ativas: number
  /** Os outros textos do mesmo eixo, vendidos pela peça — "Cor também: Folheado a Ouro, Ródio". */
  tambem: string[]
  hoje: 'sem' | 'troca' | 'por-opcao'
}

export const linhasDoMotivo = (g: SuggestionGroup, produtos: ReadonlyMap<string, ProdutoParaMarcar>): LinhaDaPeca[] =>
  g.suggestions
    .map(s => {
      const produto = produtos.get(s.product_id)
      if (!produto) return null
      const ativas = produto.variants.filter(v => v.is_active)
      const casam =
        g.target === 'option' ? ativas.filter(v => v.option_values[s.option_name] === s.option_value).length : ativas.length
      const tambem =
        g.target === 'option'
          ? [
              ...new Set(
                ativas.map(v => v.option_values[s.option_name]).filter(t => typeof t === 'string' && t !== s.option_value),
              ),
            ]
          : []
      const porOpcao = produto.option_marks.some(m => m.value_id === s.value_id)
      const hoje: LinhaDaPeca['hoje'] = s.replacesWholeMark ? 'troca' : porOpcao ? 'por-opcao' : 'sem'
      return { produto, sugestao: s, casam, ativas: ativas.length, tambem, hoje }
    })
    .filter((l): l is LinhaDaPeca => l !== null)

export const variacoesLabel = (n: number): string => (n === 1 ? '1 variação' : `${n} variações`)
