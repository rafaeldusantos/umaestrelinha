// Os valores de um grupo — feature 66 (`FLT-06`, `FLT-07`).
//
// Acrescentar, renomear (nome e endereço, na própria linha), reordenar arrastando e remover. Toda
// gravação passa pelo hook do catálogo, que recusa com a régua de `core` antes da rede; esta lista
// mostra a frase e mantém o que foi digitado.
//
// **Remover um valor com peças marcadas pede confirmação dizendo quantas perdem a marcação**
// (`FLT-07`). Sem peças, remove direto — não há o que perder, e um diálogo ali seria só mais um
// clique.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, GripVertical, Pencil, Plus, X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import { FILTER_VALUES_MAX, filterSlug, valueLimitRefusal } from '@estrelinha/core/filters'
import type { AdminFilterGroup, AdminFilterValue } from '@/entities/filter'
import { pecasMarcadasLabel, perdaDoValor } from '../model/copy'
import { moverParaPosicao } from '../model/ordem'

interface Props {
  group: AdminFilterGroup
  onCreate: (draft: { name: string; slug: string }) => Promise<{ error: string | null }>
  onUpdate: (id: string, patch: { name: string; slug: string }) => Promise<string | null>
  onRemove: (id: string) => Promise<string | null>
  onReorder: (ids: string[]) => Promise<string | null>
}

const LinhaEmEdicao = ({
  valor,
  onSalvar,
  onCancelar,
}: {
  valor: AdminFilterValue
  onSalvar: (patch: { name: string; slug: string }) => Promise<string | null>
  onCancelar: () => void
}) => {
  const [nome, setNome] = useState(valor.name)
  const [endereco, setEndereco] = useState(valor.slug)
  const [recusa, setRecusa] = useState<string | null>(null)
  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecusa(await onSalvar({ name: nome, slug: endereco }))
  }
  return (
    <form onSubmit={salvar} className="flex-1 space-y-2" aria-label={`Editar “${valor.name}”`}>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Input aria-label="Nome do valor" value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        <Input aria-label="Endereço do valor" value={endereco} onChange={e => setEndereco(e.target.value)} />
      </div>
      {endereco.trim() !== valor.slug && (
        <p className="text-xs text-muted-foreground">Mudar o endereço quebra links já compartilhados com este valor.</p>
      )}
      {recusa && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {recusa}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-11">
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-11" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

const ValueList = ({ group, onCreate, onUpdate, onRemove, onReorder }: Props) => {
  const [novoNome, setNovoNome] = useState('')
  const [recusa, setRecusa] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState<AdminFilterValue | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)

  const teto = valueLimitRefusal(group.values.length)
  const ids = group.values.map(v => v.id)

  const acrescentar = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await onCreate({ name: novoNome, slug: filterSlug(novoNome) })
    setRecusa(error)
    // Só limpa o campo quando gravou: a recusa mantém o que a dona digitou (`FLT-10`).
    if (!error) setNovoNome('')
  }

  const pedirRemocao = async (valor: AdminFilterValue) => {
    if (valor.marked_count > 0) {
      setConfirmando(valor)
      return
    }
    setRecusa(await onRemove(valor.id))
  }

  const confirmarRemocao = async () => {
    const valor = confirmando
    setConfirmando(null)
    if (valor) setRecusa(await onRemove(valor.id))
  }

  const soltar = async (alvo: string) => {
    const de = arrastando
    setArrastando(null)
    if (!de || de === alvo) return
    setRecusa(await onReorder(moverParaPosicao(ids, de, alvo)))
  }

  return (
    <section aria-labelledby="valores-titulo" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="valores-titulo" className="font-heading text-base font-semibold text-foreground">
          Valores
        </h3>
        <span className="text-xs text-muted-foreground" data-testid="contador-valores">
          {group.values.length} de {FILTER_VALUES_MAX}
          {group.values.length > 1 ? ' · arraste para ordenar' : ''}
        </span>
      </div>

      {group.values.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum valor ainda. Acrescente o primeiro abaixo — ex.: “Prata 925”.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {group.values.map(valor => (
            <li
              key={valor.id}
              data-testid={`valor-${valor.id}`}
              draggable={editando !== valor.id}
              onDragStart={() => setArrastando(valor.id)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                void soltar(valor.id)
              }}
              className="flex items-center gap-2 px-3 py-2"
            >
              <GripVertical aria-hidden className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
              {editando === valor.id ? (
                <LinhaEmEdicao
                  valor={valor}
                  onCancelar={() => setEditando(null)}
                  onSalvar={async patch => {
                    const motivo = await onUpdate(valor.id, patch)
                    if (!motivo) setEditando(null)
                    return motivo
                  }}
                />
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{valor.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="hidden sm:inline">{valor.slug} · </span>
                      {pecasMarcadasLabel(valor.marked_count)}
                    </p>
                  </div>
                  <Button asChild variant="secondary" size="sm" className="h-11 shrink-0">
                    <Link
                      to={`/admin/filtros/${group.id}/valores/${valor.id}`}
                      aria-label={`Marcar peças em “${valor.name}”`}
                    >
                      <span className="hidden sm:inline">Marcar peças</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    aria-label={`Renomear “${valor.name}”`}
                    onClick={() => setEditando(valor.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0"
                    aria-label={`Remover “${valor.name}”`}
                    onClick={() => void pedirRemocao(valor)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={acrescentar} className="flex flex-wrap gap-2" aria-label="Novo valor">
        <Input
          aria-label="Nome do novo valor"
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          placeholder="Novo valor — ex.: Prata 950"
          disabled={!!teto}
          className="h-11 min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" className="h-11" disabled={!!teto}>
          <Plus className="mr-1 h-4 w-4" />
          Adicionar
        </Button>
      </form>
      {teto && <p className="text-xs text-muted-foreground">{teto}</p>}
      {recusa && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {recusa}
        </p>
      )}

      <AlertDialog open={!!confirmando} onOpenChange={aberto => !aberto && setConfirmando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{confirmando?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>{confirmando ? perdaDoValor(confirmando.marked_count) : ''}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarRemocao()}>Remover valor</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

export default ValueList
