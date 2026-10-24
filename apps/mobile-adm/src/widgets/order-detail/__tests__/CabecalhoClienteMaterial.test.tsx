// Feature `74` · T22 — o cabeçalho, o próximo passo, o cliente e o material do detalhe
// (`MAP-20`..`MAP-23`, `MAP-42`, `MAP-43`, E7, A18, A20..A23).
//
// O aparelho fica em UTC de propósito: a data da compra tem de sair no dia de BRASÍLIA, e um
// `created_at` às 02h30 UTC é a noite anterior em Porto Alegre — ler o fuso do aparelho daria o dia
// seguinte. "Há quanto tempo" é contra o `lido_em` do servidor, nunca o relógio do aparelho.
process.env.TZ = 'UTC'

import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Destino from '@/test/Destino'
import { detalhe } from '@/test/pedidos'
import BlocoCliente from '../ui/BlocoCliente'
import BlocoMaterial from '../ui/BlocoMaterial'
import CabecalhoDoPedido from '../ui/CabecalhoDoPedido'
import ProximoPasso from '../ui/ProximoPasso'

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
/** 02h30 UTC de 21/10 é 23h30 de 20/10 em Brasília. */
const NOITE_EM_BRASILIA = '2026-10-21T02:30:00.000000+00:00'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

type Entrada = string | { pathname: string; state?: unknown }
const montar = (no: ReactNode, entradas: Entrada[] = ['/pedidos/x'], indice = entradas.length - 1) =>
  render(
    <MemoryRouter initialEntries={entradas} initialIndex={indice}>
      <Routes>
        <Route path="/pedidos/:id" element={no} />
        <Route path="*" element={<Destino />} />
      </Routes>
    </MemoryRouter>,
  )

describe('o cabeçalho (MAP-20, MAP-46)', () => {
  it('"Pedido #0244", o selo na voz do ateliê e a data de BRASÍLIA com há quanto tempo contra o `lido_em`', () => {
    montar(<CabecalhoDoPedido pedido={detalhe({ created_at: NOITE_EM_BRASILIA, material_status: 'aguardando_material' })} lidoEm={LIDO_EM} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pedido #0244')
    expect(document.querySelector('[data-parte="data"]')?.textContent).toBe('20 out · há 2 dias')
    expect(document.querySelector('[data-situation]')?.textContent).toBe('Aguardando material')
  })

  it('sem o pedido (lendo, falha, não encontrei): o `h1` diz "Pedido", e o "Voltar" existe (E5)', () => {
    montar(<CabecalhoDoPedido />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Pedido')
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument()
    expect(document.querySelector('[data-parte="data"]')).toBeNull()
  })

  it('"Voltar" com 44 px (token exato)', () => {
    montar(<CabecalhoDoPedido />)
    expect(tokens(screen.getByRole('button', { name: 'Voltar' }))).toEqual(expect.arrayContaining(['min-h-11', 'min-w-11']))
  })

  it('vindo de dentro do app (`state.doApp`): "Voltar" volta UMA entrada — ao recorte de onde veio (E7)', () => {
    montar(<CabecalhoDoPedido />, ['/', '/pedidos?bloco=sem-rastreio', { pathname: '/pedidos/x', state: { doApp: true } }])
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByTestId('destino').textContent).toBe('/pedidos?bloco=sem-rastreio')
  })

  it('sem histórico do app (link colado, F5): "Voltar" vai à lista, e não à entrada anterior do navegador', () => {
    montar(<CabecalhoDoPedido />, ['/', '/pedidos/x'])
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(screen.getByTestId('destino').textContent).toBe('/pedidos')
  })
})

describe('o próximo passo (MAP-21, A18)', () => {
  it('o `label` de `nextStep` e a frase de `rowSummary`, sem botão e sem o motivo que manda avançar', () => {
    montar(<ProximoPasso pedido={detalhe({ status: 'paid', material_status: 'aguardando_material' })} />)
    const caixa = screen.getByTestId('proximo-passo')
    expect(caixa.textContent).toBe('Próximo passo: Em SeparaçãoEsperando o envelope da cliente')
    expect(document.body.textContent).not.toMatch(/Você pode avançar/)
    expect(document.body.textContent).not.toMatch(/Disponível quando/)
    expect(within(caixa).queryByRole('button')).toBeNull()
  })

  it('entregue: "Pedido concluído", sem frase (a regra devolve vazio)', () => {
    montar(<ProximoPasso pedido={detalhe({ status: 'delivered', tracking_code: 'BR1' })} />)
    expect(screen.getByTestId('proximo-passo').textContent).toBe('Pedido concluído')
  })

  it('retirada em separação: "Próximo passo: Retirado no escritório"', () => {
    montar(<ProximoPasso pedido={detalhe({ status: 'separating', shipping_service_id: 'retirada' })} />)
    expect(screen.getByTestId('proximo-passo').textContent).toBe('Próximo passo: Retirado no escritórioEm separação')
  })
})

describe('o cliente (MAP-22, A20, A21)', () => {
  it('nome, ordinal, e-mail, telefone e "WhatsApp" para `wa.me`, em aba nova e sem `opener`', () => {
    montar(<BlocoCliente pedido={detalhe({ purchase_ordinal: 3, customer_phone: '51999990000' })} />)
    const bloco = screen.getByRole('region', { name: 'Cliente' })
    expect(within(bloco).getByText('Marina Duarte')).toBeInTheDocument()
    expect(within(bloco).getByText('3ª compra')).toBeInTheDocument()
    expect(within(bloco).getByText('marina@exemplo.invalid')).toBeInTheDocument()
    expect(bloco.querySelector('[data-parte="telefone"]')?.textContent).toBe('(51) 99999-0000')
    const zap = within(bloco).getByRole('link', { name: 'WhatsApp (abre em outra aba)' })
    expect(zap).toHaveAttribute('href', 'https://wa.me/5551999990000')
    expect(zap).toHaveAttribute('target', '_blank')
    expect(zap).toHaveAttribute('rel', 'noopener noreferrer')
    expect(tokens(zap)).toContain('min-h-11')
  })

  it('telefone gravado com +55 sai igual, e o link aponta para o mesmo número', () => {
    montar(<BlocoCliente pedido={detalhe({ customer_phone: '+55 (51) 99999-0000' })} />)
    expect(document.querySelector('[data-parte="telefone"]')?.textContent).toBe('(51) 99999-0000')
    expect(screen.getByRole('link', { name: 'WhatsApp (abre em outra aba)' })).toHaveAttribute('href', 'https://wa.me/5551999990000')
  })

  it.each([null, '', '1234-5'])('sem telefone válido (%j): nem o telefone nem o "WhatsApp"', (fone) => {
    montar(<BlocoCliente pedido={detalhe({ customer_phone: fone })} />)
    expect(document.querySelector('[data-parte="telefone"]')).toBeNull()
    expect(screen.queryByRole('link', { name: 'WhatsApp (abre em outra aba)' })).toBeNull()
  })

  it('sem nome: o e-mail no lugar do nome; primeira compra também diz a ordinal', () => {
    montar(<BlocoCliente pedido={detalhe({ customer_name: null, purchase_ordinal: 1 })} />)
    expect(document.querySelector('[data-parte="nome"]')?.textContent).toBe('marina@exemplo.invalid')
    expect(document.querySelector('[data-parte="ordinal"]')?.textContent).toBe('1ª compra')
  })

  it('"Ver cliente" não aparece (A20): nenhum link além do WhatsApp', () => {
    montar(<BlocoCliente pedido={detalhe()} />)
    expect(screen.queryByText(/Ver cliente/)).toBeNull()
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['WhatsApp'])
  })
})

