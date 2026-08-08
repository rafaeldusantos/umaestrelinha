import { motion } from 'framer-motion'
import type { Product, OptionValues } from '@estrelinha/supabase/types'
import { formatPrice } from '@estrelinha/core/formatters'
import { CARD_MAX_AXES, canAddSelection } from '../lib/variantSelection'
import VariantPicker from './VariantPicker'

interface Props {
  product: Product
  selected: OptionValues
  onChange: (values: OptionValues) => void
  onConfirm: () => void
  onDismiss: () => void
  /** Preço da linha escolhida — cai no `price` da vitrine quando a combinação não existe. */
  price: number
}

/**
 * Quick add de variações **dentro do card**, no desktop (board "Desktop Category — Quick add com
 * variações").
 *
 * Sobe de baixo para cima por cima da imagem, com véu sobre a faixa que sobra. Só existe a partir
 * de `md`: numa tile de 167px o mesmo desenho entregaria pílula de 30px, abaixo do piso de 44px da
 * loja — no mobile quem abre é o `VariantSheet`.
 *
 * A altura é do conteúdo, não os 224/260 do board: lá o card é 290×260 e aqui a imagem é
 * `aspect-square`. Fixar a proporção do board exigiria mudar o card de toda a loja.
 */
const QuickAddDrawer = ({ product, selected, onChange, onConfirm, onDismiss, price }: Props) => {
  const canAdd = canAddSelection(product, selected)

  return (
    <div
      className="absolute inset-0 z-20"
      // O card inteiro é um <Link>: sem isto, escolher um tamanho navega para a página do produto.
      onClick={e => {
        e.preventDefault()
        e.stopPropagation()
      }}
    >
      <button
        type="button"
        aria-label="Fechar seleção de variações"
        onClick={onDismiss}
        className="absolute inset-0 cursor-default bg-nanita-ink/[0.38]"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 38 }}
        // `rounded-xl` e não os 18px do board: o raio tem de ser o MESMO do palco do card, senão a
        // curva do drawer desencontra da curva da imagem e sobra uma lasca de fundo no canto.
        className="absolute inset-x-0 bottom-0 flex flex-col rounded-xl bg-white px-5 pb-4 pt-3"
      >
        <span aria-hidden className="mx-auto mb-2.5 h-1 w-9 shrink-0 rounded-pill bg-nanita-border" />

        <VariantPicker
          product={product}
          max={CARD_MAX_AXES}
          selected={selected}
          onChange={onChange}
          surface="card"
        />

        <button
          type="button"
          disabled={!canAdd}
          onClick={onConfirm}
          className="mt-3.5 flex h-11 w-full items-center justify-center rounded-button bg-nanita-jam font-display text-[15px] font-semibold tracking-[-0.01em] text-white transition-colors hover:bg-nanita-jam/90 disabled:bg-nanita-plum/40"
        >
          {canAdd ? `Adicionar · ${formatPrice(price)}` : 'Indisponível'}
        </button>
      </motion.div>
    </div>
  )
}

export default QuickAddDrawer
