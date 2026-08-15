// Feature 22 / T4 — a aba **Material** das configurações da loja.
//
// O que ela prova (MAT-01): o endereço do ateliê é CONFIGURAÇÃO, e o save manda a chave `material`
// com os nove campos. Mudar de endereço é operação da dona; com o endereço em `.tsx` seria deploy.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_MATERIAL } from '@estrelinha/supabase/types/settings'

// `vi.hoisted` roda ANTES dos imports do módulo, então o corpo dele não pode ler `DEFAULT_MATERIAL`
// (`Cannot access '__vi_import__' before initialization`). Os nove campos vazios ficam escritos aqui,
// e o teste `os nove campos` abaixo é quem prova que a lista não divergiu do tipo.
//
// ⚠️ **`state.data` é UMA referência, reconstruída só no `beforeEach`.** `AdminSettingsPage` tem um
// `useEffect(..., [data])` que copia as configurações para o estado local; um dublê que devolvesse
// objeto literal novo a cada render trocaria a identidade de `data` toda vez, o efeito rodaria de
// novo, e a página entraria em **laço infinito de render** — o teste trava sem mensagem nenhuma. Não
// é hipótese: foi o que aconteceu na primeira versão deste arquivo.
const state = vi.hoisted(() => {
  const vazio = () => ({
    recipient: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zip: '', notes: '',
  })
  const montar = (material: ReturnType<typeof vazio>) => ({
    general: {
      store_name: 'Uma Estrelinha', whatsapp: '', whatsapp_message: '',
      email: '', instagram: '', tiktok: '',
    },
    shipping: {
      free_shipping_threshold: 150, default_shipping_cost: 9.9, origin_zip: '', handling_days: 2,
    },
    payment: {
      pix_enabled: true, pix_discount_percent: 5, card_enabled: true,
      max_installments: 6, min_installment_value: 10,
    },
    seo: { title: '', description: '', og_image: '' },
    abandoned_cart: {
      threshold_hours: 4, auto_email_enabled: false, auto_email_hours: 24,
      reminder_coupon_code: '',
    },
    checkout: {
      order_bump_enabled: false, order_bump_product_id: null, order_bump_discount_percent: 50,
    },
    material,
  })
  return { vazio, montar, data: montar(vazio()) }
})

const mutateAsync = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => ({ isLoading: false, data: state.data }),
  useUpdateSettings: () => ({ mutateAsync, isPending: false }),
}))

vi.mock('@/features/settings', () => ({
  CheckoutSettingsCard: () => null,
}))

const toast = vi.hoisted(() => vi.fn())
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

import AdminSettingsPage from './AdminSettingsPage'

/**
 * `mouseDown`, e não `click`: o `TabsTrigger` do Radix troca de aba no **onMouseDown**, e um `click`
 * sintético do jsdom não dispara aquele handler — a aba continuaria `data-state="inactive"` e todo
 * campo do painel ficaria fora do DOM.
 */
const abrirMaterial = () => {
  render(<AdminSettingsPage />)
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Material' }))
}

beforeEach(() => {
  state.data = state.montar({ ...DEFAULT_MATERIAL })
  mutateAsync.mockClear()
  toast.mockClear()
})

describe('Configurações › Material (MAT-01)', () => {
  it('a aba existe, ao lado de Frete — é outra remessa, e por isso outro endereço', () => {
    render(<AdminSettingsPage />)
    expect(screen.getByRole('tab', { name: 'Material' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Frete' })).toBeInTheDocument()
  })

  it('salva a chave `material` com os nove campos', async () => {
    abrirMaterial()

    fireEvent.change(screen.getByPlaceholderText('Adri Muniz'), {
      target: { value: 'Adriana Muniz' },
    })
    fireEvent.change(screen.getByPlaceholderText('Rua …'), {
      target: { value: 'Rua das Flores' },
    })
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1))

    const [enviado] = mutateAsync.mock.calls[0]
    expect(enviado.key).toBe('material')
    expect(enviado.value.recipient).toBe('Adriana Muniz')
    expect(enviado.value.street).toBe('Rua das Flores')
    expect(Object.keys(enviado.value).sort()).toEqual(
      ['city', 'complement', 'neighborhood', 'notes', 'number', 'recipient', 'state', 'street', 'zip'],
    )
  })

  it('campo não preenchido vai como string vazia, nunca `undefined`', async () => {
    // `undefined` sumiria do JSON gravado, e a leitura seguinte cairia no default sem ninguém notar.
    abrirMaterial()
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    for (const [campo, valor] of Object.entries(mutateAsync.mock.calls[0][0].value)) {
      expect(valor, `campo ${campo}`).toBe('')
    }
  })

  it('a UF é normalizada para duas letras maiúsculas, e o CEP fica só com dígitos', async () => {
    abrirMaterial()

    fireEvent.change(screen.getByPlaceholderText('RS'), { target: { value: 'rss' } })
    fireEvent.change(screen.getByPlaceholderText('00000000'), { target: { value: '90.000-100' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar alterações/i }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0].value.state).toBe('RS')
    expect(mutateAsync.mock.calls[0][0].value.zip).toBe('90000100')
  })

  it('o que já está gravado aparece no formulário', () => {
    state.data = state.montar({ ...DEFAULT_MATERIAL, recipient: 'Adri', street: 'Av. Ipiranga' })
    abrirMaterial()

    expect(screen.getByDisplayValue('Adri')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Av. Ipiranga')).toBeInTheDocument()
  })

  it('avisa que endereço vazio não é exibido na loja', () => {
    // É a regra que impede material insubstituível de ser postado para um endereço pela metade.
    abrirMaterial()
    expect(screen.getByText(/não mostra endereço nenhum/i)).toBeInTheDocument()
  })
})
