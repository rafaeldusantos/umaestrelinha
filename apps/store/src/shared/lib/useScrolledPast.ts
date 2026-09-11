import { useEffect, useState, type RefObject } from 'react'

/**
 * O elemento de referência já passou para CIMA da tela?
 *
 * Serve a barra de compra da página do produto, que só entra depois que a foto principal sai —
 * enquanto a cliente olha a joia, os 88px do rodapé são dela. É o mesmo tipo de moldura que se
 * recolhe do `useScrollDirection`, mas a pergunta é outra: lá é **para que lado** a pessoa rola,
 * aqui é **onde** ela está em relação a um elemento. Misturar as duas num hook só daria um
 * parâmetro de modo e duas respostas que não se usam juntas.
 *
 * **`IntersectionObserver`, e não `scroll` + `getBoundingClientRect`.** A medida é de layout, e
 * fazê-la a cada evento de rolagem é o caminho curto para travar o dedo no celular — de onde vêm
 * ~90% dos acessos. O observer mede fora da thread de composição e só acorda no cruzamento.
 *
 * **O padrão de falha é MOSTRAR, nunca esconder.** Sem observer (jsdom, navegador antigo) ou sem
 * elemento de referência, devolve `true`. Esta barra é a **única** superfície de compra do celular:
 * escondê-la por falta de um recurso de medição tiraria a loja do ar em silêncio, enquanto mostrá-la
 * cedo demais custa no máximo um rodapé visível antes da hora.
 */
export const useScrolledPast = (ref?: RefObject<Element | null>): boolean => {
  // O estado inicial é o próprio padrão de falha: sem `IntersectionObserver` o efeito abaixo não
  // tem o que observar, e um `false` inicial deixaria a barra escondida para sempre.
  const [past, setPast] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const alvo = ref?.current
    if (!alvo || typeof IntersectionObserver === 'undefined') {
      setPast(true)
      return
    }

    const observer = new IntersectionObserver(entries => {
      const entry = entries[entries.length - 1]
      // `bottom <= 0` separa "já passou" de "ainda não chegou": `isIntersecting` é `false` nos DOIS
      // casos, e sem este recorte a barra apareceria durante o primeiro quadro de uma página que
      // ainda não pintou a foto — que é justamente quando ela não deve aparecer.
      setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= 0)
    })

    observer.observe(alvo)
    return () => observer.disconnect()
  }, [ref])

  return past
}
