// Feature `74` · T21 — a aba Pedidos pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client que registra a cadeia). `MAP-01`..`MAP-06`, `MAP-09` (TE6), `MAP-34`..`MAP-40`, `MAP-46`,
// G-A28, E5.
//
// O recorte esperado de cada endereço é montado passando um gravador pelas MESMAS funções de `core`
// (`applyOrderSlice`): o que se prova é que a página entrega ao hook o recorte do endereço, e o hook
// (provado na T14) não acrescenta nada. Os endereços vêm de `pedidosHref` — o mesmo que a Início usa.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QUEUE_BLOCKS, applyOrderSlice, type OrderSlice } from '@estrelinha/core/orders'

import { pedidosHref } from '@/entities/order'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA, NAO_ATUALIZOU } from '@/shared/ui/leitura'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { esquecerTermos } from '@/shared/lib/useTermoDaEntrada'
import { ATUALIZANDO } from '@/shared/ui/PullToRefresh'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { movimento } from '@/test/movimento'
import { dispararInterseccao } from '@/test/intersecao'
import { linha } from '@/test/pedidos'
import { resumo } from '@/test/resumo'

import { CANAL_DA_LISTA } from '../PedidosPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
/** 14:30 UTC ⇒ 11h30 em Brasília. */
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'Failed to fetch' }

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const tres = [
  linha({ id: '00000000-0000-4000-8000-000000000101', order_number: '0101', customer_name: 'Marina Duarte' }),
  linha({ id: '00000000-0000-4000-8000-000000000102', order_number: '0102', customer_name: 'Helena Prado' }),
  linha({ id: '00000000-0000-4000-8000-000000000103', order_number: '0103', customer_name: 'Lúcia Ramos' }),
]

const resposta = (linhas = tres, count = linhas.length): RespostaTabela => ({ data: linhas, error: null, count })

const responderRelogio = () => fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })

/** O recorte de uma cadeia registrada: os elos entre o `select` e a ordem, sem a busca nem o cursor. */
const recorteEsperado = (slice: OrderSlice): Elo[] => {
  const elos: Elo[] = []
  const g = {
    or(f: string) {
      elos.push({ metodo: 'or', args: [f] })
      return g
    },
    in(c: string, v: readonly string[]) {
      elos.push({ metodo: 'in', args: [c, v] })
      return g
    },
  }
  applyOrderSlice(g, slice)
  return elos
}
const recorteDaCadeia = (cadeia: Elo[]) => cadeia.slice(1, cadeia.length - 3)

const h1 = () => screen.queryByRole('heading', { level: 1, name: 'Pedidos' })
const linhasNaTela = () => screen.queryAllByTestId('linha-do-pedido')
const chip = (nome: string) => screen.getByRole('button', { name: nome })
const pressionados = () =>
  within(screen.getByRole('group', { name: 'Visões dos pedidos' }))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent)
// Pelo COMEÇO do nome: com o selo (T25, `MAP-33`) o nome acessível da aba é "Pedidos, 5 precisam de você".
const abaDe = (nome: string) =>
  within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getByRole('link', { name: new RegExp(`^${nome}`) })
const papeisPerguntados = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  esquecerTermos()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const abrir = async (caminho = '/pedidos') => {
  await montarApp(caminho)
  await andar(50)
}

