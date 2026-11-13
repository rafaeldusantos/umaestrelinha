# Sessão CH-04 · Sacola e checkout com oferta

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-sacola-e-checkout-com-oferta.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-03 Helena · conta: anonima (convidada, sem login) |
| Tour · modo | Money · por cenário (J-04) |
| Rodada      | confirmação (rodada 2) |
| Orçamento   | ~74 ações de browser de 70: passou ~4 do teto para fechar o pedido #0608. Leituras (snapshot, get, wait, screenshot) não entram na conta |
| Ambiente    | http://localhost:8092 · build não exposto · Chromium headless (agent-browser 0.39.1, sessão CH-04) · viewports 390 × 844 e 1440 × 900 · toque real pelo CDP (`Input.dispatchTouchEvent`, script `touch-tap.mjs`) |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados por rota; PIX não gera código (chave inválida no local, sem achado); "Dia das Mães" no lugar da "Black Friday" do charter, com M-A a 10 % |

## Missão

Como a cliente que confere o total antes de pagar, achar qualquer jeito de o pedido gravado ter um total diferente
do que a sacola e o checkout mostraram, ou de um desconto se somar a outro na peça de campanha.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Em 390, abre M-A, rola até a barra fixa e **toca** em "Adicionar à sacola" | A gaveta abre com M-A "de R$ 385,00 por R$ 346,50", selo DIA DAS MÃES −10 %. O toque funciona (BUG-001 corrigido) | `screenshots/CH-04-r2-01-toque-ma-sacola-390.png` |
| 02 | Abre M-E (pela URL), toca na barra fixa | M-E R$ 340,00 entra; "Faltam 2 para cada peça sair a R$ 306,00" (a M-A não conta para a promoção) | — |
| 03 | Aplica `QA10` na sacola | "QA10 aplicado −R$ 34,00" (10 % só de M-E); Subtotal R$ 686,50; Total R$ 652,50 | `screenshots/CH-04-r2-02-sacola-ma-me-qa10-390.png` |
| 04 | Finaliza o pedido e abre o resumo do checkout em 390 | Subtotal R$ 725,00 · **Desconto de campanha −R$ 38,50** · Cupom QA10 −R$ 34,00 · Desconto PIX (7%) −R$ 45,68 | `screenshots/CH-04-r2-03-checkout-resumo-390.png` |
| 05 | Preenche como convidada (e-mail `@exemplo.invalid`, CEP 90010-000, Correios, PIX, CPF de teste); confere o resumo em 1440 | O mesmo resumo + Frete R$ 19,90 · Total R$ 626,72; "Pagar R$ 626,72 com PIX" | `screenshots/CH-04-r2-04-checkout-resumo-1440.png` |
| 06 | Volta a 390 e toca em "Pagar R$ 626,72 com PIX"; abre `/pedido/:id` | Pedido #0606: M-A "de R$ 385,00 por R$ 346,50", M-E R$ 340,00; Subtotal R$ 725,00 · Desconto de campanha −R$ 38,50 · Cupom QA10 −R$ 34,00 · Desconto PIX −R$ 45,68 · Frete R$ 19,90 · **Total R$ 626,72**. Bate com o checkout | `screenshots/CH-04-r2-05-pedido-0606-390.png` |
| 07 | Em 390, abre M-C e toca na barra fixa | Página: −10 %, R$ 336,60, "R$ 374,00" riscado. A sacola **não esvaziou** depois do #0606: M-A e M-E continuam lá, com o QA10. Agora "QA10 aplicado −R$ 67,66" = 10 % de (M-E R$ 340,00 + **M-C R$ 336,60**) | `screenshots/CH-04-r2-06-qa10-sobre-mc-390.png` |
| 08 | Tira M-A; a sacola fica com M-E + M-C | "QA10 −R$ 67,66"; Subtotal R$ 676,60 | — |
| 09 | Checkout em 1440 | M-C "de R$ 374,00 por R$ 336,60"; Subtotal R$ 689,90 · Desconto de campanha −R$ 13,30 · Cupom QA10 −R$ 67,66 · PIX −R$ 42,63 · Frete R$ 19,90 · Total R$ 586,21 | `screenshots/CH-04-r2-07-checkout-mc-me-1440.png` |
| 10 | Paga com PIX: o e-mail do passo 05 já tem cadastro e a loja pede código; usa outro e-mail de teste | Pedido #0607: M-C **"de R$ 349,90"** por R$ 336,60; Cupom QA10 −R$ 67,66; Total R$ 586,21 (bate com o checkout). O servidor também gravou o cupom sobre a M-C | `screenshots/CH-04-r2-08-pedido-0607-cupom-na-mc.png` |
| 11 | Em 390, tira M-E: sobra só a M-C, com o QA10 | O cupom continua: "QA10 aplicado −R$ 33,66"; Total R$ 302,94. Nenhuma recusa | `screenshots/CH-04-r2-09-so-mc-qa10-mantido-390.png` |
| 12 | Tira o cupom e aplica `QA10` de novo, só com a M-C | Aceito: "QA10 aplicado −R$ 33,66" | `screenshots/CH-04-r2-10-so-mc-qa10-reaplicado-390.png` |
| 13 | Tira o cupom; acrescenta M-E pelo toque e passa a quantidade para 2 | 3 itens (M-C + 2 × M-E): "Falta 1 para cada peça sair a R$ 306,00". A M-C não conta | — |
| 14 | Acrescenta M-E2 pelo toque | 4 itens: "Desconto progressivo −R$ 102,99" (10 % de R$ 680,00 + R$ 349,90, sem a M-C); Total R$ 1.263,51 | `screenshots/CH-04-r2-11-sacola-promo-mc-390.png` |
| 15 | Checkout em 1440 | Subtotal R$ 1.379,80 · Desconto de campanha −R$ 13,30 · Desconto progressivo −R$ 102,99 · PIX −R$ 88,45 · Frete R$ 19,90 · Total R$ 1.194,96 | `screenshots/CH-04-r2-12-checkout-promo-1440.png` |
| 16 | Paga com PIX (outro e-mail de teste) e abre `/pedido/:id` | Pedido #0608: M-C R$ 336,60, sem a promoção; M-E "de R$ 680,00 por R$ 612,00"; M-E2 "de R$ 349,90 por R$ 314,91"; Subtotal R$ 1.379,80 · Desconto de campanha −R$ 13,30 · Desconto progressivo −R$ 102,99 · Frete R$ 19,90 · **Total R$ 1.194,96**. Bate com o checkout, mas **sem a linha "Desconto PIX"** | `screenshots/CH-04-r2-13-pedido-0608-promo.png` |

