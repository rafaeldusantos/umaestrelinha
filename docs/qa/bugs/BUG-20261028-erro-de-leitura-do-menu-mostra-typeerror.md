# BUG-20261028-erro-de-leitura-do-menu-mostra-typeerror: sem internet, a faixa de erro do menu mostra "TypeError: Failed to fetch"

- **Status:** verified
- **Impact (user-side):** Cosmetic
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando o menu (390, rede ruim)
- **Journey Step:** J-montar-o-menu-da-loja, abrir a tela
- **Scenarios:** PNL-menu-falha-de-rede-ao-gravar
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

Abrindo `/admin/menu` sem rede, depois de ~7 s de esqueleto aparece a faixa "Não foi possível carregar o menu" com o
detalhe **"TypeError: Failed to fetch"** — mensagem técnica em inglês. Com 500 do servidor o detalhe é o português
("Não foi possível carregar o menu."). "Tentar de novo" funciona. O padrão de mostrar a mensagem crua do erro na faixa
é **anterior à 86** (a faixa de categorias do menu antigo já passava o erro cru); a superfície é nova.

## Reproduction

- **Charter:** CH-menu-gravacao-com-rede-ruim · **Tour:** Network Tour
- **Environment:** 390 × 844; GET de `store_settings` abortado como `internetdisconnected`

1. Abrir `/admin/menu` sem rede; esperar ~8 s.

**Expected:** "Sem conexão. Confira a internet e tente de novo." (ou o detalhe em português de sempre).
**Actual:** detalhe "TypeError: Failed to fetch".

## Evidence

- `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-06-leitura-falhou-390.png`; esqueleto durante a espera: `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-07-carregando-sem-rede-390.png`

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `useStoreMenu.ts`: `error` é sempre `STORE_MENU_LOAD_FAILURE` (nunca a mensagem crua do fetch ou do banco, nem a das categorias); `AdminMenuPage.tsx`: o detalhe da faixa é "Confira a internet e tente de novo." (o título já diz "Não foi possível carregar o menu"). As falhas de gravação já eram constantes; agora há caso provando que o erro cru não chega.
- **Teste que prova:** `useStoreMenu.test.ts` (leitura com `TypeError: Failed to fetch` ⇒ `STORE_MENU_LOAD_FAILURE`, vermelho antes; "o erro de gravação nunca chega cru"); `AdminMenuPage.test.tsx` ("Q08 — sem internet, a faixa NÃO mostra TypeError" e a faixa de `permission denied` reescrita).


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** Leitura em 500 (com `permission denied` no corpo) e sem rede: faixa "Não foi possível carregar o menu · Confira a internet e tente de novo. · Tentar de novo", sem `TypeError` nem texto do servidor; "Tentar de novo" com rede devolve o menu. Evidência `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-03-leitura-sem-rede.png`.
