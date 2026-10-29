// Feature 86 — ler e gravar o documento do menu da dona (`AD-068`). Substitui `useMenuLinks` (T20).
//
// **Duas fontes, uma escrita.** Lê `store_settings` (key `menu`, com o `updated_at`) e a árvore de
// categorias — esta só para LEITURA, pelo `useAdminCategories` que o painel já tem. Grava UMA linha:
// `store_settings.menu`. Nenhuma escrita em `categories` sai daqui: reordenar o menu não muda a
// `sort_order` da árvore (`MNM-18`), e os banners passaram a morar no nó (`MNM-33`).
//
// **Sem v2 gravado, o documento é a conversão do legado** (`legacyMenuDocument`), exatamente o que a
// loja desenha hoje. A primeira `apply` grava o v2 inteiro (`MNM-34`); daí em diante as colunas
// `menu_*` e os `links` deixam de ser lidos.
//
// **A leitura é própria, e não `useStoreSettings`**, pelo mesmo motivo de `useMenuLinks`: aquele é o
// hook da loja e engole erro de propósito (devolve defaults). Aqui, "o banco não respondeu" e "o menu
// está vazio" são estados diferentes (`MNM-05`), e a dona montaria por cima de um menu que existe.
//
// **Concorrência por `updated_at`** (`MNM-37`): o gatilho `trg_store_settings_updated_at` já o mantém.
// A gravação filtra por `key = 'menu'` **e** `updated_at = visto`; zero linhas devolvidas é outra
// janela que gravou antes — conflito, e o documento local volta ao último confirmado. Erro de rede ou
// de RLS volta igual, e nunca mostra `Salvo` (`MNM-38`).
//
// **O que fica no `value` ao gravar v2**: as chaves que já estavam lá (inclusive os `links` legados)
// são PRESERVADAS, e `version`/`items` entram por cima. Os `links` ficam inertes (com v2, ninguém os
// lê) e são a rede de volta: se a v2 precisar ser revertida à mão, o legado continua ali. Quem apaga
// as chaves legadas é a `BL` de limpeza, depois de v2 em produção.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import {
  legacyMenuDocument,
  menuDocumentRefusal,
  parseMenuDocument,
  type MenuCategory,
  type MenuDocument,
  type MenuLink,
} from '@estrelinha/core/menu'
import { useAdminCategories } from '@/entities/category'

export const STORE_MENU_KEY = 'menu'

/** O selo `Salvo` fica ~2 s — o mesmo `SALVO_MS` de `/admin/home` e da tela de menu da `39`. */
export const STORE_MENU_SALVO_MS = 2000

export const STORE_MENU_CONFLICT_MESSAGE = 'O menu mudou em outra janela — recarregue.'
export const STORE_MENU_SAVE_FAILURE = 'Não salvou. O menu voltou ao que estava gravado.'
export const STORE_MENU_LOAD_FAILURE = 'Não foi possível carregar o menu.'
/**
 * Q02 do QA da `86` — a resposta se perdeu E a releitura também: a tela não sabe se gravou. Dizer
 * "Não salvou" seria afirmar o que ela não sabe (no QA, o banco tinha gravado).
 */
export const STORE_MENU_SAVE_UNKNOWN =
  'Não deu para confirmar se salvou. Confira a internet; a próxima mudança parte do que estiver gravado.'

/**
 * S03 do QA r3 — as esperas da releitura depois de uma gravação sem desfecho: na hora, e depois cada
 * vez mais espaçado (o último passo se repete até a rede responder).
 */
export const STORE_MENU_RELEITURA_MS = [0, 1000, 2000, 4000, 8000, 15000] as const

export type StoreMenuState = 'loading' | 'error' | 'ready'
export type StoreMenuSaving = 'idle' | 'saving' | 'saved'

/** Uma operação de `documentOps`, já com os argumentos: `doc => addRootNode(doc, …)`. */
export type StoreMenuOp = (doc: MenuDocument) => MenuDocument

