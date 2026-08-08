# Validação — 10-emails-transacionais

**Data:** 2026-07-30 · **Branch:** `feat/checkout-one-page`
**Modo:** *standalone fallback* de `validate.md` (passe de olhos frescos após a última task).
Sub-agents workers não foram usados nesta feature — restrição da sessão: não invocar o Agent tool sem
pedido explícito do usuário. Por isso o autor e o verificador são o mesmo agente, e **isso é uma
limitação declarada**, não uma equivalência: a separação autor≠verificador não existiu aqui. O que
substitui parcialmente essa separação é o sensor de discriminação, que é empírico e não depende do
julgamento de quem escreveu.

## Veredito: ✅ PASS

- Gate determinístico verde.
- **17 mutações de comportamento aplicadas nos arquivos reais, 17 killed, 0 survived.**
- 52 ACs rastreadas por `file:line`, com 3 fronteiras de cobertura **declaradas** (não fingidas).
- 6 itens que só fecham com credencial real do Resend seguem **abertos**, no roteiro do T11.

---

## Gate

```
pnpm turbo run test --force   → exit 0
  @nanapin/functions   222 passed (4 arquivos)
  @nanapin/core        310 passed (17 arquivos)
  @nanapin/backoffice   85 passed (14 arquivos)
  @nanapin/store       385 passed (37 arquivos)
  TOTAL              1.002 passed
pnpm build                    → exit 0  (store 3.163 módulos · backoffice 3.633 módulos)
```

`pnpm lint` fora do gate por dívida pré-existente (`CLAUDE.md` → *Estado conhecido*).
`deno check` **não executado**: o Deno não está instalado nesta máquina (`which deno` → not found).
Declarado, não fingido — a compensação é o probe de boot abaixo, que exercita o grafo de imports no
edge runtime de verdade.

### ⚠️ Deriva de baseline encontrada (pré-existente, não causada por esta feature)

O `STATE.md` da 09 registra `functions 81 · core 303 · backoffice 62 · store 372 = 818`. Medido no
início desta feature, **antes de qualquer alteração minha**: `functions 93 · store 384`. Eu não toquei
em `handlers.test.ts` da `mercado-pago` até o T7 (provado por `md5sum` idêntico no T3), então a
divergência é de bookkeeping da 09 não-commitada. Números desta feature são sempre os **medidos**:

| Pacote | Medido antes | Agora | Delta desta feature |
| ------ | ------------ | ----- | ------------------- |
| functions | 93 | 222 | +129 (52 templates · 5 fakes · 57 send-email · 15 gatilhos) |
| core | 303 | 310 | +7 |
| backoffice | 62 | 85 | +23 |
| store | 384 | 385 | +1 (1 assert invertido virou 2) |

---

## Probe de runtime (o alarme de `503 Module not found`)

`supabase stop && supabase start` executado — obrigatório porque o CLI bind-monta **um arquivo por
módulo importado**, calculado na subida do container, e esta feature adiciona 5 arquivos novos ao grafo
(`send-email/{index,handlers,sender,layout,templates}.ts` + `packages/core/src/formatters/price.ts`).

```
send-email?action=send                → HTTP 401  {"error":"Não autenticado"}
send-email?action=xpto                → HTTP 400  {"error":"action inválida. Use: send"}
mercado-pago?action=create-payment    → HTTP 400  (validação de payload)
mercado-pago?action=nada              → HTTP 400  {"error":"action inválida. ..."}
docker logs supabase_edge_runtime     → nenhum "Module not found"
```

Isto prova **duas** coisas de uma vez: que o `formatters/price.ts` novo é resolvível pelo Deno (o
motivo do T1) e que o import cruzado `mercado-pago → send-email/sender.ts` funciona no edge runtime
(o motivo do AD-005). Nenhum 503.

Nota de ambiente: `supabase_vector` está em `Restarting` — condição **pré-existente** ao trabalho
(observada antes do primeiro comando) e inalterada por ele.

---

## Banco (IDM-01…IDM-06) — transcript psql

Executado **dentro de uma transação com `ROLLBACK`**, para provar a semântica sem persistir nada. A
migration foi depois aplicada de verdade no banco local e sobreviveu ao `stop/start`.

