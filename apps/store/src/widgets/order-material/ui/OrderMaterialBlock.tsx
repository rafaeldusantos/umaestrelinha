import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PackageOpen } from 'lucide-react'
import {
  MATERIAL_STATUS_LABELS,
  materialAnchor,
  materialKindLabel,
  toMaterialKinds,
  toMaterialStatus,
  type MaterialKind,
} from '@estrelinha/core/material'
import { MATERIAL_GUIDE_PATH, materialGuideHref } from '@estrelinha/core/routes'
import { materialTrackingMessage, useSetMaterialTracking } from '@/entities/order'
import { TAP_ROW } from '@/shared/lib/touchTarget'

interface Props {
  orderId: string
  materialStatus: string | null | undefined
  trackingCode: string | null | undefined
  /** Os materiais que o pedido exigiu, do snapshot dos itens — nunca de uma releitura do catálogo. */
  kinds: readonly string[]
  /** Pedido cancelado sai da fila: o bloco informa e não oferece ação (edge case da spec). */
  cancelled?: boolean
}

/**
 * O bloco de material em `/pedido/:id` (`MAT-11`).
 *
 * Esta rota é onde ele mora porque é a que **sobrevive ao F5** (lê o pedido do banco) e é a que o
 * e-mail manda. Informar o rastreio é **opcional**: se a cliente não informar, nada trava — a Adri
 * registra pelo painel quando ela avisar pelo WhatsApp, ou marca o recebimento direto. Por isso o
 * texto diz isso em vez de cobrar.
 */
const OrderMaterialBlock = ({
  orderId,
  materialStatus,
  trackingCode,
  kinds,
  cancelled = false,
}: Props) => {
  const status = toMaterialStatus(materialStatus)

  // Pedido sem material não ganha bloco nenhum — nem vazio, nem "não se aplica".
  //
  // A saída acontece **antes de qualquer hook de dados**: o formulário (e o `useMutation` dele) vive
  // no `MaterialTrackingForm`, que só monta quando há material. Chamar a mutação aqui em cima
  // obrigaria toda tela que renderiza esta confirmação a ter um `QueryClientProvider`, mesmo em
  // pedido que não espera material nenhum.
  if (status === 'nao_aplicavel') return null

  const materiais = toMaterialKinds(kinds)
  const jaRecebido = status === 'material_recebido' || status === 'em_producao'

  return (
    <section
      aria-labelledby="material-heading"
      className="rounded-md border border-estrelinha-field bg-estrelinha-ground-deep p-5"
    >
      <h2
        id="material-heading"
        className="flex items-center gap-2 font-display text-[18px] font-semibold text-estrelinha-ink"
      >
        <PackageOpen className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
        Material da sua joia
      </h2>

      <p className="mt-2 text-[14px] leading-[22px] text-estrelinha-ink-soft">
        Situação: <strong className="font-semibold text-estrelinha-ink">{MATERIAL_STATUS_LABELS[status]}</strong>
      </p>

      {materiais.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {materiais.map((kind: MaterialKind) => (
            <li key={kind}>
              <Link
                to={materialGuideHref(materialAnchor(kind))}
                className={`${TAP_ROW} rounded-pill border border-estrelinha-field bg-white px-3 py-1 text-[13px] font-medium leading-5 text-estrelinha-ink transition-colors hover:border-estrelinha-primary`}
              >
                {materialKindLabel(kind)}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {materiais.length === 0 && (
        // "a combinar", nunca lista vazia — lista vazia se lê como "nenhum material".
        <p className="mt-3 text-[14px] leading-[22px] text-estrelinha-ink-soft">
          O material desta joia é combinado com a gente — a gente entra em contato.
        </p>
      )}

      {trackingCode && (
        <p className="mt-3 text-[14px] leading-[22px] text-estrelinha-ink">
          Código registrado:{' '}
          <span className="font-semibold tracking-wide">{trackingCode}</span>
        </p>
      )}

      {cancelled ? (
        <p className="mt-4 text-[14px] leading-[22px] text-estrelinha-ink-soft">
          Este pedido foi cancelado. Se você já enviou o material, fale com a gente — ele volta para
          você.
        </p>
      ) : jaRecebido ? (
        <p className="mt-4 text-[14px] leading-[22px] text-estrelinha-ink-soft">
          Seu material já está com a gente. Não é preciso fazer mais nada por aqui.
        </p>
      ) : (
        <MaterialTrackingForm orderId={orderId} />
      )}
    </section>
  )
}

/**
 * O formulário do código, separado por um motivo estrutural, não estético.
 *
 * É ele que chama `useSetMaterialTracking` (um `useMutation`), e `useMutation` exige um
 * `QueryClientProvider` acima. Mantendo a mutação aqui, ela só é montada quando o pedido de fato
 * espera material — a confirmação de um pedido comum não passa a depender de um provider por causa
 * de um bloco que ela nem renderiza.
 */
const MaterialTrackingForm = ({ orderId }: { orderId: string }) => {
  const [code, setCode] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const salvar = useSetMaterialTracking(orderId)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    try {
      const resultado = await salvar.mutateAsync(code)
      if (!resultado.ok) {
        setErro(materialTrackingMessage(resultado.reason))
        return
      }
      setCode('')
    } catch {
      setErro(materialTrackingMessage(null))
    }
  }

  return (
    <form onSubmit={enviar} className="mt-4">
      <label
        htmlFor="material-tracking"
        className="font-display text-[15px] font-semibold text-estrelinha-ink"
      >
        Já postou? Registre o código de rastreio
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="material-tracking"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="AA123456789BR"
          aria-invalid={erro !== null}
          aria-describedby={erro ? 'material-tracking-erro' : 'material-tracking-hint'}
          /* Borda `field` (3,63:1), nunca `line` — WCAG 1.4.11 pede 3:1 de contorno de controle,
             e `fieldBorder.test.ts` derruba a suíte se isto voltar. */
          className="h-12 flex-1 rounded-sm border border-estrelinha-field bg-white px-3 text-[15px] tracking-wide text-estrelinha-ink placeholder:text-estrelinha-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-estrelinha-primary/40"
        />
        <button
          type="submit"
          disabled={salvar.isPending}
          className="h-12 shrink-0 rounded-sm bg-estrelinha-primary px-6 font-display text-[15px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-50"
        >
          {salvar.isPending ? 'Registrando…' : 'Registrar'}
        </button>
      </div>

      {erro ? (
        <p
          id="material-tracking-erro"
          className="mt-2 text-[13px] leading-[20px] text-estrelinha-primary"
        >
          {erro}
        </p>
      ) : (
        <p
          id="material-tracking-hint"
          className="mt-2 text-[13px] leading-[20px] text-estrelinha-ink-soft"
        >
          É opcional. Se preferir, avise a gente e registramos para você.{' '}
          <Link
            to={MATERIAL_GUIDE_PATH}
            className={`${TAP_ROW} font-semibold text-estrelinha-primary hover:underline`}
          >
            Como enviar o material
          </Link>
        </p>
      )}
    </form>
  )
}

export default OrderMaterialBlock
