import { describe, it, expect } from 'vitest'
import {
  aspectRatioWarning,
  configRefusal,
  ctaHrefRefusal,
  destinationRefusal,
  uniqueTypeRefusal,
} from '../refusals'
import { INFRA_SLUGS } from '../../routes'
import type { HomeSection } from '../types'

/**
 * As recusas da Home — `HOME-20`, `HOME-22`, `HOME-23`, `HOME-27` e `HOME-42`.
 *
 * As cinco devolvem `string | null`. O formato não é gosto: com `strictNullChecks: false`, união
 * discriminada por literal booleano não estreita, e ler `.reason` no ramo do `else` seria TS2339.
 * Quem escrever um `{ ok, reason }` aqui descobre isso só na tela que consumir.
 */

const secao = (id: string, type: HomeSection['type']): HomeSection => ({
  id,
  type,
  position: 1,
  active: true,
  config: {},
})

describe('uniqueTypeRefusal — tipo que só existe uma vez', () => {
  it('recusa um segundo bloco de tipo único, nomeando o bloco', () => {
    const motivo = uniqueTypeRefusal('hero', [secao('h', 'hero')])
    expect(motivo).toBe('“Chamada principal” já está na Home. Este bloco só pode existir uma vez.')
  })

  it('libera tipo único que ainda não está na Home', () => {
    expect(uniqueTypeRefusal('newsletter', [secao('h', 'hero')])).toBeNull()
  })

  it('nunca recusa tipo repetível, mesmo com um já na lista', () => {
    expect(uniqueTypeRefusal('banner_grid', [secao('b', 'banner_grid')])).toBeNull()
  })
})

describe('destinationRefusal — exatamente um destino para salvar (HOME-22, HOME-23)', () => {
  it('aceita coleção sozinha', () => {
    expect(destinationRefusal({ category_id: 'c1' })).toBeNull()
  })

  it('aceita produto sozinho', () => {
    expect(destinationRefusal({ product_id: 'p1' })).toBeNull()
  })

  it('aceita caminho da loja sozinho', () => {
    expect(destinationRefusal({ href: '/como-enviar-o-material' })).toBeNull()
  })

  it('recusa dois destinos ao mesmo tempo', () => {
    expect(destinationRefusal({ category_id: 'c1', product_id: 'p1' })).toBe(
      'Escolha um destino só: uma coleção, um produto ou um caminho da loja.',
    )
  })

  it('“ainda não escolhi” pede o destino', () => {
    expect(destinationRefusal({})).toBe(
      'Escolha o destino: uma coleção, um produto ou um caminho da loja.',
    )
  })

  it('“perdi o que tinha” NOMEIA o que se perdeu', () => {
    // É o que `label_snapshot` existe para permitir: depois do `SET NULL` não há de onde ler o nome
    // da coleção apagada, e "este banner perdeu o destino" não diz à dona qual era.
    expect(destinationRefusal({ label_snapshot: 'Prata 925' })).toBe(
      'O destino deste item (Prata 925) foi apagado. Escolha outro para ele voltar a aparecer.',
    )
  })

  it('os dois estados vazios não dizem a mesma coisa', () => {
    expect(destinationRefusal({})).not.toBe(destinationRefusal({ label_snapshot: 'Prata 925' }))
  })

  it('`href` só com espaço em branco não conta como destino', () => {
    expect(destinationRefusal({ href: '   ' })).toBe(
      'Escolha o destino: uma coleção, um produto ou um caminho da loja.',
    )
  })

  it('com imagem, `alt` só com espaço em branco é recusado como vazio', () => {
    expect(destinationRefusal({ category_id: 'c1', image_url: 'a.webp', alt: '   ' })).toBe(
      'Descreva a imagem: quem usa leitor de tela só tem essa descrição.',
    )
  })

  it('sem imagem, não cobra `alt`', () => {
    expect(destinationRefusal({ category_id: 'c1', alt: '' })).toBeNull()
  })
})

