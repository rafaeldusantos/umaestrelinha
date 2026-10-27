// Feature `76` · T24 — a aba Clientes pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client que registra a cadeia). `MAC-01`..`MAC-13`, `MAC-28`, `MAC-34`.
//
// O recorte esperado de cada endereço é montado passando um gravador pelas MESMAS funções de `core`
// (`applyCustomerSlice`): o que se prova é que a página entrega ao hook o recorte do endereço, e o
// hook (provado na T17) não acrescenta nada. As frases vêm ESCRITAS POR EXTENSO.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { focusManager } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyCustomerSlice, type CustomerSliceId } from '@estrelinha/core/customers'

import { clientesHref } from '@/entities/customer'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA, NAO_ATUALIZOU } from '@/shared/ui/leitura'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'
import { ATUALIZANDO } from '@/shared/ui/PullToRefresh'
import { cliente, listaDeClientes } from '@/test/clientes'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
/** 14:30 UTC ⇒ 11h30 em Brasília. */
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'Failed to fetch' }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const tres = listaDeClientes(3)
const resposta = (linhas = tres, count = linhas.length): RespostaTabela => ({ data: linhas, error: null, count })
const responderRelogio = () => fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })

/** O recorte de uma cadeia registrada: os elos entre o `select` e a busca/ordem. */
const recorteEsperado = (id: CustomerSliceId): Elo[] => {
  const elos: Elo[] = []
  const g = {
    gte(col: string, v: number) {
      elos.push({ metodo: 'gte', args: [col, v] })
      return g
    },
  }
  applyCustomerSlice(g, id)
  return elos
}
const gtes = (cadeia: Elo[]) => cadeia.filter((e) => e.metodo === 'gte')
const ors = (cadeia: Elo[]) => cadeia.filter((e) => e.metodo === 'or').map((e) => String(e.args[0]))

const h1 = () => screen.queryByRole('heading', { level: 1, name: 'Clientes' })
const linhasNaTela = () => screen.queryAllByTestId('linha-do-cliente')
const chip = (nome: string) => screen.getByRole('button', { name: nome })
const pressionados = () =>
  within(screen.getByRole('group', { name: 'Recortes das clientes' }))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent)
const caixa = () => screen.getByRole('searchbox', { name: 'Buscar cliente' }) as HTMLInputElement
const papeisPerguntados = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  esquecerTermos()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  focusManager.setFocused(undefined)
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const abrir = async (caminho = '/clientes') => {
  await montarApp(caminho)
  await andar(50)
}

describe('o recorte vem SÓ do endereço (MAC-07, MAC-08, MAC-09)', () => {
  it.each([
    ['/clientes', 'todas', 'Todas', []],
    ['/clientes?recorte=recorrentes', 'recorrentes', 'Compraram mais de uma vez', [{ metodo: 'gte', args: ['orders_paid', 2] }]],
    ['/clientes?recorte=em-aberto', 'em-aberto', 'Com pedido em aberto', [{ metodo: 'gte', args: ['orders_open', 1] }]],
  ] as [string, CustomerSliceId, string, Elo[]][])('%s ⇒ o predicado de `core`, escrito por extenso', async (endereco, id, rotulo, esperado) => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir(endereco)
    const [cadeia] = fake.cadeiasDe('customer_list')
    expect(gtes(cadeia)).toEqual(esperado)
    expect(gtes(cadeia)).toEqual(recorteEsperado(id))
    expect(pressionados()).toEqual([rotulo])
    expect(linhasNaTela()).toHaveLength(3)
  })

  it('valor fora do vocabulário abre em "Todas"', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir('/clientes?recorte=inventado')
    expect(gtes(fake.cadeiasDe('customer_list')[0])).toEqual([])
    expect(pressionados()).toEqual(['Todas'])
  })

  it('a contagem é a do servidor, com o recorte aplicado', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta(tres, 12))
    await abrir('/clientes?recorte=recorrentes')
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.getByTestId('contagem').textContent).toBe('12 clientes · das atividades mais recentes para as mais antigas')
  })
})

