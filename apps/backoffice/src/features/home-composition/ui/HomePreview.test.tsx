// A prévia esquemática — `HOME-13`.
//
// Duas coisas se provam aqui, e a segunda é a que tem guarda no repositório:
//
// 1. **A prévia diz a verdade sobre a Home** — a ordem real, os textos reais, e um bloco marcado
//    COM O MOTIVO para cada seção que a cliente não vai ver. Selo mudo obrigaria a dona a voltar à
//    lista para descobrir o porquê, e a prévia existe justamente para ela não precisar.
// 2. **Nenhum token da loja atravessa para o painel.** A separação `--estrelinha-*` ×
//    `--estrelinha-admin-*` depende da ordem de dois imports e não quebra build, tipo nem teste de
//    componente — quem descobre é quem abre a tela. Aqui ela é asserida, lendo o fonte do disco.

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HOME_COMPOSITION,
  resolveHomeSections,
  type HomeSection,
  type ResolveContext,
  type ResolvedItem,
  type ResolvedSection,
} from '@estrelinha/core/home'
import HomePreview from './HomePreview'

const item = (id: string, label: string): ResolvedItem => ({
  id,
  categoryId: id,
  productId: null,
  slug: id,
  label,
  description: null,
  href: `/${id}`,
  imageUrl: null,
  curated: false,
})

const catalogo = [
  item('leite', 'Joias com leite materno'),
  item('cinzas', 'Eternize as cinzas'),
  item('cabelo', 'Mecha de cabelo'),
  item('pet', 'Pelo de pet'),
]

const cheio: ResolveContext = {
  resolveItem: () => catalogo[0],
  derive: () => catalogo,
}

const vazio: ResolveContext = { resolveItem: () => null, derive: () => [] }

const resolver = (
  sections: readonly HomeSection[] = DEFAULT_HOME_COMPOSITION,
  ctx: ResolveContext = cheio,
): ResolvedSection[] => resolveHomeSections(sections, ctx)

const montar = (resolved: ResolvedSection[], highlightId: string | null = null) =>
  render(<HomePreview resolved={resolved} highlightId={highlightId} />)

describe('HomePreview — a ordem e os textos reais', () => {
  it('empilha os blocos na ordem da Home', () => {
    montar(resolver())
    const ids = screen
      .getAllByTestId(/^previa-(?!fora-|resto-)/)
      .map(el => el.getAttribute('data-testid'))
    // A faixa institucional aparece DEPOIS da 1ª fileira e ANTES dos chips — dentro do bloco de
    // fileiras, como a loja a desenha.
    expect(ids).toEqual([
      'previa-hero',
      'previa-trust_bar',
      'previa-banner_grid',
      'previa-collection_rows',
      'previa-brand_statement',
      'previa-trending_tags',
      'previa-newsletter',
    ])
  })

  it('mostra o texto real do hero, não um rótulo de tipo', () => {
    montar(resolver())
    expect(screen.getByTestId('previa-hero')).toHaveTextContent('O que você ama, eternizado em joia.')
    expect(screen.getByTestId('previa-hero')).toHaveTextContent('Joias afetivas artesanais')
    expect(screen.getByTestId('previa-hero')).toHaveTextContent('Explorar coleções')
  })

  it('mostra o texto real da faixa institucional e da newsletter', () => {
    montar(resolver())
    expect(screen.getByTestId('previa-brand_statement')).toHaveTextContent(
      'Cada joia é uma memória eternizada à mão',
    )
    expect(screen.getByTestId('previa-newsletter')).toHaveTextContent('Quer saber das novidades?')
    expect(screen.getByTestId('previa-newsletter')).toHaveTextContent('Me cadastrar')
  })

  it('as fileiras saem com o nome de cada coleção, e o resto vem resumido', () => {
    montar(resolver())
    const fileiras = screen.getByTestId('previa-collection_rows')
    expect(fileiras).toHaveTextContent('Joias com leite materno')
    expect(screen.getByTestId('previa-resto-collection_rows')).toHaveTextContent(
      'Mais 3 fileiras — Eternize as cinzas · Mecha de cabelo · Pelo de pet',
    )
  })

  it('a faixa de vantagens NÃO inventa número: eles vêm de Configurações (HOME-44)', () => {
    montar(resolver())
    const vantagens = screen.getByTestId('previa-trust_bar')
    expect(vantagens.textContent).not.toMatch(/\d+\s*×|R\$|%/)
  })
})

