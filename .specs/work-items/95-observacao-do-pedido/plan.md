# 95 · Observação do pedido, só para quem administra

Costura de 2026-11-03. Sem PRD — improvement sem PRD.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Convenção de cada repositório: o arquivo de instruções dele.

## Diagnóstico

Passa a existir uma **observação do pedido**: um texto livre, escrito e lido só por quem administra a loja,
em todo pedido — o da loja e o montado pelo painel. Ela é escrita na montagem (feature 89), editável na
página do pedido em qualquer status, impressa na folha de separação e mostrada (só leitura) no app do
ateliê. A entrada é sem PRD por decisão do usuário ("Criar com fluxo rápido apenas com plano", 2026-11-03),
com as quatro decisões de produto já dadas no pedido (`item.md`).

Por que **não** pode ser coluna de `orders`: a policy `users read own orders` entrega a linha inteira à
cliente (`supabase/migrations/20260414121021_305804ba-a826-4a90-9d43-6c78231e94d7.sql:204`); a loja lê
`select('*, order_items(*)')` (`apps/store/src/entities/order/api/useOrder.ts:93-94`,
`useOrders.ts:60-61,75-76`); `get-order` devolve `*` menos três chaves, por lista de exclusão
(`supabase/functions/checkout/handlers.ts:671-714`); o Realtime de `orders` chega à dona
(`apps/store/src/features/order-payment/model/usePixPayment.ts:146`); e a view `order_list` é
`security_invoker` (`supabase/migrations/20261028120000_82-envelope-da-cliente.sql:84-104`). Os dois textos
que já existem não servem: `orders.notes` é o **Recado da cliente** (`apps/backoffice/src/pages/admin/AdminOrderPage.tsx:436-446`)
e `order_notes` é a **Nota interna**, histórico só de acréscimo (`apps/backoffice/src/entities/order/api/useAdminOrders.ts:256-259`).

Por que a proposta precisa de migration nova: `save_order_proposal` compara `to_jsonb(v_atual) - v_fora`
(`supabase/migrations/20261103120000_89-pedido-montado.sql:231-234`, `:327-334`) — uma coluna nova fora de
`v_fora` faria todo save e todo `renew` (`supabase/functions/order-proposals/handlers.ts:869-888`) parecerem
mudança, subindo `version`; e recusa proposta fora de `open` (`:268-273`). A migration da 89 está na
`origin/master` (aplicada em produção, imutável — `AD-017`).

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local (`.specs/evals/` não existe).

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| ----------------------- | ---- | -------------- | -------- |
| `.specs/features/89-pedido-montado-pelo-painel/spec.md` | spec da feature 89 | a proposta vive em `order_proposals` (RLS sem policy, só service role, `SEG-05`); o pedido nasce em `create_order_from_proposal` chamada pela function `checkout`; `version` sobe a cada edição de conteúdo e muda o que o link mostra | C-01, C-02 |
| `supabase/migrations/20261103120000_89-pedido-montado.sql` | migration | `v_fora` (`:231-234`), comparação de conteúdo (`:327-334`), recusa `not_open`/`expired` (`:268-273`), `insert` em `orders` (`:471-501`), tabelas sem policy (`:152-172`) | C-01, C-02, C-04 |

## Comportamentos

