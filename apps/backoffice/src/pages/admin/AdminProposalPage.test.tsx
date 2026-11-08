// A página da proposta pela PÁGINA REAL (feature 89, T18: `LNK-01`..`LNK-03`, `LNK-05`, `LNK-06`,
// `HIS-01`, `DUP-01`).
//
// Dublados: o `functions.invoke` do client (registrando ação e corpo), a origem da loja (env), a área
// de transferência, `window.open` e `window.confirm` (APIs do navegador). O resto — a página, o cartão
// do link, o histórico, os hooks do React Query e as regras de estado de `core` — é o real.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { estado } = vi.hoisted(() => ({
  estado: {
    invocar: (_nome: string, _corpo: Record<string, unknown>): unknown => ({ data: null, error: null }),
    invocacoes: [] as { nome: string; corpo: Record<string, unknown> }[],
    /** A observação do PEDIDO (`order_admin_notes`), como o banco a guardaria. */
    notaDoPedido: null as Record<string, unknown> | null,
    leiturasDaNota: [] as { table: string; filters: { method: string; args: unknown[] }[]; upsert?: unknown }[],
  },
}))

// A página da proposta não lê tabela nenhuma pelo PostgREST — a não ser a observação do PEDIDO, que
// o card do pedido (`OrderAdminNoteCard`) lê e grava sozinho quando a proposta já é pedido.
vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble((r) => {
    if (r.table !== 'order_admin_notes') throw new Error(`a página da proposta não lê ${r.table} pelo PostgREST`)
    estado.leiturasDaNota.push(r)
    if (r.upsert) {
      estado.notaDoPedido = { updated_by_name: null, ...(r.upsert.rows as object), updated_at: '2026-11-03T15:00:00.000Z' }
      return { data: [estado.notaDoPedido] }
    }
    return { data: estado.notaDoPedido }
  })
  return {
    supabase: {
      from: duble.from,
      functions: {
      invoke: async (nome: string, opcoes: { body: Record<string, unknown> }) => {
        estado.invocacoes.push({ nome, corpo: opcoes?.body })
        return estado.invocar(nome, opcoes?.body)
      },
    },
  },
  }
})
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ user: { id: 'u-admin', email: 'adri@exemplo.invalid' }, customer: { name: 'Adri Muniz' } }),
}))
vi.mock('@/shared/lib/storeOrigin', () => ({ storeOrigin: () => 'https://loja.exemplo.invalid', STORE_URL: undefined }))

import AdminProposalPage from './AdminProposalPage'
import { simularFocoDoNavegador } from '@/test/focoDoNavegador'
import { proposalRenewText } from '@estrelinha/core/proposals'
import {
  CANCEL_CONFIRM,
  LINK_CLOSED,
  LINK_EXPIRED,
  LINK_UNAVAILABLE,
  CANCELLED_ANNOUNCE,
  NO_PHONE,
  RENEWED_ANNOUNCE,
  RENEW_WARNING,
} from '@/features/order-proposal'

const ID = '99999999-9999-4999-8999-999999999999'
const PEDIDO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const EXPIRA = '2026-11-07T15:00:00Z'
const LINK = 'https://loja.exemplo.invalid/pedido-montado#tok-guardado'

