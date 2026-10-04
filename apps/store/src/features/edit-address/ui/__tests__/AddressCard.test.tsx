import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import AddressCard from '../AddressCard'

// Feature 59 — "Endereço de entrega" em "Meus dados".
//
// DAD-07: CEP com `maskCep` e consulta automática, rua, número, complemento, bairro, cidade, UF;
//         grava como o padrão da cliente (pelo `useSaveAddress`, que não cria um segundo).
// DAD-08: salvo, aparece o aviso literal, e o cache que o caixa lê passa a ter o endereço novo.
// DAD-09: a gravação falha → o formulário fica com o digitado e mostra o erro.

/* eslint-disable @typescript-eslint/no-explicit-any */

// O "banco": a leitura do padrão é uma consulta de verdade sobre este valor (sob a mesma chave do
// hook real), e a gravação o substitui — então recarregar depois de salvar lê o que foi gravado.
const { banco, salvarMock } = vi.hoisted(() => ({
  banco: { padrao: null as any },
  salvarMock: vi.fn(),
}))

vi.mock('@/entities/address/api/useDefaultAddress', () => ({
  DEFAULT_ADDRESS_KEY: 'default-address',
  useDefaultAddress: (customerId: string | undefined) =>
    useQuery({
      queryKey: ['default-address', customerId],
      enabled: !!customerId,
      queryFn: async () => banco.padrao,
    }),
}))
vi.mock('@/entities/address/api/useSaveAddress', () => ({
  useSaveAddress: () => ({ mutateAsync: salvarMock, isPending: false }),
}))

// A consulta de CEP é a real; o ViaCEP é dublado.
const fetchMock = vi.fn()

const PAULISTA = {
  cep: '01310100',
  street: 'Av. Paulista',
  number: '1000',
  complement: 'Apto 42',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
}

let client: QueryClient
const renderCard = (customerId: string | null = 'c1') => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AddressCard customerId={customerId} />
    </QueryClientProvider>,
  )
}

const campo = (nome: string) => screen.getByRole('textbox', { name: nome })
const erroDe = (el: HTMLElement) => document.getElementById(el.getAttribute('aria-describedby') as string)

beforeEach(() => {
  banco.padrao = null
  salvarMock.mockReset()
  salvarMock.mockImplementation(async ({ address }: any) => {
    banco.padrao = address
    return { saved: true }
  })
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AddressCard — o endereço salvo (DAD-01, DAD-08)', () => {
  it('as linhas do endereço, o CEP inteiro numa linha, o aviso e "Alterar"', async () => {
    banco.padrao = PAULISTA
    renderCard()

    expect(await screen.findByText('Av. Paulista, 1000, Apto 42')).toBeInTheDocument()
    expect(screen.getByText('Bela Vista')).toBeInTheDocument()
    expect(screen.getByText('São Paulo/SP')).toBeInTheDocument()
    expect(screen.getByText('CEP 01310-100')).toHaveClass('whitespace-nowrap')
    expect(
      screen.getByText('Vale para as próximas compras. Pedidos já feitos seguem para o endereço escolhido no caixa.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alterar' })).toHaveClass('min-h-11')
  })

  it('sem endereço: "Nenhum endereço salvo." e "Adicionar endereço", sem o aviso', async () => {
    renderCard()

    expect(await screen.findByText('Nenhum endereço salvo.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar endereço' })).toHaveClass('h-12')
    expect(screen.queryByRole('button', { name: 'Alterar' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Vale para as próximas compras/)).not.toBeInTheDocument()
  })

  it('carregando: esqueleto sem texto, nem "Nenhum endereço salvo" antes da hora', () => {
    banco.padrao = PAULISTA
    renderCard()

    expect(screen.getByTestId('address-skeleton')).toHaveClass('animate-pulse', 'motion-reduce:animate-none')
    expect(screen.queryByText('Nenhum endereço salvo.')).not.toBeInTheDocument()
  })
})

