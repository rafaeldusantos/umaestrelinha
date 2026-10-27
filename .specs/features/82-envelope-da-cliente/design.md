# 82 · Envelope da cliente — Design

Leia a `spec.md` antes. Este arquivo diz **onde** cada regra mora e **o que muda** em cada arquivo.

## 1. Mapa de donos

| Pergunta | Dono (novo ou existente) | Leitores |
| --- | --- | --- |
| Pode editar o código do envelope? | `materialTrackingEdit(row)` — **novo**, `core/material/envelope.ts` | app (bloco + folha), `runAppAction` (guarda) |
| Título/frase/valor da folha | `materialTrackingSheet(row)` — **novo**, mesmo arquivo | `FolhaDoRastreio` (origem `'material'`) |
| Quem informou e quando | `materialTrackingOrigin(row, agora)` — **novo** | bloco |
| Frase do "sem código" | `materialTrackingEmpty(row, agora)` — **novo** | bloco |
| Frase de recusa da RPC | `materialTrackingRefusal(reason)` — **novo** | porta → erro da folha |
| Chips de material | `orderMaterialKinds(itens)` — **novo** (`core/material/material.ts`) | bloco |
| Idade da espera | `materialWaitAge(row, agora)` — **novo**, compõe `rowQueueAge` + recorte de status/cancelado | bloco |
| Frase do cancelado | `MATERIAL_CANCELLED_NOTE` — **novo**, `core/material/envelope.ts` | bloco do app **e** `OrderMaterialCard` do painel |
| Frases fixas novas | `TRACKING_COPIED`, `COPY_FAILED`, `MATERIAL_TRACKING_SAVED`, `MATERIAL_IN_PRODUCTION` em `core/orders/appAction.ts` (junto de `ACTION_FAILED`) | app (aviso) — `fraseDaAcaoSoNoCore` passa a conhecê-las |
| Confirmações | `actionConfirmation` ganha `'rastreio-do-material'` e `'producao'` | `useAcaoDoPedido` |
| Escrita do código | `writeMaterialTracking(deps, { id, code, avisar })` — **novo**, `core/order-actions/materialTracking.ts` | `runAppAction` (app) **e** `useAdminOrders.setMaterialTracking` (painel, delega) |
| Ação do app | `runAppAction` ganha `PedidoDaAcao` `{ tipo: 'rastreio-do-material'; codigo }` e `{ tipo: 'producao' }` | `gravarAcao` (sem mudança de forma) |
| Linha do histórico | `buildHistory(status, emails, notes, envelope?)` — 4º argumento **opcional** | app (`usePedido`); o painel não passa (sem mudança) |
| URL dos Correios | `correiosTrackingUrl(code)` — **novo**, `apps/mobile-adm/src/shared/config/correios.ts` | bloco |

`envelope.ts` importa só relativos com `.ts` (`stats/labels.ts`, `./material.ts`, `../orders/row.ts`, `../orders/format.ts`) — mesmo cuidado de `steps.ts` (`stepsDenoReach.test.ts` cobre o grafo de `material/`; o arquivo novo entra na âncora).

## 2. Dados — a migration (mostrar antes de aplicar)

`supabase/migrations/20261028120000_82-envelope-da-cliente.sql`:

```sql
-- Feature 82 — quem informou o código do envelope, e quando.
-- Aditiva e idempotente. Nenhuma escrita de dado; linhas antigas ficam com as duas colunas nulas
-- (a tela diz "Código informado há…", nunca inventa a autoria).

alter table public.orders
  add column if not exists material_tracking_set_at timestamptz,
  add column if not exists material_tracking_set_by text;

alter table public.orders drop constraint if exists orders_material_tracking_set_by_check;
alter table public.orders
  add constraint orders_material_tracking_set_by_check
  check (material_tracking_set_by is null or material_tracking_set_by in ('customer', 'admin'));

-- A mesma RPC da 22, com as duas colunas a mais. Corpo idêntico até o update.
create or replace function public.set_material_tracking(p_order_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_current text;
  v_next text;
  v_admin boolean;
begin
  v_code := nullif(btrim(coalesce(p_code, '')), '');
  if v_code is null then
    return jsonb_build_object('ok', false, 'status', null, 'reason', 'empty_code');
  end if;

  v_admin := public.has_role(auth.uid(), 'admin');

  select o.material_status into v_current
  from public.orders o
  where o.id = p_order_id
    and (
      v_admin
      or o.customer_id in (select c.id from public.customers c where c.user_id = auth.uid())
    );

  if not found then
    return jsonb_build_object('ok', false, 'status', null, 'reason', 'not_allowed');
  end if;

  if v_current = 'nao_aplicavel' then
    return jsonb_build_object('ok', false, 'status', v_current, 'reason', 'material_not_applicable');
  end if;

  v_next := case when v_current = 'aguardando_material' then 'material_enviado' else v_current end;

  update public.orders
  set material_tracking_code = v_code,
      material_status = v_next,
      material_tracking_set_at = now(),
      -- Quem tem papel de admin é "você" para o ateliê, mesmo se for também a dona do pedido.
      material_tracking_set_by = case when v_admin then 'admin' else 'customer' end
  where id = p_order_id;

  return jsonb_build_object('ok', true, 'status', v_next, 'reason', null);
end;
$$;

revoke all on function public.set_material_tracking(uuid, text) from public;
revoke all on function public.set_material_tracking(uuid, text) from anon;
grant execute on function public.set_material_tracking(uuid, text) to authenticated;

-- order_list: CREATE OR REPLACE só aceita coluna ACRESCENTADA AO FIM. Lista copiada da 35, intacta.
create or replace view public.order_list
with (security_invoker = true) as
select
  id, order_number, customer_id, status, subtotal, shipping_cost, discount, total,
  payment_method, shipping_method, tracking_code, notes, created_at, updated_at,
  customer_name, customer_email, address_street, address_number, address_neighborhood,
  address_city, address_state, shipping_carrier, cancel_reason, address_zip,
  address_complement, melhor_envio_id, melhor_envio_label_url, melhor_envio_protocol,
  coupon_code, coupon_id, payment_status, mp_payment_id, mp_status_detail, paid_at,
  pix_discount, shipping_service_id, delivery_estimate_min, delivery_estimate_max,
  mp_order_id, promotion_id, promotion_discount, material_status, material_tracking_code,
  material_received_at,
  row_number() over (
    partition by (coalesce(customer_id::text, lower(customer_email))) order by created_at
  )::integer as purchase_ordinal,
  customer_phone,
  customer_document,
  -- Feature 82, no fim.
  material_tracking_set_at,
  material_tracking_set_by
from public.orders o;
```

Notas:

- **O `where` da RPC não muda** (autorização e leitura na mesma consulta). `v_admin` só é calculado uma vez.
- **`materialTransitions.test.ts` (loja) lê a RPC da migration da `22`** e recusa coluna além de código e
  estado. Ele passa a ler **a definição vigente** (a da `82`) e a aceitar exatamente as quatro colunas — com
  asserção de que a da `22` **não é mais** a vigente (molde de `homeSections` com a `41`). Régua nova, não
  afrouxada.
- Guarda novo `envelopeSchema.test.ts` (loja, `shared/lib/__tests__`), uma régua por comando: colunas com
  `if not exists`; `check` com os dois valores; `set_by` decidido por `has_role` (nunca por parâmetro);
  `set_at = now()`; nenhum `update` antes do `if not found`; `grant` só a `authenticated`; `order_list` com
  `security_invoker` e as duas colunas como **últimas**; nenhum `insert/update/delete` fora da função.
  `mutar()` que lança.
- **Ordem de publicação: migration → bundles.** O detalhe do app pede `material_tracking_set_*` no `select`;
  sem a coluna a leitura inteira falha (`PGRST204`/`42703`).
- Probe `.specs/features/82-envelope-da-cliente/probes/01-rpc.sql` contra o banco local: cliente grava ⇒
  `customer`; admin grava ⇒ `admin`; recusas não tocam as colunas; `aguardando → enviado`, `recebido` fica.
- Tipos: `DbOrder` em `@estrelinha/supabase` ganha as duas colunas; `COLUNAS_DA_LISTA` **não** muda;
  `COLUNAS_DO_DETALHE` ganha `material_tracking_set_at, material_tracking_set_by`; `COLUNAS_DOS_ITENS` ganha
  `requires_material, material_kinds`. O probe de colunas da `74` (`probes/02-lista.ts`) é atualizado.

## 3. Core

### 3.1 `core/material/envelope.ts` (novo)

