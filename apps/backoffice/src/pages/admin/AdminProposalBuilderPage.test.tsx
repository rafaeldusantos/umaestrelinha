// A montagem pela PÁGINA REAL (feature 89, T17: `MON-01`, `MON-11`, `MON-12`, `PRC-02`, `DUP-01`).
//
// Dublados só as fronteiras: o client do Supabase (`from` com o dublê que enxerga tabela e filtro, e
// `functions.invoke` registrando ação e corpo), `validateCoupon` (regra da loja, provada em `core`),
// as configurações da loja, o CEP (rede de terceiro) e a origem da loja (env). A página, as seções, os
// hooks de `entities/*`, o rascunho e as contas de `core` são os reais — e o destino depois de "Criar
// link" é a página REAL da proposta, para "abre a página da proposta" ser provado e não suposto.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

const { estado } = vi.hoisted(() => ({
  estado: {
    responder: (_r: unknown): unknown => ({ data: [] }),
    calls: [] as unknown[],
    invocar: (_nome: string, _corpo: Record<string, unknown>): unknown => ({ data: null, error: null }),
    invocacoes: [] as { nome: string; corpo: Record<string, unknown> }[],
    precoDoAnel: 90,
    imagemDoAnel: null as string | null,
    origem: 'https://loja.exemplo.invalid' as string | null,
  },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble((r) => estado.responder(r) as Resposta)
  estado.calls = duble.calls
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

vi.mock('@estrelinha/core/hooks/useCoupons', () => ({ validateCoupon: vi.fn() }))
vi.mock('@estrelinha/core/hooks/useCepLookup', () => ({ useCepLookup: () => ({ data: undefined }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => ({ pickup_enabled: false }),
  useMaterialSettings: () => ({}),
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5 }),
}))
vi.mock('@/shared/lib/storeOrigin', () => ({ storeOrigin: () => estado.origem, STORE_URL: undefined }))

import AdminProposalBuilderPage from './AdminProposalBuilderPage'
import AdminProposalPage from './AdminProposalPage'
import { NO_ITEMS, NOT_EDITABLE, SAVE_FAILED, VERSION_CONFLICT_TEXT } from '@/features/order-proposal'
import { PROPOSAL_LINK_DAYS } from '@estrelinha/core/proposals'

const PRICES_CHANGED = 'Os preços mudaram enquanto você montava. Confira o resumo.'
const ANEL_ID = '22222222-2222-4222-8222-222222222222'
const FICHA = '11111111-1111-4111-8111-111111111111'
const PROPOSTA = '99999999-9999-4999-8999-999999999999'
const EXPIRA = '2026-11-07T15:00:00Z'

const anel = () => ({
  id: ANEL_ID, name: 'Anel Simples', base_price: estado.precoDoAnel, image_url: estado.imagemDoAnel, is_active: true, stock_policy: 'track',
  stock_total: 3, requires_material: false, engraving_max_chars: null, options: [],
  weight_kg: 0.03, width_cm: null, height_cm: null, length_cm: null,
})
const POOL = [{ id: ANEL_ID, name: 'Anel Simples', slug: 'anel', is_active: true, base_price: 90 }]

const resumo = (total: number) => ({
  subtotal: total, promotion_discount: 0, coupon_discount: 0, coupon_applied: false,
  coupon_free_shipping: false, coupon_discarded: false, manual_discount: 0, items_total: total,
})

const detalhe = (over: Record<string, unknown> = {}) => ({
  id: PROPOSTA, number: 'P-0007', status: 'open', version: 3, expires_at: EXPIRA, viewed_at: null,
  order_id: null, order_number: null, customer_id: FICHA, customer_name: 'Ana Souza', customer_email: 'ana@x.invalid',
  customer_phone: '51999990000', customer_document: null,
  address_zip: null, address_street: null, address_number: null, address_complement: null,
  address_neighborhood: null, address_city: null, address_state: null,
  coupon_id: null, coupon_code: null, coupon_discount: 0, coupon_free_shipping: false,
  manual_discount_kind: 'amount', manual_discount_value: 10, manual_discount_reason: 'Cliente antiga',
  manual_discount: 10, subtotal: 90, promotion_discount: 0, items_total: 80, admin_note: null,
  created_at: '2026-10-31T15:00:00Z', updated_at: '2026-10-31T15:00:00Z',
  items: [{
    position: 0, product_id: ANEL_ID, variant_id: null, product_name: 'Anel Simples', product_image: null,
    variant_label: null, variant_options: null, quantity: 2, list_price: 90, unit_price: 90,
    engraving_text: null, requires_material: false, material_kinds: [],
  }],
  events: [{ kind: 'created', channel: null, actor: 'adri@x.invalid', created_at: '2026-10-31T15:00:00Z' }],
  ...over,
})

const falha = (status: number, corpo: Record<string, unknown>) => ({
  data: null,
  error: { message: 'Edge Function returned a non-2xx status code', context: { status, json: async () => corpo } },
})

const respostasPadrao = (r: unknown) => {
  const reg = r as Registro
  if (reg.table === 'products') {
    if ((reg.select?.[1] as { head?: boolean } | undefined)?.head) return { count: POOL.length }
    const id = reg.filters.find((f) => f.method === 'eq')?.args[1]
    if (id === ANEL_ID) return { data: anel() }
    return { data: POOL }
  }
  return { data: [] }
}

beforeEach(() => {
  estado.invocacoes = []
  estado.precoDoAnel = 90
  estado.imagemDoAnel = null
  estado.origem = 'https://loja.exemplo.invalid'
  estado.responder = respostasPadrao
  estado.invocar = (nome) => {
    if (nome === 'order-proposals?action=get') return { data: { proposal: detalhe(), state: 'open', actions: {} }, error: null }
    return { data: null, error: null }
  }
  try {
    window.sessionStorage.clear()
  } catch {
    // sem armazenamento
  }
})

const montar = (rota: string) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[rota]}>
        <Routes>
          <Route path="/admin/pedidos/montar" element={<AdminProposalBuilderPage />} />
          <Route path="/admin/pedidos/montar/:id" element={<AdminProposalBuilderPage />} />
          <Route path="/admin/pedidos/montados/:id" element={<AdminProposalPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const botaoCriar = () => screen.getByRole('button', { name: 'Criar link do pedido' })

/** A cliente nova só entra no rascunho em "Usar estes dados" (o desenho do protótipo). */
const preencherClienteNova = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Cliente nova' }))
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Carla Dias' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'carla@x.invalid' } })
  fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '51988887777' } })
  const usar = screen.getByRole('button', { name: 'Usar estes dados' })
  await waitFor(() => expect(usar).toBeEnabled())
  fireEvent.click(usar)
  await screen.findByTestId('cliente-escolhida')
}

