# Reteste — 90-loja-ao-vivo-presenca (rodada 2, confirmação)

| Campo      | Valor |
| ---------- | ----- |
| Rodada     | 2026-11-02 · início 10:18 · fim 10:30 |
| Ambiente   | app do ateliê http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · build não exposto · Chromium headless (Playwright MCP) · banco local com `production_host = localhost`; `*.supabase.co` e `**/g/collect*` bloqueados; três clientes anônimas em contextos isolados com `navigator.webdriver` neutralizado e UA de iPhone (A, na joia de nome longo), Android (B, joia na sacola) e Mac (C, sacola → `/checkout`); cliques na loja por `dispatchEvent`; fonte grande emulada por `font-size` no `<html>`; falha de leitura provocada abortando só `rpc/store_live` ou `rpc/store_movement`, com `navigator.onLine` verdadeiro |
| Bugs lidos | 8 de `issues/` com status `open` |

Contagem: resolved 8 · still-open 0 · cannot-reproduce 0 · blocked 0

## BUG-001 · [Início] Cartão "Agora na loja" segue mostrando o último número quando a leitura ao vivo falha, sem aviso

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-01 Adri · conta: `admin-atelie` (arquivo de credenciais do QA local) |
| Passos de  | `issues/BUG-001.md` |
| Tentativas | 2 · 2 |
| Viewport   | 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Três clientes anônimas na loja (build), cookies aceitos: A na joia, B com joia na sacola, C no `/checkout`
2. Entrar no app como `admin-atelie`, abrir o Início e esperar o cartão com número ("3 pessoas", "1 com joia na sacola · 1 no checkout")
3. Abortar só `rpc/store_live`, rede ligada
4. Ficar no Início sem tocar por 70 s (1ª tentativa) e 36 s (2ª, depois de recarregar)

**Esperado:** na releitura que falha com número na tela, o cartão diz que não conseguiu atualizar e oferece "Tentar de novo", em vez de apresentar o número antigo como atual.

**Observado:** nas duas tentativas, a partir da primeira releitura falha (entre 10 s e 20 s) o cartão acrescenta "Não consegui atualizar agora." e "Tentar de novo" abaixo do funil, e o nome acessível passa a "Agora na loja, 3 pessoas. Não consegui atualizar agora. Tentar de novo". O aviso fica enquanto a leitura falha (amostrado a cada 10 s até 70 s). Tocar no cartão com a leitura ainda falhando relê (2 chamadas abortadas) e fica no Início, com o aviso. Com a leitura de volta, o toque relê, o aviso some e o nome acessível volta a "… Abrir loja ao vivo"; o toque seguinte abre `/ao-vivo`.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | o cartão com as duas leituras boas: "3 pessoas" e o funil, sem aviso |
| Passo seguinte da jornada | ok | depois de a leitura voltar, o toque abre a Loja ao vivo |
| Mesma ação com outro dado | ok | só `rpc/store_movement` falhando: o cartão continua sem aviso (a presença está boa) e o Início mostra o "Não consegui atualizar agora." da faixa; com a fonte a 200 % e o aviso na tela, `scrollWidth` 390 e coluna de texto e aviso com 244 px |

**Evidência:**

- `screenshots/retest-BUG-001.png` — o cartão com "3 pessoas" e "Não consegui atualizar agora." · "Tentar de novo"
- `screenshots/retest-BUG-001-aviso-200.png` — o mesmo a 200 %, legível
- `screenshots/retest-BUG-001-voltou.png` — o aviso some quando a leitura volta
- console: só os `net::ERR_FAILED` das chamadas abortadas de propósito · rede: `POST /rest/v1/rpc/store_live → abortada` (provocado)

## BUG-002 · [Loja ao vivo] "Atualizado agora" no topo quando uma das duas leituras falhou ou ainda não chegou

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-01 Adri · conta: `admin-atelie` |
| Passos de  | `issues/BUG-002.md` |
| Tentativas | 2 · 2 por variação (presença falhando, Acessos falhando) e 1 com a presença atrasada |
| Viewport   | 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Entrar como `admin-atelie`
2. Abortar `rpc/store_live`
3. Abrir/recarregar http://localhost:8084/ao-vivo
4. Ler a linha abaixo de "Loja ao vivo" por ~12 s

