import { describe, expect, it } from 'vitest'

import {
  MATERIAL_CANCELLED_NOTE,
  canStartProduction,
  materialCancelledNote,
  materialTrackingEdit,
  materialTrackingEmpty,
  materialTrackingOrigin,
  materialTrackingRefusal,
  materialTrackingSheet,
  materialWaitAge,
  materialWaitLabel,
  orderMaterialKinds,
  queueAgeLabel,
  type MaterialTrackingRow,
} from '../index.ts'

// Feature `82` — as frases e valores são os LITERAIS da spec (`ENV-02`, `05`, `09`, `16`, `20`, `23`,
// `24`, `26`), escritos por extenso aqui; nada é derivado da implementação.

const AGORA = '2026-10-26T15:00:00.000Z'
const HA = (ms: number) => new Date(Date.parse(AGORA) - ms).toISOString()
const DIA = 24 * 60 * 60 * 1000
const HORA = 60 * 60 * 1000

const linha = (p: Partial<MaterialTrackingRow> = {}): MaterialTrackingRow => ({
  status: 'pending',
  material_status: 'aguardando_material',
  material_tracking_code: null,
  material_received_at: null,
  created_at: HA(3 * DIA),
  customer_name: 'Mariana Souza Lima',
  material_tracking_set_at: null,
  material_tracking_set_by: null,
  ...p,
})

describe('MATERIAL_CANCELLED_NOTE (ENV-26)', () => {
  it('é a frase da spec, palavra por palavra', () => {
    expect(MATERIAL_CANCELLED_NOTE).toBe(
      'Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.',
    )
  })
})

describe('materialTrackingEdit (ENV-02, 03, 04)', () => {
  it.each(['aguardando_material', 'material_enviado'])('`%s` sem código ⇒ editável, sem o link "Alterar"', (ms) => {
    expect(materialTrackingEdit(linha({ material_status: ms }))).toEqual({ rotulo: null })
  })

  it.each(['aguardando_material', 'material_enviado'])('`%s` com código ⇒ "Alterar"', (ms) => {
    expect(materialTrackingEdit(linha({ material_status: ms, material_tracking_code: 'AN123456789BR' }))).toEqual({
      rotulo: 'Alterar',
    })
  })

  it.each(['material_recebido', 'em_producao', 'nao_aplicavel', null])('`%s` ⇒ não editável (null)', (ms) => {
    expect(materialTrackingEdit(linha({ material_status: ms, material_tracking_code: 'AN123456789BR' }))).toBeNull()
  })

  it('cancelado ⇒ não editável, mesmo aguardando', () => {
    expect(materialTrackingEdit(linha({ status: 'cancelled' }))).toBeNull()
    expect(materialTrackingEdit(linha({ status: 'cancelled', material_status: 'material_enviado' }))).toBeNull()
  })

  it('código só de espaços conta como sem código', () => {
    expect(materialTrackingEdit(linha({ material_tracking_code: '   ' }))).toEqual({ rotulo: null })
  })

  it.each(['paid', 'separating', 'shipped'])('outros status de pedido (`%s`) não bloqueiam', (status) => {
    expect(materialTrackingEdit(linha({ status }))).toEqual({ rotulo: null })
  })
})

