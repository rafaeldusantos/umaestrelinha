# Prévia de frete na sacola, com o CEP levado ao checkout

**Protótipo:** `Sacola - Prévia de frete.html`, projeto "Uma Estrelinha - Loja" (migrado do Claude Design para
https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75). **Base:** a gaveta de hoje
(`widgets/cart-drawer`), o cálculo de frete da página do produto (`features/shipping-calc`) e o bloco Entrega do
checkout (`features/checkout/ui/DeliveryBlock.tsx`).
**Estado:** planejamento e protótipo. Nada implementado.

## O problema

Hoje a gaveta da sacola mostra o **Total dos produtos, sem frete**, com a nota "Frete calculado no checkout, com o seu
CEP." (`CartDrawer.tsx`). A cliente só descobre quanto custa a entrega depois de entrar no checkout, preencher o
contato e chegar ao bloco Entrega. A faixa de frete grátis da gaveta diz quanto falta para não pagar frete, mas não
diz quanto é o frete.

O motivo de a gaveta não mostrar frete está escrito no código e continua válido: sem CEP, qualquer número seria a faixa
padrão de `store_settings`, que a cotação real contradiz (a mesma sacola cotou de R$ 17,89 a R$ 163,64 conforme o
destino). **A resposta não é um frete estimado, é pedir o CEP na própria gaveta e mostrar a cotação real.**

A página do produto já tem um cálculo de frete (`ShippingCalc`), mas para **uma** peça. Com duas ou três peças na
sacola, o frete muda (peso e caixa), e a cliente não tem onde ver isso antes do checkout.

## O que a cliente ganha

1. **Calcular o frete na sacola** — campo de CEP e "Calcular" no rodapé da gaveta, com as mesmas opções, preços e
   prazos que o checkout vai mostrar.
2. **Ver o Total com o frete** — a forma de envio escolhida entra no resumo da gaveta, e o Total passa a incluir o
   frete.
3. **Não digitar o CEP duas vezes** — ao seguir para o checkout, o bloco Entrega abre com o CEP preenchido, o endereço
   que a busca pelo CEP devolve, e a mesma forma de envio já marcada. Falta só o número.

## Casos de uso

### UC-01 · Calcular o frete na sacola
- No rodapé fixo da gaveta, acima do cupom: título "Calcular frete e prazo", campo de CEP (`00000-000`, teclado
  numérico, `autocomplete="postal-code"`) e o botão "Calcular", de contorno (não compete com "Finalizar Pedido").
- Calcular com o CEP incompleto ⇒ "CEP inválido" junto do campo, sem chamar a cotação.
- Calculando: o botão mostra o indicador de progresso e fica desligado; duas vagas de esqueleto no lugar das opções.
- Resultado: o título vira "Frete para 01310-100", com "Trocar CEP" à direita, e as opções aparecem como cartões de
  rádio, no mesmo desenho do bloco Entrega (serviço · transportadora, "Chega entre 18 e 24 de novembro", valor).

### UC-02 · Escolher a forma de envio
- A opção mais barata já vem marcada ao terminar o cálculo, e o valor entra no Total (ver Pergunta 2).
- Tocar numa opção marca e **recolhe a lista** numa linha só: o serviço, o prazo, o CEP e o valor. Tocar na linha
  reabre as opções.
- CEP do RS: aparecem os grupos "Envio a domicílio" e "Retirar em", como no checkout. A retirada **nunca** vem
  marcada (`RET-08`).

### UC-03 · Ver o total com o frete
- O resumo ganha a linha "Frete · PAC" (ou "Retirada no escritório") com o valor, ou "Grátis".
- O Total da gaveta passa a ser produtos − descontos + frete.
- Sem frete escolhido, a gaveta é a de hoje, com a nota "Frete calculado com o seu CEP — aqui ou no checkout."
- **Com frete escolhido, não há nota abaixo do Total** (decisão do usuário, 2026-11-07).

### UC-04 · Seguir para o checkout
- "Finalizar Pedido" leva ao checkout como hoje. O bloco Entrega abre com:
  - o CEP preenchido;
  - rua, bairro, cidade e UF vindos da busca pelo CEP (`useCepLookup`, como já acontece ao digitar);
  - a forma de envio da gaveta já marcada;
  - o foco esperando o número.
