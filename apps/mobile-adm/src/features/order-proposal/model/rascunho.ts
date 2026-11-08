import type { PecaParaProposta } from '@estrelinha/core/proposals'

import { COMBINADO_DESLIGADO, type CupomAplicado, type DescontoCombinado, type TipoDoCombinado } from './descontos'
import type { EstadoDaMontagem } from './montagem'
import { linhaDaEscolha, variacaoDe, type LinhaDaSacola } from './sacola'

/**
 * O RASCUNHO da montagem de um pedido no app — o único arquivo do repositório que cita a chave dele.
 * `rascunhoComDonoUnico.test.ts` recusa a chave em qualquer outro arquivo de `apps/*\/src`, testes
 * inclusos (eles importam `RASCUNHO_KEY`).
 *
 * Exceção estreita à regra de nada no aparelho (`semDadoDeClienteNoAparelho`): só para a volta
 * involuntária (o celular bloqueou, o Android matou o app, a Adri saiu da tela). Leva SÓ:
 *
 * - as peças — peça, variação, quantidade e gravação (nada do retrato: a linha é refeita do catálogo
 *   relido, com o preço de hoje);
 * - o cupom aplicado (a prévia o confere de novo no passo 3, e o tira se não valer mais);
 * - o tipo e o valor do desconto combinado, e se ele está ligado.
 *
 * Nunca a pessoa do pedido, a entrega, a observação, nem a justificativa do desconto: elas se escolhem
 * e se escrevem de novo. A forma gravada é montada aqui, campo por campo, e a lida é filtrada campo
 * por campo — uma chave a mais no objeto não passa nem na ida nem na volta.
 *
 * `localStorage`, e não `sessionStorage`: no app instalado o Android encerra o processo em segundo
 * plano, e a sessão da aba morre junto — o rascunho precisa sobreviver a isso. Preso à conta que o
 * gravou (`conta`, o id da conta do painel): outra conta não o lê, e a troca de conta o apaga.
 */
export const RASCUNHO_KEY = 'estrelinha-montagem-rascunho'

export interface PecaDoRascunho {
  pecaId: string
  variacaoId: string | null
  quantidade: number
  gravacao: string
}

export interface CombinadoDoRascunho {
  ligado: boolean
  tipo: TipoDoCombinado
  valor: string
}

export interface Rascunho {
  v: 1
  conta: string
  pecas: PecaDoRascunho[]
  cupom: CupomAplicado | null
  combinado: CombinadoDoRascunho
}

const pecaDoRascunho = (l: LinhaDaSacola): PecaDoRascunho => ({
  pecaId: l.pecaId,
  variacaoId: l.variacaoId,
  quantidade: l.quantidade,
  gravacao: l.gravacao,
})

const cupomDoRascunho = (c: CupomAplicado | null): CupomAplicado | null =>
  c ? { codigo: c.codigo, tipo: c.tipo, valor: c.valor, primeiraCompra: c.primeiraCompra } : null

/** O rascunho desta montagem, ou `null` — sem peça não há o que retomar. */
export const rascunhoDaMontagem = (estado: EstadoDaMontagem, conta: string): Rascunho | null => {
  if (estado.pecas.length === 0) return null
  return {
    v: 1,
    conta,
    pecas: estado.pecas.map(pecaDoRascunho),
    cupom: cupomDoRascunho(estado.cupom),
    combinado: { ligado: estado.combinado.ligado, tipo: estado.combinado.tipo, valor: estado.combinado.valor },
  }
}

/** A forma gravada, campo por campo: um campo a mais no objeto recebido não vai ao aparelho. */
const formaGravada = (r: Rascunho): Rascunho => ({
  v: 1,
  conta: r.conta,
  pecas: r.pecas.map((p) => ({ pecaId: p.pecaId, variacaoId: p.variacaoId, quantidade: p.quantidade, gravacao: p.gravacao })),
  cupom: cupomDoRascunho(r.cupom),
  combinado: { ligado: r.combinado.ligado, tipo: r.combinado.tipo, valor: r.combinado.valor },
})

/** Grava o rascunho (`null` o apaga). O armazenamento que lança não derruba a montagem. */
export const guardarRascunho = (r: Rascunho | null): void => {
  try {
    if (r === null) localStorage.removeItem(RASCUNHO_KEY)
    else localStorage.setItem(RASCUNHO_KEY, JSON.stringify(formaGravada(r)))
  } catch {
    // Sem armazenamento, a montagem segue só na memória da tela.
  }
}