| #    | O que precisa passar a ser verdade |
| ---- | ---------------------------------- |
| C-01 | A montagem do pedido no Backoffice tem o campo **Observação** (textarea, só para quem administra), gravado com a proposta. Editar a observação não muda a `version` da proposta nem o que o link da cliente mostra, e a observação pode ser editada na página da proposta em qualquer status |
| C-02 | Quando a proposta vira pedido, a observação passa ao pedido, na mesma transação. Dali em diante a dona é a observação do pedido: a página da proposta concluída mostra e edita a do pedido |
| C-03 | A página do pedido no Backoffice mostra e edita a observação de **todo** pedido (loja e montado), em qualquer status, inclusive concluído e cancelado — num card distinto do Recado da cliente e da Nota interna. Uma leitura que falha não se apresenta como "sem observação" |
| C-04 | A cliente nunca recebe a observação: nem na tela da loja, nem em resposta de rede (PostgREST com a sessão dela, `get-order`, `get-proposal`, Realtime, e-mails) |
| C-05 | A folha de separação de um pedido (aberta na página dele) imprime a observação ao lado do Recado da cliente |
| C-06 | O app do ateliê mostra a observação no detalhe do pedido e permite cadastrá-la e editá-la; a falha da leitura não derruba os outros blocos, a conta sem papel não vê o texto nem grava, e a regra da escrita é a mesma do Backoffice (um dono em `core`) |
| C-07 | O teto de caracteres é uma regra só, em `packages/core`, aplicada igual na tela, na function e no `check` do banco |

## Fora do escopo

- Histórico de edições da observação (fica só o valor atual, com quem e quando editou por último — N2).
- A observação na folha de separação **em lote** (N6: "Desconsiderar esse item. Não precisa ter"). O lote continua como está, sem itens e sem endereço (`AdminOrdersPage.tsx:662,863`).
- A observação no export CSV de pedidos (N4).
- Duplicar uma proposta não copia a observação (N3) — é comportamento, coberto em C-01, não trabalho a mais.
- Recado da cliente e Nota interna: não mudam.

## Design

Fontes: nenhuma. Pergunta feita no chat em 2026-11-03 — "A observação do pedido aparece em quatro telas
[…]. Não há protótipo para ela. Como seguir com o desenho?" — resposta: **"Seguir sem design
(Recomendado)"**: o campo segue os padrões que essas telas já têm.

- **Montagem** (`AdminProposalBuilderPage`): seção "Observação" na coluna principal, molde de
  `ManualDiscountField.tsx:70-93` — textarea com `CharCounter` e a linha "só você vê".
- **Página da proposta** (`AdminProposalPage`): card "Observação" com o próprio Salvar; concluída, o card é
  o do pedido (C-02).
- **Página do pedido** (`AdminOrderPage`): card "Observação" logo depois do "Recado da cliente"
  (`:436-446`), com borda/rotulagem distinta, textarea, `CharCounter`, Salvar por `gesto.rodar` e
  "Atualizada em <data> por <nome>"; vazio, o card aparece com o campo vazio (é o lugar de escrever).
  Estados: carregando (esqueleto), erro de leitura (frase + "Tentar de novo", sem campo editável).
- **Folha de separação** (só a de um pedido): bloco "Observação" escapado, junto do `.recado` (`pickSlip.ts:104-109`).
- **App**: bloco "Observação" no detalhe (molde de `BlocoDoDetalhe.tsx`) com o texto e "Atualizada em
  <data> por <nome>"; um botão "Adicionar observação" (sem texto) ou "Editar" abre uma folha (molde da
  folha de rastreio da feature 75) com textarea, contador e Salvar, alvo ≥ 44px, trava durante a gravação,
  erro em módulo como as ações do pedido.

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store

- **Instruções** — `CLAUDE.md` (raiz) › O "defeito 01", Convenções, Os guardas, Baselines, CI e deploy, o
  bloco de Alias de import sobre `core` alcançável pelo Deno; `apps/backoffice/CLAUDE.md` › Molde dos
  formulários, O movimento do painel, Pedidos e a fila de material, feature 88, As duas listagens de
  Vendas, Montar pedido (89); `apps/mobile-adm/CLAUDE.md` › Pedidos (74), O envelope (82), Os guardas,
  Testes; `packages/core/CLAUDE.md` › Pureza, Os módulos, `order-actions`, `proposals`, Convenções de
  tipo; `supabase/CLAUDE.md` › Migrations, RLS, `checkout`, `order-proposals`.
