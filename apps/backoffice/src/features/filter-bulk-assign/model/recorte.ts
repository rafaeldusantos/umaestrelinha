// O recorte da marcação em massa — feature 66 (`FLT-15`, `FLT-18`, `FLT-42`, `FLT-43`).
//
// Puro: recebe o catálogo e devolve a lista visível. A busca por nome é `buscarProdutos` — a régua
// do painel inteiro (feature 51), com a dobra de `dobrarTexto` e a ordem por posto —, chamada SEM
// teto: aqui a dona não escolhe uma peça, ela seleciona todas as que casam.
//
// Os recortes só FILTRAM. Nenhum deles marca nada (`FLT-43`): marcar é o botão, e o botão age sobre
// a seleção, nunca sobre o recorte.

import { buscarProdutos, type ProdutoParaMarcar } from '@/entities/product'

export type Situacao = 'todas' | 'marcadas' | 'nao-marcadas'

export interface Recorte {
  termo: string
  /** `''` ⇒ todas as categorias. */
  categoria: string
  situacao: Situacao
  /** `''` ⇒ sem recorte por tag. */
  tag: string
}

export const RECORTE_INICIAL: Recorte = { termo: '', categoria: '', situacao: 'todas', tag: '' }

export const recortar = (
  produtos: readonly ProdutoParaMarcar[],
  recorte: Recorte,
  marcadas: ReadonlySet<string>,
): ProdutoParaMarcar[] => {
  const { itens } = buscarProdutos(produtos, recorte.termo, { teto: Number.POSITIVE_INFINITY })
  return (itens as ProdutoParaMarcar[]).filter(p => {
    if (recorte.categoria !== '' && !p.category_ids.includes(recorte.categoria)) return false
    if (recorte.tag !== '' && !p.tags.includes(recorte.tag)) return false
    if (recorte.situacao === 'marcadas' && !marcadas.has(p.id)) return false
    if (recorte.situacao === 'nao-marcadas' && marcadas.has(p.id)) return false
    return true
  })
}

/** As tags do catálogo com quantas peças têm cada uma — mais usadas primeiro (`FLT-42`). */
export const tagsComContagem = (produtos: readonly ProdutoParaMarcar[]): { tag: string; total: number }[] => {
  const contagem = new Map<string, number>()
  for (const p of produtos) {
    for (const t of new Set(p.tags)) contagem.set(t, (contagem.get(t) ?? 0) + 1)
  }
  return [...contagem.entries()]
    .map(([tag, total]) => ({ tag, total }))
    .sort((a, b) => b.total - a.total || a.tag.localeCompare(b.tag, 'pt-BR'))
}

/**
 * O que cada botão faria com a seleção.
 *
 * **Marcar leva a seleção INTEIRA** (`FLT-16`): a peça que já estava marcada vai junto e é no-op no
 * banco (`on conflict do nothing`), nunca erro — e o número do botão é o número que a dona
 * selecionou. **Remover leva só as que estão marcadas**: apagar o que não existe não muda nada, e o
 * botão diria "Remover de 5" sobre peças que não têm o valor.
 */
export const dividirSelecao = (selecionadas: ReadonlySet<string>, marcadas: ReadonlySet<string>) => ({
  marcar: [...selecionadas],
  remover: [...selecionadas].filter(id => marcadas.has(id)),
})

export const produtosLabel = (n: number): string => (n === 1 ? '1 produto' : `${n} produtos`)
