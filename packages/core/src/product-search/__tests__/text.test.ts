// A dobra de busca, com dono — `BUS-02`, `BUS-04`.
//
// O que esta suíte protege não é a função em si (ela cabe em duas linhas): é a propriedade de que a
// dobra vale nos **dois sentidos**. Uma régua que só provasse "termo sem acento acha nome com
// acento" passaria com metade da implementação — e a metade que falta é justamente a que quebra
// nesta loja, onde a dona digita "coração" com acento e o catálogo tem "Coracao" importado sem ele
// (`L-029`).

import { describe, expect, it } from 'vitest'

import { dobrarTexto, palavrasDoTermo } from '../text.ts'

describe('dobrarTexto — sem caixa e sem acento', () => {
  it('tira a caixa', () => {
    expect(dobrarTexto('Colar De Cinzas')).toBe('colar de cinzas')
  })

  it('tira o acento agudo, o circunflexo e o til', () => {
    expect(dobrarTexto('Memória')).toBe('memoria')
    expect(dobrarTexto('Pêndulo')).toBe('pendulo')
    expect(dobrarTexto('Coração')).toBe('coracao')
  })

  it('alcança `ç` e `ñ` — eles são combinante depois do `NFD`', () => {
    // A cedilha e o til são pontos de código próprios só ANTES da decomposição. Sem `normalize`,
    // nenhuma classe de combinante os toca e "acai" nunca acharia "Açaí".
    //
    // **A palavra do segundo caso NÃO é livre**, e trocá-la de volta reprova a suíte da LOJA: a
    // primeira escrita usava `Mañana`, cuja dobra carrega a marca anterior como substring, e
    // `brandScan.test.ts` — que varre `apps/`, `packages/` e `supabase/` — a acusou. O caso continua
    // provando exatamente a mesma coisa (o til é alcançado), com uma palavra que não colide.
    expect(dobrarTexto('Açaí')).toBe('acai')
    expect(dobrarTexto('Niño')).toBe('nino')
  })

  it('é IDEMPOTENTE — dobrar o já dobrado não muda nada', () => {
    expect(dobrarTexto(dobrarTexto('Anel Coração'))).toBe('anel coracao')
  })

  it('a dobra vale nos DOIS sentidos — é o que torna a busca simétrica', () => {
    // A metade que costuma faltar: o termo acentuado contra o nome sem acento. As duas são a mesma
    // asserção só depois que a dobra existe dos dois lados.
    expect(dobrarTexto('coracao')).toBe(dobrarTexto('Coração'))
    expect(dobrarTexto('Coração')).toBe(dobrarTexto('CORACAO'))
  })

  it('string vazia não quebra', () => {
    expect(dobrarTexto('')).toBe('')
  })
})

describe('palavrasDoTermo — as palavras, dobradas e sem repetição', () => {
  it('quebra por espaço e dobra cada palavra', () => {
    expect(palavrasDoTermo('Cinzas Coração')).toEqual(['cinzas', 'coracao'])
  })

  it('descarta vazio — espaço em volta e espaço duplo não viram palavra', () => {
    expect(palavrasDoTermo('   colar    cinzas  ')).toEqual(['colar', 'cinzas'])
  })

  it('desduplica — `colar colar` vale exatamente `colar`', () => {
    expect(palavrasDoTermo('colar colar')).toEqual(['colar'])
    expect(palavrasDoTermo('Colar COLAR colar')).toEqual(['colar'])
  })

  it('termo vazio, só espaço e só pontuação devolvem `[]` (BUS-04)', () => {
    // O estado em que o campo ABRE, e não um caso de borda: quem chama lê `[]` como "não há termo"
    // e devolve o pool inteiro, sem tratar como erro.
    expect(palavrasDoTermo('')).toEqual([])
    expect(palavrasDoTermo('   ')).toEqual([])
    expect(palavrasDoTermo('---')).toEqual([])
    expect(palavrasDoTermo('  ...  ')).toEqual([])
  })

  it('a pontuação colada na palavra não vai junto — `colar,` continua sendo `colar`', () => {
    // Cortar só no espaço faria a vírgula entrar na comparação e `colar,` deixar de achar
    // `Colar de Cinzas`.
    expect(palavrasDoTermo('colar,')).toEqual(['colar'])
    expect(palavrasDoTermo('“cinzas”')).toEqual(['cinzas'])
  })

  it('o hífen separa — `porta-retrato` procura as duas palavras', () => {
    expect(palavrasDoTermo('porta-retrato')).toEqual(['porta', 'retrato'])
  })

  it('o dígito sobrevive — nome de peça tem número', () => {
    expect(palavrasDoTermo('anel 2')).toEqual(['anel', '2'])
  })
})
