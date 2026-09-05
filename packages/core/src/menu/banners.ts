// Feature 39 — os banners do painel do menu.
//
// Substituem o card da feature 16 (`menu_promo` / `resolvePromo`), e a regra que aquele card
// carregava é preservada literalmente: **destino que não resolve não renderiza** (`MENU-26`). O que
// muda é o alcance — o card era um retângulo de cor com texto apontando só para categoria, e esta
// loja vende peça que se compra pelo olho.
//
// Três coisas novas, e cada uma existe por uma AC:
//
// - **Até dois por entrada, por dispositivo** (`NAV-28`). É o único limite desta feature, e ele é de
//   layout do painel — não é contagem de menu. O teto de itens do menu foi removido de propósito.
// - **Uma arte por dispositivo, dentro do MESMO banner** (`NAV-33`, `NAV-34`). Dois objetos fariam a
//   dona escrever o mesmo título duas vezes e divergir na terceira edição: o anúncio é um, o que
//   muda entre 640×380 e 1:1 é o recorte da foto. Falta a arte da superfície ⇒ usa a outra, e o
//   retorno **declara** que reaproveitou, para a tela poder avisar.
// - **Título e texto herdados do destino** (`NAV-32`). A dona só escreve quando quer divergir do
//   nome da coleção, e não é obrigada a repetir nada para o banner aparecer.

import { menuBannerSlots, type MenuSurface } from './menu.ts'
import { resolveMenuTarget, type MenuTarget, type MenuTargetContext } from './target.ts'

/**
 * Um banner, como o jsonb `categories.menu_banners` o guarda.
 *
 * **Declarado aqui e reexportado por `@estrelinha/supabase/types`**, nunca o contrário — é a
 * inversão que a feature 33 pagou para descobrir: o Deno resolve o grafo de TIPOS junto, e um
 * `import type` de `@estrelinha/supabase/types` dentro de `core/menu` derruba a edge function do
 * sitemap com `Failed resolving types` antes da primeira linha rodar. Quem usa o tipo é a regra; o
 * pacote de tipos só descreve a coluna.
 */
export interface MenuBanner {
  target: MenuTarget
  badge?: string
  title?: string
  subtitle?: string
  /** A arte do computador (640×380 na vaga do painel). */
  image_desktop?: string
  /** A arte do celular (proporção mais quadrada, dentro do acordeão). */
  image_mobile?: string
}

/** O jsonb inteiro: uma lista por superfície. */
export interface MenuBanners {
  desktop: MenuBanner[]
  mobile: MenuBanner[]
}

/** Um banner pronto para desenhar: destino provado, textos preenchidos, arte escolhida. */
export interface ResolvedMenuBanner {
  badge: string | null
  /** O que a dona escreveu, ou o nome do destino. `null` só em endereço digitado sem título. */
  title: string | null
  subtitle: string | null
  href: string
  /** Sai com `target="_blank"` e `rel="noopener noreferrer"` (`NAV-11`). */
  external: boolean
  /** `null` renderiza o bloco de cor com o texto, sem quadro vazio (`NAV-32`). */
  image: string | null
  /**
   * A arte veio da **outra** superfície (`NAV-34`).
   *
   * A loja não faz nada com isso — ela desenha a arte que veio. Quem lê é a tela do painel, que
   * precisa avisar "está reaproveitando a arte do computador" em vez de deixar a dona achar que
   * enviou as duas.
   */
  imageReused: boolean
}

/**
 * Quantos banners cabem num painel.
 *
 * **É o único limite da feature 39**, e ele é de layout: o painel do desktop tem duas vagas de arte
 * ao lado das colunas, e o acordeão do celular mostra os dois em sequência. Nada aqui conta itens de
 * menu — aquele teto foi removido porque era número de código recusando curadoria da dona.
 */
export const MENU_BANNER_LIMIT = 2

const texto = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null

