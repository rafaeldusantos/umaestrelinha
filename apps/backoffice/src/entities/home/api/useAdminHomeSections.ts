// O CRUD das seções da Home, para o painel (feature 24).
//
// Difere da leitura da loja (`store/entities/home`) em uma coisa que muda tudo: aqui a consulta
// devolve **também as desligadas**. A policy pública recorta `active = true`; a de admin devolve o
// conjunto inteiro, e é justamente das desligadas que a lista precisa — é a única tela onde elas
// podem ser religadas.
//
// Molde de `useAdminCategories`: `useState` + `fetch` explícito, e não react-query, porque a tela
// que consome isto (`AdminHomePage`) reusa a superfície de erro do `AdminMenuPage`, que espera
// `{ loading, error, fetch }`.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbHomeSection, DbHomeSectionItem } from '@estrelinha/supabase/types'
import {
  orderSections,
  type HomeSection,
  type HomeSectionConfig,
  type HomeSectionItem,
  type HomeSectionType,
} from '@estrelinha/core/home'

/**
 * O erro de uma gravação — **tipado, e nunca engolido**.
 *
 * A tela precisa da mensagem para dizer *o que* não foi salvo (`HOME-14`), e um `boolean` a
 * obrigaria a inventar a frase. `PostgrestError` já satisfaz esta forma, então o erro do banco
 * atravessa inteiro; as recusas que este hook mesmo produz entram no mesmo formato, para quem chama
 * ter um caminho só.
 */
export interface HomeWriteError {
  message: string
}

/** Um item a gravar. Sem `id`: quem cura substitui a lista inteira, não edita linha a linha. */
export interface NewHomeSectionItem {
  category_id?: string | null
  product_id?: string | null
  href?: string | null
  image_url?: string | null
  alt?: string | null
  label_snapshot?: string | null
}

const mapItem = (row: DbHomeSectionItem): HomeSectionItem => ({
  id: row.id,
  section_id: row.section_id,
  position: typeof row.position === 'number' ? row.position : 0,
  category_id: row.category_id ?? null,
  product_id: row.product_id ?? null,
  // Emenda `E5`, o mesmo embed da loja: o painel precisa dizer a verdade sobre o que a Home
  // desenha, e sem o slug ele marcaria todo banner de produto como "destino fora do ar".
  product_slug: row.product?.slug ?? null,
  href: row.href ?? null,
  image_url: row.image_url ?? null,
  alt: row.alt ?? null,
  label_snapshot: row.label_snapshot ?? null,
})

/**
 * `active` cai em `false` quando a coluna não veio — o oposto do mapper da loja, e de propósito.
 *
 * Lá o instinto é o do `mapCategory` (sumir da vitrine é pior que aparecer) porque a policy já
 * filtrou o que a cliente pode ver. Aqui a pergunta é outra: o painel desenha um interruptor, e um
 * interruptor que mostra "ligado" por falta de dado mente para quem decide.
 */
const mapSection = (row: DbHomeSection): HomeSection => ({
  id: row.id,
  type: row.type as HomeSectionType,
  position: typeof row.position === 'number' ? row.position : 0,
  active: row.active ?? false,
  config: (row.config ?? {}) as HomeSectionConfig,
  items: (row.items ?? []).map(mapItem),
})

