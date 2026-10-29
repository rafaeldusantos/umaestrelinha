# BUG-20261028-ver-na-loja-da-home-abre-o-painel: "Ver na loja" de /admin/home abre o próprio painel numa aba nova

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando o menu (curadoria da Home)
- **Journey Step:** canário — `/admin/home`, cabeçalho
- **Scenarios:** PNL-menu-previa-acompanha (adjacente)
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Anterior à `86`** (achado na prova da 86 e não registrado até um persona encontrar). Em `/admin/home`, "Ver na
loja" é `href="/"` com `target=_blank`: abre a raiz do **painel**, não a loja. O mesmo defeito foi consertado em
`/admin/menu` na 86 (lá o link é `http://localhost:8082/`).

## Reproduction

- **Environment:** 1440 × 900, painel dev

1. `/admin/home` → "Ver na loja".

**Expected:** a loja (origem de `VITE_STORE_URL`).
**Actual:** `href="/"` → painel.

## Evidence

- Relatório, canário (atributo `href` lido no DOM).

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `AdminHomePage.tsx`: `href={`${storeOrigin()}/`}`, como em `/admin/menu`; sem `VITE_STORE_URL` o botão não existe.
- **Teste que prova:** `AdminHomePage.test.tsx`, "\"Ver na loja\" abre a LOJA (Q09)" (2 casos, vermelhos antes).


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** `/admin/home`: "Ver na loja" com `href="http://localhost:8082/"` e `target=_blank`; o clique abre a loja (`http://localhost:8082/`). Igual ao de `/admin/menu`.
