import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `PED-05` — a chave `estrelinha-order-access` tem **um** dono, e é
 * `entities/order/model/orderAccess.ts`.
 *
 * O token é a ÚNICA credencial de um pedido de convidada. Uma segunda leitura escrita à mão — a
 * chave com um caractere trocado, `sessionStorage` no lugar de `localStorage`, um `JSON.parse` sem
 * `try` — faria a confirmação abrir vazia **sem nada quebrar**: o pedido existe, o token existe, e
 * a tela diz "não encontrado". É o modo de falha mais caro possível, porque acontece logo depois
 * de a cliente pagar.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CHAVE = 'estrelinha-order-access'

/** Escrito literalmente: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src']

/** O único arquivo autorizado a citar a chave. */
const DONO = 'entities/order/model/orderAccess.ts'

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const arquivos = ESCOPO.flatMap((relativo) => {
  const saida: { nome: string; fonte: string }[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules' || entrada.name === '__tests__') continue
        andar(caminho)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name)) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').split('/src/')[1] ?? entrada.name,
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
})

const citaAChave = (fonte: string): boolean => semComentario(fonte).includes(CHAVE)

describe('PED-05 — a chave do acesso ao pedido tem um dono só', () => {
  it('a varredura leu os dois apps e achou o dono — âncora dupla', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(400)
    expect(arquivos.map((a) => a.nome)).toContain(DONO)
  })

  it('só o dono cita a chave', () => {
    const citadores = arquivos.filter((a) => citaAChave(a.fonte)).map((a) => a.nome)

    expect(citadores).toEqual([DONO])
  })

  it('sensor — uma citação nova É acusada, e a menção em comentário NÃO é', () => {
    expect(citaAChave(`localStorage.getItem('${CHAVE}')`)).toBe(true)
    expect(citaAChave(`// a chave é ${CHAVE}\nconst x = 1`)).toBe(false)
    expect(citaAChave(`/* ${CHAVE} */\r\nconst x = 1`)).toBe(false)
  })

  it('o dono usa `localStorage`, não `sessionStorage`', () => {
    // O rascunho do checkout é da sessão e morre com a aba, de propósito. O acesso ao pedido, não:
    // fechar a aba depois de pagar não pode apagar o único caminho de volta.
    const dono = arquivos.find((a) => a.nome === DONO)!

    expect(dono.fonte).toContain('localStorage')
    expect(semComentario(dono.fonte)).not.toContain('sessionStorage')
  })
})