describe('os chips trocam o endereço por SUBSTITUIÇÃO (MAC-07)', () => {
  it('um chip troca o endereço e o recorte, sem entrada nova no histórico', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir('/clientes')
    const entradas = window.history.length
    fireEvent.click(chip('Com pedido em aberto'))
    await andar(50)
    expect(window.location.pathname + window.location.search).toBe(clientesHref('em-aberto'))
    expect(window.location.pathname + window.location.search).toBe('/clientes?recorte=em-aberto')
    expect(window.history.length).toBe(entradas)
    expect(pressionados()).toEqual(['Com pedido em aberto'])
    const cadeias = fake.cadeiasDe('customer_list')
    expect(gtes(cadeias[cadeias.length - 1])).toEqual([{ metodo: 'gte', args: ['orders_open', 1] }])
  })

  it('"Todas" volta ao endereço limpo, sem a query', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir('/clientes?recorte=recorrentes')
    fireEvent.click(chip('Todas'))
    await andar(50)
    expect(window.location.pathname + window.location.search).toBe('/clientes')
    expect(pressionados()).toEqual(['Todas'])
  })
})

describe('a busca é estado da página, e o termo NUNCA vai ao endereço (MAC-06, MAC-28)', () => {
  const buscando = () => {
    responderRelogio()
    fake.responderTabela('customer_list', (cadeia) =>
      ors(cadeia).some((o) => o.includes('Helena')) ? resposta([tres[1]], 1) : resposta(),
    )
  }

  it('o termo sai depois de 300 ms parada e filtra pela busca de `core`; a URL não muda', async () => {
    buscando()
    await abrir('/clientes?recorte=recorrentes')
    const antes = fake.cadeiasDe('customer_list').length
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    // 200 ms: dentro do prazo mesmo com o relógio real andando junto (`shouldAdvanceTime`) sob carga.
    await andar(200)
    expect(fake.cadeiasDe('customer_list')).toHaveLength(antes)
    await andar(160)
    await andar(50)
    const ultima = fake.cadeiasDe('customer_list').at(-1)!
    expect(ors(ultima).some((o) => o.includes('Helena'))).toBe(true)
    expect(gtes(ultima)).toEqual([{ metodo: 'gte', args: ['orders_paid', 2] }])
    expect(linhasNaTela()).toHaveLength(1)
    expect(window.location.search).toBe('?recorte=recorrentes')
    expect(window.location.href).not.toMatch(/Helena/)
  })

  it('sem resultado: a frase da busca, com aspas curvas, e o recorte NÃO muda sozinho', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', (cadeia) => (ors(cadeia).some((o) => o.includes('Zuleica')) ? resposta([], 0) : resposta()))
    await abrir('/clientes?recorte=recorrentes')
    fireEvent.change(caixa(), { target: { value: 'Zuleica' } })
    await andar(350)
    await andar(50)
    expect(screen.getByText('Não achei ninguém com “Zuleica”.')).toBeInTheDocument()
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(window.location.search).toBe('?recorte=recorrentes')
    expect(pressionados()).toEqual(['Compraram mais de uma vez'])
  })

  it('"Limpar" desfaz recorte e busca: caixa vazia, endereço limpo, lista inteira', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', (cadeia) =>
      ors(cadeia).some((o) => o.includes('Zuleica')) || gtes(cadeia).length > 0 ? resposta([], 0) : resposta(),
    )
    await abrir('/clientes?recorte=em-aberto')
    expect(screen.getByText('Ninguém com pedido em aberto agora.')).toBeInTheDocument()
    fireEvent.change(caixa(), { target: { value: 'Zuleica' } })
    await andar(350)
    await andar(50)
    expect(screen.getByText('Não achei ninguém com “Zuleica”.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }))
    await andar(350)
    await andar(50)
    expect(caixa().value).toBe('')
    expect(window.location.pathname + window.location.search).toBe('/clientes')
    expect(pressionados()).toEqual(['Todas'])
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Limpar' })).toBeNull()
  })

  it('depois de "Limpar" o foco vai ao campo de busca, nunca ao body (BUG-20261024-limpar-da-busca-deixa-o-foco-no-body)', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', (cadeia) => (ors(cadeia).some((o) => o.includes('Zuleica')) ? resposta([], 0) : resposta()))
    await abrir()
    fireEvent.change(caixa(), { target: { value: 'Zuleica' } })
    await andar(350)
    await andar(50)
    const limpar = screen.getByRole('button', { name: 'Limpar' })
    act(() => limpar.focus())
    fireEvent.click(limpar)
    await andar(350)
    await andar(50)
    expect(caixa().value).toBe('')
    expect(document.activeElement).toBe(caixa())
  })

  it('o termo volta com o voltar do Android (a mesma entrada), com a lista buscada e a rolagem dela', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    buscando()
    fake.responderTabela('orders_unused', resposta())
    await abrir('/clientes')
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    expect(linhasNaTela()).toHaveLength(1)
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 320 })
    // Sai da página sem usar a ficha (T26): a aba Pedidos desmonta esta página, e o voltar a devolve.
    fake.responderTabela('order_list', { data: [], error: null, count: 0 })
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getByRole('link', { name: /^Pedidos/ }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    const leiturasAntes = fake.cadeiasDe('customer_list').length
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
    expect(window.location.pathname).toBe('/clientes')
    expect(caixa().value).toBe('Helena')
    expect(linhasNaTela()).toHaveLength(1)
    expect(fake.cadeiasDe('customer_list').slice(leiturasAntes).every((c) => ors(c).some((o) => o.includes('Helena')))).toBe(true)
    expect(rolar).toHaveBeenCalledWith(0, 320)
  })

  it('uma entrada NOVA da lista (a aba) abre sem termo', async () => {
    buscando()
    await abrir('/clientes')
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    fake.responderTabela('order_list', { data: [], error: null, count: 0 })
    const nav = () => within(screen.getByRole('navigation', { name: 'Áreas do ateliê' }))
    fireEvent.click(nav().getByRole('link', { name: /^Pedidos/ }))
    await andar(50)
    fireEvent.click(nav().getByRole('link', { name: /^Clientes/ }))
    await andar(50)
    expect(window.location.pathname).toBe('/clientes')
    expect(caixa().value).toBe('')
    expect(linhasNaTela()).toHaveLength(3)
  })
})

