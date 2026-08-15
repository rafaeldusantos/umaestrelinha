import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ENGRAVING_MAX_CHARS,
  ENGRAVING_AXIS,
  MATERIAL_KINDS,
  MATERIAL_KIND_LABELS,
  MATERIAL_STATUSES,
  MATERIAL_STATUS_LABELS,
  MATERIAL_TO_BE_AGREED,
  MATERIAL_TRANSITIONS,
  type MaterialKind,
  type MaterialStatus,
  engravingLimit,
  engravingRefusal,
  hasEngraving,
  hasEngravingAxis,
  inferMaterial,
  initialMaterialStatus,
  isInMaterialQueue,
  isMaterialKind,
  isMaterialStatus,
  materialAnchor,
  materialKindLabel,
  materialKindsOf,
  materialSummary,
  materialTransitionRefusal,
  materialTransitionSources,
  normalizeEngraving,
  requiresMaterial,
  toMaterialKinds,
  toMaterialStatus,
} from '../material'

// =================================================================================================
// MAT-02 · a lista de materiais
// =================================================================================================

describe('MATERIAL_KINDS — a lista fechada, elemento a elemento', () => {
  // Uma AC que enumera lista pede uma asserção por elemento. `toHaveLength(10)` passaria com dez
  // valores errados, e `toEqual([...])` esconde QUAL deles saiu quando quebra.
  it.each([
    'leite_materno',
    'cabelo',
    'cinzas',
    'pelo_pet',
    'dente_leite',
    'coto_umbilical',
    'placenta',
    'flores',
    'penas',
    'outro',
  ])('`%s` é um material da lista', kind => {
    expect(MATERIAL_KINDS).toContain(kind)
    expect(isMaterialKind(kind)).toBe(true)
  })

  it('a lista tem exatamente esses dez — nada a mais entrou sem passar pelo teste acima', () => {
    expect(MATERIAL_KINDS).toHaveLength(10)
  })

  it('todo material tem rótulo em pt-BR, e nenhum é o próprio enum', () => {
    for (const kind of MATERIAL_KINDS) {
      const label = MATERIAL_KIND_LABELS[kind]
      expect(label, `sem rótulo: ${kind}`).toBeTruthy()
      expect(label).not.toBe(kind)
      expect(materialKindLabel(kind)).toBe(label)
    }
  })

  it('nenhum rótulo usa linguagem festiva, diminutivo ou emoji — o registro é memorial', () => {
    // `CLAUDE.md`: nada de tom comemorativo. Estes rótulos aparecem ao lado da palavra "cinzas".
    const proibido = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]|!|inho\b|inha\b/u
    for (const kind of MATERIAL_KINDS) {
      expect(MATERIAL_KIND_LABELS[kind], `tom errado em ${kind}`).not.toMatch(proibido)
    }
  })

  it('`materialAnchor` troca `_` por `-` — é o id da ficha na página "Como enviar"', () => {
    expect(materialAnchor('leite_materno')).toBe('leite-materno')
    expect(materialAnchor('cinzas')).toBe('cinzas')
    expect(materialAnchor('coto_umbilical')).toBe('coto-umbilical')
  })

  it('`isMaterialKind` recusa o que não está na lista', () => {
    expect(isMaterialKind('sangue')).toBe(false)
    expect(isMaterialKind('')).toBe(false)
    expect(isMaterialKind(null)).toBe(false)
    expect(isMaterialKind(42)).toBe(false)
  })

  it('`toMaterialKinds` tolera dado torto sem derrubar a página', () => {
    expect(toMaterialKinds(['cabelo', 'sangue', 7, null, 'cinzas'])).toEqual(['cabelo', 'cinzas'])
    expect(toMaterialKinds(null)).toEqual([])
    expect(toMaterialKinds('cabelo')).toEqual([])
    expect(toMaterialKinds(undefined)).toEqual([])
  })
})

// =================================================================================================
// MAT-02 · "exige material" e "quais materiais" são DOIS dados
// =================================================================================================

