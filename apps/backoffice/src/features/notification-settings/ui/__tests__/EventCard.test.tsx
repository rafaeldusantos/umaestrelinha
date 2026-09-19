import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { EmailFields, EventChannelSettings } from '@estrelinha/core/notifications'
import { COPY_LIMITS } from '@estrelinha/core/notifications'
import { EventCard } from '../EventCard'

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
        refusal="O endereço do ateliê está vazio — preencha o logradouro na aba Material antes de ligar este aviso."
        warnings={[]}
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
        warnings={['Nenhum e-mail cadastrado para você.']}
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
        warnings={['aviso de e-mail ausente', 'aviso de link fora de produção']}
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    const banner = screen.getByTestId('event-warnings-owner_material_incoming')
    expect(banner).toHaveTextContent('aviso de e-mail ausente')
    expect(banner).toHaveTextContent('aviso de link fora de produção')
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
        onTogglePreview={noop}
        previewActive={false}
      />,
    )
    expect(screen.getByTestId('order_paid-extra-remove-0').className).toContain('h-11')
    expect(screen.getByTestId('order_paid-extra-remove-0').className).toContain('w-11')
  })
})
