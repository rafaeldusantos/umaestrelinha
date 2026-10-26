import { useCallback, useEffect, useRef, useState } from 'react'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { PUSH_EVENTS, type PushEvent } from '@estrelinha/core/notifications'

import { gravarEventos, inscrever, lerConfig, lerStatus, testar as testarNaPorta } from '../api/portaDeAvisos'
import { desfazerNoNavegador, inscricaoDesteNavegador, registroPronto, temSuporteAPush } from './navegador'
import { pararAvisosDesteAparelho } from './pararAvisosDesteAparelho'

/**
 * Os avisos NESTE aparelho (feature `79`, design §4.5; `MAN-10`..`MAN-16`, `MAN-36`, `MAN-41`).
 *
 * A máquina da tela:
 * - `verificando` — ao montar, enquanto o navegador e a porta respondem;
 * - `sem-suporte` — falta `serviceWorker`, `PushManager` ou `Notification` (`MAN-13`);
 * - `bloqueado` — `Notification.permission === 'denied'` (`MAN-12`); nunca interruptor, nunca gravação;
 * - `desligado` — sem inscrição no navegador, ou com uma que o servidor não conhece (`MAN-36`);
 * - `ativando` — o toque em "Avisar neste celular" em curso;
 * - `ligado` — inscrita e conhecida pelo servidor, com os eventos e o endpoint;
 * - `erro` — `ativar` falhou (`MAN-16`) ou a leitura ao abrir falhou (`ler`).
 *
 * **Montar NUNCA pede permissão** (`MAN-10`): o pedido só nasce de `ativar()`, que roda dentro do
 * toque. A ordem de `ativar`: `requestPermission` → `lerConfig` (a chave pública vem do servidor, do
 * MESMO secret que assina) → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` →
 * `inscrever`. A porta falhando desfaz a inscrição do navegador (`unsubscribe()`) — não fica inscrição
 * órfã — e o estado é `erro` (`MAN-16`). Permissão negada ⇒ `bloqueado`, nada gravado; fechada sem
 * responder (`default`) ⇒ `desligado`.
 *
 * **A recusa de papel é relançada**: `ativar`, `alternar` e `parar` rejeitam com o próprio erro da
 * porta (`isAccessDenied`), para a página passá-lo à vigia da `72` — ele NÃO vira `erro`, que diria
 * "tente de novo" a uma conta sem acesso. A recusa que chega na leitura de abertura (não há quem
 * relançar) fica em `recusa`.
 *
 * O interruptor (`alternar`) é otimista: a lista muda na hora, `gravando` diz qual evento está em
 * curso (`aria-busy`, `MAN-41`), e a falha devolve a lista anterior e acende `falhaAoGravar`.
 *
 * O aviso de teste (`testar`, `MAN-31`..`MAN-33`) só sai com o aparelho `ligado`, um por vez
 * (`testando`); o desfecho fica em `falhaDoTeste`: `cooldown` é o teto do servidor (o slug `cooldown`,
 * `MAN-33`), e todo o resto é `falhou` (`MAN-32`). A recusa é relançada, como nas outras ações.
 *
 * **O aparelho que o servidor não conhece mais** — SPEC_DEVIATION de `MAN-32` como estava escrita, já
 * emendada na `spec.md` (BUG-20261025, decisão do usuário em 2026-10-26): o
 * teste que volta `gone` (410 — o serviço de push descartou o aparelho, e a porta apagou a linha) ou
 * `not_found` (404), e o interruptor que volta `not_found`, NÃO são "tente de novo" — nenhuma nova
 * tentativa passaria. O aparelho volta a `desligado`, a inscrição do navegador é desfeita (senão a
 * próxima abertura acharia uma inscrição que o servidor não tem) e `descartado` acende a frase que
 * explica a volta. Ativar de novo a apaga.
 *
 * Um `ativar` por vez: o segundo toque no mesmo tique não sai (a trava é uma ref, não o estado, que
 * só vale no render seguinte). Desmontar no meio deixa a operação terminar (a gravação que já saiu
 * precisa da sua volta), mas nenhum `setState` corre depois do desmonte.
 */
export type EstadoDosAvisos =
  | { tipo: 'verificando' }
  | { tipo: 'sem-suporte' }
  | { tipo: 'bloqueado' }
  | { tipo: 'desligado' }
  | { tipo: 'ativando' }
  | { tipo: 'ligado'; events: PushEvent[]; endpoint: string }
  | { tipo: 'erro'; motivo: 'ativar' | 'ler' }

