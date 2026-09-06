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
 * A régua nunca é o objeto medido: o escopo está escrito **literalmente** aqui, e não derivado de
 * constante que o código sob teste exporte — lição da `fieldBorder`. **E não há mais allowlist**: a
 * lista de dívida em trânsito que o painel tinha durante o lote 3 expirou na fase 5, como estava
 * escrito nela que expiraria.
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
    // projeto — um comentário de linha terminado em `\r` não casava nada, e o stripper ficava inerte.
    .replace(/\r\n/g, '\n')
    // **Linha e bloco na MESMA varredura, e a ordem é a do texto.** Duas passadas (bloco primeiro,
    // linha depois) têm um ponto cego que custou uma reprovação de verdade: um comentário de LINHA
    // que cite um glob de dois asteriscos abre um "bloco" aos olhos da segunda régua, e ela apaga
    // tudo até o próximo fecha-bloco — inclusive CÓDIGO. O efeito é o pior possível num guarda: ele
    // deixa de enxergar um trecho e passa a aprovar o que estiver lá dentro, em silêncio.
    //
    // Com a alternação, quem começa primeiro consome: um comentário de linha engole o resto da linha
    // (e o glob junto), e um abre-bloco engole até o fecha-bloco. O miolo vira espaço, preservando as
    // quebras — o índice de cada linha não desliza.
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

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

  it('comentário de LINHA que cita um glob não engole o código abaixo — sensor do ponto cego', () => {
    // Custou uma reprovação de verdade nesta feature: a régua tinha duas passadas (bloco primeiro,
    // linha depois), e um comentário de linha citando `apps` com dois asteriscos abria um "bloco"
    // aos olhos da segunda — que apagava tudo até o próximo fecha-bloco, **inclusive código**. O
    // guarda ficava CEGO para o trecho e aprovava o que estivesse lá dentro, em silêncio.
    const fonte = [
      '/** a régua vale nos dois apps */',
      "// vale para apps/**, e este glob é a armadilha",
      "const lido = row.show_in_menu",
      '',
    ].join(String.fromCharCode(10))

    const linhas = semComentarios(fonte)
    expect(linhas.some((l) => l.includes('const lido = row.show_in_menu'))).toBe(true)
    expect(linhas.some((l) => l.includes('a régua vale'))).toBe(false)
    expect(linhas.some((l) => l.includes('armadilha'))).toBe(false)
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
 * **A dívida do painel foi PAGA, e a lista está vazia — literalmente.**
 *
 * Ela existiu por um lote: quando o lote 3 fez a loja inteira ler `menuItems(…, surface)`, a tela
 * `/admin/menu` ainda ligava `show_in_menu` e gravava `menu_promo`, porque a alternativa era deixá-la
 * quebrada entre dois commits — e painel quebrado é a dona sem como configurar a loja. Cada entrada
 * nomeava a task que a removeria (T21 a T26), e uma asserção exigia que ela **ainda casasse**: no dia
 * em que a leitura sumisse, este arquivo reprovava até a entrada sair daqui.
 *
 * Foi o que aconteceu. A fase 5 reescreveu `MenuSlotList`, apagou `MenuPromoEditor` e `MenuBarPreview`,
 * trocou as colunas do `CATEGORY_SELECT` e refez a página — e as quatro entradas saíram juntas.
 *
 * **A ausência da lista é a asserção**: daqui em diante, qualquer leitura em `apps/**` reprova, sem
 * exceção nomeada para negociar. Uma permissão pendurada é como a próxima entra sem ninguém ver.
 */
describe('nenhum arquivo do PAINEL lê a curadoria legada (NAV-01)', () => {
  it('`show_in_menu` e `menu_promo` não aparecem em `apps/backoffice/**`', () => {
    const leituras = procurar(LEGADO).filter((o) => o.arquivo.startsWith('apps/backoffice/'))

    expect(
      leituras.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'a curadoria do menu é por dispositivo: leia `menu_desktop`/`menu_mobile`, nunca a coluna gerada',
    ).toEqual([])
  })

  it('não sobrou allowlist: a varredura inteira de `apps/**` está limpa', () => {
    // A soma das duas asserções acima, escrita como uma só — é ela que fica de pé quando alguém
    // acrescentar um app novo ao monorepo.
    expect(procurar(LEGADO).map((o) => `${o.arquivo}:${o.linha}`)).toEqual([])
  })

  it('o painel MIGROU de verdade — ele lê as duas colunas por dispositivo', () => {
    // Sensor da migração, e da varredura: se o painel tivesse simplesmente parado de ler o menu,
    // a asserção de ausência acima passaria sozinha e ninguém saberia.
    const doPainel = producao.filter((a) => a.rel.startsWith('apps/backoffice/'))
    expect(procurar(/menu_desktop/, doPainel).length).toBeGreaterThanOrEqual(1)
    expect(procurar(/menu_mobile/, doPainel).length).toBeGreaterThanOrEqual(1)
    expect(procurar(/menu_banners/, doPainel).length).toBeGreaterThanOrEqual(1)
  })

  it('o `CATEGORY_SELECT` do painel não nomeia mais as colunas legadas', () => {
    // A entrada nº 1 da dívida, medida no arquivo em vez de na lista: era o `select` que trazia
    // `show_in_menu` e `menu_promo` para dentro de toda tela de categoria do painel.
    const select = producao.find(
      (a) => a.rel === 'apps/backoffice/src/entities/category/api/useAdminCategories.ts',
    )
    expect(select, 'o hook de categorias do painel sumiu — o guarda perdeu o alvo').toBeTruthy()
    expect(procurar(LEGADO, [select!])).toEqual([])
    expect(procurar(/menu_desktop/, [select!]).length).toBeGreaterThanOrEqual(1)
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
