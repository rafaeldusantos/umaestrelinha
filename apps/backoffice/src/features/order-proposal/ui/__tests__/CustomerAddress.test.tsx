// As seções Cliente e Endereço da montagem (feature 89, T15: `MON-02`, `MON-03`, `MON-04`).
//
// Os hooks de `entities/customer` são os REAIS, sobre um dublê do client que enxerga tabela e
// filtro — dublar o hook provaria só que o componente chama o dublê. O serviço de CEP é dublado no
// módulo (é rede de terceiro), com o CEP pedido registrado.

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

import CustomerSection from '../CustomerSection'
import AddressSection from '../AddressSection'
import { emptyAddress, emptyCustomer, type DraftAddress, type DraftCustomer } from '../../model/draft'

const FICHA = '11111111-1111-4111-8111-111111111111'
const CONVIDADA = '22222222-2222-4222-8222-222222222222'

const ANA = { id: FICHA, name: 'Ana Souza', email: 'ana@x.invalid', phone: '51999990000', cpf: '11122233344', has_account: true }
const BIA = { id: CONVIDADA, name: 'Bia Lima', email: 'bia@x.invalid', phone: null, cpf: null, has_account: false }

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

beforeEach(() => {
  estado.cepPedido = []
  estado.cepResposta = null
  estado.responder = (r) => {
    const reg = r as Registro
    if (reg.table === 'addresses') return { data: ENDERECOS }
    const or = reg.filters.find((f) => f.method === 'or')?.args[0] as string | undefined
    if (or?.includes('email.ilike."ana@x.invalid"')) return { data: [ANA] }
    if (or?.includes('name.ilike')) return { data: [ANA, BIA] }
    return { data: [] }
  }
})

describe('CustomerSection — buscar (MON-02)', () => {
  it('busca pelo termo e, ao escolher, preenche nome, e-mail, telefone e CPF', async () => {
    montar()
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'ana' } })
    const lista = await screen.findByRole('list', { name: 'Clientes encontradas' }, { timeout: 2000 })
    expect(within(lista).getAllByRole('button')).toHaveLength(2)
    expect(within(lista).getByText('Comprou sem cadastro')).toBeInTheDocument()

    fireEvent.click(within(lista).getByText('Ana Souza'))
    expect(ultimo.customer).toMatchObject({
      mode: 'existente',
      fichaId: FICHA,
      name: 'Ana Souza',
      email: 'ana@x.invalid',
      phone: '(51) 99999-0000',
      document: '111.222.333-44',
    })
    expect(screen.getByTestId('cliente-escolhida')).toHaveTextContent('Ana Souza')
  })

  it('a convidada é escolhível, sem ficha (customer_id nulo)', async () => {
    montar()
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'bia' } })
    fireEvent.click(await screen.findByText('Bia Lima', {}, { timeout: 2000 }))
    expect(ultimo.customer).toMatchObject({ mode: 'existente', fichaId: null, email: 'bia@x.invalid' })
  })

  it('a busca não sai a cada tecla (atraso de digitação)', async () => {
    const antes = (estado.calls as Registro[]).length
    montar()
    const campo = screen.getByLabelText('Buscar cliente')
    fireEvent.change(campo, { target: { value: 'a' } })
    fireEvent.change(campo, { target: { value: 'an' } })
    fireEvent.change(campo, { target: { value: 'ana' } })
    await screen.findByRole('list', { name: 'Clientes encontradas' }, { timeout: 2000 })
    const buscas = (estado.calls as Registro[]).slice(antes).filter((c) => c.table === 'customer_list')
    expect(buscas).toHaveLength(1)
  })

  it('nenhum resultado diz isso e oferece cadastrar como nova', async () => {
    estado.responder = () => ({ data: [] })
    montar()
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'zé' } })
    const vazio = await screen.findByTestId('busca-cliente-vazia', {}, { timeout: 2000 })
    expect(vazio).toHaveTextContent('Nenhuma cliente com “zé”.')
    fireEvent.click(within(vazio).getByRole('button', { name: 'Cadastrar como cliente nova' }))
    expect(ultimo.customer.mode).toBe('nova')
  })

  it('falha da busca diz "não consegui", nunca "nenhuma cliente"', async () => {
    estado.responder = () => ({ error: { message: 'caiu' } })
    montar()
    fireEvent.change(screen.getByLabelText('Buscar cliente'), { target: { value: 'ana' } })
    expect(await screen.findByTestId('busca-cliente-erro', {}, { timeout: 2000 })).toHaveTextContent('Não consegui buscar as clientes agora. caiu')
    expect(screen.queryByTestId('busca-cliente-vazia')).toBeNull()
  })
})

