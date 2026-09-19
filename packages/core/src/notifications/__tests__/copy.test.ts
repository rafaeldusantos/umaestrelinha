import { describe, expect, it } from 'vitest'

import { COPY_LIMITS, URGENCY_TERMS, limitsRefusal, notificationCopyRefusal, notificationDraftRefusal } from '../copy.ts'
import { MATERIAL_EVENTS, NOTIFICATION_EVENTS } from '../events.ts'

/**
 * PNL-04 — a régua de tom (spec, AC 4 do painel e AC 4 dos eventos; PDC-01) e PNL-09 — os
 * limites (edge case: `extra` > 5 linhas ou `lead` > 600 são recusados ao salvar).
 */

const comum = { event: 'order_paid', channel: 'email' } as const
const material = { event: 'material_received', channel: 'email' } as const
const posEntrega = { event: 'post_delivery_care', channel: 'email' } as const

describe('notificationCopyRefusal — urgência fabricada', () => {
  it.each(URGENCY_TERMS)('recusa "%s" e nomeia o termo', (termo) => {
    const recusa = notificationCopyRefusal(`Seu pedido chegou. ${termo} para ver.`, comum)
    expect(recusa).not.toBeNull()
    expect(recusa?.toLowerCase()).toContain(termo)
  })

  it('não distingue caixa nem se importa com o resto da frase', () => {
    expect(notificationCopyRefusal('CORRA que ainda dá tempo', comum)).not.toBeNull()
    expect(notificationCopyRefusal('É Imperdível.', comum)).not.toBeNull()
  })

  it('palavra inteira: "socorra" e "corramos" não são "corra"', () => {
    expect(notificationCopyRefusal('Se precisar, a gente socorra você.', comum)).toBeNull()
    expect(notificationCopyRefusal('corramos juntos', comum)).toBeNull()
  })
})

describe('notificationCopyRefusal — emoji', () => {
  it.each(['🎉', '✨', '💖', '🙏'])('recusa %s', (emoji) => {
    expect(notificationCopyRefusal(`Pagamento aprovado ${emoji}`, comum)).not.toBeNull()
  })

  it('travessão, aspas e acento não são emoji', () => {
    expect(notificationCopyRefusal('Agora é com a gente — seu pedido está reservado. "Ótimo".', comum)).toBeNull()
  })
})

describe('notificationCopyRefusal — exclamação', () => {
  it('`!!` é recusado em qualquer evento', () => {
    expect(notificationCopyRefusal('Recebemos!!', comum)).not.toBeNull()
    expect(notificationCopyRefusal('Chegou!!', material)).not.toBeNull()
  })

  it('um `!` é aceito em evento comum — "Pagamento aprovado!" é o texto legado', () => {
    expect(notificationCopyRefusal('Pagamento aprovado!', comum)).toBeNull()
    expect(notificationCopyRefusal('Recebemos seu pedido!', { event: 'order_received', channel: 'email' })).toBeNull()
  })

  it.each(MATERIAL_EVENTS)('um `!` é recusado em %s (AC 4 dos eventos)', (event) => {
    const recusa = notificationCopyRefusal('Seu material chegou!', { event, channel: 'email' })
    expect(recusa).not.toBeNull()
    expect(recusa).toMatch(/exclamação/)
  })

  it('a `{{saudacao}}` NÃO é acusada num evento de material — quem decide o ponto é a regra da saudação', () => {
    expect(
      notificationCopyRefusal('{{saudacao}}Seu material chegou em segurança ao ateliê.', material),
    ).toBeNull()
  })

  it('o aviso à dona sobre material não é evento de material — `!` passa', () => {
    expect(
      notificationCopyRefusal('Material a caminho!', { event: 'owner_material_incoming', channel: 'email' }),
    ).toBeNull()
  })
})

describe('notificationCopyRefusal — post_delivery_care não vende (PDC-01)', () => {
  it.each(['cupom', 'desconto', 'oferta', '%'])('recusa "%s" só neste evento', (termo) => {
    expect(notificationCopyRefusal(`Um ${termo} para a próxima.`, posEntrega)).not.toBeNull()
    expect(notificationCopyRefusal(`Um ${termo} para a próxima.`, comum)).toBeNull()
  })

  it('texto de cuidado passa', () => {
    expect(
      notificationCopyRefusal('Evite perfume e álcool sobre a resina, e guarde longe do sol.', posEntrega),
    ).toBeNull()
  })
})

describe('notificationCopyRefusal — texto limpo', () => {
  it('→ null em todo evento', () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(
        notificationCopyRefusal('{{saudacao}}Seu pedido {{numero_pedido}} está a caminho.', { event, channel: 'email' }),
      ).toBeNull()
    }
  })

  it('canal WhatsApp passa pela mesma régua (a feature 43 não ganha uma segunda)', () => {
    expect(notificationCopyRefusal('Corra!', { event: 'order_paid', channel: 'whatsapp' })).not.toBeNull()
    expect(notificationCopyRefusal('Seu pedido saiu.', { event: 'order_paid', channel: 'whatsapp' })).toBeNull()
  })
})

