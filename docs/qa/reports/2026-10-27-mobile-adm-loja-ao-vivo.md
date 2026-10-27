# QA Run Report — 2026-10-27 — mobile-adm: Loja ao vivo (83, Fase 1: Acessos)

- **Scope:** feature `83`: a tela `/ao-vivo` (seção Acessos), o cartão "Visitas hoje" da Início, a releitura de 15 s e 30 s e o parágrafo novo da política de privacidade
- **Cadence tier:** targeted
- **Build:** `1363402c` (worktree `store-83-loja-ao-vivo`, branch `feature/83-loja-ao-vivo`) · **Environment:** build servido do mobile-adm (`vite preview` :8094) e `vite` da loja (:8095), os dois do worktree, contra o Supabase local (:54441), com a migration da `83` aplicada. Login real com o admin do seed
- **Started:** 2026-10-27 02:42 (-03) · **Status:** closed

## Personas

| Persona | Base | Device / Network / Locale | Sessions |
|---|---|---|---|
| Adri no celular | personas.md | 360/390/412 × 844, 4G e 3G simulado, pt-BR | CH-aovivo-numeros-certos-do-dia, CH-aovivo-conta-sem-acesso, CH-aovivo-com-rede-ruim, CH-aovivo-ligada-enquanto-trabalho, CH-aovivo-do-inicio-e-voltar, CH-aovivo-com-fonte-grande, canários |
| Equipe com TalkBack | personas.md | 390 × 844, árvore de acessibilidade do Chromium | CH-aovivo-com-leitor-de-tela |
| Cliente com conta da loja | personas.md | 390 × 844 | CH-loja-politica-hora-cheia |

## Flows in Scope

- `J-ver-a-loja-ao-vivo`: da Início ao `/ao-vivo` e de volta (`../journeys/J-ver-a-loja-ao-vivo.md`)
- `J-acompanhar-a-loja`: o cartão "Visitas hoje" (`../journeys/J-acompanhar-a-loja.md`)
- `J-ler-a-politica-de-privacidade`: o parágrafo do contador (`../journeys/J-ler-a-politica-de-privacidade.md`)

## Dados da sessão

A fixtura da prova em navegador (`.specs/features/83-loja-ao-vivo/prova/fixtura.sql`) foi aplicada às 02:42.
**Hoje**: 46 visitas nas horas 0 e 1. **Ontem**: 12.849 visitas, quatro dígitos em seis faixas. **Anteontem**:
6.200. Mais 5 pedidos `PROVA83-*`. Durante a sessão entraram uma visita a mais (hora 2) e um pedido
`PROVA83-6`, os dois com a marca da fixtura. No fim rodou `limpa.sql`, e o banco voltou ao estado de
antes: `store_visits` 0, contador ausente, `orders` 78, `PROVA83-*` 0.

O que a fixtura não tem (o teto do dia, visitas sem hora, contador recente ou parado, resposta sem
`acessos`, a régua da metade, conversão acima de 100 %, 500, rede caída, lentidão e `42501`) foi
simulado **interceptando a resposta real** de `/rest/v1/rpc/store_movement` no Playwright. Para a recusa
de papel, também foi interceptado `/rest/v1/user_roles`.

Esta sessão roda **depois** da prova em navegador da T13 (`prova-navegador.md`) e não repete as 48 telas
medidas lá. Foram medidas outra vez só as combinações que usam as notas longas: teto, sem hora e 1.234
visitas sem hora.

## Session Matrix & Results

