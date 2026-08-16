import { Link } from 'react-router-dom'
import { PackageOpen } from 'lucide-react'
import {
  materialAnchor,
  materialKindsOf,
  materialKindLabel,
  materialSummary,
  requiresMaterial,
} from '@estrelinha/core/material'
import { MATERIAL_GUIDE_PATH, materialGuideHref } from '@estrelinha/core/routes'
import type { Product } from '@estrelinha/supabase/types'
import { TAP_ROW } from '@/shared/lib/touchTarget'

interface Props {
  product: Product
  /** `bar` é a versão de uma linha, para a barra fixa do mobile. */
  variant?: 'page' | 'bar'
}

/**
 * O aviso de que esta peça exige material da cliente (`MAT-02`).
 *
 * **Três situações, e a distinção entre elas é a feature:**
 *
 * | situação | o que aparece |
 * | --- | --- |
 * | não exige | **nada** — a compra segue idêntica ao que era antes |
 * | exige e diz quais | os materiais, cada um levando à ficha dele |
 * | exige sem dizer qual | "o material é combinado com a gente" — e a compra segue sem passo extra |
 *
 * A loja **nunca** pede que a cliente escolha o material, nem na terceira linha. O produto já
 * determina: medido no catálogo real, **zero** das 3.356 variações tem eixo de material, e existe
 * peça que exige **dois** ("Árvore da Vida com Cabelo e Coto Umbilical") — ali "escolha o material"
 * não é incompleto, é errado.
 *
 * O link vai para a **ficha correspondente** (`/como-enviar-seu-material-de-dna#cinzas`), não para o
 * topo da página: preparar leite materno não é preparar cinzas não é preparar cabelo. O endereço sai
 * de `@estrelinha/core/routes`, e não escrito aqui — a feature 31 já o mudou uma vez.
 */
const MaterialNotice = ({ product, variant = 'page' }: Props) => {
  const exige = requiresMaterial(product)
  if (!exige) return null

  const kinds = materialKindsOf(product)
  const resumo = materialSummary(true, kinds)

  if (variant === 'bar') {
    return (
      <p className="flex items-center gap-1.5 text-[12px] leading-4 text-estrelinha-ink-soft">
        <PackageOpen className="h-3.5 w-3.5 shrink-0 text-estrelinha-primary" aria-hidden />
        {/* Uma linha só, e truncada: na barra fixa o texto que embrulha em duas linhas empurra o
            CTA para fora — é o primeiro item da lista do que quebra no celular. */}
        <span className="truncate">
          {kinds.length > 0 ? `Você envia: ${resumo}` : 'Material combinado com a gente'}
        </span>
      </p>
    )
  }

  return (
    <div className="mt-5 rounded-md border border-estrelinha-field bg-estrelinha-ground-deep p-4">
      <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-estrelinha-ink">
        <PackageOpen className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
        Esta joia é feita com material seu
      </p>

      {kinds.length > 0 ? (
        <>
          <p className="mt-2 text-[14px] leading-[22px] text-estrelinha-ink-soft">
            Depois da compra, você envia pelo correio:
          </p>
          {/* `flex-wrap`: com dois ou três materiais, uma linha só estouraria os 390px. */}
          <ul className="mt-2 flex flex-wrap gap-2">
            {kinds.map(kind => (
              <li key={kind}>
                <Link
                  to={materialGuideHref(materialAnchor(kind))}
                  className={`${TAP_ROW} rounded-pill border border-estrelinha-field bg-white px-3 py-1 text-[13px] font-medium leading-5 text-estrelinha-ink transition-colors hover:border-estrelinha-primary`}
                >
                  {materialKindLabel(kind)}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13px] leading-[20px] text-estrelinha-ink-soft">
            Toque em cada um para ver quanto enviar e como preparar.
          </p>
        </>
      ) : (
        <p className="mt-2 text-[14px] leading-[22px] text-estrelinha-ink-soft">
          O material desta peça é combinado com a gente depois da compra — a gente entra em contato
          para acertar o que enviar. Você pode seguir com o pedido normalmente.
        </p>
      )}

      <Link
        to={MATERIAL_GUIDE_PATH}
        className={`${TAP_ROW} mt-3 font-semibold text-estrelinha-primary hover:underline`}
      >
        Como enviar o material
      </Link>
    </div>
  )
}

export default MaterialNotice
