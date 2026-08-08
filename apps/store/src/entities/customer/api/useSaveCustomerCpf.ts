// Persiste o documento do pagador em `customers` ANTES do `create-payment` (PGD-03, PGD-06).
//
// DOC-04: o documento é CPF **ou** CNPJ, e a coluna guarda só os dígitos — 11 ou 14. `customers.cpf`
// é TEXT sem constraint (migration `20260414121021…:64`), então os 14 dígitos cabem sem migration.
// O nome da coluna (e o do hook) não muda: renomear atravessaria o rascunho, o `sessionStorage` e
// o servidor sem ganho funcional nenhum.
//
// ⚠️ `.update()` no Supabase **não lança quando a RLS nega** — devolve 0 linhas sem `error`.
// É exatamente o defeito vivo de `packages/auth/src/AuthContext.tsx:160-164`, que "atualiza"
// `customers.name` em silêncio. Por isso este hook usa `.select()` e falha explicitamente
// quando nenhuma linha voltou: sem CPF no banco, o servidor montaria o PIX sem pagador.
//
// Falha aqui **bloqueia** a compra (design.md → Error Handling): seguir para o `create-payment`
// emitiria um pagamento sem `payer.identification`.
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { isValidDocument, stripDocument } from '@estrelinha/core/validators'

export const INVALID_CPF_MESSAGE = 'CPF ou CNPJ inválido'
export const CPF_SAVE_FAILED_MESSAGE = 'Não conseguimos salvar seus dados. Tente novamente.'

export interface SaveCustomerCpfInput {
  customerId: string
  cpf: string
}

export function useSaveCustomerCpf() {
  return useMutation<string, Error, SaveCustomerCpfInput>({
    mutationFn: async ({ customerId, cpf }) => {
      const digits = stripDocument(cpf)
      // Guarda antes da chamada: documento inválido nunca chega ao banco (PGD-02, DOC-02).
      if (!isValidDocument(digits)) throw new Error(INVALID_CPF_MESSAGE)

      const { data, error } = await supabase
        .from('customers')
        .update({ cpf: digits })
        .eq('id', customerId)
        .select()

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) throw new Error(CPF_SAVE_FAILED_MESSAGE)

      return digits
    },
  })
}
