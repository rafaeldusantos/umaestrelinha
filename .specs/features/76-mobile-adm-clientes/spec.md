# 76 — mobile-adm: Clientes

**Status**: **IMPLEMENTADA, sem commit** (2026-10-24) — T01–T33 feitas, prova em navegador escrita (`prova-navegador.md`), probes de banco e de paridade. Faltam o Verificador independente, o QA e o Android real (TQ10).

> Programa mobile-adm (`AD-056`), feature 5 de 8. Depende da `72` (fundação), da `73` (Início), da `74`
> (Pedidos, só leitura) e da `75` (ações do pedido), as quatro mergeadas em `feature/mobile-adm`
> (`146d1c8b`). Branch: `feat/76-mobile-adm-clientes`, worktree
> `store-worktrees/store-76-mobile-adm-clientes`, mergeada em `feature/mobile-adm` depois de finalizada
> e testada, nunca direto na `master`.
> Telas: Claude Design `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, `Ateliê Admin.dc.html` — **Clientes**
> (linhas 205–240, `clientChips`/`clientList`, 1055–1066), **Cliente** (452–497, `cd`, 1141–1150) e o
> botão "Ver cliente" do detalhe do pedido (371). Lido em 2026-10-24.
> Specify aberto em 2026-10-24 sobre o rascunho do programa. Código e banco lidos antes de escrever:
> `apps/backoffice/src/entities/customer/api/{customerQuery,useAdminCustomerList,useAdminCustomer}.ts`,
> `pages/admin/{AdminClientsPage,AdminClientPage}.tsx`, as migrations `20260829120000_34-painel-de-vendas`
> (`customer_directory`, `customer_stats`, `customer_notes`, `customer_list`) e
> `20260830120000_35-clientes-e-pedidos-nuvemshop` (`customer_directory` com telefone da convidada),
> `core/orders/{queue,views,charge}.ts`, `core/notifications/phone.ts`, `core/paging/pageMath.ts`,
> `apps/mobile-adm/src/entities/order/{api/lerComPapel,api/useListaDePedidos,model/linha,model/pedidosHref}.ts`,
> `widgets/order-detail/ui/BlocoCliente.tsx`, `apps/store/src/shared/lib/whatsapp.ts`, e o banco local
> (`\d customer_directory`, `\d customer_list`, `\d customers`, `\d customer_notes`, `pg_policy` de
> `customers`/`orders`/`customer_notes`, distribuição de `orders.status × payment_status`).
> **Portão do Specify**: ver *Portão de fechamento*, no fim.

## Problem Statement

A Adri precisa, no celular, responder três perguntas sobre quem comprou dela: **"quem é esta
pessoa e como falo com ela?"**, **"o que ela já levou?"** e **"ela tem peça minha em andamento?"**.
Hoje a aba Clientes é "em construção" (`72`), o detalhe do pedido (`74`) não leva à cliente (A20 da `74`
tirou o "Ver cliente" para não ser CTA morto), e o Backoffice tem a resposta, mas no computador. Esta
feature dá ao app a lista de clientes (busca e dois recortes), a ficha de uma cliente (contato,
"Conversar no WhatsApp", números e os pedidos dela, levando ao detalhe da `74`) e o caminho de volta do
pedido à cliente. **É só leitura.** Boa parte de quem comprou acabou de perder alguém: a tela é um
caderno de contatos de quem confiou à Adri algo precioso, não um painel de vendas.

## Goals

- [ ] Cada cliente aparece **uma** vez na lista — a convidada que depois criou conta incluída — e a
      lista funciona com mais de 1.000 clientes sem repetir nem pular ninguém.
- [ ] Os dois recortes e o selo "Em aberto" respondem pela **mesma regra**, que mora em `core`, e a
      regra do recorte "Compraram mais de uma vez" é a mesma do "Voltaram" do painel.
- [ ] A ficha mostra contato, "Conversar no WhatsApp" (só com telefone válido), os números da cliente
      e os pedidos dela, e o toque no pedido abre o detalhe da `74`.
- [ ] Conta sem papel admin **nunca** vê clientes: a leitura é pareada com a recusa da `72`
      (`lerComPapel`), provada contra o supabase-js real.
- [ ] O telefone, o e-mail e o nome da cliente não saem do aparelho nem ficam nele além da memória do
      app: nada na URL, no `history.state`, no armazenamento ou no console.

## Out of Scope

| Item | Por quê |
| --- | --- |
| **Escrever** qualquer coisa: criar, editar, anonimizar, anotar | decisão do programa: a `76` é leitura. `anonymize_customer` (LGPD) e `customer_notes` ficam no Backoffice |
| **Notas internas** (`customer_notes`), ler **e** escrever | **não estão no protótipo** (conferido nas 1.262 linhas do `.dc.html`) e o rascunho não as lista. Resolvido como "nenhum dos dois" — ver *Q1*. Ler sem poder escrever seria uma tela pela metade, e escrever pede uma porta de escrita própria, nos moldes do `AD-059` |
| CPF/CNPJ, na lista, na ficha e na busca | o protótipo busca por "Nome, e-mail ou telefone". Dado sensível que a Adri não precisa para falar com a cliente. O painel continua com ele (*Q4*) |
| Endereço completo, tabela `addresses`, `material_kinds` e a visão "Confiaram material" | não estão no protótipo; `material_kinds` é curadoria pendente (`BL-015`) e **dizer qual material a pessoa confiou** numa lista de contatos é exposição sem ganho |
| Visões "Possíveis duplicadas", "Cadastro sem compra", "Compraram uma vez só", filtro de conta/última compra, ordenação por coluna, CSV | são do painel. O protótipo tem **três** chips (`Todas`, `Compraram mais de uma vez`, `Com pedido em aberto`) e uma ordem fixa |
| Mesclar duplicatas | decisão da dona e escrita destrutiva (`CLI-14`) |
| Realtime nas listas de clientes | a Início já relê pelo aviso de pedidos; aqui basta foco, puxar e a volta da rede (*MAC-13*). Cliente nova entrando enquanto a tela está aberta não é urgência |
| Ligar por `tel:`, e-mail por `mailto:` | só o WhatsApp está no protótipo |
| Mensagem pronta no WhatsApp | "Conversar no WhatsApp" abre a conversa **em branco**. O texto pronto é a cobrança do material (`75`) e é do pedido, não da pessoa |
| Ranking, "melhores clientes", "VIP", valor vitalício | tom memorial. A lista ordena por atividade, não por gasto, e nenhum rótulo valoriza a pessoa pelo que gastou |
| iOS | o programa é só Android |

## Assumptions & Open Questions

Decididas por mim (A) com o motivo. **Q1, Q2b, Q3, A8 e A13 foram respondidas pelo validador independente em 2026-10-24** e estão confirmadas (`AD-060`); nenhuma assunção fica pendente do usuário. As de *Q* são as perguntas do rascunho e as que o Specify abriu.

| # | Assunção / decisão | Motivo | Confirmada? |
| --- | --- | --- | --- |
| **Q1** | **Notas internas: nenhum dos dois** (nem ler, nem escrever; `customer_notes` fora, Out of Scope registrado) | fora do protótipo e do rascunho; a tabela tem `has_role` na policy mas **a RLS devolve vazio, não erro**, a uma conta sem papel — então ler exigiria o mesmo pareamento, e escrever uma porta nova. Uma nota sobre a morte de alguém é o dado mais sensível do banco. Se a Adri quiser, a leitura é uma linha de `P2` numa feature futura, sem retrabalho | **s** (validador, 2026-10-24) |
| **Q2** | **"Em aberto" é o recorte E o selo da linha — não o total.** O protótipo tem as duas coisas: o chip "Com pedido em aberto" filtra, e a linha ganha o selo "Em aberto" (`c.open_`). Os dois leem o **mesmo** predicado; nenhum valor em dinheiro é "em aberto" | o rascunho perguntava "recorte ou total": é um booleano por cliente, e o dinheiro da linha (`c.total`) é o **total pago** | s |
| **Q2b** | **Definição de "pedido em aberto": `payment_status = 'approved'` E `status` em `pending`/`paid`/`separating`/`shipped`.** O rascunho dizia "algum pedido não `delivered`/`cancelled`" | **medido no banco local**: dos 54 pedidos, 9 têm `status = 'pending'` com pagamento `expired` (5), `rejected` (3) ou `cancelled` (1) — e **ficam `pending` para sempre**. Com a regra do rascunho, quem teve um Pix expirado apareceria "Em aberto" indefinidamente, e o selo diria à Adri que há uma peça em andamento que não existe. Os 4 pedidos `pending` + `approved` (material esperado) **são** peça em andamento e entram. O Pix ainda aguardando **não** entra, pelo mesmo motivo que o painel o deixa fora de "Precisa de ação" (`views.ts`). **Altera o critério 2 do rascunho** (`SPEC_DEVIATION`) | **s** (validador) |
| **Q3** | A contagem de pedidos em aberto vem de **uma coluna nova no fim de `customer_stats` e `customer_list`** (`orders_open`), por migration aditiva, com o predicado de `core` traduzido para SQL e guardado byte a byte | `customer_list` é a view que o painel já lê e **não tem** "em aberto" (`last_activity_at > last_order_at` é outra coisa: é "tem pedido não pago"). Filtrar no cliente exigiria trazer a base inteira; uma RPC só do app seria a terceira escrita da regra | **s** (validador) |
| Q4 | CPF/CNPJ fora do app (lista, ficha, busca) | o protótipo não o usa; menos dado no aparelho pessoal | s |
| A4 | A lista lê `customer_list` pelo PostgREST **pareada com `atelie_clock`** (`lerComPapel`, `AD-058`) | `customers` tem a policy "users read own customer" e `orders` "users read own orders": medido, uma conta sem papel lê **a própria linha** de `customer_directory`/`customer_list` sem erro. É exatamente o vazamento falso-plausível da `74` | s |
| A5 | `lerComPapel` sobe de `entities/order/api` para `shared/api` (camada abaixo), e `entities/order` e a nova `entities/customer` o importam de lá | a `74` o deixou na entidade `order`; um import lateral `entity → entity` é o que o `CLAUDE.md` raiz proíbe (`AD-033`). `leituraSoComPapel.test.ts` passa a varrer os dois | s |
| A6 | A cidade da ficha vem do **pedido mais recente que a tenha** (`orders.address_city`/`address_state`), lida junto com os pedidos; sem nenhum, a cidade é **omitida** (sem "—") | `customer_directory` não tem cidade; `addresses` só existe para quem criou conta, e ler endereços completos amplia a superfície sensível. A convidada só tem o endereço do pedido | s |
| A7 | "Cliente desde" = `created_at` de `customer_directory` (cadastro, ou o primeiro pedido da convidada) | é a coluna que a view já derivou (`first_seen`) | s |
| A8 | A linha da lista diz "N compras · última há X dias": N = `orders_paid`, "última" = `last_order_at` (a última **paga**); quem nunca pagou diz "Sem compra paga ainda". A **ordem** é por `last_activity_at` (a atividade mais recente de qualquer estado), desc, nulos por último | o protótipo ordena "das compras mais recentes para as mais antigas". A diferença entre a data mostrada e a ordem só aparece em quem tem pedido não pago; é a mesma distinção do `CLI-05` do painel; o app não diverge dela, e a diferença entre a data mostrada e a ordem é intencional | **s** (validador) |
| A9 | "Compras", "no total" e "ticket médio" contam **só pedidos pagos** (`customer_stats`, `CLI-04`) e a ficha **declara isso em texto** | a view já faz assim; somar Pix expirado inflaria o gasto | s |
| A10 | O vínculo cliente → pedidos é **`customer_id` = id OU `lower(customer_email)` = `lower(email)`**, a mesma regra de `customer_stats` e de `order_list.purchase_ordinal`; o e-mail é comparado **exato, sem curinga** | o painel usa `customer_email.ilike.<email>` com o e-mail cru: `_` e `%` valem como curinga em `ilike`, e o arquivo real tem `VROSA_RJ@HOTMAIL.COM` — a ficha de uma pessoa puxaria pedidos de **outra**. Medido: `escapeSearchTerm` (`core/paging`) só troca `( ) ,` por espaço, não escapa `%`/`_` | s |
| A11 | "Ver cliente" no detalhe do pedido resolve o id **por uma leitura ao tocar** (`customer_directory` por `lower(email)`), e não calculando `md5(lower(email))::uuid` no navegador | o id da convidada é derivado **no banco**; reescrevê-lo em JS é uma segunda escrita da regra do id (defeito 01) que nenhum teste de componente pegaria | s |
| A12 | O telefone aparece **mascarado** (`maskPhone`) e o link do WhatsApp usa `normalizeBrPhone` (`core`, o dono do número do `wa.me`) | o `BlocoCliente` da `74` já faz isso | s |
| A13 | O **`whatsappHref` do rascunho não é alcançável**: ele vive em `apps/store/src/shared/lib/whatsapp.ts`, exige mensagem e tem o portão de 10 dígitos do número da LOJA. O que o app já usa é `normalizeBrPhone` + um `wa.me/<número>` escrito à mão no `BlocoCliente`. A `76` precisaria de uma **terceira** escrita do `wa.me` (já existem `chargeMaterialUrl`, `BlocoCliente` e a loja); por isso nasce `whatsappChatUrl` em `core` e o `BlocoCliente` passa a usá-lo, **sem mudar a saída** | corrige a premissa do rascunho. Não se muda `chargeMaterialUrl` (sobe byte a byte, o painel o reexporta por `toBe`) | **s** (validador) |
| A14 | A busca por telefone compara **só dígitos**: "(51) 99812-4471", "51998124471" e "99812" acham a mesma pessoa. Vale **só para o app** (o painel continua sem a dobra, "nenhuma asserção tocada"); a dobra mora no construtor de busca de `core`, ligada por opção | `customers.phone` e `orders.customer_phone` guardam só dígitos (máscara na digitação, `ADR-05`); sem a dobra, quem busca como o número aparece na tela não acha ninguém | s |
| A15 | O telefone é do **pedido mais recente que o tenha** para a convidada, e de `customers.phone` para quem criou conta — o que `customer_directory` já entrega. O app mostra o que a view devolve | a regra é da `35`; não há o que decidir aqui | s |
| A16 | Pessoa **anonimizada** (`anonymize_customer`) aparece como a view a devolve (nome/e-mail trocados); o app não a trata à parte | a anonimização é do painel; tratar à parte seria uma segunda regra | s |
| A17 | A página tem 25 clientes por janela e "Carregar mais"; a ficha lê **20 pedidos** por janela e "Ver mais pedidos" | molde da `74` (`ORDER_PAGE_SIZE`); 25 clientes cabem em ~4 telas de 390×844 | s |
| A18 | Duas linhas de `customer_directory` com o **mesmo e-mail** (duas contas) continuam duas linhas; o app não as junta. As duas somam os mesmos pedidos em `customer_stats` (`CLI-14`) | desfazer isso é a "mescla", fora de escopo. Declarado para a Adri não achar que a tela duplicou | s |

## User Stories

### P1: A lista de clientes ⭐ MVP

**User Story**: Como Adri, quero abrir Clientes e achar rápido a pessoa que me escreveu, para falar com
ela sem abrir o computador.

**Why P1**: é a entrada da feature; sem ela a ficha não tem como ser alcançada.

**Acceptance Criteria**:

1. WHEN a lista abre THEN cada linha de `customer_directory` SHALL aparecer **uma** vez — a convidada
   que depois criou conta incluída (a view já a tira por `NOT EXISTS` no e-mail) —, e nenhum `id`
   SHALL se repetir na leitura completa nem entre janelas. (`MAC-01`)
2. WHEN a lista abre THEN a ordem SHALL ser `last_activity_at` decrescente, nulos por último, com `id`
   como desempate estável (A8). (`MAC-02`)
3. WHEN uma linha é desenhada THEN SHALL mostrar a inicial, o nome (sem nome: o e-mail), "N
   compras/compra · última há X" (A8; "Sem compra paga ainda" para quem nunca pagou), o total pago
   (`formatPriceWhole`, o dono é `core`) e — só quando `orders_open ≥ 1` — o selo "Em aberto" (tom
   "em andamento", o mesmo `Selo` da `74`, **nunca** o âmbar de alerta). (`MAC-03`)
4. WHEN a lista está no ar THEN a linha de contagem SHALL ser o `count: 'exact'` do servidor **com o
   recorte e a busca aplicados** ("12 clientes · das atividades mais recentes para as mais antigas"),
   no singular quando for um, e **nunca** `linhas.length`. (`MAC-04`)
5. WHEN há mais clientes que a janela THEN o app SHALL oferecer "Carregar mais", que lê a página
   seguinte por cursor (`last_activity_at`, `id`) — **sem repetir e sem pular** quem tem a mesma data
   ou data nula —, e SHALL funcionar acima de 1.000 clientes (o teto do PostgREST não pode truncar
   em silêncio: cada leitura é de no máximo 25 e a contagem vem do servidor). Uma cliente que muda de
   posição entre duas leituras pode ser vista uma vez só ou ficar fora da janela; o app **descarta
   `id` repetido** e a releitura (foco/puxar) a reconcilia. (`MAC-05`)
6. WHEN ela digita na busca ("Nome, e-mail ou telefone") THEN a lista SHALL filtrar por `name`,
   `email` e `phone` (**sem** `cpf`, Q4) depois de 300 ms parada; `%`, `_`, `\`, `(`, `)` e `,` no
   termo SHALL valer como texto (nenhum vira curinga nem quebra o `or()`); o telefone SHALL casar por
   dígitos (A14); o termo vazio ou só de espaços SHALL ser "sem busca". O termo é estado da página,
   **fora da URL** (`MAC-28`). (`MAC-06`)
7. WHEN ela toca um chip THEN a lista SHALL filtrar pelo recorte e o endereço SHALL passar a ser
   `/clientes?recorte=<id>` por **substituição** de histórico (o voltar do Android não empilha chips).
   Os ids são `todas` (padrão), `recorrentes` e `em-aberto`; valor fora do vocabulário SHALL abrir em
   `todas`. O nome do parâmetro e a montagem do endereço têm **um** dono (`clientesHref`). (`MAC-07`)
8. WHEN o recorte é "Compraram mais de uma vez" THEN o predicado SHALL ser `orders_paid ≥ 2` — o
   **mesmo** do "Voltaram" do painel, escrito uma vez em `core`. (`MAC-08`)
9. WHEN o recorte é "Com pedido em aberto" THEN o predicado SHALL ser `orders_open ≥ 1` (Q2b), e o
   selo da linha SHALL ler a **mesma** coluna: não existe cliente no recorte sem o selo, nem o
   contrário. (`MAC-09`)
10. WHEN não há cliente (base vazia), o recorte ou a busca não acham ninguém THEN o app SHALL mostrar
    um estado vazio calmo e próprio de cada caso ("Ainda não há clientes.", "Ninguém com pedido em
    aberto agora.", "Não achei ninguém com “<termo>”.") com "Limpar" quando houver filtro. Nunca um
    esqueleto eterno e nunca o número zero como se fosse dado. (`MAC-10`)

**Independent Test**: no banco local (48 pessoas), abrir a lista, conferir que a soma das janelas tem 48
`id` distintos; buscar um pedaço do telefone digitado com máscara; tocar cada chip e comparar a
contagem com `select count(*) from customer_list where …` do mesmo predicado.

---

### P1: Quem pode ler, e o que acontece quando a leitura falha ⭐ MVP

**User Story**: Como Adri, quero que o app só mostre meus clientes a quem tem acesso de verdade, e que
uma queda de rede não vire um número falso.

**Why P1**: `customer_list` devolve a uma conta sem papel a linha **dela mesma**, sem erro — a
`MAI-23`/`MAP-36` da `73`/`74` outra vez.

**Acceptance Criteria**:

1. WHEN a lista ou a ficha são lidas THEN a consulta SHALL sair **em paralelo** com a RPC
   `atelie_clock` e o dado só SHALL ser entregue se a RPC respondeu sem `42501` (`lerComPapel`,
   `AD-058`). Com `42501` o app SHALL levar à recusa da `72` ("Esta conta não tem acesso ao
   painel."), com nenhuma linha desenhada — nem a do cache —; a recusa vence mesmo que a consulta
   tenha falhado (E2 da `74`); rede **nunca** é recusa. (`MAC-11`)
2. WHEN a leitura da lista falha (rede, 500) THEN o app SHALL mostrar "Não consegui carregar as
   clientes." com "Tentar de novo" — sem dado, **nunca** um zero —, e, havendo janela anterior, SHALL
   manter a lista com "Não consegui atualizar agora.". WHEN a página seguinte falha THEN SHALL mostrar
   a falha **ali**, no rodapé da lista, com "Tentar de novo", sem apagar o que já está na tela.
   (`MAC-12`)
3. WHEN o aparelho fica sem conexão THEN valem as regras da `72` (`OfflineScreen`); ao voltar, a tela
   relê. A lista relê também na volta ao primeiro plano (`refetchOnWindowFocus`) e ao puxar; o "Atualizado
   às" é o `lido_em` da RPC, em hora de Brasília, nunca o relógio do aparelho (`MAI-18`). (`MAC-13`)

**Independent Test**: com o supabase-js real e `customer_list` devolvendo a linha de uma cliente
comum, mais `atelie_clock` em 403 `42501`: o texto dessa cliente não aparece em nenhum instante lido, e
o app mostra a recusa. Com `customer_list` em 500: a recusa ainda vence. Com a RPC sem rede: falha de
leitura, nunca a recusa.

---

### P1: A ficha da cliente ⭐ MVP

**User Story**: Como Adri, quero abrir uma cliente e ver como falar com ela e o que ela já levou, para
responder a mensagem dela com o contexto na mão.

**Why P1**: é a razão de existir da aba.

**Acceptance Criteria**:

1. WHEN ela toca uma linha THEN o app SHALL abrir `/clientes/:id` — subrota da aba Clientes (a aba
   continua marcada), dentro do guarda de `RequireAdmin` —, e o voltar do Android SHALL devolver à
   lista no **mesmo recorte, busca e posição de rolagem**. Id que não é UUID SHALL mostrar o estado
   "Não encontrei esta cliente." **sem ir à rede**; id válido sem linha SHALL mostrar o mesmo estado.
   (`MAC-14`)
2. WHEN a ficha abre THEN o cabeçalho SHALL mostrar a inicial, o nome (sem nome: o e-mail) e "<cidade/UF>
   · cliente desde <mês> <ano>" (A6, A7), omitindo a cidade e o separador quando nenhum pedido a tem.
   (`MAC-15`)
3. WHEN a ficha abre THEN três números SHALL aparecer — compras (`orders_paid`), "no total"
   (`total_spent`) e "ticket médio" (`avg_ticket`, **travessão** quando `null`: "R$ 0,00" seria afirmar
   que ela gastou zero) — e uma linha SHALL dizer que contam **só os pedidos pagos** (A9). Os números
   vêm de `customer_list`, não de somar os pedidos da tela. (`MAC-16`)
4. WHEN a ficha mostra o contato THEN SHALL listar o e-mail e o telefone (mascarado, A12), e
   "Conversar no WhatsApp" (44 px, largura inteira, as cores de `shared/config/whatsapp.ts`) SHALL
   existir **só** quando `normalizeBrPhone(phone)` devolve número; sem telefone válido o botão e a
   linha do telefone SHALL não aparecer, e o e-mail continua. O botão é `<a href target="_blank"
   rel="noopener noreferrer">`, o `href` vem de `whatsappChatUrl` (A13) e **não leva texto**: abre a
   conversa em branco. (`MAC-17`)
5. WHEN a ficha mostra os pedidos THEN SHALL lê-los por A10 (id **ou** e-mail exato sem curinga),
   do mais recente ao mais antigo, 20 por janela com "Ver mais pedidos" por cursor `(created_at, id)`;
   cada linha SHALL ter "#<número> · <nome do primeiro item>" (`formatOrderNumber`, `core`), "<data>
   · há N dias" (`lido_em` da RPC), o total e a situação (`SituacaoDoPedido`, `orderSituation(…,
   'atelie')`, **sem tabela de rótulo no app**). Os nomes dos itens vêm de **uma** leitura `in(order_id)`
   para a janela, não uma por linha; se ela falha, as linhas saem **sem o item** e a ficha não cai.
   (`MAC-18`)
6. WHEN os pedidos lidos estão completos (a janela cobre todos) THEN a contagem deles SHALL ser igual a
   `orders_total` de `customer_list`; se diferir, é defeito (probe, ver *Success Criteria*), e o app
   **não** tenta reconciliar na tela. WHEN há mais que a janela THEN o cabeçalho da seção SHALL dizer
   "Pedidos · <orders_total>" e o "Ver mais pedidos" aparece. (`MAC-19`)
7. WHEN ela toca um pedido THEN o app SHALL abrir `/pedidos/:id` (a `74`), e o voltar SHALL trazer de
   volta à ficha, na mesma posição. (`MAC-20`)
8. WHEN o detalhe de um pedido mostra o bloco Cliente THEN SHALL existir "Ver cliente" (44 px, o
   secundário do protótipo, linha 371), que resolve o id da pessoa por uma leitura pareada com o papel
   (A11) e abre `/clientes/:id`; enquanto resolve, o botão mostra o estado de espera sem sair do lugar;
   se a pessoa não é achada, SHALL dizer "Não encontrei esta cliente." na própria linha e **não**
   navegar. Remove-se o comentário "Ver cliente não aparece até a `76` (A20)" do `BlocoCliente`.
   (`MAC-21`)
9. WHEN a ficha lê THEN SHALL usar a **mesma** `lerComPapel` e as mesmas regras de recusa, falha e
   releitura da lista (`MAC-11`..`MAC-13`); a falha dos pedidos SHALL ser do bloco ("Não consegui carregar
   os pedidos.", "Tentar de novo"), sem derrubar o cabeçalho e o contato, que já estão na tela.
   (`MAC-22`)

**Independent Test**: no banco local, abrir uma convidada e uma cliente com conta; para as duas, o
total de pedidos listados = `orders_total`; a de e-mail com `_` (`VROSA_RJ@…`) **não** traz o pedido de
outra pessoa (fixtura com `VROSAXRJ@…`); "Ver cliente" no pedido de uma convidada abre a ficha dela.

---

### P1: As regras ficam em `core`, e os guardas ⭐ MVP

**User Story**: Como mantenedora do repositório, quero que "quem voltou", "quem tem peça em
andamento" e "como se busca uma cliente" tenham uma escrita só, para o app e o painel não divergirem.

**Why P1**: é a letra do `AD-056` ("toda regra que o app ler e o Backoffice já tiver sobe para `core`") e
o defeito 01 do repositório.

**Acceptance Criteria**:

1. WHEN o app e o painel precisam do predicado de um recorte de clientes THEN ele SHALL ser **dado** em
   `core` (módulo novo `core/customers`, sem imports de pacote, todo especificador relativo com `.ts`,
   alcançável pelo Deno): `voltaram` (`orders_paid ≥ 2`) e `em-aberto` (`orders_open ≥ 1`) com um
   tradutor para o builder do PostgREST (`applyCustomerSlice`, estrutural: `gte`/`eq`, sem importar o
   supabase-js). O `applyView` do painel SHALL delegar ao tradutor para `voltaram`; a lista de visões do
   painel (`CUSTOMER_VIEWS`, 6) SHALL ficar byte a byte e ser reexportada por `toBe`. A suíte do painel
   SHALL fechar verde **sem asserção tocada**. (`MAC-23`)
2. WHEN `orders_open` é definida THEN uma migration nova e aditiva (`supabase/migrations/20261025…`,
   nunca reescrevendo uma aplicada, `AD-017`) SHALL recriar `customer_stats` e `customer_list` com a
   coluna **no fim** (`CREATE OR REPLACE VIEW` só aceita colunas novas ao final), com o predicado de
   `core` traduzido para SQL e **guardado byte a byte** por um teste que lê a migration e o dono em
   `core` (molde de `filaComDonoUnico.test.ts`), `security_invoker` preservado, nenhum `grant` novo e
   **nenhuma escrita de dado**. `customer_list` continua com as 18 colunas em ordem e ganha a 19ª; o
   painel (`select('*')`) não muda de comportamento. A semântica só é provada por **probe SQL** (como
   `BL-050`): pedidos pagos/entregues/cancelados/Pix expirado, convidada e conta. (`MAC-24`)
3. WHEN o app monta a busca THEN usará o construtor de `core` (`buildCustomerSearchCondition`, subido do
   painel byte a byte) com as colunas `name`, `email`, `phone` e as opções de **escapar curingas** e
   **dobrar telefone por dígitos** ligadas só no app (A14); o painel mantém as quatro colunas e o
   comportamento de hoje. O escape de `ilike` SHALL ter **um** dono, usado também pelo vínculo de A10.
   (`MAC-25`)
4. WHEN o app precisa do endereço do WhatsApp de um número THEN `whatsappChatUrl` (`core`, ao lado de
   `normalizeBrPhone`, com `.ts`) SHALL ser o único construtor de `https://wa.me/<número>` no app;
   `BlocoCliente` (`74`) passa a chamá-lo com a **mesma saída** de antes, provada por um teste que compara o `href` do `BlocoCliente` antes e depois (fixtura com `+55`, máscara e telefone inválido). `whatsappChatUrl` é folha sem import, com `.ts` explícito, e o `chargeMaterialUrl` fica intocado. (`MAC-26`)
