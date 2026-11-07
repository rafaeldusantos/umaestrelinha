# Sessão CH-03 · Cupom, promoção, oferta do checkout e duas joias: nenhum desconto se soma onde não devia

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-03-concorrencia-de-descontos.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-04 Helena · conta: `cliente-loja` (helena.qa@exemplo.com, código pelo Mailpit); painel: usuário de desenvolvimento do `seed.sql` (credencial não escrita aqui) |
| Tour · modo | Money · por técnica (tabela de decisão: casado × promoção × bump × cupom × PIX) |
| Rodada      | exploração                                                             |
| Orçamento   | ~71 ações de browser de 70 (várias interações agrupadas em `browser_run_code_unsafe`, contadas uma por chamada; as 2 últimas foram sair da conta e fechar) |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 (worktree do WI 92) · build não exposto · Chromium headless (Playwright MCP) · viewports 1440×900 e 390×844 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; Mercado Pago com chave inválida (o "cobrado" é o valor do pedido gravado); Melhor Envio falha ⇒ "Correios Frete padrão" R$ 19,90; e-mail lido pela prévia da aba Notificações com o `order_id` |

**Premissas registradas:**

- A "corrente avulsa a 15 %" dos TC é o **QA Berloque Coração** (avulso a 15 % em P, a 20 % em Q) — mesma premissa do CH-02. A "corrente em promoção maior que o casado" é a **QA Corrente Cartier** (lista a 10 %; progressiva 30 % com 2+ unidades). A oferta do checkout é a **QA Corrente Veneziana** a 20 %.
- A promoção progressiva só vale com 2 unidades da Cartier; por isso o conjunto foi levado com 1 e a quantidade subiu para 2 na sacola.
- A regra "o casado de uma unidade + a diferença da promoção como linha de promoção" foi lida como a frase de CA-02.4 ("a diferença aparece só ali") e como TC-FUNC-010 passo 3; o TC-FUNC-016 passo 1 pede outra coisa (ver Spec-gaps).
- O pedido #0363 foi feito num contexto de browser novo (CH-02 #2). A sacola do primeiro contexto **não** se esvazia depois do pedido PIX pendente (comportamento já conhecido: a limpeza é na aprovação).

**Pedidos criados:** **#0362** (id `69c76f35-6b56-4552-b46e-983e0906c436`, P + Cartier ×2 em promoção + oferta Veneziana, PIX, R$ 484,60) e **#0363** (id `5b1f1fcb-951f-4b24-a4a7-4e384f4c30c2`, P + Berloque Prata pelo bloco + QA92CUPOM15, PIX, R$ 272,32).

## Missão

