// Os itens de **link** do menu: ler e gravar `store_settings.menu -> links[]` (feature 39, T20).
//
// Link não é categoria (`AD-014`, `AD-028`): não tem produto, não tem filha e não tem página
// própria — é um atalho para uma página que já existe. Por isso ele não mora em `categories`, e por
// isso este hook existe: a curadoria da barra tem **duas fontes**, e a segunda é uma chave de
// configuração.
//
// **Por que a leitura é própria, e não `useStoreSettings`.** Aquele hook é o da LOJA, e ele engole
// erro de propósito: `fetchAllSettings` devolve os defaults quando a consulta falha, para que uma
// falha de rede não derrube o header da cliente. Para o painel isso é a resposta errada — a tela
// mostraria "nenhum link" com o banco inacessível, e a Adri cadastraria o "Sobre" de novo em cima do
// que já existe. `NAV-41` pede superfície explícita, e superfície explícita precisa de erro
// explícito. Foi engolir exatamente este erro que fez a tela de Coleções parecer vazia por meses.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { menuTargetRefusal, normalizeMenuHref, type MenuLink } from '@estrelinha/core/menu'
import { DEFAULT_MENU } from '@estrelinha/supabase/types/settings'

/** A chave de `store_settings` onde a curadoria de link mora. */
export const MENU_SETTINGS_KEY = 'menu'

/**
 * Os links de dentro do jsonb, sem o que não é link.
 *
 * Validação campo a campo porque `store_settings.value` é jsonb e **não tem forma garantida**:
 * `null`, array na raiz, `links` que não é lista e item que não é objeto são todos estados
 * alcançáveis do banco (SQL na mão, migration, importação), e nenhum deles pode derrubar a tela.
 *
 * O que **não** se filtra aqui é rótulo vazio ou destino que deixou de ser rota: o painel é o único
 * lugar onde esse link pode ser consertado ou apagado. Sumir com ele aqui o tornaria invisível e
 * indeletável — a mesma armadilha que o terceiro banner tem, e que a T25 acusa em tela.
 */
export const parseMenuLinks = (value: unknown): MenuLink[] => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return []
  const lista = (value as { links?: unknown }).links
  if (!Array.isArray(lista)) return []

  return lista
    .filter(item => item !== null && typeof item === 'object' && !Array.isArray(item))
    .map((item, indice) => {
      const bruto = item as Partial<MenuLink>
      return {
        // Id ausente vira posicional: sem ele a linha não tem chave de React nem alvo de edição, e
        // duas linhas sem id colidiriam entre si.
        id: typeof bruto.id === 'string' && bruto.id.trim() !== '' ? bruto.id.trim() : `link-${indice}`,
        label: typeof bruto.label === 'string' ? bruto.label : '',
        href: typeof bruto.href === 'string' ? bruto.href : '',
        icon: typeof bruto.icon === 'string' ? bruto.icon : null,
        desktop: bruto.desktop === true,
        mobile: bruto.mobile === true,
        sort_order: typeof bruto.sort_order === 'number' ? bruto.sort_order : 0,
      }
    })
}

/**
 * A posição de um link novo: **depois de tudo que já existe**.
 *
 * `sort_order` é do item, como o da categoria, e quem funde as duas fontes é o comparador
 * (`byMenuOrder`). O "Sobre" semeado pela migration nasce em 100 justamente para ficar no fim da
 * barra; um link novo entra depois dele, e não no meio das categorias, que vivem na casa das
 * unidades.
 */
export const proximaPosicao = (links: readonly MenuLink[]): number =>
  links.reduce((maior, link) => Math.max(maior, link.sort_order ?? 0), 99) + 1

/** O que a tela precisa gravar. `id` ausente é link novo. */
export interface MenuLinkDraft {
  id?: string
  label: string
  href: string
  icon: string | null
  desktop: boolean
  mobile: boolean
}

/**
 * Por que este rascunho **não pode ser gravado** — ou `null` quando pode.
 *
 * `string | null`, e não `{ ok, reason }`: com `strictNullChecks: false` união discriminada por
 * literal booleano não estreita, e ler `verdict.reason` no ramo do `else` é TS2339.
 *
 * O destino é julgado por `menuTargetRefusal`, de `@estrelinha/core/menu` — **a mesma** função que o
 * banner usa (`NAV-31`). Uma segunda régua aqui aceitaria o que a outra recusa, e a diferença só
 * apareceria quando a cliente clicasse.
 */
export const menuLinkRefusal = (draft: MenuLinkDraft): string | null => {
  if (!draft || draft.label.trim() === '') {
    return 'Dê um nome ao item: é o que a cliente lê na barra do menu.'
  }
  return menuTargetRefusal({ kind: 'url', href: draft.href })
}

