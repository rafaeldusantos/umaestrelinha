// Compre Junto — a gravação dos adicionais da joia, depois de o produto existir.
//
// Mesma forma de `persistSuppliers`: `supabase-js` não abre transação entre chamadas, então a ordem
// dos passos é o que impede o pior estado (a joia sem nenhum adicional). Só se apaga o que a dona
// TIROU, depois se atualiza o que ficou e por último se insere o que é novo — nunca "apaga tudo e
// grava de novo". Toda escrita é recortada por `product_id`: gravar uma joia não toca o Compre Junto
// de outra.
//
// O `upsert` é por `id`, e não por `(product_id, position)`: a posição é única mas ADIADA
// (`deferrable`), e o Postgres não aceita chave adiada como alvo de `on conflict`. O que a adiada dá
// é poder trocar duas posições numa gravação só, que é o que reordenar faz.

import {
  addonCountRefusal,
  addonDiscountRefusal,
  addonIsMainRefusal,
  addonRepeatedRefusal,
} from '@estrelinha/core/buy-together'
import { addonsChanged, addonsToSave, type AddonDraft } from './addons'

type Erro = { message: string; code?: string } | null
type Resultado = PromiseLike<{ error: Erro }>

/** A fatia de `supabase-js` que esta função usa. Dublê pequeno = teste que prova o que importa. */
export interface AddonsClient {
  from: (table: string) => {
    insert: (rows: unknown) => Resultado
    upsert: (rows: unknown, options?: { onConflict?: string }) => Resultado
    delete: () => {
      eq: (column: string, value: string) => {
        in: (column: string, values: string[]) => Resultado
      }
    }
  }
}

const TABELA = 'product_buy_together'

/**
 * A recusa dos adicionais, antes de qualquer gravação: o teto, o desconto fora de 1% a 50%, a joia
 * como adicional de si mesma e a mesma peça em dois adicionais — as réguas de `core`. `null` = pode
 * gravar.
 */
export const addonsRefusal = (mainProductId: string | null, addons: readonly AddonDraft[]): string | null => {
  const completos = addonsToSave(addons)
  const teto = addonCountRefusal(completos.length)
  if (teto) return teto
  for (const a of completos) {
    const desconto = addonDiscountRefusal(a.discountPercent)
    if (desconto) return desconto
  }
  const vistos: string[] = []
  for (const a of completos) {
    if (a.kind !== 'product' || a.targetProductId === null) continue
    const propria = mainProductId ? addonIsMainRefusal(mainProductId, a.targetProductId) : null
    if (propria) return propria
    const repetida = addonRepeatedRefusal(a.targetProductId, vistos)
    if (repetida) return repetida
    vistos.push(a.targetProductId)
  }
  return null
}

const linha = (productId: string, a: AddonDraft, position: number) => ({
  product_id: productId,
  position,
  kind: a.kind,
  target_product_id: a.kind === 'product' ? a.targetProductId : null,
  list_id: a.kind === 'list' ? a.listId : null,
  target_variant_ids: a.kind === 'product' ? a.targetVariantIds : [],
  hidden_on_variant_ids: a.hiddenOnVariantIds,
  discount_percent: a.discountPercent ?? null,
})

/**
 * Grava os adicionais. Devolve `null` quando deu certo (ou não havia o que gravar) e a mensagem do
 * erro quando não deu — `string | null`, porque `strictNullChecks` está desligado.
 */
export const persistAddons = async (
  client: AddonsClient,
  productId: string,
  next: readonly AddonDraft[],
  saved: readonly AddonDraft[],
): Promise<string | null> => {
  if (!addonsChanged(next, saved)) return null
  const recusa = addonsRefusal(productId, next)
  if (recusa) return recusa

  const rows = addonsToSave(next)

  // 1. O que a dona tirou. As posições são únicas por joia: quem sai precisa liberar a posição
  // antes de quem fica ou entra ocupá-la.
  const mantidos = new Set(rows.map(a => a.id).filter((id): id is string => id !== null))
  const tirados = saved.map(a => a.id).filter((id): id is string => id !== null && !mantidos.has(id))
  if (tirados.length > 0) {
    const { error } = await client.from(TABELA).delete().eq('product_id', productId).in('id', tirados)
    if (error) return error.message
  }

  // 2. O que ficou, com a posição nova.
  const existentes = rows.flatMap((a, i) => (a.id !== null ? [{ id: a.id, ...linha(productId, a, i) }] : []))
  if (existentes.length > 0) {
    const { error } = await client.from(TABELA).upsert(existentes, { onConflict: 'id' })
    if (error) return error.message
  }

  // 3. O que é novo.
  const novos = rows.flatMap((a, i) => (a.id === null ? [linha(productId, a, i)] : []))
  if (novos.length > 0) {
    const { error } = await client.from(TABELA).insert(novos)
    if (error) return error.message
  }
  return null
}
