// Feature 30 — a tela onde o feed do Google Shopping é ligado (`GSH-15`..`GSH-17`, `GSH-22`).
//
// A loja tem 3.235 ofertas aprovadas na conta Merchant Center `685367464`, alimentadas hoje pela
// Content API do app da Nuvemshop. Esta tela é o que troca a fonte sem perder o catálogo — e o que
// impede a troca de acontecer na ordem errada.
//
// **O interruptor não é um toggle qualquer.** Ligado uma vez, desligar deixa de ser neutro: o Google
// para de receber o feed e as ofertas expiram. Por isso o desligar exige confirmação com o efeito
// escrito, e por isso `ever_enabled` existe no dado — um booleano só não distingue "nunca ligou" de
// "está ligado agora".

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, Copy, ExternalLink, ShoppingBag } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Switch } from '@estrelinha/ui/switch'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import {
  useGoogleShoppingSettings,
  useUpdateSettings,
} from '@estrelinha/core/hooks/useStoreSettings'
import { FEED_EXCLUSIONS, type FeedExclusion } from '@estrelinha/core/shopping'
import { storeOrigin } from '@/shared/lib/storeOrigin'
import { PageHeader } from '@/shared/ui'
import { CUTOVER_STEPS, feedUrl } from '@/features/google-shopping/lib/cutover'
import { useFeedInventory } from '@/features/google-shopping/model/useFeedInventory'
import { DisableFeedDialog } from '@/features/google-shopping/ui/DisableFeedDialog'

const MOTIVO_LABEL: Record<FeedExclusion, string> = {
  produto_inativo: 'Produto desativado',
  variacao_inativa: 'Variação desativada',
  sem_preco: 'Variação sem preço',
}

const AdminGoogleShoppingPage = () => {
  const settings = useGoogleShoppingSettings()
  const { mutateAsync: salvar, isPending } = useUpdateSettings()
  const { data: inventario, isLoading, isError } = useFeedInventory()
  const [confirmando, setConfirmando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [verExcluidas, setVerExcluidas] = useState(false)

  const url = feedUrl(storeOrigin())

  const gravar = async (enabled: boolean) => {
    await salvar({
      key: 'google_shopping',
      // `ever_enabled` só sobe, nunca desce: é memória de que o Google já recebeu este feed, e é
      // o que faz o próximo desligar continuar pedindo confirmação.
      value: { ...settings, enabled, ever_enabled: settings.ever_enabled || enabled },
    })
    toast({
      title: enabled ? 'Integração ligada' : 'Integração desligada',
      description: enabled
        ? 'O endereço do feed já responde. Continue pelos passos abaixo, no Google.'
        : 'O endereço do feed voltou a responder 404.',
    })
  }

  const onToggle = (proximo: boolean) => {
    if (!proximo && settings.ever_enabled) {
      setConfirmando(true)
      return
    }
    void gravar(proximo)
  }

  const copiar = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Shopping"
        subtitle="O feed que publica o catálogo no Google, de graça, e nas campanhas quando houver."
        icon={ShoppingBag}
      />

      {/* ---------------------------------------------------------------- estado */}
      <section className="rounded-lg border border-border bg-card p-6" aria-labelledby="gs-estado">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="gs-estado" className="text-lg font-semibold">
              {settings.enabled ? 'Integração ligada' : 'Integração desligada'}
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              {settings.enabled
                ? 'O endereço do feed responde e o Google pode buscar o catálogo.'
                : 'O endereço do feed responde 404. Ligue só depois de virar o DNS — veja os passos abaixo.'}
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={onToggle}
            disabled={isPending}
            aria-label="Ligar integração com o Google Shopping"
          />
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Conta Merchant Center
            </dt>
            <dd className="mt-1 font-mono text-sm">{settings.merchant_id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Última busca do Google
            </dt>
            <dd className="mt-1 text-sm">
              {settings.last_fetched_at
                ? new Date(settings.last_fetched_at).toLocaleString('pt-BR')
                : 'O Google ainda não buscou o feed'}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Endereço do feed</p>
          {url ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-sm break-all">{url}</code>
              <Button variant="outline" size="sm" onClick={copiar} className="h-11">
                {copiado ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                {copiado ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          ) : (
            <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Falta configurar <code className="mx-1">VITE_STORE_URL</code> no painel — sem ela não dá
              para montar o endereço que o Google vai buscar.
            </p>
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- cutover */}
      <section className="rounded-lg border border-border bg-card p-6" aria-labelledby="gs-cutover">
        <h2 id="gs-cutover" className="text-lg font-semibold">
          A ordem da virada
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          São 3.235 produtos já aprovados no Google. Seguir esta ordem é o que troca a fonte sem
          recomeçar o catálogo do zero.
        </p>
        <ol className="mt-4 space-y-4">
          {CUTOVER_STEPS.map((passo, i) => (
            <li key={passo.titulo} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">
                  {passo.titulo}
                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                    {passo.onde}
                  </span>
                </p>
                <p className="mt-0.5 max-w-prose text-sm text-muted-foreground">{passo.detalhe}</p>
              </div>
            </li>
          ))}
        </ol>
        <a
          className="mt-4 inline-flex items-center gap-1 text-sm underline"
          href="https://merchants.google.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir o Merchant Center <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>

      {/* ---------------------------------------------------------------- inventário */}
      <section className="rounded-lg border border-border bg-card p-6" aria-labelledby="gs-inv">
        <h2 id="gs-inv" className="text-lg font-semibold">
          O que o feed publica
        </h2>

        {isLoading && <p className="mt-2 text-sm text-muted-foreground">Contando o catálogo…</p>}

        {/* `BL-00Y`: erro NÃO vira zero. "0 ofertas" no dia do cutover faria a dona concluir que o
            feed quebrou, quando o que falhou foi a leitura desta tela. */}
        {isError && (
          <p className="mt-2 flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Não foi possível contar o catálogo agora. Isto é uma falha desta tela — não diz nada sobre
            o feed.
          </p>
        )}

        {inventario && (
          <>
            <p className="mt-2 text-3xl font-semibold">
              {inventario.publicadas.toLocaleString('pt-BR')}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                de {inventario.total.toLocaleString('pt-BR')} variações
              </span>
            </p>

            <ul className="mt-4 space-y-1">
              {FEED_EXCLUSIONS.map(motivo => (
                <li key={motivo} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{MOTIVO_LABEL[motivo]}</span>
                  <span className="font-medium">{inventario.porMotivo[motivo]}</span>
                </li>
              ))}
            </ul>

            {inventario.excluidas.length > 0 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11"
                  onClick={() => setVerExcluidas(v => !v)}
                >
                  {verExcluidas ? 'Esconder' : `Ver as ${inventario.excluidas.length} de fora`}
                </Button>

                {verExcluidas && (
                  <ul className="mt-3 divide-y divide-border rounded border border-border">
                    {inventario.excluidas.map(linha => (
                      <li
                        key={linha.variantId}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <Link
                          to={`/admin/produtos/${linha.productId}/editar`}
                          className="inline-flex min-h-11 items-center underline"
                        >
                          {linha.productName}
                        </Link>
                        <span className="text-muted-foreground">{MOTIVO_LABEL[linha.motivo]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </section>

      <DisableFeedDialog
        open={confirmando}
        onOpenChange={setConfirmando}
        onConfirm={() => {
          setConfirmando(false)
          void gravar(false)
        }}
      />
    </div>
  )
}

export default AdminGoogleShoppingPage
