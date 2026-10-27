# BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo: recarregar a Loja ao vivo volta ao período que veio da Início

- **Status:** open
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P4
- **Persona Affected:** Adri no celular
- **Journey Step:** J-ver-a-loja-ao-vivo, passo "troco o período e a tela recarrega" (F5, ou o Chrome do Android recarregando a aba depois de um tempo em segundo plano)
- **Scenarios:** MAD-aovivo-voltar-mantem-periodo
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-mobile-adm-loja-ao-vivo.md

## Summary

O período inicial de `/ao-vivo` vem do `history.state` gravado pela Início (`{ doApp, periodo }`). Trocar de
período **dentro** da Loja ao vivo não atualiza essa entrada, então um recarregamento devolve o período com
que ela chegou, não o que ela estava olhando. O cenário diz "F5 em /ao-vivo mantém o período"; com o período
trocado na própria tela, ele não mantém.

## Reproduction

- **Tour:** Back-Button · **Environment:** Chromium 390×844, build servido contra o banco local

1. Na Início, escolher **Semana** e tocar o cartão "Visitas hoje" (a Loja ao vivo abre em Semana).
2. Tocar **Ontem** na Loja ao vivo.
3. Recarregar a página (F5).

**Expected:** a Loja ao vivo reabre em **Ontem** (o que ela estava vendo), sem pôr o período na URL.
**Actual:** reabre em **Semana**. Voltar devolve a Início em Semana (isso está certo).

## Evidence

- Playwright: `{"trocou_f5":"Semana","trocou_volta":"Semana"}`.
- Arquivo provável: `apps/mobile-adm/src/pages/AoVivoPage.tsx` (`useState(() => periodoDaEntrada(state))`, só na montagem) e `apps/mobile-adm/src/widgets/store-access/ui/SecaoAcessos.tsx` (a troca de período não grava na entrada, ao contrário da Início, que usa `history.replaceState`).
- Pode ser decisão de produto (a spec só garante o período "ao chegar do Início"); ver *Decisions for a Human* no relatório.
