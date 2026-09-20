// @vitest-environment jsdom
//
// Molde de `useNotificationsDraft.test.tsx` (L-030): os hooks de settings são REAIS por baixo de um
// QueryClientProvider de verdade — só o client do Supabase é dublado (`.from` para `store_settings`,
// `.functions.invoke` para `?action=preview` e `?action=config-check`).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS, NOTIFICATION_EVENTS } from '@estrelinha/core/notifications'
import { NOTIFICATION_SECTIONS, groupedEvents } from '../../model/sections'

const { selectMock, upsertMock, invokeMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  upsertMock: vi.fn(),
  invokeMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({ select: selectMock, upsert: upsertMock }),
    functions: { invoke: invokeMock },
  },
}))

const toastMock = vi.fn()
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))

import { NotificationsTab } from '../NotificationsTab'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } })
  // O `MemoryRouter` entrou na feature 55: o aviso de endereço do ateliê passou a oferecer um
  // `<Link>` para a seção onde o campo se resolve (`CFG-21`), e `<Link>` fora de um Router lança no
  // render — antes de qualquer asserção, o que se lê como defeito do componente errado.
  return {
    client,
    Wrapper: ({ children }: { children: ReactNode }) =>
      createElement(MemoryRouter, null, createElement(QueryClientProvider, { client }, children)),
  }
}

function renderTab(rows: Array<{ key: string; value: unknown }> = [{ key: 'general', value: {} }]) {
  selectMock.mockResolvedValue({ data: rows, error: null })
  const { client, Wrapper } = makeWrapper()
  const utils = render(createElement(NotificationsTab), { wrapper: Wrapper })
  return { ...utils, client, Wrapper }
}

/**
 * Feature 56 (`LEG-05`): os cards nascem RECOLHIDOS, e os cinco campos só existem no DOM com um
 * aberto. Os casos que editam texto ou pedem prévia abrem o card primeiro — que é o que a Adri faz.
 *
 * Clica no CABEÇALHO, nunca no card: clicar no card acertaria o interruptor tanto quanto o botão, e
 * um teste que confunde os dois deixaria de distinguir `LEG-08` de `LEG-09`.
 */
const abrirCard = (event: string) => fireEvent.click(screen.getByTestId(`event-card-header-${event}`))

const previewOk = (subject: string) => ({
  data: { subject, html: `<p>${subject}</p>`, text: subject, sample: true },
  error: null,
})

beforeEach(() => {
  selectMock.mockReset()
  upsertMock.mockReset()
  upsertMock.mockResolvedValue({ error: null })
  invokeMock.mockReset()
  invokeMock.mockImplementation((name: string) => {
    if (name.includes('config-check')) {
      return Promise.resolve({ data: { admin_public_url: 'https://painel.umaestrelinha.com.br' }, error: null })
    }
    return Promise.resolve(previewOk('Prévia padrão'))
  })
})

