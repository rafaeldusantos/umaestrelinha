import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { JourneyInput, StatusEvent } from '@estrelinha/core/orders'
import OrderJourney from '../OrderJourney'

// Feature 59 — a linha do tempo vertical do detalhe.
//
// DET-05: Pedido recebido · Pagamento aprovado · (Material recebido no ateliê) · Em produção no
//         ateliê · A caminho · Entregue.
// DET-06: a data de cada etapa vem da FONTE dela; sem fonte, sem data — nunca `updated_at`.
// DET-07: "Previsão: entre {min} e {max}" enquanto a entrega não aconteceu.
// DET-08: cancelado troca a linha do tempo pelo bloco "Pedido cancelado".
//
// ⚠️ Este arquivo HERDA as asserções de forma da `OrderTimeline` da loja, apagada na T11 (`CNF-06`):
// `data-state` por etapa, `aria-current` em exatamente uma, disco distinguível por forma em cada
// estado, cancelado sem trilha de progresso, e nenhuma cor fora da paleta. Cada uma está marcada
// com "(herdado)" no nome do caso.

const BASE: JourneyInput = {
  status: 'pending',
  payment_status: 'approved',
  material_status: 'nao_aplicavel',
  created_at: '2026-07-26T15:00:00Z',
  paid_at: '2026-07-27T12:00:00Z',
  material_received_at: null,
  delivery_estimate_min: '2026-08-04',
  delivery_estimate_max: '2026-08-06',
}

const pedido = (o: Partial<JourneyInput> = {}): JourneyInput => ({ ...BASE, ...o })

const states = () =>
  Array.from(document.querySelectorAll('li[data-state]')).map((li) => li.getAttribute('data-state'))

const etapa = (key: string) => document.querySelector(`li[data-step="${key}"]`) as HTMLElement

/** Classes de forma do disco, sem nenhuma que carregue cor — a prova do "distinguível sem cor". */
const discShape = (index: number) => {
  const disco = screen.getAllByTestId('stage-disc')[index]
  return disco.className
    .split(/\s+/)
    .filter((cls) => !/^(bg|text|border)-estrelinha/.test(cls))
    .join(' ')
}

describe('OrderJourney — as etapas (DET-05)', () => {
  it('sem material: cinco etapas, na ordem da spec (herdado: a ordem dos estágios)', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    expect(screen.getAllByTestId('stage-label').map((el) => el.textContent)).toEqual([
      'Pedido recebido',
      'Pagamento aprovado',
      'Em produção no ateliê',
      'A caminho',
      'Entregue',
    ])
  })

  it('com material: a etapa "Material recebido no ateliê" entra depois do pagamento', () => {
    render(<OrderJourney order={pedido({ material_status: 'aguardando_material' })} events={[]} />)

    const nomes = screen.getAllByRole('listitem').map((li) => li.getAttribute('data-step'))
    expect(nomes).toEqual(['received', 'paid', 'material', 'production', 'shipped', 'delivered'])
    expect(etapa('material')).toHaveTextContent('Material recebido no ateliê')
  })
})