describe('ctaHrefRefusal — o destino do CTA (HOME-20)', () => {
  it('campo vazio não é erro: obrigatoriedade é do formulário', () => {
    expect(ctaHrefRefusal('')).toBeNull()
    expect(ctaHrefRefusal('   ')).toBeNull()
  })

  it('aceita os caminhos que a loja serve hoje', () => {
    expect(ctaHrefRefusal('/busca')).toBeNull()
    expect(ctaHrefRefusal('/como-enviar-o-material')).toBeNull()
    expect(ctaHrefRefusal('/')).toBeNull()
  })

  it('aceita a coleção na raiz e a subcoleção de dois níveis (AD-018)', () => {
    // A régua NÃO pode ser "o primeiro segmento está em ROUTE_SLUGS": com categoria servida na raiz
    // do domínio, isso recusaria toda coleção.
    expect(ctaHrefRefusal('/leite-materno')).toBeNull()
    expect(ctaHrefRefusal('/joias-afetivas/pet')).toBeNull()
  })

  it('recusa endereço que sai da loja', () => {
    expect(ctaHrefRefusal('https://instagram.com/umaestrelinha')).toBe(
      'O endereço precisa começar com “/”: a loja só aponta para páginas dela.',
    )
    expect(ctaHrefRefusal('busca')).toBe(
      'O endereço precisa começar com “/”: a loja só aponta para páginas dela.',
    )
  })

  it('recusa endereço com espaço', () => {
    expect(ctaHrefRefusal('/leite materno')).toBe('O endereço não pode ter espaço.')
  })

  it('recusa segmento reservado da infraestrutura, usando `core/routes` como fonte', () => {
    for (const slug of INFRA_SLUGS) {
      expect(ctaHrefRefusal(`/${slug}/algo`)).toBe(
        `“/${slug}” é reservado da infraestrutura e não chega à loja. Escolha outro endereço.`,
      )
    }
    expect(INFRA_SLUGS.length).toBeGreaterThan(0)
  })

  it('recusa três níveis sob um primeiro segmento que não é rota', () => {
    expect(ctaHrefRefusal('/joias-afetivas/pet/pulseiras')).toBe(
      'Este endereço não existe na loja: coleção tem no máximo dois níveis.',
    )
  })

  it('deixa passar três níveis sob uma rota de verdade', () => {
    expect(ctaHrefRefusal('/politicas/troca/prazo')).toBeNull()
  })
})

describe('configRefusal — o limite e o `alt` (HOME-42, HOME-18)', () => {
  it('aceita limite dentro da faixa do tipo', () => {
    expect(configRefusal('collection_rows', { limit: 4 })).toBeNull()
    expect(configRefusal('trending_tags', { limit: 12 })).toBeNull()
  })

  it('recusa limite acima da faixa, dizendo qual é', () => {
    expect(configRefusal('collection_rows', { limit: 9 })).toBe(
      '“Fileiras de coleção” aceita de 1 a 8 itens.',
    )
  })

  it('recusa limite abaixo da faixa', () => {
    expect(configRefusal('trending_tags', { limit: 0 })).toBe(
      '“Chips de tema” aceita de 1 a 24 itens.',
    )
  })

  it('recusa limite quebrado', () => {
    expect(configRefusal('collection_rows', { limit: 2.5 })).toBe(
      '“Fileiras de coleção” aceita de 1 a 8 itens.',
    )
  })

  it('tipo sem faixa declarada não tem limite para recusar', () => {
    expect(configRefusal('newsletter', { limit: 999 })).toBeNull()
  })

  it('foto do hero sem descrição é recusada', () => {
    expect(configRefusal('hero', { image_url: 'peca.webp', image_alt: ' ' })).toBe(
      'Descreva a imagem: quem usa leitor de tela só tem essa descrição.',
    )
  })

  it('hero sem foto não cobra descrição', () => {
    expect(configRefusal('hero', { title_line1: 'O que você ama,' })).toBeNull()
  })
})

describe('aspectRatioWarning — avisa, nunca bloqueia (HOME-27)', () => {
  const vaga = { width: 1176, height: 486 }

  it('proporção igual à da vaga não gera aviso', () => {
    expect(aspectRatioWarning(1176, 486, vaga)).toBeNull()
  })

  it('divergência de exportação dentro da tolerância não gera aviso', () => {
    expect(aspectRatioWarning(1175, 486, vaga)).toBeNull()
  })

  it('proporção divergente traz as duas razões e o tamanho recomendado em PIXELS', () => {
    expect(aspectRatioWarning(1000, 1000, vaga)).toBe(
      'Esta arte é 1:1 e a vaga é 2,42:1 — o tamanho recomendado é 1176 × 486 px.',
    )
  })

  it('dimensão inválida não inventa aviso', () => {
    expect(aspectRatioWarning(0, 486, vaga)).toBeNull()
    expect(aspectRatioWarning(1176, 0, vaga)).toBeNull()
  })

  it('NUNCA bloqueia: a arte divergente continua salvável', () => {
    // A prova de "não bloqueia" é a recusa não conhecer proporção nenhuma. Se o aviso virasse
    // recusa, a dona ficaria sem poder subir a arte que só ela sabe se pode ser cortada.
    expect(aspectRatioWarning(1000, 1000, vaga)).not.toBeNull()
    expect(destinationRefusal({ category_id: 'c1', image_url: 'quadrada.webp', alt: 'Peça' })).toBeNull()
    expect(configRefusal('hero', { image_url: 'quadrada.webp', image_alt: 'Peça' })).toBeNull()
  })
})
