// Feature `76` · T28 (G6) — `MAC-28`: nenhum dado de cliente fica no aparelho nem em lugar nenhum fora da
// tela. Nome, e-mail e telefone de uma pessoa que confiou o material mais íntimo à loja não vão para o
// armazenamento do navegador, para o console, para o título da aba, para o histórico de navegação nem
// para o endereço. Nenhuma suíte de componente vê isso: o dado só estaria num lugar que a tela não
// desenha.
//
// A régua lê o FONTE dos arquivos de cliente (a entidade, as features, os widgets e as duas páginas;
// só produção, comentário fora — CRLF primeiro, linha e bloco na MESMA varredura, `BL-027`, e o `//` de
// um esquema de URL não abre comentário) e acusa, por FORMA (`L-033`):
//
// 1. armazenamento: `localStorage`, `sessionStorage`, `indexedDB`;
// 2. `console.` (qualquer método — `console.log(cliente)` é o vazamento clássico);
// 3. `document.title =` com valor que NÃO seja um literal de texto puro (um título montado com o nome da
//    pessoa iria ao histórico do navegador, ao seletor de apps e à leitura de tela);
// 4. `history.pushState` / `history.replaceState` à mão (o histórico é do react-router);
// 5. `state` de `navigate(`/`<Link>` diferente de `{ doApp: true }` — o `state` vai ao `history.state`,
//    e dado de cliente ali sobrevive ao fechamento da aba;
// 6. `navigate(` e `to=` com destino que não venha de `clientesHref`/`clienteHref`/`pedidoHref`/
//    `PEDIDOS_PATH`/`CLIENTES_PATH` (ou `-1`, o voltar): um destino montado à mão é a porta para um
//    e-mail ou nome na URL (`MAC-28`), e a ficha vai por `id` uuid, nunca por e-mail.
//
// O que NÃO alcança, declarado: o que o navegador faz com o que a tela desenha (a varredura de rede, de
// armazenamento e de histórico em navegador real é a T32). Esta é a metade que a leitura do fonte
// alcança.
//
// Âncora dupla: os arquivos lidos (por pasta, com piso) E as formas LEGÍTIMAS encontradas — o
// `navigate(` com o dono, o `state={{ doApp: true }}` e o `document.title =` de literal. Sem elas, uma
// pasta renomeada deixaria a régua varrendo o nada.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const PASTAS = [
  'entities/customer/',
  'features/open-customer/',
  'features/customer-slice/',
  'features/customer-search/',
  'widgets/customer-list/',
  'widgets/customer-detail/',
]
const PAGINAS = ['pages/ClientesPage.tsx', 'pages/ClientePage.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const semComentarios = (fonte: string): string =>
  fonte
    .replace(/\r\n?/g, '\n')
    .replace(/(?<!:)\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))

interface Arquivo {
  rel: string
  codigo: string
}

const ESCOPO: Arquivo[] = arquivos(SRC)
  .map((c) => relative(SRC, c).split('\\').join('/'))
  .filter((rel) => PASTAS.some((p) => rel.startsWith(p)) || PAGINAS.includes(rel))
  .map((rel) => ({ rel, codigo: semComentarios(readFileSync(join(SRC, rel), 'utf8')) }))

