import { describe, it, expect } from 'vitest'
import {
  CAMPAIGN_OFFERS_CAMPAIGN_INDEX,
  CAMPAIGN_OFFERS_DESCRIPTION_MAX,
  CAMPAIGN_OFFERS_NO_CAMPAIGN,
  CAMPAIGN_OFFERS_PATH,
  CAMPAIGN_OFFERS_PIECES_MAX,
  CAMPAIGN_OFFERS_TITLE_MAX,
  campaignOffersDescription,
  campaignOffersHiddenReason,
  campaignOffersHref,
  campaignOffersIntro,
  campaignOffersRefusal,
  campaignOffersScheduledPreviewNote,
  campaignOffersShows,
  campaignOffersTakenText,
  campaignOffersTitle,
  campaignPercentCardLabel,
  campaignPercentCards,
} from '../index'

/**
 * O bloco "Joias em oferta" — as regras, as frases e os endereços.
 *
 * Cada bloco tem a sua campanha, e aparece só enquanto ela é a vigente que o banco entrega. O título
 * e a descrição são da dona, com recuo para o nome da campanha e para a frase dos percentuais.
 */

describe('campaignOffersHref', () => {
  it('sem percentual, a vitrine inteira', () => {
    expect(campaignOffersHref()).toBe('/ofertas')
    expect(campaignOffersHref(null)).toBe('/ofertas')
    expect(CAMPAIGN_OFFERS_PATH).toBe('/ofertas')
  })

  it('com percentual, a vitrine recortada por `?percentual=`', () => {
    expect(campaignOffersHref(15)).toBe('/ofertas?percentual=15')
  })
})

describe('campaignPercentCards', () => {
  it('um cartão por percentual, em ordem crescente e sem repetir', () => {
    expect(campaignPercentCards([20, 10, 15, 10])).toEqual([
      { percent: 10, href: '/ofertas?percentual=10', label: 'Ver as peças com 10% de desconto' },
      { percent: 15, href: '/ofertas?percentual=15', label: 'Ver as peças com 15% de desconto' },
      { percent: 20, href: '/ofertas?percentual=20', label: 'Ver as peças com 20% de desconto' },
    ])
  })

  it('de um a cinco cartões', () => {
    expect(campaignPercentCards([30])).toHaveLength(1)
    expect(campaignPercentCards([5, 10, 15, 20, 25])).toHaveLength(5)
    expect(campaignPercentCards([])).toEqual([])
  })
})

describe('as frases do bloco', () => {
  it('o texto lista os percentuais da campanha', () => {
    expect(campaignOffersIntro([20, 10, 15])).toBe(
      'Peças selecionadas com 10%, 15% e 20% de desconto. O valor de cada joia já aparece com o desconto.',
    )
    expect(campaignOffersIntro([25])).toBe(
      'Peças selecionadas com 25% de desconto. O valor de cada joia já aparece com o desconto.',
    )
  })

  it('o nome acessível do cartão diz o percentual', () => {
    expect(campaignPercentCardLabel(20)).toBe('Ver as peças com 20% de desconto')
  })

  it('tom: nada de contagem regressiva nem de escassez', () => {
    const frases = [campaignOffersIntro([10, 20]), campaignPercentCardLabel(10)].join(' ')
    expect(frases).not.toMatch(/últimas|horas|corra|acaba|restam|só hoje|!/i)
  })
})

describe('campaignOffersShows — o bloco aparece só com a campanha dele em vigência', () => {
  it('a campanha da seção é a vigente: aparece', () => {
    expect(campaignOffersShows({ campaign_id: 'c-natal' }, 'c-natal')).toBe(true)
  })

  it('a vigente é outra campanha: não aparece', () => {
    expect(campaignOffersShows({ campaign_id: 'c-natal' }, 'c-maes')).toBe(false)
  })

  it('nenhuma campanha em vigência (agendada, encerrada ou desligada): não aparece', () => {
    expect(campaignOffersShows({ campaign_id: 'c-natal' }, null)).toBe(false)
    expect(campaignOffersShows({ campaign_id: 'c-natal' }, undefined)).toBe(false)
  })

  it('sem campanha — nunca teve, ou a campanha foi apagada e a coluna zerou: não aparece', () => {
    expect(campaignOffersShows({ campaign_id: null }, 'c-natal')).toBe(false)
    expect(campaignOffersShows({}, 'c-natal')).toBe(false)
    expect(campaignOffersShows({ campaign_id: null }, null)).toBe(false)
  })
})

