# Design — Painel de vendas (Pedidos e Clientes)

Cobre [`spec.md`](./spec.md). Os desenhos estão no arquivo Paper **Uma Estrelinha**, página
**`34 · Pedidos e Clientes`**.

## As pranchas, e o que cada uma decide

| Prancha | Tamanho | O que ela resolve |
| --- | --- | --- |
| `34 · Pedidos — Listagem (fila)` | 1440 | O topo passa a dizer **o que cobra**; idade na linha; visões; busca ampliada; rodapé com intervalo |
| `34 · Pedidos — Seleção em massa na fila de material` | 1440 | Chips de filtro ativo, barra de seleção, e a fila com os quatro estados de material lado a lado |
| `34 · Pedido — Tela do pedido (rota própria)` | 1440 | O modal de 5 abas vira rota: material primeiro, itens, histórico único, aside com cliente/entrega/pagamento |
| `34 · Clientes — Listagem` | 1440 | Retrato da base, visões, e as três colunas que faltavam |
| `34 · Cliente — Ficha (rota própria)` | 1440 | Pedidos, notas, endereços e o bloco de privacidade |
| `34 · Pedidos — Fila no celular (390)` | 390 | A fila com a ação primária de cada pedido a um toque, em alvo de 44px |
| `34 · Selos, estados e o defeito de cor` | 1440 | O antes/depois do defeito, as três escalas de selo, os degraus de idade e os tokens a acrescentar |

---

## Decisões

### D1 — A idade da fila mora em `packages/core`, não na tela

Um segundo consumidor é previsível: a página "meu pedido" da loja também precisa dizer há quanto
tempo a peça espera. Pela consequência 1 do defeito 01 do repositório, isso já basta.

```
packages/core/src/material/
  aging.ts       queueAge(since, now) → { days, tier: 'fresh' | 'warm' | 'stale' }
```

`STALE_AFTER_DAYS = 8` mora aqui, com o comentário que explica de onde o número saiu (ciclo do PAC
nacional). A tela lê `tier` e escolhe a cor; **a tela nunca compara datas**. Trocar o corte é uma
constante num arquivo, não uma busca por `> 7` espalhada.

**Três degraus, não gradiente.** Um degradê contínuo pinta tudo de alguma cor, e aí nada é alarme.
Só o terceiro degrau ganha âmbar.

### D2 — Os tokens que faltavam entram nos dois lugares, e um guarda impede o terceiro

`--estrelinha-admin-amber: #B45309` e `--estrelinha-admin-emerald: #047857` em `styles.css` (light e
dark) **e** no mapa `estrelinha-admin` de `tailwind.preset.ts`. Mais a correção de `text-muted`
(`#9B8EC4` → `#726591`), que hoje entrega **2,9:1** sobre `card`.

**Acrescentar os tokens não conserta a classe de defeito.** A próxima classe inventada falha do
mesmo jeito e do mesmo jeito silencioso. Por isso `adminTokens.test.ts`, no molde de
`palette.test.ts`:

1. lê `tailwind.preset.ts` e `styles.css` do disco e extrai o conjunto de tokens `estrelinha-admin-*`;
2. varre `apps/backoffice/src/**/*.{ts,tsx}` atrás de `/estrelinha-admin-[a-z-]+/g`;
3. reprova toda classe cujo token não existir no conjunto;
4. **âncora dupla** — nº de arquivos varridos **e** nº de classes encontradas, com piso. Caminho
   errado varre zero arquivo e passaria calado, que é a pior falha possível num teste desse tipo;
5. **sensor embutido** — uma constante `estrelinha-admin-inexistente` num fixture prova que a régua
   reprova de verdade.

A régua nunca é o objeto medido: os diretórios são escritos literalmente, como no `brandScan`.

### D3 — O pedido vira rota, e o material é o primeiro bloco

`/admin/pedidos/:id`. É o precedente dos Descontos e do editor de seção da Home, aplicado ao registro
mais complexo do painel. O modal de 5 abas custava: perder o estado no F5, não poder mandar link do
pedido para ninguém, e esconder timeline e notas atrás de cliques.

**A ordem da tela é a ordem da operação, não a do esquema do banco:**

1. **O que este pedido espera** — a máquina do material, com a trilha dos quatro estados, o que falta
   e há quanto tempo. Ação primária do estado atual em destaque.
2. **Próximo passo** — a mudança de status, dizendo o que a segura, com `Avançar mesmo assim`.
3. **Itens** — com gravação e contagem de caracteres, porque é o que vai para a bancada.
4. **Histórico** — status, e-mails e notas **num fluxo só**, filtrável.

O aside de 330 carrega cliente (com o que ela já gastou e link para a ficha), entrega e pagamento.
É a mesma largura de aside dos formulários de cupom e produto — a moldura do painel é uma só.

