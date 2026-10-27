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

/**
 * A releitura falhou com dado na tela (`MAI-18`, `MAP-35`). Morava em `InicioPage.tsx` (feature `73`)
 * e subiu na `74`: a Início e as páginas de pedidos dizem a mesma frase, e duas escritas divergiriam.
 */
export const NAO_ATUALIZOU = 'Não consegui atualizar agora.'

/**
 * "Não consegui atualizar agora." — a releitura falhou com dado na tela (`MAI-18`, `MAP-35`). A Início,
 * a lista de pedidos, a de clientes e os dois detalhes desenham esta MESMA linha.
 *
 * **Sem "Atualizado às 14h32." desde 2026-10-26** (decisão do usuário): a hora da leitura saiu de
 * todas as telas. Com a releitura boa não se desenha nada; o aviso de falha fica, porque ele é o que
 * impede o número velho de passar por atual.
 */
export const LinhaDeFrescor = ({ naoAtualizou }: { naoAtualizou: boolean }) =>
  naoAtualizou ? (
    <p data-testid="frescor" role="status" className="text-xs font-medium text-estrelinha-ink">
      {NAO_ATUALIZOU}
    </p>
  ) : null

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
