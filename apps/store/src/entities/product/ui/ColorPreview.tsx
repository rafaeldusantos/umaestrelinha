import type { OptionValues } from '@estrelinha/supabase/types'
import {
  COLOR_SLOTS_DESKTOP,
  COLOR_SLOTS_MOBILE,
  colorPreview,
  type ColorThumb,
  type GridProduct,
} from '../lib/variantSelection'

/**
 * A placa de cores do card — `COR-10`..`COR-15`, board `7CF-0`.
 *
 * É **preview**, não seletor: mostra em que cores a peça existe e, ao ser clicada, abre o MESMO
 * caminho do botão "+" (`QuickAddDrawer` no desktop, `VariantSheet` no celular). Por isso ela é
 * **um único controle** e as miniaturas são `<span>`/`<img>`, nunca botões — três razões
 * independentes, e a terceira é um guarda deste repositório:
 *
 * 1. a miniatura mede 32px e o passo entre elas é 38px; dar `TAP_44` a cada uma criaria alvos de
 *    44px **sobrepostos**, e um toque na fronteira acertaria a vizinha;
 * 2. `touchTarget.test.ts` varre `<button|a|Link>` com `h-8 w-8` e exige o auxiliar — miniatura
 *    como botão ou quebra o guarda ou o satisfaz criando a sobreposição de (1);
 * 3. o seletor de variação já existe em duas superfícies, e um terceiro lugar que escolhe cor seria
 *    a terceira escrita da mesma regra.
 *
 * A placa em si é o alvo: `h-11` são os 44px que o `CLAUDE.md` exige, e ela é larga.
 */

/** A vaga: 32×32 com raio 6px (`COR-13`). `shrink-0` porque a placa não encolhe miniatura. */
const VAGA = 'h-8 w-8 shrink-0 overflow-hidden rounded-sm'

/** Contorno da vaga — `field` (#8C8073, 3,63:1) para a foto clara não sumir dentro da placa branca. */
const CONTORNO = 'border border-estrelinha-field'

const Miniatura = ({ thumb, display }: { thumb: ColorThumb; display: string }) => (
  <span
    className={[
      VAGA,
      display,
      // COR-14: a escolhida engrossa para 2px em `ink`. O contorno de 2px come 1px de foto de cada
      // lado e o quadrado externo continua 32 — é o que mantém a conta de largura da placa.
      thumb.active ? 'border-2 border-estrelinha-ink' : CONTORNO,
      thumb.imageUrl ? '' : 'bg-estrelinha-ground-deep',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {/*
      COR-15: cor sem foto é o palco vazio, e não um `<img>` sem `src` — o navegador desenharia
      ícone de imagem quebrada. Nem a foto de outra cor: três cores com a mesma imagem dizem à
      cliente que a cor não muda a peça.
    */}
    {thumb.imageUrl && (
      <img src={thumb.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
    )}
  </span>
)

const Contador = ({ restam, display }: { restam: number; display: string }) => (
  <span
    className={`${VAGA} ${CONTORNO} ${display} items-center justify-center bg-estrelinha-ground-deep text-[11px] font-medium leading-none text-estrelinha-ink-soft`}
  >
    +{restam}
  </span>
)

interface Props {
  product: GridProduct
  selected: OptionValues
  /** O MESMO handler do "+". Um segundo caminho seria uma terceira superfície de escolha. */
  onOpen: (e: React.MouseEvent) => void
}

const ColorPreview = ({ product, selected, onOpen }: Props) => {
  // Duas leituras da mesma regra, porque a quantidade de vagas é decisão de LARGURA e quem responde
  // por largura é o CSS. Trocar isso por `useIsMobile` faria a placa nascer com o arranjo errado e
  // se corrigir depois da hidratação, na tela mais repetida da loja.
  const celular = colorPreview(product, selected, COLOR_SLOTS_MOBILE)
  const desktop = colorPreview(product, selected, COLOR_SLOTS_DESKTOP)
  if (!celular || !desktop) return null

  // As vagas do celular são sempre um PREFIXO das do desktop, então basta esconder a cauda abaixo
  // de `md` em vez de desenhar a placa duas vezes.
  const visiveisNoCelular = celular.thumbs.length

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Escolher a cor"
      // `COR-13`: inset de 14px, altura 44px, padding e gap de 6px, raio 12px e contorno `field` —
      // a placa é branca e cai sobre palco branco na seção de decorativos, onde some sem borda.
      className="absolute bottom-3.5 left-3.5 z-10 flex h-11 items-center gap-1.5 rounded-md border border-estrelinha-field bg-estrelinha-surface p-1.5"
    >
      {desktop.thumbs.map((thumb, i) => (
        <Miniatura
          key={thumb.value}
          thumb={thumb}
          display={i < visiveisNoCelular ? 'block' : 'hidden md:block'}
        />
      ))}
      {desktop.overflow > 0 && <Contador restam={desktop.overflow} display="hidden md:flex" />}
      {celular.overflow > 0 && <Contador restam={celular.overflow} display="flex md:hidden" />}
    </button>
  )
}

export default ColorPreview