**As duas remessas ficam em blocos diferentes, com rótulo que diz a direção.** `material_tracking_code`
é a de entrada e só aparece no bloco de material; `tracking_code` é a de saída e só aparece em
entrega, rotulado `RASTREIO DA JOIA (SAÍDA)`. Foi o erro que o `CLAUDE.md` do backoffice já avisa que
custa caro, e desenho ambíguo é o caminho mais curto para cometê-lo.

### D4 — O topo da listagem responde "o que cobra", não "o que existe"

Quatro contadores clicáveis, e o primeiro tem o acento porque é o único que **acumula**: ninguém
pode fazer nada até o envelope chegar. Ele carrega a idade do mais antigo, que é a informação que
transforma "5 pedidos" em "5 pedidos, e um deles há 9 dias".

Os outros três são espera com prazo (`pago, a separar`), falha silenciosa (`enviado sem rastreio` —
a cliente não recebeu o aviso) e nada-a-fazer (`Pix aguardando`, que expira sozinho). O quarto está
lá **justamente** para dizer que não é fila: sem ele, a Adri olha 7 pedidos pendentes e acha que
deve algo a alguém.

**Um acento por tela.** O âmbar aparece no primeiro tile, na coluna de idade quando passa de 8 dias,
e no selo de material. Em nenhum outro lugar.

### D5 — A seleção guarda a linha, e o lote não aborta

Molde de `PLS-06`: `Map<string, AdminOrderRow>`, não `Set<string>`. Sem os valores atuais não há
prévia de impacto nem resumo do que mudou.

**Cada transição de material é uma chamada de `set_material_status`.** Não existe RPC de lote, e
inventar uma seria uma segunda máquina de estado. A guarda de origem no `where` da função já torna
cada chamada idempotente; o lote é um laço com resumo: *"7 marcadas · 2 não estavam em estado que
permite"*. Transição inválida **não** aborta as outras — abortar faria a Adri repetir o lote inteiro
por causa de um pedido que outra aba já tinha atualizado.

### D6 — Clientes deixa de ser um cadastro e vira um retrato

As três perguntas que fazem alguém abrir a tela — quanto gastou, quando comprou, se confiou material
— viram **coluna**, não clique. E o topo mostra a base: quantas voltaram, quantas confiaram material,
gasto médio, novas no mês.

**Os agregados são VIEW, não coluna.** `customer_stats` (`security_invoker`) devolve
`orders_paid`, `total_spent`, `avg_ticket`, `first_order_at`, `last_order_at`, `material_kinds`. É a
mesma decisão de `faq_usage` na `28`: materializar daria um segundo dono do número, que qualquer
importação desatualizaria em silêncio.

**Gasto conta só `payment_status = 'approved'`**, e a tela escreve isso. Um número de dinheiro que
inclui Pix expirado não é um número de dinheiro.

**Duplicata é mostrada, não resolvida.** A visão `Possíveis duplicadas` agrupa por e-mail. Fundir dois
cadastros é escrita destrutiva sobre pedido pago; e o índice único em `customers.email` fica de fora
porque pode haver duplicata já gravada — a migration falharia na aplicação, e `AD-017` venceu:
migration aplicada é imutável, correção vem em migration nova.

### D7 — Privacidade é bloco de tela, não item de menu escondido

O dado desta loja é sensível de um jeito que o de uma loja de acessório não é: nome, CPF, telefone,
endereço, e o registro de que a pessoa mandou as cinzas de alguém. O bloco `PRIVACIDADE` da ficha
diz isso em texto e oferece dois caminhos: exportar tudo, e anonimizar.

**Anonimizar preserva os pedidos, sem dono.** Pedido é registro fiscal; apagar a linha quebraria o
faturamento. A RPC `anonymize_customer(p_customer_id)` limpa `name`, `email`, `cpf`, `phone`, apaga
`addresses` e desliga `user_id` — e **o diálogo escreve exatamente isso antes de perguntar**. Como
toda escrita de estado deste domínio, é RPC guardada por `has_role`, nunca `update` direto.

### D8 — O celular é a fila, não a tela inteira

O painel é desktop na maior parte do tempo. Mas a fila de material é consultada com o envelope na
mão, na bancada — e a ação é sempre a mesma: *chegou*. Por isso a prancha de 390px cobre **a
listagem**, não o pedido nem a ficha.

- Cartão, não tabela. Cada cartão traz o nome, o que a segura, e **a ação primária daquele estado**
  ocupando a largura, em 44px.
- A faixa de contadores e a de visões rolam **dentro do próprio container** (`overflow-x: auto`), com
  os itens em `flex-shrink: 0`. O body nunca rola na horizontal.
- Nenhum alvo abaixo de 44px — os ícones do app bar têm caixa de 44 mesmo com glifo de 21.

