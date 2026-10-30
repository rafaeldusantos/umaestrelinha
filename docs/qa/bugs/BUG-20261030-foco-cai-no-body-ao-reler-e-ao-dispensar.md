# BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar: o foco cai no começo da página depois do "Tentar de novo" do Histórico e do "Dispensar" do resumo do lote

- **Status:** verified (2026-10-30, segundo reteste em navegador; working tree, sem commit)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri despachando pedidos (teclado / leitor de tela)
- **Journey Step:** J-mudar-pedido-com-ou-sem-aviso, Histórico com a leitura dos e-mails falhando; J-avancar-pedidos-em-lote, passo 'Resumo'
- **Scenarios:** PNL-aviso-teclado-e-leitor;PNL-lote-avancar-com-progresso
- **Found:** 2026-10-30 · **Report:** reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos-reteste.md
- **AC:** padrão do repositório (família de `BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido`); os dois botões nasceram no conserto do QA (Q1/A-14 e Q5)

## Summary

Dois botões criados pelo conserto do QA somem ao serem usados e deixam o foco no `<body>` — o leitor recomeça do topo. (1) No Histórico com a leitura dos e-mails falhando, "Tentar de novo": quando a releitura dá certo, o aviso some com o botão e `document.activeElement` = `BODY` (quando a releitura falha de novo, o foco fica no botão). (2) Na lista, "Dispensar o resumo do lote": a região some e o foco vai ao `BODY`. Os casos do bug-irmão passam todos; estes dois não estavam na lista dele.

## Reproduction

- **Charter:** CH-aviso-rede-lenta-e-falhas / CH-aviso-lote-do-dia · **Tour:** Network Tour / Money Tour
- **Environment:** Chromium 1440×900, teclado

1. Abrir um pedido com `GET /rest/v1/order_notifications` respondendo 500.
2. Devolver a leitura; focar "Tentar de novo" do Histórico e apertar Enter.
3. Ler `document.activeElement`.
4. Na lista, avançar um lote; no resumo, "Dispensar o resumo do lote"; ler `document.activeElement`.

**Expected:** o foco vai a um lugar que continua na tela (o título "Histórico" ou a lista do Histórico; a tabela, o título da página ou o primeiro controle depois do resumo).
**Actual:** `BODY` nos dois.

## Evidence

- Medido por `document.activeElement` na sessão R1 e R5 do relatório.

## Fix (2026-10-30, conserto do reteste)

Os dois pelo dono do retorno de foco (`shared/lib/foco.ts`, `devolverFoco`):

- `features/order-detail/ui/OrderHistory.tsx`: o "Tentar de novo" guarda a própria ref; depois da
  releitura (num efeito, depois do commit) o foco fica nele se o aviso continua (a leitura falhou de novo)
  ou vai ao título "Histórico" (`h2`) se o aviso sumiu.
- `pages/admin/AdminOrdersPage.tsx`: "Dispensar o resumo do lote" tira a região com `flushSync` e põe o
  foco no título da lista ("Pedidos", `tituloDaPagina`).
- Testes (vermelhos antes: `activeElement` = `<body>`, com `simularFocoDoNavegador`):
  `AdminOrderPage.aviso.test.tsx` ("Tentar de novo" que lê ⇒ `h2` Histórico; o par que falha de novo ⇒ o
  botão) e `AdminOrdersPage.aviso.test.tsx` ("Dispensar" ⇒ `h1` Pedidos). Mutantes F1 e F2 mortos por
  asserção.

## Verified (2026-10-30, segundo reteste)

- **Retested:** Chromium 1228, 1440×900 e 390×844, teclado (foco + Enter).
- **Result:** "Tentar de novo" com a leitura ainda em 500 ⇒ `BUTTON "Tentar de novo"`; com a leitura de
  volta ⇒ `H2 "Histórico"` (o aviso some e o "Aviso de postagem enviado" reaparece), nos dois tamanhos. Lote
  de 6 (4 avançam, 2 já no fim): o resumo recebe o foco ao aparecer (`DIV[role=status] "Resumo do
  lote"`); "Dispensar" por teclado ⇒ a região some e o foco vai a `H1 "Pedidos"`.
- **Evidência:** `evidence/2026-10-30-aviso-opcional-reteste-2/f-historico-releu-1440.png`, `evidence/2026-10-30-aviso-opcional-reteste-2/f-historico-releu-390.png`,
  `evidence/2026-10-30-aviso-opcional-reteste-2/f-resumo-lote-1440.png`.
