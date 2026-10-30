// Feature `88` — o caminho inteiro de um gesto que pode avisar a cliente, num lugar só (`AVS-01`,
// `AVS-06`, `AVS-07`, `CRG-01`, `CRG-02`, `CRG-09`).
//
// A página do pedido tem sete gestos assim (Próximo passo, Outro status, Salvar rastreio, os três do
// material e o cancelamento) e a lista tem mais três. Cada um faria a mesma sequência: perguntar à
// previsão (`customerNoticeFor`), abrir o portão ou gravar direto, rodar uma gravação por vez e dizer o
// desfecho. Escrita em cada gesto, a frase do resultado divergiria na primeira mudança — e é ela que
// decide se a Adri acha que avisou a cliente.
//
// Duas regras de produto moram aqui:
// - **Com a caixa desmarcada, a frase decide-se pela CAIXA**, nunca por `emailSent`: o motor responde
//   `sent: true` quando o aviso à DONA saiu, e "a cliente foi avisada" seria mentira.
// - **A nota da dona é decidida por PÚBLICO** (`EVENT_AUDIENCE` dos eventos do gatilho), nunca por nome
//   de evento — o painel não escreve nome de evento (`notificationSingleOwner`).

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  customerNoticeFor,
  EVENT_AUDIENCE,
  eventsForTrigger,
  NOTIFICATION_EVENT_NAMES,
  type NotificationEvent,
  type NotificationSettings,
  type NotificationTrigger,
  type OrderSnapshot,
} from '@estrelinha/core/notifications'
import { usePendingAction } from '@/shared/lib/usePendingAction'
import { blocoDe, devolverFoco, tituloDaPagina, type Alternativa } from '@/shared/lib/foco'
import { SENT_EMAILS_READ_FAILED } from '@/entities/order/api/sentEmails'
import { FALHA_INESPERADA, useNoticeGate } from './useNoticeGate'

/** O desfecho da escrita: `erro` é a frase do que NÃO mudou; `emailSent` é o que o motor respondeu. */
export interface DesfechoDaGravacao {
  erro: string | null
  emailSent?: boolean
}

export interface Gesto {
  /** A chave da gravação em `usePendingAction` — é ela que acende o gerúndio no botão do gesto. */
  chave: string
  trigger: NotificationTrigger
  /** O pedido como fica DEPOIS da escrita (a previsão olha o estado de destino). */
  depois: OrderSnapshot & { customer_email?: string | null }
  titulo: string
  mudanca: string
  confirmar: string
  gerundio: string
  /** O começo da frase de resultado ("Status: Enviado", "Rastreio salvo"). */
  sucesso: string
  /** O pedido da prévia de "Ver o e-mail". */
  orderId?: string
  /**
   * O que a cliente JÁ recebeu deste pedido, quando quem chama leu na hora do gesto (o cartão da lista
   * lê `order_notifications` daquele pedido ao tocar). Ausente ⇒ o `enviados` do hook.
   */
  enviados?: ReadonlySet<NotificationEvent>
  /**
   * A escrita. `avisarCliente` é `undefined` quando o gesto gravou SEM diálogo (nenhum e-mail previsto):
   * quem grava deve então chamar o hook sem a escolha, e o corpo do gatilho é o de antes da `88`.
   */
  gravar: (avisarCliente: boolean | undefined) => Promise<DesfechoDaGravacao>
  /** "Voltar", `Esc` ou clique fora no diálogo: nada foi gravado. */
  aoCancelar?: () => void
  /**
   * Conserto do QA (foco): o controle que disparou o gesto, quando quem chama já o desabilitou antes de
   * `acionar` (o cartão da lista lê os envios primeiro). Ausente ⇒ o elemento focado no início.
   */
  origem?: Element | null
  /** Para onde o foco vai quando a origem sumiu ou não aceita foco (antes do bloco e do título). */
  focoDepois?: Alternativa
}

