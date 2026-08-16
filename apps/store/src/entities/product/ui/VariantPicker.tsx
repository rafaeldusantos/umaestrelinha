import {
  availableValuesFor,
  axisPhotos,
  visibleOptions,
  type AxisPhoto,
  type GridProduct,
} from '../lib/variantSelection'
import type { OptionValues } from '@estrelinha/supabase/types'

/**
 * Escolha de variação em **pílulas**, um grupo por eixo (boards "Quick add com variações" e
 * "Quick add: bottom sheet").
 *
 * Substitui os `<Select>` do card: no drawer/sheet o valor precisa estar visível sem abrir nada —
 * é uma escolha de 2 a 4 opções, não uma lista longa. A pílula também é o único formato em que
 * cabe o alvo de 40px (drawer) / 48px (sheet) que o board pede.
 *
 * **Por que pílula e não swatch de COR**: `products.options` guarda só o *nome* do valor ("Rosa"),
 * nunca um hex. Um mapa nome→cor no front acertaria os valores que alguém lembrou de cadastrar e
 * erraria em silêncio todos os outros.
 *
 * **Mas há foto de verdade, e desde a feature 27 ela é usada — na PÁGINA.** `product_variants.
 * image_url` está preenchida em 3.052 das 3.245 variações, e `axisPhotos` decide, por regra pura e
 * medida, quando as fotos de um eixo informam: **≥2 valores com foto e todas distintas entre si**.
 * Isso aceita 540 dos 686 eixos do catálogo (`Cor`, `Tipos de elo`, `Modelo`) e recusa exatamente
 * aqueles em que todas as vagas mostrariam a mesma peça (`Com gravação`, `Com Base`, `Letra`) — onde
 * o swatch diria à cliente que a escolha não muda nada. Eixo recusado continua em pílula com o nome.
 *
 * A foto **substitui** o rótulo na vaga, e o nome do valor escolhido vai para o CABEÇALHO do eixo
 * ("Cor: Aço Inoxidável Folheado a Ouro Rose"): o rótulo tem mediana de 15 e **máximo de 40**
 * caracteres, que não cabe sob uma vaga de 56px numa viewport de 390. Cada vaga leva `aria-label`
 * com o valor, então nada se perde para quem usa leitor de tela.
 *
 * Valor sem nenhuma variação disponível aparece **desabilitado**, não escondido (PST-08) — mesma
 * regra dos selects que este componente substituiu, e vale para pílula e para foto.
 */

/**
 * Tamanhos do board: 40px no drawer do card (desktop), 48px no sheet (mobile), 44px na página.
 *
 * A página é a única superfície que **não** estica as pílulas: no drawer e no sheet o grupo ocupa a
 * largura toda porque são 2 a 4 valores num painel estreito; na coluna de 632px do board os chips
 * têm largura natural e quebram linha, senão "P / M / G" viraria três botões de 200px.
 */
type Surface = 'card' | 'sheet' | 'page'

interface Props {
  product: GridProduct
  /** Quantos eixos esta superfície mostra: `CARD_MAX_AXES` no card, `PAGE_MAX_AXES` na página. */
  max: number
  selected: OptionValues
  onChange: (values: OptionValues) => void
  surface?: Surface
}

const SURFACE = {
  card: {
    group: 'gap-1.5 pt-3 first:pt-0',
    label: 'font-bold uppercase tracking-[0.12em] text-estrelinha-primary text-[11px] leading-[13px]',
    row: 'gap-2',
    pill: 'h-10 flex-1 rounded-pill border text-[14px]',
  },
  sheet: {
    group: 'gap-2.5 pt-6 first:pt-0',
    label: 'font-bold uppercase tracking-[0.12em] text-estrelinha-primary text-[11px] leading-[14px]',
    row: 'gap-2.5',
    pill: 'h-12 flex-1 rounded-pill border text-[16px]',
  },
  page: {
    group: 'gap-2.5 pt-5 first:pt-0',
    label: 'font-semibold text-estrelinha-ink text-[13px] leading-4',
    // O board desenha 44×44 no chip de tamanho e um chip mais largo no de acabamento: é a mesma
    // caixa, com `px` e `min-w` de 44px — que é também o alvo de toque mínimo do mobile.
    row: 'flex-wrap gap-2',
    // `border-2` também no não-escolhido: com 1px aqui e 2px no escolhido, cada clique moveria a
    // linha inteira em 1px.
    pill: 'h-11 min-w-[44px] rounded-md border-2 px-3.5 text-[14px]',
  },
} as const satisfies Record<Surface, Record<string, string>>

