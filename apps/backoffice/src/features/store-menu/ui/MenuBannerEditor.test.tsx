// T25 — os banners do painel do menu.
//
// As ACs provadas aqui: `NAV-28` (até dois por superfície), `NAV-29` (o terceiro é recusado **com
// motivo**), `NAV-31` (o destino digitado usa a régua do item de link), `NAV-32` (título herdado do
// destino), `NAV-33`/`NAV-34` (arte por dispositivo, com aviso do que falta e de quando reaproveita)
// e `NAV-35` (sem banner o painel não fica com buraco).
//
// **E o caso que não é AC nenhuma, mas é contrapartida declarada de um desvio do lote 1**:
// `resolveMenuBanners` TRUNCA em dois na leitura. Um terceiro gravado à mão (SQL, importação, dois
// admins) não aparece na loja — e se esta tela também só desenhasse dois, ele seria invisível **e
// indeletável**. É assim que um dado errado sobrevive por meses.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MenuBanner, MenuBanners } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

// O editor procura o nome do produto de destino; sem client dublado o módulo do Supabase lança no
// carregamento. Nenhum caso aqui usa destino de peça, então a consulta devolve lista vazia.
vi.mock('@estrelinha/supabase/client', () => {
  const alvo: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'ilike', 'order', 'limit', 'in']) alvo[metodo] = () => alvo
  alvo.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve)
  return { supabase: { from: () => alvo, storage: { from: () => ({ upload: vi.fn() }) } } }
})

import MenuBannerEditor from './MenuBannerEditor'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null, image_url: null, banner_url: null, color_accent: null, icon: null,
    active: true, sort_order: 0, parent_id: null, product_count: 0,
    menu_desktop: true, menu_mobile: true, menu_banners: null,
    ...over,
  }) as AdminCategory

const CATEGORIAS = [
  cat({ id: 'materiais', name: 'Materiais' }),
  cat({ id: 'cinzas', name: 'Cinzas de cremação', parent_id: 'materiais', description: 'A peça que mais nos pedem.' }),
]

const banner = (over: Partial<MenuBanner> = {}): MenuBanner => ({
  target: { kind: 'category', id: 'cinzas' },
  ...over,
})

const onSave = vi.fn<(banners: MenuBanners) => Promise<string | null>>()

const montar = (menu_banners: unknown, surface: 'desktop' | 'mobile' = 'desktop') =>
  render(
    <MenuBannerEditor
      surface={surface}
      host={{ ...CATEGORIAS[0], menu_banners } as AdminCategory}
      categories={CATEGORIAS}
      onSave={onSave}
    />,
  )

beforeEach(() => {
  onSave.mockReset().mockResolvedValue(null)
})

// ---------------------------------------------------------------------------
describe('NAV-35 — sem banner o painel fica só com a lista', () => {
  it('diz isso em texto, e não deixa um quadro vazio', () => {
    montar(null)
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('0 de 2')
    expect(screen.getByText(/fica só com a lista de subcategorias/)).toBeInTheDocument()
  })
})

describe('NAV-28 / NAV-29 — dois cabem, o terceiro é recusado com motivo', () => {
  it('adicionar cria um slot e o botão de salvar aparece', () => {
    montar(null)
    fireEvent.click(screen.getByTestId('adicionar-banner'))

    expect(screen.getByTestId('banner-0')).toBeInTheDocument()
    expect(screen.getByText('Salvar banners')).toBeInTheDocument()
  })

  it('com dois, o terceiro NÃO entra — e o motivo é texto, não um botão apagado', () => {
    montar({ desktop: [banner(), banner()], mobile: [] })
    fireEvent.click(screen.getByTestId('adicionar-banner'))

    expect(screen.getByTestId('banner-recusa')).toHaveTextContent('comporta 2 banners')
    // A prova que importa: o terceiro slot não foi criado.
    expect(screen.queryByTestId('banner-2')).toBeNull()
  })
})

