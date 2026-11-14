import { useRef, useState, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'
import { cn } from '@estrelinha/ui/lib/utils'

import { TAP_44 } from '@/shared/lib/touchTarget'

type Boundary = Element | null | Array<Element | null>

export interface InfoTipProps {
  /** O nome do botão para o leitor de tela (ex.: "Sobre o frete grátis"). */
  label: string
  /** O conteúdo do balão: texto ou nó. */
  children: ReactNode
  /** Classes a mais no botão. */
  className?: string
  /** A caixa que o balão não pode ultrapassar (ex.: a gaveta onde ele mora). */
  collisionBoundary?: Boundary
}

/**
 * O ⓘ: um disco de 17px com balão informativo.
 *
 * Abre de quatro jeitos e fecha de quatro, e cada gesto tem a sua regra:
 * - o mouse que **passa** por cima abre, e ao sair fecha — a não ser que tenha **clicado**, e aí o
 *   balão fica até Esc, um clique fora ou um novo clique;
 * - o **toque** alterna (o dedo não tem "passar por cima");
 * - o **foco pelo teclado** abre, e perder o foco fecha;
 * - Esc e o clique fora são do Radix.
 *
 * O foco que vem junto de um clique ou toque não abre sozinho: no celular a sequência é
 * `pointerdown → focus → click`, e abrir no foco faria o clique logo depois fechar o que acabou de
 * abrir. Por isso o `pointerdown` marca que o próximo foco é de ponteiro.
 *
 * O Popover abre sem mover o foco para dentro (`onOpenAutoFocus`) e fecha sem devolvê-lo ao botão
 * (`onCloseAutoFocus`): o balão não tem nada focável, e o foco devolvido depois de o mouse sair
 * reabriria o balão pelo próprio `onFocus`.
 *
 * O alvo de toque de 44px é o pseudo-elemento de `TAP_44`; o desenho continua com 17px.
 *
 * O balão vai de borda a borda da caixa de colisão (a gaveta, quando ela é passada; senão a tela),
 * a 12px de cada lado: a largura é a disponível que o Radix calcula — a da caixa menos o
 * `collisionPadding` dos dois lados, porque o `shift` dele está ligado no eixo principal — e o
 * `shift` o encosta a 12px da borda. Não depende de onde o ⓘ está na linha.
 */
const InfoTip = ({ label, children, className, collisionBoundary }: InfoTipProps) => {
  const [aberto, setAberto] = useState(false)
  const fixado = useRef(false)
  const ponteiroNoFoco = useRef(false)
  const tipoDoPonteiro = useRef<string>('')

  const fechar = () => {
    fixado.current = false
    setAberto(false)
  }

  return (
    <Popover
      open={aberto}
      onOpenChange={proximo => {
        if (proximo) setAberto(true)
        else fechar()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            TAP_44,
            'ml-1.5 inline-flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-current align-middle text-[10.5px] font-bold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-estrelinha-primary',
            className,
          )}
          onPointerEnter={e => {
            if (e.pointerType === 'mouse') setAberto(true)
          }}
          onPointerLeave={e => {
            if (e.pointerType === 'mouse' && !fixado.current) setAberto(false)
          }}
          onPointerDown={e => {
            ponteiroNoFoco.current = true
            tipoDoPonteiro.current = e.pointerType
          }}
          onFocus={() => {
            if (ponteiroNoFoco.current) return
            setAberto(true)
          }}
          onBlur={() => {
            ponteiroNoFoco.current = false
            fechar()
          }}
          onClick={e => {
            // O clique é decidido aqui, não pelo alternador do Radix.
            e.preventDefault()
            const tipo = tipoDoPonteiro.current
            ponteiroNoFoco.current = false
            tipoDoPonteiro.current = ''
            if (tipo === 'mouse') {
              // O mouse já abriu ao passar; o clique fixa. Clicar de novo com ele fixado fecha.
              if (fixado.current && aberto) fechar()
              else {
                fixado.current = true
                setAberto(true)
              }
              return
            }
            // Toque, caneta ou Enter/Espaço no teclado: alterna.
            if (aberto) fechar()
            else setAberto(true)
          }}
        >
          <span aria-hidden="true">i</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        role="tooltip"
        collisionPadding={12}
        collisionBoundary={collisionBoundary}
        onOpenAutoFocus={e => e.preventDefault()}
        onCloseAutoFocus={e => e.preventDefault()}
        className="w-[var(--radix-popper-available-width)] rounded-md border-0 bg-estrelinha-ink px-3 py-2.5 text-[12.5px] font-normal leading-[18px] text-estrelinha-on-primary shadow-estrelinha-ink duration-150 data-[state=open]:![--tw-enter-scale:1] data-[state=open]:![--tw-enter-translate-y:4px] motion-reduce:!animate-none"
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}

export default InfoTip