| AC | Verificação | Resultado medido |
| -- | ----------- | ---------------- |
| IDM-01 | `select indexdef from pg_indexes where indexname='order_emails_order_type'` | `CREATE UNIQUE INDEX … USING btree (order_id, type)` — **sem `WHERE`**, confirmando o índice não-parcial |
| IDM-02 | 1º `claim_order_email` | devolveu id · `status=pending` · `attempts=1` |
| IDM-04 | `claim` sobre linha `pending`, e `claim` após `finish(failed)` | devolveu id · `attempts=2` → `3` · `error` limpo |
| — | `finish(…, 'resend_forbidden')` | `status=failed` · `sent_at` null |
| — | `finish(…, 'msg-abc-123', null)` | `status=sent` · `provider_message_id=msg-abc-123` · `sent_at` preenchido |
| IDM-03 | `claim` após `sent` | **NULL**, e ainda **1 linha** para o par |
| — | `claim` de outro `type` no mesmo pedido | devolveu id (tipos são independentes) |
| — | `insert … type='order_qualquer'` | recusado por `order_emails_type_check` |
| IDM-05 | `has_function_privilege` | `service_role=t` · `authenticated=f` · `anon=f` (nas duas RPCs) |
| IDM-06 | `pg_class.relrowsecurity` / `pg_policy` | RLS `t`; **política única**: `admin read order_emails`, `polcmd=r`, `{authenticated}` — nenhuma de escrita |
| IDM-06 | `set local role anon; select count(*)` | **0 linhas** |

---

## Sensor de discriminação — 17 mutações, 17 killed, 0 survived

Cada mutação foi aplicada **no arquivo de produção real**, o pacote foi rodado, e o arquivo restaurado
em seguida. `md5` de todos os 7 arquivos conferido idêntico ao original no fim (`RESTAURACAO: COMPLETA`).

| # | Arquivo | Mutação | O que deveria pegar | Resultado |
| - | ------- | ------- | ------------------- | --------- |
| M1 | `sender.ts` | `if (!order.paid_at)` → `if (false)` | EML-09/10: `order_paid` sem `paid_at` ⇒ 422 | KILLED |
| M2 | `sender.ts` | guard de `tracking_code` → `if (false)` | EML-09: `order_shipped` sem rastreio ⇒ 422 | KILLED |
| M3 | `sender.ts` | `if (!claimId)` → `if (false)` | IDM-03: claim null ⇒ `already_sent`, zero envio | KILLED |
| M4 | `sender.ts` | 403 → `resend_invalid` | RSD-01: 403 ⇒ `resend_forbidden` | KILLED |
| M5 | `sender.ts` | `res.ok` → `res.status === 200` | EML-11: qualquer 2xx é sucesso (201 inclusive) | KILLED |
| M6 | `sender.ts` | destinatário ignora o redirect | CFG-04: `RESEND_DEV_REDIRECT_TO` troca o destinatário | KILLED |
| M7 | `sender.ts` | `isValidFrom` → `if (false)` | CFG-03: `from` malformado não envia | KILLED |
| M8 | `handlers.ts` | `isAdmin !== true` → `false` | EML-04: não-admin ⇒ 403 | KILLED |
| M9 | `handlers.ts` | allow-list de `type` → `if (false)` | EML-05: `type` inválido ⇒ 400 antes do banco | KILLED |
| M10 | `mercado-pago/handlers.ts` | `target==='approved' && applied` → `applied` | **TRG-03: `refunded`/`expired` não manda "aprovado"** | KILLED |
| M11 | `mercado-pago/handlers.ts` | `rpcApplied === true` → `true` | TRG-04: aprovação já aplicada ⇒ zero e-mail | KILLED |
| M12 | `mercado-pago/handlers.ts` | remove o guard `pix?.qr_code` | TRG-09: PIX sem QR ⇒ zero e-mail | KILLED |
| M13 | `layout.ts` | `escapeHtml` deixa `&` passar | TPL-03: escape de HTML (injeção) | KILLED |
| M14 | `layout.ts` | `storeLink` sem normalizar barra | TPL-06: barra final produz href idêntico | KILLED |
| M15 | `formatters/price.ts` | `BRL` → `USD` | string BRL exata (com NBSP) | KILLED |
| M16 | `useAdminOrders.ts` | dispara em qualquer status | TRG-12: só `shipped` dispara no `updateStatus` | KILLED |
| M17 | `OrderDetailDialog.tsx` | `toast.error` → `toast.success` | UX-02: erro de banco fica visível | KILLED |

