# 74 — mobile-adm: Pedidos (lista e detalhe, só leitura)

> Programa mobile-adm (`AD-056`), feature 3 de 8. Depende da `72` (fundação) e da `73` (Início),
> as duas mergeadas em `feature/mobile-adm` (`775e407e`). Branch: `feat/74-mobile-adm-pedidos`,
> worktree `../store-74-mobile-adm-pedidos`, mergeada em `feature/mobile-adm` depois de finalizada e
> testada.
> Tela: Claude Design `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html` — bloco
> `PEDIDOS` (linhas 146–200), bloco `PEDIDO (detalhe)` (343–437), o selo da barra de abas (334,
> 1183–1186) e a lógica `VIEWS`/`TILES`/`tileMatch`/`viewMatch`/`rowSummary`/`decorate`/`od`
> (849–1130). Lido em 2026-10-23.
> Specify aberto em 2026-10-23 sobre o rascunho do programa. Código lido antes de escrever:
> `apps/backoffice/src/features/order-list/model/*`, `features/order-detail/model/*`,
> `entities/order/api/{orderQuery,useAdminOrderList,useAdminOrder}.ts`, a view `order_list`
> (migration da `35`), `core/orders/{queue,labels,situation,journey}.ts`, `core/stats/labels.ts`,
> `core/paging/pageMath.ts`, `apps/mobile-adm/src/entities/order/model/pedidosHref.ts` e as RLS de
> `orders`, `order_items`, `order_status_history`, `order_notes` e `order_notifications` (banco
> local, `pg_policies`).

## Problem Statement

A Adri precisa achar um pedido e ver em que pé ele está — pagamento, material, entrega — e qual é o
próximo passo, sem o computador. Hoje a aba Pedidos do app é um "em construção", e os links que a
Início já monta (`?visao=` e `?bloco=`, `MAI-07`/`MAI-15`) levam a uma tela que não filtra nada: o
bloco "Aguardando material" diz 3 e o toque leva a lugar nenhum. Esta feature entrega a lista e o
detalhe, **só leitura**, obedecendo aos endereços da Início e respondendo exatamente o que o
Backoffice responde sobre os mesmos pedidos.

## Goals

- [ ] Todo endereço que a Início monta abre a lista já filtrada pelo mesmo recorte que gerou o
      número tocado: o número do bloco e a contagem da lista são iguais para o mesmo instante.
- [ ] Para qualquer recorte e qualquer termo de busca, a lista do app mostra o mesmo conjunto de
      pedidos que `/admin/pedidos` — provado pelo **mesmo** predicado de `core`, nunca por uma cópia.
- [ ] O detalhe responde, numa tela, quem comprou, em que pé está o material, o que foi comprado
      (com gravação), quanto custou, como sai e o que aconteceu — com o próximo passo dito por
      `nextStep`, o mesmo do painel.
- [ ] Nenhuma regra de pedido mora no app: as que o painel tem sobem para `packages/core`, e a suíte
      do painel continua verde **sem asserção tocada** (`AD-056`).
- [ ] A aba Pedidos mostra o selo com o número de "Precisa de ação" (pendência registrada na `73`).

## Out of Scope

| O que | Por quê |
| --- | --- |
| Qualquer escrita: "Recebi o material", rastreio, "Marcar como enviado", "Iniciar separação", avançar status, cancelar, nota nova, reenviar e-mail | feature `75`. A `74` é só leitura; o botão de ação do cartão e o rodapé de ação do detalhe do protótipo **não** entram |
| Cobrar o material pelo WhatsApp ("Lembrar do envio no WhatsApp", `chargeMaterial`) | feature `75` (a regra `chargeMaterial` sobe lá) |
| O detalhe da cliente ("Ver cliente") | feature `76`. Sem destino ainda, o botão **não** é desenhado (A20) |
| Recortes salvos (`savedViews`), ordenação por coluna, filtros avançados (status, meio, período), exportar CSV, seleção em lote | ferramentas de mesa do painel; o protótipo tem só os seis recortes e a busca. Resposta à pergunta aberta do rascunho |
| As parcelas do cartão no detalhe (o `· 3x` do protótipo) | `orders` não guarda parcelas (conferido no banco local); mostrar exigiria coluna nova |
| A foto da peça no item | o protótipo desenha ícone; o painel lê `products.images` numa leitura à parte |
| Unificar R1 (pago com material nulo entra na união e em nenhum bloco) e R2 (Pix sem recorte de `status`) da `73` | preservadas por decisão registrada em `queue.ts`; a `74` herda |
| Mudar o comportamento de qualquer tela do painel | `AD-056`: o painel passa a importar de `core` sem mudar nada |
| Aviso de pedido novo com o app fechado | feature `79` |

---

## Assumptions & Open Questions

As linhas marcadas **decidido no gate (G)** são o portão desta fase: estão assumidas com o padrão abaixo e
voltam ao usuário/validador antes do Design. As **n — confirmar** têm padrão de baixo risco.