/** Um destino que vem do dono (ou `-1`). */
const DESTINO_DO_DONO = /^(?:-1|(?:clientesHref|clienteHref|pedidoHref)\(|PEDIDOS_PATH\b|CLIENTES_PATH\b)/

/**
 * O texto de cada chamada `nome(…)`, com os parênteses BALANCEADOS (a chamada pode quebrar linha):
 * é dele que se tiram o destino (o primeiro argumento de topo) e o `state` das opções.
 */
const chamadasDe = (codigo: string, nome: string): string[] => {
  const achadas: string[] = []
  for (const m of codigo.matchAll(new RegExp(`\\b${nome}\\(`, 'g'))) {
    let fundo = 1
    let i = (m.index ?? 0) + m[0].length
    const inicio = i
    while (i < codigo.length && fundo > 0) {
      const c = codigo[i++]
      if (c === '(') fundo++
      else if (c === ')') fundo--
    }
    achadas.push(codigo.slice(inicio, i - 1))
  }
  return achadas
}

/** O primeiro argumento de topo de uma chamada (corta na primeira vírgula fora de parênteses e chaves). */
const primeiroArgumentoDe = (argumentos: string): string => {
  let fundo = 0
  for (let i = 0; i < argumentos.length; i++) {
    const c = argumentos[i]
    if (c === '(' || c === '{' || c === '[') fundo++
    else if (c === ')' || c === '}' || c === ']') fundo--
    else if (c === ',' && fundo === 0) return argumentos.slice(0, i).trim()
  }
  return argumentos.trim()
}

/**
 * O valor de um atributo de JSX (`to=…`, `state=…`): o texto entre aspas ou entre chaves BALANCEADAS
 * (um template com `${…}` dentro das chaves tem chaves próprias).
 */
const atributosDe = (codigo: string, nome: string): string[] => {
  const achados: string[] = []
  for (const m of codigo.matchAll(new RegExp(`\\b${nome}=`, 'g'))) {
    let i = (m.index ?? 0) + m[0].length
    const abre = codigo[i]
    if (abre === '"' || abre === "'") {
      const fim = codigo.indexOf(abre, i + 1)
      achados.push(codigo.slice(i + 1, fim < 0 ? undefined : fim))
    } else if (abre === '{') {
      let fundo = 1
      const inicio = ++i
      while (i < codigo.length && fundo > 0) {
        const c = codigo[i++]
        if (c === '{') fundo++
        else if (c === '}') fundo--
      }
      achados.push(codigo.slice(inicio, i - 1))
    }
  }
  return achados
}

/** O valor de um `state` (de opções de `navigate` ou de atributo de JSX) é `{ doApp: true }`? */
const ehDoApp = (valor: string): boolean => /^\{*\s*doApp\s*:\s*true\s*\}/.test(valor.trim())

const FORMAS: { nome: string; acha: (codigo: string) => string[] }[] = [
  { nome: 'armazenamento', acha: (c) => [...c.matchAll(/\b(?:localStorage|sessionStorage|indexedDB)\b/g)].map((m) => m[0]) },
  { nome: 'console', acha: (c) => [...c.matchAll(/\bconsole\s*\./g)].map((m) => m[0]) },
  {
    nome: 'título do documento que não é literal',
    acha: (c) =>
      [...c.matchAll(/\bdocument\.title\s*=(?!=)\s*([^\n;]+)/g)]
        .map((m) => m[1].trim())
        .filter((v) => !/^(['"])[^'"`$\\]*\1$/.test(v)),
  },
  { nome: 'history à mão', acha: (c) => [...c.matchAll(/\bhistory\s*\.\s*(?:pushState|replaceState)\b/g)].map((m) => m[0]) },
  {
    // O `state` de uma navegação: a opção `state:` de `navigate(…)` e o atributo `state=` de JSX. O campo
    // `state` de um objeto de endereço (UF) não é navegação e não entra.
    nome: 'state diferente de { doApp: true }',
    acha: (c) => [
      ...chamadasDe(c, 'navigate').flatMap((a) => [...a.matchAll(/\bstate\s*:\s*([^]*)/g)].map((m) => m[1]).filter((v) => !ehDoApp(v))),
      ...atributosDe(c, 'state').filter((v) => !ehDoApp(v)),
    ],
  },
  {
    nome: 'navigate( com destino que não é do dono',
    acha: (c) => chamadasDe(c, 'navigate').map(primeiroArgumentoDe).filter((a) => !DESTINO_DO_DONO.test(a)),
  },
  {
    nome: 'to= com destino que não é do dono',
    acha: (c) => atributosDe(c, 'to').map((a) => a.trim()).filter((a) => !DESTINO_DO_DONO.test(a)),
  },
]

const acusacoes = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) => FORMAS.flatMap((f) => f.acha(a.codigo).map((x) => `${a.rel} [${f.nome}] ${x}`)))

const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.tsx', codigo: semComentarios(fonte) }]

describe('nenhum dado de cliente fora da tela (MAC-28) — âncoras', () => {
  it('a varredura leu as pastas de cliente e as duas páginas, sem teste', () => {
    expect(ESCOPO.length).toBeGreaterThanOrEqual(30)
    const rels = ESCOPO.map((a) => a.rel)
    for (const r of [
      'entities/customer/api/useCliente.ts',
      'entities/customer/model/clientesHref.ts',
      'features/open-customer/model/useAbrirCliente.ts',
      'widgets/customer-detail/ui/TopoDaFicha.tsx',
      'widgets/customer-list/ui/ListaDeClientes.tsx',
      'pages/ClientesPage.tsx',
      'pages/ClientePage.tsx',
    ])
      expect(rels).toContain(r)
    expect(rels.some((r) => r.includes('__tests__/'))).toBe(false)
  })

  it('a régua enxerga as formas LEGÍTIMAS: `navigate(` do dono, o `state` de `doApp` e o título literal', () => {
    const doConjunto = ESCOPO.map((a) => a.codigo).join('\n')
    expect(chamadasDe(doConjunto, 'navigate').length).toBeGreaterThanOrEqual(4)
    expect([...doConjunto.matchAll(/\bstate\s*[:=]\s*\{*\s*doApp\s*:\s*true\s*\}/g)].length).toBeGreaterThanOrEqual(3)
    expect([...doConjunto.matchAll(/\bdocument\.title\s*=\s*(['"])[^'"]*\1/g)].length).toBeGreaterThanOrEqual(1)
    expect(atributosDe(doConjunto, 'to').length).toBeGreaterThanOrEqual(2)
  })
})

describe('nenhum dado de cliente fora da tela (MAC-28)', () => {
  it('os arquivos de cliente não usam armazenamento, console, título montado, history à mão, `state` de dado nem destino montado', () => {
    expect(acusacoes(ESCOPO)).toEqual([])
  })
})

describe('sensores — a régua acusa cada forma e não acusa o que não é', () => {
  it.each([
    ['localStorage.setItem("c", nome)', 'armazenamento'],
    ['window.sessionStorage.getItem("c")', 'armazenamento'],
    ['const db = indexedDB.open("x")', 'armazenamento'],
    ['console.log(cliente)', 'console'],
    ['console . error(e)', 'console'],
    ['document.title = `Cliente · ${nome}`', 'título do documento que não é literal'],
    ['document.title = nome', 'título do documento que não é literal'],
    ['window.history.pushState({}, "", url)', 'history à mão'],
    ['history.replaceState(null, "", u)', 'history à mão'],
    ['navigate(href, { state: { cliente } })', 'state diferente de { doApp: true }'],
    ['<Link to={x} state={{ nome }} />', 'state diferente de { doApp: true }'],
    ['navigate(`/clientes/${email}`)', 'navigate( com destino que não é do dono'],
    ["navigate('/clientes?busca=' + termo)", 'navigate( com destino que não é do dono'],
    ['<Link to={`/clientes/${id}`} />', 'to= com destino que não é do dono'],
    ['<Link to="/clientes/x" />', 'to= com destino que não é do dono'],
  ])('acusa: %s', (codigo, forma) => {
    expect(acusacoes(sintetico(codigo)).some((a) => a.includes(`[${forma}]`))).toBe(true)
  })

  it.each([
    ["document.title = 'Cliente · Ateliê'"],
    ['navigate(-1)'],
    ['navigate(CLIENTES_PATH, { replace: true })'],
    ['navigate(clientesHref(id), { replace: true })'],
    ['navigate(clienteHref(achado.id), { state: { doApp: true } })'],
    ['<Link to={clienteHref(c.id)} state={{ doApp: true }} />'],
    ['<Link to={pedidoHref(p.id)} state={{ doApp: true }}>'],
    ['const { state } = useLocation()'],
    ['const doApp = (state as { doApp?: boolean } | null)?.doApp === true'],
    ['const estado = "console"'],
  ])('não acusa: %s', (codigo) => {
    expect(acusacoes(sintetico(codigo))).toEqual([])
  })

  it('a forma escrita em comentário não conta — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(acusacoes(sintetico('// console.log(cliente)\r\nconst a = 1'))).toEqual([])
    expect(acusacoes(sintetico('// localStorage.setItem(x)\nconst a = 1'))).toEqual([])
    expect(acusacoes(sintetico('/* navigate(`/c/${e}`) */ const a = 1'))).toEqual([])
    expect(acusacoes(sintetico('// varre apps/**\nconsole.log(x)\n/* fim */')).length).toBe(1)
  })

  it('o código DEPOIS do comentário continua acusado (CRLF não engole a linha seguinte)', () => {
    expect(acusacoes(sintetico('// nota\r\nconsole.log(c)')).length).toBe(1)
  })
})
