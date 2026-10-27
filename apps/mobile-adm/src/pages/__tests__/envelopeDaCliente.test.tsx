// Feature `82` · T10..T12 — o bloco Material do detalhe pela árvore REAL (`<App />` com sessão admin
// sobre o dublê do client, que REGISTRA cada RPC e invocação). A página monta o bloco; o teste nunca
// recria a composição. O dono da escrita (`core/order-actions`) e a porta (`gravarAcao`) são os de
// verdade.
//
// T10: `ENV-01`, `03`, `04`, `15`, `17`..`20`. T11: `ENV-23`..`ENV-27`. T12: `ENV-07`, `ENV-08`, `ENV-21`.
//
// As frases são escritas POR EXTENSO, da spec (nunca lidas das constantes que provam). As idades são
// contra o `lido_em` da leitura (2026-10-23 14:30 UTC), nunca o relógio do aparelho.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORE_OVERVIEW_KEY } from '@estrelinha/core/hooks/useStoreOverview'
import { materialTransitionRefusal } from '@estrelinha/core/material'
import { EnvioIcon } from '@estrelinha/ui/icons'

import { chaveDoPedido, pedidoHref, type PedidoDoDetalhe } from '@/entities/order'
import { esquecerAcoes } from '@/features/order-actions'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { detalhe, item, statusRow } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

// O cache que o `<App />` criou, para conferir o ESTADO da invalidação (T12) — molde da `76` (G15).
const capturado = vi.hoisted(() => ({ cliente: null as import('@tanstack/react-query').QueryClient | null }))
vi.mock('@/app/queryClient', async (original) => {
  const real = await original<typeof import('@/app/queryClient')>()
  return { ...real, criarQueryClient: () => (capturado.cliente = real.criarQueryClient()) }
})

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const ID = '00000000-0000-4000-8000-000000000244'
const AVISO = 'send-notification?action=trigger'

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const ehDetalhe = (cadeia: Elo[]) => cadeia.some((e) => e.metodo === 'maybeSingle')
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

let atual: PedidoDoDetalhe | null
let itens: RespostaTabela
const responder = (pedido: PedidoDoDetalhe) => {
  atual = pedido
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', (cadeia): RespostaTabela =>
    ehDetalhe(cadeia) ? { data: atual, error: null } : { data: atual ? [atual] : [], error: null, count: atual ? 1 : 0 },
  )
  fake.responderTabela('order_items', () => itens)
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
}
const abrir = async () => {
  await montarApp(pedidoHref(ID), { estado: { doApp: true } })
  await andar(50)
}
const tocar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}

const bloco = () => screen.getByRole('region', { name: 'Material afetivo', hidden: true })
const envelope = () => bloco().querySelector('[data-parte="envelope"]') as HTMLElement
const aviso = () => screen.queryByTestId('aviso-da-acao')
const folha = () => screen.queryByRole('dialog')
const campo = () => screen.getByLabelText('Código de rastreio do envio da cliente') as HTMLInputElement

const AGUARDANDO = () => detalhe({ status: 'paid', material_status: 'aguardando_material' })
const A_CAMINHO = (extra: Partial<PedidoDoDetalhe> = {}) =>
  detalhe({ status: 'paid', material_status: 'material_enviado', material_tracking_code: 'QB987654321BR', ...extra })

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  esquecerAcoes()
  itens = { data: [item()], error: null }
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  act(() => esquecerAcoes())
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------------------------
// T10 — "Envelope da cliente"
// ---------------------------------------------------------------------------------------------

describe('a subseção (ENV-01)', () => {
  it('no bloco Material, abaixo dos passos, separada por um fio `line`, com o ícone e o título', async () => {
    responder(AGUARDANDO())
    await abrir()
    const el = envelope()
    expect(el).not.toBeNull()
    expect(within(el).getByRole('heading', { level: 3, name: 'Envelope da cliente' })).toBeInTheDocument()
    expect(tokens(el)).toEqual(expect.arrayContaining(['border-t', 'border-estrelinha-line', 'mt-4', 'pt-3.5']))
    expect(el.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    // Conserto da rodada 1 (precisão): o ícone É o `EnvioIcon` — os mesmos traços, na mesma ordem, que
    // ele desenha sozinho; um outro ícone qualquer passaria pelo "um svg" de cima.
    const titulo = within(el).getByRole('heading', { level: 3, name: 'Envelope da cliente' })
    const icone = titulo.parentElement!.querySelector('svg') as SVGElement
    const tracos = (svg: Element) =>
      [...svg.querySelectorAll('path, circle')].map((n) => n.getAttribute('d') ?? `circle ${n.getAttribute('cx')},${n.getAttribute('cy')}`)
    const referencia = new DOMParser().parseFromString(renderToStaticMarkup(<EnvioIcon aria-hidden />), 'image/svg+xml').documentElement
    expect(tracos(icone)).toEqual(tracos(referencia))
    expect(tracos(icone).length).toBeGreaterThan(0)
    // A tipografia do título, 15/700 na fonte de display — token exato.
    expect(tokens(titulo)).toEqual(expect.arrayContaining(['font-display', 'text-[15px]', 'font-bold']))
    const passos = within(bloco()).getByRole('list', { name: 'Passos do material' })
    expect(passos.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem material (`nao_aplicavel`): nem o bloco, nem o envelope', async () => {
    responder(detalhe({ status: 'paid' }))
    await abrir()
    expect(screen.queryByRole('region', { name: 'Material afetivo' })).toBeNull()
    expect(screen.queryByText('Envelope da cliente')).toBeNull()
  })
})

describe('sem código (ENV-03, ENV-20)', () => {
  it('aguardando: a frase do "ainda não informou" e "Informar código do envelope", de 44 px; sem "Alterar"', async () => {
    responder(AGUARDANDO())
    await abrir()
    expect(
      within(envelope()).getByText(
        'Marina ainda não informou o rastreio. É opcional: se ela mandar pelo WhatsApp, registre aqui. Também dá para marcar o recebimento direto.',
      ),
    ).toBeInTheDocument()
    const botao = within(envelope()).getByRole('button', { name: 'Informar código do envelope' })
    expect(tokens(botao)).toEqual(expect.arrayContaining(['min-h-11', 'w-full']))
    // O ícone `+` dentro do botão, decorativo (conserto da rodada 1, precisão).
    const mais = botao.querySelector('svg')
    expect(tokens(mais)).toContain('lucide-plus')
    expect(mais).toHaveAttribute('aria-hidden', 'true')
    expect(within(envelope()).queryByRole('button', { name: /^Alterar/ })).toBeNull()
    expect(within(envelope()).queryByRole('button', { name: 'Copiar código' })).toBeNull()
  })

  it('recebido sem código: "Chegou sem código registrado. Recebido há 2 dias." — e nenhum botão', async () => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido', material_received_at: '2026-10-21T10:00:00.000000+00:00' }))
    await abrir()
    expect(within(envelope()).getByText('Chegou sem código registrado. Recebido há 2 dias.')).toBeInTheDocument()
    expect(within(envelope()).queryByRole('button')).toBeNull()
  })

  it('cancelado sem código: "Nenhum código registrado." — e nenhum botão', async () => {
    responder(detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'aguardando_material' }))
    await abrir()
    expect(within(envelope()).getByText('Nenhum código registrado.')).toBeInTheDocument()
    expect(within(envelope()).queryByRole('button')).toBeNull()
  })
})

