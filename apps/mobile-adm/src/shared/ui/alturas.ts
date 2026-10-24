/**
 * As alturas do que fica PRESO ao pé da tela no app do ateliê (feature `75`, `MAA-31`; design §3.6).
 *
 * Três coisas empilham no fim da tela: a barra de abas (sempre), o rodapé da ação do pedido (só no
 * detalhe com ação) e a confirmação de uma ação (por 5 s). Cada uma precisa saber a altura das de
 * baixo. Escritas em três lugares, as três divergiriam sem nada quebrar — o aviso ficaria por baixo
 * do rodapé, ou o rodapé cobriria o último bloco —, e jsdom devolve 0 para toda medida de layout.
 * Por isso a altura de cada elemento mora AQUI, uma vez:
 *
 * - **a barra** é `4rem` (`ALTURA_DA_BARRA`). As classes abaixo a escrevem por extenso porque o
 *   Tailwind só gera a classe que lê LITERAL no fonte (nada de template); `alturas.test.ts` confere
 *   que cada uma contém a mesma medida, e que `h-16` é `4rem`.
 * - **o rodapé** cresce com a fonte do sistema (130 %, 200 %, `MAA-33`) e com a frase de erro acima
 *   do botão: a altura dele não é constante. Ele a PUBLICA na variável CSS `--altura-do-rodape` da
 *   raiz do documento (medida pelo próprio rodapé), com `4rem` de piso enquanto não mediu. A reserva
 *   no fim do detalhe e o aviso leem a MESMA variável.
 */

/** A altura da barra de abas. */
export const ALTURA_DA_BARRA = '4rem'
/** A classe da altura da barra (`h-16` = 16 × 0,25 rem = `4rem`). */
export const CLASSE_DA_BARRA = 'h-16'
/** A reserva do layout para a barra fixa: a barra mais o inset do sistema, a mesma soma que ela ocupa. */
export const RESERVA_DA_BARRA = 'h-[calc(4rem+env(safe-area-inset-bottom))]'

/** A variável CSS (na raiz do documento) com a altura medida do rodapé da ação. */
export const VAR_ALTURA_DO_RODAPE = '--altura-do-rodape'
/** O piso do rodapé enquanto ele não se mediu: o botão de 48 px mais 8 px em cima e embaixo. */
export const ALTURA_MINIMA_DO_RODAPE = '4rem'

/** O rodapé da ação fica logo acima da barra. */
export const RODAPE_ACIMA_DA_BARRA = 'bottom-[calc(4rem+env(safe-area-inset-bottom))]'
/** A reserva no fim do detalhe: a altura do rodapé, medida (ou o piso). */
export const RESERVA_DO_RODAPE = 'h-[var(--altura-do-rodape,4rem)]'

/** A confirmação, sem rodapé: acima da barra, com 8 px de folga. */
export const AVISO_ACIMA_DA_BARRA = 'bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)]'
/** A confirmação, com rodapé: acima da barra E do rodapé, com 8 px de folga. */
export const AVISO_ACIMA_DO_RODAPE = 'bottom-[calc(4rem+var(--altura-do-rodape,4rem)+env(safe-area-inset-bottom)+0.5rem)]'
