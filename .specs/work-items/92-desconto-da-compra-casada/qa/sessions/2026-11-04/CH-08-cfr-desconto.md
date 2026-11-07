# Sessão CH-08 · CFR — o desconto do Compre Junto nas duas jornadas da cliente

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-cfr-desconto.md` · cfr · P1                 |
| Status      | done                                                                   |
| Persona     | PER-05 Sônia · conta: anonima (virou convidada com conta no 1º create-order; entrou por código do Mailpit no passo 09) · painel: usuário de dev do `supabase/seed.sql` seção 5 (só para provocar o 422) |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | ~39 ações de browser de 35 (estourou em 4: três chamadas que erraram o alvo/caminho contam) |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build não exposto · Chromium (Playwright MCP) · viewports 1440×900 (só teclado) e 390×844 com fonte 200 % |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; Mercado Pago com chave inválida (create-payment responde 400 do MP); Melhor Envio fora (frete padrão R$ 19,90); massa sintética QA; fonte do sistema simulada por `font-size: 200%` no `<html>`; teclado simulado por `page.keyboard` (Tab/Space/Enter) dentro de `browser_run_code` para caber no orçamento |

## Missão

Refazer J-01 e J-03 como auditoria das qualidades transversais sobre o que o WI mudou: o tom das frases novas, o
anúncio do desconto pelo teclado, a recuperação das falhas de dinheiro e o layout em 390 com fonte grande.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | 1440, só teclado: Tab desde o topo de `/produtos/qa-pingente-estrela` | 35 Tabs até a caixa do Berloque. Ordem: menu, galeria, variações do pingente, caixa "Levar junto: QA Correntes, 10% a menos levando junto", "Ver os 3 modelos", caixa "Levar junto: QA Berloque Coração, 15% a menos levando junto". Caixas com foco `solid 2px rgb(52,73,94)` | — |
| 02 | Space na caixa do Berloque | Marcada. No bloco, o preço lido como "de R$ 69,90 por R$ 59,42" (os números riscados `aria-hidden`), "15% a menos levando junto". `status` ainda "Total do conjunto: R$ 259,90" até escolher a cor | `screenshots/CH-08-02-foco-berloque-1440.png` |
| 03 | Tab → "Prata 925" do Berloque, Space | `status` passou a "Total do conjunto: R$ 319,32, R$ 296,97 no Pix"; "A joia e 1 peça marcada · R$ 319,32" | — |
| 04 | Tab até "Levar o conjunto", Enter | Gaveta abre com foco em "Fechar sacola". Berloque: "R$ 69,90" "R$ 59,42" como dois textos soltos, sem "de/por"; "Acompanha o QA Pingente Estrela · 15% a menos"; Subtotal 329,80 · Desconto do Compre Junto −10,48 · Total 319,32 (A-1) | — |
| 05 | Tab até "Finalizar Pedido", Enter; preencheu contato (sonia.ch08@exemplo.com), CEP 90010-000, nº 100, frete padrão, PIX, CPF | Checkout: foco cai no `<body>`. "Seu pedido": Berloque de novo "R$ 69,90 R$ 59,42" sem de/por (A-1). Botão "Pagar R$ 316,87 com PIX" | — |
| 06 | (painel, contexto isolado) Berloque de P: 15 → 5 %, Salvar, relido 5 | — | — |
| 07 | No checkout, Enter em "Pagar R$ 316,87 com PIX" | `create-order 200` + `create-payment 422`. `role="alert"`: "O valor do seu pedido mudou / Desde que você montou a sacola, o desconto do Compre Junto do QA Berloque Coração mudou. Por isso o pagamento não seguiu. Nada foi cobrado. / Antes R$ 316,87 / Agora R$ 323,37 / Confirmar com o novo total / Voltar à sacola". Foco no `<body>`; 14 Tabs (logo, Voltar à sacola, Entrar, campos, Alterar, envio, oferta…) até "Confirmar com o novo total" (A-2) | `screenshots/CH-08-05-aviso-valor-mudou-1440.png` |
| 08 | Mudou para 390×844 com fonte 200 % | O aviso cabe (326 px de largura, nada passa de 390 dentro dele). `body.scrollWidth` 465 por um campo oculto "Código de 6 dígitos" (pré-existente, do desafio de código) | `screenshots/CH-08-06-aviso-390-fonte200.png` |
| 09 | Enter em "Confirmar com o novo total" | O aviso some e o checkout passa a pedir código: "Este e-mail já tem cadastro na loja / Um código foi enviado…". Rede: `create-order 409`, `auth/otp 200` e depois `otp 429`. Nada na tela liga isso ao novo total (A-3). Leu o código no Mailpit e verificou: botão "Pagar R$ 323,37 com PIX" | `screenshots/CH-08-07-pagamento-falha-390-200.png` |
| 10 | Cortou a rede (offline) e Enter em "Pagar R$ 323,37" | Foi para `/pedido/…/pagamento` #0368; um só `create-order 200` depois do 409 (sem duplicata). Religada a rede: "Não foi possível gerar o código agora / A falha foi do lado do banco, não do seu pedido… / R$ 323,37 valor do pedido, ainda não cobrado / alert: «At least one policy returned UNAUTHORIZED.» Seu pedido #0368 está guardado e nada foi cobrado. / Tentar gerar o código de novo / Falar comigo no WhatsApp". `scrollWidth` 390 | `screenshots/CH-08-09-offline-390-200.png` |
| 11 | Abriu `/pedido/<#0368>` e `/conta` a 200 % e 100 % | `/pedido`: 434 a 200 % (elementos `line` do cabeçalho — pré-existente), 390 a 100 %. Resumo: Subtotal · Frete · Desconto do Compre Junto · Desconto PIX · Total (CH-02 #1 reencontrado). Peça "R$ 69,90 R$ 66,41" sem de/por na árvore (A-1). `/conta`: 434 / 390, mesmos `line`; pendências #0367 R$ 316,87 e #0368 R$ 323,37 | `screenshots/CH-08-10-pedido-390-200.png` · `screenshots/CH-08-10-conta-390-200.png` |
| 12 | Saiu da conta e fechou o browser | — | — |

