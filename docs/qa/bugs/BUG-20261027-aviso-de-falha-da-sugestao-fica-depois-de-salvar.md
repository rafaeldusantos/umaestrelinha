# BUG-20261027-aviso-de-falha-da-sugestao-fica-depois-de-salvar: a frase de falha da sugestão continua na tela depois de ela escrever à mão e salvar

- **Status:** consertado — retestado (2026-10-27, working tree, sem commit; reteste em `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-curar-seo-com-ia, passo "Campos intocados, escreve à mão → Salvar"
- **Scenarios:** PNL-seo-falhas-legiveis
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-backoffice-seo-com-ia.md

## Summary

A sugestão falhou ("A sugestão não veio desta vez…", ou "Muitas sugestões seguidas. Tente de novo em
alguns minutos."). A Adri seguiu o conselho, escreveu à mão e salvou com sucesso. A frase de falha continua
embaixo do botão, ao lado do texto já salvo, até a próxima sugestão ou um F5 — o painel parece dizer que algo
ainda está errado. Trocar de aba também não limpa.

## Reproduction

- **Charter:** CH-seo-falhas-sem-perder-trabalho · **Tour:** Network Tour
- **Environment:** 390×844, 502/rede abortada interceptados

1. Aba SEO; "Sugerir com IA" com a resposta 502 (ou rede caída).
2. Editar o Título SEO à mão.
3. "Salvar rascunho" (toast de sucesso; banco gravado).

**Expected:** a frase some quando ela edita o SEO ou salva.
**Actual:** a frase continua depois da edição e depois do save (lida nos dois momentos).

## Evidence

- Relatório, CH-seo-falhas-sem-perder-trabalho (m1/m2 iguais; banco com o texto escrito).

## Conserto

- **O que mudou:** `apps/backoffice/src/features/seo-suggestion/model/useSeoSuggestion.ts` — a frase da
  região viva é apagada na edição manual de um campo de SEO (`noteManualEdit`, fora de voo), no `reset()`
  do save e no desfazer. A exceção é a frase de `not_configured`, que é a dica do botão desligado
  (`SIA-20`) e fica até recarregar. Com a sugestão no ar a edição não apaga nada (a frase de `SIA-25` chega
  depois). A página não mudou: ela já chamava `noteManualEdit` nos dois `onChange` e `reset` no save.
- **Teste que reprovou antes:** `src/features/seo-suggestion/model/__tests__/useSeoSuggestion.test.ts` › "a frase de falha sai na edição manual e no save" (8 casos
  vermelhos: 502/rede/429/422 × edição e save); `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx` › "502 ⇒ … editar o Título SEO à
  mão a apaga" e "429 ⇒ … salvar a apaga".
- **Mutantes reinjetados:** `noteManualEdit` sem apagar (morto, 7); `reset` sem apagar (morto, 7);
  apagar também a dica de `not_configured` (morto, 1). SHA-256 conferido.

## Fix

Ver *Conserto*.

## Verification

**Retestado — passou** (2026-10-27, `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`). Em 390 e 1440: 502 → editar o Título SEO à mão ⇒ região vazia;
429 → "Salvar rascunho" (toast "Rascunho salvo") ⇒ região vazia; banco local com o texto escrito (`seo_title = 'Título que eu escrevi agora'`).
A dica do 503 ("Sugestão por IA não está configurada.") continua depois de ir à Geral e voltar, como `SIA-20` pede.
