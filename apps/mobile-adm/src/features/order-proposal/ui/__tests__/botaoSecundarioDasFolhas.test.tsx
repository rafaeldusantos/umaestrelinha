// O botão de ficar das folhas do pedido montado e da montagem ("Manter", "Continuar montando",
// "Cancelar" da leitura do texto) é o secundário do protótipo: com contorno `primary`, texto `primary`,
// fundo transparente e 48 px de altura. Classe por token exato (`border` não é `border-2`). A folha
// fica aberta de propósito (o `controle` é fixo). A fiação pela página real está em
// `pages/__tests__/pedidoMontado.desenho.test.tsx` e `montarPedido.rascunho.test.tsx`.
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import FolhaColarTexto from '../FolhaColarTexto'
import FolhaDeConfirmacao from '../FolhaDeConfirmacao'

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const controle = () => ({ aberta: true, abrir: vi.fn(), fechar: vi.fn() })

const ehSecundario = (botao: HTMLElement) => {
  const t = tokens(botao)
  expect(t).toEqual(expect.arrayContaining(['border', 'border-estrelinha-primary', 'text-estrelinha-primary', 'min-h-12', 'rounded-sm']))
  expect(t).not.toContain('bg-estrelinha-ink')
  expect(t).not.toContain('bg-estrelinha-primary')
}

describe('o botão de ficar das folhas tem contorno', () => {
  it('"Manter" da folha de confirmação', () => {
    render(
      <FolhaDeConfirmacao
        controle={controle()}
        titulo="Cancelar P-0042?"
        frase="O link deixa de abrir."
        manter="Manter"
        confirmar="Cancelar pedido"
        travado={false}
        erro={null}
        aoConfirmar={vi.fn()}
      />,
    )
    const folha = screen.getByRole('dialog')
    ehSecundario(within(folha).getByRole('button', { name: 'Manter' }))
    expect(tokens(within(folha).getByRole('button', { name: 'Cancelar pedido' }))).not.toContain('border')
  })

  it('"Continuar montando" da folha de sair, com a alternativa', () => {
    render(
      <FolhaDeConfirmacao
        controle={controle()}
        titulo="Sair sem criar o link?"
        frase="As peças ficam guardadas."
        manter="Continuar montando"
        confirmar="Descartar"
        travado={false}
        erro={null}
        aoConfirmar={vi.fn()}
        alternativa={{ rotulo: 'Guardar rascunho', aoEscolher: vi.fn() }}
      />,
    )
    const folha = screen.getByRole('dialog')
    ehSecundario(within(folha).getByRole('button', { name: 'Continuar montando' }))
    ehSecundario(within(folha).getByRole('button', { name: 'Guardar rascunho' }))
  })

  it('"Cancelar" (e "Preencher à mão") da folha de colar o texto', () => {
    const { rerender } = render(<FolhaColarTexto controle={controle()} escopo="contact_and_address" lendo={false} erro={null} aoLer={vi.fn()} />)
    ehSecundario(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    rerender(<FolhaColarTexto controle={controle()} escopo="contact_and_address" lendo={false} erro="Não achei dados neste texto." aoLer={vi.fn()} />)
    ehSecundario(within(screen.getByRole('dialog')).getByRole('button', { name: 'Preencher à mão' }))
  })
})
