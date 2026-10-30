// `PED-17` / `D5` — a transição de material em lote.
//
// ---------------------------------------------------------------------------------------------
// POR QUE É UM LAÇO, E NÃO UMA RPC DE LOTE
// ---------------------------------------------------------------------------------------------
// **Não existe RPC de lote, e inventar uma seria uma segunda máquina de estado.** `set_material_status`
// guarda os estados de origem permitidos no próprio `where`, o que a torna idempotente sob
// concorrência; uma função nova que recebesse N ids teria de reimplementar essa guarda, e as duas
// divergiriam no primeiro ajuste — que é o defeito 01 aplicado a SQL.
//
// ---------------------------------------------------------------------------------------------
// POR QUE UMA FALHA NÃO ABORTA AS OUTRAS
// ---------------------------------------------------------------------------------------------
// Transição inválida é o caso ESPERADO, não a exceção: a Adri seleciona nove envelopes e dois deles
// outra aba já marcou. Abortar o lote inteiro por causa disso faria ela repetir tudo — e repetir um
// lote parcialmente aplicado é como se descobre que não dá para confiar no botão.
//
// O que o lote devolve é um RESUMO: quantas passaram, quantas não estavam em estado que permite, e
// quantas falharam de verdade. Três números diferentes, porque são três coisas diferentes.

import type { AdminOrderRow } from '@/entities/order/api/orderQuery'

/**
 * O teto por lote.
 *
 * Cada linha é uma ida ao servidor, então 200 seleções são 200 requisições em sequência — a tela
 * congelaria sem dizer por quê. Acima disso a resposta certa é filtrar melhor, e a barra diz isso.
 */
export const BULK_LIMIT = 50

export interface BulkOutcome {
  /** Passaram: a RPC devolveu `ok: true`. */
  changed: number
  /** A RPC recusou a transição — estado de origem não permitia. **Não é erro.** */
  refused: number
  /** A chamada falhou (rede, permissão). É erro, e aparece separado. */
  failed: number
  /** Os números do pedido que não passaram, para a tela poder nomeá-los. */
  refusedOrders: string[]
  failedOrders: string[]
  /**
   * Feature `88` (`CRG-11`): a soma de `emailSent` das escritas que passaram — os e-mails que o motor
   * disse ter mandado de fato, nunca os previstos.
   */
  emailsSent?: number
  /**
   * Feature `88`: com a caixa desmarcada, os pedidos que passaram e mandariam e-mail — a linha "Aviso à
   * cliente não enviado" ficou anotada no histórico de cada um.
   */
  annotated?: number
  /** Feature `88`: pedidos selecionados que o lote nem tentou (sem próximo status). */
  untouched?: number
}

/** O desfecho de UMA escrita do lote, na forma que `runBulk` conta. */
export interface BulkStep {
  ok: boolean
  /** `'rpc_failed'` é falha; qualquer outro motivo com `ok: false` é recusa. */
  reason: string | null
  emailSent?: boolean
}

export interface BulkOptions {
  /**
   * A caixa "Avisar as N clientes por e-mail" (`AVS-19`). Ausente ⇒ o lote gravou sem diálogo, e cada
   * escrita é chamada sem a escolha — o corpo do gatilho é o de antes da `88`.
   */
  avisarCliente?: boolean
  /** `CRG-10` — chamado depois de CADA pedido, inclusive o que falhou: `(feitos, total)`. */
  onProgress?: (feitos: number, total: number) => void
  /** Os ids cuja previsão (`customerNoticeFor`) mandaria e-mail — o que conta como "anotado". */
  previstos?: ReadonlySet<string>
}

export type MaterialTransitionFn = (
  id: string,
  status: string,
  avisarCliente?: boolean,
) => Promise<BulkStep>

/**
 * O laço comum aos dois lotes: uma escrita por vez, nada aborta, e o progresso a cada pedido.
 *
 * `step` recebe a escolha só quando houve escolha — sem diálogo, nenhum argumento a mais.
 */
export const runBulk = async (
  rows: AdminOrderRow[],
  step: (row: AdminOrderRow, avisarCliente: boolean | undefined) => Promise<BulkStep>,
  { avisarCliente, onProgress, previstos }: BulkOptions = {},
): Promise<BulkOutcome> => {
  const outcome: BulkOutcome = {
    changed: 0,
    refused: 0,
    failed: 0,
    refusedOrders: [],
    failedOrders: [],
    emailsSent: 0,
    annotated: 0,
    untouched: 0,
  }

  const lote = rows.slice(0, BULK_LIMIT)
  let feitos = 0
  for (const row of lote) {
    try {
      const resultado = await step(row, avisarCliente)
      if (resultado.ok) {
        outcome.changed += 1
        if (resultado.emailSent === true) outcome.emailsSent += 1
        if (avisarCliente === false && previstos?.has(row.id)) outcome.annotated += 1
      } else if (resultado.reason === 'rpc_failed') {
        outcome.failed += 1
        outcome.failedOrders.push(row.order_number)
      } else {
        outcome.refused += 1
        outcome.refusedOrders.push(row.order_number)
      }
    } catch {
      // Uma exceção não pode encerrar o laço: as linhas seguintes não têm nada a ver com esta.
      outcome.failed += 1
      outcome.failedOrders.push(row.order_number)
    }
    feitos += 1
    onProgress?.(feitos, lote.length)
  }

  return outcome
}

