# BUG-20261028-produto-abre-com-alteracoes-nao-salvas: Abrir uma peça sem mexer em nada já diz "Alterações não salvas"

- **Status:** open
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, abrir a peça (e o abandono "sai sem salvar")
- **Scenarios:** PNL-midia-regressoes-da-pagina; PNL-midia-resumo-mostra-a-peca
- **Found:** 2026-10-28 · **Report:** .specs/features/85-resumo-com-imagens-do-produto/prova-navegador.md (achado 4, prova T12 — antes do ciclo de QA)
- **Origin:** prova em navegador da feature `85`; **anterior à `85`** — reproduzido também no painel da `master`

## Summary

A Adri abre uma peça só para olhar e o painel já mostra "Alterações não salvas", como se ela tivesse mudado algo.
Em ~1,5 s grava um rascunho no `sessionStorage`; na próxima visita na mesma aba aparece "Há um rascunho não salvo"
(~170px), e sair da página pede confirmação. Ela passa a desconfiar do que está na tela e do que está gravado. Na `85`
o aviso empurra a foto principal para 10px abaixo da dobra em 390×844 (854 > 844), contrariando o Goal da feature.

## Reproduction

- **Charter:** CH-midia-regressoes-da-pagina · **Tour:** Back-Button Tour
- **Environment:** painel Vite (worktree em :8093 e `master` em :8083), Supabase local :54441, Chromium (Playwright), pt-BR

1. Com o `sessionStorage` limpo, abrir `/admin/produtos/eb0d919d-…/editar` (6 fotos) ou `/admin/produtos/ff520070-…/editar` (9 fotos).
2. Não tocar em nada; esperar 2 s.
3. Navegar para outra página do painel e voltar à mesma peça na mesma aba.

**Expected:** sem edição, nenhum "Alterações não salvas", nenhum rascunho, nenhuma guarda de saída.
**Actual:** "Alterações não salvas" logo ao abrir; rascunho em `sessionStorage` em ~1,5 s; na volta, o aviso "Há um rascunho não salvo"; `page.goto` dispara `beforeunload`.

## Evidence

- `.specs/features/85-resumo-com-imagens-do-produto/prova-navegador.md`, *Defeitos e achados* item 4, e a linha "Principal … bottom 684 sem o aviso · 854 com o aviso".
- Leitura independente: o mesmo sintoma no painel da `master` (:8083), nos dois produtos — não é regressão da `85`.
- Contraponto: `PNL-variacoes-salvar-e-reabrir-sem-mudar` reabriu um produto de teste sem o sintoma em 2026-10-26 — o gatilho deve depender do conteúdo da peça (ex.: descrição normalizada pelo editor). Comparar os dois na sessão.

## Fix

<!-- filled when status moves to fixed -->

## Verification

<!-- filled when status moves to verified -->

## Re-found (2026-10-28)

Ciclo de QA da 85 (`reports/2026-10-28-backoffice-resumo-com-imagens.md`, sessões 1, 2 e 4). Reproduzido em
`ff520070-…` (9 fotos) e numa peça TESTE criada por SQL a partir de `eb0d919d-…`: "Alterações não salvas" logo ao
abrir e o rascunho em `sessionStorage`. **Dado novo que sustenta a hipótese do contraponto:** a mesma peça TESTE,
depois de um "Salvar rascunho" pelo painel, reabre limpa (sem o selo, `sessionStorage` vazio). O console traz
`[tiptap warn]: Duplicate extension names found: ['link']` a cada abertura — candidato a normalizar a descrição.
Em 390 a principal da peça TESTE terminou em 684 (sem o aviso de rascunho, que só aparece numa segunda visita na aba).