5. WHEN a feature fecha THEN SHALL existir, com **âncora dupla** e sensor, no molde da `74`/`75`:
   - `clientesHref` como dono do endereço (`enderecoDeClientesComDonoUnico`: nome do parâmetro,
     `useSearchParams` e a montagem do endereço fora dele);
   - `leituraSoComPapel` ampliado: o client só em `lerComPapel` e nos hooks de cliente, `.from(`
     só dentro de função passada a `lerComPapel(`, e **nenhuma** escrita, `rpc(` além de `atelie_clock`
     (a lista literal de `marcacaoSoPorAcao` da loja não ganha RPC nova);
   - `regraDeClienteSoNoCore`: mapa/`case`/predicado de recorte de cliente fora de `core`;
   - `semDadoSensivelDeClienteNoApp`: `cpf`, `material_kinds`, `customer_notes`, `addresses`,
     `customer_document` e `nuvemshop_*` não citados em `apps/mobile-adm/src`, e o `select` da lista e
     da ficha comparado **por igualdade de chaves** com um probe (`AD-012`: tipo à mão é afirmação);
   - `whatsappComDonoUnico`: o literal `wa.me` fora de `core/notifications/phone.ts` (o dono) e de `core/orders/charge.ts` (allowlist literal de um, a cobrança do material, que não muda) é acusado em `apps/mobile-adm/src`, testes inclusos; **metade positiva**: o `BlocoCliente` e a ficha chamam `whatsappChatUrl`; âncora dupla (arquivos lidos e o dono encontrado) e sensor com `wa.me` por interpolação, concatenação, CRLF, LF e o glob de dois asteriscos (`BL-027`), mais o inverso que prova que o `href` já montado por `whatsappChatUrl` não é acusado;
   - `denoReach` de `core/customers` (e do novo `whatsappChatUrl`) sem especificador sem `.ts`.
   O guarda `situacaoComDonoUnico` (loja) já varre `apps/mobile-adm/src`. (`MAC-27`)