**Edge cases tentados:** nada novo (rodada de confirmação). No entorno do BUG-001, um clique de mouse na barra fixa
antes de ela deslizar para dentro da tela não acrescentou a peça. O botão estava fora da área visível, então não é achado.

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-005 | pass | 03–06 | `screenshots/CH-04-r2-03-checkout-resumo-390.png`, `CH-04-r2-04-checkout-resumo-1440.png`, `CH-04-r2-05-pedido-0606-390.png` | BUG-003 corrigido: a linha "Desconto de campanha" aparece no checkout em 390 e em 1440. Checkout e pedido #0606 têm o mesmo subtotal (R$ 725,00), o mesmo desconto de campanha (−R$ 38,50) e o mesmo total (R$ 626,72). Passo 2 (quantidade 2 de M-A) não rodou. A sacola mostra um subtotal diferente; ver Debrief |
| TC-FUNC-008 | pass | 07, 09, 10 | `screenshots/CH-04-r2-07-checkout-mc-me-1440.png`, `CH-04-r2-08-pedido-0607-cupom-na-mc.png` | BUG-002 corrigido no valor: a M-C sai a R$ 336,60 na página, na sacola, no checkout e no pedido #0607, nunca a R$ 314,91. Resíduo fora do critério do TC: o pedido mostra "de R$ 349,90", e a página, a sacola e o checkout mostram "de R$ 374,00" (Debrief) |
| TC-JOURNEY-002 | pass | 01–06 | `screenshots/CH-04-r2-01-toque-ma-sacola-390.png` … `CH-04-r2-05-pedido-0606-390.png` | BUG-001 corrigido: o toque real na barra fixa acrescentou a peça 4 de 4 vezes (M-A, M-E, M-C, M-E2). A jornada rodou em 390 até o pedido #0606, com o total igual ao do checkout. M-E entrou pela URL, não pela busca. O PIX é de 7 % na tela, e o TC diz 5 % (já era assim na rodada 1) |
| TC-FUNC-015 | fail | 11–12 | `screenshots/CH-04-r2-09-so-mc-qa10-mantido-390.png`, `CH-04-r2-10-so-mc-qa10-reaplicado-390.png` | A-1. Numa sacola só com peça de campanha (M-C), o QA10 é aceito em vez de recusado. O caminho com M-A e `QAFRETE` não rodou (orçamento) |
| TC-FUNC-016 | skip | 13–16 | `screenshots/CH-04-r2-11-sacola-promo-mc-390.png`, `CH-04-r2-12-checkout-promo-1440.png`, `CH-04-r2-13-pedido-0608-promo.png` | A metade da promoção passou, com M-C como peça de campanha: ela não conta para a faixa nem leva o desconto progressivo. Sacola, checkout e pedido #0608 batem em R$ 1.263,51 antes do PIX e em R$ 1.194,96 de total. O passo 3 (Compre Junto de M-E com M-A) não rodou: o orçamento acabou |