| # | Charter | Journey / Scenario | Persona | Tour | Status | Issue | Fix commit |
|---|---|---|---|---|---|---|---|
| 1 | CH-aovivo-numeros-certos-do-dia | J-ver-a-loja-ao-vivo / MAD-aovivo-numeros-batem-com-o-banco, -grafico-por-faixas, -trocar-periodo-sem-ler, -contador-recente-parado-ou-antigo, -tom-memorial, -abrir-pelo-cartao, MAD-inicio-cartao-visitas-hoje | Adri no celular | Money | Pass | | |
| 2 | CH-aovivo-conta-sem-acesso | J-ver-a-loja-ao-vivo / MAD-aovivo-conta-sem-papel-recusada | Adri no celular | Garbage | Pass | | |
| 3 | CH-aovivo-com-rede-ruim | J-ver-a-loja-ao-vivo / MAD-aovivo-leitura-falha-tentar-de-novo, -linha-de-frescor | Adri no celular | Network | Blocked (human decision) | BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco | |
| 4 | CH-aovivo-ligada-enquanto-trabalho | J-ver-a-loja-ao-vivo / MAD-aovivo-releitura-15s-so-visivel, -puxar-para-atualizar, -linha-de-frescor | Adri no celular | Interrupt | Blocked (needs human verify) | (Android real) | |
| 5 | CH-aovivo-do-inicio-e-voltar | J-ver-a-loja-ao-vivo / MAD-aovivo-voltar-mantem-periodo, -abrir-pelo-cartao | Adri no celular | Back-Button | Blocked (human decision) | BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo | |
| 6 | CH-aovivo-com-fonte-grande | J-ver-a-loja-ao-vivo / MAD-aovivo-fonte-grande-e-telas-estreitas | Adri no celular | Feature | Pass | | |
| 7 | CH-aovivo-com-leitor-de-tela | J-ver-a-loja-ao-vivo / MAD-aovivo-com-leitor-de-tela | Equipe com TalkBack | Feature | Blocked (needs human verify) | (TalkBack real) | |
| 8 | CH-loja-politica-hora-cheia | J-ler-a-politica-de-privacidade / LOJA-politica-hora-cheia | Cliente | Feature | Blocked (human decision) | BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200 (anterior à 83) | |
| 9 | canário CH-inicio-numeros-certos-do-dia | J-acompanhar-a-loja / MAD-inicio-abrir-e-entender-o-dia, -trocar-periodo | Adri no celular | Money | Pass | | |
| 10 | canário CH-inicio-ao-vivo-e-atualizado | J-acompanhar-a-loja / MAD-inicio-cartao-visitas-hoje | Adri no celular | Interrupt | Pass | | |

Nenhum conserto nesta rodada, por instrução (a rodada só registra). Os três `Blocked (human decision)`
esperam a decisão de consertar.

## Session Debriefs

### CH-aovivo-numeros-certos-do-dia — Adri no celular (Money)

- **Ran:** 02:42 → 03:00 (dentro da caixa)
- **Findings:** nenhum defeito.
  - O banco, lido por `le-movimento.sql` como o admin, bateu com a tela nos três períodos. **Hoje**: 46 · 1 · 2,2 % e "+283% vs ontem até as 2h", que é 46 contra 12 em horas completas. As vendas e a conversão de Hoje não têm linha, porque a base de ontem até as 2h é 0. **Ontem**: 12.849 · 3 · 0,0 %, com +107 %, +200 % e +45 % "vs anteontem". **Semana**: 12.895 · 4 · 0,0 %, sem variação. O gráfico de Ontem tem as 8 faixas iguais às de `por_faixa`, todas em `primary`, e as barras com `max(4, round(v/máx·84))`. Hoje tem a faixa 0 dourada e as outras como trilho de 4 px em `line`, sem número, com `aria-label` "ainda não chegou". Na Semana aparecem seg e hoje, com hoje dourado.
  - **A virada de faixa foi vista ao vivo, com a tela aberta**. Às 03:00:10 a faixa 0 passou para `primary`, a faixa 3h ficou dourada com "0" e a variação virou "+292% vs ontem até as 3h" (47 contra 12). Esse caso não estava no plano.
  - Respostas interceptadas, uma por regra:
    - Hoje às 0h sem variação.
    - Zero visitas mostra "—" na Conversão.
    - 5 vendas em 2 visitas mostram "250,0%".
    - A régua da metade dá +12,5 ⇒ "+13%" e −12,5 ⇒ "−13%" (com U+2212). Vendas iguais dão "0% vs anteontem".
    - `comparacao.ontem.visitas = null` tira a linha de Visitas e de Conversão e deixa a de Vendas.
    - O teto em 26/10 aparece em Ontem e na Semana, e não em Hoje.
    - Visitas sem hora, no singular e no plural.
    - "Contando desde 26/10 às 06h45" aparece em Ontem e na Semana, com as faixas anteriores à contagem como trilho e sem número.
    - Com o contador parado aparece "Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br."
    - Sem `acessos`: os números aparecem sem variação e com a frase estática, sem botão.
  - O cartão da Início dá 46 (depois 47), igual ao Visitas da faixa em Hoje. Com Ontem ou Semana na faixa, o cartão continua "Visitas hoje".
  - Trocar de período não lê. Na primeira medida houve uma leitura que coincidiu com o ciclo de 15 s; no ciclo medido (34 s, abaixo), as leituras saíram só aos 0, 15 e 30 s.
  - Tom: nenhum "!", emoji, "pessoa(s)" ou vermelho. O verde aparece só em variação positiva.
