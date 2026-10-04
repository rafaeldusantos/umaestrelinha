import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, PackageOpen } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { useGeneralSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { formatOrderNumber } from '@estrelinha/core/orders'
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
import { whatsappHref } from '@/shared/lib/whatsapp'

interface Props {
  orderId: string
  materialStatus: string | null | undefined
  trackingCode: string | null | undefined
  /** Os materiais que o pedido exigiu, do snapshot dos itens — nunca de uma releitura do catálogo. */
  kinds: readonly string[]
  /** Pedido cancelado sai da fila: o bloco informa e não oferece ação (edge case da spec). */
  cancelled?: boolean
  /**
   * Feature 59 (`MAT-01`): `'acao'` é o estado do topo do detalhe, "Envie o seu material" — o
   * primeiro bloco depois do título quando o pedido pago espera o envelope. `'bloco'` (o padrão) é
   * o bloco "Seu material", mais abaixo, para os demais estados.
   */
  variant?: 'bloco' | 'acao'
  /** `orders.order_number`, cru — vai na mensagem do WhatsApp de quem não tem sessão (`MAT-06`). */
  orderNumber?: string
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
  variant = 'bloco',
  orderNumber = '',
}: Props) => {
  const status = toMaterialStatus(materialStatus)
  // `MAT-06`: o campo só funciona com sessão — a RPC `set_material_tracking` é fechada a `anon`
  // (`BL-036`). A convidada que abriu o pedido pelo token vê o caminho do WhatsApp no lugar dele:
  // mostrar um campo que falha é o pior estado.
  const { user } = useAuthContext()

  // Pedido sem material não ganha bloco nenhum — nem vazio, nem "não se aplica".
  //
  // A saída acontece **antes de qualquer hook de dados**: o formulário (e o `useMutation` dele) vive
  // no `MaterialTrackingForm`, que só monta quando há material. Chamar a mutação aqui em cima
  // obrigaria toda tela que renderiza esta confirmação a ter um `QueryClientProvider`, mesmo em
  // pedido que não espera material nenhum.
  if (status === 'nao_aplicavel') return null

  const materiais = toMaterialKinds(kinds)
  const jaRecebido = status === 'material_recebido' || status === 'em_producao'

  if (variant === 'acao') {
    return (
      <section
        id="material"
        aria-labelledby="material-acao-heading"
        className="flex flex-col gap-3 rounded-md border border-l-[3px] border-estrelinha-line border-l-estrelinha-accent bg-estrelinha-surface p-4"
      >
        <h2
          id="material-acao-heading"
          className="font-heading text-lg font-semibold text-estrelinha-ink"
        >
          Envie o seu material
        </h2>
        <p className="text-sm leading-[22px] text-estrelinha-ink-soft">
          Quando postar o envelope, informe o código de rastreio. Assim a gente acompanha a chegada
          dele ao ateliê.
        </p>
        {user ? (
          <MaterialTrackingForm orderId={orderId} copy={COPY_ACAO} />
        ) : (
          <MaterialContactInstead orderNumber={orderNumber} />
        )}
        <Link
          to={MATERIAL_GUIDE_PATH}
          className={`${TAP_ROW} self-start text-sm font-semibold text-estrelinha-primary hover:underline`}
        >
          Como embalar e enviar o material
        </Link>
      </section>
    )
  }

  return (
    <section
      id="material"
      aria-labelledby="material-heading"
      className="rounded-md border border-estrelinha-field bg-estrelinha-ground-deep p-5"
    >
      <h2
        id="material-heading"
        className="flex items-center gap-2 font-display text-[18px] font-semibold text-estrelinha-ink"
      >
        <PackageOpen className="h-[18px] w-[18px] shrink-0 text-estrelinha-primary" aria-hidden />
        {/* `DET-09` (feature 59): "Seu material", como no desenho — o título antigo era "Material da
            sua joia" (feature 22), trocado pelo mesmo critério com que o usuário decidiu o título do
            pedido em 2026-10-04. */}
        Seu material
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
                className={`${TAP_ROW} rounded-pill border border-estrelinha-field bg-white px-3 py-1 text-[13px] font-medium leading-5 text-estrelinha-ink transition-colors hover:border-estrelinha-primary motion-reduce:transition-none`}
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
      ) : user ? (
        <MaterialTrackingForm orderId={orderId} copy={COPY_BLOCO} />
      ) : (
        <div className="mt-4">
          <MaterialContactInstead orderNumber={orderNumber} />
        </div>
      )}
    </section>
  )
}

