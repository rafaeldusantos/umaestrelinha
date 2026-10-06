// Feature 61 — a seção Analytics de `/admin/google` (`ANL-03`..`ANL-11`).
//
// O que a dona faz aqui, na ordem do desenho (Paper, "61 · Painel — /admin/google/analytics"):
//
// 1. **liga ou desliga a medição** — um interruptor próprio (`AD-027`), que nasce desligado;
// 2. **informa o ID de medição** — público por natureza, gravado em `store_settings.analytics`;
// 3. **guarda a chave secreta** — só de escrita, pela edge function (`AnalyticsSecretField`);
// 4. **confere se as compras estão chegando** e **onde criar a chave** (a coluna da direita).
//
// ## Toda gravação espalha o valor atual
//
// `store_settings.analytics` tem **três** campos e esta tela edita dois. `production_host` não é
// editável aqui (muda uma vez, na troca de domínio — Apêndice B da spec), e uma gravação que
// montasse `{ enabled, measurement_id }` do zero **apagaria** o host de produção: a loja passaria a
// marcar todo tráfego como interno, e o filtro do GA4 tiraria 100% das visitas dos relatórios —
// sem erro em lugar nenhum. Por isso as duas escritas partem de `{ ...analytics }`.
//
// ## As réguas não são desta tela
//
// "Este ID serve?" é `measurementIdRefusal` (`@estrelinha/core/analytics`), a mesma função que a
// loja usa para decidir se carrega o gtag. Uma régua escrita aqui deixaria o painel aceitar um ID
// que a loja depois ignora em silêncio — a dona veria "Ligado" e o GA4 ficaria vazio.

