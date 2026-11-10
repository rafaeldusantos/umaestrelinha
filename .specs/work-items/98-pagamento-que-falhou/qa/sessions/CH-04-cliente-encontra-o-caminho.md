# Sessão CH-04 · A cliente volta a cada pedido que falhou e encontra a ação certa

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-04-cliente-encontra-o-caminho.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-03 Cliente que voltou ao pedido · conta: `cliente` — `QA_CLIENTE_*` |
| Tour · modo | Feature · por cenário (J-05 e o lado da cliente de J-06)               |
| Rodada      | exploração                                                             |
| Orçamento   | 50 ações de browser de 50                                              |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (Playwright MCP) · viewport 390 × 844; fonte raiz 100 / 130 / 200 % |
| Paridade    | Supabase local; edge functions com chaves externas inválidas (o Mercado Pago responde `UNAUTHORIZED`); `*.supabase.co` e `**/g/collect*` bloqueados; massa sintética QA98 |

## Missão

Confirmar que a cliente em luto, voltando dias depois pelo celular, encontra em cada pedido que falhou
exatamente uma saída coerente — pagar, gerar um PIX novo ou falar com a Adri —, nunca uma oferta que não
serve, e nunca uma frase com cara de cobrança.

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Entrou com senha e leu as pendências de `/conta` | 12 pendências: #0546/#0547/#0548 "Pagamento pendente · Pagar com PIX"; #0549 "O código PIX expirou … até 15 de novembro · Gerar novo PIX"; #0550 "O PIX foi recusado … até 14 de novembro · Gerar novo PIX"; #0552, #0553, #0562 "O pagamento com cartão não foi concluído … Fale comigo pelo WhatsApp que eu te ajudo a resolver o pagamento. · Conversar no WhatsApp"; #0559 "Pedido cancelado por falta de pagamento … Se ainda quiser a peça, fale comigo. · Conversar no WhatsApp"; #0551 (PIX vencido há 9 dias) "O pagamento não foi concluído · Fale comigo para retomar este pedido. · Conversar no WhatsApp"; #0560, #0563 "Gerar novo PIX". Fora das pendências: #0554 (M5), #0557 (M10), #0558 (M12), #0555 (M7). Datas-limite = data do pedido + 7 dias nos cinco casos. Na lista "Seus pedidos" #0557 (M10, Separando) aparece com o selo "PIX expirado" | `screenshots/CH-04-01-conta-pendencias.png` |
| 02 | Abriu `/pedido/<M3 #0552>` (cartão recusado) | "Pagamento recusado" · "O pagamento com cartão não foi concluído" · "Fale comigo pelo WhatsApp que eu te ajudo a resolver o pagamento deste pedido." · "Conversar no WhatsApp" (wa.me da loja, 45 px de altura, mensagem "Olá! Quero resolver o pagamento do pedido #0552."). Nenhuma oferta de cartão nem de PIX. Pagamento e entrega: "Cartão de crédito". `scrollWidth` 390 | — |
| 03 | Abriu `/pedido/<M4 #0553>` (cartão pendente, tentativa sem resposta) | Selo "Pagamento não concluído", título **"O pagamento com cartão não foi concluído"** — o mesmo do recusado; o TC pede "ainda não foi confirmado". Mesma frase e botão do WhatsApp, sem outra oferta | `screenshots/CH-04-03-m4-cartao-pendente.png` |
| 04 | Abriu `/pedido/<M2 #0549>` (PIX vencido) | "PIX expirado · O código PIX expirou · O seu pedido continua guardado. Gere um código novo para concluir — dá para fazer isso até 15 de novembro. · Valor R$ 62,59 · Gerar novo PIX" (→ `/pedido/<id>/pagamento`) | — |
| 05 | Tocou "Gerar novo PIX" | `/pedido/<M2>/pagamento`, mesmo pedido: "PEDIDO #0549 · AGUARDANDO PAGAMENTO · Não foi possível gerar o código agora · A falha foi do lado do banco… · R$ 62,59 · **At least one policy returned UNAUTHORIZED.** Seu pedido #0549 está guardado e nada foi cobrado." com "Tentar gerar o código de novo", "Falar comigo no WhatsApp" e "Ver os detalhes do pedido". Falha do Mercado Pago local ⇒ `blocked`, não bug | `screenshots/CH-04-05-m2-novo-pix-blocked.png` |
| 06 | Voltou (botão voltar) | `/pedido/<M2>` com a mesma oferta "Gerar novo PIX" e a data-limite — nada perdido | — |
| 07 | Abriu `/pedido/<M12 #0558>` (cancelado pela Adri) e colou `/pedido/<M12>/pagamento` | Cancelado, "Este pedido foi cancelado e não segue em preparo…", sem nenhuma oferta de pagar e sem "por falta de pagamento". O `/pagamento` redireciona para `/pedido/<M12>`, sem chamar function | — |
| 08 | Abriu `/pedido/<M10 #0557>` (Separando, sem pagamento registrado) | Sem oferta de pagar; a jornada mostra "Em produção no ateliê · 6 nov"; mas o selo do topo é **"PIX expirado"** | `screenshots/CH-04-08-m10-separando-selo-pix-expirado.png` |
| 09 | Colou `/pedido/<M10>/pagamento` na barra | **A tela tenta gerar um PIX**: "PEDIDO #0557 · AGUARDANDO PAGAMENTO · Não foi possível gerar o código agora · R$ 32,46 · valor do pedido, ainda não cobrado". Ao recarregar, a rede mostra `POST functions/mercado-pago?action=create-payment` — o pedido passa do portão e só para no Mercado Pago (chave local inválida). Reproduziu 2 de 2 | `screenshots/CH-04-09-m10-pagamento-tenta-gerar.png` |
| 10 | Abriu `/pedido/<M7 #0555>` (pago por fora) | "É nosso!", "Pagamento confirmado — já estou preparando sua joia. O comprovante foi enviado para <e-mail>…", selo "Em produção", jornada com "Pagamento aprovado · 9 nov"; Pagamento e entrega: "Transferência · Aprovado em 9 nov"; total R$ 44,92 (= massa). `NOTA-INTERNA-QA` ausente do HTML inteiro; nenhum link de comprovante | — |
| 11 | Colou `/pedido/<M7>/pagamento` | Redireciona para `/pedido/<M7>`, nenhuma chamada de function | — |
| 12 | Abriu `/pedido/<M13 #0559>` (cancelado pelo job) | "Cancelado · Pedido cancelado por falta de pagamento · O pagamento deste pedido não foi concluído em 7 dias, e ele foi cancelado. Se ainda quiser a peça, fale comigo pelo WhatsApp e eu te ajudo a retomar. · Conversar no WhatsApp" (mensagem "Olá! Quero retomar o pedido #0559."); sem oferta de pagar | — |
| 13 | Abriu `/pedido/<M5 #0554>` (cartão nunca cobrado) e `/pedido/<M1 #0546>` (PIX pendente) | M5: "Pedido registrado · Aguardando a confirmação do pagamento. Eu aviso por e-mail assim que ele cair…", sem convite do WhatsApp do cartão. M1: "Pagamento pendente · O código PIX deste pedido ainda está valendo…" com "Pagar com PIX" | — |
| 14 | Em `/pedido/<M3>`, fonte a 130 % e 200 % | 130 %: `scrollWidth` 390; botão do WhatsApp 303 × 57, texto inteiro. 200 %: `scrollWidth` 434, mas nenhum elemento de `main` passa de 390 — o excesso vem do cabeçalho da loja (pendência conhecida no `CLAUDE.md`); botão 258 × 88, texto inteiro | `screenshots/CH-04-14-m3-fonte-200.png` |
| 15 | Em `/conta`, fonte a 130 % e 200 % | 130 %: `scrollWidth` 390, nada cortado. 200 %: `scrollWidth` 434 (cabeçalho); 17 botões de pendência visíveis, altura mínima 88 px, nenhum cortado; 4 linhas da lista "Seus pedidos" com selo "PIX expirado" passam 2–4 px da largura do link (overflow visível, sem rolagem dentro de `main`) | `screenshots/CH-04-15-conta-fonte-200.png` |
| 16 | Saiu (sessão limpa) e fechou o browser | Reabriu em `/conta` com o diálogo "Acesso à conta" | — |

