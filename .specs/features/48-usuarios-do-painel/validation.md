# Validação — feature 48, usuários do painel

> **O verificador NÃO é o autor.** As duas rodadas foram feitas por um agente independente, que não
> escreveu uma linha do código sob teste e não herdou o modelo mental de quem escreveu. Regra de
> contagem: **evidence-or-zero** — critério sem `arquivo:linha` citado conta como **não coberto**,
> por mais óbvio que o código pareça.
>
> **Este arquivo tem duas rodadas, e a primeira não foi apagada.** O que a rodada 1 achou é
> **registro**, não rascunho: um mutante que sobreviveu uma vez é a descrição exata do buraco que o
> conserto precisou tapar, e apagá-lo deixaria o próximo leitor sem saber por que o guarda existe.

| | Rodada 1 | Rodada 2 |
| --- | --- | --- |
| Data | 2026-09-13 | 2026-09-13 |
| Veredito | ❌ **FAIL** — 3 mutantes sobreviventes, os três em cima de um AC | ✅ **PASS** — as 4 lacunas cobradas estão fechadas, com 1 lacuna **nova** de severidade baixa |
| Mutações | 40 · 34 mortas · 6 sobreviventes | 17 · 15 mortas · 2 sobreviventes |
| Árvore após o sensor | sem mutação residual | sem mutação residual |

---

---

# Rodada 2 — reverificação dos consertos

**Método**: nenhuma correção foi aceita por descrição. Cada conserto foi reexercido injetando a falha
**no arquivo real**, com backup byte a byte antes e restauração depois. Onde a rodada 1 tinha um
sobrevivente, refiz **a mesma mutação**, e acrescentei as variantes que o conserto precisa cobrir para
não ser um remendo da mutação específica.

## R2.1 — Gates

| Workspace | Exit | Rodada 2 | Rodada 1 | Delta |
| --- | --- | --- | --- | --- |
| backoffice (`--testTimeout=20000`) | **0** | **2344 / 136** | 2328 / 135 | **+16 / +1** |
| functions | **0** | **509 / 9** | 508 / 9 | **+1** |
| core | **0** | **2285 / 88** | 2285 / 88 | 0 — remedido |
| store (`--testTimeout=20000`) | **0** | **3176 / 205** | 3176 / 205 | 0 — idêntica |
| catalog-import | — | não remedido (nada tocou) | 512 / 23 | — |

**Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → **0**.

Os números do backoffice e das functions batem com os que o coordenador declarou. **Um único arquivo
de produção mudou entre as rodadas** — `apps/backoffice/src/features/account/ui/ChangePasswordCard.tsx`
—, conferido por `diff` contra os meus backups da rodada 1; todo o resto do delta é teste novo. É por
isso que `core` não podia ter se mexido, e foi remedido mesmo assim.

### ⚠️ A suíte da loja cruzou o teto de 5s — e isso é achado, não ruído

A loja reprovou **duas vezes** antes de fechar, e as duas reprovações foram **`Test timed out in
5000ms`**, nunca asserção:

| Execução | Condição | Resultado |
| --- | --- | --- |
| 1ª | rodada **junto** com a suíte do `core` — erro meu, contra a regra "um workspace por vez" | 1 reprovação (`homeComposition.test.ts`) |
| 2ª | rodada **sozinha**, teto padrão de 5s | **5 reprovações em 4 arquivos** |
| isolamento | os 4 arquivos sozinhos, teto padrão | **44/44 verdes**, exit 0 |
| 3ª | sozinha, `--testTimeout=20000` | **3176 / 205**, exit 0 |

Os cinco casos que estouraram são **todos de varredura de disco**: `homeComposition.test.ts:51`
("nada no app importa os dois módulos"), `routes.test.ts:106` e `:126`, `touchTarget.test.ts:100`
("a varredura encontra controles pequenos de verdade") e `politicaComDonoUnico.test.ts:156`. É a
assinatura que o `CLAUDE.md` já documenta para o backoffice desde a feature `46` — arquivo que muda a
cada execução, reprovação por tempo e não por asserção —, e **ela agora aparece na loja também**.

**A contagem é a MESMA das duas vezes — 3176 em 205 —, e é isso que fecha o diagnóstico**: com o teto
maior não entrou nem saiu um caso, então as cinco reprovações eram tempo, não comportamento. Na
rodada 1 a mesma suíte fechara 3176/205 já no teto de 5s; o que mudou no intervalo não foi código da
loja (nenhum arquivo de `apps/store/**` se mexeu entre as rodadas), e sim um arquivo de teste a mais
em `apps/**` para os guardas varrerem, mais carga de máquina. A margem já era fina.

**Consequência prática, e ela vale além desta feature**: a instrução de medição do `CLAUDE.md` que
manda usar `--testTimeout=20000` **no backoffice** precisa passar a valer para a **loja** também.
Sem isso, a próxima feature vai investigar uma "regressão" que é contenção — que é exatamente o que
eu quase fiz aqui. Antes de investigar qualquer reprovação da loja, confira se o erro diz
`Test timed out in 5000ms`.

## R2.2 — Lacuna a lacuna

### G1 🔴 → ✅ **FECHADA** — `USR-37`, toda rota `/admin/*` sob `RequireAdmin`

Guarda novo: `apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts`, **14 casos**. Ele recorta o
bloco entre `<Route element={<RequireAdmin …>}>` e o `</Route>` que o fecha (`:60-68`) e compara
**índices de posição** (`:102`) — mede aninhamento, não presença, que era exatamente o furo do regex
plano de `navItems.test.ts:25`.

Sete mutações injetadas no `App.tsx` **real**, sete mortas:

| # | Mutação no `App.tsx` real | Reprovaram | O que acusou |
| --- | --- | --- | --- |
| R2-M1 | **a mutação original da rodada 1** — `/admin/usuarios` e `/admin/conta` depois do `</Route>` | 2 | `nenhuma rota do painel fica FORA` + `as duas telas … estão dentro` |
| R2-M2 | **outra** rota (`/admin/pedidos`) movida para antes do bloco | 1 | a régua vale para a classe inteira — não é remendo das duas que vazaram |
| R2-M3 | `loginPath` removido do `RequireAdmin` | 1 | `:129` — sem ele a lojista cairia no `/login` da **loja** |
| R2-M4 | `RequireAdmin` trocado por fragmento `<>` | 5 | o recorte vira `null` e **tudo** é acusado |
| R2-M5 | `/admin/login` movido para **dentro** do bloco | 1 | o sentido inverso (`:117`) — trancaria a própria porta de entrada |
| R2-M6 | `<Route>` **aninhado com filhos** dentro do bloco | 3 | a âncora do `</Route>` único (`:94`): `expected 2 to be 1` |
| R2-M7 | o `</Route>` de fechamento some | 5 | `expected null not to be null` (`:80`) + tudo acusado |

