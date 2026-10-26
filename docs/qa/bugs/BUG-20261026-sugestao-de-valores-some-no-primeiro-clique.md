# BUG-20261026-sugestao-de-valores-some-no-primeiro-clique: Os chips de valores sugeridos somem depois do primeiro toque

- **Status:** consertado (2026-10-26, decisão pela recomendação do QA — confirmar)
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P3
- **Persona Affected:** Adri cadastrando peças
- **Journey Step:** J-cadastrar-peca-com-variacoes, escolher valores sugeridos
- **Scenarios:** PNL-variacoes-sugestao-de-nome-e-valores
- **Found:** 2026-10-26 · **Report:** docs/qa/reports/2026-10-26-opcoes-e-variacoes.md

## Summary

Tocar num chip (ex.: "16") acrescenta o valor e o bloco inteiro desaparece; para escolher "17" e "18" a Adri precisa digitar e escolher na lista do campo. Os chips parecem multi-escolha e funcionam como escolha única.

## Reproduction

- **Charter:** CH-variacoes-cadastrar-pecas-repetidas · **Tour:** Data
- **Environment:** painel em `pnpm dev:backoffice` (:8083), Supabase local, Chromium (Playwright), pt-BR

1. Escolher "Tamanho" → tocar no chip "16".

**Expected:** os outros chips continuam disponíveis até ela terminar.
**Actual:** o bloco some (`option.values.length === 0` é a condição dele, como OPV-19 escreve).

## Evidence

- `docs/qa/evidence/2026-10-26-opcoes-e-variacoes/81qa-valores-sugeridos-390.png`

## Decisão para a dona / produto

OPV-19 condiciona o bloco a "a opção não tem valores". Mudar a condição muda a spec. Recomendação:
manter os chips restantes enquanto a opção tiver menos valores que o conjunto sugerido, junto com a
decisão do bug irmão (`BUG-20261026-usar-os-valores-junta-o-catalogo-inteiro`).

## Resolução

**Status: consertado** em 2026-10-26 — decidido pela recomendação do QA, **a confirmar**.

- Os chips continuam visíveis enquanto houver sugestão não usada: `remainingValues`
  (`entities/product/lib/optionLibrary.ts`) tira, pela dobra, os valores já presentes. Os conjuntos
  seguem a mesma régua — o que a opção já tem inteiro sai e dá lugar ao seguinte.
- O acréscimo também compara pela dobra ("3,5 CM" não vira um segundo "3,5 cm").
- Testes vermelhos antes do código: `optionLibrary.test.ts` e `OptionsEditor.test.tsx` ("depois do
  primeiro valor, os chips que sobraram CONTINUAM").
- Spec: OPV-19 e OPV-20 atualizadas.

## Retest 2026-10-26

Retestado em navegador (390 × 844 e 1440 × 900, fonte 200 % no 390) contra o bundle servido do working tree: passa. Relatório: `reports/2026-10-26-opcoes-e-variacoes-reteste.md`.

Consequência medida e aberta como decisão: `BUG-20261026-chips-ocupam-a-tela-depois-do-conjunto`.
