import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ESTRELINHA_ICONS,
  ICON_ACCENT,
  ICON_SCALE_G40,
  ICON_SCALE_G48,
  ICON_SCALE_G120,
  ICON_STROKE,
  ICON_STROKE_G40,
  ICON_STROKE_G48,
  ICON_STROKE_G120,
  ICON_VIEW_BOX,
} from '..'

/**
 * O guarda da biblioteca de ícones.
 *
 * Um conjunto de ícones erra de um jeito ruim: **nada quebra**. Um desenho numa grade diferente sai
 * maior que o vizinho, um traço de 2 ao lado de um de 1,5 lê como dois autores, um ouro cravado em
 * hex some quando a paleta muda. Build passa, `tsc` passa, teste de componente passa — quem
 * descobre é quem abre a loja.
 *
 * Por isso a régua é lida do **fonte no disco**, e cada asserção tem âncora de contagem: sem ela um
 * caminho errado varre zero arquivo e o teste fica verde por não ter olhado nada.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = resolve(HERE, '..')

/**
 * A marca oficial do arranjo Pix, que **não** obedece às regras do conjunto: grade de 16,
 * preenchida, não monoline. Ela mora aqui para haver uma porta só de ícone, não para virar parte da
 * família monoline. Ver o comentário do registro em `index.ts`.
 */
const FORA_DO_CONJUNTO = ['PixIcon.tsx']

function iconFiles(): string[] {
  return readdirSync(ICONS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('Icon.tsx'))
    .map((e) => e.name)
    .sort()
}

const TODOS = iconFiles()
const CONJUNTO = TODOS.filter((name) => !FORA_DO_CONJUNTO.includes(name))
const read = (name: string) => readFileSync(join(ICONS_DIR, name), 'utf8')

describe('biblioteca de ícones — escopo da varredura', () => {
  it('encontra os arquivos de ícone no disco', () => {
    // Âncora: se o diretório mudar de lugar, isto falha em vez de varrer o vazio.
    expect(TODOS.length).toBeGreaterThanOrEqual(12)
    expect(TODOS).toContain('PixIcon.tsx')
    expect(CONJUNTO.length).toBe(TODOS.length - FORA_DO_CONJUNTO.length)
  })

  it('o barrel exporta todo ícone do conjunto, e o registro cobre todos eles', () => {
    const barrel = read('index.ts')
    for (const file of CONJUNTO) {
      const nome = file.replace('.tsx', '')
      expect(barrel, `${nome} não está exportado em index.ts`).toContain(`from './${nome}'`)
    }
    // Registro e conjunto andam juntos: ícone novo sem entrada no registro não é alcançável por dado.
    expect(Object.keys(ESTRELINHA_ICONS).length).toBe(CONJUNTO.length)
  })
})

describe('biblioteca de ícones — uma grade e um traço', () => {
  it('todo ícone do conjunto desenha na grade 0 0 24 24', () => {
    expect(ICON_VIEW_BOX).toBe('0 0 24 24')
    for (const file of CONJUNTO) {
      expect(read(file), `${file} não usa ICON_VIEW_BOX`).toContain('viewBox={ICON_VIEW_BOX}')
    }
  })

  it('nenhum ícone do conjunto declara viewBox literal', () => {
    // `viewBox="0 0 40 40"` colado do Paper passaria no teste acima por acaso; aqui não passa.
    for (const file of CONJUNTO) {
      expect(read(file), `${file} tem viewBox literal`).not.toMatch(/viewBox="/)
    }
  })

  it('todo traço sai por constante, e as constantes rendem 1,5 na grade de 24', () => {
    expect(ICON_STROKE).toBe(1.5)

    // A invariante de cada grade de origem, e não a lista de constantes: um par novo só é legítimo
    // se multiplicar para o traço da família. É isto que impede "grade nova" de virar a porta por
    // onde um peso diferente entra — o defeito que não quebra nada e só fica feio.
    const GRADES: readonly [string, number, number][] = [
      ['40', ICON_STROKE_G40, ICON_SCALE_G40],
      ['48', ICON_STROKE_G48, ICON_SCALE_G48],
      ['120', ICON_STROKE_G120, ICON_SCALE_G120],
    ]
    for (const [grade, traco, escala] of GRADES) {
      expect(traco * escala, `a grade de ${grade} não rende ${ICON_STROKE}`).toBeCloseTo(
        ICON_STROKE,
        5,
      )
    }

    let comTraco = 0
    for (const file of CONJUNTO) {
      const src = read(file)
      const literais = src.match(/strokeWidth="[^"]*"/g) ?? []
      expect(literais, `${file} declara strokeWidth literal: ${literais.join(', ')}`).toHaveLength(0)
      if (/strokeWidth=\{ICON_STROKE(_G40|_G48|_G120)?\}/.test(src)) comTraco += 1
    }
    // Âncora: todo ícone do conjunto é monoline, então todo ícone tem traço.
    expect(comTraco).toBe(CONJUNTO.length)
  })

  it('desenho em grupo escalado usa o traço daquela grade, e nunca o de outra', () => {
    // O par (escala, traço) tem de andar junto: `scale(0.5)` com `ICON_STROKE_G40` renderiza 1,25 —
    // um oitavo mais fino que o vizinho, invisível em review e visível na tela.
    const PARES: readonly [string, string][] = [
      ['ICON_SCALE_G40', 'ICON_STROKE_G40'],
      ['ICON_SCALE_G48', 'ICON_STROKE_G48'],
      ['ICON_SCALE_G120', 'ICON_STROKE_G120'],
    ]
    let comGrupo = 0
    for (const file of CONJUNTO) {
      const src = read(file)
      if (!src.includes('transform={`scale(')) continue
      comGrupo += 1
      const par = PARES.find(([escala]) => src.includes(`scale(\${${escala}})`))
      expect(par, `${file} escala por algo que não é constante de grade`).toBeDefined()
      expect(src, `${file} escala em ${par[0]} mas não declara ${par[1]}`).toContain(
        `strokeWidth={${par[1]}}`,
      )
    }
    // Âncora: as grades de origem do Paper existem de verdade neste conjunto.
    expect(comGrupo).toBeGreaterThanOrEqual(5)
  })

  it('nenhum ícone preenche — a família inteira é monoline', () => {
    for (const file of CONJUNTO) {
      const src = read(file)
      expect(src, `${file} não declara fill="none" na raiz`).toContain('fill="none"')
      expect(src, `${file} preenche alguma forma`).not.toMatch(/fill="(?!none")/)
    }
  })
})

