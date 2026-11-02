import { useRef } from 'react'
import { formatPrice } from '@estrelinha/core/formatters'
import type { BuyTogetherForm } from '@estrelinha/core/buy-together'
import type { BuyTogether, BuyTogetherAddon } from '../../model/useBuyTogether'
import AddonPanel, { Foto } from './AddonPanel'
import { addonHasChoice, addonNeedsPanel, panelIdOf } from './panel'
import AddonSheet from './AddonSheet'

interface Props {
  addon: BuyTogetherAddon
  /** Como o bloco abre as escolhas. Só muda onde o painel aparece: a regra é a mesma nas três. */
  form?: BuyTogetherForm
  actions: Pick<
    BuyTogether,
    'toggle' | 'toggleOpen' | 'choosePiece' | 'selectOptions' | 'setEngraving'
  >
}

/** A frase do nome acessível da caixa: o nome e o resumo da escolha, separados por vírgula. */
const accessibleName = (a: BuyTogetherAddon): string =>
  `Levar junto: ${a.name}${a.summaryParts.length > 0 ? `, ${a.summaryParts.join(', ')}` : ''}`

/**
 * Um adicional do bloco. Na forma "Na linha" (e "Com fórmula", que só acrescenta a faixa acima da
 * lista) marcar abre as escolhas ali mesmo; "Em folha" as leva para a folha do celular e o diálogo
 * do computador.
 */
const AddonRow = ({ addon, form = 'inline', actions }: Props) => {
  const { toggle, toggleOpen } = actions
  const sheet = form === 'sheet'
  const panelId = panelIdOf(addon)
  const hasChoice = addonHasChoice(addon)
  const showPanel = addon.open && addonNeedsPanel(addon)
  // O controle que abriu a folha: é pra ele que o foco volta ao fechar.
  const opener = useRef<HTMLElement | null>(null)

  return (
    <li
      data-addon-id={addon.id}
      className="flex flex-col rounded-md border border-estrelinha-line bg-white p-3"
    >
      <div className="flex items-center gap-3">
        <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={addon.marked}
            onChange={event => {
              opener.current = event.currentTarget
              toggle(addon.id)
            }}
            aria-label={accessibleName(addon)}
            aria-controls={sheet ? undefined : panelId}
            className="h-5 w-5 shrink-0 accent-estrelinha-primary"
          />
          <Foto url={addon.photo} size="h-14 w-14" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="break-words font-display text-[15px] font-semibold leading-5 text-estrelinha-ink">
              {addon.name}
            </span>
            {addon.summaryParts.length > 0 && (
              <span className="break-words text-[13px] leading-[18px] text-estrelinha-ink-soft">
                {addon.summaryParts.join(' · ')}
              </span>
            )}
          </span>
          <span className="shrink-0 text-right font-display text-[15px] font-semibold text-estrelinha-primary">
            {addon.price !== null ? (
              formatPrice(addon.price)
            ) : (
              <>
                <span className="block text-[12px] font-normal text-estrelinha-ink-soft">a partir de</span>
                {formatPrice(addon.fromPrice)}
              </>
            )}
          </span>
        </label>
      </div>

      {hasChoice && (
        <button
          type="button"
          onClick={event => {
            opener.current = event.currentTarget
            toggleOpen(addon.id)
          }}
          aria-expanded={addon.open}
          aria-controls={sheet ? undefined : panelId}
          aria-haspopup={sheet ? 'dialog' : undefined}
          className="mt-1 inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-estrelinha-primary hover:underline"
        >
          {addon.open
            ? 'Esconder opções'
            : addon.kind === 'list'
              ? addon.pieces.length === 1
                ? 'Ver o modelo'
                : `Ver os ${addon.pieces.length} modelos`
              : 'Ver opções'}
        </button>
      )}

      {sheet ? (
        <AddonSheet addon={addon} open={showPanel} opener={opener} actions={actions} />
      ) : (
        showPanel && <AddonPanel addon={addon} actions={actions} />
      )}
    </li>
  )
}

export default AddonRow
