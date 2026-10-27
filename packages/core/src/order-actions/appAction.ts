// Feature `75` · `MAA-02`, `07`, `08`, `09`, `13`, `14`, `15`, `38`, `40` — a ação do app do ateliê,
// composta sobre as três escritas do dono (design §5.2).
//
// O app NÃO escreve regra: ele repassa a linha e o pedido, e quem diz o que gravar — e com que guarda
// de status — é `appPrimaryAction`/`trackingSheet` (`core/orders`). A normalização e a recusa do
// código (A8) moram AQUI, e nunca em `writeTrackingCode`: o painel não valida.
//
// A ordem das escritas, e por que cada passo que falha encerra:
//   - Separar com o material: material `em_producao` PRIMEIRO; qualquer desfecho que não seja `ok`
//     encerra sem tocar no status (`MAA-09`). Status que falha DEPOIS ⇒ `parcial 'material'`
//     (`MAA-40`). A retentativa recalcula o plano da linha relida: com o material já em produção,
//     `materialAntes` é falso e só o status é gravado — sem regra própria.
//   - Rastreio: passo 1 o código (com a guarda da folha, sem transportadora, sem aviso), PULADO só
//     em `enviar` com o código igual ao salvo (a retentativa de `MAA-15` grava só o que falta); passo
//     2 o status, só com `avancaPara`; UM aviso no fim. Status que falha depois do código ⇒
//     `parcial 'rastreio'`, sem aviso.
//
// Quando a linha não oferece o que foi pedido (rastreio sem folha, código curto, ação sem plano),
// nada vai à rede e o desfecho é `falhou` — nunca `nenhuma-linha`, que afirmaria "o pedido mudou"
// sem ter perguntado ao banco. A exceção é a RETENTATIVA com `espera` (QA C01): a linha que ela
// recebe é a relida do banco, então "não oferece mais a ação" é resposta, e o desfecho é `mudou`.

import { canStartProduction, materialTrackingEdit } from '../material/envelope.ts'
import { toMaterialStatus } from '../material/material.ts'
import { appPrimaryAction, trackingSheet, type AppActionInput } from '../orders/appAction.ts'
import { normalizeMaterialTrackingCode, normalizeTrackingCode, trackingCodeRefusal } from '../orders/tracking.ts'
import { writeMaterialStatus } from './material.ts'
import { writeMaterialTracking } from './materialTracking.ts'
import { writeOrderStatus } from './status.ts'
import { writeTrackingCode } from './tracking.ts'
import type { AppActionOutcome, MaterialOutcome, OrderWriteDeps, PedidoDaAcao, WriteOutcome } from './types.ts'

/** A linha que a porta do app repassa — a `LinhaDaLista` da `74` satisfaz. */
export interface LinhaDaAcao extends AppActionInput {
  id: string
  /** Feature `82`: o código do envelope atual (a linha do detalhe o tem; a da lista, não). */
  material_tracking_code?: string | null
}

const semRede = (motivo: string): AppActionOutcome => ({ tipo: 'falhou', erro: new Error(motivo) })

const doMaterial = (r: MaterialOutcome, to: string): AppActionOutcome => {
  switch (r.tipo) {
    case 'ok':
      return { tipo: 'ok', emailSent: r.emailSent, materialMudou: false }
    case 'sem-papel':
      return { tipo: 'sem-papel' }
    case 'material-recusado':
      return { tipo: 'material-recusado', reason: r.reason, status: r.status, to }
    default:
      return { tipo: 'falhou', erro: (r as { erro: unknown }).erro }
  }
}

const daEscrita = (r: WriteOutcome, materialMudou = false): AppActionOutcome => {
  switch (r.tipo) {
    case 'ok':
      return { tipo: 'ok', emailSent: r.emailSent, materialMudou }
    case 'nenhuma-linha':
      return { tipo: 'nenhuma-linha' }
    default:
      return { tipo: 'falhou', erro: (r as { erro: unknown }).erro }
  }
}

