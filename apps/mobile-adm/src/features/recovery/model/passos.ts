/**
 * Os passos da recuperação por código, cada um com o seu endereço (feature 72, `MAF-24`).
 *
 * Com endereço, cada passo entra no histórico e o voltar do Android volta UM passo — sem interceptar
 * gesto nenhum: é o voltar do navegador. As três rotas estão FORA do `RequireAdmin`, como o
 * `/login` (quem recupera ainda não entrou), e `passosSaoRotas.test.ts` compara esta lista com o
 * `App.tsx` nos dois sentidos.
 *
 * **O e-mail NÃO vai no endereço**: endereço fica no histórico do navegador e é dado pessoal. Ele
 * vai no `history.state` da entrada (`EstadoDoPasso`), que é da aba. Sem estado — o passo do meio
 * aberto direto, ou reaberto depois de o Android matar a aba —, o passo devolve ao primeiro.
 */
export const PASSOS_DA_RECUPERACAO = {
  email: '/recuperar',
  codigo: '/recuperar/codigo',
  senha: '/recuperar/senha',
} as const

export type Passo = keyof typeof PASSOS_DA_RECUPERACAO

/** O que cada entrada do histórico carrega. Nada disso vai na URL. */
export interface EstadoDoPasso {
  email?: string
  /** Quando o reenvio libera (epoch ms). É um prazo, para sobreviver ao voltar e ao avançar. */
  liberaEm?: number
  /** O aviso do passo do código: o envio desta vez, ou um envio de pouco antes (o 429). */
  aviso?: 'enviado' | 'ja-enviado'
  /** O código já abriu a sessão: só com isto o passo da senha nova é desenhado. */
  conferido?: boolean
  /**
   * Quantas entradas a recuperação empilhou sobre a do Login (1 no passo do e-mail aberto pelo
   * "Esqueci minha senha"). Gravada a senha, a recuperação volta EXATAMENTE isso: os passos saem da
   * pilha e o voltar da Início sai do app, sem reabrir um código já usado
   * (`BUG-20261022-voltar-depois-de-salvar-volta-a-recuperacao`).
   */
  profundidade?: number
}

/** O estado da entrada, lido com cuidado: `history.state` pode ser qualquer coisa. */
export const lerEstado = (bruto: unknown): EstadoDoPasso => {
  if (!bruto || typeof bruto !== 'object') return {}
  const s = bruto as Record<string, unknown>
  return {
    email: typeof s.email === 'string' ? s.email : undefined,
    liberaEm: typeof s.liberaEm === 'number' ? s.liberaEm : undefined,
    aviso: s.aviso === 'enviado' || s.aviso === 'ja-enviado' ? s.aviso : undefined,
    conferido: s.conferido === true,
    profundidade:
      typeof s.profundidade === 'number' && Number.isInteger(s.profundidade) && s.profundidade > 0 ? s.profundidade : undefined,
  }
}
