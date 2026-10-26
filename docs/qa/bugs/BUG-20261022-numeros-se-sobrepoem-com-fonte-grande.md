# BUG-20261022-numeros-se-sobrepoem-com-fonte-grande: Com a fonte do celular maior, o faturamento é pintado por cima das vendas

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** High · **Priority:** P1
- **Persona Affected:** Equipe com TalkBack (fonte do sistema aumentada); Adri no celular com letra grande
- **Journey Step:** J-acompanhar-a-loja, step 1
- **Scenarios:** MAD-inicio-com-leitor-de-tela; MAD-inicio-numeros-grandes
- **Found:** 2026-10-22 · **Report:** reports/2026-10-22-mobile-adm-inicio.md

## Summary

Com a letra do celular aumentada (130 % ou mais), os dois números da esquerda da faixa escura passam
por cima dos da direita: "R$ 99.999" e o "10" das vendas viram "R$ 99.1099", e o ticket encobre as
visitas. O mesmo acontece no card "Fat. de outubro", que encobre "Clientes novas". É um número de
dinheiro lido errado, na primeira tela do app.

## Reproduction

- **Charter:** CH-inicio-com-leitor-de-tela · **Tour:** Feature Tour
- **Environment:** Android emulado 360×800, toque, pt-BR; fonte raiz a 130 %, 150 % e 200 % (o
  equivalente em CSS da "Tamanho da fonte" do Android; a página com zoom de 150 % dá o mesmo efeito,
  porque a largura útil cai para 240 px)

1. Entrar e abrir a Início num dia com faturamento de cinco dígitos (fixtura de 10 vendas de R$ 9.999,90).
2. Aumentar o tamanho da letra.

**Expected:** cada número inteiro, legível, no seu lugar; os cards podem empilhar.
**Actual:** a 130 % o faturamento passa 17 px da sua coluna (o vão é de 16 px), a 150 % 47 px, a 200 %
123 px — por cima do número vizinho.

## Evidence

- evidence/2026-10-22-mobile-adm-inicio/CH-leitor-01-texto-200-360.png ("R$ 99.1099")
- evidence/2026-10-22-mobile-adm-inicio/CH-leitor-02-texto-150-360-pagina.png (hero e o card do mês)
- medida por estouro de cada célula a 115/130/150/175/200 %: ok / +17 / +47 / +85 / +123 px

## Fix

- **Root cause:** as duas grades usavam `grid-cols-2` (`repeat(2, minmax(0, 1fr))`): duas trilhas que
  só dependem da largura em px, enquanto o número é `whitespace-nowrap` e cresce com a fonte. A trilha
  encolhe abaixo do conteúdo (de propósito, `MAI-28`) e o texto transborda por cima da vizinha.
- **Fix:** working tree, sem commit (pedido do usuário). `MovementHero.tsx` e `MonthCards.tsx` passam a
  `grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]` (e `8.75rem` nos cards do mês): o piso é
  em `rem`, cresce com a fonte, e a grade cai para uma coluna antes de o número não caber. Com a fonte
  padrão em 360 e 412 continuam duas colunas, como no protótipo.
- **Regression test:** `apps/mobile-adm/src/widgets/movement-hero/__tests__/MovementHero.test.tsx`
  ("os quatro números caem para uma coluna quando a fonte cresce…", novo) e
  `apps/mobile-adm/src/widgets/month-cards/__tests__/MonthCards.test.tsx` (a régua de `MAI-28`
  reescrita, com sensor da forma antiga). Vermelhos antes, verdes depois; 3 mutantes reinjetados
  (`grid-cols-2` de volta nos dois, e o piso em px no lugar de rem), SHA-256 conferido na restauração:
  3 mortos por asserção.

## Verification

- **Retested:** 2026-10-23, Equipe com TalkBack e Adri no celular, build novo servido (`index-BITPjDQV.css`, service worker bloqueado no contexto) · **Report:** reports/2026-10-22-mobile-adm-inicio-reteste.md
- **Result:** em 360 e 412, a 100 % duas colunas (como o protótipo) e nenhum estouro; de 115 % (360) ou 130 % (412) a 200 %, uma coluna e estouro 0 nos quatro números e nos dois cards do mês. As jornadas vizinhas (abrir, trocar período, Precisa de você, pedido novo ao vivo) passaram de novo.
