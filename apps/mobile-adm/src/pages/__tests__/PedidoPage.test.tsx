// Feature `74` · T24 — o detalhe do pedido pela árvore REAL (`<App />` com sessão admin sobre o dublê
// do client). `MAP-20`, `MAP-29`, `MAP-30`, `MAP-34`..`MAP-40`, `MAP-44`, `MAP-46`, `MAP-54`,
// `MAP-55`, E5, E7, TE2, TE4.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pedidoHref, pedidosHref, type PedidoDoDetalhe } from '@/entities/order'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { FALHA_DE_LEITURA, NAO_ATUALIZOU, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import { ATUALIZANDO } from '@/shared/ui/PullToRefresh'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { movimento } from '@/test/movimento'
import { NOTA, detalhe, item, linha, statusRow } from '@/test/pedidos'
import { resumo } from '@/test/resumo'

import { CANAL_DO_DETALHE, NAO_ENCONTREI, VOLTAR_AOS_PEDIDOS } from '../PedidoPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'Failed to fetch' }
const ID = '00000000-0000-4000-8000-000000000244'

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const ehDetalhe = (cadeia: Elo[]) => cadeia.some((e) => e.metodo === 'maybeSingle')

/** O `order_list` responde à lista (sem `maybeSingle`) e ao detalhe (com ele). */
const responder = ({
  pedido = detalhe() as PedidoDoDetalhe | null | (() => PedidoDoDetalhe | null),
  linhas = [linha()],
}: { pedido?: PedidoDoDetalhe | null | (() => PedidoDoDetalhe | null); linhas?: ReturnType<typeof linha>[] } = {}) => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', (cadeia): RespostaTabela =>
    ehDetalhe(cadeia)
      ? { data: typeof pedido === 'function' ? pedido() : pedido, error: null }
      : { data: linhas, error: null, count: linhas.length },
  )
  fake.responderTabela('order_items', { data: [item()], error: null })
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
}

const h1 = () => screen.getByRole('heading', { level: 1 })
const bloco = (nome: string) => screen.queryByRole('region', { name: nome })
const abaDe = (nome: string) =>
  within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getByRole('link', { name: new RegExp(`^${nome}`) })
const papeisPerguntados = () => fake.estado.tabelas.filter((t) => t === 'user_roles').length

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const abrir = async (caminho = pedidoHref(ID), estado?: Record<string, unknown>) => {
  await montarApp(caminho, { estado })
  await andar(50)
}

describe('o detalhe com dado (MAP-20..MAP-28)', () => {
  it('o cabeçalho, o próximo passo e os sete blocos, numa leitura com UMA confirmação de papel', async () => {
    responder()
    await abrir()
    expect(h1().textContent).toBe('Pedido #0244')
    expect(screen.getByTestId('proximo-passo')).toBeInTheDocument()
    for (const nome of ['Cliente', '1 joia', 'Valores', 'Entrega', 'Histórico']) expect(bloco(nome)).toBeInTheDocument()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
    expect(fake.cadeiasDe('order_list').filter(ehDetalhe)).toHaveLength(1)
    expect(screen.getByTestId('frescor')).toHaveTextContent(/^Atualizado às 11h30\.$/)
  })

  it('o título do documento é "Pedido · Ateliê" lendo e "Pedido #0244 · Ateliê" com o dado (MAP-46, TE2)', async () => {
    responder()
    fake.pendurarTabela('order_items')
    const r = await montarApp(pedidoHref(ID))
    await andar(50)
    expect(h1().textContent).toBe('Pedido')
    expect(document.title).toBe('Pedido · Ateliê')
    r.unmount()

    responder()
    await abrir()
    expect(document.title).toBe('Pedido #0244 · Ateliê')
  })

  it('a aba Pedidos fica marcada no detalhe, e nenhuma outra (MAP-55)', async () => {
    responder()
    await abrir()
    const links = within(screen.getByRole('navigation', { name: 'Áreas do ateliê' })).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-current'))).toEqual([null, 'page', null, null])
  })

  it('abre no topo: `scrollTo(0, 0)` ao montar', async () => {
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    responder()
    await abrir()
    expect(rolar).toHaveBeenCalledWith(0, 0)
  })
})