- **Bugs filed/updated:** nenhum
- **Scenarios settled:** MAD-aovivo-numeros-batem-com-o-banco → pass; MAD-aovivo-grafico-por-faixas → pass; MAD-aovivo-trocar-periodo-sem-ler → pass; MAD-aovivo-contador-recente-parado-ou-antigo → pass; MAD-aovivo-tom-memorial → pass; MAD-aovivo-abrir-pelo-cartao → pass; MAD-inicio-cartao-visitas-hoje → pass
- **Paper cuts:** "0,0%" ao lado de "+45% vs anteontem" na Conversão de Ontem, já registrado na T13; só acontece com volume que a loja não tem. Sem `acessos`, a frase "O gráfico por horário ainda não está disponível." aparece também na **Semana**, onde o gráfico é por dia. É cego, porque só acontece com o banco antigo.
- **Surprises:** uma resposta **fora do contrato** (`acessos.comparacao.ontem = null` inteiro, quando o contrato garante o objeto e anula só os campos) deixa a tela em branco: `TypeError: Cannot read properties of null (reading 'visitas')`, a página desmonta inteira e não aparece "Não consegui carregar.". **Não foi registrado como bug**, porque o servidor não produz essa forma (`LAV-73`). Fica como observação de robustez, se algum dia a forma mudar.
- **Suggested next charter:** a virada do **dia** com a tela aberta (00:00), que a T13 também não provou.

### CH-aovivo-conta-sem-acesso — Adri no celular (Garbage)

- **Ran:** 03:00 → 03:10
- **Findings:** nenhum defeito.
  - Com os números na tela, a releitura recebeu `403 42501` e o papel foi negado (`user_roles` vazio). Aos 14,2 s a página foi para `/login` com "Esta conta não tem acesso ao painel." e "Sair". Nenhum número apareceu depois da recusa, em 50 amostras a cada 500 ms, e não saiu outra chamada a `store_movement`, então o intervalo parou.
  - Com `/ao-vivo` colado e a conta sem papel, a página foi direto à recusa, sem chamar `store_movement` e sem número em nenhuma amostra a cada 150 ms.
  - Par: `42501` com o papel **ainda admin** mostra "Não consegui carregar." + "Tentar de novo", sem nenhum número do cache, e o intervalo para. É o desenho da vigia da `73`. Um 500 é falha, não recusa (sessão 3).
- **Bugs filed/updated:** nenhum
- **Scenarios settled:** MAD-aovivo-conta-sem-papel-recusada → pass
- **Paper cuts:** nenhum
- **Surprises:** nenhuma

### CH-aovivo-com-rede-ruim — Adri no celular (Network)

