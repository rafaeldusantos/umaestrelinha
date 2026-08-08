import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrastRatio } from '../contrast'

/**
 * Borda de controle é `field`, nunca `line` — `IDN-03`.
 *
 * A WCAG 1.4.11 pede **3:1** de contorno de controle. Sobre o chão da loja,
 * `line #E6DFD4` mede **1,25:1** e `accent #B8945F` mede **2,66:1**: o campo
 * existe no DOM, tem borda declarada, e a cliente não vê caixa nenhuma. É por
 * isso que `--estrelinha-field #8C8073` (3,63:1) é um token separado — duas
 * funções, dois valores.
 *
 * Esta varredura lê o fonte real. Um teste de componente não pegaria: ele
 * assere nome de classe, e `border-estrelinha-line` é um nome de classe
 * perfeitamente válido.
 *
 * **A versão anterior desta varredura tinha um furo, e ele custou 16 campos.**
 * Ela procurava só as tags HTML minúsculas (`<input>`, `<textarea>`,
 * `<select>`), e esta loja monta quase todo campo com o `<Input>` do shadcn —
 * maiúsculo. Resultado: contato, endereço, cupom, pagamento e os seis passos de
 * autenticação ficaram com contorno abaixo do piso, com o teste verde o tempo
 * todo. A lista de tags abaixo inclui os componentes de propósito.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

/** Toda tag que renderiza um controle — HTML nativo E componente do shadcn. */
const CONTROL_TAGS = [
  'input',
  'textarea',
  'select',
  'Input',
  'Textarea',
  'SelectTrigger',
  'Checkbox',
  'RadioGroupItem',
  'Switch',
]

/**
 * Cores proibidas como contorno de controle, com a razão medida sobre `ground`.
 * Não é lista de gosto: é a lista do que reprova a WCAG 1.4.11.
 */
const PROIBIDAS: Record<string, string> = {
  'border-estrelinha-line': '1,25:1',
  'border-estrelinha-accent': '2,66:1',
  'border-estrelinha-serenity': '1,19:1',
}

const TAG_RE = new RegExp(`<(${CONTROL_TAGS.join('|')})\\b`)

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(full)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
  })
}

/**
 * O elemento em si — da tag de abertura até onde ele fecha, ou até o próximo
 * elemento começar, o que vier primeiro.
 *
 * O corte importa: uma janela fixa de N linhas atribuiria ao campo o
 * `border-estrelinha-line` do `<div>` que vem logo depois, e a varredura
 * passaria a acusar o inocente. Falso positivo em teste-guarda tem o mesmo
 * efeito de falso negativo — as duas coisas fazem alguém desligar o teste.
 */
function controlElements(source: string): { line: number; tag: string; body: string }[] {
  const lines = source.split('\n')
  const found: { line: number; tag: string; body: string }[] = []

  lines.forEach((line, i) => {
    const match = TAG_RE.exec(line)
    if (!match) return

    const body: string[] = [line.slice(match.index)]
    if (!/\/>/.test(body[0])) {
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        if (/^\s*<[A-Za-z]/.test(lines[j])) break // outro elemento começou
        body.push(lines[j])
        if (/\/>|^\s*>/.test(lines[j])) break // este fechou
      }
    }

    found.push({ line: i + 1, tag: match[1], body: body.join('\n') })
  })

  return found
}

describe('borda de campo — `field`, nunca `line`', () => {
  const files = tsxFiles(SRC)

  it('a varredura encontra os arquivos da loja', () => {
    // Sem esta âncora, um erro de caminho faria a suíte varrer zero arquivo e
    // passar em silêncio — a pior falha possível num teste de varredura.
    expect(files.length).toBeGreaterThan(50)
  })

  it('a varredura encontra os controles da loja', () => {
    // Segunda âncora, e é a que teria pego o furo antigo: a lista de tags pode
    // continuar sintaticamente certa enquanto o repositório migra para outro
    // componente de campo — e aí a varredura acha zero controle, não tem o que
    // reprovar, e volta a passar por estar vazia.
    const total = files.reduce(
      (acc, file) => acc + controlElements(readFileSync(file, 'utf8')).length,
      0,
    )

    expect(total).toBeGreaterThan(20)
  })

  it.each(Object.entries(PROIBIDAS))(
    'nenhum controle usa `%s` (%s sobre o chão — reprova a WCAG 1.4.11)',
    (classe) => {
      const offenders = files.flatMap((file) =>
        controlElements(readFileSync(file, 'utf8'))
          .filter(({ body }) => body.includes(classe))
          .map(({ line, tag }) => `${relative(SRC, file).replace(/\\/g, '/')}:${line} <${tag}>`),
      )

      expect(offenders).toEqual([])
    },
  )
})

describe('borda de campo — por que `field`, e não outra cor', () => {
  const FIELD = '#8C8073'
  const SUPERFICIES = {
    ground: '#FAF8F4',
    'ground-deep': '#F1EBE1',
    surface: '#FFFFFF',
  }

  it.each(Object.entries(SUPERFICIES))(
    '`field` passa a WCAG 1.4.11 sobre `%s` (≥ 3:1)',
    (nome, fundo) => {
      const razao = contrastRatio(FIELD, fundo)
      const veredito =
        razao >= 3 ? `field sobre ${nome}: OK` : `field sobre ${nome}: ${razao.toFixed(2)}:1`

      expect(veredito).toBe(`field sobre ${nome}: OK`)
    },
  )

  it('os dois candidatos que o DS já tinha reprovam — é por isso que o token nasceu', () => {
    // Congela a decisão D2 do design com os números, e não com uma afirmação.
    expect(contrastRatio('#E6DFD4', SUPERFICIES.ground)).toBeLessThan(3) // line   1,25
    expect(contrastRatio('#B8945F', SUPERFICIES.ground)).toBeLessThan(3) // accent 2,66
  })

  it('`accent-strong` passaria no número, e mesmo assim não é a escolha', () => {
    // 3,55:1. Passa a régua e reprova no papel: usá-lo em toda borda de input
    // gastaria o acento da marca no elemento mais repetido da loja.
    expect(contrastRatio('#A07E4C', SUPERFICIES.ground)).toBeGreaterThanOrEqual(3)
  })
})