const detalhe = (over: Record<string, unknown> = {}) => ({
  id: ID, number: 'P-0007', status: 'open', version: 2, expires_at: EXPIRA, viewed_at: null,
  order_id: null, order_number: null, customer_id: null, customer_name: 'Ana Souza Lima', customer_email: 'ana@x.invalid',
  customer_phone: '51999990000', customer_document: null,
  address_zip: null, address_street: null, address_number: null, address_complement: null,
  address_neighborhood: null, address_city: null, address_state: null,
  coupon_id: null, coupon_code: 'DEZ', coupon_discount: 18, coupon_free_shipping: false,
  manual_discount_kind: 'amount', manual_discount_value: 20, manual_discount_reason: 'Cliente antiga',
  manual_discount: 20, subtotal: 180, promotion_discount: 0, items_total: 142, admin_note: null,
  created_at: '2026-10-31T15:00:00Z', updated_at: '2026-10-31T15:00:00Z',
  items: [{
    position: 0, product_id: 'p1', variant_id: 'v1', product_name: 'Colar de Cinzas', product_image: null,
    variant_label: 'Prata', variant_options: null, quantity: 1, list_price: 180, unit_price: 180,
    engraving_text: 'Ana', requires_material: true, material_kinds: [],
  }],
  events: [
    { kind: 'created', channel: null, actor: '11111111-1111-4111-8111-111111111111', actor_email: 'adri@x.invalid', created_at: '2026-10-31T15:00:00Z' },
    { kind: 'link_sent', channel: 'whatsapp', actor: '11111111-1111-4111-8111-111111111111', actor_email: 'adri@x.invalid', created_at: '2026-10-31T16:00:00Z' },
    { kind: 'viewed', channel: null, actor: null, actor_email: null, created_at: '2026-10-31T17:00:00Z' },
  ],
  ...over,
})

let atual = { proposal: detalhe(), state: 'open' as string }
/** O token que o `get` devolve (só a function decide; `null` = sem cifra ou sem chave. */
let tokenDoGet: string | null = null
const servir = (proposal: Record<string, unknown>, state: string) => {
  atual = { proposal: proposal as ReturnType<typeof detalhe>, state }
}
const respostaDoGet = () => ({ data: { proposal: atual.proposal, state: atual.state, actions: {}, token: tokenDoGet }, error: null })

const falha = (corpo: Record<string, unknown>) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: { json: async () => corpo } },
})

let abrir: ReturnType<typeof vi.fn>
let copiar: ReturnType<typeof vi.fn>
let confirmar: ReturnType<typeof vi.fn>

beforeEach(() => {
  estado.invocacoes = []
  estado.notaDoPedido = null
  estado.leiturasDaNota = []
  servir(detalhe(), 'open')
  tokenDoGet = null
  estado.invocar = (nome) => {
    if (nome === 'order-proposals?action=get') return respostaDoGet()
    if (nome === 'order-proposals?action=log-sent') return { data: { ok: true }, error: null }
    return { data: null, error: null }
  }
  window.sessionStorage.clear()
  abrir = vi.fn()
  copiar = vi.fn().mockResolvedValue(undefined)
  confirmar = vi.fn().mockReturnValue(true)
  vi.spyOn(window, 'open').mockImplementation(abrir as never)
  vi.spyOn(window, 'confirm').mockImplementation(confirmar as never)
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copiar } })
})
afterEach(() => vi.restoreAllMocks())

