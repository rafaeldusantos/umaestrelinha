# Sessão CH-07 · design-check — a gaveta v2 e o checkout recebendo o CEP

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-07-design-check-gaveta-v2-e-checkout.md` · design-check · P1 |
| Status      | done (parcial: orçamento esgotado antes do checkout e de dois desenhos da faixa) |
| Persona     | PER-01 Luana · conta: anonima                                          |
| Tour · modo | — · —                                                                  |
| Rodada      | exploração                                                             |
| Orçamento   | ~67 ações de browser de 50 — estourado: o add-to-cart abaixo da dobra custou ~10 ações; a exploração parou ao perceber |
| Ambiente    | http://localhost:8082 · build não exposto · Chromium (playwright-cli 0.1.24, headless, DPR 1) · viewport 390 × 844 |
| Paridade    | cotação interceptada com a fixture A (com CORS); `*.supabase.co` e `/g/collect` bloqueados; perfil de estilo padrão da loja (tokens `ground-deep #f1ebe1`, `primary #34495e`, `accent #b8945f`, `ink #23303a`) |

## Missão

Conferir, estado a estado, a gaveta v2 e o bloco Entrega recebendo o CEP contra os protótipos do Work Item,
registrando cada diferença com o valor do design e o observado.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Abrir a página de uma joia (R$ 259,90), fechar o aviso de cookies e pôr na sacola | O "Adicionar à sacola" fica numa barra fixa fora da tela a 390 até rolar a página (atrito conhecido); depois de rolar, a gaveta abre com "Faltam R$ 190,10 para o frete grátis" e "R$ 259,90 / R$ 450,00" | `screenshots/CH-07-01-abaixo-sem-cep.png` |
| 01b | Conferir a faixa abaixo e o rodapé sem CEP | Faixa 54 px, fundo `#f1ebe1`, padding 9/20/11, gap 7, texto 12,5/18 600 `#34495e`, valor 11 500 `#54616b`, barra 5 px branca com preenchimento `#34495e` raio 999 — como a v2. Rodapé 255 px; campo 44 px, borda `#8c8073`, raio 6, ícone 18 px `primary` a 12 px; "Calcular" 44 px, contorno 2 px `primary`, 13 600; cupom 44 px 13,5 500 com chevron; totais 12,5/18, gap 3, Total 16/700 e 18/700; **nenhuma nota abaixo do Total**; botão 48 px raio 12 `primary` 15 700 — mas o ícone da sacola tem 16 px | `screenshots/CH-07-01-abaixo-sem-cep.png` |
| 02 | Tocar no ⓘ da faixa | Balão `#23303a`, texto `#f7f3ec` 12,5/18, raio 12, padding 10/12, texto da regra literal da v2 — mas com 288 px de largura, a 86 px da borda esquerda e 16 px da direita | `screenshots/CH-07-02-balao-info.png` |
| 03 | Digitar "0131" e tocar Calcular | Foco antes: borda `primary` + anel 1 px `primary` (como a v2). Depois: borda `#7e2f2b` e "CEP inválido" 12 px `#7e2f2b` (como a v2) | `screenshots/CH-07-03-cep-invalido.png` |
| 04 | Digitar 01310-100 e Calcular | "Frete para **01310-100** · São Paulo/SP" 12,5 `ink-soft` com o CEP em `ink` 600; "Trocar CEP" 13 600 `primary` sublinhado; cartões 56 px, padding 8/12, borda 2 px, raio 12; escolhido borda `#23303a` fundo `#faf8f4`; outro borda `#e6dfd4`; valor 15 700 `primary` | `screenshots/CH-07-04-opcoes-abertas.png` |
| 05 | Escolher o PAC | Linha recolhida 65 px (prazo em duas linhas), padding 7/20, título 13,5/18 600, prazo+CEP 12/16 `ink-soft`, valor 14 700 `primary`, chevron `ink-soft` — mas 12 px entre ícone, texto e valor | `screenshots/CH-07-05-frete-recolhido.png` |
| 06 | Aumentar para 2 unidades (R$ 519,80) e tocar no ⓘ | Faixa "Frete grátis liberado": fundo `#b8945f`, padding 10/20, sem barra, selo 20 px `ink` com ✓ `accent`, texto 13 700 `ink` — a faixa mede 40 px (linha de 20 px). Linha recolhida passa a "Grátis". Balão de novo com 288 px, agora a 41 px da esquerda e 61 px da direita | `screenshots/CH-07-06-liberado-balao.png` |

