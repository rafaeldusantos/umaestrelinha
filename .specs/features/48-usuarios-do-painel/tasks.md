# Usuários do painel — tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user.**

---

**Design**: `.specs/features/48-usuarios-do-painel/design.md`
**Status**: **Done** — 25 de 25 tasks (2026-09-13)

---

## Desvios do plano, declarados

| # | O que mudou | Por quê |
| --- | --- | --- |
| 1 | **T08 absorveu T10** (`?action=list`), e o total foi de 26 para **25** | O esqueleto sozinho produzia código não verificável: `requireAdmin` nasceria sem chamador, e o `switch` referenciava handlers inexistentes. `list` é a ação mínima que exercita a autorização de ponta a ponta. É o "merge forward" que o `implement.md` prescreve para dependência de compilação — a alternativa (stubs 501) seria código morto por seis tasks |
| 2 | `SAME_PASSWORD` foi **exportada de `core/auth/errors.ts`**, um arquivo fora da lista de T02 | A frase `'A senha nova precisa ser diferente da atual.'` tem **dois produtores**: o GoTrue (`same_password`) e `passwordChangeRefusal`. Escrevê-la nos dois lugares é o defeito 01 aplicado a texto. Um caso em `passwordChange.test.ts` compara os dois vereditos |
| 3 | O guarda de T25 ganhou **allowlist de UM** (ele mesmo), e a régua ampla de `service_role` vale só para produção | O arquivo precisa carregar as formas proibidas nos sensores. E `orderNotificationsSchema.test.ts` nomeia `service_role` legitimamente — ele confere um `grant ... to service_role` no `.sql`. Recorte, não afrouxamento: a **chave** e `auth.admin.*` continuam proibidas em teste também, e um caso prova que outro arquivo de teste seria acusado |

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec. Diretrizes encontradas: **`CLAUDE.md`
> (raiz)** — seção *Os guardas* e *Baselines*; **`supabase/CLAUDE.md`**;
> **`apps/backoffice/CLAUDE.md`**; `packages/core/vitest.config.ts`; `supabase/vitest.config.ts`;
> `apps/*/vitest.config.ts`; `.github/workflows/ci.yml`.

