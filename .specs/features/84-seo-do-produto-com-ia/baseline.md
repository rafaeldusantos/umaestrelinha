# 84 — Baseline de entrada

Medida em 2026-10-27, branch `feature/84-seo-do-produto-com-ia` recém-criada sobre `96757cc7`, **antes de
qualquer edição de código da `84`**, um workspace por vez, `--testTimeout=20000` sem `--`, exit capturado
fora de pipe. A árvore carrega trabalho **não commitado de outra frente** (o "voltar" do produto e o
recorte das listas de pedidos/produtos na URL), e ele está dentro destes números.

| Workspace | Testes / arquivos | Exit |
| --- | --- | --- |
| core | 4697 / 184 | 0 |
| functions | 1105 / 26 | 0 |
| backoffice | 4016 / 230 | 0 |
| store | 6146 / 329 | **1** — todos os testes passaram; 1 *Unhandled Error* de infraestrutura do vitest (`[vitest-worker]: Timeout calling "onTaskUpdate"`), sem asserção reprovada. Assinatura de contenção, não de defeito. |

Catalog-import e mobile-adm não serão tocados pela `84` e não foram medidos.

Tipos e lint: herdados da tabela do `CLAUDE.md` (apps 0; `packages/core` 11; lint backoffice 23/5, store 2/2).
