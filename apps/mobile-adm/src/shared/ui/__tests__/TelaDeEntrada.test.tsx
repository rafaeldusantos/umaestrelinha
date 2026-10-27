import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import lockup from '@/shared/assets/uma-estrelinha-lockup-negativo.svg?raw'
import TelaDeEntrada from '../TelaDeEntrada'

// O cabeçalho do protótipo (`Ateliê Admin.dc.html`, tela Login): a faixa `primary-strong` com o
// lockup negativo a 260 px e o rótulo embaixo. jsdom não mede layout — a largura é provada pela
// classe; o desenho em 390 px, no navegador.
describe('TelaDeEntrada — o cabeçalho', () => {
  const montar = () => render(<TelaDeEntrada><p>conteúdo</p></TelaDeEntrada>)

  it('desenha o MESMO lockup que a splash importa, inline, com nome acessível', () => {
    montar()
    const marca = screen.getByRole('img', { name: 'Uma Estrelinha — eternizando suas lembranças' })
    const referencia = document.createElement('div')
    referencia.innerHTML = lockup
    expect(referencia.querySelector('svg')).not.toBeNull()
    expect(marca.innerHTML).toBe(referencia.innerHTML)
    expect(marca.querySelector('img')).toBeNull()
    expect(marca.className.split(/\s+/)).toContain('w-[260px]')
  })

  it('a faixa é `primary-strong`, e o rótulo vem depois do lockup em `on-primary`', () => {
    montar()
    const faixa = screen.getByRole('banner')
    expect(faixa.className.split(/\s+/)).toContain('bg-estrelinha-primary-strong')
    const rotulo = screen.getByText('Ateliê · painel')
    expect(faixa).toContainElement(rotulo)
    expect(rotulo.className.split(/\s+/)).toContain('text-estrelinha-on-primary')
    expect(faixa.firstElementChild).toBe(screen.getByTestId('entrada-lockup'))
  })

  it('o conteúdo e o aviso de acesso restrito ficam FORA da faixa', () => {
    montar()
    const faixa = screen.getByRole('banner')
    expect(faixa).not.toContainElement(screen.getByText('conteúdo'))
    expect(faixa).not.toContainElement(screen.getByText('Acesso restrito a quem cuida da loja.'))
  })
})
