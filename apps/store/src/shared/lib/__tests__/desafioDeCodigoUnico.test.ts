import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `IDN-03` — **o campo de 6 dígitos tem um dono só**: `features/auth/ui/steps`.
 *
 * O desafio da feature `49` reusa `AuthCodeStep` inteiro. A tentação de escrever um campo próprio
 * "só para o checkout" é grande — ele parece simples: seis caixas e um submit. O que vem junto e
 * não parece é o **reenvio com cooldown de 60s**, a distinção entre código errado e expirado, o
 * salto para o passo de nome de quem nunca preencheu, e a normalização do token colado com espaços.
 *
 * Dois campos seriam duas máquinas de estado de login divergindo no primeiro ajuste de uma delas —
 * e o modo de falhar é a cliente digitando um código certo que a tela recusa.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const ESCOPO = 'apps/store/src'

/** Onde o campo de código PODE morar. Escrito literalmente. */
const DONO = 'features/auth/ui/steps'

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const arquivos = (() => {
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
  andar(resolve(ROOT, ESCOPO))
  return saida
})()

/** O primitivo do campo de código. Quem o monta está escrevendo um campo de 6 dígitos. */
const montaCampoDeCodigo = (fonte: string): boolean =>
  /<InputOTP[\s/>]|from ['"]@estrelinha\/ui\/input-otp['"]/.test(semComentario(fonte))

describe('IDN-03 — o campo de 6 dígitos tem um dono só', () => {
  it('a varredura leu a loja e achou o dono — âncora dupla', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(240)
    expect(arquivos.some((a) => a.nome.startsWith(DONO))).toBe(true)
  })

  it('só os passos de auth montam o campo de código', () => {
    const fora = arquivos
      .filter((a) => montaCampoDeCodigo(a.fonte) && !a.nome.startsWith(DONO))
      .map((a) => a.nome)

    expect(fora).toEqual([])
  })

  it('o desafio do checkout REUSA o passo, em vez de reescrevê-lo', () => {
    // O sentido positivo: sem ele, apagar o `AuthCodeStep` do desafio passaria — a ausência de um
    // segundo campo seria verdadeira por não haver campo nenhum.
    const desafio = arquivos.find(
      (a) => a.nome === 'features/checkout/ui/CheckoutSignInChallenge.tsx',
    )

    expect(desafio).toBeDefined()
    expect(semComentario(desafio!.fonte)).toContain('AuthCodeStep')
  })

  it('sensor — um campo novo É acusado, e a menção em comentário NÃO é', () => {
    expect(montaCampoDeCodigo(`<InputOTP maxLength={6} />`)).toBe(true)
    expect(montaCampoDeCodigo(`import { InputOTP } from '@estrelinha/ui/input-otp'`)).toBe(true)
    expect(montaCampoDeCodigo(`// não usar <InputOTP> aqui\nconst x = 1`)).toBe(false)
    expect(montaCampoDeCodigo(`/* <InputOTP /> */\r\nconst x = 1`)).toBe(false)
  })

  it('sensor — um nome que só COMEÇA igual não é acusado', () => {
    // `InputOTPGroup` e `InputOTPSlot` são partes do mesmo primitivo e vivem no dono; o que a régua
    // mede é a montagem do campo, e o import do módulo já a cobre.
    expect(montaCampoDeCodigo(`const InputOTPLike = 1`)).toBe(false)
  })
})
