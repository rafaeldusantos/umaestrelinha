// O frete grátis por valor de compra — domínio puro (roda em Node, Deno e browser).
//
// `FRG-03`. Este arquivo é o **dono único** da pergunta que sete superfícies respondiam por conta
// própria:
//
//   > Esta loja pratica frete grátis? Se sim, a cliente já atingiu a faixa, e quanto falta?
//
// Antes da feature 37 as sete respostas se dividiam em dois grupos que **discordavam no caso de
// borda**. Com `free_shipping_threshold = 0`, três superfícies liam `threshold > 0` e escondiam o
// texto, enquanto quatro faziam `subtotal >= threshold` — sempre verdadeiro contra zero — e
// **zeravam o frete**. Zerar o campo no painel escondia o anúncio e liberava frete grátis para todo
// mundo no caixa, sem nada em tela dizendo por quê. É o "defeito 01" do `CLAUDE.md` no caminho do
// dinheiro, e a propriedade que o tornava caro é a de sempre: nada quebrava.
//
// Nada aqui importa React, Supabase ou Deno, e todo import relativo (hoje: nenhum) traz `.ts`
// explícito — regra do `CLAUDE.md` medida na feature 33, para que o módulo siga alcançável fora do
// Vite se algum dia uma edge function precisar dele.

/**
 * A configuração crua, como `store_settings.shipping` guarda.
 *
 * Estrutural de propósito: qualquer objeto com os dois campos serve, então o caminho React
 * (`useShippingSettings`) e o caminho zustand (`runtimeFreeShippingConfig`) alimentam a **mesma**
 * função sem um adaptador no meio — que seria a nona chance de escrever a regra de um jeito
 * diferente.
 */
export interface FreeShippingConfig {
  free_shipping_enabled: boolean
  free_shipping_threshold: number
}

/** O que as superfícies leem. Nenhuma delas deriva nada além disto. */
export interface FreeShippingState {
  /** A loja pratica frete grátis por valor de compra? */
  active: boolean
  /**
   * A faixa, em reais. **Zero quando inativo** — ver a invariante 3 abaixo.
   * Quem precisa do número guardado com a funcionalidade desligada é só o editor de configurações.
   */
  threshold: number
  /** Quanto falta em reais. Zero quando a faixa foi atingida e zero quando inativo. */
  remaining: number
  /** 0–100, já limitado nas duas pontas — a barra nunca passa do fim nem volta para trás. */
  percent: number
  /** A faixa foi atingida? **Sempre `false` quando inativo** — ver a invariante 1 abaixo. */
  reached: boolean
}

/**
 * O estado inativo, congelado e compartilhado.
 *
 * Ser o **mesmo objeto** toda vez é deliberado: `useFreeShipping` memoiza pelas primitivas, e quem
 * consome com a funcionalidade desligada recebe identidade estável de graça.
 */
const INATIVO: FreeShippingState = Object.freeze({
  active: false,
  threshold: 0,
  remaining: 0,
  percent: 0,
  reached: false,
})

/** Número utilizável para aritmética de dinheiro? Recusa `NaN`, `Infinity` e `undefined`. */
const finito = (valor: number): boolean => typeof valor === 'number' && Number.isFinite(valor)

/**
 * A loja pratica frete grátis por valor de compra?
 *
 * **Invariante 2**: `active = enabled && threshold > 0`. Faixa zerada ou negativa com o interruptor
 * ligado é dado inválido — a alternativa seria "frete grátis incondicional", que nunca foi pedido e
 * teria copy própria em cinco superfícies ("+R$ 0" no selo do produto não diz nada). Aqui é o
 * **cinto**; o suspensório é `freeShippingRefusal`, que impede o par de ser gravado.
 */
const ativo = (config: FreeShippingConfig): boolean =>
  !!config?.free_shipping_enabled && finito(config.free_shipping_threshold) && config.free_shipping_threshold > 0

/**
 * O estado do frete grátis para um subtotal.
 *
 * **Invariante 1 — `active === false` ⇒ `reached === false`.** É a asserção que mata o defeito
 * descrito no topo do arquivo. As quatro superfícies que zeram frete perguntam "atingiu?"; se
 * `reached` pudesse ser verdadeiro com a funcionalidade desligada, o defeito voltaria pela porta dos
 * fundos e ninguém veria — o texto sumiria da tela e o frete continuaria zerado.
 *
 * **Invariante 3 — `active === false` ⇒ `threshold === 0`.** O estado devolvido é auto-consistente:
 * uma superfície que renderize `state.threshold` não consegue vazar o número guardado enquanto a
 * funcionalidade está desligada.
 *
 * O cupom do tipo `free_shipping` **não passa por aqui**: ele é ato explícito da dona, vive em
 * `resolveOrderPricing` e não é governado pelo interruptor (decisão do usuário, `context.md` Q2).
 */
export const freeShippingState = (
  config: FreeShippingConfig,
  subtotal: number,
): FreeShippingState => {
  if (!ativo(config)) return INATIVO

  const threshold = config.free_shipping_threshold
  // Subtotal impossível (`NaN` de um preço quebrado) vira zero em vez de contaminar `percent`: a
  // barra some para o começo, que é o estado honesto, em vez de virar `width: NaN%`.
  const base = finito(subtotal) ? subtotal : 0
  const remaining = Math.max(threshold - base, 0)

  return {
    active: true,
    threshold,
    remaining,
    // Limitado nas DUAS pontas: subtotal negativo (crédito, devolução em memória) daria barra
    // negativa, que no CSS vira largura inválida e a barra desaparece sem explicação.
    percent: Math.min(Math.max((base / threshold) * 100, 0), 100),
    reached: remaining <= 0,
  }
}

/**
 * A configuração é gravável? `null` = sim; `string` = o motivo, em português, para exibir no campo.
 *
 * **`string | null` e não união discriminada por booleano.** Com `strictNullChecks: false`,
 * `{ ok: true } | { ok: false; reason: string }` **não estreita**, e ler `.reason` no ramo do `else`
 * é erro de compilação (TS2339). Formato já usado por `menuSlotRefusal` e `reservedSlugRefusal`
 * (`CLAUDE.md`).
 *
 * O que ela impede (`FRG-12`): o painel exibir "frete grátis ligado" enquanto a loja se comporta
 * como desligada. Divergência silenciosa entre o que a dona lê e o que a cliente vive é exatamente a
 * família de defeito que esta feature existe para fechar — deixá-la entrar pela porta do editor
 * seria trocar um segundo dono por outro.
 */
export const freeShippingRefusal = (config: FreeShippingConfig): string | null => {
  if (!config?.free_shipping_enabled) return null
  if (!finito(config.free_shipping_threshold) || config.free_shipping_threshold <= 0) {
    return 'Para oferecer frete grátis, informe a partir de qual valor. Com zero, a loja anunciaria uma faixa que ela não consegue aplicar.'
  }
  return null
}
