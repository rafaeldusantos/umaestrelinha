// O rascunho da montagem de um pedido, pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client): a montagem guarda neste celular só as peças e os descontos, para a volta involuntária, e a
// folha de fechar oferece guardar ou descartar. As frases são escritas por extenso (fonte independente
// do código); o que fica no aparelho é lido do armazenamento de verdade do jsdom.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RASCUNHO_KEY, apagarRascunho } from '@/features/order-proposal/model/rascunho'
import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA, leituraDoMontado } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_HELENA = 'aaaaaaaa-0000-4000-8000-000000000002'
const CLIENTES = [{ id: ID_HELENA, name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 }]
const ID_COLAR = 'bbbbbbbb-0000-4000-8000-000000000002'
const PECAS = [
  {
    id: ID_COLAR,
    name: 'Colar Estrela',
    base_price: 120,
    image_url: null,
    capa: null,
    is_active: true,
    stock_policy: 'track',
    stock_total: 5,
    requires_material: false,
    engraving_max_chars: null,
    options: [],
    weight_kg: null,
    width_cm: null,
    height_cm: null,
    length_cm: null,
  },
]
const PREVIA = 'order-proposals?action=preview'
const SAVE = 'order-proposals?action=save'
const MOTIVO = 'Segunda peça da família'

const resumo = (extra: Record<string, unknown> = {}) => ({
  subtotal: 120,
  promotion_discount: 0,
  coupon_discount: 0,
  coupon_applied: false,
  coupon_free_shipping: false,
  coupon_discarded: false,
  manual_discount: 0,
  items_total: 120,
  ...extra,
})
const ok = (data: unknown) => ({ data, error: null })

/** O servidor, escrito à mão: SAUDADE10 tira 12 dos 120; 20 em reais tiram 20. */
const servidor = (corpo: { coupon_code: string | null; manual_discount: { kind: string; value: number } | null }) => {
  const cupom = corpo.coupon_code === 'SAUDADE10'
  const manual = corpo.manual_discount?.kind === 'amount' && corpo.manual_discount.value === 20 ? 20 : 0
  return ok({
    summary: resumo({ coupon_discount: cupom ? 12 : 0, coupon_applied: cupom, manual_discount: manual, items_total: 120 - (cupom ? 12 : 0) - manual }),
    coupon: cupom ? { code: 'SAUDADE10', type: 'percent', value: 10, first_order_only: false } : null,
    manual_refusal: null,
    items_pix: { percent: 5, total: 100 },
  })
}
const ultimoCorpo = () => {
  const todas = fake.invocacoesDe(PREVIA)
  return (todas[todas.length - 1].opcoes as { body: Parameters<typeof servidor>[0] }).body
}

const comoOPostgrest = (linhas: unknown[]) => (cadeia: Elo[]) => {
  const select = cadeia.find((e) => e.metodo === 'select')
  if ((select?.args[1] as { head?: boolean } | undefined)?.head) return { data: null, error: null, count: linhas.length }
  return { data: linhas, error: null }
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const clicar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const mudar = async (el: HTMLElement, valor: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value: valor } })
  })
  await andar(50)
}
const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const guardado = () => localStorage.getItem(RASCUNHO_KEY)

beforeEach(() => {
  fake.reset()
  apagarRascunho()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ok({ proposals: [], agora: AGORA })))
  fake.filaDeInvocacao(PREVIA, ...Array.from({ length: 120 }, () => () => servidor(ultimoCorpo())))
  fake.filaDeInvocacao('melhor-envio?action=quote', ...Array.from({ length: 20 }, () => () => ok([])))
  fake.filaDeInvocacao(
    SAVE,
    ...Array.from({ length: 5 }, () => () =>
      ok({ id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', version: 1, created: true, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z' }),
    ),
  )
  fake.responderTabela('customer_list', { data: CLIENTES, error: null })
  fake.responderTabela('addresses', { data: [], error: null })
  fake.responderTabela('products', comoOPostgrest(PECAS))
  fake.responderTabela('product_variants', comoOPostgrest([]))
  vi.stubEnv('VITE_STORE_URL', 'https://loja.exemplo.invalid')
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  apagarRascunho()
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Pedidos → "Montar pedido" (a montagem já aberta: a Helena, o Colar Estrela, o passo 3). */
const abrirAMontagem = async () => {
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
}
const montarComPecaEDescontos = async () => {
  const app = await montarApp('/pedidos')
  await andar(50)
  await abrirAMontagem()
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await clicar(continuar())
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
  await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
  await clicar(continuar())
  await andar(50)
  expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
  await mudar(screen.getByLabelText('Código do cupom'), 'saudade10')
  await clicar(screen.getByRole('button', { name: 'Aplicar' }))
  await andar(50)
  await clicar(screen.getByRole('switch', { name: /Desconto combinado/ }))
  await mudar(screen.getByLabelText('Desconto (R$)'), '20')
  await mudar(screen.getByLabelText('Motivo'), MOTIVO)
  await andar(100)
  expect(screen.getByRole('button', { name: 'Remover o cupom SAUDADE10' })).toBeInTheDocument()
  return app
}

/** O que a tela desenha da montagem retomada: o passo 2 (a sacola) e o passo 3 (os descontos). */
const conferirRetomada = async () => {
  // Só as prévias desta abertura: as da montagem de antes ficam fora da conta.
  const antes = fake.invocacoesDe(PREVIA).length
  expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
  const aviso = screen.getByRole('status')
  expect(aviso).toHaveTextContent('Rascunho retomado: as peças e os descontos voltaram.')
  expect(aviso).toHaveTextContent('A cliente e o motivo do desconto não ficam guardados — escolha e escreva de novo.')
  // A cliente NÃO voltou: a busca está aberta, e a barra já conta a peça.
  expect(screen.getByRole('list', { name: 'Clientes' })).toBeInTheDocument()
  expect(within(barra()).getByText('Itens · 1 peça · frete à parte')).toBeInTheDocument()
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await clicar(continuar())
  await andar(50)
  expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
  expect(screen.getAllByTestId('linha-da-sacola').map((l) => l.textContent)).toEqual([expect.stringContaining('Colar Estrela')])
  await clicar(continuar())
  await andar(100)
  expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Remover o cupom SAUDADE10' })).toBeInTheDocument()
  expect(screen.getByRole('switch', { name: /Desconto combinado/ })).toBeChecked()
  expect((screen.getByLabelText('Desconto (R$)') as HTMLInputElement).value).toBe('20')
  expect((screen.getByLabelText('Motivo') as HTMLInputElement).value).toBe('')
  // A prévia retomada leva o cupom e o desconto de volta ao servidor (o resumo confere desde o passo 2,
  // ao lado da prévia das promoções, que vai sem eles — por isso não é a última chamada que conta).
  const desta = fake.invocacoesDe(PREVIA).slice(antes).map((i) => (i.opcoes as { body: Parameters<typeof servidor>[0] }).body)
  expect(desta).toContainEqual(expect.objectContaining({ coupon_code: 'SAUDADE10', manual_discount: { kind: 'amount', value: 20 } }))
}

describe('o rascunho volta depois de uma saída involuntária', () => {
  it('a cada mudança, o aparelho guarda as peças e os descontos — nada da cliente, nada do motivo', async () => {
    await montarComPecaEDescontos()
    const cru = guardado()
    expect(cru).not.toBeNull()
    for (const dado of ['Helena', 'helena@exemplo.invalid', '11955554444', MOTIVO, ID_HELENA]) expect(cru).not.toContain(dado)
    expect(cru).toContain(ID_COLAR)
    expect(cru).toContain('SAUDADE10')
  })

  it('o app encerrado no meio (a árvore some sem a folha) e aberto de novo na montagem: as peças, o cupom e o valor do desconto voltam; a cliente e o motivo não', async () => {
    const primeira = await montarComPecaEDescontos()
    primeira.unmount()
    await montarApp('/pedidos/montar')
    await andar(200)
    await conferirRetomada()
  })
})

