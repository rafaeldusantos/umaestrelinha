## 01 · [. — supabase, packages/core, packages/supabase, apps/backoffice, apps/store (guardas)] Página do pedido no Backoffice

**Status:** done

`C-03, C-04, C-05, C-07` — 95

**Objetivo.** Quem administra vê, cadastra e edita a observação de qualquer pedido na página dele (em qualquer status), ela sai na folha de separação daquele pedido, e a cliente nunca a recebe.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz — por seção: O "defeito 01", Convenções que valem em todo o repositório, Os guardas, Baselines, CI e deploy, e o bloco "Alias de import" sobre módulos de `core` alcançáveis pelo Deno), `packages/core/CLAUDE.md`, `apps/store/CLAUDE.md` só pelos guardas em `shared/lib/__tests__`; e por seção: `apps/backoffice/CLAUDE.md › Molde dos formulários`, `› O movimento do painel (feature 50)`, `› Pedidos e a fila de material`, `› O aviso à cliente é escolha… (feature 88)`, `› As duas listagens de Vendas (feature 34)`; `supabase/CLAUDE.md › Migrations`, `› RLS — o molde que os guardas cobram`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §5 · plan.md — Código — /Users/rafael.santos/Projetos/uma-estrelinha/store. É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Habilita.** A tabela `order_admin_notes`, a regra `core/orders/adminNote.ts` e o dono da escrita `core/order-actions/adminNote.ts`, que a tarefa 02 (proposta concluída e conversão) e a 03 (app) consomem; e o slice `apps/backoffice/src/features/order-admin-note/` (o hook `useOrderAdminNote(orderId)` e o card `OrderAdminNoteCard`, que recebe só o `orderId` e lê e grava sozinho), que a página da proposta concluída reutiliza na 02.

### Critérios de aceite

- **C-03** A página do pedido no Backoffice mostra e edita a observação de **todo** pedido (loja e montado), em qualquer status, inclusive concluído e cancelado — num card distinto do Recado da cliente e da Nota interna. Uma leitura que falha não se apresenta como "sem observação"
- **C-04** A cliente nunca recebe a observação: nem na tela da loja, nem em resposta de rede (PostgREST com a sessão dela, `get-order`, `get-proposal`, Realtime, e-mails)
- **C-05** A folha de separação de um pedido (aberta na página dele) imprime a observação ao lado do Recado da cliente
- **C-07** O teto de caracteres é uma regra só, em `packages/core`, aplicada igual na tela, na function e no `check` do banco

### Design — o que a tela faz

Sem protótipo (o humano mandou seguir sem design): segue os padrões da própria tela.

- **Página do pedido** (`AdminOrderPage`): card "Observação" logo depois do card "Recado da cliente" (`AdminOrderPage.tsx` — a `section` com `Recado da cliente`), rotulado com a origem para não confundir com o Recado nem com a Nota interna (ex.: subtítulo "Só quem administra vê. A cliente não recebe."). Textarea com `CharCounter` (teto 1000), botão Salvar por `gesto.rodar` (molde de `anotar`), e debaixo do campo "Atualizada em <data> por <nome>" — só a última edição. Sem observação, o card aparece com o campo vazio (é o lugar de escrever). Estados: carregando (esqueleto do card), erro de leitura (frase + "Tentar de novo", sem campo editável — nunca "sem observação"), gravando (botão travado), erro de gravação (o texto fica no campo, como na nota interna).
- **Folha de separação** (só a de um pedido): bloco "Observação" escapado, junto do bloco `.recado`.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| tabela `public.order_admin_notes` (migration nova) | VOCÊ CRIA | — | `order_id uuid` PK → `orders(id)` `on delete cascade`; `note text not null` com `check (char_length(btrim(note)) between 1 and 1000)`; `updated_by uuid` → `auth.users(id)` `on delete set null`; `updated_by_name text` (o nome de quem editou, gravado no momento — o painel não lê `auth.users`); `updated_at timestamptz not null default now()` |
| RLS de `order_admin_notes` | VOCÊ CRIA | — | RLS ligada; uma policy `to authenticated` com `public.has_role(auth.uid(), 'admin')` no `using` **e** no `with check`; `revoke all … from anon`; nenhum `grant` a `anon` |
| `packages/core/src/orders/adminNote.ts` | VOCÊ CRIA | texto | `ORDER_ADMIN_NOTE_MAX = 1000`; `normalizeAdminNote(texto): string` (apara); `adminNoteLength(texto)` (pontos de código do texto aparado — `[...s].length`); `adminNoteRefusal(texto): string \| null` (`null` aceita; vazio aceito = apagar); exportados pelo barril `orders/index.ts` |
| `packages/core/src/order-actions/adminNote.ts` | VOCÊ CRIA | client supabase **injetado**, `orderId`, texto, `userId` | upsert em `order_admin_notes` por `order_id` (`note`, `updated_by`, `updated_by_name`, `updated_at`), ou `delete` quando o texto aparado é vazio; efeito conferido por `.select(...)` (zero linhas = recusa); desfecho discriminado por literal de **string**; recusa acima do teto **antes** da rede |
| `DbOrderAdminNote` em `packages/supabase/src/types/index.ts` | VOCÊ CRIA | — | ao lado de `DbOrderNote` |
| slice `apps/backoffice/src/features/order-admin-note/` (barrel `index.ts`) | VOCÊ CRIA | `orderId` | `useOrderAdminNote(orderId)`: leitura de `order_admin_notes` por `order_id` (`maybeSingle`) em React Query com chave própria (página e card dividem o cache, sem segunda requisição), estado de falha próprio, e `salvar(texto)` que delega ao dono de `core` e revalida sem piscar; `OrderAdminNoteCard({ orderId })`: o card inteiro, autossuficiente — é ele que a 02 monta na proposta concluída |
| `AdminOrderPage` | JÁ EXISTE. Altere. | — | monta `OrderAdminNoteCard` depois do Recado e passa a nota (do mesmo hook) a `openPickSlips`; `useAdminOrder` não muda |
| `features/pick-slip/lib/pickSlip.ts` (`PickSlipOrder`, `folha`) | JÁ EXISTE. Altere. | `admin_note?: string \| null` | bloco "Observação" escapado com `escapar` |
| `orders` | JÁ EXISTE. Consuma; não altere. | — | **nenhuma coluna nova em `orders`** |