describe('cada endereço que a Início monta abre o recorte certo (MAP-01..MAP-03)', () => {
  const ENDERECOS: [string, OrderSlice, string][] = [
    ...QUEUE_BLOCKS.map((b, i): [string, OrderSlice, string] => [pedidosHref({ bloco: b.id }), { bloco: b.id }, `${i + 2} pedidos`]),
    [pedidosHref({ visao: 'precisa-acao' }), { visao: 'precisa-acao' }, '7 pedidos precisam de você, do mais antigo para o mais novo.'],
    [pedidosHref({ visao: 'tudo' }), { visao: 'tudo' }, '9 pedidos'],
  ]

  it.each(ENDERECOS)('%s ⇒ o recorte de `core` e a contagem da leitura', async (endereco, slice, frase) => {
    responderRelogio()
    const count = Number(frase.match(/^\d+/)?.[0])
    fake.responderTabela('order_list', resposta(tres, count))
    await abrir(endereco)
    const [cadeia] = fake.cadeiasDe('order_list')
    expect(recorteDaCadeia(cadeia)).toEqual(recorteEsperado(slice))
    expect(screen.getByTestId('contagem').textContent).toBe(frase)
    expect(linhasNaTela()).toHaveLength(3)
    if ('bloco' in slice) {
      expect(pressionados()).toEqual([])
      expect(screen.getByTestId('faixa-do-bloco')).toHaveTextContent(`Filtro: ${QUEUE_BLOCKS.find((b) => b.id === slice.bloco)?.label}`)
    } else {
      expect(screen.queryByTestId('faixa-do-bloco')).toBeNull()
    }
  })

  it('sem parâmetro, e com valor fora do vocabulário, abre em "Precisa de ação"', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir('/pedidos?visao=inventada')
    expect(recorteDaCadeia(fake.cadeiasDe('order_list')[0])).toEqual(recorteEsperado({ visao: 'precisa-acao' }))
    expect(pressionados()).toEqual(['Precisa de ação'])
  })

  it('`?bloco=` e `?visao=` juntos ⇒ o BLOCO vence', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir('/pedidos?visao=tudo&bloco=sem-rastreio')
    expect(recorteDaCadeia(fake.cadeiasDe('order_list')[0])).toEqual(recorteEsperado({ bloco: 'sem-rastreio' }))
    expect(screen.getByTestId('faixa-do-bloco')).toHaveTextContent('Filtro: Enviado sem rastreio')
    expect(pressionados()).toEqual([])
  })
})

describe('chips e "Limpar filtro" trocam o endereço por SUBSTITUIÇÃO (MAP-05, MAP-06)', () => {
  it('um chip troca o endereço e o recorte, sem entrada nova no histórico', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir(pedidosHref({ bloco: 'aguardando' }))
    const entradas = window.history.length
    fireEvent.click(chip('Em trânsito'))
    await andar(50)
    expect(window.location.pathname + window.location.search).toBe('/pedidos?visao=em-transito')
    expect(window.history.length).toBe(entradas)
    expect(pressionados()).toEqual(['Em trânsito'])
    expect(screen.queryByTestId('faixa-do-bloco')).toBeNull()
    const cadeias = fake.cadeiasDe('order_list')
    expect(recorteDaCadeia(cadeias[cadeias.length - 1])).toEqual(recorteEsperado({ visao: 'em-transito' }))
  })

  it('"Limpar filtro" ⇒ `?visao=tudo` e a lista em "Tudo"', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir(pedidosHref({ bloco: 'pix-aguardando' }))
    const entradas = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro' }))
    await andar(50)
    expect(window.location.search).toBe('?visao=tudo')
    expect(window.history.length).toBe(entradas)
    expect(pressionados()).toEqual(['Tudo'])
    const cadeias = fake.cadeiasDe('order_list')
    expect(recorteDaCadeia(cadeias[cadeias.length - 1])).toEqual(recorteEsperado({ visao: 'tudo' }))
  })
})

