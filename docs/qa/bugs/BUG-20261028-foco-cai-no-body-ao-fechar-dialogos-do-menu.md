# BUG-20261028-foco-cai-no-body-ao-fechar-dialogos-do-menu: ao fechar o seletor, o editor ou a confirmação (e depois de tirar ou remover), o foco vai para o topo da página

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Equipe com TalkBack (e quem usa teclado)
- **Journey Step:** J-montar-o-menu-da-loja, adicionar / editar / remover / tirar do submenu
- **Scenarios:** PNL-menu-teclado-foco-e-nomes; PNL-menu-remover-com-confirmacao
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`.** Só pelo teclado, a montagem é possível (Enter/Espaço/setas/Esc; Mover pelo ⋯ devolve o foco ao ⋯),
mas em cinco momentos o foco cai no `<body>` e o leitor volta ao início da página: Esc no seletor "Adicionar item ao
menu"; Esc no editor do item; Esc/Cancelar na confirmação "Remover … do menu?"; depois de confirmar a remoção; depois de
"Tirar “…” do submenu". Esperado: voltar ao botão que abriu (Adicionar item / ⋯) ou ao vizinho do que saiu.
Relacionados, sem bug próprio: o seletor abre com o foco na aba "Categoria", não na busca, e cada categoria é uma
parada de Tab (66) antes de "Adicionar".

## Reproduction

- **Charter:** CH-menu-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 1440 × 900, só teclado, Chromium

1. Focar "Adicionar item", Enter (foco vai a "Categoria"), Esc → ler `document.activeElement`.
2. Focar ⋯ de "Nomes", Enter, Enter (Editar), Esc → idem.
3. ⋯, End, Enter (Remover do menu), Esc → idem.

**Expected:** o foco volta ao gatilho.
**Actual:** `BODY` nos três (e em 390, depois de "Tirar" e de confirmar a remoção).

## Evidence

- Relatório, sessões 1 e 9 (registro de `activeElement` passo a passo).

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `AdminMenuPage.tsx`: um alvo de foco pendente (por `data-testid`, tentado a cada render e no `onCloseAutoFocus` dos três diálogos, que ganharam a prop; expira em 2 s). Seletor → "Adicionar item"/"Adicionar ao submenu" de quem abriu; editor → ⋯ do item (ou o lápis do filho); Cancelar/Esc da confirmação → ⋯; remoção confirmada → ⋯ do seguinte, do anterior, ou "Adicionar item ao menu" do vazio; tirar filho → "Tirar" do seguinte/anterior ou "Adicionar ao submenu".
- **Teste que prova:** `AdminMenuPage.test.tsx`, "Q07" (9 casos pela página real com `document.activeElement`, todos vermelhos antes — o foco caía no `<body>`).


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** 1440, teclado: Esc no seletor → "Adicionar item"; Esc no editor → ⋯ do item; Esc e Cancelar na confirmação → ⋯; remoção confirmada → ⋯ do seguinte (ou do anterior quando era o último), e ao remover o último item → "Adicionar item ao menu" do vazio; "Tirar" no submenu → "Tirar" do seguinte. O seletor ainda abre com o foco na aba "Categoria" (paper cut do r1, não era parte deste conserto).
