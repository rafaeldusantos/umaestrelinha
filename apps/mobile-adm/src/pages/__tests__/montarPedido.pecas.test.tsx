// O passo 2 · Peças da montagem, pela árvore REAL (`<App />` com sessão admin sobre o dublê do client):
// a busca pela regra de `core` sobre o catálogo lido uma vez, a folha da variação (foto que troca, a
// esgotada desligada, o teto do estoque somando a sacola, a gravação, editar) e a sacola com a foto
// de cada variação. O dublê responde `products` e `product_variants` como o PostgREST: a contagem no
// `head` e a página pelo `range`. As frases são escritas por extenso (fonte independente do código).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EnvioIcon } from '@estrelinha/ui/icons'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_HELENA = 'aaaaaaaa-0000-4000-8000-000000000002'
const CLIENTES = [{ id: ID_HELENA, name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 }]

const ID_PINGENTE = 'bbbbbbbb-0000-4000-8000-000000000001'
const ID_COLAR = 'bbbbbbbb-0000-4000-8000-000000000002'
const ID_ANEL = 'bbbbbbbb-0000-4000-8000-000000000003'

const CAPA_DO_PINGENTE = 'https://cdn.exemplo.invalid/capa-pingente.jpg'
const FOTO_PRATA = 'https://cdn.exemplo.invalid/pingente-prata.jpg'
const FOTO_OURO = 'https://cdn.exemplo.invalid/pingente-ouro.jpg'
const CAPA_DO_ANEL = 'https://cdn.exemplo.invalid/capa-anel.jpg'

const peca = (extra: Record<string, unknown>) => ({
  base_price: 0,
  image_url: null,
  capa: null,
  is_active: true,
  stock_policy: 'track',
  stock_total: 0,
  requires_material: false,
  engraving_max_chars: null,
  options: [],
  weight_kg: null,
  width_cm: null,
  height_cm: null,
  length_cm: null,
  ...extra,
})

const PECAS = [
  peca({ id: ID_ANEL, name: 'Anel Solitário', base_price: 200, capa: CAPA_DO_ANEL, stock_total: 4, options: [{ name: 'Tamanho', position: 0, values: ['16'] }] }),
  peca({ id: ID_COLAR, name: 'Colar Estrela', base_price: 120, stock_total: 5 }),
  peca({
    id: ID_PINGENTE,
    name: 'Pingente Coração',
    base_price: 300,
    capa: CAPA_DO_PINGENTE,
    requires_material: true,
    engraving_max_chars: 12,
    options: [
      { name: 'Acabamento', position: 0, values: ['Prata', 'Ouro', 'Rosé'] },
      { name: 'Com gravação', position: 1, values: ['Sim', 'Não'] },
    ],
  }),
]

const variacao = (id: string, product_id: string, position: number, option_values: Record<string, string>, stock: number, price: number, image_url: string | null) => ({
  id,
  product_id,
  price,
  option_values,
  image_url,
  is_active: true,
  stock,
  position,
  weight_kg: null,
})

const VARIACOES = [
  variacao('v-anel-16', ID_ANEL, 0, { Tamanho: '16' }, 4, 200, null),
  variacao('v-prata', ID_PINGENTE, 0, { Acabamento: 'Prata', 'Com gravação': 'Não' }, 0, 300, FOTO_PRATA),
  variacao('v-ouro', ID_PINGENTE, 1, { Acabamento: 'Ouro', 'Com gravação': 'Sim' }, 3, 378, FOTO_OURO),
  variacao('v-rose', ID_PINGENTE, 2, { Acabamento: 'Rosé', 'Com gravação': 'Não' }, 2, 350, null),
]

