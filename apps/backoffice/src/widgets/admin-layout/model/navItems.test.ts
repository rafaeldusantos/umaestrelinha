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
    // Feature 30: o grupo foi de dois para TRÊS itens. A asserção foi reescrita porque a spec mudou
    // o comportamento — e ela ganhou vizinha (o caso do Google Shopping, logo abaixo) em vez de ter
    // sido afrouxada para `toContain`.
    // Feature 46: o grupo foi de três para QUATRO. Mesma régua da 30 — a lista foi reescrita para o
    // conteúdo novo, e ganhou vizinha (o caso da Página de perguntas, abaixo) em vez de virar
    // `toContain`.
    expect(loja.items.map(i => i.to)).toEqual([
      '/admin/home',
      '/admin/menu',
      '/admin/perguntas-frequentes',
      '/admin/google-shopping',
    ])

    const catalogo = navGroups.find(g => g.label === 'Catálogo')!
    expect(catalogo.items.map(i => i.to)).toEqual([
      '/admin/produtos',
      '/admin/categorias',
      '/admin/perguntas',
    ])
    // A afirmação que importa aqui, e que a lista acima só ilustra.
    expect(catalogo.items.map(i => i.to)).not.toContain('/admin/menu')
  })

  it('`Biblioteca de perguntas` entra em Catálogo, por último (features 28 e 46)', () => {
    // Conteúdo de catálogo, não curadoria de vitrine — o que separa este grupo de `Loja`. Por último
    // porque é o que se visita menos: produto e categoria se cadastram toda semana.
    const catalogo = navGroups.find(g => g.label === 'Catálogo')!
    const ultimo = catalogo.items[catalogo.items.length - 1]

    expect(ultimo.to).toBe('/admin/perguntas')
    // Renomeado na 46, com a ROTA intacta. O rótulo antigo era "Perguntas frequentes", e ele deixou
    // de servir no dia em que a 46 criou "Página de perguntas" no grupo Loja: dois itens quase
    // homônimos em grupos diferentes obrigariam a dona a lembrar qual é qual toda vez.
    expect(ultimo.label).toBe('Biblioteca de perguntas')

    const loja = navGroups.find(g => g.label === 'Loja')!
    expect(loja.items.map(i => i.to)).not.toContain('/admin/perguntas')
  })

  it('a Página de perguntas mora em `Loja`, e a Biblioteca em `Catálogo` (feature 46)', () => {
    // A distinção que o rename existe para sustentar: uma cura o que a cliente VÊ, a outra guarda o
    // conteúdo que as duas superfícies consomem. Os rótulos são asseridos junto das rotas porque foi
    // o rótulo, não a rota, que motivou a mudança.
    const loja = navGroups.find(g => g.label === 'Loja')!
    const catalogo = navGroups.find(g => g.label === 'Catálogo')!

    expect(loja.items.find(i => i.to === '/admin/perguntas-frequentes')?.label).toBe(
      'Página de perguntas',
    )
    expect(catalogo.items.map(i => i.to)).not.toContain('/admin/perguntas-frequentes')

    // E os dois rótulos são distintos — a regra que o rename comprou.
    const rotulos = navGroups.flatMap(g => g.items.map(i => i.label))
    expect(new Set(rotulos).size).toBe(rotulos.length)
  })

  it('`Home` vem ACIMA de `Menu da loja` no grupo Loja (feature 24)', () => {
    // A Home é a superfície maior e a mais curada — sete seções com texto, arte e ordem. A barra do
    // topo é ajuste pontual de quatro vagas. Numa lista de dois, o primeiro é onde se vai mais
    // vezes. A ordem das rotas em `App.tsx` acompanha, e o teste acima (PRM-20) prova que acompanha.
    const loja = navGroups.find(g => g.label === 'Loja')!
    expect(loja.items.map(i => i.label)).toEqual([
      'Home',
      'Menu da loja',
      'Página de perguntas',
      'Google Shopping',
    ])
  })

  it('`Google Shopping` fecha o grupo Loja (feature 30)', () => {
    // É vitrine, não cadastro: o que a cliente vê **antes** de chegar. E é o item que se visita
    // menos dos três — a Home se ajusta toda semana, o menu de vez em quando, e o feed se liga uma
    // vez e se confere quando algo estranha.
    const loja = navGroups.find(g => g.label === 'Loja')!
    expect(loja.items[loja.items.length - 1].to).toBe('/admin/google-shopping')

    const catalogo = navGroups.find(g => g.label === 'Catálogo')!
    expect(catalogo.items.map(i => i.to)).not.toContain('/admin/google-shopping')
  })

  it('`/admin/google-shopping` está registrada em `App.tsx`, depois de `/admin/menu`', () => {
    const rotas = appRoutePaths()
    expect(rotas).toContain('/admin/google-shopping')
    expect(rotas.indexOf('/admin/menu')).toBeLessThan(rotas.indexOf('/admin/google-shopping'))
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

  it('o rodapé tem TRÊS destinos, na ordem "a loja → o sistema → eu" (feature 48)', () => {
    // A lista foi REESCRITA, e não afrouxada para `toContain`: a feature 48 mudou o comportamento,
    // então a asserção acompanha e ganha vizinhas (os dois casos abaixo). É a mesma régua que a 30 e
    // a 46 aplicaram ao grupo `Loja`.
    expect(footerNavItems.map(i => i.to)).toEqual([
      '/admin/configuracoes',
      '/admin/usuarios',
      '/admin/conta',
    ])
    expect(footerNavItems.map(i => i.label)).toEqual([
      'Configurações',
      'Usuários do painel',
      'Minha conta',
    ])
  })

  it('nenhum destino do rodapé aparece também nos grupos', () => {
    for (const item of footerNavItems) {
      expect(allItems.map(i => i.to)).not.toContain(item.to)
    }
  })

  it('USR-36: os dois destinos novos NÃO entram em `navGroups`', () => {
    // Não são um dos quatro eixos por fila: ninguém abre o painel de manhã para conferir quem tem
    // acesso. Pô-los num grupo daria a eles a mesma frequência visual de Pedidos.
    expect(allItems.map(i => i.to)).not.toContain('/admin/usuarios')
    expect(allItems.map(i => i.to)).not.toContain('/admin/conta')
  })

  it('USR-37: as duas rotas novas estão declaradas em `App.tsx`', () => {
    const rotas = appRoutePaths()
    expect(rotas).toContain('/admin/usuarios')
    expect(rotas).toContain('/admin/conta')
  })

  it('USR-37: a ordem das rotas do rodapé em `App.tsx` casa com `footerNavItems`', () => {
    // Mesma régua de PRM-20, agora valendo para o rodapé: a sequência textual é o contrato, e nada
    // acusaria se ela divergisse.
    const rotas = appRoutePaths()
    const declaradas = rotas.filter(p => footerNavItems.some(i => i.to === p))
    expect(declaradas).toEqual(footerNavItems.map(i => i.to))
  })

  it('bidirecional: TODA entrada do rodapé é uma rota de `App.tsx`', () => {
    // Sem o segundo sentido, um item que apontasse para uma rota removida cairia na 404 do painel e
    // continuaria na sidebar — o mesmo acúmulo que `routeSplitting` evita na loja.
    const rotas = appRoutePaths()
    for (const item of footerNavItems) {
      expect(rotas).toContain(item.to)
    }
  })

  it('Coleções não voltou (AD-014)', () => {
    // A tela foi removida na feature 16: a tabela nunca existiu e a palavra já era da categoria.
    expect(allItems.map(i => i.to)).not.toContain('/admin/colecoes')
    expect(allItems.map(i => i.label)).not.toContain('Coleções')
  })
})
