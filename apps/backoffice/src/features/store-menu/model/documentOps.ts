// Feature 86 — as operações da tela do menu sobre o documento da dona (`AD-068`).
//
// Puras: recebem um `MenuDocument` e devolvem outro. Nenhuma toca rede, e **nenhuma toca categoria**
// — reordenar o menu não muda a `sort_order` da árvore (`MNM-18`), que também ordena a Home, o rodapé
// e a lista de categorias. Quem grava é `useStoreMenu`, uma linha de `store_settings` por vez.
//
// **Moram no painel, e não em `core`**, porque têm um consumidor só (a tela `/admin/menu`). O que dois
// consumidores leem — a forma, a leitura tolerante, a porta e as recusas — está em
// `@estrelinha/core/menu`.
//
// Contrato de identidade:
// - **Toda op que muda devolve um documento NOVO** (e listas novas no caminho até o nó mudado): o
//   React e o `useStoreMenu` comparam por referência.
// - **Op que não muda nada devolve o MESMO documento** (mover na ponta, nó inexistente, valor igual).
//   É o que deixa `apply` pular a rede quando não há o que gravar.

import {
  bySortOrder,
  MENU_SUBMENU_LIMIT,
  type MenuBanners,
  type MenuCategory,
  type MenuDocument,
  type MenuNode,
  type MenuNodeTarget,
  type MenuRootNode,
  type MenuSurface,
} from '@estrelinha/core/menu'

/** Gerador de id de nó. Injetável no teste; em produção, `crypto.randomUUID`. */
export type GerarId = () => string

const gerarIdPadrao: GerarId = () => crypto.randomUUID()

/** O que o seletor entrega ao acrescentar um item. Link sempre leva rótulo; categoria, não. */
export interface NovoNo {
  target: MenuNodeTarget
  /** `null`/ausente = o nome da categoria (`MNM-15`). Para link, o nome digitado. */
  label?: string | null
}

const rotuloInicial = (novo: NovoNo): string | null =>
  novo.target.kind === 'link'
    ? typeof novo.label === 'string'
      ? novo.label.trim()
      : ''
    : typeof novo.label === 'string' && novo.label.trim() !== ''
      ? novo.label.trim()
      : null

const noNovo = (novo: NovoNo, gerarId: GerarId): MenuNode => ({
  id: gerarId(),
  target: novo.target,
  label: rotuloInicial(novo),
  // `MNM-08`: entra nos dois dispositivos.
  desktop: true,
  mobile: true,
})

/**
 * Acrescenta um item ao menu principal, **no fim**, sem ícone, nos dois dispositivos (`MNM-08`).
 *
 * Categoria com filhas **ativas** leva as filhas como submenu, na ordem da árvore (`bySortOrder`) —
 * `MNM-09`. Filha inativa não entra (ela não apareceria na loja, e a dona veria um submenu que não
 * existe). Com mais de 24 filhas ativas entram as **24 primeiras** da árvore (`MNM-09` × `MNM-24`,
 * revisto em 2026-10-28): o submenu nasce no teto, e o aviso de quantas ficaram de fora é da tela.
 */
export const addRootNode = (
  doc: MenuDocument,
  novo: NovoNo,
  categories: readonly MenuCategory[],
  gerarId: GerarId = gerarIdPadrao,
): MenuDocument => {
  const base = noNovo(novo, gerarId)
  const filhas =
    novo.target.kind === 'category'
      ? (categories ?? [])
          .filter(
            c =>
              c &&
              c.active &&
              c.parent_id === (novo.target as { category_id: string }).category_id,
          )
          .sort(bySortOrder)
          .slice(0, MENU_SUBMENU_LIMIT)
      : []

  const raiz: MenuRootNode = {
    ...base,
    icon: null,
    banners: null,
    children: filhas.map(f =>
      noNovo({ target: { kind: 'category', category_id: f.id } }, gerarId),
    ),
  }
  return { ...doc, items: [...doc.items, raiz] }
}

/** Acrescenta um item ao submenu de `parentId`, no fim. Pai inexistente ⇒ o mesmo documento. */
export const addChildNode = (
  doc: MenuDocument,
  parentId: string,
  novo: NovoNo,
  gerarId: GerarId = gerarIdPadrao,
): MenuDocument => {
  if (!doc.items.some(i => i.id === parentId)) return doc
  const filho = noNovo(novo, gerarId)
  return {
    ...doc,
    items: doc.items.map(i => (i.id === parentId ? { ...i, children: [...i.children, filho] } : i)),
  }
}

