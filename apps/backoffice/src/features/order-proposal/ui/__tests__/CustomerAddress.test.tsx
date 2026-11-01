// As seções Cliente e Endereço da montagem (feature 89, `MON-02`, `MON-03`, `MON-04`; desenho do
// protótipo `Pedido - Montar.html`, ajuste de 2026-11-01).
//
// Os hooks de `entities/customer` são os REAIS, sobre um dublê do client que enxerga tabela e
// filtro — dublar o hook provaria só que o componente chama o dublê. O serviço de CEP é dublado no
// módulo (é rede de terceiro), com o CEP pedido registrado. As asserções leem o RASCUNHO que a tela
// entrega (`ultimo`), não só o texto.

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Registro, Resposta } from '@/test/dubleSupabase'

const { estado } = vi.hoisted(() => ({
  estado: {
    responder: (_r: unknown): unknown => ({ data: [] }),
    calls: [] as unknown[],
    cepPedido: [] as (string | null)[],
    cepResposta: null as null | { street: string; neighborhood: string; city: string; state: string; manual: boolean },
  },
}))

vi.mock('@estrelinha/supabase/client', async () => {
  const { criarDuble } = await import('@/test/dubleSupabase')
  const duble = criarDuble((r) => estado.responder(r) as Resposta)
  estado.calls = duble.calls
  return { supabase: { from: duble.from } }
})

vi.mock('@estrelinha/core/hooks/useCepLookup', () => ({
  useCepLookup: (cep: string | null) => {
    estado.cepPedido.push(cep)
    return { data: cep ? estado.cepResposta : undefined }
  },
}))

import CustomerSection, { NEW_CUSTOMER_BADGE, NO_PHONE_WARNING } from '../CustomerSection'
import AddressSection from '../AddressSection'
import { emptyAddress, emptyCustomer, type DraftAddress, type DraftCustomer } from '../../model/draft'

const FICHA = '11111111-1111-4111-8111-111111111111'
const CONVIDADA = '22222222-2222-4222-8222-222222222222'
const SEM_CONTA = '33333333-3333-4333-8333-333333333333'

const ANA = { id: FICHA, name: 'Ana Souza', email: 'ana@x.invalid', phone: '51999990000', cpf: '11122233344', has_account: true, user_id: 'u-ana', orders_total: 2 }
const BIA = { id: CONVIDADA, name: 'Bia Lima', email: 'bia@x.invalid', phone: null, cpf: null, has_account: false, user_id: null, orders_total: 1 }
const CIDA = { id: SEM_CONTA, name: 'Cida Rocha', email: 'cida@x.invalid', phone: '51988880000', cpf: null, has_account: true, user_id: null, orders_total: 0 }

const ENDERECOS = [
  { id: 'e1', label: 'Trabalho', cep: '90010000', street: 'Rua do Trabalho', number: '5', complement: null, neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', is_default: false },
  { id: 'e2', label: 'Casa', cep: '90020000', street: 'Rua de Casa', number: '10', complement: 'ap 2', neighborhood: 'Moinhos', city: 'Porto Alegre', state: 'RS', is_default: true },
]

let ultimo: { customer: DraftCustomer; address: DraftAddress } = { customer: emptyCustomer(), address: emptyAddress() }

const Palco = ({ customer0 = emptyCustomer(), address0 = emptyAddress() }: { customer0?: DraftCustomer; address0?: DraftAddress }) => {
  const [customer, setCustomer] = useState(customer0)
  const [address, setAddress] = useState(address0)
  ultimo = { customer, address }
  return (
    <>
      <CustomerSection customer={customer} onChange={(p) => setCustomer((c) => ({ ...c, ...p }))} />
      <AddressSection customer={customer} address={address} onChange={(p) => setAddress((a) => ({ ...a, ...p }))} />
    </>
  )
}

const montar = (props?: Parameters<typeof Palco>[0]) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <Palco {...props} />
    </QueryClientProvider>,
  )

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
const BUSCA = 'Buscar por nome, e-mail ou telefone'

