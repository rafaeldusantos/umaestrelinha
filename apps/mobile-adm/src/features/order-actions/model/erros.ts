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

const erros = new Map<string, ErroDaAcao>()
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())
const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

/** Guarda (ou, com `null`, limpa) o erro do pedido. */
export const definirErro = (id: string, erro: ErroDaAcao | null): void => {
  if (erro === null) {
    if (erros.delete(id)) avisar()
    return
  }
  erros.set(id, erro)
  avisar()
}

export const lerErro = (id: string): ErroDaAcao | null => erros.get(id) ?? null

export const useErroDoPedido = (id: string): ErroDaAcao | null => useSyncExternalStore(assinar, () => erros.get(id) ?? null)

/** Esquece todos os erros (troca de conta, testes). */
export const esquecerErros = (): void => {
  if (erros.size === 0) return
  erros.clear()
  avisar()
}
