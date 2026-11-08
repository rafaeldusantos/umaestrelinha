// A visão "Montados" da aba Pedidos e a tela do pedido montado, pela árvore REAL (`<App />` com
// sessão admin sobre o dublê do client). A function `order-proposals` responde pela fila de invocação
// do dublê, na forma do supabase-js; as frases são escritas por extenso (fonte independente do código).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA, ID_ABERTO, ID_PEDIDO, evento, leituraDoMontado, montadoNaLista } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LINK = 'https://loja.exemplo.invalid/pedido-montado#tok-aberto'

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const acao = (a: string) => `order-proposals?action=${a}`
/** A function responde sempre pelo que `resposta()` disser AGORA (uma fila longa de funções). */
const sempre = (a: string, resposta: () => unknown) =>
  fake.filaDeInvocacao(acao(a), ...Array.from({ length: 40 }, () => () => ({ data: resposta(), error: null })))
const corposDe = (a: string) => fake.invocacoesDe(acao(a)).map((i) => (i.opcoes as { body: unknown }).body)

const LISTA = [
  montadoNaLista(),
  montadoNaLista({
    id: 'cccccccc-0000-4000-8000-000000000002',
    number: 'P-0043',
    state: 'viewed',
    viewed_at: '2026-11-07T10:00:00Z',
    created_at: '2026-11-07T11:59:30Z',
    customer_name: 'Helena Prado',
    lines: [{ product_name: 'Anel Lua', product_image: null, variant_label: 'M', quantity: 1 }],
    lines_count: 1,
  }),
  montadoNaLista({
    id: 'cccccccc-0000-4000-8000-000000000003',
    number: 'P-0040',
    state: 'completed',
    status: 'completed',
    order_id: ID_PEDIDO,
    order_number: '0262',
    customer_name: 'Lúcia Ramos',
  }),
  montadoNaLista({ id: 'cccccccc-0000-4000-8000-000000000004', number: 'P-0039', state: 'expired', expires_at: '2026-10-31T15:00:00Z', customer_name: 'Ana Souza' }),
  montadoNaLista({
    id: 'cccccccc-0000-4000-8000-000000000005',
    number: 'P-0038',
    state: 'cancelled',
    status: 'cancelled',
    created_at: '2026-10-26T12:00:00Z',
    customer_name: 'Beatriz Lima',
    lines: [
      { product_name: 'A', product_image: null, variant_label: null, quantity: 1 },
      { product_name: 'B', product_image: null, variant_label: null, quantity: 1 },
      { product_name: 'C', product_image: null, variant_label: null, quantity: 1 },
      { product_name: 'D', product_image: null, variant_label: null, quantity: 1 },
    ],
    lines_count: 6,
  }),
]

