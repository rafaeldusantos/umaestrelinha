import { useEffect, useState } from 'react'

/** O foco está num campo de texto DENTRO de uma busca (`role="search"`, o invólucro de `CampoDeBusca`)? */
const emBusca = (el: EventTarget | Element | null): boolean =>
  el instanceof HTMLElement && el.matches('input, textarea') && el.closest('[role="search"]') !== null

/**
 * Se o foco está no campo de busca de uma lista (conserto do QA da `76`,
 * `BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca`).
 *
 * Com o teclado aberto sobra pouco da tela, e a barra de abas fixa embaixo cobria a primeira linha do
 * resultado — a 130 % e a 200 % de fonte, a primeira linha ficava INTEIRA atrás da barra. O layout usa
 * este sinal para tirar a barra de cena enquanto se digita (a reserva dela no fim da página fica, para
 * a tela não pular). Escuta o documento, e não um `ref`: o campo mora nas páginas e o layout é quem
 * decide; nenhum dos dois conhece o outro. Só o campo de **busca**: o do rastreio, numa folha, não
 * mexe na barra.
 */
export const useBuscaEmFoco = (): boolean => {
  const [emFoco, setEmFoco] = useState(() => typeof document !== 'undefined' && emBusca(document.activeElement))

  useEffect(() => {
    // Um toque que TIRA o foco da busca não pode mexer no layout antes do clique
    // (`BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco`): o título e a linha
    // de frescor voltam, o botão tocado desce, e o clique cai fora dele. Com um dedo no vidro, a saída do
    // foco espera o clique (ou o fim do toque); sem dedo (Enter, teclado) ela é imediata.
    let tocando = false
    let pendente = false
    let prazo: ReturnType<typeof setTimeout> | undefined
    const soltar = () => {
      clearTimeout(prazo)
      tocando = false
      if (pendente) {
        pendente = false
        setEmFoco(false)
      }
    }
    const tocou = () => {
      tocando = true
    }
    const levantou = () => {
      clearTimeout(prazo)
      prazo = setTimeout(soltar, 150)
    }
    const entrou = (e: FocusEvent) => {
      if (emBusca(e.target)) {
        pendente = false
        setEmFoco(true)
        return
      }
      // O foco que CHEGA ao botão tocado (a ordem do navegador é focusout do campo e depois focusin do
      // botão, antes do clique) não solta o sinal: a espera continua até o clique ou o fim do toque.
      if (tocando) {
        pendente = true
        return
      }
      setEmFoco(false)
    }
    const saiu = () => {
      if (tocando) pendente = true
      else setEmFoco(false)
    }
    document.addEventListener('pointerdown', tocou, true)
    document.addEventListener('pointerup', levantou, true)
    document.addEventListener('pointercancel', soltar, true)
    document.addEventListener('click', soltar)
    document.addEventListener('focusin', entrou)
    document.addEventListener('focusout', saiu)
    setEmFoco(emBusca(document.activeElement))
    return () => {
      clearTimeout(prazo)
      document.removeEventListener('pointerdown', tocou, true)
      document.removeEventListener('pointerup', levantou, true)
      document.removeEventListener('pointercancel', soltar, true)
      document.removeEventListener('click', soltar)
      document.removeEventListener('focusin', entrou)
      document.removeEventListener('focusout', saiu)
    }
  }, [])

  return emFoco
}
