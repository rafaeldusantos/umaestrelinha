import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * **O acento nunca é texto sobre claro** — `IDN-04`, `IDN-02` AC 2.
 *
 * `contrast.test.ts` prova a ARITMÉTICA: `accent #B8945F` mede 2,66:1 sobre o
 * chão e 4,78:1 sobre `ink`. Ele não sabe onde as classes foram parar. Esta
 * varredura é o outro lado: ela lê o fonte e cobra que **cada** arquivo que
 * pinta texto de ouro esteja numa lista curta, com o motivo escrito.
 *
 * Ela nasce da lição da `fieldBorder`: o token certo, a regra certa e o teste
 * certo podem existir ao mesmo tempo e nunca se encontrarem. O remap mecânico
 * da Fase 3 converteu 52 usos de rosa em `accent` sem decidir se aquele
 * elemento devia ser ouro — e a revisão da Fase 5 achou dois defeitos de
 * contraste que ninguém acusava (a faixa da coleção e o rótulo do card de
 * categoria, os dois com `ink` em opacidade sobre ouro).
 *
 * A lista existe para **forçar quem acrescentar a escrever por que aquele ouro
 * está sobre superfície escura**. Não é lista de conveniência: uma entrada sem
 * uso vivo derruba a suíte junto.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

/** `text-estrelinha-accent`, `text-estrelinha-accent-strong` e as variantes. */
const ACCENT_TEXT = /text-estrelinha-accent(-strong)?\b/

/**
 * Cada entrada diz sobre QUE superfície aquele ouro está. Toda superfície
 * citada aqui é escura o bastante para o acento chegar a 4,5:1 (`ink`,
 * 4,78:1), ou o elemento é um ícone — objeto gráfico, onde a régua é 3:1.
 */
const PERMITIDOS: Record<string, string> = {
  'features/auth/ui/AuthOverlay.tsx':
    'Ícone dentro do véu de tinta do overlay: superfície `ink`, 4,78:1.',
  'features/checkout/ui/OrderBump.tsx':
    'Selo, preço e marcador dentro do cartão `bg-estrelinha-ink` da oferta. 4,78:1.',
  'shared/ui/SectionHeading.tsx':
    'Selo da seção: pílula `bg-estrelinha-ink` com o rótulo em ouro. 4,78:1.',
  'widgets/cart-drawer/ui/CartDrawerRow.tsx':
    'ÍCONE de favorito (coração de 16px), não texto: `accent-strong` sobre branco mede 3,85:1, acima dos 3:1 que a WCAG 1.4.11 pede para objeto gráfico.',
  'widgets/category-grid/ui/CategoryGrid.tsx':
    'Título do card de tinta (ouro sobre `ink`, 4,78:1) e a inicial marca-d’água a 40%, que é ornamento e não carrega informação.',
  'pages/AboutPage.tsx':
    'ÍCONE em três lugares, e texto em nenhum: a estrela decorativa sai `accent-strong` sobre `ground-deep` (3,17:1) e `accent` sobre `primary` (3,33:1) — os dois acima dos 3:1 de objeto gráfico. O versalete da assinatura, que o artboard pedia em ouro, saiu em `ink-soft` justamente porque ali é TEXTO.',
  'widgets/home-sections/ui/BrandStatement.tsx':
    'A faixa institucional da home é `bg-estrelinha-ink` inteira: o eyebrow e o fio ao lado dele medem 4,78:1 ali. O título e o corpo NÃO são ouro — saem em `on-primary` e `ground`, que passam de 12:1.',

  // Feature 31 — o guia de material. Nas cinco entradas o ouro é ÍCONE, com uma exceção declarada
  // (os algarismos dos passos), e o versalete de cada seção — que o board pede em ouro — sai em
  // `ink-soft`, pelo mesmo motivo que a assinatura da `AboutPage` saiu: ali é texto de corpo.
  'widgets/material-guide/ui/GuideChecklist.tsx':
    'ÍCONE: o tique de 14px dentro da caixinha de conferência, sobre a superfície branca do cartão. `accent-strong` mede 3,85:1 no branco, acima dos 3:1 de objeto gráfico. O texto do item sai em `ink`.',
  'widgets/material-guide/ui/GuideSteps.tsx':
    'TEXTO, e a exceção está medida: os algarismos `01`..`04` saem `accent-strong` sobre `ground-deep`, 3,17:1. Passam porque são texto GRANDE pela WCAG 1.4.3 — 24px bold no mobile e 28px no desktop, acima dos 18,66px bold que baixam a régua para 3:1. Título e corpo do passo não são ouro.',
  'widgets/material-guide/ui/HomePrepSection.tsx':
    'ÍCONE: o `i` do aviso de cada bloco, dentro da faixa `primary`. `accent` sobre `primary` mede 3,26:1 — objeto gráfico. Os algarismos dos passos, que o board pinta de ouro, saíram em `on-primary` justamente porque ali é texto (8,40:1).',
  'widgets/material-guide/ui/MaterialFicha.tsx':
    'ÍCONE: o tique de 18px da lista de recipientes, sobre `ground`. `accent-strong` mede 3,55:1 ali. O selo numerado dos passos é `ink` sobre `accent` (4,78:1), e não o creme do board, que mediria 2,52:1.',
  'widgets/material-guide/ui/MaterialShortcuts.tsx':
    'ÍCONE: o triângulo de 12px que marca os atalhos com ficha rica. `accent-strong` mede 3,17:1 sobre `ground-deep` e 3,55:1 sobre branco — objeto gráfico nos dois. O rótulo do atalho sai em `ink` ou `ink-soft`.',

  // Feature 39 — o ícone do item de menu, nas duas superfícies. Nos dois casos é ÍCONE, e o tom do
  // ouro MUDA com o fundo: é a mesma medida chegando a respostas opostas, e por isso os dois têm
  // entrada própria em vez de um token só.
  'widgets/header/ui/navItem.ts':
    'ÍCONE de 16px na faixa de departamentos, que é `primary`. Ali `accent` (#B8945F) mede 3,26:1 — acima dos 3:1 que a WCAG 1.4.11 pede para objeto gráfico. O RÓTULO continua em `on-primary`: ouro como texto sobre `primary` reprovaria os 4,5:1, e quem marca o item aberto é a régua de 2px, não a cor da palavra.',
  'widgets/mobile-menu/ui/MobileMenu.tsx':
    'ÍCONE de 20px na folha do celular, que é BRANCA — e por isso o tom é `accent-strong` (3,85:1) e não `accent`, que ali mediria 2,82:1 e reprovaria até como objeto gráfico. O board `DGK-0` pinta os dois com o mesmo token; a paleta não deixa. O rótulo da linha sai em `ink`, e o selo do banner em `ink-soft`.',
}