const grupoDeChips = () => screen.getByRole('group', { name: 'Visões dos pedidos' })
const cartoes = () => screen.queryAllByTestId('cartao-do-montado')

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Pedidos · Montados', () => {
  it('o chip "Montados · 2 abertos" vem AO FIM dos chips de hoje (Aberta e Vista somam) e leva a ?visao=montados', async () => {
    sempre('list', () => ({ proposals: LISTA, agora: AGORA }))
    fake.responderTabela('order_list', { data: [], error: null, count: 0 })
    await montarApp('/pedidos')
    await andar(50)
    const chips = within(grupoDeChips()).getAllByRole('button')
    const ultimo = chips[chips.length - 1]
    expect(ultimo).toHaveTextContent('Montados · 2 abertos')
    expect(ultimo).toHaveAttribute('aria-pressed', 'false')
    // Nenhum chip de hoje saiu: os seis continuam, antes dele.
    expect(chips).toHaveLength(7)
    await act(async () => {
      fireEvent.click(ultimo)
    })
    await andar(50)
    expect(window.location.pathname + window.location.search).toBe('/pedidos?visao=montados')
    const pressionados = within(grupoDeChips())
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.textContent)
    expect(pressionados).toEqual(['Montados · 2 abertos'])
    expect(cartoes()).toHaveLength(5)
  })

  it('um só aberto ⇒ "Montados · 1 aberto"; nenhum ⇒ só "Montados"', async () => {
    sempre('list', () => ({ proposals: [LISTA[0], LISTA[2]], agora: AGORA }))
    await montarApp('/pedidos?visao=montados')
    await andar(50)
    expect(within(grupoDeChips()).getByRole('button', { pressed: true })).toHaveTextContent(/^Montados · 1 aberto$/)
  })

  it('sem nenhum aberto, o chip diz só "Montados"', async () => {
    sempre('list', () => ({ proposals: [LISTA[2], LISTA[4]], agora: AGORA }))
    await montarApp('/pedidos?visao=montados')
    await andar(50)
    expect(within(grupoDeChips()).getByRole('button', { pressed: true }).textContent).toBe('Montados')
  })

  it('pelo endereço: o cabeçalho, e cada cartão com número, selo, cliente, a meta do estado, o total e as peças — sem ler a lista de pedidos', async () => {
    sempre('list', () => ({ proposals: LISTA, agora: AGORA }))
    await montarApp('/pedidos?visao=montados')
    await andar(50)
    expect(screen.getByTestId('contagem-de-montados')).toHaveTextContent('5 pedidos montados · os mais recentes primeiro')
    const [aberta, vista, concluida, expirada, cancelada] = cartoes()
    expect(aberta).toHaveTextContent('P-0042')
    expect(aberta).toHaveTextContent('Aberta')
    expect(aberta).toHaveTextContent('Marina Duarte')
    expect(within(aberta).getByText('Montado há 2 dias · vale até 12/11')).toBeInTheDocument()
    expect(aberta).toHaveTextContent('R$ 412,50')
    expect(within(aberta).getByText('Pingente Estrela · Prata · Corrente')).toBeInTheDocument()
    expect(within(vista).getByText('Montado agora · vale até 12/11')).toBeInTheDocument()
    expect(vista).toHaveTextContent('vista pela cliente')
    expect(within(concluida).getByText('Virou o pedido #0262')).toBeInTheDocument()
    expect(concluida).toHaveTextContent('Concluída')
    expect(within(expirada).getByText('Venceu em 31/10')).toBeInTheDocument()
    expect(expirada).toHaveTextContent('Expirada')
    expect(within(cancelada).getByText('Cancelado · montado há 12 dias')).toBeInTheDocument()
    expect(within(cancelada).getByText('A · B · C · D · e mais 2')).toBeInTheDocument()
    // Tocar o cartão abre o pedido montado.
    expect(aberta.getAttribute('href')).toBe(`/pedidos/montados/${ID_ABERTO}`)
    // A busca de pedidos não aparece, e a lista de pedidos não é lida nesta visão.
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(fake.leiturasDeDado()).not.toContain('order_list')
    expect(corposDe('list')).toEqual(expect.arrayContaining([{}]))
  })

  it('o total do cartão na tipografia de destaque: serifa 700, primária, 16 px', async () => {
    sempre('list', () => ({ proposals: LISTA, agora: AGORA }))
    await montarApp('/pedidos?visao=montados')
    await andar(50)
    const total = within(cartoes()[0]).getByText((t) => t.replace(/\u00a0/g, ' ') === 'R$ 412,50')
    const cs = (total.getAttribute('class') ?? '').split(/\s+/)
    expect(cs).toEqual(expect.arrayContaining(['font-display', 'font-bold', 'text-estrelinha-primary', 'text-base']))
    expect(cs).not.toContain('font-medium')
  })

  it('vazio, e a falha com "Tentar de novo" (nunca um zero)', async () => {
    sempre('list', () => ({ proposals: [], agora: AGORA }))
    await montarApp('/pedidos?visao=montados')
    await andar(50)
    expect(screen.getByText('Nenhum pedido montado ainda.')).toBeInTheDocument()
  })

  it('a leitura que falha mostra a falha do bloco', async () => {
    fake.filaDeInvocacao(
      acao('list'),
      ...Array.from({ length: 10 }, () => ({ data: null, error: Object.assign(new Error('x'), { name: 'FunctionsFetchError' }) })),
    )
    await montarApp('/pedidos?visao=montados')
    await andar(3000)
    expect(screen.getByText('Não consegui carregar.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
    expect(cartoes()).toHaveLength(0)
  })
})

/** O pedido montado, relido do estado mutável a cada `get`. */
let atual: ReturnType<typeof leituraDoMontado>
const abrirMontado = async () => {
  sempre('get', () => atual)
  await montarApp(`/pedidos/montados/${ID_ABERTO}`, { estado: { doApp: true } })
  await andar(50)
}
const cartaoDoLink = () => screen.queryByTestId('cartao-do-link')
const historico = () => screen.getByRole('list', { name: 'Histórico do pedido montado' })