describe('o material (MAP-23, A22, A23)', () => {
  // O relógio do aparelho fica LONGE do `lido_em` (G1 da verificação r1): sem isto, no dia seguinte
  // ao `LIDO_EM` o relógio real dava as mesmas frases, e a asserção era decidida pelo calendário —
  // ler `new Date()` no lugar do `lido_em` sobrevivia. Em 2027 o aparelho diria "há 70 dias".
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  const passos = () => within(screen.getByRole('list', { name: 'Passos do material' })).getAllByRole('listitem')
  const estados = () => passos().map((p) => [p.textContent, p.getAttribute('data-estado'), p.getAttribute('aria-current')])

  it.each([
    ['aguardando_material', 'Aguardando material', [['Aguardando', 'atual', 'step'], ['A caminho', 'depois', null], ['Recebido', 'depois', null], ['Em produção', 'depois', null]]],
    ['material_enviado', 'Material a caminho', [['Aguardando', 'feito', null], ['A caminho', 'atual', 'step'], ['Recebido', 'depois', null], ['Em produção', 'depois', null]]],
    ['material_recebido', 'Material recebido', [['Aguardando', 'feito', null], ['A caminho', 'feito', null], ['Recebido', 'atual', 'step'], ['Em produção', 'depois', null]]],
    ['em_producao', 'Em produção', [['Aguardando', 'feito', null], ['A caminho', 'feito', null], ['Recebido', 'feito', null], ['Em produção', 'atual', 'step']]],
  ])('%s: o título "%s" e os quatro passos com o atual marcado', (material_status, titulo, esperado) => {
    montar(<BlocoMaterial pedido={detalhe({ status: 'paid', material_status })} lidoEm={LIDO_EM} />)
    expect(screen.getByRole('region', { name: 'Material afetivo' })).toBeInTheDocument()
    expect(document.querySelector('[data-parte="titulo-do-material"]')?.textContent).toBe(titulo)
    expect(estados()).toEqual(esperado)
  })

  it.each(['shipped', 'delivered'])('pedido %s: "Material usado na joia" e os quatro feitos, nenhum atual', (status) => {
    montar(<BlocoMaterial pedido={detalhe({ status, material_status: 'em_producao', tracking_code: 'BR1' })} lidoEm={LIDO_EM} />)
    expect(document.querySelector('[data-parte="titulo-do-material"]')?.textContent).toBe('Material usado na joia')
    expect(estados().map(([, e, c]) => [e, c])).toEqual([['feito', null], ['feito', null], ['feito', null], ['feito', null]])
  })

  it('sem material (`nao_aplicavel`): o bloco não existe', () => {
    montar(<BlocoMaterial pedido={detalhe({ material_status: 'nao_aplicavel' })} lidoEm={LIDO_EM} />)
    expect(screen.queryByRole('region', { name: 'Material afetivo' })).toBeNull()
  })

  it.each([
    [{ material_tracking_code: 'AA123BR', material_received_at: '2026-10-22T14:30:00Z' }, 'Rastreio do envelope: AA123BR'],
    [{ material_tracking_code: null, material_received_at: '2026-10-22T14:30:00Z' }, 'Recebido há 1 dia'],
    [{ material_tracking_code: null, material_received_at: null, created_at: '2026-10-20T14:00:00Z' }, 'Pedido feito há 3 dias'],
  ])('a linha sob o título (A23), contra o `lido_em`: %j ⇒ "%s"', (extra, linha) => {
    montar(<BlocoMaterial pedido={detalhe({ material_status: 'material_recebido', ...extra })} lidoEm={LIDO_EM} />)
    expect(document.querySelector('[data-parte="linha-do-material"]')?.textContent).toBe(linha)
  })
})