/**
 * O desfecho de uma `apply` que NÃO gravou. Discriminado por literal de **string**
 * (`strictNullChecks: false`: literal booleano não estreita). `null` = gravou, ou não havia o que
 * gravar.
 */
export interface StoreMenuApplyFailure {
  /** `incerto` (R02 do QA r2): a escrita E a releitura falharam — a tela não sabe se gravou. */
  kind: 'recusa' | 'conflito' | 'falha' | 'incerto'
  message: string
}

export interface StoreMenu {
  /** O documento que a tela mostra — o local (otimista) durante a gravação. `null` até carregar. */
  document: MenuDocument | null
  /** A árvore, só leitura (nomes, seletor, estados de nó). */
  categories: MenuCategory[]
  state: StoreMenuState
  /** O motivo do `state: 'error'`. */
  error: string | null
  saving: StoreMenuSaving
  /** Verdadeiro depois de um conflito, até o próximo `reload`. */
  conflict: boolean
  apply: (op: StoreMenuOp) => Promise<StoreMenuApplyFailure | null>
  reload: () => Promise<void>
}

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const linksLegados = (valor: unknown): MenuLink[] => {
  const lista = ehObjeto(valor) ? valor.links : null
  return Array.isArray(lista) ? (lista.filter(ehObjeto) as unknown as MenuLink[]) : []
}

/**
 * Igualdade estrutural de JSON, **sem ordem de chave**: o `jsonb` do Postgres devolve as chaves em
 * outra ordem que a enviada, e comparar por `JSON.stringify` acusaria diferença no que é igual.
 */
const mesmoValor = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => mesmoValor(x, b[i]))
    )
  }
  if (ehObjeto(a) && ehObjeto(b)) {
    // `undefined` não atravessa o JSON: uma chave com `undefined` de um lado é ausência no banco.
    const chaves = (o: Record<string, unknown>) => Object.keys(o).filter(k => o[k] !== undefined)
    const ka = chaves(a)
    const kb = chaves(b)
    return ka.length === kb.length && ka.every(k => k in b && mesmoValor(a[k], b[k]))
  }
  return false
}

interface Linha {
  /** `null` = a linha `menu` não existe (primeira gravação é `insert`). */
  updatedAt: string | null
  value: Record<string, unknown>
}

