// Feature 50 — **o rascunho tem campos que o banco não tem, e a tradução é um lugar só.**
//
// `DraftItem` carrega dois campos de tela: a `key` (feature 24) e o `product_slug` (esta feature).
// Nenhum dos dois existe em `home_section_items`, e `toNewItems` é a única linha do repositório que
// os remove.
//
// O modo de falha que este guarda existe para impedir é o do `AD-012`, e ele é silencioso nos três
// instrumentos que costumam pegar defeito: `NewHomeSectionItem` tem as sete colunas **opcionais**,
// então um campo a mais no objeto não é erro de tipo; o `pnpm build` não checa tipo; e o teste de
// componente do editor mocka o client. Quem responde é o PostgREST, em produção, com `PGRST204` —
// e a dona perde a curadoria inteira sem uma palavra de explicação na tela.
//
// Por isso a régua é **igualdade de chaves**, e não "contém as sete": uma régua de presença aprova
// o oitavo campo, que é exatamente o que se quer recusar.

import { describe, expect, it } from 'vitest'
import { emptyDraftItem, toDraftItems, toNewItems, type DraftItem } from '../sectionDraft'

/**
 * As sete colunas de `home_section_items` que a curadoria grava.
 *
 * **Escritas literalmente, e não derivadas de `toNewItems`.** A régua nunca pode ser o objeto
 * medido — é a lição da âncora de escopo do `brandScan`. Uma lista montada a partir da própria
 * função concordaria com ela para sempre, inclusive quando ela estivesse errada.
 */
const COLUNAS_GRAVADAS = [
  'alt',
  'category_id',
  'href',
  'image_mobile_url',
  'image_url',
  'label_snapshot',
  'product_id',
] as const

/** Os dois campos que existem só na tela. */
const CAMPOS_DE_TELA = ['key', 'product_slug'] as const

const item = (over: Partial<DraftItem> = {}): DraftItem => ({
  ...emptyDraftItem(),
  ...over,
})

describe('âncora — a régua mede sete colunas, e o rascunho tem exatamente nove campos', () => {
  it('a lista de colunas gravadas tem sete entradas', () => {
    // Sem esta âncora, apagar uma entrada da lista acima faria a asserção principal comparar duas
    // listas curtas e passar — aprovando uma coluna que deixou de ser gravada.
    expect(COLUNAS_GRAVADAS).toHaveLength(7)
  })

  it('`DraftItem` é as sete colunas MAIS os dois campos de tela — e nada além', () => {
    // Segunda âncora, no objeto medido: um campo novo em `DraftItem` derruba este caso e obriga
    // quem o acrescentou a decidir se ele é coluna ou tela. É a decisão que, esquecida, produz o
    // `PGRST204`.
    expect(Object.keys(emptyDraftItem()).sort()).toEqual(
      [...COLUNAS_GRAVADAS, ...CAMPOS_DE_TELA].sort(),
    )
  })
})

describe('toNewItems — devolve EXATAMENTE as sete colunas', () => {
  it('as chaves de um item gravável são as sete colunas', () => {
    const [saida] = toNewItems([item({ product_id: 'p1', product_slug: 'pingente-gota' })])
    expect(Object.keys(saida).sort()).toEqual([...COLUNAS_GRAVADAS])
  })

  it('`key` não sobrevive à tradução', () => {
    const [saida] = toNewItems([item()])
    expect(saida).not.toHaveProperty('key')
  })

  it('`product_slug` não sobrevive à tradução — é ele que produziria o `PGRST204`', () => {
    const [saida] = toNewItems([item({ product_id: 'p1', product_slug: 'pingente-gota' })])
    expect(saida).not.toHaveProperty('product_slug')
  })

  it('o VALOR das sete colunas passa intacto — remover campo de tela não pode limpar dado', () => {
    const [saida] = toNewItems([
      item({
        product_id: 'p1',
        product_slug: 'pingente-gota',
        category_id: null,
        href: null,
        image_url: 'https://cdn/arte.webp',
        image_mobile_url: 'https://cdn/arte-celular.webp',
        alt: 'Pingente com leite materno',
        label_snapshot: 'Pingente Gota',
      }),
    ])

    expect(saida).toEqual({
      category_id: null,
      product_id: 'p1',
      href: null,
      image_url: 'https://cdn/arte.webp',
      image_mobile_url: 'https://cdn/arte-celular.webp',
      alt: 'Pingente com leite materno',
      label_snapshot: 'Pingente Gota',
    })
  })

  it('a ordem da lista é preservada — é ela que vira a `position` gravada', () => {
    const saida = toNewItems([
      item({ product_id: 'p2' }),
      item({ product_id: 'p1' }),
      item({ product_id: 'p3' }),
    ])
    expect(saida.map(i => i.product_id)).toEqual(['p2', 'p1', 'p3'])
  })

  it('lista vazia devolve lista vazia — e não explode', () => {
    expect(toNewItems([])).toEqual([])
  })
})