describe('OrderJourney — estado de cada etapa (herdado do CNF-06)', () => {
  it('pago e ainda não postado: recebido e pago concluídos, produção atual, o resto futuro', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    expect(states()).toEqual(['complete', 'complete', 'current', 'future', 'future'])
  })

  it('marca exatamente UMA etapa como atual para o leitor de tela (herdado)', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    const atual = document.querySelectorAll('li[aria-current="step"]')
    expect(atual).toHaveLength(1)
    expect(atual[0].textContent).toContain('Em produção no ateliê')
  })

  it('postado: tudo até "A caminho" concluído, "Entregue" atual (herdado)', () => {
    render(<OrderJourney order={pedido({ status: 'shipped' })} events={[]} />)

    expect(states()).toEqual(['complete', 'complete', 'complete', 'complete', 'current'])
  })

  it('entregue: todas concluídas e NENHUMA atual (herdado)', () => {
    render(<OrderJourney order={pedido({ status: 'delivered' })} events={[]} />)

    expect(states()).toEqual(['complete', 'complete', 'complete', 'complete', 'complete'])
    expect(document.querySelectorAll('li[aria-current="step"]')).toHaveLength(0)
  })

  it('sem pagamento aprovado a linha do tempo não finge pagamento (herdado)', () => {
    render(
      <OrderJourney order={pedido({ payment_status: 'pending', paid_at: null })} events={[]} />,
    )

    expect(states()).toEqual(['complete', 'current', 'future', 'future', 'future'])
    expect(etapa('paid').getAttribute('aria-current')).toBe('step')
  })

  it('o trilho até a etapa atual é cheio, e depois dela é contorno', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    const trilhos = screen.getAllByTestId('stage-connector')
    // 5 etapas, 4 trilhos: recebido→pago, pago→produção (atual), produção→a caminho, →entregue.
    expect(trilhos).toHaveLength(4)
    expect(trilhos.map((t) => t.className.includes('bg-estrelinha-primary'))).toEqual([
      true,
      true,
      false,
      false,
    ])
  })
})

describe('OrderJourney — a data vem da fonte da etapa (DET-06)', () => {
  const EVENTOS: StatusEvent[] = [
    { status: 'separating', at: '2026-07-29T14:00:00Z' },
    { status: 'shipped', at: '2026-08-03T18:00:00Z' },
    { status: 'shipped', at: '2026-08-01T18:00:00Z' },
    { status: 'delivered', at: '2026-08-05T13:00:00Z' },
  ]

  it('recebido ← created_at e pago ← paid_at (herdado: a data do pagamento na etapa do pagamento)', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    expect(etapa('received')).toHaveTextContent('26 jul')
    expect(etapa('paid')).toHaveTextContent('27 jul')
  })

  it('produção, envio e entrega ← o PRIMEIRO registro do histórico de cada status', () => {
    render(<OrderJourney order={pedido({ status: 'delivered' })} events={EVENTOS} />)

    expect(etapa('production')).toHaveTextContent('29 jul')
    // Dois `shipped`: vale o mais antigo, não o último do array.
    expect(etapa('shipped')).toHaveTextContent('1 ago')
    expect(etapa('shipped')).not.toHaveTextContent('3 ago')
    expect(etapa('delivered')).toHaveTextContent('5 ago')
  })

  it('material ← material_received_at', () => {
    render(
      <OrderJourney
        order={pedido({
          material_status: 'material_recebido',
          material_received_at: '2026-07-28T12:00:00Z',
        })}
        events={[]}
      />,
    )

    expect(etapa('material')).toHaveTextContent('28 jul')
  })

  it('sem fonte, sem data — nunca `updated_at`', () => {
    const comUpdatedAt = { ...pedido({ status: 'shipped' }), updated_at: '2026-08-02T10:00:00Z' }
    render(<OrderJourney order={comUpdatedAt} events={[]} />)

    // Enviado sem registro no histórico: a etapa aparece concluída e SEM data.
    expect(etapa('shipped').querySelector('[data-testid="stage-date"]')).toBeNull()
    expect(etapa('production').querySelector('[data-testid="stage-date"]')).toBeNull()
    expect(document.body.textContent).not.toContain('2 ago')
  })
})

