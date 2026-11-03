// As duas abas do menu Compre Junto: Listas (o índice) e Adesão (o relatório). São rotas, como a aba
// "Montados" de Pedidos: o endereço diz qual aba está aberta, e o voltar do navegador funciona.

import { NavLink } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'

export const BUY_TOGETHER_PATH = '/admin/compre-junto'
export const BUY_TOGETHER_ADOPTION_PATH = '/admin/compre-junto/adesao'

const ABAS = [
  { to: BUY_TOGETHER_PATH, rotulo: 'Listas' },
  { to: BUY_TOGETHER_ADOPTION_PATH, rotulo: 'Adesão' },
] as const

export interface BuyTogetherTabsProps {
  /** Quantas listas existem. Ausente enquanto a leitura não terminou ou se ela falhou: a aba não afirma um 0 que não sabe. */
  listas?: number
}

const BuyTogetherTabs = ({ listas }: BuyTogetherTabsProps) => (
  <nav aria-label="Compre Junto" className="mb-6 flex gap-1 border-b border-border">
    {ABAS.map(aba => (
      <NavLink
        key={aba.to}
        to={aba.to}
        end
        className={({ isActive }) =>
          cn(
            '-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-4 text-sm font-medium transition-colors motion-reduce:transition-none',
            isActive ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
          )
        }
      >
        {aba.rotulo}
        {aba.to === BUY_TOGETHER_PATH && listas !== undefined && (
          <>
            {' '}
            <span className="text-xs tabular-nums opacity-70">{listas}</span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
)

export default BuyTogetherTabs