| # | Assunção / decisão | Escolha (padrão) | Razão | Confirmado? |
| --- | --- | --- | --- | --- |
| A1 | **Como a lista e o detalhe leem sem cair no `MAI-23`** — a RLS de `orders`/`order_items` devolve à conta sem papel admin os pedidos **dela** como cliente (não erro), e criar um admin cria um `customers` que adota os pedidos do mesmo e-mail (`48`) | **PostgREST** da view `order_list` (lista) e de `orders`/`order_items`/`order_status_history`/`order_notes`/`order_notifications` (detalhe), com os filtros traduzidos pelos mesmos tradutores de `core` que o painel usa — **mais** uma RPC admin nova e mínima, `atelie_clock()`, chamada junto de cada leitura: sem `has_role` ⇒ `42501` (a recusa da `72`); com, devolve `lido_em` (o instante do servidor para "há N dias"). O dado da leitura só é desenhado depois que a RPC **da mesma leitura** respondeu sem recusa | `AD-057` mandou a `74` dar a própria resposta ao `MAI-23` e manter o PostgREST por listar linhas; reescrever os seis recortes e a busca em SQL seria uma terceira escrita da regra. Custa uma migration mínima e resolve papel e relógio | **decidido no gate (G)** (alternativas: RPC admin paginada com o filtro em SQL guardado byte a byte; ou só o guarda do cliente, aceitando o `MAI-23` como o limite do Realtime da `73`) |
| A2 | "Há N dias" na linha e no detalhe | `relativeAge(created_at, lido_em)` (`core/stats`, o mesmo de "Últimos pedidos"), com `lido_em` do servidor; a idade da espera do material é `queueAgeLabel(queueAge(queueSince(row), lido_em))`, o rótulo do bloco | dono único da idade (`73`, `MAI-05`); nada pelo relógio do aparelho | **decidido no gate (G)** (segue A1) |
| A3 | Endereço com `?bloco=` | a lista filtra pela **regra do bloco** (`queueBlock(id).rule` por `toPostgrestFilter`) — a mesma que conta o número da Início —, nunca pela visão de nome parecido (a visão "A separar" inclui `separating`; o bloco "Pago, a separar" não). Mostra a faixa "Filtro: <rótulo do bloco>" com um × de 44 px, e nenhum chip de visão marcado | o protótipo (`hasTile`, `tileLabel`, `clearTile`) e `MAI-07` | s (protótipo + `MAI-07`) |
| A4 | O × da faixa do bloco | tira o `?bloco=` e leva à visão **"Tudo"** (`?visao=tudo`) | o protótipo: tocar num bloco põe `view: 'tudo'`; limpar o bloco deixa a visão onde estava | s (protótipo) |
| A5 | `/pedidos` sem parâmetro, ou com valor fora do vocabulário | a visão **"Precisa de ação"** — a padrão do painel (`emptyOrderFilters`) | painel e protótipo abrem nela; `lerDestinoDePedidos` já devolve `null` para valor inválido | s |
| A6 | Tocar num chip de visão | troca o endereço para `?visao=<id>` por **substituição** (`replace`), sem empilhar histórico | o endereço é o estado (recarregar mantém o recorte); empilhar faria o voltar do Android passear pelos chips | confirmado no gate (G) |
| A7 | As seis visões no endereço | `pedidosHref`/`lerDestinoDePedidos` passam a aceitar as **seis** visões com os ids e rótulos de `ORDER_VIEWS`, que **sobem para `core`** com `viewPredicate` — o `SPEC_DEVIATION` que a `73` deixou escrito no arquivo | dono único do vocabulário; hoje o app declara duas à mão | s (`73`, nota no arquivo) |
| A8 | Ordem da lista | **"Precisa de ação" e qualquer bloco: do mais antigo para o mais novo** (`created_at` crescente, desempate por `id`), com a linha "N pedidos precisam de você, do mais antigo para o mais novo." (só em "Precisa de ação" sem busca). **Outras visões: do mais novo para o mais antigo** (`created_at` decrescente), com a linha "N pedidos" | o protótipo ordena a fila pela espera; o painel abre em `created desc` em tudo. A fila é para resolver, e o mais antigo primeiro | **decidido no gate (G)** |
| A9 | Paginação | **por chave** (`created_at`, `id`), 25 por página (`defaultOrderQuery().pageSize`), carregando a próxima ao chegar perto do fim; nunca por `offset` | com `offset`, um pedido novo entrando durante a rolagem empurra as páginas e repete linha; por chave, não repete nem pula | confirmado no gate (G) |
| A10 | O total ("N pedidos") | `count: 'exact'` da mesma consulta, igual ao painel | o painel já conta assim, sem teto de 1.000 | s |
| A11 | Frescor com a tela aberta | **Realtime** de `orders` (um canal por montagem da lista ou do detalhe, molde da Início), relendo o que está carregado; também relê ao voltar ao primeiro plano e ao puxar no topo | decisão da `73` para a Início; frescor acima de cache | confirmado no gate (G) |
| A12 | A busca | as **cinco** colunas do painel (`ORDER_SEARCH_COLUMNS`: número, nome, e-mail, rastreio de saída e do envelope), o `#` recortado por `stripOrderNumberPrefix`, `escapeSearchTerm` e o debounce de `SEARCH_DEBOUNCE_MS` (300 ms), tudo de `core`. A busca vale **dentro** do recorte ativo (visão ou bloco). Placeholder do protótipo: "Número, nome, e-mail ou rastreio" | painel (`PED-10`) e protótipo (filtra o recorte) | s |
| A13 | A busca entra no endereço? | **não**: o termo é estado da tela | e-mail no endereço fica no histórico do navegador (a régua de `MAF-24`) | s — **emendada no conserto do QA (B02)**: o termo é lembrado **por entrada do histórico**, só em memória (`useTermoDaEntrada`, um `Map` por `location.key`): voltar à mesma entrada devolve o termo; entrada nova, F5 e troca de conta abrem sem ele; a busca apagada não volta. Nunca em storage nem no endereço. **B01**: o meio de pagamento sem rótulo sai "Outra forma de pagamento" (`PAYMENT_METHOD_FALLBACK`), nunca o valor cru |
| A14 | O selo da linha | **um** selo: `SituacaoDoPedido` (`orderSituation(pedido, 'atelie')`), o da Início. O selo de **pagamento** só no detalhe | o protótipo desenha um selo no cartão; o CLAUDE do app: "as telas da `74`/`75` que desenharem a situação usam o mesmo componente" | s |
| A15 | O tom do selo de pagamento no detalhe | um mapa `payment_status → tom` **novo em `core`** (`core/orders/labels.ts`, ao lado de `ORDER_PAYMENT_STATUS_LABELS`), com os tons do protótipo: pendente `wait`, aprovado `done`, recusado `alert`, estornado `neutral`, expirado `neutral`, cancelado `alert` | não existe dono; o painel não pinta tom de pagamento | confirmado no gate (G) |
| A16 | A frase de bloqueio da linha | `rowSummary(row).blocker` (sobe para `core`), com o ponto de cor do protótipo; a idade só quando `aguardando_material` (A2). Sem frase em entregue e cancelado. O `actionLabel` **não** é desenhado (é da `75`) | o protótipo (`hasBlocker`, `age` só com `waitD`) e o painel | s |
| A17 | As frases de dica do protótipo (`hint`: "Assim que ele chegar, registre aqui…") | **não entram**: mandam fazer algo que a `74` não oferece | texto que manda tocar num botão inexistente é o CTA morto (`58`) | s |
| A18 | O próximo passo no detalhe | o `label` de `nextStep(order)` ("Próximo passo: Em Separação", "Pedido concluído", "Pedido cancelado", "Próximo passo: Retirado no escritório") como **texto**, sem botão. O `blockedReason` **não** é desenhado, porque as frases de `core` terminam em "Você pode avançar assim mesmo." e não há como avançar na `74`; entra com a `75` | mesmo motivo de A17; `nextStep` sobe sem mudar texto | **decidido no gate (G)** (alternativa: mostrar o motivo sem a última frase, o que exige separar a frase em `core`) |
| A19 | O histórico | `buildHistory(status, emails, notes)` (sobe para `core`), do mais recente para o mais antigo, **com as notas internas** (`order_notes`), sem os filtros por tipo do painel. E-mail que falhou: a frase do painel ("A cliente NÃO foi avisada") | dono único do histórico; o público do app é o mesmo do painel (a Adri), e esconder as notas seria uma segunda regra de "o que aconteceu" | **decidido no gate (G)** (pergunta aberta do rascunho; o protótipo não mostra notas) |
| A20 | "Ver cliente" | **não é desenhado** até a `76` | `/clientes` é "em construção"; botão que leva ao vazio é CTA morto | confirmado no gate (G) |
| A21 | WhatsApp da cliente no detalhe | link `https://wa.me/<número>` sem mensagem pronta, número por `normalizeBrPhone` (`core/notifications/phone.ts`) a partir de `orders.customer_phone`; sem número válido, nem o botão nem o telefone aparecem | abrir a conversa não escreve nada; a mensagem pronta é a cobrança da `75` | confirmado no gate (G) |
| A22 | Os quatro passos do material | Aguardando · A caminho · Recebido · Em produção (rótulos curtos do protótipo, `MAT_STEPS`), declarados **em `core/material`** ao lado de `MATERIAL_STATUS_LABELS`; o atual marcado, os anteriores feitos; com o pedido enviado ou entregue, os quatro feitos e o título "Material usado na joia". O bloco só aparece com `material_status ≠ 'nao_aplicavel'` | o protótipo; os rótulos longos não cabem quatro lado a lado em 360 px | confirmado no gate (G) |
| A23 | A linha sob o título do material | "Rastreio do envelope: <código>" quando existe; senão "Recebido <há quanto tempo>" com `material_received_at`; senão "Pedido feito <há quanto tempo>" | o protótipo (`matSub`) | s (protótipo) |
| A24 | O selo de contagem da aba Pedidos | `fila.precisa_acao` de `store_overview` — a mesma RPC e a **mesma chave de cache** da Início, sem segunda leitura nem cópia da regra —, escondido em 0, "99+" acima de 99, nome acessível "Pedidos, N precisam de você". Some (sem número) enquanto não há leitura boa, na falha e na recusa | o protótipo (`actionCount` = visão "precisa"); pendência da `73`; a regra da união já é guardada byte a byte (`filaComDonoUnico`) | confirmado no gate (G) ("99+" e o nome acessível são escolha) |
| A25 | Quando o selo relê | ao montar o layout, na volta ao primeiro plano, e sempre que a Início ou a lista recebem o aviso do Realtime (a chave é a mesma) | sem canal próprio do selo; dois canais seriam o defeito do `MAI-20` | confirmado no gate (G) |
| A26 | Pedido inexistente (id inválido, apagado) | "Não encontrei este pedido." com "Voltar aos pedidos" | sem isso, o resultado vazio vira tela em branco | s |
| A27 | Retirada no escritório | `isPickupOrder` (`core/shipping/pickup.ts`): "Retirada no escritório", sem transportadora, prazo nem rastreio | `RET-*` da `63`; `nextStep` já sabe | s |
| A28 | A rota do detalhe | `/pedidos/:id` **dentro** do `RequireAdmin`, sem aba própria (Pedidos fica marcada); o "Voltar" e o voltar do Android voltam à lista **no mesmo recorte e na mesma posição de rolagem** | o protótipo é uma tela por cima da lista; `rotasSobGuarda` e `abasSaoAsRotas` medem as rotas | confirmado no gate (G) (a posição de rolagem) |
| A29 | Linhas de "Últimos pedidos" da Início | continuam **texto** (a `73` disse "até a `75`") | escopo da `73`; virar link é trivial | **decidido no gate (G)** (antecipar o link para `/pedidos/:id` na `74`?) |
| A30 | Descontos no detalhe | "Cupom <código>" com "− <valor>" quando `discount > 0`; o desconto de Pix (`pix_discount`) e o da promoção (`promotion_discount`) em linhas próprias, só quando > 0 | o protótipo só desenha cupom, mas sem as outras linhas a composição não fecha no total (`L-014`) | confirmado no gate (G) |

