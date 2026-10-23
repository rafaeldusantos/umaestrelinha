// Feature `73` · T18 — a Início, pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client). `MAI-01`, `MAI-09`, `MAI-17`..`MAI-26`, `MAI-29`, `MAI-30`.
//
// Cada leitura tem o seu caso de erro E o seu caso de pendura (`L-043`, `L-054`): os blocos de uma
// nunca dependem da outra. O processo roda em UTC (o "aparelho"); a hora escrita é a de Brasília.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { onlineManager } from '@tanstack/react-query'
import { fake, type RespostaRpc } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimento } from '@/test/movimento'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import { ATUALIZANDO } from '@/shared/ui/PullToRefresh'
import { NAO_ATUALIZOU } from '../InicioPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const RECUSA = { message: 'permission denied for function store_overview', code: '42501' }
const REDE = { message: 'Failed to fetch' }

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  // O `onlineManager` do React Query é do MÓDULO: um teste que o deixasse offline contaminaria os
  // seguintes. Só isolamento — a régua de que ele volta sozinho está no caso da rede, abaixo.
  onlineManager.setOnline(true)
})

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/** O número do topo, pelo nome acessível (rótulo, período e valor). */
const faturamentoHoje = () => screen.queryByRole('group', { name: /^Faturamento, hoje, / })
/** A contagem do primeiro bloco da fila. */
const blocoAguardando = () => document.querySelector('[data-bloco="aguardando"]')

const responderTudo = () => {
  fake.responderRpc('store_movement', movimento())
  fake.responderRpc('store_overview', resumo())
}

/** Uma resposta segurada: a promessa fica no ar até `soltar`. */
const segurada = () => {
  let soltar: (r: RespostaRpc) => void = () => {}
  const promessa = new Promise<RespostaRpc>((r) => (soltar = r))
  return { promessa, soltar: (r: RespostaRpc) => soltar(r) }
}

const abrir = async () => {
  await montarApp('/')
  await andar(50)
}

describe('a Início abre lendo as duas RPCs admin (MAI-01, MAI-09, MAI-23)', () => {
  it('uma chamada de cada, SEM argumento, e nenhuma leitura de tabela', async () => {
    responderTudo()
    await abrir()
    expect(faturamentoHoje()).toHaveAccessibleName(/^Faturamento, hoje, R\$\s1\.077$/)
    expect(blocoAguardando()?.textContent).toContain('3')
    expect(fake.chamadasDe('store_movement')).toEqual([{ nome: 'store_movement', args: [] }])
    expect(fake.chamadasDe('store_overview')).toEqual([{ nome: 'store_overview', args: [] }])
    // `MAI-23`: só RPC. Nenhum `orders` pelo PostgREST (a RLS daria os pedidos da própria conta).
    expect(fake.leiturasDeDado().sort()).toEqual(['rpc:store_movement', 'rpc:store_overview'])
  })

  it('o leitor de tela lê cada número com o rótulo (MAI-30)', async () => {
    responderTudo()
    await abrir()
    for (const nome of [/^Vendas, hoje, 3$/, /^Ticket médio, hoje, R\$\s359,00$/, /^Visitas, hoje, 41$/]) {
      expect(screen.getByRole('group', { name: nome })).toBeInTheDocument()
    }
  })

  it('o rodapé do Backoffice continua (MAI-29)', async () => {
    responderTudo()
    await abrir()
    expect(screen.getByTestId('rodape-backoffice')).toHaveTextContent('Produtos, vitrine e configurações da loja seguem no Backoffice.')
  })
})

