# Design — frete grátis configurável

## 1. A forma do problema

Não é uma feature de UI com oito telas para ajustar. É **uma regra com oito leitores**, e a única
coisa que importa é que ela passe a ter **um escritor**. Toda a lista de arquivos abaixo é
consequência disso; se a regra ficar em dois lugares, a feature falhou mesmo com as 25 ACs verdes.

A pergunta que hoje sete arquivos respondem por conta própria é sempre a mesma:

> Esta loja pratica frete grátis? Se sim, a cliente já atingiu a faixa, e quanto falta?

---

## 2. A regra pura — `packages/core/src/shipping/freeShipping.ts`

Módulo novo, vizinho de `estimate.ts`, exportado pelo barrel `@estrelinha/core/shipping`. Sem React,
sem Supabase, sem Deno. Todo import relativo com extensão `.ts` explícita, **inclusive `import type`**
(regra do `CLAUDE.md` medida na feature 33).

```ts
export interface FreeShippingConfig {
  free_shipping_enabled: boolean
  free_shipping_threshold: number
}

export interface FreeShippingState {
  /** A loja pratica frete grátis por valor de compra? */
  active: boolean
  /** A faixa. **Zero quando inativo** — ver invariante 3. */
  threshold: number
  /** Quanto falta em reais. Zero quando atingiu e quando inativo. */
  remaining: number
  /** 0–100, já limitado. Zero quando inativo. */
  percent: number
  /** A faixa foi atingida? **Sempre `false` quando inativo** — ver invariante 1. */
  reached: boolean
}

export const freeShippingState = (
  config: FreeShippingConfig,
  subtotal: number,
): FreeShippingState
```

### As três invariantes que carregam a feature

1. **`active === false` ⇒ `reached === false`.** É a asserção que mata o defeito de hoje. As quatro
   superfícies que zeram frete perguntam "atingiu?"; se `reached` puder ser verdadeiro com a
   funcionalidade desligada, o defeito volta pela porta dos fundos e ninguém vê.
2. **`active = enabled && threshold > 0`.** Faixa zerada ou negativa com o interruptor ligado é dado
   inválido, e a regra o trata como inativo em vez de dividir por zero. É o cinto; o suspensório é a
   recusa na gravação (§6).
3. **`active === false` ⇒ `threshold === 0`.** O estado devolvido é auto-consistente: uma superfície
   que renderize `state.threshold` não consegue vazar o número guardado enquanto a funcionalidade
   está desligada. Quem precisa do número guardado é só o editor de configurações, e ele lê das
   settings, não daqui.

### O veredito com motivo — `freeShippingRefusal`

```ts
/** `null` = configuração aceitável. String = o motivo, em português, para exibir no campo. */
export const freeShippingRefusal = (config: FreeShippingConfig): string | null
```

`string | null` e **não** união discriminada por booleano: com `strictNullChecks: false`,
`{ ok: true } | { ok: false; reason: string }` não estreita, e ler `.reason` no `else` é TS2339.
É o formato já usado por `menuSlotRefusal` e `reservedSlugRefusal` (`CLAUDE.md`).

---

## 3. O binding React — `packages/core/src/hooks/useFreeShipping.ts`

```ts
export function useFreeShipping(subtotal = 0): FreeShippingState
```

Uma linha de cola: `useShippingSettings()` + `freeShippingState()`, memoizado pelas **primitivas**
(`enabled`, `threshold`, `subtotal`) e não pelo objeto de settings — sem isso o retorno muda de
identidade a cada render e refaz os `useMemo` de quem consome (`DeliveryBlock` tem um).

**É este hook que as superfícies importam.** O ganho não é ergonomia: é que nenhuma delas passa a ter
motivo para importar `useShippingSettings` e ler `free_shipping_threshold`, que é justamente o que o
guarda de §7 proíbe. O `subtotal` tem default `0` porque quatro consumidores (`TrustBar`,
`ProductTrustBadges`, `PoliciesPage`, `AuthOverlay`) só precisam de `active` e `threshold`, que não
dependem dele.

---

## 4. O caminho não-React — `constants.ts` e o `cartStore`

