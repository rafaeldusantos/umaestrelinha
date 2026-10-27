// Feature `82` · T09 — a MESMA `FolhaDoRastreio`, com `origem="material"` (`ENV-05`, `ENV-06`, `ENV-08`,
// `ENV-09`..`ENV-13`). A porta (`gravarAcao`) é dublada por módulo, como em `FolhaDoRastreio.test.tsx`
// (os casos da `75` ficam lá, intocados): aqui se prova o que a folha do envelope DIZ, o que ela recusa
// sem rede, o que ela manda à porta (`rastreio-do-material`, nunca o `rastreio` de saída), o aviso de
// cada desfecho e quando ela fecha. A fiação pela página real é da T12 (`pages/__tests__/envelopeDaCliente`).
//
// As frases são escritas POR EXTENSO, da spec — nunca lidas das constantes que elas provam.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { LinhaDaLista } from '@/entities/order'
import { linha } from '@/test/pedidos'

import { AvisoDaAcao, esquecerAcoes, lerErro, useAcaoDoPedido, useFolhaNoHistorico } from '../..'
import type { ResultadoDaAcao } from '../../api/gravarAcao'
import FolhaDoRastreio from '../FolhaDoRastreio'

const porta = vi.hoisted(() => ({ gravarAcao: vi.fn() }))
vi.mock('../../api/gravarAcao', () => ({ gravarAcao: porta.gravarAcao }))
vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const ID = '00000000-0000-4000-8000-000000000244'
const AGUARDANDO = linha({ status: 'paid', material_status: 'aguardando_material' })
const A_CAMINHO = linha({ status: 'paid', material_status: 'material_enviado', material_tracking_code: 'QB987654321BR' })

let n = 0
const montarHistorico = () => {
  n += 1
  window.history.pushState({ usr: null, key: `s-${n}`, idx: 0 }, '', `/sentinela-${n}`)
  window.history.pushState({ usr: { doApp: true }, key: `p-${n}`, idx: 1 }, '', `/pedidos/${ID}`)
}

const Abridor = ({ row }: { row: LinhaDaLista }) => {
  const controle = useFolhaNoHistorico(row, 'material')
  const acao = useAcaoDoPedido(row.id)
  return (
    <main>
      <h1>Pedido #0244</h1>
      <button type="button" onClick={controle.abrir}>
        abrir
      </button>
      <FolhaDoRastreio row={row} origem="material" controle={controle} acao={acao} />
      <AvisoDaAcao />
    </main>
  )
}

const montar = (row: LinhaDaLista = AGUARDANDO) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const arvore = (r: LinhaDaLista) => (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Abridor row={r} />
      </BrowserRouter>
    </QueryClientProvider>
  )
  const res = render(arvore(row))
  return { ...res, trocar: (r: LinhaDaLista) => res.rerender(arvore(r)) }
}
const abrir = () => act(() => fireEvent.click(screen.getByRole('button', { name: 'abrir' })))
const folha = () => screen.queryByRole('dialog')
const campo = () => screen.getByLabelText('Código de rastreio do envio da cliente') as HTMLInputElement
const salvar = () => screen.getByRole('button', { name: /^(Salvar|Salvando…)$/ })
const esperar = () => act(() => new Promise<void>((r) => setTimeout(r, 30)))
const digitarESalvar = async (valor = 'an 123456789 br') => {
  fireEvent.change(campo(), { target: { value: valor } })
  await act(async () => {
    fireEvent.click(salvar())
  })
  await esperar()
}

beforeEach(() => {
  esquecerAcoes()
  porta.gravarAcao.mockReset()
  montarHistorico()
})
afterEach(() => act(() => esquecerAcoes()))

