# 73 — mobile-adm: Início (métricas)

> Programa mobile-adm (`AD-056`), feature 2 de 8. Depende da `72` (fundação, mergeada em
> `feature/mobile-adm`, `e9e68ed0`). Branch: `feat/73-mobile-adm-inicio`, mergeada em
> `feature/mobile-adm` depois de finalizada e testada.
> Tela: Claude Design `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html`, bloco
> `INÍCIO` (linhas 41–154) e `renderVals` (o cálculo de `tiles`, `bars`, `topJoias`, `recent`).
> Specify aberto em 2026-10-22, com as quatro decisões do usuário em *Assumptions*.

## Problem Statement

A primeira pergunta da Adri ao abrir o app é *"como está a loja hoje, e o que precisa de mim?"*. O
Dashboard do Backoffice responde, mas no computador, e com dois números que discordam da régua de
dia de Brasília (`BL-046`: o gráfico e o "Fat. do Mês" ainda são UTC e contam pedido criado). A aba
Início da `72` é um "chega em breve". Esta feature a enche com a resposta, no celular, sem nenhum
número decidido pelo relógio do aparelho.

## Goals

- [ ] A Início responde, numa tela, os quatro números do movimento em Hoje · Ontem · Semana, o que
      precisa da Adri, as vendas dos últimos 7 dias, o mês, as clientes novas, as joias mais pedidas
      e os últimos pedidos.
- [ ] Nenhum número da tela é calculado pelo dia do navegador: todo recorte de dia, semana e mês é
      decidido no banco (`AD-055`), e toda contagem de "precisa de ação" é a **mesma** régua da lista
      de pedidos.
- [ ] A tela nunca mostra número de cache, número zerado no lugar de uma falha, ou número de uma
      conta que perdeu o acesso.

## Out of Scope

| O que | Por quê |
| --- | --- |
| A lista de pedidos e o filtro por visão/bloco | feature `74`. A `73` só **leva** a `/pedidos` com a visão no endereço |
| O detalhe do pedido e as ações | feature `75`. As linhas de "Últimos pedidos" viram link lá |
| O selo de contagem na aba Pedidos (o `badge` do protótipo) | é da barra de abas, e mostra o recorte da `74`; entra com a `74` |
| Aviso de pedido novo com o app fechado | feature `79` (push) |
| Consertar o gráfico e o "Fat. do Mês" do Dashboard do Backoffice (`BL-046`) | é outra tela. A RPC nova **permite** o conserto (mesma régua), mas trocar o Dashboard é decisão à parte |
| Escolher outro período (mês anterior, intervalo livre) | o protótipo tem três períodos fixos |
| Gráfico interativo (toque na barra, tooltip) | o protótipo mostra o valor acima da barra |
| Mudar o cabeçalho da `72` (marca + menu da conta) | decisão da `72`; o avatar-"Sair" do protótipo é o `AccountMenu` que já existe |

---

## Assumptions & Open Questions

