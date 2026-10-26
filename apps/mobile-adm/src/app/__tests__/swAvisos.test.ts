// Feature `79` · T23 — o arquivo dos avisos do service worker (`public/sw-avisos.js`; design §4.5,
// `MAN-03`, `MAN-22`, `MAN-31`). Ele é JS puro, carregado pelo worker do workbox por `importScripts`,
// e nenhum runner o alcança: aqui ele roda num `node:vm`, com `self`, `clients` e `registration`
// falsos que registram cada chamada. O arquivo do disco é o que roda — nada é copiado para o teste.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const FONTE = readFileSync(resolve(__dirname, '../../../public/sw-avisos.js'), 'utf8')

interface Janela {
  focus: ReturnType<typeof vi.fn>
  navigate: ReturnType<typeof vi.fn>
}

/** Carrega o arquivo num contexto novo e devolve os ouvintes e os dublês. */
const carregar = ({ janelas = [] as Janela[] } = {}) => {
  const ouvintes = new Map<string, (event: unknown) => void>()
  const registration = { showNotification: vi.fn(async () => undefined) }
  const clients = {
    matchAll: vi.fn(async () => janelas),
    openWindow: vi.fn(async () => null),
  }
  const self = {
    addEventListener: (tipo: string, f: (event: unknown) => void) => ouvintes.set(tipo, f),
    registration,
  }
  vm.runInNewContext(FONTE, { self, clients, Promise })
  return { ouvintes, registration, clients }
}

/** Um evento com `waitUntil` que guarda a promessa entregue. */
const evento = <T extends object>(campos: T) => {
  const promessas: Promise<unknown>[] = []
  return { ...campos, waitUntil: vi.fn((p: Promise<unknown>) => promessas.push(p)), promessas }
}

const empurrar = (dado: unknown, opcoes: { semDado?: boolean; jsonLanca?: boolean } = {}) => {
  const sw = carregar()
  const e = evento({
    data: opcoes.semDado
      ? null
      : {
          json: () => {
            if (opcoes.jsonLanca) throw new SyntaxError('Unexpected token')
            return dado
          },
        },
  })
  sw.ouvintes.get('push')!(e)
  return { sw, e }
}

const tocar = async (url: unknown, janelas: Janela[] = []) => {
  const sw = carregar({ janelas })
  const close = vi.fn()
  const e = evento({ notification: { close, data: url === undefined ? undefined : { url } } })
  sw.ouvintes.get('notificationclick')!(e)
  await Promise.all(e.promessas)
  return { sw, e, close }
}

const janela = (navigate: () => Promise<unknown> = async () => null): Janela => ({
  focus: vi.fn(async () => undefined),
  navigate: vi.fn(navigate),
})

describe('âncora', () => {
  it('o arquivo registra os DOIS ouvintes, e só eles', () => {
    expect([...carregar().ouvintes.keys()].sort()).toEqual(['notificationclick', 'push'])
  })
})

