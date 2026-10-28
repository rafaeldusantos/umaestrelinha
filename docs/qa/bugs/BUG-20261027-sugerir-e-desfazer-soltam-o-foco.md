# BUG-20261027-sugerir-e-desfazer-soltam-o-foco: depois de "Sugerir com IA" ou "Desfazer", o foco cai no body

- **Status:** consertado — retestado (2026-10-27, working tree, sem commit; reteste em `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`)
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças (teclado); Equipe com leitor de tela
- **Journey Step:** J-curar-seo-com-ia, passos "Sugerir com IA" e "Desfazer"
- **Scenarios:** PNL-seo-leitor-de-tela-e-teclado
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-backoffice-seo-com-ia.md

## Summary

Quem usa teclado ou leitor de tela aperta "Sugerir com IA" e perde o lugar: o botão fica desabilitado
enquanto a sugestão está no ar e o foco cai no `<body>` (sem anel visível, leitor volta ao topo). O mesmo
acontece no "Desfazer": ele some ao ser usado e leva o foco junto. Também no 503 (o botão fica desabilitado
de vez). Mesma classe dos bugs de foco do mobile-adm (`BUG-20261024-folha-fecha-e-foco-cai-no-body`, …).

## Reproduction

- **Charter:** CH-seo-fonte-grande-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 390×844, teclado, pt-BR

1. Aba SEO de uma peça com texto no Título SEO; Tab até "Sugerir com IA" e Enter.
2. Ler `document.activeElement` durante e depois da resposta.
3. Tab até "Desfazer" e Enter; ler `document.activeElement`.

**Expected:** o foco fica num lugar com sentido (o botão, ou o campo preenchido), com anel visível.
**Actual:** `BODY` durante o "Sugerindo…", `BODY` depois da resposta, `BODY` depois do "Desfazer". O Tab seguinte
do Chrome retoma perto (Desfazer → Título SEO), mas sem foco visível e com o leitor perdido.

## Evidence

- Medidas no relatório (CH-seo-fonte-grande-teclado-e-leitor): during/after/afterUndo = `BODY`.

## Conserto

- **O que mudou:** `apps/backoffice/src/features/seo-suggestion/ui/SuggestSeoButton.tsx` — em voo e com a
  IA não configurada (503) o botão é desligado por `aria-disabled="true"` (com `aria-disabled:opacity-50`
  e `cursor-not-allowed`), **sem** o `disabled` nativo, e o toque é ignorado no próprio botão (o hook
  ignora de novo). O 503 também usa `aria-disabled` porque ele chega sempre com o botão focado (ela acabou
  de tocá-lo). Só o "sem nome" (`SIA-11`) segue com o `disabled` nativo: ali o foco está no campo Nome.
  Ao tocar "Desfazer" (que some), o foco é entregue a "Sugerir com IA" por `ref`.
- **Teste que reprovou antes:** `apps/backoffice/src/features/seo-suggestion/ui/__tests__/SuggestSeoButton.test.tsx` › os casos de voo e de `disabled` (`aria-disabled`,
  sem nativo, toque ignorado) e "Desfazer some ao ser usado e o foco vai para Sugerir com IA";
  `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx` › "o foco não cai no body…" (o `activeElement` depois do "Desfazer" era o
  `<body>`) e o caso SIA-10 (o `disabled` nativo em "Sugerindo…").
- **Limite do jsdom (declarado):** jsdom não aplica a *focus fixup* do navegador — com o `disabled` nativo
  o `activeElement` em voo e no 503 continuava o botão (medido: essas duas linhas passavam antes). A régua
  que discrimina ali é a ausência do `disabled` nativo; o `activeElement` do navegador fica para o reteste.
- **Mutantes reinjetados:** `disabled={semNome || inerte}` (o nativo de volta) — morto (5 falhas); o
  `focus()` do "Desfazer" apagado — morto (2); o toque em voo não ignorado no botão — morto (2). SHA-256
  conferido.

## Fix

Ver *Conserto*.

## Verification

**Retestado — passou** (2026-10-27, `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`). `document.activeElement` no navegador real, botão focado por Shift+Tab a partir do Título SEO, resposta atrasada 1,5 s:

| Momento | 1440×900 | 390×844 |
|---|---|---|
| durante "Sugerindo…" | `BUTTON` Sugerindo… (`aria-disabled="true"`, sem `disabled` nativo, opacidade 0.5, cursor `not-allowed`) | idem |
| depois da resposta 200 | `BUTTON` Sugerir com IA, `:focus-visible` | idem |
| depois de "Desfazer" (Enter) | `BUTTON` Sugerir com IA, `:focus-visible` | idem |
| 503 real (`functions serve` sem a chave) | `BUTTON` Sugerir com IA, `:focus-visible`; próximo Tab → o Título SEO | idem |

A árvore de acessibilidade expõe o botão como `[disabled]` em voo e no 503 (o leitor anuncia indisponível). Enter, Espaço e
clique durante o voo: 1 requisição só; no 503, 0 requisições a mais. Evidência: evidence/2026-10-27-backoffice-seo-com-ia-reteste/390-503-foco-no-botao.png, evidence/2026-10-27-backoffice-seo-com-ia-reteste/1440-503-foco-no-botao.png.