describe('a busca (MAP-10, TE6, A13)', () => {
  it('sem resultado no recorte: "Nada por aqui." com o termo — e o recorte NÃO muda sozinho', async () => {
    responderRelogio()
    fake.responderTabela('order_list', (cadeia) =>
      cadeia.some((e) => e.metodo === 'or' && String(e.args[0]).includes('Zuleica')) ? resposta([], 0) : resposta(),
    )
    await abrir(pedidosHref({ visao: 'precisa-acao' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar pedido' }), { target: { value: 'Zuleica' } })
    await andar(350)
    await andar(50)
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum pedido com “Zuleica”.')).toBeInTheDocument()
    expect(window.location.search).toBe('?visao=precisa-acao')
    expect(pressionados()).toEqual(['Precisa de ação'])
    const ultima = fake.cadeiasDe('order_list').at(-1)!
    expect(recorteDaCadeia(ultima).slice(0, recorteEsperado({ visao: 'precisa-acao' }).length)).toEqual(recorteEsperado({ visao: 'precisa-acao' }))
  })
})

// B02 (`BUG-20261024-voltar-do-pedido-buscado-perde-a-busca`): o termo é estado da página (A13) — fora
// do endereço —, e a página desmonta ao abrir o detalhe. Sem memória por entrada do histórico, o
// voltar trazia a caixa vazia e o recorte inteiro no topo, e a Adri redigitava a busca a cada pedido.
describe('voltar de um pedido buscado devolve a busca (B02)', () => {
  const buscando = () => {
    responderRelogio()
    fake.responderTabela('order_list', (cadeia) =>
      cadeia.some((e) => e.metodo === 'or' && String(e.args[0]).includes('Helena')) ? resposta([tres[1]], 1) : resposta(),
    )
  }
  const caixa = () => screen.getByRole('searchbox', { name: 'Buscar pedido' }) as HTMLInputElement

  it('abrir um resultado e voltar (voltar do sistema): o termo, a lista buscada e a rolagem dela', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    buscando()
    await abrir(pedidosHref({ visao: 'tudo' }))
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    expect(linhasNaTela()).toHaveLength(1)
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 320 })
    fireEvent.click(linhasNaTela()[0])
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos/00000000-0000-4000-8000-000000000102')
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    const leiturasAntes = fake.cadeiasDe('order_list').length
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(window.location.search).toBe('?visao=tudo')
    expect(caixa().value).toBe('Helena')
    expect(linhasNaTela()).toHaveLength(1)
    expect(screen.getByText('Helena Prado')).toBeInTheDocument()
    // A lista buscada voltou do cache (o mesmo termo, a mesma chave): nenhuma leitura sem o termo.
    expect(fake.cadeiasDe('order_list').slice(leiturasAntes).every((c) => c.some((e) => e.metodo === 'or' && String(e.args[0]).includes('Helena')))).toBe(true)
    expect(rolar).toHaveBeenCalledWith(0, 320)
  })

  const voltar = async () => {
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
  }

  // G-B02-1: o percurso mais comum — a aba abre em "Precisa de ação", o chip "Tudo" SUBSTITUI a entrada
  // (a `location.key` muda), e só então a busca. O termo tem de ser guardado sob a chave ATUAL.
  it('depois de trocar de chip (a entrada é substituída), buscar, abrir e voltar devolve o termo', async () => {
    buscando()
    await abrir(pedidosHref({ visao: 'precisa-acao' }))
    fireEvent.click(chip('Tudo'))
    await andar(50)
    expect(window.location.search).toBe('?visao=tudo')
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    expect(linhasNaTela()).toHaveLength(1)
    fireEvent.click(linhasNaTela()[0])
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos/00000000-0000-4000-8000-000000000102')
    await voltar()
    expect(window.location.pathname).toBe('/pedidos')
    expect(window.location.search).toBe('?visao=tudo')
    expect(caixa().value).toBe('Helena')
    expect(linhasNaTela()).toHaveLength(1)
  })

  // G-B02-2: a busca que a Adri APAGOU não volta.
  it('uma busca apagada não volta: limpar a caixa, abrir outro pedido e voltar traz a caixa vazia', async () => {
    buscando()
    await abrir(pedidosHref({ visao: 'tudo' }))
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    fireEvent.click(linhasNaTela()[0])
    await andar(50)
    await voltar()
    expect(caixa().value).toBe('Helena')
    fireEvent.change(caixa(), { target: { value: '' } })
    await andar(350)
    await andar(50)
    expect(linhasNaTela()).toHaveLength(3)
    fireEvent.click(linhasNaTela()[0])
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos/00000000-0000-4000-8000-000000000101')
    await voltar()
    expect(window.location.pathname).toBe('/pedidos')
    expect(caixa().value).toBe('')
    expect(linhasNaTela()).toHaveLength(3)
  })

  it('uma entrada NOVA da lista (a aba, um link colado) abre sem termo — o termo nunca vai ao endereço', async () => {
    buscando()
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    await abrir(pedidosHref({ visao: 'tudo' }))
    fireEvent.change(caixa(), { target: { value: 'Helena' } })
    await andar(350)
    await andar(50)
    expect(window.location.search).toBe('?visao=tudo')
    fireEvent.click(abaDe('Início'))
    await andar(50)
    fireEvent.click(abaDe('Pedidos'))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(caixa().value).toBe('')
    expect(linhasNaTela()).toHaveLength(3)
  })
})

describe('o h1 existe em TODO estado (E5, MAP-46)', () => {
  it('lendo, na falha, no vazio e com dado — e o título é "Pedidos · Ateliê"', async () => {
    responderRelogio()
    fake.pendurarTabela('order_list')
    const r = await montarApp('/pedidos')
    await andar(50)
    expect(h1()).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Pedidos' })).toHaveAttribute('aria-busy', 'true')
    expect(document.title).toBe('Pedidos · Ateliê')
    r.unmount()

    fake.falharTabela('order_list', REDE)
    const f = await montarApp('/pedidos')
    await andar(3000)
    expect(h1()).toBeInTheDocument()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    f.unmount()

    fake.responderTabela('order_list', resposta([], 0))
    await montarApp('/pedidos')
    await andar(50)
    expect(h1()).toBeInTheDocument()
    expect(screen.getByText('Nada por aqui.')).toBeInTheDocument()
  })

  it('entrar pela aba com a leitura PENDENTE põe o foco no h1', async () => {
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    responderRelogio()
    fake.pendurarTabela('order_list')
    await abrir('/')
    fireEvent.click(abaDe('Pedidos'))
    await andar(50)
    expect(document.activeElement).toBe(h1())
  })
})

