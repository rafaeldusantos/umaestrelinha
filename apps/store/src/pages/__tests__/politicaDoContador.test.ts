import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `VIS-37` (feature `71`) — o contador de visitas não existe na loja sem o parágrafo da política.
 *
 * O contador começa a contar no primeiro acesso depois do deploy, e guarda um código no navegador
 * da cliente. Sem o parágrafo na Política de Privacidade, a loja trataria um identificador
 * persistente sem declará-lo — e nada quebraria: build, `tsc` e teste de componente passam com o
 * módulo publicado e a política calada. Este guarda lê os dois arquivos **do disco**.
 *
 * O texto é o do Apêndice A da spec, palavra por palavra. A aprovação da Adri é pré-condição do
 * DEPLOY (fica no handoff); a do código é esta.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')

/** Escritos literalmente: a régua não pode ser o objeto que ela mede. */
const CONTADOR = resolve(SRC, 'shared/lib/visits/visitor.ts')
const POLITICA = resolve(SRC, 'pages/PrivacyPolicyPage.tsx')

const PARAGRAFO =
  'Além disso, conto quantas visitas a loja recebe a cada dia. Para isso, o seu navegador guarda um código aleatório, que não identifica você pelo nome e não tem relação com os seus pedidos. Em cada dia em que você visita a loja, o meu servidor registra esse código e a data — e nada mais: não guardo o seu IP junto dessa contagem, nem as páginas que você viu. Esses registros são apagados depois de 8 dias e não são compartilhados com ninguém, nem com o Google. Desligar “Estatísticas” também desliga essa contagem e apaga o código do seu navegador; limpar os dados do site no navegador tem o mesmo efeito.'

/** O JSX quebra o texto em linhas: o React junta com UM espaço. A régua faz o mesmo. */
const normalizar = (fonte: string): string => fonte.replace(/\s+/g, ' ')

/** `true` quando a política, lida do disco, contém o parágrafo inteiro. */
const declaraOContador = (fontePolitica: string): boolean =>
  normalizar(fontePolitica).includes(PARAGRAFO)

/** A invariante: contador presente ⇒ parágrafo presente. */
const violada = (contadorExiste: boolean, fontePolitica: string): boolean =>
  contadorExiste && !declaraOContador(fontePolitica)

describe('VIS-37 — o contador só existe com o parágrafo da política', () => {
  const contadorExiste = existsSync(CONTADOR)
  const politica = readFileSync(POLITICA, 'utf8')

  it('os dois arquivos foram lidos — âncora', () => {
    expect(contadorExiste).toBe(true)
    expect(politica).toContain('Medição de audiência')
    expect(readFileSync(CONTADOR, 'utf8')).toContain('VISITOR_KEY')
  })

  it('a política declara o contador, palavra por palavra', () => {
    expect(violada(contadorExiste, politica)).toBe(false)
  })

  describe('sensores', () => {
    it('o parágrafo apagado da política reprova', () => {
      const semParagrafo = normalizar(politica).replace(PARAGRAFO, '')
      expect(semParagrafo).not.toBe(normalizar(politica))
      expect(violada(true, semParagrafo)).toBe(true)
    })

    it('uma palavra trocada reprova', () => {
      const trocada = normalizar(politica).replace('apagados depois de 8 dias', 'apagados depois de 90 dias')
      expect(trocada).not.toBe(normalizar(politica))
      expect(violada(true, trocada)).toBe(true)
    })

    it('"anônimo" no lugar de "aleatório" reprova', () => {
      const trocada = normalizar(politica).replace('um código aleatório', 'um código anônimo')
      expect(trocada).not.toBe(normalizar(politica))
      expect(violada(true, trocada)).toBe(true)
    })

    it('sem o contador, a invariante não cobra nada (o guarda não vale antes do módulo)', () => {
      expect(violada(false, '')).toBe(false)
    })
  })
})
