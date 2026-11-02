# Sessão CH-08 · CFR — saber se tem alguém na loja e entender o que fazem

| Campo       | Valor |
| ----------- | ----- |
| Charter     | `test-plans/charters/CH-08-cfr.md` · cfr · P1 |
| Status      | done |
| Persona     | PER-02 Adri à noite, fonte 200 % · conta: `admin-atelie` (arquivo de credenciais do QA local, nunca o valor) · três clientes `anonima` em contextos isolados como estímulo |
| Tour · modo | — |
| Rodada      | exploração |
| Orçamento   | 19 ações de browser de 35 |
| Ambiente    | app http://localhost:8084 (dev) · loja http://localhost:8082 (build, `vite preview`) · build não exposto · Chromium headless (Playwright MCP) · viewports 390 × 844, 360 × 800, 320 × 568, 1440 × 900 |
| Paridade    | build de dev do app; banco local; `production_host` semeado como `localhost`; só Chromium; fonte grande emulada por `font-size` no `<html>` (130 % e 200 %), não pela fonte do sistema; movimento reduzido e tema escuro por `emulateMedia`; clientes com `navigator.webdriver` neutralizado e UA de iPhone (A, `?utm_source=instagram`, olhando), Android (B, sacola) e Mac (C, `referer` Google, sacola → `/checkout`); `*.supabase.co` e `**/g/collect*` bloqueados; cliques na loja por `dispatchEvent`; medidas de layout e sondagem do oráculo feitas dentro de `browser_run_code_unsafe` (várias leituras por ação); falha de leitura provocada abortando `rpc/store_live` |

## Missão

Refazer J-01 e J-02 como a Adri cansada, com a fonte no máximo e a tela lida em voz alta, procurando número
sobreposto, rolagem de lado, nome que não se entende e animação que não respeita "reduzir movimento".

## Passos

