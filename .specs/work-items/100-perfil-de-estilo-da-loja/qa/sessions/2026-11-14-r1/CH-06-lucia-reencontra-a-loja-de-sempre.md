# Sessão CH-06 · Lúcia reencontra a loja de sempre no perfil Padrão

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-lucia-reencontra-a-loja-de-sempre.md` · exploratório · P0 |
| Status      | done (cobertura parcial: o orçamento acabou antes da sacola, do checkout, de `/conta` e da confirmação) |
| Persona     | PER-04 Lúcia · conta: anonima. A `cliente-qa` (`QA_CLIENTE_QA_USUARIO`) não chegou a ser usada |
| Tour · modo | Feature · por cenário (J-04), worktree × referência                    |
| Rodada      | exploração                                                             |
| Orçamento   | 70 ações de browser de 70, mais o `close`                              |
| Ambiente    | http://localhost:8082 (worktree) × http://localhost:8092 (referência, commit-base, mesmo banco) · build não exposto · Chromium (agent-browser 0.39.1) · viewports 390 × 844 · 1440 × 900 |
| Paridade    | `*.supabase.co*` e `**/g/collect*` abortados por rota. O worktree marca `<html data-perfil="padrao">`, a referência não marca nada: é esperado, não é achado. A faixa de avisos mostra um texto de Black Friday nas duas lojas: é conteúdo do banco, não o perfil |

## Missão

Como a cliente que volta e conhece a loja de cor, achar qualquer tom, transparência, sombra ou marca que esteja
diferente da loja de antes do Work Item quando a dona não ligou nada.

## Método

Rodei **um** `eval` por tela em cada loja. Ele percorre os elementos visíveis do `body` e conta os valores
computados distintos de `color`, `background-color`, `border-top/bottom-color` (só com borda > 0), `box-shadow`,
`fill`, `stroke`, `outline-color`, `text-decoration-color` e dos gradientes, mais o fundo do `html` e do `body`.
Depois comparei os dois conjuntos (worktree × referência): um valor que aparece numa loja e falta na outra é
diferença de cor. Quando só a contagem muda, é um elemento a mais ou a menos (carrossel, placeholder de imagem
carregando) e o tom continua o mesmo.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir a Home no celular (390), primeira visita, nas duas lojas | Os mesmos valores nas duas, com as mesmas contagens. Cabeçalho `rgb(40, 58, 74)` (#283A4A), texto `rgb(35, 48, 58)`, transparências `rgba(247, 243, 236, 0.8)` e `0.85`, `rgba(255, 255, 255, 0.7)`. Sombra do aviso de cookies `rgba(35, 48, 58, 0.08) 0 -8px 24px` e sombra `rgba(0,0,0,.1) 0 10px 15px -3px…` iguais | `screenshots/2026-11-14-r1/CH-06-01-home-wt.png` · `screenshots/2026-11-14-r1/CH-06-01-home-ref.png` |
| 02 | Abrir o menu do celular (o véu) | Os mesmos valores nas duas lojas, véu incluído. A referência tem um elemento a mais: o ponto ativo do carrossel de banners com anel (`0 0 0 2px #fff` + shadow-md). O carrossel estava em outro slide ("Banner 2 de 2"), é conteúdo dinâmico | `screenshots/2026-11-14-r1/CH-06-02-menu-wt.png` · `screenshots/2026-11-14-r1/CH-06-02-menu-ref.png` |
| 03 | Abrir a categoria "Linha Leite Materno" (`/joias-afetivas/joia-de-leite-materno`) | Os mesmos valores nas duas. A referência tinha 2 placeholders de imagem (`rgb(240, 234, 224)`) a mais, ainda carregando | `screenshots/2026-11-14-r1/CH-06-03-categoria-wt.png` · `screenshots/2026-11-14-r1/CH-06-03-categoria-ref.png` |
| 04 | Abrir a peça em oferta "Pulseira Afetiva Esferas…" (selo "10% de desconto", de R$ 374,00 por R$ 336,60) | Os mesmos valores nas duas (selo, preço, parcelas). Desta vez o worktree tinha 2 placeholders de imagem ainda carregando. O preço aparece legível | `screenshots/2026-11-14-r1/CH-06-04-produto-oferta-wt.png` |
| 05 | Digitar um endereço que não existe (`/nao-existe`) | 1ª leitura sem esperar a rede: a referência tinha alguns elementos a mais (o aviso de cookies chegou depois). Li de novo no worktree depois da rede assentar: os conjuntos ficaram **idênticos** aos da referência, contagens incluídas | `screenshots/2026-11-14-r1/CH-06-05-404-wt.png` |
| 06 | Abrir a confirmação do pedido #0613 sem estar logada | "Pedido não encontrado" com o botão "Entrar com código". O orçamento não deu para entrar nas duas lojas | — |
| 07 | Ver a peça em oferta no notebook (1440 × 900) | Os mesmos valores nas duas, contagens incluídas | — |
| 08 | Ver a Home no notebook (1440 × 900) | Inconclusivo. A referência foi lida antes de terminar de carregar (202 elementos contra 804) e não sobrou orçamento para ler de novo. Nenhum valor aparece só na referência | `screenshots/2026-11-14-r1/CH-06-06-home-1440-wt.png` |

