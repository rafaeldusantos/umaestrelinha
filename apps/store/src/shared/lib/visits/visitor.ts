// O visitante e o marcador do contador de visitas (feature `71`, `VIS-12`, `VIS-16`, `VIS-19`,
// `VIS-20`, `VIS-24`, `VIS-42`).
//
// **O único arquivo do repositório que cita as duas chaves de armazenamento do contador.**
// `visitanteComDonoUnico.test.ts` recusa a chave em qualquer outro arquivo de `apps/*/src`, testes
// inclusos (eles importam as constantes). Uma segunda leitura à mão — a chave com um caractere
// trocado, `sessionStorage` no lugar de `localStorage` — faria cada página contar como uma visita
// nova, sem nada quebrar.
//
// O marcador é `{ v: 1, id, ate, em }`:
//
// - `id` — o código aleatório do navegador (`crypto.randomUUID`), nunca derivado de dado pessoal
//   nem do GA. Ele só viaja no corpo da function `visit`.
// - `ate` — o prazo até o qual NÃO se chama de novo, **no relógio local**: `Date.now() + (ate −
//   agora)` do servidor, medido no instante da resposta. É duração, não cálculo de dia: o cliente
//   nunca sabe que dia de Brasília é. Comparar o `ate` do servidor com o relógio de um aparelho
//   adiantado faria toda navegação das últimas horas do dia virar uma chamada.
// - `em` — o instante local da gravação. `agora < em` significa que o relógio voltou: chama de novo,
//   e o servidor deduplica.
//
// O marcador é só uma otimização. Quem impede a duplicata é o servidor (`on conflict do nothing`);
// relógio errado custa no máximo uma chamada a mais, ou um atraso — nunca uma visita a mais.

import { isVisitorId } from '@estrelinha/core/visits'

export const VISITOR_KEY = 'estrelinha-visitor'

export interface VisitorMarker {
  v: 1
  id: string | null
  /** O prazo no relógio LOCAL (epoch em ms), ou `null` antes da primeira resposta. */
  ate: number | null
  /** O instante local em que o prazo foi gravado, ou `null`. */
  em: number | null
}

/**
 * Discriminante de STRING, porque `strictNullChecks` está desligado e união por booleano não
 * estreita. `indisponivel` (o armazenamento lança) é diferente de `ausente`: ausente cria um id;
 * indisponível não conta nada (`VIS-19`).
 */
export type MarkerRead =
  | { estado: 'ausente' }
  | { estado: 'presente'; marker: VisitorMarker }
  | { estado: 'indisponivel' }

const numeroOuNulo = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null

/** Lê o marcador. JSON ilegível ou de outra versão é `ausente`; id inválido é lido como sem id. */
export function readMarker(): MarkerRead {
  let cru: string | null
  try {
    cru = localStorage.getItem(VISITOR_KEY)
  } catch {
    return { estado: 'indisponivel' }
  }
  if (cru === null) return { estado: 'ausente' }
  let dado: unknown
  try {
    dado = JSON.parse(cru)
  } catch {
    return { estado: 'ausente' }
  }
  if (!dado || typeof dado !== 'object' || Array.isArray(dado)) return { estado: 'ausente' }
  const d = dado as Record<string, unknown>
  if (d.v !== 1) return { estado: 'ausente' }
  return {
    estado: 'presente',
    marker: {
      v: 1,
      id: isVisitorId(d.id) ? (d.id as string) : null,
      ate: numeroOuNulo(d.ate),
      em: numeroOuNulo(d.em),
    },
  }
}

/**
 * Pode chamar o servidor agora? `em ≤ agora < ate` ⇒ não; prazo vencido (virou o dia) ou relógio
 * que voltou (`agora < em`) ⇒ sim. Sem marcador, ou sem prazo, ⇒ sim.
 */
export function markerAllowsCall(m: VisitorMarker | null, agora: number): boolean {
  if (!m || m.ate === null || m.em === null) return true
  return !(m.em <= agora && agora < m.ate)
}

/** Grava o marcador inteiro. `false` quando o armazenamento recusa. */
function escrever(m: VisitorMarker): boolean {
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify(m))
    return true
  } catch {
    return false
  }
}

/**
 * Grava o prazo que o servidor devolveu (`200` ou `429`), convertido para o relógio local por
 * duração. **Relê o marcador no instante da escrita e só toca `ate`/`em`**: uma resposta que chega
 * depois de uma recusa (`VIS-24`) ou de `?nao-contar=1` (`VIS-42`) feitas com a requisição no ar
 * nunca traz o código de volta.
 */
