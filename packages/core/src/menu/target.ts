// Feature 39 — o destino de um item do menu, com **um** dono.
//
// Duas coisas do menu apontam para algum lugar: o item de link e o banner do painel. Cada uma
// nasceu numa tela diferente, e é exatamente a forma do "defeito 01" que este repositório já pagou
// sete vezes: dois validadores divergem, um aceita o que o outro recusa, e a diferença só aparece
// quando a cliente clica. `NAV-31` escreve isso como AC — "o destino digitado usa a mesma validação
// do item de link" —, e a resposta é este arquivo.
//
// São **duas** portas, e a diferença entre elas é o momento:
//
// - `menuTargetRefusal` julga a FORMA, na gravação. Não conhece o catálogo, e não precisa: recusar
//   `/sobree` é sobre rota declarada, não sobre dado.
// - `resolveMenuTarget` resolve na LEITURA, contra o catálogo que chegou. A referência mora dentro
//   de jsonb, onde não cabe FK — apagar a categoria de destino não dispara `on delete set null` —,
//   então destino pendurado é estado alcançável do banco e a única resposta possível é validar na
//   hora de desenhar. É a regra que `resolvePromo` já tinha (`MENU-26`), estendida aos destinos
//   novos: o que não resolve **não renderiza**, porque card levando a 404 é pior que card nenhum.

import { ROUTE_SLUGS, productPath } from '../routes/index.ts'
import {
  categoryHref,
  menuHrefIsExternal,
  normalizeMenuHref,
  type MenuCategory,
} from './menu.ts'

/**
 * Os três destinos que a dona pode escolher.
 *
 * Discriminado por literal de **string**: com `strictNullChecks: false` a união por literal booleano
 * não estreita, e `kind` estreita.
 */
export type MenuTarget =
  | { kind: 'category'; id: string }
  | { kind: 'product'; id: string }
  | { kind: 'url'; href: string }

/**
 * A forma **mínima** de produto que este módulo precisa.
 *
 * `is_active` é opcional porque a loja nem sempre o carrega: a consulta pública já filtra
 * `is_active = true`, então **estar na lista** é a prova de que o produto existe e está publicado.
 * O painel, que lista inativo junto, manda a coluna e aí ela decide. Ausente lê como ativo; `false`
 * explícito derruba o destino.
 */
export interface MenuProduct {
  id: string
  name: string
  slug: string
  description?: string | null
  is_active?: boolean
}

/** O catálogo contra o qual um destino é resolvido. */
export interface MenuTargetContext {
  categories: readonly MenuCategory[]
  /**
   * Ausente é diferente de vazia. Destino de produto só é resolvível com esta lista na mão, e ela é
   * montada **tarde** — quando o painel abre —, porque a loja não carrega o catálogo para desenhar o
   * topo. Sem ela o destino não é provado, e o que não é provado não renderiza.
   */
  products?: readonly MenuProduct[]
}

/** Um destino resolvido: pronto para virar `href` numa tela, com o texto que ele empresta. */
export interface ResolvedMenuTarget {
  href: string
  /** Sai com `target="_blank"` e `rel="noopener noreferrer"` (`NAV-11`). */
  external: boolean
  /** O nome do destino, que o banner sem título herda (`NAV-32`). `null` para endereço digitado. */
  name: string | null
  /** A descrição do destino, que o banner sem texto herda. */
  description: string | null
}

const texto = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null

const parse = (raw: unknown): MenuTarget | null => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const alvo = raw as Partial<MenuTarget> & { id?: unknown; href?: unknown }

  if (alvo.kind === 'category' || alvo.kind === 'product') {
    const id = texto(alvo.id)
    return id ? ({ kind: alvo.kind, id } as MenuTarget) : null
  }
  if (alvo.kind === 'url') {
    const href = texto(alvo.href)
    return href ? { kind: 'url', href } : null
  }
  return null
}

/** Os endereços internos que um destino digitado pode ter, escritos como a dona os vê. */
const ROTAS_ACEITAS = ['/', ...ROUTE_SLUGS.map(slug => `/${slug}`)]

