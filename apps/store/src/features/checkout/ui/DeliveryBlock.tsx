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
// e a data vem de `formatEstimate`. Nenhum `bg-estrelinha-primary` — a única pílula geleia é o CTA.
//
// Feature 63 — a retirada no escritório (RET-06..11). Ela NÃO entra em `options`: é uma segunda
// origem de opção, para CEP do RS, mantida à parte. Assim a pré-seleção, a "mais barata" e o frete
// grátis por valor (SHP-05, SHP-06, ADR-02) não a enxergam — RET-08 por construção.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { AlertTriangle, MapPin, Truck } from 'lucide-react'
import { trackShippingInfo } from '../model/checkoutAnalytics'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { formatPrice } from '@estrelinha/core/formatters'
import { maskCep, stripCep } from '@estrelinha/core/validators'
import {
  PICKUP_CARRIER,
  PICKUP_METHOD_NAME,
  PICKUP_SERVICE_ID,
  cheapestQuoteId,
  formatEstimate,
  isRsCep,
  quoteToEstimate,
} from '@estrelinha/core/shipping'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useFreeShipping } from '@estrelinha/core/hooks/useFreeShipping'
import { useAuthContext } from '@estrelinha/auth'
import type { ShippingDraft } from '@estrelinha/core/checkout'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useDefaultAddress } from '@/entities/address'
import { usePickupOptionState, type PickupOption } from '@/entities/pickup'
import { useCepLookup } from '../api/useCepLookup'
import { useShippingQuote } from '../api/useShippingQuote'
import { useCheckoutStore } from '../model/checkoutStore'
import CollapsedBlock from './CollapsedBlock'

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
  'Não foi possível consultar os prazos agora. O pedido segue com o frete padrão da loja.'

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

/**
 * O inverso de `toIsoDate`: a data do rascunho volta a ser o texto de `formatEstimate`.
 *
 * `new Date('2026-10-14')` seria meia-noite **UTC**, que em Porto Alegre é o dia anterior — por
 * isso as partes são lidas à mão e montadas no fuso local, como `toIsoDate` as escreveu. Rascunho
 * do frete padrão tem as duas datas vazias e devolve `null`: sem cotação não há data honesta.
 */
const draftEstimateLabel = ({ estimateMin, estimateMax }: ShippingDraft): string | null => {
  const parse = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
  }
  const min = parse(estimateMin)
  const max = parse(estimateMax)
  return min && max ? formatEstimate(min, max) : null
}

/** Descarta o que é só apresentação: `ShippingDraft` é o que entra no pedido (SHP-07). */
const toDraft = ({
  price: _price,
  free: _free,
  estimateLabel: _label,
  ...draft
}: DeliveryOption): ShippingDraft => draft

/** O rascunho da retirada — é o que entra no pedido (RET-07). Sem datas: não há transportadora. */
const PICKUP_DRAFT: ShippingDraft = {
  serviceId: PICKUP_SERVICE_ID,
  serviceName: PICKUP_METHOD_NAME,
  carrier: PICKUP_CARRIER,
  cost: 0,
  estimateMin: '',
  estimateMax: '',
}

/**
 * Lê a configuração da retirada e a entrega ao bloco. Só é montado para CEP do RS: fora dele não
 * há o que ler.
 *
 * Também desfaz uma retirada que deixou de estar disponível — o rascunho restaurado da
 * `sessionStorage` depois de a dona desligá-la, ou de o endereço do Material sumir (edge case da
 * spec). Só depois de a configuração CHEGAR: enquanto ela carrega, a opção é `null` pelos defaults,
 * e "ainda não sei" desfaria a escolha de toda cliente que recarrega o checkout.
 */
