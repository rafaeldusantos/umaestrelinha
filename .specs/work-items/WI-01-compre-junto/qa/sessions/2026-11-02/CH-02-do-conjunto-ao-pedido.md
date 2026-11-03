# Sessão CH-02 · Do conjunto ao pedido: gravações, valor cobrado e a marca "acompanha"

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-do-conjunto-ao-pedido.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima (convidada, e-mail fictício `@exemplo.invalid`); conferência no painel com `admin-painel` |
| Tour · modo | Money · com tour                                                       |
| Rodada      | exploração                                                             |
| Orçamento   | 49 ações de browser de 50                                              |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build não exposto (dev server, branch feature/WI-01) · Chromium (Playwright MCP) · viewports 390 × 844 (loja) · 1440 × 900 (painel) |
| Paridade    | banco Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; function `mercado-pago` local responde 503 (QR do PIX não gerado — D-02); frete cotado no local (Correios SEDEX R$ 23,48) |

## Missão

Procurar qualquer jeito de o conjunto chegar ao pedido com valor diferente do que a cliente viu, com gravação na peça errada, com uma peça a mais ou a menos, ou sem a marca de que a corrente acompanha a joia.

## Pedidos criados (apagar na limpeza da rodada)

| Pedido | id | E-mail | Valor |
| ------ | -- | ------ | ----- |
| #0327 | `7d506894-bf9b-4c71-8f0b-7f61bfc61153` | marina.ch02@exemplo.invalid | R$ 813,61 |

