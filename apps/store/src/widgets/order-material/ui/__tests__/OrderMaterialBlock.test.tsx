// Feature 22 / T15 e T16 — `MAT-11`, o rastreio da remessa DA CLIENTE.
//
// A invariante que este arquivo guarda vale mais que o layout: **nenhuma policy de `UPDATE` em
// `orders` foi aberta** (PAY-10). A escrita passa por `set_material_tracking`, uma RPC que grava um
// campo só — abrir a policy exporia `payment_status`, `total` e `paid_at` a quem só precisa informar
// um código dos Correios.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
const from = vi.hoisted(() => vi.fn())

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc, from } }))

// Feature 59 (`MAT-06`): o campo passou a depender de sessão. Os casos da feature 22 foram escritos
// quando só a cliente logada chegava aqui — o padrão abaixo é essa mesma cliente, e o bloco da `59`
// no fim do arquivo troca para a convidada quando é ela que está sendo medida.
const { sessao, settings } = vi.hoisted(() => ({
  sessao: { user: { id: 'usr-1' } as { id: string } | null },
  settings: { whatsapp: '51998765432' },
}))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: sessao.user }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => settings,
}))

import OrderMaterialBlock from '../OrderMaterialBlock'

const montar = (props: Partial<React.ComponentProps<typeof OrderMaterialBlock>> = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <OrderMaterialBlock
          orderId="order-1"
          materialStatus="aguardando_material"
          trackingCode={null}
          kinds={['cabelo']}
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ok = (status: string) => ({ data: { ok: true, status, reason: null }, error: null })
const recusa = (reason: string, status = 'nao_aplicavel') => ({
  data: { ok: false, status, reason },
  error: null,
})

beforeEach(() => {
  rpc.mockReset().mockResolvedValue(ok('material_enviado'))
  from.mockReset()
  sessao.user = { id: 'usr-1' }
  settings.whatsapp = '51998765432'
})

describe('OrderMaterialBlock — quando aparece', () => {
  it('pedido `nao_aplicavel` não ganha bloco nenhum', () => {
    const { container } = montar({ materialStatus: 'nao_aplicavel' })
    expect(container).toBeEmptyDOMElement()
  })

  it('estado desconhecido cai em `nao_aplicavel` e também não renderiza', () => {
    const { container } = montar({ materialStatus: 'inventado' })
    expect(container).toBeEmptyDOMElement()
  })

  it('`aguardando_material` mostra a situação, os materiais e o campo', () => {
    montar()
    expect(screen.getByText('Aguardando material')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mecha de cabelo' })).toBeInTheDocument()
    expect(screen.getByLabelText(/registre o código de rastreio/i)).toBeInTheDocument()
  })

  it('pedido sem lista mostra "combinado com a gente", nunca lista vazia', () => {
    montar({ kinds: [] })
    expect(screen.getByText(/combinado com a gente/i)).toBeInTheDocument()
  })

  it('cada material leva à ficha dele', () => {
    montar({ kinds: ['leite_materno'] })
    expect(screen.getByRole('link', { name: 'Leite materno' })).toHaveAttribute(
      'href',
      '/como-enviar-seu-material-de-dna#leite-materno',
    )
  })
})

describe('OrderMaterialBlock — informar é OPCIONAL (MAT-11 AC 10)', () => {
  it('a tela diz que é opcional e que a loja registra no lugar dela', () => {
    // Nada trava se ela não informar: a Adri registra pelo painel, ou marca o recebimento direto.
    montar()
    expect(screen.getByText(/é opcional/i)).toBeInTheDocument()
    expect(screen.getByText(/registramos para você/i)).toBeInTheDocument()
  })

  it('código vazio NÃO chama a RPC', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(rpc).not.toHaveBeenCalled()
  })

  it('código só de espaços NÃO chama a RPC', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(screen.getByText(/digite o código/i)).toBeInTheDocument())
    expect(rpc).not.toHaveBeenCalled()
  })
})