/** Como o PostgREST responde: a contagem no `head`, a página pelo `range`. */
const comoOPostgrest = (linhas: unknown[]) => (cadeia: Elo[]) => {
  const select = cadeia.find((e) => e.metodo === 'select')
  if ((select?.args[1] as { head?: boolean } | undefined)?.head) return { data: null, error: null, count: linhas.length }
  const range = cadeia.find((e) => e.metodo === 'range')
  const [de, ate] = (range?.args ?? [0, linhas.length - 1]) as [number, number]
  return { data: linhas.slice(de, ate + 1), error: null }
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const voltar = () =>
  act(async () => {
    window.history.back()
    await vi.advanceTimersByTimeAsync(50)
  })
const clicar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const buscarJoia = async (termo: string) => {
  await act(async () => {
    fireEvent.change(screen.getByLabelText('Buscar joia'), { target: { value: termo } })
  })
  await andar(400)
}
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const texto = (el: Element) => (el.textContent ?? '').replace(/\u00a0/g, ' ')

const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const joias = () => screen.queryByRole('list', { name: 'Joias' })
const joia = (nome: string) => within(joias()!).getByRole('button', { name: new RegExp(nome) })
const folha = () => screen.getByRole('dialog')
const fotoGrande = () => within(folha()).getAllByTestId('foto-da-peca')[0].querySelector('img')?.getAttribute('src') ?? null
const chip = (nome: RegExp) => within(within(folha()).getByRole('group', { name: 'Acabamento · Com gravação' })).getByRole('button', { name: nome })
const confirmar = () => within(folha()).getByRole('button', { name: /^(Acrescentar|Salvar) · / })
const linhas = () => screen.queryAllByTestId('linha-da-sacola')

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ({ data: { proposals: [], agora: AGORA }, error: null })))
  fake.responderTabela('customer_list', { data: CLIENTES, error: null })
  fake.responderTabela('addresses', { data: [], error: null })
  fake.responderTabela('products', comoOPostgrest(PECAS))
  fake.responderTabela('product_variants', comoOPostgrest(VARIACOES))
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Pedidos → "Montar pedido" → Helena → Continuar: o passo 2, com o catálogo lido. */
const abrirOPassoDasPecas = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await clicar(continuar())
  await andar(50)
  expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
}

/** Abre a folha de uma peça pela busca. */
const abrirPeca = async (nome: string) => {
  await clicar(joia(nome))
  await andar(50)
}

describe('passo 2 · a busca das peças', () => {
  it('lê o catálogo com o papel e mostra cada peça com a capa e "a partir de R$ … · N em estoque · pede material"', async () => {
    await abrirOPassoDasPecas()
    // As duas leituras saíram dentro de `lerComPapel`: a confirmação do papel foi junto.
    expect(fake.chamadasDe('atelie_clock').length).toBeGreaterThan(0)
    expect(fake.cadeiasDe('products').some((c) => c.some((e) => e.metodo === 'eq' && e.args[0] === 'is_active' && e.args[1] === true))).toBe(true)
    expect(fake.cadeiasDe('product_variants').length).toBeGreaterThan(0)

    expect(within(joias()!).getAllByRole('button')).toHaveLength(3)
    // Mais de uma variação: "a partir de" o menor preço; o estoque é a soma das variações.
    expect(texto(joia('Pingente Coração'))).toContain('a partir de R$ 300,00 · 5 em estoque · pede material')
    expect(joia('Pingente Coração').querySelector('img')?.getAttribute('src')).toBe(CAPA_DO_PINGENTE)
    // Uma variação só: sem "a partir de".
    expect(texto(joia('Anel Solitário'))).toContain('R$ 200,00 · 4 em estoque')
    expect(texto(joia('Anel Solitário'))).not.toContain('a partir de')
    // Sem grade: o preço base e o estoque da peça; sem foto, a moldura com a estrela.
    expect(texto(joia('Colar Estrela'))).toContain('R$ 120,00 · 5 em estoque')
    expect(texto(joia('Colar Estrela'))).not.toContain('pede material')
    expect(joia('Colar Estrela').querySelector('img')).toBeNull()
    expect(within(joia('Colar Estrela')).getByTestId('foto-da-peca').querySelector('svg')).not.toBeNull()

    // A barra: sem peça, o motivo do bloqueio.
    expect(within(barra()).getByText('Acrescente ao menos uma peça.')).toBeInTheDocument()
    expect(continuar()).toBeDisabled()
  })

  it('a busca é a de `core`: sem acento acha o nome com acento, e várias palavras em qualquer ordem', async () => {
    await abrirOPassoDasPecas()
    await buscarJoia('coracao')
    expect(within(joias()!).getAllByRole('button').map(texto)).toEqual([expect.stringContaining('Pingente Coração')])
    await buscarJoia('estrela colar')
    expect(within(joias()!).getAllByRole('button').map(texto)).toEqual([expect.stringContaining('Colar Estrela')])
    await buscarJoia('solitario anel')
    expect(within(joias()!).getAllByRole('button').map(texto)).toEqual([expect.stringContaining('Anel Solitário')])
    await buscarJoia('xyz')
    expect(joias()).not.toBeInTheDocument()
    expect(screen.getByText('Nenhuma joia com “xyz”.')).toBeInTheDocument()
  })

  it('o catálogo é lido uma vez: voltar ao passo 1 e vir de novo não relê', async () => {
    await abrirOPassoDasPecas()
    const lidas = fake.cadeiasDe('products').length
    await voltar()
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    await clicar(continuar())
    await andar(50)
    expect(joias()).toBeInTheDocument()
    expect(fake.cadeiasDe('products')).toHaveLength(lidas)
  })
})

