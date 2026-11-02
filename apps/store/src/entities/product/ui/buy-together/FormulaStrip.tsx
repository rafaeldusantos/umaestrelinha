import type { BuyTogether } from '../../model/useBuyTogether'

interface Props {
  addons: BuyTogether['addons']
  toggle: BuyTogether['toggle']
}

/**
 * A faixa da forma "Com fórmula": "Esta joia + <adicional> + …" acima da lista.
 *
 * É decoração, e por isso fica fora do leitor de tela: tudo o que ela diz, a lista logo abaixo diz
 * melhor, com a caixa de marcar de cada peça. Os nomes são clicáveis para quem usa o mouse ou o
 * dedo, mas fora da ordem do teclado (`tabIndex={-1}`) — o teclado e o leitor de tela têm a lista.
 */
const FormulaStrip = ({ addons, toggle }: Props) => (
  <div
    aria-hidden="true"
    data-testid="formula-strip"
    className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-estrelinha-ground-deep px-3 py-2 text-[14px] text-estrelinha-ink"
  >
    <span className="font-semibold">Esta joia</span>
    {addons.map(addon => (
      <span key={addon.id} className="contents">
        <span className="text-estrelinha-ink-soft">+</span>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => toggle(addon.id)}
          className={`flex min-h-11 max-w-full min-w-0 items-center break-words rounded-full border px-3 text-left font-semibold ${
            addon.marked
              ? 'border-estrelinha-primary bg-estrelinha-primary text-estrelinha-on-primary'
              : 'border-estrelinha-line bg-white text-estrelinha-ink'
          }`}
        >
          {addon.name}
        </button>
      </span>
    ))}
  </div>
)

export default FormulaStrip
