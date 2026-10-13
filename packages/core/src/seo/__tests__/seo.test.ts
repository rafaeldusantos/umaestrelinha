import { describe, expect, it } from 'vitest'
import { NON_INDEXABLE_PATHS, SITEMAP_STATIC_PATHS } from '../../routes/index.ts'
import { brandedTitle, STORE_BRAND } from '../brand.ts'
import { DESCRIPTION_MAX, descriptionFromHtml, summarize } from '../text.ts'
import {
  STATIC_PAGE_META_PATHS,
  STORE_DESCRIPTION_FLOOR,
  categoryPageMeta,
  homePageMeta,
  notFoundPageMeta,
  productPageMeta,
  searchPageMeta,
  staticPageMeta,
} from '../pages.ts'

describe('brandedTitle — o sufixo da marca só quando ela ainda não está (A2)', () => {
  it('título sem marca ganha " | Uma Estrelinha"', () => {
    expect(brandedTitle('Colar de leite materno')).toBe('Colar de leite materno | Uma Estrelinha')
  })

  it('título que já termina com a marca sai intacto — nunca marca dupla', () => {
    expect(brandedTitle('Colar vovó com neto | Uma Estrelinha')).toBe(
      'Colar vovó com neto | Uma Estrelinha',
    )
  })

  it('a marca no meio do título também conta', () => {
    expect(brandedTitle('Sobre a Uma Estrelinha')).toBe('Sobre a Uma Estrelinha')
  })

  it('a abreviação "| UE" da curadoria é a marca — sai intacta', () => {
    expect(brandedTitle('Pingente Coração com Coto Umbilical | UE')).toBe(
      'Pingente Coração com Coto Umbilical | UE',
    )
  })

  it('"UE" sem a barra, ou no meio, não é a abreviação', () => {
    expect(brandedTitle('Pingente UE dourado')).toBe('Pingente UE dourado | Uma Estrelinha')
  })

  it('título longo NÃO é cortado (A5)', () => {
    const longo = 'Joia afetiva '.repeat(10).trim()
    expect(brandedTitle(longo)).toBe(`${longo} | Uma Estrelinha`)
  })

  it('vazio ou só espaço vira a marca, nunca string vazia', () => {
    expect(brandedTitle('   ')).toBe(STORE_BRAND)
    expect(brandedTitle(null)).toBe(STORE_BRAND)
  })
})

