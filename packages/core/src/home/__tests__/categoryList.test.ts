import { describe, expect, it } from 'vitest'
import {
  CATEGORY_LIST_ART,
  CATEGORY_LIST_ITEM_TITLE_MAX,
  CATEGORY_LIST_MAX_ITEMS,
  CATEGORY_LIST_TITLE_MAX,
  categoryListItem,
  categoryListLabel,
  categoryListRefusal,
} from '../categoryList'
import type { ResolvedItem } from '../resolve'
import type { HomeSectionItem } from '../types'

/**
 * Feature 64 — `LCT-02`, `LCT-12`, `LCT-16`, `LCT-17`, `LCT-19`, `LCT-20`, `LCT-27`, `LCT-30`,
 * `LCT-39`.
 *
 * O vocabulário do bloco **Lista de categorias**: o rótulo embaixo do círculo, a arte que entra nele
 * e por que um rascunho não pode ser salvo. Mora aqui porque a loja e o painel fazem as três
 * perguntas, e respondidas em cada tela divergiriam sem nada quebrar.
 */

const item = (over: Partial<HomeSectionItem> = {}): HomeSectionItem => ({
  id: 'i1',
  section_id: 's1',
  position: 1,
  category_id: 'cat-leite',
  product_id: null,
  href: null,
  image_url: 'https://cdn.test/leite.png',
  image_mobile_url: null,
  alt: null,
  title: null,
  label_snapshot: 'Leite materno',
  ...over,
})

/** O que o `resolveItem` genérico devolve: `alt || nome` e `image_url || banner_url`. */
const resolvido = (over: Partial<ResolvedItem> = {}): ResolvedItem => ({
  id: 'i1',
  categoryId: 'cat-leite',
  productId: null,
  slug: 'leite-materno',
  label: 'Leite materno',
  description: 'Joias com leite materno',
  href: '/leite-materno',
  imageUrl: 'https://cdn.test/leite.png',
  imageMobileUrl: 'https://cdn.test/leite-celular.png',
  curated: true,
  ...over,
})

/** N itens válidos, na ordem — o rascunho que PASSA, para a régua ter os dois lados. */
const validos = (n: number): Partial<HomeSectionItem>[] =>
  Array.from({ length: n }, (_, i) => item({ id: `i${i + 1}`, category_id: `cat-${i + 1}` }))

// ---------------------------------------------------------------------------
// As constantes
// ---------------------------------------------------------------------------

describe('as constantes do bloco', () => {
  it('cabem 24 categorias por bloco (A-07, LCT-30)', () => {
    expect(CATEGORY_LIST_MAX_ITEMS).toBe(24)
  })

  it('o título embaixo do círculo tem até 28 caracteres (A-02, LCT-27)', () => {
    expect(CATEGORY_LIST_ITEM_TITLE_MAX).toBe(28)
  })

  it('o título da seção tem até 60 caracteres (A-08, LCT-16)', () => {
    expect(CATEGORY_LIST_TITLE_MAX).toBe(60)
  })

  it('a vaga da arte é quadrada, 800 × 800 (A-04, LCT-17)', () => {
    expect(CATEGORY_LIST_ART).toEqual({ width: 800, height: 800 })
  })
})

// ---------------------------------------------------------------------------
// categoryListLabel — LCT-02
// ---------------------------------------------------------------------------

describe('categoryListLabel — o rótulo embaixo do círculo (LCT-02)', () => {
  it('o título vence, aparado', () => {
    expect(categoryListLabel({ title: '  Leite  ', alt: 'Outro' }, 'Leite materno')).toBe('Leite')
  })

  it('título de espaços não é título: cai no `alt`', () => {
    expect(categoryListLabel({ title: '   ', alt: 'Do alt' }, 'Leite materno')).toBe('Do alt')
  })

  it('sem título e sem `alt`, é o nome da coleção', () => {
    expect(categoryListLabel({ title: null, alt: null }, 'Leite materno')).toBe('Leite materno')
  })

  it('`alt` de espaços também cai no nome', () => {
    expect(categoryListLabel({ title: '', alt: '  ' }, 'Leite materno')).toBe('Leite materno')
  })

  it('o `label_snapshot` NÃO entra no rótulo — ele é só o aviso do órfão', () => {
    const comSnapshot = { title: null, alt: null, label_snapshot: 'Nome antigo' }
    expect(categoryListLabel(comSnapshot, 'Nome novo')).toBe('Nome novo')
  })
})

