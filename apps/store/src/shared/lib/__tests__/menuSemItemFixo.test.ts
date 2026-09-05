import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **Nenhum item de menu mora no código** — `NAV-14`.
 *
 * O defeito que este guarda mata não é o "Sobre" escrito em JSX: é a **categoria "item fixo"**.
 * Enquanto ela existir, a Adri não decide o menu inteiro — decide a parte que sobrou, e a outra
 * parte é um deploy.
 *
 * E o preço dela estava cobrado, à vista, no repositório: `MenuSlotList.tsx` declarava duas entradas
 * fixas, `"Crie o Seu" → /crie-seu-botton` e `"Sobre" → /sobre`, e mostrava as duas na lista **e na
 * prévia** da tela que decide o menu. Só que `/crie-seu-botton` **nunca foi rota declarada** — cai na
 * 404 da loja, e `routes.test.ts` já asseria isso do outro lado — e o `Header` renderizava só o
 * "Sobre". A tela onde a dona decide o menu mostrava, em dois lugares, um item que não existia e que
 * levaria a lugar nenhum. Nada quebrava: build, `tsc` e teste de componente passavam com a mentira
 * inteira em tela.
 *
 * A feature 39 não corrigiu a lista — **apagou o conceito**. O "Sobre" virou item de LINK em
 * `store_settings.menu`, semeado pela migration, e a Adri pode movê-lo, trocá-lo ou tirá-lo.
 *
 * ÂNCORA DUPLA: prova que leu arquivos **e** que encontrou as superfícies que nomeia. Um caminho
 * errado varre zero arquivo e aprova tudo em silêncio, que é a pior falha possível aqui.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: as duas pontas que têm tela. */
const ESCOPO = ['apps']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
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
 * Sem isto o guarda casa a prosa acima — que nomeia `/crie-seu-botton` de propósito — e o conserto
 * vira "apague o comentário" em vez de "conserte o código".
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    // CRLF primeiro: em JavaScript `.` não casa `\r`, e num checkout Windows o stripper de linha
    // ficaria inerte. É o defeito que a `freeShippingSingleOwner` já pagou uma vez.
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((linha) => linha.replace(/\/\/.*$/, ''))

const varridos: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter((a) => !eTeste(a.rel))

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

/**
 * As quatro superfícies de menu da loja, escritas por extenso.
 *
 * A régua **não** é derivada de uma constante que o código sob teste exporte, nem de uma varredura
 * por nome de pasta: um `widgets/menu-novo/` inventado amanhã não entraria aqui sozinho, e é isso
 * que faz esta lista ser lida por quem mexer no menu. A âncora abaixo prova que as quatro existem.
 */
const SUPERFICIES_DA_LOJA = [
  'apps/store/src/widgets/header/ui/Header.tsx',
  'apps/store/src/widgets/header/ui/MegaMenu.tsx',
  'apps/store/src/widgets/header/ui/navItem.ts',
  'apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx',
]

