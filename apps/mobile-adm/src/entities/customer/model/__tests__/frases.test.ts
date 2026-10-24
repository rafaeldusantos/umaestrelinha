// Feature `76` · T15 — cada frase fixa e cada função de frase da aba Clientes, escritas POR EXTENSO,
// com singular e plural nos dois sentidos (`MAC-04`, `MAC-10`, `MAC-15`, `MAC-16`, `MAC-35`). Derivar o
// esperado do módulo provaria que ele é igual a si mesmo.
import { afterEach, describe, expect, it, vi } from 'vitest'

import { cliente, pedidoDaFicha } from '@/test/clientes'

import {
  FALHA_AO_ABRIR_CLIENTE,
  FALHA_DA_LISTA,
  FALHA_DOS_PEDIDOS,
  LEGENDA_DOS_NUMEROS,
  LIMPAR_CLIENTES,
  NAO_ENCONTREI_CLIENTE,
  VAZIO_EM_ABERTO,
  VAZIO_SEM_CLIENTE,
  VAZIO_SEM_RECORRENTE,
  clienteDesde,
  contagemDaLista,
  rotuloDoPedido,
  subtituloDaLinha,
  ticketMedio,
  tituloDosPedidos,
  vazioDaBusca,
} from '../frases'

afterEach(() => vi.useRealTimers())

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const semNbsp = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ')

describe('as frases fixas, por extenso', () => {
  it('vazios e falhas', () => {
    expect(VAZIO_SEM_CLIENTE).toBe('Ainda não há clientes.')
    expect(VAZIO_EM_ABERTO).toBe('Ninguém com pedido em aberto agora.')
    expect(VAZIO_SEM_RECORRENTE).toBe('Ninguém comprou mais de uma vez ainda.')
    expect(LIMPAR_CLIENTES).toBe('Limpar')
    expect(FALHA_DA_LISTA).toBe('Não consegui carregar as clientes.')
    expect(FALHA_DOS_PEDIDOS).toBe('Não consegui carregar os pedidos.')
    expect(NAO_ENCONTREI_CLIENTE).toBe('Não encontrei esta cliente.')
    expect(FALHA_AO_ABRIR_CLIENTE).toBe('Não consegui abrir agora. Tente de novo.')
    expect(LEGENDA_DOS_NUMEROS).toBe('Contam só os pedidos pagos.')
  })

  it('tom memorial: nenhuma exclamação, emoji, urgência ou ranking', () => {
    const todas = [
      VAZIO_SEM_CLIENTE, VAZIO_EM_ABERTO, VAZIO_SEM_RECORRENTE, LIMPAR_CLIENTES, FALHA_DA_LISTA, FALHA_DOS_PEDIDOS, NAO_ENCONTREI_CLIENTE, FALHA_AO_ABRIR_CLIENTE,
      LEGENDA_DOS_NUMEROS, contagemDaLista(12), contagemDaLista(1), subtituloDaLinha(cliente(), LIDO_EM),
      subtituloDaLinha(cliente({ orders_paid: 0 }), LIDO_EM), vazioDaBusca('ana'), tituloDosPedidos(0), tituloDosPedidos(5),
      clienteDesde('2026-03-12T15:20:11+00:00', { city: 'Porto Alegre', state: 'RS' }),
    ]
    for (const f of todas) {
      expect(f).not.toMatch(/!/)
      expect(f).not.toMatch(/\p{Extended_Pictographic}/u)
      expect(f).not.toMatch(/vip|melhor|top|últim[ao]s? unidades|corra|hoje!/i)
    }
  })
})

describe('contagemDaLista (MAC-04)', () => {
  it('singular', () => expect(contagemDaLista(1)).toBe('1 cliente · das atividades mais recentes para as mais antigas'))
  it('plural', () => expect(contagemDaLista(12)).toBe('12 clientes · das atividades mais recentes para as mais antigas'))
  it('zero é plural', () => expect(contagemDaLista(0)).toBe('0 clientes · das atividades mais recentes para as mais antigas'))
  it('com e sem filtro, a mesma frase', () => expect(contagemDaLista(3, true)).toBe(contagemDaLista(3, false)))
})

