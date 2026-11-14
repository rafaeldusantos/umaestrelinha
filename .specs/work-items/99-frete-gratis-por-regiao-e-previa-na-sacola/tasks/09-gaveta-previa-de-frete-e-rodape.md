## 09 · [apps/store] A gaveta da sacola: a prévia de frete e o rodapé v2

**Status:** done

`UC-01, UC-02, UC-03, UC-05, UC-06 (97); M-04..M-07; UC-08, UC-09 (na gaveta); CA-01..CA-08, CA-10..CA-13 (97); CA-16, CA-17 (gaveta), CA-22 (medida), CA-23, CA-25, CA-26; RN-17, RN-18, RN-20` — 99

**Objetivo.** Na gaveta, a cliente digita o CEP, vê as opções reais com prazo e preço, escolhe uma, e o Total passa a
incluir o frete; a faixa v2 e o rodapé compacto entram, e o CEP e a escolha ficam no rascunho do checkout.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em
todo o repositório" (mobile, chaves de storage), "Os guardas — o que trava o quê", "Feature-Sliced Design";
`apps/store/CLAUDE.md` › "Carrinho, chrome e checkout", "Frete grátis — um interruptor e um dono só (feature 37)",
"Retirada no escritório", "Design system", "Mobile — o que quebra e não grita". Divergindo desta tarefa sobre COMO
fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Gaveta da sacola v2) e §7 Decisões D-01, D-10, D-11, D-13, D-17, D-19.

**Depende de.** Tarefa 03 (`useFreeShipping(subtotal, cep)`), 06 (`deliveryOptions`, `ShippingOptionCard`, `cepOrigin`/
`setCepOrigin`, exportados por `@/features/checkout`) e 08 (`FreeShippingBand`). Confira que existem antes de começar.
**Habilita.** A tarefa 10 (o checkout recebendo o CEP com `cepOrigin: 'sacola'`).

### Critérios de aceite

PRD 97 (verbatim; com as mudanças M-04..M-07 da 99 logo abaixo, que prevalecem):
- **UC-01 · Calcular o frete na sacola**
  - No rodapé fixo da gaveta, acima do cupom: título "Calcular frete e prazo", campo de CEP (`00000-000`, teclado
    numérico, `autocomplete="postal-code"`) e o botão "Calcular", de contorno (não compete com "Finalizar Pedido").
  - Calcular com o CEP incompleto ⇒ "CEP inválido" junto do campo, sem chamar a cotação.
  - Calculando: o botão mostra o indicador de progresso e fica desligado; duas vagas de esqueleto no lugar das opções.
  - Resultado: o título vira "Frete para 01310-100", com "Trocar CEP" à direita, e as opções aparecem como cartões de
    rádio, no mesmo desenho do bloco Entrega (serviço · transportadora, "Chega entre 18 e 24 de novembro", valor).
- **UC-02 · Escolher a forma de envio**
  - A opção mais barata já vem marcada ao terminar o cálculo, e o valor entra no Total (ver Pergunta 2).
  - Tocar numa opção marca e **recolhe a lista** numa linha só: o serviço, o prazo, o CEP e o valor. Tocar na linha
    reabre as opções.
  - CEP do RS: aparecem os grupos "Envio a domicílio" e "Retirar em", como no checkout. A retirada **nunca** vem
    marcada (`RET-08`).
- **UC-03 · Ver o total com o frete**
  - O resumo ganha a linha "Frete · PAC" (ou "Retirada no escritório") com o valor, ou "Grátis".
  - O Total da gaveta passa a ser produtos − descontos + frete.
  - Sem frete escolhido, a gaveta é a de hoje, com a nota "Frete calculado com o seu CEP — aqui ou no checkout."
  - **Com frete escolhido, não há nota abaixo do Total** (decisão do usuário, 2026-11-07).
- **UC-05 · A sacola mudou depois do cálculo**
  - Mudar a quantidade, remover ou acrescentar uma peça faz a cotação refazer sozinha, com o mesmo CEP. A opção
    escolhida continua marcada se ainda existir, com o preço novo; se não existir, volta a mais barata.
  - A faixa de frete grátis e o "Grátis" da opção acompanham o subtotal novo na hora.
  - Esvaziar a sacola mostra a gaveta vazia de hoje; o CEP continua guardado para a próxima peça.