describe('SENSOR — um oitavo campo REPROVA na mesma régua', () => {
  it('um campo de tela novo, esquecido em `toNewItems`, é acusado', () => {
    // O defeito simulado é literalmente o que aconteceria: alguém acrescenta `product_name` ao
    // rascunho para a lista mostrar o nome, e não o tira da tradução.
    const comOitavo = {
      ...emptyDraftItem(),
      product_id: 'p1',
      product_name: 'Pingente Gota',
    } as unknown as DraftItem

    const [saida] = toNewItems([comOitavo])

    // A régua vê o campo a mais…
    expect(Object.keys(saida).sort()).not.toEqual([...COLUNAS_GRAVADAS])
    // …e o nomeia, para o conserto não virar adivinhação.
    expect(Object.keys(saida)).toContain('product_name')
  })

  it('a régua de igualdade recusa também a FALTA de uma coluna', () => {
    // O sentido inverso: uma tradução que passasse a omitir `label_snapshot` apagaria o nome
    // congelado do destino apagado, e uma régua de "contém" aprovaria isso.
    const semColuna = { alt: null, category_id: null, href: null, image_mobile_url: null, image_url: null, product_id: null }
    expect(Object.keys(semColuna).sort()).not.toEqual([...COLUNAS_GRAVADAS])
  })
})

describe('toDraftItems — o slug é semeado a partir do item salvo', () => {
  it('item com produto traz o slug do embed para o rascunho', () => {
    const [rascunho] = toDraftItems([
      {
        id: 'i1',
        section_id: 's1',
        position: 1,
        category_id: null,
        product_id: 'p1',
        product_slug: 'pingente-gota',
        href: null,
        image_url: null,
        image_mobile_url: null,
        alt: null,
        label_snapshot: 'Pingente Gota',
      },
    ])

    expect(rascunho.product_slug).toBe('pingente-gota')
    expect(rascunho.product_id).toBe('p1')
  })

  it('item sem slug (produto despublicado ou apagado) semeia `null`, nunca `undefined`', () => {
    // `undefined` sobreviveria ao `JSON.stringify` de `itemsChanged` de um jeito diferente de
    // `null`, e a tela passaria a acusar alteração que ninguém fez.
    const [rascunho] = toDraftItems([
      {
        id: 'i1',
        section_id: 's1',
        position: 1,
        category_id: null,
        product_id: 'p1',
        href: null,
        image_url: null,
        image_mobile_url: null,
        alt: null,
        label_snapshot: 'Pingente Gota',
      },
    ])

    expect(rascunho.product_slug).toBeNull()
  })

  it('o rascunho semeado volta às sete colunas na tradução', () => {
    // A volta completa: ler do banco, semear e gravar de novo não pode acrescentar coluna nenhuma.
    const saida = toNewItems(
      toDraftItems([
        {
          id: 'i1',
          section_id: 's1',
          position: 1,
          category_id: null,
          product_id: 'p1',
          product_slug: 'pingente-gota',
          href: null,
          image_url: null,
          image_mobile_url: null,
          alt: null,
          label_snapshot: 'Pingente Gota',
        },
      ]),
    )

    expect(Object.keys(saida[0]).sort()).toEqual([...COLUNAS_GRAVADAS])
  })
})

describe('itemsChanged — o campo de tela não conta como alteração', () => {
  it('só o `product_slug` diferente NÃO acusa mudança', async () => {
    // O slug vem do embed e pode mudar sozinho (a dona renomeou o produto noutra tela). Acusar
    // alteração por causa dele acenderia o selo "Alterações não salvas" sem ninguém ter digitado
    // nada — e, pior, faria `handleSave` reescrever a curadoria inteira à toa.
    const { itemsChanged } = await import('../sectionDraft')

    const section = {
      id: 's1',
      type: 'product_carousel' as const,
      position: 1,
      active: true,
      config: {},
      items: [
        {
          id: 'i1',
          section_id: 's1',
          position: 1,
          category_id: null,
          product_id: 'p1',
          product_slug: 'pingente-gota',
          href: null,
          image_url: null,
          image_mobile_url: null,
          alt: null,
          label_snapshot: 'Pingente Gota',
        },
      ],
    }

    const rascunho = toDraftItems(section.items).map(i => ({ ...i, product_slug: 'outro-slug' }))
    expect(itemsChanged(section, rascunho)).toBe(false)

    // E o par: mudar uma coluna de verdade continua acusando, senão a asserção acima seria
    // verdadeira num mundo em que `itemsChanged` nunca acusa nada.
    const comColunaMudada = toDraftItems(section.items).map(i => ({ ...i, alt: 'outra descrição' }))
    expect(itemsChanged(section, comColunaMudada)).toBe(true)
  })
})
