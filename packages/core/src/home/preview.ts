// Feature 25 — o contrato da prévia real, entre o painel e a loja.
//
// A prévia de `/admin/home` deixou de ser um desenho do painel e passou a ser **a própria loja**, num
// iframe. O painel manda o rascunho ainda não salvo; a loja desenha com os componentes de verdade.
// Isto aqui é a única forma que as duas pontas conhecem uma da outra.
//
// Mora em `core` e é módulo **puro** — sem React, sem Supabase, sem `window` — pelo mesmo motivo de
// `core/routes` e `core/material`: as duas pontas leem a mesma regra, e um guarda precisa importá-la
// de dentro de um teste. Foi ter a regra escrita em cada tela que produziu o defeito que esta
// feature elimina: **dois desenhos da mesma Home**, mantidos à mão, em apps que não se importam.

// `.ts` explícito (feature 39, e a regra é a do `CLAUDE.md`): este arquivo passou a ser alcançado por
// `core/menu/preview.ts`, e `core/menu` é resolvido pelo **Deno** da edge function do sitemap. Deno
// resolve o grafo de TIPOS junto — um especificador relativo sem extensão derruba o worker com
// `Failed resolving types` antes da primeira linha rodar. Vite e vitest resolvem as duas formas, então
// nada acusava; quem acusa agora é `core/menu/__tests__/purity.test.ts`, que caminha o grafo inteiro.
import type { HomeSection } from './types.ts'

/**
 * O carimbo de toda mensagem da ponte.
 *
 * Existe porque `window.message` é um barramento compartilhado: extensão de navegador, widget de
 * terceiro e o próprio Vite (HMR) postam ali. Sem o carimbo, a primeira mensagem alheia com um campo
 * `type` viraria comando.
 */
export const PREVIEW_SOURCE = 'estrelinha-home-preview'

/** O parâmetro que liga o modo prévia na loja. */
export const PREVIEW_PARAM = 'preview'

/**
 * O intervalo do debounce do rascunho.
 *
 * Vale para o `draft` e **não** para o `highlight`: o rascunho acompanha digitação e não precisa de
 * um envio por tecla; o realce acompanha o cursor, e 200 ms ali seriam lidos como travamento.
 */
export const PREVIEW_DEBOUNCE_MS = 200

/** Painel → loja: a composição a desenhar, já com o que ainda não foi salvo. */
export interface PreviewDraftMessage {
  source: typeof PREVIEW_SOURCE
  type: 'draft'
  sections: HomeSection[]
}

/** Painel → loja: qual bloco contornar. `null` remove o contorno. */
export interface PreviewHighlightMessage {
  source: typeof PREVIEW_SOURCE
  type: 'highlight'
  sectionId: string | null
}

/** Loja → painel: montei, pode mandar o rascunho. */
export interface PreviewReadyMessage {
  source: typeof PREVIEW_SOURCE
  type: 'ready'
}

/** Loja → painel: a cliente clicaria neste bloco; abra o editor dele. */
export interface PreviewSelectMessage {
  source: typeof PREVIEW_SOURCE
  type: 'select'
  sectionId: string
}

export type PreviewMessage =
  | PreviewDraftMessage
  | PreviewHighlightMessage
  | PreviewReadyMessage
  | PreviewSelectMessage

/**
 * A loja está em modo prévia?
 *
 * **As duas condições são necessárias, e a segunda é a que importa.** `?preview=1` numa aba comum não
 * pode mudar a Home: o parâmetro é adivinhável, viraliza por link compartilhado e deixaria uma
 * cliente olhando uma página que fica em branco esperando uma mensagem que nunca chega. Estar dentro
 * de um iframe é o que caracteriza a prévia — e é uma condição que a URL não consegue forjar sozinha.
 *
 * Recebe `search` e `framed` em vez de ler `window`: é o que mantém este módulo puro e testável, e o
 * que permite chamá-la de `App.tsx`, que está **acima** do router e não tem `useSearchParams`.
 */