- **UC-06 · Quando a cotação não responde**
  - Falha de rede ou do Melhor Envio: "Não consegui consultar o frete agora. Tente de novo — ou siga para o checkout,
    onde ele é calculado outra vez.", com "Tentar de novo". O Total fica sem frete e "Finalizar Pedido" segue
    funcionando.
  - CEP sem nenhuma opção: "Nenhuma opção de frete disponível para este CEP. No checkout, você pode tentar outro
    endereço."
  - A gaveta **não** oferece o "Frete padrão" que o checkout usa quando a cotação falha (`SHP-05`): na gaveta isso seria
    um número que a cliente leria como o frete dela.
- Regras do PRD 97 que esta tarefa aplica: RN-01 (uma cotação só, `useShippingQuote`), RN-02, RN-03, RN-04 (o total tem
  um dono: `resolveOrderPricing` pelo `useCartPromotion`), RN-05 (o CEP e a escolha no `checkoutStore` padrão, pelos
  `setAddress`/`setShipping`; nenhuma chave nova), RN-06 (nunca escrever no rascunho do pedido montado), RN-07 (a
  retirada do checkout), RN-08 (o `CouponInput` recebe o frete cotado), RN-09, RN-10 (tom), RN-11 (celular primeiro),
  RN-12 (movimento).
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
  aqui ou no checkout." — **mudado por M-06**: "nenhuma nota abaixo do Total".
- **CA-10** Mudar a quantidade depois do cálculo refaz a cotação com o mesmo CEP e mantém a opção escolhida (com o
  preço novo) se ela existir.
- **CA-11** Falha da cotação ⇒ a mensagem de falha com "Tentar de novo"; Total sem frete; "Finalizar Pedido"
  funcionando; nenhum "Frete padrão" na gaveta.
- **CA-12** Pagar um pedido montado (`/pedido-montado`) não lê nem apaga o CEP da sacola, e a gaveta não escreve no
  rascunho dele.
- **CA-13** Em 390×844 e 1440×900, com a lista aberta e recolhida: sem rolagem horizontal, alvos de 44px, rodapé dentro
  da tela. — **prova: navegador, na Validation/QA** (jsdom não mede layout); aqui, as classes que a produzem.

PRD 99 (verbatim):
- **M-04 · Frete sem CEP: sem título.** O campo diz o que é ("CEP para calcular o frete", com o ícone de envio dentro)
  e o botão "Calcular" fica ao lado, numa linha só. Substitui o título "Calcular frete e prazo" + formulário da 97
  (UC-01).
- **M-05 · Frete escolhido: uma linha.** Serviço · transportadora, e embaixo "Chega … · CEP …" (pode quebrar em duas
  linhas no celular, nunca cortar o CEP), o valor e o chevron que reabre as opções. Substitui a linha recolhida da 97
  (UC-02).
- **M-06 · A nota sai nos dois estados.** A 97 mantinha "Frete calculado com o seu CEP — aqui ou no checkout." sem
  frete escolhido (UC-03, CA-08). **Sai sempre** (pedido do usuário, 2026-11-13). CA-08 da 97 passa a ser: "nenhuma
  nota abaixo do Total".
- **M-07 · Respiros.** Cupom recolhido em 44 px, totais com 3 px entre linhas, botão "Finalizar Pedido" de 52 → 48 px
  (continua acima do piso de 44). Medido na v2: rodapé 244 px sem CEP e 265 com CEP; área das peças 486 px.
- **UC-08** (na gaveta): alcançada com CEP da campanha, a opção mais barata aparece "Grátis" com o valor riscado, e o
  Total não soma frete.
- **UC-09** (na gaveta): CEP fora — o frete cobrado é o da cotação, em qualquer valor de sacola; trocar para um CEP da
  campanha volta a faixa normal na hora.
- **CA-16** CEP 01310-100 (SP) ou 90010-000 (RS), sacola acima da faixa: "Frete grátis liberado", a mais barata
  "Grátis" com o valor riscado, Total sem frete — na gaveta e no checkout, com o mesmo Total. *(Aqui: a gaveta.)*
- **CA-17** CEP 40020-000 (BA), sacola acima da faixa: "Frete grátis só para Sul e Sudeste", sem barra, frete da
  cotação somado ao Total — na gaveta e no checkout. *(Aqui: a gaveta.)*
- **CA-22** (a medida) em 390×844 o balão não passa da largura da gaveta. — **prova: navegador, na Validation/QA**;
  aqui, o `collisionBoundary` do balão na gaveta.