describe('push (MAN-22, MAN-31)', () => {
  it('mostra o aviso com o título, o corpo, a tag, o ícone e o caminho exatos — e entrega a promessa ao waitUntil', async () => {
    const { sw, e } = empurrar({ title: 'Pedido #0244 pago', body: 'R$ 189,90', url: '/pedidos/abc', tag: 'pedido-abc-owner_order_paid' })
    expect(sw.registration.showNotification).toHaveBeenCalledTimes(1)
    expect(sw.registration.showNotification).toHaveBeenCalledWith('Pedido #0244 pago', {
      body: 'R$ 189,90',
      tag: 'pedido-abc-owner_order_paid',
      icon: '/icons/icon-192.png',
      data: { url: '/pedidos/abc' },
    })
    expect(e.waitUntil).toHaveBeenCalledTimes(1)
    expect(e.promessas[0]).toBe(sw.registration.showNotification.mock.results[0].value)
  })

  it('o aviso de teste (sem pedido) abre a Início', () => {
    const { sw } = empurrar({ title: 'Avisos ligados', body: 'É assim que os pedidos vão chegar.', url: '/', tag: 'teste' })
    expect(sw.registration.showNotification).toHaveBeenCalledWith('Avisos ligados', expect.objectContaining({ data: { url: '/' } }))
  })

  it.each<[unknown, string]>([
    ['https://outro.exemplo/pedidos/x', 'externa'],
    ['//outro.exemplo/x', 'de duas barras'],
    ['/\\outro.exemplo', 'de barra invertida'],
    ['pedidos/x', 'relativa'],
    [42, 'que não é texto'],
  ])('url %s (%s) vira `/` já no aviso', (url, _forma) => {
    const { sw } = empurrar({ title: 'T', body: 'B', url, tag: 't' })
    expect(sw.registration.showNotification).toHaveBeenCalledWith('T', expect.objectContaining({ data: { url: '/' } }))
  })

  it.each([
    ['sem dado', { semDado: true }],
    ['json que lança', { jsonLanca: true }],
  ])('%s ⇒ não lança e não mostra', (_n, opcoes) => {
    const { sw, e } = empurrar(null, opcoes)
    expect(sw.registration.showNotification).not.toHaveBeenCalled()
    expect(e.waitUntil).not.toHaveBeenCalled()
  })

  it('dado sem título ⇒ não mostra', () => {
    const { sw } = empurrar({ body: 'só o corpo' })
    expect(sw.registration.showNotification).not.toHaveBeenCalled()
  })
})

describe('notificationclick (MAN-03)', () => {
  it('fecha o aviso e procura a janela do app, inclusive a não controlada', async () => {
    const { sw, close, e } = await tocar('/pedidos/x')
    expect(close).toHaveBeenCalledTimes(1)
    expect(sw.clients.matchAll).toHaveBeenCalledWith({ type: 'window', includeUncontrolled: true })
    expect(e.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('janela controlada ⇒ `focus` e `navigate` para o pedido, sem abrir outra', async () => {
    const j = janela()
    const { sw } = await tocar('/pedidos/x', [j])
    expect(j.focus).toHaveBeenCalledTimes(1)
    expect(j.navigate).toHaveBeenCalledWith('/pedidos/x')
    expect(sw.clients.openWindow).not.toHaveBeenCalled()
  })

  it('janela cujo `navigate` REJEITA (não controlada) ⇒ `openWindow` no pedido', async () => {
    const j = janela(async () => {
      throw new TypeError('This service worker is not the client’s active service worker.')
    })
    const { sw } = await tocar('/pedidos/x', [j])
    expect(j.navigate).toHaveBeenCalledWith('/pedidos/x')
    expect(sw.clients.openWindow).toHaveBeenCalledWith('/pedidos/x')
  })

  it('nenhuma janela ⇒ `openWindow` no pedido', async () => {
    const { sw } = await tocar('/pedidos/x')
    expect(sw.clients.openWindow).toHaveBeenCalledWith('/pedidos/x')
  })

  it.each([['https://outro.exemplo/x'], ['//outro.exemplo/x'], [undefined]])('url %s ⇒ `/`', async (url) => {
    const { sw } = await tocar(url)
    expect(sw.clients.openWindow).toHaveBeenCalledWith('/')
  })

  it('a promessa entregue ao waitUntil é a do caminho inteiro (resolve só depois de abrir)', async () => {
    let soltar!: () => void
    const sw = carregar()
    sw.clients.openWindow.mockImplementation(() => new Promise((r) => (soltar = () => r(null))))
    const e = evento({ notification: { close: vi.fn(), data: { url: '/pedidos/x' } } })
    sw.ouvintes.get('notificationclick')!(e)
    let terminou = false
    void e.promessas[0].then(() => (terminou = true))
    await new Promise((r) => setTimeout(r, 0))
    expect(sw.clients.openWindow).toHaveBeenCalled()
    expect(terminou).toBe(false)
    soltar()
    await e.promessas[0]
    expect(terminou).toBe(true)
  })
})