**Edge cases tentados:**

- Deep link para `/pedido/:id/pagamento` de pedido que não aceita pagamento: M12 (cancelado) e M7 (pago) redirecionam; **M10 (Separando) não** — A-2
- Voltar depois do erro (abrir o PIX novo, voltar): o pedido volta com a oferta intacta
- Fonte do sistema a 130 % e 200 % (pela fonte raiz) em `/pedido/:id` e `/conta`
- PIX vencido além dos 7 dias (M2b #0551): sem "Gerar novo PIX" e sem "cancelado por falta de pagamento" — oferece o WhatsApp

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-JOURNEY-003 | blocked | 01, 04–06 | `screenshots/CH-04-05-m2-novo-pix-blocked.png` | Passos 1–2 passam (data-limite certa, chegada ao `/pagamento` do mesmo pedido, pela conta e pelo pedido); o QR não se cria no local (Mercado Pago `UNAUTHORIZED`). A tela de falha explica e oferece tentar de novo e o WhatsApp. Variação "recusado" (#0550) conferida só na conta |
| TC-FUNC-018 | pass | 01, 04, 13 | `screenshots/CH-04-01-conta-pendencias.png` | M1 "Pagar com PIX"; M2 vencido 15/11 e recusado 14/11 = pedido + 7 dias. Variação "último dia" não alcançada (massa) |
| TC-FUNC-019 | fail | 01–03 | `screenshots/CH-04-03-m4-cartao-pendente.png` | M3 passa; M4 mostra "não foi concluído" em vez de "ainda não foi confirmado" — A-1. Sem oferta de cartão/PIX nos dois; o botão abre o wa.me da loja com o número do pedido (não seguido para fora). Variação cartão vencido (#0562): "O pagamento com cartão não foi concluído", selo "Pagamento não concluído" — não diz "PIX expirou" |
| TC-FUNC-020 | pass | 01, 13 | `screenshots/CH-04-01-conta-pendencias.png` | M5 fora das pendências e sem convite |
| TC-FUNC-021 | pass | 01, 07 | — | Sem oferta em `/pedido` e `/conta`; `/pagamento` redireciona ao pedido (que diz "Cancelado"), sem gerar código. Variação "cancelado com o QR aberto" não feita (exige a admin) |
| TC-FUNC-022 | pass | 01, 10, 11 | — | "Transferência", total igual, sem `NOTA-INTERNA-QA` no HTML, sem comprovante; fora das pendências em `/conta` |
| TC-FUNC-023 | fail | 08, 09 | `screenshots/CH-04-09-m10-pagamento-tenta-gerar.png` | Passos 1 e 2 passam; passo 3 falha: `/pagamento` colado chama `create-payment` — A-2 |
| TC-FUNC-024 | pass | 01, 07, 12 | — | M13 diz a razão e oferece o WhatsApp no pedido e na conta; M12 não diz "por falta de pagamento"; variação M2b conferida na conta |
| TC-FUNC-027 | pass | 01–13 | — | Sem contagem regressiva, "último aviso" ou emoji nos textos novos; data-limite como informação; voz da Adri. Ressalva em Spec-gaps: a mensagem pré-preenchida do WhatsApp começa por "Olá!" e a tela de falha mostra o erro técnico cru em inglês |
| TC-UI-002 | pass | 14, 15 | `screenshots/CH-04-14-m3-fonte-200.png` · `screenshots/CH-04-15-conta-fonte-200.png` | Nada da superfície nova passa de 390; alvos ≥ 44 px; o `scrollWidth` 434 a 200 % é do cabeçalho (pré-existente, conhecido). `/pagar-com-cartao` e rede lenta fora (CH-02 / Fora da cobertura) |
| TC-INT-007 | blocked | 05 | `screenshots/CH-04-05-m2-novo-pix-blocked.png` | O fechamento da cobrança anterior acontece no Mercado Pago; no local a geração falha antes. Passos da admin fora deste charter |

Contagem: pass 7 · fail 2 · blocked 2 · skip 0

## Achados

### A-1 · [Pedido e conta] Cartão com tentativa ainda sem resposta aparece como "não foi concluído" — para a cliente

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-03 Cliente que voltou ao pedido |
| Jornada e passo     | J-05, passos 1 e 3 · passos 01 e 03 do log |
| TC                  | TC-FUNC-019 |
| Gravidade proposta  | medium — a cliente cujo cartão ainda pode ser aprovado lê que o pagamento falhou e é chamada ao WhatsApp para resolver, o que pode levá-la a pagar de novo por outro meio |
| Reproduziu          | sim (2 de 2 — `/pedido/<M4>` e o cartão de pendência em `/conta`) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Entrar na loja (`http://localhost:8082/conta`) com a conta `cliente`
2. Ler, em "Precisa da sua atenção", o cartão do pedido #0553 (M4 — cartão `pending` com tentativa de cobrança sem resposta)
3. Abrir `http://localhost:8082/pedido/0098a000-0000-4000-a000-000000000008`

**Esperado:** título "O pagamento com cartão ainda não foi confirmado", com a frase e o botão do WhatsApp — **fonte:** TC-FUNC-019 passo 2 (PRD CA-02.2; textos de `OrderActionPanel.tsx`)

**Observado:** título "O pagamento com cartão não foi concluído" (idêntico ao do recusado #0552), selo "Pagamento não concluído"; em `/conta` o mesmo título. Frase "Fale comigo pelo WhatsApp que eu te ajudo a resolver o pagamento deste pedido." e "Conversar no WhatsApp" presentes.

**Evidência:**

- `screenshots/CH-04-03-m4-cartao-pendente.png` — o título do cartão pendente
- `screenshots/CH-04-01-conta-pendencias.png` — #0553 na lista de pendências com o mesmo título
- console: nada
- rede: nada

### A-2 · [Pagamento] `/pedido/:id/pagamento` colado num pedido em Separando sem pagamento tenta gerar um PIX — para a cliente

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-03 Cliente que voltou ao pedido |
| Jornada e passo     | J-05, passo 5, ramo J-05a · passo 09 do log |
| TC                  | TC-FUNC-023 |
| Gravidade proposta  | high — por um link salvo ou antigo, a cliente cuja peça já está em produção (combinado com a Adri) recebe a tela "Aguardando pagamento" e, em produção, um QR válido: pode pagar de novo um pedido já acertado |
| Reproduziu          | sim (2 de 2 — navegação direta e recarga) |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Entrar na loja com a conta `cliente`
2. Colar na barra `http://localhost:8082/pedido/0098a000-0000-4000-a000-00000000000c/pagamento` (M10, #0557 — `separating`, pagamento `pending`, sem registro)
3. Esperar a tela carregar

**Esperado:** não gera código; como em M12 (cancelado) e M7 (pago), a rota devolve ao pedido sem oferecer pagamento — **fonte:** TC-FUNC-023 passo 3; PRD CA-03.16

**Observado:** a rota fica em `/pagamento` com "PEDIDO #0557 · AGUARDANDO PAGAMENTO", "valor do pedido, ainda não cobrado" e, como a chave local é inválida, "Não foi possível gerar o código agora … At least one policy returned UNAUTHORIZED." com "Tentar gerar o código de novo". A rede registra `POST /functions/v1/mercado-pago?action=create-payment` — o servidor aceitou criar a cobrança e só o Mercado Pago local recusou. O `/pedido/<M10>` em si não oferece pagar (passo 08).

**Evidência:**

- `screenshots/CH-04-09-m10-pagamento-tenta-gerar.png` — a tela de pagamento do pedido em Separando
- console: 1 erro da chamada ao Mercado Pago (o mesmo da falha local do passo 05)
- rede: `POST functions/mercado-pago?action=create-payment` (passo 09, na recarga)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Pedido em Separando sem pagamento (M10) mostra o selo "PIX expirado" no topo do pedido e na lista da conta, ao lado de "Em produção no ateliê" — nenhuma fonte define o selo deste estado | 01, 08 | pré-existente |
| A tela de falha do PIX mostra à cliente a mensagem técnica crua do meio de pagamento, em inglês ("At least one policy returned UNAUTHORIZED.") | 05, 09 | pré-existente |
| As mensagens pré-preenchidas do WhatsApp dos convites novos começam com "Olá!" (exclamação), no molde da de dúvida que já existia | 02, 03, 12 | polimento |
| O pedido de cartão nunca cobrado (M5) diz "Aguardando a confirmação do pagamento. Eu aviso por e-mail assim que ele cair", sem tentativa de cobrança alguma | 13 | pré-existente |
| O pedido pago por fora (M7) diz "O comprovante foi enviado para <e-mail>" e abre com "É nosso!" — o texto de pago pela loja, sem saber se algum e-mail saiu | 10 | pré-existente |
| O pedido gravado fora da loja (#0563, total gravado R$ 10,00 ≠ itens + frete) aparece nas pendências com "R$ 10,00" e "Gerar novo PIX" — o valor exibido é o gravado | 01 | mudança |

## Fora da cobertura

- QR do PIX novo e fechamento da cobrança anterior (TC-JOURNEY-003 passo 3, TC-INT-007) — Mercado Pago local recusa (`UNAUTHORIZED`)
- Abrir o WhatsApp de fato — o link `wa.me` foi conferido (número da loja e número do pedido), não seguido para fora
- Viewport mínima 320 × 568, movimento reduzido e rede lenta — orçamento esgotado
- WhatsApp sem número configurado — exige trocar a massa da loja
- Variações "cancelado com o QR aberto" (TC-FUNC-021) e "último dia" (TC-FUNC-018) — exigem ação da admin / massa específica
- `/pedido/<M2 recusado>` aberto pelo pedido — conferido só pela conta
- Fonte do sistema real do aparelho — simulada pela fonte raiz do documento

## Debrief

- **Surpresas:** o portão de `/pedido/:id/pagamento` recusa cancelado e pago, mas deixa passar o pedido em Separando sem pagamento; e o selo "PIX expirado" acompanha esse mesmo pedido
- **Próximo charter:** o mesmo deep link para outros estados avançados sem pagamento (Enviado, Entregue) e para a convidada pelo link do pedido; o cartão pendente M4 com o texto do PRD em mãos
- **Padrão novo:** colar `/pagamento` em cada estado da máquina do pedido e observar se `create-payment` sai na rede
