// A montagem de um pedido no app — a casca dos quatro passos e o passo 1 (Cliente), pela árvore REAL
// (`<App />` com sessão admin sobre o dublê do client). O dublê responde `customer_list` e `addresses`
// filtrando as fixturas pelo que a consulta pediu (como o PostgREST faria com `ilike`), e o serviço de
// CEP é um `fetch` falso. As frases são escritas por extenso (fonte independente do código).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_JULIANA = 'aaaaaaaa-0000-4000-8000-000000000001'
const ID_HELENA = 'aaaaaaaa-0000-4000-8000-000000000002'
// A convidada: o id da view é o md5 do e-mail — não existe em `customers`.
const ID_MARTA = '6f1ed002ab5595859014ebf0951522d9'

const CLIENTES = [
  { id: ID_JULIANA, name: 'Juliana Prates', email: 'juliana@exemplo.invalid', phone: '51988887777', has_account: true, orders_total: 2 },
  { id: ID_HELENA, name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 },
  { id: ID_MARTA, name: 'Marta Lima', email: 'marta@exemplo.invalid', phone: '51977776666', has_account: false, orders_total: 1 },
]

const ENDERECOS: Record<string, unknown[]> = {
  [ID_JULIANA]: [
    { id: 'e1', label: null, cep: '90010-000', street: 'Rua das Flores', number: '120', complement: 'ap 3', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', is_default: true, created_at: '2026-01-01T00:00:00Z' },
    { id: 'e2', label: 'Trabalho', cep: '90020-000', street: 'Av. Ipiranga', number: '50', complement: null, neighborhood: 'Azenha', city: 'Porto Alegre', state: 'RS', is_default: false, created_at: '2026-02-01T00:00:00Z' },
  ],
  [ID_HELENA]: [],
}

/** O valor de `ilike."…"` como o PostgREST o casa: `%` dos lados é "contém", sem `%` é igualdade (sem caixa). */
const casa = (valor: string | null, padrao: string): boolean => {
  const v = (valor ?? '').toLowerCase()
  const p = padrao.replace(/\\(.)/g, '$1').toLowerCase()
  if (p.startsWith('%') && p.endsWith('%')) return v.includes(p.slice(1, -1))
  return v === p
}

/** As linhas que um `.or(…)` de `ilike` deixa passar (sem `or`, todas). */
const filtrar = (cadeia: Elo[]) => {
  const or = cadeia.find((e) => e.metodo === 'or')
  if (!or) return CLIENTES
  const condicoes = [...String(or.args[0]).matchAll(/(\w+)\.ilike\."((?:[^"\\]|\\.)*)"/g)].map((m) => ({ col: m[1], padrao: m[2] }))
  return CLIENTES.filter((c) => condicoes.some((k) => casa(String((c as Record<string, unknown>)[k.col] ?? ''), k.padrao)))
}

// O catálogo do passo 2: uma peça sem grade, para o passo poder seguir (ele pede ao menos uma peça).
const PECA = {
  id: 'bbbbbbbb-0000-4000-8000-000000000001', name: 'Colar Estrela', base_price: 120, image_url: null, capa: null, is_active: true,
  stock_policy: 'track', stock_total: 5, requires_material: false, engraving_max_chars: null, options: [],
  weight_kg: null, width_cm: null, height_cm: null, length_cm: null,
}
/** Como o PostgREST responde: a contagem no `head`, a página pelo `range`. */
const comoOPostgrest = (linhas: unknown[]) => (cadeia: Elo[]) =>
  (cadeia.find((e) => e.metodo === 'select')?.args[1] as { head?: boolean } | undefined)?.head
    ? { data: null, error: null, count: linhas.length }
    : { data: linhas, error: null }

const CEPS: Record<string, unknown> = {
  '90010000': { logradouro: 'Rua dos Andradas', bairro: 'Centro Histórico', localidade: 'Porto Alegre', uf: 'RS' },
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const voltar = () =>
  act(async () => {
    window.history.back()
    await vi.advanceTimersByTimeAsync(50)
  })
const clicar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const digitar = async (rotulo: string, valor: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText(rotulo), { target: { value: valor } })
  })
  await andar(400)
}
const buscar = async (termo: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: termo } })
  })
  await andar(400)
  await andar(50)
}