const buscarEEscolher = async (termo: string, nome: string) => {
  fireEvent.change(screen.getByLabelText(BUSCA), { target: { value: termo } })
  const lista = await screen.findByRole('list', { name: 'Clientes encontradas' }, { timeout: 2000 })
  fireEvent.click(within(lista).getByText(nome))
}

beforeEach(() => {
  estado.cepPedido = []
  estado.cepResposta = null
  estado.responder = (r) => {
    const reg = r as Registro
    if (reg.table === 'addresses') return { data: ENDERECOS }
    const or = reg.filters.find((f) => f.method === 'or')?.args[0] as string | undefined
    if (or?.includes('email.ilike."ana@x.invalid"')) return { data: [ANA] }
    if (or?.includes('name.ilike')) return { data: [ANA, BIA, CIDA] }
    return { data: [] }
  }
})

describe('CustomerSection — o segmentado "Já é cliente" | "Cliente nova"', () => {
  it('abre em "Já é cliente" com a busca, e troca para o cadastro', () => {
    montar()
    const grupo = screen.getByRole('group', { name: 'Tipo de cliente' })
    const ja = within(grupo).getByRole('button', { name: 'Já é cliente' })
    const nova = within(grupo).getByRole('button', { name: 'Cliente nova' })
    expect(ja).toHaveAttribute('aria-pressed', 'true')
    expect(nova).toHaveAttribute('aria-pressed', 'false')
    // Alvo de 44px (token exato): `min-h-10` era o do protótipo, abaixo do piso do projeto.
    for (const b of [ja, nova]) expect(tokens(b)).toContain('min-h-11')
    expect(screen.getByLabelText(BUSCA)).toBeInTheDocument()

    fireEvent.click(nova)
    expect(nova).toHaveAttribute('aria-pressed', 'true')
    expect(ja).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByLabelText(BUSCA)).toBeNull()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    // Trocar de aba não escreve no rascunho.
    expect(ultimo.customer.mode).toBe('nenhuma')
  })
})