**Edge cases tentados:**

- Só teclado do bloco ao checkout (1440) — chega; foco visível nas caixas novas; o foco cai no `<body>` ao entrar no checkout e ao aparecer o aviso.
- Fonte 200 % em 390 — o aviso, a tela de pagamento e o resumo do pedido cabem; o estouro é de elementos fora do WI.
- Rede caindo no envio do pagamento — o pedido não duplicou; a tela que apareceu é a de falha do banco (inconclusivo: ver Fora da cobertura).
- Confirmar o novo total sendo convidada recém-criada — cai no desafio de código (A-3).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-001 | pass | 02, 04, 05, 07, 10, 11 | `screenshots/CH-08-05-aviso-valor-mudou-1440.png` | nenhuma exclamação, "economize", urgência ou emoji nas frases novas (bloco, gaveta, checkout, aviso, pagamento, pedido, conta). "SÓ AQUI" da oferta do checkout anotado como spec-gap. E-mail não lido nesta sessão (pedido pendente não manda e-mail; CH-03 já leu) |
| TC-CFR-002 | fail | 01–07 | `screenshots/CH-08-02-foco-berloque-1440.png` · `CH-08-05-aviso-valor-mudou-1440.png` | bloco: nome acessível e "de … por …" certos (pass). Variação gaveta: o de/por NÃO é lido como frase ⇒ A-1. Aviso: `role="alert"` com "Nada foi cobrado." e os dois botões alcançáveis, mas o foco fica no `<body>` (A-2, friction) |
| TC-CFR-003 | pass | 07, 09, 10 | `screenshots/CH-08-09-offline-390-200.png` | 422: explicação, "Nada foi cobrado." e dois caminhos. Falha do banco: linguagem simples, "nada foi cobrado", tentar de novo e WhatsApp; sem pedido duplicado. Ressalvas: A-3 (o confirmar pede código sem explicar) e a mensagem crua do Mercado Pago em inglês (spec-gap pré-existente). O 500 "Não foi possível calcular o pedido" (D-33) não foi provocado |
| TC-UI-003 | pass | 08, 10, 11 | `screenshots/CH-08-10-pedido-390-200.png` | `/pedido` e `/conta`: 390 a 100 %; a 200 % 434 só pelo cabeçalho (`line`), pré-existente e já registrado no projeto; as linhas do desconto e das peças inteiras. Ordem do resumo fora de Q-01 = CH-02 #1 (já registrado). Painel e app não medidos (Fora da cobertura) |

Contagem: pass 3 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Gaveta, checkout e pedido] o preço da peça com desconto é lido como dois números soltos — quem não vê o riscado não sabe qual vale

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-05 Sônia                                                          |
| Jornada e passo     | J-01, passo 4–6 (conferir a sacola e o resumo) · passos 04, 05, 11 do log |
| TC                  | TC-CFR-002 (variação "gaveta")                                        |
| Gravidade proposta  | medium — pela árvore de acessibilidade ela ouve "R$ 69,90 R$ 59,42" sem saber qual é o cheio e qual o que paga; o total ao lado salva a jornada |
| Reproduziu          | sim (3 de 3: gaveta, "Seu pedido" do checkout, `/pedido/:id`)         |
| Viewport            | 1440×900 e 390×844                                                    |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, abrir `/produtos/qa-pingente-estrela`, marcar "QA Berloque Coração" (Prata 925) e "Levar o conjunto"
2. Ler a gaveta pela árvore de acessibilidade (snapshot)
3. Linha do Berloque: `generic "R$ 69,90"` e `generic "R$ 59,42"`, sem "de … por …" e sem marcar o riscado; o mesmo em "Seu pedido" do checkout e em `/pedido/:id` (`text: R$ 69,90 R$ 66,41`)

