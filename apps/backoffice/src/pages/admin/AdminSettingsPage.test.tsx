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
      free_shipping_enabled: true, free_shipping_threshold: 150,
      default_shipping_cost: 9.9, origin_zip: '', handling_days: 2,
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

// `NotificationsTab` (feature 53) é autocontida — ela tem o PRÓPRIO `useNotificationsDraft()`, que
// chama `useNotificationSettings`/`useMaterialSettings`, exports que o mock de
// `@estrelinha/core/hooks/useStoreSettings` acima NÃO declara (só `useStoreSettings` e
// `useUpdateSettings`, os dois que esta página usa). Dublar aqui, no molde de `CheckoutSettingsCard`
// logo acima, mantém este arquivo testando só a FIAÇÃO (a aba existe, monta o componente, a grade
// muda) — o comportamento interno da aba já está provado em `NotificationsTab.test.tsx`.
vi.mock('@/features/notification-settings', () => ({
  NotificationsTab: () => <div data-testid="notifications-tab-stub">stub</div>,
}))

const toast = vi.hoisted(() => vi.fn())
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast }) }))

import AdminSettingsPage from './AdminSettingsPage'
import { ToggleField } from '@/shared/ui'

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

/**
 * Feature 37 — a aba **Frete** ganhou interruptor (`FRG-02`, `FRG-12`).
 *
 * Antes so existia o campo do valor, e zera-lo era a unica saida aparente para desligar o
 * beneficio. Nao desligava: tres superficies da loja liam o zero como "nao temos frete gratis" e
 * escondiam o texto, enquanto quatro faziam `subtotal >= 0` — sempre verdadeiro — e ZERAVAM O
 * FRETE no caixa.
 */
const abrirFrete = () => {
  render(<AdminSettingsPage />)
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Frete' }))
}

const interruptor = () => screen.getByRole('switch', { name: /Oferecer frete grátis/i })
const campoValor = () => screen.getByLabelText('Frete grátis a partir de (R$)')
const salvarFrete = () => fireEvent.click(screen.getAllByRole('button', { name: /Salvar/i })[0])

describe('Configurações › Frete — o interruptor (FRG-02)', () => {
  it('o interruptor existe e reflete o valor gravado', () => {
    abrirFrete()
    expect(interruptor()).toBeChecked()
  })

  it('nasce DESLIGADO quando o banco diz desligado', () => {
    state.data = { ...state.montar({ ...DEFAULT_MATERIAL }) }
    state.data.shipping = { ...state.data.shipping, free_shipping_enabled: false }
    abrirFrete()
    expect(interruptor()).not.toBeChecked()
  })

  it('desligar PRESERVA o valor da faixa, e o campo fica desabilitado exibindo o numero', () => {
    // Desligar nao apaga a configuracao dela: a Adri precisa ver o numero guardado para decidir se
    // quer religar com ele.
    abrirFrete()
    fireEvent.click(interruptor())

    expect(campoValor()).toBeDisabled()
    expect(campoValor()).toHaveValue(150)
  })

  it('desligar e salvar manda `free_shipping_enabled: false` COM o threshold intacto', async () => {
    abrirFrete()
    fireEvent.click(interruptor())
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({
        free_shipping_enabled: false,
        free_shipping_threshold: 150,
      }),
    })
  })

  it('religar e salvar manda `free_shipping_enabled: true`', async () => {
    state.data = { ...state.montar({ ...DEFAULT_MATERIAL }) }
    state.data.shipping = { ...state.data.shipping, free_shipping_enabled: false }
    abrirFrete()
    fireEvent.click(interruptor())
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({ free_shipping_enabled: true }),
    })
  })
})

describe('Configurações › Frete — ligado sem faixa e RECUSADO (FRG-12)', () => {
  it('ligado com o valor zerado nao chega a escrever no banco', async () => {
    abrirFrete()
    fireEvent.change(campoValor(), { target: { value: '0' } })
    salvarFrete()

    // A prova e a AUSENCIA de escrita, nao o toast: um toast de erro com o upsert acontecendo
    // atras deixaria o banco com a configuracao impossivel gravada.
    await waitFor(() => expect(toast).toHaveBeenCalled())
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('a recusa explica o motivo, sem linguagem festiva', async () => {
    abrirFrete()
    fireEvent.change(campoValor(), { target: { value: '0' } })
    salvarFrete()

    await waitFor(() => expect(toast).toHaveBeenCalled())
    const chamada = toast.mock.calls[0][0]
    expect(chamada.variant).toBe('destructive')
    expect(chamada.description).toMatch(/valor/i)
    expect(chamada.description).not.toMatch(/🎉|corra|agora/i)
  })

  it('DESLIGADO com o valor zerado e gravavel — a faixa nao importa quando nao ha faixa', async () => {
    abrirFrete()
    fireEvent.click(interruptor())
    fireEvent.change(campoValor(), { target: { value: '0' } })
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({ free_shipping_enabled: false }),
    })
  })

  it('ligado com valor valido grava normalmente', async () => {
    abrirFrete()
    fireEvent.change(campoValor(), { target: { value: '199.9' } })
    salvarFrete()

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync).toHaveBeenCalledWith({
      key: 'shipping',
      value: expect.objectContaining({
        free_shipping_enabled: true,
        free_shipping_threshold: 199.9,
      }),
    })
  })
})