**As duas perguntas de desenho, respondidas por medição e não por leitura:**

- **O aninhamento faz o guarda reprovar ALTO, não encolher em silêncio.** R2-M6 derruba três casos, e
  o primeiro é a âncora que existe só para isso (`expected 2 to be 1`). Um guarda que só perguntasse
  "está dentro?" passaria medindo um bloco menor.
- **O recorte que falha devolve `null`, e `null` reprova.** Confirmado nos dois caminhos: a âncora de
  `:80` reprova sozinha, **e** o filtro de `:102` começa com `bloco === null ||`, que acusa todas as
  rotas em vez de aprovar sobre um bloco vazio. R2-M4 e R2-M7 exercitam os dois.

Um detalhe que vale registrar porque é como um guarda de allowlist costuma ser furado:
`FORA_POR_DESENHO` está **travado** em `:123` com `toEqual(['/admin/login'])`. Sem isso, a saída
óbvia para "o guarda está reclamando" seria acrescentar a rota à lista de exceções, e ele aprovaria o
vazamento.

**Cobertura que o conserto trouxe além do pedido**: a régua vale para as **26** rotas `/admin/*` do
painel, não só para as duas da feature 48. O contrato de autorização do app inteiro passou a ter
asserção — antes não tinha nenhuma, em lugar nenhum.

### G2 🟠 → ✅ **FECHADA** — `USR-31`, "a pessoa SHALL sumir da lista"

Dois casos novos em `apps/backoffice/src/features/admin-users/api/useAdminUsers.test.ts`:
`:246` (o sucesso relê) e `:267` (a recusa **não** relê).

| # | Mutação em `useAdminUsers.ts` | Resultado |
| --- | --- | --- |
| R2-M8 | `remove()` sem `await fetch()` — **a sobrevivente da rodada 1** | **morta** — `USR-31: apagar com sucesso RELÊ a lista` |
| R2-M9 | `refetch` **incondicional** (relê também na recusa) | **morta** (2 casos) — o par de `:267` acusa |

O par não é decoração: recusa é o desfecho **normal** desta ação (quase todo admin tem histórico), e
um `refetch` a cada recusa gastaria uma releitura por clique. Sem o segundo caso, R2-M9 passaria.

### G3 🟠 → ✅ **FECHADA** — `USR-33`, a asserção que era verdadeira nos dois mundos

`supabase/functions/admin-users/__tests__/handlers.test.ts:761` agora simula a corrida de verdade:
substitui `client.from` para `orders`, contando as chamadas, e devolve **0 na checagem e 4 na
releitura** (`:782-789`). As asserções passaram a exigir `expect(leiturasDePedido).toBe(2)` (`:795`) e
`expect(error).toContain('4 pedidos')` (`:798`) — o **número** é o que separa a releitura do literal
de fallback, e é o que `USR-32` exige.

| # | Mutação em `handlers.ts` | Resultado |
| --- | --- | --- |
| R2-M11 | `const relido = null` — **a sobrevivente da rodada 1** | **morta** |
| R2-M12 | a releitura reusa a contagem **antiga** (`accountHistoryRefusal(historico)`) | **morta** — a régua exige as **duas** leituras |
| R2-M13 | o ramo do `23503` desligado (responde 502 genérico) | **morta** (2 casos) |
| R2-M14 | o literal de fallback removido (`relido` sozinho) | **morta** (1 caso) |

**E o caso-par não duplica o primeiro** — era a pergunta certa, e a resposta é medida: R2-M14 derruba
**só** `USR-33: se a releitura TAMBÉM não achar nada` (`:802`), e nenhum outro. Os dois cobrem ramos
disjuntos: um prova que a releitura **fala com número**, o outro que o fallback **existe e não vaza
`23503`** (`:823`).

### G5 🟡 → ✅ **FECHADA** — um dono só para `passwordChangeRefusal`

A chamada foi **removida** de `ChangePasswordCard.tsx` (o componente agora coleta e delega; a razão
está escrita em `:74-81`). O dono é `packages/auth/src/AuthContext.tsx:259`.

| # | Mutação | Resultado |
| --- | --- | --- |
| R2-M15 | `const recusa = null` no `AuthContext` | **morta** — os **três** casos `USR-11`/`USR-12`/`USR-23` de `ChangePasswordCard.test.tsx:139-149` |
| R2-M16 | `const recusa = null` no `ForgotPasswordFlow` | **morta** — `AdminLoginPage.test.tsx:221` (`USR-40`) |

A pergunta "o `ForgotPasswordFlow` tem prova própria da chamada dele?" tem resposta **sim, medida**:
R2-M16 mata. As duas chamadas restantes têm donos diferentes e testes diferentes, e nenhuma mascara a
outra — que era o defeito da rodada 1.

### G4 🟡 — `USR-17`, mantido como probe

Concordo com manter, e não acho que mereça mais. O probe da §2 (rodada 1) é evidência mais forte do
que qualquer teste de TypeScript poderia dar para uma invariante de RLS, e está registrado neste
arquivo, que é o que o evidence-or-zero pedia. A alternativa — um teste que leia as policies do disco
e prove que elas chamam `has_role` — mediria a **forma**, não o efeito, e o efeito é justamente o que
o probe mostrou (`true` → `false` depois da revogação).

## R2.3 — Lacuna NOVA, criada pelo conserto do G5

### G7 🟡 — `USR-11`/`USR-23`: "antes de **qualquer** chamada de rede" só está provado para duas das três

**Mutante sobrevivente R2-M17**: mover `await supabase.auth.getUser()` para **antes** de
`passwordChangeRefusal`, em `packages/auth/src/AuthContext.tsx:259-263`. A suíte de
`ChangePasswordCard.test.tsx` fica **verde**.

Os três casos de `:139-149` asserem `expect(signInWithPassword).not.toHaveBeenCalled()` e
`expect(updateUser).not.toHaveBeenCalled()`. **`getUser` não é asserido em lugar nenhum do arquivo** —
conferido por `grep -n "expect(getUser)"`, que não devolve nada.

