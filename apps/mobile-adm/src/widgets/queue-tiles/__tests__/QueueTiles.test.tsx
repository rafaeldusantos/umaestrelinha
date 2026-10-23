// Feature `73` · T14 · `MAI-05`..`MAI-08`, `MAI-27` — "Precisa de você".
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QUEUE_BLOCKS } from '@estrelinha/core/orders'
import { resumo } from '@/test/resumo'
import { destino, montarNaInicio } from '@/test/rotas'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import QueueTiles from '../ui/QueueTiles'

const classes = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
const blocos = () => within(screen.getByTestId('faixa-da-fila')).getAllByRole('link')

const comDado = (r = resumo()) => ({ dado: r, falhou: false, tentarDeNovo: vi.fn() })

describe('QueueTiles — com dado', () => {
  it('os 4 blocos, na ordem de `QUEUE_BLOCKS`, com contagem, rótulo e frase do painel (MAI-05)', () => {
    montarNaInicio(<QueueTiles leitura={comDado()} />)
    const lista = blocos()
    expect(lista).toHaveLength(4)
    expect(lista.map((b) => b.getAttribute('data-bloco'))).toEqual(QUEUE_BLOCKS.map((b) => b.id))
    // Escrito por extenso: a régua não é derivada do objeto que ela mede.
    expect(lista[0]).toHaveTextContent('Aguardando material')
    expect(lista[0]).toHaveTextContent('Ninguém pode fazer nada até o envelope chegar')
    expect(lista[1]).toHaveTextContent('Pago, a separar')
    expect(lista[1]).toHaveTextContent('Material já recebido ou não exigido')
    expect(lista[2]).toHaveTextContent('Enviado sem rastreio')
    expect(lista[2]).toHaveTextContent('A cliente não foi avisada da postagem')
    expect(lista[3]).toHaveTextContent('Pix aguardando')
    expect(lista[3]).toHaveTextContent('Expiram sozinhos — nada a fazer')
    // Cada contagem vem do SEU campo (3, 2, 1, 4 na fixtura — todos diferentes).
    expect(within(lista[0]).getByText('3')).toBeInTheDocument()
    expect(within(lista[1]).getByText('2')).toBeInTheDocument()
    expect(within(lista[2]).getByText('1')).toBeInTheDocument()
    expect(within(lista[3]).getByText('4')).toBeInTheDocument()
  })

  it('só o primeiro tem acento, e só ele a idade do mais antigo pela régua do painel (`queueAge`, contra o `lido_em`)', () => {
    montarNaInicio(<QueueTiles leitura={comDado()} />)
    const lista = blocos()
    expect(lista.map((b) => b.getAttribute('data-acento'))).toEqual(['true', null, null, null])
    expect(classes(lista[0])).toContain('bg-estrelinha-ink')
    for (const b of lista.slice(1)) expect(classes(b)).toContain('bg-estrelinha-surface')
    // 13/10 10:00Z → 22/10 14:30Z (o `lido_em`) = 9 dias inteiros: "parado há 9 dias" no painel.
    expect(lista[0]).toHaveTextContent('o mais antigo parado há 9 dias')
    for (const b of lista.slice(1)) expect(b).not.toHaveTextContent('o mais antigo')
  })

  it('a idade é contra o instante do SERVIDOR, não o relógio do aparelho', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
    const r = resumo({ lido_em: '2026-10-15T11:00:00.000Z' })
    montarNaInicio(<QueueTiles leitura={comDado(r)} />)
    vi.useRealTimers()
    expect(blocos()[0]).toHaveTextContent('o mais antigo há 2 dias')
  })

  it('sem pedido aguardando: zero, e sem idade nenhuma', () => {
    const r = resumo({ fila: { ...resumo().fila, aguardando: 0, aguardando_desde: null } })
    montarNaInicio(<QueueTiles leitura={comDado(r)} />)
    expect(within(blocos()[0]).getByText('0')).toBeInTheDocument()
    expect(blocos()[0]).not.toHaveTextContent('o mais antigo')
  })

  it('contagem zero com uma data antiga na resposta (releitura entre a contagem e a data): sem idade', () => {
    // A idade só existe ao lado de um número maior que zero (`MAI-05`): "0 · o mais antigo há 9 dias"
    // se contradiz na mesma linha.
    const r = resumo({ fila: { ...resumo().fila, aguardando: 0 } })
    montarNaInicio(<QueueTiles leitura={comDado(r)} />)
    expect(within(blocos()[0]).getByText('0')).toBeInTheDocument()
    expect(blocos()[0]).not.toHaveTextContent('o mais antigo')
  })

  it('tudo em zero: a seção continua, com os quatro zeros e sem frase festiva (MAI-08)', () => {
    const r = resumo({
      fila: { aguardando: 0, a_separar: 0, sem_rastreio: 0, pix_aguardando: 0, precisa_acao: 0, aguardando_desde: null },
    })
    montarNaInicio(<QueueTiles leitura={comDado(r)} />)
    expect(screen.getByRole('heading', { name: 'Precisa de você' })).toBeInTheDocument()
    expect(blocos()).toHaveLength(4)
    for (const b of blocos()) expect(within(b).getByText('0')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Precisa de você' }).textContent).not.toMatch(/parab|tudo em dia|!|🎉/i)
  })

  it.each([
    [0, '/pedidos?bloco=aguardando'],
    [1, '/pedidos?bloco=a-separar'],
    [2, '/pedidos?bloco=sem-rastreio'],
    [3, '/pedidos?bloco=pix-aguardando'],
  ])('tocar no bloco %i leva a `%s` (MAI-07)', (i, esperado) => {
    montarNaInicio(<QueueTiles leitura={comDado()} />)
    fireEvent.click(blocos()[i])
    expect(destino()).toBe(esperado)
  })

  it('"Ver pedidos" leva à visão "Precisa de ação" (MAI-07)', () => {
    montarNaInicio(<QueueTiles leitura={comDado()} />)
    fireEvent.click(screen.getByRole('link', { name: 'Ver pedidos' }))
    expect(destino()).toBe('/pedidos?visao=precisa-acao')
  })

  it('a faixa rola dentro de si, e todo alvo tem 44 px (MAI-27, token exato)', () => {
    montarNaInicio(<QueueTiles leitura={comDado()} />)
    expect(classes(screen.getByTestId('faixa-da-fila'))).toContain('overflow-x-auto')
    for (const b of blocos()) {
      expect(classes(b)).toContain('min-h-11')
      expect(classes(b)).toContain('shrink-0')
    }
    expect(classes(screen.getByRole('link', { name: 'Ver pedidos' }))).toContain('min-h-11')
  })
})

describe('QueueTiles — sem dado', () => {
  it('carregando: `aria-busy`, os rótulos e nenhum número nem link de bloco', () => {
    montarNaInicio(<QueueTiles leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    const secao = screen.getByRole('region', { name: 'Precisa de você' })
    expect(secao).toHaveAttribute('aria-busy', 'true')
    expect(within(screen.getByTestId('faixa-da-fila')).queryAllByRole('link')).toHaveLength(0)
    expect(screen.getByTestId('faixa-da-fila').textContent).not.toMatch(/\d/)
  })

  it('falhou sem dado: a frase e "Tentar de novo", nenhum número (MAI-17)', () => {
    const tentarDeNovo = vi.fn()
    montarNaInicio(<QueueTiles leitura={{ dado: undefined, falhou: true, tentarDeNovo }} />)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    // Fecho r3 (G3/Q1): a falha não se anuncia "ocupada" — `aria-busy` é só do esqueleto (MAI-30).
    expect(screen.getByRole('region', { name: 'Precisa de você' })).not.toHaveAttribute('aria-busy')
    expect(screen.queryByTestId('faixa-da-fila')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })
})