| #  | A persona tentou | Viu | Evidência |
| -- | ---------------- | --- | --------- |
| 01 | (preparo) entra no app a 390 × 844; três clientes abrem a loja: A numa joia vinda do Instagram (iPhone), B com joia na sacola (Android), C com sacola no `/checkout` (computador, vinda do Google) | em ~20 s o cartão do Início: "Agora na loja, 3 pessoas. Abrir loja ao vivo"; a 100 %: "3", "pessoas", "1 com joia na sacola · 1 no checkout"; cartão 358 × 135; `scrollWidth` 390 | — |
| 02 | olha o cartão com a fonte a 130 % | `scrollWidth` 390; coluna de texto 118 px; linha do funil em 3 linhas; nada sobreposto | `screenshots/CH-08-02-inicio-cartao-130.png` |
| 03 | olha o cartão com a fonte a 200 % | `scrollWidth` 390, mas a coluna de texto do cartão encolhe a **0 px** de largura (o mini gráfico de 15 barras passa a 192 × 80 e a seta a 40 px ocupam todo o miolo); "Agora na loja", "pessoas" e "1 com joia na sacola · 1 no checkout" quebram uma palavra por linha (a linha do funil vira 9 linhas) e transbordam para a direita; a última palavra ("checkout") pinta por cima das barras do mini gráfico; o cartão cresce para 385 px de altura | `screenshots/CH-08-03-inicio-cartao-200.png` |
| 04 | recarrega e repete a 200 % em 390 e em 360 × 800; depois 360 a 130 %, 320 a 100 % e 320 a 130 % | 390@200 e 360@200: igual ao passo 03 (coluna 0 px, 9 linhas, 1 linha sobre o gráfico). 360@130: coluna 88 px, 3 linhas, sem sobreposição. 320@100: coluna 110 px. 320@130: coluna 48 px, funil em 5 linhas, sem sobreposição. `scrollWidth` igual à tela em todos | `screenshots/CH-08-04-inicio-cartao-360-200.png` |
| 05 | toca no cartão e lê a árvore da Loja ao vivo (100 %) | um `h1` "Loja ao vivo" com o foco, "Atualizado agora"; `h2` em cada bloco (Agora na loja, O que estão fazendo, Joias sendo vistas agora, De onde vieram, No celular, Acessos); "3 pessoas nos últimos 5 minutos"; Olhando 1 · Sacola 1 · Checkout 1 · Compraram 0; a nota do checkout literal; duas joias com "1 pessoa"; Instagram 1 · Google 1 · Direto 1; "2 de 3 / o resto pelo computador ou tablet"; nenhum botão sem nome; "Voltar" 44 × 44 | — |
| 06 | Loja ao vivo inteira a 100/130/200 % (390), 320@200 e 1440 | `scrollWidth` igual à tela em todos; "De onde vieram" 2 colunas a 100 % e 1 coluna a 130 % e 200 %; os quatro cartões de Acessos em 1 coluna a 200 %; nenhum texto sobreposto em 390. A 130 %/200 % as legendas "12h…21h" de "Visitas por horário" saem da tela (Fase 1, fora da Mudança). Em 320@200 dois pares sobrepostos: o nome da joia com "1 pessoa", e "Ontem" com "Semana" no seletor de período (Fase 1) | `screenshots/CH-08-05-ao-vivo-130.png` · `CH-08-06-ao-vivo-200.png` · `CH-08-07-ao-vivo-1440.png` |
| 07 | lê "Joias sendo vistas agora" a 200 % em 390, 360 e 320 | a coluna do nome encolhe a 124 px (390), 94 px (360) e 54 px (320); cada nome ("Joia Afetiva Árvore da Vida Flores com Leite Materno e Cabelo") ocupa 320–440 px de altura, duas ou três palavras por linha; "1 pessoa" fica fixo à direita sem escalar; em 320 palavras do nome transbordam sobre "1 pessoa" | `screenshots/CH-08-08-ao-vivo-320-200-joias.png` |
| 08 | liga "reduzir movimento" (200 %) e a cliente A põe a joia na sacola; observa as barras do funil | barras do funil com `transition-duration: 0s` com e sem a redução; nenhuma animação em curso na página (`getAnimations()` vazio) nos dois modos, inclusive o ponto dourado; ao mudar o estado (Sacola 1 → 2, Olhando 1 → 0, em ~2 s), as larguras foram de 86/86/86 para 0/174/86 num único quadro, sem largura intermediária | `screenshots/CH-08-09-ao-vivo-reduce-sacola-2.png` |
| 09 | tema escuro do sistema na Loja ao vivo | o app não troca de tema (fundo claro `rgb(250,248,244)`, título escuro); nada some nem fica invisível | `screenshots/CH-08-10-ao-vivo-tema-escuro.png` |
| 10 | só teclado do topo ao fim da Loja ao vivo | ordem: Voltar → Hoje → Ontem → Semana → volta ao documento; foco visível (anel do navegador) em cada um; alvos 44 × 44 e 114 × 44; nenhum controle nos blocos A–E (não são interativos) | — |
| 11 | lê o texto de todos os blocos com presença e na falha | nenhuma exclamação, nenhum emoji; "últimos" só em "últimos 5 minutos" e "últimos 30 min"; a nota do checkout sem prazo | — |
| 12 | força a falha da leitura da presença e recarrega a Loja ao vivo | `h1` presente; os cinco blocos A–E mostram cada um "Não consegui carregar." e um "Tentar de novo" (125–127 × 48); Acessos continua; nenhuma região `alert`/`status`/`aria-live` na página; o cabeçalho segue "Atualizado há 5 s" | `screenshots/CH-08-11-ao-vivo-falha.png` |
| 13 | com a falha ainda forçada, volta ao Início | o cartão vira botão com nome "Agora na loja: não consegui carregar. Tentar de novo" | — |
| 14 | tira a falha, recarrega o Início, confere movimento e 1440 | cartão de volta a "3 pessoas"; nenhuma animação com ou sem redução; a 1440 o cartão 1408 × 116, `scrollWidth` 1440 | `screenshots/CH-08-12-inicio-1440.png` |
| 15 | sai da conta e fecha os contextos das clientes | "Sair" leva a `/login` | — |

**Edge cases tentados:**

- 320 × 568 (100 %, 130 %, 200 %) — Início sem sobreposição até 130 %; Loja ao vivo com sobreposição a 200 % (A-2)
- 360 × 800 a 130 % e 200 % — mesmo defeito do cartão a 200 % (A-1)
- Tema escuro do sistema — o app ignora; nada invisível
- Só teclado — ordem e foco ok
- Movimento reduzido, com troca de estado da cliente — largura muda de uma vez; sem animação também sem a redução
- Falha da leitura da presença (rota abortada) — texto e botão com nome, sem região viva (A-3)