M10, M11 e M12 são as três que importam mais: são exatamente os modos de falha que o desenho
identificou como armadilhas (webhook de estorno mandando "aprovado", e-mail duplicado numa corrida,
e "seu PIX está pronto" sem PIX).

### Falso verde encontrado e consertado durante o desenvolvimento

Vale registrar porque foi o achado mais importante do ciclo. Depois do T7 os 207 testes passavam **e
nenhum e-mail disparava**: o dublê de `supabase` era estático, então a releitura que o motor de e-mail
faz devolvia o estado de **antes** dos updates do handler (`mp_order_id: null`), a pré-condição barrava,
e o gatilho nunca era exercitado — com a suíte verde. O conserto foi estender `RowFixture` para
enxergar o `select` (`_shared/testing/fakes.ts`), o que permite a fixture modelar "antes" na leitura do
handler e "depois" na do e-mail. Sem isso, TRG-08/TRG-01/TRG-04 seriam ACs "cobertas" que provavam nada.

---

## Rastreabilidade das ACs (evidence-or-zero)

### Contrato e autorização da function

| AC | Evidência (`file:line` + asserção) | Desfecho da spec | ✔ |
| -- | ---------------------------------- | ---------------- | - |
| EML-01 | `send-email/__tests__/handlers.test.ts:248` — `expect(sent.to).toBe('mariana@example.com')`, `expect(sent.html).not.toContain('corpo injetado')` | `to`/`subject`/`html`/`from` do chamador ignorados | ✅ |
| EML-02 | `handlers.test.ts:239` — `expect(response.status).toBe(403)` com `type` inválido **e** `order_id` não-uuid | auth vence validação | ✅ |
| EML-03 | `handlers.test.ts:146` — `expect(response.status).toBe(401)` + `expect(fetchDouble.calls).toHaveLength(0)`; `:157` idem para anon key | 401, zero chamadas | ✅ |
| EML-04 | `handlers.test.ts:167` — `403` + `toHaveLength(0)` em fetch **e** em `claim_order_email` | 403, zero chamadas | ✅ |
| EML-05 | `handlers.test.ts:206` (4 casos) — `400`, `error` contém `type inválido`, zero fetch, zero claim | 400 antes do banco | ✅ |
| EML-06 | `handlers.test.ts:223` (4 casos) — `400`, zero fetch | 400 | ✅ |
| EML-07 | `handlers.test.ts:274` — `404` + `{error:'Pedido não encontrado'}` + zero fetch/claim | 404 | ✅ |
| EML-08 | `handlers.test.ts:109` — `200` + `Access-Control-Allow-Origin: *` + zero fetch/rpc; `:131` prova CORS na resposta de **erro** | 200 + CORS | ✅ |
| EML-09 | `handlers.test.ts:285` (6 casos) — `422`, slug exato por tipo; `:305` (3 casos) — estado correto ⇒ `200` + 1 envio | tabela de pré-condições | ✅ |
| EML-10 | `handlers.test.ts:285` — `expect(rpcs.filter(claim)).toHaveLength(0)` + `expect(fetchDouble.calls).toHaveLength(0)` | 422 sem claim, retentável | ✅ |
| EML-11 | `handlers.test.ts:370,382,395,406` — endpoint/headers, envelope completo, `finish_order_email` com `provider_message_id`, **201 aceito** | 2xx ⇒ `{sent:true,id}` | ✅ |
| EML-12 | `handlers.test.ts:427` (10 casos) — `200` + `{sent:false,reason}` + `p_error` contém o status | 200 com o fracasso no corpo | ✅ |
| EML-13 | `handlers.test.ts:530,546` — `expect(JSON.stringify(lines)).not.toContain('mariana@example.com')` e `not.toContain('You can only send')` | nunca destinatário nem corpo cru | ✅ |

### Idempotência