export const isPreviewWindow = (search: string, framed: boolean): boolean => {
  if (!framed) return false
  const params = new URLSearchParams(search ?? '')
  const valor = params.get(PREVIEW_PARAM)
  // `?preview` sem valor conta: é a forma que alguém digita à mão, e recusá-la daria um modo prévia
  // que só liga com a sintaxe exata que o painel usa.
  return valor !== null && valor !== '0' && valor !== 'false'
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null

/**
 * A mensagem, validada — ou `null`.
 *
 * Devolve `PreviewMessage | null` e não um veredito com motivo por causa de `strictNullChecks:
 * false`: união discriminada por literal booleano **não estreita** nesse modo, e quem lesse o ramo
 * de falha teria erro de compilação. `null` não tem ramo para esquecer.
 *
 * Valida a **forma**, não a origem — quem valida remetente é cada ponta, com a régua dela: o painel
 * exige origem exata e a janela do próprio iframe, porque o painel age; a loja exige `window.parent`,
 * porque a loja só desenha.
 */
export const parsePreviewMessage = (data: unknown): PreviewMessage | null => {
  if (!ehObjeto(data) || data.source !== PREVIEW_SOURCE) return null

  switch (data.type) {
    case 'ready':
      return { source: PREVIEW_SOURCE, type: 'ready' }

    case 'select':
      return typeof data.sectionId === 'string' && data.sectionId !== ''
        ? { source: PREVIEW_SOURCE, type: 'select', sectionId: data.sectionId }
        : null

    case 'highlight':
      // `null` é valor legítimo aqui — é como o painel apaga o contorno.
      return typeof data.sectionId === 'string' || data.sectionId === null
        ? { source: PREVIEW_SOURCE, type: 'highlight', sectionId: (data.sectionId as string) ?? null }
        : null

    case 'draft':
      return Array.isArray(data.sections)
        ? { source: PREVIEW_SOURCE, type: 'draft', sections: data.sections as HomeSection[] }
        : null

    default:
      return null
  }
}

/** Os dois dispositivos do alternador. O padrão é o celular — ~90% dos acessos da loja. */
export const PREVIEW_DEVICES = {
  mobile: { label: 'Celular', width: 390, height: 844 },
  desktop: { label: 'Computador', width: 1024, height: 768 },
} as const

export type PreviewDevice = keyof typeof PREVIEW_DEVICES

/**
 * A escala com que o dispositivo cabe no palco.
 *
 * **Nunca amplia** (`min(1, …)`): mostrar o celular a 130% num monitor largo daria um alvo de toque
 * que mente sobre o próprio tamanho, e o painel existe para conferir a loja, não para admirá-la.
 *
 * `available <= 0` devolve `1` porque é o que jsdom informa antes de qualquer layout — e também o que
 * um `ResizeObserver` informa no primeiro quadro. Sem esse ramo, a prévia nasceria com escala `0` e
 * o primeiro quadro seria um retângulo invisível.
 */
export const previewScale = (available: number, deviceWidth: number): number => {
  if (!(available > 0) || !(deviceWidth > 0)) return 1
  return Math.min(1, available / deviceWidth)
}

/**
 * A folga entre o palco e o quadro, nos dois eixos.
 *
 * **Mora aqui porque tinha dois donos** (feature 47): `HomeLivePreview.tsx` e `MenuLivePreview.tsx`
 * declaravam cada um a sua `FOLGA = 40`, e mudar a de um palco e não a do outro faria as duas prévias
 * escalarem diferente com build, `tsc` e teste de componente verdes. É o defeito 01 em miniatura.
 *
 * **Não é exportada de propósito**: quem precisa do número precisa, na verdade, do quadro — e o
 * quadro é `previewFrame`. Uma constante exportada é um convite a refazer a conta do lado de fora.
 */
const PREVIEW_GUTTER = 40

/** O palco disponível, medido pelo `ResizeObserver` de quem desenha. */
export interface PreviewBox {
  width: number
  height: number
}

/** O quadro: a medida que o iframe declara, e a escala com que ele é desenhado. */
export interface PreviewFrame {
  width: number
  height: number
  scale: number
}

/**
 * O tamanho do quadro da prévia — o **único** dono dessa conta.
 *
 * Três regras, e a terceira é a que a tela cheia acrescenta:
 *
 * - **Celular, em qualquer modo**: `390 × 844`, reduzido para caber. A altura é a **dobra real** do
 *   celular; esticá-la em tela cheia mentiria sobre o que a cliente vê, que é justamente o que a
 *   prévia existe para não fazer (`FOCO-18`).
 * - **Computador, normal**: `1024 × 768`, reduzido pelo **menor** dos dois eixos — numa janela baixa,
 *   escalar só pela largura deixaria o rodapé da loja fora do palco.
 * - **Computador, tela cheia**: largura `1024` e escala **exatamente `1`** — 100% é o número que
 *   importa, e é por ele que a barra do menu vira texto legível. A altura passa a ser o espaço
 *   vertical que existe, **nunca menor que 768**: um palco baixo encurta a leitura, não o tamanho
 *   das letras (`FOCO-16`, `FOCO-17`).
 *
 * `box` em zero — jsdom antes do layout, e o primeiro quadro de qualquer `ResizeObserver` — cai no
 * mesmo ramo de sempre e devolve escala `1`.
 */
export const previewFrame = (
  device: PreviewDevice,
  box: PreviewBox,
  fullscreen: boolean,
): PreviewFrame => {
  const { width, height } = PREVIEW_DEVICES[device]
  const disponivel = {
    width: (box?.width ?? 0) - PREVIEW_GUTTER,
    height: (box?.height ?? 0) - PREVIEW_GUTTER,
  }

  if (fullscreen && device === 'desktop') {
    // `NaN > height` é `false`, então uma caixa sem medida cai no piso em vez de propagar `NaN`.
    const altura = disponivel.height > height ? Math.round(disponivel.height) : height
    return { width, height: altura, scale: 1 }
  }

  return {
    width,
    height,
    scale: Math.min(
      previewScale(disponivel.width, width),
      previewScale(disponivel.height, height),
    ),
  }
}

/**
 * O rótulo da barra do palco: `390 × 844 · 100%`.
 *
 * Recebe o **quadro**, e não o dispositivo: em tela cheia a altura não é mais a nominal do
 * dispositivo, e imprimir `768` enquanto o quadro mede `948` seria a barra mentindo sobre o que está
 * na tela (`FOCO-17`).
 */
export const previewMetrics = (frame: PreviewFrame): string =>
  `${frame.width} × ${frame.height} · ${Math.round(frame.scale * 100)}%`

/**
 * O endereço que o iframe carrega.
 *
 * Montado **uma vez** por quem chama, e sem nada do estado de dispositivo dentro: se a largura
 * entrasse no `src`, cada clique no alternador remontaria o documento e a prévia perderia o rascunho
 * que o painel já tinha mandado.
 */
export const previewSrc = (storeUrl: string): string =>
  `${storeUrl.replace(/\/$/, '')}/?${PREVIEW_PARAM}=1`

/** O atributo que marca o bloco de uma seção no DOM da prévia. */
export const PREVIEW_SECTION_ATTR = 'data-home-section-id'
