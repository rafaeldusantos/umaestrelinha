// O editor do bloco **Produtos em destaque** (feature 50 — `DST-02`, `DST-07`..`DST-11`, `DST-18`).
//
// É o único bloco da Home que fala de **peça**, e não de coleção: a dona escolhe estas doze, nesta
// ordem, e diz se elas saem em fita ou em grade.
//
// Três decisões mandam aqui, e nenhuma é estética:
//
// 1. **Isto não é uma vitrine** (`AD-019`). A prévia é a loja num iframe; desenhar cards aqui seria
//    o segundo dono do desenho da Home, que é o defeito que a feature 25 apagou e a 39 teve de
//    apagar de novo no menu. `previaUnica.test.ts` derruba a suíte se ele voltar.
// 2. **Nenhuma frase de regra nasce neste arquivo.** As cinco cobranças — título, lista vazia, teto
//    de 12, item órfão e peça repetida — vêm de `featuredProductsRefusal`, em `core`, que é a mesma
//    função que decide o que a loja desenha. Uma segunda redação faria a tela recusar o que a loja
//    aceita, e a divergência não quebraria nada.
// 3. **Trocar de apresentação não toca na curadoria** (`DST-18`). `display` é valor em `config`; a
//    lista é `home_section_items`. São dois dados diferentes, e um handler que reescrevesse os dois
//    faria a dona perder doze escolhas ao trocar um botão.

import { useState } from 'react'
import { GripVertical, LayoutGrid, MoveHorizontal, PlugZap, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  FEATURED_PRODUCTS_MAX,
  featuredDisplay,
  type HomeFeaturedDisplay,
} from '@estrelinha/core/home'
import { FormCard } from '@/shared/ui'
import ProductPicker from './ProductPicker'
import { ordinal } from '../model/sectionRefusals'
import type { SectionEditorProps } from './sectionEditors'

/**
 * As duas apresentações, com o nome que a dona lê e o que cada uma faz na página.
 *
 * Molde literal do `LARGURAS` do `HeroCarouselEditor`: o apoio de uma linha é o que faz a escolha
 * ser tomada por consequência, e não por adivinhação de rótulo. "Slider" e "Grade" não dizem nada
 * sozinhos para quem monta uma vitrine uma vez por mês.
 */
const APRESENTACOES: Record<HomeFeaturedDisplay, { label: string; apoio: string; Icone: typeof LayoutGrid }> = {
  slider: { label: 'Slider', apoio: 'uma fileira que rola', Icone: MoveHorizontal },
  grid: { label: 'Grade', apoio: 'linhas de 4, o que sobrar vai abaixo', Icone: LayoutGrid },
}

/** A ordem em que a tela oferece as duas. `slider` primeiro porque é o padrão. */
const ORDEM: HomeFeaturedDisplay[] = ['slider', 'grid']

