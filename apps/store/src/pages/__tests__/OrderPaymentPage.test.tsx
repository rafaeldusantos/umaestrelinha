import { act, render, screen, waitFor } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useOrder } from '@/entities/order'
import {
  clearGuestEmail,
  markCartRecovered,
} from '@/features/abandoned-cart/model/useAbandonedCartTracker'
import { useAuthUiStore } from '@/features/auth'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'

import OrderPaymentPage, { BATIDA_MS } from '../OrderPaymentPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * `/pedido/:id/pagamento` — `PIX-P1-03`, `PIX-P1-04`, `PIX-P1-05`, `PIX-P1-06`, `PIX-P2-04`.
 *
 * **A árvore montada aqui é a REAL**: quem monta `PaymentProgress` e `PixSurface` é a página, e o
 * teste só troca a leitura do pedido e a máquina do PIX por dublês. Recriar a composição dentro do
 * arquivo de teste provaria uma árvore que não existe em lugar nenhum — é o achado nº 1 das
 * features `41`, `44` e `49`, três vezes seguidas.
 */

vi.mock('@/entities/order', () => ({ useOrder: vi.fn() }))

/**
 * O `navigate` espionável — ligado por caso, e só onde ele é a ÚNICA coisa observável.
 *
 * A navegação de verdade é o que quase todos os casos medem (a rota irmã aparece na tela). Mas o
 * caso do desmonte não tem como medir por tela: depois do `unmount()` a árvore inteira sai do DOM,
 * e "a outra rota não apareceu" é verdade **nos dois mundos** — foi assim que o mutante que apaga
 * o `clearTimeout` sobreviveu à primeira escrita deste arquivo. O que distingue os dois mundos é o
 * `navigate` ser chamado depois que a tela já morreu, e é isso que o espião torna visível.
 */
const navigateEspiao = vi.fn()
const espionarNavigate = { current: false }
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...real,
    // O hook real é chamado SEMPRE — trocar a chamada por um ramo quebraria a ordem dos hooks.
    useNavigate: () => {
      const navegar = real.useNavigate()
      return espionarNavigate.current ? navigateEspiao : navegar
    },
  }
})

// A máquina tem arquivo próprio (`usePixPayment.test.tsx`, 24 casos). O que a PÁGINA precisa
// provar é outra coisa: que ela não a monta quando não deve, e o que ela faz com cada estado.
const pixState = { current: { kind: 'generating', slow: false } as any }
const generate = vi.fn()
const copy = vi.fn()
// O parâmetro é declarado (e não descartado com `as never` na chamada) porque `tsc` confere
// ARIDADE: um dublê de zero argumentos chamado com um derruba o typecheck do app inteiro.
const usePixPaymentMock = vi.fn((_orderId: string) => ({
  state: pixState.current,
  generate,
  copy,
  copied: false,
}))
vi.mock('@/features/order-payment', async () => {
  const real = await vi.importActual<typeof import('@/features/order-payment')>(
    '@/features/order-payment',
  )
  return { ...real, usePixPayment: (id: string) => usePixPaymentMock(id) }
})

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
  useGeneralSettings: () => ({
    whatsapp: '(51) 99999-8888',
    email: 'ola@umaestrelinha.com.br',
    store_name: 'Uma Estrelinha',
  }),
}))

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

/**
 * A store de acesso é a **real**; só o desenho do overlay é um selo.
 *
 * O overlay de verdade arrasta o SDK de OTP, e o que esta página precisa provar não é o conteúdo
 * dele — é que ela o **monta**. `OrderAccessRefusal` tem arquivo próprio
 * (`widgets/order-access-refusal/ui/__tests__`), e os três ramos dele são medidos lá.
 *
 * **A store precisa ser a real**, e é a diferença entre este dublê e o anterior: com um `open`
 * espionado, "o botão chamou `open`" é verdade com o overlay ausente da árvore — que era
 * exatamente o estado da rota, um CTA que liga uma flag que ninguém lê. Com a store real, o que se
 * mede é o estado que o overlay consome.
 */
vi.mock('@/features/auth', async () => {
  const real = await vi.importActual<typeof import('@/features/auth/model/authUiStore')>(
    '@/features/auth/model/authUiStore',
  )
  return {
    useAuthUiStore: real.useAuthUiStore,
    AuthOverlay: () => <div data-testid="auth-overlay" />,
  }
})
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null }) }))

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
  markCartRecovered: vi.fn().mockResolvedValue(undefined),
  clearGuestEmail: vi.fn(),
}))