describe('SENSOR — o rascunho de cobrança de material do painel (`chargeMaterialText`)', () => {
  // Copiado de `apps/backoffice/src/features/order-list/model/chargeMaterial.ts`, com nome e número
  // preenchidos. O painel não pode ser importado daqui (core não importa de apps), então é fixture.
  const rascunho =
    'Oi, Luciana! Aqui é a Adri, da Uma Estrelinha. ' +
    'Estou com o seu pedido #NP-12 guardado, esperando o material chegar para começar. ' +
    'Se precisar de ajuda para preparar ou postar, me conta que eu te explico com calma. ' +
    'Sem pressa nenhuma.'

  it('o texto real passa (evento comum, canal WhatsApp — é o canal em que ele sai)', () => {
    expect(notificationCopyRefusal(rascunho, { event: 'order_paid', channel: 'whatsapp' })).toBeNull()
  })

  it('o MESMO texto com "corra" reprova — a régua discrimina', () => {
    const mutado = rascunho.replace('Sem pressa nenhuma.', 'Corra, sem pressa nenhuma.')
    expect(mutado).not.toBe(rascunho)
    expect(notificationCopyRefusal(mutado, { event: 'order_paid', channel: 'whatsapp' })).not.toBeNull()
  })
})

describe('COPY_LIMITS e limitsRefusal (PNL-09)', () => {
  const ok = {
    subject: 'Pedido {{numero_pedido}} recebido',
    heading: 'Recebemos seu pedido!',
    lead: '{{saudacao}}Seu PIX foi gerado.',
    extra: ['Status: aguardando pagamento do PIX'],
    cta_label: 'Acompanhar em Minha conta',
  }

  it('os limites são os do design', () => {
    expect(COPY_LIMITS).toEqual({ subject: 120, heading: 80, lead: 600, extraLines: 5, extraLine: 160, ctaLabel: 40 })
  })

  it('campos dentro do limite → null', () => {
    expect(limitsRefusal(ok)).toBeNull()
  })

  it('exatamente no limite passa; um a mais reprova, nomeando o campo e o limite', () => {
    expect(limitsRefusal({ ...ok, lead: 'a'.repeat(600) })).toBeNull()
    const recusa = limitsRefusal({ ...ok, lead: 'a'.repeat(601) })
    expect(recusa).toContain('601')
    expect(recusa).toContain('600')
    expect(recusa).toMatch(/texto principal/i)
  })

  it('assunto, título e rótulo do botão têm limite próprio', () => {
    expect(limitsRefusal({ ...ok, subject: 'a'.repeat(121) })).toMatch(/assunto/i)
    expect(limitsRefusal({ ...ok, heading: 'a'.repeat(81) })).toMatch(/título/i)
    expect(limitsRefusal({ ...ok, cta_label: 'a'.repeat(41) })).toMatch(/botão/i)
  })

  it('`extra` com mais de 5 linhas é recusado (edge case da spec)', () => {
    expect(limitsRefusal({ ...ok, extra: ['1', '2', '3', '4', '5'] })).toBeNull()
    expect(limitsRefusal({ ...ok, extra: ['1', '2', '3', '4', '5', '6'] })).toMatch(/6 linhas/)
  })

  it('uma linha de `extra` acima de 160 é recusada, dizendo qual', () => {
    expect(limitsRefusal({ ...ok, extra: ['curta', 'b'.repeat(161)] })).toMatch(/observação 2/i)
  })

  it('campos ausentes contam como vazios — o que falta não estoura', () => {
    expect(limitsRefusal({})).toBeNull()
  })
})

/**
 * `notificationDraftRefusal` — movida de `supabase/functions/send-notification/handlers.ts`
 * (`draftRefusal`) para cá na feature `53` (`ABN-04`/`ABN-05`/`ABN-11`). Casos migrados de
 * `handlers.test.ts:591-620` sem reescrever a régua; só o import e a assinatura mudaram (o `channel`
 * deixou de ser hard-coded `'email'` dentro do corpo e passou a ser parâmetro).
 */
describe('notificationDraftRefusal — a régua na ordem em que se explica (movida da function)', () => {
  const campos = (over: Record<string, unknown> = {}) => ({
    subject: 'Assunto',
    heading: 'Título',
    lead: 'Texto normal.',
    extra: ['Linha'],
    cta_label: 'Abrir',
    ...over,
  })

  it('texto limpo passa', () => {
    expect(notificationDraftRefusal('order_paid', 'email', campos())).toBeNull()
  })

  it('variável desconhecida vence a régua de tom — é o erro mais fácil de corrigir', () => {
    const r = notificationDraftRefusal('order_paid', 'email', campos({ lead: 'Corra {{inexistente}}' }))
    expect(r).toContain('{{inexistente}}')
  })

  it('recusa alcança TODOS os campos, não só o lead', () => {
    for (const campo of ['subject', 'heading', 'lead', 'cta_label']) {
      expect(
        notificationDraftRefusal('order_paid', 'email', campos({ [campo]: 'Últimas unidades' })),
        campo,
      ).not.toBeNull()
    }
    expect(notificationDraftRefusal('order_paid', 'email', campos({ extra: ['Ok', 'corra!'] }))).not.toBeNull()
  })

  it('exclamação só é recusada nos eventos de MATERIAL', () => {
    expect(notificationDraftRefusal('order_paid', 'email', campos({ lead: 'Pagamento aprovado!' }))).toBeNull()
    expect(notificationDraftRefusal('material_received', 'email', campos({ lead: 'Chegou!' }))).not.toBeNull()
  })

  it('o terceiro estágio (tamanho) também reprova, quando variável e tom passam', () => {
    expect(notificationDraftRefusal('order_paid', 'email', campos({ lead: 'a'.repeat(601) }))).not.toBeNull()
  })

  it('o `channel` é parâmetro, não literal — WhatsApp passa pela MESMA composição', () => {
    expect(notificationDraftRefusal('order_paid', 'whatsapp', campos({ lead: 'Corra!' }))).not.toBeNull()
    expect(notificationDraftRefusal('order_paid', 'whatsapp', campos())).toBeNull()
  })
})