`supabase.auth.getUser()` no supabase-js v2 **vai ao servidor** para validar o JWT (é a diferença
documentada dele para `getSession()`). Com a mutação, uma confirmação digitada errada produziria uma
ida à rede antes da recusa — o que a AC proíbe literalmente.

**Por que isto é lacuna NOVA, e não uma que passou batido na rodada 1:** naquela rodada este mutante
era **inalcançável**. O `ChangePasswordCard` recusava localmente, então `changeOwnPassword` nem era
chamado com entrada inválida, e a ordem interna dela não tinha como vazar. Consolidar em um dono só
foi a decisão certa — e transferiu para a ordem interna de `changeOwnPassword` uma promessa que dois
lugares sustentavam antes. **Remover uma cópia move o ônus da prova; não o elimina.**

**Severidade baixa**, e a razão é honesta: o código está **certo** (a recusa é a primeira linha), o
custo do defeito seria uma chamada extra a `getUser` e não o esgotamento do `sign_in_sign_ups` (esse
balde segue protegido — R2-M15 prova), e ninguém inverte essa ordem por acidente. Mas é uma cláusula
de AC sem asserção, e o conserto é **uma linha**.

**Conserto sugerido**: acrescentar `expect(getUser).not.toHaveBeenCalled()` aos três casos de
`ChangePasswordCard.test.tsx:139-149`. O dublê já existe (`:15`, `:47`).

## R2.4 — Residual não cobrado

**`update()` sem `await fetch()` continua sobrevivendo** (mutação R2-M10, a `M15` da rodada 1). Não é
violação de AC — `USR-28`/`USR-29` não dizem nada sobre a lista se atualizar —, então não entra no
veredito. Registro porque o conserto do G2 criou uma **assimetria**: `create`, `revoke` e `remove`
agora têm asserção de releitura, e `update` não. Na prática, renomear alguém deixaria o nome antigo na
tabela até um F5 — visível para a dona, ainda que não prometido pela spec. Uma linha no caso de `:178`
fecharia.

## R2.5 — Integridade da árvore, rodada 2

As 17 mutações da rodada 2 foram revertidas. Conferência byte a byte contra os backups tirados antes
de cada injeção:

```
OK  apps/backoffice/src/app/App.tsx
OK  apps/backoffice/src/features/admin-users/api/useAdminUsers.ts
OK  packages/auth/src/AuthContext.tsx
OK  apps/backoffice/src/features/account/ui/ForgotPasswordFlow.tsx
OK  supabase/functions/admin-users/handlers.ts
```

`git status --porcelain` devolve as mesmas 32 entradas de antes do sensor (as 31 da rodada 1 mais
`?? apps/backoffice/src/app/__tests__/`). O único arquivo que eu criei no repositório é este
`validation.md`.

## R2.6 — Veredito da rodada 2

✅ **PASS.** As quatro lacunas cobradas estão fechadas, e **nenhuma foi fechada afrouxando asserção**:
as três que tinham mutante sobrevivente ganharam casos que o matam, provado por reinjeção no arquivo
real. Os consertos do G1 e do G3 são, os dois, mais fortes que o mínimo — o G1 cobre a classe inteira
de rotas em vez das duas que vazaram, e o G3 mede a corrida em vez de contorná-la.

Fica **G7**, severidade baixa, conserto de uma linha, e o residual do `update()`. Nenhum dos dois
bloqueia: o código está correto nos dois casos, e o que falta é a asserção que o prende.

**Duas pendências que a rodada 2 não fecha e não pode fechar:**

1. **A prova em navegador** (390×844 e 1440), como nas features `32`, `33`, `34`, `35`, `37`, `39`,
   `41`, `45` e `47`. As duas telas novas são formulário e tabela, e jsdom devolve 0 para toda medida
   de layout — nenhuma asserção desta feature mede largura, sobreposição ou alvo de toque.
2. **O teto de 5s da suíte da loja** (ver R2.1). É instrução de medição, não defeito de código, mas
   sem registro a próxima feature vai confundir contenção com regressão.

---

# Rodada 1 — registro histórico (primeira passada)

> Tudo abaixo desta linha é o relatório da rodada 1, **preservado como escrito**. As lacunas `G1`,
> `G2`, `G3` e `G5` foram tratadas depois; o estado atual de cada uma está na seção da rodada 2.

## Sumário do veredito

| | |
| --- | --- |
| Requisitos da spec | **43** (`USR-01`..`USR-43`) |
| Com evidência discriminante (`arquivo:linha` + mutante morto) | **38** |
| Com evidência, mas sem sensor que a discrimine | **2** (`USR-15` painel, `USR-38`) |
| Com evidência **só de probe manual** (nenhum teste automatizado) | **1** (`USR-17`) |
| **Sem evidência para metade do enunciado** | **2** (`USR-31`, `USR-37`) |
| Gates | **4/4 verdes**, exit code capturado fora de pipe |
| Sensor de discriminação | **40 mutações · 34 mortas · 6 sobreviventes** |
| Árvore após o sensor | **sem mutação residual** (conferido byte a byte) |

**O FAIL não é sobre o código — é sobre a prova.** As três funções mutadas que sobreviveram estão
escritas certo; o que falta é a asserção que as separa do mundo em que elas não existem. É o mesmo
padrão que reprovou as features `40`, `41`, `44` e `47`: **a asserção que é verdadeira nos dois
mundos**.

## 1. Gates — medidos um workspace por vez, exit code fora de pipe

| Workspace | Comando | Exit | Testes / arquivos | Baseline do `CLAUDE.md` | Delta |
| --- | --- | --- | --- | --- | --- |
| core | `pnpm --filter @estrelinha/core test` | **0** | **2285 / 88** | 2199 / 84 | **+86 / +4** |
| functions | `pnpm --filter @estrelinha/functions test` | **0** | **508 / 9** | 436 / 8 | **+72 / +1** |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | **0** | **2328 / 135** | 2204 / 129 | **+124 / +6** |
| store | `pnpm --filter @estrelinha/store test` | **0** | **3176 / 205** | 3128 / 203 | **+48 / +2** |
| catalog-import | `pnpm --filter @estrelinha/catalog-import test` | **0** | **512 / 23** | 512 / 23 | 0 — não tocado, remedido |

**Total medido: 8809 em 460 arquivos** (+330 / +16 sobre a baseline de 8479 em 447).
**Nenhuma queda** em nenhum workspace — nada de contagem que reaparece "do outro lado" para explicar.