**Edge cases tentados:**

- Aviso de cookies na primeira visita: a sombra é igual
- Menu do celular aberto: o véu é igual
- 404 (`/nao-existe`): marca e botão iguais
- Não tentados: foco com Tab, campo com erro no checkout, hover do botão primário em 1440 e o selo de situação na confirmação (ver Fora da cobertura)

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-SMOKE-001 | pass | 01, 04 | `screenshots/2026-11-14-r1/CH-06-01-home-wt.png` · `screenshots/2026-11-14-r1/CH-06-04-produto-oferta-wt.png` | A Home abre no Padrão, com o cabeçalho `rgb(40, 58, 74)` = #283A4A. A página do produto mostra o preço legível. Abri a peça em oferta pela categoria, não pelo primeiro cartão da Home |
| TC-REG-001 | blocked | 01–08 | idem | Por orçamento. Telas comparadas, todas iguais: Home, menu, categoria, produto em oferta e 404 em 390, produto em 1440. Não comparadas: sacola, checkout (borda `field`), `/conta`, confirmação, anel de foco, convite do Instagram isolado, e Home/categoria/checkout em 1440. Nenhuma diferença de cor nas telas medidas |

Contagem: pass 1 · fail 0 · blocked 1 · skip 0

## Achados

nada

## Spec-gaps

nada

## Fora da cobertura

- Sacola com a peça e checkout (borda do campo com erro, barra do frete grátis em 390 e 1440): o orçamento de 70 ações acabou
- `/conta` e a confirmação `/pedido/:id` (selo "pendente", lista de passos): pedem entrar com a `cliente-qa` nas duas lojas, umas 10 ações. Não coube no orçamento
- Home em 1440: a leitura da referência ficou parcial, por isso inconclusiva. Categoria em 1440: não lida
- Anel de foco (Tab) e hover do botão primário em 1440: não tentados, por orçamento
- Convite do Instagram: entrou na leitura geral das telas de 390 (é o mesmo conjunto), mas não o conferi isolado
- Perfil ausente × `padrao`: a sessão só leu o estado S0 (chave ausente)

## Debrief

- **Surpresas:** os ~10 primeiros passos foram para refs cobertas e uma espera por texto que só existe como `aria-label`. Encontrar as URLs pelos links e abrir direto teria economizado orçamento
- **Próximo charter:** uma sessão curta (cerca de 40 ações) para sacola, checkout com erro, `/conta` e confirmação logada nas duas lojas, mais Home/categoria/checkout em 1440 lidos depois de `wait --load networkidle`
- **Padrão novo:** contar os valores computados distintos por propriedade e comparar as duas lojas funciona bem para regressão de paleta. Uma leitura por tela e por loja, e a diferença de tom aparece como valor que só existe de um lado
