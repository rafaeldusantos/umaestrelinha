// A tela "Faixa de avisos" — a faixa fina acima do cabeçalho da loja.
//
// A dona liga e desliga a faixa, monta até 5 avisos de texto ou de imagem e confere na LOJA de
// verdade, num iframe, como a cliente vai ver. O painel nunca desenha a faixa (`previaUnica`).
//
// Grava a chave inteira (`store_settings['announcements']`) pelo `useUpdateSettings` de `core`, e só
// grava o que `core` aceita: toda recusa vem de `announcementsRefusal`, aparece no campo antes de
// qualquer rede, e desabilita o Salvar.

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react'
import {
  ANNOUNCEMENT_LIMIT,
  announcementsRefusal,
  normalizeAnnouncements,
} from '@estrelinha/core/announcements'
import { useStoreSettings, useUpdateSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  CardSkeleton,
  FormCard,
  InfoBanner,
  PageHeader,
  SettingsSaveButton,
  SWITCH_TAP_44,
  ToggleField,
} from '@/shared/ui'
import {
  AnnouncementList,
  AnnouncementLivePreview,
  avisoVazio,
  deleteAnnouncementImage,
  faixaDoGravado,
  moverAviso,
  paraGravar,
  uploadAnnouncementImage,
  type AvisoRascunho,
  type CampoDeArte,
  type FaixaRascunho,
} from '@/features/announcement-bar'

const ATRASO = 'Pode levar até uma hora para a faixa aparecer ou sumir em todas as páginas da loja.'

type Recados = Record<string, Partial<Record<CampoDeArte, string>>>
type Enviando = Record<string, Partial<Record<CampoDeArte, boolean>>>

