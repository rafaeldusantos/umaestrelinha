// As peças da proposta (feature 89, `MON-05`, `MON-06`).
//
// - **A busca é a do dono único** (`ProductSearchField`, `AD-036`). A peça desativada nem aparece: o
//   servidor a recusaria na gravação ("não está à venda"). A mesma peça pode entrar duas vezes, com
//   variações diferentes — por isso a busca não marca "já escolhida".
// - **Cada linha relê a peça por id** (`useProductVariants`) e se acerta sozinha: grade ativa ⇒ pede a
//   variação (só as ativas, com estoque — `VariantPicker`); sem grade ⇒ o preço base. Isso vale
//   também para a linha que veio de uma proposta gravada (editar e duplicar, `DUP-01`): o preço de
//   hoje entra no resumo, e a variação que foi pausada desde então volta a ser pedida.
// - **Gravação com o teto da loja**: o campo só existe na linha que grava (`hasEngraving`) e o limite
//   é `engravingLimit` da peça, o mesmo da página do produto.
// - **"Pede material da cliente"** (`MON-06`), com a palavra que o resto do painel usa.

import { useEffect, useId, useMemo } from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { formatPrice } from '@estrelinha/core/formatters'
import { engravingLimit, engravingRefusal } from '@estrelinha/core/material'
import { PROPOSAL_MAX_QTY } from '@estrelinha/core/proposals'
import {
  ProductSearchField,
  VariantPicker,
  useProductPool,
  useProductVariants,
} from '@/entities/product'
import { CharCounter, FormCard } from '@/shared/ui'
import type { DraftLine } from '../model/draft'
import { MATERIAL_TAG, acertoDaLinha, linhaNova } from '../model/lines'

interface Props {
  lines: readonly DraftLine[]
  onAdd: (line: DraftLine) => void
  onUpdate: (key: string, patch: Partial<DraftLine>) => void
  onRemove: (key: string) => void
}

const mesmo = (line: DraftLine, patch: Partial<DraftLine>) =>
  (Object.keys(patch) as (keyof DraftLine)[]).every((k) => JSON.stringify(line[k]) === JSON.stringify(patch[k]))

const LinhaDaPeca = ({ line, onUpdate, onRemove }: { line: DraftLine } & Pick<Props, 'onUpdate' | 'onRemove'>) => {
  const base = useId()
  const { peca, carregando, erro, recarregar } = useProductVariants(line.product_id)
  const pausada = !!peca && line.variant_id !== null && !peca.variacoes.some((v) => v.id === line.variant_id)

  useEffect(() => {
    if (!peca) return
    const patch = acertoDaLinha(line, peca)
    if (!mesmo(line, patch)) onUpdate(line.key, patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peca, line.variant_id])

  const limite = engravingLimit(line.engraving_max)
  const recusaDaGravacao = line.engraves ? engravingRefusal(line.engraving_text, line.engraving_max) : null
  const qtd = (n: number) => onUpdate(line.key, { quantity: Math.min(PROPOSAL_MAX_QTY, Math.max(1, Math.trunc(n) || 1)) })

  return (
    <li data-testid="linha-da-peca" className="space-y-3 rounded-xl border border-input p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{line.product_name}</p>
          {line.variant_label && <p className="break-words text-xs text-muted-foreground">{line.variant_label}</p>}
          {line.requires_material && (
            <p data-testid="pede-material" className="mt-1 text-xs font-medium text-estrelinha-admin-amber">
              {MATERIAL_TAG}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(line.key)}
          aria-label={`Tirar ${line.product_name}`}
          className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {carregando && <p className="text-xs text-muted-foreground">Carregando a peça…</p>}
      {erro !== null && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>Não consegui ler a peça. {erro}</span>
          <button type="button" onClick={recarregar} className="min-h-11 rounded-lg border border-input px-3 font-medium text-foreground">
            Tentar de novo
          </button>
        </div>
      )}

      {peca && peca.variacoes.length > 0 && (
        <div className="space-y-1.5">
          {pausada && (
            <p role="status" className="text-xs text-destructive">
              A variação escolhida não está mais ativa. Escolha outra.
            </p>
          )}
          <VariantPicker
            rotulo={`Variação de ${line.product_name}`}
            variacoes={peca.variacoes}
            politica={peca.politica}
            escolhida={line.variant_id}
            onEscolher={(v) =>
              onUpdate(line.key, {
                variant_id: v.id,
                variant_label: v.rotulo,
                list_price: v.preco,
                engraves: v.grava,
                dimensions: { ...peca.medidas, weight_kg: v.peso ?? peca.medidas.weight_kg },
              })
            }
          />
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <label htmlFor={`${base}-qtd`} className="text-xs font-medium text-foreground">
            Quantidade
          </label>
          {/* `flex-wrap`: com a fonte do sistema a 200 % os três (~312px) não cabem no cartão em 390
              (prova em navegador da T27). */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              aria-label={`Menos uma unidade de ${line.product_name}`}
              disabled={line.quantity <= 1}
              onClick={() => qtd(line.quantity - 1)}
              className="flex min-h-11 w-11 items-center justify-center rounded-lg border border-input disabled:opacity-50"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <Input
              id={`${base}-qtd`}
              type="number"
              inputMode="numeric"
              min={1}
              max={PROPOSAL_MAX_QTY}
              className="h-11 w-16 text-center"
              value={line.quantity}
              onChange={(e) => qtd(Number(e.target.value))}
            />
            <button
              type="button"
              aria-label={`Mais uma unidade de ${line.product_name}`}
              disabled={line.quantity >= PROPOSAL_MAX_QTY}
              onClick={() => qtd(line.quantity + 1)}
              className="flex min-h-11 w-11 items-center justify-center rounded-lg border border-input disabled:opacity-50"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
        {line.list_price !== null && (
          <p data-testid="preco-da-linha" className="text-sm tabular-nums text-foreground">
            {formatPrice(line.list_price)} cada
          </p>
        )}
      </div>

      {line.engraves && (
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${base}-gravacao`} className="text-xs font-medium text-foreground">
              Gravação
            </label>
            <CharCounter value={line.engraving_text} limit={limite} />
          </div>
          <Input
            id={`${base}-gravacao`}
            className="h-11"
            maxLength={limite}
            value={line.engraving_text}
            onChange={(e) => onUpdate(line.key, { engraving_text: e.target.value })}
          />
          {recusaDaGravacao && (
            <p role="alert" className="text-xs text-destructive">
              {recusaDaGravacao}
            </p>
          )}
        </div>
      )}
    </li>
  )
}

const ItemsSection = ({ lines, onAdd, onUpdate, onRemove }: Props) => {
  const { produtos } = useProductPool()
  // A peça desativada nem aparece (o servidor recusaria). A chave textual evita refazer a lista.
  const inativas = useMemo(() => produtos.filter((p) => !p.is_active).map((p) => p.id), [produtos])

  return (
    <FormCard title="Peças" action={<span className="text-xs text-muted-foreground">{lines.length} na proposta</span>}>
      {lines.length > 0 && (
        <ul aria-label="Peças da proposta" className="space-y-2">
          {lines.map((l) => (
            <LinhaDaPeca key={l.key} line={l} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}
      <ProductSearchField
        id="proposta-busca-de-peca"
        rotulo="Acrescentar peça"
        modo="multiplo"
        excluir={inativas}
        mostrarPreco
        onEscolher={(p) => onAdd(linhaNova(p))}
      />
    </FormCard>
  )
}

export default ItemsSection