describe('HomePreview — o que a cliente não vai ver (HOME-13)', () => {
  it('seção desligada aparece com selo E com o motivo', () => {
    const desligada = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'newsletter' ? { ...s, active: false } : s,
    )
    montar(resolver(desligada))
    const bloco = screen.getByTestId('previa-fora-newsletter')
    expect(bloco).toHaveTextContent('Newsletter — não aparece')
    expect(bloco).toHaveTextContent('Desligada: não aparece na loja.')
  })

  it('seção ligada com fonte vazia também aparece marcada, com o motivo dela', () => {
    montar(resolver(DEFAULT_HOME_COMPOSITION, vazio))
    expect(screen.getByTestId('previa-fora-collection_rows')).toHaveTextContent(
      'Não vai aparecer: o catálogo ainda não tem coleção para mostrar.',
    )
  })

  it('seção que renderiza não ganha bloco de "não aparece"', () => {
    montar(resolver())
    expect(screen.queryByTestId(/^previa-fora-/)).toBeNull()
  })
})

describe('HomePreview — o bloco em edição fica contornado', () => {
  it('contorna a seção destacada, e só ela', () => {
    const { container } = montar(resolver(), 'trending_tags')
    expect(container.querySelectorAll('.ring-2')).toHaveLength(1)
    expect(screen.getByTestId('previa-trending_tags').closest('.ring-2')).not.toBeNull()
  })

  it('sem destaque, nada fica contornado', () => {
    const { container } = montar(resolver())
    expect(container.querySelectorAll('.ring-2')).toHaveLength(0)
  })
})

/**
 * A separação de paletas, medida no disco.
 *
 * Render real dos widgets da loja traria os `--estrelinha-*` para dentro do backoffice, e essa é a
 * classe de defeito que não quebra nada: build passa, `tsc` passa, teste de componente passa, e o
 * painel renderiza com a cor da loja. `importOrder.test.ts` guarda o outro lado da mesma linha.
 */
const HERE = dirname(fileURLToPath(import.meta.url))
const FONTE = readFileSync(resolve(HERE, 'HomePreview.tsx'), 'utf8')

/**
 * O fonte **sem os comentários**.
 *
 * A varredura mede o que vira CSS, não a prosa: o cabeçalho do arquivo explica a regra citando os
 * dois namespaces, e uma varredura crua acusaria a própria explicação. Comentário que não pode
 * nomear o que proíbe é comentário que alguém apaga.
 */
const CODIGO = FONTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('HomePreview — tokens do PAINEL, nunca os da loja', () => {
  it('âncora: o fonte foi lido e sobrou código de verdade depois de tirar os comentários', () => {
    // Sem esta âncora, um caminho errado leria string vazia — ou o `replace` comeria o arquivo
    // inteiro — e as asserções abaixo passariam em silêncio, que é a pior falha possível num teste
    // que lê o disco.
    expect(FONTE.length).toBeGreaterThan(2000)
    expect(CODIGO).toContain('const HomePreview')
    expect(CODIGO.length).toBeGreaterThan(FONTE.length / 2)
  })

  it('não usa nenhuma classe nem variável da paleta da loja', () => {
    // `ground`, `ink`, `serenity` e `accent-strong` são tokens de `apps/store`; no backoffice eles
    // não existem, e uma classe que não existe some sem erro nenhum.
    for (const proibida of [
      'estrelinha-ground',
      'estrelinha-ink',
      'bg-ground',
      'text-ink',
      'bg-serenity',
      'accent-strong',
    ]) {
      expect(CODIGO.includes(proibida), `usa ${proibida}`).toBe(false)
    }
  })

  it('nenhuma variável `--estrelinha-*` da LOJA no código (as do painel são `-admin-`)', () => {
    const daLoja = [...CODIGO.matchAll(/--estrelinha-(?!admin-)/g)]
    expect(daLoja).toHaveLength(0)
  })

  it('não importa nada de `apps/store`', () => {
    expect(CODIGO).not.toMatch(/from\s+'[^']*apps\/store/)
  })
})
