// A lista de seções da Home — `HOME-08`, `HOME-09`, `HOME-12`, `HOME-15`.
//
// O fixture sai de `DEFAULT_HOME_COMPOSITION` passada por `resolveHomeSections` de propósito: é a
// MESMA regra que a loja usa para desenhar, então o que a lista mostra e o que a Home renderiza não
// podem divergir sem esta suíte acusar. Montar `ResolvedSection` à mão testaria a lista contra uma
// segunda versão do domínio.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_HOME_COMPOSITION,
  resolveHomeSections,
  type HomeSection,
  type ResolveContext,
  type ResolvedItem,
  type ResolvedSection,
} from '@estrelinha/core/home'
import HomeSectionList from './HomeSectionList'

const item = (id: string): ResolvedItem => ({
  id,
  categoryId: id,
  productId: null,
  slug: id,
  label: `Coleção ${id}`,
  description: null,
  href: `/${id}`,
  imageUrl: null,
  curated: false,
})

/** Um catálogo com conteúdo — o caso em que tudo renderiza. */
const cheio: ResolveContext = {
  resolveItem: () => item('x'),
  derive: () => [item('a'), item('b'), item('c')],
}

/** Catálogo vazio (depois de `db reset`, antes do import): as seções de fonte não renderizam. */
const vazio: ResolveContext = {
  resolveItem: () => null,
  derive: () => [],
}

const resolver = (
  sections: readonly HomeSection[] = DEFAULT_HOME_COMPOSITION,
  ctx: ResolveContext = cheio,
): ResolvedSection[] => resolveHomeSections(sections, ctx)

const montar = (resolved: ResolvedSection[], overrides: Partial<Parameters<typeof HomeSectionList>[0]> = {}) => {
  const props = {
    resolved,
    onToggle: vi.fn(),
    onOpen: vi.fn(),
    onReorder: vi.fn(),
    ...overrides,
  }
  render(<HomeSectionList {...props} />)
  return props
}

const linha = (id: string) => screen.getByTestId(`secao-${id}`)

describe('HomeSectionList — a lista (HOME-08)', () => {
  it('lista TODAS as seções na ordem da Home, com tipo e resumo', () => {
    montar(resolver())
    const nomes = screen.getAllByTestId(/^secao-/).map(li => within(li).getAllByRole('button')[0].textContent)
    expect(nomes).toEqual([
      expect.stringContaining('Chamada principal'),
      expect.stringContaining('Faixa de vantagens'),
      expect.stringContaining('Grade de banners'),
      expect.stringContaining('Fileiras de coleção'),
      expect.stringContaining('Faixa institucional'),
      expect.stringContaining('Chips de tema'),
      expect.stringContaining('Newsletter'),
    ])
  })

  it('o contador diz quantas existem e quantas estão no ar', () => {
    const desligada = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'newsletter' ? { ...s, active: false } : s,
    )
    montar(resolver(desligada))
    expect(screen.getByTestId('contador-secoes')).toHaveTextContent('7 seções · 6 no ar')
  })

  it('sem curadoria, o resumo diz que a fonte é automática', () => {
    montar(resolver())
    expect(linha('collection_rows')).toHaveTextContent('automático, na ordem de Categorias')
  })

  it('com curadoria, o resumo diz que foi a dona quem escolheu', () => {
    // Curadoria é a PRESENÇA de itens, não uma flag — então o resumo lê `section.items`, que é o
    // mesmo sinal que a loja usa para ignorar a derivação.
    const curada: HomeSection[] = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'collection_rows'
        ? {
            ...s,
            items: [
              {
                id: 'i1',
                section_id: s.id,
                position: 1,
                category_id: 'leite',
                product_id: null,
                href: null,
                image_url: null,
                alt: null,
                label_snapshot: 'Leite materno',
              },
            ],
          }
        : s,
    )
    montar(resolver(curada))
    expect(linha('collection_rows')).toHaveTextContent('escolhidas por você')
  })
})

describe('HomeSectionList — o hero é indelével (HOME-08)', () => {
  it('a linha do hero não tem interruptor de desligar', () => {
    montar(resolver())
    expect(within(linha('hero')).queryByRole('switch')).toBeNull()
  })

  it('e diz que está sempre no ar, com cadeado', () => {
    montar(resolver())
    expect(linha('hero')).toHaveTextContent('Sempre no ar')
    expect(
      within(linha('hero')).getByLabelText('A chamada principal não pode ser desligada'),
    ).toBeInTheDocument()
  })

  it('as outras seções têm interruptor', () => {
    montar(resolver())
    expect(within(linha('newsletter')).getByRole('switch')).toBeInTheDocument()
  })
})

