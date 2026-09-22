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
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'

import { formatPrice } from '@estrelinha/core/formatters'
import {
  useGeneralSettings,
  usePaymentSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import { formatOrderNumber } from '@estrelinha/core/orders'

import { TAP_ROW } from '@/shared/lib/touchTarget'

import type { PixState } from '../model/usePixPayment'

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

const Eyebrow = ({ numero, situacao }: { numero: string; situacao: string }) => (
  <p className="estrelinha-eyebrow text-center text-estrelinha-ink-soft">
    Pedido <span>{formatOrderNumber(numero)}</span> · {situacao}
  </p>
)

/** A moldura comum aos quatro estados: é ela que faz a tela ruim não parecer outro site. */
const Moldura = ({
  numero,
  situacao,
  titulo,
  lead,
  amount,
  nota,
  children,
  rodape,
  orderHref,
}: {
  numero: string
  situacao: string
  titulo: string
  lead: string
  amount: number
  nota: string
  children: React.ReactNode
  rodape: string
  orderHref: string
}) => (
  // `min-w-0` na coluna e `w-full` no cartão: nada aqui pode contribuir com min-content maior que
  // a viewport de 390 — é o defeito que a auditoria da `27` mediu na página do produto.
  <div className="mx-auto flex w-full min-w-0 max-w-[680px] flex-col items-center px-6 pb-12 pt-9 md:pt-12">
    <Eyebrow numero={numero} situacao={situacao} />
    <h1 className="mt-3 text-center font-heading text-[30px] font-bold leading-9 tracking-[-0.02em] text-estrelinha-ink md:text-[38px] md:leading-[44px]">
      {titulo}
    </h1>
    <p className="mt-3 max-w-[460px] text-center text-[15px] leading-6 text-estrelinha-ink-soft">
      {lead}
    </p>

    <p className="mt-6 font-heading text-[40px] font-bold leading-[44px] tracking-[-0.03em] text-estrelinha-ink">
      {formatPrice(amount)}
    </p>
    <p className="mt-1 text-center text-sm font-medium text-estrelinha-primary">{nota}</p>

    {children}

    <p className="mt-6 max-w-[460px] text-center text-[13px] leading-5 text-estrelinha-ink-soft">
      {rodape}
    </p>
    {/*
      `PIX-P2-04`: o caminho manual para o pedido fica VISÍVEL nos quatro estados — inclusive no de
      sucesso, onde a navegação automática pode falhar e deixar a pessoa presa numa tela que diz
      que deu certo e não vai a lugar nenhum.

      `TAP_ROW` e não `TAP_44`: é texto em fluxo, e um quadrado de 44 centrado num rótulo de 180px
      deixaria as pontas fora do alvo.
    */}
    <Link
      to={orderHref}
      className={`${TAP_ROW} mt-3.5 text-sm font-semibold text-estrelinha-primary hover:underline`}
    >
      Ver os detalhes do pedido
    </Link>
  </div>
)

/** O cartão que muda entre os estados. Superfície única: `ground-deep`, raio de caixa. */
const Cartao = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 flex w-full flex-col items-center gap-4 rounded-lg bg-estrelinha-ground-deep p-5 md:p-8">
    {children}
  </div>
)

/** O aviso de fundo sereno — informação de estado, nunca alarme. */
const Aviso = ({ titulo, corpo }: { titulo: string; corpo: string }) => (
  <p className="mt-4 flex w-full items-start gap-2.5 rounded-md bg-estrelinha-serenity px-4 py-3.5 text-[13px] leading-5 text-estrelinha-ink-soft">
    <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-estrelinha-primary" />
    <span>
      <strong className="font-semibold text-estrelinha-ink">{titulo}</strong> {corpo}
    </span>
  </p>
)

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
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return (
      <Moldura
        numero={orderNumber}
        situacao="Pagamento confirmado"
        titulo="Pagamento confirmado"
        lead="Seu banco confirmou agora. Não precisa fazer mais nada."
        amount={amount}
        nota="pagos com PIX"
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
            Confirmado às {hora}
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
