# Sessão CH-09 · design-check — o desconto do Compre Junto contra os protótipos

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-09-design-check.md` · design-check · P2        |
| Status      | not-run (design) — o MCP `claude-design` está na sessão, mas recusa a leitura: o token não tem os escopos de Claude Design |
| Persona     | PER-01 Marina · conta: anonima (e `admin-painel` só para a aba do painel) — nenhuma usada |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | 0 ações de browser de 50                                               |
| Ambiente    | loja http://localhost:8082 · painel http://localhost:8083 · build não exposto · browser não aberto |
| Paridade    | nenhum (a sessão não chegou ao app)                                    |

## Missão

Conferir, tela a tela, o que o WI desenhou contra o que a loja e o painel entregam, registrando cada diferença com o
valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Listar os arquivos do projeto Loja (`69224d8a-17ae-4b1f-a251-a8105b41edc2`) pelo `mcp__claude-design__list_files` | erro `needs_design_scopes` (scopes `user:design:read`, `user:design:write`): "This token doesn't include Claude Design access. In Claude Code, run /design-login and retry." | — |
| 02 | Listar os arquivos do projeto Backoffice (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`) | o mesmo erro `needs_design_scopes` | — |

Pela regra do guia de conferência visual (sem a fonte legível, a sessão é `not-run` por `design`; não conferir de
memória, nem por screenshot antiga), o browser não foi aberto e nenhuma tela foi comparada.

**Edge cases tentados:** nada

## Casos

| TC     | Veredito | Passo | Evidência | Nota |
| ------ | -------- | ----- | --------- | ---- |
| TC-UI-004 | blocked | 01 | — | design: o protótipo da Loja não é legível nesta sessão (`needs_design_scopes`) |
| TC-UI-005 | blocked | 01 | — | design: idem (projeto Loja, `Pedido - Desconto do Compre Junto.html`) |
| TC-UI-006 | blocked | 02 | — | design: o protótipo do Backoffice não é legível nesta sessão |

Contagem: pass 0 · fail 0 · blocked 3 · skip 0

## Achados

nada

## Design

**Protótipo:** `69224d8a-17ae-4b1f-a251-a8105b41edc2` (Loja) e `e3957c10-bd49-4f3d-9256-04d72a7d0f41` (Backoffice) · `claude_design` · não lido — o MCP `claude-design` recusou com `needs_design_scopes`

nada (nenhuma tela conferida)

**Telas não conferidas:** todas as do charter — bloco Compre junto, peças da lista (faixa · Q-02), barra fixa e nota do computador, gaveta da sacola, resumo do checkout, as duas telas de "o valor mudou", confirmação e Minha conta, e-mail do pedido, aba Compre junto do painel — `blocked` (design: fonte ilegível na sessão)

## Spec-gaps

nada

## Fora da cobertura

- A conferência inteira do charter — a fonte de design (Claude Design) não é legível com o token desta sessão. Para destravar: rodar `/design-login` no Claude Code (dá ao token os escopos `user:design:read`/`user:design:write`) e reexecutar o CH-09.
- Os achados já registrados que tocam o design (CH-01 #1, a grade no lugar da faixa — Q-02; CH-05 #1, a faixa da prévia do painel) seguem valendo pelas sessões que os acharam; esta sessão não os reconferiu.

## Debrief

- **Surpresas:** o MCP `claude-design` aparece carregado (as tools respondem), mas o token não tem o escopo de design — a falha só aparece na primeira chamada.
- **Próximo charter:** reexecutar o CH-09 depois do `/design-login`.
- **Padrão novo:** nada
