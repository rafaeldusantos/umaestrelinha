# Sessão CH-09 · design-check — cartão "Agora na loja" e tela "Loja ao vivo" · Ateliê Admin.dc.html

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-09-design-check.md` · design-check · P2        |
| Status      | done |
| Persona     | PER-01 Adri · conta: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) · clientes `anonima` em contextos isolados como estímulo |
| Tour · modo | — |
| Rodada      | exploração |
| Orçamento   | 28 ações de browser de 40 |
| Ambiente    | app http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · build não exposto · Chromium headless (Playwright MCP) · app em 390 × 844 |
| Paridade    | banco local com `production_host = localhost`; 4 clientes em contextos novos (iPhone + `utm_source=instagram` numa joia; iPhone + referer google.com com joia na sacola; computador + referer wa.me no checkout; Android sem referência numa joia), `navigator.webdriver` neutralizado, `*.supabase.co` e `**/g/collect*` bloqueados, cookies aceitos; contextos conduzidos por `browser_run_code_unsafe`; cliques na loja por `dispatchEvent` |

## Missão

Conferir o cartão e a Loja ao vivo contra o protótipo, propriedade a propriedade, onde o PRD não decidiu
diferente.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | entrar como a Adri (390) e, com quatro clientes na loja, olhar o Início | cartão "Agora na loja · 5 pessoas · 1 no checkout" (a cliente da sacola só entrou depois — ver passo 03), mini gráfico de 15 barras com a última dourada, chevron; cartão 358 × 116, a 16 px das laterais e 24 px abaixo da faixa escura | `screenshots/CH-09-01-inicio-cartao.png` |
| 02 | tocar no cartão | abre `/ao-vivo`: cabeçalho, A (5), B, C (2 joias com foto), D (4 faixas), E "3 de 5" com "o resto pelo computador ou tablet", Acessos | — |
| 03 | (preparo) a cliente do iPhone/Google põe a joia na sacola de novo — a primeira tentativa tinha acertado "Adicionar aos favoritos" | B: Olhando 3 · Com joia na sacola 1 · No checkout 1 · Compraram 0, com a nota | — |
| 04 | medir cabeçalho, A e B pelos valores computados | ver a tabela Design (D2–D5); o resto igual ao protótipo | `screenshots/CH-09-02-ao-vivo-cheio.png` |
| 05 | medir C, D, E e Acessos | C, D e Acessos iguais ao protótipo (com as correções do PRD); E com o eyebrow em fonte serifada (D2) | `screenshots/CH-09-02-ao-vivo-cheio.png` |
| 06 | trocar Acessos para Ontem e Semana | "0% vs anteontem" e "−100% vs anteontem" 12 px `ink-soft`; "+1200% vs semana anterior" 12 px `done` | `screenshots/CH-09-03-acessos-semana-botao.png` |
| 07 | recarregar `/ao-vivo` e o Início e medir de novo (2ª reprodução) | os mesmos valores de D1–D5; o cartão agora "1 com joia na sacola · 1 no checkout" | `screenshots/CH-09-04-cartao-cheio.png` |
| 08 | fechar os contextos das clientes, sair da conta ("Sua conta" › "Sair") e fechar o browser | volta ao login | — |

**Edge cases tentados:**

- Só o estado cheio está desenhado: conferido só ele, com as três partes do funil, quatro origens e um computador
- Recarregar e medir de novo (passo 07): valores idênticos
- Acessos nos três períodos (passo 06)

## Casos

| TC     | Veredito | Passo | Evidência                 | Nota                        |
| ------ | -------- | ----- | ------------------------- | --------------------------- |
| TC-UI-001 | fail | 01, 07 | `screenshots/CH-09-04-cartao-cheio.png` | A-3. Caixa (surface, borda line, raio 20, padding 16, sombra soft, gap 14), eyebrow (ponto 8×8 accent; 11/600, caixa alta, 1.1px, ink-soft), número (Libre Baskerville 700 30 px −0.6px primary), "pessoas" 14 px ink-soft, funil 13 px ink-soft, gráfico 96×40 gap 2, 15 barras raio 2 (última accent, outras line) e chevron 20 px ink-soft iguais; posição e gap número–rótulo diferentes |
| TC-UI-002 | fail | 04, 07 | `screenshots/CH-09-02-ao-vivo-cheio.png` | A-1, A-2, A-4. Iguais: Voltar 44×44 com chevron 22 e `aria-label="Voltar"`; título display 700 17 px (`h1`, PRD); frescor 12 px ink-soft; corpo padding 16, gap 12, ordem A·B·C·D·E·Acessos (Acessos com 24 acima); A fundo ink, raio 20, padding 20, número 56/700/lh 56/−1.68px accent, rótulo 15/300, 30 barras em 56 px, gap 3, raio 2, a última accent, legendas 11 px; B surface, padding 16, título 17, rótulos 14, números display 700 primary, trilho 6 px ground-deep raio 999, Olhando field · Com sacola primary · No checkout accent, "Compraram" sem barra (PRD), nota 13/1.45 ink-soft com borda line, margem 14, padding-top 12 |
| TC-UI-003 | fail | 05, 06, 07 | `screenshots/CH-09-02-ao-vivo-cheio.png` | A-1 (eyebrow de E). Iguais: C padding 4/16, título 17 (margem 12/2), linhas padding 10, gap 12, divisória line a partir da 2ª, caixa 40×40 raio 6 ground-deep com foto (PRD), nome 14, "{n} pessoa(s)" 13 ink-soft nowrap; D barra 10 px raio 999 gap 2, legenda 1fr 1fr gap 8/12, 14 px, quadrado 10×10 raio 3, número display 700 primary, Instagram primary · Google primary-strong · WhatsApp accent · Direto field; E número display 700 20 px primary, 2ª linha 12 px ink-soft, linha inteira (D-19); Acessos números em 1fr 1fr, variação 12 px done na alta e ink-soft na queda. Variação "Outros" não exercitada |

Contagem: pass 0 · fail 3 · blocked 0 · skip 0

## Achados

### A-1 · [Loja ao vivo] Os eyebrows "Agora na loja" (bloco A) e "No celular" (bloco E) saem em fonte serifada — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-02 · passos 04, 05 e 07 do log                                      |
| TC                  | TC-UI-002, TC-UI-003                                                  |
| Gravidade proposta  | low — puramente visual: o rótulo pequeno em caixa alta fica em Libre Baskerville, destoando dos outros eyebrows (Acessos, cartão do Início), sem mudar leitura nem jornada |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no app do ateliê (http://localhost:8084) como `admin-atelie`, a 390 × 844, com pelo menos uma cliente na loja
2. Abrir `/ao-vivo`
3. Olhar o rótulo "AGORA NA LOJA" no bloco escuro e "NO CELULAR" no bloco E

**Esperado:** eyebrow em `font-body` (Outfit) 11/600, caixa alta, .1em — **fonte:** protótipo › Loja ao vivo (bloco A e célula "No celular"; o mesmo padrão de eyebrow do cartão do Início e dos cartões de Acessos); spec › Design

**Observado:** os dois são `h2` em `"Libre Baskerville"` 11 px 600, caixa alta, 1.1px. O eyebrow do cartão do Início e os dos cartões de Acessos (VISITAS, COM SACOLA…) estão em Outfit.

**Evidência:**

- `screenshots/CH-09-02-ao-vivo-cheio.png` — "AGORA NA LOJA" e "NO CELULAR" serifados, "VISITAS"/"COM SACOLA" sem serifa
- console: nada
- rede: nada

### A-2 · [Loja ao vivo] No bloco escuro, os brancos translúcidos do protótipo viraram creme mais opaco — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-02 · passos 04 e 07 do log                                          |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — diferença de tom; os textos ficam até mais contrastados, nada some |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Entrar como `admin-atelie` a 390 × 844, com gente na loja, e abrir `/ao-vivo`
2. Medir as cores do eyebrow, do rótulo "pessoas nos últimos 5 minutos", das legendas "30 min atrás"/"agora" e das barras antigas do gráfico do bloco A

**Esperado:** eyebrow e rótulo `on-ink-strong` `#ffffff` 80 %; legendas `on-ink` `#ffffff` 62 %; barras antigas `on-ink-border` `#ffffff` 12 % — **fonte:** protótipo › Loja ao vivo, bloco A; spec › Design

