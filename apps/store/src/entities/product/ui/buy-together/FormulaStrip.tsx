import type { BuyTogether } from '../../model/useBuyTogether'
import { Foto } from './AddonPanel'

interface Props {
  /** A foto da joia da página (a da variação escolhida, com recuo para a do produto). */
  mainPhoto: string | null
  addons: BuyTogether['addons']
  toggle: BuyTogether['toggle']
}

/** Item da faixa: a foto de 64×80 com o nome curto abaixo, numa coluna de 72px que não encolhe. */
const ITEM = 'flex w-[72px] flex-none flex-col items-center gap-1'
const NOME = 'text-center text-[11px] leading-[1.25] text-estrelinha-ink-soft'

/**
 * A faixa da forma "Com fórmula": "Esta joia + <adicional> + …" acima da lista, em fotos.
 *
 * É decoração, e por isso fica fora do leitor de tela: tudo o que ela diz, a lista logo abaixo diz
 * melhor, com a caixa de marcar de cada peça. Os adicionais são clicáveis para quem usa o mouse ou o
 * dedo, mas fora da ordem do teclado (`tabIndex={-1}`) — o teclado e o leitor de tela têm a lista.
 * A faixa não quebra linha: com muitas peças ela rola na horizontal dentro dela mesma, nunca o body.
 */
const FormulaStrip = ({ mainPhoto, addons, toggle }: Props) => (
  <div
    aria-hidden="true"
    data-testid="formula-strip"
    className="mt-3 flex items-center gap-1.5 overflow-x-auto px-0.5 pb-1.5 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  >
    <span data-formula-item="principal" className={`${ITEM} cursor-default`}>
      <span data-formula-photo>
        <Foto url={mainPhoto} size="h-20 w-16" rounded="rounded-md" width={240} />
      </span>
      <span data-formula-name className={NOME}>
        Esta joia
      </span>
    </span>
    {addons.map(addon => (
      <span key={addon.id} className="contents">
        <span className="flex-none text-[18px] font-light text-estrelinha-ink-soft">+</span>
        <button
          type="button"
          tabIndex={-1}
          data-formula-item={addon.id}
          onClick={() => toggle(addon.id)}
          className={ITEM}
        >
          <span
            data-formula-photo
            className={`transition-opacity duration-150 motion-reduce:transition-none ${
              addon.marked ? 'opacity-100' : 'opacity-35'
            }`}
          >
            <Foto url={addon.photo} size="h-20 w-16" rounded="rounded-md" width={240} />
          </span>
          <span data-formula-name className={`${NOME} break-words`}>
            {addon.name}
          </span>
        </button>
      </span>
    ))}
  </div>
)

export default FormulaStrip
