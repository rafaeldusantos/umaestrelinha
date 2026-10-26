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

import { appPrimaryAction, trackingSheet, type AppActionInput } from '../orders/appAction.ts'
import { normalizeTrackingCode, trackingCodeRefusal } from '../orders/tracking.ts'
import { writeMaterialStatus } from './material.ts'
import { writeOrderStatus } from './status.ts'
import { writeTrackingCode } from './tracking.ts'
import type { AppActionOutcome, MaterialOutcome, OrderWriteDeps, PedidoDaAcao, WriteOutcome } from './types.ts'

/** A linha que a porta do app repassa — a `LinhaDaLista` da `74` satisfaz. */
export interface LinhaDaAcao extends AppActionInput {
  id: string
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