describe('AddressCard — o formulário (DAD-07)', () => {
  it('"Alterar" abre os sete campos com o endereço salvo — sem consultar o CEP que já estava lá', async () => {
    banco.padrao = PAULISTA
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Alterar' }))

    expect(campo('CEP')).toHaveValue('01310-100')
    expect(campo('CEP')).toHaveAttribute('inputmode', 'numeric')
    expect(campo('Rua')).toHaveValue('Av. Paulista')
    expect(campo('Número')).toHaveValue('1000')
    expect(campo('Complemento')).toHaveValue('Apto 42')
    expect(campo('Bairro')).toHaveValue('Bela Vista')
    expect(campo('Cidade')).toHaveValue('São Paulo')
    expect(campo('UF')).toHaveValue('SP')
    expect(campo('UF')).toHaveAttribute('maxLength', '2')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('o CEP ganha a máscara, e com 8 dígitos a consulta preenche rua, bairro, cidade e UF', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ logradouro: 'Rua da Praia', bairro: 'Centro Histórico', localidade: 'Porto Alegre', uf: 'RS' }),
    })
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar endereço' }))

    fireEvent.change(campo('CEP'), { target: { value: '90010000' } })

    expect(campo('CEP')).toHaveValue('90010-000')
    await waitFor(() => expect(campo('Rua')).toHaveValue('Rua da Praia'))
    expect(fetchMock).toHaveBeenCalledWith('https://viacep.com.br/ws/90010000/json/')
    expect(campo('Bairro')).toHaveValue('Centro Histórico')
    expect(campo('Cidade')).toHaveValue('Porto Alegre')
    expect(campo('UF')).toHaveValue('RS')
  })

  it('CEP que o ViaCEP não acha: o aviso de preencher à mão, e os campos seguem livres', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ erro: true }) })
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar endereço' }))

    fireEvent.change(campo('CEP'), { target: { value: '00000000' } })

    expect(await screen.findByText('Não localizamos esse CEP. Preencha o endereço à mão.')).toBeInTheDocument()
    expect(campo('Rua')).not.toBeDisabled()
  })

  it('campos obrigatórios vazios e CEP incompleto: nada é gravado e cada campo diz o motivo', async () => {
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar endereço' }))

    fireEvent.change(campo('CEP'), { target: { value: '9001' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(salvarMock).not.toHaveBeenCalled()
    expect(erroDe(campo('CEP'))).toHaveTextContent('Informe o CEP com 8 dígitos.')
    expect(erroDe(campo('Rua'))).toHaveTextContent('Informe a rua.')
    expect(erroDe(campo('Número'))).toHaveTextContent('Informe o número.')
    expect(erroDe(campo('Bairro'))).toHaveTextContent('Informe o bairro.')
    expect(erroDe(campo('Cidade'))).toHaveTextContent('Informe a cidade.')
    expect(erroDe(campo('UF'))).toHaveTextContent('Informe a UF.')
    expect(campo('Complemento')).not.toHaveAttribute('aria-invalid')
  })
})

describe('AddressCard — gravar (DAD-07, DAD-08)', () => {
  it('grava como padrão da cliente (CEP só com dígitos, UF maiúscula) e volta à leitura com o aviso', async () => {
    banco.padrao = PAULISTA
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Alterar' }))

    fireEvent.change(campo('Número'), { target: { value: ' 1500 ' } })
    fireEvent.change(campo('UF'), { target: { value: 'sp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByText('Av. Paulista, 1500, Apto 42')).toBeInTheDocument()
    expect(salvarMock).toHaveBeenCalledWith({
      customerId: 'c1',
      address: { ...PAULISTA, number: '1500', state: 'SP' },
    })
    expect(screen.queryByRole('textbox', { name: 'CEP' })).not.toBeInTheDocument()
    expect(screen.getByText(/Vale para as próximas compras/)).toBeInTheDocument()
    // O cache que o caixa lê (`useDefaultAddress`) já tem o endereço novo — `DAD-08`.
    expect(client.getQueryData(['default-address', 'c1'])).toEqual({ ...PAULISTA, number: '1500', state: 'SP' })
  })

  it('a gravação falha (`saved: false`): o formulário fica com o digitado e mostra o erro', async () => {
    salvarMock.mockResolvedValue({ saved: false })
    banco.padrao = PAULISTA
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Alterar' }))

    fireEvent.change(campo('Número'), { target: { value: '1500' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o endereço agora.')
    expect(campo('Número')).toHaveValue('1500')
    expect(client.getQueryData(['default-address', 'c1'])).toEqual(PAULISTA)
  })

  it('a gravação lança: mesmo tratamento, nunca o modo leitura como se tivesse gravado', async () => {
    salvarMock.mockRejectedValue(new Error('rede'))
    renderCard()
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar endereço' }))

    fireEvent.change(campo('CEP'), { target: { value: '01310100' } })
    fireEvent.change(campo('Rua'), { target: { value: 'Av. Paulista' } })
    fireEvent.change(campo('Número'), { target: { value: '1000' } })
    fireEvent.change(campo('Bairro'), { target: { value: 'Bela Vista' } })
    fireEvent.change(campo('Cidade'), { target: { value: 'São Paulo' } })
    fireEvent.change(campo('UF'), { target: { value: 'SP' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar o endereço agora.')
    expect(within(screen.getByRole('region', { name: 'Endereço de entrega' })).getByRole('textbox', { name: 'Rua' })).toHaveValue(
      'Av. Paulista',
    )
  })
})
