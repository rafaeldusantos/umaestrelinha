// O colapso dos grupos da sidebar.
//
// O motivo é altura, não estética: os quatro grupos somam **onze** destinos e quatro cabeçalhos, e
// numa tela de 768px de altura o rodapé (Configurações · Ver Loja · Sair) fica sob a dobra do
// próprio `<nav>`. Colapsar o que não se usa hoje é o que devolve a lista inteira ao alcance da
// vista, sem tirar item nenhum da navegação.
//
// A preferência é de tela e de quem está sentado nela, então mora no `localStorage` sob
// `estrelinha.admin.*`, junto das colunas e das visões salvas das listagens — não em tabela.
//
// **O que se guarda é o conjunto COLAPSADO, nunca o expandido.** Assim a ausência de valor (primeira
// visita, storage limpo, aba anônima) significa "tudo aberto", que é exatamente o comportamento de
// hoje — e um grupo novo, acrescentado depois, nasce visível em vez de escondido em quem já usava o
// painel.

import { useCallback, useState } from 'react'
import { isNavActive } from '@/widgets/admin-layout/lib/isNavActive'
import { navGroups, type NavGroup } from '@/widgets/admin-layout/model/navItems'

export const STORAGE_KEY = 'estrelinha.admin.nav-collapsed'

/**
 * Os grupos que colapsam: os que têm cabeçalho.
 *
 * O grupo sem rótulo é o Dashboard sozinho no topo — sem cabeçalho não há onde clicar, e esconder o
 * único destino que é sempre o ponto de partida não teria para onde levar de volta.
 */
export const collapsibleLabels = (): string[] =>
  navGroups.filter(group => group.label !== null).map(group => group.label!)

/**
 * Lê a preferência, descartando rótulo que não é mais grupo.
 *
 * O descarte importa: sem ele, renomear um grupo deixaria a entrada velha guardada para sempre, e o
 * grupo novo herdaria o estado errado no dia em que alguém reusasse o rótulo antigo.
 */
export const readCollapsed = (storage: Storage): string[] => {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const conhecidos = collapsibleLabels()
    return parsed.filter((label): label is string => typeof label === 'string' && conhecidos.includes(label))
  } catch {
    return []
  }
}

export const toggleCollapsed = (collapsed: string[], label: string): string[] =>
  collapsed.includes(label) ? collapsed.filter(item => item !== label) : [...collapsed, label]

export const isCollapsed = (collapsed: string[], label: string | null): boolean =>
  label !== null && collapsed.includes(label)

/**
 * O grupo contém a rota aberta agora.
 *
 * Serve para o cabeçalho de um grupo colapsado poder dizer que a tela atual está lá dentro. Sem
 * isso, colapsar `Catálogo` e depois abrir um produto (por um link de dentro do pedido, por exemplo)
 * deixaria a sidebar **sem nenhum item marcado** — e uma navegação que não sabe responder "onde eu
 * estou" lê como quebrada.
 *
 * A alternativa era abrir o grupo à força. Foi recusada: quem colapsou pediu para colapsar, e
 * desfazer isso a cada navegação transforma a preferência em sugestão.
 */
export const groupHasActive = (group: NavGroup, pathname: string): boolean =>
  group.items.some(item => isNavActive(pathname, item.to))

export const useNavCollapse = (storage: Storage = window.localStorage) => {
  const [collapsed, setCollapsed] = useState<string[]>(() => readCollapsed(storage))

  const toggle = useCallback(
    (label: string) => {
      setCollapsed(atual => {
        const next = toggleCollapsed(atual, label)
        try {
          storage.setItem(STORAGE_KEY, JSON.stringify(next))
        } catch {
          // Preferência de tela não pode derrubar a navegação por cota de storage.
        }
        return next
      })
    },
    [storage],
  )

  return { collapsed, toggle }
}
