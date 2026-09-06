import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'

/**
 * **A pista de que uma faixa rola — `BL-028`.**
 *
 * A feature 39 apagou o teto de itens do menu (decisão do usuário: "não limitar a quantidade de
 * itens em 5"). Antes, o estouro da barra era impossível **por construção**; agora é um estado
 * alcançável, e a resposta desenhada para ele é a faixa rolar dentro de si mesma.
 *
 * O UAT em navegador (2026-09-06, Chromium, 1440×900, 17 itens) provou que **a rolagem funciona e
 * nada vaza** — `nav.scrollWidth` **2619** contra `clientWidth` **1280**, `body` 1440×1440, e o
 * último item alcançável em `scrollLeft` **1339** (= 2619 − 1280). O que ele também mediu é o
 * problema que este hook resolve:
 *
 * - a barra de rolagem do Chromium é **em sobreposição** (`offsetHeight` = `clientHeight` = **52**):
 *   ela não ocupa layout e **não aparece parada**;
 * - a roda **vertical** do mouse sobre a faixa rola a **página** (`window.scrollY` 300,
 *   `nav.scrollLeft` 0), não a faixa;
 * - sobram `shift`+roda, trackpad horizontal e teclado — e o teclado já funciona sozinho: `focus()`
 *   no último item leva `nav.scrollLeft` a 1339.
 *
 * Ou seja: **quem usa mouse num monitor largo pode não descobrir que há itens além da dobra.** Não é
 * bug de código nenhum; é consequência de produto de ter tirado o teto.
 *
 * ## O que este hook NÃO faz, e cada omissão é uma decisão
 *
 * - **Não sequestra a roda vertical.** Mapear `wheel` de eixo Y para rolagem horizontal era a saída
 *   (2) do backlog, e ela quebra a expectativa mais básica do ponteiro: rolar a página com o cursor
 *   por cima de uma barra de 52px passaria a **não rolar a página**. O cabeçalho é `sticky`, então a
 *   faixa continua à vista enquanto a página desce — sequestrar a roda tiraria isso de quem só
 *   estava passando o mouse por ali.
 * - **Não mede nada em jsdom.** `scrollWidth` e `clientWidth` voltam **0** lá, então em teste de
 *   componente o estado nasce "cabe" e nenhuma afordância aparece. É o certo: a medida real é a do
 *   UAT, e o que o teste prova é a **lógica** — com as três medidas fixadas à mão no nó.
 * - **Não guarda o estado num ref.** Ele decide o que RENDERIZA, então precisa ser estado; o que o
 *   `setState` funcional evita é o re-render por pixel rolado (a comparação devolve o objeto
 *   anterior quando nada mudou).
 */

/**
 * Quanto anda um clique de seta, em frações da janela visível.
 *
 * Menos que 1 **de propósito**: uma página cheia deixaria a cliente sem nenhuma referência do que
 * acabou de passar. Com 0,8 sobram ~20% de contexto na borda.
 */
const PAGINA = 0.8

/**
 * Folga em pixels para decidir "chegou ao fim".
 *
 * O navegador devolve `scrollLeft`, `scrollWidth` e `clientWidth` **fracionários** quando há zoom ou
 * densidade não inteira, e o fim da rolagem costuma parar a alguns décimos do máximo. Sem a folga, a
 * seta da direita fica acesa para sempre num fim que já foi alcançado.
 */
const FOLGA = 1

export interface OverflowAffordance {
  /** O container que rola. */
  ref: MutableRefObject<HTMLElement | null>
  /** Há conteúdo escondido **à esquerda** (ou seja: já se rolou). */
  antes: boolean
  /** Há conteúdo escondido **à direita**. */
  depois: boolean
  /** Rola ~uma janela para a esquerda (`-1`) ou para a direita (`1`). */
  rolar: (direcao: -1 | 1) => void
}

/**
 * @param chave valor que muda quando o CONTEÚDO do container muda (ex.: `items.length`). O
 * `ResizeObserver` já cobre o caso no navegador, mas ele observa caixas — e uma troca de curadoria
 * que mantenha a largura da faixa não redimensiona nada. A chave é a segunda rede.
 */
export const useOverflowAffordance = (chave: unknown): OverflowAffordance => {
  const ref = useRef<HTMLElement | null>(null)
  const [estado, setEstado] = useState({ antes: false, depois: false })

  const medir = useCallback(() => {
    const el = ref.current
    const antes = el ? el.scrollLeft > FOLGA : false
    const depois = el ? el.scrollLeft < el.scrollWidth - el.clientWidth - FOLGA : false
    // Funcional e com comparação: `scroll` dispara dezenas de vezes por gesto, e um objeto novo a
    // cada disparo re-renderizaria o header inteiro por pixel rolado.
    setEstado(anterior =>
      anterior.antes === antes && anterior.depois === depois ? anterior : { antes, depois },
    )
  }, [])

  useEffect(() => {
    const el = ref.current
    medir()
    if (!el) return

    el.addEventListener('scroll', medir, { passive: true })

    // Duas caixas observadas, e as duas são necessárias: o próprio container (a janela encolheu) e o
    // filho que carrega o conteúdo (a fila `min-w-max` cresceu). Observar só o container deixaria a
    // seta apagada numa faixa que acabou de estourar.
    const observer = new ResizeObserver(medir)
    observer.observe(el)
    if (el.firstElementChild) observer.observe(el.firstElementChild)

    return () => {
      el.removeEventListener('scroll', medir)
      observer.disconnect()
    }
  }, [medir, chave])

  const rolar = useCallback(
    (direcao: -1 | 1) => {
      const el = ref.current
      if (!el) return
      // `scrollLeft +=`, e não `scrollBy`: a suavização é do CSS (`scroll-smooth`, com
      // `motion-reduce:scroll-auto` ao lado), então atribuir já anima no navegador — e continua
      // sendo uma escrita observável onde não há layout nenhum.
      el.scrollLeft += direcao * el.clientWidth * PAGINA
      medir()
    },
    [medir],
  )

  return { ref, antes: estado.antes, depois: estado.depois, rolar }
}