describe('subtituloDaLinha (A8)', () => {
  it('uma compra, no singular', () =>
    expect(subtituloDaLinha(cliente({ orders_paid: 1, last_order_at: '2026-10-20T14:30:00.123456+00:00' }), LIDO_EM)).toBe('1 compra · última há 3 dias'))
  it('quatro compras, no plural', () =>
    expect(subtituloDaLinha(cliente({ orders_paid: 4, last_order_at: '2026-10-11T14:30:00.123456+00:00' }), LIDO_EM)).toBe('4 compras · última há 12 dias'))
  it('nunca pagou', () => expect(subtituloDaLinha(cliente({ orders_paid: 0, last_order_at: null }), LIDO_EM)).toBe('Sem compra paga ainda'))
  it('mesmo com a data, zero compra paga é "sem compra"', () =>
    expect(subtituloDaLinha(cliente({ orders_paid: 0, last_order_at: '2026-10-20T14:30:00+00:00' }), LIDO_EM)).toBe('Sem compra paga ainda'))
  it('usa o instante do BANCO: o relógio do aparelho trocado não muda o texto', () => {
    const c = cliente({ orders_paid: 2, last_order_at: '2026-10-20T14:30:00.123456+00:00' })
    const antes = subtituloDaLinha(c, LIDO_EM)
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    expect(subtituloDaLinha(c, LIDO_EM)).toBe(antes)
    expect(antes).toBe('2 compras · última há 3 dias')
  })
})

describe('os vazios da busca (MAC-10)', () => {
  it('aspas curvas e o termo', () => expect(vazioDaBusca('ana')).toBe('Não achei ninguém com “ana”.'))
  it('o termo vai aparado', () => expect(vazioDaBusca('  ana  ')).toBe('Não achei ninguém com “ana”.'))
  it('o termo é texto: `%` e aspas retas passam como vieram', () => expect(vazioDaBusca('50%"')).toBe('Não achei ninguém com “50%"”.'))
})

describe('clienteDesde (MAC-15)', () => {
  it('com cidade e estado', () =>
    expect(clienteDesde('2026-10-05T15:00:00+00:00', { city: 'Porto Alegre', state: 'RS' })).toBe('Porto Alegre/RS · cliente desde outubro 2026'))
  it('sem cidade: nenhum separador solto', () => {
    const f = clienteDesde('2026-03-12T15:20:11.482913+00:00', null)
    expect(f).toBe('cliente desde março 2026')
    expect(f).not.toMatch(/^\s*·|·\s*$/)
  })
  it('cidade sem estado', () => expect(clienteDesde('2026-03-12T15:20:11+00:00', { city: 'Gramado', state: null })).toBe('Gramado · cliente desde março 2026'))
  it('cidade em branco vale como sem cidade', () => expect(clienteDesde('2026-03-12T15:20:11+00:00', { city: '  ', state: 'RS' })).toBe('cliente desde março 2026'))
  it('o mês é o do fuso da loja: 1º de outubro às 01:00 UTC ainda é setembro em Porto Alegre', () =>
    expect(clienteDesde('2026-10-01T01:00:00+00:00', null)).toBe('cliente desde setembro 2026'))
  it('data ilegível: só a cidade, sem inventar mês', () => expect(clienteDesde('lixo', { city: 'Canoas', state: 'RS' })).toBe('Canoas/RS'))
})

describe('ticketMedio (MAC-16)', () => {
  it('null ⇒ travessão, nunca "R$ 0,00"', () => {
    expect(ticketMedio(null)).toBe('—')
    expect(ticketMedio(undefined)).toBe('—')
  })
  it('um valor com centavos', () => expect(semNbsp(ticketMedio(389.23))).toBe('R$ 389,23'))
  it('zero é um valor, e não ausência', () => expect(semNbsp(ticketMedio(0))).toBe('R$ 0,00'))
})

describe('tituloDosPedidos', () => {
  it('um', () => expect(tituloDosPedidos(1)).toBe('Pedidos · 1'))
  it('cinco', () => expect(tituloDosPedidos(5)).toBe('Pedidos · 5'))
  it('zero', () => expect(tituloDosPedidos(0)).toBe('Nenhum pedido ainda.'))
})

describe('rotuloDoPedido', () => {
  it('número e primeiro item', () => expect(rotuloDoPedido(pedidoDaFicha())).toBe('#0244 · Pingente Gota'))
  it('sem item: só o número', () => {
    expect(rotuloDoPedido(pedidoDaFicha({ item: null }))).toBe('#0244')
    expect(rotuloDoPedido(pedidoDaFicha({ item: '   ' }))).toBe('#0244')
  })
  it('o prefixo vem de formatOrderNumber: não duplica o `#`', () => expect(rotuloDoPedido({ order_number: '#0244', item: 'Anel' })).toBe('#0244 · Anel'))
})
