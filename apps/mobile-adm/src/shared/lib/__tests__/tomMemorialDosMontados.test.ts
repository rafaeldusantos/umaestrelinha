// O registro memorial na visão "Montados" e no pedido montado: a lista, a tela, as frases
// e a porta de `features/order-proposal`. Molde e régua: `tomMemorialDosAvisos.test.ts` e
// `tomMemorialDeClientes.test.ts` — pela AST do TypeScript, nos LITERAIS de texto (string, pedaços de
// template, texto de JSX), fora de classe de estilo e de import, com fronteira por TOKEN EXATO (`L-034`).
//
// Acusa: emoji, `!` dentro de texto, ranking, urgência e o nome dos materiais.
//
// **Uma diferença declarada na régua do material**: aqui o pelo de pet é acusado no PLURAL ("pelos"),
// que é como o catálogo e o guia o nomeiam ("Pelos de pet"). O singular "pelo" é a preposição — o botão
// do protótipo é "Enviar pelo WhatsApp" —, e acusá-lo faria a régua recusar a frase que a tela tem de
// dizer. Os sensores provam os dois lados: "pelos de pet" é acusado, "pelo WhatsApp" não. Os outros seis
// materiais seguem com a régua dos guardas irmãos, singular e plural.
//
// Âncora dupla: os arquivos lidos E os literais achados, com as frases-chave do desenho dentro.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const PASTAS = ['features/order-proposal/', 'widgets/proposal-list/']
const PAGINAS = ['pages/PedidoMontadoPage.tsx', 'pages/MontarPedidoPage.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const parse = (rel: string, texto: string) =>
  ts.createSourceFile(rel, texto, ts.ScriptTarget.Latest, true, rel.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

/** Os atributos de JSX cujo valor é classe de estilo, não frase. */
const ATRIBUTOS_DE_ESTILO = new Set(['className', 'overlayClassName'])
/** As funções cujos argumentos de texto são classe de estilo. */
const FUNCOES_DE_ESTILO = new Set(['cn'])

const ehEstilo = (no: ts.Node): boolean => {
  for (let p: ts.Node | undefined = no.parent; p; p = p.parent) {
    if (ts.isJsxAttribute(p)) return ATRIBUTOS_DE_ESTILO.has(p.name.getText())
    if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && FUNCOES_DE_ESTILO.has(p.expression.text)) return true
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isBlock(p) || ts.isSourceFile(p)) return false
  }
  return false
}

/** Os literais de TEXTO de um arquivo: string, pedaços de template e texto de JSX. */
const literais = (rel: string, texto: string): string[] => {
  const fonte = parse(rel, texto)
  const achados: string[] = []
  const visitar = (no: ts.Node) => {
    if (ts.isStringLiteral(no) || ts.isNoSubstitutionTemplateLiteral(no)) {
      if (!ehEstilo(no)) achados.push(no.text)
    } else if (ts.isTemplateHead(no) || ts.isTemplateMiddle(no) || ts.isTemplateTail(no)) {
      if (!ehEstilo(no)) achados.push(no.text)
    } else if (ts.isJsxText(no)) {
      const t = no.getText().replace(/\s+/g, ' ').trim()
      if (t) achados.push(t)
    }
    no.forEachChild(visitar)
  }
  visitar(fonte)
  return achados
}

interface Arquivo {
  rel: string
  texto: string
}

const ESCOPO: Arquivo[] = arquivos(SRC)
  .map((c) => relative(SRC, c).split('\\').join('/'))
  .filter((rel) => PASTAS.some((p) => rel.startsWith(p)) || PAGINAS.includes(rel))
  .map((rel) => ({ rel, texto: readFileSync(join(SRC, rel), 'utf8') }))

const palavra = (re: string) => new RegExp(`(?<![-\\w])(?:${re})(?![-\\w])`, 'iu')
const FORMAS: { nome: string; re: RegExp }[] = [
  { nome: 'emoji', re: /\p{Extended_Pictographic}/u },
  { nome: 'exclamação', re: /!/ },
  { nome: 'ranking', re: palavra('vip|melhor|melhores|top|ranking') },
  { nome: 'urgência', re: palavra('atenção|urgente|urgentes|últimas?\\s+unidades|últimos?\\s+unidades|corra|só\\s+hoje') },
  { nome: 'material', re: palavra('cinzas?|leite|cabelos?|pelos|dentes?|cotos?|penas?') },
]

const acusacoes = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) => literais(a.rel, a.texto).flatMap((l) => FORMAS.filter((f) => f.re.test(l)).map((f) => `${a.rel} [${f.nome}] ${l}`)))

const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.tsx', texto: fonte }]

