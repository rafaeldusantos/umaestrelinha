import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { HomeSection, HomeSectionItem, ResolvedItem } from '@estrelinha/core/home'
import { mapDbToProduct } from '@/entities/product/lib/mapProduct'
import CampaignOffers from '../CampaignOffers'

/**
 * A fileira das peças escolhidas contém o que desenha — com o cartão de verdade, não um dublê.
 *
 * O preço riscado do cartão de campanha leva um "De " só para o leitor de tela (`sr-only`), que é
 * `position: absolute`. Um elemento absoluto é recortado pelo `overflow` da fita só quando o bloco
 * de contenção dele está DENTRO da fita; sem ancestral posicionado ali dentro, ele fica preso a um
 * ancestral de fora, escapa do recorte e alarga a página — em 390 px a Home rolava de lado, puxada
 * pelo "De " do terceiro cartão.
 *
 * jsdom não mede layout, então a prova é por classe: todo texto escondido da fileira tem um
 * ancestral posicionado entre ele e a fita. A medida real (`scrollWidth` da página em 390 px) é do
 * navegador.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { estado } = vi.hoisted(() => ({
  estado: { campanha: null as any, escolhidas: [] as any[] },
}))

vi.mock('@/entities/campaign', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useLiveCampaign: () => ({ data: estado.campanha, isLoading: false, isError: false }),
}))
vi.mock('@/entities/product/api/useProductsByIds', () => ({
  useProductsByIds: () => ({ data: estado.escolhidas, isLoading: false, isError: false }),
}))
vi.mock('../../model/useCampaignOfferProducts', () => ({
  useCampaignOfferProducts: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

const BLACK_FRIDAY = {
  id: 'camp-bf',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-12-01T03:00:00Z',
}

const peca = (id: string, name: string) =>
  mapDbToProduct({
    id,
    name,
    slug: id,
    base_price: 209.9,
    original_price: null,
    images: [{ url: `${id}.webp` }],
    stock_policy: 'track',
    stock_total: 10,
    low_stock_threshold: 5,
    product_campaigns: [{ percent: 20, campaigns: BLACK_FRIDAY }],
  } as any)

const linha = (productId: string, position: number): HomeSectionItem => ({
  id: `item-${productId}`,
  section_id: 'sec-ofertas',
  position,
  category_id: null,
  product_id: productId,
  href: null,
  image_url: null,
  alt: null,
  label_snapshot: null,
})

const resolvido = (productId: string): ResolvedItem => ({
  id: `item-${productId}`,
  categoryId: null,
  productId,
  slug: productId,
  label: '',
  description: null,
  href: `/produtos/${productId}`,
  imageUrl: null,
  imageMobileUrl: null,
  curated: true,
})

const IDS = ['colmeia', 'seis-coracoes', 'amor-mae-e-bebe']

const secao: HomeSection = {
  id: 'sec-ofertas',
  type: 'campaign_offers',
  position: 2,
  active: true,
  config: {},
  items: IDS.map((id, i) => linha(id, i)),
  campaign_id: 'camp-bf',
}

const POSICIONADO = ['relative', 'absolute', 'fixed', 'sticky']
const posicionado = (el: Element) => el.className.split(/\s+/).some(c => POSICIONADO.includes(c))

describe('a fileira das peças escolhidas contém o seu conteúdo', () => {
  it('o "De " escondido de cada preço riscado fica preso a um ancestral dentro da fita, e não escapa do recorte', () => {
    estado.campanha = { ...BLACK_FRIDAY, percents: [20] }
    estado.escolhidas = [
      peca('colmeia', 'Colméia'),
      peca('seis-coracoes', '6 Corações'),
      peca('amor-mae-e-bebe', 'Amor Mãe e Bebê'),
    ]
    render(
      <MemoryRouter>
        <CampaignOffers section={secao} items={IDS.map(resolvido)} />
      </MemoryRouter>,
    )

    const fita = screen.getByTestId('joias-em-oferta').querySelector('[aria-busy]')!
    expect(fita.className.split(/\s+/)).toContain('overflow-x-auto')

    const escondidos = Array.from(fita.querySelectorAll('.sr-only'))
    // Âncora: um "De " por peça escolhida — sem ela, uma fileira vazia passaria em silêncio.
    expect(escondidos.filter(e => e.textContent === 'De ')).toHaveLength(3)

    for (const escondido of escondidos) {
      let ancestral = escondido.parentElement
      while (ancestral && !posicionado(ancestral)) ancestral = ancestral.parentElement
      // A própria fita posicionada também prende; o que não pode é o bloco de contenção ficar fora dela.
      expect(!!ancestral && fita.contains(ancestral), `"${escondido.textContent}" sem ancestral posicionado dentro da fita`).toBe(true)
    }
  })
})
