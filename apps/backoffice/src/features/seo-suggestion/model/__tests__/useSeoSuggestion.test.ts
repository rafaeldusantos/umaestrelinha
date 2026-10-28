// Feature 84 — o estado da sugestão (`SIA-10`, `SIA-12`, `SIA-20`, `SIA-22`..`SIA-25`).
//
// Toda ordem é provada com promessas que o TESTE resolve (o dublê segura a resposta), nunca com
// relógio: "a resposta de um pedido superado é descartada" só é verdadeira se a resposta chegar
// DEPOIS do que a supera, e é o teste quem decide esse depois.
//
// O arnês guarda o par de SEO num `useState`, como a página: `apply` escreve nele, e é ele que as
// asserções leem. Uma asserção de "não aplicou" só vale com a resposta efetivamente entregue.

import { act, renderHook } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SeoSuggestionInput, SeoSuggestionOutcome } from '../../api/requestSeoSuggestion'

const h = vi.hoisted(() => ({
  pedidos: [] as { input: unknown; resolver: (o: unknown) => void }[],
}))
vi.mock('../../api/requestSeoSuggestion', () => ({
  requestSeoSuggestion: (input: unknown) =>
    new Promise(resolve => {
      h.pedidos.push({ input, resolver: resolve })
    }),
}))

import { useSeoSuggestion, type SeoPair } from '../useSeoSuggestion'

const INPUT: SeoSuggestionInput = {
  productId: null,
  name: 'Anel Coração',
  description: '',
  categoryIds: [],
  relatedIds: [],
  requiresMaterial: false,
}

const SUGESTAO: SeoSuggestionOutcome = {
  kind: 'ok',
  title: 'Anel de resina com coração',
  description: 'Anel feito à mão em resina, com o coração de quem você ama guardado dentro.',
}

const APLICADA = 'Sugestão aplicada ao título e à descrição. Revise antes de salvar.'

const montar = (inicial: SeoPair = { title: 'Título antigo', description: 'Descrição antiga' }) =>
  renderHook(() => {
    const [par, setPar] = useState<SeoPair>(inicial)
    const s = useSeoSuggestion({ current: par, apply: setPar })
    return { par, setPar, s }
  })

/** Entrega a resposta do pedido `i` e deixa as microtarefas correrem. */
const responder = async (i: number, desfecho: SeoSuggestionOutcome | { kind: 'error'; reason: string }) => {
  await act(async () => {
    h.pedidos[i].resolver(desfecho)
  })
}

beforeEach(() => {
  h.pedidos = []
})

describe('sugerir (SIA-10)', () => {
  it('em voo: status loading; ao chegar 200, os dois campos recebem a sugestão', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    expect(result.current.s.status).toBe('loading')
    expect(h.pedidos[0].input).toEqual(INPUT)

    await responder(0, SUGESTAO)
    expect(result.current.par).toEqual({ title: SUGESTAO.title, description: (SUGESTAO as { description: string }).description })
    expect(result.current.s.status).toBe('idle')
    // Conserto do QA (BUG-…-sugestao-preenchida-sem-aviso-ao-leitor): o sucesso também tem frase.
    expect(result.current.s.message).toBe(APLICADA)
  })

  it('SIA-24: tocar de novo com um pedido em voo é ignorado — uma chamada só', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.suggest(INPUT))
    expect(h.pedidos).toHaveLength(1)

    // E depois de a resposta chegar, um toque novo volta a chamar.
    await responder(0, SUGESTAO)
    act(() => result.current.s.suggest(INPUT))
    expect(h.pedidos).toHaveLength(2)
  })
})

describe('desfazer (SIA-12)', () => {
  it('devolve EXATAMENTE o par anterior, e some depois de usado', async () => {
    const { result } = montar({ title: '  Título antigo ', description: 'Descrição antiga' })
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    expect(result.current.s.canUndo).toBe(true)

    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: '  Título antigo ', description: 'Descrição antiga' })
    expect(result.current.s.canUndo).toBe(false)
  })

  it('só um dos dois campos tinha texto: o desfazer existe e devolve os dois como estavam', async () => {
    const { result } = montar({ title: '', description: 'Só a descrição' })
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: '', description: 'Só a descrição' })
  })

  it('campos vazios antes: não há o que desfazer', async () => {
    const { result } = montar({ title: '', description: '  ' })
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    expect(result.current.par.title).toBe(SUGESTAO.kind === 'ok' ? SUGESTAO.title : '')
    expect(result.current.s.canUndo).toBe(false)
  })

  it('noteManualEdit desliga o desfazer', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    expect(result.current.s.canUndo).toBe(true)
    act(() => result.current.s.noteManualEdit())
    expect(result.current.s.canUndo).toBe(false)
    act(() => result.current.s.undo())
    expect(result.current.par.title).toBe('Anel de resina com coração')
  })

  it('uma nova sugestão desliga o desfazer já no toque', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    expect(result.current.s.canUndo).toBe(true)
    act(() => result.current.s.suggest(INPUT))
    expect(result.current.s.canUndo).toBe(false)
  })

  it('reset (depois do save) desliga o desfazer', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.reset())
    expect(result.current.s.canUndo).toBe(false)
  })
})