O `cartStore` é zustand fora do React e não pode chamar hook. Hoje ele lê os módulos mutáveis
`FREE_SHIPPING_THRESHOLD`/`SHIPPING_COST`, hidratados por `RuntimeSettingsLoader`. O mecanismo fica;
o que muda é o que ele carrega e quem interpreta.

| Antes | Depois |
| --- | --- |
| `constants.ts` exporta `FREE_SHIPPING_THRESHOLD` | exporta também `FREE_SHIPPING_ENABLED` e a função `runtimeFreeShippingConfig(): FreeShippingConfig` |
| `RuntimeSettingsLoader` hidrata 2 campos | hidrata 3 |
| `cartStore.shippingCost()` faz `sub >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST` | faz `freeShippingState(runtimeFreeShippingConfig(), sub).reached ? 0 : SHIPPING_COST` |

Depois disso o `cartStore` **não lê mais o threshold** — lê a mesma função que as telas. O guarda de
§7 alcança este arquivo sem exceção.

---

## 5. `drawerFacts.freeShippingProgress` é APAGADA

Ela é a regra, escrita uma segunda vez, com a semântica **invertida** no caso de borda (threshold
zerado ⇒ `reached: true`). Mantê-la e "só ajustar" seria conservar o segundo dono.

- A função sai de `apps/store/src/widgets/cart-drawer/model/drawerFacts.ts`.
- Os 3 casos de `drawerFacts.test.ts` que a cobrem **migram** para
  `packages/core/src/shipping/__tests__/freeShipping.test.ts`, onde ganham vizinhos.
- `lowStockLabel`, `pickCrossSell` e `variantChips` ficam onde estão: não são regra compartilhada.

**Contrapartida de contagem declarada**: store perde 3 casos, core ganha esses 3 mais os novos. É a
migração de asserção prevista pelo `CLAUDE.md` ("queda só vale se o número reaparece do outro lado").

`features/shipping-calc/ui/FreeShippingBar.tsx` é **apagado** com seu export do barrel: zero
consumidores, e era a oitava leitura da regra esperando para divergir.

---

## 6. O painel — aba Frete de `AdminSettingsPage`

```
┌─ Frete ────────────────────────────────────────────┐
│ [ ●] Oferecer frete grátis                         │
│      Quando desligado, a loja não anuncia frete    │
│      grátis e o frete é cobrado normalmente.       │
│                                                    │
│ Frete grátis a partir de (R$)   Custo padrão (R$)  │
│ [ 150,00          ]  ← disabled  [ 9,90         ]  │
│                        quando o interruptor        │
│                        está desligado              │
│ CEP de origem (Melhor Envio)                       │
│ [ 00000000                                      ]  │
└────────────────────────────────────────────────────┘
```

- `ToggleField` já existe em `@/shared/ui` (usado por `pix_enabled` e irmãos) — nada novo.
- O campo do valor fica **desabilitado, não escondido**, quando o interruptor está desligado: a Adri
  precisa ver o número que está guardado para decidir se quer religar com ele.
- **Salvar chama `freeShippingRefusal` antes do upsert.** Recusa ⇒ toast com o motivo e **nenhuma
  escrita** em `store_settings`. É a única forma de o painel não exibir "ligado" enquanto a loja se
  comporta como desligada.

---

## 7. O guarda — `freeShippingSingleOwner.test.ts`

Mora em `apps/store/src/shared/lib/__tests__/`, junto dos outros que varrem disco (mesmo acidente de
origem já registrado no `CLAUDE.md`: eles não guardam só a loja). Molde de `provenanceNotRead.test.ts`.

O que derruba a suíte:

| Asserção | Por quê |
| --- | --- |
| `free_shipping_threshold` lido em `apps/**` fora do allowlist | é a leitura direta que a feature acabou de centralizar |
| `freeShippingProgress` reaparecer em `apps/**` | é o nome do segundo dono que acabou de ser apagado |
| copy do tipo `frete grátis acima de R$ 150` cravada em fonte não-teste | é a `FRG-13`, e o `AuthOverlay` prova que a regra existente não bastou |

**Allowlist, exatamente um arquivo**: `apps/backoffice/src/pages/admin/AdminSettingsPage.tsx` — o
editor da configuração, que por definição lê o campo cru. Escrito **literalmente** no teste, nunca
derivado de uma constante que o próprio código sob teste exporte (a régua nunca pode ser o objeto
medido — lição da `fieldBorder`).