**Esperado:** na gaveta, o "de {cheio} por {junto}" lido como uma frase, como no bloco (onde há o texto "de R$ 69,90 por R$ 59,42" e os números visíveis ficam `aria-hidden`) — **fonte:** TC-CFR-002, variação "gaveta"; `spec.md` › Design › Loja — Bloco

**Observado:** os dois preços como textos independentes, sem rótulo; nada diz que o primeiro está riscado.

**Evidência:**

- `screenshots/CH-08-02-foco-berloque-1440.png` — o bloco (o par que funciona)
- snapshot da gaveta: `generic [ref=e307]: R$ 69,90` / `generic [ref=e308]: R$ 59,42`
- console: nada · rede: nada

### A-2 · [Checkout · o valor mudou] o aviso aparece mas o foco fica no `<body>` — pelo teclado são 14 Tabs até "Confirmar com o novo total"

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-05 Sônia                                                          |
| Jornada e passo     | J-01, passo 6 (pagar) · passo 07 do log                               |
| TC                  | TC-CFR-002 passo 3                                                    |
| Gravidade proposta  | low — o `alert` é anunciado e os botões são alcançáveis; ela precisa atravessar o cabeçalho e o formulário inteiro (e passar pela oferta do checkout) para responder |
| Reproduziu          | sim (2 de 2: o mesmo foco no `<body>` depois do aviso e depois do "Confirmar", passos 07 e 09) |
| Viewport            | 1440×900                                                              |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, P + Berloque (15 %) no checkout preenchido, PIX
2. Painel: Berloque de P para 5 %, Salvar
3. Enter em "Pagar R$ … com PIX" e ler `document.activeElement`

**Esperado:** o foco vai para o aviso ou para "Confirmar com o novo total" (a decisão que ele pede) — **fonte:** TC-CFR-002 ("foco alcançável nos dois botões"); `cfr.md` › Teclado / Mensagem dinâmica; charter CH-08 "Deve tentar" 3 ("onde fica o foco")

**Observado:** `activeElement` = `BODY`; Tab: logo, "Voltar à sacola", "Entrar", campos, "Continuar", "Alterar", envios, "Alterar", a oferta "SÓ AQUI…", e só então "Confirmar com o novo total" (14ª parada).

**Evidência:**

- `screenshots/CH-08-05-aviso-valor-mudou-1440.png` — o aviso com foco em "Confirmar"
- rede: `POST /functions/v1/mercado-pago?action=create-payment → 422`

### A-3 · [Checkout · o valor mudou] para a convidada, "Confirmar com o novo total" some com o aviso e pede um código de e-mail sem dizer por quê

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-05 Sônia (anônima, primeira compra)                               |
| Jornada e passo     | J-01, passo 6 (pagar) · passo 09 do log                               |
| TC                  | TC-CFR-003 passo 1                                                    |
| Gravidade proposta  | medium — ela aceitou o novo total e, em vez de pagar, a tela troca para "Este e-mail já tem cadastro na loja", com o aviso apagado e o foco no `<body>`; quem não acha o e-mail abandona |
| Reproduziu          | sim (1 de 1 na sessão; mesmo mecanismo do 409 — o 1º create-order cria a conta da convidada) — tratar como `sim` com a ressalva de uma execução |
| Viewport            | 390×844, fonte 200 %                                                  |

**Passos para reproduzir** — de um estado limpo:

1. Contexto novo, anônima, e-mail nunca usado (`<novo>@exemplo.com`); P + Berloque no checkout com PIX
2. Painel: baixar o percentual do Berloque; tocar "Pagar" ⇒ aviso "O valor do seu pedido mudou"
3. Tocar "Confirmar com o novo total"

**Esperado:** seguir ao pagamento com o novo total (ou, se o código for necessário, dizer que é por o pedido anterior ter criado a conta) — **fonte:** `prd.md` CA-04.3 ("Confirmar com o novo total" segue o pagamento); `cfr.md` › Recuperação de erro (próximo passo concreto)

