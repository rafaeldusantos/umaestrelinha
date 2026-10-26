// Feature `79` · T21 — a tela "Avisos neste celular" pela árvore REAL (`<App />` em `/avisos`, com o
// `AuthProvider` real sobre o dublê do client). O navegador é o arnês de `@/test/push` e a porta é o
// dublê por fila do mesmo arquivo. `MAN-10`..`MAN-17`, `MAN-31`..`MAN-33`, `MAN-39`..`MAN-41`.
//
// As frases e os nomes dos quatro eventos vêm ESCRITOS POR EXTENSO — nunca lidos da constante, senão
// a constante trocada passaria nos dois lados. Cada estado é EXCLUSIVO (`L-063`): a régua confere a
// frase dele E a ausência das frases de todos os outros.
import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SEM_ACESSO } from '@/pages/LoginPage'
import { fake } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { erroDaPorta, falhou, filaDaPorta, ok, portaFalsa, push } from '@/test/push'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))
vi.mock('@/features/push-notifications/api/portaDeAvisos', async () => (await import('@/test/push')).portaFalsa)

const EMAIL = 'adri@exemplo.invalid'
const EXISTENTE = 'https://fcm.googleapis.com/fcm/send/p79-existente'
const RECUSA = Object.assign(new Error('acesso restrito ao painel'), { code: '42501' })
const OS_QUATRO = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']
const NOMES = ['Pedido novo', 'Pedido pago', 'Pagamento recusado da cliente', 'Material a caminho']

const F = {
  bloqueado:
    'As notificações estão bloqueadas para o Ateliê. Para receber avisos, libere nas configurações do Android.',
  semSuporte: 'Este navegador não recebe avisos.',
  naoAtivou: 'Não consegui ativar os avisos. Tente de novo.',
  naoConferiu: 'Não consegui conferir os avisos deste celular. Tente de novo.',
  naoGravou: 'Não consegui gravar esta escolha. Tente de novo.',
  naoParou: 'Não consegui parar os avisos deste celular.',
  testeNaoSaiu: 'O aviso de teste não saiu. Tente de novo.',
  testeAguarde: 'Aguarde alguns segundos para mandar outro aviso de teste.',
  descartado: 'Este celular deixou de receber avisos. Ative de novo.',
}
const BOTOES = ['Avisar neste celular', 'Enviar um aviso de teste', 'Parar avisos neste celular', 'Tentar de novo']

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => vi.useRealTimers())

const andar = (ms = 50) => act(() => vi.advanceTimersByTimeAsync(ms))
const main = () => screen.getByRole('main')
const temToken = (el: Element, token: string) => (el.getAttribute('class') ?? '').split(/\s+/).includes(token)

/** As frases de estado presentes na tela, e os botões. A régua da exclusividade. */
const frasesNaTela = () => Object.entries(F).filter(([, f]) => main().textContent!.includes(f)).map(([k]) => k)
const botoesNaTela = () => BOTOES.filter((b) => within(main()).queryByRole('button', { name: b }))
const interruptores = () => within(main()).queryAllByRole('switch')

const abrir = async () => {
  await montarApp('/avisos')
  await andar()
}

const abrirLigado = async (events = OS_QUATRO) => {
  push.instalar({ permissao: 'granted', inscrito: true })
  filaDaPorta('lerStatus', ok({ subscribed: true, events }))
  await abrir()
  expect(interruptores()).toHaveLength(4)
}

describe('a rota (MAN-17)', () => {
  it('`/avisos` abre a tela, com o `h1` e o título do documento', async () => {
    push.instalar()
    await abrir()
    expect(screen.getByRole('heading', { level: 1, name: 'Avisos neste celular' })).toBeInTheDocument()
    expect(document.title).toBe('Avisos neste celular · Ateliê')
  })

  it('sem sessão, leva ao Login', async () => {
    fake.reset()
    push.instalar()
    await abrir()
    expect(window.location.pathname).toBe('/login')
    expect(screen.queryByRole('heading', { level: 1, name: 'Avisos neste celular' })).toBeNull()
  })
})

