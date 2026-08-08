// Quem manda no rodapé fixo da loja no celular.
//
// A loja tem DUAS barras candidatas ao rodapé: o `MobileNav` (as quatro abas) e a barra de compra da
// página do produto. Empilhar as duas somava 133px de rodapé — com o header, 30% de um iPhone SE. A
// regra passou a ser **uma por vez**: onde a página tem uma ação de transação, ela ocupa o lugar das
// abas. É a mesma decisão que já tirou o checkout do `StoreLayout` (ver o comentário em `App.tsx`) e
// o que Nike, Zara, Farfetch e o app da Amazon fazem na página de produto.

/**
 * A altura das duas barras — e, por isso, a altura da reserva no fim do documento.
 *
 * É uma constante só de propósito: com `MobileNav` e barra de compra na MESMA altura, o espaço
 * reservado no fim do documento é **incondicional** (existe sempre exatamente uma barra de 4rem),
 * e o layout não precisa saber qual delas está montada para reservar o tanto certo.
 */
export const BOTTOM_BAR_H = '4rem'

/** A reserva de fim de documento, já com a área segura do iPhone. */
export const BOTTOM_BAR_RESERVE = `calc(${BOTTOM_BAR_H} + env(safe-area-inset-bottom))`

/**
 * Esta rota traz a **própria** barra de rodapé, e portanto dispensa o `MobileNav`?
 *
 * Predicado puro, e não um `useLocation` escondido dentro do `MobileNav` (como faz o
 * `WhatsAppFloat`), porque a resposta tem **duas** consequências, em arquivos diferentes: qual barra
 * renderiza e — se as alturas divergirem um dia — quanto o documento reserva. Duas cópias da regra é
 * exatamente o jeito de elas discordarem, e uma discordância aqui esconde conteúdo atrás de barra.
 *
 * `/checkout` não entra na lista porque nem chega aqui: mora fora do `StoreLayout`.
 */
export const ownsBottomBar = (pathname: string): boolean => pathname.startsWith('/produto/')
