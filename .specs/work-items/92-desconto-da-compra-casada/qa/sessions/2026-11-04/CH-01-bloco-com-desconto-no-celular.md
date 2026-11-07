# Sessão CH-01 · O bloco diz quanto cada peça custa levando junto, no celular

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-01-bloco-com-desconto-no-celular.md` · exploratório · P0 |
| Status      | done                                                                   |
| Persona     | PER-01 Marina · conta: anonima                                         |
| Tour · modo | Feature · com tour                                                     |
| Rodada      | exploração                                                             |
| Orçamento   | 44 ações de browser de 50                                              |
| Ambiente    | http://localhost:8082 (worktree do WI 92) · build não exposto · Chromium headless (Playwright MCP) · viewports 390×844 · 320×568 · 844×390 · 768×1024 · 1024×768 · 1440×900 |
| Paridade    | Supabase local; `*.supabase.co` e `/g/collect` bloqueados por rota (imagens hospedadas da Home não carregam — sem efeito no bloco); massa sintética QA da thread; fonte do sistema simulada por `font-size` no `<html>` (130 % e 200 %) |

## Missão

Confirmar que quem chega ao pingente pelo celular entende, no próprio bloco, quanto cada peça custa levando junto e
quanto o conjunto vai custar, e que esse número é o mesmo que a barra fixa e a sacola mostram.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir `/produtos/qa-pingente-estrela` em 390×844, Prata 925 / Não | Bloco "Compre junto" com 3 adicionais: "QA Correntes" `de R$ 89,90 por R$ 80,91` + "10% a menos levando junto"; "QA Berloque Coração" `de R$ 69,90 por R$ 59,42` + "15% a menos levando junto"; "QA Medalha Afetiva" só `R$ 149,90`. Cabeçalho sem a frase "Levando junto, algumas saem com desconto." Pingente R$ 259,90 / R$ 241,71 no Pix | — (ver 06) |
| 02 | Marcar o Berloque | Marcado, abre "Cor" sem escolha; total segue R$ 259,90 sem linha de desconto até escolher a cor (comportamento do WI-01) | — |
| 03 | Escolher Prata 925, depois Folheado a ouro | Prata: "Desconto do Compre Junto −R$ 10,48", total R$ 319,32, R$ 296,97 no Pix, nota com " O desconto vale enquanto a joia estiver no mesmo pedido." Folheado: `de R$ 74,90 por R$ 63,67`, desconto −R$ 11,23, total R$ 323,57, Pix R$ 300,92 — o de/por acompanha a variação; contas conferem (arred. meio-para-cima) | — |
| 04 | Abrir "Ver os 2 modelos" da lista "QA Correntes" | Escolha em **grade de 2 colunas** (`display:grid`, colunas 131px 131px, `overflow-x: visible`, 3 colunas a partir de `sm`) — não uma faixa que rola dentro dela. Cada cartão com o de/por (Veneziana `de R$ 89,90 por R$ 80,91`, Cartier `de R$ 119,90 por R$ 107,91`), sem a frase "N% a menos". Só 2 modelos (Esgotada some; Berloque não entra na lista — já registrado em CH-05 #1) | `screenshots/CH-01-04-lista-grade-390.png` |
| 05 | Escolher a Cartier (última peça), marcar a lista, escolher 60 cm | Linha do adicional "QA Corrente Cartier · 60 cm · Não" com `de R$ 129,90 por R$ 116,91` e "10% a menos levando junto" | — |
| 06 | Ler o bloco com Cartier 60 + Berloque Folheado marcados | "Desconto do Compre Junto −R$ 24,22" acima de "Total do conjunto R$ 440,48", "R$ 409,65 no Pix" (259,90+116,91+63,67; 12,99+11,23; 440,48×0,93) | `screenshots/CH-01-06-conjunto-marcado-390.png` |
| 07 | Rolar até o bloco sair da tela | Barra fixa: "R$ 440,48 · Conjunto · 3 peças · Levar o conjunto" (89px de altura, rodapé) | `screenshots/CH-01-07-barra-fixa-390.png` |
| 08 | Fonte a 100 %, 130 %, 200 % | `scrollWidth` 390 / 390 / 435. Dentro do bloco nada passa de 390 em nenhum nível; "N% a menos levando junto" em 1 linha (100/130) e 2 linhas (200), sem sobreposição; a 200 % o que estoura a página são as miniaturas da galeria ("Ver imagem 4 de 4") e a fileira "Compartilhar" — fora do bloco | `screenshots/CH-01-08-bloco-fonte200-390.png` |
| 09 | Desmarcar as duas com desconto e marcar só a Medalha (Prata) | Total R$ 409,80, R$ 381,11 no Pix, **sem** linha de desconto e nota **sem** a frase do desconto | — |
| 10 | Remarcar Cartier 60 + Berloque Folheado e tocar "Levar o conjunto" | Gaveta "Sua sacola": Cartier `R$ 129,90 → R$ 116,91` "Acompanha o QA Pingente Estrela · 10% a menos", Berloque `R$ 74,90 → R$ 63,67` "· 15% a menos"; Subtotal (3 itens) R$ 464,70; "Desconto do Compre Junto −R$ 24,22"; **Total R$ 440,48** = bloco. A gaveta não mostra valor no Pix; aviso de promoção progressiva "Falta 1 para cada peça sair a R$ 90,93" (Cartier, massa da thread) | `screenshots/CH-01-10-gaveta-sacola-390.png` |
| 11 | Ir ao checkout (`/carrinho` redireciona à Home; a sacola é a gaveta) | Botão "Pagar R$ 409,65 com PIX" = Pix do bloco; oferta "Leva junto com 20% de desconto? QA Corrente Veneziana R$ 71,92" | `screenshots/CH-01-11-checkout-pix-390.png` |
| 12 | Voltar duas vezes até o produto | Bloco volta com nada marcado e sem linha de total (estado não persiste; WI-01) | — |
| 13 | 320×568, abrir a lista e marcar | `scrollWidth` 320; cartões de 96px com o de/por em 2 linhas, sem corte; linha do adicional `de/por` + "10% a menos" sem sobrepor. Grade de 2 colunas reproduz (2 de 2) | `screenshots/CH-01-13-bloco-320.png` |
| 14 | 1440×900, escolher Veneziana | Grade de 3 colunas (166px cada), sem faixa. Antes do comprimento: nota "A joia e 1 peça marcada · R$ 259,90" (peça marcada ainda sem variação completa) | `screenshots/CH-01-14-bloco-1440.png` |
| 15 | Escolher 45 cm | Nota do computador "A joia e 1 peça marcada · R$ 345,31"; bloco "Desconto do Compre Junto −R$ 9,49", total R$ 345,31, R$ 321,14 no Pix (94,90 → 85,41) | `screenshots/CH-01-15-nota-1440.png` |
| 16 | Girar: 844×390 | `scrollWidth` 943: coluna de informação do produto com 180px a partir de x=648; os preços "por" do bloco terminam em x 858/861 (fora da tela), cartões da lista com 25px. **Reproduz igual em produto sem Compre Junto** (`QA Joia Sem Compre Junto`, `scrollWidth` 950, coluna 180px) ⇒ layout da página anterior ao WI | `screenshots/CH-01-16-paisagem-844.png` |
| 17 | 768×1024 e 1024×768 | 768: `scrollWidth` 943, bloco com 104px de largura; 1024: sem rolagem lateral, bloco 360px | `screenshots/CH-01-17-bloco-768.png` |
| 18 | Recarregar com o Berloque (Prata) marcado | Antes: total R$ 319,32. Depois: nada marcado, sem linha de total — nenhum desconto fantasma | — |

**Edge cases tentados:** 320×568 (passo 13); girar 390×844 → 844×390 (passo 16, quebra de layout pré-existente); voltar entre sacola/checkout e produto (12); recarregar com peça marcada (18); trocar variação de adicional (03, 05, 15); marcar peça sem escolher variação (02, 14). Não tentados: movimento reduzido, rede lenta, arrastar a faixa na vertical (não há faixa).

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-SMOKE-001 | pass | 01 | `screenshots/CH-01-06-conjunto-marcado-390.png` | de/por + "10% a menos levando junto" na lista; Medalha sem percentual só com o preço |
| TC-FUNC-006 | fail | 03–05 | `screenshots/CH-01-04-lista-grade-390.png` | de/por por variação e por cartão OK (a massa não tem "corrente avulsa R$ 79,90"; usado o Berloque avulso a 15 %); as peças da lista em grade, não em faixa que rola ⇒ A-1 |
| TC-FUNC-007 | pass | 03, 06, 09 | `screenshots/CH-01-06-conjunto-marcado-390.png` | um rótulo só, acima do total; Pix sobre o total descontado; sem desconto ⇒ sem a linha |
| TC-FUNC-008 | pass | 03, 09 | — | frase entra só com peça com desconto marcada; cabeçalho sem a frase H-03 |
| TC-FUNC-009 | pass | 10, 11 | `screenshots/CH-01-10-gaveta-sacola-390.png` · `CH-01-11-checkout-pix-390.png` | Total e desconto da gaveta = bloco ao centavo; a gaveta não mostra Pix — o Pix conferido no botão do checkout (R$ 409,65 = bloco). Ver spec-gap 1 |
| TC-FUNC-011 | pass | 07, 15 | `screenshots/CH-01-07-barra-fixa-390.png` · `CH-01-15-nota-1440.png` | barra "R$ 440,48 · Conjunto · 3 peças"; nota 1440 "A joia e 1 peça marcada · R$ 345,31" |
| TC-UI-001 | pass | 08, 13, 15 | `screenshots/CH-01-08-bloco-fonte200-390.png` · `CH-01-13-bloco-320.png` | o bloco cabe a 100/130/200 % e em 320; o estouro a 200 % (435) é da galeria e do "Compartilhar", fora do WI (spec-gap 2). Barra fixa só cobre o total ao rolar, não em repouso no topo do bloco |

Contagem: pass 6 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Loja · página do produto] As peças de uma lista do Compre Junto aparecem em grade, não na faixa que rola dentro dela

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Marina                                                         |
| Jornada e passo     | J-01, passo 1 (escolher a peça da lista) · passos 04, 13, 14 do log  |
| TC                  | TC-FUNC-006                                                           |
| Gravidade proposta  | medium — Marina ainda escolhe e vê o de/por de cada peça, mas com listas de 3+ peças a grade cresce para baixo e empurra o total; contraria a decisão Q-02 (a faixa é exigida neste WI) |
| Reproduziu          | sim (3 de 3: 390, 320, 1440)                                          |
| Viewport            | 390 × 844 (também 320 × 568 e 1440 × 900)                            |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, abrir `http://localhost:8082/produtos/qa-pingente-estrela` em 390×844
2. No bloco "Compre junto", tocar "Ver os 2 modelos" de "QA Correntes"
3. Observar o grupo "Escolha a peça · 2 modelos"