describe('cada estado tem a sua frase, e só ela (L-063)', () => {
  it('sem suporte (o jsdom puro) ⇒ MAN-13, sem botão nenhum nem interruptor', async () => {
    await abrir()
    expect(screen.getByText('Este navegador não recebe avisos.')).toBeInTheDocument()
    expect(frasesNaTela()).toEqual(['semSuporte'])
    expect(botoesNaTela()).toEqual([])
    expect(interruptores()).toHaveLength(0)
    expect(portaFalsa.lerStatus).not.toHaveBeenCalled()
  })

  it.each([
    ['serviceWorker', { serviceWorker: false }],
    ['PushManager', { pushManager: false }],
    ['Notification', { notification: false }],
  ])('sem %s ⇒ MAN-13', async (_n, suporte) => {
    push.instalar({ suporte })
    await abrir()
    expect(frasesNaTela()).toEqual(['semSuporte'])
    expect(botoesNaTela()).toEqual([])
  })

  it('bloqueado ⇒ MAN-12, sem interruptor, sem botão, e nada pedido nem gravado', async () => {
    push.instalar({ permissao: 'denied', inscrito: true })
    await abrir()
    expect(screen.getByText(F.bloqueado)).toBeInTheDocument()
    expect(frasesNaTela()).toEqual(['bloqueado'])
    expect(botoesNaTela()).toEqual([])
    expect(interruptores()).toHaveLength(0)
    expect(push.chamadas.requestPermission).toBe(0)
    expect(portaFalsa.inscrever).not.toHaveBeenCalled()
  })

  it('desligado ⇒ só "Avisar neste celular" (alvo de 48 px), e ABRIR NÃO PEDE PERMISSÃO (MAN-10)', async () => {
    push.instalar()
    await abrir()
    expect(frasesNaTela()).toEqual([])
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
    expect(temToken(screen.getByRole('button', { name: 'Avisar neste celular' }), 'h-12')).toBe(true)
    expect(interruptores()).toHaveLength(0)
    expect(push.chamadas.requestPermission).toBe(0)
  })

  it('inscrição que o servidor não conhece ⇒ desligado (MAN-36)', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', ok({ subscribed: false, events: [] }))
    await abrir()
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
    expect(interruptores()).toHaveLength(0)
  })

  it('verificando ⇒ o esqueleto `aria-busy`, nenhuma frase de estado e nenhum botão', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    let soltar!: () => void
    filaDaPorta('lerStatus', () => new Promise((r) => (soltar = () => r(ok({ subscribed: true, events: OS_QUATRO })))))
    await abrir()
    expect(screen.getByTestId('avisos-verificando')).toHaveAttribute('aria-busy', 'true')
    expect(frasesNaTela()).toEqual([])
    expect(botoesNaTela()).toEqual([])
    expect(interruptores()).toHaveLength(0)
    await act(async () => soltar())
    await andar()
    expect(screen.queryByTestId('avisos-verificando')).toBeNull()
    expect(interruptores()).toHaveLength(4)
  })

  it('a leitura ao abrir falhando ⇒ a frase de conferir com "Tentar de novo", que RELÊ', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', falhou(), ok({ subscribed: true, events: OS_QUATRO }))
    await abrir()
    expect(screen.getByText(F.naoConferiu)).toBeInTheDocument()
    expect(frasesNaTela()).toEqual(['naoConferiu'])
    expect(botoesNaTela()).toEqual(['Tentar de novo'])
    expect(interruptores()).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await andar()
    expect(portaFalsa.lerStatus).toHaveBeenCalledTimes(2)
    expect(frasesNaTela()).toEqual([])
    expect(interruptores()).toHaveLength(4)
  })
})

