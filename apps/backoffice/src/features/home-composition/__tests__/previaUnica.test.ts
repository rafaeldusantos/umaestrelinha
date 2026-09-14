// Feature 25, `PRV-18` — **a Home tem UM desenho, e ele mora na loja.**
// Feature 39, `NAV-43` — **e o MENU também.**
//
// Este guarda existe porque o defeito que a feature eliminou não quebra nada ao voltar. Até a `24` o
// painel tinha `HomePreview.tsx` — 277 linhas redesenhando à mão o que
// `apps/store/src/widgets/home-renderer` já desenhava. As duas versões divergiam sem que build,
// `tsc` ou teste de componente acusassem: o painel prometia um arranjo e a loja renderizava outro.
//
// A tentação de reintroduzi-lo é concreta e simpática: "só um esqueminha para quando o iframe não
// carrega", "só um mini-mapa ao lado". Qualquer uma delas é o segundo dono do desenho de volta.
//
// **O menu carregava o mesmo defeito, e ele nunca tinha saído.** `MenuBarPreview.tsx` desenhava a
// barra do topo à mão, com os tokens do admin, e a lista fixa que ele consumia mostrava um item
// (`/crie-seu-botton`) que **não existia na loja** — a prévia do painel prometia uma navegação que
// levaria a 404. A feature 39 apagou o arquivo; este guarda passou a cobrir as duas features, porque
// a regra é uma só: **o painel não desenha o que a loja desenha**.
//
// **Âncora dupla** (a lição da `fieldBorder`, que varreu só as tags minúsculas e deixou 16 campos
// com 1,19:1 passarem): o teste confere que leu arquivos de verdade **e** que achou a superfície que
// deveria achar. Sem as duas, um caminho errado varre zero arquivo e passa em silêncio.

import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const AQUI = resolve(__dirname, '..')
const UI = join(AQUI, 'ui')

/** A outra feature que este guarda cobre desde a 39. */
const MENU = resolve(__dirname, '../../store-menu')
const MENU_UI = join(MENU, 'ui')

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []
  })

const FONTES = arquivos(AQUI).filter(f => !/\.test\.tsx?$/.test(f))
const FONTES_MENU = arquivos(MENU).filter(f => !/\.test\.tsx?$/.test(f))
const ler = (caminho: string) => readFileSync(caminho, 'utf8')

/**
 * O fonte **sem comentário**, para a régua não casar a prosa que explica a régua.
 *
 * `MenuBannerEditor.tsx` fala de `resolveMenuBanners` num comentário — de propósito, porque é ele
 * que trunca na leitura e a tela existe para acusar o excedente. Sem este recorte, o conserto de uma
 * reprovação viraria "apague o comentário" em vez de "conserte o código".
 *
 * CRLF é normalizado **primeiro**, e isso não é higiene: em JavaScript `.` não casa `\r`, então num
 * checkout Windows — que é a plataforma deste projeto — `// comentário\r` faria `/\/\/.*$/` não casar
 * nada e o stripper ficaria inerte. É o defeito que `freeShippingSingleOwner` já pagou uma vez.
 */
const semComentarios = (fonte: string): string =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[^\n]*?\/\/.*$/gm, linha => linha.replace(/\/\/.*$/, ''))

/** Os arquivos de UI cujo nome carrega "Preview" — os candidatos a segundo desenho. */
const previasEm = (dir: string): string[] =>
  readdirSync(dir)
    .filter(nome => /Preview/.test(nome) && !/\.test\./.test(nome))
    .sort()

