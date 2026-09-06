import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { semComentarios } from '@/test/sourceScan'

/**
 * **Cor de texto ARBITRÁRIA passa pela mesma régua que os tokens** — `A11Y-02`.
 *
 * `contrast.test.ts` mede os tokens `--estrelinha-*` sobre `ground`, `ground-deep` e `surface`, e
 * mede bem. Mas ele mede **tokens** — e uma classe arbitrária do Tailwind (`text-[hsl(…)]`,
 * `text-[#…]`) não é um token, então passa por baixo dele sem encostar em régua nenhuma.
 *
 * Foi assim que `text-[hsl(142_70%_38%)]` viveu no `WhatsAppFloat`: `#1da54f`, **3,22:1** sobre o
 * branco da bolha, em 11px semibold — que não é *large text*, então a régua da WCAG AA é 4,5:1.
 * O Lighthouse de 2026-09-06 apontou como o **único item com peso** que segurava a acessibilidade
 * da home em 96.
 *
 * É a forma exata da lição do `fieldBorder`, de novo: **a regra existia, o token existia, o teste
 * existia, e os três nunca se encontraram**. O que faltava era a régua alcançar a sintaxe que o
 * código de fato usava.
 *
 * **O par é (texto, fundo), nunca a cor sozinha.** A primeira escrita deste guarda media tudo
 * contra branco, e a medida saiu otimista onde o fundo não é branco: `#9E4A3E` dá **6,00:1** sobre
 * branco e **5,21:1** sobre o `#F7EDE8` em que ele de fato aparece. Os dois passam, mas a diferença
 * é a distância entre medir e supor — e num valor mais escuro ela decidiria o veredito.
 *
 * ÂNCORA DE CONTAGEM: varrer zero arquivo reprova. Sem ela, um caminho errado varreria nada e
 * passaria em verde — a pior falha possível num guarda que varre disco.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal — a régua nunca é o objeto medido. */
const ESCOPO = 'apps/store/src'

/** O piso da WCAG AA para texto normal. Texto grande teria 3:1, e nenhum caso aqui é grande. */
const PISO = 4.5

/**
 * Os valores autorizados, cada um **com o fundo em que aparece**.
 *
 * São dois, e cada um tem razão de ser exceção ao sistema de tokens:
 *
 * - **o verde de disponibilidade** não pertence à marca — é o verde do WhatsApp e o verde universal
 *   de "em estoque". Um token `--estrelinha-*` para ele faria a paleta da marca carregar uma cor
 *   que a marca não tem. Os dois usos convergiram para o mesmo tom na feature 40; antes eram dois
 *   tons do mesmo matiz, e um deles era ilegível.
 * - **o terracota do aviso** vem dos artboards do guia de material (`5MC-0`/`6AU-0`) e anda sempre
 *   em par com o próprio fundo (`bg-[#F7EDE8]`), como faixa de atenção.
 *
 * A razão escrita aqui é **conferida pela conta abaixo**, não confiada.
 */
const AUTORIZADOS: Record<string, { sobre: string; nota: string }> = {
  'hsl(142_71%_30%)': { sobre: '#ffffff', nota: 'verde de disponibilidade' },
  '#9E4A3E': { sobre: '#F7EDE8', nota: 'terracota do aviso do guia de material' },
}

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

