# Entrega de e-mail comprovada — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Convenção deste repositório sobrepõe a da Skill**: **não** criar commit atômico por task.
> Aguardar a conclusão e gerar os commits completos de uma vez (`CLAUDE.md`, `BL-012`, decisão do
> usuário de 2026-08-15). O campo `Commit` de cada task abaixo é o **rótulo** da mudança dela dentro
> do commit final, não um commit próprio.

---

**Design**: [`design.md`](./design.md) · **Spec**: [`spec.md`](./spec.md)
**Status**: T1–T6 feitas · T7 com dois passos de operação pendentes (ver `validation.md`)

---

## Test Coverage Matrix

> Gerada do codebase, das diretrizes do projeto e da spec — confirmar antes de Execute.
> **Diretrizes encontradas**: `CLAUDE.md` (raiz — tabela *Os guardas*, tabela *Baselines*, e as três
> armadilhas de medição), `supabase/CLAUDE.md` (`AD-004`, molde de RLS), `packages/core/CLAUDE.md`.
> Os `vitest.config.ts` dos workspaces **não** declaram limiar de cobertura; a expectativa abaixo vem
> das diretrizes escritas, não de número de ferramenta.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Handler de edge function | unit | 1:1 com as ACs da spec; **todo** edge case listado; dependências injetadas (`AD-004`), sem `Deno` no caminho testado | `supabase/functions/*/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Migration SQL | unit (guarda que lê o **disco**) | **uma régua por comando** (`L-033`) + **um sensor por mutação**; âncora dupla (`L-021`); CRLF normalizado (`L-031`); token exato (`L-034`) | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Workflow de CI (`.yml`) | unit (guarda que lê o **disco**) | os invariantes que decaem em silêncio: ausência de literal de domínio, a declaração da cegueira, a leitura do remetente do auth a partir de `config.toml`, e a distinção indisponibilidade × configuração. Molde: `vercelRedirects.test.ts`, que já guarda um arquivo de config desta forma | `apps/store/src/shared/lib/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Documentação (`.md`, `.env.example`, `config.toml`) | none | gate de build — **exceto** o remetente do auth, que `authSenderDomain.test.ts` **já** guarda e não pode regredir | — | build gate |
| Operação (secret, dashboard, `functions delete`) | none | **evidência** no `validation.md`: digest antes/depois, captura, `functions list` antes/depois | — | — |

**Por que o workflow tem guarda e a documentação não.** O `email-check.yml` carrega decisões que
somem sem quebrar nada — alguém acrescenta o domínio literal "para ficar mais claro" e cria o
terceiro dono; alguém apaga o comentário da cegueira e o próximo leitor acha que o auth está coberto.
É a mesma classe que `vercelRedirects.test.ts` guarda. Documentação não tem essa propriedade: ela
**é** o texto.

## Gate Check Commands

> Descobertos do repositório (`package.json` de cada workspace, `turbo.json`, `ci.yml`) — confirmar
> antes de Execute.

| Gate Level | Quando usar | Comando |
| --- | --- | --- |
| Quick | tasks que só tocam edge function | `pnpm --filter @estrelinha/functions test` |
| Full | tasks que tocam migration ou workflow (os guardas moram na suíte da loja) | `pnpm --filter @estrelinha/functions test` **e** `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Build | fecho de fase e tasks só de config/documentação | `pnpm build` · `npx tsc --noEmit -p apps/store/tsconfig.app.json` · `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |

> ⚠️ **Três armadilhas de medição, todas documentadas no `CLAUDE.md` e todas válidas aqui:**
> 1. **`--` antes da flag ENGOLE a flag.** `pnpm --filter <ws> test -- --testTimeout=20000` repassa o
>    `--` literal ao vitest e o teto continua em 5000 ms. As formas que funcionam são **sem** o `--`,
>    ou `pnpm --filter <ws> exec vitest run --testTimeout=20000`.
> 2. **`| tail` esconde a falha** — o exit code que sai do pipe é o do `tail`. Capturar fora do pipe.
> 3. **Um workspace por vez.** Duas suítes concorrentes saturam a máquina e produzem timeout em
>    testes que varrem disco — que é exatamente o que os guardas desta feature fazem.

