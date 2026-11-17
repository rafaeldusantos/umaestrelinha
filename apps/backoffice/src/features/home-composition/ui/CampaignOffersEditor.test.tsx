// O editor do bloco "Joias em oferta" — título, descrição, campanha e peças da campanha.
//
// Montado pelo CASCO de verdade (`HomeSectionEditor` + `SECTION_EDITORS`): é ele que guarda o
// rascunho, cobra a recusa e chama `onSave`. As leituras de campanha e de marcações são dubladas na
// fronteira (os hooks de `entities/campaign`, provados em `campaignMarks.test.tsx`); o catálogo da
// busca vem do dublê do client, como o `ProductSearchField` o lê na tela.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMPAIGN_OFFERS_NO_CAMPAIGN,
  campaignOffersScheduledPreviewNote,
  campaignOffersTakenText,
  type HomeSection,
  type ResolvedSection,
} from '@estrelinha/core/home'
import type { AdminCampaign, CampaignPieceState } from '@/entities/campaign'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

interface MarcasDuble {
  ids?: string[] | null
  error?: string | null
  loading?: boolean
}

const camp = vi.hoisted(() => ({
  campaigns: [] as unknown[],
  erro: null as string | null,
  marcas: {} as Record<string, MarcasDuble>,
  estados: null as unknown,
  erroPecas: null as string | null,
  carregandoPecas: false,
  retry: vi.fn(),
}))

vi.mock('@/entities/campaign', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/campaign')>()),
  useCampaigns: () => ({ campaigns: camp.campaigns, loading: false, error: camp.erro, refetch: vi.fn() }),
  useCampaignMarks: (id: string | null) => {
    const m = id ? camp.marcas[id] : undefined
    const ids = m && !m.loading && !m.error ? (m.ids ?? []) : null
    return {
      marks: ids ? ids.map(product_id => ({ product_id, percent: 10 })) : null,
      ids,
      loading: !!id && !!m?.loading,
      error: m?.error ?? null,
      retry: camp.retry,
    }
  },
  useCampaignPiecesState: () => ({ states: camp.estados, loading: camp.carregandoPecas, error: camp.erroPecas }),
}))

import HomeSectionEditor from './HomeSectionEditor'
import { SECTION_EDITORS } from './sectionEditors'
import CampaignOffersEditor from './CampaignOffersEditor'
import { campaignOffersSectionRefusal } from '../model/sectionRefusals'
import type { DraftItem } from '../model/sectionDraft'

const DIA = 24 * 60 * 60 * 1000
const em = (dias: number) => new Date(Date.now() + dias * DIA).toISOString()

const campanha = (over: Partial<AdminCampaign> & { id: string; name: string }): AdminCampaign => ({
  badge_text: 'Oferta',
  band_color: '#000',
  accent_color: '#fff',
  starts_at: em(-10),
  ends_at: em(10),
  active: true,
  created_at: em(-30),
  updated_at: em(-30),
  percents: [10],
  usage: { 10: 3 },
  productCount: 3,
  ...over,
})

const VIGENTE = campanha({ id: 'c-natal', name: 'Natal 2026', starts_at: em(-10), ends_at: em(10) })
const AGENDADA = campanha({ id: 'c-maes', name: 'Dia das Mães', starts_at: em(5), ends_at: em(20) })
const ENCERRADA = campanha({ id: 'c-velha', name: 'Black Friday', starts_at: em(-40), ends_at: em(-1) })
const DESLIGADA = campanha({ id: 'c-off', name: 'Inverno', starts_at: em(-2), ends_at: em(30), active: false })

const PECAS = [
  { id: 'p1', name: 'Colar de Cinzas', slug: 'colar-de-cinzas', is_active: true, base_price: 289 },
  { id: 'p2', name: 'Pingente Gota', slug: 'pingente-gota', is_active: true, base_price: 189 },
  { id: 'p3', name: 'Anel Coração', slug: 'anel-coracao', is_active: true, base_price: 159 },
  { id: 'p4', name: 'Broche Pena', slug: 'broche-pena', is_active: true, base_price: 99 },
]

