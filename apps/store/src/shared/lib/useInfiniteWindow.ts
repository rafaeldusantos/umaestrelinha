import { useEffect, useState } from 'react'

/**
 * Quantos produtos entram por vez na listagem de categoria.
 *
 * 24 fecha fileira nas três grades da página — 2 colunas (mobile denso), 3 (`md`) e 4 (`lg`) — então
 * nenhuma leva enche pela metade. Uma janela menor multiplicaria as paradas numa categoria de 508
 * peças; uma maior devolveria o custo que a janela existe para cortar.
 */
export const PRODUCTS_PER_PAGE = 24

interface InfiniteWindow {
  /** Quantos itens do começo da lista devem ser renderizados agora. Nunca passa de `total`. */
  visibleCount: number
  hasMore: boolean
  loadMore: () => void
  /** Callback ref para o elemento-sentinela, montado logo abaixo da grade. */
  sentinelRef: (node: HTMLElement | null) => void
}

/**
 * Rolagem infinita **sobre uma lista que já está em memória**.
 *
 * A `CategoryPage` filtra, ordena e conta no cliente — `priceBounds`, `collectTags` e o "N produtos"
 * do cabeçalho leem a coleção **inteira**. Paginar no servidor tiraria isso do lugar: a faixa de
 * preço passaria a descrever só as páginas já baixadas e "ordenar por menor preço" ordenaria um
 * pedaço. Então o que esta janela corta é o **DOM**, que é onde estava o custo real — 508
 * `ProductCard` montados de uma vez, num público que é ~90% celular.
 *
 * **Não** substitui paginação de rede: a consulta continua trazendo a categoria toda e seguindo
 * presa ao teto de 1.000 linhas do PostgREST (`BL-008`).
 *
 * `listKey` diz QUAL lista está na tela — coleção, ordenação e filtros. Quando ela troca, a janela
 * volta ao começo: manter a contagem faria um filtro novo abrir já rolado, mostrando o fim de uma
 * lista que a cliente nunca viu.
 *
 * **`listKey` é `string` de propósito, e essa assinatura é cicatriz.** A primeira versão recebia o
 * próprio array de produtos e comparava por identidade — o que funciona enquanto o `data` do React
 * Query for referencialmente estável, e **explode em "Too many re-renders"** no instante em que
 * alguém devolve um array novo a cada render. `routing.test.tsx` faz exatamente isso
 * (`useProducts: () => ({ data: [] })`), e um literal ali derrubava a rota inteira. Chave primitiva
 * não tem esse modo de falhar.
 */
export const useInfiniteWindow = (
  total: number,
  listKey: string,
  pageSize: number = PRODUCTS_PER_PAGE,
): InfiniteWindow => {
  const [count, setCount] = useState(pageSize)
  // O nó vira ESTADO, e não `useRef`: a sentinela some quando a lista acaba e volta quando um filtro
  // é afrouxado. Com `useRef` o efeito não reexecutaria nessas trocas e o observer ficaria preso a um
  // elemento que saiu do DOM — a rolagem infinita pararia de carregar sem nada acusar.
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const [listaAtual, setListaAtual] = useState(listKey)

  // Reancoragem durante o render, mesmo padrão do `anchor` da `CategoryPage`: um `useEffect` deixaria
  // um quadro intermediário com a janela velha aplicada à lista nova.
  if (listaAtual !== listKey) {
    setListaAtual(listKey)
    setCount(pageSize)
  }

  const visibleCount = Math.min(count, total)
  const hasMore = visibleCount < total

  const loadMore = () => setCount(atual => Math.min(atual + pageSize, total))

  useEffect(() => {
    if (!sentinel || !hasMore) return
    // jsdom não tem `IntersectionObserver` — o `setup.ts` fornece um dublê inerte. Em navegador antigo
    // sem a API a página não fica travada: o botão "Carregar mais" abaixo da grade continua sendo o
    // caminho manual, e é o mesmo que o teclado usa.
    if (typeof IntersectionObserver === 'undefined') return

    /*
     * O observer é RECRIADO a cada janela (`count` está nas dependências), e isso é o que impede a
     * rolagem de emperrar.
     *
     * `IntersectionObserver` avisa em TRANSIÇÃO. Numa tela alta, depois de acrescentar 24 cards a
     * sentinela pode continuar visível — e, como não houve transição, nenhum callback novo sairia:
     * a lista pararia no meio com a sentinela parada na frente da cliente. Ao observar de novo, a
     * API dispara o callback imediatamente para alvo já intersectando, e a janela continua abrindo
     * até a sentinela sair de vista.
     */
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setCount(atual => Math.min(atual + pageSize, total))
        }
      },
      // Abre a próxima leva antes de a sentinela aparecer: a cliente encontra os cards já montados
      // em vez de um buraco que preenche depois que ela chegou nele.
      { rootMargin: '600px 0px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasMore, pageSize, total, count])

  return { visibleCount, hasMore, loadMore, sentinelRef: setSentinel }
}