> **O gate desta feature inclui a suíte da LOJA mesmo nas tasks de function**, porque `brandScan`,
> `notificationSingleOwner` e os guardas novos varrem `supabase/**`. Foi a lição que a `51` pagou.

---

## Execution Plan

Fases em sequência; tasks em ordem dentro de cada fase.

### Phase 1: O sensor

A peça que impede o defeito de voltar. Vem primeiro porque é o que torna todo o resto mensurável.

```
T1 → T2
```

### Phase 2: O banco

Independente do sensor. A nota interna e as peças de compatibilidade.

```
T3
```

### Phase 3: Deploy e documentação

```
T4 → T5 → T6
```

### Phase 4: Operação e fecho

```
T7
```

---

## Task Breakdown

### T1: A porta `config-check` na `send-notification`

**What**: acrescentar `configCheck(deps)` e o `case 'config-check'` no `route`, devolvendo os sete
campos não-secretos do contrato do design.
**Where**: `supabase/functions/send-notification/handlers.ts` (modificar) ·
`supabase/functions/send-notification/__tests__/handlers.test.ts` (modificar)
**Depends on**: None
**Reuses**: `isValidFrom` (`render/layout.ts:68`) · `json`/`corsHeaders` (`_shared/http.ts`) ·
`deps.env` (já injetado por `index.ts`) · o molde de caso de `handlers.test.ts`
**Requirement**: `DLV-05`, `DLV-10`

**Tools**: MCP: NONE (o MCP `supabase` exige autorização e está indisponível nesta sessão — uso
`npx supabase` pela CLI) · Skill: NONE

**Done when**:
- [ ] `configCheck(deps)` devolve **exatamente** as sete chaves do design e **nenhuma** a mais
- [ ] `from_valid` vem de `isValidFrom`, a MESMA função que o motor chama — não uma régua nova
- [ ] `has_api_key` é booleano; a chave **não** aparece, nem prefixo, nem tamanho
- [ ] `dev_redirect_active` é booleano; o endereço de redirecionamento **não** aparece
- [ ] `configCheck` **não** toca no client do Supabase (sensor não pode falhar por banco fora)
- [ ] a resposta é 200 mesmo com configuração ruim — é diagnóstico, não autorização
- [ ] `route` encaminha `?action=config-check` e o `OPTIONS` segue respondendo
- [ ] Gate: `pnpm --filter @estrelinha/functions test` (exit code fora de pipe)
- [ ] Contagem: functions **599 → ~613** (o número exato entra no `validation.md`), sem deleção

**Tests**: unit — um caso por campo do contrato, mais: chave ausente, `from` default, `from`
malformada, `dev_redirect_active` verdadeiro, e **o caso negativo que prova que a chave não vaza**
(varrer o corpo serializado e exigir que a string da chave não apareça).
**Gate**: quick
**Commit** (rótulo): `feat(52): a porta config-check declara a configuração de envio`

---

### T2: O sensor diário `email-check.yml`, e o guarda dele

**What**: criar o workflow com os sete passos, e o guarda que lê o `.yml` do disco.
**Where**: `.github/workflows/email-check.yml` (novo) ·
`apps/store/src/shared/lib/__tests__/emailCheckWorkflow.test.ts` (novo)
**Depends on**: T1
**Reuses**: a forma do `sitemap-check.yml` (schedule + dispatch, `set -euo pipefail`, `::error::` que
diz onde procurar) · `vercelRedirects.test.ts` como molde de guarda de arquivo de config
**Requirement**: `DLV-05`, `DLV-06`, `DLV-07`, `DLV-08`, `DLV-09`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] os sete passos do design existem, cada um com `::error::` próprio
- [ ] o passo 5 **deriva** o domínio esperado de `config-check` × `GET /domains` — **zero** literal
      de domínio no arquivo