describe('NotificationsTab (ABN-01) — 15 cards, três seções, ordem preservada', () => {
  it('renderiza um card por evento — os 15, cada um exatamente uma vez', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId(`event-card-${NOTIFICATION_EVENTS[0]}`)).toBeInTheDocument())

    for (const event of NOTIFICATION_EVENTS) {
      expect(screen.getByTestId(`event-card-${event}`)).toBeInTheDocument()
    }
    expect(screen.getAllByTestId(/^event-card-[a-z_]+$/)).toHaveLength(15)
  })

  it('a ordem do flat de cards é a das TRÊS SEÇÕES, e dentro de cada uma é a de NOTIFICATION_EVENTS', async () => {
    // AC 1 da spec: "agrupados em três seções... preservando, dentro de cada seção, a ordem de
    // NOTIFICATION_EVENTS". O flat inteiro NÃO é literalmente NOTIFICATION_EVENTS (que intercala
    // customer/material/owner) — é `groupedEvents()`, achatado seção a seção. `sections.test.ts` já
    // prova a regra pura; aqui provamos que a TELA a respeita.
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    const esperado = NOTIFICATION_SECTIONS.flatMap((s) => groupedEvents()[s]).map((e) => `event-card-${e}`)
    const cards = screen.getAllByTestId(/^event-card-[a-z_]+$/)
    expect(cards.map((el) => el.getAttribute('data-testid'))).toEqual(esperado)
  })

  it('as três seções aparecem com rótulo visível, e cada evento está em exatamente uma', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    expect(screen.getByText('Pedido e pagamento')).toBeInTheDocument()
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Avisos para você')).toBeInTheDocument()

    const material = within(screen.getByTestId('notifications-section-material'))
    expect(material.getByTestId('event-card-material_instructions')).toBeInTheDocument()

    const owner = within(screen.getByTestId('notifications-section-owner'))
    expect(owner.getByTestId('event-card-owner_order_paid')).toBeInTheDocument()
    expect(owner.getByTestId('event-card-owner_material_incoming')).toBeInTheDocument()

    // material_instructions não aparece de novo na seção customer nem owner.
    const customer = within(screen.getByTestId('notifications-section-customer'))
    expect(customer.queryByTestId('event-card-material_instructions')).toBeNull()
  })

  it('nenhuma coluna ou campo de WhatsApp existe na árvore', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    expect(screen.queryByLabelText(/canal/i)).toBeNull()
    expect(screen.queryByText(/canal.{0,15}whatsapp/i)).toBeNull()
    expect(screen.queryAllByRole('tab').length).toBe(0)
  })
})

describe('NotificationsTab (ABN-06) — um preview ativo por vez', () => {
  it('abrir a prévia de um card fecha a de outro que estivesse aberta', async () => {
    invokeMock.mockImplementation((name: string, opts?: { body?: { event?: string } }) => {
      if (name.includes('config-check')) {
        return Promise.resolve({ data: { admin_public_url: 'https://painel.umaestrelinha.com.br' }, error: null })
      }
      return Promise.resolve(previewOk(`Prévia de ${opts?.body?.event}`))
    })
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    const cardA = screen.getByTestId('event-card-order_received')
    const cardB = screen.getByTestId('event-card-order_paid')

    abrirCard('order_received')
    fireEvent.click(within(cardA).getByTestId('order_received-toggle-preview'))
    await waitFor(() => expect(within(cardA).getByTestId('email-preview-iframe')).toBeInTheDocument())
    expect(within(cardA).getByTestId('email-preview-iframe').getAttribute('srcdoc')).toBe(
      '<p>Prévia de order_received</p>',
    )

    abrirCard('order_paid')

    // `LEG-06` — abrir B fechou A: os campos de A saíram do DOM, não ficaram escondidos por CSS.
    expect(within(cardA).queryByTestId('order_received-subject')).toBeNull()
    expect(screen.getByTestId('event-card-header-order_received')).toHaveAttribute('aria-expanded', 'false')
    // `LEG-10` — e a prévia de A foi junto.
    expect(within(cardA).queryByTestId('email-preview-iframe')).toBeNull()
    // B abriu SEM prévia: fechar o card zera a prévia, não a transfere.
    expect(within(cardB).queryByTestId('email-preview-iframe')).toBeNull()

    fireEvent.click(within(cardB).getByTestId('order_paid-toggle-preview'))
    await waitFor(() => expect(within(cardB).getByTestId('email-preview-iframe')).toBeInTheDocument())
    expect(within(cardB).getByTestId('email-preview-iframe').getAttribute('srcdoc')).toBe(
      '<p>Prévia de order_paid</p>',
    )
    // `ABN-06` continua verdadeiro, e desde a 56 ele é estrutural: a prévia só existe dentro de um
    // card aberto, e só um card abre por vez.
    expect(screen.queryAllByTestId('email-preview-iframe')).toHaveLength(1)
  })
})

