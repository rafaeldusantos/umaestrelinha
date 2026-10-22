import { describe, expect, it } from 'vitest'

import { visitRefusal, type VisitContext } from '../refusal'

/**
 * `VIS-22` (feature `71`) — quando a loja NÃO chama o servidor de visitas.
 *
 * Uma recusa por condição, cada uma com o par liberado ao lado: a régua que recusa tudo passaria em
 * todos os casos de recusa e reprovaria só no par. O contexto não tem campo de interruptor do GA4
 * nem de ID de medição — por construção (`contadorSemGa.test.ts` guarda a fonte).
 */

/** Tudo liberado: build de produção, fora da prévia, no host de produção, sem recusa nenhuma. */
const LIBERADO: VisitContext = {
  production: true,
  preview: false,
  settingsLoaded: true,
  productionHost: 'umaestrelinha.com.br',
  hostname: 'umaestrelinha.com.br',
  statistics: true,
  optedOut: false,
  webdriver: false,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
}

const com = (patch: Partial<VisitContext>): VisitContext => ({ ...LIBERADO, ...patch })

describe('VIS-22 — a decisão de contar', () => {
  it('tudo liberado ⇒ conta (null)', () => {
    expect(visitRefusal(LIBERADO)).toBeNull()
  })

  it.each<[string, Partial<VisitContext>]>([
    ['build que não é de produção', { production: false }],
    ['janela de prévia do painel', { preview: true }],
    ['host que não é o de produção', { hostname: 'umaestrelinha-store-five.vercel.app' }],
    ['a cliente recusou as estatísticas', { statistics: false }],
    ['a marca de não contar', { optedOut: true }],
    ['navigator.webdriver', { webdriver: true }],
    ['user agent de robô', { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }],
    ['user agent de robô headless', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/126.0 Safari/537.36' }],
  ])('%s ⇒ não conta', (_nome, patch) => {
    expect(visitRefusal(com(patch))).not.toBeNull()
  })

  it('cada recusa tem o seu motivo — uma régua que devolvesse sempre o mesmo texto não distingue', () => {
    const motivos = [
      visitRefusal(com({ production: false })),
      visitRefusal(com({ preview: true })),
      visitRefusal(com({ settingsLoaded: false })),
      visitRefusal(com({ hostname: 'localhost' })),
      visitRefusal(com({ statistics: false })),
      visitRefusal(com({ optedOut: true })),
      visitRefusal(com({ webdriver: true })),
    ]
    expect(new Set(motivos).size).toBe(motivos.length)
  })

  it("configuração ainda não lida ⇒ 'esperando' (o contador tenta de novo quando ela chega)", () => {
    expect(visitRefusal(com({ settingsLoaded: false }))).toBe('esperando')
  })

  it("configuração ainda não lida vence o host: com o padrão vazio seria 'interno', e não é", () => {
    expect(visitRefusal(com({ settingsLoaded: false, productionHost: '' }))).toBe('esperando')
  })

  it("host de produção configurado e a loja em localhost ⇒ recusa (o par obrigatório da spec)", () => {
    expect(visitRefusal(com({ hostname: 'localhost' }))).not.toBeNull()
  })

  it('host de produção VAZIO ⇒ tudo é interno, recusa até no host que seria o de produção', () => {
    expect(visitRefusal(com({ productionHost: '' }))).not.toBeNull()
  })

  it('o host é comparado por trafficType: www., porta e maiúsculas não separam produção de produção', () => {
    expect(visitRefusal(com({ hostname: 'www.UmaEstrelinha.com.br' }))).toBeNull()
    expect(visitRefusal(com({ productionHost: 'localhost', hostname: 'localhost' }))).toBeNull()
  })

  it('aparelho Cubot NÃO é robô — a régua não é /bot/i', () => {
    expect(
      visitRefusal(
        com({
          userAgent:
            'Mozilla/5.0 (Linux; Android 12; CUBOT_X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
        }),
      ),
    ).toBeNull()
  })

  it('navegador interno do Instagram NÃO é robô', () => {
    expect(
      visitRefusal(
        com({
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0',
        }),
      ),
    ).toBeNull()
  })
})
