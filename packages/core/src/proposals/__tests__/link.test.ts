import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { GUEST_ACCESS_DAYS } from '../../checkout/guestAccess.ts'
import { PROPOSAL_LINK_DAYS } from '../limits.ts'
import { formatProposalNumber } from '../number.ts'
import { firstName, PROPOSAL_PATH, proposalExpiryDate, proposalLink, proposalWhatsappText } from '../link.ts'

describe('proposalLink — o token vai no fragmento (A-15, SEG-02)', () => {
  it('origem + caminho + #token, sem query', () => {
    expect(proposalLink('https://umaestrelinha.com.br', 'abc_DEF-123')).toBe(
      'https://umaestrelinha.com.br/pedido-montado#abc_DEF-123',
    )
    expect(PROPOSAL_PATH).toBe('/pedido-montado')
  })

  it('barra final da origem não dobra', () => {
    expect(proposalLink('http://localhost:8082/', 't')).toBe('http://localhost:8082/pedido-montado#t')
  })

  it('o token nunca vai no caminho nem na query', () => {
    const url = new URL(proposalLink('https://loja.exemplo', 'segredo'))
    expect(url.pathname).toBe('/pedido-montado')
    expect(url.search).toBe('')
    expect(url.hash).toBe('#segredo')
  })
})

describe('proposalWhatsappText — LNK-02, palavra por palavra', () => {
  const link = 'https://loja.exemplo/pedido-montado#t'

  it('a mensagem literal da spec', () => {
    expect(
      proposalWhatsappText({ name: 'Mariana Souza Lima', link, expiresAt: '2026-11-07T15:00:00Z' }),
    ).toBe(
      'Oi, Mariana! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a entrega e o pagamento:\n\nhttps://loja.exemplo/pedido-montado#t\n\nO link vale até 07/11.',
    )
  })

  // BUG-20261031-ponto-final-depois-do-link-no-whatsapp (decisão do usuário, 2026-10-31, opção b):
  // o link vai SOZINHO numa linha, sem pontuação colada antes nem depois — nem o ponto final, nem
  // os dois-pontos da frase. Quem seleciona a linha, ou o leitor de link do WhatsApp, leva só o link.
  it('o link ocupa uma linha inteira, sem pontuação colada', () => {
    const real = 'https://loja.exemplo/pedido-montado#ASii_DHmA-0123'
    const t = proposalWhatsappText({ name: 'Ana', link: real, expiresAt: '2026-11-07T15:00:00Z' })
    const linhas = t.split('\n')
    expect(linhas.filter((l) => l.includes('pedido-montado'))).toEqual([real])
    expect(t).not.toContain(`${real}.`)
    expect(t).not.toMatch(/: https?:/)
  })

  it('o dia é o de Brasília, não o UTC (02:30 UTC de 08/11 ainda é 07/11 em Porto Alegre)', () => {
    expect(proposalWhatsappText({ firstName: 'Ana', link, expiresAt: '2026-11-08T02:30:00Z' })).toMatch(
      /O link vale até 07\/11\.$/,
    )
    expect(proposalExpiryDate('2026-11-08T02:30:00Z', true)).toBe('07/11/2026')
  })

  it('sem nome: "Oi!", nunca "Oi, !"', () => {
    const t = proposalWhatsappText({ name: '   ', link, expiresAt: '2026-11-07T15:00:00Z' })
    expect(t.startsWith('Oi! Montei seu pedido')).toBe(true)
    expect(t).not.toContain('Oi, !')
  })

  it('sem emoji, sem exclamação de urgência além da saudação', () => {
    const t = proposalWhatsappText({ name: 'Ana', link, expiresAt: '2026-11-07T15:00:00Z' })
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(t.match(/!/g)).toHaveLength(1)
    expect(t).not.toMatch(/últim|corra|hoje|urgente|aproveite/i)
  })

  it('primeiro nome aparado', () => {
    expect(firstName('  Ana  Paula ')).toBe('Ana')
    expect(firstName(null)).toBe('')
  })
})

describe('formatProposalNumber (A-13)', () => {
  it('número ⇒ P-0001, sem cortar dígito', () => {
    expect(formatProposalNumber(1)).toBe('P-0001')
    expect(formatProposalNumber(244)).toBe('P-0244')
    expect(formatProposalNumber(12345)).toBe('P-12345')
    expect(formatProposalNumber('7')).toBe('P-0007')
  })

  it('valor já escrito passa aparado; vazio e inválido ⇒ vazio', () => {
    expect(formatProposalNumber(' P-0007 ')).toBe('P-0007')
    expect(formatProposalNumber('')).toBe('')
    expect(formatProposalNumber(null)).toBe('')
    expect(formatProposalNumber(0)).toBe('')
    expect(formatProposalNumber(1.5)).toBe('')
  })
})

describe('o prazo é escrito no fuso da LOJA, com o processo em outro fuso', () => {
  // O formatador é montado no carregamento do módulo: trocar o TZ exige reimportar depois da troca.
  const antes = process.env.TZ
  let mod: typeof import('../link.ts')
  beforeAll(async () => {
    process.env.TZ = 'UTC'
    vi.resetModules()
    mod = await import('../link.ts')
  })
  afterAll(() => {
    process.env.TZ = antes
  })

  it('sensor: o processo está mesmo em UTC (a data local do instante é 08/11)', () => {
    expect(new Date('2026-11-08T02:30:00Z').getDate()).toBe(8)
  })

  it('02:30 UTC de 08/11 é 07/11 em Brasília', () => {
    expect(mod.proposalExpiryDate('2026-11-08T02:30:00Z')).toBe('07/11')
  })
})

// Fecho da rodada 1 do Verifier da 89: `PROPOSAL_PATH` tinha dois donos (aqui e `core/routes`) e o
// prazo do link repetia o 7 de `GUEST_ACCESS_DAYS`. Os dois testes cravavam o mesmo valor, então a
// divergência era pega por acidente; agora é recusada pela fonte.
describe('dono único do caminho e do prazo', () => {
  const ler = (rel: string) =>
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', rel), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

  const declaraCaminho = (fonte: string) => /const\s+PROPOSAL_PATH\s*=/.test(fonte)

  it('link.ts reexporta o PROPOSAL_PATH de core/routes, sem declarar outro', () => {
    const fonte = ler('link.ts')
    expect(fonte).toContain("import { PROPOSAL_PATH } from '../routes/routes.ts'")
    expect(declaraCaminho(fonte)).toBe(false)
    // âncora: a régua acha a declaração do dono
    expect(declaraCaminho(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../routes/routes.ts'), 'utf8'))).toBe(true)
  })

  it('limits.ts deriva o prazo de GUEST_ACCESS_DAYS, sem número próprio', () => {
    const fonte = ler('limits.ts')
    expect(fonte).toMatch(/export const PROPOSAL_LINK_DAYS = GUEST_ACCESS_DAYS\b/)
    expect(PROPOSAL_LINK_DAYS).toBe(GUEST_ACCESS_DAYS)
    expect(PROPOSAL_LINK_DAYS).toBe(7)
  })

  it('sensor — a segunda declaração no link.ts seria acusada; em comentário, não', () => {
    expect(declaraCaminho(`${ler('link.ts')}\nexport const PROPOSAL_PATH = '/pedido-montado'\n`)).toBe(true)
    expect(declaraCaminho(ler('link.ts') + `\n// const PROPOSAL_PATH = 'x'`.replace(/\/\/[^\n\r]*/g, ''))).toBe(false)
  })
})
