import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { EMAIL_BRAND, brandHeader } from '../render/layout.ts'

/**
 * Feature 60 — a marca no cabeçalho dos e-mails.
 *
 * `brandHeader` é o DONO da tag (`AD-045`): o motor transacional a chama, e os três templates de
 * auth carregam uma cópia conferida contra ela (T06). Os valores esperados aqui saem da spec
 * (`LOGO-01`…`LOGO-06`), escritos por extenso — derivá-los de `EMAIL_BRAND` provaria que a função
 * é igual a si mesma.
 */

const ORIGEM = 'https://loja.exemplo.invalid'
const SRC = 'https://loja.exemplo.invalid/email/assinatura-v1@3x.png'

/** O cabeçalho de hoje, letra por letra (`LOGO-03`): é o estado de falha, e tem de sair idêntico. */
const WORDMARK_DE_HOJE =
  `<span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;line-height:1.2;color:#F7F3EC;">UMA ESTRELINHA</span>`

const contar = (texto: string, trecho: string) => texto.split(trecho).length - 1

function styleDoImg(html: string): string {
  const style = html.match(/<img\b[^>]*\bstyle="([^"]*)"/)
  // Recorte que falha LANÇA: um `''` aqui faria toda asserção de "contém" abaixo reprovar com uma
  // mensagem que manda procurar no lugar errado.
  if (!style) throw new Error('não achei o style do <img>')
  return style[1]
}

describe('LOGO-01 — com a origem da loja, a faixa traz a imagem da marca', () => {
  const html = brandHeader(ORIGEM)

  it('exatamente um <img>', () => {
    expect(contar(html, '<img')).toBe(1)
  })

  it('src absoluto, no endereço versionado', () => {
    expect(html).toContain(`src="${SRC}"`)
  })

  it('dimensões declaradas 202 × 44 e o texto alternativo', () => {
    expect(html).toContain('width="202"')
    expect(html).toContain('height="44"')
    expect(html).toContain('alt="Uma Estrelinha"')
  })

  it.each(['display:block', 'border:0', 'margin:0 auto'])('o style declara %s', (declaracao) => {
    expect(styleDoImg(html)).toContain(declaracao)
  })

  it('o texto UMA ESTRELINHA deixa de ser o conteúdo do cabeçalho', () => {
    expect(html).not.toContain('UMA ESTRELINHA')
  })

  it('EMAIL_BRAND descreve o mesmo arquivo e a mesma caixa', () => {
    expect(EMAIL_BRAND.path).toBe('/email/assinatura-v1@3x.png')
    expect(EMAIL_BRAND.width).toBe(202)
    expect(EMAIL_BRAND.height).toBe(44)
    expect(EMAIL_BRAND.alt).toBe('Uma Estrelinha')
  })
})

describe('LOGO-02 — com a imagem bloqueada, o alt herda a cara do wordmark de hoje', () => {
  it.each([
    "font-family:Georgia,'Times New Roman',serif",
    'font-size:17px',
    'letter-spacing:0.14em',
    'text-transform:uppercase',
    'color:#F7F3EC',
  ])('o style do <img> declara %s', (declaracao) => {
    expect(styleDoImg(brandHeader(ORIGEM))).toContain(declaracao)
  })

  it('o alt cabe na caixa: 17px, e nunca os 26px do wordmark (medido: 286px numa caixa de 202)', () => {
    // SPEC_DEVIATION de LOGO-02, medida na prova em navegador (T07): a 26px o texto alternativo
    // quebra em duas linhas e a caixa quebrada fica MAIS alta que a faixa de hoje.
    expect(styleDoImg(brandHeader(ORIGEM))).not.toContain('font-size:26px')
  })

  it('a caixa respeita os 44px declarados — nada no style anula o atributo height', () => {
    // `height:auto` no style vence `height="44"`: com a imagem quebrada, a caixa crescia até
    // caber o texto alternativo. Medido no Chromium na T07.
    const style = styleDoImg(brandHeader(ORIGEM))
    expect(style).not.toMatch(/(^|;)height:/)
    expect(style).not.toContain('max-width')
  })
})

