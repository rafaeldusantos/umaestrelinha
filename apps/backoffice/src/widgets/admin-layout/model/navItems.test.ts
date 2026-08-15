import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { navGroups, footerNavItems } from './navItems'

// A estrutura da sidebar não tinha teste nenhum, e ela é um contrato com duas coisas: as rotas de
// `app/App.tsx` e o hábito de quem usa o admin todo dia. Mover um item de grupo é fácil; mover sem
// perceber que uma rota deixou de existir, também.
//
// Feature 17 (PRM-19/PRM-20): o par sidebar↔rotas passou a ser verificado LENDO o `App.tsx`, e não
// só pela convenção escrita no comentário dele. Foi mover `Cupons` de grupo que mostrou a diferença:
// a sequência das rotas tinha de mudar junto, e nada acusaria se não mudasse.

const allItems = navGroups.flatMap(g => g.items)

/**
 * As rotas `/admin/*` de `app/App.tsx`, na ordem em que estão escritas no arquivo.
 *
 * Lido do disco, não importado: o que se verifica é a **ordem textual** das rotas — o `<Routes>` do
 * react-router não a expõe, e é ela que a convenção do arquivo promete manter alinhada com a sidebar.
 * O caminho sai de `process.cwd()` porque o vitest roda com a raiz no diretório do app.
 */
const appRoutePaths = (): string[] => {
  const source = readFileSync(resolve(process.cwd(), 'src/app/App.tsx'), 'utf8')
  return [...source.matchAll(/path="(\/admin[^"]*)"/g)].map(match => match[1])
}