export const useStoreMenu = (): StoreMenu => {
  const {
    categories: categoriasDoPainel,
    loading: carregandoCategorias,
    error: erroDasCategorias,
    fetchCategories,
  } = useAdminCategories()
  const categories = categoriasDoPainel as unknown as MenuCategory[]

  const [linha, setLinha] = useState<Linha | null>(null)
  const [carregandoLinha, setCarregandoLinha] = useState(true)
  const [erroDaLinha, setErroDaLinha] = useState<string | null>(null)
  /** O documento local durante a gravação (otimista). `null` = mostrar o confirmado. */
  const [local, setLocal] = useState<MenuDocument | null>(null)
  const [saving, setSaving] = useState<StoreMenuSaving>('idle')
  const [conflict, setConflict] = useState(false)

  const timerSalvo = useRef<ReturnType<typeof setTimeout>>()
  const fila = useRef<Promise<unknown>>(Promise.resolve())
  /** A linha confirmada mais recente, lida fora do render (a fila serializa as `apply`). */
  const linhaRef = useRef<Linha | null>(null)
  const pedido = useRef(0)

  const lerLinha = useCallback(async () => {
    const meu = ++pedido.current
    setCarregandoLinha(true)
    setErroDaLinha(null)
    const { data, error } = await supabase
      .from('store_settings')
      .select('value, updated_at')
      .eq('key', STORE_MENU_KEY)
      .maybeSingle()
    if (meu !== pedido.current) return
    if (error) {
      // A frase da loja, nunca o erro cru (Q08: sem rede ele chega como "TypeError: Failed to fetch").
      setErroDaLinha(STORE_MENU_LOAD_FAILURE)
      setCarregandoLinha(false)
      return
    }
    const row = data as { value?: unknown; updated_at?: string } | null
    const proxima: Linha = row
      ? { updatedAt: row.updated_at ?? null, value: ehObjeto(row.value) ? row.value : {} }
      : { updatedAt: null, value: {} }
    linhaRef.current = proxima
    setLinha(proxima)
    setLocal(null)
    setCarregandoLinha(false)
  }, [])

  useEffect(() => {
    lerLinha()
  }, [lerLinha])

  useEffect(() => () => clearTimeout(timerSalvo.current), [])

  const state: StoreMenuState =
    erroDaLinha || erroDasCategorias
      ? 'error'
      : carregandoLinha || carregandoCategorias || !linha
        ? 'loading'
        : 'ready'

  /** O confirmado: o v2 gravado, ou a conversão do legado. */
  const confirmado = useMemo<MenuDocument | null>(() => {
    if (!linha || carregandoCategorias) return null
    return parseMenuDocument(linha.value) ?? legacyMenuDocument(categories, linksLegados(linha.value))
  }, [linha, categories, carregandoCategorias])

  /**
   * Q02 — o `value` de uma gravação cujo desfecho a tela NÃO soube (erro na escrita e na releitura).
   * Enquanto ele existe, a próxima `apply` relê a linha antes de gravar: se o banco tem este valor,
   * a gravação tinha valido e a linha relida passa a ser a confirmada — senão a guarda de
   * `updated_at` acusaria "outra janela" contra a própria aba.
   */
  const incerta = useRef<Record<string, unknown> | null>(null)

  /** Relê a linha sem mexer no estado de carga da tela. `null` = a releitura falhou. */
  const relerEmSilencio = useCallback(async (): Promise<Linha | null> => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('value, updated_at')
        .eq('key', STORE_MENU_KEY)
        .maybeSingle()
      if (error) return null
      const row = data as { value?: unknown; updated_at?: string } | null
      return row
        ? { updatedAt: row.updated_at ?? null, value: ehObjeto(row.value) ? row.value : {} }
        : { updatedAt: null, value: {} }
    } catch {
      return null
    }
  }, [])

  const confirmadoRef = useRef<MenuDocument | null>(null)
  confirmadoRef.current = confirmado
  const localRef = useRef<MenuDocument | null>(null)
  localRef.current = local

  const gravar = useCallback(
    async (op: StoreMenuOp): Promise<StoreMenuApplyFailure | null> => {
      if (incerta.current) {
        // A gravação anterior ficou sem desfecho. O banco decide de onde esta parte.
        const relida = await relerEmSilencio()
        if (!relida) return { kind: 'incerto', message: STORE_MENU_SAVE_UNKNOWN }
        if (mesmoValor(relida.value, incerta.current)) {
          // Tinha gravado: a linha relida é a confirmada, e a op parte dela.
          linhaRef.current = relida
          setLinha(relida)
          confirmadoRef.current = parseMenuDocument(relida.value)
        }
        // Se não tinha gravado, a linha vista continua valendo; se outra janela gravou, a guarda
        // de `updated_at` abaixo acusa o conflito de verdade.
        incerta.current = null
      }
      const atual = linhaRef.current
      const base = localRef.current ?? confirmadoRef.current
      if (!atual || !base) {
        return { kind: 'falha', message: 'O menu ainda está carregando.' }
      }
      const proximo = op(base)
      // Op que não muda nada devolve o MESMO documento (`documentOps`): não há o que gravar.
      if (proximo === base) return null

      // A recusa acontece ANTES da rede (`MNM-12`, `MNM-24`…): um aviso com a escrita indo atrás
      // deixaria gravado o que a tela acabou de dizer que não aceita.
      // Com o documento de ANTES: o teto do submenu só recusa a op que o aumenta acima de 24
      // (`MNM-24`, revisto) — um legado convertido com 30 filhos continua editável.
      const recusa = menuDocumentRefusal(proximo, base)
      if (recusa) return { kind: 'recusa', message: recusa }

      clearTimeout(timerSalvo.current)
      setLocal(proximo)
      localRef.current = proximo
      setSaving('saving')

      const value = { ...atual.value, version: 2, items: proximo.items }

      const voltar = () => {
        setLocal(null)
        localRef.current = null
        setSaving('idle')
      }

      /**
       * Q02 — a escrita deu erro, mas o erro pode ser só a RESPOSTA perdida (o servidor gravou e o
       * celular caiu). Relê: o banco com o valor enviado é gravação confirmada; sem ele, não salvou;
       * sem releitura, a tela não sabe — e diz isso.
       */
      const desfechoDoErro = async (): Promise<StoreMenuApplyFailure | null> => {
        const relida = await relerEmSilencio()
        if (relida && typeof relida.updatedAt === 'string' && mesmoValor(relida.value, value)) {
          return confirmar(value, [{ updated_at: relida.updatedAt }])
        }
        voltar()
        if (!relida) {
          incerta.current = value
          return { kind: 'incerto', message: STORE_MENU_SAVE_UNKNOWN }
        }
        return { kind: 'falha', message: STORE_MENU_SAVE_FAILURE }
      }

      const confirmar = (
        gravado: Record<string, unknown>,
        linhas: { updated_at?: string }[] | null,
      ): StoreMenuApplyFailure | null => {
        const updatedAt = linhas?.[0]?.updated_at
        if (typeof updatedAt !== 'string') {
          // Sem a versão nova, a próxima gravação conflitaria consigo mesma: trate como falha.
          voltar()
          return { kind: 'falha', message: STORE_MENU_SAVE_FAILURE }
        }
        const proxima: Linha = { updatedAt, value: gravado }
        linhaRef.current = proxima
        setLinha(proxima)
        setLocal(null)
        localRef.current = null
        confirmadoRef.current = parseMenuDocument(gravado)
        setSaving('saved')
        timerSalvo.current = setTimeout(() => setSaving('idle'), STORE_MENU_SALVO_MS)
        return null
      }

      if (atual.updatedAt === null) {
        const { data, error } = await supabase
          .from('store_settings')
          .insert({ key: STORE_MENU_KEY, value })
          .select('updated_at')
        if (error) {
          if ((error as { code?: string }).code !== '23505') return desfechoDoErro()
          // Chave já existe: outra janela criou a linha antes desta.
          voltar()
          setConflict(true)
          return { kind: 'conflito', message: STORE_MENU_CONFLICT_MESSAGE }
        }
        return confirmar(value, data as { updated_at?: string }[] | null)
      }

      const { data, error } = await supabase
        .from('store_settings')
        .update({ value })
        .eq('key', STORE_MENU_KEY)
        .eq('updated_at', atual.updatedAt)
        .select('updated_at')
      if (error) return desfechoDoErro()
      if (!Array.isArray(data) || data.length === 0) {
        voltar()
        setConflict(true)
        return { kind: 'conflito', message: STORE_MENU_CONFLICT_MESSAGE }
      }
      return confirmar(value, data as { updated_at?: string }[])
    },
    [relerEmSilencio],
  )

  /**
   * S03 do QA r3 — depois do desfecho `incerto`, a tela não espera a próxima ação para saber a
   * verdade: relê a linha assim que possível (na hora, e de novo com espera crescente, ou quando o
   * navegador volta a ficar online) e mostra o que o banco tem. Passa pela MESMA fila das `apply`,
   * para nunca correr junto de uma gravação. O desfecho:
   *   - o banco tem o valor enviado ⇒ gravou: a linha relida vira a confirmada, e o selo `Salvo`;
   *   - o banco tem a versão que esta aba já via ⇒ não gravou: nada muda (a tela já mostra isso);
   *   - outra coisa ⇒ outra janela gravou: o conflito é verdadeiro, e é o mesmo que a próxima ação
   *     acusaria (a guarda de `updated_at`). Nunca um conflito contra a própria aba.
   */
  const reconciliacao = useRef<{ timer?: ReturnType<typeof setTimeout>; tentativa: number; vivo: boolean }>({
    tentativa: 0,
    vivo: true,
  })

  const reconciliar = useCallback(async (): Promise<'pronto' | 'de-novo'> => {
    const enviado = incerta.current
    if (!enviado) return 'pronto'
    const relida = await relerEmSilencio()
    if (!reconciliacao.current.vivo || incerta.current !== enviado) return 'pronto'
    if (!relida) return 'de-novo'
    incerta.current = null
    const vista = linhaRef.current
    if (typeof relida.updatedAt === 'string' && mesmoValor(relida.value, enviado)) {
      linhaRef.current = relida
      setLinha(relida)
      setLocal(null)
      localRef.current = null
      confirmadoRef.current = parseMenuDocument(relida.value)
      clearTimeout(timerSalvo.current)
      setSaving('saved')
      timerSalvo.current = setTimeout(() => setSaving('idle'), STORE_MENU_SALVO_MS)
    } else if (vista && relida.updatedAt !== vista.updatedAt) {
      setConflict(true)
    }
    return 'pronto'
  }, [relerEmSilencio])

  const agendarReconciliacao = useCallback(
    (espera: number) => {
      const r = reconciliacao.current
      clearTimeout(r.timer)
      r.timer = setTimeout(() => {
        const vez = fila.current.then(() => reconciliar())
        fila.current = vez.catch(() => undefined)
        vez.then(resultado => {
          if (resultado !== 'de-novo' || !r.vivo) return
          r.tentativa = Math.min(r.tentativa + 1, STORE_MENU_RELEITURA_MS.length - 1)
          agendarReconciliacao(STORE_MENU_RELEITURA_MS[r.tentativa])
        }, () => undefined)
      }, espera)
    },
    [reconciliar],
  )

  useEffect(() => {
    const r = reconciliacao.current
    r.vivo = true
    // De volta à rede (ou à aba): tenta de novo agora, sem esperar o próximo passo da espera.
    const agora = () => {
      if (incerta.current) agendarReconciliacao(0)
    }
    window.addEventListener('online', agora)
    window.addEventListener('focus', agora)
    return () => {
      r.vivo = false
      clearTimeout(r.timer)
      window.removeEventListener('online', agora)
      window.removeEventListener('focus', agora)
    }
  }, [agendarReconciliacao])

  /** Serializada: duas ações seguidas não gravam com o mesmo `updated_at` (a segunda conflitaria). */
  const apply = useCallback(
    (op: StoreMenuOp): Promise<StoreMenuApplyFailure | null> => {
      const vez = fila.current.then(() => gravar(op))
      fila.current = vez.catch(() => undefined)
      vez.then(resultado => {
        if (resultado?.kind !== 'incerto') return
        reconciliacao.current.tentativa = 0
        agendarReconciliacao(STORE_MENU_RELEITURA_MS[0])
      }, () => undefined)
      return vez
    },
    [gravar, agendarReconciliacao],
  )

  const reload = useCallback(async () => {
    setConflict(false)
    await Promise.all([lerLinha(), fetchCategories('inicial')])
  }, [lerLinha, fetchCategories])

  return {
    document: state === 'ready' ? (local ?? confirmado) : null,
    categories,
    state,
    // Nunca o erro cru (Q08): o de categorias também chega como mensagem do fetch.
    error: erroDaLinha || erroDasCategorias ? STORE_MENU_LOAD_FAILURE : null,
    saving,
    conflict,
    apply,
    reload,
  }
}