describe('passo 2 · a folha da variação', () => {
  it('abre na primeira variação com estoque; a foto troca a cada toque e, sem foto própria, mostra a capa; a esgotada fica desligada', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Pingente Coração')
    expect(within(folha()).getByText('Pingente Coração')).toBeInTheDocument()
    expect(within(folha()).getByText('A foto troca com a variação escolhida.')).toBeInTheDocument()

    const prata = chip(/Prata/)
    expect(prata).toBeDisabled()
    expect(prata).toHaveTextContent('Esgotada')
    expect(chip(/Ouro/)).toHaveAttribute('aria-pressed', 'true')
    expect(chip(/Ouro/)).toHaveTextContent('3 em estoque')
    expect(fotoGrande()).toBe(FOTO_OURO)
    // A miniatura do chip é a foto da variação.
    expect(chip(/Ouro/).querySelector('img')?.getAttribute('src')).toBe(FOTO_OURO)

    await clicar(chip(/Rosé/))
    expect(chip(/Rosé/)).toHaveAttribute('aria-pressed', 'true')
    expect(fotoGrande()).toBe(CAPA_DO_PINGENTE)
    expect(texto(within(folha()).getByRole('button', { name: /Acrescentar/ }))).toBe('Acrescentar · R$ 350,00')

    await clicar(chip(/Ouro/))
    expect(fotoGrande()).toBe(FOTO_OURO)
    expect(texto(confirmar())).toBe('Acrescentar · R$ 378,00')
  })

  it('a gravação só aparece na variação que grava, com o teto da peça; o aviso de material aparece', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Pingente Coração')
    expect(within(folha()).getByLabelText('O que gravar')).toHaveAttribute('maxLength', '12')
    expect(within(folha()).getByPlaceholderText('Nome, data ou uma palavra')).toBeInTheDocument()
    expect(within(folha()).getByText('0/12')).toBeInTheDocument()
    expect(within(folha()).getByText('Opcional. Deixe em branco se ela preferir a peça sem gravação.')).toBeInTheDocument()
    expect(within(folha()).getByText('Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja.')).toBeInTheDocument()
    await act(async () => {
      fireEvent.change(within(folha()).getByLabelText('O que gravar'), { target: { value: 'Ana' } })
    })
    expect(within(folha()).getByText('3/12')).toBeInTheDocument()

    await clicar(chip(/Rosé/))
    expect(within(folha()).queryByLabelText('O que gravar')).not.toBeInTheDocument()

    // A peça que não pede material não tem o aviso.
    await voltar()
    await abrirPeca('Anel Solitário')
    expect(within(folha()).queryByText(/Pede material da cliente/)).not.toBeInTheDocument()
    expect(within(folha()).queryByLabelText('O que gravar')).not.toBeInTheDocument()
  })

  it('a quantidade não passa do estoque — somando a mesma variação que já está na sacola', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Pingente Coração')
    const mais = within(folha()).getByRole('button', { name: 'Uma a mais' })
    await clicar(mais)
    await clicar(mais)
    expect(within(folha()).queryByText('Só há 3 em estoque.')).not.toBeInTheDocument()
    expect(texto(confirmar())).toBe('Acrescentar · R$ 1.134,00')
    await clicar(mais)
    expect(within(folha()).getByText('Só há 3 em estoque.')).toBeInTheDocument()
    expect(confirmar()).toBeDisabled()
    await clicar(within(folha()).getByRole('button', { name: 'Uma a menos' }))
    await clicar(within(folha()).getByRole('button', { name: 'Uma a menos' }))
    expect(confirmar()).toBeEnabled()
    await clicar(confirmar())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Duas de Ouro na sacola: a terceira cabe, a quarta não.
    await abrirPeca('Pingente Coração')
    expect(chip(/Ouro/)).toHaveAttribute('aria-pressed', 'true')
    expect(confirmar()).toBeEnabled()
    await clicar(within(folha()).getByRole('button', { name: 'Uma a mais' }))
    expect(within(folha()).getByText('Só há 3 em estoque.')).toBeInTheDocument()
    expect(confirmar()).toBeDisabled()
    // Outra variação não soma com a de Ouro.
    await clicar(chip(/Rosé/))
    expect(within(folha()).queryByText(/Só há/)).not.toBeInTheDocument()
    expect(confirmar()).toBeEnabled()
  })

  it('acrescentar fecha a folha, limpa a busca e avisa; editar reabre a mesma folha com "Salvar"', async () => {
    await abrirOPassoDasPecas()
    await buscarJoia('coracao')
    await abrirPeca('Pingente Coração')
    await act(async () => {
      fireEvent.change(within(folha()).getByLabelText('O que gravar'), { target: { value: 'Ana' } })
    })
    await clicar(confirmar())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const aviso = screen.getByRole('status')
    expect(aviso).toHaveTextContent('Peça acrescentada.')
    expect(aviso).toHaveTextContent('Pingente Coração · Ouro · Sim')
    // A busca voltou vazia: as três peças de novo.
    expect(screen.getByLabelText('Buscar joia')).toHaveValue('')
    expect(within(joias()!).getAllByRole('button')).toHaveLength(3)

    await clicar(screen.getByRole('button', { name: 'Editar Pingente Coração' }))
    await andar(50)
    expect(chip(/Ouro/)).toHaveAttribute('aria-pressed', 'true')
    expect(within(folha()).getByLabelText('O que gravar')).toHaveValue('Ana')
    expect(texto(confirmar())).toBe('Salvar · R$ 378,00')
    // A linha editada não soma com ela mesma: 3 de 3 cabem.
    await clicar(within(folha()).getByRole('button', { name: 'Uma a mais' }))
    await clicar(within(folha()).getByRole('button', { name: 'Uma a mais' }))
    expect(within(folha()).queryByText(/Só há/)).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.change(within(folha()).getByLabelText('O que gravar'), { target: { value: 'Bia' } })
    })
    await clicar(confirmar())
    expect(screen.getByRole('status')).toHaveTextContent('Peça atualizada.')
    expect(linhas()).toHaveLength(1)
    expect(texto(linhas()[0])).toContain('Gravação: Bia')
    expect(texto(linhas()[0])).toContain('3 × R$ 378,00')
  })

  it('o voltar do Android fecha a folha sem acrescentar nada', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Anel Solitário')
    expect(folha()).toBeInTheDocument()
    await voltar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
    expect(linhas()).toHaveLength(0)
  })
})