- **CA-23** Em 390×844, com a faixa e o rodapé da v2: rodapé ≤ 270 px com frete escolhido e a fonte a 100 %, nenhuma
  nota abaixo do Total, sem rolagem horizontal; a 200 % o rodapé pode crescer e rolar por dentro, sem cortar o CEP nem
  o valor (r1, PR-18). — **a medida: navegador, na Validation/QA**; aqui, a ausência de nota e as classes.
- **CA-25** Com cupom de frete grátis aplicado e CEP fora da região, todas as opções saem "Grátis" e a faixa da região
  não aparece (r1, PR-04).
- **CA-26** Com CEP fora da região, a lista "Complete o frete grátis" não aparece (r1, PR-09).
- **RN-17 · Tom.** "Frete grátis só para Sul e Sudeste" é informação, não recusa: sem exclamação, sem "infelizmente".
  O ⓘ explica em uma ou duas frases.
- **RN-19 · A base do valor da faixa não muda**: o valor das peças, já com o preço da campanha, antes do cupom e do
  desconto progressivo, como hoje em cada caminho (r1, PR-05).
- **RN-18 · Cupom de frete grátis vale em qualquer região**, como hoje. Com ele aplicado, a faixa da região some (r1,
  PR-04).
- **RN-20 · "Complete o frete grátis"** (a lista de sugestões da gaveta) some, e o catálogo não é buscado, quando o CEP
  está fora das regiões; sem CEP, como hoje (r1, PR-09).

### Design — o que a tela faz

(Recorte do spec §3, Gaveta da sacola v2.) Rodapé fixo: borda superior `line`, folga da área segura, altura máxima 72 %
da gaveta, rola por dentro; de cima para baixo: bloco do Frete, Cupom recolhido, Totais, "Finalizar Pedido".
- Sem CEP: uma linha, 8px de intervalo, padding 10px 20px, borda inferior `line`. Campo de 44px, borda `field`, raio sm,
  fundo branco, 14px `ink`, ícone de envio de 18px em `primary` dentro a 12px da esquerda (texto a 40px), placeholder
  "CEP para calcular o frete", rótulo acessível "CEP para calcular o frete e o prazo", `inputMode` numérico,
  `autocomplete="postal-code"`, máximo 9, máscara `00000-000`; foco com borda e anel `primary`. Botão "Calcular": 44px,
  padding 0 16px, contorno 2px `primary`, 13px 600 `primary`, não encolhe. Inválido: borda `alert`, `aria-invalid`,
  "CEP inválido" (12px, `alert`, `role="alert"`) abaixo; o erro some ao digitar. Enter calcula.
- Calculando: o botão com o indicador de progresso e desligado; duas vagas de esqueleto no lugar das opções.
- Opções abertas: cabeçalho (12,5px, `ink-soft`, altura mínima 24px) "Frete para **01310-100** · São Paulo/SP" (CEP em
  `ink` 600; sem a busca, só o CEP) e "Trocar CEP" à direita (13px 600 `primary`, sublinhado, área de 44px), que volta
  ao estado sem CEP. Grupo de rádios "Forma de envio" com o `ShippingOptionCard` (variante gaveta, altura mínima 52px,
  padding 8px 12px), 8px de intervalo; RS com os grupos "Envio a domicílio" e "Retirar em".
- Recolhido: a linha inteira é um botão, altura mínima 52px, padding 7px 20px, borda inferior `line`: ícone de envio de
  20px em `primary`; "PAC · Correios" (13,5/18, 600) e embaixo "Chega entre 24 e 28 de novembro · CEP 01310-100"
  (12/16, `ink-soft`, quebra, sem corte); o valor (display 14px, 700, `primary`, "Grátis" quando zerado); chevron em
  `ink-soft`. Rótulo acessível "Frete: PAC, grátis, para o CEP 01310-100. Ver as opções" (ou com o valor),
  `aria-expanded="false"`.
- Falha e sem opção: as mensagens do UC-06; "Tentar de novo" com alvo de 44px.
- Cupom recolhido: botão de largura total, altura mínima 44px, padding 0 20px, borda inferior `line`, "Tem um cupom?"
  (13,5px, 500) e chevron; aberto e aplicado como o componente de hoje.
- Totais: padding 10px 20px 0, 3px entre linhas, 12,5px/18, rótulo `ink-soft`, valor 600; "Subtotal (N itens)"; as
  linhas de desconto de hoje; "Frete · PAC"/"Retirada no escritório" com o valor ou "Grátis" em `primary` (só com frete
  escolhido ou opções abertas); "Total" com margem 5px, padding 7px, borda superior `line`, rótulo display 16px 700
  `ink`, valor display 18px 700. Nenhuma nota abaixo do Total.