- **Ran:** 03:10 → 03:25
- **Findings:**
  - Na primeira leitura, tanto com 500 quanto com a rede abortada, aparecem "Não consegui carregar." + "Tentar de novo", sem número e sem `aria-busy`. Com a resposta lenta (4 s), aparecem traços, `aria-busy="true"` e o seletor desabilitado, e no fim os números.
  - Quando a releitura falha com números na tela, os números ficam e o frescor vira "Não consegui atualizar agora." (`role="status"`).
  - O cartão da Início em falha tem o nome "Visitas hoje: não consegui carregar. Tentar de novo". O toque **relê** (2 chamadas) e **não navega**, e o foco fica no cartão. Com a rede boa, o toque seguinte mostra 46.
  - Rede desligada: "Sem conexão. Os dados da loja aparecem quando a internet voltar." Quando ela volta, os números e o frescor voltam sozinhos.
  - **Defeito**: ao ativar "Tentar de novo", o botão desmonta durante a nova tentativa e o foco cai no `<body>`, tanto na nova falha quanto no sucesso. Impacto Friction. É o mesmo defeito já consertado na ficha (`BUG-20261024-tentar-de-novo-da-ficha-solta-o-foco-ao-falhar-de-novo`), e o cenário diz por escrito que o foco não pode cair no body.
- **Bugs filed/updated:** BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco
- **Scenarios settled:** MAD-aovivo-leitura-falha-tentar-de-novo → fail; MAD-aovivo-linha-de-frescor → pass (ver sessão 4)
- **Paper cuts:** nenhum além do bug
- **Surprises:** nenhuma

### CH-aovivo-ligada-enquanto-trabalho — Adri no celular (Interrupt)

- **Ran:** 03:25 → 03:45
- **Findings:** nenhum defeito.
  - `/ao-vivo` visível leu aos 0,1 · 15,2 · 30,2 s. O frescor passou por "agora" (até 2 s), "há 2 s" … "há 14 s" e voltou a "agora" a cada leitura, sem pular para "há 15 s" antes da releitura.
  - Aba oculta (`visibilityState` + `visibilitychange` com bolha) por 121 s: **0** leituras. O frescor continuou contando a partir da última resposta e passou de "há 1 min" para "há 2 min". Na volta saiu **uma** leitura e o frescor voltou a "Atualizado agora".
  - Uma visita gravada no banco com a tela aberta apareceu na releitura seguinte (46 → 47), na tela e no cartão da Início.
  - A Início visível leu aos 0,1 · 30,2 · 60,2 s.
  - Puxar no topo mostra "Solte para atualizar" e faz **1** leitura. Um puxão de 30 px mostra "Puxe para atualizar" e não lê. Com a tela rolada (`scrollY` 197), não há dica nem leitura.
- **Bugs filed/updated:** nenhum
- **Scenarios settled:** MAD-aovivo-linha-de-frescor → pass; MAD-aovivo-releitura-15s-so-visivel → blocked-verify (o Chrome em segundo plano de verdade só no Android); MAD-aovivo-puxar-para-atualizar → blocked-verify (o dedo real)
- **Paper cuts:** nenhum
- **Surprises:** as bordas exatas de 59/60/119 s não puderam ser lidas, porque a última leitura antes de ocultar estava até 15 s antes do zero da contagem. Os valores lidos são coerentes, e a truncagem é provada nos testes do hook.
- **Não feito:** mudar o relógio do aparelho. Simular isso exigiria o relógio falso do Playwright, que também muda os temporizadores do app, e a medida perderia o sentido. Fica para o aparelho (`LAV-61` tem guarda de fonte).

### CH-aovivo-do-inicio-e-voltar — Adri no celular (Back-Button)