const encenaPool = () => {
  fromMock.mockImplementation(() => ({
    select: (_colunas: string, opcoes?: { head?: true }) => {
      if (opcoes?.head) return Promise.resolve({ count: PECAS.length, error: null })
      const construtor = {
        order: () => construtor,
        range: () => Promise.resolve({ data: PECAS, error: null }),
      }
      return construtor
    },
  }))
}

const item = (n: number, product_id: string | null, label: string | null = null) => ({
  id: `i${n}`,
  section_id: 'bloco',
  position: n,
  category_id: null,
  product_id,
  product_slug: product_id,
  href: null,
  image_url: null,
  image_mobile_url: null,
  alt: null,
  title: null,
  label_snapshot: label,
})

const SECAO: HomeSection = {
  id: 'bloco',
  type: 'campaign_offers',
  position: 4,
  active: false,
  config: {},
  items: [],
  campaign_id: null,
}

/** Outro bloco "Joias em oferta" da Home, na 2ª posição, com a campanha agendada. */
const OUTRO_BLOCO: HomeSection = {
  id: 'outro',
  type: 'campaign_offers',
  position: 2,
  active: true,
  config: { title: 'Presentes para as mães' },
  items: [],
  campaign_id: 'c-maes',
}

const montar = (over: Partial<HomeSection> = {}, outras: HomeSection[] = []) => {
  const onSave = vi.fn().mockResolvedValue(null)
  const onCancel = vi.fn()
  const onDraftChange = vi.fn()
  const section = { ...SECAO, ...over }
  const hero = { ...SECAO, id: 'hero', type: 'hero', position: 1, campaign_id: null } as HomeSection
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomeSectionEditor
          entry={
            {
              section,
              renders: false,
              hiddenReason: null,
              items: [],
              droppedCount: 0,
              nestedUnder: null,
            } as unknown as ResolvedSection
          }
          sections={[hero, ...outras, section]}
          categories={[]}
          products={PECAS}
          saving={false}
          onCancel={onCancel}
          onSave={onSave}
          onDraftChange={onDraftChange}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onSave, onCancel, onDraftChange }
}

const salvar = () => fireEvent.click(screen.getByRole('button', { name: /Salvar seção/ }))
const recusa = () => screen.queryByTestId('editor-recusa')?.textContent ?? ''
const nomesNaLista = () =>
  within(screen.getByTestId('curadoria'))
    .queryAllByTestId(/^nome-peca-/)
    .map(n => n.textContent)

beforeEach(() => {
  fromMock.mockReset()
  encenaPool()
  camp.campaigns = [ENCERRADA, AGENDADA, DESLIGADA, VIGENTE]
  camp.erro = null
  camp.marcas = {
    'c-natal': { ids: ['p1', 'p2'] },
    'c-maes': { ids: ['p1', 'p3'] },
    'c-velha': { ids: ['p1', 'p2', 'p3'] },
    'c-off': { ids: ['p1'] },
  }
  camp.estados = null
  camp.erroPecas = null
  camp.carregandoPecas = false
  camp.retry.mockReset()
})

describe('o registro', () => {
  it('o bloco tem editor e recusa — o editor sem campo de antes saiu', () => {
    expect(SECTION_EDITORS.campaign_offers?.Body).toBe(CampaignOffersEditor)
    expect(SECTION_EDITORS.campaign_offers?.refusal).toBe(campaignOffersSectionRefusal)
  })
})

