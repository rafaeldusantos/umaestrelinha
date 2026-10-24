// Feature `76` · T20 (G4) — `MAC-29`: o app do ateliê nunca pede, guarda nem desenha o que a aba
// Clientes não mostra. O CPF, o material de cada peça, as notas internas, os endereços completos, o
// documento do pedido, as colunas cruas da Nuvemshop e a contagem de duplicadas ficam no painel; o que
// não está no `select` não atravessa a rede e não fica na memória de um celular que a Adri pode perder.
//
// Quatro réguas:
//
// 1. **Os termos** — `cpf`, `material_kinds`, `customer_notes`, `addresses`, `customer_document`,
//    `nuvemshop_` e `same_email_count` não aparecem em NENHUM arquivo de produção do app (comentário
//    fora). Fronteira à esquerda por letra: `customer_cpf` é acusado, `scpf` não.
// 2. **As listas de colunas** — cada `COLUNAS_*` de `entities/customer/model/linha.ts` é comparada,
//    POR IGUALDADE de chaves, com a lista que o probe 01 mediu no banco (escrita aqui por extenso:
//    derivá-la do módulo provaria que ele é igual a si mesmo). Uma coluna a mais reprova.
// 3. **`select('*')` e `select()`** em arquivo de cliente — pedir tudo é pedir o CPF.
// 4. **Âncora**: o dono das listas foi lido, as seis constantes foram achadas, e os arquivos de cliente
//    são ao menos oito (os quatro hooks, `linha`, `clientesHref`, `identidade`, `frases`…).
//
// Escopo: `apps/mobile-adm/src`, só produção. Os arquivos de fixtura (`src/test/`) ficam de fora: são
// dado sintético de teste.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const LINHA = 'entities/customer/model/linha.ts'

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

/** CRLF primeiro (`L-031`); linha e bloco na MESMA passada (`BL-027`); a numeração é preservada. */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n?/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))

interface Arquivo {
  rel: string
  codigo: string
}

const PRODUCAO: Arquivo[] = arquivos(SRC).map((c) => ({
  rel: relative(SRC, c).split('\\').join('/'),
  codigo: semComentarios(readFileSync(c, 'utf8')),
}))
const DE_CLIENTE = PRODUCAO.filter((a) => a.rel.startsWith('entities/customer/') || a.rel.startsWith('features/open-customer/') || /^(pages\/Cliente|widgets\/customer)/.test(a.rel))

/** Régua 1 — os termos. Fronteira à esquerda por LETRA (o `_` e o dígito deixam acusar `customer_cpf`). */
const TERMOS = /(?<![a-z])(?:cpf|material_kinds|customer_notes|addresses|customer_document|nuvemshop_|same_email_count)/i
/** Régua 3 — pedir tudo. */
const SELECT_DE_TUDO = /\.select\(\s*(?:\)|['"`]\s*\*)/

const termosEm = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) =>
    a.codigo.split('\n').flatMap((l, i) => (TERMOS.test(l) ? [`${a.rel}:${i + 1} ${l.trim()}`] : [])),
  )
const selectsDeTudoEm = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) =>
    a.codigo.split('\n').flatMap((l, i) => (SELECT_DE_TUDO.test(l) ? [`${a.rel}:${i + 1} ${l.trim()}`] : [])),
  )

/** As listas do probe 01 (+ `orders_open`, da migration da `76`), POR EXTENSO. */
const ESPERADAS: Record<string, string[]> = {
  COLUNAS_DA_LISTA: ['id', 'name', 'email', 'phone', 'created_at', 'orders_paid', 'total_spent', 'last_order_at', 'last_activity_at', 'orders_open'],
  COLUNAS_DA_FICHA: ['id', 'name', 'email', 'phone', 'created_at', 'orders_paid', 'orders_total', 'total_spent', 'avg_ticket', 'orders_open'],
  COLUNAS_DO_PEDIDO: ['id', 'order_number', 'status', 'payment_status', 'shipping_service_id', 'material_status', 'total', 'created_at'],
  COLUNAS_DOS_ITENS: ['order_id', 'product_name'],
  COLUNAS_DA_CIDADE: ['address_city', 'address_state'],
  COLUNAS_DO_ACHADO: ['id'],
}

