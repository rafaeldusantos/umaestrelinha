// Feature 22 / T6 — `MAT-01`, a página "Como enviar o material".
//
// Duas coisas aqui não são cosméticas e por isso têm asserção própria:
//
// 1. **As dez fichas.** Uma instrução genérica obrigaria a cliente a adivinhar o que vale para o
//    caso dela, e o caso dela é insubstituível. Cada ficha é asserida individualmente — uma AC que
//    enumera lista pede uma asserção por elemento.
// 2. **O endereço nunca aparece pela metade.** Endereço incompleto aqui não é layout feio: é cinzas
//    postadas para um lugar que não existe.

import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MATERIAL_KINDS, MATERIAL_KIND_LABELS } from '@estrelinha/core/material'
import { ROUTE_SLUGS } from '@estrelinha/core/routes'

const state = vi.hoisted(() => ({
  material: {
    recipient: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zip: '', notes: '',
  },
  whatsapp: '5551999999999',
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useMaterialSettings: () => state.material,
  useGeneralSettings: () => ({
    store_name: 'Uma Estrelinha',
    whatsapp: state.whatsapp,
    whatsapp_message: '',
    email: '',
    instagram: '',
    tiktok: '',
  }),
}))

import HowToSendMaterialPage, { HOW_TO_SEND_PATH } from '../HowToSendMaterialPage'

const abrir = () =>
  render(
    <MemoryRouter>
      <HowToSendMaterialPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  state.material = {
    recipient: '', street: '', number: '', complement: '', neighborhood: '',
    city: '', state: '', zip: '', notes: '',
  }
  state.whatsapp = '5551999999999'
  document.head.querySelector('link[rel="canonical"]')?.remove()
})

describe('Como enviar o material — endereçamento (MAT-01 + AD-018)', () => {
  it('o slug da rota está em `ROUTE_SLUGS`', () => {
    // Sem isto, uma categoria chamada "como-enviar-o-material" seria encoberta pela rota, em
    // silêncio e em produção. `reservedSlugs.test.ts` guarda as duas direções.
    expect(ROUTE_SLUGS).toContain('como-enviar-o-material')
    expect(HOW_TO_SEND_PATH).toBe('/como-enviar-o-material')
  })

  it('declara a canônica dela', () => {
    abrir()
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    expect(canonical?.getAttribute('href')).toContain(HOW_TO_SEND_PATH)
  })
})

describe('Como enviar o material — conteúdo (MAT-01 AC 1)', () => {
  it('tem título e os quatro passos', () => {
    abrir()
    expect(screen.getByRole('heading', { level: 1, name: /como enviar o material/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /o caminho, em quatro passos/i })).toBeInTheDocument()
    expect(screen.getByText(/faça o pedido/i)).toBeInTheDocument()
    expect(screen.getByText(/poste e registre o código/i)).toBeInTheDocument()
  })

  it.each(MATERIAL_KINDS)('a ficha de `%s` existe, com âncora e preparo', kind => {
    abrir()
    const anchor = kind.replace(/_/g, '-')
    const ficha = document.getElementById(anchor)

    expect(ficha, `ficha ausente: ${anchor}`).not.toBeNull()
    expect(within(ficha as HTMLElement).getByRole('heading')).toHaveTextContent(
      MATERIAL_KIND_LABELS[kind],
    )
    // "Quanto enviar" existe em toda ficha: a quantidade é o que as pessoas mais erram, e vago aqui
    // vira material demais enviado — ou de menos, e a peça não sai.
    expect(within(ficha as HTMLElement).getByText(/quanto enviar/i)).toBeInTheDocument()
    expect(within(ficha as HTMLElement).getAllByRole('listitem').length).toBeGreaterThan(0)
  })

  it('as dez fichas estão na página, e nenhuma a mais', () => {
    abrir()
    const encontradas = MATERIAL_KINDS.filter(k => document.getElementById(k.replace(/_/g, '-')))
    expect(encontradas).toHaveLength(10)
  })

  it('tem o checklist de antes de fechar o envelope', () => {
    abrir()
    const titulo = screen.getByRole('heading', { name: /antes de fechar o envelope/i })
    // `getAllByText` seria ambíguo: "rastreio" aparece no passo 4, no checklist e no fecho. A
    // asserção é sobre a LISTA do checklist, então ela olha dentro da seção.
    const secao = titulo.closest('section') as HTMLElement
    const itens = within(secao).getAllByRole('listitem')

    expect(itens.length).toBe(5)
    expect(secao.textContent).toMatch(/código de rastreio/i)
    expect(secao.textContent).toMatch(/número do pedido/i)
  })

  it('não usa emoji nem linguagem festiva — o registro é memorial', () => {
    abrir()
    const texto = document.body.textContent ?? ''
    expect(texto).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
    expect(texto).not.toMatch(/últimas unidades|corra|aproveite já|imperdível/i)
  })
})

describe('Como enviar o material — o endereço nunca aparece pela metade', () => {
  it('endereço não configurado ⇒ NENHUM endereço, e o convite a falar com a loja', () => {
    abrir()
    expect(screen.getByText(/confirme o endereço com a gente/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /falar pelo whatsapp/i })).toBeInTheDocument()
  })

  it('só logradouro, sem cidade, ainda é "pela metade" — e não é exibido', () => {
    state.material = { ...state.material, street: 'Rua das Flores', number: '100' }
    abrir()

    expect(screen.getByText(/confirme o endereço com a gente/i)).toBeInTheDocument()
    expect(screen.queryByText(/Rua das Flores/)).not.toBeInTheDocument()
  })

  it('endereço completo é exibido, com destinatário, CEP e observação', () => {
    state.material = {
      recipient: 'Adri Muniz',
      street: 'Rua das Flores',
      number: '100',
      complement: 'sala 2',
      neighborhood: 'Centro',
      city: 'Porto Alegre',
      state: 'RS',
      zip: '90000100',
      notes: 'Recebo de segunda a sexta.',
    }
    abrir()

    expect(screen.getByText('Adri Muniz')).toBeInTheDocument()
    expect(screen.getByText('Rua das Flores, 100')).toBeInTheDocument()
    expect(screen.getByText('sala 2 · Centro')).toBeInTheDocument()
    expect(screen.getByText('Porto Alegre/RS · 90000100')).toBeInTheDocument()
    expect(screen.getByText('Recebo de segunda a sexta.')).toBeInTheDocument()
    expect(screen.queryByText(/confirme o endereço com a gente/i)).not.toBeInTheDocument()
  })

  it('sem WhatsApp configurado, o convite não vira link quebrado', () => {
    state.whatsapp = ''
    abrir()

    expect(screen.getByText(/confirme o endereço com a gente/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /falar pelo whatsapp/i })).not.toBeInTheDocument()
  })
})
