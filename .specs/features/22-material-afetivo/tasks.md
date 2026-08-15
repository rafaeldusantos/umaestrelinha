# 22 · Material Afetivo — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: [`design.md`](./design.md)
**Spec**: [`spec.md`](./spec.md)
**Status**: **T1–T21 implementadas** em 2026-08-09. Gate de fecho medido: `turbo run test --force`
exit 0 (capturado de verdade, nunca por `| tail`) · **3.983 testes em 221 arquivos** · lint **30 err
/ 8 warn** (baseline exata) · `tsc` **0 · 0 · 0** · `packages/core/src/payment/` intocado.
**Pendentes**: o Verifier independente (`validation.md`) e os commits, os dois do orquestrador — a
árvore está suja de propósito, pela convenção de commit do projeto.

**Duas correções de rota durante a execução, registradas em vez de silenciadas:**

- **T16** — `OrderMaterialBlock` chamava `useSetMaterialTracking` **antes** do `return null`, o que
  obrigava toda página que o montasse a ter `QueryClientProvider` mesmo em pedido sem material. Isso
  derrubou 17 testes da confirmação. O formulário virou componente próprio (`MaterialTrackingForm`) e
  o bloco sai antes de qualquer hook de dados.
- **T8/T9** — a prova das duas superfícies vivia num arquivo em `entities/` que importava de
  `widgets/`, ou seja **era** a violação de fronteira que o lint acusa. Partida em dois:
  `MaterialSurfaces.test.tsx` fica com o que é de `entities`, e
  `widgets/product-buy-bar/ui/__tests__/ProductBuyBarMaterial.test.tsx` com a barra fixa.

**Convenção de commit do projeto** (`CLAUDE.md`): **não** criar commits atômicos durante a
implementação. Aguardar a conclusão e gerar os commits completos de uma vez — isso **sobrepõe** a
regra "um commit por task" da Skill.

---

## Test Coverage Matrix

