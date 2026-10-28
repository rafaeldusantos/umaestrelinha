// Feature 47 — quais rotas pedem o modo de foco. Ampliado na feature 55.
//
// O que se prova aqui é o recorte: as telas que recolhem a navegação — as duas com prévia ao lado
// (Home, Menu) e Configurações, que virou rail + painel — e as subrotas delas entram; qualquer outra
// rota do painel fica de fora, **inclusive** as que começam com as mesmas letras.

import { describe, expect, it } from 'vitest'
import { FOCUS_ROUTES, isFocusRoute } from './focusRoutes'
import { navGroups } from './navItems'

describe('isFocusRoute — FOCO-01: as telas em que a navegação sai da frente', () => {
  it('a Home e o Menu da loja pedem foco', () => {
    expect(isFocusRoute('/admin/home')).toBe(true)
    expect(isFocusRoute('/admin/menu')).toBe(true)
  })

  it('a subrota do editor de seção continua sendo a Home', () => {
    expect(isFocusRoute('/admin/home/8f3c-1a')).toBe(true)
  })

  it('CFG-09: Configurações pede foco — a asserção que a feature 55 INVERTEU', () => {
    // ⚠️ Até a feature 55 este arquivo asseria o OPOSTO, e a asserção estava certa naquele dia: a
    // tela era oito abas horizontais dentro de uma coluna só, e a sidebar de 240px não disputava
    // espaço com nada.
    //
    // A 55 trocou as abas por rail de seções + painel. Com a sidebar aberta são duas colunas de
    // navegação empilhadas na mesma tela, e a de fora é a que ninguém está usando. O critério do
    // arquivo não mudou — a tela mudou, e passou a satisfazê-lo.
    //
    // A asserção foi invertida, e não apagada: um teste removido não deixa rastro de que a regra
    // existiu, e a próxima pessoa a mexer aqui não descobre que a decisão foi tomada duas vezes.
    // (Doutrina da feature 41, quando o cadeado do hero caiu e o teste que o defendia virou o teste
    // que prova que ele não voltou.)
    expect(isFocusRoute('/admin/configuracoes')).toBe(true)
  })

  it('CFG-09: e a rota de cada seção herda o foco, por segmento', () => {
    // Sem isto, entrar numa seção reexpandiria a sidebar no meio da navegação — a piscada que este
    // módulo existe para não ter. Quem casa é `isNavActive`, então não há segunda entrada em
    // `FOCUS_ROUTES` para manter em dia.
    expect(isFocusRoute('/admin/configuracoes/vendas')).toBe(true)
    expect(isFocusRoute('/admin/configuracoes/frete-e-material')).toBe(true)
  })
})

describe('isFocusRoute — FOCO-07: fora dessas três, a sidebar é a de sempre', () => {
  it('o Dashboard não pede foco', () => {
    expect(isFocusRoute('/admin')).toBe(false)
  })

  it('as telas de listagem não pedem foco', () => {
    expect(isFocusRoute('/admin/produtos')).toBe(false)
    expect(isFocusRoute('/admin/pedidos')).toBe(false)
  })

  it('Minha conta e o endereço antigo de Usuários continuam FORA', () => {
    // O par da inversão acima: a feature 55 trouxe Configurações para o foco, e não toda tela de
    // administração. `/admin/usuarios` hoje só redireciona para a seção de Configurações (que herda
    // o foco pelo segmento); a rota antiga em si não pede foco.
    expect(isFocusRoute('/admin/usuarios')).toBe(false)
    expect(isFocusRoute('/admin/conta')).toBe(false)
  })

  it('rota que só COMEÇA com as mesmas letras não conta — o casamento é por segmento', () => {
    // Se fosse `startsWith` cru, as quatro passariam por Home, por Menu ou por Configurações.
    expect(isFocusRoute('/admin/homologacao')).toBe(false)
    expect(isFocusRoute('/admin/homens')).toBe(false)
    expect(isFocusRoute('/admin/menus-antigos')).toBe(false)
    expect(isFocusRoute('/admin/configuracoes-antigas')).toBe(false)
  })

  it('a página de perguntas da loja, vizinha das outras duas no grupo Loja, NÃO pede foco', () => {
    // Ela não tem prévia ao lado: é lista e formulário, e 240px de rótulo lido valem mais ali.
    expect(isFocusRoute('/admin/perguntas-frequentes')).toBe(false)
  })
})

/** Tudo o que o trilho renderiza. É o que `NavRail.test.tsx` desenha. */
const destinosDoTrilho = (): string[] =>
  navGroups.flatMap(grupo => grupo.items.map(item => item.to))

describe('FOCUS_ROUTES — âncora: toda rota de foco é um destino da navegação', () => {
  it('cada entrada é um destino do trilho', () => {
    // O que a âncora diz é "o trilho sabe marcar esta rota". Desde 2026-10-28 o rodapé de
    // destinos não existe mais e Configurações mora em `navGroups`, que é tudo o que o trilho desenha.
    const destinos = destinosDoTrilho()

    // Sem esta âncora, uma rota de foco escrita errada (ou renomeada em `navItems` e esquecida
    // aqui) viraria um endereço que o trilho não sabe marcar: a navegação recolheria e nenhum
    // ícone ficaria aceso.
    expect(FOCUS_ROUTES.length).toBeGreaterThan(0)
    for (const rota of FOCUS_ROUTES) {
      expect(destinos).toContain(rota)
    }
  })

  it('SENSOR: a âncora continua reprovando rota que não é destino do trilho', () => {
    // Ampliar o escopo de uma âncora fica a um passo de afrouxá-la. Este caso prova que ela não
    // virou "qualquer coisa serve".
    expect(destinosDoTrilho()).not.toContain('/admin/inventada')
  })

  it('são exatamente QUATRO — as duas com prévia, Configurações (55) e os Filtros (66)', () => {
    // A lista foi REESCRITA para o conteúdo novo, e ganhou vizinhas (os dois casos de CFG-09 acima),
    // em vez de virar um `toContain` que deixaria passar uma quarta entrada silenciosa.
    // Feature 66: QUATRO. Reescrita de novo para o conteúdo novo, com vizinha logo abaixo.
    expect([...FOCUS_ROUTES]).toEqual([
      '/admin/home',
      '/admin/menu',
      '/admin/configuracoes',
      '/admin/filtros',
    ])
  })

  it('os filtros da loja pedem foco, com as duas subrotas — e o vizinho de prefixo não (feature 66)', () => {
    expect(isFocusRoute('/admin/filtros')).toBe(true)
    expect(isFocusRoute('/admin/filtros/8f3c')).toBe(true)
    expect(isFocusRoute('/admin/filtros/8f3c/valores/1a2b')).toBe(true)
    expect(isFocusRoute('/admin/filtros-antigos')).toBe(false)
  })
})
