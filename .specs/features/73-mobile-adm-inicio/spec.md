# 73 — mobile-adm: Início (métricas)

> **RASCUNHO**: escopo e histórias P1 do programa mobile-adm (`AD-056`). Ao abrir a feature, rodar
> o Specify completo (varredura das dimensões implícitas, portão de fechamento) e o Design. Roteiro e
> decisões comuns: `.specs/features/72-mobile-adm-fundacao/spec.md`. Depende da `72`.
> Telas: Claude Design `a780eec8-…`, `Ateliê Admin.dc.html`. — tela **Início**.

## Problem Statement
A primeira pergunta da Adri ao abrir o app é "como está a loja hoje, e o que precisa de mim?". O
Dashboard do Backoffice responde, mas no computador.

## Escopo (do protótipo)
- Saudação ("Bom dia, Adri.") pelo horário de Brasília.
- **Movimento da loja**: Faturamento · Vendas · Ticket médio · Visitas, em Hoje / Ontem / Esta semana.
- **Precisa de você**: contagem dos pedidos acionáveis, com "Ver pedidos" levando ao recorte
  *Precisa de ação* da `74`.
- **Vendas · 7 dias**: barras de pedidos pagos por dia, em R$ mil.
- **Faturamento do mês** e pedidos pagos no mês; **Clientes novas** (primeira compra no mês).
- **Joias mais pedidas no mês**; **Últimos pedidos** com "Ver todos".

## Regras que sobem para `core` (ou ficam no banco)
- `entities/stats/model/storeMovement.ts` (o bloco da `71`) sobe para `core`. A leitura é a RPC
  `store_movement` (`AD-055`), e **o cliente não calcula dia nenhum**.
- "Do mês", "7 dias" e "primeira compra no mês" são **dias de Brasília**. Hoje o painel não tem essas
  agregações: elas nascem como RPC admin ao lado de `store_movement`, com o mesmo dono do dia
  (`store_day`). **Nunca em UTC no cliente** (o defeito que a `71` tirou dos cards "Hoje").
- "Venda" é a lista positiva do `AD-055` (`approved` e não `cancelled`).
- "Precisa de ação" é o **mesmo** predicado da lista de pedidos (`74`), nunca uma segunda contagem.

## P1 — critérios
1. WHEN a Início abre THEN ela SHALL ler `store_movement` uma vez e desenhar os quatro números nos três períodos. (`MAI-01`)
2. WHEN não há venda num período THEN o ticket SHALL aparecer como `—`, e faturamento e vendas como zero. (`MAI-02`)
3. WHEN há pedidos acionáveis THEN "Precisa de você" SHALL mostrar a mesma contagem que o recorte da `74`. (`MAI-03`)
4. WHEN a leitura falha THEN o bloco SHALL dizer que não carregou e oferecer tentar de novo, **sem número de cache**. (`MAI-04`)
5. WHEN ela puxa a tela para baixo THEN os dados SHALL ser relidos (pull-to-refresh). (`MAI-05`)
6. WHEN a tela abre THEN o rodapé "Produtos, vitrine e configurações da loja seguem no Backoffice" SHALL estar presente. (`MAI-06`)

7. WHEN a conta perde o papel admin com o app aberto THEN a leitura recusada pela RLS SHALL levar a uma tela que diz que o acesso foi removido, com "Sair", e nunca a números vazios ou zerados. Herdado da `72` (emenda de 2026-10-22). (`MAI-07`)
8. WHEN a checagem de admin falha por rede (e não por papel) THEN o app SHALL dizer que não conseguiu conferir o acesso, com "Tentar de novo", e nunca "Esta conta não tem acesso". Depende da `BL-048`. (`MAI-08`)
   > **Nota (2026-10-22):** a `BL-048` foi FECHADA na `72` (Fase 6, `MAF-22`/`MAF-23`): o `AuthProvider` expõe `adminStatus` (`unknown` no erro e no teto de 8 s) e `retryAdminCheck()`, e o app já tem a tela "Não consegui conferir seu acesso." (`features/access-check`). O critério continua valendo para as leituras de dado da `73`: falha de rede numa leitura não é recusa.

## Perguntas abertas
- "Joias mais pedidas": por quantidade de itens ou por número de pedidos? Variações agrupadas no produto?
- O gráfico de 7 dias conta **pedidos** (texto do protótipo) ou **faturamento** (eixo em R$ mil)? Hoje o protótipo diz as duas coisas.
- Atualização ao vivo (Realtime, como o Dashboard) ou só ao abrir e puxar?
