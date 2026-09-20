import { describe, expect, it, vi } from 'vitest'
import { render as rtlRender, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { EmailFields, EventChannelSettings } from '@estrelinha/core/notifications'
import {
  COPY_LIMITS,
  NOTIFICATION_EVENT_DESCRIPTIONS,
  NOTIFICATION_EVENT_LABELS,
  NOTIFICATION_EVENT_NAMES,
} from '@estrelinha/core/notifications'
import { settingsSectionPath } from '@/shared/lib/settingsSections'
import { EventCard, type EventCardProps } from '../EventCard'

/**
 * Desde a feature 55 o banner de aviso pode carregar um `<Link>` para a seção onde o ajuste se
 * resolve (`CFG-21`), e `<Link>` fora de um Router lança. O embrulho fica aqui, num lugar só, em vez
 * de nos dezesseis `render` do arquivo.
 */
const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const fields = (overrides: Partial<EmailFields> = {}): EmailFields => ({
  subject: 'Pedido {{numero_pedido}} pago',
  heading: 'Pagamento aprovado',
  lead: 'Recebemos seu pagamento.',
  extra: ['Status: pagamento aprovado'],
  cta_label: 'Acompanhar em Minha conta',
  ...overrides,
})

const value = (overrides: Partial<EmailFields> = {}, enabled = true): EventChannelSettings<EmailFields> => ({
  enabled,
  fields: fields(overrides),
})

const noop = () => {}

describe('EventCard (ABN-02) — exatamente os 5 campos editáveis', () => {
  it('renderiza subject, heading, lead, extra e cta_label — e nenhum outro campo de estrutura', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )

    expect(screen.getByTestId('order_paid-subject')).toHaveValue('Pedido {{numero_pedido}} pago')
    expect(screen.getByTestId('order_paid-heading')).toHaveValue('Pagamento aprovado')
    expect(screen.getByTestId('order_paid-lead')).toHaveValue('Recebemos seu pagamento.')
    expect(screen.getByTestId('order_paid-extra-0')).toHaveValue('Status: pagamento aprovado')
    expect(screen.getByTestId('order_paid-cta_label')).toHaveValue('Acompanhar em Minha conta')

    // Nenhum campo de itens, totais, endereço, rastreio, casca ou destino do CTA — código com dono
    // próprio (`render/layout.ts`), fora do escopo desta feature (spec.md, AC 2).
    expect(screen.queryByLabelText(/ite(m|ns)/i)).toBeNull()
    expect(screen.queryByLabelText(/total/i)).toBeNull()
    expect(screen.queryByLabelText(/endere[çc]o/i)).toBeNull()
    expect(screen.queryByLabelText(/rastreio/i)).toBeNull()
    expect(screen.queryByLabelText(/destino/i)).toBeNull()
  })

  it('contador de caracteres por campo, contra COPY_LIMITS', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )

    expect(screen.getByText(`${'Pedido {{numero_pedido}} pago'.length}/${COPY_LIMITS.subject}`)).toBeInTheDocument()
    expect(screen.getByText(`${'Pagamento aprovado'.length}/${COPY_LIMITS.heading}`)).toBeInTheDocument()
    expect(screen.getByText(`${'Recebemos seu pagamento.'.length}/${COPY_LIMITS.lead}`)).toBeInTheDocument()
    expect(
      screen.getByText(`${'Acompanhar em Minha conta'.length}/${COPY_LIMITS.ctaLabel}`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`${'Status: pagamento aprovado'.length}/${COPY_LIMITS.extraLine}`),
    ).toBeInTheDocument()
  })

  it('editar cada campo chama onFieldChange com o nome do campo certo', () => {
    const onFieldChange = vi.fn()
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={onFieldChange}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )

    fireEvent.change(screen.getByTestId('order_paid-subject'), { target: { value: 'Novo assunto' } })
    expect(onFieldChange).toHaveBeenCalledWith('subject', 'Novo assunto')

    fireEvent.change(screen.getByTestId('order_paid-heading'), { target: { value: 'Novo título' } })
    expect(onFieldChange).toHaveBeenCalledWith('heading', 'Novo título')

    fireEvent.change(screen.getByTestId('order_paid-cta_label'), { target: { value: 'Abrir' } })
    expect(onFieldChange).toHaveBeenCalledWith('cta_label', 'Abrir')
  })

  it('extra[] tem no máximo 5 linhas — o botão de adicionar some na quinta', () => {
    render(
      <EventCard
        event="order_paid"
        value={value({ extra: ['a', 'b', 'c', 'd', 'e'] })}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByTestId('order_paid-extra-0')).toBeInTheDocument()
    expect(screen.getByTestId('order_paid-extra-4')).toBeInTheDocument()
    expect(screen.queryByTestId('order_paid-extra-add')).toBeNull()
  })

  it('remover uma linha de extra chama onFieldChange("extra", …) sem aquela linha', () => {
    const onFieldChange = vi.fn()
    render(
      <EventCard
        event="order_paid"
        value={value({ extra: ['primeira', 'segunda'] })}
        onFieldChange={onFieldChange}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    fireEvent.click(screen.getByTestId('order_paid-extra-remove-0'))
    expect(onFieldChange).toHaveBeenCalledWith('extra', ['segunda'])
  })
})