/** `text-[…]` em qualquer das três notações de cor. */
const COR_ARBITRARIA = /text-\[((?:hsl|rgb|#)[^\]]*)\]/g

export const coresArbitrarias = (fonte: string): string[] =>
  [...semComentarios(fonte).matchAll(COR_ARBITRARIA)].map((m) => m[1])

/* ── A matemática de contraste, escrita aqui e não importada do código sob teste ───────────── */

const hslParaRgb = (h: number, s: number, l: number): [number, number, number] => {
  const sn = s / 100
  const ln = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [f(0), f(8), f(4)]
}

/** Aceita `hsl(H_S%_L%)` (a grafia do Tailwind arbitrário) e `#rrggbb`. */
export const paraRgb = (valor: string): [number, number, number] => {
  const hsl = valor.match(/^hsl\((\d+(?:\.\d+)?)_(\d+(?:\.\d+)?)%_(\d+(?:\.\d+)?)%\)$/)
  if (hsl) return hslParaRgb(Number(hsl[1]), Number(hsl[2]), Number(hsl[3]))

  const hex = valor.match(/^#([0-9a-fA-F]{6})$/)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  }

  throw new Error(`não sei medir "${valor}" — só as formas hsl(H_S%_L%) e #rrggbb`)
}

const linear = (c: number): number => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

const luminancia = ([r, g, b]: [number, number, number]): number =>
  0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)

/** A razão WCAG entre duas cores, na ordem que for. */
export const contraste = (a: string, b: string): number => {
  const la = luminancia(paraRgb(a))
  const lb = luminancia(paraRgb(b))
  const [alto, baixo] = la > lb ? [la, lb] : [lb, la]
  return (alto + 0.05) / (baixo + 0.05)
}

describe('cor de texto arbitrária passa pela régua de contraste (A11Y-02)', () => {
  const lidos = arquivos(join(ROOT, ESCOPO))
    .map((full) => ({
      rel: relative(ROOT, full).split('\\').join('/'),
      fonte: readFileSync(full, 'utf8'),
    }))
    .filter((a) => !eTeste(a.rel))

  const usos = lidos.flatMap((a) => coresArbitrarias(a.fonte).map((valor) => ({ rel: a.rel, valor })))

  it('a varredura leu arquivos de verdade (âncora de contagem)', () => {
    expect(lidos.length).toBeGreaterThan(200)
  })

  it('a régua acha os usos que existem (âncora 2)', () => {
    // Se algum dia a loja não tiver mais cor arbitrária nenhuma, esta âncora cai — e a queda é o
    // aviso de que o guarda virou inerte e pode ser aposentado, não de que algo quebrou.
    expect(usos.length).toBeGreaterThan(0)
  })

  it('todo uso está no allowlist', () => {
    const forasDaLista = usos
      .filter((u) => !(u.valor in AUTORIZADOS))
      .map((u) => `${u.rel}: text-[${u.valor}]`)

    expect(
      forasDaLista,
      'Cor de texto arbitrária nova. `contrast.test.ts` NÃO a mede — ele mede tokens. Ou use um ' +
        'token `--estrelinha-*`, ou acrescente o valor ao allowlist deste arquivo com o FUNDO em ' +
        'que ele aparece (mínimo 4,5:1 sobre esse fundo).',
    ).toEqual([])
  })

  it.each(Object.entries(AUTORIZADOS))('`%s` passa na régua sobre o fundo declarado', (valor, { sobre, nota }) => {
    const razao = contraste(valor, sobre)
    expect(
      razao,
      `${nota}: \`${valor}\` mede ${razao.toFixed(2)}:1 sobre ${sobre} — abaixo do piso de ` +
        `${PISO}:1. O comentário do allowlist não é a medida; esta conta é.`,
    ).toBeGreaterThanOrEqual(PISO)
  })

  it('SENSOR: a régua reprova o verde ANTIGO do WhatsApp', () => {
    // 3,22:1 — o valor que segurava a acessibilidade da home em 96.
    const antigo = contraste('hsl(142_70%_38%)', '#ffffff')
    expect(antigo).toBeLessThan(PISO)
    expect(antigo).toBeCloseTo(3.22, 1)
  })

  it('SENSOR: a régua confirma o verde NOVO com folga', () => {
    expect(contraste('hsl(142_71%_30%)', '#ffffff')).toBeCloseTo(4.88, 1)
  })

  it('SENSOR: medir contra o fundo REAL é mais severo que medir contra branco', () => {
    // A diferença que motivou o par: supor branco onde o fundo é creme superestima a folga.
    expect(contraste('#9E4A3E', '#ffffff')).toBeCloseTo(6.0, 1)
    expect(contraste('#9E4A3E', '#F7EDE8')).toBeCloseTo(5.21, 1)
    expect(contraste('#9E4A3E', '#F7EDE8')).toBeLessThan(contraste('#9E4A3E', '#ffffff'))
  })

  it('SENSOR: a varredura NÃO se deixa enganar por comentário', () => {
    expect(coresArbitrarias('// era text-[hsl(142_70%_38%)] antes')).toEqual([])
    expect(coresArbitrarias('/* text-[#bada55] */')).toEqual([])
    expect(coresArbitrarias('className="text-[hsl(142_71%_30%)]"')).toEqual(['hsl(142_71%_30%)'])
  })

  it('SENSOR: a varredura pega hex e rgb, não só hsl', () => {
    expect(coresArbitrarias('className="text-[#bada55]"')).toEqual(['#bada55'])
    expect(coresArbitrarias('className="text-[rgb(1,2,3)]"')).toEqual(['rgb(1,2,3)'])
  })

  it('SENSOR: valor em notação que a régua não sabe medir ESTOURA, não passa calado', () => {
    expect(() => contraste('rgb(1,2,3)', '#ffffff')).toThrow(/não sei medir/)
  })
})
