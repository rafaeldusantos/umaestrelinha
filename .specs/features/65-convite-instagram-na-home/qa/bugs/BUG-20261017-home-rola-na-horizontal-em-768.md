# BUG-20261017-home-rola-na-horizontal-em-768: num tablet em pé, a Home desliza para o lado

- **Status:** fixed
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Teresa
- **Journey Step:** J-conhecer-o-trabalho-no-instagram, step 1
- **Scenarios:** IG-convite-cartao-computador
- **Found:** 2026-10-17 · **Report:** .specs/features/65-convite-instagram-na-home/qa/reports/2026-10-17-65-convite-instagram-na-home.md

## Summary

Numa janela de 768px de largura (tablet em retrato, ou uma janela estreita no computador), a Home inteira desliza 34px para o lado quando a pessoa rola na horizontal. A página parece solta, o oposto do que o `CLAUDE.md` exige ("`body` nunca rola horizontalmente"). **O defeito é anterior à feature 65**: aparece com o convite fechado, e o convite não contribui para ele.

## Reproduction

- **Charter:** CH-computador-convite-teclado · **Tour:** Feature Tour
- **Environment:** 768×1024, Chromium (`agent-browser`), dev server `:8082`, Supabase local

1. Abrir `http://localhost:8082/` numa janela de 768px.
2. Rolar para o lado (trackpad, ou `window.scrollTo(200, 0)`).

**Expected:** a página não se move na horizontal; o que é largo rola dentro do próprio contêiner.
**Actual:** `document.documentElement.scrollWidth` = **802** numa janela de 768, e a página desloca `scrollX` = **34**. Os elementos que passam da borda são da faixa de departamentos (`flex h-full min-w-max items-center gap-9`, até `right` 918). O pai já tem `overflow-x-auto` e, mesmo assim, o documento estoura.

Controle: em 1440, `scrollWidth` = 1440 e `scrollX` = 0. Com o convite fechado, em 768, continua 802.

## Evidence

- Medida na sessão `qa65-teresa`, em 768: 75 elementos com `right` acima de 769, nenhum dentro do diálogo
- `.specs/features/65-convite-instagram-na-home/qa/evidence/2026-10-17-65-convite-instagram-na-home/CH-computador-convite-teclado-01-cartao-1440.png` (controle, em 1440)

## Fix

<!-- filled when status moves to fixed -->
- **Root cause:** **não era a faixa de departamentos.** Medido em 2026-10-18, procurando os elementos mais altos da árvore que passam da janela e o primeiro ancestral com `overflow-x` diferente de `visible`: a faixa, o carrossel do banner, a lista de categorias e as fileiras de produto estouram, mas cada um **dentro do próprio rolador** (`overflow-x: auto`), e por isso não contam para o documento. O único sem contenção é a grade das colunas de link do **rodapé** (`widgets/footer/ui/Footer.tsx:149`, `grid grid-cols-2 … md:flex md:gap-14`), terminando em exatamente **802**: a partir de `md` ela virava fila de quatro colunas ao lado da coluna da marca, com 3 × 56px de vão, e não cabia. O rodapé está em toda página, então a loja inteira rolava — a pendência que `apps/store/CLAUDE.md` já registrava na seção da página de perguntas frequentes.
- **Fix:** a fila de quatro colunas passou para `xl` (`xl:flex xl:gap-14`); até lá continua a grade 2×2 do celular. `lg` também caberia, mas em 1024 os rótulos curtos quebravam ("Em / destaque").
- **Fix commit:** (sem commit — aguarda o pedido do usuário)
- **Regression test:** `widgets/footer/ui/__tests__/Footer.test.tsx` › "as colunas de link não estouram a janela (BUG-20261017)", por token exato; com `md:flex md:gap-14` reinjetado, reprova por asserção.

## Verification

<!-- filled when status moves to verified -->
Prova em navegador (2026-10-18, Chromium, dev server `:8082`): `document.documentElement.scrollWidth` igual à largura da janela em **390, 768, 820, 1024, 1279, 1280 e 1440**, e nenhum elemento passando da janela fora de um rolador próprio. Rodapé conferido visualmente em 768 e 1024 (2×2) e em 1280 (fila). Status fica `fixed`, não `verified`: a verificação é do autor do conserto.