describe('ativar (MAN-11, MAN-16)', () => {
  it('concedida ⇒ os quatro interruptores LIGADOS, com o nome de cada evento, na ordem da jornada (MAN-40)', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BPchave' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Avisar neste celular' }))
    await andar()
    expect(push.chamadas.requestPermission).toBe(1)
    const lista = interruptores()
    // A ordem da tela É a ordem dos nomes: o i-ésimo interruptor é o que tem o i-ésimo nome acessível.
    NOMES.forEach((nome, i) => expect(lista[i]).toBe(screen.getByRole('switch', { name: nome })))
    for (const nome of NOMES) expect(screen.getByRole('switch', { name: nome })).toBeChecked()
    expect(frasesNaTela()).toEqual([])
    expect(botoesNaTela()).toEqual(['Enviar um aviso de teste', 'Parar avisos neste celular'])
  })

  it('o botão fica desabilitado e `aria-busy` enquanto ativa (MAN-41)', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BPchave' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    const soltar = push.segurarSubscribe()
    await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Avisar neste celular' }))
    await andar()
    const botao = screen.getByRole('button', { name: 'Avisar neste celular' })
    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('aria-busy', 'true')
    await act(async () => soltar())
    await andar()
    expect(interruptores()).toHaveLength(4)
  })

  it('a porta falhando ⇒ MAN-16, sem interruptor nenhum, e o botão para tentar de novo', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BPchave' }))
    filaDaPorta('inscrever', falhou())
    await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Avisar neste celular' }))
    await andar()
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui ativar os avisos. Tente de novo.')
    expect(frasesNaTela()).toEqual(['naoAtivou'])
    expect(interruptores()).toHaveLength(0)
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
    expect(push.inscricao).toBeNull()
  })

  it('o Android negando agora ⇒ MAN-12', async () => {
    push.instalar({ respostaDoPedido: 'denied' })
    await abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Avisar neste celular' }))
    await andar()
    expect(frasesNaTela()).toEqual(['bloqueado'])
    expect(botoesNaTela()).toEqual([])
    expect(portaFalsa.inscrever).not.toHaveBeenCalled()
  })
})

