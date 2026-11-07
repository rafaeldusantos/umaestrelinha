# Sessão CH-02 · Sacola e checkout: o desconto só com a joia, na medida da joia, até o pedido gravado — rodada 2 (confirmação)

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-02-sacola-e-checkout-presenca-e-quantidade.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima (convidada `@exemplo.invalid`)          |
| Tour · modo | Money · confirmação (só os TC que falharam na rodada 1 e o entorno das correções) |
| Rodada      | confirmação                                                            |
| Orçamento   | 24 ações de browser de 35 (várias interações agrupadas em `browser_run_code_unsafe`, contadas uma por chamada) |
| Ambiente    | http://localhost:8082 (worktree feature/92) · Chromium headless (Playwright MCP) · 390 × 844 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; `mercado-pago` com chave inválida (create-payment falha, a tela de pagamento mostra a falha; o "cobrado" é o valor do pedido gravado); Melhor Envio falha ⇒ "Correios Frete padrão" R$ 19,90 |

**Massa:** a mesma da rodada 1 — P = `qa-pingente-estrela` (Prata 925, R$ 259,90); peça = QA Berloque Coração Prata (R$ 69,90 → R$ 59,42, 15 %); M-10 = QA Joia Sem Compre Junto (R$ 199,90) + QA Medalha Afetiva (R$ 149,90).

**Pedidos criados:** **#0373** (id `4c5dce27-…`, P + Berloque pelo bloco + oferta do checkout marcada, PIX, R$ 383,75) e **#0374** (id `daea5a98-…`, M-10, PIX, R$ 345,21, na **mesma aba** com o #0373 pendente).

## Missão

Confirmar BUG-011 (ordem do resumo), BUG-001 (pagar sacola nova com um PIX pendente na mesma aba abria o pedido antigo), o entorno de BUG-002 (a oferta do checkout não volta marcada) e o entorno de BUG-003/BUG-008 (o de/por da linha da peça na gaveta, checkout e pedido).

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Em `/produtos/qa-pingente-estrela`, marcar o Berloque, escolher Prata 925 e "Levar o conjunto" | Gaveta: Berloque "de R$ 69,90 por R$ 59,42", "Acompanha o QA Pingente Estrela · 15% a menos"; Subtotal (2 itens) R$ 329,80 · Desconto do Compre Junto −R$ 10,48 · Total R$ 319,32 | — |
| 02 | "Finalizar Pedido" e abrir o resumo | Berloque "de R$ 69,90 por R$ 59,42"; resumo **Subtotal R$ 329,80 · Desconto do Compre Junto −R$ 10,48 · Desconto PIX (7%) −R$ 22,35 · Frete a calcular · Total R$ 296,97**; nota do Compre Junto presente | `screenshots/CH-02-r2-02-checkout-resumo-ordem-390.png` |
| 03 | Contato (convidada), CEP 90010-000, número, "Frete padrão" | Resumo: Subtotal 329,80 · CJ −10,48 · PIX −22,35 · **Frete · Correios Frete padrão R$ 19,90** · Total R$ 316,87 (= 329,80 − 10,48 − 22,35 + 19,90); cartão "4x de R$ 84,81" | — |
| 04 | Marcar a oferta do checkout (QA Corrente Veneziana R$ 71,92), CPF, "Pagar R$ 383,75 com PIX" | Subtotal 401,72 · CJ −10,48 · PIX −27,39 · Frete 19,90 · Total R$ 383,75. Abre `/pedido/4c5dce27…/pagamento` — **#0373, R$ 383,75** = botão | — |
| 05 | Abrir `/pedido/:id` | Berloque "Acompanha … · 15% a menos · Prata 925 · 1 unidade" de R$ 69,90 por R$ 59,42; Corrente de R$ 89,90 por R$ 71,92; resumo **Subtotal R$ 419,70 · Desconto do Compre Junto −R$ 10,48 · Desconto da oferta −R$ 17,98 · Desconto PIX −R$ 27,39 · Frete R$ 19,90 · Total R$ 383,75**; `scrollWidth` 390 | `screenshots/CH-02-r2-05-confirmacao-0373-390.png` |
| 06 | Na mesma aba, esvaziar a sacola e pôr M-10 (Medalha + Joia Sem CJ pelas páginas); ir ao checkout | Contato e entrega salvos; **oferta do checkout desmarcada** (`aria-checked=false`); resumo Subtotal 349,80 · PIX −24,49 · Frete 19,90 · Total R$ 345,21; "Pagar R$ 345,21 com PIX" | `screenshots/CH-02-r2-06-checkout-sacola-nova-390.png` |
| 07 | Tocar "Pagar R$ 345,21 com PIX" | Não abriu o pedido antigo: o checkout pediu o código do e-mail ("Este e-mail já tem cadastro na loja") — a conta da convidada nasceu no 1º pedido (AD-035, esperado) | — |
| 08 | "Usar outro e-mail" (`marina.r2b…@exemplo.invalid`), Continuar, "Pagar R$ 345,21 com PIX" | Rede: `checkout?action=create-order` (novo), `get-order`, `create-payment`. Abre `/pedido/daea5a98…/pagamento` — **#0374, R$ 345,21** = botão | `screenshots/CH-02-r2-07-pagamento-sacola-nova-390.png` |
| 09 | Abrir `/pedido/:id` do #0374 | Medalha R$ 149,90, Joia Sem CJ R$ 199,90, sem "Acompanha" nem de/por; resumo Subtotal 349,80 · Desconto PIX −24,49 · Frete 19,90 · Total R$ 345,21 | — |

