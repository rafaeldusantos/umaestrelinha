import type { SkuDiscard } from './map/sku.ts'

export type Entity = 'categorias' | 'produtos' | 'variacoes'

const ENTITIES: readonly Entity[] = ['categorias', 'produtos', 'variacoes']

export interface EntityCounts {
  lidos: number
  criados: number
  atualizados: number
  pulados: number
}

export interface SkippedProduct {
  slug: string
  nuvemshop_id: number
  motivo: string
}

export interface FailedImage {
  storageBase: string
  url: string
  motivo: string
}

export interface CuratedCategory {
  nuvemshop_id: number
  slug: string
  motivo: string
}

/** Um campo de vitrine que a origem queria mudar e a loja manteve (CAT-12). */
export interface PreservedShowcase {
  entidade: Entity
  slug: string
  campo: string
  origem: string
  loja: string
}

export interface ReportData {
  entidades: Record<Entity, EntityCounts>
  imagens: { novas: number; reusadas: number; falhadas: number }
  categoriasInativadas: CuratedCategory[]
  produtosPulados: SkippedProduct[]
  skusDescartados: SkuDiscard[]
  imagensFalhadas: FailedImage[]
  vitrinePreservada: PreservedShowcase[]
  parouPorErro: string | null
}

export interface Balance {
  entidade: Entity
  lidos: number
  somados: number
  confere: boolean
}

const zero = (): EntityCounts => ({ lidos: 0, criados: 0, atualizados: 0, pulados: 0 })

/** Ordena chaves em profundidade, para que dois relatórios só difiram no que mudou de verdade. */
const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = stable((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

export const createReport = () => {
  const data: ReportData = {
    entidades: { categorias: zero(), produtos: zero(), variacoes: zero() },
    imagens: { novas: 0, reusadas: 0, falhadas: 0 },
    categoriasInativadas: [],
    produtosPulados: [],
    skusDescartados: [],
    imagensFalhadas: [],
    vitrinePreservada: [],
    parouPorErro: null,
  }

  /**
   * A conferência de `CAT-08`: tudo que foi lido tem de ter virado uma das três saídas.
   *
   * Não é zelo de contador. Um produto que a API devolveu e que não foi criado, nem atualizado, nem
   * pulado, sumiu **em silêncio** — e num lote de 690 ninguém percebe olhando. É a única checagem
   * que pega perda por exceção engolida em ramo intermediário.
   */
  const balances = (): Balance[] =>
    ENTITIES.map(entidade => {
      const c = data.entidades[entidade]
      const somados = c.criados + c.atualizados + c.pulados
      return { entidade, lidos: c.lidos, somados, confere: c.lidos === somados }
    })

  return {
    read: (entidade: Entity, n = 1) => { data.entidades[entidade].lidos += n },
    created: (entidade: Entity, n = 1) => { data.entidades[entidade].criados += n },
    updated: (entidade: Entity, n = 1) => { data.entidades[entidade].atualizados += n },

    skipped: (entidade: Entity, produto?: SkippedProduct) => {
      data.entidades[entidade].pulados += 1
      if (produto) data.produtosPulados.push(produto)
    },

    imageNew: () => { data.imagens.novas += 1 },
    imageReused: () => { data.imagens.reusadas += 1 },
    imageFailed: (falha: FailedImage) => {
      data.imagens.falhadas += 1
      data.imagensFalhadas.push(falha)
    },

    skusDiscarded: (discards: readonly SkuDiscard[]) => { data.skusDescartados.push(...discards) },
    categoryCurated: (categoria: CuratedCategory) => { data.categoriasInativadas.push(categoria) },
    showcasePreserved: (campo: PreservedShowcase) => { data.vitrinePreservada.push(campo) },

    /** Parada limpa (`CAT-06`): registra o motivo e garante saída diferente de zero. */
    aborted: (motivo: string) => { data.parouPorErro = motivo },

    data: (): ReportData => data,
    balances,

    /**
     * `0` só quando **tudo** fecha e nada abortou.
     *
     * Imagem falhada NÃO derruba o código de saída: `CAT-07` diz que um produto nunca é descartado
     * por causa de uma foto, e um import de 689 produtos que sai vermelho por 3 imagens perdidas
     * ensina a ignorar o código de saída — que é pior do que não tê-lo.
     */
    exitCode: (): number =>
      data.parouPorErro === null && balances().every(b => b.confere) ? 0 : 1,

    toJSON: (): string => JSON.stringify(stable(data), null, 2),

    toText: (): string => {
      const linhas: string[] = []
      linhas.push('RELATÓRIO DO IMPORT — Nuvemshop → Supabase', '')
      linhas.push('entidade      lidos  criados  atualizados  pulados  confere')
      for (const b of balances()) {
        const c = data.entidades[b.entidade]
        linhas.push(
          b.entidade.padEnd(13) +
          String(c.lidos).padStart(5) +
          String(c.criados).padStart(9) +
          String(c.atualizados).padStart(13) +
          String(c.pulados).padStart(9) +
          (b.confere ? '  sim' : '  NÃO'),
        )
      }
      linhas.push('')
      linhas.push(`imagens       novas ${data.imagens.novas} · reusadas ${data.imagens.reusadas} · falhadas ${data.imagens.falhadas}`)

      if (data.categoriasInativadas.length > 0) {
        linhas.push('', 'categorias desativadas por curadoria:')
        for (const c of data.categoriasInativadas) linhas.push(`  ${c.slug} — ${c.motivo}`)
      }
      if (data.produtosPulados.length > 0) {
        linhas.push('', 'produtos pulados:')
        for (const p of data.produtosPulados) linhas.push(`  ${p.slug} — ${p.motivo}`)
      }
      if (data.skusDescartados.length > 0) {
        linhas.push('', `SKUs descartados por duplicidade: ${data.skusDescartados.length}`)
        for (const s of data.skusDescartados.slice(0, 20)) {
          linhas.push(`  ${s.sku} — ${s.product_slug} (variação ${s.variant_nuvemshop_id}, ${s.motivo})`)
        }
        if (data.skusDescartados.length > 20) {
          linhas.push(`  … e mais ${data.skusDescartados.length - 20} (lista completa no JSON)`)
        }
      }
      if (data.imagensFalhadas.length > 0) {
        linhas.push('', 'imagens que falharam (o produto entrou sem elas):')
        for (const i of data.imagensFalhadas) linhas.push(`  ${i.storageBase} — ${i.motivo}`)
      }
      if (data.vitrinePreservada.length > 0) {
        linhas.push('', 'curadoria da loja preservada (origem divergiu e NÃO foi aplicada):')
        for (const v of data.vitrinePreservada) {
          linhas.push(`  ${v.entidade}/${v.slug}.${v.campo}: loja=${v.loja} origem=${v.origem}`)
        }
      }
      if (data.parouPorErro !== null) {
        linhas.push('', `PAROU: ${data.parouPorErro}`)
      }
      return linhas.join('\n')
    },
  }
}

export type Report = ReturnType<typeof createReport>