describe('Conteúdo — título e descrição, com o contador', () => {
  it('os dois campos têm rótulo e contador, e o seletor de campanha tem nome acessível', () => {
    montar({ campaign_id: 'c-natal', config: { title: 'Presentes' } })
    expect(screen.getByLabelText('Título do bloco')).toHaveValue('Presentes')
    expect(screen.getByLabelText('Descrição do bloco')).toHaveValue('')
    expect(screen.getByTestId('contador-titulo')).toHaveTextContent('9/60')
    expect(screen.getByTestId('contador-descricao')).toHaveTextContent('0/160')
    expect(screen.getByRole('radiogroup', { name: 'Campanha do bloco' })).toBeInTheDocument()
  })

  it('o que a dona digita sobe no rascunho, antes de salvar — é o que a prévia mostra', () => {
    const { onDraftChange } = montar({ campaign_id: 'c-natal' })
    fireEvent.change(screen.getByLabelText('Título do bloco'), { target: { value: 'Para o Natal' } })
    fireEvent.change(screen.getByLabelText('Descrição do bloco'), { target: { value: 'Peças com desconto.' } })
    const ultimo = onDraftChange.mock.calls.at(-1)![0]
    expect(ultimo.config).toEqual({ title: 'Para o Natal', subtitle: 'Peças com desconto.' })
    expect(ultimo.campaign_id).toBe('c-natal')
  })
})

describe('Campanha — as opções', () => {
  const opcoes = () =>
    screen.getAllByRole('radio').map(r => r.closest('[data-testid^="opcao-campanha-"]')!.getAttribute('data-testid'))

  it('em vigência e agendadas, na ordem do início, cada uma com o estado e a vigência', () => {
    montar()
    expect(opcoes()).toEqual(['opcao-campanha-c-natal', 'opcao-campanha-c-maes'])
    const natal = screen.getByTestId('opcao-campanha-c-natal')
    expect(natal).toHaveTextContent('Em vigência')
    expect(within(screen.getByTestId('opcao-campanha-c-maes')).getByText('Agendada')).toBeInTheDocument()
    expect(within(natal).getByTestId('vigencia-c-natal').textContent).toMatch(/^\d{2}\/\d{2} a \d{2}\/\d{2}\/\d{4}$/)
  })

  it('a campanha atual aparece escolhida mesmo encerrada, com o estado', () => {
    montar({ campaign_id: 'c-velha' })
    expect(opcoes()).toContain('opcao-campanha-c-velha')
    expect(screen.getByRole('radio', { name: /Black Friday/ })).toBeChecked()
    expect(screen.getByTestId('opcao-campanha-c-velha')).toHaveTextContent('Encerrada')
    expect(screen.queryByTestId('opcao-campanha-c-off')).toBeNull()
  })

  it('a campanha desligada atual também aparece, com o estado e o motivo de não aparecer', () => {
    montar({ campaign_id: 'c-off' })
    expect(screen.getByRole('radio', { name: /Inverno/ })).toBeChecked()
    expect(screen.getByTestId('opcao-campanha-c-off')).toHaveTextContent('Desligada')
    expect(screen.getByTestId('aviso-campanha')).toHaveTextContent('desligada')
  })

  it('a campanha de outro bloco aparece desabilitada, dizendo a posição e o título dele', () => {
    montar({}, [OUTRO_BLOCO])
    expect(screen.getByRole('radio', { name: /Dia das Mães/ })).toBeDisabled()
    expect(screen.getByTestId('campanha-tomada-c-maes')).toHaveTextContent(
      campaignOffersTakenText(2, 'Presentes para as mães'),
    )
    expect(screen.getByRole('radio', { name: /Natal 2026/ })).toBeEnabled()
  })
})

describe('Sem campanha — a mesma frase para "nunca teve" e "a campanha foi apagada"', () => {
  it('bloco novo: o aviso pede a escolha, e a busca de peças não aparece', () => {
    montar()
    expect(screen.getByTestId('aviso-campanha').textContent).toBe(CAMPAIGN_OFFERS_NO_CAMPAIGN)
    expect(screen.queryByLabelText('Acrescentar uma peça')).toBeNull()
    expect(screen.getByTestId('busca-indisponivel')).toHaveTextContent(/escolha a campanha/i)
  })

  it('a campanha apagada zera a coluna — a tela diz exatamente o mesmo', () => {
    // Depois do `on delete set null` o bloco chega com `campaign_id: null` e as peças de antes.
    montar({ campaign_id: null, items: [item(1, 'p1')] })
    expect(screen.getByTestId('aviso-campanha').textContent).toBe(CAMPAIGN_OFFERS_NO_CAMPAIGN)
    expect(screen.getByTestId('busca-indisponivel')).toBeInTheDocument()
  })

  it('campanha que não está mais entre as campanhas vale como sem campanha', () => {
    montar({ campaign_id: 'c-sumiu' })
    expect(screen.getByTestId('aviso-campanha').textContent).toBe(CAMPAIGN_OFFERS_NO_CAMPAIGN)
  })
})