import { useState } from 'react'
import { Switch } from '@estrelinha/ui/switch'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { useAnalyticsSettings, useUpdateSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { measurementIdRefusal, normalizeMeasurementId } from '@estrelinha/core/analytics'
import { FormCard, InfoBanner, SettingsSaveButton, SWITCH_TAP_44 } from '@/shared/ui'
import { useAnalyticsSecretStatus } from '../model/useAnalyticsSecret'
import AnalyticsSecretField from './AnalyticsSecretField'
import LastPurchaseCard from './LastPurchaseCard'
import SecretHelpCard, { SECRET_HELP_ID } from './SecretHelpCard'

/** `ANL-04`: ligar sem ID válido gravado é recusado, e a frase diz o que falta. */
export const MISSING_ID_REFUSAL =
  'Falta o ID de medição. Grave um ID válido no campo abaixo antes de ligar.'

const ID_FIELD_ID = 'analytics-measurement-id'
const ID_ERROR_ID = 'analytics-measurement-id-error'
const ID_HINT_ID = 'analytics-measurement-id-hint'

const AnalyticsPanel = () => {
  const analytics = useAnalyticsSettings()
  const { mutateAsync: salvar, isPending } = useUpdateSettings()
  const segredo = useAnalyticsSecretStatus()

  /**
   * `null` ⇒ a dona não mexeu no campo, e ele mostra o valor gravado. Inicializar um `useState`
   * com o valor gravado congelaria o default de antes de a leitura chegar.
   */
  const [rascunho, setRascunho] = useState<string | null>(null)
  const [recusaId, setRecusaId] = useState<string | null>(null)
  const [recusaLigar, setRecusaLigar] = useState<string | null>(null)

  const idNoCampo = rascunho ?? analytics.measurement_id
  const pendente = rascunho !== null && normalizeMeasurementId(rascunho) !== analytics.measurement_id

  const gravar = async (value: typeof analytics, sucesso: string): Promise<boolean> => {
    try {
      await salvar({ key: 'analytics', value })
      toast({ title: sucesso })
      return true
    } catch {
      toast({
        title: 'Não foi possível salvar agora',
        description: 'Nada foi alterado. Tente de novo em instantes.',
        variant: 'destructive',
      })
      return false
    }
  }

  const alternar = async (ligar: boolean) => {
    setRecusaLigar(null)
    // A régua é sobre o ID **gravado**, não o do campo: é o gravado que a loja vai ler. Ligar com o
    // rascunho válido e o gravado inválido mediria nada até a próxima gravação.
    if (ligar && measurementIdRefusal(analytics.measurement_id)) {
      setRecusaLigar(MISSING_ID_REFUSAL)
      return
    }
    await gravar({ ...analytics, enabled: ligar }, ligar ? 'Medição ligada' : 'Medição desligada')
  }

  const salvarId = async () => {
    const recusa = measurementIdRefusal(idNoCampo)
    if (recusa) {
      setRecusaId(recusa)
      return
    }
    setRecusaId(null)
    const ok = await gravar(
      { ...analytics, measurement_id: normalizeMeasurementId(idNoCampo) },
      'ID de medição salvo',
    )
    if (ok) setRascunho(null)
  }

  // `ANL-07` — só com a leitura da chave CONCLUÍDA. Avisar durante a carga, ou depois de uma
  // leitura que falhou, afirmaria uma ausência que ninguém mediu.
  const ligadoSemChave =
    analytics.enabled && segredo.isSuccess && segredo.data?.secret_configured === false

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="min-w-0 space-y-5">
        {/* ------------------------------------------------------------ estado */}
        <section
          aria-labelledby="ga-estado"
          className="rounded-2xl border border-border bg-card p-6"
          data-testid="analytics-state"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1.5">
              <h2 id="ga-estado" className="text-lg font-semibold text-foreground">
                {analytics.enabled ? 'Medição ligada' : 'Medição desligada'}
              </h2>
              <p className="max-w-prose text-sm text-muted-foreground">
                {analytics.enabled
                  ? 'A loja envia a navegação e as vendas para a propriedade abaixo. Quem desligar “Estatísticas” nas preferências de cookies da loja deixa de ser medida.'
                  : 'A loja não carrega o Google Analytics e o servidor não envia as compras. Ligue depois de conferir o ID e guardar a chave secreta.'}
              </p>
            </div>
            <Switch
              checked={analytics.enabled}
              onCheckedChange={v => void alternar(v)}
              disabled={isPending}
              aria-label="Ligar a medição do Google Analytics"
              className={SWITCH_TAP_44}
            />
          </div>
          {recusaLigar && (
            <p role="alert" className="mt-3 text-sm text-destructive" data-testid="analytics-enable-refusal">
              {recusaLigar}
            </p>
          )}
        </section>

        {ligadoSemChave && (
          <InfoBanner
            role="status"
            data-testid="analytics-missing-secret"
            action={
              <a
                href={`#${SECRET_HELP_ID}`}
                className="inline-flex min-h-11 items-center whitespace-nowrap text-sm font-semibold underline"
              >
                Ver o passo a passo
              </a>
            }
          >
            A medição está ligada, mas a chave secreta não está guardada: as compras aprovadas não
            estão sendo enviadas ao Google. Crie a chave no Google Analytics e guarde-a abaixo.
          </InfoBanner>
        )}

        {/* ------------------------------------------------------------ as chaves */}
        <FormCard
          title="As chaves da propriedade"
          description="As duas vêm do Google Analytics, em Administrador → Fluxos de dados → o fluxo da loja."
          footer={
            <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {pendente ? 'Alteração não salva' : 'Nenhuma alteração pendente'}
              </p>
              <SettingsSaveButton
                loading={isPending}
                onClick={() => void salvarId()}
                testId="analytics-save"
                disabled={!pendente}
              />
            </div>
          }
        >
          <div className="space-y-2">
            <Label htmlFor={ID_FIELD_ID}>ID de medição</Label>
            <Input
              id={ID_FIELD_ID}
              value={idNoCampo}
              onChange={e => {
                setRascunho(e.target.value)
                setRecusaId(null)
              }}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={recusaId ? true : undefined}
              aria-describedby={recusaId ? `${ID_ERROR_ID} ${ID_HINT_ID}` : ID_HINT_ID}
              className="h-11 w-full font-mono sm:max-w-[320px]"
            />
            {recusaId && (
              <p id={ID_ERROR_ID} role="alert" className="text-sm text-destructive">
                {recusaId}
              </p>
            )}
            <p id={ID_HINT_ID} className="text-xs text-muted-foreground">
              Começa com “G-”. É público — aparece no código de qualquer página da loja.
            </p>
          </div>

          <AnalyticsSecretField />
        </FormCard>
      </div>

      {/* -------------------------------------------------------------- coluna da direita */}
      <div className="min-w-0 space-y-5">
        <LastPurchaseCard />
        <SecretHelpCard />
      </div>
    </div>
  )
}

export default AnalyticsPanel
