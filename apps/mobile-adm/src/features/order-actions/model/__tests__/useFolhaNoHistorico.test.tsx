// Feature `75` · T20 — a folha do rastreio no HISTÓRICO (design §3.8; `MAA-26`, `MAA-32`, A23, TQ7).
//
// O voltar do Android fecha a folha sem sair do pedido: abrir empurra uma entrada com o MESMO endereço
// e o marcador só no `state`. O roteador é o de verdade (`BrowserRouter` sobre o histórico do jsdom), e
// o histórico de cada caso é MONTADO PELO PRÓPRIO TESTE — uma entrada-sentinela única antes do pedido —,
// porque no jsdom o histórico sobrevive entre os casos de um arquivo (`L-053`) e o arnês de montagem
// não pode sobrescrever o estado que o caso gravou (`L-052`).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act, render, waitFor } from '@testing-library/react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinhaDaLista } from '@/entities/order'
import { linha } from '@/test/pedidos'

import { esquecerAcoes, lerErro } from '../..'
import { useFolhaNoHistorico, type FolhaNoHistorico } from '../useFolhaNoHistorico'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const ID = '00000000-0000-4000-8000-000000000244'
const CAMINHO = `/pedidos/${ID}`
const BUSCA = '?de=lista'
const SEPARANDO = linha({ status: 'separating' })

let n = 0
/** O histórico do caso: uma sentinela única e, por cima, o pedido aberto de dentro do app. */
const montarHistorico = (estadoDoPedido: unknown = { usr: { doApp: true }, key: 'pedido', idx: 1 }) => {
  n += 1
  window.history.pushState({ usr: null, key: `sentinela-${n}`, idx: 0 }, '', `/sentinela-${n}`)
  window.history.pushState(estadoDoPedido, '', `${CAMINHO}${BUSCA}`)
  return { sentinela: `/sentinela-${n}`, tamanho: window.history.length }
}

type Sonda = { atual: FolhaNoHistorico; location: ReturnType<typeof useLocation> }
const Usuario = ({ row, origem, sonda }: { row: LinhaDaLista; origem: 'acao' | 'entrega'; sonda: Sonda }) => {
  const folha = useFolhaNoHistorico(row, origem)
  const location = useLocation()
  sonda.atual = folha
  sonda.location = location
  return null
}
const montar = (row: LinhaDaLista = SEPARANDO, origem: 'acao' | 'entrega' = 'acao') => {
  const sonda = {} as Sonda
  const r = render(
    <BrowserRouter>
      <Usuario row={row} origem={origem} sonda={sonda} />
    </BrowserRouter>,
  )
  return {
    sonda,
    trocarLinha: (nova: LinhaDaLista) =>
      r.rerender(
        <BrowserRouter>
          <Usuario row={nova} origem={origem} sonda={sonda} />
        </BrowserRouter>,
      ),
  }
}
/** Um tempo de relógio fora do `act` da ação: os efeitos rodam no FIM do `act`, e o voltar que eles
 * pedem é uma tarefa do jsdom que precisa de outro `act` para acontecer. */
const esperar = () => act(() => new Promise<void>((r) => setTimeout(r, 20)))
const marcadorAgora = () => (window.history.state as { usr?: { folhaDoRastreio?: string } }).usr?.folhaDoRastreio
const voltar = async () => {
  await act(async () => {
    window.history.back()
    await new Promise((r) => setTimeout(r, 20))
  })
}

beforeEach(() => esquecerAcoes())

