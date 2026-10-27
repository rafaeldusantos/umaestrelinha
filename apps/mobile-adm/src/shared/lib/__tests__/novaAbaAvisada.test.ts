// Conserto do QA da `76` · `BUG-20261024-whatsapp-da-ficha-nao-avisa-nova-aba` — todo link do app que
// abre OUTRA ABA (`target="_blank"`) diz isso no nome acessível. Quem ouve o TalkBack e toca em
// "Conversar no WhatsApp" é levada a outro app sem aviso, e o voltar não a traz para onde estava.
//
// O aviso tem UM dono, `shared/config/novaAba.ts` (`nomeDoLinkExterno`): o rótulo visível vem
// primeiro (rótulo no nome), o aviso depois. A régua lê o FONTE do disco (comentário fora, CRLF
// primeiro, linha e bloco na MESMA varredura), pega cada `<a …>` de produção que tem `_blank` e exige
// `aria-label={nomeDoLinkExterno(` na MESMA tag. Um terceiro link de aba nova que esquecesse o aviso
// reprovaria aqui, e nenhuma outra ferramenta o veria.
//
// Âncora dupla: os arquivos de produção lidos e os QUATRO links de aba nova conhecidos encontrados
// (o contato da ficha, o bloco Cliente do pedido, o lembrete do envio e, desde a `82`, "Ver nos Correios"). Sensores: a tag sem aviso
// reprova, a com aviso passa, e o comentário que cita a forma proibida não é acusado.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const todos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' ? [] : todos(caminho)
    return /\.tsx$/.test(nome) && !/\.test\./.test(nome) ? [caminho] : []
  })

const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n?/g, '\n').replace(/(?<!:)\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))

/** Cada tag `<a …>` que tem `target="_blank"`, com o motivo de reprovar (ou `null`). */
export const linksDeAbaNova = (fonte: string): { tag: string; falta: boolean }[] =>
  [...semComentarios(fonte).matchAll(/<a\b[^>]*?target=["{]["']?_blank[\s\S]*?>/g)].map((m) => ({
    tag: m[0],
    falta: !/aria-label=\{nomeDoLinkExterno\(/.test(m[0]),
  }))

const ARQUIVOS = todos(SRC).map((c) => ({ rel: relative(SRC, c).split('\\').join('/'), fonte: readFileSync(c, 'utf8') }))
const ACHADOS = ARQUIVOS.flatMap((a) => linksDeAbaNova(a.fonte).map((l) => ({ ...l, rel: a.rel })))

describe('todo link de aba nova avisa no nome acessível', () => {
  it('âncora: leu os arquivos de produção e achou os quatro links conhecidos', () => {
    expect(ARQUIVOS.length).toBeGreaterThan(40)
    expect(ACHADOS.map((a) => a.rel).sort()).toEqual([
      // Feature `82` (`ENV-19`): "Ver nos Correios".
      'features/order-actions/ui/EnvelopeDaCliente.tsx',
      'features/order-actions/ui/LembreteDoEnvio.tsx',
      'widgets/customer-detail/ui/ContatoDaCliente.tsx',
      'widgets/order-detail/ui/BlocoCliente.tsx',
    ])
  })

  it('nenhum deles esquece o aviso', () => {
    expect(ACHADOS.filter((a) => a.falta).map((a) => a.rel)).toEqual([])
  })

  it('o dono do aviso existe e é o único lugar do texto', () => {
    const dono = readFileSync(join(SRC, 'shared/config/novaAba.ts'), 'utf8')
    expect(dono).toContain("'abre em outra aba'")
    const fora = ARQUIVOS.filter((a) => a.rel !== 'shared/config/novaAba.ts' && /abre em outra aba/.test(semComentarios(a.fonte)))
    expect(fora.map((a) => a.rel)).toEqual([])
  })
})

describe('sensores', () => {
  it('a tag de aba nova SEM o aviso é acusada', () => {
    expect(linksDeAbaNova('<a href="x" target="_blank" rel="noopener noreferrer">Oi</a>')).toEqual([
      expect.objectContaining({ falta: true }),
    ])
  })

  it('a tag de aba nova COM o aviso passa', () => {
    const tag = '<a href={x}\n target="_blank"\n aria-label={nomeDoLinkExterno(ROTULO)}\n>Oi</a>'
    expect(linksDeAbaNova(tag)).toEqual([expect.objectContaining({ falta: false })])
  })

  it('o aviso escrito DEPOIS de `_blank` na mesma tag conta; o escrito ANTES também', () => {
    expect(linksDeAbaNova('<a aria-label={nomeDoLinkExterno(X)} target="_blank">a</a>')[0].falta).toBe(false)
  })

  it('o comentário que cita a forma não é acusado (CRLF e LF)', () => {
    expect(linksDeAbaNova('// <a target="_blank">\r\nconst x = 1')).toEqual([])
    expect(linksDeAbaNova('/* <a target="_blank"> */\nconst x = 1')).toEqual([])
  })

  it('um link comum, sem aba nova, não é alvo da régua', () => {
    expect(linksDeAbaNova('<a href="/x">Oi</a>')).toEqual([])
  })
})