describe('CustomerSection — buscar (MON-02)', () => {
  it('busca pelo termo e, ao escolher, preenche nome, e-mail, telefone, CPF e o perfil', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(BUSCA), { target: { value: 'ana' } })
    const lista = await screen.findByRole('list', { name: 'Clientes encontradas' }, { timeout: 2000 })
    expect(within(lista).getAllByRole('button')).toHaveLength(3)
    // O selo de cada resultado.
    expect(within(lista).getByText('Ana Souza').closest('button')).toHaveTextContent('Com conta')
    expect(within(lista).getByText('Bia Lima').closest('button')).toHaveTextContent('Convidada')
    expect(within(lista).getByText('Cida Rocha').closest('button')).toHaveTextContent('Cadastrada')

    fireEvent.click(within(lista).getByText('Ana Souza'))
    expect(ultimo.customer).toMatchObject({
      mode: 'existente',
      fichaId: FICHA,
      name: 'Ana Souza',
      email: 'ana@x.invalid',
      phone: '(51) 99999-0000',
      document: '111.222.333-44',
      perfil: { temConta: true, pedidos: 2 },
    })
  })

  it('a convidada é escolhível, sem ficha (customer_id nulo)', async () => {
    montar()
    await buscarEEscolher('bia', 'Bia Lima')
    expect(ultimo.customer).toMatchObject({ mode: 'existente', fichaId: null, email: 'bia@x.invalid', perfil: { temConta: false, pedidos: 1 } })
  })

  it('a busca não sai a cada tecla (atraso de digitação)', async () => {
    const antes = (estado.calls as Registro[]).length
    montar()
    const campo = screen.getByLabelText(BUSCA)
    fireEvent.change(campo, { target: { value: 'a' } })
    fireEvent.change(campo, { target: { value: 'an' } })
    fireEvent.change(campo, { target: { value: 'ana' } })
    await screen.findByRole('list', { name: 'Clientes encontradas' }, { timeout: 2000 })
    const buscas = (estado.calls as Registro[]).slice(antes).filter((c) => c.table === 'customer_list')
    expect(buscas).toHaveLength(1)
  })

  it('nenhum resultado diz isso e "Cadastrar como cliente nova" leva o nome digitado ao cadastro', async () => {
    estado.responder = () => ({ data: [] })
    montar()
    fireEvent.change(screen.getByLabelText(BUSCA), { target: { value: 'Zélia Prado' } })
    const vazio = await screen.findByTestId('busca-cliente-vazia', {}, { timeout: 2000 })
    expect(vazio).toHaveTextContent('Nenhuma cliente com “Zélia Prado”.')
    fireEvent.click(within(vazio).getByRole('button', { name: 'Cadastrar como cliente nova' }))
    expect(screen.getByRole('button', { name: 'Cliente nova' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Nome completo')).toHaveValue('Zélia Prado')
    // Ainda não é cliente: só "Usar estes dados" escreve no rascunho.
    expect(ultimo.customer.mode).toBe('nenhuma')
  })

  it('falha da busca diz "não consegui", nunca "nenhuma cliente"', async () => {
    estado.responder = () => ({ error: { message: 'caiu' } })
    montar()
    fireEvent.change(screen.getByLabelText(BUSCA), { target: { value: 'ana' } })
    expect(await screen.findByTestId('busca-cliente-erro', {}, { timeout: 2000 })).toHaveTextContent('Não consegui buscar as clientes agora. caiu')
    expect(screen.queryByTestId('busca-cliente-vazia')).toBeNull()
  })
})

describe('CustomerSection — o cartão da cliente escolhida', () => {
  it('com conta: inicial, nome, contato e os selos "Tem conta na loja" e "N pedidos"', async () => {
    montar()
    await buscarEEscolher('ana', 'Ana Souza')
    const cartao = screen.getByTestId('cliente-escolhida')
    expect(cartao).toHaveTextContent('Ana Souza')
    expect(cartao).toHaveTextContent('ana@x.invalid · (51) 99999-0000')
    expect(within(cartao).getByText('Tem conta na loja')).toBeInTheDocument()
    expect(within(cartao).getByText('2 pedidos')).toBeInTheDocument()
    expect(screen.queryByLabelText(BUSCA)).toBeNull()
    expect(screen.queryByTestId('sem-telefone')).toBeNull()
  })

  it('convidada: "Comprou como convidada" e "1 pedido" (singular)', async () => {
    montar()
    await buscarEEscolher('bia', 'Bia Lima')
    const cartao = screen.getByTestId('cliente-escolhida')
    expect(within(cartao).getByText('Comprou como convidada')).toBeInTheDocument()
    expect(within(cartao).getByText('1 pedido')).toBeInTheDocument()
    expect(within(cartao).queryByText('Tem conta na loja')).toBeNull()
  })

  it('ficha sem login: "Cadastrada, sem conta"', async () => {
    montar()
    await buscarEEscolher('cida', 'Cida Rocha')
    const cartao = screen.getByTestId('cliente-escolhida')
    expect(within(cartao).getByText('Cadastrada, sem conta')).toBeInTheDocument()
    expect(within(cartao).getByText('0 pedidos')).toBeInTheDocument()
  })

  it('"Trocar" volta ao vazio e devolve a busca', async () => {
    montar()
    await buscarEEscolher('ana', 'Ana Souza')
    fireEvent.click(screen.getByRole('button', { name: 'Trocar a cliente' }))
    expect(ultimo.customer).toMatchObject({ mode: 'nenhuma', fichaId: null, name: '', email: '', phone: '', document: '', perfil: null })
    expect(screen.queryByTestId('cliente-escolhida')).toBeNull()
    expect(screen.getByLabelText(BUSCA)).toBeInTheDocument()
  })

  it('sem telefone: o aviso diz o custo, e "Informar o telefone" abre o campo que grava com máscara', async () => {
    montar()
    await buscarEEscolher('bia', 'Bia Lima')
    const aviso = screen.getByTestId('sem-telefone')
    expect(aviso).toHaveTextContent(NO_PHONE_WARNING)
    expect(screen.queryByLabelText('WhatsApp')).toBeNull()

    fireEvent.click(within(aviso).getByRole('button', { name: 'Informar o telefone' }))
    const campo = screen.getByLabelText('WhatsApp')
    expect(campo).toHaveFocus()
    fireEvent.change(campo, { target: { value: '51977776666' } })
    expect(ultimo.customer.phone).toBe('(51) 97777-6666')
    expect(screen.queryByTestId('sem-telefone')).toBeNull()
  })

  it('a proposta relida (sem perfil) mostra o cartão sem selos inventados', () => {
    montar({ customer0: { ...emptyCustomer(), mode: 'existente', fichaId: FICHA, name: 'Ana', email: 'ana@x.invalid', phone: '(51) 99999-0000' } })
    const cartao = screen.getByTestId('cliente-escolhida')
    expect(cartao).toHaveTextContent('Ana')
    expect(within(cartao).queryByText(/pedidos?$/)).toBeNull()
    expect(within(cartao).queryByText('Tem conta na loja')).toBeNull()
  })
})

describe('CustomerSection — cliente nova (MON-03)', () => {
  const irParaNova = () => fireEvent.click(screen.getByRole('button', { name: 'Cliente nova' }))

  it('pede nome completo, e-mail, WhatsApp (com máscara) e CPF opcional — e só escreve ao "Usar estes dados"', async () => {
    const antes = (estado.calls as Registro[]).length
    montar()
    irParaNova()
    const usar = screen.getByRole('button', { name: 'Usar estes dados' })
    expect(usar).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Carla Dias' } })
    expect(usar).toBeDisabled() // sem e-mail
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'carla@' } })
    expect(usar).toBeDisabled() // e-mail inválido
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'carla@x.invalid' } })
    fireEvent.change(screen.getByLabelText('WhatsApp'), { target: { value: '51988887777' } })
    fireEvent.change(screen.getByLabelText('CPF (opcional)'), { target: { value: '12345678901' } })
    expect(screen.getByLabelText('WhatsApp')).toHaveValue('(51) 98888-7777')
    expect(screen.getByText('A cliente confirma o CPF no link, antes de pagar.')).toBeInTheDocument()
    // O e-mail foi conferido no diretório e não tem ficha.
    await waitFor(() => expect((estado.calls as Registro[]).slice(antes).some((c) => c.table === 'customer_list')).toBe(true))
    await waitFor(() => expect(usar).toBeEnabled())
    expect(ultimo.customer.mode).toBe('nenhuma')

    fireEvent.click(usar)
    expect(ultimo.customer).toMatchObject({
      mode: 'nova',
      fichaId: null,
      name: 'Carla Dias',
      email: 'carla@x.invalid',
      phone: '(51) 98888-7777',
      document: '123.456.789-01',
      perfil: null,
    })
    const cartao = screen.getByTestId('cliente-escolhida')
    expect(within(cartao).getByText(NEW_CUSTOMER_BADGE)).toBeInTheDocument()
  })

  it('o nome só de espaços não libera "Usar estes dados"', () => {
    montar()
    irParaNova()
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: '   ' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'carla@x.invalid' } })
    expect(screen.getByRole('button', { name: 'Usar estes dados' })).toBeDisabled()
  })

  it('e-mail que já tem cadastro oferece a ficha NO LUGAR de criar outra, e "Usar estes dados" fica indisponível', async () => {
    montar()
    irParaNova()
    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' ANA@x.invalid' } })
    const aviso = await screen.findByTestId('ficha-existente', {}, { timeout: 2000 })
    expect(aviso).toHaveTextContent('Ana Souza já está cadastrada com este e-mail.')
    expect(screen.getByRole('button', { name: 'Usar estes dados' })).toBeDisabled()

    fireEvent.click(within(aviso).getByRole('button', { name: 'Usar a ficha dela' }))
    expect(ultimo.customer).toMatchObject({ mode: 'existente', fichaId: FICHA, email: 'ana@x.invalid', perfil: { temConta: true, pedidos: 2 } })
    expect(screen.getByTestId('cliente-escolhida')).toHaveTextContent('Ana Souza')
  })

  it('e-mail sem cadastro não oferece nada', async () => {
    const antes = (estado.calls as Registro[]).length
    montar()
    irParaNova()
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@x.invalid' } })
    await waitFor(() => expect((estado.calls as Registro[]).slice(antes).some((c) => c.table === 'customer_list')).toBe(true))
    expect(screen.queryByTestId('ficha-existente')).toBeNull()
  })
})

