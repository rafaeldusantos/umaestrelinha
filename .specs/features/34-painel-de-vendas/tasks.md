# Tasks — Painel de vendas (Pedidos e Clientes)

Cobre [`spec.md`](./spec.md) e [`design.md`](./design.md). **18 tarefas em 6 fases.**

**Regra de commit deste repositório** (sobrepõe o padrão da Skill, `BL-012`): **não** há commit por
task. Implementa-se tudo, e no fim saem os commits completos da implementação de uma vez.

**Gate de cada task**: a suíte do workspace tocado passa, **por workspace e com exit code capturado**
(`pnpm test | tail` esconde a falha — o código que sai do pipe é o do `tail`). Baseline a bater:

| Workspace | Baseline |
| --- | --- |
| store | 1903 / 130 |
| backoffice | 1556 / 97 |
| core | 1363 / 52 |
| functions | 337 / 6 |
| catalog-import | 335 / 16 |
| **total** | **5494 / 301** |

Tipos `0 · 0 · 0` (`npx tsc --noEmit -p apps/<app>/tsconfig.app.json` — note o `tsconfig.app.json`) ·
Lint 30 err / 8 warn · `git diff --name-only` sem nada em `packages/core/src/payment/`.

**Única queda de baseline autorizada**: os 12 casos de `OrderDetailDialog.test.tsx`, reescritos em
`AdminOrderPage.test.tsx` em maior número (T13). Fora dessa, queda é deleção silenciosa.

---

## Fase 1 — A cor que não existe

### T01 — Os dois tokens que faltavam, e a correção de contraste

- `packages/ui/src/styles.css`: `--estrelinha-admin-amber: #B45309` e
  `--estrelinha-admin-emerald: #047857` no bloco `:root` **e** no bloco dark.
- `--estrelinha-admin-text-muted`: `#9B8EC4` → `#726591` (light). O dark (`#7B6FA8`) é medido e
  ajustado se não passar sobre `--estrelinha-admin-card` do dark.
- `packages/ui/tailwind.preset.ts`: `amber` e `emerald` no mapa `estrelinha-admin`, lendo as
  variáveis — **não** hex literal, senão o dark não acompanha.
- **Verificação**: `MaterialStatusBadge` renderiza os quatro estados com fundo e borda, conferido em
  navegador real. Screenshot no `validation.md`.
- **Requisitos**: `PED-01`, `PED-03`

### T02 — `adminTokens.test.ts` — o guarda que impede o terceiro erro igual

- `apps/backoffice/src/shared/lib/__tests__/adminTokens.test.ts`, molde de `palette.test.ts`.
- Extrai o conjunto de tokens de **`tailwind.preset.ts` e `styles.css` do disco**; varre
  `apps/backoffice/src/**/*.{ts,tsx}` com `/estrelinha-admin-[a-z-]+/g`; reprova a que não existir.
- **Âncora dupla**: `expect(arquivosLidos).toBeGreaterThan(N)` **e**
  `expect(classesEncontradas).toBeGreaterThan(M)`. Sem elas um caminho errado varre zero e passa.
- **Sensor embutido**: um fixture com `estrelinha-admin-inexistente` prova que a régua reprova.
- Diretórios escritos **literalmente** — a régua nunca é o objeto medido (lição do `brandScan`).
- Segundo caso no arquivo: contraste ≥ 4,5:1 de `text`, `text-secondary` e `text-muted` sobre `card`
  e `bg`, em light e dark.
- **Verificação**: reverter T01 num stash faz este teste reprovar em 2 classes.
- **Requisitos**: `PED-02`, `PED-03`, `TST-04`

### T03 — `queueAge` em `packages/core/src/material/aging.ts`

- `queueAge(since: string | Date, now = new Date())` → `{ days, tier: 'fresh' | 'warm' | 'stale' }`.
- `STALE_AFTER_DAYS = 8` mora aqui, com o comentário do porquê (ciclo do PAC nacional).
- Puro. Nenhum import de React, Supabase ou Deno — asserido por `purity.test.ts` no molde de
  `core/shopping`.