/** Lê as constantes `COLUNAS_*` do texto do dono: uma string (ou soma de strings) de colunas separadas por vírgula. */
const lerColunas = (texto: string): Record<string, string[]> => {
  const achadas: Record<string, string[]> = {}
  for (const m of texto.matchAll(/export const (COLUNAS_\w+)\s*=\s*((?:\s*['"`][^'"`]*['"`]\s*\+?)+)/g)) {
    const partes = [...m[2].matchAll(/['"`]([^'"`]*)['"`]/g)].map((p) => p[1]).join('')
    achadas[m[1]] = partes.split(',').map((c) => c.trim())
  }
  return achadas
}

describe('âncoras', () => {
  it('a varredura lê o app, os arquivos de cliente e o dono das listas', () => {
    expect(PRODUCAO.length).toBeGreaterThanOrEqual(110)
    expect(PRODUCAO.map((a) => a.rel)).toContain(LINHA)
    expect(DE_CLIENTE.length).toBeGreaterThanOrEqual(8)
    expect(DE_CLIENTE.map((a) => a.rel)).toEqual(
      expect.arrayContaining([
        'entities/customer/api/useListaDeClientes.ts',
        'entities/customer/api/useCliente.ts',
        'entities/customer/api/usePedidosDoCliente.ts',
        'entities/customer/api/buscarClientePorEmail.ts',
        'features/open-customer/model/useAbrirCliente.ts',
      ]),
    )
  })

  it('as seis constantes COLUNAS_* foram achadas no dono (um parser cego aprovaria todas)', () => {
    const achadas = lerColunas(readFileSync(join(SRC, LINHA), 'utf8').replace(/\r\n?/g, '\n'))
    expect(Object.keys(achadas).sort()).toEqual(Object.keys(ESPERADAS).sort())
  })

  it('cada hook de leitura passa uma constante COLUNAS_* ao `select` (nenhuma lista solta no hook)', () => {
    const hooks = ['useListaDeClientes', 'useCliente', 'usePedidosDoCliente', 'buscarClientePorEmail']
    for (const h of hooks) {
      const a = PRODUCAO.find((p) => p.rel === `entities/customer/api/${h}.ts`)!
      const selects = [...a.codigo.matchAll(/\.select\(\s*([^,)\s]+)/g)].map((m) => m[1])
      expect(selects.length).toBeGreaterThan(0)
      for (const s of selects) expect(s).toMatch(/^COLUNAS_[A-Z_]+$/)
    }
  })
})

describe('régua 1 — os termos sensíveis não aparecem no app', () => {
  it('nenhum arquivo de produção do app cita CPF, material, notas, endereços completos, documento, Nuvemshop ou duplicadas', () => {
    expect(termosEm(PRODUCAO)).toEqual([])
  })
})

describe('régua 2 — cada lista de colunas = a medida no banco, por igualdade de chaves', () => {
  const lidas = lerColunas(readFileSync(join(SRC, LINHA), 'utf8').replace(/\r\n?/g, '\n'))
  it.each(Object.entries(ESPERADAS))('%s', (nome, esperada) => {
    expect(lidas[nome]).toEqual(esperada)
  })

  it('sensor: uma lista com uma coluna a mais NÃO é igual (a igualdade recusa o acréscimo)', () => {
    const comCpf = lerColunas("export const COLUNAS_DA_LISTA = 'id, name, cpf'")
    expect(comCpf.COLUNAS_DA_LISTA).not.toEqual(ESPERADAS.COLUNAS_DA_LISTA)
    expect(comCpf.COLUNAS_DA_LISTA).toEqual(['id', 'name', 'cpf'])
  })

  it('sensor: o parser lê a soma de strings quebrada em linhas, como `linha.ts` escreve', () => {
    const t = "export const COLUNAS_X =\n  'a, b, ' +\n  'c'\n"
    expect(lerColunas(t).COLUNAS_X).toEqual(['a', 'b', 'c'])
  })
})

describe('régua 3 — nenhum `select(*)` nem `select()` nos arquivos de cliente', () => {
  it('nos arquivos de cliente', () => {
    expect(selectsDeTudoEm(DE_CLIENTE)).toEqual([])
  })
})

describe('SENSORES', () => {
  const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.ts', codigo: semComentarios(fonte) }]

  it.each([
    ["const q = supabase.from('customer_list').select('id, cpf')"],
    ['const x = c.customer_cpf'],
    ['const k = linha.material_kinds'],
    ["supabase.from('customer_notes')"],
    ["supabase.from('addresses')"],
    ['const d = pedido.customer_document'],
    ['const n = row.nuvemshop_id'],
    ['const n = c.same_email_count'],
    ['const CPF = 1'],
  ])('acusa o termo: %s', (fonte) => {
    expect(termosEm(sintetico(fonte))).toHaveLength(1)
  })

  it.each([
    ['const x = cliente.orders_open'],
    ['const escopo = 1'],
    ["const aviso = 'descpfrase'"],
    ['const total = 3'],
  ])('NÃO acusa (inverso): %s', (fonte) => {
    expect(termosEm(sintetico(fonte))).toEqual([])
  })

  it.each([
    ["supabase.from('customer_list').select('*')"],
    ['supabase.from("customer_list").select("*, orders(*)")'],
    ['supabase.from(`customer_list`).select()'],
    ["supabase.from('customer_list').select(  )"],
  ])('acusa o select de tudo: %s', (fonte) => {
    expect(selectsDeTudoEm(sintetico(fonte))).toHaveLength(1)
  })

  it('NÃO acusa `select(COLUNAS)` nem `select(\'id\')`', () => {
    expect(selectsDeTudoEm(sintetico("supabase.from('x').select(COLUNAS_DA_LISTA, { count: 'exact' })"))).toEqual([])
    expect(selectsDeTudoEm(sintetico("supabase.from('x').select('id')"))).toEqual([])
  })

  it('a prosa que explica a regra não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(termosEm(sintetico('// nunca o cpf\r\nconst a = 1'))).toEqual([])
    expect(termosEm(sintetico('/* material_kinds */\nconst a = 1'))).toEqual([])
    expect(termosEm(sintetico('// varre apps/**\nconst c = linha.cpf\n/* fim */'))).toEqual(['sintetico.ts:2 const c = linha.cpf'])
    expect(selectsDeTudoEm(sintetico("// .select('*')\r\nconst a = 1"))).toEqual([])
  })
})