describe('AddressSection (MON-02, MON-04)', () => {
  const comAna = { ...emptyCustomer(), mode: 'existente' as const, fichaId: FICHA, name: 'Ana', email: 'ana@x.invalid' }

  it('MON-02: os salvos aparecem como radios, o PADRÃO primeiro e já escolhido; os campos ficam fechados', async () => {
    montar({ customer0: comAna })
    const grupo = await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    const opcoes = within(grupo).getAllByRole('radio')
    expect(opcoes).toHaveLength(3) // dois salvos + "Outro endereço"
    for (const o of opcoes) expect(o).toHaveAttribute('type', 'radio')
    expect(opcoes[0].closest('label')).toHaveTextContent('Rua de Casa, 10 · ap 2')
    expect(opcoes[0].closest('label')).toHaveTextContent('Padrão')
    expect(opcoes[2].closest('label')).toHaveTextContent('Outro endereço')
    await waitFor(() => expect(opcoes[0]).toBeChecked())
    expect(ultimo.address).toMatchObject({ savedId: 'e2', zip: '90020-000', street: 'Rua de Casa', number: '10', complement: 'ap 2' })
    expect(screen.queryByLabelText('CEP')).toBeNull()
  })

  it('escolher outro salvo troca os campos', async () => {
    montar({ customer0: comAna })
    const grupo = await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    fireEvent.click(within(grupo).getByText('Rua do Trabalho, 5'))
    expect(ultimo.address).toMatchObject({ savedId: 'e1', street: 'Rua do Trabalho', zip: '90010-000' })
  })

  it('"Outro endereço" limpa os campos e os abre para digitar', async () => {
    montar({ customer0: comAna })
    const grupo = await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    await waitFor(() => expect(ultimo.address.savedId).toBe('e2'))
    fireEvent.click(within(grupo).getByText('Outro endereço'))
    expect(ultimo.address).toMatchObject({ savedId: null, zip: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '' })
    expect(within(grupo).getAllByRole('radio')[2]).toBeChecked()
    expect(screen.getByLabelText('CEP')).toHaveValue('')
    expect(screen.getByLabelText('Rua')).toHaveValue('')
  })

  it('MON-04: o CEP digitado leva a máscara e completa rua, bairro, cidade e UF — Cidade / UF fica só leitura', async () => {
    estado.cepResposta = { street: 'Av. Ipiranga', neighborhood: 'Partenon', city: 'Porto Alegre', state: 'RS', manual: false }
    montar()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '90619900' } })
    expect(ultimo.address.zip).toBe('90619-900')
    await waitFor(() => expect(ultimo.address).toMatchObject({ street: 'Av. Ipiranga', neighborhood: 'Partenon', city: 'Porto Alegre', state: 'RS' }))
    expect(estado.cepPedido).toContain('90619900')
    const cidade = screen.getByLabelText('Cidade / UF')
    expect(cidade).toHaveAttribute('readonly')
    expect(cidade).toHaveValue('Porto Alegre / RS')
    expect(screen.queryByLabelText('UF')).toBeNull()
  })

  it('CEP que o serviço não acha diz para preencher à mão, e Cidade e UF abrem para digitar', () => {
    estado.cepResposta = { street: '', neighborhood: '', city: '', state: '', manual: true }
    montar()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '00000000' } })
    expect(screen.getByText('Não achei este CEP. Preencha o endereço.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cidade / UF')).toBeNull()
    fireEvent.change(screen.getByLabelText('Cidade'), { target: { value: 'Gramado' } })
    fireEvent.change(screen.getByLabelText('UF'), { target: { value: 'RS' } })
    expect(ultimo.address).toMatchObject({ city: 'Gramado', state: 'RS', savedId: null })
  })

  it('MON-04: "Salvar no cadastro da cliente" marca o rascunho; sem cliente ele não aparece', () => {
    const { unmount } = montar()
    expect(screen.queryByLabelText('Salvar no cadastro da cliente')).toBeNull()
    unmount()
    montar({ customer0: { ...emptyCustomer(), mode: 'nova', name: 'Carla', email: 'c@x.invalid' } })
    fireEvent.click(screen.getByLabelText('Salvar no cadastro da cliente'))
    expect(ultimo.address.saveToCustomer).toBe(true)
  })

  it('o endereço é opcional e a seção diz isso', () => {
    montar()
    expect(screen.getByText('Endereço de entrega')).toBeInTheDocument()
    expect(screen.getByText('Opcional — ela pode preencher no link')).toBeInTheDocument()
  })
})