- A linha "Trazido da sua sacola · Bela Vista — São Paulo/SP", sob o campo de CEP, diz de onde veio o valor.
- O checkout cota de novo (o cache é o mesmo, ver RN-01). Se o preço da opção mudou, vale o preço novo. Se a opção
  sumiu da cotação, a escolha é desfeita e a cliente escolhe outra, como hoje quando o CEP muda.

### UC-05 · A sacola mudou depois do cálculo
- Mudar a quantidade, remover ou acrescentar uma peça faz a cotação refazer sozinha, com o mesmo CEP. A opção
  escolhida continua marcada se ainda existir, com o preço novo; se não existir, volta a mais barata.
- A faixa de frete grátis e o "Grátis" da opção acompanham o subtotal novo na hora.
- Esvaziar a sacola mostra a gaveta vazia de hoje; o CEP continua guardado para a próxima peça.

### UC-06 · Quando a cotação não responde
- Falha de rede ou do Melhor Envio: "Não consegui consultar o frete agora. Tente de novo — ou siga para o checkout,
  onde ele é calculado outra vez.", com "Tentar de novo". O Total fica sem frete e "Finalizar Pedido" segue
  funcionando.
- CEP sem nenhuma opção: "Nenhuma opção de frete disponível para este CEP. No checkout, você pode tentar outro
  endereço."
- A gaveta **não** oferece o "Frete padrão" que o checkout usa quando a cotação falha (`SHP-05`): na gaveta isso seria
  um número que a cliente leria como o frete dela.

## Regras

- **RN-01 · Uma cotação só.** A gaveta usa `useShippingQuote` (`features/checkout/api`), com a mesma chave do
  checkout (`[SHIPPING_QUOTE_KEY, cep, impressão da sacola]`) e o mesmo `toQuotePayload`. Gaveta e checkout leem o
  mesmo cache, e a cotação do checkout logo depois é a mesma, sem nova chamada. Nada de segunda chamada ao
  `melhor-envio` escrita na gaveta.
- **RN-02 · As mesmas opções e os mesmos prazos.** Só opções com preço > 0, o prazo com os `handling_days` somados
  (`quoteToEstimate`, `formatEstimate`, `SHP-09`), na mesma ordem e com os mesmos nomes do bloco Entrega. Se a gaveta e
  o checkout mostrarem prazos diferentes para o mesmo CEP, é defeito (foi o que a página do produto já teve).
- **RN-03 · Frete grátis pela regra de hoje.** Quem decide é `freeShippingState` (`useFreeShipping`): com o interruptor
  desligado, nada fica grátis; com a faixa alcançada, **só a opção mais barata** sai "Grátis", com o valor riscado
  (`DeliveryBlock.tsx:312`). O cupom de frete grátis zera o frete dentro de `resolveOrderPricing`, nunca na tela.
  `freeShippingSingleOwner.test.ts` continua valendo: a gaveta não lê `free_shipping_threshold`.
- **RN-04 · O total tem um dono.** O Total da gaveta sai de `resolveOrderPricing` com o frete cotado, pelo
  `useCartPromotion`, que hoje passa `shipping: 0` (`useCartPromotion.ts:177`). Somar o frete na tela daria um total
  que o checkout não cobra.
- **RN-05 · O CEP e a escolha têm um lugar só: o rascunho do checkout.** A gaveta grava `address.cep` e `shipping`
  no `checkoutStore` padrão (o de `/checkout`, chave `estrelinha-checkout`, em `sessionStorage`), pelos mesmos
  `setAddress`/`setShipping` do bloco Entrega. Uma chave nova (`estrelinha-cart-cep`, por exemplo) seria um segundo
  dono do CEP, e os dois divergiriam (o "defeito 01"). Consequência aceita: fechar a aba esquece o CEP, como já
  acontece com o rascunho do checkout.
- **RN-06 · A gaveta nunca escreve no rascunho do pedido montado.** `/pedido-montado` usa outra instância do
  `checkoutStore` (feature `89`); a gaveta grava só na padrão.
