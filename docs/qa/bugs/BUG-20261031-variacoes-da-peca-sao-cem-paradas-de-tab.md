# BUG-20261031-variacoes-da-peca-sao-cem-paradas-de-tab: escolher a variação pelo teclado exige atravessar as 108 opções com Tab

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando uma venda
- **Journey Step:** J-montar-pedido-para-a-cliente, step "Peças"
- **Scenarios:** PNL-montado-fonte-grande-e-teclado
- **Found:** 2026-10-31 · **Report:** reports/2026-10-31-pedido-montado.md

## Summary

A lista de variações é um `radiogroup` com cada opção `role="radio"` e `tabIndex=0`, sem setas. Na
peça "Anel Afetivo Aliança com Coto Umbilical" são 108 paradas de Tab até sair da lista, e a seta não
move entre as opções (o padrão de grupo de rádio é uma parada só, com setas). Para quem monta pelo
teclado, cada peça com grade vira dezenas de Tabs. Depois de acrescentar a peça, o foco fica na lista
de resultados da busca, não na linha nova.

## Reproduction

- **Charter:** CH-montado-fonte-grande-teclado-e-privacidade · **Tour:** Feature Tour
- **Environment:** 1440, só teclado

1. `/admin/pedidos/montar`, focar "Acrescentar peça", digitar "Aliança com Coto", Tab, Enter.
2. Tab pela lista de variações; tentar ArrowDown numa opção.

**Expected:** uma parada de Tab para o grupo e setas entre as opções.
**Actual:** 108 radios com `tabIndex 0`; ArrowDown não move.

## Fix

- **Fix:** T32: `tabIndex` itinerante + `onKeyDown` em `VariantPicker.tsx` (setas, Home, End, com volta nas pontas; seta move o foco e não escolhe, Enter/Espaço escolhem).
- **Regression test:** `apps/backoffice/src/entities/product/ui/__tests__/VariantPicker.test.tsx` (+4).

## Verification

- **Retested:** 2026-10-31, em navegador (Chromium, loja :8082 e painel :8083 locais, functions servidas) · **Report:** reports/2026-10-31-pedido-montado-reteste.md
- **Result:** 1440, só teclado, na mesma peça do QA ("Anel Afetivo Aliança com Coto Umbilical", 108 variações). 108 `radio`, um só com `tabIndex 0`; a partir do botão da peça, um Tab entra no grupo e o Tab seguinte sai para o campo seguinte (uma parada). ArrowDown/ArrowUp/ArrowRight/ArrowLeft movem 0→1→2→1→2→1; End vai à 108ª; ArrowDown na última volta à 1ª e ArrowUp na 1ª vai à última; Home volta à 1ª. Nenhuma seta escolheu (0 marcadas). Enter na 6ª escolheu "Prata 925 · Não · 14", a lista recolheu e o foco ficou na escolhida. "Trocar variação (108 opções)" reabre com a parada na escolhida. Achado novo, à parte: Enter em "Trocar variação" deixa o foco no `<body>` (BUG-20261031-trocar-variacao-solta-o-foco). A observação secundária (foco na lista de resultados depois de acrescentar a peça) continua, como a T32 declara.
