// Feature `75` — a regra da ação do app do ateliê, pura, em `core/orders/appAction.ts`.
//
// Rótulos, títulos e frases são ESCRITOS POR EXTENSO aqui, nunca lidos da implementação: comparar a
// constante com ela mesma passaria com o texto trocado. Cada linha das tabelas do Design (§5.1, A10,
// A11) tem caso próprio.

import { describe, expect, it } from 'vitest'

import { URGENCY_TERMS } from '../../notifications/copy.ts'
import {
  ACTION_FAILED,
  ORDER_CHANGED,
  PARTIAL_MATERIAL,
  PARTIAL_TRACKING,
  SAVING,
  actionConfirmation,
  appPrimaryAction,
  canChargeMaterial,
  shippedNoticeSent,
  trackingEdit,
  trackingSheet,
  type AppActionInput,
} from '../appAction.ts'

const linha = (extra: Partial<AppActionInput> = {}): AppActionInput => ({
  status: 'paid',
  material_status: 'nao_aplicavel',
  tracking_code: null,
  payment_method: 'pix',
  shipping_service_id: 'correios-pac',
  ...extra,
})

const RETIRADA = 'retirada'

describe('appPrimaryAction — a tabela de §5.1, linha a linha (MAA-01, MAA-06, MAA-16, MAA-38, A14)', () => {
  it('cancelado COM material aguardando ⇒ nenhuma (o rowSummary sozinho diria "Recebi o material")', () => {
    expect(appPrimaryAction(linha({ status: 'cancelled', material_status: 'aguardando_material' }))).toEqual({
      action: 'nenhuma',
      label: '',
      plano: { tipo: 'nenhum' },
    })
  })

  it('cancelado com material a caminho ⇒ nenhuma', () => {
    expect(appPrimaryAction(linha({ status: 'cancelled', material_status: 'material_enviado' })).action).toBe('nenhuma')
  })

  it('entregue ⇒ nenhuma, com e sem material', () => {
    expect(appPrimaryAction(linha({ status: 'delivered', tracking_code: 'AN123456789BR' }))).toEqual({
      action: 'nenhuma',
      label: '',
      plano: { tipo: 'nenhum' },
    })
    expect(appPrimaryAction(linha({ status: 'delivered', material_status: 'aguardando_material' })).action).toBe('nenhuma')
  })

  it('material aguardando, pago ⇒ "Recebi o material"', () => {
    expect(appPrimaryAction(linha({ status: 'paid', material_status: 'aguardando_material' }))).toEqual({
      action: 'registrar-recebimento',
      label: 'Recebi o material',
      plano: { tipo: 'material', to: 'material_recebido' },
    })
  })

  it('material a caminho, pago ⇒ "Recebi o material"', () => {
    expect(appPrimaryAction(linha({ status: 'paid', material_status: 'material_enviado' }))).toEqual({
      action: 'registrar-recebimento',
      label: 'Recebi o material',
      plano: { tipo: 'material', to: 'material_recebido' },
    })
  })

  it('A15 — material aguardando com o pagamento PENDENTE ⇒ "Recebi o material" também', () => {
    expect(appPrimaryAction(linha({ status: 'pending', material_status: 'aguardando_material' })).action).toBe(
      'registrar-recebimento',
    )
    expect(appPrimaryAction(linha({ status: 'pending', material_status: 'material_enviado' })).label).toBe(
      'Recebi o material',
    )
  })

  it('enviado sem código, não retirada ⇒ "Salvar rastreio" pela folha', () => {
    expect(appPrimaryAction(linha({ status: 'shipped', tracking_code: null }))).toEqual({
      action: 'salvar-rastreio',
      label: 'Salvar rastreio',
      plano: { tipo: 'folha' },
    })
  })

  it('enviado COM código ⇒ nenhuma', () => {
    expect(appPrimaryAction(linha({ status: 'shipped', tracking_code: 'AN123456789BR' }))).toEqual({
      action: 'nenhuma',
      label: '',
      plano: { tipo: 'nenhum' },
    })
  })

  it('pago SEM material recebido ⇒ "Iniciar separação", materialAntes falso', () => {
    expect(appPrimaryAction(linha({ status: 'paid', material_status: 'nao_aplicavel' }))).toEqual({
      action: 'separar',
      label: 'Iniciar separação',
      plano: { tipo: 'separar', materialAntes: false, from: 'paid', to: 'separating' },
    })
  })

  it('pago COM material recebido ⇒ "Iniciar separação", materialAntes verdadeiro', () => {
    expect(appPrimaryAction(linha({ status: 'paid', material_status: 'material_recebido' }))).toEqual({
      action: 'separar',
      label: 'Iniciar separação',
      plano: { tipo: 'separar', materialAntes: true, from: 'paid', to: 'separating' },
    })
  })

  it('pago com material já em produção (a retentativa de MAA-40) ⇒ materialAntes falso', () => {
    expect(appPrimaryAction(linha({ status: 'paid', material_status: 'em_producao' })).plano).toEqual({
      tipo: 'separar',
      materialAntes: false,
      from: 'paid',
      to: 'separating',
    })
  })

  it('em separação, RETIRADA ⇒ "Marcar como retirado", plano separating → delivered (A16)', () => {
    expect(appPrimaryAction(linha({ status: 'separating', shipping_service_id: RETIRADA }))).toEqual({
      action: 'marcar-retirado',
      label: 'Marcar como retirado',
      plano: { tipo: 'status', from: 'separating', to: 'delivered' },
    })
  })

  it('em separação, não retirada ⇒ "Marcar como enviado" pela folha', () => {
    expect(appPrimaryAction(linha({ status: 'separating' }))).toEqual({
      action: 'marcar-enviado',
      label: 'Marcar como enviado',
      plano: { tipo: 'folha' },
    })
  })

  it('pendente sem material ⇒ nenhuma (Pix expira sozinho, cartão pendente idem)', () => {
    expect(appPrimaryAction(linha({ status: 'pending', payment_method: 'pix' })).action).toBe('nenhuma')
    expect(appPrimaryAction(linha({ status: 'pending', payment_method: 'credit_card' })).action).toBe('nenhuma')
  })

  it('MAA-16 — retirada nunca recebe ação de rastreio, nem enviada sem código (levada a shipped à mão)', () => {
    expect(appPrimaryAction(linha({ status: 'shipped', shipping_service_id: RETIRADA, tracking_code: null }))).toEqual({
      action: 'nenhuma',
      label: '',
      plano: { tipo: 'nenhum' },
    })
  })

  it('o plano discrimina por `tipo` STRING (R9, strictNullChecks false)', () => {
    const planos = [
      appPrimaryAction(linha({ status: 'paid', material_status: 'aguardando_material' })).plano,
      appPrimaryAction(linha({ status: 'paid' })).plano,
      appPrimaryAction(linha({ status: 'separating' })).plano,
      appPrimaryAction(linha({ status: 'separating', shipping_service_id: RETIRADA })).plano,
      appPrimaryAction(linha({ status: 'delivered' })).plano,
    ]
    expect(planos.map((p) => p.tipo)).toEqual(['material', 'separar', 'folha', 'status', 'nenhum'])
    for (const p of planos) expect(typeof p.tipo).toBe('string')
  })
})

