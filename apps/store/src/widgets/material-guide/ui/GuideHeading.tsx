import type { ReactNode } from 'react'

/**
 * O cabeçalho de uma seção do guia: versalete, título e a linha de apoio.
 *
 * **O versalete NÃO é ouro, e o artboard pede que seja.** `accent-strong` (#A07E4C) mede 3,55:1 sobre
 * o chão — passa como objeto gráfico, reprova como texto (4,5:1). É a mesma decisão que a `AboutPage`
 * já tomou na assinatura (`accentText.test.ts` registra o caso): o ouro fica no **fio** ao lado do
 * versalete, que é forma, e a palavra sai em `ink-soft`. Quem lê a página não perde nada; quem lê com
 * pouca luz, ganha.
 *
 * `escuro` inverte a paleta para a faixa `primary` — não há variante intermediária de propósito, para
 * não existir um terceiro par de cores que ninguém mediu.
 */
interface GuideHeadingProps {
  id?: string
  versalete: string
  titulo: ReactNode
  apoio?: ReactNode
  /** Sobre a faixa `primary`. */
  escuro?: boolean
  /** No desktop, o apoio vai à direita do título em vez de embaixo — como nos boards. */
  apoioAoLado?: boolean
  className?: string
}

const GuideHeading = ({
  id,
  versalete,
  titulo,
  apoio,
  escuro = false,
  apoioAoLado = false,
  className = '',
}: GuideHeadingProps) => {
  const fio = escuro ? 'bg-estrelinha-accent' : 'bg-estrelinha-accent-strong'
  const rotulo = escuro ? 'text-estrelinha-serenity' : 'text-estrelinha-ink-soft'
  const titulos = escuro ? 'text-estrelinha-on-primary' : 'text-estrelinha-ink'
  const corpo = escuro ? 'text-estrelinha-serenity' : 'text-estrelinha-ink-soft'

  const bloco = (
    <div className="flex flex-col gap-2 md:gap-3.5">
      <p className="flex items-center gap-2.5">
        <span className={`h-px w-6 shrink-0 md:w-7 ${fio}`} aria-hidden />
        <span className={`text-[12px] font-semibold uppercase tracking-[0.18em] md:text-[13px] ${rotulo}`}>
          {versalete}
        </span>
      </p>
      <h2
        id={id}
        className={`font-display text-[26px] font-normal leading-9 tracking-[-0.02em] md:text-[34px] md:leading-[44px] ${titulos}`}
      >
        {titulo}
      </h2>
    </div>
  )

  if (!apoio) return <div className={className}>{bloco}</div>

  return (
    <div
      className={
        apoioAoLado
          ? `flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-12 ${className}`
          : `flex flex-col gap-4 ${className}`
      }
    >
      {bloco}
      <p
        className={`text-[15px] font-light leading-[26px] md:text-[17px] md:leading-7 ${corpo} ${
          apoioAoLado ? 'md:max-w-[360px] md:text-right' : 'max-w-[620px]'
        }`}
      >
        {apoio}
      </p>
    </div>
  )
}

export default GuideHeading
