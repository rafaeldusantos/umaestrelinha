// O editor da **Lista de categorias** (feature 64 — `LCT-15`..`LCT-23`, `LCT-25`).
//
// A dona monta uma fileira de círculos: para cada um, a arte de uma joia (já circular, com cantos
// transparentes), a coleção para onde ele leva e, se quiser, um título curto embaixo. Quatro decisões
// mandam nesta tela, e nenhuma é estética:
//
// 1. **Nenhuma regra é redigida aqui.** O rótulo que a linha fechada mostra é `categoryListLabel`, a
//    MESMA função que a loja chama ao resolver o bloco; os tetos (24 itens, 28 e 60 caracteres) são
//    as constantes de `core` que a recusa e o `check` do banco também leem. Escrever `title || nome`
//    aqui faria a linha dizer um nome e a loja desenhar outro.
// 2. **Um item aberto por vez** (`LCT-22`). Com vinte e quatro itens abertos a lista teria a altura
//    de uma página inteira por categoria; fechado, cada um é uma linha que se reconhece pela arte.
// 3. **No teto, o botão fica indisponível COM o motivo escrito** (`LCT-20`). É o oposto do Banner
//    principal (`BNR-13`), que deixa o botão ativo e recusa ao salvar — a diferença é da AC, e a
//    recusa ao salvar existe aqui também, para a lista que chega acima do teto por escrita direta.
// 4. **Nada aqui desenha a fileira** (`AD-019`, `LCT-23`). A miniatura é conferência de upload, sobre
//    o fundo neutro do painel; quem mostra o bloco de verdade é a prévia da loja, no iframe.
//    `previaUnica.test.ts` derruba a suíte se um segundo desenho voltar.

import { useState } from 'react'
import { ChevronDown, GripVertical, ImagePlus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  CATEGORY_LIST_ART,
  CATEGORY_LIST_ITEM_TITLE_MAX,
  CATEGORY_LIST_MAX_ITEMS,
  CATEGORY_LIST_TITLE_MAX,
  categoryListLabel,
} from '@estrelinha/core/home'
import { bySortOrder } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import { CharCounter, FormCard } from '@/shared/ui'
import { uploadHomeImage } from '../lib/uploadHomeImage'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'
import { ordinalF } from '../model/sectionRefusals'
import type { SectionEditorProps } from './sectionEditors'

/** A orientação da arte, literal da `LCT-17`. */
const ORIENTACAO_DA_ARTE =
  'Arte circular em PNG com cantos transparentes, quadrada (800 × 800 px). A loja mostra a imagem como ela é — sem fundo e sem recorte.'

/** O que a linha fechada sabe de um item, já cruzado com o catálogo. */
interface Linha {
  /** O nome da coleção que a dona lê: o vivo, ou o congelado quando ela foi apagada. */
  nome: string | null
  /** A linha de destino, como a tela a escreve. */
  destino: string
  /** A coleção não vai aparecer na loja — a linha sai no tom de aviso. */
  aviso: boolean
}

/**
 * Cruza o rascunho com o catálogo — os QUATRO estados de um item (`LCT-22`, `A-12`).
 *
 * **Cópia do molde de `CollectionRowsEditor.tsx`, declarada**: é a terceira escrita de "fora do ar"
 * nesta pasta (a outra é a do `CollectionFeatureEditor`), e extraí-la mexeria em dois editores que a
 * feature 64 não toca — fica registrada como dívida no fecho. A regra é a mesma que o `resolveItem`
 * aplica: ausente do catálogo ou `active === false` é fora do ar. Ela existe aqui porque o que está
 * na tela é o RASCUNHO, que ainda não foi resolvido.
 */
const cruzar = (item: DraftItem, categories: readonly AdminCategory[]): Linha => {
  const congelado = item.label_snapshot?.trim() || null

  if (!item.category_id) {
    // Sem destino e com o nome congelado é o `on delete set null`: a coleção foi apagada. Sem nome
    // é o item recém-acrescentado — não é "fora do ar", é "ainda não escolhi".
    return congelado
      ? { nome: congelado, destino: `A coleção ${congelado} foi apagada — não aparece na loja`, aviso: true }
      : { nome: null, destino: 'Escolha a coleção', aviso: false }
  }

  const categoria = categories.find(c => c.id === item.category_id)
  if (!categoria) {
    const nome = congelado ?? 'escolhida'
    return { nome: congelado, destino: `A coleção ${nome} foi apagada — não aparece na loja`, aviso: true }
  }
  if (categoria.active === false) {
    return {
      nome: categoria.name,
      destino: `A coleção ${categoria.name} está desativada em Categorias — não aparece na loja`,
      aviso: true,
    }
  }
  return { nome: categoria.name, destino: `Coleção · ${categoria.name}`, aviso: false }
}

