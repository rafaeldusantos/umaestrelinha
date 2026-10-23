// A coluna Categorias da listagem de produtos. Peça com muitas categorias empurrava a linha para
// três, quatro linhas de nomes; agora a célula mostra as primeiras e termina em reticências, e o
// toque na célula abre a lista inteira. Popover, nunca Tooltip — o Tooltip do Radix não abre por
// toque, e o painel também é aberto no celular da dona.

import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'

export const CATEGORIES_VISIBLE = 2

interface CategoriesCellProps {
  names: string[]
  productName: string
}

const CategoriesCell = ({ names, productName }: CategoriesCellProps) => {
  if (names.length === 0) return <span className="text-muted-foreground">—</span>

  if (names.length <= CATEGORIES_VISIBLE) {
    return <span className="text-muted-foreground">{names.join(', ')}</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Ver as ${names.length} categorias de ${productName}`}
          className="-my-2 min-h-11 rounded-md py-2 text-left text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {names.slice(0, CATEGORIES_VISIBLE).join(', ')}
          <span aria-hidden="true" className="ml-0.5 font-semibold">…</span>
        </button>
      </PopoverTrigger>
      {/* `collisionPadding={16}` e o teto de largura: molde do ⓘ do Dashboard (`StoreMovement.tsx`),
          medido em 390 × 844 — sem eles o balão encosta na borda da tela. */}
      <PopoverContent
        align="start"
        collisionPadding={16}
        className="w-[min(18rem,calc(100vw-32px))] p-3 text-sm motion-reduce:animate-none"
      >
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {names.length} categorias
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {names.map(name => (
            <li key={name} className="rounded-full border bg-muted px-2 py-0.5 text-xs">
              {name}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export default CategoriesCell