**Esperado:** com uma das leituras sem dado (falhou ou ainda não chegou), a linha não afirma "Atualizado agora" nem "há N s".

**Observado:** presença falhando (2 de 2): o cabeçalho só com "Loja ao vivo", sem linha de frescor, os cinco blocos de presença em "Não consegui carregar.". Acessos falhando (2 de 2): sem linha de frescor, Acessos em "Não consegui carregar.". Presença atrasada 4 s: sem linha até a presença chegar; aí "Atualizado há 4 s" — a idade da leitura de Acessos, a mais velha (D-14). Com as duas boas: "Atualizado agora", "há 4 s", "há 7 s". Releitura da presença falhando com dado na tela: "Não consegui atualizar agora." no lugar do frescor, como antes.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | entrada pelo cartão do Início: a tela abre com as duas leituras boas e frescor |
| Passo seguinte da jornada | ok | releitura falha com dado: "Não consegui atualizar agora." no cabeçalho, blocos com a última leitura |
| Mesma ação com outro dado | ok | sem a linha de frescor o cabeçalho continua com 60 px e o título centrado (18,9 px acima e 19,9 abaixo) |

**Evidência:**

- `screenshots/retest-BUG-002.png` — presença falhando: cabeçalho sem frescor acima dos blocos em falha
- `screenshots/retest-BUG-002-acessos-falha.png` — Acessos falhando: sem frescor
- `screenshots/retest-BUG-002-ambas-boas.png` — as duas boas: "Atualizado…"
- console: só os `net::ERR_FAILED` provocados · rede: `rpc/store_live` / `rpc/store_movement → abortada` (provocado)

## BUG-003 · [Início] Com a fonte a 200 %, o cartão "Agora na loja" espreme o texto e o funil cobre o mini gráfico — para quem usa fonte grande

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-02 Adri à noite, fonte 200 % · conta: `admin-atelie` |
| Passos de  | `issues/BUG-003.md` |
| Tentativas | 2 · 9 medidas (390, 360, 320 × 100, 130, 200 %) e as capturas numa segunda passada |
| Viewport   | 390 × 844, 360 × 800, 320 × 568 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Clientes B (sacola) e C (`/checkout`) na loja; A numa joia
2. Entrar como `admin-atelie` em 390 × 844, abrir o Início
3. Esperar "3 pessoas" e "1 com joia na sacola · 1 no checkout"
4. Fonte raiz a 200 % (e 130 %), em 390, 360 e 320

**Esperado:** número, "pessoas", a linha do funil e o mini gráfico legíveis, sem texto espremido nem sobreposto, a 200 % em 390 e 360.

**Observado:** a 200 % o mini gráfico e a seta descem para baixo do texto: coluna de texto com 244 px (390), 214 px (360) e 174 px (320); funil em 1 linha (2 em 320); sobreposição funil × gráfico e texto × cauda: nenhuma; nenhum elemento do texto transborda; `scrollWidth` igual à tela nos 9 casos. A 130 % o mesmo empilhamento (coluna 294/264/224 px). A 100 % em 390 e 360 o desenho do protótipo continua (texto à esquerda, gráfico e seta à direita, sem sobreposição).

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | a faixa escura e "Precisa de você" a 200 % sem rolagem lateral |
| Passo seguinte da jornada | ok | o toque abre a Loja ao vivo |
| Mesma ação com outro dado | ok | com o aviso de releitura falha a 200 % (ver BUG-001): coluna de 244 px, legível. A 320 × 568 a 100 % o gráfico também desce para baixo do texto (coluna de 246 px) — não é o desenho de 390, mas não sobrepõe nada |

**Evidência:**

- `screenshots/retest-BUG-003.png` — 390 × 844, 200 %: texto legível, gráfico abaixo
- `screenshots/retest-BUG-003-360-200.png` — 360 × 800, 200 %
- `screenshots/retest-BUG-003-320-200.png` — 320 × 568, 200 %
- `screenshots/retest-BUG-003-390-130.png` — 390, 130 %
- console: `nada` · rede: `nada`