describe('materialTrackingSheet (ENV-05)', () => {
  it('sem código, aguardando: título, frase com "A caminho" e o e-mail, rótulo, placeholder, valor vazio', () => {
    expect(materialTrackingSheet(linha())).toEqual({
      titulo: 'Código do envelope',
      frase:
        'Use quando Mariana mandar o código pelo WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail.',
      valorInicial: '',
      rotulo: 'Código de rastreio do envio da cliente',
      placeholder: 'Ex.: AN123456789BR',
    })
  })

  it('com código, já enviado: "Alterar código do envelope", frase curta, valor = código atual', () => {
    expect(
      materialTrackingSheet(linha({ material_status: 'material_enviado', material_tracking_code: 'AN123456789BR' })),
    ).toEqual({
      titulo: 'Alterar código do envelope',
      frase: 'Use quando Mariana mandar o código pelo WhatsApp.',
      valorInicial: 'AN123456789BR',
      rotulo: 'Código de rastreio do envio da cliente',
      placeholder: 'Ex.: AN123456789BR',
    })
  })

  it('com código e ainda aguardando: título de alterar, frase longa', () => {
    const f = materialTrackingSheet(linha({ material_tracking_code: 'AN123456789BR' }))!
    expect(f.titulo).toBe('Alterar código do envelope')
    expect(f.frase).toBe(
      'Use quando Mariana mandar o código pelo WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail.',
    )
  })

  // Fase 5 (T20, `BUG-20261026-a-cliente-no-meio-da-frase`, decisão de 2026-10-27): ANTES este caso
  // cravava "Use quando A cliente mandar…" — maiúscula no meio da frase. Agora a forma de meio de frase.
  it.each([null, '', '   '])('sem nome (%j) ⇒ "a cliente", em minúscula no meio da frase', (nome) => {
    expect(materialTrackingSheet(linha({ customer_name: nome, material_status: 'material_enviado' }))!.frase).toBe(
      'Use quando a cliente mandar o código pelo WhatsApp.',
    )
    expect(materialTrackingSheet(linha({ customer_name: nome, material_status: 'aguardando_material' }))!.frase).toBe(
      'Use quando a cliente mandar o código pelo WhatsApp. O pedido passa para "A caminho" e ela recebe a confirmação por e-mail.',
    )
  })

  it('não editável ⇒ null (a folha aberta fecha, ENV-13)', () => {
    expect(materialTrackingSheet(linha({ material_status: 'material_recebido' }))).toBeNull()
    expect(materialTrackingSheet(linha({ status: 'cancelled' }))).toBeNull()
  })
})

describe('materialTrackingOrigin (ENV-16)', () => {
  const comCodigo = { material_tracking_code: 'AN123456789BR' }

  it('`set_by = customer` ⇒ "Informado pela cliente há N …"', () => {
    expect(
      materialTrackingOrigin(linha({ ...comCodigo, material_tracking_set_at: HA(2 * DIA), material_tracking_set_by: 'customer' }), AGORA),
    ).toBe('Informado pela cliente há 2 dias')
  })

  it('`set_by = admin` ⇒ "Registrado por você há N …"', () => {
    expect(
      materialTrackingOrigin(linha({ ...comCodigo, material_tracking_set_at: HA(5 * HORA), material_tracking_set_by: 'admin' }), AGORA),
    ).toBe('Registrado por você há 5 h')
  })

  it('sem autoria (linha anterior à migration) ⇒ "Código informado" + a idade do PEDIDO, nunca inventa quem', () => {
    expect(materialTrackingOrigin(linha({ ...comCodigo, created_at: HA(9 * DIA) }), AGORA)).toBe('Código informado há 9 dias')
  })

  it('com `material_received_at` ⇒ acrescenta " · chegou há …"', () => {
    expect(
      materialTrackingOrigin(
        linha({
          ...comCodigo,
          material_status: 'material_recebido',
          material_tracking_set_at: HA(6 * DIA),
          material_tracking_set_by: 'customer',
          material_received_at: HA(1 * DIA),
        }),
        AGORA,
      ),
    ).toBe('Informado pela cliente há 6 dias · chegou há 1 dia')
    expect(
      materialTrackingOrigin(linha({ ...comCodigo, created_at: HA(10 * DIA), material_received_at: HA(2 * DIA) }), AGORA),
    ).toBe('Código informado há 10 dias · chegou há 2 dias')
  })

  it('a idade é contra `agora` (o `lido_em`), nunca contra o relógio do aparelho', () => {
    const r = linha({ ...comCodigo, material_tracking_set_at: '2020-01-01T00:00:00.000Z', material_tracking_set_by: 'admin' })
    expect(materialTrackingOrigin(r, '2020-01-04T00:00:00.000Z')).toBe('Registrado por você há 3 dias')
  })

  it('sem código ⇒ null', () => {
    expect(materialTrackingOrigin(linha({ material_tracking_set_at: HA(DIA), material_tracking_set_by: 'admin' }), AGORA)).toBeNull()
    expect(materialTrackingOrigin(linha({ material_tracking_code: '  ' }), AGORA)).toBeNull()
  })
})