describe('o que a folha do envelope diz (ENV-05)', () => {
  it('sem código, aguardando: título, frase com "A caminho" e o e-mail, rótulo, placeholder, campo vazio e os dois botões', async () => {
    montar()
    expect(folha()).toBeNull()
    await abrir()
    expect(screen.getByRole('dialog', { name: 'Código do envelope' })).toBeInTheDocument()
    expect(
      screen.getByText('Use quando Marina mandar o código pelo WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail.'),
    ).toBeInTheDocument()
    expect(campo()).toHaveAttribute('placeholder', 'Ex.: AN123456789BR')
    expect(campo().value).toBe('')
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeInTheDocument()
    expect(salvar()).toHaveTextContent(/^Salvar$/)
    // O rótulo do rastreio de SAÍDA não aparece nesta folha.
    expect(screen.queryByLabelText('Código de rastreio')).toBeNull()
  })

  it('com código, já a caminho: "Alterar código do envelope", a frase curta e o código atual no campo', async () => {
    montar(A_CAMINHO)
    await abrir()
    expect(screen.getByRole('dialog', { name: 'Alterar código do envelope' })).toBeInTheDocument()
    expect(screen.getByText('Use quando Marina mandar o código pelo WhatsApp.')).toBeInTheDocument()
    expect(screen.queryByText(/recebe a confirmação por e-mail/)).toBeNull()
    expect(campo().value).toBe('QB987654321BR')
  })

  // Fase 5 (T20, `BUG-20261026-a-cliente-no-meio-da-frase`): ANTES "Use quando A cliente mandar…".
  it('sem nome da cliente ⇒ "a cliente", em minúscula no meio da frase', async () => {
    montar(linha({ status: 'paid', material_status: 'aguardando_material', customer_name: null }))
    await abrir()
    expect(screen.getByText(/^Use quando a cliente mandar o código pelo WhatsApp\./)).toBeInTheDocument()
  })

  it('o foco vai ao campo ao abrir, e o campo normaliza enquanto ela digita (ENV-06)', async () => {
    montar()
    await abrir()
    await esperar()
    expect(document.activeElement).toBe(campo())
    fireEvent.change(campo(), { target: { value: ' an 123 456 789 br ' } })
    expect(campo().value).toBe('AN123456789BR')
  })

  // QA da `82` (BUG-20261026-codigo-colado-leva-caractere-invisivel): o código colado do WhatsApp com
  // marcas invisíveis (largura zero, direção) chegava ao campo, ao banco, ao link dos Correios e à cópia.
  it('o colado do WhatsApp com caracteres invisíveis chega limpo ao campo e à porta', async () => {
    porta.gravarAcao.mockResolvedValue({ tipo: 'ok', emailSent: false, materialPassou: true } as ResultadoDaAcao)
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: '‪an123456789br​‬' } })
    expect(campo().value).toBe('AN123456789BR')
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(porta.gravarAcao.mock.calls[0][1]).toEqual({ tipo: 'rastreio-do-material', codigo: 'AN123456789BR' })
  })
})

// Fase 5 (T19, `BUG-20261026-codigo-com-hifen-ou-espaco-gravado`): o código do envelope tem uma forma
// só — o hífen e o ponto saem enquanto ela digita (`normalizeMaterialTrackingCode`), e a recusa do curto
// é julgada sobre o código sem eles.
describe('o hífen e o ponto saem do código do envelope (T19)', () => {
  it('digitar `AN-123.456.789-BR` deixa `AN123456789BR` no campo, e é isso que vai à porta', async () => {
    porta.gravarAcao.mockResolvedValue({ tipo: 'ok', emailSent: false, materialPassou: true } as ResultadoDaAcao)
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'an-123.456.789-br' } })
    expect(campo().value).toBe('AN123456789BR')
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(porta.gravarAcao.mock.calls[0][1]).toEqual({ tipo: 'rastreio-do-material', codigo: 'AN123456789BR' })
  })

  it('`AN-12.34` vira `AN1234` e é recusado como curto, sem rede', async () => {
    montar()
    await abrir()
    await digitarESalvar('AN-12.34')
    expect(campo().value).toBe('AN1234')
    expect(screen.getByText('Confira o código — ele costuma ter 13 caracteres.')).toBeInTheDocument()
    expect(porta.gravarAcao).not.toHaveBeenCalled()
  })

  it('o código salvo com hífen (gravado antes do conserto) abre no campo como está, e salva na forma única', async () => {
    porta.gravarAcao.mockResolvedValue({ tipo: 'ok', emailSent: false, materialPassou: false } as ResultadoDaAcao)
    montar(linha({ status: 'paid', material_status: 'material_enviado', material_tracking_code: 'QB-987.654.321-BR' }))
    await abrir()
    await act(async () => {
      fireEvent.click(salvar())
    })
    await esperar()
    expect(porta.gravarAcao.mock.calls[0][1]).toEqual({ tipo: 'rastreio-do-material', codigo: 'QB987654321BR' })
  })
})