const daLoja = producao.filter((a) => SUPERFICIES_DA_LOJA.includes(a.rel))

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('sem item fixo — âncoras da varredura', () => {
  it('a varredura enxerga os dois apps', () => {
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
  })

  it('as QUATRO superfícies nomeadas existem no disco', () => {
    // Segunda âncora, no objeto medido: um arquivo renomeado faria as asserções abaixo varrerem
    // uma lista vazia e aprovarem por vacuidade.
    expect(daLoja.map((a) => a.rel).sort()).toEqual([...SUPERFICIES_DA_LOJA].sort())
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do stripper', () => {
    const crlf = semComentarios('const a = 1\r\n// FIXED_ENTRIES e /crie-seu-botton\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// FIXED_ENTRIES e /crie-seu-botton\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * FIXED_ENTRIES\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => l.includes('FIXED_ENTRIES'))).toBe(false)
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }
    expect(bloco).toHaveLength(6)
  })

  it('a régua ENCONTRA destino de rota nas superfícies — sensor do extrator', () => {
    // Se `DESTINO` deixasse de casar, as asserções de "só estes destinos" passariam sozinhas. O
    // `<Link to="/">` da marca existe nas duas telas e é o que prova que a régua enxerga.
    expect(procurar(DESTINO, daLoja).length).toBeGreaterThanOrEqual(4)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra — o conceito de entrada fixa não existe
// ───────────────────────────────────────────────────────────────────────────

const ENTRADA_FIXA = /FIXED_(MENU_)?ENTRIES/
const ROTA_QUE_NAO_EXISTE = /crie-seu-botton/

/**
 * O painel ainda tem a lista fixa, e ela sai na T21/T26 — **dívida em trânsito, não permissão**.
 *
 * A asserção de "cada entrada ainda casa" é o que a faz expirar sozinha: no dia em que a T21 apagar
 * `FIXED_ENTRIES`, este arquivo reprova até a entrada sair daqui.
 */
const DIVIDA_DO_PAINEL: Record<string, string> = {
  'apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx':
    'Onde `FIXED_ENTRIES` é declarada, com o `/crie-seu-botton` que não é rota. Reescrita na T21, e a constante é APAGADA junto — não corrigida.',
  'apps/backoffice/src/features/store-menu/ui/MenuBarPreview.tsx':
    'O segundo desenho da barra, que consome a lista fixa. APAGADO na T26: a prévia passa a ser a loja num iframe, como em `/admin/home`.',
  'apps/backoffice/src/features/store-menu/index.ts':
    'O barrel que reexporta `FIXED_ENTRIES`. A linha sai na T21, junto da constante.',
}

describe('o conceito de entrada fixa não existe na LOJA (NAV-14)', () => {
  it('`FIXED_ENTRIES` não aparece em `apps/store/**`', () => {
    const achados = procurar(ENTRADA_FIXA).filter((o) => o.arquivo.startsWith('apps/store/'))
    expect(achados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('`/crie-seu-botton` não aparece em `apps/store/**` — nunca foi rota declarada', () => {
    // `routes.test.ts` prova o outro lado: o slug não está em `ROUTE_SLUGS`, então a loja o serve
    // como 404. Um link para ele em produção é um item de menu levando a lugar nenhum.
    const achados = procurar(ROTA_QUE_NAO_EXISTE).filter((o) => o.arquivo.startsWith('apps/store/'))
    expect(achados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('no painel, os dois só existem nos arquivos que a fase 5 reescreve', () => {
    const achados = procurar(new RegExp(`${ENTRADA_FIXA.source}|${ROTA_QUE_NAO_EXISTE.source}`))
    const fora = achados.filter(
      (o) => !Object.prototype.hasOwnProperty.call(DIVIDA_DO_PAINEL, o.arquivo),
    )
    expect(fora.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('cada entrada da dívida AINDA casa — a lista reprova quando ela é paga', () => {
    const achados = procurar(new RegExp(`${ENTRADA_FIXA.source}|${ROTA_QUE_NAO_EXISTE.source}`))
    for (const arquivo of Object.keys(DIVIDA_DO_PAINEL)) {
      expect(
        achados.some((o) => o.arquivo === arquivo),
        `${arquivo} está na lista mas não declara mais item fixo — remova a entrada`,
      ).toBe(true)
    }
  })

  it('a lista é FECHADA, só tem arquivo do painel, e diz quando cada uma sai', () => {
    expect(Object.keys(DIVIDA_DO_PAINEL).sort()).toEqual([
      'apps/backoffice/src/features/store-menu/index.ts',
      'apps/backoffice/src/features/store-menu/ui/MenuBarPreview.tsx',
      'apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx',
    ])
    expect(Object.keys(DIVIDA_DO_PAINEL).filter((a) => a.startsWith('apps/store/'))).toEqual([])

    const semMotivo = Object.entries(DIVIDA_DO_PAINEL)
      .filter(([, motivo]) => motivo.length < 60 || !/T\d\d/.test(motivo))
      .map(([arquivo]) => arquivo)
    expect(semMotivo).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra — nenhuma rota de MENU cravada nas superfícies
// ───────────────────────────────────────────────────────────────────────────

/** `to="/algo"` ou `href="/algo"` com destino literal. Destino dinâmico (`to={…}`) não casa. */
const DESTINO = /(?:to|href)="(\/[^"]*)"/

/**
 * Os únicos destinos literais que as superfícies de menu podem carregar.
 *
 * São **chrome**, não menu: a marca leva à home, e conta e favoritos são atalhos de sessão que
 * existiriam com o menu inteiro vazio. Nenhum deles é curadoria da Adri, e nenhum aparece na lista
 * que `menuItems` devolve.
 *
 * Qualquer outro destino literal nesses quatro arquivos é um item de menu voltando pela porta dos
 * fundos — foi exatamente assim que o `/sobre` viveu no JSX por três features.
 */
const CHROME: Record<string, string> = {
  '/': 'A marca no topo da faixa e no topo da folha. Não é item de menu: é o caminho de volta, e ele existe com o menu vazio.',
  '/conta': 'Atalho de sessão (avatar no desktop, chips "Conta" e "Pedidos" no celular). Aparece por estado de login, não por curadoria.',
  '/favoritos': 'Atalho de sessão (coração no desktop, chip "Wishlist" no celular). Mesma natureza do anterior.',
}

describe('nenhuma rota de menu cravada nas superfícies da loja (NAV-14)', () => {
  const destinos = procurar(DESTINO, daLoja)

  it('só os destinos de chrome aparecem literalmente', () => {
    const fora = destinos.filter((o) => {
      const destino = o.texto.match(DESTINO)![1]
      return !Object.prototype.hasOwnProperty.call(CHROME, destino)
    })

    expect(
      fora.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'item de menu não se escreve em JSX: cadastre-o em /admin/menu (categoria ou item de link)',
    ).toEqual([])
  })

  it('`/sobre` não está em nenhuma delas — ele é um item de link do banco', () => {
    // A forma exata do defeito, asserida por nome. A migration o semeia em `store_settings.menu`,
    // e a Adri pode tirá-lo; enquanto ele estivesse no JSX, "tirar" era um deploy.
    expect(procurar(/(?:to|href)="\/sobre"/, daLoja).map((o) => `${o.arquivo}:${o.linha}`)).toEqual(
      [],
    )
  })

  it('toda entrada de chrome diz por que não é menu, e a lista é fechada', () => {
    expect(Object.keys(CHROME).sort()).toEqual(['/', '/conta', '/favoritos'])
    const semMotivo = Object.entries(CHROME)
      .filter(([, motivo]) => motivo.length < 60)
      .map(([destino]) => destino)
    expect(semMotivo).toEqual([])
  })

  it('nenhuma entrada de chrome ficou obsoleta', () => {
    // Permissão pendurada é como a próxima entra sem ninguém ver.
    const vivos = new Set(destinos.map((o) => o.texto.match(DESTINO)![1]))
    expect(Object.keys(CHROME).filter((d) => !vivos.has(d))).toEqual([])
  })
})

describe('a régua funciona — sensores por mutação', () => {
  it('pegaria o "Sobre" de volta no JSX do header', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/header/ui/Header.tsx',
      linhas: [
        '<Link to="/sobre" className={`${NAV_ITEM} border-transparent`}>Sobre</Link>',
        '<a href="/como-enviar-seu-material-de-dna">Como enviar</a>',
      ],
    }
    const fora = procurar(DESTINO, [sintetico]).filter((o) => {
      const destino = o.texto.match(DESTINO)![1]
      return !Object.prototype.hasOwnProperty.call(CHROME, destino)
    })
    expect(fora).toHaveLength(2)
  })

  it('pegaria a lista fixa de volta, com qualquer um dos dois nomes', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/header/ui/sintetico.ts',
      linhas: [
        "export const FIXED_ENTRIES = [{ label: 'Sobre', href: '/sobre' }]",
        "const FIXED_MENU_ENTRIES = [{ label: 'Crie o Seu', href: '/crie-seu-botton' }]",
      ],
    }
    expect(procurar(ENTRADA_FIXA, [sintetico])).toHaveLength(2)
    expect(procurar(ROTA_QUE_NAO_EXISTE, [sintetico])).toHaveLength(1)
  })

  it('NÃO acusa o destino dinâmico, que é o caminho certo', () => {
    // O par dos sensores acima: uma régua que casasse tudo reprovaria o código correto — todo
    // destino de item de menu sai de `menuItems`, e nenhum deles é literal.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/header/ui/sintetico.tsx',
      linhas: [
        '<Link to={item.href} className={NAV_ITEM}>{item.name}</Link>',
        '<Link to={categoryPath(filha.slug, item.slug)}>{filha.name}</Link>',
        '<a href={banner.href} target="_blank" rel="noopener noreferrer">',
      ],
    }
    expect(procurar(DESTINO, [sintetico])).toEqual([])
  })
})
