// A tabela de parcelas do Mercado Pago para o cartão que a cliente digitou.
//
// É a MESMA chamada que o Brick faria por dentro (`getInstallments`, core method do SDK, com a
// chave pública já iniciada em `main.tsx`). A loja passou a fazê-la por conta própria porque a
// lista do Brick não deixa destacar as parcelas sem juros: o Brick monta com `maxInstallments: 1`
// (sem lista nenhuma) e quem desenha a escolha é `InstallmentPicker`.
//
// Quem diz se uma parcela tem juros é esta resposta (`installment_rate`), e é ela que a cobrança
// segue — ver `cardInstallmentOptions` em `@estrelinha/core/payment/installments`.
import { useQuery } from '@tanstack/react-query'
import { getInstallments } from '@mercadopago/sdk-react'
import type { PayerCostLike } from '@estrelinha/core/payment/installments'

export const CARD_INSTALLMENTS_KEY = 'mp-card-installments'

/** O BIN de 6 dígitos basta para a tabela; os de 8 só mudam o emissor, não a tabela da conta. */
const tableBin = (bin: string) => bin.slice(0, 8)

export function useCardInstallments(amount: number, bin: string | null) {
  return useQuery<PayerCostLike[]>({
    queryKey: [CARD_INSTALLMENTS_KEY, amount, bin ? tableBin(bin) : null],
    enabled: !!bin && amount > 0,
    // A tabela de uma conta muda quando a dona mexe no painel do Mercado Pago — não a cada tecla.
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const result = await getInstallments({
        amount: amount.toFixed(2),
        bin: tableBin(bin as string),
        paymentTypeId: 'credit_card',
      })
      return (result?.[0]?.payer_costs ?? []) as PayerCostLike[]
    },
  })
}
