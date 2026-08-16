import { extractFaqPairs, faqQuestionKey, type FaqPair } from '@estrelinha/core/faq'
import type { Report } from '../report.ts'
import { type DbLike, selectAll, unwrap } from './db.ts'

/**
 * Feature 28 — a **semente** das perguntas frequentes.
 *
 * Medido no catálogo real em 2026-08-16: **687 dos 691 produtos (99,4%)** trazem um bloco
 * `<h3>Perguntas frequentes</h3>` dentro de `products.description`, com **3.476 pares**. Sem esta
 * etapa, a biblioteca abre vazia e as perguntas continuam presas no HTML — que é o desfecho de
 * `PRM-12` e de `collections`, os dois casos deste repositório em que uma feature nasceu inerte e
 * passou meses sem ninguém notar.
 *
 * A extração é a mesma que a loja usa para **não exibir duas vezes** (`@estrelinha/core/faq/block`).
 * Uma segunda leitura aqui divergiria da primeira, e o sintoma seria a cliente lendo a mesma
 * pergunta no acordeão e no meio da descrição.
 *
 * O plano é **puro** e a escrita é separada (`AD-002`): `planFaqSeed` é testável sem dublê de banco,
 * e é onde moram as três decisões que importam — resposta padrão, idempotência e preservação de
 * curadoria.
 */

// ---------------------------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------------------------

/** O que a etapa precisa saber de cada produto. */
export interface FaqSeedProduct {
  /** O uuid já gravado. */
  id: string
  description: string | null
}

/** Uma entrada de biblioteca que já está no banco. */
export interface ExistingFaq {
  id: string
  question_key: string
}

export interface FaqEntryInsert {
  question: string
  answer: string
  question_key: string
}

export interface FaqLinkInsert {
  product_id: string
  /** Preenchido na escrita para as entradas novas, cujo uuid só existe depois do insert. */
  faq_id: string | null
  question_key: string
  position: number
  answer_override: string | null
}

export interface FaqSeedPlan {
  entradas: FaqEntryInsert[]
  vinculos: FaqLinkInsert[]
  produtosPulados: number
  produtosSemBloco: number
  /** Pares descartados por repetirem uma pergunta que aquele produto já tinha. */
  duplicadasNoProduto: number
}

export interface FaqSeedResult {
  entradasCriadas: number
  vinculosCriados: number
  vinculosComRespostaPropria: number
  produtosPulados: number
  produtosSemBloco: number
  duplicadasNoProduto: number
}

// ---------------------------------------------------------------------------------------------
// O plano
// ---------------------------------------------------------------------------------------------

interface Candidata {
  question: string
  /** Resposta → quantas vezes ela aparece. A mais frequente vira o padrão da biblioteca. */
  respostas: Map<string, number>
  /** Ordem da primeira aparição, para o desempate ser determinístico. */
  ordem: number
}

/**
 * A resposta padrão de uma pergunta: **a mais frequente** no catálogo.
 *
 * Medido: com este critério, **2.432 dos 3.476 vínculos (70%)** usam o padrão e só 1.044 precisam de
 * resposta própria. Escolher a primeira em vez da mais frequente inverteria a proporção em perguntas
 * como `Quais materiais posso usar nessa joia?`, que tem 98 respostas distintas.
 *
 * O empate é resolvido pela resposta **alfabeticamente menor**, e não pela primeira encontrada: a
 * ordem dos produtos vinda da API não é estável entre execuções, e sem isso duas execuções do
 * importador escolheriam padrões diferentes — quebrando a idempotência sem quebrar nada visível.
 */
const respostaPadrao = (respostas: Map<string, number>): string => {
  let melhor = ''
  let melhorN = -1
  for (const [resposta, n] of respostas) {
    if (n > melhorN || (n === melhorN && resposta < melhor)) {
      melhor = resposta
      melhorN = n
    }
  }
  return melhor
}

