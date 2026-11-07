# Sessão CH-03 · Cupom, promoção, oferta do checkout e duas joias: nenhum desconto se soma onde não devia

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-concorrencia-de-descontos.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-04 Helena · conta: `cliente-loja` (helena.qa@exemplo.com, código lido no Mailpit); painel: usuário de desenvolvimento do `seed.sql` (premissa da rodada 1; credencial não escrita aqui) |
| Tour · modo | Money · por técnica (tabela de decisão) — só os TC e o entorno das correções |
| Rodada      | confirmação                                                            |
| Orçamento   | 36 ações de browser de 35 (interações agrupadas em `browser_run_code_unsafe`, uma por chamada; a 36ª foi fechar o browser) |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 (worktree `feature/92`) · build não exposto · Chromium headless (Playwright MCP) · viewports 1440 × 900 e 390 × 844 |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados por rota; Mercado Pago com chave inválida (o "cobrado" é o valor do pedido gravado); Melhor Envio falha ⇒ "Correios Frete padrão" R$ 19,90; e-mail lido pela prévia da aba Notificações com o `order_id` |

**Massa e premissas:** a mesma da rodada 1 (QA Pingente Estrela = P; QA Corrente Cartier com casado 10 % e progressiva 30 % com 2+ unidades; oferta do checkout QA Corrente Veneziana a 20 %; QA Berloque Coração a 15 % em P; cupom QA92CUPOM15). Contexto de browser novo, sacola vazia na entrada.

**Pedidos criados:** **#0375** (id `1ea8f47a-73a8-4a2f-8a75-be11502909da`, P + Cartier ×2 em promoção + oferta Veneziana, PIX, R$ 484,60) e **#0376** (id `3172c1dd-3353-43d4-aefd-4aef3c3c22e7`, P + Berloque Prata pelo bloco + QA92CUPOM15, PIX, R$ 272,32).

## Missão

