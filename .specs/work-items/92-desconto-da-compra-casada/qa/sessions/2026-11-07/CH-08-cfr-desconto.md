# Sessão CH-08 · CFR — o desconto do Compre Junto nas duas jornadas da cliente

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-08-cfr-desconto.md` · cfr · P1                 |
| Status      | done                                                                   |
| Persona     | PER-05 Sônia · conta: anonima (convidada com e-mail novo `sonia.ch08r2.<n>@exemplo.com`; virou conta no 1º create-order e entrou por código do Mailpit) · painel: `admin-painel` (usuário de dev do `supabase/seed.sql` seção 5, só para mudar o percentual) |
| Tour · modo | — · —                                                                  |
| Rodada      | confirmação (rodada 2) — só TC-CFR-002 (BUG-008) e o entorno de BUG-009 |
| Orçamento   | 15 ações de browser de 18 (três chamadas erraram e contam)            |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build não exposto · Chromium (Playwright MCP, headless) · viewport 1440×900 |
| Paridade    | Supabase local; `*.supabase.co` e `**/g/collect*` bloqueados por rota; Mercado Pago com chave inválida (create-payment 400 depois do pedido); Melhor Envio fora (quote 500 ⇒ "Frete padrão" R$ 19,90); massa sintética QA; leitura de acessibilidade pela árvore do Playwright (`ariaSnapshot`), não por leitor de tela real |

## Missão

Refazer J-01 e J-03 como auditoria das qualidades transversais sobre o que o WI mudou: o tom das frases novas, o
anúncio do desconto pelo teclado, a recuperação das falhas de dinheiro e o layout em 390 com fonte grande.
Nesta rodada de confirmação: o de/por da peça com desconto (BUG-008) e o "Confirmar com o novo total" da
convidada (BUG-009).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Anônima, `/produtos/qa-pingente-estrela`: marcou "QA Berloque Coração", Prata 925, "Levar o conjunto" | Caixa: "Levar junto: QA Berloque Coração, Prata 925, 15% a menos levando junto". Gaveta, linha do Berloque: `text: de R$ 69,90 por R$ 59,42` (uma frase); "Acompanha o QA Pingente Estrela · 15% a menos"; Subtotal 329,80 · Desconto do Compre Junto −10,48 · Total 319,32 | `screenshots/CH-08-r2-01-gaveta-de-por-1440.png` |
| 02 | "Finalizar Pedido" | "Seu pedido": `generic "de R$ 69,90 por R$ 59,42"` e os dois números visíveis num `generic [aria-hidden]` | — |
| 03 | Preencheu contato (e-mail novo), CEP 90010-000, nº 100, frete padrão, PIX, CPF | "Pagar R$ 316,87 com PIX" | — |
| 04 | (painel, contexto isolado) Berloque do pingente: 15 → 5 %, Salvar, relido 5 | — | — |
| 05 | "Pagar R$ 316,87 com PIX" | `create-order 200`, `create-payment 422`. `alert` "O valor do seu pedido mudou … Nada foi cobrado. Antes R$ 316,87 Agora R$ 323,37", dois botões. Foco no `<body>` | `screenshots/CH-08-r2-02-aviso-valor-mudou-1440.png` |
| 06 | "Confirmar com o novo total" | `create-order 409`, `auth/otp 200` (sem 429). O aviso **fica**, ganha o parágrafo "O seu primeiro pedido criou uma conta na loja com <e-mail>. Por isso, antes de criar o pedido com o novo total, é preciso confirmar que o e-mail é seu. O código foi enviado para ele: digite-o no bloco Contato, acima, e confirme com o novo total.", Antes/Agora à vista; o bloco Contato mostra "Confirme que este e-mail é seu" com o campo do código. Foco vai para a `section` do aviso. Resumo já com "5% a menos · de R$ 69,90 por R$ 66,41" e Total R$ 323,37 | `screenshots/CH-08-r2-03-depois-confirmar-1440.png` |
| 07 | Leu o código no e-mail (Mailpit), "Verificar código", depois "Confirmar com o novo total" | Depois de verificar: o aviso e o "Confirmar" seguem na tela, botão "Pagar R$ 323,37 com PIX"; foco no `<body>`. "Confirmar": `create-order 200` → `/pedido/<id>/pagamento` (create-payment 400 do MP, esperado pela chave inválida) | `screenshots/CH-08-r2-04-depois-codigo-1440.png` |
| 08 | Abriu `/pedido/<id>` | Linha do Berloque: `text: de R$ 69,90 por R$ 66,41` | `screenshots/CH-08-r2-05-pedido-de-por-1440.png` |
| 09 | (painel) devolveu o Berloque a 15 %, Salvar, relido 15 ("sai de R$ 59,42 a R$ 63,67") | — | — |
| 10 | Limpou storage e cookies dos dois contextos, fechou o do painel e o browser | — | — |

**Edge cases tentados:**

- nada novo (rodada de confirmação). Refeito o ramo convidada + "o valor mudou" + desafio de código, que é o entorno de BUG-009.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-CFR-002 | pass | 01, 02, 05, 08 | `screenshots/CH-08-r2-01-gaveta-de-por-1440.png` · `CH-08-r2-05-pedido-de-por-1440.png` | bloco: nome acessível certo; gaveta, "Seu pedido" e `/pedido/:id` agora leem "de R$ 69,90 por R$ …" como uma frase (BUG-008 corrigido nas três). Aviso: `role="alert"` com os dois botões alcançáveis. O foco no `<body>` ao aparecer o aviso (A-2 da rodada 1, low) segue igual — não é regressão |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada (nenhuma regressão nem achado novo critical/high).

Observações para backlog (não viram bug nesta rodada):

- O foco continua no `<body>` quando o aviso "o valor mudou" aparece (passo 05) e depois de "Verificar código" (passo 07); só depois de "Confirmar" ele vai para o aviso (passo 06). É o A-2 da rodada 1 (low), inalterado.
- Depois de verificar o código, a tela mostra ao mesmo tempo "Confirmar com o novo total" no aviso e "Pagar R$ 323,37 com PIX" no rodapé; o texto do aviso manda usar o primeiro. Os dois levam ao mesmo total — polimento.

## CFR

| Jornada | Categoria             | Marca     | Itens que não passaram | Achado |
| ------- | --------------------- | --------- | ---------------------- | ------ |
| J-01    | Acessibilidade        | pass      | de/por na gaveta e no checkout lidos como frase; foco no `<body>` ao surgir o aviso (low, já conhecido) | — |
| J-01    | Recuperação de erro   | pass      | o "Confirmar" da convidada explica por que pede o código, mantém o novo total à vista e conclui depois do código | — |
| J-03    | Acessibilidade        | pass      | de/por em `/pedido/:id` lido como frase | — |
| J-01/J-03 | Paridade com produção | registrado | ambiente local, MP com chave inválida, Melhor Envio fora | — |

**Categorias fora:** Usabilidade, Performance percebida e Compatibilidade — rodada de confirmação, só o TC que falhou e o entorno de BUG-009.

## Spec-gaps

nada (rodada de confirmação).

## Fora da cobertura

- 390×844 com fonte a 200 % não refeito para o aviso novo (mais longo, com o parágrafo da conta) — orçamento da confirmação; a rodada 1 mediu o aviso antigo cabendo em 326 px.
- Cliente já logada no "o valor mudou" (caminho de CH-04) — fora do escopo desta confirmação.
- Leitor de tela real (VoiceOver/TalkBack) — só a árvore de acessibilidade do Chromium.
- Massa criada e deixada: conta convidada `sonia.ch08r2.<n>@exemplo.com` e dois pedidos pendentes dela (o do 1º create-order, R$ 316,87, e o do novo total, R$ 323,37). O percentual do Berloque no pingente **foi devolvido a 15 %** e relido.

## Debrief

- **Surpresas:** nenhuma; os dois consertos se comportam como os bugs pediam.
- **Próximo charter:** se for refeito, medir o aviso novo em 390 a 200 %.
- **Padrão novo:** nada.