describe('NotificationsTab (ABN-07) — pedido de exemplo × pedido real', () => {
  it('sem digitar nada, a prévia chama previewNotification SEM order_id (usa o exemplo)', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    abrirCard('order_received')
    fireEvent.click(
      within(screen.getByTestId('event-card-order_received')).getByTestId('order_received-toggle-preview'),
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())

    const chamada = invokeMock.mock.calls.find(([name]) => String(name).includes('preview'))
    expect(chamada?.[1]?.body?.order_id).toBeUndefined()
  })

  it('digitar um ID de pedido faz a prévia chamar previewNotification COM esse order_id', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('notifications-preview-order-id'), {
      target: { value: '11111111-2222-3333-4444-555555555555' },
    })
    abrirCard('order_received')
    fireEvent.click(
      within(screen.getByTestId('event-card-order_received')).getByTestId('order_received-toggle-preview'),
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())

    const chamada = invokeMock.mock.calls.find(([name]) => String(name).includes('preview'))
    expect(chamada?.[1]?.body?.order_id).toBe('11111111-2222-3333-4444-555555555555')
  })

  it('o ID digitado vale para QUALQUER card em que "ver prévia" for clicado, não só o primeiro', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('notifications-preview-order-id'), {
      target: { value: 'pedido-compartilhado' },
    })
    abrirCard('order_paid')
    fireEvent.click(
      within(screen.getByTestId('event-card-order_paid')).getByTestId('order_paid-toggle-preview'),
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())

    const chamada = invokeMock.mock.calls.find(
      ([name, opts]) => String(name).includes('preview') && opts?.body?.event === 'order_paid',
    )
    expect(chamada?.[1]?.body?.order_id).toBe('pedido-compartilhado')
  })
})

describe('NotificationsTab (ABN-12) — remontar sem salvar mostra o último estado do servidor', () => {
  it('editar, desmontar e remontar descarta a edição', async () => {
    const { unmount, Wrapper } = renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    abrirCard('order_paid')
    fireEvent.change(screen.getByTestId('order_paid-subject'), {
      target: { value: 'Rascunho que não vai ser salvo' },
    })
    expect(screen.getByTestId('order_paid-subject')).toHaveValue('Rascunho que não vai ser salvo')

    unmount()

    render(createElement(NotificationsTab), { wrapper: Wrapper })
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())
    // O card volta RECOLHIDO — `LEG-05` vale na remontagem também, e não só na primeira pintura.
    expect(screen.getByTestId('event-card-header-order_paid')).toHaveAttribute('aria-expanded', 'false')

    abrirCard('order_paid')
    await waitFor(() =>
      expect(screen.getByTestId('order_paid-subject')).toHaveValue(
        DEFAULT_NOTIFICATIONS.events.order_paid.email.fields.subject,
      ),
    )
  })
})