| AC | Evidência | ✔ |
| -- | --------- | - |
| IDM-01…06 | transcript psql acima (índice, claim, grants, RLS, anon) | ✅ |
| IDM-03 | `handlers.test.ts:326` — `{sent:false,skipped:'already_sent'}` + `toHaveLength(0)` em fetch | ✅ |
| IDM-07 | `handlers.test.ts:347` — `expect(headers['Idempotency-Key']).toBe('order-email:<uuid>:order_paid')` | ✅ |
| — | `handlers.test.ts:336` — claim recebe `{p_order_id, p_type}`; `:355` — erro de claim ⇒ zero envio | ✅ |

### Templates

| AC | Evidência | ✔ |
| -- | --------- | - |
| TPL-01 | `templates.test.ts:53` (3 tipos) + `:61` allow-list e `renderEmail` cobrindo os três | ✅ |
| TPL-02 | `templates.test.ts:71` — sem `<link>`/`<style>`/`@font-face`/`background-image`; `:80` — sem `class=`, com `style="` | ✅ |
| TPL-03 | `templates.test.ts:89,101,115,122,132,140` — `&lt;3 &amp;`, `<img>` neutralizado, rastreio, **nome no HTML mas cru no texto**, os 5 caracteres | ✅ |
| TPL-04 | `templates.test.ts:146,152` — `R$ 60,50` e a multiplicação 2×12 = `R$ 24,00` | ✅ |
| TPL-05 | `templates.test.ts:159` — `Pedido NP-XYZ999` + `Total: R$ 1.234,56` | ✅ |
| TPL-06 | `templates.test.ts:183,190,198,203,209` — `/conta` e nunca `/pedido/`, barra final idêntica, `min-height:44px`, link no texto | ✅ |
| TPL-07 | `templates.test.ts:215,225,233` — itens/total/endereço no corpo, nunca `null`/`undefined`, endereço vazio sem bloco | ✅ |
| TPL-08 | `templates.test.ts:251,261` — 6 hexes Nanita, wordmark, rodapé, 560px, raio 24px | ✅ |
| CFG-03 | `templates.test.ts:302` (4 válidos) / `:311` (7 inválidos, incl. vírgula sem aspas); `handlers.test.ts:489` — não envia | ✅ |

### Gatilhos

| AC | Evidência | ✔ |
| -- | --------- | - |
| TRG-01 | `mercado-pago/__tests__/handlers.test.ts:2184` — 1 chamada ao Resend, assunto `Pagamento aprovado — pedido NP-EMAIL01` | ✅ |
| TRG-02 | `:2198` — `applied=false` ⇒ `toHaveLength(0)` | ✅ |
| TRG-03 | `:2208` (`refunded`, `expired`, `canceled`) ⇒ `toHaveLength(0)` | ✅ |
| TRG-04 | `:2099` — 1 `order_paid`, assunto `not.toContain('recebido')`; `:2115` — RPC `false` ⇒ zero | ✅ |
| TRG-05 | `:2138` — `status='rejected'` ⇒ zero | ✅ |
| TRG-06 | `:2234` (rede caída ⇒ PIX 200 com `qr_code`+`expires_at`), `:2250` (**resposta byte-idêntica** à baseline, com relógio congelado), `:2277` e `:2288` (motor **lançando** ⇒ PIX 200 / webhook `{received:true}`) | ✅ |
| TRG-08 | `:2069` — 1 chamada, assunto `Pedido NP-EMAIL01 recebido — aguardando o PIX`, `to` correto | ✅ |
| TRG-09 | `:2083` — `qr_code` vazio ⇒ zero | ✅ |
| TRG-10 | `:2154` — claim chamado 1×, Resend 0× | ✅ |
| TRG-11 | `templates.test.ts:270` — texto cita 30 minutos; HTML sem `qr_code`/`data:image`/"copia e cola" | ✅ |
| TRG-12 | `useAdminOrders.test.ts:67` (status `shipped`), `:77` (rastreio sempre), `:91` (4 status que **não** disparam) | ✅ |
| TRG-13 | `sendOrderEmail.test.ts:32` — 422 ⇒ `false` sem lançar | ✅ |
| TRG-14 | `sendOrderEmail.test.ts:38` — `already_sent` ⇒ `false` | ✅ |
| UX-01 | `OrderDetailDialog.test.tsx:143,149,155,161` — dica aparece/não aparece nos 3 estados, e **não** desabilita o save | ✅ |
| UX-02 | `OrderDetailDialog.test.tsx:93` (toast.error com a mensagem do banco), `:107`/`:117` (dois ramos de toast); `useAdminOrders.test.ts:118,132` (erro volta e **não** dispara e-mail) | ✅ |
| STO-01 | `OrderConfirmationPage.test.tsx:189` (pago ⇒ comprovante + endereço), `:197` (pendente ⇒ aviso futuro e **não** alega comprovante) | ✅ |