describe('o excedente gravado à mão é ACUSADO — e dá para apagar', () => {
  it('três no jsonb: a tela diz que só dois cabem e mostra o terceiro', () => {
    // `resolveMenuBanners` trunca na leitura: a loja mostra dois. Se a tela também truncasse, o
    // terceiro ficaria invisível e indeletável.
    montar({ desktop: [banner(), banner(), banner({ title: 'O sobrando' })], mobile: [] })

    expect(screen.getByTestId('banners-excedentes')).toHaveTextContent('3 banners gravados')
    expect(screen.getByTestId('banner-2')).toHaveTextContent('O sobrando')
  })

  it('apagar o excedente e salvar grava exatamente dois', async () => {
    montar({ desktop: [banner(), banner(), banner({ title: 'O sobrando' })], mobile: [] })
    fireEvent.click(screen.getByLabelText('Remover o banner 3'))
    fireEvent.click(screen.getByText('Salvar banners'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    // O que foi para o banco é o que importa: dois, e sem o excedente.
    const gravado = onSave.mock.calls[0][0].desktop
    expect(gravado).toHaveLength(2)
    expect(gravado.some(b => b.title === 'O sobrando')).toBe(false)
  })
})

describe('NAV-33 / NAV-34 — a arte é por dispositivo', () => {
  it('diz qual das duas artes falta', () => {
    montar({ desktop: [banner({ image_desktop: 'https://x/y.webp' })], mobile: [] })

    expect(screen.getByTestId('arte-image_desktop-0')).toHaveTextContent('640 × 380')
    expect(screen.getByTestId('arte-image_mobile-0')).toHaveTextContent('falta')
  })

  it('sem a arte da superfície corrente, avisa que a loja vai reaproveitar a do outro', () => {
    // O banner NÃO some: ~90% dos acessos vêm de celular, que é justamente a arte que costuma
    // faltar — sumir com ele seria a dona publicando um anúncio que metade das clientes não vê.
    montar({ desktop: [], mobile: [banner({ image_desktop: 'https://x/y.webp' })] }, 'mobile')

    expect(screen.getByTestId('arte-reaproveitada-0')).toHaveTextContent('reaproveitar a do computador')
  })

  it('com as duas artes, não há aviso de reaproveitamento', () => {
    montar({
      desktop: [banner({ image_desktop: 'https://x/d.webp', image_mobile: 'https://x/m.webp' })],
      mobile: [],
    })
    expect(screen.queryByTestId('arte-reaproveitada-0')).toBeNull()
  })
})

describe('NAV-32 — o texto herdado do destino', () => {
  it('o campo vazio mostra o nome e a descrição do destino como placeholder', () => {
    montar({ desktop: [banner()], mobile: [] })

    expect(screen.getByLabelText('Título')).toHaveAttribute('placeholder', 'Cinzas de cremação')
    expect(screen.getByLabelText('Texto')).toHaveAttribute('placeholder', 'A peça que mais nos pedem.')
  })

  it('a linha mostra a canônica do destino — nunca um endereço montado à mão', () => {
    // `AD-018`: "Cinzas de cremação" pende de "Materiais", então a canônica tem dois segmentos.
    montar({ desktop: [banner()], mobile: [] })
    expect(screen.getByTestId('banner-0')).toHaveTextContent('leva para /materiais/cinzas')
  })
})

describe('NAV-31 — o destino digitado usa a MESMA régua do item de link', () => {
  it('endereço que não é rota da loja é recusado, e nada é gravado', async () => {
    montar({ desktop: [banner({ target: { kind: 'url', href: '/sobree' } })], mobile: [] })
    // Uma edição qualquer materializa o rascunho e revela o botão de salvar.
    fireEvent.change(screen.getByLabelText('Selo'), { target: { value: 'Novidade' } })
    fireEvent.click(screen.getByText('Salvar banners'))

    await waitFor(() => expect(screen.getByTestId('banner-recusa')).toBeInTheDocument())
    expect(screen.getByTestId('banner-recusa')).toHaveTextContent('não é um endereço da loja')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('`http://` é recusado; `https://` passa', async () => {
    montar({ desktop: [banner({ target: { kind: 'url', href: 'http://exemplo.com' } })], mobile: [] })
    fireEvent.change(screen.getByLabelText('Selo'), { target: { value: 'x' } })
    fireEvent.click(screen.getByText('Salvar banners'))

    await waitFor(() => expect(screen.getByTestId('banner-recusa')).toHaveTextContent('https://'))

    fireEvent.change(screen.getByLabelText('Endereço de destino do banner 1'), {
      target: { value: 'https://exemplo.com' },
    })
    fireEvent.click(screen.getByText('Salvar banners'))
    await waitFor(() => expect(onSave).toHaveBeenCalled())
  })
})

describe('a gravação', () => {
  it('a superfície que NÃO está sendo editada passa intacta', async () => {
    const doCelular = banner({ title: 'Só no celular' })
    montar({ desktop: [], mobile: [doCelular] })
    fireEvent.click(screen.getByTestId('adicionar-banner'))
    fireEvent.click(screen.getByText('Salvar banners'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const gravado = onSave.mock.calls[0][0]
    expect(gravado.desktop).toHaveLength(1)
    // Gravar só a lista corrente apagaria o banner do outro dispositivo, e a dona só descobriria
    // abrindo a loja no celular.
    expect(gravado.mobile).toEqual([doCelular])
  })

  it('campo apagado SAI do jsonb — string vazia não vira "título vazio"', async () => {
    montar({ desktop: [banner({ title: 'Árvore da Vida' })], mobile: [] })
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: '' } })
    fireEvent.click(screen.getByText('Salvar banners'))

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].desktop[0]).not.toHaveProperty('title')
  })

  it('falha de gravação NÃO limpa o rascunho, e diz o motivo', async () => {
    onSave.mockResolvedValue('PGRST204')
    montar({ desktop: [banner()], mobile: [] })
    fireEvent.change(screen.getByLabelText('Selo'), { target: { value: 'Novidade' } })
    fireEvent.click(screen.getByText('Salvar banners'))

    await waitFor(() => expect(screen.getByTestId('banner-recusa')).toHaveTextContent('PGRST204'))
    expect(screen.getByLabelText('Selo')).toHaveValue('Novidade')
  })
})

describe('jsonb malformado não derruba a tela', () => {
  it.each([
    ['null', null],
    ['array na raiz', [{ target: { kind: 'category', id: 'cinzas' } }]],
    ['superfície que não é lista', { desktop: 'banner' }],
    ['item que não é objeto', { desktop: [null, 'x'] }],
  ])('%s renderiza o estado vazio, sem lançar', (_nome, valor) => {
    montar(valor)
    expect(screen.getByTestId('contador-banners')).toHaveTextContent('0 de 2')
  })
})
