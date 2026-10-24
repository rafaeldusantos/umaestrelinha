import { NavLink } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import { CLASSE_DA_BARRA } from '@/shared/ui/alturas'
import { TABS, type Tab } from '../model/tabs'
import { nomeDaAbaComSelo, textoDoSelo } from '../model/selo'

/**
 * A barra inferior das quatro abas (feature 72, `MAF-14`/`MAF-15`).
 *
 * - Rótulo SEMPRE visível: ícone sozinho obriga a adivinhar.
 * - Alvo de `min-h-12` (48 px) em cada aba, na largura de um quarto da tela.
 * - `env(safe-area-inset-bottom)` no padding: com a navegação por gestos do Android, nada clicável
 *   fica embaixo da barra do sistema.
 * - A aba atual é marcada pelo `NavLink` (`aria-current="page"`). O `to="/"` do react-router v6 só
 *   casa a raiz exata (o `end` é implícito ali), então a Início não fica marcada nas outras abas.
 * - O fio de cima é SOMBRA, não `border-t`: borda soma 1 px à altura, e a reserva do layout
 *   (4rem + inset) passaria a ficar 1 px curta — medido em navegador, o rodapé entrava 1 px sob a
 *   barra. Sombra não ocupa caixa.
 * - O voltar do Android é o do navegador (`MAF-17`): a barra não intercepta histórico nenhum.
 * - **O selo** (feature `74`, `MAP-31`..`MAP-33`): `selos` traz o número de cada aba (hoje só
 *   Pedidos, com `fila.precisa_acao`), ou `null` quando não há leitura boa — e aí não há selo. O selo
 *   é `aria-hidden` e `absolute` sobre o ícone: não muda o alvo nem o rótulo visível. Quem ouve a
 *   barra recebe o número no nome do link ("Pedidos, 5 precisam de você"). A barra continua só
 *   desenhando: o número vem do layout.
 */
/** A altura da barra vem do dono das alturas do pé da tela (`shared/ui/alturas`, feature `75`). */
export const TAB_BAR_HEIGHT = CLASSE_DA_BARRA

export type SelosDasAbas = Partial<Record<Tab['path'], number | null>>

const TabBar = ({ selos = {} }: { selos?: SelosDasAbas }) => (
  <nav
    aria-label="Áreas do ateliê"
    className="fixed inset-x-0 bottom-0 z-40 bg-estrelinha-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_0_theme(colors.estrelinha.line)]"
  >
    <ul className={cn('mx-auto grid max-w-lg grid-cols-4', TAB_BAR_HEIGHT)}>
      {TABS.map(({ path, label, icon: Icon }) => {
        const selo = textoDoSelo(selos[path])
        return (
        <li key={path} className="flex">
          <NavLink
            to={path}
            aria-label={selo ? nomeDaAbaComSelo(label, selos[path]) : undefined}
            className={({ isActive }) =>
              cn(
                'flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium',
                isActive ? 'text-estrelinha-primary' : 'text-estrelinha-ink-soft',
              )
            }
          >
            <span className="relative">
              <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
              {selo && (
                <span
                  aria-hidden="true"
                  data-testid="selo-da-aba"
                  className="absolute -right-2.5 -top-1.5 min-w-4 rounded-pill bg-estrelinha-alert px-1 text-center text-[10px] font-semibold leading-4 text-estrelinha-on-primary"
                >
                  {selo}
                </span>
              )}
            </span>
            <span>{label}</span>
          </NavLink>
        </li>
        )
      })}
    </ul>
  </nav>
)

export default TabBar