/**
 * `.tsx` **e** `.ts` — a extensão entrou na feature 39, e o buraco era real.
 *
 * A varredura só olhava `.tsx`, então uma classe de ouro declarada num módulo
 * de constantes escapava inteira. E é exatamente onde a barra de departamentos
 * a declara: `widgets/header/ui/navItem.ts` guarda a forma do item porque dois
 * consumidores a leem, e um `text-estrelinha-accent` ali chegaria à tela sem
 * passar por lista nenhuma. Régua que não alcança onde a classe mora é régua
 * que ninguém está aplicando — a lição da `fieldBorder`, de novo.
 */
function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(full)
    const fonte = entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))
    return fonte ? [full] : []
  })
}

const rel = (caminho: string) => relative(SRC, caminho).replace(/\\/g, '/')

const arquivos = tsxFiles(SRC)
const comOuro = arquivos.filter((f) => ACCENT_TEXT.test(readFileSync(f, 'utf8')))

describe('acento como texto — âncoras', () => {
  it('a varredura encontra os arquivos da loja', () => {
    // Sem esta âncora, um erro de caminho faz a varredura ler zero arquivo e
    // passar em silêncio — a pior falha possível num teste deste tipo.
    expect(arquivos.length).toBeGreaterThan(50)
  })

  it('a varredura encontra os usos de ouro que existem', () => {
    // Segunda âncora, no objeto medido e não na régua: se a classe mudar de
    // nome, a varredura acha zero, não tem o que reprovar, e volta a passar
    // por estar vazia. É o furo exato que a `fieldBorder` tinha.
    expect(comOuro.length).toBeGreaterThan(3)
  })

  it('a varredura alcança `.ts`, e não só `.tsx` — a extensão faz parte da régua', () => {
    // Sensor da mudança da feature 39: restringir a varredura de volta a `.tsx` deixaria
    // `navItem.ts` fora, e o guarda passaria a aprovar por não enxergar. É a falha mais cara de
    // todas neste tipo de teste, porque ela é silenciosa.
    expect(arquivos.some((f) => f.endsWith('.ts'))).toBe(true)
    expect(comOuro.map(rel)).toContain('widgets/header/ui/navItem.ts')
  })
})

describe('acento como texto — a lista curta', () => {
  it('nenhum arquivo fora da lista pinta texto de ouro', () => {
    const fora = comOuro.map(rel).filter((f) => !(f in PERMITIDOS))

    expect(fora).toEqual([])
  })

  it('nenhuma entrada da lista ficou obsoleta', () => {
    // Entrada sem uso vivo é permissão pendurada: o próximo ouro entra naquele
    // arquivo sem ninguém ver.
    const vivos = new Set(comOuro.map(rel))
    const mortos = Object.keys(PERMITIDOS).filter((f) => !vivos.has(f))

    expect(mortos).toEqual([])
  })

  it('toda entrada da lista diz sobre que superfície o ouro está', () => {
    // O motivo é o produto desta lista. Sem ele, ela vira allowlist de
    // conveniência e para de custar alguma coisa a quem adiciona.
    const semMotivo = Object.entries(PERMITIDOS)
      .filter(([, motivo]) => motivo.length < 40)
      .map(([arquivo]) => arquivo)

    expect(semMotivo).toEqual([])
  })
})

describe('acento como texto — o defeito que a Fase 5 achou', () => {
  it('nenhum texto usa `ink` com opacidade sobre superfície `accent`', () => {
    // `ink` sobre `accent` já é 4,78:1 CHEIO — a margem é de 0,28. Qualquer
    // opacidade come isso: a 78% cai para ~3,6:1 e a 45% para ~2,1:1. Era
    // assim que a faixa da coleção e o rótulo do card de categoria estavam,
    // e nada acusava. `contrast.test.ts` não pega, porque a classe de
    // opacidade não é um token.
    const ofensores = arquivos.flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      if (!/bg-estrelinha-accent\b/.test(source)) return []
      return source
        .split('\n')
        .flatMap((linha, i) =>
          /text-estrelinha-ink\/(\[|\d)/.test(linha) ? [`${rel(file)}:${i + 1}`] : [],
        )
    })

    expect(ofensores).toEqual([])
  })
})
