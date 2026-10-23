import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Destino from './Destino'

/** Monta um bloco da Início em `/`, com `/pedidos` desenhando o endereço a que se chegou. */
export const montarNaInicio = (bloco: ReactNode) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={bloco} />
        <Route path="/pedidos" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )

export const destino = () => screen.getByTestId('destino').textContent
