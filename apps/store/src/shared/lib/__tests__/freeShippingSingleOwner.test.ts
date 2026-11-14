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

/**
 * Escopo literal: as duas pontas que têm tela, e as edge functions — que recalculam o frete grátis
 * do pedido montado no servidor (`checkout`, `mercado-pago`) e, rodando com a chave de serviço,
 * seriam a superfície mais cara para uma segunda leitura do campo.
 */
const ESCOPO = ['apps', 'supabase/functions']

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
    // **Linha e bloco na MESMA varredura, e a ordem é a do texto** — `BL-027`.
    //
    // Até 2026-09-06 isto eram DUAS passadas (bloco primeiro, linha depois), e tinha um ponto cego
    // que a feature 39 encontrou nos guardas do menu: um comentário de LINHA que cite um glob de
    // dois asteriscos carrega um abre-bloco dentro de si, e para a régua de bloco aquilo ABRE um
    // comentário — que ela apaga até o próximo fecha-bloco do arquivo, **inclusive CÓDIGO**.
    //
    // O efeito é o pior possível num guarda cuja asserção é uma AUSÊNCIA: ele não reprova, ele
    // deixa de enxergar um trecho e passa a **aprovar em silêncio** o que estiver lá dentro. Verde,
    // listado na tabela dos guardas, e cego — num guarda do caminho do dinheiro.
    //
    // Com a alternação, quem começa primeiro consome: um comentário de linha engole o resto da
    // linha (e o glob junto), e um abre-bloco engole até o fecha-bloco. O miolo vira espaço,
    // **preservando as quebras** — o índice de cada linha não desliza, e o guarda continua podendo
    // apontar `arquivo:linha`.
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
    // E as functions — a régua das regiões vale também no servidor.
    expect(varridos.some((a) => a.rel === 'supabase/functions/checkout/proposal.ts')).toBe(true)
    expect(varridos.some((a) => a.rel === 'supabase/functions/mercado-pago/handlers.ts')).toBe(true)
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

  // O glob armadilha, montado por CONCATENAÇÃO de propósito — duas razões independentes.
  //
  // 1. Escrito colado, ele poria um abre-bloco cru no fonte DESTE arquivo, e todo guarda que varre
  //    a pasta dos apps passaria a ler daqui um bloco que nunca fecha. A régua não pode contaminar
  //    o objeto medido, nem o dos vizinhos.
  // 2. A forma importa: o glob termina em dois asteriscos SEM barra depois, e é só assim que o
  //    abre-bloco que ele carrega fica em aberto. Com a barra logo em seguida ele fecharia sozinho
  //    — bloco completo, defeito nenhum. Foi assim que a primeira versão deste sensor nasceu morta:
  //    passava com o removedor velho no lugar.
  const GLOB_ARMADILHA = 'apps/' + '*'.repeat(2)

  it('comentário de LINHA que cita um glob NÃO cega o código abaixo — sensor do ponto cego (BL-027)', () => {
    // O defeito que a `BL-027` registrou, reproduzido inteiro. São TRÊS peças, e nenhuma é enfeite:
    //
    //   1. um comentário de linha que cite o glob — ele carrega o abre-bloco;
    //   2. código depois dele — é o que fica invisível;
    //   3. um bloco de verdade mais abaixo — é o fecha-bloco que a régua velha vai procurar.
    //
    // Sem a peça 3 o removedor antigo não casa nada (não há `*/` para fechar) e o sensor passa com
    // o defeito no lugar. Com ela, o removedor antigo apaga de `apps` até `verdade */` — levando o
    // `const depois = 1` junto, em silêncio.
    const fonte = [
      '/** a prosa que explica a régua */',
      `// a varredura cobre ${GLOB_ARMADILHA}, e este glob era a armadilha`,
      'const depois = 1',
      '/* bloco de verdade */',
      'const final = 2',
      '',
    ].join('\n')

    const linhas = semComentarios(fonte)

    // O código sobrevive aos dois lados do comentário armadilha.
    expect(linhas.some((l) => l.includes('const depois = 1'))).toBe(true)
    expect(linhas.some((l) => l.includes('const final = 2'))).toBe(true)
    // E a prosa continua sumindo — a correção não pode ter desligado o removedor.
    expect(linhas.some((l) => l.includes('a prosa que explica'))).toBe(false)
    expect(linhas.some((l) => l.includes('armadilha'))).toBe(false)
    expect(linhas.some((l) => l.includes('bloco de verdade'))).toBe(false)
    // A numeração não desliza: 5 linhas de fonte + a final vazia.
    expect(linhas).toHaveLength(6)
  })

  it('leitura nova FORA do allowlist é acusada, mesmo com o comentário armadilha ao lado — sensor por mutação (BL-027)', () => {
    // O sensor que fecha o círculo: não basta o removedor preservar o código, a REGRA tem de
    // continuar acusando o que estiver nele. Este é o arquivo que a `BL-027` descreve — uma oitava
    // superfície lendo o campo cru, escondida atrás de um comentário com glob.
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/cart-drawer/ui/Sintetico.tsx',
      linhas: semComentarios(
        [
          `// esta tela varre ${GLOB_ARMADILHA} à procura de nada`,
          'const teto = settings.shipping.free_shipping_threshold',
          'const gratis = subtotal >= settings.shipping.free_shipping_threshold',
          '/* fim do arquivo */',
          '',
        ].join('\n'),
      ),
    }

    const achados = procurar(/free_shipping_threshold/, [sintetico])
    // As DUAS leituras, nas linhas certas — a numeração é o que deixa o guarda apontar o defeito.
    expect(achados.map((o) => o.linha)).toEqual([2, 3])
    // E caem fora do allowlist, que é o veredito que derruba a suíte de verdade.
    expect(
      achados.filter((o) => !Object.prototype.hasOwnProperty.call(ALLOWLIST, o.arquivo)),
    ).toHaveLength(2)
    // A comparação por forma também pega a linha 3 — a assinatura exata do defeito da `37`.
    expect(
      procurar(/>=\s*.*free_shipping_threshold|free_shipping_threshold\s*<=/, [sintetico]),
    ).toHaveLength(1)
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
  // ⚠️ **Mudou de endereço na feature 55, e continua sendo UM.** O editor morava na
  // `AdminSettingsPage`, que desenhava as oito abas à mão; a página agora só monta o painel da seção
  // ativa, e o card de Frete mora na seção. O guarda pegou a troca pelos **dois** lados — acusou o
  // arquivo novo por não estar na lista, e acusou a entrada velha por não ler mais o campo. É o
  // segundo sentido que impede uma allowlist de virar cemitério.
  'apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx':
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
      'apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx',
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

// ───────────────────────────────────────────────────────────────────────────
// As regiões do frete grátis
// ───────────────────────────────────────────────────────────────────────────

/**
 * `free_shipping_regions` tem o mesmo dono que o resto da regra: quem decide "esta região vale?" é
 * `freeShippingState`, e o único caminho do jsonb cru para a configuração é `freeShippingConfigOf`
 * (`@estrelinha/core/shipping`). Uma tela que lesse a lista crua trataria "campo ausente" como
 * "nenhuma região" — a linha antiga de `store_settings` deixaria de dar frete grátis no dia do
 * deploy, numa tela só, sem nada quebrar.
 *
 * O núcleo (`packages/core`) declara o campo e fica FORA desta varredura de propósito: é ele o dono.
 */
const ALLOWLIST_REGIOES: Record<string, string> = {
  'apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx':
    'O editor da configuração: grava a lista que as caixas marcam, lida por `freeShippingConfigOf`.',
  'apps/store/src/app/RuntimeSettingsLoader.tsx':
    'A ponte para o caminho não-React: copia o campo JÁ passado por `freeShippingConfigOf`, nunca o jsonb cru.',
}

const REGRA_REGIOES = /free_shipping_regions/

describe('nenhuma tela nem function lê `free_shipping_regions` direto', () => {
  const leituras = procurar(REGRA_REGIOES)

  it('toda ocorrência está no allowlist', () => {
    const foraDaLista = leituras.filter(
      (o) => !Object.prototype.hasOwnProperty.call(ALLOWLIST_REGIOES, o.arquivo),
    )
    expect(
      foraDaLista.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'leia as regiões por `freeShippingConfigOf`/`useFreeShipping` (@estrelinha/core/shipping)',
    ).toEqual([])
  })

  it('o allowlist ainda casa — entrada que não nomeia mais o campo reprova', () => {
    for (const arquivo of Object.keys(ALLOWLIST_REGIOES)) {
      expect(
        leituras.some((o) => o.arquivo === arquivo),
        `${arquivo} está no allowlist das regiões mas não nomeia mais o campo — remova a entrada`,
      ).toBe(true)
    }
  })

  it('o allowlist é FECHADO — dois arquivos, escritos literalmente', () => {
    expect(Object.keys(ALLOWLIST_REGIOES).sort()).toEqual([
      'apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx',
      'apps/store/src/app/RuntimeSettingsLoader.tsx',
    ])
  })

  it('a ponte copia o campo já passado por `freeShippingConfigOf`, nunca o jsonb cru', () => {
    const ponte = producao.find((a) => a.rel === 'apps/store/src/app/RuntimeSettingsLoader.tsx')!
    expect(ponte.linhas.some((l) => /freeShippingConfigOf\(/.test(l))).toBe(true)
    const linhas = ponte.linhas.filter((l) => REGRA_REGIOES.test(l))
    expect(linhas.length).toBeGreaterThan(0)
    for (const linha of linhas) {
      expect(linha.trim()).toMatch(/^free_shipping_regions:\s*frete\.free_shipping_regions,?$/)
    }
    // E `frete` é o resultado do dono, não o jsonb.
    expect(ponte.linhas.some((l) => /\bfrete\s*=\s*freeShippingConfigOf\(/.test(l))).toBe(true)
  })

  it('metade positiva: o editor e as duas functions passam pelo dono', () => {
    // Sem esta metade, apagar as chamadas deixaria a régua de ausência verdadeira e vazia.
    for (const rel of [
      'apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx',
      'supabase/functions/checkout/proposal.ts',
      'supabase/functions/mercado-pago/handlers.ts',
    ]) {
      const arquivo = producao.find((a) => a.rel === rel)
      expect(arquivo, rel).toBeDefined()
      expect(arquivo!.linhas.some((l) => /freeShippingConfigOf\(/.test(l)), rel).toBe(true)
    }
  })

  it('SENSOR: uma leitura crua nova é acusada — numa tela da loja e numa function, com CRLF, LF e o glob', () => {
    const fontes = [
      `// a regra cobre ${'apps/' + '*'.repeat(2)}\r\nconst regioes = settings.shipping.free_shipping_regions ?? []\r\n/* fim */\r\n`,
      `// comentário\nconst regioes = shipping.free_shipping_regions\n`,
    ]
    for (const [i, fonte] of fontes.entries()) {
      for (const rel of ['apps/store/src/widgets/cart-drawer/ui/Sintetico.tsx', 'supabase/functions/checkout/sintetico.ts']) {
        const sintetico: Arquivo = { rel, linhas: semComentarios(fonte) }
        const achados = procurar(REGRA_REGIOES, [sintetico])
        expect(achados.map((o) => o.linha), `${rel} #${i}`).toEqual([2])
        expect(
          achados.filter((o) => !Object.prototype.hasOwnProperty.call(ALLOWLIST_REGIOES, o.arquivo)),
        ).toHaveLength(1)
      }
    }
  })

  it('SENSOR inverso: a prosa e a leitura pelo dono não são acusadas', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/widgets/cart-drawer/ui/Sintetico.tsx',
      linhas: semComentarios(
        [
          '// free_shipping_regions é do dono',
          '/** free_shipping_regions\r\n */',
          'const frete = useFreeShipping(subtotal, cep)',
          'const regras = freeShippingConfigOf(settings.shipping)',
          '',
        ].join('\n'),
      ),
    }
    expect(procurar(REGRA_REGIOES, [sintetico])).toEqual([])
  })
})

/**
 * A faixa numérica de CEP por região mora em `packages/core/src/shipping/region.ts`, e só lá. Uma
 * segunda tabela — "CEP começando por 8 ou 9 é Sul" — divergiria da de `core` no Norte e no
 * Centro-Oeste, que se intercalam entre 76800 e 78999, e a cliente veria "liberado" numa tela e
 * pagaria o frete na outra.
 *
 * Três formas: a linha da tabela com o slug da região e um prefixo de CEP; a tupla de dois prefixos
 * de cinco dígitos (a tabela sem o slug); e a comparação de um CEP com um limite redondo de faixa
 * (`>= 80000`, `<= 99999999`) numa linha que fala de CEP.
 */
const DONO_DAS_FAIXAS = 'packages/core/src/shipping/region.ts'
const ESCOPO_FAIXAS = ['apps', 'supabase/functions', 'packages']

const SLUG_DE_REGIAO = /(['"`])(sul|sudeste|centro-oeste|nordeste|norte)\1/
const PREFIXO = /\b\d{4,5}\b/
const TUPLA_DE_PREFIXOS = /\[\s*\d{4,5}\s*,\s*\d{5}\s*[,\]]/
const COMPARACAO_DE_CEP = /[<>]=?\s*\d{2}(?:000|999)(?:\d{3})?\b/
const FALA_DE_CEP = /\b(?:cep|prefixo|prefix|zip)\w*/i

const ehFaixaDeCep = (linha: string): boolean =>
  (SLUG_DE_REGIAO.test(linha) && PREFIXO.test(linha)) ||
  TUPLA_DE_PREFIXOS.test(linha) ||
  (FALA_DE_CEP.test(linha) && COMPARACAO_DE_CEP.test(linha))

const varridosFaixas: Arquivo[] = ESCOPO_FAIXAS.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))
const producaoFaixas = varridosFaixas.filter((a) => !eTeste(a.rel))

const faixasEm = (alvo: Arquivo[]): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (ehFaixaDeCep(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

describe('a faixa de CEP por região tem um dono', () => {
  it('âncora: a varredura alcança os três escopos e o dono', () => {
    expect(producaoFaixas.length).toBeGreaterThan(300)
    expect(producaoFaixas.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(producaoFaixas.some((a) => a.rel.startsWith('supabase/functions/'))).toBe(true)
    expect(producaoFaixas.some((a) => a.rel === DONO_DAS_FAIXAS)).toBe(true)
  })

  it('âncora: a régua ENCONTRA a tabela no dono — as dez faixas', () => {
    // Sem esta âncora, um regex quebrado aprovaria a ausência abaixo por vacuidade.
    const noDono = faixasEm(producaoFaixas.filter((a) => a.rel === DONO_DAS_FAIXAS))
    expect(noDono.length).toBeGreaterThanOrEqual(10)
  })

  it('nenhum arquivo fora do dono escreve faixa de CEP por região', () => {
    const fora = faixasEm(producaoFaixas.filter((a) => a.rel !== DONO_DAS_FAIXAS))
    expect(
      fora.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`),
      'pergunte a região do CEP a `regionOfCep` (@estrelinha/core/shipping)',
    ).toEqual([])
  })

  it('SENSOR: as três formas são acusadas, com CRLF, LF e o glob ao lado', () => {
    const glob = 'apps/' + '*'.repeat(2)
    for (const fim of ['\r\n', '\n']) {
      const sintetico: Arquivo = {
        rel: 'apps/store/src/features/sintetico.ts',
        linhas: semComentarios(
          [
            `// a regra cobre ${glob}`,
            "const SUL = [80000, 99999, 'sul']",
            'const FAIXAS = [[1000, 39999], [40000, 65999]]',
            'if (prefixoDoCep >= 80000) return true',
            'const sul = Number(cep.slice(0, 5)) <= 99999',
            '/* fim */',
            '',
          ].join(fim),
        ),
      }
      expect(faixasEm([sintetico]).map((o) => o.linha), JSON.stringify(fim)).toEqual([2, 3, 4, 5])
    }
  })

  it('SENSOR inverso: o código legítimo vizinho não é acusado', () => {
    const sintetico: Arquivo = {
      rel: 'apps/store/src/features/sintetico.ts',
      linhas: semComentarios(
        [
          "const regiao = regionOfCep(cep) // 'sul'",
          "if (regiao === 'sul') mostrar()",
          'if (elapsed > 15000) desistir()',
          'const SRCSET = [720, 1080]',
          "const LIMITE = 40000 // centavos",
          "if (cep.length >= 8) consultar()",
          "/* [80000, 99999, 'sul'] */",
          '',
        ].join('\n'),
      ),
    }
    expect(faixasEm([sintetico])).toEqual([])
  })
})
