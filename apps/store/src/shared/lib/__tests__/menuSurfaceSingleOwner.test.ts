import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **"Esta categoria está no menu?" é uma pergunta que tem DUAS respostas** — `NAV-01`.
 *
 * Até a feature 39 tinha uma: `categories.show_in_menu`, um booleano que ligava a categoria no
 * computador e no celular ao mesmo tempo. Uma coleção de nome longo que cabe em 1440 e estoura em
 * 390 não tinha saída — ou estava nas duas superfícies, ou em nenhuma.
 *
 * Hoje quem responde é `menuItems(input, surface)` (`@estrelinha/core/menu`), e a coluna virou
 * **gerada** (`menu_desktop or menu_mobile`). Ela não foi apagada de propósito: apagá-la faria a
 * loja publicada quebrar na janela entre o `db push` e o deploy da Vercel, que rodam em paralelo.
 * Gerada, ela não pode divergir das duas booleanas — mas continua **legível**, e é aí que mora o
 * risco: nada impede uma tela nova de voltar a lê-la, e nada quebraria se ela lesse. O build passa,
 * o `tsc` passa, o teste de componente passa, e a loja volta a ter uma resposta só para uma pergunta
 * que tem duas.
 *
 * `menu_promo` é o mesmo caso, na outra ponta: o card da feature 16 virou legado não lido, e quem
 * responde por anúncio no painel do menu é `menu_banners` + `resolveMenuBanners`.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o que procura. Só
 * contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. As duas juntas é que fecham.
 *
 * A régua nunca é o objeto medido: o allowlist e o escopo estão escritos **literalmente** aqui, e
 * não derivados de constante que o código sob teste exporte — lição da `fieldBorder`.
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
 * Sem isto o guarda casa a prosa que explica o defeito — e o conserto vira "edite o comentário",
 * não "conserte o código". Este arquivo inteiro fala de `show_in_menu`; se a régua lesse comentário,
 * ele reprovaria a si mesmo.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    // CRLF NORMALIZADO PRIMEIRO, e isto não é higiene — é correção. Em JavaScript `.` **não casa
    // `\r`** (é terminador de linha), então num checkout Windows — que é a plataforma deste
    // projeto — `// comentário\r` fazia `/\/\/.*$/` não casar nada, e o stripper ficava inerte.
    .replace(/\r\n/g, '\n')
    // Bloco: troca o miolo por espaços, preservando as quebras — o índice de cada linha não desliza.
    .replace(/\/\*[\s\S]*?\*\//g, (bloco) => bloco.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((linha) => linha.replace(/\/\/.*$/, ''))

const varridos: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Só o que a loja e o painel de fato executam — teste pode nomear o que quiser. */
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

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('menu por superfície — âncoras da varredura', () => {
  it('a varredura enxerga os dois apps', () => {
    // Caminho errado varre zero arquivo e faz TODA asserção abaixo passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
  })

  it('a varredura separa produção de teste, e sobra produção de verdade', () => {
    expect(producao.length).toBeGreaterThan(200)
    expect(producao.some((a) => a.rel.endsWith('.test.ts'))).toBe(false)
    expect(producao.some((a) => a.rel.includes('__tests__/'))).toBe(false)
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do stripper', () => {
    // A régua não pode ser confundida com a prosa sobre a régua. Os dois finais de linha precisam
    // ser provados: com CRLF o stripper de linha fica inerte e o guarda acusa comentário.
    const crlf = semComentarios('const a = 1\r\n// show_in_menu aqui\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// show_in_menu aqui\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * show_in_menu\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => l.includes('show_in_menu'))).toBe(false)
      // E o código em volta sobrevive — um stripper que apagasse tudo passaria no teste acima.
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }

    // A numeração não desliza: o bloco de 5 linhas continua com 5 linhas (+ a final vazia).
    expect(bloco).toHaveLength(6)
  })

  it('a régua ENCONTRA o caminho legítimo — sensor do extrator', () => {
    // `menuItems` é a porta única do menu, e ela existe em produção. Se sumir da varredura, é o
    // extrator que está quebrado — não o código —, e todas as asserções de ausência abaixo
    // passariam sozinhas.
    expect(procurar(/\bmenuItems\b/).length).toBeGreaterThanOrEqual(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

const LEGADO = /show_in_menu|menu_promo/

/**
 * **A LOJA tem zero leituras, e isso não é allowlist — é literal.**
 *
 * Toda superfície da loja pergunta por `menuItems(…, surface)`, que é a única que sabe que a
 * resposta depende do dispositivo. Uma entrada aqui seria a barra do topo e a folha do celular
 * voltando a discordar da tela que as configura.
 */
describe('nenhum arquivo da LOJA lê a curadoria legada (NAV-01)', () => {
  it('`show_in_menu` e `menu_promo` não aparecem em `apps/store/**`', () => {
    const leituras = procurar(LEGADO).filter((o) => o.arquivo.startsWith('apps/store/'))

    expect(
      leituras.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'leia por `menuItems(input, surface)` (@estrelinha/core/menu) — a resposta depende do dispositivo',
    ).toEqual([])
  })
})

/**
 * **O painel ainda lê as duas, e a lista é DÍVIDA EM TRÂNSITO, não permissão.**
 *
 * A tela `/admin/menu` é reescrita na fase seguinte da mesma feature (T21 a T26). Enquanto isso ela
 * continua ligando `show_in_menu` e gravando `menu_promo`, porque a alternativa seria deixá-la
 * quebrada entre dois lotes — e painel quebrado é a dona sem como configurar a loja.
 *
 * O que torna a lista segura é a asserção logo abaixo, que exige que **cada entrada ainda case**:
 * quando a T21 apagar a leitura, este arquivo reprova até a entrada sair daqui. Ela não pode
 * apodrecer em silêncio, que é o destino normal de allowlist.
 */
const DIVIDA_DO_PAINEL: Record<string, string> = {
  'apps/backoffice/src/entities/category/api/useAdminCategories.ts':
    'O `CATEGORY_SELECT` ainda nomeia as duas colunas legadas. Sai na T21, quando a tela passar a ler `menu_desktop`/`menu_mobile` e `menu_banners`.',
  'apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx':
    'A lista de vagas, que liga a categoria pela coluna única. Reescrita na T21 para duas superfícies, sem teto e com chip de ícone.',
  'apps/backoffice/src/features/store-menu/ui/MenuPromoEditor.tsx':
    'O editor do card antigo. Vira `MenuBannerEditor` na T25, com dois slots, arte por dispositivo e seletor de destino.',
  'apps/backoffice/src/pages/admin/AdminMenuPage.tsx':
    'A página que grava as duas colunas. Reescrita na T26, com alternador de superfície e a prévia sendo a loja num iframe.',
}

describe('o painel ainda lê o legado — e a lista existe para expirar', () => {
  const leituras = procurar(LEGADO)

  it('toda leitura está na lista, com o motivo e a tarefa que a remove', () => {
    const foraDaLista = leituras.filter(
      (o) => !Object.prototype.hasOwnProperty.call(DIVIDA_DO_PAINEL, o.arquivo),
    )
    expect(
      foraDaLista.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'a curadoria do menu é por dispositivo: leia `menu_desktop`/`menu_mobile`, nunca a coluna gerada',
    ).toEqual([])
  })

  it('cada entrada AINDA casa — a lista reprova quando a dívida é paga', () => {
    // É o que a impede de virar letra morta. Sem esta asserção, a T21 apagaria a leitura e a
    // entrada ficaria pendurada, autorizando por escrito uma leitura que ninguém mais faz — e
    // abrindo a porta para a próxima entrar sem discussão.
    for (const arquivo of Object.keys(DIVIDA_DO_PAINEL)) {
      expect(
        leituras.some((o) => o.arquivo === arquivo),
        `${arquivo} está na lista mas não lê mais o legado — remova a entrada`,
      ).toBe(true)
    }
  })

  it('a lista é FECHADA, e só tem arquivo do painel — escrito literalmente', () => {
    expect(Object.keys(DIVIDA_DO_PAINEL).sort()).toEqual([
      'apps/backoffice/src/entities/category/api/useAdminCategories.ts',
      'apps/backoffice/src/features/store-menu/ui/MenuPromoEditor.tsx',
      'apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx',
      'apps/backoffice/src/pages/admin/AdminMenuPage.tsx',
    ])
    expect(Object.keys(DIVIDA_DO_PAINEL).filter((a) => a.startsWith('apps/store/'))).toEqual([])
  })

  it('toda entrada diz o motivo e quando ela sai', () => {
    const semMotivo = Object.entries(DIVIDA_DO_PAINEL)
      .filter(([, motivo]) => motivo.length < 60 || !/T\d\d/.test(motivo))
      .map(([arquivo]) => arquivo)

    expect(semMotivo).toEqual([])
  })
})

describe('a régua funciona — sensores por mutação', () => {
  it('pegaria a leitura de volta numa tela da loja', () => {
    // Sem este sensor, um regex quebrado faria as duas asserções acima passarem para sempre.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/header/ui/sintetico.tsx',
      linhas: [
        'const entradas = categories.filter(c => c.show_in_menu)',
        'const promo = category.menu_promo ?? null',
      ],
    }
    expect(procurar(LEGADO, [sintetico])).toHaveLength(2)
  })

  it('NÃO acusa a leitura legítima, que é por superfície', () => {
    // O par do sensor acima: uma régua que casasse tudo reprovaria o código correto.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/entities/category/api/sintetico.ts',
      linhas: [
        "const items = menuItems({ categories, links }, 'desktop')",
        'menu_desktop: row.menu_desktop === true,',
        'menu_mobile: row.menu_mobile === true,',
        'menu_banners: row.menu_banners ?? null,',
      ],
    }
    expect(procurar(LEGADO, [sintetico])).toEqual([])
  })
})
