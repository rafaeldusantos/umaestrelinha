// Feature 67 (T06) — as marcações por opção no formulário: renomear leva junto, remover apaga, e o
// diff grava só o que mudou (`VFL-03`, `VFL-05`, `VFL-06`).

import { describe, expect, it } from 'vitest'
import type { OptionMark } from '@estrelinha/core/filters'
import { diffOptionMarks, marcacoesVigentes, pruneRemovedOptions, remapOnAxisRename } from '../optionMarks'

const eixo = (name: string, values: string[], position: number) => ({ name, values, position })
const m = (option_name: string, option_value: string, value_id: string): OptionMark => ({
  option_name,
  option_value,
  value_id,
})

describe('remapOnAxisRename — VFL-05', () => {
  it('o eixo renomeado na mesma posição leva as marcações; os outros eixos ficam', () => {
    const antes = [eixo('Tpos de elo', ['Chaveiro'], 0), eixo('Cor', ['Prata 925'], 1)]
    const depois = [eixo('Tipo de elo', ['Chaveiro'], 0), eixo('Cor', ['Prata 925'], 1)]
    expect(remapOnAxisRename(antes, depois, [m('Tpos de elo', 'Chaveiro', 'chav'), m('Cor', 'Prata 925', 'prata')])).toEqual([
      m('Tipo de elo', 'Chaveiro', 'chav'),
      m('Cor', 'Prata 925', 'prata'),
    ])
  })

  it('REORDENAR dois eixos não é renomear (os dois nomes continuam existindo)', () => {
    const antes = [eixo('Cor', ['Prata'], 0), eixo('Letra', ['A'], 1)]
    const depois = [eixo('Letra', ['A'], 0), eixo('Cor', ['Prata'], 1)]
    const marcas = [m('Cor', 'Prata', 'prata')]
    expect(remapOnAxisRename(antes, depois, marcas)).toEqual(marcas)
  })

  it('o nome novo já existia antes (troca de lugar com outro eixo): não remapeia', () => {
    const antes = [eixo('Cor', ['Prata'], 0), eixo('Acabamento', ['Prata'], 1)]
    const depois = [eixo('Acabamento', ['Prata'], 0)]
    expect(remapOnAxisRename(antes, depois, [m('Cor', 'Prata', 'v')])).toEqual([m('Cor', 'Prata', 'v')])
  })

  it('sem eixos salvos (produto novo), nada muda', () => {
    expect(remapOnAxisRename([], [eixo('Cor', ['A'], 0)], [m('Cor', 'A', 'v')])).toEqual([m('Cor', 'A', 'v')])
  })
})

describe('pruneRemovedOptions — VFL-06', () => {
  it('remover um texto apaga as marcações dele; remover o eixo apaga todas as do eixo', () => {
    const opcoes = [eixo('Cor', ['Prata 925'], 0)]
    expect(
      pruneRemovedOptions(opcoes, [m('Cor', 'Prata 925', 'a'), m('Cor', 'Folheado a Ouro', 'b'), m('Elo', 'Chaveiro', 'c')]),
    ).toEqual([m('Cor', 'Prata 925', 'a')])
  })

  it('o mesmo texto em dois eixos são opções distintas (só a do eixo que existe fica)', () => {
    const opcoes = [eixo('Cor', ['Prata 925'], 0)]
    expect(pruneRemovedOptions(opcoes, [m('Cor', 'Prata 925', 'a'), m('Elo', 'Prata 925', 'a')])).toEqual([
      m('Cor', 'Prata 925', 'a'),
    ])
  })
})

describe('marcacoesVigentes — a composição que a tela e o save leem', () => {
  it('renomeia, poda e desduplica, e é idempotente sobre a própria saída', () => {
    const salvos = [eixo('Cor', ['Prata', 'Ouro'], 0)]
    const atuais = [eixo('Acabamento', ['Prata'], 0)]
    const marcas = [m('Cor', 'Prata', 'v'), m('Cor', 'Ouro', 'v'), m('Cor', 'Prata', 'v')]
    const uma = marcacoesVigentes(salvos, atuais, marcas)
    expect(uma).toEqual([m('Acabamento', 'Prata', 'v')])
    expect(marcacoesVigentes(salvos, atuais, uma)).toEqual(uma)
  })
})

describe('diffOptionMarks — o plano do save', () => {
  it('insere só as novas e apaga só as que saíram, uma remoção por opção', () => {
    const salvas = [m('Cor', 'Prata', 'a'), m('Cor', 'Prata', 'b'), m('Cor', 'Ouro', 'a'), m('Elo', 'X', 'c')]
    const proximas = [m('Cor', 'Prata', 'a'), m('Elo', 'X', 'c'), m('Elo', 'Y', 'c'), m('Elo', 'Y', 'c')]
    expect(diffOptionMarks(salvas, proximas)).toEqual({
      toInsert: [m('Elo', 'Y', 'c')],
      toDelete: [
        { option_name: 'Cor', option_value: 'Prata', value_ids: ['b'] },
        { option_name: 'Cor', option_value: 'Ouro', value_ids: ['a'] },
      ],
    })
  })

  it('sem mudança, plano vazio', () => {
    const x = [m('Cor', 'Prata', 'a')]
    expect(diffOptionMarks(x, x)).toEqual({ toInsert: [], toDelete: [] })
  })

  it('renomear o eixo vira apagar o nome velho e gravar o novo (o diff vê a projeção)', () => {
    const salvas = [m('Tpos de elo', 'Chaveiro', 'chav')]
    const proximas = marcacoesVigentes([eixo('Tpos de elo', ['Chaveiro'], 0)], [eixo('Tipo de elo', ['Chaveiro'], 0)], salvas)
    expect(diffOptionMarks(salvas, proximas)).toEqual({
      toInsert: [m('Tipo de elo', 'Chaveiro', 'chav')],
      toDelete: [{ option_name: 'Tpos de elo', option_value: 'Chaveiro', value_ids: ['chav'] }],
    })
  })
})
