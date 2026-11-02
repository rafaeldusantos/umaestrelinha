// Os blocos da presença na Loja ao vivo (A · Agora na loja, B · O que estão fazendo, C · Joias sendo
// vistas agora, D · De onde vieram, E · No celular), acima de Acessos, pela árvore REAL (`<App />` com
// sessão admin sobre o dublê do client). Os números chegam prontos de `store_live`; a tela só desenha.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake, type RespostaRpc } from '@/test/fakeSupabase'
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
const NOTA_DO_CHECKOUT =
  'Alguém está no checkout agora. Se a compra não fechar e o e-mail já tiver sido preenchido, a sacola fica em Carrinhos abandonados, no painel.'

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
  await montarApp('/ao-vivo')
  await andar(50)
}
const com = async (l = presenca()) => {
  fake.responderRpc('store_live', l)
  await abrir()
}
const bloco = (nome: string) => screen.getByRole('region', { name: nome })
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)
const leituras = () => fake.chamadasDe('store_live').length

const BLOCOS = ['Agora na loja', 'O que estão fazendo', 'Joias sendo vistas agora', 'De onde vieram', 'No celular'] as const

describe('a ordem', () => {
  it('A, B, C, D e E, nessa ordem, todos acima de Acessos; uma chamada de `store_live`, sem argumento', async () => {
    await com()
    const regioes = [...BLOCOS, 'Acessos'].map(bloco)
    for (let i = 1; i < regioes.length; i++) {
      expect(regioes[i - 1].compareDocumentPosition(regioes[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(fake.chamadasDe('store_live')).toEqual([{ nome: 'store_live', args: [] }])
  })
})

describe('A · Agora na loja', () => {
  it('o número em ouro sobre `ink`, "pessoas nos últimos 5 minutos", 30 barras e a última igual ao número', async () => {
    await com()
    const a = bloco('Agora na loja')
    expect(temClasse(a, 'bg-estrelinha-ink')).toBe(true)
    const numero = within(a).getByTestId('numero-ao-vivo')
    expect(numero.textContent).toBe('7')
    for (const t of ['text-estrelinha-accent', 'text-[56px]', 'font-bold', 'leading-none']) expect(temClasse(numero, t)).toBe(true)
    expect(a).toHaveTextContent('pessoas nos últimos 5 minutos')
    const barras = Array.from(within(a).getByTestId('grafico-30-min').children) as HTMLElement[]
    expect(barras).toHaveLength(30)
    expect(barras.at(-1)!.dataset.n).toBe(numero.textContent)
    expect(temClasse(barras.at(-1)!, 'bg-estrelinha-accent')).toBe(true)
    expect(barras.slice(0, -1).some((b) => temClasse(b, 'bg-estrelinha-accent'))).toBe(false)
    // proporcional ao maior minuto (o 9, a 56 px), com piso de 3 px
    expect(barras[13].style.height).toBe('56px')
    expect(barras[0].style.height).toBe('3px')
    expect(a).toHaveTextContent(/30 min atrás\s*agora$/)
  })

  it('uma pessoa: "pessoa nos últimos 5 minutos"', async () => {
    await com(presenca({ agora: { total: 1, olhando: 1, sacola: 0, checkout: 0 }, minutos: [...Array(29).fill(0), 1] }))
    expect(bloco('Agora na loja')).toHaveTextContent('1pessoa nos últimos 5 minutos')
  })

  it('ninguém na loja: "Ninguém na loja agora." e o gráfico, sem número', async () => {
    await com(presencaVazia())
    const a = bloco('Agora na loja')
    expect(a).toHaveTextContent('Ninguém na loja agora.')
    expect(within(a).queryByTestId('numero-ao-vivo')).toBeNull()
    expect(within(a).getByTestId('grafico-30-min').children).toHaveLength(30)
  })
})

describe('B · O que estão fazendo', () => {
  const linha = (stage: string) => within(bloco('O que estão fazendo')).getByTestId(`funil-${stage}`)
  const largura = (stage: string) => within(bloco('O que estão fazendo')).getByTestId(`barra-${stage}`).style.width

  it('as três faixas somam o total e as barras são proporcionais ao total (4, 2 e 1 de 7)', async () => {
    await com()
    expect(linha('olhando')).toHaveTextContent(/^Olhando joias4$/)
    expect(linha('sacola')).toHaveTextContent(/^Com joia na sacola2$/)
    expect(linha('checkout')).toHaveTextContent(/^No checkout1$/)
    expect([largura('olhando'), largura('sacola'), largura('checkout')]).toEqual(['57%', '29%', '14%'])
    for (const [s, cor] of [
      ['olhando', 'bg-estrelinha-field'],
      ['sacola', 'bg-estrelinha-primary'],
      ['checkout', 'bg-estrelinha-accent'],
    ]) {
      expect(temClasse(within(bloco('O que estão fazendo')).getByTestId(`barra-${s}`), cor)).toBe(true)
    }
  })

  it('"Compraram (últimos 30 min)" só com o número, sem barra; o número vem de `compraram_30min`', async () => {
    await com(presenca({ compraram_30min: 3 }))
    expect(linha('compraram')).toHaveTextContent(/^Compraram \(últimos 30 min\)3$/)
    expect(linha('compraram').querySelector('[data-testid^="barra-"]')).toBeNull()
    expect(within(bloco('O que estão fazendo')).queryAllByTestId(/^barra-/)).toHaveLength(3)
  })

  it('a nota do checkout só com alguém nele, com o texto exato e sem prazo', async () => {
    await com()
    const nota = within(bloco('O que estão fazendo')).getByTestId('nota-do-checkout')
    expect(nota.textContent).toBe(NOTA_DO_CHECKOUT)
    expect(nota.textContent).not.toMatch(/\d|hora|minuto|dia/)
  })

  it('sem ninguém no checkout, nenhuma nota', async () => {
    await com(presenca({ agora: { total: 6, olhando: 4, sacola: 2, checkout: 0 } }))
    expect(within(bloco('O que estão fazendo')).queryByTestId('nota-do-checkout')).toBeNull()
    expect(bloco('O que estão fazendo').textContent).not.toContain('Carrinhos abandonados')
  })

  it('ninguém na loja: as três barras vazias', async () => {
    await com(presencaVazia())
    expect([largura('olhando'), largura('sacola'), largura('checkout')]).toEqual(['0%', '0%', '0%'])
  })
})

describe('C · Joias sendo vistas agora', () => {
  const joia = (id: string, nome: string, pessoas: number) => ({ id, nome, pessoas, imagens: [`https://exemplo.invalid/${id}.jpg`] })
  const linhas = () => within(bloco('Joias sendo vistas agora')).queryAllByTestId('linha-vista')

  it('mais pessoas primeiro, empate por nome, com o Guia ordenado junto; foto nas joias e o ícone no Guia', async () => {
    await com(
      presenca({
        joias: [joia('p1', 'Pingente Lua', 2), joia('a1', 'Anel Sol', 2), joia('c1', 'Colar Estrela', 3)],
        guia: 2,
      }),
    )
    expect(linhas().map((l) => l.textContent)).toEqual([
      'Colar Estrela3 pessoas',
      'Anel Sol2 pessoas',
      'Guia de envio do material2 pessoas',
      'Pingente Lua2 pessoas',
    ])
    expect(linhas()[0].querySelector('img')!.getAttribute('src')).toBe('https://exemplo.invalid/c1.jpg')
    expect(within(linhas()[2]).getByTestId('icone-do-guia')).toBeInTheDocument()
    expect(linhas()[2].querySelector('img')).toBeNull()
  })

  it('no máximo 5 joias, mais a linha do Guia; "1 pessoa" no singular', async () => {
    await com(
      presenca({
        joias: [joia('a', 'A', 6), joia('b', 'B', 5), joia('c', 'C', 4), joia('d', 'D', 3), joia('e', 'E', 2), joia('f', 'F', 1)],
        guia: 1,
      }),
    )
    expect(linhas().map((l) => l.textContent)).toEqual([
      'A6 pessoas',
      'B5 pessoas',
      'C4 pessoas',
      'D3 pessoas',
      'E2 pessoas',
      'Guia de envio do material1 pessoa',
    ])
  })

  it('sem ninguém numa joia nem no Guia: "Ninguém olhando uma joia agora."', async () => {
    await com(presenca({ joias: [], guia: 0 }))
    expect(bloco('Joias sendo vistas agora')).toHaveTextContent('Ninguém olhando uma joia agora.')
    expect(linhas()).toHaveLength(0)
  })

  it('só gente no Guia: a linha do Guia, e não a frase de ninguém', async () => {
    await com(presenca({ joias: [], guia: 2 }))
    expect(linhas().map((l) => l.textContent)).toEqual(['Guia de envio do material2 pessoas'])
    expect(bloco('Joias sendo vistas agora').textContent).not.toContain('Ninguém olhando')
  })
})

describe('D · De onde vieram', () => {
  const legenda = () => Array.from(within(bloco('De onde vieram')).getByTestId('legenda-das-origens').children) as HTMLElement[]

  it('as faixas com alguém, na ordem fixa; a faixa com zero some; a nota do Direto', async () => {
    await com()
    expect(legenda().map((l) => l.textContent)).toEqual(['Instagram3', 'Google2', 'WhatsApp1', 'Direto1'])
    const barra = within(bloco('De onde vieram')).getByTestId('barra-das-origens')
    expect(Array.from(barra.children).map((s) => (s as HTMLElement).dataset.faixa)).toEqual(['instagram', 'google', 'whatsapp', 'direto'])
    expect((barra.children[0] as HTMLElement).style.flex).toMatch(/^3/)
    expect(legenda().some((l) => temClasse(l, 'col-span-full'))).toBe(false)
    expect(bloco('De onde vieram')).toHaveTextContent('dentro do app do Instagram ou do WhatsApp conta como Direto.')
  })

  it('com as cinco faixas, a quinta ocupa a linha inteira; a legenda é `auto-fit` com piso de 9rem', async () => {
    await com(
      presenca({
        origens: [
          { faixa: 'instagram', n: 2 },
          { faixa: 'google', n: 1 },
          { faixa: 'whatsapp', n: 1 },
          { faixa: 'direto', n: 2 },
          { faixa: 'outros', n: 1 },
        ],
      }),
    )
    expect(legenda().map((l) => l.textContent)).toEqual(['Instagram2', 'Google1', 'WhatsApp1', 'Direto2', 'Outros1'])
    expect(temClasse(legenda()[4], 'col-span-full')).toBe(true)
    expect(legenda().slice(0, 4).some((l) => temClasse(l, 'col-span-full'))).toBe(false)
    const grade = within(bloco('De onde vieram')).getByTestId('legenda-das-origens')
    expect(temClasse(grade, 'grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))]')).toBe(true)
  })

  it('ninguém na loja: "Ninguém na loja agora.", sem barra nem legenda', async () => {
    await com(presencaVazia())
    expect(bloco('De onde vieram')).toHaveTextContent('Ninguém na loja agora.')
    expect(within(bloco('De onde vieram')).queryByTestId('barra-das-origens')).toBeNull()
  })
})

describe('E · No celular', () => {
  it('"6 de 7" e "o resto pelo computador ou tablet"', async () => {
    await com()
    expect(within(bloco('No celular')).getByTestId('no-celular-numero').textContent).toBe('6 de 7')
    expect(bloco('No celular')).toHaveTextContent('o resto pelo computador ou tablet')
  })

  it('todos no celular: sem a segunda linha', async () => {
    await com(presenca({ aparelho: { celular: 7, computador: 0, tablet: 0 } }))
    expect(within(bloco('No celular')).getByTestId('no-celular-numero').textContent).toBe('7 de 7')
    expect(bloco('No celular').textContent).not.toContain('o resto')
  })

  it('ninguém na loja: "Ninguém na loja agora."', async () => {
    await com(presencaVazia({ aparelho: { celular: 0, computador: 0, tablet: 0 } }))
    expect(bloco('No celular')).toHaveTextContent('Ninguém na loja agora.')
    expect(within(bloco('No celular')).queryByTestId('no-celular-numero')).toBeNull()
  })
})

describe('os estados', () => {
  it('carregando: os cinco blocos `aria-busy`, sem número; o `h1` e o título existem', async () => {
    fake.pendurarRpc('store_live')
    await abrir()
    await andar(2000)
    for (const b of BLOCOS) expect(bloco(b)).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByTestId('numero-ao-vivo')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Loja ao vivo')
    expect(document.title).toBe('Loja ao vivo · Ateliê')
  })

  it('a presença em falha: cada bloco diz que não carregou, com o próprio "Tentar de novo" (que relê), e Acessos de pé', async () => {
    let falha = true
    fake.aoChamarRpc('store_live', (): RespostaRpc => (falha ? { data: null, error: REDE } : { data: presenca(), error: null }))
    await abrir()
    await andar(3000)
    for (const b of BLOCOS) {
      expect(within(bloco(b)).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
      expect(within(bloco(b)).getByRole('button', { name: TENTAR_DE_NOVO })).toBeInTheDocument()
    }
    expect(screen.getByRole('group', { name: 'Visitas, hoje, 41' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Loja ao vivo')
    expect(document.title).toBe('Loja ao vivo · Ateliê')
    falha = false
    const antes = leituras()
    // o botão de um bloco do meio relê a MESMA leitura, e os cinco voltam
    fireEvent.click(within(bloco('De onde vieram')).getByRole('button', { name: TENTAR_DE_NOVO }))
    await andar(500)
    expect(leituras()).toBe(antes + 1)
    expect(within(bloco('Agora na loja')).getByTestId('numero-ao-vivo').textContent).toBe('7')
    for (const b of BLOCOS) expect(within(bloco(b)).queryByText(FALHA_DE_LEITURA)).toBeNull()
  })

  it('o contrário: Acessos em falha e os blocos da presença de pé', async () => {
    fake.falharRpc('store_movement', REDE)
    await com()
    await andar(3000)
    expect(within(bloco('Acessos')).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(within(bloco('Agora na loja')).getByTestId('numero-ao-vivo').textContent).toBe('7')
    for (const b of BLOCOS) expect(within(bloco(b)).queryByText(FALHA_DE_LEITURA)).toBeNull()
  })

  it('a loja ainda não medida: o cartão A diz a frase de Acessos, e B–E não aparecem', async () => {
    await com(presencaVazia({ contagem_desde: null }))
    expect(bloco('Agora na loja')).toHaveTextContent('Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br.')
    expect(within(bloco('Agora na loja')).queryByTestId('grafico-30-min')).toBeNull()
    for (const b of BLOCOS.slice(1)) expect(screen.queryByRole('region', { name: b })).toBeNull()
    expect(bloco('Acessos')).toBeInTheDocument()
  })

  it('a recusa (`42501`) de `store_live` cai na vigia: o Login com a frase da `72`, sem número da presença', async () => {
    fake.aoChamarRpc('store_live', () => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await montarApp('/ao-vivo')
    for (let i = 0; i < 20; i++) {
      await andar(100)
      expect(screen.queryByTestId('numero-ao-vivo')).toBeNull()
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})

describe('as releituras', () => {
  it('a cada 15 s só com a aba visível; em segundo plano, nada; de volta ao foco, uma', async () => {
    await com()
    expect(leituras()).toBe(1)
    await andar(14_700)
    expect(leituras()).toBe(1)
    await andar(600)
    expect(leituras()).toBe(2)
    act(() => focusManager.setFocused(false))
    await andar(90_000)
    expect(leituras()).toBe(2)
    act(() => focusManager.setFocused(true))
    await andar(50)
    expect(leituras()).toBe(3)
  })

  it('o puxar relê as duas: `store_live` e `store_movement`', async () => {
    await com()
    const antes = { live: leituras(), mov: fake.chamadasDe('store_movement').length }
    const alvo = screen.getByTestId('cabecalho-ao-vivo')
    fireEvent.touchStart(alvo, { touches: [{ clientY: 10 }] })
    fireEvent.touchMove(alvo, { touches: [{ clientY: 120 }] })
    fireEvent.touchEnd(alvo)
    await andar(50)
    expect(leituras()).toBe(antes.live + 1)
    expect(fake.chamadasDe('store_movement').length).toBe(antes.mov + 1)
  })

  it('o frescor é o da leitura MAIS ANTIGA: com a presença chegando 4 s depois, "há 4 s" e não "agora"', async () => {
    fake.aoChamarRpc(
      'store_live',
      () => new Promise<RespostaRpc>((ok) => setTimeout(() => ok({ data: presenca(), error: null }), 4000)),
    )
    await abrir()
    await andar(4100)
    expect(within(bloco('Agora na loja')).getByTestId('numero-ao-vivo')).toBeInTheDocument()
    expect(screen.getByTestId('frescor-ao-vivo').textContent).toBe('Atualizado há 4 s')
  })
})

describe('sem dado de cliente', () => {
  it('um campo a mais na resposta de `store_live`, com nome e e-mail de cliente, não aparece na tela', async () => {
    const comCliente = {
      ...presenca({ joias: [{ id: 'x', nome: 'Anel Sol', pessoas: 2, imagens: [] }], guia: 1 }),
      cliente: { nome: 'Maria Aparecida Souza', email: 'maria.souza@exemplo.invalid', cidade: 'Canoas' },
      pessoas: [{ nome: 'Joana Lima', email: 'joana@exemplo.invalid' }],
    }
    await com(comCliente as unknown as ReturnType<typeof presenca>)
    expect(within(bloco('Joias sendo vistas agora')).getAllByTestId('linha-vista')).toHaveLength(2)
    const texto = document.body.textContent ?? ''
    for (const proibido of ['Maria', 'Souza', 'maria.souza', 'Canoas', 'Joana', '@exemplo']) expect(texto).not.toContain(proibido)
    expect(document.body.innerHTML).not.toMatch(/exemplo\.invalid(?!\/)/)
  })
})
