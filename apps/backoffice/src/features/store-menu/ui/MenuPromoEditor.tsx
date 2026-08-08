// O card promocional de uma entrada do menu — a quarta coluna do painel desktop e a faixa do celular.
//
// **Aponta para uma categoria, não para uma URL digitada.** "Coleção Anime Villains" é uma
// subcategoria de Anime, com página própria em `/colecao/anime-villains`. Um campo de link livre
// entregaria três coisas piores: typo que vira 404 na navegação principal, um destino que ninguém
// revalida quando o slug muda, e a contagem de produtos ("12 pins") impossível de derivar.
//
// Título e texto são **opcionais**: vazios, a loja usa o nome e a descrição da categoria de destino.
// O admin só escreve quando quer divergir dela.

import { AlertTriangle } from 'lucide-react'
import { Input } from '@nanapin/ui/input'
import { Label } from '@nanapin/ui/label'
import { Switch } from '@nanapin/ui/switch'
import { Textarea } from '@nanapin/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nanapin/ui/select'
import { pathLabel, resolvePromo, type MenuCategory } from '@nanapin/core/menu'
import type { MenuPromo } from '@nanapin/supabase/types'
import type { AdminCategory } from '@/entities/category'

interface Props {
  /** A entrada do menu que hospeda o card. */
  host: AdminCategory
  categories: AdminCategory[]
  onChange: (promo: MenuPromo | null) => void
}

const MenuPromoEditor = ({ host, categories, onChange }: Props) => {
  const pool = categories as unknown as MenuCategory[]
  const promo = host.menu_promo ?? null
  const enabled = promo !== null

  // O destino tem de estar **ativo** para valer: a policy `public read categories using
  // (active = true)` o esconderia da cliente, e um card apontando para coleção invisível é pior que
  // card nenhum. A lista oferecida aqui é a mesma que a loja aceitaria.
  const destinations = categories.filter(c => c.active)
  const resolved = resolvePromo(pool, promo)
  const target = promo ? categories.find(c => c.id === promo.category_id) : undefined

  /** Ligar sem destino escolhido é o estado que a AC proíbe gravar — o aviso abaixo é o que o diz. */
  const invalidTarget = enabled && !resolved

  const patch = (changes: Partial<MenuPromo>) => {
    if (!promo) return
    const next: MenuPromo = { ...promo, ...changes }
    // Campo apagado sai do jsonb em vez de virar `""`: string vazia gravada é indistinguível de
    // "quis um título vazio", e o fallback para o nome da categoria deixaria de acontecer.
    for (const key of ['badge', 'title', 'subtitle'] as const) {
      if (next[key] !== undefined && next[key]!.trim() === '') delete next[key]
    }
    onChange(next)
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">Card promocional</h2>
          <p className="text-xs text-muted-foreground">
            Aparece no painel de “{host.name}” no desktop e como faixa no celular.
          </p>
        </div>
        <Switch
          checked={enabled}
          aria-label="Ativar card promocional"
          onCheckedChange={next =>
            // Ligar já nasce com um destino — o primeiro ativo — em vez de um estado meio-preenchido
            // que a gravação recusaria. Desligar apaga o jsonb inteiro (`null` = sem card).
            onChange(next ? { category_id: destinations[0]?.id ?? '' } : null)
          }
        />
      </header>

      {enabled && (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-destino">Aponta para</Label>
            <Select
              value={promo?.category_id || undefined}
              onValueChange={value => patch({ category_id: value })}
            >
              <SelectTrigger id="promo-destino">
                <SelectValue placeholder="Escolha a coleção de destino" />
              </SelectTrigger>
              <SelectContent>
                {destinations.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {pathLabel(pool, c.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {resolved && (
              <p className="text-xs text-muted-foreground">
                {resolved.href}
                {/* Vem da view `category_product_counts`, que já existe desde a 14 — sem query nova. */}
                {resolved.productCount !== null && ` · ${resolved.productCount} produtos`}
              </p>
            )}
            {invalidTarget && (
              <p
                data-testid="promo-destino-invalido"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {target
                  ? 'A coleção de destino está oculta — o card não vai aparecer na loja.'
                  : 'Escolha uma coleção de destino: sem ela o card não aparece.'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-selo">Selo</Label>
            <Input
              id="promo-selo"
              value={promo?.badge ?? ''}
              placeholder="sem selo"
              onChange={e => patch({ badge: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-titulo">Título</Label>
            <Input
              id="promo-titulo"
              value={promo?.title ?? ''}
              // O placeholder mostra o valor herdado: o admin vê o que a loja vai escrever se ele
              // não escrever nada, em vez de encarar um campo vazio e achar que é obrigatório.
              placeholder={target ? target.name : 'nome da coleção de destino'}
              onChange={e => patch({ title: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="promo-texto">Texto</Label>
            <Textarea
              id="promo-texto"
              rows={2}
              value={promo?.subtitle ?? ''}
              placeholder={target?.description ?? 'descrição da coleção de destino'}
              onChange={e => patch({ subtitle: e.target.value })}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default MenuPromoEditor
