// O editor do destaque em coleção (feature 24, T33 — `HOME-37`, `HOME-39`).
//
// A faixa que dá a uma coleção só o espaço de uma página inteira. Três decisões mandam aqui, e
// nenhuma é estética:
//
// 1. **A coleção é obrigatória, e mora no ITEM.** É a FK que faz a coleção apagada tirar a faixa da
//    vitrine sozinha, pelo `on delete set null` — guardar o destino como caminho de texto perderia
//    isso e a cliente cairia num 404 (é o defeito do `menu_promo`, que mora em jsonb).
// 2. **Título e texto ficam VAZIOS de propósito.** A tela diz que, em branco, a loja usa o nome e a
//    descrição da própria coleção (`HOME-38`). Semear os campos com esses textos criaria a segunda
//    cópia deles — a que fica velha quando a dona editar a primeira, em Categorias.
// 3. **A foto mora no `config`, como a do hero.** A seção tem UMA imagem, que é dela e não do
//    destino; no item, o `alt` da foto viraria o rótulo do destino e o título vazio cairia numa
//    frase que descreve a foto em vez do nome da coleção.
//
// **Sem aviso de proporção, e isso é decisão, não esquecimento**: a foto do destaque é fotografia de
// peça real, e `object-cover` cortando as bordas dela é aceitável — a mesma régua do hero. Quem
// ganha aviso é o banner de campanha, que tem texto DENTRO da arte.

