// O cartão "Agora na loja" da Início, pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client): a presença lida de `store_live`, os quatro estados, o toque, a recusa e as releituras.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimentoComAcessos } from '@/test/movimento'
import { presenca, presencaVazia } from '@/test/presenca'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const REDE = { message: 'Failed to fetch' }
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('store_overview', resumo())
  fake.responderRpc('store_movement', movimentoComAcessos())
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const abrir = async () => {
  await montarApp('/')
  await andar(50)
}
const cartao = () => screen.getByTestId('cartao-agora-na-loja')
const barras = () => Array.from(within(cartao()).getByTestId('mini-grafico').children) as HTMLElement[]
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)
const leituras = () => fake.chamadasDe('store_live').length

describe('o cartão com gente na loja', () => {
  it('logo abaixo da faixa e antes de "Precisa de você"; botão de largura inteira', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    const faixa = screen.getByRole('region', { name: 'Movimento da loja' })
    const precisa = document.querySelector('section[aria-labelledby="precisa-de-voce"]')!
    expect(faixa.compareDocumentPosition(cartao()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cartao().compareDocumentPosition(precisa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cartao().tagName).toBe('BUTTON')
    for (const t of ['w-full', 'min-h-11']) expect(temClasse(cartao(), t)).toBe(true)
    expect(fake.chamadasDe('store_live')).toEqual([{ nome: 'store_live', args: [] }])
  })

  it('o total, "pessoas", a linha do funil e o nome acessível', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    expect(cartao()).toHaveAccessibleName('Agora na loja, 7 pessoas. Abrir loja ao vivo')
    const numero = within(cartao()).getByTestId('numero-agora-na-loja')
    expect(numero.textContent).toBe('7')
    for (const t of ['font-display', 'text-[30px]', 'font-bold', 'text-estrelinha-primary']) expect(temClasse(numero, t)).toBe(true)
    expect(cartao()).toHaveTextContent(/^Agora na loja7pessoas2 com joias na sacola · 1 no checkout$/)
  })

  it('uma pessoa: "pessoa" no número e no nome', async () => {
    fake.responderRpc('store_live', presenca({ agora: { total: 1, olhando: 0, sacola: 1, checkout: 0 } }))
    await abrir()
    expect(cartao()).toHaveAccessibleName('Agora na loja, 1 pessoa. Abrir loja ao vivo')
    expect(cartao()).toHaveTextContent(/^Agora na loja1pessoa1 com joia na sacola/)
    expect(cartao().textContent).not.toMatch(/checkout/)
  })

  it('as partes da linha somem no zero', async () => {
    fake.responderRpc('store_live', presenca({ agora: { total: 3, olhando: 2, sacola: 0, checkout: 1 } }))
    await abrir()
    expect(cartao().textContent).toMatch(/1 no checkout$/)
    expect(cartao().textContent).not.toMatch(/sacola/)
  })

  it('o ponto do eyebrow é dourado e PARADO; o número nunca é dourado', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    const ponto = within(cartao()).getByTestId('ponto-ao-vivo')
    expect(temClasse(ponto, 'bg-estrelinha-accent')).toBe(true)
    expect(ponto.className).not.toMatch(/animate-|transition/)
    expect(within(cartao()).getByTestId('numero-agora-na-loja').className).not.toMatch(/accent/)
  })

  it('15 barras, só a de agora é dourada, e a altura vem do maior dos 30 minutos', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    const b = barras()
    expect(b).toHaveLength(15)
    expect(b.map((x) => temClasse(x, 'bg-estrelinha-accent'))).toEqual([...Array(14).fill(false), true])
    expect(b.slice(0, 14).every((x) => temClasse(x, 'bg-estrelinha-line'))).toBe(true)
    // o maior dos 30 é 9 (fora das 15 desenhadas): a barra de agora (7) mede round(7/9 × 40) = 31
    expect(b[14].style.height).toBe('31px')
    expect(b[0].style.height).toBe('22px') // 5 ⇒ round(5/9 × 40)
  })

  it('o toque abre `/ao-vivo` com o período da faixa na entrada', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    fireEvent.click(within(screen.getByRole('region', { name: 'Movimento da loja' })).getByRole('button', { name: 'Ontem' }))
    fireEvent.click(cartao())
    await andar(50)
    expect(window.location.pathname).toBe('/ao-vivo')
    expect(window.history.state.usr).toEqual({ doApp: true, periodo: 'ontem' })
  })
})

