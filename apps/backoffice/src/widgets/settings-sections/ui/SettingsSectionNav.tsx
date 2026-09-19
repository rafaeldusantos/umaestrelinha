// A navegação das seções de Configurações — feature 55.
//
// ## Uma árvore, duas larguras
//
// Isto **não** é um rail com uma lista-de-celular ao lado. É um nó só: o mesmo `<ul>` de links,
// que abaixo de `lg` é a lista de largura cheia e a partir de `lg` é o card de 296px ao lado do
// painel. Dois componentes paralelos seriam duas listas das mesmas quatro seções — o "defeito 01"
// do projeto, e ele apareceria no dia em que entrasse a quinta: uma das duas ganharia a entrada
// nova, build e testes de componente ficariam verdes, e a metade errada da loja veria um menu
// desatualizado.
//
// ## Por que o marcador é `lg:`-only
//
// Havia um caso que parecia exigir os dois componentes: no desktop a rota-mãe marca "Dados da loja"
// (`CFG-02`, porque o painel ao lado já está mostrando ela); no celular a rota-mãe é uma LISTA, e
// marcar uma linha ali sugeriria que ela já está aberta.
//
// Com o marcador escrito só em classes `lg:`, os dois comportamentos saem da mesma linha. A
// alternativa seria medir a janela em JavaScript (`useMediaQuery`), que na primeira pintura não sabe
// a largura e entrega um quadro errado — o mesmo motivo pelo qual `focusRoutes.ts` recusou decidir o
// foco num `useEffect` de página.

import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  SETTINGS_SECTIONS,
  settingsSectionPath,
  type SettingsSectionSlug,
} from '@/shared/lib/settingsSections'

interface Props {
  /**
   * A seção que o painel está mostrando.
   *
   * Vem da URL, sempre — nunca de um estado local ao lado dela. Dois donos de "onde estou" é como
   * o rail e o painel passam a discordar depois de um botão de voltar.
   */
  ativa: SettingsSectionSlug
  className?: string
}

export const SettingsSectionNav = ({ ativa, className }: Props) => (
  <nav
    aria-label="Seções das configurações"
    data-testid="settings-section-nav"
    className={cn(
      'overflow-hidden rounded-2xl border border-border bg-card',
      'lg:w-[296px] lg:shrink-0',
      className,
    )}
  >
    {/* O sobrescrito existe só no desktop: no celular quem diz onde se está é o cabeçalho da
        página, e repeti-lo aqui seria um título para uma lista que já é a tela inteira. */}
    <p className="hidden border-b border-border px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:block">
      Seções
    </p>

    <ul>
      {SETTINGS_SECTIONS.map(secao => {
        const marcada = secao.slug === ativa
        const Icone = secao.icon

        return (
          <li key={secao.slug}>
            <Link
              to={settingsSectionPath(secao.slug)}
              data-testid={`settings-section-link-${secao.slug}`}
              /* `aria-current="page"` só quando a marcação é visível seria uma régua por largura de
                 janela, que o CSS resolve e o JS não sabe. Ele acompanha o painel: quem está sendo
                 mostrado é esta seção, independentemente de a linha estar pintada. */
              aria-current={marcada ? 'page' : undefined}
              onKeyDown={event => {
                // `<a>` ativa por Enter e **não** por Espaço — o navegador rola a página. A
                // *Edge Case* da spec pede os dois, então o Espaço é acrescentado à mão, com
                // `preventDefault` para a rolagem não acontecer junto.
                if (event.key === ' ' || event.key === 'Spacebar') {
                  event.preventDefault()
                  event.currentTarget.click()
                }
              }}
              className={cn(
                // 13 + 34 + 13 = 60px de altura. Acima do piso de 44px sem precisar de auxiliar:
                // a linha inteira é o alvo, não o rótulo.
                'flex items-center gap-3 border-l-[3px] border-transparent py-[13px] pl-[13px] pr-4',
                'transition-colors motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                marcada
                  ? // Só a partir de `lg`. Ver o cabeçalho deste arquivo.
                    'lg:border-l-primary lg:bg-primary/5'
                  : 'hover:bg-muted/40',
              )}
            >
              <span
                className={cn(
                  'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl',
                  marcada
                    ? 'bg-muted text-muted-foreground lg:bg-primary/10 lg:text-primary'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Icone className="h-4 w-4" aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">{secao.label}</span>
                <span className="block text-xs text-muted-foreground">{secao.description}</span>
              </span>

              {/* A afordância de "isto abre outra tela" é do celular. No desktop a seção abre ao
                  lado, e uma seta apontando para fora prometeria uma navegação que não acontece. */}
              <ChevronRight
                className="h-4 w-4 shrink-0 text-muted-foreground lg:hidden"
                aria-hidden
              />
            </Link>
          </li>
        )
      })}
    </ul>
  </nav>
)

export default SettingsSectionNav
