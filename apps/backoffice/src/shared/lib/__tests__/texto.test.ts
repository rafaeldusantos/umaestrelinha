// A dobra de busca, com dono (feature 51, T01 — `BUS-02`, `BUS-04`).
//
// O que esta suíte protege não é a função em si (ela cabe em duas linhas): é a propriedade de que a
// dobra vale nos **dois sentidos**. Uma régua que só provasse "termo sem acento acha nome com
// acento" passaria com metade da implementação — e a metade que falta é justamente a que quebra
// nesta loja, onde a dona digita "coração" com acento e o catálogo tem "Coracao" importado sem ele
// (`L-029`).

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { dobrarTexto, palavrasDoTermo } from '../texto'

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

describe('texto.ts é o ÚNICO dono da dobra entre os três antigos declarantes', () => {
  const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

  /**
   * Os dois arquivos que esta task converteu. O `ProductPicker` sai na T05, junto com a delegação
   * dele ao componente compartilhado — e o guarda de verdade (`BUS-22`, varredura do app inteiro)
   * nasce na T10. Aqui a régua é estreita e declarada: prova que a conversão **aconteceu**, e não
   * que ninguém mais no painel escreve a dobra.
   */
  const CONVERTIDOS = [
    'features/store-menu/ui/MenuIconPicker.tsx',
    'features/category-list/model/categoryTree.ts',
  ] as const

  const FONTES = CONVERTIDOS.map(caminho => ({
    caminho,
    fonte: readFileSync(resolve(RAIZ, caminho), 'utf8'),
  }))

  it('ÂNCORA: os dois arquivos foram lidos e não estão vazios', () => {
    // Sem ela um caminho errado varreria zero arquivo e as duas asserções de baixo passariam sobre
    // nada, que é a pior falha possível num teste que lê fonte (`L-021`).
    expect(FONTES).toHaveLength(2)
    expect(FONTES.every(f => f.fonte.length > 0)).toBe(true)
  })

  it('nenhum dos dois declara mais a dobra', () => {
    const culpados = FONTES.filter(f => /normalize\(\s*['"]NFD['"]\s*\)/.test(f.fonte))
    expect(culpados.map(c => c.caminho)).toEqual([])
  })

  it('os dois importam do dono', () => {
    // O par da asserção acima: apagar a dobra sem pôr o import no lugar deixaria a primeira verde e
    // o arquivo sem compilar.
    const semImport = FONTES.filter(f => !/from ['"]@\/shared\/lib\/texto['"]/.test(f.fonte))
    expect(semImport.map(c => c.caminho)).toEqual([])
  })
})
