import type { ReactNode } from 'react'
import { FalhaDoBloco, Traco } from '@/shared/ui/leitura'

/**
 * A moldura de um bloco do detalhe do pedido (feature `74`, `MAP-22`..`MAP-30`, `MAP-44`): um cartão
 * com o título (`h2`) e o conteúdo. Só apresentação — os blocos decidem o que desenhar a partir de
 * `core`; aqui mora a forma do cartão, uma vez.
 */
export const BlocoDoDetalhe = ({ id, titulo, children }: { id: string; titulo: ReactNode; children: ReactNode }) => (
  <section
    aria-labelledby={`bloco-${id}`}
    data-bloco={id}
    className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4"
  >
    {/* O rótulo do protótipo: 11 px, caixa alta por CSS (o texto do `h2` continua "Cliente", "3 joias"). */}
    <h2
      id={`bloco-${id}`}
      className="font-body text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft [overflow-wrap:anywhere]"
    >
      {titulo}
    </h2>
    <div className="mt-2">{children}</div>
  </section>
)

/** Um bloco cuja leitura falhou (`MAP-30`): o título, a frase e "Tentar de novo" — o resto da tela segue. */
export const BlocoEmFalha = ({ id, titulo, tentarDeNovo }: { id: string; titulo: string; tentarDeNovo: () => void }) => (
  <BlocoDoDetalhe id={id} titulo={titulo}>
    <FalhaDoBloco tentarDeNovo={tentarDeNovo} />
  </BlocoDoDetalhe>
)

/**
 * O esqueleto de um bloco enquanto a primeira leitura está no ar (`MAP-44`): `aria-busy` e traços,
 * parados com movimento reduzido (`Traco`, `MAP-45`). Nenhum texto que afirme conteúdo.
 */
export const EsqueletoDoBloco = ({ linhas = 2 }: { linhas?: number }) => (
  <div
    aria-busy="true"
    data-testid="esqueleto-do-bloco"
    className="space-y-2 rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4"
  >
    <Traco className="h-5 w-1/3" />
    {Array.from({ length: linhas }, (_, i) => (
      <Traco key={i} className="h-4 w-full" />
    ))}
  </div>
)