- Testes: fronteiras exatas (3/4, 7/8), fuso, data futura, `since` nulo.
- **Requisitos**: `PED-13`

---

## Fase 2 — Banco

### T04 — A migration da feature

- `supabase/migrations/<ts>_34-painel-de-vendas.sql`, **uma só** e **nova** (`AD-017`).
- `customer_notes` + RLS + policy `has_role('admin')`, molde exato de `order_notes`.
- `customer_stats` como **view** com `security_invoker`: `orders_paid`, `total_spent`, `avg_ticket`,
  `first_order_at`, `last_order_at`, `material_kinds`. Só `payment_status = 'approved'` entra no
  dinheiro.
- Índices: `orders(material_status, created_at)`, `orders(customer_email)`,
  `orders(customer_id, payment_status)`.
- `anonymize_customer(p_customer_id uuid)` `security definer`, guardada por `has_role`, revogada de
  `anon`. Limpa `name`/`email`/`cpf`/`phone`, apaga `addresses`, zera `user_id`. **Preserva `orders`**.
- **Sem** `unique` em `customers.email` — motivo em *Out of Scope*.
- **Verificação**: `supabase db reset` local, depois **probe HTTP** (`AD-012`) provando insert em
  `customer_notes`, leitura de `customer_stats` como admin, `execute` negado a `anon` na RPC.
- **Requisitos**: `CLI-04`, `CLI-06`, `CLI-10`, `CLI-13`, `TST-06`

### T05 — Tipos alinhados ao que o banco tem

- `DbOrder.notes: string | null` — a coluna existe desde a migration inicial e nunca esteve no tipo.
- `DbCustomerStats`, `DbCustomerNote`, `DbAddress`.
- **Tipo escrito à mão é afirmação, não verificação** (`AD-012`): cada campo novo é conferido contra
  o `information_schema` do banco local, não contra a memória.
- **Requisitos**: `PED-11`, `CLI-09`

---

## Fase 3 — Listagem de pedidos

### T06 — `orderQuery.ts` + `useAdminOrderList` — tudo do servidor

- Molde de `productQuery.ts` / `useAdminProductList`: `filters`, `sort`, `page`, `pageSize`, `search`.
- `ORDER_VIEWS`: `Precisa de ação` (padrão) · `Tudo` · `Fila de material` · `A separar` ·
  `Em trânsito` · `Concluídos`.
- Busca com **debounce de 300 ms**, cobrindo `order_number`, `customer_name`, `customer_email`,
  `tracking_code`, `material_tracking_code`.
- `count: 'exact'` na listagem; contagens de aba por `head: true` (o servidor conta, o cliente não
  carrega linha) e **com os filtros ativos aplicados**, menos o eixo da própria aba.
- `error` exposto, nunca engolido.
- `fetchAllFiltered()` para o CSV.
- **Verificação**: teste de hook com client mockado, e um probe manual conferindo que a soma das abas
  bate com o total do filtro.
- **Requisitos**: `PED-04`, `PED-05`, `PED-07`, `PED-08`, `PED-09`, `PED-10`, `PED-14`, `PED-18`, `PED-20`

### T07 — `QueueAge`, `QueueTiles` e o `MaterialStatusBadge` corrigido

- `QueueAge` lê `queueAge` de `core/material` e pinta o degrau. Três degraus, um só com cor.
- `QueueTiles`: os quatro contadores clicáveis; o primeiro com o acento e a idade do mais antigo; o
  de Pix declarando que **não é fila**.
- `MaterialStatusBadge` passa a usar os tokens que agora existem.
- **Requisitos**: `PED-12`, `PED-13`

### T08 — `features/order-list` — colunas, chips, visões salvas