describe('requiresMaterial — `null` é "nunca decidido", e lê como "não exige"', () => {
  it('`true` exige', () => {
    expect(requiresMaterial({ requires_material: true })).toBe(true)
  })

  it('`false` não exige', () => {
    expect(requiresMaterial({ requires_material: false })).toBe(false)
  })

  it('`null` não exige — é o marcador de linha que ninguém curou ainda', () => {
    expect(requiresMaterial({ requires_material: null })).toBe(false)
  })

  it('ausente e linha inexistente não exigem, e não lançam', () => {
    expect(requiresMaterial({})).toBe(false)
    expect(requiresMaterial(null)).toBe(false)
    expect(requiresMaterial(undefined)).toBe(false)
  })

  it('`materialKindsOf` normaliza a lista da linha', () => {
    expect(materialKindsOf({ material_kinds: ['cabelo', 'x'] })).toEqual(['cabelo'])
    expect(materialKindsOf(null)).toEqual([])
  })
})

describe('materialSummary — as três situações da spec, distintas', () => {
  it('não exige ⇒ string vazia (a loja não mostra aviso nenhum)', () => {
    expect(materialSummary(false, [])).toBe('')
    expect(materialSummary(false, ['cinzas'])).toBe('')
  })

  it('exige SEM dizer qual ⇒ "a combinar" — nunca lista vazia, que se lê como "nenhum"', () => {
    expect(materialSummary(true, [])).toBe(MATERIAL_TO_BE_AGREED)
    expect(MATERIAL_TO_BE_AGREED).toBe('a combinar')
  })

  it('exige UM material ⇒ o rótulo dele', () => {
    expect(materialSummary(true, ['cinzas'])).toBe('Cinzas')
  })

  it('exige DOIS ⇒ os dois, ligados por "e" — é a Árvore da Vida', () => {
    expect(materialSummary(true, ['cabelo', 'coto_umbilical'])).toBe(
      'Mecha de cabelo e Coto umbilical',
    )
  })

  it('exige TRÊS ⇒ vírgula e "e" no último', () => {
    expect(materialSummary(true, ['cabelo', 'cinzas', 'penas'])).toBe(
      'Mecha de cabelo, Cinzas e Penas',
    )
  })

  it('valor torto na lista é descartado, não vira rótulo em branco', () => {
    expect(materialSummary(true, ['cabelo', 'sangue' as MaterialKind])).toBe('Mecha de cabelo')
  })
})

// =================================================================================================
// MAT-07 · o estado em que o pedido nasce
// =================================================================================================

describe('initialMaterialStatus', () => {
  it('nenhum item exige ⇒ `nao_aplicavel`', () => {
    expect(initialMaterialStatus([])).toBe('nao_aplicavel')
    expect(initialMaterialStatus([{ requires_material: false }, {}])).toBe('nao_aplicavel')
  })

  it('um item exige ⇒ `aguardando_material`, mesmo com outros que não exigem', () => {
    expect(
      initialMaterialStatus([{ requires_material: false }, { requires_material: true }]),
    ).toBe('aguardando_material')
  })

  it('exige SEM dizer qual TAMBÉM entra na fila — a fila é sobre "algo está a caminho"', () => {
    expect(initialMaterialStatus([{ requires_material: true, material_kinds: [] }])).toBe(
      'aguardando_material',
    )
  })

  it('`null` não põe o pedido na fila', () => {
    expect(initialMaterialStatus([{ requires_material: null }])).toBe('nao_aplicavel')
  })

  it('lista ausente não lança', () => {
    expect(initialMaterialStatus(undefined as never)).toBe('nao_aplicavel')
  })
})

describe('isInMaterialQueue — quem ainda acumula', () => {
  it.each([
    ['nao_aplicavel', false],
    ['aguardando_material', true],
    ['material_enviado', true],
    ['material_recebido', false],
    ['em_producao', false],
  ] as [MaterialStatus, boolean][])('`%s` ⇒ %s', (status, esperado) => {
    expect(isInMaterialQueue(status)).toBe(esperado)
  })
})

// =================================================================================================
// MAT-08 · a máquina de estado
// =================================================================================================

describe('MATERIAL_STATUSES', () => {
  it.each([
    'nao_aplicavel',
    'aguardando_material',
    'material_enviado',
    'material_recebido',
    'em_producao',
  ])('`%s` é um estado de material', status => {
    expect(MATERIAL_STATUSES).toContain(status)
    expect(isMaterialStatus(status)).toBe(true)
    expect(MATERIAL_STATUS_LABELS[status as MaterialStatus]).toBeTruthy()
  })

  it('são exatamente cinco', () => {
    expect(MATERIAL_STATUSES).toHaveLength(5)
  })

  it('`toMaterialStatus` cai em `nao_aplicavel` para qualquer coisa fora da lista', () => {
    expect(toMaterialStatus('material_recebido')).toBe('material_recebido')
    expect(toMaterialStatus('inventado')).toBe('nao_aplicavel')
    expect(toMaterialStatus(null)).toBe('nao_aplicavel')
  })
})

