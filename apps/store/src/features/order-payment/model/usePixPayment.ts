// A máquina de estado do PIX — feature `58`: `PIX-P1-03`, `PIX-P1-04`, `PIX-P1-07`, `PIX-P2-01`,
// `PIX-P2-02`, `PIX-P2-03`.
//
// Ela vivia dentro de `features/checkout/ui/PixPayment.tsx`, misturada com o desenho: o timer, o
// canal de Realtime, a pergunta de 5 em 5 segundos da convidada, o copiar e o regerar estavam no
// mesmo arquivo que o QR e os botões. Isso era sustentável enquanto havia UMA superfície; com a
// rota própria do pagamento são quatro telas sobre a MESMA máquina (pronto, expirado, falha,
// confirmado), e o desenho de cada uma não pode carregar uma cópia da regra.
//
// **Nenhuma regra mudou de comportamento aqui.** O que mudou é que ela deixou de estar amarrada a
// um JSX. `PixPayment.tsx` continua no disco até a T13, e é a T13 que o apaga.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@estrelinha/supabase/client'
import type { PixPaymentResponse } from '@estrelinha/supabase/types'

import { fetchGuestOrder } from '@/entities/order/api/guestOrder'
import { accessFor } from '@/entities/order/model/orderAccess'
import {
  useCreatePayment,
  PAYMENT_UNAVAILABLE_MESSAGE,
} from '@/features/checkout/api/useCreatePayment'

/**
 * De quanto em quanto tempo a convidada pergunta se o PIX foi aprovado (`CSC-05`).
 *
 * Cinco segundos: o Mercado Pago aprova PIX em segundos, e a pessoa está olhando para a tela
 * esperando. Mais lento seria uma espera que parece travada; mais rápido, requisição à toa numa
 * janela que dura minutos.
 */
export const GUEST_POLL_MS = 5000

/**
 * Quando a espera passa a ser dita em voz alta (`PIX-P1-07`).
 *
 * **Oito segundos é METADE do timeout de 15s** de `useCreatePayment`, e o número sai daí: é tempo
 * de perceber que está demorando, com folga para a tela ainda virar código pronto antes de virar
 * erro. Mais alto e a linha só apareceria junto com a falha; mais baixo e ela entraria numa espera
 * que é normal.
 */
export const PIX_SLOW_MS = 8000

/** Por quanto tempo o "copiado" fica visível antes de o botão voltar ao rótulo normal. */
const COPIED_MS = 2000

/**
 * O que está acontecendo com o pagamento, como **união discriminada por literal de string**.
 *
 * `tsconfig.base.json` tem `strictNullChecks: false`, e nesse modo união discriminada por literal
 * BOOLEANO não estreita — ler o motivo no ramo do erro seria TS2339. Literal de string estreita, e
 * é por isso que o discriminante é `kind` e não um par de flags. Mesma escolha de `MenuItem`.
 */
export type PixState =
  | { kind: 'generating'; slow: boolean }
  | { kind: 'ready'; qrCode: string; secondsLeft: number }
  | { kind: 'expired' }
  | { kind: 'failed'; message: string }
  | { kind: 'approved' }

export interface PixPaymentMachine {
  state: PixState
  /** Pede um código ao banco para o MESMO pedido (`PIX-P2-02`) — nunca cria um segundo pedido. */
  generate: () => void
  copy: () => void
  copied: boolean
}