describe('o código curto: recusado NO campo, sem rede (ENV-06)', () => {
  it('a frase de `trackingCodeRefusal`, o foco no campo e ZERO chamadas à porta', async () => {
    montar()
    await abrir()
    await digitarESalvar('an 123')
    const frase = screen.getByText('Confira o código — ele costuma ter 13 caracteres.')
    expect(campo()).toHaveAttribute('aria-invalid', 'true')
    expect(campo().getAttribute('aria-describedby')).toBe(frase.id)
    expect(document.activeElement).toBe(campo())
    expect(porta.gravarAcao).not.toHaveBeenCalled()
    expect(folha()).toBeInTheDocument()
  })
})

describe('salvar (ENV-07, ENV-08)', () => {
  it('manda à porta `rastreio-do-material` com o código digitado — nunca o `rastreio` de saída', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false, materialPassou: true })
    montar()
    await abrir()
    await digitarESalvar()
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(porta.gravarAcao.mock.calls[0][0]).toBe(AGUARDANDO)
    expect(porta.gravarAcao.mock.calls[0][1]).toEqual({ tipo: 'rastreio-do-material', codigo: 'AN123456789BR' })
  })

  it('ok que moveu o material: a folha FECHA e o aviso diz "passou para A caminho"', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false, materialPassou: true })
    montar()
    await abrir()
    await digitarESalvar()
    expect(folha()).toBeNull()
    const aviso = screen.getByTestId('aviso-da-acao')
    expect(aviso).toHaveTextContent('Código do envelope registrado.')
    expect(aviso).toHaveTextContent('O pedido #0244 passou para "A caminho".')
  })

  it('ok sem mudança de estado (já a caminho): "Pedido #0244 atualizado."', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: true, materialMudou: false, materialPassou: false })
    montar(A_CAMINHO)
    await abrir()
    await digitarESalvar('AN123456789BR')
    expect(folha()).toBeNull()
    const aviso = screen.getByTestId('aviso-da-acao')
    expect(aviso).toHaveTextContent('Código do envelope registrado.')
    expect(aviso).toHaveTextContent('Pedido #0244 atualizado.')
    expect(aviso).not.toHaveTextContent('A caminho')
  })

  it('no ar: "Salvando…" com `aria-disabled`, um segundo toque não sai, e a folha continua até o sucesso', async () => {
    let soltar: (r: ResultadoDaAcao) => void = () => {}
    porta.gravarAcao.mockImplementationOnce(() => new Promise<ResultadoDaAcao>((ok) => (soltar = ok)))
    montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(salvar()).toHaveTextContent('Salvando…')
    expect(salvar()).toHaveAttribute('aria-disabled', 'true')
    await act(async () => {
      fireEvent.click(salvar())
    })
    expect(porta.gravarAcao).toHaveBeenCalledTimes(1)
    expect(folha()).toBeInTheDocument()
    await act(async () => {
      soltar({ tipo: 'ok', emailSent: false, materialMudou: false, materialPassou: true })
    })
    await esperar()
    expect(folha()).toBeNull()
  })
})

