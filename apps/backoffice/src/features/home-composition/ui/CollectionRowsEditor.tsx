// O editor das fileiras de coleção (feature 24, T31 — `HOME-31`..`HOME-36`).
//
// É a tela onde a dona escolhe entre **deixar a Home se arrumar sozinha** e **mandar na vitrine**, e
// as três decisões que mandam aqui não são estéticas:
//
// 1. **Curadoria é a PRESENÇA de itens, não uma flag.** "Voltar ao automático" **apaga a lista**
//    (`HOME-33`) em vez de gravar `mode: 'auto'`. Uma flag seria dois donos do mesmo dado — o
//    "defeito 01" do projeto — e criaria um estado que a loja não sabe ler: `manual` com zero itens
//    é indistinguível de `auto` na vitrine e diferente no banco.
// 2. **A vaga que sobra fica vazia** (`HOME-34`). Escolhida que saiu do ar não é substituída pela
//    derivação: entraria na vitrine uma coleção que a dona não escolheu, justamente na seção onde
//    ela pediu para escolher. A tela diz isso com o número na mão, em vez de deixar a Home mostrar
//    três onde ela pediu quatro sem explicação.
// 3. **Reordenar aqui não mexe em `categories.sort_order`** (`HOME-35`). Foi um dos dois problemas
//    que abriram esta feature: mudar a vitrine mexia na barra do topo, porque os dois liam a mesma
//    coluna. Agora a ordem da Home mora em `home_section_items.position` — e a tela **afirma** isso,
//    porque quem já se queimou uma vez não confia de graça.