const pedido = (extra: Record<string, unknown> = {}) => ({
  data: {
    id: 'ord-1',
    order_number: '0244',
    customer_email: 'marina@email.com',
    total: 46.55,
    status: 'pending',
    payment_method: 'pix',
    payment_status: 'pending',
    paid_at: null,
    order_items: [],
    ...extra,
  },
  isLoading: false,
  isError: false,
})

/** A rota real, para o `:id` sair da URL — nunca de uma prop inventada pelo teste. */
const montar = (rota = '/pedido/ord-1/pagamento') =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/pedido/:id/pagamento" element={<OrderPaymentPage />} />
        <Route path="/pedido/:id" element={<div>pagina:pedido</div>} />
      </Routes>
    </MemoryRouter>,
  )

/** Ações reais dos stores, capturadas antes de qualquer espião — evita espião sobre espião. */
const realClearCart = useCartStore.getState().clearCart
const realClearCoupon = useCouponStore.getState().clearCoupon
let clearCartSpy: ReturnType<typeof vi.fn>
let clearCouponSpy: ReturnType<typeof vi.fn>

/** Uma sacola qualquer, para a limpeza ter o que limpar. */
const encherOCarrinho = () =>
  useCartStore.setState({
    items: [
      {
        product: { id: 'p1' } as never,
        size: '',
        finish: '',
        quantity: 1,
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: 10,
      },
    ],
    clearCart: clearCartSpy,
  })

beforeEach(() => {
  vi.mocked(useOrder).mockReset()
  usePixPaymentMock.mockClear()
  generate.mockReset()
  copy.mockReset()
  useAuthUiStore.setState({ isOpen: false, step: 'entry', email: '', returnTo: null })
  navigateEspiao.mockReset()
  espionarNavigate.current = false
  pixState.current = { kind: 'generating', slow: false }

  realClearCoupon()
  clearCartSpy = vi.fn(realClearCart)
  clearCouponSpy = vi.fn(realClearCoupon)
  useCartStore.setState({ items: [], clearCart: clearCartSpy })
  useCouponStore.setState({ clearCoupon: clearCouponSpy })
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
  vi.mocked(markCartRecovered).mockClear()
  vi.mocked(clearGuestEmail).mockClear()
})

describe('OrderPaymentPage — a espera pelo código (PIX-P1-04)', () => {
  it('monta a máquina com o pedido da URL, uma vez', () => {
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(usePixPaymentMock).toHaveBeenCalledWith('ord-1')
  })

  it('enquanto o código não chega, a tela é a MESMA espera nomeada do checkout', () => {
    // `PIX-P1-02`: header, valor e os dois passos continuam na tela quando a rota muda. É isso que
    // faz a espera ler como um caminho só, e não como duas telas empilhadas.
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByText('Passo 2 de 2')).toBeInTheDocument()
    expect(screen.getByText('Pedido registrado')).toBeInTheDocument()
    expect(screen.getByText('#0244')).toBeInTheDocument()
    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
  })

  it('a espera longa da máquina chega à tela', () => {
    pixState.current = { kind: 'generating', slow: true }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByText(/espera está mais longa/i)).toBeInTheDocument()
  })

  it('com o código, a tela do PIX assume — valor, QR, copia-e-cola e tempo', () => {
    pixState.current = { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByTestId('qr')).toHaveAttribute('data-value', 'PIX-CODE')
    expect(screen.getByLabelText('Código PIX copia e cola')).toHaveValue('PIX-CODE')
    expect(screen.getByTestId('pix-tempo')).toHaveTextContent('09:47')
    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
  })

  it('o caminho manual aponta para o pedido desta URL', () => {
    pixState.current = { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByRole('link', { name: 'Ver os detalhes do pedido' })).toHaveAttribute(
      'href',
      '/pedido/ord-1',
    )
  })

  it('o e-mail do PEDIDO alimenta a confirmação, não o rascunho do checkout', () => {
    // O rascunho não existe quando a rota é aberta em outro aparelho — `markCartRecovered` já tinha
    // custado essa lição. Quem responde "para onde vai o comprovante?" é `order.customer_email`.
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByText('marina@email.com')).toBeInTheDocument()
  })
})