## Casos

| TC | Veredito | Passo | Evidência | Nota |
| -- | -------- | ----- | --------- | ---- |
| TC-CFR-001 | fail | 02–07 | `screenshots/CH-08-03-inicio-cartao-200.png` · `CH-08-08-ao-vivo-320-200-joias.png` | passo 1 ok (`scrollWidth` igual à tela em todas as telas e fontes); passo 2 ok ("De onde vieram" e Acessos em uma coluna a 200 %); passo 3 falha: cartão a 200 % com a coluna de texto em 0 px e "checkout" sobre o mini gráfico ⇒ A-1. Variação 1440 ok |
| TC-CFR-002 | pass | 08, 14 | `screenshots/CH-08-09-ao-vivo-reduce-sacola-2.png` | largura muda de uma vez com a redução; sem a redução também sem transição (o TC permite); ponto dourado parado nos dois modos. As barras de "De onde vieram" não mudaram nesta troca (a origem das clientes não mudou) — conferido só o funil. Variação tema escuro ok |
| TC-CFR-003 | pass | 01, 05, 10, 12, 13 | `screenshots/CH-08-11-ao-vivo-falha.png` | nome do cartão com plural certo; um `h1`; um `h2` por bloco; nenhum botão sem nome; alvos ≥ 44; teclado na ordem visual com foco visível. Passo 3: "Não consegui carregar." e "Tentar de novo" estão na árvore, mas sem região viva e repetidos cinco vezes com o mesmo nome ⇒ A-3 (friction). Variação "número mudando não rouba o foco" não medida |
| TC-CFR-004 | pass | 11, 12 | — | cheio, com checkout e falha lidos: sem exclamação, emoji ou urgência. Estados vazio, "não medida" e 1 pessoa não alcançados nesta sessão (ver Fora da cobertura) |

Contagem: pass 3 · fail 1 · blocked 0 · skip 0

## Achados