/** Uma gravação já estava em curso quando o diálogo confirmou (o portão de `CRG-02` a recusou). */
export const OUTRA_GRAVACAO = 'Outra alteração deste pedido ainda está sendo gravada. Espere ela terminar.'

const nome = (e: NotificationEvent) => `“${NOTIFICATION_EVENT_NAMES[e]}”`

/** `AVS-07` — a frase do desfecho, nas quatro formas (mais a do gesto sem diálogo). */
export function fraseDoResultado(
  sucesso: string,
  { perguntou, avisar, emailSent, jaEnviados }: {
    perguntou: boolean
    avisar: boolean
    emailSent: boolean
    jaEnviados: readonly NotificationEvent[]
  },
): string {
  if (perguntou && !avisar) return `${sucesso} · sem e-mail à cliente (anotado no histórico)`
  if (emailSent) return `${sucesso} — a cliente foi avisada por e-mail`
  if (perguntou) return `${sucesso} — o e-mail não saiu — o pedido foi alterado`
  if (jaEnviados.length > 0) return `${sucesso} · ${nome(jaEnviados[0])} já tinha sido enviado, não sai de novo`
  return `${sucesso} · nenhum aviso sai nesta mudança`
}

/** `A-04` — a caixa vale só para a cliente. A frase existe quando o gatilho também avisa a dona. */
export function notaDaDonaPara(trigger: NotificationTrigger, depois: OrderSnapshot): string | null {
  const daDona = eventsForTrigger(trigger, depois).filter((e) => EVENT_AUDIENCE[e] === 'owner')
  if (daDona.length === 0) return null
  return `O aviso ${daDona.map(nome).join(', ')}, para você, não depende desta caixa: ele segue o que está em Configurações → Notificações.`
}

/** O pedido de foco que o efeito cumpre DEPOIS do commit — quando o botão já foi reabilitado. */
interface PedidoDeFoco {
  origem: Element | null
  alternativas: Alternativa[]
}

export interface GestoComAviso {
  /** Roda o gesto. Termina quando ele termina: `true` gravou, `false` desistiu, foi ignorado ou falhou. */
  acionar: (g: Gesto) => Promise<boolean>
  pendente: string | null
  /** O diálogo de aviso estará aberto ou gravando. */
  ocupado: boolean
  rodar: ReturnType<typeof usePendingAction>['rodar']
  /** O portão cru, para o lote, que monta o próprio pedido (contagem, "já recebeu", a lista). */
  pedir: ReturnType<typeof useNoticeGate>['pedir']
  anunciar: (texto: string) => void
  /**
   * Conserto do QA (paper cut: o resultado ouvido duas vezes): o desfecho que vai no aviso flutuante.
   * A região viva do sonner o anuncia; a do gesto é esvaziada para não repetir — UM anúncio por desfecho.
   */
  informar: (tipo: 'success' | 'error', frase: string) => void
  /** Devolve o foco à origem (ou à primeira alternativa que existe) depois do próximo commit. */
  devolverFocoDepois: (origem: Element | null, ...alternativas: Alternativa[]) => void
  /** Montar UMA vez na tela. */
  dialogo: ReactNode
  /** Montar UMA vez na tela. */
  regiaoViva: ReactNode
}

