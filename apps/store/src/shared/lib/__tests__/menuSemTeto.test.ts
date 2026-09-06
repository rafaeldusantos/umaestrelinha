import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **A barra do menu não tem teto, e a resposta ao estouro é ROLAR** — `NAV-03`, `NAV-04`.
 *
 * O que este guarda mata é um número: `MENU_SLOT_LIMIT = 4`, escrito no domínio, que fazia a tela
 * **recusar** a 5ª categoria da Adri com um erro. Não era proteção de nada — era o código decidindo
 * a curadoria dela e, pior, decidindo errado: com a barra rolando, sete itens cabem; com dez, o
 * estouro aparece e ela vê. A recusa escondia a única informação útil.
 *
 * E o teto não vivia sozinho. Saíram com ele `slotsUsed` (que contava as vagas), `menuSlotRefusal`
 * (que produzia a recusa), `menuEntries`/`MenuEntry` (a leitura de uma curadoria só, sem dispositivo)
 * e `resolvePromo`/`ResolvedPromo` (o card sem imagem). **Apagados, não depreciados**: um símbolo de
 * legado exportado do barril é exatamente o que a próxima tela importa por engano — e ele
 * responderia com a curadoria de antes, ignorando o dispositivo. A tela mostraria uma coisa e a loja
 * outra, sem quebrar nada, que é a assinatura do "defeito 01".
 *
 * **ÂNCORA DUPLA** (a lição da `fieldBorder`, que varreu só as tags minúsculas e deixou 16 campos com
 * 1,19:1 passarem): o teste prova que leu arquivos de verdade **e** que encontrou as superfícies que
 * nomeia. Um caminho errado varre zero arquivo e aprova tudo em silêncio — a pior falha possível.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Escopo literal, escrito por extenso — a régua **nunca** é o objeto medido.
 *
 * `packages/core/src/menu` entra porque é de onde os símbolos saíram: varrer só `apps/` deixaria a
 * volta do teto passar no lugar em que ela seria mais fácil de fazer.
 */
const ESCOPO = ['apps', join('packages', 'core', 'src', 'menu')]

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  /** As linhas **sem comentário**. É sobre estas que a régua roda. */
  linhas: string[]
}

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas.
 *
 * Sem isto o guarda casaria a prosa acima — que nomeia `MENU_SLOT_LIMIT` de propósito — e o conserto
 * de uma reprovação viraria "apague o comentário" em vez de "conserte o código".
 *
 * **CRLF normalizado PRIMEIRO**: em JavaScript `.` não casa `\r`, então num checkout Windows — que é
 * a plataforma deste projeto — um comentário de linha terminado em `\r` não casava nada e o stripper
 * ficava inerte.
 *
 * **Linha e bloco na MESMA varredura, e a ordem é a do texto.** Duas passadas (bloco primeiro, linha
 * depois) têm um ponto cego que custou uma reprovação de verdade no lote 4: um comentário de LINHA
 * que cite um glob de dois asteriscos abre um "bloco" aos olhos da segunda régua, que apaga tudo até
 * o próximo fecha-bloco — **inclusive código**. O guarda deixa de enxergar um trecho e passa a
 * aprovar o que estiver lá dentro, em silêncio. (`freeShippingSingleOwner.test.ts` carregava a forma
 * antiga; foi corrigido em 2026-09-06 e a `BL-023` está fechada.)
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