**Independent Test**: reinjetar cada mutante (`orders_paid ≥ 3`, `orders_open` sem o `approved`, curinga
sem escape, `wa.me` à mão no app, `select('*')` na lista) e ver o teste certo cair por asserção.

---

### P1: Privacidade da cliente ⭐ MVP

**User Story**: Como Adri, quero ter certeza de que o telefone e o e-mail de quem confiou algo
precioso a mim não vazam do meu celular.

**Why P1**: o aparelho é pessoal, pode ser perdido, e a URL/`history.state` sobrevivem ao app.

**Acceptance Criteria**:

1. WHEN o app navega, busca ou lê THEN nome, e-mail e telefone SHALL **nunca** aparecer na URL, no
   `history.state`, em `localStorage`/`sessionStorage`/IndexedDB, no título do documento, em
   `console.*` nem em qualquer requisição que não seja ao Supabase da loja. O termo da busca fica só em
   memória; a rota da ficha leva o `id` (UUID), nunca o e-mail. O cache do React Query é limpo na
   troca de conta e ao sair (`trocaDeContaLimpaCache`). (`MAC-28`)
2. WHEN as consultas são montadas THEN SHALL pedir as colunas **uma a uma** (CPF, `material_kinds`,
   notas e endereço completo fora, Q4), e o service worker SHALL continuar sem guardar resposta de dado
   (`swSemDadosDaLoja`). (`MAC-29`)
