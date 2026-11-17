// O editor do bloco "Joias em oferta".
//
// Três `FormCard`s, na ordem em que a decisão acontece: **Conteúdo** (título e descrição da dona,
// com recuo para o nome da campanha e a frase dos percentuais), **Campanha** (a do bloco — cada
// bloco tem a sua) e **Peças escolhidas** (só as marcadas na campanha, na ordem da dona).
//
// Três decisões mandam aqui:
//
// 1. **Isto não é uma vitrine** (`AD-019`). A lista é lista; quem mostra como o bloco fica é a
//    prévia, que é a loja num iframe. `previaUnica.test.ts` alcança este arquivo.
// 2. **Nenhuma regra nasce aqui.** A recusa, os tetos, as frases da campanha (sem campanha,
//    agendada, encerrada, desligada, já usada por outro bloco) vêm de `@estrelinha/core/home`; "a
//    campanha baixa esta peça?" vem de `core/campaigns`, pela leitura de `entities/campaign`.
// 3. **A lista só guarda peça da campanha.** Depois de ler as marcações, a peça escolhida que não
//    está marcada (tirada da campanha, ou a campanha trocada) e a apagada do catálogo saem do
//    rascunho, e a tela diz quais — a remoção vale quando a dona salvar. Leitura que falhou não tira
//    nada: "não consegui conferir" não é "não está marcada".

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Trash2, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { cn } from '@estrelinha/ui/lib/utils'
import { campaignPeriodLabel, campaignStatus, type CampaignStatus } from '@estrelinha/core/campaigns'
import {
  CAMPAIGN_OFFERS_DESCRIPTION_MAX,
  CAMPAIGN_OFFERS_NO_CAMPAIGN,
  CAMPAIGN_OFFERS_PIECES,
  CAMPAIGN_OFFERS_PIECES_MAX,
  CAMPAIGN_OFFERS_TITLE_MAX,
  campaignOffersHiddenReason,
  campaignOffersScheduledPreviewNote,
} from '@estrelinha/core/home'
import {
  CampaignStatusPill,
  campaignsOpenForMarking,
  listaDeNomes,
  piecesNotLoweredText,
  piecesOffAirText,
  useCampaignMarks,
  useCampaignPiecesState,
  useCampaigns,
  type AdminCampaign,
} from '@/entities/campaign'
import { CharCounter, FormCard } from '@/shared/ui'
import ProductPicker from './ProductPicker'
import { campaignsTaken } from '../model/campaignOffersTaken'
import { ordinalF } from '../model/sectionRefusals'
import type { DraftItem } from '../model/sectionDraft'
import type { SectionEditorProps } from './sectionEditors'

const porInicio = (a: AdminCampaign, b: AdminCampaign) => Date.parse(a.starts_at) - Date.parse(b.starts_at)

/** Acrescenta sem repetir — a lista do que saiu acumula entre trocas de campanha. */
const junta = (atual: readonly string[], novos: readonly string[]) => [...new Set([...atual, ...novos])]

const AVISO = 'flex items-start gap-2 rounded-xl border p-3 text-xs'
const AVISO_ATENCAO = 'border-estrelinha-admin-amber/30 bg-estrelinha-admin-amber/5 text-foreground'
const AVISO_NEUTRO = 'border-border bg-muted/30 text-muted-foreground'

