import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * O elemento apontado pelo fragmento, se ele existir nesta página.
 *
 * `getElementById` e não `querySelector`: o fragmento pode carregar caractere que o seletor CSS lê
 * como sintaxe, e uma URL vinda de fora não pode derrubar a navegação com `SyntaxError`.
 */
const alvoDoFragmento = (hash: string): HTMLElement | null => {
  const cru = hash.slice(1)
  if (!cru) return null
  let decodificado = cru
  try {
    decodificado = decodeURIComponent(cru)
  } catch {
    // `#100%` é URI malformada e `decodeURIComponent` LANÇA. Um `#` datilografado na barra de
    // endereço não pode ser o motivo de a loja não navegar — segue com o fragmento cru.
  }
  return document.getElementById(decodificado) ?? document.getElementById(cru)
}

/**
 * Toda página nova abre no topo.
 *
 * Numa SPA o documento não recarrega: `pushState` troca o conteúdo e o navegador **mantém a posição
 * de rolagem que estava**. Quem clicava num produto no meio de uma categoria longa caía no meio da
 * página do produto — sem foto, sem preço, sem nome —, e o efeito é pior no celular, que é ~90% dos
 * acessos: a viewport curta faz a pessoa aterrissar em qualquer lugar da descrição.
 *
 * Montado uma vez em `App.tsx`, dentro do `BrowserRouter` e **fora** das `Routes`, porque o checkout
 * e o 404 vivem fora do `StoreLayout` — dentro do layout, as duas rotas ficariam de fora.
 *
 * Três coisas que este componente deliberadamente NÃO faz:
 *
 * 1. **Não mexe no botão "voltar" (`POP`).** Restaurar a posição de uma entrada de histórico é do
 *    navegador, e ele já faz (`history.scrollRestoration === 'auto'`). Rolar para o topo aqui
 *    devolveria a cliente ao começo da categoria toda vez que ela voltasse de um produto — que é
 *    exatamente o gesto de quem está garimpando.
 * 2. **Não rouba a âncora que já tem dono.** Os `<a href="#...">` do guia de material são do mesmo
 *    documento: o navegador os resolve sozinho e o React Router nem enxerga o clique (âncora não
 *    dispara `popstate`), então este componente nunca roda por causa deles. O que ele resolve é o
 *    caso **sem dono nenhum**: `Link to="/politicas#trocas"` no rodapé troca de página, e aí a
 *    rolagem do fragmento não é de ninguém — o navegador não a faz em navegação de SPA. Com alvo
 *    existente, vai até ele; **sem alvo, vai ao topo**, porque hoje os três `#` do rodapé não casam
 *    com `id` nenhum de `PoliciesPage` e cair no meio da página é o defeito, não a intenção.
 * 3. **Não reage a mudança só de query string.** Digitar na busca reescreve `?q=` a cada tecla
 *    (`setParams(..., { replace: true })`); rolar ali seria um pulo por caractere. O gatilho é o
 *    **destino** — `pathname` + `hash` —, e o `ref` abaixo é o que garante isso: sem ele, o primeiro
 *    `replace` da busca troca o `navigationType` de `POP` para `REPLACE`, o efeito reroda e a página
 *    salta sem que endereço nenhum tenha mudado.
 */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()
  const previous = useRef<string | null>(null)

  // `useLayoutEffect`, e não `useEffect`: roda **antes da pintura**, então a página nova nunca chega
  // a aparecer rolada. Com `useEffect` o navegador pinta o meio da página e corrige no frame
  // seguinte — um flash visível justamente nos aparelhos mais lentos.
  useLayoutEffect(() => {
    const destino = `${pathname}${hash}`
    if (previous.current === destino) return
    previous.current = destino

    if (navigationType === 'POP') return

    const alvo = alvoDoFragmento(hash)
    if (alvo) {
      alvo.scrollIntoView()
      return
    }

    // Par de argumentos, e não `{ behavior }`: a loja não declara `scroll-behavior: smooth` em lugar
    // nenhum, então isto é instantâneo — e trocar de página com animação de rolagem seria pior que o
    // defeito que este componente conserta.
    window.scrollTo(0, 0)
  }, [pathname, hash, navigationType])

  return null
}

export default ScrollToTop