**Tipos**: `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` → **0**;
`apps/store/tsconfig.app.json` → **0**. A baseline de `0 · 0 · 0` é mantida.

> O teto de 20s no backoffice foi usado como o `CLAUDE.md` manda. A suíte fechou **135/135** sem uma
> única flake nesta execução.

---

## 2. Probes contra o banco local — o que jsdom e vitest não alcançam

`USR-16` e `USR-17` são invariantes **do banco**, e nenhum teste de TypeScript pode prová-las. Rodei
os probes eu mesmo, em transação com `rollback`, contra o Postgres local
(`supabase_db_uma-estrelinha-store`, up há 46h, migration já aplicada:
`guard_last_admin` e `trg_user_roles_last_admin_guard` presentes em `pg_proc`/`pg_trigger`).

| Probe | Comando | Resultado |
| --- | --- | --- |
| `USR-16` — apagar o último admin | `delete from public.user_roles where role='admin'` (1 admin na base) | **ERROR: O painel precisa de pelo menos um acesso de admin, e este e o ultimo.** (`guard_last_admin()` linha 28) |
| `USR-16` — **rebaixar** o último por `update` | `update public.user_roles set role='user' where role='admin'` | **mesma recusa** — o caminho do `update` está fechado, não só o do `delete` |
| `USR-16` — com **dois** admins, apagar um | `insert` + `delete` de um dos dois | **passa** (`admins_com_dois=2` → `admins_apos_delete=1`) |
| `USR-17` — `has_role` depois da revogação | `has_role(novo,'admin')` antes e depois do `delete` da linha | **`true` → `false`** |
| Estado final | `select count(*) … role='admin'` após `rollback` | **1** — a base voltou intacta |

Isto **fecha `USR-16` e `USR-17` empiricamente**, mas é evidência de uma execução manual, não de um
gate: `USR-17` continua sem um único `arquivo:linha` no repositório (ver lacuna **G4**).

---

## 3. Evidência por critério

Legenda: ✅ coberto com asserção que casa o desfecho da spec · ⚠️ coberto, mas com ressalva
declarada · ❌ lacuna.

### P1 — A porta única (`admin-users`)

