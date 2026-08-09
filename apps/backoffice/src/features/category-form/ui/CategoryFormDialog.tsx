// O diálogo de CRIAR categoria.
//
// Ele nasceu como criar-e-editar, mas a edição saiu na `RFN-09`/T56 para o `CategoryInspector`
// docado — as duas telas que montam este componente passam `category={null}`. O que sobrou é o
// atalho de criação: da tela de Categorias e do "Criar categoria" inline do formulário de produto.
//
// QUATRO CAMPOS SAÍRAM, e nenhum por gosto — todos já tinham outro dono:
//
// - **Ordem** (`sort_order`): quem ordena é o arraste do modo *Reordenar* e o *Mover para…*
//   (`updateSortOrders`, `moveCategories`). Um número editável aqui era o segundo dono do mesmo dado
//   — o defeito 01 do projeto — e ainda por cima o pior dos dois: digitar `3` não diz onde a
//   categoria cai numa lista cujos vizinhos você não está vendo.
// - **Imagem URL** e **Banner URL** (`image_url`, `banner_url`): a capa é campo do inspetor
//   (`Imagem de capa`, que lê `banner_url ?? image_url`). Dois inputs de URL na hora de criar pedem
//   uma decisão que ninguém tem como tomar antes de a categoria existir.
// - **Cor accent** (`color_accent`): não tinha consumidor de verdade. No backoffice é a bolinha do
//   cabeçalho do inspetor, que já cai em `bg-primary/20` sem ela; na loja, `useCategories` carrega a
//   coluna e **nenhum** componente a renderiza. Era um seletor de cor que não pintava nada.
//
// As colunas seguem no banco e ninguém as apaga: o payload deixou de MENCIONÁ-LAS, então criar usa o
// default (`sort_order` é `DEFAULT 0`, as outras ficam nulas) e nada sobrescreve valor existente.

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { Switch } from '@estrelinha/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { reservedSlugRefusal } from '@estrelinha/core/routes'
import type { DbCategory } from '@estrelinha/supabase/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  category?: DbCategory | null
  onSave: (data: Partial<DbCategory>) => Promise<unknown>
  allCategories?: DbCategory[]
}

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const emptyForm = { name: '', slug: '', description: '', active: true, parent_id: '' }

const CategoryFormDialog = ({ open, onOpenChange, category, onSave, allCategories = [] }: Props) => {
  const isEdit = !!category
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (category) {
      setForm({
        name: category.name,
        slug: category.slug,
        description: category.description ?? '',
        active: category.active,
        parent_id: category.parent_id ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [category, open])

  const parentOptions = allCategories.filter(c => !c.parent_id && c.id !== category?.id)

  // O slug que SERIA gravado — não o que está no campo. Quem cadastra digita o nome e nunca toca no
  // campo de slug, então conferir `form.slug` deixaria justamente o caminho mais comum sem guarda.
  const effectiveSlug = form.slug || slugify(form.name)
  // `URL-05`: com categoria na raiz do domínio (`AD-018`), rota e slug dividem o namespace e a rota
  // sempre vence o ranqueamento do React Router. A categoria nasceria e nunca abriria.
  const slugRefusal = reservedSlugRefusal(effectiveSlug)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // A recusa vive no handler, e não num `disabled`: `disabled` some num atalho de teclado, num
    // submit programático e numa chamada direta — o mesmo motivo já registrado em `MenuSlotList`.
    if (slugRefusal) return
    setSaving(true)
    await onSave({
      name: form.name,
      slug: effectiveSlug,
      description: form.description || null,
      active: form.active,
      parent_id: form.parent_id || null,
    })
    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">{isEdit ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cat-form-nome">Nome</Label>
            <Input
              id="cat-form-nome"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-form-slug">Slug</Label>
            <Input
              id="cat-form-slug"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
            />
            {slugRefusal && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {slugRefusal}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Categoria pai (Universo)</Label>
            <Select value={form.parent_id || '_none'} onValueChange={v => setForm(f => ({ ...f, parent_id: v === '_none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Nenhuma (raiz)</SelectItem>
                {parentOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-form-descricao">Descrição</Label>
            <Textarea
              id="cat-form-descricao"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} /> Ativa
          </label>
          {/* A capa e a posição na lista são do inspetor e do arraste — dizer isso aqui evita a
              busca pelo campo que "sumiu". */}
          <p className="text-xs text-muted-foreground">
            Capa e posição na lista se ajustam depois, na tela de Categorias.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="gradient-cta text-white" disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CategoryFormDialog