3. WHEN qualquer coisa nesta feature é desenhada THEN **não SHALL** existir escrita: nenhum `insert`,
   `update`, `delete`, `upsert` ou RPC de escrita; o app é só leitura. (`MAC-30`)

---

### P1: A tela no celular ⭐ MVP

**User Story**: Como Adri, quero usar Clientes numa mão só, com a fonte do sistema grande e o teclado
aberto.

**Why P1**: ~90 % do uso é celular e o app é só celular; jsdom devolve 0 para toda medida de layout.

**Acceptance Criteria**:

1. WHEN a lista e a ficha abrem em 360, 390 e 412 de largura THEN SHALL não haver rolagem horizontal
   do corpo, toda linha e todo botão SHALL ter ao menos 44 px de alvo (as linhas inteiras são o alvo; o
   chip tem 44 px, não os 38 do protótipo) e os chips SHALL rolar dentro do próprio contêiner, com a
   afordância de que há mais. (`MAC-31`)
2. WHEN a fonte do sistema está em 130 % e 200 % THEN o nome e o e-mail longos SHALL quebrar
   (`[overflow-wrap:anywhere]`), o selo "Em aberto" e o total SHALL poder descer para a linha de baixo
   (nada de `shrink-0` nem de `truncate` no selo), os três números da ficha SHALL empilhar quando não
   couberem (`auto-fit` com piso em `rem`, a lição do QA da `73`) e nada SHALL se sobrepor ou cortar.
   (`MAC-32`)