- [ ] o remetente do auth é lido de `supabase/config.toml`, não escrito no `.yml`
- [ ] 429, timeout e 5xx dizem **indisponibilidade**; 403 diz **configuração**, nomeando qual
      remetente caiu
- [ ] a chave nunca é ecoada, e o corpo da resposta do Resend não vai para o log
- [ ] `schedule` diário **e** `workflow_dispatch`
- [ ] comentário declarando, por extenso, que o workflow **não** prova SMTP nem templates do GoTrue,
      e por quê (a CLI não tem `config pull`)
- [ ] o guarda tem **âncora dupla** (arquivo lido **e** os sete passos encontrados) e sensor para:
      domínio literal reaparecendo, o comentário da cegueira sumindo, e o remetente do auth virando
      literal
- [ ] Gate: `full`
- [ ] Contagem: store **3376 → ~3386**, sem deleção

**Tests**: unit (guarda de disco)
**Gate**: full
**Commit** (rótulo): `feat(52): o sensor diario de entrega de e-mail`

---

### T3: A migration — a nota interna fecha, a compatibilidade cai

**What**: uma migration com duas seções e **zero escrita de dado**, mais o guarda que a lê do disco.
**Where**: `supabase/migrations/20260919120000_52-entrega-de-email-comprovada.sql` (novo) ·
`apps/store/src/shared/lib/__tests__/entregaDeEmailSchema.test.ts` (novo)
**Depends on**: None
**Reuses**: a policy de `customer_notes` (`20260829120000_34:225-250`) como molde literal · o molde
de guarda de `checkoutSchema.test.ts` (réguas como **predicados**) · `notificationSingleOwner.test.ts`,
que já assere zero leitores de `order_emails`
**Requirement**: `DLV-15`..`DLV-20`, `DLV-23`, `DLV-24`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] as duas policies `Allow all …` caem por `drop policy if exists`
- [ ] cada tabela ganha **uma** policy `for all to authenticated` com `has_role` no `using` **e** no
      `with check`
- [ ] `revoke` tira de `anon` o alcance às duas tabelas
- [ ] a view `order_emails` e as RPCs `claim_order_email`/`finish_order_email` caem por `drop … if exists`
- [ ] `order_notifications`, `claim_order_notification` e `finish_order_notification` **não** são
      tocadas
- [ ] **zero** `insert`/`update`/`delete` de dado; idempotente por construção
- [ ] o guarda tem **âncora dupla** (arquivo lido **e** as duas tabelas encontradas) e **uma régua
      por comando** (`L-033`), cada uma com **sensor por mutação** — inclusive o `with check`
      omitido, que é a meia-correção que um teste de leitura não pega
- [ ] a régua dos drops vale nos **dois sentidos**: as três peças de compatibilidade caem **e** as
      três do motor não
- [ ] CRLF normalizado antes do removedor de comentário (`L-031`); recorte por token exato (`L-034`)
- [ ] **Probe contra o banco LOCAL** (`AD-012`, nunca inspeção de tipo): admin grava e lê nas duas
      tabelas; `anon` é recusado nas **quatro** combinações. Saída colada no `validation.md`
- [ ] Gate: `full`
- [ ] Contagem: store **+~22**, sem deleção

**Tests**: unit (guarda de disco) + probe SQL registrado
**Gate**: full
**Commit** (rótulo): `feat(52): nota interna por has_role e queda da compatibilidade da 42`

---

### T4: O passo que torna function zumbi visível

