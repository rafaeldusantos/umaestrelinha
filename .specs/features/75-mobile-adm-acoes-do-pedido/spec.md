# 75 — mobile-adm: ações no pedido

> Programa mobile-adm (`AD-056`), feature 4 de 8. Depende da `72` (fundação), da `73` (Início) e da
> `74` (Pedidos, só leitura), as três mergeadas em `feature/mobile-adm` (`2a285bab`). Branch:
> `feat/75-mobile-adm-acoes-do-pedido`, worktree `store-worktrees/store-75-mobile-adm-acoes-do-pedido`,
> mergeada em `feature/mobile-adm` depois de finalizada e testada.
> Tela: Claude Design `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html` — o rodapé de
> ação do detalhe (`od.hasAction`, linhas 443–447), o botão "Lembrar do envio no WhatsApp"
> (`od.canCharge`, 384–386), a linha "Informar/Alterar" do rastreio (`od.canEditTrack`, 416), a folha
> do rastreio (`sheetTrack`, 645–658), o botão de ação do cartão da lista (`card.act`) e a lógica
> `rowSummary`/`doAction`/`saveTrack` (866–873, 920–931, 1225–1233). Lido em 2026-10-24.
> Specify aberto em 2026-10-24 sobre o rascunho do programa. Código lido antes de escrever:
> `apps/backoffice/src/entities/order/api/{useAdminOrders,notifyOrder}.ts` (as portas de escrita do
> painel), `apps/backoffice/src/pages/admin/{AdminOrderPage,AdminOrdersPage}.tsx`,
> `features/order-management/ui/OrderMaterialCard.tsx`, `features/order-list/model/chargeMaterial.ts`,
> a migration `20260811120000_22-material-afetivo.sql` (`set_material_status`,
> `set_material_tracking`), a `20260907120000_42-notificacoes.sql` (`claim_order_notification`),
> `core/orders/{rowSummary,nextStep,views}.ts`, `core/orders/__tests__/purity.test.ts`,
> `core/hooks/useStoreOverview.ts`, `core/material/material.ts`,
> `core/notifications/{triggers,precondition}.ts`, `apps/mobile-adm/src/entities/order/{api/lerComPapel.ts,model/linha.ts,ui/LinhaDoPedido.tsx}`,
> `widgets/order-detail/ui/ProximoPasso.tsx` e as RLS de `orders`/`order_status_history`/
> `order_notifications` (banco local, `pg_policies`).
>
> **Portão do Specify fechado em 2026-10-24** com o validador independente. A rodada 1 reprovou com
> três bloqueantes e a rodada 2 com um (o "Informar" em `delivered` prometendo o e-mail de postagem,
> que a partir de `delivered` nunca sai — `eventsForTrigger('order_status_changed')` produz
> `order_delivered`). Todos foram incorporados abaixo, junto com as cinco não bloqueantes da rodada 2
> (guarda de status no rastreio, MAA-05 sem e-mail, `.upsert`/`.delete` no guarda, F5 com a folha
> aberta, o ramo `material_enviado` do lembrete). G1–G7 decididos; A15 decidida (s). A8, A11, A17,
> A23 e A24 voltam ao usuário como **n — confirmar**, sem bloquear o Design.

## Problem Statement

O envelope chega pelo correio e a postagem acontece no balcão, longe do computador. Hoje a Adri vê o
pedido no celular (`74`) mas, para dizer "recebi o material", "comecei a separar" ou "postei, o código
é este", precisa voltar ao Backoffice — e a cliente fica sem o aviso até lá. Esta feature dá ao
detalhe do pedido do app (e ao cartão da lista) **a ação primária do estado atual**, decidida por
**uma** função de `core`, gravada pela **mesma porta** que o painel usa, com o mesmo aviso à cliente,
e o lembrete do envio do material por WhatsApp com a mensagem pronta.

## Goals

