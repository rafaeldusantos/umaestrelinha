/**
 * Para onde vai o foco quando o controle que a Adri tocou sai da tela.
 *
 * O ponto estável do detalhe é o título da página (`main h1`), focável por script sem entrar na ordem
 * do Tab. Dois leitores: a folha do rastreio, que devolve o foco a quem a abriu (`75`, C03), e
 * "Colocar em produção" (`82`), que some no sucesso — achado na prova em navegador da `82` (T15): o
 * foco caía no `<body>` e o leitor de tela recomeçava do topo.
 */
export const tituloDaPagina = (): HTMLElement | null => {
  const h1 = document.querySelector<HTMLElement>('main h1')
  if (h1 && !h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
  return h1
}

/** Devolve o foco a `origem`; se ela saiu da tela (ou é `null`), ao título da página. */
export const devolverFoco = (origem: HTMLElement | null) => {
  const alvo = origem && origem.isConnected ? origem : tituloDaPagina()
  alvo?.focus({ preventScroll: true })
}