describe('navGroups — os quatro eixos', () => {
  it('os grupos vêm ordenados por FILA, com Descontos entre Vendas e Catálogo', () => {
    // Vendas é o único eixo que acumula — pedido esperando envio, carrinho esfriando. Catálogo e
    // Loja são trabalho de quando não há fila. O topo de uma sidebar de uso diário é do que cobra.
    // `Descontos` (feature 17) fica no meio: ainda é decisão comercial, mas não é fila.
    expect(navGroups.map(g => g.label)).toEqual([
      null,
      'Vendas',
      'Descontos',
      'Catálogo',
      'Loja',
    ])
  })

  it('`Cupons` saiu de Vendas e agora divide `Descontos` com `Promoções` (PRM-19)', () => {
    const vendas = navGroups.find(g => g.label === 'Vendas')!
    expect(vendas.items.map(i => i.to)).toEqual([
      '/admin/pedidos',
      '/admin/carrinhos-abandonados',
      '/admin/clientes',
    ])

    const descontos = navGroups.find(g => g.label === 'Descontos')!
    expect(descontos.items.map(i => i.to)).toEqual(['/admin/cupons', '/admin/promocoes'])
    expect(descontos.items.map(i => i.label)).toEqual(['Cupons', 'Promoções'])
  })

  it('a sequência das rotas de `App.tsx` casa com a de `navGroups` (PRM-20)', () => {
    const declared = appRoutePaths().filter(path => allItems.some(item => item.to === path))

    expect(declared).toEqual(allItems.map(i => i.to))
  })

  it('`/admin/promocoes` está registrada em `App.tsx`', () => {
    expect(appRoutePaths()).toContain('/admin/promocoes')
  })

  it('Pedidos é o primeiro destino depois do Dashboard', () => {
    expect(allItems.map(i => i.to).slice(0, 2)).toEqual(['/admin', '/admin/pedidos'])
  })

  it('só o Dashboard fica sem cabeçalho de grupo', () => {
    const semLabel = navGroups.filter(g => g.label === null)
    expect(semLabel).toHaveLength(1)
    expect(semLabel[0].items.map(i => i.to)).toEqual(['/admin'])
  })

  it('"Loja" é o grupo do que a cliente vê, e o Menu mora nele — não em Catálogo', () => {
    // Enquanto morava em `Catálogo`, a vizinhança sugeria que era mais uma coisa a cadastrar. É
    // curadoria de vitrine sobre o que já está cadastrado.
    const loja = navGroups.find(g => g.label === 'Loja')!
    expect(loja.items.map(i => i.to)).toEqual(['/admin/home', '/admin/menu'])

    const catalogo = navGroups.find(g => g.label === 'Catálogo')!
    expect(catalogo.items.map(i => i.to)).toEqual(['/admin/produtos', '/admin/categorias'])
  })

  it('`Home` vem ACIMA de `Menu da loja` no grupo Loja (feature 24)', () => {
    // A Home é a superfície maior e a mais curada — sete seções com texto, arte e ordem. A barra do
    // topo é ajuste pontual de quatro vagas. Numa lista de dois, o primeiro é onde se vai mais
    // vezes. A ordem das rotas em `App.tsx` acompanha, e o teste acima (PRM-20) prova que acompanha.
    const loja = navGroups.find(g => g.label === 'Loja')!
    expect(loja.items.map(i => i.label)).toEqual(['Home', 'Menu da loja'])
  })

  it('`/admin/home` está registrada em `App.tsx`, antes de `/admin/menu`', () => {
    const rotas = appRoutePaths()
    expect(rotas).toContain('/admin/home')
    expect(rotas.indexOf('/admin/home')).toBeLessThan(rotas.indexOf('/admin/menu'))
  })

  it('o editor de seção NÃO é destino de primeiro nível — mesma régua da grade rápida', () => {
    // `/admin/home/:sectionId` se alcança de dentro da Home. Pô-lo na sidebar exigiria um id em
    // código, que é a definição de destino que não existe sozinho.
    expect(allItems.map(i => i.to)).not.toContain('/admin/home/:sectionId')
    expect(allItems.map(i => i.to).some(to => to.startsWith('/admin/home/'))).toBe(false)
  })

  it('Mockups saiu da navegação, e a rota não existe mais (PIN-01, PIN-03)', () => {
    // O Mockup Studio compunha foto de botton (relevo, alfinete, cartela) — sem leitura possível no
    // domínio de joia afetiva. Sem rota declarada, `/admin/mockups` cai no `path="*"` do `App.tsx`,
    // que é a 404 do próprio backoffice.
    expect(allItems.map(i => i.to)).not.toContain('/admin/mockups')
    expect(allItems.map(i => i.label)).not.toContain('Mockups')
    expect(appRoutePaths()).not.toContain('/admin/mockups')
  })

  it('nenhuma rota aparece em dois grupos', () => {
    const rotas = allItems.map(i => i.to)
    expect(new Set(rotas).size).toBe(rotas.length)
  })

  it('todo item tem rota sob /admin, rótulo e ícone renderizável', () => {
    for (const item of [...allItems, ...footerNavItems]) {
      expect(item.to.startsWith('/admin')).toBe(true)
      expect(item.label.trim()).not.toBe('')
      // Ícone do lucide é um `forwardRef` — objeto, não função. O que importa é ser um tipo de
      // componente que o React aceita renderizar.
      expect(['function', 'object']).toContain(typeof item.icon)
      expect(item.icon).not.toBeNull()
    }
  })

  it('a grade rápida NÃO é destino de primeiro nível — é alcançada de dentro de Produtos', () => {
    expect(allItems.map(i => i.to)).not.toContain('/admin/produtos/grade-rapida')
  })

  it('Configurações fica no rodapé, fora dos grupos', () => {
    expect(footerNavItems.map(i => i.to)).toEqual(['/admin/configuracoes'])
    expect(allItems.map(i => i.to)).not.toContain('/admin/configuracoes')
  })

  it('Coleções não voltou (AD-014)', () => {
    // A tela foi removida na feature 16: a tabela nunca existiu e a palavra já era da categoria.
    expect(allItems.map(i => i.to)).not.toContain('/admin/colecoes')
    expect(allItems.map(i => i.label)).not.toContain('Coleções')
  })
})