**Edge cases tentados:** nenhum novo (rodada de confirmação). O cenário do BUG-001 foi refeito na mesma aba, com o pedido A pendente e a sacola trocada.

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-001 | pass | 01–05 | `screenshots/CH-02-r2-02-checkout-resumo-ordem-390.png` · `CH-02-r2-05-confirmacao-0373-390.png` | checkout = pagamento = confirmação = R$ 383,75; ordem Subtotal · descontos · Frete · Total nas duas telas (BUG-011 corrigido) |
| TC-FUNC-018 | pass | 02–04 | `screenshots/CH-02-r2-02-checkout-resumo-ordem-390.png` | PIX = 7 % × (subtotal − CJ) ao centavo (22,35 e 27,39); cartão sem PIX e com CJ (84,81); Frete depois dos descontos |
| TC-FUNC-024 | pass | 04, 06–08 | `screenshots/CH-02-r2-07-pagamento-sacola-nova-390.png` | com o #0373 pendente na mesma aba, a sacola nova cria o #0374 com o valor do botão (BUG-001 corrigido); oferta não volta marcada (entorno BUG-002). Ver nota do passo 7–8 |
| TC-FUNC-026 | pass | 05, 09 | `screenshots/CH-02-r2-05-confirmacao-0373-390.png` | linhas e de/por certos; ordem do resumo segue o painel; conta fecha. Minha conta é do CH-03 |

Contagem: pass 4 · fail 0 · blocked 0 · skip 0

## Achados

Nenhum achado novo critical/high nem regressão.

**Sugestão de backlog (não é bug nesta rodada):** com a oferta do checkout marcada, o resumo do checkout lista "3 itens" mas mostra só 2 linhas de peça e soma a oferta já com desconto no Subtotal (R$ 401,72), enquanto `/pedido/:id` lista a Corrente com de/por, Subtotal cheio R$ 419,70 e a linha "Desconto da oferta −R$ 17,98". O Total bate (R$ 383,75); é apresentação da oferta, território do CH-03 (passos 04–05).

## Spec-gaps

Nenhum (rodada de confirmação).

## Fora da cobertura

- BUG-001 com o **mesmo e-mail** da convidada: a 2ª compra cai no desafio de código (AD-035) e o código só chega pelo e-mail; para seguir sem ler a caixa de entrada, a sessão trocou o e-mail no checkout (passo 8). O pedido pendente da sessão continuava o mesmo, então a condição do bug foi exercitada; o ramo "mesmo e-mail + código verificado" não foi.
- BUG-001 com cartão e com a sacola só acrescida (não trocada) — não pedido nesta rodada.
- 1440 × 900 e fonte 130/200 % — não reconferidos (sem mudança nesta superfície pedida para a confirmação).
- O valor no painel dos pedidos #0373/#0374 — fora deste charter.

## Debrief

- **Surpresas:** nenhuma; as duas correções se comportam como esperado.
- **Próximo charter:** CH-03 conferir a apresentação da oferta do checkout entre o resumo do checkout e `/pedido/:id` (a sugestão acima).
