# BUG-20261026-codigo-colado-leva-caractere-invisivel: O código colado do WhatsApp leva um caractere invisível para o pedido, o link dos Correios e a cópia

- **Status:** verified (retestado em navegador no build refeito, 2026-10-26 — reports/2026-10-26-mobile-adm-envelope-da-cliente.md)
- **Impact (user-side):** Trust-Damage
- **Severity:** High · **Priority:** P1
- **Persona Affected:** Adri no celular
- **Journey Step:** J-registrar-envelope-da-cliente, passo 3 (cola o código e salva)
- **Scenarios:** MAD-envelope-colar-do-whatsapp
- **Found:** 2026-10-26 · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md

## Summary

A Adri cola o código que a cliente mandou. Na tela ele parece perfeito ("AN123456789BR"), mas se o texto
copiado trazia um espaço de largura zero (U+200B) ou as marcas de direção que o WhatsApp põe em volta de
números (U+202A/U+202C), elas ficavam: no banco (14–15 caracteres), no link "Ver nos Correios"
(`…objetos=AN123456789BR%E2%80%8B`, que os Correios não acham) e no que "Copiar código" põe na área de
transferência. Nada na tela denuncia. Vale também para o rastreio de saída (a mesma `normalizeTrackingCode`).

## Reproduction

- **Charter:** CH-envelope-registrar-o-codigo-da-cliente · **Tour:** Paste Tour
- **Environment:** build servido (`vite preview`, :4482), Supabase local, 390×844, toque

1. Pedido P82-A (aguardando, sem código) → "Informar código do envelope".
2. Colar `AN123456789BR​` (ou `‪AN123456789BR‬`) no campo. Salvar.
3. Ler o cartão, o `href` de "Ver nos Correios" e o que "Copiar código" copia.

**Expected:** `AN123456789BR` nos três.
**Actual:** o mesmo texto com o invisível; `length` 14/15; link com `%E2%80%8B`.

## Evidence

- evidence/2026-10-26-mobile-adm-envelope-da-cliente/s2-codigo-invisivel.png
- banco: `length(material_tracking_code) = 14` antes do conserto

## Fix

- **Root cause:** `normalizeTrackingCode` (`packages/core/src/orders/tracking.ts`) tirava só `\s`; os caracteres de formatação Unicode (`\p{Cf}`) não são espaço.
- **Fix commit:** sem commit (pedido do usuário). `code.replace(/[\s\p{Cf}]+/gu, '')`.
- **Regression test:** `packages/core/src/orders/__tests__/tracking.test.ts` (+5: largura zero, direção, LRM/RLM/BOM, junção e hífen suave, e o código só de invisíveis continuar recusado) e `apps/mobile-adm/src/features/order-actions/ui/__tests__/FolhaDoEnvelope.test.tsx` (+1: o colado chega limpo ao campo e à porta). Os 6 reprovavam antes; o do app foi reprovado de novo com o conserto revertido (SHA-256 conferido na restauração).

## Verification

- **Retested:** 2026-10-26, Adri no celular, build refeito · **Report:** reports/2026-10-26-mobile-adm-envelope-da-cliente.md
- **Result:** os mesmos colados ⇒ campo `AN123456789BR` (13), gravado com 13, link sem `%E2`. Vizinhos: o rastreio de saída (folha da Entrega) normaliza igual; espaços, NBSP e quebra de linha continuam limpos; hífen continua passando (decisão em BUG-20261026-codigo-com-hifen-ou-espaco-gravado).

## Reteste de vizinhança (2026-10-27) — passou

Com a normalização do envelope ampliada (T19), colar `AN123456789BR` + espaço de largura zero (P82-G) e com marcas de direção (P82-B) no app, e com espaço de largura zero no painel, grava `AN123456789BR` (13 bytes). Ver `BUG-20261026-codigo-com-hifen-ou-espaco-gravado.md`.