- **RN-07 · A retirada é a do checkout.** Mesma porta (`usePickupOptionState`), mesmas condições (interruptor, endereço
  do escritório completo, CEP do RS), mesma linha de endereço, nunca pré-marcada. Escolhida na gaveta, chega ao
  checkout escolhida, e o servidor continua recusando a forjada (`pickup_unavailable`).
- **RN-08 · O cupom enxerga o frete escolhido.** O `CouponInput` da gaveta recebe hoje `shippingCost` igual a 0 (faixa
  alcançada) ou ao `default_shipping_cost`. Com o frete escolhido, passa a receber o valor cotado.
- **RN-09 · Trocar o CEP desfaz a escolha.** Na gaveta e no checkout, como já é no bloco Entrega.
- **RN-10 · O tom da loja.** Sem urgência, sem exclamação nova, sem prometer data que a cotação não deu. Copy na
  primeira pessoa da Adri onde já é ("Não consegui consultar…"), mensagens técnicas impessoais.
- **RN-11 · Celular primeiro.** Em 390×844: nada rola na horizontal; alvos de 44px (campo, botão, cada opção, "Trocar
  CEP"); a lista aberta pode ocupar o rodapé enquanto a cliente escolhe (os itens rolam acima dela), e recolhe ao
  escolher; o rodapé nunca passa da altura da tela (rola por dentro se precisar). Fonte do sistema a 200 % sem quebrar
  o valor da opção.
- **RN-12 · Movimento.** Indicador de progresso pode girar (é indicador, não enfeite); qualquer outra transição tem par
  `motion-reduce:`.

## Fora

- Levar para a sacola o CEP calculado na página do produto (`ShippingCalc`) — Pergunta 4.
- Lembrar o CEP entre visitas (`localStorage`).
- Estimativa de frete sem CEP (faixa padrão, "a partir de").
- Mudar o cálculo de frete da página do produto.
- Qualquer mudança em `packages/core/src/payment/**` além de passar o frete cotado como entrada.

## Critérios de aceite

- **CA-01** Com a sacola com peças, a gaveta mostra o campo de CEP e "Calcular" no rodapé; com a sacola vazia, não.
- **CA-02** CEP com menos de 8 dígitos ⇒ "CEP inválido", nenhuma chamada à cotação.
- **CA-03** CEP válido ⇒ as mesmas opções, preços e prazos que o bloco Entrega mostra para a mesma sacola e o mesmo
  CEP; a segunda leitura (no checkout) não chama o `melhor-envio` de novo.
- **CA-04** A mais barata vem marcada e o Total soma o frete; o Total da gaveta é igual ao do resumo do checkout com a
  mesma opção, cupom e promoção.
- **CA-05** Tocar numa opção recolhe a lista numa linha com serviço, prazo, CEP e valor; tocar na linha reabre.
- **CA-06** Com a faixa de frete grátis alcançada, só a mais barata sai "Grátis", com o valor riscado; com o interruptor
  desligado, nenhuma; com cupom de frete grátis, todas, e a linha do resumo diz "Grátis".
- **CA-07** CEP do RS com a retirada disponível ⇒ grupos "Envio a domicílio" e "Retirar em"; a retirada nunca vem
  marcada; escolhida, o resumo diz "Retirada no escritório · Grátis".
- **CA-08** Com frete escolhido, não aparece nota abaixo do Total; sem frete, aparece "Frete calculado com o seu CEP —
  aqui ou no checkout."
- **CA-09** "Finalizar Pedido" ⇒ o bloco Entrega abre com o CEP, o endereço da busca, a opção da gaveta marcada, a linha
  "Trazido da sua sacola", e o foco no Número.
- **CA-10** Mudar a quantidade depois do cálculo refaz a cotação com o mesmo CEP e mantém a opção escolhida (com o
  preço novo) se ela existir.
- **CA-11** Falha da cotação ⇒ a mensagem de falha com "Tentar de novo"; Total sem frete; "Finalizar Pedido"
  funcionando; nenhum "Frete padrão" na gaveta.
- **CA-12** Pagar um pedido montado (`/pedido-montado`) não lê nem apaga o CEP da sacola, e a gaveta não escreve no
  rascunho dele.
- **CA-13** Em 390×844 e 1440×900, com a lista aberta e recolhida: sem rolagem horizontal, alvos de 44px, rodapé dentro
  da tela.

## Plano técnico (para a spec)

| Peça | Onde | Nota |
| --- | --- | --- |
| O frete na gaveta | `widgets/cart-drawer/ui/CartShipping.tsx` (novo), montado no rodapé de `CartDrawer.tsx` | consome `useShippingQuote` e a porta da retirada; widget → feature é import permitido. O desenho dos cartões vem do bloco Entrega: extrair o cartão de opção para um componente que os dois usam, e não copiar as classes (o "defeito 01" no tamanho de um componente) |
| O CEP e a escolha | `features/checkout/model/checkoutStore.ts` | já tem `address.cep` e `shipping`; a gaveta usa o store **padrão** pelos setters de hoje. Nenhuma chave nova de storage |
| A pré-seleção e o frete grátis por opção | hoje dentro de `DeliveryBlock.tsx` (`options`, `cheapestQuoteId`, `toDraft`) | sobem para uma função compartilhada (em `features/checkout/lib`) que a gaveta e o bloco Entrega chamam: a mesma lista de opções nos dois lugares |
| O total | `entities/cart/model/useCartPromotion.ts` | passa a receber o frete cotado e o entrega a `resolveOrderPricing` no lugar do `0` |
| O checkout recebendo | `DeliveryBlock.tsx` | com `address.cep` já preenchido, o endereço salvo de quem tem conta não é semeado (`DeliveryBlock.tsx:244`) — ver Pergunta 1. A escolha vinda da gaveta não pode ser apagada pelo efeito de "CEP mudou" na montagem (`lastCep` nasce com o valor atual, então hoje já não apaga) |
| A linha "Trazido da sua sacola" | `DeliveryBlock.tsx` | precisa de uma marca de origem no rascunho (o CEP veio da gaveta), sem virar segundo dono do CEP. Detalhe na spec |
| Medição | `add_shipping_info` (feature `61`, `EVT-11`) | hoje um evento por toque no bloco Entrega — ver Pergunta 3 |
| Guardas | `freeShippingSingleOwner`, `touchTarget`, `accentText`, `fieldBorder`, `movimentoDaContaRespeitaMovimento` (escopo, se a gaveta entrar) | o campo de CEP usa a borda `field`; o valor da opção em `primary` |

## Perguntas em aberto

1. **Cliente com conta e endereço salvo.** Hoje o checkout preenche o endereço salvo só quando o CEP está vazio. Se a
   cliente calculou com outro CEP na gaveta, qual vale? Recomendação: **o da gaveta** (foi o que ela acabou de
   digitar). E se o CEP da gaveta for igual ao do endereço salvo, o endereço salvo inteiro entra (número e
   complemento), e o bloco abre recolhido como hoje.
2. **A mais barata já marcada.** O protótipo marca a mais barata ao calcular, para o Total já sair com frete. No
   checkout, CEP digitado com duas ou mais opções **não** pré-marca (só o endereço salvo pré-marca). Manter a
   pré-marcação na gaveta, ou mostrar as opções sem nenhuma marcada até a cliente tocar? Recomendação: **marcar** na
   gaveta e levar essa escolha ao checkout.
3. **`add_shipping_info` na gaveta.** O evento do GA4 marca o passo de entrega do funil do checkout. Recomendação:
   **não** emitir na gaveta; emitir no checkout como hoje, por toque.
4. **O CEP da página do produto.** A página do produto também tem um cálculo de frete. Levar aquele CEP para a gaveta
   seria uma linha, mas ele hoje não fica guardado em lugar nenhum. Recomendação: **fora deste item**.

---
Fonte: escrito na sessão de 2026-11-07 a partir do pedido do usuário, do protótipo `Sacola - Prévia de frete.html`
(projeto "Uma Estrelinha - Loja") e da leitura de `CartDrawer.tsx`, `ShippingCalc.tsx`, `DeliveryBlock.tsx`,
`useShippingQuote.ts`, `checkoutStore.ts` e `useCartPromotion.ts`.
