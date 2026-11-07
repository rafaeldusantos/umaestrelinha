import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { renditionUrl } from '@estrelinha/core/media'
import type { OptionValues } from '@estrelinha/supabase/types'
import type { BuyTogether, BuyTogetherAddon } from '../../model/useBuyTogether'
import { PAGE_MAX_AXES } from '../../lib/variantSelection'
import EngravingField from '../EngravingField'
import AddonPrice from './AddonPrice'
import VariantPicker from '../VariantPicker'
import { panelIdOf } from './panel'

interface FotoProps {
  url: string | null
  size: string
  /** O raio da vaga. O cartão de peça é `rounded-sm`; a foto da linha do bloco, `rounded-md`. */
  rounded?: 'rounded-sm' | 'rounded-md'
  /** A largura da rendição: a da vaga a DPR 3, sem baixar mais que o necessário. */
  width?: 180 | 240
}

export const Foto = ({ url, size, rounded = 'rounded-sm', width = 180 }: FotoProps) => (
  <span className={`${size} block shrink-0 overflow-hidden ${rounded} bg-estrelinha-ground-deep`}>
    {url && (
      <img src={renditionUrl(url, width)} alt="" loading="lazy" className="h-full w-full object-cover" />
    )}
  </span>
)

interface Props {
  addon: BuyTogetherAddon
  actions: Pick<BuyTogether, 'choosePiece' | 'selectOptions' | 'setEngraving'>
  /**
   * Desenhar aqui a frase do que falta. A folha ("Em folha") a desenha; na linha quem a desenha é a
   * própria linha, entre ela e as escolhas, e só depois de a cliente tentar levar o conjunto.
   */
  showMissing?: boolean
}

/**
 * O painel de escolhas de um adicional: a peça (na lista), a variação, a gravação e a frase do que
 * falta. É o MESMO nas três formas do bloco — a forma só decide onde ele aparece (na linha, numa
 * folha ou num diálogo), e por isso ele mora num arquivo só.
 */
const AddonPanel = ({ addon, actions, showMissing = true }: Props) => {
  const { choosePiece, selectOptions, setEngraving } = actions
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const panelId = panelIdOf(addon)
  const chosenPieceId = addon.piece?.product.id ?? null

  const moveBy = (event: KeyboardEvent, step: number) => {
    const current = Math.max(
      0,
      addon.pieces.findIndex(p => p.product.id === chosenPieceId),
    )
    const next = (current + step + addon.pieces.length) % addon.pieces.length
    event.preventDefault()
    choosePiece(addon.id, addon.pieces[next].product.id)
    cards.current[next]?.focus()
  }

  return (
    <div id={panelId} className="mt-2 flex flex-col">
      {addon.kind === 'list' && (
        <>
          <span id={`${panelId}-label`} className="text-[13px] font-semibold leading-4 text-estrelinha-ink">
            Escolha a peça · {addon.pieces.length} {addon.pieces.length === 1 ? 'modelo' : 'modelos'}
          </span>
          <div
            role="radiogroup"
            aria-labelledby={`${panelId}-label`}
            // Uma faixa que rola dentro do bloco, e nunca o body: os cartões têm largura própria e não
            // encolhem, e o encaixe para no começo de cada um. O recuo de 2px é o do contorno de foco,
            // que a rolagem cortaria rente à borda.
            className="mt-2.5 flex min-w-0 snap-x snap-mandatory flex-row gap-2 overflow-x-auto px-0.5 pb-1.5 pt-0.5"
          >
            {addon.pieces.map((piece, index) => {
              const checked = piece.product.id === chosenPieceId
              // A primeira já vem em foco (roving tabindex), sem estar marcada.
              const tabbable = checked || (chosenPieceId === null && index === 0)
              return (
                <button
                  key={piece.product.id}
                  ref={el => {
                    cards.current[index] = el
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={tabbable ? 0 : -1}
                  onClick={() => choosePiece(addon.id, piece.product.id)}
                  onKeyDown={e => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') moveBy(e, 1)
                    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') moveBy(e, -1)
                  }}
                  className={`flex min-h-11 w-[132px] shrink-0 snap-start flex-col items-stretch gap-1.5 rounded-md border-2 p-1.5 text-left transition-colors motion-reduce:transition-none ${
                    checked
                      ? 'border-estrelinha-primary bg-estrelinha-primary/[0.06]'
                      : 'border-estrelinha-line bg-estrelinha-ground-deep hover:border-estrelinha-primary/40'
                  }`}
                >
                  <Foto url={piece.product.image_url} size="aspect-square w-full" />
                  <span className="break-words text-[13px] font-semibold leading-4 text-estrelinha-ink">
                    {piece.product.name}
                  </span>
                  {addon.discountPercent !== null && (
                    <AddonPrice
                      price={checked && addon.price !== null ? addon.price : piece.product.price}
                      discountPercent={addon.discountPercent}
                      size="card"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}

      {addon.piece && !addon.piece.simple && (
        <div className="mt-1 flex flex-col">
          <VariantPicker
            product={addon.piece.grid}
            max={PAGE_MAX_AXES}
            surface="page"
            selected={addon.selected}
            onChange={(values: OptionValues) => selectOptions(addon.id, values)}
            idPrefix={`${panelId}-`}
          />
        </div>
      )}

      <EngravingField
        id={`engraving-${addon.id}`}
        purchase={{
          engraving: addon.engraving,
          setEngraving: text => setEngraving(addon.id, text),
          engravingEnabled: addon.engravingEnabled,
          engravingLimit: addon.engravingLimit,
          engravingRefusal: addon.engravingRefusal,
        }}
      />

      {showMissing && addon.marked && addon.missing !== null && (
        <p role="status" className="mt-3 text-[13px] font-medium leading-[18px] text-estrelinha-primary">
          {addon.missing}
        </p>
      )}
    </div>
  )
}

export default AddonPanel
