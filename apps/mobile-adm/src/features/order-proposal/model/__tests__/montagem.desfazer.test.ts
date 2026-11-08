// O "Desfazer" da leitura de um texto colado volta o passo 1 ao estado de antes da leitura — e só o
// passo 1: as peças acrescentadas depois da leitura ficam.
import { describe, expect, it } from 'vitest'

import { montagemVazia, reduzirMontagem, type LeituraRecebida } from '../montagem'
import type { LinhaDaSacola } from '../sacola'

const LIDA: LeituraRecebida = {
  escopo: 'contact_and_address',
  contato: { name: 'Ana Souza', email: '', phone: '(51) 99999-8888', cpf: '' },
  endereco: { cep: '', street: '', number: '120', complement: '', neighborhood: '', city: '', state: '' },
  conferidos: [],
}

describe('desfazer a leitura', () => {
  it('volta os campos do passo 1 ao estado de antes, e as peças acrescentadas depois da leitura ficam', () => {
    const antes = reduzirMontagem(montagemVazia(), { tipo: 'modo', modo: 'nova' })
    const lida = reduzirMontagem(antes, { tipo: 'leitura', lida: LIDA })
    expect(lida.contato.nome).toBe('Ana Souza')
    const linha: LinhaDaSacola = { chave: 'l1', pecaId: 'p1', variacaoId: null, quantidade: 3, gravacao: '', nome: 'Pingente', rotulo: null, foto: null, preco: 100, pedeMaterial: false }
    const comPecas = { ...lida, pecas: [linha] }
    const desfeita = reduzirMontagem(comPecas, { tipo: 'desfazer-leitura' })
    expect(desfeita.contato.nome).toBe('')
    expect(desfeita.endereco.numero).toBe('')
    expect(desfeita.leitura).toBeNull()
    expect(desfeita.marcas).toEqual([])
    expect(desfeita.pecas).toEqual([linha])
  })
})