- **Recorte** — C-01 a C-07.
- **O que já serve**
  - Tabelas da proposta sem policy e com `revoke` dos papéis de cliente — `20261103120000_89-pedido-montado.sql:152-172`.
  - `checkout/proposal.ts › COLUNAS` explícita, sem `*` — `supabase/functions/checkout/proposal.ts:68-95`; o teste que recusa motivo interno e `*` — `checkout/__tests__/proposal.test.ts:166,177`.
  - `send-notification` lê `orders` por colunas nomeadas — `dispatch.ts:159`, `handlers.ts:268`.
  - Molde de tabela só de admin com chave = dono e `cascade` — `20261022150000_80-fornecedor-da-peca.sql`; policy `has_role` em `using`+`with check`, `to authenticated`, `revoke anon` — `20260919120000_52-entrega-de-email-comprovada.sql:79-84`.
  - `CharCounter` — `apps/backoffice/src/shared/ui/CharCounter.tsx:30`; já usado fora de Configurações em `ManualDiscountField.tsx:76`.
  - `useAdminOrder` lê relações em paralelo, cada uma degradando sozinha — `entities/order/api/useAdminOrder.ts:189-206`, `:226-236`; estado de falha por relação, molde `emailsError` `:107`.
  - A folha unitária recebe `{ ...order, items }` — `AdminOrderPage.tsx:348`.
  - `lerComPapel` envolve as leituras do detalhe no app — `apps/mobile-adm/src/entities/order/api/usePedido.ts:75-93`; os guardas aceitam leitura nova ali — `leituraSoComPapel.test.ts:28`, `escritaSoPelaPorta.test.ts:47`.
  - Teto com dono em `core` — `packages/core/src/proposals/limits.ts:12`, recusa `string | null` em `proposals/pricing.ts:59-65`.
- **O que muda**
  - `save_order_proposal` (recriada em migration nova): `'admin_note'` em `v_fora`; grava a nota no `insert` ao criar; o `update` de conteúdo não a toca — `20261103120000_89-pedido-montado.sql:211-416`.
  - `create_order_from_proposal` (recriada): depois do `insert` em `orders` (`:471-501`), `insert` em `order_admin_notes` quando `v_prop.admin_note` não é nulo; assinatura igual.
  - Function `order-proposals`: `admin_note` em `COLUNAS_DA_PROPOSTA` (`handlers.ts:106-140`); `save` aceita e valida pela regra de `core` (`:646-758`, `p` em `:713-725`); ação nova `note` em `route` (`:996-1033`), frase de ação desconhecida (`:1028`).
  - `proposalsApi.ts:81-117,133-153` e `model/draft.ts:96-102,244-275,286-331`: `adminNote` no rascunho, `admin_note` no payload (igualdade exata de chaves em `draft.test.ts` reescrita), cópia em `draftFromProposal`.
  - `AdminProposalBuilderPage.tsx:201-231`: a seção Observação. `AdminProposalPage.tsx:177-264`: o card com Salvar; concluída (`p.order_id`), o card do pedido.
  - `AdminOrderPage.tsx:433-446`: monta o card do slice novo `features/order-admin-note` (hook `useOrderAdminNote` em React Query com chave própria + `OrderAdminNoteCard({ orderId })`, autossuficiente, reutilizado pela página da proposta concluída); `:348`: a nota na folha unitária. `useAdminOrder` não muda (achado da auditoria da fila: um card escrito dentro da página não teria como ser reutilizado sem import entre páginas). Autoria por `updated_by_name` gravado no momento (o painel não lê `auth.users`).
  - `pickSlip.ts:33-42,104-109`: `admin_note` em `PickSlipOrder` e o bloco escapado (só a folha de um pedido; o lote não muda).
  - App: `usePedido.ts:76-92` (sexta leitura dentro do `lerComPapel`, como `Bloco<…>`), `model/linha.ts:28-40,119-136` (constante de colunas), um bloco em `widgets/order-detail`; a escrita entra pela porta única `features/order-actions/api/gravarAcao.ts` (o client só como valor passado, `escritaSoPelaPorta.test.ts:44-52`), que confere o papel (`conferirPapel`) e chama o dono em `core`.
  - Guarda `pedidoMontadoSchema.test.ts:33-36,553-558`: a vigente das duas RPCs passa a ser a da migration nova.
