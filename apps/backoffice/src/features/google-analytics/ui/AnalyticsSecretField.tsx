// Feature 61 · `ANL-05` — a chave secreta, só de escrita.
//
// Três estados, e nenhum deles mostra a chave:
//
// - **guardada** — "Guardada no servidor", a data em que o servidor a gravou, e "Substituir";
// - **ausente ou substituindo** — o campo para colar e "Guardar no servidor";
// - **a leitura falhou** — a falha, dita como falha. Nunca "não guardada": isso mandaria a dona
//   criar uma segunda chave no Google por causa de uma queda de rede.
//
// Depois de guardar, o valor sai do estado do componente **antes** de o campo sumir: o que a dona
// colou não fica no DOM, nem num `<input>` escondido, nem no `value` de um campo desmontado que o
// React ainda guarda (`ANL-05`, "sem nunca exibir a chave de volta").

import { useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { useAnalyticsSecretStatus, useSaveAnalyticsSecret } from '../model/useAnalyticsSecret'

/** A data de gravação, no fuso da loja — a dona está em Porto Alegre, não em UTC. */
const formatSecretDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

const SECRET_FIELD_ID = 'analytics-api-secret'
const SECRET_HINT_ID = 'analytics-api-secret-hint'
const SECRET_ERROR_ID = 'analytics-api-secret-error'

export const SECRET_EMPTY_REFUSAL = 'Cole a chave secreta antes de guardar.'

const AnalyticsSecretField = () => {
  const status = useAnalyticsSecretStatus()
  const { save, saving } = useSaveAnalyticsSecret()
  const [substituindo, setSubstituindo] = useState(false)
  const [valor, setValor] = useState('')
  const [recusa, setRecusa] = useState<string | null>(null)

  const guardar = async () => {
    // A ÚNICA régua local é "não está vazio": a forma da chave (tamanho, espaços) é do servidor, que
    // é quem grava. Duas réguas de "chave válida" divergiriam — o painel recusaria o que a function
    // aceita, ou o contrário, e a frase da tela não seria a da porta.
    if (valor.trim() === '') {
      setRecusa(SECRET_EMPTY_REFUSAL)
      return
    }
    const motivo = await save(valor.trim())
    if (motivo) {
      setRecusa(motivo)
      return
    }
    setValor('')
    setRecusa(null)
    setSubstituindo(false)
  }

  const cancelar = () => {
    setValor('')
    setRecusa(null)
    setSubstituindo(false)
  }

  const legenda = (
    <p id={SECRET_HINT_ID} className="text-xs text-muted-foreground">
      É com ela que o servidor avisa o Google de cada compra aprovada — inclusive do PIX pago depois
      que a cliente fechou a página.
    </p>
  )

  if (status.isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Chave secreta da API (Measurement Protocol)</p>
        <p className="text-sm text-muted-foreground" role="status">
          Conferindo a chave…
        </p>
      </div>
    )
  }

  if (status.isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Chave secreta da API (Measurement Protocol)</p>
        <p className="text-sm text-destructive" role="alert" data-testid="analytics-secret-read-error">
          {(status.error as Error)?.message || 'Não foi possível conferir a chave secreta agora.'} Isto
          é uma falha desta tela — não quer dizer que a chave sumiu.
        </p>
        <Button variant="outline" className="h-11" onClick={() => void status.refetch()}>
          Tentar de novo
        </Button>
      </div>
    )
  }

  const guardada = status.data?.secret_configured === true
  const mostrarCampo = !guardada || substituindo

  return (
    <div className="space-y-2">
      {mostrarCampo ? (
        <>
          <Label htmlFor={SECRET_FIELD_ID}>Chave secreta da API (Measurement Protocol)</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id={SECRET_FIELD_ID}
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={valor}
              onChange={e => {
                setValor(e.target.value)
                setRecusa(null)
              }}
              placeholder="Cole aqui o valor da chave secreta"
              aria-invalid={recusa ? true : undefined}
              aria-describedby={recusa ? `${SECRET_ERROR_ID} ${SECRET_HINT_ID}` : SECRET_HINT_ID}
              className="h-11 min-w-0 font-mono sm:flex-1"
            />
            <Button
              type="button"
              className="h-11"
              onClick={() => void guardar()}
              disabled={saving}
              data-testid="analytics-secret-save"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Guardar no servidor
            </Button>
            {guardada && (
              <Button type="button" variant="outline" className="h-11" onClick={cancelar}>
                Cancelar
              </Button>
            )}
          </div>
          {recusa && (
            <p id={SECRET_ERROR_ID} role="alert" className="text-sm text-destructive">
              {recusa}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">Chave secreta da API (Measurement Protocol)</p>
          <div
            className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
            data-testid="analytics-secret-stored"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-estrelinha-admin-emerald" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Guardada no servidor</p>
                <p className="text-xs text-muted-foreground">
                  {status.data?.secret_updated_at
                    ? `Salva em ${formatSecretDate(status.data.secret_updated_at)}. `
                    : ''}
                  Por segurança, ela não aparece de novo nesta tela.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full shrink-0 sm:w-auto"
              onClick={() => setSubstituindo(true)}
            >
              Substituir
            </Button>
          </div>
        </>
      )}
      {legenda}
    </div>
  )
}

export default AnalyticsSecretField
