import { vi } from 'vitest'

/**
 * O arnês do Web Push no jsdom (feature `79`, T18; R9 do Design).
 *
 * O jsdom não tem `navigator.serviceWorker`, `PushManager` nem `Notification` — sem o arnês, todo
 * teste vê o navegador "sem suporte". `push.instalar(…)` põe os três no `window`/`navigator` com os
 * estados REAIS da plataforma:
 * - `Notification.permission`: `'default'`, `'granted'` ou `'denied'`; `requestPermission()` resolve
 *   com a resposta configurada (`respostaDoPedido`) e passa a valer como `permission` (como o Chrome);
 * - `navigator.serviceWorker.ready` (e `getRegistration()`, que resolve `undefined` com `semRegistro`,
 *   como num navegador sem o worker instalado — o `ready` desse nunca resolve) dá um registro cujo
 *   `pushManager` tem `getSubscription()`
 *   (nula ou a existente), `subscribe(options)` (resolve com uma inscrição nova, ou LANÇA o erro
 *   configurado) — e a inscrição tem `endpoint`, `toJSON()` com `keys.p256dh`/`keys.auth` e
 *   `unsubscribe()` (que a apaga do `pushManager`, como o navegador).
 *
 * Cada dublê REGISTRA as chamadas e os argumentos (`push.chamadas`). `push.reset()` desfaz tudo e
 * corre no `beforeEach` de `test/setup.ts`: nenhum caso herda permissão ou inscrição do vizinho.
 *
 * A PORTA (`features/push-notifications/api/portaDeAvisos.ts`) tem o dublê `portaFalsa` abaixo, por
 * fila de respostas (como o `fakeSupabase`): a fila vazia LANÇA — um teste que chama a porta sem
 * configurar a resposta mediu o nada. O teste a liga com
 * `vi.mock('@/features/push-notifications/api/portaDeAvisos', async () => (await import('@/test/push')).portaFalsa)`.
 */

export type Permissao = 'default' | 'granted' | 'denied'

export interface InscricaoFalsa {
  endpoint: string
  /** As opções com que foi criada (`subscribe`). */
  opcoes: PushSubscriptionOptionsInit | undefined
  toJSON: () => PushSubscriptionJSON
  unsubscribe: ReturnType<typeof vi.fn<() => Promise<boolean>>>
}

export interface Suporte {
  serviceWorker?: boolean
  pushManager?: boolean
  notification?: boolean
}

export const CHAVES_FALSAS = { p256dh: 'BP' + 'a'.repeat(85), auth: 'q'.repeat(22) }

const estado = {
  instalado: false,
  permissao: 'default' as Permissao,
  respostaDoPedido: 'granted' as Permissao,
  inscricao: null as InscricaoFalsa | null,
  falhaNoSubscribe: null as unknown,
  falhaNoUnsubscribe: null as unknown,
  /** Segura o `subscribe` até o teste soltar. */
  subscribeSegurado: null as null | Promise<void>,
  proximoEndpoint: 1,
}

const chamadas = {
  requestPermission: 0,
  getSubscription: 0,
  getRegistration: 0,
  subscribe: [] as (PushSubscriptionOptionsInit | undefined)[],
  unsubscribe: 0,
  /** A ordem global (para provar sequência entre o navegador e a porta). */
  log: [] as string[],
}

const criarInscricao = (endpoint: string, opcoes?: PushSubscriptionOptionsInit): InscricaoFalsa => {
  const inscricao: InscricaoFalsa = {
    endpoint,
    opcoes,
    toJSON: () => ({ endpoint, expirationTime: null, keys: { ...CHAVES_FALSAS } }),
    unsubscribe: vi.fn(async () => {
      chamadas.unsubscribe++
      chamadas.log.push('unsubscribe')
      if (estado.falhaNoUnsubscribe) throw estado.falhaNoUnsubscribe
      if (estado.inscricao === inscricao) estado.inscricao = null
      return true
    }),
  }
  return inscricao
}

const pushManager = {
  getSubscription: vi.fn(async () => {
    chamadas.getSubscription++
    chamadas.log.push('getSubscription')
    return estado.inscricao
  }),
  subscribe: vi.fn(async (opcoes?: PushSubscriptionOptionsInit) => {
    chamadas.subscribe.push(opcoes)
    chamadas.log.push('subscribe')
    if (estado.subscribeSegurado) await estado.subscribeSegurado
    if (estado.falhaNoSubscribe) throw estado.falhaNoSubscribe
    // Como o navegador: com inscrição viva, `subscribe` devolve a MESMA.
    if (!estado.inscricao) estado.inscricao = criarInscricao(`https://fcm.googleapis.com/fcm/send/p79-${estado.proximoEndpoint++}`, opcoes)
    return estado.inscricao
  }),
}

const NotificationFalsa = {
  get permission(): Permissao {
    return estado.permissao
  },
  requestPermission: vi.fn(async () => {
    chamadas.requestPermission++
    chamadas.log.push('requestPermission')
    estado.permissao = estado.respostaDoPedido
    return estado.respostaDoPedido
  }),
}

const definir = (alvo: object, nome: string, valor: unknown) =>
  Object.defineProperty(alvo, nome, { configurable: true, writable: true, value: valor })

const apagar = (alvo: object, nome: string) => {
  delete (alvo as Record<string, unknown>)[nome]
}

