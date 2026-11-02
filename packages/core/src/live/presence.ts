// A presença na Loja ao vivo (Fase 2): quem está na loja agora, o que está fazendo, e as frases do
// cartão "Agora na loja" da Início.
//
// **Nenhum instante é decidido aqui.** O banco (`store_live`) recorta a janela pelo relógio DELE e
// devolve as contagens prontas — o total, o funil, os 30 minutos, as joias, as faixas. Este arquivo
// só escreve: a regra do funil (que o SQL repete, cópia deliberada guardada por `funilComDonoUnico`),
// as frases e as alturas do mini gráfico. Nenhum `new Date`/`Date.now`.
//
// Aqui o número É de pessoas — quem pulsou nos últimos `LIVE_WINDOW_MIN` minutos. A Fase 1 (Visitas)
// conta navegadores e continua sem "pessoa" nos arquivos dela (`VIS-41`).
//
// ⚠️ Alcançável pelo Deno: imports relativos com extensão explícita, e nada de pacote.

import { formatCount } from '../stats/labels.ts'
import { emptyCounterLine } from '../stats/counterNotes.ts'
import type { PresenceDevice, PresencePageKind, PresenceSource } from '../visits/presence.ts'

/** "Pessoa na loja" = batida nos últimos 5 minutos. O SQL de `store_live` usa o mesmo número. */
export const LIVE_WINDOW_MIN = 5

// ---------------------------------------------------------------------------------------------
// O funil
// ---------------------------------------------------------------------------------------------

export type FunnelStage = 'olhando' | 'sacola' | 'checkout'

export interface LiveFunnel {
  total: number
  olhando: number
  sacola: number
  checkout: number
}

/** Uma condição de uma faixa do funil: a página, ou a sacola acima de N itens. */
export type FunnelCondition = { kind: 'page'; page: PresencePageKind } | { kind: 'cart_above'; n: number }

/**
 * A regra do funil como DADO, em ordem: a primeira faixa cuja condição vale é a da pessoa, e sem
 * nenhuma é `FUNNEL_FALLBACK`. No checkout (o da sacola, o do pedido montado ou o pagamento de um
 * pedido feito) vence a sacola; com ao menos uma joia na sacola — também a guardada de uma visita
 * anterior — vence o "olhando".
 *
 * Dois tradutores leem esta lista: `funnelStage` (o TypeScript) e `funnelStageSql` (o `case` que a
 * migration de `store_live` carrega). A cópia SQL é deliberada — a RPC conta no banco — e
 * `funilComDonoUnico.test.ts` (suíte da loja) lê a migration e exige o `case` byte a byte.
 */
export const FUNNEL_RULES: readonly { stage: Exclude<FunnelStage, 'olhando'>; when: FunnelCondition }[] = [
  { stage: 'checkout', when: { kind: 'page', page: 'checkout' } },
  { stage: 'sacola', when: { kind: 'cart_above', n: 0 } },
]
export const FUNNEL_FALLBACK: FunnelStage = 'olhando'

const vale = (c: FunnelCondition, p: { page: PresencePageKind; cart: number }): boolean =>
  c.kind === 'page' ? p.page === c.page : p.cart > c.n

/** Em que faixa do funil a pessoa está — a primeira regra de `FUNNEL_RULES` que vale. */
export const funnelStage = (p: { page: PresencePageKind; cart: number }): FunnelStage =>
  FUNNEL_RULES.find((r) => vale(r.when, p))?.stage ?? FUNNEL_FALLBACK

const ALIAS_VALIDO = /^[a-z_][a-z0-9_]*$/

/** O mesmo funil em SQL, sobre as colunas `page_kind` e `cart_items` de `store_presence`. */
export const funnelStageSql = (alias = 'p'): string => {
  if (!ALIAS_VALIDO.test(alias)) throw new Error(`alias inválido: ${alias}`)
  const cond = (c: FunnelCondition): string =>
    c.kind === 'page' ? `${alias}.page_kind = '${c.page}'` : `${alias}.cart_items > ${c.n}`
  const ramos = FUNNEL_RULES.map((r) => `when ${cond(r.when)} then '${r.stage}'`).join(' ')
  return `case ${ramos} else '${FUNNEL_FALLBACK}' end`
}

/** As três faixas e o total; cada pessoa entra em UMA, então a soma das três é o total. */
export const funnelOf = (pessoas: readonly { page: PresencePageKind; cart: number }[]): LiveFunnel => {
  const f: LiveFunnel = { total: 0, olhando: 0, sacola: 0, checkout: 0 }
  for (const p of pessoas) {
    f[funnelStage(p)] += 1
    f.total += 1
  }
  return f
}