export const useAdminHomeSections = () => {
  const [rows, setRows] = useState<HomeSection[]>([])
  const [loading, setLoading] = useState(true)
  /**
   * Falha de LEITURA, separada de lista vazia.
   *
   * Sem esta distinção a tela não tem como dizer "quebrou" em vez de "está vazio" — foi engolir
   * exatamente este erro que fez a tela de Coleções parecer "sem conteúdo" por meses, em cima de uma
   * tabela que nunca existiu.
   */
  const [error, setError] = useState<string | null>(null)

  const fetchSections = useCallback(async () => {
    setLoading(true)
    setError(null)

    // Uma consulta só, com a curadoria embutida — e **sem `.order`**: a ordem da Home tem um dono,
    // `orderSections`, que desempata `position` igual por `id` (`HOME-12`). Ordenar também no
    // PostgREST daria uma segunda resposta para a mesma pergunta, e a do banco não desempata.
    const { data, error: readError } = await supabase
      .from('home_sections')
      .select('*, items:home_section_items(*, product:products(slug))')

    if (readError || !data) {
      setRows([])
      setError(readError?.message ?? 'Não foi possível carregar as seções da Home.')
      setLoading(false)
      return
    }

    setRows((data as unknown as DbHomeSection[]).map(mapSection))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  /** A ordem da Home, com o desempate do domínio. Uma resposta só para as duas colunas da tela. */
  const sections = useMemo(() => orderSections(rows), [rows])

  /**
   * Seção nova **nasce desligada** (`HOME-10`), e o `false` vai explícito no payload.
   *
   * A coluna já tem `default false`; mandar assim mesmo é o que torna a regra legível no lugar onde
   * ela é decidida, em vez de depender de um default que uma migration futura poderia inverter sem
   * que nada na tela acusasse.
   */
  const createSection = async (type: HomeSectionType) => {
    const position = sections.reduce((maior, s) => Math.max(maior, s.position ?? 0), 0) + 1
    const { data, error: writeError } = await supabase
      .from('home_sections')
      .insert({ type, position, active: false, config: {} })
      .select('id')
      .maybeSingle()
    if (!writeError) await fetchSections()
    return {
      error: (writeError as HomeWriteError | null) ?? null,
      id: (data as { id?: string } | null)?.id ?? null,
    }
  }

  /** O conteúdo da seção. Só o `config` — posição e estado têm cada um a sua porta. */
  const updateSectionConfig = async (id: string, config: HomeSectionConfig) => {
    const { error: writeError } = await supabase
      .from('home_sections')
      .update({ config })
      .eq('id', id)
    if (!writeError) await fetchSections()
    return (writeError as HomeWriteError | null) ?? null
  }

  /**
   * Ligar/desligar manda **`{ id, active }` e NADA MAIS** — molde do "pausar cupom".
   *
   * Acrescentar `config` ou `position` ao payload reescreveria a seção com o que a listagem tem em
   * cache, que pode estar velho: outra admin salvando o texto do hero enquanto esta clica no
   * interruptor teria o texto dela desfeito, sem erro em lugar nenhum.
   *
   * O hero é recusado pelo **trigger** (`23514`), não por este hook: esconder o controle na tela é
   * UX, e UX não sobrevive a uma chamada direta.
   */
  const setSectionActive = async (id: string, active: boolean) => {
    const { error: writeError } = await supabase
      .from('home_sections')
      .update({ active })
      .eq('id', id)
    if (!writeError) await fetchSections()
    return (writeError as HomeWriteError | null) ?? null
  }

  const deleteSection = async (id: string) => {
    const { error: writeError } = await supabase.from('home_sections').delete().eq('id', id)
    if (!writeError) await fetchSections()
    return (writeError as HomeWriteError | null) ?? null
  }

  /**
   * O arraste. Recebe **posições absolutas, só das linhas que mudaram** (`reorderSections`).
   *
   * ⚠️ **O upsert precisa mandar `type` junto.** Medido no probe da T11: `{ id, position }` sozinho
   * devolve `23502 null value in column "type"`, porque o upsert do PostgREST é um
   * `insert ... on conflict` e `type` é `not null` sem default. `{ id, type, position }` funciona, e
   * repetir a chamada dá o mesmo resultado — que é a idempotência que `HOME-11` pede.
   *
   * O `type` sai do estado do hook, não de quem chama: `reorderSections` é domínio puro e devolve
   * só id e posição. Id fora da lista é **recusado** em vez de completado com `null` — um `type`
   * nulo aqui não daria erro de aplicação, daria `23502` vindo do banco, e a tela mostraria um
   * código em vez do que aconteceu.
   */
  const reorderSectionsTo = async (entries: { id: string; position: number }[]) => {
    if (entries.length === 0) return null

    const typeOf = new Map(sections.map(s => [s.id, s.type]))
    const desconhecida = entries.find(e => !typeOf.has(e.id))
    if (desconhecida) {
      return {
        message:
          'Uma das seções arrastadas não está mais na lista. Recarregue a página e tente de novo.',
      }
    }

    const { error: writeError } = await supabase
      .from('home_sections')
      .upsert(entries.map(e => ({ id: e.id, type: typeOf.get(e.id), position: e.position })))
    if (!writeError) await fetchSections()
    return (writeError as HomeWriteError | null) ?? null
  }

  /**
   * A curadoria: apaga os itens da seção e grava a lista nova, na ordem dela.
   *
   * Lista vazia é **"voltar ao automático"** (`HOME-33`) — só o `delete`, sem `insert`. É uma
   * operação, e não a sincronização de dois campos que uma flag `auto | manual` exigiria.
   *
   * ⚠️ **`insert` em lote exige as MESMAS chaves em todos os objetos** (`PGRST102 All object keys
   * must match`), medido no probe da T11. Por isso cada linha vai com as seis colunas escritas, com
   * `null` explícito no que não se aplica — item com destino de coleção e item com destino de
   * caminho não podem diferir em forma.
   */
  const curateSection = async (sectionId: string, items: readonly NewHomeSectionItem[]) => {
    const { error: deleteError } = await supabase
      .from('home_section_items')
      .delete()
      .eq('section_id', sectionId)
    if (deleteError) return deleteError as HomeWriteError

    if (items.length > 0) {
      const { error: insertError } = await supabase.from('home_section_items').insert(
        items.map((item, index) => ({
          section_id: sectionId,
          position: index + 1,
          category_id: item.category_id ?? null,
          product_id: item.product_id ?? null,
          href: item.href ?? null,
          image_url: item.image_url ?? null,
          alt: item.alt ?? null,
          label_snapshot: item.label_snapshot ?? null,
        })),
      )
      if (insertError) return insertError as HomeWriteError
    }

    await fetchSections()
    return null
  }

  return {
    sections,
    loading,
    error,
    fetchSections,
    createSection,
    updateSectionConfig,
    setSectionActive,
    deleteSection,
    reorderSectionsTo,
    curateSection,
  }
}