describe('o aviso no celular no histórico (feature 79, MAN-09, MAN-34)', () => {
  /** A linha só traz `provider_message_id` se o `select` o pediu — o dublê enxerga as colunas. */
  const notificacoesDoPush = (cadeia: Elo[]): RespostaTabela => {
    const colunas = String(cadeia.find((e) => e.metodo === 'select')?.args[0] ?? '')
    const linha = (o: Record<string, unknown>) => {
      const l: Record<string, unknown> = {
        id: 'p1', event: 'owner_order_paid', channel: 'push', status: 'sent', attempts: 1, delivery_status: null,
        error: null, created_at: '2026-10-23T10:00:00Z', sent_at: '2026-10-23T10:00:05Z', ...o,
      }
      if (!colunas.split(',').map((c) => c.trim()).includes('provider_message_id')) delete l.provider_message_id
      return l
    }
    return {
      data: [
        linha({ id: 'p1', provider_message_id: 'push:2/3' }),
        linha({ id: 'p2', event: 'owner_order_received', status: 'failed', sent_at: null, provider_message_id: null, error: 'fcm.googleapis.com: 500', created_at: '2026-10-23T09:00:00Z' }),
      ],
      error: null,
    }
  }

  it('a entrega parcial diz quantos aparelhos, e a falha diz que o aviso no celular não chegou', async () => {
    responder()
    fake.responderTabela('order_notifications', notificacoesDoPush)
    await abrir()
    const historico = bloco('Histórico')!
    expect(within(historico).getByText('Aviso à dona de pedido pago enviado (Celular)')).toBeInTheDocument()
    expect(within(historico).getByText('Entregue a 2 de 3 aparelhos')).toBeInTheDocument()
    expect(within(historico).getByText('O aviso no celular não chegou.')).toBeInTheDocument()
    expect(within(historico).getByText('fcm.googleapis.com: 500')).toBeInTheDocument()
  })
})

describe('lendo (MAP-44, E5, TE2)', () => {
  it('esqueletos POR BLOCO com `aria-busy` e parados com movimento reduzido — e o `h1` existe', async () => {
    responder()
    fake.pendurarTabela('order_items')
    await abrir()
    expect(h1().textContent).toBe('Pedido')
    const esqueletos = screen.getAllByTestId('esqueleto-do-bloco')
    expect(esqueletos.length).toBeGreaterThanOrEqual(4)
    for (const e of esqueletos) {
      expect(e).toHaveAttribute('aria-busy', 'true')
      for (const t of e.querySelectorAll('.animate-pulse')) expect(t.className).toContain('motion-reduce:animate-none')
    }
    expect(bloco('Cliente')).toBeNull()
  })

  it('entrar da lista com a leitura PENDENTE põe o foco no `h1` (E5)', async () => {
    responder()
    fake.pendurarTabela('order_items')
    await abrir('/pedidos?visao=tudo')
    fireEvent.click(screen.getByRole('link', { name: 'Pedido #0244, Marina Duarte' }))
    await andar(50)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(document.activeElement).toBe(h1())
    expect(h1().textContent).toBe('Pedido')
  })
})

describe('"Voltar" (MAP-20, E7, G-A28)', () => {
  it('lista → linha → detalhe → "Voltar": o MESMO recorte e a mesma posição de rolagem', async () => {
    const rolar = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    responder()
    await abrir(pedidosHref({ bloco: 'sem-rastreio' }))
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 840 })
    fireEvent.click(screen.getByRole('link', { name: 'Pedido #0244, Marina Duarte' }))
    await andar(50)
    expect(h1().textContent).toBe('Pedido #0244')
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
    rolar.mockClear()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(`${window.location.pathname}${window.location.search}`).toBe(pedidosHref({ bloco: 'sem-rastreio' }))
    expect(screen.getByTestId('faixa-do-bloco')).toBeInTheDocument()
    expect(rolar).toHaveBeenCalledWith(0, 840)
  })

  it('Início → "Últimos pedidos" → detalhe → "Voltar": de volta à Início (MAP-52, E7)', async () => {
    responder()
    fake.responderRpc('store_movement', movimento())
    const r = resumo()
    fake.responderRpc('store_overview', { ...r, recentes: [{ ...r.recentes[0], id: ID }, ...r.recentes.slice(1)] })
    await abrir('/')
    fireEvent.click(screen.getByRole('link', { name: 'Pedido #0244, Marina Souza' }))
    await andar(50)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(h1().textContent).toBe('Pedido #0244')
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/')
    expect(screen.getByRole('heading', { level: 2, name: 'Últimos pedidos' })).toBeInTheDocument()
  })

  it('aberto direto (link colado, F5): "Voltar" leva à lista, por substituição', async () => {
    responder()
    window.history.pushState({}, '', '/')
    await abrir()
    const tamanho = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(`${window.location.pathname}${window.location.search}`).toBe('/pedidos')
    expect(window.history.length).toBe(tamanho)
  })
})