- **Ran:** 03:45 → 03:55
- **Findings:**
  - O caminho Início (Ontem ou Semana) → cartão → `/ao-vivo` abre no mesmo período, com `history.state.usr = { doApp: true, periodo }`, URL sem query, sem barra de abas e com o foco no `h1`. O "Voltar" leva à Início no período certo, e o voltar do navegador também.
  - F5 sem troca de período mantém o período. Um `history.state` com `periodo: 'mes'` abre em Hoje.
  - Link colado numa aba nova: abre em Hoje, e "Voltar" troca a entrada por `/` (`history.length` continua 2, e o voltar seguinte sai do app).
  - **Defeito**: depois de trocar de período **dentro** da Loja ao vivo, o F5 reabre no período que veio da Início.
- **Bugs filed/updated:** BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo
- **Scenarios settled:** MAD-aovivo-voltar-mantem-periodo → fail; MAD-aovivo-abrir-pelo-cartao → pass
- **Paper cuts:** com o link colado (sem navegação interna), o foco inicial fica no `<body>`, não no `h1`. A spec só exige o foco no `h1` "na troca de rota", então isso não foi registrado como bug.
- **Surprises:** nenhuma
- **Não feito:** o gesto de voltar do Android real (blocked-verify).

### CH-aovivo-com-fonte-grande — Adri no celular (Feature)

- **Ran:** 03:55 → 04:05
- **Findings:** nenhum defeito.
  - 36 telas: 360/390/412/1440 × 100/130/200 % × os três períodos, com o teto, 7 e 1.234 visitas sem hora (as notas mais longas). O `scrollWidth` foi igual à largura em todas. Nenhum texto saiu da tela fora de contêiner com rolagem própria, nenhum botão ficou abaixo de 44 px e nenhum número se sobrepôs nos grupos.
  - A grade tem Visitas e Vendas lado a lado e Conversão inteira a 100 %, e uma coluna a 130 e 200 % no celular.
  - O cabeçalho continua `top: 0` com a página rolada 600 px a 360/200 %. O gráfico de Ontem rola dentro do cartão.
- **Bugs filed/updated:** nenhum
- **Scenarios settled:** MAD-aovivo-fonte-grande-e-telas-estreitas → pass
- **Paper cuts:**
  - A 1440 a 100 %, Visitas e Vendas são dois cartões de 146 px e a Conversão ocupa 1.408 px; a tela parece vazia à direita (captura `/private/tmp/claude-503/f83/qa-1440-100-hoje.png`). É cego: o app é de celular.
  - A 360/200 %, o gráfico rolável não tem nenhuma pista de que há mais colunas à direita além da barra cortada.
- **Surprises:** nenhuma

### CH-aovivo-com-leitor-de-tela — Equipe com TalkBack (Feature)

- **Ran:** 04:05 → 04:15
- **Findings:** nenhum defeito na árvore de acessibilidade.
  - Título "Loja ao vivo · Ateliê", com o foco no `h1` ao chegar pelo cartão, e a hierarquia h1 "Loja ao vivo" › h2 "Acessos" › h3 "Visitas por horário/dia".
  - Os grupos são "Visitas, hoje, 47" / "Vendas, ontem, 3" / "Conversão, esta semana, 0,0%", com a variação dentro.
  - O período tem `aria-pressed`, e o foco fica no botão depois da troca.
  - As barras são `li` com "0h: 46 visitas" e "3h: ainda não chegou".
  - O cartão é anunciado nos três estados: "Visitas hoje, 46. Abrir loja ao vivo", "Visitas hoje, carregando. Abrir loja ao vivo" (com `aria-busy`) e "Visitas hoje: não consegui carregar. Tentar de novo".
  - O frescor não é região viva. Só "Não consegui atualizar agora." é `role="status"`.
  - Com `prefers-reduced-motion: reduce`, `getAnimations()` fica vazio e nenhum elemento tem `transition-duration` maior que 0.
