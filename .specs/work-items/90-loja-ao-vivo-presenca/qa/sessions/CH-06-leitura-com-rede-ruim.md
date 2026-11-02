# Sessão CH-06 · A leitura ao vivo com a rede ruim e o celular em segundo plano

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Charter     | `test-plans/charters/CH-06-leitura-com-rede-ruim.md` · exploratório · P1 |
| Status      | done (TC-FUNC-019 blocked por massa) |
| Persona     | PER-01 Adri · conta: `admin-atelie` (credencial do arquivo de credenciais do QA local, nunca o valor) · 1 cliente `anonima` num contexto isolado |
| Tour · modo | Network · com tour |
| Rodada      | exploração |
| Orçamento   | 49 ações de browser de 50 |
| Ambiente    | app do ateliê http://localhost:8084 (dev) · loja http://localhost:8082 (build) · build não exposto · Chromium headless (Playwright MCP) · viewport 390 × 844 |
| Paridade    | banco local com `production_host = localhost`; `*.supabase.co` e `**/g/collect*` bloqueados; a cliente num contexto separado com `navigator.webdriver` neutralizado e UA de iPhone; falha de leitura provocada por rota (`rpc/store_live` ou `rpc/store_movement` abortados, com `navigator.onLine` verdadeiro — é a "rede ruim" de verdade; o corte total foi por `setOffline`); segundo plano por `visibilityState`/`visibilitychange` emulados no documento; relógio por `page.clock` (instalado e em tempo corrente); puxar para atualizar por eventos de toque do CDP; as leituras foram contadas por um registrador na rota |

## Missão

Achar qualquer estado em que a Adri veja número velho sem saber, um "Tentar de novo" que não relê, ou leituras
saindo com o app escondido.

## Passos

| #  | A persona tentou            | Viu                                       | Evidência                 |
| -- | --------------------------- | ----------------------------------------- | ------------------------- |
| 01 | Entrar e ficar no Início ~100 s sem tocar | leitura ao vivo a cada 30 s (11 s, 41 s, 71 s, 101 s), junto com a do movimento; o cartão "Agora na loja" com o número | — |
| 02 | Puxar para atualizar no Início, longe de um tique (22 s depois do último) | "Solte para atualizar" e, ao soltar, as duas leituras saem na hora (~20 ms depois de soltar) | — |
| 03 | (preparo) uma cliente abre a loja e fica na página de uma joia, num contexto isolado | o cartão passa a "Agora na loja, 1 pessoa" | — |
| 04 | Tocar no cartão e ficar ~52 s na Loja ao vivo | `h1` "Loja ao vivo", aba "Loja ao vivo · Ateliê"; leitura a cada 15 s; "Atualizado agora" logo depois de cada uma, depois "Atualizado há {s} s" contando (3, 7, 11, agora, 4, 8, 12, agora…) | — |
| 05 | Deixar o app escondido 2 min na Loja ao vivo; voltar | escondido: **zero** leituras em 120 s e em 40 s (segunda vez), o frescor chegou a "Atualizado há 48 s"/"há 2 min"; ao voltar: as duas leituras em ~10 ms, "Atualizado agora" em 2 s, e o ritmo de 15 s retomado | — |
| 06 | Cortar a rede inteira (offline) com a Loja ao vivo aberta | em ~6 s a tela inteira troca para "Sem conexão. Os dados da loja aparecem quando a internet voltar." com "Tentar de novo"; aba "Sem conexão · Ateliê" | `screenshots/CH-06-05-offline-sem-conexao.png` |
| 07 | Restaurar a rede e tocar em "Tentar de novo" | antes do toque a tela já tinha voltado sozinha: "Loja ao vivo", "Atualizado há 6 s", "1 pessoa" | — |
| 08 | Falhar só a leitura ao vivo, com a tela já carregada | no lugar do frescor, "Não consegui atualizar agora."; os blocos A–E continuam mostrando "1 pessoa", o funil e as joias da última leitura boa; **nenhum "Tentar de novo"** e nenhuma idade do número; Acessos de pé. Repetido entrando pelo cartão com a leitura já falhando: o mesmo por 24 s | `screenshots/CH-06-08-ao-vivo-so-presenca-falha.png` |
| 09 | Recarregar a Loja ao vivo com a leitura ao vivo falhando | os quatro blocos com "Não consegui carregar." e "Tentar de novo"; Acessos com os números; mas o topo diz **"Atualizado agora"**, depois "há 4 s", "há 9 s"… | `screenshots/CH-06-09-ao-vivo-falha-fria-atualizado-agora.png` |
| 10 | Desbloquear e dar dois toques rápidos em "Tentar de novo" | **uma** leitura ao vivo; os números voltam em ~1 s; o frescor diz "Atualizado há 14 s" (a idade da leitura de Acessos, a mais velha) e depois "agora" | — |
| 11 | Falhar só a leitura do movimento e recarregar | Acessos com "Não consegui carregar." e "Tentar de novo"; os blocos A–E com os números; o topo diz "Atualizado há 8 s" | — |
| 12 | No Início, recarregar com a leitura ao vivo falhando; depois desbloquear e tocar "Tentar de novo"; depois falhar de novo com o número na tela | frio: o cartão com "Não consegui carregar." e "Tentar de novo", o resto do Início de pé; o toque relê sem abrir a Loja ao vivo e o "1 pessoa" volta. Quente: **o cartão segue "1 pessoa" por mais de 2 min**, com 4 leituras falhas (2 s, 33 s, 64 s…), sem frase nenhuma | `screenshots/CH-06-12-inicio-cartao-velho-sem-aviso.png` |
| 13 | Atrasar a leitura ao vivo 4 s e recarregar o Início, depois a Loja ao vivo | Início: cartão no mesmo lugar (y 396, 358 × 94,5 → 92 ao chegar o número), nome acessível "Agora na loja, carregando."; Loja ao vivo: blocos sem número, `h1` e aba "Loja ao vivo", e o topo já diz "Atualizado agora" antes de o bloco A chegar | `screenshots/CH-06-14-ao-vivo-carregando.png` |
| 14 | Relógio do app 2 h adiantado e depois ~4 h atrasado, recarregando a Loja ao vivo | os mesmos números (1 pessoa, funil 1/0/0, visitas 23) e "Atualizado há 3 s"/"agora" nos três relógios | `screenshots/CH-06-15-ao-vivo-relogio-adiantado.png` |
| 15 | Puxar para atualizar na Loja ao vivo | as duas leituras saem na hora; "Atualizado agora" | — |
| 16 | Com uma leitura ao vivo presa (4 s) no ar, tocar em "Voltar" | o Início abre com "Agora na loja, 1 pessoa" na hora e segue igual; sem erro | — |
| 17 | Esconder o Início 65 s; voltar | zero leituras escondido; as duas ao voltar, em ~15 ms | — |
| 18 | A cliente fecha a aba; esperar a presença expirar na Loja ao vivo | em ~5 min: "Ninguém na loja agora." no bloco A com o eixo "30 min atrás / agora", zeros no funil, "Ninguém olhando uma joia agora."; `h1` e aba "Loja ao vivo" | `screenshots/CH-06-21-ao-vivo-ninguem.png` |
| 19 | Voltar ao Início | "Ninguém na loja agora" no cartão, com o ponto e ~15 barras pequenas; nome acessível "Agora na loja, 0 pessoas." | `screenshots/CH-06-22-inicio-ninguem.png` |
| 20 | Sair da conta | "Entrar no ateliê" | — |