Achar uma combinação de cupom, promoção, oferta do checkout e duas joias em que a cliente pague menos do que a
regra diz (descontos somados), mais do que ela diz (desconto perdido), ou leia que um desconto "ficou de fora"
quando não ficou — e conferir que Minha conta e o e-mail contam a mesma conta, na mesma ordem do painel.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar por código (1440) | Logada, cai em /conta | — |
| 02 | P (Prata · Não) + "QA Correntes" › Cartier 45 cm, "Levar o conjunto"; na gaveta, aumentar a Cartier para 2 | Linha Cartier **de R$ 239,80 por R$ 167,86**, "Acompanha o QA Pingente Estrela", sem "1 a preço cheio"; Subtotal 499,70 · CJ −11,99 · Desconto progressivo −59,95 · Total 427,76 = 259,90 + 167,86 (fecha) — BUG-003 corrigido na gaveta | `screenshots/CH-03-r2-02-gaveta-promo-vence-casado-1440.png` |
| 03 | Aplicar QA92CUPOM15 na gaveta | O cupom vence a promoção: linha volta ao casado "10% a menos · 1 com desconto, 1 a preço cheio" R$ 227,81 (agora verdadeiro: 107,91 + 119,90); selo "QA92CUPOM15 aplicado −R$ 73,16" = linha "Cupom −R$ 73,16" = 15 % × (499,70 − 11,99); Total 414,55 — BUG-004 entorno ok | — |
| 04 | "Finalizar Pedido" | Checkout: "A promoção QA92 Progressiva Cartier não foi aplicada — o cupom QA92CUPOM15 desconta mais"; resumo **Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX (7%) · Frete · Total** (405,43, fecha); oferta desmarcada | — |
| 05 | Remover o cupom e marcar a oferta Veneziana | Linha Cartier **R$ 239,80 → R$ 167,86** também no checkout; ordem Subtotal 571,62 · CJ −11,99 · progressivo −59,95 · PIX −34,98 · Frete 19,90 · Total 484,60 (fecha). "4 ITENS", mas "Seu pedido" lista 2 linhas e não há "Desconto da oferta" (resto do A-2 da rodada 1, não regressão) | `screenshots/CH-03-r2-04-checkout-promo-bump-1440.png` |
| 06 | "Pagar R$ 484,60 com PIX" | Pedido **#0375**, R$ 484,60 (falha do Mercado Pago local, esperada) | — |
| 07 | Abrir `/pedido/:id` do #0375 | Cartier 2 unidades R$ 239,80 → 167,86; Veneziana R$ 89,90 → 71,92; Subtotal 589,60 · CJ −11,99 · progressivo −59,95 · Desconto da oferta −17,98 · Desconto PIX −34,98 · **Frete 19,90** · Total 484,60 — ordem do painel e conta fecha | `screenshots/CH-03-r2-06-confirmacao-0375-1440.png` |
| 08 | Em 390, P (Prata · Não) + Berloque Prata pelo bloco, "Levar o conjunto" (a sacola ainda tinha P + Cartier ×2 do #0375) | Com P ×2: Cartier ×2 R$ 167,86 (antes 215,82 na r1), Berloque 59,42; Total 747,08 = soma das linhas. A barra "Levar o conjunto" mediu y 882 numa janela de 844 (clique pelo DOM), como na r1 | — |
| 09 | Tirar um P e a Cartier; aplicar QA92CUPOM15 | Selo **−R$ 47,90** = linha "Cupom −R$ 47,90"; Total 271,42 — BUG-004 corrigido (era −49,47 × −47,90) | `screenshots/CH-03-r2-10-gaveta-cupom-casado-390.png` |
| 10 | Aumentar o Berloque para 2 e voltar para 1, com o cupom | Com 2: selo = linha = −R$ 58,38 (15 % × (399,70 − 10,48)); com 1: −R$ 47,90 nos dois — o selo acompanha a sacola | — |
| 11 | "Finalizar Pedido" (mesma aba, logo depois do #0375 com a oferta marcada) | Oferta **desmarcada** (`aria-checked=false`), "Resumo · 2 itens R$ 272,32"; Subtotal 329,80 · CJ −10,48 · Cupom −47,90 · PIX −19,00 · Frete 19,90 · Total 272,32 — BUG-002 e BUG-011 corrigidos | `screenshots/CH-03-r2-11-checkout-resumo-ordem-390.png` |
| 12 | "Pagar R$ 272,32 com PIX" | Pedido **#0376** novo, R$ 272,32 (não abriu o #0375) | — |
| 13 | `/pedido/:id` do #0376 e Minha conta | Mesmo resumo e ordem, Total 272,32; Minha conta: "#0375 · R$ 484,60" e "#0376 · R$ 272,32" | `screenshots/CH-03-r2-13-confirmacao-0376-390.png` |
| 14 | Painel (1440) › Notificações, `order_id` do #0376, "Pedido recebido" › prévia | "1× QA Berloque Coração · Compre Junto · 15% a menos R$ 69,90 / R$ 59,42"; totais **Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total** (272,32, fecha) — BUG-012 corrigido | `screenshots/CH-03-r2-15-email-previa-0376-1440.png` |
| 15 | Sair do painel e da loja; fechar o browser | Painel em /admin/login; loja com "Entrar" | — |

**Edge cases tentados:** nada novo (rodada de confirmação). Repetidos do entorno: aplicar e remover o cupom (03–05), mudar a sacola com o cupom aplicado (10), segundo checkout na mesma aba depois de um pedido com a oferta (11).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-FUNC-010 | pass | 02, 05, 08 | `screenshots/CH-03-r2-02-gaveta-promo-vence-casado-1440.png` | a linha mostra o menor (167,86) na gaveta e no checkout, e as linhas somam o Total; o rodapé mostra a diferença como "Desconto progressivo". Variação "promoção menor" sem massa (como na r1) |
| TC-FUNC-016 | pass | 02, 05, 07 | `screenshots/CH-03-r2-04-checkout-promo-bump-1440.png` | passo 1 ok (linha pela promoção); passo 2 sem massa; passo 3 só com a oferta sobre outra corrente (Veneziana fora da sacola): vale a oferta e o total não soma. A oferta sobre a corrente que já tem casado (Veneziana na sacola, r1 passo 19) não foi refeita — ver Fora da cobertura |
| TC-FUNC-027 | pass | 06–07, 13 | `screenshots/CH-03-r2-06-confirmacao-0375-1440.png` | Subtotal = soma dos cheios (589,60), uma linha por desconto (CJ, progressivo, oferta, PIX), Frete antes do Total, conta fecha; Minha conta R$ 484,60 |
| TC-JOURNEY-004 | pass | 08–13 | `screenshots/CH-03-r2-11-checkout-resumo-ordem-390.png` · `CH-03-r2-13-confirmacao-0376-390.png` | cupom 47,90 = 15 % × (329,80 − 10,48); ordem do painel no checkout e em `/pedido/:id`; 272,32 no checkout, pagamento, pedido e Minha conta. Variação cartão não feita |
| TC-INT-004 | pass | 14 | `screenshots/CH-03-r2-15-email-previa-0376-1440.png` | linha "Compre Junto · 15% a menos" com o cheio acima do cobrado; totais na ordem do painel; conta fecha. Pela prévia, só 1440 |

Contagem: pass 5 · fail 0 · blocked 0 · skip 0

**Bugs conferidos:** BUG-003 (promoção vence o casado: linha pelo menor) — corrigido na gaveta e no checkout, inclusive com P ×2; a parte "oferta vence o casado com a corrente na sacola" não refeita. BUG-011 e BUG-012 — corrigidos (checkout, `/pedido/:id`, e-mail). BUG-002 — corrigido (oferta desmarcada no checkout seguinte, mesma aba). BUG-004 — corrigido (selo = linha na aplicação e depois de mudar a sacola).

## Achados

nada (nenhuma regressão nem achado novo critical/high).

**Sugestões de backlog (não são bug nesta rodada):**

- Com a oferta do checkout marcada (Veneziana fora da sacola), "Seu pedido" diz "4 ITENS" e lista 2 linhas, o Subtotal entra com o preço da oferta (571,62 × 589,60 na confirmação) e não há a linha "Desconto da oferta" antes do pedido (passo 05). É o resto do A-2 da rodada 1 que não virou bug; a conta do Total está certa.
- Em 390 a barra fixa "Levar o conjunto" mediu y 882 numa janela de 844 (passo 08), de novo depois de um redimensionamento de 1440 para 390; pode ser artefato do redimensionamento — vale reconferir abrindo direto em 390.

## Spec-gaps

nada

## Fora da cobertura

- TC-FUNC-016 passo 3 com a oferta sobre a corrente que já tem desconto casado na sacola (o ramo "oferta vence o casado" do BUG-003) — orçamento.
- TC-FUNC-016 passo 2 e TC-FUNC-010 variação "promoção menor que o casado" — sem massa.
- TC-JOURNEY-004 variação cartão — o Brick não sobe no local.
- TC-INT-004 em 390 e no Mailpit — envio real desligado; só a prévia em 1440.
- O painel dos pedidos #0375 e #0376 não foi aberto (a régua de ordem veio da decisão Q-01 e do painel visto na r1).

## Debrief

- **Surpresas:** com o cupom vencendo a promoção, a linha volta a "1 com desconto, 1 a preço cheio" e desta vez é verdade; o segundo checkout na mesma aba gerou pedido novo (o BUG-001 não apareceu neste caminho).
- **Próximo charter:** a oferta do checkout de ponta a ponta (lista, Subtotal e linha da oferta antes do pedido; a corrente da oferta já na sacola).
- **Padrão novo:** nada