**Observado:** `create-order → 409`, `auth/v1/otp → 200` e logo `→ 429`; a tela mostra "Este e-mail já tem cadastro na loja / Um código foi enviado para … Digite-o para continuar com seus dados salvos." Depois do código, o botão volta a "Pagar R$ 323,37 com PIX" e o pagamento segue (#0368). Ficam dois pedidos pendentes em Minha conta (#0367 R$ 316,87 e #0368 R$ 323,37 — o do aviso, como em CH-04).

**Evidência:**

- `screenshots/CH-08-07-pagamento-falha-390-200.png` — o checkout pedindo código depois do "Confirmar"
- rede: `POST …/checkout?action=create-order → 409` · `POST /auth/v1/otp → 429`

## CFR

| Jornada | Categoria             | Marca     | Itens que não passaram | Achado |
| ------- | --------------------- | --------- | ---------------------- | ------ |
| J-01    | Usabilidade           | friction  | próximo passo do "Confirmar" para a convidada | A-3 |
| J-01    | Acessibilidade        | friction  | de/por da gaveta e do resumo; foco no `<body>` depois do aviso | A-1, A-2 |
| J-01    | Performance percebida | pass      | `status` do total e a gaveta respondem < 1 s; gaveta abre em ~1,5 s com o resumo | — |
| J-01    | Compatibilidade       | pass      | 390 a 200 %: o que o WI mudou cabe; estouros só do cabeçalho e do campo de código (pré-existentes) | — |
| J-01    | Recuperação de erro   | friction  | o 422 é exemplar ("Nada foi cobrado", antes/agora, dois botões); o "Confirmar" leva ao desafio de código | A-3 |
| J-03    | Usabilidade           | pass      | as frases novas no pedido e na conta | — |
| J-03    | Acessibilidade        | friction  | o de/por em `/pedido/:id` | A-1 |
| J-03    | Compatibilidade       | pass      | `/pedido` e `/conta` em 390 a 100 %; a 200 % só o cabeçalho | — |
| J-03    | Recuperação de erro   | pass      | falha do banco: "nada foi cobrado", tentar de novo, WhatsApp, pedido guardado | — |
| J-01/J-03 | Paridade com produção | registrado | ambiente local, MP com chave inválida (MP não alcançado), Melhor Envio fora, fonte simulada por CSS | — |

**Categorias fora:** nada (J-03 com cupom não refeito — orçamento; ver Fora da cobertura)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A tela de falha do pagamento mostra, dentro do `alert`, a mensagem crua do Mercado Pago em inglês ("At least one policy returned UNAUTHORIZED.") antes de "Seu pedido #0368 está guardado e nada foi cobrado." | 10 | pré-existente |
| A oferta do checkout abre com o selo "SÓ AQUI", leitura de urgência ao lado do tom memorial | 05 | pré-existente |
| Ao entrar no checkout pela gaveta (teclado), o foco cai no `<body>` | 05 | pré-existente |
| Com o Berloque marcado e a cor ainda não escolhida, o `status` do total segue sem a peça ("R$ 259,90"), sem dizer que falta a cor | 02 | polimento |

## Fora da cobertura

- Rede caindo no envio do pagamento — inconclusivo: com o contexto offline o checkout navegou a `/pedido/<#0368>/pagamento` e o único `create-order 200` registrado não deixa claro se saiu antes do corte; não houve duplicata. Não se viu a mensagem "sem conexão" do checkout.
- O 500 "Não foi possível calcular o pedido. Tente de novo." (D-33) — não provocado (exige derrubar a leitura da configuração; fora do alcance da tela).
- TC-UI-003 no painel do pedido e no app do ateliê — orçamento; o painel e o app já foram medidos em CH-06/CH-07.
- J-03 com cupom (QA92CUPOM15) refeita como auditoria — orçamento.
- E-mail da compra — pedido pendente não manda e-mail; o tom do e-mail foi lido em CH-03.
- Zoom de 200 % (640 px), tema escuro e movimento reduzido — orçamento.
- Leitor de tela real (VoiceOver/TalkBack), Safari/iOS e Chrome Android — só o Chromium do driver.
- Massa alterada e não desfeita: o percentual do Berloque em P ficou em **5 %** no painel (era 15 %); pedidos #0367 e #0368 pendentes, conta sonia.ch08@exemplo.com criada. A thread reaplica a massa.

## Debrief

- **Surpresas:** o "Confirmar com o novo total" de uma convidada bate no 409 da conta que o primeiro pedido criou.
- **Próximo charter:** reteste do aviso com uma cliente já logada (o caminho de CH-04) × convidada; o foco do aviso.
- **Padrão novo:** comparar o nome acessível do preço no bloco com o das superfícies seguintes (gaveta, resumo, pedido) — o bloco tinha o de/por e as demais não.