**What**: acrescentar ao `Supabase Deploy` um passo que compara a lista remota com os diretórios de
`supabase/functions/` e **avisa** na divergência.
**Where**: `.github/workflows/supabase-deploy.yml` (modificar) ·
`apps/store/src/shared/lib/__tests__/emailCheckWorkflow.test.ts` (estender — criado na T2)
**Depends on**: T2 (o guarda dele é estendido, não duplicado)
**Reuses**: o passo `conferir secrets das edge functions` (`:158-180`) como molde de laço e mensagem ·
o guarda da T2, que já lê `.github/workflows/` do disco
**Requirement**: `DLV-25`, `DLV-26`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] roda depois de `functions deploy`
- [ ] ignora diretórios com prefixo `_` (o CLI também ignora)
- [ ] emite `::warning::` por slug sobrando **e** por slug faltando, nomeando cada um
- [ ] **não** falha o job em nenhuma divergência (`DLV-26`)
- [ ] o guarda da T2 ganha a régua de `DLV-26`: o passo existe, emite `::warning::` e **não** carrega
      `exit 1` nem `::error::` — com sensor que injeta `exit 1` no passo e vê reprovar
- [ ] Gate: `full`
- [ ] Contagem: store **+~3**, sem deleção

**Tests**: unit (estende o guarda da T2)
**Gate**: full
**Commit** (rótulo): `chore(52): o deploy acusa divergencia entre o remoto e o repositorio`

---

### T5: `.env.example` e `config.toml` — a `C-08` vencida e a regra da mescla

**What**: marcar `C-08` como vencida e escrever a regra do `secrets set`.

> ⚠️ **Esta task mandava DESCOMENTAR o `[auth.email.smtp]`, e a instrução foi REVOGADA** (decisão do
> usuário, 2026-09-19 — `DLV-11`/`DLV-12` superseded). O bloco fica **comentado** e o dev segue no
> Mailpit: a `C-08` existia para validar que o remetente é aceito pela chave, e quem faz isso agora
> é o `Email check`, diariamente e sem efeito colateral. **A correção chegou aqui por último**, e a
> verificação da rodada 2 achou o `tasks.md` ainda mandando o oposto — que é o documento que alguém
> executa passo a passo.
**Where**: `supabase/config.toml` (modificar) · `.env.example` (modificar)
**Depends on**: None
**Requirement**: `DLV-27` (`DLV-11` **superseded**)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `[auth.email.smtp]` **segue comentado**, com a razão escrita no próprio arquivo (o `Email
      check` substituiu o motivo de ligá-lo). O `admin_email` continua declarado ali, porque é a
      fonte que o passo 7 do workflow lê
- [ ] a pendência `C-08` do `.env.example` marcada **vencida**, com a data e a medição que a venceu
- [ ] `.env.example` declara que **`supabase secrets set` mescla o `.env` do diretório atual**, com
      `count: 8` × `count: 1` como evidência, e prescreve o procedimento seguro (dashboard, ou CLI de
      um diretório sem `.env`)
- [ ] `authSenderDomain.test.ts` segue verde — o remetente do auth **não** pode mudar aqui
- [ ] Gate: `full` (o `brandScan` e o `authSenderDomain` varrem estes arquivos)

**Tests**: none própria — os dois arquivos já são varridos por `brandScan.test.ts` e
`authSenderDomain.test.ts`, que precisam continuar verdes.
**Gate**: full
**Commit** (rótulo): `docs(52): SMTP do auth ligado e a regra da mescla do secrets set`

---

### T6: `supabase/CLAUDE.md` e `CLAUDE.md` — o que o sensor cobre, e o que não

**What**: registrar a limitação da CLI, o contrato do digest, o incidente, o workflow novo e as
baselines.
**Where**: `supabase/CLAUDE.md` (modificar) · `CLAUDE.md` (modificar)
**Depends on**: T1, T2, T3, T4, T5
**Requirement**: `DLV-14`, `DLV-28`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `supabase/CLAUDE.md` declara que a CLI **não tem `config pull`**, que o `[auth]` do hospedado
      só é verificável por dashboard ou probe, e **exatamente** o que o `Email check` cobre e não
      cobre
- [ ] `supabase/CLAUDE.md` registra que o digest de `secrets list` é **hash estável do valor** (logo
      serve de antes/depois) e que **`updated_at` uniforme delata a mescla**
