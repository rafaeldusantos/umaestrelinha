// O casco do editor de uma seção da Home (feature 24, T30).
//
// **Editor é TELA, não modal** — o precedente dos Descontos: a rota sobrevive ao F5 e é
// compartilhável, coisas que um modal perde. O que muda aqui é o preço que aquele precedente
// costuma cobrar: lá abrir o editor troca a página inteira, e aqui isso apagaria justamente a
// prévia, que é o que a dona está olhando enquanto edita.
//
// Por isso **a rota troca só a coluna da esquerda**. `/admin/home` e `/admin/home/:sectionId`
// montam o MESMO `AdminHomePage`; esta lista vira este formulário, e a prévia da direita continua
// a mesma árvore de React — não remonta, não pisca, e o bloco em edição aparece contornado.
//
// O rascunho vive aqui e não no que veio do banco: é o que faz `HOME-14` valer — gravação recusada
// **preserva o que a dona preencheu**, porque o preenchido está neste estado e não numa releitura.

import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { sectionMeta, type HomeSectionConfig, type ResolvedSection } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category'
import { FormCard, FormPageHeader } from '@/shared/ui'
import {
  draftChanged,
  toDraftItems,
  type DraftItem,
} from '../model/sectionDraft'
import { SECTION_EDITORS, type EditorProduct } from './sectionEditors'

export interface SectionSaveDraft {
  config: HomeSectionConfig
  items: DraftItem[]
}

interface Props {
  entry: ResolvedSection
  categories: readonly AdminCategory[]
  products: readonly EditorProduct[]
  saving: boolean
  onCancel: () => void
  /** Devolve o motivo da falha, ou `null` quando gravou. Mesmo formato das recusas do domínio. */
  onSave: (draft: SectionSaveDraft) => Promise<string | null>
}

const HomeSectionEditor = ({ entry, categories, products, saving, onCancel, onSave }: Props) => {
  const { section } = entry
  const meta = sectionMeta(section.type)
  const editor = SECTION_EDITORS[section.type]

  // Semeado uma vez. Quem troca de seção é a rota, e o `key={sectionId}` de quem monta este
  // componente é o que garante o recomeço — reagir a `section` aqui desfaria, na releitura de
  // qualquer gravação vizinha, o que a dona ainda não salvou.
  const [config, setConfig] = useState<HomeSectionConfig>(() => ({ ...(section.config ?? {}) }))
  const [items, setItems] = useState<DraftItem[]>(() => toDraftItems(section.items))
  const [problema, setProblema] = useState<string | null>(null)

  const alterado = draftChanged(section, config, items)

  const handleSave = async () => {
    // A recusa vem do editor daquele tipo: só ele sabe se falta `alt`, se falta destino ou se o
    // limite estourou. O casco não adivinha, e um casco que adivinhasse seria o segundo dono da
    // regra de cada formulário.
    const recusa = editor?.refusal?.(config, items) ?? null
    if (recusa) {
      setProblema(recusa)
      return
    }

    setProblema(null)
    const falha = await onSave({ config, items })
    // **Nada é limpo aqui.** `HOME-14`: falha diz o que não foi salvo e preserva o preenchido.
    if (falha) setProblema(falha)
  }

  const Body = editor?.Body

  return (
    <div data-testid="editor-secao" data-section={section.id}>
      <FormPageHeader
        group="Loja"
        parentLabel="Home"
        title={meta?.label ?? section.type}
        isDirty={alterado}
        saving={saving}
        saveLabel="Salvar seção"
        onBack={onCancel}
        onSave={handleSave}
      />

      {problema && (
        <p
          data-testid="editor-recusa"
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {problema}
        </p>
      )}

      <div className="space-y-4">
        {Body ? (
          <Body
            section={section}
            config={config}
            onConfigChange={patch => setConfig(atual => ({ ...atual, ...patch }))}
            items={items}
            onItemsChange={setItems}
            categories={categories}
            products={products}
          />
        ) : (
          // Tipo sem editor ainda: dizer isso é melhor que uma coluna vazia, que a dona leria como
          // tela quebrada. A linha continua arrastável e desligável na lista.
          <FormCard title={meta?.label ?? section.type}>
            <p className="text-sm text-muted-foreground">
              Este bloco ainda não tem campos para editar. Você pode ligá-lo, desligá-lo e mudá-lo de
              lugar pela lista de seções.
            </p>
          </FormCard>
        )}
      </div>
    </div>
  )
}

export default HomeSectionEditor