describe('NotificationsTab (ABN-09) — avisos roteados para os cards certos', () => {
  it('material_instructions mostra o aviso de endereço vazio (default: sem linha material)', async () => {
    renderTab([{ key: 'general', value: {} }])
    await waitFor(() => expect(screen.getByTestId('event-card-material_instructions')).toBeInTheDocument())

    // Recolhido, o aviso vira SINAL na linha (`LEG-11`) — e é essa a única pista de que aquele
    // evento tem pendência, já que o banner mora dentro do card.
    expect(screen.getByTestId('event-flag-warning-material_instructions')).toBeInTheDocument()

    abrirCard('material_instructions')
    expect(screen.getByTestId('event-warnings-material_instructions')).toBeInTheDocument()
    // ⚠️ `EventCard.test.tsx` prova que o aviso SABE desenhar um link — mas é ele quem monta a prop
    // `warnings` naquele arquivo. Quem a monta de verdade é o `warningsFor` daqui, e apagar o
    // `action` dele deixava as 9 suítes de notification-settings verdes com o link simplesmente
    // inexistente: exatamente a metade que `CFG-21` acrescenta sobre `CFG-20`.
    // É a lição "teste não monta a árvore que prova", agora na ponta que produz o dado.
    expect(screen.getByTestId('event-warning-link-material_instructions')).toHaveAttribute(
      'href',
      '/admin/configuracoes/frete-e-material',
    )
    // Nenhum outro card da seção "Pedido e pagamento" ganha o mesmo aviso — medido pelo SINAL, e
    // não pela ausência do banner: `order_paid` está recolhido, então o banner dele estaria ausente
    // de qualquer forma. A asserção que discrimina é a do sinal, que existe no estado recolhido.
    expect(screen.queryByTestId('event-flag-warning-order_paid')).toBeNull()
    expect(screen.queryByTestId('event-warnings-order_paid')).toBeNull()
  })

  it('owner_* mostram os DOIS avisos quando e-mail vazio E URL parece local', async () => {
    invokeMock.mockImplementation((name: string) => {
      if (name.includes('config-check')) {
        return Promise.resolve({ data: { admin_public_url: 'http://localhost:8083' }, error: null })
      }
      return Promise.resolve(previewOk('x'))
    })
    renderTab([{ key: 'general', value: { email: '' } }])
    await waitFor(() => expect(screen.getByTestId('event-card-owner_order_paid')).toBeInTheDocument())

    await waitFor(() => expect(screen.getByTestId('event-flag-warning-owner_order_paid')).toBeInTheDocument())
    abrirCard('owner_order_paid')
    const banner = screen.getByTestId('event-warnings-owner_order_paid')
    expect(banner.textContent).toContain('e-mail')
    expect(banner.textContent).toMatch(/produ[çc][ãa]o/)

    // O irmão continua RECOLHIDO, e o aviso dele aparece como sinal — é o que prova que o
    // roteamento alcança os dois sem precisar abrir os dois.
    expect(screen.getByTestId('event-flag-warning-owner_material_incoming')).toBeInTheDocument()
    // E os avisos de `owner_*` NÃO inventam link: não há um campo único a apontar — um é o e-mail em
    // Dados da loja, o outro é um secret de servidor. É o par que impede o `action` de virar
    // decoração em todo aviso.
    expect(screen.queryByTestId('event-warning-link-owner_order_paid')).toBeNull()

    // material_instructions não ganha os avisos de owner — e continua com o SEU próprio aviso
    // (endereço vazio), visível como sinal porque ele está recolhido.
    expect(screen.queryByTestId('event-flag-warning-material_instructions')).not.toBeNull()
  })

  it('sem nenhuma pendência (e-mail preenchido, URL de produção, endereço preenchido), nenhum card mostra aviso', async () => {
    renderTab([
      { key: 'general', value: {} },
      {
        key: 'material',
        value: { recipient: 'Adri', street: 'Rua das Flores', number: '1', complement: '', neighborhood: '', city: '', state: '', zip: '', notes: '' },
      },
    ])
    await waitFor(() => expect(screen.getByTestId('event-card-material_instructions')).toBeInTheDocument())
    // Medido pelo SINAL: com os cards recolhidos, a ausência do banner é verdadeira nos dois mundos.
    await waitFor(() => expect(screen.queryByTestId('event-flag-warning-material_instructions')).toBeNull())
    expect(screen.queryByTestId('event-flag-warning-owner_order_paid')).toBeNull()
    expect(screen.queryByTestId('event-flag-warning-owner_material_incoming')).toBeNull()
  })
})

