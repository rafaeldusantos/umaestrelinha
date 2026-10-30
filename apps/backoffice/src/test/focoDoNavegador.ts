// Conserto do QA da feature `88` (BUG foco-cai-no-body-nas-acoes-do-pedido).
//
// jsdom NÃO faz o que o navegador faz quando o elemento focado fica desabilitado: o Chromium aplica a
// "focus fixup rule" e o foco cai no `<body>`. Sem isto, todo teste de "para onde vai o foco depois de
// gravar" passaria nos dois mundos, porque o botão desabilitado e reabilitado continuaria focado.
// Medido no QA (`document.activeElement` = BODY em seis casos) e reproduzido aqui: um observador que,
// quando o elemento focado ganha `disabled` ou sai do documento, tira o foco dele.

export function simularFocoDoNavegador(): () => void {
  const obs = new MutationObserver(() => {
    const ativo = document.activeElement as HTMLElement | null
    if (!ativo || ativo === document.body) return
    if (!(ativo as HTMLButtonElement).disabled) return
    // O `blur()` do jsdom não age sobre elemento desabilitado (ele deixa de ser "área focável"). Para
    // levar o foco ao `<body>`, foca um elemento temporário e o remove — o jsdom então zera o foco.
    const temp = document.createElement('button')
    document.body.appendChild(temp)
    temp.focus()
    temp.remove()
  })
  obs.observe(document.body, { attributes: true, attributeFilter: ['disabled'], subtree: true, childList: true })
  return () => obs.disconnect()
}