| Assunção / decisão | Escolha | Razão | Confirmado? |
| --- | --- | --- | --- |
| Escopo | **Tudo na `73`**, com uma migration (uma RPC admin nova ao lado de `store_movement`) | decisão do usuário, 2026-10-22 | **s** |
| Atualização com o app aberto | **Realtime, como o Dashboard**: assina `orders` e relê a cada mudança. Também relê ao abrir a aba, ao voltar ao app, ao puxar e na virada do dia de Brasília | decisão do usuário, 2026-10-22 | **s** |
| Links para telas que ainda não existem | **Link agora, destino depois**: "Ver pedidos", "Ver todos" e cada bloco de "Precisa de você" levam a `/pedidos` com a visão no endereço, e a `74` passa a obedecer; as linhas de "Últimos pedidos" são texto até a `75` | decisão do usuário, 2026-10-22 | **s** |
| "Clientes novas" | quem teve a **primeira venda da vida** (régua do `AD-055`) no mês corrente de Brasília. Convidada conta, agrupada por e-mail normalizado (a mesma identidade de `customer_list`); importadas da Nuvemshop contam | decisão do usuário, 2026-10-22 | **s** |
| O gráfico de 7 dias | **faturamento** (soma de `total`) das vendas de cada dia de Brasília, hoje incluso, valor em R$ mil com uma casa | o protótipo: "Pedidos pagos, em R$ mil", e `bars` divide `v / 1000` | **s** (protótipo) |
| "Joias mais pedidas no mês" | **quantidade de peças** (soma de `order_items.quantity`) nas vendas do mês, agrupada por **produto** (variações juntas), as **4** primeiras; empate por nome | o protótipo: `qty: plural(n, 'peça', 'peças')`, 4 linhas | **s** (protótipo) |
| Item importado sem produto no catálogo (`product_id` `nuvemshop:…`) | agrupa pelo **nome congelado** (`product_name`) | 35 de 59 itens importados não casaram; somá-los sob "sem produto" esconderia a peça | n — confirmar |
| "Venda" | lista positiva do `AD-055`: `payment_status = 'approved'` e `status <> 'cancelled'`, no dia de Brasília de `paid_at` | a régua que `store_movement` já usa; uma segunda definição seria o defeito 01 | **s** (`AD-055`) |
| "Do mês" | do dia 1 do mês corrente de Brasília, 00:00, até agora | mesmo molde de "Esta semana" | n — confirmar |
| Os 7 dias | hoje e os 6 dias de Brasília anteriores, um valor por dia, na ordem do mais antigo para hoje; dia sem venda é `0` | o protótipo desenha 7 barras, a última "hoje" | **s** (protótipo) |
| "Precisa de você" | **quatro blocos**, os mesmos de `QUEUE_TILES` do painel: Aguardando material (o único com acento, com a idade do mais antigo), Pago a separar, Enviado sem rastreio, Pix aguardando. O número do cabeçalho de seção (se houver) é a **união dos três primeiros** — a visão `precisa-acao` | o protótipo (`TILES`, `pixInQueue` padrão `true`) e o painel. Pix fica porque diz "isto **não** é fila" | **s** (protótipo) |
| A idade do mais antigo | `queueAge(aguardando_desde, lido_em)` — a duração em blocos de 24 h desde o `created_at` do mais antigo aguardando material, com o instante do **servidor** no lugar do relógio do aparelho | **emendada no design**: `queueAge` (`core/material`) já é o dono da idade ao lado do mesmo bloco no painel; uma régua por dia de Brasília diria "há 10 dias" onde o painel diz "há 9" | **s** (design) |
| "Últimos pedidos" | os **4** pedidos mais recentes por `created_at`, de **qualquer** estado (inclusive Pix pendente e cancelado), com nome, número, há quanto tempo, total e a situação | o protótipo ordena `all` por data, sem filtro | n — confirmar |
| A situação de cada pedido | o rótulo e o tom de `orderSituation` (`@estrelinha/core/orders`), o mesmo da loja | dono único do rótulo (`situacaoComDonoUnico`) | **s** |
| Saudação | "Bom dia" de 05:00 a 11:59, "Boa tarde" de 12:00 a 17:59, "Boa noite" de 18:00 a 04:59, **na hora de Brasília devolvida pelo banco**, seguida do primeiro nome. O nome é "Adri" | o protótipo diz "Bom dia, Adri."; "Adri" é como a dona assina | n — confirmar |
| A linha da data ("quinta-feira, 22 de outubro" — 22/10/2026 é uma quinta; o rascunho dizia quarta) | o dia de Brasília devolvido pelo banco, escrito por extenso em pt-BR | regra de dia | **s** (`AD-055`) |
| Valores em dinheiro | Faturamento e o "do mês" em reais sem centavos (`R$ 1.077`); ticket com centavos (`R$ 359,00`); "Últimos pedidos" com centavos | o protótipo (`fmt0` × `fmt`) | **s** (protótipo) |
| Visitas | o número de `store_movement` (navegadores distintos), com o mesmo aviso de que não é "pessoas" | `AD-055`, `semPessoas.test.ts` | **s** |
| Ordem das releituras concorrentes | a resposta de uma leitura **mais antiga** que chega depois de uma mais nova é descartada | o mesmo token de sequência das listagens do painel | **s** |

