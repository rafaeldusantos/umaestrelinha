// O menu da conta — o que é da própria pessoa, atrás de um botão só (2026-10-21).
//
// Substitui três linhas do rodapé da sidebar (Minha conta · Ver Loja · Sair), que somadas a
// Configurações e Usuários davam ~250px e cortavam o grupo `Catálogo` numa viewport de 900.
//
// **Três formas do MESMO menu, nunca três menus**: o cartão do pé da sidebar larga, o avatar do
// trilho de foco e o avatar da barra do celular. O que muda entre elas é o gatilho e o lado em que o
// conteúdo abre; os itens, a ordem e o "Sair" são um só.
//
// - **"Abrir a loja" usa `storeOrigin()`**, o único leitor de `VITE_STORE_URL`. O "Ver Loja" que ele
//   substitui era `<Link to="/">` — e o painel não tem a rota `/`, então o clique caía na 404 do
//   próprio painel e nunca abria a loja. Sem a env, o item **não aparece**: link que não leva a lugar
//   nenhum é pior que link nenhum.
// - **O gatilho se marca quando a rota é `Minha conta`**, pela mesma `isNavActive` dos outros itens:
//   tirar a tela da sidebar não pode tirar dela a resposta a "onde eu estou".

import { Link } from 'react-router-dom'
import { ChevronsUpDown, ExternalLink, LogOut } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@estrelinha/ui/dropdown-menu'
import { cn } from '@estrelinha/ui/lib/utils'
import { storeOrigin } from '@/shared/lib/storeOrigin'
import { isNavActive } from '@/widgets/admin-layout/lib/isNavActive'
import { accountNavItem } from '@/widgets/admin-layout/model/navItems'

export type AccountMenuVariant = 'sidebar' | 'rail' | 'header'

interface Props {
  variant: AccountMenuVariant
  pathname: string
  onLogout: () => void
  /** Fecha a gaveta do celular ao navegar — o mesmo papel do `onNavigate` dos itens da sidebar. */
  onNavigate?: () => void
}

/** A inicial do e-mail, para o avatar. Sem e-mail (sessão ainda carregando), um ponto neutro. */
const inicialDe = (email: string | undefined) => (email?.trim()[0] ?? '·').toUpperCase()

/** Cada linha do menu tem 44px de altura: é a régua de alvo de toque do projeto. */
const ITEM = 'min-h-11 gap-3 rounded-lg px-3 text-sm text-estrelinha-admin-text-secondary focus:bg-estrelinha-admin-bg focus:text-estrelinha-admin-text'

const Avatar = ({ inicial, className }: { inicial: string; className?: string }) => (
  <span
    aria-hidden
    className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-estrelinha-admin-elevated text-sm font-semibold text-estrelinha-admin-violet',
      className,
    )}
  >
    {inicial}
  </span>
)

const AccountMenu = ({ variant, pathname, onLogout, onNavigate }: Props) => {
  const { user } = useAuthContext()
  const email = user?.email ?? ''
  const inicial = inicialDe(email)
  const loja = storeOrigin()
  const ativo = isNavActive(pathname, accountNavItem.to)
  const rotulo = email ? `Sua conta: ${email}` : 'Sua conta'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={rotulo}
        data-active={ativo ? 'true' : undefined}
        className={cn(
          'flex items-center rounded-xl transition-colors hover:bg-estrelinha-admin-bg data-[state=open]:bg-estrelinha-admin-bg',
          variant === 'sidebar' && 'min-h-11 w-full gap-3 px-2 py-2 text-left',
          variant !== 'sidebar' && 'h-11 w-11 justify-center',
          variant === 'header' && '-mr-2 ml-auto',
          ativo && 'bg-estrelinha-admin-elevated',
        )}
      >
        <Avatar inicial={inicial} className={ativo ? 'ring-2 ring-estrelinha-admin-violet' : undefined} />
        {variant === 'sidebar' && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-estrelinha-admin-text">
                {email || 'Sua conta'}
              </span>
              <span className="block text-xs text-estrelinha-admin-text-secondary">Conta e saída</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-estrelinha-admin-text-secondary" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={variant === 'sidebar' ? 'top' : variant === 'rail' ? 'right' : 'bottom'}
        align={variant === 'header' ? 'end' : variant === 'rail' ? 'end' : 'start'}
        className={cn(
          'w-64 rounded-xl border-estrelinha-admin-border bg-white p-1.5',
          variant === 'sidebar' && 'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[14rem]',
        )}
      >
        {email && (
          <>
            <DropdownMenuLabel className="truncate px-3 py-2 text-xs font-normal text-estrelinha-admin-text-secondary">
              {email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-estrelinha-admin-border" />
          </>
        )}
        <DropdownMenuItem asChild className={ITEM}>
          <Link to={accountNavItem.to} onClick={onNavigate}>
            <accountNavItem.icon className="h-4 w-4 shrink-0" aria-hidden />
            {accountNavItem.label}
          </Link>
        </DropdownMenuItem>
        {loja && (
          <DropdownMenuItem asChild className={ITEM}>
            <a href={loja} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
              Abrir a loja
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-estrelinha-admin-border" />
        <DropdownMenuItem
          onSelect={onLogout}
          className={cn(ITEM, 'focus:text-estrelinha-admin-pink')}
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default AccountMenu