```ts
export const MATERIAL_CANCELLED_NOTE =
  'Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.'

export interface MaterialTrackingRow {
  status: string; material_status: string | null; material_tracking_code: string | null
  material_received_at: string | null; created_at: string; customer_name: string | null
  material_tracking_set_at?: string | null; material_tracking_set_by?: string | null
}

export const materialTrackingEdit = (row): { rotulo: 'Alterar' | null } | null
export interface MaterialTrackingSheetCopy { titulo; frase; valorInicial; rotulo; placeholder }
export const materialTrackingSheet = (row): MaterialTrackingSheetCopy | null   // null ⇔ !edit
export const materialTrackingOrigin = (row, agora: string): string | null       // null sem código
export const materialTrackingEmpty = (row, agora: string): string | null        // null com código
export const materialTrackingRefusal = (reason: string | null): string
export const materialWaitAge = (row, agora: string): QueueAge | null
```

`materialTrackingRefusal`: `empty_code` ⇒ "Digite o código do envelope."; `material_not_applicable` ⇒
"Este pedido não espera material."; outro ⇒ `ACTION_FAILED`. *(`not_allowed` nunca chega aqui — a porta o
transforma, A8.)*

### 3.2 `core/material/material.ts`

`orderMaterialKinds(itens: { requires_material?: boolean; material_kinds?: unknown }[]): MaterialKind[]` —
união de `toMaterialKinds` dos itens que exigem material, ordenada por `MATERIAL_KINDS`.

### 3.3 `core/order-actions/materialTracking.ts` (novo)

```ts
export type MaterialTrackingOutcome =
  | { tipo: 'ok'; antes: string | null; status: string; emailSent: boolean }
  | { tipo: 'recusado'; reason: string | null }      // empty_code, material_not_applicable
  | { tipo: 'nao-permitido' }                        // not_allowed
  | { tipo: 'falhou'; erro: unknown }

export async function writeMaterialTracking(deps, { id, code, avisar = true }): Promise<MaterialTrackingOutcome>
```

Chama `client.rpc('set_material_tracking', { p_order_id, p_code })`; `notify(id, 'material_tracking_set')`
só no `ok`, fora do `try` (molde de `material.ts`). `antes` não vem da RPC — `runAppAction` o passa da linha
para a confirmação ("passou para A caminho" ⇔ `antes = aguardando_material` e `status = material_enviado`).

### 3.4 `runAppAction` e tipos

- `PedidoDaAcao` += `{ tipo: 'rastreio-do-material'; codigo: string }` e `{ tipo: 'producao' }`.
- `AppActionOutcome` += `{ tipo: 'material-rastreio-recusado'; reason }` e o `ok` ganha `materialPassou?: boolean`.
- `rastreio-do-material`: `materialTrackingEdit(row)` nulo ⇒ `mudou` (sem rede); `trackingCodeRefusal` ⇒
  `falhou` sem rede (igual ao rastreio de saída); senão `writeMaterialTracking`. `nao-permitido` ⇒
  `nenhuma-linha` (a porta já transforma isso em conferência de papel — **`gravarAcao` não muda**).
- `producao`: `material_status ≠ material_recebido` ou cancelado ⇒ `mudou`; senão `writeMaterialStatus({ to:
  'em_producao' })` com `doMaterial`.

### 3.5 Histórico

`buildHistory(status, emails, notes, envelope?: { material_tracking_code; material_tracking_set_at;
material_tracking_set_by } | null)`. Com `set_at` e código: um evento `kind: 'status'` (ou `'material'` se o
`Historico` do app precisar de ícone próprio — decidir na task pelo que o widget desenha), título da `ENV-21`.
Sem `set_at`: nada. O painel continua chamando com 3 argumentos.

### 3.6 Painel

`useAdminOrders.setMaterialTracking` vira: `writeMaterialTracking({ client: supabase, notify: notifyOrder }, …)`
e traduz `ok ⇒ { ok: true, reason: null }` + refetch; `recusado ⇒ { ok: false, reason }`; `nao-permitido ⇒
{ ok: false, reason: 'not_allowed' }`; `falhou ⇒ { ok: false, reason: 'rpc_failed' }` — idêntico a hoje,
provado por `useAdminOrders.delega.test.ts` (uma linha por desfecho). `OrderMaterialCard` usa
`MATERIAL_CANCELLED_NOTE` (o texto muda de "—" para ","; o teste do card passa a ler a constante).

