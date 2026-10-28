/**
 * Feature 84 — a régua de aceitação de uma sugestão de SEO (A2, A3, A7, A13, `SIA-14`, `SIA-15`).
 *
 * Conserto r2: A3 subiu o piso para 140, A12 TIROU a recusa de material (decisão do usuário,
 * 2026-10-27 — os casos que a provavam viraram o inverso: nomear o material PASSA) e A13 entrou
 * (título igual ao nome do produto reprova).
 *
 * Os números vêm da spec e são conferidos contra as constantes, nunca só cravados: o teto do título
 * (43) é o campo (60) menos o sufixo que `brandedTitle` acrescenta — se a marca mudar de tamanho, a
 * asserção derivada continua certa e a cravada reprova, e é isso que se quer ver.
 */
import { describe, expect, it } from 'vitest'
import { STORE_BRAND, brandedTitle } from '../brand.ts'
import { DESCRIPTION_MAX } from '../text.ts'
import {
  SEO_TITLE_FIELD_MAX,
  SUGGESTION_DESCRIPTION_ASK_MIN,
  SUGGESTION_DESCRIPTION_MIN,
  SUGGESTION_TITLE_MAX,
  URGENCY_TERMS,
  memorialToneRefusal,
  stripBrand,
  suggestionRefusal,
} from '../suggestion.ts'

const TITULO_OK = 'Pingente de resina com estrela dourada'
const DESCRICAO_OK =
  'Pingente em resina feito à mão, com a delicadeza de uma lembrança que acompanha você todos os dias. Peça personalizada. Envio para todo o Brasil.'
const NOME = 'Pingente Estrela Guia'

/** O vocabulário de urgência ESCRITO POR EXTENSO (conserto r2, N16/N17): um each sobre a própria
 * constante encolhe junto com ela, e tirar um termo da lista deixava a suíte verde. */
const URGENCIA_ESPERADA = [
  'últimas unidades',
  'última unidade',
  'corra',
  'só hoje',
  'somente hoje',
  'promoção imperdível',
  'imperdível',
  'não perca',
  'aproveite',
  'por tempo limitado',
  'estoque limitado',
  'compre já',
  'garanta já',
]

const sugestao = (over: Partial<{ title: string; description: string }> = {}) => ({
  title: TITULO_OK,
  description: DESCRICAO_OK,
  ...over,
})

describe('limites (A2, A3)', () => {
  it('o campo do título é 60', () => {
    expect(SEO_TITLE_FIELD_MAX).toBe(60)
  })

  it('SUGGESTION_TITLE_MAX é 43 — e é DERIVADO do campo menos o sufixo da marca', () => {
    expect(SUGGESTION_TITLE_MAX).toBe(43)
    expect(SUGGESTION_TITLE_MAX).toBe(SEO_TITLE_FIELD_MAX - ` | ${STORE_BRAND}`.length)
    // A propriedade que o número protege: um título no teto, servido com a marca, cabe nos 60.
    expect(brandedTitle('a'.repeat(SUGGESTION_TITLE_MAX))).toHaveLength(SEO_TITLE_FIELD_MAX)
  })

  it('a descrição sugerida vai de 140 até o teto da descrição derivada (160); o prompt pede de 150 (A3)', () => {
    expect(SUGGESTION_DESCRIPTION_MIN).toBe(140)
    expect(SUGGESTION_DESCRIPTION_ASK_MIN).toBe(150)
    expect(DESCRIPTION_MAX).toBe(160)
    expect(DESCRICAO_OK.length).toBeGreaterThanOrEqual(140)
    expect(DESCRICAO_OK.length).toBeLessThanOrEqual(160)
  })
})

describe('stripBrand — a loja põe a marca, a sugestão não a traz', () => {
  it('tira "| Uma Estrelinha" do fim', () => {
    expect(stripBrand('Colar de resina | Uma Estrelinha')).toBe('Colar de resina')
  })

  it('tira "| UE" do fim', () => {
    expect(stripBrand('Colar de resina | UE')).toBe('Colar de resina')
  })

  it('aceita caixa e espaço variados no sufixo', () => {
    expect(stripBrand('Colar de resina|uma  estrelinha  ')).toBe('Colar de resina')
  })

  it('não toca na marca no meio do título', () => {
    expect(stripBrand('Sobre a Uma Estrelinha e o ateliê')).toBe('Sobre a Uma Estrelinha e o ateliê')
    expect(stripBrand('Colar | UE dourado')).toBe('Colar | UE dourado')
    expect(stripBrand('Colar | Uma Estrelinha dourado')).toBe('Colar | Uma Estrelinha dourado')
  })

  it('colapsa espaço e apara', () => {
    expect(stripBrand('  Colar   de  resina  ')).toBe('Colar de resina')
  })
})