describe('os interruptores (MAN-14, MAN-40, MAN-41)', () => {
  it('cada linha é o alvo: `<label>` com `min-h-12`, envolvendo o controle', async () => {
    await abrirLigado()
    const linhas = screen.getAllByTestId('linha-do-interruptor')
    expect(linhas).toHaveLength(4)
    for (const [i, linha] of linhas.entries()) {
      expect(linha.tagName).toBe('LABEL')
      expect(temToken(linha, 'min-h-12')).toBe(true)
      expect(within(linha).getByRole('switch', { name: NOMES[i] })).toBeInTheDocument()
    }
  })

  // T28 (prova em navegador, layout): a 200 % de fonte em 360 px, "Pagamento" mede 166 px numa caixa
  // de 110 px e, sem quebra de palavra, o texto passava POR BAIXO do trilho do interruptor (o fim do
  // texto em 231 px, o trilho começando em 207). O jsdom não mede layout: a régua é o token exato
  // que permite quebrar a palavra (com hífen, no `lang="pt-BR"` do documento). A medida antes/depois
  // está em `prova-navegador.md`.
  it('o rótulo de cada linha pode quebrar a palavra: `break-words` e `hyphens-auto` no texto (T28)', async () => {
    await abrirLigado()
    for (const [i, linha] of screen.getAllByTestId('linha-do-interruptor').entries()) {
      const texto = within(linha).getByText(NOMES[i])
      expect(temToken(texto, 'break-words')).toBe(true)
      expect(temToken(texto, 'hyphens-auto')).toBe(true)
      expect(temToken(texto, 'min-w-0')).toBe(true)
    }
  })

  it('os eventos do servidor decidem quais estão ligados', async () => {
    await abrirLigado(['owner_order_paid'])
    expect(screen.getByRole('switch', { name: 'Pedido pago' })).toBeChecked()
    for (const nome of ['Pedido novo', 'Pagamento recusado da cliente', 'Material a caminho'])
      expect(screen.getByRole('switch', { name: nome })).not.toBeChecked()
  })

  it('desligar grava SÓ esta inscrição; o tocado fica `aria-busy` e desabilitado enquanto grava', async () => {
    await abrirLigado()
    let soltar!: () => void
    filaDaPorta('gravarEventos', () => new Promise((r) => (soltar = () => r(ok({ events: ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'] })))))
    fireEvent.click(screen.getByRole('switch', { name: 'Pedido pago' }))
    await andar()
    const tocado = screen.getByRole('switch', { name: 'Pedido pago' })
    expect(tocado).toHaveAttribute('aria-busy', 'true')
    expect(tocado).toBeDisabled()
    expect(tocado).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Pedido novo' })).not.toHaveAttribute('aria-busy')
    expect(portaFalsa.gravarEventos).toHaveBeenCalledWith(EXISTENTE, ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'])
    await act(async () => soltar())
    await andar()
    expect(screen.getByRole('switch', { name: 'Pedido pago' })).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('switch', { name: 'Pedido pago' })).not.toBeChecked()
  })

  it('a gravação falhando VOLTA o interruptor e diz que não gravou', async () => {
    await abrirLigado()
    filaDaPorta('gravarEventos', falhou())
    fireEvent.click(screen.getByRole('switch', { name: 'Pedido pago' }))
    await andar()
    expect(screen.getByRole('switch', { name: 'Pedido pago' })).toBeChecked()
    expect(frasesNaTela()).toEqual(['naoGravou'])
  })
})

describe('o aviso de teste (MAN-31..MAN-33)', () => {
  it('sai para ESTE aparelho; o botão `aria-busy` no ar, e nenhuma frase quando sai', async () => {
    await abrirLigado()
    let soltar!: () => void
    filaDaPorta('testar', () => new Promise((r) => (soltar = () => r(ok({ ok: true })))))
    const botao = screen.getByRole('button', { name: 'Enviar um aviso de teste' })
    expect(temToken(botao, 'min-h-12')).toBe(true)
    fireEvent.click(botao)
    await andar()
    expect(screen.getByRole('button', { name: 'Enviar um aviso de teste' })).toHaveAttribute('aria-busy', 'true')
    expect(portaFalsa.testar).toHaveBeenCalledWith(EXISTENTE)
    await act(async () => soltar())
    await andar()
    expect(frasesNaTela()).toEqual([])
  })

  it('a falha no servidor ⇒ MAN-32', async () => {
    await abrirLigado()
    filaDaPorta('testar', erroDaPorta('push_failed', 502))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar um aviso de teste' }))
    await andar()
    expect(screen.getByText('O aviso de teste não saiu. Tente de novo.')).toBeInTheDocument()
    expect(frasesNaTela()).toEqual(['testeNaoSaiu'])
  })

  it('antes de 30 s ⇒ MAN-33, e NUNCA a frase de MAN-32', async () => {
    await abrirLigado()
    filaDaPorta('testar', erroDaPorta('cooldown', 429))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar um aviso de teste' }))
    await andar()
    expect(screen.getByText('Aguarde alguns segundos para mandar outro aviso de teste.')).toBeInTheDocument()
    expect(frasesNaTela()).toEqual(['testeAguarde'])
    expect(main().textContent).not.toContain('O aviso de teste não saiu.')
  })
})

// BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada (decisão do usuário: a opção 1).
describe('o aparelho que o servidor não conhece mais', () => {
  it('o 410 do teste ⇒ volta a "Avisar neste celular" com a frase que explica, sem interruptor', async () => {
    await abrirLigado()
    filaDaPorta('testar', erroDaPorta('gone', 410))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar um aviso de teste' }))
    await andar()
    expect(screen.getByText('Este celular deixou de receber avisos. Ative de novo.')).toBeInTheDocument()
    expect(frasesNaTela()).toEqual(['descartado'])
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
    expect(interruptores()).toHaveLength(0)
    expect(push.inscricao).toBeNull()
  })

  it('o 404 de um interruptor ⇒ o mesmo, e nunca "Não consegui gravar esta escolha"', async () => {
    await abrirLigado()
    filaDaPorta('gravarEventos', erroDaPorta('not_found', 404))
    fireEvent.click(screen.getByRole('switch', { name: 'Pedido pago' }))
    await andar()
    expect(frasesNaTela()).toEqual(['descartado'])
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
  })

  it('ativar de novo tira a frase, e o foco do botão de teste que saiu vai ao título', async () => {
    await abrirLigado()
    filaDaPorta('testar', erroDaPorta('gone', 410))
    const teste = screen.getByRole('button', { name: 'Enviar um aviso de teste' })
    teste.focus()
    fireEvent.click(teste)
    await andar()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Avisos neste celular' }))
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BPchave' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    fireEvent.click(screen.getByRole('button', { name: 'Avisar neste celular' }))
    await andar()
    expect(interruptores()).toHaveLength(4)
    expect(frasesNaTela()).toEqual([])
  })
})

describe('parar (MAN-15)', () => {
  it('"Parar avisos neste celular" (alvo de 48 px) volta ao estado de MAN-10', async () => {
    await abrirLigado()
    filaDaPorta('desinscrever', ok({ ok: true }))
    const botao = screen.getByRole('button', { name: 'Parar avisos neste celular' })
    expect(temToken(botao, 'min-h-12')).toBe(true)
    fireEvent.click(botao)
    await andar()
    expect(portaFalsa.desinscrever).toHaveBeenCalledWith(EXISTENTE)
    expect(push.inscricao).toBeNull()
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
    expect(interruptores()).toHaveLength(0)
    expect(frasesNaTela()).toEqual([])
  })

  it('a porta falhando ⇒ continua ligado e diz que não parou', async () => {
    await abrirLigado()
    filaDaPorta('desinscrever', falhou())
    fireEvent.click(screen.getByRole('button', { name: 'Parar avisos neste celular' }))
    await andar()
    expect(interruptores()).toHaveLength(4)
    expect(frasesNaTela()).toEqual(['naoParou'])
    expect(push.inscricao).not.toBeNull()
  })
})

describe('a recusa de papel (MAN-23)', () => {
  it('na leitura ao abrir, com o papel tirado ⇒ a recusa da 72, sem nenhuma frase dos avisos', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', () => {
      fake.estado.admins.clear()
      return Promise.reject(RECUSA)
    })
    await abrir()
    await andar(500)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('Avisos neste celular')
  })

  it('com o papel ainda admin (a recusa era da função): NENHUM controle nem frase, e UMA reconferência', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', () => Promise.reject(RECUSA), () => Promise.reject(RECUSA), () => Promise.reject(RECUSA))
    await abrir()
    await andar(500)
    expect(window.location.pathname).toBe('/avisos')
    expect(screen.getByRole('heading', { level: 1, name: 'Avisos neste celular' })).toBeInTheDocument()
    expect(screen.getByTestId('avisos-verificando')).toHaveAttribute('aria-busy', 'true')
    expect(botoesNaTela()).toEqual([])
    expect(frasesNaTela()).toEqual([])
    expect(interruptores()).toHaveLength(0)
    expect(portaFalsa.lerStatus.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('relançada por uma ação (o teste), com o papel tirado ⇒ a recusa da 72, nunca a frase de MAN-32', async () => {
    await abrirLigado()
    filaDaPorta('testar', () => {
      fake.estado.admins.clear()
      return Promise.reject(RECUSA)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar um aviso de teste' }))
    await andar(500)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('O aviso de teste não saiu.')
  })
})

// QA da `79` (BUG-20261025-foco-cai-no-body-nos-avisos): no Chromium, o controle tocado SAI da tela
// (ativar, parar) ou fica DESABILITADO enquanto grava (interruptor, teste, parar), e o navegador tira o
// foco dele — que cai no `<body>`. Quem usa teclado ou leitor de tela recomeça do topo a cada toque. O
// jsdom não tira o foco de um controle desabilitado (e o `blur()` de um desabilitado é no-op nele):
// `perderFoco` faz o que o Chromium faz — o foco no `<body>` — por um botão de passagem removido.
describe('o foco depois de cada ação não cai no body (QA da 79)', () => {
  const perderFoco = () =>
    act(() => {
      const passagem = document.createElement('button')
      document.body.appendChild(passagem)
      passagem.focus()
      passagem.remove()
    })
  const titulo = () => screen.getByRole('heading', { level: 1, name: 'Avisos neste celular' })

  it('ativar: o botão sai da tela, e o foco vai ao título', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BPchave' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    await abrir()
    const botao = screen.getByRole('button', { name: 'Avisar neste celular' })
    botao.focus()
    fireEvent.click(botao)
    await andar()
    expect(interruptores()).toHaveLength(4)
    expect(document.activeElement).toBe(titulo())
  })

  it('interruptor: desabilitado enquanto grava, o foco volta A ELE quando a gravação termina', async () => {
    await abrirLigado()
    let soltar!: () => void
    filaDaPorta('gravarEventos', () => new Promise((r) => (soltar = () => r(ok({ events: ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'] })))))
    const tocado = screen.getByRole('switch', { name: 'Pedido pago' })
    tocado.focus()
    fireEvent.click(tocado)
    await andar()
    expect(tocado).toBeDisabled()
    perderFoco()
    await act(async () => soltar())
    await andar()
    expect(document.activeElement).toBe(screen.getByRole('switch', { name: 'Pedido pago' }))
  })

  it('interruptor que falha: o foco volta a ele, ao lado da frase', async () => {
    await abrirLigado()
    filaDaPorta('gravarEventos', () => new Promise((r) => setTimeout(() => r(falhou()), 20)))
    const tocado = screen.getByRole('switch', { name: 'Material a caminho' })
    tocado.focus()
    fireEvent.click(tocado)
    perderFoco()
    await andar(100)
    expect(frasesNaTela()).toEqual(['naoGravou'])
    expect(document.activeElement).toBe(screen.getByRole('switch', { name: 'Material a caminho' }))
  })

  it('teste: o botão volta a ter o foco quando o teste termina', async () => {
    await abrirLigado()
    filaDaPorta('testar', () => new Promise((r) => setTimeout(() => r(erroDaPorta('cooldown', 429)), 20)))
    const botao = screen.getByRole('button', { name: 'Enviar um aviso de teste' })
    botao.focus()
    fireEvent.click(botao)
    perderFoco()
    await andar(100)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Enviar um aviso de teste' }))
  })

  it('parar: o botão sai da tela, e o foco vai ao título; falhando, volta ao botão', async () => {
    await abrirLigado()
    filaDaPorta('desinscrever', () => new Promise((r) => setTimeout(() => r(falhou()), 20)), ok({ ok: true }))
    let botao = screen.getByRole('button', { name: 'Parar avisos neste celular' })
    botao.focus()
    fireEvent.click(botao)
    perderFoco()
    await andar(100)
    expect(frasesNaTela()).toEqual(['naoParou'])
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Parar avisos neste celular' }))
    botao = screen.getByRole('button', { name: 'Parar avisos neste celular' })
    fireEvent.click(botao)
    await andar()
    expect(botoesNaTela()).toEqual(['Avisar neste celular'])
    expect(document.activeElement).toBe(titulo())
  })

  it('"Tentar de novo" da leitura: o botão sai da tela, e o foco vai ao título', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', falhou(), ok({ subscribed: true, events: OS_QUATRO }))
    await abrir()
    const botao = screen.getByRole('button', { name: 'Tentar de novo' })
    botao.focus()
    fireEvent.click(botao)
    await andar()
    expect(interruptores()).toHaveLength(4)
    expect(document.activeElement).toBe(titulo())
  })

  it('o foco que a pessoa levou a OUTRO lugar não é roubado', async () => {
    await abrirLigado()
    filaDaPorta('testar', () => new Promise((r) => setTimeout(() => r(ok({ ok: true })), 20)))
    const botao = screen.getByRole('button', { name: 'Enviar um aviso de teste' })
    botao.focus()
    fireEvent.click(botao)
    const outro = screen.getByRole('switch', { name: 'Pedido novo' })
    act(() => outro.focus())
    await andar(100)
    expect(document.activeElement).toBe(outro)
  })
})