- **O que nasce**
  - Migration `supabase/migrations/<prefixo > 20261107120000>_95-observacao-do-pedido.sql`: tabela `order_admin_notes` (`order_id` PK → `orders` `on delete cascade`, `note text not null` com `check` pelo teto de `core`, `updated_by` → `auth.users` `on delete set null`, `updated_at`; RLS, policy `has_role` no `using` e no `with check` `to authenticated`, `revoke all … from anon`, nenhum `grant` a `anon`); coluna `order_proposals.admin_note` com o mesmo `check`; as duas RPCs recriadas.
  - `packages/core/src/orders/adminNote.ts` (folha sem import, `.ts` explícito): `ORDER_ADMIN_NOTE_MAX`, `normalizeAdminNote` e `adminNoteRefusal(texto): string | null`, exportados pelo barril `orders/index.ts`.
  - **Dono único da escrita** da nota do pedido: `packages/core/src/order-actions/adminNote.ts` (client injetado, `.ts` explícito, molde de `order-actions/tracking.ts`): upsert por `order_id` com `updated_by`, vazio apaga a linha, efeito conferido por `.select(...)`, desfecho por literal de string. O painel (hook em `entities/order/api/`) e o app (porta `gravarAcao.ts`) delegam a ele; um guarda recusa escrita em `order_admin_notes` fora dele (molde `pedidoGravadoSoPeloDono`).
  - `DbOrderAdminNote` em `packages/supabase/src/types/index.ts` (ao lado de `DbOrderNote`, `:396`).
  - Guardas: `observacaoDoPedidoSchema.test.ts` (forma da migration, teto **importado** de `core`, as RPCs recriadas iguais à 89 fora do necessário) e `observacaoForaDaLoja.test.ts` (o nome da tabela e da coluna fora de `apps/store/**` e das functions que servem a cliente; `order-proposals` na allowlist).