**Âncora dupla**, sem a qual um caminho errado varre zero arquivo e passa em silêncio:
1. número de arquivos varridos acima de um piso;
2. número de ocorrências **legítimas** encontradas igual ao esperado — se o allowlist deixar de
   casar, o teste reprova em vez de aprovar por vacuidade.

---

## 8. A migration

`supabase/migrations/20260905120000_37-frete-gratis-configuravel.sql`, molde exato de
`20260727120200_store_settings_checkout.sql` (que acrescentou `handling_days`):

```sql
UPDATE public.store_settings
   SET value = value || jsonb_build_object('free_shipping_enabled', false)
 WHERE key = 'shipping'
   AND NOT value ? 'free_shipping_enabled';
```

- **Aditiva**: `||` preserva `free_shipping_threshold`, `default_shipping_cost`, `origin_zip` e
  `handling_days`.
- **Idempotente**: `NOT value ? '…'` faz a segunda execução ser no-op, e impede que um `db reset`
  sobrescreva escolha da dona.
- **Migration nova, jamais reescrita**: `AD-017` venceu em 2026-08-17.
- `storeSettingsDefaults.test.ts` ganha um bloco que lê **este** arquivo do disco, no molde do bloco
  `google_shopping`, que já lê uma migration separada.

---

## 9. Mapa de alteração

| Arquivo | O quê |
| --- | --- |
| `packages/core/src/shipping/freeShipping.ts` | **novo** — a regra e o veredito |
| `packages/core/src/shipping/index.ts` | reexporta |
| `packages/core/src/shipping/__tests__/freeShipping.test.ts` | **novo** — regra + os 3 casos migrados |
| `packages/core/src/hooks/useFreeShipping.ts` | **novo** — binding React |
| `packages/core/src/constants.ts` | `FREE_SHIPPING_ENABLED` + `runtimeFreeShippingConfig()` |
| `packages/supabase/src/types/settings.ts` | campo + default `false` |
| `supabase/migrations/20260905120000_37-*.sql` | **novo** |
| `apps/store/src/app/RuntimeSettingsLoader.tsx` | hidrata o interruptor |
| `apps/store/src/entities/cart/model/cartStore.ts` | usa a regra |
| `apps/store/src/widgets/home-sections/ui/TrustBar.tsx` | `useFreeShipping` |
| `apps/store/src/entities/product/ui/ProductTrustBadges.tsx` | idem |
| `apps/store/src/pages/PoliciesPage.tsx` | idem |
| `apps/store/src/features/auth/ui/AuthOverlay.tsx` | literal morre; item derivado |
| `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx` | faixa e `CrossSell` condicionados |
| `apps/store/src/widgets/cart-drawer/model/drawerFacts.ts` | `freeShippingProgress` **sai** |
| `apps/store/src/features/checkout/ui/OrderSummary.tsx` | faixa e sufixo condicionados |
| `apps/store/src/features/checkout/ui/DeliveryBlock.tsx` | SHP-06 condicionado |
| `apps/store/src/features/shipping-calc/{index.ts,ui/FreeShippingBar.tsx}` | **apagados** |
| `apps/backoffice/src/pages/admin/AdminSettingsPage.tsx` | toggle + recusa |
| `apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts` | **novo** — o guarda |
| `apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts` | bloco da migration nova |

**Não tocados, e conferidos por `git diff --name-only` no gate**: `packages/core/src/payment/**` e
`supabase/functions/**`. O único frete grátis que o servidor conhece é o do cupom, e ele não muda
(decisão Q2).

---

## 10. Riscos

| Risco | Contenção |
| --- | --- |
| **A loja perde frete grátis no deploy** e ninguém sabe religar | Decisão consciente do usuário (Q1). Vira passo de operação no handoff e no `CLAUDE.md`, não nota de rodapé. |
| Uma superfície nova nasce lendo o threshold | O guarda de §7, com âncora dupla. |
| `reached` verdadeiro com a feature desligada | Invariante 1, com teste dedicado por superfície além do teste da regra. |
| jsdom não prova layout | As superfícies mudam de **presença**, não de medida — jsdom alcança. O que jsdom não alcança (a faixa some e o topo da gaveta sobe) vai para o navegador em 390px. |