export const push = {
  /**
   * Instala os três (ou só os pedidos em `suporte`). `inscrito: true` começa com uma inscrição viva no
   * navegador (o endpoint `…/p79-existente`).
   */
  instalar({
    permissao = 'default',
    respostaDoPedido = 'granted',
    inscrito = false,
    suporte = {},
    semRegistro = false,
  }: { permissao?: Permissao; respostaDoPedido?: Permissao; inscrito?: boolean; suporte?: Suporte; semRegistro?: boolean } = {}) {
    const { serviceWorker = true, pushManager: comPushManager = true, notification = true } = suporte
    estado.instalado = true
    estado.permissao = permissao
    estado.respostaDoPedido = respostaDoPedido
    if (inscrito) estado.inscricao = criarInscricao('https://fcm.googleapis.com/fcm/send/p79-existente')
    if (serviceWorker) {
      const registro = { pushManager }
      definir(navigator, 'serviceWorker', {
        // Sem o worker instalado, o `ready` do navegador NUNCA resolve.
        ready: semRegistro ? new Promise(() => {}) : Promise.resolve(registro),
        getRegistration: vi.fn(async () => {
          chamadas.getRegistration++
          chamadas.log.push('getRegistration')
          return semRegistro ? undefined : registro
        }),
      })
    }
    if (comPushManager) definir(window, 'PushManager', function PushManager() {})
    if (notification) definir(window, 'Notification', NotificationFalsa)
  },
  /** O `subscribe` passa a LANÇAR este erro (o `AbortError`/`NotAllowedError` da plataforma). */
  falharSubscribe(erro: unknown = Object.assign(new Error('Registration failed - push service error'), { name: 'AbortError' })) {
    estado.falhaNoSubscribe = erro
  },
  falharUnsubscribe(erro: unknown = new Error('unsubscribe falhou')) {
    estado.falhaNoUnsubscribe = erro
  },
  /** Segura o `subscribe` até chamar a função devolvida. */
  segurarSubscribe(): () => void {
    let soltar!: () => void
    estado.subscribeSegurado = new Promise<void>((r) => (soltar = r))
    return () => {
      estado.subscribeSegurado = null
      soltar()
    }
  },
  /** A inscrição viva no navegador agora (ou `null`). */
  get inscricao(): InscricaoFalsa | null {
    return estado.inscricao
  },
  get permissao(): Permissao {
    return estado.permissao
  },
  chamadas,
  reset() {
    apagar(navigator, 'serviceWorker')
    apagar(window, 'PushManager')
    apagar(window, 'Notification')
    estado.instalado = false
    estado.permissao = 'default'
    estado.respostaDoPedido = 'granted'
    estado.inscricao = null
    estado.falhaNoSubscribe = null
    estado.falhaNoUnsubscribe = null
    estado.subscribeSegurado = null
    estado.proximoEndpoint = 1
    chamadas.requestPermission = 0
    chamadas.getSubscription = 0
    chamadas.getRegistration = 0
    chamadas.subscribe = []
    chamadas.unsubscribe = 0
    chamadas.log = []
    pushManager.getSubscription.mockClear()
    pushManager.subscribe.mockClear()
    NotificationFalsa.requestPermission.mockClear()
    for (const f of Object.values(portaFalsa)) f.mockReset()
    filas.clear()
  },
}

// --- a porta -------------------------------------------------------------------------------------

type Resposta = unknown
type NaFila = Resposta | (() => Resposta | Promise<Resposta>)
const NOMES_DA_PORTA = ['lerConfig', 'lerStatus', 'inscrever', 'gravarEventos', 'desinscrever', 'testar'] as const
export type FuncaoDaPorta = (typeof NOMES_DA_PORTA)[number]
const filas = new Map<FuncaoDaPorta, NaFila[]>()

const responder = (nome: FuncaoDaPorta) => async (...args: unknown[]) => {
  chamadas.log.push(`porta ${nome}`)
  void args
  const item = filas.get(nome)?.shift()
  if (item === undefined) throw new Error(`push.ts: a fila da porta "${nome}" esgotou (nenhuma resposta configurada)`)
  return typeof item === 'function' ? (item as () => unknown)() : item
}

const criarFn = (nome: FuncaoDaPorta) => {
  const f = vi.fn(responder(nome))
  return f
}

/** O dublê da porta: as seis funções, cada uma um `vi.fn` que responde da sua fila. */
export const portaFalsa = {
  lerConfig: criarFn('lerConfig'),
  lerStatus: criarFn('lerStatus'),
  inscrever: criarFn('inscrever'),
  gravarEventos: criarFn('gravarEventos'),
  desinscrever: criarFn('desinscrever'),
  testar: criarFn('testar'),
}

/** Põe respostas na fila de uma função da porta (uma por chamada). Uma função na fila pode segurar ou lançar. */
export const filaDaPorta = (nome: FuncaoDaPorta, ...respostas: NaFila[]) => {
  const fila = filas.get(nome) ?? []
  fila.push(...respostas)
  filas.set(nome, fila)
}

/** Respostas prontas, na forma de `RespostaDaPorta`. */
export const ok = <T,>(dado: T) => ({ tipo: 'ok' as const, dado })
export const falhou = () => ({ tipo: 'falhou' as const })
export const erroDaPorta = (slug: string, status: number) => ({ tipo: 'erro' as const, slug, status })
