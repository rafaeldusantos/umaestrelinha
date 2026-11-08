// O passo 4 · Revisar da montagem, o "Criar link" e o Editar de um pedido montado, pela árvore REAL
// (`<App />` com sessão admin sobre o dublê do client). A function `order-proposals` (a prévia e o
// `save`) e a `melhor-envio` (a cotação) respondem pela fila de invocação do dublê; os números são
// literais escritos à mão, e as frases por extenso (fonte independente do código).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo, type RespostaInvocacao } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA, ID_ABERTO, leituraDoMontado } from '@/test/montados'
import { SEM_ACESSO } from '@/pages/LoginPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_HELENA = 'aaaaaaaa-0000-4000-8000-000000000002'
const ID_SEM_ENDERECO = 'aaaaaaaa-0000-4000-8000-000000000003'
const CLIENTES = [
  { id: ID_HELENA, name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 },
  { id: ID_SEM_ENDERECO, name: 'Rosa Dias', email: 'rosa@exemplo.invalid', phone: null, has_account: true, orders_total: 2 },
]
const ENDERECO_DA_HELENA = {
  id: 'e1',
  label: null,
  cep: '90010-000',
  street: 'Rua das Flores',
  number: '120',
  complement: 'ap 3',
  neighborhood: 'Centro',
  city: 'Porto Alegre',
  state: 'RS',
  is_default: true,
  created_at: '2026-01-01T00:00:00Z',
}
const ID_COLAR = 'bbbbbbbb-0000-4000-8000-000000000002'
const FOTO_DO_COLAR = 'https://img.exemplo.invalid/colar.webp'
const PECAS = [
  {
    id: ID_COLAR,
    name: 'Colar Estrela',
    base_price: 120,
    image_url: FOTO_DO_COLAR,
    capa: null,
    is_active: true,
    stock_policy: 'track',
    stock_total: 5,
    requires_material: false,
    engraving_max_chars: null,
    options: [],
    weight_kg: 0.05,
    width_cm: null,
    height_cm: null,
    length_cm: null,
  },
]

const PREVIA = 'order-proposals?action=preview'
const SAVE = 'order-proposals?action=save'
const COTACAO = 'melhor-envio?action=quote'
const PRECOS_MUDARAM = 'Os preços mudaram enquanto você montava. Confira o resumo.'
const NADA_ENVIADO = 'Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo.'

const resumo = (itens: number) => ({
  subtotal: itens,
  promotion_discount: 0,
  coupon_discount: 0,
  coupon_applied: false,
  coupon_free_shipping: false,
  coupon_discarded: false,
  manual_discount: 0,
  items_total: itens,
})
const ok = (data: unknown) => ({ data, error: null })
const http = (status: number, corpo: unknown) => ({
  data: null,
  error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  }),
})

/** O servidor, escrito à mão: o total dos itens de agora (muda quando o preço "muda no servidor"). */
let totalDoServidor = 120
let respostaDoSave: () => RespostaInvocacao | Promise<RespostaInvocacao> = () => ok({ id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', version: 1, created: true, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z' })

const corposDe = (nome: string) => fake.invocacoesDe(nome).map((i) => (i.opcoes as { body: Record<string, unknown> }).body)