describe('campaignOffersHiddenReason — por que o bloco não aparece', () => {
  it('em vigência: nenhum motivo', () => {
    expect(campaignOffersHiddenReason('c-natal', 'em-vigencia')).toBeNull()
  })

  it('sem campanha pede a escolha', () => {
    expect(campaignOffersHiddenReason(null, null)).toBe(
      'O bloco está sem campanha e não aparece na loja. Escolha uma campanha.',
    )
    expect(CAMPAIGN_OFFERS_NO_CAMPAIGN).toBe(
      'O bloco está sem campanha e não aparece na loja. Escolha uma campanha.',
    )
  })

  it('"nunca teve" e "perdeu" (a campanha apagada) dão a mesma frase', () => {
    const nuncaTeve = campaignOffersHiddenReason(undefined, undefined)
    // Apagada: a FK zera `campaign_id`; e um id que não está mais entre as campanhas não tem estado.
    const perdeuZerada = campaignOffersHiddenReason(null, 'em-vigencia')
    const perdeuSemEstado = campaignOffersHiddenReason('c-apagada', null)
    expect(perdeuZerada).toBe(nuncaTeve)
    expect(perdeuSemEstado).toBe(nuncaTeve)
  })

  it('agendada, encerrada e desligada: cada uma com o seu motivo', () => {
    expect(campaignOffersHiddenReason('c', 'agendada')).toBe(
      'A campanha escolhida ainda não começou. O bloco aparece na loja quando ela entrar em vigência.',
    )
    expect(campaignOffersHiddenReason('c', 'encerrada')).toBe(
      'A campanha escolhida já terminou, e o bloco não aparece na loja. Escolha outra campanha.',
    )
    expect(campaignOffersHiddenReason('c', 'desligada')).toBe(
      'A campanha escolhida está desligada, e o bloco não aparece na loja enquanto ela não for ligada.',
    )
  })
})

describe('título e descrição — os da dona, ou os recuos', () => {
  it('título vazio cai no nome da campanha', () => {
    expect(campaignOffersTitle({}, 'Ofertas de Natal')).toBe('Ofertas de Natal')
    expect(campaignOffersTitle({ title: '' }, 'Ofertas de Natal')).toBe('Ofertas de Natal')
    expect(campaignOffersTitle({ title: '   ' }, 'Ofertas de Natal')).toBe('Ofertas de Natal')
    expect(campaignOffersTitle(null, 'Ofertas de Natal')).toBe('Ofertas de Natal')
  })

  it('título preenchido aparece como está', () => {
    expect(campaignOffersTitle({ title: 'Presentes que guardam memória' }, 'Ofertas de Natal')).toBe(
      'Presentes que guardam memória',
    )
  })

  it('descrição vazia cai na frase dos percentuais', () => {
    expect(campaignOffersDescription({ subtitle: '' }, [15, 10])).toBe(
      'Peças selecionadas com 10% e 15% de desconto. O valor de cada joia já aparece com o desconto.',
    )
    expect(campaignOffersDescription(undefined, [20])).toBe(
      'Peças selecionadas com 20% de desconto. O valor de cada joia já aparece com o desconto.',
    )
  })

  it('descrição preenchida aparece como está', () => {
    expect(campaignOffersDescription({ subtitle: 'Joias para quem você ama.' }, [10])).toBe(
      'Joias para quem você ama.',
    )
  })
})