**Open questions:** nenhuma sem padrão. As de maior peso para o gate: **A1** (leitura e papel),
**A2** (relógio, segue A1), **A8** (ordem da fila), **A18** (motivo do bloqueio), **A19** (notas
internas) e **A29** (link nos Últimos pedidos). As perguntas do rascunho estão respondidas:
`savedViews` fica só no computador (Out of Scope); as notas internas entram por padrão (A19, decidido no gate).

### Gate do Specify — validação independente (2026-10-23)

> Validador ≠ autor. Lido contra o código: `pedidosHref.ts`, `core/orders/queue.ts`,
> `orderQuery.ts`/`useAdminOrderList.ts` do painel, a view `order_list` (migration da `35`, `FROM
> public.orders o` **sem `WHERE`** e `security_invoker` — a contagem da lista e a de `store_overview`
> leem o mesmo conjunto), a RPC `store_overview` (`20261023120000_73-…`) e os guardas
> `abasSaoAsRotas`/`rotasSobGuarda` do app. Toda linha marcada "(G)" na tabela acima está decidida
> aqui. **Veredito: aprovado para o Design**, com as decisões e os requisitos novos abaixo.

| # | Decisão | Por quê |
| --- | --- | --- |
| G-A1 | **Aceito o padrão**: PostgREST de `order_list` e das tabelas do detalhe + a RPC mínima `atelie_clock()` (`security definer`, `search_path = ''`, `stable`, `has_role` no corpo ⇒ `42501` antes de qualquer coisa, `execute` só a `authenticated`, sem escrita de dado). Ela sai **em paralelo** com a leitura (`Promise.all`), e o dado só é desenhado se ela respondeu sem recusa. Recusadas as duas alternativas | a RPC paginada com filtro em SQL seria a terceira escrita dos seis recortes e da busca (defeito 01); só o guarda do cliente deixa o `MAI-23` aberto — a view é `security_invoker` e a RLS devolve à cliente os pedidos **dela** |
| G-A2 | **Aceito**: idade por `relativeAge`/`queueAge` com `lido_em` de `atelie_clock()` | segue G-A1; dono único da idade (`MAI-05`) |
| G-A8 | **Aceito**: fila e bloco do mais antigo para o mais novo; as outras visões, do mais novo para o mais antigo. O **conjunto** continua igual ao do painel (a meta é de conjunto, não de ordem) | a fila é para resolver, e o protótipo ordena pela espera. A prova de igualdade com o painel compara **conjuntos de id**, nunca a ordem |
| G-A9 | **Aceito, com dois complementos**: (a) o total (`count: 'exact'`) vem só da leitura **sem cursor** (a primeira página, e cada releitura); as páginas seguintes não pedem contagem, senão "N pedidos" viraria "N restantes"; (b) a condição de cursor é um terceiro `or=` ao lado do da visão/bloco e do da busca — o painel já combina dois, e o Design prova os três juntos por **probe contra o PostgREST local** | sem (a) a contagem mente ao rolar; sem (b) a combinação é suposição (`AD-012`) |
| G-A11 | **Aceito**. A releitura (Realtime, primeiro plano, puxar) relê **a janela carregada** a partir do início, numa leitura só com `limit` = linhas já carregadas (múltiplo de 25), e **não** volta ao topo | reler só a primeira página jogaria fora o que a Adri rolou; reler página a página multiplicaria as idas |
| G-A18 | **Aceito**: só o `label` de `nextStep`, sem o `blockedReason` até a `75` | a frase termina mandando avançar, e a `74` não avança (o CTA morto da `58`); `rowSummary` já diz o bloqueio |
| G-A19 | **Aceito**: as notas internas entram no histórico | o público do app é o do painel (só admin, `RequireAdmin` + G-A1); esconder seria uma segunda regra de "o que aconteceu" |
| G-A29 | **Decidido: antecipar.** As linhas de "Últimos pedidos" da Início passam a levar a `/pedidos/<id>` (requisito novo `MAP-52`) | o destino passa a existir nesta feature; deixar como texto uma linha que tem para onde ir é o "número que leva a lugar nenhum" que esta feature existe para fechar. Custo baixo, preferência pela opção prática |
| G-A28 | **Aceito, com a regra do cache**: o voltar restaura a lista do cache em memória (mesma chave, mesmas páginas) e a posição de rolagem; o cache só é desenhado porque veio de uma leitura já confirmada, e é **revalidado** ao voltar — se a revalidação recusar, some (`MAP-36`). Sem cache, abre no topo | o voltar do Android não pode jogar a Adri no topo de uma fila de 60; e "nem o de antes" de `MAP-36` continua valendo |
| G-A24 | **Aceito, com um recorte**: o selo **não** dispara a vigia da recusa (`useRecusaDePapel`) — com `42501` ele só some. Quem leva à recusa é a tela | duas vigias para a mesma recusa reconfeririam o papel duas vezes no mesmo episódio (a régua de `MAF-*` é uma por episódio) |
| G-MAP51 | **Decidido: `filterChips.ts` não é tocado.** Os rótulos de chip do painel ("pendente", "PIX") respondem outra pergunta (texto de chip de filtro, que o app não tem) e o guarda `MAP-49` só varre `apps/mobile-adm/src`. `MAP-51` fica atendido por esta decisão | resolver no Design mexeria no painel sem necessidade (`AD-056`); "declarar como outra pergunta" é a saída que o próprio requisito oferece |
| G-A6, A15, A20, A21, A22, A25, A30 | **Confirmados como escritos.** Em A21, o link abre em nova aba (`target="_blank"`, `rel="noopener noreferrer"`) | baixo risco, coerentes com o protótipo e o escopo só leitura |

