# Sessão CH-02 · Sacola e checkout: o desconto só com a joia, na medida da joia, até o pedido gravado

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-sacola-e-checkout-presenca-e-quantidade.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima (convidada `@exemplo.invalid`)          |
| Tour · modo | Money · por técnica (transição de estado)                              |
| Rodada      | exploração                                                             |
| Orçamento   | ~63 ações de browser de 70 (várias ações agrupadas em `browser_run_code_unsafe`, contadas uma por chamada) |
| Ambiente    | http://localhost:8082 (worktree do WI 92) · build não exposto · Chromium headless (Playwright MCP) · viewports 390×844 · 1440×900 · 320×568 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; `mercado-pago` com chave inválida (o `create-payment` responde 400 e a tela de pagamento mostra a falha — o "cobrado" é o valor do pedido gravado); Melhor Envio falha ⇒ "Frete padrão" R$ 19,90; fonte do sistema simulada por `font-size` no `<html>` |

**Premissas registradas:** a massa não tem a "corrente avulsa R$ 79,90 a 15 %" dos TC; a peça avulsa a 15 % é o **QA Berloque Coração** (Prata R$ 69,90 → R$ 59,42; Folheado R$ 74,90 → R$ 63,67; Rosé R$ 79,90 não liberada). Os valores esperados dos TC foram recalculados com ela. M-10 = "QA Joia Sem Compre Junto" + "QA Medalha Afetiva" (sem o par recíproco na sacola).

**Pedidos criados:** **#0360** (id `7f8cdd3a-…`, P + Berloque ×2 linha mista, PIX, R$ 381,87) e **#0361** (id `ce2af6de-…`, M-10 + QA92CUPOM15, PIX, R$ 296,42, num contexto de browser novo).

## Missão

