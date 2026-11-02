import { bundlePix } from '@estrelinha/core/buy-together'
import { formatPrice } from '@estrelinha/core/formatters'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useBuyTogetherForm } from '@estrelinha/core/hooks/useBuyTogetherForm'
import { PixIcon } from '@estrelinha/ui/icons'
import type { BuyTogether } from '../../model/useBuyTogether'
import AddonRow from './AddonRow'
import BuyTogetherSkeleton from './BuyTogetherSkeleton'
import FormulaStrip from './FormulaStrip'
import { BUY_TOGETHER_SURFACE } from './panel'

interface Props {
  state: BuyTogether
  /** A cliente já tentou levar o conjunto incompleto (`useBuyAction`): só então cada linha diz o que falta. */
  attempted?: boolean
}

/**
 * O bloco Compre Junto da coluna de informação, na forma que a dona escolheu no painel ("Na linha" quando ela
 * nunca escolheu): a forma só decide onde as escolhas se abrem e se há a faixa de fórmula — o total, o PIX e o
 * que vai à sacola são os mesmos nas três.
 *
 * Nasce com nada marcado. Não repete o seletor do principal: a variação e a quantidade que a página
 * já mostra entram na conta pelo estado (`useBuyTogether`). O texto não diz qual material uma peça
 * exige — quem pergunta isso é a gaveta de material, e `semMaterialNaPaginaDoProduto.test.ts` vigia.
 */
const BuyTogetherBlock = ({ state, attempted = false }: Props) => {
  if (state.display === 'off') return null
  if (state.display === 'loading') return <BuyTogetherSkeleton />
  return <ReadyBlock state={state} attempted={attempted} />
}

/** O bloco desenhado. A forma só é lida aqui: sem adicional a mostrar, o bloco não pergunta nada. */
const ReadyBlock = ({ state, attempted }: Props) => {
  const { pix_enabled, pix_discount_percent } = usePaymentSettings()
  const form = useBuyTogetherForm()
  const { addons, markedCount, total } = state
  // O PIX é o do TOTAL, pela mesma regra de desconto da página — nunca a soma dos PIX das peças.
  const pix = total !== null && pix_enabled ? bundlePix(total, pix_discount_percent) : null
  const temTotal = markedCount > 0 && total !== null
  const anuncioPix = pix === null ? '' : `, ${formatPrice(pix)} no Pix`
  const anuncio = temTotal ? `Total do conjunto: ${formatPrice(total)}${anuncioPix}` : ''

  return (
    <section aria-labelledby="buy-together-title" className={BUY_TOGETHER_SURFACE}>
      <div className="flex flex-col">
        <h2
          id="buy-together-title"
          className="font-display text-[20px] font-normal leading-[1.25] tracking-[-0.02em] text-estrelinha-ink"
        >
          Compre junto
        </h2>
        <p className="mt-1 text-[14px] font-light leading-5 text-estrelinha-ink-soft">
          Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar.
        </p>
      </div>

      {form === 'formula' && <FormulaStrip addons={addons} toggle={state.toggle} />}

      <ul className="grid grid-cols-[minmax(0,1fr)]">
        {addons.map(addon => (
          <AddonRow key={addon.id} addon={addon} form={form} attempted={attempted} actions={state} />
        ))}
      </ul>

      {/*
        O leitor de tela só anuncia a mudança de uma região viva que já estava no DOM: esta nasce com o bloco,
        vazia, e recebe cada total novo. O rodapé abaixo monta e desmonta, e por isso não é a região. Uma só
        para a página: a barra fixa mostra o mesmo valor sem anunciá-lo de novo.
      */}
      <p role="status" className="sr-only">
        {anuncio}
      </p>

      {temTotal && (
        <div className="flex flex-col gap-2.5 border-t border-estrelinha-line pt-3.5">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[14px] text-estrelinha-ink-soft">Total do conjunto</span>
            <span className="font-display text-[22px] font-bold text-estrelinha-primary">
              {formatPrice(total)}
            </span>
          </p>
          {pix !== null && (
            <p className="-mt-1.5 flex items-center justify-end gap-1.5 text-[14px] leading-5">
              <PixIcon className="h-[15px] w-[15px] shrink-0 text-estrelinha-primary" aria-hidden />
              <span className="font-semibold text-estrelinha-ink">{formatPrice(pix)}</span>
              <span className="text-estrelinha-ink-soft">no Pix</span>
            </p>
          )}
          <p className="text-[13px] leading-[18px] text-estrelinha-ink-soft">
            O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha
            própria, e você pode tirar qualquer uma depois.
          </p>
        </div>
      )}
    </section>
  )
}

export default BuyTogetherBlock