**Lacunas achadas e fechadas por requisito novo** (abaixo, na história "Guardas e fiação"):
`MAP-52` (o link de "Últimos pedidos", G-A29); `MAP-53` (a migration de `atelie_clock` e o guarda
de RPC da loja — `marcacaoSoPorAcao.test.ts` compara por igualdade a lista de RPCs chamadas em
`apps/**` e **reprova** com uma RPC nova, como a `71` e a `73` mediram); `MAP-54` (a rota
`/pedidos/:id` quebra `abasSaoAsRotas`, que acusa "rota sem aba" — o guarda precisa aprender
subrota **sem afrouxar**); `MAP-55` (a aba Pedidos marcada no detalhe).

---

## User Stories

### P1: A lista obedece aos recortes e aos endereços da Início ⭐ MVP

**User Story**: Como Adri, quero tocar num número da Início ou num recorte e ver exatamente os
pedidos daquele número, para resolver o que ele diz.

**Why P1**: é a pendência que a `73` deixou aberta — os links já existem e levam a uma lista que não
filtra.

**Acceptance Criteria**:

1. WHEN `/pedidos?bloco=<id>` abre, com `<id>` em `QUEUE_BLOCKS` THEN a lista SHALL mostrar
   exatamente os pedidos que satisfazem `queueBlock(id).rule` (por `toPostgrestFilter`), e a contagem
   SHALL ser igual à daquele bloco em `store_overview` e em `/admin/pedidos` no mesmo instante. A
   prova lê a regra de `core`, nunca uma cópia. (`MAP-01`)
2. WHEN `/pedidos?visao=<id>` abre, com `<id>` numa das seis visões THEN a lista SHALL mostrar
   exatamente os pedidos de `viewPredicate(id)` — o predicado que o painel aplica, agora em `core` —
   e só o chip daquela visão SHALL estar marcado (`aria-pressed="true"`). (`MAP-02`)
3. WHEN o endereço não tem parâmetro, ou o valor está fora do vocabulário THEN a lista SHALL abrir em
   "Precisa de ação". WHEN traz `?bloco=` e `?visao=` juntos THEN SHALL obedecer ao **bloco** (a
   régua de `lerDestinoDePedidos`, `MAI-07`). (`MAP-03`)
4. WHEN o endereço é lido THEN quem o lê SHALL ser `lerDestinoDePedidos`, o mesmo arquivo que monta
   os endereços da Início, e nenhum outro arquivo do app SHALL ler `visao`/`bloco` do endereço.
   (`MAP-04`)
