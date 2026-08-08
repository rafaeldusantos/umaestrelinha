// RFN-09 / T56 — o inspetor docado.
//
// Substitui o `CategoryFormDialog`: categoria é entidade pequena (nome, slug, pai, capa, um
// interruptor) e não precisa roubar a tela inteira num modal. O inspetor deixa a lista visível
// enquanto se edita — é a mesma filosofia da edição inline de preço da listagem v2.
//
// DIVERGÊNCIA DELIBERADA em relação ao artboard: o interruptor **"Destacar na home"** não existe
// aqui. Ele precisaria de uma coluna nova em `categories` E de a loja ler essa coluna numa faixa
// "Explore por tema" que não existe (`apps/store/src/entities/category` não tem nada de destaque).
// Entregar o interruptor sem as duas pontas seria um controle que não faz nada — pior que ausente.

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'
import { Textarea } from '@estrelinha/ui/textarea'
import type { DbCategory } from '@estrelinha/supabase/types'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'
import { eligibleParents } from '../model/categoryTree'

interface Props {
  category: AdminCategory
  allCategories: AdminCategory[]
  productCount: number
  saving?: boolean
  onSave: (id: string, updates: Partial<DbCategory>) => Promise<unknown>
  onClose: () => void
}

interface FormState {
  name: string
  slug: string
  description: string
  banner_url: string
  parent_id: string
  active: boolean
}

const toForm = (category: AdminCategory): FormState => ({
  name: category.name,
  slug: category.slug,
  description: category.description ?? '',
  banner_url: category.banner_url ?? category.image_url ?? '',
  parent_id: category.parent_id ?? '',
  active: category.active === true,
})

const CategoryInspector = ({
  category, allCategories, productCount, saving = false, onSave, onClose,
}: Props) => {
  const [form, setForm] = useState<FormState>(() => toForm(category))

  // Trocar de categoria na lista tem que recarregar o formulário — sem isto, o inspetor mostraria
  // o rascunho da categoria anterior sobre o nome da nova.
  useEffect(() => { setForm(toForm(category)) }, [category])

  const pristine = toForm(category)
  const dirty = (Object.keys(pristine) as (keyof FormState)[]).some(key => form[key] !== pristine[key])

  const parentOptions = eligibleParents(allCategories, category.id)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }))

  const handleSave = () =>
    onSave(category.id, {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      banner_url: form.banner_url || null,
      parent_id: form.parent_id || null,
      active: form.active,
    })

  return (
    <aside
      aria-label={`Editar ${category.name}`}
      className="flex w-[372px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex items-start gap-3 border-b border-border bg-muted/40 px-4 py-4">
        <span
          className="h-10 w-10 shrink-0 rounded-xl bg-primary/20"
          style={category.color_accent ? { backgroundColor: category.color_accent } : undefined}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-heading text-[17px] font-semibold text-foreground">{category.name}</h2>
          <p className="text-[11.5px] text-muted-foreground">
            {productCount} produto{productCount === 1 ? '' : 's'} · {category.parent_id ? 'subcategoria' : 'raiz'}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar inspetor" className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex flex-col gap-3.5 px-4 py-4">
        <div className="space-y-1.5">
          <Label htmlFor="cat-nome">Nome</Label>
          <Input id="cat-nome" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">URL da categoria</Label>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5">
            <span className="shrink-0 text-[12px] text-muted-foreground">/categoria/</span>
            <Input
              id="cat-slug"
              value={form.slug}
              onChange={e => set('slug', e.target.value)}
              className="border-0 bg-transparent px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-pai">Categoria pai</Label>
          {/* `<select>` nativo e não o `Select` do Radix: o inspetor precisa ser testável sem
              portal, e a lista de pais é curta. */}
          <select
            id="cat-pai"
            value={form.parent_id}
            onChange={e => set('parent_id', e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-[13px]"
          >
            <option value="">Nenhuma — categoria raiz</option>
            {parentOptions.map(option => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-descricao">Descrição</Label>
          <Textarea
            id="cat-descricao"
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-capa">Imagem de capa</Label>
          <div className="flex items-center gap-3 rounded-xl border border-border p-2.5">
            {form.banner_url ? (
              <img src={form.banner_url} alt="" className="h-11 w-14 shrink-0 rounded-lg object-cover" />
            ) : (
              <span className="h-11 w-14 shrink-0 rounded-lg bg-muted" />
            )}
            <Input
              id="cat-capa"
              value={form.banner_url}
              placeholder="https://…"
              onChange={e => set('banner_url', e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-foreground">Mostrar na vitrine</p>
            <p className="text-[10.5px] text-muted-foreground">aparece no menu e na busca da loja</p>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={value => set('active', value)}
            aria-label="Mostrar na vitrine"
          />
        </div>
      </div>

      <footer className="mt-auto flex items-center gap-2 border-t border-border bg-muted/40 px-4 py-3">
        <span className="text-[11.5px] text-muted-foreground">
          {dirty ? 'Alterações não salvas' : 'Tudo salvo'}
        </span>
        <span className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" className="gradient-cta text-white" disabled={saving || !dirty} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </footer>
    </aside>
  )
}

export default CategoryInspector