/**
 * Por que este destino **não pode ser gravado** — ou `null` quando pode.
 *
 * **`string | null`, e não `{ ok, reason }`**: `tsconfig.base.json` tem `strictNullChecks: false`, e
 * nesse modo união discriminada por literal booleano não estreita — ler `verdict.reason` no ramo do
 * `else` é TS2339. Mesmo formato de `reservedSlugRefusal` e do antigo `menuSlotRefusal`.
 *
 * Julga a **forma**, nunca a existência: se a categoria escolhida ainda existe é pergunta da
 * leitura, e respondê-la aqui exigiria o catálogo na mão do formulário — além de dar duas respostas
 * para a mesma pergunta em dois momentos.
 *
 * A régua do endereço interno é o **primeiro segmento** contra `ROUTE_SLUGS`, a mesma lista que o
 * roteador da loja e o `vercel.json` leem. Ela não alcança o segundo segmento: `/produtos/xyz` passa
 * mesmo com o produto inexistente. É limitação **declarada** (para levar a uma peça, escolha o
 * destino pelo nome), não dívida escondida — e é por isso que a mensagem termina dizendo isso.
 */
export const menuTargetRefusal = (target: unknown): string | null => {
  const alvo = parse(target)
  if (!alvo) return 'Escolha um destino para este item do menu.'

  if (alvo.kind === 'category' || alvo.kind === 'product') {
    // `parse` já recusou id vazio; o que sobra aqui é destino bem-formado.
    return null
  }

  const bruto = alvo.href.trim()

  if (/^http:\/\//i.test(bruto)) {
    return (
      'Endereço de fora da loja precisa começar com “https://”. ' +
      '“http://” trafega sem criptografia, e o navegador da cliente avisa isso na barra.'
    )
  }

  if (menuHrefIsExternal(bruto)) {
    const dominio = bruto.replace(/^https:\/\//i, '').split('/')[0]
    return dominio.trim() === '' ? 'Falta o endereço depois de “https://”.' : null
  }

  const href = normalizeMenuHref(bruto)
  if (href === '') return 'Digite o endereço de destino.'
  if (href === '/') return null

  const primeiro = href.split('/')[1]?.toLowerCase() ?? ''
  if (ROUTE_SLUGS.includes(primeiro)) return null

  return (
    `“${href}” não é um endereço da loja, e o item levaria a uma página que não existe. ` +
    `Endereços aceitos: ${ROTAS_ACEITAS.join(', ')}. ` +
    'Para levar a uma coleção ou a uma peça, escolha o destino pelo nome em vez de digitar o endereço.'
  )
}

/**
 * O destino resolvido contra o catálogo — ou `null`, e aí **nada renderiza**.
 *
 * Categoria e produto precisam existir **e** estar publicados: a policy
 * `public read categories using (active = true)` já esconderia a categoria da cliente, e um card
 * apontando para uma coleção invisível é pior que card nenhum.
 *
 * O `href` da categoria sai de `categoryHref` sobre as **ativas**, nunca montado à mão (`AD-018`):
 * um pai inativo não pode aparecer numa URL que a cliente vai abrir. O do produto sai de
 * `productPath`. As duas são as canônicas que o sitemap publica e que o Google indexou.
 */
export const resolveMenuTarget = (
  ctx: MenuTargetContext,
  target: unknown,
): ResolvedMenuTarget | null => {
  const alvo = parse(target)
  if (!alvo) return null

  if (alvo.kind === 'category') {
    const ativas = (ctx?.categories ?? []).filter(c => c?.active)
    const destino = ativas.find(c => c.id === alvo.id)
    if (!destino) return null

    return {
      href: categoryHref(ativas, destino.id),
      external: false,
      name: texto(destino.name),
      description: texto(destino.description),
    }
  }

  if (alvo.kind === 'product') {
    // Lista ausente não é lista vazia — é "ainda não sei". Renderizar o banner antes da prova o
    // faria piscar e, no caso do produto apagado, levar a 404.
    if (!ctx?.products) return null

    const destino = ctx.products.find(p => p?.id === alvo.id)
    if (!destino || destino.is_active === false) return null

    const slug = texto(destino.slug)
    if (!slug) return null

    return {
      href: productPath(slug),
      external: false,
      name: texto(destino.name),
      description: texto(destino.description),
    }
  }

  // Endereço digitado: a mesma régua da gravação decide a leitura. Sem isso, um destino recusado no
  // formulário continuaria renderizando se tivesse entrado por SQL na mão.
  if (menuTargetRefusal(alvo) !== null) return null

  return {
    href: normalizeMenuHref(alvo.href),
    external: menuHrefIsExternal(alvo.href),
    // Endereço digitado não empresta texto: o banner que aponta para ele precisa do próprio título.
    name: null,
    description: null,
  }
}