**Edge cases tentados:**

- Recarregar durante o carregamento (passo 13 e na tentativa de Slow 4G — ver Fora da cobertura)
- Relógio do aparelho adiantado e atrasado (passo 14)
- Voltar do `/ao-vivo` para o Início com a leitura em curso (passo 16)
- Deep link direto em `/ao-vivo` com o app recém-aberto (recargas dos passos 09, 11, 13, 14)
- Toque duplo em "Tentar de novo" (passo 10)
- Falha "quente" (com número na tela) e "fria" (sem número), improvisado — foi onde estavam os achados

## Casos

| TC     | Veredito                       | Passo | Evidência                 | Nota                        |
| ------ | ------------------------------ | ----- | ------------------------- | --------------------------- |
| TC-JOURNEY-003 | fail | 04, 06–08, 12, 16 | `screenshots/CH-06-05-offline-sem-conexao.png` · `screenshots/CH-06-12-inicio-cartao-velho-sem-aviso.png` | passo 1 pass; passo 2 com a rede cortada mostra a tela "Sem conexão" do app (spec-gap), e com a leitura falhando mostra "Não consegui atualizar agora." sem "Tentar de novo" ⇒ A-3; passo 3 a tela volta sozinha com a rede (variação "volta sozinha" pass); passo 4 pass; variação "no cartão do Início" fail ⇒ A-1 |
| TC-FUNC-018 | fail | 12, 13, 10, 18, 19 | `screenshots/CH-06-12-inicio-cartao-velho-sem-aviso.png` · `screenshots/CH-06-14-ao-vivo-carregando.png` · `screenshots/CH-06-22-inicio-ninguem.png` | carregando, falha fria, "Tentar de novo", toque duplo e vazio passam no cartão e no bloco A; mas a leitura bloqueada com o número já na tela (passo 2 partindo do Início carregado) não mostra falha nenhuma ⇒ A-1 |
| TC-FUNC-019 | blocked | — | — | massa: tirar o `production_host` exige escrever no banco local, e a sessão é caixa-preta (sem `psql`); a massa precisa vir do orquestrador. A variação de TC-FUNC-024 "loja não medida" fica junto |
| TC-FUNC-020 | fail | 08, 09, 11, 12 | `screenshots/CH-06-09-ao-vivo-falha-fria-atualizado-agora.png` | passos 1–3 pass (só a parte que falhou mostra a falha, a outra de pé, nos dois sentidos e no Início); variação "frescor com uma falhando" fail: o frescor fala da leitura que deu certo e diz "Atualizado agora" ⇒ A-2 |
| TC-FUNC-021 | pass | 01, 02, 04, 15 | — | 30 s no cartão, 15 s na tela, puxar relê na hora nas duas telas. Variação "uma cliente entra" não feita |
| TC-FUNC-022 | pass | 05, 17 | — | zero leituras escondido (120 s, 40 s e 65 s); relê ao voltar e retoma o ritmo; o mesmo no Início |
| TC-FUNC-023 | pass | 14 | `screenshots/CH-06-15-ao-vivo-relogio-adiantado.png` | números, funil, Acessos e frescor iguais; o atrasado foi ~4 h em vez de 2 h. As 30 barras não foram contadas uma a uma — comparação pelo texto da tela |
| TC-FUNC-024 | pass | 04, 09, 13, 18 | `screenshots/CH-06-09-ao-vivo-falha-fria-atualizado-agora.png` · `screenshots/CH-06-21-ao-vivo-ninguem.png` | `h1` "Loja ao vivo" e aba "Loja ao vivo · Ateliê" no cheio, carregando, falha e ninguém. Variação "loja não medida" não feita (TC-FUNC-019 blocked). Sem rede nenhuma, a tela do app troca para "Sem conexão · Ateliê" — ver spec-gap |

