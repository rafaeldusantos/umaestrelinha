// Feature 61 — a seção Analytics de `/admin/google`, montada inteira (`ANL-03`..`ANL-11`).
//
// O painel é montado de verdade — os três subcartões (`AnalyticsSecretField`, `LastPurchaseCard`,
// `SecretHelpCard`) inclusive. Dublados ficam só os hooks de dado: as configurações (`core`), a
// gravação, e os dois hooks da feature, que têm suíte própria em `model/__tests__`.
//
// As réguas que mais importam:
// - **a gravação ESPALHA o valor atual** — igualdade EXATA do payload, porque `production_host` não
//   está na tela e uma gravação montada do zero o apagaria (`toMatchObject` passaria com ele fora);
// - **recusa se prova pela AUSÊNCIA da chamada**, não pela frase: uma frase de erro com a escrita
//   acontecendo atrás deixaria o ID inválido gravado;
// - **o valor da chave não fica no DOM** depois de guardado (`ANL-05`).

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MEASUREMENT_ID_REFUSAL } from '@estrelinha/core/analytics'

const cfg = vi.hoisted(() => ({
  atual: { enabled: false, measurement_id: 'G-SQL517XDQZ', production_host: 'umaestrelinha.com.br' },
}))
const salvar = vi.hoisted(() =>
  vi.fn(async (_input: { key: string; value: Record<string, unknown> }) => {}),
)
const segredo = vi.hoisted(() => ({
  estado: {
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null as unknown,
    data: { secret_configured: true, secret_updated_at: '2026-10-05T15:00:00.000Z' } as
      | { secret_configured: boolean; secret_updated_at: string | null }
      | undefined,
    refetch: vi.fn(),
  },
  save: vi.fn(async (_s: string): Promise<string | null> => null),
}))
const envios = vi.hoisted(() => ({
  estado: {
    isLoading: false,
    isError: false,
    data: { last: null, declined: 0, failed: 0 } as unknown,
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useAnalyticsSettings: () => cfg.atual,
  useUpdateSettings: () => ({ mutateAsync: salvar, isPending: false }),
}))
vi.mock('../../model/useAnalyticsSecret', () => ({
  useAnalyticsSecretStatus: () => segredo.estado,
  useSaveAnalyticsSecret: () => ({ save: segredo.save, saving: false }),
}))
vi.mock('../../model/useLastPurchaseSend', () => ({
  useLastPurchaseSend: () => envios.estado,
}))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AnalyticsPanel, { MISSING_ID_REFUSAL } from '../AnalyticsPanel'
import { SECRET_EMPTY_REFUSAL } from '../AnalyticsSecretField'
import { SECRET_HELP_ID } from '../SecretHelpCard'
import { SECRET_HELP_STEPS } from '../../model/copy'
import { declinedSentence, failedSentence, formatSentAt } from '../../model/copy'

const COMPLETO = { enabled: false, measurement_id: 'G-SQL517XDQZ', production_host: 'umaestrelinha.com.br' }

beforeEach(() => {
  salvar.mockReset()
  salvar.mockImplementation(async () => {})
  cfg.atual = { ...COMPLETO }
  segredo.save.mockReset()
  segredo.save.mockImplementation(async () => null)
  segredo.estado = {
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
    data: { secret_configured: true, secret_updated_at: '2026-10-05T15:00:00.000Z' },
    refetch: vi.fn(),
  }
  envios.estado = { isLoading: false, isError: false, data: { last: null, declined: 0, failed: 0 } }
})

const campoId = () => screen.getByLabelText('ID de medição') as HTMLInputElement
const botaoSalvar = () => screen.getByTestId('analytics-save')

// ============================================================================ T22 — estado e ID

describe('o cartão de estado (ANL-04, ANL-08)', () => {
  it('desligada, diz "Medição desligada" e o que isso significa', () => {
    renderPainel()
    expect(screen.getByRole('heading', { name: 'Medição desligada' })).toBeTruthy()
    expect(screen.getByText(/não carrega o Google Analytics/)).toBeTruthy()
    expect((screen.getByRole('switch') as HTMLElement).getAttribute('aria-checked')).toBe('false')
  })

  it('ligada, diz "Medição ligada" e lembra que quem recusa deixa de ser medida', () => {
    cfg.atual = { ...COMPLETO, enabled: true }
    renderPainel()
    expect(screen.getByRole('heading', { name: 'Medição ligada' })).toBeTruthy()
    expect(screen.getByText(/deixa de ser medida/)).toBeTruthy()
  })

  it('ligar grava `enabled: true` ESPALHANDO o valor atual — `production_host` sobrevive', async () => {
    renderPainel()
    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    // Igualdade EXATA: `toMatchObject` aprovaria um payload sem `production_host`.
    expect(salvar.mock.calls[0][0]).toEqual({
      key: 'analytics',
      value: { enabled: true, measurement_id: 'G-SQL517XDQZ', production_host: 'umaestrelinha.com.br' },
    })
  })

  it('desligar grava `enabled: false` preservando os outros dois campos (ANL-08)', async () => {
    cfg.atual = { ...COMPLETO, enabled: true }
    renderPainel()
    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(salvar.mock.calls[0][0]).toEqual({ key: 'analytics', value: { ...COMPLETO, enabled: false } })
  })

  it('ANL-04: ligar SEM ID válido gravado é recusado, com a frase, e NADA é gravado', async () => {
    cfg.atual = { ...COMPLETO, measurement_id: '' }
    renderPainel()
    fireEvent.click(screen.getByRole('switch'))
    // O texto é o LITERAL da spec (ANL-04), escrito por extenso — comparar com a constante importada
    // mediria o componente contra si mesmo, e trocar a segunda frase passaria verde.
    expect((await screen.findByTestId('analytics-enable-refusal')).textContent).toBe(
      'Falta o ID de medição. Grave um ID válido no campo abaixo antes de ligar.',
    )
    expect(MISSING_ID_REFUSAL).toBe('Falta o ID de medição. Grave um ID válido no campo abaixo antes de ligar.')
    expect(salvar).not.toHaveBeenCalled()
  })

  it('ANL-04: a régua é sobre o ID GRAVADO — um rascunho válido no campo não destrava o ligar', async () => {
    // Ligar com o gravado inválido faria a loja ler o inválido e não medir nada.
    cfg.atual = { ...COMPLETO, measurement_id: 'UA-123' }
    renderPainel()
    fireEvent.change(campoId(), { target: { value: 'G-ABC1234' } })
    fireEvent.click(screen.getByRole('switch'))
    expect(await screen.findByTestId('analytics-enable-refusal')).toBeTruthy()
    expect(salvar).not.toHaveBeenCalled()
  })

  it('desligar com ID inválido gravado NÃO é recusado — desligar é sempre seguro', async () => {
    cfg.atual = { ...COMPLETO, enabled: true, measurement_id: '' }
    renderPainel()
    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(screen.queryByTestId('analytics-enable-refusal')).toBeNull()
  })

  it('o interruptor tem nome acessível e a área de toque de 44px (ANL-09)', () => {
    renderPainel()
    const sw = screen.getByRole('switch', { name: 'Ligar a medição do Google Analytics' })
    expect(sw.className).toMatch(/(?:^|\s)before:-top-\[10px\](?![-\w])/)
    expect(sw.className).toMatch(/(?:^|\s)before:-bottom-\[10px\](?![-\w])/)
  })
})

describe('o campo do ID de medição (ANL-03)', () => {
  it('mostra o ID gravado, e a legenda diz que ele é público', () => {
    renderPainel()
    expect(campoId().value).toBe('G-SQL517XDQZ')
    expect(screen.getByText(/É público — aparece no código de qualquer página da loja/)).toBeTruthy()
  })

  it('sem alteração, o salvar fica desligado e diz "Nenhuma alteração pendente"', () => {
    renderPainel()
    expect((botaoSalvar() as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Nenhuma alteração pendente')).toBeTruthy()
  })

  it.each([['UA-12345678'], ['GTM-K5N4XKF'], ['G-12'], ['G-ABC 1234'], ['qualquer coisa']])(
    'ID inválido (%s) mostra a frase EXATA junto ao campo e NÃO grava',
    async id => {
      renderPainel()
      fireEvent.change(campoId(), { target: { value: id } })
      fireEvent.click(botaoSalvar())
      const alerta = await screen.findByText(MEASUREMENT_ID_REFUSAL)
      expect(alerta.textContent).toBe('O ID começa com G-, seguido de letras e números.')
      // Junto ao campo: o campo aponta para a frase.
      expect(campoId().getAttribute('aria-describedby')).toContain(alerta.id)
      expect(campoId().getAttribute('aria-invalid')).toBe('true')
      expect(salvar).not.toHaveBeenCalled()
    },
  )

  it('grava o ID NORMALIZADO (aparado e em maiúsculas), espalhando o valor atual', async () => {
    cfg.atual = { ...COMPLETO, enabled: true }
    renderPainel()
    fireEvent.change(campoId(), { target: { value: '  g-abc1234  ' } })
    expect(screen.getByText('Alteração não salva')).toBeTruthy()
    fireEvent.click(botaoSalvar())
    await waitFor(() => expect(salvar).toHaveBeenCalledTimes(1))
    expect(salvar.mock.calls[0][0]).toEqual({
      key: 'analytics',
      value: { enabled: true, measurement_id: 'G-ABC1234', production_host: 'umaestrelinha.com.br' },
    })
  })

  it('a frase de recusa some quando a dona volta a digitar', async () => {
    renderPainel()
    fireEvent.change(campoId(), { target: { value: 'UA-1' } })
    fireEvent.click(botaoSalvar())
    await screen.findByText(MEASUREMENT_ID_REFUSAL)
    fireEvent.change(campoId(), { target: { value: 'G-' } })
    expect(screen.queryByText(MEASUREMENT_ID_REFUSAL)).toBeNull()
  })
})

// ============================================================================ T23 — a chave

describe('a chave secreta, só de escrita (ANL-05)', () => {
  it('guardada: "Guardada no servidor", a data, "Substituir" — e nenhum campo', () => {
    renderPainel()
    const caixa = screen.getByTestId('analytics-secret-stored')
    expect(within(caixa).getByText('Guardada no servidor')).toBeTruthy()
    expect(within(caixa).getByText(/Salva em 05\/10\/2026\./)).toBeTruthy()
    expect(within(caixa).getByText(/não aparece de novo nesta tela/)).toBeTruthy()
    expect(within(caixa).getByRole('button', { name: 'Substituir' })).toBeTruthy()
    expect(screen.queryByLabelText(/Chave secreta da API/)).toBeNull()
  })

  it('ausente: o campo para colar já está aberto, e é de senha', () => {
    segredo.estado = { ...segredo.estado, data: { secret_configured: false, secret_updated_at: null } }
    renderPainel()
    const campo = screen.getByLabelText(/Chave secreta da API/) as HTMLInputElement
    expect(campo.type).toBe('password')
    expect(screen.queryByTestId('analytics-secret-stored')).toBeNull()
    // Sem chave guardada não há o que cancelar.
    expect(screen.queryByRole('button', { name: 'Cancelar' })).toBeNull()
  })

  it('substituir: colar, guardar — o campo SOME e o valor NÃO fica no DOM', async () => {
    const { container } = renderPainel()
    fireEvent.click(screen.getByRole('button', { name: 'Substituir' }))
    fireEvent.change(screen.getByLabelText(/Chave secreta da API/), {
      target: { value: 'seGrEdo-XYZ-987' },
    })
    await act(async () => {
      fireEvent.click(screen.getByTestId('analytics-secret-save'))
    })

    expect(segredo.save).toHaveBeenCalledWith('seGrEdo-XYZ-987')
    expect(screen.queryByLabelText(/Chave secreta da API/)).toBeNull()
    expect(container.innerHTML).not.toContain('seGrEdo-XYZ-987')
    // O estado volta a ser o do servidor (a releitura é do hook; aqui o dublê já diz "guardada").
    expect(screen.getByTestId('analytics-secret-stored')).toBeTruthy()

    // E não fica no ESTADO do componente: substituir de novo abre o campo vazio. Sem isto, apagar
    // a limpeza do valor deixaria o DOM limpo (o campo está desmontado) e a chave voltaria à tela
    // no próximo "Substituir".
    fireEvent.click(screen.getByRole('button', { name: 'Substituir' }))
    expect((screen.getByLabelText(/Chave secreta da API/) as HTMLInputElement).value).toBe('')
  })

  it('recusa do servidor: a frase dele aparece e o campo continua aberto', async () => {
    segredo.save.mockImplementation(async () => 'A chave não pode ter espaços.')
    segredo.estado = { ...segredo.estado, data: { secret_configured: false, secret_updated_at: null } }
    renderPainel()
    fireEvent.change(screen.getByLabelText(/Chave secreta da API/), { target: { value: 'a b' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('analytics-secret-save'))
    })
    expect(screen.getByText('A chave não pode ter espaços.')).toBeTruthy()
    expect(screen.getByLabelText(/Chave secreta da API/)).toBeTruthy()
  })

  it('vazio é recusado na tela, sem chamar a function', async () => {
    segredo.estado = { ...segredo.estado, data: { secret_configured: false, secret_updated_at: null } }
    renderPainel()
    fireEvent.change(screen.getByLabelText(/Chave secreta da API/), { target: { value: '   ' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('analytics-secret-save'))
    })
    expect(screen.getByText(SECRET_EMPTY_REFUSAL)).toBeTruthy()
    expect(segredo.save).not.toHaveBeenCalled()
  })

  it('cancelar a substituição apaga o que foi digitado e volta ao estado guardado', () => {
    const { container } = renderPainel()
    fireEvent.click(screen.getByRole('button', { name: 'Substituir' }))
    fireEvent.change(screen.getByLabelText(/Chave secreta da API/), { target: { value: 'meio-colado' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('analytics-secret-stored')).toBeTruthy()
    expect(container.innerHTML).not.toContain('meio-colado')
  })

  it('falha de leitura do estado é dita como falha — nunca como "não guardada"', () => {
    segredo.estado = {
      ...segredo.estado,
      isError: true,
      isSuccess: false,
      data: undefined,
      error: new Error('Só quem administra.'),
    }
    renderPainel()
    expect(screen.getByTestId('analytics-secret-read-error').textContent).toMatch(/Só quem administra/)
    expect(screen.queryByLabelText(/Chave secreta da API/)).toBeNull()
    expect(screen.queryByText('Guardada no servidor')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(segredo.estado.refetch).toHaveBeenCalled()
  })
})

describe('ligada e sem chave — o aviso (ANL-07)', () => {
  const semChave = () => {
    segredo.estado = { ...segredo.estado, data: { secret_configured: false, secret_updated_at: null } }
  }

  it('avisa que as compras não estão sendo enviadas e aponta o passo a passo', () => {
    cfg.atual = { ...COMPLETO, enabled: true }
    semChave()
    renderPainel()
    const aviso = screen.getByTestId('analytics-missing-secret')
    expect(aviso.textContent).toMatch(/as compras aprovadas não estão sendo enviadas ao Google/)
    const link = within(aviso).getByRole('link', { name: 'Ver o passo a passo' })
    expect(link.getAttribute('href')).toBe(`#${SECRET_HELP_ID}`)
    // O alvo do link EXISTE na tela — um link para uma âncora ausente não leva a lugar nenhum.
    expect(document.getElementById(SECRET_HELP_ID)).not.toBeNull()
  })

  it('desligada e sem chave: nenhum aviso — nada deixou de ser enviado', () => {
    semChave()
    renderPainel()
    expect(screen.queryByTestId('analytics-missing-secret')).toBeNull()
  })

  it('ligada e COM chave: nenhum aviso', () => {
    cfg.atual = { ...COMPLETO, enabled: true }
    renderPainel()
    expect(screen.queryByTestId('analytics-missing-secret')).toBeNull()
  })

  it('ligada e com a leitura da chave em curso ou falha: não afirma ausência', () => {
    cfg.atual = { ...COMPLETO, enabled: true }
    segredo.estado = { ...segredo.estado, isLoading: true, isSuccess: false, data: undefined }
    const { unmount } = renderPainel()
    expect(screen.queryByTestId('analytics-missing-secret')).toBeNull()
    unmount()

    segredo.estado = { ...segredo.estado, isLoading: false, isError: true, error: new Error('x') }
    renderPainel()
    expect(screen.queryByTestId('analytics-missing-secret')).toBeNull()
  })
})

// ============================================================================ T24 — último envio

describe('última compra enviada (ANL-10, ANL-11)', () => {
  it('sem envio: "Nenhuma compra enviada ainda", literal, e nenhum zero', () => {
    renderPainel()
    const cartao = screen.getByTestId('analytics-last-send')
    expect(within(cartao).getByText('Nenhuma compra enviada ainda')).toBeTruthy()
    expect(cartao.textContent).not.toMatch(/\b0\b/)
  })

  it('com envio: o número pelo formatador do pedido, a data, o valor e "enviado ao Google"', () => {
    envios.estado = {
      ...envios.estado,
      data: {
        last: { id: 'o1', order_number: '0244', total: 389.9, ga_purchase_at: '2026-10-03T17:32:00.000Z' },
        declined: 0,
        failed: 0,
      },
    }
    renderPainel()
    const cartao = screen.getByTestId('analytics-last-send')
    expect(within(cartao).getByText('Pedido #0244')).toBeTruthy()
    expect(cartao.textContent).toMatch(/03\/10\/2026, 14:32/)
    expect(cartao.textContent).toMatch(/389,90/)
    expect(cartao.textContent).toMatch(/enviado ao Google/)
    // "enviado", nunca "aceito": o servidor não sabe se o Google contou.
    expect(cartao.textContent).not.toMatch(/aceit/i)
  })

  it('número já com `#` não ganha o segundo — quem formata é `formatOrderNumber`', () => {
    envios.estado = {
      ...envios.estado,
      data: {
        last: { id: 'o1', order_number: '#0244', total: 10, ga_purchase_at: '2026-10-03T17:32:00.000Z' },
        declined: 0,
        failed: 0,
      },
    }
    renderPainel()
    expect(screen.getByText('Pedido #0244')).toBeTruthy()
  })

  it('as compras de fora aparecem, separadas por motivo', () => {
    envios.estado = { ...envios.estado, data: { last: null, declined: 3, failed: 2 } }
    renderPainel()
    expect(screen.getByTestId('analytics-declined-count').textContent).toBe(declinedSentence(3))
    expect(declinedSentence(3)).toBe(
      '3 compras aprovadas ficaram fora porque a cliente desligou as estatísticas.',
    )
    expect(screen.getByTestId('analytics-failed-count').textContent).toBe(failedSentence(2))
  })

  it('o singular é singular', () => {
    expect(declinedSentence(1)).toBe('1 compra aprovada ficou fora porque a cliente desligou as estatísticas.')
    expect(failedSentence(1)).toBe('1 compra aprovada não chegou ao Google porque o envio falhou.')
  })

  it('zero de fora: nenhuma caixa — o normal não precisa de aviso', () => {
    renderPainel()
    expect(screen.queryByTestId('analytics-declined-count')).toBeNull()
    expect(screen.queryByTestId('analytics-failed-count')).toBeNull()
  })

  it('carregando não afirma nada; erro diz que a falha é desta tela', () => {
    envios.estado = { isLoading: true, isError: false, data: undefined }
    const { unmount } = renderPainel()
    expect(screen.getByText('Conferindo os envios…')).toBeTruthy()
    expect(screen.queryByText('Nenhuma compra enviada ainda')).toBeNull()
    unmount()

    envios.estado = { isLoading: false, isError: true, data: undefined }
    renderPainel()
    expect(screen.getByText(/falha desta tela/)).toBeTruthy()
    expect(screen.queryByText('Nenhuma compra enviada ainda')).toBeNull()
  })

  it('formatSentAt: "Hoje" no mesmo dia do fuso da loja, data cheia nos outros', () => {
    const agora = new Date('2026-10-05T20:00:00.000Z')
    expect(formatSentAt('2026-10-05T17:32:00.000Z', agora)).toBe('Hoje, 14:32')
    expect(formatSentAt('2026-10-04T17:32:00.000Z', agora)).toBe('04/10/2026, 14:32')
    // 01:00 UTC do dia 5 ainda é dia 4 em Porto Alegre.
    expect(formatSentAt('2026-10-05T01:00:00.000Z', agora)).toBe('04/10/2026, 22:00')
  })
})

describe('onde criar a chave secreta (ANL-07)', () => {
  it('os quatro passos, na ordem, e o link para o Google Analytics em nova aba', () => {
    renderPainel()
    const cartao = document.getElementById(SECRET_HELP_ID)!
    const passos = within(cartao).getAllByRole('listitem').map(li => li.textContent)
    expect(passos).toHaveLength(4)
    SECRET_HELP_STEPS.forEach((passo, i) => expect(passos[i]).toContain(passo))
    const link = within(cartao).getByRole('link', { name: /Abrir o Google Analytics/ })
    expect(link.getAttribute('href')).toBe('https://analytics.google.com/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })
})

describe('o cartão "O que a loja mede" NÃO existe (removido do desenho)', () => {
  it('nenhum título com esse nome', () => {
    renderPainel()
    expect(screen.queryByText(/O que a loja mede/)).toBeNull()
  })
})

function renderPainel() {
  return render(<AnalyticsPanel />)
}