describe('não encontrei (MAP-29)', () => {
  it('id que não existe: "Não encontrei este pedido." com "Voltar aos pedidos" — nenhum bloco', async () => {
    responder({ pedido: null })
    await abrir()
    expect(screen.getByText(NAO_ENCONTREI)).toBeInTheDocument()
    expect(h1().textContent).toBe('Pedido')
    expect(bloco('Cliente')).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: VOLTAR_AOS_PEDIDOS }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
  })

  it('endereço que não é id de pedido: "Não encontrei" SEM ir à rede nem à confirmação de papel', async () => {
    responder()
    await abrir('/pedidos/nao-e-um-uuid')
    expect(screen.getByText(NAO_ENCONTREI)).toBeInTheDocument()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(0)
    expect(fake.cadeiasDe('order_list')).toHaveLength(0)
    expect(fake.canaisAbertos()).toHaveLength(0)
  })
})

describe('falha por bloco (MAP-30, TE4)', () => {
  it('itens em falha: só aquele bloco em falha; "Tentar de novo" relê o detalhe e o bloco Cliente nunca sai', async () => {
    responder()
    let n = 0
    fake.responderTabela('order_items', () => (++n === 1 ? { data: null, error: REDE } : { data: [item({ quantity: 2 })], error: null }))
    await abrir()
    const itens = bloco('Joias')!
    expect(within(itens).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(bloco('Valores')).toBeInTheDocument()
    expect(bloco('Histórico')).toBeInTheDocument()
    const cliente = bloco('Cliente')!

    fireEvent.click(within(itens).getByRole('button', { name: TENTAR_DE_NOVO }))
    // A releitura com dado não troca os blocos bons por esqueleto.
    expect(screen.queryAllByTestId('esqueleto-do-bloco')).toHaveLength(0)
    expect(bloco('Cliente')).toBe(cliente)
    await andar(50)
    expect(bloco('2 joias')).toBeInTheDocument()
    expect(bloco('Joias')).toBeNull()
    expect(bloco('Cliente')).toBe(cliente)
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(2)
  })

  it('histórico com UMA das três fontes em falha: o bloco inteiro em falha (Q6); itens seguem', async () => {
    responder()
    fake.falharTabela('order_notes', REDE)
    await abrir()
    expect(within(bloco('Histórico')!).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(screen.queryAllByTestId('evento-do-historico')).toHaveLength(0)
    expect(bloco('1 joia')).toBeInTheDocument()
  })

  it('a leitura do PEDIDO falhou: a tela inteira em falha, com o `h1` — nunca um detalhe vazio (MAP-34)', async () => {
    fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
    fake.falharTabela('order_list', REDE)
    fake.responderTabela('order_items', { data: [], error: null })
    fake.responderTabela('order_status_history', { data: [], error: null })
    fake.responderTabela('order_notes', { data: [], error: null })
    fake.responderTabela('order_notifications', { data: [], error: null })
    await abrir()
    await andar(3000)
    expect(h1().textContent).toBe('Pedido')
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(bloco('Cliente')).toBeNull()
  })

  it('a releitura que falha mantém o detalhe com "Não consegui atualizar agora." (MAP-35)', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: REDE }))
    await abrir()
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(bloco('Cliente')).toBeInTheDocument()
    expect(screen.getByTestId('frescor')).toHaveTextContent(NAO_ATUALIZOU)
  })
})

describe('recusa e rede (MAP-36..MAP-38)', () => {
  it('`42501` com o papel tirado: a recusa da 72, e nada do pedido no DOM', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Marina|#0244|Rua das Flores/)
  })

  it('`42501` com o papel ainda admin: nenhum bloco — nem o de antes —, a falha com o `h1`, e UMA reconferência', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(bloco('Cliente')).toBeInTheDocument()
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(bloco('Cliente')).toBeNull()
    expect(screen.getByRole('main').textContent).not.toMatch(/Marina|Rua das Flores|R\$/)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(h1().textContent).toBe('Pedido')
    expect(papeisPerguntados()).toBe(2)
    await andar(30_000)
    expect(papeisPerguntados()).toBe(2)
  })

  it('rede na confirmação: falha de leitura, nunca recusa', async () => {
    responder()
    fake.falharRpc('atelie_clock', REDE)
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(papeisPerguntados()).toBe(1)
  })
})