Achar qualquer jeito de a corrente sair com desconto sem a joia na sacola, com desconto em mais unidades do que a
joia permite, ou com um valor diferente do bloco entre a sacola, o checkout e o pedido gravado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Em `/produtos/qa-pingente-estrela` (390), marcar o Berloque, Prata 925 | Bloco: "Desconto do Compre Junto −R$ 10,48", "Total do conjunto R$ 319,32", "R$ 296,97 no Pix"; barra "Levar o conjunto" | — |
| 02 | Tocar "Levar o conjunto" | Gaveta: Berloque `R$ 69,90` riscado / `R$ 59,42`, "Acompanha o QA Pingente Estrela · 15% a menos"; Subtotal (2 itens) R$ 329,80 · Desconto do Compre Junto −R$ 10,48 · **Total R$ 319,32 = bloco** | — |
| 03 | Aumentar o Berloque para 2 | "1 com desconto, 1 a preço cheio"; linha R$ 139,80 → R$ 129,32 (59,42 + 69,90); desconto segue −R$ 10,48; Total R$ 389,22 | `screenshots/CH-02-03-gaveta-linha-mista-390.png` |
| 04 | Aumentar P para 2 | Frase da linha mista some; linha R$ 139,80 → R$ 118,84 (2 × 59,42); desconto −R$ 20,96; Total R$ 638,64 | — |
| 05 | Tirar P da sacola | Berloque volta a R$ 139,80 sem de/por; "O desconto de 15% volta com o QA Pingente Estrela na sacola."; sem linha de desconto; Total R$ 139,80 | `screenshots/CH-02-05-sem-joia-390.png` |
| 06 | Ir ao checkout só com o Berloque | "Pagar R$ 130,01 com PIX" (139,80 × 0,93) — preço cheio, sem desconto casado | — |
| 07 | Voltar à página de P e acrescentá-lo de novo (só a joia, pelo "Adicionar à sacola") | O desconto volta: linha mista "1 com desconto, 1 a preço cheio", −R$ 10,48, Total R$ 389,22 | — |
| 08 | Abrir o checkout e o resumo | Itens com "Acompanha o … · 15% a menos", "1 com desconto, 1 a preço cheio", R$ 139,80 / R$ 129,32. Resumo na ordem **Subtotal R$ 399,70 · Frete a calcular · Desconto do Compre Junto −R$ 10,48 · Desconto PIX (7%) −R$ 27,25 · Total R$ 361,97** — Frete **antes** dos descontos (A-1). Nota "O desconto do Compre Junto vale enquanto a joia estiver no mesmo pedido." presente | `screenshots/CH-02-08-checkout-resumo-ordem-390.png` |
| 09 | Preencher contato (convidada) e entrega CEP 90010-000, "Frete padrão" | Resumo: Subtotal 399,70 · Frete · Correios Frete padrão R$ 19,90 · CJ −10,48 · PIX −27,25 (7 % × 389,22) · **Total R$ 381,87**; cartão "4x de R$ 102,28" (409,12 / 4 — sem PIX, com desconto casado) | — |
| 10 | Fonte 100/130/200 % no checkout | `scrollWidth` 390 nos três; resumo legível, sem sobreposição | `screenshots/CH-02-11-resumo-fonte200-390.png` |
| 11 | CPF e **duplo clique** em "Pagar R$ 381,87 com PIX" | Um só `create-order` na rede; abre `/pedido/7f8cdd3a…/pagamento` — **Pedido #0360, R$ 381,87** = checkout | `screenshots/CH-02-12-pagamento-0360-390.png` |
| 12 | Recarregar a tela de pagamento | Mesmo #0360, R$ 381,87; nenhum `create-order` novo | — |
| 13 | Abrir `/pedido/:id` | Berloque em duas linhas: uma "Acompanha o QA Pingente Estrela · 15% a menos · Prata 925 · 1 unidade" R$ 69,90 → R$ 59,42, outra "Prata 925 · 1 unidade" R$ 69,90; resumo **Subtotal · Frete · Desconto do Compre Junto · Desconto PIX · Total R$ 381,87** — Frete antes dos descontos (A-1, 2ª tela) | `screenshots/CH-02-14-confirmacao-0360-390.png` |
| 14 | Esvaziar o Berloque; pôr o Berloque Folheado pela página dele (catálogo) com P na sacola | Berloque sai com R$ 74,90 → R$ 63,67, "Acompanha o QA Pingente Estrela · 15% a menos", desconto −R$ 11,23 | — |
| 15 | Tirar P | Berloque a R$ 74,90, **sem** a frase "O desconto … volta" (entrou pelo catálogo) | — |
| 16 | Com o Berloque primeiro, pôr P em "Chaveiro" | Bloco com "Chaveiro" mostra só a Medalha (lista e Berloque escondidos); Berloque segue R$ 74,90, sem desconto | — |
| 17 | Pôr P em Prata 925 (P agora em duas linhas: Chaveiro + Prata) | Berloque passa a R$ 63,67 com desconto; −R$ 11,23 (uma unidade só) | — |
| 18 | Pôr um Berloque **Rosé** (não liberado) pelo catálogo | Rosé a R$ 79,90 sem desconto; desconto segue −R$ 11,23 | `screenshots/CH-02-20-chaveiro-rose-sem-desconto-390.png` |
| 19 | Mesma sacola em duas abas: aba 2 no checkout; na aba 1 tirar o P Prata | Aba 1: Berloque Folheado volta a R$ 74,90 sem desconto. Aba 2 continua com o desconto e R$ 598,33 até recarregar; recarregada, R$ 367,07 sem desconto | — |
| 20 | Esvaziar e montar M-10 (Joia Sem Compre Junto + Medalha Afetiva) + QA92CUPOM15 | Gaveta sem linha de desconto casado nem de/por; Cupom −R$ 52,47; Total R$ 297,33 | — |
| 21 | Checkout (contato e entrega já salvos da sessão): resumo | Subtotal 349,80 · Frete 19,90 · Cupom −52,47 · PIX −20,81 · **Total R$ 296,42**; botão "Pagar R$ 296,42 com PIX" | `screenshots/CH-02-26-checkout-29642-390.png` |
| 22 | Tocar "Pagar R$ 296,42 com PIX" | Abre **`/pedido/7f8cdd3a…/pagamento` — Pedido #0360, R$ 381,87** (o pedido anterior, com outras peças). Nenhum `create-order` na rede; `create-payment` chamado de novo para o #0360 (A-2) | `screenshots/CH-02-27-pagar-29642-abre-0360-390.png` |
| 23 | Voltar ao `/checkout` e tocar "Pagar R$ 296,42" de novo | Mesmo resultado: #0360, R$ 381,87 (A-2 reproduz 2 de 2) | — |
| 24 | Num contexto de browser novo (390), repetir M-10 + cupom e pagar | **Pedido #0361**, R$ 296,42 no pagamento e em `/pedido/:id`; itens sem "Acompanha" nem de/por; resumo Subtotal · **Frete** · Cupom · PIX · Total (A-1 reproduz também sem o desconto casado) | `screenshots/CH-02-30-confirmacao-reg001-390.png` |
| 25 | 1440: no mesmo contexto, P + Berloque Prata pelo bloco | Bloco "Total do conjunto R$ 319,32"; nota do computador "A joia e 1 peça marcada · R$ 319,32"; gaveta com Berloque R$ 69,90 → R$ 59,42 e −R$ 10,48 (a sacola tinha também os itens do #0361 e o cupom, então o Total difere do bloco — esperado) | `screenshots/CH-02-31-gaveta-1440.png` |
| 26 | Gaveta em 320×568 | `scrollWidth` 320 do documento e da gaveta | `screenshots/CH-02-32-gaveta-320.png` |
| 27 | Ler o chip do cupom na gaveta depois de a sacola mudar | Chip "QA92CUPOM15 aplicado −R$ 52,47" enquanto a linha "Cupom QA92CUPOM15" do rodapé diz −R$ 100,37 (passo 25) e −R$ 91,46 depois de tirar o Berloque (A-3) | `screenshots/CH-02-31-gaveta-1440.png` |

**Edge cases tentados:** duplo clique no confirmar (um pedido só, passo 11); recarregar a tela de pagamento (passo 12); mesma sacola em duas abas tirando a joia numa delas (passo 19 — a outra aba só sincroniza ao recarregar; o valor exibido segue coerente com o conteúdo que ela mostra); gaveta em 320×568 (passo 26); fonte 200 % no checkout (passo 10); voltar ao checkout depois de criar o pedido (passos 22–23, achou A-2). Não tentados: recarregar durante o envio, rede lenta, fechar e reabrir a aba.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-SMOKE-002 | pass | 01–02, 25 | `screenshots/CH-02-31-gaveta-1440.png` | bloco R$ 319,32 = gaveta R$ 319,32, mesma linha "Desconto do Compre Junto −R$ 10,48"; 1440: nota e bloco iguais |
| TC-JOURNEY-001 | fail | 01–13 | `screenshots/CH-02-08-checkout-resumo-ordem-390.png` · `CH-02-14-confirmacao-0360-390.png` | valores fecham ao centavo (checkout = pagamento = confirmação = R$ 381,87), mas o resumo põe o Frete antes dos descontos ⇒ A-1 |
| TC-JOURNEY-002 | pass | 05–07 | `screenshots/CH-02-05-sem-joia-390.png` | sem a joia volta ao cheio na hora, com a frase da volta; checkout sem desconto; reacrescentar a joia devolve o desconto |
| TC-FUNC-012 | pass | 02, 04, 13, 14 | `screenshots/CH-02-14-confirmacao-0360-390.png` | 69,90 → 59,42 e 74,90 → 63,67 (por variação); 2 × 59,42 = 118,84; mesmo valor na gaveta, checkout e `/pedido/:id`. Painel não conferido |
| TC-FUNC-013 | pass | 03–04, 08, 13 | `screenshots/CH-02-03-gaveta-linha-mista-390.png` | "1 com desconto, 1 a preço cheio" na gaveta e no checkout; duas linhas na confirmação; P ×2 tira a frase |
| TC-FUNC-015 | pass | 14–17 | — | catálogo recebe o desconto; sem a frase da volta ao tirar P; corrente primeiro e P depois ⇒ desconto entra |
| TC-FUNC-018 | fail | 08–09 | `screenshots/CH-02-08-checkout-resumo-ordem-390.png` | PIX = 7 % × (subtotal − CJ) ao centavo (27,25); cartão sem PIX e com CJ; mas a ordem Frete antes dos descontos ⇒ A-1. Troca efetiva para cartão não feita (lido o "4x de R$ 102,28") |
| TC-FUNC-019 | pass | 02, 08 | `screenshots/CH-02-08-checkout-resumo-ordem-390.png` | de/por na gaveta e no checkout, mesma linha e valor, nota do checkout presente. `/carrinho` não existe (redireciona; spec-gap do CH-01) |
| TC-FUNC-022 | pass | 16–18 | `screenshots/CH-02-20-chaveiro-rose-sem-desconto-390.png` | "Chaveiro" esconde e não dá desconto; P em Chaveiro + Prata dá uma unidade só; Rosé não liberado a preço cheio |
| TC-FUNC-024 | fail | 09–12, 21–23 | `screenshots/CH-02-27-pagar-29642-abre-0360-390.png` | 1º pedido: exibido = gravado (R$ 381,87), duplo clique e recarregar sem pedido novo; mas com a sacola trocada o "Pagar R$ 296,42" abre o pedido anterior de R$ 381,87 ⇒ A-2 |
| TC-FUNC-026 | fail | 13 | `screenshots/CH-02-14-confirmacao-0360-390.png` | linhas e de/por certos, conta fecha; ordem do resumo com Frete antes dos descontos ⇒ A-1. Minha conta é do CH-03 |
| TC-REG-001 | pass | 20–24 | `screenshots/CH-02-30-confirmacao-reg001-390.png` | nenhuma linha CJ nem de/por; #0361 = R$ 296,42 em todas as telas. (Exigiu contexto novo por causa de A-2; a ordem do resumo é A-1) |
| TC-UI-002 | pass | 10, 26 | `screenshots/CH-02-11-resumo-fonte200-390.png` · `CH-02-32-gaveta-320.png` | sem rolagem horizontal em 390 (100/130/200 %) e 320; gaveta a 130/200 % não medida |

Contagem: pass 9 · fail 4 · blocked 0 · skip 0

## Achados

### A-1 · [Loja · checkout e confirmação] O resumo põe o Frete antes dos descontos, fora da ordem do painel

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-01, passos 5–7 (checkout, confirmação) · passos 08, 09, 13, 21, 24 do log |
| TC                  | TC-JOURNEY-001, TC-FUNC-018, TC-FUNC-026                               |
| Gravidade proposta  | medium — a conta fecha ao centavo, mas a cliente vê uma ordem diferente da que a dona vê no painel, contra a decisão Q-01 que o charter declara bug |
| Reproduziu          | sim (4 de 4: checkout e `/pedido/:id` do #0360, checkout e `/pedido/:id` do #0361) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, `http://localhost:8082/produtos/qa-pingente-estrela` em 390×844
2. Marcar "QA Berloque Coração" (Prata 925) e tocar "Levar o conjunto"; "Finalizar Pedido"
3. No checkout, abrir "Resumo · N itens"; depois fechar o pedido com PIX e abrir `/pedido/:id`

**Esperado:** Subtotal · Desconto do Compre Junto · (progressivo · oferta) · Cupom · Desconto PIX · Frete · Total — **fonte:** decisão Q-01 do Gate 1 (2026-11-04); charter CH-02 campo Mudança ("o Frete antes dos descontos é bug"); TC-FUNC-018, TC-FUNC-026.

**Observado:** checkout: "Subtotal R$ 399,70 · Frete · Correios Frete padrão R$ 19,90 · Desconto do Compre Junto −R$ 10,48 · Desconto PIX (7%) −R$ 27,25 · Total R$ 381,87" (antes do CEP, "Frete a calcular" na mesma posição). `/pedido/:id`: "Subtotal · Frete · Desconto do Compre Junto · Desconto PIX · Total". Também sem desconto casado (#0361): "Subtotal · Frete · Cupom · Desconto PIX · Total".

**Evidência:**

- `screenshots/CH-02-08-checkout-resumo-ordem-390.png` — resumo do checkout com o Frete em 2º
- `screenshots/CH-02-14-confirmacao-0360-390.png` — confirmação do #0360 na mesma ordem
- `screenshots/CH-02-30-confirmacao-reg001-390.png` — #0361 (cupom) com o Frete antes do cupom
- console: nada · rede: nada

### A-2 · [Loja · checkout] Com um pedido PIX pendente na sessão, "Pagar" de uma sacola nova abre o pedido antigo, com outro valor e outras peças

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-01, passo 6 (confirmar o pagamento) · passos 21–23 do log           |
| TC                  | TC-FUNC-024                                                           |
| Gravidade proposta  | critical — o botão diz "Pagar R$ 296,42" e a tela de pagamento cobra R$ 381,87 de um pedido com outras peças; o pedido da sacola atual nunca é criado (exibido ≠ cobrado, RNF-01) |
| Reproduziu          | sim (2 de 2, na mesma aba) — numa aba de contexto novo, a mesma sacola cria o #0361 certo |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, 390×844. Montar P + Berloque (bloco), ir ao checkout como convidada (`@exemplo.invalid`), frete padrão, CPF, "Pagar R$ X com PIX" ⇒ cria o pedido A e abre `/pedido/<A>/pagamento` (no local o QR falha; o pedido fica "aguardando pagamento")
2. Na mesma aba, tirar todas as peças da sacola e pôr outras (ex.: "QA Joia Sem Compre Junto" + "QA Medalha Afetiva" + cupom QA92CUPOM15); "Finalizar Pedido"
3. No checkout (contato e entrega já preenchidos), conferir "Pagar R$ 296,42 com PIX" e tocar

**Esperado:** um pedido novo com as peças e o total do checkout, e `/pedido/<novo>/pagamento` com R$ 296,42 — **fonte:** `prd.md` CA-04.2, RNF-01 (exibido = cobrado); TC-FUNC-024.

**Observado:** abre `/pedido/7f8cdd3a-…/pagamento` "PEDIDO #0360 · AGUARDANDO PAGAMENTO … R$ 381,87" (o pedido do passo 1, com P e dois Berloques). Rede: nenhum `checkout?action=create-order`; `checkout?action=get-order → 200` e `mercado-pago?action=create-payment → 400` (chave inválida) para o #0360. A sacola continua com as peças novas. Não se sabe se é do WI 92 ou anterior (o pedido pendente guardado na sessão do checkout).

**Evidência:**

- `screenshots/CH-02-26-checkout-29642-390.png` — checkout com "Pagar R$ 296,42 com PIX" e as peças novas
- `screenshots/CH-02-27-pagar-29642-abre-0360-390.png` — tela de pagamento do #0360, R$ 381,87
- console: 2 erros na tela de pagamento (falha do Mercado Pago local)
- rede: `POST /functions/v1/mercado-pago?action=create-payment → 400` (do #0360); nenhum `create-order`

### A-3 · [Loja · gaveta] O selo do cupom aplicado mantém o valor da hora da aplicação, diferente da linha do cupom no rodapé

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-01, passo 4 (sacola) · passos 25, 27 do log                         |
| TC                  | —                                                                     |
| Gravidade proposta  | low — o Total está certo, mas a gaveta mostra dois valores de cupom ao mesmo tempo (−R$ 52,47 e −R$ 100,37) e a cliente não sabe qual vale |
| Reproduziu          | sim (2 de 2: depois de acrescentar o conjunto e depois de tirar o Berloque) |
| Viewport            | 1440 × 900 e 390 × 844                                                |

**Passos para reproduzir** — de um estado limpo:

1. Anônima; pôr "QA Joia Sem Compre Junto" e "QA Medalha Afetiva" na sacola; aplicar QA92CUPOM15 na gaveta (selo "−R$ 52,47")
2. Acrescentar mais peças (ex.: P + Berloque pelo bloco)
3. Ler o selo do cupom e a linha "Cupom QA92CUPOM15" do rodapé

**Esperado:** um valor só de cupom na gaveta, o que vale para a sacola atual — **fonte:** nenhuma explícita; CA-03.8 (a gaveta mostra o mesmo valor que o checkout). Provável anterior ao WI e do território do CH-03 (concorrência com cupom).

**Observado:** selo "QA92CUPOM15 aplicado −R$ 52,47" enquanto o rodapé diz "Cupom QA92CUPOM15 −R$ 100,37" (e −R$ 91,46 depois de tirar o Berloque). O cupom do rodapé incide sobre o valor já com o desconto casado ((679,60 − 10,48) × 15 % = 100,37).

**Evidência:**

- `screenshots/CH-02-31-gaveta-1440.png` — selo e rodapé com valores diferentes
- console: nada · rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A peça acrescentada pelo catálogo (sem passar pelo bloco) mostra "Acompanha o QA Pingente Estrela · 15% a menos" igual à que veio pelo bloco; nenhuma fonte define a frase dessa linha (nota do TC-FUNC-015) | 14 | polimento |
| Mesma sacola em duas abas: a aba no checkout mantém o desconto e o total antigos até recarregar (o valor segue coerente com as peças que ela mostra) | 19 | pré-existente |
| A tela de pagamento mostra a mensagem crua do Mercado Pago em inglês ("At least one policy returned UNAUTHORIZED.") na falha — no local por chave inválida | 11 | pré-existente |
| O botão "Adicionar à sacola" da barra fixa só fica clicável depois de rolar a página (no topo, fora da viewport) | 07 | pré-existente |

## Fora da cobertura

- Rede lenta no confirmar e recarregar durante o envio — não alcançado (orçamento).
- Fechar e reabrir a aba com a sacola montada — não tentado (orçamento).
- O valor no painel (TC-FUNC-012 passo 2, TC-JOURNEY-001 efeito) — painel fora deste charter; os pedidos #0360 e #0361 ficam para o CH do painel.
- Troca efetiva de PIX para cartão no checkout (TC-FUNC-018 passo 2) — lido só o "no cartão: 4x de R$ 102,28" (= 409,12, com o desconto casado e sem PIX); o Brick do cartão não sobe no local.
- A corrente da lista (10 %) pelo catálogo e na jornada (variações de TC-JOURNEY-001 e TC-FUNC-015) — não repetido (orçamento).
- Gaveta e `/carrinho` a 130 % e 200 % (TC-UI-002 passo 1) — medida só a 100 % em 390 e 320; `/carrinho` não existe.
- Minha conta (TC-FUNC-026 passo 3) — é do CH-03.

## Debrief

- **Surpresas:** A-2 — trocar a sacola depois de um PIX pendente leva o botão "Pagar" ao pedido antigo, sem criar o novo; só apareceu ao montar o 2º pedido na mesma aba.
- **Próximo charter:** confirmar A-2 com cartão e com a sacola só acrescida (não trocada); CH-03 olhar o selo do cupom (A-3) e a ordem do resumo com cupom; o painel conferir #0360 (linha mista) e #0361.
- **Padrão novo:** "segundo pedido na mesma sessão" — fechar um pedido pendente e montar outra sacola na mesma aba; candidato a tour Money.
