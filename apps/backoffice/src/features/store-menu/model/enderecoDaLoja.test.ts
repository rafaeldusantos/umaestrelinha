// Feature 86, QA r1 (Q03) — `conferirEnderecoDaLoja`: só endereço que existe.
import { describe, expect, it } from 'vitest'
import { menuDocumentRefusal, type MenuCategory, type MenuDocument } from '@estrelinha/core/menu'
import { addChildNode, addRootNode } from './documentOps'
import {
  MOTIVO_COLECAO_AMBIGUA,
  MOTIVO_COLECAO_FORA_DO_AR,
  MOTIVO_SEM_PAGINA,
  conferirEnderecoDaLoja,
} from './enderecoDaLoja'

const cat = (id: string, slug: string, over: Partial<MenuCategory> = {}): MenuCategory =>
  ({ id, name: id, slug, parent_id: null, sort_order: 0, active: true, ...over }) as MenuCategory

const ARVORE = [
  cat('joias', 'joias-afetivas'),
  cat('aneis', 'aneis', { parent_id: 'joias' }),
  cat('velha', 'colecao-velha', { active: false }),
]

describe('conferirEnderecoDaLoja', () => {
  it('rota fixa da loja passa, normalizada (barra final e caixa)', () => {
    expect(conferirEnderecoDaLoja('/sobre', ARVORE)).toEqual({ kind: 'ok', href: '/sobre' })
    expect(conferirEnderecoDaLoja('/sobre/', ARVORE)).toEqual({ kind: 'ok', href: '/sobre' })
    expect(conferirEnderecoDaLoja('/SOBRE', ARVORE)).toEqual({ kind: 'ok', href: '/sobre' })
    expect(conferirEnderecoDaLoja('/', ARVORE)).toEqual({ kind: 'ok', href: '/' })
    expect(conferirEnderecoDaLoja('/carrinho', ARVORE)).toEqual({ kind: 'ok', href: '/carrinho' })
  })

  it('caminho de categoria ATIVA passa; o da inativa e o inventado recusam', () => {
    expect(conferirEnderecoDaLoja('/joias-afetivas', ARVORE)).toEqual({ kind: 'ok', href: '/joias-afetivas' })
    expect(conferirEnderecoDaLoja('/Joias-Afetivas/Aneis/', ARVORE)).toEqual({
      kind: 'ok',
      href: '/joias-afetivas/aneis',
    })
    expect(conferirEnderecoDaLoja('/colecao-velha', ARVORE).kind).toBe('recusa')
    // S01 (QA r3): a forma de UM segmento de uma filha ativa a loja abre (`AD-018`), e passa — ver o
    // bloco S01 abaixo. Antes este caso exigia a recusa, que era o bug.
    expect(conferirEnderecoDaLoja('/aneis', ARVORE)).toEqual({ kind: 'ok', href: '/joias-afetivas/aneis' })
    expect(conferirEnderecoDaLoja('/inventada', ARVORE).kind).toBe('recusa')
  })

  it('/produtos/<slug> pede a conferência do banco', () => {
    expect(conferirEnderecoDaLoja('/produtos/Colar-Leite/', ARVORE)).toEqual({
      kind: 'peca',
      href: '/produtos/colar-leite',
      slug: 'colar-leite',
    })
  })

  it('prefixo de rota que não é página recusa (/produto, /colecao, /pedido, /produtos)', () => {
    for (const e of ['/produto', '/colecao', '/categoria', '/pedido', '/produtos', '/perguntas-frequentes/x']) {
      expect(conferirEnderecoDaLoja(e, ARVORE).kind, e).toBe('recusa')
    }
  })

  it('a recusa cita o que foi DIGITADO, sem a barra acrescentada e sem a lista de 19 endereços', () => {
    const r = conferirEnderecoDaLoja('javascript:alert(1)', ARVORE)
    expect(r).toEqual({ kind: 'recusa', motivo: MOTIVO_SEM_PAGINA('javascript:alert(1)') })
    expect((r as { motivo: string }).motivo).not.toMatch(/\/javascript|Endereços aceitos/)
  })

  it('vazio, externo e //host continuam recusados pela régua de core', () => {
    expect(conferirEnderecoDaLoja('   ', ARVORE).kind).toBe('recusa')
    expect(conferirEnderecoDaLoja('https://exemplo.com', ARVORE).kind).toBe('recusa')
    expect(conferirEnderecoDaLoja('//exemplo.com', ARVORE).kind).toBe('recusa')
  })
})