describe('os desfechos que NÃO salvaram: a folha fica, com a frase em `role="alert"` (ENV-09..ENV-11)', () => {
  it.each([
    ['a RPC recusou o código vazio', { tipo: 'material-rastreio-recusado', reason: 'empty_code' }, 'Digite o código do envelope.'],
    ['a RPC disse que o pedido não espera material', { tipo: 'material-rastreio-recusado', reason: 'material_not_applicable' }, 'Este pedido não espera material.'],
    ['a RPC recusou sem motivo', { tipo: 'material-rastreio-recusado', reason: null }, 'Não consegui salvar. Tente de novo.'],
    ['`not_allowed` com o papel de pé (a porta devolve `mudou`, ENV-10)', { tipo: 'mudou' }, 'Este pedido mudou enquanto você olhava.'],
  ] as const)('%s', async (_n, desfecho, frase) => {
    porta.gravarAcao.mockResolvedValueOnce(desfecho)
    montar()
    await abrir()
    await digitarESalvar()
    expect(folha()).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(frase)
    expect(screen.queryByTestId('aviso-da-acao')).toBeNull()
    expect(salvar()).toHaveTextContent(/^Salvar$/)
    // Nenhuma retentativa guardada: reenviar o mesmo código seria recusado de novo.
    expect(lerErro(ID)?.retentativa).toBeNull()
  })

  // Fase 5, T16 (BUG-20261026-rede-cai-ao-salvar-diz-que-nao-salvou): a rede caiu NÃO é recusa — a RPC
  // pode ter gravado. Até a Fase 5 este caso estava na tabela acima, com `retentativa` nula; agora ela
  // guarda o código normalizado, e a folha oferece "Tentar de novo".
  it('a rede caiu (ENV-11): a frase, e "Tentar de novo" que reenvia o MESMO código e fecha no sucesso', async () => {
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'falhou', erro: new Error('rede') })
    montar()
    await abrir()
    await digitarESalvar()
    expect(folha()).toBeInTheDocument()
    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Não consegui salvar. Tente de novo.')
    expect(screen.queryByTestId('aviso-da-acao')).toBeNull()
    expect(salvar()).toHaveTextContent(/^Salvar$/)
    expect(lerErro(ID)?.retentativa).toEqual({ tipo: 'rastreio-do-material', codigo: 'AN123456789BR' })
    porta.gravarAcao.mockResolvedValueOnce({ tipo: 'ok', emailSent: false, materialMudou: false, materialPassou: true })
    await act(async () => {
      fireEvent.click(within(alerta).getByRole('button', { name: 'Tentar de novo' }))
    })
    await esperar()
    expect(porta.gravarAcao).toHaveBeenCalledTimes(2)
    expect(porta.gravarAcao.mock.calls[1][1]).toEqual({ tipo: 'rastreio-do-material', codigo: 'AN123456789BR' })
    expect(folha()).toBeNull()
  })
})

describe('o foco e o fechar (ENV-12, ENV-13)', () => {
  it('"Agora não" fecha, sem rede, e o foco volta a quem abriu', async () => {
    montar()
    const abridor = screen.getByRole('button', { name: 'abrir' })
    act(() => abridor.focus())
    await abrir()
    await esperar()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    })
    await esperar()
    expect(folha()).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(abridor))
    expect(porta.gravarAcao).not.toHaveBeenCalled()
  })

  it('a linha relida deixa de ser editável (o envelope chegou) com a folha aberta ⇒ ela FECHA com "mudou"', async () => {
    const r = montar()
    await abrir()
    expect(folha()).toBeInTheDocument()
    await act(async () => r.trocar(linha({ status: 'paid', material_status: 'material_recebido' })))
    await esperar()
    expect(folha()).toBeNull()
    expect(lerErro(ID)?.frase).toBe('Este pedido mudou enquanto você olhava.')
  })

  it('o pedido cancelado com a folha aberta também a fecha', async () => {
    const r = montar()
    await abrir()
    await act(async () => r.trocar(linha({ status: 'cancelled', payment_status: 'cancelled', material_status: 'aguardando_material' })))
    await esperar()
    expect(folha()).toBeNull()
  })

  it('a linha relida SEGUE editável (a cliente informou um código pela loja) ⇒ a folha fica com o que ela digitou', async () => {
    const r = montar()
    await abrir()
    fireEvent.change(campo(), { target: { value: 'AN123456789BR' } })
    await act(async () =>
      r.trocar(linha({ status: 'paid', material_status: 'material_enviado', material_tracking_code: 'QB987654321BR' })),
    )
    await esperar()
    expect(folha()).toBeInTheDocument()
    expect(campo().value).toBe('AN123456789BR')
    expect(lerErro(ID)).toBeNull()
  })

  it('a folha não abre numa linha que não é editável', async () => {
    montar(linha({ status: 'paid', material_status: 'em_producao' }))
    await abrir()
    expect(folha()).toBeNull()
  })
})