**Open questions:** nenhuma em aberto. As marcadas `n — confirmar` estão assumidas com o padrão
acima e voltam ao usuário no fecho, como na `71`.

---

## User Stories

### P1: O movimento da loja no topo ⭐ MVP

**User Story**: Como Adri, quero ver ao abrir o app quanto a loja faturou e vendeu, o ticket e as
visitas, em hoje, ontem e na semana, para saber como está o dia sem abrir o computador.

**Why P1**: é a primeira pergunta e o maior bloco da tela.

**Acceptance Criteria**:

1. WHEN a Início abre THEN ela SHALL chamar `store_movement` uma vez, sem argumento, e desenhar
   Faturamento, Vendas, Ticket médio e Visitas do período **Hoje**. (`MAI-01`)
2. WHEN a Adri toca em Ontem ou Semana THEN os quatro números SHALL trocar para aquele período
   **sem nova leitura**, e o período escolhido SHALL ser marcado (`aria-pressed`). (`MAI-02`)
3. WHEN não há venda no período THEN o ticket SHALL aparecer como `—`, o faturamento como `R$ 0`
   e as vendas como `0` — nunca `R$ 0,00` no ticket. (`MAI-03`)
4. WHEN a tela abre THEN o cabeçalho SHALL dizer a saudação e a data **pelo dia e pela hora de
   Brasília que o banco devolveu**, nunca pelo relógio do aparelho. (`MAI-04`)

**Independent Test**: com o banco local semeado nas bordas de 21h–24h de Brasília, abrir a Início
num aparelho com o fuso em UTC e conferir os números contra o cálculo à mão.

---

### P1: Precisa de você ⭐ MVP

**User Story**: Como Adri, quero ver quantos pedidos esperam por mim, por motivo, e há quanto tempo
o mais antigo espera, para saber o que fazer primeiro.

**Why P1**: é a segunda pergunta ("o que precisa de mim?").

**Acceptance Criteria**:

1. WHEN a Início abre THEN ela SHALL mostrar os quatro blocos — Aguardando material, Pago a
   separar, Enviado sem rastreio, Pix aguardando —, cada um com a contagem, o rótulo e a frase do
   painel, e o primeiro com a idade do mais antigo quando a contagem for maior que zero. A idade é o
   rótulo de `queueAgeLabel`, o mesmo do painel ao lado do mesmo bloco: "o mais antigo há N dias", ou
   "o mais antigo **parado** há N dias" quando o pedido passa do limite da régua (`tier` `stale`) —
   duração por `queueAge(aguardando_desde, lido_em)`, nunca pelo relógio do aparelho (emenda do
   `design.md` §8; texto emendado no conserto r1 da verificação). (`MAI-05`)
2. WHEN a contagem de um bloco é calculada THEN ela SHALL usar a **mesma** regra que o filtro
   daquele bloco na lista de pedidos (`74`) e no painel — uma regra num lugar só, lida pelos dois
   apps — e a de "Precisa de ação" SHALL ser a **união** dos três primeiros, nunca a soma. (`MAI-06`)
3. WHEN a Adri toca num bloco THEN o app SHALL ir para `/pedidos` com aquele bloco no endereço; e
   WHEN toca em "Ver pedidos" THEN SHALL ir para `/pedidos` com a visão "Precisa de ação" no
   endereço. Os dois endereços SHALL ser montados por um dono só, o mesmo que a `74` lerá. Os dois
   nunca são montados juntos; WHEN um endereço traz `?bloco=` **e** `?visao=` THEN a leitura SHALL
   obedecer ao **bloco** (o mais específico) — emenda do fecho da r3 da verificação, lacuna E1. (`MAI-07`)
4. WHEN todos os blocos estão em zero THEN a seção SHALL continuar visível, com os zeros, e sem
   frase festiva. (`MAI-08`)

**Independent Test**: semear um pedido de cada estado e conferir cada contagem contra o recorte do
painel em `/admin/pedidos`, e a união contra a visão "Precisa de ação".

---

### P1: O resumo do mês e da semana ⭐ MVP

**User Story**: Como Adri, quero ver as vendas dos últimos 7 dias, o faturamento do mês, quantas
clientes compraram pela primeira vez e quais joias mais saíram, para acompanhar o mês.