describe('LOGO-03 — sem origem, o cabeçalho de hoje, sem imagem quebrada', () => {
  it.each([[''], ['   '], [null], [undefined]])('origem %j → o <span> de hoje, inteiro', (origem) => {
    const html = brandHeader(origem)
    expect(html).toBe(WORDMARK_DE_HOJE)
    expect(html).not.toContain('<img')
  })
})

describe('LOGO-04 — a barra final da origem não muda o endereço', () => {
  it.each([`${ORIGEM}/`, `${ORIGEM}//`])('%s → o mesmo src', (origem) => {
    expect(brandHeader(origem)).toBe(brandHeader(ORIGEM))
    expect(brandHeader(origem)).toContain(`src="${SRC}"`)
  })
})

describe('LOGO-05 — nada de SVG', () => {
  it.each([[ORIGEM], ['']])('origem %j → sem <svg', (origem) => {
    expect(brandHeader(origem).toLowerCase()).not.toContain('<svg')
  })
})

describe('LOGO-06 — o endereço não carrega dado nem vira identificador', () => {
  it('src sem query string nem fragmento', () => {
    const src = brandHeader(ORIGEM).match(/src="([^"]*)"/)![1]
    expect(src).toBe(SRC)
    expect(src).not.toMatch(/[?#]/)
  })

  it('origem com aspas e sinais de tag sai escapada no atributo', () => {
    const html = brandHeader('https://x.invalid/"><script>')
    expect(html).not.toContain('"><script>')
    expect(html).toContain('&quot;&gt;&lt;script&gt;')
  })
})

// =================================================================================================
// LOGO-20 — os três templates de auth carregam a MESMA tag que o dono produz
// =================================================================================================

/**
 * Os templates de auth são HTML colado no dashboard do Supabase, e o GoTrue não chama função
 * nenhuma — então eles carregam uma CÓPIA da saída de `brandHeader('{{ .SiteURL }}')`. Esta é a
 * guarda que lê os dois e compara (regra 3 do defeito 01): a função é IMPORTADA, nunca remontada
 * à mão (`L-015`), e os templates são lidos do disco.
 */
const TEMPLATES_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../templates')
const TEMPLATES = ['magic_link.html', 'confirmation.html', 'recovery.html'] as const
const lerTemplate = (nome: string) => readFileSync(join(TEMPLATES_DIR, nome), 'utf8').replace(/\r\n/g, '\n')
const TAG_DO_AUTH = brandHeader('{{ .SiteURL }}')

/** A régua, como função: a asserção e os sensores chamam a mesma coisa. */
const copiasDaTag = (html: string) => html.split(TAG_DO_AUTH).length - 1

describe('LOGO-20 — os templates de auth copiam a tag do dono, byte a byte', () => {
  it('âncora: os três templates foram lidos, e a tag do auth aponta para {{ .SiteURL }}', () => {
    for (const nome of TEMPLATES) expect(lerTemplate(nome).length, nome).toBeGreaterThan(0)
    expect(TAG_DO_AUTH).toContain('src="{{ .SiteURL }}/email/assinatura-v1@3x.png"')
  })

  it.each(TEMPLATES)('%s contém a tag exatamente uma vez', (nome) => {
    expect(copiasDaTag(lerTemplate(nome))).toBe(1)
  })

  it('sensor — o template com o wordmark antigo reprova', () => {
    expect(copiasDaTag(`<td>${brandHeader('')}</td>`)).toBe(0)
  })

  it('sensor — o template com a URL da loja escrita por extenso reprova', () => {
    expect(copiasDaTag(`<td>${brandHeader('https://umaestrelinha.com.br')}</td>`)).toBe(0)
  })
})