export function saveClock(ateServidor: number, agoraServidor: number): void {
  if (!Number.isFinite(ateServidor) || !Number.isFinite(agoraServidor)) return
  const atual = readMarker()
  if (atual.estado === 'indisponivel') return
  const base = atual.estado === 'presente' ? atual.marker : null
  const agora = Date.now()
  escrever({ v: 1, id: base?.id ?? null, ate: agora + (ateServidor - agoraServidor), em: agora })
}

/**
 * Cria (ou relê) o id e o grava. Chamado dentro da trava, quando ela existe. Grava e **relê o que
 * gravou**: um armazenamento que aceita a escrita e não a guarda (aba privada antiga, bloqueador)
 * daria um id novo por página, e cada página seria uma visita.
 */
function criarOuLer(gerar: () => string, podeSeguir?: () => boolean): string | null {
  // A decisão é refeita AQUI, dentro da trava e antes de ler ou criar (`VIS-24`, `VIS-42`): uma
  // recusa que chegou enquanto a trava esperava já apagou o id, e criar um novo agora gravaria no
  // navegador o código que a recusa acabou de prometer apagar. Entre esta decisão e a escrita não
  // há `await`, então nenhuma recusa cabe no meio.
  if (podeSeguir && !podeSeguir()) return null
  const atual = readMarker()
  if (atual.estado === 'indisponivel') return null
  const base = atual.estado === 'presente' ? atual.marker : null
  if (base?.id) return base.id
  const id = gerar()
  if (!isVisitorId(id)) return null
  if (!escrever({ v: 1, id, ate: base?.ate ?? null, em: base?.em ?? null })) return null
  const relido = readMarker()
  return relido.estado === 'presente' && relido.marker.id === id ? id : null
}

/**
 * O id deste navegador, criado na primeira vez. `null` quando não dá para contar (`VIS-19`): sem
 * `crypto.randomUUID`, sem armazenamento, ou escrita que não confere — e **nunca** um id só em
 * memória. Nenhum id é guardado neste módulo: a fonte é sempre o armazenamento.
 *
 * Com `navigator.locks` (`VIS-20`), a criação acontece sob a trava `VISITOR_KEY` e **relê a chave
 * dentro dela**: duas abas abertas no mesmo instante produzem um id só. Sem a API, cria sem trava —
 * e duas abas no primeiro instante podem gerar dois ids (limite declarado na spec).
 *
 * `podeSeguir`, quando passado, é a decisão de contar refeita **dentro** da trava, antes de ler ou
 * criar: recusada, devolve `null` sem escrever nada. Sem ela, uma recusa de cookies (ou o
 * `?nao-contar=1`) que chegasse durante a espera da trava deixaria um id NOVO gravado — o conserto
 * G4 da verificação r1 da feature `71`.
 */
export async function ensureVisitorId(podeSeguir?: () => boolean): Promise<string | null> {
  const cripto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (typeof cripto?.randomUUID !== 'function') return null
  const gerar = () => cripto.randomUUID!()

  const locks = (globalThis.navigator as Navigator | undefined)?.locks
  if (locks && typeof locks.request === 'function') {
    try {
      return await locks.request(VISITOR_KEY, async () => criarOuLer(gerar, podeSeguir))
    } catch {
      return null
    }
  }
  return criarOuLer(gerar, podeSeguir)
}

/**
 * Apaga o id e mantém o prazo (`VIS-24`, `VIS-42`). Reaceitar no mesmo dia não conta de novo,
 * porque `ate`/`em` continuam valendo; no dia seguinte nasce um id novo.
 */
export function forgetVisitorId(): void {
  const atual = readMarker()
  if (atual.estado !== 'presente') return
  escrever({ ...atual.marker, id: null })
}

/** A marca "este navegador não é contado" (`VIS-42`), guardada como `'1'`. */
export const OPT_OUT_KEY = 'estrelinha-nao-contar'

/** `true` grava a marca; `false` a APAGA. Armazenamento que recusa não lança. */
export function setOptOut(on: boolean): void {
  try {
    if (on) localStorage.setItem(OPT_OUT_KEY, '1')
    else localStorage.removeItem(OPT_OUT_KEY)
  } catch {
    // Sem armazenamento o contador também não conta (`VIS-19`); não há o que guardar.
  }
}

/** A marca está gravada? Só `'1'` conta; armazenamento que lança ⇒ `false`. */
export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * O estado de módulo do contador: uma chamada em voo por vez, e as falhas desta aba (`VIS-18`: no
 * máximo mais uma tentativa depois de uma falha). Mora aqui, ao lado das chaves, para haver UM
 * lugar a zerar entre testes.
 */
export const visitCounterState = { emVoo: false, falhas: 0 }

/** Só para os testes: devolve o módulo ao estado de quem acabou de abrir a página. */
export function resetVisitCounterForTests(): void {
  visitCounterState.emVoo = false
  visitCounterState.falhas = 0
}
