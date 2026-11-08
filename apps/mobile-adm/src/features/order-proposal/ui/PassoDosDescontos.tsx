import { useId, useState } from 'react'
import { MANUAL_REASON_MAX } from '@estrelinha/core/proposals'
import { formatPrice } from '@estrelinha/core/formatters'
import { cn } from '@estrelinha/ui/lib/utils'

import { AVISO_DE_ERRO, CAMPO, ROTULO } from '@/shared/ui/campo'

import { BORDA_DE_ERRO } from './bordaDeErro'

import {
  APLICANDO,
  APLICAR,
  A_MESMA_REGRA_DA_LOJA,
  CONFERINDO_O_RESUMO,
  CUPOM,
  CUPOM_DESCARTADO,
  DESCONTO_COMBINADO,
  DICA_DO_CUPOM,
  DICA_DO_MOTIVO,
  EM_PERCENTUAL,
  EM_REAIS,
  FRETE_GRATIS,
  ITENS,
  MOTIVO,
  MOTIVO_FICA_NO_HISTORICO,
  MOTIVO_SO_PARA_VOCE,
  NOTA_DO_COMBINADO,
  PROMOCAO,
  REMOVER,
  RESUMO,
  RESUMO_NAO_CONFERIDO,
  TENTAR_DE_NOVO,
  VALOR_EM_PERCENTUAL,
  VALOR_EM_REAIS,
  codigoDigitado,
  contagemDoMotivo,
  cupomNoResumo,
  linhaDoPix,
  menos,
  removerCupom,
  rotuloDoCupom,
  subtotalDasPecas,
  type CupomAplicado,
  type DescontoCombinado,
} from '../model/descontos'
import type { ResumoDaMontagemNaTela } from '../model/useResumoDaMontagem'

export interface PassoDosDescontosProps {
  cupom: CupomAplicado | null
  combinado: DescontoCombinado
  /** Quantas peças a sacola tem (somando as quantidades). */
  pecas: number
  resumo: ResumoDaMontagemNaTela
  aplicando: boolean
  /** A recusa do cupom — o texto da loja —, ou `null`. */
  recusaDoCupom: string | null
  /** A recusa do desconto combinado que a prévia devolveu (ele não entrou na conta), ou `null`. */
  recusaDoCombinado: string | null
  /** A Adri tocou "Continuar" com bloqueio: só então o motivo vazio é cobrado no campo. */
  tentou: boolean
  aoAplicar: (codigo: string) => Promise<boolean>
  aoRemoverCupom: () => void
  aoMudarCombinado: (campos: Partial<DescontoCombinado>) => void
}

const Linha = ({ rotulo, valor, testId }: { rotulo: string; valor: string; testId: string }) => (
  <div data-testid={testId} className="flex items-baseline justify-between gap-3 text-sm">
    <dt className="min-w-0 break-words text-estrelinha-ink-soft">{rotulo}</dt>
    <dd className="shrink-0 tabular-nums text-estrelinha-ink">{valor}</dd>
  </div>
)

/**
 * O passo 3 · Descontos: o cupom (a regra e os textos da loja, com o e-mail desta cliente), o desconto
 * combinado (R$ ou %, com o motivo interno) e o resumo vivo — todo número dele vem da prévia do
 * servidor (`order-proposals?action=preview`). Enquanto a prévia confere, o resumo mantém o último
 * valor e diz que está conferindo; a falha de rede é falha, com o resumo anterior.
 */
