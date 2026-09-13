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
/**
 * A coluna das páginas institucionais — a mesma lane que a trilha, o título e o corpo dividem.
 *
 * **Ela mora aqui porque a trilha é o único componente que as três páginas já compartilham**, e
 * porque o número só tem sentido em relação a ela: escrita de novo na página, a trilha e o título
 * passam a começar em colunas diferentes — 120px contra 96px numa viewport de 1440, se a página
 * usar o `container` do preset (1280/1rem) em vez desta medida. E nada acusa: build, `tsc` e teste
 * de componente seguem verdes com as duas lanes divergindo, porque jsdom devolve 0 para toda medida
 * de layout. Quem vê o degrau é a cliente — o "defeito 01" na forma mais barata de evitar.
 *
 * 1240 com 20 de respiro = **1200 de conteúdo**, que é exatamente o `paddingInline: 120px` dos
 * artboards de 1440. No celular não há teto: 390 − 2×20 = 350.
 */
export const COLUNA_INSTITUCIONAL = 'mx-auto w-full max-w-[1240px] px-5'

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
      className={`${COLUNA_INSTITUCIONAL} flex items-center gap-2 py-3.5 md:py-[18px] ${className}`}
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