/**
 * O valor escolhido.
 *
 * Cheio de geleia no drawer e no sheet — ali a pílula é a única marcação num painel de 2 a 4
 * opções. Na página é **contorno**, como o board: a coluna já tem o CTA em geleia logo abaixo, e
 * dois blocos chapados na mesma cor deixariam de existir uma ação primária (DESIGN.md §8).
 */
const PICKED: Record<Surface, string> = {
  card: 'border-estrelinha-primary bg-estrelinha-primary text-white',
  sheet: 'border-estrelinha-primary bg-estrelinha-primary text-white',
  page: 'border-estrelinha-primary bg-estrelinha-primary/[0.06] text-estrelinha-primary',
}

/**
 * A vaga de foto — 56×56, contra os 40/45 da placa do card (`ColorPreview`).
 *
 * Maior porque aqui é onde a escolha acontece, e não uma prévia disputando espaço com a foto do
 * produto. E porque 56 > 44: o alvo de toque é satisfeito pela própria caixa pintada, sem precisar
 * do `TAP_44` — que existe para desenho MENOR que o alvo.
 */
const VAGA = 'h-14 w-14 shrink-0 overflow-hidden rounded-sm transition-colors'

const VagaFoto = ({
  foto,
  unavailable,
  onPick,
}: {
  foto: AxisPhoto
  unavailable: boolean
  onPick: () => void
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={foto.active}
    // O rótulo não é desenhado na vaga, então ele PRECISA existir aqui.
    aria-label={foto.value}
    disabled={unavailable}
    onClick={onPick}
    className={[
      VAGA,
      // A escolhida engrossa para 2px em `ink`. As duas ocupam a MESMA caixa de 56px (`box-border` é
      // o padrão do Tailwind), então trocar a escolha não desloca a fileira.
      foto.active ? 'border-2 border-estrelinha-ink' : 'border border-estrelinha-field',
      unavailable ? 'border-dashed opacity-40' : 'hover:border-estrelinha-primary',
      // Valor sem foto é o palco vazio, e não um `<img>` sem `src` — o navegador desenharia o ícone
      // de imagem quebrada. Nem a foto de outro valor (`PDP-20`).
      foto.imageUrl ? '' : 'bg-estrelinha-ground-deep',
    ].join(' ')}
  >
    {foto.imageUrl && (
      <img
        src={foto.imageUrl}
        alt=""
        loading="lazy"
        // Recorte central por heurística, como na placa do card: a peça é pequena sobre fundo
        // branco, e a foto inteira em 56px seria quase toda fundo.
        className="h-full w-full scale-[1.6] object-cover"
      />
    )}
  </button>
)

const VariantPicker = ({ product, max, selected, onChange, surface = 'card' }: Props) => {
  const axes = visibleOptions(product.options, max)
  if (axes.length === 0) return null

  const s = SURFACE[surface]

  return (
    <>
      {axes.map(axis => {
        const available = availableValuesFor(product, axis.name, selected)
        // Foto só na página: o card tem a placa de cor e o sheet é painel estreito de decisão
        // rápida — mudar as três superfícies de uma vez misturaria duas revisões de UI.
        const fotos = surface === 'page' ? axisPhotos(product, axis, selected) : null
        const escolhido = selected[axis.name]

        return (
          <div key={axis.name} className={`flex flex-col ${s.group}`}>
            <span className={`font-body ${s.label}`} id={`axis-${axis.name}`}>
              {fotos && escolhido ? (
                <>
                  <span className="font-normal text-estrelinha-ink-soft">{axis.name}:</span>{' '}
                  {escolhido}
                </>
              ) : (
                axis.name
              )}
            </span>
            <div role="radiogroup" aria-labelledby={`axis-${axis.name}`} className={`flex ${s.row}`}>
              {fotos
                ? fotos.map(foto => (
                    <VagaFoto
                      key={foto.value}
                      foto={foto}
                      unavailable={!available.has(foto.value)}
                      onPick={() => onChange({ ...selected, [axis.name]: foto.value })}
                    />
                  ))
                : axis.values.map(value => {
                    const unavailable = !available.has(value)
                    const isSelected = escolhido === value
                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        disabled={unavailable}
                        onClick={() => onChange({ ...selected, [axis.name]: value })}
                        className={`flex items-center justify-center font-display font-semibold transition-colors ${s.pill} ${
                          isSelected
                            ? PICKED[surface]
                            : unavailable
                              ? 'border-dashed border-estrelinha-line/70 font-medium text-estrelinha-ink-soft/70'
                              : 'border-estrelinha-line bg-estrelinha-ground-deep text-estrelinha-ink hover:border-estrelinha-primary/40'
                        }`}
                      >
                        {value}
                      </button>
                    )
                  })}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default VariantPicker
