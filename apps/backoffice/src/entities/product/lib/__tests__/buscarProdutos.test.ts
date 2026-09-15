// A régua da busca (feature 51, T02) — `BUS-01`, `BUS-02`, `BUS-03`, `BUS-04`, `BUS-06`, `BUS-15`.
//
// Toda a história H1 é provada aqui, **sem montar tela nenhuma**. É o que a pureza compra: o dia em
// que o pool virar busca no servidor, estes casos continuam sendo a definição do que "achar uma
// peça" significa neste painel, e nenhum deles precisa de jsdom para valer.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { buscarProdutos, RESULTADOS_VISIVEIS, type ProdutoDoPool } from '../buscarProdutos'

const peca = (id: string, name: string, over: Partial<ProdutoDoPool> = {}): ProdutoDoPool => ({
  id,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  is_active: true,
  base_price: 289,
  ...over,
})

const nomes = (resultado: { itens: ProdutoDoPool[] }) => resultado.itens.map(p => p.name)

/**
 * O catálogo de prova, e os nomes NÃO são arbitrários.
 *
 * Para o termo `colar` eles casam em postos 0, 1 e 2 **na ordem inversa da alfabética** — e isso é
 * a própria régua: com nomes cuja ordem alfabética coincidisse com a de posto (o primeiro desenho
 * desta fixtura), devolver posto constante deixaria as quatro asserções de ranking **verdes**, e a
 * AC `BUS-03` estaria provada por acaso. Medido: o mutante sobreviveu a três dos quatro casos.
 */
const CATALOGO: ProdutoDoPool[] = [
  peca('p1', 'Colar de Cinzas'),
  peca('p2', 'Anel Colar Duplo'),
  peca('p3', 'Bricolar peça'),
  peca('p4', 'Anel Coração'),
  peca('p5', 'Broche Pena', { is_active: false }),
]

describe('buscarProdutos — casa PALAVRA a palavra, em qualquer ordem (BUS-01)', () => {
  it('`cinzas colar` acha `Colar de Cinzas`', () => {
    expect(nomes(buscarProdutos(CATALOGO, 'cinzas colar'))).toEqual(['Colar de Cinzas'])
  })

  it('`colar cinzas` — a ordem inversa acha a MESMA peça', () => {
    // O par do caso acima. Uma régua de `includes` sobre o termo inteiro passaria em um dos dois e
    // reprovaria no outro, que é o comportamento que esta feature substitui.
    expect(nomes(buscarProdutos(CATALOGO, 'colar cinzas'))).toEqual(['Colar de Cinzas'])
  })

  it('TODA palavra precisa casar — `cinzas xyz` não acha nada', () => {
    // O mutante: trocar `every` por `some` faria este termo devolver todas as peças de cinzas, e a
    // dona leria como se a busca tivesse ignorado metade do que ela escreveu.
    expect(buscarProdutos(CATALOGO, 'cinzas xyz').total).toBe(0)
  })

  it('palavra repetida não muda nada — `colar colar` vale `colar`', () => {
    expect(nomes(buscarProdutos(CATALOGO, 'colar colar'))).toEqual(
      nomes(buscarProdutos(CATALOGO, 'colar')),
    )
  })
})

describe('buscarProdutos — a dobra vale nos DOIS sentidos (BUS-02)', () => {
  it('termo sem acento acha nome COM acento — `coracao` acha `Anel Coração`', () => {
    expect(nomes(buscarProdutos(CATALOGO, 'coracao'))).toEqual(['Anel Coração'])
  })

  it('termo COM acento acha nome sem acento — `coração` acha `Anel Coracao`', () => {
    // `L-029`: a metade que costuma faltar. O catálogo desta loja tem os dois — o nome cadastrado à
    // mão vem acentuado, e o importado da Nuvemshop, não.
    const semAcento = [peca('q1', 'Anel Coracao')]
    expect(nomes(buscarProdutos(semAcento, 'coração'))).toEqual(['Anel Coracao'])
  })

  it('a caixa também é ignorada, nos dois sentidos', () => {
    expect(nomes(buscarProdutos(CATALOGO, 'COLAR DE CINZAS'))).toEqual(['Colar de Cinzas'])
    expect(nomes(buscarProdutos([peca('q2', 'COLAR PRATA')], 'colar prata'))).toEqual(['COLAR PRATA'])
  })

  it('`ç` e `ñ` são alcançados — `acai` acha `Açaí`', () => {
    expect(nomes(buscarProdutos([peca('q3', 'Pingente Açaí')], 'acai'))).toEqual(['Pingente Açaí'])
  })
})