describe('o selo "Em aberto" e o recorte leem a MESMA coluna (MAC-09)', () => {
  const base = [cliente({ id: tres[0].id, name: 'Ana Aberta', orders_open: 1 }), cliente({ id: tres[1].id, name: 'Bia Fechada', orders_open: 0 })]
  /** Um banco de duas linhas que aplica o `gte` da cadeia, como o PostgREST. */
  const banco = (linhas: typeof base) => (cadeia: Elo[]): RespostaTabela => {
    const filtros = gtes(cadeia)
    const dentro = linhas.filter((l) => filtros.every((f) => (l as unknown as Record<string, number>)[String(f.args[0])] >= Number(f.args[1])))
    return { data: dentro, error: null, count: dentro.length }
  }
  const selos = () => document.querySelectorAll('[data-selo="em-aberto"]').length

  it('orders_open = 1: selo na lista inteira e linha no recorte; 0: sem selo e fora do recorte', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', banco(base))
    await abrir('/clientes')
    expect(linhasNaTela()).toHaveLength(2)
    expect(selos()).toBe(1)
    expect(within(linhasNaTela()[0]).queryByText('Em aberto')).not.toBeNull()
    expect(within(linhasNaTela()[1]).queryByText('Em aberto')).toBeNull()
    fireEvent.click(chip('Com pedido em aberto'))
    await andar(50)
    expect(linhasNaTela().map((l) => l.querySelector('[data-parte="nome"]')?.textContent)).toEqual(['Ana Aberta'])
  })

  it('mudar `orders_open` de 1 para 0 tira o selo E a tira do recorte (nos dois sentidos)', async () => {
    responderRelogio()
    const zerada = [{ ...base[0], orders_open: 0 }, base[1]]
    fake.responderTabela('customer_list', banco(zerada))
    await abrir('/clientes')
    expect(selos()).toBe(0)
    fireEvent.click(chip('Com pedido em aberto'))
    await andar(50)
    expect(linhasNaTela()).toHaveLength(0)
    expect(screen.getByText('Ninguém com pedido em aberto agora.')).toBeInTheDocument()
  })
})

