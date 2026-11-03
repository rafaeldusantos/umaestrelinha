// O editor de uma lista do Compre Junto (`/admin/compre-junto/listas/:id`).
//
// Isto NÃO é uma vitrine (`AD-019`): a lista não vira página nem desenho no painel. Quem mostra como
// o bloco fica é a loja. As frases de recusa vêm de `@estrelinha/core/buy-together`, a mesma regra
// que o banco espelha — uma segunda redação faria a tela recusar o que o banco aceita.

import { useEffect, useMemo, useState } from 'react'
import { ListChecks, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import {
  BUY_TOGETHER_LIST_ITEMS_MAX,
  BUY_TOGETHER_LIST_NAME_MAX,
  listNameRefusal,
} from '@estrelinha/core/buy-together'
import { CharCounter, FormCard, RecordPageHeader } from '@/shared/ui'
import { ProductSearchField } from '@/entities/product'
import {
  useBuyTogetherListWrites,
  type ListaDoCompreJunto,
} from '../api/useBuyTogetherLists'
import {
  addItem,
  dropItem,
  moveItem,
  releaseAll,
  removeItem,
  sameDraft,
  toggleVariant,
  type DraftItem,
} from '../model/draft'
import ListItemRow from './ListItemRow'

export interface BuyTogetherListEditorProps {
  /** `null` = lista nova. */
  lista: ListaDoCompreJunto | null
  onBack: () => void
  /** Chamado com o id depois de gravar uma lista nova (a tela troca o endereço). */
  onCreated: (id: string) => void
  /** Chamado depois de excluir. */
  onDeleted: () => void
}

const inicial = (lista: ListaDoCompreJunto | null) => ({
  name: lista?.name ?? '',
  items: (lista?.pecas ?? []).map<DraftItem>(p => ({ productId: p.productId, variantIds: p.variantIds })),
})

const NOMES_MOSTRADOS = 4
/** A busca de peça só lista a partir de 2 letras, e desenha até 8 linhas. */
const LETRAS_PARA_BUSCAR = 2
const RESULTADOS_DA_BUSCA = 8

const BuyTogetherListEditor = ({ lista, onBack, onCreated, onDeleted }: BuyTogetherListEditorProps) => {
  const { save, remove } = useBuyTogetherListWrites()
  const [saved, setSaved] = useState(() => inicial(lista))
  const [name, setName] = useState(saved.name)
  const [items, setItems] = useState<DraftItem[]>(saved.items)
  const [abertas, setAbertas] = useState<string[]>([])
  const [arrastada, setArrastada] = useState<string | null>(null)
  const [recusa, setRecusa] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  // A lista chega do servidor depois da primeira renderização: o rascunho parte dela uma vez por id.
  const id = lista?.id ?? null
  useEffect(() => {
    const base = inicial(lista)
    setSaved(base)
    setName(base.name)
    setItems(base.items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const sujo = useMemo(() => !sameDraft({ name, items }, saved), [name, items, saved])
  const nomeRecusado = listNameRefusal(name)
  const usadaEm = lista?.usadaEm ?? []

  const acrescentar = (productId: string) => {
    const r = addItem(items, productId)
    setRecusa(r.refusal)
    if (!r.refusal) setItems(r.items)
  }

  const salvar = async () => {
    setSalvando(true)
    const r = await save(id, name, items)
    setSalvando(false)
    if (r.refusal) {
      setRecusa(r.refusal)
      return
    }
    setRecusa(null)
    setSaved({ name: name.trim(), items })
    setName(n => n.trim())
    toast({ title: 'Lista salva.' })
    if (id === null && r.id) onCreated(r.id)
  }

  const excluir = async () => {
    if (!id) return
    const motivo = await remove(id, usadaEm)
    if (motivo) {
      setRecusa(motivo)
      return
    }
    toast({ title: `Lista “${saved.name}” excluída.` })
    onDeleted()
  }

  const estado = nomeRecusado
    ? 'Dê um nome à lista para salvar.'
    : salvando
      ? 'Salvando…'
      : sujo
        ? 'Alterações não salvas'
        : 'Tudo salvo'

  return (
    <div className="pb-24">
      <RecordPageHeader
        parentLabel="Compre Junto"
        crumb={saved.name || 'Nova lista'}
        title={saved.name || 'Nova lista'}
        subtitle="A ordem daqui é a ordem em que a cliente vê as peças, em todas as joias que usam esta lista."
        actions={
          id && (
            <Button type="button" variant="outline" className="min-h-11" onClick={() => void excluir()}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Excluir lista
            </Button>
          )
        }
        onBack={onBack}
      />

      {recusa && (
        <p
          role="alert"
          data-testid="faixa-de-recusa"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {recusa}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-4">
          <FormCard title="Lista">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="nome-da-lista">Nome da lista</Label>
                <CharCounter value={name} limit={BUY_TOGETHER_LIST_NAME_MAX} espacado data-testid="contador-do-nome" />
              </div>
              <Input
                id="nome-da-lista"
                value={name}
                maxLength={BUY_TOGETHER_LIST_NAME_MAX}
                placeholder="Correntes"
                aria-describedby="dica-do-nome-da-lista"
                onChange={e => setName(e.target.value)}
              />
              <p id="dica-do-nome-da-lista" className="text-xs text-muted-foreground">
                É este nome que a cliente lê no Compre Junto, na página de cada joia que usa a lista. Escreva como
                você falaria com ela: “Correntes”, “Pingentes para a mesma corrente”.
              </p>
            </div>
          </FormCard>

          <FormCard
            title="Peças da lista"
            action={
              <span data-testid="contador-de-pecas" className="text-xs text-muted-foreground">
                {items.length} de {BUY_TOGETHER_LIST_ITEMS_MAX}
              </span>
            }
          >
            <ProductSearchField
              rotulo="Acrescentar uma peça"
              id="busca-da-lista"
              placeholder="Buscar pelo nome da joia"
              minimoDeLetras={LETRAS_PARA_BUSCAR}
              teto={RESULTADOS_DA_BUSCA}
              selecionados={items.map(i => i.productId)}
              rotuloJaEscolhida="Já está na lista"
              bloquearForaDoAr
              mostrarPreco
              onEscolher={p => acrescentar(p.id)}
            />

            {items.length === 0 ? (
              <p data-testid="lista-sem-pecas" className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Nenhuma peça ainda.</span> A lista só pode ser usada numa joia depois de ter pelo menos uma.
              </p>
            ) : (
              <ol data-testid="pecas-da-lista" className="space-y-2">
                {items.map((item, indice) => (
                  <ListItemRow
                    key={item.productId}
                    productId={item.productId}
                    position={indice}
                    total={items.length}
                    variantIds={item.variantIds}
                    open={abertas.includes(item.productId)}
                    onToggleOpen={() =>
                      setAbertas(a => (a.includes(item.productId) ? a.filter(x => x !== item.productId) : [...a, item.productId]))
                    }
                    onMove={delta => setItems(moveItem(items, indice, indice + delta))}
                    onRemove={() => {
                      setRecusa(null)
                      setItems(removeItem(items, item.productId))
                    }}
                    onToggleVariant={v => setItems(toggleVariant(items, item.productId, v))}
                    onReleaseAll={() => setItems(releaseAll(items, item.productId))}
                    onDragStart={() => setArrastada(item.productId)}
                    onDrop={() => {
                      if (arrastada) setItems(dropItem(items, arrastada, item.productId))
                      setArrastada(null)
                    }}
                  />
                ))}
              </ol>
            )}
          </FormCard>
        </div>

        <aside className="min-w-0 space-y-4">
          <FormCard title="Em uso">
            {usadaEm.length === 0 ? (
              <p data-testid="em-uso" className="text-xs text-muted-foreground">
                Nenhuma joia usa esta lista ainda. Ela entra na loja quando você a escolher no Compre Junto de uma joia.
              </p>
            ) : (
              <div data-testid="em-uso" className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-semibold text-foreground">
                    {usadaEm.length} {usadaEm.length === 1 ? 'joia oferece' : 'joias oferecem'} esta lista.
                  </span>{' '}
                  Mudar aqui muda o Compre Junto de todas elas.
                </p>
                <ul>
                  {usadaEm.slice(0, NOMES_MOSTRADOS).map(n => (
                    <li key={n} className="truncate">{n}</li>
                  ))}
                </ul>
                {usadaEm.length > NOMES_MOSTRADOS && <p>Ver as {usadaEm.length} joias</p>}
              </div>
            )}
          </FormCard>
          <FormCard title="Como a cliente vê">
            <p className="flex gap-2 text-xs text-muted-foreground">
              <ListChecks className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Na página da joia, o bloco mostra o nome da lista e as peças nesta ordem, e a cliente escolhe uma.
              Peças fora do ar, sem nenhuma variação à venda, ou que sejam a própria joia da página são puladas.
            </p>
          </FormCard>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 md:left-auto">
        <span data-testid="estado-de-gravacao" className="text-xs text-muted-foreground">{estado}</span>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="min-h-11" onClick={onBack}>
            Voltar
          </Button>
          <Button type="button" className="min-h-11" disabled={salvando || nomeRecusado !== null} onClick={() => void salvar()}>
            Salvar lista
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BuyTogetherListEditor
