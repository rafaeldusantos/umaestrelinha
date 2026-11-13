import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../../color/contrast.ts'
import {
  CAMPAIGN_DEFAULT_COLORS,
  CAMPAIGN_COLOR_PRESETS,
  campaignBadgeRefusal,
  campaignColorsApproval,
  campaignColorsRefusal,
  campaignDeleteRefusal,
  campaignNameRefusal,
  campaignOverlapRefusal,
  campaignPercentAddRefusal,
  campaignPercentRemovalRefusal,
  campaignPercentsRefusal,
  campaignWindowRefusal,
} from '../index.ts'

describe('nome — obrigatório, até 40', () => {
  it('vazio, só espaços ou acima de 40 é recusado; 40 passa', () => {
    expect(campaignNameRefusal('')).toBe('Dê um nome à campanha.')
    expect(campaignNameRefusal('   ')).toBe('Dê um nome à campanha.')
    expect(campaignNameRefusal('x'.repeat(41))).toBe('O nome cabe até 40 caracteres.')
    expect(campaignNameRefusal('x'.repeat(40))).toBeNull()
    expect(campaignNameRefusal('Black Friday')).toBeNull()
  })
})

describe('texto do selo — até 14', () => {
  it('acima de 14 é recusado com a frase da tela; 14 passa', () => {
    expect(campaignBadgeRefusal('BLACK FRIDAY 26')).toBe(
      'O selo cabe até 14 caracteres no cartão do celular. Use uma forma curta do nome.',
    )
    expect(campaignBadgeRefusal('x'.repeat(14))).toBeNull()
    expect(campaignBadgeRefusal('BLACK FRIDAY')).toBeNull()
  })
})

describe('vigência — fim antes do início, por data E hora', () => {
  it('fim antes do início, no mesmo dia, é recusado', () => {
    expect(campaignWindowRefusal('2026-11-13T15:00:00.000Z', '2026-11-13T14:00:00.000Z')).toBe('O fim vem antes do início.')
  })

  it('fim igual ao início (intervalo vazio) é recusado', () => {
    expect(campaignWindowRefusal('2026-11-13T15:00:00.000Z', '2026-11-13T15:00:00.000Z')).toBe('O fim vem antes do início.')
  })

  it('fim depois do início passa, e data incompleta é recusada', () => {
    expect(campaignWindowRefusal('2026-11-13T03:00:00.000Z', '2026-12-01T03:00:00.000Z')).toBeNull()
    expect(campaignWindowRefusal(null, '2026-12-01T03:00:00.000Z')).toBe('Preencha a data e a hora do início e do fim.')
  })
})

describe('percentuais — 1 a 70, sem repetir, até 5, ao menos um', () => {
  it('0 e 80 são recusados; 1 e 70 passam', () => {
    expect(campaignPercentAddRefusal(0, [])).toBe('Use um número de 1 a 70.')
    expect(campaignPercentAddRefusal(80, [])).toBe('Use um número de 1 a 70.')
    expect(campaignPercentAddRefusal(12.5, [])).toBe('Use um número de 1 a 70.')
    expect(campaignPercentAddRefusal(1, [])).toBeNull()
    expect(campaignPercentAddRefusal(70, [])).toBeNull()
  })

  it('repetido é recusado com o percentual', () => {
    expect(campaignPercentAddRefusal(15, [10, 15])).toBe('15% já está na campanha.')
  })

  it('o sexto é recusado', () => {
    expect(campaignPercentAddRefusal(30, [5, 10, 15, 20, 25])).toBe('Até 5 percentuais por campanha.')
  })

  it('a lista inteira: nenhum, fora da faixa, repetido e mais de 5', () => {
    expect(campaignPercentsRefusal([])).toBe('Acrescente ao menos um percentual.')
    expect(campaignPercentsRefusal([10, 0])).toBe('Use um número de 1 a 70.')
    expect(campaignPercentsRefusal([10, 80])).toBe('Use um número de 1 a 70.')
    expect(campaignPercentsRefusal([10, 15, 10])).toBe('10% já está na campanha.')
    expect(campaignPercentsRefusal([5, 10, 15, 20, 25, 30])).toBe('Até 5 percentuais por campanha.')
    expect(campaignPercentsRefusal([10, 15, 20])).toBeNull()
  })

  it('tirar percentual em uso é recusado com a contagem; sem uso, passa', () => {
    expect(campaignPercentRemovalRefusal(15, 12)).toBe(
      '12 peças usam 15%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o 15%.',
    )
    expect(campaignPercentRemovalRefusal(15, 1)).toBe(
      '1 peça usa 15%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o 15%.',
    )
    expect(campaignPercentRemovalRefusal(15, 0)).toBeNull()
  })
})