describe('Peças — a busca só oferece as marcadas na campanha', () => {
  it('com campanha, a busca lista só as peças dela, e o contador diz quantas há', async () => {
    montar({ campaign_id: 'c-natal' })
    await waitFor(() => expect(screen.getByTestId('pecas-encontradas')).toBeInTheDocument())
    const nomes = within(screen.getByTestId('pecas-encontradas'))
      .getAllByRole('button')
      .map(b => b.textContent?.trim())
    expect(nomes).toEqual(['Colar de Cinzas', 'Pingente Gota'])
    expect(screen.getByTestId('contador-encontrados')).toHaveTextContent('2 na campanha')
  })

  it('a peça escolhida aparece desabilitada na busca, dizendo que já está no bloco', async () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1')] })
    await waitFor(() => expect(screen.getByTestId('peca-p1')).toBeDisabled())
    expect(screen.getByTestId('ja-escolhida-p1')).toHaveTextContent('já está no bloco')
  })

  it('escolher acrescenta ao fim da lista', async () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1')] })
    await waitFor(() => expect(screen.getByTestId('peca-p2')).toBeEnabled())
    fireEvent.click(screen.getByTestId('peca-p2'))
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Pingente Gota'])
    expect(screen.getByTestId('contador-pecas')).toHaveTextContent('2 de 12')
  })

  it('enquanto as marcações carregam, a busca espera e a tela diz por quê', () => {
    camp.marcas['c-natal'] = { loading: true }
    montar({ campaign_id: 'c-natal' })
    expect(screen.getByTestId('marcacoes-carregando')).toBeInTheDocument()
    expect(screen.queryByLabelText('Acrescentar uma peça')).toBeNull()
  })
})

describe('A lista das escolhidas — posição, nome, reordenar e remover', () => {
  it('subir e descer trocam a ordem; cada botão tem nome acessível', () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    expect(screen.getByTestId('posicao-0')).toHaveTextContent('1ª')
    fireEvent.click(screen.getByRole('button', { name: 'Descer a 1ª peça' }))
    expect(nomesNaLista()).toEqual(['Pingente Gota', 'Colar de Cinzas'])
    fireEvent.click(screen.getByRole('button', { name: 'Subir a 2ª peça' }))
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Pingente Gota'])
    expect(screen.getByRole('button', { name: 'Subir a 1ª peça' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Descer a 2ª peça' })).toBeDisabled()
  })

  it('arrastar reordena', () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    fireEvent.dragStart(screen.getByTestId('peca-escolhida-1'))
    fireEvent.drop(screen.getByTestId('peca-escolhida-0'))
    expect(nomesNaLista()).toEqual(['Pingente Gota', 'Colar de Cinzas'])
  })

  it('remover tira a peça', () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    fireEvent.click(screen.getByRole('button', { name: 'Remover a 1ª peça' }))
    expect(nomesNaLista()).toEqual(['Pingente Gota'])
  })
})

describe('Trocar a campanha tira as peças que não estão marcadas na nova', () => {
  it('saem as que não estão na nova, ficam as que estão nas duas, e a tela diz quais saíram', () => {
    const { onSave } = montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Pingente Gota'])

    fireEvent.click(screen.getByRole('radio', { name: /Dia das Mães/ }))
    expect(nomesNaLista()).toEqual(['Colar de Cinzas'])
    expect(screen.getByTestId('pecas-que-sairam')).toHaveTextContent('“Pingente Gota”')
    expect(screen.getByTestId('pecas-que-sairam')).toHaveTextContent(/quando você salvar/)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Cancelar desfaz: nada é gravado e o editor fecha sem salvar', () => {
    const { onSave, onCancel } = montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    fireEvent.click(screen.getByRole('radio', { name: /Dia das Mães/ }))
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }))
    expect(onCancel).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('a troca leva a campanha ao rascunho da prévia', () => {
    const { onDraftChange } = montar({ campaign_id: 'c-natal' })
    fireEvent.click(screen.getByRole('radio', { name: /Dia das Mães/ }))
    expect(onDraftChange.mock.calls.at(-1)![0].campaign_id).toBe('c-maes')
  })
})

