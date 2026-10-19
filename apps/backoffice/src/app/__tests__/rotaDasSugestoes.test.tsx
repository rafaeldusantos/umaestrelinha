// Feature 67 (T08) — `/admin/filtros/sugestoes` abre a FILA, e não o editor de um grupo chamado
// "sugestoes".
//
// O `App.tsx` não monta em teste (auth, layout, quarenta telas), então a régua lê as rotas de
// `/admin/filtros` DO DISCO — caminho e elemento, na ordem em que estão escritas — e as remonta num
// `MemoryRouter` com um marcador no lugar de cada página. O que se prova é a combinação de verdade: as
// rotas que o arquivo declara, decididas pelo ranking do react-router v6. Um `:groupId` que viesse
// antes, ou a rota estática apagada, faria o caminho abrir `AdminFiltersPage`.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')

const rotasDosFiltros = (fonte: string): { path: string; element: string }[] =>
  [...fonte.matchAll(/<Route\s+path="(\/admin\/filtros[^"]*)"\s+element=\{<(\w+)\s*\/>\}\s*\/>/g)].map(m => ({
    path: m[1],
    element: m[2],
  }))

const abrir = (rotas: { path: string; element: string }[], url: string) => {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        {rotas.map(r => (
          <Route key={r.path} path={r.path} element={<p>{r.element}</p>} />
        ))}
      </Routes>
    </MemoryRouter>,
  )
}

describe('a rota da fila', () => {
  const rotas = rotasDosFiltros(APP)

  it('âncora: o arquivo declara as QUATRO rotas de /admin/filtros, auto-fechadas', () => {
    expect(rotas.map(r => r.path)).toEqual([
      '/admin/filtros',
      '/admin/filtros/sugestoes',
      '/admin/filtros/:groupId',
      '/admin/filtros/:groupId/valores/:valueId',
    ])
  })

  it('/admin/filtros/sugestoes abre a fila', () => {
    abrir(rotas, '/admin/filtros/sugestoes')
    expect(screen.getByText('AdminFilterSuggestionsPage')).toBeInTheDocument()
  })

  it('/admin/filtros/<id> continua abrindo o grupo', () => {
    abrir(rotas, '/admin/filtros/abc')
    expect(screen.getByText('AdminFiltersPage')).toBeInTheDocument()
  })

  it('sensor: sem a rota estática, o mesmo caminho cairia no editor do grupo', () => {
    abrir(
      rotas.filter(r => r.path !== '/admin/filtros/sugestoes'),
      '/admin/filtros/sugestoes',
    )
    expect(screen.getByText('AdminFiltersPage')).toBeInTheDocument()
  })
})