export function usePixPayment(orderId: string): PixPaymentMachine {
  const createPayment = useCreatePayment()

  const [pix, setPix] = useState<PixPaymentResponse | null>(null)
  const [generating, setGenerating] = useState(true)
  const [slow, setSlow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [approved, setApproved] = useState(false)
  const [copied, setCopied] = useState(false)

  // A identidade de `mutateAsync` muda a cada render do `useMutation`; presa numa dependência, ela
  // faria o efeito de montagem rodar de novo e pedir um segundo código ao banco.
  const mutateRef = useRef(createPayment.mutateAsync)
  mutateRef.current = createPayment.mutateAsync

  const generate = useCallback(() => {
    setError(null)
    setPix(null)
    setSecondsLeft(null)
    setGenerating(true)
    void (async () => {
      try {
        const response = (await mutateRef.current({
          order_id: orderId,
          method: 'pix',
        })) as PixPaymentResponse
        setPix(response)
      } catch (err) {
        setError(err instanceof Error ? err.message : PAYMENT_UNAVAILABLE_MESSAGE)
      } finally {
        setGenerating(false)
      }
    })()
  }, [orderId])

  // Pede o código ao montar — guarda contra a dupla montagem do StrictMode, que em
  // desenvolvimento pediria DOIS códigos ao Mercado Pago para o mesmo pedido.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    generate()
  }, [generate])

  /**
   * `PIX-P1-07` — a espera longa é ESTADO, não animação.
   *
   * O relógio reinicia a cada geração (inclusive na retentativa), e a linha some quando a resposta
   * chega. Sem o `setSlow(false)` na entrada, uma segunda tentativa nasceria já dizendo que está
   * demorando.
   */
  useEffect(() => {
    setSlow(false)
    if (!generating) return
    const id = setTimeout(() => setSlow(true), PIX_SLOW_MS)
    return () => clearTimeout(id)
  }, [generating])

  // Timer regressivo até `expires_at`. O tempo é do BANCO: a loja conta a partir da data que veio
  // na resposta, nunca a partir de um prazo próprio.
  useEffect(() => {
    if (!pix) {
      setSecondsLeft(null)
      return
    }
    const compute = () =>
      Math.max(0, Math.floor((new Date(pix.expires_at).getTime() - Date.now()) / 1000))
    setSecondsLeft(compute())
    const id = setInterval(() => setSecondsLeft(compute()), 1000)
    return () => clearInterval(id)
  }, [pix])

  // Aprovação ao vivo: UPDATE na linha do pedido → `approved` (`PAY-13`).
  useEffect(() => {
    const channel = supabase
      .channel(`order-payment-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const next = (payload as { new?: { payment_status?: string } }).new
          if (next?.payment_status === 'approved') setApproved(true)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  /**
   * `CSC-05` — **a convidada não recebe o evento acima**, e sem isto ela paga e fica no QR para
   * sempre.
   *
   * O Realtime respeita RLS, e a única policy de `SELECT` em `orders` é `TO authenticated`. Quem
   * comprou sem conta é `anon`: o canal conecta, o filtro casa, e o payload **nunca chega** — o
   * modo de falha mais silencioso possível, porque não há erro nenhum.
   *
   * A saída é perguntar, pela MESMA porta que a confirmação usa (`fetchGuestOrder`), então não há
   * uma segunda leitura de pedido para divergir. Quem tem sessão não tem token guardado para este
   * pedido: o efeito não faz nada, e o Realtime segue sendo o caminho dela.
   */
  useEffect(() => {
    const token = accessFor(orderId)
    if (!token) return

    let vivo = true
    const perguntar = async () => {
      const pedido = await fetchGuestOrder<{ payment_status?: string }>(orderId, token)
      if (!vivo) return
      if (pedido?.payment_status === 'approved') setApproved(true)
    }

    const id = setInterval(() => void perguntar(), GUEST_POLL_MS)
    return () => {
      vivo = false
      clearInterval(id)
    }
  }, [orderId])

  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current)
    },
    [],
  )

  const copy = useCallback(() => {
    const codigo = pix?.qr_code
    if (!codigo) return
    // A área de transferência não existe em contexto inseguro nem em todo navegador embutido. Aqui
    // a tela inteira é o pagamento: um throw no manipulador do clique deixaria a cliente sem saída
    // na hora de pagar, e o código continua visível e selecionável ao lado do botão.
    try {
      void navigator.clipboard?.writeText(codigo)
    } catch {
      /* indisponível: o código segue na tela para copiar à mão */
    }
    setCopied(true)
    if (copiedTimer.current) clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS)
  }, [pix])

  /**
   * A ordem dos ramos É a regra, e cada um dos três primeiros tem um motivo:
   *
   * 1. **Aprovado vence tudo.** `PIX-P2-04` e a borda da spec dizem que a aprovação que chega com
   *    a tela em "expirado" ou em "falha" segue para a confirmação do mesmo jeito. Com `failed`
   *    na frente, quem pagou no último segundo ficaria olhando um erro.
   * 2. **Falha vence "gerando"**, senão a tela de erro nunca apareceria: `generating` já voltou a
   *    ser falso quando o erro chega, mas o código continua ausente e o ramo seguinte trataria o
   *    caso como espera — que é como a espera infinita do `BUG-20260728` se parecia.
   * 3. **Sem código é espera, não expiração.** O contador nasce ausente, e um `<= 0` avaliado
   *    sobre ele diria "expirou" antes de existir código nenhum.
   */
  const state = useMemo<PixState>(() => {
    if (approved) return { kind: 'approved' }
    if (error) return { kind: 'failed', message: error }
    if (generating || !pix) return { kind: 'generating', slow }
    if (secondsLeft !== null && secondsLeft <= 0) return { kind: 'expired' }
    return { kind: 'ready', qrCode: pix.qr_code, secondsLeft: secondsLeft ?? 0 }
  }, [approved, error, generating, pix, slow, secondsLeft])

  return { state, generate, copy, copied }
}