const PassoDosDescontos = ({
  cupom,
  combinado,
  pecas,
  resumo,
  aplicando,
  recusaDoCupom,
  recusaDoCombinado,
  tentou,
  aoAplicar,
  aoRemoverCupom,
  aoMudarCombinado,
}: PassoDosDescontosProps) => {
  const id = useId()
  const [codigo, setCodigo] = useState('')
  const previa = resumo.previa
  const s = previa?.summary ?? null
  const motivoVazio = combinado.motivo.trim() === ''
  const cobrarMotivo = tentou && combinado.ligado && motivoVazio

  const aplicar = async () => {
    if (await aoAplicar(codigo)) setCodigo('')
  }

  return (
    <section aria-label="Descontos" className="space-y-5">
      <div className="space-y-2">
        <span className={`block ${ROTULO}`}>{CUPOM}</span>
        {cupom ? (
          <div data-testid="cupom-aplicado" className="flex min-h-12 flex-wrap items-center gap-x-3 rounded-md border border-estrelinha-field bg-estrelinha-surface px-3 py-1">
            <span className="font-mono text-base font-semibold text-estrelinha-ink">{cupom.codigo}</span>
            <span className="min-w-0 text-sm text-estrelinha-ink-soft">{rotuloDoCupom(cupom)}</span>
            <button
              type="button"
              aria-label={removerCupom(cupom.codigo)}
              onClick={aoRemoverCupom}
              className="ml-auto min-h-12 px-2 text-sm font-medium text-estrelinha-primary"
            >
              {REMOVER}
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <input
              id={`${id}-cupom`}
              aria-label="Código do cupom"
              className={cn(CAMPO, 'min-w-0 flex-1 uppercase', recusaDoCupom && BORDA_DE_ERRO)}
              value={codigo}
              placeholder={DICA_DO_CUPOM}
              autoCapitalize="characters"
              aria-invalid={recusaDoCupom ? true : undefined}
              aria-describedby={recusaDoCupom ? `${id}-recusa-do-cupom` : `${id}-regra-do-cupom`}
              onChange={(e) => setCodigo(codigoDigitado(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void aplicar()
                }
              }}
            />
            <button
              type="button"
              disabled={aplicando}
              onClick={() => void aplicar()}
              className="min-h-12 shrink-0 rounded-sm border border-estrelinha-primary px-4 text-base font-medium text-estrelinha-primary disabled:opacity-60"
            >
              {aplicando ? APLICANDO : APLICAR}
            </button>
          </div>
        )}
        {recusaDoCupom && (
          <p id={`${id}-recusa-do-cupom`} role="alert" className="text-sm text-estrelinha-alert">
            {recusaDoCupom}
          </p>
        )}
        {cupom && s?.coupon_discarded && <p className="text-sm text-estrelinha-ink-soft">{CUPOM_DESCARTADO}</p>}
        <p id={`${id}-regra-do-cupom`} className="text-sm text-estrelinha-ink-soft">
          {A_MESMA_REGRA_DA_LOJA}
        </p>
      </div>

      <div className="space-y-3 rounded-md bg-estrelinha-ground-deep p-3">
        <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
          <span className="min-w-0 flex-1 break-words">
            <span className="block text-base text-estrelinha-ink">{DESCONTO_COMBINADO}</span>
            <span className="block text-sm text-estrelinha-ink-soft">{NOTA_DO_COMBINADO}</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={combinado.ligado}
            onChange={(e) => aoMudarCombinado({ ligado: e.target.checked })}
          />
          <span
            aria-hidden="true"
            className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-estrelinha-field peer-checked:bg-estrelinha-primary peer-focus-visible:ring-2 peer-focus-visible:ring-estrelinha-primary peer-focus-visible:ring-offset-2"
          >
            <span className={`block h-5 w-5 rounded-full bg-estrelinha-surface shadow-sm ${combinado.ligado ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
          </span>
        </label>

        {combinado.ligado && (
          <div className="space-y-3">
            <div role="group" aria-label="Tipo do desconto combinado" className="grid grid-cols-2 gap-1 rounded-md border border-estrelinha-field bg-estrelinha-surface p-1">
              {(
                [
                  ['amount', EM_REAIS],
                  ['percent', EM_PERCENTUAL],
                ] as const
              ).map(([tipo, rotulo]) => (
                <button
                  key={tipo}
                  type="button"
                  aria-pressed={combinado.tipo === tipo}
                  onClick={() => aoMudarCombinado({ tipo })}
                  className={`min-h-11 rounded-[8px] border-2 text-sm font-medium ${combinado.tipo === tipo ? 'border-estrelinha-primary bg-estrelinha-primary text-estrelinha-on-primary' : 'border-estrelinha-field text-estrelinha-ink'}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-valor`} className={ROTULO}>
                {combinado.tipo === 'amount' ? VALOR_EM_REAIS : VALOR_EM_PERCENTUAL}
              </label>
              <input
                id={`${id}-valor`}
                className={`${CAMPO} w-full min-w-0`}
                inputMode="decimal"
                value={combinado.valor}
                aria-describedby={recusaDoCombinado ? `${id}-recusa-do-combinado` : undefined}
                onChange={(e) => aoMudarCombinado({ valor: e.target.value })}
              />
              {recusaDoCombinado && (
                <p id={`${id}-recusa-do-combinado`} role="alert" className="text-sm text-estrelinha-alert">
                  {recusaDoCombinado}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <label htmlFor={`${id}-motivo`} className={ROTULO}>
                  {MOTIVO}
                </label>
                <span className="text-sm tabular-nums text-estrelinha-ink-soft">{contagemDoMotivo(combinado.motivo.length)}</span>
              </div>
              <input
                id={`${id}-motivo`}
                className={`${CAMPO} w-full min-w-0`}
                value={combinado.motivo}
                maxLength={MANUAL_REASON_MAX}
                placeholder={DICA_DO_MOTIVO}
                aria-invalid={cobrarMotivo || undefined}
                aria-describedby={cobrarMotivo ? `${id}-motivo-cobrado ${id}-motivo-nota` : `${id}-motivo-nota`}
                onChange={(e) => aoMudarCombinado({ motivo: e.target.value.slice(0, MANUAL_REASON_MAX) })}
              />
              {cobrarMotivo && (
                <p id={`${id}-motivo-cobrado`} role="alert" className="text-sm text-estrelinha-alert">
                  {MOTIVO_FICA_NO_HISTORICO}
                </p>
              )}
              <p id={`${id}-motivo-nota`} className="text-sm text-estrelinha-ink-soft">
                {MOTIVO_SO_PARA_VOCE}
              </p>
            </div>
          </div>
        )}
      </div>

      <section aria-label={RESUMO} aria-busy={resumo.conferindo || undefined} className="space-y-2 rounded-md border border-estrelinha-line bg-estrelinha-surface p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-lg text-estrelinha-ink">{RESUMO}</h2>
          {resumo.conferindo && (
            <span role="status" className="text-sm text-estrelinha-ink-soft">
              {CONFERINDO_O_RESUMO}
            </span>
          )}
        </div>
        {resumo.falhou && (
          <div className={AVISO_DE_ERRO}>
            <p>{RESUMO_NAO_CONFERIDO}</p>
            <button type="button" onClick={resumo.tentarDeNovo} className="mt-1 min-h-11 font-medium underline">
              {TENTAR_DE_NOVO}
            </button>
          </div>
        )}
        {resumo.recusa && resumo.recusa.slug !== 'coupon_refused' && (
          <p role="alert" className={AVISO_DE_ERRO}>
            {resumo.recusa.frase}
          </p>
        )}
        {s && (
          <dl className="space-y-1.5">
            <Linha testId="resumo-subtotal" rotulo={subtotalDasPecas(pecas)} valor={formatPrice(s.subtotal + s.promotion_discount)} />
            {s.promotion_discount > 0 && <Linha testId="resumo-promocao" rotulo={PROMOCAO} valor={menos(s.promotion_discount)} />}
            {cupom && s.coupon_applied && (s.coupon_free_shipping || s.coupon_discount > 0) && (
              <Linha
                testId="resumo-cupom"
                rotulo={cupomNoResumo(cupom.codigo)}
                valor={s.coupon_free_shipping ? FRETE_GRATIS : menos(s.coupon_discount)}
              />
            )}
            {s.manual_discount > 0 && <Linha testId="resumo-combinado" rotulo={DESCONTO_COMBINADO} valor={menos(s.manual_discount)} />}
            <div data-testid="resumo-itens" className="flex items-baseline justify-between gap-3 border-t border-estrelinha-line pt-2 text-base font-semibold text-estrelinha-ink">
              <dt>{ITENS}</dt>
              <dd className="shrink-0 tabular-nums">{formatPrice(s.items_total)}</dd>
            </div>
          </dl>
        )}
        {previa?.items_pix && (
          <p data-testid="resumo-pix" className="text-sm text-estrelinha-ink-soft">
            {linhaDoPix(previa.items_pix.total, previa.items_pix.percent)}
          </p>
        )}
      </section>
    </section>
  )
}

export default PassoDosDescontos