Achar uma combinação de cupom, promoção, oferta do checkout e duas joias em que a cliente pague menos do que a
regra diz (descontos somados), mais do que ela diz (desconto perdido), ou leia que um desconto "ficou de fora"
quando não ficou — e conferir que Minha conta e o e-mail contam a mesma conta, na mesma ordem do painel.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar por código (1440); em P (Prata · Não) marcar a lista "QA Correntes" com a Cartier 45 cm | Bloco: Cartier de R$ 119,90 por R$ 107,91, "Desconto do Compre Junto −R$ 11,99", "Total do conjunto R$ 367,81 · R$ 342,06 no Pix" | — |
| 02 | "Levar o conjunto"; na gaveta, aumentar a Cartier para 2 | Antes: "Falta 1 para cada peça sair a R$ 83,93". Depois: linha Cartier **R$ 239,80 → R$ 227,81**, "Acompanha o QA Pingente Estrela · 10% a menos", **"1 com desconto, 1 a preço cheio"**; rodapé Subtotal 499,70 · Desconto do Compre Junto −11,99 · Desconto progressivo −59,95 · **Total R$ 427,76** (= 259,90 + 2 × 83,93: o menor está no Total, não na linha) — A-1 | `screenshots/CH-03-02-promo-vence-casado-1440.png` |
| 03 | "Finalizar Pedido" | Checkout: mesma linha Cartier 239,80 → 227,81 e "1 com desconto, 1 a preço cheio"; Subtotal 499,70 · Frete a calcular · CJ −11,99 · progressivo −59,95 · PIX (7%) −29,94 · Total 397,82 (A-1, 2ª tela) | — |
| 04 | Marcar a oferta "Leva junto com 20% de desconto? QA Corrente Veneziana R$ 71,92 / R$ 89,90" | "4 ITENS", mas "Seu pedido" lista só o pingente e a Cartier; Subtotal sobe para **R$ 571,62** (+71,92, preço da oferta, não o cheio); **nenhuma linha "Desconto da oferta"**; Total 464,70 — A-2 | `screenshots/CH-03-06-checkout-promo-bump-casado-1440.png` |
| 05 | Colar o cupom em minúsculas com espaço no fim: `qa92cupom15 ` | Aceito: "QA92CUPOM15 aplicado −R$ 83,94"; "A promoção QA92 Progressiva Cartier não foi aplicada — o cupom QA92CUPOM15 desconta mais"; CJ −11,99 continua; cupom = 15 % × (571,62 − 11,99) = 83,94; PIX 33,30; Total 442,39 (< 464,70 da promoção: a frase é verdadeira) | — |
| 06 | Remover o cupom | Volta a promoção: progressivo −59,95, Total 464,70 | — |
| 07 | Contato, entrega (CEP 90010-000, Frete padrão), CPF e "Pagar R$ 484,60 com PIX" | Pedido **#0362**, R$ 484,60 (= checkout). A tela de falha mostra o texto cru "At least one policy returned UNAUTHORIZED." (Mercado Pago local) | `screenshots/CH-03-06-checkout-promo-bump-casado-1440.png` |
| 08 | Abrir `/pedido/:id` do #0362 | Linhas: P 259,90; Cartier "Acompanha o QA Pingente Estrela" 45 cm · 2 unidades **R$ 239,80 → R$ 167,86**; Veneziana 1 unidade R$ 89,90 → R$ 71,92. Subtotal **R$ 589,60** (soma dos cheios ✓) · Frete 19,90 · CJ −11,99 · progressivo −59,95 · **Desconto da oferta −17,98** · PIX −34,98 · Total 484,60 (fecha) — Frete antes dos descontos (CH-02 #1) | `screenshots/CH-03-08-confirmacao-0362-1440.png` |
| 09 | Minha conta | "Pagamento pendente · Pedido #0362 · R$ 484,60", lista com R$ 484,60; o detalhe é o mesmo `/pedido/:id` | — |
| 10 | Mesmo contexto: P + Berloque Folheado pelo bloco (a sacola ainda tinha P + Cartier ×2) | P ×2 ⇒ as duas Cartier com casado (−23,98) e o Berloque −11,23 = CJ −35,21; progressivo −47,96 (= 71,94 − 23,98); Total 751,33 (menor certo); linha Cartier R$ 215,82 (A-1, 3ª reprodução) | — |
| 11 | Tirar a Cartier e o pingente; só o Berloque Folheado | "O desconto de 15% volta com o QA Pingente Estrela na sacola." | — |
| 12 | Pôr P (Prata) pelo "Adicionar à sacola" | Berloque Folheado 74,90 → 63,67 (15 %), CJ −11,23 | — |
| 13 | Pôr Q (QA Pingente Lua) | Berloque Folheado → **R$ 59,92 (20 %)**, "Acompanha o QA Pingente Estrela e o QA Pingente Lua · 20% a menos", CJ −14,98 | — |
| 14 | Pôr 2 Berloques Prata pela página do Berloque | Folheado 59,92 (20 % de Q, linha de maior preço); Prata ×2 R$ 139,80 → R$ 129,32 "Acompanha o QA Pingente Estrela · 15% a menos", "1 com desconto, 1 a preço cheio"; **CJ −25,46** (14,98 + 10,48 ✓) | `screenshots/CH-03-17-duas-joias-tres-berloques-1440.png` |
| 15 | Aplicar QA92CUPOM15 na gaveta | Linha "Cupom QA92CUPOM15 −R$ 100,36" (= 15 % × 669,04 ✓), mas o selo diz **"QA92CUPOM15 aplicado −R$ 104,18"** (= 15 % × 694,50, sem o casado) — A-3 | — |
| 16 | Tirar Q com o cupom aplicado | Folheado volta a 63,67 (15 %), Prata ×2 a preço cheio; CJ −11,23; cupom recalcula para −69,51 (= 15 % × 463,37 ✓); selo continua −104,18 | — |
| 17 | Trocar pelo cupom QA92FRETE e ir ao checkout | Gaveta: "Frete grátis", CJ −11,23 continua. Checkout: Frete padrão "Grátis" ✓; mas **"5 ITENS"**, Subtotal **R$ 546,52** (474,60 + 71,92) e "Pagar R$ 497,82": a oferta Veneziana do pedido #0362 **voltou marcada** (`aria-checked=true`) num checkout novo, sem aparecer na lista "Seu pedido" — A-2 | `screenshots/CH-03-21-oferta-herdada-checkout-1440.png` · `screenshots/CH-03-21-checkout-subtotal-com-oferta-oculta-1440.png` |
| 18 | Pôr a própria Veneziana pelo catálogo (P na sacola) | Sacola: Veneziana 89,90 → 80,91 "Acompanha o QA Pingente Estrela · 10% a menos", CJ −20,22 | — |
| 19 | Voltar ao checkout | O cartão da oferta some; a Veneziana entra pelo preço da oferta (Subtotal 546,52, Total 497,82), sem o casado dela (CJ −11,23, só o Berloque): vale o menor (20 %), sem somar ✓; a linha mostra "R$ 89,90" sem de/por nem "Acompanha" (A-2) | — |
| 20 | Contexto novo, 390: entrar por código (o "Entrar" do topo some em 390; entrou-se em 1440 e voltou-se a 390) | Logada | — |
| 21 | P (Prata · Não) + Berloque Prata pelo bloco | Bloco "Total do conjunto R$ 319,32 · R$ 296,97 no Pix"; a barra "Levar o conjunto" mediu top 882 numa janela de 844 (fora da tela; clique pelo DOM) — ver Fora da cobertura | — |
| 22 | Gaveta + QA92CUPOM15 | Berloque 69,90 → 59,42; CJ −10,48; linha "Cupom QA92CUPOM15 −R$ 47,90" (= 15 % × 319,32 ✓), selo **−R$ 49,47** (= 15 % × 329,80) — A-3, 2ª reprodução; Total 271,42 | — |
| 23 | Checkout e "Pagar R$ 272,32 com PIX" | Pedido **#0363**, R$ 272,32 (= checkout: 271,42 × 0,93 + 19,90) | `screenshots/CH-03-30-checkout-cupom-casado-390.png` |
| 24 | `/pedido/:id` do #0363 (390) | Berloque "Acompanha o QA Pingente Estrela · 15% a menos" 69,90 → 59,42; Subtotal 329,80 · **Frete 19,90** · CJ −10,48 · Cupom QA92CUPOM15 −47,90 · Desconto PIX −19,00 · Total 272,32 (fecha; Frete fora da ordem, CH-02 #1) | `screenshots/CH-03-31-confirmacao-cupom-casado-390.png` |
| 25 | Painel, pedido #0363 (1440) | Pagamento: Subtotal 329,80 · CJ −10,48 · Cupom QA92CUPOM15 −47,90 · Desconto PIX −19,00 · **Frete 19,90** · Total 272,32 — a régua Q-01 | `screenshots/CH-03-33-painel-0363-1440.png` |
| 26 | Painel › Notificações › "Pedido recebido", prévia com o `order_id` do #0363 | "1× QA Berloque Coração · Compre Junto · 15% a menos · R$ 69,90 / R$ 59,42" ✓; totais **Subtotal · Frete · Desconto do Compre Junto · Cupom · Desconto PIX · Total** — Frete antes dos descontos (A-4); conta fecha (272,32). Texto "a gente te avisa" | `screenshots/CH-03-34-email-previa-0363-1440.png` |
| 27 | Sair da conta da loja e fechar o browser | "Entrar" de volta no topo | — |