describe('com código (ENV-04, ENV-15..ENV-17)', () => {
  it('o cartão: "Código dos Correios", o código e a origem; "Alterar" com o nome acessível; Copiar e Correios', async () => {
    responder(A_CAMINHO({ material_tracking_set_at: '2026-10-21T14:00:00.000000+00:00', material_tracking_set_by: 'customer' }))
    await abrir()
    const cartao = envelope().querySelector('[data-parte="cartao-do-codigo"]') as HTMLElement
    expect(tokens(cartao)).toEqual(expect.arrayContaining(['bg-estrelinha-ground-deep', 'rounded-[12px]']))
    expect(within(cartao).getByText('Código dos Correios')).toBeInTheDocument()
    const codigo = within(cartao).getByText('QB987654321BR')
    expect(tokens(codigo)).toEqual(expect.arrayContaining(['text-lg', 'font-semibold', 'tracking-[.08em]', 'select-all', '[overflow-wrap:anywhere]']))
    expect(within(cartao).getByText('Informado pela cliente há 2 dias')).toBeInTheDocument()
    const alterar = within(envelope()).getByRole('button', { name: 'Alterar o código do envelope' })
    expect(tokens(alterar)).toContain('min-h-11')
    expect(within(envelope()).getByRole('button', { name: 'Copiar código' })).toBeInTheDocument()
    expect(within(envelope()).getByRole('link', { name: 'Ver nos Correios (abre em outra aba)' })).toBeInTheDocument()
    expect(within(envelope()).queryByRole('button', { name: 'Informar código do envelope' })).toBeNull()
  })

  it.each([
    ['registrado pela Adri', { material_tracking_set_at: '2026-10-23T12:30:00.000000+00:00', material_tracking_set_by: 'admin' as const }, 'Registrado por você há 2 h'],
    ['anterior à migration (sem autoria): a idade do PEDIDO', {}, 'Código informado há 3 dias'],
  ])('a origem %s', async (_n, extra, frase) => {
    responder(A_CAMINHO(extra))
    await abrir()
    expect(within(envelope()).getByText(frase)).toBeInTheDocument()
  })

  it('recebido COM código: a origem diz quando chegou; sem "Alterar", mas Copiar e Correios seguem (ENV-17)', async () => {
    responder(
      A_CAMINHO({
        material_status: 'material_recebido',
        material_received_at: '2026-10-22T14:30:00.000000+00:00',
        material_tracking_set_at: '2026-10-21T14:00:00.000000+00:00',
        material_tracking_set_by: 'customer',
      }),
    )
    await abrir()
    expect(within(envelope()).getByText('Informado pela cliente há 2 dias · chegou há 1 dia')).toBeInTheDocument()
    expect(within(envelope()).queryByRole('button', { name: /^Alterar/ })).toBeNull()
    expect(within(envelope()).getByRole('button', { name: 'Copiar código' })).toBeInTheDocument()
    expect(within(envelope()).getByRole('link', { name: 'Ver nos Correios (abre em outra aba)' })).toBeInTheDocument()
  })

  it('"Ver nos Correios": aba nova, `noopener noreferrer`, o link oficial com o código por `encodeURIComponent` (ENV-19)', async () => {
    responder(A_CAMINHO({ material_tracking_code: 'AB 12&3#4' }))
    await abrir()
    const link = within(envelope()).getByRole('link', { name: 'Ver nos Correios (abre em outra aba)' })
    expect(link).toHaveAttribute('href', 'https://rastreamento.correios.com.br/app/index.php?objetos=AB%2012%263%234')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveTextContent(/^Ver nos Correios$/)
  })

  it('Copiar e Correios lado a lado, numa grade de duas colunas, cada um com 44 px', async () => {
    responder(A_CAMINHO())
    await abrir()
    const copiar = within(envelope()).getByRole('button', { name: 'Copiar código' })
    const correios = within(envelope()).getByRole('link', { name: 'Ver nos Correios (abre em outra aba)' })
    expect(copiar.parentElement).toBe(correios.parentElement)
    // Prova em navegador da `82` (T15): com `grid-cols-2` FIXO, a 200 % de fonte em 360/390 cada botão
    // ficava com ~107 px e os rótulos se partiam no meio da palavra ("Cop/iar/códi/go", "Cor/reio/s").
    // A grade reflui com a fonte (a lição do QA da `73`): duas colunas lado a lado com a fonte padrão
    // (medido em 360, 390 e 1440), uma coluna quando a fonte cresce. jsdom não mede layout: a régua é
    // de token exato, e o lado a lado a 100 % está na prova em navegador.
    const grade = tokens(copiar.parentElement)
    expect(grade).toContain('grid')
    expect(grade).toContain('grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))]')
    expect(grade.some((c) => /^grid-cols-\d+$/.test(c))).toBe(false)
    expect(tokens(copiar)).toContain('min-h-11')
    expect(tokens(correios)).toContain('min-h-11')
  })

  it('o título não se parte no meio da palavra ao lado de "Alterar" com a fonte grande: a linha embrulha (T15)', async () => {
    // Prova em navegador da `82`: a 200 % em 360/390 o título ficava com ~52 px ao lado de "Alterar" e
    // saía "Envel/ope/da/client/e". O ícone e o título formam um grupo com piso em rem, e a linha
    // embrulha: "Alterar" desce, alinhado à direita.
    responder(A_CAMINHO())
    await abrir()
    const titulo = within(envelope()).getByRole('heading', { level: 3, name: 'Envelope da cliente' })
    const grupo = titulo.parentElement as HTMLElement
    const linha = grupo.parentElement as HTMLElement
    const alterar = within(envelope()).getByRole('button', { name: 'Alterar o código do envelope' })
    expect(alterar.parentElement).toBe(linha)
    expect(grupo.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
    expect(tokens(linha)).toEqual(expect.arrayContaining(['flex', 'flex-wrap']))
    expect(tokens(grupo)).toEqual(expect.arrayContaining(['flex', 'flex-1', 'min-w-[min(100%,9rem)]']))
    expect(tokens(alterar)).toEqual(expect.arrayContaining(['ml-auto', 'min-h-11']))
  })
})

describe('"Copiar código" (ENV-18, A9)', () => {
  const comAreaDeTransferencia = (writeText: (t: string) => Promise<void>) =>
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  afterEach(() => {
    delete (navigator as { clipboard?: unknown }).clipboard
  })

  it('copia o código e mostra "Código copiado." — sem nada gravado', async () => {
    const writeText = vi.fn(async () => {})
    comAreaDeTransferencia(writeText)
    responder(A_CAMINHO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Copiar código' }))
    expect(writeText).toHaveBeenCalledWith('QB987654321BR')
    expect(aviso()).toHaveTextContent(/^Código copiado\.$/)
    expect(fake.chamadasDe('set_material_tracking')).toEqual([])
  })

  it('a área de transferência recusa ⇒ "Não consegui copiar. Toque e segure o código para copiar."', async () => {
    comAreaDeTransferencia(async () => {
      throw new Error('NotAllowedError')
    })
    responder(A_CAMINHO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Copiar código' }))
    expect(aviso()).toHaveTextContent(/^Não consegui copiar\. Toque e segure o código para copiar\.$/)
  })

  it('sem a API (contexto inseguro) ⇒ a mesma frase, nunca um toque morto', async () => {
    responder(A_CAMINHO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Copiar código' }))
    expect(aviso()).toHaveTextContent('Não consegui copiar. Toque e segure o código para copiar.')
  })
})

// ---------------------------------------------------------------------------------------------
// T11 — chips, idade, produção, cancelado, ordem
// ---------------------------------------------------------------------------------------------

describe('os materiais do pedido e a idade da espera (ENV-23, ENV-24)', () => {
  it('um chip por material distinto do snapshot, na ordem de `MATERIAL_KINDS`; item que não exige não conta', async () => {
    itens = {
      data: [
        item({ id: 'i-1', requires_material: true, material_kinds: ['cinzas', 'leite_materno'] }),
        item({ id: 'i-2', requires_material: true, material_kinds: ['leite_materno', 'cabelo'] }),
        item({ id: 'i-3', requires_material: false, material_kinds: ['flores'] }),
      ],
      error: null,
    }
    responder(AGUARDANDO())
    await abrir()
    const lista = within(bloco()).getByRole('list', { name: 'Materiais do pedido' })
    expect(within(lista).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Leite materno', 'Mecha de cabelo', 'Cinzas'])
  })

  it('itens em falha de leitura ⇒ nenhum chip (nunca "nenhum material")', async () => {
    itens = { data: null, error: { message: 'boom', code: 'XX000' } } as RespostaTabela
    responder(AGUARDANDO())
    await abrir()
    expect(within(bloco()).queryByRole('list', { name: 'Materiais do pedido' })).toBeNull()
  })

  // Fase 5 (T21, `BUG-20261026-idade-da-espera-sem-contexto`): ANTES os três casos abaixo cravavam
  // `/^há N dias$/` — um número solto ao lado dos chips. Agora "Esperando há N dias" (`materialWaitLabel`).
  it('aguardando há 3 dias: "Esperando há 3 dias" em `ink-soft`', async () => {
    responder(AGUARDANDO())
    await abrir()
    const idade = bloco().querySelector('[data-parte="espera"]')
    expect(idade).toHaveTextContent(/^Esperando há 3 dias$/)
    expect(tokens(idade)).toContain('text-estrelinha-ink-soft')
    expect(tokens(idade)).not.toContain('text-estrelinha-wait')
  })

  it('aguardando há 5 dias (`warm`): "Esperando há 5 dias" ainda em `ink-soft` — só o `stale` ganha `wait` (M27)', async () => {
    // O degrau do meio não tinha caso, e `tier !== 'fresh'` pintava `warm` de âmbar com a suíte verde
    // (M27 da verificação, rodada 1). A idade é contra o `lido_em` (23/10 14:30): 18/10 13:00 ⇒ 5 dias.
    responder(detalhe({ status: 'paid', material_status: 'aguardando_material', created_at: '2026-10-18T13:00:00.000000+00:00' }))
    await abrir()
    const idade = bloco().querySelector('[data-parte="espera"]')
    expect(idade).toHaveAttribute('data-degrau', 'warm')
    expect(idade).toHaveTextContent(/^Esperando há 5 dias$/)
    expect(tokens(idade)).toContain('text-estrelinha-ink-soft')
    expect(tokens(idade)).not.toContain('text-estrelinha-wait')
  })

  it('a caminho há 13 dias (`stale`): "Esperando há 13 dias" em `wait` — a frase é a mesma, só a cor muda (A3)', async () => {
    responder(A_CAMINHO({ created_at: '2026-10-10T09:00:00.000001+00:00' }))
    await abrir()
    const idade = bloco().querySelector('[data-parte="espera"]')
    expect(idade).toHaveTextContent(/^Esperando há 13 dias$/)
    expect(tokens(idade)).toContain('text-estrelinha-wait')
    expect(tokens(idade)).not.toContain('text-estrelinha-ink-soft')
  })

  it('aguardando há 1 dia: "Esperando há 1 dia", no singular, e o leitor de tela lê a frase inteira', async () => {
    // `lido_em` 23/10 14:30: 22/10 10:00 ⇒ 1 dia.
    responder(detalhe({ status: 'paid', material_status: 'aguardando_material', created_at: '2026-10-22T10:00:00.000000+00:00' }))
    await abrir()
    const idade = bloco().querySelector('[data-parte="espera"]')
    expect(idade).toHaveAttribute('data-degrau', 'fresh')
    expect(idade).toHaveTextContent(/^Esperando há 1 dia$/)
    expect(within(bloco()).getByText('Esperando há 1 dia')).toBe(idade)
  })

  it.each([
    ['recebido', detalhe({ status: 'paid', material_status: 'material_recebido' })],
    ['cancelado', detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'aguardando_material' })],
  ])('%s: sem idade', async (_n, pedido) => {
    responder(pedido)
    await abrir()
    expect(bloco().querySelector('[data-parte="espera"]')).toBeNull()
  })
})

describe('"Colocar em produção" (ENV-25)', () => {
  const RECEBIDO = () => detalhe({ status: 'paid', material_status: 'material_recebido' })
  const botao = () => within(bloco()).queryByRole('button', { name: 'Colocar em produção' })

  it.each([
    ['aguardando', AGUARDANDO()],
    ['a caminho', A_CAMINHO()],
    ['já em produção', detalhe({ status: 'paid', material_status: 'em_producao' })],
    ['recebido mas cancelado', detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'material_recebido' })],
  ])('%s ⇒ sem o botão', async (_n, pedido) => {
    responder(pedido)
    await abrir()
    expect(botao()).toBeNull()
  })

  it('recebido: o botão secundário de largura inteira; tocar grava SÓ o material (`em_producao`) e avisa', async () => {
    responder(RECEBIDO())
    fake.filaRpc('set_material_status', () => {
      atual = detalhe({ status: 'paid', material_status: 'em_producao' })
      return { data: { ok: true, status: 'em_producao' }, error: null }
    })
    fake.filaDeInvocacao(AVISO, { data: { sent: true }, error: null })
    await abrir()
    expect(tokens(botao())).toEqual(expect.arrayContaining(['w-full', 'min-h-11', 'mt-3.5']))
    await tocar(botao()!)
    expect(fake.chamadasDe('set_material_status')).toEqual([{ nome: 'set_material_status', args: [{ p_order_id: ID, p_status: 'em_producao' }] }])
    expect(fake.escritasDe('orders')).toHaveLength(0)
    expect(aviso()).toHaveTextContent('Pedido em produção.')
    expect(aviso()).toHaveTextContent('O material de Marina está na bancada.')
    expect(fake.esgotamentos()).toEqual([])
  })

  it('o foco não cai no `<body>` quando o botão some no sucesso: vai ao título da página (T15)', async () => {
    // Prova em navegador da `82`: depois de "Colocar em produção" o botão sai da tela (o material foi a
    // `em_producao`) e o foco caía no `<body>` — o mesmo defeito que o QA da `75` achou na folha (C03).
    responder(RECEBIDO())
    fake.filaRpc('set_material_status', () => {
      atual = detalhe({ status: 'paid', material_status: 'em_producao' })
      return { data: { ok: true, status: 'em_producao' }, error: null }
    })
    fake.filaDeInvocacao(AVISO, { data: { sent: true }, error: null })
    await abrir()
    botao()!.focus()
    await tocar(botao()!)
    await andar(50)
    expect(botao()).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })

  it('na recusa o botão fica, e o foco com ele (T15)', async () => {
    responder(RECEBIDO())
    fake.filaRpc('set_material_status', { data: { ok: false, reason: 'invalid_transition', status: 'material_recebido' }, error: null })
    await abrir()
    botao()!.focus()
    await tocar(botao()!)
    expect(document.activeElement).toBe(botao())
  })

  // Fase 5, T17 (BUG-20261026-erro-de-uma-acao-aparece-em-outra): o erro de "Colocar em produção" vai
  // para JUNTO DO BOTÃO, no bloco Material — antes destes dois casos ele era lido no rodapé.
  it('a RPC recusa a transição: o motivo no alerta junto do botão (não no rodapé), nenhum aviso de sucesso', async () => {
    responder(RECEBIDO())
    fake.filaRpc('set_material_status', { data: { ok: false, reason: 'invalid_transition', status: 'aguardando_material' }, error: null })
    await abrir()
    await tocar(botao()!)
    expect(aviso()).toBeNull()
    expect(within(screen.getByTestId('rodape-da-acao')).queryByRole('alert')).toBeNull()
    const alerta = within(bloco()).getByRole('alert')
    // A frase EXATA do motivo, do estado que a RPC devolveu para o pedido (conserto da rodada 1, precisão).
    const motivo = materialTransitionRefusal('aguardando_material', 'em_producao')!
    expect(motivo).toMatch(/^Este pedido está em “/)
    expect(alerta).toHaveTextContent(motivo)
    expect(alerta).not.toHaveTextContent('Pedido em produção.')
  })

  it('500 ⇒ "Não consegui salvar. Tente de novo."', async () => {
    responder(RECEBIDO())
    fake.filaRpc('set_material_status', { data: null, error: { message: 'boom', code: 'XX000' } })
    await abrir()
    await tocar(botao()!)
    expect(within(screen.getByTestId('rodape-da-acao')).queryByRole('alert')).toBeNull()
    const alerta = within(bloco()).getByRole('alert')
    expect(alerta).toHaveTextContent('Não consegui salvar. Tente de novo.')
    // Junto do botão: o alerta vem logo depois de "Colocar em produção".
    expect(botao()!.compareDocumentPosition(alerta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('o pedido cancelado e a ordem do bloco (ENV-26, ENV-27)', () => {
  it('cancelado com material: a frase única, abaixo de um fio, no lugar das ações', async () => {
    responder(detalhe({ status: 'cancelled', payment_status: 'cancelled', material_status: 'material_recebido' }))
    await abrir()
    const frase = within(bloco()).getByText(
      'Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.',
    )
    expect(tokens(frase)).toEqual(expect.arrayContaining(['border-t', 'mt-3.5', 'pt-3', 'text-[13px]', 'text-estrelinha-ink-soft']))
    expect(within(bloco()).queryByRole('button', { name: 'Colocar em produção' })).toBeNull()
  })

  it('não cancelado: a frase não aparece', async () => {
    responder(AGUARDANDO())
    await abrir()
    expect(within(bloco()).queryByText(/Pedido cancelado, saiu da fila/)).toBeNull()
  })

  it('a ordem: passos → chips e idade → envelope → produção; e o lembrete por último', async () => {
    itens = { data: [item({ requires_material: true, material_kinds: ['cinzas'] })], error: null }
    responder(AGUARDANDO())
    await abrir()
    const passos = within(bloco()).getByRole('list', { name: 'Passos do material' })
    const chips = bloco().querySelector('[data-parte="materiais"]')!
    const lembrete = screen.getByTestId('lembrete-do-envio')
    const depois = (a: Element, b: Element) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    expect(depois(passos, chips)).toBe(true)
    expect(depois(chips, envelope())).toBe(true)
    expect(depois(envelope(), lembrete)).toBe(true)
    expect(bloco().contains(lembrete)).toBe(true)
  })

  it('recebido: o envelope vem antes de "Colocar em produção"', async () => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido' }))
    await abrir()
    const producao = within(bloco()).getByRole('button', { name: 'Colocar em produção' })
    expect(envelope().compareDocumentPosition(producao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------------------------
// T12 — salvar o código pela página real: a RPC, o aviso, a releitura e o histórico
// ---------------------------------------------------------------------------------------------

describe('registrar o código pela página (ENV-07, ENV-08, ENV-21)', () => {
  it('"Informar" → digitar → Salvar: UMA RPC `set_material_tracking`, o gatilho `material_tracking_set` e o aviso', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', () => {
      atual = A_CAMINHO({ material_tracking_code: 'AN123456789BR', material_tracking_set_at: '2026-10-23T14:29:00.000000+00:00', material_tracking_set_by: 'admin' })
      return { data: { ok: true, status: 'material_enviado', reason: null }, error: null }
    })
    fake.filaDeInvocacao(AVISO, { data: { sent: true }, error: null })
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    expect(screen.getByRole('dialog', { name: 'Código do envelope' })).toBeInTheDocument()
    fireEvent.change(campo(), { target: { value: 'an 123456789 br' } })
    await tocar(screen.getByRole('button', { name: 'Salvar' }))
    expect(fake.chamadasDe('set_material_tracking')).toEqual([
      { nome: 'set_material_tracking', args: [{ p_order_id: ID, p_code: 'AN123456789BR' }] },
    ])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect((fake.invocacoesDe(AVISO)[0].opcoes as { body: unknown }).body).toEqual({ order_id: ID, trigger: 'material_tracking_set' })
    // Nenhuma outra escrita: nem `update` em `orders`, nem a RPC do estado do material (a RPC já o move).
    expect(fake.escritasDe('orders')).toHaveLength(0)
    expect(fake.chamadasDe('set_material_status')).toEqual([])
    expect(folha()).toBeNull()
    expect(aviso()).toHaveTextContent('Código do envelope registrado.')
    expect(aviso()).toHaveTextContent('O pedido #0244 passou para "A caminho".')
    // Relido: o cartão do código, e o histórico com a linha do envelope.
    expect(within(envelope()).getByText('AN123456789BR')).toBeInTheDocument()
    expect(within(envelope()).getByText('Registrado por você há 1 min')).toBeInTheDocument()
    const historico = screen.getByRole('region', { name: 'Histórico' })
    expect(within(historico).getByText('Você registrou o rastreio do envelope · AN123456789BR')).toBeInTheDocument()
    expect(fake.esgotamentos()).toEqual([])
  })

  it('o histórico com a autoria da CLIENTE, na posição da data dela', async () => {
    responder(A_CAMINHO({ material_tracking_set_at: '2026-10-21T14:00:00.000000+00:00', material_tracking_set_by: 'customer' }))
    await abrir()
    const historico = screen.getByRole('region', { name: 'Histórico' })
    const linhas = within(historico).getAllByTestId('evento-do-historico').map((li) => li.textContent ?? '')
    // O status da fixtura é de 20/10; o envelope de 21/10 — o mais recente primeiro.
    expect(linhas[0]).toContain('Cliente informou o rastreio do envelope · QB987654321BR')
    expect(linhas.length).toBe(2)
  })

  it('sem `set_at` (linha anterior à migration): NENHUMA linha do envelope no histórico', async () => {
    responder(A_CAMINHO())
    await abrir()
    const historico = screen.getByRole('region', { name: 'Histórico' })
    expect(within(historico).queryByText(/rastreio do envelope/)).toBeNull()
  })

  it('salvar INVALIDA o pedido e o resumo da Início — o estado do cache, não a chamada (ENV-08)', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', () => {
      // A releitura fica no ar: o pedido continua invalidado enquanto ela não volta.
      fake.pendurarTabela('order_list')
      fake.pendurarRpc('store_overview')
      return { data: { ok: true, status: 'material_enviado', reason: null }, error: null }
    })
    fake.filaDeInvocacao(AVISO, { data: { sent: false }, error: null })
    await abrir()
    const cache = capturado.cliente!
    // O resumo (o selo da aba) é observado também no detalhe: a releitura dele fica no ar, como a do pedido.
    expect(cache.getQueryState(STORE_OVERVIEW_KEY)).toBeDefined()
    expect(cache.getQueryState(chaveDoPedido(ID))?.isInvalidated).toBe(false)
    expect(cache.getQueryState(STORE_OVERVIEW_KEY)?.isInvalidated).toBe(false)
    // A chave VIZINHA (outro pedido) existe ANTES de salvar — criada depois, ela nasceria válida nos
    // dois mundos e a asserção não mediria nada (conserto da rodada 1, precisão).
    const VIZINHO = chaveDoPedido('00000000-0000-4000-8000-000000000999')
    act(() => cache.setQueryData(VIZINHO, { vizinho: true }))
    expect(cache.getQueryState(VIZINHO)?.isInvalidated).toBe(false)
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await tocar(screen.getByRole('button', { name: 'Salvar' }))
    expect(fake.chamadasDe('set_material_tracking')).toHaveLength(1)
    expect(cache.getQueryState(chaveDoPedido(ID))?.isInvalidated).toBe(true)
    expect(cache.getQueryState(STORE_OVERVIEW_KEY)?.isInvalidated).toBe(true)
    // ... e não é tocada: a invalidação é do pedido, não do prefixo.
    expect(cache.getQueryState(VIZINHO)?.isInvalidated).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// Conserto da rodada 1 — a trava ao ABRIR (M34) e o voltar do Android na folha do envelope (ENV-12)
// ---------------------------------------------------------------------------------------------

describe('a folha do envelope e a ação do pedido (ENV-12)', () => {
  it('com a ação do rodapé no ar, "Informar código do envelope" NÃO abre a folha — a mesma trava (M34)', async () => {
    responder(AGUARDANDO())
    // "Recebi o material" fica pendurado: a ação do pedido está no ar.
    fake.pendurarRpc('set_material_status')
    await abrir()
    const rodape = screen.getByTestId('rodape-da-acao')
    await tocar(within(rodape).getByRole('button', { name: /Recebi o material/ }))
    expect(fake.chamadasDe('set_material_status')).toHaveLength(1)
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    expect(folha()).toBeNull()
    expect(fake.chamadasDe('set_material_tracking')).toEqual([])
  })

  it('com a ação no ar, "Alterar" também não abre a folha (M34)', async () => {
    responder(A_CAMINHO())
    fake.pendurarRpc('set_material_status')
    await abrir()
    const rodape = screen.getByTestId('rodape-da-acao')
    await tocar(within(rodape).getByRole('button', { name: /Recebi o material/ }))
    expect(fake.chamadasDe('set_material_status')).toHaveLength(1)
    await tocar(within(envelope()).getByRole('button', { name: 'Alterar o código do envelope' }))
    expect(folha()).toBeNull()
  })

  it('o par: sem ação no ar, "Informar" abre a folha', async () => {
    responder(AGUARDANDO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    expect(screen.getByRole('dialog', { name: 'Código do envelope' })).toBeInTheDocument()
  })

  it('o voltar do Android fecha a folha do envelope (`origem: material`) sem gravar e sem sair do pedido', async () => {
    responder(AGUARDANDO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    expect(screen.getByRole('dialog', { name: 'Código do envelope' })).toBeInTheDocument()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      window.history.back()
    })
    await andar(100)
    expect(folha()).toBeNull()
    expect(window.location.pathname).toBe(pedidoHref(ID))
    expect(envelope()).not.toBeNull()
    expect(fake.chamadasDe('set_material_tracking')).toEqual([])
    expect(fake.invocacoesDe(AVISO)).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// Fase 5 — os bugs do QA (2026-10-26), pela árvore real
// ---------------------------------------------------------------------------------------------

const REDE = { message: 'Failed to fetch' }
const rodape = () => screen.queryByTestId('rodape-da-acao')
const alertaDoRodape = () => (rodape() ? within(rodape()!).queryByRole('alert') : null)
const digitarESalvar = async (codigo: string) => {
  await tocar(within(envelope()).getByRole('button', { name: /^(Informar código do envelope|Alterar o código do envelope)$/ }))
  fireEvent.change(campo(), { target: { value: codigo } })
  await tocar(screen.getByRole('button', { name: 'Salvar' }))
}

describe('T16 — a rede cai no Salvar do envelope: "Tentar de novo" regrava e o aviso sai (BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou)', () => {
  it('a RPC gravou e a resposta se perdeu: a folha diz a falha com "Tentar de novo"; regravar manda o MESMO código e o gatilho sai', async () => {
    responder(AGUARDANDO())
    fake.filaRpc(
      'set_material_tracking',
      () => {
        // O servidor gravou; a resposta não chegou ao app.
        atual = A_CAMINHO({ material_tracking_code: 'GG111222333BR', material_tracking_set_at: '2026-10-23T14:29:00.000000+00:00', material_tracking_set_by: 'admin' })
        return { data: null, error: REDE }
      },
      { data: { ok: true, status: 'material_enviado', reason: null }, error: null },
    )
    fake.filaDeInvocacao(AVISO, { data: { sent: true }, error: null })
    await abrir()
    await digitarESalvar('GG111222333BR')
    const dialogo = folha()!
    expect(dialogo).not.toBeNull()
    const alerta = within(dialogo).getByRole('alert')
    expect(alerta).toHaveTextContent('Não consegui salvar. Tente de novo.')
    // V07 (rodada 2): com a folha aberta, o erro mora SÓ na folha — o bloco atrás dela não o repete.
    // `hidden: true` porque o Radix esconde o resto da página do leitor de tela com a folha aberta.
    expect(within(envelope()).queryByRole('alert', { hidden: true })).toBeNull()
    expect(screen.getAllByRole('alert', { hidden: true })).toHaveLength(1)
    expect(fake.invocacoesDe(AVISO)).toEqual([])
    // A releitura já trouxe o código gravado para o cartão (atrás da folha).
    expect(within(envelope()).getByText('GG111222333BR')).toBeInTheDocument()
    await tocar(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    expect(fake.chamadasDe('set_material_tracking')).toEqual([
      { nome: 'set_material_tracking', args: [{ p_order_id: ID, p_code: 'GG111222333BR' }] },
      { nome: 'set_material_tracking', args: [{ p_order_id: ID, p_code: 'GG111222333BR' }] },
    ])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect((fake.invocacoesDe(AVISO)[0].opcoes as { body: unknown }).body).toEqual({ order_id: ID, trigger: 'material_tracking_set' })
    expect(folha()).toBeNull()
    expect(aviso()).toHaveTextContent('Código do envelope registrado.')
    expect(screen.queryByText('Não consegui salvar. Tente de novo.')).toBeNull()
    expect(fake.esgotamentos()).toEqual([])
  })

  it('com a folha fechada ("Agora não"), o erro fica NO ENVELOPE, com "Tentar de novo" — que regrava o código digitado', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', { data: null, error: REDE }, () => {
      atual = A_CAMINHO({ material_tracking_code: 'GG111222333BR', material_tracking_set_at: '2026-10-23T14:29:00.000000+00:00', material_tracking_set_by: 'admin' })
      return { data: { ok: true, status: 'material_enviado', reason: null }, error: null }
    })
    fake.filaDeInvocacao(AVISO, { data: { sent: true }, error: null })
    await abrir()
    await digitarESalvar('GG111222333BR')
    await tocar(screen.getByRole('button', { name: 'Agora não' }))
    expect(folha()).toBeNull()
    const alerta = within(envelope()).getByRole('alert')
    expect(alerta).toHaveTextContent('Não consegui salvar. Tente de novo.')
    // O toque de verdade põe o foco no botão (o `fireEvent.click` do jsdom não o move).
    const tentar = within(alerta).getByRole('button', { name: 'Tentar de novo' })
    act(() => tentar.focus())
    await tocar(tentar)
    expect(fake.chamadasDe('set_material_tracking').map((c) => c.args)).toEqual([
      [{ p_order_id: ID, p_code: 'GG111222333BR' }],
      [{ p_order_id: ID, p_code: 'GG111222333BR' }],
    ])
    expect(fake.invocacoesDe(AVISO)).toHaveLength(1)
    expect(within(envelope()).queryByRole('alert')).toBeNull()
    expect(aviso()).toHaveTextContent('Código do envelope registrado.')
    // Reteste em navegador (2026-10-27): o "Tentar de novo" sai da tela com o sucesso, e o foco caía no
    // `<body>`. Vai ao título da página (o molde de D3/C03).
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })
})

describe('T17 — cada falha aparece junto da ação que falhou (BUG-20261026-erro-de-uma-acao-aparece-em-outra)', () => {
  it('"Recebi o material" falha ⇒ o alerta no rodapé; a folha do envelope abre SEM ele', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', { data: null, error: REDE })
    await abrir()
    await tocar(within(rodape()!).getByRole('button', { name: /Recebi o material/ }))
    expect(alertaDoRodape()).toHaveTextContent('Não consegui salvar. Tente de novo.')
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    expect(within(folha()!).queryByRole('alert')).toBeNull()
    expect(within(envelope()).queryByRole('alert')).toBeNull()
  })

  it('o código do envelope falha e ela toca "Agora não" ⇒ o rodapé NÃO mostra o erro do envelope', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', { data: null, error: REDE })
    await abrir()
    await digitarESalvar('FF33334444BR')
    await tocar(screen.getByRole('button', { name: 'Agora não' }))
    expect(alertaDoRodape()).toBeNull()
    expect(within(rodape()!).getByRole('button', { name: /Recebi o material/ })).toBeInTheDocument()
    expect(within(envelope()).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
  })

  it('o erro do envelope não aparece na folha do rastreio de SAÍDA ("Alterar o rastreio" da Entrega)', async () => {
    responder(A_CAMINHO({ status: 'shipped', tracking_code: 'AB123456789BR' }))
    fake.filaRpc('set_material_tracking', { data: null, error: REDE })
    await abrir()
    await digitarESalvar('FF33334444BR')
    await tocar(screen.getByRole('button', { name: 'Agora não' }))
    await tocar(screen.getByTestId('editar-rastreio'))
    expect(folha()).not.toBeNull()
    expect(within(folha()!).queryByRole('alert')).toBeNull()
  })

  it('a falha da primária depois da do envelope: o alerta vai ao rodapé e o envelope fica SEM alerta (o erro é um por pedido; a última ação é a dona)', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', { data: null, error: REDE })
    fake.filaRpc('set_material_status', { data: null, error: REDE })
    await abrir()
    await digitarESalvar('FF33334444BR')
    await tocar(screen.getByRole('button', { name: 'Agora não' }))
    await tocar(within(rodape()!).getByRole('button', { name: /Recebi o material/ }))
    // O erro é UM por pedido: a última ação é a dona dele. O envelope não mostra o do rodapé.
    expect(alertaDoRodape()).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(within(envelope()).queryByRole('alert')).toBeNull()
  })
})

describe('T18 — uma queda curta de rede não desmonta a tela (BUG-20261026-queda-curta-de-rede-apaga-o-codigo)', () => {
  const FRASE = 'Sem conexão. Os dados da loja aparecem quando a internet voltar.'
  let online = true
  const evento = async (e: 'online' | 'offline', ms: number) => {
    await act(async () => {
      online = e === 'online'
      window.dispatchEvent(new Event(e))
      await vi.advanceTimersByTimeAsync(ms)
    })
  }
  beforeEach(() => {
    online = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
  })

  it('1 s sem rede com a folha aberta e o código digitado: a folha, o digitado e o foco continuam', async () => {
    responder(AGUARDANDO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    fireEvent.change(campo(), { target: { value: 'FF33334444BR' } })
    act(() => campo().focus())
    await evento('offline', 1000)
    expect(screen.queryByText(FRASE)).toBeNull()
    await evento('online', 50)
    expect(screen.getByRole('dialog', { name: 'Código do envelope' })).toBeInTheDocument()
    expect(campo().value).toBe('FF33334444BR')
    expect(document.activeElement).toBe(campo())
    // E a carência não fica armada: muito depois, nada de "Sem conexão".
    await andar(10_000)
    expect(screen.queryByText(FRASE)).toBeNull()
    expect(campo().value).toBe('FF33334444BR')
  })

  it('4,9 s sem rede ainda é a tela; aos 5 s contínuos, "Sem conexão" — o comportamento da 72', async () => {
    responder(AGUARDANDO())
    await abrir()
    await tocar(within(envelope()).getByRole('button', { name: 'Informar código do envelope' }))
    await evento('offline', 4900)
    expect(screen.queryByText(FRASE)).toBeNull()
    expect(folha()).not.toBeNull()
    await andar(100)
    expect(screen.getByText(FRASE)).toBeInTheDocument()
    expect(folha()).toBeNull()
    await evento('online', 700)
  })
})

// ---------------------------------------------------------------------------------------------
// Conserto da rodada 2 do Verificador (2026-10-27)
// ---------------------------------------------------------------------------------------------

describe('V02 — o cartão da lista só mostra o erro das ações DELE (primária e rastreio de saída)', () => {
  // O erro mora em módulo e sobrevive à navegação: a falha do envelope (ou da produção) no detalhe,
  // seguida da volta à lista, não pode aparecer no cartão ao lado de "Recebi o material"/"Iniciar
  // separação". Montado SEM `doApp`, o "Voltar" do detalhe vai a `/pedidos` (E7) — a mesma árvore.
  const abrirSemDoApp = async () => {
    await montarApp(pedidoHref(ID))
    await andar(50)
  }
  const voltarALista = async () => {
    await tocar(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
  }
  const cartao = () => screen.getByTestId('acao-do-cartao')

  it('o envelope falha, "Agora não", volta à lista ⇒ o cartão do pedido sem `role="alert"`', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', { data: null, error: REDE })
    await abrirSemDoApp()
    await digitarESalvar('FF33334444BR')
    await tocar(screen.getByRole('button', { name: 'Agora não' }))
    expect(within(envelope()).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    await voltarALista()
    expect(within(cartao()).getByRole('button', { name: /^Recebi o material, / })).toBeInTheDocument()
    expect(within(cartao()).queryAllByRole('alert', { hidden: true })).toHaveLength(0)
    expect(screen.queryByText('Não consegui salvar. Tente de novo.')).toBeNull()
  })

  it('"Colocar em produção" falha, volta à lista ⇒ o cartão do pedido sem `role="alert"`', async () => {
    responder(detalhe({ status: 'paid', material_status: 'material_recebido' }))
    fake.filaRpc('set_material_status', { data: null, error: { message: 'boom', code: 'XX000' } })
    await abrirSemDoApp()
    await tocar(within(bloco()).getByRole('button', { name: 'Colocar em produção' }))
    expect(within(bloco()).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    await voltarALista()
    expect(within(cartao()).getByRole('button', { name: /, Pedido #0244/ })).toBeInTheDocument()
    expect(within(cartao()).queryAllByRole('alert', { hidden: true })).toHaveLength(0)
    expect(screen.queryByText('Não consegui salvar. Tente de novo.')).toBeNull()
  })

  it('o par: a falha da primária no RODAPÉ do detalhe segue com o pedido e aparece no cartão da lista', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', { data: null, error: REDE })
    await abrirSemDoApp()
    await tocar(within(rodape()!).getByRole('button', { name: /Recebi o material/ }))
    expect(alertaDoRodape()).toHaveTextContent('Não consegui salvar. Tente de novo.')
    await voltarALista()
    expect(within(cartao()).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
  })

  it('o par pelo CARTÃO: a primária tocada no cartão falha ⇒ o alerta no cartão', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_status', { data: null, error: REDE })
    await montarApp('/pedidos?visao=tudo')
    await andar(50)
    await tocar(within(cartao()).getByRole('button', { name: /^Recebi o material, / }))
    expect(fake.chamadasDe('set_material_status')).toHaveLength(1)
    expect(within(cartao()).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
  })
})

describe('gap 4 — a retentativa do envelope num pedido que deixou de ser editável', () => {
  it('"Agora não" depois da falha; o Realtime traz `material_recebido`; "Tentar de novo" ⇒ nenhuma RPC a mais e "Este pedido mudou enquanto você olhava."', async () => {
    responder(AGUARDANDO())
    fake.filaRpc('set_material_tracking', { data: null, error: REDE })
    fake.filaDeInvocacao(AVISO, { data: { sent: true }, error: null })
    await abrir()
    await digitarESalvar('FF33334444BR')
    await tocar(screen.getByRole('button', { name: 'Agora não' }))
    expect(within(envelope()).getByRole('alert')).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(fake.chamadasDe('set_material_tracking')).toHaveLength(1)

    atual = detalhe({ status: 'paid', material_status: 'material_recebido', material_tracking_code: 'QB987654321BR' })
    act(() => {
      fake.emitir('orders')
    })
    await andar(100)
    // A linha relida já não é editável: o "Informar"/"Alterar" saíram, mas o erro e o botão continuam.
    expect(within(envelope()).queryByRole('button', { name: /^(Informar código do envelope|Alterar o código do envelope)$/ })).toBeNull()
    const alerta = within(envelope()).getByRole('alert')
    const tentar = within(alerta).getByRole('button', { name: 'Tentar de novo' })
    act(() => tentar.focus())
    await tocar(tentar)

    expect(fake.chamadasDe('set_material_tracking')).toHaveLength(1)
    expect(fake.invocacoesDe(AVISO)).toEqual([])
    expect(within(envelope()).getByRole('alert')).toHaveTextContent('Este pedido mudou enquanto você olhava.')
    expect(within(envelope()).getByRole('alert')).not.toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(within(within(envelope()).getByRole('alert')).queryByRole('button', { name: 'Tentar de novo' })).toBeNull()
    expect(aviso()).toBeNull()
    // O "Tentar de novo" também sai aqui (o desfecho `mudou` não tem retentativa): o foco não fica no `<body>`.
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
  })
})
