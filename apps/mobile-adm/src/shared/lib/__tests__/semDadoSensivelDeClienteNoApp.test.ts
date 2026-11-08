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
// **Feature `82` (`ENV-23`) — UMA exceção, por arquivo e texto exatos**: os chips "Leite materno",
// "Cinzas"… do bloco Material do DETALHE DO PEDIDO leem o snapshot de `order_items`, e a spec aprovada
// manda pedir a coluna de materiais no `select` dos itens (`COLUNAS_DOS_ITENS`, `entities/order`). Só essa
// linha passa; o termo segue recusado em qualquer outro lugar do app — inclusive em toda a aba Clientes
// (régua 1b), que é o que `MAC-29` protege. Sensor: a mesma linha noutro arquivo é acusada.
//
// **O documento no pedido montado, por arquivo e texto exatos**: o pedido montado
// é a tela em que a Adri confere o que a cliente vai confirmar no link, e mostra o documento dela. Passam
// só a linha que o declara no tipo (`features/order-proposal/model/tipos.ts`) e a linha que o lê
// (`features/order-proposal/model/frases.ts`); o termo segue recusado em qualquer outro lugar — inclusive
// em toda a aba Clientes. Sensor: a mesma linha noutro arquivo é acusada.
//
// **A montagem de um pedido, por arquivo e texto exatos**: a Adri digita e confere o
// documento e o endereço de entrega da cliente, e vê os endereços salvos dela — só dentro da montagem.
// Passam a leitura da tabela de endereços em `entities/customer/api/clientesDaMontagem.ts` (a única
// linha com o termo num arquivo de cliente — a régua 1b aceita essa e mais nenhuma) e o rótulo do campo
// do documento em `features/order-proposal/ui/PassoDaCliente.tsx`. As duas listas novas de colunas
// (`COLUNAS_DA_MONTAGEM`, sem documento; `COLUNAS_DO_ENDERECO_SALVO`) foram conferidas no banco local
// em 2026-11-07. Sensor: as mesmas linhas noutro arquivo são acusadas. Desde a folha "Colar texto", mais
// duas: a leitura que leva o documento lido ao campo (`model/montagem.ts`) e o nome do campo no aviso
// "Não achei: …" (`model/frasesDaMontagem.ts`).
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

/** Feature `82`: a única linha permitida, por arquivo e texto exatos (ver o cabeçalho). */
const PERMITIDAS = [
  { rel: 'entities/order/model/linha.ts', texto: "'requires_material, material_kinds'" },
  // O documento da cliente no pedido montado — a declaração no tipo e a leitura, e só elas.
  { rel: 'features/order-proposal/model/tipos.ts', texto: 'customer_document: string | null' },
  { rel: 'features/order-proposal/model/frases.ts', texto: 'const documento = limpo(p.customer_document)' },
  // A montagem de um pedido: a leitura dos endereços salvos e o rótulo do documento.
  { rel: 'entities/customer/api/clientesDaMontagem.ts', texto: ".from('addresses')" },
  { rel: 'features/order-proposal/ui/PassoDaCliente.tsx', texto: 'rotulo="CPF (opcional)"' },
  // A leitura de um texto colado (a folha "Colar texto" da montagem): o documento lido vai para o campo
  // do documento, e o aviso nomeia o campo que faltou. Nada disso sai da memória da tela.
  {
    rel: 'features/order-proposal/model/montagem.ts',
    texto: "const pares: [keyof ContatoDigitado, string][] = [['nome', c.name], ['email', c.email], ['whatsapp', c.phone], ['documento', c.cpf]]",
  },
  { rel: 'features/order-proposal/model/frasesDaMontagem.ts', texto: "documento: 'CPF'," },
]
const permitida = (rel: string, linha: string) => PERMITIDAS.some((p) => p.rel === rel && p.texto === linha.trim())

