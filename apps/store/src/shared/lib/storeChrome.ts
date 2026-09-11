import { productPath } from '@estrelinha/core/routes'

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

/**
 * A altura da barra de COMPRA da página do produto.
 *
 * Ela é maior que a das abas desde a feature 42, e isso desfez a igualdade que deixava a reserva do
 * `StoreLayout` ser incondicional. **Não é um segundo dono**: quem responde "qual barra está nesta
 * rota?" continua sendo `ownsBottomBar`, e as duas consequências da resposta — qual barra monta e
 * quanto o documento reserva — passam a sair da MESMA porta (`bottomBarReserve`, abaixo). Duas
 * cópias da regra é como o rodapé fica atrás da barra em metade das rotas.
 *
 * São 88px, contra os 64 de antes: a barra tem duas faixas — preço (com o valor no Pix) e ação. A
 * de uma faixa só não cabia. Em 390px, `Adicionar ao carrinho` disputava largura com o preço e o
 * favoritar, e como o botão é `grow` com `whitespace-nowrap` e **sem `min-w-0`**, ele não encolhia
 * abaixo do próprio texto: a fileira estourava ~18px e o coração saía da tela. É a lição do
 * `minmax(0, …)` do `CLAUDE.md`, na versão flex.
 *
 * Continua **muito** abaixo dos 133px que a regra de uma-barra-por-vez existe para impedir.
 */
export const BUY_BAR_H = '5.5rem'

/**
 * O prefixo da página de produto, derivado do **mesmo construtor** que monta os links
 * (`@estrelinha/core/routes`).
 *
 * Escrever `'/produtos/'` à mão aqui seria a segunda cópia do formato da URL: a feature 23 mudou o
 * caminho de `/produto/` para `/produtos/` (`AD-018`), e uma cópia esquecida faria o `MobileNav` e a
 * barra de compra aparecerem **juntos** — o empilhamento de 197px que esta regra existe para
 * impedir.
 */
const PRODUCT_PREFIX = productPath('')

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
export const ownsBottomBar = (pathname: string): boolean => pathname.startsWith(PRODUCT_PREFIX)

/**
 * A altura da barra que ESTA rota monta.
 *
 * Deriva de `ownsBottomBar` de propósito: a pergunta é uma só, e responder duas vezes — uma para
 * escolher a barra, outra para dimensionar a reserva — é o "defeito 01" aplicado ao rodapé. Com as
 * duas leituras divergindo, a página do produto reservaria 64px para uma barra de 88 e a última
 * faixa do rodapé ficaria atrás dela, exatamente o defeito que a reserva veio consertar.
 */
export const bottomBarHeight = (pathname: string): string =>
  ownsBottomBar(pathname) ? BUY_BAR_H : BOTTOM_BAR_H

/** A reserva de fim de documento desta rota, já com a área segura do iPhone. */
export const bottomBarReserve = (pathname: string): string =>
  `calc(${bottomBarHeight(pathname)} + env(safe-area-inset-bottom))`
