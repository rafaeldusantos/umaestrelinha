// A grade acompanha as opções — feature 81 (`AD-063`, OPV-01..03, 05..07, 09, 23, 24).
//
// Até aqui a grade só mudava quando alguém clicava **Regerar do cruzamento**, e as linhas novas
// nasciam pausadas e sem preço. Agora quem sincroniza é a página, chamando `syncGrid` a cada mudança
// das opções — e SÓ na mudança: abrir o produto não sincroniza nada (OPV-08), porque o banco pode
// guardar uma grade que diverge do cruzamento (órfãs vendidas e pausadas), e reconciliar na leitura
// sujaria o formulário e apagaria linhas sem ninguém pedir.
//
// Função pura de propósito, como `gridActions.ts`: "quais linhas sobrevivem a esta edição" é regra
// de negócio, e regra errada numa grade de 60 linhas é preço digitado perdido.
//
// **O refletido.** `state.options` são as opções que a grade atual REFLETE, alinhadas por posição
// com as opções do editor. A estrutura dele (ordem, opção acrescentada, opção removida) acompanha o
// editor em toda mudança; o CONTEÚDO (nomes e valores) só avança quando a reconciliação acontece. É
// isso que torna OPV-24 verdadeira: enquanto o nome está vazio, o refletido guarda o nome antigo, e
// quando um nome volta o re-chaveamento parte dele.