// A10 — as três frases da folha, POR EXTENSO.
const FRASE_SEM_CODIGO = 'A cliente recebe o e-mail de postagem assim que você salvar o código.'
const FRASE_TROCA = 'A cliente já recebeu o aviso de postagem. O código novo aparece no pedido dela, mas não gera outro e-mail.'
const FRASE_ENTREGUE = 'O código aparece no pedido dela.'
const CODIGO = 'AN123456789BR'

describe('trackingSheet — os cinco casos (MAA-10, MAA-11, MAA-14, MAA-15, A10, A25)', () => {
  it('em separação, pelo rodapé ⇒ "Marcar como enviado", frase 1, guarda separating|shipped, avança para shipped, cita e-mail', () => {
    expect(trackingSheet(linha({ status: 'separating' }), 'acao')).toEqual({
      modo: 'enviar',
      titulo: 'Marcar como enviado',
      frase: FRASE_SEM_CODIGO,
      valorInicial: '',
      guarda: ['separating', 'shipped'],
      avancaPara: 'shipped',
      citaEmailSeEnviado: true,
    })
  })

  it('em separação JÁ com o código (a retentativa de MAA-15, Q9-b) ⇒ a folha abre com ele', () => {
    const folha = trackingSheet(linha({ status: 'separating', tracking_code: CODIGO }), 'acao')
    expect(folha.modo).toBe('enviar')
    expect(folha.valorInicial).toBe(CODIGO)
  })

  it('enviado sem código ⇒ "Salvar rastreio", frase 1, guarda shipped, não avança, cita e-mail', () => {
    const esperado = {
      modo: 'salvar',
      titulo: 'Salvar rastreio',
      frase: FRASE_SEM_CODIGO,
      valorInicial: '',
      guarda: ['shipped'],
      avancaPara: null,
      citaEmailSeEnviado: true,
    }
    expect(trackingSheet(linha({ status: 'shipped' }), 'acao')).toEqual(esperado)
    expect(trackingSheet(linha({ status: 'shipped' }), 'entrega')).toEqual(esperado)
  })

  it('enviado com código e o aviso de postagem SAIU ⇒ "Alterar rastreio", frase 2, preenchida, não cita e-mail', () => {
    expect(trackingSheet(linha({ status: 'shipped', tracking_code: CODIGO }), 'entrega', { avisoDePostagemSaiu: true })).toEqual({
      modo: 'alterar',
      titulo: 'Alterar rastreio',
      frase: FRASE_TROCA,
      valorInicial: CODIGO,
      guarda: ['shipped'],
      avancaPara: null,
      citaEmailSeEnviado: false,
    })
  })

  // BUG-20261024-folha-afirma-aviso-que-falhou: a frase 2 afirma que ela RECEBEU o aviso. Com o
  // `order_shipped` falho, pendente ou ausente, isso é falso — e o "Alterar" reenvia o falho. Sem
  // saber que saiu, a folha não promete nem nega: a frase neutra.
  it.each([
    ['o aviso falhou', { avisoDePostagemSaiu: false }],
    ['sem saber do aviso (a leitura não diz)', undefined],
  ] as const)('enviado com código e %s ⇒ "Alterar rastreio" com a frase NEUTRA, nunca a 2', (_n, contexto) => {
    const folha = trackingSheet(linha({ status: 'shipped', tracking_code: CODIGO }), 'entrega', contexto)
    expect(folha).toEqual({
      modo: 'alterar',
      titulo: 'Alterar rastreio',
      frase: FRASE_ENTREGUE,
      valorInicial: CODIGO,
      guarda: ['shipped'],
      avancaPara: null,
      citaEmailSeEnviado: false,
    })
    expect(folha.frase).not.toContain('já recebeu')
  })

  it('o aviso de postagem só muda a frase do "Alterar" com código em `shipped`: as outras folhas são as mesmas', () => {
    for (const row of [
      linha({ status: 'separating' }),
      linha({ status: 'shipped' }),
      linha({ status: 'delivered' }),
      linha({ status: 'delivered', tracking_code: CODIGO }),
    ]) {
      const origem = row.status === 'separating' ? 'acao' : 'entrega'
      expect(trackingSheet(row, origem, { avisoDePostagemSaiu: true })).toEqual(trackingSheet(row, origem))
      expect(trackingSheet(row, origem, { avisoDePostagemSaiu: false })).toEqual(trackingSheet(row, origem))
    }
  })

  it('entregue sem código ("Informar") ⇒ "Salvar rastreio", frase 3, guarda delivered, NÃO cita e-mail', () => {
    expect(trackingSheet(linha({ status: 'delivered' }), 'entrega')).toEqual({
      modo: 'salvar',
      titulo: 'Salvar rastreio',
      frase: FRASE_ENTREGUE,
      valorInicial: '',
      guarda: ['delivered'],
      avancaPara: null,
      citaEmailSeEnviado: false,
    })
  })

  it('entregue com código ⇒ "Alterar rastreio", frase 3, preenchida, não cita e-mail', () => {
    expect(trackingSheet(linha({ status: 'delivered', tracking_code: CODIGO }), 'entrega')).toEqual({
      modo: 'alterar',
      titulo: 'Alterar rastreio',
      frase: FRASE_ENTREGUE,
      valorInicial: CODIGO,
      guarda: ['delivered'],
      avancaPara: null,
      citaEmailSeEnviado: false,
    })
  })

  it.each(['pending', 'paid', 'separating', 'shipped', 'delivered', 'cancelled'])(
    'retirada ⇒ null em %s, pelas duas origens (MAA-16)',
    (status) => {
      for (const tracking_code of [null, CODIGO]) {
        const row = linha({ status, tracking_code, shipping_service_id: 'retirada' })
        expect(trackingSheet(row, 'acao')).toBeNull()
        expect(trackingSheet(row, 'entrega')).toBeNull()
      }
    },
  )

  it.each(['pending', 'paid', 'cancelled'])('%s ⇒ null, pelas duas origens', (status) => {
    expect(trackingSheet(linha({ status }), 'acao')).toBeNull()
    expect(trackingSheet(linha({ status }), 'entrega')).toBeNull()
  })

  it('a origem tem de oferecer a folha: a Entrega não oferece em separação, o rodapé não oferece com o código já salvo', () => {
    // MAA-26: uma folha aberta para uma ação que deixou de valer fecha — e "deixou de valer" é a
    // folha da origem virar `null`.
    expect(trackingSheet(linha({ status: 'separating' }), 'entrega')).toBeNull()
    expect(trackingSheet(linha({ status: 'shipped', tracking_code: CODIGO }), 'acao')).toBeNull()
    expect(trackingSheet(linha({ status: 'delivered' }), 'acao')).toBeNull()
  })
})

