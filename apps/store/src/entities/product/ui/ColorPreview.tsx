import type { OptionValues } from '@estrelinha/supabase/types'
import { TAP_44 } from '@/shared/lib/touchTarget'
import {
  COLOR_SLOTS_MAX,
  COLOR_SLOT_TIERS,
  colorPreview,
  type ColorThumb,
  type GridProduct,
} from '../lib/variantSelection'

/**
 * A fileira de cores do card — `COR-10`..`COR-16`, board `7CF-0`.
 *
 * **Cada miniatura é um controle**, e acioná-la troca a imagem em destaque do card (`COR-11`). A
 * redação anterior fazia da fileira um controle único que abria o seletor; o usuário reverteu isso
 * em 2026-08-15 depois de ver a feature rodando.
 *
 * A reversão só é possível porque a miniatura cresceu de 32 para **40px** (45 a partir de `md`):
 * com `gap` de 6 o passo é **46px**, então cada retângulo de toque de 44px do `TAP_44` cabe SEM
 * sobrepor o vizinho — que era a objeção que sustentava a versão anterior. `touchTarget.test.ts` é
 * satisfeito pelo caminho que ele existe para induzir: caixa pintada com o tamanho do board, alvo
 * de 44 por baixo.
 *
 * **Não há placa branca por baixo** — as miniaturas assentam direto sobre a foto, e o contorno
 * `field` é a única coisa que as separa dela.
 */

/**
 * A vaga: 40×40 no celular e **45×45 a partir de `md`** (`COR-13`), raio 6px. `shrink-0` porque a
 * fileira não encolhe miniatura — ela mostra menos vagas.
 *
 * O tamanho varia por VIEWPORT e a quantidade de vagas, por largura de CARD. São eixos diferentes
 * de propósito: quanto cabe é espaço, e o dedo precisa de mais alvo que o mouse.
 */
const VAGA = 'h-10 w-10 md:h-[45px] md:w-[45px] shrink-0 overflow-hidden rounded-sm'

/** Contorno — `field` (#8C8073, 3,63:1). Sem a placa, é o que separa a miniatura da foto. */
const CONTORNO = 'border border-estrelinha-field'

/**
 * Em que faixa de largura cada vaga aparece.
 *
 * As larguras são LITERAIS porque o JIT do Tailwind varre o fonte por classe completa — montá-las a
 * partir de `COLOR_SLOT_TIERS` produziria classes que o Tailwind nunca emite, e a fileira apareceria
 * em toda largura. `ProductCardSurface.test.tsx` compara os literais renderizados com a constante,
 * para os dois donos do mesmo número não divergirem em silêncio.
 */
const MOSTRA_NA_FAIXA = ['', 'hidden @[213px]:block', 'hidden @[264px]:block'] as const
const CONTADOR_DA_FAIXA = [
  'hidden @[162px]:flex @[213px]:hidden',
  'hidden @[213px]:flex @[264px]:hidden',
  'hidden @[264px]:flex',
] as const

const Miniatura = ({
  thumb,
  display,
  onPick,
}: {
  thumb: ColorThumb
  display: string
  onPick: (thumb: ColorThumb, e: React.MouseEvent) => void
}) => (
  <button
    type="button"
    // O card inteiro é um <Link>: sem as duas chamadas, escolher a cor navegaria para o produto.
    // Mesmo padrão do favorito e do "+".
    onClick={e => {
      e.preventDefault()
      e.stopPropagation()
      onPick(thumb, e)
    }}
    aria-label={`Ver na cor ${thumb.value}`}
    aria-pressed={thumb.active}
    className={[
      TAP_44,
      VAGA,
      display,
      // COR-14: a escolhida engrossa para 2px em `ink`. As duas ocupam a MESMA caixa de 40px
      // (`box-border` é o padrão do Tailwind), então trocar a escolha não desloca a fileira.
      thumb.active ? 'border-2 border-estrelinha-ink' : CONTORNO,
      thumb.imageUrl ? '' : 'bg-estrelinha-ground-deep',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {/*
      COR-15: cor sem foto é o palco vazio, e não um `<img>` sem `src` — o navegador desenharia o
      ícone de imagem quebrada. Nem a foto de outra cor: três cores com a mesma imagem dizem à
      cliente que a cor não muda a peça.
    */}
    {thumb.imageUrl && (
      <img
        src={thumb.imageUrl}
        alt=""
        loading="lazy"
        // COR-13: a peça é pequena sobre fundo branco, então a foto inteira em 40px é quase toda
        // fundo — foi a queixa que abriu esta revisão. Recorte central por heurística: não há dado
        // que diga onde a peça está, e ela está centrada na esmagadora maioria das fotos.
        className="h-full w-full scale-[1.6] object-cover"
      />
    )}
  </button>
)

const Contador = ({ restam, display }: { restam: number; display: string }) => (
  <span
    aria-hidden
    className={`${VAGA} ${CONTORNO} ${display} items-center justify-center bg-estrelinha-surface text-[11px] font-medium leading-none text-estrelinha-ink-soft`}
  >
    +{restam}
  </span>
)

interface Props {
  product: GridProduct
  selected: OptionValues
  onPick: (thumb: ColorThumb, e: React.MouseEvent) => void
}

const ColorPreview = ({ product, selected, onPick }: Props) => {
  // Uma leitura por faixa, porque a quantidade de vagas é decisão de LARGURA e quem responde por
  // largura é o CSS. Medir com `useIsMobile`/ResizeObserver faria a fileira nascer com o arranjo
  // errado e se corrigir depois da hidratação, na tela mais repetida da loja.
  const porFaixa = COLOR_SLOT_TIERS.map(t => colorPreview(product, selected, t.slots))
  const maior = colorPreview(product, selected, COLOR_SLOTS_MAX)
  if (!maior || porFaixa.some(f => !f)) return null

  return (
    <div
      role="group"
      aria-label="Cores disponíveis"
      // `hidden @[162px]:flex`: abaixo de 162px de card nem duas miniaturas cabem ao lado do "+",
      // então a fileira não é exibida (`COR-16`).
      className="absolute bottom-3.5 left-3.5 z-10 hidden items-center gap-1.5 @[162px]:flex"
    >
      {maior.thumbs.map((thumb, i) => (
        <Miniatura
          key={thumb.value}
          thumb={thumb}
          onPick={onPick}
          // A vaga aparece na PRIMEIRA faixa que a mostra: as vagas de uma faixa são sempre um
          // prefixo das da faixa seguinte, então basta esconder a cauda.
          display={MOSTRA_NA_FAIXA[porFaixa.findIndex(f => i < f.thumbs.length)] ?? ''}
        />
      ))}
      {porFaixa.map((faixa, i) =>
        faixa.overflow > 0 ? (
          <Contador key={`c${i}`} restam={faixa.overflow} display={CONTADOR_DA_FAIXA[i]} />
        ) : null,
      )}
    </div>
  )
}

export default ColorPreview
