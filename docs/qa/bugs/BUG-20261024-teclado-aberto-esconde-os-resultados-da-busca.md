# BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca: com o teclado aberto e a fonte grande, nenhuma cliente aparece acima da barra de abas

- **Status:** partially fixed (retestado 2026-10-24, rodada 3: 100 % e 130 % passam; a 200 % a 1ª linha mostra 115 de 566 px, a linha é mais alta que a tela; regressão nova ao lado: BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco)
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P3
- **Persona Affected:** Adri no celular (fonte do sistema a 130 % ou mais)
- **Journey Step:** J-achar-uma-cliente, digita na busca de /clientes
- **Scenarios:** MAD-clientes-teclado-e-voltar-do-android
- **Found:** 2026-10-24 · **Report:** `docs/qa/reports/2026-10-24-mobile-adm-clientes.md`

## Summary

Com o teclado virtual aberto (viewport 390×508, o que sobra de 844 com um teclado de 336 px) a barra de
abas continua fixa embaixo. A 100 % a primeira linha aparece só em parte (107 px visíveis); a 130 % e a
200 % a primeira linha começa **abaixo** do topo da barra de abas, então a Adri digita e vê só o campo, os
chips e a contagem ("5 clientes ..."), sem nenhum resultado até rolar. `MAC-34` pede campo **e linhas**
visíveis.

## Reproduction

- **Charter:** CH-clientes-com-fonte-grande · **Tour:** Feature Tour
- **Environment:** 390×844 mobile emulado, build servido (`index-DjYbbA3P.js`), Supabase local, teclado emulado por `setViewportSize(390×508)`

1. Entrar, abrir /clientes, fonte do sistema a 130 % (ou 200 %).
2. Tocar na busca, reduzir a viewport para 508 de altura (teclado), digitar `p76`.
3. Olhar o que está acima da barra de abas.

**Expected:** pelo menos a primeira linha de resultado inteira acima da barra.
**Actual:** 100 %: linha em y 337..471, barra a partir de 444. 130 %: linha em 437, barra em 425 (linha escondida). 200 %: linha em 713, barra em 380.

## Evidence

- `docs/qa/evidence/2026-10-24-clientes/390-teclado-busca.png` (130 %)

## Fix

Não aplicado: é decisão de desenho (ver Decisions for a Human no relatório). Opções: esconder a barra de abas
enquanto o campo de busca tem foco; ou compactar o bloco acima da lista (chips + contagem) com teclado aberto.
Teste de regressão a escrever: em jsdom não mede layout, então o guarda é de fonte (a barra some com foco na busca) mais prova em navegador.

## Fix applied (2026-10-24, task B06)

`useBuscaEmFoco` (`shared/lib`): com o foco num campo de texto dentro de `role="search"`, o `MobileLayout` tira a barra de abas de cena (a reserva dela no fim da página fica). Vale também para a busca de Pedidos. Testes: `clientesPage.test.tsx` e `useBuscaEmFoco.test.tsx`. **Falta a prova em navegador a 130 %/200 % e o Android real.** Ressalva: no Android, o voltar fecha o teclado sem tirar o foco do campo; a barra só volta ao tocar fora ou no Enter.

## Re-found

2026-10-24, rodada 2 (`reports/2026-10-24-mobile-adm-clientes-reteste-1.md`), 390×508 (teclado), digitando `p76`, build do worktree:

| Fonte | Barra de abas | 1ª linha (top–bottom, viewport 508) |
|---|---|---|
| 100 % | fora (corrigido) | 337–471, inteira à vista |
| 130 % | fora (corrigido) | 438–642: só 70 px dos 204 aparecem |
| 200 % | fora (corrigido) | 713–1279: nenhum pixel à vista; campo em 256–352, chips em 384–472, contagem em 576–696 |

A causa que sobra é o bloco acima da lista (campo, chips e contagem) ocupar a tela inteira a 200 %. Enter e
tocar fora devolvem a barra nas três fontes; o chip em foco não a esconde. Opção para decisão humana: com a
busca em foco e fonte grande, compactar chips e contagem (ou rolar o campo ao topo da área visível). Evidência:
`docs/qa/evidence/2026-10-24-mobile-adm-clientes-reteste-1/B06-teclado-busca-p76-{100,130,200}.png`.

## Retest (2026-10-24, rodada 3, `reports/2026-10-24-mobile-adm-clientes-reteste-2.md`)

390×508 (teclado), busca `p76`, toque: a barra de abas fora e o campo no topo (`scrollIntoView`). 1ª linha: 100 % em 177–311 (134 de 134 px à vista), 130 % em 230–434 (204 de 204), 200 % em 393–959 (115 de 566 px: o nome e o começo do texto, a linha é maior que a viewport de 508 px). Sobra, a 200 %, só a altura da própria linha; recomendação: aceitar. O conserto trouxe a regressão do primeiro toque (bug citado no Status). Evidência: `evidence/2026-10-24-mobile-adm-clientes-reteste-2/B13-teclado-busca-p76-{100,130,200}.png`.
