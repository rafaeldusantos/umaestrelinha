import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, PanelLeftClose, Menu } from 'lucide-react'
import { supabase } from '@estrelinha/supabase/client'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@estrelinha/ui/sheet'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@estrelinha/ui/collapsible'
import { cn } from '@estrelinha/ui/lib/utils'
import { EstrelinhaSignature } from '@estrelinha/ui/brand'
import { isNavActive } from '@/widgets/admin-layout/lib/isNavActive'
import { navGroups, type NavItem } from '@/widgets/admin-layout/model/navItems'
import { groupHasActive, isCollapsed, useNavCollapse } from '@/widgets/admin-layout/model/navCollapse'
import { isFocusRoute } from '@/widgets/admin-layout/model/focusRoutes'
import { useNavRail } from '@/widgets/admin-layout/model/navRail'
import NavRail from '@/widgets/admin-layout/ui/NavRail'
import AccountMenu from '@/widgets/admin-layout/ui/AccountMenu'

/** Id estável do cabeçalho, para o `aria-labelledby` do grupo. */
const groupId = (label: string) => `nav-group-${label.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`

interface NavLinkProps {
  item: NavItem
  pathname: string
  onNavigate?: () => void
}

/** Um item do menu. Vive aqui porque todos os grupos compartilham as mesmas classes. */
const NavLink = ({ item, pathname, onNavigate }: NavLinkProps) => {
  const active = isNavActive(pathname, item.to)
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors ${
        active
          ? 'bg-estrelinha-admin-elevated text-estrelinha-admin-violet font-semibold border-l-[3px] border-estrelinha-admin-violet rounded-r-xl'
          : 'text-estrelinha-admin-text-secondary hover:bg-estrelinha-admin-bg hover:text-estrelinha-admin-text rounded-xl'
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
  /**
   * Recolhe a navegação para o trilho.
   *
   * Chega preenchido em **toda** tela do computador (2026-10-28; até ali só nas rotas de foco,
   * `FOCO-07`). Ausente na gaveta do celular, onde a navegação já sai da frente sozinha.
   */
  onCollapse?: () => void
  /**
   * Desenha o cartão da conta no pé da coluna. Desligado na gaveta do celular: lá o menu da conta
   * mora no avatar da barra do topo, que está à vista sem abrir gaveta nenhuma — dois gatilhos do
   * mesmo menu na mesma tela seriam ruído.
   */
  comConta?: boolean
}

/** A largura da assinatura no topo da coluna — o piso dela (`SIGNATURE_FLOOR`). */
const SIDEBAR_SIGNATURE_WIDTH = 190

const NavContent = ({ pathname, onNavigate, onLogout, onCollapse, comConta = true }: NavProps) => {
  const { collapsed, toggle } = useNavCollapse()

  return (
    <div className="flex flex-col h-full">
      {/* A marca é a ASSINATURA da loja — o mesmo traço do header dela, sem a linha "Eternizando suas
          lembranças" (essa é do lockup, e a 190px viraria cinza de antialias). 190px é o piso da
          assinatura: abaixo dele ela cai para o símbolo, e é por isso que a coluna tem 256px — logo,
          botão de 44px e os recuos cabem sem a marca encolher. */}
      <div className="flex h-16 items-center gap-1 border-b border-estrelinha-admin-border pl-3 pr-1.5 shrink-0">
        <Link
          to="/admin"
          onClick={onNavigate}
          aria-label="Uma Estrelinha — Dashboard"
          className="flex min-w-0 flex-1 items-center rounded-lg"
        >
          <EstrelinhaSignature width={SIDEBAR_SIGNATURE_WIDTH} />
        </Link>
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Recolher a navegação"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-estrelinha-admin-text-secondary transition-colors hover:bg-estrelinha-admin-bg hover:text-estrelinha-admin-text"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
          </button>
        )}
      </div>
      {/* `min-h-0` é o que faz o `overflow-y-auto` valer: sem ele um filho de flex não encolhe
          abaixo do próprio conteúdo, e a lista empurraria o rodapé para fora da coluna em vez de
          rolar dentro dela. */}
      <nav className="flex-1 min-h-0 p-3 overflow-y-auto">
        {navGroups.map((group, indice) => {
          // Grupo sem cabeçalho: o Dashboard no topo e Configurações abaixo de `Loja`. O segundo
          // ganha o mesmo respiro (`mt-3`) que um cabeçalho de grupo daria.
          if (group.label === null) {
            return (
              <div key={`sem-rotulo-${indice}`} className={cn('space-y-1', indice > 0 && 'mt-3')}>
                {group.items.map((item) => (
                  <NavLink key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </div>
            )
          }

          const label = group.label
          const fechado = isCollapsed(collapsed, label)
          // Só marca o cabeçalho quando está fechado: aberto, quem se marca é o item.
          const escondeAtivo = fechado && groupHasActive(group, pathname)

          return (
            <Collapsible key={label} open={!fechado} onOpenChange={() => toggle(label)}>
              {/* O cabeçalho virou botão, então precisa de alvo de verdade: `min-h-11` são os 44px
                  da régua do projeto. O `text-xs` de antes foi preservado — cabeçalho de grupo não
                  pode competir com os itens que ele agrupa. */}
              <CollapsibleTrigger className="mt-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left transition-colors hover:bg-estrelinha-admin-bg">
                <span
                  id={groupId(label)}
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
                    escondeAtivo ? 'text-estrelinha-admin-violet' : 'text-estrelinha-admin-text-secondary'
                  }`}
                >
                  {label}
                  {escondeAtivo && (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-estrelinha-admin-violet" aria-hidden="true" />
                      {/* O ponto é cor, e cor sozinha não é informação: o texto é o que faz a
                          mesma frase chegar a quem usa leitor de tela. */}
                      <span className="sr-only">a tela atual está neste grupo</span>
                    </>
                  )}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-estrelinha-admin-text-secondary transition-transform ${
                    fechado ? '' : 'rotate-180'
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent role="group" aria-labelledby={groupId(label)} className="space-y-1 pt-1">
                {group.items.map((item) => (
                  <NavLink key={item.to} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </nav>
      {comConta && (
        <div className="p-3 border-t border-estrelinha-admin-border shrink-0">
          <AccountMenu variant="sidebar" pathname={pathname} onLogout={onLogout} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

const AdminLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  // As rotas de foco abrem com a navegação recolhida; as demais, aberta. O botão de recolher existe
  // em toda tela, e a escolha feita nele vale para todas e sobrevive ao F5.
  const foco = isFocusRoute(location.pathname)
  const { recolhido, alternar } = useNavRail(foco)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-screen flex bg-estrelinha-admin-bg">
      {/* A sidebar é FIXA na viewport, e isso conserta um defeito: como o `aside` era só um filho de
          flex sem altura, ele esticava até a altura do DOCUMENTO — numa listagem de 680 produtos o
          rodapé (a conta e o Sair) ia para o fim da página, a dezenas de telas de
          distância, e "desaparecia".
          `sticky` em vez de `fixed`: mantém a largura reservada no fluxo (com `fixed` o conteúdo
          principal passaria por baixo) e preserva a rolagem do BODY, que é a que se comporta bem no
          celular — `h-screen overflow-hidden` na raiz traria o problema do `100vh` com a barra do
          navegador. `self-start` impede o `stretch` do flex de desfazer a altura de uma tela. */}
      {/* A largura é a única coisa que muda com o trilho — os invariantes de posição valem nos DOIS
          estados, e `AdminLayout.test.tsx` os lê do disco enxergando esta forma dinâmica. */}
      <aside className={cn('hidden md:block shrink-0 sticky top-0 self-start h-screen bg-white border-r border-estrelinha-admin-border', recolhido ? 'w-14' : 'w-64')}>
        {recolhido ? (
          <NavRail pathname={location.pathname} onExpand={alternar} onLogout={handleLogout} />
        ) : (
          <NavContent
            pathname={location.pathname}
            onLogout={handleLogout}
            onCollapse={alternar}
          />
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* No celular a sidebar É este botão, então ele obedece à mesma regra: `sticky` para não
            sumir junto com a rolagem de uma listagem longa. */}
        <header className="sticky top-0 z-30 h-14 border-b border-estrelinha-admin-border bg-white flex items-center gap-3 px-4 md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            {/* Caixa de 44, glifo de 20 (`PED-23`/D8). A barra existe **só** no celular, e este é o
                gesto mais repetido dela: o alvo tem de caber no polegar de quem está com o envelope
                na outra mão. `-ml-2` conserva o alinhamento óptico à esquerda. */}
            <SheetTrigger
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-estrelinha-admin-text-secondary transition-colors hover:bg-estrelinha-admin-bg hover:text-estrelinha-admin-text"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-white">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <NavContent
                pathname={location.pathname}
                onNavigate={() => setMenuOpen(false)}
                onLogout={handleLogout}
                comConta={false}
              />
            </SheetContent>
          </Sheet>
          <Link
            to="/admin"
            className="flex min-h-[44px] items-center font-heading font-semibold text-estrelinha-admin-text"
          >
            Uma Estrelinha Admin
          </Link>
          <AccountMenu variant="header" pathname={location.pathname} onLogout={handleLogout} />
        </header>
        {/* O `main` NÃO tem `overflow` (feature 67, D1 da prova em navegador). Qualquer valor diferente
            de `visible` faz dele o contêiner de rolagem de todo `sticky` de dentro — e como quem rola
            é o BODY, não ele, nenhum `sticky` do painel grudava: a barra "Aprovar N" da fila de
            sugestões nascia a 13.993px numa janela de 900, e os cabeçalhos de salvar dos formulários
            rolavam junto. Conteúdo largo rola dentro do PRÓPRIO contêiner, nunca no `main`. */}
        <main className="flex-1 min-w-0 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