/**
 * Feature 42 — a aba **Carrinho** para de mentir (`FIX-03`, defeito D3).
 *
 * Ela tinha "Enviar email de lembrete automaticamente", horas e cupom — e NENHUM código lia
 * `auto_email_enabled` para enviar nada. Um interruptor sem motor invalida o painel inteiro como
 * fonte de verdade: a dona liga, nada acontece, e ninguém sabe dizer por quê. Os campos seguem no
 * tipo e no JSONB; o que sai é a tela prometer.
 */
const abrirCarrinho = () => {
  render(<AdminSettingsPage />)
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Carrinho' }))
}

/** O controle que saiu, exatamente como era — o sensor abaixo o reinjeta num fixture. */
const ROTULO_DO_INTERRUPTOR = 'Enviar email de lembrete automaticamente'
const ROTULO_DAS_HORAS = 'Enviar lembrete após (horas)'
const ROTULO_DO_CUPOM = 'Cupom de incentivo (opcional)'

describe('Configurações › Carrinho — sem interruptor sem motor (FIX-03)', () => {
  it('mostra só o prazo de abandono, e diz que a loja não envia lembrete automático', () => {
    abrirCarrinho()

    expect(screen.getByText('Marcar como abandonado após (horas)')).toBeInTheDocument()
    expect(screen.getByText(/A loja não envia lembrete automático de carrinho/)).toBeInTheDocument()
    expect(screen.getByText(/BL-030/)).toBeInTheDocument()

    expect(screen.queryByText(ROTULO_DO_INTERRUPTOR)).toBeNull()
    expect(screen.queryByRole('switch', { name: ROTULO_DO_INTERRUPTOR })).toBeNull()
    expect(screen.queryByText(ROTULO_DAS_HORAS)).toBeNull()
    expect(screen.queryByText(ROTULO_DO_CUPOM)).toBeNull()
    // A aba não promete envio nenhum — nem "na Fase 2".
    expect(screen.queryByText(/recuperação automática por email/)).toBeNull()
  })

  it('SENSOR: a mesma régua reprova um fixture com o controle de volta', () => {
    // Prova que `queryByText(...).toBeNull()` acima não passa por acidente: o mesmo `ToggleField`,
    // com o mesmo rótulo, renderizado num componente mínimo, é encontrado pela mesma consulta.
    const Fixture = () => (
      <ToggleField label={ROTULO_DO_INTERRUPTOR} checked={false} onChange={() => {}} />
    )
    render(<Fixture />)

    expect(screen.queryByText(ROTULO_DO_INTERRUPTOR)).not.toBeNull()
    expect(screen.queryByRole('switch', { name: ROTULO_DO_INTERRUPTOR })).not.toBeNull()
  })
})

describe('Configurações › Notificações — fiação (T12, feature 53)', () => {
  it('a aba existe, ao lado de Checkout, e as outras 7 continuam de pé', () => {
    render(<AdminSettingsPage />)
    expect(screen.getByRole('tab', { name: 'Notificações' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Geral' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Frete' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Material' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pagamento' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Checkout' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'SEO' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Carrinho' })).toBeInTheDocument()
    // Oito abas agora — a grade mobile continua em 3 colunas, só a partir de `sm` muda.
    expect(screen.getByRole('tablist').className).toContain('sm:grid-cols-8')
    expect(screen.getByRole('tablist').className).not.toContain('sm:grid-cols-7')
  })

  it('a grade de abas usa `h-auto` — o `h-10` fixo do TabsList cortava a 3ª linha em mobile', () => {
    // Achado em navegador real, 390px: `ceil(8/3) = 3` linhas de abas medem ~100px de conteúdo
    // contra os 40px fixos do `h-10` do `TabsList` compartilhado — a 3ª linha ("SEO"/"Carrinho")
    // sobrepunha visualmente o título da seção. `h-auto` sobrepõe o default via `cn()`, só nesta
    // `<TabsList>` (nenhuma outra tela do painel usa esta classe).
    render(<AdminSettingsPage />)
    expect(screen.getByRole('tablist').className).toContain('h-auto')
  })

  it('selecionar a aba monta `NotificationsTab` — nunca um segundo desenho da aba aqui dentro', () => {
    render(<AdminSettingsPage />)
    expect(screen.queryByTestId('notifications-tab-stub')).toBeNull()

    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Notificações' }))

    expect(screen.getByTestId('notifications-tab-stub')).toBeInTheDocument()
  })

  it('a aba é AUTOCONTIDA: abri-la não chama o `update.mutateAsync` desta página', () => {
    // NotificationsTab está dublada (ela tem o próprio useUpdateSettings — ver o comentário do mock
    // acima), então só abrir a aba não pode disparar gravação nenhuma pela mutation DESTA página.
    // `save('notifications')` também é inalcançável por `tsc`: `PageSettingsKey` a exclui.
    render(<AdminSettingsPage />)
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Notificações' }))
    expect(screen.getByTestId('notifications-tab-stub')).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })
})