- "Finalizar Pedido": contêiner padding 10px 20px 14px (20px embaixo a partir de 768px); largura total, 48px, raio md,
  fundo `primary` (hover `primary-strong`), texto branco, display 15px 700, ícone de sacola de 20px.
- A faixa: `FreeShippingBand` no lugar da faixa de hoje (entre o cabeçalho e a lista), com a cidade/UF da busca do CEP
  e o `collisionBoundary` do balão no painel da gaveta. As props: `state` (de `useFreeShipping(subtotal, cep)`), `subtotal`, `cep` (a região do
  balão sai dele), `place` (`{ city, state }` da busca do CEP, ou `null`), `freeShippingCoupon` e `collisionBoundary`.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx` | VOCÊ CRIA | a sacola, o estado do frete grátis | o bloco do frete do rodapé (sem CEP, calculando, opções, recolhido, falha, sem opção); grava `setAddress({cep})`, `setShipping`, `setCepOrigin('sacola')` no `useCheckoutStore` padrão |
| `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx` | VOCÊ ALTERA | — | a faixa v2, o `CartShipping`, cupom recolhido, totais com frete, sem nota, botão de 48px, `CrossSell` escondido com CEP fora, `CouponInput` com o frete cotado |
| `apps/store/src/entities/cart/model/useCartPromotion.ts` (`:168-213`, `shipping: 0` em `:185`) | VOCÊ ALTERA | `shipping = 0` (o frete cotado) | o mesmo resultado, com o frete em `resolveOrderPricing` e na dependência do `useMemo` |
| `deliveryOptions`, `ShippingOptionCard`, `useShippingQuote`, `useCheckoutStore`, `cepOrigin` (`@/features/checkout`) | JÁ EXISTE (tarefa 06). Consuma; não altere. | | |
| `FreeShippingBand` | JÁ EXISTE (tarefa 08). Consuma; não altere. | | |
| `useCepLookup` (`@/entities/address`) e `usePickupOptionState` (`@/entities/pickup`) | JÁ EXISTE. Consuma; não altere. | | |

### Decisões já tomadas

- D-01: "Grátis" e "liberado" só com `granted`; `destination === 'outside'` esconde `CrossSell`.
- D-10: `useCepLookup` na gaveta dá a cidade/UF ao cabeçalho e ao balão; a UF não decide a região; falhando, sai só o
  CEP.
- D-11: a gaveta marca a mais barata ao calcular (a retirada nunca); `add_shipping_info` **não** é emitido na gaveta.
- D-13: o custo gravado acompanha a opção escolhida a cada cotação/estado; a opção sumiu ⇒ volta à mais barata.
- D-17: cupom de frete grátis vale em qualquer região; com ele, a faixa some.
- D-19: o campo da gaveta mostra o CEP do rascunho e grava por `setAddress`; nenhuma chave nova de storage.
- "Trocar CEP" desfaz a escolha (RN-09) e volta ao campo; o CEP continua no rascunho até ser trocado.

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| campo de CEP + botão numa linha | `apps/store/src/features/shipping-calc/ui/ShippingCalc.tsx:106-135` |
| hook de `entities` recebendo valor da tela | `apps/store/src/features/checkout/model/useCheckoutTotals.ts:212-224` |
| a gaveta de hoje | `CartDrawer.tsx` (faixa `:184-216`, `CrossSell` `:248-250`, cupom `:275-285`, totais `:287-330`, nota `:334-336`, botão `:341`) |

### Testes

- componente: sacola com peças mostra o campo e "Calcular"; vazia, não (CA-01).
- componente: CEP incompleto ⇒ "CEP inválido", nenhuma chamada à cotação (CA-02).
- componente: calculando mostra o indicador no botão e duas vagas de esqueleto.
- componente: CEP válido ⇒ as opções do `deliveryOptions` (mesmos nomes, prazos e preços do bloco Entrega), a mais
  barata marcada e o Total com o frete pelo `resolveOrderPricing` (CA-03, CA-04).
- componente: tocar numa opção recolhe numa linha com serviço, prazo, CEP e valor; tocar reabre (CA-05).
- componente: faixa alcançada com CEP de SP ⇒ só a mais barata "Grátis" riscada e Total sem frete (CA-06, CA-16);
  desligado ⇒ nenhuma; cupom de frete grátis ⇒ todas e a faixa some, inclusive com CEP da BA (CA-25).
- componente: CEP da BA acima da faixa ⇒ frete da cotação no Total e `CrossSell` ausente, sem buscar o catálogo (CA-17,
  CA-26).
- componente: CEP do RS ⇒ os grupos; a retirada nunca marcada; escolhida, "Retirada no escritório · Grátis" (CA-07).
- componente: nenhuma nota abaixo do Total, com e sem frete (M-06, CA-08 mudado).
- componente: mudar a quantidade recota com o mesmo CEP e mantém a opção com o preço novo (CA-10).
- componente: falha ⇒ a mensagem com "Tentar de novo", Total sem frete, "Finalizar Pedido" funcionando, nenhum "Frete
  padrão"; sem opção ⇒ a mensagem (CA-11).
- componente: a gaveta grava no `useCheckoutStore` padrão (CEP, escolha, `cepOrigin`) e nunca no
  `useProposalCheckoutStore` (CA-12).
- unidade: `useCartPromotion(shipping)` soma o frete e, sem argumento, é o de hoje.
- componente: o cupom recolhido em 44px, o botão de 48px, o balão com o `collisionBoundary` da gaveta, os alvos de 44px
  ("Trocar CEP", linha recolhida, opções), as transições com par `motion-reduce:`.

- **prova em navegador (dona: a Validation do WI, thread principal, com a gaveta desta tarefa já montada; o
  `wi-impl-task` não sobe navegador):** CA-13 em 390×844 e 1440×900 com a lista aberta e recolhida (sem rolagem
  horizontal, alvos de 44px, rodapé dentro da tela); CA-22 (o balão do ⓘ não passa da largura da gaveta em 390×844);
  CA-23 (rodapé ≤ 270 px com frete escolhido a 100 %; a 200 % cresce e rola por dentro sem cortar o CEP nem o valor).
  Nesta tarefa, deixe os estados alcançáveis (dados de teste/dublê da cotação documentados no retorno).

### Obrigações

- Os testes existentes da gaveta montam sem `QueryClientProvider` e dublam só `useShippingSettings`: `CartDrawer.test.tsx`,
  `CartDrawerAcompanha.test.tsx`, `sacolaCampanha.test.tsx`, `sacolaMedida.test.tsx`, `seloDoCupom.test.tsx`
  (`apps/store/src/widgets/cart-drawer/ui/__tests__/`) — ajuste o arnês; o caso `CartDrawer.test.tsx:250-257` que
  afirma a nota é **invertido** (nenhuma nota), não apagado; os casos que afirmam o "!" mudam para a copy nova.
- Dono exclusivo, se reprovarem por montar a gaveta: `apps/store/src/pages/__tests__/CheckoutPage.test.tsx`,
  `compreJuntoSacolaECheckout.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx`, `apps/store/src/test/checkoutCampanha.test.tsx`,
  `checkoutResumoCampanha.test.tsx` — ajuste o arnês sem afrouxar asserção.
- `freeShippingSingleOwner`, `touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `accentText`, `contrast`, `fieldBorder`
  (o campo com `border-estrelinha-field`) verdes.