import { useState } from 'react'
import { CircleCheck, GripVertical, Info, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { DEFAULT_HOME_COMPOSITION, sectionMeta } from '@estrelinha/core/home'
import { bySortOrder } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import { FormCard } from '@/shared/ui'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'
import { ordinalF } from '../model/sectionRefusals'
import type { SectionEditorProps } from './sectionEditors'

/**
 * Quantas fileiras a Home mostra quando ninguém disse o contrário.
 *
 * Sai de `DEFAULT_HOME_COMPOSITION`, que é o dono declarado da "Home de hoje" — cravar `4` aqui
 * criaria a segunda resposta para um número que a semente do banco já dá.
 */
const PADRAO_FILEIRAS =
  DEFAULT_HOME_COMPOSITION.find(s => s.type === 'collection_rows')?.config?.limit ?? 4

/** Uma fileira do rascunho, já cruzada com o catálogo. */
interface Linha {
  item: DraftItem
  /** A coleção viva de destino — `null` quando ela saiu do ar. */
  categoria: AdminCategory | null
  /** O nome que a dona lê: o vivo, ou o congelado quando a coleção sumiu. */
  nome: string | null
  /** Por que esta fileira não vai desenhar — `null` quando vai. */
  motivo: string | null
}

/**
 * Cruza o rascunho com o catálogo.
 *
 * A resolução vive aqui e não em `useAdminResolvedHome` porque o que está na tela é o **rascunho**:
 * a fileira que a dona acabou de acrescentar ainda não existe no banco, e a seção resolvida não a
 * conhece. A regra de "saiu do ar" é a mesma dos dois lados — coleção ausente do catálogo ou
 * `active === false` —, e é ela que `resolveHomeSections` aplica na hora de contar `droppedCount`.
 */
const cruzar = (item: DraftItem, categories: readonly AdminCategory[]): Linha => {
  const congelado = item.label_snapshot?.trim() || null

  if (!item.category_id) {
    // Sem destino e com rótulo congelado é o estado do `on delete set null`: a coleção foi apagada.
    // Sem rótulo é fileira recém-acrescentada — não é "fora do ar", é "ainda não escolhi".
    return {
      item,
      categoria: null,
      nome: congelado,
      motivo: congelado ? 'apagada em Categorias · a loja pula esta fileira' : null,
    }
  }

  const categoria = categories.find(c => c.id === item.category_id) ?? null
  if (!categoria) {
    return {
      item,
      categoria: null,
      nome: congelado,
      motivo: 'apagada em Categorias · a loja pula esta fileira',
    }
  }
  if (categoria.active === false) {
    return {
      item,
      categoria: null,
      nome: categoria.name,
      motivo: 'desativada em Categorias · a loja pula esta fileira',
    }
  }
  return { item, categoria, nome: categoria.name, motivo: null }
}

/** O que a linha mostra de uma coleção no ar — o que a dona precisa para reconhecê-la sem abrir. */
const resumo = (categoria: AdminCategory): string => {
  const produtos = `${categoria.product_count ?? 0} ${
    (categoria.product_count ?? 0) === 1 ? 'produto' : 'produtos'
  }`
  return categoria.banner_url?.trim() ? `${produtos} · abre com banner próprio` : produtos
}

const CollectionRowsEditor = ({
  section,
  config,
  onConfigChange,
  items,
  onItemsChange,
  categories,
}: SectionEditorProps) => {
  const faixa = sectionMeta(section.type)?.limit ?? { min: 1, max: 8 }
  const limite = config.limit ?? PADRAO_FILEIRAS

  // O modo é de TELA, não de dado: no banco quem responde é a presença de itens. Ele existe só para
  // a dona poder dizer "eu escolho" antes de ter escolhido a primeira — sem ele, marcar a opção não
  // abriria lista nenhuma.
  const [manual, setManual] = useState(items.length > 0)
  const [arrastado, setArrastado] = useState<string | null>(null)

  const colecoes = [...categories].filter(c => c.active !== false).sort(bySortOrder)
  const linhas = items.map(item => cruzar(item, categories))
  const foraDoAr = linhas.filter(l => l.motivo !== null)
  const noAr = linhas.filter(l => l.categoria !== null)

  const patch = (key: string, mudanca: Partial<DraftItem>) =>
    onItemsChange(items.map(i => (i.key === key ? { ...i, ...mudanca } : i)))

  /**
   * `HOME-33` — voltar ao automático é **apagar a lista**, e nada mais.
   *
   * É a mesma operação do rádio "Automático": duas portas para o mesmo gesto, um handler só.
   */
  const voltarAoAutomatico = () => {
    setManual(false)
    onItemsChange([])
  }

  const soltar = (destinoKey: string) => {
    if (!arrastado || arrastado === destinoKey) return
    const de = items.findIndex(i => i.key === arrastado)
    const para = items.findIndex(i => i.key === destinoKey)
    if (de < 0 || para < 0) return
    const proximo = [...items]
    const [movido] = proximo.splice(de, 1)
    proximo.splice(para, 0, movido)
    onItemsChange(proximo)
    setArrastado(null)
  }

  const escolher = (item: DraftItem, id: string) => {
    const alvo = colecoes.find(c => c.id === id)
    // O rótulo é congelado JUNTO com a escolha: depois de a coleção ser apagada não há de onde
    // lê-lo, e a tela precisa poder dizer **qual** fileira se perdeu.
    patch(item.key, {
      category_id: id || null,
      label_snapshot: alvo?.name ?? (id ? item.label_snapshot : null),
    })
  }

  return (
    <>
      <FormCard title="Quem escolhe as coleções">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            role="radio"
            aria-checked={!manual}
            onClick={voltarAoAutomatico}
            className={cn(
              'flex min-h-11 flex-col gap-1.5 rounded-xl border p-3.5 text-left',
              !manual ? 'border-2 border-primary bg-primary/5' : 'border-input hover:bg-muted/50',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  !manual ? 'border-primary bg-primary' : 'border-input',
                )}
                aria-hidden
              >
                {!manual && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </span>
              Automático
            </span>
            <span className="text-xs text-muted-foreground">
              As {limite} primeiras coleções na ordem de Categorias. Coleção nova entra sozinha.
            </span>
          </button>

          <button
            type="button"
            role="radio"
            aria-checked={manual}
            onClick={() => setManual(true)}
            className={cn(
              'flex min-h-11 flex-col gap-1.5 rounded-xl border p-3.5 text-left',
              manual ? 'border-2 border-primary bg-primary/5' : 'border-input hover:bg-muted/50',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  manual ? 'border-primary bg-primary' : 'border-input',
                )}
                aria-hidden
              >
                {manual && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
              </span>
              Eu escolho
            </span>
            <span className="text-xs text-muted-foreground">
              Você define quais e em que ordem. Coleção nova só entra se você acrescentar.
            </span>
          </button>
        </div>

        {/* `HOME-35` na primeira pessoa. A promessa é verificável: a ordem daqui mora em
            `home_section_items.position`, e a da barra do topo continua sendo `categories.sort_order`. */}
        <p
          data-testid="fileiras-sort-order"
          className="flex items-start gap-2 text-xs text-muted-foreground"
        >
          <CircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          Reordenar aqui não mexe na barra do topo — a ordem do menu continua sendo a de Categorias.
        </p>
      </FormCard>

      <FormCard title="Quantas fileiras">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Uma fileira a menos"
            disabled={limite <= faixa.min}
            onClick={() => onConfigChange({ limit: limite - 1 })}
            className="h-11 w-11 md:h-9 md:w-9"
          >
            −
          </Button>
          <Input
            type="number"
            aria-label="Quantas fileiras"
            min={faixa.min}
            max={faixa.max}
            value={limite}
            onChange={e =>
              onConfigChange({ limit: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="h-11 w-16 text-center md:h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Uma fileira a mais"
            disabled={limite >= faixa.max}
            onClick={() => onConfigChange({ limit: limite + 1 })}
            className="h-11 w-11 md:h-9 md:w-9"
          >
            +
          </Button>
          {/* A faixa sai de `sectionMeta`, não de dois números digitados aqui: quem recusa ao salvar
              é `configRefusal`, e a dica precisa dizer a MESMA coisa que a recusa. */}
          <span className="text-xs text-muted-foreground">
            de {faixa.min} a {faixa.max} — acima disso a Home vira rolagem sem fim
          </span>
        </div>
      </FormCard>

      {manual && (
        <FormCard
          title="Coleções escolhidas"
          action={
            foraDoAr.length > 0 ? (
              <span data-testid="fileiras-fora-do-ar" className="text-xs font-semibold text-destructive">
                {foraDoAr.length === 1
                  ? `1 das ${linhas.length} saiu do ar`
                  : `${foraDoAr.length} das ${linhas.length} saíram do ar`}
              </span>
            ) : null
          }
          contentClassName="space-y-0"
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onItemsChange([...items, emptyDraftItem()])}
                className="min-h-11 border-dashed md:min-h-9"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Acrescentar coleção
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={voltarAoAutomatico}
                className="min-h-11 md:min-h-9"
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Voltar ao automático
              </Button>
            </div>
          }
        >
          {linhas.length === 0 && (
            <p data-testid="fileiras-vazia" className="py-2 text-sm text-muted-foreground">
              Você ainda não escolheu nenhuma coleção. Enquanto a lista estiver vazia, a Home segue no
              automático.
            </p>
          )}

          {linhas.map((linha, indice) => (
            <div
              key={linha.item.key}
              data-testid={`fileira-${indice}`}
              draggable
              onDragStart={() => setArrastado(linha.item.key)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                soltar(linha.item.key)
              }}
              className={cn(
                'flex items-start gap-3 border-b border-border/60 py-3 last:border-0',
                linha.motivo && 'bg-destructive/5',
              )}
            >
              <span className="flex w-4 shrink-0 justify-center pt-3">
                <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
              </span>
              <span className="w-5 shrink-0 pt-3 text-xs font-semibold text-muted-foreground">
                {indice + 1}
              </span>

              <div className="min-w-0 flex-1 space-y-1.5">
                <select
                  aria-label={`Coleção da ${ordinalF(indice + 1)} fileira`}
                  value={linha.item.category_id ?? ''}
                  onChange={e => escolher(linha.item, e.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm font-semibold text-foreground md:h-9"
                >
                  <option value="">Escolha uma coleção</option>
                  {/* A coleção que saiu do ar não está entre as opções vivas. Sem esta linha o
                      seletor mostraria a primeira do catálogo e a fileira trocaria de destino
                      sozinha — em silêncio, que é a falha que esta tela existe para acabar. */}
                  {linha.motivo && linha.item.category_id && (
                    <option value={linha.item.category_id}>
                      {linha.nome ?? 'Coleção'} (fora do ar)
                    </option>
                  )}
                  {colecoes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {linha.motivo ? (
                  <p
                    data-testid={`fileira-motivo-${indice}`}
                    className="text-xs font-medium text-destructive"
                  >
                    {linha.nome ? `“${linha.nome}” ` : ''}
                    {linha.motivo}
                  </p>
                ) : (
                  linha.categoria && (
                    <p className="text-xs text-muted-foreground">{resumo(linha.categoria)}</p>
                  )
                )}
              </div>

              <span
                className={cn(
                  'hidden shrink-0 pt-3 text-xs sm:inline',
                  linha.motivo ? 'font-semibold text-destructive' : 'text-muted-foreground',
                )}
              >
                {linha.motivo ? 'Fora do ar' : 'No ar'}
              </span>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remover a ${ordinalF(indice + 1)} fileira`}
                onClick={() => onItemsChange(items.filter(i => i.key !== linha.item.key))}
                className="h-11 w-11 shrink-0 text-muted-foreground md:h-9 md:w-9"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </FormCard>
      )}

      {manual && foraDoAr.length > 0 && (
        <div
          data-testid="fileiras-vaga-vazia"
          className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/30 p-4"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-foreground">
              {noAr.length === 0
                ? 'Nenhuma das escolhidas está no ar, então esta seção não vai aparecer.'
                : 'A vaga que sobra fica vazia'}
            </p>
            <p className="text-xs text-muted-foreground">
              {noAr.length === 0 ? (
                <>
                  Reative uma coleção em Categorias ou escolha outra aqui. Enquanto isso a Home passa
                  direto por esta seção — nunca uma fileira vazia, nunca um link quebrado.
                </>
              ) : (
                <>
                  Você pediu {limite} e{' '}
                  {foraDoAr.length === 1
                    ? 'uma escolhida saiu do ar'
                    : `${foraDoAr.length} escolhidas saíram do ar`}
                  , então a Home mostra {Math.min(noAr.length, limite)}. Não completamos com outra
                  coleção — entraria na sua vitrine algo que você não escolheu, justamente na seção
                  onde você pediu para escolher.
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

export default CollectionRowsEditor