import { useState } from 'react'
import { ImagePlus, PlugZap, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { bySortOrder } from '@estrelinha/core/menu'
import { FormCard } from '@/shared/ui'
import { uploadHomeImage } from '../lib/uploadHomeImage'
import { emptyDraftItem, type DraftItem } from '../model/sectionDraft'
import type { SectionEditorProps } from './sectionEditors'

const CollectionFeatureEditor = ({
  config,
  onConfigChange,
  items,
  onItemsChange,
  categories,
}: SectionEditorProps) => {
  const [enviando, setEnviando] = useState(false)
  const [recadoDaArte, setRecadoDaArte] = useState<string | null>(null)

  const colecoes = [...categories].filter(c => c.active !== false).sort(bySortOrder)

  // Exatamente UM item, sempre: o destaque mostra uma coleção. Uma lista aqui seria a grade de
  // banners com outro nome.
  const item: DraftItem = items[0] ?? emptyDraftItem()
  const escolhida = item.category_id ? categories.find(c => c.id === item.category_id) : null
  const congelado = item.label_snapshot?.trim() || null

  /**
   * `HOME-39` — a coleção saiu do ar, e o painel **avisa** em vez de recusar.
   *
   * Três estados diferentes, e a dona precisa saber qual: apagada de vez (a FK virou `null` e só o
   * rótulo congelado sobrou), sumida do catálogo, ou apenas desativada em Categorias — que se
   * conserta com um clique lá, sem tocar na Home.
   */
  const foraDoAr = (() => {
    if (!item.category_id) return congelado ? `“${congelado}” foi apagada em Categorias.` : null
    if (!escolhida) return congelado ? `“${congelado}” foi apagada em Categorias.` : 'A coleção escolhida não existe mais.'
    if (escolhida.active === false) return `“${escolhida.name}” está desativada em Categorias.`
    return null
  })()

  const escolher = (id: string) => {
    const alvo = colecoes.find(c => c.id === id)
    // O rótulo é congelado JUNTO com a escolha: depois do `set null` não há de onde lê-lo, e é ele
    // que deixa o aviso dizer **qual** coleção se perdeu.
    onItemsChange([{ ...item, category_id: id || null, label_snapshot: alvo?.name ?? null }])
  }

  const enviar = async (file: File | undefined) => {
    if (!file) return
    setEnviando(true)
    setRecadoDaArte(null)
    const { url, error } = await uploadHomeImage(file)
    setEnviando(false)

    // **Falha de envio não toca no `config`** (`HOME-28`): sem URL não há o que gravar, e a seção
    // não fica com foto pela metade.
    if (!url) {
      setRecadoDaArte(error)
      return
    }
    onConfigChange({ image_url: url })
  }

  return (
    <>
      <FormCard title="A coleção em destaque">
        <div className="space-y-1.5">
          <Label htmlFor="destaque-colecao">Coleção</Label>
          <select
            id="destaque-colecao"
            aria-label="Coleção em destaque"
            value={item.category_id ?? ''}
            onChange={e => escolher(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground md:h-9"
          >
            <option value="">Escolha uma coleção</option>
            {/* A que saiu do ar não está entre as vivas. Sem esta linha o seletor mostraria a
                primeira do catálogo e o destaque trocaria de coleção sozinho. */}
            {escolhida?.active === false && (
              <option value={escolhida.id}>{escolhida.name} (fora do ar)</option>
            )}
            {colecoes.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            É ela que dá o nome, o texto e o destino do botão quando os campos abaixo ficam vazios.
          </p>
        </div>

        {foraDoAr && (
          <p
            data-testid="destaque-fora-do-ar"
            className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <PlugZap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-semibold">{foraDoAr}</span> Enquanto ela estiver fora do ar, este
              destaque não aparece na loja — o texto e a arte ficam guardados aqui.
            </span>
          </p>
        )}
      </FormCard>

      <FormCard title="Texto">
        <div className="space-y-1.5">
          <Label htmlFor="destaque-titulo">Título</Label>
          <Input
            id="destaque-titulo"
            value={config.title ?? ''}
            onChange={e => onConfigChange({ title: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Vazio, a loja usa o nome da coleção.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destaque-texto">Texto</Label>
          <Textarea
            id="destaque-texto"
            rows={3}
            value={config.text ?? ''}
            onChange={e => onConfigChange({ text: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Vazio, a loja usa a descrição da coleção.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="destaque-cta">Botão — texto</Label>
          <Input
            id="destaque-cta"
            value={config.cta_label ?? ''}
            onChange={e => onConfigChange({ cta_label: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Sem texto, o botão não sai — a imagem continua levando à coleção.
          </p>
        </div>
      </FormCard>

      <FormCard title="Arte">
        {config.image_url ? (
          <img
            data-testid="destaque-foto"
            src={config.image_url}
            alt={config.image_alt ?? ''}
            className="aspect-[588/440] w-full rounded-xl object-cover"
          />
        ) : (
          <div className="flex aspect-[588/440] w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-muted/30 p-4 text-center">
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              Uma foto da coleção. Sem foto, entra a arte de banner que a coleção já tem.
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="destaque-arquivo">
            {config.image_url ? 'Trocar a foto' : 'Enviar uma foto'}
          </Label>
          <input
            id="destaque-arquivo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={enviando}
            onChange={e => enviar(e.target.files?.[0])}
            className="w-full text-xs text-muted-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-input file:bg-card file:px-3 file:text-sm file:text-foreground"
          />
        </div>

        {recadoDaArte && (
          <p
            data-testid="destaque-recado"
            role="status"
            className="rounded-lg border border-input bg-muted/40 p-3 text-xs text-foreground"
          >
            {recadoDaArte}
          </p>
        )}

        {config.image_url && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="destaque-alt">Descrição da imagem</Label>
              <Input
                id="destaque-alt"
                value={config.image_alt ?? ''}
                onChange={e => onConfigChange({ image_alt: e.target.value })}
              />
              {/* Numa loja em que a peça é a homenagem de alguém, imagem sem descrição é a página
                  muda no leitor de tela. Quem recusa ao salvar é `configRefusal`. */}
              <p className="text-xs text-muted-foreground">
                Obrigatória: é o que quem usa leitor de tela ouve no lugar da foto.
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onConfigChange({ image_url: '', image_alt: '' })}
              className="text-muted-foreground"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remover a foto
            </Button>
          </>
        )}
      </FormCard>
    </>
  )
}

export default CollectionFeatureEditor
