# Sessão CH-06 · A dona confere no painel do pedido e na Adesão quanto houve de desconto

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-pedido-no-painel-e-adesao.md` · exploratório · P1 |
| Status      | done                                                                   |
| Persona     | PER-02 Adri · conta: `admin-painel` — o usuário de desenvolvimento de `supabase/seed.sql` (seção 5, só local), premissa da thread; `QA_ADMIN_PAINEL_*` não definidas |
| Tour · modo | Feature · por cenário                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | ~40 ações de browser de 50                                             |
| Ambiente    | painel http://localhost:8083 · loja http://localhost:8082 · ateliê http://localhost:8084 · build não exposto · Chromium (Playwright MCP, headless) · viewports 1440×900 e 390×844 |
| Paridade    | banco local; pedidos marcados como pagos pela thread (M-07, não por pagamento real); Mercado Pago e Resend com chaves inválidas (o create-payment do pedido montado respondeu 400); `*.supabase.co` e `**/g/collect*` bloqueados por rota |

## Missão

Percorrer, como a dona no fim do dia, os pedidos com desconto, um pedido antigo e o relatório de Adesão, e
confirmar que cada número fecha com o que a cliente pagou e que nada antigo mudou de cara.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrou no painel e abriu `/admin/pedidos` (1440) | #0360–#0365 no topo; #0360, #0361, #0362, #0363 e #0365 Pago/Aprovado | — |
| 02 | Abriu o #0360 (linha mista, PIX) | Itens: Berloque "Acompanha o QA Pingente Estrela" 1 un R$ 69,90 riscado → R$ 59,42; segunda linha de Berloque 1 un R$ 69,90 **sem** "Acompanha"; Pingente R$ 259,90. Pagamento, nesta ordem: Subtotal R$ 399,70 · Desconto do Compre Junto − R$ 10,48 · Desconto PIX − R$ 27,25 · Frete R$ 19,90 · Total R$ 381,87. Soma confere a centavo (399,70 − 10,48 − 27,25 + 19,90) | `screenshots/CH-06-01-pedido-0360-1440.png` |
| 03 | Abriu o #0363 (cupom) | Subtotal R$ 329,80 · Desconto do Compre Junto − R$ 10,48 · Cupom QA92CUPOM15 − R$ 47,90 · Desconto PIX − R$ 19,00 · Frete R$ 19,90 · Total R$ 272,32. O cupom fica entre o Compre Junto e o PIX; soma confere | `screenshots/CH-06-02-pedido-0363-1440.png` |
| 04 | Abriu o #0362 (Cartier ×2 em promoção + oferta do checkout) | Cartier "Acompanha", 2 un, R$ 119,90 → R$ 83,93 (unidade); Veneziana R$ 89,90 → R$ 71,92. Subtotal R$ 589,60 · Compre Junto − R$ 11,99 · Desconto progressivo − R$ 59,95 · Desconto da oferta − R$ 17,98 · PIX − R$ 34,98 · Frete R$ 19,90 · Total R$ 484,60. No painel as linhas fecham com o total (259,90 + 2×83,93 + 71,92 = 499,68 = Subtotal − os descontos que não são do PIX). A Cartier tem 71,94 de desconto ao todo, dividido em 11,99 "Compre Junto" e 59,95 "progressivo" | `screenshots/CH-06-02-pedido-0362-1440.png` |
| 05 | Abriu o #0365 (Berloque regravado a 30 %) e o #0361 (joia sem percentual + cupom) | #0365: Berloque R$ 69,90 → R$ 48,93; Compre Junto − R$ 20,97; Total R$ 307,11, confere. #0361: nenhuma linha do Compre Junto; Cupom − R$ 52,47; Total R$ 296,42, confere | `screenshots/CH-06-02-pedido-0365-1440.png` · `screenshots/CH-06-02-pedido-0361-1440.png` |
| 06 | Abriu o #0360 em 390×844 | `scrollWidth` 390 (nenhuma rolagem horizontal); o "de" riscado R$ 69,90 fica dentro da tela (x 299–349); o cartão de pagamento tem a mesma ordem | `screenshots/CH-06-03-pedido-0360-390.png` · `screenshots/CH-06-03b-pedido-0360-390-pagamento.png` |
| 07 | Abriu dois pedidos antigos (M-06): #0220 (montado pelo painel, P-0001, 31/10) e #P76-L10 (14/10) | #0220: Subtotal R$ 1.071,00 · Cupom PROVA89 − R$ 107,10 · Desconto combinado — Cliente antiga − R$ 20,00 · Desconto PIX − R$ 66,07 · Frete R$ 24,03 · Total R$ 901,86, sem linha do Compre Junto, confere. #P76-L10: item R$ 100,00, Subtotal R$ 110,00, Frete Grátis, Total R$ 110,00 (ver Spec-gaps). As linhas dizem "1 un", e não "Qtd: N" | `screenshots/CH-06-04-pedido-antigo-0220-1440.png` · `screenshots/CH-06-04-pedido-antigo-P76-L10-1440.png` |
| 08 | Abriu `/admin/compre-junto/adesao` (30 dias, o padrão) | 4 pedidos com Compre Junto ("50 % dos 8 pedidos pagos") · **6** peças levadas junto · Valor **R$ 405,53** "pelo preço pago em cada peça" · Por joia: QA Pingente Estrela, 4, 6, R$ 405,53, Desconto concedido **R$ 113,87**, mais sai: QA Berloque Coração · Prata 925 | `screenshots/CH-06-05-adesao-padrao-1440.png` · `screenshots/CH-06-06-adesao-por-joia.png` |
| 09 | Conferiu à mão contra os pedidos | O concedido fecha: 10,48 (#0360) + 71,94 (#0362, Cartier 239,80 − 167,86) + 10,48 (#0363) + 20,97 (#0365) = 113,87. As peças e o valor **não** fecham com as linhas que o pedido marca com "Acompanha": são 5 peças e R$ 335,63. A diferença é exatamente a segunda linha de Berloque do #0360, R$ 69,90, que não tem "Acompanha" no pedido → A-1 | — |
| 10 | Abriu "Por lista" | "Peça escolhida direto no produto" 4 peças R$ 237,67 (59,42 + **69,90** + 59,42 + 48,93), concedido R$ 41,93; "QA Correntes" 2 peças R$ 167,86, concedido R$ 71,94; "QA Probe Sem Venda" 0. Confirma que a segunda linha de Berloque do #0360 entra na conta, com concedido 0 | — |
| 11 | Trocou o período para 7, depois 90, depois 30 dias | Muda só o "dos N pedidos pagos" (6 · 21 · 8). Peças, valor e concedido ficam iguais, porque os pedidos de M-07 são todos de hoje | — |
| 12 | Escolheu 90 dias e recarregou | Volta para 30 dias (o período não fica guardado), com os mesmos números | `screenshots/CH-06-07-adesao-90-recarregada.png` |
| 13 | Abriu a Adesão em 390 | Cartões: "4 pedidos · 6 peças · R$ 405,53", "Desconto concedido: R$ 113,87", "Mais sai: …"; `scrollWidth` 390 | `screenshots/CH-06-08-adesao-390.png` |
| 14 | Montou um pedido pelo painel (M-09): Helena QA, QA Pingente Estrela (Prata 925 · Não) e QA Corrente Veneziana 40 cm; criou o link | P-0014: Subtotal R$ 349,80, Total das peças R$ 349,80, sem nenhum desconto do Compre Junto; link `/pedido-montado#…` | `screenshots/CH-06-10-montar-proposta.png` |
| 15 | Abriu o link na loja num contexto anônimo novo e pagou com PIX | Itens pelo preço cheio; Resumo: Subtotal R$ 349,80 · Frete R$ 19,90 · Desconto PIX − R$ 24,49 · Total R$ 345,21, sem Compre Junto. `create-order` 200; `create-payment` 400, porque a chave do Mercado Pago é inválida. A tela mostra o pedido #0366 aguardando pagamento, R$ 345,21 | `screenshots/CH-06-11-proposta-na-loja.png` · `screenshots/CH-06-12-proposta-paga.png` |
| 16 | Abriu o #0366 no painel | "Montado pelo painel · P-0014"; Subtotal R$ 349,80 · Desconto PIX − R$ 24,49 · Frete R$ 19,90 · Total R$ 345,21; sem linha do Compre Junto | `screenshots/CH-06-13-pedido-0366-montado-painel.png` |
| 17 | Entrou no app do ateliê (390) e abriu o #0220 e o #0360 | #0360: o mesmo Total R$ 381,87 e a mesma linha do Compre Junto − R$ 10,48 (com "De R$ 69,90, por R$ 59,42"). #0220: Subtotal R$ 1.071,00 · Frete R$ 24,03 · Cupom − R$ 107,10 · PIX − R$ 66,07 · Total R$ 901,86, **sem** a linha "Desconto combinado − R$ 20,00" que o painel mostra, e as linhas somam R$ 921,86 → A-2 | `screenshots/CH-06-14-atelie-0220-390.png` · `screenshots/CH-06-14-atelie-0360-390.png` |
| 18 | Recarregou o #0220 no app | Igual: nenhuma linha de desconto combinado | `screenshots/CH-06-15-atelie-0220-resumo-repro.png` |
| 19 | Saiu do painel (Conta e saída → Sair), limpou a sessão do ateliê e fechou o browser | `/admin/login` | — |

