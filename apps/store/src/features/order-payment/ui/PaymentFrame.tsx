// A moldura comum às telas do pagamento — PIX (boards `58 C`…`58 F`) e cartão (`58 L`).
//
// Saiu de `PixSurface` quando o cartão ganhou a tela de aprovado (`58 L`): duas telas de
// "pagamento aprovado", uma por meio, seriam o "defeito 01" no tamanho de uma página — a mesma
// versalete, o mesmo título e o mesmo valor desenhados duas vezes, divergindo sem nada quebrar.
import { Link } from 'react-router-dom'

import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'

import { TAP_ROW } from '@/shared/lib/touchTarget'

const Eyebrow = ({ numero, situacao }: { numero: string; situacao: string }) => (
  <p className="estrelinha-eyebrow text-center text-estrelinha-ink-soft">
    Pedido <span>{formatOrderNumber(numero)}</span> · {situacao}
  </p>
)

/** A moldura comum a todos os estados: é ela que faz a tela ruim não parecer outro site. */
export const Moldura = ({
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
export const Cartao = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 flex w-full flex-col items-center gap-4 rounded-lg bg-estrelinha-ground-deep p-5 md:p-8">
    {children}
  </div>
)

/** O aviso de fundo sereno — informação de estado, nunca alarme. */
export const Aviso = ({ titulo, corpo }: { titulo: string; corpo: string }) => (
  <p className="mt-4 flex w-full items-start gap-2.5 rounded-md bg-estrelinha-serenity px-4 py-3.5 text-[13px] leading-5 text-estrelinha-ink-soft">
    <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-estrelinha-primary" />
    <span>
      <strong className="font-semibold text-estrelinha-ink">{titulo}</strong> {corpo}
    </span>
  </p>
)
