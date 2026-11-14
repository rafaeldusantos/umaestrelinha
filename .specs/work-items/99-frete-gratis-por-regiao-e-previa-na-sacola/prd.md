# Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

**Protótipo:** `Black Friday - Sacola v2.html`, projeto "Uma Estrelinha - Black Friday" no Claude Design
(https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Sacola+v2.html).
**Absorve:** o WI 97 (prévia de frete na sacola, com o CEP levado ao checkout).
**Estado:** planejamento e protótipo. Nada implementado.

## Como ler este PRD

O PRD da 97 (`../97-previa-de-frete-na-sacola/prd.md`) **vale inteiro**: UC-01..UC-06, RN-01..RN-12, CA-01..CA-13,
o plano técnico e as quatro perguntas dele. Ele não é copiado aqui de propósito (duas cópias do mesmo requisito
divergem sem nada avisar). Este documento diz:

1. o que a v2 do protótipo **muda** na prévia de frete da 97 (seção "Mudanças sobre a 97");
2. o que é **novo**: o frete grátis por região (seções UC-07 em diante, RN-13 em diante, CA-14 em diante).

## O problema

Para a Black Friday a loja quer **frete grátis a partir de R$ 450 só para entregas no Sul e no Sudeste**. Hoje a
regra (`freeShippingState`, `packages/core/src/shipping/freeShipping.ts`) conhece só duas coisas: o interruptor e a
faixa de valor. Ela não conhece o destino. Ligar a faixa de R$ 450 hoje daria frete grátis para o Brasil inteiro.

E a loja só sabe o destino depois do CEP. Hoje o CEP aparece no bloco Entrega do checkout (e na página do produto,
para uma peça). A gaveta da sacola, onde a faixa "Faltam R$ X para o frete grátis" vive, não tem CEP — é exatamente o
que a 97 resolve. Por isso as duas viram um item só: a região precisa do CEP na gaveta.

## Mudanças sobre a 97 (protótipo v2)

A gaveta da 97 ocupava quase toda a tela do celular com o rodapé (medido em 390×844: rodapé de 347 px sem CEP e 319 com
CEP, sobrando 336 px para as peças). A v2 compacta:

- **M-01 · A faixa do frete grátis vira uma linha.** "Faltam R$ 48,17 para o frete grátis" com o ⓘ ao lado, o valor
  "R$ 401,83 / R$ 450,00" à direita e a barra embaixo. A frase "Vale para…" sai da faixa e vai para o ⓘ.
- **M-02 · Faixa alcançada ganha destaque.** Fundo em ouro (`accent`), texto em `ink` (regra de contraste da marca:
  dentro de superfície ouro, texto sólido `ink`), um ✓ e "Frete grátis liberado" em negrito. Sem barra (cheia, ela não
  diz nada).
- **M-03 · O ⓘ.** Abre ao passar o ponteiro (computador) e ao tocar (celular); fecha ao tocar fora e com Esc; é
  botão com rótulo acessível ("Sobre o frete grátis") e alvo de 44 px (pseudo-elemento, como o `TAP_44`). O balão fica
  sobre a lista, dentro da largura da gaveta.
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

## O que a cliente ganha (novo)

1. **Saber se o frete grátis vale para ela**, antes do checkout: com o CEP, a faixa diz "liberado" (Sul e Sudeste)
   ou "só para Sul e Sudeste" (fora).
2. **Nenhuma promessa que o checkout desfaz**: sem CEP a faixa diz quanto falta e, no ⓘ, para onde vale.

## Casos de uso (novos)

### UC-07 · A faixa sem CEP
- Faltando: "Faltam R$ X para o frete grátis" + ⓘ + valor/faixa + barra. O ⓘ diz: "Compras a partir de R$ 450,00 têm
  frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP." —
  os valores e as regiões vêm da configuração, nunca escritos na copy.