describe('buscarProdutos — prefixo antes de miolo (BUS-03)', () => {
  it('posto 0: o nome COMEÇA com o termo inteiro', () => {
    expect(nomes(buscarProdutos(CATALOGO, 'colar'))[0]).toBe('Colar de Cinzas')
  })

  it('posto 1: uma PALAVRA do nome começa com a palavra do termo', () => {
    const r = nomes(buscarProdutos(CATALOGO, 'colar'))
    expect(r[1]).toBe('Anel Colar Duplo')
  })

  it('posto 2: casa só no miolo de uma palavra', () => {
    const r = nomes(buscarProdutos(CATALOGO, 'colar'))
    expect(r[2]).toBe('Bricolar peça')
  })

  it('a ordem entre os três postos é a AC, escrita de uma vez', () => {
    // O mutante: devolver posto constante deixaria os três casos acima falhando só por acaso de
    // ordem alfabética. Escrever a sequência inteira prende a régua.
    expect(nomes(buscarProdutos(CATALOGO, 'colar'))).toEqual([
      'Colar de Cinzas',
      'Anel Colar Duplo',
      'Bricolar peça',
    ])
  })

  it('posto 1 vence posto 2 — e também NÃO por alfabeto', () => {
    // O par do caso acima, um degrau abaixo. Medido: colapsar os dois postos fracos num só deixava
    // os cinco casos anteriores VERDES, porque na fixtura principal a ordem alfabética dos dois
    // coincide com a de posto. Aqui ela é inversa — `Bricolar` vem antes de `Zircônia` no alfabeto.
    const pool = [peca('a', 'Bricolar peça'), peca('b', 'Zircônia Colar Duplo')]
    expect(nomes(buscarProdutos(pool, 'colar'))).toEqual(['Zircônia Colar Duplo', 'Bricolar peça'])
  })

  it('o posto vence o alfabeto — a que casa no começo vem antes mesmo com nome "maior"', () => {
    // Sem o posto, `Aliança com Colar` viria primeiro por ser alfabeticamente menor.
    const pool = [peca('a', 'Aliança com Colar'), peca('b', 'Colar de Cinzas')]
    expect(nomes(buscarProdutos(pool, 'colar'))).toEqual(['Colar de Cinzas', 'Aliança com Colar'])
  })
})

describe('buscarProdutos — termo vazio, só espaço, só pontuação (BUS-04)', () => {
  it.each([
    ['vazio', ''],
    ['só espaço', '   '],
    ['só pontuação', '---'],
  ])('%s devolve o pool inteiro, em ordem alfabética', (_rotulo, termo) => {
    expect(nomes(buscarProdutos(CATALOGO, termo))).toEqual([
      'Anel Colar Duplo',
      'Anel Coração',
      'Bricolar peça',
      'Broche Pena',
      'Colar de Cinzas',
    ])
  })

  it('e não é erro — `total` é o tamanho do pool', () => {
    expect(buscarProdutos(CATALOGO, '').total).toBe(CATALOGO.length)
  })

  it('pool vazio devolve vazio, sem quebrar', () => {
    expect(buscarProdutos([], 'colar')).toEqual({ itens: [], total: 0 })
  })
})

describe('buscarProdutos — o teto e o contador (BUS-06)', () => {
  const muitos = Array.from({ length: 30 }, (_, i) =>
    peca(`x${String(i).padStart(2, '0')}`, `Peça ${String(i).padStart(2, '0')}`),
  )

  it('`itens` respeita o teto, e `total` conta ANTES do corte', () => {
    const r = buscarProdutos(muitos, '')
    expect(r.itens).toHaveLength(RESULTADOS_VISIVEIS)
    expect(r.total).toBe(30)
  })

  it('o teto padrão é 20', () => {
    expect(RESULTADOS_VISIVEIS).toBe(20)
  })

  it('o teto é parametrizável — quem desenha decide quantas linhas cabem', () => {
    expect(buscarProdutos(muitos, '', { teto: 3 }).itens).toHaveLength(3)
    expect(buscarProdutos(muitos, '', { teto: 3 }).total).toBe(30)
  })

  it('o teto é de DESENHO: escrever mais do termo alcança quem ficou de fora', () => {
    expect(nomes(buscarProdutos(muitos, 'Peça 27'))).toEqual(['Peça 27'])
  })

  it('cabendo, `total` e `itens` batem — o aviso de corte não teria o que dizer', () => {
    const r = buscarProdutos(CATALOGO, '')
    expect(r.total).toBe(r.itens.length)
  })
})

