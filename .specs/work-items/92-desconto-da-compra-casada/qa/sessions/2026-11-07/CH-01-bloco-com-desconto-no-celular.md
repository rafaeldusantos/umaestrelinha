# Sessão CH-01 · O bloco diz quanto cada peça custa levando junto, no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-bloco-com-desconto-no-celular.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima                                         |
| Tour · modo | Feature · com tour (rodada de confirmação: só TC-FUNC-006 / BUG-013 e o entorno) |
| Rodada      | confirmação                                                            |
| Orçamento   | 10 ações de browser de 25                                              |
| Ambiente    | http://localhost:8082 (worktree feature/92) · build não exposto · Chromium headless (Playwright MCP) · viewports 390×844 · 320×568 · 1440×900 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota; massa sintética QA (a lista "QA Correntes" agora oferece 3 modelos); fonte do sistema simulada por `font-size` no `<html>` (130 % e 200 %) |

## Missão

Confirmar que quem chega ao pingente pelo celular entende, no próprio bloco, quanto cada peça custa levando junto e
quanto o conjunto vai custar, e que esse número é o mesmo que a barra fixa e a sacola mostram.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir `/produtos/qa-pingente-estrela` em 390×844, anônima, sacola vazia | Bloco com "QA Correntes" `de R$ 89,90 por R$ 80,91` + "10% a menos levando junto" e "Ver os 3 modelos"; Berloque `de R$ 69,90 por R$ 59,42` + "15% a menos"; Medalha `R$ 149,90` — igual à rodada 1 | — |
| 02 | Tocar "Ver os 3 modelos" | "Escolha a peça · 3 modelos" agora é uma **faixa** (`radiogroup` com `display:flex`, `overflow-x:auto`, `scroll-snap-type: x mandatory`; cartões de 132px `snap-start`), `scrollWidth` 416 > `clientWidth` 270; `body` 390 (sem rolagem lateral). Cada cartão com o de/por: Veneziana `de R$ 89,90 por R$ 80,91`, Cartier `de R$ 119,90 por R$ 107,91`, "Veneziana Banhada a Ouro Dezoito Quilates Comprida" `de R$ 129,90 por R$ 116,91`; nenhum com a frase "N% a menos" | `screenshots/CH-01-r2-01-faixa-inicio-390.png` |
| 03 | Rolar a faixa até o fim e tocar a última peça | `scrollLeft` 146 (fim); a última peça inteira dentro da faixa (x 223–355, faixa 87–357), `aria-checked=true`; `body` segue 390. Linha do adicional: "QA Correntes · QA Corrente Veneziana Banhada a Ouro Dezoito Quilates Comprida · de R$ 129,90 por R$ 116,91 · 10% a menos levando junto"; abre "Comprimento" (70/80 cm) | `screenshots/CH-01-r2-02-faixa-fim-390.png` |
| 04 | Escolher 70 cm e marcar a lista | "Desconto do Compre Junto −R$ 12,99", "Total do conjunto R$ 376,81", "R$ 350,43 no Pix", nota com "O desconto vale enquanto a joia estiver no mesmo pedido." (259,90 + 116,91; 376,81 × 0,93) | — |
| 05 | Fonte 130 % e 200 % em 390 | 130 %: `body` 390, faixa 251px com rolagem interna, nada do bloco passa da tela. 200 %: `body` 435 — o mesmo estouro pré-existente da rodada 1 (galeria e "Compartilhar"); dentro do bloco 0 elementos além da largura, cartões de 132×380 rolando dentro da faixa | `screenshots/CH-01-r2-03-faixa-fonte200-390.png` |
| 06 | 320×568 e 1440×900 | 320: `body` 320, faixa 200px com rolagem interna, bloco sem estouro. 1440: faixa 516px, os 3 cartões cabem sem rolar (`scrollWidth` = `clientWidth`), `body` 1440 | `screenshots/CH-01-r2-04-faixa-320.png` · `screenshots/CH-01-r2-05-faixa-1440.png` |
| 07 | Entorno: marcar o Berloque, Folheado a ouro, rolar até a barra fixa | Berloque `de R$ 74,90 por R$ 63,67` (acompanha a variação); "Desconto do Compre Junto −R$ 24,22", total R$ 440,48, R$ 409,65 no Pix — os mesmos números da rodada 1 com a última corrente (R$ 116,91); barra fixa "R$ 440,48 · Conjunto · 3 peças · Levar o conjunto" | `screenshots/CH-01-r2-06-barra-fixa-390.png` |

**Edge cases tentados:** nada novo (rodada de confirmação). Remedidos só 320×568 e fonte 130/200 % no entorno da faixa.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-FUNC-006 | pass | 01–03, 05–07 | `screenshots/CH-01-r2-01-faixa-inicio-390.png` · `CH-01-r2-02-faixa-fim-390.png` · `CH-01-r2-04-faixa-320.png` | passo 3: faixa que rola dentro do bloco, sem rolar o `body`, de/por em cada cartão sem a frase; passo 4: a última peça alcançada e escolhida, a linha com de/por e "10% a menos". Passos 1–2 conferidos pelo Berloque (a corrente avulsa da massa M-01 aparece como lista; o de/por acompanha a variação). BUG-013 corrigido |

Contagem: pass 1 · fail 0 · blocked 0 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Arrastar a faixa na vertical com o dedo (a página rola, a faixa não prende) — o Chromium headless sem emulação de toque não reproduz o gesto; a rolagem da faixa foi feita por programa
- Ida à sacola e ao checkout com a última corrente da lista — fora do entorno da correção (a sacola é do CH-02); totais do bloco e da barra conferidos
- Os demais TC do charter (TC-SMOKE-001, TC-FUNC-007..011, TC-UI-001) passaram na rodada 1 e não foram reexecutados; o entorno remedido (totais, barra, 320, fonte) não regrediu

## Debrief

- **Surpresas:** a massa ganhou um terceiro modelo de nome longo ("Veneziana Banhada a Ouro Dezoito Quilates Comprida"), que é o que faz a faixa precisar rolar em 390 — e ele cabe no cartão de 132px
- **Próximo charter:** o arrasto vertical sobre a faixa num celular real (toque), se alguém quiser fechar o edge case
- **Padrão novo:** nada