describe('memorialToneRefusal — a régua do registro memorial (A7)', () => {
  it('texto sereno passa', () => {
    expect(memorialToneRefusal(DESCRICAO_OK)).toBeNull()
  })

  it('emoji reprova', () => {
    expect(memorialToneRefusal('Colar de resina ✨')).toEqual(expect.any(String))
    expect(memorialToneRefusal('Colar de resina 💛')).toEqual(expect.any(String))
    // Emoji em apresentação de TEXTO (sem o seletor de variação) também é emoji.
    expect(memorialToneRefusal('Colar de resina ❤')).toEqual(expect.any(String))
    expect(memorialToneRefusal('Colar de resina ☀')).toEqual(expect.any(String))
  })

  it('ponto de exclamação reprova', () => {
    expect(memorialToneRefusal('Uma lembrança para sempre!')).toEqual(expect.any(String))
  })

  it('a lista de urgência é exatamente a escrita por extenso', () => {
    expect([...URGENCY_TERMS]).toEqual(URGENCIA_ESPERADA)
  })

  it.each(URGENCIA_ESPERADA.map(t => [t]))('o termo de urgência "%s" reprova sozinho', termo => {
    expect(memorialToneRefusal(`Colar de resina, ${termo}, feito à mão`)).toEqual(expect.any(String))
  })

  it('urgência sem acento e em caixa alta também reprova', () => {
    expect(memorialToneRefusal('ULTIMAS UNIDADES do colar')).toEqual(expect.any(String))
    expect(memorialToneRefusal('so hoje')).toEqual(expect.any(String))
  })

  it('inverso: palavra que só CONTÉM um termo não reprova (fronteira de palavra)', () => {
    expect(memorialToneRefusal('Corrente de prata com pingente de resina')).toBeNull()
  })

  // Conserto r1 do Verifier (V05): "Corrente" não contém "corra" como substring, então o caso acima
  // era verdadeiro com ou sem a fronteira. Aqui o termo ESTÁ dentro da palavra — só a fronteira o salva.
  it.each([
    ['Uma joia que socorra a saudade de todo dia', 'corra'],
    ['Joias para que aproveitem cada lembrança guardada', 'aproveite'],
  ])('inverso: "%s" contém "%s" dentro de outra palavra e não reprova', (texto, termo) => {
    expect(texto.normalize('NFD').toLowerCase()).toContain(termo)
    expect(memorialToneRefusal(texto)).toBeNull()
  })

  it('a lista de urgência não é vazia (âncora: um each sobre o vazio passaria)', () => {
    expect(URGENCY_TERMS.length).toBeGreaterThanOrEqual(4)
    for (const t of ['últimas unidades', 'corra', 'só hoje', 'promoção imperdível']) {
      expect(URGENCY_TERMS).toContain(t)
    }
  })
})

