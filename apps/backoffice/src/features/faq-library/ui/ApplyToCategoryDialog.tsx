import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { Button } from '@estrelinha/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import { Label } from '@estrelinha/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import type { MenuCategory } from '@estrelinha/core/menu'
import { planFaqBatch, type ProductInCategory } from '../model/applyToCategory'

interface Props {
  open: boolean
  faqId: string | null
  faqQuestion: string
  categories: readonly (MenuCategory & { name: string })[]
  onClose: () => void
  onDone: () => void
}

/**
 * Aplicar uma pergunta a uma categoria inteira — `FAQ-35`, `FAQ-36`.
 *
 * É o que substitui, com dado de verdade, a ideia de "perguntas fixas da loja" que ficou fora de
 * escopo: em vez de uma segunda lista global disputando com a do produto, o lote grava **vínculo de
 * verdade**, que continua editável produto a produto.
 *
 * **A prévia sai antes de gravar, e vem da mesma função da gravação.** "Vai aplicar a 155 produtos"
 * é a diferença entre uma operação em lote que a dona controla e uma que ela descobre depois.
 */
const ApplyToCategoryDialog = ({
  open,
  faqId,
  faqQuestion,
  categories,
  onClose,
  onDone,
}: Props) => {
  const [categoryId, setCategoryId] = useState('')
  const [vinculos, setVinculos] = useState<ProductInCategory[]>([])
  const [jaTem, setJaTem] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [feito, setFeito] = useState<number | null>(null)

  useEffect(() => {
    if (!open) return
    setCategoryId('')
    setFeito(null)
    setErro(null)
  }, [open])

  const carregar = useCallback(async () => {
    if (!open || !faqId) return
    setCarregando(true)

    const [todos, comEsta] = await Promise.all([
      supabase.from('product_categories').select('product_id, category_id'),
      supabase.from('product_faqs').select('product_id').eq('faq_id', faqId),
    ])

    setVinculos((todos.data ?? []) as ProductInCategory[])
    setJaTem(new Set(((comEsta.data ?? []) as { product_id: string }[]).map(v => v.product_id)))
    setCarregando(false)
  }, [open, faqId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const plano = useMemo(
    () => planFaqBatch(categories, categoryId, vinculos, jaTem),
    [categories, categoryId, vinculos, jaTem],
  )

  const aplicar = async () => {
    if (!faqId || plano.paraGravar.length === 0) return
    setGravando(true)
    setErro(null)

    // `position: 999` põe a pergunta no FIM da lista de cada produto. Um lote não sabe (nem deve
    // adivinhar) a ordem que a dona escolheu produto a produto; entrar no fim é o único lugar que
    // não desloca nada do que ela já organizou.
    const linhas = plano.paraGravar.map(product_id => ({
      product_id,
      faq_id: faqId,
      position: 999,
      answer_override: null,
    }))

    const { error } = await supabase.from('product_faqs').insert(linhas)
    setGravando(false)

    if (error) {
      setErro(error.message)
      return
    }
    setFeito(linhas.length)
    onDone()
  }

  return (
    <Dialog open={open} onOpenChange={aberto => !aberto && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar a uma categoria</DialogTitle>
          <DialogDescription>“{faqQuestion}”</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="faq-batch-category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="faq-batch-category">
                <SelectValue placeholder="Escolha a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              A pergunta também alcança as subcategorias.
            </p>
          </div>

          {categoryId && !carregando && (
            <div
              className="rounded-xl border border-border bg-muted/40 p-3 text-sm"
              data-testid="faq-batch-preview"
            >
              <p className="text-foreground">
                <strong>{plano.paraGravar.length}</strong> produto(s) vão receber esta pergunta.
              </p>
              {plano.jaTinham > 0 && (
                <p className="text-muted-foreground mt-1">
                  {plano.jaTinham} já tinham e serão pulados.
                </p>
              )}
              {plano.alcancados === 0 && (
                <p className="text-muted-foreground mt-1">
                  Esta categoria não tem produto nenhum.
                </p>
              )}
            </div>
          )}

          {feito !== null && (
            <p role="status" className="text-sm text-foreground">
              Pronto — {feito} vínculo(s) criado(s).
            </p>
          )}
          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            type="button"
            onClick={aplicar}
            disabled={gravando || carregando || plano.paraGravar.length === 0}
          >
            {gravando ? 'Aplicando…' : `Aplicar a ${plano.paraGravar.length} produto(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ApplyToCategoryDialog
