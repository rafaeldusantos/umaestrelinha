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
                // O protótipo: ícone de 24, rótulo de 12 (600 na ativa), e um traço de 2 px no topo da aba
                // ativa — o traço é o que diz "você está aqui" além da cor.
                'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 text-xs',
                isActive ? 'font-semibold text-estrelinha-primary' : 'font-normal text-estrelinha-ink-soft',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span aria-hidden="true" data-testid="traco-da-aba" className="absolute inset-x-[30%] top-0 h-0.5 rounded-pill bg-estrelinha-primary" />
                )}
                <span className="relative flex">
                  <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.5} />
                  {selo && (
                    <span
                      aria-hidden="true"
                      data-testid="selo-da-aba"
                      className="absolute -right-2.5 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-pill border-2 border-estrelinha-surface bg-estrelinha-primary px-[5px] text-[11px] font-semibold leading-none text-estrelinha-on-primary"
                    >
                      {selo}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        </li>
        )
      })}
    </ul>
  </nav>
)

export default TabBar