describe('campaignOffersRefusal — a recusa, em ordem', () => {
  const peca = (product_id: string | null) => ({ product_id })
  const titulo61 = 'a'.repeat(61)
  const descricao161 = 'b'.repeat(161)

  it('os tetos: 60, 160 e 12', () => {
    expect(CAMPAIGN_OFFERS_TITLE_MAX).toBe(60)
    expect(CAMPAIGN_OFFERS_DESCRIPTION_MAX).toBe(160)
    expect(CAMPAIGN_OFFERS_PIECES_MAX).toBe(12)
  })

  it('pronto para salvar: campanha escolhida, textos no teto, sem peça ou com peças distintas', () => {
    expect(campaignOffersRefusal('c', { title: 'a'.repeat(60), subtitle: 'b'.repeat(160) }, [])).toBeNull()
    expect(campaignOffersRefusal('c', {}, [peca('p1'), peca('p2')])).toBeNull()
    expect(campaignOffersRefusal('c', null, null)).toBeNull()
  })

  it('sem campanha vem primeiro, antes de qualquer outra cobrança', () => {
    expect(campaignOffersRefusal(null, { title: titulo61 }, [peca(null)])).toBe(
      'O bloco está sem campanha e não aparece na loja. Escolha uma campanha.',
    )
    expect(campaignOffersRefusal('  ', {}, [])).toBe(CAMPAIGN_OFFERS_NO_CAMPAIGN)
  })

  it('título acima de 60, contado sem aparar', () => {
    expect(campaignOffersRefusal('c', { title: titulo61, subtitle: descricao161 }, [])).toBe(
      'Cabem 60 caracteres no título, e há 61. Encurte o título.',
    )
    // 59 letras e dois espaços: aparado caberia, mas o banco e a loja contam os espaços.
    expect(campaignOffersRefusal('c', { title: ` ${'a'.repeat(59)} ` }, [])).toBe(
      'Cabem 60 caracteres no título, e há 61. Encurte o título.',
    )
  })

  it('descrição acima de 160', () => {
    expect(campaignOffersRefusal('c', { subtitle: descricao161 }, Array(13).fill(peca('p')))).toBe(
      'Cabem 160 caracteres na descrição, e há 161. Encurte a descrição.',
    )
  })

  it('acima de 12 peças, com o número', () => {
    const treze = Array.from({ length: 13 }, (_, i) => peca(`p${i}`))
    expect(campaignOffersRefusal('c', {}, treze)).toBe(
      'Cabem 12 peças neste bloco, e há 13. Remova as que sobram.',
    )
  })

  it('o teto vem antes do item órfão e da peça repetida', () => {
    // 13 linhas, a 1ª órfã e a 3ª repetindo a 2ª: a cobrança é o teto, com o número.
    const treze = [peca(null), peca('p1'), peca('p1'), ...Array.from({ length: 10 }, (_, i) => peca(`q${i}`))]
    expect(treze).toHaveLength(13)
    expect(campaignOffersRefusal('c', {}, treze)).toBe(
      'Cabem 12 peças neste bloco, e há 13. Remova as que sobram.',
    )
  })

  it('item órfão, com o ordinal', () => {
    expect(campaignOffersRefusal('c', {}, [peca('p1'), peca(null), peca('p1')])).toBe(
      '2º item: escolha a peça, ou remova esta linha. Ela perdeu o produto do catálogo.',
    )
  })

  it('peça repetida, com o ordinal', () => {
    expect(campaignOffersRefusal('c', {}, [peca('p1'), peca('p2'), peca('p1')])).toBe(
      '3º item: esta peça já está no bloco. Cada uma aparece uma vez.',
    )
  })
})

describe('a campanha que já tem bloco, o aviso de prévia e o nome do índice', () => {
  it('a frase da campanha já usada nomeia a posição e o título do outro bloco', () => {
    expect(campaignOffersTakenText(3, 'Ofertas de Natal')).toBe(
      'Esta campanha já está no 3º bloco da Home, “Ofertas de Natal”. Cada campanha tem um bloco só.',
    )
  })

  it('o aviso de prévia da campanha agendada diz quando o bloco passa a aparecer', () => {
    // 13/11/2026 03:00 UTC = 13/11 00:00 em Brasília.
    expect(campaignOffersScheduledPreviewNote('2026-11-13T03:00:00Z')).toBe(
      'A campanha começa em 13/11 às 00:00. A prévia e a loja mostram o bloco a partir daí.',
    )
  })

  it('o índice por campanha tem nome estável', () => {
    expect(CAMPAIGN_OFFERS_CAMPAIGN_INDEX).toBe('home_sections_campaign_offers_campaign_idx')
  })

  it('tom: as frases novas sem urgência, contagem regressiva, escassez nem exclamação', () => {
    const frases = [
      CAMPAIGN_OFFERS_NO_CAMPAIGN,
      campaignOffersHiddenReason('c', 'agendada'),
      campaignOffersHiddenReason('c', 'encerrada'),
      campaignOffersHiddenReason('c', 'desligada'),
      campaignOffersRefusal('c', { title: 'a'.repeat(61) }, []),
      campaignOffersRefusal('c', { subtitle: 'a'.repeat(161) }, []),
      campaignOffersRefusal('c', {}, Array.from({ length: 13 }, (_, i) => ({ product_id: `p${i}` }))),
      campaignOffersTakenText(2, 'Ofertas'),
      campaignOffersScheduledPreviewNote('2026-11-13T03:00:00Z'),
    ].join(' ')
    expect(frases).not.toMatch(/últimas|horas|corra|acaba|restam|só hoje|aproveite|!/i)
  })
})
