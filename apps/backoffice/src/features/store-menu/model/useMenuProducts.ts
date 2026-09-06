// Os produtos que o editor de banner precisa nomear (feature 39, T25).
//
// Duas perguntas, uma consulta cada, e as duas existem por um motivo diferente:
//
// - **"quais produtos casam com o que a dona digitou?"** — o seletor de destino. Sem busca, escolher
//   uma peça significaria colar um uuid, e um uuid errado vira banner que não renderiza (a validação
//   é na leitura) sem nada em tela dizendo por quê.
// - **"como se chama o produto que este banner já aponta?"** — a linha do banner gravado. Sem isso
//   ela mostraria o id, e a dona não teria como saber se o destino ainda é o que ela escolheu.

import { useEffect, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import type { MenuProduct } from '@estrelinha/core/menu'

/** A partir de quantas letras a busca sai. Menos que isso traz meio catálogo. */
export const MINIMO_PARA_BUSCAR = 2
const TETO = 20

/**
 * `products.id` é `uuid`, e um valor que não seja uuid dentro de `in('id', …)` derruba a consulta
 * INTEIRA com `22P02` — medido na feature 34, no importador da Nuvemshop, que grava
 * `nuvemshop:<nome>` no item que não casou. O destino do banner mora em jsonb, onde qualquer string
 * cabe; sem este recorte, um destino escrito à mão apagaria o nome de **todos** os outros.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const COLUNAS = 'id, name, slug, description, is_active'

interface Retorno {
  /** O que a busca achou. Vazio enquanto o termo for curto demais. */
  resultados: MenuProduct[]
  /** Os produtos já apontados por algum banner, por id — para a linha poder dizer o nome. */
  porId: Record<string, MenuProduct>
  buscando: boolean
}

export const useMenuProducts = (termo: string, ids: readonly string[]): Retorno => {
  const [resultados, setResultados] = useState<MenuProduct[]>([])
  const [porId, setPorId] = useState<Record<string, MenuProduct>>({})
  const [buscando, setBuscando] = useState(false)

  const busca = termo.trim()
  // Chave estável: a lista de ids muda de identidade a cada render de quem chama, e sem isto o
  // efeito rodaria para sempre.
  const chaveIds = [...new Set(ids.filter(id => UUID.test(id)))].sort().join(',')

  useEffect(() => {
    let vivo = true
    if (busca.length < MINIMO_PARA_BUSCAR) {
      setResultados([])
      return () => { vivo = false }
    }

    setBuscando(true)
    // `is_active` vem explícito e não é presumido: `admin full products` é `FOR ALL`, então a
    // listagem do painel enxerga o inativo — e o banner que apontasse para ele **não renderizaria**
    // na loja. Melhor a dona ver "inativo" aqui do que descobrir pelo painel vazio.
    supabase
      .from('products')
      .select(COLUNAS)
      .ilike('name', `%${busca}%`)
      .order('name')
      .limit(TETO)
      .then(({ data, error }) => {
        if (!vivo) return
        setResultados(error ? [] : ((data ?? []) as unknown as MenuProduct[]))
        setBuscando(false)
      })

    return () => { vivo = false }
  }, [busca])

  useEffect(() => {
    let vivo = true
    const lista = chaveIds === '' ? [] : chaveIds.split(',')
    if (lista.length === 0) {
      setPorId({})
      return () => { vivo = false }
    }

    supabase
      .from('products')
      .select(COLUNAS)
      .in('id', lista)
      .then(({ data, error }) => {
        if (!vivo) return
        const mapa: Record<string, MenuProduct> = {}
        for (const linha of (error ? [] : ((data ?? []) as unknown as MenuProduct[]))) {
          mapa[linha.id] = linha
        }
        setPorId(mapa)
      })

    return () => { vivo = false }
  }, [chaveIds])

  return { resultados, porId, buscando }
}
