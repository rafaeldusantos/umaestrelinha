import { describe, expect, it } from 'vitest'
import { NON_INDEXABLE_PATHS, SITEMAP_STATIC_PATHS } from '../../routes/index.ts'
import { brandedTitle, STORE_BRAND } from '../brand.ts'
import { DESCRIPTION_MAX, descriptionFromHtml, summarize } from '../text.ts'
import {
  STATIC_PAGE_META_PATHS,
  STORE_DESCRIPTION_FLOOR,
  categoryPageMeta,
  faqQuestionPageMeta,
  homePageMeta,
  notFoundPageMeta,
  productPageMeta,
  searchPageMeta,
  staticPageMeta,
} from '../pages.ts'
import { OPTION_TITLE_BRAND_MAX, productHead } from '../variant.ts'

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

describe('faqQuestionPageMeta — o endereço próprio de uma pergunta', () => {
  it('o título é a pergunta, com a marca; a descrição é o começo da resposta', () => {
    const meta = faqQuestionPageMeta({
      question: 'Quanto de cinzas preciso enviar?',
      answerText: 'Um copinho de café de 50 ml.',
    })
    expect(meta).toEqual({
      title: 'Quanto de cinzas preciso enviar? | Uma Estrelinha',
      description: 'Um copinho de café de 50 ml.',
      indexable: true,
    })
  })

  it('resposta longa é cortada no limite da descrição', () => {
    const meta = faqQuestionPageMeta({ question: 'P?', answerText: 'palavra '.repeat(60) })
    expect(meta.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
  })

  it('resposta vazia cai na descrição da página de perguntas, nunca em vazio', () => {
    expect(faqQuestionPageMeta({ question: 'P?', answerText: '' }).description).toBe(
      staticPageMeta('/perguntas-frequentes').description,
    )
  })
})

describe('productHead — SVR-08..11 (o <head> da página de opção)', () => {
  const COR = 'Prata 925'
  const v = (id: number, cor: string, position: number) => ({
    id: `00000000-0000-4000-8000-00000000000${id}`,
    nuvemshop_id: 1000 + id,
    price: 99,
    is_active: true,
    position,
    option_values: { Cor: cor },
  })
  const variants = [v(1, COR, 0), v(2, 'Prata 925 Folheado a Ouro', 1), v(3, COR, 2)]
  const peca = (name: string, extra: Record<string, unknown> = {}) => ({
    id: 'p-1',
    is_active: true,
    slug: 'pingente-pata',
    name,
    description: '<p>Pingente feito à mão em resina.</p>',
    options: [{ name: 'Cor', values: [COR, 'Prata 925 Folheado a Ouro'], position: 0 }],
    option_marks: [{ option_name: 'Cor', option_value: COR, value_id: 'prata' }],
    ...extra,
  })
  const opcao = (name: string, extra: Record<string, unknown> = {}, texto = COR) => {
    const vs = texto === COR ? variants : variants.map(x => (x.option_values.Cor === COR ? { ...x, option_values: { Cor: texto } } : x))
    const p = peca(name, { options: [{ name: 'Cor', values: [texto, 'Prata 925 Folheado a Ouro'] }], option_marks: [{ option_name: 'Cor', option_value: texto, value_id: 'x' }], ...extra })
    return productHead({ product: p, variants: vs }, '1001')
  }
  // `nome — Prata 925` tem 12 caracteres a mais que o nome; com a marca, mais 17.
  const nomeDe = (total: number) => 'N'.repeat(total - ` — ${COR} | ${STORE_BRAND}`.length)

  it('SVR-08: título "{nome} — {texto}" com a marca quando o resultado tem até 60 (exatamente 60)', () => {
    const titulo = opcao(nomeDe(60)).meta.title
    expect([...titulo].length).toBe(OPTION_TITLE_BRAND_MAX)
    expect(OPTION_TITLE_BRAND_MAX).toBe(60)
    expect(titulo).toBe(`${nomeDe(60)} — ${COR} | ${STORE_BRAND}`)
  })

  it('SVR-08: com 61 caracteres com a marca, sai SEM a marca — e nunca cortado', () => {
    const nome = nomeDe(61)
    expect(opcao(nome).meta.title).toBe(`${nome} — ${COR}`)
  })

  it('SVR-08: título longo nunca é cortado', () => {
    const nome = 'Pingente Afetivo Pata com Cinzas de Cremação e Leite Materno em Resina'
    expect(opcao(nome).meta.title).toBe(`${nome} — ${COR}`)
  })

  it('SVR-08: a contagem é em code points, não em unidades UTF-16', () => {
    // 60 code points com a marca, mas 61 unidades UTF-16: o caractere astral conta UM
    const nome = `${nomeDe(60).slice(1)}𝒜`
    expect(opcao(nome).meta.title).toBe(`${nome} — ${COR} | ${STORE_BRAND}`)
  })

  it('SVR-08: espaços colapsados no nome e no texto', () => {
    expect(opcao('  Anel   Afetivo  ', {}, ' Prata   925 ').meta.title).toBe(`Anel Afetivo — Prata 925 | ${STORE_BRAND}`)
  })

  it('SVR-08: o NOME, e não o seo_title, compõe o título de opção', () => {
    expect(opcao('Anel', { seo_title: 'Anel de leite | UE' }).meta.title).toBe(`Anel — ${COR} | ${STORE_BRAND}`)
  })

  it('SVR-08: marca nunca em dobro — nome que já a traz (forma longa ou "| UE") não ganha outra', () => {
    // Medido em 2026-10-19 no banco local: zero de 702 nomes trazem a marca. O caso trava o pressuposto.
    expect(opcao('Anel Uma Estrelinha').meta.title).toBe(`Anel Uma Estrelinha — ${COR}`)
    expect(opcao('Anel | UE').meta.title).toBe(`Anel | UE — ${COR}`)
    for (const t of [opcao('Anel Uma Estrelinha').meta.title, opcao('Anel | UE').meta.title]) {
      expect(t.match(/uma estrelinha|\|\s*UE\b/gi)).toHaveLength(1)
    }
  })

  it('SVR-09: descrição = summarize("{texto}. {descrição da peça}"), começa pelo texto, ≤ 160', () => {
    const d = opcao('Anel').meta.description
    expect(d).toBe(`${COR}. Pingente feito à mão em resina.`)
    const longa = opcao('Anel', { description: `<p>${'palavra '.repeat(60)}</p>` }).meta.description
    expect(longa.startsWith(`${COR}. `)).toBe(true)
    expect(longa.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(longa.endsWith('…')).toBe(true)
  })

  it('SVR-09: a descrição da peça é a de productPageMeta — curada passa a valer, e corta em 160', () => {
    const curada = 'Descrição curada pela dona. '.repeat(10).trim()
    const d = opcao('Anel', { seo_description: curada }).meta.description
    expect(d).toBe(summarize(`${COR}. ${curada}`))
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
  })

  it('SVR-09: nunca vazia — sem descrição nenhuma cai na da loja, e no piso', () => {
    expect(opcao('Anel', { description: '' }).meta.description).toBe(`${COR}. ${STORE_DESCRIPTION_FLOOR}`.length > 160
      ? summarize(`${COR}. ${STORE_DESCRIPTION_FLOOR}`)
      : `${COR}. ${STORE_DESCRIPTION_FLOOR}`)
    const comLoja = productHead(
      { product: peca('Anel', { description: '' }), variants },
      '1001',
      'Descrição da loja',
    )
    expect(comLoja.meta.description).toBe(`${COR}. Descrição da loja`)
    expect(comLoja.meta.description).not.toBe('')
  })

  it('SVR-11: opção ⇒ canônica com o ?variant= da REPRESENTANTE, mesmo abrindo em outra do mesmo texto', () => {
    const h = productHead({ product: peca('Anel'), variants }, '1003')
    expect(h.page.kind).toBe('option')
    expect(h.canonicalPath).toBe('/produtos/pingente-pata?variant=1001')
    expect(h.meta.indexable).toBe(true)
  })

  it.each([
    ['sem ?variant=', null],
    ['?variant= de texto sem marcação', '1002'],
    ['?variant= inválido', 'xyz'],
  ])('SVR-10/11: %s ⇒ productPageMeta idêntico e canônica sem query', (_n, param) => {
    const p = peca('Anel')
    const h = productHead({ product: p, variants }, param, 'Descrição da loja')
    expect(h.meta).toEqual(productPageMeta(p, 'Descrição da loja'))
    expect(h.canonicalPath).toBe('/produtos/pingente-pata')
    expect(h.page.kind).toBe('product')
  })
})
