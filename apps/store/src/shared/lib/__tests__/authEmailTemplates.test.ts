import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * O guarda dos templates de e-mail de auth (feature 54).
 *
 * Nenhum comando lê `supabase/templates/`: são 3 arquivos HTML colados à mão num dashboard que a
 * CLI não consegue escrever (`config push`) nem ler de volta (não existe `config pull`). Divergência
 * entre eles — ou entre eles e a paleta que os e-mails transacionais usam — é invisível por
 * construção até alguém abrir a caixa de entrada. Por isso a régua é lida do fonte no disco, como
 * `materialTransitions`/`homeSections`/`menuSchema` leem migrations, e `layout.ts` é lido como
 * TEXTO — nunca importado: ele mora no workspace `supabase/functions` (Deno), e cruzar essa
 * fronteira a partir de um teste da loja não tem precedente no repositório.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** Âncora de caminho: apontar para o diretório errado faz `readdirSync` lançar em vez de varrer o vazio. */
const ROOT = resolve(HERE, '../../../../../..')
const TEMPLATES_DIR = resolve(ROOT, 'supabase/templates')
const LAYOUT_TS_PATH = resolve(ROOT, 'supabase/functions/send-notification/render/layout.ts')

const FILES = ['magic_link.html', 'confirmation.html', 'recovery.html'] as const
type FileName = (typeof FILES)[number]

function read(name: FileName): string {
  // \r\n -> \n ANTES de qualquer regex (L-031): num checkout Windows, `.` e `[\s\S]` de JS não
  // enxergam \r do jeito que a régua espera, e o guarda fica inerte sobre o próprio arquivo que
  // deveria varrer.
  return readFileSync(join(TEMPLATES_DIR, name), 'utf8').replace(/\r\n/g, '\n')
}

const RAW: Record<FileName, string> = Object.fromEntries(FILES.map((name) => [name, read(name)])) as Record<
  FileName,
  string
>

/** Remove o comentário de documentação do topo — o conteúdo pronto para colar no dashboard não o leva. */
function stripComment(html: string): string {
  return html.replace(/<!--[\s\S]*?-->\n?/, '')
}

/** Corta tudo antes da `<table>` externa — separa o preheader do casco propriamente dito. */
function fromOuterTable(html: string): string {
  const idx = html.indexOf('<table')
  expect(idx, 'não achei a <table> externa').toBeGreaterThanOrEqual(0)
  return html.slice(idx)
}

const H1 = /(<h1[^>]*>)([\s\S]*?)(<\/h1>)/
const LEAD = /(<p style="margin:0 0 24px[^"]*">)([\s\S]*?)(<\/p>)/
const NOTE = /(<p style="margin:24px 0 0[^"]*">)([\s\S]*?)(<\/p>)/

/**
 * As 3 regiões que legitimamente variam por template (AET-05): título, parágrafo de abertura e a
 * nota final ("não pediu?"). Tudo o mais no casco — faixa escura, wordmark, fio, card, caixa do
 * código, rodapé — tem de ser byte-idêntico nos 3 arquivos.
 */
function maskVariableRegions(html: string) {
  const h1 = html.match(H1)
  const lead = html.match(LEAD)
  const note = html.match(NOTE)
  expect(h1, 'não achei o <h1>').toBeTruthy()
  expect(lead, 'não achei o parágrafo de abertura').toBeTruthy()
  expect(note, 'não achei a nota final').toBeTruthy()

  const masked = html.replace(H1, '$1[[H1]]$3').replace(LEAD, '$1[[LEAD]]$3').replace(NOTE, '$1[[NOTE]]$3')

  return { masked, h1: h1![2], lead: lead![2], note: note![2] }
}

describe('templates de e-mail de auth — escopo da varredura', () => {
  it('encontra os 3 arquivos no disco', () => {
    const found = readdirSync(TEMPLATES_DIR)
      .filter((f) => f.endsWith('.html'))
      .sort()
    expect(found).toEqual([...FILES].sort())
  })
})

describe('templates de e-mail de auth — {{ .Token }}, nunca link (AET-01)', () => {
  it.each(FILES)('%s usa {{ .Token }} e nunca {{ .ConfirmationURL }}', (name) => {
    // Fora do comentário: o de `recovery.html` cita `{{ .Token }}` em prosa ("não ConfirmationURL"),
    // e varrer o arquivo bruto deixaria essa citação bastar para o teste passar — a mesma armadilha
    // do AET-02 mais acima, e a régua tem de ser consistente nos dois sentidos.
    const body = stripComment(RAW[name])
    expect(body, `${name} não usa {{ .Token }} fora do comentário`).toContain('{{ .Token }}')
    expect(body, `${name} usa {{ .ConfirmationURL }} fora do comentário`).not.toContain('{{ .ConfirmationURL }}')
  })
})