/** A caixa "Acrescentar peça": buscar → escolher a peça → "Acrescentar · R$ X" (o anel não tem grade). */
const acrescentarAnel = async () => {
  fireEvent.change(screen.getByLabelText('Buscar peça'), { target: { value: 'anel' } })
  fireEvent.click(await screen.findByText('Anel Simples', { selector: 'button *, button' }))
  const acrescentar = await screen.findByRole('button', { name: /^Acrescentar · R\$\s?90,00$/ })
  fireEvent.click(acrescentar)
  await waitFor(() => expect(screen.getByTestId('resumo-total')).toHaveTextContent(/R\$\s?90,00/))
}

const saves = () => estado.invocacoes.filter((i) => i.nome === 'order-proposals?action=save')

describe('Montar pedido — do zero (MON-11, MON-12)', () => {
  it('MON-12: sem cliente nem peça, "Criar link" fica desabilitado com o motivo ESCRITO ao lado', async () => {
    montar('/admin/pedidos/montar')
    expect(botaoCriar()).toBeDisabled()
    expect(screen.getByTestId('motivo-criar-link')).toHaveTextContent('Escolha a cliente ou cadastre uma nova.')
    expect(botaoCriar()).toHaveAttribute('aria-describedby', screen.getByTestId('motivo-criar-link').id)

    await preencherClienteNova()
    expect(screen.getByTestId('motivo-criar-link')).toHaveTextContent(NO_ITEMS)
    expect(screen.queryByText(/Os preços ficam travados/)).toBeNull()
    expect(botaoCriar()).toBeDisabled()
  })

  it('MON-12: o endereço é opcional — com cliente e peça o botão libera sem CEP', async () => {
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    expect(botaoCriar()).toBeEnabled()
    expect(screen.queryByTestId('motivo-criar-link')).toBeNull()
    // Sem motivo, a frase sob o botão diz quanto tempo o preço fica travado (PROPOSAL_LINK_DAYS).
    expect(screen.getByText(`Os preços ficam travados por ${PROPOSAL_LINK_DAYS} dias.`)).toBeInTheDocument()
    expect(PROPOSAL_LINK_DAYS).toBe(7)
  })

  it('MON-11: grava pela function (nunca PostgREST), com o total que a tela mostrou, e abre a página da proposta com o link', async () => {
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=save')
        return {
          data: {
            id: PROPOSTA, number: 'P-0007', version: 1, status: 'open', customer_id: FICHA, created: true,
            changed: true, reused: false, token: 'tok-abc', expires_at: EXPIRA, summary: resumo(90),
          },
          error: null,
        }
      if (nome === 'order-proposals?action=get')
        return { data: { proposal: detalhe({ version: 1, manual_discount: 0, items_total: 90 }), state: 'open', actions: {} }, error: null }
      return { data: null, error: null }
    }
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    fireEvent.click(botaoCriar())

    await screen.findByRole('heading', { name: 'Pedido montado P-0007' })
    expect(saves()).toHaveLength(1)
    const corpo = saves()[0].corpo
    expect(corpo).toMatchObject({
      customer_id: null,
      customer_name: 'Carla Dias',
      customer_email: 'carla@x.invalid',
      customer_phone: '51988887777',
      lines: [{ product_id: ANEL_ID, variant_id: null, quantity: 1, engraving_text: null }],
      coupon_code: null,
      manual_discount: null,
      expected_total: 90,
    })
    expect(typeof corpo.idempotency_key).toBe('string')
    expect(corpo).not.toHaveProperty('id')
    // Igualdade de chaves: os campos de TELA (`image_url`, `stock_cap`, `perfil`, `key`…) nunca chegam
    // à function — nem no topo, nem nas linhas.
    expect(Object.keys(corpo).sort()).toEqual(
      [
        'address_city', 'address_complement', 'address_neighborhood', 'address_number', 'address_state',
        'address_street', 'address_zip', 'coupon_code', 'customer_document', 'customer_email', 'customer_id',
        'customer_name', 'customer_phone', 'expected_total', 'idempotency_key', 'lines', 'manual_discount',
        'admin_note', 'save_address',
      ].sort(),
    )
    const linhas = corpo.lines as Record<string, unknown>[]
    expect(Object.keys(linhas[0]).sort()).toEqual(['engraving_text', 'product_id', 'quantity', 'variant_id'])
    // Nenhuma escrita PostgREST nas tabelas da proposta.
    const escritas = (estado.calls as Registro[]).filter((c) => c.upsert || c.insert || c.update || c.delete)
    expect(escritas).toHaveLength(0)
    expect((estado.calls as Registro[]).some((c) => c.table.startsWith('order_proposal'))).toBe(false)
    // O link nasceu NESTA resposta e a página da proposta o mostra (o banco só tem o hash).
    expect(await screen.findByTestId('link-da-proposta')).toHaveValue('https://loja.exemplo.invalid/pedido-montado#tok-abc')
    // O link não foi guardado no navegador: ele chegou à página pela navegação.
    expect(window.sessionStorage.length).toBe(0)
  })

  it('a observação escrita na montagem vai no save, aparada, e a tela a diz "só você vê"', async () => {
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=save'
        ? falha(500, { error: 'Fora do ar.' })
        : { data: null, error: null }
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    const campo = screen.getByLabelText('Observação interna')
    expect(campo.closest('div')!.parentElement).toHaveTextContent('só você vê')
    expect(campo).not.toHaveAttribute('maxlength')
    fireEvent.change(campo, { target: { value: '  Embrulhar para presente  ' } })
    expect(screen.getByText('23/1000')).toBeInTheDocument()
    fireEvent.click(botaoCriar())
    await waitFor(() => expect(saves()).toHaveLength(1))
    expect(saves()[0].corpo.admin_note).toBe('Embrulhar para presente')
  })

  it('a observação acima do teto trava "Criar link" com a frase de core', async () => {
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    fireEvent.change(screen.getByLabelText('Observação interna'), { target: { value: 'a'.repeat(1001) } })
    expect(botaoCriar()).toBeDisabled()
    expect(screen.getByTestId('motivo-criar-link')).toHaveTextContent('A observação vai até 1000 caracteres.')
  })

  const SAVE_CRIADO = { data: { id: PROPOSTA, number: 'P-0007', version: 1, status: 'open', customer_id: FICHA, created: true, changed: true, reused: false, token: 't', expires_at: EXPIRA, summary: resumo(90) }, error: null }

  it('"Salvar no cadastro da cliente" vem marcada e vai no próprio `save` — o painel não escreve em addresses', async () => {
    estado.invocar = (nome) => (nome === 'order-proposals?action=save' ? SAVE_CRIADO : { data: { proposal: detalhe(), state: 'open', actions: {} }, error: null })
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '90010000' } })
    fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua A' } })
    expect(screen.getByLabelText(/Salvar no cadastro/)).toBeChecked()
    await acrescentarAnel()
    fireEvent.click(botaoCriar())
    await screen.findByRole('heading', { name: 'Pedido montado P-0007' })
    expect(saves()[0].corpo).toMatchObject({ address_zip: '90010000', address_street: 'Rua A', save_address: true })
    // Um dono da escrita: nenhuma escrita PostgREST em `addresses` (nem em tabela nenhuma).
    expect((estado.calls as Registro[]).some((c) => c.table === 'addresses' && (c.insert || c.upsert || c.update))).toBe(false)
    expect((estado.calls as Registro[]).filter((c) => c.upsert || c.insert || c.update || c.delete)).toHaveLength(0)
  })

  it('desmarcar "Salvar no cadastro" manda `save_address: false`', async () => {
    estado.invocar = (nome) => (nome === 'order-proposals?action=save' ? SAVE_CRIADO : { data: { proposal: detalhe(), state: 'open', actions: {} }, error: null })
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '90010000' } })
    fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua A' } })
    fireEvent.click(screen.getByLabelText(/Salvar no cadastro/))
    await acrescentarAnel()
    fireEvent.click(botaoCriar())
    await screen.findByRole('heading', { name: 'Pedido montado P-0007' })
    expect(saves()[0].corpo.save_address).toBe(false)
  })

  it('a gravação que falha diz que nada foi enviado, fica na montagem e não escreve nada à parte', async () => {
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=save' ? falha(500, { error: 'Não consegui gravar a proposta.' }) : { data: null, error: null }
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '90010000' } })
    fireEvent.change(screen.getByLabelText('Rua'), { target: { value: 'Rua A' } })
    await acrescentarAnel()
    fireEvent.click(botaoCriar())
    expect(await screen.findByRole('alert')).toHaveTextContent(SAVE_FAILED)
    expect(SAVE_FAILED).toBe('Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo.')
    expect(screen.getByRole('heading', { name: 'Montar pedido' })).toBeInTheDocument()
    expect((estado.calls as Registro[]).some((c) => c.table === 'addresses' && (c.insert || c.upsert || c.update))).toBe(false)
  })

  it('o link criado sem a loja configurada no painel não some calado: a página diz por quê', async () => {
    estado.origem = null
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=save'
        ? { data: { id: PROPOSTA, number: 'P-0007', version: 1, status: 'open', customer_id: null, created: true, changed: true, reused: false, token: 't', expires_at: EXPIRA, summary: resumo(90) }, error: null }
        : { data: { proposal: detalhe(), state: 'open', actions: {} }, error: null }
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    fireEvent.click(botaoCriar())
    await screen.findByRole('heading', { name: 'Pedido montado P-0007' })
    expect(screen.getByText(/a loja não está configurada neste painel/)).toBeInTheDocument()
  })

  it('PRC-02: total diferente no servidor ⇒ a frase do servidor, NADA de navegação, e o resumo RELIDO', async () => {
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=save'
        ? falha(409, { error: PRICES_CHANGED, code: 'prices_changed', summary: resumo(95) })
        : { data: null, error: null }
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    const leiturasAntes = (estado.calls as Registro[]).filter((c) => c.table === 'products' && c.filters.some((f) => f.args[1] === ANEL_ID)).length
    // O preço mudou no banco depois que a tela leu.
    estado.precoDoAnel = 95
    fireEvent.click(botaoCriar())

    expect(await screen.findByRole('alert')).toHaveTextContent(PRICES_CHANGED)
    await waitFor(() => expect(screen.getByTestId('resumo-total')).toHaveTextContent(/R\$\s?95,00/))
    const leiturasDepois = (estado.calls as Registro[]).filter((c) => c.table === 'products' && c.filters.some((f) => f.args[1] === ANEL_ID)).length
    expect(leiturasDepois).toBeGreaterThan(leiturasAntes)
    expect(screen.queryByRole('heading', { name: /Pedido montado P-/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Montar pedido' })).toBeInTheDocument()
    // A segunda tentativa vai com o total novo — o que a Adri passou a ver.
    estado.invocar = () => ({ data: null, error: { message: 'x' } })
    fireEvent.click(botaoCriar())
    await waitFor(() => expect(saves()).toHaveLength(2))
    expect(saves()[1].corpo.expected_total).toBe(95)
    expect(saves()[1].corpo.idempotency_key).toBe(saves()[0].corpo.idempotency_key)
  })

  it('falha sem código diz a frase do servidor e mantém o rascunho', async () => {
    estado.invocar = () => falha(422, { error: 'O cupom não vale para esta cliente.', code: 'coupon_refused' })
    montar('/admin/pedidos/montar')
    await preencherClienteNova()
    await acrescentarAnel()
    fireEvent.click(botaoCriar())
    expect(await screen.findByRole('alert')).toHaveTextContent('O cupom não vale para esta cliente.')
    // O rascunho continua: a cliente escolhida e a peça na lista.
    expect(screen.getByTestId('cliente-escolhida')).toHaveTextContent('Carla Dias')
    expect(within(screen.getByRole('list', { name: 'Peças da proposta' })).getByText('Anel Simples')).toBeInTheDocument()
  })
})

describe('Editar e duplicar (LNK-05, DUP-01)', () => {
  it('editar carrega a proposta e grava com id + versão lida (sem chave de idempotência)', async () => {
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=get') return { data: { proposal: detalhe(), state: 'open', actions: {} }, error: null }
      return falha(500, { error: 'Fora do ar.' })
    }
    montar(`/admin/pedidos/montar/${PROPOSTA}`)
    expect(await screen.findByRole('heading', { name: 'Editar pedido montado P-0007' })).toBeInTheDocument()
    expect(screen.getByTestId('cliente-escolhida')).toHaveTextContent('Ana Souza')
    await waitFor(() => expect(screen.getByTestId('resumo-total')).toHaveTextContent(/R\$\s?170,00/))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(saves()).toHaveLength(1))
    const corpo = saves()[0].corpo
    expect(corpo).toMatchObject({ id: PROPOSTA, version: 3, customer_id: FICHA, expected_total: 170 })
    expect(corpo.manual_discount).toEqual({ kind: 'amount', value: 10, reason: 'Cliente antiga' })
    expect(corpo).not.toHaveProperty('idempotency_key')
  })

  it('editar abre com a observação gravada e a manda de volta, editada', async () => {
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=get')
        return { data: { proposal: detalhe({ admin_note: 'Ligar antes' }), state: 'open', actions: {} }, error: null }
      return falha(500, { error: 'Fora do ar.' })
    }
    montar(`/admin/pedidos/montar/${PROPOSTA}`)
    await screen.findByRole('heading', { name: 'Editar pedido montado P-0007' })
    const campo = screen.getByLabelText('Observação interna')
    expect(campo).toHaveValue('Ligar antes')
    fireEvent.change(campo, { target: { value: 'Ligar antes de postar' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(saves()).toHaveLength(1))
    expect(saves()[0].corpo).toMatchObject({ id: PROPOSTA, version: 3, admin_note: 'Ligar antes de postar' })
  })

  it('editar abre com a caixa de acrescentar FECHADA e a linha com a foto da peça', async () => {
    estado.imagemDoAnel = 'https://img.exemplo.invalid/anel.webp'
    montar(`/admin/pedidos/montar/${PROPOSTA}`)
    await screen.findByRole('heading', { name: 'Editar pedido montado P-0007' })
    const pecas = await screen.findByRole('list', { name: 'Peças da proposta' })
    await waitFor(() =>
      expect(within(pecas).getByTestId('peca-foto')).toHaveAttribute('src', expect.stringContaining('anel.webp')),
    )
    expect(screen.queryByTestId('acrescentar-peca')).toBeNull()
    expect(screen.getByRole('button', { name: /Acrescentar peça/ })).toBeInTheDocument()
  })

  it('duas abas: version_conflict diz a frase e RELÊ a proposta', async () => {
    let gets = 0
    estado.invocar = (nome) => {
      if (nome === 'order-proposals?action=get') {
        gets += 1
        return { data: { proposal: detalhe({ version: 3 + gets }), state: 'open', actions: {} }, error: null }
      }
      return falha(409, { error: 'A proposta mudou.', code: 'version_conflict' })
    }
    montar(`/admin/pedidos/montar/${PROPOSTA}`)
    await screen.findByRole('heading', { name: 'Editar pedido montado P-0007' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled())
    const antes = gets
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(VERSION_CONFLICT_TEXT)
    await waitFor(() => expect(gets).toBeGreaterThan(antes))
    // A próxima gravação vai com a versão relida (a última que o servidor devolveu antes do clique).
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeEnabled())
    const relida = 3 + gets
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    await waitFor(() => expect(saves()).toHaveLength(2))
    expect(saves()[0].corpo.version).toBe(4)
    expect(saves()[1].corpo.version).toBe(relida)
    expect(relida).toBeGreaterThan(4)
  })

  it('proposta concluída não abre para edição', async () => {
    estado.invocar = () => ({ data: { proposal: detalhe({ status: 'completed' }), state: 'completed', actions: {} }, error: null })
    montar(`/admin/pedidos/montar/${PROPOSTA}`)
    expect(await screen.findByText(NOT_EDITABLE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull()
  })

  it('DUP-01: duplicar leva as peças e o desconto, sem a cliente, e cria uma proposta NOVA', async () => {
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=get'
        ? { data: { proposal: detalhe({ admin_note: 'Ligar antes' }), state: 'open', actions: {} }, error: null }
        : { data: null, error: null }
    montar(`/admin/pedidos/montar?duplicar=${PROPOSTA}`)
    expect(await screen.findByText('A partir de P-0007 · os preços são os de hoje')).toBeInTheDocument()
    const pecas = await screen.findByRole('list', { name: 'Peças da proposta' })
    expect(within(pecas).getByText('Anel Simples')).toBeInTheDocument()
    expect(screen.getByTestId('motivo-criar-link')).toHaveTextContent('Escolha a cliente ou cadastre uma nova.')
    // Os preços são relidos: o anel custa hoje 90 e a linha vale 2 × 90 − 10.
    await waitFor(() => expect(screen.getByTestId('resumo-total')).toHaveTextContent(/R\$\s?170,00/))
    estado.invocar = (nome) =>
      nome === 'order-proposals?action=get'
        ? { data: { proposal: detalhe(), state: 'open', actions: {} }, error: null }
        : falha(500, { error: 'x' })
    await preencherClienteNova()
    fireEvent.click(botaoCriar())
    await waitFor(() => expect(saves()).toHaveLength(1))
    expect(saves()[0].corpo).not.toHaveProperty('id')
    expect(saves()[0].corpo).toMatchObject({ customer_name: 'Carla Dias', lines: [{ product_id: ANEL_ID, quantity: 2 }] })
    // A observação é daquela proposta: duplicar não a copia.
    expect(screen.getByLabelText('Observação interna')).toHaveValue('')
    expect(saves()[0].corpo).toHaveProperty('admin_note', null)
  })

  it('falha ao ler a proposta oferece tentar de novo, e nunca abre um formulário vazio', async () => {
    estado.invocar = () => falha(404, { error: 'Proposta não encontrada.' })
    montar(`/admin/pedidos/montar/${PROPOSTA}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('Proposta não encontrada.')
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull()
  })
})