- **Exemplares** — tabela só de admin: `20261022150000_80-fornecedor-da-peca.sql`; recriar RPC já aplicada: `20261027120000_inicio-fotos-das-joias.sql` + `fotoDasJoiasSchema.test.ts`; guarda de schema: `fornecedorSchema.test.ts`, `pedidoMontadoSchema.test.ts`; guarda fora da loja: `fornecedorForaDaLoja.test.ts`; teto em `core`: `proposals/limits.ts:12` + `proposals/pricing.ts:59-65`; ação nova na function: `order-proposals/handlers.ts › cancel` (`:917-952`); campo interno com contador: `ManualDiscountField.tsx:70-93`; card e gravação no pedido: `AdminOrderPage.tsx:436-446` e `anotar` `:247-258`; dono da escrita com client injetado: `packages/core/src/order-actions/tracking.ts` + `useAdminOrders.delega.test.ts`; porta de escrita do app: `apps/mobile-adm/src/features/order-actions/api/gravarAcao.ts` + `acoesComClientReal.test.tsx`; folha do app: `features/order-actions/ui/FolhaDoRastreio.tsx`; bloco no app: `widgets/order-detail/ui/BlocoDoDetalhe.tsx` + `Bloco<T>` de `linha.ts:117`.
- **Obrigações transversais** — migration aplicada é imutável e nova vai **só ao local** (54442), com prefixo único maior que `20261107120000`; RLS no molde de `order_notes`; módulo de `core` que a function importa com `.ts` explícito, `import type` incluso; veredito `string | null` (`strictNullChecks: false`); tipo à mão é afirmação — gravação provada por probe HTTP (`AD-012`); igualdade exata de chaves do payload; gravar não pisca (`reload('revalidar')`, `ActionButton`, foco por `shared/lib/foco.ts`); mobile primeiro (390×844, sem rolagem horizontal, alvo ≥ 44px, fonte 130/200%); movimento com par `motion-reduce:`; no app, leitura só por `lerComPapel` e nomes que não casem os termos de `semDadoSensivelDeClienteNoApp.test.ts:57`; `brandScan`; "descreva a forma proibida, não a escreva"; gate "sem regressão" de lint/tipos/testes por workspace (`CLAUDE.md` › Baselines).
- **Testes** — decisão: **ambos** (ajustar e criar).
  - `core`: teto aceita até o limite e recusa acima; conta aparado; vazio vira "sem observação"; `denoReach` da folha.
  - `order-proposals/__tests__/handlers.test.ts`: `save` repassa e recusa acima do teto antes do RPC; ação `note` grava em aberta, expirada e cancelada sem subir versão e sem evento `edited`, e recusa em concluída (T3: a dona passa a ser a do pedido); conta sem papel recusada; `get` devolve a nota.
  - `checkout/__tests__/proposal.test.ts:166,177`: `get-proposal` nunca devolve `admin_note`.
  - Painel: `draft.test.ts` (igualdade de chaves), `AdminProposalBuilderPage.test.tsx`, `AdminProposalPage.test.tsx`, `AdminOrderPage*.test.tsx` (três textos distintos; edita em concluído e cancelado; falha de leitura), os testes do slice `features/order-admin-note`, `pickSlip.test.ts` (folha de um pedido, escapada).
  - `core/order-actions`: o dono grava, apaga com vazio, recusa acima do teto antes da rede, zero linhas vira falha (RLS), `purity.test.ts` cobrindo o arquivo novo.
  - App: `PedidoPage.test.tsx` (mostra; falha isolada), a folha de edição (cadastra, edita, trava, erro), `pedidosComClientReal.test.tsx` / `acoesComClientReal.test.tsx` (403 `42501` sem o texto e sem confirmação de gravação); `escritaSoPelaPorta` continua passando; fixturas do `fakeSupabase` com a tabela nova (ele lança para tabela não configurada).
  - Guardas novos na suíte da loja; `pedidoMontadoSchema` apontando a vigente nova.
  - Probes no banco local (transação desfeita): RLS (anon e cliente dona não leem nem escrevem; admin lê e faz upsert); a cliente dona, por PostgREST, não vê a nota em `orders` nem em `order_list`; `save` só de conteúdo não sobe versão e não apaga a nota; `renew` não apaga; `create_order_from_proposal` copia, e sem nota não cria linha; apagar pedido apaga a nota; apagar admin anula `updated_by`; probe HTTP da gravação pelo painel; `02-lista` do app.
  - Navegador: os cards em 390×844 a 100/130/200 % e em 1440.

## Fronteira entre repositórios

`nada` — um repositório só.

## Cobertura

| # | Reivindicado por |
|---|---|
| C-01 | `.` — `order-proposals`, `save_order_proposal`, `features/order-proposal`, `AdminProposal*Page` |
| C-02 | `.` — `create_order_from_proposal`, `AdminProposalPage` |
| C-03 | `.` — `order_admin_notes`, `features/order-admin-note`, `AdminOrderPage`, `core/order-actions/adminNote.ts` |
| C-04 | `.` — tabela à parte com RLS, `checkout/proposal.ts`, guarda fora da loja, probes |
| C-05 | `.` — `pick-slip` (folha de um pedido) |
| C-06 | `.` — `usePedido`, `linha.ts`, `widgets/order-detail`, `gravarAcao.ts`, `core/order-actions/adminNote.ts` |
| C-07 | `.` — `core/orders/adminNote.ts`, `check` da migration, `CharCounter` |

## Perguntas e respostas

Por preferência registrada do usuário, os itens **técnicos** foram ratificados pela recomendação e só os
de negócio vão à página.