describe('summarize — corte no limite de palavra (edge cases da spec)', () => {
  it('exatamente 160 caracteres sai inteiro, sem reticência', () => {
    const t = 'a'.repeat(158) + ' b'
    expect(t).toHaveLength(160)
    expect(summarize(t)).toBe(t)
  })

  it('161 caracteres corta na última palavra inteira e acrescenta "…", sem passar de 160', () => {
    const palavras = 'leite materno '.repeat(20)
    const t = palavras.slice(0, 161)
    const r = summarize(t)
    expect(r.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(r.endsWith('…')).toBe(true)
    // nenhuma palavra cortada ao meio: o que vem antes da reticência é palavra inteira do texto
    const semReticencia = r.slice(0, -1)
    expect(t.startsWith(semReticencia)).toBe(true)
    expect(['leite', 'materno']).toContain(semReticencia.split(' ').at(-1))
  })

  it('a palavra que termina exatamente na borda da janela é mantida', () => {
    // 159 = janela; o caractere 159 é espaço ⇒ a palavra antes dele coube inteira
    const t = 'x'.repeat(150) + ' abcdefgh ' + 'resto'
    expect(summarize(t)).toBe('x'.repeat(150) + ' abcdefgh…')
  })

  it('uma palavra sozinha maior que 160 é cortada em 159 + "…"', () => {
    const r = summarize('a'.repeat(300))
    expect(r).toBe('a'.repeat(159) + '…')
  })
})

describe('descriptionFromHtml — a derivação de A4', () => {
  it('tira tag, decodifica entidade e remove o bloco de perguntas frequentes', () => {
    const html =
      '<h2>Colar</h2><p>Cora&ccedil;&atilde;o com <strong>leite materno</strong>.</p>' +
      '<h3>Perguntas frequentes</h3><p><strong>Quanto tempo leva?</strong><br />Até 30 dias.</p>'
    expect(descriptionFromHtml(html)).toBe('Colar Coração com leite materno.')
  })

  it('HTML vazio ou só o bloco de FAQ devolve vazio (quem chama cai no próximo degrau)', () => {
    expect(descriptionFromHtml('')).toBe('')
    expect(
      descriptionFromHtml(
        '<h3>Perguntas frequentes</h3><p><strong>Quanto tempo leva?</strong><br />Até 30 dias.</p>',
      ),
    ).toBe('')
  })
})

describe('productPageMeta (MTA-02, MTA-03, edge cases)', () => {
  const base = { name: 'Anel Afetivo 6 Corações', description: '<p>Anel feito à mão.</p>' }

  it('seo_title curado vira o título, com a marca', () => {
    expect(productPageMeta({ ...base, seo_title: 'Anel de Leite Materno' }).title).toBe(
      'Anel de Leite Materno | Uma Estrelinha',
    )
  })

  it('sem seo_title (ou só espaço), o título é o nome do produto', () => {
    expect(productPageMeta({ ...base, seo_title: null }).title).toBe(
      'Anel Afetivo 6 Corações | Uma Estrelinha',
    )
    expect(productPageMeta({ ...base, seo_title: '   ' }).title).toBe(
      'Anel Afetivo 6 Corações | Uma Estrelinha',
    )
  })

  it('seo_description curada passa ÍNTEGRA, mesmo acima de 160 (A5)', () => {
    const longa = 'Descrição curada pela dona. '.repeat(10).trim()
    expect(productPageMeta({ ...base, seo_description: longa }).description).toBe(longa)
  })

  it('sem seo_description, a descrição é derivada do HTML do produto', () => {
    expect(productPageMeta({ ...base, seo_description: ' ' }).description).toBe(
      'Anel feito à mão.',
    )
  })

  it('sem nada aproveitável, cai na descrição da loja; sem ela, no piso', () => {
    const vazio = { name: 'X', description: '' }
    expect(productPageMeta(vazio, 'Descrição da loja').description).toBe('Descrição da loja')
    expect(productPageMeta(vazio).description).toBe(STORE_DESCRIPTION_FLOOR)
  })

  it('produto é indexável', () => {
    expect(productPageMeta(base).indexable).toBe(true)
  })
})

describe('categoryPageMeta (MTA-04, A7)', () => {
  it('título é "{nome} | Uma Estrelinha"', () => {
    expect(categoryPageMeta({ name: 'Leite Materno' }).title).toBe('Leite Materno | Uma Estrelinha')
  })

  it('sem descrição, a frase derivada do nome', () => {
    expect(categoryPageMeta({ name: 'Leite Materno', description: null }).description).toBe(
      'Leite Materno: joias afetivas feitas à mão em resina por Adri Muniz, em Porto Alegre.',
    )
  })

  it('com descrição, ela vira texto', () => {
    expect(
      categoryPageMeta({ name: 'Cinzas', description: '<p>Joias com <b>cinzas</b>.</p>' })
        .description,
    ).toBe('Joias com cinzas.')
  })
})

describe('notFoundPageMeta e searchPageMeta', () => {
  it('404: "Página não encontrada | Uma Estrelinha", noindex (MTA-05)', () => {
    expect(notFoundPageMeta()).toMatchObject({
      title: 'Página não encontrada | Uma Estrelinha',
      indexable: false,
    })
  })

  it('busca com termo: "Busca: {termo} | Uma Estrelinha"; sem termo, "Busca | Uma Estrelinha"; sempre noindex', () => {
    expect(searchPageMeta('colar')).toMatchObject({
      title: 'Busca: colar | Uma Estrelinha',
      indexable: false,
    })
    expect(searchPageMeta('  ')).toMatchObject({ title: 'Busca | Uma Estrelinha', indexable: false })
  })
})

describe('homePageMeta (MTA-09, A6)', () => {
  it('usa título e descrição da configuração da loja, sem sufixo', () => {
    expect(homePageMeta({ title: 'Título da dona', description: 'Descrição da dona' })).toEqual({
      title: 'Título da dona',
      description: 'Descrição da dona',
      indexable: true,
    })
  })

  it('configuração ausente ou vazia cai no piso', () => {
    expect(homePageMeta({ title: ' ', description: '' })).toEqual(staticPageMeta('/'))
    expect(homePageMeta(null)).toEqual(staticPageMeta('/'))
  })
})

describe('a tabela das rotas fixas (MTA-01, MTA-10 b)', () => {
  const classificadas = [...SITEMAP_STATIC_PATHS, ...NON_INDEXABLE_PATHS.map(r => r.path)]

  it('âncora: a tabela e as duas listas não estão vazias', () => {
    expect(STATIC_PAGE_META_PATHS.length).toBe(16)
    expect(classificadas.length).toBe(16)
  })

  it('toda rota de SITEMAP_STATIC_PATHS ∪ NON_INDEXABLE_PATHS tem metadado', () => {
    expect(classificadas.filter(p => !STATIC_PAGE_META_PATHS.includes(p))).toEqual([])
  })

  it('nenhuma entrada da tabela fica sem classificação (o outro sentido)', () => {
    expect(STATIC_PAGE_META_PATHS.filter(p => !classificadas.includes(p))).toEqual([])
  })

  it('os 16 títulos são distintos entre si', () => {
    const titulos = STATIC_PAGE_META_PATHS.map(p => staticPageMeta(p).title)
    expect(new Set(titulos).size).toBe(titulos.length)
  })

  it('a indexabilidade é a de NON_INDEXABLE_PATHS: as nove são noindex, as sete do sitemap não', () => {
    for (const p of SITEMAP_STATIC_PATHS) expect(staticPageMeta(p).indexable).toBe(true)
    for (const { path } of NON_INDEXABLE_PATHS) expect(staticPageMeta(path).indexable).toBe(false)
  })

  it('títulos exatos que a spec nomeia', () => {
    expect(staticPageMeta('/checkout').title).toBe('Finalizar compra | Uma Estrelinha')
    expect(staticPageMeta('/sobre').title).toBe('Sobre a Uma Estrelinha')
    expect(staticPageMeta('/conta/dados').title).toBe('Meus dados | Uma Estrelinha')
  })

  it('rota desconhecida LANÇA, em vez de cair num título genérico', () => {
    expect(() => staticPageMeta('/nao-existe')).toThrow(/sem metadado/)
  })
})