describe('trackingEdit — "Informar" / "Alterar" na Entrega (MAA-11, MAA-16)', () => {
  it('enviado e entregue, sem e com código', () => {
    expect(trackingEdit(linha({ status: 'shipped' }))).toEqual({ rotulo: 'Informar' })
    expect(trackingEdit(linha({ status: 'shipped', tracking_code: CODIGO }))).toEqual({ rotulo: 'Alterar' })
    expect(trackingEdit(linha({ status: 'delivered' }))).toEqual({ rotulo: 'Informar' })
    expect(trackingEdit(linha({ status: 'delivered', tracking_code: CODIGO }))).toEqual({ rotulo: 'Alterar' })
  })

  it.each(['pending', 'paid', 'separating', 'cancelled'])('%s ⇒ null', (status) => {
    expect(trackingEdit(linha({ status, tracking_code: CODIGO }))).toBeNull()
    expect(trackingEdit(linha({ status }))).toBeNull()
  })

  it('retirada ⇒ null mesmo enviada ou entregue', () => {
    expect(trackingEdit(linha({ status: 'shipped', shipping_service_id: 'retirada' }))).toBeNull()
    expect(trackingEdit(linha({ status: 'delivered', shipping_service_id: 'retirada', tracking_code: CODIGO }))).toBeNull()
  })
})