const comoOPostgrest = (linhas: unknown[]) => (cadeia: Elo[]) => {
  const select = cadeia.find((e) => e.metodo === 'select')
  if ((select?.args[1] as { head?: boolean } | undefined)?.head) return { data: null, error: null, count: linhas.length }
  return { data: linhas, error: null }
}
/** Os endereços salvos: só a Helena tem. */
const enderecosPorFicha = (cadeia: Elo[]) => {
  const eq = cadeia.find((e) => e.metodo === 'eq')
  return { data: eq?.args[1] === ID_HELENA ? [ENDERECO_DA_HELENA] : [], error: null }
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const clicar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')

beforeEach(() => {
  fake.reset()
  totalDoServidor = 120
  respostaDoSave = () => ok({ id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', version: 1, created: true, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z' })
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ok({ proposals: [], agora: AGORA })))
  fake.filaDeInvocacao(PREVIA, ...Array.from({ length: 80 }, () => () => ok({ summary: resumo(totalDoServidor), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: totalDoServidor * 0.95 } })))
  fake.filaDeInvocacao(
    COTACAO,
    ...Array.from({ length: 20 }, () => () =>
      ok([
        { id: 1, name: 'PAC', company: 'Correios', price: '20.00', delivery_time: 5 },
        { id: 2, name: 'SEDEX', company: 'Correios', price: '35.50', delivery_time: 2, delivery_range: { min: 1, max: 2 } },
      ]),
    ),
  )
  fake.filaDeInvocacao(SAVE, ...Array.from({ length: 10 }, () => () => respostaDoSave()))
  // A ficha por e-mail da cliente nova (Clara) não existe; o resto lista as duas cadastradas.
  fake.responderTabela('customer_list', (cadeia: Elo[]) => {
    const or = cadeia.find((e) => e.metodo === 'or')
    return { data: String(or?.args[0] ?? '').includes('clara@') ? [] : CLIENTES, error: null }
  })
  fake.responderTabela('addresses', enderecosPorFicha)
  fake.responderTabela('products', comoOPostgrest(PECAS))
  fake.responderTabela('product_variants', comoOPostgrest([]))
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ erro: true }), { status: 200 })))
  vi.stubEnv('VITE_STORE_URL', 'https://loja.exemplo.invalid')
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Pedidos → "Montar pedido" → a cliente → o Colar Estrela → Descontos → Revisar. */
const abrirARevisao = async (cliente = /Helena Prado/) => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: cliente }))
  await andar(50)
  await clicar(continuar())
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
  await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
  await clicar(continuar())
  await andar(50)
  await clicar(continuar())
  await andar(100)
  expect(screen.getByText('Passo 4 de 4 · Revisar')).toBeInTheDocument()
}

const criarLink = () => within(barra()).getByRole('button', { name: 'Criar link' })

describe('passo 4 · a revisão', () => {
  it('as peças vêm primeiro, com a foto; depois a cliente e a entrega — cada bloco com "Alterar"', async () => {
    await abrirARevisao()
    const revisao = screen.getByRole('region', { name: 'Revisar' })
    const blocos = within(revisao)
      .getAllByRole('region')
      .map((r) => r.getAttribute('aria-label'))
    expect(blocos).toEqual(['Sacola · 1 peça', 'Cliente', 'Entrega'])
    const peca = screen.getByTestId('peca-da-revisao')
    expect(peca.querySelector('img')?.getAttribute('src')).toContain('colar.webp')
    expect(texto(peca)).toContain('Colar Estrela')
    expect(texto(peca)).toContain('1 un.')
    expect(texto(peca)).toContain('R$ 120,00')
    expect(texto(screen.getByTestId('revisao-total'))).toBe('ItensR$ 120,00')
    const cliente = screen.getByRole('region', { name: 'Cliente' })
    expect(texto(cliente)).toContain('Helena Prado')
    expect(texto(cliente)).toContain('helena@exemplo.invalid')
    expect(texto(cliente)).toContain('(11) 95555-4444')
    // A cadastrada não é ficha nova.
    expect(screen.queryByText('Ficha nova · criada com o link')).toBeNull()
    expect(texto(screen.getByTestId('entrega-da-revisao'))).toBe('Rua das Flores, 120, ap 3 — Centro, Porto Alegre/RS · 90010-000')
    expect(screen.getByTestId('nota-da-revisao')).toHaveTextContent(
      'Os preços ficam travados como estão aqui. O link vale 7 dias, até 14/11. Nada é gravado antes de você criar o link.',
    )
  })

  it.each([
    ['Alterar sacola · 1 peça', 'Passo 2 de 4 · Peças'],
    ['Alterar cliente', 'Passo 1 de 4 · Cliente'],
    ['Alterar entrega', 'Passo 1 de 4 · Cliente'],
  ])('"%s" leva ao passo certo (%s)', async (botao, passo) => {
    await abrirARevisao()
    await clicar(screen.getByRole('button', { name: botao }))
    await andar(50)
    expect(screen.getByText(passo)).toBeInTheDocument()
  })

  it('com CEP e rua, a prévia do frete: uma linha por opção — nome, prazo, preço — e a frase de prévia', async () => {
    await abrirARevisao()
    await andar(50)
    expect(corposDe(COTACAO)).toEqual([
      { postal_code_to: '90010000', products: [{ id: ID_COLAR, width: 11, height: 2, length: 16, weight: 0.05, insurance_value: 120, quantity: 1 }] },
    ])
    const opcoes = screen.getAllByTestId('opcao-de-entrega').map(texto)
    expect(opcoes).toEqual(['PAC · 5 dias úteisR$ 20,00', 'SEDEX · 1 a 2 dias úteisR$ 35,50'])
    expect(screen.getByText('Prévia. A cliente escolhe a entrega no link.')).toBeInTheDocument()
  })

  it('sem endereço (a cliente preenche no link): nenhuma cotação, e a frase do link', async () => {
    await abrirARevisao(/Rosa Dias/)
    await andar(50)
    expect(texto(screen.getByTestId('entrega-da-revisao'))).toBe('A cliente preenche o endereço no link.')
    expect(screen.queryByTestId('previa-do-frete')).toBeNull()
    expect(fake.invocacoesDe(COTACAO)).toHaveLength(0)
    expect(texto(screen.getByRole('region', { name: 'Cliente' }))).toContain('sem telefone')
  })
})

