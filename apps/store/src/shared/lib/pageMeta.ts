/**
 * O aviso de que a página atual declarou o próprio metadado — feature 62, `MTA-11`..`MTA-14`.
 *
 * Quem escuta é o `PageViewTracker`: o `page_view` do GA4 tem de sair com o título **da página para
 * onde se navegou**, e a página que carrega dado (produto, categoria) só sabe o título depois da
 * resposta. Observar o `<title>` não serve — ele dispara na primeira troca, que pode ser a errada —,
 * e esperar um tempo fixo também não: a resposta do produto passa dos 500 ms que a `61` esperava.
 *
 * O endereço vai junto da declaração porque é ele que diz **de qual navegação** ela é. Lido de
 * `window.location`, e não do router, para o hook continuar usável em teste montado sem router.
 */
export interface PageMetaDeclaration {
  pathname: string
  title: string
}

type Ouvinte = (declaracao: PageMetaDeclaration) => void

const ouvintes = new Set<Ouvinte>()

export const declarePageMeta = (title: string): void => {
  const declaracao = { pathname: window.location.pathname, title }
  for (const ouvir of [...ouvintes]) ouvir(declaracao)
}

/** Assina as próximas declarações. Devolve a função que desassina. */
export const onPageMeta = (ouvir: Ouvinte): (() => void) => {
  ouvintes.add(ouvir)
  return () => {
    ouvintes.delete(ouvir)
  }
}
