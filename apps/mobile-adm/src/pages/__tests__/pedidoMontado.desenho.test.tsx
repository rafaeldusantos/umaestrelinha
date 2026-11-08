// O pedido montado pela árvore REAL (`<App />` com sessão admin sobre o dublê do client): o que o
// Histórico diz de cada evento, a faixa e o rodapé da concluída, e o desenho do cartão do link, da
// mensagem e das ações da aberta. As frases e as classes são escritas por extenso (fonte independente
// do código); classe se confere por token exato (`min-h-12` não é `h-12`).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA, ID_ABERTO, ID_PEDIDO, evento, leituraDoMontado, montadoNaLista } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const acao = (a: string) => `order-proposals?action=${a}`
const sempre = (a: string, resposta: () => unknown) =>
  fake.filaDeInvocacao(acao(a), ...Array.from({ length: 40 }, () => () => ({ data: resposta(), error: null })))

const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const temClasse = (el: Element, ...cs: string[]) => cs.every((c) => tokens(el).includes(c))
const semClasse = (el: Element, ...cs: string[]) => cs.every((c) => !tokens(el).includes(c))

let atual: ReturnType<typeof leituraDoMontado>
const abrirMontado = async () => {
  sempre('get', () => atual)
  await montarApp(`/pedidos/montados/${ID_ABERTO}`, { estado: { doApp: true } })
  await andar(50)
}
const historico = () => screen.getByRole('list', { name: 'Histórico do pedido montado' })
const linhasDoHistorico = () => within(historico()).getAllByTestId('evento-do-montado')
const rotulos = () => linhasDoHistorico().map((e) => e.firstChild?.textContent)