**Edge cases tentados:** cupom em minúsculas com espaço no fim (aceito, passo 05); aplicar e remover o cupom (passos 05–06, 17); tirar uma das duas joias com o cupom aplicado (passo 16); trocar de cupom (passo 17); voltar do checkout à sacola e de novo ao checkout (passos 17–19, achou a oferta herdada); sessão: entrar por código num contexto novo antes do checkout (passo 20). Não tentados: mesma conta em duas abas aplicando o cupom numa; entrar por código **no meio** do checkout.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-004 | fail | 20–25 | `screenshots/CH-03-31-confirmacao-cupom-casado-390.png` · `CH-03-33-painel-0363-1440.png` | valores certos ao centavo (cupom 47,90 = 15 % × (329,80 − 10,48); 272,32 em checkout, pagamento, `/pedido/:id`, painel); a ordem do resumo põe o Frete em 2º (CH-02 #1). Variação cartão não feita |
| TC-FUNC-010 | fail | 01–03, 10 | `screenshots/CH-03-02-promo-vence-casado-1440.png` | bloco mostra o casado (367,81) ✓; Total da sacola usa o menor ✓; rodapé com a diferença como "Desconto progressivo" ✓; mas a linha da Cartier diz 227,81 e "1 a preço cheio" quando se cobra 167,86 ⇒ A-1. Variação "promoção menor" não alcançável com a massa (só 30 %) |
| TC-FUNC-014 | pass | 13–14 | `screenshots/CH-03-17-duas-joias-tres-berloques-1440.png` | 20 % de Q na linha de maior preço (Folheado), 15 % de P numa Prata, a outra cheia; CJ = 14,98 + 10,48 = 25,46. Variação "tirar Q" ✓ (passo 16) |
| TC-FUNC-016 | fail | 02, 08, 19 | `screenshots/CH-03-02-promo-vence-casado-1440.png` · `CH-03-08-confirmacao-0362-1440.png` | o valor cobrado é sempre o menor da linha sem somar (promoção 30 % sobre o casado; oferta 20 % sobre o casado 10 %); mas a sacola e o checkout mostram a linha pelo casado (A-1) e o checkout não mostra a oferta nem o desconto dela (A-2). Passo 2 (promoção menor) não alcançável. Ver Spec-gaps sobre o rodapé pedido no passo 1 |
| TC-FUNC-017 | pass | 05, 15–17 | — | cupom acumula com o casado e incide sobre o subtotal já com ele (83,94; 100,36; 69,51; 47,90); a frase "não foi aplicada — o cupom desconta mais" só com a promoção que de fato desconta, e é verdadeira (442,39 < 464,70); QA92FRETE zera o frete e o casado continua. O selo do cupom é A-3 (fora do critério). Variação "promoção só na corrente com casado maior" sem massa |
| TC-FUNC-020 | pass | 12–13, 16 | — | 15 % com P; 20 % ao acrescentar Q; volta a 15 % ao tirar Q. Variação "duas listas" sem massa |
| TC-FUNC-021 | skip | — | — | orçamento esgotado antes do par recíproco (Medalha Afetiva ↔ Medalha Redonda) |
| TC-FUNC-027 | fail | 07–09 | `screenshots/CH-03-08-confirmacao-0362-1440.png` | na confirmação: Subtotal = soma dos cheios (589,60), uma linha por desconto (CJ, progressivo, "Desconto da oferta", PIX) e a conta fecha; Minha conta R$ 484,60. Falha pela ordem (Frete em 2º, CH-02 #1); o checkout antes do pedido não tem "Desconto da oferta" (A-2) |
| TC-INT-004 | fail | 26 | `screenshots/CH-03-34-email-previa-0363-1440.png` | linha "Compre Junto · 15% a menos" com o cheio riscado acima do cobrado ✓; conta fecha ✓; totais com o Frete em 2º ⇒ A-4. Lido pela prévia (o envio real está desligado); só em 1440 |

Contagem: pass 3 · fail 5 · blocked 0 · skip 1

## Achados

### A-1 · [Loja · sacola e checkout] Com promoção maior que o casado, a linha da peça mostra o preço do casado e "1 a preço cheio", e não o menor que é cobrado

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Helena                                                         |
| Jornada e passo     | J-03a, passos 2–3 (sacola, checkout) · passos 02, 03, 10 do log       |
| TC                  | TC-FUNC-010, TC-FUNC-016                                              |
| Gravidade proposta  | medium — o Total cobra certo (o menor), mas a linha da peça diz R$ 227,81 e "1 com desconto, 1 a preço cheio" quando a peça sai por R$ 167,86: as linhas não somam o Total e a cliente lê que uma unidade vai a preço cheio |
| Reproduziu          | sim (3 de 3: gaveta, checkout, gaveta com P ×2)                       |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Helena logada, sacola vazia, `http://localhost:8082/produtos/qa-pingente-estrela` (1440)
2. Escolher Prata 925 · Não; "Ver os 3 modelos" › QA Corrente Cartier · 45 cm; marcar "Levar junto: QA Correntes"; "Levar o conjunto"
3. Na gaveta, "Aumentar QA Corrente Cartier" (2 unidades ⇒ promoção progressiva de 30 %)

**Esperado:** a sacola mostra o menor preço da linha (2 × R$ 83,93 = R$ 167,86) e a diferença só no rodapé, sem dizer que uma unidade vai a preço cheio — **fonte:** `prd.md` CA-02.4 ("a sacola mostra o menor"), CA-03.5 (vale o menor da linha); TC-FUNC-010 passo 2; TC-FUNC-016 passo 1. A confirmação do mesmo pedido mostra R$ 239,80 → R$ 167,86.

**Observado:** linha "QA Corrente Cartier R$ 239,80 / R$ 227,81 · Acompanha o QA Pingente Estrela · 10% a menos · 1 com desconto, 1 a preço cheio"; rodapé Subtotal R$ 499,70 · Desconto do Compre Junto −R$ 11,99 · Desconto progressivo −R$ 59,95 · Total R$ 427,76. 259,90 + 227,81 = 487,71 ≠ 427,76. Igual no checkout (passo 03) e com P ×2 (linha R$ 215,82, Total 751,33).

**Evidência:**

- `screenshots/CH-03-02-promo-vence-casado-1440.png` — gaveta com a linha 227,81 e o Total 427,76
- `screenshots/CH-03-08-confirmacao-0362-1440.png` — o mesmo pedido gravado com a linha 167,86
- console: nada · rede: nada

### A-2 · [Loja · checkout] A oferta do checkout não aparece em "Seu pedido", entra no Subtotal pelo preço com desconto, sem a linha "Desconto da oferta", e volta marcada no checkout seguinte

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Helena                                                         |
| Jornada e passo     | J-03a, passo 3 (checkout) · passos 04, 17, 19 do log                   |
| TC                  | TC-FUNC-016, TC-FUNC-027                                              |
| Gravidade proposta  | medium — o Total é o cobrado, mas antes de pagar a cliente não vê a peça da oferta na lista nem o desconto dela, o Subtotal do checkout (571,62) difere do da confirmação (589,60), e depois de um pedido a oferta volta marcada num checkout novo, somando R$ 71,92 a uma compra em que ela não a escolheu |
| Reproduziu          | sim (2 de 2 para a lista/Subtotal: passos 04 e 19; 1 de 1 para a oferta herdada: passo 17) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Helena logada, 1440. Pôr qualquer peça na sacola (ex.: P + Cartier pelo bloco) e "Finalizar Pedido"
2. Marcar "Leva junto com 20% de desconto? QA Corrente Veneziana R$ 71,92 / R$ 89,90" e ler "Seu pedido"
3. Fechar o pedido com PIX; na mesma aba, montar outra sacola (ex.: P + Berloque) e abrir o checkout de novo

**Esperado:** a peça da oferta listada com o preço cheio e o da oferta, o Subtotal pelos cheios e uma linha "Desconto da oferta", como na confirmação; e a oferta não marcada num checkout novo — **fonte:** `prd.md` CA-05.1, CA-05.2; D-35 (rótulo "Desconto da oferta"); TC-FUNC-027; TC-FUNC-016 passo 3.

**Observado:** passo 2: "4 ITENS", mas a lista só tem o pingente e a Cartier; Subtotal R$ 571,62 (= 499,70 + 71,92); sem linha de oferta. Confirmação do #0362: Veneziana R$ 89,90 → R$ 71,92, Subtotal R$ 589,60, "Desconto da oferta −R$ 17,98". Passo 3: o cartão da oferta aparece já marcado (`aria-checked="true"`), "5 ITENS", Subtotal R$ 546,52 para uma sacola de R$ 474,60, "Pagar R$ 497,82 com PIX". Com a Veneziana na sacola (passo 19), o cartão some e a linha dela mostra "R$ 89,90" sem de/por, cobrada a R$ 71,92. Pode ser anterior ao WI (a oferta do checkout); a ordem do resumo é CH-02 #1.

**Evidência:**

- `screenshots/CH-03-06-checkout-promo-bump-casado-1440.png` — checkout com a oferta marcada e a lista sem ela
- `screenshots/CH-03-21-oferta-herdada-checkout-1440.png` — cartão da oferta marcado no checkout seguinte
- `screenshots/CH-03-21-checkout-subtotal-com-oferta-oculta-1440.png` — Subtotal 546,52 com 3 linhas listadas
- console: 5–6 erros no checkout do passo 17 (não lidos) · rede: nada lido

### A-3 · [Loja · gaveta] O selo do cupom calcula sobre o subtotal cheio, sem o desconto do Compre Junto, e discorda da linha do cupom

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Helena                                                         |
| Jornada e passo     | J-03, passo 3 (aplicar o cupom) · passos 15, 16, 22 do log            |
| TC                  | — (TC-FUNC-017 cobra a linha, que está certa)                         |
| Gravidade proposta  | low — o Total está certo, mas a gaveta mostra dois valores de cupom no mesmo instante (−R$ 49,47 no selo e −R$ 47,90 na linha) |
| Reproduziu          | sim (2 de 2, em contextos diferentes, já no momento da aplicação)     |
| Viewport            | 1440 × 900 e 390 × 844                                                |

**Passos para reproduzir** — de um estado limpo:

1. Helena logada, 390. P (Prata · Não) + Berloque Prata pelo bloco, "Levar o conjunto"
2. Na gaveta, aplicar QA92CUPOM15
3. Ler o selo e a linha "Cupom QA92CUPOM15"

**Esperado:** um valor de cupom só, 15 % do subtotal já com o desconto casado (R$ 47,90) — **fonte:** `prd.md` CA-03.6; TC-FUNC-017 passo 1.

**Observado:** selo "QA92CUPOM15 aplicado −R$ 49,47" (15 % × 329,80); linha "Cupom QA92CUPOM15 −R$ 47,90"; Total R$ 271,42. Com duas joias: selo −104,18 × linha −100,36; ao tirar Q a linha vai a −69,51 e o selo fica −104,18. Parente do CH-02 #3 (selo congelado), mas aqui diverge já na aplicação, por ignorar o casado.

**Evidência:**

- `screenshots/CH-03-17-duas-joias-tres-berloques-1440.png` — sacola de duas joias (antes do cupom; o selo foi lido no snapshot)
- console: nada · rede: nada

### A-4 · [E-mail · Pedido recebido] Os totais do e-mail põem o Frete antes dos descontos, fora da ordem do painel

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-04 Helena                                                         |
| Jornada e passo     | J-03, passo 7 (e-mail) · passo 26 do log                              |
| TC                  | TC-INT-004                                                            |
| Gravidade proposta  | medium — mesma classe do CH-02 #1, numa terceira superfície: a conta fecha, mas a ordem difere da do painel |
| Reproduziu          | sim (1 de 1, prévia do #0363) — a confirmação do #0362 e do #0363 repetem a ordem (CH-02 #1) |
| Viewport            | 1440 × 900                                                            |

**Passos para reproduzir** — de um estado limpo:

1. Painel, `http://localhost:8083/admin/configuracoes/notificacoes`
2. "ID do pedido (UUID)" = `5b1f1fcb-951f-4b24-a4a7-4e384f4c30c2` (#0363); abrir "Pedido recebido" e a prévia
3. Ler os totais

**Esperado:** Subtotal · Desconto do Compre Junto · Cupom · Desconto PIX · Frete · Total — **fonte:** decisão Q-01 (2026-11-04); TC-INT-004 ("O Frete antes dos descontos é bug"); o painel do mesmo pedido (passo 25).

**Observado:** "Subtotal R$ 329,80 · Frete R$ 19,90 · Desconto do Compre Junto −R$ 10,48 · Cupom −R$ 47,90 · Desconto PIX −R$ 19,00 · Total R$ 272,32".

**Evidência:**

- `screenshots/CH-03-34-email-previa-0363-1440.png` — prévia do e-mail com o Frete em 2º
- `screenshots/CH-03-33-painel-0363-1440.png` — painel do mesmo pedido com o Frete antes do Total
- console: nada · rede: nada

**Reencontrados (não novos):** CH-02 #1 — Frete antes dos descontos no checkout e em `/pedido/:id` do #0362 e do #0363 (passos 03, 08, 24); CH-02 #3 — família do selo do cupom (A-3 descreve a divergência nova).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com a promoção vencendo o casado, o rodapé mostra "Desconto do Compre Junto −11,99" **e** "Desconto progressivo −59,95" (a diferença). TC-FUNC-010 passo 3 pede exatamente isso; TC-FUNC-016 passo 1 pede "o desconto da promoção e sem o do Compre Junto dessa peça". Os dois TC divergem; a soma cobrada é a certa | 02, 08 | mudança |
| A peça cuja promoção vence o casado continua com "Acompanha o QA Pingente Estrela" na confirmação (sem o percentual) | 08 | polimento |
| Com o desconto vindo de Q, a linha diz "Acompanha o QA Pingente Estrela e o QA Pingente Lua · 20% a menos", embora os 15 % de P tenham ido para outra linha | 13–14 | polimento |
| Cupom e promoção progressiva não acumulam entre si (a loja escolhe o maior e diz qual ficou de fora) | 05 | pré-existente |
| A tela de falha do pagamento mostra a mensagem crua do Mercado Pago ("At least one policy returned UNAUTHORIZED.") | 07, 23 | pré-existente |
| O e-mail "Pedido recebido" fala "a gente te avisa" (a loja fala na 1ª pessoa da Adri) | 26 | pré-existente |
| Em 390 o "Entrar" do topo não existe (só "Sacola" e "Abrir menu"); o login foi feito em 1440 | 20 | pré-existente |

## Fora da cobertura

- TC-FUNC-021 (par recíproco A ↔ B) — orçamento esgotado.
- Variações sem massa: promoção **menor** que o casado (só há a de 30 %); a mesma corrente em duas listas de P; promoção só na corrente com casado maior.
- TC-JOURNEY-004 variação cartão — o Brick não sobe no local; só o "no cartão: 4x…" foi lido.
- Mesma conta em duas abas aplicando o cupom; entrar por código no meio do checkout.
- TC-INT-004 em 390 e a leitura no Mailpit (envio real desligado); só a prévia em 1440.
- A barra fixa "Levar o conjunto" mediu top 882 numa janela de 844 em 390 (passo 21) — fora da tela; não investigado (o contexto tinha sido redimensionado de 1440 para 390, então pode ser artefato). Vale reconferir no CH-01/CFR.
- O painel do #0362 (oferta + promoção) não foi aberto; só o do #0363.
- Os erros de console do checkout do passo 17 não foram lidos.

## Debrief

- **Surpresas:** a promoção vencendo o casado acerta o Total e erra a linha; a oferta do checkout persiste marcada de um pedido para o próximo checkout; a sacola não esvazia depois do pedido PIX pendente.
- **Próximo charter:** o par recíproco (TC-FUNC-021) e uma promoção menor que o casado, com massa nova; a oferta do checkout de ponta a ponta (lista, Subtotal, persistência entre checkouts).
- **Padrão novo:** somar as linhas da sacola e comparar com o Total — pegou A-1 e A-2 sem conta de regra.