describe('OrderPaymentPage — o que NÃO está nesta tela (PIX-P1-05)', () => {
  it.each([
    ['gerando', { kind: 'generating', slow: false }],
    ['pronto', { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }],
  ])('%s: nenhum CTA "Pagar …" e nenhum bloco do checkout', (_nome, state) => {
    pixState.current = state
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    const { container } = montar()

    expect(screen.queryByText(/^Pagar /)).not.toBeInTheDocument()
    expect(screen.queryByText('Finalizar compra')).not.toBeInTheDocument()
    expect(screen.queryByText('Contato')).not.toBeInTheDocument()
    expect(screen.queryByText('Entrega')).not.toBeInTheDocument()
    expect(screen.queryByText(/Voltar ao carrinho/)).not.toBeInTheDocument()
    // Nenhum campo editável: o resumo do checkout era editável e aqui não há o que rever.
    expect(container.querySelectorAll('input:not([readonly])')).toHaveLength(0)
  })

  it('o header é o do fechamento de compra, sem navegação de categorias', () => {
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByText('Ambiente seguro')).toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})

describe('OrderPaymentPage — quem não pode receber PIX (PIX-P1-06)', () => {
  it.each([
    ['já pago', { paid_at: '2026-09-21T12:00:00Z' }],
    ['cancelado', { status: 'cancelled' }],
    ['de cartão', { payment_method: 'card' }],
  ])('%s: vai para `/pedido/:id` sem gerar código nenhum', (_nome, extra) => {
    vi.mocked(useOrder).mockReturnValue(pedido(extra) as never)
    montar()

    expect(screen.getByText('pagina:pedido')).toBeInTheDocument()
    // A metade que importa: a máquina NÃO foi montada, então nenhuma cobrança saiu. Sem esta
    // asserção, um redirecionamento que acontecesse DEPOIS da chamada passaria igual — e o pedido
    // já pago teria um segundo QR emitido no caminho.
    expect(usePixPaymentMock).not.toHaveBeenCalled()
  })

  it('o par: pedido pendente de PIX NÃO é redirecionado', () => {
    // Sem o inverso, um `<Navigate>` incondicional provaria os três casos acima e a rota inteira
    // seria inalcançável.
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.queryByText('pagina:pedido')).not.toBeInTheDocument()
    expect(usePixPaymentMock).toHaveBeenCalledTimes(1)
  })
})

describe('OrderPaymentPage — pedido que não abre', () => {
  it('carregando não afirma nada sobre o pedido', () => {
    vi.mocked(useOrder).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never)
    montar()

    expect(screen.getByText('Carregando seu pedido...')).toBeInTheDocument()
    expect(usePixPaymentMock).not.toHaveBeenCalled()
  })

  it('pedido inexistente cai na recusa que já existe — nunca um QR vazio', () => {
    vi.mocked(useOrder).mockReturnValue({ data: null, isLoading: false, isError: false } as never)
    montar()

    expect(screen.getByText('Pedido não encontrado')).toBeInTheDocument()
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()
    expect(usePixPaymentMock).not.toHaveBeenCalled()
  })

  it('erro de leitura diz outra coisa — as duas falhas não se confundem', () => {
    vi.mocked(useOrder).mockReturnValue({ data: undefined, isLoading: false, isError: true } as never)
    montar()

    expect(screen.getByText('Não conseguimos abrir este pedido')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para Minha conta' })).toBeInTheDocument()
  })

  it('sem sessão, a saída é o código por e-mail, com o destino de volta', () => {
    vi.mocked(useOrder).mockReturnValue({ data: null, isLoading: false, isError: false } as never)
    montar()

    screen.getByRole('button', { name: 'Entrar com código' }).click()
    expect(useAuthUiStore.getState()).toMatchObject({ isOpen: true, returnTo: '/pedido/ord-1' })
  })

  /**
   * **O CTA que não fazia nada** — a borda da `spec.md` e o `Success Criteria` que abre esta
   * feature (*"nenhuma tela do fluxo mostra um CTA que não faz nada"*).
   *
   * O botão acima liga uma flag numa store; quem **renderiza** o overlay que lê essa flag são as
   * páginas que vivem fora do `StoreLayout` — e esta é uma delas. Sem esta asserção as duas pontas
   * ficam provadas (o botão chama, a store abre) e o FIO entre elas não: uma convidada cujo token
   * expirou tocaria em "Entrar com código" e **nada aconteceria**, com a suíte inteira verde. É o
   * achado nº 1 das features `41`, `44`, `49` e `50`.
   */
  it('a recusa monta o overlay que o botão liga — o CTA não é morto', () => {
    vi.mocked(useOrder).mockReturnValue({ data: null, isLoading: false, isError: false } as never)
    montar()

    expect(screen.getByTestId('auth-overlay')).toBeInTheDocument()
  })

  it('o overlay é do CASCO da rota, não da recusa — ele está lá com o pedido aberto também', () => {
    // O par. Sem ele, mover o overlay para dentro do ramo da recusa passaria — e a rota deixaria de
    // poder abrir o acesso em qualquer outro estado, que é uma regressão silenciosa.
    pixState.current = { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByTestId('auth-overlay')).toBeInTheDocument()
  })
})