const mover = <T>(lista: readonly T[], de: number, para: number): T[] | null => {
  if (de === para) return null
  if (de < 0 || de >= lista.length || para < 0 || para >= lista.length) return null
  const proxima = [...lista]
  const [item] = proxima.splice(de, 1)
  proxima.splice(para, 0, item)
  return proxima
}

/**
 * Move um item dentro da lista dele: o menu principal (`parentId = null`) ou o submenu de um item.
 * Nas pontas (para cima do primeiro, para baixo do último) e fora da faixa é no-op (`MNM-19`).
 */
export const moveNode = (
  doc: MenuDocument,
  parentId: string | null,
  from: number,
  to: number,
): MenuDocument => {
  if (parentId === null) {
    const items = mover(doc.items, from, to)
    return items ? { ...doc, items } : doc
  }
  const pai = doc.items.find(i => i.id === parentId)
  if (!pai) return doc
  const children = mover(pai.children, from, to)
  if (!children) return doc
  return { ...doc, items: doc.items.map(i => (i.id === parentId ? { ...i, children } : i)) }
}

/**
 * Tira um nó do menu. Item principal sai **com o submenu inteiro** (`MNM-20`); a confirmação que diz
 * quantos saem junto é da tela. Nó inexistente ⇒ o mesmo documento.
 */
export const removeNode = (doc: MenuDocument, nodeId: string): MenuDocument => {
  if (doc.items.some(i => i.id === nodeId)) {
    return { ...doc, items: doc.items.filter(i => i.id !== nodeId) }
  }
  let mudou = false
  const items = doc.items.map(i => {
    if (!i.children.some(c => c.id === nodeId)) return i
    mudou = true
    return { ...i, children: i.children.filter(c => c.id !== nodeId) }
  })
  return mudou ? { ...doc, items } : doc
}

/**
 * O que a tela edita num nó. `icon` e `banners` só existem no menu principal: num item de submenu
 * eles são ignorados (`MNM-26` — submenu não tem ícone).
 */
export interface MenuNodePatch {
  label?: string | null
  target?: MenuNodeTarget
  icon?: string | null
  banners?: MenuBanners | null
}

const aplicar = <T extends MenuNode>(no: T, patch: Partial<T>): T => {
  const chaves = Object.keys(patch) as (keyof T)[]
  if (chaves.every(k => no[k] === patch[k])) return no
  return { ...no, ...patch }
}

/** Edita um nó (nome, destino, ícone, banners). Nada muda ⇒ o mesmo documento. */
export const updateNode = (doc: MenuDocument, nodeId: string, patch: MenuNodePatch): MenuDocument => {
  const daRaiz: Partial<MenuRootNode> = {}
  const doFilho: Partial<MenuNode> = {}
  for (const chave of ['label', 'target'] as const) {
    if (chave in patch) {
      ;(daRaiz as Record<string, unknown>)[chave] = patch[chave]
      ;(doFilho as Record<string, unknown>)[chave] = patch[chave]
    }
  }
  for (const chave of ['icon', 'banners'] as const) {
    if (chave in patch) (daRaiz as Record<string, unknown>)[chave] = patch[chave]
  }

  let mudou = false
  const items = doc.items.map(i => {
    if (i.id === nodeId) {
      const proximo = aplicar(i, daRaiz)
      if (proximo !== i) mudou = true
      return proximo
    }
    if (!i.children.some(c => c.id === nodeId)) return i
    const children = i.children.map(c => (c.id === nodeId ? aplicar(c, doFilho) : c))
    if (children.every((c, k) => c === i.children[k])) return i
    mudou = true
    return { ...i, children }
  })
  return mudou ? { ...doc, items } : doc
}

/**
 * Liga ou desliga um nó num dispositivo. Só a chave daquela superfície muda: ligar no computador não
 * liga no celular (`MNM-28`, `MNM-29`). Desligar o item principal não apaga o submenu — ele volta
 * inteiro ao religar.
 */
export const toggleSurface = (
  doc: MenuDocument,
  nodeId: string,
  surface: MenuSurface,
  next: boolean,
): MenuDocument => {
  let mudou = false
  const items = doc.items.map(i => {
    if (i.id === nodeId) {
      if (i[surface] === next) return i
      mudou = true
      return { ...i, [surface]: next }
    }
    if (!i.children.some(c => c.id === nodeId)) return i
    const children = i.children.map(c => {
      if (c.id !== nodeId || c[surface] === next) return c
      mudou = true
      return { ...c, [surface]: next }
    })
    return children.every((c, k) => c === i.children[k]) ? i : { ...i, children }
  })
  return mudou ? { ...doc, items } : doc
}
