// As quatro telas do PIX — boards `58 C` (pronto), `58 D` (confirmado), `58 E` (expirado) e
// `58 F` (falha). Cobre `PIX-P1-03`, `PIX-P2-01`, `PIX-P2-03`, `PIX-P2-04` e `PIX-P2-05`.
//
// Até a feature `58` os quatro estados moravam numa caixa cinza dentro do bloco 3 do acordeão do
// checkout, abaixo da dobra no celular — "gerando" e "falha" cabiam na mesma caixinha, e a de falha
// só era alcançada depois de 15 segundos de silêncio. Aqui cada um tem tela inteira, com a mesma
// linha de base: versalete, título, valor, cartão, aviso e saída. **O que muda entre os quatro é o
// cartão do meio**, e é isso que faz a tela ruim não parecer outro site.
//
// **O tempo é FATO, nunca pressão** (`PIX-P2-05`): ele é do banco, a loja só o lê. Sem vermelho,
// sem piscar, sem vocabulário de urgência — nos últimos 5 minutos ele apenas troca de `ink` para
// `primary`, que é a régua de `CNF-06`. Esta loja é memorial: contagem regressiva que grita é
// exatamente o que o `DESIGN.md` §1 proíbe.
import { QRCodeSVG } from 'qrcode.react'

