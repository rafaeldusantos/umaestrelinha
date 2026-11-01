// As peças da proposta (feature 89, `MON-05`, `MON-06`; desenho do protótipo `Pedido - Montar.html`,
// ajuste de 2026-11-01).
//
// **Duas coisas na tela, como no protótipo:**
//   1. A LISTA das peças já acrescentadas: foto, nome, variação · gravação, os selos ("Pede material
//      da cliente", a promoção que vale), o contador de quantidade, o total da linha e "Tirar".
//   2. A caixa "Acrescentar peça", que abre pelo botão do cabeçalho (e já aberta quando não há peça):
//      busca com foto → a peça escolhida com as variações em chips com foto → quantidade e gravação
//      → "Acrescentar · R$ X". A peça só entra na lista PRONTA — com a variação escolhida.
//
// - **A busca é a do dono único** (`ProductSearchField`, `AD-036`), com `mostrarFoto`. A peça
//   desativada nem aparece: o servidor a recusaria na gravação ("não está à venda"). A mesma peça
//   pode entrar duas vezes, com variações diferentes — por isso a busca não marca "já escolhida".
// - **Cada linha relê a peça por id** (`useProductVariants`) e se acerta sozinha (`acertoDaLinha`):
//   o preço de hoje, a foto, o teto do estoque. Isso vale também para a linha que veio de uma
//   proposta gravada (editar e duplicar, `DUP-01`): a variação que foi pausada desde então volta a
//   ser pedida NA PRÓPRIA LINHA, com os mesmos chips.
// - **Gravação com o teto da loja**: o campo só existe na variação que grava (`hasEngraving`) e o
//   limite é `engravingLimit` da peça, o mesmo da página do produto. A linha mostra a gravação; se
//   ela deixar de caber (o teto mudou), o campo reaparece na linha com a recusa.
// - **Quantidade**: de 1 ao estoque, quando a peça controla estoque, e nunca acima de
//   `PROPOSAL_MAX_QTY`.