describe('NotificationsTab — salvar', () => {
  it('o botão salvar chama a gravação com sucesso quando canSave é true', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('notifications-save')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('notifications-save'))
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1))
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('o botão fica desabilitado quando algum campo viola uma régua de core', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    abrirCard('order_paid')
    fireEvent.change(screen.getByTestId('order_paid-lead'), {
      target: { value: 'Corra, é imperdível — últimas unidades!!' },
    })

    await waitFor(() => expect(screen.getByTestId('notifications-save')).toBeDisabled())
  })

  it('mostra um toast de erro quando a gravação falha', async () => {
    upsertMock.mockResolvedValue({ error: new Error('rede fora do ar') })
    renderTab()
    await waitFor(() => expect(screen.getByTestId('notifications-save')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('notifications-save'))
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' })
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Feature 56 — o acordeão, os cabeçalhos de grupo e a linha do título
// ───────────────────────────────────────────────────────────────────────────

describe('NotificationsTab (LEG-05) — os quinze nascem recolhidos', () => {
  it('nenhum card está aberto na montagem, e nenhum campo existe no DOM', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    // Os quinze cabeçalhos existem…
    expect(screen.getAllByTestId(/^event-card-header-/)).toHaveLength(NOTIFICATION_EVENTS.length)
    // …e nenhum deles está aberto.
    for (const header of screen.getAllByTestId(/^event-card-header-/)) {
      expect(header, header.getAttribute('data-testid')!).toHaveAttribute('aria-expanded', 'false')
    }
    // A consequência que importa: zero campo de texto de evento na tela. É a diferença entre 13.292px
    // de rolagem e uma tela — medida em navegador, não aqui (jsdom devolve 0 para layout).
    expect(screen.queryAllByTestId(/-subject$/)).toHaveLength(0)
  })
})

describe('NotificationsTab (LEG-07) — fechar não descarta a edição', () => {
  it('editar, FECHAR e reabrir mostra o texto como estava', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    abrirCard('order_paid')
    fireEvent.change(screen.getByTestId('order_paid-subject'), {
      target: { value: 'Texto que a Adri não quer perder' },
    })

    // Fecha clicando no próprio cabeçalho — o mesmo controle que abriu.
    abrirCard('order_paid')
    expect(screen.queryByTestId('order_paid-subject')).toBeNull()

    abrirCard('order_paid')
    expect(screen.getByTestId('order_paid-subject')).toHaveValue('Texto que a Adri não quer perder')
  })

  it('e a edição sobrevive a abrir OUTRO card no meio', async () => {
    // O caminho real: a Adri escreve num evento, vai conferir outro, e volta. Se o rascunho fosse do
    // card em vez do hook, este percurso o perderia — e o caso acima, que reabre o mesmo card,
    // poderia passar mesmo assim numa implementação que guardasse o texto por card montado.
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    abrirCard('order_paid')
    fireEvent.change(screen.getByTestId('order_paid-subject'), {
      target: { value: 'Rascunho do pagamento' },
    })

    abrirCard('order_received')
    expect(screen.getByTestId('order_received-subject')).toBeInTheDocument()

    abrirCard('order_paid')
    expect(screen.getByTestId('order_paid-subject')).toHaveValue('Rascunho do pagamento')
  })
})

describe('NotificationsTab (LEG-06) — no máximo um aberto', () => {
  it('abrir um terceiro card deixa exatamente UM aberto', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    abrirCard('order_received')
    abrirCard('order_paid')
    abrirCard('payment_rejected')

    const abertos = screen
      .getAllByTestId(/^event-card-header-/)
      .filter(h => h.getAttribute('aria-expanded') === 'true')

    expect(abertos).toHaveLength(1)
    expect(abertos[0].getAttribute('data-testid')).toBe('event-card-header-payment_rejected')
  })

  it('LEG-10: REABRIR o card não traz de volta a prévia que estava aberta', async () => {
    // O sensor de mutação achou este buraco: apagar `setPreview(null)` de `alternarCard` deixava a
    // suíte inteira verde. A asserção que existia media a prévia DENTRO do card já recolhido — e lá
    // o iframe está ausente de qualquer jeito, porque o corpo inteiro sai do DOM (`LEG-05`).
    // Verdadeira nos dois mundos.
    //
    // A consequência real do mutante só aparece na VOLTA: o card reabre mostrando a prévia de um
    // texto que pode ter mudado desde então, com o botão dizendo "Fechar prévia" — e a Adri lendo um
    // e-mail que a loja não manda mais.
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    abrirCard('order_received')
    fireEvent.click(screen.getByTestId('order_received-toggle-preview'))
    await waitFor(() => expect(screen.getByTestId('email-preview-iframe')).toBeInTheDocument())

    abrirCard('order_paid')
    abrirCard('order_received')

    // Está aberto mesmo — sem isto, as duas asserções abaixo passariam com o card fechado.
    expect(screen.getByTestId('event-card-header-order_received')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('order_received-subject')).toBeInTheDocument()

    expect(screen.queryByTestId('email-preview-iframe')).toBeNull()
    // E o botão VOLTOU a oferecer a prévia: ele lê `previewActive`, que é o estado que o mutante
    // deixava vivo. É a asserção que discrimina mesmo se um dia o iframe passar a ser preguiçoso.
    expect(screen.getByTestId('order_received-toggle-preview')).toHaveTextContent('Ver prévia')
  })

  it('clicar no cabeçalho do card ABERTO o fecha, e nenhum outro abre no lugar', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    abrirCard('order_paid')
    abrirCard('order_paid')

    const abertos = screen
      .getAllByTestId(/^event-card-header-/)
      .filter(h => h.getAttribute('aria-expanded') === 'true')

    expect(abertos).toHaveLength(0)
  })
})