describe('o Realtime e o puxar (MAP-39)', () => {
  it('UM canal, aberto depois da confirmação e fechado ao sair', async () => {
    responder()
    await abrir()
    expect(fake.canaisAbertos().map((c) => c.nome)).toEqual([CANAL_DO_DETALHE])
    fake.responderRpc('store_movement', movimento())
    fake.responderRpc('store_overview', resumo())
    fireEvent.click(abaDe('Início'))
    await andar(50)
    expect(fake.canaisAbertos().map((c) => c.nome)).not.toContain(CANAL_DO_DETALHE)
  })

  // G6 da verificação (rodada 3): a recusa FECHA o canal, com a página ainda montada (o `42501` com o
  // papel ainda admin). Canal aberto ali seria cada aviso relendo o detalhe e o resumo sobre uma tela
  // recusada — e a RLS entregaria a uma conta sem papel os avisos dos pedidos dela.
  //
  // O que esta régua mede é o RESULTADO (canal fechado, aviso sem releitura), e não a linha
  // `if (recusada) setConfirmada(false)`. Hoje o `<App />` real fecha o canal por DOIS caminhos: a
  // vigia chama `retryAdminCheck`, o `loading` do provider faz o `RequireAdmin` trocar a página pela
  // splash, e a página DESMONTA (`useRecusaDePapel`, achado da T18) — o que já fecha o canal; a linha é
  // a segunda defesa, para a página que fica montada. Por isso apagar só a linha (N16/N16b) é mutante
  // EQUIVALENTE hoje; apagar a linha E a reconferência da vigia (a página fica montada) reprova aqui e
  // em nenhum outro caso (medido no fecho da r3, `validation.md`).
  it('a recusa com a página montada fecha o canal — e um aviso depois dela não relê nada', async () => {
    responder()
    fake.aoChamarRpc('atelie_clock', (n) => (n === 1 ? { data: { lido_em: LIDO_EM }, error: null } : { data: null, error: RECUSA }))
    await abrir()
    expect(fake.canaisAbertos().map((c) => c.nome)).toEqual([CANAL_DO_DETALHE])
    act(() => {
      fake.emitir('orders')
    })
    await andar(3000)
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(fake.canaisAbertos().map((c) => c.nome)).not.toContain(CANAL_DO_DETALHE)
    const leituras = fake.cadeiasDe('order_list').length
    act(() => {
      expect(fake.emitir('orders')).toBe(0)
    })
    await andar(3000)
    expect(fake.cadeiasDe('order_list')).toHaveLength(leituras)
  })

  it('o aviso relê o detalhe — o estado novo na tela — e o resumo: o SELO da aba muda (A25)', async () => {
    fake.aoChamarRpc('store_overview', (n) => ({ data: n === 1 ? resumo() : resumo({ fila: { ...resumo().fila, precisa_acao: 1 } }), error: null }))
    let atual = detalhe({ status: 'paid' })
    responder({ pedido: () => atual })
    await abrir()
    expect(document.querySelector('main [data-situation]')?.textContent).toBe('Em produção')
    expect(abaDe('Pedidos')).toHaveAccessibleName('Pedidos, 5 precisam de você')
    atual = detalhe({ status: 'shipped', tracking_code: 'BR123456789BR' })
    act(() => {
      expect(fake.emitir('orders')).toBe(1)
    })
    await andar(50)
    expect(document.querySelector('main [data-situation]')?.textContent).toBe('Enviado')
    expect(screen.getByText('Rastreio BR123456789BR')).toBeInTheDocument()
    expect(abaDe('Pedidos')).toHaveAccessibleName('Pedidos, 1 precisa de você')
  })

  it('puxar no topo relê o detalhe, sem esqueleto', async () => {
    responder()
    await abrir()
    const antes = fake.chamadasDe('atelie_clock').length
    const area = h1().closest('header')!.parentElement!.parentElement!
    fireEvent.touchStart(area, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(area, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(area)
    expect(screen.getByRole('status')).toHaveTextContent(ATUALIZANDO)
    expect(screen.queryAllByTestId('esqueleto-do-bloco')).toHaveLength(0)
    await andar(50)
    expect(fake.chamadasDe('atelie_clock').length).toBe(antes + 1)
    expect(bloco('Cliente')).toBeInTheDocument()
  })
})