describe('recusa e rede (MAP-36..MAP-38)', () => {
  it('`42501` com o papel tirado: a recusa da 72 — nenhuma linha, mesmo com a consulta trazendo linhas', async () => {
    fake.responderTabela('order_list', resposta())
    fake.aoChamarRpc('atelie_clock', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Marina|Helena|#0101/)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
    expect(papeisPerguntados()).toBe(2)
  })

  it('`42501` com o papel ainda admin: nenhuma linha — nem a de antes —, e UMA reconferência', async () => {
    fake.responderTabela('order_list', resposta())
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(linhasNaTela()).toHaveLength(3)
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(window.location.pathname).toBe('/pedidos')
    expect(linhasNaTela()).toHaveLength(0)
    expect(screen.getByRole('main').textContent).not.toMatch(/Marina|Helena|R\$/)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(screen.queryByTestId('frescor')).toBeNull()
    expect(h1()).toBeInTheDocument()
    expect(papeisPerguntados()).toBe(2)
    const chamadas = fake.chamadasDe('atelie_clock').length
    await andar(30_000)
    expect(papeisPerguntados()).toBe(2)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(chamadas)
  })

  /**
   * D2 e G8 da rodada 4 da verificação. A recusa da PÁGINA SEGUINTE, com o papel ainda admin: a vigia
   * reconfere, o `RequireAdmin` troca a página pela splash e ela DESMONTA (o mecanismo da G6). Na
   * remontagem a janela do cache é de uma leitura BEM-SUCEDIDA — se a recusa da página seguinte
   * morasse só no estado do componente, as 25 linhas e o frescor voltariam enquanto a confirmação da
   * releitura está no ar ("nem o de antes"), e a resposta dela faria a vigia reconferir uma SEGUNDA
   * vez ("uma vez por episódio"). Pela árvore real: só a página monta a vigia com o erro da próxima.
   */
  const vinteECinco = Array.from({ length: 25 }, (_, i) =>
    linha({
      id: `00000000-0000-4000-8000-${String(500 + i).padStart(12, '0')}`,
      order_number: String(500 + i).padStart(4, '0'),
      customer_name: 'Marina Duarte',
      created_at: `2026-10-20T13:${String(59 - i).padStart(2, '0')}:05.123456+00:00`,
    }),
  )

  it('`42501` na PÁGINA SEGUINTE com o papel ainda admin: nenhuma linha na remontagem, nem com a confirmação no ar', async () => {
    fake.responderTabela('order_list', { data: vinteECinco, error: null, count: 60 })
    fake.aoChamarRpc('atelie_clock', (n) =>
      n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : n === 2 ? { data: null, error: RECUSA } : new Promise(() => {}),
    )
    await abrir('/pedidos?visao=tudo')
    expect(linhasNaTela()).toHaveLength(25)
    act(() => {
      dispararInterseccao(screen.getByTestId('sentinela'))
    })
    await andar(3000)
    expect(window.location.pathname).toBe('/pedidos')
    expect(fake.chamadasDe('atelie_clock').length).toBeGreaterThanOrEqual(3)
    expect(linhasNaTela()).toHaveLength(0)
    expect(screen.queryByTestId('frescor')).toBeNull()
    expect(screen.queryByText(/Atualizado às/)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(h1()).toBeInTheDocument()
    expect(papeisPerguntados()).toBe(2)
  })

  it('`42501` na PÁGINA SEGUINTE e a confirmação da remontagem CONFIRMA: as linhas voltam, e o episódio acaba', async () => {
    fake.responderTabela('order_list', { data: vinteECinco, error: null, count: 60 })
    fake.aoChamarRpc('atelie_clock', (n) => (n === 2 ? { data: null, error: RECUSA } : { data: { lido_em: LIDO_EM }, error: null }))
    await abrir('/pedidos?visao=tudo')
    act(() => {
      dispararInterseccao(screen.getByTestId('sentinela'))
    })
    await andar(3000)
    await andar(10_000)
    expect(window.location.pathname).toBe('/pedidos')
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(3)
    expect(linhasNaTela()).toHaveLength(25)
    expect(screen.getByTestId('frescor')).toBeInTheDocument()
    expect(screen.queryByText(FALHA_DE_LEITURA)).toBeNull()
    expect(papeisPerguntados()).toBe(2)
  })

  it('`42501` na PÁGINA SEGUINTE e na confirmação da remontagem: a falha, e UMA reconferência', async () => {
    fake.responderTabela('order_list', { data: vinteECinco, error: null, count: 60 })
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir('/pedidos?visao=tudo')
    expect(linhasNaTela()).toHaveLength(25)
    act(() => {
      dispararInterseccao(screen.getByTestId('sentinela'))
    })
    await andar(3000)
    expect(window.location.pathname).toBe('/pedidos')
    expect(linhasNaTela()).toHaveLength(0)
    expect(screen.getByRole('main').textContent).not.toMatch(/Marina|R\$/)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(papeisPerguntados()).toBe(2)
    await andar(30_000)
    expect(papeisPerguntados()).toBe(2)
  })

  it('rede na confirmação: falha de leitura, nunca recusa nem reconferência', async () => {
    fake.responderTabela('order_list', resposta())
    fake.falharRpc('atelie_clock', REDE)
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(linhasNaTela()).toHaveLength(0)
    expect(papeisPerguntados()).toBe(1)
  })
})

describe('frescor (MAP-35)', () => {
  it('"Atualizado às" é a hora de Brasília do `lido_em` do servidor', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir()
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h30\.$/)
  })

  it('a releitura que falha mantém as linhas, sem esqueleto, com a hora e "Não consegui atualizar agora."', async () => {
    fake.responderTabela('order_list', resposta())
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: REDE }))
    await abrir()
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(linhasNaTela()).toHaveLength(3)
    expect(screen.getByRole('region', { name: 'Pedidos' })).not.toHaveAttribute('aria-busy')
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/Atualizado às 11h30\.$/)
  })
})