| AC | Desfecho que a spec define | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-01` | 401 + `{ error }`, **sem** tocar `auth.users` | `supabase/functions/admin-users/__tests__/handlers.test.ts:55` — `expect(res.status).toBe(401)`; `:57` — `expect(adminCalls).toEqual([])` | ✅ |
| `USR-02` | 401 com anon key como bearer | `handlers.test.ts:71` — `expect(res.status).toBe(401)`; `:72` — `adminCalls` vazio | ✅ |
| `USR-03` | 403, corpo dizendo que é restrito ao admin | `handlers.test.ts:83` — `resolves.toEqual({ error: 'Acesso restrito ao admin' })` | ✅ |
| `USR-19` | **403** quando a RPC erra + log distinto | `handlers.test.ts:92` — `toBe(403)`; `:110` — `objectContaining({ status: 'admin_check_failed' })` | ✅ |
| `USR-20` | seis campos exatos; nada de hash nem de `raw_user_meta_data` | `handlers.test.ts:194` — igualdade **estrutural** dos dois objetos; `:232` — `Object.keys(users[0]).sort()` igual aos seis; `:240-241` — não contém `encrypted_password` nem `ya29.segredo` | ✅ |
| `USR-25` | a suíte reprova com `service_role`/`SUPABASE_SERVICE_ROLE_KEY`/`auth.admin.` em `apps/**` | `apps/store/src/shared/lib/__tests__/chaveDeServidorForaDoNavegador.test.ts:170,174,180` — `expect(procurar(REGUA_*)).toEqual([])`, com âncora tripla em `:145,153,161` | ✅ |
| `USR-26` | falha de leitura ≠ lista vazia, com ação de tentar de novo | function: `handlers.test.ts:283` — `502` + motivo, contra `:263` — `200` + `users: []`; hook: `useAdminUsers.test.ts:67-68` — `error` preenchido **e** `users` vazio; tela: `AdminUsersPage.test.tsx:100-103` — os dois textos distintos + `refetch` no clique | ✅ |
| `USR-27` | **uma** linha JSON `{ action, status }`, sem senha | `handlers.test.ts:322` — `expect(linhas).toEqual([{ action:'admin-users:list', status:'ok', total:2 }])` (igualdade de array = "uma"); `:485` — o log não contém `segredo123` | ✅ |

### P1 — Criar um acesso

| AC | Desfecho | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-04` | conta com e-mail confirmado + papel `admin` | `handlers.test.ts:349` — `attributes` com `email_confirm: true`; `:356` — `inserts` igual a `[{ table:'user_roles', values:{ user_id, role:'admin' } }]` | ✅ |
| `USR-05` | `E-mail inválido`, antes de escrever | `packages/core/src/admin-users/__tests__/refusals.test.ts:61`; function `handlers.test.ts:371` (it.each) com `expect(adminCalls).toEqual([])` | ✅ |
| `USR-06` | nomeia o mínimo (6) | `refusals.test.ts:82` — texto derivado de `MIN_PASSWORD_LENGTH`; `:89` — borda exata passa | ✅ |
| `USR-21` | `Informe o nome de quem vai acessar` | `refusals.test.ts:41,47`; `handlers.test.ts:370` | ✅ |
| `USR-07` | dois ramos com remédios opostos, sem criar 2ª conta | `handlers.test.ts:395` — `'Esta pessoa já tem acesso ao painel.'` + `createUser` não chamado; `:399` — ramo "conceda à conta existente"; `:417` — duplicata detectada ignorando caixa/espaço | ✅ |
| `USR-08` | desfaz a criação (`deleteUser`) e responde erro | `handlers.test.ts:444` — `resolves.toEqual({ error: 'Não foi possível conceder o acesso. Nada foi criado.' })`; `:446` — `adminCalls` contém `{ method:'deleteUser', id: ANA }` | ✅ |
| `USR-22` | a lista mostra a pessoa **sem recarregar** | `useAdminUsers.test.ts:124` — `expect(invoke).toHaveBeenLastCalledWith('admin-users?action=list', …)` | ✅ |

### P1 — Trocar a própria senha

| AC | Desfecho | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-09` | troca e confirma em texto visível | `ChangePasswordCard.test.tsx:74` — `signInWithPassword` com a **atual**; `:79` — `updateUser({ password:'nova-segura-1' })`; `:87` — `role="status"` com o texto | ✅ |
| `USR-10` | `E-mail ou senha inválidos`, **sem** trocar, sem deslogar | `ChangePasswordCard.test.tsx:114` — texto; `:116` — `expect(updateUser).not.toHaveBeenCalled()`; `:130` — os campos sobrevivem | ✅ |
| `USR-11` | recusa antes de qualquer rede | `ChangePasswordCard.test.tsx:136,147-148` — texto + `signInWithPassword`/`updateUser` não chamados; regra em `passwordChange.test.ts:34` | ⚠️ ver **G5** |
| `USR-12` | `A senha nova precisa ser diferente da atual.` | `passwordChange.test.ts:54` — texto exato; `:60` — prova que é **o mesmo** literal de `authErrorMessage('same_password')` | ⚠️ ver **G5** |
| `USR-23` | recusa antes da rede, nomeando o mínimo | `ChangePasswordCard.test.tsx:138,147-148`; `passwordChange.test.ts:14` | ⚠️ ver **G5** |
| `USR-24` | sempre `authErrorMessage`, nunca `error.message` cru | `ChangePasswordCard.test.tsx:163-164` — traduz `same_password` **e** `not.toHaveTextContent` do inglês; `:177-178` — código desconhecido vira o fallback | ✅ |

### P1 — Tirar alguém do painel

| AC | Desfecho | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-13` | apaga **só** a linha `role='admin'`; conta e histórico ficam | `handlers.test.ts:605` — `deletes` igual a `[{ table:'user_roles', eq:[['user_id',ANA],['role','admin']] }]`; `:615` — nenhum `deleteUser`; tela: `AdminUsersPage.test.tsx:118-119` | ✅ |
| `USR-14` | recusa legível, nada escrito | `handlers.test.ts:622` — texto exato + `expect(deletes).toEqual([])`; `:668` — `USR-14` vence `USR-15`; tela: `AdminUsersPage.test.tsx:184-187` — botões desabilitados **com** `title` | ✅ |
| `USR-15` | recusa legível, nada escrito | `handlers.test.ts:636` — texto exato + `deletes` vazio; `:643` — contagem ilegível **também** recusa | ⚠️ ver **G6** |
| `USR-16` | o **banco** recusa, decidindo por contagem | guarda: `apps/store/src/shared/lib/__tests__/adminUsersSchema.test.ts:146` — `contaRestantes(codigo)` (exige `id <> old.id`), `:150` — `if restantes = 0`, `:166` — advisory lock, `:157-158` — recusa a forma por identidade. **Probe ao vivo** na §2 | ✅ |
| `USR-17` | `has_role` passa a devolver `false`; RLS fecha | **nenhum `arquivo:linha` no repositório.** Provado só pelo probe da §2 (`true` → `false`) | ❌ **G4** |

### P2 — Editar, reenviar e apagar

| AC | Desfecho | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-28` | nome em `raw_user_meta_data.full_name` **e** em `customers.name` | `handlers.test.ts:504` — `updateUserById` com `user_metadata.full_name`; `:515` — `updates` contém `{ table:'customers', values:{ name, email }, eq:['user_id',ANA] }` | ✅ |
| `USR-29` | troca já confirmada; recusa e-mail de outra conta | `handlers.test.ts:532` — `409` + `'Já existe outra conta com este e-mail.'` + nada escrito; `:536` — manter o próprio e-mail **não** é duplicata | ✅ |
| `USR-18` | dispara a recuperação e a tela nomeia o endereço | function `handlers.test.ts:845` — `{ ok:true, email:'ana@exemplo.invalid' }`; `:848` — o e-mail vem do **id**, o do corpo é ignorado; hook `useAdminUsers.test.ts:276-279` — corpo sem `email`; tela `AdminUsersPage.test.tsx:248` — `'Enviamos um código de redefinição para ana@exemplo.invalid.'` | ✅ |
| `USR-30` | "aguarde", e **nunca** "enviado" | `handlers.test.ts:873` — `{ error:'Aguarde alguns segundos para reenviar' }` (nunca `ok:true`); tela `AdminUsersPage.test.tsx:261-262` — `alert` com o texto **e** `queryByRole('status')` ausente | ✅ |
| `USR-31` | apaga a conta **e a pessoa some da lista** | 1ª metade: `handlers.test.ts:725-727` — `200 { ok:true }` + `deleteUser` chamado. **2ª metade sem asserção** | ❌ **G2** |
| `USR-32` | recusa antes, **nomeando o que bloqueia e quantos** | `handlers.test.ts:732` — it.each com **um caso por origem** e números divergentes (7/3/5/2), `expect(error).toContain(trecho)` + `deleteUser` não chamado; `:747` — pedidos contados pela ficha; regra em `targetRefusals.test.ts:99-127` | ✅ |
| `USR-33` | `23503` traduzido para o **mesmo** motivo | `handlers.test.ts:781-783` — `409` + `toContain('Remover do painel')` / `toContain('histórico da loja')`. **A asserção é verdadeira nos dois mundos** | ❌ **G3** |
| `USR-34` | recusa pelas réguas de `USR-14`/`USR-15` | `handlers.test.ts:814` — `'Você não pode apagar a sua própria conta pelo painel.'` (texto **da ação**, não o de remover) + `adminCalls` vazio; `:825` — último admin recusa | ✅ |
| `USR-35` | confirmação digitando o e-mail; botão travado até casar | `DeleteAccountDialog.test.tsx:41` (nasce travado), `:48` (**habilita** quando casa — o outro sentido), `:56` (quatro quase-certos), `:73` (e-mail vazio nunca habilita); na página: `AdminUsersPage.test.tsx:156,163` | ✅ |

### P2 — Esqueci minha senha, no painel

| AC | Desfecho | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-39` | pede o e-mail, dispara e confirma nomeando | `AdminLoginPage.test.tsx:149` — a **página** monta o fluxo; `:163` — `resetPassword` chamado; `:167` — `'Enviamos um código de 6 dígitos para adri@exemplo.invalid.'` (normalizado) | ✅ |
| `USR-40` | código certo → senha nova, com `USR-11`/`USR-23` | `AdminLoginPage.test.tsx:193-196` — `verifyRecoveryCode(email, código)` + campo de senha; `:226,234` — as duas recusas **e** `updatePassword` não chamado | ✅ |
| `USR-41` | mensagem de `authErrorMessage`; pedir outro sem recarregar | `AdminLoginPage.test.tsx:207` — `alert` com o texto; `:211-212` — volta ao passo do e-mail **com o endereço preenchido** | ⚠️ o texto vem do dublê de `verifyRecoveryCode`; quem chama `authErrorMessage` é o `AuthContext` pré-existente, fora do diff |
| `USR-42` | mesmo desfecho do login normal | `AdminLoginPage.test.tsx:253` — `navigate('/admin',{replace:true})`; `:268-269` — o **par**: conta sem papel lê a frase e **não** navega | ✅ |
| `USR-43` | volta ao login sem recarregar, de qualquer passo | `AdminLoginPage.test.tsx:290-291` (do passo do código) e `:299` (do primeiro passo) | ✅ |

### P2 — As duas telas na navegação

| AC | Desfecho | `arquivo:linha` + asserção | |
| --- | --- | --- | --- |
| `USR-36` | os dois no **rodapé**, fora de `navGroups` | `navItems.test.ts:211` — `footerNavItems.map(i=>i.to)` igual aos três, na ordem; `:216` — os rótulos; `:232-233` — não estão em `navGroups` | ✅ |
| `USR-37` | rotas **sob `RequireAdmin`** e sequência casando com `navGroups` | 2ª metade: `navItems.test.ts:238-239` (declaradas) e `:247` (ordem textual casa). **1ª metade — `RequireAdmin` — sem uma única asserção em todo o repositório** | ❌ **G1** |
| `USR-38` | o trilho mostra os dois, derivando de `navGroups`+`footerNavItems` | `NavRail.test.tsx:31-36` — `links` com `toHaveLength(destinos.length)` e `href` na ordem, com `destinos` **derivado da fonte** (`:17`) | ⚠️ a âncora é derivada: se os dois itens sumissem de `navItems.ts`, este teste passaria. Quem segura é `navItems.test.ts:212` |

### Edge cases da spec

| Edge case | `arquivo:linha` | |
| --- | --- | --- |
| `?action=` desconhecido → 400, nunca 500 | `handlers.test.ts:131`, e `:139` para `action` **ausente** | ✅ |
| corpo não-JSON → 400 com motivo | `handlers.test.ts:149`; `:157` — corpo vazio vira `{}` e **não** é erro | ✅ |
| zero admins → estado vazio explicado, não tabela em branco | `handlers.test.ts:256` (200 + `users: []`); `AdminUsersPage.test.tsx:108-109` — texto próprio **e** ausência do "Tentar de novo" | ✅ |
| leitura falha ≠ vazio (`AD-014`) | `AdminUsersPage.test.tsx:100-103` | ✅ |
| e-mail com espaço/caixa alta normalizado | `refusals.test.ts:12`; `handlers.test.ts:359,417` | ✅ |
| duas abas removendo a mesma pessoa | `handlers.test.ts:674` — a segunda termina `200 { ok: true }` | ✅ |
| trocar a própria senha não expulsa | `ChangePasswordCard.test.tsx:222` — a frase; `:119` — errar não desloga | ⚠️ prova de texto e de não-`signOut`; a sessão em si é comportamento do supabase-js, fora do alcance do dublê |
| senha com mostrar/ocultar, `type="password"` por padrão | `ChangePasswordCard.test.tsx:196,204`; `AdminUserEditorDialog.test.tsx:83,86` | ✅ |

---

## 4. Sensor de discriminação — 40 mutações de comportamento

Cada mutação foi injetada **no arquivo real**, com backup byte a byte antes e restauração depois.
Nenhuma simulação: quem rodou foi a suíte de verdade.

### Mortos (34)

| # | Arquivo | Mutação | Suíte | Reprovaram |
| --- | --- | --- | --- | --- |
| M1 | `admin-users/handlers.ts` | `if (isAdmin !== true)` → `=== true` | functions | **53** |
| M2 | idem | RPC com erro devolve `{ ok: true }` | functions | 1 |
| M3 | idem | remove a checagem de duplicata de e-mail | functions | 3 |
| M4 | idem | `selfTargetRefusal(...)` → `null` em `revoke` | functions | 2 |
| M5 | idem | remove o `deleteUser` compensatório (`USR-08`) | functions | 1 |
| M7 | `core/admin-users/refusals.ts` | `lastAdminRefusal`: `total > 1` → `>= 1` | core | 1 |
| M8 | idem | `passwordChangeRefusal`: confirmação **antes** do comprimento | core | 1 |
| M9 | idem | `accountHistoryRefusal` ignora `notasDeCliente` | core | 4 |
| M10 | idem | `adminUserRefusal`: e-mail **antes** do nome | core | 2 |
| M11 | idem | `selfTargetRefusal` devolve o mesmo texto nas duas ações | core | 2 |
| M13 | `useAdminUsers.ts` | `motivoDaFalha` devolve sempre o fallback | backoffice | 3 |
| M14 | idem | `create()` sem `await fetch()` | backoffice | 1 |
| M16 | idem | `revoke()` sem `await fetch()` | backoffice | 1 |
| M17 | `AuthContext.tsx` | ignora o erro da credencial | backoffice | 2 |
| M18 | idem | inverte `signInWithPassword` ↔ `updateUser` | backoffice | 1 |
| M20 | idem | devolve `error.message` cru em vez de `authErrorMessage` | backoffice | 2 |
| M22 | `DeleteAccountDialog.tsx` | `confere` → `true` | backoffice | **8** |
| M23 | idem | `confere` ignora o e-mail vazio | backoffice | 1 |
| M25 | `handlers.ts` | `list` faz `...u` (vaza o objeto do GoTrue) | functions | 2 |
| M26 | idem | `is_self` sempre `false` | functions | 1 |
| M27 | idem | `create` sem `email_confirm` | functions | 1 |
| M28 | idem | `update` não grava a ficha de cliente | functions | 2 |
| M29 | idem | `reset-password` usa o e-mail do **corpo** | functions | 1 |
| M30 | idem | `log()` vira no-op | functions | 4 |
| M31 | idem | `revoke` apaga **todos** os papéis (sem o `.eq('role')`) | functions | 1 |
| M32 | `AdminUsersPage.tsx` (real) | injeta `SUPABASE_SERVICE_ROLE_KEY` | store | 4 |
| M33 | idem | injeta `supabase.auth.admin.createUser` | store | 2 |
| M34 | migration `…48….sql` | remove o `pg_advisory_xact_lock` | store | 1 |
| M35 | idem | conta sem `and id <> old.id` | store | 1 |
| M36 | `ForgotPasswordFlow.tsx` | `onEntrou()` nunca chamado | backoffice | 2 |
| M37 | idem | erro do código não impede avançar | backoffice | 1 |
| M38 | idem | recusa local da senha nova removida | backoffice | 1 |
| M39 | `AdminUsersPage.tsx` | `is_self` não desabilita as ações | backoffice | 1 |
| M40 | idem | recado de sucesso mostrado mesmo com recusa | backoffice | 1 |

### Sobreviventes (6 mutações, 5 lacunas distintas)

| # | Arquivo:linha | Mutação | Suíte rodada | Resultado |
| --- | --- | --- | --- | --- |
| **M24** | `apps/backoffice/src/app/App.tsx:97-98` | mover `/admin/usuarios` e `/admin/conta` para **fora** do `<Route element={<RequireAdmin …>}>` | **backoffice inteira** | **2328/135 verdes** |
| **M12** | `useAdminUsers.ts:149` | `remove()` sem `await fetch()` | `useAdminUsers.test.ts` + `AdminUsersPage.test.tsx` | verde |
| **M6** | `handlers.ts:473` | `const relido = null` (mata a releitura do histórico no ramo `23503`) | `handlers.test.ts` | verde |
| M15 | `useAdminUsers.ts:125` | `update()` sem `await fetch()` | idem M12 | verde |
| M19 | `AuthContext.tsx:259-260` | `passwordChangeRefusal` removido de `changeOwnPassword` | `ChangePasswordCard.test.tsx` | verde |
| M21 | `ChangePasswordCard.tsx:75` | `passwordChangeRefusal` removido do componente | idem | verde |

---

## 5. Lacunas, por severidade

### G1 — 🔴 `USR-37`: **`RequireAdmin` não tem uma única asserção** (mutante M24)

> **Status: FECHADA na rodada 2** — ver `R2.2`.

A AC diz, literalmente: *"WHEN as rotas são declaradas em `App.tsx` THEN elas SHALL estar sob
`RequireAdmin`"*. As rotas **estão** — `apps/backoffice/src/app/App.tsx:97-98`, dentro do `<Route>` de `:44-50`, cujo
`element` é o `<RequireAdmin loginPath="/admin/login">` de `:46`. O que não existe é prova:

- `navItems.test.ts:25` lê `App.tsx` do disco com `/path="(\/admin[^"]*)"/g` — um regex **plano**,
  que não enxerga aninhamento;
- a asserção de ordem (`:247`) filtra só as rotas do rodapé, então mover as duas **para depois** do
  `</Route>` preserva a sequência `configuracoes → usuarios → conta`;
- `grep -rn RequireAdmin --include=*.test.*` em `apps/backoffice/src` devolve **uma** ocorrência, e é
  um comentário em `AdminLoginPage.test.tsx:5`.

Medido: com as duas rotas fora do guarda, **a suíte inteira do backoffice passa — 2328 em 135**. Na
prática, `/admin/usuarios` e `/admin/conta` renderizariam para visitante deslogado. A function ainda
responde 401/403, então não há vazamento de dado pela API — mas a fronteira de autorização do app
some, e **nada acusa**. É exatamente a propriedade que torna o erro caro neste projeto: errar não
quebra nada.

**Conserto sugerido**: uma asserção de **aninhamento**, não de presença — por exemplo, recortar o
bloco entre `<RequireAdmin` e o `</Route>` que o fecha e exigir que todo `path="/admin…"` exceto
`/admin/login` caia dentro dele. Com sensor por mutação nos dois sentidos (a rota fora reprova; a
rota dentro passa).

### G2 — 🟠 `USR-31`: "a pessoa SHALL sumir da lista" não é provado (mutante M12)

> **Status: FECHADA na rodada 2** — ver `R2.2`.

`useAdminUsers.remove()` faz `await fetch()` em `:149`, e nenhum teste o observa. O caso
`useAdminUsers.test.ts:223` exercita apenas o ramo de **recusa** (histórico), que retorna antes da
releitura; `AdminUsersPage.test.tsx` mocka o hook inteiro. Apagar a linha deixa a pessoa apagada na
base e **visível na tabela** até um F5.

Compare com o irmão: `revoke` tem a asserção certa em `useAdminUsers.test.ts:220`
(`toHaveBeenLastCalledWith('admin-users?action=list', …)`) e o mutante M16 morre. A mesma linha, no caso
do `delete`, não existe.

**Conserto**: um caso de `remove` bem-sucedido com `expect(invoke).toHaveBeenLastCalledWith
('admin-users?action=list', { method: 'GET' })`.

### G3 — 🟠 `USR-33`: a asserção é verdadeira nos dois mundos (mutante M6)

> **Status: FECHADA na rodada 2** — ver `R2.2`.

`handlers.test.ts:761` monta a corrida com **as quatro contagens em zero** e o banco recusando assim
mesmo. Nesse cenário a releitura de `contarHistorico` devolve zeros, `accountHistoryRefusal` devolve
`null`, e a resposta cai no **literal de fallback** — que contém `'Remover do painel'` e
`'histórico da loja'`, que são exatamente as duas coisas asseridas. Ou seja: o ramo que a linha 473
existe para servir (*"as contagens vêm do que ele acabou de dizer que existe, relidas"*, `design.md`)
**nunca é exercido**, e apagá-lo é invisível.

A consequência real: na corrida verdadeira — contagem lida como zero, registro criado no meio, banco
recusa — o `23503` produziria uma frase **sem número**, quando `USR-32` exige que o motivo *"nomeie o
que bloqueia e com quantos registros"*. A parede passa a falar duas línguas, que é o que a AC
proíbe.

**Conserto**: o dublê precisa de contagens que **mudem entre chamadas** (primeira leitura zero,
segunda com 7 pedidos), e a asserção passa a exigir `toContain('7 pedidos')` no corpo do `409`.

### G4 — 🟡 `USR-17` sem `arquivo:linha` no repositório

> **Status: aceito como probe registrado** — ver `R2.2`.

O `design.md` declara que este requisito *"vira prova, não implementação"* — e a prova não foi
registrada em lugar nenhum. Eu a produzi na §2 (`has_role` `true` → `false`), mas ela some com esta
sessão. Pelo evidence-or-zero, o requisito conta como **não coberto** no repositório.

**Conserto**: ou um bloco de probe no próprio `validation.md` (o que este arquivo agora faz), ou uma
asserção no guarda de migration de que `has_role` lê `public.user_roles` — a segunda é mais fraca e
não substitui a primeira.

### G5 — 🟡 A recusa local de senha tem **dois donos, e eles se mascaram** (M19 + M21)

> **Status: FECHADA na rodada 2** — a chamada saiu do componente. Mas o conserto criou a lacuna
> **G7** (`R2.3`): a ordem interna de `changeOwnPassword` passou a sustentar sozinha uma promessa
> que duas cópias sustentavam, e essa ordem não tem asserção.

`passwordChangeRefusal` é chamada em `ChangePasswordCard.tsx:75` **e** em `AuthContext.tsx:259`.
Remover **qualquer uma das duas** deixa os testes verdes, porque a outra recusa primeiro. As ACs
`USR-11`/`USR-12`/`USR-23` continuam satisfeitas enquanto as duas existirem — mas nenhuma das duas
está provada individualmente, e uma limpeza futura que remova uma delas passa no gate.

Isto não é o defeito 01 (a **regra** tem um dono só, em `core`) — é a duplicação da **chamada**. Se
ela é deliberada, o par merece um caso que a nomeie: por exemplo, chamar `changeOwnPassword`
diretamente com entrada inválida e asserir que `signInWithPassword` não foi chamado.
`packages/auth` não tem script `test`, então o lugar é o próprio arquivo do componente.

### G6 — 🟢 `USR-15` no painel, e `USR-38`

- `USR-15`: coberto e discriminado **na function** (M7 morre). Na tela, a recusa só aparece como
  texto vindo do mock (`AdminUsersPage.test.tsx:138`) — o que está certo, já que a decisão é do
  servidor. Sem ação.
- `USR-38`: a âncora de `NavRail.test.tsx:17` é **derivada** de `navGroups`+`footerNavItems`, então o
  trilho e a fonte sumiriam juntos em silêncio. Quem segura o número é `navItems.test.ts:211`, e ele
  é literal. O par funciona; registro para não ser lido como cobertura independente.

### Fora de escopo desta verificação (registrado, não cobrado)

- **Prova em navegador**: nenhuma. `USR-35`, `USR-36` e as duas telas novas entregam formulário e
  tabela, e jsdom devolve 0 para toda medida de layout. Falta 390×844 e 1440 — a mesma fila da `32`,
  `33`, `34`, `35`, `37`, `39`, `41`, `45` e `47`.
- **`tasks.md` está com 125 caixas `[ ]` e nenhuma `[x]`.** O trabalho está feito no disco; o
  registro de conclusão por task, não.

---

## 6. Qualidade de código — checklist do `validate.md`

| Check | |
| --- | --- |
| Nada além do pedido | ✅ — `SAME_PASSWORD` exportado tem justificativa escrita (dois produtores da mesma frase) |
| Sem abstração para uso único | ✅ — `quantia`/`enumerar` são locais e privados |
| Sem "flexibilidade" inventada | ✅ — `A-10` recusa teto de admins; o enum `app_role` não foi tocado |
| Só os arquivos necessários | ✅ — `git diff --name-only` não alcança `packages/core/src/payment/**` nem `supabase/functions/mercado-pago/**` |
| Não "melhorou" código alheio | ✅ — `AuthContext` ganhou uma função e nada mais; o `resolvedFor` do `BUG-20260802` está intacto |
| Segue os padrões do repositório | ✅ — veredito `string \| null` (nunca união por booleano), `.ts` explícito em todo import de `core/admin-users` (guardado por `purity.test.ts:247` + sensores transitivos em `:250,267`), molde `AD-004` na function, âncora dupla + sensores nos dois guardas novos |
| Testes mapeiam as ACs e não são rasos | ⚠️ — 38 de 43 sim; as três exceções são **G1**, **G2**, **G3** |
| Teste não monta a própria árvore | ✅ — conferido de propósito, porque é o defeito da `44`: `AdminUsersPage.test.tsx:141` e `:199` provam que a **página** monta os diálogos; `AdminAccountPage.test.tsx:39` prova que a **página** monta o cartão; `AdminLoginPage.test.tsx:146` prova que a **página** monta o fluxo de recuperação. M36 (apagar `onEntrou()`) morre por causa disso |
| Guarda de varredura com âncora que não mede zero | ✅ — `chaveDeServidorForaDoNavegador.test.ts:145` (>300 arquivos), `:153-154` (um arquivo de **cada** app), `:161` (a régua encontra a porta legítima); `adminUsersSchema.test.ts:108` (>1500 bytes) + `:114-116`. Os dois foram exercidos por injeção real (M32–M35) |

---

## 7. Integridade da árvore

Todas as 40 mutações foram revertidas. Conferência final, byte a byte, contra os backups tirados
antes de cada injeção:

```
OK  supabase/functions/admin-users/handlers.ts
OK  packages/core/src/admin-users/refusals.ts
OK  apps/backoffice/src/features/admin-users/api/useAdminUsers.ts
OK  packages/auth/src/AuthContext.tsx
OK  apps/backoffice/src/features/account/ui/ChangePasswordCard.tsx
OK  apps/backoffice/src/features/admin-users/ui/DeleteAccountDialog.tsx
OK  apps/backoffice/src/app/App.tsx
OK  apps/backoffice/src/pages/admin/AdminUsersPage.tsx
OK  apps/backoffice/src/features/account/ui/ForgotPasswordFlow.tsx
OK  supabase/migrations/20260913120000_48-usuarios-do-painel.sql
```

`git status --porcelain` devolve exatamente a mesma lista de antes do sensor. Os probes SQL rodaram
em transação e terminaram em `rollback`; `select count(*) from public.user_roles where role='admin'`
devolve **1**, o valor de entrada.

---

## 8. O que fazer agora *(escrito na rodada 1 — as três foram feitas; ver a rodada 2)*

Três fix tasks, nesta ordem:

1. **G1** — asserção de aninhamento sob `RequireAdmin` em `navItems.test.ts` (ou arquivo próprio),
   com sensor nos dois sentidos. É a única lacuna que toca uma fronteira de autorização.
2. **G2** — caso de `remove()` bem-sucedido asserindo a releitura, em `useAdminUsers.test.ts`.
3. **G3** — dublê com contagem que muda entre chamadas, e asserção de que o `409` do `23503` carrega
   o número.

**G4** está resolvido por este arquivo (o probe está registrado acima). **G5** e **G6** são registro,
e podem virar backlog em vez de fix task.