let local = ''
const Onde = () => {
  local = useLocation().pathname + useLocation().search
  return null
}

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[`/admin/pedidos/montados/${ID}`]}>
        <Onde />
        <Routes>
          <Route path="/admin/pedidos/montados/:id" element={<AdminProposalPage />} />
          <Route path="*" element={<p>outra tela</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

/** A proposta aberta com a cifra do token: o `get` devolve o token e a página monta o link. */
const comLinkGuardado = () => {
  tokenDoGet = 'tok-guardado'
}
const acoes = () => estado.invocacoes.map((i) => i.nome.replace('order-proposals?action=', ''))

describe('O link e o envio (LNK-01..03)', () => {
  it('LNK-01: mostra o link completo, Copiar e WhatsApp quando há telefone válido', async () => {
    comLinkGuardado()
    montar()
    expect(await screen.findByTestId('link-da-proposta')).toHaveValue(LINK)
    expect(screen.getByRole('button', { name: /Copiar link/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Enviar pelo WhatsApp/ })).toBeEnabled()
    expect(screen.getByText('Vale até 07/11/2026.')).toBeInTheDocument()
  })

  it('LNK-01: sem telefone válido, a ação diz "Sem telefone — copie o link"', async () => {
    servir(detalhe({ customer_phone: '123' }), 'open')
    comLinkGuardado()
    montar()
    await screen.findByTestId('link-da-proposta')
    expect(screen.queryByRole('button', { name: /Enviar pelo WhatsApp/ })).toBeNull()
    expect(screen.getByRole('button', { name: NO_PHONE })).toBeDisabled()
    expect(NO_PHONE).toBe('Sem telefone — copie o link')
  })

  it('LNK-02 + LNK-03: o WhatsApp abre o wa.me com a mensagem da spec e registra o envio pelo canal', async () => {
    comLinkGuardado()
    montar()
    fireEvent.click(await screen.findByRole('button', { name: /Enviar pelo WhatsApp/ }))
    await waitFor(() => expect(acoes()).toContain('log-sent'))
    const [url, alvo] = abrir.mock.calls[0]
    expect(alvo).toBe('_blank')
    const u = new URL(url as string)
    expect(u.origin + u.pathname).toBe('https://wa.me/5551999990000')
    expect(u.searchParams.get('text')).toBe(
      `Oi, Ana! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a entrega e o pagamento:\n\n${LINK}\n\nO link vale até 07/11.`,
    )
    expect(estado.invocacoes.find((i) => i.nome.endsWith('log-sent'))?.corpo).toEqual({ id: ID, channel: 'whatsapp' })
  })

  it('LNK-03: copiar põe o link na área de transferência e registra "copy"; o histórico é relido', async () => {
    comLinkGuardado()
    montar()
    await screen.findByTestId('link-da-proposta')
    const getsAntes = acoes().filter((a) => a === 'get').length
    fireEvent.click(screen.getByRole('button', { name: /Copiar link/ }))
    await waitFor(() => expect(estado.invocacoes.find((i) => i.nome.endsWith('log-sent'))?.corpo).toEqual({ id: ID, channel: 'copy' }))
    expect(copiar).toHaveBeenCalledWith(LINK)
    expect(await screen.findByText('Link copiado.')).toBeInTheDocument()
    await waitFor(() => expect(acoes().filter((a) => a === 'get').length).toBeGreaterThan(getsAntes))
  })

  it('cópia que falha não registra envio', async () => {
    copiar.mockRejectedValueOnce(new Error('negado'))
    comLinkGuardado()
    montar()
    fireEvent.click(await screen.findByRole('button', { name: /Copiar link/ }))
    expect(await screen.findByText('Não consegui copiar. Selecione o link e copie à mão.')).toBeInTheDocument()
    expect(acoes()).not.toContain('log-sent')
  })

  it('reaberta, o link vem do `get` — sem "Gerar link novo" e sem nada guardado no navegador', async () => {
    comLinkGuardado()
    montar()
    expect(await screen.findByTestId('link-da-proposta')).toHaveValue(LINK)
    expect(screen.queryByRole('button', { name: 'Gerar link novo' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Renovar/ })).toBeNull()
    expect(screen.queryByText(LINK_UNAVAILABLE)).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
    expect(window.localStorage.length).toBe(0)
  })

  it('o campo do link é só leitura e seleciona tudo ao focar; a mensagem do WhatsApp aparece escrita', async () => {
    comLinkGuardado()
    montar()
    const campo = (await screen.findByTestId('link-da-proposta')) as HTMLInputElement
    expect(campo).toHaveAttribute('readonly')
    fireEvent.focus(campo)
    expect(campo.selectionStart).toBe(0)
    expect(campo.selectionEnd).toBe(LINK.length)
    expect(screen.getByText('Mensagem do WhatsApp')).toBeInTheDocument()
    expect(screen.getByTestId('mensagem-do-whatsapp').textContent).toBe(
      `Oi, Ana! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a entrega e o pagamento:\n\n${LINK}\n\nO link vale até 07/11.`,
    )
  })

  it('sem token no `get` (sem cifra): diz por quê e oferece "Gerar link novo" (= renovar), que avisa do link antigo', async () => {
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=renew')
        return { data: { id: ID, number: 'P-0007', version: 3, token: 'tok-novo', expires_at: EXPIRA, repriced: false, summary: {} }, error: null }
      return respostaDoGet()
    }
    montar()
    expect(await screen.findByText(LINK_UNAVAILABLE)).toBeInTheDocument()
    expect(screen.queryByTestId('link-da-proposta')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Gerar link novo' }))
    expect(confirmar).toHaveBeenCalledWith(RENEW_WARNING)
    expect(await screen.findByTestId('link-da-proposta')).toHaveValue('https://loja.exemplo.invalid/pedido-montado#tok-novo')
    expect(estado.invocacoes.find((i) => i.nome.endsWith('renew'))?.corpo).toEqual({ id: ID })
  })

  it('recusar a confirmação de renovar não chama a function', async () => {
    confirmar.mockReturnValue(false)
    montar()
    fireEvent.click(await screen.findByRole('button', { name: 'Gerar link novo' }))
    expect(acoes()).not.toContain('renew')
  })
})

describe('As ações por estado (LNK-05, LNK-06, DUP-01)', () => {
  it('aberta com o link: Editar, Duplicar e Cancelar — Renovar só depois de expirar, e a dica saiu', async () => {
    comLinkGuardado()
    montar()
    expect(await screen.findByTestId('estado-da-proposta')).toHaveTextContent('Aberta')
    expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `/admin/pedidos/montar/${ID}`)
    expect(screen.getByRole('link', { name: 'Duplicar' })).toHaveAttribute('href', `/admin/pedidos/montar?duplicar=${ID}`)
    expect(screen.getByRole('button', { name: 'Cancelar proposta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Renovar/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gerar link novo' })).toBeNull()
    expect(screen.queryByText(RENEW_WARNING)).toBeNull()
    expect(screen.queryByText(/Precisa de mais tempo/)).toBeNull()
    expect(screen.queryByRole('link', { name: /Ver o pedido/ })).toBeNull()
  })

  it('vista pela cliente continua aberta, com o rótulo próprio', async () => {
    servir(detalhe({ viewed_at: '2026-10-31T17:00:00Z' }), 'viewed')
    montar()
    expect(await screen.findByTestId('estado-da-proposta')).toHaveTextContent('Aberta — vista pela cliente')
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
  })

  it('LNK-06: expirada não edita nem cancela, e oferece "Renovar prazo" com o link morto', async () => {
    servir(detalhe(), 'expired')
    comLinkGuardado()
    montar()
    expect(await screen.findByTestId('estado-da-proposta')).toHaveTextContent('Expirada')
    expect(screen.queryByRole('link', { name: 'Editar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancelar proposta' })).toBeNull()
    // O link guardado de antes não é oferecido: ele venceu.
    expect(screen.queryByTestId('link-da-proposta')).toBeNull()
    expect(screen.getByText(LINK_EXPIRED)).toBeInTheDocument()
    expect(screen.getByText('Venceu em 07/11/2026.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renovar prazo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gerar link novo' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Duplicar' })).toBeInTheDocument()
  })

  it('LNK-06: renovar com preços mudados mostra o total relido e só renova com ele confirmado', async () => {
    servir(detalhe(), 'expired')
    let renews = 0
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=renew') {
        renews += 1
        if (renews === 1)
          return falha({ error: 'Os preços mudaram enquanto você montava. Confira o resumo.', code: 'prices_changed', summary: { items_total: 150 } })
        return { data: { id: ID, number: 'P-0007', version: 3, token: 'tok-r', expires_at: EXPIRA, repriced: true, summary: {} }, error: null }
      }
      return respostaDoGet()
    }
    montar()
    fireEvent.click(await screen.findByRole('button', { name: 'Renovar prazo' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Os preços mudaram enquanto você montava.')
    fireEvent.click(screen.getByRole('button', { name: /Renovar com o total de R\$\s?150,00/ }))
    await waitFor(() => expect(renews).toBe(2))
    expect(estado.invocacoes.filter((i) => i.nome.endsWith('renew'))[1].corpo).toEqual({ id: ID, expected_total: 150 })
  })

  it('renovar a expirada confirma com a frase nova e passa a mostrar o link novo', async () => {
    servir(detalhe({ expires_at: '2026-10-31T15:00:00Z' }), 'expired')
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=renew') {
        servir(detalhe({ expires_at: EXPIRA }), 'open')
        tokenDoGet = 'tok-renovado'
        return { data: { id: ID, number: 'P-0007', version: 3, token: 'tok-renovado', expires_at: EXPIRA, repriced: false, summary: {} }, error: null }
      }
      return respostaDoGet()
    }
    montar()
    fireEvent.click(await screen.findByRole('button', { name: 'Renovar prazo' }))
    const frase = confirmar.mock.calls[0][0] as string
    expect(frase).toBe(proposalRenewText({ name: 'Ana Souza Lima', expiresAt: '2026-10-31T15:00:00Z', now: new Date() }))
    expect(frase).toMatch(/^O link venceu em 31\/10\. Os preços são conferidos de novo e sai um link novo, que vale até \d{2}\/\d{2}\. Mande o novo para Ana\.$/)
    expect(await screen.findByTestId('link-da-proposta')).toHaveValue('https://loja.exemplo.invalid/pedido-montado#tok-renovado')
    expect(estado.invocacoes.find((i) => i.nome.endsWith('renew'))?.corpo).toEqual({ id: ID })
  })

  it('concluída: leva ao pedido, sem editar, renovar nem cancelar', async () => {
    servir(detalhe({ status: 'completed', order_id: PEDIDO, order_number: '0244' }), 'completed')
    comLinkGuardado()
    montar()
    expect(await screen.findByTestId('estado-da-proposta')).toHaveTextContent('Concluída')
    expect(screen.getByRole('link', { name: 'Ver o pedido #0244' })).toHaveAttribute('href', `/admin/pedidos/${PEDIDO}`)
    expect(screen.getByText(LINK_CLOSED)).toBeInTheDocument()
    for (const nome of ['Editar']) expect(screen.queryByRole('link', { name: nome })).toBeNull()
    for (const nome of [/Renovar/, 'Cancelar proposta', /Copiar link/, 'Gerar link novo']) expect(screen.queryByRole('button', { name: nome })).toBeNull()
    expect(screen.getByRole('link', { name: 'Duplicar' })).toBeInTheDocument()
  })

  it('cancelada: só duplicar', async () => {
    servir(detalhe({ status: 'cancelled' }), 'cancelled')
    montar()
    expect(await screen.findByTestId('estado-da-proposta')).toHaveTextContent('Cancelada')
    expect(screen.getAllByRole('link').map((l) => l.textContent)).toEqual(['Duplicar'])
    expect(screen.queryByRole('button', { name: /Renovar|Cancelar proposta|Copiar|Gerar/ })).toBeNull()
  })

  it('LNK-05: cancelar confirma com o efeito escrito, chama a function e esquece o link', async () => {
    comLinkGuardado()
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=cancel') {
        servir(detalhe({ status: 'cancelled' }), 'cancelled')
        return { data: { id: ID }, error: null }
      }
      return respostaDoGet()
    }
    montar()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar proposta' }))
    expect(confirmar).toHaveBeenCalledWith(CANCEL_CONFIRM)
    expect(await screen.findByText('Cancelada', { selector: '[data-testid="estado-da-proposta"]' })).toBeInTheDocument()
    expect(estado.invocacoes.find((i) => i.nome.endsWith('cancel'))?.corpo).toEqual({ id: ID })
    expect(screen.queryByTestId('link-da-proposta')).toBeNull()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('a falha de uma ação diz a frase do servidor', async () => {
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=cancel'
        ? falha({ error: 'A proposta já foi concluída.' })
        : respostaDoGet()
    montar()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar proposta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A proposta já foi concluída.')
  })
})

describe('Histórico e leitura (HIS-01)', () => {
  it('HIS-01: o histórico mostra cada evento com data e autor, o mais recente em cima', async () => {
    montar()
    const lista = await screen.findByRole('list', { name: 'Histórico da proposta' })
    const itens = within(lista).getAllByRole('listitem')
    expect(itens.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Vista pela cliente'),
      expect.stringContaining('Link enviado · pelo WhatsApp'),
      expect.stringContaining('Criada'),
    ])
    expect(itens[2]).toHaveTextContent('31/10/2026')
    expect(itens[2]).toHaveTextContent('adri@x.invalid')
    // O autor é o e-mail que a function resolve; o uuid de `actor` nunca chega à tela (achado da
    // prova em navegador da T27).
    expect(lista).not.toHaveTextContent('11111111-1111-4111-8111-111111111111')
  })

  it('HIS-01: autor sem e-mail resolvido (conta removida) não mostra o uuid no lugar', async () => {
    servir(
      detalhe({
        events: [{ kind: 'created', channel: null, actor: '22222222-2222-4222-8222-222222222222', actor_email: null, created_at: '2026-10-31T15:00:00Z' }],
      }),
      'open',
    )
    montar()
    const lista = await screen.findByRole('list', { name: 'Histórico da proposta' })
    expect(lista).toHaveTextContent('Criada')
    expect(lista).not.toHaveTextContent('22222222')
  })

  // Prova em navegador da T27: em 390 com a fonte a 200 %, a linha do desconto combinado (rótulo
  // com o motivo + valor) e o e-mail do autor no histórico passavam da tela. A linha embrulha (o valor
  // desce) e o e-mail quebra no meio. jsdom não mede: a régua é o token.
  it('a linha do desconto combinado embrulha e o autor do histórico quebra (token exato)', async () => {
    montar()
    const t = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
    const linha = (await screen.findByText('Desconto combinado — Cliente antiga')).parentElement!
    expect(t(linha)).toContain('flex-wrap')
    const lista = screen.getByRole('list', { name: 'Histórico da proposta' })
    const autor = within(lista).getAllByText(/adri@x\.invalid/)[0]
    expect(t(autor)).toContain('[overflow-wrap:anywhere]')
    expect(t(autor)).toContain('min-w-0')
  })

  it('o resumo mostra o desconto combinado COM o motivo (só no painel)', async () => {
    montar()
    expect(await screen.findByText('Desconto combinado — Cliente antiga')).toBeInTheDocument()
  })

  it('falha de leitura não desenha a proposta: diz e oferece tentar de novo', async () => {
    estado.invocar = () => falha({ error: 'Proposta não encontrada.' })
    montar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Proposta não encontrada.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByTestId('estado-da-proposta')).toBeNull()
  })

  it('voltar leva à lista "Pedidos montados" (o item da sidebar)', async () => {
    montar()
    await screen.findByTestId('estado-da-proposta')
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: /Voltar/ })[0])
    })
    expect(local).toBe('/admin/pedidos/montados')
  })
})