describe('CustomerSection — cliente nova (MON-03)', () => {
  it('pede nome, e-mail, telefone (com máscara) e CPF opcional', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cliente nova' }))
    expect(screen.getByRole('button', { name: 'Cliente nova' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Carla' } })
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '51988887777' } })
    expect(ultimo.customer).toMatchObject({ mode: 'nova', name: 'Carla', phone: '(51) 98888-7777' })
    expect(screen.getByLabelText('CPF (opcional)')).toBeInTheDocument()
  })

  it('e-mail que já tem cadastro oferece a ficha NO LUGAR de criar outra', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cliente nova' }))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' ANA@x.invalid' } })
    const aviso = await screen.findByTestId('ficha-existente', {}, { timeout: 2000 })
    expect(aviso).toHaveTextContent('Este e-mail já tem cadastro: Ana Souza.')
    fireEvent.click(within(aviso).getByRole('button', { name: 'Usar este cadastro' }))
    expect(ultimo.customer).toMatchObject({ mode: 'existente', fichaId: FICHA, email: 'ana@x.invalid' })
  })

  it('e-mail sem cadastro não oferece nada', async () => {
    const antes = (estado.calls as Registro[]).length
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cliente nova' }))
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'nova@x.invalid' } })
    await waitFor(() => expect((estado.calls as Registro[]).slice(antes).some((c) => c.table === 'customer_list')).toBe(true))
    expect(screen.queryByTestId('ficha-existente')).toBeNull()
  })
})

describe('AddressSection (MON-02, MON-04)', () => {
  const comAna = { ...emptyCustomer(), mode: 'existente' as const, fichaId: FICHA, name: 'Ana', email: 'ana@x.invalid' }

  it('MON-02: os salvos aparecem com o PADRÃO primeiro, e o padrão já vem escolhido', async () => {
    montar({ customer0: comAna })
    const grupo = await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    const opcoes = within(grupo).getAllByRole('radio')
    expect(opcoes[0]).toHaveTextContent('Casa')
    expect(opcoes[0]).toHaveTextContent('Padrão')
    await waitFor(() => expect(opcoes[0]).toHaveAttribute('aria-checked', 'true'))
    expect(ultimo.address).toMatchObject({ savedId: 'e2', zip: '90020-000', street: 'Rua de Casa', number: '10', complement: 'ap 2' })
  })

  it('escolher outro salvo troca os campos', async () => {
    montar({ customer0: comAna })
    const grupo = await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    fireEvent.click(within(grupo).getByText('Trabalho'))
    expect(ultimo.address).toMatchObject({ savedId: 'e1', street: 'Rua do Trabalho' })
  })

  it('MON-04: o CEP digitado leva a máscara e completa rua, bairro, cidade e UF', async () => {
    estado.cepResposta = { street: 'Av. Ipiranga', neighborhood: 'Partenon', city: 'Porto Alegre', state: 'RS', manual: false }
    montar()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '90619900' } })
    expect(ultimo.address.zip).toBe('90619-900')
    await waitFor(() => expect(ultimo.address).toMatchObject({ street: 'Av. Ipiranga', neighborhood: 'Partenon', city: 'Porto Alegre', state: 'RS' }))
    expect(estado.cepPedido).toContain('90619900')
  })

  it('CEP que o serviço não acha diz para preencher à mão', () => {
    estado.cepResposta = { street: '', neighborhood: '', city: '', state: '', manual: true }
    montar()
    fireEvent.change(screen.getByLabelText('CEP'), { target: { value: '00000000' } })
    expect(screen.getByText('Não achei este CEP. Preencha o endereço.')).toBeInTheDocument()
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
    expect(screen.getByText('Opcional — a cliente pode preencher no link.')).toBeInTheDocument()
  })
})

describe('alvos de 44px (token exato)', () => {
  it('botões e campos das duas seções', async () => {
    montar({ customer0: { ...emptyCustomer(), mode: 'existente', fichaId: FICHA, name: 'Ana', email: 'ana@x.invalid' } })
    await screen.findByRole('radiogroup', { name: 'Endereços salvos' })
    for (const b of screen.getAllByRole('button')) expect(b.className.split(/\s+/)).toContain('min-h-11')
    for (const r of screen.getAllByRole('radio')) expect(r.className.split(/\s+/)).toContain('min-h-11')
    for (const i of screen.getAllByRole('textbox')) expect(i.className.split(/\s+/)).toContain('h-11')
  })
})

// Prova em navegador da T27: em 390 com a fonte do sistema a 200 %, os dois botões de modo
// ("Cliente cadastrada" e "Cliente nova") não cabiam lado a lado e o segundo saía da tela
// (`scrollWidth` 553). O grupo embrulha, e cada botão quebra o próprio rótulo se for preciso.
describe('o par de modo da cliente cabe em 390 com a fonte grande (token exato)', () => {
  it('o grupo embrulha e os botões podem encolher e quebrar o rótulo', () => {
    montar()
    const grupo = screen.getByRole('group', { name: 'Como escolher a cliente' })
    const t = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)
    expect(t(grupo)).toContain('flex-wrap')
    for (const b of within(grupo).getAllByRole('button')) {
      expect(t(b)).toContain('min-w-0')
      expect(t(b)).toContain('[overflow-wrap:anywhere]')
    }
  })
})