beforeEach(() => {
  fake.reset()
  fake.comSessao('adri@exemplo.invalid', { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.stubEnv('VITE_STORE_URL', 'https://loja.exemplo.invalid')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Pedido montado · a tipografia de destaque', () => {
  it('"Total dos itens" em serifa 700 primária a 18 px, e o nome da cliente em serifa 700 a 17 px', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const total = screen.getByTestId('total-dos-itens')
    expect(temClasse(total, 'font-display', 'font-bold', 'text-estrelinha-primary', 'text-lg')).toBe(true)
    const nome = within(document.querySelector<HTMLElement>('[data-cartao="cliente"]')!).getByText('Marina Duarte')
    expect(temClasse(nome, 'font-display', 'font-bold', 'text-[17px]')).toBe(true)
    expect(semClasse(nome, 'text-base', 'font-medium')).toBe(true)
  })
})

describe('Pedido montado · o que o Histórico diz', () => {
  it('renovar, cancelar e aberto pela cliente dizem o que aconteceu com o link, e quem fez', async () => {
    atual = leituraDoMontado({
      state: 'cancelled',
      proposal: {
        events: [
          evento('created', '2026-11-01T12:00:00Z'),
          evento('viewed', '2026-11-02T12:00:00Z'),
          evento('renewed', '2026-11-03T12:00:00Z'),
          evento('cancelled', '2026-11-04T12:00:00Z'),
        ],
      },
    })
    await abrirMontado()
    expect(rotulos()).toEqual([
      'Cancelado por você',
      'Prazo renovado · link novo, o anterior parou de funcionar',
      'Aberto pela cliente',
      'Pedido montado',
    ])
  })

  it('a concluída diz o número do pedido que a cliente fechou', async () => {
    atual = leituraDoMontado({
      state: 'completed',
      proposal: {
        order_id: ID_PEDIDO,
        order_number: '0262',
        events: [evento('created', '2026-11-01T12:00:00Z'), evento('completed', '2026-11-05T12:00:00Z')],
      },
    })
    await abrirMontado()
    expect(rotulos()).toEqual(['Concluído pela cliente · pedido #0262', 'Pedido montado'])
  })

  it('a linha do tempo: um ponto por evento, em ouro só no mais recente, e o fio entre eles', async () => {
    atual = leituraDoMontado({
      proposal: { events: [evento('created', '2026-11-01T12:00:00Z'), evento('link_sent', '2026-11-02T12:00:00Z', 'copy'), evento('viewed', '2026-11-03T12:00:00Z')] },
    })
    await abrirMontado()
    const linhas = linhasDoHistorico()
    const pontos = linhas.map((l) => l.querySelector('[data-parte="ponto"]'))
    expect(pontos.every(Boolean)).toBe(true)
    expect(temClasse(pontos[0]!, 'bg-estrelinha-accent')).toBe(true)
    expect(pontos.slice(1).every((p) => semClasse(p!, 'bg-estrelinha-accent'))).toBe(true)
    // O fio liga um evento ao seguinte: existe em todos menos no último (o mais antigo).
    const fios = linhas.map((l) => l.querySelector('[data-parte="fio"]'))
    expect(fios.slice(0, -1).every(Boolean)).toBe(true)
    expect(fios.at(-1)).toBeNull()
  })
})

describe('Pedido montado · a concluída', () => {
  it('a faixa tem o tom de concluído, raio 12, e "Ver o pedido #0262" fica num rodapé fixo', async () => {
    atual = leituraDoMontado({ state: 'completed', proposal: { order_id: ID_PEDIDO, order_number: '0262' } })
    await abrirMontado()
    const faixa = screen.getByTestId('faixa-do-montado')
    expect(faixa).toHaveTextContent('Marina concluiu no link. O pedido #0262 segue na fila como qualquer pedido da loja.')
    expect(temClasse(faixa, 'bg-estrelinha-done-soft', 'text-estrelinha-done', 'rounded-md')).toBe(true)
    expect(semClasse(faixa, 'bg-estrelinha-ground-deep', 'text-estrelinha-ink', 'rounded-lg')).toBe(true)

    const rodape = screen.getByTestId('rodape-do-montado')
    expect(temClasse(rodape, 'fixed', 'bottom-0', 'inset-x-0', 'bg-estrelinha-surface')).toBe(true)
    const ver = within(rodape).getByRole('link', { name: 'Ver o pedido #0262' })
    expect(ver.getAttribute('href')).toBe(`/pedidos/${ID_PEDIDO}`)
    expect(temClasse(ver, 'bg-estrelinha-primary', 'text-estrelinha-on-primary')).toBe(true)
    // Um só "Ver o pedido" na tela, e a reserva no fim do conteúdo para o rodapé não cobrir o Histórico.
    expect(screen.getAllByRole('link', { name: 'Ver o pedido #0262' })).toHaveLength(1)
    expect(screen.getByTestId('reserva-do-rodape-do-montado')).toBeInTheDocument()
  })

  it('a cancelada continua sem rodapé, e com a faixa neutra', async () => {
    atual = leituraDoMontado({ state: 'cancelled' })
    await abrirMontado()
    expect(screen.queryByTestId('rodape-do-montado')).toBeNull()
    expect(temClasse(screen.getByTestId('faixa-do-montado'), 'bg-estrelinha-ground-deep')).toBe(true)
  })
})

describe('Pedido montado · a aberta segue o protótipo', () => {
  it('o cartão do link: sobretítulo, a caixa do link com borda na fonte do corpo, os dois botões e a nota', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const cartao = screen.getByTestId('cartao-do-link')
    expect(temClasse(cartao, 'p-[18px]')).toBe(true)

    const titulo = within(cartao).getByText('Link para Marina')
    expect(temClasse(titulo, 'text-[11px]', 'font-semibold', 'uppercase')).toBe(true)
    expect(semClasse(titulo, 'font-display', 'font-bold', 'text-base')).toBe(true)

    const link = screen.getByTestId('o-link')
    expect(temClasse(link, 'border', 'border-white/[.12]')).toBe(true)
    expect(semClasse(link, 'font-mono')).toBe(true)

    const whats = within(cartao).getByRole('link', { name: 'Enviar pelo WhatsApp (abre em outra aba)' })
    expect(temClasse(whats, 'bg-estrelinha-whatsapp', 'text-estrelinha-ink', 'font-display', 'font-bold', 'text-[15px]')).toBe(true)
    expect(whats.getAttribute('style')).toBeNull()

    const copiar = within(cartao).getByRole('button', { name: 'Copiar link' })
    expect(temClasse(copiar, 'bg-white/10', 'border', 'border-white/[.12]', 'text-estrelinha-on-primary')).toBe(true)
    expect(semClasse(copiar, 'bg-estrelinha-on-primary', 'text-estrelinha-ink')).toBe(true)

    const nota = within(cartao).getByText('Vale até 12/11. Quem tem o link pode pagar este pedido — não pode ver a conta dela.')
    expect(temClasse(nota, 'text-[13px]', 'font-light')).toBe(true)
  })

  it('a mensagem do WhatsApp numa caixa ground-deep de raio 12', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const mensagem = screen.getByTestId('mensagem-do-whatsapp')
    expect(temClasse(mensagem, 'bg-estrelinha-ground-deep', 'rounded-md')).toBe(true)
  })

  it('a ordem: o link, a mensagem, a cliente, as peças, a observação, o histórico, e as ações por último', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const ordem = [
      screen.getByTestId('cartao-do-link'),
      screen.getByTestId('mensagem-do-whatsapp'),
      screen.getByTestId('endereco-do-montado'),
      screen.getAllByTestId('peca-do-montado')[0],
      screen.getByTestId('observacao-do-montado'),
      historico(),
      screen.getByRole('button', { name: 'Editar' }),
      screen.getByRole('button', { name: 'Cancelar este pedido' }),
    ]
    for (let i = 1; i < ordem.length; i++) {
      expect(ordem[i - 1].compareDocumentPosition(ordem[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('"Editar" é secundário e "Cancelar este pedido" é texto centrado, um embaixo do outro', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const editar = screen.getByRole('button', { name: 'Editar' })
    const cancelar = screen.getByRole('button', { name: 'Cancelar este pedido' })
    expect(temClasse(editar, 'border', 'border-estrelinha-primary', 'text-estrelinha-primary', 'w-full')).toBe(true)
    expect(semClasse(editar, 'bg-estrelinha-ink', 'text-estrelinha-on-primary')).toBe(true)
    expect(temClasse(cancelar, 'bg-transparent', 'text-center', 'w-full', 'text-estrelinha-alert')).toBe(true)
    expect(semClasse(cancelar, 'border', 'border-estrelinha-alert')).toBe(true)
    // Empilhados: o contêiner é uma coluna, não a grade que os punha lado a lado.
    const caixa = editar.parentElement!
    expect(caixa).toBe(cancelar.parentElement)
    expect(temClasse(caixa, 'flex', 'flex-col')).toBe(true)
    expect(tokens(caixa).some((c) => c.startsWith('grid'))).toBe(false)
    // Os dois continuam funcionando: o cancelar abre a folha.
    await act(async () => {
      fireEvent.click(cancelar)
    })
    await andar(50)
    expect(screen.getByRole('dialog', { name: 'Cancelar P-0042?' })).toBeInTheDocument()
  })
})

describe('Pedido montado · as medidas do protótipo', () => {
  it('a foto da peça é 48 × 60', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    const fotos = screen.getAllByTestId('peca-do-montado').map((p) => within(p).getByTestId('foto-da-peca'))
    expect(fotos.length).toBeGreaterThan(0)
    for (const foto of fotos) {
      expect(foto.style.width).toBe('48px')
      expect(foto.style.height).toBe('60px')
    }
  })

  it('"Manter" da folha de cancelar é o secundário, com contorno', async () => {
    atual = leituraDoMontado()
    await abrirMontado()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar este pedido' }))
    })
    await andar(50)
    const manter = within(screen.getByRole('dialog', { name: 'Cancelar P-0042?' })).getByRole('button', { name: 'Manter' })
    expect(temClasse(manter, 'border', 'border-estrelinha-primary', 'text-estrelinha-primary', 'min-h-12')).toBe(true)
  })

  it('o cartão de Montados tem 10 px entre as partes (`gap-2.5`, nunca `gap-2`)', async () => {
    sempre('list', () => ({ proposals: [montadoNaLista()], agora: AGORA }))
    await montarApp('/pedidos?visao=montados')
    await andar(50)
    const [cartao] = screen.getAllByTestId('cartao-do-montado')
    expect(temClasse(cartao, 'flex', 'flex-col', 'gap-2.5')).toBe(true)
    expect(semClasse(cartao, 'gap-2')).toBe(true)
  })
})