**Observado:** eyebrow e rótulo `#f7f3ec` 100 % (`on-primary`); legendas `#f7f3ec` 75 %; barras antigas `#f7f3ec` 20 %. Os nomes dos tokens do app não são visíveis da tela — se forem os mesmos tokens com outro valor, é diferença de token; se forem outros tokens, de token.

**Evidência:**

- `screenshots/CH-09-02-ao-vivo-cheio.png` — bloco A
- console: nada
- rede: nada

### A-3 · [Início] O cartão "Agora na loja" fica a 16 px das laterais e 24 px abaixo da faixa, e o número cola mais no "pessoas" — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-01, passo 1 · passos 01 e 07 do log                                 |
| TC                  | TC-UI-001                                                             |
| Gravidade proposta  | low — espaçamento; o cartão segue o recuo de 16 px dos outros blocos do Início ("Precisa de você" também começa em 16), então é coerente com a tela, só não com o frame |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Entrar como `admin-atelie` a 390 × 844, com gente na loja
2. No Início, medir o cartão "Agora na loja" e a linha do número

**Esperado:** área do cartão com padding 16 no topo e 20 nas laterais (cartão de 350 de largura, a 20 da borda); gap 8 entre o número e "pessoas" — **fonte:** protótipo › Início (`padding:16px 20px 0`; linha do número `gap:8px`); spec › Design › Início

