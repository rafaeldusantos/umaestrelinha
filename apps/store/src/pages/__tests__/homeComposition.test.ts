import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * O que a home NÃO monta mais — `IDN-04`.
 *
 * Duas seções saíram no passe visual da Fase 5, e as duas por não terem
 * re-skin possível:
 *
 * - **`DropCountdown`** — contagem regressiva para a "sexta do drop", com o
 *   título "Novos pins chegando!". A data era calculada no próprio componente:
 *   um prazo que não existe, prometido na primeira dobra. "Drop" também não é
 *   vocabulário desta loja — a T16 já tinha recusado semear a tabela `drops`
 *   pelo mesmo motivo.
 * - **`SocialProof`** — dois depoimentos inventados, com nome e cidade
 *   inventados. Mesma decisão da `PIN-07` para as avaliações de demonstração,
 *   e aqui ela pesa mais: um elogio fabricado a uma homenagem fúnebre não é
 *   enfeite de vitrine.
 *
 * A asserção é sobre o **fonte lido do disco**, e não sobre a árvore
 * renderizada: um componente pode voltar a ser importado e ficar atrás de uma
 * condição que o teste de render não alcança.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')

const homePage = readFileSync(join(SRC, 'pages/HomePage.tsx'), 'utf8')

/** Os dois módulos apagados, pelo caminho que tinham. */
const APAGADOS = [
  'widgets/home-sections/ui/DropCountdown.tsx',
  'widgets/home-sections/ui/SocialProof.tsx',
]

describe('home — as duas seções que saíram não voltam', () => {
  it('a leitura do HomePage encontrou o arquivo', () => {
    // Âncora: sem ela, um caminho errado leria string vazia e todas as
    // asserções de ausência passariam por vacuidade.
    expect(homePage).toContain('const HomePage')
    expect(homePage.length).toBeGreaterThan(400)
  })

  it('os módulos não existem mais no disco', () => {
    const sobreviventes = APAGADOS.filter((p) => existsSync(join(SRC, p)))
    expect(sobreviventes).toEqual([])
  })

  it('nada no app importa os dois módulos', () => {
    const tsx = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
        const full = join(dir, e.name)
        if (e.isDirectory()) return tsx(full)
        return e.isFile() && /\.tsx?$/.test(e.name) ? [full] : []
      })

    const arquivos = tsx(SRC)
    expect(arquivos.length).toBeGreaterThan(50)

    const ofensores = arquivos.filter((f) =>
      /from '.*\/(DropCountdown|SocialProof)'/.test(readFileSync(f, 'utf8')),
    )

    expect(ofensores).toEqual([])
  })

  it('a home não monta nenhum dos dois', () => {
    // Casa a TAG, não o nome solto: o comentário de topo do arquivo cita os
    // dois de propósito, para registrar por que saíram.
    expect(homePage).not.toMatch(/<(DropCountdown|SocialProof)\b/)
  })

  it('a grade de coleções ficou com a largura inteira', () => {
    // Ela dividia a linha com o contador (`md:w-[460px]` + `flex-1`). Com o
    // contador fora, o `flex-row` teria deixado uma coluna vazia à esquerda.
    expect(homePage).not.toMatch(/md:w-\[460px\]/)
  })
})
