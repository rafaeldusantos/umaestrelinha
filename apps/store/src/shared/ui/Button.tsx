import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@estrelinha/ui/lib/utils'

/**
 * O botão da loja — identidade Uma Estrelinha.
 *
 * **Este componente NÃO existe mais por causa do raio.** Até a feature 19 ele
 * existia para escapar de um conflito de `tailwind-merge`: o `<Button>` de
 * `@estrelinha/ui` traz `rounded-md` na base da `cva` dele, e a chave custom
 * `rounded-button` (14px) não colapsava contra ela — as duas classes chegavam
 * ao elemento e quem vencia dependia da ordem do CSS. A chave saiu na feature
 * 20: a ação da Uma Estrelinha é 6px, que é `rounded-sm`, e o merge colapsa
 * dois t-shirt sizes sozinho.
 *
 * O que ele carrega hoje, e o botão do pacote não tem, é o conjunto: as cinco
 * variantes de cor da paleta, os três tamanhos, o `block`, e o `min-h-11` que
 * garante o alvo de toque de 44px — regra de mobile do `CLAUDE.md`, onde 90%
 * do acesso é celular.
 *
 * **Ação é `rounded-sm`, não pílula.** Pílula é rótulo (badge, chip de tema,
 * tag, campo de busca) e o disco (`rounded-full`) é forma de ícone. A
 * separação vem da papelaria e sobreviveu à troca de identidade; só o valor da
 * ação mudou, de 14px para 6px.
 *
 * **A cor não é escolha livre.** Sobre claro a ação é `primary` com texto
 * `on-primary` (8,40:1). Dentro de superfície `ink` a ação é `accent` com
 * texto `ink` (4,78:1) — `accent` sobre claro mede 2,66:1 e nunca é texto.
 */
const buttonVariants = cva(
  [
    // `border-2 border-transparent` em TODAS as variantes: assim `secondary`
    // só troca a cor da borda e as duas mantêm exatamente a mesma altura.
    // Sem isso, um contorno ao lado de um sólido fica 4px mais alto.
    'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap',
    'rounded-sm border-2 border-transparent',
    'font-display font-semibold leading-none',
    'transition-[opacity,transform,background-color] duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estrelinha-primary focus-visible:ring-offset-2 focus-visible:ring-offset-estrelinha-ground',
    'disabled:pointer-events-none disabled:opacity-55',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** A ação principal. Uma por tela (DESIGN.md §8). 8,40:1. */
        primary: 'bg-estrelinha-primary text-estrelinha-on-primary hover:bg-estrelinha-primary-strong',
        /** Alternativa ao primário — contorno, nunca um segundo sólido. */
        secondary: 'border-estrelinha-ink text-estrelinha-ink hover:bg-estrelinha-ink/[0.06]',
        /** Dentro de superfície escura. `accent` sobre `ink` lê a 4,78:1. */
        onInk: 'bg-estrelinha-accent text-estrelinha-ink hover:opacity-90',
        /** Sobre superfície de acento: o escuro é que contrasta. */
        inkSolid: 'bg-estrelinha-ink text-estrelinha-on-primary hover:opacity-90',
        /** Ação terciária — sem peso de superfície. */
        ghost: 'text-estrelinha-ink hover:bg-estrelinha-ink/[0.06]',
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