- [ ] a `send-notification` ganha `config-check` na lista de portas, com a razão de ser aberta
- [ ] `CLAUDE.md` põe `Email check` na tabela de workflows
- [ ] `CLAUDE.md` registra o incidente na seção de estado conhecido, apontando `BL-044`
- [ ] baselines de lint, tipos e testes **medidas** e atualizadas (nunca somadas de memória)
- [ ] Gate: `build`

**Tests**: none
**Gate**: build
**Commit** (rótulo): `docs(52): o que o sensor cobre, o incidente e as baselines`

---

### T7: Os passos de operação e a evidência

**What**: executar `O2`..`O5` e registrar a evidência exigida.
**Where**: `.specs/features/52-entrega-de-email-comprovada/validation.md`
**Depends on**: T6
**Requirement**: `DLV-01`, `DLV-02`, `DLV-13`, `DLV-21`, `DLV-22` (`DLV-12` **superseded**; `DLV-03` é guarda **herdado** da `42`)

**Tools**: MCP: NONE (CLI por `npx supabase`, de um diretório **sem** `.env`) · Skill: NONE

**Done when**:
- [ ] `O1` já feito — digest antes/depois e o `POST /emails` 200 transcritos
- [ ] ~~`O2` — SMTP local ligado~~ — **revogado** (ver T5). O dev segue no Mailpit
- [ ] `O3` — **quem executa é o usuário**: captura do dashboard com SMTP, os três templates e
      `otp_length`/`otp_expiry`; divergência conserta-se lá e recaptura-se
- [ ] `O4` — **quem executa é o usuário ou eu com confirmação**: `functions delete send-email`,
      **antes** do push da migration da T3, com `functions list` antes (9) e depois (8)
- [ ] `O5` — uma linha `sent` com `provider_message_id` em `order_notifications`, e o e-mail aberto
      num celular
- [ ] `DLV-03` — o recorte `status <> 'sent'` está guardado em
      `apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts`, **herdado da feature
      `42`**. Esta feature não escreve caso em `functions`: lá o dublê mocka a RPC, e o caso
      asseriria o dublê
- [ ] `git diff --name-only` confirma `packages/core/src/payment/**` intocado
- [ ] Gate: `build` + as cinco suítes medidas **uma por vez**, exit code fora de pipe

**Tests**: none — é evidência de operação, não asserção
**Gate**: build
**Commit** (rótulo): `docs(52): evidencia de operacao e fecho`

---

### T8: O remetente em dois campos, com dono único

**What**: aposentar `RESEND_FROM` e compor o remetente de `RESEND_SENDER_NAME` +
`RESEND_SENDER_EMAIL`.
**Where**: `packages/core/src/notifications/sender.ts` (novo) + `__tests__/sender.test.ts` (novo) ·
`send-notification/index.ts` e `handlers.ts` · `mercado-pago/index.ts` · `.env.example` ·
`supabase/config.toml` · `supabase-deploy.yml` · `_shared/__tests__/wiringResolve.test.ts`
**Depends on**: T1 (o contrato do `config-check` devolve o `from` composto)
**Requirement**: `DLV-29`, `DLV-30`, `DLV-31`

> **Esta task nasceu DEPOIS da rodada 1 da verificação**, a pedido do usuário, e por um tempo
> existiu só em prosa — sem AC, sem task e sem guarda, enquanto **mudava o contrato de produção**
> (um secret apagado, dois exigidos pelo CI). A rodada 2 achou isso, e é o registro que importa:
> trabalho que altera produção entra com requisito, ou entra sem rede.

**Done when**:
- [ ] `senderFrom(nome, email)` em `core` é o **único** dono da composição, inclusive da regra de
      aspas do RFC 5322, e cada caso assere o par com `isValidFrom` — o validador real do motor
- [ ] devolve **vazio** (não lança) quando não dá para montar, inclusive com o valor antigo
      combinado no campo do endereço
- [ ] `RESEND_FROM` não é lida por **nenhum** entrypoint, e os dois que compõem citam as **duas**
      metades — guardado em `wiringResolve.test.ts`, com sensor nos dois sentidos