describe('cores do selo — formato e contraste ≥ 4,5:1', () => {
  it('o par padrão é preto e ouro, e passa com 7,4:1', () => {
    expect(CAMPAIGN_DEFAULT_COLORS).toEqual({ band: '#161514', accent: '#C2A063' })
    expect(campaignColorsRefusal('#161514', '#C2A063')).toBeNull()
    expect(campaignColorsApproval('#161514', '#C2A063')).toBe('7,4:1 Contraste bom para ler o selo.')
  })

  it('abaixo de 4,5:1 é recusado com a razão medida ("3,2:1")', () => {
    expect(contrastRatio('#161514', '#676767')).toBeCloseTo(3.22, 2)
    expect(campaignColorsRefusal('#161514', '#676767')).toBe(
      '3,2:1 Pouca diferença entre as cores: o selo fica difícil de ler. Escolha cores com mais diferença (o mínimo é 4,5:1).',
    )
    expect(campaignColorsApproval('#161514', '#676767')).toBeNull()
  })

  it('a razão que arredondaria para 4,5 é CORTADA quando recusada', () => {
    expect(contrastRatio('#161514', '#7E7E7E')).toBeLessThan(4.5)
    expect(campaignColorsRefusal('#161514', '#7E7E7E')).toMatch(/^4,4:1 /)
  })

  it('hex inválido é recusado antes do contraste', () => {
    expect(campaignColorsRefusal('#16151', '#C2A063')).toBe('Use o formato #RRGGBB nas duas cores.')
    expect(campaignColorsRefusal('#161514', 'ouro')).toBe('Use o formato #RRGGBB nas duas cores.')
    expect(campaignColorsRefusal('#FFF', '#000000')).toBe('Use o formato #RRGGBB nas duas cores.')
  })

  it('as três combinações prontas passam', () => {
    for (const p of CAMPAIGN_COLOR_PRESETS) expect(campaignColorsRefusal(p.band, p.accent)).toBeNull()
  })
})

describe('uma campanha ligada por vez', () => {
  const natal = {
    id: 'natal',
    name: 'Natal',
    starts_at: '2026-12-01T03:00:00.000Z',
    ends_at: '2026-12-25T03:00:00.000Z',
    active: true,
  }

  it('cruzar a vigência de outra ligada é recusado, nomeando a outra e o último dia que ela vale', () => {
    expect(
      campaignOverlapRefusal({ starts_at: '2026-11-20T03:00:00.000Z', ends_at: '2026-12-02T03:00:00.000Z', active: true }, [natal]),
    ).toBe(
      'A vigência cruza a da campanha “Natal” (01/12 a 24/12). Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra.',
    )
  })

  it('terminar no instante em que a outra começa não cruza ([) )', () => {
    expect(
      campaignOverlapRefusal({ starts_at: '2026-11-13T03:00:00.000Z', ends_at: '2026-12-01T03:00:00.000Z', active: true }, [natal]),
    ).toBeNull()
  })

  it('a candidata desligada, ou a outra desligada, convivem', () => {
    const cruzando = { starts_at: '2026-12-10T03:00:00.000Z', ends_at: '2026-12-20T03:00:00.000Z' }
    expect(campaignOverlapRefusal({ ...cruzando, active: false }, [natal])).toBeNull()
    expect(campaignOverlapRefusal({ ...cruzando, active: true }, [{ ...natal, active: false }])).toBeNull()
  })

  it('a própria campanha (edição) não cruza consigo', () => {
    expect(campaignOverlapRefusal({ ...natal, id: 'natal' }, [natal])).toBeNull()
  })
})

describe('apagar — só sem pedido', () => {
  it('com pedido é recusado; sem, passa', () => {
    expect(campaignDeleteRefusal(3)).toBe(
      'Esta campanha já foi usada em pedido e não pode ser apagada. Para tirá-la da loja, encerre ou desligue.',
    )
    expect(campaignDeleteRefusal(0)).toBeNull()
  })
})