describe('alvos de 44px (token exato)', () => {
  it('campos de texto, resultados da busca, "Trocar" e o aviso sem telefone', async () => {
    montar()
    for (const i of screen.getAllByRole('textbox')) expect(tokens(i)).toContain('h-11')
    fireEvent.change(screen.getByLabelText(BUSCA), { target: { value: 'bia' } })
    const lista = await screen.findByRole('list', { name: 'Clientes encontradas' }, { timeout: 2000 })
    for (const b of within(lista).getAllByRole('button')) expect(tokens(b)).toContain('min-h-[52px]')
    fireEvent.click(within(lista).getByText('Bia Lima'))
    expect(tokens(screen.getByRole('button', { name: 'Trocar a cliente' }))).toContain('min-h-11')
    expect(tokens(screen.getByRole('button', { name: 'Informar o telefone' }))).toContain('min-h-11')
  })

  it('cada endereço salvo e a caixa de salvar no cadastro', async () => {
    montar({ customer0: { ...emptyCustomer(), mode: 'existente', fichaId: FICHA, name: 'Ana', email: 'ana@x.invalid' } })
    const grupo = await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    for (const r of within(grupo).getAllByRole('radio')) expect(tokens(r.closest('label') as Element)).toContain('min-h-14')
    fireEvent.click(within(grupo).getByText('Outro endereço'))
    expect(tokens(screen.getByLabelText('Salvar no cadastro da cliente').closest('label') as Element)).toContain('min-h-11')
  })
})

// O segmentado embrulha (`flex-wrap`) e cada botão quebra o próprio rótulo: com a fonte do sistema a
// 200 % em 390 o par não pode empurrar a página de lado (prova em navegador da T27).
describe('o segmentado da cliente cabe em 390 com a fonte grande (token exato)', () => {
  it('o grupo embrulha e os botões quebram o rótulo', () => {
    montar()
    const grupo = screen.getByRole('group', { name: 'Tipo de cliente' })
    expect(tokens(grupo)).toContain('flex-wrap')
    expect(tokens(grupo)).toContain('max-w-full')
    for (const b of within(grupo).getAllByRole('button')) expect(tokens(b)).toContain('[overflow-wrap:anywhere]')
  })
})
