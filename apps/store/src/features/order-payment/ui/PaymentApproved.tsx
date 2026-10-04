// A batida do pagamento aprovado — board `58 D` (PIX) e `58 L` (cartão).
//
// **Uma tela só para os dois meios.** O que muda entre eles é vocabulário — o PIX é "confirmado"
// pelo banco depois que a pessoa paga no app; o cartão é "aprovado" na hora — e a linha sob o valor,
// que no cartão diz em quantas parcelas. O desenho é o mesmo de propósito: duas telas de sucesso,
// uma por meio, divergiriam sem nada quebrar.
//
// Quem decide QUANDO ela sai é a página (`BATIDA_MS`): esta tela não navega. O link manual para o
// pedido fica visível (`PIX-P2-04`) porque, se a navegação falhar, a pessoa não pode ficar presa
// numa tela que diz que deu certo e não vai a lugar nenhum.
import { approvedNote } from '../model/approvedNote'
import { Aviso, Cartao, Moldura } from './PaymentFrame'

export interface PaymentApprovedProps {
  method: 'pix' | 'card'
  amount: number
  orderNumber: string
  orderHref: string
  /** Para onde vai o comprovante. Ausente, a frase não é dita — ver `PixSurfaceProps`. */
  customerEmail?: string
  /** Cartão: as parcelas cobradas. `count` 1 (ou ausente) é à vista e não é anunciado. */
  installments?: { count: number; value: number } | null
}

const COPY = {
  pix: {
    situacao: 'Pagamento confirmado',
    titulo: 'Pagamento confirmado',
    lead: 'Seu banco confirmou agora. Não precisa fazer mais nada.',
    hora: 'Confirmado às',
  },
  card: {
    situacao: 'Pagamento aprovado',
    titulo: 'Pagamento aprovado',
    lead: 'O banco aprovou seu cartão. Não precisa fazer mais nada.',
    hora: 'Aprovado às',
  },
} as const

const PaymentApproved = ({
  method,
  amount,
  orderNumber,
  orderHref,
  customerEmail,
  installments,
}: PaymentApprovedProps) => {
  const copy = COPY[method]
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <Moldura
      numero={orderNumber}
      situacao={copy.situacao}
      titulo={copy.titulo}
      lead={copy.lead}
      amount={amount}
      nota={approvedNote(method, installments)}
      rodape="Seu pedido também fica guardado em Minha conta → Pedidos, com o comprovante."
      orderHref={orderHref}
    >
      <Cartao>
        {/* Tique de tinta sobre disco de ouro: `ink` sobre `accent` mede 4,78:1 — o único par em
            que o acento carrega texto nesta identidade. */}
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-estrelinha-accent text-estrelinha-ink">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
            <path
              d="M8.8 14.3 12.3 17.8 19.3 10.8"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-center font-heading text-[20px] font-bold text-estrelinha-ink">
          {copy.hora} {hora}
        </p>
        {customerEmail ? (
          <p className="max-w-[300px] text-center text-sm leading-[22px] text-estrelinha-ink-soft">
            O comprovante está indo para{' '}
            <strong className="font-semibold text-estrelinha-ink">{customerEmail}</strong>.
            Abrindo os detalhes do seu pedido…
          </p>
        ) : (
          <p className="max-w-[300px] text-center text-sm leading-[22px] text-estrelinha-ink-soft">
            Abrindo os detalhes do seu pedido…
          </p>
        )}
      </Cartao>
      <Aviso
        titulo="Abrindo os detalhes do pedido"
        corpo="Se a tela não avançar em alguns segundos, toque em “Ver os detalhes do pedido”."
      />
    </Moldura>
  )
}

export default PaymentApproved
