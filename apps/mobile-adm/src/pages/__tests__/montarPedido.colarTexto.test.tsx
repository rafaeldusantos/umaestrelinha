// A folha "Colar texto" do passo 1 da montagem, pela árvore REAL (`<App />` com sessão admin sobre o
// dublê do client). A function `customer-parse` responde da fila do dublê, na forma do supabase-js (o
// erro HTTP é um `FunctionsHttpError` com o `Response` em `context`), e o serviço de CEP é um `fetch`
// falso. As frases são escritas por extenso (fonte independente do código).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_JULIANA = 'aaaaaaaa-0000-4000-8000-000000000001'
const LEITURA = 'customer-parse'

const CLIENTES = [
  { id: ID_JULIANA, name: 'Juliana Prates', email: 'juliana@exemplo.invalid', phone: '51988887777', has_account: true, orders_total: 2 },
]
const ENDERECOS: Record<string, unknown[]> = {
  [ID_JULIANA]: [
    { id: 'e1', label: null, cep: '90010-000', street: 'Rua das Flores', number: '120', complement: 'ap 3', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', is_default: true, created_at: '2026-01-01T00:00:00Z' },
  ],
}
const CEPS: Record<string, unknown> = {
  '90010000': { logradouro: 'Rua dos Andradas', bairro: 'Centro Histórico', localidade: 'Porto Alegre', uf: 'RS' },
}

const filtrar = (cadeia: Elo[]) => {
  const or = cadeia.find((e) => e.metodo === 'or')
  if (!or) return CLIENTES
  const termos = [...String(or.args[0]).matchAll(/(\w+)\.ilike\."((?:[^"\\]|\\.)*)"/g)].map((m) => ({ col: m[1], p: m[2].replace(/\\(.)/g, '$1').toLowerCase() }))
  return CLIENTES.filter((c) =>
    termos.some(({ col, p }) => {
      const v = String((c as Record<string, unknown>)[col] ?? '').toLowerCase()
      return p.startsWith('%') && p.endsWith('%') ? v.includes(p.slice(1, -1)) : v === p
    }),
  )
}

/** O que a function devolve no modo `contact_and_address`: o contato e o endereço já conferidos. */
const CONVERSA = {
  contact: { name: 'Ana Souza', email: '', phone: '(51) 99999-8888', cpf: '' },
  address: { cep: '90010-000', street: 'R. dos Andradas', number: '120', complement: '', neighborhood: 'Centro', city: 'POA', state: 'RS' },
  found: 8,
}

const ok = (data: unknown) => ({ data, error: null })
const http = (status: number, corpo: unknown) => ({
  data: null,
  error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  }),
})
const rede = () => ({
  data: null,
  error: Object.assign(new Error('Failed to send a request to the Edge Function'), { name: 'FunctionsFetchError' }),
})
const responder = (...respostas: unknown[]) =>
  fake.filaDeInvocacao(LEITURA, ...(respostas as Parameters<typeof fake.filaDeInvocacao>[1][]))

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
const mudar = async (el: HTMLElement, valor: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value: valor } })
  })
  await andar(400)
}
const digitar = (rotulo: string, valor: string) => mudar(screen.getByLabelText(rotulo), valor)

const folha = () => screen.queryByRole('dialog')
const lerOTexto = () => within(folha()!).getByRole('button', { name: /Ler o texto|Lendo o texto…/ })
const colar = async (texto: string) => {
  await mudar(within(folha()!).getByLabelText('Texto da conversa'), texto)
}
const ler = async () => {
  await clicar(lerOTexto())
  await andar(50)
}
const avisoDaLeitura = () => screen.queryByRole('region', { name: 'Leitura do texto' })
const valorDe = (rotulo: string | RegExp) => (screen.getByLabelText(rotulo) as HTMLInputElement).value

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ({ data: { proposals: [], agora: AGORA }, error: null })))
  fake.responderTabela('customer_list', (cadeia) => ({ data: filtrar(cadeia), error: null }))
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
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const abrirMontagem = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
}
const abrirNova = async () => {
  await abrirMontagem()
  await clicar(screen.getByRole('button', { name: 'Cliente nova' }))
}
const abrirFolhaDaNova = async () => {
  const cartao = screen.getByRole('region', { name: 'Tem os dados numa mensagem?' })
  expect(cartao).toHaveTextContent(
    'Cole a conversa do WhatsApp. Eu leio e preencho nome, contato e endereço — você confere antes de seguir.',
  )
  await clicar(within(cartao).getByRole('button', { name: 'Colar texto da conversa' }))
  await andar(50)
}