// Conserto do QA da 89 (2026-10-31).
describe('QA 89 — a 390 com fonte grande e pelo teclado', () => {
  // BUG-20261031-sem-telefone-rola-de-lado-com-fonte-200: o botão "Sem telefone — copie o link" não
  // quebrava linha (o `whitespace-nowrap` do botão do design system) e a página rolava de lado.
  it('"Sem telefone — copie o link" quebra linha e não passa da largura (token exato)', async () => {
    servir(detalhe({ customer_phone: null }), 'open')
    comLinkGuardado()
    montar()
    const botao = await screen.findByRole('button', { name: NO_PHONE })
    const t = (botao.getAttribute('class') ?? '').split(/\s+/)
    for (const token of ['whitespace-normal', 'h-auto', 'min-w-0', 'max-w-full', 'text-left']) expect(t).toContain(token)
    expect(t).not.toContain('whitespace-nowrap')
  })

  // BUG-20261031-foco-cai-no-body-ao-renovar-ou-cancelar-proposta.
  describe('o foco e o anúncio depois de renovar ou cancelar', () => {
    let soltar: () => void
    beforeEach(() => {
      soltar = simularFocoDoNavegador()
    })
    afterEach(() => soltar())
    const regiao = () => document.querySelector('[data-testid="anuncio-da-proposta"]')!

    it('renovar leva o foco ao link novo e anuncia que o antigo deixou de valer', async () => {
      comLinkGuardado()
      estado.invocar = (nome) => {
        if (nome === 'order-proposals?action=renew')
          return { data: { id: ID, number: 'P-0007', version: 3, token: 'tok-novo', expires_at: EXPIRA, repriced: false, summary: {} }, error: null }
        return respostaDoGet()
      }
      tokenDoGet = null
      montar()
      const botao = await screen.findByRole('button', { name: 'Gerar link novo' })
      botao.focus()
      fireEvent.click(botao)
      await waitFor(() => expect(document.activeElement).toHaveValue('https://loja.exemplo.invalid/pedido-montado#tok-novo'))
      expect(document.activeElement).toBe(screen.getByTestId('link-da-proposta'))
      expect(regiao()).toHaveAttribute('aria-live', 'polite')
      expect(regiao()).toHaveTextContent(RENEWED_ANNOUNCE)
      expect(RENEWED_ANNOUNCE).toBe('Link novo gerado. O link antigo parou de funcionar.')
    })

    it('cancelar leva o foco ao título da página e anuncia que a proposta foi cancelada', async () => {
      comLinkGuardado()
      estado.invocar = (nome) => {
        if (nome === 'order-proposals?action=cancel') {
          servir(detalhe({ status: 'cancelled' }), 'cancelled')
          return { data: { id: ID }, error: null }
        }
        return respostaDoGet()
      }
      montar()
      const botao = await screen.findByRole('button', { name: 'Cancelar proposta' })
      botao.focus()
      fireEvent.click(botao)
      await screen.findByText('Cancelada', { selector: '[data-testid="estado-da-proposta"]' })
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })))
      expect(regiao()).toHaveTextContent(CANCELLED_ANNOUNCE)
      expect(CANCELLED_ANNOUNCE).toBe('Proposta cancelada.')
    })

    it('a falha de cancelar devolve o foco ao botão, e o motivo está no alerta', async () => {
      estado.invocar = (nome) =>
        nome === 'order-proposals?action=cancel'
          ? falha({ error: 'A proposta já foi concluída.' })
          : respostaDoGet()
      montar()
      const botao = await screen.findByRole('button', { name: 'Cancelar proposta' })
      botao.focus()
      fireEvent.click(botao)
      expect(await screen.findByRole('alert')).toHaveTextContent('A proposta já foi concluída.')
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar proposta' })))
      expect(regiao()).toHaveTextContent('')
    })
  })
})