- Faixa alcançada sem CEP: destaque em ouro, "Frete grátis para Sul e Sudeste" + ⓘ ("… Informe o CEP abaixo para
  confirmar."). **Não** diz "liberado" sem saber o destino. Com as cinco regiões marcadas, a faixa alcançada diz
  "Frete grátis liberado" mesmo sem CEP, como hoje (r1, PR-01).

### UC-08 · A faixa com CEP de uma região da campanha
- Faltando: igual ao UC-07.
- Alcançada: "Frete grátis liberado" com destaque; ⓘ: "Entrega em São Paulo/SP, região Sudeste. A forma de envio mais
  barata sai sem custo." A opção mais barata aparece "Grátis" com o valor riscado, e o Total não soma frete.

### UC-09 · A faixa com CEP fora da campanha
- Uma linha neutra, sem barra e sem "faltam": "Frete grátis só para Sul e Sudeste" + ⓘ ("Para Salvador/BA, o frete é
  o da cotação. …"). O frete cobrado é o da cotação, em qualquer valor de sacola.
- Trocar para um CEP da campanha volta a faixa normal na hora.

### UC-10 · O checkout
- O bloco Entrega aplica a mesma regra com o CEP do endereço: só zera a mais barata quando a faixa foi alcançada **e**
  o CEP está numa região da campanha.
- O resumo do pedido (`OrderSummary`) e a linha do frete grátis do checkout seguem a mesma resposta.
- Trocar o CEP no checkout recalcula na hora (Sul → Nordeste: a opção deixa de ser grátis e o Total sobe).

### UC-11 · As outras superfícies que anunciam o frete grátis
- Barra de confiança da Home (`TrustBar`), cálculo de frete da página do produto (`features/shipping-calc`) e aviso do
  `AuthOverlay`: quando anunciam o frete grátis, dizem a região ("Frete grátis acima de R$ 450,00 · para Sul e
  Sudeste"), lida da mesma configuração. A faixa de avisos (WI 101) é texto livre da dona e fica fora: ela escreve a
  região no aviso (r1, PR-07).
- A página do produto **não** zera nem risca o frete: com o frete grátis ativo, mostra só uma linha de texto com a
  faixa e a região (r1, PR-06).

### UC-12 · O painel
- Em **Configurações → Frete e Material**, ao lado do interruptor e da faixa de hoje: "Regiões com frete grátis",
  cinco caixas (Norte, Nordeste, Centro-Oeste, Sudeste, Sul).
- Interruptor ligado com nenhuma região marcada é recusado ao salvar, com o motivo (mesmo formato de
  `freeShippingRefusal`).
- O texto de ajuda diz quais estados cada região cobre.

## Regras (novas)

- **RN-13 · A região sai do CEP, por faixa numérica, num dono só.** Função pura em `packages/core/src/shipping/`
  (arquivo-folha sem import, alcançável pelo Deno com `.ts` explícito, no molde de `pickup.ts`): Sudeste = CEP
  01000-000 a 39999-999 (SP, RJ, ES, MG); Sul = 80000-000 a 99999-999 (PR, SC, RS); as outras três regiões pelas
  faixas dos Correios. CEP inválido ⇒ região desconhecida. Nenhuma tela e nenhuma function decide região por conta
  própria. CEP incompleto ou de região desconhecida vale, na tela, como "sem CEP" (r1, PR-02). O rótulo das regiões
  ("Sul e Sudeste") é montado num dono só a partir da configuração, em ordem fixa (Sul, Sudeste,
  Centro-Oeste, Nordeste, Norte), com "e" antes da última; com as cinco marcadas, os textos não falam de região (r1, PR-10).
- **RN-14 · A regra continua tendo um dono: `freeShippingState`.** Ela passa a receber o destino (o CEP, ou `null`
  sem CEP) e as regiões da configuração. Invariantes de hoje mantidas (desligado ⇒ nunca `reached`; faixa ≤ 0 ⇒
  inativo). Invariantes novas:
  - CEP fora das regiões ⇒ `reached: false` em qualquer subtotal, com um campo que diga "fora da região" (a faixa
    usa para escolher o desenho do UC-09);
  - sem CEP ⇒ o estado diz quanto falta, mas não é "liberado" (UC-07), salvo com as cinco regiões marcadas;
  - o estado separa "o valor atingiu a faixa" de "o frete grátis foi concedido" (este exige destino dentro das
    regiões, ou as cinco marcadas). Quem zera o frete ou diz "liberado" lê o segundo (r1, PR-01).
  `freeShippingSingleOwner.test.ts` continua valendo e ganha as asserções de região.
- **RN-15 · Campo ausente = todas as regiões.** A configuração nova nasce com as cinco regiões marcadas, e a linha
  antiga (sem o campo) vale como as cinco, então o deploy **não muda nada** para quem já usa o frete grátis. Sul +
  Sudeste é uma escolha da dona no painel para a campanha. Lista vazia com o interruptor ligado deixa o frete grátis
  inativo (como a faixa ≤ 0), e o painel recusa gravá-la (r1, PR-02).
- **RN-16 · O servidor aplica a mesma regra onde ele já decide o frete grátis.** O caminho do pedido montado
  (`checkout/proposal.ts:403`, `mercado-pago/handlers.ts:1368`) já chama a regra no servidor; passa a mandar o CEP do
  endereço. Nenhuma cópia da regra nas functions.
- **RN-18 · Cupom de frete grátis vale em qualquer região**, como hoje. Com ele aplicado, a faixa da região some (r1,
  PR-04).
- **RN-19 · A base do valor da faixa não muda**: o valor das peças, já com o preço da campanha, antes do cupom e do
  desconto progressivo, como hoje em cada caminho (r1, PR-05).
- **RN-20 · "Complete o frete grátis"** (a lista de sugestões da gaveta) some, e o catálogo não é buscado, quando o CEP
  está fora das regiões; sem CEP, como hoje (r1, PR-09).
- **RN-17 · Tom.** "Frete grátis só para Sul e Sudeste" é informação, não recusa: sem exclamação, sem "infelizmente".
  O ⓘ explica em uma ou duas frases.

## Fora

- Frete grátis por estado ou por faixa de CEP escolhida à mão (só as cinco regiões).
- Faixa de valor diferente por região.
- O desconto de campanha (WI 102), o perfil de cores (WI 100) e a faixa de avisos (WI 101). A faixa do frete grátis
  usa os tokens; com o perfil Black Friday ligado ela muda de cor sozinha.
- Mudar a cotação do Melhor Envio.

## Critérios de aceite (novos)

- **CA-14** Sem CEP, sacola abaixo da faixa: "Faltam R$ X para o frete grátis", barra, ⓘ com a regra e as regiões
  lidas da configuração; nenhum "liberado".
- **CA-15** Sem CEP, sacola acima da faixa: destaque em ouro, "Frete grátis para Sul e Sudeste", nenhum "liberado".
- **CA-16** CEP 01310-100 (SP) ou 90010-000 (RS), sacola acima da faixa: "Frete grátis liberado", a mais barata
  "Grátis" com o valor riscado, Total sem frete — na gaveta e no checkout, com o mesmo Total.
- **CA-17** CEP 40020-000 (BA), sacola acima da faixa: "Frete grátis só para Sul e Sudeste", sem barra, frete da
  cotação somado ao Total — na gaveta e no checkout.
- **CA-18** Trocar o CEP de SP para BA no checkout com a sacola acima da faixa: a opção deixa de ser grátis e o Total
  sobe, sem recarregar a página.
- **CA-19** Com as cinco regiões marcadas (o padrão), o comportamento é idêntico ao de hoje para qualquer CEP.
- **CA-20** Painel: desmarcar todas as regiões com o interruptor ligado recusa o salvar com o motivo; salvar Sul +
  Sudeste vale na loja sem deploy.
- **CA-21** Pedido montado pago com CEP fora da região e faixa alcançada: o servidor cobra o frete (provado no
  servidor, não só na tela).
- **CA-22** O ⓘ abre com o ponteiro e com o toque, fecha com toque fora e com Esc, tem rótulo acessível e alvo de
  44 px; em 390×844 o balão não passa da largura da gaveta.
- **CA-23** Em 390×844, com a faixa e o rodapé da v2: rodapé ≤ 270 px com frete escolhido e a fonte a 100 %, nenhuma
  nota abaixo do Total, sem rolagem horizontal; a 200 % o rodapé pode crescer e rolar por dentro, sem cortar o CEP nem
  o valor (r1, PR-18).
- **CA-24** Barra de confiança, cálculo da página do produto e `AuthOverlay` mostram a região quando anunciam o frete
  grátis, lida da configuração; a página do produto não zera nem risca frete (r1, PR-06).
- **CA-25** Com cupom de frete grátis aplicado e CEP fora da região, todas as opções saem "Grátis" e a faixa da região
  não aparece (r1, PR-04).
- **CA-26** Com CEP fora da região, a lista "Complete o frete grátis" não aparece (r1, PR-09).

## Plano técnico (para a spec)

| Peça | Onde | Nota |
| --- | --- | --- |
| Região do CEP | `packages/core/src/shipping/region.ts` (novo) | folha sem import; `denoReach` de `shipping` passa a cobri-la |
| A regra | `packages/core/src/shipping/freeShipping.ts` | `freeShippingState(config, subtotal, destino?)`; `freeShippingRefusal` recusa "ligado sem região" |
| O hook | `packages/core/src/hooks/useFreeShipping.ts` | recebe o CEP; cada superfície passa o que tem (gaveta: o do rascunho do checkout, RN-05 da 97) |
| A configuração | `store_settings.shipping` + `ShippingSettings` (`packages/supabase/src/types/settings.ts`) | campo novo `free_shipping_regions`; migration aditiva e idempotente (`value \|\|`, `NOT value ?`), no molde da `37`; `storeSettingsDefaults.test.ts` guarda o padrão "todas" |
| A gaveta | `widgets/cart-drawer` | a faixa e o rodapé da v2 (M-01..M-07) somados à prévia da 97 |
| O ⓘ | componente da loja em `shared/ui` | botão + balão; reaproveitável pela faixa de avisos (WI 101) |
| Checkout | `DeliveryBlock.tsx` (`thresholdReached`, linha ~306), `OrderSummary.tsx` | passam o CEP do endereço à regra |
| Servidor | `checkout/proposal.ts`, `mercado-pago/handlers.ts` | mandam o CEP; ver Pergunta 2 sobre o pedido comum |
| Painel | `ShippingMaterialSection.tsx` | as cinco caixas; recusa pelo dono de `core` |
| Guardas | `freeShippingSingleOwner`, `storeSettingsDefaults`, `denoReach` (shipping), `touchTarget`, `accentText`, `contrast` | o destaque em ouro precisa passar em `accentText` (texto `ink` sólido sobre `accent`) |

## Perguntas em aberto

1. **As perguntas 1 a 4 da 97 continuam abertas** (endereço salvo × CEP da gaveta; mais barata já marcada;
   `add_shipping_info`; CEP da página do produto). As recomendações de lá valem.
2. **O pedido comum não confere o frete no servidor.** Hoje a function `checkout` grava o `shipping_cost` que o
   navegador manda; só o pedido montado recalcula o frete grátis no servidor. Com a região, alguém fora do Sul/Sudeste
   poderia forjar frete zero — o mesmo buraco que existe hoje com a faixa de valor. Recomendação: **fora deste item**,
   registrado como dívida (é a família da `BL-030`), porque conferir o frete no servidor exige recotar no Melhor
   Envio dentro da function.
3. **Frete grátis só para a mais barata, ou para a opção escolhida até um teto?** Hoje é a mais barata (PAC, quase
   sempre). Recomendação: **manter**.
4. **Data de fim.** A faixa de R$ 450 e as regiões ficam até a dona mudar no painel. Recomendação: **sem data
   automática neste item**; a campanha do WI 102 tem vigência cadastrada (início e fim), e a configuração de frete pode seguir a
   mesma data depois.

## Histórico de revisões

| rodada | data | o que mudou | origem |
| ------ | ---- | ----------- | ------ |
| r1 | 2026-11-14 | UC-07 (cinco regiões sem CEP), UC-11 (faixa de avisos fora; página do produto só texto), RN-13 (desconhecida = sem CEP; rótulo), RN-14 (concedido × atingido), RN-15 (ausente × vazio), RN-18..RN-20 novas, CA-23 (fonte), CA-24, CA-25, CA-26 | PRD Tech Review r1 (PR-01, 02, 04, 05, 06, 07, 09, 10, 18), inline a pedido |

---
Fonte: escrito na sessão de 2026-11-13 a partir do pedido do usuário, dos protótipos `Black Friday - Sacola.html` e
`Black Friday - Sacola v2.html` (projeto "Uma Estrelinha - Black Friday"), do PRD da 97 e da leitura de
`freeShipping.ts`, `useFreeShipping.ts`, `CartDrawer.tsx`, `DeliveryBlock.tsx`, `settings.ts`,
`checkout/handlers.ts`, `checkout/proposal.ts` e `mercado-pago/handlers.ts`.