- [ ] `DEFAULT_SENDER_FROM` tem dono único; `handlers.ts` **reexporta** de `core` em vez de declarar
- [ ] `supabase-deploy.yml` confere as duas (a lista foi de 7 para 8 nomes)
- [ ] Gate: `full` — core **+16**, functions **+15**, sem deleção

**Tests**: unit (core) + guarda de disco (functions)
**Gate**: full
**Commit** (rótulo): `refactor(52): o remetente dos transacionais em dois campos`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──┐
Phase 2:  T3          │  (T2 cria o guarda de workflow
Phase 3:  T4 ←────────┘   que a T4 estende)
          T4 ──→ T5 ──→ T6
Phase 4:  T7
```

**7 tasks ⇒ um único batch (≤ ~8).** Execução **inline**, sem sub-agentes. O Verifier independente
roda automaticamente depois da T7, como sempre.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 função + 1 `case`, num arquivo | ✅ Granular |
| T2 | 1 workflow + o guarda dele | ✅ Coeso (arquivo + seu teste) |
| T3 | 1 migration + o guarda dela | ✅ Coeso (o par que o projeto sempre entrega junto) |
| T4 | 1 passo num workflow existente | ✅ Granular |
| T5 | 2 arquivos de config, **uma** mudança conceitual | ⚠️ OK — `config.toml` e `.env.example` descrevem o mesmo remetente; separá-los deixaria meio passo aplicado |
| T6 | 2 arquivos de documentação, um assunto | ⚠️ OK — mesma razão |
| T7 | evidência de operação | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama mostra | Status |
| --- | --- | --- | --- |
| T1 | None | (início da Phase 1) | ✅ Match |
| T2 | T1 | `T1 → T2` | ✅ Match |
| T3 | None | (início da Phase 2) | ✅ Match |
| T4 | T2 | T2 está na Phase 1, anterior — seta entre fases | ✅ Match |
| T5 | None | `T4 → T5` é **ordem de execução**, não dependência de dados | ✅ Match — a seta é sequência dentro da fase, e T5 não depende de T4 |
| T6 | T1..T5 | `T5 → T6`, e T1..T4 estão em fases anteriores | ✅ Match |
| T7 | T6 | `T6` (Phase 3) → `T7` (Phase 4) | ✅ Match |

Nenhuma task depende de task em fase posterior.

---

## Test Co-location Validation

| Task | Camada criada/modificada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Handler de edge function | unit | unit | ✅ OK |
| T2 | Workflow de CI | unit (guarda de disco) | unit | ✅ OK |
| T3 | Migration SQL | unit (guarda de disco) | unit + probe | ✅ OK |
| T4 | Workflow de CI | unit (guarda de disco) | unit (estende o da T2) | ✅ OK |
| T5 | Documentação/config | none | none | ✅ OK |
| T6 | Documentação | none | none | ✅ OK |
| T7 | Operação | none | none | ✅ OK |

> **A T4 chegou a ser escrita com `Tests: none` e a exceção não se sustentou.** O argumento era que a
> régua seria o próprio texto do passo. Mas `DLV-26` fixa um invariante de verdade — *o passo avisa e
> nunca falha o job* —, e trocar `::warning::` por `exit 1` faria o deploy inteiro parar por causa de
> dívida, que é o oposto do que a AC pede. Isso é guardável e não é tautológico, então a régua entrou
> no guarda da T2, com sensor por injeção. **Registrado aqui em vez de apagado**, porque o raciocínio
> errado é o que a próxima feature repetiria.

---

## Perguntas antes de Execute

**MCPs**: o MCP `supabase` desta sessão **exige autorização e está indisponível** — todas as tasks
usam a CLI por `npx --no-install supabase`. Nenhuma outra MCP é necessária.

**Skills**: nenhuma. `playwright-cli` não se aplica (não há tela nesta feature).

**Duas travas conhecidas do ambiente**, que a T7 vai encontrar:
- escrita em secret store está **bloqueada** para mim pela política do sandbox (`Secret-Store Writes`);
- `functions delete` é remoção em produção e precisa de confirmação explícita.
