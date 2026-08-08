import { LayoutDashboard, Package, Percent, Tags, Menu, ShoppingCart, ShoppingBag, Ticket, Users, Settings } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

/** `label: null` ⇒ grupo sem cabeçalho (o Dashboard, sozinho no topo). */
export interface NavGroup {
  label: string | null
  items: NavItem[]
}

/**
 * A ordem daqui é a ordem da sidebar — e as rotas em `app/App.tsx` seguem a mesma sequência (há
 * teste lendo o `App.tsx` e comparando com esta lista).
 *
 * **Quatro eixos, ordenados por FILA, não pelo ciclo de vida do produto.**
 *
 * `Vendas` vem primeiro porque é o único eixo que acumula: pedido esperando envio, carrinho
 * abandonado esfriando, cliente esperando resposta. Cadastrar catálogo e curar vitrine são trabalho
 * de quando **não** há fila — importantes, mas nada piora enquanto esperam. Numa sidebar de uso
 * diário, o topo pertence ao que cobra.
 *
 * (A ordem anterior era o ciclo de vida — cadastrar → apresentar → vender. Lê bem num diagrama e mal
 * numa segunda-feira: punha três telas de cadastro na frente da fila de pedidos.)
 *
 * `Descontos` nasceu na feature 17 e **tirou `Cupons` de `Vendas`** (A3/D3, PRM-19). Pela própria
 * régua dos eixos, cupom nunca foi fila: nada apodrece enquanto um cupom espera ser criado, e ele
 * ficava no grupo de uso diário só por não ter vizinho. Agora tem — `Promoções` é a outra metade da
 * mesma pergunta ("como eu baixo o preço?"), e as duas ficam lado a lado onde se procura desconto.
 * O grupo fica **entre** `Vendas` e `Catálogo`: desconto ainda é decisão comercial, mais próxima da
 * venda do que do cadastro.
 *
 * `Loja` tem um item só (`Menu da loja`), e isso é de propósito: ele não é cadastro. Enquanto morava
 * em `Catálogo`, a vizinhança sugeria que era mais uma coisa a *cadastrar* — e não é, é curadoria de
 * vitrine sobre o que já está cadastrado. O grupo é o lugar do que a cliente **vê**, e é onde entram
 * as próximas telas desse eixo (banners da home, destaques, faixa de avisos).
 *
 * `/admin/produtos/grade-rapida` não entra: é uma tela alcançada de dentro de Produtos, não um
 * destino de primeiro nível.
 */
export const navGroups: NavGroup[] = [
  {
    label: null,
    items: [{ to: '/admin', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    label: 'Vendas',
    items: [
      { to: '/admin/pedidos', icon: ShoppingCart, label: 'Pedidos' },
      { to: '/admin/carrinhos-abandonados', icon: ShoppingBag, label: 'Carrinhos abandonados' },
      { to: '/admin/clientes', icon: Users, label: 'Clientes' },
    ],
  },
  {
    label: 'Descontos',
    items: [
      { to: '/admin/cupons', icon: Ticket, label: 'Cupons' },
      { to: '/admin/promocoes', icon: Percent, label: 'Promoções' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { to: '/admin/produtos', icon: Package, label: 'Produtos' },
      { to: '/admin/categorias', icon: Tags, label: 'Categorias' },
    ],
  },
  {
    label: 'Loja',
    items: [{ to: '/admin/menu', icon: Menu, label: 'Menu da loja' }],
  },
]

/** Vai no bloco de rodapé, junto de Ver Loja / Sair. */
export const footerNavItems: NavItem[] = [
  { to: '/admin/configuracoes', icon: Settings, label: 'Configurações' },
]
