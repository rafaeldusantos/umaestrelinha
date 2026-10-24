// Feature `74` · T23 — itens, valores, entrega e histórico do detalhe (`MAP-24`..`MAP-28`,
// `MAP-30`, `MAP-43`, A15, A19, A27, A30, TE4).
process.env.TZ = 'UTC'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatPrice } from '@estrelinha/core/formatters'
import { buildHistory, type HistoryEvent } from '@estrelinha/core/orders'

import type { Bloco, ItemDoPedido } from '@/entities/order'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import { COM_CUPOM_E_PIX, DETALHE_DE_RETIRADA, EMAIL_FALHO, ITEM_COM_GRAVACAO, NOTA, detalhe, item, statusRow } from '@/test/pedidos'
import BlocoEntrega from '../ui/BlocoEntrega'
import BlocoItens from '../ui/BlocoItens'
import BlocoValores from '../ui/BlocoValores'
import Historico from '../ui/Historico'

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const ok = <T,>(dado: T): Bloco<T> => ({ estado: 'ok', dado })
const FALHOU = { estado: 'falhou' } as const
const parte = (nome: string) => document.querySelector(`[data-parte="${nome}"]`)
const sem = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')

describe('os itens (MAP-24)', () => {
  it('"1 joia" com um item de quantidade 1', () => {
    render(<BlocoItens itens={ok([item()])} tentarDeNovo={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('1 joia')
  })

  it('"N joias" pela SOMA das quantidades, não pelo número de linhas', () => {
    render(<BlocoItens itens={ok([item({ quantity: 2 }), item({ id: 'i-9', quantity: 3 })])} tentarDeNovo={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('5 joias')
    expect(screen.getAllByTestId('item-do-pedido')).toHaveLength(2)
  })

  it('cada item: o nome congelado, a variação, "Gravação: …" e "quantidade × preço unitário"', () => {
    render(<BlocoItens itens={ok([{ ...ITEM_COM_GRAVACAO, quantity: 2, unit_price: 150 }])} tentarDeNovo={vi.fn()} />)
    const linha = screen.getByTestId('item-do-pedido')
    expect(within(linha).getByText('Pingente gota com leite materno')).toBeInTheDocument()
    expect(within(linha).getByText('Prata 925')).toBeInTheDocument()
    expect(within(linha).getByText('Gravação: Helena')).toBeInTheDocument()
    expect(sem(linha.querySelector('[data-parte="quantidade"]')?.textContent)).toBe(sem(`2 × ${formatPrice(150)}`))
  })

  it('sem variação e com gravação só de espaços: nenhuma das duas linhas', () => {
    render(<BlocoItens itens={ok([item({ variant_label: null, engraving_text: '   ' })])} tentarDeNovo={vi.fn()} />)
    const linha = screen.getByTestId('item-do-pedido')
    expect(linha.textContent).not.toMatch(/Gravação/)
    expect(within(linha).queryByText('Prata 925')).toBeNull()
  })

  it('um item importado da Nuvemshop (sem produto no catálogo) sai pelo nome congelado', () => {
    render(<BlocoItens itens={ok([item({ id: 'nuvemshop:778', product_name: 'Colar coração (Nuvemshop)', variant_label: null })])} tentarDeNovo={vi.fn()} />)
    expect(screen.getByText('Colar coração (Nuvemshop)')).toBeInTheDocument()
  })

  it('a leitura dos itens falhou: "Não consegui carregar." e "Tentar de novo" no bloco (MAP-30)', () => {
    const tentar = vi.fn()
    render(<BlocoItens itens={FALHOU as Bloco<ItemDoPedido[]>} tentarDeNovo={tentar} />)
    const bloco = screen.getByRole('region', { name: 'Joias' })
    expect(within(bloco).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    fireEvent.click(within(bloco).getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentar).toHaveBeenCalledTimes(1)
  })
})

describe('os valores (MAP-25, A15, A30)', () => {
  it('o Total é `orders.total` SEM recalcular — a soma das linhas daria outro número', () => {
    // 400 + 19,90 − 20 = 399,90; o banco diz 389,90. A tela diz o que o banco diz.
    render(<BlocoValores pedido={detalhe({ subtotal: 400, shipping_cost: 19.9, pix_discount: 20, total: 389.9 })} />)
    expect(sem(parte('total')?.textContent)).toBe(sem(`Total${formatPrice(389.9)}`))
    expect(sem(parte('total')?.textContent)).not.toContain(sem(formatPrice(399.9)))
  })

  it('subtotal e "Frete · <serviço>" com o valor', () => {
    render(<BlocoValores pedido={detalhe({ subtotal: 400, shipping_cost: 19.9, shipping_method: 'PAC' })} />)
    expect(sem(parte('subtotal')?.textContent)).toBe(sem(`Subtotal${formatPrice(400)}`))
    expect(sem(parte('frete')?.textContent)).toBe(sem(`Frete · PAC${formatPrice(19.9)}`))
  })

  it('frete com custo zero diz "grátis"; na retirada, o serviço é "Retirada no escritório"', () => {
    render(<BlocoValores pedido={DETALHE_DE_RETIRADA} />)
    expect(parte('frete')?.textContent).toBe('Frete · Retirada no escritóriográtis')
  })

  it('cupom com o código e o desconto do Pix, cada um só quando > 0', () => {
    render(<BlocoValores pedido={COM_CUPOM_E_PIX} />)
    expect(sem(parte('cupom')?.textContent)).toBe(sem(`Cupom ESTRELA10− ${formatPrice(40)}`))
    expect(sem(parte('pix')?.textContent)).toBe(sem(`Desconto do Pix− ${formatPrice(18)}`))
    expect(parte('promocao')).toBeNull()
  })

  it('promoção > 0 aparece; desconto zero não desenha linha nenhuma', () => {
    render(<BlocoValores pedido={detalhe({ discount: 0, pix_discount: 0, promotion_discount: 35 })} />)
    expect(sem(parte('promocao')?.textContent)).toBe(sem(`Promoção− ${formatPrice(35)}`))
    expect(parte('cupom')).toBeNull()
    expect(parte('pix')).toBeNull()
  })

  it.each([
    ['pix', 'approved', 'PIX', 'Aprovado', 'done'],
    ['credit_card', 'pending', 'Cartão de crédito', 'Pendente', 'wait'],
    ['credit_card', 'rejected', 'Cartão de crédito', 'Recusado', 'alert'],
    ['pix', 'refunded', 'PIX', 'Estornado', 'neutral'],
    ['pix', 'expired', 'PIX', 'Expirado', 'neutral'],
    ['boleto', 'cancelled', 'Boleto', 'Cancelado', 'alert'],
    // B01 (`BUG-20261024-pagamento-por-cartao-aparece-como-card`): `card` é o meio que o checkout da
    // própria loja grava; e um meio desconhecido nunca sai cru na tela.
    ['card', 'approved', 'Cartão de crédito', 'Aprovado', 'done'],
    ['wallet_xyz', 'approved', 'Outra forma de pagamento', 'Aprovado', 'done'],
  ] as const)('meio %s com %s: "%s" e o selo "%s" no tom %s (A15)', (payment_method, payment_status, meio, rotulo, tom) => {
    render(<BlocoValores pedido={detalhe({ payment_method, payment_status })} />)
    const pagamento = parte('pagamento')!
    expect(pagamento.firstElementChild?.textContent).toBe(meio)
    const selo = pagamento.querySelector('[data-pagamento]')!
    expect(selo.textContent).toBe(rotulo)
    expect(selo.getAttribute('data-tone')).toBe(tom)
  })
})

describe('a entrega (MAP-26, MAP-27)', () => {
  it('o endereço inteiro, o serviço e o rastreio de saída', () => {
    render(<BlocoEntrega pedido={detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' })} />)
    const linhas = Array.from(parte('endereco')!.children).map((p) => p.textContent)
    expect(linhas).toEqual(['Rua das Flores, 120 · apto 3', 'Centro', 'Porto Alegre/RS', 'CEP 90010-000'])
    expect(parte('servico')?.textContent).toBe('PAC')
    expect(parte('rastreio')?.textContent).toBe('Rastreio BR123456789BR')
  })

  it.each([
    ['shipped', null, 'Enviado sem código de rastreio'],
    ['pending', null, 'Ainda não postado'],
    ['paid', null, 'Ainda não postado'],
    ['separating', null, 'Ainda não postado'],
    ['delivered', null, 'Sem rastreio'],
    ['cancelled', null, 'Sem rastreio'],
  ])('%s sem código: "%s"', (status, tracking_code, frase) => {
    render(<BlocoEntrega pedido={detalhe({ status, tracking_code })} />)
    expect(parte('rastreio')?.textContent).toBe(frase)
  })

  it('retirada: "Retirada no escritório", sem endereço, sem transportadora e sem rastreio', () => {
    render(<BlocoEntrega pedido={{ ...DETALHE_DE_RETIRADA, status: 'separating' }} />)
    const bloco = screen.getByRole('region', { name: 'Entrega' })
    expect(parte('retirada')?.textContent).toBe('Retirada no escritório')
    expect(parte('endereco')).toBeNull()
    expect(parte('servico')).toBeNull()
    expect(parte('rastreio')).toBeNull()
    expect(bloco.textContent).not.toMatch(/Rastreio|postado|PAC/)
  })

  it('sem botão de editar: o bloco só lê', () => {
    render(<BlocoEntrega pedido={detalhe()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('o histórico (MAP-28, A19, Q6)', () => {
  const eventos = (): HistoryEvent[] =>
    buildHistory([statusRow()], [EMAIL_FALHO, { ...EMAIL_FALHO, id: 'n-2', error: null, created_at: '2026-10-21T10:00:00Z' }], [NOTA])

  it('o fio de `buildHistory`, do mais recente para o mais antigo, com as notas internas', () => {
    render(<Historico historico={ok(eventos())} lidoEm={LIDO_EM} tentarDeNovo={vi.fn()} />)
    const itens = screen.getAllByTestId('evento-do-historico')
    expect(itens.map((i) => i.getAttribute('data-tipo'))).toEqual(['email', 'note', 'email', 'status'])
    expect(within(itens[1]).getByText('Nota interna')).toBeInTheDocument()
    expect(within(itens[1]).getByText(NOTA.note)).toBeInTheDocument()
    expect(within(itens[3]).getByText('Pendente → Pago')).toBeInTheDocument()
  })

  it('cada evento com "<dia em Brasília> · <há quanto tempo>" contra o `lido_em`', () => {
    render(<Historico historico={ok(buildHistory([statusRow({ created_at: '2026-10-21T02:30:00Z' })], [], []))} lidoEm={LIDO_EM} tentarDeNovo={vi.fn()} />)
    expect(parte('quando')?.textContent).toBe('20 out · há 2 dias')
  })

  it('o e-mail que falhou sem erro registrado diz que a cliente NÃO foi avisada, em alerta', () => {
    render(<Historico historico={ok(eventos())} lidoEm={LIDO_EM} tentarDeNovo={vi.fn()} />)
    const falhos = screen.getAllByTestId('evento-do-historico').filter((i) => i.getAttribute('data-falhou') === 'true')
    expect(falhos).toHaveLength(2)
    const semErro = falhos.find((f) => f.textContent?.includes('A cliente NÃO foi avisada'))
    expect(semErro).toBeDefined()
    expect(semErro!.querySelector('p')?.textContent).toMatch(/^Falha ao enviar /)
    expect(semErro!.querySelector('p')?.className).toContain('text-estrelinha-alert')
  })

  it('sem evento nenhum: "Nada registrado ainda."', () => {
    render(<Historico historico={ok([])} lidoEm={LIDO_EM} tentarDeNovo={vi.fn()} />)
    expect(screen.getByText('Nada registrado ainda.')).toBeInTheDocument()
  })

  it('a leitura do histórico falhou: o bloco inteiro em falha, com "Tentar de novo"', () => {
    const tentar = vi.fn()
    render(<Historico historico={FALHOU as Bloco<HistoryEvent[]>} lidoEm={LIDO_EM} tentarDeNovo={tentar} />)
    const bloco = screen.getByRole('region', { name: 'Histórico' })
    expect(within(bloco).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(screen.queryAllByTestId('evento-do-historico')).toHaveLength(0)
    fireEvent.click(within(bloco).getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentar).toHaveBeenCalledTimes(1)
  })
})