## BUG-004 · [Loja ao vivo] Com a fonte a 200 %, o nome em "Joias sendo vistas agora" vira tira estreita e cobre "1 pessoa" em 320

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-02 Adri à noite, fonte 200 % · conta: `admin-atelie` |
| Passos de  | `issues/BUG-004.md` |
| Tentativas | 2 · 9 medidas × 2 linhas (joia de nome longo e "Pingente Afetivo Dois Corações com Leite Materno") |
| Viewport   | 390 × 844, 360 × 800, 320 × 568 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Cliente A na loja em "Joia Afetiva Árvore da Vida Flores com Leite Materno e Cabelo" (B e C na outra joia)
2. Entrar como `admin-atelie` e abrir `/ao-vivo`
3. Fonte a 200 % e olhar "Joias sendo vistas agora" em 390
4. Estreitar para 360 e 320 × 568

**Esperado:** com a fonte grande, nome da joia e número de pessoas legíveis, sem texto sobreposto.

**Observado:** a 200 % o "1 pessoa" desce para baixo do nome nas três larguras, e o nome passa a usar a largura toda ao lado da foto: 196 px (390), 166 px (360), 126 px (320), contra 124/94/54 px na rodada 1. Sobreposição nome × contagem: nenhuma; transbordo do nome ou da linha: nenhum; `scrollWidth` igual à tela. A 130 % em 320 a contagem também desce; em 390 e 360 fica ao lado (nome com 186/156 px). A 100 % em 390 a linha é a do protótipo (foto · nome · "1 pessoa" à direita).

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | "Agora na loja" e "O que estão fazendo" a 200 % sem rolagem lateral |
| Passo seguinte da jornada | ok | "De onde vieram" e Acessos em uma coluna a 200 % |
| Mesma ação com outro dado | ok | a segunda linha (nome médio) segue a mesma regra; observação: a 200 % em 320 o nome longo ainda ocupa 320 px de altura (8 linhas de 2 palavras), legível e sem sobrepor — consequência da largura da tela, não do bug |

**Evidência:**

- `screenshots/retest-BUG-004-320-200.png` — 320 × 568, 200 %: "1 pessoa" abaixo do nome, sem sobrepor
- `screenshots/retest-BUG-004-360-200.png` · `retest-BUG-004-390-200.png` — 360 e 390 a 200 %
- `screenshots/retest-BUG-004-390-100.png` — 390 a 100 %, desenho do protótipo
- console: `nada` · rede: `nada`

## BUG-005 · [Loja ao vivo] Rótulos "Agora na loja" e "No celular" saem em fonte serifada, fora do protótipo

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-01 Adri · conta: `admin-atelie` |
| Passos de  | `issues/BUG-005.md` |
| Tentativas | 2 · 2 (antes e depois de recarregar) |
| Viewport   | 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Cliente anônima numa joia
2. Entrar como `admin-atelie` a 390 × 844 e abrir `/ao-vivo`
3. Comparar "AGORA NA LOJA" e "NO CELULAR" com "VISITAS"

**Esperado:** os dois rótulos em Outfit 11/600, caixa alta, .1em.

**Observado:** "Agora na loja" (`h2`) e "No celular" (`h2`) em Outfit 11 px 600, caixa alta, 1.1px — iguais a "Visitas" e "Com sacola" de Acessos. Os dois continuam `h2`.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | eyebrow do cartão do Início segue Outfit |
| Passo seguinte da jornada | ok | Acessos sem mudança |
| Mesma ação com outro dado | ok | os títulos "O que estão fazendo", "Joias sendo vistas agora", "De onde vieram" seguem Libre Baskerville 17/700, como os `h3` de 17 px do protótipo — a mudança em `estilo.ts` não os alcançou |

**Evidência:**

- `screenshots/retest-BUG-005.png` — a Loja ao vivo inteira a 390
- console: `nada` · rede: `nada`

## BUG-006 · [Loja ao vivo] No bloco escuro "Agora na loja", textos e barras antigas em creme opaco no lugar do branco translúcido

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-01 Adri · conta: `admin-atelie` |
| Passos de  | `issues/BUG-006.md` |
| Tentativas | 2 · 2 |
| Viewport   | 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Cliente anônima numa joia
2. Entrar como `admin-atelie` a 390 × 844 e abrir `/ao-vivo`
3. Conferir as cores no bloco escuro