describe('canChargeMaterial — o lembrete aparece? (MAA-17, A17)', () => {
  const pedido = (extra: Record<string, unknown> = {}) => ({
    status: 'paid',
    material_status: 'aguardando_material',
    customer_phone: '(51) 99918-4227',
    ...extra,
  })

  it('aguardando, não cancelado, telefone que normaliza ⇒ aparece', () => {
    expect(canChargeMaterial(pedido())).toBe(true)
    expect(canChargeMaterial(pedido({ status: 'pending' }))).toBe(true)
  })

  it('sem número ⇒ não aparece', () => {
    expect(canChargeMaterial(pedido({ customer_phone: null }))).toBe(false)
    expect(canChargeMaterial(pedido({ customer_phone: '' }))).toBe(false)
  })

  it('número que não normaliza ⇒ não aparece', () => {
    expect(canChargeMaterial(pedido({ customer_phone: '1234' }))).toBe(false)
  })

  it('material já postado ⇒ não aparece (o ramo "Vi que você já postou" fica só no painel)', () => {
    expect(canChargeMaterial(pedido({ material_status: 'material_enviado' }))).toBe(false)
  })

  it('outros estados do material ⇒ não aparece', () => {
    for (const material_status of ['material_recebido', 'em_producao', 'nao_aplicavel', null]) {
      expect(canChargeMaterial(pedido({ material_status }))).toBe(false)
    }
  })

  it('cancelado ⇒ não aparece', () => {
    expect(canChargeMaterial(pedido({ status: 'cancelled' }))).toBe(false)
  })
})