describe('HomeSectionList — o motivo da ausência (HOME-09)', () => {
  it('seção LIGADA que não vai aparecer diz o MOTIVO, não um selo mudo', () => {
    montar(resolver(DEFAULT_HOME_COMPOSITION, vazio))
    expect(screen.getByTestId('aviso-collection_rows')).toHaveTextContent(
      'Não vai aparecer: o catálogo ainda não tem coleção para mostrar.',
    )
    expect(screen.getByTestId('aviso-banner_grid')).toHaveTextContent(
      'Não vai aparecer: esta grade não tem banner próprio e nenhuma coleção tem arte de banner.',
    )
  })

  it('ativar uma seção sem conteúdo É PERMITIDO — o interruptor não trava', async () => {
    const desligada = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'trending_tags' ? { ...s, active: false } : s,
    )
    const props = montar(resolver(desligada, vazio))
    const chave = within(linha('trending_tags')).getByRole('switch')
    expect(chave).not.toBeDisabled()
    fireEvent.click(chave)
    expect(props.onToggle).toHaveBeenCalledWith('trending_tags', true)
  })

  it('seção DESLIGADA não ganha aviso: "Desligada" já é a resposta', () => {
    const desligada = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'newsletter' ? { ...s, active: false } : s,
    )
    montar(resolver(desligada))
    expect(screen.queryByTestId('aviso-newsletter')).toBeNull()
    expect(linha('newsletter')).toHaveTextContent('Desligada')
  })

  it('seção que renderiza não tem aviso nenhum', () => {
    montar(resolver())
    expect(screen.queryByTestId(/^aviso-/)).toBeNull()
  })
})

describe('HomeSectionList — a faixa institucional aparece aninhada', () => {
  it('vem recuada e diz depois de qual fileira entra', () => {
    montar(resolver())
    const faixa = linha('brand_statement')
    expect(faixa).toHaveTextContent('entra depois da 1ª fileira')
    // O recuo é o que impede a lista de mentir sobre a ordem: como irmã, ela apareceria DEPOIS de
    // todas as fileiras, e não no meio delas.
    expect(faixa.querySelector('.pl-8')).not.toBeNull()
  })

  it('continua recuada mesmo DESLIGADA — ligar não pode fazer a linha pular de lugar', () => {
    const desligada = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'brand_statement' ? { ...s, active: false } : s,
    )
    montar(resolver(desligada))
    expect(linha('brand_statement').querySelector('.pl-8')).not.toBeNull()
  })

  it('sem fileiras renderizadas antes dela, NÃO é recuada — é onde a loja a desenha sozinha', () => {
    // A regra do domínio é "a antecessora RENDERIZADA é `collection_rows`". Com as fileiras
    // desligadas, a faixa renderiza sozinha no próprio lugar, e a lista precisa dizer isso.
    const semFileiras = DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'collection_rows' ? { ...s, active: false } : s,
    )
    montar(resolver(semFileiras))
    expect(linha('brand_statement').querySelector('.pl-8')).toBeNull()
  })

  it('a faixa É arrastável: a spec pede que ela possa ir para o fim da Home', () => {
    montar(resolver())
    expect(linha('brand_statement')).toHaveAttribute('draggable', 'true')
  })
})

describe('HomeSectionList — reordenar (HOME-11, HOME-12)', () => {
  const soltar = (draggedId: string, targetId: string) =>
    fireEvent.drop(linha(targetId), {
      dataTransfer: { getData: () => draggedId, setData: vi.fn() },
    })

  it('grava posições ABSOLUTAS e só das linhas que mudaram de lugar', () => {
    const props = montar(resolver())
    soltar('newsletter', 'hero')
    expect(props.onReorder).toHaveBeenCalledWith([
      { id: 'newsletter', position: 1 },
      { id: 'hero', position: 2 },
      { id: 'trust_bar', position: 3 },
      { id: 'banner_grid', position: 4 },
      { id: 'collection_rows', position: 5 },
      { id: 'brand_statement', position: 6 },
      { id: 'trending_tags', position: 7 },
    ])
  })

  it('soltar sobre a própria linha não grava nada', () => {
    const props = montar(resolver())
    soltar('hero', 'hero')
    expect(props.onReorder).not.toHaveBeenCalled()
  })
})

describe('HomeSectionList — 390px (HOME-15)', () => {
  it('cada controle da linha tem alvo próprio de 44px', () => {
    montar(resolver())
    const faixa = linha('trending_tags')
    // O interruptor e o "abrir" são controles distintos, e cada um precisa do seu alvo: um único
    // alvo de 44 cobrindo os dois faria o polegar desligar a seção querendo abri-la.
    expect(faixa.querySelectorAll('.h-11.w-11')).toHaveLength(2)
    // O corpo da linha (nome + resumo) é o terceiro alvo, e é de altura — o rótulo tem a largura
    // que tiver.
    expect(faixa.querySelector('.min-h-11')).not.toBeNull()
  })

  it('a linha mostra nome e resumo em duas linhas, sem cortar o resumo numa só', () => {
    montar(resolver())
    expect(linha('hero').querySelector('.line-clamp-2')).not.toBeNull()
  })
})

describe('HomeSectionList — o rodapé é da bandeja', () => {
  it('o cartão recebe a bandeja no rodapé, dentro dele mesmo', () => {
    montar(resolver(), { footer: <div data-testid="bandeja">blocos</div> })
    expect(screen.getByTestId('bandeja')).toBeInTheDocument()
  })
})
