import { cn } from '@estrelinha/ui/lib/utils'

/**
 * O que um bloco da Início sabe de uma leitura (feature `73`, `MAI-17`, `MAI-30`). Três estados, e só
 * três: com DADO (o número, mesmo que uma releitura esteja no ar ou tenha falhado — `MAI-18`), em
 * FALHA sem dado (a frase e "Tentar de novo", nunca um zero), e CARREGANDO (o esqueleto). Quem monta
 * é a página, a partir da query; o bloco não conhece o React Query.
 */
export interface Leitura<T> {
  dado: T | undefined
  /** A leitura falhou e não há dado nenhum para mostrar. */
  falhou: boolean
  tentarDeNovo: () => void
}

export const FALHA_DE_LEITURA = 'Não consegui carregar.'
export const TENTAR_DE_NOVO = 'Tentar de novo'

/** A falha de um bloco sem dado: a frase e a ação. Nenhum número. */
export const FalhaDoBloco = ({ tentarDeNovo, escuro = false }: { tentarDeNovo: () => void; escuro?: boolean }) => (
  <div className="space-y-3 py-2">
    <p className={cn('text-sm', escuro ? 'text-estrelinha-on-primary' : 'text-estrelinha-ink-soft')}>{FALHA_DE_LEITURA}</p>
    <button
      type="button"
      onClick={tentarDeNovo}
      className={cn(
        'min-h-12 rounded-sm px-4 text-sm font-medium',
        escuro
          ? 'bg-estrelinha-on-primary text-estrelinha-primary-strong'
          : 'border border-estrelinha-primary bg-estrelinha-surface text-estrelinha-primary',
      )}
    >
      {TENTAR_DE_NOVO}
    </button>
  </div>
)

/** Um traço de esqueleto no lugar de um número. Parado com movimento reduzido (`MAI-31`). */
export const Traco = ({ className, escuro = false }: { className?: string; escuro?: boolean }) => (
  <span
    aria-hidden="true"
    className={cn(
      'block animate-pulse rounded-sm motion-reduce:animate-none',
      escuro ? 'bg-estrelinha-on-primary/20' : 'bg-estrelinha-ground-deep',
      className,
    )}
  />
)