// ---------------------------------------------------------------------------
// categoryListItem — LCT-02, LCT-12, LCT-39
// ---------------------------------------------------------------------------

describe('categoryListItem — o item como a Lista de categorias o desenha', () => {
  it('com título, o rótulo é o título', () => {
    expect(categoryListItem(item({ title: 'Leite' }), resolvido())!.label).toBe('Leite')
  })

  it('sem título, o rótulo é o nome que a resolução leu AO VIVO — renomear muda o rótulo (LCT-39)', () => {
    const renomeada = resolvido({ label: 'Leite materno e colostro' })
    expect(categoryListItem(item(), renomeada)!.label).toBe('Leite materno e colostro')
  })

  it('com título, renomear a coleção NÃO muda o rótulo (LCT-39)', () => {
    const renomeada = resolvido({ label: 'Leite materno e colostro' })
    expect(categoryListItem(item({ title: 'Leite' }), renomeada)!.label).toBe('Leite')
  })

  it('a arte é SÓ a enviada: o `banner_url` da coleção nunca entra no círculo', () => {
    // O `resolveItem` genérico faz `image_url || banner_url`. Sem arte enviada, ele devolveria o
    // banner largo da coleção — que viraria um retângulo espremido num círculo de 80px.
    const comBanner = resolvido({ imageUrl: 'https://cdn.test/banner-largo-da-colecao.webp' })
    const desenhado = categoryListItem(item({ image_url: null }), comBanner)!
    expect(desenhado.imageUrl).toBeNull()
    expect(desenhado.imageUrl).not.toBe('https://cdn.test/banner-largo-da-colecao.webp')
  })

  it('arte enviada chega como está', () => {
    expect(categoryListItem(item(), resolvido({ imageUrl: 'x' }))!.imageUrl).toBe(
      'https://cdn.test/leite.png',
    )
  })

  it('arte de espaços é arte nenhuma', () => {
    expect(categoryListItem(item({ image_url: '   ' }), resolvido())!.imageUrl).toBeNull()
  })

  it('a arte de celular e a descrição nunca entram', () => {
    const desenhado = categoryListItem(item(), resolvido())!
    expect(desenhado.imageMobileUrl).toBeNull()
    expect(desenhado.description).toBeNull()
  })

  it('o resto do resolvido é preservado — destino, slug, ids', () => {
    const desenhado = categoryListItem(item(), resolvido())!
    expect(desenhado).toMatchObject({
      id: 'i1',
      categoryId: 'cat-leite',
      slug: 'leite-materno',
      href: '/leite-materno',
      curated: true,
    })
  })

  it('destino de PEÇA não desenha (LCT-12)', () => {
    const peca = resolvido({ categoryId: null, productId: 'p1', href: '/produtos/pingente' })
    expect(categoryListItem(item({ category_id: null, product_id: 'p1' }), peca)).toBeNull()
  })

  it('destino de ENDEREÇO não desenha (LCT-12)', () => {
    const endereco = resolvido({ categoryId: null, href: '/sobre' })
    expect(categoryListItem(item({ category_id: null, href: '/sobre' }), endereco)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// categoryListRefusal — LCT-16, LCT-19, LCT-20, LCT-30
// ---------------------------------------------------------------------------

describe('categoryListRefusal — o rascunho que pode ser salvo', () => {
  it('lista vazia NÃO é recusa — o bloco nasce sem itens (LCT-15)', () => {
    expect(categoryListRefusal({}, [])).toBeNull()
    expect(categoryListRefusal(null, null)).toBeNull()
  })

  it('24 itens válidos passam (LCT-20)', () => {
    expect(categoryListRefusal({ title: 'Escolha pela joia' }, validos(24))).toBeNull()
  })

  it('25 itens são recusados com a frase do teto (LCT-20, LCT-30)', () => {
    const motivo = categoryListRefusal({}, validos(25))
    expect(motivo).toContain('Até 24 categorias por bloco')
    expect(motivo).toContain('há 25')
  })

  it('título da seção com 60 passa; com 61 é recusado (LCT-16)', () => {
    expect(categoryListRefusal({ title: 'a'.repeat(60) }, [])).toBeNull()
    expect(categoryListRefusal({ title: 'a'.repeat(61) }, [])).toBe(
      'O título da seção passa de 60 caracteres. Encurte-o para salvar.',
    )
  })

  it('título da seção vazio é permitido — a fileira aparece sem título', () => {
    expect(categoryListRefusal({ title: '' }, validos(1))).toBeNull()
  })

  it('item sem imagem: “A 3ª categoria está sem imagem.” (LCT-19)', () => {
    const lista = validos(3)
    lista[2] = { ...lista[2], image_url: null }
    expect(categoryListRefusal({}, lista)).toBe('A 3ª categoria está sem imagem.')
  })

  it('imagem de espaços é imagem nenhuma', () => {
    const lista = validos(1)
    lista[0] = { ...lista[0], image_url: '  ' }
    expect(categoryListRefusal({}, lista)).toBe('A 1ª categoria está sem imagem.')
  })

  it('item sem coleção e sem nome congelado: “A 3ª categoria está sem coleção.” (LCT-19)', () => {
    const lista = validos(3)
    lista[2] = { ...lista[2], category_id: null, label_snapshot: null }
    expect(categoryListRefusal({}, lista)).toBe('A 3ª categoria está sem coleção.')
  })

  it('item cuja coleção foi apagada diz QUAL, pelo nome congelado', () => {
    const lista = validos(3)
    lista[2] = { ...lista[2], category_id: null, label_snapshot: 'Penas' }
    expect(categoryListRefusal({}, lista)).toBe(
      'A 3ª categoria perdeu a coleção “Penas”, que foi apagada. Escolha outra ou remova a categoria.',
    )
  })

  it('título do item com 28 passa; com 29 é recusado', () => {
    const lista = validos(2)
    lista[1] = { ...lista[1], title: 'a'.repeat(28) }
    expect(categoryListRefusal({}, lista)).toBeNull()
    lista[1] = { ...lista[1], title: 'a'.repeat(29) }
    expect(categoryListRefusal({}, lista)).toBe('O título da 2ª categoria passa de 28 caracteres.')
  })

  it('o título do item conta CRU, como o `check` do banco — o espaço do fim conta', () => {
    // `char_length` não apara: 28 letras + 1 espaço são 29 para o banco. Aparar aqui deixaria a
    // tela aceitar o que a gravação recusa (achado da verificação independente, mutante M10).
    const lista = validos(1)
    lista[0] = { ...lista[0], title: 'a'.repeat(28) + ' ' }
    expect(categoryListRefusal({}, lista)).toBe('O título da 1ª categoria passa de 28 caracteres.')
  })

  describe('a ORDEM das cobranças é regra', () => {
    it('título da seção vem antes do teto', () => {
      expect(categoryListRefusal({ title: 'a'.repeat(61) }, validos(25))).toContain('título da seção')
    })

    it('o teto vem antes dos itens', () => {
      const lista = validos(25)
      lista[0] = { ...lista[0], image_url: null }
      expect(categoryListRefusal({}, lista)).toContain('Até 24 categorias por bloco')
    })

    it('no mesmo item: sem imagem vem antes de sem coleção', () => {
      const lista = validos(1)
      lista[0] = { ...lista[0], image_url: null, category_id: null, label_snapshot: null }
      expect(categoryListRefusal({}, lista)).toBe('A 1ª categoria está sem imagem.')
    })

    it('no mesmo item: sem coleção vem antes do título longo', () => {
      const lista = validos(1)
      lista[0] = { ...lista[0], category_id: null, label_snapshot: null, title: 'a'.repeat(29) }
      expect(categoryListRefusal({}, lista)).toBe('A 1ª categoria está sem coleção.')
    })

    it('o primeiro item com defeito é o nomeado, na posição', () => {
      const lista = validos(4)
      lista[1] = { ...lista[1], category_id: null, label_snapshot: null }
      lista[3] = { ...lista[3], image_url: null }
      expect(categoryListRefusal({}, lista)).toBe('A 2ª categoria está sem coleção.')
    })
  })
})