Nenhum outro pedido foi criado (o duplo clique e a segunda conclusão devolveram o mesmo #0327).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir `/produtos/qa-pingente-estrela` com sacola vazia (localStorage limpo), escolher Prata 925 · Com gravação: Sim | Campo "O que gravar" 0 / 12 com "Opcional. Deixe em branco se preferir a peça sem gravação." | — |
| 02 | Abrir "Ver os 2 modelos" da lista QA Correntes, escolher QA Corrente Cartier · 45 cm · Sim e marcar | Campo de gravação dentro do bloco, 0 / 30, mesmo texto de apoio; linha "QA Corrente Cartier · 45 cm · Sim R$ 139,90" | — |
| 03 | Gravar "Lúcia" no pingente e "Pedro e Lúcia para sempre juntos" (32) na corrente | Contador 32 / 30, campo inválido, "Cabem até 30 caracteres nesta peça. Tire 2 para continuar." **Total do conjunto R$ 279,90** (só o pingente) | `screenshots/CH-02-01-limite-corrente.png` |
| 04 | Marcar QA Medalha Afetiva · Prata 925 | Bloco sem nenhuma menção a material; barra fixa "Conjunto · 3 peças" **R$ 429,80** (= pingente + medalha; a corrente de R$ 139,90 marcada fica fora da soma) | — |
| 05 | Tocar "Levar o conjunto" com a corrente acima do limite | Nada entrou (sacola sem contador); alerta "A gravação passou do limite. Ajuste o texto para continuar." | — |
| 06 | Corrigir a corrente para "Pedro" e passar o limite no pingente ("Lúcia Mariana", 13) | Total do conjunto R$ 569,70 (3 peças, agora certo); botão da barra fixa "Revisar a gravação" desabilitado; junto do campo do pingente "A gravação tem 13 caracteres e o limite desta peça é 12." — o texto "A gravação passou do limite. Ajuste o texto para continuar." não aparece | — |
| 07 | Reproduzir o passo 03/04: pingente "Lúcia", corrente de novo com 32 caracteres | Total do conjunto R$ 429,80 com a corrente marcada a R$ 139,90 e a medalha — reproduziu (2 de 2) | `screenshots/CH-02-02-total-sem-corrente.png` |
| 08 | Colar na corrente “Pedro” — 2026 (aspas curvas e travessão) e levar o conjunto | Gaveta abre sozinha, "Sua sacola 3": pingente `Gravação: Lúcia`; Cartier "Acompanha o QA Pingente Estrela", `Gravação: “Pedro” — 2026`; Medalha "Acompanha o QA Pingente Estrela"; cada adicional com quantidade 1; Subtotal R$ 569,70 | `screenshots/CH-02-03-sacola-3-linhas.png` |
| 09 | Aumentar o pingente para 2 na gaveta | Pingente 2, adicionais seguem 1; Subtotal (4 itens) R$ 849,60 (2 × 279,90 + 139,90 + 149,90) | — |
| 10 | Duplo clique em "Finalizar Pedido" | Um único `/checkout`, "Resumo · 4 itens R$ 790,13" (849,60 × 0,93) | — |
| 11 | Preencher contato como convidada, CEP 90010-000, nº 100, SEDEX, CPF | Sem desafio de código (e-mail novo); resumo: Subtotal R$ 849,60, Frete R$ 23,48, Desconto PIX (7%) −R$ 59,47, Total R$ 813,61; preço de cada item igual ao da sacola | `screenshots/CH-02-04-checkout-resumo.png` |
| 12 | Duplo clique em "Pagar R$ 813,61 com PIX" | `/pedido/7d506894…/pagamento`: "Pedido #0327 · Aguardando pagamento", "Não foi possível gerar o código agora", **R$ 813,61 · valor do pedido, ainda não cobrado**. Rede: `POST /functions/v1/mercado-pago?action=create-payment → 503` (esperado no local, D-02) | `screenshots/CH-02-05-pagamento-0327.png` |
| 13 | Voltar para `/checkout` e concluir de novo | Checkout ainda preenchido; "Pagar" levou ao **mesmo** `/pedido/7d506894…/pagamento` (#0327) — sem pedido duplicado | — |
| 14 | Abrir a confirmação `/pedido/7d506894…` | "Pedido #0327 · 4 peças · R$ 813,61"; Cartier e Medalha com "Acompanha o QA Pingente Estrela"; gravações nas linhas certas; "Seu material · Aguardando material · Cinzas". Detalhe: Subtotal R$ 849,60 + Frete R$ 23,48 e Total R$ 813,61, sem linha de desconto PIX | `screenshots/CH-02-06-confirmacao-0327.png` |
| 15 | Painel (1440, `admin-painel`) — abrir o pedido #0327 | "Pendente · Aguardando material"; "QA Medalha Afetiva — aguarda: Cinzas"; "Gravar em QA Pingente Estrela: “Lúcia”" e "Gravar em QA Corrente Cartier: ““Pedro” — 2026”"; Cartier e Medalha com "Acompanha o QA Pingente Estrela"; 1 un cada, R$ 139,90 e R$ 149,90; Pagamento: Total R$ 813,61 | `screenshots/CH-02-07-painel-0327.png` |
| 16 | Painel — Pedidos › aba "Fila de material" | #0327 é a primeira linha da fila | `screenshots/CH-02-08-fila-material.png` |

**Edge cases tentados:**

- Duplo clique em "Finalizar Pedido" — um checkout só.
- Duplo clique em "Pagar … com PIX" — um pedido só (#0327).
- Voltar do pagamento para o checkout e concluir de novo — mesmo pedido, sem duplicar.
- Gravação com aspas curvas e travessão colados — chega igual à sacola, à confirmação e ao painel, sem entidade HTML (na confirmação e no painel as aspas ficam dobradas: ver Spec-gaps).
- Gravação acima do limite na corrente e no pingente — nada entra na sacola.
- Quantidade do principal maior que 1 ajustada na gaveta (celular) — adicionais seguem com 1, totais batem.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-002 | pass | 01–14 | `screenshots/CH-02-05-pagamento-0327.png`, `CH-02-06-confirmacao-0327.png` | Total checkout = valor do pedido = R$ 813,61; QR ausente por 503 da `mercado-pago` (D-02). Variações cupom e recarregar no envio não executadas |
| TC-FUNC-008 | pass | 02, 08 | `screenshots/CH-02-03-sacola-3-linhas.png` | Gravação dentro do bloco com o limite da peça (30); textos nas linhas certas. A sacola mostra `Gravação: Lúcia` sem aspas (o TC escreve com aspas — ver Spec-gaps). Variação "só espaços" não executada |
| TC-FUNC-009 | pass | 04, 08 | `screenshots/CH-02-03-sacola-3-linhas.png` | Nenhuma menção a material no bloco; Medalha entra como linha própria |
| TC-FUNC-012 | skip | 08 | `screenshots/CH-02-03-sacola-3-linhas.png` | Executado com 2 adicionais (A1 e A3) → 3 linhas corretas, gaveta abre sozinha; o caso pede os 3 adicionais (4 linhas), não montado por orçamento |
| TC-FUNC-014 | fail | 03–08 | `screenshots/CH-02-01-limite-corrente.png` | Passos 1 e 3 passam; no passo 2 o botão fica bloqueado ("Revisar a gravação"), mas o texto esperado não aparece ⇒ A-2. Ver também A-1 (total) |
| TC-FUNC-016 | skip | — | — | Combinação indisponível e M-05 não executados nesta sessão (orçamento; bloco é território do CH-01) |
| TC-FUNC-018 | skip | 08 | `screenshots/CH-02-03-sacola-3-linhas.png` | M-06 (nome longo) não executado; com M-01 a frase "Acompanha o QA Pingente Estrela" aparece completa na gaveta |
| TC-FUNC-019 | pass | 14, 15 | `screenshots/CH-02-06-confirmacao-0327.png`, `CH-02-07-painel-0327.png` | Confirmação e painel com a frase em cada adicional; trecho Minha Conta fica com CH-05 |
| TC-FUNC-023 | pass | 09–15 | `screenshots/CH-02-04-checkout-resumo.png`, `CH-02-07-painel-0327.png` | Subtotal sacola R$ 849,60 = checkout; total checkout R$ 813,61 = pagamento = painel; preço unitário de cada item = sacola; nenhum desconto de "compra junto". Variação cupom não executada |
| TC-INT-001 | pass | 15, 16 | `screenshots/CH-02-08-fila-material.png` | #0327 na Fila de material (só o adicional exige material) |

Contagem: pass 6 · fail 1 · blocked 0 · skip 3

## Achados

### A-1 · [Bloco Compre Junto] O total do conjunto ignora a peça marcada cuja gravação passou do limite, mas conta a peça — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-02, passo 1 (preencher gravações) · passos 03, 04 e 07 do log       |
| TC                  | TC-FUNC-014                                                           |
| Gravidade proposta  | medium — a cliente vê "Conjunto · 3 peças" com um total que não inclui uma das três (R$ 429,80 em vez de R$ 569,70), justamente no momento em que está corrigindo o texto; ela não consegue comprar nesse estado, mas o número dela não confere com a soma das linhas |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, abrir http://localhost:8082/produtos/qa-pingente-estrela em 390 × 844.
2. Escolher Prata 925 · Com gravação: Sim. Em "QA Correntes" › "Ver os 2 modelos", escolher QA Corrente Cartier · 45 cm · Com gravação: Sim e marcar a linha (mostra R$ 139,90).
3. Na gravação da corrente, digitar 32 caracteres (ex.: "Pedro e Lúcia para sempre juntos"). Marcar QA Medalha Afetiva · Prata 925.

**Esperado:** "Total do conjunto" e a barra fixa somam as peças que ela marcou e que a barra conta (279,90 + 139,90 + 149,90 = R$ 569,70), ou não contam a corrente nas peças — **fonte:** PRD CA-04.6 / RNF-04 (o total que a cliente vê é o que ela leva); TC-FUNC-014.

**Observado:** "Total do conjunto R$ 429,80 · R$ 399,71 com Pix" e barra fixa "R$ 429,80 · Conjunto · 3 peças", com a linha da corrente marcada mostrando R$ 139,90. Com só a corrente marcada, o total é R$ 279,90 (só o pingente) e a barra diz "Conjunto · 2 peças". Ao encurtar a gravação para ≤ 30, o total passa a R$ 569,70.

**Evidência:**

- `screenshots/CH-02-01-limite-corrente.png` — corrente marcada a R$ 139,90, contador 32 / 30, Total do conjunto R$ 279,90
- `screenshots/CH-02-02-total-sem-corrente.png` — corrente e medalha marcadas, Total do conjunto R$ 429,80
- console: nada
- rede: nada

### A-2 · [Bloco / barra fixa] Com a gravação do principal acima do limite, o aviso do conjunto previsto não aparece — para a cliente

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-02, passo 1 · passo 06 do log                                       |
| TC                  | TC-FUNC-014 (passo 2)                                                 |
| Gravidade proposta  | low — o botão fica bloqueado como "Revisar a gravação" e o campo do pingente explica o limite, então ela entende; só o texto difere do previsto |
| Reproduziu          | sim (1 de 1 observação direta; o estado foi revisto no passo 07 com o pingente válido) — registrar como sim com ressalva |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, http://localhost:8082/produtos/qa-pingente-estrela, Prata 925 · Com gravação: Sim, marcar a QA Corrente Cartier · 45 cm · Sim com gravação "Pedro".
2. Na gravação do pingente, digitar "Lúcia Mariana" (13 caracteres, limite 12).

**Esperado:** "o botão fica bloqueado; 'A gravação passou do limite. Ajuste o texto para continuar.'" — **fonte:** TC-FUNC-014 passo 2; textos do protótipo (spec › Design › Loja).

**Observado:** botão da barra fixa "Revisar a gravação" desabilitado; junto do campo do pingente "A gravação tem 13 caracteres e o limite desta peça é 12."; a frase "A gravação passou do limite. Ajuste o texto para continuar." não é exibida (ela aparece, como alerta, quando o excesso é na corrente e se toca "Levar o conjunto" — passo 05).

**Evidência:**

- snapshot do passo 06 (sem screenshot)
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Na confirmação `/pedido/:id`, o detalhe lista Subtotal R$ 849,60 e Frete R$ 23,48 e o Total R$ 813,61, sem a linha "Desconto PIX (−R$ 59,47)" que o checkout mostrava — as parcelas não somam o total | 14 | pré-existente |
| A gravação colada com aspas curvas aparece com aspas dobradas na confirmação e no painel (`““Pedro” — 2026”`), porque a tela já envolve o texto em aspas; na sacola aparece sem aspas (`Gravação: Lúcia`) e o TC escreve `Gravação: "Lúcia"` | 08, 14, 15 | polimento |
| O resumo do checkout lista as peças sem a frase "acompanha" e sem a gravação (a sacola, a confirmação e o painel mostram) | 11 | polimento |

## Fora da cobertura

- Quantidade do principal > 1 pelo seletor do computador — só a variante do celular (ajuste na gaveta) foi feita; orçamento.
- Cupom válido no checkout com o conjunto (TC-JOURNEY-002 / TC-FUNC-023, variação) — orçamento.
- Recarregar durante o envio do pedido; fechar a aba na tela do pagamento e reabrir o link — orçamento (a reabertura por navegação ao checkout foi feita, passo 13).
- Gravação só com espaços — orçamento.
- TC-FUNC-012 com os 3 adicionais, TC-FUNC-016 (combinação indisponível, M-05) e TC-FUNC-018 com M-06 — orçamento.
- QR do PIX e valor dentro do PIX — `mercado-pago` local 503 (D-02, não reprova).
- Minha Conta com o pedido (TC-FUNC-019 passo 2) — atribuído ao CH-05.
- Rede lenta durante a conclusão — fora do alcance do browser da sessão sem throttling.
- TC-INT-003 — com o Dev, fora da sessão.
- Saída da conta do painel: não houve logout explícito; o contexto isolado do painel foi descartado ao fechar o browser.

## Debrief

- **Surpresas:** o total do conjunto exclui silenciosamente a peça com gravação inválida enquanto a contagem de peças a inclui (A-1).
- **Próximo charter:** conferir o cupom com o conjunto e o recarregar no envio (variações do TC-JOURNEY-002 que ficaram fora), e o "só espaços".
- **Padrão novo:** comparar a soma das linhas marcadas com o "Total do conjunto" em cada estado inválido do bloco, não só no válido.