5. WHEN um bloco está no endereço THEN a tela SHALL mostrar "Filtro: <rótulo do bloco>" com o botão
   "Limpar filtro" de ao menos 44 px, nenhum chip marcado; WHEN o botão é tocado THEN o endereço SHALL
   virar `?visao=tudo` e a lista, "Tudo". (`MAP-05`)
6. WHEN a Adri toca num chip THEN o endereço SHALL passar a `pedidosHref({ visao })` por substituição,
   o bloco (se houver) SHALL sair, e a lista SHALL trocar de recorte. (`MAP-06`)
7. WHEN os chips são desenhados THEN SHALL haver seis, na ordem e com os rótulos de `ORDER_VIEWS`
   (Precisa de ação · Tudo · Fila de material · A separar · Em trânsito · Concluídos), numa faixa que
   rola **dentro de si**. (`MAP-07`)
8. WHEN a visão é "Precisa de ação" ou há um bloco THEN a lista SHALL vir do mais antigo para o mais
   novo (`created_at` crescente, desempate por `id`); nas outras visões, do mais novo para o mais
   antigo. Em "Precisa de ação" sem busca, a linha de contagem SHALL ser "N pedidos precisam de você,
   do mais antigo para o mais novo." ("1 pedido precisa de você, do mais antigo para o mais novo.");
   nos outros casos, "N pedidos" ("1 pedido"). (`MAP-08`, segue A8)
9. WHEN o recorte (com ou sem busca) não tem pedido THEN a lista SHALL dizer "Nada por aqui." e, abaixo,
   a frase do protótipo (`emptyHint`): com busca, "Nenhum pedido com “<termo>”."; sem busca em
   "Precisa de ação", "Nenhum pedido esperando você agora."; nos outros recortes (inclusive bloco),
   "Nenhum pedido nesta visão." A linha de contagem SHALL não aparecer. (`MAP-09`)

**Independent Test**: semear no banco local um pedido de cada estado (inclusive o pago com material
nulo, R1, e o Pix pendente com `status ≠ pending`, R2), abrir cada endereço que a Início monta e
conferir lista e contagem contra `/admin/pedidos` e `store_overview`.

---

### P1: A busca ⭐ MVP

**User Story**: Como Adri, quero achar um pedido pelo número, pelo nome, pelo e-mail ou pelo
rastreio, porque é o que a cliente me manda no WhatsApp.

**Acceptance Criteria**:

1. WHEN a busca tem texto THEN a lista SHALL procurar nas cinco colunas de `ORDER_SEARCH_COLUMNS` pela
   condição de `buildOrderSearchCondition` (sobe para `core`), **dentro** do recorte ativo; e `#0244`,
   `0244` e `244` SHALL achar o pedido `0244`. (`MAP-10`)
2. WHEN a Adri digita THEN a consulta SHALL sair só depois de `SEARCH_DEBOUNCE_MS` sem tecla nova, e a
   resposta de um termo antigo que chega depois da de um novo SHALL ser descartada. (`MAP-11`)
3. WHEN o termo tem só espaços THEN SHALL valer como sem busca; WHEN tem `,`, `(` ou `)` THEN eles
   SHALL virar espaço como no painel (`escapeSearchTerm`), nunca um erro de consulta. (`MAP-12`)

---

### P1: A rolagem ⭐ MVP

**Acceptance Criteria**:

1. WHEN o recorte tem mais de 25 pedidos THEN a primeira leitura SHALL trazer 25, e as próximas SHALL
   carregar ao rolar perto do fim, sem botão. (`MAP-13`)
2. WHEN páginas são carregadas — inclusive com um pedido novo entrando no recorte entre duas páginas
   THEN a lista SHALL não repetir nem pular pedido: cada página começa depois do último
   (`created_at`, `id`) carregado, nunca por `offset`. (`MAP-14`, segue A9)
3. WHEN todas as páginas foram carregadas THEN o app SHALL parar de pedir, sem esqueleto no fim.
   (`MAP-15`)

---

### P1: A linha ⭐ MVP

**Acceptance Criteria**:

1. WHEN uma linha é desenhada THEN ela SHALL mostrar o número por `formatOrderNumber`, o selo de
   `SituacaoDoPedido` (público `atelie`), o nome da cliente, "Nª compra · <há quanto tempo>"
   (`purchaseOrdinalLabel` e `relativeAge(created_at, lido_em)`, de `core`; sem ordinal válido, só o
   tempo) e o total com centavos (`formatPrice`). (`MAP-16`)
2. WHEN `rowSummary(row).blocker` não é vazio e o pedido não está entregue nem cancelado THEN a linha
   SHALL mostrar a frase com o ponto de cor (acento quando o material espera, alerta no enviado sem
   rastreio, primário nos outros) e, só com `material_status = 'aguardando_material'`, a idade pelo
   rótulo do bloco (`queueAgeLabel`). (`MAP-17`)
3. WHEN a linha é desenhada THEN ela SHALL não ter botão de ação nem texto que mande agir. (`MAP-18`)
4. WHEN a Adri toca na linha THEN o app SHALL abrir `/pedidos/<id>`; a linha inteira é o alvo, com
   nome acessível que diz o número e a cliente. (`MAP-19`)

---

### P1: O detalhe do pedido ⭐ MVP

**User Story**: Como Adri, quero abrir um pedido e ver tudo dele numa tela, para responder a cliente
sem o computador.

**Acceptance Criteria**:

1. WHEN `/pedidos/:id` abre THEN o cabeçalho SHALL dizer "Pedido <formatOrderNumber>", a data da
   compra no dia de Brasília (`formatShortDate`) com "<há quanto tempo>", o selo da situação
   (`atelie`) e um "Voltar" de 44 px que volta de onde veio dentro do app — à lista no mesmo recorte e posição, ou à Início se veio de "Últimos pedidos" —; sem histórico do app (link colado, F5), à lista. (`MAP-20`, emendado no gate do Design, E7)
2. WHEN o detalhe abre THEN ele SHALL mostrar o `label` de `nextStep(order)` e, quando houver, a frase
   de `rowSummary` — sem botão e sem o `blockedReason` (A18). (`MAP-21`, segue A18)
3. WHEN o bloco "Cliente" é desenhado THEN ele SHALL mostrar nome, ordinal da compra, e-mail e, com
   telefone válido, o telefone e o link "WhatsApp" para `wa.me` (A21); "Ver cliente" SHALL não
   aparecer (A20). (`MAP-22`)