// ---------------------------------------------------------------------------------------------
// A resposta de `store_live`
// ---------------------------------------------------------------------------------------------

/** Uma joia sendo vista agora. `imagens` é `products.images` cru; a foto sai de `primaryImage`. */
export interface StoreLiveJewel {
  id: string
  nome: string
  imagens: unknown
  pessoas: number
}

/**
 * A leitura `store_live()` (RPC admin, sem argumento). Tudo recortado no servidor, pelo relógio dele:
 * `agora` é quem pulsou nos últimos `janela_min` minutos; `minutos` são os 30 últimos, do mais antigo
 * ao de agora, cada um pela mesma janela (o último é igual a `agora.total`); `compraram_30min` vem de
 * `orders` pela régua de venda de `store_movement`. `production_host` e `contagem_desde` são o mesmo
 * sinal de "loja ainda não medida" que Acessos lê.
 */
export interface StoreLive {
  lido_em: string
  janela_min: number
  production_host: string
  contagem_desde: string | null
  agora: LiveFunnel
  compraram_30min: number
  minutos: number[]
  joias: StoreLiveJewel[]
  guia: number
  origens: { faixa: PresenceSource; n: number }[]
  aparelho: Record<PresenceDevice, number>
}

// ---------------------------------------------------------------------------------------------
// As frases
// ---------------------------------------------------------------------------------------------

export const LIVE_CARD_TITLE = 'Agora na loja'
/** O cartão da Início, com ninguém na loja (sem ponto final, como o protótipo). */
export const NOBODY_IN_STORE = 'Ninguém na loja agora'
/** A lista de joias da Loja ao vivo, sem ninguém numa página de joia. */
export const NOBODY_ON_JEWEL = 'Ninguém olhando uma joia agora.'
/** A nota de quem está no checkout. Sem prazo: o carrinho abandonado não é promessa de hora. */
export const CHECKOUT_NOTE =
  'Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel.'

export const peopleWord = (n: number): 'pessoa' | 'pessoas' => (n === 1 ? 'pessoa' : 'pessoas')

/** `'1 pessoa'`, `'7 pessoas'`, `'1.240 pessoas'`. */
export const peopleCount = (n: number): string => `${formatCount(n)} ${peopleWord(n)}`

/** O nome acessível do cartão com dado: quantas pessoas, e que o toque abre a Loja ao vivo. */
export const liveCardLabel = (n: number): string => `${LIVE_CARD_TITLE}, ${peopleCount(n)}. Abrir loja ao vivo`
export const liveCardLoadingLabel = `${LIVE_CARD_TITLE}, carregando. Abrir loja ao vivo`
export const liveCardFailedLabel = `${LIVE_CARD_TITLE}: não consegui carregar. Tentar de novo`

/** `'2 com joias na sacola · 1 no checkout'`; cada parte some no zero; as duas no zero ⇒ `null`. */
export const liveCardLine = ({ sacola, checkout }: { sacola: number; checkout: number }): string | null => {
  const partes: string[] = []
  if (sacola > 0) partes.push(`${formatCount(sacola)} com ${sacola === 1 ? 'joia' : 'joias'} na sacola`)
  if (checkout > 0) partes.push(`${formatCount(checkout)} no checkout`)
  return partes.length ? partes.join(' · ') : null
}

type MeasureSignal = { contagem_desde: string | null; production_host: string }

/** A loja ainda não está sendo medida: a MESMA frase de Acessos (`emptyCounterLine`); medida ⇒ `null`. */
export const liveNotMeasuredLine = (l: MeasureSignal): string | null => emptyCounterLine(l)

export const liveCardNotMeasuredLabel = (l: MeasureSignal): string =>
  `${LIVE_CARD_TITLE}. ${liveNotMeasuredLine(l) ?? ''} Abrir loja ao vivo`

// ---------------------------------------------------------------------------------------------
// O mini gráfico do cartão
// ---------------------------------------------------------------------------------------------

export interface LiveMiniBar {
  n: number
  /** Em px: proporcional ao maior dos 30 minutos, com piso e teto. */
  altura: number
  /** A barra de agora (a última). */
  atual: boolean
}

/** As últimas `count` barras dos 30 minutos, com a altura relativa ao maior valor dos 30. */
export const liveMiniBars = (minutos: readonly number[], count = 15, teto = 40, piso = 3): LiveMiniBar[] => {
  const maior = Math.max(0, ...minutos)
  const ultimas = minutos.slice(-count)
  return ultimas.map((n, i) => ({
    n,
    altura: maior > 0 ? Math.min(teto, Math.max(piso, Math.round((n / maior) * teto))) : piso,
    atual: i === ultimas.length - 1,
  }))
}
