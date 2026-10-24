// `PED-23` / `D8` — o que cada linha diz quando não há espaço para uma tabela.
//
// Feature `74` (`MAP-17`, `MAP-21`, `MAP-47`, `MAP-48`): subiu BYTE A BYTE de
// `apps/backoffice/src/features/order-list/model/rowSummary.ts` — o cartão do painel no celular e a
// linha do app do ateliê dizem a mesma frase. O arquivo do painel virou reexportação. A entrada é
// estrutural (`RowSummaryInput`): o `AdminOrderRow` do painel a satisfaz.
//
// No celular a fila é consultada com o envelope na mão, e a pergunta é sempre a mesma: **o que este
// pedido está esperando, e o que eu faço agora?** Uma tabela de sete colunas responde as duas
// escondendo as duas.
//
// Puro de propósito: é regra ("qual é a ação primária deste estado?"), e regra em componente não se
// testa sem montar tela — e jsdom devolve 0 para toda medida de layout, então o teste que importa
// aqui é o do texto, não o do desenho.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { toMaterialStatus } from '../material/material.ts'

export type PrimaryActionId =
  | 'registrar-recebimento'
  | 'anotar-rastreio-envelope'
  | 'marcar-enviado'
  | 'salvar-rastreio'
  | 'separar'
  | 'nenhuma'

export interface RowSummary {
  /** O que segura este pedido, em uma frase curta. Vai abaixo do nome, no cartão. */
  blocker: string
  action: PrimaryActionId
  /** O rótulo do botão de largura inteira, em 44px. Vazio quando não há ação. */
  actionLabel: string
}

/** As colunas que a frase da linha lê. */
export interface RowSummaryInput {
  material_status: string | null
  status: string
  tracking_code: string | null
  payment_method: string | null
}

/**
 * A ação primária **do estado atual**, e só ela.
 *
 * A ordem dos testes é a ordem da operação, não a do esquema: o material vem antes do status porque
 * enquanto o envelope não chega, nada mais importa — nem que o pedido esteja pago há duas semanas.
 */
export const rowSummary = (row: RowSummaryInput): RowSummary => {
  const material = toMaterialStatus(row.material_status)

  if (material === 'aguardando_material') {
    return {
      blocker: 'Esperando o envelope da cliente',
      action: 'registrar-recebimento',
      actionLabel: 'Recebi o material',
    }
  }

  if (material === 'material_enviado') {
    return {
      blocker: 'Material a caminho',
      action: 'registrar-recebimento',
      actionLabel: 'Recebi o material',
    }
  }

  // Enviado sem código é FALHA SILENCIOSA, não espera: o e-mail "sua joia foi postada" só sai
  // quando o rastreio é gravado, então a cliente não foi avisada e ninguém sabe disso.
  if (row.status === 'shipped' && !row.tracking_code) {
    return {
      blocker: 'Sem código — a cliente não foi avisada',
      action: 'salvar-rastreio',
      actionLabel: 'Salvar rastreio',
    }
  }

  if (row.status === 'paid') {
    return {
      blocker: material === 'material_recebido' ? 'Material na bancada' : 'Pago, a separar',
      action: 'separar',
      actionLabel: 'Iniciar separação',
    }
  }

  if (row.status === 'separating') {
    return {
      blocker: 'Em separação',
      action: 'marcar-enviado',
      actionLabel: 'Marcar como enviado',
    }
  }

  if (row.status === 'pending') {
    return {
      // Pix pendente expira sozinho. Oferecer ação aqui faria a Adri achar que deve algo.
      blocker: row.payment_method === 'pix' ? 'Pix aguardando — expira sozinho' : 'Pagamento pendente',
      action: 'nenhuma',
      actionLabel: '',
    }
  }

  return { blocker: '', action: 'nenhuma', actionLabel: '' }
}