Contagem: pass 4 · fail 3 · blocked 1 · skip 0

## Achados

### A-1 · [Início › cartão "Agora na loja"] Com a leitura ao vivo falhando, o cartão segue mostrando o último número sem aviso — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-06, passo 2 (perde a rede) · J-01 · passos 12 e 17 do log          |
| TC                  | TC-JOURNEY-003 (variação "no cartão do Início") · TC-FUNC-018 passo 2 |
| Gravidade proposta  | medium — ela lê "1 pessoa" por minutos achando que tem alguém na loja agora, sem nada dizendo que o número parou de ser atualizado; é o atrito 3 da persona |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Uma cliente anônima aberta na página de uma joia da loja (http://localhost:8082, build)
2. Como `admin-atelie`, abrir http://localhost:8084/ e esperar o cartão "Agora na loja" mostrar "1 pessoa"
3. Fazer a leitura ao vivo falhar (rota `rpc/store_live` sem resposta; a rede do aparelho "ligada") e esperar duas
   leituras de 30 s (~65 s)

**Esperado:** o cartão mostra a falha e "Tentar de novo" — **fonte:** TC-JOURNEY-003, variação "no cartão do
Início"; TC-FUNC-018 passo 2; PRD LAV-03

**Observado:** o cartão continua "Agora na loja, 1 pessoa. Abrir loja ao vivo", sem frase de falha, por mais de
2 min e 4 leituras falhas. Só quando o Início é aberto sem número algum (recarga) a falha aparece. Na Loja ao vivo,
no mesmo estado, a tela pelo menos diz "Não consegui atualizar agora." — as duas superfícies discordam.

**Evidência:**

- `screenshots/CH-06-12-inicio-cartao-velho-sem-aviso.png` — o cartão com "1 pessoa" depois de 2 min de leituras falhas
- console: erros de requisição abortada a cada tentativa (esperado pela interceptação)
- rede: `POST rpc/store_live → falha` às 2 s, 33 s, 64 s; `rpc/store_movement → 200`

### A-2 · [Loja ao vivo › frescor] "Atualizado agora" quando uma das duas leituras falhou ou ainda não chegou — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-06, passo 2 · passos 09, 11 e 13 do log                             |
| TC                  | TC-FUNC-020 (variação "frescor com uma falhando")                     |
| Gravidade proposta  | low — os blocos dizem "Não consegui carregar.", então ela não vê número falso; mas a linha do topo afirma que tudo está atualizado e contradiz os blocos |
| Reproduziu          | sim (3 de 3: presença falhando, movimento falhando, presença atrasada) |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Como `admin-atelie`, com a leitura ao vivo (`rpc/store_live`) falhando, abrir http://localhost:8084/ao-vivo
2. Ler a linha abaixo do título

**Esperado:** o frescor diz a idade da leitura mais antiga das duas (sem a leitura ao vivo, não pode dizer "agora")
— **fonte:** TC-FUNC-020 variação; spec D-14

**Observado:** "Atualizado agora", depois "Atualizado há 4 s", "há 9 s"… contados pela leitura de Acessos, com os
quatro blocos de presença em "Não consegui carregar.". O mesmo com Acessos falhando ("Atualizado há 8 s") e com a
leitura ao vivo ainda carregando ("Atualizado agora" antes de o bloco A ter número). Com as duas boas, o frescor
segue a mais velha (passo 10: "há 14 s"), como deveria.

**Evidência:**

- `screenshots/CH-06-09-ao-vivo-falha-fria-atualizado-agora.png` — "Atualizado agora" acima de quatro "Não consegui carregar."
- `screenshots/CH-06-14-ao-vivo-carregando.png` — "Atualizado agora" com os blocos ainda sem número
- console: `nada` além das requisições abortadas
- rede: `rpc/store_live → falha` · `rpc/store_movement → 200`

### A-3 · [Loja ao vivo] Com a leitura ao vivo falhando depois de carregar, os números ficam sem idade e sem "Tentar de novo" — para a Adri

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Persona             | PER-01 Adri                                                           |
| Jornada e passo     | J-06, passos 2–3 · passo 08 do log                                    |
| TC                  | TC-JOURNEY-003 passos 2–3 · TC-FUNC-020 passo 1                       |
| Gravidade proposta  | low — ela sabe que não atualizou, mas não sabe há quanto tempo o "1 pessoa" é verdade, e o único jeito de reler é puxar a tela |
| Reproduziu          | sim (2 de 2)                                                          |
| Viewport            | 390 × 844                                                             |

**Passos para reproduzir** — de um estado limpo:

1. Uma cliente presente na loja; como `admin-atelie`, abrir http://localhost:8084/ao-vivo e esperar "1 pessoa"
2. Fazer a leitura ao vivo falhar e esperar a leitura seguinte (até 15 s)

**Esperado:** na leitura seguinte, "Não consegui carregar." e "Tentar de novo" — **fonte:** TC-JOURNEY-003 passo 2;
TC-FUNC-020 passo 1; PRD LAV-03

**Observado:** a linha do frescor vira "Não consegui atualizar agora." e some a idade ("Atualizado há…"); os blocos
A–E continuam com os números da última leitura boa; nenhum "Tentar de novo" na tela (contados: 0) durante 24 s e
36 s. A releitura automática de 15 s segue tentando, e o puxar relê.

**Evidência:**

- `screenshots/CH-06-08-ao-vivo-so-presenca-falha.png` — "Não consegui atualizar agora." com "1 pessoa" e o funil
- console: requisições abortadas
- rede: `rpc/store_live → falha` a cada 15 s (com duas tentativas por ciclo)

## Spec-gaps

| Comportamento observado | Onde (passo) | Classe proposta                     |
| ----------------------- | ------------ | ----------------------------------- |
| Com a rede do aparelho cortada (offline), a Loja ao vivo inteira dá lugar à tela "Sem conexão. Os dados da loja aparecem quando a internet voltar." do app, com aba "Sem conexão · Ateliê" e outro `h1` — e não à falha por bloco que o TC-JOURNEY-003 descreve; ao voltar a rede a tela volta sozinha | 06–07 | pré-existente |
| O cartão do Início muda de altura conforme o estado: 94,5 (carregando) → 92 (com número) → 77 (ninguém), empurrando o resto do Início alguns pixels | 13, 19 | polimento |

## Fora da cobertura

- TC-FUNC-019 e a variação "loja não medida" de TC-FUNC-024 — a massa (tirar o `production_host`) exige escrita no banco local, fora do que a sessão caixa-preta pode fazer
- Rede lenta (Slow 4G) — emulada pelo CDP, mas o app servido em dev (centenas de módulos sem empacotar) não passou da casca "ATELIÊ · PAINEL" em 18 s nem depois de recarregar durante a carga; o resultado mede o servidor de dev, não o app. Precisa do app servido como build
- Segundo plano real (aba de outro app à frente no Android) — emulado só pelo `visibilityState` do documento
- Puxar para atualizar com o dedo de verdade — feito por eventos de toque sintéticos
- Variação "uma cliente entra durante o passo 3" de TC-FUNC-021 e "oculto por 10 s" de TC-FUNC-022 — orçamento
- Contagem barra a barra das 30 barras com o relógio errado — comparado pelo texto, não pelas barras

## Debrief

- **Surpresas:** a falha só aparece quando não há número nenhum; com número na tela, o Início cala e a Loja ao vivo troca o frescor por uma frase sem idade. A rota abortada e o `offline` dão caminhos diferentes: offline cai na tela "Sem conexão" do app, que esconde o problema da leitura
- **Próximo charter:** reteste dos três achados depois do conserto, e o Slow 4G com o app do ateliê servido como build
- **Padrão novo:** separar falha "fria" (sem dado) de falha "quente" (com dado na tela) em toda leitura que se renova sozinha — os achados estavam todos no quente
