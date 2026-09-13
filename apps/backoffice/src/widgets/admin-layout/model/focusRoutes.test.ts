// Feature 47 — quais rotas pedem o modo de foco.
//
// O que se prova aqui é o recorte: as duas telas de prévia e as subrotas delas entram; qualquer
// outra rota do painel fica de fora, **inclusive** as que começam com as mesmas letras.

import { describe, expect, it } from 'vitest'
import { FOCUS_ROUTES, isFocusRoute } from './focusRoutes'
import { navGroups } from './navItems'

describe('isFocusRoute — FOCO-01: as duas telas que mostram a loja ao lado do editor', () => {
  it('a Home e o Menu da loja pedem foco', () => {
    expect(isFocusRoute('/admin/home')).toBe(true)
    expect(isFocusRoute('/admin/menu')).toBe(true)
  })

  it('a subrota do editor de seção continua sendo a Home', () => {
    expect(isFocusRoute('/admin/home/8f3c-1a')).toBe(true)
  })
})

describe('isFocusRoute — FOCO-07: fora dessas duas, a sidebar é a de sempre', () => {
  it('o Dashboard não pede foco', () => {
    expect(isFocusRoute('/admin')).toBe(false)
  })

  it('as telas de listagem não pedem foco', () => {
    expect(isFocusRoute('/admin/produtos')).toBe(false)
    expect(isFocusRoute('/admin/pedidos')).toBe(false)
    expect(isFocusRoute('/admin/configuracoes')).toBe(false)
  })

  it('rota que só COMEÇA com as mesmas letras não conta — o casamento é por segmento', () => {
    // Se fosse `startsWith` cru, as três passariam por Home ou por Menu.
    expect(isFocusRoute('/admin/homologacao')).toBe(false)
    expect(isFocusRoute('/admin/homens')).toBe(false)
    expect(isFocusRoute('/admin/menus-antigos')).toBe(false)
  })

  it('a página de perguntas da loja, vizinha das duas no grupo Loja, NÃO pede foco', () => {
    // Ela não tem prévia ao lado: é lista e formulário, e 240px de rótulo lido valem mais ali.
    expect(isFocusRoute('/admin/perguntas-frequentes')).toBe(false)
  })
})

describe('FOCUS_ROUTES — âncora: toda rota de foco é um destino da navegação', () => {
  it('cada entrada existe em navGroups', () => {
    const destinos = navGroups.flatMap(grupo => grupo.items.map(item => item.to))

    // Sem esta âncora, uma rota de foco escrita errada (ou renomeada em `navItems` e esquecida
    // aqui) viraria um endereço que o trilho não sabe marcar: a navegação recolheria e nenhum
    // ícone ficaria aceso.
    expect(FOCUS_ROUTES.length).toBeGreaterThan(0)
    for (const rota of FOCUS_ROUTES) {
      expect(destinos).toContain(rota)
    }
  })

  it('são exatamente duas, e são as do grupo Loja que têm prévia', () => {
    expect([...FOCUS_ROUTES]).toEqual(['/admin/home', '/admin/menu'])
  })
})
