import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TAP_44, TAP_ROW } from '../touchTarget'

/**
 * Alvo de toque de 44px — `IDN-10`.
 *
 * O `CLAUDE.md` lista "alvo de toque abaixo de 44px" entre as cinco coisas que
 * quebram primeiro no celular. A medição de verdade é de layout e só existe no
 * navegador — jsdom devolve 0 para tudo. O que este arquivo trava é o que dá
 * para travar em unidade, e é o que a regressão de fato precisa:
 *
 * 1. **A medida é 44 e mora num lugar só.** Um `before:h-10` digitado por
 *    engano num dos consumidores não produziria erro nenhum.
 * 2. **A varredura acha os controles pequenos que NÃO adotaram o auxiliar.**
 *    Disco de 32/36/38/40px é o desenho da board e vai continuar existindo; o
 *    que não pode existir é um deles sem o retângulo de 44 por baixo.
 *
 * A prova de que os 44px chegam na tela é a auditoria em 390×844 registrada no
 * `tasks.md` — este teste é o que impede a regressão silenciosa entre uma
 * auditoria e a próxima.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

describe('alvo de toque — a medida', () => {
  it('os dois auxiliares medem 44px, e não outra coisa', () => {
    expect(TAP_44).toContain('before:h-11')
    expect(TAP_44).toContain('before:w-11')
    expect(TAP_ROW).toContain('before:h-11')
  })

  it('o alvo centrado cresce nas duas direções, e o de linha só na vertical', () => {
    // Um quadrado de 44 centrado num link de 130px deixaria as pontas fora do
    // alvo — por isso são dois auxiliares e não um.
    expect(TAP_44).toContain('before:-translate-x-1/2')
    expect(TAP_ROW).toContain('before:inset-x-0')
    expect(TAP_ROW).not.toContain('before:w-11')
  })

  it('os dois posicionam o pseudo-elemento a partir do próprio controle', () => {
    // Sem `relative` no elemento, o `absolute` do pseudo sobe para o ancestral
    // posicionado mais próximo e o alvo aparece em outro lugar da tela.
    expect(TAP_44.startsWith('relative ')).toBe(true)
    expect(TAP_ROW.startsWith('relative ')).toBe(true)
  })
})

/** Discos e caixas abaixo de 44px que precisam do auxiliar por baixo. */
const PEQUENOS = /\b(?:h-8 w-8|h-9 w-9|h-10 w-10|h-\[38px\] w-\[38px\])\b/

/** Só o que RECEBE toque. Ícone, spinner e selo de passo têm o mesmo tamanho e
 *  não são alvo de nada — cobrá-los transformaria a varredura em ruído, e
 *  varredura ruidosa é varredura que alguém desliga. */
const CONTROLE = /^\s*<(button|a|Link)\b/

/**
 * O elemento, da tag de abertura até onde ele fecha ou até o próximo elemento
 * começar. Mesmo recorte de `fieldBorder.test.ts`, e pelo mesmo motivo: uma
 * janela fixa de N linhas atribuiria ao botão o `h-9 w-9` do `<span>` seguinte.
 */
function controls(source: string): { line: number; body: string }[] {
  const lines = source.split('\n')
  const found: { line: number; body: string }[] = []

  lines.forEach((line, i) => {
    if (!CONTROLE.test(line)) return
    const body: string[] = [line]
    for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
      if (/^\s*<[A-Za-z]/.test(lines[j])) break
      body.push(lines[j])
      if (/\/>|^\s*>/.test(lines[j])) break
    }
    found.push({ line: i + 1, body: body.join('\n') })
  })

  return found
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsxFiles(full)
    return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
  })
}

const arquivos = tsxFiles(SRC)

describe('alvo de toque — nenhum controle pequeno sem o retângulo de 44', () => {
  it('a varredura encontra os arquivos da loja', () => {
    // Sem esta âncora, um caminho errado varre zero arquivo e passa em
    // silêncio — a mesma lição que a `fieldBorder` pagou.
    expect(arquivos.length).toBeGreaterThan(50)
  })

  it('a varredura encontra controles pequenos de verdade', () => {
    // Segunda âncora, no objeto medido: se a escala de tamanhos mudar de nome,
    // a varredura acha zero, não tem o que reprovar, e volta a passar vazia.
    const total = arquivos.reduce(
      (acc, f) => acc + controls(readFileSync(f, 'utf8')).filter((c) => PEQUENOS.test(c.body)).length,
      0,
    )

    expect(total).toBeGreaterThan(5)
  })

  it('todo controle menor que 44px carrega `TAP_44`', () => {
    const ofensores = arquivos.flatMap((file) =>
      controls(readFileSync(file, 'utf8'))
        .filter(({ body }) => PEQUENOS.test(body))
        .filter(({ body }) => !body.includes('TAP_44') && !body.includes('before:h-11'))
        .map(({ line }) => `${relative(SRC, file).replace(/\\/g, '/')}:${line}`),
    )

    expect(ofensores).toEqual([])
  })
})