| Camada | Tipo exigido | Expectativa de cobertura | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| Regra pura (`packages/core/src/admin-users`) | unit | **Todos os ramos; 1:1 com as ACs**; todo edge case listado tem caso. Mais `purity.test.ts` (sem React/Supabase/Deno) e extensão `.ts` em todo import relativo | `packages/core/src/admin-users/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Handler de edge function (`supabase/functions/admin-users/handlers.ts`) | integration | **Toda action**: caminho feliz + toda recusa + todo erro. Cada guarda que retorna antes de chamada externa tem caso asserindo status **e zero chamadas** (`L-004`) | `supabase/functions/admin-users/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Wiring de edge function (`index.ts`) | none | Fora do runner por decisão (`AD-004`) — só env, client e `Deno.serve` | — | — |
| Migration (`supabase/migrations/*.sql`) | unit (guarda que **lê o arquivo do disco**) | Uma régua **por comando**, nunca por família (`L-033`); **âncora dupla** (arquivos lidos **e** comandos encontrados); **sensor por mutação** em cada asserção | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Hook de dados do painel (`features/*/api/use*.ts`) | unit | Caminho feliz + erro de leitura distinto de vazio (`AD-014`) + cada recusa | `apps/backoffice/src/features/**/*.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Componente do painel (`ui/*.tsx`, `pages/*.tsx`) | unit (RTL) | Toda AC visível; **a página real monta a árvore** — teste nunca compõe a árvore que quer provar | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Guarda de varredura de fonte | unit | **Âncora dupla** + **um sensor por forma** (nunca um bloco só); remoção de comentário de linha **e** de bloco na mesma varredura, com CRLF, LF e glob de dois asteriscos (`L-031`, `BL-027`) | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| `navItems.ts` / `App.tsx` (config de rota) | unit | Bidirecional — rota nova entra na lista **e** entrada da lista é rota | `apps/backoffice/src/widgets/admin-layout/model/navItems.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |

> **Por que `--testTimeout=20000` no backoffice**: achado da feature `46`, registrado no `CLAUDE.md`.
> Guardas que varrem disco cruzam o teto de 5s sob a contenção da suíte cheia e reprovam por
> **timeout, nunca por asserção** — e o arquivo que reprova muda a cada execução.

## Gate Check Commands

| Nível | Quando usar | Comando |
| --- | --- | --- |
| **Quick** | Depois de task que só mexe num workspace | `pnpm --filter @estrelinha/<w> test` (backoffice: `+ --testTimeout=20000`) |
| **Full** | Depois de task que atravessa workspace (ex.: constante de `core` lida pelo painel) | os workspaces afetados, **um por vez**, com exit code capturado **fora de pipe** |
| **Build** | Fim de fase, e no fecho | `pnpm build` + `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` (**o `tsconfig.app.json`**, não o solution-style) |

> **Três armadilhas de medição** que valem em toda task (`CLAUDE.md`): `pnpm build` **não** faz
> typecheck; `pnpm lint` **não** olha `packages/`; e `pnpm test | tail` devolve o exit code do `tail`.
> **Rode um workspace por vez** — duas suítes concorrentes produzem timeout em teste que varre disco.

---

## Execution Plan

### Fase 1 — A regra pura (`packages/core/src/admin-users`)

```
T01 → T02 → T03 → T04
```

### Fase 2 — A invariante no banco

```
T05 → T06
```

### Fase 3 — A porta (fundação da edge function)

```
T07 → T08 → T09
```

### Fase 4 — As seis ações

```
T10 → T11 → T12 → T13 → T14 → T15
```

### Fase 5 — O painel: usuários

```
T16 → T17 → T18 → T19
```

### Fase 6 — O painel: minha conta e recuperação

```
T20 → T21 → T22 → T23
```

### Fase 7 — Navegação, guarda da chave e fecho

```
T24 → T25 → T26
```

---

## Task Breakdown

### T01: `adminUserRefusal` — validação de nome, e-mail e senha

**What**: `EMAIL_RE`, `normalizeEmail` e `adminUserRefusal` num módulo puro novo.
**Where**: `packages/core/src/admin-users/refusals.ts` (novo)
**Depends on**: —
**Reuses**: `packages/core/src/constants.ts` (`MIN_PASSWORD_LENGTH`); forma de veredito de
`menuTargetRefusal` (`string | null`)
**Requirement**: `USR-05`, `USR-06`, `USR-21`

**Done when**:
- [ ] `adminUserRefusal({ name, email, password? })` devolve `string | null` — **nunca** união discriminada por booleano
- [ ] `password` **opcional**: ausente ⇒ não valida senha (é o caso do `update`, que não troca senha)
- [ ] `normalizeEmail` faz `trim` + `toLowerCase` e é o **único** lugar que normaliza
- [ ] Todo import relativo tem `.ts` explícito, **inclusive `import type`**
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit — 1:1 com as três ACs, mais os edge cases de e-mail com espaço/caixa alta e nome só-espaços
**Gate**: quick
**Commit**: (sem commit — ver Protocolo de commits, abaixo)

---

### T02: `passwordChangeRefusal` — as três recusas locais da troca de senha

**What**: a régua que roda **antes de qualquer rede** na troca da própria senha.
**Where**: `packages/core/src/admin-users/refusals.ts` (estende)
**Depends on**: T01
**Reuses**: `MIN_PASSWORD_LENGTH`
**Requirement**: `USR-11`, `USR-12`, `USR-23`

**Done when**:
- [ ] Recusa confirmação divergente, senha nova igual à atual, e senha abaixo do mínimo
- [ ] A mensagem do mínimo **nomeia o número**, lido da constante (nunca literal)
- [ ] Caso provando que a ordem das recusas é determinística quando duas se aplicam (`L-005`)
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit
**Gate**: quick

---

### T03: as recusas de alvo — si mesma, último admin, conta com histórico

**What**: `selfTargetRefusal`, `lastAdminRefusal`, `accountHistoryRefusal` e o tipo `AccountHistory`.
**Where**: `packages/core/src/admin-users/refusals.ts` (estende)
**Depends on**: T02
**Reuses**: forma de `freeShippingRefusal`
**Requirement**: `USR-14`, `USR-15`, `USR-32`, `USR-34`

**Done when**:
- [ ] `accountHistoryRefusal` **nomeia o que bloqueia e com quantos registros** — e o texto muda com a contagem (`L-006`)
- [ ] Caso por campo de `AccountHistory` (pedidos, notas de pedido, mudanças de status, notas de cliente) — **um por elemento**, não um bloco (`L-010`)
- [ ] Fixtures fazem os quatro campos **divergirem** entre si, para que ler o campo errado reprove (`L-013`)
- [ ] `selfTargetRefusal` distingue `'remover'` de `'apagar'` no texto
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit
**Gate**: quick

---

### T04: barrel e prova de pureza do módulo

**What**: `index.ts` do slice e o guarda que mantém o módulo alcançável pelo Deno.
**Where**: `packages/core/src/admin-users/index.ts`, `packages/core/src/admin-users/__tests__/purity.test.ts`
**Depends on**: T03
**Reuses**: `packages/core/src/shopping/__tests__/purity.test.ts` (molde), `core/menu/__tests__/purity.test.ts`
**Requirement**: `USR-05`..`USR-06`, `USR-21` (habilita o consumo pela function)

**Done when**:
- [ ] O barrel **não** usa `export * from './x'` sem extensão — todo especificador tem `.ts`
- [ ] `purity.test.ts` recusa `react`, `@supabase`, `Deno` em qualquer arquivo de `core/admin-users`
- [ ] O teste recusa **também** especificador relativo sem `.ts`, `import type` incluído — âncora de contagem de arquivos varridos
- [ ] Gate: `pnpm --filter @estrelinha/core test`

**Tests**: unit
**Gate**: quick

---

### T05: migration — `guard_last_admin`

**What**: trigger que torna impossível `user_roles` ficar sem nenhum `admin`.
**Where**: `supabase/migrations/20260913120000_48-usuarios-do-painel.sql` (novo)
**Depends on**: —
**Reuses**: `guard_last_active_home_section` da migration da `41` (molde e razão)
**Requirement**: `USR-16`

**Done when**:
- [ ] `BEFORE DELETE OR UPDATE ON public.user_roles`, agindo só sobre linha com `role = 'admin'`
- [ ] Decide por **contagem** dos admins restantes, **nunca** pela identidade da linha
- [ ] `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` antes do `CREATE TRIGGER` — idempotente
- [ ] **Zero** `INSERT`/`UPDATE`/`DELETE` de dado; **zero** `grant` novo a `anon`
- [ ] `COMMENT ON FUNCTION` dizendo por que existe
- [ ] Aplicada no banco local: `supabase db reset` (ou `db push`) roda limpo
- [ ] Probe SQL: apagar o último admin **falha**; apagar um de dois **passa**

**Tests**: none nesta task (o guarda é T06) — validada por **probe SQL contra o banco local**, que é o
que `AD-012` exige de quem mexe em escrita
**Gate**: build

---

### T06: guarda da migration — `adminUsersSchema.test.ts`

**What**: o teste que lê a migration **do disco** e recusa o afrouxamento.
**Where**: `apps/store/src/shared/lib/__tests__/adminUsersSchema.test.ts` (novo)
**Depends on**: T05
**Reuses**: `homeSections.test.ts`, `menuSchema.test.ts` (âncora dupla + sensor por mutação)
**Requirement**: `USR-16`

**Done when**:
- [ ] **Âncora dupla**: o arquivo foi lido **e** os comandos esperados foram encontrados
- [ ] Uma régua **por comando** — a função, o trigger, o `COMMENT` — nunca uma para a família (`L-033`)
- [ ] Assere que a decisão é por **contagem** e recusa a forma por identidade
- [ ] Recusa `grant` alcançando `anon` e recusa `insert`/`update`/`delete` de dado na migration
- [ ] **Sensor por mutação** em cada asserção: a mutação é injetada no arquivo real e a suíte reprova
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit
**Gate**: quick

---

### T07: dublês de `auth.admin.*` em `_shared/testing/fakes.ts`

**What**: estender `createFakeSupabase` com a superfície de administração que os handlers usam.
**Where**: `supabase/functions/_shared/testing/fakes.ts` (modifica), `__tests__/fakes.test.ts` (estende)
**Depends on**: —
**Reuses**: o próprio `createFakeSupabase`
**Requirement**: habilita `USR-01`..`USR-34`

**Done when**:
- [ ] Cobre **só** o que os handlers usam: `getUserById`, `createUser`, `updateUserById`, `deleteUser`, `listUsers`
- [ ] Registra as chamadas (`adminCalls`) para que os testes assiram **zero chamadas** nos caminhos de recusa (`L-004`)
- [ ] Fixture por id, no molde de `RowFixture` — e cada método pode ser forçado a erro
- [ ] `fakes.test.ts` cobre os dublês novos, inclusive o ramo de erro
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T08: `handlers.ts` — roteamento e autorização

**What**: o esqueleto da function: `route`, `corsHeaders`, `json`, `log`, `currentUser`, `requireAdmin`.
**Where**: `supabase/functions/admin-users/handlers.ts` (novo), `__tests__/handlers.test.ts` (novo)
**Depends on**: T07
**Reuses**: `send-notification/handlers.ts` (estrutura e a decisão de checar papel pela RPC `has_role`)
**Requirement**: `USR-01`, `USR-02`, `USR-03`, `USR-19`, `USR-27` + os dois edge cases de 400

**Done when**:
- [ ] 401 sem header; 401 com bearer sem `sub`; 403 sem papel; **403 quando a RPC erra**
- [ ] Cada um desses quatro casos assere **status E zero chamada a `auth.admin.*`** (`L-004`)
- [ ] `?action=` desconhecido ⇒ **400**; corpo não-JSON ⇒ **400**; nunca 500
- [ ] `log` emite **uma** linha JSON com `{ action, status }` e **sem** senha em texto — caso asserindo a ausência
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T09: `index.ts` + `config.toml`

**What**: o wiring e o registro da function.
**Where**: `supabase/functions/admin-users/index.ts` (novo), `supabase/config.toml` (modifica)
**Depends on**: T08
**Reuses**: `send-notification/index.ts` (molde), pin `supabase-js@2.49.1` das cinco irmãs
**Requirement**: `USR-01`..`USR-03`

**Done when**:
- [ ] `index.ts` só tem env, `createClient` e `Deno.serve((req) => route(deps, req))`
- [ ] O client usa `auth: { autoRefreshToken: false, persistSession: false }`
- [ ] `[functions.admin-users] verify_jwt = false` no `config.toml`, com o comentário explicando que `true` seria teatro (a anon key é JWT válido do projeto)
- [ ] `supabase functions serve` sobe a function sem erro de resolução de módulo

**Tests**: none (wiring — `AD-004`)
**Gate**: build

---

### T10: `?action=list`

**What**: a listagem dos admins, por `user_roles` + `getUserById`.
**Where**: `supabase/functions/admin-users/handlers.ts` (estende), `__tests__/handlers.test.ts`
**Depends on**: T09
**Requirement**: `USR-20`, `USR-26` + edge case "nenhum admin"

**Done when**:
- [ ] Lê `user_roles` com `role = 'admin'` e resolve cada id por `getUserById` — **não** usa `listUsers`
- [ ] Devolve exatamente `{ id, email, name, created_at, last_sign_in_at, is_self }`
- [ ] Caso asserindo que **nenhum outro campo** sai (nem `raw_user_meta_data` inteiro, nem hash)
- [ ] `is_self` é `true` só para quem pediu
- [ ] Erro do GoTrue ⇒ resposta de **falha**, distinta de lista vazia
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T11: `?action=create` — com compensação

**What**: criar conta confirmada, conceder papel, e **desfazer** se a concessão falhar.
**Where**: `supabase/functions/admin-users/handlers.ts` (estende), `__tests__/handlers.test.ts`
**Depends on**: T10
**Reuses**: `adminUserRefusal` (T01) — import relativo com `.ts`
**Requirement**: `USR-04`, `USR-05`, `USR-06`, `USR-07`, `USR-08`, `USR-21`

**Done when**:
- [ ] `createUser({ email, password, email_confirm: true, user_metadata: { full_name } })` + `insert user_roles`
- [ ] Recusa por `adminUserRefusal` **antes** de qualquer chamada — caso asserindo zero chamadas
- [ ] E-mail já existente ⇒ **não** cria, e a mensagem distingue "já é admin" de "conta existe sem acesso" (**dois** casos)
- [ ] Concessão falha ⇒ `deleteUser` compensatório **é chamado** e a resposta é erro (caso asserindo a chamada)
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T12: `?action=update`

**What**: trocar nome e e-mail, mantendo `customers.name` em sincronia.
**Where**: `supabase/functions/admin-users/handlers.ts` (estende), `__tests__/handlers.test.ts`
**Depends on**: T11
**Requirement**: `USR-28`, `USR-29`

**Done when**:
- [ ] Grava `user_metadata.full_name` **e** `public.customers.name` do mesmo `user_id` — caso asserindo **as duas** escritas (`L-036`)
- [ ] E-mail novo já pertencente a outra conta ⇒ recusa sem escrever
- [ ] E-mail é normalizado por `normalizeEmail` antes de comparar e gravar
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T13: `?action=revoke`

**What**: remover o papel admin, preservando a conta.
**Where**: `supabase/functions/admin-users/handlers.ts` (estende), `__tests__/handlers.test.ts`
**Depends on**: T12
**Reuses**: `selfTargetRefusal`, `lastAdminRefusal` (T03)
**Requirement**: `USR-13`, `USR-14`, `USR-15`

**Done when**:
- [ ] Apaga **apenas** a linha de `user_roles` com `role = 'admin'` — caso asserindo que `auth.admin.deleteUser` **não** é chamado
- [ ] Si mesma ⇒ recusa, zero escrita; último admin ⇒ recusa, zero escrita
- [ ] Linha já inexistente ⇒ termina **sem erro** para a usuária (edge case das duas abas)
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T14: `?action=delete`

**What**: apagar a conta, recusando antes quando há histórico.
**Where**: `supabase/functions/admin-users/handlers.ts` (estende), `__tests__/handlers.test.ts`
**Depends on**: T13
**Reuses**: `accountHistoryRefusal` (T03)
**Requirement**: `USR-31`, `USR-32`, `USR-33`, `USR-34`

**Done when**:
- [ ] Conta as **quatro** origens de histórico e recusa nomeando o que bloqueia — um caso por origem
- [ ] Sem histórico ⇒ `deleteUser` é chamado e responde `{ ok: true }`
- [ ] `23503` vindo do banco ⇒ **traduzido** para o mesmo texto legível (caso próprio)
- [ ] Si mesma e último admin ⇒ recusa pelas mesmas réguas de T13
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T15: `?action=reset-password`

**What**: disparar o e-mail de recuperação do GoTrue para o endereço da conta.
**Where**: `supabase/functions/admin-users/handlers.ts` (estende), `__tests__/handlers.test.ts`
**Depends on**: T14
**Requirement**: `USR-18`, `USR-30`

**Done when**:
- [ ] Resolve o e-mail **pelo id** (nunca aceita e-mail do corpo — senão a porta manda código para endereço arbitrário)
- [ ] Caso asserindo exatamente isso: e-mail no corpo é **ignorado**
- [ ] Rate limit do GoTrue ⇒ resposta de recusa, e **não** `{ ok: true }`
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: integration
**Gate**: quick

---

### T16: `useAdminUsers` — o hook do painel

**What**: leitura e as cinco escritas, por `functions.invoke`.
**Where**: `apps/backoffice/src/features/admin-users/api/useAdminUsers.ts` (novo) + teste
**Depends on**: T15
**Reuses**: `features/faq-library/api/useAdminFaqs.ts` (molde), `entities/order/api/notifyOrder.ts` (invoke)
**Requirement**: `USR-22`, `USR-26`, `USR-30`

**Done when**:
- [ ] `{ users, loading, error, refetch, create, update, revoke, remove, resetPassword }`
- [ ] `error` de leitura é **distinto** de lista vazia (`AD-014`) — caso para cada estado
- [ ] Toda escrita devolve `string | null` e chama `refetch` no sucesso (`USR-22`)
- [ ] Nenhuma função `async` devolve query builder do supabase-js (`L-011`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit
**Gate**: quick

---

### T17: `AdminUserEditorDialog`

**What**: criar e editar, com a recusa exibida antes de gravar.
**Where**: `apps/backoffice/src/features/admin-users/ui/AdminUserEditorDialog.tsx` (novo) + teste
**Depends on**: T16
**Reuses**: `FaqEditorDialog.tsx` (molde), `adminUserRefusal` (T01)
**Requirement**: `USR-04`, `USR-05`, `USR-06`, `USR-21`

**Done when**:
- [ ] Chama `adminUserRefusal` **antes** de `onSave` — a mesma função que a function chama
- [ ] Modo criar pede senha inicial; modo editar **não** pede senha
- [ ] Campo de senha é `type="password"` e tem mostrar/ocultar com rótulo acessível
- [ ] A recusa aparece em `role="alert"`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit (RTL)
**Gate**: quick

---

### T18: `DeleteAccountDialog`

**What**: a confirmação por digitação do e-mail.
**Where**: `apps/backoffice/src/features/admin-users/ui/DeleteAccountDialog.tsx` (novo) + teste
**Depends on**: T17
**Requirement**: `USR-35`

**Done when**:
- [ ] Botão desabilitado enquanto o texto **não casa exatamente** o e-mail
- [ ] Caso do quase-casamento (caixa diferente, espaço sobrando) provando que **não** habilita
- [ ] O texto explica que a conta some do `auth`, e oferece `Remover do painel` como saída
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit (RTL)
**Gate**: quick

---

### T19: `AdminUsersPage` — `/admin/usuarios`

**What**: a tela, montando a tabela e os dois diálogos.
**Where**: `apps/backoffice/src/pages/admin/AdminUsersPage.tsx` (novo) + teste
**Depends on**: T18
**Reuses**: `AdminFaqsPage.tsx` (molde), `AdminTable`, `EmptyState`, `PageHeader`
**Requirement**: `USR-20`, `USR-22`, `USR-26`, `USR-31`, `USR-32`

**Done when**:
- [ ] **A página real monta os diálogos** — o teste renderiza `<AdminUsersPage />`, nunca uma árvore composta dentro do próprio arquivo de teste
- [ ] `is_self` desabilita `Remover do painel` e `Apagar conta` na própria linha, com motivo visível
- [ ] Erro de leitura mostra `EmptyState` com motivo e "Tentar de novo"; lista vazia mostra texto diferente
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit (RTL)
**Gate**: quick

---

### T20: `changeOwnPassword` + `ChangePasswordCard`

**What**: a troca da própria senha, da regra à tela. **Uma task só** porque `packages/auth` não tem
runner (`turbo run test` não o alcança): a fiação só se prova pelo componente que a consome.
**Where**: `packages/auth/src/AuthContext.tsx` (modifica),
`apps/backoffice/src/features/account/ui/ChangePasswordCard.tsx` (novo) + teste
**Depends on**: T04
**Reuses**: `passwordChangeRefusal` (T02), `authErrorMessage`, `updatePassword` existente
**Requirement**: `USR-09`, `USR-10`, `USR-11`, `USR-12`, `USR-23`, `USR-24`

**Done when**:
- [ ] `changeOwnPassword(current, next)` faz recusa local → `signInWithPassword` → `updateUser`, nessa ordem
- [ ] Caso asserindo que senha atual errada **não** chama `updateUser` e **não** desloga
- [ ] Caso asserindo que as recusas locais não fazem **nenhuma** chamada de rede (`L-004`)
- [ ] Toda mensagem vem de `authErrorMessage` — caso provando que `error.message` cru não chega à tela
- [ ] Sucesso mostra confirmação **em texto visível**, e o caso assere o literal (`L-036`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` **e** `pnpm --filter @estrelinha/core test`

**Tests**: unit (RTL)
**Gate**: full

---

### T21: `AdminAccountPage` — `/admin/conta`

**What**: a tela de quem está logada, montando o cartão de senha.
**Where**: `apps/backoffice/src/pages/admin/AdminAccountPage.tsx` (novo) + teste
**Depends on**: T20
**Reuses**: `PageHeader`, `FormCard`
**Requirement**: `USR-09`

**Done when**:
- [ ] Mostra e-mail e nome de quem está logada
- [ ] **A página real monta `<ChangePasswordCard />`** — apagá-lo da página reprova o teste
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit (RTL)
**Gate**: quick

---

### T22: `ForgotPasswordFlow`

**What**: os três passos da recuperação (e-mail → código → senha nova).
**Where**: `apps/backoffice/src/features/account/ui/ForgotPasswordFlow.tsx` (novo) + teste
**Depends on**: T21
**Reuses**: `resetPassword`, `verifyRecoveryCode`, `updatePassword` do `AuthContext` (já existem, hoje
**sem chamador no painel**); `passwordChangeRefusal` para a senha nova
**Requirement**: `USR-39`, `USR-40`, `USR-41`, `USR-43`

**Done when**:
- [ ] Confirma o envio **nomeando o endereço** — caso asserindo o literal com o e-mail dentro
- [ ] Código errado/expirado ⇒ mensagem de `authErrorMessage`, e dá para pedir outro **sem recarregar**
- [ ] A senha nova passa pelas mesmas recusas de `USR-11` e `USR-23`
- [ ] Dá para voltar ao formulário de entrar em qualquer passo (`USR-43`)
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit (RTL)
**Gate**: quick

---

### T23: ligar a recuperação em `/admin/login`

**What**: o botão e o desfecho compartilhado com o login normal.
**Where**: `apps/backoffice/src/pages/admin/AdminLoginPage.tsx` (modifica), `AdminLoginPage.test.tsx`
**Depends on**: T22
**Reuses**: o efeito `entrando`/`authLoading` que **já existe** na página
**Requirement**: `USR-42`, `USR-43`

**Done when**:
- [ ] **A página real monta `<ForgotPasswordFlow />`** — apagá-lo da página reprova o teste
- [ ] O desfecho reusa o efeito existente: admin vai para `/admin`; conta sem papel lê `Esta conta não tem acesso ao painel.` — caso para **os dois**
- [ ] Nenhuma segunda cópia da regra de "para onde ir depois de entrar"
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit (RTL)
**Gate**: quick

---

### T24: navegação — dois itens no rodapé e duas rotas

**What**: `footerNavItems` ganha dois destinos; `App.tsx` ganha duas rotas sob `RequireAdmin`.
**Where**: `apps/backoffice/src/widgets/admin-layout/model/navItems.ts`,
`apps/backoffice/src/app/App.tsx`, `navItems.test.ts` (modifica)
**Depends on**: T19, T23
**Reuses**: `NavRail` **deriva** a lista — não precisa de mudança (`USR-38`)
**Requirement**: `USR-36`, `USR-37`, `USR-38`

**Done when**:
- [ ] `/admin/usuarios` e `/admin/conta` em `footerNavItems`, **fora** de `navGroups`
- [ ] A âncora de `navItems.test.ts` (`toEqual(['/admin/configuracoes'])`) é **reescrita para os três**, não afrouxada para `toContain`
- [ ] Caso bidirecional: as rotas novas existem em `App.tsx` **e** toda entrada do rodapé é rota
- [ ] `NavRail.test.tsx` continua verde **sem edição** — a âncora dele deriva da fonte
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test --testTimeout=20000`

**Tests**: unit
**Gate**: quick

---

### T25: guarda — a chave de servidor fora do navegador

**What**: o teste que recusa `service_role` e `auth.admin.` em `apps/**`.
**Where**: `apps/store/src/shared/lib/__tests__/chaveDeServidorForaDoNavegador.test.ts` (novo)
**Depends on**: T24
**Reuses**: `freeShippingSingleOwner.test.ts` (âncora dupla, remoção de comentário, sensores)
**Requirement**: `USR-25`

**Done when**:
- [ ] Varre `apps/**` (os **dois** apps) e recusa `SUPABASE_SERVICE_ROLE_KEY`, `service_role` e `auth.admin.`
- [ ] **Âncora dupla**: arquivos lidos **e** o escopo nomeando um arquivo de cada app (`L-035`)
- [ ] Remoção de comentário de linha **e** de bloco na **mesma** varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`)
- [ ] Sensores: CRLF, LF, o glob de dois asteriscos, e **um por forma proibida** — mais o inverso, provando que `functions.invoke('admin-users…')` **não** é acusado
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit
**Gate**: quick

---

### T26: baselines, decisão e handoff

**What**: fechar a feature nos documentos, com números **medidos**.
**Where**: `CLAUDE.md` (raiz), `.specs/STATE.md` (`AD-034` + handoff), `supabase/CLAUDE.md`,
`apps/backoffice/CLAUDE.md`
**Depends on**: T25
**Requirement**: — (fecho)

**Done when**:
- [ ] Os cinco workspaces medidos **um por vez**, com exit code capturado **fora de pipe**, e a tabela de baselines atualizada com o número medido (nunca somado de memória)
- [ ] Linha nova na tabela *Os guardas* para os dois guardas novos
- [ ] `AD-034` escrita: toda operação que exige `service_role` passa por edge function com `has_role` manual
- [ ] Dívidas declaradas: **sem prova em navegador**, e `A-06` (revogar não derruba sessão)
- [ ] `pnpm build` verde nos dois apps; `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` nos dois
- [ ] `git diff --name-only` confirma `packages/core/src/payment/**` sem uma linha alterada

**Tests**: none (documentação)
**Gate**: build

---

## Protocolo de commits (sobrepõe o padrão da Skill)

O `CLAUDE.md` deste projeto manda **não** criar commit atômico por task. Os commits completos da
implementação saem **de uma vez, ao fim** (decisão do usuário de 2026-08-15, que fechou a `BL-012`).
O custo é conhecido e aceito: perde-se a correspondência 1:1 entre commit e "done when".

**Os gates por task continuam valendo integralmente** — só o commit é que espera.

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6 → Fase 7

Fase 1:  T01 ─→ T02 ─→ T03 ─→ T04
Fase 2:  T05 ─→ T06
Fase 3:  T07 ─→ T08 ─→ T09
Fase 4:  T10 ─→ T11 ─→ T12 ─→ T13 ─→ T14 ─→ T15
Fase 5:  T16 ─→ T17 ─→ T18 ─→ T19
Fase 6:  T20 ─→ T21 ─→ T22 ─→ T23
Fase 7:  T24 ─→ T25 ─→ T26
```

**Empacotamento em lotes (~7 tasks):** 26 tasks ⇒ **4 lotes**.

| Lote | Fases | Tasks | Total |
| --- | --- | --- | --- |
| 1 | 1 + 2 | T01–T06 | 6 |
| 2 | 3 + 4 | T07–T15 | 9 |
| 3 | 5 + 6 | T16–T23 | 8 |
| 4 | 7 | T24–T26 | 3 |

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T01–T03 | uma função (ou um grupo coeso) por task, mesmo arquivo | ✅ |
| T04 | um barrel + um guarda | ✅ |
| T05 | uma migration | ✅ |
| T06 | um guarda | ✅ |
| T07 | uma extensão de dublê | ✅ |
| T08 | um esqueleto de handler | ✅ |
| T09 | um wiring + uma entrada de config | ✅ |
| T10–T15 | **uma action por task** | ✅ |
| T16–T19 | um hook / um diálogo / um diálogo / uma página | ✅ |
| T20 | uma função + um componente — **coeso por necessidade** (`packages/auth` sem runner) | ⚠️ OK |
| T21–T23 | uma página / um componente / uma fiação | ✅ |
| T24 | uma config de navegação (dois arquivos, uma decisão) | ✅ |
| T25 | um guarda | ✅ |
| T26 | documentação | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | (início Fase 1) | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | T02 | T02 → T03 | ✅ |
| T04 | T03 | T03 → T04 | ✅ |
| T05 | — | (início Fase 2) | ✅ |
| T06 | T05 | T05 → T06 | ✅ |
| T07 | — | (início Fase 3) | ✅ |
| T08 | T07 | T07 → T08 | ✅ |
| T09 | T08 | T08 → T09 | ✅ |
| T10 | T09 | T09 → T10 (Fase 3 → Fase 4) | ✅ |
| T11–T15 | a anterior | cadeia da Fase 4 | ✅ |
| T16 | T15 | T15 → T16 (Fase 4 → Fase 5) | ✅ |
| T17–T19 | a anterior | cadeia da Fase 5 | ✅ |
| T20 | **T04** | Fase 1 → Fase 6 — depende para trás, atravessando fases | ✅ |
| T21 | T20 | T20 → T21 | ✅ |
| T22 | T21 | T21 → T22 | ✅ |
| T23 | T22 | T22 → T23 | ✅ |
| T24 | **T19, T23** | Fase 5 e Fase 6 → Fase 7 | ✅ |
| T25 | T24 | T24 → T25 | ✅ |
| T26 | T25 | T25 → T26 | ✅ |

Nenhuma task depende de fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01–T03 | Regra pura (`core`) | unit | unit | ✅ |
| T04 | Regra pura + guarda | unit | unit | ✅ |
| T05 | Migration | unit (guarda) | **none** + probe SQL | ⚠️ **ver nota** |
| T06 | Guarda de varredura | unit | unit | ✅ |
| T07 | Dublê de teste | integration | integration | ✅ |
| T08 | Handler | integration | integration | ✅ |
| T09 | Wiring de function | **none** | none | ✅ |
| T10–T15 | Handler | integration | integration | ✅ |
| T16 | Hook de dados | unit | unit | ✅ |
| T17–T19 | Componente/página | unit (RTL) | unit (RTL) | ✅ |
| T20 | Componente + `AuthContext` | unit (RTL) | unit (RTL) | ✅ |
| T21–T23 | Componente/página | unit (RTL) | unit (RTL) | ✅ |
| T24 | Config de rota | unit | unit | ✅ |
| T25 | Guarda de varredura | unit | unit | ✅ |
| T26 | Documentação | none | none | ✅ |

> **Nota sobre T05/T06** — o par foi **deliberadamente separado**, e não é adiamento de teste. O par
> `migration` + `guarda que lê a migration do disco` é o molde deste repositório
> (`homeSections.test.ts`, `menuSchema.test.ts`, `materialTransitions.test.ts`): o guarda só pode ser
> escrito **contra o arquivo que existe**, e escrevê-lo na mesma task tornaria impossível provar sua
> sensibilidade por injeção de mutação no arquivo real. T05 não sai sem verificação — ela é validada
> por **probe SQL contra o banco local** (`AD-012`: "prove que ela grava"), que é uma verificação mais
> forte que teste de unidade para esta camada. T06 vem imediatamente depois, na mesma fase.