const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const passo = (n: number, nome: string) => screen.getByRole('button', { name: `Passo ${n}: ${nome}` })
const resultados = () => screen.queryByRole('list', { name: 'Clientes' })
const nomesNaLista = () => within(resultados()!).queryAllByRole('button').map((b) => b.textContent)

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ({ data: { proposals: [], agora: AGORA }, error: null })))
  fake.responderTabela('customer_list', (cadeia) => ({ data: filtrar(cadeia), error: null }))
  fake.responderTabela('products', comoOPostgrest([PECA]))
  fake.responderTabela('product_variants', comoOPostgrest([]))
  fake.responderTabela('addresses', (cadeia) => {
    const id = cadeia.find((e) => e.metodo === 'eq' && e.args[0] === 'customer_id')?.args[1] as string
    return { data: ENDERECOS[id] ?? [], error: null }
  })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const cep = /ws\/(\d{8})\/json/.exec(String(url))?.[1] ?? ''
      if (cep === '99999999') throw new TypeError('Failed to fetch')
      return new Response(JSON.stringify(CEPS[cep] ?? { erro: true }), { status: 200 })
    }),
  )
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // Uma sentinela conhecida antes de cada teste: o histórico do jsdom é um só por arquivo.
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const abrirPelaListaDePedidos = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
}

const escolher = async (nome: string) => {
  await clicar(within(resultados()!).getByRole('button', { name: new RegExp(nome) }))
  await andar(50)
}

describe('a casca da montagem', () => {
  it('"Montar pedido" em Pedidos abre a montagem em tela cheia, no passo 1, sem a barra de abas', async () => {
    await abrirPelaListaDePedidos()
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.getByRole('heading', { level: 1, name: 'Montar pedido' })).toBeInTheDocument()
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fechar a montagem' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: /abas/i })).not.toBeInTheDocument()
    // A barra: nenhuma peça, o total em traço, e o motivo escrito do botão desligado.
    expect(within(barra()).getByText('Nenhuma peça ainda')).toBeInTheDocument()
    expect(within(barra()).getByText('—')).toBeInTheDocument()
    expect(within(barra()).getByText('Escolha a cliente para continuar.')).toBeInTheDocument()
    expect(continuar()).toBeDisabled()
    // Nada da cliente na URL nem no estado da entrada: só o número do passo.
    expect(window.location.search).toBe('')
    expect(window.history.state.usr).toEqual({ doApp: true, passoDaMontagem: 1 })
  })

  it('o indicador só navega até o passo mais alto alcançado', async () => {
    await abrirPelaListaDePedidos()
    expect(passo(2, 'Peças')).toHaveAttribute('aria-disabled', 'true')
    await clicar(passo(2, 'Peças'))
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()

    await escolher('Helena Prado')
    expect(continuar()).toBeEnabled()
    await clicar(continuar())
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
    expect(passo(2, 'Peças')).toHaveAttribute('aria-current', 'step')
    expect(passo(3, 'Descontos')).toHaveAttribute('aria-disabled', 'true')

    await clicar(passo(1, 'Cliente'))
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    expect(passo(2, 'Peças')).not.toHaveAttribute('aria-disabled')
    await clicar(passo(2, 'Peças'))
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
    await clicar(passo(4, 'Revisar'))
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
  })

  it('o motivo do bloqueio aparece escrito na barra e descreve o botão desligado', async () => {
    await abrirPelaListaDePedidos()
    const motivo = within(barra()).getByText('Escolha a cliente para continuar.')
    expect(continuar()).toHaveAttribute('aria-describedby', motivo.id)
    await escolher('Helena Prado')
    expect(within(barra()).queryByText('Escolha a cliente para continuar.')).not.toBeInTheDocument()
    expect(continuar()).not.toHaveAttribute('aria-describedby')
  })
})

