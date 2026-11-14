# Sessão CH-08 · CFR — a sacola com frete e o checkout

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-08-cfr-sacola-e-checkout.md` · cfr · P1 |
| Status      | done |
| Persona     | PER-01 Luana · conta: anonima |
| Tour · modo | — |
| Rodada      | exploração |
| Orçamento   | 35 ações de browser de 35 (o `close` final fora da conta) |
| Ambiente    | http://localhost:8082 · build não exposto (dev server Vite) · Chromium headless do `playwright-cli` 0.1.24 · viewports 390 × 844 e 1440 × 900 · fonte da raiz 16 px (100 %) e 32 px (200 %) |
| Paridade    | dev server, não build de produção · cotação do Melhor Envio interceptada com a fixture A (com CORS) · functions com chaves externas inválidas · `*.supabase.co` e `/g/collect` bloqueados · configuração vigente: frete grátis ligado, R$ 450,00, Sul + Sudeste |

## Missão

Refazer J-01 e J-02 como auditoria e medir o que a Validation não pôde: o rodapé da gaveta cabendo na tela do
celular, os alvos de toque, o ⓘ acessível e o balão dentro da gaveta, e nada cortado com a fonte grande.

## Passos

Todas as medidas saem do DOM (`getBoundingClientRect`, `scrollWidth`/`clientWidth`, `elementFromPoint`), não da
imagem. "Rodapé" = o bloco fixo da gaveta que vai da prévia de frete até "Finalizar Pedido".

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | Abrir a loja a 390 × 844 e aceitar os cookies | Home carregou; aviso de cookies aceito (atrito já conhecido) | — |
| 02 | Abrir o "Pingente Afetivo mini Coração com Cinzas de Cremação" (R$ 179,90) e pôr na sacola | A 390 o "Adicionar à sacola" da barra fixa fica fora da viewport (o Playwright rola e ainda acusa "outside of the viewport" — atrito já conhecido); adicionado a 1440 pelo botão do corpo; a gaveta abriu com 1 item, "Faltam R$ 270,10 para o frete grátis", ⓘ "Sobre o frete grátis" | — |
| 03 | Gaveta a 1440 × 900, sem CEP | Gaveta 440 px (x 1000–1440); `scrollWidth` do documento 1440 = `innerWidth`; rodapé 261 px, inteiro na tela (t 639, b 900); nada abaixo do Total; alvos: CEP 306×44, Calcular 85×44, "Tem um cupom?" 439×44, Finalizar 350–399×48; ⓘ visível 17×17, mas `elementFromPoint` a ±13 px do centro (4 direções) cai no ⓘ | — |
| 04 | Gaveta a 390 × 844, sem CEP | `scrollWidth` 390 = `innerWidth`; gaveta 390 sem rolar de lado (sw 390 = cw 390); rodapé **255 px** (régua de apoio ~244), na tela (t 589, b 844); nenhuma nota abaixo do Total; mesmos alvos ≥ 44 px; ⓘ com área ampliada (±13 px acertam) | — |
| 05 | Tocar no ⓘ a 390 | Balão `role=tooltip` abre; ⓘ `aria-expanded="true"`; texto "Compras a partir de R$ 450,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP."; balão x 86–374 × y 98–172 (288 × 74) dentro da gaveta 0–390 — folga 86 px à esquerda e 16 px à direita; `scrollWidth` 390; animação de entrada `enter` | `screenshots/CH-08-05-balao-390.png` |
| 06 | Digitar 01310-100 e tocar em "Calcular" | "Frete para 01310-100 · São Paulo/SP", "Trocar CEP", PAC R$ 21,40 e SEDEX R$ 38,90 abertos, PAC já como "Frete · PAC" nos totais (Total R$ 201,30); o balão fechou com o toque fora; rodapé 384 px, inteiro na tela (t 460, b 844); nenhuma nota abaixo do Total; opções 350×56; `scrollWidth` 390 | — |
| 07 | Medir o "Trocar CEP" (visível 66 × 20) | Área de toque ampliada por `::before`: `elementFromPoint` acerta de −22 a +15 px do centro na vertical, erra em +22; não acerta a ±36 px na horizontal (largura 66) — área efetiva vertical confirmada ≥ 37 px, os 44 px não confirmados no orçamento | — |
| 08 | Tocar no PAC (a lista recolhe) | Linha recolhida "PAC · Correios · Chega entre 25 e 27 de novembro · CEP 01310-100 · R$ 21,40" (botão 390×65, nome "Frete: PAC, R$ 21,40, para o CEP 01310-1…"); rodapé **276 px** (`clientHeight` 275), acima dos 270; nenhuma nota abaixo do Total; `scrollWidth` 390; segunda leitura do mesmo estado: 276 px de novo | — |
| 09 | Fonte da raiz a 200 % com o PAC recolhido | Rodapé 460 px (t 384, b 844), dentro da tela, sem precisar rolar por dentro (sh 459 = ch 459); nenhum texto do rodapé com `scrollWidth > clientWidth` nem reticências — CEP 01310-100 e R$ 21,40 inteiros; gaveta sem rolagem lateral (sw 390); `scrollWidth` do **documento** 435 > 390 (o cabeçalho da loja, rolagem já conhecida pelo charter); alvos 390×129, 390×88, 310×96; fonte voltou a 100 % no fim | — |

**Edge cases tentados:** fonte da raiz a 200 % (passo 09); toque fora fechando o balão (passo 06, o toque no campo de
CEP fechou); área ampliada do ⓘ e do "Trocar CEP" por `elementFromPoint` (passos 03, 04, 07); releitura do rodapé
recolhido (passo 08).

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-CFR-001 | fail | 04, 06, 08, 09 | DOM (passo 08) | ⇒ A-1. Passo 1: 255 px, sem nota. Passo 2: **276 px > 270**, sem nota, `scrollWidth` 390. Passo 3: 384 px, na tela, sem nota. Passo 4 a 200 %: recolhido sem corte e sem rolagem lateral da gaveta (o documento rola 45 px pelo cabeçalho, conhecido); com as opções abertas a 200 % não medido. Variações 130 % e cupom não rodadas |
| TC-CFR-002 | pass | 03, 04, 06, 07, 08 | DOM | 390 e 1440 sem rolagem lateral do corpo; gaveta 440 px a 1440; rodapé na tela em todos os estados medidos. Alvos ≥ 44: CEP, Calcular, opções (56), linha recolhida (65), cupom (44), Finalizar (48), ⓘ pela área ampliada (±13 px). "Trocar CEP": visível 20 px, área ampliada confirmada ≥ 37 px, 44 não confirmado (ver Fora da cobertura). A 1440 só o estado sem CEP; variações 320 × 568 e 90010-000 não rodadas |
| TC-CFR-003 | pass | 05, 06 | `screenshots/CH-08-05-balao-390.png` | Parcial: passo 3 (abre ao tocar, fecha ao tocar fora) e passo 4 (balão dentro da gaveta, `role=tooltip`, `aria-expanded` alterna, nome "Sobre o frete grátis"). O balão fica ancorado no ⓘ (folga 86 px à esquerda, 16 px à direita), não a ~12 px de cada borda como o Esperado descreve — dentro da gaveta, que é a meta. Passos 1, 2 (ponteiro, Tab, Esc), segundo toque fechando e passo 5 (40020-000) não rodados |

Contagem: pass 2 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Sacola · rodapé] Com o frete escolhido, o rodapé da gaveta a 390 × 844 mede 276 px — passa do teto de 270 px

| Campo | Valor |
| ----- | ----- |
| Persona | PER-01 Luana |
| Jornada e passo | J-01, passo 3 (escolher o frete) · passo 08 do log |
| TC | TC-CFR-001 |
| Gravidade proposta | low — 6 px acima do teto: as peças continuam visíveis acima (568 px), Luana conclui sem esforço a mais; é o critério de aceite CA-23 que não fecha |
| Reproduziu | sim (2 de 2 leituras do mesmo estado na sessão; não refeito de um estado limpo — orçamento) |
| Viewport | 390 × 844, fonte da raiz 16 px |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, sacola vazia, cotação interceptada com a fixture A; viewport 390 × 844
2. Pôr na sacola uma peça abaixo de R$ 450 (ex.: Pingente Afetivo mini Coração com Cinzas de Cremação, R$ 179,90)
3. Na gaveta, digitar 01310-100, tocar em "Calcular" e tocar no PAC para recolher a lista
4. Medir o bloco do rodapé (da linha recolhida do frete até "Finalizar Pedido")

**Esperado:** rodapé ≤ 270 px com o frete escolhido, a 100 % — **fonte:** PRD 99 CA-23, M-06, M-07; TC-CFR-001 passo 2 (meta "acima é `fail`")

**Observado:** rodapé de 276 px de altura (`getBoundingClientRect().height` 276, `clientHeight` 275), de y 568 a 844.
Compõem: linha recolhida do frete 65 px, "Tem um cupom?" 44 px, Subtotal, "Frete · PAC R$ 21,40", Total, "Finalizar
Pedido" 48 px. Nenhuma nota abaixo do Total. Sem CEP o mesmo rodapé mede 255 px (régua de apoio ~244).

**Evidência:**

- medida do DOM nos passos 08 (duas leituras: 276 e 276); sem screenshot do estado (orçamento)
- console: nada
- rede: nada

## CFR

| Jornada | Categoria | Marca | Itens que não passaram | Achado |
| ------- | --------- | ----- | ---------------------- | ------ |
| J-01 | Usabilidade | friction | minimalismo: rodapé recolhido 276 px > 270 | A-1 |
| J-01 | Acessibilidade | pass | — (toque, nome acessível, `aria-expanded`, `role=tooltip`, alvos ≥ 44 conferidos; teclado não rodado) | — |
| J-01 | Performance percebida | pass | — (as opções estavam na tela na primeira leitura depois do "Calcular"; com a cotação interceptada, sem tempo medido) | — |
| J-01 | Compatibilidade | friction | rodapé acima do teto a 100 % (o mesmo A-1); 200 % sem corte; 1440 só sem CEP | A-1 |
| J-01 | Recuperação de erro | — | não rodado (CEP inválido) | — |
| J-02 | todas | — | não rodada no orçamento | — |

**Categorias fora:** Recuperação de erro e J-02 inteira — o orçamento acabou nas medidas de J-01 (ver Fora da cobertura).

**Pré-existente, sem achado (fora da superfície da Mudança):** a 390, na página da peça, a árvore de acessibilidade
mostrou o `main` vazio nas leituras feitas logo depois da navegação, embora o texto da peça estivesse na tela;
documento rola 45 px de lado a 200 % pelo cabeçalho (já conhecido pelo charter).

## Spec-gaps

nada

## Fora da cobertura

- J-02 (40020-000, linha fora da região) e TC-CFR-003 passo 5 — orçamento.
- TC-CFR-003 passos 1 e 2 (ponteiro a 1440, Tab, foco visível, Esc) e o segundo toque fechando o balão — orçamento.
- TC-CFR-001: opções abertas a 200 %; variações 130 % e com cupom — orçamento.
- TC-CFR-002: 1440 com o frete calculado (só sem CEP); variações 320 × 568 e 90010-000; a área do "Trocar CEP" entre
  +16 e +21 px do centro (confirmados ≥ 37 px, os 44 não) — orçamento.
- CA-08 no checkout (bloco Entrega recebendo da sacola) — orçamento; já percorrido nos CH-01/CH-03.
- Recuperação de erro (CEP inválido) — orçamento.
- Movimento reduzido no balão — orçamento.
- Leitor de tela real, Safari/Firefox — só o Chromium do driver.
- "Calculando" com resposta lenta — a rota responde na hora.

## Debrief

- **Surpresas:** chegar à gaveta a 390 custou ~10 ações (barra fixa fora da viewport e o snapshot do `playwright-cli`
  com o `main` vazio na página da peça); a peça foi adicionada a 1440 e a gaveta medida depois a 390.
- **Próximo charter:** uma sessão curta só para J-02 a 390 (balão com a faixa "fora", 40020-000) e o teclado do ⓘ a 1440.
- **Padrão novo:** medir área de toque ampliada por `elementFromPoint` em volta do centro — a caixa visível do ⓘ (17 px)
  e do "Trocar CEP" (20 px) enganaria a medida.