interface Retorno {
  links: MenuLink[]
  loading: boolean
  /** Mensagem da falha de leitura, para a superfície explícita. `null` quando leu. */
  error: string | null
  refetch: () => Promise<void>
  /** Grava (cria ou atualiza). Devolve o motivo da recusa/falha, ou `null` em caso de sucesso. */
  saveLink: (draft: MenuLinkDraft) => Promise<string | null>
  removeLink: (id: string) => Promise<string | null>
  /** Liga/desliga o link **numa** superfície. A outra não é tocada. */
  setLinkSurface: (id: string, surface: 'desktop' | 'mobile', next: boolean) => Promise<string | null>
}

export const useMenuLinks = (): Retorno => {
  const [links, setLinks] = useState<MenuLink[]>([])
  /**
   * O objeto inteiro da chave `menu`, como está no banco.
   *
   * Guardado porque a gravação **substitui só `links`**: a chave pode ganhar outros campos amanhã
   * (a fase 6 tem candidatos), e um `update` que mandasse `{ links }` sozinho os apagaria em
   * silêncio — que é a forma que este repositório já conhece de perder configuração.
   */
  const [valorBruto, setValorBruto] = useState<Record<string, unknown>>({ ...DEFAULT_MENU })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: falha } = await supabase
      .from('store_settings')
      .select('value')
      .eq('key', MENU_SETTINGS_KEY)
      .maybeSingle()

    if (falha) {
      // Lista vazia **com** erro: a tela mostra a falha, e não "nenhum link cadastrado".
      setLinks([])
      setError(falha.message ?? 'Não foi possível carregar os itens de link do menu.')
      setLoading(false)
      return
    }

    // Linha ausente não é erro: é o banco de antes da migration, ou uma loja que nunca configurou
    // nada. O default é `{ links: [] }`, nunca um "Sobre" inventado — quem semeia o "Sobre" é a
    // migration, e repetir a semente aqui o faria ressuscitar depois de apagado.
    const valor = (data?.value ?? null) as Record<string, unknown> | null
    setValorBruto(valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : { ...DEFAULT_MENU })
    setLinks(parseMenuLinks(valor))
    setLoading(false)
  }, [])

  useEffect(() => { refetch() }, [refetch])

  /** Escreve a lista inteira e recarrega. O estado da tela volta a ser o do banco (`NAV-42`). */
  const gravar = useCallback(
    async (proximos: MenuLink[]): Promise<string | null> => {
      const { error: falha } = await supabase
        .from('store_settings')
        .upsert({ key: MENU_SETTINGS_KEY, value: { ...valorBruto, links: proximos } }, { onConflict: 'key' })

      if (falha) return falha.message ?? 'Não foi possível salvar os itens de link.'
      await refetch()
      return null
    },
    [refetch, valorBruto],
  )

  const saveLink = useCallback(
    async (draft: MenuLinkDraft): Promise<string | null> => {
      const motivo = menuLinkRefusal(draft)
      // A recusa acontece **antes** da escrita: um toast de erro com a gravação acontecendo atrás
      // deixaria no banco o destino que a tela acabou de dizer que não aceita.
      if (motivo) return motivo

      const item: MenuLink = {
        id: draft.id ?? crypto.randomUUID(),
        label: draft.label.trim(),
        // Normalizado na gravação, e não na leitura: `/sobre/` e `/sobre` são a mesma página com dois
        // endereços, e `vercel.json` declara `trailingSlash: false`.
        href: normalizeMenuHref(draft.href),
        icon: draft.icon ?? null,
        desktop: draft.desktop,
        mobile: draft.mobile,
        sort_order:
          links.find(l => l.id === draft.id)?.sort_order ?? proximaPosicao(links),
      }

      const existe = links.some(l => l.id === item.id)
      return gravar(existe ? links.map(l => (l.id === item.id ? item : l)) : [...links, item])
    },
    [gravar, links],
  )

  const removeLink = useCallback(
    async (id: string): Promise<string | null> => gravar(links.filter(l => l.id !== id)),
    [gravar, links],
  )

  const setLinkSurface = useCallback(
    async (id: string, surface: 'desktop' | 'mobile', next: boolean): Promise<string | null> =>
      // Só a booleana da superfície corrente muda. Gravar as duas faria ligar no computador ligar
      // também no celular — que é exatamente o defeito que a coluna única tinha.
      gravar(links.map(l => (l.id === id ? { ...l, [surface]: next } : l))),
    [gravar, links],
  )

  return { links, loading, error, refetch, saveLink, removeLink, setLinkSurface }
}