/**
 * A arte desta superfície, com recuo para a da outra.
 *
 * O recuo é a AC `NAV-34`: banner configurado sem a arte do dispositivo renderiza com a que existe,
 * porque a alternativa — o banner sumir de uma das superfícies — é a dona publicando um anúncio que
 * metade das clientes não vê, sem nada em tela dizendo por quê. (E ~90% dos acessos vêm de celular,
 * que é justamente a arte que costuma faltar.)
 */
const arte = (banner: MenuBanner, surface: MenuSurface): { image: string | null; imageReused: boolean } => {
  const propria = texto(surface === 'desktop' ? banner.image_desktop : banner.image_mobile)
  if (propria) return { image: propria, imageReused: false }

  const outra = texto(surface === 'desktop' ? banner.image_mobile : banner.image_desktop)
  return { image: outra, imageReused: outra !== null }
}

/**
 * Os banners de uma superfície, resolvidos — a lista **sem** o que não pode ser desenhado.
 *
 * Validação campo a campo porque o jsonb não tem forma garantida: `null`, array na raiz, superfície
 * que não é lista, item que não é objeto e destino pendurado são todos estados alcançáveis do banco,
 * e nenhum deles pode lançar dentro da renderização do header.
 *
 * **O corte em `MENU_BANNER_LIMIT` acontece DEPOIS de resolver**, não antes: com o primeiro destino
 * apagado, cortar a lista crua deixaria o painel com um banner quando havia dois bons no jsonb.
 *
 * E aqui truncar é certo, ao contrário do que valia para as entradas do menu: lá o retorno honesto
 * existia porque a tela do admin mostrava a quinta marcada e era o único lugar onde ela podia ser
 * desligada. O editor de banner tem **duas vagas**; um terceiro gravado à mão não teria onde ser
 * apagado de qualquer forma, e o que impede o estado é `menuBannerRefusal`, na gravação.
 */
export const resolveMenuBanners = (
  ctx: MenuTargetContext,
  raw: unknown,
  surface: MenuSurface,
): ResolvedMenuBanner[] => {
  const resolvidos: ResolvedMenuBanner[] = []

  for (const bruto of menuBannerSlots(raw, surface)) {
    if (resolvidos.length >= MENU_BANNER_LIMIT) break
    if (bruto === null || typeof bruto !== 'object' || Array.isArray(bruto)) continue

    const banner = bruto as MenuBanner
    const destino = resolveMenuTarget(ctx, banner.target)
    if (!destino) continue

    const { image, imageReused } = arte(banner, surface)
    const title = texto(banner.title) ?? destino.name

    // Sem arte e sem texto não há banner — há um retângulo clicável e mudo. Endereço digitado é o
    // único destino que não empresta nome, então é o único caso que chega aqui.
    if (!image && !title) continue

    resolvidos.push({
      badge: texto(banner.badge),
      title,
      subtitle: texto(banner.subtitle) ?? destino.description,
      href: destino.href,
      external: destino.external,
      image,
      imageReused,
    })
  }

  return resolvidos
}

/**
 * Por que esta lista de banners **não pode ser gravada** — ou `null` quando pode.
 *
 * `string | null` pelo mesmo motivo de sempre (`strictNullChecks: false` não estreita união por
 * literal booleano). Julga só a **contagem**: a forma do destino de cada banner é
 * `menuTargetRefusal`, que é a mesma função que o item de link usa (`NAV-31`). Duplicá-la aqui
 * criaria as duas réguas que aquela AC existe para impedir.
 */
export const menuBannerRefusal = (list: readonly unknown[]): string | null => {
  const quantos = Array.isArray(list) ? list.length : 0
  if (quantos <= MENU_BANNER_LIMIT) return null

  return (
    `O painel do menu comporta ${MENU_BANNER_LIMIT} banners, e este ficaria com ${quantos}. ` +
    'Remova um antes de acrescentar outro.'
  )
}
