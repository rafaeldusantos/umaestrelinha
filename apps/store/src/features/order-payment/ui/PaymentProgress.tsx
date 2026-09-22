// Os dois passos nomeados da espera — `PIX-P1-01`, `PIX-P1-07` (boards `58 A` e `58 B`).
//
// **Um componente para as DUAS telas**, e é isso que faz a espera ler como um caminho só: o
// checkout o monta enquanto cria o pedido, e a rota do pagamento o monta enquanto pede o código.
// Header, versalete, título e valor ficam na mesma linha de base nos dois momentos — o que muda é
// qual passo está em curso, não o layout. Dois desenhos, um por página, produziriam uma troca de
// tela no meio da espera exatamente onde a pessoa está mais insegura.
//
// Os dois consumidores são PÁGINAS (`CheckoutPage` e `OrderPaymentPage`), nunca uma feature
// importando a outra (`AD-033`).
//
// **Nenhum passo avança por tempo decorrido** (`PIX-P1-01`): quem decide é `step`, e `step` só muda
// quando a resposta correspondente chega. Por isso aqui não existe barra de progresso — uma barra
// precisa de uma fração, e a fração teria de ser inventada.
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'

/** Qual das duas esperas está em curso. Literal de string, nunca booleano (`strictNullChecks`). */
export type PaymentStep = 'order' | 'code'

export interface PaymentProgressProps {
  step: PaymentStep
  /** `CNF-01`: quanto sai da conta dela, dito antes e depois de o código existir. */
  amount: number
  /**
   * O número do pedido, quando ele já existe.
   *
   * Ausente no passo 1 **por construção** — no instante em que a loja registra o pedido, ele ainda
   * não tem número. É a presença dele que responde "perdi minha compra?" no passo 2.
   */
  orderNumber?: string
  /** `PIX-P1-07`: a espera passou de 8s. É estado, e ele ACRESCENTA — não substitui os passos. */
  slow?: boolean
}

const COPY = {
  order: {
    eyebrow: 'Passo 1 de 2',
    title: 'Estamos registrando seu pedido',
    lead: 'Costuma levar alguns segundos. Não feche esta página — a gente avisa aqui mesmo quando terminar.',
    footnote: 'Nada foi cobrado ainda. A cobrança acontece quando você paga no app do seu banco.',
  },
  code: {
    eyebrow: 'Passo 2 de 2',
    title: 'Gerando seu código PIX',
    lead: 'Estamos pedindo o código ao seu banco. Não feche esta página — ela avança sozinha.',
    footnote:
      'Seu pedido já está guardado. Nada foi cobrado ainda — a cobrança acontece quando você paga no app do banco.',
  },
} as const

const PASSO_1 = 'Registrando seu pedido'
const PASSO_1_FEITO = 'Pedido registrado'
const PASSO_2 = 'Gerando o código PIX com o banco'

/**
 * O anel de progresso.
 *
 * `accent-strong` e não `accent`: sobre `ground` (#FAF8F4) o ouro claro mede 2,66:1 e reprova até
 * os 3:1 que a WCAG 1.4.11 pede para objeto gráfico; `accent-strong` mede 3,55:1 sobre `ground` e
 * 3,17:1 sobre `ground-deep`, que são as duas superfícies onde ele aparece. O board pinta os dois
 * com o mesmo token; a paleta não deixa — mesma leitura de `MobileMenu` na feature 39.
 */
const Anel = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden
    className={`animate-spin text-estrelinha-accent-strong ${className ?? ''}`}
  >
    <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
    <path
      d="M12 1.5A10.5 10.5 0 0 1 22.5 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

/** O selo do passo concluído: tique de tinta sobre disco de ouro — `ink` sobre `accent`, 4,78:1. */
const Feito = () => (
  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-estrelinha-accent text-estrelinha-ink">
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6.2 4.9 8.6 9.5 4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </span>
)

/** O passo que ainda não começou: contorno vazio, sem movimento e sem promessa de quando. */
const Pendente = () => (
  <span className="h-4 w-4 shrink-0 rounded-full border-2 border-estrelinha-line" />
)