- [ ] Para todo pedido aberto no app, a Adri consegue executar a ação primária que `appPrimaryAction`
      (A14) nomeia ("Recebi o material", "Iniciar separação", "Marcar como enviado", "Salvar
      rastreio", "Marcar como retirado") e o pedido termina no **mesmo** estado — colunas, histórico e
      aviso à cliente — que o **equivalente** no painel produziria. Para "Iniciar separação" com o
      material na bancada, o equivalente do painel são **duas** ações ("Iniciar produção" no card do
      material + o status `separating`), e o probe compara com as duas. Provado contra o banco local,
      não por dublê.
- [ ] Nenhuma escrita do app afirma um resultado que o banco não confirmou: recusa, zero linhas
      afetadas, falha de rede, falha parcial e conta sem papel aparecem como tais, nunca como "salvo".
- [ ] A mensagem do lembrete de material é byte a byte a do painel (`chargeMaterialText`, que sobe
      para `core`), e o painel continua verde **sem asserção tocada** (`AD-056`; o dublê de escrita do
      painel pode ganhar `.select`, MAA-27).
- [ ] Nenhuma confirmação diz que a cliente foi avisada por e-mail quando o aviso não saiu (`AD-008`).

## Out of Scope

| O que | Por quê |
| --- | --- |
| Gerar a etiqueta do Melhor Envio | o protótipo não tem; compra de etiqueta é dinheiro e a `melhor-envio` pede a tela de mesa. **Fica no computador** |
| Cancelar pedido | o protótipo não tem; cancelamento tem motivo, aviso e estorno que pedem a tela de mesa. `cancelOrder` **fica no painel**, como entrada declarada no allowlist do guarda do dono único (MAA-39) |
| Avançar status fora da ação primária ("Outro status", "Avançar mesmo assim", `blockedReason`) | o protótipo oferece **uma** ação por estado (`od.hasAction`); avançar contra a regra é decisão de mesa. O `blockedReason` continua não desenhado (A18 da `74`) |
| A Adri registrar o rastreio **do envelope** da cliente (`set_material_tracking`, "o caso do WhatsApp") | **G6 decidido: fora da `75`.** O protótipo não tem. "Recebi o material" já aceita `aguardando_material → material_recebido`, e a ação pode vir depois pelo mesmo caminho sem retrabalho (a RPC já está na lista de `marcacaoSoPorAcao`). A ação `anotar-rastreio-envelope` de `PrimaryActionId` não é produzida por `rowSummary` hoje e continua sem desenho |
| Escolher/alterar a transportadora (`shipping_carrier`) | o protótipo só pede o código; o app nunca envia a coluna, o painel continua enviando (A9) |
| Reenviar o aviso de postagem ao trocar o código | **G4**: fora; pode vir depois pela porta `action=send` |
| Nota interna nova, reenviar e-mail, editar endereço, editar itens | fora do protótipo; ferramentas de mesa |
| "Ver cliente" | feature `76` |
| Fila offline de ações (gravar sem rede e sincronizar depois) | `AD-056`: offline é só a casca. Sem conexão, vale a tela "Sem conexão" da `72` |
| Ações em lote | o painel tem; o protótipo não |
| Impor a guarda de estado de origem às escritas do painel | **G3**: `expectedFrom` é opcional no dono; o painel não o passa na `75` e se comporta como hoje. Adotar a guarda no painel (seletor livre de `AdminOrderPage.tsx:218`, avanço em lote de `AdminOrdersPage.tsx:193`) é decisão posterior |
| Mudar `rowSummary` ou qualquer texto/regra de tela do painel | `AD-056`. A regra do app é uma função nova que **compõe** `rowSummary` (A14); `rowSummary` fica byte a byte |

---

## Assumptions & Open Questions

Portão fechado: as linhas **(G)** foram decididas pelo validador independente (2026-10-24). As
**n — confirmar** têm padrão de baixo risco e voltam ao usuário sem bloquear o Design.

| # | Assunção / decisão | Escolha | Razão | Confirmado? |
| --- | --- | --- | --- | --- |
| A1 | **Qual RPC faz "Recebi o material"** | `set_material_status(p_order_id, 'material_recebido')`, a mesma que o painel chama (`setMaterialStatus`). O rascunho dizia `set_material_tracking` — essa grava o rastreio **do envelope** e só leva a `material_enviado` | lido na migration da `22` e em `useAdminOrders.ts` | s (código) |
| A2 | **O dono único da escrita de status, rastreio de saída e aviso** | a sequência do painel (`update orders set status` + `insert order_status_history`; `update orders set tracking_code[, shipping_carrier]`; `notifyOrder(id, 'order_status_changed')`) sobe para **um** módulo novo de `packages/core`, **`core/order-actions`** (subpath novo `@estrelinha/core/order-actions` no `exports`). **Não** pode morar em `core/orders`: `orders/__tests__/purity.test.ts` recusa `@estrelinha/*` e `@supabase/*`. Precedente: `core/hooks`. O dono recebe **injetados** o client (`SupabaseClient`) **e** a função de aviso (`notify`), porque `useAdminOrders.test.ts` dubla `'./notifyOrder'` por caminho e `AdminOrderPage*.test.tsx` dublam `'@/entities/order/api/notifyOrder'`: um dono que chamasse o próprio notificador escaparia desses dublês. Opções por chamador: `expectedFrom?` (A4; também no `update` do rastreio, como lista, A25), `carrier?` (A9), `notify?: boolean` (para "Marcar como enviado" disparar **um** aviso no fim, A7). O efeito é confirmado por `.select('id')` (A3/A22). O hook do painel (`updateStatus`/`addTrackingCode`) **delega** ao dono e mantém as próprias releituras (`fetchOrders`, `fetchStatusCounts`) e a forma de retorno (`{ error, emailSent }`). O `notifyOrder` de `core` (com client injetado) é o dono do disparo `action=trigger`; o `notifyOrder.ts` do painel vira um invólucro fino sobre ele (reexporta por `toBe` se a assinatura permitir; senão delega, com teste de delegação). `resendNotification` (`action=send`) fica no painel. `cancelOrder` fica no painel, no allowlist do guarda | `AD-056` + defeito 01; (c) "o app escreve sozinho" e (b) "segundo caminho" descartados | s (**G1**) |
| A3 | **Escrita sem papel admin** | a RLS de `orders` (`admin full orders`) faz um `update` de conta sem papel afetar **zero linhas sem erro**; `set_material_status` devolve `{ ok: false, reason: 'not_admin' }` (não `42501`). Toda escrita do dono **confere o efeito** (`.select('id')`): zero linhas nunca é sucesso. No app, `not_admin` e o `42501` de `atelie_clock` levam à recusa da `72` (`retryAdminCheck`, uma vez por episódio) | o mesmo `MAI-23` da `74`, agora na escrita | s |
| A4 | **Guarda de estado de origem** | `expectedFrom?` **opcional** no dono: com ele, o `update` do status leva `.eq('status', expectedFrom)` e zero linhas vira "o pedido mudou". **O app passa sempre** (zero linhas ⇒ "Este pedido mudou enquanto você olhava." + releitura). **O painel não passa na `75`** (seletor livre, inclusive para trás, e avanço em lote, com `from_status` de `orders.find` que pode ser `undefined`) | forçar no painel transformaria escritas legítimas de hoje em zero linhas; opcional mantém um dono só | s (**G3**) |
| A5 | **"Iniciar separação" entra** | sim: é a ação primária de `paid` em `rowSummary`. Sem ela, todo pedido "Pago, a separar" fica sem saída no app e "Marcar como enviado" nunca aparece | protótipo e `rowSummary` | s (**G2**) |
| A6 | **"Iniciar separação" com o material na bancada** | com `material_status = 'material_recebido'`, chama primeiro `set_material_status('em_producao')` (dispara o aviso `in_production` por `material_status_changed`) e grava `status = 'separating'` **só** com `ok: true`. Com material em outro estado, só o status. Material recusado ⇒ status não é gravado (MAA-09). **Falha parcial** (material foi a `em_producao`, o status falhou ou afetou zero linhas) tem frase e "Tentar de novo" próprios (MAA-40) | `MATERIAL_TRANSITIONS` permite `material_recebido → em_producao`; sem isso o aviso `in_production` nunca sai pelo celular | s (**G2**) |
| A7 | **"Marcar como enviado" (de `separating`) exige o código** | a folha pede o código e o dono grava rastreio (sem aviso) e depois status, **um** só `notifyOrder` ao fim. Não há "enviar sem código" no app | protótipo (`saveTrack`) | s |
| A8 | **Validação do código** | apara, remove espaços internos, maiúsculas; recusa com menos de **8** caracteres: "Confira o código — ele costuma ter 13 caracteres." Sem formato imposto (Jadlog, Loggi e Melhor Envio não seguem os Correios; a forma dos Correios, opção (c), foi descartada). Mora em `core` (`trackingCodeRefusal(code): string \| null`, e `normalizeTrackingCode`). O painel **não** passa a validar. O campo usa `autoCapitalize="characters"` e `inputMode="text"` (nunca numérico). Precedente: `parcelTrackingUrl` (`core/orders/tracking.ts:19`) já faz `trim().toUpperCase()` no código — o repositório já o trata como insensível a caixa. **Risco residual**: uma transportadora com código sensível a caixa (baixo, mas decisão de produto) | pega erro de digitação sem barrar transportadoras reais | **n — confirmar** |
| A9 | `shipping_carrier` | o app **nunca** envia a coluna (`carrier` ausente no dono ⇒ coluna fora do `update`); o painel continua enviando o que estiver no campo | apagar a transportadora de um pedido do Melhor Envio seria regressão silenciosa | s |
| A10 | **A frase da folha do rastreio** | o critério é o **par (status, presença de código anterior)**, porque o evento que o disparo produz depende do status (`eventsForTrigger('order_status_changed')`: `shipped` ⇒ `order_shipped`, `delivered` ⇒ `order_delivered`, nunca `order_shipped`). Três frases: **(1) `separating`, ou `shipped` sem código** ("Marcar como enviado", "Salvar rastreio"; o `order_shipped` ainda não saiu e sai agora): "A cliente recebe o e-mail de postagem assim que você salvar o código."; **(2) `shipped` com código** ("Alterar rastreio"): "A cliente já recebeu o aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail." (`order_shipped` é único por pedido, `claim_order_notification`); **(3) `delivered`, com ou sem código** ("Informar" ⇒ título "Salvar rastreio"; "Alterar" ⇒ "Alterar rastreio"): "O código aparece no pedido dela." — sem prometer nem negar e-mail, porque a partir de `delivered` o disparo pode produzir um `order_delivered` (ver A10b) e nunca um aviso de postagem | a frase do protótipo seria falsa na troca e em `delivered` (`AD-008`) | s (**G4**, corrigido na rodada 2) |
| A10b | **O disparo a partir de `delivered`** | por paridade com `addTrackingCode` do painel (que dispara `order_status_changed` **sempre** depois de gravar o rastreio, `useAdminOrders.ts:172`), o app **dispara** `order_status_changed` também a partir de `delivered`. Consequência declarada: se o `order_delivered` daquele pedido **nunca saiu** (evento desligado quando o pedido foi entregue, ou envio que falhou sem reivindicação), ele pode sair agora, ao salvar o rastreio; se já saiu, `claim_order_notification` torna o disparo no-op. A confirmação a partir de `delivered` **nunca** cita e-mail (A11), nem quando `sent === true` — o e-mail que saiu, se saiu, não é de postagem | não divergir do painel (defeito 01) e não prometer o que o evento não é | s (decorre do código; declarado) |
| A11 | **A confirmação depois de gravar** | um aviso em região viva (`role="status"`), título e frase. E-mail citado **só** com `sent === true` **e** quando o evento que o disparo produz é o que a frase nomeia: em "Recebi", o `material_status_changed` (`material_received`); em "Iniciar separação" com material, o `material_status_changed` do `em_producao` (`in_production`); no rastreio, **só** quando a ação partiu de `separating` ou de `shipped` **sem** código (o único `order_status_changed` do fim produz `order_shipped`). "Material registrado." + "O pedido #0251 foi para a bancada. Juliana recebe a confirmação por e-mail." / sem aviso: "O pedido #0251 foi para a bancada."; "Separação iniciada." + "Pedido #0251 em produção." (ou "Pedido #0251 em separação." sem o material); "Rastreio salvo." + "Juliana recebe o aviso de postagem por e-mail." / sem aviso, em "Alterar" de `shipped` e **sempre** a partir de `delivered`: "Rastreio salvo." + "O código ficou no pedido."; "Retirada registrada." + "Pedido #0251 entregue." **No caso idempotente de MAA-05** (o material já estava `material_recebido`), a reivindicação do envio já aconteceu e `sent` volta falso: a confirmação é "Material registrado." + "O pedido #0251 foi para a bancada.", **sem** citar e-mail. Primeiro nome de `customer_name`; vazio ⇒ "A cliente recebe…" | protótipo (`showToast`) com o recorte de `AD-008`, tom memorial, sem urgência | **n — confirmar** (texto) |
| A12 | **Falha do disparo do aviso** | não desfaz a gravação nem vira erro (`AD-008`, `notifyOrder` nunca lança); só muda a confirmação (A11) | contrato do painel | s |
| A13 | **Onde as ações aparecem** | no **detalhe** (rodapé fixo, folha do rastreio, "Informar/Alterar" na Entrega, lembrete no bloco Material) e, **P2**, no **cartão da lista** (`card.act`): a mesma ação, a mesma folha e **uma trava por pedido** compartilhada. Primeira coisa a cortar se precisar | protótipo; resolver a fila sem abrir cada pedido | s (**G5**) |
| A14 | **Quem decide a ação do app** | **uma** função pura nova em `core/orders`, `appPrimaryAction(row)` (nome final no Design), lida pelo rodapé do detalhe, pelo botão do cartão (MAA-36) e por qualquer rótulo de ação do app. Ela compõe, nesta ordem: (1) `status` `cancelled` ou `delivered` ⇒ `nenhuma` (o `rowSummary` de um cancelado com material aguardando diria "Recebi o material"); (2) retirada (`isPickupOrder`) em `separating` ⇒ `marcar-retirado`, rótulo `nextStep(row).actionLabel` (`PICKUP_DONE_ACTION`, "Marcar como retirado"), destino `nextStep(row).status` (`delivered`); (3) senão, `rowSummary(row).action`/`actionLabel`. A entrada exige `shipping_service_id` (já está em `COLUNAS_DA_LISTA` e no detalhe). **`rowSummary` não muda** (o painel o lê; `RowSummaryInput` continua sem `shipping_service_id`). Mapeamento: `registrar-recebimento` ⇒ "Recebi o material"; `separar` ⇒ "Iniciar separação"; `marcar-enviado` ⇒ "Marcar como enviado" (folha); `salvar-rastreio` ⇒ "Salvar rastreio" (folha); `marcar-retirado` ⇒ "Marcar como retirado"; `nenhuma` (e `anotar-rastreio-envelope`, que não é produzida) ⇒ sem rodapé | dono único da ação no app; resolve a contradição com MAA-16/MAA-38 (o `rowSummary` sozinho diria "Marcar como enviado" para retirada) | s (**G7**) |
| A14b | **A frase da lista (blocker) da `74` para retirada** | **não muda**: o cartão continua com `rowSummary(row).blocker` ("Em separação" é verdade também para retirada). Muda só o **rótulo do botão** do cartão, que passa a vir de `appPrimaryAction`. O tom do cartão que a `74` decide pela ação (`LinhaDoPedido`) passa a ler a ação de `appPrimaryAction`, e `marcar-retirado` tem o tom primário | menor mudança que mantém um dono | s |
| A15 | "Recebi o material" com o pagamento pendente | permitido: o botão aparece também com o pagamento pendente. `rowSummary` devolve `registrar-recebimento` antes de olhar o status (o material vem primeiro), `set_material_status` não confere status nem pagamento (migration da `22`, linhas 154–191) e o painel já permite. Bloquear no app seria uma segunda regra de "quem pode receber o material" (defeito 01) | mantém a regra que existe | s (validador, rodada 2) |
| A16 | **Retirada no escritório** | sem rastreio, sem "Informar/Alterar" e sem "Marcar como enviado" (`isPickupOrder`). Em `separating`, a ação é "Marcar como retirado" (A14), que grava `delivered` pelo dono com `expectedFrom: 'separating'` | `nextStep` já é o dono da regra | s (**G7**) |
| A17 | **Lembrete no WhatsApp: quando aparece** | só com `material_status = 'aguardando_material'`, pedido não cancelado **e** `normalizeBrPhone(customer_phone)` válido. Sem número, **o botão não aparece**. O corte é a **condição de exibição no app**, não uma mudança em `chargeMaterialUrl` (que sobe byte a byte, **inclusive** o caminho sem número que cai no `wa.me` sem destinatário, e o painel reexporta por `toBe`). Difere do painel de propósito. **Exclusão declarada**: `chargeMaterialText` tem o ramo de `material_enviado` ("Vi que você já postou…"), e o app **não** o oferece — o lembrete aparece só com `aguardando_material`, nunca com `material_enviado`. Não é lacuna de rastreabilidade: o ramo sobe junto e continua do painel | no celular, `wa.me` sem número abre uma conversa sem destinatário | **n — confirmar** |
| A18 | **Lembrete: a mensagem** | `chargeMaterialText`/`chargeMaterialUrl` sobem para `core` com entrada estrutural, byte a byte, e o painel reexporta por referência (`toBe`); a idade (`queueAge`) usa o `lido_em` de `atelie_clock` da leitura em tela, nunca o relógio do aparelho. Sem nomear o material (`BL-015`), sem urgência | `AD-056`, `AD-058` | s |
| A19 | O lembrete grava algo? | não: abre `https://wa.me/<número>?text=<mensagem>` em nova aba (`target="_blank"`, `rel="noopener noreferrer"`); nada vai ao histórico | ninguém envia nada até a Adri apertar enviar no WhatsApp | s |
| A20 | Toque duplo e espera | o controle fica travado (`aria-disabled`, "Salvando…") do toque até a resposta; uma segunda chamada da mesma ação para o mesmo pedido não sai enquanto a primeira está no ar — **trava por pedido**, compartilhada pelo cartão e pelo detalhe | evita escrita dupla | s |
| A21 | **Releitura depois de gravar** | depois de cada gravação com sucesso (e depois de recusa, zero linhas ou falha parcial), invalida **três chaves**: o detalhe (`chaveDoPedido(id)`), a lista (`[LISTA_DE_PEDIDOS_KEY]`, todos os recortes) e `STORE_OVERVIEW_KEY` (selo da aba e Início). Provado **pelo estado do cache** (`isInvalidated` da chave certa **e** da vizinha que não deve virar), nunca por "`invalidateQueries` foi chamado" (lição da `51`/`59`) | o dado novo vem do banco, nunca de um patch local | s |
| A22 | Histórico depois de gravar | a linha de `order_status_history` só é inserida quando o `update` do status **afetou uma linha** (confirmado pelo `.select('id')`); nunca em retentativa que não mudou nada | no celular, retentativa depois de falha de rede duplicaria a linha | s |
| A23 | Folha do rastreio | folha de baixo (protótipo), com título ("Marcar como enviado" · "Salvar rastreio" · "Alterar rastreio"), a frase de A10, o campo "Código de rastreio" (placeholder "Ex.: AN123456789BR"; já preenchido em "Alterar"), "Agora não" e "Salvar". Fecha por "Agora não", pelo fundo e pelo voltar do Android **sem** sair do pedido; foco preso nela. O voltar exige uma entrada de histórico: abrir a folha empurra uma entrada **pelo roteador** com a **mesma** `pathname` e `search` e um marcador no `state` (nada na query); o voltar a consome e fecha a folha; fechar por "Agora não"/fundo/sucesso consome a entrada com `navigate(-1)`. **F5 com a folha aberta**: o marcador no `history.state` sobrevive ao recarregar; ao montar o detalhe com o marcador presente, a folha **não** reabre e a entrada é **substituída** (`navigate(<mesmo endereço>, { replace: true, state: <sem marcador> })`), para não sobrar um voltar morto (o primeiro voltar sem efeito visível). Nada da folha escreve na URL, então `pedidosHref.ts` continua o único dono do endereço (`MAP-04`, `enderecoDePedidosComDonoUnico`) e o "voltar no mesmo recorte e posição" da `74` continua valendo | o voltar do Android fechar a folha é a expectativa no celular | **n — confirmar** (o voltar) |
| A24 | **O efeito confirmado também no painel** | (a) aceito pelo validador: ao delegar ao dono, o hook do painel passa a confirmar o efeito por `.select('id')` para os dois chamadores; com zero linhas (inalcançável para uma admin com o `id` da lista — a RLS `admin full orders` cobre o `SELECT` do `returning` —, mas possível) o painel deixa de inserir o histórico e devolve um erro em vez de sucesso silencioso. O dublê de escrita do painel ganha `.select` devolvendo a linha, sem asserção tocada. É a única mudança de comportamento do painel, contra a letra do `AD-056` ("painel sem mudança"), num caso degenerado e sem asserção hoje | um dono com duas regras de efeito é o defeito 01 dentro do próprio dono | **n — confirmar** |
| A25 | **Guarda de status também no rastreio do app** | o dono aceita a guarda de origem (`expectedFrom`, como lista) também no `update` do `tracking_code`, e **o app sempre a passa**: a partir de `separating`, `status ∈ {separating, shipped}` (`shipped` admite a retentativa depois de outra admin ter marcado o envio); a partir de `shipped`/`delivered`, o status em que a folha foi aberta. Zero linhas ⇒ nada gravado e "Este pedido mudou enquanto você olhava." + releitura (MAA-21). O painel não passa (G3) | sem ela, um cancelamento pelo painel com a folha aberta gravaria o código num pedido cancelado | s (validador, rodada 2) |

**Open questions:** nenhuma sem padrão. G1–G7 decididos (ver coluna); A15 e A25 decididos na rodada
2. As **n — confirmar** (A8, A11, A17, A23, A24) seguem com o padrão e voltam ao usuário.

**SPEC_DEVIATION (registrados no fecho, 2026-10-24, a confirmar pelo usuário):**

- **A23 — o F5 com a folha aberta** (B01, prova em navegador): a letra pede `navigate(…, { replace: true })`
  ao montar com o marcador; o `replace` deixava um voltar morto no Chromium (a entrada do marcador
  continua lá embaixo). O implementado é `navigate(-1)`, feito **só** pelo usuário da folha que é a
  origem do marcador (o detalhe tem dois — rodapé e Entrega —, e no Chromium as duas voltas se somam).
- **A10, frase (2) — "Alterar rastreio" em `shipped`** (C02, `BUG-20261024-folha-afirma-aviso-que-falhou`):
  a letra escolhe a frase só pelo par (status, código anterior). O implementado exige também que o
  `order_shipped` esteja `sent` (`shippedNoticeSent`, lido das mesmas linhas do histórico); com o aviso
  falho, pendente, ausente ou com a leitura em erro, vale a frase neutra (3). Declarado em
  `packages/core/src/orders/appAction.ts`.
- **`MAA-40` — a primeira resposta por zero linhas** (C01, nota b do bug): segue a letra (a frase
  parcial com "Tentar de novo") mesmo quando a linha relida já está em `separating`/`cancelled`; o
  "Tentar de novo" passa a responder "Este pedido mudou enquanto você olhava." sem ir à rede. Trocar a
  primeira frase por `ORDER_CHANGED` é decisão de spec, não tomada.

---

## User Stories

### P1: "Recebi o material" ⭐ MVP

**User Story**: Como Adri, quero registrar que o envelope chegou assim que abro a caixa do correio,
para o pedido ir para a bancada e a cliente saber que o material dela está comigo.

**Why P1**: o bloco "Aguardando material" é o primeiro da Início, e hoje ele não tem saída no celular.

**Acceptance Criteria**:

1. WHEN o pedido aberto tem `appPrimaryAction(row).action = 'registrar-recebimento'` THEN o detalhe
   SHALL mostrar o rodapé "Recebi o material" (ao menos 44 px, largura inteira). Cancelado e entregue
   não têm rodapé (A14). (`MAA-01`)
2. WHEN ela toca "Recebi o material" THEN o app SHALL chamar `set_material_status` com
   `'material_recebido'` **uma** vez e, com `ok: true`, SHALL disparar `material_status_changed`
   pelo notificador de `core` (A2), mostrar a confirmação de A11 e reler as três chaves (A21).
   (`MAA-02`, A1)
3. WHEN a RPC devolve `ok: false` com `invalid_transition` THEN a tela SHALL mostrar
   `materialTransitionRefusal(<status devolvido pela RPC>, 'material_recebido')` — o motivo legível de
   `core` —, reler o pedido, e nada SHALL ser dito como gravado. (`MAA-03`)
4. WHEN a RPC devolve `not_admin` THEN o app SHALL levar à recusa da `72` (A3). WHEN devolve
   `order_not_found` THEN SHALL mostrar o estado "Não encontrei este pedido." (`MAP-29`). (`MAA-04`)
5. WHEN o material já está `material_recebido` (outra pessoa registrou antes) THEN a RPC responde
   `ok: true` (idempotente) e a tela SHALL mostrar a confirmação **sem citar e-mail** ("Material
   registrado." + "O pedido #0251 foi para a bancada."), sem erro — a reivindicação do envio já
   aconteceu e `sent` volta falso (A11). (`MAA-05`)

**Independent Test**: no banco local, um pedido `aguardando_material` e um `material_enviado`; tocar
"Recebi o material" no app e conferir `material_status`, `material_received_at` e a linha
`material_received` em `order_notifications`, iguais às do painel.

---

### P1: "Iniciar separação" ⭐ MVP

**User Story**: Como Adri, quero dizer que comecei a fazer a peça, para o pedido sair de "Pago, a
separar" e a cliente saber que a joia está em produção.

**Acceptance Criteria**:

1. WHEN `appPrimaryAction(row).action = 'separar'` (status `paid`) THEN o rodapé SHALL ser "Iniciar
   separação". (`MAA-06`)
2. WHEN ela toca e o material é `material_recebido` THEN o app SHALL chamar `set_material_status`
   com `'em_producao'` e, **só** com `ok: true`, gravar `status = 'separating'` pelo dono (A2) com
   `expectedFrom: 'paid'` (A4); WHEN o material está em outro estado THEN SHALL gravar só o status.
   (`MAA-07`, A5/A6)
3. WHEN o status muda THEN SHALL haver **uma** linha em `order_status_history` (`paid → separating`)
   e um disparo `order_status_changed` (que não produz e-mail para `separating`); o disparo
   `material_status_changed` SHALL sair só quando o material mudou. (`MAA-08`)
4. WHEN a transição do material é recusada THEN o status SHALL não ser gravado e a tela SHALL mostrar
   o motivo de `materialTransitionRefusal`. (`MAA-09`)
5. WHEN o material foi a `em_producao` (com `ok: true`, e o aviso `in_production` possivelmente já
   enviado) **e** a gravação do status falha (rede, 5xx) ou afeta zero linhas sem recusa de papel
   THEN a tela SHALL dizer "A produção ficou registrada, mas o pedido não passou para separação." com
   "Tentar de novo", SHALL reler o pedido, e nada SHALL ser dito como concluído. A nova tentativa SHALL
   gravar **só o status** — o que decorre da própria regra: com material `em_producao` e status
   `paid`, `appPrimaryAction` é `separar` e o material não está mais em `material_recebido`, então o
   passo do material não roda (nenhum segundo `set_material_status`, nenhum segundo aviso). Com
   zero linhas e `42501` de `atelie_clock`, vale a recusa da `72` (MAA-21). (`MAA-40`, G2)

**Independent Test**: no banco local, um pedido `paid` + `material_recebido`; tocar no app e comparar
com o painel fazendo **"Iniciar produção" (card do material) e depois o status `separating`** — as
duas ações do painel são o equivalente de uma do app. Depois, a falha parcial: o status forçado a
falhar (dublê no teste, e um `paid` mudado entre os dois passos no probe) e a retentativa gravando só
o status.

---

### P1: Rastreio e "Marcar como enviado" ⭐ MVP

**User Story**: Como Adri, quero salvar o código no balcão do correio, para a cliente receber o aviso
de postagem na hora.

**Acceptance Criteria**:

1. WHEN `appPrimaryAction(row).action` é `marcar-enviado` (status `separating`, não retirada) ou
   `salvar-rastreio` (`shipped` sem código) THEN o rodapé SHALL abrir a folha do rastreio (A23) com o
   título "Marcar como enviado" ou "Salvar rastreio" e a frase **sem código anterior** de A10.
   (`MAA-10`)
2. WHEN o pedido não é de retirada e está `shipped` ou `delivered` THEN a linha do rastreio no bloco
   Entrega SHALL ter "Informar" (sem código) ou "Alterar" (com código), de ao menos 44 px, que abre a
   folha com o título "Salvar rastreio" ou "Alterar rastreio" e a frase de A10 escolhida **pelo par
   (status, código anterior)**: `shipped` sem código ⇒ "A cliente recebe o e-mail de postagem assim
   que você salvar o código."; `shipped` com código ⇒ "A cliente já recebeu o aviso de postagem. O
   código novo aparece no pedido dela, mas não gera outro e-mail."; `delivered`, com ou sem código ⇒
   "O código aparece no pedido dela." (nunca promete e-mail de postagem). Os **quatro** casos
   (`shipped` sem/com, `delivered` sem/com) SHALL ter teste. (`MAA-11`, A10)
3. WHEN ela salva um código que `trackingCodeRefusal` recusa (A8) THEN a folha SHALL mostrar a frase
   no campo, sem ir à rede. O campo SHALL normalizar enquanto ela digita (maiúsculas, sem espaços).
   (`MAA-12`)
4. WHEN ela salva um código válido a partir de `separating` THEN o app SHALL gravar, pelo dono (A2) e
   nesta ordem: o `tracking_code` **sem** `shipping_carrier` (A9), **sem** aviso e com a guarda
   `status ∈ {separating, shipped}` (A25); o `status = 'shipped'` com `expectedFrom: 'separating'` e
   a linha de histórico `separating → shipped`; e **um** disparo `order_status_changed`. WHEN o
   `update` do rastreio afeta zero linhas (o pedido foi cancelado ou mudou com a folha aberta) THEN
   nada SHALL ser gravado e vale MAA-21. A folha SHALL fechar só depois do sucesso, e a confirmação
   SHALL seguir A11. (`MAA-13`)
5. WHEN ela salva a partir de `shipped` THEN o app SHALL gravar só o `tracking_code` (guarda
   `status = 'shipped'`, A25), sem mudar o status nem inserir histórico, e disparar
   `order_status_changed` — que completa o par do `order_shipped` se ele ainda não saiu (`shipped`
   sem código) e é no-op se já saiu (`shipped` com código). A confirmação SHALL citar e-mail só com
   `sent === true` **e** sem código anterior (A11). WHEN ela salva a partir de `delivered` THEN o app
   SHALL gravar só o `tracking_code` (guarda `status = 'delivered'`) e disparar `order_status_changed`
   por paridade com o painel — o que produz `order_delivered`, **nunca** `order_shipped`, e pode
   mandar um `order_delivered` que nunca tinha saído (A10b) —, e a confirmação SHALL ser "Rastreio
   salvo." + "O código ficou no pedido.", **sem** citar e-mail mesmo com `sent === true`. O caso
   `delivered` sem código ("Informar") SHALL ter teste próprio, com `sent === true` no dublê, provando
   que a confirmação não cita e-mail. (`MAA-14`, A10/A10b/A11)
6. WHEN o `tracking_code` foi gravado e o `status` não THEN a tela SHALL dizer "O código ficou salvo,
   mas o pedido não foi marcado como enviado." com "Tentar de novo", e a nova tentativa SHALL gravar
   só o que falta. Com a guarda de A25 no primeiro passo, este estado fica restrito a falha de rede ou
   5xx no segundo passo, ou à corrida estreita de o status mudar **entre** os dois passos (zero
   linhas no segundo, sem recusa de papel). (`MAA-15`)
7. WHEN o pedido é de retirada (`isPickupOrder`) THEN folha, "Informar/Alterar" e "Marcar como
   enviado" SHALL não aparecer em nenhum status — no rodapé, na Entrega nem no cartão. (`MAA-16`)

**Independent Test**: no banco local, um pedido `separating` sem código; salvar `AN123456789BR` no app
e conferir `tracking_code`, `shipping_carrier` intacto, `status`, a linha de histórico e
`order_shipped` em `order_notifications` iguais às de fazer o mesmo no painel (exceto
`shipping_carrier`, que o painel grava do campo); depois "Alterar" para outro código e conferir que
não há segundo `order_shipped`.

---

### P1: Lembrar do envio no WhatsApp ⭐ MVP

**User Story**: Como Adri, quero mandar uma mensagem carinhosa lembrando do envelope, sem digitar,
para a cliente que ainda não postou o material.

**Acceptance Criteria**:

1. WHEN o bloco Material é desenhado com `material_status = 'aguardando_material'`, pedido não
   cancelado e `normalizeBrPhone(customer_phone)` válido THEN SHALL mostrar "Lembrar do envio no
   WhatsApp" (44 px, largura inteira, cor do WhatsApp). Sem telefone válido, SHALL não aparecer — o
   corte é a condição de exibição do app; `chargeMaterialUrl` não muda (A17). WHEN o material está
   `material_enviado` THEN o lembrete SHALL não aparecer no app — o ramo "Vi que você já postou…" de
   `chargeMaterialText` sobe para `core` e continua só do painel (exclusão declarada em A17).
   (`MAA-17`)
2. WHEN ela toca THEN SHALL abrir `https://wa.me/<número>?text=<chargeMaterialText(...)>` em nova aba,
   com a URL de `chargeMaterialUrl` de `core` e a idade calculada com o `lido_em` da leitura; nada
   SHALL ser gravado. (`MAA-18`, A18/A19)
3. WHEN a mensagem é montada THEN ela SHALL não nomear o material, não ter urgência fabricada e ser a
   mesma, byte a byte, que o painel monta para o mesmo pedido no mesmo instante. (`MAA-19`)

---

### P1: Recusa, falha, espera e corrida ⭐ MVP

**Acceptance Criteria**:

1. WHEN uma ação está no ar THEN o controle SHALL ficar travado com "Salvando…" e uma segunda chamada
   da mesma ação para o mesmo pedido SHALL não sair — inclusive com dois toques seguidos e com o
   cartão e o detalhe montados ao mesmo tempo. (`MAA-20`, A20)
2. WHEN uma escrita de `orders` do app afeta **zero** linhas THEN o app SHALL não dizer que gravou:
   confere o papel (`atelie_clock`); com `42501`, leva à recusa da `72`; sem recusa, relê e diz "Este
   pedido mudou enquanto você olhava." (A4 — o app sempre passa `expectedFrom`). (`MAA-21`, A3)
3. WHEN a escrita falha por rede ou 5xx THEN SHALL dizer "Não consegui salvar. Tente de novo." com o
   pedido como estava; nunca a recusa. (`MAA-22`)
4. WHEN uma conta sem papel admin, com pedidos próprios como cliente, toca qualquer ação THEN nenhum
   pedido SHALL mudar, e a tela SHALL levar à recusa — provado contra o supabase-js real e o banco
   local. (`MAA-23`)
5. WHEN o disparo do aviso falha THEN a gravação SHALL valer, sem erro na tela, e a confirmação SHALL
   não citar e-mail (A12). (`MAA-24`)
6. WHEN o app está sem conexão THEN vale a tela "Sem conexão" da `72`; nenhuma ação SHALL ser
   enfileirada. (`MAA-25`)
7. WHEN o pedido mudou no banco com a tela aberta (Realtime) THEN o rodapé SHALL refletir a ação do
   estado novo; uma folha aberta para uma ação que deixou de valer SHALL ser fechada com "Este pedido
   mudou enquanto você olhava." (`MAA-26`)
8. WHEN uma gravação termina (sucesso, recusa, zero linhas ou falha parcial) THEN as chaves do
   detalhe, da lista e de `STORE_OVERVIEW_KEY` SHALL ficar invalidadas, e uma chave vizinha (o
   detalhe de outro pedido) SHALL não — provado por `isInvalidated` no cache. (`MAA-41`, A21)

---

### P1: As regras sobem para `core`, e os guardas ⭐ MVP

**Why P1**: `AD-056` — a porta de escrita e a mensagem do lembrete existem no painel.

**Acceptance Criteria**:

1. WHEN o app e o painel gravam status, rastreio de saída e disparam o aviso THEN os dois SHALL
   chamar o **mesmo** dono em `@estrelinha/core/order-actions` (A2), com client e notificador
   injetados. O hook do painel SHALL delegar a ele mantendo releituras e forma de retorno. A suíte do
   painel SHALL fechar verde com **nenhuma asserção tocada**; o **dublê** de escrita do painel
   (`update(v) → { eq: () => Promise }`) pode ganhar `.select` (devolvendo a linha), precedente da
   `73`/`74`. `toBe` vale **só** para `notifyOrder` (se a assinatura permitir) e `chargeMaterial*`;
   `updateStatus`/`addTrackingCode` vivem dentro de um hook e sua delegação é provada pelo guarda de
   MAA-39 e por teste de unidade do hook com o dono dublado. (`MAA-27`, G1)
2. WHEN `chargeMaterialText`/`chargeMaterialUrl` sobem THEN a mensagem e a URL SHALL ser byte a byte
   as do painel (inclusive o `wa.me` sem número quando não há telefone), com entrada estrutural (sem
   `@estrelinha/supabase/types`), e o painel SHALL reexportar por referência (`toBe`). (`MAA-28`)
3. WHEN um arquivo de `apps/mobile-adm/src` escreve (`update`/`insert`), chama `functions.invoke(` ou
   `rpc(` fora da porta de escrita do app THEN um guarda SHALL reprovar (ampliação de
   `leituraSoComPapel`, molde AST); `regraDePedidoSoNoCore` (`MAP-49`) SHALL continuar valendo — a
   condição de status e a escolha da ação moram em `core`. (`MAA-29`)
4. WHEN o app passa a chamar `set_material_status` THEN `marcacaoSoPorAcao.test.ts` (loja) SHALL
   continuar verde por igualdade (a RPC já está na lista), e qualquer RPC **nova** desta feature SHALL
   entrar na lista literal com o `create function` conferido, nunca afrouxando a igualdade. (`MAA-30`)
5. WHEN qualquer arquivo de produção de `apps/**` (painel e app) contém escrita em `orders` ou em
   `order_status_history` — **uma régua por comando** (`L-033`): `.update(`, `.insert(`, `.upsert(`
   e `.delete(` sobre cada uma das duas tabelas — fora do dono em `core/order-actions` THEN um guarda novo
   (molde `pedidoComDonoUnico`, pela AST como `marcacaoSoPorAcao`) SHALL reprovar. Allowlist
   **literal** de uma entrada: o `cancelOrder` de `useAdminOrders.ts`, com o motivo escrito. **Metade
   positiva**: o hook do painel e a porta do app **chamam** o dono. Âncora dupla, sensores (CRLF/LF,
   o glob de dois asteriscos, a forma quebrada em linhas, tabela em variável) e o inverso que prova
   que `select` de `orders` não é acusado. (`MAA-39`)

---

### P1: A tela no celular ⭐ MVP

**Acceptance Criteria**:

1. WHEN o detalhe com rodapé é desenhado em 360×800, 390×844 e 412×915 THEN o rodapé SHALL ficar
   fixo acima da barra de abas sem cobrir o último bloco, o `body` SHALL não rolar na horizontal, e
   todo alvo (rodapé, "Informar/Alterar", lembrete, "Agora não", "Salvar", botão do cartão) SHALL ter
   ao menos 44 px. (`MAA-31`)
2. WHEN a folha do rastreio abre THEN o campo SHALL ficar visível acima do teclado virtual, o foco SHALL
   ir ao campo e ficar preso na folha, e o voltar do Android SHALL fechar a folha sem sair do pedido,
   sem mudar `pathname`/`search` (A23); depois de fechar, o voltar seguinte SHALL levar à lista no
   mesmo recorte e posição (`74`). WHEN o detalhe monta com o marcador da folha no `history.state`
   (F5 com a folha aberta) THEN a folha SHALL não reabrir e a entrada SHALL ser substituída
   (`replace`), de modo que o primeiro voltar leve à lista. (`MAA-32`)
3. WHEN a fonte do sistema está a 130 % e a 200 % THEN rótulos do rodapé, da folha, do botão do cartão
   e da confirmação SHALL quebrar sem sobrepor nem cortar. (`MAA-33`)
4. WHEN o sistema pede menos movimento THEN a folha e a confirmação SHALL aparecer sem se mover
   (`motion-reduce:` que desliga movimento, na mesma linha). O guarda `movimentoDosPedidos` SHALL ser
   ampliado aos arquivos de UI novos da `75`, com escopo literal e âncora **recontada** com a própria
   régua (molde da `74`). (`MAA-34`)
5. WHEN a confirmação aparece THEN ela SHALL ser anunciada (`role="status"`) e sumir sozinha sem
   roubar o foco; o erro (`role="alert"`) SHALL ficar até a próxima ação. (`MAA-35`)

---

### P2: A ação no cartão da lista

**User Story**: Como Adri, quero resolver a fila "Precisa de ação" sem abrir pedido por pedido.

**Acceptance Criteria**:

1. WHEN uma linha da lista tem ação (`appPrimaryAction(row).action !== 'nenhuma'`) THEN o cartão SHALL
   mostrar o botão com o rótulo de `appPrimaryAction` — a **mesma** função do rodapé, inclusive o
   recorte de cancelado/entregue e o "Marcar como retirado" da retirada —, que executa a **mesma**
   ação do detalhe (a mesma folha para rastreio) e respeita a **mesma** trava por pedido, sem abrir o
   pedido; o resto do cartão continua abrindo o detalhe. A frase do cartão (`rowSummary.blocker`)
   não muda (A14b). (`MAA-36`, G5)
2. WHEN a ação do cartão grava THEN a lista SHALL reler na mesma posição de rolagem (as chaves de
   A21), e o pedido que saiu do recorte SHALL sair da lista. (`MAA-37`)

---

### P2: Retirada no escritório

**Acceptance Criteria**:

1. WHEN o pedido é de retirada e está `separating` THEN o rodapé (e o cartão) SHALL ser "Marcar como
   retirado" (`appPrimaryAction`, que lê `nextStep(order).actionLabel`) e gravar
   `status = 'delivered'` pelo dono, com `expectedFrom: 'separating'`, uma linha de histórico
   `separating → delivered` e o disparo `order_status_changed`. (`MAA-38`, G7)

---

## Edge Cases

- WHEN o pedido está cancelado com `material_status = 'aguardando_material'` THEN não há rodapé, botão
  no cartão nem lembrete (A14, A17).
- WHEN o pedido é de retirada em `separating` THEN `rowSummary` diria "Marcar como enviado"; o app diz
  "Marcar como retirado" porque lê `appPrimaryAction` (A14). O painel continua como está.
- WHEN o painel cancela o pedido enquanto a folha "Marcar como enviado" está aberta no celular THEN o
  `update` do rastreio, guardado por `status ∈ {separating, shipped}` (A25), afeta zero linhas:
  **nada** é gravado (nem o código) e a tela diz que o pedido mudou (`MAA-21`). Só se o cancelamento
  cair exatamente entre os dois passos o código fica gravado (`MAA-15`), e a releitura o mostra.
- WHEN o pedido está `delivered` sem código e a Adri toca "Informar" THEN a frase é "O código aparece
  no pedido dela.", o disparo `order_status_changed` sai (pode produzir um `order_delivered` que nunca
  tinha saído, A10b) e a confirmação não cita e-mail.
- WHEN a Adri recarrega a página (F5) com a folha do rastreio aberta THEN o detalhe abre sem a folha
  e sem voltar morto: a entrada com o marcador é substituída ao montar (A23).
- WHEN a Adri toca "Iniciar separação", o material vai a `em_producao` e o painel muda o status no
  meio THEN zero linhas no status ⇒ a frase de falha parcial (`MAA-40`) e a releitura; a retentativa
  só grava o status se a ação ainda for `separar`.
- WHEN a Adri toca "Recebi o material" e, no mesmo segundo, outra admin registra pelo painel THEN as
  duas convergem (`set_material_status` é idempotente) e o aviso `material_received` sai uma vez só
  (`claim_order_notification`).
- WHEN o código digitado é igual ao já salvo THEN "Alterar" grava sem efeito visível e confirma
  "Rastreio salvo." sem citar e-mail.
- WHEN o pedido está `shipped` sem código ("Salvar rastreio") THEN a frase é a sem código anterior: o
  `order_shipped` ainda não saiu e sai agora (A10).
- WHEN `customer_name` é vazio THEN a confirmação e o lembrete não usam nome ("A cliente recebe…";
  o lembrete segue `chargeMaterialText`).
- WHEN a sessão cai (logout em outra aba) com uma ação no ar THEN a resposta SHALL não ser desenhada
  e nenhuma confirmação aparece (a régua de troca de conta da `74`).
- WHEN o pedido não tem `customer_phone` ou o número não normaliza THEN o lembrete não aparece no app
  (no painel, o comportamento de hoje continua).
- WHEN o pagamento ainda está pendente e o material chega THEN "Recebi o material" funciona (A15).
- WHEN a folha está aberta e a Adri toca o voltar do Android duas vezes THEN a primeira fecha a folha
  e a segunda volta à lista no mesmo recorte (A23).

## Implicit-requirement dimensions (sweep)

| Dimensão | Onde está |
| --- | --- |
| Input validation & bounds | o código do rastreio (`MAA-12`, A8); o número do WhatsApp (`MAA-17`); a ação só do estado (`MAA-01`, `MAA-06`, `MAA-10`, A14) |
| Failure / partial-failure | `MAA-22`; o rastreio gravado sem o status (`MAA-15`); o material em produção sem o status (`MAA-40`); o material recusado antes do status (`MAA-09`); o aviso que falha (`MAA-24`) |
| Idempotency / retry / dedup | `set_material_status` idempotente (`MAA-05`); histórico só quando mudou (A22); retentativa grava só o que falta (`MAA-15`, `MAA-40`); toque duplo (`MAA-20`); `order_shipped` único (A10) |
| Auth boundaries & rate limits | RLS silenciosa e `not_admin` (`MAA-21`, `MAA-23`, A3); `send-notification` exige admin (403). Sem limite de taxa: ações por toque, uma por vez por pedido |
| Concurrency / ordering | `expectedFrom` no app, no status (A4) e no rastreio (A25, `MAA-13`/`MAA-21`); ordem material → status (`MAA-07`) e rastreio → status → aviso (`MAA-13`); Realtime fechando folha velha (`MAA-26`) |
| Data lifecycle / expiry | nada novo é guardado no aparelho; sem fila offline (`MAA-25`); o service worker não guarda respostas (`MAF-20`); a entrada de histórico da folha não toca a URL (A23) |
| Observability | N/A além do que existe: `order_status_history` e `order_notifications` (já no histórico do pedido, `MAP-28`) são o rastro; o app não tem telemetria |
| External-dependency failure | Supabase (`MAA-22`), a `send-notification`/Resend (`MAA-24`); o WhatsApp é só um link (`MAA-18`) |
| State-transition integrity | material pela RPC guardada (TS × SQL, `materialTransitions.test.ts`); status só pela ação de `appPrimaryAction` e com origem condicionada no app (A4); cancelado e entregue sem ação (A14); dono único da escrita (`MAA-39`) |

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MAA-01..05 | P1: Recebi o material | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-06..09, MAA-40 | P1: Iniciar separação | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-10..16 | P1: Rastreio e Marcar como enviado | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-17..19 | P1: Lembrete no WhatsApp | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-20..26, MAA-41 | P1: Recusa, falha, espera e corrida | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-27..30, MAA-39 | P1: Regras em `core` e guardas | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-31..35 | P1: A tela no celular | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-36..37 | P2: Ação no cartão | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |
| MAA-38 | P2: Retirada | Execute | Implemented (tasks.md, Requirement → Task; prova da T28/T29/T31) — Verificador pendente |

**Coverage:** 41 total, 41 mapped to tasks (`tasks.md`, *Requirement → Task*), todos implementados
no fecho do Lote 5 (2026-10-24), com o conserto B01 (`MAA-32`) e B02 (`MAA-34`) da prova em navegador.
O Verificador independente ainda não rodou.

> **Renumeração do rascunho**: `MAA-01` (RPC chamada e releitura) → `MAA-02`; `MAA-02` (motivo
> legível) → `MAA-03`; `MAA-03` (rastreio e enviado pela porta do painel) → `MAA-13`; `MAA-04`
> (retirada) → `MAA-16`; `MAA-05` (WhatsApp) → `MAA-17`/`18`; `MAA-06` (toque duplo) → `MAA-20`.
> **Acrescentados no portão**: `MAA-39` (guarda do dono único da escrita), `MAA-40` (falha parcial de
> "Iniciar separação"), `MAA-41` (releitura provada pela chave).

## Success Criteria

- [ ] Para cada ação (recebi, separar, enviar, salvar/alterar rastreio, retirado), o mesmo pedido
      semeado duas vezes no banco local e tratado uma vez pelo app e outra pelo **equivalente** do
      painel termina com as mesmas colunas de `orders` (salvo `shipping_carrier`, A9), as mesmas
      linhas de `order_status_history` e os mesmos eventos em `order_notifications` (probe). Para
      "Iniciar separação" com material na bancada, o equivalente do painel é "Iniciar produção" +
      status `separating`, e o probe diz isso.
- [ ] Uma conta sem papel admin, com pedidos próprios, não consegue mudar nenhum pedido pelo app e
      vê a recusa — contra o supabase-js real e o banco local.
- [ ] Zero confirmações falsas: nenhum caminho de teste mostra "salvo" com zero linhas afetadas ou
      falha parcial, nem cita e-mail com `sent !== true`.
- [ ] A suíte do painel fecha verde sem asserção tocada (o dublê de escrita pode ganhar `.select`)
      depois da subida da porta e do lembrete; loja, core, functions e catalog-import sem regressão
      contra a baseline medida na abertura; o guarda de MAA-39 verde com a allowlist de `cancelOrder`.
- [ ] Prova em navegador em 390×844 (e 360/412, fonte 130 % e 200 %): Início → "Aguardando material"
      → pedido → "Recebi o material" → confirmação → o número da Início caindo; e separar → marcar
      como enviado com o teclado aberto, o voltar do Android fechando a folha, sem rolagem horizontal
      e com alvos de 44 px.