describe('passo 4 · Criar link', () => {
  it('manda a escolha com `save_address` e a observação, e abre o pedido montado com "Link criado."', async () => {
    fake.filaDeInvocacao('order-proposals?action=get', ...Array.from({ length: 10 }, () => () => ok(leituraDoMontado({ proposal: { id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', customer_name: 'Helena Prado' }, token: null }))))
    await abrirARevisao()
    fireEvent.change(screen.getByLabelText('Observação interna'), { target: { value: '  Embrulhar para presente.  ' } })
    await andar(50)
    await clicar(criarLink())
    await andar(100)
    const [corpo] = corposDe(SAVE)
    expect(corpo).toMatchObject({
      customer_id: ID_HELENA,
      customer_name: 'Helena Prado',
      customer_email: 'helena@exemplo.invalid',
      customer_phone: '11955554444',
      address_zip: '90010000',
      address_street: 'Rua das Flores',
      address_number: '120',
      lines: [{ product_id: ID_COLAR, variant_id: null, quantity: 1, engraving_text: null }],
      coupon_code: null,
      manual_discount: null,
      expected_total: 120,
      admin_note: 'Embrulhar para presente.',
      // O endereço salvo já está na ficha: não se salva de novo.
      save_address: false,
    })
    expect(typeof corpo.idempotency_key).toBe('string')
    expect(corpo).not.toHaveProperty('id')
    expect(window.location.pathname).toBe('/pedidos/montados/dddddddd-0000-4000-8000-000000000001')
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Link criado.')
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Agora é só mandar para Helena.')
    // O link da resposta do `save` (o `get` sem cifra não o devolve) aparece no cartão.
    expect(screen.getByTestId('o-link')).toHaveTextContent('https://loja.exemplo.invalid/pedido-montado#tok-novo')
  })

  it('cliente nova com o endereço digitado: "Ficha nova · criada com o link", e `save_address` verdadeiro', async () => {
    await montarApp('/pedidos')
    await andar(50)
    await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
    await andar(50)
    await clicar(screen.getByRole('button', { name: 'Cliente nova' }))
    const digitar = async (rotulo: string, valor: string) => {
      fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })
      await andar(50)
    }
    await digitar('Nome', 'Clara Nunes')
    await digitar('E-mail', 'clara@exemplo.invalid')
    await digitar('CEP', '91240-010')
    await andar(50)
    for (const [rotulo, valor] of [['Rua', 'Rua do Sol'], ['Número', '7'], ['Bairro', 'Centro'], ['Cidade', 'Canoas'], ['UF', 'RS']]) await digitar(rotulo, valor)
    await clicar(continuar())
    await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
    await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
    await clicar(continuar())
    await clicar(continuar())
    await andar(100)
    expect(screen.getByText('Ficha nova · criada com o link')).toBeInTheDocument()
    expect(texto(screen.getByRole('region', { name: 'Cliente' }))).toContain('sem telefone')
    await clicar(criarLink())
    await andar(100)
    expect(corposDe(SAVE)[0]).toMatchObject({
      customer_id: null,
      customer_name: 'Clara Nunes',
      customer_email: 'clara@exemplo.invalid',
      customer_phone: null,
      address_zip: '91240010',
      address_street: 'Rua do Sol',
      address_city: 'Canoas',
      admin_note: null,
      save_address: true,
    })
  })

  it('preço mudado no servidor (409): a frase da function no topo, e o resumo relido — nada gravado pela metade', async () => {
    await abrirARevisao()
    respostaDoSave = () => {
      totalDoServidor = 132
      return http(409, { error: PRECOS_MUDARAM, code: 'prices_changed', summary: resumo(132) })
    }
    await clicar(criarLink())
    await andar(150)
    expect(screen.getByTestId('erro-da-criacao')).toHaveTextContent(PRECOS_MUDARAM)
    expect(window.location.pathname).toBe('/pedidos/montar')
    // A revisão relida: o resumo é o do servidor, de novo pela prévia.
    expect(texto(screen.getByTestId('revisao-total'))).toBe('ItensR$ 132,00')
    expect(texto(within(barra()).getByTestId('total-da-barra'))).toBe('R$ 132,00')
    // Tentar de novo vai com o total relido.
    respostaDoSave = () => ok({ id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', version: 1, created: true, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z' })
    fake.filaDeInvocacao('order-proposals?action=get', ...Array.from({ length: 10 }, () => () => ok(leituraDoMontado({ proposal: { id: 'dddddddd-0000-4000-8000-000000000001' } }))))
    await clicar(criarLink())
    await andar(100)
    expect(corposDe(SAVE).map((c) => c.expected_total)).toEqual([120, 132])
    // A mesma chave de idempotência nas duas tentativas.
    expect(corposDe(SAVE)[1].idempotency_key).toBe(corposDe(SAVE)[0].idempotency_key)
  })

  it('outra falha: "Nada foi enviado à cliente", e a montagem fica', async () => {
    await abrirARevisao()
    respostaDoSave = () => http(500, { error: 'Não consegui gravar a proposta.' })
    await clicar(criarLink())
    await andar(100)
    expect(screen.getByTestId('erro-da-criacao')).toHaveTextContent(NADA_ENVIADO)
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(criarLink()).not.toBeDisabled()
  })

  it('"Criando o link…" desligado enquanto grava: o segundo toque não sai', async () => {
    await abrirARevisao()
    let soltar: (() => void) | null = null
    respostaDoSave = () =>
      new Promise<RespostaInvocacao>((resolver) => {
        soltar = () => resolver(ok({ id: 'dddddddd-0000-4000-8000-000000000001', number: 'P-0050', version: 1, created: true, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z' }))
      })
    fake.filaDeInvocacao('order-proposals?action=get', ...Array.from({ length: 10 }, () => () => ok(leituraDoMontado({ proposal: { id: 'dddddddd-0000-4000-8000-000000000001' } }))))
    await clicar(criarLink())
    const gravando = within(barra()).getByRole('button', { name: 'Criando o link…' })
    expect(gravando).toBeDisabled()
    fireEvent.click(gravando)
    expect(fake.invocacoesDe(SAVE)).toHaveLength(1)
    await act(async () => soltar?.())
    await andar(100)
    expect(window.location.pathname).toBe('/pedidos/montados/dddddddd-0000-4000-8000-000000000001')
  })
})

describe('Editar um pedido montado aberto', () => {
  const ID_MARINA = 'aaaaaaaa-0000-4000-8000-000000000009'
  const gravado = () =>
    leituraDoMontado({
      proposal: {
        version: 3,
        customer_id: ID_MARINA,
        customer_phone: '51999990000',
        manual_discount_kind: 'amount',
        manual_discount_value: 10,
        manual_discount_reason: 'segunda peça da família',
        admin_note: 'Ela pediu caixinha.',
        items: [
          {
            position: 0,
            product_id: ID_COLAR,
            variant_id: null,
            product_name: 'Colar Estrela',
            product_image: FOTO_DO_COLAR,
            variant_label: null,
            quantity: 2,
            list_price: 120,
            unit_price: 120,
            engraving_text: 'Helena',
            requires_material: false,
          },
        ],
      },
    })

  it('"Editar" abre a montagem preenchida pelo `get`, e salvar mantém o link e volta ao pedido montado', async () => {
    totalDoServidor = 230
    fake.filaDeInvocacao('order-proposals?action=get', ...Array.from({ length: 20 }, () => () => ok(gravado())))
    respostaDoSave = () => ok({ id: ID_ABERTO, number: 'P-0042', version: 4, created: false, token: null, expires_at: null })
    await montarApp(`/pedidos/montados/${ID_ABERTO}`, { estado: { doApp: true } })
    await andar(50)
    await clicar(screen.getByRole('button', { name: 'Editar' }))
    await andar(100)
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.getByRole('heading', { level: 1, name: 'Editar pedido montado' })).toBeInTheDocument()
    // Passo 1: a ficha dela, e o endereço gravado.
    expect(screen.getByRole('region', { name: 'Cliente' })).toHaveTextContent('Marina Duarte')
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua das Flores')
    await clicar(continuar())
    // Passo 2: as peças gravadas, com a gravação.
    expect(screen.getByText('Gravação: Helena')).toBeInTheDocument()
    await clicar(continuar())
    // Passo 3: o desconto combinado gravado.
    expect(screen.getByRole('switch', { name: /Desconto combinado/ })).toBeChecked()
    await clicar(continuar())
    await andar(100)
    expect(screen.getByText('Passo 4 de 4 · Revisar')).toBeInTheDocument()
    expect(screen.getByLabelText('Observação interna')).toHaveValue('Ela pediu caixinha.')
    expect(texto(screen.getByTestId('peca-da-revisao'))).toContain('2 un. · gravação “Helena”')
    await clicar(within(barra()).getByRole('button', { name: 'Salvar alterações' }))
    await andar(150)
    const [corpo] = corposDe(SAVE)
    expect(corpo).toMatchObject({
      id: ID_ABERTO,
      version: 3,
      customer_id: ID_MARINA,
      customer_name: 'Marina Duarte',
      address_zip: '91240010',
      lines: [{ product_id: ID_COLAR, variant_id: null, quantity: 2, engraving_text: 'Helena' }],
      manual_discount: { kind: 'amount', value: 10, reason: 'segunda peça da família' },
      expected_total: 230,
      admin_note: 'Ela pediu caixinha.',
      save_address: false,
    })
    expect(corpo).not.toHaveProperty('idempotency_key')
    expect(window.location.pathname).toBe(`/pedidos/montados/${ID_ABERTO}`)
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Alterações salvas.')
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('O link continua o mesmo.')
    expect(screen.getByTestId('o-link')).toHaveTextContent('https://loja.exemplo.invalid/pedido-montado#tok-aberto')
  })

  it('o pedido montado concluído não oferece Editar', async () => {
    fake.filaDeInvocacao('order-proposals?action=get', ...Array.from({ length: 10 }, () => () => ok(leituraDoMontado({ state: 'completed', proposal: { order_id: 'ffffffff-0000-4000-8000-000000000262', order_number: '0262' } }))))
    await montarApp(`/pedidos/montados/${ID_ABERTO}`, { estado: { doApp: true } })
    await andar(50)
    expect(screen.getByRole('link', { name: /Ver o pedido/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  })
})

describe('a conta que perde o papel no passo 4', () => {
  const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
  /** A conta perde o papel AGORA: a conferência (`atelie_clock`) passa a responder `42501`. */
  const perderOPapel = () => {
    fake.estado.admins.clear()
    fake.falharRpc('atelie_clock', RECUSA)
  }
  const observar = async (ms: number) => {
    const instantes: string[] = [texto(document.body)]
    for (let feito = 0; feito < ms; feito += 50) {
      await andar(50)
      instantes.push(texto(document.body))
    }
    return instantes
  }

  it('"Criar link" com o `save` em 403 e `atelie_clock` em `42501` ⇒ a recusa da tela de entrada, nunca a frase da falha', async () => {
    await abrirARevisao()
    await andar(100)
    respostaDoSave = () => {
      perderOPapel()
      return http(403, { error: 'forbidden' })
    }
    await act(async () => {
      fireEvent.click(criarLink())
    })
    const instantes = await observar(3000)
    expect(fake.invocacoesDe(SAVE)).toHaveLength(1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes(NADA_ENVIADO))).toBe(-1)
  })

  it('a prévia do frete lida com `atelie_clock` em `42501` ⇒ a recusa da tela de entrada, e nenhuma opção de entrega', async () => {
    // Pelo Editar: nele a nota do prazo não lê o relógio, então a ÚNICA leitura que confere o papel ao
    // entrar no passo 4 é a da cotação.
    fake.filaDeInvocacao(
      'order-proposals?action=get',
      ...Array.from({ length: 20 }, () => () =>
        ok(
          leituraDoMontado({
            proposal: {
              customer_id: 'aaaaaaaa-0000-4000-8000-000000000009',
              items: [
                { position: 0, product_id: ID_COLAR, variant_id: null, product_name: 'Colar Estrela', product_image: FOTO_DO_COLAR, variant_label: null, quantity: 1, list_price: 120, unit_price: 120, engraving_text: null, requires_material: false },
              ],
            },
          }),
        ),
      ),
    )
    await montarApp(`/pedidos/montados/${ID_ABERTO}`, { estado: { doApp: true } })
    await andar(50)
    await clicar(screen.getByRole('button', { name: 'Editar' }))
    await andar(100)
    await clicar(continuar())
    await clicar(continuar())
    await andar(100)
    const cotacoesAntes = fake.invocacoesDe(COTACAO).length
    perderOPapel()
    await act(async () => {
      fireEvent.click(continuar())
    })
    const instantes = await observar(3000)
    expect(cotacoesAntes).toBe(0)
    expect(fake.invocacoesDe(COTACAO).length).toBeGreaterThan(0)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes('PAC · 5 dias úteis'))).toBe(-1)
  })
})