describe('Cliente nova: a folha lê contato e endereço', () => {
  it('a folha tem o título do escopo, o aviso de que o texto não fica, o contador, e "Ler o texto" desligado vazio', async () => {
    await abrirNova()
    await abrirFolhaDaNova()
    const f = folha()!
    expect(within(f).getByText('Colar o texto da conversa')).toBeInTheDocument()
    expect(within(f).getByText('Eu leio e preencho os campos da cliente e da entrega. Você confere tudo antes de seguir.')).toBeInTheDocument()
    expect(within(f).getByLabelText('Texto da conversa')).toHaveAttribute('placeholder', 'Cole aqui a mensagem com nome, e-mail, telefone e endereço')
    expect(within(f).getByText('O texto não fica guardado.')).toBeInTheDocument()
    expect(within(f).getByText('0 / 2000')).toBeInTheDocument()
    expect(within(f).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
    expect(lerOTexto()).toBeDisabled()
    await colar('   ')
    expect(lerOTexto()).toBeDisabled()
  })

  it('o texto é cortado em 2.000 caracteres na digitação, e o contador acompanha', async () => {
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('a'.repeat(2100))
    expect((within(folha()!).getByLabelText('Texto da conversa') as HTMLTextAreaElement).value).toHaveLength(2000)
    expect(within(folha()!).getByText('2000 / 2000')).toBeInTheDocument()
  })

  it('lê pela porta no escopo de contato e endereço; "Lendo o texto…" desligado durante a leitura; o sucesso fecha a folha e marca os campos', async () => {
    let soltar: (v: unknown) => void = () => {}
    responder(() => new Promise((r) => (soltar = r)))
    await abrirNova()
    await abrirFolhaDaNova()
    const TEXTO = 'Oi, sou a Ana Souza, meu zap 51 99999-8888, Rua dos Andradas 120, Centro, POA, CEP 90010-000'
    await colar(TEXTO)
    await ler()
    // Durante a leitura: o botão diz "Lendo o texto…" e não responde.
    expect(lerOTexto()).toHaveTextContent('Lendo o texto…')
    expect(lerOTexto()).toBeDisabled()
    expect(fake.invocacoesDe(LEITURA)).toEqual([{ nome: LEITURA, opcoes: { body: { text: TEXTO, mode: 'contact_and_address' } } }])
    // O texto colado não vai ao endereço nem à entrada do histórico.
    expect(window.location.href).not.toContain('Andradas')
    expect(JSON.stringify(window.history.state)).not.toContain('Ana')

    await act(async () => soltar(ok(CONVERSA)))
    await andar(100)
    expect(folha()).not.toBeInTheDocument()
    expect(valorDe('Nome')).toBe('Ana Souza')
    expect(valorDe('WhatsApp')).toBe('(51) 99999-8888')
    expect(valorDe('E-mail')).toBe('')
    expect(valorDe('Número')).toBe('120')
    expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription('Lido do texto — confira.')
    expect(screen.getByLabelText('WhatsApp')).toHaveAccessibleDescription('Lido do texto — confira.')
    expect(screen.getByLabelText('Número')).toHaveAccessibleDescription('Lido do texto — confira.')
    expect(screen.getByLabelText('E-mail')).not.toHaveAccessibleDescription()
    expect(screen.getByLabelText('CEP')).toHaveAccessibleDescription('Lido do texto — conferido no serviço de CEP.')
    // O cartão some depois de uma leitura.
    expect(screen.queryByRole('region', { name: 'Tem os dados numa mensagem?' })).not.toBeInTheDocument()
  })

  it('o aviso conta os campos, nomeia os que faltaram e diz o que o CEP conferiu', async () => {
    responder(ok(CONVERSA))
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('a conversa')
    await ler()
    await andar(100)
    const aviso = avisoDaLeitura()!
    const linhas = within(aviso).getAllByText(/./, { selector: 'p' }).map((p) => p.textContent)
    expect(linhas).toEqual([
      'Preenchi 8 de 11 campos. Confira antes de seguir.',
      'Não achei: e-mail, CPF, complemento. O CEP conferiu rua, bairro e cidade.',
    ])
    expect(within(aviso).getByRole('button', { name: 'Ler outro texto' })).toBeInTheDocument()
    expect(within(aviso).getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
  })

  it('o CEP manda: com o serviço conhecendo o CEP, rua, bairro, cidade e UF vêm dele, não do texto', async () => {
    responder(ok(CONVERSA))
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('a conversa')
    await ler()
    await andar(100)
    expect(valorDe('Rua')).toBe('Rua dos Andradas')
    expect(valorDe('Bairro')).toBe('Centro Histórico')
    expect(valorDe('Cidade')).toBe('Porto Alegre')
    expect(valorDe('UF')).toBe('RS')
    expect(valorDe('CEP')).toBe('90010-000')
  })

  it('editar um campo lido tira a marca dele, e só dele', async () => {
    responder(ok(CONVERSA))
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('a conversa')
    await ler()
    await andar(100)
    await digitar('Nome', 'Ana Souza Lima')
    expect(screen.getByLabelText('Nome')).not.toHaveAccessibleDescription()
    expect(screen.getByLabelText('WhatsApp')).toHaveAccessibleDescription('Lido do texto — confira.')
    await digitar('Número', '121')
    expect(screen.getByLabelText('Número')).not.toHaveAccessibleDescription()
    expect(screen.getByLabelText('Rua')).toHaveAccessibleDescription('Lido do texto — confira.')
  })

  it('"Desfazer" volta exatamente ao estado de antes da leitura', async () => {
    responder(ok(CONVERSA))
    await abrirNova()
    await digitar('Nome', 'Antes')
    await digitar('E-mail', 'antes@exemplo.invalid')
    await digitar('Número', '7')
    await abrirFolhaDaNova()
    await colar('a conversa')
    await ler()
    await andar(100)
    expect(valorDe('Nome')).toBe('Ana Souza')
    // O e-mail não foi achado: ficou o que estava.
    expect(valorDe('E-mail')).toBe('antes@exemplo.invalid')

    await clicar(within(avisoDaLeitura()!).getByRole('button', { name: 'Desfazer' }))
    expect(valorDe('Nome')).toBe('Antes')
    expect(valorDe('E-mail')).toBe('antes@exemplo.invalid')
    expect(valorDe('WhatsApp')).toBe('')
    expect(valorDe('CEP')).toBe('')
    expect(valorDe('Rua')).toBe('')
    expect(valorDe('Número')).toBe('7')
    expect(screen.getByLabelText('Nome')).not.toHaveAccessibleDescription()
    expect(avisoDaLeitura()).not.toBeInTheDocument()
    expect(screen.getByText('Leitura desfeita.')).toBeInTheDocument()
    expect(screen.getByText('Os campos voltaram ao que estava antes.')).toBeInTheDocument()
    // De volta a antes da leitura: o cartão reaparece.
    expect(screen.getByRole('region', { name: 'Tem os dados numa mensagem?' })).toBeInTheDocument()
  })

  it('"Ler outro texto" reabre a folha no mesmo escopo, vazia', async () => {
    responder(ok(CONVERSA), ok({ ...CONVERSA, contact: { ...CONVERSA.contact, email: 'ana@exemplo.invalid' } }))
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('a conversa')
    await ler()
    await andar(100)
    await clicar(within(avisoDaLeitura()!).getByRole('button', { name: 'Ler outro texto' }))
    await andar(50)
    expect(within(folha()!).getByText('Colar o texto da conversa')).toBeInTheDocument()
    expect(within(folha()!).getByLabelText('Texto da conversa')).toHaveValue('')
    await colar('outra conversa')
    await ler()
    await andar(100)
    expect(fake.invocacoesDe(LEITURA).map((i) => (i.opcoes as { body: { mode: string } }).body.mode)).toEqual([
      'contact_and_address',
      'contact_and_address',
    ])
    expect(valorDe('E-mail')).toBe('ana@exemplo.invalid')
  })

  it('o e-mail lido que já tem ficha: "Usar a ficha dela" vira leitura só de endereço, e as marcas de contato saem', async () => {
    responder(ok({ ...CONVERSA, contact: { ...CONVERSA.contact, email: 'juliana@exemplo.invalid' }, found: 9 }))
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('a conversa')
    await ler()
    await andar(100)
    const aviso = await screen.findByRole('alert')
    await clicar(within(aviso).getByRole('button', { name: 'Usar a ficha dela' }))
    expect(screen.getByRole('region', { name: 'Cliente' })).toHaveTextContent('Juliana Prates')
    expect(screen.getByRole('radio', { name: /Outro endereço/ })).toBeChecked()
    expect(screen.getByLabelText('Número')).toHaveAccessibleDescription('Lido do texto — confira.')
    expect(within(avisoDaLeitura()!).getByText('Preenchi 6 de 7 campos. Confira antes de seguir.')).toBeInTheDocument()
    expect(within(avisoDaLeitura()!).getByText('Não achei: complemento. O CEP conferiu rua, bairro e cidade.')).toBeInTheDocument()
  })
})

describe('"Outro endereço" da cliente cadastrada: a folha lê só o endereço', () => {
  const abrirOutroEndereco = async () => {
    await abrirMontagem()
    await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Juliana Prates/ }))
    await andar(50)
    await clicar(screen.getByRole('radio', { name: /Outro endereço/ }))
    await clicar(screen.getByRole('button', { name: 'Colar de uma mensagem' }))
    await andar(50)
  }
  const ENDERECO_SP = { cep: '01000-000', street: 'Rua Nova', number: '10', complement: 'ap 2', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' }

  it('pede só o endereço, e nada da ficha muda — nem com um contato vindo na resposta', async () => {
    responder(ok({ contact: { name: 'Outra Pessoa', email: 'outra@exemplo.invalid', phone: '', cpf: '' }, address: ENDERECO_SP, found: 7 }))
    await abrirOutroEndereco()
    expect(within(folha()!).getByText('Colar o endereço')).toBeInTheDocument()
    expect(within(folha()!).getByText('Eu leio só o endereço. Os dados da ficha dela não mudam.')).toBeInTheDocument()
    await colar('Rua Nova 10 ap 2, Sé, São Paulo/SP, 01000-000')
    await ler()
    await andar(100)
    expect((fake.invocacoesDe(LEITURA)[0].opcoes as { body: { mode: string } }).body.mode).toBe('address')
    expect(folha()).not.toBeInTheDocument()
    const cliente = screen.getByRole('region', { name: 'Cliente' })
    expect(cliente).toHaveTextContent('Juliana Prates')
    expect(within(cliente).getByText('juliana@exemplo.invalid')).toBeInTheDocument()
    expect(within(cliente).getByText('2 pedidos na loja')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Outra Pessoa')
    expect(document.body.textContent).not.toContain('outra@exemplo.invalid')
    expect(valorDe(/^Complemento/)).toBe('ap 2')
    expect(screen.getByLabelText(/^Complemento/)).toHaveAccessibleDescription('Lido do texto — confira.')
    expect(within(avisoDaLeitura()!).getByText('Preenchi 7 de 7 campos. Confira antes de seguir.')).toBeInTheDocument()
  })

  it.each([
    ['não conhece o CEP', '01000-000'],
    ['está fora do ar', '99999-999'],
  ])('sem resposta do serviço de CEP (%s), fica o que o texto trouxe', async (_caso, cep) => {
    responder(ok({ address: { ...ENDERECO_SP, cep }, found: 7 }))
    await abrirOutroEndereco()
    await colar('o endereço')
    await ler()
    await andar(100)
    expect(valorDe('CEP')).toBe(cep)
    expect(valorDe('Rua')).toBe('Rua Nova')
    expect(valorDe('Bairro')).toBe('Sé')
    expect(valorDe('Cidade')).toBe('São Paulo')
    expect(valorDe('UF')).toBe('SP')
    expect(screen.getByLabelText('CEP')).toHaveAccessibleDescription(
      'Lido do texto — confira. Não achei este CEP. Confira, ou preencha o endereço à mão.',
    )
    expect(within(avisoDaLeitura()!).getByText('Achei todos os campos. Não consegui conferir o CEP.')).toBeInTheDocument()
  })
})

describe('os desfechos sem campos: a folha fica, e nada se perde', () => {
  const SEM_DADOS = 'Não encontrei nome, contato nem endereço neste texto. Confira se colou a mensagem certa, ou preencha à mão.'
  const FORA_DO_AR = 'A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde.'
  const LIMITE = 'Foram muitas leituras em pouco tempo. Espere alguns minutos para ler de novo, ou preencha à mão — nada do que você já fez se perde.'

  it.each([
    ['texto sem dados', ok({ contact: { name: '', email: '', phone: '', cpf: '' }, address: { cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' }, found: 0 }), SEM_DADOS],
    ['sem chave (503)', http(503, { reason: 'not_configured' }), FORA_DO_AR],
    ['prazo ou 5xx do modelo (502)', http(502, { reason: 'upstream' }), FORA_DO_AR],
    ['a rede caída', rede(), FORA_DO_AR],
    ['o limite por conta (429)', http(429, { reason: 'limited' }), LIMITE],
  ])('%s: a frase na folha aberta, "Preencher à mão" fecha, e o que já estava preenchido fica', async (_caso, resposta, frase) => {
    responder(resposta)
    await abrirNova()
    await digitar('Nome', 'Já digitado')
    await abrirFolhaDaNova()
    await colar('bom dia')
    await ler()
    await andar(100)
    expect(folha()).toBeInTheDocument()
    expect(within(folha()!).getByRole('alert')).toHaveTextContent(frase)
    expect(within(folha()!).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    await clicar(within(folha()!).getByRole('button', { name: 'Preencher à mão' }))
    expect(folha()).not.toBeInTheDocument()
    expect(valorDe('Nome')).toBe('Já digitado')
    expect(screen.getByLabelText('Nome')).not.toHaveAccessibleDescription()
    expect(avisoDaLeitura()).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/pedidos/montar')
  })

  it('o voltar do Android fecha a folha, na mesma tela e no mesmo passo', async () => {
    await abrirNova()
    await abrirFolhaDaNova()
    await colar('um texto')
    await voltar()
    expect(folha()).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    expect(fake.invocacoesDe(LEITURA)).toHaveLength(0)
  })
})

describe('desistir durante "Lendo o texto…": a folha fecha, e nada do que ela digitou muda', () => {
  const TEXTO = 'Sou a Paula Lima, paula.lima@exemplo.invalid, zap 51 98765-4321, Rua dos Andradas 100, cep 90010-000'
  const PAULA = {
    contact: { name: 'Paula Lima', email: 'paula.lima@exemplo.invalid', phone: '(51) 98765-4321', cpf: '' },
    address: { cep: '90010-000', street: 'Rua dos Andradas', number: '100', complement: '', neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS' },
    found: 9,
  }

  const lendoComNomeEEmail = async () => {
    let soltar: (v: unknown) => void = () => {}
    responder(() => new Promise((r) => (soltar = r)), ok(CONVERSA))
    await abrirNova()
    await digitar('Nome', 'Ju')
    await digitar('E-mail', 'ju.manual@exemplo.invalid')
    await abrirFolhaDaNova()
    await colar(TEXTO)
    await ler()
    expect(lerOTexto()).toHaveTextContent('Lendo o texto…')
    return () => act(async () => soltar(ok(PAULA)))
  }

  const nadaMudou = () => {
    expect(valorDe('Nome')).toBe('Ju')
    expect(valorDe('E-mail')).toBe('ju.manual@exemplo.invalid')
    expect(valorDe('Número')).toBe('')
    expect(screen.getByLabelText('Nome')).not.toHaveAccessibleDescription()
    expect(screen.getByLabelText('E-mail')).not.toHaveAccessibleDescription()
    expect(avisoDaLeitura()).not.toBeInTheDocument()
    // O cartão continua: nenhuma leitura entrou.
    expect(screen.getByRole('region', { name: 'Tem os dados numa mensagem?' })).toBeInTheDocument()
  }

  it('"Cancelar" fecha a folha durante a leitura, e a resposta que chega depois não muda campo nem mostra o aviso', async () => {
    const soltar = await lendoComNomeEEmail()
    const cancelar = within(folha()!).getByRole('button', { name: 'Cancelar' })
    expect(cancelar).toBeEnabled()
    await clicar(cancelar)
    await andar(100)
    expect(folha()).not.toBeInTheDocument()
    nadaMudou()

    await soltar()
    await andar(200)
    expect(folha()).not.toBeInTheDocument()
    nadaMudou()
  })

  it('Esc também fecha durante a leitura, e a resposta tardia é descartada', async () => {
    const soltar = await lendoComNomeEEmail()
    await act(async () => {
      fireEvent.keyDown(folha()!, { key: 'Escape', code: 'Escape' })
    })
    await andar(100)
    expect(folha()).not.toBeInTheDocument()

    await soltar()
    await andar(200)
    nadaMudou()
  })

  it('o voltar do Android durante a leitura fecha a folha, e a resposta tardia é descartada', async () => {
    const soltar = await lendoComNomeEEmail()
    await voltar()
    await andar(100)
    expect(folha()).not.toBeInTheDocument()

    await soltar()
    await andar(200)
    nadaMudou()
  })

  it('depois de cancelar, uma leitura nova vai à porta e preenche', async () => {
    const soltar = await lendoComNomeEEmail()
    await clicar(within(folha()!).getByRole('button', { name: 'Cancelar' }))
    await andar(100)
    await soltar()
    await andar(100)

    await abrirFolhaDaNova()
    expect(lerOTexto()).toHaveTextContent('Ler o texto')
    await colar('a conversa')
    await ler()
    await andar(100)
    expect(fake.invocacoesDe(LEITURA)).toHaveLength(2)
    expect(folha()).not.toBeInTheDocument()
    expect(valorDe('Nome')).toBe('Ana Souza')
    expect(avisoDaLeitura()).toBeInTheDocument()
  })
})