const PickupSource = ({
  cep,
  onChange,
}: {
  cep: string
  onChange: (option: PickupOption | null) => void
}) => {
  const { option, settled } = usePickupOptionState(cep)
  const setShipping = useCheckoutStore((s) => s.setShipping)

  useEffect(() => {
    onChange(option)
  }, [option, onChange])

  useEffect(() => () => onChange(null), [onChange])

  useEffect(() => {
    if (!settled || option) return
    if (useCheckoutStore.getState().shipping?.serviceId === PICKUP_SERVICE_ID) setShipping(null)
  }, [settled, option, setShipping])

  return null
}

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
  const { default_shipping_cost, handling_days } = useShippingSettings()
  /**
   * `FRG-07` — SHP-06 passa a depender do interruptor.
   *
   * Era `subtotal >= free_shipping_threshold`, e com a faixa em zero isso é **sempre verdadeiro**:
   * a opção mais barata saía zerada em toda cotação, numa loja que já não anunciava frete grátis.
   * Era o caminho por onde o defeito custava dinheiro de verdade.
   */
  const freteGratis = useFreeShipping(subtotal)

  const { data: defaultAddress } = useDefaultAddress(customer?.id)
  const cepLookup = useCepLookup(address.cep)
  const quote = useShippingQuote(address.cep)

  // `today` fixo por montagem: a data exibida não pode pular enquanto a cliente preenche.
  const today = useMemo(() => new Date(), [])

  // Feature 63 — a retirada, só para CEP do RS. `PickupSource` a lê e a entrega aqui; fora do RS
  // ela não existe, mesmo que o valor guardado ainda seja o do CEP anterior.
  const rsCep = isRsCep(address.cep)
  const [pickupRead, setPickupRead] = useState<PickupOption | null>(null)
  const onPickup = useCallback((option: PickupOption | null) => setPickupRead(option), [])
  const pickup = rsCep ? pickupRead : null

  // Rascunho restaurado com retirada e um CEP de fora do RS: a escolha não vale (RET-10). A troca
  // de CEP já desfaz qualquer escolha pelo efeito abaixo; este cobre o rascunho que nasceu assim.
  useEffect(() => {
    if (rsCep) return
    if (useCheckoutStore.getState().shipping?.serviceId === PICKUP_SERVICE_ID) setShipping(null)
  }, [rsCep, setShipping])

  // ADR-02: semeia o endereço salvo uma única vez, sem sobrescrever o que já foi digitado.
  //
  // `defaultCep` guarda o CEP que veio do `is_default` e é o que autoriza a pré-seleção do frete
  // mais barato abaixo. Sem ela ADR-02 não se cumpria: colapsar o bloco exige `isDeliveryComplete`,
  // que exige `shipping !== null` (`@estrelinha/core/checkout`), então com 2+ opções cotadas o bloco
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
    // `reached` já é `false` com o interruptor desligado (invariante 1). Nenhuma checagem a mais.
    const thresholdReached = freteGratis.reached

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
    // `subtotal` sai das dependências: ele já está embutido em `freteGratis`, que é memoizado pelas
    // primitivas. Mantê-lo faria o memo refazer as opções em toda mudança de carrinho que não muda
    // o veredito do frete grátis.
    freteGratis.reached,
    handling_days,
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

  /*
   * Feature 61 · EVT-11 — um `add_shipping_info` por TOQUE da cliente numa opção de frete, a mesma
   * política do pagamento (`EVT-12`): a pré-seleção automática (opção única, ou a mais barata do
   * endereço salvo) e o rascunho restaurado não são escolha, e por isso não emitem. Antes, o frete
   * contava a pré-seleção e o pagamento não — irmãos do mesmo funil medindo coisas diferentes.
   *
   * Com o bloco FECHADO (2026-10-22) a troca não suja: sujar reabriria a Entrega (FLW-01), e o
   * pedido foi justamente trocar o envio sem passar por "Alterar". O endereço não muda, então o
   * bloco continua completo — só o preço e a data mudam, no resumo do pedido.
   */
  const select = (option: DeliveryOption) => {
    if (open) markDirty('delivery')
    setShipping(toDraft(option))
    trackShippingInfo(option.serviceName)
  }

  /** RET-06/RET-07: a retirada se escolhe como qualquer outra opção, e grava frete zero. */
  const selectPickup = () => {
    if (open) markDirty('delivery')
    setShipping(PICKUP_DRAFT)
    trackShippingInfo(PICKUP_METHOD_NAME)
  }

  // RET-06: "Envio a domicílio" só vira grupo nomeado quando há as duas origens na tela.
  const domicilioId = useId()
  const domicilioAgrupado = !!pickup && options.length > 0

  const pickupSource = rsCep ? (
    <PickupSource cep={stripCep(address.cep)} onChange={onPickup} />
  ) : null

  const pickupSelected = shipping?.serviceId === PICKUP_SERVICE_ID
  /** Quantas escolhas há — com uma só, o bloco fechado mostra o resumo do frete, não a lista. */
  const choiceCount = options.length + (pickup ? 1 : 0)

  // As opções de envio têm UM desenho, usado nos dois estados do bloco: aberto, abaixo do endereço,
  // e fechado, no lugar do resumo do frete (2026-10-22). Escritas duas vezes, a de um estado
  // divergiria da do outro sem nada quebrar.
  const optionList = (
    <>
      {/* RET-06: com a retirada, as duas origens ganham título de grupo. Sem ela, a tela é a de
          antes da feature 63. */}
      {domicilioAgrupado && (
        <span id={domicilioId} className="pt-1 text-[13px] text-estrelinha-ink-soft">
          Envio a domicílio
        </span>
      )}

      {/* RET-06: com a retirada, as opções dos Correios são um GRUPO nomeado pelo título acima,
          como "Retirar em" — para quem navega por leitor de tela, os dois grupos são simétricos. */}
      <div
        role={domicilioAgrupado ? 'group' : undefined}
        aria-labelledby={domicilioAgrupado ? domicilioId : undefined}
        className="flex flex-col gap-2"
      >
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
                  ? 'border-estrelinha-primary bg-estrelinha-ground-deep'
                  : 'border-estrelinha-line bg-white hover:border-estrelinha-primary/40'
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  selected ? 'border-estrelinha-primary' : 'border-estrelinha-line'
                }`}
              >
                {selected && <span className="h-[10px] w-[10px] rounded-full bg-estrelinha-ink" />}
              </span>
              <span className="flex min-w-0 grow flex-col gap-[2px]">
                <span className="text-[15px] font-semibold text-estrelinha-ink">
                  {option.carrier} {option.serviceName}
                </span>
                <span className="text-[13px] text-estrelinha-ink-soft">
                  {option.estimateLabel
                    ? `Chega ${option.estimateLabel}`
                    : 'Prazo confirmado após a postagem'}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-[2px]">
                <span
                  className={`font-heading text-[17px] font-semibold ${
                    option.free ? 'text-estrelinha-primary' : 'text-estrelinha-ink'
                  }`}
                >
                  {option.free ? 'Grátis' : formatPrice(option.price)}
                </span>
                {option.free && (
                  <span className="text-xs text-estrelinha-ink-soft line-through">
                    {formatPrice(option.price)}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {pickup && (
        <div role="group" aria-label="Retirar em" className="flex flex-col gap-2 pt-1">
          <span className="text-[13px] text-estrelinha-ink-soft">Retirar em</span>
          <button
            type="button"
            aria-pressed={pickupSelected}
            onClick={selectPickup}
            className={`flex w-full items-center gap-[14px] rounded-md border-2 p-3 text-left transition-colors ${
              pickupSelected
                ? 'border-estrelinha-primary bg-estrelinha-ground-deep'
                : 'border-estrelinha-line bg-white hover:border-estrelinha-primary/40'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                pickupSelected ? 'border-estrelinha-primary' : 'border-estrelinha-line'
              }`}
            >
              {pickupSelected && (
                <span className="h-[10px] w-[10px] rounded-full bg-estrelinha-ink" />
              )}
            </span>
            <span className="flex min-w-0 grow flex-col gap-[2px]">
              {/* Sem `truncate`: a linha do endereço é longa e tem de caber inteira em 390px. */}
              <span className="break-words text-[15px] font-semibold text-estrelinha-ink">
                {pickup.location}
              </span>
              <span className="text-[13px] text-estrelinha-ink-soft">
                {`Pronta para retirada ${pickup.readyLabel}`}
              </span>
            </span>
            <span className="shrink-0 font-heading text-[17px] font-semibold text-estrelinha-primary">
              Grátis
            </span>
          </button>
        </div>
      )}
    </>
  )

  const locked = !address.manual
  const lockedFieldClass = locked
    ? 'border-estrelinha-line bg-estrelinha-ground-deep text-estrelinha-ink-soft'
    : 'border-estrelinha-line'

  if (!open) {
    // BUG-20260728-bloco-vazio-parece-preenchido: sem dado não se monta a pontuação — `, — /`
    // lia-se como tela quebrada para quem nunca preencheu. Daí o recorte por `complete`.
    //
    // A prévia (2026-10-04): o endereço em três linhas — rua, bairro e cidade, CEP — e o frete
    // escolhido numa faixa própria, com a data e o preço. Antes era uma linha cortada e um rodapé
    // cinza sem data; a cliente fechava o bloco e não sabia mais quando a joia chegava.
    const rua = [address.street, address.number, address.complement]
      .map((parte) => parte?.trim())
      .filter(Boolean)
      .join(', ')
    const cidade = [address.neighborhood?.trim(), `${address.city}/${address.state}`]
      .filter(Boolean)
      .join(' · ')
    // A data sai do RASCUNHO, que é o que entra no pedido — a prévia diz o que vai ser gravado.
    // Da opção cotada vem só o preço antes do frete grátis, que o rascunho não guarda.
    const chegada = shipping ? draftEstimateLabel(shipping) : null
    const escolhida = shipping
      ? options.find((o) => o.serviceId === shipping.serviceId)
      : undefined
    const retirada = shipping?.serviceId === PICKUP_SERVICE_ID

    return (
      <>
      {pickupSource}
      <CollapsedBlock
        label="Entrega"
        step={2}
        complete={complete}
        completeLabel="Entrega preenchida"
        actionLabel={complete ? 'Alterar' : 'Preencher'}
        onAction={onEdit}
        footer={
          // Com duas ou mais escolhas, o bloco fechado mostra as opções e deixa trocar ali mesmo,
          // sem "Alterar" (2026-10-22): mudar o envio não é mudar o endereço. Com uma só, o resumo.
          complete && choiceCount > 1 ? (
            <div role="group" aria-label="Forma de envio" className="flex flex-col gap-2">
              {optionList}
            </div>
          ) : (
            complete &&
            shipping &&
            (retirada ? (
              // RET-11: a retirada não tem transportadora nem prazo de entrega — mostra o método, o
              // endereço do escritório e "Grátis".
              <div
                role="group"
                aria-label="Frete escolhido"
                className="flex items-center gap-[18px] rounded-sm bg-estrelinha-ground-deep py-3 pl-[6px] pr-[14px]"
              >
                <MapPin
                  className="h-5 w-5 shrink-0 text-estrelinha-ink"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="flex min-w-0 grow flex-col gap-[2px]">
                  <span className="text-[15px] font-semibold text-estrelinha-ink">
                    {PICKUP_METHOD_NAME}
                  </span>
                  {pickup && (
                    <span className="break-words text-[13px] text-estrelinha-ink-soft">
                      {pickup.location}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-heading text-base font-semibold text-estrelinha-primary">
                  Grátis
                </span>
              </div>
            ) : (
              <div
                role="group"
                aria-label="Frete escolhido"
                className="flex items-center gap-[18px] rounded-sm bg-estrelinha-ground-deep py-3 pl-[6px] pr-[14px]"
              >
                <Truck
                  className="h-5 w-5 shrink-0 text-estrelinha-ink"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <span className="flex min-w-0 grow flex-col gap-[2px]">
                  <span className="text-[15px] font-semibold text-estrelinha-ink">
                    {shipping.carrier} {shipping.serviceName}
                  </span>
                  <span className="text-[13px] text-estrelinha-ink-soft">
                    {chegada ? `Chega ${chegada}` : 'Prazo confirmado após a postagem'}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-[2px]">
                  <span
                    className={`font-heading text-base font-semibold ${
                      shipping.cost === 0 ? 'text-estrelinha-primary' : 'text-estrelinha-ink'
                    }`}
                  >
                    {shipping.cost === 0 ? 'Grátis' : formatPrice(shipping.cost)}
                  </span>
                  {shipping.cost === 0 && escolhida && escolhida.price > 0 && (
                    <span className="text-xs text-estrelinha-ink-soft line-through">
                      {formatPrice(escolhida.price)}
                    </span>
                  )}
                </span>
              </div>
            ))
          )
        }
      >
        {complete ? (
          <>
            <span className="text-[15px] font-semibold text-estrelinha-ink">{rua}</span>
            <span className="text-sm text-estrelinha-ink-soft">{cidade}</span>
            <span className="text-sm text-estrelinha-ink-soft">CEP {maskCep(address.cep)}</span>
          </>
        ) : (
          <span className="text-sm text-estrelinha-ink-soft">{DELIVERY_EMPTY_SUMMARY}</span>
        )}
      </CollapsedBlock>
      </>
    )
  }

  return (
    <section
      aria-label="Entrega"
      className="flex flex-col gap-5 rounded-lg border border-estrelinha-line bg-white p-4"
    >
      <header className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estrelinha-ink font-heading text-base font-semibold text-white">
          2
        </span>
        <div className="flex grow flex-col gap-[2px]">
          <h2 className="font-heading text-[21px] font-semibold tracking-[-0.02em] text-estrelinha-ink">
            Entrega
          </h2>
          <p className="text-[13px] text-estrelinha-ink-soft">Prazos e valores reais do Melhor Envio</p>
        </div>
      </header>

      <div className="flex flex-col gap-[7px] sm:max-w-[200px]">
        <Label htmlFor="delivery-cep" className="text-[13px] font-semibold text-estrelinha-ink">
          CEP
        </Label>
        <Input
          id="delivery-cep"
          inputMode="numeric"
          autoComplete="postal-code"
          // 9 = comprimento de `00000-000`. O teto real é de `maskCep`, que ignora o 9º dígito.
          maxLength={9}
          value={address.cep}
          onChange={(e) => edit({ cep: maskCep(e.target.value) })}
          placeholder="00000-000"
          className="border-estrelinha-field"
        />
      </div>

      {address.manual && cepComplete && (
        <p role="status" className="text-[13px] text-estrelinha-ink-soft">
          Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-[7px]">
          <Label htmlFor="delivery-street" className="text-[13px] font-semibold text-estrelinha-ink">
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
          <Label htmlFor="delivery-number" className="text-[13px] font-semibold text-estrelinha-ink">
            Número
          </Label>
          <Input
            id="delivery-number"
            value={address.number}
            onChange={(e) => edit({ number: e.target.value })}
            placeholder="123"
            className="border-estrelinha-field"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="delivery-complement"
            className="text-[13px] font-semibold text-estrelinha-ink"
          >
            Complemento
          </Label>
          <Input
            id="delivery-complement"
            value={address.complement}
            onChange={(e) => edit({ complement: e.target.value })}
            placeholder="Apto, bloco…"
            className="border-estrelinha-field"
          />
        </div>
        <div className="flex flex-col gap-[7px]">
          <Label
            htmlFor="delivery-neighborhood"
            className="text-[13px] font-semibold text-estrelinha-ink"
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
          <Label htmlFor="delivery-city" className="text-[13px] font-semibold text-estrelinha-ink">
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
          <Label htmlFor="delivery-state" className="text-[13px] font-semibold text-estrelinha-ink">
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

      {pickupSource}

      <div className="flex flex-col gap-[10px] pt-[6px]">
        <span className="text-[13px] font-semibold text-estrelinha-ink">Forma de envio</span>

        {!cepComplete && (
          <p className="text-[13px] text-estrelinha-ink-soft">
            Informe o CEP para ver as opções de envio.
          </p>
        )}

        {cepComplete && quote.isLoading && (
          <p className="text-[13px] text-estrelinha-ink-soft">Consultando as transportadoras…</p>
        )}

        {quoteFailed && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-estrelinha-ground-deep p-3 text-[13px] text-estrelinha-ink"
          >
            <AlertTriangle className="mt-[1px] h-4 w-4 shrink-0 text-estrelinha-primary" aria-hidden />
            {QUOTE_UNAVAILABLE_MESSAGE}
          </p>
        )}

        {optionList}
      </div>

      {/* FLW-02/FLW-03: contorno de tinta, não geleia sólida — CHK-04 reserva a única pílula
          geleia da tela para o CTA. `min-h-11` = 44px, o mínimo da premissa mobile. */}
      <Button
        type="button"
        disabled={!canContinue}
        onClick={onContinue}
        className="min-h-11 self-start rounded-sm border-2 border-estrelinha-ink bg-transparent px-7 font-heading text-[15px] font-semibold text-estrelinha-ink hover:bg-estrelinha-ground-deep"
      >
        Continuar
      </Button>
    </section>
  )
}

export default DeliveryBlock
