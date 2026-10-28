// As categorias da peça, em chips logo abaixo do nome na coluna Produto. Peça com muitas categorias
// empurrava a linha para três, quatro linhas de nomes; agora aparecem as primeiras e um chip "+N",
// e o toque nele abre a lista inteira. Popover, nunca Tooltip — o Tooltip do Radix não abre por
// toque, e o painel também é aberto no celular da dona.

import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'

export const CATEGORIES_VISIBLE = 2

const CHIP = 'rounded-full border bg-card px-2.5 py-0.5 text-xs text-foreground'

interface CategoriesCellProps {
  names: string[]
  productName: string
}

const CategoriesCell = ({ names, productName }: CategoriesCellProps) => {
  if (names.length === 0) return null

  const extra = names.length - CATEGORIES_VISIBLE

  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {names.slice(0, CATEGORIES_VISIBLE).map(name => (
        <li key={name} className={CHIP}>{name}</li>
      ))}
      {extra > 0 && (
        <li className="contents">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Ver as ${names.length} categorias de ${productName}`}
                className={`${CHIP} relative text-muted-foreground before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                +{extra}
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
        </li>
      )}
    </ul>
  )
}

export default CategoriesCell
