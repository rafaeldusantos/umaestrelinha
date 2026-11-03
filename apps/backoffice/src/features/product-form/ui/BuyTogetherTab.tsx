// A aba "Compre junto" do formulário do produto: até três adicionais, cada um uma peça ou uma lista.
//
// Nenhuma regra é redigida aqui. O teto, a joia como adicional de si mesma e a peça repetida vêm de
// `@estrelinha/core/buy-together` (via `../model/addons`), e a busca é o `ProductSearchField` — o
// painel não desenha vitrine (`AD-019`). A peça é lida por id (`useProductVariants`), nunca por nome.
// O rascunho vive no formulário do produto e é gravado DEPOIS dele (`persistAddons`).

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { BUY_TOGETHER_ADDONS_MAX, addonCountRefusal } from '@estrelinha/core/buy-together'
import { PecaFoto, ProductSearchField, useProductVariants } from '@/entities/product'
import { useBuyTogetherLists, type ListaDoCompreJunto } from '@/features/buy-together-lists'
import { FormCard } from '@/shared/ui'
import {
  addAddon,
  chooseList,
  chooseProduct,
  clearTarget,
  incompleteNote,
  moveAddon,
  releaseAllTargetVariants,
  removeAddon,
  setKind,
  targetsOutside,
  toggleHiddenOn,
  toggleTargetVariant,
  type AddonDraft,
} from '../model/addons'

export interface MainVariantOption {
  id: string
  label: string
}

interface Props {
  /** O produto sendo editado; `null` num produto novo. Ele nunca é escolhível como adicional. */
  mainProductId: string | null
  addons: AddonDraft[]
  onChange: (addons: AddonDraft[]) => void
  /** As variações já gravadas da joia — só elas podem ser marcadas em "Some quando". */
  mainVariants: MainVariantOption[]
}

const TAP =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent'

const CHIP =
  'flex min-h-11 items-center gap-2 rounded-lg border px-2 py-1 text-xs transition-colors motion-reduce:transition-none'

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

interface RowProps {
  index: number
  total: number
  addon: AddonDraft
  addons: AddonDraft[]
  mainProductId: string | null
  mainVariants: MainVariantOption[]
  listas: ListaDoCompreJunto[]
  onChange: (addons: AddonDraft[]) => void
  onRemove: () => void
}

