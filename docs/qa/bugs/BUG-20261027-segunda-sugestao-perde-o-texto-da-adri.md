# BUG-20261027-segunda-sugestao-perde-o-texto-da-adri: pedir uma segunda sugestão apaga para sempre o texto que a Adri tinha escrito

- **Status:** consertado — retestado (2026-10-27, working tree, sem commit; reteste em `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`)
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-curar-seo-com-ia, passo "Desfazer"
- **Scenarios:** PNL-seo-desfazer; PNL-seo-concorrencia-no-voo
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-backoffice-seo-com-ia.md

## Summary

A Adri tinha escrito título e descrição de SEO à mão (sem salvar). Tocou "Sugerir com IA", não gostou e
tocou de novo para ver outra opção. O "Desfazer" agora devolve a **primeira sugestão**, não o texto dela —
o texto escrito à mão some sem volta (a não ser descartando tudo e recarregando, se nunca foi salvo nem isso).
É o que a spec escreve (`SIA-12`: o desfazer some "na próxima sugestão"), por isso é decisão e não defeito
de implementação; mas é o medo que a persona declara: perder o texto que ela escreveu.

## Reproduction

- **Charter:** CH-seo-sugestao-no-ar · **Tour:** Interrupt Tour
- **Environment:** 1440×900, wifi, pt-BR, 200 interceptado

1. Abrir uma peça em `/admin/produtos/:id/editar` → aba SEO.
2. Escrever "Meu título escrito" e "Minha descrição escrita à mão." nos dois campos.
3. Tocar "Sugerir com IA" (sugestão A entra; aparece "Desfazer").
4. Tocar "Sugerir com IA" de novo (sugestão B entra).
5. Tocar "Desfazer".

**Expected:** voltar o texto escrito à mão (o que ela tinha antes de pedir ajuda à IA).
**Actual:** volta a sugestão A ("Sugestão A de Leite Materno em Prata"); o "Desfazer" some; o texto dela não volta.

## Evidence

- Medido por `inputValue` dos dois campos depois do passo 5 (relatório, CH-seo-sugestao-no-ar).
- `useSeoSuggestion.suggest` zera `previous` no início de cada pedido e o grava com o par atual na resposta.

## Conserto

- **Decisão:** `SIA-12` reescrita pelo usuário (2026-10-27): o ponto de volta é o texto de antes da
  **primeira** sugestão da série; sugestões seguidas não o substituem; desfazer, edição manual e save
  encerram a série.
- **O que mudou:** `apps/backoffice/src/features/seo-suggestion/model/useSeoSuggestion.ts` — o par do
  desfazer virou `origin` (`undefined` = sem série; `null` = série nascida de campos vazios, sem desfazer)
  e só a primeira resposta 200 da série o grava. Em voo o "Desfazer" some e volta com a resposta (inclusive
  numa falha no meio da série).
- **Teste que reprovou antes:** `src/features/seo-suggestion/model/__tests__/useSeoSuggestion.test.ts` › "SIA-12 (letra nova)…" (4 dos 7 casos vermelhos; os 3 de
  encerramento da série já passavam) e `apps/backoffice/src/pages/admin/AdminProductFormPage.seo.test.tsx` › "manual → sugerir → sugerir → desfazer
  devolve o texto manual" (recebido: a sugestão A).
- **Mutante reinjetado:** `if (originRef.current === undefined)` → `if (true)` (a 2ª sugestão volta a
  gravar o ponto de volta) — morto por asserção (4 falhas), SHA-256 conferido na restauração.

## Fix

Ver *Conserto*.

## Verification

**Retestado — passou** (2026-10-27, Chromium, painel :8083 contra o Supabase local, 200 interceptado, `reports/2026-10-27-backoffice-seo-com-ia-reteste.md`).
Passos originais em 1440×900 e 390×844: "Meu título escrito"/"Minha descrição escrita à mão." → Sugerir (A) → Sugerir (B) → Desfazer.
Nas duas larguras os campos voltaram exatamente ao texto escrito à mão; o "Desfazer" some durante o voo da 2ª sugestão
(0) e volta com ela (1); some depois de usado (0). Uma edição manual depois de uma sugestão também encerra a série (0).
Série nascida de campos vazios: nenhum "Desfazer" (0). Evidência: evidence/2026-10-27-backoffice-seo-com-ia-reteste/1440-desfazer-volta-ao-texto.png, evidence/2026-10-27-backoffice-seo-com-ia-reteste/390-desfazer-volta-ao-texto.png.
