# BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor: quando a sugestão entra nos campos, nada é anunciado

- **Status:** consertado — retestado (2026-10-27, working tree, sem commit; reteste em `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com leitor de tela
- **Journey Step:** J-curar-seo-com-ia, passo "Campos preenchidos"
- **Scenarios:** PNL-seo-leitor-de-tela-e-teclado
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-backoffice-seo-com-ia.md

## Summary

Toda falha tem frase na região `role="status"` (`aria-live="polite"`), mas o sucesso deixa a região
**vazia**. Quem ouve a tela ouve "Sugerindo…" sumir e mais nada: não sabe que os dois campos foram trocados,
nem que há um "Desfazer". Para quem vê, a troca é visível; para o leitor, é silenciosa.

## Reproduction

- **Charter:** CH-seo-fonte-grande-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 390×844 e 1440×900, 200 interceptado

1. Aba SEO, "Sugerir com IA" com resposta 200.
2. Ler o texto do `[role=status]` dentro de `[data-testid=seo-suggestion]`.

**Expected:** uma frase curta (ex.: "Sugestão no título e na descrição. Revise antes de salvar.").
**Actual:** `""` nas duas larguras.

## Evidence

- evidence/2026-10-27-backoffice-seo-com-ia/1440-sugerido.png (campos trocados, região vazia).

## Conserto

- **O que mudou:** frase nova `SEO_SUGGESTION_APPLIED` em
  `apps/backoffice/src/features/seo-suggestion/model/copy.ts` — "Sugestão aplicada ao título e à
  descrição. Revise antes de salvar." —, escrita pelo hook na resposta 200 na região `role="status"`. Some
  no próximo toque, na edição manual, no desfazer e no save. `SPEC_DEVIATION`: a spec não dava frase ao
  sucesso (lacuna de precisão de `SIA-10`); registrado no `tasks.md`.
- **Teste que reprovou antes:** `src/features/seo-suggestion/model/__tests__/useSeoSuggestion.test.ts` › "a frase do sucesso…" e o 1º caso de "sugerir (SIA-10)" (a
  asserção `message` passou de `null` para a frase — mudança de comportamento, não afrouxamento);
  `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx` › "o leitor de tela ouve o sucesso" (2 casos).
- **Mutante reinjetado:** `setMessage(SEO_SUGGESTION_APPLIED)` → `setMessage(null)` — morto por asserção
  (5 falhas), SHA-256 conferido.

## Fix

Ver *Conserto*.

## Verification

**Retestado — passou** (2026-10-27, `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`). Em 1440 e 390, depois do 200 a região `role="status"` lê
"Sugestão aplicada ao título e à descrição. Revise antes de salvar." (também na série nascida de campos vazios); fica vazia depois
do "Desfazer" e da edição manual. Árvore de acessibilidade: `status: Sugestão aplicada…`. Leitor de tela real não usado (declarado).