3. WHEN há animação ou transição (carregar, abrir a ficha) THEN toda classe `transition-*`/`animate-*`
   SHALL ter o par `motion-reduce:` que desliga o movimento, na mesma linha (`movimentoDosPedidos`
   ampliado, escopo literal). (`MAC-33`)
4. WHEN ela digita a busca com o teclado virtual aberto THEN o campo e o resultado SHALL continuar
   visíveis (`useTecladoVirtual`), e o voltar do Android SHALL fechar o teclado antes de sair da tela.
   (`MAC-34`)
5. WHEN a copy é escrita THEN SHALL seguir o registro memorial: sem emoji, sem ponto de exclamação,
   sem "VIP/melhores/top", sem urgência ("atenção", "agir agora") e sem nomear o material que a pessoa
   confiou. As frases fixas moram num lugar só do app, e a ficha trata "a cliente" no feminino
   (padrão do repositório). (`MAC-35`)
6. WHEN a rota é `/clientes/:id` THEN a aba **Clientes** SHALL continuar marcada e `*` continuar
   levando a `/`; `abasSaoAsRotas` e o `CLAUDE.md` do app (tabela de rotas) SHALL ser atualizados
   no mesmo lote. (`MAC-36`)

---

### P2: Recusa e queda no meio de um percurso

