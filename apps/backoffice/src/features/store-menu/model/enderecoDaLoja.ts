// Feature 86, QA r1 (Q03) — o "Outro endereço da loja" só aceita endereço que EXISTE.
//
// `internalMenuHrefRefusal` (de `core`) julga só a FORMA (R01 do QA r2: antes, o primeiro segmento contra `ROUTE_SLUGS`), e
// por isso aceitava `/produtos/inexistente` (o item levava a cliente à 404) e gravava `/sobre/` e
// `/SOBRE` como páginas distintas. Aqui a pergunta é outra: **há uma página da loja neste endereço?**
//
// - rota fixa conhecida: `SITEMAP_STATIC_PATHS` e as não indexáveis sem parâmetro (as listas da loja,
//   nunca uma terceira);
// - categoria: o caminho de uma categoria ATIVA, montado por `categoryHref` (o dono da canônica,
//   `AD-018`) sobre as ativas — a mesma conta da loja;
// - peça: `/produtos/<slug>`, e aí a resposta depende do banco (`activeProductExists`, uma leitura).
//
// O endereço gravado é o NORMALIZADO (`menuHrefKey`: barra final fora, caminho em minúsculas).
//
// S01 do QA r3 — a categoria é decidida pela MESMA régua da loja, `resolveCategoryRoute` (`core/page`,
// `AD-018`): a forma de um segmento de uma filha ativa (`/colar-e-correntes`) a loja abre, então passa
// aqui — e o que se grava é a canônica (`categoryHref`), dois segmentos. Antes a conta era "o caminho
// digitado é igual ao `categoryHref` de alguma ativa", e a frase dizia "Não há página" de uma página
// que existe. A inativa e o slug repetido entre ativas (que a loja resolveria pelo primeiro que
// achasse) continuam recusados, cada um com o motivo dele. O pai errado (`/outro-pai/filha`), que a
// loja só redireciona, também continua recusado: quem digita um pai que não é o da coleção pode estar
// pensando em outra.

import {
  internalMenuHrefRefusal,
  menuHrefIsExternal,
  menuHrefKey,
  type MenuCategory,
} from '@estrelinha/core/menu'
import { resolveCategoryRoute } from '@estrelinha/core/page/categoryRoute'
import { NON_INDEXABLE_PATHS, SITEMAP_STATIC_PATHS } from '@estrelinha/core/routes'

/** Discriminado por literal de STRING (`strictNullChecks: false`). */
export type EnderecoConferido =
  | { kind: 'ok'; href: string }
  | { kind: 'peca'; href: string; slug: string }
  | { kind: 'recusa'; motivo: string }

const ROTAS_FIXAS: ReadonlySet<string> = new Set([
  ...SITEMAP_STATIC_PATHS,
  ...NON_INDEXABLE_PATHS.map(r => r.path).filter(p => !p.includes(':')),
])

export const MOTIVO_SEM_PAGINA = (digitado: string) =>
  `Não há página da loja em “${digitado}”. Escolha a página na lista acima, ou confira o endereço abrindo a página na loja.`

export const MOTIVO_COLECAO_FORA_DO_AR = (digitado: string) =>
  `A coleção de “${digitado}” está fora do ar (desativada), e a loja não mostra a página dela. Ative a coleção em Categorias, ou escolha outra página.`

export const MOTIVO_COLECAO_AMBIGUA = (digitado: string) =>
  `Mais de uma coleção usa o endereço “${digitado}”. Escolha a coleção na aba Categoria.`

export const MOTIVO_SEM_PECA = (href: string) =>
  `Não há peça à venda em “${href}”. Confira o endereço abrindo a peça na loja.`

export const MOTIVO_PECA_NAO_CONFERIDA =
  'Não deu para conferir a peça agora. Confira a internet e tente de novo.'

export const conferirEnderecoDaLoja = (
  digitado: string,
  categories: readonly MenuCategory[],
): EnderecoConferido => {
  const bruto = (digitado ?? '').trim()
  // Vazio, externo e `//host`: a régua de `core`, com a frase dela.
  if (bruto === '' || menuHrefIsExternal(bruto) || bruto.startsWith('//')) {
    return { kind: 'recusa', motivo: internalMenuHrefRefusal(bruto) ?? MOTIVO_SEM_PAGINA(bruto) }
  }

  const href = menuHrefKey(bruto)
  const caminho = href.split(/[?#]/)[0]

  if (ROTAS_FIXAS.has(caminho)) return { kind: 'ok', href }

  const peca = /^\/produtos\/([^/]+)$/.exec(caminho)
  if (peca) return { kind: 'peca', href, slug: peca[1] }

  const todas = (categories ?? []).filter(Boolean)
  const ativas = todas.filter(c => c.active)
  const segmentos = caminho.split('/').filter(Boolean)
  if (segmentos.length === 1 || segmentos.length === 2) {
    const slug = segmentos[segmentos.length - 1]
    const parentSlug = segmentos.length === 2 ? segmentos[0] : null
    if (ativas.filter(c => c.slug === slug).length > 1) {
      return { kind: 'recusa', motivo: MOTIVO_COLECAO_AMBIGUA(bruto) }
    }
    const rota = resolveCategoryRoute({ slug, parentSlug, categories: ativas })
    if (rota.kind === 'ok') {
      // A canônica da loja (`categoryHref`, dentro da régua), com a query e o fragmento que vieram junto.
      return { kind: 'ok', href: rota.canonical + href.slice(caminho.length) }
    }
    if (rota.kind === 'notfound' && todas.some(c => !c.active && c.slug === slug)) {
      return { kind: 'recusa', motivo: MOTIVO_COLECAO_FORA_DO_AR(bruto) }
    }
  }

  // Cita o que a dona DIGITOU, e não a forma normalizada ("/javascript:alert(1)" confundia).
  return { kind: 'recusa', motivo: MOTIVO_SEM_PAGINA(bruto) }
}