**Observado:** cartão 358 de largura a 16 da borda; 24 px entre a faixa escura e o cartão; gap 6 entre o número e "pessoas".

**Evidência:**

- `screenshots/CH-09-01-inicio-cartao.png` — Início inteiro (comparado com `prototipo/01-inicio-390.png`)
- `screenshots/CH-09-04-cartao-cheio.png` — o cartão
- console: nada
- rede: nada

### A-4 · [Loja ao vivo] Cabeçalho com 61 px de altura — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-02 · passos 04 e 07 do log                                          |
| TC                  | TC-UI-002                                                             |
| Gravidade proposta  | low — 1 px, imperceptível                                             |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Entrar como `admin-atelie` a 390 × 844 e abrir `/ao-vivo`
2. Medir a altura do `header`

**Esperado:** 60 px com a borda inferior `line` — **fonte:** protótipo › Loja ao vivo, cabeçalho (`height:60px`, borda inclusa)

**Observado:** 61 px (60 + a borda de 1 px fora da altura).

**Evidência:**

- `screenshots/CH-09-02-ao-vivo-cheio.png`
- console: nada
- rede: nada

## Design

**Protótipo:** `a780eec8-8aba-4d6e-8b4c-2c485e2750c7` · Ateliê Admin.dc.html · `claude_design` · lido pelo MCP da fonte (listagem: etag `1793064028832969`, igual ao da cópia decodificada em `.specs/features/83-loja-ao-vivo/prototipo/Atelie-Admin.dc.html`, de onde os trechos das telas foram lidos) e pelas capturas em 390

| #  | Tela · frame         | Elemento        | Propriedade   | Design                 | Observado              | Evidência                          | Achado |
| -- | -------------------- | --------------- | ------------- | ---------------------- | ---------------------- | ---------------------------------- | ------ |
| D1 | `/` · Início › cartão "Agora na loja" | área do cartão | `padding-left/right` · `padding-top` | `20` · `16` | `16` · `24` (390) | `screenshots/CH-09-01-inicio-cartao.png` | A-3 |
| D1b | `/` · Início › cartão | linha número + "pessoas" | `column-gap` | `8` | `6` (390) | `screenshots/CH-09-04-cartao-cheio.png` | A-3 |
| D2 | `/ao-vivo` · bloco A e célula "No celular" | eyebrow "Agora na loja", "No celular" | `font-family` | `Outfit` (`--font-body`) | `Libre Baskerville` (390) | `screenshots/CH-09-02-ao-vivo-cheio.png` | A-1 |
| D3 | `/ao-vivo` · bloco A | eyebrow e "pessoas nos últimos 5 minutos" | `color` | `#ffffff` 80 % (`on-ink-strong`) | `#f7f3ec` 100 % (390) | `screenshots/CH-09-02-ao-vivo-cheio.png` | A-2 |
| D3b | `/ao-vivo` · bloco A | legendas "30 min atrás"/"agora" | `color` | `#ffffff` 62 % (`on-ink`) | `#f7f3ec` 75 % (390) | idem | A-2 |
| D3c | `/ao-vivo` · bloco A | barras antigas do gráfico | `background-color` | `#ffffff` 12 % (`on-ink-border`) | `#f7f3ec` 20 % (390) | idem | A-2 |
| D4 | `/ao-vivo` · cabeçalho | `header` | `height` | `60` | `61` (390) | idem | A-4 |

**Telas não conferidas:** nada (só o frame de 390 existe; nenhum outro viewport comparado)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| O seletor Hoje/Ontem/Semana de Acessos tem botões de 44 px; o protótipo desenha 40 px. A regra do projeto de alvo de toque de 44 px contradiz o frame, e nenhuma das 18 divergências listadas na `spec.md` trata disso. Superfície da feature 83, fora do que o Work Item 90 mudou | 05 | pré-existente |

## Fora da cobertura

- A faixa "Outros" em D (variação de TC-UI-003) — nenhuma cliente de Outros nesta massa; a cor dela não tem régua no design
- O Guia de envio na lista C com o ícone `envio` — não posto em jogo nesta massa (conferido no CH-04)
- A variação de Acessos em "Com sacola"/"Vendas"/"Conversão" na alta — a massa só deu variação em Visitas na alta; a queda e o 0% (ink-soft, decidido pela spec da 83) foram vistos
- Estados não desenhados (carregando, falha, vazio, não medida, recusa) — fora do escopo do charter
- Alturas que dependem do dado (cartão 116 × 125 do protótipo; barras do gráfico) — sem régua

## Debrief

- **Surpresas:** o primeiro "adicionar" por texto acertou "Adicionar aos favoritos" (a página tem os dois botões); a cliente da sacola só apareceu depois do clique em "Adicionar à sacola" exato
- **Próximo charter:** nada
- **Padrão novo:** comparar o eyebrow de cada bloco com o de outro bloco da mesma tela achou a fonte trocada (headings `h2` herdam a fonte display)
