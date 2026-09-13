// O trilho de ícones — feature 47.
//
// **Não declara destino nenhum.** A lista é `navGroups` + `footerNavItems`, na ordem delas: é a
// mesma fonte que a sidebar larga consome, e é o que impede o trilho de virar um segundo dono de
// "quais telas o painel tem". Um item novo em `navItems.ts` aparece aqui sem ninguém lembrar.
//
// Os cabeçalhos de grupo viram **separadores de 1px**: o grupo não desaparece, perde o rótulo. Era
// a alternativa a esconder a estrutura inteira, e mantém a leitura de "isto aqui é outro assunto"
// que a sidebar larga dá com o cabeçalho escrito.
//
// Os 44px de cada alvo são declarados **em classe própria** (`h-11 w-11`). `TAP_44`, o auxiliar da
// loja, NÃO é importado nem copiado: ele mora em `apps/store` e é guardado lá por
// `touchTarget.test.ts`. Trazer a constante para cá criaria um segundo dono da medida — que é
// exatamente o defeito que aquele guarda existe para impedir.

import { Link } from 'react-router-dom'
import { PanelLeftOpen, Pin } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@estrelinha/ui/tooltip'
import { cn } from '@estrelinha/ui/lib/utils'
import { isNavActive } from '@/widgets/admin-layout/lib/isNavActive'
import { footerNavItems, navGroups, type NavItem } from '@/widgets/admin-layout/model/navItems'

interface Props {
  pathname: string
  /** Devolve a navegação de 240px com os rótulos escritos. */
  onExpand: () => void
}

const ItemDoTrilho = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const ativo = isNavActive(pathname, item.to)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.to}
          aria-label={item.label}
          aria-current={ativo ? 'page' : undefined}
          data-active={ativo ? 'true' : undefined}
          className={cn(
            'relative flex h-11 w-11 items-center justify-center rounded-xl transition-colors',
            ativo
              ? 'bg-estrelinha-admin-elevated text-estrelinha-admin-violet'
              : 'text-estrelinha-admin-text-secondary hover:bg-estrelinha-admin-bg hover:text-estrelinha-admin-text',
          )}
        >
          {/* O marcador da borda faz o mesmo papel do `border-l-[3px]` da sidebar larga: sem rótulo,
              o fundo sozinho é uma diferença fraca demais para responder "onde eu estou". */}
          {ativo && (
            <span
              aria-hidden
              className="absolute left-0 h-[22px] w-[3px] rounded-r-full bg-estrelinha-admin-violet"
            />
          )}
          <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        </Link>
      </TooltipTrigger>
      {/* O rótulo só existe no DOM enquanto o tooltip está aberto: recolhido é recolhido. */}
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

const NavRail = ({ pathname, onExpand }: Props) => (
  // O provider é local para o trilho funcionar em qualquer árvore — inclusive nos testes, que
  // montam o layout sem o `App.tsx`. Aninhar providers do Radix é suportado e não duplica estado.
  <TooltipProvider delayDuration={200}>
    <div data-testid="trilho-de-navegacao" className="flex h-full flex-col items-center">
      <div className="flex h-14 w-full shrink-0 items-center justify-center border-b border-estrelinha-admin-border">
        {/* A marca é decorativa aqui: um segundo link para `/admin` faria o trilho ter dois
            destinos para a mesma tela, e a régua de "só o item da rota atual está marcado" passaria
            a medir dois nós. */}
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full gradient-cta"
        >
          <Pin className="h-4 w-4 text-white" />
        </span>
      </div>

      <div className="flex w-full shrink-0 justify-center py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expandir a navegação"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-estrelinha-admin-text-secondary transition-colors hover:bg-estrelinha-admin-bg hover:text-estrelinha-admin-text"
            >
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Expandir a navegação</TooltipContent>
        </Tooltip>
      </div>

      {/* `min-h-0` pelo mesmo motivo do `<nav>` da sidebar larga: sem ele a lista empurra o rodapé
          para fora da coluna em vez de rolar dentro dela. */}
      <nav className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto py-1">
        {navGroups.map((group, indice) => (
          <div key={group.label ?? 'principal'} className="flex flex-col items-center gap-1">
            {indice > 0 && (
              <span
                aria-hidden
                className="my-1.5 h-px w-7 shrink-0 bg-estrelinha-admin-border"
              />
            )}
            {group.items.map(item => (
              <ItemDoTrilho key={item.to} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex w-full shrink-0 flex-col items-center gap-1 border-t border-estrelinha-admin-border py-2">
        {footerNavItems.map(item => (
          <ItemDoTrilho key={item.to} item={item} pathname={pathname} />
        ))}
      </div>
    </div>
  </TooltipProvider>
)

export default NavRail