**Esperado:** as peças numa faixa que rola na horizontal dentro do bloco (sem rolar o `body`), cada cartão com o de/por, até a última peça — **fonte:** TC-FUNC-006 passo 3; `spec.md` › Design › Loja — Bloco ("Peças de uma lista (faixa que rola dentro dela)"); decisão Q-02 do Gate 1 ("a grade de hoje no lugar da faixa é bug"); charter CH-01 "Deve tentar" 3.

**Observado:** grade (`display: grid`, `grid-template-columns: 131px 131px` em 390; 96px 96px em 320; 3 colunas de 166px em 1440), `overflow-x: visible`, sem `scroll-snap`. Com mais peças os cartões quebram em linhas novas. O de/por está em cada cartão e sem a frase "N% a menos" (parte do CA-02.1 cumprida).

**Evidência:**

- `screenshots/CH-01-04-lista-grade-390.png` — os dois cartões lado a lado em grade
- `screenshots/CH-01-13-bloco-320.png` · `screenshots/CH-01-14-bloco-1440.png` — a mesma grade em 320 e 1440
- console: nada (só erros de imagem do Supabase hospedado, bloqueado de propósito)
- rede: nada

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A gaveta "Sua sacola" não mostra o valor no Pix; TC-FUNC-009 passo 3 pede "ou R$ Z no PIX da sacola". O Pix só aparece no checkout (bate com o bloco) | 10, 11 | pré-existente |
| A página do produto rola na horizontal em 768×1024 e 844×390 (`scrollWidth` 943–950): a coluna de informação fica com 104–180px a partir de x=648, e no pingente os preços "por" do bloco saem da tela. Reproduz igual em produto sem Compre Junto | 16, 17 | pré-existente |
| A 200 % de fonte em 390, a página rola 45px na horizontal pelas miniaturas da galeria e pela fileira "Compartilhar" (o bloco cabe) | 08 | pré-existente |
| Peça marcada sem variação completa conta como "1 peça marcada" na nota do computador e na barra, mas o total não a inclui (R$ 259,90) — a persona pode achar que a peça foi somada sem desconto | 02, 14 | polimento |

## Fora da cobertura

- Faixa da lista com 3+ peças rolando até a última e o arrasto vertical — não há faixa (A-1), e a massa só oferece 2 modelos na lista (Esgotada some; Berloque fora, CH-05 #1)
- Movimento reduzido e rede lenta (esqueleto de 320) — orçamento priorizado para as medidas de layout
- Trocar a variação da joia (pingente) e o efeito no bloco além do Chaveiro — não exercitado; o Chaveiro (esconde lista e Berloque) não foi aberto
- Variação "quantidade 2 de P no computador" (TC-FUNC-007) — não feita
- Variação de TC-FUNC-009 "com outra peça na sacola antes" — não feita (é mais do CH-02)

## Debrief

- **Surpresas:** a página do produto inteira quebra entre ~768 e ~900px (tablet e celular deitado), independente do WI; `/carrinho` não existe (redireciona à Home), a sacola é só a gaveta.
- **Próximo charter:** a faixa da lista depois do conserto de A-1, com uma lista de 3+ peças disponíveis (massa); o layout da página do produto em 768–900 como item de backlog.
- **Padrão novo:** medir o mesmo `scrollWidth` num produto sem a feature separa rapidamente o que é do WI do que é pré-existente.