const AdminAnnouncementsPage = () => {
  const { data, isLoading, isError, refetch } = useStoreSettings()
  const update = useUpdateSettings()

  const gravado = useMemo(() => normalizeAnnouncements(data?.announcements), [data?.announcements])

  const [faixa, setFaixa] = useState<FaixaRascunho | null>(null)
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [mostradoId, setMostradoId] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [falhaAoSalvar, setFalhaAoSalvar] = useState<string | null>(null)
  const [recados, setRecados] = useState<Recados>({})
  const [enviando, setEnviando] = useState<Enviando>({})
  const [vista, setVista] = useState<'avisos' | 'previa'>('avisos')
  /** As artes enviadas nesta sessão e ainda não gravadas — as únicas que a tela pode apagar. */
  const enviadasNaoGravadas = useRef(new Set<string>())

  // O rascunho nasce do gravado UMA vez: reler depois de salvar devolve o mesmo valor, e reler por
  // outro motivo não pode apagar o que a dona está escrevendo.
  useEffect(() => {
    if (!isLoading && data && faixa === null) setFaixa(faixaDoGravado(gravado))
  }, [isLoading, data, gravado, faixa])

  const valor = useMemo(() => (faixa ? paraGravar(faixa) : null), [faixa])
  const recusa = valor ? announcementsRefusal(valor) : null
  const sujo = valor !== null && JSON.stringify(valor) !== JSON.stringify(gravado)

  const mexer = (proximo: (f: FaixaRascunho) => FaixaRascunho) => {
    setFaixa(f => (f ? proximo(f) : f))
    setSalvo(false)
    setFalhaAoSalvar(null)
  }

  const itens = faixa?.items ?? []
  const indiceMostrado = Math.max(0, itens.findIndex(a => a.id === mostradoId))
  const navegavel = faixa?.enabled === true && itens.length > 1

  const alternar = (id: string) => {
    if (abertoId === id) {
      setAbertoId(null)
      return
    }
    setAbertoId(id)
    setMostradoId(id)
  }

  const adicionar = () => {
    const novo = avisoVazio()
    mexer(f => ({ ...f, items: [...f.items, novo] }))
    setAbertoId(novo.id)
    setMostradoId(novo.id)
  }

  const mover = (de: number, para: number) => mexer(f => ({ ...f, items: moverAviso(f.items, de, para) }))

  const tirar = (id: string) => {
    const aviso = itens.find(a => a.id === id)
    if (aviso) {
      for (const url of [aviso.imageDesktop, aviso.imageMobile]) {
        if (enviadasNaoGravadas.current.has(url)) {
          enviadasNaoGravadas.current.delete(url)
          void deleteAnnouncementImage(url)
        }
      }
    }
    mexer(f => ({ ...f, items: f.items.filter(a => a.id !== id) }))
    if (abertoId === id) setAbertoId(null)
    if (mostradoId === id) setMostradoId(null)
  }

  const mudar = (id: string, patch: Partial<AvisoRascunho>) =>
    mexer(f => ({ ...f, items: f.items.map(a => (a.id === id ? { ...a, ...patch } : a)) }))

  const marcar = <T,>(set: Dispatch<SetStateAction<Record<string, Partial<Record<CampoDeArte, T>>>>>, id: string, campo: CampoDeArte, v: T | undefined) =>
    set(atual => ({ ...atual, [id]: { ...(atual[id] ?? {}), [campo]: v } }))

  const enviar = async (id: string, campo: CampoDeArte, file: File | undefined) => {
    if (!file) return
    marcar(setRecados, id, campo, undefined)
    marcar(setEnviando, id, campo, true)
    const { url, error } = await uploadAnnouncementImage(file)
    marcar(setEnviando, id, campo, false)
    if (!url) {
      marcar(setRecados, id, campo, error ?? undefined)
      return
    }
    const anterior = itens.find(a => a.id === id)?.[campo]
    if (anterior && enviadasNaoGravadas.current.has(anterior)) {
      enviadasNaoGravadas.current.delete(anterior)
      void deleteAnnouncementImage(anterior)
    }
    enviadasNaoGravadas.current.add(url)
    mudar(id, { [campo]: url })
  }

  const salvar = async () => {
    if (!valor || recusa) return
    setFalhaAoSalvar(null)
    try {
      await update.mutateAsync({ key: 'announcements', value: valor })
      enviadasNaoGravadas.current.clear()
      setSalvo(true)
    } catch (e) {
      setFalhaAoSalvar(e instanceof Error ? e.message : 'Tente de novo.')
    }
  }

  const passar = (delta: -1 | 1) => {
    const proximo = itens[indiceMostrado + delta]
    if (proximo) setMostradoId(proximo.id)
  }

  return (
    <div className="lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
      <nav aria-label="Trilha" className="mb-2 hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
        <span>Loja</span>
        <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
        <span className="text-estrelinha-admin-text-secondary">Faixa de avisos</span>
      </nav>
      <PageHeader
        className="shrink-0"
        title="Faixa de avisos"
        subtitle="A faixa fina acima do cabeçalho, em todas as páginas da loja (menos o checkout). Um aviso por vez, trocando a cada 6 segundos."
        icon={Megaphone}
      />

      {isError && (
        <InfoBanner
          className="mb-4"
          role="status"
          data-testid="faixa-erro"
          action={
            <Button variant="outline" className="min-h-11" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          }
        >
          <p>Não foi possível carregar a faixa de avisos.</p>
        </InfoBanner>
      )}

      {(isLoading || (!isError && !faixa)) && (
        <div data-testid="faixa-carregando" className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {faixa && (
        <>
          <div role="tablist" aria-label="O que mostrar" className="mb-4 flex gap-4 border-b border-border lg:hidden">
            {(
              [
                ['avisos', 'Avisos'],
                ['previa', 'Prévia'],
              ] as const
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                role="tab"
                aria-selected={vista === chave}
                onClick={() => setVista(chave)}
                className={cn(
                  'min-h-11 border-b-2 px-1 text-sm font-semibold transition-colors motion-reduce:transition-none',
                  vista === chave ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[560px_minmax(0,1fr)]">
            <div
              data-testid="coluna-avisos"
              className={cn('flex min-h-0 min-w-0 flex-col gap-6 lg:overflow-y-auto', vista !== 'avisos' && 'hidden lg:flex')}
            >
              <FormCard contentClassName="space-y-2 pt-6">
                <ToggleField
                  label="Faixa ligada"
                  description="Desligada, a faixa some e o cabeçalho volta para o topo."
                  checked={faixa.enabled}
                  onChange={ligada => mexer(f => ({ ...f, enabled: ligada }))}
                  switchClassName={SWITCH_TAP_44}
                />
                <p className="text-xs text-muted-foreground">{ATRASO}</p>
              </FormCard>

              <div data-testid="card-avisos">
                <FormCard
                  title="Avisos"
                  description="Sem contagem regressiva, sem “últimas unidades” e sem exclamação: o tom da loja vale aqui também."
                  action={
                    <span data-testid="contagem-avisos" className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {itens.length} de {ANNOUNCEMENT_LIMIT}
                    </span>
                  }
                >
                  {itens.length > 0 && (
                    <AnnouncementList
                      avisos={itens}
                      abertoId={abertoId}
                      recados={recados}
                      enviando={enviando}
                      onToggle={alternar}
                      onMove={mover}
                      onRemove={tirar}
                      onChange={mudar}
                      onUpload={(id, campo, file) => void enviar(id, campo, file)}
                    />
                  )}
                  {itens.length < ANNOUNCEMENT_LIMIT && (
                    <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" onClick={adicionar}>
                      + Adicionar aviso
                    </Button>
                  )}
                </FormCard>
              </div>

              <div data-testid="barra-salvar" className="space-y-1 pb-2">
                {recusa ? (
                  <p role="status" className="text-xs font-medium text-destructive">
                    Corrija o que está marcado para salvar.
                  </p>
                ) : salvo ? (
                  <p role="status" className="text-xs font-medium text-estrelinha-admin-emerald">
                    Salvo. {ATRASO}
                  </p>
                ) : sujo ? (
                  <p className="text-xs text-muted-foreground">Alterações não salvas.</p>
                ) : null}
                {falhaAoSalvar && (
                  <p role="alert" className="text-xs font-medium text-destructive">
                    Não foi possível salvar: {falhaAoSalvar}
                  </p>
                )}
                <SettingsSaveButton
                  testId="salvar-faixa"
                  loading={update.isPending}
                  disabled={recusa !== null || !sujo}
                  onClick={() => void salvar()}
                />
              </div>
            </div>

            <section
              aria-label="Prévia da faixa"
              data-testid="coluna-previa-faixa"
              className={cn('flex min-h-0 min-w-0 flex-col gap-3', vista !== 'previa' && 'hidden lg:flex')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-heading text-sm font-bold text-foreground">Como a cliente vê</h2>
                {navegavel ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Aviso anterior"
                      disabled={indiceMostrado === 0}
                      onClick={() => passar(-1)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <span data-testid="aviso-n-de-m" className="px-1 text-xs font-semibold tabular-nums text-muted-foreground">
                      Aviso {indiceMostrado + 1} de {itens.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Próximo aviso"
                      disabled={indiceMostrado === itens.length - 1}
                      onClick={() => passar(1)}
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
              {(!faixa.enabled || itens.length === 0) && (
                <p data-testid="faixa-desligada" className="text-xs text-muted-foreground">
                  A faixa está desligada: a loja abre sem ela.
                </p>
              )}
              <div className="min-h-0 flex-1">
                <AnnouncementLivePreview draft={valor!} mostrar={indiceMostrado} />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminAnnouncementsPage
