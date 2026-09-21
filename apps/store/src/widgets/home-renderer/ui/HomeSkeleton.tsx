import { Skeleton } from '@estrelinha/ui/skeleton'

/**
 * A Home antes de saber qual é a Home — o **terceiro estado**, ao lado de erro e lista vazia.
 *
 * **Ele não afirma NADA sobre conteúdo, e é esse o ponto.** O que ocupava este lugar até
 * 2026-09-21 era a composição semeada, pintada por `placeholderData` em `useHomeSections`: com a
 * "Chamada principal" desligada e o "Banner principal" ligado — uma Home legítima desde que a
 * feature `41` derrubou o trigger do hero (`AD-029`) — a cliente via a chamada de 2026-08 entrar,
 * animar e sumir. O bloco vinha do bundle, nunca do banco: a policy pública devolve só
 * `active = true`. Duas faixas neutras não têm como mentir sobre qual bloco vem primeiro.
 *
 * **A altura é a régua, e ela sai de uma medida.** O CLS só conta nó que existe nos DOIS quadros e
 * se moveu dentro da viewport. Entre o quadro do esqueleto e o do conteúdo, o `<header>` é
 * `sticky`, a `MobileNav` e a bolha do WhatsApp são `fixed`, e o esqueleto desmonta enquanto o
 * `HomeRenderer` monta — sobra **um** nó persistente, o `<footer>`. Era ele, sozinho, que produzia
 * os **CLS 0,244** que a feature `40` mediu e fechou. Logo a régua não é "a altura do hero": é
 * *"o rodapé nasce fora de vista"*. Uma viewport basta, com folga da altura do header:
 *
 * | viewport | header | até a dobra |
 * | --- | ---: | ---: |
 * | 390 × 844 | 64 (`h-16` — a faixa de departamentos é `hidden md:block`) | 780 |
 * | 1440 × 900 | 136 (`md:h-[84px]` + `h-[52px]`) | 764 |
 *
 * **Não é `calc(100vh - 4rem)`**: a altura do header viraria uma segunda escrita, que é o defeito
 * que `folgaDoHeader.test.ts` existe para pegar. `100vh` no celular é o *large viewport*, ou seja
 * sempre ≥ a área visível — sobre-reserva, que aqui é de graça: o conteúdo que substitui o
 * esqueleto é sempre mais alto que uma tela.
 *
 * **Nenhum teste prende a altura, e isso está aqui por escrito**: jsdom devolve 0 para toda medida
 * de layout, então trocar `min-h-screen` por `min-h-[60vh]` passa em toda a suíte. A prova é o
 * navegador, em 390×844 e 1440×900, com o rodapé fora de vista durante o esqueleto.
 *
 * `bg-estrelinha-ground-deep` sobre `ground` é presença, não desenho — o mesmo tom que o palco de
 * foto do `ProductCardSkeleton` usa. Quem anuncia o carregamento é o `aria-busy` do contêiner, pelo
 * mesmo par que a `CategoryPage` já usa; o conteúdo é `aria-hidden` para o leitor de tela não
 * recitar a moldura.
 */
const HomeSkeleton = () => (
  <div aria-busy="true" aria-label="Carregando a página inicial">
    <div aria-hidden className="container flex min-h-screen flex-col gap-4 py-8 md:gap-6 md:py-12">
      {/* A VAGA do primeiro bloco — um retângulo, e nada além disso. `flex-1` a faz ocupar o que
          sobra da tela, seja o primeiro bloco um hero ou um banner de campanha. */}
      <Skeleton className="w-full flex-1 rounded-lg bg-estrelinha-ground-deep" />
      {/* A faixa que insinua a dobra seguinte, colada na linha da viewport. */}
      <Skeleton className="h-[72px] w-full shrink-0 rounded-lg bg-estrelinha-ground-deep" />
    </div>
  </div>
)

export default HomeSkeleton