describe('EventCard — toggle e recusa inline', () => {
  it('o toggle reflete `value.enabled` e chama onToggle ao clicar', () => {
    const onToggle = vi.fn()
    render(
      <EventCard
        event="order_paid"
        value={value({}, false)}
        onFieldChange={noop}
        onToggle={onToggle}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    const switchEl = screen.getByRole('switch')
    expect(switchEl).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(switchEl)
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('a recusa de `refusalFor` aparece inline, com role="alert"', () => {
    render(
      <EventCard
        event="material_instructions"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal="O endereço do ateliê está vazio — preencha o logradouro na seção Frete e Material antes de ligar este aviso."
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('O endereço do ateliê está vazio')
  })

  it('sem recusa, nenhum role="alert" aparece', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('EventCard (ABN-09) — banner de aviso não-bloqueante', () => {
  it('com warnings, um banner aparece acima dos campos — e o toggle continua clicável', () => {
    const onToggle = vi.fn()
    render(
      <EventCard
        event="owner_order_paid"
        value={value({}, false)}
        onFieldChange={noop}
        onToggle={onToggle}
        refusal={null}
        warnings={[{ text: 'Nenhum e-mail cadastrado para você.' }]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByTestId('event-warnings-owner_order_paid')).toHaveTextContent(
      'Nenhum e-mail cadastrado para você.',
    )
    // O aviso nunca desabilita o toggle (design.md: "nunca some o card nem desabilita o toggle").
    fireEvent.click(screen.getByRole('switch'))
    expect(onToggle).toHaveBeenCalledWith(true)
  })

  it('sem warnings, nenhum banner aparece', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.queryByTestId('event-warnings-order_paid')).toBeNull()
  })

  it('dois avisos independentes (e-mail vazio + URL local) aparecem juntos, com textos distintos', () => {
    render(
      <EventCard
        event="owner_material_incoming"
        value={value({}, false)}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[{ text: 'aviso de e-mail ausente' }, { text: 'aviso de link fora de produção' }]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    const banner = screen.getByTestId('event-warnings-owner_material_incoming')
    expect(banner).toHaveTextContent('aviso de e-mail ausente')
    expect(banner).toHaveTextContent('aviso de link fora de produção')
  })
})

describe('EventCard (CFG-20, CFG-21) — o aviso nomeia a seção e leva até ela', () => {
  const avisoDoMaterial = {
    text: 'O endereço do ateliê ainda não foi preenchido na seção Frete e Material — o texto usa {{endereco_atelie}}, que sairia em branco.',
    action: { to: settingsSectionPath('frete-e-material'), label: 'Preencher' },
  }

  const montarComAviso = () =>
    render(
      <EventCard
        event="material_instructions"
        value={value({}, false)}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[avisoDoMaterial]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )

  it('o texto do aviso continua sendo UM nó — o link não parte a frase', () => {
    // É o que mantém `getByText('a frase inteira')` casando. Um `<Link>` no meio do parágrafo
    // quebraria esta asserção e todas as irmãs dela.
    montarComAviso()
    expect(screen.getByText(avisoDoMaterial.text)).toBeInTheDocument()
  })

  it('o aviso NÃO fala em "aba" — elas não existem mais', () => {
    montarComAviso()
    const banner = screen.getByTestId('event-warnings-material_instructions')

    expect(banner.textContent).toContain('seção Frete e Material')
    expect(banner.textContent).not.toMatch(/(?:^|\s)aba(?![-\wà-ú])/i)
  })

  it('CFG-21: o aviso oferece o caminho, e ele é o da seção que contém o campo', () => {
    // A mensagem é lida exatamente quando a Adri está travada — nomear o lugar sem levar até ele
    // deixa o trabalho de procurar com quem já não conseguiu ligar o aviso.
    montarComAviso()
    expect(screen.getByTestId('event-warning-link-material_instructions')).toHaveAttribute(
      'href',
      '/admin/configuracoes/frete-e-material',
    )
  })

  it('aviso SEM caminho de conserto não inventa link', () => {
    // O par do caso acima. Os dois avisos de `owner_*` não têm um campo único a apontar — um é
    // e-mail em Dados da loja, o outro é um secret de servidor —, e um botão "Preencher" ali
    // prometeria uma tela que não resolve.
    render(
      <EventCard
        event="owner_order_paid"
        value={value({}, false)}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[{ text: 'Nenhum e-mail cadastrado para você.' }]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )

    expect(screen.queryByTestId('event-warning-link-owner_order_paid')).toBeNull()
    expect(screen.getByTestId('event-warnings-owner_order_paid').querySelector('a')).toBeNull()
  })
})

describe('EventCard (ABN-06) — "ver prévia" monta o EmailPreviewFrame', () => {
  it('previewActive: false não monta a prévia; clicar chama onTogglePreview', () => {
    const onTogglePreview = vi.fn()
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={onTogglePreview}
        previewActive={false}
      />,
    )
    expect(screen.queryByTestId('email-preview-frame')).toBeNull()
    fireEvent.click(screen.getByTestId('order_paid-toggle-preview'))
    expect(onTogglePreview).toHaveBeenCalledTimes(1)
  })

  it('previewActive: true monta o EmailPreviewFrame com o resultado recebido do pai', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive
        preview={{ subject: 'Assunto', html: '<p>corpo</p>', text: 'corpo', sample: true, loading: false }}
      />,
    )
    const iframe = screen.getByTestId('email-preview-iframe') as HTMLIFrameElement
    expect(iframe.getAttribute('srcdoc')).toBe('<p>corpo</p>')
    expect(screen.getByTestId('preview-sample-badge')).toBeInTheDocument()
  })
})

describe('EventCard — alvo de toque (ABN-10)', () => {
  it('o botão de "ver prévia" tem ao menos 44px de altura', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByTestId('order_paid-toggle-preview').className).toContain('h-11')
  })

  it('o switch tem a área de toque ESTENDIDA (medido em navegador: o Switch cru é 24px de altura)', () => {
    render(
      <EventCard
        event="order_paid"
        value={value()}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByRole('switch').className).toContain('before:absolute')
  })

  it('o botão de remover linha extra tem ao menos 44px', () => {
    render(
      <EventCard
        event="order_paid"
        value={value({ extra: ['linha única'] })}
        onFieldChange={noop}
        onToggle={noop}
        refusal={null}
        warnings={[]}
        expanded
        onToggleExpanded={noop}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByTestId('order_paid-extra-remove-0').className).toContain('h-11')
    expect(screen.getByTestId('order_paid-extra-remove-0').className).toContain('w-11')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Feature 56 — o card recolhível
// ───────────────────────────────────────────────────────────────────────────

/**
 * Os casos acima passam `expanded`, porque é do card ABERTO que eles falam. Daqui para baixo o
 * estado é o assunto, então ele é sempre explícito — e o default do helper é `false`, que é como o
 * card nasce em produção.
 */
const cartao = (props: Partial<EventCardProps> = {}) =>
  render(
    <EventCard
      event="order_paid"
      value={value()}
      onFieldChange={noop}
      onToggle={noop}
      refusal={null}
      warnings={[]}
      expanded={false}
      onToggleExpanded={noop}
      onTogglePreview={noop}
      previewActive={false}
      {...props}
    />,
  )

describe('EventCard (LEG-05) — recolhido não tem campo nenhum no DOM', () => {
  it('nenhum dos cinco campos existe quando o card está recolhido', () => {
    cartao()

    // Ausência no DOM, e não escondido por CSS: 15 cards × 5 campos escondidos continuariam custando
    // 75 nós de formulário, alcançáveis por tabulação dentro de cartões fechados.
    for (const campo of ['subject', 'heading', 'lead', 'cta_label', 'extra-0']) {
      expect(screen.queryByTestId(`order_paid-${campo}`), campo).toBeNull()
    }
    expect(screen.queryByTestId('order_paid-toggle-preview')).toBeNull()
  })

  it('e todos aparecem quando ele abre — a metade positiva', () => {
    // Sem esta, a asserção acima seria verdadeira num card que não sabe abrir.
    cartao({ expanded: true })

    for (const campo of ['subject', 'heading', 'lead', 'cta_label', 'extra-0']) {
      expect(screen.getByTestId(`order_paid-${campo}`), campo).toBeInTheDocument()
    }
  })
})

describe('EventCard (LEG-09) — o cabeçalho é um controle de verdade', () => {
  it('é um <button>, e não um <div> com onClick', () => {
    // Não é purismo: `<button>` ativa por Enter **e** por Espaço pelo navegador, que é o que
    // `LEG-09` pede. Um `<div onClick>` renderiza igual, clica igual, e não faz nenhum dos dois — e
    // jsdom não sintetiza a ação padrão do teclado, então nenhum `fireEvent.keyDown` distinguiria
    // os dois mundos. Quem discrimina é a TAG. (`SettingsSectionNav` precisou de um handler de
    // Espaço à mão justamente porque lá o controle é um `<a>`, que não ativa por Espaço.)
    cartao()
    const header = screen.getByTestId('event-card-header-order_paid')

    expect(header.tagName).toBe('BUTTON')
    expect(header).toHaveAttribute('type', 'button')
  })

  it('`aria-expanded` acompanha o estado, nos dois sentidos', () => {
    const { unmount } = cartao()
    expect(screen.getByTestId('event-card-header-order_paid')).toHaveAttribute('aria-expanded', 'false')
    unmount()

    cartao({ expanded: true })
    expect(screen.getByTestId('event-card-header-order_paid')).toHaveAttribute('aria-expanded', 'true')
  })

  it('clicar no cabeçalho chama onToggleExpanded', () => {
    const onToggleExpanded = vi.fn()
    cartao({ onToggleExpanded })

    fireEvent.click(screen.getByTestId('event-card-header-order_paid'))

    expect(onToggleExpanded).toHaveBeenCalledTimes(1)
  })
})

describe('EventCard (LEG-08) — o interruptor não abre o card', () => {
  it('clicar no interruptor chama onToggle e NÃO onToggleExpanded', () => {
    const onToggle = vi.fn()
    const onToggleExpanded = vi.fn()
    cartao({ onToggle, onToggleExpanded })

    fireEvent.click(screen.getByRole('switch'))

    expect(onToggle).toHaveBeenCalledWith(false)
    expect(onToggleExpanded).not.toHaveBeenCalled()
  })

  it('o interruptor é IRMÃO do cabeçalho, nunca filho dele', () => {
    // A asserção acima é verdadeira também com um `stopPropagation` costurado no handler — e nesse
    // mundo o HTML continua inválido (controle dentro de controle), e o nome acessível do botão
    // engole o do interruptor. Esta mede a ESTRUTURA, que é onde a regra de fato mora.
    cartao()
    const header = screen.getByTestId('event-card-header-order_paid')
    const interruptor = screen.getByRole('switch')

    expect(header.contains(interruptor)).toBe(false)
    expect(header.querySelector('button')).toBeNull()
  })
})

describe('EventCard (LEG-11) — recolhido, a pendência vira sinal na linha', () => {
  it('recusa recolhida aparece como sinal, com o MOTIVO no nome acessível', () => {
    cartao({ refusal: 'O assunto tem 130 caracteres; o limite é 120.' })

    // O motivo inteiro, não um "atenção" genérico: quem usa leitor de tela recebe a mesma informação
    // que quem abre o card.
    expect(screen.getByTestId('event-flag-refusal-order_paid')).toHaveTextContent(
      'O assunto tem 130 caracteres; o limite é 120.',
    )
  })

  it('aviso recolhido aparece como sinal, com o texto do aviso', () => {
    cartao({ warnings: [{ text: 'O endereço do ateliê ainda não foi preenchido.' }] })

    expect(screen.getByTestId('event-flag-warning-order_paid')).toHaveTextContent(
      'O endereço do ateliê ainda não foi preenchido.',
    )
  })

  it('sem recusa e sem aviso, nenhum sinal — a régua não vira "sempre acusa"', () => {
    cartao()

    expect(screen.queryByTestId('event-flag-refusal-order_paid')).toBeNull()
    expect(screen.queryByTestId('event-flag-warning-order_paid')).toBeNull()
  })

  it('ABERTO, os sinais somem — o banner e a recusa inline já dizem a mesma coisa', () => {
    cartao({
      expanded: true,
      refusal: 'O assunto tem 130 caracteres; o limite é 120.',
      warnings: [{ text: 'O endereço do ateliê ainda não foi preenchido.' }],
    })

    expect(screen.queryByTestId('event-flag-refusal-order_paid')).toBeNull()
    expect(screen.queryByTestId('event-flag-warning-order_paid')).toBeNull()
    // …e as duas formas longas estão lá, que é o que torna a remoção acima correta em vez de perda.
    expect(screen.getByTestId('event-card-refusal-order_paid')).toBeInTheDocument()
    expect(screen.getByTestId('event-warnings-order_paid')).toBeInTheDocument()
  })
})

describe('EventCard (LEG-01, LEG-02) — o nome vem do catálogo, não do histórico', () => {
  it('o título do card é o NOME do evento, e nunca o rótulo de histórico', () => {
    cartao()

    expect(screen.getByText(NOTIFICATION_EVENT_NAMES.order_paid)).toBeInTheDocument()
    // A metade que prende o defeito: o rótulo de histórico está no passado ("Aviso de pagamento
    // aprovado enviado") e se lia como registro de log acima de um interruptor desligado.
    expect(screen.queryByText(NOTIFICATION_EVENT_LABELS.order_paid)).toBeNull()
  })

  it('a descrição de quando o evento dispara existe SÓ com o card aberto', () => {
    const { unmount } = cartao()
    expect(screen.queryByText(NOTIFICATION_EVENT_DESCRIPTIONS.order_paid)).toBeNull()
    unmount()

    cartao({ expanded: true })
    expect(screen.getByText(NOTIFICATION_EVENT_DESCRIPTIONS.order_paid)).toBeInTheDocument()
  })
})

describe('EventCard (LEG-13, LEG-15, LEG-21) — a forma do cabeçalho', () => {
  const caixaDoIcone = () =>
    screen.getByTestId('event-card-header-order_paid').querySelector('span')!

  it('o ícone muda de tom entre recolhido e aberto', () => {
    const { unmount } = cartao()
    expect(caixaDoIcone().className).toContain('bg-muted')
    expect(caixaDoIcone().className).not.toContain('bg-primary/10')
    unmount()

    cartao({ expanded: true })
    expect(caixaDoIcone().className).toContain('bg-primary/10')
    expect(caixaDoIcone().className).not.toContain('bg-muted')
  })

  it('o cabeçalho tem piso de 44px de alvo de toque', () => {
    // Por token exato: `h-11` é substring de `min-h-11`, então uma régua de `toContain('h-11')`
    // passaria com a classe errada (`L-034`).
    cartao()
    const classes = screen.getByTestId('event-card-header-order_paid').className.split(/\s+/)

    expect(classes).toContain('min-h-11')
  })

  it('o cabeçalho não tem caixa dentro de caixa — o `ToggleField` saiu', () => {
    // `ToggleField` desenha `rounded-xl border border-border p-3` em volta do rótulo e do
    // interruptor, e dentro da moldura do card isso produzia duas bordas concêntricas. A régua é a
    // ausência de `border-border` no cabeçalho e na linha que o contém — o divisor do corpo, que é
    // `border-t`, é outro elemento e fica fora.
    cartao()
    const header = screen.getByTestId('event-card-header-order_paid')

    expect(header.className).not.toContain('border-border')
    expect(header.parentElement!.className).not.toContain('border-border')
  })
})
