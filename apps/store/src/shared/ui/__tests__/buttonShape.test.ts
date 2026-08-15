import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Forma de ação é `rounded-sm` (6px). Pílula é RÓTULO.
 *
 * Na v1 a pílula era a forma de quatro coisas diferentes — botão, badge, chip
 * de tema e campo de busca — e a cliente não tinha como saber qual delas
 * clica. A feature 19 separou: ação, rótulo pílula, disco disco. A feature 20
 * manteve a separação e só mudou o valor da ação, de 14px para os 6px do DS
 * da Uma Estrelinha.
 *
 * Esta varredura é o que mantém a separação viva depois da feature. Um teste
 * de componente não serviria: ele assere nome de classe num componente por
 * vez, e `rounded-pill` continua sendo um nome válido. A regra é sobre o
 * conjunto, então quem prova é a leitura do fonte.
 *
 * **A allowlist é a parte importante.** Ela não existe para amansar o teste —
 * existe para forçar quem puser uma pílula num elemento de ação a escrever por
 * que ela é rótulo. Entrada sem uso correspondente também falha, para o
 * arquivo não ficar liberado depois que o motivo sumiu.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

/** Tags que disparam ação — é nelas que a pílula é defeito de forma. */
const ACTION_TAGS = ['button', 'Button', 'a', 'Link', 'NavLink']

/**
 * Onde a pílula é rótulo, e não ação. Cada entrada é uma decisão de desenho,
 * não uma exceção de conveniência.
 */
const ROTULO: Record<string, string> = {
  'pages/CategoryPage.tsx':
    'Chips de filtro e de tag. São rótulos que alternam estado, não CTAs — o board os desenha em pílula.',
  'features/category-filters/ui/CategoryFiltersPanel.tsx':
    'Trilho do interruptor de filtro. A pílula é a forma do controle, não de um botão.',
  'features/search/ui/SearchOverlay.tsx':
    'Nuvem de categorias da busca. São tags de navegação, na mesma linguagem dos chips de tema.',
  'widgets/home-sections/ui/TrendingTags.tsx':
    'Chips de tema ("Explore por tema"). Pílula é a forma deles no artboard 22.',
  'widgets/mobile-menu/ui/MobileMenu.tsx':
    'Gatilho da busca na folha do celular: é um CAMPO de busca com aparência de campo, não um botão.',
  'entities/product/ui/MaterialNotice.tsx':
    'Chips que NOMEIAM os materiais da peça ("Mecha de cabelo", "Cinzas") e levam à ficha de preparo de cada um. São rótulos de conteúdo na mesma linguagem da nuvem de categorias da busca — não CTAs. O CTA da página segue sendo o "Adicionar ao carrinho", em `rounded-sm`.',
  'widgets/order-material/ui/OrderMaterialBlock.tsx':
    'Os mesmos chips de material, agora listando o que ESTE pedido espera. Mantê-los em pílula é o que faz a cliente reconhecer na confirmação exatamente o que leu na página do produto; a ação do bloco é o botão "Registrar", em `rounded-sm`.',
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(full)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
  })
}

/**
 * A tag JSX dona daquela `className` — a última tag aberta em ou acima da
 * ocorrência. Andar para trás sem olhar a coluna atribuiria o `rounded-pill`
 * de um `<span>` de badge ao `<Link>` que o envolve, que é falso positivo.
 */
function owningTag(lines: string[], lineIndex: number, column: number): string | null {
  for (let i = lineIndex; i >= 0 && i > lineIndex - 20; i--) {
    const haystack = i === lineIndex ? lines[i].slice(0, column) : lines[i]
    const matches = [...haystack.matchAll(/<([A-Za-z][A-Za-z0-9]*)\b/g)]
    if (matches.length > 0) return matches[matches.length - 1][1]
  }
  return null
}

/** Toda ocorrência de `rounded-pill` presa a uma tag de ação. */
function pillActions(): { file: string; line: number; tag: string }[] {
  return tsxFiles(SRC).flatMap((path) => {
    const file = relative(SRC, path).replace(/\\/g, '/')
    const lines = readFileSync(path, 'utf8').split('\n')

    return lines.flatMap((line, index) => {
      const column = line.indexOf('rounded-pill')
      if (column === -1) return []

      const tag = owningTag(lines, index, column)
      return tag && ACTION_TAGS.includes(tag) ? [{ file, line: index + 1, tag }] : []
    })
  })
}

describe('forma de ação — 14px, nunca pílula', () => {
  it('a varredura encontra os arquivos da loja', () => {
    // Âncora obrigatória: varredura que varre zero arquivo passa em silêncio.
    expect(tsxFiles(SRC).length).toBeGreaterThan(50)
  })

  it('nenhum elemento de ação usa `rounded-pill` fora da allowlist', () => {
    const offenders = pillActions()
      .filter(({ file }) => !(file in ROTULO))
      .map(({ file, line, tag }) => `${file}:${line} <${tag}>`)

    expect(offenders).toEqual([])
  })

  it('nenhuma entrada da allowlist ficou obsoleta', () => {
    // Sem isto, um arquivo continua liberado depois que a pílula saiu dele — e
    // a próxima pílula de ação entra ali sem ninguém perceber.
    const withPills = new Set(pillActions().map(({ file }) => file))
    const stale = Object.keys(ROTULO).filter((file) => !withPills.has(file))

    expect(stale).toEqual([])
  })

  it('o botão da loja não oferece pílula em variante nenhuma', () => {
    const button = readFileSync(join(SRC, 'shared/ui/Button.tsx'), 'utf8')
    expect(button).not.toMatch(/rounded-pill/)
  })

  it('a escala de raio não tem chave custom para ação', () => {
    // A papelaria precisava de `button: 14px` declarada POR ÚLTIMO, porque o
    // `<Button>` do shadcn carrega `rounded-md` na base e o tailwind-merge não
    // colapsa token custom contra t-shirt size — as duas classes chegavam ao
    // elemento e quem vencia era a última no CSS. Com a ação em 6px o valor
    // cabe em `sm`, o merge resolve sozinho, e a chave saiu. Se ela voltar,
    // volta junto a dependência de ordem de declaração que ninguém enxerga.
    const config = readFileSync(resolve(SRC, '../tailwind.config.ts'), 'utf8')
    const radiusBlock = config.slice(config.indexOf('borderRadius:'))
    const keys = [...radiusBlock.slice(0, radiusBlock.indexOf('},')).matchAll(/^\s*"?([a-z0-9]+)"?:\s*"/gm)].map(
      (m) => m[1],
    )

    expect(keys.length).toBeGreaterThan(3)
    expect(keys).not.toContain('button')
  })
})
