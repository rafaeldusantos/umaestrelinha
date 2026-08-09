# Checkout — Fluxo, pagamento e resumo — Design

**Spec:** [`spec.md`](./spec.md) · **Feature:** `15-checkout-fluxo-e-resumo`

---

## Verificação de conhecimento (cadeia, passos 1 → 4)

O que abaixo depende do SDK do Mercado Pago foi conferido **na documentação oficial**, não suposto:

| Fato | Fonte | Consequência no desenho |
| --- | --- | --- |
| `customization.visual.hidePaymentButton: true` — "hides the payment button **and disables the `onSubmit` callback**" | [`sdk-js/docs/bricks/card-payment.md`](https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md) | `onSubmit` **deixa de disparar**. Todo o caminho de submissão migra para `getFormData()`. O `onSubmit` continua obrigatório na tipagem — vira no-op. |
| `customization.visual.hideFormTitle: true` — "hides the title line and accepted flags" | [Hide element](https://www.mercadopago.com.uy/developers/en/docs/checkout-bricks/card-payment-brick/visual-customizations/hide-element) | Tira o título duplicado (o bloco 3 já tem "Pagamento"). |
| `initialization.payer.email` — "Brick **will hide email field** if this value is correctly filled" | [`sdk-js/docs/bricks/card-payment.md`](https://github.com/mercadopago/sdk-js/blob/main/docs/bricks/card-payment.md) | É **este** o mecanismo de PGM-05. Sem doc suportando "esconder e-mail" por customização — o único caminho é preencher o payer. |
| `initialization.payer.identification` — "if filled correctly the Brick will **prefill** the identification number input" | idem | Prefill, **não** ocultação: o campo de documento do Brick continua visível. É o que sustenta a assunção "documento do cartão sai do Brick". |
| Controller: `unmount()`, `update()`, `getAdditionalData()`, `getFormData()` | idem | `getFormData()` é o submit externo. |
| `getFormData()` — "only works if the submit button is disabled"; **comportamento com formulário inválido não documentado** | idem | ⚠️ Trato como **incerto**: o código aceita as duas formas de falha (promise rejeitada **e** retorno nulo/sem `token`). Ver `getCardFormData`. |

Fonte tipada local, conferida antes: `node_modules/@mercadopago/sdk-react/esm/bricks/cardPayment/type.d.ts`
— `ICardPaymentBrickVisual { hidePaymentButton?, hideFormTitle? }` e
`ICardPaymentBrickPayer { email?, identification? }` existem; `customization.visual` é `object`, então
o objeto passa sem cast.

---

## 1. Fluxo dos blocos — `resolveFlow` (FLW-01 … FLW-07)

### O problema em uma linha

`open = primeiro bloco incompleto` faz **completude** significar **navegação**. Basta separar as duas.

### Domínio puro — `packages/core/src/checkout/blocks.ts`

```ts
export interface FlowState {
  /** Blocos que o usuário editou de fato. Semear de `customers`/`addresses` NÃO suja. */
  dirty: BlockId[]
  /** Blocos confirmados por clique em `Continuar`. */
  confirmed: BlockId[]
  /** Bloco que o usuário pediu para alterar; vence a ordem natural. */
  editing: BlockId | null
}

export function resolveFlow(draft: CheckoutDraft, flow: FlowState): {
  open: BlockId | null
  complete: BlockId[]
  /** Blocos que não pedem mais ação nesta tela. */
  settled: BlockId[]
}
```

Duas regras, e só:

```
settled(b) = temSucessor(b) && completo(b) && (confirmado(b) || !sujo(b))
open       = editing ?? primeiro b em [contact, delivery, payment] com !settled(b) ?? null
```

**`temSucessor(b)`** é o que resolve FLW-05 sem exceção especial: `payment` é o último de
`BLOCK_ORDER`, então nunca *settle* — nem por completude, nem por confirmação. Fica aberto sempre que
Contato e Entrega estiverem resolvidos, que é exatamente onde PGM-04 precisa que o formulário de
cartão esteja montado. Como consequência `open` nunca é `null`, e por isso **FLW-07 tira o gate do
CTA de `open`** e o põe em `complete.length === 3`.

**`!sujo(b)`** é o que preserva `ADR-02` (FLW-04): o bloco semeado nasce completo e limpo → *settled*
→ colapsado. A partir da primeira tecla do usuário naquele bloco, só `Continuar` o fecha (FLW-01).

`resolveBlocks` **permanece exportada e intacta** — `resolveFlow` a chama para `complete`. Nenhum
consumidor existente muda de contrato.

### Onde mora o estado

| Estado | Lugar | Persiste? |
| --- | --- | --- |
| `dirty` | `checkoutStore` (`markDirty(id)`) | **Não** — fora do `partialize`. Recarregar a página deve voltar ao estado "nada editado nesta sessão de tela". |
| `confirmed` | `CheckoutPage` (`useState`) | Não |
| `editing` | `CheckoutPage` (`useState`, já existe) | Não |

`dirty` vai para o store porque quem edita são os blocos, e eles já falam com o store — a alternativa
seria enfiar um `onDirty` em cada `onChange` de cada campo. `markDirty` devolve patch vazio quando o
bloco já está sujo, para não re-renderizar a cada tecla:

```ts
markDirty: (id) => set((s) => (s.dirty.includes(id) ? {} : { dirty: [...s.dirty, id] })),
```

`reset()` limpa `dirty`. Os blocos chamam `markDirty` **nos handlers de input**, nunca nos efeitos de
semeadura — é essa distinção que faz `ADR-02` sobreviver.

### UI de `Continuar` (FLW-02, FLW-03, FLW-06)

`ContactBlock` e `DeliveryBlock` recebem `onContinue: () => void` e `canContinue: boolean`, e
renderizam ao pé do bloco aberto:

```tsx
<Button type="button" disabled={!canContinue} onClick={onContinue}
  className="… rounded-pill border-2 border-nanita-ink bg-transparent text-nanita-ink …">
  Continuar
</Button>
```

Contorno de tinta, **não** geleia sólida: `CHK-04` reserva a única pílula geleia da tela para o CTA.
Alvo de toque ≥44px (`min-h-11`), premissa mobile do projeto.

`onContinue` no page: `confirm(id)` → `setConfirmed(prev => [...prev, id])` **e** `setEditing(null)`.
Limpar `editing` é o que faz FLW-06 devolver o foco ao primeiro bloco não resolvido.

---

## 2. Superfície de pagamento (PGM-01 … PGM-09)

### `PaymentBlock` — nova árvore

```
if (orderId && method === 'pix')  → header + <PixPayment/>          // igual a hoje
if (!open)                        → linha colapsada
otherwise:
  header
  cards de método            (sempre)
  método === 'pix'  → campo de documento + erro
  método === 'card' → <CardPaymentBrick/>
```

O early-return de `orderId` passa a ser **só do PIX**. No cartão o Brick precisa continuar montado
depois da criação do pedido — desmontá-lo destruiria o formulário preenchido e o token (PGM-08).

**Cards de mesmo tamanho (PGM-01):** `basis-0 grow` (`flex-1`) em vez de `grow` com basis automático
— é o basis `auto` que hoje dá ao rótulo mais longo ("Cartão de crédito") mais largura. Altura já
vem de `align-items: stretch` do flex row; no empilhamento mobile (`flex-col`) largura é 100% nos
dois. Board `EZR-0`: `border-2`, `rounded-md` (16px), `p-[18px]`, `gap-3` (12px).

**Ícone PIX (PGM-02):** `apps/store/src/shared/ui/PixIcon.tsx`, `viewBox="0 0 16 16"`,
`fill="currentColor"` — herda `text-nanita-jam` do card. Substitui `QrCode` do lucide.

**Resumo colapsado:** o cartão não tem documento no rascunho, então a linha deixa de montar
`· CPF …` para ele: `card` → `Cartão de crédito`; `pix` → `PIX · CPF 000.000.000-00` (ou `CNPJ …`,
conforme o comprimento). Mantém o espírito de `BUG-20260728-bloco-vazio-parece-preenchido`: nunca
exibir rótulo no lugar de valor.

### `CardPaymentBrick` vira superfície, não orquestrador

Hoje ele cria o pagamento. Passa a **só desenhar**:

```tsx
interface Props {
  amount: number
  /** PGM-05: preenchido ⇒ o Brick não renderiza o campo de e-mail. */
  payerEmail: string
  /** Prefill do documento do Brick, quando já conhecido de `customers.cpf`. */
  payerDocument?: string
  errorMessage: string | null
}
```

```tsx
<CardPayment
  initialization={{ amount, payer: { email: payerEmail, ...(identification ? { identification } : {}) } }}
  customization={{
    paymentMethods: { maxInstallments },
    visual: { hidePaymentButton: true, hideFormTitle: true,
              style: { customVariables: { baseColor: '#B0176B' } } },
  }}
  onSubmit={noop}   // desabilitado por hidePaymentButton; obrigatório na tipagem
/>
```

`unmount()` no cleanup permanece (PGM-09).

### Submissão externa — `features/checkout/lib/cardBrick.ts`

```ts
export async function getCardFormData(): Promise<CardPaymentFormData | null> {
  const controller = window.cardPaymentBrickController
  if (!controller?.getFormData) return null
  try {
    const data = await controller.getFormData()
    return data?.token ? (data as CardPaymentFormData) : null
  } catch {
    return null            // form inválido: o Brick já pintou os erros de campo
  }
}
```

Duas formas de falha aceitas porque a doc **não** define o comportamento com formulário inválido
(ver tabela acima). O guard `data?.token` também cobre um retorno truncado. `declare global` ganha
`getFormData?: () => Promise<CardPaymentFormData | null>`.

### `handleConfirm` — um CTA, dois caminhos (PGM-05 … PGM-08)

Ordem nova, e a ordem **é** o requisito (PGM-06: nada é criado antes do cartão validar):

```
1. pedido em curso e rascunho mudou      → invalida (CHK-08, igual a hoje)
2. cartão?
     2a. getCardFormData()  → null ⇒ RETORNA (zero efeito, erros no Brick)
     2b. documento = formData.payer.identification.number
                     ?? customers.cpf ?? ''      (DOC-05)
     2c. documento inválido ⇒ erro no bloco, RETORNA sem criar pedido
   PIX?
     2d. documento = payment.cpf                  (já validado por isPaymentComplete)
3. saveCpf(documento)                    (PGD-03)
4. saveAddress (best-effort, ADR-03) · guarda de variação (PST-03 AC 5)
5. pedido: reusa o `pending` existente; só cria se não houver   (PGM-08)
6. cartão? → createPayment({ method:'card', card: formData })
             approved ⇒ onApproved() · caso contrário ⇒ friendlyMessage(status_detail) no bloco
   PIX?    → nada: `orderId` passou a existir e o bloco troca para o QR (PGM-07)
```

O early-return de hoje (`if (orderId) return`) some: ele impedia a retentativa de cartão. O que o
substitui é o passo 5 (não recriar) somado ao passo 6 (repagar). Cada tentativa gera
`idempotency_key` nova dentro de `useCreatePayment` — `PAY-06` intacto.

`cardError` é `useState` na página, passado por prop até o Brick. Não vai para o store: é estado de
uma tentativa, não do rascunho.

### `isPaymentComplete` passa a depender do método

```ts
export function isPaymentComplete(payment: PaymentDraft): boolean {
  if (payment?.method === 'card') return true      // o Brick valida no submit (PGM-06)
  if (payment?.method === 'pix') return isValidDocument(payment?.cpf ?? '')
  return false                                      // método null
}
```

Consequência aceita: com cartão, o CTA habilita antes de o cartão estar preenchido. É o padrão do
Brick — apertar com o formulário vazio pinta os erros de campo e não cobra nada (PGM-06). A
alternativa (espelhar a validação do cartão fora do Brick) exigiria ler estado interno dele.

---

## 3. Documento CPF **ou** CNPJ (DOC-01 … DOC-05)

### Novos módulos em `packages/core/src/validators/`

| Arquivo | Exporta |
| --- | --- |
| `cnpj.ts` (novo) | `stripCnpj`, `maskCnpj`, `isValidCnpj` (DV de 2 dígitos, pesos 543298765432 / 6543298765432; rejeita 14 dígitos iguais) |
| `document.ts` (novo) | `stripDocument`, `maskDocument`, `isValidDocument`, `documentLabel` |
| `index.ts` | reexporta os dois |

```ts
/** ≤11 dígitos ⇒ máscara de CPF; ≥12 ⇒ máscara de CNPJ (DOC-01). */
export const maskDocument = (v: string) =>
  stripDocument(v).length <= 11 ? maskCpf(v) : maskCnpj(v)

export const isValidDocument = (v: string) => isValidCpf(v) || isValidCnpj(v)
export const documentLabel = (v: string) => (stripDocument(v).length > 11 ? 'CNPJ' : 'CPF')
```

O limite em 11/12 é o que faz a máscara **alternar durante a digitação** sem travar o usuário no 11º
dígito (hoje `maskCpf` faz `.slice(0, 11)` e o 12º simplesmente não entra).

### `buildPayer` escolhe o tipo (DOC-03)

`packages/core/src/payment/payer.ts` — `PayerIdentification.type` vira `'CPF' | 'CNPJ'`:

```ts
if (isValidCpf(input.cpf))       payer.identification = { type: 'CPF',  number: stripCpf(input.cpf) }
else if (isValidCnpj(input.cpf)) payer.identification = { type: 'CNPJ', number: stripCnpj(input.cpf) }
```

⚠️ **`payer.ts` é importado pela edge function `mercado-pago` por caminho relativo `.ts`.** O import
novo (`../validators/cnpj.ts`) é **arquivo novo no grafo** → `AD-002`/`AD-004`: no ambiente local o
edge runtime monta um bind mount por arquivo, calculado quando o container sobe, e responde
`503 Module not found` até um **`supabase stop && supabase start`**. Não é bug do código; é o mesmo
tropeço já registrado em `handlers.ts:182-187`. Vai como passo explícito da task.

### `useSaveCustomerCpf` aceita os dois (DOC-04)

Troca `isValidCpf`/`stripCpf` por `isValidDocument`/`stripDocument`. `INVALID_CPF_MESSAGE` vira
"CPF ou CNPJ inválido". Coluna `customers.cpf` é `TEXT` sem constraint (migration
`20260414121021…:64`) — 14 dígitos cabem, **sem migration nova**.

### Campo no bloco

Rótulo passa a `CPF ou CNPJ do pagador`; `maxLength` acompanha a máscara; `documentLabel` alimenta a
linha colapsada e a mensagem de erro (`DOC_ERROR_MESSAGE = 'CPF ou CNPJ inválido — confira os
números.'`).

---

## 4. Resumo fiel ao board `04` (RSM-01 … RSM-07)

Valores extraídos por `get_jsx` do nó *Resumo Card* — não lidos de screenshot.

| Faixa | Board | Hoje | Ação |
| --- | --- | --- | --- |
| Card | `radius 24px`, borda `#FFD7E7` | `rounded-lg` = 24px ✓ | mantém |
| Respiro horizontal | **24px** em todas as faixas | `px-4` = 16px | `px-6` |
| Header | `pt-[22px] pb-[18px]`, badge `#FFEFF6`/`#B0176B`, `4 ITENS` | ✓ estrutura | só o padding |
| Faixa frete grátis | `py-3 px-6`, check 16px | `px-4` | `px-6` |
| Itens | `py-5 px-6`, **`gap-4`** entre linhas, thumb 56×56 `rounded-[12px]` | `gap-3`, `h-14 w-14` (=56 ✓), `rounded-md` (=16px) | `gap-4`, `rounded-[12px]`, `px-6` |
| **Cupom aplicado** | faixa com borda 1px em cima e embaixo, `py-[14px] px-6`, `gap-[10px]`, ícone `Tag` 16px geleia, `CÓDIGO aplicado` (14/18, 600, tinta), valor geleia 600, `X` 15px ameixa | `CouponInput` genérico dentro de `px-4` | **faixa nova** (RSM-02); sem cupom ⇒ `CouponInput` como hoje (RSM-03) |
| Totais | `pt-5 pb-1 px-6`, `gap-[11px]`; frete grátis em geleia 600 | ✓ menos o padding | `px-6` |
| Linha do cupom | `Cupom NANA10` | `Cupom` | inclui o código (RSM-04) |
| Total | Fredoka **32px**/34px, `-0.03em`; régua 2px tinta | `text-2xl` = 24px | `text-[32px] leading-[34px]` (RSM-05) |
| Sub-linha | `no cartão: 3x de R$ 16,34 sem juros`, 13/16, ameixa, à direita | não existe | nova (RSM-06) |

**A sub-linha usa o total do cartão, não o exibido.** O board mostra `R$ 46,55` (com desconto PIX) e
`3x de R$ 16,34` (= R$ 49,02) — os dois números do board não descendem um do outro. Prometer parcela
derivada do total-com-PIX seria anunciar um preço que o cartão não pratica. Então:

- `useCheckoutTotals` passa a devolver **`cardTotal`** — o mesmo `calculateOrderTotals`, forçando
  `method: 'card'`. Uma conta a mais, mesma função, zero risco de divergir do servidor.
- `resolveInstallments` sai de `PaymentBlock.tsx` para `features/checkout/model/installments.ts`
  (FSD: lógica pura do slice em `model/`), consumida pelos dois. Reaproveitar, não recalcular.
- A linha só aparece com `card_enabled` **e** `count >= 2` (RSM-06). `1x de R$ X` não é informação.

**Barra mobile (RSM-07):** `Resumo · N itens` ganha ` · frete grátis` quando
`cartSubtotal >= free_shipping_threshold`.

---

## Arquivos tocados

| Arquivo | O quê |
| --- | --- |
| `packages/core/src/validators/cnpj.ts` | **novo** — DV de CNPJ |
| `packages/core/src/validators/document.ts` | **novo** — máscara/validação unificadas |
| `packages/core/src/validators/index.ts` | reexporta |
| `packages/core/src/payment/payer.ts` | `type: 'CPF' \| 'CNPJ'` |
| `packages/core/src/checkout/blocks.ts` | `resolveFlow`, `isPaymentComplete` por método |
| `packages/core/src/checkout/types.ts` | `FlowState` |
| `apps/store/src/shared/ui/PixIcon.tsx` | **novo** |
| `apps/store/src/features/checkout/model/installments.ts` | **novo** (movido de `PaymentBlock`) |
| `apps/store/src/features/checkout/lib/cardBrick.ts` | **novo** — `getCardFormData` |
| `apps/store/src/features/checkout/model/checkoutStore.ts` | `dirty` + `markDirty` (não persistido) |
| `apps/store/src/features/checkout/model/useCheckoutTotals.ts` | `cardTotal` |
| `apps/store/src/features/checkout/ui/ContactBlock.tsx` | `markDirty` + `Continuar` |
| `apps/store/src/features/checkout/ui/DeliveryBlock.tsx` | `markDirty` + `Continuar` |
| `apps/store/src/features/checkout/ui/PaymentBlock.tsx` | superfície por método, cards iguais, documento |
| `apps/store/src/features/checkout/ui/CardPaymentBrick.tsx` | vira superfície; botão e e-mail escondidos |
| `apps/store/src/features/checkout/ui/OrderSummary.tsx` | board `04` |
| `apps/store/src/pages/CheckoutPage.tsx` | `resolveFlow`, `confirmed`, `handleConfirm` novo, `cardError` |
| `apps/store/src/entities/customer/api/useSaveCustomerCpf.ts` | aceita CNPJ |

**Sem migration.** **Sem mudança na edge function** além do tipo em `payer.ts` (que ela importa).

## Riscos

| Risco | Mitigação |
| --- | --- |
| `getFormData()` com formulário inválido não está documentado | Aceitar rejeição **e** retorno sem `token`; teste cobre os dois |
| Edge runtime local 503 por bind mount novo (`cnpj.ts`) | `supabase stop && supabase start` como passo da task; `AD-002` |
| Regressão em `ADR-02` (recorrente redigitando) | `dirty` só por handler de input; teste dedicado com endereço semeado |
| Brick remontado a cada render perdendo dados | `initialization` memoizado; `payerEmail` estável vindo do contato |