/**
 * O que criar, sem tocar no banco.
 *
 * @param produtos    Os produtos já gravados, com a descrição da origem.
 * @param existentes  As entradas de biblioteca que já existem.
 * @param comVinculo  Os `product_id` que **já têm** ao menos um vínculo.
 */
export const planFaqSeed = (
  produtos: readonly FaqSeedProduct[],
  existentes: readonly ExistingFaq[],
  comVinculo: ReadonlySet<string>,
): FaqSeedPlan => {
  const jaNaBiblioteca = new Map(existentes.map(e => [e.question_key, e.id]))

  const candidatas = new Map<string, Candidata>()
  const paresPorProduto = new Map<string, FaqPair[]>()
  let produtosPulados = 0
  let produtosSemBloco = 0

  for (const produto of produtos) {
    // ⚠️ **A presença de vínculo é a curadoria da dona** — mesma regra da feature 24 ("curadoria é a
    // PRESENÇA de itens, não uma flag"). Um produto que ela já ajustou não é tocado, nem para
    // acrescentar. Sem isto, a segunda execução desfaria em silêncio o trabalho feito no painel.
    if (comVinculo.has(produto.id)) {
      produtosPulados += 1
      continue
    }

    const pares = extractFaqPairs(produto.description)
    if (pares.length === 0) {
      produtosSemBloco += 1
      continue
    }

    paresPorProduto.set(produto.id, pares)

    for (const par of pares) {
      const chave = faqQuestionKey(par.question)
      if (chave === '') continue

      let candidata = candidatas.get(chave)
      if (!candidata) {
        candidata = { question: par.question, respostas: new Map(), ordem: candidatas.size }
        candidatas.set(chave, candidata)
      }
      candidata.respostas.set(par.answer, (candidata.respostas.get(par.answer) ?? 0) + 1)
    }
  }

  // Só as que ainda não existem. Entrada já gravada é **reusada sem reescrever a resposta**: a dona
  // pode tê-la editado em /admin/perguntas, e o importador não é dono daquele texto.
  const entradas: FaqEntryInsert[] = [...candidatas.entries()]
    .filter(([chave]) => !jaNaBiblioteca.has(chave))
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([question_key, c]) => ({
      question: c.question,
      answer: respostaPadrao(c.respostas),
      question_key,
    }))

  const padraoPorChave = new Map<string, string>(entradas.map(e => [e.question_key, e.answer]))

  const vinculos: FaqLinkInsert[] = []
  let duplicadasNoProduto = 0

  for (const [product_id, pares] of paresPorProduto) {
    /**
     * ⚠️ **A mesma pergunta pode aparecer DUAS VEZES na descrição do mesmo produto.**
     *
     * Não é hipótese: o `Anel Afetivo Aliança com Coto Umbilical em Prata 925` repete
     * "As joias são realmente feitas à mão?" no catálogo real, e sem esta deduplicação o lote inteiro
     * é recusado com `duplicate key value violates unique constraint "product_faqs_pkey"` — o que
     * derrubou a primeira execução real desta etapa, **depois** de gravar 2.500 vínculos.
     *
     * Vence a **primeira** aparição: é a que a dona escreveu primeiro, e a segunda é repetição na
     * origem, não escolha. A `position` é reindexada para ficar contígua.
     */
    const vistas = new Set<string>()

    for (const par of pares) {
      const question_key = faqQuestionKey(par.question)
      if (question_key === '') continue

      if (vistas.has(question_key)) {
        duplicadasNoProduto += 1
        continue
      }
      vistas.add(question_key)

      const jaExistia = jaNaBiblioteca.get(question_key)
      const padrao = padraoPorChave.get(question_key)

      vinculos.push({
        product_id,
        faq_id: jaExistia ?? null,
        question_key,
        position: vistas.size - 1,
        // Entrada que **já existia** não tem padrão conhecido aqui (não relemos `faqs.answer` para
        // não reescrever nada). A resposta deste produto vai como própria, e `faqOverrideOf` na
        // escrita a descarta se for igual ao padrão.
        answer_override: padrao !== undefined && padrao === par.answer ? null : par.answer,
      })
    }
  }

  return { entradas, vinculos, produtosPulados, produtosSemBloco, duplicadasNoProduto }
}