describe('cada leitura falha e pendura SOZINHA (MAI-17, L-043, L-054)', () => {
  it('o movimento falha: o topo diz que não carregou, sem número; os blocos do resumo seguem', async () => {
    fake.falharRpc('store_movement', REDE)
    fake.responderRpc('store_overview', resumo())
    await abrir()
    await andar(3000) // a única repetição da falha de rede
    const topo = screen.getByRole('region', { name: 'Movimento da loja' })
    expect(within(topo).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(within(topo).queryByText(/R\$/)).toBeNull()
    expect(faturamentoHoje()).toBeNull()
    expect(blocoAguardando()?.textContent).toContain('3')
    expect(screen.getAllByTestId('pedido-recente')).toHaveLength(4)
    // Rede repete UMA vez (`MAI-24`), e nunca vai à recusa.
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    // Fecho r3 (N15d): a falha da PRIMEIRA leitura não é "não atualizou" — não havia o que atualizar.
    expect(screen.queryByText('Não consegui atualizar agora.')).toBeNull()
  })

  it('o resumo falha: os blocos dele dizem que não carregaram; o topo segue com os números', async () => {
    fake.responderRpc('store_movement', movimento())
    fake.falharRpc('store_overview', REDE)
    await abrir()
    await andar(3000)
    expect(faturamentoHoje()).toBeInTheDocument()
    // Fila, gráfico, mês, joias e últimos pedidos: cinco blocos, cinco falhas, nenhum número deles.
    expect(screen.getAllByText(FALHA_DE_LEITURA)).toHaveLength(5)
    expect(blocoAguardando()).toBeNull()
    expect(screen.queryAllByTestId('pedido-recente')).toHaveLength(0)
    expect(fake.chamadasDe('store_overview')).toHaveLength(2)
    // Fecho r3 (N15d): a primeira leitura do resumo que falha não acende o aviso de releitura.
    expect(screen.queryByText('Não consegui atualizar agora.')).toBeNull()
  })

  it('o movimento pendura: o topo em esqueleto (aria-busy); o resumo desenha', async () => {
    fake.pendurarRpc('store_movement')
    fake.responderRpc('store_overview', resumo())
    await abrir()
    await andar(10_000)
    expect(screen.getByRole('region', { name: 'Movimento da loja' })).toHaveAttribute('aria-busy', 'true')
    expect(faturamentoHoje()).toBeNull()
    expect(blocoAguardando()?.textContent).toContain('3')
    expect(screen.getAllByTestId('pedido-recente')).toHaveLength(4)
  })

  it('o resumo pendura: os blocos dele em esqueleto; o topo desenha', async () => {
    fake.responderRpc('store_movement', movimento())
    fake.pendurarRpc('store_overview')
    await abrir()
    await andar(10_000)
    expect(faturamentoHoje()).toBeInTheDocument()
    expect(document.querySelector('section[aria-labelledby="precisa-de-voce"]')).toHaveAttribute('aria-busy', 'true')
    expect(blocoAguardando()).toBeNull()
    expect(screen.queryAllByTestId('pedido-recente')).toHaveLength(0)
  })

  it('"Tentar de novo" do topo relê SÓ o movimento, e desenha', async () => {
    fake.aoChamarRpc('store_movement', (n) => (n <= 2 ? { data: null, error: REDE } : { data: movimento(), error: null }))
    fake.responderRpc('store_overview', resumo())
    await abrir()
    await andar(3000)
    const topo = screen.getByRole('region', { name: 'Movimento da loja' })
    fireEvent.click(within(topo).getByRole('button', { name: TENTAR_DE_NOVO }))
    await andar(50)
    expect(faturamentoHoje()).toBeInTheDocument()
    expect(fake.chamadasDe('store_movement')).toHaveLength(3)
    expect(fake.chamadasDe('store_overview')).toHaveLength(1)
  })
})

describe('frescor (MAI-18)', () => {
  it('"Atualizado às" diz a hora de BRASÍLIA do `lido_em` do servidor (14:30Z ⇒ 11h30), não do aparelho', async () => {
    responderTudo()
    await abrir()
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h30\.$/)
  })

  it('com duas leituras, vale a mais ANTIGA', async () => {
    fake.responderRpc('store_movement', movimento({ lido_em: '2026-10-22T14:30:00.000Z' }))
    fake.responderRpc('store_overview', resumo({ lido_em: '2026-10-22T14:12:00.000Z' }))
    await abrir()
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h12\.$/)
  })

  it('a releitura que FALHA mantém os números, sem esqueleto, com a hora e o aviso', async () => {
    fake.aoChamarRpc('store_movement', (n) => (n === 1 ? { data: movimento(), error: null } : { data: null, error: REDE }))
    fake.responderRpc('store_overview', resumo({ lido_em: '2026-10-22T14:40:00.000Z' }))
    await abrir()
    expect(screen.queryByText(NAO_ATUALIZOU)).toBeNull()
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(fake.chamadasDe('store_movement').length).toBeGreaterThanOrEqual(2)
    expect(faturamentoHoje()).toHaveAccessibleName(/^Faturamento, hoje, R\$\s1\.077$/)
    expect(screen.getByRole('region', { name: 'Movimento da loja' })).not.toHaveAttribute('aria-busy')
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    // A hora é a do dado que ficou (o movimento, 11h30), não a do resumo que acabou de chegar.
    expect(screen.getByTestId('frescor')).toHaveTextContent(/Atualizado às 11h30\.$/)
  })

  it('a releitura do RESUMO que falha também mantém os números, com o aviso e a hora da leitura boa (N15 da r2)', async () => {
    // O irmão do caso acima, com a outra leitura: o aviso é das DUAS. O resumo é o mais antigo
    // (14:20Z ⇒ 11h20) e fica; o movimento relê com sucesso às 14:45Z.
    fake.aoChamarRpc('store_movement', (n) => ({ data: movimento({ lido_em: n === 1 ? '2026-10-22T14:30:00.000Z' : '2026-10-22T14:45:00.000Z' }), error: null }))
    fake.aoChamarRpc('store_overview', (n) => (n === 1 ? { data: resumo({ lido_em: '2026-10-22T14:20:00.000Z' }), error: null } : { data: null, error: REDE }))
    await abrir()
    expect(screen.queryByText(NAO_ATUALIZOU)).toBeNull()
    expect(blocoAguardando()?.textContent).toContain('3')
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(fake.chamadasDe('store_overview').length).toBeGreaterThanOrEqual(2)
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    // Os números do resumo ficam, sem esqueleto e sem a frase de falha.
    expect(blocoAguardando()?.textContent).toContain('3')
    expect(screen.getAllByTestId('pedido-recente')).toHaveLength(4)
    expect(screen.queryByText(FALHA_DE_LEITURA)).toBeNull()
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/Atualizado às 11h20\.$/)
  })

  it('a releitura que dá certo depois tira o aviso', async () => {
    fake.aoChamarRpc('store_movement', (n) =>
      n === 1 ? { data: movimento(), error: null } : n <= 3 ? { data: null, error: REDE } : { data: movimento({ lido_em: '2026-10-22T15:00:00.000Z' }), error: null },
    )
    fake.responderRpc('store_overview', resumo({ lido_em: '2026-10-22T15:00:00.000Z' }))
    await abrir()
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
    act(() => {
      fake.emitir('orders')
    })
    await andar(50)
    expect(screen.getByTestId('frescor')).not.toHaveTextContent(NAO_ATUALIZOU)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 12h00\.$/)
  })
})

