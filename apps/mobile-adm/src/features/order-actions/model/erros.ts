import { useSyncExternalStore } from 'react'
import type { PedidoDaAcao } from '@estrelinha/core/order-actions'

/**
 * O erro de uma ação, POR PEDIDO, em módulo (feature `75`, `MAA-35`, `MAA-36`; design §3.5/§3.7).
 *
 * O cartão da lista e o rodapé do detalhe leem o MESMO erro (`useErroDoPedido(id)`): a falha não some
 * sozinha (`role="alert"`, fica até a próxima ação), e não pode morrer com o cartão que sai do recorte.
 *
 * O erro leva a frase (pronta, de `core`) e a `retentativa`: o que o "Tentar de novo" reenvia —
 * `{ tipo: 'primaria' }` para `PARTIAL_MATERIAL`, o rastreio já normalizado para `PARTIAL_TRACKING`,
 * `null` quando não há o que reenviar sem a Adri decidir de novo.
 */
export interface ErroDaAcao {
  frase: string
  retentativa: PedidoDaAcao | null
}

/**
 * A ação que GEROU o erro (feature `82`, Fase 5, T17 — `BUG-20261026-erro-de-uma-acao-aparece-em-outra`).
 *
 * Com a `82` o mesmo pedido tem três lugares de ação, e o erro único da `75` aparecia no lugar errado
 * (a falha de "Recebi o material" dentro da folha do envelope; a do envelope no rodapé; a de "Colocar
 * em produção" longe do botão). O erro continua UM por pedido — a última ação é a dona dele —, mas cada
 * superfície desenha só o seu (`erroDe`). A origem fica AO LADO da frase, não dentro de `ErroDaAcao`:
 * a forma `{ frase, retentativa }` que a `75` assere por igualdade não muda.
 */
export type OrigemDoErro = PedidoDaAcao['tipo']

/** O rodapé do detalhe e o cartão da lista: a primária e o rastreio de saída (a folha deles). */
export const ERROS_DO_RODAPE: readonly OrigemDoErro[] = ['primaria', 'rastreio']

export interface EntradaDoErro {
  erro: ErroDaAcao
  de: OrigemDoErro
}

const erros = new Map<string, EntradaDoErro>()
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())
const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

/** Guarda (ou, com `null`, limpa) o erro do pedido, com a ação que o gerou (`de`). */
export const definirErro = (id: string, erro: ErroDaAcao | null, de: OrigemDoErro = 'primaria'): void => {
  if (erro === null) {
    if (erros.delete(id)) avisar()
    return
  }
  erros.set(id, { erro, de })
  avisar()
}

export const lerErro = (id: string): ErroDaAcao | null => erros.get(id)?.erro ?? null

/** A ação que gerou o erro guardado do pedido, ou `null` sem erro. */
export const lerOrigemDoErro = (id: string): OrigemDoErro | null => erros.get(id)?.de ?? null

/** O erro do pedido, com a origem — a entrada é a mesma referência até a próxima escrita. */
export const useEntradaDoErro = (id: string): EntradaDoErro | null => useSyncExternalStore(assinar, () => erros.get(id) ?? null)

export const useErroDoPedido = (id: string): ErroDaAcao | null => useEntradaDoErro(id)?.erro ?? null

/** Esquece todos os erros (troca de conta, testes). */
export const esquecerErros = (): void => {
  if (erros.size === 0) return
  erros.clear()
  avisar()
}
