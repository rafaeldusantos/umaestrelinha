import type { ProductPurchase } from '../model/useProductPurchase'

interface Props {
  purchase: ProductPurchase
}

/** O `id` é fixo porque a barra de compra do mobile foca este campo quando o CTA é bloqueado. */
export const ENGRAVING_FIELD_ID = 'engraving-text'

/**
 * O campo de gravação (`MAT-03`).
 *
 * **Só existe quando a variação escolhida tem `Com gravação: Sim`.** O eixo já existe no catálogo —
 * 35 produtos, 626 variações — e **precifica**: 33 dos 35 cobram a mais, por `product_variants`.
 * Então aqui não há liga/desliga nem preço: só o texto e o teto que o cadastro daquele produto
 * declarou. Um pingente não comporta o que uma pulseira comporta.
 *
 * O componente mora em `entities/product` e lê o **mesmo** `purchase` que a coluna de informação e a
 * barra fixa dividem — não há um segundo estado de gravação em lugar nenhum.
 */
const EngravingField = ({ purchase }: Props) => {
  const { engraving, setEngraving, engravingEnabled, engravingLimit, engravingRefusal } = purchase
  if (!engravingEnabled) return null

  const usados = engraving.trim().length
  const excedeu = engravingRefusal !== null

  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          htmlFor={ENGRAVING_FIELD_ID}
          className="font-display text-[15px] font-semibold text-estrelinha-ink"
        >
          O que gravar
        </label>
        <span
          aria-live="polite"
          className={`text-[12px] font-medium ${excedeu ? 'text-estrelinha-primary' : 'text-estrelinha-ink-soft'}`}
        >
          {usados} / {engravingLimit}
        </span>
      </div>

      {/*
        Borda `field` (#8C8073, 3,63:1), NUNCA `line` (1,25:1, que é divisor): a WCAG 1.4.11 pede
        3:1 de contorno de controle, e `fieldBorder.test.ts` derruba a suíte se isto voltar.

        Sem `maxLength`: cortar em silêncio faria a cliente achar que gravou o nome inteiro. O
        contador mostra o excesso e o CTA fica bloqueado — ela decide o que tirar.
      */}
      <input
        id={ENGRAVING_FIELD_ID}
        type="text"
        value={engraving}
        onChange={e => setEngraving(e.target.value)}
        aria-invalid={excedeu}
        aria-describedby={excedeu ? `${ENGRAVING_FIELD_ID}-erro` : undefined}
        placeholder="Nome, data ou uma palavra"
        className={`mt-2 h-12 w-full rounded-sm border bg-white px-3 text-[15px] text-estrelinha-ink placeholder:text-estrelinha-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-estrelinha-primary/40 ${
          excedeu ? 'border-estrelinha-primary' : 'border-estrelinha-field'
        }`}
      />

      {excedeu ? (
        <p
          id={`${ENGRAVING_FIELD_ID}-erro`}
          className="mt-2 text-[13px] leading-[20px] text-estrelinha-primary"
        >
          {engravingRefusal}
        </p>
      ) : (
        <p className="mt-2 text-[13px] leading-[20px] text-estrelinha-ink-soft">
          Opcional. Deixe em branco se preferir a peça sem gravação.
        </p>
      )}
    </div>
  )
}

export default EngravingField
