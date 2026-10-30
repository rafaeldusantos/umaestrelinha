// Conserto do QA da feature `88` (`BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido`) — para onde o
// foco do teclado volta depois de uma ação que desabilita, troca ou apaga o controle que a disparou.
//
// O defeito tinha uma causa só, em vários lugares: o botão que grava fica DESABILITADO enquanto grava
// (`CRG-02`), e um elemento desabilitado perde o foco para o `<body>`; ou o botão SOME depois de
// gravar (o próximo passo muda, o avião vira "enviado", o cartão sai da fila). Nos dois casos o leitor
// de tela recomeça do topo da página.
//
// A regra: volta ao controle de origem se ele ainda existe e aceita foco; senão, à primeira
// alternativa que existe (o bloco, o cartão, o título da página). Um bloco sem `tabindex` ganha
// `tabindex="-1"` — recebe o foco por programa e não entra na ordem do Tab.

/** O elemento ainda está na página e aceita foco agora. */
export function aceitaFoco(el: Element | null | undefined): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  if (!el.isConnected || el === document.body) return false
  if ((el as HTMLButtonElement).disabled) return false
  if (el.closest('[aria-hidden="true"], [inert]')) return false
  return true
}

export type Alternativa = () => Element | null | undefined

/**
 * Põe o foco na origem ou na primeira alternativa que existe. Devolve o elemento focado, ou `null`
 * quando nenhum serviu (o foco fica onde estava).
 */
export function devolverFoco(origem: Element | null | undefined, ...alternativas: Alternativa[]): HTMLElement | null {
  const candidatos: (Element | null | undefined)[] = [origem]
  for (const alt of alternativas) candidatos.push(alt())
  for (const c of candidatos) {
    if (!(c instanceof HTMLElement) || !c.isConnected || c === document.body) continue
    if ((c as HTMLButtonElement).disabled) continue
    if (c.closest('[aria-hidden="true"], [inert]')) continue
    if (c.tabIndex < 0 && !c.hasAttribute('tabindex')) c.setAttribute('tabindex', '-1')
    c.focus()
    if (document.activeElement === c) return c
  }
  return null
}

/** O bloco de onde o gesto saiu: o título dele (`h2`/`h3`) ou o próprio `section`. */
export function blocoDe(origem: Element | null | undefined): Alternativa {
  const secao = origem instanceof Element ? origem.closest('section, li, [data-bloco]') : null
  return () => {
    if (!secao || !secao.isConnected) return null
    return secao.querySelector('h2, h3') ?? secao
  }
}

/** O título da página (`h1`) — a última alternativa. */
export const tituloDaPagina: Alternativa = () => document.querySelector('main h1, h1')
