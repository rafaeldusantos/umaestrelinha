# 85 — baseline de entrada

Medida em 2026-10-28 no worktree `store-worktrees/85-resumo-com-imagens` (master `e905a4ba`), árvore
parada, antes de qualquer edição, um workspace por vez, exit code fora de pipe, `--testTimeout=20000`.

| Medida | Valor |
| --- | --- |
| backoffice | **4036 / 230**, exit 0 |
| store | **6154 / 329**, exit 0 |
| tsc backoffice | 0 |
| lint backoffice | 23 erros / 5 warnings |

Banco local: aplicadas antes da medição as duas migrations da master que faltavam
(`20261031120000`, `20261101120000`). A `85` não tem migration nem edge function.

## Rebase sobre a master com a 84 (8d9aaf5a)

A master recebeu a feature 84 durante a Fase 2. A branch da 85 (sem commit) foi avançada por
fast-forward e as edições da Fase 1 em `checklist.ts`, `checklist.test.ts`, `PublishChecklist.test.tsx`
e `AdminProductFormPage.tsx` reaplicadas por patch de 3 vias, sem conflito. **A baseline que vale
para o delta da 85 é a da master nova**, medida num worktree descartável em 2026-10-28 (apagado depois):

| Medida | Valor |
| --- | --- |
| backoffice | **4162 / 235**, exit 0 |
| store | **6176 / 330**, exit 0 |
