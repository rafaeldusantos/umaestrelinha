import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { corsHeaders, json, preflight } from '../http.ts'
import { corsHeaders as mpCors, json as mpJson } from '../../mercado-pago/handlers.ts'
import { corsHeaders as notifCors, json as notifJson } from '../../send-notification/handlers.ts'
import { corsHeaders as adminCors, json as adminJson } from '../../admin-users/handlers.ts'

/**
 * O cabeçalho CORS das edge functions tem **um** dono.
 *
 * Antes da feature `49` eram TRÊS declarações idênticas (`melhor-envio/index.ts`,
 * `mercado-pago/handlers.ts`, `send-notification/handlers.ts`). Idênticas hoje; a primeira
 * divergência — uma origem restrita numa delas, um header a mais em outra — não quebraria build,
 * `tsc` nem teste. Quebraria o navegador de uma cliente, numa function só.
 *
 * A asserção que importa é de **identidade de referência**, não de igualdade estrutural:
 * `toEqual` passaria com uma segunda declaração copiada e colada, que é exatamente o que este
 * guarda existe para impedir.
 */

const FUNCTIONS = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/** Remove comentário de linha e de bloco na MESMA varredura — a régua mede uso, não menção. */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** Todo `.ts` de produção das functions (exclui teste e fixture). */
const arquivosDeProducao = (): { nome: string; fonte: string }[] => {
  const saida: { nome: string; fonte: string }[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue
        andar(caminho)
        continue
      }
      if (!entrada.name.endsWith('.ts')) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').split('supabase/functions/')[1] ?? entrada.name,
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(FUNCTIONS)
  return saida
}

/** `const corsHeaders = {` — a declaração, não o import nem o reexport. */
const declaraCors = (fonte: string): boolean =>
  /(?:^|\n)\s*(?:export\s+)?const\s+corsHeaders\s*=\s*\{/.test(semComentario(fonte))

describe('_shared/http.ts é o dono único do CORS das functions', () => {
  const arquivos = arquivosDeProducao()

  it('a varredura leu as functions — âncora de contagem', () => {
    // Sem âncora, um caminho errado leria zero arquivo e a asserção de ausência abaixo passaria
    // sobre uma lista vazia.
    expect(arquivos.length).toBeGreaterThanOrEqual(10)
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining([
        '_shared/http.ts',
        'mercado-pago/handlers.ts',
        'send-notification/handlers.ts',
        'melhor-envio/index.ts',
        'admin-users/handlers.ts',
      ]),
    )
  })

  it('só `_shared/http.ts` DECLARA o cabeçalho — as outras importam', () => {
    const declarantes = arquivos.filter((a) => declaraCors(a.fonte)).map((a) => a.nome)

    expect(declarantes).toEqual(['_shared/http.ts'])
  })

  it('sensor — uma segunda declaração É acusada, e um import NÃO é', () => {
    // O par que prova que a régua mede declaração, não menção. Sem ele, uma régua que casasse
    // qualquer ocorrência de `corsHeaders` acusaria os três arquivos que estão certos.
    expect(declaraCors('const corsHeaders = {\n  "A": "*",\n}')).toBe(true)
    expect(declaraCors('export const corsHeaders = {}')).toBe(true)
    expect(declaraCors('import { corsHeaders } from "../_shared/http.ts"')).toBe(false)
    expect(declaraCors('export { corsHeaders } from "../_shared/http.ts"')).toBe(false)
    expect(declaraCors('// antes havia um const corsHeaders = { aqui\r\nselect')).toBe(false)
  })

  it('as três functions reexportam a MESMA referência, não uma cópia', () => {
    // `toEqual` passaria com uma segunda declaração copiada e colada. `toBe` não.
    //
    // `admin-users` entrou nesta lista no MERGE da feature `48`: ela nasceu com a quarta cópia
    // idêntica, e o guarda a acusou na primeira execução da árvore mesclada. É exatamente o
    // trabalho que ele existe para fazer — a cópia veio de outra sessão, não desta.
    expect(mpCors).toBe(corsHeaders)
    expect(notifCors).toBe(corsHeaders)
    expect(adminCors).toBe(corsHeaders)
    expect(mpJson).toBe(json)
    expect(notifJson).toBe(json)
    expect(adminJson).toBe(json)
  })
})

describe('_shared/http.ts — as respostas', () => {
  it('json aplica os headers de CORS e o tipo', async () => {
    const res = json({ ok: true }, 201)

    expect(res.status).toBe(201)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(await res.json()).toEqual({ ok: true })
  })

  it('json responde 200 por padrão', () => {
    expect(json({}).status).toBe(200)
  })

  it('preflight responde com os headers de CORS', async () => {
    const res = preflight()

    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
    expect(await res.text()).toBe('ok')
  })
})
