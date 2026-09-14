// A lista de seções da Home, arrastável (feature 24).
//
// Molde do `MenuSlotList`: cartão com cabeçalho contador, linhas arrastáveis por `dataTransfer`, e
// o rodapé reservado para a bandeja de blocos (`HomeBlockTray`, T23). A bandeja vive DENTRO deste
// cartão, e não num modal do botão "Adicionar seção": é onde se lê quais tipos são únicos e já
// estão na lista, o que responde a pergunta **antes** de a dona clicar e ser recusada.
//
// **Desde a feature 50 a lista se move** (`ANI-03`, `ANI-04`, `ANI-07`, `ANI-08`). O movimento não é
// enfeite: com `VIV-01` a tela parou de trocar a árvore por um esqueleto a cada gravação, e sem nada
// no lugar a dona deixaria de ter recibo nenhum de que o clique dela chegou. O que acende é o que
// **mudou de verdade** — ver `useMovimentoDaLista`.

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { reorderSections, type ResolvedSection } from '@estrelinha/core/home'
import HomeSectionRow from './HomeSectionRow'

interface Props {
  /** Já resolvida por `resolveHomeSections` — a mesma regra que a loja usa para desenhar. */
  resolved: ResolvedSection[]
  onToggle: (id: string, next: boolean) => void
  onOpen: (id: string) => void
  /** Recebe **posições absolutas, só das linhas que mudaram** (`reorderSections`). */
  onReorder: (moves: { id: string; position: number }[]) => void
  /** A bandeja de blocos, no rodapé do cartão. */
  footer?: ReactNode
  /** O cursor apontou uma linha — a prévia contorna o bloco dela (feature 25, `PRV-11`). */
  onHover?: (sectionId: string | null) => void
  /**
   * Remover uma seção (`BNR-41`).
   *
   * Opcional porque a lista também é montada em contexto de leitura; quando ausente, a linha não
   * desenha o controle. A recusa da ÚLTIMA seção ativa é do banco (`AD-029`), e chega aqui como
   * erro de gravação — esta tela não a antecipa, para não ter duas versões da mesma regra.
   *
   * Pode devolver uma promessa: a lista a usa só para saber **quando a operação terminou** e desfazer
   * o estado de saída da linha (`ANI-04`). Ela nunca é esperada ANTES da chamada (`ANI-07`).
   */
  onRemove?: (id: string) => void | Promise<unknown>
}

/**
 * Quais linhas aparecem **recuadas**, e por quê.
 *
 * A faixa institucional declara ela mesma o aninhamento (`config.interlude_after`), e o
 * renderizador da loja a põe dentro da seção de fileiras **renderizada** imediatamente anterior.
 * Esta lista repete essa caminhada — e não uma regra própria — porque uma lista que mostrasse a
 * faixa como irmã diria uma ordem que a loja não obedece.
 *
 * Por que não basta ler `nestedUnder`: ele só vem preenchido quando a seção **renderiza**. Uma faixa
 * desligada tem `nestedUnder: null` e ainda assim precisa aparecer no lugar onde vai entrar quando
 * for religada — senão ligar a faixa faria a linha "pular" de lugar sem nada ter mudado.
 */
const aninhadas = (resolved: readonly ResolvedSection[]): Set<string> => {
  const dentro = new Set<string>()
  let ultimaRenderizada: ResolvedSection | null = null

  for (const entry of resolved) {
    const declara = typeof entry.section.config?.interlude_after === 'number'
    if (declara && ultimaRenderizada?.section.type === 'collection_rows') {
      dentro.add(entry.section.id)
    }
    if (entry.renders) ultimaRenderizada = entry
  }

  return dentro
}

/** Quanto tempo a linha recém-gravada fica acesa (`ANI-03`). */
export const ACENDE_MS = 1200

/** Quanto tempo a linha nova fica marcada como recém-chegada (`ANI-04`). */
const ENTRADA_MS = 400

/**
 * A assinatura do **conteúdo** de uma linha.
 *
 * É o que separa "esta seção mudou" de "a lista foi lida de novo", e é por isso que o acender não é
 * disparado pelo clique: quem clica não sabe se a gravação pegou, e uma luz no clique acenderia
 * também quando o banco recusasse. A releitura que devolve exatamente o mesmo conteúdo produz a
 * mesma assinatura e **nada pisca** (`ANI-08`) — a revalidação silenciosa não é uma regra escrita à
 * parte, é consequência de comparar conteúdo em vez de contar requisições.
 *
 * `renders`/`hiddenReason` ficam de fora de propósito: eles são derivados do catálogo, e um produto
 * publicado noutra aba faria sete linhas acenderem sem ninguém ter tocado na Home.
 */
const assinatura = (entry: ResolvedSection): string =>
  JSON.stringify({
    active: entry.section.active,
    position: entry.section.position,
    config: entry.section.config ?? {},
    items: (entry.section.items ?? []).map(i => [i.id, i.position, i.label_snapshot]),
  })

interface Movimento {
  /** Acabou de ser gravada: acende e volta ao normal (`ANI-03`). */
  acesas: ReadonlySet<string>
  /** Acabou de entrar na lista: aparece com transição (`ANI-04`). */
  entrando: ReadonlySet<string>
}

/**
 * O movimento derivado da própria lista.
 *
 * Três decisões que valem a leitura:
 *
 * 1. **A primeira leitura não acende nada.** Sem o recorte, abrir `/admin/home` acenderia as sete
 *    linhas de uma vez — o oposto de "o que mudou foi isto".
 * 2. **Linha nova é `entrando`, não `acesa`.** São dois eventos diferentes ("chegou" × "foi
 *    gravada"), e usar a mesma marca para os dois faria a seção acrescentada piscar duas vezes.
 * 3. **Todo timer é limpo no desmonte.** A coluna de edição troca a lista pelo formulário; um
 *    `setState` depois disso vaza em `act` warning e, fora do teste, em atualização de árvore morta.
 */