describe('descarte (SIA-24, SIA-25)', () => {
  it('SIA-25: resposta que chega depois de noteManualEdit NÃO aplica e diz a frase', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    act(() => {
      result.current.setPar({ title: 'Digitei isto', description: 'Descrição antiga' })
      result.current.s.noteManualEdit()
    })
    await responder(0, SUGESTAO)

    expect(result.current.par).toEqual({ title: 'Digitei isto', description: 'Descrição antiga' })
    expect(result.current.s.message).toBe(
      'Você editou o SEO enquanto a sugestão chegava; mantive o seu texto.',
    )
    expect(result.current.s.status).toBe('idle')
    expect(result.current.s.canUndo).toBe(false)
  })

  it('noteManualEdit SEM pedido em voo não arma o descarte do próximo pedido', async () => {
    const { result } = montar()
    act(() => result.current.s.noteManualEdit())
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    expect(result.current.par.title).toBe('Anel de resina com coração')
    // Não é a frase de SIA-25: é a do sucesso.
    expect(result.current.s.message).toBe(APLICADA)
  })

  it('SIA-24: cancel (troca de aba) — a resposta que chega depois não toca nos campos, sem frase', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.cancel())
    expect(result.current.s.status).toBe('idle')
    await responder(0, SUGESTAO)

    expect(result.current.par).toEqual({ title: 'Título antigo', description: 'Descrição antiga' })
    expect(result.current.s.message).toBeNull()
    expect(result.current.s.canUndo).toBe(false)
  })

  it('pedido superado: o primeiro, cancelado, responde DEPOIS do segundo e é descartado', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.cancel())
    act(() => result.current.s.suggest(INPUT))
    expect(h.pedidos).toHaveLength(2)

    await responder(1, SUGESTAO)
    expect(result.current.par.title).toBe('Anel de resina com coração')
    await responder(0, { kind: 'ok', title: 'Velho', description: 'Velha descrição que chegou atrasada.' })
    expect(result.current.par.title).toBe('Anel de resina com coração')
    // E o desfazer continua sendo o do pedido vigente.
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: 'Título antigo', description: 'Descrição antiga' })
  })

  it('reset com um pedido em voo também o descarta', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.reset())
    await responder(0, SUGESTAO)
    expect(result.current.par.title).toBe('Título antigo')
  })

  it('hook desmontado: a resposta que chega depois não chama apply', async () => {
    const apply = vi.fn()
    const { result, unmount } = renderHook(() =>
      useSeoSuggestion({ current: { title: 'a', description: 'b' }, apply }),
    )
    act(() => result.current.suggest(INPUT))
    unmount()
    await act(async () => {
      h.pedidos[0].resolver(SUGESTAO)
    })
    expect(apply).not.toHaveBeenCalled()
  })
})

describe('as frases de cada falha (SIA-18, SIA-20, SIA-22, SIA-23)', () => {
  it.each([
    ['forbidden', 'Você não tem acesso a esta ação.'],
    ['limited', 'Muitas sugestões seguidas. Tente de novo em alguns minutos.'],
    ['bad_request', 'Não consegui montar o pedido de sugestão.'],
    ['off_rules', 'Não consegui uma sugestão dentro das regras da loja. Tente de novo ou escreva à mão.'],
    ['refusal', 'A IA não quis sugerir para esta peça.'],
    ['truncated', 'A sugestão veio incompleta. Tente de novo.'],
    ['upstream', 'A sugestão não veio desta vez. Os campos continuam editáveis.'],
    ['network', 'A sugestão não veio desta vez. Os campos continuam editáveis.'],
  ])('%s ⇒ "%s", campos intocados, botão de volta', async (reason, frase) => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, { kind: 'error', reason })
    expect(result.current.s.message).toBe(frase)
    expect(result.current.par).toEqual({ title: 'Título antigo', description: 'Descrição antiga' })
    expect(result.current.s.status).toBe('idle')
    expect(result.current.s.canUndo).toBe(false)
  })

  it('SIA-20: not_configured ⇒ disabled com a frase, e o próximo toque NÃO chama até desmontar', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, { kind: 'error', reason: 'not_configured' })
    expect(result.current.s.status).toBe('disabled')
    expect(result.current.s.message).toBe('Sugestão por IA não está configurada.')

    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.cancel())
    act(() => result.current.s.reset())
    expect(h.pedidos).toHaveLength(1)
    expect(result.current.s.status).toBe('disabled')
  })

  it('a falha seguinte apaga a frase anterior ao tocar de novo', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, { kind: 'error', reason: 'upstream' })
    act(() => result.current.s.suggest(INPUT))
    expect(result.current.s.message).toBeNull()
  })
})

// ─── Conserto dos bugs do QA da 84 ─────────────────────────────────────────────────────────────