/** Os textos do formulário em cada lugar onde ele aparece. */
interface FormCopy {
  label: string
  button: string
  /**
   * `MAT-03`: a frase do campo vazio, recusado AQUI, sem chamar a mutação. `null` deixa a recusa
   * com o hook (que também não vai à rede) e com a frase de `materialTrackingMessage`.
   */
  emptyMessage: string | null
  /** Ajuda abaixo do campo; o estado do topo leva o link do guia fora do formulário. */
  hint: boolean
}

/**
 * O bloco "Seu material" (até a feature 59, "Material da sua joia"), com o formulário da feature 22.
 *
 * SPEC_DEVIATION: `MAT-03` pede "Informe o código de rastreio." para o campo vazio, e aqui a frase
 * continua a do hook ("Digite o código de rastreio do seu envio.").
 * Reason: este formulário só aparece fora do estado do topo — a correção do código em
 * `material_enviado`, ou o pedido que ainda não foi pago —, e os casos da feature 22 que o medem
 * (`OrderMaterialBlock.test.tsx`) assertam a frase antiga; o campo do `MAT-01` é o do topo.
 */
const COPY_BLOCO: FormCopy = {
  label: 'Já postou? Registre o código de rastreio',
  button: 'Registrar',
  emptyMessage: null,
  hint: true,
}

/** O estado do topo, "Envie o seu material" (`MAT-01`, `MAT-03`) — literais do Paper. */
const COPY_ACAO: FormCopy = {
  label: 'Código de rastreio do envio',
  button: 'Enviar código',
  emptyMessage: 'Informe o código de rastreio.',
  hint: false,
}

/**
 * `MAT-06`: no lugar do campo, para quem não tem sessão — o WhatsApp da loja, com o número do
 * pedido na mensagem. Sem número configurado, fica só a frase (mesma régua de `PolicyContact`).
 *
 * Componente próprio pelo mesmo motivo do formulário: é ele que lê `store_settings` (um
 * `useQuery`), e só monta quando a convidada de fato precisa do caminho.
 */
const MaterialContactInstead = ({ orderNumber }: { orderNumber: string }) => {
  const { whatsapp } = useGeneralSettings()
  const numero = formatOrderNumber(orderNumber)
  const href = whatsappHref(
    whatsapp,
    numero
      ? `Olá! Quero informar o código de envio do material do pedido ${numero}.`
      : 'Olá! Quero informar o código de envio do meu material.',
  )

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm leading-[22px] text-estrelinha-ink">
        Para informar o código, fale com a gente
      </p>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center justify-center gap-2 self-start rounded-sm border border-estrelinha-field px-5 py-2.5 text-[15px] font-semibold text-estrelinha-ink transition-colors hover:bg-estrelinha-ground-deep motion-reduce:transition-none"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          Conversar no WhatsApp
        </a>
      )}
    </div>
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
const MaterialTrackingForm = ({ orderId, copy }: { orderId: string; copy: FormCopy }) => {
  const [code, setCode] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const salvar = useSetMaterialTracking(orderId)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    // `MAT-03`: vazio ou só espaço não chega nem à mutação.
    if (copy.emptyMessage && code.trim() === '') {
      setErro(copy.emptyMessage)
      return
    }
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
        {copy.label}
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="material-tracking"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="AA123456789BR"
          aria-invalid={erro !== null}
          aria-describedby={erro ? 'material-tracking-erro' : copy.hint ? 'material-tracking-hint' : undefined}
          /* Borda `field` (3,63:1), nunca `line` — WCAG 1.4.11 pede 3:1 de contorno de controle,
             e `fieldBorder.test.ts` derruba a suíte se isto voltar. */
          className="h-12 shrink-0 rounded-sm border border-estrelinha-field sm:flex-1 bg-white px-3 text-[15px] tracking-wide text-estrelinha-ink placeholder:text-estrelinha-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-estrelinha-primary/40"
        />
        <button
          type="submit"
          disabled={salvar.isPending}
          className="h-12 shrink-0 rounded-sm bg-estrelinha-primary px-6 font-display text-[15px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-50 motion-reduce:transition-none"
        >
          {salvar.isPending ? 'Registrando…' : copy.button}
        </button>
      </div>

      {erro ? (
        <p
          id="material-tracking-erro"
          className="mt-2 text-[13px] leading-[20px] text-estrelinha-primary"
        >
          {erro}
        </p>
      ) : copy.hint ? (
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
      ) : null}
    </form>
  )
}

export default OrderMaterialBlock