**Edge cases tentados:** estado de erro "CEP inválido" (bate); foco no campo de CEP (bate); hover do "Finalizar Pedido" a 390 (`#283a4a` = `primary-strong`, como `.cta:hover`) — o hover em 1440 não foi feito.

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | fail | 01b, 02, 06 | `screenshots/CH-07-02-balao-info.png` · `screenshots/CH-07-06-liberado-balao.png` | A-1, A-5. Conferidos: abaixo sem CEP e liberado (01310-100) com o balão. Não conferidos (orçamento): acima sem CEP e fora (40020-000) |
| TC-UI-002 | fail | 01b, 03, 04, 05 | `screenshots/CH-07-01-abaixo-sem-cep.png` · `screenshots/CH-07-05-frete-recolhido.png` | A-2, A-3, A-4. Todos os estados da tabela conferidos |
| TC-UI-003 | skip | — | — | orçamento esgotado antes do checkout; fonte (`sf-checkout.jsx`) lida e pronta para o próximo charter |

Contagem: pass 0 · fail 2 · blocked 0 · skip 1

## Achados

### A-1 · [Gaveta · ⓘ] O balão do frete grátis abre com 288 px ancorado ao ⓘ, e não de borda a borda da gaveta

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 1-2 (ler a regra do frete grátis) · passos 02 e 06 do log |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — o texto da regra aparece inteiro, só mais estreito e em mais linhas que o desenhado |
| Reproduziu          | sim (2 de 2 — faixa abaixo e faixa liberada)                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, 390 × 844, abrir `/produtos/joia-afetiva-arvore-da-vida-flores-com-leite-materno-e-cabelo`, rolar e pôr na sacola
2. Na gaveta, tocar no ⓘ "Sobre o frete grátis"
3. Medir o balão contra as bordas da gaveta

**Esperado:** balão `position:absolute; left:12px; right:12px` dentro da faixa — 12 px de cada borda da gaveta (366 px de largura a 390) — **fonte:** protótipo `Black Friday - Sacola v2.html` › `bf-sacola-v2.css` `.inf-t`; TC-UI-001 ("a 12px de cada borda da gaveta"); `spec.md` › Design › "O ⓘ"

**Observado:** 288 px de largura; abaixo: 86 px da esquerda e 16 px da direita; liberado: 41 px da esquerda e 61 px da direita. Cor, texto, tipografia, raio e padding batem.

**Evidência:**

- `screenshots/CH-07-02-balao-info.png` — balão na faixa abaixo
- `screenshots/CH-07-06-liberado-balao.png` — balão na faixa liberada, em outra posição
- console: nada
- rede: nada

### A-2 · [Gaveta · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o desenho pede 20 px

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 5 (ir ao checkout) · passo 01b do log                     |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — puramente visual                                                |
| Reproduziu          | sim (2 de 2 leituras)                                                 |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, 390 × 844, uma peça na sacola, gaveta aberta
2. Medir o ícone do botão "Finalizar Pedido"

**Esperado:** `<DSG.Icon name="sacola" size={20} />` — 20 px — **fonte:** `bf-sacola-v2.jsx` › `.cta2`; TC-UI-002 ("ícone de sacola de 20px")

**Observado:** svg de 16 px. Altura 48, raio 12, `primary`, 15 700 batem.

**Evidência:**

- `screenshots/CH-07-01-abaixo-sem-cep.png`
- console: nada
- rede: nada

### A-3 · [Gaveta · frete recolhido] A linha do frete escolhido usa 12 px entre ícone, texto e valor, o desenho usa 10 px

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 4 (escolher o frete) · passos 05 e 06 do log              |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — espaçamento                                                     |
| Reproduziu          | sim (2 de 2 — PAC pago e PAC grátis)                                  |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, 390 × 844, uma peça; na gaveta, CEP 01310-100, Calcular
2. Tocar no PAC
3. Medir o `gap` da linha recolhida

**Esperado:** `.fr2-res{gap:10px}` — **fonte:** `bf-sacola-v2.css` › `.fr2-res`

**Observado:** `column-gap: 12px`. Padding 7/20, título 13,5/18 600, prazo 12/16 `ink-soft`, valor 14 700 `primary`, borda inferior `line` batem.

**Evidência:**

- `screenshots/CH-07-05-frete-recolhido.png`
- console: nada
- rede: nada

### A-4 · [Gaveta · cupom recolhido] A borda inferior de "Tem um cupom?" é `#e6e0d5`, não o `line` `#e6dfd4`

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 1 · passo 01b do log                                      |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — tom vizinho, invisível a olho nu                                |
| Reproduziu          | intermitente (1 leitura; não repetida por orçamento)                  |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, 390 × 844, uma peça na sacola, gaveta aberta
2. Ler a cor da borda inferior do botão "Tem um cupom?"

**Esperado:** `border-bottom:1px solid var(--estrelinha-line)` = `#e6dfd4` — **fonte:** `bf-sacola-v2.css` › `.cp2`

**Observado:** `#e6e0d5` (as outras divisórias do rodapé leem `#e6dfd4`).

**Evidência:**

- `screenshots/CH-07-01-abaixo-sem-cep.png`
- console: nada
- rede: nada