describe('SIA-12 (letra nova): o ponto de volta é o texto de antes da PRIMEIRA sugestão da série', () => {
  const B: SeoSuggestionOutcome = { kind: 'ok', title: 'Sugestão B', description: 'Descrição da sugestão B.' }

  it('sugerir → sugerir → desfazer devolve o texto escrito à mão, não a primeira sugestão', async () => {
    const { result } = montar({ title: 'Meu título escrito', description: 'Minha descrição escrita à mão.' })
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.suggest(INPUT))
    // Em voo o desfazer some (o par dos campos ainda é a sugestão A)…
    expect(result.current.s.canUndo).toBe(false)
    await responder(1, B)
    expect(result.current.par.title).toBe('Sugestão B')
    // …e volta com a resposta, apontando para o texto de ANTES da série.
    expect(result.current.s.canUndo).toBe(true)
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: 'Meu título escrito', description: 'Minha descrição escrita à mão.' })
    expect(result.current.s.canUndo).toBe(false)
  })

  it('três sugestões seguidas: o ponto de volta continua o de antes da primeira', async () => {
    const { result } = montar()
    for (let i = 0; i < 3; i++) {
      act(() => result.current.s.suggest(INPUT))
      await responder(i, i === 1 ? B : SUGESTAO)
    }
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: 'Título antigo', description: 'Descrição antiga' })
  })

  it('uma falha no meio da série não perde o ponto de volta', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.suggest(INPUT))
    await responder(1, { kind: 'error', reason: 'upstream' })
    expect(result.current.s.canUndo).toBe(true)
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: 'Título antigo', description: 'Descrição antiga' })
  })

  it('a edição manual ENCERRA a série: a próxima começa uma nova, com o texto editado como ponto de volta', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => {
      result.current.setPar({ title: 'Ajustei à mão', description: 'Descrição ajustada.' })
      result.current.s.noteManualEdit()
    })
    act(() => result.current.s.suggest(INPUT))
    await responder(1, B)
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: 'Ajustei à mão', description: 'Descrição ajustada.' })
  })

  it('o save (reset) ENCERRA a série: o ponto de volta passa a ser o que foi salvo', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.reset())
    act(() => result.current.s.suggest(INPUT))
    await responder(1, B)
    act(() => result.current.s.undo())
    expect(result.current.par.title).toBe('Anel de resina com coração')
  })

  it('o desfazer ENCERRA a série: sugerir de novo depois volta ao texto desfeito', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.undo())
    act(() => result.current.s.suggest(INPUT))
    await responder(1, B)
    expect(result.current.s.canUndo).toBe(true)
    act(() => result.current.s.undo())
    expect(result.current.par).toEqual({ title: 'Título antigo', description: 'Descrição antiga' })
  })

  it('série que nasceu de campos vazios: nenhuma sugestão seguinte cria desfazer', async () => {
    const { result } = montar({ title: '', description: '' })
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    act(() => result.current.s.suggest(INPUT))
    await responder(1, B)
    expect(result.current.s.canUndo).toBe(false)
  })
})

describe('a frase do sucesso (BUG-…-sugestao-preenchida-sem-aviso-ao-leitor)', () => {
  it('200 ⇒ a frase; some no próximo toque, na edição manual, no desfazer e no save', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, SUGESTAO)
    expect(result.current.s.message).toBe(APLICADA)
    act(() => result.current.s.suggest(INPUT))
    expect(result.current.s.message).toBeNull()
    await responder(1, SUGESTAO)
    act(() => result.current.s.noteManualEdit())
    expect(result.current.s.message).toBeNull()

    act(() => result.current.s.suggest(INPUT))
    await responder(2, SUGESTAO)
    act(() => result.current.s.undo())
    expect(result.current.s.message).toBeNull()

    act(() => result.current.s.suggest(INPUT))
    await responder(3, SUGESTAO)
    act(() => result.current.s.reset())
    expect(result.current.s.message).toBeNull()
  })
})

describe('a frase de falha sai na edição manual e no save (BUG-…-aviso-de-falha-da-sugestao-fica-depois-de-salvar)', () => {
  it.each(['upstream', 'network', 'limited', 'off_rules'])('%s: noteManualEdit apaga a frase', async reason => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, { kind: 'error', reason })
    expect(result.current.s.message).not.toBeNull()
    act(() => result.current.s.noteManualEdit())
    expect(result.current.s.message).toBeNull()
  })

  it.each(['upstream', 'network', 'limited', 'off_rules'])('%s: reset (o save) apaga a frase', async reason => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, { kind: 'error', reason })
    act(() => result.current.s.reset())
    expect(result.current.s.message).toBeNull()
  })

  it('SIA-20: a frase de not_configured é a DICA do botão desligado — fica na edição e no save', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    await responder(0, { kind: 'error', reason: 'not_configured' })
    act(() => result.current.s.noteManualEdit())
    act(() => result.current.s.reset())
    expect(result.current.s.message).toBe('Sugestão por IA não está configurada.')
  })

  it('SIA-25: a frase de "editou no voo" chega DEPOIS da edição e não é apagada por ela', async () => {
    const { result } = montar()
    act(() => result.current.s.suggest(INPUT))
    act(() => result.current.s.noteManualEdit())
    await responder(0, SUGESTAO)
    expect(result.current.s.message).toBe('Você editou o SEO enquanto a sugestão chegava; mantive o seu texto.')
  })
})
