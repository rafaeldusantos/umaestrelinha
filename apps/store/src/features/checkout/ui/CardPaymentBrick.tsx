import { useCallback, useMemo, useEffect } from 'react'
import { CardPayment } from '@mercadopago/sdk-react'
import { documentLabel, stripDocument } from '@estrelinha/core/validators'
import { useCheckoutStore } from '../model/checkoutStore'
import { useCardInstallmentOptions } from '../model/useCardInstallmentOptions'
import InstallmentPicker from './InstallmentPicker'

/**
 * BUG-20261004-brick-recriado-a-cada-render: **toda prop do `CardPayment` precisa de identidade
 * estável.** O `useEffect` do SDK (`@mercadopago/sdk-react` 1.0.7) depende de `initialization`,
 * `customization`, `onBinChange`, `onReady`, `onError` e `onSubmit`, e na limpeza desmonta o
 * Brick — um objeto literal ou uma função inline no JSX recriava o formulário VAZIO a cada
 * renderização da página. Era o que apagava o cartão ao digitar o número e ao clicar em "Pagar".
 * `CardPaymentBrick.test.tsx` mede a identidade com `toBe`.
 */
// `hidePaymentButton` desabilita o `onSubmit`, mas a tipagem do SDK ainda o exige.
const SEM_SUBMIT = async () => {}

/**
 * A cor de foco e seleção do formulário — o `primary` da marca, lido do dono da paleta.
 *
 * BUG-20261004-brick-com-cor-da-loja-anterior: aqui estava `#B0176B` escrito à mão, o magenta da
 * loja anterior. O Brick não lê classe nem token CSS, só uma string de cor, então ela é lida de
 * `--estrelinha-primary` (`App.css`, guardado por `palette.test.ts`) — escrever o hex de novo aqui
 * seria a segunda cópia que já divergiu uma vez. Sem a folha carregada (fora do navegador), o Brick
 * recebe `undefined` e usa a cor padrão dele, nunca uma cor inventada.
 */
const corDaMarca = (): string | undefined =>
  getComputedStyle(document.documentElement).getPropertyValue('--estrelinha-primary').trim() ||
  undefined

interface Props {
  amount: number
  /**
   * PGM-05: "Brick will hide email field if this value is correctly filled" (doc do SDK). É este
   * o mecanismo — não há customização de "esconder e-mail". O valor vem do bloco Contato, onde a
   * cliente já digitou o e-mail uma vez.
   */
  payerEmail: string
  /** Prefill do documento do Brick, quando já conhecido de `customers.cpf`. Não o esconde. */
  payerDocument?: string
  /** PGM-06: erro da última tentativa. Quem tenta é o CTA da página — este componente só desenha. */
  errorMessage: string | null
}

/**
 * Superfície do CardPayment Brick do Mercado Pago (PAY-01: tokenização no browser, zero inputs
 * próprios de PAN/CVV/validade). As parcelas são escolhidas em `InstallmentPicker`, pela tabela do
 * Mercado Pago, até 10x e com a parcela mínima das settings (PAY-15).
 *
 * Ele **não orquestra mais o pagamento**: com `hidePaymentButton` o `onSubmit` fica desabilitado
 * e a submissão inteira passa pelo CTA único da página, via `getCardFormData()` (PGM-05, PGM-06).
 * Recusa mantém a cliente aqui, com mensagem amigável vinda por prop (PAY-02).
 */
const CardPaymentBrick = ({ amount, payerEmail, payerDocument, errorMessage }: Props) => {
  const setCardNumberRecognized = useCheckoutStore((s) => s.setCardNumberRecognized)
  const setCardBin = useCheckoutStore((s) => s.setCardBin)
  const installments = useCardInstallmentOptions(amount)

  useEffect(
    () => () => {
      // PGM-09: trocar de método (ou sair do bloco) libera o container do Brick.
      window.cardPaymentBrickController?.unmount()
      // E o número digitado vai junto: voltar ao cartão remonta o Brick vazio, e um `true` velho
      // habilitaria "Pagar" com o formulário em branco.
      setCardNumberRecognized(false)
    },
    [setCardNumberRecognized],
  )

  // O único sinal que o Brick dá enquanto a pessoa digita: o BIN do cartão. Ele reconhece o
  // número (`CardFormSignal`) e é a chave da tabela de parcelas. Validade, CVV, nome e documento
  // seguem validados no clique (PGM-06) — o SDK não tem evento de validade do formulário.
  // `useCallback`: ver o topo do arquivo.
  const onBinChange = useCallback((bin: string) => setCardBin(bin), [setCardBin])

  // Sem dependência nenhuma: um objeto novo a cada render recriava o Brick vazio.
  const customization = useMemo(
    () => ({
      // `maxInstallments: 1` esconde a lista de parcelas do Brick (medido em navegador: com uma
      // opção só ele não desenha a seção). Quem desenha a escolha é `InstallmentPicker`, e o número
      // escolhido substitui o `installments` que `getFormData()` devolve — o token do cartão não
      // depende das parcelas.
      paymentMethods: { maxInstallments: 1 },
      visual: {
        // PGM-05: sem botão próprio (o CTA da página é o único) e sem o título duplicado — o
        // bloco 3 já se chama "Pagamento".
        hidePaymentButton: true,
        hideFormTitle: true,
        style: {
          customVariables: {
            baseColor: corDaMarca(),
            // O bloco já tem o respiro dele (`p-4`): o recuo padrão do Brick (~32px) somava ao do
            // bloco e espremia os campos a ~280px numa tela de 390.
            formPadding: '0px',
          },
        },
      },
    }),
    [],
  )

  // Objeto novo a cada render remontaria o Brick e apagaria o cartão já digitado.
  const initialization = useMemo(() => {
    const digits = stripDocument(payerDocument ?? '')
    return {
      amount,
      payer: {
        email: payerEmail,
        ...(digits
          ? { identification: { type: documentLabel(digits), number: digits } }
          : {}),
      },
    }
  }, [amount, payerEmail, payerDocument])

  // `initialization` novo recria o Brick (o valor muda com cupom, frete ou order bump) e o cartão
  // digitado se perde. O sinal precisa cair junto, senão "Pagar" ficaria habilitado sobre um
  // formulário que acabou de ser esvaziado.
  useEffect(() => {
    setCardNumberRecognized(false)
  }, [initialization, setCardNumberRecognized])

  return (
    <div className="flex flex-col gap-5">
      <CardPayment
        initialization={initialization}
        customization={customization}
        onBinChange={onBinChange}
        onSubmit={SEM_SUBMIT}
      />
      <InstallmentPicker state={installments} />
      {/* CNF-06: recusa se distingue por superfície + geleia, não por vermelho fora da paleta. */}
      {errorMessage && (
        <p
          role="alert"
          className="text-sm text-estrelinha-primary bg-estrelinha-ground-deep border border-estrelinha-primary/30 rounded-xl p-3"
        >
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export default CardPaymentBrick