**Why P1**: escolhido pelo usuário para entrar na `73` (decisão 2026-10-22).

**Acceptance Criteria**:

1. WHEN a Início abre THEN ela SHALL ler os quatro blocos do mês e da semana numa **única** RPC
   admin nova, sem argumento de data, ao lado de `store_movement`, que decide dia, semana e mês pelo
   mesmo dono do dia (`store_day`/`store_day_start`). (`MAI-09`)
2. WHEN o gráfico "Vendas · 7 dias" é desenhado THEN ele SHALL ter **7** barras, de seis dias atrás
   até hoje, cada uma com o faturamento das vendas daquele dia de Brasília em R$ mil com **até** uma
   casa — 1000 ⇒ "1", 1500 ⇒ "1,5", 289 ⇒ "0,3", como o protótipo (`maximumFractionDigits: 1`; emenda
   do conserto r1 da verificação) — (`—` no dia sem venda), o dia da semana abreviado embaixo ("hoje" na última) e o total dos 7 dias
   no cabeçalho. A barra mais alta SHALL ser a do maior valor (84 px), e a de hoje SHALL ter a cor de
   destaque. Toda barra SHALL ter um **piso de 4 px** — o dia sem venda **e** o dia com venda
   pequena demais para a proporção (R$ 10 com o maior em R$ 2.650 arredondaria para 0) —, para uma
   venda de verdade nunca sumir do gráfico; o piso vem do protótipo e do `design.md`, e entrou na
   letra no fecho da r3 da verificação, lacuna G1. (`MAI-10`)
3. WHEN o card "Faturamento do mês" é desenhado THEN ele SHALL dizer o nome do mês de Brasília
   ("Fat. de outubro"), a soma e a quantidade de vendas do mês ("38 pedidos pagos", com o singular
   em 1). (`MAI-11`)
4. WHEN o card "Clientes novas" é desenhado THEN ele SHALL contar quem teve a primeira venda da
   vida no mês, agrupando convidada por e-mail normalizado e cadastro por `customer_id`, com a
   linha "primeira compra no mês". (`MAI-12`)
5. WHEN "Joias mais pedidas no mês" é desenhada THEN ela SHALL listar até **4** produtos por
   quantidade de peças nas vendas do mês, variações somadas no produto, empate por nome, cada linha
   com "N peças" ("1 peça" no singular); sem venda no mês, SHALL dizer que ainda não houve venda
   neste mês. (`MAI-13`)

**Independent Test**: probes SQL contra o banco local, como admin, com fixturas na virada de mês,
na virada de dia às 21h–24h de Brasília, convidada com duas compras em meses diferentes e pedido
pago e depois cancelado.

---

### P1: Últimos pedidos ⭐ MVP

**User Story**: Como Adri, quero ver os últimos pedidos que entraram, para saber quem acabou de
comprar.

**Acceptance Criteria**:

1. WHEN a Início abre THEN ela SHALL listar os **4** pedidos mais recentes por criação, de
   qualquer estado, cada um com o nome da cliente, o número formatado por `formatOrderNumber`, há
   quanto tempo, o total com centavos e o selo da situação de `orderSituation`. (`MAI-14`)
2. WHEN a Adri toca em "Ver todos" THEN o app SHALL ir para `/pedidos` com a visão "Tudo" no
   endereço, pelo mesmo dono dos endereços de `MAI-07`. As linhas não SHALL ser links nesta
   feature. (`MAI-15`)
3. WHEN não há pedido nenhum THEN a seção SHALL dizer que ainda não há pedidos. (`MAI-16`)

---

### P1: Falha, recusa e frescor ⭐ MVP

**User Story**: Como Adri, quero que o app nunca me mostre um número errado como se fosse certo:
nem velho, nem zerado por falha, nem de uma conta sem acesso.

**Why P1**: um número errado no celular é pior que nenhum. "Aguardando pagamento" velho faz cobrar
quem já pagou (`AD-056`).

**Acceptance Criteria**:

1. WHEN uma leitura falha sem dado anterior THEN o bloco dela SHALL dizer que não carregou e
   oferecer "Tentar de novo", **sem número nenhum** — nem zero, nem de cache. Os outros blocos SHALL
   continuar com os números deles. (`MAI-17`)
2. WHEN uma **releitura** falha com dado já na tela THEN os números SHALL continuar, com a hora da
   última leitura boa ("Atualizado às 14h32" — a hora de Brasília do `lido_em` do servidor, escrita por
   `formatStoreHour`, o dono da hora escrita; emenda da T18), e o app SHALL avisar que não conseguiu atualizar.
   Uma releitura nunca SHALL trocar números por esqueleto. (`MAI-18`)
3. WHEN a Adri puxa a tela para baixo no topo THEN o app SHALL reler todos os blocos, mostrando
   que está relendo, e parar de mostrar ao terminar. (`MAI-19`)
4. WHEN um pedido é criado ou muda no banco com a Início aberta THEN o app SHALL reler os blocos
   pelo **Realtime** de `orders`, com **um** canal só enquanto a Início está montada, e SHALL fechá-lo
   ao sair da aba. (`MAI-20`)
5. WHEN o app volta ao primeiro plano, ou o dia de Brasília vira com a tela aberta THEN o app SHALL
   reler. O prazo da virada SHALL ser medido pela **duração** que o servidor devolveu, nunca pelo
   relógio do aparelho. (`MAI-21`)
6. WHEN uma leitura é recusada por falta de papel (`42501` da RPC admin) THEN o app SHALL reconferir
   o papel (`retryAdminCheck`) e levar à recusa da `72` — "Esta conta não tem acesso ao painel.", com
   "Sair" —, e nunca a números vazios ou zerados. Herdado da `72`; a frase é a dela, não uma nova
   (emenda do design). (`MAI-22`)
7. WHEN a Início lê qualquer número THEN ela SHALL ler **só** RPC admin (`store_movement` e
   `store_overview`), nunca `orders` pelo PostgREST: a RLS de `orders` devolve **os pedidos da
   própria conta** a uma cliente, e não erro, e uma contagem assim desenharia um número falso
   (`AD-057`). (`MAI-23`)
8. WHEN uma leitura falha por rede (e não por papel) THEN o app SHALL tratá-la como falha de
   leitura (`MAI-17`), e nunca como "Esta conta não tem acesso". (`MAI-24`)
9. WHEN duas releituras estão no ar e a mais antiga responde por último THEN a resposta dela SHALL
   ser descartada. (`MAI-25`)
10. WHEN o app está sem conexão THEN vale a tela "Sem conexão" da `72`, e o service worker não
    SHALL guardar nenhuma resposta das leituras desta feature (`MAF-20` continua valendo). (`MAI-26`)

---

### P1: A tela no celular ⭐ MVP

**Acceptance Criteria**:

1. WHEN a Início é desenhada em 360×800 e 412×915 THEN o `body` SHALL não rolar na horizontal; a
   faixa de blocos de "Precisa de você" SHALL rolar **dentro de si**; e todo alvo de toque (períodos,
   blocos, "Ver pedidos", "Ver todos", "Tentar de novo") SHALL ter ao menos 44 px. (`MAI-27`)
2. WHEN o maior valor plausível aparece (`R$ 99.999` no faturamento, `R$ 9.999,99` no ticket) THEN
   ele SHALL caber numa linha no seu card. (`MAI-28`)
3. WHEN a tela abre THEN o rodapé "Produtos, vitrine e configurações da loja seguem no Backoffice"
   SHALL continuar presente, por ser do layout da `72`. (`MAI-29`)
4. WHEN a primeira leitura está em curso THEN cada bloco SHALL mostrar um esqueleto que ocupa o
   lugar do número, com `aria-busy`, e o leitor de tela SHALL ler cada número com o rótulo dele
   ("Faturamento, hoje, R$ 1.077"). (`MAI-30`)
5. WHEN o sistema pede menos movimento THEN o esqueleto e a troca de período SHALL não se mover.
   (`MAI-31`)

---

## Edge Cases