- `model/columns.ts` (`useColumnPrefs`, densidade, persistência em `estrelinha.admin.*`),
  `model/filterChips.ts`, `model/savedViews.ts`, `model/rowSummary.ts` — molde de `product-list`.
- `ui/FilterChips.tsx`: um chip por filtro ativo, com `×`.
- **Requisitos**: `PED-15`, `PED-19`

### T09 — Seleção em massa e as cinco ações de lote

- `OrderBulkBar` no molde de `BulkBar`. Seleção guarda a **linha** (`Map<string, AdminOrderRow>`).
- Selecionar a página **e** os N do filtro (`fetchAllFiltered`).
- Marcar material recebido · avançar status · folhas de separação · cobrar material · exportar CSV.
- **Cada transição é uma chamada de `set_material_status`.** Falha de uma **não** aborta as outras;
  o toast resume *"7 marcadas · 2 não estavam em estado que permite"*.
- Teto de 50 por lote, com aviso acima disso.
- **Requisitos**: `PED-16`, `PED-17`

### T10 — `AdminOrdersPage` reescrita

- Cabeçalho com o que cobra; tiles; visões; busca + filtros + colunas; chips; barra de seleção;
  tabela com ordenação e idade; rodapé com `rangeLabel` e tamanho de página.
- Nome do cliente vira link para `/admin/clientes/:id`, com a ordinal da compra ao lado.
- `formatRelativeDate` na coluna de data, absoluta no `title`.
- Faixa de erro no molde da de `AdminProductsPage`.
- **Verificação**: navegador real em **390 × 844 e 1440**, nesta ordem. `document.body.scrollWidth`
  igual à viewport no mobile.
- **Requisitos**: `PED-04`, `PED-08`, `PED-21`, `PED-22`, `PED-23`

### T11 — O CSV que exporta o filtro

- `exportOrdersCsv(rows)` passa a receber o resultado de `fetchAllFiltered`.
- Colunas novas: `payment_status`, `material_status`, `material_tracking_code`,
  `material_received_at`, `dias_parado` (de `queueAge`).
- Botão rotulado com o total.
- **Requisitos**: `PED-05`, `PED-06`

---

## Fase 4 — O pedido como rota

### T12 — `/admin/pedidos/:id`

- Rota em `App.tsx`, **abaixo** de `/admin/pedidos`, seguindo a ordem de `navGroups`
  (`navItems.test.ts` lê este arquivo do disco). **Não** entra em `navGroups`.
- `AdminOrderPage` com cabeçalho (trilha, selos, ações) + coluna principal e aside de 330.
- Blocos, nesta ordem: **material** → **próximo passo** → **itens** → **histórico**.
  Aside: cliente (com gasto e link para a ficha) → entrega → pagamento.
- `MelhorEnvioTab` migra para bloco **sem alteração interna**.
- Rastreio de entrada só no bloco de material; de saída só em entrega, cada um com rótulo de direção.
- `orders.notes` aparece como **recado da cliente**, visualmente distinto de nota interna.
- Cancelar declara em texto que **não** estorna e **não** repõe estoque.
- Apaga `OrderDetailDialog.tsx`.
- **Requisitos**: `PED-11`, `PED-24`, `PED-25`, `PED-26`, `PED-27`, `PED-29`, `PED-31`

### T13 — Histórico único e reenvio de e-mail

- `OrderHistory`: status + e-mails + notas num fluxo, filtrável por tipo. Campo de nota no topo.
- Cada evento de e-mail mostra se saiu; falha oferece **reenviar**, chamando `sendOrderEmail`.
- O envio continua contido: falha **nunca** reverte estado (`AD-008`).
- **Verificação**: `AdminOrderPage.test.tsx` cobre, em maior número, os 12 casos de
  `OrderDetailDialog.test.tsx` — é a queda de baseline autorizada.
- **Requisitos**: `PED-27`, `PED-28`, `TST-03`

### T14 — Folha de separação