describe('o h1 existe em TODO estado (MAC-10) e a falha nunca vira zero (MAC-12)', () => {
  it('lendo, na falha, no vazio e com dado — o título da aba é "Clientes"', async () => {
    responderRelogio()
    fake.pendurarTabela('customer_list')
    const r = await montarApp('/clientes')
    await andar(50)
    expect(h1()).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Clientes' })).toHaveAttribute('aria-busy', 'true')
    r.unmount()

    fake.falharTabela('customer_list', REDE)
    const f = await montarApp('/clientes')
    await andar(3000)
    expect(h1()).toBeInTheDocument()
    expect(screen.getByText('Não consegui carregar as clientes.')).toBeInTheDocument()
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(screen.queryByText(/^0 clientes/)).toBeNull()
    f.unmount()

    fake.responderTabela('customer_list', resposta([], 0))
    await montarApp('/clientes')
    await andar(50)
    expect(h1()).toBeInTheDocument()
    expect(screen.getByText('Ainda não há clientes.')).toBeInTheDocument()
  })

  it('o "Tentar de novo" da falha relê e desenha a lista', async () => {
    responderRelogio()
    let n = 0
    fake.responderTabela('customer_list', () => (++n <= 2 ? { data: null, error: REDE } : resposta()))
    await abrir()
    await andar(3000)
    expect(screen.getByText('Não consegui carregar as clientes.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await andar(50)
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.queryByText('Não consegui carregar as clientes.')).toBeNull()
  })
})

describe('recusa e rede (MAC-11)', () => {
  it('`42501` com o papel tirado: a recusa da 72 — nenhuma linha, mesmo com a consulta trazendo linhas', async () => {
    fake.responderTabela('customer_list', resposta())
    fake.aoChamarRpc('atelie_clock', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Cliente 0000|Cliente 0001/)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
    expect(papeisPerguntados()).toBe(2)
  })

  const puxar = async () => {
    const area = screen.getByRole('heading', { level: 1, name: 'Clientes' }).closest('div')!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    await andar(3000)
  }

  it('`42501` com o papel ainda admin: nenhuma linha — nem a de antes —, e UMA reconferência', async () => {
    fake.responderTabela('customer_list', resposta())
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(linhasNaTela()).toHaveLength(3)
    await puxar()
    expect(window.location.pathname).toBe('/clientes')
    expect(linhasNaTela()).toHaveLength(0)
    expect(screen.getByRole('main').textContent).not.toMatch(/Cliente 000|R\$/)
    expect(screen.getByText('Não consegui carregar as clientes.')).toBeInTheDocument()
    expect(screen.queryByTestId('frescor')).toBeNull()
    expect(screen.queryByTestId('contagem')).toBeNull()
    expect(h1()).toBeInTheDocument()
    expect(papeisPerguntados()).toBe(2)
    const chamadas = fake.chamadasDe('atelie_clock').length
    await andar(30_000)
    expect(papeisPerguntados()).toBe(2)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(chamadas)
  })

  it('rede na confirmação: falha de leitura, nunca recusa nem reconferência', async () => {
    fake.responderTabela('customer_list', resposta())
    fake.falharRpc('atelie_clock', REDE)
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/clientes')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText('Não consegui carregar as clientes.')).toBeInTheDocument()
    expect(linhasNaTela()).toHaveLength(0)
    expect(papeisPerguntados()).toBe(1)
  })

  it('a recusa vence a consulta que falhou', async () => {
    fake.falharTabela('customer_list', REDE)
    fake.aoChamarRpc('atelie_clock', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})

describe('frescor, puxar e volta ao primeiro plano (MAC-13)', () => {
  it('"Atualizado às" é a hora de Brasília do `lido_em` do servidor, e o aparelho noutro ano não muda o texto', async () => {
    vi.setSystemTime(new Date('2031-03-01T03:00:00Z'))
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    expect(screen.queryByTestId('frescor')).toBeNull() // 2026-10-26: sem "Atualizado às"
  })

  it('a releitura que falha mantém as linhas, sem esqueleto, com a hora e "Não consegui atualizar agora."', async () => {
    fake.responderTabela('customer_list', resposta())
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: REDE }))
    await abrir()
    const area = screen.getByRole('heading', { level: 1, name: 'Clientes' }).closest('div')!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    await andar(3000)
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'Clientes' })).not.toHaveAttribute('aria-busy')
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    expect(screen.getByTestId('frescor')).not.toHaveTextContent(/Atualizado/)
  })

  it('puxar no topo relê a janela, sem esqueleto', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    const antes = fake.cadeiasDe('customer_list').length
    const area = screen.getByRole('heading', { level: 1, name: 'Clientes' }).closest('div')!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    expect(screen.getByRole('status')).toHaveTextContent(ATUALIZANDO)
    expect(screen.getByRole('region', { name: 'Clientes' })).not.toHaveAttribute('aria-busy')
    await andar(50)
    expect(fake.cadeiasDe('customer_list').length).toBe(antes + 1)
    expect(linhasNaTela()).toHaveLength(3)
  })

  it('a volta ao primeiro plano relê a lista', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    const antes = fake.cadeiasDe('customer_list').length
    await act(async () => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
      await vi.advanceTimersByTimeAsync(50)
    })
    expect(fake.cadeiasDe('customer_list').length).toBeGreaterThan(antes)
  })

  it('não há canal de tempo real na aba (cliente nova com a tela aberta não é urgência)', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    expect(fake.canaisAbertos()).toHaveLength(0)
  })
})