// ---------------------------------------------------------------------------------------------
// A observação: editável em qualquer status, e a do pedido depois da conclusão
// ---------------------------------------------------------------------------------------------

describe('A observação', () => {
  const notas = () => estado.invocacoes.filter((i) => i.nome === 'order-proposals?action=note')
  const servirNota = () => {
    estado.invocar = (nome, corpo) => {
      if (nome === 'order-proposals?action=note') {
        servir({ ...atual.proposal, admin_note: corpo.admin_note }, atual.state)
        return { data: { id: ID, admin_note: corpo.admin_note }, error: null }
      }
      return respostaDoGet()
    }
  }

  it.each([
    ['expirada', { expires_at: '2026-10-01T00:00:00Z' }, 'expired'],
    ['cancelada', { status: 'cancelled' }, 'cancelled'],
    ['aberta', {}, 'open'],
  ])('%s: o card edita pela ação `note` (nunca `save`), e a versão não entra no corpo', async (_n, over, state) => {
    servir(detalhe({ ...over, admin_note: 'Ligar antes' }), state)
    servirNota()
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    expect(campo).toHaveValue('Ligar antes')
    expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeDisabled()
    fireEvent.change(campo, { target: { value: '  Ligar antes de postar  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    await waitFor(() => expect(notas()).toHaveLength(1))
    expect(notas()[0].corpo).toEqual({ id: ID, admin_note: 'Ligar antes de postar' })
    expect(acoes()).not.toContain('save')
    // O campo segue montado (gravar não pisca) e fica com o texto gravado; o botão volta a desabilitar.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeDisabled())
    expect(screen.getByRole('textbox', { name: 'Observação' })).toHaveValue('Ligar antes de postar')
    // A proposta não concluída nunca toca a observação do pedido.
    expect(estado.leiturasDaNota).toEqual([])
  })

  it('apagar manda null; a recusa do servidor aparece no alerta e o texto fica', async () => {
    servir(detalhe({ status: 'cancelled', admin_note: 'Ligar antes' }), 'cancelled')
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=note'
        ? falha({ error: 'Esta proposta já virou pedido: a observação agora é a do pedido.', code: 'completed' })
        : respostaDoGet()
    montar()
    fireEvent.change(await screen.findByRole('textbox', { name: 'Observação' }), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    await waitFor(() => expect(notas()).toHaveLength(1))
    expect(notas()[0].corpo).toEqual({ id: ID, admin_note: null })
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta proposta já virou pedido: a observação agora é a do pedido.')
    expect(screen.getByRole('textbox', { name: 'Observação' })).toHaveValue('   ')
  })

  it('acima do teto, o Salvar fica desabilitado com a frase de core, e nada vai à function', async () => {
    montar()
    fireEvent.change(await screen.findByRole('textbox', { name: 'Observação' }), { target: { value: 'a'.repeat(1001) } })
    expect(screen.getByText('A observação vai até 1000 caracteres.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar observação' })).toBeDisabled()
    expect(notas()).toEqual([])
  })

  it('concluída mostra e edita a observação do PEDIDO — a da proposta, congelada, não aparece', async () => {
    estado.notaDoPedido = {
      order_id: PEDIDO, note: 'Nota que veio da proposta', updated_by: 'u-admin', updated_by_name: null,
      updated_at: '2026-11-02T15:00:00.000Z',
    }
    servir(detalhe({ status: 'completed', order_id: PEDIDO, order_number: '0244', admin_note: 'Texto congelado da proposta' }), 'completed')
    montar()
    const campo = await screen.findByRole('textbox', { name: 'Observação' })
    await waitFor(() => expect(campo).toHaveValue('Nota que veio da proposta'))
    expect(screen.queryByDisplayValue('Texto congelado da proposta')).toBeNull()
    // A leitura é a do pedido certo.
    expect(estado.leiturasDaNota[0].filters).toContainEqual({ method: 'eq', args: ['order_id', PEDIDO] })

    fireEvent.change(campo, { target: { value: 'Nota editada no pedido' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
    await waitFor(() => expect(estado.leiturasDaNota.some((r) => r.upsert)).toBe(true))
    const gravacao = estado.leiturasDaNota.find((r) => r.upsert)!
    expect(gravacao.upsert).toMatchObject({ rows: { order_id: PEDIDO, note: 'Nota editada no pedido' } })
    // A proposta concluída nunca chama a ação `note` (o servidor a recusaria).
    expect(notas()).toEqual([])
  })
})