### A-1 · [Início] Com a fonte a 200 %, o cartão "Agora na loja" espreme o texto a zero de largura e a linha do funil pinta por cima do mini gráfico — para a Adri com a fonte grande

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri à noite, fonte 200 % |
| Jornada e passo     | J-01, passo 2 (lê a linha do funil e o mini gráfico) · passos 03–04 do log |
| TC                  | TC-CFR-001 |
| Gravidade proposta  | medium — o número continua legível, mas "Agora na loja", "pessoas" e a linha do funil viram uma palavra por linha e a última palavra cobre as barras; a Adri não consegue ler o funil de um olhar no Início, que é a promessa do cartão |
| Reproduziu          | sim (3 de 3: 390 × 844 duas vezes, 360 × 800 uma) |
| Viewport            | 390 × 844 e 360 × 800, fonte raiz 200 % |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no app do ateliê (http://localhost:8084) como `admin-atelie`, em 390 × 844
2. Ter pelo menos uma cliente com joia na sacola e outra no `/checkout` na loja (build em http://localhost:8082, cookies aceitos), para a linha "1 com joia na sacola · 1 no checkout" aparecer
3. Pôr a fonte raiz do documento a 200 % e olhar o cartão "Agora na loja"

**Esperado:** número, "pessoas", linha do funil e mini gráfico legíveis, sem sobrepor — **fonte:** TC-CFR-001 passo 3; PRD LAV-63; `CLAUDE.md` › Mobile é o caso principal (fonte grande)

**Observado:** a coluna de texto do cartão mede 0 px de largura (o mini gráfico ocupa 192 × 80 e a seta 40 px, que em 200 % tomam todo o miolo de ~260 px); "Agora na loja", "pessoas" e "1 com joia na sacola · 1 no checkout" quebram em uma palavra por linha (o funil em 9 linhas) e transbordam para a direita; a última linha ("checkout", 52 px) cruza as barras do mini gráfico; o cartão cresce de 135 para 385 px. A 130 % a coluna tem 118 px (390), 88 px (360) e 48 px (320, funil em 5 linhas) — sem sobreposição, mas já apertada. Sem rolagem lateral do body em nenhum caso.

**Evidência:**

- `screenshots/CH-08-03-inicio-cartao-200.png` — o cartão a 390 × 844, 200 %
- `screenshots/CH-08-04-inicio-cartao-360-200.png` — o mesmo a 360 × 800
- `screenshots/CH-08-02-inicio-cartao-130.png` — o par a 130 %, sem o defeito
- console: nada
- rede: nada

### A-2 · [Loja ao vivo] Com a fonte a 200 %, o nome da joia em "Joias sendo vistas agora" vira uma tira estreita de muitas linhas, e em 320 transborda sobre "1 pessoa" — para a Adri com a fonte grande

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri à noite, fonte 200 % |
| Jornada e passo     | J-02, passo 2 (relê a Loja ao vivo — a joia na lista C) · passos 06–07 do log |
| TC                  | TC-CFR-001 |
| Gravidade proposta  | low — o nome continua lá e o número "1 pessoa" também, mas cada joia vira um bloco de 320–440 px de altura com duas ou três palavras por linha; só no aparelho estreito (320) uma palavra cobre o "1 pessoa" |
| Reproduziu          | sim (3 de 3 larguras: 390, 360, 320, todas a 200 %; sobreposição só em 320) |
| Viewport            | 390 × 844, 360 × 800, 320 × 568, fonte raiz 200 % |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no app do ateliê como `admin-atelie`; ter uma cliente na loja (build) com cookies aceitos numa joia de nome longo (ex.: "Joia Afetiva Árvore da Vida Flores com Leite Materno e Cabelo")
2. Abrir http://localhost:8084/ao-vivo, pôr a fonte raiz a 200 %
3. Olhar "Joias sendo vistas agora" a 390, depois a 320 × 568

**Esperado:** nenhum texto sobreposto ou que não se entenda com a fonte grande — **fonte:** TC-CFR-001 (metas: texto sobreposto nenhum); CH-08 Missão ("nome que não se entende"); PRD LAV-63

**Observado:** a foto (40 px) e o "1 pessoa" (que não cresce com a fonte, 48 × 20, `nowrap`) ficam fixos e a coluna do nome encolhe a 124 px (390), 94 px (360) e 54 px (320); cada nome ocupa 320–440 px de altura. Em 320 × 568 palavras do nome passam da coluna (transbordo visível) e cobrem "1 pessoa".

**Evidência:**

- `screenshots/CH-08-08-ao-vivo-320-200-joias.png` — a lista a 320 × 568, 200 %
- `screenshots/CH-08-06-ao-vivo-200.png` — a página inteira a 390, 200 %
- console: nada
- rede: nada

### A-3 · [Loja ao vivo] Na falha, cinco blocos repetem "Não consegui carregar." e cinco botões "Tentar de novo" com o mesmo nome, sem região viva — para quem ouve a tela

| Campo               | Valor |
| ------------------- | ----- |
| Persona             | PER-02 Adri à noite, fonte 200 % (leitor de tela simulado pela árvore) |
| Jornada e passo     | J-02, passo 2 (relê a Loja ao vivo) com a leitura falhando · passo 12 do log |
| TC                  | TC-CFR-003 passo 3 |
| Gravidade proposta  | low — a Adri entende que falhou e consegue tentar de novo, mas pelo leitor ouve cinco vezes a mesma frase e cinco botões idênticos sem saber de qual bloco é cada um, e a falha não é anunciada se acontecer com a tela aberta |
| Reproduziu          | sim (1 de 1 na Loja ao vivo; o Início mostra um só botão, com nome próprio) — uma tentativa só, por orçamento |
| Viewport            | 390 × 844 |

**Passos para reproduzir** — de um estado limpo:

1. Entrar no app do ateliê como `admin-atelie` e abrir http://localhost:8084/ao-vivo
2. Fazer a leitura da presença falhar (no QA, abortando a chamada `rpc/store_live`) e recarregar
3. Ler a árvore de acessibilidade

**Esperado:** "Não consegui carregar." anunciado; "Tentar de novo" é botão com nome — **fonte:** TC-CFR-003 passo 3; checklist CFR › mensagem dinâmica como `alert`/`status`/região viva; botão com nome que descreve a ação

**Observado:** cada um dos blocos Agora na loja, O que estão fazendo, Joias sendo vistas agora, De onde vieram e No celular mostra "Não consegui carregar." e um botão "Tentar de novo" (125–127 × 48); os cinco botões têm o mesmo nome acessível; não há `role=alert`, `role=status` nem `aria-live` na página. O cabeçalho continua "Atualizado há 5 s" (já tratado no CH-06).

**Evidência:**

- `screenshots/CH-08-11-ao-vivo-falha.png` — a tela com os cinco blocos em falha
- console: 2 erros (a requisição abortada de propósito)
- rede: `POST /rest/v1/rpc/store_live → abortada (provocado)`

## CFR

| Jornada | Categoria             | Marca    | Itens que não passaram | Achado |
| ------- | --------------------- | -------- | ---------------------- | ------ |
| J-01    | Usabilidade           | pass     | — (linguagem, status visível, minimalismo ok; nome do cartão com plural) | — |
| J-01    | Acessibilidade        | friction | sem quebra a 200 %: o cartão espreme o texto | A-1 |
| J-01    | Performance percebida | pass     | o cartão mostrou "3 pessoas" ~20 s depois das clientes (dentro do atraso declarado); recarga já traz o número | — |
| J-01    | Compatibilidade       | fail     | fonte 200 % em 390/360: texto sobre o mini gráfico | A-1 |
| J-02    | Usabilidade           | pass     | sem exclamação, emoji ou urgência; nota do checkout sem prazo | — |
| J-02    | Acessibilidade        | friction | falha sem região viva e cinco "Tentar de novo" iguais; nome da joia ilegível a 200 % em tela estreita | A-2 · A-3 |
| J-02    | Performance percebida | pass     | a troca de estado da cliente apareceu em ~2 s com a tela aberta; largura das barras muda num quadro | — |
| J-02    | Compatibilidade       | friction | 320@200: nome da joia sobre "1 pessoa"; demais larguras sem sobreposição; tema escuro ignorado sem prejuízo; movimento reduzido ok | A-2 |

**Categorias fora:** Recuperação de erro — coberta pelo CH-06 na mesma superfície (a falha foi provocada só para ler a árvore, TC-CFR-003). Paridade com produção — condição registrada no cabeçalho (build de dev do app, banco local, `production_host = localhost`, só Chromium, fonte emulada pela raiz).

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta |
| ----------------------- | ------------ | --------------- |
| Nenhuma fonte define o que o cartão do Início deve fazer com o mini gráfico quando a fonte cresce (encolher, ir para baixo do texto, sumir); hoje ele não cede espaço e é o texto que some — o achado A-1 tem esperado pela meta "sem sobrepor", mas a forma da correção não está escrita | 03–04 | polimento |

## Fora da cobertura

- Estados vazio ("Ninguém na loja agora"), "não medida" e "1 pessoa" (TC-CFR-004 e a variação de singular) — pedem as clientes saírem e 5 min de espera, ou mexer no `production_host`, que é do orquestrador; orçamento
- Variação de TC-CFR-003 "uma cliente entra com o leitor ativo, a mudança não rouba o foco" — o foco não foi lido no momento da troca do passo 08
- Barras de "De onde vieram" mudando de largura com movimento reduzido — a troca feita só mexeu no funil
- Leitor de tela real (TalkBack) e o Android real com a fonte do sistema — fora do browser da sessão; a fonte foi emulada pela raiz do documento, e textos em `px` (o número do cartão, "1 pessoa" da lista C, a linha do funil a 13 px) não crescem nessa emulação como cresceriam talvez num aparelho
- Safari, Firefox — só Chromium
- Pré-existente, fora da Mudança (sem achado): a 130 % e 200 % as legendas "12h…21h" de "Visitas por horário" saem da tela; a 200 % em 360/320 o texto "Semana" do seletor de período passa da largura do botão e, em 320, "Ontem" encosta em "Semana"; o app não tem tema escuro

## Debrief

- **Surpresas:** o cartão do Início, que a 100 % e 130 % parece sólido, quebra de vez a 200 %: o mini gráfico de largura fixa em `rem` cresce junto com a fonte e não deixa espaço nenhum ao texto. As grades `auto-fit` da Loja ao vivo (De onde vieram, Acessos) caíram para uma coluna como prometido
- **Próximo charter:** reteste de A-1 e A-2 a 130/200 % em 320, 360 e 390, e uma sessão curta para os estados vazio, 1 pessoa e "não medida" com fonte grande
- **Padrão novo:** medir a largura da coluna de texto (não só o `scrollWidth`) acha o "texto espremido a zero" que a régua de rolagem lateral não vê; o gravador de larguras por `requestAnimationFrame` prova "mudou de uma vez" sem relógio