describe('Ao abrir — as peças tiradas da campanha e as apagadas saem, e o editor abre alterado', () => {
  it('a tirada da campanha sai, nomeada, e o editor abre com alteração pendente', () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p3')] })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas'])
    expect(screen.getByTestId('pecas-que-sairam')).toHaveTextContent('“Anel Coração”')
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('a apagada do catálogo sai do mesmo jeito, nomeada como apagada', () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, null, 'Broche antigo')] })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas'])
    expect(screen.getByTestId('pecas-apagadas')).toHaveTextContent('“Broche antigo”')
    expect(screen.getByTestId('pecas-apagadas')).toHaveTextContent(/apagada do catálogo/)
  })

  it('com tudo marcado nada sai e o editor abre sem alteração', () => {
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Pingente Gota'])
    expect(screen.queryByTestId('pecas-que-sairam')).toBeNull()
    expect(screen.queryByText('Alterações não salvas')).toBeNull()
  })

  it('a leitura das marcações falhando: nenhuma peça sai, e a tela diz que não conseguiu conferir', () => {
    camp.marcas['c-natal'] = { error: 'ler as peças da campanha: timeout' }
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p3'), item(3, null, 'Broche antigo')] })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Anel Coração', 'Broche antigo'])
    expect(screen.getByTestId('marcacoes-com-erro')).toHaveTextContent(/não foi possível conferir/i)
    expect(screen.getByTestId('marcacoes-com-erro')).toHaveTextContent(/nenhuma peça saiu/i)
    expect(screen.queryByText('Alterações não salvas')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(camp.retry).toHaveBeenCalled()
  })

  it('a leitura que chega depois da montagem também tira as peças', () => {
    camp.marcas['c-natal'] = { loading: true }
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p3')] })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas', 'Anel Coração'])
    camp.marcas['c-natal'] = { ids: ['p1', 'p2'] }
    // Qualquer render do casco relê os hooks: digitar no título basta.
    act(() => {
      fireEvent.change(screen.getByLabelText('Título do bloco'), { target: { value: 'x' } })
    })
    expect(nomesNaLista()).toEqual(['Colar de Cinzas'])
  })
})

describe('Os avisos das peças escolhidas e da campanha agendada', () => {
  it('"N das M saíram do ar", nomeando a peça', () => {
    camp.estados = [
      { product_id: 'p1', name: 'Colar de Cinzas', status: 'no-ar' },
      { product_id: 'p2', name: 'Pingente Gota', status: 'fora-do-ar' },
    ] satisfies CampaignPieceState[]
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    expect(screen.getByTestId('pecas-fora-do-ar')).toHaveTextContent('1 das 2 saiu do ar: “Pingente Gota”')
  })

  it('as peças que a campanha não barateia, nomeadas', () => {
    camp.estados = [
      { product_id: 'p1', name: 'Colar de Cinzas', status: 'nao-barateada' },
      { product_id: 'p2', name: 'Pingente Gota', status: 'no-ar' },
    ] satisfies CampaignPieceState[]
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    expect(screen.getByTestId('pecas-nao-barateadas')).toHaveTextContent('“Colar de Cinzas”')
    expect(screen.getByTestId('pecas-nao-barateadas')).toHaveTextContent('não aparece no bloco')
  })

  it('a conferência das peças escolhidas falhando: a tela diz que não sabe quais aparecem', () => {
    camp.erroPecas = 'ler as peças escolhidas: timeout'
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p2')] })
    expect(screen.getByTestId('pecas-sem-conferencia')).toHaveTextContent(/não foi possível conferir/i)
    expect(screen.getByTestId('pecas-sem-conferencia')).toHaveTextContent('timeout')
    expect(screen.queryByTestId('pecas-fora-do-ar')).toBeNull()
  })

  it('enquanto a conferência das peças carrega, a tela diz que está conferindo', () => {
    camp.carregandoPecas = true
    montar({ campaign_id: 'c-natal', items: [item(1, 'p1')] })
    expect(screen.getByTestId('pecas-conferindo')).toBeInTheDocument()
  })

  it('campanha agendada: a prévia só mostra o bloco a partir do início', () => {
    montar({ campaign_id: 'c-maes' })
    expect(screen.getByTestId('aviso-campanha')).toHaveTextContent(
      campaignOffersScheduledPreviewNote(AGENDADA.starts_at),
    )
  })

  it('campanha em vigência: nenhum aviso de campanha', () => {
    montar({ campaign_id: 'c-natal' })
    expect(screen.queryByTestId('aviso-campanha')).toBeNull()
  })
})