describe('suggestionRefusal — a ordem e cada motivo', () => {
  it('sugestão válida devolve null', () => {
    expect(suggestionRefusal(sugestao(), [], NOME)).toBeNull()
  })

  it('título vazio (ou só espaço) reprova', () => {
    expect(suggestionRefusal(sugestao({ title: '   ' }), [], NOME)).toEqual(expect.any(String))
  })

  it('título que fica vazio depois de tirar a marca reprova', () => {
    expect(suggestionRefusal(sugestao({ title: '| Uma Estrelinha' }), [], NOME)).toEqual(
      expect.any(String),
    )
  })

  it('título com 43 passa e com 44 reprova', () => {
    expect(suggestionRefusal(sugestao({ title: 'a'.repeat(43) }), [], NOME)).toBeNull()
    expect(suggestionRefusal(sugestao({ title: 'a'.repeat(44) }), [], NOME)).toEqual(
      expect.any(String),
    )
  })

  it('o tamanho do título é medido DEPOIS de tirar a marca (edge case: a marca não reprova)', () => {
    const comMarca = `${'a'.repeat(43)} | Uma Estrelinha`
    expect(comMarca.length).toBeGreaterThan(SUGGESTION_TITLE_MAX)
    expect(suggestionRefusal(sugestao({ title: comMarca }), [], NOME)).toBeNull()
    expect(suggestionRefusal(sugestao({ title: `${'a'.repeat(43)} | UE` }), [], NOME)).toBeNull()
  })

  it('descrição com 139 reprova e com 140 passa (A3)', () => {
    expect(suggestionRefusal(sugestao({ description: 'a'.repeat(139) }), [], NOME)).toEqual(
      expect.any(String),
    )
    expect(suggestionRefusal(sugestao({ description: 'a'.repeat(140) }), [], NOME)).toBeNull()
  })

  it('descrição com 160 passa e com 161 reprova', () => {
    expect(suggestionRefusal(sugestao({ description: 'a'.repeat(160) }), [], NOME)).toBeNull()
    expect(suggestionRefusal(sugestao({ description: 'a'.repeat(161) }), [], NOME)).toEqual(
      expect.any(String),
    )
  })

  it('a descrição é medida aparada', () => {
    expect(suggestionRefusal(sugestao({ description: `  ${'a'.repeat(160)}  ` }), [], NOME)).toBeNull()
  })

  it('emoji no título ou na descrição reprova', () => {
    expect(suggestionRefusal(sugestao({ title: 'Colar de resina 🌟' }), [], NOME)).toEqual(
      expect.any(String),
    )
    expect(
      suggestionRefusal(sugestao({ description: `${DESCRICAO_OK} 🌟` }), [], NOME),
    ).toEqual(expect.any(String))
  })

  it('exclamação no título ou na descrição reprova', () => {
    expect(suggestionRefusal(sugestao({ title: 'Colar de resina!' }), [], NOME)).toEqual(
      expect.any(String),
    )
    expect(suggestionRefusal(sugestao({ description: `${DESCRICAO_OK}!` }), [], NOME)).toEqual(
      expect.any(String),
    )
  })

  it.each(URGENCIA_ESPERADA.map(t => [t]))('urgência "%s" na descrição reprova', termo => {
    const description = `Pingente feito à mão em resina por Adri Muniz, no ateliê de Porto Alegre, para guardar perto do peito a lembrança de alguém que se ama, ${termo}.`
    expect(description.length).toBeGreaterThanOrEqual(SUGGESTION_DESCRIPTION_MIN)
    expect(description.length).toBeLessThanOrEqual(DESCRIPTION_MAX)
    expect(suggestionRefusal(sugestao({ description }), [], NOME)).toEqual(expect.any(String))
  })

  it('título igual a um exemplo reprova — sem caixa, sem acento e sem a marca do exemplo', () => {
    const exemplos = ['Colar de Resina com Estrela | UE', 'Outro título']
    expect(
      suggestionRefusal(sugestao({ title: 'colar de resina com estrela' }), exemplos, NOME),
    ).toEqual(expect.any(String))
    expect(
      suggestionRefusal(sugestao({ title: 'Colar de Résina com Estrêla' }), exemplos, NOME),
    ).toEqual(expect.any(String))
  })

  it('título diferente dos exemplos passa', () => {
    expect(suggestionRefusal(sugestao(), ['Colar de resina com estrela'], NOME)).toBeNull()
  })

  // A12 (decisão do usuário, 2026-10-27): o material afetivo PODE ser nomeado. Estes casos
  // substituem os que provavam a recusa — com a mesma forma, e o veredito invertido.
  it.each([
    ['Pingente de Leite Materno em resina'],
    ['Pingente com Cinzas de Cremação'],
    ['Joia com mecha de cabelo do bebê'],
    ['Colar com pelinho do pet'],
  ])('A12: nomear o material ("%s") PASSA', title => {
    expect(suggestionRefusal(sugestao({ title }), [], NOME)).toBeNull()
  })

  it('A12: nomear o material na descrição PASSA', () => {
    const description =
      'Pingente de leite materno feito à mão em resina por Adri Muniz, para eternizar o vínculo do amamentar. Peça personalizada. Envio para todo o Brasil.'
    expect(suggestionRefusal(sugestao({ description }), [], NOME)).toBeNull()
  })

  it('A13: título igual ao nome do produto reprova', () => {
    expect(suggestionRefusal(sugestao({ title: NOME }), [], NOME)).toEqual(expect.any(String))
  })

  it('A13: igual com caixa, acento e espaço diferentes também reprova', () => {
    expect(
      suggestionRefusal(sugestao({ title: '  pingente  ESTRÊLA guiá ' }), [], NOME),
    ).toEqual(expect.any(String))
    expect(
      suggestionRefusal(sugestao({ title: 'Pingente de Leite Materno' }), [], 'Pingente de leite materno'),
    ).toEqual(expect.any(String))
  })

  it('A13: igual ao nome depois de tirar a marca reprova', () => {
    expect(suggestionRefusal(sugestao({ title: `${NOME} | Uma Estrelinha` }), [], NOME)).toEqual(
      expect.any(String),
    )
  })

  it('A13 inverso: o nome CONTIDO no título, mas não igual, passa', () => {
    expect(
      suggestionRefusal(sugestao({ title: `${NOME} em resina e prata` }), [], NOME),
    ).toBeNull()
  })

  it('A13: a ordem — igual a um exemplo vem antes de igual ao nome', () => {
    const motivo = suggestionRefusal(sugestao({ title: NOME }), [NOME], NOME)
    expect(motivo).toMatch(/exemplo/)
  })
})
