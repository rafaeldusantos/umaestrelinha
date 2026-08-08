import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@nanapin/ui/lib/utils'

/**
 * O botão da loja — identidade papelaria (artboards 22 e 23).
 *
 * **A loja tem o próprio botão em vez de usar o do shadcn por um motivo
 * mecânico**, não estético. O `<Button>` de `@nanapin/ui` carrega `rounded-md`
 * na base da `cva` dele, e `packages/ui` é compartilhado com o backoffice —
 * não pode ser editado. Passar `className="rounded-button"` por cima não
 * resolve: o `tailwind-merge` classifica `rounded-*` por sufixos conhecidos
 * (t-shirt sizes, `none`, `full`, arbitrários) e **não colapsa** um token
 * custom — `twMerge('rounded-md', 'rounded-button')` devolve os dois, e quem
 * vence passa a depender da ordem de geração do CSS. Aqui o raio está na base
 * da nossa `cva`, então não há conflito para ninguém resolver.
 *
 * **Ação é 14px, não pílula.** A v1 usava pílula para botão, badge, chip e
 * campo de busca — quatro coisas com a mesma forma. Pílula agora é rótulo; o
 * disco (`rounded-full`) segue sendo a assinatura da marca e por isso é a
 * variante `disc`, não uma exceção solta.
 *
 * **A cor não é escolha livre** (prancha 20b): Carmim é "todo o dinheiro da
 * tela" e por isso é o primário; Carimbo é o CTA de dentro da faixa Grafite,
 * porque Carmim sobre Grafite lê a 2,18:1 e some.
 */
const buttonVariants = cva(
  [
    // `border-2 border-transparent` em TODAS as variantes: assim `secondary`
    // só troca a cor da borda e as duas mantêm exatamente a mesma altura.
    // Sem isso, um contorno ao lado de um sólido fica 4px mais alto.
    'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-button border-2 border-transparent',
    'font-display font-semibold leading-none',
    'transition-[opacity,transform,background-color] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nanita-jam focus-visible:ring-offset-2 focus-visible:ring-offset-nanita-paper',
    'disabled:pointer-events-none disabled:opacity-55',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** A ação principal. Uma por tela (DESIGN.md §8). */
        primary: 'bg-nanita-jam text-white hover:opacity-90',
        /** Alternativa ao primário — contorno, nunca um segundo sólido. */
        secondary: 'border-nanita-ink text-nanita-ink hover:bg-nanita-ink/[0.06]',
        /** Dentro de superfície Grafite. Carimbo sobre Grafite lê a 5,22:1. */
        onInk: 'bg-nanita-glaze text-nanita-ink hover:opacity-90',
        /** Sobre superfície Carimbo (newsletter): o escuro é que contrasta. */
        inkSolid: 'bg-nanita-ink text-white hover:opacity-90',
        /** Ação terciária — sem peso de superfície. */
        ghost: 'text-nanita-ink hover:bg-nanita-ink/[0.06]',
      },
      size: {
        sm: 'px-5 py-3 text-[14px]',
        md: 'px-6 py-3.5 text-[15px]',
        lg: 'px-[30px] py-[17px] text-[17px]',
      },
      /** Ocupa a largura do container — CTA de celular, tier de kit. */
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Renderiza o filho no lugar do `<button>` — para `<Link>` que age como botão. */
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
    )
  },
)
Button.displayName = 'Button'

// `buttonVariants` fica interno de propósito: exportá-lo junto do componente
// dispara `react-refresh/only-export-components`, e ninguém precisa das classes
// soltas — quem quiser a forma usa o componente.
export { Button }
export default Button
