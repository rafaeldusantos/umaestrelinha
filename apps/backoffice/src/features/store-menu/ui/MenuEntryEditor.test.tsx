// Feature 47 — a entrada do menu num card só (`FOCO-28`, `FOCO-30`, `FOCO-32`).
//
// O que se prova aqui é o **invólucro**: as três abas existem, cada uma monta o editor certo com as
// props que ele já recebia, a aba volta para Painel ao trocar de entrada OU de dispositivo, e a
// contagem de banners sai da mesma leitura que o editor usa.
//
// O comportamento interno de cada editor continua provado nos arquivos deles — este card não os
// altera, e testá-los de novo aqui seria cobertura duplicada, não cobertura a mais.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { enableRadixSelectInJsdom } from '@/test/radix'
import type { AdminCategory } from '@/entities/category'
import MenuEntryEditor from './MenuEntryEditor'
import { bannersGravados } from '../model/bannersGravados'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null, image_url: null, banner_url: null, color_accent: null, icon: null,
    active: true, sort_order: 0, parent_id: null, product_count: 0,
    menu_desktop: true, menu_mobile: true, menu_banners: null,
    ...over,
  }) as AdminCategory

const LEITE = cat({ id: 'leite', name: 'Leite materno' })
const CINZAS = cat({ id: 'cinzas', name: 'Cinzas' })
const FILHA = cat({ id: 'anel', name: 'Anel', parent_id: 'leite' })

const CATEGORIAS = [LEITE, CINZAS, FILHA]

const montar = (over: Partial<Parameters<typeof MenuEntryEditor>[0]> = {}) => {
  const props = {
    surface: 'desktop' as const,
    host: LEITE,
    categories: CATEGORIAS,
    onToggleChild: vi.fn(),
    onSaveBanners: vi.fn().mockResolvedValue(null),
    onIcon: vi.fn(),
    ...over,
  }
  return { ...render(<MenuEntryEditor {...props} />), props }
}

const aba = (nome: RegExp | string) => screen.getByRole('tab', { name: nome })

/**
 * Troca de aba.
 *
 * `mouseDown` e não `click`: o `Tabs` do Radix ativa no **mousedown**, e um `click` cru no jsdom não
 * passa por ele — a aba não trocaria e o teste falharia medindo a ausência de um editor que existe.
 */
const irPara = (nome: RegExp | string) => {
  fireEvent.mouseDown(aba(nome))
  fireEvent.click(aba(nome))
}

beforeAll(enableRadixSelectInJsdom)

describe('MenuEntryEditor — FOCO-28: os três editores num card com abas', () => {
  it('as três abas existem, na ordem Painel · Banners · Ícone', () => {
    montar()
    expect(screen.getAllByRole('tab').map(t => t.textContent?.replace(/\d+$/, '').trim())).toEqual([
      'Painel',
      'Banners',
      'Ícone',
    ])
  })

  it('a aba inicial é Painel', () => {
    montar()
    expect(aba('Painel')).toHaveAttribute('aria-selected', 'true')
  })

  it('o card nomeia a entrada em edição', () => {
    montar()
    expect(screen.getByText('Leite materno')).toBeInTheDocument()
  })

  it('a aba Painel monta o editor de painel, com as filhas da entrada', () => {
    montar()
    // O `MenuPanelEditor` lista as filhas da categoria anfitriã — se ele não estivesse montado, ou
    // estivesse montado sem `categories`, a filha não apareceria.
    expect(screen.getByText('Anel')).toBeInTheDocument()
  })

  it('a aba Ícone monta o SELETOR — não só troca de aba', () => {
    montar()
    irPara('Ícone')

    expect(aba('Ícone')).toHaveAttribute('aria-selected', 'true')
    // Asserir "o card contém o nome da entrada" passaria com o `MenuIconPicker` apagado: o `<h2>`
    // do próprio card já escreve esse nome. O que só o seletor renderiza é a cela de saída e o
    // cabeçalho dele, que cita o item entre aspas curvas.
    expect(screen.getByText('Ícone de “Leite materno”')).toBeInTheDocument()
    expect(screen.getByTestId('icone-nenhum')).toBeInTheDocument()
  })

  it('FOCO-29: limpar o ícone chega em `onIcon` — o seletor mora DENTRO do card agora', () => {
    // Com um ícone gravado, "Sem ícone" é a saída — e é o caminho que prova que o `onChange` do
    // seletor foi ligado ao `onIcon` deste card, e não deixado solto.
    const { props } = montar({ host: cat({ id: 'leite', name: 'Leite materno', icon: 'gota-afetiva' }) })
    irPara('Ícone')

    const cela = screen.getAllByRole('button').find(b => /Sem ícone/i.test(b.textContent ?? ''))
    expect(cela).toBeDefined()
    fireEvent.click(cela!)

    expect(props.onIcon).toHaveBeenCalledWith(null)
  })
})