describe('NotificationsTab (LEG-17) — a contagem de cada grupo é DERIVADA', () => {
  it('cada cabeçalho de grupo mostra a contagem real de eventos daquele grupo', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    const grupos = groupedEvents()

    // A esperada sai de `groupedEvents()`, que é a MESMA função que a tela usa para montar a lista —
    // e é por isso que a âncora abaixo existe: sem ela, a derivação provaria que ela é igual a si
    // mesma com zero eventos em cada balde.
    for (const section of NOTIFICATION_SECTIONS) {
      const n = grupos[section].length
      expect(n, section).toBeGreaterThan(0)
      expect(screen.getByTestId(`notifications-count-${section}`)).toHaveTextContent(`${n} eventos`)
    }

    // E a soma bate com os quinze: um grupo que perdesse eventos para outro passaria nas três
    // asserções acima.
    expect(NOTIFICATION_SECTIONS.reduce((t, s) => t + grupos[s].length, 0)).toBe(
      NOTIFICATION_EVENTS.length,
    )
  })

  it('o número não está cravado no texto — ele acompanha a lista', async () => {
    // O modo de falha que isto prende é a contagem escrita à mão ("5 eventos"), que fica certa hoje
    // e mente no dia em que a feature 43 acrescentar um evento — em silêncio.
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    const grupos = groupedEvents()
    const cardsDoGrupo = (section: (typeof NOTIFICATION_SECTIONS)[number]) =>
      within(screen.getByTestId(`notifications-section-${section}`)).getAllByTestId(/^event-card-header-/)
        .length

    for (const section of NOTIFICATION_SECTIONS) {
      expect(cardsDoGrupo(section), section).toBe(grupos[section].length)
      expect(screen.getByTestId(`notifications-count-${section}`)).toHaveTextContent(
        `${cardsDoGrupo(section)} evento`,
      )
    }
  })
})

describe('NotificationsTab (LEG-18) — o campo de prévia fica na linha do título', () => {
  it('o campo e o título são irmãos na MESMA linha, e ela vira coluna abaixo de `lg`', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('notifications-preview-order-id')).toBeInTheDocument())

    const linha = screen.getByTestId('notifications-header')

    // As duas metades da AC precisam de asserção POSITIVA cada uma (`L-029`): a negação desenhada
    // para tolerar o prefixo `lg:` não prova que o `lg:` existe.
    expect(linha.className).toContain('flex-col')
    expect(linha.className).toContain('lg:flex-row')

    // E o campo está DENTRO dessa linha, não num bloco acima dela — que é onde ele morava antes
    // desta feature e o que `LEG-18` move.
    expect(linha.contains(screen.getByTestId('notifications-preview-order-id'))).toBe(true)
    expect(within(linha).getByText('Notificações')).toBeInTheDocument()
  })

  it('o TÍTULO da seção é `lg:`-only — no celular quem nomeia é o cabeçalho de voltar', () => {
    // Achado em navegador real, em 390px: o `PageHeader` com `backTo` da `AdminSettingsPage` já
    // escreve "Notificações" e descreve a seção, e este bloco imprimia o nome **duas vezes
    // seguidas**, com duas descrições diferentes, antes do primeiro evento.
    //
    // As duas metades com asserção POSITIVA (`L-029`): escondido por padrão E visível a partir de
    // `lg`. Só a primeira deixaria o título sumir do desktop, onde o `PageHeader` diz
    // "Configurações" e ninguém mais nomearia a seção.
    renderTab()
    const titulo = screen.getByText('Notificações').closest('div')!

    expect(titulo.className).toContain('hidden')
    expect(titulo.className).toContain('lg:block')

    // O CAMPO não some junto — ele é controle, não título, e não tem duplicata no celular.
    const campo = screen.getByTestId('notifications-preview-order-id')
    expect(campo.closest('.hidden')).toBeNull()
  })
})