/**
 * Roda a transição linha a linha e resume.
 *
 * `rows` e não `ids`: a seleção guarda a **linha** (`PLS-06`), porque sem os valores atuais não há
 * como nomear o que não passou — e "2 não passaram" sem dizer quais é um relatório que ninguém
 * pode agir sobre.
 */
export const runMaterialBulk = (
  rows: AdminOrderRow[],
  status: string,
  transition: MaterialTransitionFn,
  opcoes: BulkOptions = {},
): Promise<BulkOutcome> =>
  runBulk(
    rows,
    (row, avisarCliente) =>
      avisarCliente === undefined ? transition(row.id, status) : transition(row.id, status, avisarCliente),
    opcoes,
  )

/**
 * O próximo status de cada estado — o que o lote "Avançar status" aplica.
 *
 * `delivered` e `cancelled` não têm próximo: são fim de linha, e um lote que os "avançasse" faria
 * pedido entregue voltar a andar.
 */
export const NEXT_STATUS: Record<string, string | undefined> = {
  pending: 'paid',
  paid: 'separating',
  separating: 'shipped',
  shipped: 'delivered',
}

export type StatusUpdateFn = (
  id: string,
  status: string,
  avisarCliente?: boolean,
) => Promise<{ error: unknown; emailSent?: boolean }>

/**
 * Feature `88` (`CRG-10`, `CRG-11`) — o "Avançar status" em lote, com o mesmo contrato do de material.
 *
 * Só os pedidos com próximo status entram no laço (e no progresso); os outros ficam como estão e são
 * contados em `untouched`. O erro da escrita é FALHA — `writeOrderStatus` não tem recusa de transição.
 */
export const runStatusBulk = async (
  rows: AdminOrderRow[],
  update: StatusUpdateFn,
  opcoes: BulkOptions = {},
): Promise<BulkOutcome> => {
  const lote = rows.slice(0, BULK_LIMIT)
  const andam = lote.filter((r) => NEXT_STATUS[r.status])
  const outcome = await runBulk(
    andam,
    async (row, avisarCliente) => {
      const to = NEXT_STATUS[row.status] as string
      const r = avisarCliente === undefined ? await update(row.id, to) : await update(row.id, to, avisarCliente)
      return r.error ? { ok: false, reason: 'rpc_failed' } : { ok: true, reason: null, emailSent: r.emailSent === true }
    },
    opcoes,
  )
  outcome.untouched = lote.length - andam.length
  return outcome
}

/** O verbo do resumo, no singular e no plural ("1 marcada", "7 avançaram"). */
export interface BulkVerb {
  um: string
  varios: string
}

const MARCADAS: BulkVerb = { um: 'marcada', varios: 'marcadas' }

/**
 * O resumo em texto — `"7 marcadas · 2 não estavam em estado que permite"`.
 *
 * Cada parcela só aparece quando é diferente de zero: "7 marcadas · 0 recusadas · 0 falharam" faz
 * quem lê procurar um problema que não existe.
 *
 * Feature `88` (`CRG-11`): com `aviso`, a última parcela diz o que aconteceu com os e-mails — pela
 * CAIXA quando ela foi desmarcada (o motor responde `sent: true` também pelo aviso à dona), e pela soma
 * de `emailSent` quando ela ficou marcada.
 */
export const bulkSummary = (
  outcome: BulkOutcome,
  { verbo = MARCADAS, aviso }: { verbo?: BulkVerb; aviso?: { perguntou: boolean; avisar: boolean } } = {},
): string => {
  const partes: string[] = []

  if (outcome.changed > 0) {
    partes.push(`${outcome.changed} ${outcome.changed === 1 ? verbo.um : verbo.varios}`)
  }
  if (outcome.untouched) {
    // O motivo vai junto (conserto do QA da `88`): `untouched` só existe no lote de status, e é o
    // pedido sem próximo passo — o mesmo "já no fim do caminho" que o diálogo do lote mostrou.
    partes.push(
      `${outcome.untouched} ${outcome.untouched === 1 ? 'ficou como estava' : 'ficaram como estavam'} (já no fim do caminho)`,
    )
  }
  if (outcome.refused > 0) {
    partes.push(
      `${outcome.refused} não estava${outcome.refused === 1 ? '' : 'm'} em estado que permite`,
    )
  }
  if (outcome.failed > 0) {
    partes.push(`${outcome.failed} falhou${outcome.failed === 1 ? '' : 'ram'} — tente de novo`)
  }

  if (partes.length === 0) return 'Nada mudou'

  if (aviso && outcome.changed > 0) {
    const enviados = outcome.emailsSent ?? 0
    const anotados = outcome.annotated ?? 0
    if (aviso.perguntou && !aviso.avisar) {
      partes.push(`sem e-mail às clientes — anotado no histórico de ${anotados} pedido${anotados === 1 ? '' : 's'}`)
    } else if (enviados > 0) {
      partes.push(`${enviados} e-mail${enviados === 1 ? '' : 's'} enviado${enviados === 1 ? '' : 's'}`)
    } else if (aviso.perguntou) {
      partes.push('nenhum e-mail saiu')
    } else {
      partes.push('nenhum aviso sai nestas mudanças')
    }
  }

  return partes.join(' · ')
}
