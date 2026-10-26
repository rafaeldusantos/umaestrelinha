# BUG-20261026-valor-devolvido-volta-pausado: Devolver o valor de uma variação vendida traz a linha de volta pausada, com o aviso antigo

- **Status:** consertado (2026-10-26, decisão pela recomendação do QA — confirmar)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, remover valor vendido
- **Scenarios:** PNL-variacoes-remover-valor-vendido-pausa
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Remover "Prata 925" (vendida) pausa a linha e mostra o aviso. Ao digitar "Prata 925" de novo, a linha volta ao cruzamento mas continua pausada, e o aviso "ficaram pausadas: Prata 925" segue na tela. Quem desfez o engano não vê que precisa religar a variação.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Abrir `/admin/produtos/229afd74-c6fe-4c2d-8182-805d2f7801a6/editar` → Preços & variações.
2. Remover o valor "Prata 925" → acrescentar "Prata 925".

**Expected:** a decidir: ou a linha volta ao estado de antes (ativa) e o aviso some, ou o aviso diz que ela continua pausada.
**Actual:** linha pausada, aviso inalterado.

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-orfa-vendida-390.png`

## Decisão para a dona / produto

A spec diz que só OPV-02 e OPV-04 mudam `is_active` sozinhos; religar ao devolver o valor seria uma
terceira regra. Recomendação: não religar sozinho, e trocar o aviso da linha que voltou por "Prata 925
voltou à grade e continua pausada." — sem mexer no dado.

## Resolução

**Status: consertado** em 2026-10-26 — decidido pela recomendação do QA, **a confirmar**.

- A linha devolvida **continua pausada** (só OPV-02 e OPV-04 mudam `is_active` sozinhos); nada no dado
  mudou.
- O aviso passou a dizer isso e onde se reativa, literal exato no teste da página real:
  "Estas variações já foram vendidas e ficaram pausadas: 3,5 cm. Continuam pausadas mesmo que o valor
  volte às opções; para vender de novo, ligue “Ativa” na linha da grade."
- Teste vermelho antes do código: `AdminProductFormPage.variacoes.test.tsx` ("devolver o valor da
  vendida NÃO a religa"), mais o literal novo nos três casos que já cravavam o aviso.
- Spec: OPV-04 atualizada.

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.

O reteste achou um defeito novo na mesma frase — ligar "Ativa" não tirava a linha do aviso: `BUG-20261026-aviso-de-pausa-continua-depois-de-reativar` (consertado).
