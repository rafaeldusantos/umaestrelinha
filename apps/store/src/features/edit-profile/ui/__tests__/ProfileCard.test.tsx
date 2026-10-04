import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ProfileCard, { type ProfileCardProps } from '../ProfileCard'
import { hiddenDocument } from '../../lib/hiddenDocument'

// Feature 59 — "Dados pessoais" em "Meus dados".
//
// DAD-01: modo leitura com "Editar".
// DAD-02: nome e WhatsApp gravados (pelo contexto, recebido por prop).
// DAD-03: nome < 2 ou WhatsApp sem 10–11 dígitos não grava e diz o motivo.
// DAD-04: e-mail com cadeado e o literal, sem campo.
// DAD-05: CPF preenchido mascarado e travado; vazio, editável uma vez com dígito verificador.
// DAD-09: falha mantém o digitado e mostra o erro.

/* eslint-disable @typescript-eslint/no-explicit-any */

// `useSaveCustomerCpf` é real: o dublê é o client, e ele registra o que foi gravado.
const { cpfUpdate, cpfResult } = vi.hoisted(() => ({
  cpfUpdate: vi.fn(),
  cpfResult: { current: { data: [{ id: 'c1' }], error: null } as any },
}))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({
      update: (patch: unknown) => {
        cpfUpdate(patch)
        return { eq: () => ({ select: () => Promise.resolve(cpfResult.current) }) }
      },
    }),
  },
}))

const CPF = '52998224725'
const CNPJ = '11222333000181'

const cliente = (extra: Record<string, unknown> = {}) =>
  ({ id: 'c1', user_id: 'u1', name: 'Ana Nunes', email: 'ana@x.com', phone: '51998765432', ...extra }) as any

const renderCard = (props: Partial<ProfileCardProps> = {}) => {
  const onSaveProfile = vi.fn().mockResolvedValue({ error: null })
  const onDocumentSaved = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <ProfileCard
        customer={cliente()}
        email="ana@x.com"
        onSaveProfile={onSaveProfile}
        onDocumentSaved={onDocumentSaved}
        {...props}
      />
    </QueryClientProvider>,
  )
  return { onSaveProfile: (props.onSaveProfile as any) ?? onSaveProfile, onDocumentSaved: (props.onDocumentSaved as any) ?? onDocumentSaved }
}

const tokens = (el: Element) => el.className.split(/\s+/).filter(Boolean)
/** O bloco `dt` + `dd` de um rótulo. */
const linha = (rotulo: string) => screen.getByText(rotulo, { selector: 'dt' }).parentElement as HTMLElement

beforeEach(() => {
  cpfUpdate.mockReset()
  cpfResult.current = { data: [{ id: 'c1' }], error: null }
})

describe('ProfileCard — modo leitura (DAD-01)', () => {
  it('título, "Editar" com alvo de 44px, e nome e WhatsApp mascarado', () => {
    renderCard()

    expect(screen.getByRole('heading', { name: 'Dados pessoais' })).toBeInTheDocument()
    expect(tokens(screen.getByRole('button', { name: 'Editar' }))).toContain('min-h-11')
    expect(within(linha('Nome completo')).getByText('Ana Nunes')).toBeInTheDocument()
    expect(within(linha('WhatsApp')).getByText('(51) 99876-5432')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Nome completo' })).not.toBeInTheDocument()
  })

  it('sem telefone salvo, a linha diz "Não informado" — nada de máscara vazia', () => {
    renderCard({ customer: cliente({ phone: '' }) })

    expect(within(linha('WhatsApp')).getByText('Não informado')).toBeInTheDocument()
  })
})

describe('ProfileCard — o e-mail travado (DAD-04)', () => {
  it('cadeado, o literal, e nenhum campo editável', () => {
    renderCard()

    const email = linha('E-mail de acesso')
    expect(within(email).getByText('ana@x.com')).toBeInTheDocument()
    expect(within(email).getByTestId('cadeado')).toBeInTheDocument()
    expect(
      within(email).getByText('É com ele que você entra na loja. Para trocar, fale com a gente.'),
    ).toBeInTheDocument()
    expect(screen.queryByDisplayValue('ana@x.com')).not.toBeInTheDocument()
  })

  it('em modo de edição o e-mail continua travado, sem campo', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    expect(within(linha('E-mail de acesso')).getByTestId('cadeado')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('ana@x.com')).not.toBeInTheDocument()
  })
})

