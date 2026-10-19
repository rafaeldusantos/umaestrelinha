// A fila de sugestões — feature 67 (`VFL-18`..`VFL-27`).
//
// Lista de motivos à esquerda e o motivo aberto à direita, no molde de Configurações (feature 55) e
// de `/admin/filtros`: **o motivo aberto é a URL** (`?motivo=`), e no celular é ela que decide se
// aparece a lista ou o motivo. No computador, sem `?motivo=`, abre o primeiro do recorte.
//
// A seleção é guardada por motivo, como o conjunto DESMARCADO: "todas selecionadas por padrão"
// (`VFL-19`) é a ausência de valor, e a peça que entra no motivo depois de uma releitura nasce
// selecionada como as outras.
//
// Depois de gravar, relê as duas chaves da fila (`useAtualizarFila`) E o catálogo de filtros — é o
// que faz a fila, as contagens do valor e as de `/admin/filtros` mudarem sem recarregar (`VFL-24`).

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import type { AdminFilterGroup } from '@/entities/filter'
import type { ProdutoParaMarcar } from '@/entities/product'
import type { SuggestionGroup } from '@estrelinha/core/filters'
import { aprovarSugestoes, recusarSugestoes } from '../model/aprovar'
import { RECORTE_DA_FILA_INICIAL, linhasDoMotivo, recortarFila, valoresPorId, type RecorteDaFila } from '../model/fila'
import { useAtualizarFila } from '../model/useFila'
import ReasonDetail from './ReasonDetail'
import ReasonList from './ReasonList'

interface Props {
  grupos: readonly AdminFilterGroup[]
  fila: readonly SuggestionGroup[]
  produtos: ReadonlyMap<string, ProdutoParaMarcar>
  /** Relê as contagens do catálogo de filtros (não é React Query). */
  onGravou: () => Promise<void> | void
}

const SuggestionQueue = ({ grupos, fila, produtos, onGravou }: Props) => {
  const [params, setParams] = useSearchParams()
  const [recorteLocal, setRecorteLocal] = useState<Omit<RecorteDaFila, 'valor'>>(RECORTE_DA_FILA_INICIAL)
  const [desmarcadas, setDesmarcadas] = useState<Map<string, Set<string>>>(() => new Map())
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const atualizarFila = useAtualizarFila()

  const recorte: RecorteDaFila = { ...recorteLocal, valor: params.get('valor') ?? '' }
  const valores = useMemo(() => valoresPorId(grupos), [grupos])
  const motivos = useMemo(() => recortarFila(fila, recorte, valores), [fila, recorte.grupo, recorte.fonte, recorte.termo, recorte.valor, valores]) // eslint-disable-line react-hooks/exhaustive-deps

  const daUrl = params.get('motivo')
  const motivoDaUrl = fila.find(g => g.key === daUrl) ?? null
  const motivoExibido = motivoDaUrl ?? motivos[0] ?? null
  const noCelularNoMotivo = !!motivoDaUrl

  const abrir = (key: string | null) => {
    setErro(null)
    setParams(
      atual => {
        const proximo = new URLSearchParams(atual)
        if (key) proximo.set('motivo', key)
        else proximo.delete('motivo')
        return proximo
      },
      { replace: false },
    )
  }

  const linhas = useMemo(() => (motivoExibido ? linhasDoMotivo(motivoExibido, produtos) : []), [motivoExibido, produtos])
  const fora = motivoExibido ? (desmarcadas.get(motivoExibido.key) ?? new Set<string>()) : new Set<string>()
  const selecionadas = new Set(linhas.map(l => l.produto.id).filter(id => !fora.has(id)))

  const mudarDesmarcadas = (key: string, proxima: Set<string>) =>
    setDesmarcadas(atual => new Map(atual).set(key, proxima))

  const alternar = (id: string) => {
    if (!motivoExibido) return
    const proxima = new Set(fora)
    if (proxima.has(id)) proxima.delete(id)
    else proxima.add(id)
    mudarDesmarcadas(motivoExibido.key, proxima)
  }

  const alternarTodas = () => {
    if (!motivoExibido) return
    mudarDesmarcadas(
      motivoExibido.key,
      selecionadas.size === linhas.length ? new Set(linhas.map(l => l.produto.id)) : new Set(),
    )
  }

  const gravar = async (acao: 'aprovar' | 'recusar') => {
    if (!motivoExibido) return
    setGravando(true)
    setErro(null)
    const r =
      acao === 'aprovar'
        ? await aprovarSugestoes(motivoExibido, selecionadas)
        : await recusarSugestoes(motivoExibido, selecionadas)
    // Só relê o que o banco de fato mudou: uma falha na primeira escrita deixa tudo como estava.
    if (r.gravou) await Promise.all([atualizarFila(), onGravou()])
    setErro(r.erro)
    setGravando(false)
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className={cn(noCelularNoMotivo && 'hidden lg:block')}>
        <ReasonList
          motivos={motivos}
          grupos={grupos}
          valores={valores}
          recorte={recorte}
          onRecorte={patch => {
            const { valor, ...resto } = patch
            if (valor !== undefined) {
              setParams(atual => {
                const p = new URLSearchParams(atual)
                if (valor) p.set('valor', valor)
                else p.delete('valor')
                return p
              })
            }
            setRecorteLocal(atual => ({ ...atual, ...resto }))
          }}
          abertoKey={motivoExibido?.key ?? null}
          onAbrir={key => abrir(key)}
        />
      </div>
      <div className={cn('min-w-0', !noCelularNoMotivo && 'hidden lg:block')}>
        {motivoExibido ? (
          <ReasonDetail
            key={motivoExibido.key}
            motivo={motivoExibido}
            valor={valores.get(motivoExibido.value_id)}
            linhas={linhas}
            selecionadas={selecionadas}
            onAlternar={alternar}
            onAlternarTodas={alternarTodas}
            onAprovar={() => void gravar('aprovar')}
            onRecusar={() => void gravar('recusar')}
            gravando={gravando}
            erro={erro}
          />
        ) : (
          <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum motivo neste recorte.
          </p>
        )}
      </div>
    </div>
  )
}

export default SuggestionQueue
