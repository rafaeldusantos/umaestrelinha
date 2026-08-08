import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@nanapin/ui/dialog'
import { Button } from '@nanapin/ui/button'
import { Upload, FileSpreadsheet, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toast } from '@nanapin/ui/hooks/use-toast'
import type { DbProduct } from '@nanapin/supabase/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onImport: (products: Partial<DbProduct>[]) => Promise<void>
}

/**
 * Cabeçalho do CSV → COLUNA do banco.
 *
 * `preco` e `preco_comparativo` apontavam para `price` e `compare_price`, que **não existem** em
 * `public.products` (são `base_price` e `original_price`) — todo import falhava com erro de coluna
 * inexistente. Achado ao escrever o exportador da `14`/T45, cujo critério é justamente "o CSV
 * exportado volta pelo importador".
 */
const FIELD_MAP: Record<string, string> = {
  nome: 'name', name: 'name',
  descricao: 'description', description: 'description',
  preco: 'base_price', price: 'base_price', base_price: 'base_price',
  preco_comparativo: 'original_price', compare_price: 'original_price', original_price: 'original_price',
  custo: 'cost_price', cost_price: 'cost_price',
  estoque: 'stock_total', stock_total: 'stock_total',
  slug: 'slug',
  tags: 'tags',
}

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

const parseRows = (rows: Record<string, any>[]): Partial<DbProduct>[] => {
  return rows.map(row => {
    const product: any = {}
    for (const [key, value] of Object.entries(row)) {
      const mapped = FIELD_MAP[key.toLowerCase().trim()]
      if (mapped) {
        if (['base_price', 'original_price', 'cost_price', 'stock_total'].includes(mapped)) {
          product[mapped] = Number(value) || 0
        } else if (mapped === 'tags') {
          product[mapped] = String(value).split(',').map(s => s.trim()).filter(Boolean)
        } else {
          product[mapped] = String(value)
        }
      }
    }
    if (product.name && !product.slug) product.slug = slugify(product.name)
    return product
  }).filter(p => p.name)
}

const CsvImportDialog = ({ open, onOpenChange, onImport }: Props) => {
  const [rows, setRows] = useState<Partial<DbProduct>[]>([])
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setFileName(file.name)
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => setRows(parseRows(results.data as Record<string, any>[])),
      })
    } else {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'binary' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]
        setRows(parseRows(data))
      }
      reader.readAsBinaryString(file)
    }
  }

  const doImport = async () => {
    setImporting(true)
    try {
      await onImport(rows)
      toast({ title: `${rows.length} produto(s) importado(s)!` })
      setRows([])
      setFileName('')
      onOpenChange(false)
    } catch {
      toast({ title: 'Erro na importação', variant: 'destructive' })
    }
    setImporting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Importar Produtos (CSV/Excel)</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Arraste um arquivo CSV ou XLSX aqui</p>
            <p className="text-xs text-muted-foreground mt-1">Colunas: nome, descricao, preco, preco_comparativo, custo, estoque, slug, tags</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">{fileName} — <strong>{rows.length}</strong> produto(s) encontrado(s)</p>
            <div className="border border-border rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-2">Nome</th>
                    <th className="text-right p-2">Preço</th>
                    <th className="text-center p-2">Estoque</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="p-2">{r.name}</td>
                      <td className="p-2 text-right">R$ {(r.price ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-center">{r.stock_total ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 20 && <p className="text-xs text-muted-foreground">... e mais {rows.length - 20} produto(s)</p>}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setRows([]); setFileName('') }}>Cancelar</Button>
              <Button className="gradient-cta text-white" onClick={doImport} disabled={importing}>
                {importing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Importando...</> : `Importar ${rows.length} produto(s)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CsvImportDialog