const CategoryListEditor = ({
  config,
  onConfigChange,
  items,
  onItemsChange,
  categories,
}: SectionEditorProps) => {
  /** O item aberto — um por vez. Nasce fechado; o item recém-acrescentado nasce aberto. */
  const [aberto, setAberto] = useState<string | null>(null)
  /** Aviso de proporção e falha de envio, por item. */
  const [recados, setRecados] = useState<Record<string, string>>({})
  const [arrastado, setArrastado] = useState<string | null>(null)

  const colecoes = [...categories].filter(c => c.active !== false).sort(bySortOrder)
  const noTeto = items.length >= CATEGORY_LIST_MAX_ITEMS

  const patch = (key: string, mudanca: Partial<DraftItem>) =>
    onItemsChange(items.map(i => (i.key === key ? { ...i, ...mudanca } : i)))

  const recado = (key: string, texto: string | null) =>
    setRecados(atual => {
      const proximo = { ...atual }
      if (texto) proximo[key] = texto
      else delete proximo[key]
      return proximo
    })

  const enviar = async (item: DraftItem, file: File | undefined) => {
    if (!file) return
    recado(item.key, null)

    const { url, error, warning } = await uploadHomeImage(file, CATEGORY_LIST_ART)
    // **Falha de envio não escreve no rascunho** (`LCT-25`): sem URL não há o que gravar, e o resto
    // do que a dona preencheu continua na tela.
    if (!url) {
      recado(item.key, error)
      return
    }
    // A proporção avisa, nunca recusa: arte que não é quadrada entra, com o aviso ao lado (`LCT-17`).
    recado(item.key, warning)
    patch(item.key, { image_url: url })
  }

  const escolher = (item: DraftItem, id: string) => {
    const alvo = categories.find(c => c.id === id)
    // O nome é congelado NO MESMO GESTO da escolha (`LCT-18`): depois do `set null` não há de onde
    // lê-lo, e é ele que deixa a tela dizer QUAL coleção se perdeu.
    patch(item.key, { category_id: id || null, label_snapshot: alvo?.name ?? null })
  }

  const acrescentar = () => {
    if (noTeto) return
    const novo = emptyDraftItem()
    onItemsChange([...items, novo])
    setAberto(novo.key)
  }

  const remover = (key: string) => {
    onItemsChange(items.filter(i => i.key !== key))
    if (aberto === key) setAberto(null)
  }

  // O mesmo arrasto do Banner principal (`LCT-21`) — e a sexta cópia dele no painel, registrada
  // como dívida no fecho: extrair o mecanismo mexeria nos cinco editores que já o carregam.
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

  return (
    <>
      <FormCard title="Título da seção">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="lista-titulo">Título da seção</Label>
            <CharCounter
              value={config.title ?? ''}
              limit={CATEGORY_LIST_TITLE_MAX}
              data-testid="contador-titulo-secao"
            />
          </div>
          <Input
            id="lista-titulo"
            value={config.title ?? ''}
            maxLength={CATEGORY_LIST_TITLE_MAX}
            placeholder="Escolha pelo material"
            onChange={e => onConfigChange({ title: e.target.value })}
          />
          <p className="text-[10px] text-muted-foreground">Vazio, a fileira aparece sem título.</p>
        </div>
      </FormCard>

      <FormCard
        title="Categorias"
        action={
          <span data-testid="contador-categorias" className="text-xs text-muted-foreground">
            {items.length} de {CATEGORY_LIST_MAX_ITEMS}
            {items.length > 1 && ' · arraste para trocar de ordem'}
          </span>
        }
      >
        {items.length === 0 && (
          // Sem item o bloco **não aparece na loja**, e a tela diz isso: uma lista vazia sem
          // explicação se lê como seção quebrada.
          <p
            data-testid="lista-vazia"
            className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
          >
            <span className="font-semibold text-foreground">Nenhuma categoria ainda.</span> Enquanto
            este bloco estiver vazio ele não aparece na loja — sem faixa em branco e sem espaço
            reservado.
          </p>
        )}

        {items.map((item, indice) => {
          const linha = cruzar(item, categories)
          const estaAberto = aberto === item.key
          const numero = ordinalF(indice + 1)
          const escolhida = item.category_id
            ? categories.find(c => c.id === item.category_id)
            : undefined
          // O rótulo efetivo é o de `core` — o mesmo que a loja desenha (`LCT-22`, `R1`).
          const rotulo = categoryListLabel(item, linha.nome ?? '') || `${numero} categoria`

          return (
            <div
              key={item.key}
              data-testid={`categoria-${indice}`}
              draggable
              onDragStart={() => setArrastado(item.key)}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                soltar(item.key)
              }}
              className="border-t border-border/60 pt-3 first:border-0 first:pt-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex w-4 shrink-0 justify-center">
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
                </span>

                <button
                  type="button"
                  aria-expanded={estaAberto}
                  data-testid={`categoria-resumo-${indice}`}
                  onClick={() => setAberto(estaAberto ? null : item.key)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left hover:bg-muted/40"
                >
                  {/* Conferência de upload, não desenho da loja: a arte inteira, sobre o neutro
                      do painel, sem recorte (`LCT-23`). */}
                  {item.image_url?.trim() ? (
                    <img
                      data-testid={`miniatura-${indice}`}
                      src={item.image_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-md bg-muted object-contain"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-input bg-muted/30">
                      <ImagePlus className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {rotulo}
                    </span>
                    <span
                      data-testid={`categoria-destino-${indice}`}
                      className={cn(
                        'flex items-start gap-1 text-xs',
                        linha.aviso ? 'text-estrelinha-admin-amber' : 'text-muted-foreground',
                      )}
                    >
                      {linha.aviso && (
                        <TriangleAlert className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                      )}
                      {linha.destino}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn('h-4 w-4 shrink-0 text-muted-foreground', estaAberto && 'rotate-180')}
                    aria-hidden
                  />
                </button>
              </div>

              {estaAberto && (
                <div className="mt-3 space-y-4 pl-7" data-testid={`categoria-aberta-${indice}`}>
                  {/* (a) Imagem — obrigatória, cobrada ao salvar. */}
                  <div className="space-y-1.5" data-campo="imagem">
                    <Label htmlFor={`categoria-arte-${indice}`}>Imagem</Label>
                    <div className="flex items-start gap-3">
                      {item.image_url?.trim() ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-24 w-24 shrink-0 rounded-lg bg-muted object-contain"
                        />
                      ) : (
                        <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-input bg-muted/30">
                          <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
                        </span>
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <input
                          id={`categoria-arte-${indice}`}
                          type="file"
                          aria-label={`Imagem da ${numero} categoria`}
                          accept="image/png,image/jpeg,image/webp"
                          onChange={e => enviar(item, e.target.files?.[0])}
                          className="w-full text-[11px] text-muted-foreground file:mr-1 file:rounded file:border file:border-input file:bg-card file:px-1.5 file:text-[11px] file:text-foreground"
                        />
                        <p className="text-[10px] text-muted-foreground">{ORIENTACAO_DA_ARTE}</p>
                      </div>
                    </div>
                    {recados[item.key] && (
                      <p
                        data-testid={`recado-${indice}`}
                        role="status"
                        className="rounded-lg border border-input bg-muted/40 p-2 text-[11px] text-foreground"
                      >
                        {recados[item.key]}
                      </p>
                    )}
                  </div>

                  {/* (b) A coleção — só coleção: o bloco não leva a peça nem a endereço. */}
                  <div className="space-y-1.5" data-campo="colecao">
                    <Label htmlFor={`categoria-colecao-${indice}`}>Leva para a coleção</Label>
                    <select
                      id={`categoria-colecao-${indice}`}
                      value={item.category_id ?? ''}
                      onChange={e => escolher(item, e.target.value)}
                      className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground md:h-9"
                    >
                      <option value="">Escolha uma coleção</option>
                      {/* A desativada não está entre as vivas. Sem esta linha o seletor mostraria a
                          primeira opção e a categoria trocaria de coleção sozinha. */}
                      {escolhida?.active === false && (
                        <option value={escolhida.id}>{escolhida.name} (fora do ar)</option>
                      )}
                      {colecoes.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* (c) O título curto — opcional. */}
                  <div className="space-y-1.5" data-campo="titulo">
                    <div className="flex items-baseline justify-between gap-2">
                      <Label htmlFor={`categoria-titulo-${indice}`}>Título embaixo do círculo</Label>
                      <CharCounter
                        value={item.title ?? ''}
                        limit={CATEGORY_LIST_ITEM_TITLE_MAX}
                        data-testid={`contador-titulo-${indice}`}
                      />
                    </div>
                    <Input
                      id={`categoria-titulo-${indice}`}
                      value={item.title ?? ''}
                      maxLength={CATEGORY_LIST_ITEM_TITLE_MAX}
                      onChange={e => patch(item.key, { title: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground">Vazio, usa o nome da coleção.</p>
                  </div>

                  {/* (d) */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remover(item.key)}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover categoria
                  </Button>
                </div>
              )}
            </div>
          )
        })}

        <Button
          type="button"
          variant="outline"
          data-testid="adicionar-categoria"
          disabled={noTeto}
          aria-describedby={noTeto ? 'lista-no-teto' : undefined}
          onClick={acrescentar}
          className="w-full border-dashed"
        >
          <Plus className="mr-1.5 h-4 w-4" /> Adicionar categoria
        </Button>
        {noTeto && (
          // O motivo em TEXTO, ao lado do botão indisponível (`LCT-20`): `disabled` sozinho não diz
          // por quê, e some num atalho de teclado.
          <p id="lista-no-teto" data-testid="lista-no-teto" className="text-xs text-muted-foreground">
            Até {CATEGORY_LIST_MAX_ITEMS} categorias por bloco.
          </p>
        )}
      </FormCard>
    </>
  )
}

export default CategoryListEditor
