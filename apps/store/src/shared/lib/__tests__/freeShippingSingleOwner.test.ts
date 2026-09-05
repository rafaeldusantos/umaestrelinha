import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O frete grátis tem UM dono, e este guarda é o que mantém isso verdadeiro — `FRG-09`.
 *
 * Antes da feature 37, **sete superfícies** liam `free_shipping_threshold` por conta própria e se
 * dividiam em dois grupos que discordavam no caso de borda. Com a faixa em zero, três escondiam o
 * texto (`threshold > 0`) e quatro **zeravam o frete** (`subtotal >= threshold`, sempre verdadeiro
 * contra zero). Zerar o campo no painel escondia o anúncio e liberava frete grátis para todo mundo
 * no caixa — o "defeito 01" do projeto, no caminho do dinheiro.
 *
 * Hoje quem responde é `freeShippingState` (`@estrelinha/core/shipping`), alcançado pelas telas por
 * `useFreeShipping`. **Sem este guarda, a oitava superfície nasce lendo o campo cru de novo**, e nada
 * quebra: o build passa, o `tsc` passa, o teste de componente passa, e a loja volta a ter duas
 * respostas para a mesma pergunta.
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
 * não "conserte o código". A régua não pode ser confundida com a explicação da régua (mesma lição
 * de `core/shopping/__tests__/purity.test.ts`).
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    // CRLF NORMALIZADO PRIMEIRO, e isto não é higiene — é correção.
    //
    // Em JavaScript `.` **não casa `\r`** (é terminador de linha, como `\n`), e `$` sem a flag `m`
    // não ancora antes dele. Num checkout Windows — que é a plataforma deste projeto — a linha
    // `// comentário\r` fazia `/\/\/.*$/` não casar NADA, e nenhum comentário de linha era
    // removido. O guarda acusava a prosa que explica o defeito, e o conserto "óbvio" seria apagar
    // o comentário em vez de consertar o código.
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
      // `lastIndex` não persiste porque os padrões abaixo não usam a flag `g`.
      if (padrao.test(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('freeShipping — âncoras da varredura', () => {
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
    // A régua não pode ser confundida com a prosa sobre a régua. E os dois finais de linha
    // precisam ser provados: com CRLF o stripper de linha ficava inerte e o guarda acusava
    // comentário — defeito real, achado ao escrever este arquivo.
    const crlf = semComentarios('const a = 1\r\n// free_shipping_threshold aqui\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// free_shipping_threshold aqui\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * free_shipping_threshold\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => l.includes('free_shipping_threshold'))).toBe(false)
      // E o código em volta sobrevive — um stripper que apagasse tudo passaria no teste acima.
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }

    // A numeração não desliza: o bloco de 5 linhas continua com 5 linhas (+ a final vazia).
    expect(bloco).toHaveLength(6)
  })

  it('a régua ENCONTRA o que procura — sensor do extrator', () => {
    // Se `procurar` deixasse de casar qualquer coisa, as asserções de ausência passariam sozinhas.
    // `useFreeShipping` é o caminho legítimo, e ele existe em produção: se ele sumir da varredura,
    // o extrator está quebrado, não o código.
    const legitimos = procurar(/useFreeShipping/)
    expect(legitimos.length).toBeGreaterThanOrEqual(7)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

/**
 * Exatamente UM arquivo pode ler o campo cru: o **editor da configuração**, que por definição o
 * escreve. Entrada nova exige motivo escrito — a lista existe para forçar quem adicionar a
 * justificar, não para amansar a varredura. Uma tela que "precisa" ler o campo cru não precisa:
 * precisa de `useFreeShipping`.
 */
const ALLOWLIST: Record<string, string> = {
  'apps/backoffice/src/pages/admin/AdminSettingsPage.tsx':
    'O editor da configuração. É ele quem grava o campo, e a recusa de FRG-12 acontece aqui.',
  'apps/store/src/app/RuntimeSettingsLoader.tsx':
    'A ponte para o caminho não-React: copia os campos crus do banco para `setRuntimeShippingSettings`, que o `cartStore` (zustand, sem hook) consome. Copiar não é decidir — quem decide continua sendo `freeShippingState`.',
}

describe('nenhuma tela lê `free_shipping_threshold` direto (FRG-09)', () => {
  const leituras = procurar(/free_shipping_threshold/)

  it('toda leitura está no allowlist, com motivo', () => {
    const foraDaLista = leituras.filter(
      (o) => !Object.prototype.hasOwnProperty.call(ALLOWLIST, o.arquivo),
    )
    expect(
      foraDaLista.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'leia por `useFreeShipping` (@estrelinha/core/hooks/useFreeShipping) em vez do campo cru',
    ).toEqual([])
  })

  it('o allowlist ainda casa — se ele parar de casar, o teste reprova em vez de aprovar vazio', () => {
    // Sem esta asserção, renomear o arquivo do editor faria o allowlist virar letra morta e o
    // guarda passaria a aprovar por vacuidade.
    for (const arquivo of Object.keys(ALLOWLIST)) {
      expect(
        leituras.some((o) => o.arquivo === arquivo),
        `${arquivo} está no allowlist mas não lê mais o campo — remova a entrada`,
      ).toBe(true)
    }
  })

  it('o allowlist é FECHADO — dois arquivos, escritos literalmente', () => {
    // A lista não pode crescer por conveniência: cada entrada é uma superfície a mais que pode
    // divergir. Acrescentar uma exige mexer aqui, o que é o ponto.
    expect(Object.keys(ALLOWLIST).sort()).toEqual([
      'apps/backoffice/src/pages/admin/AdminSettingsPage.tsx',
      'apps/store/src/app/RuntimeSettingsLoader.tsx',
    ])
  })

  it('nenhuma entrada do allowlist é tela de vitrine ou de checkout', () => {
    // Onde o defeito morava: `widgets/`, `features/checkout`, `entities/product`, `pages/`.
    // Um arquivo desses no allowlist seria o defeito voltando com autorização por escrito.
    const vitrine = Object.keys(ALLOWLIST).filter((a) =>
      /apps\/store\/src\/(widgets|features|entities|pages)\//.test(a),
    )
    expect(vitrine).toEqual([])
  })
})

describe('o segundo dono não volta (FRG-03)', () => {
  it('`freeShippingProgress` não existe mais em apps/', () => {
    // Era a regra escrita uma segunda vez, com o caso de borda INVERTIDO: faixa zerada devolvia
    // `reached: true`. Migrou para `freeShippingState` em `@estrelinha/core/shipping`.
    // `producao` e não `varridos`: este arquivo precisa NOMEAR o que procura, e uma varredura que
    // se inclua reprova para sempre. Teste pode citar o nome; produção não pode reintroduzi-lo.
    expect(procurar(/freeShippingProgress/).map((o) => `${o.arquivo}:${o.linha}`)).toEqual([])
  })

  it('`FreeShippingBar` não existe mais em apps/', () => {
    // Componente sem consumidor nenhum, e oitava leitura da regra. Apagado na feature 37.
    expect(procurar(/FreeShippingBar/).map((o) => `${o.arquivo}:${o.linha}`)).toEqual([])
  })

  it('a régua DE FATO pegaria os dois nomes de volta — sensor por mutação', () => {
    // Sem este sensor, restringir a varredura a `producao` poderia ter esvaziado a régua sem
    // ninguém notar, e as duas asserções acima passariam para sempre.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/sintetico.ts',
      linhas: [
        'export const freeShippingProgress = (subtotal: number, threshold: number) => {}',
        "import FreeShippingBar from './ui/FreeShippingBar'",
      ],
    }
    expect(procurar(/freeShippingProgress/, [sintetico])).toHaveLength(1)
    expect(procurar(/FreeShippingBar/, [sintetico])).toHaveLength(1)
  })

  it('ninguém compara subtotal com a faixa por conta própria', () => {
    // A forma exata do defeito: `subtotal >= free_shipping_threshold`. Coberta pela regra de
    // allowlist acima, mas asserida por forma também — o editor não faz essa comparação.
    const comparacoes = procurar(/>=\s*.*free_shipping_threshold|free_shipping_threshold\s*<=/)
    expect(comparacoes.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })
})

describe('nenhum valor de frete grátis cravado em JSX (FRG-13)', () => {
  it('não há copy com o valor da faixa escrito à mão', () => {
    // `AuthOverlay` carregava `'Frete grátis acima de R$150'` literal, e sobreviveu à `PDP-24` (que
    // corrigiu a `PoliciesPage`) e à feature 24 (que corrigiu a `MarqueeBar`). Uma regra que existe
    // em dois lugares e não pega o terceiro é regra que ninguém está aplicando.
    const cravados = procurar(/[Ff]rete\s+gr[áa]tis[^'"`\n]{0,24}R\$\s?\d/)
    expect(cravados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('a régua DE FATO pegaria um literal desses — sensor por mutação', () => {
    // Sem este sensor, um regex quebrado faria a asserção acima passar para sempre.
    const sintetico: Arquivo = {
      rel: 'sintetico.tsx',

      linhas: [
        `const BENEFITS = ['Frete grátis acima de R$150', 'Peça única']`,
        `<p>Frete grátis para compras acima de R$ 150,00!</p>`,
        `<p>Frete grátis a partir de R$ 99</p>`,
      ],
    }
    expect(procurar(/[Ff]rete\s+gr[áa]tis[^'"`\n]{0,24}R\$\s?\d/, [sintetico])).toHaveLength(3)
  })

  it('a régua NÃO acusa copy legítima derivada das settings', () => {
    // O par do sensor acima: uma régua que casasse tudo seria tão inútil quanto uma que não casa
    // nada, e reprovaria o código correto.
    const sintetico: Arquivo = {
      rel: 'sintetico.tsx',

      linhas: [
        '`Frete grátis acima de ${formatPrice(freteGratis.threshold)}`',
        "top: 'Frete grátis',",
        '<>Faltam {formatPrice(progress.remaining)} para frete grátis!</>',
      ],
    }
    expect(procurar(/[Ff]rete\s+gr[áa]tis[^'"`\n]{0,24}R\$\s?\d/, [sintetico])).toEqual([])
  })
})