### Decisões já tomadas

- Não pode ser coluna de `orders`: a cliente lê a linha inteira (`users read own orders`; a loja faz `select('*, order_items(*)')`; `get-order` devolve `*`; Realtime; `order_list` é `security_invoker`). Tabela à parte, só admin.
- Distinta de `orders.notes` (Recado da cliente) e de `order_notes` (Nota interna, histórico só de acréscimo) — não reusar nenhuma das duas.
- Teto: **1000** caracteres (N1). Conta-se o texto **aparado**, em pontos de código, igual ao `char_length(btrim(note))` do banco. Vazio apaga a linha.
- Autoria: só a última edição, "Atualizada em <data> por <nome>" (N2). Sem histórico de versões.
- A escrita tem **um dono** em `core/order-actions/adminNote.ts` com o client injetado, porque o app do ateliê (tarefa 03) também grava (N5). O painel delega a ele; nunca escreve na tabela por conta.
- A folha de separação **em lote** não leva a observação (N6: "Desconsiderar esse item. Não precisa ter"). Não toque em `AdminOrdersPage` nem nos chamadores do lote.
- Export CSV fica sem a observação (N4).
- A migration da 89 (`20261103120000_89-pedido-montado.sql`) é imutável; esta tarefa não a toca. Migration nova, prefixo **maior que o maior existente em `supabase/migrations/`** e sem colisão (apure na hora), aplicada **só no banco local** (`supabase migration up --local`; nunca `--linked`).

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| tabela só de admin, chave = dono, cascade | `supabase/migrations/20261022150000_80-fornecedor-da-peca.sql` — `product_suppliers` |
| policy `has_role` em `using`+`with check`, `to authenticated`, `revoke anon` | `supabase/migrations/20260919120000_52-entrega-de-email-comprovada.sql` — as policies de `order_notes` |
| guarda de schema da migration | `apps/store/src/shared/lib/__tests__/fornecedorSchema.test.ts` — uma régua por comando, `mutar()` que lança, teto **importado** de `core` |
| guarda "fora da loja" | `apps/store/src/shared/lib/__tests__/fornecedorForaDaLoja.test.ts` |
| teto + recusa `string \| null` em `core` | `packages/core/src/proposals/limits.ts › MANUAL_REASON_MAX` + `packages/core/src/proposals/pricing.ts › manualDiscountRefusal` |
| dono da escrita com client injetado | `packages/core/src/order-actions/tracking.ts` + `packages/core/src/order-actions/types.ts` (o desfecho por string) |
| guarda de escrita só pelo dono | `apps/store/src/shared/lib/__tests__/pedidoGravadoSoPeloDono.test.ts` (pela AST) |
| alcance pelo Deno / pureza | `packages/core/src/order-actions/__tests__/purity.test.ts` e os `denoReach.test.ts` de `core` |
| leitura de relação que degrada sozinha | `apps/backoffice/src/entities/order/api/useAdminOrder.ts › emailsError` (o estado; a leitura mora no slice novo) |
| hook React Query do painel com chave própria | `apps/backoffice/src/features/order-proposal/api/proposalsApi.ts › useProposal` |
| card e gravação no pedido | `apps/backoffice/src/pages/admin/AdminOrderPage.tsx` — a `section` "Recado da cliente" e a função `anotar` |
| campo com contador | `apps/backoffice/src/features/order-proposal/ui/ManualDiscountField.tsx` — `CharCounter` + `maxLength` |