const FeaturedProductsEditor = ({
  config,
  onConfigChange,
  items,
  onItemsChange,
  products,
}: SectionEditorProps) => {
  // A leitura passa por `core`: um `display` gravado por escrita direta, ou por uma versão mais
  // nova, cai em `slider` em vez de deixar os dois botões sem marca (`DST-10`).
  const apresentacao = featuredDisplay(config.display)

  const [arrastado, setArrastado] = useState<string | null>(null)

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

  const escolhidos = items.map(i => i.product_id).filter((id): id is string => !!id)
  const excedentes = items.length - FEATURED_PRODUCTS_MAX

  return (
    <>
      <FormCard title="Conteúdo">
        <div className="space-y-1.5">
          <Label htmlFor="destaque-titulo">Título do bloco</Label>
          <Input
            id="destaque-titulo"
            value={config.title ?? ''}
            placeholder="Feitas à mão neste mês"
            onChange={e => onConfigChange({ title: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground">
            É ele que abre a seção na loja. Sem título, a vitrine começa com uma fileira de peças sem
            dizer por quê.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destaque-subtitulo">Descrição (opcional)</Label>
          <Textarea
            id="destaque-subtitulo"
            rows={2}
            value={config.subtitle ?? ''}
            placeholder="uma linha sobre o que reúne estas peças"
            onChange={e => onConfigChange({ subtitle: e.target.value })}
          />
        </div>
      </FormCard>

      <FormCard
        title="Apresentação"
        action={<span className="text-xs text-muted-foreground">no celular, 2 por linha na grade</span>}
      >
        <div className="flex flex-wrap gap-2">
          {ORDEM.map(valor => {
            const escolhida = apresentacao === valor
            const { label, apoio, Icone } = APRESENTACOES[valor]

            return (
              <button
                key={valor}
                type="button"
                aria-pressed={escolhida}
                data-testid={`apresentacao-${valor}`}
                // **Só `display`.** O patch não cita `items`, e é o que faz `DST-18` valer: a
                // curadoria é outro dado, e trocar de botão não pode custar doze escolhas.
                onClick={() => onConfigChange({ display: valor })}
                className={cn(
                  'flex min-h-11 min-w-[140px] flex-1 flex-col items-center gap-1 rounded-xl border p-3 text-xs',
                  escolhida
                    ? 'border-primary bg-primary/5 font-semibold text-foreground'
                    : 'border-input text-muted-foreground hover:bg-muted/50',
                )}
              >
                <Icone className="h-4 w-4" aria-hidden />
                {label}
                <span className="text-[10px] font-normal text-muted-foreground">{apoio}</span>
              </button>
            )
          })}
        </div>
      </FormCard>

      <FormCard
        title="Peças escolhidas"
        action={
          <span data-testid="contador-pecas" className="text-xs text-muted-foreground">
            {items.length} de {FEATURED_PRODUCTS_MAX}
            {items.length > 1 && ' · arraste para trocar de ordem'}
          </span>
        }
      >
        {items.length === 0 && (
          // Sem peça o bloco **não aparece na loja**, e a tela diz isso: uma lista vazia sem
          // explicação se lê como seção quebrada, e a dona procuraria o defeito noutro lugar.
          <p
            data-testid="curadoria-vazia"
            className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
          >
            <span className="font-semibold text-foreground">Nenhuma peça ainda.</span> Enquanto este
            bloco estiver vazio ele não aparece na loja — sem faixa em branco e sem espaço reservado.
          </p>
        )}

        {excedentes > 0 && (
          // A contrapartida da recusa ao salvar: o estado é alcançável por escrita direta, e um
          // estado gravado que nenhuma tela mostra é como dado errado sobrevive por meses.
          <p
            data-testid="pecas-excedentes"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Cabem {FEATURED_PRODUCTS_MAX} peças neste bloco, e há {items.length}. Remova{' '}
            {excedentes === 1 ? 'a que sobra' : `as ${excedentes} que sobram`}, ou acrescente um
            segundo bloco “Produtos em destaque” para {excedentes === 1 ? 'ela' : 'elas'}.
          </p>
        )}

        <ul data-testid="curadoria" className="space-y-1">
          {items.map((item, indice) => {
            const vivo = item.product_id ? products.find(p => p.id === item.product_id) : null
            const nome = vivo?.name ?? item.label_snapshot?.trim() ?? null
            // Duas perdas diferentes, e a tela precisa distingui-las: a peça **apagada** do
            // catálogo (o `on delete set null` zerou o `product_id`) e a peça **despublicada**, que
            // continua com id e volta se a dona republicar.
            const apagada = !item.product_id
            const foraDoAr = !apagada && (!vivo || vivo.is_active === false)
            const excedente = indice >= FEATURED_PRODUCTS_MAX

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
                  'flex items-center gap-2 rounded-lg border border-border/60 p-2',
                  excedente && 'opacity-70',
                )}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden />

                <span
                  data-testid={`posicao-${indice}`}
                  className="shrink-0 text-[11px] font-semibold text-muted-foreground"
                >
                  {ordinal(indice + 1)}
                </span>

                <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                  {nome ?? 'Peça sem nome'}
                </span>

                {apagada && (
                  <span
                    data-testid={`peca-apagada-${indice}`}
                    className="flex shrink-0 items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                  >
                    <PlugZap className="h-3 w-3" aria-hidden /> apagada do catálogo
                  </span>
                )}

                {foraDoAr && (
                  <span
                    data-testid={`peca-fora-do-ar-${indice}`}
                    className="shrink-0 rounded bg-estrelinha-admin-amber/10 px-1.5 py-0.5 text-[10px] font-semibold text-estrelinha-admin-amber"
                  >
                    fora do ar
                  </span>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-testid={`remover-peca-${indice}`}
                  aria-label={`Remover a ${ordinal(indice + 1)} peça`}
                  onClick={() => onItemsChange(items.filter(i => i.key !== item.key))}
                  className="shrink-0 text-muted-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            )
          })}
        </ul>

        {/* O seletor NÃO é apagado no teto, pelo mesmo motivo do `HeroCarouselEditor`: `disabled`
            some num atalho de teclado e não diz por quê. Quem recusa é a régua de `core`, no
            salvar, com o motivo e a saída em texto. */}
        <ProductPicker
          products={products}
          escolhidos={escolhidos}
          onPick={item => onItemsChange([...items, item])}
        />
      </FormCard>
    </>
  )
}

export default FeaturedProductsEditor