export async function runAppAction(
  deps: OrderWriteDeps,
  row: LinhaDaAcao,
  pedido: PedidoDaAcao,
): Promise<AppActionOutcome> {
  const id = row.id

  // Feature `82` (`ENV-07`, A8): o código do envelope DA CLIENTE. A linha que não oferece mais a
  // edição (o envelope chegou, o pedido foi cancelado — a releitura com a folha aberta) é RESPOSTA do
  // banco: `mudou`, sem rede. O código curto é recusado antes da rede, como o rastreio de saída. O
  // código igual ao atual VAI à RPC (Edge Cases: ela é idempotente e atualiza a autoria).
  // `nao-permitido` vira `nenhuma-linha`: a porta do app já transforma isso em conferência de papel.
  if (pedido.tipo === 'rastreio-do-material') {
    if (!materialTrackingEdit(row)) return { tipo: 'mudou' }
    // T19: a recusa do curto é julgada sobre a forma única do envelope (sem hífen e ponto).
    const codigoDoEnvelope = normalizeMaterialTrackingCode(pedido.codigo)
    const recusa = trackingCodeRefusal(codigoDoEnvelope)
    if (recusa) return semRede(recusa)
    const antes = toMaterialStatus(row.material_status)
    const r = await writeMaterialTracking(deps, { id, code: codigoDoEnvelope })
    switch (r.tipo) {
      case 'ok':
        return {
          tipo: 'ok',
          emailSent: r.emailSent,
          materialMudou: false,
          materialPassou: antes === 'aguardando_material' && r.status === 'material_enviado',
        }
      case 'recusado':
        return { tipo: 'material-rastreio-recusado', reason: r.reason }
      case 'nao-permitido':
        return { tipo: 'nenhuma-linha' }
      default:
        return { tipo: 'falhou', erro: (r as { erro: unknown }).erro }
    }
  }

  // Feature `82` (`ENV-25`, A10): "Colocar em produção" grava SÓ o material — o status do pedido
  // continua com "Iniciar separação" no rodapé. Fora de `material_recebido`, ou cancelado, a linha
  // relida já não oferece o botão: `mudou`, sem rede.
  if (pedido.tipo === 'producao') {
    if (!canStartProduction(row)) return { tipo: 'mudou' }
    return doMaterial(await writeMaterialStatus(deps, { id, to: 'em_producao' }), 'em_producao')
  }

  if (pedido.tipo === 'rastreio') {
    const folha = trackingSheet(row, pedido.origem)
    if (!folha) return semRede('Este pedido não tem rastreio para salvar.')
    const recusa = trackingCodeRefusal(pedido.codigo)
    if (recusa) return semRede(recusa)
    const codigo = normalizeTrackingCode(pedido.codigo)

    const pula = folha.modo === 'enviar' && codigo === row.tracking_code
    if (!pula) {
      const r = await writeTrackingCode(deps, { id, code: codigo, statusIn: folha.guarda, avisar: false })
      if (r.tipo !== 'ok') return daEscrita(r)
    }

    if (folha.avancaPara) {
      const s = await writeOrderStatus(deps, {
        id,
        to: folha.avancaPara,
        from: 'separating',
        expectedFrom: 'separating',
        avisar: false,
      })
      if (s.tipo !== 'ok') return { tipo: 'parcial', etapa: 'rastreio', causa: s.tipo === 'nenhuma-linha' ? 'nenhuma-linha' : 'falhou' }
    }

    const emailSent = await deps.notify(id, 'order_status_changed')
    return { tipo: 'ok', emailSent, materialMudou: false }
  }

  const { action, plano } = appPrimaryAction(row)

  // A retentativa diz o que reenvia (QA C01): a linha que ela recebe é a RELIDA, e se ela já não
  // oferece essa ação o pedido mudou desde a falha — outra aba o levou a `separating`, o painel o
  // cancelou. Nada vai à rede, e o desfecho é `mudou`, nunca `falhou` (que diria "Não consegui
  // salvar" sem ter tentado, num laço sem saída). A linha relida É a resposta do banco.
  if (pedido.espera && action !== pedido.espera) return { tipo: 'mudou' }

  switch (plano.tipo) {
    case 'material':
      return doMaterial(await writeMaterialStatus(deps, { id, to: plano.to }), plano.to)

    case 'separar': {
      let emailDoMaterial: boolean | null = null
      if (plano.materialAntes) {
        const m = await writeMaterialStatus(deps, { id, to: 'em_producao' })
        if (m.tipo !== 'ok') return doMaterial(m, 'em_producao')
        emailDoMaterial = (m as { emailSent: boolean }).emailSent
      }
      const s = await writeOrderStatus(deps, { id, to: plano.to, from: plano.from, expectedFrom: plano.from })
      if (emailDoMaterial === null) return daEscrita(s)
      if (s.tipo !== 'ok') return { tipo: 'parcial', etapa: 'material', causa: s.tipo === 'nenhuma-linha' ? 'nenhuma-linha' : 'falhou' }
      // O e-mail que a confirmação pode citar é o do material (`in_production`): o
      // `order_status_changed` de `separating` não produz mensagem (`MAA-08`).
      return { tipo: 'ok', emailSent: emailDoMaterial, materialMudou: true }
    }

    case 'status':
      return daEscrita(await writeOrderStatus(deps, { id, to: plano.to, from: plano.from, expectedFrom: plano.from }))

    case 'folha':
      return semRede('Esta ação pede o código de rastreio.')

    default:
      return semRede('Este pedido não tem ação para gravar.')
  }
}