const Passo = ({
  marca,
  rotulo,
  ativo,
}: {
  marca: React.ReactNode
  rotulo: string
  ativo: boolean
}) => (
  <li className="flex items-center gap-3">
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">{marca}</span>
    <span
      className={`text-[15px] leading-[18px] ${
        ativo ? 'font-semibold text-estrelinha-ink' : 'text-estrelinha-ink-soft'
      }`}
    >
      {rotulo}
    </span>
  </li>
)

const PaymentProgress = ({ step, amount, orderNumber, slow }: PaymentProgressProps) => {
  const copy = COPY[step]
  const registrando = step === 'order'

  return (
    // `min-w-0` e largura máxima no PRÓPRIO bloco: a coluna é centrada e o card interno usa
    // `w-full`, então nada aqui pode contribuir com min-content maior que a viewport de 390.
    <div className="mx-auto flex w-full min-w-0 max-w-[680px] flex-col items-center px-6 pb-12 pt-10 md:pt-14">
      <Anel size={64} />

      <p className="estrelinha-eyebrow mt-[18px] text-center text-estrelinha-ink-soft">
        {copy.eyebrow}
      </p>
      <h1 className="mt-[10px] text-center font-heading text-[26px] font-bold leading-[32px] tracking-[-0.02em] text-estrelinha-ink md:text-[34px] md:leading-[40px]">
        {copy.title}
      </h1>
      <p className="mt-[10px] max-w-[440px] text-center text-[15px] leading-6 text-estrelinha-ink-soft">
        {copy.lead}
      </p>

      <ol className="mt-8 w-full rounded-lg bg-estrelinha-ground-deep p-5">
        <Passo
          marca={registrando ? <Anel size={20} /> : <Feito />}
          rotulo={registrando ? PASSO_1 : PASSO_1_FEITO}
          ativo={registrando}
        />
        {/* O fio entre os dois passos: é ele que diz que são etapas de um caminho, e não dois
            avisos soltos. Decorativo, então fora da árvore de acessibilidade. */}
        <li aria-hidden className="flex h-5 items-center">
          <span className="flex h-5 w-6 shrink-0 items-center justify-center">
            <span className="h-5 w-[2px] bg-estrelinha-line" />
          </span>
        </li>
        <Passo
          marca={registrando ? <Pendente /> : <Anel size={20} />}
          rotulo={PASSO_2}
          ativo={!registrando}
        />

        {orderNumber ? (
          <li className="mt-[18px] flex flex-wrap items-center gap-2 border-t border-estrelinha-line pt-4 text-[13px] text-estrelinha-ink-soft">
            <span>Pedido</span>
            <span className="font-semibold text-estrelinha-ink">
              {formatOrderNumber(orderNumber)}
            </span>
            <span>· guardado em Minha conta</span>
          </li>
        ) : null}
      </ol>

      {slow ? (
        // `PIX-P1-07`: a linha ACRESCENTA. Os dois passos continuam onde estavam, e o que ela diz é
        // o que a pessoa precisa para não recarregar a página: o pedido já está guardado.
        <p className="mt-4 flex w-full items-start gap-2.5 rounded-md bg-estrelinha-serenity px-4 py-3.5 text-[13px] leading-5 text-estrelinha-ink-soft">
          <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-estrelinha-primary" />
          <span>
            <strong className="font-semibold text-estrelinha-ink">
              A espera está mais longa que o normal.
            </strong>{' '}
            Seu pedido já está guardado — pode deixar esta página aberta.
          </span>
        </p>
      ) : null}

      <p className="mt-7 flex flex-wrap items-baseline justify-center gap-2 text-sm text-estrelinha-ink-soft">
        Valor do pedido
        <span className="font-heading text-[19px] font-bold text-estrelinha-ink">
          {formatPrice(amount)}
        </span>
        <span className="font-medium">· PIX</span>
      </p>
      <p className="mt-3.5 max-w-[420px] text-center text-[13px] leading-5 text-estrelinha-ink-soft">
        {copy.footnote}
      </p>
    </div>
  )
}

export default PaymentProgress