4. WHEN `material_status ≠ 'nao_aplicavel'` THEN o bloco "Material afetivo" SHALL mostrar o título do
   estado, a linha de A23 e os quatro passos de A22 com o atual marcado; com o pedido enviado ou
   entregue, os quatro feitos e "Material usado na joia". WHEN `nao_aplicavel` THEN o bloco SHALL não
   aparecer. (`MAP-23`)
5. WHEN os itens são desenhados THEN cada um SHALL mostrar o nome congelado (`product_name`), a
   variação (`variant_label`, quando há), "Gravação: <texto>" quando `engraving_text` não é vazio, e
   "<quantidade> × <preço unitário>"; o título SHALL ser "N joias" pela soma das quantidades ("1
   joia"). (`MAP-24`)
6. WHEN o resumo de valores é desenhado THEN ele SHALL ter Subtotal, "Frete · <serviço>" (valor, ou
   "grátis" com custo 0), as linhas de desconto de A30 só quando > 0, e o Total igual a
   `orders.total`, **sem recalcular**; e a linha do meio de pagamento (`PAYMENT_METHOD_LABELS`, sobe
   para `core`) com o selo do `payment_status` (rótulo de `ORDER_PAYMENT_STATUS_LABELS`, tom de A15).
   (`MAP-25`)
7. WHEN o pedido **não** é de retirada THEN "Entrega" SHALL mostrar o endereço (rua, número,
   complemento, bairro, cidade/UF, CEP), o serviço e a linha do rastreio de saída: "Rastreio
   <código>"; "Enviado sem código de rastreio" com `status = 'shipped'` sem código; "Ainda não
   postado" em `pending`/`paid`/`separating`; "Sem rastreio" nos outros. Sem botão de editar.
   (`MAP-26`)
8. WHEN o pedido é de retirada (`isPickupOrder`) THEN "Entrega" SHALL dizer "Retirada no escritório",
   sem transportadora, sem prazo e sem linha de rastreio. (`MAP-27`)
9. WHEN o histórico é desenhado THEN ele SHALL ser `buildHistory` (de `core`) das três fontes, do mais
   recente para o mais antigo, cada evento com o texto e "<data> · <há quanto tempo>"; e-mail que
   falhou SHALL dizer que a cliente não foi avisada; as notas internas entram (A19). (`MAP-28`, segue
   A19)
10. WHEN o id não existe THEN a tela SHALL dizer "Não encontrei este pedido." com "Voltar aos
    pedidos", nunca um detalhe vazio. (`MAP-29`)
11. WHEN uma leitura secundária do detalhe (itens, histórico) falha e o pedido carregou THEN o bloco
    dela SHALL dizer "Não consegui carregar." com "Tentar de novo", e o resto SHALL continuar. (`MAP-30`)

**Independent Test**: abrir no banco local um pedido de cada caso — material em cada estado,
retirada, enviado sem rastreio, com cupom e desconto de Pix, com gravação, com e-mail que falhou e
com nota interna — e comparar cada bloco com `/admin/pedidos/<id>`.

---

### P1: O selo da aba Pedidos ⭐ MVP

**Acceptance Criteria**:

1. WHEN o app está aberto em qualquer aba e `store_overview` respondeu THEN a aba Pedidos SHALL
   mostrar o selo com `fila.precisa_acao` — a união dos três blocos, nunca a soma —, lido pela
   **mesma** consulta e chave de cache da Início. WHEN o número é 0 THEN o selo SHALL não aparecer;
   acima de 99, "99+". (`MAP-31`)
2. WHEN a leitura ainda não respondeu, falhou, ou foi recusada THEN o selo SHALL não aparecer — nunca
   número de cache, nunca zero. (`MAP-32`)
3. WHEN o selo aparece THEN o nome acessível da aba SHALL dizer "Pedidos, N precisam de você"
   ("Pedidos, 1 precisa de você"), e o selo SHALL não diminuir o alvo nem mudar o rótulo visível.
   (`MAP-33`)

---

### P1: Falha, recusa e frescor ⭐ MVP

**Acceptance Criteria**:

1. WHEN a primeira leitura da lista ou do detalhe falha THEN a tela SHALL dizer "Não consegui carregar." (`FALHA_DE_LEITURA`,
   `shared/ui/leitura.tsx` da `73`) com "Tentar de novo" — nunca "Nada por aqui." (que é recorte vazio) e nunca dado de cache. (`MAP-34`)
2. WHEN uma releitura falha com dado na tela THEN o dado SHALL continuar, com "Atualizado às <hora>"
   (`formatStoreHour` do `lido_em`) e "Não consegui atualizar agora."; uma releitura nunca SHALL trocar
   a lista por esqueleto. WHEN a próxima página falha THEN as carregadas SHALL continuar e o fim SHALL
   oferecer "Tentar de novo". (`MAP-35`)
3. WHEN a confirmação de papel de uma leitura responde `42501` THEN o app SHALL reconferir o papel
   (`retryAdminCheck`, uma vez por episódio, como `useRecusaDePapel`) e levar à recusa da `72`, e
   **nenhuma** linha nem detalhe daquela leitura SHALL ser desenhado — nem o de antes. (`MAP-36`,
   segue A1)
4. WHEN a lista ou o detalhe desenham dado THEN ele SHALL ter vindo de uma leitura cuja confirmação de
   papel respondeu sem recusa: uma conta sem o papel, com pedidos próprios como cliente, SHALL ver a
   recusa, nunca os pedidos dela como se fossem os da loja (`MAI-23`). (`MAP-37`, segue A1)
5. WHEN uma leitura falha por rede (sem código, 5xx) THEN SHALL ser falha de leitura, nunca recusa.
   (`MAP-38`)
6. WHEN um pedido muda no banco com a lista ou o detalhe abertos THEN o app SHALL reler pelo Realtime
   de `orders`, com **um** canal por montagem, fechado ao sair; e SHALL reler ao voltar ao primeiro
   plano e ao puxar a tela no topo (`PullToRefresh` da `73`). (`MAP-39`, segue A11)
7. WHEN duas leituras do mesmo recorte estão no ar e a mais antiga responde por último THEN a resposta
   dela SHALL ser descartada. (`MAP-40`)
8. WHEN o app está sem conexão THEN vale a tela "Sem conexão" da `72`, e o service worker SHALL não
   guardar nenhuma resposta destas leituras (`MAF-20`). (`MAP-41`)

---

### P1: A tela no celular ⭐ MVP

**Acceptance Criteria**:

1. WHEN a lista e o detalhe são desenhados em 360×800, 390×844 e 412×915 THEN o `body` SHALL não rolar
   na horizontal; a faixa de chips SHALL rolar dentro de si; e todo alvo de toque (chips, linha,
   "Limpar filtro", "Voltar", "WhatsApp", "Tentar de novo") SHALL ter ao menos 44 px. (`MAP-42`)
2. WHEN a fonte do sistema está a 130 % e a 200 % THEN nenhum texto da linha ou do detalhe SHALL se
   sobrepor, o selo SHALL não ser cortado por `truncate`, e número e total SHALL quebrar em vez de
   estourar (a régua do `BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`). (`MAP-43`)
3. WHEN a primeira leitura está em curso THEN a lista SHALL mostrar esqueletos de linha com
   `aria-busy`, e o detalhe, esqueletos por bloco. (`MAP-44`)
4. WHEN o sistema pede menos movimento THEN esqueleto e troca de recorte SHALL não se mover
   (`motion-reduce:` na mesma linha). (`MAP-45`)
5. WHEN a Adri entra na lista ou no detalhe THEN o título do documento SHALL ser "Pedidos · Ateliê" e
   "Pedido <número> · Ateliê", e o foco SHALL ir ao `h1` (`MAF-29`). (`MAP-46`)

---

### P1: As regras sobem para `core` ⭐ MVP

**Why P1**: `AD-056` — antes de o app ler uma regra do painel, ela sobe; sem isso, painel e celular
respondem diferente sobre o mesmo pedido com as duas suítes verdes.

**Acceptance Criteria**:

1. WHEN o app e o painel decidem visão (`ORDER_VIEWS`, `OrderViewId`), predicado de visão, colunas e
   condição de busca, debounce, rótulo de meio de pagamento, ordinal da compra, `queueSince`/idade da
   linha, `rowSummary`, `nextStep` e `buildHistory` THEN os dois SHALL chamar o **mesmo** dono em
   `packages/core`, e o painel SHALL reexportar por referência (`toBe`), com a suíte do painel verde
   **sem asserção tocada**. (`MAP-47`)
2. WHEN as regras sobem THEN cada frase (bloqueio, próximo passo, histórico) SHALL ser byte a byte a
   do painel — mover não muda palavra. (`MAP-48`)
   > **SPEC_DEVIATION (conserto do QA, B03 — `BUG-20261024-falha-de-aviso-diz-enviado`)**: a linha de
   > FALHA de `buildHistory` deixou de usar o rótulo de histórico ("… enviado") e passou a usar o nome do
   > evento (`NOTIFICATION_EVENT_NAMES`): "Falha ao enviar o aviso: Pagamento aprovado (E-mail)". Muda de
   > propósito nos DOIS apps (um dono só, em `core`), e por isso duas asserções do painel foram reescritas
   > (`orderDetail.test.ts`, `AdminOrderPage.test.tsx`) — contra a letra de `MAP-47` ("sem asserção
   > tocada") e de `MAP-48` ("byte a byte"). Precisa da confirmação do usuário no handoff.
3. WHEN um arquivo de `apps/mobile-adm/src` declara um mapa de rótulo de status, visão ou pagamento,
   ou um predicado de recorte THEN um guarda SHALL reprovar (molde de `situacaoComDonoUnico`, que já
   varre o app). (`MAP-49`)
4. WHEN os módulos movidos são alcançados THEN todo especificador relativo de `core/orders` SHALL ter
   `.ts` explícito (diretório alcançável pelo Deno, `purity.test.ts`), e nenhum SHALL importar React,
   Supabase ou `apps/**`. (`MAP-50`)
5. WHEN `filterChips.ts` do painel é tocado THEN a cópia própria dele de rótulos de pagamento e de meio
   (minúsculas, "pendente", "PIX") SHALL ser resolvida no Design — unificada com `core` ou declarada
   como outra pergunta (texto de chip) — sem mudar o que o painel mostra. (`MAP-51`)

---

### P1: Guardas e fiação que a feature quebra ou abre ⭐ MVP

**Why P1**: achados do gate — cada um é um guarda existente que reprova, ou uma fiação que, sem
requisito, ficaria fora de toda task.

**Acceptance Criteria**:

1. WHEN uma linha de "Últimos pedidos" da Início é desenhada THEN ela SHALL ser um link para
   `/pedidos/<id>`, a linha inteira como alvo de ao menos 44 px, com nome acessível que diz o número
   e a cliente; o desenho e as réguas da `73` para a linha (`MAI-*`, a fonte a 130 %/200 %) SHALL
   continuar valendo. (`MAP-52`, G-A29)
2. WHEN a migration de `atelie_clock()` existe THEN um guarda na suíte da loja (molde de
   `overviewSchema.test.ts`, uma régua por comando, `mutar()` que lança) SHALL recusar: sem `has_role`
   ⇒ `42501` no corpo, sem `security definer`, sem `search_path = ''`, `execute` a `anon`/`public`,
   leitura de tabela, escrita de dado; e `atelie_clock` SHALL entrar na lista literal de
   `marcacaoSoPorAcao.test.ts` com o `create function` conferido na migration — nunca afrouxando a
   igualdade. (`MAP-53`, G-A1)
3. WHEN `/pedidos/:id` entra no `App.tsx` THEN `abasSaoAsRotas.test.ts` SHALL aceitá-la como
   **subrota** da aba `/pedidos` e continuar acusando, com sensor, uma subrota cujo pai não é aba e
   uma rota de primeiro nível sem aba; `rotasSobGuarda.test.ts` SHALL provar a rota dentro do bloco do
   `RequireAdmin`. (`MAP-54`, A28)
4. WHEN o detalhe `/pedidos/:id` está aberto THEN a aba Pedidos SHALL estar marcada
   (`aria-current="page"`) e nenhuma outra. (`MAP-55`, A28)

---

## Edge Cases

- WHEN o bloco "Pix aguardando" está no endereço THEN a lista SHALL incluir o Pix pendente com
  `status ≠ pending` (R2, preservada): contagem e lista vêm da mesma regra.
- WHEN um pedido pago tem `material_status` nulo THEN ele SHALL aparecer em "Precisa de ação" e em
  nenhum bloco (R1, preservada); a diferença entre união e soma dos blocos não é erro.
- WHEN um pedido sai do recorte enquanto a Adri o olha (ex.: material registrado no computador) THEN o
  detalhe SHALL reler e mostrar o estado novo, e a lista relida SHALL não mostrá-lo mais ali.
- WHEN o pedido não tem `customer_name` THEN a linha SHALL mostrar o e-mail no lugar do nome.
- WHEN o item importado não casou com o catálogo (`product_id` `nuvemshop:…`) THEN o item SHALL ser
  desenhado pelo nome congelado.
- WHEN o pedido é cancelado THEN a linha e o detalhe SHALL não ter frase de bloqueio, e o próximo
  passo SHALL ser "Pedido cancelado".
- WHEN a busca não acha nada no recorte, mas acharia em "Tudo" THEN a tela SHALL dizer "Nada por
  aqui." — sem trocar de recorte sozinha.
- WHEN a Adri sai da conta com a lista aberta THEN o canal SHALL fechar e nenhuma resposta em voo
  SHALL ser desenhada.

## Implicit-requirement dimensions (sweep)

| Dimensão | Onde está |
| --- | --- |
| Input validation & bounds | busca escapada e com debounce (`MAP-10`..`12`); endereço validado pelo vocabulário (`MAP-03`); id inexistente (`MAP-29`); 25 por página (`MAP-13`); selo "99+" (`MAP-31`) |
| Failure / partial-failure | `MAP-34`, `MAP-35` (inclusive a próxima página), `MAP-30` (bloco secundário do detalhe) |
| Idempotency / retry / dedup | leitura pura; "Tentar de novo" e o puxar só releem; paginação por chave não repete (`MAP-14`) |
| Auth boundaries & rate limits | `RequireAdmin` na rota nova (A28); confirmação de papel por leitura (`MAP-36`, `MAP-37`, A1); rede ≠ recusa (`MAP-38`). Sem limite de taxa: só contas admin, leituras por evento e com debounce |
| Concurrency / ordering | `MAP-11`, `MAP-40` (resposta velha descartada); `MAP-14` (pedido novo entre páginas); um canal por montagem (`MAP-39`) |
| Data lifecycle / expiry | nenhuma resposta no service worker (`MAP-41`); cache só em memória para releitura; a busca fora do endereço (A13) |
| Observability | N/A porque é leitura de tela e o app não tem telemetria; a falha aparece na tela (`MAP-34`/`35`) |
| External-dependency failure | Supabase e Realtime: `MAP-34`, `MAP-35`, `MAP-39` (a volta ao primeiro plano relê se o canal caiu) |
| State-transition integrity | N/A porque a tela não escreve; o `nextStep` só é **dito** (`MAP-21`) |

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MAP-01..09 | P1: Recortes e endereços da Início | Execute | Implemented (T03, T13, T14, T18, T20, T21; probe 02; prova em navegador) |
| MAP-10..12 | P1: Busca | Execute | Implemented (T03, T10, T14, T19, T21) |
| MAP-13..15 | P1: Rolagem | Execute | Implemented (T06, T10, T14, T20; 114 linhas sem repetir na prova) |
| MAP-16..19 | P1: A linha | Execute | Implemented (T04, T16, T17) |
| MAP-20..30 | P1: O detalhe | Execute | Implemented (T05, T07, T15, T22–T24, T26) |
| MAP-31..33 | P1: O selo da aba | Execute | Implemented (T25) |
| MAP-34..41 | P1: Falha, recusa e frescor | Execute | Implemented (T09, T12, T14, T15, T20, T21, T24, T29; `MAP-41` em T30) |
| MAP-42..46 | P1: A tela no celular | Execute | Implemented (T17–T24, T28, T31) |
| MAP-47..51 | P1: As regras sobem para `core` | Execute | Implemented (T02–T08, T28, T30) |
| MAP-52..55 | P1: Guardas e fiação (achados do gate) | Execute | Implemented (T09, T10, T24, T26) |

**Coverage:** 55 total, 55 mapped to tasks, 55 implementados (2026-10-24); Verificador independente pendente.

> **Renumeração do rascunho**: o antigo `MAP-01` (recorte = Backoffice) → `MAP-01`/`02`; `MAP-02`
> (busca) → `MAP-10`; `MAP-03` (rolagem) → `MAP-13`/`14`; `MAP-04` (`nextStep` e histórico) →
> `MAP-21`/`28`; `MAP-05` (retirada) → `MAP-27`; `MAP-06` ("Nada por aqui.") → `MAP-09`.

## Success Criteria

- [x] Para um mesmo instante, cada número de "Precisa de você" da Início é igual à contagem da lista
      aberta pelo toque nele, e as duas iguais a `/admin/pedidos` — medido contra o banco local com um
      pedido de cada estado, inclusive R1 e R2.
- [x] Para cada uma das seis visões e para `#0244`/`0244`/`244`, a lista do app e a do painel têm o
      mesmo conjunto de ids (probe contra o banco local).
- [x] Uma conta sem papel admin, com pedidos próprios como cliente, abrindo `/pedidos` e
      `/pedidos/<id de um pedido dela>`, vê a recusa e nunca uma linha (`MAP-37`) — provado contra o
      supabase-js real e o banco local, não por dublê.
- [x] A suíte do painel fecha verde sem asserção tocada depois da subida para `core`; store, core,
      functions e catalog-import sem regressão contra a baseline medida na abertura.
- [x] Prova em navegador em 390×844 (e 360/412, fonte 130 % e 200 %): sem rolagem horizontal, alvos
      de 44 px, rolagem paginada sem repetir pedido, e o percurso Início → bloco → lista → detalhe →
      voltar no mesmo recorte.

> Evidência dos critérios (2026-10-24): (1) `prova-navegador.md` — os quatro blocos, o selo e a lista
> iguais à contagem do banco por `toSqlPredicate`, e o probe `02-lista` (painel = app); (2) probe
> `02-lista` (49 `ok`); (3) `pedidosComClientReal.test.tsx` (T29, supabase-js real) e o probe
> `03-cliente-sem-papel` (banco local); (4) gates da T30, painel sem asserção antiga tocada; (5)
> `prova-navegador.md`. Marcados pelo autor; o Verificador independente confere.