describe('a folha de fechar com peças: guardar ou descartar', () => {
  const fecharPeloX = async () => {
    await clicar(screen.getByRole('button', { name: 'Fechar a montagem' }))
    return screen.findByRole('dialog')
  }

  it('diz o que fica guardado e o que não fica, com "Continuar montando", "Guardar rascunho" e "Descartar"', async () => {
    await montarComPecaEDescontos()
    const folha = await fecharPeloX()
    expect(within(folha).getByText('Sair sem criar o link?')).toBeInTheDocument()
    expect(
      within(folha).getByText(
        'Nada foi gravado ainda. Você pode guardar as peças e os descontos neste celular para continuar depois. Os dados da cliente e o motivo do desconto não ficam guardados.',
      ),
    ).toBeInTheDocument()
    expect(within(folha).getAllByRole('button').map((b) => b.textContent)).toEqual(['Continuar montando', 'Guardar rascunho', 'Descartar'])
    // Descartar é a ação de tinta cheia.
    expect(within(folha).getByRole('button', { name: 'Descartar' }).className.split(/\s+/)).toContain('bg-estrelinha-ink')
    await clicar(within(folha).getByRole('button', { name: 'Continuar montando' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
    expect(guardado()).not.toBeNull()
  })

  it('descartar apaga o rascunho: a montagem aberta de novo começa vazia', async () => {
    await montarComPecaEDescontos()
    const folha = await fecharPeloX()
    await clicar(within(folha).getByRole('button', { name: 'Descartar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(guardado()).toBeNull()
    await abrirAMontagem()
    await andar(100)
    expect(within(barra()).getByText('Nenhuma peça ainda')).toBeInTheDocument()
    expect(screen.queryByText('Rascunho retomado: as peças e os descontos voltaram.')).toBeNull()
  })

  it('guardar mantém o rascunho: a montagem aberta de novo volta com as peças e os descontos', async () => {
    await montarComPecaEDescontos()
    const folha = await fecharPeloX()
    await clicar(within(folha).getByRole('button', { name: 'Guardar rascunho' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(guardado()).not.toBeNull()
    await abrirAMontagem()
    await andar(100)
    await conferirRetomada()
  })

  it('o voltar do primeiro passo, com peças, faz a mesma pergunta — e descartar apaga', async () => {
    await montarComPecaEDescontos()
    await act(async () => {
      window.history.go(-2)
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    const folha = await screen.findByRole('dialog')
    expect(within(folha).getByRole('button', { name: 'Guardar rascunho' })).toBeInTheDocument()
    await clicar(within(folha).getByRole('button', { name: 'Descartar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(guardado()).toBeNull()
  })

  it('sem peça, a folha é a de antes: "Sair", e nada guardado', async () => {
    await montarApp('/pedidos')
    await andar(50)
    await abrirAMontagem()
    await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
    const folha = await fecharPeloX()
    expect(within(folha).getByText('Nada foi gravado ainda. A montagem se perde ao sair.')).toBeInTheDocument()
    expect(within(folha).queryByRole('button', { name: 'Guardar rascunho' })).toBeNull()
    expect(guardado()).toBeNull()
  })
})

describe('Criar link apaga o rascunho', () => {
  it('gravado o pedido montado, nada fica no aparelho', async () => {
    fake.filaDeInvocacao(
      'order-proposals?action=get',
      ...Array.from({ length: 10 }, () => () => ok(leituraDoMontado({ proposal: { id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', customer_name: 'Helena Prado' }, token: null }))),
    )
    await montarComPecaEDescontos()
    await clicar(continuar())
    await andar(100)
    expect(screen.getByText('Passo 4 de 4 · Revisar')).toBeInTheDocument()
    expect(guardado()).not.toBeNull()
    await clicar(within(barra()).getByRole('button', { name: 'Criar link' }))
    await andar(100)
    expect(fake.invocacoesDe(SAVE)).toHaveLength(1)
    expect(window.location.pathname).toBe('/pedidos/montados/dddddddd-0000-4000-8000-000000000001')
    expect(guardado()).toBeNull()
  })
})