describe('Pedido montado · o link', () => {
  it('o cartão mostra o link do `get`, "Enviar pelo WhatsApp" com a mensagem escrita, e o histórico diz "Pedido montado"', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    expect(screen.getByRole('heading', { level: 1, name: 'Pedido montado P-0042' })).toBeInTheDocument()
    expect(screen.getByText('Montado há 2 dias · vale até 12/11')).toBeInTheDocument()
    expect(within(cartaoDoLink()!).getByText('Link para Marina')).toBeInTheDocument()
    expect(screen.getByTestId('o-link')).toHaveTextContent(LINK)
    const mensagem = screen.getByTestId('mensagem-do-whatsapp').textContent
    expect(mensagem).toBe(`Oi, Marina! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a entrega e o pagamento:\n\n${LINK}\n\nO link vale até 12/11.`)
    const whats = screen.getByRole('link', { name: 'Enviar pelo WhatsApp (abre em outra aba)' })
    expect(whats.getAttribute('href')).toBe(`https://wa.me/5551999990000?text=${encodeURIComponent(mensagem!)}`)
    expect(screen.getByText('Vale até 12/11. Quem tem o link pode pagar este pedido — não pode ver a conta dela.')).toBeInTheDocument()
    expect(within(historico()).getByText('Pedido montado')).toBeInTheDocument()
    expect(screen.queryByText('Sem telefone — copie o link.')).toBeNull()
  })

  it('sem telefone: "Sem telefone — copie o link." e nenhum WhatsApp', async () => {
    atual = leituraDoMontado({ proposal: { customer_phone: null } })
    await abrirMontado()
    expect(screen.getByText('Sem telefone — copie o link.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Enviar pelo WhatsApp/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument()
  })

  it('copiar põe o link na área de transferência, chama `log-sent` e o histórico mostra "Link enviado · copiado"', async () => {
    const escrever = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: escrever }, configurable: true })
    atual = leituraDoMontado()
    sempre('log-sent', () => {
      atual = leituraDoMontado({ proposal: { events: [evento('created', '2026-11-05T12:00:00Z'), evento('link_sent', '2026-11-07T12:00:00Z', 'copy')] } })
      return { ok: true }
    })
    await abrirMontado()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copiar link' }))
    })
    await andar(50)
    expect(escrever).toHaveBeenCalledWith(LINK)
    expect(corposDe('log-sent')).toEqual([{ id: ID_ABERTO, channel: 'copy' }])
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Link copiado.')
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Cole na conversa com Marina.')
    const eventos = within(historico()).getAllByTestId('evento-do-montado').map((e) => e.firstChild?.textContent)
    // O mais recente primeiro.
    expect(eventos).toEqual(['Link enviado · copiado', 'Pedido montado'])
  })

  it('o WhatsApp chama `log-sent` com o canal, e o histórico mostra "Link enviado · WhatsApp"', async () => {
    atual = leituraDoMontado()
    sempre('log-sent', () => {
      atual = leituraDoMontado({ proposal: { events: [evento('created', '2026-11-05T12:00:00Z'), evento('link_sent', '2026-11-07T12:00:00Z', 'whatsapp')] } })
      return { ok: true }
    })
    await abrirMontado()
    const whats = screen.getByRole('link', { name: 'Enviar pelo WhatsApp (abre em outra aba)' })
    whats.addEventListener('click', (e) => e.preventDefault())
    await act(async () => {
      fireEvent.click(whats)
    })
    await andar(50)
    expect(corposDe('log-sent')).toEqual([{ id: ID_ABERTO, channel: 'whatsapp' }])
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Abrindo o WhatsApp…')
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Conversa com Marina, com a mensagem pronta.')
    expect(within(historico()).getByText('Link enviado · WhatsApp')).toBeInTheDocument()
  })

  it('sem token no `get`: o cartão diz que o link não pode ser mostrado, e "Gerar link novo" chama `renew` e passa a mostrar o link novo', async () => {
    atual = leituraDoMontado({ token: null, actions: { renew: true, renewLabel: 'Gerar link novo' } })
    sempre('renew', () => ({ id: ID_ABERTO, number: 'P-0042', version: 2, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z', repriced: false, summary: {} }))
    await abrirMontado()
    expect(within(cartaoDoLink()!).getByText(/O link deste pedido não pode ser mostrado de novo/)).toBeInTheDocument()
    expect(screen.queryByTestId('o-link')).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Gerar link novo' }))
    })
    await andar(50)
    expect(corposDe('renew')).toEqual([{ id: ID_ABERTO }])
    // O servidor sem a chave da cifra segue sem token no `get`: o link novo vem do `renew`, só na tela.
    expect(screen.getByTestId('o-link')).toHaveTextContent('https://loja.exemplo.invalid/pedido-montado#tok-novo')
    expect(screen.getByTestId('mensagem-do-whatsapp')).toHaveTextContent('O link vale até 14/11.')
  })

  it('sem `VITE_STORE_URL`: a frase de que a loja não está configurada, e nenhum link', async () => {
    vi.stubEnv('VITE_STORE_URL', '')
    atual = leituraDoMontado()
    await abrirMontado()
    expect(
      within(cartaoDoLink()!).getByText(
        'O link foi criado, mas a loja não está configurada neste painel para montá-lo. Gere um link novo depois de configurar a loja.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('o-link')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copiar link' })).toBeNull()
  })

  it('o cartão "Cliente" traz o contato, o documento e o endereço; sem endereço, a cliente preenche no link', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const cliente = screen.getByRole('region', { name: 'Cliente' })
    expect(cliente).toHaveTextContent('marina@exemplo.invalid')
    expect(within(cliente).getByTestId('documento-do-montado')).toHaveTextContent('CPF 123.456.789-09')
    expect(within(cliente).getByTestId('endereco-do-montado').textContent).toBe('Rua das Flores, 10 · Apto 2 · Centro · Porto Alegre/RS · CEP 91240-010')
  })

  it('sem endereço nem documento: "A cliente preenche o endereço no link." e nenhuma linha de documento', async () => {
    atual = leituraDoMontado({ proposal: { address_street: null, address_number: null, customer_document: null } })
    await abrirMontado()
    expect(screen.getByTestId('endereco-do-montado').textContent).toBe('A cliente preenche o endereço no link.')
    expect(screen.queryByTestId('documento-do-montado')).toBeNull()
  })

  it('as peças aparecem com a foto, "nome · variação · N un.", o total dos itens e o frete no link', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const pecas = screen.getAllByTestId('peca-do-montado')
    expect(pecas).toHaveLength(2)
    expect(pecas[0]).toHaveTextContent('Pingente Estrela · Prata · 2 un.')
    expect(within(pecas[0]).getByTestId('foto-da-peca').querySelector('img')).not.toBeNull()
    expect(pecas[1]).toHaveTextContent('Corrente · 1 un.')
    expect(screen.getByRole('heading', { name: '3 peças' })).toBeInTheDocument()
    expect(screen.getByTestId('total-dos-itens')).toHaveTextContent('R$ 412,50')
    expect(screen.getByText('Frete: a cliente escolhe no link.')).toBeInTheDocument()
  })

  it('cada desconto sai com o sinal de menos (U+2212), nunca o hífen', async () => {
    atual = leituraDoMontado({
      proposal: { promotion_discount: 10, coupon_code: 'SAUDADE10', coupon_discount: 20, manual_discount: 47.19, items_total: 335.31 },
    })
    await abrirMontado()
    const valorDe = (rotulo: string) =>
      (screen.getByText(rotulo, { selector: 'dt' }).nextElementSibling?.textContent ?? '').replace(/\s+/g, ' ')
    expect(valorDe('Promoção')).toBe('− R$ 10,00')
    expect(valorDe('Cupom SAUDADE10')).toBe('− R$ 20,00')
    expect(valorDe('Desconto combinado')).toBe('− R$ 47,19')
  })
})