import { useEffect, useId, useMemo, useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { engravingLimit, engravingRefusal } from '@estrelinha/core/material'
import { PROPOSAL_MAX_QTY } from '@estrelinha/core/proposals'
import {
  PecaFoto,
  ProductSearchField,
  VariantPicker,
  useProductPool,
  useProductVariants,
  type VariacaoDaPeca,
} from '@/entities/product'
import { CharCounter, FormCard } from '@/shared/ui'
import type { DraftLine } from '../model/draft'
import { MATERIAL_TAG, acertoDaLinha, linhaEscolhida, tetoDoEstoque } from '../model/lines'
import { LINK_ACAO, SELO_AMBAR, SELO_VERDE } from './estilos'

/** O preço travado de uma linha, como o resumo o calculou (já com a promoção que venceu). */
export interface PrecoDaLinha {
  unitario: number
  cheio: number
}

interface Props {
  lines: readonly DraftLine[]
  onAdd: (line: DraftLine) => void
  onUpdate: (key: string, patch: Partial<DraftLine>) => void
  onRemove: (key: string) => void
  /** O preço travado de cada linha pronta, pela `key` (vem do resumo, `priceProposalDraft`). */
  precos?: Readonly<Record<string, PrecoDaLinha>>
}

const mesmo = (line: DraftLine, patch: Partial<DraftLine>) =>
  (Object.keys(patch) as (keyof DraftLine)[]).every((k) => JSON.stringify(line[k]) === JSON.stringify(patch[k]))

const tetoDaQuantidade = (cap: number | null | undefined) => Math.min(PROPOSAL_MAX_QTY, cap ?? PROPOSAL_MAX_QTY)

/** O contador − n + da quantidade. 44px nos dois lugares (o protótipo desenha 40 na linha, abaixo do
 *  piso de toque do projeto). */
const Contador = ({
  id,
  nome,
  valor,
  teto,
  onMudar,
  compacto = false,
}: {
  id: string
  nome: string
  valor: number
  teto: number
  onMudar: (n: number) => void
  compacto?: boolean
}) => {
  const mudar = (n: number) => onMudar(Math.min(teto, Math.max(1, Math.trunc(n) || 1)))
  const lado = 'h-11 w-11'
  return (
    <div className={cn('inline-flex h-11 shrink-0 items-stretch overflow-hidden rounded-lg border border-input bg-card', compacto && 'text-sm')}>
      <button
        type="button"
        aria-label={`Menos uma unidade de ${nome}`}
        disabled={valor <= 1}
        onClick={() => mudar(valor - 1)}
        className={cn(lado, 'flex items-center justify-center transition-colors motion-reduce:transition-none hover:bg-muted disabled:opacity-40')}
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <input
        id={id}
        aria-label={`Quantidade de ${nome}`}
        type="number"
        inputMode="numeric"
        min={1}
        max={teto}
        value={valor}
        onChange={(e) => mudar(Number(e.target.value))}
        className="w-10 border-0 bg-card text-center text-sm font-semibold tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Mais uma unidade de ${nome}`}
        disabled={valor >= teto}
        onClick={() => mudar(valor + 1)}
        className={cn(lado, 'flex items-center justify-center transition-colors motion-reduce:transition-none hover:bg-muted disabled:opacity-40')}
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </div>
  )
}

const CampoDeGravacao = ({
  id,
  valor,
  limite,
  recusa,
  onMudar,
}: {
  id: string
  valor: string
  limite: number
  recusa: string | null
  onMudar: (v: string) => void
}) => (
  <div className="min-w-0 space-y-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        Gravação
      </label>
      <CharCounter value={valor} limit={limite} />
    </div>
    <Input id={id} className="h-11" maxLength={limite} placeholder="Nome, data ou uma palavra" value={valor} onChange={(e) => onMudar(e.target.value)} />
    {recusa && (
      <p role="alert" className="text-xs text-destructive">
        {recusa}
      </p>
    )}
  </div>
)

// ---------------------------------------------------------------------------------------------
// A caixa "Acrescentar peça"
// ---------------------------------------------------------------------------------------------

const PecaEscolhida = ({
  productId,
  nomeDaBusca,
  onTrocar,
  onCancelar,
  onAcrescentar,
}: {
  productId: string
  nomeDaBusca: string
  onTrocar: () => void
  onCancelar: () => void
  onAcrescentar: (l: DraftLine) => void
}) => {
  const base = useId()
  const { peca, carregando, erro, recarregar } = useProductVariants(productId)
  const [variacaoId, setVariacaoId] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [gravacao, setGravacao] = useState('')

  // Uma variação só oferecível entra sozinha — escolher a única opção é um clique sem decisão.
  const oferecivel = peca ? peca.variacoes.filter((v) => v.disponivel && v.preco !== null) : []
  useEffect(() => {
    if (peca && variacaoId === null && oferecivel.length === 1) setVariacaoId(oferecivel[0].id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peca])

  const variacao: VariacaoDaPeca | null = peca?.variacoes.find((v) => v.id === variacaoId) ?? null
  const semGrade = !!peca && peca.variacoes.length === 0
  const preco = semGrade ? peca.precoBase : variacao?.preco ?? null
  const grava = !!variacao?.grava
  const limite = engravingLimit(peca?.limiteDeGravacao ?? null)
  const teto = peca ? tetoDaQuantidade(tetoDoEstoque(peca.politica, semGrade ? peca.estoqueTotal : variacao?.estoque ?? 0)) : PROPOSAL_MAX_QTY
  const qtd = Math.min(quantidade, teto)
  const recusaDaGravacao = grava ? engravingRefusal(gravacao, peca?.limiteDeGravacao ?? null) : null
  const pronta = !!peca && preco !== null && (semGrade || variacao !== null) && !recusaDaGravacao
  const nome = peca?.nome || nomeDaBusca

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <PecaFoto url={variacao?.imagem ?? peca?.imagem} tamanho={52} />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-semibold text-foreground">{nome}</p>
          {peca?.pedeMaterial && <p className="text-xs text-muted-foreground">{MATERIAL_TAG}</p>}
        </div>
        <button type="button" onClick={onTrocar} className={LINK_ACAO} aria-label={`Trocar a peça ${nome}`}>
          Trocar
        </button>
      </div>

      {carregando && <p className="text-xs text-muted-foreground">Carregando a peça…</p>}
      {erro !== null && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>Não consegui ler a peça. {erro}</span>
          <button type="button" onClick={recarregar} className="min-h-11 rounded-lg border border-input px-3 font-medium text-foreground">
            Tentar de novo
          </button>
        </div>
      )}

      {peca && peca.variacoes.length > 0 && (
        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium text-foreground">Variação</legend>
          <VariantPicker
            rotulo={`Variação de ${nome}`}
            variacoes={peca.variacoes}
            politica={peca.politica}
            escolhida={variacaoId}
            onEscolher={(v) => setVariacaoId(v.id)}
          />
        </fieldset>
      )}

      {peca && (
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
          <div className="space-y-1.5">
            <label htmlFor={`${base}-qtd`} className="block text-sm font-medium text-foreground">
              Quantidade
            </label>
            <Contador id={`${base}-qtd`} nome={nome} valor={qtd} teto={teto} onMudar={setQuantidade} />
          </div>
          {grava && <CampoDeGravacao id={`${base}-gravacao`} valor={gravacao} limite={limite} recusa={recusaDaGravacao} onMudar={setGravacao} />}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" className="h-11" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="h-11"
          disabled={!pronta}
          onClick={() => peca && onAcrescentar(linhaEscolhida(peca, semGrade ? null : variacao, qtd, gravacao))}
        >
          {pronta && preco !== null ? `Acrescentar · ${formatPrice(preco * qtd)}` : peca && !semGrade && !variacao ? 'Escolha a variação' : 'Acrescentar'}
        </Button>
      </div>
    </div>
  )
}

const AcrescentarPeca = ({ onAcrescentar, onCancelar }: { onAcrescentar: (l: DraftLine) => void; onCancelar: () => void }) => {
  const { produtos } = useProductPool()
  // A peça desativada nem aparece (o servidor recusaria). A chave textual evita refazer a lista.
  const inativas = useMemo(() => produtos.filter((p) => !p.is_active).map((p) => p.id), [produtos])
  const [escolhida, setEscolhida] = useState<{ id: string; nome: string } | null>(null)

  return (
    <div data-testid="acrescentar-peca" className="rounded-2xl border border-dashed border-input bg-muted/20 p-3.5">
      {escolhida ? (
        <PecaEscolhida
          productId={escolhida.id}
          nomeDaBusca={escolhida.nome}
          onTrocar={() => setEscolhida(null)}
          onCancelar={onCancelar}
          onAcrescentar={onAcrescentar}
        />
      ) : (
        <div className="space-y-2">
          <ProductSearchField
            id="proposta-busca-de-peca"
            rotulo="Buscar peça"
            modo="multiplo"
            excluir={inativas}
            mostrarPreco
            mostrarFoto
            autoFocus
            placeholder="Nome da peça"
            onEscolher={(p) => setEscolhida({ id: p.id, nome: p.name })}
          />
          <div className="flex justify-end">
            <Button type="button" variant="ghost" className="h-11" onClick={onCancelar}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------
// A linha de uma peça já acrescentada
// ---------------------------------------------------------------------------------------------

const LinhaDaPeca = ({
  line,
  preco,
  onUpdate,
  onRemove,
}: { line: DraftLine; preco: PrecoDaLinha | undefined } & Pick<Props, 'onUpdate' | 'onRemove'>) => {
  const base = useId()
  const { peca, carregando, erro, recarregar } = useProductVariants(line.product_id)
  const pausada = !!peca && line.variant_id !== null && !peca.variacoes.some((v) => v.id === line.variant_id)

  useEffect(() => {
    if (!peca) return
    const patch = acertoDaLinha(line, peca)
    if (!mesmo(line, patch)) onUpdate(line.key, patch)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peca, line.variant_id])

  const limite = engravingLimit(line.engraving_max)
  const recusaDaGravacao = line.engraves ? engravingRefusal(line.engraving_text, line.engraving_max) : null
  const faltaVariacao = !!peca && peca.variacoes.length > 0 && (line.variant_id === null || pausada)
  const teto = tetoDaQuantidade(line.stock_cap)
  const detalhe = [line.variant_label, line.engraves && line.engraving_text.trim() ? `Gravação: “${line.engraving_text.trim()}”` : null]
    .filter(Boolean)
    .join(' · ')
  const promocao = preco && preco.unitario < preco.cheio ? Math.round((1 - preco.unitario / preco.cheio) * 100) : 0
  const total = preco ? preco.unitario * line.quantity : line.list_price !== null ? line.list_price * line.quantity : null

  return (
    <li data-testid="linha-da-peca" className="space-y-3 border-t border-border py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
        <PecaFoto url={line.image_url} tamanho={52} />
        <div className="min-w-0 flex-1 basis-40">
          <p className="break-words text-sm font-semibold text-foreground">{line.product_name}</p>
          {detalhe && <p className="break-words text-xs text-muted-foreground">{detalhe}</p>}
          {(line.requires_material || promocao > 0) && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {line.requires_material && (
                <span data-testid="pede-material" className={SELO_AMBAR}>
                  {MATERIAL_TAG}
                </span>
              )}
              {promocao > 0 && <span className={SELO_VERDE}>Promoção · −{promocao}%</span>}
            </div>
          )}
        </div>
        {/* No celular o contador, o preço e o "Tirar" descem para uma linha própria, sem o recuo da
            foto: com o contador de 44px o recuo de 66px do protótipo empurrava o "Tirar" para fora de
            390 (medido em navegador). */}
        <div className="flex w-full items-center justify-between gap-2.5 sm:w-auto">
          <Contador
            id={`${base}-qtd`}
            nome={line.product_name}
            valor={line.quantity}
            teto={teto}
            compacto
            onMudar={(n) => onUpdate(line.key, { quantity: n })}
          />
          <p data-testid="preco-da-linha" className="min-w-0 flex-1 text-right sm:min-w-[84px] sm:flex-none font-heading text-sm font-semibold tabular-nums text-foreground">
            {total !== null ? formatPrice(total) : '—'}
          </p>
          <button
            type="button"
            onClick={() => onRemove(line.key)}
            aria-label={`Tirar ${line.product_name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {carregando && <p className="text-xs text-muted-foreground">Carregando a peça…</p>}
      {erro !== null && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-destructive">
          <span>Não consegui ler a peça. {erro}</span>
          <button type="button" onClick={recarregar} className="min-h-11 rounded-lg border border-input px-3 font-medium text-foreground">
            Tentar de novo
          </button>
        </div>
      )}

      {peca && faltaVariacao && (
        <div className="space-y-1.5 sm:pl-[66px]">
          <p role="status" className="text-xs text-destructive">
            {pausada ? 'A variação escolhida não está mais ativa. Escolha outra.' : 'Escolha a variação.'}
          </p>
          <VariantPicker
            rotulo={`Variação de ${line.product_name}`}
            variacoes={peca.variacoes}
            politica={peca.politica}
            escolhida={pausada ? null : line.variant_id}
            onEscolher={(v) => onUpdate(line.key, { variant_id: v.id })}
          />
        </div>
      )}

      {line.engraves && (recusaDaGravacao || faltaVariacao) && (
        <div className="sm:pl-[66px]">
          <CampoDeGravacao
            id={`${base}-gravacao`}
            valor={line.engraving_text}
            limite={limite}
            recusa={recusaDaGravacao}
            onMudar={(v) => onUpdate(line.key, { engraving_text: v })}
          />
        </div>
      )}
    </li>
  )
}

const ItemsSection = ({ lines, onAdd, onUpdate, onRemove, precos = {} }: Props) => {
  const [acrescentando, setAcrescentando] = useState(lines.length === 0)
  // A proposta relida para editar chega depois do primeiro render: com peças, a caixa fecha.
  const [viuPecas, setViuPecas] = useState(lines.length > 0)
  useEffect(() => {
    if (!viuPecas && lines.length > 0) {
      setViuPecas(true)
      setAcrescentando(false)
    }
  }, [lines.length, viuPecas])

  return (
    <FormCard
      title="Peças"
      action={
        !acrescentando ? (
          <Button type="button" variant="outline" className="h-11" onClick={() => setAcrescentando(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Acrescentar peça
          </Button>
        ) : undefined
      }
    >
      {lines.length === 0 && !acrescentando && <p className="text-sm text-muted-foreground">Nenhuma peça ainda.</p>}
      {lines.length > 0 && (
        <ul aria-label="Peças da proposta">
          {lines.map((l) => (
            <LinhaDaPeca key={l.key} line={l} preco={precos[l.key]} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
        </ul>
      )}
      {acrescentando && (
        <AcrescentarPeca
          onCancelar={() => setAcrescentando(false)}
          onAcrescentar={(l) => {
            onAdd(l)
            setAcrescentando(false)
          }}
        />
      )}
    </FormCard>
  )
}

export default ItemsSection