describe('MATERIAL_TRANSITIONS — a tabela do design, célula a célula', () => {
  // Cada linha é `de → [para permitidos]`. Escrita à mão de propósito: derivar da constante que se
  // quer guardar faria a asserção encolher junto com ela.
  const TABELA: [MaterialStatus, MaterialStatus[]][] = [
    ['nao_aplicavel', []],
    ['aguardando_material', ['material_enviado', 'material_recebido']],
    ['material_enviado', ['material_recebido']],
    ['material_recebido', ['em_producao']],
    ['em_producao', []],
  ]

  it.each(TABELA)('de `%s` sai exatamente para %j', (from, destinos) => {
    expect([...MATERIAL_TRANSITIONS[from]]).toEqual(destinos)
  })

  it('o SALTO DIRETO existe: `aguardando_material → material_recebido`', () => {
    // É obrigatório, não atalho: informar o rastreio é opcional, então a maioria dos pedidos nunca
    // passa por `material_enviado`. Sem ele a Adri não conseguiria registrar o caso mais comum.
    expect(MATERIAL_TRANSITIONS.aguardando_material).toContain('material_recebido')
    expect(materialTransitionRefusal('aguardando_material', 'material_recebido')).toBeNull()
  })

  it('`materialTransitionSources` inclui o próprio estado (idempotência) e as origens reais', () => {
    expect(materialTransitionSources('material_recebido').sort()).toEqual(
      ['aguardando_material', 'material_enviado', 'material_recebido'].sort(),
    )
  })
})

describe('materialTransitionRefusal', () => {
  it('devolve `string | null` — nunca objeto discriminado por booleano', () => {
    // `strictNullChecks: false` não estreita união por literal booleano (TS2339). O formato é
    // contrato, não estilo: `reservedSlugRefusal` e `menuSlotRefusal` seguem o mesmo.
    const ok = materialTransitionRefusal('aguardando_material', 'material_recebido')
    const nao = materialTransitionRefusal('nao_aplicavel', 'material_recebido')
    expect(ok).toBeNull()
    expect(typeof nao).toBe('string')
  })

  it.each(MATERIAL_STATUSES)('transição de `%s` para ele mesmo é SUCESSO (idempotência)', status => {
    // É o que faz duas admins clicando ao mesmo tempo convergirem sem estado intermediário inválido.
    expect(materialTransitionRefusal(status, status)).toBeNull()
  })

  it('`nao_aplicavel → material_recebido` é recusado com motivo que a Adri entende', () => {
    const motivo = materialTransitionRefusal('nao_aplicavel', 'material_recebido')
    expect(motivo).toContain('não exige material')
    expect(motivo).not.toMatch(/nao_aplicavel|material_recebido/)
  })

  it('nunca volta atrás: `material_recebido → aguardando_material` é recusado', () => {
    expect(materialTransitionRefusal('material_recebido', 'aguardando_material')).toBeTruthy()
  })

  it('nunca volta atrás: `material_recebido → material_enviado` é recusado', () => {
    expect(materialTransitionRefusal('material_recebido', 'material_enviado')).toBeTruthy()
  })

  it('não pula etapa: `aguardando_material → em_producao` é recusado, dizendo de onde se chega', () => {
    const motivo = materialTransitionRefusal('aguardando_material', 'em_producao')
    expect(motivo).toContain(MATERIAL_STATUS_LABELS.material_recebido)
  })

  it('estado inventado, dos dois lados, é recusado sem lançar', () => {
    expect(materialTransitionRefusal('aguardando_material', 'entregue' as MaterialStatus)).toBeTruthy()
    expect(materialTransitionRefusal('entregue' as MaterialStatus, 'material_recebido')).toBeTruthy()
  })

  it('toda transição declarada em MATERIAL_TRANSITIONS é aceita, e nenhuma outra', () => {
    for (const from of MATERIAL_STATUSES) {
      for (const to of MATERIAL_STATUSES) {
        const permitida = from === to || MATERIAL_TRANSITIONS[from].includes(to)
        const refusal = materialTransitionRefusal(from, to)
        expect(refusal === null, `${from} → ${to}`).toBe(permitida)
      }
    }
  })
})

// =================================================================================================
// MAT-03 · gravação
// =================================================================================================