export interface AvisosNoAparelho {
  estado: EstadoDosAvisos
  /** O evento cujo interruptor está gravando agora (`aria-busy`), ou `null`. */
  gravando: PushEvent | null
  /** A última troca de interruptor falhou (a lista voltou ao que era). */
  falhaAoGravar: boolean
  /** "Parar avisos" em curso. */
  parando: boolean
  /** A última tentativa de parar falhou (a inscrição continua). */
  falhaAoParar: boolean
  /** O aviso de teste em curso. */
  testando: boolean
  /** O último teste não saiu: o teto de 30 s (`cooldown`, `MAN-33`) ou qualquer outra falha (`MAN-32`). */
  falhaDoTeste: 'cooldown' | 'falhou' | null
  /** O servidor não conhece mais este aparelho (410/404 de uma ação): voltou a `desligado`. */
  descartado: boolean
  /** A recusa de papel lida ao abrir (as ações a relançam). */
  recusa: unknown
  ativar: () => Promise<void>
  alternar: (evento: PushEvent, ligar: boolean) => Promise<void>
  parar: () => Promise<void>
  testar: () => Promise<void>
}

const estadoInicial = (): EstadoDosAvisos => {
  if (!temSuporteAPush()) return { tipo: 'sem-suporte' }
  if (Notification.permission === 'denied') return { tipo: 'bloqueado' }
  return { tipo: 'verificando' }
}

