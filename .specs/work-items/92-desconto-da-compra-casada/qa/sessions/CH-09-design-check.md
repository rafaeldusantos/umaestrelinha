# Sessão CH-09 · design-check — o desconto do Compre Junto contra os protótipos

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-09-design-check.md` · design-check · P2        |
| Status      | not-run (design — a fonte de design não pôde ser lida pelo MCP `claude-design` nesta sessão) |
| Persona     | PER-01 Marina · conta: `cliente-loja` (a criar pela loja) · `admin-painel` (premissa da thread: usuário de desenvolvimento do `supabase/seed.sql`, seção 5) — nenhuma das duas chegou a ser usada |
| Tour · modo | —                                                                      |
| Rodada      | confirmação (rodada 3) — só TC-UI-005                                  |
| Orçamento   | 0 ações de browser de 13                                               |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · Mailpit :54444 · Supabase local :54441 · worktree feature/92 — o browser não foi aberto |
| Paridade    | nenhum (nada executado)                                                |

## Missão

Conferir, tela a tela, o que o WI desenhou contra o que a loja e o painel entregam, registrando cada diferença com o
valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Ler o protótipo `Pedido - Desconto do Compre Junto.html` do projeto `69224d8a-17ae-4b1f-a251-a8105b41edc2` pelo MCP `claude-design` (`list_files`) | Recusa do MCP: `needs_design_scopes` — "This token doesn't include Claude Design access. In Claude Code, run /design-login and retry." (escopos `user:design:read`, `user:design:write`) | — |
| 02 | Procurar uma cópia da fonte de design na pasta do WI | Nenhuma (só `spec.md`/`prd.md`, que não são a fonte de design do charter) | — |
| 03 | Encerrar sem abrir o browser | Pela regra do design-check, fonte ilegível ⇒ `not-run` por `design`; não se confere de memória nem pelo log da rodada 2. A massa (conta, pedido PIX, troca de percentual) **não** foi produzida, para não alterar o percentual da M-01 sem uma conferência que a justifique | — |

**Edge cases tentados:** nada

## Casos

| TC        | Veredito | Passo | Evidência | Nota |
| --------- | -------- | ----- | --------- | ---- |
| TC-UI-005 | blocked  | 01    | —         | `blocked` por `design`: o MCP `claude-design` recusou com `needs_design_scopes`. Segue faltando: Checkout · o valor mudou, Link / Minha conta · o valor mudou e Confirmação / Minha conta. O Checkout · resumo e o E-mail (D4, low, backlog) ficam como conferidos na rodada 2 |

Contagem: pass 0 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Design

**Protótipo:** `69224d8a-17ae-4b1f-a251-a8105b41edc2` · Pedido - Desconto do Compre Junto · `claude_design` · não lido (MCP sem escopo de design)

Nenhuma diferença registrada.

**Telas não conferidas:** Checkout · o valor mudou — `blocked` (design ilegível); Link / Minha conta · o valor mudou — `blocked` (design ilegível); Confirmação · Minha conta — `blocked` (design ilegível).

## Spec-gaps

nada

## Fora da cobertura

- As três telas pendentes de TC-UI-005 — o MCP `claude-design` desta sessão não tem os escopos `user:design:read`/`user:design:write`; é preciso rodar `/design-login` no Claude Code e repetir a sessão.
- A massa da rodada (conta `rt3.ch09.<timestamp>@exemplo.com`, pedido PIX pendente com desconto casado, troca e devolução do percentual no painel) — não produzida, porque sem a fonte não há conferência que a use.

## Debrief

- **Surpresas:** o MCP `claude-design` que funcionou na rodada 2 voltou sem escopo de design nesta sessão.
- **Próximo charter:** repetir esta mesma sessão (rodada 3 de CH-09, só TC-UI-005) depois do `/design-login`.
- **Padrão novo:** nada