### A-5 · [Gaveta · faixa liberada] A faixa "Frete grátis liberado" mede 40 px, o desenho dá 42 px (linha de 22 px)

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Luana                                                          |
| Jornada e passo     | J-01, passo 3 (ver o frete grátis liberado) · passo 06 do log         |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — 2 px de altura                                                  |
| Reproduziu          | sim (2 de 2 leituras: faixa 40 px, linha 20 px)                       |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Anônima, 390 × 844, uma peça de R$ 259,90 com quantidade 2; CEP 01310-100 calculado
2. Medir a faixa "Frete grátis liberado"

**Esperado:** `.fg2-l{min-height:22px}` com `padding:10px 20px` ⇒ 42 px — **fonte:** `bf-sacola-v2.css` › `.fg2-l`, `.fg2.ok`

**Observado:** faixa 40 px, linha 20 px (a altura do selo). Fundo, padding, selo e texto batem.

**Evidência:**

- `screenshots/CH-07-06-liberado-balao.png`
- console: nada
- rede: nada

## Design

**Protótipo:** `4abe021d-d77e-4fe7-affd-524180315fa3` · Black Friday - Sacola v2.html (`bf-sacola-v2.jsx`, `bf-sacola-v2.css`, `sf.css`, `ds/tokens`) · `claude_design` · lido pelo MCP do Claude Design; `69224d8a-17ae-4b1f-a251-a8105b41edc2` · Sacola - Prévia de frete.html (`sf-checkout.jsx`, `sf.css`) · `claude_design` · lido pelo MCP (não comparado — orçamento)

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | gaveta sobre a página do produto · faixa | balão do "Sobre o frete grátis" | `left` / `right` / `width` | 12 px / 12 px / 366 px | abaixo 86 / 16 / 288 · liberado 41 / 61 / 288 · 390 | `screenshots/CH-07-02-balao-info.png` | A-1 |
| D2 | gaveta · rodapé | ícone do "Finalizar Pedido" | `width` | 20 px | 16 px · 390 | `screenshots/CH-07-01-abaixo-sem-cep.png` | A-2 |
| D3 | gaveta · rodapé recolhido | botão "Frete: PAC, …" | `column-gap` | 10 px | 12 px · 390 | `screenshots/CH-07-05-frete-recolhido.png` | A-3 |
| D4 | gaveta · rodapé | "Tem um cupom?" | `border-bottom-color` | `#e6dfd4` (token `line`) | `#e6e0d5` · 390 | `screenshots/CH-07-01-abaixo-sem-cep.png` | A-4 |
| D5 | gaveta · faixa liberada | linha "Frete grátis liberado" | `min-height` (altura da faixa) | 22 px (faixa 42 px) | 20 px (faixa 40 px) · 390 | `screenshots/CH-07-06-liberado-balao.png` | A-5 |

**Telas não conferidas:** faixa acima sem CEP ("Frete grátis para Sul e Sudeste") — orçamento; faixa fora (40020-000) — orçamento; `/checkout` › Entrega (TC-UI-003) — orçamento; 1440 × 900 — a v2 só tem a "Visão Celular 390" e a de computador no mesmo protótipo por `@container`, não conferida (orçamento).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| A gaveta traz, abaixo das peças, a lista "Complete o frete grátis" (peças sugeridas com "Adicionar … à sacola"), que a v2 não desenha | 01 | pré-existente |

## Fora da cobertura

- Faixa acima sem CEP, faixa fora (40020-000) e TC-UI-003 (checkout › Entrega com "Trazido da sua sacola") — orçamento estourado; a fonte do checkout já foi lida e localizada (`sf-checkout.jsx`, `.veio`, `.cep-l`, `.op.sel`).
- Hover do "Finalizar Pedido" em 1440 — orçamento.
- Contorno de 1,5 px do ⓘ: o Chromium a DPR 1 arredonda bordas para pixel inteiro e devolve `1px` no valor computado; a diferença não é observável neste browser (precisaria de DPR 2).
- Rodapé 255 px sem CEP e 276 px com o frete recolhido contra ~244 / ~265 do `item.md`: régua de apoio, não de pixel; a diferença vem em parte do prazo em duas linhas (texto dinâmico).

## Debrief

- **Surpresas:** o "Adicionar à sacola" a 390 vive numa barra fixa que só entra na tela depois de rolar — cerca de 10 ações até a peça entrar na sacola, o que levou o orçamento.
- **Próximo charter:** uma sessão curta só para TC-UI-003 e os dois desenhos da faixa que faltaram (acima sem CEP, fora), entrando direto com 2 unidades da mesma peça.
- **Padrão novo:** ler o estado com o ponteiro longe (`mousemove` para fora) antes de medir — duas leituras saíram em hover (cartão e botão) e quase viraram diferença falsa.