export const usePushNoAparelho = (): AvisosNoAparelho => {
  const [estado, setEstadoBruto] = useState<EstadoDosAvisos>(estadoInicial)
  const [gravando, setGravandoBruto] = useState<PushEvent | null>(null)
  const [falhaAoGravar, setFalhaAoGravarBruto] = useState(false)
  const [parando, setParandoBruto] = useState(false)
  const [falhaAoParar, setFalhaAoPararBruto] = useState(false)
  const [recusa, setRecusaBruto] = useState<unknown>(null)
  const [testando, setTestandoBruto] = useState(false)
  const [falhaDoTeste, setFalhaDoTesteBruto] = useState<'cooldown' | 'falhou' | null>(null)
  const [descartado, setDescartadoBruto] = useState(false)

  const montado = useRef(true)
  const ativando = useRef(false)
  const testandoRef = useRef(false)
  const estadoRef = useRef(estado)
  estadoRef.current = estado

  // Nenhum `setState` depois do desmonte: cada setter passa por aqui.
  const seMontado =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      if (montado.current) set(v)
    }
  const setEstado = useCallback((v: EstadoDosAvisos) => {
    estadoRef.current = v
    if (montado.current) setEstadoBruto(v)
  }, [])
  const setGravando = seMontado(setGravandoBruto)
  const setFalhaAoGravar = seMontado(setFalhaAoGravarBruto)
  const setParando = seMontado(setParandoBruto)
  const setFalhaAoParar = seMontado(setFalhaAoPararBruto)
  const setRecusa = seMontado(setRecusaBruto)
  const setTestando = seMontado(setTestandoBruto)
  const setFalhaDoTeste = seMontado(setFalhaDoTesteBruto)
  const setDescartado = seMontado(setDescartadoBruto)

  /** O servidor apagou a inscrição: o navegador também a desfaz, e a tela volta ao começo. */
  const descartar = async () => {
    try {
      await desfazerNoNavegador(await inscricaoDesteNavegador())
    } catch {
      // A leitura da inscrição falhou: a próxima abertura pergunta ao servidor (`MAN-36`) e acha
      // `subscribed: false` do mesmo jeito.
    }
    setEstado({ tipo: 'desligado' })
    setDescartado(true)
  }

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  // Ao abrir: o navegador tem inscrição? E o servidor a conhece, para esta conta? (`MAN-36`)
  useEffect(() => {
    if (estadoRef.current.tipo !== 'verificando') return
    let vivo = true
    ;(async () => {
      try {
        const inscricao = await inscricaoDesteNavegador()
        if (!vivo) return
        if (!inscricao) return setEstado({ tipo: 'desligado' })
        const r = await lerStatus(inscricao.endpoint)
        if (!vivo) return
        if (r.tipo !== 'ok') return setEstado({ tipo: 'erro', motivo: 'ler' })
        setEstado(r.dado.subscribed ? { tipo: 'ligado', events: r.dado.events, endpoint: inscricao.endpoint } : { tipo: 'desligado' })
      } catch (e) {
        if (!vivo) return
        if (isAccessDenied(e)) {
          setRecusa(e)
          return setEstado({ tipo: 'desligado' })
        }
        setEstado({ tipo: 'erro', motivo: 'ler' })
      }
    })()
    return () => {
      vivo = false
    }
    // Só na montagem: as ações cuidam do resto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ativar = useCallback(async () => {
    if (ativando.current) return
    if (!temSuporteAPush()) return setEstado({ tipo: 'sem-suporte' })
    ativando.current = true
    setDescartado(false)
    const anterior = estadoRef.current
    setEstado({ tipo: 'ativando' })
    let inscricao: PushSubscription | null = null
    try {
      const permissao = await Notification.requestPermission()
      if (permissao === 'denied') return setEstado({ tipo: 'bloqueado' })
      if (permissao !== 'granted') return setEstado({ tipo: 'desligado' })

      const config = await lerConfig()
      if (config.tipo !== 'ok') return setEstado({ tipo: 'erro', motivo: 'ativar' })

      try {
        inscricao = await (await registroPronto()).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: config.dado.applicationServerKey,
        })
      } catch {
        return setEstado({ tipo: 'erro', motivo: 'ativar' })
      }

      const { keys } = inscricao.toJSON()
      const r = await inscrever(inscricao.endpoint, { p256dh: keys?.p256dh ?? '', auth: keys?.auth ?? '' })
      if (r.tipo !== 'ok') {
        await desfazerNoNavegador(inscricao)
        return setEstado({ tipo: 'erro', motivo: 'ativar' })
      }
      setEstado({ tipo: 'ligado', events: r.dado.events, endpoint: inscricao.endpoint })
    } catch (e) {
      // A porta lança só a recusa; qualquer outra exceção aqui (a do navegador) é falha.
      await desfazerNoNavegador(inscricao)
      if (isAccessDenied(e)) {
        setEstado(anterior.tipo === 'erro' || anterior.tipo === 'ativando' ? { tipo: 'desligado' } : anterior)
        throw e
      }
      setEstado({ tipo: 'erro', motivo: 'ativar' })
    } finally {
      ativando.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEstado])

  const alternar = useCallback(
    async (evento: PushEvent, ligar: boolean) => {
      const atual = estadoRef.current
      if (atual.tipo !== 'ligado') return
      const anteriores = atual.events
      const conjunto = new Set(anteriores)
      if (ligar) conjunto.add(evento)
      else conjunto.delete(evento)
      // Na ordem da jornada, sempre.
      const novos = PUSH_EVENTS.filter((e) => conjunto.has(e))
      setEstado({ ...atual, events: novos })
      setGravando(evento)
      setFalhaAoGravar(false)
      const voltar = () => {
        const agora = estadoRef.current
        if (agora.tipo === 'ligado') setEstado({ ...agora, events: anteriores })
      }
      try {
        const r = await gravarEventos(atual.endpoint, novos)
        if (r.tipo === 'ok') {
          const agora = estadoRef.current
          if (agora.tipo === 'ligado') setEstado({ ...agora, events: r.dado.events })
        } else if (r.tipo === 'erro' && r.slug === 'not_found') {
          await descartar()
        } else {
          voltar()
          setFalhaAoGravar(true)
        }
      } catch (e) {
        voltar()
        if (isAccessDenied(e)) throw e
        setFalhaAoGravar(true)
      } finally {
        setGravando(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setEstado],
  )

  const parar = useCallback(async () => {
    const atual = estadoRef.current
    if (atual.tipo !== 'ligado') return
    setParando(true)
    setFalhaAoParar(false)
    try {
      // O dono de "parar" é um só (`pararAvisosDesteAparelho`), lido também pelo "Sair" do menu.
      const desfecho = await pararAvisosDesteAparelho()
      if (desfecho === 'falhou') return setFalhaAoParar(true)
      setEstado({ tipo: 'desligado' })
    } catch (e) {
      if (isAccessDenied(e)) throw e
      setFalhaAoParar(true)
    } finally {
      setParando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setEstado])

  const testar = useCallback(async () => {
    const atual = estadoRef.current
    if (atual.tipo !== 'ligado' || testandoRef.current) return
    testandoRef.current = true
    setTestando(true)
    setFalhaDoTeste(null)
    try {
      const r = await testarNaPorta(atual.endpoint)
      if (r.tipo === 'ok') return
      if (r.tipo === 'erro' && (r.slug === 'gone' || r.slug === 'not_found')) return await descartar()
      setFalhaDoTeste(r.tipo === 'erro' && r.slug === 'cooldown' ? 'cooldown' : 'falhou')
    } catch (e) {
      if (isAccessDenied(e)) throw e
      setFalhaDoTeste('falhou')
    } finally {
      testandoRef.current = false
      setTestando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { estado, gravando, falhaAoGravar, parando, falhaAoParar, testando, falhaDoTeste, descartado, recusa, ativar, alternar, parar, testar }
}
