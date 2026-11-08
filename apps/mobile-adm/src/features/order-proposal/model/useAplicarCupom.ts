import { useCallback, useRef, useState } from 'react'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { conferirResumo } from '../api/portaDePropostas'
import { CUPOM_NAO_CONFERIDO, DIGITE_O_CODIGO, codigoDigitado, type CupomAplicado, type PedidoDoResumo } from './descontos'

export interface AplicarCupom {
  aplicando: boolean
  /** A recusa do último "Aplicar" — o texto da loja, ou a frase de quem não conferiu. */
  recusa: string | null
  /** A recusa (`42501`) que a porta lançou — a página a entrega à MESMA vigia das leituras. */
  erroBruto: unknown
  /** Confere o código pela prévia, com a escolha de agora; devolve o cupom quando ele vale. */
  aplicar: (texto: string, base: Omit<PedidoDoResumo, 'coupon_code'>) => Promise<CupomAplicado | null>
  /** Mostra uma recusa que veio de fora (o resumo vivo recusou o cupom já aplicado). */
  recusar: (frase: string | null) => void
}

/**
 * "Aplicar" do cupom: a MESMA prévia do resumo vivo, com o código digitado. O app não lê
 * cupons: o servidor diz se vale — pela regra e com os textos da loja, considerando o e-mail da
 * cliente — e devolve o que é preciso para nomeá-lo. Vazio não vai à rede.
 */
export const useAplicarCupom = (): AplicarCupom => {
  const trava = useRef(false)
  const [aplicando, setAplicando] = useState(false)
  const [recusa, setRecusa] = useState<string | null>(null)
  const [erroBruto, setErroBruto] = useState<unknown>(null)

  const aplicar = useCallback<AplicarCupom['aplicar']>(async (texto, base) => {
    const codigo = codigoDigitado(texto)
    if (codigo === '') {
      setRecusa(DIGITE_O_CODIGO)
      return null
    }
    if (trava.current) return null
    trava.current = true
    setAplicando(true)
    setRecusa(null)
    try {
      const r = await conferirResumo({ ...base, coupon_code: codigo })
      if (r.tipo === 'ok' && r.dado.coupon) {
        const c = r.dado.coupon
        return { codigo: c.code, tipo: c.type, valor: Number(c.value), primeiraCompra: c.first_order_only === true }
      }
      setRecusa(r.tipo === 'erro' && r.frase ? r.frase : CUPOM_NAO_CONFERIDO)
      return null
    } catch (e) {
      if (isAccessDenied(e)) setErroBruto(e)
      else setRecusa(CUPOM_NAO_CONFERIDO)
      return null
    } finally {
      trava.current = false
      setAplicando(false)
    }
  }, [])

  const recusar = useCallback((frase: string | null) => setRecusa(frase), [])

  return { aplicando, recusa, erroBruto, aplicar, recusar }
}
