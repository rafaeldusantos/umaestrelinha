// As marcações por OPÇÃO no formulário do produto — feature 67 (`VFL-03`, `VFL-05`, `VFL-06`).
//
// A identidade de uma opção é o TEXTO (eixo + valor, exatos), porque `products.options` é jsonb sem
// id. Isso tem duas consequências que esta peça resolve, e as duas são puras:
//
// - **renomear um eixo leva as marcações junto** (`remapOnAxisRename`). Sem isto, corrigir
//   "Tpos de elo" para "Tipo de elo" apagaria a curadoria daquele eixo em silêncio. A renomeação é
//   detectada por POSIÇÃO (`options[].position`): o eixo que estava na posição N com o nome A e
//   agora está na posição N com o nome B foi renomeado — desde que A não exista mais e B não
//   existisse antes. A segunda metade é o que impede uma REORDENAÇÃO (A e B trocando de lugar) de
//   ser lida como duas renomeações cruzadas.
// - **remover um texto, ou o eixo inteiro, apaga as marcações dele** (`pruneRemovedOptions`).
//   Marcação de texto que não existe mais não casa nada e só confunde.
//
// `marcacoesVigentes` é a composição das duas, e é o que a página passa ao bloco E ao save: as duas
// pontas leem a mesma projeção, então o que a tela mostra marcado é o que será gravado. Aplicada
// sobre a própria saída ela não muda nada (o eixo já renomeado não casa o nome antigo), e por isso
// pode rodar a cada render.
//
// `diffOptionMarks` é o plano do save: apaga só as que saíram e insere só as novas, agrupando as
// remoções por (eixo, texto) — uma requisição por opção que perdeu valores.

import type { OptionMark } from '@estrelinha/core/filters'

export interface EixoComPosicao {
  name: string
  values: readonly string[]
  position: number
}

const chave = (m: OptionMark): string => `${m.option_name}\u0000${m.option_value}\u0000${m.value_id}`

/** Leva as marcações de um eixo renomeado para o nome novo. As de outros eixos ficam como estão. */
export const remapOnAxisRename = (
  antes: readonly EixoComPosicao[],
  depois: readonly EixoComPosicao[],
  marks: readonly OptionMark[],
): OptionMark[] => {
  const nomesAntes = new Set(antes.map(e => e.name))
  const nomesDepois = new Set(depois.map(e => e.name))
  const renomeado = new Map<string, string>()
  for (const velho of antes) {
    const novo = depois.find(e => e.position === velho.position)
    if (!novo || novo.name === velho.name) continue
    if (nomesDepois.has(velho.name) || nomesAntes.has(novo.name)) continue
    renomeado.set(velho.name, novo.name)
  }
  if (renomeado.size === 0) return [...marks]
  return marks.map(m => (renomeado.has(m.option_name) ? { ...m, option_name: renomeado.get(m.option_name)! } : m))
}

/** Tira as marcações cujo (eixo, texto) não está mais em `options`. */
export const pruneRemovedOptions = (options: readonly EixoComPosicao[], marks: readonly OptionMark[]): OptionMark[] => {
  const existe = new Set(options.flatMap(e => e.values.map(v => `${e.name}\u0000${v}`)))
  return marks.filter(m => existe.has(`${m.option_name}\u0000${m.option_value}`))
}

/** O que a tela mostra e o save grava: renomeação aplicada, opções removidas fora, sem repetição. */
export const marcacoesVigentes = (
  salvos: readonly EixoComPosicao[],
  atuais: readonly EixoComPosicao[],
  marks: readonly OptionMark[],
): OptionMark[] => {
  const vistas = new Set<string>()
  return pruneRemovedOptions(atuais, remapOnAxisRename(salvos, atuais, marks)).filter(m => {
    const k = chave(m)
    if (vistas.has(k)) return false
    vistas.add(k)
    return true
  })
}

export interface OptionMarkPlan {
  toInsert: OptionMark[]
  /** Agrupadas por opção: cada entrada é UM `delete` (eixo e texto exatos, `in` nos valores). */
  toDelete: { option_name: string; option_value: string; value_ids: string[] }[]
}

export const diffOptionMarks = (salvas: readonly OptionMark[], proximas: readonly OptionMark[]): OptionMarkPlan => {
  const antes = new Set(salvas.map(chave))
  const depois = new Set(proximas.map(chave))
  const vistas = new Set<string>()
  const toInsert = proximas.filter(m => {
    const k = chave(m)
    if (antes.has(k) || vistas.has(k)) return false
    vistas.add(k)
    return true
  })
  const porOpcao = new Map<string, { option_name: string; option_value: string; value_ids: string[] }>()
  for (const m of salvas) {
    if (depois.has(chave(m))) continue
    const k = `${m.option_name}\u0000${m.option_value}`
    const g = porOpcao.get(k) ?? { option_name: m.option_name, option_value: m.option_value, value_ids: [] }
    if (!g.value_ids.includes(m.value_id)) g.value_ids.push(m.value_id)
    porOpcao.set(k, g)
  }
  return { toInsert, toDelete: [...porOpcao.values()] }
}