> Gerada do codebase e das guidelines do projeto. **Guidelines encontradas**: `CLAUDE.md` (seções
> *Os guardas*, *Convenções*, *Estado conhecido / dívidas*), `apps/{store,backoffice}/vitest.config.ts`,
> `packages/core/vitest.config.ts`, `supabase/vitest.config.ts`, `tools/catalog-import/vitest.config.ts`.
> Nenhum threshold de cobertura configurado — o padrão do projeto é **teste que lê o fonte do disco,
> com âncora de contagem**, e é ele que vale aqui.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura compartilhada (`packages/core/src/material`) | unit | Todos os ramos; 1:1 com as ACs; **lista enumerada tem uma asserção por elemento**; tabela de transições asserida célula a célula | `packages/core/src/material/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Regra pura da loja (`entities/*/lib`, `shared/lib`) | unit | Todos os ramos | `apps/store/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| Estado de compra / store Zustand | unit | Caminho feliz + colapso indevido de linha + migração de versão | `apps/store/src/**/__tests__/*.test.ts(x)` | `pnpm --filter @estrelinha/store test` |
| Hook de dados (`entities/*/api`) | unit | Caminho feliz + erro + **prova de que a RPC recebeu só o que devia** | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| Página / rota (`pages`, `app/App.tsx`) | unit (RTL + `MemoryRouter`) | Monta certo + estado ausente + **viewport 390 sem scroll horizontal** onde houver linha de itens | `apps/store/src/**/__tests__/*.test.tsx` | `pnpm --filter @estrelinha/store test` |
| **Guarda de arquivo do disco** (`shared/lib/__tests__`) | unit | **Âncora dupla obrigatória** — arquivo lido não-vazio **E** nº de itens encontrados; a régua nunca é o objeto medido | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test` |
| UI de formulário (backoffice `features/*`, `pages/admin/*`) | unit (RTL) | Aceite + recusa + **ação não disparada** na recusa | `apps/backoffice/src/**/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test` |
| Edge function (`supabase/functions/**`) | unit (vitest, deps injetadas — `AD-004`) | Pré-condição fora do estado ⇒ 422 **antes** do claim; falha do provedor não altera estado | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Mapeamento/escrita do importador | unit | Todos os ramos; **semente não sobrescreve linha já decidida** | `tools/catalog-import/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/catalog-import test` |
| Migration / schema / RPC | none como unidade — **prova é probe HTTP contra o banco local** (`AD-012`) | `Prefer: return=representation`; probe que só olha status "provaria" coluna inexistente | `supabase/migrations/*.sql` | `supabase db reset` + `curl` registrado no `Done when` |
| Documentação (`CLAUDE.md`, `.specs/**`) | none | — | — | build gate |

## Gate Check Commands

| Gate Level | Quando usar | Comando |
| --- | --- | --- |
| **Quick** | Task com teste de unidade num workspace só | `pnpm --filter @estrelinha/<workspace> test` |
| **Full** | Task que cruza workspace ou mexe em tipo | `pnpm --filter @estrelinha/<workspace> test` **e** `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` |
| **Build** | Fecho de fase e fecho da feature | `turbo run test --force` (capturar o exit code **de verdade** — `\| tail` devolve o do `tail`) · `pnpm lint` · `npx tsc --noEmit` nos três projetos |

**Baseline a bater (fecho da `23`, `CLAUDE.md`):**

| | valor |
| --- | ---: |
| Testes | **3.672** em 211 arquivos — store 1256/98 · backoffice 1090/67 · core 799/27 · functions 258/4 · catalog-import 269/15 |
| Lint | 30 erros / 8 warnings — o gate é **"sem erros novos"** |
| Tipos | store 0 · backoffice 0 · catalog-import 0 — **zero é a baseline** |

> **`packages/core/src/payment/**` não pode mudar de uma linha.** Conferido por `git status` no gate
> de fecho. O crescimento de `core` nesta feature vem **só** de `material/`.

---

## Execution Plan

Fases são ordenadas e rodam em sequência; dentro da fase, as tasks rodam em ordem.

### Fase 1 · A regra, em core
```
T1
```

### Fase 2 · Banco e o guarda entre SQL e TypeScript
```
T2 → T3
```

### Fase 3 · Cadastro: quem determina o material
```
T4 → T5
```

### Fase 4 · A loja: saber, escolher, comprar
```
T6 → T7 → T8 → T9 → T10 → T11 → T12
```

### Fase 5 · E-mail `material_received`
```
T13 → T14
```

### Fase 6 · O pedido da cliente
```
T15 → T16
```

### Fase 7 · A fila da Adri
```
T17 → T18 → T19
```

### Fase 8 · Catálogo real e documentação
```
T20 → T21
```

---

## Task Breakdown

### T1: `@estrelinha/core/material` — a regra, pura

**What**: O módulo que concentra tudo o que é decidível sobre material e gravação, sem React, sem
Supabase, sem I/O — para que os guardas possam importá-lo de dentro de um teste que lê arquivo do
disco, e para que loja, admin, edge function e importador leiam **a mesma** regra.
**Where**: `packages/core/src/material/{material.ts,index.ts}` · `packages/core/src/material/__tests__/material.test.ts` · export `"./material"` em `packages/core/package.json` · `tsconfig.base.json` paths
**Depends on**: None
**Reuses**: o formato `refusal → string | null` de `reservedSlugRefusal` e `menuSlotRefusal`
**Requirement**: `MAT-02`, `MAT-03`, `MAT-07`, `MAT-08`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `MATERIAL_KINDS` = `leite_materno · cabelo · cinzas · pelo_pet · dente_leite · coto_umbilical · placenta · flores · penas · outro` — **asserido elemento a elemento** (10 asserções, não `toHaveLength`)
- [ ] `MATERIAL_KIND_LABELS` cobre os 10, em pt-BR, **sem linguagem festiva nem eufemismo** (`CLAUDE.md`: o registro é memorial)
- [ ] `MATERIAL_STATUSES` = `nao_aplicavel · aguardando_material · material_enviado · material_recebido · em_producao`, com rótulos
- [ ] `MATERIAL_TRANSITIONS` reproduz a tabela do design **célula a célula** — inclusive `aguardando_material → material_recebido` (o salto direto, que é obrigatório porque informar rastreio é opcional)
- [ ] `materialTransitionRefusal(from, to)` devolve **`string | null`** — nunca união discriminada por literal booleano (`strictNullChecks: false` não estreita; TS2339)
- [ ] `materialTransitionRefusal(x, x)` devolve `null` para **todo** estado — transição para o próprio estado é sucesso, é o que faz a concorrência convergir
- [ ] `materialTransitionRefusal('nao_aplicavel', 'material_recebido')` devolve motivo **legível pela Adri**, não código
- [ ] `initialMaterialStatus([])` ⇒ `nao_aplicavel`; um item com `requires_material: true` **e lista vazia** ⇒ `aguardando_material` (é a peça de material livre — a fila é sobre "algo está a caminho", não sobre saber o quê)
- [ ] `materialSummary(false, [])` ⇒ `''` · `materialSummary(true, [])` ⇒ **`'a combinar'`** · `materialSummary(true, ['cabelo','coto_umbilical'])` ⇒ os dois rótulos
- [ ] `requiresMaterial(row)` trata `null` como `false` — **nenhum consumidor compara `=== false` cru** (D1 do design)
- [ ] `hasEngraving(optionValues)` casa por nome **normalizado** (minúsculo, sem acento): `Com gravação`, `com gravacao` e `COM GRAVAÇÃO` com valor `Sim`/`sim` ⇒ `true`; `Não` ⇒ `false`; eixo ausente ⇒ `false`
- [ ] `DEFAULT_ENGRAVING_MAX_CHARS === 20`; `engravingLimit(null)` cai nele; `engravingLimit(0)` também (0 não é "sem limite")
- [ ] `normalizeEngraving('   ')` ⇒ `null` · `normalizeEngraving(' Ana ')` ⇒ `'Ana'` · `normalizeEngraving(null)` ⇒ `null`
- [ ] `engravingRefusal(texto, limite)`: acima do limite ⇒ motivo com **o número**; no limite exato ⇒ `null`; vazio ⇒ `null` (gravação é opcional)
- [ ] `inferMaterial(name)` acerta os casos medidos da spec: "…com Cabelo **e** Coto Umbilical" ⇒ **os dois**; "leite materno" ⇒ `leite_materno`; "cinzas" ⇒ `cinzas`; "pet" ⇒ `pelo_pet`; "dente de leite" ⇒ `dente_leite` (**e não** `leite_materno` — a armadilha do substrato "leite")
- [ ] `inferMaterial('Corrente de prata 925')` ⇒ `{ requires: false, kinds: [] }`
- [ ] Gate: `pnpm --filter @estrelinha/core test` · `npx tsc --noEmit -p apps/store/tsconfig.app.json` segue em 0

**Tests**: unit · **Gate**: full
**Commit**: `feat(material): regra pura de material afetivo e gravacao em @estrelinha/core`

---

### T2: Migration — colunas, constraints e as duas RPCs

**What**: O schema do material e os dois únicos caminhos de escrita de estado.
**Where**: `supabase/migrations/20260811120000_22-material-afetivo.sql`
**Depends on**: T1
**Reuses**: molde de `apply_payment_approval` (`security definer` + `set search_path` + `revoke all` + `grant` mínimo) e o `check` de `order_emails.type`
**Requirement**: `MAT-02`, `MAT-05`, `MAT-07`, `MAT-08`, `MAT-09`, `MAT-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `products`: `requires_material boolean` (**nullable, sem default** — `null` = nunca decidido), `material_kinds text[] not null default '{}'`, `engraving_max_chars integer`
- [ ] `check` de `material_kinds <@` a lista dos 10 — valor torto é recusado pelo **banco**, não vira rótulo em branco na loja
- [ ] `check` de `engraving_max_chars between 1 and 200` (nullable passa)
- [ ] `orders`: `material_status text not null default 'nao_aplicavel'` com `check` nos 5 estados, `material_tracking_code text`, `material_received_at timestamptz`
- [ ] **Comentário na coluna** dizendo que `material_tracking_code` é a remessa **de entrada** e `tracking_code` a **de saída** — reusar a segunda faria "postamos sua joia" sair com o código do envelope da cliente
- [ ] `order_items`: `requires_material boolean not null default false`, `material_kinds text[] not null default '{}'`, `engraving_text text`
- [ ] Índice parcial `on orders(material_status) where material_status <> 'nao_aplicavel'` — a fila é o caso, o resto é ruído
- [ ] `order_emails.type` check passa a aceitar `material_received` (drop + add da constraint, idempotente)
- [ ] `set_material_status(p_order_id uuid, p_status text) returns jsonb` — `{ok, status, reason}`; exige `has_role(auth.uid(),'admin')`; `where material_status = any(<origens permitidas>)`; grava `material_received_at = now()` ao entrar em `material_recebido`; **`p_status` fora da lista ⇒ `ok:false`**, nunca escrita
- [ ] `set_material_tracking(p_order_id uuid, p_code text) returns jsonb` — dona do pedido (`customers.user_id = auth.uid()`) **ou** admin; escreve `material_tracking_code`; avança para `material_enviado` **somente** de `aguardando_material`; de `material_recebido`/`em_producao` grava o código e **não move o estado**; de `nao_aplicavel` recusa
- [ ] `revoke all … from public, anon` + `grant execute … to authenticated` nas duas — `anon` não alcança nenhuma
- [ ] **Nenhuma policy de `UPDATE` em `orders` foi criada** (PAY-10 intacta) — conferido por `select count(*) from pg_policies where tablename='orders' and cmd='UPDATE'` ⇒ **0**
- [ ] `supabase db reset` exit 0
- [ ] **Probe HTTP** (`AD-012`) registrado no `validation.md`: `PATCH /products?id=eq.<id>` com `Prefer: return=representation` devolvendo os três campos persistidos; `POST /rpc/set_material_status` recusando de `nao_aplicavel` e aceitando o salto `aguardando_material → material_recebido`; `POST /rpc/set_material_tracking` como anon ⇒ negado
- [ ] Gate: `supabase db reset` + probes

**Tests**: none como unidade — probe HTTP · **Gate**: build
**Commit**: `feat(db): schema do material afetivo e RPCs guardadas de estado e rastreio`

---

### T3: `materialTransitions.test.ts` — o guarda entre o SQL e o TypeScript

**What**: O teste que impede a máquina de estado de existir em duas versões. Lê a **migration do
disco** e compara os estados de origem aceitos pelo SQL com `MATERIAL_TRANSITIONS` do core.
**Where**: `apps/store/src/shared/lib/__tests__/materialTransitions.test.ts`
**Depends on**: T1, T2
**Reuses**: molde de `vercelRedirects.test.ts` e `palette.test.ts` (leitura de disco + âncora dupla)
**Requirement**: `MAT-08`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **Âncora dupla**: o teste falha se o arquivo lido não contiver `set_material_status` **e** se o nº de estados extraídos do SQL for menor que 4 — sem isso, um caminho errado varre zero e passa em silêncio, que é a pior falha possível num guarda
- [ ] O caminho da migration é escrito **por extenso**; a régua nunca é derivada da constante que ela mede
- [ ] Todo estado de origem citado no `where` de `set_material_status` existe em `MATERIAL_STATUSES`
- [ ] O conjunto de origens que o SQL aceita para `material_recebido` é **exatamente** `{aguardando_material, material_enviado, material_recebido}` — o salto direto incluído
- [ ] O SQL de `set_material_tracking` **não** contém `payment_status`, `total`, `subtotal` nem `paid_at` — a RPC escreve o campo de rastreio e nada mais (`MAT-11 AC 11`)
- [ ] Teste sintético prova que o parser **reprova** um SQL divergente (senão uma regex quebrada passaria para sempre)
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `test(material): guarda entre a maquina de estado em SQL e a em TypeScript`

---

### T4: Endereço do ateliê — `store_settings.material` e a aba do admin

**What**: Onde a cliente deve postar, como configuração e não como literal em `.tsx`.
**Where**: `packages/supabase/src/types/settings.ts` · `packages/core/src/hooks/useStoreSettings.ts` · `apps/backoffice/src/pages/admin/AdminSettingsPage.tsx`
**Depends on**: T1
**Reuses**: molde das chaves `general`/`shipping`; `SaveButton`, `FormCard` do backoffice
**Requirement**: `MAT-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `MaterialSettings` = `recipient · street · number · complement · neighborhood · city · state · zip · notes`
- [ ] `DEFAULT_MATERIAL` com **todos os campos vazios** — endereço inventado é pior que endereço ausente quando o que viaja é insubstituível
- [ ] `SettingsKey` e `SettingsMap` crescem; `useMaterialSettings()` exportado
- [ ] **Sem seed em migration**, e o motivo escrito no tipo: não há valor a semear, então não há o que divergir — `storeSettingsDefaults.test.ts` segue guardando as quatro chaves que **têm** valor no SQL, e não é afrouxado
- [ ] Aba `Material` no `/admin/configuracoes`, entre `Frete` e `Pagamento`, com os campos e o `SaveButton` no molde das outras
- [ ] Teste: salvar grava a chave `material`; campo vazio é preservado como `''`, nunca `undefined`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` em 0

**Tests**: unit (RTL) · **Gate**: full
**Commit**: `feat(admin): endereco de envio do material como configuracao da loja`

---

### T5: `MaterialCard` — o cadastro que determina o material

**What**: O bloco da aba **Geral** do formulário de produto onde a Adri diz se a peça exige material,
quais, e qual o limite de gravação.
**Where**: `apps/backoffice/src/features/product-form/ui/MaterialCard.tsx` (+ teste) · `model/useProductForm.ts` · `model/validateProduct.ts` · `pages/admin/AdminProductFormPage.tsx`
**Depends on**: T1, T2
**Reuses**: `FormCard`, `Switch`, `Checkbox`, `Input`; `setField` do `useProductForm`
**Requirement**: `MAT-02`, `MAT-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ProductFormState` ganha `requires_material: boolean | null`, `material_kinds: MaterialKind[]`, `engraving_max_chars: number | null`
- [ ] `productRowToForm` carrega os três **sem inventar default** — `null` continua `null` (é o marcador de "nunca decidido")
- [ ] `payload` do save grava os três em `products`
- [ ] **"Exige material" e "quais" são dois controles**: o switch liga a exigência; a lista de tipos fica desabilitada enquanto o switch está desligado; **lista vazia com switch ligado é estado VÁLIDO** e a tela diz "o material será combinado no WhatsApp"
- [ ] O campo de limite de gravação aparece **só quando o produto tem o eixo `Com gravação`** (via `hasEngraving` sobre `form.options`) — 35 produtos de 689 o têm, e mostrá-lo nos outros 654 é ruído
- [ ] Placeholder do limite mostra o default (`20`), e o campo vazio grava `null`, não `0`
- [ ] `validateProduct`: limite fora de 1..200 é **erro** apontando para a aba Geral; `material_kinds` com valor fora da lista é erro
- [ ] Teste: switch desligado ⇒ tipos inacessíveis; ligar + não escolher tipo ⇒ **salva** (não bloqueia); produto sem o eixo ⇒ campo de limite ausente do DOM
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` em 0

**Tests**: unit (RTL) · **Gate**: full
**Commit**: `feat(admin): material exigido e limite de gravacao no cadastro do produto`

---

### T6: `/como-enviar-o-material` — a página, e a reserva do endereço

**What**: A página que responde "o que envio e como preparo", com ficha por material e o endereço do
ateliê. E a entrada em `ROUTE_SLUGS`, que é o que impede a rota de encobrir uma categoria homônima.
**Where**: `apps/store/src/pages/HowToSendMaterialPage.tsx` (+ teste) · `apps/store/src/widgets/material-guide/**` · `packages/core/src/routes/routes.ts` · `apps/store/src/app/App.tsx`
**Depends on**: T1, T4
**Reuses**: `useCanonical`, `SectionHeading`, `TAP_ROW`, `useMaterialSettings`
**Requirement**: `MAT-01`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `'como-enviar-o-material'` entra em `ROUTE_SLUGS` **e** a rota entra no `App.tsx` — `reservedSlugs.test.ts` (bidirecional) passa sem ser tocado
- [ ] A página tem: passos, **uma ficha por material** com `id` de âncora igual ao valor do enum (`#leite-materno`, `#cinzas`, …), preparo, postagem, endereço e checklist
- [ ] Cada uma das **10** fichas é asserida no teste — lista enumerada pede uma asserção por elemento
- [ ] O bloco de endereço **não renderiza** enquanto `street` estiver vazio, e no lugar aparece o convite a falar pelo WhatsApp — endereço pela metade é material perdido
- [ ] `useCanonical('/como-enviar-o-material')`
- [ ] Link no rodapé da loja
- [ ] **390×844**: nenhuma pílula quebra em duas linhas, nenhum bloco estoura a largura, `overflow-x` do body é 0 (conteúdo largo scrolla dentro do próprio container)
- [ ] Vocabulário conferido contra `CLAUDE.md`: nada de emoji comemorativo, urgência fabricada ou trocadilho
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (RTL) · **Gate**: quick
**Commit**: `feat(loja): pagina Como enviar o material, com ficha por material e endereco`

---

### T7: `useProductPurchase` — a gravação entra no estado que já é único

**What**: O texto de gravação, o limite e a recusa, dentro do **mesmo** estado que a coluna de
informação e a barra fixa já dividem.
**Where**: `apps/store/src/entities/product/model/useProductPurchase.tsx` · `__tests__/useProductPurchase.test.tsx`
**Depends on**: T1
**Reuses**: `findVariant`, `canAddSelection` — nenhum dos dois muda
**Requirement**: `MAT-03`, `MAT-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `engraving`, `setEngraving`, `engravingEnabled`, `engravingLimit`, `engravingRefusal` no retorno
- [ ] `engravingEnabled` deriva da **variação escolhida** (`hasEngraving(variant.option_values)`), não do produto — o mesmo produto tem linhas `Sim` e `Não`
- [ ] Trocar de `Sim` para `Não` **limpa** o texto: um texto pendurado numa variação que não grava iria para o pedido e seria gravado na peça
- [ ] `canAdd` passa a exigir `engravingRefusal === null`
- [ ] `add()` com texto acima do limite: **não** adiciona e mostra o motivo
- [ ] `add()` passa `engravingText` normalizado (só espaços ⇒ `null`) para o `cartStore`
- [ ] Produto **sem** o eixo: `engravingEnabled === false` e `canAdd` não muda de resultado — nenhuma regressão nos 654 produtos sem gravação
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(loja): texto de gravacao no estado unico de compra do produto`

---

### T8: `ProductInfo` — o aviso de material e o campo de gravação

**What**: A cliente descobre **antes de comprar** o que precisa enviar, e digita a gravação.
**Where**: `apps/store/src/entities/product/ui/ProductInfo.tsx` · `__tests__/ProductInfo.test.tsx`
**Depends on**: T6, T7
**Reuses**: `materialSummary`, `TAP_ROW`; tokens `--estrelinha-*`
**Requirement**: `MAT-02`, `MAT-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Produto que exige **e diz quais**: declara os materiais e leva à **ficha correspondente** (`/como-enviar-o-material#<kind>`), não ao topo da página
- [ ] Produto que exige **sem dizer qual**: diz que o material é **combinado com a Adri pelo WhatsApp**, e a compra segue sem passo extra. A loja **nunca** pede que a cliente escolha
- [ ] Produto que **não** exige: **nenhum** aviso no DOM, e o fluxo de compra idêntico ao de hoje
- [ ] Campo de gravação só com `Com gravação: Sim`; contador visível `n/limite`; acima do limite o contador muda de tom e o CTA fica desabilitado
- [ ] Contorno do campo é `field` (#8C8073), **nunca** `line` — `fieldBorder.test.ts` varre `<Input>` do shadcn e derruba a suíte se voltar
- [ ] Nenhum texto ouro (`accent`) sobre claro — `accentText.test.ts`
- [ ] Alvo de toque do link da ficha usa `TAP_ROW` (texto em fluxo), não `TAP_44`
- [ ] **390×844**: o aviso não estoura a largura e os materiais quebram em várias linhas sem cortar
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (RTL) · **Gate**: quick
**Commit**: `feat(loja): aviso de material e campo de gravacao na pagina do produto`

---

### T9: `ProductBuyBar` — a mesma verdade, na barra fixa

**What**: A superfície que de fato compra no celular precisa dizer a mesma coisa.
**Where**: `apps/store/src/widgets/product-buy-bar/**` · teste
**Depends on**: T7, T8
**Reuses**: o **mesmo** `purchase` — nenhuma cópia de estado
**Requirement**: `MAT-02`, `MAT-03`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Aviso compacto quando o produto exige material (uma linha, sem quebrar em duas dentro de pílula)
- [ ] Gravação pendente/ inválida: o CTA da barra fica **desabilitado** pelo mesmo `canAdd`, e tocar nele leva ao campo
- [ ] A barra **nunca se esconde** no scroll (o CTA é a finalidade da página) e continua com `BOTTOM_BAR_H`
- [ ] `ownsBottomBar` intocado — o `MobileNav` segue desmontado em `/produtos/*`
- [ ] Teste prova que **as duas superfícies leem o mesmo estado**: mudar a gravação reflete nas duas
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (RTL) · **Gate**: quick
**Commit**: `feat(loja): barra de compra reflete material e gravacao`

---

### T10: `cartStore` — duas gravações são duas linhas

**What**: A chave da linha do carrinho passa a distinguir o texto de gravação.
**Where**: `apps/store/src/entities/cart/model/cartStore.ts` · `__tests__/cartStore.test.ts`
**Depends on**: T7
**Reuses**: `itemKey`/`keyOf` — a estrutura não muda, só o que entra na chave
**Requirement**: `MAT-04`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CartItem.engravingText: string | null`
- [ ] `itemKey` inclui o texto normalizado nos **dois** ramos (`v:` e `p:`)
- [ ] Mesmo produto + mesma variação + gravações **diferentes** ⇒ **duas linhas**; gravações **iguais** ⇒ quantidade 2
- [ ] `removeItem` e `updateQuantity` acertam a linha certa quando há duas gravações — é aqui que a chave de `variantId` já custou dois defeitos à loja anterior
- [ ] `version` 2 → **3**, e o `migrate` **preserva** os itens acrescentando `engravingText: null`. Diferente do salto 1 → 2, que descartava: lá faltava a variação e o pedido nascia impagável; aqui falta um campo opcional cujo default correto é conhecido — teste prova que uma sacola v2 sobrevive
- [ ] `subtotal()` inalterado — gravação **não** é linha de preço; quem precifica é a variação
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(carrinho): gravacao distingue a linha do item`

---

### T11: A gaveta mostra o que vai ser gravado

**What**: Sem isto, duas linhas idênticas na tela e a cliente não sabe qual é qual.
**Where**: `apps/store/src/widgets/cart-drawer/**` · teste
**Depends on**: T10
**Reuses**: a linha de item que já mostra `variantLabel`
**Requirement**: `MAT-04`, `MAT-05`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Linha com gravação mostra o texto, abaixo do `variantLabel`, truncado com `title` completo
- [ ] Linha sem gravação não ganha espaço vazio
- [ ] **390px**: o texto longo não empurra o preço para fora
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit (RTL) · **Gate**: quick
**Commit**: `feat(carrinho): gaveta mostra o texto de gravacao de cada linha`

---

### T12: O pedido nasce com o material — snapshot e estado inicial

**What**: `order_items` guarda o que foi exigido e o que foi gravado; `orders` nasce na fila ou fora
dela.
**Where**: `apps/store/src/entities/order/api/useOrders.ts` · `apps/store/src/pages/CheckoutPage.tsx` · testes
**Depends on**: T1, T2, T10
**Reuses**: `CreateOrderInput` (só cresce), `initialMaterialStatus`
**Requirement**: `MAT-05`, `MAT-06`, `MAT-07`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CreateOrderInput.items[]` ganha `requires_material`, `material_kinds`, `engraving_text`
- [ ] `CreateOrderInput` ganha `material_status`, calculado por `initialMaterialStatus` sobre os itens
- [ ] O `CheckoutPage` monta o snapshot **do produto no carrinho**, não de uma releitura — o pedido é foto, e mudar o cadastro depois não pode alterá-lo
- [ ] O **order bump** entra com `requires_material: false` e lista vazia (a oferta aponta para um `product_id`, e o bump nunca é peça de material)
- [ ] Um item que exige ⇒ pedido em `aguardando_material`; nenhum ⇒ `nao_aplicavel`; **exige sem dizer qual também entra na fila**
- [ ] **`MAT-06`, asserido explicitamente**: `totals.total`, `subtotal` e `promotion_discount` são **idênticos** com e sem material no item — nenhum preço é calculado no front por causa desta feature
- [ ] Gate: `pnpm --filter @estrelinha/store test` · `npx tsc --noEmit -p apps/store/tsconfig.app.json` em 0

**Tests**: unit · **Gate**: full
**Commit**: `feat(pedido): snapshot de material e gravacao no item, e estado inicial da fila`

---

### T13: `material_received` — o template

**What**: O quinto e-mail da loja, no mesmo desenho dos outros quatro.
**Where**: `supabase/functions/send-email/templates.ts` · `__tests__/templates.test.ts`
**Depends on**: T1
**Reuses**: `emailShell`, `itemsTable`, `ctaButton`, `highlightBox`, `escapeHtml` de `layout.ts`
**Requirement**: `MAT-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `EmailType` e `EMAIL_TYPES` ganham `material_received` — e `EMAIL_TYPES` continua sendo a **fonte única** do allow-list do handler
- [ ] Assunto e corpo em tom memorial: confirma que o material **chegou** e que a produção começa. **Sem** emoji comemorativo, sem exclamação festiva
- [ ] **Georgia** no display e **Helvetica/Arial** no corpo, tudo inline, em `<table>`, sem `<style>`, sem `<link>`, sem `background-image` — e-mail não carrega webfont, e a pilha de fallback é a decisão de design
- [ ] O escape segue a convenção do arquivo: título e lead montados como **texto puro** e escapados só na composição do HTML; a versão `text` recebe o original (senão "Tom & Jerry" vira "Tom &amp; Jerry" no texto puro)
- [ ] CTA aponta para `/conta`, não `/pedido/:id` — a rota do pedido exige sessão
- [ ] Teste: os 4 tipos anteriores seguem renderizando **sem mudança de assunto**
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(email): template transacional de material recebido`

---

### T14: `sender.ts` — a pré-condição dirigida por estado

**What**: A function **relê** o pedido e recusa quando o estado não casa com o tipo (`AD-007`).
**Where**: `supabase/functions/send-email/sender.ts` · `__tests__/sender.test.ts`
**Depends on**: T2, T13
**Reuses**: `preconditionFailure`, `claim_order_email` (`AD-006`) — a idempotência sai de graça
**Requirement**: `MAT-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `ORDER_COLUMNS` ganha `material_status`
- [ ] `preconditionFailure('material_received', order)` ⇒ `'material_not_received'` quando o estado não é `material_recebido`; `null` quando é
- [ ] A recusa sai **antes do claim** — é isso que mantém a tentativa retentável quando o estado completar depois
- [ ] Disparo duplicado ⇒ **um** e-mail (o claim atômico), provado com o dublê de `supabase-js`
- [ ] Falha do provedor ⇒ `order_emails` em `failed`, e **nenhuma** escrita em `orders`
- [ ] Os testes dos 3 tipos anteriores passam sem alteração
- [ ] Gate: `pnpm --filter @estrelinha/functions test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(email): pre-condicao de estado do material no motor de envio`

---

### T15: `useSetMaterialTracking` — a escrita da cliente, por RPC

**What**: O hook que chama a RPC. Nenhuma policy de `UPDATE` em `orders` é aberta.
**Where**: `apps/store/src/entities/order/api/useSetMaterialTracking.ts` (+ teste) · `entities/order/index.ts` · `useOrder.ts` (tipo)
**Depends on**: T2
**Reuses**: `useOrder`, React Query
**Requirement**: `MAT-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `OrderDetail` ganha `material_status`, `material_tracking_code`, `material_received_at`
- [ ] O hook chama **`rpc('set_material_tracking', { p_order_id, p_code })`** e nada mais — teste assere o nome e o payload exato
- [ ] Nenhuma chamada `from('orders').update(...)` em `apps/store` — asserido por varredura no teste
- [ ] Sucesso invalida `['orders','id',id]`; recusa devolve o motivo sem lançar
- [ ] Código vazio/só espaços não chama a RPC
- [ ] Gate: `pnpm --filter @estrelinha/store test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(pedido): rastreio da remessa da cliente por RPC, sem abrir UPDATE em orders`

---

### T16: `/pedido/:id` — a cliente diz que postou

**What**: O bloco de material na confirmação, que é a rota que o e-mail manda e que sobrevive ao F5.
**Where**: `apps/store/src/widgets/order-material/**` (+ teste) · `apps/store/src/pages/OrderConfirmationPage.tsx`
**Depends on**: T15
**Reuses**: `MATERIAL_STATUS_LABELS`, `OrderTimeline` (não alterada — as duas máquinas são independentes)
**Requirement**: `MAT-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Pedido `nao_aplicavel` ⇒ **nenhum** bloco de material
- [ ] `aguardando_material` ⇒ campo de código + o que enviar + link para a ficha; gravar move o estado para `material_enviado` na tela
- [ ] Não informar **não trava nada**: o texto diz que é opcional e que ela pode avisar a Adri
- [ ] `material_recebido`/`em_producao` ⇒ o código pode ser registrado, e o estado **não volta**
- [ ] Recusa mostra **motivo visível**, nunca falha em silêncio
- [ ] O estado de **pagamento** na página não muda de aparência por causa do material
- [ ] **390×844**: o campo e o CTA cabem, alvo de toque ≥ 44px, sem scroll horizontal
- [ ] Gate: `pnpm --filter @estrelinha/store test` · `npx tsc --noEmit -p apps/store/tsconfig.app.json` em 0

**Tests**: unit (RTL) · **Gate**: full
**Commit**: `feat(loja): bloco de material e rastreio da remessa em /pedido/:id`

---

### T17: `useAdminOrders` — filtro, contagens e as duas transições

**What**: O hook que a fila usa.
**Where**: `apps/backoffice/src/entities/order/api/useAdminOrders.ts` · `useAdminOrders.test.ts`
**Depends on**: T2
**Reuses**: `fetchStatusCounts` (mesma leitura), Realtime já publicado em `orders`
**Requirement**: `MAT-08`, `MAT-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `materialFilter` / `setMaterialFilter` filtram no servidor (`.eq('material_status', …)`)
- [ ] `materialCounts` por estado, do mesmo `select` que já conta status
- [ ] `setMaterialStatus(id, status)` chama **`rpc('set_material_status')`** e devolve `{ ok, reason }`; recusa **não** altera a lista
- [ ] `setMaterialTracking(id, code)` chama a **mesma** RPC da loja — uma máquina de estado, não duas
- [ ] Transição bem-sucedida para `material_recebido` dispara `sendOrderEmail(id, 'material_received')`, **dentro do mesmo contrato de contenção** do `order_shipped`: devolve booleano, nunca lança, e **falha de e-mail não reverte o estado** (`AD-008`)
- [ ] Teste prova que um `sendOrderEmail` que rejeita **não** propaga erro nem desfaz a transição
- [ ] Nenhum `from('orders').update({ material_status })` — a transição só existe por RPC
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit · **Gate**: quick
**Commit**: `feat(admin): filtro, contagens e transicoes de material nos pedidos`

---

### T18: `AdminOrdersPage` — a fila em um clique

**What**: A fila que **acumula** — o mesmo critério que ordena os eixos da sidebar.
**Where**: `apps/backoffice/src/pages/admin/AdminOrdersPage.tsx` · teste
**Depends on**: T17
**Reuses**: a faixa de filtro por status que já existe
**Requirement**: `MAT-10`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Faixa de filtro por estado de material, com contagem em cada
- [ ] `aguardando_material` alcançável em **um clique** a partir da listagem
- [ ] Coluna/selo de material na linha do pedido, com `nao_aplicavel` **sem selo** (o normal não vira ruído)
- [ ] `Expirado`-style: estados diferentes têm cores diferentes, porque os remédios são diferentes
- [ ] **Sem item novo na sidebar** — `navItems.test.ts` lê o `App.tsx` do disco e compara com `navGroups`; a fila mora dentro de `Pedidos`, que é onde a Adri já olha
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test`

**Tests**: unit (RTL) · **Gate**: quick
**Commit**: `feat(admin): fila de pedidos aguardando material na listagem`

---

### T19: `OrderDetailDialog` — o card de material

**What**: Onde a Adri vê o que o pedido espera e marca que chegou.
**Where**: `apps/backoffice/src/features/order-management/ui/OrderMaterialCard.tsx` (+ teste) · `OrderDetailDialog.tsx`
**Depends on**: T17
**Reuses**: `materialSummary`, `MATERIAL_STATUS_LABELS`, `materialTransitionRefusal`
**Requirement**: `MAT-05`, `MAT-08`, `MAT-10`, `MAT-11`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Lista, por item, o que ele exige — e **"a combinar"** quando exige sem dizer qual, **nunca** uma lista vazia (que se lê como "nenhum material")
- [ ] Mostra o **texto de gravação** de cada item, do snapshot do pedido
- [ ] Estado atual + `material_tracking_code` editável pela Adri (é o caso do WhatsApp)
- [ ] Botão de transição para `material_recebido`, habilitado a partir de `aguardando_material` **e** de `material_enviado`
- [ ] Transição recusada mostra **o motivo** de `materialTransitionRefusal` — não some, não falha calada
- [ ] Pedido `nao_aplicavel` ⇒ card ausente, e tentar a transição por outro caminho é recusado com motivo
- [ ] Pedido **cancelado** ⇒ o card informa e a transição fica indisponível (o material sai da fila)
- [ ] Toast do sucesso **não alega e-mail enviado** quando `sendOrderEmail` devolveu `false`
- [ ] Gate: `pnpm --filter @estrelinha/backoffice test` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` em 0

**Tests**: unit (RTL) · **Gate**: full
**Commit**: `feat(admin): card de material no detalhe do pedido, com transicao guardada`

---

### T20: Importador — a semente que não apaga curadoria

**What**: Fazer os 689 produtos reais nascerem com material, sem nunca sobrescrever o que a Adri
decidiu.
**Where**: `tools/catalog-import/src/write/products.ts` · `src/report.ts` · testes
**Depends on**: T1, T2
**Reuses**: `inferMaterial` (T1); o precedente de `CAMPOS_DE_VITRINE` — campo que a **loja** manda e a origem não
**Requirement**: `MAT-02` (viabilidade no catálogo real)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] **Insert**: `inferMaterial(name)` entra no payload de criação
- [ ] **Update**: os campos de material **não** entram em `catalogoDoProduto` — um passo separado escreve **apenas** onde `requires_material is null`
- [ ] Teste prova as duas direções: linha `null` é semeada; linha já decidida (`true` **ou** `false`) é **preservada**, inclusive quando a inferência discordaria
- [ ] Relatório ganha seção própria (`material semeado: N`), no molde de `CURATED_INACTIVE`/`CURATED_EXCLUDED` — número que ninguém vê é número que ninguém confere
- [ ] `--dry-run` conta sem gravar
- [ ] Idempotência preservada: rodar duas vezes semeia na primeira e **zero** na segunda
- [ ] Gate: `pnpm --filter @estrelinha/catalog-import test` · `npx tsc --noEmit -p tools/catalog-import/tsconfig.json` em 0

**Tests**: unit · **Gate**: full
**Commit**: `feat(catalogo): semeia material afetivo na importacao sem sobrescrever curadoria`

---

### T21: Documentação — `CLAUDE.md`, `STATE.md`, baselines

**What**: Registrar o que passa a valer para toda feature futura, e as baselines medidas.
**Where**: `CLAUDE.md` · `.specs/STATE.md` · `.specs/BACKLOG.md`
**Depends on**: T1–T20
**Reuses**: as seções existentes — nada é reescrito do zero
**Requirement**: todos (fecho)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CLAUDE.md` ganha o bloco de material: os dois dados (`requires_material` × `material_kinds`), `material_tracking_code` ≠ `tracking_code`, a máquina de estado com o salto direto, o guarda `materialTransitions.test.ts` na tabela *Os guardas*, e a regra de que escrita de estado só existe por RPC
- [ ] `.specs/STATE.md` — `## Handoff` reescrito (só o corpo; as 18 decisões e o histórico intactos)
- [ ] `BACKLOG.md`: o teto de 1.000 linhas de `fetchStatusCounts` (herdado, não introduzido) registrado
- [ ] Baselines de teste/lint/tipo **medidas de verdade** e escritas no `CLAUDE.md` — `turbo run test --force`, exit capturado sem `| tail`
- [ ] `git status` prova `packages/core/src/payment/**` **intocado**
- [ ] Gate: build

**Tests**: none · **Gate**: build
**Commit**: `docs(material): contratos da feature 22 no CLAUDE.md e handoff no STATE.md`

---

## Requirement Traceability

| ID | Tasks |
| --- | --- |
| MAT-01 | T4, T6 |
| MAT-02 | T1, T2, T5, T8, T9, T20 |
| MAT-03 | T1, T2, T5, T7, T8, T9 |
| MAT-04 | T7, T10, T11 |
| MAT-05 | T2, T11, T12, T19 |
| MAT-06 | T12 (asserção de não-regressão) |
| MAT-07 | T1, T2, T12 |
| MAT-08 | T1, T2, T3, T17, T19 |
| MAT-09 | T2, T13, T14, T17 |
| MAT-10 | T17, T18, T19 |
| MAT-11 | T2, T3, T15, T16, T19 |