describe('abrir e o voltar do Android (MAA-32, A23)', () => {
  it('abrir EMPURRA uma entrada: `history.length` +1, mesmo endereço, `doApp` preservado, folha aberta', async () => {
    const { tamanho } = montarHistorico()
    const { sonda } = montar()
    expect(sonda.atual.aberta).toBe(false)
    act(() => sonda.atual.abrir())
    expect(window.history.length).toBe(tamanho + 1)
    expect(window.location.pathname).toBe(CAMINHO)
    expect(window.location.search).toBe(BUSCA)
    expect((sonda.location.state as { doApp?: boolean }).doApp).toBe(true)
    expect(sonda.atual.aberta).toBe(true)
    expect(sonda.atual.folha?.modo).toBe('enviar')
  })

  it('o voltar FECHA a folha e devolve à entrada que o próprio teste montou — sem sair do pedido', async () => {
    const { sentinela } = montarHistorico()
    const { sonda } = montar()
    act(() => sonda.atual.abrir())
    await voltar()
    expect(sonda.atual.aberta).toBe(false)
    expect(window.location.pathname).toBe(CAMINHO)
    expect(window.history.state).toMatchObject({ key: 'pedido', usr: { doApp: true } })
    // E o voltar SEGUINTE sai do pedido para a sentinela: a folha ocupou exatamente uma entrada.
    await voltar()
    expect(window.location.pathname).toBe(sentinela)
  })

  it('`fechar()` consome a entrada da folha (é um voltar), e não empurra outra', async () => {
    const { tamanho, sentinela } = montarHistorico()
    const { sonda } = montar()
    act(() => sonda.atual.abrir())
    await act(async () => {
      sonda.atual.fechar()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(sonda.atual.aberta).toBe(false)
    expect(window.history.state).toMatchObject({ key: 'pedido' })
    expect(window.history.length).toBe(tamanho + 1)
    await voltar()
    expect(window.location.pathname).toBe(sentinela)
  })

  it('`fechar()` com a folha fechada não mexe no histórico', async () => {
    const { sentinela } = montarHistorico()
    const { sonda } = montar()
    await act(async () => {
      sonda.atual.fechar()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(window.location.pathname).toBe(CAMINHO)
    await voltar()
    expect(window.location.pathname).toBe(sentinela)
  })

  it('a folha só está aberta para QUEM a abriu: outro usuário da MESMA folha, no mesmo roteador, não a vê aberta', async () => {
    montarHistorico()
    const a = {} as Sonda
    const b = {} as Sonda
    render(
      <BrowserRouter>
        <Usuario row={SEPARANDO} origem="acao" sonda={a} />
        <Usuario row={SEPARANDO} origem="acao" sonda={b} />
      </BrowserRouter>,
    )
    act(() => a.atual.abrir())
    expect(marcadorAgora()).toBe(`${ID}:acao:enviar`)
    expect(a.atual.aberta).toBe(true)
    expect(b.atual.aberta).toBe(false)
  })

  it('o AVANÇAR depois do voltar não reabre a folha: a entrada volta, mas ela não foi aberta de novo', async () => {
    montarHistorico()
    const { sonda } = montar()
    act(() => sonda.atual.abrir())
    await voltar()
    await act(async () => {
      window.history.forward()
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(marcadorAgora()).toBe(`${ID}:acao:enviar`)
    expect(sonda.atual.aberta).toBe(false)
  })
})

describe('F5 com a folha aberta (TQ7)', () => {
  // B01 (prova em navegador da T31): a primeira escrita deste caso montava o histórico como
  // [sentinela, pedido COM marcador] — um histórico que o app nunca produz. Abrir a folha EMPURRA a
  // entrada do marcador por cima da entrada do pedido SEM ele, então o histórico real do F5 é
  // [sentinela, pedido, pedido COM marcador]. Sobre ele, o `replace` deixava [sentinela, pedido, pedido]
  // e o primeiro voltar ficava no mesmo pedido — o "voltar morto" que A23 proíbe (medido no Chromium:
  // `history.back()` depois do F5 ficou em `/pedidos/<id>`). As asserções são as mesmas; só o histórico
  // passou a ser o que o app produz.
  it('montar com o marcador e sem a referência (o F5) ⇒ a entrada SAI: `history.length` igual, folha fechada, `doApp` mantido, e o primeiro voltar sai do pedido', async () => {
    const { sentinela } = montarHistorico()
    window.history.pushState({ usr: { doApp: true, folhaDoRastreio: `${ID}:acao:enviar` }, key: 'recarregada', idx: 2 }, '', `${CAMINHO}${BUSCA}`)
    const tamanho = window.history.length
    const { sonda } = montar()
    await waitFor(() => expect((window.history.state as { usr?: Record<string, unknown> }).usr).toEqual({ doApp: true }))
    expect(window.history.length).toBe(tamanho)
    expect(sonda.atual.aberta).toBe(false)
    expect(window.location.pathname).toBe(CAMINHO)
    expect(window.location.search).toBe(BUSCA)
    // Sem voltar morto: o voltar sai do pedido.
    await voltar()
    expect(window.location.pathname).toBe(sentinela)
  })

  // B01, segunda metade (reteste no Chromium): o detalhe monta DOIS usuários da folha do MESMO pedido
  // — o rodapé (`acao`) e "Informar/Alterar" da Entrega (`entrega`). Com o voltar no lugar do
  // `replace`, os dois reconheciam o marcador pelo id e voltavam DUAS vezes: o F5 levava à lista.
  it('F5 com o rodapé E a Entrega montados: só a origem do marcador volta — uma entrada, e o pedido fica', async () => {
    const { sentinela } = montarHistorico()
    window.history.pushState({ usr: { doApp: true, folhaDoRastreio: `${ID}:acao:enviar` }, key: 'recarregada', idx: 2 }, '', `${CAMINHO}${BUSCA}`)
    // No jsdom dois `history.go(-1)` no mesmo tique caem na MESMA entrada; no Chromium eles se somam
    // (medido: o F5 levou à lista). A régua é o número de voltas pedidas, não onde o jsdom pousou.
    const go = vi.spyOn(window.history, 'go')
    const sondaAcao = {} as Sonda
    const sondaEntrega = {} as Sonda
    render(
      <BrowserRouter>
        <Usuario row={SEPARANDO} origem="acao" sonda={sondaAcao} />
        <Usuario row={SEPARANDO} origem="entrega" sonda={sondaEntrega} />
      </BrowserRouter>,
    )
    await waitFor(() => expect((window.history.state as { usr?: Record<string, unknown> }).usr).toEqual({ doApp: true }))
    await new Promise((r) => setTimeout(r, 60))
    expect(window.location.pathname).toBe(CAMINHO)
    expect(window.location.search).toBe(BUSCA)
    expect((window.history.state as { key?: string }).key).toBe('pedido')
    expect(sondaAcao.atual.aberta).toBe(false)
    expect(go.mock.calls).toEqual([[-1]])
    go.mockRestore()
    await voltar()
    expect(window.location.pathname).toBe(sentinela)
  })

  it('o marcador de OUTRO pedido não é tocado (a lista monta um usuário por cartão)', async () => {
    montarHistorico({ usr: { doApp: true, folhaDoRastreio: 'outro-pedido:acao:enviar' }, key: 'k', idx: 1 })
    montar()
    await new Promise((r) => setTimeout(r, 20))
    expect((window.history.state as { usr?: Record<string, unknown> }).usr).toEqual({ doApp: true, folhaDoRastreio: 'outro-pedido:acao:enviar' })
  })
})

describe('o pedido muda com a folha aberta (MAA-26)', () => {
  it('de `separating` para `cancelled` ⇒ a folha FECHA (a entrada sai) e o erro do pedido é ORDER_CHANGED', async () => {
    const { sentinela } = montarHistorico()
    const { sonda, trocarLinha } = montar()
    act(() => sonda.atual.abrir())
    act(() => trocarLinha(linha({ status: 'cancelled', payment_status: 'cancelled' })))
    await esperar()
    expect(sonda.atual.aberta).toBe(false)
    expect(sonda.atual.folha).toBeNull()
    expect(window.history.state).toMatchObject({ key: 'pedido' })
    expect(lerErro(ID)).toEqual({ frase: 'Este pedido mudou enquanto você olhava.', retentativa: null })
    await voltar()
    expect(window.location.pathname).toBe(sentinela)
  })

  it('o MODO muda (pela entrega: `shipped` sem código → com código, "salvar" → "alterar") ⇒ fecha e ORDER_CHANGED', async () => {
    montarHistorico()
    const { sonda, trocarLinha } = montar(linha({ status: 'shipped', tracking_code: null }), 'entrega')
    expect(sonda.atual.folha?.modo).toBe('salvar')
    act(() => sonda.atual.abrir())
    act(() => trocarLinha(linha({ status: 'shipped', tracking_code: 'BR123456789BR' })))
    await esperar()
    expect(sonda.atual.aberta).toBe(false)
    expect(window.history.state).toMatchObject({ key: 'pedido' })
    expect(lerErro(ID)?.frase).toBe('Este pedido mudou enquanto você olhava.')
  })

  it('a linha relida no MESMO modo (outro campo mudou) mantém a folha aberta e não põe erro', async () => {
    montarHistorico()
    const { sonda, trocarLinha } = montar()
    act(() => sonda.atual.abrir())
    act(() => trocarLinha(linha({ status: 'separating', customer_name: 'Marina D.' })))
    await esperar()
    expect(sonda.atual.aberta).toBe(true)
    expect(marcadorAgora()).toBe(`${ID}:acao:enviar`)
    expect(lerErro(ID)).toBeNull()
  })
})

describe('o endereço tem um dono só (MAP-04)', () => {
  it('o hook não chama `pedidosHref` nem escreve na query', () => {
    const fonte = readFileSync(resolve(__dirname, '../useFolhaNoHistorico.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
    expect(fonte).toContain('useNavigate')
    expect(fonte).not.toMatch(/pedidosHref|useSearchParams|setSearchParams|URLSearchParams/)
  })

})