**User Story**: Como Adri, quero que perder o acesso (ou trocar de conta) com a ficha aberta não deixe
dados da cliente na tela.

**Acceptance Criteria**:

1. WHEN o papel cai com a ficha aberta e a releitura volta `42501` THEN a recusa da `72` SHALL assumir
   e a ficha **não** SHALL permanecer desenhada (nem a do cache). (`MAC-37`)
2. WHEN a conta troca (A → B) ou ela sai THEN nada da conta anterior SHALL ser desenhado depois.
   (`MAC-38`)

## Edge Cases

| Caso | Comportamento |
| --- | --- |
| Cliente sem nome (`name` vazio ou `null`) | nome = e-mail, inicial = primeira letra do e-mail |
| Nome só de espaços | tratado como sem nome |
| Telefone `null`, vazio ou com menos de 10 dígitos | sem linha de telefone e sem WhatsApp; e-mail permanece |
| Telefone com `+55`, máscara ou espaços | `normalizeBrPhone` aceita; o mascarado desenha a partir do normalizado (como o `BlocoCliente`) |
| Convidada que depois criou conta | uma só linha (`NOT EXISTS` da `35`); a ficha traz os pedidos de antes **e** de depois (A10) |
| Duas contas com o mesmo e-mail | duas linhas (A18) |
| E-mail com `_`, `%` ou maiúsculas | o vínculo é exato e sem curinga, ignorando caixa (A10) |
| Cliente com 0 pedido (cadastro sem compra) | linha "Sem compra paga ainda", total `R$ 0`; ficha com "Nenhum pedido ainda." e ticket `—` |
| Cliente só com Pix expirado | **não** "Em aberto" (Q2b); aparece na lista com "Sem compra paga ainda" |
| Cliente com compra paga e outra em aberto | selo "Em aberto" e os dois pedidos na ficha |
| Mais de 1.000 clientes | janelas de 25 + contagem do servidor (`MAC-05`); nada de leitura da base inteira |
| Busca com `,`, `(`, `)`, `%`, `_` ou `\` | vale como texto (`MAC-06`) |
| Busca só de dígitos curtos (ex.: "5") | acha por nome/e-mail/telefone como substring; sem mínimo imposto |
| Toque duplo numa linha | uma navegação |
| Voltar da ficha para a lista | mesmo recorte (URL), mesma busca e mesma posição |
| Ficha aberta por link direto / F5 | relê pela rede; a lista é refeita ao voltar |
| `:id` malformado | "Não encontrei esta cliente." sem ir à rede |
| Pessoa anonimizada | como a view devolve (A16) |
| Cliente apagada enquanto a ficha está aberta | a releitura devolve vazio e a tela diz "Não encontrei esta cliente." |
| `lido_em` | o "há N dias" de toda linha usa o `lido_em` da RPC, não o relógio do aparelho |
| `last_activity_at` nulo em muitas linhas (cadastros sem compra) | vão ao fim, em ordem estável por `id`; o cursor trata o nulo (decisão de Design, provada por probe) |
| Resposta antiga chegando depois da nova | descartada (chave de consulta; geração) |
| Sem rede / rede que volta | `MAC-12`/`MAC-13` |
| Conta sem papel | `MAC-11` |

## Implicit-requirement dimensions (sweep)

| Dimensão | Onde está |
| --- | --- |
| Input validation & bounds | a busca e seus caracteres (`MAC-06`); o `:id` (`MAC-14`); o telefone (`MAC-17`); o vocabulário de `?recorte=` (`MAC-07`); a janela de 25/20 (A17) |
| Failure / partial-failure | falha da lista, da página seguinte, dos pedidos e dos itens, cada uma onde acontece (`MAC-12`, `MAC-18`, `MAC-22`); a ficha sobrevive à falha de um bloco |
| Idempotency / retry / dedup | `id` repetido descartado (`MAC-05`); toque duplo (Edge Cases); "Tentar de novo" relê uma vez; só leitura — nada a repetir |
| Auth boundaries & rate limits | `lerComPapel` e a recusa (`MAC-11`, `MAC-37`); RLS que devolve a linha da própria cliente (A4); chave de serviço nunca (`chaveDeServidorForaDoNavegador`); sem limite de taxa (leitura por toque) |
| Concurrency / ordering | cursor estável com empates e nulos (`MAC-05`); resposta velha descartada; releitura por foco/puxar; ordem da decisão da RPC e da consulta (E2 da `74`) |
| Data lifecycle / expiry | nada guardado no aparelho (`MAC-28`); cache limpo na troca de conta (`MAC-38`); o service worker não guarda dado (`MAC-29`); sem fila offline |
| Observability | N/A além do que existe — nenhuma telemetria no app; **proibido** logar dado da cliente (`MAC-28`) |
| External-dependency failure | Supabase (`MAC-12`); o WhatsApp é só um link (`MAC-17`) |
| State-transition integrity | N/A — a feature é só leitura (`MAC-30`); a única regra com "estado" é a de "em aberto" (Q2b), com dono em `core` e cópia SQL guardada (`MAC-23`/`MAC-24`) |
| Persistência/estado | recorte na URL, busca em memória, rolagem restaurada, cache do React Query (`MAC-07`, `MAC-14`, `MAC-34`) |
| Paginação > 1.000 | `MAC-05`, `MAC-04`, `MAC-18` |
| Vazios/erros/offline | `MAC-10`, `MAC-12`, `MAC-13` |
| Fonte grande / motion-reduce / alvos | `MAC-31`..`MAC-33` |
| Tom memorial | `MAC-35` e a lista *Out of Scope* (ranking, material) |
| Privacidade do telefone | `MAC-28`, `MAC-29`, `MAC-17` |

---

## Requirement Traceability

| ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MAC-01..10 | P1: A lista de clientes | Design/Tasks | Pending |
| MAC-11..13 | P1: Quem pode ler, e a falha | Design/Tasks | Pending |
| MAC-14..22 | P1: A ficha da cliente | Design/Tasks | Pending |
| MAC-23..27 | P1: As regras em `core`, e os guardas | Design/Tasks | Pending |
| MAC-28..30 | P1: Privacidade | Design/Tasks | Pending |
| MAC-31..36 | P1: A tela no celular | Design/Tasks | Pending |
| MAC-37..38 | P2: Recusa e troca de conta | Design/Tasks | Pending |

**Coverage:** 38 total, 38 mapped to tasks (`tasks.md`, tabela *Requisito → Task*).

> **Renumeração do rascunho**: `MAC-01` (cada cliente uma vez) → `MAC-01`; `MAC-02` (recorte filtra) →
> `MAC-08`/`MAC-09`, com o predicado de "aberto" **corrigido** (Q2b); `MAC-03` (WhatsApp) →
> `MAC-17`, trocando `whatsappHref` por `whatsappChatUrl` (A13); `MAC-04` (pedido abre o detalhe da
> `74`) → `MAC-20`.

## Reuso do que a `72`, `73`, `74` e `75` deixaram

| Já existe | Como a `76` usa |
| --- | --- |
| `lerComPapel` (`entities/order/api`, `AD-058`) | sobe para `shared/api` (A5); lista e ficha a usam |
| `useRecusaDePapel`, `retryUnlessDenied`, `isAccessDenied` (`core/hooks`) | a vigia da recusa e o `retry` das duas leituras |
| `pedidosHref` / `/pedidos/:id` | o toque no pedido da ficha (`MAC-20`); o molde de `clientesHref` |
| `SituacaoDoPedido`, `Selo`, `orderSituation(…, 'atelie')` | situação do pedido na ficha; selo "Em aberto" |
| `PullToRefresh`, `useRolagemRestaurada`, `useTermoDaEntrada`, `useTecladoVirtual`, `useDebounce` | puxar, posição, busca em memória, teclado, 300 ms |
| `formatOrderNumber`, `formatPriceWhole`, `maskPhone`, `normalizeBrPhone`, `purchaseOrdinalLabel` (`core`) | números, dinheiro, telefone |
| `shared/config/whatsapp.ts` (cores) e `LembreteDoEnvio` como molde do botão | "Conversar no WhatsApp" |
| `buildCustomerSearchCondition`, `CUSTOMER_VIEWS`, `pageRange`, `readAllPages` (painel/`core`) | sobem para `core/customers` byte a byte (A14, `MAC-23`/`MAC-25`) |
| `clientReal.ts` e `fakeSupabase.ts` | provas pelo `<App />` real sobre o supabase-js real, com `tabelas` por view |
| `trocaDeContaLimpaCache`, `rotasSobGuarda`, `abasSaoAsRotas` | guardas existentes que a feature estende |
| **Não reusa** `whatsappHref` (loja) | não é alcançável do app; ver A13 |

## Success Criteria

- [ ] O percurso Início → Pedidos → pedido → "Ver cliente" → ficha → pedido dela → voltar funciona no
      banco local, sem rolagem horizontal, em 390×844 (e 360/412, fonte 130 % e 200 %).
- [ ] A lista, com 48 pessoas no banco local, tem 48 `id` distintos nas janelas somadas; a contagem de
      cada chip bate com `select count(*) from customer_list where <predicado>` (probe) e o selo "Em
      aberto" aparece nas mesmas linhas do chip.
- [ ] Para toda pessoa do banco local, os pedidos listados na ficha = `orders_total` de `customer_list`
      (probe), inclusive a convidada e a que tem `_` no e-mail.
- [ ] Uma conta sem papel admin, com pedidos próprios, não vê nenhuma cliente — contra o supabase-js
      **real** e o banco local, na lista e na ficha.
- [ ] Nenhum dado da cliente em URL, `history.state`, armazenamento ou console (varredura em navegador
      + guarda); nenhum `select` com `cpf`, `material_kinds` ou nota.
- [ ] Suíte do painel fecha verde **sem asserção tocada**; loja, core, functions e catalog-import sem
      regressão contra a baseline medida na abertura; tipos 0 nos apps; lint do app novo 0/0;
      `packages/core/src/payment/**` sem uma linha alterada.
- [ ] A migration de `orders_open` passa pelo probe SQL local e é guardada byte a byte; ordem de
      publicação **migration → bundle**.

## Portão de fechamento

1. [x] **Q1** (notas: nenhum), **Q2b** (pago e em andamento), **Q3** (coluna `orders_open` por
       migration aditiva, predicado em `core` com cópia SQL guardada), **A8** (ordem por atividade e
       última compra paga) e **A13** (`whatsappChatUrl` em `core`) respondidas pelo validador
       independente em 2026-10-24 (`AD-060`, `context.md`). Nenhuma pendência do usuário.
2. [ ] Validador independente (autor ≠ verificador) relê esta spec contra o código e o banco e
       devolve PASS, ou os bloqueantes.
3. [x] Baseline de entrada **medida na abertura do Design, com a árvore parada**, um workspace por
       vez (`CLAUDE.md` raiz), e registrada em `baseline.md` (16371 em 818; ver lá a divergência contra o `CLAUDE.md`).
4. [ ] Design aprovado antes de qualquer código (`design.md`), com o cursor da lista (nulos e empates)
       provado por probe e a decisão de mover `lerComPapel` para `shared/api` registrada.