### Configuração

| AC | Evidência | ✔ |
| -- | --------- | - |
| CFG-01 | `supabase/config.toml` `[edge_runtime.secrets]` — as 4 envs; probe de boot prova que resolvem | ✅ |
| CFG-02 | `config.toml` `[functions.send-email] verify_jwt = false` + comentário; probe 401/403 prova a auth manual | ✅ |
| CFG-04 | `handlers.test.ts:499` (troca + prefixo `[dev → …]`), `:509` (vazia/espaços/undefined ⇒ inalterado) | ✅ |
| CFG-05 | `.env.example` — `STORE_PUBLIC_URL` documentada como origem **da loja**; `handlers.test.ts:520` prova que alimenta o href | ✅ |

---

## Fronteiras de cobertura DECLARADAS (não fingidas)

1. **TRG-07 — o ramo de abort do timeout não é coberto.** `createFakeFetch` ignora `init.signal`
   (`_shared/testing/fakes.ts`), então `resend_timeout` é inalcançável em teste. O que **está** provado
   é o efeito que importa: falha de saída (rede caída, 403, throw) não altera a resposta do pagamento
   (TRG-06). Os budgets em si (2500/8000ms) são constantes lidas por inspeção.
2. **Dropdown de status do backoffice não é dirigido em teste.** O `Select` do Radix exige APIs de
   pointer capture que o jsdom não tem, e remendá-las produz teste instável. O que ele provaria — erro
   volta e não dispara e-mail — está provado em `useAdminOrders.test.ts:118`, e os dois handlers do
   dialog têm a mesma forma; o ramo exclusivo do dialog (os toasts) está provado pelo caminho do
   rastreio, que é Input + Button. A mutação M17 confirma que esse caminho discrimina.
3. **`index.ts` das duas functions permanece sem teste**, por desenho (AD-004): é wiring com `Deno` e
   `esm.sh`. A compensação é o probe de boot. Nota: o `envOr`/`envOptional` que mora nele **é** lógica
   (trata env vazia como ausente) e está fora de teste automatizado — coberto só pelo probe.

## Desvio de plano registrado

O `tasks.md` previa `send-email/__tests__/sender.test.ts` com testes unitários de
`preconditionFailure` e `classifyResendFailure`. **Não foi escrito**: os testes de `handlers.test.ts`
já asseveram cada pré-condição e cada slug de erro pelo caminho real, e o Check C manda remover
asserção que duplica a mesma cena em outra camada. As mutações M1, M2 e M4 confirmam que a cobertura
pelo handler discrimina — não é atalho.

## O que segue ABERTO (só fecha com credencial real do Resend)

O roteiro completo está em comentário no topo de `sendOrderEmail` (`sender.ts`). Seis itens, dois
deles fechando assumptions **declaradas na spec**:

1. **Código HTTP do sucesso** — a doc do endpoint não documenta. O código aceita qualquer 2xx e há
   teste para 201, mas o valor real é desconhecido.
2. **Shape do JSON de erro** — a doc não documenta. `name` é lido defensivamente e há teste com corpo
   vazio, mas a estrutura real é desconhecida.
3. `Idempotency-Key` honrado de fato (mesma chave ⇒ mesmo `id`; corpo diferente ⇒ 409).
4. Ponta a ponta PIX → caixa de entrada → linha em `order_emails`.
5. O par `shipped`↔rastreio nas **duas** ordens, no backoffice de verdade.
6. **Renderização em Gmail mobile e Outlook web** — nenhum teste prova isso, e é onde e-mail quebra.

Também não verificado em runtime: a **coerção do enum `app_role`** na chamada
`rpc('has_role', { _role: 'admin' })` via PostgREST. O probe de boot só exercita o ramo de 401 (sem
JWT), que retorna antes da RPC. Se essa coerção falhar, a function **fecha o acesso** (403 + log
`admin_check_failed`) — falha segura, mas o e-mail de "enviado" simplesmente não sairia. Está no item 5
do roteiro.