- **Bugs filed/updated:** nenhum novo. O foco no "Tentar de novo" está no bug da sessão 3.
- **Scenarios settled:** MAD-aovivo-com-leitor-de-tela → blocked-verify (TalkBack real); MAD-inicio-com-leitor-de-tela → blocked-verify
- **Paper cuts:** trocar de período não é anunciado (não há região viva). O leitor só ouve o `aria-pressed`, e os números novos só quando a pessoa navega até eles. A spec não pede o anúncio.

### CH-loja-politica-hora-cheia — Cliente (Feature)

- **Ran:** 04:15 → 04:25
- **Findings:**
  - Pelo rodapé chega-se a `/politica-de-privacidade`. O parágrafo servido é **idêntico, palavra por palavra**, ao Apêndice A da spec, e "esse código e a data" (o resto da `71`) não aparece em lugar nenhum da página. A 390/100 % não há rolagem lateral. A aprovação do texto pela Adri fica fora desta sessão.
  - **Defeito anterior à `83`**: a 390/200 %, o `@umaestrelinha.adri` do rodapé leva o `scrollWidth` a 461. Acontece igual na política de trocas.
- **Bugs filed/updated:** BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200
- **Scenarios settled:** LOJA-politica-hora-cheia → fail (só pela rolagem lateral do rodapé; o texto passa)
- **Paper cuts:** o aviso de cookies cobre metade da tela a 200 % em 390. Não é da `83`.

### Canários — CH-inicio-numeros-certos-do-dia e CH-inicio-ao-vivo-e-atualizado

- **Findings:** nenhum defeito.
  - A faixa da Início bate com o banco nos três períodos: Hoje R$ 190 · 1 · R$ 189,90 · 46; Ontem R$ 729 (728,50) · 3 · R$ 242,83 · 12.849; Semana R$ 918 (918,40) · 4 · R$ 229,60 · 12.895.
  - A releitura da Início é de 30 s.
  - Um pedido pago gravado no banco (`PROVA83-6`) apareceu em menos de 5 s pelo Realtime (Hoje: R$ 290 · 2 · R$ 144,95).
- **Scenarios settled:** MAD-inicio-abrir-e-entender-o-dia → pass; MAD-inicio-trocar-periodo → pass; MAD-inicio-numeros-grandes → blocked-verify (a T13 mediu a 200 % pela raiz; a escala do sistema só no aparelho)

## Experiential lens pass

Andadas de novo: J-ver-a-loja-ao-vivo (Hoje → Ontem → Semana → voltar) e o cartão da Início.

| Lente | Veredito | Nota |
|---|---|---|
| Clareza | pass | "vs ontem até as 2h" diz exatamente o que compara |
| Confiança | pass | nunca aparece zero inventado; falha e recusa sem número |
| Tom | pass | sem festa, sem urgência; verde só em alta |
| Esforço | friction | o período trocado na tela se perde no F5 (bug) |
| Acessibilidade | friction | o foco cai no body depois de "Tentar de novo" (bug) |
| Ritmo | pass | 15 s / 30 s só visível; puxar só no topo |

## What Was Fixed

Nada. A rodada foi só de registro, por instrução.

## Paper Cuts

| Persona | Where (journey/step) | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri | J-ver-a-loja-ao-vivo, Ontem | "0,0% e mais 45%?" | dull | watching (T13) |
| Adri | J-ver-a-loja-ao-vivo, sem `acessos` | "gráfico por horário" na Semana | dull | deferred |
| Adri | 1440 × 100 % | dois cartões pequenos e um enorme | dull | deferred (app de celular) |
| Adri | 360 × 200 %, gráfico | não sei que dá para rolar o gráfico | dull | watching |
| Equipe com TalkBack | trocar de período | não ouço os números novos | dull | watching |
| Equipe com TalkBack | link colado | o foco começa no body | dull | watching |

## Runtime Errors Observed

- `TypeError: Cannot read properties of null (reading 'visitas')`: só com a resposta **fora do contrato** (`comparacao.ontem` inteiro nulo), injetada por esta sessão. Não registrado; ver Surprises da sessão 1.
- Erros de rede no console nas sessões de falha: são os 500 e as quedas interceptados de propósito.