describe('Pedido montado · as ações por estado', () => {
  it('aberta: Cancelar pela folha ("Manter" / "Cancelar pedido"), e nada de Renovar nem Ver o pedido', async () => {
    atual = leituraDoMontado()
    sempre('cancel', () => {
      atual = leituraDoMontado({ state: 'cancelled' })
      return { id: ID_ABERTO, status: 'cancelled' }
    })
    await abrirMontado()
    expect(screen.queryByRole('button', { name: 'Renovar prazo' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Ver o pedido/ })).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar este pedido' }))
    })
    await andar(50)
    const folha = screen.getByRole('dialog', { name: 'Cancelar P-0042?' })
    expect(within(folha).getByText('Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer.')).toBeInTheDocument()
    expect(within(folha).getByRole('button', { name: 'Manter' })).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(folha).getByRole('button', { name: 'Cancelar pedido' }))
    })
    await andar(100)
    expect(corposDe('cancel')).toEqual([{ id: ID_ABERTO }])
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Pedido montado cancelado.')
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('O link deixou de funcionar.')
    // Relido: cancelada, sem ação nenhuma.
    expect(screen.getByTestId('faixa-do-montado')).toHaveTextContent('Cancelado. Quem abrir o link lê que este pedido não está mais disponível.')
    expect(screen.queryByRole('button', { name: 'Cancelar este pedido' })).toBeNull()
  })

  it('expirada: a faixa, nenhum link, e "Renovar prazo" pela folha com a frase nova — que chama `renew`', async () => {
    atual = leituraDoMontado({ state: 'expired', proposal: { expires_at: '2026-11-06T15:00:00Z' } })
    sempre('renew', () => {
      atual = leituraDoMontado({ proposal: { expires_at: '2026-11-14T12:00:00Z' } })
      return { id: ID_ABERTO, number: 'P-0042', version: 2, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z', repriced: false, summary: {} }
    })
    await abrirMontado()
    expect(screen.getByTestId('faixa-do-montado')).toHaveTextContent('O link venceu em 06/11. Renovar confere os preços de novo e gera um link novo.')
    expect(cartaoDoLink()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancelar este pedido' })).toBeNull()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Renovar prazo' }))
    })
    await andar(50)
    const folha = screen.getByRole('dialog', { name: 'Renovar o prazo de P-0042?' })
    expect(
      within(folha).getByText('O link venceu em 06/11. Os preços são conferidos de novo e sai um link novo, que vale até 14/11. Mande o novo para Marina.'),
    ).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(folha).getByRole('button', { name: 'Renovar' }))
    })
    await andar(100)
    expect(corposDe('renew')).toEqual([{ id: ID_ABERTO }])
    // Renovada e relida: aberta, com o link novo.
    expect(screen.getByTestId('o-link')).toHaveTextContent('https://loja.exemplo.invalid/pedido-montado#tok-novo')
  })

  it('concluída: a faixa com o número do pedido e "Ver o pedido #0262", que abre o detalhe do pedido', async () => {
    atual = leituraDoMontado({ state: 'completed', proposal: { order_id: ID_PEDIDO, order_number: '0262' } })
    await abrirMontado()
    expect(screen.getByTestId('faixa-do-montado')).toHaveTextContent('Marina concluiu no link. O pedido #0262 segue na fila como qualquer pedido da loja.')
    const ver = screen.getByRole('link', { name: 'Ver o pedido #0262' })
    expect(ver.getAttribute('href')).toBe(`/pedidos/${ID_PEDIDO}`)
    expect(cartaoDoLink()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancelar este pedido' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Renovar prazo' })).toBeNull()
  })

  it('cancelada: nenhuma ação', async () => {
    atual = leituraDoMontado({ state: 'cancelled' })
    await abrirMontado()
    expect(screen.getByTestId('faixa-do-montado')).toHaveTextContent('Cancelado. Quem abrir o link lê que este pedido não está mais disponível.')
    expect(cartaoDoLink()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Cancelar este pedido' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Renovar prazo' })).toBeNull()
    expect(screen.queryByRole('link', { name: /Ver o pedido/ })).toBeNull()
  })

  it('a observação interna é editada pela folha e salva pela ação `note`', async () => {
    atual = leituraDoMontado({ state: 'cancelled' })
    sempre('note', () => {
      atual = leituraDoMontado({ state: 'cancelled', proposal: { admin_note: 'Embrulhar para presente' } })
      return { id: ID_ABERTO, admin_note: 'Embrulhar para presente' }
    })
    await abrirMontado()
    expect(screen.getByTestId('observacao-do-montado')).toHaveTextContent('Nenhuma observação.')
    await act(async () => {
      fireEvent.click(screen.getByTestId('editar-observacao-do-montado'))
    })
    await andar(50)
    const folha = screen.getByRole('dialog')
    fireEvent.change(within(folha).getByRole('textbox'), { target: { value: 'Embrulhar para presente' } })
    await act(async () => {
      fireEvent.click(within(folha).getByRole('button', { name: 'Salvar' }))
    })
    await andar(100)
    expect(corposDe('note')).toEqual([{ id: ID_ABERTO, admin_note: 'Embrulhar para presente' }])
    expect(screen.getByTestId('observacao-do-montado')).toHaveTextContent('Embrulhar para presente')
  })
})
