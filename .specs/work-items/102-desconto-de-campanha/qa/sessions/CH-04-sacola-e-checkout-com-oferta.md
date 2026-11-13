# Sessão CH-04 · Sacola e checkout com oferta

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-sacola-e-checkout-com-oferta.md` · exploratório · P0 |
| Status      | done |
| Persona     | PER-03 Helena · conta: anonima (convidada, sem login, e-mail `@exemplo.invalid`) |
| Tour · modo | Money · por cenário (J-04) |
| Rodada      | confirmação (rodada 3) |
| Orçamento   | 32 ações de browser de 35 (cada item de `batch` contado como uma ação; leituras, `wait` e screenshot fora da conta) |
| Ambiente    | http://localhost:8092 · build não exposto · Chromium headless (agent-browser 0.39.1, sessão CH-04) · viewports 390 × 844 e 1440 × 900 |
| Paridade    | Supabase local; `**/*.supabase.co/**` e `**/g/collect*` bloqueados por rota; PIX não gera código (chave inválida no local, sem achado); "Dia das Mães" (10 %) no lugar da "Black Friday" (20 %) do charter e dos TC |

## Missão

Como a cliente que confere o total antes de pagar, achar qualquer jeito de o pedido gravado ter um total diferente
do que a sacola e o checkout mostraram, ou de um desconto se somar a outro na peça de campanha.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Em 390, sacola vazia, abre M-E; no "Compre junto" marca o adicional "Pulseira Afetiva Lisa…" (M-A, R$ 346,50) e escolhe a cor | "Total do conjunto: R$ 686,50, R$ 638,44 no Pix" = M-E R$ 340,00 + M-A R$ 346,50 (preço de campanha), sem desconto de conjunto em cima; o botão vira "Levar o conjunto" | `screenshots/CH-04-r3-01-compre-junto-me-ma-390.png` |
| 02 | Toca em "Levar o conjunto" | A gaveta abre com 2 linhas: M-E R$ 340,00; M-A "de R$ 385,00 por R$ 346,50", selo DIA DAS MÃES −10 %, "Acompanha o Pulseira Afetiva Oval…". "Faltam 2 para cada peça sair a R$ 306,00" (só M-E conta para a promoção). Subtotal e Total R$ 686,50 | `screenshots/CH-04-r3-02-sacola-conjunto-390.png` |
| 03 | "Finalizar Pedido"; checkout em 1440 | Subtotal R$ 725,00 · Desconto de campanha −R$ 38,50 · Desconto PIX (7%) −R$ 48,06 · Total R$ 638,44 (= R$ 686,50 da sacola menos o PIX) | `screenshots/CH-04-r3-03-checkout-conjunto-1440.png` |
| 04 | Preenche como convidada (e-mail novo `@exemplo.invalid`, CEP 90010-000, Correios R$ 19,90, PIX, CPF de teste) | Mesmo resumo + Frete R$ 19,90 · Total R$ 658,34; "Pagar R$ 658,34 com PIX" | `screenshots/CH-04-r3-04-checkout-conjunto-pagar-1440.png` |
| 05 | Paga com PIX; abre `/pedido/:id` | Pedido #0612 · "2 peças · R$ 658,34": M-E R$ 340,00; M-A "Acompanha o…", "de R$ 385,00 por R$ 346,50"; Subtotal R$ 725,00 · Desconto de campanha −R$ 38,50 · Desconto PIX −R$ 48,06 · Frete R$ 19,90 · Total R$ 658,34. Bate com sacola e checkout | `screenshots/CH-04-r3-05-pedido-0612-conjunto.png` |
| 06 | Em 390, abre M-A; a sacola ainda tem o conjunto (não esvazia após pedido pendente, já visto na r2); tira M-E | Sobra só M-A, R$ 346,50; a M-A continua na sacola sozinha | — |
| 07 | Aplica `QA10` na sacola só com M-A | Recusado: "Este cupom não vale para peças da Dia das Mães." (aviso/toast); nenhum desconto; Total R$ 346,50 | `screenshots/CH-04-r3-06-ma-qa10-recusa-390.png` |
| 08 | Aplica `QAFRETE` | "Cupom QAFRETE aplicado!"; "QAFRETE aplicado · Frete grátis"; M-A continua R$ 346,50 | `screenshots/CH-04-r3-07-ma-qafrete-sacola-390.png` |
| 09 | Vai ao checkout em 1440 (dados da convidada já preenchidos) | "QAFRETE aplicado · Frete grátis"; Subtotal R$ 385,00 · Desconto de campanha −R$ 38,50 · PIX −R$ 24,26 · Frete Correios **Grátis** · Total R$ 322,24 | `screenshots/CH-04-r3-08-checkout-ma-qafrete-1440.png` |
| 10 | No checkout, remove o QAFRETE e digita `qa10` em minúsculas | O mesmo motivo: "Este cupom não vale para peças da Dia das Mães." (não "cupom inválido"); frete volta a R$ 19,90; nenhum desconto de cupom | `screenshots/CH-04-r3-09-checkout-qa10-minusculo-recusa-1440.png` |

**Edge cases tentados:** nada novo (rodada de confirmação). Só a variação "digitado em minúsculas" do TC-FUNC-015.

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-FUNC-016 | pass | 01–05 | `screenshots/CH-04-r3-01-compre-junto-me-ma-390.png` … `CH-04-r3-05-pedido-0612-conjunto.png` | Metade que faltava (passos 3–4): M-A como adicional do Compre Junto de M-E entra pelo preço de campanha (R$ 346,50), sem desconto de conjunto em cima, e não conta para a faixa da promoção. Página, sacola (R$ 686,50), checkout e pedido #0612 (R$ 658,34) coerentes. A metade da promoção (passos 1–2) passou na r2 com a M-C. O Compre Junto de M-E não mostra desconto de conjunto nenhum, então "o desconto do conjunto só nas comuns" não teve como ser visto |
| TC-FUNC-015 | pass | 06–10 | `screenshots/CH-04-r3-06-ma-qa10-recusa-390.png` … `CH-04-r3-09-checkout-qa10-minusculo-recusa-1440.png` | Sacola só com M-A: QA10 recusado com o nome da campanha; QAFRETE aceito, frete Grátis no checkout, M-A no preço de campanha; variação `qa10` minúsculo recusada com o mesmo motivo. Não criei pedido com QAFRETE (o TC termina no checkout) |

Contagem: pass 2 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada (rodada de confirmação)

## Fora da cobertura

- Entorno do BUG-008 com a M-C (QA10 numa sacola só com M-C, e M-C + M-E): não rodei nesta sessão; o reteste da rodada já o deu como resolved, e o orçamento ficou no M-A + QAFRETE e na variação em minúsculas.
- Variação "cupom com valor mínimo" do TC-FUNC-015: não há cupom com mínimo na massa.
- Variação "oferta leve também" do TC-FUNC-016 com peça de campanha: a oferta do checkout era "QA Corrente Veneziana" (peça comum), não testada.
- Fonte a 200 %: fora do escopo da confirmação.

## Debrief

- **Surpresas:** nada novo. Sugestões de backlog (não são regressão nem critical/high): a recusa do cupom aparece só como aviso flutuante, não junto do campo; a sacola continua com os itens depois do pedido #0612 pendente (já anotado na r2).
- **Próximo charter:** nada.
- **Padrão novo:** nada.