**Edge cases tentados:**
- Pedido só com peças sem desconto (#0361): nenhuma linha do Compre Junto. Passou.
- 390 no pedido do painel (#0360, #0362) e na Adesão: sem rolagem horizontal.
- Recarregar a Adesão depois de trocar o período: o período volta ao padrão (Spec-gaps).
- Pedido montado pelo painel com joia e corrente, e um antigo com desconto combinado: no painel, sem Compre Junto.
- Pedido com a corrente comprada pelo catálogo, sem a marca: a massa não tem (o briefing diz isso) → Fora da cobertura.
- Pedido cancelado com desconto: a massa não tem → Fora da cobertura.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-030 | pass | 02–06 | `screenshots/CH-06-01-pedido-0360-1440.png` · `screenshots/CH-06-02-pedido-0363-1440.png` | A ordem é Subtotal · Compre Junto · (cupom / progressivo / oferta) · PIX · Frete · Total, e cada pedido soma a centavo. O valor do #0360 é − R$ 10,48 (15 % sobre R$ 69,90), não os R$ 11,98 do texto do TC, que vêm de outra massa. Não comparei com `/pedido/:id` da loja, porque a cliente é convidada e a sessão não tem o token; o Total do #0360 é o mesmo do CH-02. Também não há pedido só com a oferta do checkout |
| TC-JOURNEY-007 | pass | 02, 08–10 | `screenshots/CH-06-05-adesao-padrao-1440.png` | O concedido R$ 113,87 é a soma de (cheio − pago) das linhas "Acompanha"; no #0362, a linha em que a promoção venceu conta o desconto total da linha (71,94). Não deu para ver o estado vazio de 7 dias: todos os pedidos são de hoje |
| TC-FUNC-028 | pass | 07, 17 | `screenshots/CH-06-04-pedido-antigo-0220-1440.png` · `screenshots/CH-06-14-atelie-0220-390.png` | Painel e app: o mesmo Total e nenhuma linha do Compre Junto nos pedidos antigos. As linhas do painel dizem "1 un", e não "Qtd: N" como o TC escreve; sem uma tela de antes do WI, não sei qual era o formato. À parte, o app esconde o desconto combinado do #0220 → A-2. O passo 3 (a loja) não foi feito: o #0220 é de outra cliente, e a sessão não entra na conta dela |
| TC-FUNC-032 | blocked | 08–10 | — | `massa`: não há pedido com a corrente posta pelo catálogo, sem a marca, nem pedido cancelado com a marca. O caso mais próximo (a segunda unidade de Berloque do #0360, sem "Acompanha" no pedido) **entra** na Adesão → A-1 |
| TC-FUNC-033 | pass | 08–10, 13 | `screenshots/CH-06-05-adesao-padrao-1440.png` · `screenshots/CH-06-08-adesao-390.png` | O valor é o pago (Cartier 167,86, e não 239,80); o concedido é cheio − pago e fecha a centavo; os cartões em 390 têm "Desconto concedido". A massa não tem pedido antigo com a marca para provar o "conta 0" |
| TC-REG-002 | pass | 14–16 | `screenshots/CH-06-11-proposta-na-loja.png` · `screenshots/CH-06-13-pedido-0366-montado-painel.png` | P-0014 / #0366: preço travado, sem Compre Junto na loja nem no painel, Total R$ 345,21. O pagamento não foi aprovado, porque a chave do MP é inválida; o pedido ficou pendente |

Contagem: pass 5 · fail 0 · blocked 1 · skip 0

## Achados

### A-1 · [Adesão] conta como "levada junto" a segunda unidade de Berloque que o pedido não marca com "Acompanha" — a dona vê peças e valor a mais

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri                                                           |
| Jornada e passo     | J-05, passo 3 (comparar) · passos 08–10 do log                        |
| TC                  | TC-FUNC-032                                                           |
| Gravidade proposta  | medium — o relatório infla "Peças levadas junto" (+1) e "Valor das peças levadas junto" (+R$ 69,90 em R$ 405,53), e o pedido não confirma esse número |
| Reproduziu          | sim (2 de 2: Por joia e Por lista; e igual nos 3 períodos)            |
| Viewport            | 1440 × 900 (e 390, nos cartões)                                       |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no painel como `admin-painel` (o banco local tem os pedidos de M-07; o #0360 é P + Berloque ×2, com linha mista, pago).
2. Abrir `/admin/pedidos` → #0360. Ver os itens: uma linha de QA Berloque Coração com "Acompanha o QA Pingente Estrela" (R$ 69,90 → R$ 59,42) e outra linha de QA Berloque Coração, R$ 69,90, **sem** "Acompanha".
3. Abrir `/admin/compre-junto/adesao` (30 dias) → "Por lista".

**Esperado:** a Adesão conta só as peças levadas pelo bloco (CA-06.1). Somando as linhas que o painel marca com "Acompanha" nos pedidos pagos: 5 peças, R$ 335,63; em "Peça escolhida direto no produto", 3 peças e R$ 167,77 — **fonte:** `prd.md` CA-06.1; TC-FUNC-032; o rodapé da própria Adesão ("Uma peça conta quando entrou na sacola pelo Compre Junto"). (Se a segunda unidade conta como levada pelo bloco, o defeito é o oposto: o pedido deveria marcar as duas linhas com "Acompanha". De um jeito ou de outro, as duas telas discordam sobre a mesma linha.)

**Observado:** Por joia: QA Pingente Estrela, 4 pedidos · **6** peças · **R$ 405,53** · concedido R$ 113,87. Por lista: "Peça escolhida direto no produto" **4** peças · **R$ 237,67** (= 59,42 + 69,90 + 59,42 + 48,93) · concedido R$ 41,93. A linha de R$ 69,90 entra com concedido 0. O concedido fecha; peças e valor não.

**Evidência:**

- `screenshots/CH-06-01-pedido-0360-1440.png` — as duas linhas de Berloque, e só uma com "Acompanha"
- `screenshots/CH-06-05-adesao-padrao-1440.png` · `screenshots/CH-06-06-adesao-por-joia.png` — 6 peças, R$ 405,53
- console: nada
- rede: nada

### A-2 · [App do ateliê] o pedido montado com "Desconto combinado" aparece sem essa linha, e as linhas não somam o Total

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-02 Adri                                                           |
| Jornada e passo     | J-05, passo 2 (pedido antigo no app) · passos 17–18 do log            |
| TC                  | TC-FUNC-028 (variação "pedido montado pelo painel")                   |
| Gravidade proposta  | medium — no celular a dona vê R$ 1.071,00 + 24,03 − 107,10 − 66,07 = R$ 921,86 e um Total de R$ 901,86, sem saber de onde saíram os R$ 20,00 |
| Reproduziu          | sim (2 de 2, com recarga)                                             |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no app do ateliê (http://localhost:8084/login) como `admin-painel`.
2. Abrir o pedido #0220 (montado pelo painel, P-0001, com o desconto combinado "Cliente antiga" de R$ 20,00): `/pedidos/c8f5baa0-2589-4e75-bf17-552eb983d77a`.
3. Ler o resumo de valores.

**Esperado:** as mesmas linhas de desconto do painel, inclusive "Desconto combinado — Cliente antiga − R$ 20,00", com as linhas fechando o Total (o pedido antigo "continua como está", e as mesmas linhas e valores nas três pontas) — **fonte:** `prd.md` CA-05.2 e CA-05.3; TC-FUNC-028 (variação "pedido montado pelo painel"); o painel do mesmo pedido (`screenshots/CH-06-04-pedido-antigo-0220-1440.png`).

**Observado:** "Subtotal R$ 1.071,00 · Frete · SEDEX R$ 24,03 · Cupom PROVA89 − R$ 107,10 · Desconto PIX − R$ 66,07 · Total R$ 901,86", sem nenhuma linha de desconto combinado. Não sei se isso vem de antes do WI (os rótulos do app mudaram neste WI) — a triagem decide.

**Evidência:**

- `screenshots/CH-06-14-atelie-0220-390.png` · `screenshots/CH-06-15-atelie-0220-resumo-repro.png` — o resumo sem a linha
- `screenshots/CH-06-04-pedido-antigo-0220-1440.png` — o painel com a linha
- console: nada
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| No #0362, a promoção (30 %) vence na Cartier e mesmo assim o painel mostra "Desconto do Compre Junto − R$ 11,99" mais "Desconto progressivo − R$ 59,95". A Adesão conta R$ 71,94 de concedido para a mesma linha. A dona lê dois números diferentes de "quanto o Compre Junto custou" no mesmo pedido; nenhuma fonte que li define como dividir o rótulo quando a promoção vence | 04, 09 | polimento |
| A Adesão não guarda o período escolhido: recarregar com 90 dias volta a 30 | 12 | pré-existente |
| #P76-L10 (pedido antigo de massa sintética): item R$ 100,00, Subtotal R$ 110,00, Frete Grátis, Total R$ 110,00 — as linhas não somam o Subtotal. Parece dado de fixture, de antes do WI | 07 | pré-existente |
| Na loja, com o Mercado Pago falhando, a tela de pagamento mostra a mensagem crua em inglês "At least one policy returned UNAUTHORIZED." para a cliente. O ambiente causa a falha (chave inválida), mas o texto cru chega à tela | 15 | pré-existente |

## Fora da cobertura

- TC-FUNC-030 passo 2 (comparar com `/pedido/:id` da loja): os pedidos com desconto são de convidadas ou da Helena QA, e o browser desta sessão não tem o token nem a sessão delas. O Total foi conferido contra os valores do log do CH-02.
- TC-FUNC-032 e a variação "cancelado com a marca": a massa não tem pedido com a corrente posta pelo catálogo sem a marca, nem pedido cancelado com a marca.
- TC-FUNC-033 "pedido antigo com a marca conta 0": a massa não tem esse pedido.
- O estado vazio da Adesão em 7 dias e a variação de números entre períodos: todos os pedidos de M-07 são de hoje.
- O pagamento aprovado do pedido montado #0366: o Mercado Pago local está com chave inválida; o pedido ficou pendente, e a sessão não o marcou como pago (é ação no banco).
- TC-FUNC-028 passo 3 (o pedido antigo na loja): a sessão não entra na conta da cliente do #0220.

## Debrief

- **Surpresas:** a `order-proposals` subiu no local e a montagem do pedido funcionou de ponta a ponta até o `create-payment`. A divergência entre o pedido e a Adesão sobre a segunda unidade da linha mista.
- **Próximo charter:** o CH-07 (app) deve conferir o desconto combinado e a oferta nas linhas do resumo do app (A-2); vale uma massa M-07 com a corrente posta pelo catálogo e um pedido cancelado com a marca, para fechar o TC-FUNC-032.
- **Padrão novo:** somar à mão as linhas "Acompanha" dos pedidos e comparar com "Por lista" achou A-1; abrir no app um pedido antigo com desconto que não é do WI achou A-2.
- **Limpeza:** esta sessão criou a proposta P-0014 e o pedido #0366 (Helena QA, pendente) no banco local.
