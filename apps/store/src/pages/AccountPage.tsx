// `/conta` e `/conta/dados` — a área da cliente (feature 59, `LST-01`, `LST-04`, `LST-05`, `LST-09`,
// `LST-10`).
//
// Uma página, duas rotas irmãs: a aba vem do ENDEREÇO, não de um estado interno, então "Meus dados"
// sobrevive a recarregar e ao botão voltar. A conta é lista + pendências — o detalhe de um pedido
// tem um dono só, `/pedido/:id`, e cada linha leva até lá.
//
// Celular (o caso principal): saudação, as abas "Pedidos" e "Meus dados", e o conteúdo da aba. No
// computador (`lg`) a mesma árvore vira duas colunas — a lateral de 264px (saudação, navegação,
// ajuda) e a principal. É UMA árvore só, rearranjada por classe: duas cópias (uma escondida por CSS)
// dariam dois links para cada destino e duas leituras para o leitor de tela.
//
// A tabela de rótulos que morava aqui (`statusConfig`) era o defeito que abriu a feature `59`:
// conhecia 5 dos 6 status do banco e lia só `orders.status`, então pedido pago aparecia "Pendente".
// O selo agora vem do dono único (`orderSituation`, via `OrderSituationBadge`, dentro da lista), e
// `situacaoComDonoUnico.test.ts` recusa a volta.
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Heart, LogOut, MessageCircle } from 'lucide-react'
import { useAuthContext, type Customer } from '@estrelinha/auth'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { useOrdersByCustomerId } from '@/entities/order'
import { useAuthUiStore } from '@/features/auth'
import { AddressCard } from '@/features/edit-address'
import { ProfileCard } from '@/features/edit-profile'
import { whatsappHref } from '@/shared/lib/whatsapp'
import { AttentionList } from '@/widgets/order-attention'
import { OrderList } from '@/widgets/order-list'
import { WHATSAPP_FLOAT_CLEARANCE } from '@/widgets/whatsapp-float'

/** As duas abas e os endereços delas. */
const ABAS = {
  pedidos: { path: '/conta', rotulo: 'Pedidos' },
  dados: { path: '/conta/dados', rotulo: 'Meus dados' },
} as const

type Aba = keyof typeof ABAS

/** "AN" de "Ana Nunes"; cai para o e-mail quando não há nome. */
const iniciais = (nome: string | null | undefined, email: string | null | undefined): string => {
  const partes = (nome ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length >= 2) return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (email ?? '?').slice(0, 2).toUpperCase()
}

const ITEM_NAV =
  'flex h-12 items-center gap-2 px-3 text-[15px] font-semibold transition-colors motion-reduce:transition-none'

/** "Precisa de ajuda?" da coluna lateral — some sem número da loja configurado. */
const AjudaLateral = () => {
  const { whatsapp } = useGeneralSettings()
  const href = whatsappHref(whatsapp, 'Olá! Preciso de ajuda com a minha conta.')
  if (!href) return null
  return (
    <div className="hidden flex-col gap-2 rounded-md bg-estrelinha-ground-deep p-4 lg:flex">
      <p className="text-[15px] font-semibold text-estrelinha-ink">Precisa de ajuda?</p>
      <p className="text-sm text-estrelinha-ink-soft">
        Fale com a Adri pelo WhatsApp — ela responde pessoalmente.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold text-estrelinha-primary hover:underline"
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        Conversar no WhatsApp
      </a>
    </div>
  )
}

/**
 * A aba "Meus dados" (`DAD-01`): "Dados pessoais", "Endereço de entrega" e "Sair da conta".
 *
 * A região leva o nome "Dados pessoais" e abraça os dois cartões: no sentido da aba, endereço também é
 * dado pessoal. No computador quem oferece "Sair da conta" é a navegação lateral; aqui o botão é do
 * celular.
 */
const AccountDataPanel = ({
  customer,
  email,
  onSaveProfile,
  onDocumentSaved,
  onSignOut,
}: {
  customer: Customer | null
  email: string | null | undefined
  onSaveProfile: (profile: { name: string; phone: string }) => Promise<{ error: string | null }>
  onDocumentSaved: (cpf: string) => void
  onSignOut: () => void
}) => (
  <section aria-label="Dados pessoais" className="flex flex-col gap-4">
    <ProfileCard
      customer={customer}
      email={email}
      onSaveProfile={onSaveProfile}
      onDocumentSaved={onDocumentSaved}
    />
    <AddressCard customerId={customer?.id} />
    <button
      type="button"
      onClick={onSignOut}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-estrelinha-field px-5 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none lg:hidden"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      Sair da conta
    </button>
  </section>
)