describe('hasEngraving — deriva da VARIAÇÃO escolhida', () => {
  it('o eixo do catálogo real é exatamente `Com gravação`', () => {
    expect(ENGRAVING_AXIS).toBe('Com gravação')
  })

  it.each([
    ['Com gravação', 'Sim', true],
    ['com gravacao', 'sim', true],
    ['COM GRAVAÇÃO', 'SIM', true],
    ['  Com gravação  ', 'Sim', true],
    ['Com gravação', 'Não', false],
    ['Com gravação', 'nao', false],
    ['Cor', 'Sim', false],
  ])('`%s: %s` ⇒ %s', (axis, value, esperado) => {
    expect(hasEngraving({ [axis]: value })).toBe(esperado)
  })

  it('eixo ausente, objeto vazio e nulo ⇒ não grava', () => {
    expect(hasEngraving({ Cor: 'Prata' })).toBe(false)
    expect(hasEngraving({})).toBe(false)
    expect(hasEngraving(null)).toBe(false)
    expect(hasEngraving(undefined)).toBe(false)
  })

  it('o eixo convive com os outros da mesma variação', () => {
    expect(hasEngraving({ Cor: 'Prata', Tamanho: '45cm', 'Com gravação': 'Sim' })).toBe(true)
  })
})

describe('hasEngravingAxis — o PRODUTO oferece gravação?', () => {
  it('acha o eixo em qualquer grafia', () => {
    expect(hasEngravingAxis([{ name: 'Cor' }, { name: 'Com gravação' }])).toBe(true)
    expect(hasEngravingAxis([{ name: 'com gravacao' }])).toBe(true)
  })

  it('produto sem o eixo ⇒ false — são 654 dos 689 do catálogo', () => {
    expect(hasEngravingAxis([{ name: 'Cor' }, { name: 'Tamanho' }])).toBe(false)
    expect(hasEngravingAxis([])).toBe(false)
    expect(hasEngravingAxis(null)).toBe(false)
  })
})

describe('engravingLimit — o teto vem do cadastro, e nunca é "sem limite"', () => {
  it('o default é 20', () => {
    expect(DEFAULT_ENGRAVING_MAX_CHARS).toBe(20)
  })

  it('o valor do produto vence o default', () => {
    expect(engravingLimit(35)).toBe(35)
  })

  it.each([null, undefined, 0, -5, Number.NaN])('`%s` cai no default — 0 não é "sem limite"', max => {
    expect(engravingLimit(max as number)).toBe(DEFAULT_ENGRAVING_MAX_CHARS)
  })

  it('valor fracionário é truncado para baixo', () => {
    expect(engravingLimit(12.9)).toBe(12)
  })
})

describe('normalizeEngraving — texto só de espaços É vazio', () => {
  it.each(['', '   ', '\t\n  ', null, undefined])('`%s` ⇒ null', texto => {
    expect(normalizeEngraving(texto as string)).toBeNull()
  })

  it('as bordas somem, o miolo fica', () => {
    expect(normalizeEngraving('  Ana e Léo  ')).toBe('Ana e Léo')
  })
})

describe('engravingRefusal', () => {
  it('vazio não é recusa — gravação é opcional', () => {
    expect(engravingRefusal('', 20)).toBeNull()
    expect(engravingRefusal('   ', 20)).toBeNull()
    expect(engravingRefusal(null, 20)).toBeNull()
  })

  it('no limite exato passa', () => {
    expect(engravingRefusal('a'.repeat(20), 20)).toBeNull()
  })

  it('um caractere acima é recusado, e o motivo traz O NÚMERO', () => {
    const motivo = engravingRefusal('a'.repeat(21), 20)
    expect(motivo).toContain('21')
    expect(motivo).toContain('20')
  })

  it('o limite do produto é respeitado, não o default', () => {
    expect(engravingRefusal('a'.repeat(30), 35)).toBeNull()
    expect(engravingRefusal('a'.repeat(30), 25)).toBeTruthy()
  })

  it('sem limite declarado, vale o default de 20', () => {
    expect(engravingRefusal('a'.repeat(21), null)).toBeTruthy()
    expect(engravingRefusal('a'.repeat(20), null)).toBeNull()
  })

  it('espaço nas bordas não conta para o limite', () => {
    expect(engravingRefusal(`   ${'a'.repeat(20)}   `, 20)).toBeNull()
  })
})

// =================================================================================================
// Semente do catálogo real
// =================================================================================================

