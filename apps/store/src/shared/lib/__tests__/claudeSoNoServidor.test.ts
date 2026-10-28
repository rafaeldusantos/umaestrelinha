import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A chave da Claude API e o SDK da Anthropic NUNCA entram nos apps nem nos pacotes — `SIA-19`,
 * feature 84 (`AD-067`). Molde: `chaveDeServidorForaDoNavegador.test.ts`.
 *
 * A integração com o modelo tem UMA porta: a edge function `seo-suggest`, com o SDK importado só em
 * `supabase/functions/_shared/claude.ts` (`claudeSoNaPorta.test.ts`, na suíte das functions). Deste
 * lado só existe `supabase.functions.invoke`. Uma chave num `.env` de app com prefixo `VITE_`, ou o
 * SDK chamado do navegador, **funcionaria** — e entregaria a chave a qualquer visitante, com custo
 * sem teto. Errar aqui não quebra nada; por isso a régua lê o disco.
 *
 * Três formas proibidas, em `apps/**` e `packages/**`, produção E teste:
 *  - o nome da env da chave;
 *  - o nome do pacote do SDK;
 *  - o host da API (um `fetch` cru seria o mesmo vazamento por outro caminho).
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos (com um de cada app e um de `packages` nomeados,
 * `L-035`) **e** que o extrator encontra código de verdade. O escopo está escrito LITERALMENTE.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: o que vira JavaScript servido e o que os apps importam. */
const ESCOPO = ['apps', 'packages']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git', '.server'])
const EXTENSOES = ['.ts', '.tsx', '.js']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

/**
 * O fonte sem comentários, uma entrada por linha. CRLF normalizado primeiro (`L-031`), e linha e
 * bloco na MESMA varredura (`BL-027`) — senão um comentário de linha com um glob de dois asteriscos
 * apagaria código até o próximo fecha-bloco. E o `//` de um esquema de URL não abre comentário.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    // `(?<!:)`: o `//` de `https://` NÃO abre comentário. Sem isso um `fetch('https://…')` com o host
    // da API teria o resto da linha apagado como comentário, e a régua do host nunca o veria.
    .replace(/(?<!:)\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap(d => arquivos(join(ROOT, d))).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (regua: RegExp, alvo: Arquivo[] = varridos): Ocorrencia[] =>
  alvo.flatMap(a =>
    a.linhas.flatMap((texto, i) =>
      regua.test(texto) ? [{ arquivo: a.rel, linha: i + 1, texto: texto.trim() }] : [],
    ),
  )

// Montadas por concatenação: o sensor exerce a régua sem depender do literal inteiro neste arquivo.
const ENV = `ANTHROPIC_${'API'}_KEY`
const PACOTE = `@anthropic-ai/${'sdk'}`
const HOST = `api.${'anthropic'}.com`

const REGUA_ENV = new RegExp(ENV)
const REGUA_PACOTE = new RegExp(PACOTE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))
const REGUA_HOST = new RegExp(HOST.replace(/\./g, '\\.'), 'i')

/** O único arquivo isento, escrito LITERALMENTE: este, que carrega as formas nos sensores. */
const ESTE_ARQUIVO = 'apps/store/src/shared/lib/__tests__/claudeSoNoServidor.test.ts'
const exceto = (o: Ocorrencia) => o.arquivo !== ESTE_ARQUIVO