describe('ProfileCard — o documento (DAD-05)', () => {
  it('CPF preenchido: mascarado como `•••.982.247-••`, com cadeado e o literal, sem campo', () => {
    renderCard({ customer: cliente({ cpf: CPF }) })

    const doc = linha('CPF')
    expect(within(doc).getByText('•••.982.247-••')).toBeInTheDocument()
    expect(within(doc).getByTestId('cadeado')).toBeInTheDocument()
    expect(
      within(doc).getByText(
        'Informado na primeira compra, ele identifica quem pagou. Para corrigir, fale com a gente.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'CPF' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Salvar CPF/ })).not.toBeInTheDocument()
    expect(screen.queryByText(CPF)).not.toBeInTheDocument()
  })

  it('CNPJ preenchido: rótulo "CNPJ" e só o miolo à mostra', () => {
    renderCard({ customer: cliente({ cpf: CNPJ }) })

    expect(within(linha('CNPJ')).getByText('••.222.333/••••-••')).toBeInTheDocument()
  })

  it('a máscara esconde as pontas dos dois documentos, e dado fora do formato não aparece', () => {
    expect(hiddenDocument('123.456.789-01')).toBe('•••.456.789-••')
    expect(hiddenDocument(CNPJ)).toBe('••.222.333/••••-••')
    expect(hiddenDocument('1234')).toBe('•••.•••.•••-••')
  })

  it('CPF vazio: campo com máscara e "Salvar CPF"', () => {
    renderCard({ customer: cliente({ cpf: '' }) })

    const campo = screen.getByRole('textbox', { name: 'CPF' })
    fireEvent.change(campo, { target: { value: CPF } })
    expect(campo).toHaveValue('529.982.247-25')
    expect(screen.getByRole('button', { name: 'Salvar CPF' })).toBeInTheDocument()
  })

  it('CPF inválido pelo dígito verificador não chega ao banco e diz o motivo', async () => {
    const { onDocumentSaved } = renderCard({ customer: cliente({ cpf: null }) })

    fireEvent.change(screen.getByRole('textbox', { name: 'CPF' }), { target: { value: '52998224724' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar CPF' }))

    expect(await screen.findByText('CPF ou CNPJ inválido')).toBeInTheDocument()
    expect(cpfUpdate).not.toHaveBeenCalled()
    expect(onDocumentSaved).not.toHaveBeenCalled()
  })

  it('CPF válido grava só os dígitos e avisa a página com o valor gravado', async () => {
    const { onDocumentSaved } = renderCard({ customer: cliente({ cpf: '' }) })

    fireEvent.change(screen.getByRole('textbox', { name: 'CPF' }), { target: { value: CPF } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar CPF' }))

    await waitFor(() => expect(onDocumentSaved).toHaveBeenCalledWith(CPF))
    expect(cpfUpdate).toHaveBeenCalledWith({ cpf: CPF })
  })

  it('o banco recusando (zero linhas ou o gatilho) mostra a frase da loja, e o digitado fica', async () => {
    cpfResult.current = { data: null, error: { message: 'cpf já informado', code: '42501' } }
    const { onDocumentSaved } = renderCard({ customer: cliente({ cpf: '' }) })

    fireEvent.change(screen.getByRole('textbox', { name: 'CPF' }), { target: { value: CPF } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar CPF' }))

    expect(await screen.findByText('Não conseguimos salvar seus dados. Tente novamente.')).toBeInTheDocument()
    expect(screen.queryByText('cpf já informado')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'CPF' })).toHaveValue('529.982.247-25')
    expect(onDocumentSaved).not.toHaveBeenCalled()
  })
})

describe('ProfileCard — editar (DAD-02, DAD-03)', () => {
  it('"Editar" abre o formulário com o nome e o WhatsApp atuais; "Cancelar" volta sem gravar', () => {
    const { onSaveProfile } = renderCard()

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByRole('textbox', { name: 'Nome completo' })).toHaveValue('Ana Nunes')
    expect(screen.getByRole('textbox', { name: 'WhatsApp' })).toHaveValue('(51) 99876-5432')
    expect(tokens(screen.getByRole('button', { name: 'Salvar' }))).toContain('h-12')

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('textbox', { name: 'Nome completo' })).not.toBeInTheDocument()
    expect(onSaveProfile).not.toHaveBeenCalled()
  })

  it('o WhatsApp ganha a máscara enquanto se digita', () => {
    renderCard({ customer: cliente({ phone: '' }) })
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    const campo = screen.getByRole('textbox', { name: 'WhatsApp' })
    fireEvent.change(campo, { target: { value: '51998765432' } })
    expect(campo).toHaveValue('(51) 99876-5432')
  })

  it('nome curto e WhatsApp sem DDD: nada é gravado e cada campo diz o motivo', () => {
    const { onSaveProfile } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), { target: { value: 'A' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'WhatsApp' }), { target: { value: '98765432' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSaveProfile).not.toHaveBeenCalled()
    const nome = screen.getByRole('textbox', { name: 'Nome completo' })
    const fone = screen.getByRole('textbox', { name: 'WhatsApp' })
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(document.getElementById(nome.getAttribute('aria-describedby') as string)).toHaveTextContent(
      'Informe seu nome completo.',
    )
    expect(document.getElementById(fone.getAttribute('aria-describedby') as string)).toHaveTextContent(
      'Informe um WhatsApp com DDD.',
    )
  })

  it('válido: grava nome e WhatsApp e volta ao modo leitura', async () => {
    const { onSaveProfile } = renderCard()
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), { target: { value: 'Ana Maria Nunes' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'WhatsApp' }), { target: { value: '5133334444' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Nome completo' })).not.toBeInTheDocument())
    expect(onSaveProfile).toHaveBeenCalledWith({ name: 'Ana Maria Nunes', phone: '(51) 3333-4444' })
  })
})

describe('ProfileCard — a gravação falha (DAD-09)', () => {
  it('o formulário fica aberto com o que foi digitado e mostra o erro', async () => {
    const onSaveProfile = vi.fn().mockResolvedValue({ error: 'Não foi possível salvar agora. Tente de novo.' })
    renderCard({ onSaveProfile })
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'Nome completo' }), { target: { value: 'Ana Maria Nunes' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível salvar agora. Tente de novo.')
    expect(screen.getByRole('textbox', { name: 'Nome completo' })).toHaveValue('Ana Maria Nunes')
    expect(screen.getByRole('textbox', { name: 'WhatsApp' })).toHaveValue('(51) 99876-5432')
  })
})