describe('o Realtime da lista (MAP-39)', () => {
  it('UM canal, aberto depois da leitura confirmada — e fechado ao sair da aba', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir()
    const abertos = fake.canaisAbertos()
    expect(abertos.map((c) => c.nome)).toEqual([CANAL_DA_LISTA])
    expect(abertos[0].inscricoes).toEqual([
      expect.objectContaining({ tipo: 'postgres_changes', filtro: { event: '*', schema: 'public', table: 'orders' } }),
    ])
    fireEvent.click(chip('Tudo'))
    await andar(50)
    expect(fake.canaisAbertos().map((c) => c.nome)).toEqual([CANAL_DA_LISTA])
    expect(fake.client.channel).toHaveBeenCalledTimes(1)

    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    fireEvent.click(abaDe('Início'))
    await andar(50)
    expect(fake.canaisAbertos().map((c) => c.nome)).not.toContain(CANAL_DA_LISTA)
  })

  // G6 da verificação (rodada 3): a recusa FECHA o canal, com a página ainda montada. É o `42501` com o
  // papel ainda admin — a vigia reconfere, não leva ao Login, e a tela fica em recusa. Canal aberto ali
  // seria cada aviso relendo a lista e o resumo (rede e confirmação de papel) sobre uma tela recusada.
  //
  // O que esta régua mede é o RESULTADO (canal fechado, aviso sem releitura), e não a linha
  // `if (recusada) setConfirmada(false)`. Hoje o `<App />` real fecha o canal por DOIS caminhos: a
  // vigia chama `retryAdminCheck`, o `loading` do provider faz o `RequireAdmin` trocar a página pela
  // splash, e a página DESMONTA (`useRecusaDePapel`, achado da T18) — o que já fecha o canal; a linha é
  // a segunda defesa, para a página que fica montada. Por isso apagar só a linha (N16/N16b) é mutante
  // EQUIVALENTE hoje; apagar a linha E a reconferência da vigia (a página fica montada) reprova aqui e
  // em nenhum outro caso (medido no fecho da r3, `validation.md`).
  it('a recusa com a página montada fecha o canal — e um aviso depois dela não relê nada', async () => {
    fake.responderTabela('order_list', resposta())
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(fake.canaisAbertos().map((c) => c.nome)).toEqual([CANAL_DA_LISTA])
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(fake.canaisAbertos().map((c) => c.nome)).not.toContain(CANAL_DA_LISTA)
    const leituras = fake.cadeiasDe('order_list').length
    act(() => {
      expect(fake.emitir('orders')).toBe(0)
    })
    await andar(3000)
    expect(fake.cadeiasDe('order_list')).toHaveLength(leituras)
  })

  it('antes de a leitura ser confirmada, nenhum canal', async () => {
    responderRelogio()
    fake.pendurarTabela('order_list')
    await abrir()
    expect(fake.canaisAbertos()).toHaveLength(0)
  })

  it('o aviso relê a lista (a contagem muda na tela) e o resumo da Início — o SELO da aba muda na tela (A25)', async () => {
    fake.responderRpc('store_movement', movimento())
    // A prova "pelo que muda na tela" que a T21 deixou para a T25: o selo da aba Pedidos lê o MESMO
    // resumo, e só muda se o aviso da lista o invalidou.
    fake.aoChamarRpc('store_overview', (n) => ({ data: n === 1 ? resumo() : resumo({ fila: { ...resumo().fila, precisa_acao: 7 } }), error: null }))
    responderRelogio()
    let n = 0
    fake.responderTabela('order_list', () => (++n === 1 ? resposta(tres, 3) : resposta(tres, 5)))
    await abrir('/')
    fireEvent.click(abaDe('Pedidos'))
    await andar(50)
    expect(screen.getByTestId('contagem').textContent).toBe('3 pedidos precisam de você, do mais antigo para o mais novo.')
    expect(screen.getByTestId('selo-da-aba').textContent).toBe('5')
    act(() => {
      expect(fake.emitir('orders')).toBe(1)
    })
    await andar(50)
    expect(screen.getByTestId('contagem').textContent).toBe('5 pedidos precisam de você, do mais antigo para o mais novo.')
    expect(screen.getByTestId('selo-da-aba').textContent).toBe('7')
    expect(abaDe('Pedidos')).toHaveAccessibleName('Pedidos, 7 precisam de você')
  })
})

