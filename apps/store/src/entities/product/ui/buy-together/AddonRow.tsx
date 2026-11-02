import { useRef } from 'react'
import { Check } from 'lucide-react'
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
  /** A cliente já tentou levar o conjunto: só então a linha diz o que falta. */
  attempted?: boolean
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
 *
 * A linha é uma grade de três células: a caixa de marcar (o alvo de 44px), a foto e o texto. A foto e
 * o texto também marcam, por um `<label>` apontando para a caixa; o link "Ver opções" fica fora deles.
 */
const AddonRow = ({ addon, form = 'inline', attempted = false, actions }: Props) => {
  const { toggle, toggleOpen } = actions
  const sheet = form === 'sheet'
  const panelId = panelIdOf(addon)
  const checkboxId = `buy-together-check-${addon.id}`
  const hasChoice = addonHasChoice(addon)
  // Na linha, as escolhas ficam abertas com a linha marcada ou abertas pelo link; a frase do que falta
  // não mora no painel, então ele só existe quando há algo a escolher ou a gravar.
  const showPanel = sheet
    ? addon.open && addonNeedsPanel(addon)
    : (addon.marked || addon.open) && (hasChoice || addon.engravingEnabled)
  // Com a linha marcada as escolhas já estão à vista: o link sai (fora da folha).
  const showLink = hasChoice && (sheet || !addon.marked)
  const missing = !sheet && attempted && addon.marked ? addon.missing : null
  // A peça em foco: a escolhida, ou a primeira da lista enquanto nada foi escolhido.
  const price = addon.price ?? (addon.piece ?? addon.pieces[0]).product.price
  // O controle que abriu a folha: é pra ele que o foco volta ao fechar.
  const opener = useRef<HTMLElement | null>(null)

  return (
    <li
      data-addon-id={addon.id}
      className="flex flex-col border-t border-estrelinha-line py-3 first:border-t-0 first:pt-0"
    >
      <div className="grid grid-cols-[44px_64px_minmax(0,1fr)] items-start gap-x-2.5">
        <label
          htmlFor={checkboxId}
          className="relative flex h-11 w-11 cursor-pointer items-center justify-center"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={addon.marked}
            onChange={event => {
              opener.current = event.currentTarget
              toggle(addon.id)
            }}
            aria-label={accessibleName(addon)}
            aria-controls={sheet ? undefined : panelId}
            className="peer h-6 w-6 shrink-0 cursor-pointer appearance-none rounded-sm border-2 border-estrelinha-field bg-estrelinha-surface transition-colors checked:border-estrelinha-primary checked:bg-estrelinha-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estrelinha-primary motion-reduce:transition-none"
          />
          <Check
            aria-hidden
            strokeWidth={3}
            className="pointer-events-none absolute h-4 w-4 text-estrelinha-on-primary opacity-0 peer-checked:opacity-100"
          />
        </label>

        <label htmlFor={checkboxId} className="cursor-pointer" data-addon-foto>
          <Foto url={addon.photo} size="h-20 w-16" rounded="rounded-md" width={240} />
        </label>

        <div className="flex min-w-0 flex-col">
          <label htmlFor={checkboxId} className="flex min-w-0 cursor-pointer flex-col">
            <span className="break-words font-display text-[15px] font-normal leading-[1.3] text-estrelinha-ink">
              {addon.name}
            </span>
            {addon.summaryParts.length > 0 && (
              <span className="mt-0.5 break-words text-[13px] leading-[18px] text-estrelinha-ink-soft">
                {addon.summaryParts.join(' · ')}
              </span>
            )}
            <span className="mt-1 font-display text-[15px] font-bold text-estrelinha-primary">
              {formatPrice(price)}
            </span>
          </label>

          {showLink && (
            <button
              type="button"
              onClick={event => {
                opener.current = event.currentTarget
                toggleOpen(addon.id)
              }}
              aria-expanded={addon.open}
              aria-controls={sheet ? undefined : panelId}
              aria-haspopup={sheet ? 'dialog' : undefined}
              className="inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-estrelinha-primary hover:underline"
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
        </div>
      </div>

      {missing !== null && (
        <p
          role="status"
          className="ml-[54px] mt-2 flex items-center gap-2 text-[13px] leading-[18px] text-estrelinha-alert"
        >
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-estrelinha-alert" />
          {missing}
        </p>
      )}

      {sheet ? (
        <AddonSheet addon={addon} open={showPanel} opener={opener} actions={actions} />
      ) : (
        showPanel && (
          <div className="ml-[54px]">
            <AddonPanel addon={addon} actions={actions} showMissing={false} />
          </div>
        )
      )}
    </li>
  )
}

export default AddonRow
