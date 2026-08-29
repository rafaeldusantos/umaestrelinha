import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { SITEMAP_MAX_URLS, locValue, renderSitemapXml } from '../render.ts'

/**
 * `SMP-01`, `SMP-09`, `SMP-10`, `SMP-13` — a serialização.
 *
 * **O documento é conferido por um parser de XML de verdade, não por regex.** Regex sobre XML
 * aceita documento malformado com a mesma facilidade com que aceita um correto — e o defeito que
 * este arquivo existe para pegar (um `&` cru numa `<loc>`) é exatamente o que quebra o parser e
 * passa por qualquer `toContain`.
 */

/**
 * `jsdom` com `contentType: 'text/xml'` **lança** em documento malformado (medido: um `&` cru numa
 * `<loc>` vira `DOMException: unclosed tag`). É essa propriedade que faz dele uma régua — um parser
 * tolerante aceitaria o defeito e o teste passaria.
 */
const parse = (xml: string) => new JSDOM(xml, { contentType: 'text/xml' }).window.document

const url = (loc: string, lastmod: string | null = null) => ({ loc, lastmod })

describe('renderSitemapXml — o documento (SMP-01)', () => {
  const xml = renderSitemapXml([
    url('https://umaestrelinha.com.br'),
    url('https://umaestrelinha.com.br/produtos/colar', '2026-08-16T14:58:34.849+00:00'),
  ])

  it('abre com a declaração XML — não com `<!doctype html>`', () => {
    // É o defeito de hoje: `/sitemap.xml` devolve 200 com o shell da SPA. Se o corpo abrir em
    // `<!doctype`, nada mais importa.
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
  })

  it('declara o namespace do protocolo sitemaps.org', () => {
    const doc = parse(xml)
    expect(doc.documentElement.tagName).toBe('urlset')
    expect(doc.documentElement.getAttribute('xmlns')).toBe(
      'http://www.sitemaps.org/schemas/sitemap/0.9',
    )
  })

  it('uma `<url>` por entrada, com `<loc>` dentro', () => {
    const doc = parse(xml)
    const urls = [...doc.querySelectorAll('url')]
    expect(urls).toHaveLength(2)
    expect(urls[0].querySelector('loc').textContent).toBe('https://umaestrelinha.com.br')
  })

  it('`lastmod` presente quando há data, ausente quando não há (SMP-08)', () => {
    const doc = parse(xml)
    const urls = [...doc.querySelectorAll('url')]
    expect(urls[0].querySelector('lastmod')).toBeNull()
    expect(urls[1].querySelector('lastmod').textContent).toBe('2026-08-16T14:58:34.849+00:00')
  })
})

describe('renderSitemapXml — o que NÃO é emitido (SMP-09)', () => {
  const xml = renderSitemapXml([url('https://x.com.br/a', '2026-08-16T00:00:00+00:00')])

  it('não emite `<changefreq>` nem `<priority>` — o Google ignora as duas', () => {
    const doc = parse(xml)
    expect(doc.querySelector('changefreq')).toBeNull()
    expect(doc.querySelector('priority')).toBeNull()
  })
})

describe('locValue — percent-encode ANTES do escape (SMP-10)', () => {
  /**
   * Medido em 2026-08-29: os 680 slugs do catálogo são `[a-z0-9-]` puro, então a codificação é
   * no-op em produção. O slug abaixo é **sintético** de propósito — sem ele a regra de escape
   * nasceria escrita e nunca exercitada, que é o pior estado possível para uma regra de escape.
   */
  const sintetico = 'https://x.com.br/produtos/colar-de-mãe-&-filha'

  it('o `&` do caminho é percent-encoded e o documento continua bem-formado', () => {
    const xml = renderSitemapXml([url(sintetico)])
    const doc = parse(xml)

    // Um `&` cru aqui faria o `parse` LANÇAR — que é a única forma de este defeito aparecer.
    expect(doc.querySelector('loc').textContent).toBe(
      'https://x.com.br/produtos/colar-de-m%C3%A3e-&-filha',
    )
  })

  it('a ORDEM é a certa: nada de `%26amp%3B` no resultado', () => {
    // Escape antes da codificação transformaria `&` em `&amp;` e depois em `%26amp%3B` — uma URL
    // que não existe, num documento perfeitamente válido. Nenhum parser acusaria.
    expect(locValue(sintetico)).not.toContain('%26amp%3B')
    expect(locValue(sintetico)).toContain('%C3%A3')
  })

  it('acento vira percent-encoding, e o separador de caminho é preservado', () => {
    expect(locValue('https://x.com.br/joias/ação')).toBe('https://x.com.br/joias/a%C3%A7%C3%A3o')
  })
})

describe('renderSitemapXml — as recusas', () => {
  it('lança em lista vazia — `<urlset>` sem filho diz que a loja não tem página', () => {
    expect(() => renderSitemapXml([])).toThrow(/vazio/)
  })

  it('lança acima do teto de 50.000 URLs por arquivo (SMP-13)', () => {
    // O teto é do protocolo. Passar dele exige `<sitemapindex>`, que é decisão de arquitetura —
    // e a serialização não é o lugar de tomá-la em silêncio.
    const muitas = Array.from({ length: SITEMAP_MAX_URLS + 1 }, (_, i) => url(`https://x.com.br/${i}`))
    expect(() => renderSitemapXml(muitas)).toThrow(/sitemapindex/)
  })

  it('o teto declarado é o do protocolo, e não um número escolhido aqui', () => {
    expect(SITEMAP_MAX_URLS).toBe(50_000)
  })
})