| # | A pergunta | A recomendação (premissa do plano) | A resposta |
|---|---|---|---|
| T1 | Onde guardar a observação do pedido sem chegar à cliente? | tabela própria `order_admin_notes` (RLS `has_role`), e `order_proposals.admin_note` até a conversão | ratificada pela recomendação (técnico) |
| T2 | Como editar a observação da proposta sem subir `version` e em qualquer status? | `'admin_note'` em `v_fora`; gravada no `insert` ao criar; edição pela ação nova `note` da `order-proposals` (`update` direto pela service role) | ratificada pela recomendação (técnico) |
| T3 | Depois da conversão, quem é o dono e o que acontece com a coluna da proposta? | o dono é `order_admin_notes`; a página da proposta concluída renderiza o card do pedido (leitura e escrita direto pelo painel, RLS `has_role`); a coluna da proposta fica congelada, não é limpa | ratificada pela recomendação (técnico) |
| T4 | A escrita da nota do pedido precisa de dono em `core/order-actions`? | ~~não, só o painel escreve~~ — **corrigida pela resposta de N5**: o app também grava, então a escrita tem dono único em `core/order-actions/adminNote.ts` (client injetado), chamado pelo painel e pela porta `gravarAcao` do app, com guarda de escrita só pelo dono; a regra (teto, normalização) em `core/orders/adminNote.ts` | corrigida pela N5 |
| T5 | Contar aparado ou cru, e como? | aparado nos dois lados: `char_length(btrim(note))` no banco e contagem por ponto de código do texto aparado em `core`; vazio apaga a linha | ratificada pela recomendação (técnico) |
| T6 | Onde a folha em lote busca a nota? | ~~leitura só ao acionar~~ — **sem objeto pela resposta de N6**: o lote não leva a observação; e nunca em `order_list` (`security_invoker`) | sem objeto (N6) |
| N1 | Qual o teto de caracteres da observação? | 1000 caracteres | ratificada no gate |
| N2 | A observação mostra quem editou e quando? | sim: "Atualizada em <data> por <nome>" debaixo do campo, só o último | ratificada no gate ("Sim, só a última edição") |
| N3 | Duplicar uma proposta copia a observação? | não: a observação é daquele pedido (o desconto e o motivo continuam sendo copiados) | ratificada no gate |
| N4 | A observação entra no export CSV de pedidos? | não, neste Work Item (o export hoje nem tem o Recado) | ratificada no gate |
| N5 | No app do ateliê, só leitura? | sim, só leitura; editar fica no Backoffice | "opção para editar e cadastrar" — o app mostra, cadastra e edita (C-06 e T4 corrigidos) |
| N6 | Na folha em lote, que hoje sai sem itens e sem endereço, a observação entra mesmo assim? | sim: a observação entra no lote | "Desconsiderar esse item. Não precisa ter" — o lote fica sem a observação (C-05 e Fora do escopo corrigidos) |

## Riscos

- Recriar `save_order_proposal` e `create_order_from_proposal` arrisca divergir da 89 em algo além da nota — contido pelo guarda que prova o resto igual (molde `fotoDasJoiasSchema`).
- `order-proposals` não sobe no edge runtime local (`supabase/CLAUDE.md` › order-proposals): a ação nova é provada por teste de unidade; a execução local pede a mesma troca de import da 89.
- O `fakeSupabase` do app lança para tabela não configurada: as fixturas de detalhe do app inteiras precisam aprender `order_admin_notes`.
- A ordem de publicação é **migration → functions (`order-proposals`, `checkout`) → bundles**; o push com a migration aplica em produção e exige pergunta antes.
- O guarda "fora da loja" varrendo `supabase/functions` precisa da allowlist da `order-proposals`, senão nasce reprovando.
- A escrita no app passa pela porta única: o client continua importado por exatamente os arquivos que `escritaSoPelaPorta` aceita, e a recusa de papel da escrita segue a das ações da feature 75 (provada sobre o supabase-js real).

## Não resolvido

Nada — N1..N6 respondidas no gate das perguntas do plano (2026-11-04).