const ListChoice = ({
  addon,
  listas,
  mainProductId,
  onPick,
}: {
  addon: AddonDraft
  listas: ListaDoCompreJunto[]
  mainProductId: string | null
  onPick: (id: string) => void
}) => {
  const escolhida = listas.find(l => l.id === addon.listId) ?? null
  const contemPrincipal = !!escolhida && !!mainProductId && escolhida.pecas.some(p => p.productId === mainProductId)
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Lista do adicional" className="space-y-1.5">
        {listas.map(l => {
          const vazia = l.pecas.length === 0
          const marcada = addon.listId === l.id
          return (
            <label
              key={l.id}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                marcada ? 'border-primary bg-primary/5' : 'border-input',
                vazia && 'cursor-not-allowed opacity-60',
              )}
            >
              <input
                type="radio"
                name={`lista-${addon.key}`}
                checked={marcada}
                disabled={vazia}
                onChange={() => onPick(l.id)}
                className="h-4 w-4"
              />
              <span className="flex -space-x-2">
                {l.pecas.slice(0, 3).map(p => (
                  <PecaFoto key={p.productId} url={p.imagem} tamanho={28} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-foreground">{l.name}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {vazia
                    ? 'Lista sem peças'
                    : `${plural(l.pecas.length, 'peça', 'peças')} · ${
                        l.usadaEm.length === 0 ? 'em nenhuma joia' : `em uso em ${plural(l.usadaEm.length, 'joia', 'joias')}`
                      }`}
                </span>
              </span>
            </label>
          )
        })}
        {listas.length === 0 && (
          <p className="text-xs text-muted-foreground">Ainda não há listas. Crie a primeira para usá-la aqui.</p>
        )}
      </div>
      {contemPrincipal && (
        <p data-testid="lista-com-principal" className="text-xs text-muted-foreground">
          Esta joia está na lista e é pulada aqui: ela nunca é oferecida junto de si mesma.
        </p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        {escolhida && (
          <a
            className="inline-flex min-h-11 items-center text-primary underline"
            href={`/admin/compre-junto/listas/${escolhida.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Editar a lista “{escolhida.name}”
          </a>
        )}
        <a
          className="inline-flex min-h-11 items-center text-primary underline"
          href="/admin/compre-junto/listas/nova"
          target="_blank"
          rel="noreferrer"
        >
          Criar uma lista nova
        </a>
      </div>
    </div>
  )
}

const ProductChoice = ({
  index,
  addon,
  addons,
  mainProductId,
  onChange,
}: Pick<RowProps, 'index' | 'addon' | 'addons' | 'mainProductId' | 'onChange'>) => {
  const [recusa, setRecusa] = useState<string | null>(null)
  const { peca, carregando } = useProductVariants(addon.targetProductId)

  if (addon.targetProductId === null) {
    return (
      <div className="space-y-1.5">
        <ProductSearchField
          id={`busca-adicional-${index + 1}`}
          rotulo={`Peça do adicional ${index + 1}`}
          modo="multiplo"
          selecionados={targetsOutside(addons, addon.key)}
          bloqueados={mainProductId ? { [mainProductId]: 'É esta joia' } : undefined}
          rotuloJaEscolhida="Já está em outro adicional"
          bloquearForaDoAr
          onEscolher={produto => {
            const r = chooseProduct(addons, addon.key, mainProductId, produto.id)
            setRecusa(r.refusal)
            if (!r.refusal) onChange(r.addons)
          }}
        />
        {recusa && (
          <p role="alert" className="text-xs text-destructive">
            {recusa}
          </p>
        )}
      </div>
    )
  }

  const foraDoAr = !carregando && (peca === null || !peca.ativa)
  const ativas = peca?.variacoes ?? []
  const vivas = ativas.filter(v => addon.targetVariantIds.includes(v.id))
  const semNenhumaViva = addon.targetVariantIds.length > 0 && !!peca && vivas.length === 0

  return (
    <div className="space-y-2">
      <div
        data-testid={`peca-escolhida-${index}`}
        className={cn(
          'flex items-center gap-2 rounded-lg border p-2',
          foraDoAr ? 'border-estrelinha-admin-amber/40 bg-estrelinha-admin-amber/5' : 'border-border/60',
        )}
      >
        <PecaFoto url={peca?.imagem} tamanho={44} />
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {peca?.nome ?? (carregando ? 'Carregando…' : 'Peça sem nome')}
        </p>
        {foraDoAr && (
          <span
            data-testid={`saiu-do-ar-${index}`}
            className="shrink-0 rounded bg-estrelinha-admin-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-estrelinha-admin-amber"
          >
            saiu do ar
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-11"
          onClick={() => onChange(clearTarget(addons, addon.key))}
        >
          Trocar
        </Button>
      </div>

      {foraDoAr && (
        <p className="text-xs text-muted-foreground">
          Esta peça saiu do ar. A loja pula este adicional até ela voltar; troque a peça se não for voltar.
        </p>
      )}

      {!foraDoAr && ativas.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Variações oferecidas</p>
          <ul className="flex flex-wrap gap-2">
            {ativas.map(v => {
              const marcada = addon.targetVariantIds.includes(v.id)
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-pressed={marcada}
                    onClick={() => onChange(toggleTargetVariant(addons, addon.key, v.id))}
                    className={cn(
                      CHIP,
                      marcada ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    <PecaFoto url={v.imagem} tamanho={28} />
                    {v.rotulo}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span>Nenhuma marcada vale todas as ativas, inclusive as que você criar depois.</span>
            {addon.targetVariantIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-11"
                onClick={() => onChange(releaseAllTargetVariants(addons, addon.key))}
              >
                Oferecer todas
              </Button>
            )}
          </div>
          {semNenhumaViva && (
            <p className="text-xs text-destructive">
              Nenhuma das variações escolhidas existe mais. A loja pula este adicional até você escolher outras.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const AddonRow = ({ index, total, addon, addons, mainProductId, mainVariants, listas, onChange, onRemove }: RowProps) => {
  const { peca } = useProductVariants(addon.kind === 'product' ? addon.targetProductId : null)
  const lista = listas.find(l => l.id === addon.listId)
  const nome =
    addon.kind === 'list' ? lista?.name : peca?.nome
  const titulo = nome ?? `Adicional ${index + 1}`
  const escondidoEm = mainVariants.filter(v => addon.hiddenOnVariantIds.includes(v.id))

  return (
    <li data-testid={`adicional-${index}`} className="space-y-3 rounded-xl border border-border/60 p-3">
      <div className="flex items-center gap-2">
        <span className="w-5 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">{index + 1}</span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{titulo}</p>
        <button
          type="button"
          className={TAP}
          disabled={index === 0}
          aria-label={`Subir o adicional ${index + 1}`}
          onClick={() => onChange(moveAddon(addons, index, index - 1))}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          className={TAP}
          disabled={index === total - 1}
          aria-label={`Descer o adicional ${index + 1}`}
          onClick={() => onChange(moveAddon(addons, index, index + 1))}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" className={TAP} aria-label={`Tirar o adicional ${index + 1}`} onClick={onRemove}>
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-foreground">O que a cliente escolhe</legend>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['list', 'Uma peça de uma lista'],
              ['product', 'Uma peça só'],
            ] as const
          ).map(([kind, rotulo]) => (
            <button
              key={kind}
              type="button"
              aria-pressed={addon.kind === kind}
              onClick={() => onChange(setKind(addons, addon.key, kind))}
              className={cn(
                CHIP,
                'px-3 text-sm',
                addon.kind === kind ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </fieldset>

      {addon.kind === 'list' ? (
        <ListChoice
          addon={addon}
          listas={listas}
          mainProductId={mainProductId}
          onPick={id => onChange(chooseList(addons, addon.key, id))}
        />
      ) : (
        <ProductChoice index={index} addon={addon} addons={addons} mainProductId={mainProductId} onChange={onChange} />
      )}

      {mainVariants.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-foreground">Some quando a cliente escolhe</p>
          <ul className="flex flex-wrap gap-2">
            {mainVariants.map(v => {
              const marcada = addon.hiddenOnVariantIds.includes(v.id)
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    aria-pressed={marcada}
                    onClick={() => onChange(toggleHiddenOn(addons, addon.key, v.id))}
                    className={cn(
                      CHIP,
                      marcada ? 'border-primary bg-primary/5 font-semibold text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50',
                    )}
                  >
                    {v.label}
                  </button>
                </li>
              )
            })}
          </ul>
          <p data-testid={`some-quando-${index}`} className="text-[11px] text-muted-foreground">
            {escondidoEm.length > 0
              ? `Com ${escondidoEm.map(v => v.label).join(' ou ')} escolhido nesta joia, este adicional sai do bloco.`
              : 'Nenhuma marcada: o adicional aparece em todas as variações desta joia. Marque, por exemplo, Chaveiro numa oferta de corrente.'}
          </p>
        </div>
      )}
    </li>
  )
}

const BuyTogetherTab = ({ mainProductId, addons, onChange, mainVariants }: Props) => {
  const { listas } = useBuyTogetherLists()
  const [tentouAcrescentar, setTentouAcrescentar] = useState(false)

  const naoCabe = addonCountRefusal(addons.length + 1)
  const recusa = tentouAcrescentar && naoCabe ? naoCabe : null
  const incompleto = incompleteNote(addons)

  const acrescentar = () => {
    const r = addAddon(addons)
    if (r.refusal) {
      setTentouAcrescentar(true)
      return
    }
    onChange(r.addons)
  }

  return (
    <div className="space-y-4">
      <FormCard
        title="Compre junto"
        description="O que a cliente pode levar junto desta joia. Cada adicional é uma peça só ou uma peça de uma lista."
        action={
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {addons.length} de {BUY_TOGETHER_ADDONS_MAX} adicionais
          </span>
        }
      >
        {addons.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem Compre Junto. A página desta joia fica como hoje, sem o bloco.</p>
        ) : (
          <ol className="space-y-3">
            {addons.map((a, i) => (
              <AddonRow
                key={a.key}
                index={i}
                total={addons.length}
                addon={a}
                addons={addons}
                mainProductId={mainProductId}
                mainVariants={mainVariants}
                listas={listas}
                onChange={onChange}
                onRemove={() => {
                  setTentouAcrescentar(false)
                  onChange(removeAddon(addons, a.key))
                }}
              />
            ))}
          </ol>
        )}

        <div className="space-y-1.5">
          <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={acrescentar}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Acrescentar um adicional
          </Button>
          {recusa && (
            <p role="alert" data-testid="recusa-do-quarto" className="text-sm text-destructive">
              {recusa}
            </p>
          )}
          {incompleto && (
            <p data-testid="adicional-incompleto" className="text-sm text-destructive">
              {incompleto}
            </p>
          )}
        </div>
      </FormCard>

      <FormCard title="Quando a peça sai do ar">
        <p className="text-sm text-muted-foreground">
          A loja pula o adicional sem quebrar a página, e o painel o marca. Se todas as variações escolhidas deixarem
          de existir, ele também sai: nunca passa a oferecer todas.
        </p>
      </FormCard>
    </div>
  )
}

export default BuyTogetherTab
