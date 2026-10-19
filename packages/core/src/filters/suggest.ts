// Filtros nas variações (feature 67) — as sugestões de marcação, com o motivo (VFL-18..22, VFL-29..31).
//
// Uma função, chamada pelas DUAS telas do painel: a fila de sugestões e o bloco do formulário do
// produto (VFL-31). Escrita em cada tela, a fila diria "nenhuma sugestão" para uma peça cujo
// formulário mostra três — e nada quebraria.
//
// A regra:
//
//   termos(v)   = [v.name, ...v.suggest_terms]
//   fonte opção = para cada (eixo e, texto t) de uma variação ATIVA da peça: algum termo casa t
//                 ⇒ marcar por opção (e, t)
//   fonte nome  = algum termo casa o nome da peça                 ⇒ marcar na peça toda
//   fonte tag   = algum termo casa uma tag, ou casa com os espaços removidos dos dois lados
//                 (`Prata925` casa "Prata 925")                    ⇒ marcar na peça toda
//   some quando: a marcação equivalente já existe, ou há recusa para (peça, valor, alvo)
//
// O casamento é de TOKENS CONTÍGUOS, depois da dobra (sem acento, sem maiúscula, partido em tudo que
// não é letra nem número): "Ouro" casa "Folheado a Ouro Branco", e "Prata" NÃO casa "Prateado". É
// explicável em uma frase, e é por isso que cada sugestão carrega o motivo — quem decide é a Adri.
//
// A recusa é por ALVO, não por fonte: recusar "Tag 'Prata925' ⇒ Prata 925 (peça toda)" cala também
// "Nome contém 'prata 925'", porque as duas afirmam a mesma coisa (o par vazio da migration).
//
// Sugestão NUNCA vira marcação aqui: este módulo só lê. Gravar é do "Aprovar" e do "Salvar".

import type { FilterCatalog, FilterableProduct, FilterableVariant } from './types.ts'

/** Dobra e parte: NFD → sem marca combinante → minúsculas → tokens alfanuméricos, sem vazios. */
export const foldTokens = (texto: string | null | undefined): string[] =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

const contiguo = (agulha: readonly string[], palheiro: readonly string[]): boolean => {
  if (agulha.length === 0 || agulha.length > palheiro.length) return false
  for (let i = 0; i + agulha.length <= palheiro.length; i++) {
    if (agulha.every((t, j) => palheiro[i + j] === t)) return true
  }
  return false
}

/** Os tokens do termo aparecem CONTÍGUOS, e inteiros, nos tokens do texto. Termo sem token não casa. */
export const termMatches = (termo: string, texto: string): boolean => contiguo(foldTokens(termo), foldTokens(texto))

const semEspaco = (texto: string): string => texto.replace(/\s+/g, '')

/** A forma da tag: além do casamento normal, os dois lados sem espaço (`Prata925` × "Prata 925"). */
const tagMatches = (termo: string, tag: string): boolean =>
  termMatches(termo, tag) || termMatches(semEspaco(termo), semEspaco(tag))

export type SuggestionSource = 'option' | 'name' | 'tag'

/** Uma recusa gravada. O alvo "peça toda" é o par vazio, como na tabela. */
export interface SuggestionDismissal {
  product_id: string
  value_id: string
  option_name: string
  option_value: string
}

export interface SuggestableProduct extends FilterableProduct<FilterableVariant> {
  id: string
  name: string
  tags?: readonly string[] | null
}

export interface SuggestInput {
  catalog: FilterCatalog
  products: readonly SuggestableProduct[]
  dismissals?: readonly SuggestionDismissal[] | null
}

export interface Suggestion {
  product_id: string
  value_id: string
  source: SuggestionSource
  /** O alvo. Vazios os dois ⇒ a peça toda (fontes nome e tag); preenchidos ⇒ a opção (fonte opção). */
  option_name: string
  option_value: string
  /** O que casou, como está no catálogo: o texto da opção, o termo (nome) ou a tag. */
  evidence: string
  /**
   * Por opção, quando o mesmo valor já está marcado na peça toda: aprovar TROCA a marcação da peça
   * toda pela da opção (VFL-27). A tela avisa antes; quem decide a troca não é este módulo.
   */
  replacesWholeMark: boolean
}

const chaveDoAlvo = (produto: string, valor: string, eixo: string, texto: string): string =>
  `${produto}\u0000${valor}\u0000${eixo}\u0000${texto}`

/** Os pares (eixo, texto) vendidos pela peça: só de variação ATIVA, na ordem de posição e de chegada. */
const opcoesAtivas = (produto: SuggestableProduct): [string, string][] => {
  const vistos = new Set<string>()
  const out: [string, string][] = []
  const variantes = (produto.variants ?? [])
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.is_active)
    .sort((a, b) => (a.v.position ?? a.i) - (b.v.position ?? b.i) || a.i - b.i)
  for (const { v } of variantes) {
    for (const [eixo, texto] of Object.entries(v.option_values ?? {})) {
      if (typeof texto !== 'string' || texto === '') continue
      const k = `${eixo}\u0000${texto}`
      if (vistos.has(k)) continue
      vistos.add(k)
      out.push([eixo, texto])
    }
  }
  return out
}

