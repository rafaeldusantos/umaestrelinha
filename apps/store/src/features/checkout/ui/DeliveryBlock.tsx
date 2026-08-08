// Bloco 2 do acordeão one-page: endereço + frete real do Melhor Envio.
//
// SHP-01: cada opção exibe transportadora, serviço, preço e **data** — nunca um prazo em dias.
// SHP-03/ADR-01: CEP resolvido trava rua/bairro/cidade/UF; `manual` destrava os quatro.
// SHP-05: cotação que falha ou volta vazia vira uma única opção "Frete padrão" com aviso.
// SHP-06: com o subtotal no threshold, a opção **mais barata** vai a zero exibindo "Grátis".
// ADR-02: com endereço `is_default` salvo, o bloco nasce preenchido **e colapsado** — o endereço
// é semeado e a opção mais barata da cotação vem pré-selecionada (é o `shipping` que fecha
// `isDeliveryComplete`). Cliente recorrente não redigita nem re-escolhe.
//
// Zero preço e zero prazo literais aqui: preço vem da cotação (ou de `default_shipping_cost`)
// e a data vem de `formatEstimate`. Nenhum `bg-nanita-jam` — a única pílula geleia é o CTA.
import { useEffect, useMemo, useRef } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { Input } from '@nanapin/ui/input'
import { Label } from '@nanapin/ui/label'
import { formatPrice } from '@nanapin/core/formatters'
import { maskCep, stripCep } from '@nanapin/core/validators'
import { cheapestQuoteId, formatEstimate, quoteToEstimate } from '@nanapin/core/shipping'
import { useShippingSettings } from '@nanapin/core/hooks/useStoreSettings'
import { useAuthContext } from '@nanapin/auth'
import type { ShippingDraft } from '@nanapin/core/checkout'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useDefaultAddress } from '@/entities/address'
import { useCepLookup } from '../api/useCepLookup'
import { useShippingQuote } from '../api/useShippingQuote'
import { useCheckoutStore } from '../model/checkoutStore'

interface Props {
  open: boolean
  complete: boolean
  onEdit: () => void
  /** FLW-03: quem fecha este bloco é o clique da pessoa, nunca a última tecla dela. */
  onContinue: () => void
  /** FLW-02: `Continuar` só habilita com o bloco válido. */
  canContinue: boolean
}

export const DEFAULT_SHIPPING_SERVICE_ID = 'default'
/**
 * BUG-20260728-bloco-vazio-parece-preenchido: o que o bloco colapsado diz quando ainda não há
 * endereço. Antes ele montava `, — /` com os campos vazios, que lia-se como tela quebrada.
 */
export const DELIVERY_EMPTY_SUMMARY = 'Informe seu CEP e escolha o envio'
export const QUOTE_UNAVAILABLE_MESSAGE =
  'Não conseguimos consultar os prazos agora. Seguimos com o frete padrão da loja.'

interface DeliveryOption extends ShippingDraft {
  /** Preço cotado antes do frete grátis — é o valor riscado ao lado de "Grátis". */
  price: number
  free: boolean
  /** `null` no fallback: sem cotação não há data honesta a exibir. */
  estimateLabel: string | null
}

/** `YYYY-MM-DD` a partir das partes locais — `toISOString` deslocaria o dia por fuso. */
const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Descarta o que é só apresentação: `ShippingDraft` é o que entra no pedido (SHP-07). */
const toDraft = ({
  price: _price,
  free: _free,
  estimateLabel: _label,
  ...draft
}: DeliveryOption): ShippingDraft => draft

