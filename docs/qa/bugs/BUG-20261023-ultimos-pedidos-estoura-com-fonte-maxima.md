# BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima: Com a fonte do celular no máximo, Últimos pedidos empurra a tela para o lado

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack (fonte do sistema no máximo)
- **Journey Step:** J-acompanhar-a-loja, step 5 (Últimos pedidos)
- **Scenarios:** MAD-inicio-com-leitor-de-tela
- **Found:** 2026-10-23 · **Report:** reports/2026-10-22-mobile-adm-inicio-reteste.md

## Summary

Com a letra do sistema a 175 % ou mais, numa tela de 360 px, a coluna da direita de uma linha de
"Últimos pedidos" (o total e o selo "Aguardando pagamento") fica mais larga que a linha, e a página
inteira passa a rolar para o lado (364 px a 175 %, 416 px a 200 %). Até 165 % não acontece. Achado no
reteste, depois de o conserto da faixa de cima tirar o estouro maior da frente; **não** é causado por
ele (devolver as duas grades ao `grid-cols-2` na página viva mantém os 416 px).

## Reproduction

- **Charter:** CH-inicio-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** Android emulado 360×800, pt-BR, fonte raiz a 175 % e 200 %

1. Ter, entre os 4 últimos pedidos, um com o selo "Aguardando pagamento" (um Pix pendente).
2. Abrir a Início e aumentar a letra do sistema ao máximo.

**Expected:** nada rola na horizontal (regra do repositório para o celular).
**Actual:** `documentElement.scrollWidth` 416 em 360; a coluna `flex shrink-0` de `RecentOrders.tsx`
mede 327 px numa linha de 295.

## Evidence

- evidence/2026-10-22-mobile-adm-inicio-reteste/R1-texto-200-ultimos-pedidos-360.png
- largura do documento por escala: 130 % 360 · 150 % 360 · 165 % 360 · 175 % 364 · 200 % 416

## Notes

A forma do conserto é decisão de desenho (o selo trunca? a coluna desce para baixo do nome?) — ver
*Decisions for a Human* no relatório de reteste.

## Fix

- **Decision:** opção 1 do relatório de reteste (a recomendada): com a fonte grande, a linha quebra.
- **Root cause:** a coluna do total e do selo era `shrink-0` e o nome `min-w-0`: a linha não tinha para
  onde ceder, e a coluna passava da largura.
- **Fix:** working tree, sem commit. `RecentOrders.tsx`: a linha é `flex flex-wrap gap-x-3 gap-y-1`; o
  nome tem piso em rem (`min-w-[min(100%,6rem)] flex-1`), que cresce com a fonte; a coluna da direita
  é `ml-auto min-w-0 max-w-full` (sem `shrink-0`). Na fonte padrão, nome e coluna lado a lado como o
  protótipo; quando a coluna não cabe ao lado do piso do nome, ela desce, à direita.
  `SituacaoDoPedido.tsx`: o rótulo deixou de ser `truncate`/`whitespace-nowrap` — a 165 %+ em 360 a
  pílula sozinha é mais larga que a linha, e o texto desce para uma segunda linha dentro dela em vez
  de virar "Aguardando pag…" (a informação que a linha existe para dar).
- **Regression test:** `apps/mobile-adm/src/widgets/recent-orders/__tests__/RecentOrders.test.tsx`,
  bloco "a linha quebra com a fonte grande" (4 casos por token exato + sensor da forma antiga): 3
  vermelhos antes do conserto, verdes depois; o do rótulo cortado entrou com o segundo passo. Mutantes
  reinjetados com SHA-256 conferido: `shrink-0` de volta, piso em px, sem `flex-wrap`, `truncate` de
  volta no selo — 4 mortos por asserção.

## Verification

- **Retested:** 2026-10-23, Equipe com TalkBack (fonte raiz emulada) e Adri no celular, build novo
  servido (`index-9_euSy7b.js`), 360×800 e 412×915 · **Report:**
  reports/2026-10-23-mobile-adm-inicio-reteste-2.md
- **Result:** pass. `documentElement.scrollWidth` = largura da tela a 100, 130, 175 e 200 % nos dois
  tamanhos (antes: 364 e 416 em 360). Nenhuma sobreposição nome × coluna ou total × selo; nenhum rótulo
  cortado. 100 %: lado a lado nos dois tamanhos; 130 %: quebra em 360 (e em 412 só nas duas linhas de
  selo longo); 175–200 %: quebra sempre, selo de duas linhas a 175 %+ em 360. Evidência:
  `evidence/2026-10-23-mobile-adm-inicio-reteste-2/ultimos-360-100.png`, `ultimos-360-200.png`,
  `inicio-360-200.png`.