describe('OrderPaymentPage — a aprovação (PIX-P2-04)', () => {
  it('confirma na PRÓPRIA tela antes de navegar', async () => {
    vi.useFakeTimers()
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    // A batida: a confirmação está na tela e a navegação ainda NÃO aconteceu.
    expect(screen.getByRole('heading', { name: 'Pagamento confirmado' })).toBeInTheDocument()
    expect(screen.queryByText('pagina:pedido')).not.toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(BATIDA_MS)
    })
    expect(screen.getByText('pagina:pedido')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('o caminho manual fica visível durante a batida — a navegação pode falhar', async () => {
    vi.useFakeTimers()
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(screen.getByRole('link', { name: 'Ver os detalhes do pedido' })).toHaveAttribute(
      'href',
      '/pedido/ord-1',
    )
    vi.useRealTimers()
  })

  it('a batida não navega antes da hora', async () => {
    vi.useFakeTimers()
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    await act(async () => {
      vi.advanceTimersByTime(BATIDA_MS - 100)
    })
    expect(screen.queryByText('pagina:pedido')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('a batida NÃO dispara em estado que não é aprovado', async () => {
    // O par. Sem ele, um efeito sem a guarda levaria quem está olhando o QR para a confirmação de
    // um pagamento que nunca caiu.
    vi.useFakeTimers()
    pixState.current = { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    await act(async () => {
      vi.advanceTimersByTime(BATIDA_MS * 5)
    })
    expect(screen.queryByText('pagina:pedido')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('o CONTROLE do espião: montada, a batida chama `navigate` com o pedido', async () => {
    // Sem este par, o caso abaixo passaria com um espião que nunca é chamado por nada — e voltaria
    // a ser verdadeiro nos dois mundos, que é exatamente o defeito que ele existe para pegar.
    espionarNavigate.current = true
    vi.useFakeTimers()
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    await act(async () => {
      vi.advanceTimersByTime(BATIDA_MS)
    })
    expect(navigateEspiao).toHaveBeenCalledWith('/pedido/ord-1')
    vi.useRealTimers()
  })

  it('o relógio para no desmonte — nada navega depois que a tela saiu', async () => {
    // Medido pelo `navigate`, e não pela tela: depois do desmonte a árvore não está mais no DOM, e
    // "a outra rota não apareceu" seria verdade com o relógio vazando.
    espionarNavigate.current = true
    vi.useFakeTimers()
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    const { unmount } = montar()

    unmount()
    await act(async () => {
      vi.advanceTimersByTime(BATIDA_MS * 3)
    })
    expect(navigateEspiao).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
})

/**
 * `PIX-P1-08` — a limpeza mudou de casa, e o recorte é a razão de ela não poder ser cega.
 *
 * Esta rota é alcançável por link, por `/conta` e por `/pedido/:id`: quem chega por ali pode estar
 * pagando um pedido **antigo** com uma sacola **nova** montada. Sem o recorte, a aprovação daquele
 * pedido esvaziaria o carrinho de hoje — em silêncio.
 */
describe('OrderPaymentPage — a limpeza do carrinho, recortada (PIX-P1-08)', () => {
  const aprovar = (rascunhoApontaPara: string | null) => {
    encherOCarrinho()
    useCouponStore.setState({ applied: { id: 'cp1', code: 'ESTRELA10' } as never })
    if (rascunhoApontaPara) {
      useCheckoutStore.getState().setContact({ email: 'marina@email.com' })
      useCheckoutStore.getState().setOrder(rascunhoApontaPara, useCheckoutStore.getState().draft())
    }
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()
  }

  it('o pedido que ESTE rascunho criou limpa carrinho, cupom e rascunho', () => {
    aprovar('ord-1')

    expect(clearCartSpy).toHaveBeenCalledTimes(1)
    expect(clearCouponSpy).toHaveBeenCalledTimes(1)
    expect(clearGuestEmail).toHaveBeenCalledTimes(1)
    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCheckoutStore.getState().orderId).toBeNull()
  })

  it('pagar um pedido de OUTRO rascunho deixa o carrinho atual intacto', () => {
    // O par que a AC nomeia. Sem ele, uma limpeza incondicional passaria no caso acima.
    aprovar('ord-de-ontem')

    expect(clearCartSpy).not.toHaveBeenCalled()
    expect(clearCouponSpy).not.toHaveBeenCalled()
    expect(clearGuestEmail).not.toHaveBeenCalled()
    expect(useCartStore.getState().items).toHaveLength(1)
    expect(useCheckoutStore.getState().orderId).toBe('ord-de-ontem')
  })

  it('sem rascunho nenhum — a rota aberta em outro aparelho — nada é limpo', () => {
    aprovar(null)

    expect(clearCartSpy).not.toHaveBeenCalled()
    expect(useCartStore.getState().items).toHaveLength(1)
  })

  it('o carrinho recuperado é marcado com o e-mail DO PEDIDO, uma vez, sempre', () => {
    // Fora do recorte de propósito: quem responde "este pedido recuperou um carrinho?" é o pedido,
    // que traz o próprio e-mail — não o rascunho, que pode nem existir quando a rota abre.
    aprovar('ord-de-ontem')

    expect(markCartRecovered).toHaveBeenCalledTimes(1)
    expect(markCartRecovered).toHaveBeenCalledWith('marina@email.com', 'ord-1')
  })

  /**
   * `M20` da verificação independente: apagar a trava `jaConcluiu` deixava o arquivo inteiro verde.
   *
   * Em jsdom o efeito roda **uma vez** de qualquer jeito, então toda asserção de `toHaveBeenCalled
   * Times(1)` acima é verdadeira nos dois mundos. O que distingue os dois é o efeito **rodar de
   * novo** — e é isso que o `StrictMode` do React 18 produz de propósito (monta, limpa, monta), que
   * é a mesma régua que `usePixPayment.test.tsx` já usa para provar que o código é pedido uma vez
   * só. O `useRef` sobrevive a essa remontagem simulada; sem ele, a conclusão roda duas vezes.
   *
   * A consequência real não é cosmética: `markCartRecovered` grava duas vezes no servidor, e o
   * carrinho é limpo de novo — inclusive uma sacola que a pessoa já tenha começado a montar entre
   * as duas execuções.
   */
  it('a conclusão roda UMA vez, mesmo com o efeito reexecutando (StrictMode)', () => {
    encherOCarrinho()
    useCheckoutStore.getState().setContact({ email: 'marina@email.com' })
    useCheckoutStore.getState().setOrder('ord-1', useCheckoutStore.getState().draft())
    pixState.current = { kind: 'approved' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/pedido/ord-1/pagamento']}>
          <Routes>
            <Route path="/pedido/:id/pagamento" element={<OrderPaymentPage />} />
            <Route path="/pedido/:id" element={<div>pagina:pedido</div>} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    expect(markCartRecovered).toHaveBeenCalledTimes(1)
    expect(clearCartSpy).toHaveBeenCalledTimes(1)
    expect(clearGuestEmail).toHaveBeenCalledTimes(1)
  })

  it('o CONTROLE do StrictMode: sem a trava, o efeito TERIA rodado duas vezes', () => {
    // O par que impede o caso acima de passar por "o StrictMode não reexecuta nada neste ambiente"
    // — que o tornaria verdadeiro sobre o nada, exatamente como o mutante sobreviveu. Aqui um
    // efeito SEM trava, na mesma árvore e no mesmo modo, é medido: se ele contar 1, o caso de cima
    // não prova a trava e este reprova.
    const semTrava = vi.fn()
    const Sonda = () => {
      useEffect(() => { semTrava() }, [])
      return null
    }

    render(
      <StrictMode>
        <Sonda />
      </StrictMode>,
    )

    expect(semTrava).toHaveBeenCalledTimes(2)
  })

  it('estado que não é aprovado não limpa nem marca nada', () => {
    encherOCarrinho()
    useCheckoutStore.getState().setOrder('ord-1', useCheckoutStore.getState().draft())
    pixState.current = { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    expect(clearCartSpy).not.toHaveBeenCalled()
    expect(markCartRecovered).not.toHaveBeenCalled()
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})

describe('OrderPaymentPage — as ações chegam à máquina', () => {
  it('gerar de novo e copiar passam pelos manipuladores dela', async () => {
    pixState.current = { kind: 'expired' }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    screen.getByRole('button', { name: 'Gerar um código novo' }).click()
    await waitFor(() => expect(generate).toHaveBeenCalledTimes(1))

    expect(copy).not.toHaveBeenCalled()
  })

  it('copiar, na tela do código pronto', async () => {
    pixState.current = { kind: 'ready', qrCode: 'PIX-CODE', secondsLeft: 587 }
    vi.mocked(useOrder).mockReturnValue(pedido() as never)
    montar()

    screen.getByRole('button', { name: 'Copiar código' }).click()
    await waitFor(() => expect(copy).toHaveBeenCalledTimes(1))
  })
})