Vale a armadilha registrada no `CLAUDE.md`: **item largo dentro de grade precisa de `minmax(0, …)`
no mobile**, não a partir de `md`. Aqui não há grade — é flex —, mas a mesma propriedade se aplica:
quem não pode encolher é a trilha, não o item.

### D9 — O que **não** muda

- `MelhorEnvioTab` migra de aba para bloco, **sem alteração interna**.
- `set_material_status`, `set_material_tracking` e `sendOrderEmail` mantêm assinatura e semântica.
  A feature muda **onde** são chamadas, nunca o que fazem.
- `packages/core/src/payment/**` fica intocado, conferido no gate por `git diff --name-only`.
- A ordem da sidebar não muda: as rotas novas são de segundo nível e não entram em `navGroups`, pela
  mesma régua de `/admin/produtos/grade-rapida`.

---

## Migrations

Uma só, nova (`AD-017`: aplicada é imutável).

```
supabase/migrations/<ts>_34-painel-de-vendas.sql
```

| O que | Por quê |
| --- | --- |
| `create table customer_notes` (+ RLS, policy com `has_role`) | `CLI-10`. Molde exato de `order_notes` |
| `create view customer_stats` com `security_invoker` | `CLI-03`..`CLI-06`. Agregado é view, nunca coluna |
| `create index orders_material_status_created_at_idx` | A fila filtra por `material_status` e ordena por `created_at`; hoje é seq scan |
| `create index orders_customer_email_idx` | `PED-10` acrescenta `customer_email` à busca |
| `create function anonymize_customer(uuid)` `security definer`, guardada por `has_role` | `CLI-13`. Escrita destrutiva sobre dado sensível não passa por `update` direto |
| **Sem** `unique (customers.email)` | Registrado em *Out of Scope*: pode haver duplicata já gravada |

**Prova de gravação por probe HTTP contra o banco local** (`AD-012`), não por inspeção de tipo —
`DbCategory` e `DbAbandonedCart` já custaram esse aprendizado duas vezes.

---

## Superfície de arquivos

```
packages/core/src/material/aging.ts                      D1 · queueAge + STALE_AFTER_DAYS
packages/ui/src/styles.css                               D2 · amber, emerald, text-muted
packages/ui/tailwind.preset.ts                           D2 · idem, no mapa estrelinha-admin
packages/supabase/src/types/index.ts                     DbOrder.notes · DbCustomerStats · DbCustomerNote

apps/backoffice/src/entities/order/api/
  orderQuery.ts                                          molde de productQuery.ts
  useAdminOrderList.ts                                   servidor: filtro, sort, range, count
  useAdminOrder.ts                                       um pedido, para a rota
apps/backoffice/src/entities/order/ui/
  MaterialStatusBadge.tsx                                PED-01 · tokens que existem
  QueueAge.tsx                                           PED-13 · os três degraus
apps/backoffice/src/features/order-list/                 molde de features/product-list
  model/{columns,filterChips,savedViews,rowSummary}.ts
  ui/{FilterChips,QueueTiles,OrderBulkBar}.tsx
apps/backoffice/src/features/order-detail/
  ui/{OrderMaterialBlock,OrderNextStep,OrderHistory,OrderCancelDialog}.tsx
apps/backoffice/src/features/pick-slip/                  PED-30
apps/backoffice/src/pages/admin/
  AdminOrdersPage.tsx · AdminOrderPage.tsx
  AdminClientsPage.tsx · AdminClientPage.tsx

apps/backoffice/src/entities/customer/api/
  customerQuery.ts · useAdminCustomerList.ts · useAdminCustomer.ts
apps/backoffice/src/features/customer-detail/
  ui/{CustomerNotes,CustomerAddresses,CustomerPrivacyCard,AnonymizeDialog}.tsx
```

**Apagados**: `features/order-management/ui/OrderDetailDialog.tsx` e
`features/customer-detail/ui/CustomerDetailDialog.tsx`. Os 12 casos de `OrderDetailDialog.test.tsx`
são reescritos em `AdminOrderPage.test.tsx` **no mesmo lugar conceitual e em maior número** — é a
exceção declarada de queda de baseline, na régua da `25` e da `31`.

---

## Riscos

| Risco | Mitigação |
| --- | --- |
| A migration cria view sobre `orders` com RLS; leitura pode vir vazia para admin | `security_invoker` + policy de `select` que já existe para `has_role('admin')`. Probe HTTP prova antes do fecho |
| O laço de `set_material_status` em lote grande fica lento | Teto de 50 por lote na UI, com aviso. Acima disso, a Adri filtra melhor |
| `customer_stats` numa base grande fica cara | Índices em `orders(customer_id, payment_status)`. Medido no banco local com o catálogo real antes do fecho |
| A tela do pedido é grande e o gate é jsdom | jsdom devolve 0 para toda medida de layout. A prova de 390px é navegador real, em QA — nunca teste de componente |