## Human Verifications Needed

- [ ] **Android real, Chrome**: deixar `/ao-vivo` aberta, apertar o botão de início do aparelho por 1 min e voltar. Nenhuma leitura deve sair enquanto o Chrome está em segundo plano, e uma deve sair na volta, com o frescor voltando a "Atualizado agora" (linha 4).
- [ ] **Android real**: com Ontem na Início, abrir pelo cartão e usar o **gesto** de voltar. A Início deve voltar em Ontem (linha 5).
- [ ] **Android real**: no topo de `/ao-vivo`, puxar com o dedo até "Solte para atualizar" e soltar. Deve sair uma leitura; com a tela rolada, o puxão não deve fazer nada (linha 4).
- [ ] **Android real**: a escala de fonte do sistema no máximo. Na Início e em `/ao-vivo`, não pode haver rolagem lateral nem número sobre número (linhas 6 e 9).
- [ ] **TalkBack real**: ler `/ao-vivo` de cima a baixo e trocar o período (linha 7).

## Decisions for a Human

### O foco depois de "Tentar de novo" na Loja ao vivo (BUG-20261027-tentar-de-novo-da-loja-ao-vivo-solta-o-foco)

O botão desmonta durante a nova tentativa e o foco cai no `<body>`.

- **(a)** Manter o estado de falha, com o botão desabilitado, durante a nova tentativa. O foco fica no botão, e no sucesso vai ao `h2` "Acessos". Esse é o molde do conserto da ficha.
- **(b)** Deixar o carregando, mas mover o foco ao `h2` quando a leitura terminar.
- **Recomendação:** (a). É o padrão que o app já adotou e o que o cenário pede.

### O período escolhido dentro da Loja ao vivo e o F5 (BUG-20261027-f5-desfaz-o-periodo-escolhido-na-loja-ao-vivo)

- **(a)** Gravar o período escolhido na própria entrada (`history.replaceState`, molde da Início) a cada troca.
- **(b)** Aceitar o comportamento e escrever na spec que o F5 volta ao período de chegada.
- **Recomendação:** (a). É barato, e o Chrome do Android recarrega abas em segundo plano. Sem isso, a Adri perde o que estava olhando sem ter feito nada.

### O rodapé da loja rolando de lado a 200 % (BUG-20261027-rodape-da-loja-rola-de-lado-com-fonte-200)

Anterior à `83` e fora do app do ateliê.

- **(a)** Consertar numa tarefa da loja: deixar o @ quebrar (`break-all`/`overflow-wrap:anywhere`) ou reduzir o tamanho em telas estreitas.
- **(b)** Registrar no BACKLOG e não tocar dentro da `83`.
- **Recomendação:** (b) dentro da `83` e (a) numa tarefa própria da loja. O cenário `LOJA-politica-hora-cheia` fica `fail` só por isso; o texto da `83` passa.

## Final Status

- **Matrix:** 10 linhas, nenhuma `Pending`. 5 Pass, 2 Blocked (needs human verify), 3 Blocked (human decision).
- **Bugs por impacto:** Blocks-Completion 0 · Data-Loss 0 · Trust-Damage 0 · Friction 3 (dois da `83`, um anterior a ela) · Cosmetic 0.
- **Suíte automatizada (gate de saída):** `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000`, com o exit capturado fora de pipe: `Test Files 137 passed (137)`, `Tests 2163 passed (2163)`, `exit=0`. Só o workspace do app foi medido nesta rodada.
- **Prontidão:** os números, a recusa, a falha, a releitura e o layout estão de acordo com a spec. Nada bloqueia a entrega. Os dois defeitos da `83` são de atrito (foco e F5) e esperam a decisão de consertar. O deploy depende ainda da aprovação do texto da política pela Adri e da verificação no Android real.
