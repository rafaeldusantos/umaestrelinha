# BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200: o @ do Instagram no rodapé da loja faz a página rolar de lado a 200 %

- **Status:** fixed parcialmente — o rodapé (o cabeçalho segue, ver Fix)
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Cliente com conta da loja (fonte do celular aumentada)
- **Journey Step:** J-ler-a-politica-de-privacidade (e toda página da loja: o rodapé é comum)
- **Scenarios:** LOJA-politica-hora-cheia
- **Found:** 2026-10-27 · **Report:** reports/2026-10-27-mobile-adm-loja-ao-vivo.md

## Summary

**Anterior à `83`** — achado na sessão da política. Com a fonte a 200 % em 390, o `@umaestrelinha.adri` do
rodapé (`font-display text-2xl`, sem quebra) vai até x = 461 numa tela de 390, e o `body` passa a rolar na
horizontal. Acontece igual em `/politica-de-trocas-e-devolucoes` (461). O ícone do menu do cabeçalho também
encosta em 403. A 100 % não acontece (390/390).

## Reproduction

- **Tour:** Feature · **Environment:** Chromium 390×844, `vite` da loja (worktree) contra o banco local, `html { font-size: 200% }`

1. Abrir a loja, rolar até o rodapé e tocar "Política de privacidade".
2. Aumentar a fonte para 200 %.
3. Medir `document.documentElement.scrollWidth`.

**Expected:** `scrollWidth` = 390; o @ quebra ou encolhe dentro da largura.
**Actual:** `scrollWidth` = 461; o elemento que passa da borda é o `SPAN.font-display.text-2xl.font-bold` dentro de `A` no `FOOTER`.

## Evidence

- Playwright: `"461 @umaestrelinha.adri <- SPAN.font-display.text-2xl.font-bold < A.flex.flex-col.items-center < FOOTER.mt-16"`; captura do topo em `/private/tmp/claude-503/f83/qa-politica-390-200.png`.
- Arquivo provável: `apps/store/src/widgets/footer/ui/InstagramStrip.tsx` (ou `Footer.tsx`).

## Fix (2026-10-27)

`InstagramStrip.tsx`: o arroba ganhou `max-w-full` e `[overflow-wrap:anywhere]`, e quebra dentro da faixa. Medido em
Chromium 390×844 no `vite` da loja: a 200 % o arroba vai de x = 48 a 342 (antes, até 461); a 100 % nada muda. Um caso
de token exato em `Footer.test.tsx` (vermelho antes) e três mutantes mortos por asserção.

**O `scrollWidth` a 200 % NÃO volta a 390**: depois do conserto ele mede 434, e quem passa da borda é o
**cabeçalho** — o grupo de ícones à direita vai até 426 (o botão do menu, 354–426, mais o alvo de 44 px). O logo
(202 px, `shrink-0`) e o recuo do `container` (2rem) crescem com a fonte. Consertar pede decidir o que encolhe
(logo, recuo ou ícones) e mexe no chrome de toda página; ficou como achado à parte.

## Reteste (2026-10-27)

`vite` da loja servido do worktree (`49f8bbb5`), `/politica-de-privacidade` e `/politicas-de-trocas-e-devolucoes`,
390 e 1440 a 100/130/200 %: nenhum elemento do rodapé passa da borda em nenhuma combinação; a 390/200 % o arroba
fica entre x = 48 e 342. O `scrollWidth` a 390/200 % segue **434**, pelo grupo de ícones do cabeçalho (até 426).
O status continua "fixed parcialmente" até a decisão sobre o cabeçalho. Relatório:
`reports/2026-10-27-mobile-adm-loja-ao-vivo-reteste.md`.