// A11 — a confirmação depois de gravar, uma linha da tabela por caso, POR EXTENSO.
describe('actionConfirmation — a tabela de A11 (MAA-02, MAA-05, MAA-14, MAA-24, MAA-38)', () => {
  const base = { customer_name: 'Juliana Moraes', order_number: '0251' }
  const folhaDe = (row: AppActionInput, origem: 'acao' | 'entrega') => trackingSheet(row, origem).citaEmailSeEnviado

  it('Recebi, com o aviso enviado ⇒ cita o e-mail da confirmação', () => {
    expect(actionConfirmation({ ...base, action: 'registrar-recebimento', emailSent: true })).toEqual({
      titulo: 'Material registrado.',
      frase: 'O pedido #0251 foi para a bancada. Juliana recebe a confirmação por e-mail.',
    })
  })

  it('Recebi, com o aviso que falhou (A12, MAA-24) ⇒ sem e-mail', () => {
    expect(actionConfirmation({ ...base, action: 'registrar-recebimento', emailSent: false })).toEqual({
      titulo: 'Material registrado.',
      frase: 'O pedido #0251 foi para a bancada.',
    })
  })

  it('MAA-05 — o idempotente (o material já estava recebido) ⇒ sem e-mail, mesmo se o envio dissesse que saiu', () => {
    const esperado = { titulo: 'Material registrado.', frase: 'O pedido #0251 foi para a bancada.' }
    expect(actionConfirmation({ ...base, action: 'registrar-recebimento', emailSent: false, materialJaEstava: true })).toEqual(esperado)
    expect(actionConfirmation({ ...base, action: 'registrar-recebimento', emailSent: true, materialJaEstava: true })).toEqual(esperado)
  })

  it('Separar com o material e o aviso enviado ⇒ "em produção." e cita o e-mail', () => {
    expect(actionConfirmation({ ...base, action: 'separar', emailSent: true, materialMudou: true })).toEqual({
      titulo: 'Separação iniciada.',
      frase: 'Pedido #0251 em produção. Juliana recebe o aviso por e-mail.',
    })
  })

  it('Separar com o material e o aviso que falhou ⇒ "em produção." sem e-mail', () => {
    expect(actionConfirmation({ ...base, action: 'separar', emailSent: false, materialMudou: true })).toEqual({
      titulo: 'Separação iniciada.',
      frase: 'Pedido #0251 em produção.',
    })
  })

  it('Separar SEM material, com emailSent verdadeiro ⇒ "em separação." SEM e-mail (o status de separating não produz e-mail)', () => {
    expect(actionConfirmation({ ...base, action: 'separar', emailSent: true, materialMudou: false })).toEqual({
      titulo: 'Separação iniciada.',
      frase: 'Pedido #0251 em separação.',
    })
  })

  it('Rastreio a partir de separating, com o aviso enviado ⇒ cita o aviso de postagem', () => {
    const cita = folhaDe(linha({ status: 'separating' }), 'acao')
    expect(actionConfirmation({ ...base, action: 'marcar-enviado', emailSent: true, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'Juliana recebe o aviso de postagem por e-mail.',
    })
  })

  it('Rastreio a partir de separating, com o aviso que falhou ⇒ "O código ficou no pedido."', () => {
    const cita = folhaDe(linha({ status: 'separating' }), 'acao')
    expect(actionConfirmation({ ...base, action: 'marcar-enviado', emailSent: false, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'O código ficou no pedido.',
    })
  })

  it('Rastreio de shipped SEM código, com e sem o aviso', () => {
    const cita = folhaDe(linha({ status: 'shipped' }), 'acao')
    expect(actionConfirmation({ ...base, action: 'salvar-rastreio', emailSent: true, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'Juliana recebe o aviso de postagem por e-mail.',
    })
    expect(actionConfirmation({ ...base, action: 'salvar-rastreio', emailSent: false, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'O código ficou no pedido.',
    })
  })

  it('"Alterar" de shipped com emailSent verdadeiro ⇒ NÃO cita e-mail', () => {
    const cita = folhaDe(linha({ status: 'shipped', tracking_code: CODIGO }), 'entrega')
    expect(actionConfirmation({ ...base, action: 'salvar-rastreio', emailSent: true, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'O código ficou no pedido.',
    })
  })

  it('MAA-14 — delivered SEM código ("Informar"), com emailSent verdadeiro ⇒ NÃO cita e-mail', () => {
    const cita = folhaDe(linha({ status: 'delivered' }), 'entrega')
    expect(actionConfirmation({ ...base, action: 'salvar-rastreio', emailSent: true, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'O código ficou no pedido.',
    })
  })

  it('delivered COM código, com emailSent verdadeiro ⇒ NÃO cita e-mail', () => {
    const cita = folhaDe(linha({ status: 'delivered', tracking_code: CODIGO }), 'entrega')
    expect(actionConfirmation({ ...base, action: 'salvar-rastreio', emailSent: true, citaEmailSeEnviado: cita })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'O código ficou no pedido.',
    })
  })

  it('rastreio sem a folha dizer que pode citar ⇒ nunca cita (o padrão é não prometer)', () => {
    expect(actionConfirmation({ ...base, action: 'salvar-rastreio', emailSent: true })).toEqual({
      titulo: 'Rastreio salvo.',
      frase: 'O código ficou no pedido.',
    })
  })

  it('MAA-38 — retirada ⇒ "Retirada registrada." + "Pedido #0251 entregue.", com e sem o aviso', () => {
    const esperado = { titulo: 'Retirada registrada.', frase: 'Pedido #0251 entregue.' }
    expect(actionConfirmation({ ...base, action: 'marcar-retirado', emailSent: true })).toEqual(esperado)
    expect(actionConfirmation({ ...base, action: 'marcar-retirado', emailSent: false })).toEqual(esperado)
  })

  it('nome vazio, só espaço ou nulo ⇒ "A cliente recebe…"', () => {
    for (const customer_name of ['', '   ', null]) {
      expect(actionConfirmation({ ...base, customer_name, action: 'registrar-recebimento', emailSent: true }).frase).toBe(
        'O pedido #0251 foi para a bancada. A cliente recebe a confirmação por e-mail.',
      )
      expect(
        actionConfirmation({ ...base, customer_name, action: 'marcar-enviado', emailSent: true, citaEmailSeEnviado: true }).frase,
      ).toBe('A cliente recebe o aviso de postagem por e-mail.')
    }
  })

  it('só o primeiro nome, aparado', () => {
    expect(
      actionConfirmation({ ...base, customer_name: '  Luciana  Prado ', action: 'registrar-recebimento', emailSent: true }).frase,
    ).toBe('O pedido #0251 foi para a bancada. Luciana recebe a confirmação por e-mail.')
  })
})

describe('as frases fixas da ação (MAA-15, MAA-20, MAA-21, MAA-22, MAA-40)', () => {
  it('são as da spec, por extenso', () => {
    expect(ACTION_FAILED).toBe('Não consegui salvar. Tente de novo.')
    expect(ORDER_CHANGED).toBe('Este pedido mudou enquanto você olhava.')
    expect(PARTIAL_MATERIAL).toBe('A produção ficou registrada, mas o pedido não passou para separação.')
    expect(PARTIAL_TRACKING).toBe('O código ficou salvo, mas o pedido não foi marcado como enviado.')
    expect(SAVING).toBe('Salvando…')
  })
})

describe('régua — nenhuma frase da ação tem exclamação ou urgência (tom memorial)', () => {
  const base = { customer_name: 'Juliana', order_number: '0251' }
  const produzidas = [
    ACTION_FAILED,
    ORDER_CHANGED,
    PARTIAL_MATERIAL,
    PARTIAL_TRACKING,
    SAVING,
    FRASE_SEM_CODIGO,
    FRASE_TROCA,
    FRASE_ENTREGUE,
    ...(['registrar-recebimento', 'separar', 'marcar-enviado', 'salvar-rastreio', 'marcar-retirado'] as const).flatMap(
      (action) =>
        [true, false].flatMap((emailSent) => {
          const c = actionConfirmation({ ...base, action, emailSent, materialMudou: emailSent, citaEmailSeEnviado: true })
          return [c.titulo, c.frase]
        }),
    ),
  ]

  /** A régua, em função: o sensor chama a MESMA. */
  const recusa = (texto: string): string | null => {
    if (texto.includes('!')) return 'exclamação'
    const termo = URGENCY_TERMS.find((t) => texto.toLowerCase().includes(t))
    return termo ?? null
  }

  it('âncora: a régua mediu as 8 fixas e as 20 produzidas', () => {
    expect(produzidas).toHaveLength(28)
  })

  it('nenhuma é recusada', () => {
    expect(produzidas.filter((t) => recusa(t) !== null)).toEqual([])
  })

  it('sensor — exclamação e urgência são recusadas pela mesma régua', () => {
    expect(recusa('Rastreio salvo!')).not.toBeNull()
    expect(recusa('Corra, o pedido está pronto.')).not.toBeNull()
  })
})

describe('shippedNoticeSent — o aviso de postagem saiu? (BUG-20261024-folha-afirma-aviso-que-falhou)', () => {
  it('sim só com uma linha do `order_shipped` em `sent`', () => {
    expect(shippedNoticeSent([{ event: 'order_shipped', status: 'sent' }])).toBe(true)
    expect(
      shippedNoticeSent([
        { event: 'order_paid', status: 'sent' },
        { event: 'order_shipped', status: 'sent' },
      ]),
    ).toBe(true)
  })

  it.each(['failed', 'pending', 'sending', 'skipped'])('`order_shipped` em %s ⇒ não', (status) => {
    expect(shippedNoticeSent([{ event: 'order_shipped', status }])).toBe(false)
  })

  it('outro evento enviado, ou nenhuma linha ⇒ não', () => {
    expect(shippedNoticeSent([{ event: 'order_delivered', status: 'sent' }])).toBe(false)
    expect(shippedNoticeSent([{ event: 'order_paid', status: 'sent' }])).toBe(false)
    expect(shippedNoticeSent([])).toBe(false)
  })
})

// ---------------------------------------------------------------------------------------------
// Feature `82` — as confirmações e as frases fixas do bloco Material (`ENV-08`, `ENV-18`, `ENV-25`, A9)
// ---------------------------------------------------------------------------------------------

describe('feature 82 — confirmações e frases fixas', () => {
  it('as quatro frases fixas, palavra por palavra', async () => {
    const m = await import('../appAction.ts')
    expect(m.TRACKING_COPIED).toBe('Código copiado.')
    expect(m.COPY_FAILED).toBe('Não consegui copiar. Toque e segure o código para copiar.')
    expect(m.MATERIAL_TRACKING_SAVED).toBe('Código do envelope registrado.')
    expect(m.MATERIAL_IN_PRODUCTION).toBe('Pedido em produção.')
  })

  it('código do envelope que moveu o estado ⇒ "passou para "A caminho"" (ENV-08)', async () => {
    const { actionConfirmation } = await import('../appAction.ts')
    expect(
      actionConfirmation({
        action: 'rastreio-do-material',
        emailSent: true,
        materialPassou: true,
        customer_name: 'Ana Paula',
        order_number: '0244',
      }),
    ).toEqual({ titulo: 'Código do envelope registrado.', frase: 'O pedido #0244 passou para "A caminho".' })
  })

  it('código do envelope sem mudança de estado (ou sem a informação) ⇒ "Pedido #NNNN atualizado."', async () => {
    const { actionConfirmation } = await import('../appAction.ts')
    const base = { action: 'rastreio-do-material' as const, emailSent: true, customer_name: 'Ana', order_number: '0244' }
    expect(actionConfirmation({ ...base, materialPassou: false })).toEqual({
      titulo: 'Código do envelope registrado.',
      frase: 'Pedido #0244 atualizado.',
    })
    expect(actionConfirmation(base).frase).toBe('Pedido #0244 atualizado.')
  })

  it('"Colocar em produção" ⇒ "O material de {PrimeiroNome} está na bancada." (ENV-25)', async () => {
    const { actionConfirmation } = await import('../appAction.ts')
    expect(
      actionConfirmation({ action: 'producao', emailSent: true, customer_name: 'Mariana Souza', order_number: '0244' }),
    ).toEqual({ titulo: 'Pedido em produção.', frase: 'O material de Mariana está na bancada.' })
    expect(
      actionConfirmation({ action: 'producao', emailSent: false, customer_name: null, order_number: '0244' }).frase,
    ).toBe('O material da cliente está na bancada.')
  })

  // Fase 5 (T20, `BUG-20261026-a-cliente-no-meio-da-frase`, decisão de 2026-10-27): ANTES o caso acima
  // cravava "O material de A cliente está na bancada.". Toda frase da ação SEM nome, uma a uma: no
  // começo da frase "A cliente" (maiúscula) continua; no meio, "a cliente" / "da cliente".
  it.each([null, '', '   '])('sem nome (%j): cada frase da ação com a forma certa para a posição', async (nome) => {
    const { actionConfirmation } = await import('../appAction.ts')
    const c = (input: Partial<Parameters<typeof actionConfirmation>[0]>) =>
      actionConfirmation({ action: 'producao', emailSent: true, customer_name: nome, order_number: '0244', ...input } as Parameters<
        typeof actionConfirmation
      >[0]).frase
    expect(c({ action: 'registrar-recebimento' })).toBe('O pedido #0244 foi para a bancada. A cliente recebe a confirmação por e-mail.')
    expect(c({ action: 'separar', materialMudou: true })).toBe('Pedido #0244 em produção. A cliente recebe o aviso por e-mail.')
    expect(c({ action: 'marcar-enviado', citaEmailSeEnviado: true })).toBe('A cliente recebe o aviso de postagem por e-mail.')
    expect(c({ action: 'salvar-rastreio', citaEmailSeEnviado: true })).toBe('A cliente recebe o aviso de postagem por e-mail.')
    expect(c({ action: 'producao' })).toBe('O material da cliente está na bancada.')
  })

  it('`customerFirstNameMidSentence` e `customerFirstNameAfterDe`: o nome, ou a forma de meio de frase', async () => {
    const { customerFirstNameAfterDe, customerFirstNameMidSentence } = await import('../appAction.ts')
    expect(customerFirstNameMidSentence('  Mariana  Souza ')).toBe('Mariana')
    expect(customerFirstNameAfterDe('  Mariana  Souza ')).toBe('de Mariana')
    for (const nome of [null, undefined, '', '   ']) {
      expect(customerFirstNameMidSentence(nome)).toBe('a cliente')
      expect(customerFirstNameAfterDe(nome)).toBe('da cliente')
    }
  })

  it('`customerFirstName`: primeiro nome aparado, ou "A cliente"', async () => {
    const { customerFirstName } = await import('../appAction.ts')
    expect(customerFirstName('  Mariana  Souza ')).toBe('Mariana')
    expect(customerFirstName(null)).toBe('A cliente')
    expect(customerFirstName(undefined)).toBe('A cliente')
    expect(customerFirstName('   ')).toBe('A cliente')
  })
})