describe('a chave e o SDK da Claude fora dos apps — âncora dupla', () => {
  it('a varredura leu arquivos dos apps e dos pacotes', () => {
    expect(varridos.length).toBeGreaterThan(1000)
  })

  it('o escopo alcança a loja, o painel, o app do ateliê e os pacotes, nomeando um arquivo de cada (L-035)', () => {
    const rels = varridos.map(a => a.rel)
    expect(rels).toContain('apps/store/src/app/App.tsx')
    expect(rels).toContain('apps/backoffice/src/app/App.tsx')
    expect(rels).toContain('apps/mobile-adm/src/app/App.tsx')
    expect(rels).toContain('packages/core/src/seo/suggestion.ts')
  })

  it('o extrator encontra código de verdade — a porta de outra function é lida', () => {
    const invocacoes = procurar(/functions\s*\.\s*invoke\s*\(\s*['"`]admin-users/)
    expect(invocacoes.map(o => o.arquivo)).toContain(
      'apps/backoffice/src/features/admin-users/api/useAdminUsers.ts',
    )
  })

  it('o arquivo do allowlist EXISTE — o caminho não envelheceu', () => {
    expect(varridos.map(a => a.rel)).toContain(ESTE_ARQUIVO)
  })
})

describe('a chave e o SDK da Claude fora dos apps — as três ausências', () => {
  it('nenhum arquivo de `apps/**` ou `packages/**` nomeia a env da chave', () => {
    expect(procurar(REGUA_ENV).filter(exceto)).toEqual([])
  })

  it('nenhum arquivo de `apps/**` ou `packages/**` nomeia o pacote do SDK', () => {
    expect(procurar(REGUA_PACOTE).filter(exceto)).toEqual([])
  })

  it('nenhum arquivo de `apps/**` ou `packages/**` fala com o host da API', () => {
    expect(procurar(REGUA_HOST).filter(exceto)).toEqual([])
  })

  it('o allowlist é de UM — outro arquivo de teste com a chave SERIA acusado', () => {
    const outroTeste: Arquivo[] = [
      {
        rel: 'apps/backoffice/src/features/seo-suggestion/api/requestSeoSuggestion.test.ts',
        linhas: semComentarios(`const k = import.meta.env.VITE_${ENV}\n`),
      },
    ]
    const acusado = procurar(REGUA_ENV, outroTeste).filter(exceto)
    expect(acusado).toHaveLength(1)
    expect(acusado[0].arquivo).toBe('apps/backoffice/src/features/seo-suggestion/api/requestSeoSuggestion.test.ts')
  })
})

const arquivoFalso = (fonte: string): Arquivo[] => [
  { rel: 'apps/backoffice/src/inventado.ts', linhas: semComentarios(fonte) },
]

describe('a chave e o SDK da Claude fora dos apps — os sensores', () => {
  it.each([
    ['com prefixo VITE_', `const k = import.meta.env.VITE_${ENV}\n`],
    ['numa string', `const nome = '${ENV}'\n`],
    ['com CRLF', `const a = 1\r\nconst k = process.env.${ENV}\r\n`],
    ['com LF', `const a = 1\nconst k = process.env.${ENV}\n`],
  ])('SENSOR — a régua da env ACUSA o nome %s', (_r, fonte) => {
    expect(procurar(REGUA_ENV, arquivoFalso(fonte))).toHaveLength(1)
  })

  it.each([
    ['import padrão', `import Anthropic from '${PACOTE}'\n`],
    ['subcaminho', `import { x } from '${PACOTE}/helpers/json-schema'\n`],
    ['import dinâmico', `const m = await import('${PACOTE}')\n`],
  ])('SENSOR — a régua do pacote ACUSA o %s', (_r, fonte) => {
    expect(procurar(REGUA_PACOTE, arquivoFalso(fonte))).toHaveLength(1)
  })

  it.each([
    ['fetch cru', `await fetch('https://${HOST}/v1/messages', { method: 'POST' })\n`],
    ['caixa diferente', `const u = 'https://${HOST.toUpperCase()}'\n`],
  ])('SENSOR — a régua do host ACUSA o %s', (_r, fonte) => {
    expect(procurar(REGUA_HOST, arquivoFalso(fonte))).toHaveLength(1)
  })

  it('SENSOR INVERSO — chamar a function, nomear a IA na copy e o modelo NÃO são acusados', () => {
    const saudavel = arquivoFalso(
      [
        "await supabase.functions.invoke('seo-suggest', { body })",
        "const t = 'Sugerir com IA'",
        "const marca = 'Uma Estrelinha'",
        "const sdk = '@estrelinha/core'",
        '',
      ].join('\n'),
    )
    expect(procurar(REGUA_ENV, saudavel)).toEqual([])
    expect(procurar(REGUA_PACOTE, saudavel)).toEqual([])
    expect(procurar(REGUA_HOST, saudavel)).toEqual([])
  })

  it('SENSOR — comentário de linha e de bloco não é acusado (CRLF e LF)', () => {
    expect(procurar(REGUA_ENV, arquivoFalso(`// a ${ENV} mora no servidor\r\nconst a = 1\r\n`))).toEqual([])
    expect(procurar(REGUA_PACOTE, arquivoFalso(`/* ${PACOTE} */\nconst a = 1\n`))).toEqual([])
  })

  it('SENSOR — o `//` do esquema não abre comentário, e um comentário que CITA a URL continua comentário', () => {
    expect(procurar(REGUA_HOST, arquivoFalso(`const u = "https://${HOST}/v1"; // a porta\n`))).toHaveLength(1)
    expect(procurar(REGUA_HOST, arquivoFalso(`// veja https://${HOST}/v1\nconst a = 1\n`))).toEqual([])
  })

  it('SENSOR — o glob de dois asteriscos num comentário NÃO cega a varredura (BL-027)', () => {
    const glob = '/' + '**'
    const doente = arquivoFalso(`// varre ${glob} inteiro\nconst k = import.meta.env.VITE_${ENV}\n`)
    expect(procurar(REGUA_ENV, doente)).toHaveLength(1)
  })

  it('SENSOR — o removedor preserva o número da linha', () => {
    const doente = arquivoFalso(`const a = 1\n// nada\nimport A from '${PACOTE}'\n`)
    expect(procurar(REGUA_PACOTE, doente)[0].linha).toBe(3)
  })
})
