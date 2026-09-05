import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * As colunas de proveniência do import são PROVENIÊNCIA, e nenhuma tela as lê — `ESP-16`.
 *
 * A feature 35 grava em `orders` os três eixos crus do CSV da Nuvemshop, **em português**:
 * `nuvemshop_status`, `nuvemshop_payment_status`, `nuvemshop_shipping_status`. Eles existem para
 * auditar o de-para, e para nada mais.
 *
 * **O dia em que uma tela ler `nuvemshop_payment_status` para pintar um selo, existem duas respostas
 * para "este pedido foi pago?".** E elas divergem no primeiro `Recusado` — que sozinho é ambíguo:
 * cobre PIX vencido (`expired`) e cartão negado (`rejected`), dois estados que pedem ação diferente
 * da Adri. É o defeito 01 do projeto, com a agravante de que nada quebraria: o selo renderiza, o
 * `tsc` passa, e o painel mostra a coluna errada em silêncio.
 *
 * ÂNCORA DUPLA (`L-021`): a varredura prova que leu arquivos **e** que a régua encontra o que
 * procura. Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um
 * caminho errado. As duas juntas é que fecham.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** As três colunas cruas. `nuvemshop_id` e `nuvemshop_synced_at` NÃO entram: id é chave legítima. */
const PROVENIENCIA = ['nuvemshop_status', 'nuvemshop_payment_status', 'nuvemshop_shipping_status']

/**
 * O escopo é `apps/` inteiro — as duas pontas que têm tela.
 *
 * `tools/catalog-import` fica de fora **de propósito**: é quem ESCREVE as colunas, e proibi-lo de
 * nomeá-las tornaria a feature impossível. `packages/supabase` também fica: descrever a coluna num
 * tipo não é lê-la numa tela.
 */
const ESCOPO = ['apps']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

/**
 * Permanente e mínima: só arquivos onde a string é o **assunto**, não leitura de tela.
 *
 * Entrada nova exige o motivo escrito. A lista existe para forçar quem adicionar a justificar —
 * não para amansar a varredura. Uma tela que "precisa" ler a coluna crua não precisa: precisa da
 * coluna derivada.
 */
const ALLOWLIST: Record<string, string> = {
  'apps/backoffice/src/shared/lib/__tests__/provenanceNotRead.test.ts':
    'A varredura precisa nomear o que procura.',
  'apps/store/src/shared/lib/__tests__/importSchema.test.ts':
    'O guarda da migration da 35: as colunas são o assunto dele. Ele assere que cada uma carrega o COMMENT dizendo que nenhuma tela a lê — é o par desta varredura, não uma exceção a ela.',
}

const permitido = (arquivo: string): boolean =>
  Object.prototype.hasOwnProperty.call(ALLOWLIST, arquivo)

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

const varridos = ESCOPO.flatMap(d => arquivos(join(ROOT, d)))

interface Ocorrencia {
  arquivo: string
  linha: number
  coluna: string
}

const ocorrencias: Ocorrencia[] = []
for (const caminho of varridos) {
  const rel = relative(ROOT, caminho).split('\\').join('/')
  const linhas = readFileSync(caminho, 'utf8').split('\n')
  linhas.forEach((texto, i) => {
    for (const coluna of PROVENIENCIA) {
      if (texto.includes(coluna)) ocorrencias.push({ arquivo: rel, linha: i + 1, coluna })
    }
  })
}

describe('âncora dupla da varredura', () => {
  it('leu os arquivos de `apps/`', () => {
    // Caminho errado varre zero arquivo e passa em VERDE — a pior falha possível aqui.
    expect(varridos.length).toBeGreaterThan(300)
  })

  it('a régua ENCONTRA as três colunas onde elas estão escritas', () => {
    // Se este teste falhar, o `includes` parou de funcionar e a varredura virou um no-op verde,
    // mesmo lendo todos os arquivos.
    const neste = ocorrencias.filter(o => o.arquivo.endsWith("provenanceNotRead.test.ts"))
    expect(new Set(neste.map(o => o.coluna))).toEqual(new Set(PROVENIENCIA))
  })
})

describe('nenhuma tela lê as colunas de proveniência', () => {
  it('não há ocorrência fora da allowlist', () => {
    const fora = ocorrencias.filter(o => !permitido(o.arquivo))
    expect(fora.map(o => `${o.arquivo}:${o.linha} — ${o.coluna}`)).toEqual([])
  })
})
