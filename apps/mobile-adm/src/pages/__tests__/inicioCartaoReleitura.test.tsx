// O cartão "Agora na loja" da Início, pela árvore REAL (`<App />` sobre o dublê do client): a releitura
// da presença que falha com número na tela, e a área do cartão (o recuo do protótipo).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimentoComAcessos } from '@/test/movimento'
import { presenca } from '@/test/presenca'
import { FALHA_DE_LEITURA, NAO_ATUALIZOU, TENTAR_DE_NOVO } from '@/shared/ui/leitura'

vi.mock('@estrelinha/supabase/client', async () => ({
  supabase: (await import('@/test/fakeSupabase')).fake.client,
}))

const EMAIL = 'adri@exemplo.invalid'
const REDE = { message: 'Failed to fetch' }

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
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)
const leituras = () => fake.chamadasDe('store_live').length

/** A primeira leitura responde 7 pessoas; as seguintes falham, até `voltar()`. */
const presencaQueCai = () => {
  let caiu = false
  let voltou = false
  fake.aoChamarRpc('store_live', () =>
    !caiu || voltou
      ? {
          data: presenca(voltou ? { agora: { total: 3, olhando: 3, sacola: 0, checkout: 0 } } : {}),
          error: null,
        }
      : { data: null, error: REDE },
  )
  return {
    cair: () => {
      caiu = true
    },
    voltar: () => {
      voltou = true
    },
  }
}

describe('a releitura da presença que falha com número na tela', () => {
  it('o número, o funil e o gráfico continuam, e o cartão diz que não atualizou e oferece "Tentar de novo"', async () => {
    const rede = presencaQueCai()
    await abrir()
    expect(within(cartao()).getByTestId('numero-agora-na-loja').textContent).toBe('7')
    expect(within(cartao()).queryByTestId('aviso-agora-na-loja')).toBeNull()
    rede.cair()
    await andar(31_000) // a releitura de 30 s
    await andar(10_000) // as tentativas da regra de repetição
    expect(leituras()).toBeGreaterThanOrEqual(2)
    expect(within(cartao()).getByTestId('numero-agora-na-loja').textContent).toBe('7')
    expect(within(cartao()).getByTestId('funil-agora-na-loja')).toBeInTheDocument()
    expect(within(cartao()).getAllByTestId('mini-grafico')).toHaveLength(1)
    const aviso = within(cartao()).getByTestId('aviso-agora-na-loja')
    expect(aviso).toHaveTextContent(NAO_ATUALIZOU)
    expect(aviso).toHaveTextContent(TENTAR_DE_NOVO)
    expect(cartao()).not.toHaveTextContent(FALHA_DE_LEITURA)
    // Nenhum botão dentro do botão do cartão: o toque no cartão é o "Tentar de novo".
    expect(cartao().querySelector('button')).toBeNull()
    expect(cartao()).toHaveAccessibleName('Agora na loja, 7 pessoas. Não consegui atualizar agora. Tentar de novo')
  })

  it('o toque relê sem navegar; com a leitura de volta o aviso some e o número novo aparece', async () => {
    const rede = presencaQueCai()
    await abrir()
    rede.cair()
    await andar(41_000)
    expect(cartao()).toHaveTextContent(NAO_ATUALIZOU)
    const antes = leituras()
    rede.voltar()
    fireEvent.click(cartao())
    await andar(50)
    expect(leituras()).toBe(antes + 1)
    expect(window.location.pathname).toBe('/')
    expect(cartao()).not.toHaveTextContent(NAO_ATUALIZOU)
    expect(within(cartao()).queryByTestId('aviso-agora-na-loja')).toBeNull()
    expect(within(cartao()).getByTestId('numero-agora-na-loja').textContent).toBe('3')
    expect(cartao()).toHaveAccessibleName(/^Agora na loja, 3 pessoas/)
  })

  it('com a leitura boa, nenhum aviso no cartão (o par)', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    await andar(41_000)
    expect(leituras()).toBeGreaterThanOrEqual(2)
    expect(cartao()).not.toHaveTextContent(NAO_ATUALIZOU)
    expect(within(cartao()).getByTestId('numero-agora-na-loja').textContent).toBe('7')
  })

  it('a falha fria (sem número) continua "Não consegui carregar."', async () => {
    fake.falharRpc('store_live', REDE)
    await abrir()
    await andar(3000)
    expect(cartao()).toHaveTextContent(FALHA_DE_LEITURA)
    expect(cartao()).not.toHaveTextContent(NAO_ATUALIZOU)
  })
})

describe('a área do cartão (o protótipo: 16 no topo, 20 nas laterais)', () => {
  it('o cartão mora numa área com 16 px acima e recuo de 20 px (o `<main>` dá 16, a área mais 4)', async () => {
    fake.responderRpc('store_live', presenca())
    await abrir()
    const area = cartao().parentElement!
    expect(area.getAttribute('data-testid')).toBe('area-agora-na-loja')
    expect(temClasse(area, 'px-1')).toBe(true)
    expect(temClasse(area, '!mt-4')).toBe(true)
  })
})
