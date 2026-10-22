/**
 * Feature 71 · task 02 — `VIS-23`: a lista de robôs tem UM dono, e ela é lida pela loja e pela
 * function `visit`.
 *
 * A régua é **substring sem diferenciar maiúsculas** contra uma lista escrita por extenso — nunca
 * `/bot/i`. O sensor inverso que prova isso é o `CUBOT_X30`: um aparelho Android de verdade, cujo
 * user agent contém "bot". Um classificador ingênuo tiraria da contagem uma cliente real.
 */
import { describe, expect, it } from 'vitest'

import { BOT_SIGNATURES, isBotUserAgent } from '../bots.ts'

/** Um user agent real (ou na forma documentada pelo dono) para cada assinatura da spec. */
const FIXTURAS: Record<string, string> = {
  Googlebot:
    'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.71 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Storebot-Google':
    'Mozilla/5.0 (X11; Linux x86_64; Storebot-Google/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.71 Safari/537.36',
  'Google-InspectionTool':
    'Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)',
  'AdsBot-Google': 'AdsBot-Google (+http://www.google.com/adsbot.html)',
  'Mediapartners-Google': 'Mediapartners-Google',
  'Chrome-Lighthouse':
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
  HeadlessChrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.6099.28 Safari/537.36',
  'Google Page Speed':
    'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3694.0 Mobile Safari/537.36 Google Page Speed Insights',
  bingbot:
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  Applebot:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 (Applebot/0.1; +http://www.apple.com/go/applebot)',
  facebookexternalhit:
    'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  'meta-externalagent':
    'meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)',
  GPTBot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)',
  ClaudeBot:
    'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)',
  PetalBot:
    'Mozilla/5.0 (Linux; Android 7.0;) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)',
  AhrefsBot:
    'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
  SemrushBot:
    'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
  YandexBot:
    'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)',
  DuckDuckBot: 'DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)',
  Baiduspider:
    'Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)',
}

/** Gente de verdade — nenhum destes pode sair da contagem. */
const INVERSOS: Record<string, string> = {
  'Safari de iPhone':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'Chrome de Android':
    'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
  'navegador interno do Instagram':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 345.0.0.34.94 (iPhone14,5; iOS 17_5; pt_BR; pt; scale=3.00; 1170x2532; 637497432)',
  'navegador interno do WhatsApp':
    'Mozilla/5.0 (Linux; Android 13; moto g54 5G Build/T1TD33.36; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36 WhatsApp/2.24.20.80',
  CUBOT_X30:
    'Mozilla/5.0 (Linux; Android 10; CUBOT_X30) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
}

/** A escrita ingênua — o sensor de que a régua precisa ser a lista, e não "contém bot". */
const ingenuo = (ua: string): boolean => /bot/i.test(ua)

describe('BOT_SIGNATURES — âncora', () => {
  it('são exatamente as 20 assinaturas da spec, por extenso', () => {
    expect(BOT_SIGNATURES.length).toBe(20)
    expect([...BOT_SIGNATURES].sort()).toEqual(Object.keys(FIXTURAS).sort())
  })

  it('toda assinatura tem uma fixtura, e a fixtura a contém', () => {
    for (const assinatura of BOT_SIGNATURES) {
      const ua = FIXTURAS[assinatura]
      expect(ua, assinatura).toBeTypeOf('string')
      expect(ua.toLowerCase()).toContain(assinatura.toLowerCase())
    }
  })
})

describe('isBotUserAgent', () => {
  it.each(Object.entries(FIXTURAS))('%s é robô', (_nome, ua) => {
    expect(isBotUserAgent(ua)).toBe(true)
  })

  it('não diferencia maiúsculas', () => {
    expect(isBotUserAgent('mozilla/5.0 (compatible; GOOGLEBOT/2.1)')).toBe(true)
    expect(isBotUserAgent('headlesschrome/120')).toBe(true)
  })

  it.each(Object.entries(INVERSOS))('%s NÃO é robô', (_nome, ua) => {
    expect(isBotUserAgent(ua)).toBe(false)
  })

  it('sem user agent não é robô', () => {
    expect(isBotUserAgent(null)).toBe(false)
    expect(isBotUserAgent(undefined)).toBe(false)
    expect(isBotUserAgent('')).toBe(false)
  })

  it('sensor — um classificador `/bot/i` REPROVA na mesma tabela (pega o Cubot)', () => {
    expect(ingenuo(INVERSOS.CUBOT_X30)).toBe(true)
    const errosDoIngenuo = Object.values(INVERSOS).filter(ingenuo)
    expect(errosDoIngenuo).toEqual([INVERSOS.CUBOT_X30])
  })
})