**Esperado:** rótulo e frase #ffffff 80 %; legendas #ffffff 62 %; barras antigas #ffffff 12 %; número e barra de agora `accent`.

**Observado:** rótulo `rgba(255,255,255,.8)`; "pessoas nos últimos 5 minutos" `rgba(255,255,255,.8)`; "30 min atrás" e "agora" `rgba(255,255,255,.62)`; 29 barras antigas `rgba(255,255,255,.12)`; número "3" e a barra atual em `rgb(184,148,95)` (`accent`). Fundo do bloco `rgb(35,48,58)`.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | cabeçalho sem mudança |
| Passo seguinte da jornada | ok | "O que estão fazendo" sem mudança de cor (`rgb(35,48,58)` no título) |
| Mesma ação com outro dado | ok | o mesmo bloco a 200 % em 320, sem rolagem lateral |

**Evidência:**

- `screenshots/retest-BUG-006.png` — o bloco escuro
- console: `nada` · rede: `nada`

## BUG-007 · [Início] Cartão "Agora na loja" com recuo e espaçamento do número fora do protótipo

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-01 Adri · conta: `admin-atelie` |
| Passos de  | `issues/BUG-007.md` |
| Tentativas | 2 · 2 (antes e depois de navegar de volta ao Início) |
| Viewport   | 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Cliente anônima numa joia
2. Entrar como `admin-atelie` a 390 × 844 e abrir o Início
3. Medir posição do cartão e espaço número–"pessoas"

**Esperado:** cartão de 350 px a 20 px da borda, 16 px abaixo da faixa escura, 8 px entre o número e "pessoas".

**Observado:** cartão em x = 20, 350 px de largura; 16 px entre a faixa escura (`section`, bottom 372) e o cartão (top 388); 8 px entre "3" e "pessoas". Mesmo valor nas duas tentativas.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | faixa escura sem mudança |
| Passo seguinte da jornada | ok | 24 px entre o cartão e "Precisa de você" |
| Mesma ação com outro dado | ok | comparado com a captura `01-inicio-390.png` do protótipo: mesma caixa e posição. Observação fora deste bug: "Precisa de você" e os cartões abaixo seguem a 16 px da borda, e no protótipo estão a 20 px — o bug registrou essa coerência como aceita e não pediu mudar os vizinhos |

**Evidência:**

- `screenshots/retest-BUG-007.png` — o Início a 390, 100 %
- console: `nada` · rede: `nada`

## BUG-008 · [Loja ao vivo] Cabeçalho com 61 px de altura, 1 px acima do protótipo

| Campo      | Valor |
| ---------- | ----- |
| Resultado  | resolved |
| Persona    | PER-01 Adri · conta: `admin-atelie` |
| Passos de  | `issues/BUG-008.md` |
| Tentativas | 2 · 4 (com e sem frescor, antes e depois de recarregar) |
| Viewport   | 390 × 844 |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. Entrar como `admin-atelie` a 390 × 844
2. Abrir `/ao-vivo`
3. Medir a altura do `header`

**Esperado:** 60 px com a borda inferior incluída.

**Observado:** 60 px, `box-sizing: border-box`, borda inferior de 1 px dentro da altura; igual com a linha de frescor e sem ela.

**Entorno:**

| Onde                      | Resultado | Nota |
| ------------------------- | --------- | ---- |
| Passo anterior da jornada | ok | Voltar e título no lugar |
| Passo seguinte da jornada | ok | o conteúdo começa logo abaixo, sem sobreposição |
| Mesma ação com outro dado | ok | fonte grande: o cabeçalho cresce (`min-height` 60) para 68,6 px a 130 % e 105 px a 200 % em 390, 360 e 320, sem conteúdo vazando da caixa; a 200 % em 320 o "Atualizado há 12 s" quebra em duas linhas e o "s" fica sozinho na segunda — legível, cosmético |

**Evidência:**

- `screenshots/retest-BUG-008.png` — o cabeçalho a 390
- `screenshots/retest-BUG-008-320-200.png` — o cabeçalho a 320, 200 %, crescendo sem vazar
- console: `nada` · rede: `nada`

## Achados novos no entorno

nada