import {
  useGeneralSettings,
  usePaymentSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import { formatOrderNumber } from '@estrelinha/core/orders'

import type { PixState } from '../model/usePixPayment'
import PaymentApproved from './PaymentApproved'
import { Aviso, Cartao, Moldura } from './PaymentFrame'

/**
 * A partir de quando o tempo troca de cor — `CNF-06`, `PIX-P2-05`.
 *
 * Cinco minutos, e a troca é só de token: de `ink` (12,73:1) para `primary` (8,76:1). Nenhum dos
 * dois é aviso de perigo; o que a troca diz é "já dá para reparar nisto", não "corra".
 */
const ATENCAO_S = 300

/** Número curto demais é número não configurado, não número errado — mesma régua de `PolicyContact`. */
const MIN_DIGITOS_WHATSAPP = 10

export interface PixSurfaceProps {
  /** `generating` não é desenhado aqui — quem o desenha é `PaymentProgress`, e a página escolhe. */
  state: PixState
  /** `CNF-01`: quanto sai da conta dela, em destaque, antes do QR. */
  amount: number
  orderNumber: string
  /**
   * SPEC_DEVIATION: o `design.md` lista as props sem um caminho para o pedido.
   * Reason: `PIX-P2-04` exige "mantendo visível um caminho manual para o pedido", e o componente
   * não recebe o id — derivá-lo aqui seria um segundo dono do endereço `/pedido/:id`. Quem monta o
   * endereço é a página, que já o tem na URL.
   */
  orderHref: string
  /**
   * SPEC_DEVIATION: prop ausente da lista do `design.md`.
   * Reason: o board `58 D` diz para onde o comprovante está indo, e esse endereço é do PEDIDO
   * (`order.customer_email`), não do rascunho do checkout — que nem existe mais quando a rota do
   * pagamento é aberta em outro aparelho. Ausente, a frase simplesmente não é dita: prometer um
   * comprovante sem saber para onde ele vai é pior que não prometer.
   */
  customerEmail?: string
  onGenerate: () => void
  onCopy: () => void
  copied: boolean
}

/** A pílula cheia — **uma por estado** (`DESIGN.md` §8). Ação é retângulo de 6px, nunca pílula. */
const AcaoPrincipal = ({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-estrelinha-primary px-6 font-semibold text-estrelinha-on-primary transition-colors hover:bg-estrelinha-primary-strong"
  >
    {children}
  </button>
)

const mmss = (segundos: number) => {
  const total = Math.max(0, segundos)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const COMO_PAGAR = [
  'Abra o app do seu banco',
  'Escaneie o código ou cole o que você copiou',
  'Confirme — esta tela avança sozinha',
]

const PixSurface = ({
  state,
  amount,
  orderNumber,
  orderHref,
  customerEmail,
  onGenerate,
  onCopy,
  copied,
}: PixSurfaceProps) => {
  const pagamento = usePaymentSettings()
  const { whatsapp, store_name } = useGeneralSettings()

  // Os hooks vêm antes da saída: `generating` é da `PaymentProgress`, e a página é quem escolhe
  // entre as duas. Desenhar a espera aqui daria dois donos de "como é a tela de espera".
  if (state.kind === 'generating') return null

  const desconto = pagamento.pix_discount_percent > 0 ? pagamento.pix_discount_percent : null

  if (state.kind === 'approved') {
    return (
      <PaymentApproved
        method="pix"
        amount={amount}
        orderNumber={orderNumber}
        orderHref={orderHref}
        customerEmail={customerEmail}
      />
    )
  }

  if (state.kind === 'expired') {
    return (
      <Moldura
        numero={orderNumber}
        situacao="Aguardando pagamento"
        titulo="O código expirou"
        lead="Nada foi cobrado e seu pedido continua guardado. É só gerar um código novo — o valor é o mesmo."
        amount={amount}
        nota={desconto ? `o mesmo valor, com os ${desconto}% do PIX` : 'o mesmo valor do pedido'}
        rodape="Se você já pagou e o código expirou depois, não pague de novo: a confirmação pode levar alguns minutos e a gente avisa por e-mail."
        orderHref={orderHref}
      >
        <Cartao>
          <div className="flex h-[200px] w-full max-w-[200px] flex-col items-center justify-center gap-2.5 rounded-md border border-estrelinha-line bg-white text-estrelinha-ink-soft">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
              <circle cx="14" cy="14" r="11.5" stroke="currentColor" strokeWidth="1.6" />
              <path d="M14 8v6.4l4 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span className="text-sm font-semibold text-estrelinha-ink-soft">Código expirado</span>
          </div>
          {/* `PIX-P2-01`: UMA ação. Gerar outro código para o MESMO pedido, sem refazer compra. */}
          <AcaoPrincipal onClick={onGenerate}>Gerar um código novo</AcaoPrincipal>
        </Cartao>
      </Moldura>
    )
  }

  if (state.kind === 'failed') {
    const digitos = (whatsapp ?? '').replace(/\D/g, '')
    const temWhatsApp = digitos.length >= MIN_DIGITOS_WHATSAPP
    const mensagem = `Olá! Não consegui gerar o PIX do pedido ${formatOrderNumber(
      orderNumber,
    )} na ${store_name || 'Uma Estrelinha'}.`

    return (
      <Moldura
        numero={orderNumber}
        situacao="Aguardando pagamento"
        titulo="Não conseguimos gerar o código agora"
        lead="A falha foi do lado do banco, não do seu pedido — ele está guardado e continua valendo."
        amount={amount}
        nota="valor do pedido, ainda não cobrado"
        rodape="Você também pode pagar depois: o pedido fica em Minha conta → Pedidos, com o mesmo valor."
        orderHref={orderHref}
      >
        <Cartao>
          {/*
            `CNF-06`: o erro se distingue por SUPERFÍCIE, não por vermelho. E as duas coisas que a
            pessoa precisa saber vêm antes de qualquer botão — o pedido existe, e nada foi cobrado.
          */}
          <p
            role="alert"
            className="flex w-full items-start gap-2.5 rounded-md border border-estrelinha-line bg-white px-4 py-3.5 text-[13px] leading-5 text-estrelinha-ink-soft"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden
              className="mt-0.5 shrink-0 text-estrelinha-primary"
            >
              <circle cx="9" cy="9" r="7.4" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 5.2v4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="9" cy="12.4" r="1" fill="currentColor" />
            </svg>
            <span>
              {state.message} Seu pedido{' '}
              <span className="font-semibold text-estrelinha-ink">
                {formatOrderNumber(orderNumber)}
              </span>{' '}
              está guardado e nada foi cobrado.
            </span>
          </p>
          <AcaoPrincipal onClick={onGenerate}>Tentar gerar o código de novo</AcaoPrincipal>
          {/*
            O WhatsApp entra AQUI e em nenhum outro estado, porque este é o único em que a loja não
            sabe o que fazer sozinha. E ele tem portão: `wa.me/` sem dígito abre conversa com
            ninguém — mesma régua de `PolicyContact` e do `WhatsAppFloat`.
          */}
          {temWhatsApp ? (
            <a
              href={`https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 w-full items-center justify-center rounded-sm border-2 border-estrelinha-ink px-6 font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep"
            >
              Falar com a gente no WhatsApp
            </a>
          ) : null}
        </Cartao>
      </Moldura>
    )
  }

  const { qrCode, secondsLeft } = state
  const atencao = secondsLeft < ATENCAO_S

  return (
    <Moldura
      numero={orderNumber}
      situacao="Aguardando pagamento"
      titulo="Agora é só o PIX"
      lead="Abra o app do seu banco e escaneie o código. A gente avisa aqui mesmo assim que o pagamento cair."
      amount={amount}
      nota={desconto ? `já com os ${desconto}% de desconto do PIX` : 'a pagar com PIX'}
      rodape="Se o código expirar, seu pedido continua guardado — você gera um novo aqui mesmo ou em Minha conta → Pedidos."
      orderHref={orderHref}
    >
      <Cartao>
        <div className="flex w-full flex-col items-center gap-4 md:flex-row md:items-start md:gap-9">
          {/*
            No celular o selo do tempo fica ACIMA do QR e no computador fica abaixo — `flex-col-
            reverse` com a ordem do DOM em [QR, selo] resolve os dois sem duplicar o selo.
          */}
          <div className="flex shrink-0 flex-col-reverse items-center gap-3 md:flex-col">
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-md border border-estrelinha-line bg-white p-3 md:h-[228px] md:w-[228px]">
              <QRCodeSVG value={qrCode} size={176} aria-label="QR Code PIX" />
            </div>
            <p className="flex items-center gap-2 rounded-pill bg-white px-3.5 py-2 text-[13px] text-estrelinha-ink-soft">
              {/* ÍCONE, não texto: `accent-strong` sobre branco mede 3,85:1 — objeto gráfico. */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden
                className="shrink-0 text-estrelinha-accent-strong"
              >
                <circle cx="8" cy="8" r="6.4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 4.6V8l2.2 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Este código vale por{' '}
              <span
                data-testid="pix-tempo"
                className={`font-bold ${
                  atencao ? 'text-estrelinha-primary' : 'text-estrelinha-ink'
                }`}
              >
                {mmss(secondsLeft)}
              </span>
            </p>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-2.5">
            <p className="text-center text-[13px] font-medium text-estrelinha-ink-soft md:text-left md:text-[15px] md:font-semibold md:text-estrelinha-ink">
              Ou copie o código e cole no app
            </p>
            {/* `readOnly` e não desabilitado: quem não tem área de transferência copia à mão. */}
            <input
              readOnly
              value={qrCode}
              aria-label="Código PIX copia e cola"
              className="h-11 w-full min-w-0 truncate rounded-md border border-estrelinha-field bg-white px-3.5 font-mono text-[12px] text-estrelinha-ink-soft md:h-12"
            />
            <AcaoPrincipal onClick={onCopy}>
              {copied ? 'Código copiado' : 'Copiar código'}
            </AcaoPrincipal>

            {/*
              Os três passos ficam no computador, onde há largura sobrando ao lado do QR. No celular
              o board `58 C` os tira de propósito — a tela tem um assunto só, e ali cada linha a mais
              empurra o botão de copiar para baixo da dobra.
            */}
            <ol className="mt-2.5 hidden flex-col gap-2.5 border-t border-estrelinha-line pt-4 md:flex">
              {COMO_PAGAR.map((passo, i) => (
                <li key={passo} className="flex items-center gap-2.5 text-sm text-estrelinha-ink-soft">
                  <span className="w-[18px] shrink-0 text-[13px] font-bold text-estrelinha-ink-soft">
                    {i + 1}
                  </span>
                  {passo}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </Cartao>

      <Aviso
        titulo="Estamos de olho no seu pagamento"
        corpo="Quando o banco confirmar, esta tela avança sozinha. Pode deixá-la aberta."
      />
    </Moldura>
  )
}

export default PixSurface