const DeliveryBlock = ({ open, complete, onEdit, onContinue, canContinue }: Props) => {
  const { customer } = useAuthContext()
  const address = useCheckoutStore((s) => s.address)
  const setAddress = useCheckoutStore((s) => s.setAddress)
  const shipping = useCheckoutStore((s) => s.shipping)
  const setShipping = useCheckoutStore((s) => s.setShipping)
  const markDirty = useCheckoutStore((s) => s.markDirty)

  /**
   * FLW-01/FLW-04: sujar é o que impede o bloco de colapsar sozinho — por isso só passa por aqui
   * o que a **pessoa** digitou. Nem a semeadura do `is_default`, nem o preenchimento do ViaCEP,
   * nem a pré-seleção do frete mais barato sujam: se sujassem, cliente recorrente veria a Entrega
   * aberta de novo (ADR-02).
   */
  const edit = (patch: Parameters<typeof setAddress>[0]) => {
    markDirty('delivery')
    setAddress(patch)
  }

  const subtotal = useCartStore((s) => s.subtotal())
  const coupon = useCouponStore((s) => s.applied)
  const { free_shipping_threshold, default_shipping_cost, handling_days } = useShippingSettings()

  const { data: defaultAddress } = useDefaultAddress(customer?.id)
  const cepLookup = useCepLookup(address.cep)
  const quote = useShippingQuote(address.cep)

  // `today` fixo por montagem: a data exibida não pode pular enquanto a cliente preenche.
  const today = useMemo(() => new Date(), [])

  // ADR-02: semeia o endereço salvo uma única vez, sem sobrescrever o que já foi digitado.
  //
  // `defaultCep` guarda o CEP que veio do `is_default` e é o que autoriza a pré-seleção do frete
  // mais barato abaixo. Sem ela ADR-02 não se cumpria: colapsar o bloco exige `isDeliveryComplete`,
  // que exige `shipping !== null` (`@nanapin/core/checkout`), então com 2+ opções cotadas o bloco
  // abria expandido mesmo com o endereço preenchido. `null` = a cliente digitou o CEP dela.
  const seeded = useRef(false)
  const defaultCep = useRef<string | null>(null)
  useEffect(() => {
    if (seeded.current || !defaultAddress) return
    seeded.current = true
    if (useCheckoutStore.getState().address.cep) return
    setAddress({ ...defaultAddress, manual: false })
    const clean = stripCep(defaultAddress.cep)
    if (clean.length === 8) defaultCep.current = clean
  }, [defaultAddress, setAddress])

  // ADR-01/SHP-03: resolveu → preenche e trava; não resolveu → `manual` destrava os campos.
  useEffect(() => {
    if (!cepLookup.data) return
    if (cepLookup.data.manual) {
      setAddress({ manual: true })
      return
    }
    setAddress({
      street: cepLookup.data.street,
      neighborhood: cepLookup.data.neighborhood,
      city: cepLookup.data.city,
      state: cepLookup.data.state,
      manual: false,
    })
  }, [cepLookup.data, setAddress])

  // Edge case da spec: trocar o CEP descarta a opção de envio já marcada (custo volta a 0).
  const lastCep = useRef<string | null>(null)
  useEffect(() => {
    const clean = stripCep(address.cep)
    if (lastCep.current === null) {
      lastCep.current = clean
      return
    }
    if (lastCep.current === clean) return
    lastCep.current = clean
    // Mexer no CEP encerra ADR-02: daqui pra frente a cliente está escolhendo, não reaproveitando
    // o endereço salvo — e não voltamos a pré-selecionar nem se ela digitar o CEP do default.
    if (clean !== defaultCep.current) defaultCep.current = null
    if (useCheckoutStore.getState().shipping) setShipping(null)
  }, [address.cep, setShipping])

  const cepComplete = stripCep(address.cep).length === 8
  // Referência estável: sem o memo, o `?? []` refaria o `options` (e o efeito) a cada render.
  const quotes = useMemo(() => quote.data ?? [], [quote.data])
  const quoteFailed = cepComplete && (quote.isError || (quote.isSuccess && quotes.length === 0))

  const options = useMemo<DeliveryOption[]>(() => {
    if (!cepComplete) return []

    if (quoteFailed) {
      return [
        {
          serviceId: DEFAULT_SHIPPING_SERVICE_ID,
          serviceName: 'Frete padrão',
          carrier: 'Correios',
          cost: coupon?.freeShipping ? 0 : default_shipping_cost,
          estimateMin: '',
          estimateMax: '',
          price: default_shipping_cost,
          free: !!coupon?.freeShipping,
          estimateLabel: null,
        },
      ]
    }

    const cheapest = cheapestQuoteId(quotes)
    const thresholdReached = subtotal >= free_shipping_threshold

    return quotes.map((q) => {
      const { min, max } = quoteToEstimate(q, handling_days, today)
      const price = Number.parseFloat(q.price)
      // Cupom de frete grátis zera todas; o threshold zera só a mais barata (SHP-06).
      const free = !!coupon?.freeShipping || (thresholdReached && q.id === cheapest)

      return {
        serviceId: String(q.id),
        serviceName: q.name,
        carrier: q.company,
        cost: free ? 0 : price,
        estimateMin: toIsoDate(min),
        estimateMax: toIsoDate(max),
        price,
        free,
        estimateLabel: formatEstimate(min, max),
      }
    })
  }, [
    cepComplete,
    quoteFailed,
    quotes,
    coupon?.freeShipping,
    default_shipping_cost,
    free_shipping_threshold,
    handling_days,
    subtotal,
    today,
  ])

  // Pré-seleção sem clique, em dois casos:
  //  · edge case da spec — cotação com uma única opção: não há o que escolher;
  //  · ADR-02 — o endereço veio do `is_default`: a **mais barata** já vem marcada, o que torna
  //    `isDeliveryComplete` verdadeiro e faz o bloco nascer colapsado ("preenchido e colapsado").
  //    É também a opção que ganha o frete grátis no threshold (SHP-06), então é a escolha honesta.
  // Endereço digitado na hora com 2+ opções **não** pré-seleciona: a pessoa está escolhendo.
  useEffect(() => {
    if (!options.length) return
    const fromDefaultAddress =
      defaultCep.current !== null && stripCep(address.cep) === defaultCep.current
    if (options.length > 1 && !fromDefaultAddress) return
    if (useCheckoutStore.getState().shipping) return

    const cheapestId = cheapestQuoteId(quotes)
    const target = options.find((o) => o.serviceId === String(cheapestId)) ?? options[0]
    setShipping(toDraft(target))
  }, [options, quotes, address.cep, setShipping])

  const select = (option: DeliveryOption) => {
    markDirty('delivery')
    setShipping(toDraft(option))
  }

  const locked = !address.manual
  const lockedFieldClass = locked
    ? 'border-nanita-border bg-nanita-sugar text-nanita-plum'
    : 'border-nanita-border'

  if (!open) {
    return (
      <section
        aria-label="Entrega"
        className="flex items-center gap-3 rounded-lg border border-nanita-border bg-white px-4 py-[22px]"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanita-ink">
          {complete ? (
            <Check className="h-4 w-4 text-white" aria-label="Entrega preenchida" />
          ) : (
            <span className="font-heading text-base font-semibold text-white">2</span>
          )}
        </span>
        <div className="flex min-w-0 grow flex-col gap-[3px]">
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-nanita-plum">
            Entrega
          </span>
          <span
            className={`truncate text-[15px] font-semibold ${
              complete ? 'text-nanita-ink' : 'text-nanita-plum'
            }`}
          >
            {/* BUG-20260728-bloco-vazio-parece-preenchido: sem dado não se monta a pontuação —
                `, — /` lia-se como tela quebrada para quem nunca preencheu. */}
            {complete
              ? `${address.street}, ${address.number} — ${address.city}/${address.state}`
              : DELIVERY_EMPTY_SUMMARY}
          </span>
          {complete && shipping && (
            <span className="truncate text-[13px] text-nanita-plum">
              {shipping.carrier} {shipping.serviceName} ·{' '}
              {shipping.cost === 0 ? 'Grátis' : formatPrice(shipping.cost)}
            </span>
          )}
        </div>
        {/* BUG-20260728-alterar-alvo-de-toque-28px: `min-h-11` = 44px, o mínimo da premissa
            mobile do projeto. A aparência de link continua a do board. */}
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 shrink-0 items-center rounded-button px-3 text-sm font-semibold text-nanita-jam hover:underline"
        >
          {complete ? 'Alterar' : 'Preencher'}
        </button>
      </section>
    )
  }

  return (
    <section
      aria-label="Entrega"
      className="flex flex-col gap-5 rounded-lg border border-nanita-border bg-white p-4"
    >
      <header className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-nanita-ink font-heading text-base font-semibold text-white">
          2
        </span>
        <div className="flex grow flex-col gap-[2px]">
          <h2 className="font-heading text-[21px] font-semibold tracking-[-0.02em] text-nanita-ink">
            Entrega
          </h2>
          <p className="text-[13px] text-nanita-plum">Prazos e valores reais do Melhor Envio</p>
        </div>
      </header>

      <div className="flex flex-col gap-[7px] sm:max-w-[200px]">
        <Label htmlFor="delivery-cep" className="text-[13px] font-semibold text-nanita-ink">
          CEP
        </Label>
        <Input
          id="delivery-cep"
          inputMode="numeric"
          value={address.cep}
          onChange={(e) => edit({ cep: maskCep(e.target.value) })}
          placeholder="00000-000"
          className="border-nanita-border"
        />
      </div>

      {address.manual && cepComplete && (
        <p role="status" className="text-[13px] text-nanita-plum">
          Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="delivery-street" className="text-[13px] font-semibold text-nanita-ink">
            Rua
          </Label>
          <Input
            id="delivery-street"
            disabled={locked}
            value={address.street}
            onChange={(e) => edit({ street: e.target.value })}
            placeholder="Rua / Avenida"
            className={lockedFieldClass}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="delivery-number" className="text-[13px] font-semibold text-nanita-ink">
            Número
          </Label>
          <Input
            id="delivery-number"
            value={address.number}
            onChange={(e) => edit({ number: e.target.value })}
            placeholder="123"
            className="border-nanita-border"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="delivery-complement"
            className="text-[13px] font-semibold text-nanita-ink"
          >
            Complemento
          </Label>
          <Input
            id="delivery-complement"
            value={address.complement}
            onChange={(e) => edit({ complement: e.target.value })}
            placeholder="Apto, bloco…"
            className="border-nanita-border"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="delivery-neighborhood"
            className="text-[13px] font-semibold text-nanita-ink"
          >
            Bairro
          </Label>
          <Input
            id="delivery-neighborhood"
            disabled={locked}
            value={address.neighborhood}
            onChange={(e) => edit({ neighborhood: e.target.value })}
            className={lockedFieldClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="delivery-city" className="text-[13px] font-semibold text-nanita-ink">
            Cidade
          </Label>
          <Input
            id="delivery-city"
            disabled={locked}
            value={address.city}
            onChange={(e) => edit({ city: e.target.value })}
            className={lockedFieldClass}
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="delivery-state" className="text-[13px] font-semibold text-nanita-ink">
            UF
          </Label>
          <Input
            id="delivery-state"
            disabled={locked}
            maxLength={2}
            value={address.state}
            onChange={(e) => edit({ state: e.target.value })}
            className={lockedFieldClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-[10px] pt-[6px]">
        <span className="text-[13px] font-semibold text-nanita-ink">Forma de envio</span>

        {!cepComplete && (
          <p className="text-[13px] text-nanita-plum">
            Informe o CEP para ver as opções de envio.
          </p>
        )}

        {cepComplete && quote.isLoading && (
          <p className="text-[13px] text-nanita-plum">Consultando as transportadoras…</p>
        )}

        {quoteFailed && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-nanita-sugar p-3 text-[13px] text-nanita-ink"
          >
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-nanita-jam" aria-hidden />
            {QUOTE_UNAVAILABLE_MESSAGE}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const selected = shipping?.serviceId === option.serviceId
            return (
              <button
                key={option.serviceId}
                type="button"
                aria-pressed={selected}
                onClick={() => select(option)}
                className={`flex w-full items-center gap-[14px] rounded-md border-2 p-3 text-left transition-colors ${
                  selected
                    ? 'border-nanita-jam bg-nanita-sugar'
                    : 'border-nanita-border bg-white hover:border-nanita-jam/40'
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-nanita-jam' : 'border-nanita-border'
                  }`}
                >
                  {selected && <span className="h-[10px] w-[10px] rounded-full bg-nanita-ink" />}
                </span>
                <span className="flex min-w-0 grow flex-col gap-[2px]">
                  <span className="text-[15px] font-semibold text-nanita-ink">
                    {option.carrier} {option.serviceName}
                  </span>
                  <span className="text-[13px] text-nanita-plum">
                    {option.estimateLabel
                      ? `Chega ${option.estimateLabel}`
                      : 'Prazo confirmado após a postagem'}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-[2px]">
                  <span
                    className={`font-heading text-[17px] font-semibold ${
                      option.free ? 'text-nanita-jam' : 'text-nanita-ink'
                    }`}
                  >
                    {option.free ? 'Grátis' : formatPrice(option.price)}
                  </span>
                  {option.free && (
                    <span className="text-xs text-nanita-plum line-through">
                      {formatPrice(option.price)}
                    </span>
                  )}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* FLW-02/FLW-03: contorno de tinta, não geleia sólida — CHK-04 reserva a única pílula
          geleia da tela para o CTA. `min-h-11` = 44px, o mínimo da premissa mobile. */}
      <Button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="min-h-11 self-start rounded-button border-2 border-nanita-ink bg-transparent px-7 font-heading text-[15px] font-semibold text-nanita-ink hover:bg-nanita-sugar"
      >
        Continuar
      </Button>
    </section>
  )
}

export default DeliveryBlock