describe('materialTrackingEmpty (ENV-20)', () => {
  it('esperando ⇒ a frase do opcional, com o primeiro nome', () => {
    expect(materialTrackingEmpty(linha(), AGORA)).toBe(
      'Mariana ainda não informou o rastreio. É opcional: se ela mandar pelo WhatsApp, registre aqui. Também dá para marcar o recebimento direto.',
    )
    expect(materialTrackingEmpty(linha({ customer_name: null }), AGORA)).toBe(
      'A cliente ainda não informou o rastreio. É opcional: se ela mandar pelo WhatsApp, registre aqui. Também dá para marcar o recebimento direto.',
    )
  })

  it('recebido ⇒ "Chegou sem código registrado. Recebido há …."', () => {
    expect(
      materialTrackingEmpty(linha({ material_status: 'material_recebido', material_received_at: HA(4 * DIA) }), AGORA),
    ).toBe('Chegou sem código registrado. Recebido há 4 dias.')
  })

  it('cancelado ⇒ "Nenhum código registrado."', () => {
    expect(materialTrackingEmpty(linha({ status: 'cancelled' }), AGORA)).toBe('Nenhum código registrado.')
  })

  it('precedência: recebido vence cancelado', () => {
    expect(
      materialTrackingEmpty(
        linha({ status: 'cancelled', material_status: 'material_recebido', material_received_at: HA(DIA) }),
        AGORA,
      ),
    ).toBe('Chegou sem código registrado. Recebido há 1 dia.')
  })

  it('SPEC_DEVIATION declarado: em produção sem data de recebimento ⇒ só a primeira frase', () => {
    expect(materialTrackingEmpty(linha({ material_status: 'em_producao' }), AGORA)).toBe('Chegou sem código registrado.')
  })

  it('com código ⇒ null; sem material ⇒ null', () => {
    expect(materialTrackingEmpty(linha({ material_tracking_code: 'AN123456789BR' }), AGORA)).toBeNull()
    expect(materialTrackingEmpty(linha({ material_status: 'nao_aplicavel' }), AGORA)).toBeNull()
  })
})

describe('materialTrackingRefusal (ENV-09)', () => {
  it('as duas recusas da RPC em português; o resto é a falha genérica', () => {
    expect(materialTrackingRefusal('empty_code')).toBe('Digite o código do envelope.')
    expect(materialTrackingRefusal('material_not_applicable')).toBe('Este pedido não espera material.')
    expect(materialTrackingRefusal(null)).toBe('Não consegui salvar. Tente de novo.')
    expect(materialTrackingRefusal('qualquer')).toBe('Não consegui salvar. Tente de novo.')
  })
})

// Fase 5 (T21, `BUG-20261026-idade-da-espera-sem-contexto`, decisão de 2026-10-27): a idade ao lado
// dos chips diz DO QUÊ — "Esperando há N dias". `queueAgeLabel` (o painel e a Início) fica intacto.
describe('materialWaitLabel (T21)', () => {
  it.each([
    [{ days: 0, tier: 'fresh' as const }, 'Esperando há 0 dias'],
    [{ days: 1, tier: 'fresh' as const }, 'Esperando há 1 dia'],
    [{ days: 3, tier: 'fresh' as const }, 'Esperando há 3 dias'],
    [{ days: 5, tier: 'warm' as const }, 'Esperando há 5 dias'],
    [{ days: 13, tier: 'stale' as const }, 'Esperando há 13 dias'],
  ])('%j ⇒ %s', (idade, frase) => {
    expect(materialWaitLabel(idade)).toBe(frase)
  })

  it('a frase é a mesma nos três degraus — quem distingue o `stale` é a cor (A3)', () => {
    expect(materialWaitLabel({ days: 9, tier: 'stale' })).toBe(materialWaitLabel({ days: 9, tier: 'fresh' }))
  })

  it('`queueAgeLabel` fica intacto: "há N dias", sem "Esperando"', () => {
    expect(queueAgeLabel({ days: 10, tier: 'stale' })).toBe('há 10 dias')
    expect(queueAgeLabel({ days: 1, tier: 'fresh' })).toBe('há 1 dia')
  })
})