export const apagarRascunho = (): void => guardarRascunho(null)

const ehTexto = (v: unknown): v is string => typeof v === 'string'
const ehObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

const pecaLida = (v: unknown): PecaDoRascunho | null => {
  if (!ehObjeto(v)) return null
  const { pecaId, variacaoId, quantidade, gravacao } = v
  if (!ehTexto(pecaId) || !(variacaoId === null || ehTexto(variacaoId)) || !ehTexto(gravacao)) return null
  if (typeof quantidade !== 'number' || !Number.isInteger(quantidade) || quantidade < 1) return null
  return { pecaId, variacaoId: ehTexto(variacaoId) ? variacaoId : null, quantidade, gravacao }
}

const cupomLido = (v: unknown): CupomAplicado | null => {
  if (!ehObjeto(v)) return null
  const { codigo, tipo, valor, primeiraCompra } = v
  if (!ehTexto(codigo) || (tipo !== 'percent' && tipo !== 'fixed' && tipo !== 'free_shipping')) return null
  if (typeof valor !== 'number' || typeof primeiraCompra !== 'boolean') return null
  return { codigo, tipo, valor, primeiraCompra }
}

const combinadoLido = (v: unknown): CombinadoDoRascunho => {
  if (!ehObjeto(v)) return { ligado: false, tipo: 'amount', valor: '' }
  const { ligado, tipo, valor } = v
  return {
    ligado: ligado === true,
    tipo: tipo === 'percent' ? 'percent' : 'amount',
    valor: ehTexto(valor) ? valor : '',
  }
}

/**
 * O rascunho guardado por ESTA conta, ou `null`. O de outra conta (ou ilegível) é apagado: não se
 * retoma nunca, e não deve ficar no aparelho.
 */
export const lerRascunho = (conta: string | null): Rascunho | null => {
  let cru: string | null
  try {
    cru = localStorage.getItem(RASCUNHO_KEY)
  } catch {
    return null
  }
  if (cru === null) return null
  let dado: unknown
  try {
    dado = JSON.parse(cru)
  } catch {
    apagarRascunho()
    return null
  }
  if (!ehObjeto(dado) || dado.v !== 1 || conta === null || dado.conta !== conta || !Array.isArray(dado.pecas)) {
    apagarRascunho()
    return null
  }
  const pecas = dado.pecas.map(pecaLida).filter((p): p is PecaDoRascunho => p !== null)
  if (pecas.length === 0) {
    apagarRascunho()
    return null
  }
  return { v: 1, conta, pecas, cupom: cupomLido(dado.cupom), combinado: combinadoLido(dado.combinado) }
}

/** O que o rascunho devolve à montagem — as peças, o cupom e o desconto combinado. */
export interface Retomada {
  pecas: LinhaDaSacola[]
  cupom: CupomAplicado | null
  combinado: DescontoCombinado
  /** Quantas peças do rascunho saíram do catálogo e não voltaram. */
  fora: number
}

/**
 * A retomada do rascunho: as linhas refeitas do catálogo relido (o preço, a foto e as medidas de
 * hoje), o cupom e o desconto combinado sem justificativa. A peça (ou a variação) que saiu do catálogo
 * não volta, e é contada em `fora`.
 */
export const retomadaDoRascunho = (r: Rascunho, catalogo: readonly PecaParaProposta[]): Retomada => {
  const pecas: LinhaDaSacola[] = []
  let fora = 0
  r.pecas.forEach((p, i) => {
    const peca = catalogo.find((c) => c.id === p.pecaId)
    const variacao = peca ? variacaoDe(peca, p.variacaoId) : null
    if (!peca || (p.variacaoId !== null && !variacao)) {
      fora += 1
      return
    }
    pecas.push(linhaDaEscolha(`rascunho-${i + 1}`, peca, variacao, p.quantidade, p.gravacao))
  })
  return {
    pecas,
    cupom: pecas.length > 0 ? r.cupom : null,
    combinado: { ...COMBINADO_DESLIGADO, ligado: r.combinado.ligado, tipo: r.combinado.tipo, valor: r.combinado.valor },
    fora,
  }
}