// R01 (QA r2 da 86) — tudo que o seletor aceita, a gravação aceita. Antes, `/botanicas` e
// `/joias-afetivas/<filha>` passavam aqui e `menuDocumentRefusal` (core) os recusava ao gravar, com a
// lista de 19 endereços: dois donos de "este endereço vale?". A existência é deste arquivo; a forma,
// de `core` — e esta propriedade é o que prova que as duas não discordam mais.
describe('R01 — propriedade: o que conferirEnderecoDaLoja aceita, menuDocumentRefusal grava', () => {
  const POOL = [
    cat('joias', 'joias-afetivas'),
    cat('linha-pet', 'joia-afetiva-linha-pet', { parent_id: 'joias' }),
    cat('aneis', 'aneis', { parent_id: 'joias' }),
    cat('botanicas', 'botanicas'),
    cat('velha', 'colecao-velha', { active: false }),
  ]
  const VAZIO: MenuDocument = { version: 2, items: [] }
  const COM_PAI: MenuDocument = addRootNode(VAZIO, { target: { kind: 'category', category_id: 'joias' } }, POOL)

  const ACEITOS = [
    '/sobre', // rota fixa
    '/perguntas-frequentes',
    '/conta',
    '/', // a Home
    '/botanicas', // coleção raiz
    '/Botanicas/', // coleção raiz, grafia da barra do navegador
    '/joias-afetivas', // pai
    '/joias-afetivas/joia-afetiva-linha-pet', // coleção filha
    '/joia-afetiva-linha-pet', // coleção filha, forma de um segmento (S01 do QA r3)
    '/JOIA-AFETIVA-LINHA-PET/', // idem, caixa alta e barra final
    '/produtos/colar-leite', // peça à venda (o banco confirma, e a tela grava o mesmo href)
  ]

  it.each(ACEITOS)('%s: aceito pelo seletor ⇒ o documento resultante grava (raiz e submenu)', digitado => {
    const conferido = conferirEnderecoDaLoja(digitado, POOL)
    expect(conferido.kind, digitado).not.toBe('recusa')
    const href = (conferido as { href: string }).href
    const novo = { target: { kind: 'link' as const, href }, label: 'Item' }

    const naRaiz = addRootNode(COM_PAI, novo, POOL)
    expect(menuDocumentRefusal(naRaiz, COM_PAI)).toBeNull()
    expect(menuDocumentRefusal(naRaiz)).toBeNull()

    const paiId = COM_PAI.items[0].id
    const noSubmenu = addChildNode(COM_PAI, paiId, novo)
    expect(menuDocumentRefusal(noSubmenu, COM_PAI)).toBeNull()
  })

  it('as recusas continuam sendo do seletor, sem a lista de endereços', () => {
    for (const e of ['/colecao-velha', '/inventada', '/javascript:alert(1)', '/produtos']) {
      const r = conferirEnderecoDaLoja(e, POOL)
      expect(r.kind, e).toBe('recusa')
      expect((r as { motivo: string }).motivo).not.toMatch(/Endereços aceitos/)
    }
  })
})