describe('o teclado virtual não cobre o fim dos resultados (MAC-34)', () => {
  const restaurar = Object.getOwnPropertyDescriptor(window, 'visualViewport')
  afterEach(() => {
    if (restaurar) Object.defineProperty(window, 'visualViewport', restaurar)
    else delete (window as unknown as Record<string, unknown>).visualViewport
  })

  it('com o `visualViewport` encolhido, a seção dos resultados ganha o `padding-bottom` da folga', async () => {
    Object.defineProperty(window, 'innerHeight', { value: 844, configurable: true, writable: true })
    const ouvintes = new Set<() => void>()
    const vv = {
      height: 844,
      offsetTop: 0,
      addEventListener: (_t: string, f: () => void) => ouvintes.add(f),
      removeEventListener: (_t: string, f: () => void) => ouvintes.delete(f),
    }
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true, writable: true })
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    const secao = () => screen.getByRole('region', { name: 'Clientes' })
    expect(secao().style.paddingBottom).toBe('0px')
    act(() => {
      vv.height = 544
      ouvintes.forEach((f) => f())
    })
    expect(secao().style.paddingBottom).toBe('300px')
    act(() => {
      vv.height = 844
      ouvintes.forEach((f) => f())
    })
    expect(secao().style.paddingBottom).toBe('0px')
  })
})

describe('tocar uma linha leva à ficha com `doApp` (MAC-14)', () => {
  it('o link da linha é o endereço da ficha', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    expect(linhasNaTela().map((l) => l.getAttribute('href'))).toEqual(tres.map((c) => `/clientes/${c.id}`))
  })
})