Contagem: pass 3 · fail 1 · blocked 0 · skip 1

## Achados

### A-1 · [Cupom · sacola e pedido] O cupom QA10 desconta a peça de campanha que já tinha "de/por" (M-C) — a cliente

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-03 Helena |
| Jornada e passo     | J-04, passo 3 (aplicar o cupom) e J-04a (sacola só com oferta) · passos 07–12 do log |
| TC                  | TC-FUNC-015 (e CA-16 em TC-JOURNEY-002, com a M-C no lugar da M-A) |
| Gravidade proposta  | high — o desconto de campanha e o cupom se somam na peça de campanha, na sacola e no pedido gravado. A loja dá R$ 33,66 a mais por unidade de M-C, e a regra que a cliente vê com a M-A (cupom recusado) não vale com a M-C |
| Reproduziu          | sim (3 de 3: pedido #0607; sacola só com M-C mantendo o cupom; cupom reaplicado do zero) |
| Viewport            | 390 × 844 (sacola) e 1440 × 900 (checkout) |

**Passos para reproduzir**, de um estado limpo:

1. Sem login, sacola vazia, "Dia das Mães" em vigência; abrir `http://localhost:8092/produtos/pulseira-esferas-leite-materno-prata-925` (M-C: "de" R$ 374,00, "por" R$ 349,90, 10 % na campanha ⇒ R$ 336,60) e acrescentá-la à sacola
2. Na sacola, aplicar o cupom `QA10`
3. Observar: o cupom é aceito, com "QA10 aplicado −R$ 33,66" e Total R$ 302,94
4. (Servidor) Acrescentar M-E (`/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925`), ir ao checkout e
   pagar com PIX como convidada: o pedido grava "Cupom QA10 −R$ 67,66", 10 % de M-E + M-C

**Esperado:** o cupom não vale para a peça de campanha. Só com a M-C na sacola, ele é recusado com "Este cupom não vale
para peças da Dia das Mães." (o mesmo que acontece com a M-A). Com M-E + M-C, ele desconta só os 10 % de M-E (−R$ 34,00).
**Fonte:** PRD CA-16, RN-16, D-06; `spec.md` I-04; TC-FUNC-015 passo 1. A variação do TC-FUNC-008 também vale aqui: a
peça só fica fora do recorte do cupom quando o "de/por" vence a campanha, e com a M-C quem vence é a campanha
(R$ 336,60 < R$ 349,90).

**Observado:** a sacola só com a M-C mantém "QA10 aplicado −R$ 33,66", e aceita o cupom de novo quando é reaplicado.
Com M-E + M-C, "QA10 aplicado −R$ 67,66" na sacola, no checkout ("Cupom QA10 −R$ 67,66") e no pedido #0607 gravado
(Total R$ 586,21). Com a M-A no mesmo pedido (#0606), o cupom descontou só M-E (−R$ 34,00): o defeito aparece na
peça de campanha que tinha "de/por". É provável que tenha surgido com a correção do BUG-002, que passou a precificar
a M-C pelo "de". Na rodada 1, a M-C saía a R$ 314,91.

**Evidência:**

- `screenshots/CH-04-r2-06-qa10-sobre-mc-390.png`: o cupom com −R$ 67,66 numa sacola com M-A, M-E e M-C
- `screenshots/CH-04-r2-07-checkout-mc-me-1440.png`: o checkout com "Cupom QA10 −R$ 67,66"
- `screenshots/CH-04-r2-08-pedido-0607-cupom-na-mc.png`: o pedido #0607 gravado com o cupom sobre a M-C
- `screenshots/CH-04-r2-09-so-mc-qa10-mantido-390.png`: a sacola só com a M-C, com o cupom mantido
- `screenshots/CH-04-r2-10-so-mc-qa10-reaplicado-390.png`: o cupom reaplicado do zero e aceito
- console: não lido
- rede: não lida

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- TC-FUNC-016, passo 3: o Compre Junto (M-E com o adicional M-A) até o checkout e o pedido não rodou, porque o orçamento acabou.
- TC-FUNC-015 com M-A + `QAFRETE` (recusa do QA10 com o nome da campanha; frete zerado) não rodou, também por orçamento. O passo da recusa foi testado com a M-C (A-1).
- TC-FUNC-005, passo 2 (quantidade 2 de M-A) e as variações (recarregar, duplo clique, e-mail no Mailpit) não rodaram. A rodada era de confirmação e o orçamento não deu.
- A fonte a 200 % não foi testada.

## Debrief

- **Surpresas:** o cupom passou a valer na M-C (A-1). Sugestões de backlog, que não viraram achado porque não são
  regressão nem critical/high:
  1. Resíduo do BUG-002: o pedido gravado mostra a M-C "de R$ 349,90 por R$ 336,60" (#0607, #0608), e a página, a
     sacola e o checkout mostram "de R$ 374,00". O valor cobrado está certo; o "De" do pedido não é o da peça.
  2. O pedido #0608 (com a promoção progressiva) não tem a linha "Desconto PIX" (−R$ 88,45, que o checkout
     mostra), então as linhas do pedido não somam o Total (R$ 1.194,96, que está certo). O #0606 tem a linha.
  3. O "Subtotal" da sacola (R$ 686,50, já com o preço de campanha) é diferente do "Subtotal" do checkout e do
     pedido (R$ 725,00, com a linha "Desconto de campanha −R$ 38,50" à parte). Os totais batem.
  4. A sacola não esvazia depois do pedido criado com o pagamento pendente: os itens e o cupom continuam. É provavelmente
     pré-existente.
  5. O e-mail de convidada usado num pedido vira cadastro, e o próximo checkout com ele pede código.
- **Próximo charter:** reteste do A-1 com as duas peças "de/por" e com a M-A, M-B e M-D, no cupom e no recorte
  dos itens do Compre Junto. Rodar o Compre Junto com peça de campanha (TC-FUNC-016, passo 3).
- **Padrão novo:** depois de corrigir o preço de uma peça "de/por", rodar de novo o cupom nessa mesma peça. A
  correção do preço pode mudar como a loja decide se a peça é "de campanha" para o recorte do cupom.