- WHEN a tela abre na segunda-feira THEN "Semana" SHALL ser igual a "Hoje" (`AD-055`).
- WHEN a tela abre no dia 1 THEN "do mês" SHALL ser igual a "Hoje" em faturamento e vendas.
- WHEN um pedido pago ontem é cancelado hoje THEN ele SHALL sair de Ontem, da semana, dos 7 dias,
  do mês, das clientes novas e das joias mais pedidas.
- WHEN uma convidada compra em setembro e de novo em outubro THEN ela SHALL **não** contar como
  cliente nova em outubro.
- WHEN uma cliente cadastrada compra pela primeira vez com um pedido de convidada antigo no mesmo
  e-mail THEN conta a venda mais antiga do e-mail (a adoção de pedidos órfãos de `ESP-22` une os
  dois).
- WHEN o mês tem menos de 4 produtos vendidos THEN a lista SHALL ter só os que existem.
- WHEN a conexão cai no meio da sessão e volta THEN o canal Realtime SHALL voltar a avisar, ou a
  volta ao primeiro plano SHALL reler (`MAI-21`); o app nunca SHALL ficar parado com números velhos
  sem dizer a hora deles.
- WHEN a Adri sai da conta com a Início aberta THEN o canal SHALL ser fechado, e nenhuma resposta
  em voo SHALL ser desenhada depois.

## Implicit-requirement dimensions (sweep)

| Dimensão | Onde está |
| --- | --- |
| Input validation & bounds | sem entrada de usuário além do período; as RPCs não recebem data (`MAI-01`, `MAI-09`); limites de 4 itens (`MAI-13`, `MAI-14`) e 7 barras (`MAI-10`) |
| Failure / partial-failure | `MAI-17`, `MAI-18`; cada bloco falha sozinho |
| Idempotency / retry / dedup | leitura pura; "Tentar de novo" e o puxar só releem (`MAI-19`); `MAI-25` descarta resposta fora de ordem |
| Auth boundaries & rate limits | RPC admin com `has_role` e `42501` (`MAI-22`), contagens protegidas contra a RLS de cliente (`MAI-23`), falha de rede ≠ recusa (`MAI-24`). Sem limite de taxa: só uma conta admin lê, e as releituras são disparadas por evento |
| Concurrency / ordering | `MAI-25`; um canal por montagem (`MAI-20`) |
| Data lifecycle / expiry | nenhum cache de resposta (`MAI-26`); `store_visits` mantém os 8 dias da `71` |
| Observability | N/A porque é leitura de tela; a falha aparece na tela (`MAI-17`/`MAI-18`), e o app não tem telemetria |
| External-dependency failure | Supabase e Realtime: `MAI-17`, `MAI-21` (o canal que cai não deixa a tela velha calada) |
| State-transition integrity | N/A porque a tela não escreve nada |

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MAI-01..04 | P1: Movimento | Design | Pending |
| MAI-05..08 | P1: Precisa de você | Design | Pending |
| MAI-09..13 | P1: Mês e semana | Design | Pending |
| MAI-14..16 | P1: Últimos pedidos | Design | Pending |
| MAI-17..26 | P1: Falha, recusa e frescor | Design | Pending |
| MAI-27..31 | P1: A tela no celular | Design | Pending |

**Coverage:** 31 total, 0 mapped to tasks (Design pendente).

> **Renumeração**: o rascunho tinha `MAI-01..08` com outros textos. Os oito foram absorvidos:
> 01 → `MAI-01`/`02`; 02 → `MAI-03`; 03 → `MAI-06`; 04 → `MAI-17`; 05 → `MAI-19`; 06 → `MAI-29`;
> 07 → `MAI-22`/`23`; 08 → `MAI-24`.

## Success Criteria

- [ ] Para um mesmo instante, os números da Início batem com os de `/admin` (movimento) e com as
      contagens de `/admin/pedidos` (blocos), medidos contra o banco local.
- [ ] Com o aparelho em qualquer fuso, nenhum número muda.
- [ ] Desligar a rede, tirar o papel admin ou derrubar uma RPC nunca põe na tela um número que não
      veio de uma leitura boa daquela conta.
- [ ] Prova em navegador em 360 e 412 de largura, no build servido, sem rolagem horizontal.