/**
 * As sugestões pendentes do catálogo inteiro (ou de uma peça só: basta passar uma). Uma por
 * (peça, valor, fonte, alvo): duas tags que casam o mesmo valor dão uma sugestão, com a primeira.
 */
export const suggestMarks = (input: SuggestInput): Suggestion[] => {
  const recusas = new Set(
    (input.dismissals ?? []).map(d => chaveDoAlvo(d.product_id, d.value_id, d.option_name ?? '', d.option_value ?? '')),
  )
  const valores = [...input.catalog.values].sort((a, b) => a.sort_order - b.sort_order)
  const out: Suggestion[] = []

  for (const p of input.products) {
    const naPeca = new Set(p.filter_value_ids ?? [])
    const porOpcao = new Set((p.option_marks ?? []).map(m => chaveDoAlvo(p.id, m.value_id, m.option_name, m.option_value)))
    const opcoes = opcoesAtivas(p)

    for (const v of valores) {
      const termos = [v.name, ...(v.suggest_terms ?? [])].filter(t => foldTokens(t).length > 0)

      // fonte opção ⇒ alvo (eixo, texto)
      for (const [eixo, texto] of opcoes) {
        const k = chaveDoAlvo(p.id, v.id, eixo, texto)
        if (porOpcao.has(k) || recusas.has(k)) continue
        if (!termos.some(t => termMatches(t, texto))) continue
        out.push({
          product_id: p.id,
          value_id: v.id,
          source: 'option',
          option_name: eixo,
          option_value: texto,
          evidence: texto,
          replacesWholeMark: naPeca.has(v.id),
        })
      }

      // fontes nome e tag ⇒ alvo peça toda
      if (naPeca.has(v.id) || recusas.has(chaveDoAlvo(p.id, v.id, '', ''))) continue
      const termoDoNome = termos.find(t => termMatches(t, p.name ?? ''))
      if (termoDoNome !== undefined) {
        out.push({
          product_id: p.id,
          value_id: v.id,
          source: 'name',
          option_name: '',
          option_value: '',
          evidence: termoDoNome,
          replacesWholeMark: false,
        })
      }
      const tag = (p.tags ?? []).find(t => termos.some(termo => tagMatches(termo, t)))
      if (tag !== undefined) {
        out.push({
          product_id: p.id,
          value_id: v.id,
          source: 'tag',
          option_name: '',
          option_value: '',
          evidence: tag,
          replacesWholeMark: false,
        })
      }
    }
  }
  return out
}

/** O motivo, em texto (VFL-18): "Opção Cor = Folheado a Ouro Rosé", "Nome contém 'pingente'", "Tag 'Prata925'". */
export const suggestionReason = (s: Pick<Suggestion, 'source' | 'option_name' | 'evidence'>): string => {
  if (s.source === 'option') return `Opção ${s.option_name} = ${s.evidence}`
  if (s.source === 'name') return `Nome contém '${s.evidence.toLocaleLowerCase('pt-BR')}'`
  return `Tag '${s.evidence}'`
}

export interface SuggestionGroup {
  /** Estável entre execuções: serve de `key` na lista e de recorte na URL da fila. */
  key: string
  source: SuggestionSource
  value_id: string
  /** `'option'` quando a aprovação marca a opção; `'product'` quando marca a peça toda. */
  target: 'option' | 'product'
  option_name: string
  evidence: string
  reason: string
  suggestions: Suggestion[]
}

/**
 * As sugestões agrupadas por MOTIVO: (fonte, eixo, o que casou, valor, alvo). O eixo é o da grafia
 * real da peça — "Tipos de elo" e "Tipo de Elo" viram duas linhas, porque o motivo mostra de onde cada
 * uma vem. Ordem: mais peças primeiro, e o motivo como desempate.
 */
export const groupSuggestions = (list: readonly Suggestion[]): SuggestionGroup[] => {
  const grupos = new Map<string, SuggestionGroup>()
  for (const s of list) {
    const target = s.source === 'option' ? 'option' : 'product'
    const evidencia = s.source === 'name' ? s.evidence.toLocaleLowerCase('pt-BR') : s.evidence
    const key = [s.source, s.option_name, evidencia, s.value_id, target].join('\u0000')
    let g = grupos.get(key)
    if (!g) {
      g = {
        key,
        source: s.source,
        value_id: s.value_id,
        target,
        option_name: s.option_name,
        evidence: s.evidence,
        reason: suggestionReason(s),
        suggestions: [],
      }
      grupos.set(key, g)
    }
    g.suggestions.push(s)
  }
  return [...grupos.values()].sort(
    (a, b) => b.suggestions.length - a.suggestions.length || a.reason.localeCompare(b.reason, 'pt-BR'),
  )
}