const CampaignOffersEditor = ({
  section,
  config,
  onConfigChange,
  items,
  onItemsChange,
  products,
  campaignId,
  onCampaignChange,
  sections,
}: SectionEditorProps) => {
  const { campaigns, loading: carregandoCampanhas, error: erroCampanhas, refetch } = useCampaigns()
  // O relógio do painel, uma vez por abertura: o estado de cada campanha não pisca enquanto a dona
  // edita, e é o mesmo relógio que a lista de Campanhas usa.
  const [agora] = useState(() => Date.now())

  const porId = useMemo(() => new Map(campaigns.map(c => [c.id, c])), [campaigns])
  const escolhida = campaignId ? (porId.get(campaignId) ?? null) : null
  const estado: CampaignStatus | null = escolhida ? campaignStatus(escolhida, agora) : null

  // As em vigência e as agendadas, na ordem do início — e a atual do bloco mesmo encerrada ou
  // desligada, para a dona ver o que está escolhido e em que estado.
  const opcoes = useMemo(() => {
    const abertas = campaignsOpenForMarking(campaigns, agora)
    if (!escolhida || abertas.some(c => c.id === escolhida.id)) return abertas
    return [...abertas, escolhida].sort(porInicio)
  }, [campaigns, agora, escolhida])

  const tomadas = useMemo(
    () => campaignsTaken(sections ?? [], section.id, id => porId.get(id)?.name ?? ''),
    [sections, section.id, porId],
  )

  // O aviso da campanha: sem campanha (a mesma frase para "nunca teve" e "foi apagada"), a agendada
  // (a prévia só mostra a partir do início) e a fora de vigência. Com campanha escolhida, só depois
  // de ler as campanhas: "ainda carregando" não é "sem campanha".
  const avisoDaCampanha = !campaignId
    ? CAMPAIGN_OFFERS_NO_CAMPAIGN
    : carregandoCampanhas || erroCampanhas
      ? null
      : estado === 'agendada' && escolhida
        ? campaignOffersScheduledPreviewNote(escolhida.starts_at)
        : campaignOffersHiddenReason(campaignId, estado)

  const marcas = useCampaignMarks(campaignId)

  const nomeDoItem = (item: DraftItem): string =>
    (item.product_id ? products.find(p => p.id === item.product_id)?.name : null) ??
    (item.label_snapshot?.trim() || 'Peça sem nome')

  // A conferência contra as marcações: uma vez por campanha, quando a leitura dela chega.
  const conferida = useRef<string | null>(null)
  const [sairamDaCampanha, setSairamDaCampanha] = useState<string[]>([])
  const [apagadas, setApagadas] = useState<string[]>([])

  useEffect(() => {
    if (!campaignId || !marcas.ids || conferida.current === campaignId) return
    conferida.current = campaignId

    const marcadas = new Set(marcas.ids)
    const ficam: DraftItem[] = []
    const foraDaCampanha: string[] = []
    const semPeca: string[] = []
    for (const item of items) {
      if (!item.product_id) semPeca.push(nomeDoItem(item))
      else if (!marcadas.has(item.product_id)) foraDaCampanha.push(nomeDoItem(item))
      else ficam.push(item)
    }
    if (ficam.length === items.length) return
    setSairamDaCampanha(atual => junta(atual, foraDaCampanha))
    setApagadas(atual => junta(atual, semPeca))
    onItemsChange(ficam)
    // A conferência reage à campanha e à chegada da leitura dela; `items` é lido no momento em que
    // ela chega, de propósito — reagir à lista desfaria a escolha seguinte da dona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, marcas.ids])

  const escolhidos = items.map(i => i.product_id).filter((id): id is string => !!id)
  // A conta "N das M saíram do ar" junta as peças do rascunho e as apagadas do catálogo que a seção
  // GRAVADA ainda tem (item sem id, pelo nome congelado): a apagada é escolhida até a dona salvar,
  // mesmo depois que a conferência a tirou do rascunho. Salvo, a seção relida já não a tem — e a
  // conta volta a ser a mesma da linha da lista, com o editor ainda aberto (`VIV-05`).
  const pecas = useCampaignPiecesState(campaignId, [
    ...items
      .filter(i => !!i.product_id)
      .map(i => ({ product_id: i.product_id, label_snapshot: i.label_snapshot ?? null })),
    ...[...(section.items ?? [])]
      .filter(i => !i.product_id)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map(i => ({ product_id: null, label_snapshot: i.label_snapshot ?? null })),
  ])
  const estadoPorId = new Map((pecas.states ?? []).map(s => [s.product_id, s.status]))
  const foraDoAr = pecas.states ? piecesOffAirText(pecas.states) : null
  const naoBarateadas = pecas.states ? piecesNotLoweredText(pecas.states) : null
  // O erro e a carga das MARCAÇÕES já são ditos no pé do cartão; aqui só os da leitura das peças.
  const conferenciaFalhou = !!campaignId && !marcas.error && !!pecas.error
  const conferindo = !!campaignId && !!marcas.ids && !pecas.error && pecas.loading

  const [arrastado, setArrastado] = useState<string | null>(null)

  const mover = (de: number, para: number) => {
    if (de === para || de < 0 || para < 0 || de >= items.length || para >= items.length) return
    const proximo = [...items]
    const [movido] = proximo.splice(de, 1)
    proximo.splice(para, 0, movido)
    onItemsChange(proximo)
  }

  const soltar = (destinoKey: string) => {
    if (!arrastado || arrastado === destinoKey) return
    mover(
      items.findIndex(i => i.key === arrastado),
      items.findIndex(i => i.key === destinoKey),
    )
    setArrastado(null)
  }

  return (
    <>
      <FormCard title="Conteúdo">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="ofertas-titulo">Título do bloco</Label>
            <CharCounter value={config.title ?? ''} limit={CAMPAIGN_OFFERS_TITLE_MAX} data-testid="contador-titulo" />
          </div>
          <Input
            id="ofertas-titulo"
            value={config.title ?? ''}
            onChange={e => onConfigChange({ title: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground">Vazio, o bloco usa o nome da campanha.</p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="ofertas-descricao">Descrição do bloco</Label>
            <CharCounter
              value={config.subtitle ?? ''}
              limit={CAMPAIGN_OFFERS_DESCRIPTION_MAX}
              data-testid="contador-descricao"
            />
          </div>
          <Textarea
            id="ofertas-descricao"
            rows={3}
            value={config.subtitle ?? ''}
            onChange={e => onConfigChange({ subtitle: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground">
            Vazia, o bloco diz os percentuais da campanha e que o valor de cada joia já aparece com o
            desconto.
          </p>
        </div>
      </FormCard>

      <FormCard title="Campanha">
        {avisoDaCampanha && (
          <p data-testid="aviso-campanha" className={cn(AVISO, AVISO_ATENCAO)}>
            {avisoDaCampanha}
          </p>
        )}

        {erroCampanhas ? (
          <div data-testid="campanhas-com-erro" className={cn(AVISO, AVISO_NEUTRO, 'flex-col')}>
            <p>
              <span className="font-semibold text-foreground">Não foi possível carregar as campanhas.</span>{' '}
              {erroCampanhas}
            </p>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : carregandoCampanhas ? (
          <p data-testid="campanhas-carregando" className={cn(AVISO, AVISO_NEUTRO)}>
            Carregando as campanhas…
          </p>
        ) : opcoes.length === 0 ? (
          <p data-testid="sem-campanhas" className={cn(AVISO, AVISO_NEUTRO)}>
            <span>
              Nenhuma campanha em vigência ou agendada. As campanhas se criam em{' '}
              <Link to="/admin/campanhas" className="font-medium text-primary underline">
                Campanhas
              </Link>
              .
            </span>
          </p>
        ) : (
          <div role="radiogroup" aria-label="Campanha do bloco" className="space-y-2">
            {opcoes.map(c => {
              const tomada = c.id === campaignId ? null : (tomadas.get(c.id) ?? null)
              return (
                <label
                  key={c.id}
                  data-testid={`opcao-campanha-${c.id}`}
                  className={cn(
                    'flex min-h-11 items-start gap-3 rounded-xl border p-3',
                    c.id === campaignId ? 'border-primary bg-primary/5' : 'border-input',
                    tomada ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
                  )}
                >
                  <input
                    type="radio"
                    name={`campanha-do-bloco-${section.id}`}
                    value={c.id}
                    checked={c.id === campaignId}
                    disabled={tomada !== null}
                    onChange={() => onCampaignChange(c.id)}
                    className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="break-words text-sm font-semibold text-foreground">{c.name}</span>
                      <CampaignStatusPill status={campaignStatus(c, agora)} />
                    </span>
                    <span data-testid={`vigencia-${c.id}`} className="block text-xs text-muted-foreground">
                      {campaignPeriodLabel(c)}
                    </span>
                    {tomada && (
                      <span data-testid={`campanha-tomada-${c.id}`} className="block text-xs text-muted-foreground">
                        {tomada}
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        )}
      </FormCard>

      <FormCard
        title="Peças escolhidas"
        action={
          <span data-testid="contador-pecas" className="text-xs text-muted-foreground">
            {items.length} de {CAMPAIGN_OFFERS_PIECES_MAX}
          </span>
        }
      >
        {sairamDaCampanha.length > 0 && (
          <p data-testid="pecas-que-sairam" className={cn(AVISO, AVISO_ATENCAO)}>
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {sairamDaCampanha.length === 1
                ? `${listaDeNomes(sairamDaCampanha)} não está marcada na campanha escolhida e saiu da lista.`
                : `${listaDeNomes(sairamDaCampanha)} não estão marcadas na campanha escolhida e saíram da lista.`}{' '}
              A remoção vale quando você salvar.
            </span>
          </p>
        )}

        {apagadas.length > 0 && (
          <p data-testid="pecas-apagadas" className={cn(AVISO, AVISO_ATENCAO)}>
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              {apagadas.length === 1
                ? `${listaDeNomes(apagadas)} foi apagada do catálogo e saiu da lista.`
                : `${listaDeNomes(apagadas)} foram apagadas do catálogo e saíram da lista.`}{' '}
              A remoção vale quando você salvar.
            </span>
          </p>
        )}

        {/* A conferência das escolhidas (no ar? a campanha baixa o preço?) que falhou ou ainda não
            chegou NÃO vira "todas aparecem": sem os avisos abaixo, a tela diria isso em silêncio. A
            falha das marcações já tem o aviso dela, no pé do cartão. */}
        {conferenciaFalhou && (
          <p data-testid="pecas-sem-conferencia" className={cn(AVISO, AVISO_ATENCAO)}>
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              Não foi possível conferir se as peças escolhidas estão no ar e se a campanha baixa o preço
              delas. Enquanto isso, a tela não sabe quais aparecem no bloco. {pecas.error}
            </span>
          </p>
        )}

        {conferindo && (
          <p data-testid="pecas-conferindo" className={cn(AVISO, AVISO_NEUTRO)}>
            Conferindo se as peças escolhidas estão no ar e com desconto…
          </p>
        )}

        {foraDoAr && (
          <p data-testid="pecas-fora-do-ar" className={cn(AVISO, AVISO_ATENCAO)}>
            {foraDoAr}
          </p>
        )}

        {naoBarateadas && (
          <p data-testid="pecas-nao-barateadas" className={cn(AVISO, AVISO_ATENCAO)}>
            {naoBarateadas}
          </p>
        )}

        {items.length === 0 && (
          <p data-testid="curadoria-vazia" className={cn(AVISO, AVISO_NEUTRO)}>
            Nenhuma peça escolhida. Sem peça escolhida, o bloco mostra as {CAMPAIGN_OFFERS_PIECES}{' '}
            primeiras peças da campanha.
          </p>
        )}

        <ul data-testid="curadoria" className="space-y-1">
          {items.map((item, indice) => {
            const status = item.product_id ? estadoPorId.get(item.product_id) : undefined
            return (
              <li
                key={item.key}
                data-testid={`peca-escolhida-${indice}`}
                draggable
                onDragStart={() => setArrastado(item.key)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  soltar(item.key)
                }}
                className={cn(
                  'flex flex-wrap items-center gap-1 rounded-lg border border-border/60 p-1.5',
                  indice >= CAMPAIGN_OFFERS_PIECES_MAX && 'opacity-70',
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
                <span
                  data-testid={`posicao-${indice}`}
                  className="shrink-0 text-[11px] font-semibold text-muted-foreground"
                >
                  {ordinalF(indice + 1)}
                </span>
                <span data-testid={`nome-peca-${indice}`} className="min-w-0 flex-1 break-words text-xs text-foreground">
                  {nomeDoItem(item)}
                </span>
                {status === 'fora-do-ar' && (
                  <span className="shrink-0 rounded bg-estrelinha-admin-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-estrelinha-admin-amber">
                    fora do ar
                  </span>
                )}
                {status === 'nao-barateada' && (
                  <span className="shrink-0 rounded bg-estrelinha-admin-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-estrelinha-admin-amber">
                    sem desconto
                  </span>
                )}
                <span className="flex shrink-0 items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid={`subir-peca-${indice}`}
                    aria-label={`Subir a ${ordinalF(indice + 1)} peça`}
                    disabled={indice === 0}
                    onClick={() => mover(indice, indice - 1)}
                    className="h-11 w-11 p-0 text-muted-foreground"
                  >
                    <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid={`descer-peca-${indice}`}
                    aria-label={`Descer a ${ordinalF(indice + 1)} peça`}
                    disabled={indice === items.length - 1}
                    onClick={() => mover(indice, indice + 1)}
                    className="h-11 w-11 p-0 text-muted-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid={`remover-peca-${indice}`}
                    aria-label={`Remover a ${ordinalF(indice + 1)} peça`}
                    onClick={() => onItemsChange(items.filter(i => i.key !== item.key))}
                    className="h-11 w-11 p-0 text-muted-foreground"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </span>
              </li>
            )
          })}
        </ul>

        {/* A busca só existe com a campanha escolhida e as marcações dela lidas: sem isso não há como
            restringir às peças da campanha, e oferecer o catálogo inteiro deixaria escolher peça que
            o bloco nunca mostraria. */}
        {!campaignId ? (
          <p data-testid="busca-indisponivel" className={cn(AVISO, AVISO_NEUTRO)}>
            Escolha a campanha do bloco para buscar as peças: ele mostra só as peças marcadas nela.
          </p>
        ) : marcas.error ? (
          <div data-testid="marcacoes-com-erro" className={cn(AVISO, AVISO_NEUTRO, 'flex-col')}>
            <p>
              <span className="font-semibold text-foreground">
                Não foi possível conferir as peças da campanha.
              </span>{' '}
              Nenhuma peça saiu da lista, e a busca volta quando a leitura der certo. {marcas.error}
            </p>
            <Button type="button" variant="outline" className="min-h-11" onClick={marcas.retry}>
              Tentar de novo
            </Button>
          </div>
        ) : !marcas.ids ? (
          <p data-testid="marcacoes-carregando" className={cn(AVISO, AVISO_NEUTRO)}>
            Conferindo as peças marcadas na campanha…
          </p>
        ) : marcas.ids.length === 0 ? (
          <p data-testid="campanha-sem-pecas" className={cn(AVISO, AVISO_NEUTRO)}>
            Nenhuma peça está marcada nesta campanha. Sem peça marcada, o bloco não tem o que mostrar.
          </p>
        ) : (
          <ProductPicker
            escolhidos={escolhidos}
            permitidos={marcas.ids}
            rotuloDoConjunto="na campanha"
            onPick={novo => onItemsChange([...items, novo])}
          />
        )}
      </FormCard>
    </>
  )
}

export default CampaignOffersEditor