describe('âncora — a varredura alcançou a feature de verdade', () => {
  it('leu os arquivos de `home-composition`', () => {
    expect(FONTES.length).toBeGreaterThan(10)
  })

  it('alcançou as superfícies que importam', () => {
    for (const alvo of [
      'ui/HomeLivePreview.tsx',
      'ui/HomeSectionList.tsx',
      'model/usePreviewBridge.ts',
    ]) {
      expect(FONTES.some(f => f.replace(/\\/g, '/').endsWith(alvo))).toBe(true)
    }
  })

  it('leu os arquivos de `store-menu`, e achou as superfícies dele', () => {
    // Segunda âncora, no objeto medido: `store-menu` renomeado ou movido faria as asserções do menu
    // varrerem uma lista vazia e aprovarem por vacuidade — a pior falha possível num guarda destes.
    expect(FONTES_MENU.length).toBeGreaterThan(4)
    for (const alvo of [
      'ui/MenuSlotList.tsx',
      'ui/MenuPanelEditor.tsx',
      'ui/MenuBannerEditor.tsx',
      'model/useMenuLinks.ts',
    ]) {
      expect(FONTES_MENU.some(f => f.replace(/\\/g, '/').endsWith(alvo))).toBe(true)
    }
  })
})

describe('PRV-18 — o esquema desenhado à mão não existe mais', () => {
  it('`HomePreview.tsx` foi removido', () => {
    expect(existsSync(join(UI, 'HomePreview.tsx'))).toBe(false)
    expect(existsSync(join(UI, 'HomePreview.test.tsx'))).toBe(false)
  })

  it('o barrel não exporta `HomePreview`', () => {
    const barrel = ler(join(AQUI, 'index.ts'))
    expect(barrel).not.toMatch(/export .*\bHomePreview\b.*from/)
    expect(barrel).toContain('HomeLivePreview')
  })

  it('nenhum arquivo importa um `HomePreview`', () => {
    const infratores = FONTES.filter(f => /from ['"].*HomePreview['"]/.test(ler(f)))
    expect(infratores).toEqual([])
  })
})

describe('PRV-18 — existe UMA superfície de prévia, e ela é um iframe', () => {
  it('só um arquivo de UI se chama "…Preview"', () => {
    expect(previasEm(UI)).toEqual(['HomeLivePreview.tsx'])
  })

  it('o palco monta um `<iframe>` — não desenha a Home, mostra a loja', () => {
    const fonte = ler(join(UI, 'HomeLivePreview.tsx'))
    expect(fonte).toContain('<iframe')
    expect(fonte).toContain('previewSrc')
  })

  it('o palco NÃO ramifica por tipo de seção — ramificar ali é o segundo desenho voltando', () => {
    const fonte = ler(join(UI, 'HomeLivePreview.tsx'))
    // Os onze tipos do catálogo. Nenhum deles pode aparecer como literal no palco: o palco não sabe
    // o que é um hero, e é justamente por não saber que ele não pode divergir da loja.
    for (const tipo of [
      'hero',
      'trust_bar',
      'banner_grid',
      'collection_rows',
      'brand_statement',
      'trending_tags',
      'newsletter',
      'collection_feature',
      'product_carousel',
      'category_grid',
      'hero_carousel',
    ]) {
      expect(fonte).not.toContain(`'${tipo}'`)
    }
  })

  it('o painel não importa nada de `apps/store` — a fronteira dos apps segue de pé', () => {
    const infratores = FONTES.filter(f => /from ['"].*apps\/store/.test(ler(f)))
    expect(infratores).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// BNR-51 — o CARROSSEL também tem um desenho, e ele mora na loja
// ───────────────────────────────────────────────────────────────────────────
//
// O bloco novo da feature 41 é o candidato mais provável ao segundo desenho de toda a Home: ele tem
// movimento, e "só uma mini-prévia para a dona conferir a ordem dos banners" é um pedido razoável
// que reintroduz exatamente o defeito que a `25` apagou e a `39` teve de apagar de novo no menu.

describe('BNR-51 — o painel não redesenha o carrossel', () => {
  it('nenhum arquivo do painel monta um trilho de slides', () => {
    // A régua é a **mecânica** do carrossel, não o nome do arquivo: quem redesenha precisa de um
    // container de rolagem com encaixe, e é isso que não pode existir aqui.
    const infratores = FONTES.filter(f => {
      const fonte = semComentarios(ler(f))
      return /snap-x|snap-mandatory|scroll-snap|aria-roledescription=["'{]?carrossel/.test(fonte)
    })
    expect(infratores.map(f => f.replace(/\\/g, '/'))).toEqual([])
  })

  it('o editor do carrossel existe, e NÃO desenha o carrossel', () => {
    // Âncora: sem esta asserção, renomear o editor faria a regra acima varrer um arquivo que já não
    // existe e aprovar por vacuidade.
    const editor = join(UI, 'HeroCarouselEditor.tsx')
    expect(existsSync(editor)).toBe(true)

    const fonte = semComentarios(ler(editor))
    expect(fonte).not.toContain('snap-x')
    // A miniatura de uma arte é um `<img>` num quadro — não é o trilho, e não gira.
    expect(fonte).not.toMatch(/setInterval|useHeroCarousel/)
  })

  it('nenhuma prévia nova apareceu na pasta de UI', () => {
    // A mesma régua de `HomePreview`, aplicada ao nome que o bloco novo tornaria tentador.
    expect(previasEm(UI)).toEqual(['HomeLivePreview.tsx'])
    expect(existsSync(join(UI, 'HeroCarouselPreview.tsx'))).toBe(false)
  })

  it('SENSOR: a régua pegaria um segundo desenho injetado', () => {
    // Prova de sensibilidade sem tocar no disco: a régua roda sobre o fonte, então basta alimentá-la
    // com o que um `HeroCarouselPreview.tsx` teria dentro.
    const sintetico = 'const Trilho = () => <div className="flex snap-x snap-mandatory overflow-x-auto" />'
    expect(/snap-x|snap-mandatory|scroll-snap/.test(semComentarios(sintetico))).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// DST-02 — o editor de PEÇAS é uma lista, e não uma vitrine
// ───────────────────────────────────────────────────────────────────────────
//
// Feature 50. O bloco novo é o único da Home que fala de **peça**, e por isso é o candidato mais
// provável ao segundo desenho desde o carrossel da `41`: "mostra a foto de cada peça na lista, assim
// a Adri reconhece" é um pedido razoável que reintroduz exatamente o defeito que a `25` apagou.
//
// As asserções abaixo não substituem nenhuma acima — a régua de arquivo (`FONTES`) já alcança os
// dois arquivos novos. O que este bloco acrescenta é a **prova de que ela os alcança**: sem ela, um
// editor que nascesse fora da varredura passaria em silêncio, que é a pior falha possível num
// guarda de ausência.

describe('DST-02 — o painel não desenha a vitrine de peças', () => {
  it('a varredura ALCANÇA os dois arquivos novos', () => {
    // Âncora, e é ela que dá sentido às asserções seguintes. Um `FONTES` que não os enxergasse
    // faria as três regras abaixo varrerem zero arquivo e aprovarem por vacuidade.
    for (const alvo of ['ui/FeaturedProductsEditor.tsx', 'ui/ProductPicker.tsx']) {
      expect(FONTES.some(f => f.replace(/\\/g, '/').endsWith(alvo))).toBe(true)
      expect(existsSync(join(UI, alvo.replace('ui/', '')))).toBe(true)
    }
  })

  it('nenhum dos dois monta trilho de slides nem grade de cards', () => {
    const suspeitos = ['FeaturedProductsEditor.tsx', 'ProductPicker.tsx'].map(n => join(UI, n))

    for (const arquivo of suspeitos) {
      const fonte = semComentarios(ler(arquivo))
      // A mecânica do carrossel — a mesma régua de `BNR-51`, aplicada ao bloco novo.
      expect(fonte).not.toMatch(/snap-x|snap-mandatory|scroll-snap|aria-roledescription/)
      // E a grade de miniaturas, que é a forma que o segundo desenho tomaria AQUI.
      expect(fonte).not.toMatch(/grid-cols-\d/)
      // Sem foto de produto não há vitrine: é a peça que faltaria para o desenho existir.
      expect(fonte).not.toMatch(/<img/)
    }
  })

  it('SENSOR: a régua PEGA uma vitrine injetada nos dois arquivos', () => {
    // Prova de sensibilidade sem tocar no disco, e ela é obrigatória: as asserções acima medem uma
    // AUSÊNCIA, e ausência é o que passa sozinha quando o instrumento falha.
    const vitrine =
      'const Lista = () => <ul className="grid grid-cols-3 gap-2">{pecas.map(p => <img src={p.foto} />)}</ul>'

    expect(/grid-cols-\d/.test(semComentarios(vitrine))).toBe(true)
    expect(/<img/.test(semComentarios(vitrine))).toBe(true)

    // E o par: o que os arquivos de verdade têm — uma lista — NÃO é acusado.
    const lista = 'const Lista = () => <ul className="space-y-1">{pecas.map(p => <li>{p.name}</li>)}</ul>'
    expect(/grid-cols-\d/.test(semComentarios(lista))).toBe(false)
    expect(/<img/.test(semComentarios(lista))).toBe(false)
  })

  it('SENSOR: a prosa que explica a régua não é acusada, com CRLF e com LF', () => {
    // Os dois arquivos novos CITAM a regra em comentário — "não desenha grade de miniatura" —, e
    // sem o removedor o conserto de uma reprovação viraria "apague o comentário".
    for (const quebra of ['\r\n', '\n']) {
      const comentado = `const a = 1${quebra}// nada de grid-cols-3 aqui, e nada de <img${quebra}const b = 2`
      expect(/grid-cols-\d/.test(semComentarios(comentado))).toBe(false)
      expect(/<img/.test(semComentarios(comentado))).toBe(false)
      // O código em volta sobrevive: um stripper que apagasse tudo passaria na linha acima.
      expect(semComentarios(comentado)).toContain('const b = 2')
    }
  })

  it('nenhuma prévia nova apareceu com o bloco de peças', () => {
    expect(previasEm(UI)).toEqual(['HomeLivePreview.tsx'])
    expect(existsSync(join(UI, 'FeaturedProductsPreview.tsx'))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// NAV-43 — o MENU tem um desenho, e ele também mora na loja
// ───────────────────────────────────────────────────────────────────────────

describe('NAV-43 — o segundo desenho do menu não existe mais', () => {
  it('`MenuBarPreview.tsx` foi removido', () => {
    // Ele desenhava a barra do topo à mão, com os tokens do admin, e consumia a lista fixa que
    // prometia `/crie-seu-botton` — uma rota que a loja **não tem**. Dois defeitos no mesmo arquivo:
    // o segundo desenho, e a mentira que ele mostrava.
    expect(existsSync(join(MENU_UI, 'MenuBarPreview.tsx'))).toBe(false)
    expect(existsSync(join(MENU_UI, 'MenuBarPreview.test.tsx'))).toBe(false)
  })

  it('o barrel não exporta `MenuBarPreview`, e não exporta entrada fixa nenhuma', () => {
    const barrel = ler(join(MENU, 'index.ts'))
    expect(barrel).not.toMatch(/export .*\bMenuBarPreview\b.*from/)
    expect(barrel).not.toMatch(/FIXED_(MENU_)?ENTRIES/)
    expect(barrel).toContain('MenuSlotList')
  })

  it('nenhum arquivo importa um `MenuBarPreview`', () => {
    const infratores = FONTES_MENU.filter(f => /from ['"].*MenuBarPreview['"]/.test(ler(f)))
    expect(infratores).toEqual([])
  })

  it('a única prévia que pode existir no menu é a que mostra a LOJA', () => {
    // Hoje a lista está vazia: a prévia ao vivo chega na fase seguinte, e o lugar dela na tela é um
    // espaço reservado que **diz isso em texto**. `MenuLivePreview.tsx` é o único nome liberado —
    // qualquer outro `…Preview` aqui é o desenho de volta com outro rótulo.
    for (const previa of previasEm(MENU_UI)) {
      expect(previa).toBe('MenuLivePreview.tsx')
    }
  })

  it('quando o palco existir, ele monta um `<iframe>` — e enquanto não existe, ninguém desenha', () => {
    const palco = join(MENU_UI, 'MenuLivePreview.tsx')
    if (existsSync(palco)) {
      const fonte = ler(palco)
      expect(fonte).toContain('<iframe')
      expect(fonte).toContain('previewSrc')
    } else {
      // A asserção não fica vaga enquanto o arquivo não existe: ela vira a prova de que **nenhum**
      // arquivo do menu monta uma barra própria — que é o que o palco ausente tem de significar.
      expect(previasEm(MENU_UI)).toEqual([])
    }
  })

  it('o painel não CALCULA o desenho do painel da loja', () => {
    // As duas funções que arrumam o mega menu na tela da cliente: as colunas de até 8 e a resolução
    // dos banners para render. Um arquivo do painel importando qualquer uma delas está montando o
    // menu — e é assim que o segundo desenho volta, sem quebrar nada. O editor lê a FORMA crua do
    // jsonb (`menuBannerSlots`) e o destino (`resolveMenuTarget`), que são outra coisa: são o que
    // ele precisa para editar, não para desenhar.
    const infratores = FONTES_MENU.filter(f =>
      /\b(menuPanelColumns|resolveMenuBanners)\b/.test(semComentarios(ler(f))),
    ).map(f => f.replace(/\\/g, '/').split('/features/').pop())

    expect(infratores).toEqual([])
  })

  it('a régua funciona — sensores por mutação', () => {
    // Sem estes dois, um stripper quebrado (ou um regex vazio) faria a asserção acima passar para
    // sempre: ela mede uma AUSÊNCIA, e ausência é o que passa sozinha quando o instrumento falha.
    const DESENHO = /\b(menuPanelColumns|resolveMenuBanners)\b/

    // 1. A régua PEGA o cálculo de volta, em qualquer um dos dois finais de linha.
    for (const quebra of ['\r\n', '\n']) {
      const sintetico = `import { menuPanelColumns } from '@estrelinha/core/menu'${quebra}const colunas = menuPanelColumns(filhas)${quebra}`
      expect(DESENHO.test(semComentarios(sintetico))).toBe(true)
    }

    // 2. E NÃO pega a prosa sobre ele — que é o que o editor de banner de fato tem.
    const comentado = 'const a = 1\r\n// contrapartida de resolveMenuBanners truncar\r\nconst b = 2'
    expect(DESENHO.test(semComentarios(comentado))).toBe(false)
    // O código em volta sobrevive: um stripper que apagasse tudo passaria na linha acima.
    expect(semComentarios(comentado)).toContain('const b = 2')
  })

  it('`store-menu` não importa nada de `apps/store`', () => {
    const infratores = FONTES_MENU.filter(f => /from ['"].*apps\/store/.test(ler(f)))
    expect(infratores).toEqual([])
  })
})

// ───────────────────────────────────────────────────────────────────────────
// FOCO-22 — a tela cheia é um MODO do palco, não uma segunda prévia
// ───────────────────────────────────────────────────────────────────────────

/**
 * Feature 47.
 *
 * A tela cheia é o pedido que mais convida o defeito de volta: "abre num componente próprio, que aí
 * dá para desenhar direito". Um `FullscreenPreview.tsx` seria literalmente o segundo dono do desenho
 * — e, pior que na `25`, ele nasceria com o mesmo conteúdo e divergiria só depois.
 *
 * Nenhuma asserção acima foi removida ou enfraquecida: este bloco só acrescenta.
 */
describe('FOCO-22 — a tela cheia não criou uma segunda prévia', () => {
  it('a lista de arquivos `…Preview` continua sendo UM por feature', () => {
    expect(previasEm(UI)).toEqual(['HomeLivePreview.tsx'])
    expect(previasEm(MENU_UI)).toEqual(['MenuLivePreview.tsx'])
  })

  it('nenhum arquivo com nome de tela cheia apareceu nas duas pastas de UI', () => {
    for (const pasta of [UI, MENU_UI]) {
      for (const nome of ['FullscreenPreview.tsx', 'PreviewModal.tsx', 'PreviewOverlay.tsx']) {
        expect(existsSync(join(pasta, nome))).toBe(false)
      }
    }
  })

  it('cada palco continua montando UM `<iframe>`, e nenhum outro arquivo monta iframe', () => {
    const comIframe = [...FONTES, ...FONTES_MENU]
      .filter(f => semComentarios(ler(f)).includes('<iframe'))
      .map(f => f.replace(/\\/g, '/').replace(/^.*\/(features\/.*)$/, '$1'))
      .sort()

    expect(comIframe).toEqual([
      'features/home-composition/ui/HomeLivePreview.tsx',
      'features/store-menu/ui/MenuLivePreview.tsx',
    ])

    for (const palco of [join(UI, 'HomeLivePreview.tsx'), join(MENU_UI, 'MenuLivePreview.tsx')]) {
      const iframes = semComentarios(ler(palco)).match(/<iframe/g) ?? []
      expect(iframes).toHaveLength(1)
    }
  })

  it('a tela cheia NÃO ramificou o palco por tipo de seção', () => {
    // A régua de `PRV-18` reaplicada ao modo novo: se o palco em tela cheia precisasse saber o que é
    // um `hero`, o segundo desenho teria voltado por dentro.
    const fonte = semComentarios(ler(join(UI, 'HomeLivePreview.tsx')))
    for (const tipo of ['hero', 'trust_bar', 'banner_grid', 'collection_rows', 'hero_carousel']) {
      expect(fonte).not.toContain(`'${tipo}'`)
    }
  })

  it('o modo vem do hook compartilhado — os dois palcos não podem divergir na medida', () => {
    for (const palco of [join(UI, 'HomeLivePreview.tsx'), join(MENU_UI, 'MenuLivePreview.tsx')]) {
      const fonte = semComentarios(ler(palco))
      expect(fonte).toContain('useFullscreenStage')
      // Nenhum palco escreve a própria moldura: se escrevesse, a medida teria dois donos de novo.
      expect(fonte).not.toMatch(/'[^']*\bfixed inset-0\b/)
    }
  })

  it('SENSOR: um segundo palco injetado REPROVA nas DUAS réguas — a de nome e a de conteúdo', () => {
    // A régua de nome é `previasEm`, e ela lê um diretório de verdade: o sensor tem de chamá-la, e
    // não simular o que ela devolveria. Um `mkdtemp` é o palco sintético mais barato que existe.
    const pasta = mkdtempSync(join(tmpdir(), 'previa-unica-'))
    try {
      writeFileSync(
        join(pasta, 'FullscreenPreview.tsx'),
        'const FullscreenPreview = () => <iframe src={previewSrc(STORE_URL)} />\n',
        'utf8',
      )

      // 1. A régua de NOME acusa o arquivo…
      expect(previasEm(pasta)).toEqual(['FullscreenPreview.tsx'])
      // …e um arquivo sem "Preview" no nome não é acusado, senão a régua estaria pegando qualquer um.
      writeFileSync(join(pasta, 'MenuEntryEditor.tsx'), 'const x = 1\n', 'utf8')
      expect(previasEm(pasta)).toEqual(['FullscreenPreview.tsx'])

      // 2. E a régua de CONTEÚDO acusa o iframe dentro dele.
      const injetado = semComentarios(readFileSync(join(pasta, 'FullscreenPreview.tsx'), 'utf8'))
      expect(injetado).toContain('<iframe')
    } finally {
      rmSync(pasta, { recursive: true, force: true })
    }
  })
})