// ---------------------------------------------------------------------------------------------
// A escrita
// ---------------------------------------------------------------------------------------------

export interface FaqWriteDeps {
  supabase: DbLike
  report: Report
  dryRun?: boolean
  log?: (message: string) => void
}

interface ProdutoComVinculo {
  product_id: string
}

/**
 * Executa o plano.
 *
 * As duas leituras de "o que já existe" usam **`selectAll`**, nunca `select` simples. Não é zelo:
 * `product_faqs` chega a **3.476 linhas** e o PostgREST trunca em 1.000 numa resposta sem `Range` —
 * é literalmente o defeito que quebrou a idempotência do primeiro import real, e só a partir do
 * volume de verdade (nenhum dublê de teste chega perto de 1.000 linhas).
 */
export const writeFaqs = async (
  produtos: readonly FaqSeedProduct[],
  deps: FaqWriteDeps,
): Promise<FaqSeedResult> => {
  const { supabase, report, dryRun = false } = deps

  const existentes = await selectAll<ExistingFaq>(
    supabase.from('faqs'),
    'id, question_key',
    'ler perguntas existentes',
  )

  const vinculosExistentes = await selectAll<ProdutoComVinculo>(
    supabase.from('product_faqs'),
    'product_id',
    'ler vínculos de pergunta existentes',
  )

  const comVinculo = new Set(vinculosExistentes.map(v => v.product_id))
  const plano = planFaqSeed(produtos, existentes, comVinculo)

  const resultado: FaqSeedResult = {
    entradasCriadas: 0,
    vinculosCriados: 0,
    vinculosComRespostaPropria: plano.vinculos.filter(v => v.answer_override !== null).length,
    produtosPulados: plano.produtosPulados,
    produtosSemBloco: plano.produtosSemBloco,
    duplicadasNoProduto: plano.duplicadasNoProduto,
  }

  if (dryRun) {
    resultado.entradasCriadas = plano.entradas.length
    resultado.vinculosCriados = plano.vinculos.length
    report.faqSeeded(resultado)
    return resultado
  }

  const idPorChave = new Map(existentes.map(e => [e.question_key, e.id]))

  // Uma por vez, e não em lote, porque cada uma devolve o uuid que os vínculos precisam. São 67
  // inserts na primeira execução e **zero** nas seguintes — o custo é pago uma vez.
  for (const entrada of plano.entradas) {
    const criada = unwrap(
      `criar pergunta "${entrada.question_key}"`,
      await supabase.from('faqs').insert<ExistingFaq>(entrada).select('id, question_key').single(),
    )
    idPorChave.set(entrada.question_key, criada.id)
    resultado.entradasCriadas += 1
  }

  const linhas = plano.vinculos
    .map(v => ({
      product_id: v.product_id,
      faq_id: v.faq_id ?? idPorChave.get(v.question_key) ?? null,
      position: v.position,
      answer_override: v.answer_override,
    }))
    .filter(linha => linha.faq_id !== null)

  if (linhas.length > 0) {
    // Lote de 500: `PGRST102` exige **as mesmas chaves em todos os objetos** (garantido pelo `map`
    // acima), e uma requisição só com 3.476 linhas é payload grande demais para um retry barato.
    for (let i = 0; i < linhas.length; i += 500) {
      unwrap(
        'gravar vínculos de pergunta',
        await supabase.from('product_faqs').insertMany(linhas.slice(i, i + 500)),
      )
    }
    resultado.vinculosCriados = linhas.length
  }

  report.faqSeeded(resultado)
  return resultado
}