const AccountPage = () => {
  const { user, customer, loading, signOut, updateCustomerProfile, patchCustomer } = useAuthContext()
  const openAuth = useAuthUiStore((s) => s.open)
  const { pathname } = useLocation()
  const aba: Aba = pathname === ABAS.dados.path ? 'dados' : 'pedidos'
  const { data: orders, isLoading, isError, refetch } = useOrdersByCustomerId(customer?.id)

  // `LST-09`: sem sessão, o login abre e devolve à aba em que ela estava.
  useEffect(() => {
    if (!loading && !user) {
      openAuth({ returnTo: ABAS[aba].path })
    }
  }, [loading, user, openAuth, aba])

  if (loading) {
    return <div className="container py-20 text-center text-estrelinha-ink-soft">Carregando...</div>
  }

  if (!user) return null

  const nome = customer?.name?.trim() || ''
  const primeiroNome = nome.split(/\s+/)[0] || ''
  const contagem = orders?.length ?? 0

  return (
    // `ACB-02`: o fim da página reserva o espaço da bolha do WhatsApp — a medida é dela.
    <div className={`container max-w-5xl pt-6 lg:pt-12 ${WHATSAPP_FLOAT_CLEARANCE}`}>
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="flex min-w-0 flex-col gap-4 lg:gap-6">
          {/* `LST-05`: o avatar não encolhe; o e-mail corta com reticências. */}
          <div className="flex min-w-0 items-center gap-3">
            <span
              aria-hidden
              data-testid="account-avatar"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-estrelinha-primary font-body text-base font-semibold text-estrelinha-on-primary lg:h-14 lg:w-14 lg:text-lg"
            >
              {iniciais(nome, user.email)}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="font-heading text-2xl font-semibold leading-tight text-estrelinha-ink lg:text-[26px]">
                {primeiroNome ? `Olá, ${primeiroNome}` : 'Olá'}
              </p>
              <p className="truncate text-sm text-estrelinha-ink-soft">{user.email}</p>
            </div>
          </div>

          {/* As abas no celular; a navegação lateral no computador. */}
          <nav aria-label="Minha conta" className="flex border-b border-estrelinha-line lg:flex-col lg:gap-1 lg:border-b-0">
            {(Object.keys(ABAS) as Aba[]).map((chave) => {
              const ativa = chave === aba
              return (
                <Link
                  key={chave}
                  to={ABAS[chave].path}
                  aria-current={ativa ? 'page' : undefined}
                  className={`${ITEM_NAV} flex-1 justify-center border-b-2 lg:flex-none lg:justify-start lg:rounded-md lg:border lg:border-transparent ${
                    ativa
                      ? 'border-b-estrelinha-primary text-estrelinha-ink lg:border-estrelinha-line lg:bg-estrelinha-surface'
                      : 'border-b-transparent text-estrelinha-ink-soft hover:text-estrelinha-ink'
                  }`}
                >
                  {ABAS[chave].rotulo}
                  {chave === 'pedidos' && contagem > 0 && (
                    <span className="rounded-pill bg-estrelinha-serenity px-2 py-0.5 text-xs font-semibold text-estrelinha-primary-strong">
                      {contagem}
                    </span>
                  )}
                </Link>
              )
            })}
            <Link
              to="/favoritos"
              className={`${ITEM_NAV} hidden rounded-md text-estrelinha-ink-soft hover:text-estrelinha-ink lg:flex`}
            >
              <Heart className="h-4 w-4" aria-hidden />
              Favoritos
            </Link>
            <span aria-hidden className="mx-3 my-2 hidden h-px bg-estrelinha-line lg:block" />
            <button
              type="button"
              onClick={signOut}
              data-testid="account-signout-lateral"
              className={`${ITEM_NAV} hidden rounded-md text-estrelinha-ink-soft hover:text-estrelinha-ink lg:flex`}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              Sair da conta
            </button>
          </nav>

          <AjudaLateral />
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {/* O título da página: visível no computador; no celular a saudação e as abas já dizem onde
              ela está, e o título fica para o leitor de tela. */}
          <div className="sr-only lg:not-sr-only lg:flex lg:flex-col lg:gap-1">
            <h1 className="font-heading text-[34px] font-semibold leading-tight tracking-[-0.02em] text-estrelinha-ink">
              {ABAS[aba].rotulo}
            </h1>
            {aba === 'pedidos' && (
              <p className="text-[15px] text-estrelinha-ink-soft">
                Acompanhe cada joia, da chegada do material até a entrega.
              </p>
            )}
          </div>

          {aba === 'pedidos' ? (
            <>
              {!isLoading && !isError && <AttentionList orders={orders} />}
              <OrderList
                orders={orders}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch?.()}
              />
            </>
          ) : (
            <AccountDataPanel
              customer={customer}
              email={user.email}
              onSaveProfile={updateCustomerProfile}
              onDocumentSaved={(cpf) => patchCustomer({ cpf })}
              onSignOut={signOut}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AccountPage
