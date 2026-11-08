import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import type { PecaParaProposta } from '@estrelinha/core/proposals'

import CampoDeBusca from '@/shared/ui/CampoDeBusca'
import FotoDaPeca from '@/shared/ui/FotoDaPeca'
import { FalhaDoBloco, Traco } from '@/shared/ui/leitura'

import {
  ACRESCENTAR_PECA,
  BUSCAR_JOIA,
  CARREGANDO_O_CATALOGO,
  DICA_DA_BUSCA_DE_JOIA,
  EDITAR,
  PEDE_MATERIAL_DA_CLIENTE,
  etiquetaDaPromocao,
  buscarPecas,
  editarPeca,
  gravacaoDaLinha,
  nenhumaJoiaCom,
  pecasNaSacola,
  quantidadeVezesPreco,
  removerPeca,
  resumoDaPeca,
  tituloDaSacola,
  type LinhaDaSacola,
} from '../model/sacola'
import type { PromocaoDaLinha } from '../model/tipos'

/** O tempo que o campo espera a próxima tecla — a busca é no aparelho, sobre o catálogo já lido. */
const ATRASO_DA_BUSCA_MS = 150

export interface CatalogoDoPasso {
  dado: PecaParaProposta[] | undefined
  carregando: boolean
  falhou: boolean
  tentarDeNovo: () => void
}

export interface PassoDasPecasProps {
  sacola: readonly LinhaDaSacola[]
  catalogo: CatalogoDoPasso
  /** Muda a cada peça confirmada: remonta o campo de busca, que volta vazio. */
  geracaoDaBusca: number
  aoEscolherPeca: (peca: PecaParaProposta) => void
  aoEditar: (linha: LinhaDaSacola) => void
  aoRemover: (linha: LinhaDaSacola) => void
  /** A promoção vigente de cada linha (pela chave), como a prévia do servidor a disse. Só exibição. */
  promocoes?: ReadonlyMap<string, PromocaoDaLinha>
}

/**
 * O passo 2 · Peças: a sacola (cada linha com a foto da variação escolhida, a mesma que a cliente verá
 * no link) e "Acrescentar peça" — a busca pela regra de `core` sobre o catálogo lido uma vez, cada
 * resultado com a capa e "a partir de R$ … · N em estoque · pede material". Tocar uma peça abre a folha
 * da variação; a conta da peça é a do preço cheio (o desconto é do passo seguinte).
 */
const PassoDasPecas = ({ sacola, catalogo, geracaoDaBusca, aoEscolherPeca, aoEditar, aoRemover, promocoes }: PassoDasPecasProps) => {
  const [termo, setTermo] = useState('')
  const [geracaoVista, setGeracaoVista] = useState(geracaoDaBusca)
  if (geracaoVista !== geracaoDaBusca) {
    setGeracaoVista(geracaoDaBusca)
    setTermo('')
  }
  const achadas = useMemo(() => (catalogo.dado ? buscarPecas(catalogo.dado, termo) : null), [catalogo.dado, termo])
  const limpo = termo.trim()

  return (
    <section aria-label="Peças" className="space-y-5">
      {sacola.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-display text-lg text-estrelinha-ink">{tituloDaSacola(pecasNaSacola(sacola))}</h2>
          <ul aria-label="Sacola" className="divide-y divide-estrelinha-line rounded-md bg-estrelinha-surface">
            {sacola.map((l) => (
              <li key={l.chave} data-testid="linha-da-sacola" className="flex gap-3 p-3">
                <FotoDaPeca foto={l.foto} tamanho={64} altura={80} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-base text-estrelinha-ink [overflow-wrap:anywhere]">{l.nome}</p>
                  {l.rotulo && <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{l.rotulo}</p>}
                  {l.gravacao !== '' && <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{gravacaoDaLinha(l.gravacao)}</p>}
                  <p className="text-sm tabular-nums text-estrelinha-ink-soft">{quantidadeVezesPreco(l.quantidade, l.preco)}</p>
                  {(l.pedeMaterial || promocoes?.get(l.chave)) && (
                    <p className="flex flex-wrap gap-1">
                      {l.pedeMaterial && (
                        <span className="inline-block rounded-full bg-estrelinha-ground-deep px-2 py-0.5 text-xs text-estrelinha-ink">{PEDE_MATERIAL_DA_CLIENTE}</span>
                      )}
                      {promocoes?.get(l.chave) && (
                        <span className="inline-block rounded-full bg-estrelinha-ground-deep px-2 py-0.5 text-xs text-estrelinha-ink [overflow-wrap:anywhere]">
                          {etiquetaDaPromocao(promocoes.get(l.chave)!)}
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="font-medium tabular-nums text-estrelinha-ink">{formatPrice(l.preco * l.quantidade)}</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={editarPeca(l.nome)}
                        onClick={() => aoEditar(l)}
                        className="min-h-11 rounded-sm px-3 text-sm font-medium text-estrelinha-primary hover:bg-estrelinha-ground-deep"
                      >
                        {EDITAR}
                      </button>
                      <button
                        type="button"
                        aria-label={removerPeca(l.nome)}
                        onClick={() => aoRemover(l)}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-estrelinha-ink hover:bg-estrelinha-ground-deep"
                      >
                        <Trash2 aria-hidden="true" className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-lg text-estrelinha-ink">{ACRESCENTAR_PECA}</h2>
        <CampoDeBusca
          key={geracaoDaBusca}
          id="busca-de-joia"
          rotulo={BUSCAR_JOIA}
          placeholder={DICA_DA_BUSCA_DE_JOIA}
          atraso={ATRASO_DA_BUSCA_MS}
          aoBuscar={setTermo}
        />
        {catalogo.carregando ? (
          <div aria-busy="true" aria-label={CARREGANDO_O_CATALOGO} className="space-y-2">
            <Traco className="h-16 w-full" />
            <Traco className="h-16 w-full" />
          </div>
        ) : catalogo.falhou || !achadas ? (
          <FalhaDoBloco tentarDeNovo={catalogo.tentarDeNovo} />
        ) : achadas.itens.length === 0 ? (
          <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{nenhumaJoiaCom(limpo)}</p>
        ) : (
          <ul aria-label="Joias" className="divide-y divide-estrelinha-line">
            {achadas.itens.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => aoEscolherPeca(p)} className="flex min-h-12 w-full items-center gap-3 py-2 text-left">
                  <FotoDaPeca foto={p.imagem} tamanho={56} altura={70} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base text-estrelinha-ink [overflow-wrap:anywhere]">{p.nome}</span>
                    <span className="block text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{resumoDaPeca(p)}</span>
                  </span>
                  <Plus aria-hidden="true" className="h-5 w-5 shrink-0 text-estrelinha-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default PassoDasPecas
