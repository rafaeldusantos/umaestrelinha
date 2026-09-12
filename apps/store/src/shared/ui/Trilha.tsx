import { Link } from 'react-router-dom'
import { TAP_ROW } from '@/shared/lib/touchTarget'

/**
 * A trilha de navegação — `Início › <página atual>`.
 *
 * **Ela nasceu dentro de `AboutPage` na feature 29**, com o comentário que também escreveu a
 * condição da mudança de casa: *"componente compartilhado com um consumidor só é abstração antes da
 * hora; quando a segunda página pedir trilha, ela sobe com as duas necessidades na mesa"*. A feature
 * 45 trouxe duas páginas de política, e são três consumidores — a condição foi atingida (`POL-21`).
 *
 * **O DOM é o mesmo de antes, caractere por caractere**, e isso é a prova do movimento:
 * `AboutPage.test.tsx` mede esta trilha por papel e nome acessível (`navigation` chamada "Trilha de
 * navegação", o link `Início`, o `aria-current="page"`) e passou **sem uma linha de edição**. Uma
 * extração que precisasse mexer no teste da página de origem não seria extração; seria redesenho com
 * outro nome.
 *
 * `TAP_ROW`, e não `TAP_44`: é texto em fluxo, e um quadrado de 44 centrado num rótulo de 40px
 * deixaria as pontas fora do alvo (`CLAUDE.md`).
 */
const Trilha = ({
  paginaAtual,
  className = '',
}: {
  /** O rótulo do último degrau — a página em que a leitora está. */
  paginaAtual: string
  /** A coluna da página hospedeira. A Sobre usa 1240; as políticas, a mesma. */
  className?: string
}) => (
  <nav
    aria-label="Trilha de navegação"
    className="border-b border-estrelinha-line bg-estrelinha-ground"
  >
    <ol
      className={`mx-auto flex w-full max-w-[1240px] items-center gap-2 px-5 py-3.5 md:py-[18px] ${className}`}
    >
      <li>
        <Link
          to="/"
          className={`${TAP_ROW} text-[13px] font-light leading-4 text-estrelinha-ink-soft hover:text-estrelinha-primary md:text-sm`}
        >
          Início
        </Link>
      </li>
      <li aria-hidden className="flex items-center">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-estrelinha-line" fill="none">
          <path
            d="M9 5l7 7-7 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </li>
      <li
        aria-current="page"
        className="text-[13px] font-medium leading-4 text-estrelinha-primary md:text-sm"
      >
        {paginaAtual}
      </li>
    </ol>
  </nav>
)

export default Trilha