describe('inferMaterial — os casos medidos no catálogo real', () => {
  it('a peça que exige DOIS materiais devolve os dois', () => {
    // O caso que derrubou a primeira redação da spec: "escolha o material" não é incompleto aqui,
    // é errado — a peça exige cabelo E coto umbilical.
    expect(inferMaterial('Árvore da Vida com Cabelo e Coto Umbilical')).toEqual({
      requires: true,
      kinds: ['cabelo', 'coto_umbilical'],
    })
  })

  it.each([
    ['Pingente com leite materno', ['leite_materno']],
    ['Colar de cinzas em prata 925', ['cinzas']],
    ['Anel com mecha de cabelo', ['cabelo']],
    ['Pingente coto umbilical', ['coto_umbilical']],
    ['Joia com pelo de pet', ['pelo_pet']],
    ['Pingente dente de leite', ['dente_leite']],
    ['Colar com flores preservadas', ['flores']],
    ['Pingente pétala Buquê de Flores Naturais Personalizado', ['flores']],
    ['Pingente Orquídea Roxa flor Natural', ['flores']],
    ['Joia Afetiva com Pena de Pássaro', ['penas']],
    ['Pingente com placenta', ['placenta']],
  ])('`%s` ⇒ %j', (nome, esperado) => {
    expect(inferMaterial(nome).kinds).toEqual(esperado)
    expect(inferMaterial(nome).requires).toBe(true)
  })

  it('"dente de leite" NÃO vira leite materno — é a armadilha do substrato "leite"', () => {
    // 25 produtos do catálogo dizem "dente". Sem mascarar a expressão, todos virariam leite materno.
    expect(inferMaterial('Pingente com dente de leite').kinds).toEqual(['dente_leite'])
    expect(inferMaterial('Pingente com dente de leite').kinds).not.toContain('leite_materno')
  })

  it('peça sem material afetivo não exige nada', () => {
    expect(inferMaterial('Corrente de prata 925 — 45 cm')).toEqual({ requires: false, kinds: [] })
    expect(inferMaterial('Caixinha de presente')).toEqual({ requires: false, kinds: [] })
  })

  it('"apenas" não vira "penas" — o `\\b` inicial protege', () => {
    expect(inferMaterial('Pingente apenas dourado').kinds).toEqual([])
  })

  it.each([
    'Berloque Afetivo Flor Lisa em Aço Inoxidável',
    'Pingente Menina Com Flor em Folheado a Ouro',
    'Berloque Afetivo Flor com Borda em Aço Inoxidável',
  ])('`%s` — flor é a FORMA da peça, não material a enviar', nome => {
    // Nomes reais do catálogo. Marcar material aqui faria a loja pedir que a cliente envie flores
    // para comprar um berloque liso.
    expect(inferMaterial(nome).kinds).toEqual([])
    expect(inferMaterial(nome).requires).toBe(false)
  })

  it('"Flor com Cinzas de Cremação": a flor é a forma, o material é cinzas', () => {
    // O caso que prova que a regra de flor precisa ser conservadora — este produto existe.
    expect(inferMaterial('Joia Afetiva Flor com Cinzas de Cremação').kinds).toEqual(['cinzas'])
  })

  it('acento e caixa não mudam o resultado', () => {
    expect(inferMaterial('PINGENTE COM CINZAS').kinds).toEqual(['cinzas'])
    expect(inferMaterial('pingente com cabelo').kinds).toEqual(['cabelo'])
  })

  it('a ordem de saída é a de MATERIAL_KINDS — o rótulo do pedido não muda entre execuções', () => {
    expect(inferMaterial('Coto umbilical e cabelo').kinds).toEqual(['cabelo', 'coto_umbilical'])
    expect(inferMaterial('Cabelo e coto umbilical').kinds).toEqual(['cabelo', 'coto_umbilical'])
  })

  it('nome vazio ou ausente não lança', () => {
    expect(inferMaterial('')).toEqual({ requires: false, kinds: [] })
    expect(inferMaterial(null)).toEqual({ requires: false, kinds: [] })
    expect(inferMaterial(undefined)).toEqual({ requires: false, kinds: [] })
  })

  it('todo material inferido é um `MaterialKind` válido', () => {
    const nomes = [
      'Cinzas', 'Cabelo', 'Leite materno', 'Dente de leite', 'Coto umbilical',
      'Pelo de pet', 'Flores', 'Penas', 'Placenta',
    ]
    for (const nome of nomes) {
      for (const kind of inferMaterial(nome).kinds) {
        expect(isMaterialKind(kind), `${nome} → ${kind}`).toBe(true)
      }
    }
  })
})