// S01 (QA r3 da 86, `BUG-20261029-filha-num-segmento-recusada-no-outro-endereco`) — a loja abre a
// filha também por `/<slug>` (`AD-018`: `categories.slug` é único, um segmento não é ambíguo), e o
// seletor dizia "Não há página da loja" para um endereço que existe. A régua é a da loja
// (`resolveCategoryRoute`, em `core/page`), e o que se grava é a canônica (`categoryHref`).
describe('S01 — a forma curta de uma subcategoria ativa passa e grava a canônica', () => {
  const POOL = [
    cat('joias', 'joias-e-acessorios'),
    cat('colares', 'colar-e-correntes', { parent_id: 'joias' }),
    cat('aneis', 'aneis', { parent_id: 'joias' }),
    cat('pausada', 'colecao-pausada', { parent_id: 'joias', active: false }),
  ]

  it.each(['/colar-e-correntes', '/COLAR-E-CORRENTES', '/colar-e-correntes/', '/Colar-E-Correntes/'])(
    '%s ⇒ ok, gravado como /joias-e-acessorios/colar-e-correntes',
    digitado => {
      expect(conferirEnderecoDaLoja(digitado, POOL)).toEqual({
        kind: 'ok',
        href: '/joias-e-acessorios/colar-e-correntes',
      })
    },
  )

  it('a forma de dois segmentos continua igual, e a raiz continua de um segmento', () => {
    expect(conferirEnderecoDaLoja('/joias-e-acessorios/colar-e-correntes', POOL)).toEqual({
      kind: 'ok',
      href: '/joias-e-acessorios/colar-e-correntes',
    })
    expect(conferirEnderecoDaLoja('/joias-e-acessorios', POOL)).toEqual({ kind: 'ok', href: '/joias-e-acessorios' })
  })

  it('a query e o fragmento ficam, e o caminho vira o canônico', () => {
    expect(conferirEnderecoDaLoja('/Colar-E-Correntes/?ordem=preco#topo', POOL)).toEqual({
      kind: 'ok',
      href: '/joias-e-acessorios/colar-e-correntes?ordem=preco#topo',
    })
  })

  it('a filha INATIVA continua recusada, e o motivo diz que a coleção está fora do ar (não que não existe)', () => {
    for (const e of ['/colecao-pausada', '/joias-e-acessorios/colecao-pausada']) {
      const r = conferirEnderecoDaLoja(e, POOL)
      expect(r, e).toEqual({ kind: 'recusa', motivo: MOTIVO_COLECAO_FORA_DO_AR(e) })
      expect((r as { motivo: string }).motivo).not.toMatch(/Não há página/)
    }
  })

  it('slug repetido entre duas ativas (ambíguo) é recusado com motivo próprio', () => {
    const repetido = [...POOL, cat('outra', 'colar-e-correntes')]
    const r = conferirEnderecoDaLoja('/colar-e-correntes', repetido)
    expect(r).toEqual({ kind: 'recusa', motivo: MOTIVO_COLECAO_AMBIGUA('/colar-e-correntes') })
  })

  it('pai errado (que a loja só redireciona) e três segmentos continuam recusados', () => {
    expect(conferirEnderecoDaLoja('/aneis/colar-e-correntes', POOL).kind).toBe('recusa')
    expect(conferirEnderecoDaLoja('/joias-e-acessorios/colar-e-correntes/x', POOL).kind).toBe('recusa')
    expect(conferirEnderecoDaLoja('/inventada', POOL)).toEqual({ kind: 'recusa', motivo: MOTIVO_SEM_PAGINA('/inventada') })
  })

  it('propriedade: o aceito pela forma curta grava (menuDocumentRefusal nulo, raiz e submenu)', () => {
    const VAZIO: MenuDocument = { version: 2, items: [] }
    const COM_PAI = addRootNode(VAZIO, { target: { kind: 'category', category_id: 'joias' } }, POOL)
    for (const digitado of ['/colar-e-correntes', '/COLAR-E-CORRENTES/', '/aneis']) {
      const r = conferirEnderecoDaLoja(digitado, POOL)
      expect(r.kind, digitado).toBe('ok')
      const novo = { target: { kind: 'link' as const, href: (r as { href: string }).href }, label: 'Colares' }
      expect(menuDocumentRefusal(addRootNode(COM_PAI, novo, POOL), COM_PAI), digitado).toBeNull()
      expect(menuDocumentRefusal(addChildNode(COM_PAI, COM_PAI.items[0].id, novo), COM_PAI), digitado).toBeNull()
    }
  })
})