const varridos: Arquivo[] = ESCOPO.flatMap(d => arquivos(join(ROOT, d))).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter(a => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (padrao.test(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

const listar = (o: Ocorrencia[]) => o.map(x => `${x.arquivo}:${x.linha} — ${x.texto}`)

/**
 * As superfícies onde o vocabulário de "vaga" seria a recusa voltando com outro nome.
 *
 * A lista é curta **de propósito**: "vaga" é palavra legítima no resto do repositório — a grade de
 * banners da home tem vagas de layout, e a fileira de cor do produto também. O que não pode existir é
 * vaga **no menu**, porque ali ela significaria contagem que recusa.
 */
const SUPERFICIES_DO_MENU = [
  'apps/store/src/widgets/header/ui/Header.tsx',
  'apps/store/src/widgets/header/ui/MegaMenu.tsx',
  'apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx',
  'apps/backoffice/src/pages/admin/AdminMenuPage.tsx',
  'apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx',
]

const doMenu = producao.filter(a => SUPERFICIES_DO_MENU.includes(a.rel))
const fonteDe = (rel: string) => producao.find(a => a.rel === rel)!.linhas.join('\n')

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('sem teto — âncoras da varredura', () => {
  it('a varredura enxerga os dois apps E o domínio do menu', () => {
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.some(a => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(varridos.some(a => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
    expect(varridos.some(a => a.rel === 'packages/core/src/menu/menu.ts')).toBe(true)
  })

  it('as CINCO superfícies nomeadas existem no disco', () => {
    // Segunda âncora, no objeto medido: um arquivo renomeado faria as asserções abaixo varrerem uma
    // lista vazia e aprovarem por vacuidade.
    expect(doMenu.map(a => a.rel).sort()).toEqual([...SUPERFICIES_DO_MENU].sort())
  })

  it('a régua ENCONTRA o que deve encontrar — sensor do extrator', () => {
    // Se `procurar` deixasse de casar, todas as asserções de ausência passariam sozinhas. `menuItems`
    // é a porta única e está nas superfícies: é o que prova que a varredura enxerga código.
    expect(procurar(/\bmenuItems\b/).length).toBeGreaterThanOrEqual(4)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra — os sete símbolos não existem em lugar nenhum
// ───────────────────────────────────────────────────────────────────────────

/**
 * Os sete, por nome. `\b` nas duas pontas de `MenuEntry` **não é zelo**: sem ele a régua casaria
 * `MobileMenuEntry`, o componente de linha da folha do celular, e o guarda reprovaria código certo —
 * que é o caminho mais rápido para alguém afrouxá-lo.
 */
const TETO = /\bMENU_SLOT_LIMIT\b|\bslotsUsed\b|\bmenuSlotRefusal\b/
const LEITURA_ANTIGA = /\bmenuEntries\b|\bMenuEntry\b|\bresolvePromo\b|\bResolvedPromo\b/

describe('NAV-03 — o teto de vagas não existe', () => {
  it('`MENU_SLOT_LIMIT`, `slotsUsed` e `menuSlotRefusal` não aparecem em produção', () => {
    expect(
      listar(procurar(TETO)),
      'não existe recusa por contagem no menu: a barra rola (NAV-03/NAV-04)',
    ).toEqual([])
  })

  it('a leitura de uma curadoria só também não — `menuItems(input, surface)` é a porta', () => {
    expect(
      listar(procurar(LEITURA_ANTIGA)),
      'estes símbolos foram apagados na feature 39: eles não conhecem dispositivo',
    ).toEqual([])
  })

  it('e o domínio continua exportando a porta que os substituiu', () => {
    // O par das duas asserções acima: provar que o velho sumiu não basta, porque um módulo vazio
    // também passaria. O barril tem de estar exportando o que a loja e o painel importam.
    const barril = producao.find(a => a.rel === 'packages/core/src/menu/index.ts')!.linhas.join('\n')
    for (const modulo of ['./menu.ts', './banners.ts', './preview.ts']) {
      expect(barril).toContain(modulo)
    }
    expect(procurar(/export const menuItems\b/).length).toBe(1)
  })

  it('nenhuma superfície de menu fala em "vaga" — o vocabulário da cota', () => {
    // "4 de 4 vagas" era o texto que a tela mostrava antes de recusar. A palavra sozinha já é a
    // recusa voltando: quem escreve "vaga" está contando teto.
    expect(listar(procurar(/\bvagas?\b/i, doMenu))).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra — a resposta ao estouro é ROLAR, nunca embrulhar
// ───────────────────────────────────────────────────────────────────────────

describe('NAV-04 — a barra rola, e nunca embrulha', () => {
  it('a faixa do desktop tem `overflow-x-auto`', () => {
    expect(fonteDe('apps/store/src/widgets/header/ui/Header.tsx')).toContain('overflow-x-auto')
  })

  it('a fila de itens é `min-w-max` — sem isso ela encolheria dentro do container que rola', () => {
    expect(fonteDe('apps/store/src/widgets/header/ui/MegaMenu.tsx')).toContain('min-w-max')
  })

  it('nem a faixa nem a fila usam `flex-wrap`', () => {
    // Embrulhar em duas linhas **esconde** o estouro, que é justamente o que a dona precisa ver — e
    // foi a decisão que este repositório já tomou duas vezes. jsdom devolve 0 para toda medida de
    // layout, então o que se prova aqui é a FORMA; a medida é de navegador, em 390 e 1440.
    expect(
      listar(
        procurar(
          /flex-wrap/,
          doMenu.filter(a => a.rel.startsWith('apps/store/src/widgets/header/')),
        ),
      ),
    ).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra — a faixa cheia MOSTRA que rola (`BL-024`)
// ───────────────────────────────────────────────────────────────────────────

/**
 * **Rolar sem pista é rolar que ninguém descobre.**
 *
 * Tirar o teto tornou o estouro alcançável, e o UAT em navegador (2026-09-06, Chromium, 1440×900,
 * 17 itens) mediu o que sobrou: `nav.scrollWidth` **2619** contra `clientWidth` **1280** — a faixa
 * rola e nada vaza —, mas a barra de rolagem é **em sobreposição** (`offsetHeight` = `clientHeight`
 * = 52: não ocupa layout, não aparece parada) e a **roda vertical** do mouse sobre a faixa rola a
 * **página**, não a faixa. Sobram `shift`+roda, trackpad e teclado.
 *
 * Ou seja: quem usa mouse num monitor largo pode **não descobrir** que há mais departamentos. Este
 * bloco congela as três coisas que respondem a isso — e a primeira delas é que a resposta continua
 * sendo ROLAR, não embrulhar: uma afordância bonita sobre uma faixa que passou a `flex-wrap` seria
 * a mesma regressão de sempre, agora com seta.
 *
 * As duas réguas abaixo são **predicados**, e é assim de propósito: a asserção da regra e o sensor
 * por mutação chamam a MESMA função. Uma régua escrita duas vezes é o "defeito 01" aplicado ao
 * teste — a cópia da asserção passa enquanto a do sensor mede outra coisa.
 */
const faixaRola = (fonte: string): boolean =>
  /overflow-x-auto/.test(fonte) && !/flex-wrap/.test(fonte)

/**
 * As TRÊS peças da afordância, e nenhuma sozinha resolve:
 *
 * - o **estado** vem da posição real de rolagem (`useOverflowAffordance` lê `scrollLeft`,
 *   `scrollWidth` e `clientWidth`, no `scroll` e num `ResizeObserver`) — sem ele, seta e degradê
 *   seriam decoração permanente numa faixa de 3 itens que cabe;
 * - o **degradê** das duas bordas é a pista, e sai da própria cor da faixa (`primary`);
 * - as **setas** são o alvo que o mouse tem, e cada uma leva rótulo em português.
 */
const temAfordancia = (fonte: string): boolean =>
  /useOverflowAffordance/.test(fonte) &&
  /bg-gradient-to-r from-estrelinha-primary/.test(fonte) &&
  /bg-gradient-to-l from-estrelinha-primary/.test(fonte) &&
  /aria-label="Ver os departamentos anteriores"/.test(fonte) &&
  /aria-label="Ver mais departamentos"/.test(fonte)

describe('BL-024 — a faixa cheia mostra que tem mais coisa', () => {
  const header = fonteDe('apps/store/src/widgets/header/ui/Header.tsx')

  it('a faixa MANTÉM `overflow-x-auto` e NÃO ganhou `flex-wrap`', () => {
    expect(faixaRola(header)).toBe(true)
  })

  it('e TEM a afordância — o estado medido, o degradê e as duas setas rotuladas', () => {
    expect(temAfordancia(header)).toBe(true)
  })

  it('a afordância é `absolute` contra o `<header>`, e não rola junto com os itens', () => {
    // Dentro do `<nav>` a seta sairia da tela junto com o conteúdo — ela precisa ficar parada na
    // ponta. E o `relative` que a "simplificaria" mudaria o containing block do painel do mega
    // menu, que passaria a viver dentro dos 52px. `Header.test.tsx` mede isso no DOM; aqui fica a
    // forma, para a classe não sumir num refactor de estilo.
    expect(header).toContain('pointer-events-none absolute inset-x-0 bottom-0')
    expect(header).toContain('motion-reduce:scroll-auto')
  })
})

describe('a régua da afordância funciona — sensores por mutação', () => {
  const FAIXA_CERTA = '<nav className="container flex h-[52px] items-center overflow-x-auto">'

  it('`faixaRola` APROVA a forma certa — o par dos dois sensores abaixo', () => {
    // Uma régua que reprovasse tudo passaria nos dois negativos e seria inútil.
    expect(faixaRola(FAIXA_CERTA)).toBe(true)
  })

  it('`faixaRola` REPROVA uma faixa sem `overflow-x-auto`', () => {
    expect(faixaRola('<nav className="container flex h-[52px] items-center">')).toBe(false)
  })

  it('`faixaRola` REPROVA uma faixa que EMBRULHA, mesmo com `overflow-x-auto`', () => {
    // A regressão mais provável: alguém acrescenta `flex-wrap` "para caber" e mantém o overflow,
    // que passa a não ter efeito nenhum. O estouro some da tela e a dona deixa de vê-lo.
    expect(faixaRola(`${FAIXA_CERTA.slice(0, -1)} flex-wrap">`)).toBe(false)
  })

  const COMPLETO = [
    "import { useOverflowAffordance } from '@/shared/lib/useOverflowAffordance'",
    'const faixa = useOverflowAffordance(items.length)',
    '<div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-estrelinha-primary to-estrelinha-primary/0" />',
    '<button aria-label="Ver os departamentos anteriores" />',
    '<div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-estrelinha-primary to-estrelinha-primary/0" />',
    '<button aria-label="Ver mais departamentos" />',
  ].join('\n')

  it('`temAfordancia` APROVA o conjunto completo', () => {
    expect(temAfordancia(COMPLETO)).toBe(true)
  })

  it('`temAfordancia` REPROVA a falta de CADA peça, uma a uma', () => {
    // Cinco mutações, uma por asserção do predicado. Sem isto, uma régua que só olhasse o hook
    // aprovaria uma barra com estado e sem nada desenhado — que é o defeito com outra roupa.
    const PECAS: Array<[string, RegExp]> = [
      ['o estado medido', /useOverflowAffordance/g],
      ['o degradê da esquerda', /bg-gradient-to-r from-estrelinha-primary/g],
      ['o degradê da direita', /bg-gradient-to-l from-estrelinha-primary/g],
      ['a seta da esquerda', /aria-label="Ver os departamentos anteriores"/g],
      ['a seta da direita', /aria-label="Ver mais departamentos"/g],
    ]

    for (const [nome, peca] of PECAS) {
      expect(temAfordancia(COMPLETO.replace(peca, 'REMOVIDO')), `faltando: ${nome}`).toBe(false)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────
// Sensores por mutação — a asserção acima mede AUSÊNCIA, e ausência passa sozinha
// ───────────────────────────────────────────────────────────────────────────

describe('a régua funciona — sensores por mutação', () => {
  const sintetico = (rel: string, linhas: string[]): Arquivo => ({ rel, linhas })

  it('pegaria o teto de volta, com qualquer um dos três nomes', () => {
    const alvo = sintetico('apps/store/src/x.ts', [
      'export const MENU_SLOT_LIMIT = 4',
      'const usadas = slotsUsed(categories)',
      'const motivo = menuSlotRefusal(categories, id)',
    ])
    expect(procurar(TETO, [alvo])).toHaveLength(3)
  })

  it('pegaria a leitura antiga de volta', () => {
    const alvo = sintetico('apps/store/src/x.ts', [
      "import { menuEntries, type MenuEntry } from '@estrelinha/core/menu'",
      'const promo: ResolvedPromo | null = resolvePromo(categories, raw)',
    ])
    expect(procurar(LEITURA_ANTIGA, [alvo])).toHaveLength(2)
  })

  it('NÃO acusa `MobileMenuEntry`, que é código certo e vive numa das superfícies', () => {
    // O par do sensor acima. Uma régua sem `\\b` reprovaria a folha do celular inteira, e o conserto
    // óbvio — afrouxar a régua — desligaria o guarda.
    const alvo = sintetico('apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx', [
      'const MobileMenuEntry = ({ item }: { item: MenuItem }) => null',
      '<MobileMenuEntry key={item.id} item={item} />',
    ])
    expect(procurar(LEITURA_ANTIGA, [alvo])).toEqual([])
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do stripper', () => {
    const crlf = semComentarios('const a = 1\r\n// MENU_SLOT_LIMIT e as 4 vagas\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// MENU_SLOT_LIMIT e as 4 vagas\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * MENU_SLOT_LIMIT\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some(l => l.includes('MENU_SLOT_LIMIT'))).toBe(false)
      expect(linhas.some(l => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some(l => l.includes('const b = 2'))).toBe(true)
    }
    // A numeração não desliza: o bloco de 4 linhas continua ocupando 4.
    expect(bloco).toHaveLength(6)
  })

  it('comentário de LINHA que cita um glob NÃO engola o código abaixo — sensor do ponto cego', () => {
    // O defeito real do lote 4, virado sensor: com duas passadas (bloco primeiro, linha depois), o
    // `/**` dentro do comentário de linha abria um bloco para a segunda régua, que apagava tudo até
    // o próximo `*/` — inclusive a chamada logo abaixo. O guarda ficava cego para o trecho e passava
    // a aprovar o que estivesse ali, em silêncio: a pior falha possível.
    const linhas = semComentarios(
      ['// varre apps/**/*.tsx à procura do teto', 'const x = MENU_SLOT_LIMIT', 'const y = 2'].join(
        '\n',
      ),
    )
    expect(linhas.some(l => l.includes('MENU_SLOT_LIMIT'))).toBe(true)
    expect(linhas.some(l => l.includes('const y = 2'))).toBe(true)
  })
})