describe('biblioteca de ícones — cor', () => {
  it('o contorno herda currentColor em todo ícone do conjunto', () => {
    for (const file of CONJUNTO) {
      expect(read(file), `${file} não tem nenhum traço em currentColor`).toContain(
        'stroke="currentColor"',
      )
    }
  })

  it('o realce sai por ICON_ACCENT, que é accent-strong — o único ouro que passa 3:1', () => {
    // `accent` (#B8945F) mede 2,66:1 sobre o chão claro e reprova até como elemento gráfico.
    expect(ICON_ACCENT).toBe('var(--estrelinha-accent-strong)')

    let comRealce = 0
    for (const file of CONJUNTO) {
      const src = read(file)
      if (src.includes('stroke={ICON_ACCENT}')) comRealce += 1
    }
    // Âncora: parte da família é bicolor. Zero aqui significa que a varredura não achou nada.
    expect(comRealce).toBeGreaterThanOrEqual(5)
  })

  it('nenhuma cor literal escapou do token', () => {
    for (const file of CONJUNTO) {
      // Sem os comentários: eles CITAM hex de propósito (o verde do WhatsApp, os ouros medidos), e
      // é justamente essa prosa que explica por que o desenho não os usa.
      const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
      expect(src, `${file} tem cor em hex`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(src, `${file} tem cor em rgb()/hsl()`).not.toMatch(/\b(rgba?|hsla?)\(/)
      // `var(--…)` só pode entrar por ICON_ACCENT; direto no arquivo, não.
      expect(src, `${file} usa var(--…) fora de ICON_ACCENT`).not.toMatch(/"var\(--/)
    }
  })
})

describe('biblioteca de ícones — contrato de uso', () => {
  it('nenhum ícone carrega tamanho próprio: quem dimensiona é o className', () => {
    for (const file of TODOS) {
      const src = read(file)
      // Só a tag `<svg …>` de abertura: `width`/`height` de um `<rect>` é geometria do desenho,
      // não tamanho do ícone — medem na grade de 24 e escalam junto.
      const raiz = src.match(/<svg\b[\s\S]*?>/)?.[0] ?? ''
      expect(raiz, `${file} não abre um <svg>`).not.toBe('')
      expect(raiz, `${file} declara width na raiz`).not.toMatch(/\bwidth=/)
      expect(raiz, `${file} declara height na raiz`).not.toMatch(/\bheight=/)
      expect(src, `${file} não aceita className`).toContain('className={className}')
    }
  })

  it('todo ícone é escondido de leitor de tela sob demanda e não recebe foco', () => {
    for (const file of TODOS) {
      const src = read(file)
      expect(src, `${file} não repassa aria-hidden`).toContain('aria-hidden={ariaHidden}')
      expect(src, `${file} é focável`).toContain('focusable="false"')
    }
  })
})

/**
 * Feature 29 / `SOB-13` — a estrela da loja é o **ornamento do logotipo**.
 *
 * Era uma estrela genérica de cinco pontas, e a diferença não é decorativa: a faísca da marca tem
 * quatro pontas e os lados **côncavos**, com a concavidade em 8,7% da meia-extensão. Trocar as
 * curvas por retas devolve um losango, e nada mais nesta suíte acusaria — traço, grade e cor
 * continuariam certos.
 */
describe('estrela — o ornamento do logotipo (SOB-13)', () => {
  const fonte = read('EstrelinhaStarIcon.tsx')

  it('é a faísca de quatro pontas, com os lados curvos', () => {
    // Quatro curvas quadráticas fechando o contorno: uma por lado.
    const curvas = fonte.match(/\sQ[\d.]+ [\d.]+ [\d.]+ [\d.]+/g) ?? []
    expect(curvas).toHaveLength(4)
    // E nenhuma reta: `L` no meio do contorno seria o losango.
    expect(fonte).not.toMatch(/d="[^"]*\sL[\d.]/)
  })

  it('as pontas caem nos eixos da grade de 24, centradas', () => {
    // Topo, direita, base e esquerda a 9 de distância do centro (12,12).
    expect(fonte).toContain('M12 3')
    expect(fonte).toContain('21 12')
    expect(fonte).toContain('12 21')
    expect(fonte).toContain('3 12')
  })

  it('a concavidade é simétrica nos quatro lados', () => {
    // Os quatro controles são as combinações de 8,28 e 15,72 — o par que põe o controle a 8,7% da
    // meia-extensão em direção ao centro. Assimetria aqui entorta a faísca sem quebrar mais nada.
    const controles = (fonte.match(/(8\.28|15\.72)/g) ?? []).length
    expect(controles).toBe(8)
  })
})