describe('buscarProdutos — `excluir` some do resultado E da contagem', () => {
  it('a peça excluída não aparece', () => {
    expect(nomes(buscarProdutos(CATALOGO, 'colar', { excluir: ['p1'] }))).toEqual([
      'Anel Colar Duplo',
      'Bricolar peça',
    ])
  })

  it('e ela também sai do `total` — senão o contador prometeria uma linha que não existe', () => {
    expect(buscarProdutos(CATALOGO, 'colar').total).toBe(3)
    expect(buscarProdutos(CATALOGO, 'colar', { excluir: ['p1'] }).total).toBe(2)
  })

  it('excluir id que não está no pool não muda nada', () => {
    expect(buscarProdutos(CATALOGO, 'colar', { excluir: ['inexistente'] }).total).toBe(3)
  })
})

describe('buscarProdutos — o resultado é DETERMINÍSTICO (BUS-15)', () => {
  it('mesmo termo, mesmo pool, mesma ordem — inclusive os empates', () => {
    const a = buscarProdutos(CATALOGO, 'colar').itens.map(p => p.id)
    const b = buscarProdutos(CATALOGO, 'colar').itens.map(p => p.id)
    expect(a).toEqual(b)
  })

  it('duas peças de NOME IDÊNTICO desempatam por `id`, nos dois sentidos de chegada', () => {
    // O mutante: sem o desempate por `id`, a ordem entre elas seria a de chegada do banco — e a
    // asserção acima passaria por acaso, já que o pool chega na mesma ordem nas duas chamadas.
    const naOrdem = [peca('zzz', 'Colar Gêmeo'), peca('aaa', 'Colar Gêmeo')]
    const invertido = [peca('aaa', 'Colar Gêmeo'), peca('zzz', 'Colar Gêmeo')]

    expect(buscarProdutos(naOrdem, 'colar').itens.map(p => p.id)).toEqual(['aaa', 'zzz'])
    expect(buscarProdutos(invertido, 'colar').itens.map(p => p.id)).toEqual(['aaa', 'zzz'])
  })

  it('o pool recebido não é mutado — a ordem de quem chamou fica intacta', () => {
    const pool = [...CATALOGO]
    buscarProdutos(pool, 'colar')
    expect(pool.map(p => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
  })
})

describe('buscarProdutos — o estado da peça não filtra nada', () => {
  it('peça fora do ar continua no resultado — quem marca é a tela, não a régua', () => {
    // `BUS-10`: escolher uma peça despublicada é estado legítimo. Filtrá-la aqui esconderia da dona
    // a peça que ela está justamente tentando reativar.
    const r = buscarProdutos(CATALOGO, 'broche')
    expect(nomes(r)).toEqual(['Broche Pena'])
    expect(r.itens[0].is_active).toBe(false)
  })
})

describe('entities/product/lib é PURO — a régua roda sem React e sem Supabase', () => {
  const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

  const especificadores = (fonte: string): string[] => {
    const saida: string[] = []
    const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(fonte)) !== null) saida.push(m[1])
    return saida
  }

  const arquivos = readdirSync(DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => ({ nome: f, imports: especificadores(readFileSync(join(DIR, f), 'utf8')) }))

  it('ÂNCORA: a varredura enxerga o segmento e de fato extrai imports', () => {
    // Molde de `packages/core/src/shopping/__tests__/purity.test.ts`. Sem a âncora, um caminho
    // errado leria zero arquivo e as asserções de baixo passariam sobre nada (`L-021`).
    expect(arquivos.map(a => a.nome)).toContain('buscarProdutos.ts')
    expect(arquivos.reduce((n, a) => n + a.imports.length, 0)).toBeGreaterThanOrEqual(1)
  })

  it.each(['react', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(arquivos.filter(a => a.imports.includes(dependencia)).map(a => a.nome)).toEqual([])
    },
  )

  it('nem o client por caminho de pacote — a régua não conhece o banco', () => {
    const culpados = arquivos.filter(a => a.imports.some(s => s.startsWith('@estrelinha/supabase')))
    expect(culpados.map(c => c.nome)).toEqual([])
  })
})