describe('o registro dos pedidos montados é memorial — âncoras', () => {
  it('a varredura leu a feature, a lista e a página', () => {
    expect(ESCOPO.map((a) => a.rel)).toEqual(
      expect.arrayContaining([
        'features/order-proposal/model/frases.ts',
        'features/order-proposal/ui/CartaoDoLink.tsx',
        'widgets/proposal-list/ui/ListaDeMontados.tsx',
        'pages/PedidoMontadoPage.tsx',
        // A montagem de um pedido.
        'features/order-proposal/model/montagem.ts',
        'features/order-proposal/ui/PassoDaCliente.tsx',
        'pages/MontarPedidoPage.tsx',
        // A folha "Colar texto".
        'features/order-proposal/ui/FolhaColarTexto.tsx',
        // O passo 2 · Peças: a sacola, a busca e a folha da variação.
        'features/order-proposal/model/sacola.ts',
        'features/order-proposal/ui/PassoDasPecas.tsx',
        'features/order-proposal/ui/FolhaDaVariacao.tsx',
      ]),
    )
    expect(ESCOPO.length).toBeGreaterThanOrEqual(8)
  })

  it('o extrator achou os literais: acima de um piso, e as frases do desenho dentro', () => {
    const todos = ESCOPO.flatMap((a) => literais(a.rel, a.texto))
    expect(todos.length).toBeGreaterThanOrEqual(40)
    const junto = todos.join('\n')
    for (const frase of [
      'Enviar pelo WhatsApp',
      'Copiar link',
      'Sem telefone — copie o link.',
      'Cancelado. Quem abrir o link lê que este pedido não está mais disponível.',
      'Quem abrir o link vai ler que este pedido não está mais disponível. Não dá para desfazer.',
      'Frete: a cliente escolhe no link.',
      // A montagem.
      'Sair sem criar o link?',
      'Nada foi gravado ainda. A montagem se perde ao sair.',
      // O rascunho da montagem.
      'Nada foi gravado ainda. Você pode guardar as peças e os descontos neste celular para continuar depois. Os dados da cliente e o motivo do desconto não ficam guardados.',
      'Rascunho retomado: as peças e os descontos voltaram.',
      "Complete o endereço, ou escolha 'A cliente preenche no link'.",
      // A folha "Colar texto".
      'Tem os dados numa mensagem?',
      'A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde.',
      'Lido do texto — confira.',
      // O passo 2 · Peças.
      'Acrescente ao menos uma peça.',
      'Pede material da cliente. Depois de pago, o pedido entra na fila de material como os da loja.',
      'Opcional. Deixe em branco se ela preferir a peça sem gravação.',
    ])
      expect(junto).toContain(frase)
  })

  it('o extrator NÃO leva classe de estilo (medido no cartão do link)', () => {
    const todos = ESCOPO.filter((a) => a.rel === 'features/order-proposal/ui/CartaoDoLink.tsx').flatMap((a) => literais(a.rel, a.texto))
    expect(todos.length).toBeGreaterThan(0)
    expect(todos.some((l) => /\bmin-h-12\b/.test(l))).toBe(false)
  })
})

describe('o registro dos pedidos montados é memorial', () => {
  it('nenhum literal da visão Montados e do pedido montado tem emoji, exclamação, ranking, urgência nem nome de material', () => {
    expect(acusacoes(ESCOPO)).toEqual([])
  })
})

describe('sensores — a régua acusa cada forma e não acusa o que não é', () => {
  it.each([
    ["const t = 'Link pronto 🎉'", 'emoji'],
    ["const t = 'Link copiado!'", 'exclamação'],
    ['const t = <p>Cliente VIP</p>', 'ranking'],
    ["const t = 'Atenção: o link vence hoje'", 'urgência'],
    ["const t = 'Corra, o link vence'", 'urgência'],
    ["const t = 'Pingente com cinzas'", 'material'],
    ["const t = 'Pelos de pet'", 'material'],
    ["const t = 'Leite materno'", 'material'],
  ])('acusa: %s', (codigo, forma) => {
    expect(acusacoes(sintetico(codigo)).some((a) => a.includes(`[${forma}]`))).toBe(true)
  })

  it.each([["const t = 'Enviar pelo WhatsApp'"], ["const t = 'Pago pelo link'"], ["const t = 'Montado há 2 dias · vale até 05/11'"]])(
    'não acusa (inverso): %s',
    (codigo) => {
      expect(acusacoes(sintetico(codigo))).toEqual([])
    },
  )

  it('classe de estilo e comentário não contam', () => {
    expect(acusacoes(sintetico('const a = <p className="top-0">x</p>\n// Atenção!\nconst b = 1'))).toEqual([])
  })
})