const termosEm = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) =>
    a.codigo
      .split('\n')
      .flatMap((l, i) => (TERMOS.test(l) && !permitida(a.rel, l) ? [`${a.rel}:${i + 1} ${l.trim()}`] : [])),
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
  // A montagem, medidas no banco local em 2026-11-07 (`information_schema.columns`).
  COLUNAS_DA_MONTAGEM: ['id', 'name', 'email', 'phone', 'has_account', 'orders_total'],
  COLUNAS_DO_ENDERECO_SALVO: ['id', 'label', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'is_default', 'created_at'],
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

  it('as oito constantes COLUNAS_* foram achadas no dono (um parser cego aprovaria todas)', () => {
    const achadas = lerColunas(readFileSync(join(SRC, LINHA), 'utf8').replace(/\r\n?/g, '\n'))
    expect(Object.keys(achadas).sort()).toEqual(Object.keys(ESPERADAS).sort())
  })

  it('cada hook de leitura passa uma constante COLUNAS_* ao `select` (nenhuma lista solta no hook)', () => {
    const hooks = ['useListaDeClientes', 'useCliente', 'usePedidosDoCliente', 'buscarClientePorEmail', 'clientesDaMontagem']
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

  it('1b — a exceção da `82` existe UMA vez, no dono das colunas do pedido, e nenhum arquivo de cliente cita o termo — fora a leitura dos endereços da montagem', () => {
    const naLinha = PRODUCAO.find((a) => a.rel === 'entities/order/model/linha.ts')!
    expect(naLinha.codigo.split('\n').filter((l) => TERMOS.test(l)).map((l) => l.trim())).toEqual([PERMITIDAS[0].texto])
    const deCliente = DE_CLIENTE.flatMap((a) => a.codigo.split('\n').filter((l) => TERMOS.test(l)).map((l) => `${a.rel} ${l.trim()}`))
    expect(deCliente).toEqual(["entities/customer/api/clientesDaMontagem.ts .from('addresses')"])
  })

  it('as exceções do pedido montado existem UMA vez cada, e nenhum outro arquivo do pedido montado cita o termo', () => {
    for (const p of PERMITIDAS.slice(1)) {
      const a = PRODUCAO.find((x) => x.rel === p.rel)!
      expect(a.codigo.split('\n').filter((l) => TERMOS.test(l)).map((l) => l.trim())).toEqual([p.texto])
    }
  })

  it('sensor das exceções do pedido montado: a mesma linha na aba Clientes, ou noutro arquivo do pedido montado, é acusada', () => {
    expect(termosEm([{ rel: 'entities/customer/model/linha.ts', codigo: '  customer_document: string | null' }])).toHaveLength(1)
    expect(termosEm([{ rel: 'widgets/customer-detail/ui/ContatoDaCliente.tsx', codigo: '  const documento = limpo(p.customer_document)' }])).toHaveLength(1)
    expect(termosEm([{ rel: 'pages/PedidoMontadoPage.tsx', codigo: '  {p.customer_document}' }])).toHaveLength(1)
    expect(termosEm([{ rel: 'features/order-proposal/model/tipos.ts', codigo: '  customer_document: string' }])).toHaveLength(1)
    expect(termosEm([{ rel: 'features/order-proposal/model/tipos.ts', codigo: '  customer_document: string | null' }])).toEqual([])
  })

  it('sensor das exceções da montagem: a leitura dos endereços e o rótulo do documento noutro arquivo são acusados', () => {
    expect(termosEm([{ rel: 'entities/customer/api/useCliente.ts', codigo: "      .from('addresses')" }])).toHaveLength(1)
    expect(termosEm([{ rel: 'pages/ClientePage.tsx', codigo: '              rotulo="CPF (opcional)"' }])).toHaveLength(1)
    expect(termosEm([{ rel: 'entities/customer/api/clientesDaMontagem.ts', codigo: "  .select('id, cpf')" }])).toHaveLength(1)
    expect(termosEm([{ rel: 'entities/customer/api/clientesDaMontagem.ts', codigo: "      .from('addresses')" }])).toEqual([])
    expect(termosEm([{ rel: 'features/order-proposal/ui/PassoDaCliente.tsx', codigo: '              rotulo="CPF (opcional)"' }])).toEqual([])
  })

  it('sensor da exceção: a mesma linha noutro arquivo é acusada', () => {
    const fora = [{ rel: 'entities/customer/model/linha.ts', codigo: "  'requires_material, material_kinds'" }]
    expect(termosEm(fora)).toHaveLength(1)
    const noDono = [{ rel: 'entities/order/model/linha.ts', codigo: "  'requires_material, material_kinds'" }]
    expect(termosEm(noDono)).toEqual([])
    const outraForma = [{ rel: 'entities/order/model/linha.ts', codigo: '  material_kinds: string[]' }]
    expect(termosEm(outraForma)).toHaveLength(1)
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
