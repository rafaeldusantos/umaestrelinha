// Feature 39, `NAV-43`..`NAV-47` — o canal da prévia do **menu**.
//
// A feature 25 já resolveu o problema geral: a prévia do painel deixou de ser um desenho do painel e
// passou a ser **a própria loja**, num iframe. O que ali é genérico — o parâmetro que liga o modo
// (`PREVIEW_PARAM`), a regra de "só dentro de iframe" (`isPreviewWindow`), os dois dispositivos
// (`PREVIEW_DEVICES`), a escala (`previewScale`), a métrica (`previewMetrics`) e o endereço
// (`previewSrc`) — **é reusado como está**, de `core/home/preview.ts`. Nada disso é redeclarado
// aqui, e nada disso mudou de lugar: duas definições de "esta janela é uma prévia" seriam o
// "defeito 01" nascendo dentro da ponte que existe para acabar com ele.
//
// O que **não** é genérico é o payload, e é só por isso que este módulo existe: o canal da home
// manda seções, o canal do menu manda a curadoria. Os dois convivem no **mesmo `?preview=1`** e se
// separam pelo carimbo — `PREVIEW_SOURCE` × `MENU_PREVIEW_SOURCE`. Um parâmetro novo (`?menu=1`)
// seria um segundo dono de "esta janela é uma prévia", e o dia em que um deles ganhasse uma
// condição a mais os dois discordariam sem nada quebrar.
//
// **As duas pontas têm réguas diferentes, e a assimetria é de propósito** (é o desenho da `25`): o
// painel exige origem exata **e** que o `event.source` seja a janela do próprio iframe, porque o
// painel **age** — ele abre editor e muda a seleção; a loja exige só ser o pai, porque a loja só
// **desenha**. Quem valida remetente é cada ponta; o que mora aqui é a validação da **forma**.

import type { MenuCategory, MenuLink, MenuSurface } from './menu.ts'
import { PREVIEW_DEVICES, type PreviewDevice } from '../home/preview.ts'

/**
 * O carimbo de toda mensagem deste canal.
 *
 * `window.message` é barramento compartilhado: extensão de navegador, widget de terceiro e o próprio
 * Vite (HMR) postam ali. Sem o carimbo, a primeira mensagem alheia com um campo `type` viraria
 * comando — e, pior, a mensagem do canal da **home** viraria comando de menu, porque as duas chegam
 * na mesma janela.
 */
export const MENU_PREVIEW_SOURCE = 'estrelinha-menu-preview'

/**
 * O rascunho: as **duas fontes** do menu, exatamente como a tela do painel as tem agora.
 *
 * Não vai `MenuItem[]` já resolvido, e isso é o ponto: quem chama `menuItems(input, surface)` é a
 * loja, com a superfície que **ela** está desenhando. Mandar a lista pronta faria o painel decidir o
 * que a barra mostra — o segundo desenho de volta, agora por dentro do protocolo.
 *
 * Não carrega `surface` pelo mesmo motivo. A superfície que o palco mostra é a do quadro (390 é o
 * celular), e quem sabe disso é a loja: o `Header` pede `'desktop'` e a folha pede `'mobile'`.
 */
export interface MenuPreviewDraft {
  categories: MenuCategory[]
  links: MenuLink[]
}

/** Painel → loja: o menu a desenhar, já com o que a dona acabou de mexer. */
export interface MenuPreviewDraftMessage {
  source: typeof MENU_PREVIEW_SOURCE
  type: 'draft'
  draft: MenuPreviewDraft
}

/**
 * Painel → loja: abra o painel desta entrada. `null` fecha.
 *
 * É o que cumpre `NAV-43` ("a prévia abre com o menu já aberto na entrada selecionada"): sem ela, a
 * dona teria de passar o mouse dentro do iframe para conferir o painel que está editando fora dele.
 */
export interface MenuPreviewOpenMessage {
  source: typeof MENU_PREVIEW_SOURCE
  type: 'open'
  itemId: string | null
}

/** Loja → painel: montei, pode mandar. */
export interface MenuPreviewReadyMessage {
  source: typeof MENU_PREVIEW_SOURCE
  type: 'ready'
}

export type MenuPreviewMessage =
  | MenuPreviewDraftMessage
  | MenuPreviewOpenMessage
  | MenuPreviewReadyMessage

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

/**
 * A mensagem, validada — ou `null`.
 *
 * Devolve `MenuPreviewMessage | null` e **não** um veredito com motivo por causa de
 * `strictNullChecks: false`: união discriminada por literal booleano não estreita nesse modo, e quem
 * lesse o ramo de falha teria erro de compilação (TS2339). `null` não tem ramo para esquecer. É o
 * mesmo formato de `parsePreviewMessage`, de `menuTargetRefusal` e de `reservedSlugRefusal`.
 *
 * Valida a **forma**, nunca a origem. Quem valida remetente é cada ponta, com a régua dela.
 */
export const parseMenuPreviewMessage = (data: unknown): MenuPreviewMessage | null => {
  if (!ehObjeto(data) || data.source !== MENU_PREVIEW_SOURCE) return null

  switch (data.type) {
    case 'ready':
      return { source: MENU_PREVIEW_SOURCE, type: 'ready' }

    case 'open':
      // `null` é valor legítimo aqui — é como o painel fecha o painel aberto.
      return typeof data.itemId === 'string' || data.itemId === null
        ? {
            source: MENU_PREVIEW_SOURCE,
            type: 'open',
            itemId: typeof data.itemId === 'string' && data.itemId !== '' ? data.itemId : null,
          }
        : null

    case 'draft': {
      if (!ehObjeto(data.draft)) return null
      const { categories, links } = data.draft as Record<string, unknown>
      // `categories` é obrigatório e `links` não: loja sem item de link é estado normal (`NAV-15`),
      // e recusar o rascunho inteiro por causa da lista ausente deixaria o quadro em branco no caso
      // mais comum de todos. Já um rascunho sem categorias não é rascunho: é forma errada.
      if (!Array.isArray(categories)) return null
      return {
        source: MENU_PREVIEW_SOURCE,
        type: 'draft',
        draft: {
          categories: categories as MenuCategory[],
          links: Array.isArray(links) ? (links as MenuLink[]) : [],
        },
      }
    }

    default:
      return null
  }
}

/**
 * O dispositivo do palco desta superfície — **o alternador é UM só** (`NAV-37`).
 *
 * A tela do menu já tem um alternador Computador/Celular, e ele governa a edição. Um segundo, no
 * palco, permitiria editar a curadoria do celular olhando a barra do computador: dois donos de "que
 * dispositivo estou conferindo", com a tela mostrando um e a dona editando outro — sem nada quebrar,
 * que é como esses defeitos sempre se apresentam. Aqui a superfície **é** o dispositivo.
 *
 * A conversão passa por `PREVIEW_DEVICES` (o mesmo objeto que dá a medida do quadro) em vez de um
 * `as`: se um dia os dois vocabulários deixarem de coincidir, isto vira um caso de borda de verdade
 * e não um erro de tipo silenciado. Valor desconhecido cai no **celular** — ~90% dos acessos da loja.
 */
export const menuPreviewDevice = (surface: MenuSurface): PreviewDevice =>
  surface in PREVIEW_DEVICES ? (surface as PreviewDevice) : 'mobile'