describe('OrderMaterialBlock — a escrita é por RPC, e só ela (MAT-11 AC 11)', () => {
  it('chama `set_material_tracking` com o pedido e o código, e NADA mais', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), {
      target: { value: 'aa123456789br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_material_tracking', {
      p_order_id: 'order-1',
      p_code: 'AA123456789BR',
    })
  })

  it('NUNCA usa `from("orders").update(...)` — a policy de UPDATE segue fechada', () => {
    // PAY-10 é a razão de a RPC existir. Um `PATCH` aqui reabriria o buraco que ela fechou.
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    expect(from).not.toHaveBeenCalled()
  })

  it('recusa mostra MOTIVO VISÍVEL — nunca falha em silêncio', async () => {
    rpc.mockResolvedValue(recusa('not_allowed'))
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() =>
      expect(screen.getByText(/não conseguimos registrar o código/i)).toBeInTheDocument(),
    )
    // E o caminho alternativo continua na tela: avisar a loja.
    expect(screen.getByText(/a gente registra para você/i)).toBeInTheDocument()
  })

  it('erro de rede vira mensagem, não tela quebrada', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'network' } })
    montar()
    fireEvent.change(screen.getByLabelText(/registre o código/i), { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => expect(screen.getByText(/não foi possível registrar/i)).toBeInTheDocument())
  })
})

describe('OrderMaterialBlock — o estado nunca volta para trás (MAT-11 AC 12)', () => {
  it.each(['material_recebido', 'em_producao'])(
    'em `%s` o campo some e a tela diz que já está com a loja',
    status => {
      montar({ materialStatus: status })

      expect(screen.queryByLabelText(/registre o código/i)).not.toBeInTheDocument()
      expect(screen.getByText(/já está com a gente/i)).toBeInTheDocument()
    },
  )

  it('o código já registrado aparece', () => {
    montar({ materialStatus: 'material_enviado', trackingCode: 'AA123456789BR' })
    expect(screen.getByText('AA123456789BR')).toBeInTheDocument()
  })

  it('em `material_enviado` ainda dá para corrigir o código', () => {
    montar({ materialStatus: 'material_enviado', trackingCode: 'AA1BR' })
    expect(screen.getByLabelText(/registre o código/i)).toBeInTheDocument()
  })
})

describe('OrderMaterialBlock — pedido cancelado sai da fila (edge case)', () => {
  it('não oferece o campo, e diz o que acontece com o material', () => {
    montar({ cancelled: true })

    expect(screen.queryByLabelText(/registre o código/i)).not.toBeInTheDocument()
    expect(screen.getByText(/foi cancelado/i)).toBeInTheDocument()
    expect(screen.getByText(/volta para você/i)).toBeInTheDocument()
  })
})

// =================================================================================================
// Feature 59 — o estado do topo "Envie o seu material" e o portão de sessão
// =================================================================================================

