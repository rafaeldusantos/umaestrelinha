import type { ComponentType } from 'react'
import { House, Tag, User } from 'lucide-react'
import { SacolaIcon } from '@estrelinha/ui/icons'

/**
 * As quatro áreas do app do ateliê (feature 72, `MAF-14`) — o ÚNICO dono da lista de abas.
 *
 * A barra inferior desenha daqui, as páginas tiram o título daqui, e as rotas de `App.tsx` são
 * comparadas com esta lista nos dois sentidos por `abasSaoAsRotas.test.ts`. Uma aba sem rota seria um
 * botão que leva ao vazio; uma rota sem aba, uma área que ninguém alcança.
 *
 * Os ícones vêm do lucide porque ele já tem o vocabulário (casa, sacola, pessoas, etiqueta); um
 * desenho próprio só entra em `@estrelinha/ui/icons` quando o lucide não tiver.
 */
export interface Tab {
  path: '/' | '/pedidos' | '/clientes' | '/descontos'
  label: string
  /**
   * O ícone da aba (24 px, traço 1,5). Pedidos e Clientes são os do protótipo do Claude Design
   * (2026-10-26): a `sacola` da marca (`SacolaIcon`, alça em `accent`) e o `user` (uma pessoa).
   */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false'; strokeWidth?: string | number }>
}

export const TABS: readonly Tab[] = [
  { path: '/', label: 'Início', icon: House },
  { path: '/pedidos', label: 'Pedidos', icon: SacolaIcon },
  { path: '/clientes', label: 'Clientes', icon: User },
  { path: '/descontos', label: 'Descontos', icon: Tag },
]

/** A aba de um caminho. Lança para caminho desconhecido — nunca devolve uma aba qualquer. */
export const tabFor = (path: Tab['path']): Tab => {
  const tab = TABS.find((t) => t.path === path)
  if (!tab) throw new Error(`aba desconhecida: ${path}`)
  return tab
}

/** O título do documento numa aba (`MAF-29`): "Pedidos · Ateliê". É o que o leitor de tela lê. */
export const tituloDaAba = (tab: Tab): string => `${tab.label} · Ateliê`

/** A aba de um caminho qualquer, ou `null` — o layout não lança para o caminho em trânsito. */
export const abaDoCaminho = (caminho: string): Tab | null => TABS.find((t) => t.path === caminho) ?? null

/**
 * A barra de abas aparece nesta rota? NÃO no detalhe do pedido nem no da cliente: no protótipo do
 * Claude Design (2026-10-26) as telas de detalhe cobrem a barra e têm o próprio "Voltar". Nem na Loja
 * ao vivo (feature `83`, `LAV-06`), que tem o próprio "Voltar" e não é aba. Nas abas e em `/avisos`
 * (que não tem voltar próprio) ela fica.
 */
export const barraNoCaminho = (caminho: string): boolean =>
  !/^\/(pedidos|clientes)\/[^/]+\/?$/.test(caminho) && !/^\/ao-vivo\/?$/.test(caminho)