### Testes

- Unidade (`core/orders`): o teto aceita 1000 e recusa 1001; conta o texto aparado e por ponto de código; vazio é aceito (significa apagar); a folha não importa nada e é alcançável pelo Deno.
- Unidade (`core/order-actions`): o dono faz upsert com `updated_by`; texto vazio apaga; acima do teto recusa sem tocar no client; zero linhas no efeito vira recusa; pureza (client só por `import type`).
- Guarda (suíte da loja): a forma da migration — tabela, `check` com o teto importado de `core`, cascade, `set null`, RLS, policy com `has_role` no `using` e no `with check`, `to authenticated`, `revoke` de `anon`, nenhum `grant` a `anon`, nenhuma escrita de dado.
- Guarda (suíte da loja): `order_admin_notes` e `admin_note` não aparecem em `apps/store/**` nem nas functions que servem a cliente (`checkout`, `send-notification`, `get-order` se existir separada); `order-proposals` em allowlist literal; o guarda varre **só produção** (os testes ficam fora), porque a 02 escreve em `checkout/__tests__/proposal.test.ts` a asserção de que `get-proposal` não devolve `admin_note`.
- Guarda: escrita em `order_admin_notes` só dentro de `core/order-actions/adminNote.ts`.
- Página (painel, `AdminOrderPage` real): Recado, Observação e Nota interna aparecem como três coisas distintas; cadastra e edita em pedido concluído e em cancelado; a leitura que falha mostra erro e não "sem observação"; o painel chama o dono de `core`.
- `useOrderAdminNote`/`OrderAdminNoteCard`: lê por `order_id`, expõe a falha à parte, salva pelo dono de `core` e mostra "Atualizada em <data> por <nome>" a partir de `updated_by_name`.
- `pickSlip`: a folha de um pedido imprime a observação escapada ao lado do Recado; sem observação, nenhum bloco.
- Probe no banco local (transação desfeita): `anon` e uma cliente autenticada **dona do pedido** não leem nem escrevem `order_admin_notes`; admin lê e faz upsert; a cliente dona, por PostgREST, faz `select *` em `orders` e em `order_list` e não vê a nota; apagar o pedido apaga a nota; apagar o admin anula `updated_by`. Probe HTTP da gravação pelo caminho do painel (`AD-012`).

### Obrigações

- `packages/core/src/orders/adminNote.ts` sem import nenhum; `core/order-actions/adminNote.ts` com todo relativo em `.ts` explícito, `import type` incluso, e o supabase-js só como `import type` (`order-actions/__tests__/purity.test.ts` cobre a pasta).
- Veredito com motivo como `string | null` e desfecho discriminado por literal de **string** (`strictNullChecks: false`).
- Gravar não pisca: releitura com `reload('revalidar')`, botão que grava é `ActionButton`/`gesto.rodar`, foco por `shared/lib/foco.ts`.
- Mobile primeiro: o card em 390×844 sem rolagem horizontal, alvo ≥ 44px; classe de movimento nova com par `motion-reduce:`.
- `brandScan`; nos comentários de guarda, descreva a forma proibida, não a escreva.
- Gate "sem regressão" de lint/tipos/testes por workspace tocado (core, backoffice, store, functions se tocar) — `CLAUDE.md › Baselines`.

### Não faça

- Escrever o card dentro de `AdminOrderPage` (ele mora no slice `features/order-admin-note`); mudar `useAdminOrder`.
- Coluna nova em `orders` ou em `order_list`; mudar `orders.notes` ou `order_notes`.
- A folha de separação em lote (`AdminOrdersPage`), o export CSV, histórico de edições.
- Qualquer coisa em `order_proposals`, `save_order_proposal`, `create_order_from_proposal`, na function `order-proposals` ou nas telas da proposta (tarefa 02).
- Qualquer coisa em `apps/mobile-adm` (tarefa 03).
- `supabase db push`, `--linked`, commit.

### Pronto quando

- [ ] a página do pedido mostra, cadastra e edita a observação em pedido de loja e montado, concluído e cancelado, distinta do Recado e da Nota interna
- [ ] a leitura que falha não aparece como "sem observação"
- [ ] a folha de um pedido imprime a observação ao lado do Recado
- [ ] o teto 1000 é a mesma constante de `core` no contador, no dono da escrita e no guarda que lê o `check` da migration
- [ ] o probe mostra que a cliente dona do pedido não vê a nota por `orders`, `order_list` nem pela tabela
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