describe('A recusa, pelo casco: `onSave` não é chamado e o rascunho fica', () => {
  it('sem campanha: recusa com a frase de `core`, como alerta, e o título digitado fica', async () => {
    const { onSave } = montar()
    fireEvent.change(screen.getByLabelText('Título do bloco'), { target: { value: 'Presentes' } })
    salvar()
    await waitFor(() => expect(recusa()).toContain(CAMPAIGN_OFFERS_NO_CAMPAIGN))
    expect(screen.getByTestId('editor-recusa')).toHaveAttribute('role', 'alert')
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Título do bloco')).toHaveValue('Presentes')
  })

  it('título acima de 60: recusa com o motivo e o número', async () => {
    const { onSave } = montar({ campaign_id: 'c-natal' })
    fireEvent.change(screen.getByLabelText('Título do bloco'), { target: { value: 'a'.repeat(61) } })
    salvar()
    await waitFor(() => expect(recusa()).toContain('Cabem 60 caracteres no título, e há 61.'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByTestId('contador-titulo')).toHaveTextContent('61/60')
  })

  it('descrição acima de 160: recusa com o motivo e o número', async () => {
    const { onSave } = montar({ campaign_id: 'c-natal' })
    fireEvent.change(screen.getByLabelText('Descrição do bloco'), { target: { value: 'b'.repeat(161) } })
    salvar()
    await waitFor(() => expect(recusa()).toContain('Cabem 160 caracteres na descrição, e há 161.'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('acima de 12 peças: recusa com o número', async () => {
    camp.marcas['c-natal'] = { ids: Array.from({ length: 13 }, (_, n) => `x${n}`) }
    const { onSave } = montar({
      campaign_id: 'c-natal',
      items: Array.from({ length: 13 }, (_, n) => item(n, `x${n}`, `Peça ${n}`)),
    })
    salvar()
    await waitFor(() => expect(recusa()).toContain('Cabem 12 peças neste bloco, e há 13.'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('peça repetida: recusa com o ordinal', async () => {
    const { onSave } = montar({ campaign_id: 'c-natal', items: [item(1, 'p1'), item(2, 'p1')] })
    salvar()
    await waitFor(() => expect(recusa()).toContain('esta peça já está no bloco'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('com campanha e dentro dos tetos: grava título, campanha e peças', async () => {
    const { onSave } = montar({ campaign_id: 'c-natal', items: [item(1, 'p1')] })
    fireEvent.change(screen.getByLabelText('Título do bloco'), { target: { value: 'Para o Natal' } })
    salvar()
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const gravado = onSave.mock.calls[0][0] as { config: object; items: DraftItem[]; campaign_id: string }
    expect(gravado.config).toEqual({ title: 'Para o Natal' })
    expect(gravado.campaign_id).toBe('c-natal')
    expect(gravado.items.map(i => i.product_id)).toEqual(['p1'])
  })
})