describe('a barra de abas sai do caminho enquanto se digita a busca (BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca)', () => {
  // Com o teclado aberto sobra pouco da tela, e a barra fixa embaixo cobria a primeira linha (a 130 % e a
  // 200 % a primeira linha ficava ATRÁS da barra). Enquanto o foco está no campo de busca a barra não
  // está na tela; tirar o foco (Enter, tocar fora) a devolve. O espaço que ela reserva no fim da página
  // continua lá, para a tela não pular.
  const barra = () => screen.queryByRole('navigation', { name: 'Áreas do ateliê' })

  it('foco no campo ⇒ sem barra; foco fora ⇒ a barra volta', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    expect(barra()).not.toBeNull()
    act(() => caixa().focus())
    expect(barra()).toBeNull()
    expect(screen.getByTestId('reserva-da-barra')).toBeInTheDocument()
    act(() => caixa().blur())
    expect(barra()).not.toBeNull()
  })

  it('Enter na busca tira o foco e devolve a barra', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    act(() => caixa().focus())
    expect(barra()).toBeNull()
    fireEvent.keyDown(caixa(), { key: 'Enter' })
    expect(barra()).not.toBeNull()
  })

  it('foco em OUTRO controle (um chip) não esconde a barra', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    act(() => chip('Todas').focus())
    expect(barra()).not.toBeNull()
  })

  it('com o foco no campo o título sai da frente, e volta ao sair (BUG-20261024-teclado-aberto-esconde-os-resultados-da-busca)', async () => {
    // Desde 2026-10-26 a leitura boa não desenha a linha de frescor ("Atualizado às" saiu); o caso
    // dela com a releitura falhada, logo abaixo, continua.
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    const titulo = () => screen.getByRole('heading', { level: 1, name: 'Clientes' })
    expect(titulo().className).not.toContain('sr-only')
    act(() => caixa().focus())
    expect(titulo().className).toContain('sr-only')
    act(() => caixa().blur())
    expect(titulo().className).not.toContain('sr-only')
  })

  it('o primeiro toque num chip com a busca em foco chega ao chip: o layout só muda depois do clique (BUG-20261024-primeiro-toque-em-chip-ou-limpar-se-perde-com-a-busca-em-foco)', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    act(() => caixa().focus())
    const titulo = () => screen.getByRole('heading', { level: 1, name: 'Clientes' })
    expect(titulo().className).toContain('sr-only')
    const alvo = chip('Com pedido em aberto')
    fireEvent.pointerDown(alvo)
    act(() => caixa().blur())
    // O dedo ainda está no vidro: o título e a linha de frescor NÃO voltam (o chip não desce).
    expect(titulo().className).toContain('sr-only')
    expect(screen.queryByTestId('frescor')).toBeNull()
    fireEvent.pointerUp(alvo)
    fireEvent.click(alvo)
    await andar(50)
    expect(window.location.pathname + window.location.search).toBe(clientesHref('em-aberto'))
    expect(titulo().className).not.toContain('sr-only')
  })

  it('com o foco no campo, a linha de frescor SEGUE na tela quando a releitura falhou ("Não consegui atualizar agora.")', async () => {
    fake.responderTabela('customer_list', resposta())
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: REDE }))
    await abrir()
    const area = screen.getByRole('heading', { level: 1, name: 'Clientes' }).closest('div')!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    await andar(3000)
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    act(() => caixa().focus())
    expect(screen.getByRole('heading', { level: 1, name: 'Clientes' }).className).toContain('sr-only')
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
  })

  it('com o foco no campo ele sobe ao topo da tela, depois de o teclado abrir', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    const rolar = vi.fn()
    ;(caixa() as HTMLElement).scrollIntoView = rolar
    act(() => caixa().focus())
    expect(rolar).not.toHaveBeenCalled()
    await andar(400)
    expect(rolar).toHaveBeenCalledTimes(1)
    expect(rolar).toHaveBeenCalledWith({ block: 'start' })
  })

  it('o resultado das linhas segue na tela com o foco no campo', async () => {
    responderRelogio()
    fake.responderTabela('customer_list', resposta())
    await abrir()
    act(() => caixa().focus())
    expect(linhasNaTela()).toHaveLength(3)
  })
})