describe('puxar e voltar (MAP-39, G-A28)', () => {
  it('puxar no topo relê a janela, sem esqueleto', async () => {
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir()
    const antes = fake.cadeiasDe('order_list').length
    const area = screen.getByRole('heading', { level: 1, name: 'Pedidos' }).closest('div')!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    expect(screen.getByRole('status')).toHaveTextContent(ATUALIZANDO)
    expect(screen.getByRole('region', { name: 'Pedidos' })).not.toHaveAttribute('aria-busy')
    await andar(50)
    expect(fake.cadeiasDe('order_list').length).toBe(antes + 1)
    expect(linhasNaTela()).toHaveLength(3)
  })

  it('voltar à lista restaura a posição da rolagem daquela entrada', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    await abrir()
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 840 })
    fireEvent.click(abaDe('Início'))
    await andar(50)
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(linhasNaTela()).toHaveLength(3)
    expect(rolar).toHaveBeenCalledWith(0, 840)
  })

  // D1/G4 da verificação (rodada 2): a decisão é da PRIMEIRA renderização da entrada. Passados 5 min
  // fora da lista, o `gcTime` padrão do React Query apaga a consulta inativa; o voltar relê só a
  // primeira página, e o `y` antigo não pode ser aplicado quando a leitura nova chega (G-A28: "sem
  // cache, abre no topo").
  it('voltar SEM cache (o gcTime apagou a lista) abre no topo, mesmo depois de a leitura nova chegar', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    await abrir()
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 840 })
    fireEvent.click(abaDe('Início'))
    await andar(50)
    await andar(5 * 60 * 1000 + 1000)
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    const leiturasAntes = fake.cadeiasDe('order_list').length
    await act(async () => {
      window.history.back()
      await vi.advanceTimersByTimeAsync(50)
    })
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    // A lista veio de uma leitura NOVA (o cache foi mesmo apagado), e já está desenhada.
    expect(fake.cadeiasDe('order_list').length).toBe(leiturasAntes + 1)
    expect(linhasNaTela()).toHaveLength(3)
    expect(rolar).not.toHaveBeenCalledWith(0, 840)
    expect(rolar).toHaveBeenCalledWith(0, 0)
  })

  it('uma entrada NOVA da lista não mexe na rolagem', async () => {
    const rolar = vi.fn()
    vi.spyOn(window, 'scrollTo').mockImplementation(rolar as unknown as typeof window.scrollTo)
    responderRelogio()
    fake.responderTabela('order_list', resposta())
    await abrir()
    expect(rolar).not.toHaveBeenCalled()
  })
})