import { cartesian, diffGrid, optionValuesKey } from '@estrelinha/core/pricing'
import type { OptionValues, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { dobrarTexto } from '@/shared/lib/texto'
import { isTempVariantId, tempVariantId } from './persistProduct'

/** Os valores padrão do produto no momento da mudança — copiados para as linhas novas (OPV-02). */
export interface GridDefaults {
  price: number
  compare_price: number
  weight_kg: number
}

/** Uma operação do editor — o que a tela FEZ, não o array resultante. */
export type OptionsChange =
  | { kind: 'values'; index: number }
  | { kind: 'rename'; index: number }
  | { kind: 'addOption' }
  | { kind: 'removeOption'; index: number }
  | { kind: 'move'; from: number; to: number }

export interface GridSyncState {
  /** As opções que a grade atual reflete (a última reconciliação), alinhadas por posição. */
  options: ProductOption[]
  variants: ProductVariant[]
}

export interface GridSyncResult {
  /** O novo refletido — guardar e devolver na próxima chamada. */
  options: ProductOption[]
  /** Mesma referência quando nada mudou (OPV-09). */
  variants: ProductVariant[]
  /** Linhas com id REAL que saíram do cruzamento — a página consulta pedidos antes de tirá-las. */
  orphans: ProductVariant[]
  skipped: 'incomplete' | 'duplicate' | null
}

const byPosition = (options: readonly ProductOption[]): ProductOption[] =>
  [...options].sort((a, b) => a.position - b.position)

const cleanValues = (option: ProductOption): string[] =>
  (option.values ?? []).map(v => v.trim()).filter(v => v !== '')

/** A mesma régua de `cartesian`: só entra na grade a opção com nome E com valores. */
const isEncoded = (option: ProductOption | undefined): option is ProductOption =>
  !!option && option.name.trim() !== '' && cleanValues(option).length > 0

/** OPV-23/24: o que impede reconciliar agora. */
const skipReason = (options: readonly ProductOption[]): GridSyncResult['skipped'] => {
  if (options.some(o => o.name.trim() === '' && cleanValues(o).length > 0)) return 'incomplete'
  const seen = new Set<string>()
  for (const option of options) {
    const folded = dobrarTexto(option.name.trim())
    if (folded === '') continue
    if (seen.has(folded)) return 'duplicate'
    seen.add(folded)
  }
  return null
}

/**
 * Aplica ao refletido a MESMA operação estrutural que o editor aplicou às opções.
 *
 * `position` é refeito pelo índice: o refletido volta na próxima chamada e é ordenado por ela, e uma
 * posição velha desfaria a permutação de um `move` feito enquanto a reconciliação estava pulada.
 */
const structural = (reflected: ProductOption[], change: OptionsChange): ProductOption[] =>
  structuralOrder(reflected, change).map((option, index) =>
    option.position === index ? option : { ...option, position: index },
  )

const structuralOrder = (reflected: ProductOption[], change: OptionsChange): ProductOption[] => {
  if (change.kind === 'move') {
    const next = [...reflected]
    if (change.from < 0 || change.from >= next.length) return next
    const [moved] = next.splice(change.from, 1)
    next.splice(Math.max(0, Math.min(change.to, next.length)), 0, moved)
    return next
  }
  if (change.kind === 'addOption') {
    return [...reflected, { name: '', values: [], position: reflected.length }]
  }
  if (change.kind === 'removeOption') return reflected.filter((_, i) => i !== change.index)
  return reflected
}

const sameValues = (a: OptionValues, b: OptionValues): boolean =>
  Object.keys(a).length === Object.keys(b).length && optionValuesKey(a) === optionValuesKey(b)

/**
 * OPV-07 (A5): a chave da opção removida sai de cada linha. Quando duas linhas colidem na mesma
 * combinação, a **primeira** (ordem da grade) sobrevive; as outras ficam com a chave antiga — e por
 * isso continuam fora do cruzamento, viram órfãs e seguem a régua de OPV-04.
 */
const dropKey = (variants: ProductVariant[], name: string): ProductVariant[] => {
  const seen = new Set<string>()
  return variants.map(variant => {
    const values = variant.option_values ?? {}
    if (!(name in values)) {
      seen.add(optionValuesKey(values))
      return variant
    }
    const rest = Object.fromEntries(Object.entries(values).filter(([k]) => k !== name)) as OptionValues
    const key = optionValuesKey(rest)
    if (seen.has(key)) return variant
    seen.add(key)
    return { ...variant, option_values: rest }
  })
}

/**
 * Re-chaveia uma linha das opções refletidas para as novas, por posição.
 *
 * - opção refletida na grade ⇒ o valor da linha passa a morar sob o nome novo (OPV-05);
 * - opção que acaba de entrar na grade ⇒ a linha que ainda não tem a chave ganha o **primeiro**
 *   valor dela (OPV-06, A4) — sem isso toda linha viraria órfã e os preços digitados se perderiam.
 *   A linha que já tem a chave (uma vendida e pausada de antes) a mantém: atribuir o primeiro valor
 *   a ela a "ressuscitaria" numa combinação que não é a dela.
 *
 * Chave que não pertence a nenhuma opção refletida fica como está: é grade divergente do banco, e
 * não cabe a esta função decidir sobre ela.
 */
const rekey = (
  values: OptionValues,
  reflected: readonly ProductOption[],
  next: readonly ProductOption[],
): OptionValues => {
  const base: OptionValues = { ...values }
  const pending: OptionValues = {}
  next.forEach((n, i) => {
    const r = reflected[i]
    const from = r?.name ?? ''
    if (isEncoded(r) || (isEncoded(n) && from.trim() !== '' && from in values)) {
      if (!(from in values)) return
      const value = values[from]
      // Sem nome novo (apagado e sem valores), a chave antiga fica: nunca uma chave vazia.
      const to = n.name.trim() === '' ? from : n.name
      delete base[from]
      pending[to] = value
      return
    }
    if (isEncoded(n) && !(n.name in values)) pending[n.name] = cleanValues(n)[0]
  })
  return { ...base, ...pending }
}

/**
 * Reconcilia a grade com as opções novas.
 *
 * Linha que continua no cruzamento volta como o **mesmo objeto** (OPV-03); linha nova nasce
 * **ativa** e com o preço, o preço "de" e o peso padrão do produto (OPV-02); linha que sai do
 * cruzamento some se é temporária, e se tem id real **fica na grade** e vai para `orphans` — quem
 * decide tirá-la é a página, depois de consultar os pedidos (OPV-04). Assim uma falha de rede nunca
 * apaga uma linha vendida.
 */
export const syncGrid = (
  state: GridSyncState,
  nextOptions: ProductOption[],
  change: OptionsChange,
  defaults: GridDefaults,
  productId: string,
): GridSyncResult => {
  const reflectedBefore = byPosition(state.options)
  const reflected = structural(reflectedBefore, change)
  const next = byPosition(nextOptions)

  let variants = state.variants
  if (change.kind === 'removeOption') {
    const removed = reflectedBefore[change.index]
    // SPEC_DEVIATION: a chave da opção removida sai das linhas mesmo quando a reconciliação é pulada
    // por conflito (OPV-23 diz que a grade não é reconciliada enquanto ele durar).
    // Reason: depois que a opção some do editor, o refletido não tem mais como saber qual chave
    // apagar; adiar o corte faria toda linha virar órfã quando o conflito se resolvesse. Nenhuma
    // linha é criada nem removida aqui — só a chave sai.
    if (isEncoded(removed)) variants = dropKey(variants, removed.name)
  }

  const skipped = skipReason(next)
  // SPEC_DEVIATION (design §1, regra 1): pulada, devolve o refletido com a ESTRUTURA do editor
  // (ordem, opção acrescentada/removida), não `state.options` intacto; nomes e valores não avançam.
  // Reason: com `state.options` intacto, um `move` feito durante o conflito desalinharia o casamento
  // por posição da chamada seguinte (caso provado em `gridSync.test.ts`, OPV-24).
  if (skipped) return { options: reflected, variants, orphans: [], skipped }

  let changed = variants !== state.variants
  const rekeyed = variants.map(variant => {
    const values = variant.option_values ?? {}
    const nextValues = rekey(values, reflected, next)
    if (sameValues(values, nextValues)) return variant
    changed = true
    return { ...variant, option_values: nextValues }
  })

  const diff = diffGrid(rekeyed, cartesian(next))
  const leaving = new Set(diff.toRemove)
  const orphans = diff.toRemove.filter(v => !isTempVariantId(v.id))
  const staying = rekeyed.filter(v => !leaving.has(v) || !isTempVariantId(v.id))
  if (staying.length !== rekeyed.length) changed = true

  const orZero = (value: number): number | null => (value > 0 ? value : null)
  // A linha nova vai DEPOIS da maior posição que ficou, nunca em `staying.length`: quando uma linha
  // do meio sai, as que ficam guardam posições acima dessa contagem, e a nova colidiria com uma
  // delas (QA da 81, posições 0, 1, 3, 4, 4, 5 no banco). Renumerar as que ficam quebraria OPV-03.
  const firstFree = staying.reduce((max, v) => Math.max(max, v.position + 1), 0)
  const created: ProductVariant[] = diff.toCreate.map((option_values, index) => ({
    id: tempVariantId(),
    product_id: productId,
    option_values,
    name: null,
    sku: null,
    price: orZero(defaults.price),
    compare_price: orZero(defaults.compare_price),
    stock: 0,
    weight_kg: orZero(defaults.weight_kg),
    image_url: null,
    is_active: true,
    position: firstFree + index,
  }))

  if (!changed && created.length === 0) {
    return { options: next, variants: state.variants, orphans, skipped: null }
  }
  return { options: next, variants: [...staying, ...created], orphans, skipped: null }
}