describe('os estados do cartão — ele nunca some', () => {
  it('carregando: traços no número e no gráfico, `aria-busy`, e o toque abre a tela', async () => {
    fake.pendurarRpc('store_live')
    await abrir()
    expect(cartao()).toHaveAccessibleName('Agora na loja, carregando. Abrir loja ao vivo')
    expect(cartao().getAttribute('aria-busy')).toBe('true')
    expect(cartao().querySelectorAll('.animate-pulse')).toHaveLength(2)
    expect(cartao().textContent).not.toMatch(/\d/)
    fireEvent.click(cartao())
    await andar(50)
    expect(window.location.pathname).toBe('/ao-vivo')
  })

  it('falha: "Não consegui carregar." e "Tentar de novo", e o toque RELÊ sem navegar', async () => {
    fake.falharRpc('store_live', REDE)
    await abrir()
    await andar(3000)
    expect(cartao()).toHaveAccessibleName('Agora na loja: não consegui carregar. Tentar de novo')
    expect(cartao()).toHaveTextContent(FALHA_DE_LEITURA)
    expect(cartao()).toHaveTextContent(TENTAR_DE_NOVO)
    expect(cartao().textContent).not.toMatch(/\d/)
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    const antes = leituras()
    fake.responderRpc('store_live', presenca())
    fireEvent.click(cartao())
    await andar(50)
    expect(leituras()).toBe(antes + 1)
    expect(window.location.pathname).toBe('/')
    expect(within(cartao()).getByTestId('numero-agora-na-loja').textContent).toBe('7')
  })

  it('ninguém na loja: "Ninguém na loja agora", o gráfico continua, e o nome diz 0 pessoas', async () => {
    fake.responderRpc('store_live', presencaVazia())
    await abrir()
    expect(cartao()).toHaveTextContent('Ninguém na loja agora')
    expect(barras()).toHaveLength(15)
    expect(barras().every((b) => b.style.height === '3px')).toBe(true)
    expect(cartao()).toHaveAccessibleName('Agora na loja, 0 pessoas. Abrir loja ao vivo')
  })

  it('loja ainda não medida: a frase do contador de Acessos no lugar de "Ninguém na loja agora"', async () => {
    fake.responderRpc('store_live', presencaVazia({ contagem_desde: null }))
    await abrir()
    const frase = 'Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br.'
    expect(cartao()).toHaveTextContent(frase)
    expect(cartao()).not.toHaveTextContent('Ninguém na loja agora')
    expect(cartao()).toHaveAccessibleName(`Agora na loja. ${frase} Abrir loja ao vivo`)
    expect(barras()).toHaveLength(15)
  })
})

describe('a recusa e as releituras', () => {
  it('`42501` de `store_live` ⇒ UMA chamada, o papel reconferido e o Login — nenhum número', async () => {
    fake.aoChamarRpc('store_live', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(fake.chamadasDe('store_live')).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/pessoas|Agora na loja/)
  })

  it('a cada 30 s com a aba visível; em segundo plano, nenhuma leitura; de volta, uma', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    expect(leituras()).toBe(1)
    await andar(29_000)
    expect(leituras()).toBe(1)
    await andar(1_500)
    expect(leituras()).toBe(2)
    act(() => focusManager.setFocused(false))
    await andar(90_000)
    expect(leituras()).toBe(2)
    act(() => focusManager.setFocused(true))
    await andar(50)
    expect(leituras()).toBe(3)
  })

  it('puxar no topo relê também a presença', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    const alvo = screen.getByRole('region', { name: 'Movimento da loja' })
    fireEvent.touchStart(alvo, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(alvo, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(alvo)
    await andar(50)
    expect(leituras()).toBe(2)
  })
})
