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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { DbHomeSection, DbHomeSectionItem } from '@estrelinha/supabase/types'
import {
  orderSections,
  type HomeSection,
  type HomeSectionConfig,
  type HomeSectionItem,
  type HomeSectionType,
} from '@estrelinha/core/home'
import type { FetchMode } from '@/shared/lib/fetchMode'

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

/**
 * A consequência de uma curadoria que apagou e não reinseriu (`DST-13`).
 *
 * `curateSection` é delete-then-insert. Entre as duas gravações existe uma janela em que a seção
 * está **sem peça nenhuma**, e se o `insert` falhar ela fica assim: o bloco some da loja. A dona
 * precisa ler isso na tela, senão o que ela vê é uma mensagem de banco que parece dizer "nada
 * aconteceu" — e o que aconteceu foi a Home mudar.
 *
 * Fica aqui, e não na página, porque quem sabe que o `delete` passou é esta função. Quem chama
 * recebe um `HomeWriteError` e não tem como distinguir esta falha da do `update` — deixar a frase
 * lá em cima seria dar dois donos à mesma notícia.
 */
const CURADORIA_PERDIDA =
  'A lista ficou vazia — as peças foram removidas e as novas não entraram. Salve de novo.'

/** Um item a gravar. Sem `id`: quem cura substitui a lista inteira, não edita linha a linha. */
export interface NewHomeSectionItem {
  category_id?: string | null
  product_id?: string | null
  href?: string | null
  image_url?: string | null
  image_mobile_url?: string | null
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
  image_mobile_url: row.image_mobile_url ?? null,
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

  /**
   * O token de sequência (`VIV-08`, `A-11`).
   *
   * Duas gravações em sequência rápida pedem duas releituras, e **a primeira pode responder por
   * último** — devolvendo a tela ao estado anterior à segunda. O defeito é clássico e invisível:
   * nada quebra, nenhum erro sobe, e o que a dona vê é a própria alteração desaparecendo.
   *
   * Cada leitura reserva um número; quando ela volta, só escreve no estado se ainda for a última
   * pedida. Vale para os **dois** modos, não só para a revalidação: é o mesmo defeito.
   */
  const pedido = useRef(0)

  const fetchSections = useCallback(async (modo: FetchMode = 'inicial') => {
    const meu = ++pedido.current
    // `'revalidar'` **não liga `loading`**, e é só isso que separa a releitura de gravação da
    // primeira carga. Ligar aqui trocaria a árvore inteira por `<TableSkeleton/>` e desmontaria o
    // `<iframe>` da prévia, que remontaria recarregando a loja (`VIV-01`, `VIV-03`).
    if (modo === 'inicial') setLoading(true)
    setError(null)

    // Uma consulta só, com a curadoria embutida — e **sem `.order`**: a ordem da Home tem um dono,
    // `orderSections`, que desempata `position` igual por `id` (`HOME-12`). Ordenar também no
    // PostgREST daria uma segunda resposta para a mesma pergunta, e a do banco não desempata.
    const { data, error: readError } = await supabase
      .from('home_sections')
      .select('*, items:home_section_items(*, product:products(slug))')

    // Resposta de uma leitura que já foi superada por outra: descartada inteira, inclusive o erro.
    // Sem este recorte, a leitura velha sobrescreveria o resultado da nova.
    if (meu !== pedido.current) return

    if (readError || !data) {
      // **Na revalidação a lista FICA** (`VIV-07`): a faixa de erro aparece sobre os dados que já
      // estavam na tela. Esvaziar aqui apagaria a Home inteira por causa de uma releitura que falhou
      // depois de uma gravação que deu certo.
      if (modo === 'inicial') setRows([])
      setError(readError?.message ?? 'Não foi possível carregar as seções da Home.')
      setLoading(false)
      return
    }

    setRows((data as unknown as DbHomeSection[]).map(mapSection))
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchSections('inicial')
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
    if (!writeError) await fetchSections('revalidar')
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
    if (!writeError) await fetchSections('revalidar')
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
    /**
     * **O interruptor responde na hora** (`VIV-10`).
     *
     * É a única escrita otimista do painel, e ela entra porque é onde a latência é sentida: o
     * controle é um interruptor, e um interruptor que só se mexe depois da ida ao banco parece
     * quebrado — a dona clica de novo, e o segundo clique desfaz o primeiro.
     *
     * Otimismo é dívida de reconciliação, e o caminho de volta está escrito aqui mesmo: a falha
     * devolve o valor anterior **antes** de o erro subir, e é a tela que mostra a mensagem **do
     * banco** (inclusive o `23514` da última seção ativa — `AD-029` não é antecipado em lugar
     * nenhum).
     *
     * O valor anterior sai de `rows` e não do argumento: `!active` daria o mesmo número por
     * coincidência hoje, e mentiria no dia em que a linha já estivesse no estado pedido.
     */
    const anterior = rows.find(r => r.id === id)
    if (anterior) setRows(prev => prev.map(r => (r.id === id ? { ...r, active } : r)))

    const { error: writeError } = await supabase
      .from('home_sections')
      .update({ active })
      .eq('id', id)

    if (writeError) {
      if (anterior) {
        setRows(prev => prev.map(r => (r.id === id ? { ...r, active: anterior.active } : r)))
      }
      return writeError as HomeWriteError
    }

    // A releitura confirma o que a tela já mostra — e é por isso que ela **não pisca**: o valor
    // otimista e o do banco são o mesmo, então o interruptor não volta e vai de novo (`VIV-10`).
    await fetchSections('revalidar')
    return null
  }

  const deleteSection = async (id: string) => {
    const { error: writeError } = await supabase.from('home_sections').delete().eq('id', id)
    if (!writeError) await fetchSections('revalidar')
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
    if (!writeError) await fetchSections('revalidar')
    return (writeError as HomeWriteError | null) ?? null
  }

  /**
   * A curadoria: apaga os itens da seção e grava a lista nova, na ordem dela.
   *
   * Lista vazia é **"voltar ao automático"** (`HOME-33`) — só o `delete`, sem `insert`. É uma
   * operação, e não a sincronização de dois campos que uma flag `auto | manual` exigiria.
   *
   * ⚠️ **`insert` em lote exige as MESMAS chaves em todos os objetos** (`PGRST102 All object keys
   * must match`), medido no probe da T11. Por isso cada linha vai com as sete colunas escritas, com
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
          image_mobile_url: item.image_mobile_url ?? null,
          alt: item.alt ?? null,
          label_snapshot: item.label_snapshot ?? null,
        })),
      )
      // `DST-13` — o `delete` passou e o `insert` não: a seção está **sem uma peça agora**, e a
      // Home já mudou. Devolver o erro cru do banco faria a dona salvar de novo achando que "não
      // salvou", sem saber que a loja já está sem o bloco.
      //
      // A notícia nasce aqui porque **só aqui se sabe que o `delete` passou**: quem chama recebe um
      // `HomeWriteError` e não tem como distinguir esta falha da do `update`. Um dono só.
      //
      // O motivo do banco continua inteiro no fim — ele é o que permite saber *por que* não entrou
      // (permissão, coluna, restrição), e escondê-lo trocaria um erro legível por uma frase bonita.
      if (insertError) {
        const doBanco = insertError as HomeWriteError
        return {
          ...doBanco,
          message: `${CURADORIA_PERDIDA} Motivo do banco: ${doBanco.message}`,
        }
      }
    }

    await fetchSections('revalidar')
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