describe('OrderJourney — a previsão de entrega (DET-07)', () => {
  it('janela de vários dias no mesmo mês: "Previsão: entre 4 e 6 ago" (herdado: a janela)', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    expect(etapa('delivered')).toHaveTextContent('Previsão: entre 4 e 6 ago')
  })

  it('janela de um único dia: "Previsão: {d MMM}" (herdado)', () => {
    render(
      <OrderJourney
        order={pedido({ delivery_estimate_min: '2026-07-30', delivery_estimate_max: '2026-07-30' })}
        events={[]}
      />,
    )

    expect(etapa('delivered').querySelector('[data-testid="stage-date"]')?.textContent).toBe(
      'Previsão: 30 jul',
    )
  })

  it('janela que cruza o mês leva os dois meses', () => {
    render(
      <OrderJourney
        order={pedido({ delivery_estimate_min: '2026-09-30', delivery_estimate_max: '2026-10-02' })}
        events={[]}
      />,
    )

    expect(etapa('delivered')).toHaveTextContent('Previsão: entre 30 set e 2 out')
  })

  it('sem estimativa a linha some, e as etapas ficam todas (herdado)', () => {
    render(
      <OrderJourney
        order={pedido({ delivery_estimate_min: null, delivery_estimate_max: null })}
        events={[]}
      />,
    )

    expect(screen.queryByText(/^Previsão/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
  })

  it('entregue mostra a data da entrega, e não mais a previsão', () => {
    render(
      <OrderJourney
        order={pedido({ status: 'delivered' })}
        events={[{ status: 'delivered', at: '2026-08-05T13:00:00Z' }]}
      />,
    )

    expect(screen.queryByText(/^Previsão/)).not.toBeInTheDocument()
    expect(etapa('delivered')).toHaveTextContent('5 ago')
  })
})

describe('OrderJourney — pedido cancelado (DET-08)', () => {
  it('troca a linha do tempo pelo bloco próprio, sem trilha de progresso (herdado)', () => {
    render(<OrderJourney order={pedido({ status: 'cancelled' })} events={[]} />)

    expect(screen.getByText('Pedido cancelado')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryAllByTestId('stage-disc')).toHaveLength(0)
    expect(screen.queryByText('Em produção no ateliê')).not.toBeInTheDocument()
  })

  it('com o registro `cancelled` do histórico, diz quando', () => {
    render(
      <OrderJourney
        order={pedido({ status: 'cancelled' })}
        events={[{ status: 'cancelled', at: '2026-08-02T12:00:00Z' }]}
      />,
    )

    expect(screen.getByText('Cancelado em 2 ago')).toBeInTheDocument()
  })

  it('sem o registro, não inventa data', () => {
    render(<OrderJourney order={pedido({ status: 'cancelled' })} events={[]} />)

    expect(screen.queryByText(/^Cancelado em/)).not.toBeInTheDocument()
  })
})

describe('OrderJourney — estados por forma e paleta (herdado do CNF-06)', () => {
  it('as três formas de disco diferem sem depender de nenhuma classe de cor', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    const discos = screen.getAllByTestId('stage-disc')
    const completo = discos[0]
    const atual = discos[2]
    const futuro = discos[3]

    // concluído = preenchido (nenhum contorno), com o check
    expect(discShape(0)).not.toMatch(/border/)
    expect(completo.querySelector('svg')).not.toBeNull()
    // atual = anel com miolo; futuro = anel VAZIO — o miolo é o que os separa sem cor
    expect(discShape(2)).toContain('border-2')
    expect(discShape(3)).toContain('border-2')
    expect(atual.querySelector('svg')).toBeNull()
    expect(atual.children).toHaveLength(1)
    expect(futuro.children).toHaveLength(0)
    // os três discos têm 20px
    for (const i of [0, 2, 3]) expect(discShape(i).split(' ')).toEqual(expect.arrayContaining(['h-5', 'w-5']))
  })

  it('a etapa atual tem o rótulo em peso 600; as outras não', () => {
    render(<OrderJourney order={pedido()} events={[]} />)

    const peso = (key: string) =>
      (etapa(key).querySelector('[data-testid="stage-label"]') as HTMLElement).className.split(/\s+/)
    expect(peso('production')).toContain('font-semibold')
    expect(peso('paid')).not.toContain('font-semibold')
    expect(peso('shipped')).not.toContain('font-semibold')
  })

  it('nenhuma classe de cor fora da paleta Uma Estrelinha em nenhum estado (herdado)', () => {
    const { container: emCurso } = render(<OrderJourney order={pedido()} events={[]} />)
    const { container: cancelado } = render(
      <OrderJourney order={pedido({ status: 'cancelled' })} events={null} />,
    )

    const proibido = /\b(bg|text|border)-(yellow|blue|purple|green|red)-\d/
    expect(emCurso.innerHTML).not.toMatch(proibido)
    expect(cancelado.innerHTML).not.toMatch(proibido)
  })
})
