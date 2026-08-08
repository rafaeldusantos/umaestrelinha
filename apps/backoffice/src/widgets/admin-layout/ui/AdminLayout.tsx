import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Pin, Store, Menu } from 'lucide-react'
import { supabase } from '@estrelinha/supabase/client'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@estrelinha/ui/sheet'
import { isNavActive } from '@/widgets/admin-layout/lib/isNavActive'
import { navGroups, footerNavItems, type NavItem } from '@/widgets/admin-layout/model/navItems'

/** Id estável do cabeçalho, para o `aria-labelledby` do grupo. */
const groupId = (label: string) => `nav-group-${label.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`

interface NavLinkProps {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}

/** Um item do menu. Vive aqui porque os grupos e o rodapé compartilham as mesmas classes. */
const NavLink = ({ item, pathname, onNavigate }: NavLinkProps) => {
  const active = isNavActive(pathname, item.to)
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-nana-elevated text-nana-violet font-semibold border-l-[3px] border-nana-violet rounded-r-xl'
          : 'text-nana-text-secondary hover:bg-nana-bg hover:text-nana-text rounded-xl'
      }`}
    >
      <item.icon className="w-4 h-4 shrink-0" />
      <span className="min-w-0 truncate">{item.label}</span>
    </Link>
  )
}

interface NavProps {
  pathname: string
  onNavigate?: () => void
  onLogout: () => void
}

const NavContent = ({ pathname, onNavigate, onLogout }: NavProps) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-nana-border">
      <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full gradient-cta flex items-center justify-center">
          <Pin className="w-4 h-4 text-white" />
        </div>
        <span className="font-heading text-lg font-semibold text-nana-text">Nanita</span>
      </Link>
    </div>
    <nav className="flex-1 p-3 overflow-auto">
      {navGroups.map((group) => (
        <div
          key={group.label ?? 'principal'}
          className="space-y-1"
          {...(group.label ? { role: 'group', 'aria-labelledby': groupId(group.label) } : {})}
        >
          {group.label && (
            <p
              id={groupId(group.label)}
              className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-nana-text-secondary"
            >
              {group.label}
            </p>
          )}
          {group.items.map((item) => (
            <NavLink key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
    <div className="p-3 border-t border-nana-border space-y-1">
      {footerNavItems.map((item) => (
        <NavLink key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-nana-text-secondary hover:bg-nana-bg hover:text-nana-text transition-colors">
        <Store className="w-4 h-4" /> Ver Loja
      </Link>
      <button onClick={onLogout} className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-nana-text-secondary hover:bg-nana-bg hover:text-nana-pink transition-colors w-full">
        <LogOut className="w-4 h-4" /> Sair
      </button>
    </div>
  </div>
)

const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-nana-bg">
      <aside className="w-60 bg-white border-r border-nana-border shrink-0 hidden md:block">
        <NavContent pathname={location.pathname} onLogout={handleLogout} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-nana-border bg-white flex items-center gap-3 px-4 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              className="p-2 -ml-2 rounded-lg text-nana-text-secondary hover:bg-nana-bg hover:text-nana-text transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-white">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <NavContent
                pathname={location.pathname}
                onNavigate={() => setMenuOpen(false)}
                onLogout={handleLogout}
              />
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="font-heading font-semibold text-nana-text">Nanita Admin</Link>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
