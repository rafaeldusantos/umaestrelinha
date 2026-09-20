# 57 — Design

## 1. `resolveOwnerEmail` — o dono único do destinatário interno (`AVD-09`)

`packages/core/src/notifications/owner.ts` (novo):

```ts
export function resolveOwnerEmail(general: { email?: string; notifications_email?: string }): string
```

Devolve `notifications_email` aparado se houver, senão `email` aparado, senão `''`.

**Três consumidores, e é por isso que a função existe** — não por elegância:

| Quem pergunta | Onde | O que faz com a resposta |
| --- | --- | --- |
| o motor, ao escolher o destino | `dispatch.ts` → `recipientFor` | manda o e-mail, ou pula com `no_owner_contact` |
| o motor, ao conferir a pré-condição | `dispatch.ts:432` → `preconditionFailure({ ownerEmail })` | recusa antes do claim |
| o painel, ao avisar a dona | `NotificationsTab` → `warningsFor` | mostra "nenhum e-mail cadastrado para você" |

Escrito três vezes, o fallback diverge — e a forma da divergência é a pior possível: **o painel
avisando que falta e-mail enquanto o motor manda para o de contato**, ou o contrário. Nenhum dos
dois quebra nada.

`core/notifications` já é puro e alcançável pelo Deno (`purity.test.ts`); o arquivo novo entra na
varredura dele por construção, e todo import relativo leva `.ts`.

## 2. Os dois eventos

`NOTIFICATION_EVENTS` fica com 17, e os quatro `owner_*` ficam **no fim, na ordem da jornada deles**:

```
… post_delivery_care,
owner_order_received,     ← novo
owner_order_paid,
owner_payment_rejected,   ← novo
owner_material_incoming,
```

A lista é ordem de jornada, e o bloco `owner` sempre foi um sub-bloco no fim. Inserir no meio dele
muda a ordem do `check` e da tela — as duas corretas, e as duas medidas.

**Gatilhos** (`eventsForTrigger`), cliente **antes** da dona, que é a regra escrita no arquivo:

```
pix_created      → ['order_received',   'owner_order_received']
payment_rejected → ['payment_rejected', 'owner_payment_rejected']
```

**Pré-condições** (`preconditionFailure`):

```
owner_order_received:   blank(ownerEmail) → 'no_owner_contact'
owner_payment_rejected: order.payment_status !== 'rejected' → 'payment_not_rejected'
                        blank(ownerEmail) → 'no_owner_contact'
```

`owner_order_received` não tem estado a exigir além de o pedido existir — ele nasce junto do pedido,
e exigir `paid_at` seria exigir o contrário do que ele anuncia.

**Ícones**: `NOTIFICATION_ICON_KEYS` vai a 17 — `inbox-new` para o recebido interno e `alert` para a
recusa. São chaves **distintas** das dos eventos da cliente (`mail`, `x`): o card recolhido distingue
pelo ícone e pelo nome, e dois eventos com o mesmo desenho apagariam metade disso.

## 3. O campo novo

`GeneralSettings.notifications_email: string`, default `''`.

**Vazio é significativo, e por isso o default é `''` e não o e-mail de contato copiado**: uma cópia
no default seria um segundo dono do endereço no dia em que ela trocasse o de contato e esquecesse o
outro. Vazio significa *"use o de contato"*, e isso é uma regra, não um dado.

Na tela, ao lado do e-mail de contato, com `hint` dizendo o que o vazio faz.

## 4. A migration, e os dois guardas que ela mexe

`supabase/migrations/20260920120000_57-avisos-para-a-dona.sql`, **aditiva e idempotente**:

1. Recria `order_notifications_event_check` com os **17**.
2. Acrescenta os dois eventos a `store_settings.notifications`, por
   `jsonb_set` no caminho `{events,<nome>}` **só quando a chave não existe** (`NOT value #> …`) —
   nunca sobrescreve texto editado nem religa o que foi desligado.
3. Acrescenta `notifications_email: ''` a `store_settings.general`, por `value || jsonb_build_object`
   guardado por `NOT value ? 'notifications_email'` — o molde aditivo da `37`.

**Nenhuma migration aplicada é reescrita** (`AD-017`). A da `42` continua como está.

### Os dois guardas que precisam aprender o endereço novo

| Guarda | O que muda, e por quê |
| --- | --- |
| `orderNotificationsSchema.test.ts` | Ele lê o `check` da migration da **42** e compara com `NOTIFICATION_EVENTS`. Com a constraint recriada, ele passaria a medir uma lista que o banco **não tem mais** — é o `PRF-05` de novo ("peça certa, endereço errado, suíte verde"). Passa a ler a **vigente**, com asserção de que a da 42 **não** é mais a dona (a lista dela tem 15 e a vigente 17), no molde de `homeSections.test.ts` depois da `41`. |
| `storeSettingsDefaults.test.ts` | Ele exige `seed42 === DEFAULT_NOTIFICATIONS`. Passa a exigir `merge(seed42, acréscimo57) === DEFAULT_NOTIFICATIONS`, que é o que o banco **de fato** fica — tanto num banco novo (42 insere, 57 acrescenta) quanto num existente (57 acrescenta). Sem isso a igualdade quebraria e a saída fácil seria afrouxá-la para `toMatchObject`, que deixaria o texto divergir em silêncio. |

**A composição é a asserção certa**, e não um remendo: ela modela a sequência real de migrations.
A alternativa — repetir os 17 eventos inteiros numa migration nova — reescreveria texto que a Adri
pode já ter editado.

## 5. O que NÃO muda

- `general.email` continua sendo o e-mail **público** (`PolicyContact.tsx`). A loja não vê o campo
  novo, e `AVD-11` é medido.
- `recipientFor` continua devolvendo **um** destino.
- Os 15 eventos de hoje: mesmo texto, mesmo estado, mesmo gatilho (`AVD-12`).

## Arquivos

**Novos**: `packages/core/src/notifications/owner.ts` · `.../__tests__/owner.test.ts` ·
`supabase/migrations/20260920120000_57-avisos-para-a-dona.sql`

**Alterados**: `core/notifications/{events,catalog,defaults,triggers,precondition,index}.ts` ·
`packages/supabase/src/types/settings.ts` · `dispatch.ts` ·
`backoffice/features/settings/ui/StoreDataSection.tsx` ·
`backoffice/features/notification-settings/{ui/eventIcons.ts,ui/NotificationsTab.tsx}` ·
os guardas de `apps/store/src/shared/lib/__tests__/` e os testes correspondentes
