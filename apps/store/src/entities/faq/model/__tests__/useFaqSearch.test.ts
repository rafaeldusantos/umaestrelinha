import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFaqSearch } from '../useFaqSearch'
import type { FaqPageGroup } from '@estrelinha/core/faq'

/**
 * `FAQL-04`, `FAQL-05` — a busca da página de perguntas.
 *
 * O caso que mais importa é o do termo que só existe na **resposta**: quem procura "motoboy" não
 * sabe que a palavra está no meio da resposta sobre envio, e uma busca que só olhasse o título
 * mandaria essa pessoa embora com a informação na tela, escondida atrás de um acordeão fechado.
 */

const item = (id: string, question: string, answer: string) => ({
  id,
  question,
  answer,
  overridden: false,
})

const GRUPOS: FaqPageGroup[] = [
  {
    category: 'envio-do-material',
    label: 'Envio do material',
    items: [
      item('a', 'Como devo enviar o material?', 'Pode ser por Carta Registrada, PAC ou SEDEX. Em Porto Alegre, também por motoboy.'),
      item('b', 'Qual quantidade preciso enviar?', 'Cinzas de cremação: cerca de 50 ml.'),
    ],
  },
  {
    category: 'cuidados',
    label: 'Cuidados com a joia',
    items: [item('c', 'Posso tomar banho com a joia?', 'Não recomendamos: evite piscina e mar.')],
  },
]

const buscar = (termo: string) => renderHook(() => useFaqSearch(GRUPOS, termo)).result.current

describe('useFaqSearch', () => {
  it('busca vazia devolve tudo, e diz que não está buscando', () => {
    const r = buscar('')
    expect(r.groups).toBe(GRUPOS)
    expect(r.matches).toBe(3)
    expect(r.searching).toBe(false)
  })

  it('só espaço também é busca vazia', () => {
    expect(buscar('   ').searching).toBe(false)
  })

  it('casa pela PERGUNTA', () => {
    const r = buscar('quantidade')
    expect(r.matches).toBe(1)
    expect(r.groups[0].items[0].id).toBe('b')
  })

  // ⚠️ O caso que a feature existe para atender.
  it('casa por palavra que só existe na RESPOSTA', () => {
    const r = buscar('motoboy')
    expect(r.matches).toBe(1)
    expect(r.groups[0].items[0].id).toBe('a')
  })

  it('ignora acento e caixa — é o mesmo normalizador da biblioteca', () => {
    expect(buscar('CREMAÇÃO').matches).toBe(1)
    expect(buscar('cremacao').matches).toBe(1)
    expect(buscar('Cremacao').matches).toBe(1)
  })

  it('assunto sem resultado SOME, e o que sobra mantém o cabeçalho', () => {
    const r = buscar('piscina')
    expect(r.groups.map(g => g.category)).toEqual(['cuidados'])
    expect(r.groups[0].label).toBe('Cuidados com a joia')
  })

  it('resultado que atravessa assuntos mantém os dois cabeçalhos', () => {
    const r = buscar('o')
    expect(r.groups.length).toBeGreaterThan(1)
  })

  // "Nenhuma pergunta com esse texto" é a frase de busca sem resultado; "ainda não há perguntas
  // publicadas" é outra coisa. `searching` é o que separa as duas.
  it('nada casou devolve zero grupos COM searching verdadeiro', () => {
    const r = buscar('zircônia')
    expect(r.groups).toEqual([])
    expect(r.matches).toBe(0)
    expect(r.searching).toBe(true)
  })

  it('grupos nulos não quebram a busca', () => {
    const r = renderHook(() => useFaqSearch(null, 'motoboy')).result.current
    expect(r.groups).toEqual([])
    expect(r.matches).toBe(0)
  })
})