export function useGestoComAviso({
  settings,
  enviados,
  enviadosIndisponiveis = false,
}: {
  settings: Partial<NotificationSettings> | null | undefined
  enviados: ReadonlySet<NotificationEvent>
  /**
   * Conserto do QA (`A-14`): a leitura dos envios deste pedido FALHOU. Um gesto cuja previsão teria
   * algum e-mail é recusado ("Nada foi alterado") — sem saber o que já saiu, a pergunta e a frase do
   * resultado seriam inventadas. Gesto sem e-mail previsto segue normalmente.
   */
  enviadosIndisponiveis?: boolean
}): GestoComAviso {
  const { pedir, dialogo, ocupado } = useNoticeGate()
  const { pendente, rodar, anunciar, regiaoViva } = usePendingAction()

  // O foco volta DEPOIS do commit: no fim de `rodar` o botão ainda está desabilitado no DOM, e o
  // navegador já tirou o foco dele (`BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido`).
  const [pedidoDeFoco, setPedidoDeFoco] = useState<PedidoDeFoco | null>(null)
  useEffect(() => {
    if (!pedidoDeFoco) return
    devolverFoco(pedidoDeFoco.origem, ...pedidoDeFoco.alternativas)
    setPedidoDeFoco(null)
  }, [pedidoDeFoco])
  const devolverFocoDepois = useCallback(
    (origem: Element | null, ...alternativas: Alternativa[]) => setPedidoDeFoco({ origem, alternativas }),
    [],
  )

  const informar = useCallback(
    (tipo: 'success' | 'error', frase: string) => {
      if (tipo === 'success') toast.success(frase)
      else toast.error(frase)
      anunciar('')
    },
    [anunciar],
  )

  const concluir = useCallback((frase: string) => informar('success', frase), [informar])

  const acionar = useCallback(
    (g: Gesto): Promise<boolean> => {
      const previsto = customerNoticeFor(g.trigger, g.depois, settings, g.enviados ?? enviados)
      const origem = g.origem !== undefined ? g.origem : document.activeElement
      const alternativas = [g.focoDepois, blocoDe(origem), tituloDaPagina].filter(Boolean) as Alternativa[]

      // `A-14` (conserto do QA): sem a leitura dos envios, a previsão não sabe o que já saiu.
      if (enviadosIndisponiveis && previsto.send.length > 0) {
        informar('error', SENT_EMAILS_READ_FAILED)
        devolverFocoDepois(origem, ...alternativas)
        return Promise.resolve(false)
      }

      // `AVS-06` / `AVS-23`: nenhum e-mail à cliente sairia — grava direto, sem a escolha.
      if (previsto.send.length === 0) {
        return (async () => {
          let r: DesfechoDaGravacao | undefined
          try {
            r = await rodar(g.chave, g.gerundio, () => g.gravar(undefined))
          } catch {
            r = { erro: FALHA_INESPERADA }
          }
          devolverFocoDepois(origem, ...alternativas)
          if (!r) return false
          if (r.erro) {
            informar('error', r.erro)
            return false
          }
          concluir(
            fraseDoResultado(g.sucesso, {
              perguntou: false,
              avisar: true,
              emailSent: r.emailSent === true,
              jaEnviados: previsto.alreadySent,
            }),
          )
          return true
        })()
      }

      // `AVS-01`: o portão abre ANTES de qualquer escrita; quem grava é o `executar`.
      return new Promise<boolean>((resolve) => {
        pedir({
          titulo: g.titulo,
          mudanca: g.mudanca,
          confirmar: g.confirmar,
          gerundio: g.gerundio,
          cliente: String(g.depois.customer_email ?? ''),
          orderId: g.orderId,
          eventos: previsto.send.map((event) => ({ event })),
          notaDaDona: notaDaDonaPara(g.trigger, g.depois),
          origem,
          focoDepois: alternativas,
          executar: async (avisar) => {
            const r = await rodar(g.chave, g.gerundio, () => g.gravar(avisar))
            if (!r) return OUTRA_GRAVACAO
            // A frase de falha fica DENTRO do diálogo, num alerta: ele é o anúncio (um só).
            if (r.erro) return r.erro
            concluir(
              fraseDoResultado(g.sucesso, {
                perguntou: true,
                avisar,
                emailSent: r.emailSent === true,
                jaEnviados: previsto.alreadySent,
              }),
            )
            resolve(true)
            return null
          },
          aoCancelar: () => {
            g.aoCancelar?.()
            resolve(false)
          },
        })
      })
    },
    [settings, enviados, enviadosIndisponiveis, pedir, rodar, informar, concluir, devolverFocoDepois],
  )

  return {
    acionar, pendente, ocupado, rodar, pedir, anunciar, informar, devolverFocoDepois, dialogo, regiaoViva,
  }
}
