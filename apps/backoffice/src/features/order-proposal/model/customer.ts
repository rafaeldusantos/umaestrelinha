// O que a escolha de uma cliente da busca grava no rascunho (feature 89, `MON-02`). Puro, fora do
// componente: o telefone e o CPF entram com a máscara da tela, e o `fichaId` é o de `customers` (nulo
// para a convidada).

import { maskCpf, maskPhone } from '@estrelinha/core/validators'
import type { ClienteEncontrada } from '@/entities/customer'
import type { DraftCustomer } from './draft'

/** O que a escolha de uma cliente da busca grava no rascunho. */
export const clienteParaRascunho = (c: ClienteEncontrada): Partial<DraftCustomer> => ({
  mode: 'existente',
  fichaId: c.fichaId,
  name: c.name,
  email: c.email,
  phone: c.phone ? maskPhone(c.phone) : '',
  document: c.cpf ? maskCpf(c.cpf) : '',
})