## 4. App (`apps/mobile-adm`)

### 4.1 Folha parametrizada, não duplicada

`FolhaDoRastreio` ganha `origem: TrackingSheetOrigin | 'material'`, e recebe pelo controle o objeto de
cópia (`titulo`, `frase`, `valorInicial`, `rotulo`). A origem decide o `PedidoDaAcao` a montar:

- `useFolhaNoHistorico(pedido, origem, …)` ganha o ramo `'material'`, que lê `materialTrackingSheet(pedido)`
  e fecha quando ela vira `null` (`ENV-13`).
- A folha usa `folha.rotulo ?? ROTULO_DO_CAMPO` e monta `{ tipo: 'rastreio-do-material', codigo }` quando
  `origem === 'material'`, senão o de hoje.
- O erro de recusa da RPC chega pelo mesmo `acao.erro.frase` (`role="alert"`); `erros.ts` traduz
  `material-rastreio-recusado` por `materialTrackingRefusal`.

Os testes atuais da `FolhaDoRastreio` (origens `acao`/`entrega`) **não mudam**.

### 4.2 Componentes novos

| Arquivo | Papel |
| --- | --- |
| `features/order-actions/ui/EnvelopeDaCliente.tsx` | a subseção (cabeçalho, cartão, Copiar/Correios, vazio, botão Informar, e a folha `origem="material"`) |
| `features/order-actions/ui/ColocarEmProducao.tsx` | o botão de `ENV-25` |
| `shared/config/correios.ts` | `CORREIOS_TRACKING_BASE` + `correiosTrackingUrl(code)` |
| `widgets/order-detail/ui/MaterialChips.tsx` | chips + idade (`orderMaterialKinds`, `materialWaitAge`) |

`BlocoMaterial` ganha props de nó `envelope?`, `producao?` e `itens` (para os chips) — continua sem decidir
nada; quem compõe é a `PedidoPage` (molde do `lembrete`). Cancelado ⇒ o bloco desenha `MATERIAL_CANCELLED_NOTE`
no lugar de `envelope`-ações (o cabeçalho e a frase do vazio continuam: "Nenhum código registrado.").

### 4.3 Avisos

`useAcaoDoPedido` usa `actionConfirmation` para `'rastreio-do-material'` (título `MATERIAL_TRACKING_SAVED`,
frase por `materialPassou`) e `'producao'`. "Código copiado." e a falha de cópia usam o mesmo `AvisoDaAcao`
por um `avisar(titulo, frase?)` já existente em `model/avisos.ts` (conferir na task; se não houver forma
pública, acrescentar uma sem mudar as atuais).

### 4.4 Releitura

O `reler` da `PedidoPage` já invalida `chaveDoPedido(id)` e `STORE_OVERVIEW_KEY`; o `aoConcluir` da ação
chama o mesmo caminho que a ação primária usa hoje (conferir em `useAcaoDoPedido` — se a invalidação já está
lá, nada muda na página).

## 5. Guardas tocados

| Guarda | Efeito |
| --- | --- |
| `fraseDaAcaoSoNoCore` | ganha as frases novas na âncora positiva |
| `regraDePedidoSoNoCore` | o app não escreve `material_status` em mapa/predicado — `EnvelopeDaCliente` só chama `core` |
| `semDadoSensivelDeClienteNoApp` | colunas novas não são sensíveis; o probe de colunas confirma a lista |
| `tomMemorialDosAvisos` | frases novas sem exclamação/emoji/urgência |
| `escritaSoPelaPorta` | sem `rpc` no app — a RPC é chamada de `core` |
| `whatsappComDonoUnico` | não tocado |
| `novaAbaAvisada` | "Ver nos Correios" com `nomeDoLinkExterno` |
| `movimentoDosPedidos` / `movimentoDosAvisos` | arquivos novos entram no escopo literal, com par `motion-reduce:` |
| `materialTransitions` (loja) | lê a RPC vigente (§2) |
| `marcacaoSoPorAcao` (loja) | `set_material_tracking` já está na lista; sem mudança esperada |
| `pedidoGravadoSoPeloDono` (loja) | RPC não é escrita PostgREST; sem mudança esperada |
| `useAdminOrders.delega` (painel) | +4 linhas (os desfechos do código do envelope) |
| `purity`/`denoReach` de `core` | arquivos novos com `.ts` explícito e sem pacote |