describe('templates de e-mail de auth — sem webfont, sem CSS externo (AET-02)', () => {
  it.each(FILES)('%s não declara <style>, <link>, @font-face nem <script>', (name) => {
    // Fora do comentário: o comentário de documentação CITA essas formas em prosa, de propósito,
    // para explicar a restrição — um guarda que varresse o arquivo bruto reprovaria a própria
    // explicação do defeito que existe para evitar (a mesma armadilha que já custou o
    // `supabase start` e `authSenderDomain.test.ts`, registrada no CLAUDE.md raiz).
    const body = stripComment(RAW[name]).toLowerCase()
    expect(body).not.toContain('<style')
    expect(body).not.toContain('<link')
    expect(body).not.toContain('@font-face')
    expect(body).not.toContain('<script')
  })
})

describe('templates de e-mail de auth — paleta compartilhada com layout.ts (AET-03, AET-04)', () => {
  const layoutSrc = readFileSync(LAYOUT_TS_PATH, 'utf8')
  const paletteMatches = [...layoutSrc.matchAll(/'#([0-9A-Fa-f]{6})'/g)]
  const ALLOWED_HEX = new Set(paletteMatches.map((m) => m[1].toUpperCase()))

  it('achou a paleta ESTRELINHA em layout.ts', () => {
    // Âncora: os 10 tokens de ESTRELINHA. Caminho errado para o módulo leria zero e o conjunto
    // ficaria vazio, e toda cor de template passaria a reprovar — o oposto da falha silenciosa que
    // este teste existe para evitar, então checa-se aqui em vez de deixar o próximo teste confuso.
    expect(ALLOWED_HEX.size).toBeGreaterThanOrEqual(10)
    expect(ALLOWED_HEX.has('B8945F')).toBe(true) // accent
    expect(ALLOWED_HEX.has('FAF8F4')).toBe(true) // ground
  })

  it.each(FILES)('%s só usa hex da paleta de layout.ts', (name) => {
    const body = stripComment(RAW[name])
    // 6 dígitos exatos, sem deixar um alpha de 8 dígitos (#B8945FF0) casar pelo prefixo.
    const hexes = [...body.matchAll(/#([0-9A-Fa-f]{6})(?![0-9A-Fa-f])/g)].map((m) => m[1].toUpperCase())
    expect(hexes.length, `${name} não tem cor nenhuma — a régua não varreu nada`).toBeGreaterThan(0)
    for (const hex of hexes) {
      expect(ALLOWED_HEX.has(hex), `${name} usa #${hex}, fora da paleta de layout.ts`).toBe(true)
    }
  })

  it.each(FILES)('%s nunca usa #B8945F (accent) como color: — só como fio/moldura', (name) => {
    const body = stripComment(RAW[name]).toLowerCase()
    expect(body).not.toMatch(/color:\s*#b8945f/)
  })
})

describe('templates de e-mail de auth — o casco é byte-idêntico nos 3 (AET-05)', () => {
  const masked: Record<FileName, ReturnType<typeof maskVariableRegions>> = Object.fromEntries(
    FILES.map((name) => [name, maskVariableRegions(fromOuterTable(stripComment(RAW[name])))]),
  ) as Record<FileName, ReturnType<typeof maskVariableRegions>>

  it('título, parágrafo de abertura e nota final variam por template', () => {
    // Âncora inversa: se a extração falhasse em silêncio e devolvesse '' para os 3, a comparação de
    // igualdade do teste seguinte passaria por engano.
    for (const key of ['h1', 'lead', 'note'] as const) {
      const texts = FILES.map((f) => masked[f][key])
      expect(texts.every((t) => t.trim().length > 0), `algum ${key} veio vazio`).toBe(true)
      expect(new Set(texts).size, `os 3 valores de ${key} deveriam ser distintos`).toBe(texts.length)
    }
  })

  it('o resto do casco (faixa, wordmark, fio, card, caixa do código, rodapé) é idêntico nos 3', () => {
    const [a, b, c] = FILES.map((f) => masked[f].masked)
    expect(b, 'confirmation.html diverge de magic_link.html fora das 3 regiões variáveis').toBe(a)
    expect(c, 'recovery.html diverge de magic_link.html fora das 3 regiões variáveis').toBe(a)
  })
})

describe('templates de e-mail de auth — preheader oculto (AET-06)', () => {
  it.each(FILES)('%s tem preheader display:none, sem <style>, com texto não vazio', (name) => {
    const stripped = stripComment(RAW[name])
    const before = stripped.slice(0, stripped.indexOf('<table'))
    expect(before, `${name} não tem nada antes da <table> externa — sem preheader`).not.toBe('')
    expect(before).toContain('display:none')
    expect(before.toLowerCase()).not.toContain('<style')
  })

  it.each(FILES)('%s: o preheader repete o parágrafo de abertura, sem frase nova', (name) => {
    const stripped = stripComment(RAW[name])
    const before = stripped.slice(0, stripped.indexOf('<table'))
    const lead = stripped.match(LEAD)
    expect(lead, `${name}: não achei o parágrafo de abertura`).toBeTruthy()
    expect(before, `${name}: preheader não contém o texto do parágrafo de abertura`).toContain(lead![2])
  })

  it('os preheaders são distintos entre os 3 templates', () => {
    const texts = FILES.map((name) => {
      const stripped = stripComment(RAW[name])
      return stripped.slice(0, stripped.indexOf('<table'))
    })
    expect(new Set(texts).size).toBe(FILES.length)
  })
})