describe('passo 2 · a sacola', () => {
  it('cada linha mostra a foto da variação escolhida (a peça sem foto, a moldura com a estrela); remover tira a linha', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Pingente Coração')
    await clicar(confirmar())
    await abrirPeca('Colar Estrela')
    // Sem grade: nenhum chip, o preço base.
    expect(within(folha()).queryByRole('group', { name: /Acabamento/ })).not.toBeInTheDocument()
    expect(texto(confirmar())).toBe('Acrescentar · R$ 120,00')
    await clicar(confirmar())

    expect(screen.getByRole('heading', { name: 'Sacola · 2 peças' })).toBeInTheDocument()
    const [pingente, colar] = linhas()
    expect(within(pingente).getByTestId('foto-da-peca').querySelector('img')?.getAttribute('src')).toBe(FOTO_OURO)
    expect(texto(pingente)).toContain('Ouro · Sim')
    expect(texto(pingente)).toContain('1 × R$ 378,00')
    expect(texto(pingente)).toContain('Pede material da cliente')
    expect(within(colar).getByTestId('foto-da-peca').querySelector('img')).toBeNull()
    expect(within(colar).getByTestId('foto-da-peca').querySelector('svg')).not.toBeNull()
    expect(texto(colar)).not.toContain('Pede material da cliente')

    // A barra: a contagem das peças, e o passo liberado.
    expect(texto(barra())).toContain('Itens · 2 peças · frete à parte')
    expect(within(barra()).queryByText('Acrescente ao menos uma peça.')).not.toBeInTheDocument()
    expect(continuar()).toBeEnabled()

    // A variação sem foto própria entra com a capa da peça.
    await abrirPeca('Pingente Coração')
    await clicar(chip(/Rosé/))
    await clicar(confirmar())
    expect(within(linhas()[2]).getByTestId('foto-da-peca').querySelector('img')?.getAttribute('src')).toBe(CAPA_DO_PINGENTE)

    await clicar(screen.getByRole('button', { name: 'Remover Colar Estrela' }))
    expect(linhas()).toHaveLength(2)
    expect(screen.queryByRole('button', { name: 'Remover Colar Estrela' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Peça removida.')
  })
})

describe('passo 2 · a confirmação da peça', () => {
  it('flutua sobre a barra, em tinta com o check dourado, e some sozinha em cerca de 3 s', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Colar Estrela')
    await clicar(confirmar())
    const aviso = within(barra()).getByRole('status')
    expect(aviso).toHaveTextContent('Peça acrescentada.')
    expect(aviso).toHaveTextContent('Colar Estrela')
    const cartao = aviso.querySelector('[data-parte="cartao"]')
    expect(tokens(cartao)).toContain('bg-estrelinha-ink')
    expect(tokens(cartao?.querySelector('svg') ?? null)).toContain('text-estrelinha-accent')
    // Nada da confirmação no topo do conteúdo.
    expect(screen.getAllByRole('status')).toHaveLength(1)

    await andar(2500)
    expect(screen.queryByText('Peça acrescentada.')).toBeInTheDocument()
    await andar(1000)
    expect(screen.queryByText('Peça acrescentada.')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('trocar de passo apaga a confirmação: ela não segue para Descontos', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Colar Estrela')
    await clicar(confirmar())
    expect(screen.getByText('Peça acrescentada.')).toBeInTheDocument()
    await clicar(continuar())
    await andar(50)
    expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
    expect(screen.queryByText('Peça acrescentada.')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Colar Estrela$/)).not.toBeInTheDocument()
  })
})

describe('passo 2 · a folha da variação segue o protótipo', () => {
  it('o chip escolhido, o aviso de material e a linha de estoque com as classes e os textos do protótipo', async () => {
    await abrirOPassoDasPecas()
    await abrirPeca('Pingente Coração')

    // O chip escolhido: preenchido em primária, texto on-primary. O outro: superfície, borda de linha.
    const ouro = chip(/Ouro/)
    expect(tokens(ouro)).toEqual(expect.arrayContaining(['bg-estrelinha-primary', 'border-estrelinha-primary']))
    expect(tokens(ouro)).not.toContain('bg-estrelinha-ground-deep')
    const [rotuloOuro, estoqueOuro] = [...ouro.querySelectorAll('span > span')]
    expect(rotuloOuro).toHaveTextContent('Ouro · Sim')
    expect(tokens(rotuloOuro)).toContain('text-estrelinha-on-primary')
    expect(tokens(rotuloOuro)).not.toContain('text-estrelinha-ink')
    expect(tokens(estoqueOuro)).toContain('text-estrelinha-on-primary')
    expect(tokens(estoqueOuro)).not.toContain('text-estrelinha-ink-soft')
    const rose = chip(/Rosé/)
    expect(tokens(rose)).toEqual(expect.arrayContaining(['bg-estrelinha-surface', 'border-estrelinha-line']))
    expect(tokens(rose)).not.toContain('bg-estrelinha-primary')
    expect(tokens(rose.querySelector('span > span'))).toContain('text-estrelinha-ink')

    // O aviso de material: o ícone de envio, em primária, ao lado da frase.
    const aviso = within(folha()).getByText('Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja.')
    const caixa = aviso.closest('[data-parte="aviso-de-material"]') as HTMLElement
    expect(caixa).not.toBeNull()
    const icone = caixa.querySelector('svg[aria-hidden="true"]') as SVGElement
    expect(icone).not.toBeNull()
    expect(tokens(icone)).toContain('text-estrelinha-primary')
    const tracos = (svg: Element) =>
      [...svg.querySelectorAll('path, circle')].map((n) => n.getAttribute('d') ?? `circle ${n.getAttribute('cx')},${n.getAttribute('cy')}`)
    const referencia = new DOMParser().parseFromString(renderToStaticMarkup(<EnvioIcon aria-hidden />), 'image/svg+xml').documentElement
    expect(tracos(icone).length).toBeGreaterThan(0)
    expect(tracos(icone)).toEqual(tracos(referencia))

    // A linha de estoque: "3 em estoque" até o teto; acima dele, ela VIRA "Só há 3 em estoque." — uma só.
    const quantidade = within(folha()).getByRole('group', { name: 'Quantidade' }).parentElement as HTMLElement
    expect(within(quantidade).getByText('3 em estoque')).toBeInTheDocument()
    const mais = within(folha()).getByRole('button', { name: 'Uma a mais' })
    await clicar(mais)
    await clicar(mais)
    await clicar(mais)
    expect(within(quantidade).queryByText('3 em estoque')).not.toBeInTheDocument()
    const so = within(folha()).getAllByText('Só há 3 em estoque.')
    expect(so).toHaveLength(1)
    expect(quantidade).toContainElement(so[0])
    expect(so[0]).toHaveAttribute('role', 'alert')
    expect(tokens(so[0])).toContain('text-estrelinha-alert')
    // O botão desligado continua apontando para o motivo.
    expect(confirmar()).toBeDisabled()
    expect(confirmar().getAttribute('aria-describedby')).toBe(so[0].id)
    // De volta ao teto, a linha volta a ser o estoque.
    await clicar(within(folha()).getByRole('button', { name: 'Uma a menos' }))
    expect(within(quantidade).getByText('3 em estoque')).toBeInTheDocument()
    expect(within(folha()).queryByText(/Só há/)).not.toBeInTheDocument()
  })
})