describe('OrderMaterialBlock — o estado do topo (MAT-01)', () => {
  it('mostra o título, o campo, o botão e o link do guia com os literais do Paper', () => {
    montar({ variant: 'acao' })

    expect(screen.getByRole('heading', { name: 'Envie o seu material' })).toBeInTheDocument()
    expect(screen.getByLabelText('Código de rastreio do envio')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar código' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Como embalar e enviar o material' })).toHaveAttribute(
      'href',
      '/como-enviar-seu-material-de-dna',
    )
  })

  it('o envio usa o caminho que já existe — a RPC, com o código normalizado (MAT-02)', async () => {
    montar({ variant: 'acao' })
    fireEvent.change(screen.getByLabelText('Código de rastreio do envio'), {
      target: { value: 'aa123456789br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1))
    expect(rpc).toHaveBeenCalledWith('set_material_tracking', {
      p_order_id: 'order-1',
      p_code: 'AA123456789BR',
    })
    expect(from).not.toHaveBeenCalled()
  })

  it.each([
    ['vazio', ''],
    ['só espaço', '    '],
  ])('código %s: não vai à rede e o campo diz "Informe o código de rastreio." (MAT-03)', async (_n, valor) => {
    montar({ variant: 'acao' })
    fireEvent.change(screen.getByLabelText('Código de rastreio do envio'), { target: { value: valor } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(await screen.findByText('Informe o código de rastreio.')).toBeInTheDocument()
    // A frase do hook NÃO aparece: é ela que provaria que a recusa passou pela mutação.
    expect(screen.queryByText(/digite o código/i)).not.toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Código de rastreio do envio')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  it('recusa da RPC: a frase vem de `materialTrackingMessage` e o digitado fica no campo (MAT-04)', async () => {
    rpc.mockResolvedValue(recusa('not_allowed'))
    montar({ variant: 'acao' })
    const campo = screen.getByLabelText('Código de rastreio do envio')
    fireEvent.change(campo, { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    expect(
      await screen.findByText(
        'Não conseguimos registrar o código neste pedido. Entre na sua conta e tente de novo, ou nos avise que a gente registra para você.',
      ),
    ).toBeInTheDocument()
    expect(campo).toHaveValue('AA1BR')
  })

  it('gravou: o campo esvazia (o estado do topo sai pela releitura do pedido, MAT-05)', async () => {
    montar({ variant: 'acao' })
    const campo = screen.getByLabelText('Código de rastreio do envio')
    fireEvent.change(campo, { target: { value: 'AA1BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))

    await waitFor(() => expect(campo).toHaveValue(''))
  })
})

describe('OrderMaterialBlock — a âncora #material (DET-09)', () => {
  it.each([
    ['o bloco', 'bloco' as const],
    ['o estado do topo', 'acao' as const],
  ])('%s é o elemento com id="material"', (_n, variant) => {
    const { container } = montar({ variant })

    expect(container.firstElementChild?.getAttribute('id')).toBe('material')
    expect(container.querySelectorAll('#material')).toHaveLength(1)
  })
})

describe('OrderMaterialBlock — sem sessão, o WhatsApp no lugar do campo (MAT-06)', () => {
  beforeEach(() => {
    sessao.user = null
  })

  it.each([
    ['o estado do topo', 'acao' as const],
    ['o bloco', 'bloco' as const],
  ])('%s: nenhum campo, e o caminho do WhatsApp com o número do pedido', (_n, variant) => {
    montar({ variant, orderNumber: '0244' })

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /enviar código|registrar/i })).not.toBeInTheDocument()
    expect(screen.getByText('Para informar o código, fale com a gente')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'Conversar no WhatsApp' })
    const url = new URL(link.getAttribute('href') as string)
    expect(url.origin + url.pathname).toBe('https://wa.me/51998765432')
    expect(url.searchParams.get('text')).toBe(
      'Olá! Quero informar o código de envio do material do pedido #0244.',
    )
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.className.split(/\s+/)).toContain('min-h-11')
  })

  it('sem número da loja configurado, fica a frase e nenhum link que abra conversa com ninguém', () => {
    settings.whatsapp = ''
    montar({ variant: 'acao', orderNumber: '0244' })

    expect(screen.getByText('Para informar o código, fale com a gente')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Conversar no WhatsApp' })).not.toBeInTheDocument()
  })

  it('sem sessão e com o material já no ateliê, não há campo a substituir — nem o WhatsApp', () => {
    montar({ materialStatus: 'material_recebido' })

    expect(screen.getByText(/já está com a gente/i)).toBeInTheDocument()
    expect(screen.queryByText('Para informar o código, fale com a gente')).not.toBeInTheDocument()
  })

  it('o par inverso: COM sessão, o campo volta e o caminho do WhatsApp some', () => {
    sessao.user = { id: 'usr-1' }
    montar({ variant: 'acao', orderNumber: '0244' })

    expect(screen.getByLabelText('Código de rastreio do envio')).toBeInTheDocument()
    expect(screen.queryByText('Para informar o código, fale com a gente')).not.toBeInTheDocument()
  })
})

// Prova em navegador da `59` (2026-10-04): o campo do código media 21px de altura em 390. Na coluna
// do celular (`flex-col`), `flex-1` vira `flex-basis: 0` e engole o `h-12`. O crescimento só vale na
// linha do `sm:`. Régua por token exato — `sm:flex-1` contém `flex-1` como substring.
describe('OrderMaterialBlock — o campo do código tem 48px no celular', () => {
  it.each(['acao', 'bloco'] as const)('variante %s: h-12 sem flex-1 solto, crescimento só em sm', (variant) => {
    montar({ variant })

    // O mesmo `<input>` nas duas variantes; o rótulo muda (a de baixo mantém a copy da feature 22).
    const campo = document.getElementById('material-tracking')
    expect(campo?.tagName).toBe('INPUT')
    const tokens = (campo?.className ?? '').split(/\s+/)
    expect(tokens).toEqual(expect.arrayContaining(['h-12', 'shrink-0', 'sm:flex-1']))
    expect(tokens).not.toContain('flex-1')
  })
})