describe('recusa por papel (MAI-22, MAI-24)', () => {
  it.each(['store_movement', 'store_overview'])(
    '`42501` de %s ⇒ UMA chamada, o papel reconferido e o Login com a recusa — nenhum número na tela',
    async (nome) => {
      const outra = nome === 'store_movement' ? 'store_overview' : 'store_movement'
      fake.responderRpc(outra, outra === 'store_movement' ? movimento() : resumo())
      // O papel foi tirado no painel: a RPC recusa, e a releitura do papel diz "não é admin".
      fake.aoChamarRpc(nome, () => {
        fake.estado.admins.clear()
        return { data: null, error: RECUSA }
      })
      await abrir()
      await andar(3000)
      expect(window.location.pathname).toBe('/login')
      expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
      expect(fake.chamadasDe(nome)).toHaveLength(1)
      expect(document.body.textContent).not.toMatch(/R\$|1\.077|Precisa de você|Últimos pedidos/)
      // O papel foi perguntado de novo: a abertura e a reconferência.
      expect(fake.estado.tabelas.filter((t) => t === 'user_roles')).toHaveLength(2)
    },
  )

  it('`42501` com o papel ainda admin: os blocos dizem que não carregaram, sem número — nem o de antes', async () => {
    fake.responderRpc('store_overview', resumo())
    fake.aoChamarRpc('store_movement', (n) => (n === 1 ? { data: movimento(), error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(faturamentoHoje()).toBeInTheDocument()
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(window.location.pathname).toBe('/')
    expect(faturamentoHoje()).toBeNull()
    expect(blocoAguardando()).toBeNull()
    expect(screen.getAllByText(FALHA_DE_LEITURA).length).toBeGreaterThanOrEqual(6)
    expect(screen.getByRole('main').textContent).not.toMatch(/R\$\s?\d|\d{2}/)
    expect(screen.queryByTestId('frescor')).toBeNull()
    // A recusa não repete (`retryUnlessDenied`). São três chamadas: a abertura, a do aviso (recusada)
    // e a da REMONTAGEM — a reconferência põe `loading`, o `RequireAdmin` troca a página pelo
    // `fallback`, e a página volta lendo. E PARA aí: a vigia não reconfere na remontagem (o laço que a
    // T18 achou e consertou em `useRecusaDePapel`).
    expect(fake.chamadasDe('store_movement')).toHaveLength(3)
    expect(fake.estado.tabelas.filter((t) => t === 'user_roles')).toHaveLength(2)
    await andar(30_000)
    expect(fake.chamadasDe('store_movement')).toHaveLength(3)
    expect(fake.estado.tabelas.filter((t) => t === 'user_roles')).toHaveLength(2)
  })

  it('erro de REDE (sem código) nunca leva à recusa nem reconfere o papel', async () => {
    fake.falharRpc('store_movement', REDE)
    fake.falharRpc('store_overview', { message: 'boom', code: '500' })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(fake.estado.tabelas.filter((t) => t === 'user_roles')).toHaveLength(1)
    expect(screen.getAllByText(FALHA_DE_LEITURA)).toHaveLength(6)
  })
})

describe('o Realtime de pedidos (MAI-20)', () => {
  it('UM canal, `atelie-orders-realtime` em `orders` — e continua um depois de re-renderizar', async () => {
    responderTudo()
    await abrir()
    expect(fake.canaisAbertos()).toHaveLength(1)
    const [canal] = fake.canaisAbertos()
    expect(canal.nome).toBe('atelie-orders-realtime')
    expect(canal.inscricoes).toEqual([
      expect.objectContaining({ tipo: 'postgres_changes', filtro: { event: '*', schema: 'public', table: 'orders' } }),
    ])
    // Re-render: troca de período, um aviso, uma releitura.
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    act(() => {
      fake.emitir('orders')
    })
    await andar(50)
    expect(fake.canaisAbertos()).toHaveLength(1)
    expect(fake.client.channel).toHaveBeenCalledTimes(1)
  })

  it('o aviso relê as DUAS leituras e desenha o novo', async () => {
    fake.aoChamarRpc('store_movement', (n) =>
      ({ data: n === 1 ? movimento() : movimento({ periodos: { ...movimento().periodos, hoje: { visitas: 41, vendas: 4, faturamento: 1436, ticket: 359 } } }), error: null }),
    )
    fake.aoChamarRpc('store_overview', (n) => ({ data: resumo({ fila: { ...resumo().fila, aguardando: n === 1 ? 3 : 7 } }), error: null }))
    await abrir()
    act(() => {
      expect(fake.emitir('orders')).toBe(1)
    })
    await andar(50)
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    expect(fake.chamadasDe('store_overview')).toHaveLength(2)
    expect(faturamentoHoje()).toHaveAccessibleName(/R\$\s1\.436$/)
    expect(blocoAguardando()?.textContent).toContain('7')
  })

  it('trocar de aba FECHA o canal, e o aviso depois disso não relê nada', async () => {
    responderTudo()
    await abrir()
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getByRole('link', { name: 'Pedidos' }))
    await andar(50)
    expect(fake.canaisAbertos()).toHaveLength(0)
    expect(fake.client.removeChannel).toHaveBeenCalledTimes(1)
    expect(fake.emitir('orders')).toBe(0)
    await andar(50)
    expect(fake.chamadasDe('store_movement')).toHaveLength(1)
  })

  it('sair da conta FECHA o canal, e a resposta em voo não é desenhada depois', async () => {
    fake.responderRpc('store_movement', movimento())
    const voo = segurada()
    fake.aoChamarRpc('store_overview', () => voo.promessa)
    await abrir()
    act(() => fake.perderSessao())
    await andar(50)
    expect(window.location.pathname).toBe('/login')
    expect(fake.canaisAbertos()).toHaveLength(0)
    await act(async () => voo.soltar({ data: resumo(), error: null }))
    await andar(50)
    expect(document.body.textContent).not.toMatch(/Precisa de você|Últimos pedidos|R\$/)
  })
})

describe('outras releituras (MAI-19, MAI-21, MAI-25)', () => {
  it('puxar no topo relê as duas, mostra "Atualizando…" e tira ao terminar — sem recarregar a página', async () => {
    responderTudo()
    await abrir()
    const voo = segurada()
    fake.aoChamarRpc('store_overview', (n) => (n === 1 ? { data: resumo(), error: null } : voo.promessa))
    const alvo = screen.getByRole('region', { name: 'Movimento da loja' })
    fireEvent.touchStart(alvo, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(alvo, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(alvo)
    await andar(20)
    expect(screen.getByRole('status')).toHaveTextContent(ATUALIZANDO)
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    expect(fake.chamadasDe('store_overview')).toHaveLength(2)
    // Os números de antes continuam enquanto relê.
    expect(faturamentoHoje()).toBeInTheDocument()
    await act(async () => voo.soltar({ data: resumo(), error: null }))
    await andar(20)
    expect(screen.queryByText(ATUALIZANDO)).toBeNull()
  })

  it('a volta ao primeiro plano relê as duas', async () => {
    responderTudo()
    await abrir()
    act(() => {
      window.dispatchEvent(new Event('visibilitychange'))
    })
    await andar(50)
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    expect(fake.chamadasDe('store_overview')).toHaveLength(2)
  })

  it('a virada do dia relê pela DURAÇÃO do servidor (`expira_em − lido_em`), não pelo relógio do aparelho', async () => {
    // 02:59:00Z ⇒ a próxima 00:00 de Brasília está a 60 s. O relógio do processo diz outra coisa.
    vi.setSystemTime(new Date('2026-05-01T12:00:00Z'))
    fake.responderRpc('store_movement', movimento({ lido_em: '2026-10-23T02:59:00.000Z', expira_em: '2026-10-23T03:00:00.000Z' }))
    fake.responderRpc('store_overview', resumo({ lido_em: '2026-10-23T02:59:00.000Z', expira_em: '2026-10-23T03:00:00.000Z' }))
    await abrir()
    expect(fake.chamadasDe('store_movement')).toHaveLength(1)
    await andar(50_000)
    expect(fake.chamadasDe('store_movement')).toHaveLength(1)
    await andar(15_000)
    expect(fake.chamadasDe('store_movement').length).toBeGreaterThanOrEqual(2)
    expect(fake.chamadasDe('store_overview').length).toBeGreaterThanOrEqual(2)
  })

  it('a resposta de uma leitura ANTIGA que chega depois da nova é descartada (MAI-25)', async () => {
    const velha = segurada()
    const comFat = (faturamento: number) => movimento({ periodos: { ...movimento().periodos, hoje: { visitas: 1, vendas: 1, faturamento, ticket: faturamento } } })
    fake.aoChamarRpc('store_movement', (n) => (n === 1 ? { data: comFat(100), error: null } : n === 2 ? velha.promessa : { data: comFat(300), error: null }))
    fake.responderRpc('store_overview', resumo())
    await abrir()
    act(() => {
      fake.emitir('orders') // a 2ª chamada fica no ar
    })
    await andar(20)
    act(() => {
      fake.emitir('orders') // a 3ª sai e responde
    })
    await andar(20)
    expect(faturamentoHoje()).toHaveAccessibleName(/R\$\s300$/)
    await act(async () => velha.soltar({ data: comFat(200), error: null }))
    await andar(50)
    expect(fake.chamadasDe('store_movement')).toHaveLength(3)
    expect(faturamentoHoje()).toHaveAccessibleName(/R\$\s300$/)
  })
})

describe('a rede cai e volta (MAI-18, MAI-26; achado da prova em navegador da T21)', () => {
  it('a Início volta com o dado de antes e "Atualizado às" — e RELÊ; depois disso, as releituras seguem saindo', async () => {
    let online = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
    // A releitura da volta fica SEGURADA (N20 da r2): o número que aparece antes de ela responder só
    // pode ser o do cache que sobreviveu à queda. Com o cache perdido, a tela voltaria em esqueleto.
    const releituraMov = segurada()
    const releituraRes = segurada()
    const comHora = (n: number) => (n === 1 ? '2026-10-22T14:30:00.000Z' : '2026-10-22T14:50:00.000Z')
    fake.aoChamarRpc('store_movement', (n) => (n === 2 ? releituraMov.promessa : { data: movimento({ lido_em: comHora(n) }), error: null }))
    fake.aoChamarRpc('store_overview', (n) => (n === 2 ? releituraRes.promessa : { data: resumo({ lido_em: comHora(n) }), error: null }))
    await abrir()
    const cair = async (evento: 'online' | 'offline') => {
      online = evento === 'online'
      await act(async () => {
        window.dispatchEvent(new Event(evento))
        await vi.advanceTimersByTimeAsync(700)
      })
    }
    await cair('offline')
    expect(faturamentoHoje()).toBeNull()
    await cair('online')
    // Espera a Início MONTAR (o topo existe) e a releitura SAIR — nunca o número aparecer.
    const topo = () => screen.queryByRole('region', { name: 'Movimento da loja' })
    for (let i = 0; i < 40 && !(topo() && fake.chamadasDe('store_movement').length >= 2); i++) await andar(100)
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    // Antes de a releitura responder: o número de antes, a hora de antes, e nada em esqueleto.
    expect(faturamentoHoje()).toHaveAccessibleName(/^Faturamento, hoje, R\$\s1\.077$/)
    expect(blocoAguardando()?.textContent).toContain('3')
    expect(topo()).not.toHaveAttribute('aria-busy')
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h30\.$/)
    // A releitura responde: a hora passa a ser a da leitura NOVA.
    await act(async () => {
      releituraMov.soltar({ data: movimento({ lido_em: comHora(2) }), error: null })
      releituraRes.soltar({ data: resumo({ lido_em: comHora(2) }), error: null })
    })
    await andar(100)
    expect(faturamentoHoje()).toBeInTheDocument()
    expect(fake.chamadasDe('store_movement')).toHaveLength(2)
    expect(fake.chamadasDe('store_overview')).toHaveLength(2)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h50\.$/)
    // E não ficou "pausado": o aviso do Realtime continua relendo.
    act(() => {
      fake.emitir('orders')
    })
    await andar(100)
    expect(fake.chamadasDe('store_movement')).toHaveLength(3)
  })
})