- `features/pick-slip`: rota de impressão com itens, gravação, material esperado, endereço e o número
  do pedido. Lote gera uma folha por pedido no mesmo documento.
- Substitui `window.print()` na página.
- **Requisitos**: `PED-30`

---

## Fase 5 — Clientes

### T15 — `customerQuery.ts` + `useAdminCustomerList`

- Servidor: busca (nome, e-mail, telefone, CPF), filtros (material, última compra, conta/convidada),
  ordenação, `range` + `count: 'exact'`.
- Lê `customer_stats`. **Nunca** `select('*')` sem `range` — é o defeito que a tela tem hoje.
- Visões: Todas · Voltaram · Confiaram material · Compraram uma vez só · Cadastro sem compra ·
  **Possíveis duplicadas** (agrupada por e-mail).
- **Requisitos**: `CLI-01`, `CLI-02`, `CLI-05`, `CLI-07`, `CLI-14`

### T16 — `AdminClientsPage` reescrita

- Retrato da base (quatro tiles), visões, busca + filtros + colunas, tabela com Gastou / Ticket /
  Última compra / Material, rodapé com intervalo.
- O critério do dinheiro (`só pedidos pagos`) escrito **na tela**, não só na spec.
- Exportar CSV do filtro, mesma régua de T11.
- **Verificação**: 390 × 844 e 1440.
- **Requisitos**: `CLI-03`, `CLI-04`, `CLI-06`, `CLI-12`, `CLI-15`

### T17 — `/admin/clientes/:id` — a ficha

- Cabeçalho com selos (`Voltou N vezes`, `Confiou <materiais>`), ações de contato.
- Principal: pedidos (cada linha abre `/admin/pedidos/:id`, com o que segura o que está em aberto) e
  notas internas, declarando que a cliente nunca vê.
- Aside: resumo, contato e endereços (com **copiar** e o padrão marcado), privacidade.
- `AnonymizeDialog` escreve exatamente o que apaga e o que preserva, antes de perguntar.
- Apaga `CustomerDetailDialog.tsx`.
- **Requisitos**: `CLI-08`, `CLI-09`, `CLI-10`, `CLI-11`, `CLI-13`

---

## Fase 6 — Fecho

### T18 — Testes de página, baselines e documentação

- `AdminOrdersPage.test.tsx` (`TST-01`), `AdminClientsPage.test.tsx` (`TST-02`),
  `AdminOrderPage.test.tsx` (`TST-03`), `AdminClientPage.test.tsx`.
- **Payload de gravação em igualdade exata** para `customer_notes` e para a nota de pedido
  (`TST-05`) — é o que impede campo novo entrar na escrita sem alguém decidir.
- **Probe HTTP** contra o banco local provando `customer_notes`, `customer_stats` e
  `anonymize_customer` (`TST-06`). Inspeção de tipo não conta.
- Remedir os cinco workspaces **na hora**, por workspace, com exit code capturado. Baseline anotada
  de memória mente sem quebrar nada — foi o erro do fecho da `31`.
- Atualizar: `CLAUDE.md` da raiz (tabela de guardas ganha `adminTokens.test.ts`; baselines),
  `apps/backoffice/CLAUDE.md` (as duas telas novas, as rotas novas, a regra das duas remessas),
  `.specs/STATE.md` (handoff + decisões), `.specs/BACKLOG.md` (`BL-008` reduzida, não fechada).
- `validation.md` com evidência de navegador real em 390 e 1440 — as `22`, `28` e `32` não têm, e a
  dívida não deve crescer.

---

## Ordem de execução

T01 → T02 → T03 são independentes de tudo e destravam a cor.
T04 → T05 destravam Clientes e o recado da cliente.
T06 → T07 → T08 → T09 → T10 → T11 é a listagem, em cadeia.
T12 → T13 → T14 dependem de T05 (o `notes`) e de T07 (`QueueAge`).
T15 → T16 → T17 dependem de T04.
T18 fecha.