describe('MenuEntryEditor — FOCO-30: trocar o que se edita volta para Painel', () => {
  it('trocar a ENTRADA remonta o card e a aba volta para Painel', () => {
    const { rerender } = montar()
    irPara('Ícone')
    expect(aba('Ícone')).toHaveAttribute('aria-selected', 'true')

    rerender(
      <MenuEntryEditor
        surface="desktop"
        host={CINZAS}
        categories={CATEGORIAS}
        onToggleChild={vi.fn()}
        onSaveBanners={vi.fn().mockResolvedValue(null)}
        onIcon={vi.fn()}
      />,
    )

    expect(aba('Painel')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Cinzas')).toBeInTheDocument()
  })

  it('trocar o DISPOSITIVO também volta para Painel — são duas curadorias', () => {
    const { rerender } = montar()
    irPara('Ícone')
    expect(aba('Ícone')).toHaveAttribute('aria-selected', 'true')

    rerender(
      <MenuEntryEditor
        surface="mobile"
        host={LEITE}
        categories={CATEGORIAS}
        onToggleChild={vi.fn()}
        onSaveBanners={vi.fn().mockResolvedValue(null)}
        onIcon={vi.fn()}
      />,
    )

    expect(aba('Painel')).toHaveAttribute('aria-selected', 'true')
  })
})

describe('MenuEntryEditor — FOCO-32: a contagem e o dado contado, do mesmo predicado', () => {
  const comBanners = cat({
    id: 'leite',
    name: 'Leite materno',
    menu_banners: {
      desktop: [{ target: { kind: 'category', id: 'cinzas' } }, { target: { kind: 'category', id: 'anel' } }],
      mobile: [{ target: { kind: 'category', id: 'cinzas' } }],
    },
  })

  it('a aba Banners mostra quantos a entrada tem, na superfície em edição', () => {
    montar({ host: comBanners, surface: 'desktop' })
    expect(screen.getByTestId('contagem-de-banners')).toHaveTextContent('2')
  })

  it('trocar de dispositivo muda a contagem — a curadoria é por superfície', () => {
    montar({ host: comBanners, surface: 'mobile' })
    expect(screen.getByTestId('contagem-de-banners')).toHaveTextContent('1')
  })

  it('sem banners, a contagem não desenha um zero', () => {
    montar({ host: LEITE })
    expect(screen.queryByTestId('contagem-de-banners')).toBeNull()
  })

  it('o número exibido é EXATAMENTE o que `bannersGravados` devolve — a leitura do editor', () => {
    // Se a aba tivesse uma contagem paralela, este par passaria a divergir em silêncio.
    montar({ host: comBanners, surface: 'desktop' })
    const esperado = bannersGravados(comBanners.menu_banners, 'desktop').length

    expect(screen.getByTestId('contagem-de-banners')).toHaveTextContent(String(esperado))
  })

  it('não existe contagem paralela no arquivo', () => {
    const fonte = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), 'MenuEntryEditor.tsx'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

    expect(fonte).toContain('bannersGravados(')
    // As formas que uma segunda leitura teria: ler o jsonb cru, ou chamar o dono de `core` de novo
    // e refazer o filtro aqui.
    expect(fonte).not.toMatch(/menu_banners\s*(?:\?\.|\[)/)
    expect(fonte).not.toContain('menuBannerSlots')
  })
})

describe('MenuEntryEditor — o nome do arquivo não convida o segundo desenho', () => {
  it('o arquivo existe no disco e NÃO se chama `…Preview`', () => {
    // Lido do disco, e não de um literal digitado aqui: `expect(/Preview/.test('MenuEntryEditor.tsx'))`
    // testaria a string que o próprio caso escreveu, e continuaria verde com o arquivo renomeado.
    // `previaUnica.test.ts` guarda a pasta inteira; esta é a asserção vizinha, no arquivo de quem
    // poderia ter escolhido o nome errado.
    const pasta = dirname(fileURLToPath(import.meta.url))
    const meuNome = readdirSync(pasta).filter(nome => /^MenuEntryEditor\.tsx$/.test(nome))

    expect(meuNome).toEqual(['MenuEntryEditor.tsx'])
    expect(readdirSync(pasta).filter(nome => /Preview/.test(nome) && !/\.test\./.test(nome))).toEqual(
      ['MenuLivePreview.tsx'],
    )
  })
})