- FSD: `widgets/cart-drawer` importa de `@/features/checkout` (barril) e `@/entities/*`; o frete entra em
  `useCartPromotion` por parâmetro (entity não importa feature).
- Tom (RN-17, RN-10): sem "!" novo; mensagens na primeira pessoa da Adri onde já é ("Não consegui consultar…").
- `packages/core/src/payment/**` intocado.

### Não faça

- Não altere `DeliveryBlock.tsx`, `OrderSummary.tsx`, `deliveryOptions.ts`, `ShippingOptionCard.tsx` nem `checkoutStore.ts`
  (tarefa 06); não implemente "Trazido da sua sacola" nem o foco no Número (tarefa 10).
- Não altere `FreeShippingBand.tsx` (tarefa 08) nem `InfoTip.tsx` (tarefa 02) — se precisar, registre a divergência.
- Não crie chave de storage.
- Não emita `add_shipping_info` na gaveta.

### Pronto quando

- [ ] a gaveta calcula, mostra, marca, recolhe e soma o frete pelos critérios acima
- [ ] a faixa v2 e o rodapé compacto montados, sem nota abaixo do Total
- [ ] CA-12 provado (o rascunho do pedido montado intocado)
- [ ] no retorno, a lista do que a Validation mede em navegador (abaixo) com os seletores/estados para alcançar cada medida
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
