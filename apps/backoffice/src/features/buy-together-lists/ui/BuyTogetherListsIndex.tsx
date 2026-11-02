// O índice das listas do Compre Junto — tabela no desktop, cartões no celular.
//
// Vazio e ilegível não são o mesmo estado (`AD-014`): a leitura que falha diz que falhou, e não
// "nenhuma lista".

import { ListChecks, Plus } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { BUY_TOGETHER_LIST_ITEMS_MAX } from '@estrelinha/core/buy-together'
import { EmptyState, PageHeader, TableSkeleton } from '@/shared/ui'
import { PecaFoto } from '@/entities/product'
import type { ListaDoCompreJunto } from '../api/useBuyTogetherLists'

export interface BuyTogetherListsIndexProps {
  listas: ListaDoCompreJunto[]
  loading: boolean
  error: string | null
  onRetry: () => void
  onNew: () => void
  onOpen: (id: string) => void
  /** O relógio, injetável para o "Atualizada" relativo ser testável. */
  now?: number
}

const relativa = (iso: string, agora: number): string => {
  const dias = Math.floor((agora - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

const aviso = (n: number): string => `${n} ${n === 1 ? 'peça saiu' : 'peças saíram'} do ar`

const usoDe = (l: ListaDoCompreJunto): string =>
  l.usadaEm.length === 0 ? 'Nenhuma joia' : `${l.usadaEm.length} ${l.usadaEm.length === 1 ? 'joia' : 'joias'}`

const pecasDe = (l: ListaDoCompreJunto, completo: boolean): string =>
  completo ? `${l.pecas.length} de ${BUY_TOGETHER_LIST_ITEMS_MAX}` : `${l.pecas.length} ${l.pecas.length === 1 ? 'peça' : 'peças'}`

const Pilha = ({ lista, quantas }: { lista: ListaDoCompreJunto; quantas: number }) => (
  <span className="flex -space-x-2">
    {lista.pecas.slice(0, quantas).map(p => (
      <PecaFoto key={p.productId} url={p.imagem} tamanho={32} className="border-2 border-background" />
    ))}
  </span>
)

const BuyTogetherListsIndex = ({ listas, loading, error, onRetry, onNew, onOpen, now }: BuyTogetherListsIndexProps) => {
  const agora = now ?? Date.now()
  const foraDoAr = (l: ListaDoCompreJunto) => l.pecas.filter(p => !p.ativa).length

  return (
    <div>
      <PageHeader
        title="Compre Junto"
        subtitle="As listas de peças que você oferece junto com as joias."
        icon={ListChecks}
        actions={
          <Button className="min-h-11" onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Nova lista
          </Button>
        }
      />

      <p className="mb-4 border-b border-border pb-2 text-sm font-semibold text-foreground">
        Listas <span data-testid="contagem-de-listas" className="text-muted-foreground">({listas.length})</span>
      </p>

      {error ? (
        <EmptyState
          icon={ListChecks}
          message="Não foi possível ler as listas."
          hint={error}
          action={<Button onClick={onRetry}>Tentar de novo</Button>}
        />
      ) : loading ? (
        <TableSkeleton />
      ) : listas.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          message="Uma lista junta as peças que você oferece junto com outras joias — por exemplo, as correntes. Monte uma vez e use em quantas joias quiser."
          action={<Button onClick={onNew}>Nova lista</Button>}
        />
      ) : (
        <>
          <table data-testid="tabela-de-listas" className="hidden w-full text-sm md:table">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Lista</th>
                <th className="py-2 font-medium">Peças</th>
                <th className="py-2 font-medium">Em uso em</th>
                <th className="py-2 font-medium">Atualizada</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {listas.map(l => (
                <tr key={l.id} data-testid={`lista-${l.id}`} className="border-b border-border/60">
                  <td className="py-3">
                    <p className="font-medium text-foreground">{l.name}</p>
                    {foraDoAr(l) > 0 && (
                      <p data-testid={`aviso-${l.id}`} className="text-xs text-estrelinha-admin-amber">{aviso(foraDoAr(l))}</p>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Pilha lista={l} quantas={4} />
                      <span className="text-xs text-muted-foreground">{pecasDe(l, true)}</span>
                    </div>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">{usoDe(l)}</td>
                  <td className="py-3 text-xs text-muted-foreground">{relativa(l.updatedAt, agora)}</td>
                  <td className="py-3 text-right">
                    <Button variant="ghost" className="min-h-11" aria-label={`Editar ${l.name}`} onClick={() => onOpen(l.id)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul data-testid="cartoes-de-listas" className="space-y-2 md:hidden">
            {listas.map(l => (
              <li key={l.id}>
                <button
                  type="button"
                  data-testid={`cartao-${l.id}`}
                  onClick={() => onOpen(l.id)}
                  className="flex min-h-11 w-full flex-col gap-2 rounded-xl border border-border p-3 text-left"
                >
                  <span className="font-medium text-foreground">{l.name}</span>
                  {foraDoAr(l) > 0 && <span className="text-xs text-estrelinha-admin-amber">{aviso(foraDoAr(l))}</span>}
                  <span className="flex items-center gap-2">
                    <Pilha lista={l} quantas={3} />
                    <span className="text-xs text-muted-foreground">{pecasDe(l, false)} · {usoDe(l)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export default BuyTogetherListsIndex