describe('materialWaitAge (ENV-24, A3, A4)', () => {
  it('aguardando e enviado ⇒ a idade desde a compra, com o degrau', () => {
    expect(materialWaitAge(linha({ created_at: HA(2 * DIA) }), AGORA)).toEqual({ days: 2, tier: 'fresh' })
    expect(materialWaitAge(linha({ material_status: 'material_enviado', created_at: HA(5 * DIA) }), AGORA)).toEqual({
      days: 5,
      tier: 'warm',
    })
    expect(materialWaitAge(linha({ created_at: HA(8 * DIA) }), AGORA)).toEqual({ days: 8, tier: 'stale' })
  })

  it('a idade é contra `agora`, não o relógio do aparelho', () => {
    expect(materialWaitAge(linha({ created_at: '2020-01-01T12:00:00.000Z' }), '2020-01-11T12:00:00.000Z')).toEqual({
      days: 10,
      tier: 'stale',
    })
  })

  it.each(['material_recebido', 'em_producao', 'nao_aplicavel'])('`%s` ⇒ null', (ms) => {
    expect(materialWaitAge(linha({ material_status: ms, material_received_at: HA(DIA) }), AGORA)).toBeNull()
  })

  it('cancelado ⇒ null', () => {
    expect(materialWaitAge(linha({ status: 'cancelled' }), AGORA)).toBeNull()
  })
})

describe('orderMaterialKinds (ENV-23)', () => {
  it('a união dos materiais dos itens que exigem, na ordem de MATERIAL_KINDS', () => {
    expect(
      orderMaterialKinds([
        { requires_material: true, material_kinds: ['leite_materno', 'cabelo'] },
        { requires_material: true, material_kinds: ['cinzas', 'cabelo'] },
      ]),
    ).toEqual(['leite_materno', 'cabelo', 'cinzas'])
  })

  it('item que não exige não contribui, mesmo com kinds no snapshot', () => {
    expect(
      orderMaterialKinds([
        { requires_material: false, material_kinds: ['cinzas'] },
        { requires_material: null, material_kinds: ['pelo_pet'] },
        { requires_material: true, material_kinds: ['dente_leite'] },
      ]),
    ).toEqual(['dente_leite'])
  })

  it('exige sem kinds declarados ⇒ nenhum chip; valor desconhecido é filtrado', () => {
    expect(orderMaterialKinds([{ requires_material: true, material_kinds: [] }])).toEqual([])
    expect(orderMaterialKinds([{ requires_material: true, material_kinds: ['sangue', 'flores'] }])).toEqual(['flores'])
  })

  it('itens ausentes (falha de leitura) ⇒ nenhum chip', () => {
    expect(orderMaterialKinds(null)).toEqual([])
    expect(orderMaterialKinds(undefined)).toEqual([])
    expect(orderMaterialKinds([])).toEqual([])
  })
})

describe('canStartProduction (ENV-25, A10)', () => {
  it.each([
    ['material_recebido, pago', 'paid', 'material_recebido', true],
    ['material_recebido, em separação', 'separating', 'material_recebido', true],
    ['material_recebido, cancelado', 'cancelled', 'material_recebido', false],
    ['aguardando_material', 'paid', 'aguardando_material', false],
    ['material_enviado', 'paid', 'material_enviado', false],
    ['em_producao (já está)', 'paid', 'em_producao', false],
    ['nao_aplicavel', 'paid', 'nao_aplicavel', false],
    ['nulo', 'paid', null, false],
  ] as const)('%s ⇒ %s', (_n, status, material_status, esperado) => {
    expect(canStartProduction({ status, material_status })).toBe(esperado)
  })
})

describe('materialCancelledNote (ENV-26)', () => {
  it.each(['aguardando_material', 'material_enviado', 'material_recebido', 'em_producao'] as const)(
    'cancelado com material %s ⇒ a frase da spec',
    (material_status) => {
      expect(materialCancelledNote({ status: 'cancelled', material_status })).toBe(
        'Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.',
      )
    },
  )

  it.each([
    ['cancelado sem material', 'cancelled', 'nao_aplicavel'],
    ['cancelado com material nulo', 'cancelled', null],
    ['pago com material', 'paid', 'aguardando_material'],
    ['entregue com material', 'delivered', 'em_producao'],
  ] as const)('%s ⇒ null', (_n, status, material_status) => {
    expect(materialCancelledNote({ status, material_status })).toBeNull()
  })
})
