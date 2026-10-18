# BUG-20261017-loja-em-branco-sem-armazenamento: quem bloqueia os dados do site vê a loja inteira em branco

- **Status:** fixed
- **Impact (user-side):** Blocks-Completion
- **Severity:** High · **Priority:** P1 <!-- Critical/P0 reduzido: atinge só quem bloqueia o armazenamento do site; a jornada em si não é o defeito -->
- **Persona Affected:** Luciana
- **Journey Step:** J-conhecer-o-trabalho-no-instagram, step 1
- **Scenarios:** IG-convite-sem-armazenamento
- **Found:** 2026-10-17 · **Report:** .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md

## Summary

Quem abre a loja num navegador que bloqueia o armazenamento do site (Web Storage inacessível, como no bloqueio de dados de sites do Chrome) não vê nada: a página fica em branco, sem header, sem Home e sem nenhuma mensagem. A pessoa não tem o que fazer além de ir embora. **O defeito é anterior à feature 65**: ele está no rastreio de carrinho abandonado, que a feature não tocou. O convite não é a causa.

## Reproduction

- **Charter:** CH-celular-convite-interrompido · **Tour:** Interrupt Tour
- **Environment:** 390×844, Chromium (`agent-browser`), dev server `:8082`, Supabase local. Bloqueio simulado por init script que faz `Storage.prototype.getItem/setItem/removeItem/key/clear` lançarem `SecurityError` antes de qualquer script da página.

1. Abrir `http://localhost:8082/` com o armazenamento do site bloqueado.
2. Esperar 3 s.

**Expected:** a Home carrega; cookies, carrinho e convite caem em memória, como os donos com `try/catch` já fazem (`cookieConsentStore`, `inviteSeen`).
**Actual:** `#root` fica vazio (`innerHTML.length` 0). O console mostra `The above error occurred in the <AbandonedCartTracker> component`, sem error boundary acima.

Par de controle: com **só a escrita** falhando (`setItem` lançando `QuotaExceededError`), a loja renderiza normalmente e o convite se comporta como especificado. O que derruba a loja é a **leitura**.

## Evidence

- Console da sessão `qa65-sem-storage`: o erro em `AbandonedCartTracker` (`features/abandoned-cart/ui/AbandonedCartTracker.tsx:27`), duas vezes, e `#root` vazio
- Leitura independente: o mesmo carregamento com só a escrita bloqueada renderiza 121 KB de `#root`

## Fix

<!-- filled when status moves to fixed -->
- **Root cause:** `apps/store/src/features/abandoned-cart/model/useAbandonedCartTracker.ts:45-46` lê `sessionStorage.getItem(...)` durante a renderização, sem `try/catch`. Com o Web Storage inacessível, a leitura lança, o componente explode e, sem error boundary, desmonta a árvore inteira. Os sintomas (página em branco) e a causa (leitura sem guarda num hook montado no `App`) são distintos.
- **Segunda causa, achada no conserto:** `widgets/whatsapp-float/ui/WhatsAppFloat.tsx` também lia o `localStorage` sem guarda, dentro de um efeito — e no React 18 erro em efeito derruba a árvore do mesmo jeito. Ele seria o próximo crash assim que o primeiro saísse. `setGuestEmail`/`clearGuestEmail` (mesmo arquivo do tracker) gravavam sem guarda no checkout.
- **Fix:** leitura e escrita do tracker passam por `lerSessao`/`escreverSessao` (com `try/catch`); a leitura da bolha ganhou `try/catch` e, sem armazenamento, ela se comporta como primeira visita. Nenhuma outra leitura direta de Web Storage sem guarda sobrou em `apps/store/src` (varredura de 2026-10-18: `recentSearches`, `authAnalytics`, `cookieConsentStore` e `inviteSeen` já tinham guarda; `checkoutStore` usa `createJSONStorage`, que já a tem).
- **Fix commit:** (sem commit — aguarda o pedido do usuário)
- **Regression test:** `features/abandoned-cart/model/__tests__/useAbandonedCartTracker.test.tsx` › "sem armazenamento (BUG-20261017)" (2 casos) e `widgets/whatsapp-float/ui/__tests__/WhatsAppFloat.test.tsx` › "sem armazenamento (BUG-20261017)". Os dois casos de montagem foram provados por mutante: com a leitura sem guarda reinjetada, reprovam por asserção.

## Verification

<!-- filled when status moves to verified -->
Prova em navegador (2026-10-18, Chromium 390×844, dev server `:8082`), nos DOIS modos de bloqueio: os métodos de `Storage.prototype` lançando (o modo desta QA) **e** o acesso a `window.localStorage`/`window.sessionStorage` lançando (o modo real do bloqueio de dados do Chrome). Nos dois: `#root` com 121.528 caracteres, convite abrindo depois do aviso de cookies, zero `pageerror`. Status fica `fixed`, não `verified`: a verificação é do autor do conserto.