describe('o voltar do Android e o fechar', () => {
  it('o voltar recua um passo', async () => {
    await abrirPelaListaDePedidos()
    await escolher('Helena Prado')
    await clicar(continuar())
    // O passo 2 pede ao menos uma peça para seguir.
    await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
    await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
    await clicar(continuar())
    expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
    await voltar()
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
    await voltar()
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    // A cliente continua escolhida: recuar não apaga a montagem.
    expect(screen.getByRole('region', { name: 'Cliente' })).toHaveTextContent('Helena Prado')
  })

  it('no primeiro passo, com algo preenchido, o voltar pede a confirmação — "Continuar montando" fica, "Sair" sai', async () => {
    await abrirPelaListaDePedidos()
    await escolher('Helena Prado')
    await voltar()
    const folha = await screen.findByRole('dialog')
    expect(within(folha).getByText('Sair sem criar o link?')).toBeInTheDocument()
    expect(within(folha).getByText('Nada foi gravado ainda. A montagem se perde ao sair.')).toBeInTheDocument()
    await clicar(within(folha).getByRole('button', { name: 'Continuar montando' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cliente' })).toHaveTextContent('Helena Prado')

    await voltar()
    await clicar(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sair' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
  })

  it('no primeiro passo, sem nada preenchido, o voltar sai direto para Pedidos', async () => {
    await abrirPelaListaDePedidos()
    await voltar()
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('o "x" sem nada preenchido fecha direto; com algo, pergunta — e o voltar fecha a folha aberta', async () => {
    await abrirPelaListaDePedidos()
    await clicar(screen.getByRole('button', { name: 'Fechar a montagem' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')

    await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
    await andar(50)
    await escolher('Helena Prado')
    await clicar(continuar())
    await clicar(screen.getByRole('button', { name: 'Fechar a montagem' }))
    expect(within(await screen.findByRole('dialog')).getByText('Sair sem criar o link?')).toBeInTheDocument()
    await voltar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()

    await clicar(screen.getByRole('button', { name: 'Fechar a montagem' }))
    await clicar(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sair' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
  })

  it('aberta direto pelo endereço, a montagem fica por cima de Pedidos: o "x" volta para lá', async () => {
    await montarApp('/pedidos/montar')
    await andar(50)
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    await clicar(screen.getByRole('button', { name: 'Fechar a montagem' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
  })
})

describe('passo 1 · cliente cadastrada', () => {
  it('a busca acha pelo nome, pelo e-mail e pelos dígitos do telefone — e a vazia lista todas', async () => {
    await abrirPelaListaDePedidos()
    expect(nomesNaLista()).toHaveLength(3)
    expect(within(resultados()!).getByRole('button', { name: /Juliana Prates/ })).toHaveTextContent('juliana@exemplo.invalid · 2 pedidos')

    await buscar('juliana')
    expect(nomesNaLista()).toHaveLength(1)
    expect(nomesNaLista()[0]).toContain('Juliana Prates')

    await buscar('marta@exemplo.invalid')
    expect(nomesNaLista()).toHaveLength(1)
    expect(nomesNaLista()[0]).toContain('Marta Lima')

    await buscar('(11) 95555-4444')
    expect(nomesNaLista()).toHaveLength(1)
    expect(nomesNaLista()[0]).toContain('Helena Prado')

    await buscar('zzz')
    expect(resultados()).not.toBeInTheDocument()
    expect(screen.getByText(/Ninguém com “zzz”\. Se for a primeira compra, use/)).toBeInTheDocument()
  })

  it('escolhida, a entrega vem no endereço padrão; "Endereço salvo" mostra os outros; "Trocar" volta à busca', async () => {
    await abrirPelaListaDePedidos()
    await escolher('Juliana Prates')
    const entrega = screen.getByRole('radiogroup', { name: 'Entrega' })
    const padrao = within(entrega).getByRole('radio', { name: /Endereço padrão/ })
    expect(padrao).toBeChecked()
    expect(entrega).toHaveTextContent('Rua das Flores, 120, ap 3 — Centro, Porto Alegre/RS · 90010-000')
    expect(continuar()).toBeEnabled()

    await clicar(within(entrega).getByRole('radio', { name: /Endereço salvo/ }))
    const salvos = screen.getByRole('radiogroup', { name: 'Endereços salvos' })
    expect(within(salvos).getByRole('radio', { name: /Trabalho/ })).toBeChecked()
    expect(salvos).toHaveTextContent('Av. Ipiranga, 50 — Azenha, Porto Alegre/RS · 90020-000')
    expect(continuar()).toBeEnabled()

    await clicar(screen.getByRole('button', { name: 'Trocar' }))
    expect(resultados()).toBeInTheDocument()
    expect(within(barra()).getByText('Escolha a cliente para continuar.')).toBeInTheDocument()
  })

  it('"Outro endereço" pede o endereço inteiro (o salvar no cadastro vem ligado); "A cliente preenche no link" libera', async () => {
    await abrirPelaListaDePedidos()
    await escolher('Juliana Prates')
    await clicar(screen.getByRole('radio', { name: /Outro endereço/ }))
    expect(screen.getByRole('radio', { name: /Outro endereço/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /Salvar no cadastro da cliente/ })).toBeChecked()
    expect(screen.getByText('Só é gravado quando você criar o link.')).toBeInTheDocument()
    expect(within(barra()).getByText("Complete o endereço, ou escolha 'A cliente preenche no link'.")).toBeInTheDocument()
    expect(continuar()).toBeDisabled()

    await digitar('CEP', '90010000')
    await andar(50)
    expect(screen.getByLabelText('CEP')).toHaveValue('90010-000')
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua dos Andradas')
    expect(continuar()).toBeDisabled()
    await digitar('Número', '77')
    expect(within(barra()).queryByText(/Complete o endereço/)).not.toBeInTheDocument()
    expect(continuar()).toBeEnabled()

    await clicar(screen.getByRole('radio', { name: /A cliente preenche no link/ }))
    expect(screen.queryByLabelText('CEP')).not.toBeInTheDocument()
    expect(continuar()).toBeEnabled()
  })

  it('a convidada (sem ficha) não tem endereço salvo: a entrega vem em "A cliente preenche no link", sem ler endereço', async () => {
    await abrirPelaListaDePedidos()
    await escolher('Marta Lima')
    expect(screen.getByRole('radio', { name: /A cliente preenche no link/ })).toBeChecked()
    expect(screen.queryByRole('radio', { name: /Endereço padrão/ })).not.toBeInTheDocument()
    expect(fake.cadeiasDe('addresses')).toHaveLength(0)
    expect(continuar()).toBeEnabled()
  })

  it('a ficha sem endereço salvo também vem em "A cliente preenche no link"', async () => {
    await abrirPelaListaDePedidos()
    await escolher('Helena Prado')
    expect(screen.getByRole('radio', { name: /A cliente preenche no link/ })).toBeChecked()
    expect(fake.cadeiasDe('addresses')).toHaveLength(1)
  })
})

describe('passo 1 · cliente nova', () => {
  const abrirNova = async () => {
    await abrirPelaListaDePedidos()
    await clicar(screen.getByRole('button', { name: 'Cliente nova' }))
  }

  it('o contato tem máscara no WhatsApp e no documento, e os motivos aparecem na ordem', async () => {
    await abrirNova()
    expect(screen.getByRole('button', { name: 'Cliente nova' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(barra()).getByText('Falta o nome da cliente.')).toBeInTheDocument()
    await digitar('Nome', 'Ana Souza')
    expect(within(barra()).getByText('Falta o e-mail da cliente — é por ele que o pedido chega a ela.')).toBeInTheDocument()
    await digitar('E-mail', 'ana@exemplo')
    expect(within(barra()).getByText('Confira o e-mail da cliente.')).toBeInTheDocument()
    await digitar('E-mail', 'ana@exemplo.invalid')
    expect(within(barra()).getByText("Complete o endereço, ou escolha 'A cliente preenche no link'.")).toBeInTheDocument()

    await digitar('WhatsApp', '51999998888')
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(51) 99999-8888')
    await digitar('CPF (opcional)', '12345678909')
    expect(screen.getByLabelText('CPF (opcional)')).toHaveValue('123.456.789-09')

    await clicar(screen.getByRole('radio', { name: /A cliente preenche no link/ }))
    expect(continuar()).toBeEnabled()
  })

  it('o e-mail que já tem ficha avisa e oferece "Usar a ficha dela" / "Corrigir o e-mail"', async () => {
    await abrirNova()
    await digitar('Nome', 'Juliana')
    await digitar('E-mail', 'JULIANA@exemplo.invalid')
    const aviso = await screen.findByRole('alert')
    expect(aviso).toHaveTextContent('JULIANA@exemplo.invalid já é de Juliana Prates · 2 pedidos. Para não nascer uma segunda ficha, use a dela.')
    expect(within(barra()).getByText('Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail.')).toBeInTheDocument()
    expect(continuar()).toBeDisabled()

    await clicar(within(aviso).getByRole('button', { name: 'Corrigir o e-mail' }))
    expect(document.activeElement).toBe(screen.getByLabelText('E-mail'))
  })

  it('"Usar a ficha dela" sem CEP leva à cadastrada, com a entrega no endereço padrão dela', async () => {
    await abrirNova()
    await digitar('E-mail', 'juliana@exemplo.invalid')
    await clicar(within(await screen.findByRole('alert')).getByRole('button', { name: 'Usar a ficha dela' }))
    expect(screen.getByRole('button', { name: 'Cliente cadastrada' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Cliente' })).toHaveTextContent('Juliana Prates')
    expect(screen.getByRole('radio', { name: /Endereço padrão/ })).toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent('A entrega veio no endereço padrão dela.')
  })

  it('"Usar a ficha dela" com CEP de 8 dígitos guarda o endereço digitado como "Outro endereço"', async () => {
    await abrirNova()
    await digitar('E-mail', 'juliana@exemplo.invalid')
    await digitar('CEP', '90010-000')
    await digitar('Número', '9')
    await clicar(within(await screen.findByRole('alert')).getByRole('button', { name: 'Usar a ficha dela' }))
    expect(screen.getByRole('radio', { name: /Outro endereço/ })).toBeChecked()
    expect(screen.getByLabelText('CEP')).toHaveValue('90010-000')
    expect(screen.getByLabelText('Número')).toHaveValue('9')
    const status = screen.getAllByRole('status').find((s) => s.textContent?.includes('Usando a ficha'))!
    expect(status).toHaveTextContent('Usando a ficha de Juliana Prates.')
    expect(status).toHaveTextContent('O endereço lido do texto ficou como “Outro endereço”.')
  })

  it('o CEP conhecido completa rua, bairro, cidade e UF, com a dica', async () => {
    await abrirNova()
    expect(screen.getByLabelText('Rua')).toHaveAttribute('readonly')
    await digitar('CEP', '90010000')
    await andar(50)
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua dos Andradas')
    expect(screen.getByLabelText('Bairro')).toHaveValue('Centro Histórico')
    expect(screen.getByLabelText('Cidade')).toHaveValue('Porto Alegre')
    expect(screen.getByLabelText('UF')).toHaveValue('RS')
    expect(screen.getByText('Porto Alegre/RS · endereço completado pelo CEP.')).toBeInTheDocument()
  })

  it.each([
    ['o serviço não encontra', '01000000'],
    ['o serviço está fora do ar', '99999999'],
  ])('CEP que %s libera rua, bairro, cidade e UF, com a frase', async (_caso, cep) => {
    await abrirNova()
    await digitar('CEP', cep)
    await andar(50)
    expect(screen.getByText('Não achei este CEP. Confira, ou preencha o endereço à mão.')).toBeInTheDocument()
    for (const rotulo of ['Rua', 'Bairro', 'Cidade', 'UF']) expect(screen.getByLabelText(rotulo)).not.toHaveAttribute('readonly')
    await digitar('Rua', 'Rua Nova')
    expect(screen.getByLabelText('Rua')).toHaveValue('Rua Nova')
  })

  it('o endereço incompleto bloqueia com o motivo, e completo libera', async () => {
    await abrirNova()
    await digitar('Nome', 'Ana Souza')
    await digitar('E-mail', 'ana@exemplo.invalid')
    await digitar('CEP', '01000000')
    await andar(50)
    await digitar('Rua', 'Rua Nova')
    await digitar('Número', '10')
    await digitar('Bairro', 'Sé')
    await digitar('Cidade', 'São Paulo')
    expect(within(barra()).getByText("Complete o endereço, ou escolha 'A cliente preenche no link'.")).toBeInTheDocument()
    expect(continuar()).toBeDisabled()
    await digitar('UF', 'sp')
    expect(screen.getByLabelText('UF')).toHaveValue('SP')
    expect(continuar()).toBeEnabled()
  })

  it('trocar o segmento limpa a cliente, o contato e o endereço', async () => {
    await abrirNova()
    await digitar('Nome', 'Ana Souza')
    await clicar(screen.getByRole('button', { name: 'Cliente cadastrada' }))
    await clicar(screen.getByRole('button', { name: 'Cliente nova' }))
    expect(screen.getByLabelText('Nome')).toHaveValue('')
  })
})