const useMovimentoDaLista = (resolved: readonly ResolvedSection[]): Movimento => {
  const [acesas, setAcesas] = useState<ReadonlySet<string>>(new Set())
  const [entrando, setEntrando] = useState<ReadonlySet<string>>(new Set())
  const anterior = useRef<Map<string, string> | null>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  /**
   * Agenda a retirada da marca.
   *
   * A chave inclui o tipo da marca porque uma seção pode estar acesa e entrando ao mesmo tempo (ela
   * nasce desligada e é gravada logo em seguida), e um timer por id sozinho faria uma cancelar a
   * outra. Reagendar sobre a mesma chave **reinicia** a contagem: duas gravações seguidas na mesma
   * linha acendem pelos 1,2 s da segunda, não pelo que sobrou da primeira.
   */
  const agendarSaida = (
    id: string,
    chave: string,
    ms: number,
    set: Dispatch<SetStateAction<ReadonlySet<string>>>,
  ) => {
    const anteriorTimer = timers.current.get(chave)
    if (anteriorTimer) clearTimeout(anteriorTimer)
    timers.current.set(
      chave,
      setTimeout(() => {
        timers.current.delete(chave)
        set(prev => {
          const proximo = new Set(prev)
          proximo.delete(id)
          return proximo
        })
      }, ms),
    )
  }

  useEffect(() => {
    const atual = new Map(resolved.map(entry => [entry.section.id, assinatura(entry)]))
    const antes = anterior.current
    anterior.current = atual

    // Primeira leitura: só registra o retrato. Nada acende, nada entra.
    if (!antes) return

    const mudaram: string[] = []
    const novas: string[] = []
    for (const [id, sig] of atual) {
      if (!antes.has(id)) novas.push(id)
      else if (antes.get(id) !== sig) mudaram.push(id)
    }

    if (mudaram.length > 0) {
      setAcesas(prev => new Set([...prev, ...mudaram]))
      for (const id of mudaram) agendarSaida(id, `acende:${id}`, ACENDE_MS, setAcesas)
    }
    if (novas.length > 0) {
      setEntrando(prev => new Set([...prev, ...novas]))
      for (const id of novas) agendarSaida(id, `entra:${id}`, ENTRADA_MS, setEntrando)
    }
  }, [resolved])

  useEffect(() => {
    const mapa = timers.current
    return () => {
      for (const timer of mapa.values()) clearTimeout(timer)
      mapa.clear()
    }
  }, [])

  return { acesas, entrando }
}

const HomeSectionList = ({ resolved, onToggle, onOpen, onReorder, footer, onHover, onRemove }: Props) => {
  const dentro = aninhadas(resolved)
  const noAr = resolved.filter(e => e.section.active).length
  const { acesas, entrando } = useMovimentoDaLista(resolved)

  /**
   * A linha que está saindo (`ANI-04`).
   *
   * Marcada **no clique**, e a chamada de remoção sai no mesmo tique (`ANI-07`): a transição roda EM
   * PARALELO com a requisição, nunca antes dela. Um `setTimeout` aqui — o jeito "natural" de esperar
   * a animação — atrasaria a gravação por um efeito visual, que é exatamente o que a AC proíbe.
   *
   * O desfazer é incondicional ao fim da promessa: se a remoção deu certo a linha já saiu da lista
   * (o hook relê antes de devolver), e se ela falhou **ou foi cancelada no `confirm`** a linha volta
   * ao normal. Um desfazer que dependesse de "foi erro?" precisaria distinguir recusa de desistência
   * — duas respostas para a mesma pergunta, que aqui é só "a linha continua aí?".
   */
  const [saindo, setSaindo] = useState<string | null>(null)

  const handleRemove = (id: string) => {
    if (!onRemove) return
    setSaindo(id)
    Promise.resolve(onRemove(id)).then(
      () => setSaindo(atual => (atual === id ? null : atual)),
      () => setSaindo(atual => (atual === id ? null : atual)),
    )
  }

  const handleDrop = (targetId: string, draggedId: string) => {
    if (!draggedId) return
    // `reorderSections` devolve `null` quando um dos ids sumiu da lista (a listagem estava velha) e
    // `[]` quando a seção foi solta sobre ela mesma. Nos dois casos não há o que gravar.
    const moves = reorderSections(
      resolved.map(e => e.section),
      draggedId,
      targetId,
    )
    if (moves && moves.length > 0) onReorder(moves)
  }

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-sm font-bold text-foreground">Seções da Home</h2>
        <span data-testid="contador-secoes" className="text-xs text-muted-foreground">
          {resolved.length} {resolved.length === 1 ? 'seção' : 'seções'} · {noAr} no ar
        </span>
      </header>

      <ul>
        {resolved.map(entry => (
          <HomeSectionRow
            key={entry.section.id}
            entry={entry}
            nested={dentro.has(entry.section.id)}
            recemSalva={acesas.has(entry.section.id)}
            entrando={entrando.has(entry.section.id)}
            saindo={saindo === entry.section.id}
            onToggle={onToggle}
            onOpen={onOpen}
            onDrop={handleDrop}
            onHover={onHover}
            onRemove={onRemove ? handleRemove : undefined}
          />
        ))}
      </ul>

      {footer}
    </div>
  )
}

export default HomeSectionList
