// Feature `76` · T28 (G5) — `MAC-27`, `MAC-26`: o endereço da conversa de WhatsApp tem UM dono,
// `whatsappChatUrl` (`packages/core/src/notifications/phone.ts`), e o endereço da cobrança de material
// outro, `packages/core/src/orders/charge.ts`. Dois lugares do app escrevendo o endereço à mão (o bloco
// Cliente do pedido e a ficha da cliente) divergiriam no primeiro telefone com máscara: um abriria a
// conversa, o outro um `wa.me` sem número. Build, `tsc` e teste de componente passam com as duas
// escritas discordando.
//
// A régua lê o FONTE do disco, comentário fora (linha e bloco na MESMA varredura, `BL-027`, CRLF
// primeiro), e procura o literal do domínio do WhatsApp:
//
// - em PRODUÇÃO de `apps/mobile-adm/src`: qualquer ocorrência reprova. Os dois donos moram em
//   `packages/core` — fora da varredura por construção —, então a allowlist de produção é VAZIA;
// - nos TESTES: o literal só vale como VALOR ESPERADO, isto é, numa linha com `expect(`; ou no TÍTULO de
//   um caso (`it(`/`describe(`), que é prosa. Um teste que MONTA a URL (interpolação, concatenação,
//   constante) reprova — a prova de que o app abre o endereço certo é compará-lo com o literal, nunca
//   reconstruí-lo.
//
// **`SPEC_DEVIATION` de redação em relação a "testes inclusos" da spec (`MAC-27`)**: as três asserções
// de hoje (`CabecalhoClienteMaterial.test.tsx`, `acoesDoPedido.test.tsx`) citam o literal como valor
// esperado e seguem sem edição; por isso o teste é aceito quando é valor esperado, não proibido por
// inteiro. Allowlist de UM teste, escrita literalmente: `BlocoClienteHref.test.tsx`, o comparador da T06
// (`MAC-26`) — ele guarda uma CÓPIA LITERAL do que o bloco fazia antes da `76`, que é montagem por
// definição, e uma tabela de valores esperados fora de `expect(`.
//
// **O que a régua NÃO alcança, declarado**: o domínio escrito em pedaços (`'wa' + '.me'`) e o endereço
// alternativo da API do WhatsApp — a fronteira é o literal, que é como o defeito apareceu.
//
// Metade positiva: o bloco Cliente do pedido e o contato da ficha CHAMAM `whatsappChatUrl(`. Sem ela,
// apagar a chamada e escrever o endereço num terceiro arquivo deixaria a ausência verdadeira e vazia.
// Âncora dupla: os arquivos lidos (produção e teste) e as três citações conhecidas encontradas.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

/** O domínio, montado a partir de pedaços: o próprio guarda não carrega o literal que procura. */
const DOMINIO = ['wa', 'me'].join('.')
const LITERAL = new RegExp(DOMINIO.replace('.', '\\.'))

/** Os testes autorizados a MONTAR ou tabelar o endereço (ver o cabeçalho). Allowlist de UM. */
const TESTES_AUTORIZADOS = ['widgets/order-detail/__tests__/BlocoClienteHref.test.tsx']

const todos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return todos(caminho)
    return /\.(ts|tsx)$/.test(nome) ? [caminho] : []
  })

/**
 * Comentário sai preservando a numeração: CRLF primeiro (`L-031`), linha e bloco na MESMA passada.
 * **O `//` de um esquema de URL não abre comentário** (`(?<!:)`): o endereço procurado é justamente
 * `https://…`, e o removedor comum comeria o literal inteiro — a régua passaria vazia, a pior falha.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n?/g, '\n')
    .replace(/(?<!:)\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  teste: boolean
  linhas: string[]
}

const ARQUIVOS: Arquivo[] = todos(SRC).map((c) => ({
  rel: relative(SRC, c).split('\\').join('/'),
  teste: /\.test\.tsx?$/.test(c) || /(^|\/)__tests__\//.test(relative(SRC, c).split('\\').join('/')),
  linhas: semComentarios(readFileSync(c, 'utf8')),
}))

/** A linha é valor esperado ou título de caso. */
const ehValorEsperadoOuTitulo = (linha: string): boolean => /\bexpect\(/.test(linha) || /^\s*(it|describe|test)(\.\w+)?\(/.test(linha)

const infracoes = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) => {
    if (TESTES_AUTORIZADOS.includes(a.rel)) return []
    return a.linhas.flatMap((l, i) => {
      if (!LITERAL.test(l)) return []
      if (a.teste && ehValorEsperadoOuTitulo(l)) return []
      return [`${a.rel}:${i + 1} ${l.trim()}`]
    })
  })

const sintetico = (rel: string, teste: boolean, fonte: string): Arquivo[] => [{ rel, teste, linhas: semComentarios(fonte) }]

describe('o endereço do WhatsApp tem um dono só (MAC-27) — âncoras', () => {
  it('a varredura leu o app inteiro, produção e teste', () => {
    const producao = ARQUIVOS.filter((a) => !a.teste)
    const testes = ARQUIVOS.filter((a) => a.teste)
    expect(producao.length).toBeGreaterThanOrEqual(140)
    expect(testes.length).toBeGreaterThanOrEqual(100)
  })

  it('a régua enxerga as citações conhecidas: nos testes que já a faziam, como valor esperado', () => {
    const comLiteral = ARQUIVOS.filter((a) => a.linhas.some((l) => LITERAL.test(l))).map((a) => a.rel)
    for (const esperado of [
      'widgets/order-detail/__tests__/CabecalhoClienteMaterial.test.tsx',
      'pages/__tests__/acoesDoPedido.test.tsx',
      'widgets/order-detail/__tests__/BlocoClienteHref.test.tsx',
      'widgets/customer-detail/__tests__/BlocosDaFicha.test.tsx',
    ])
      expect(comLiteral).toContain(esperado)
  })

  it('o literal NÃO está no próprio guarda (ele o monta de pedaços)', () => {
    const eu = ARQUIVOS.find((a) => a.rel === 'shared/lib/__tests__/whatsappComDonoUnico.test.ts')!
    expect(eu.linhas.some((l) => LITERAL.test(l))).toBe(false)
  })
})

describe('o endereço do WhatsApp tem um dono só (MAC-27)', () => {
  it('nenhum arquivo de PRODUÇÃO do app escreve o endereço (os donos moram em `packages/core`)', () => {
    expect(infracoes(ARQUIVOS.filter((a) => !a.teste))).toEqual([])
  })

  it('nenhum TESTE monta o endereço: o literal só aparece como valor esperado ou título', () => {
    expect(infracoes(ARQUIVOS.filter((a) => a.teste))).toEqual([])
  })

  it('a allowlist de testes é UMA entrada, e ela existe no disco', () => {
    expect(TESTES_AUTORIZADOS).toHaveLength(1)
    expect(ARQUIVOS.map((a) => a.rel)).toContain(TESTES_AUTORIZADOS[0])
  })

  it('metade positiva: o bloco Cliente do pedido e o contato da ficha CHAMAM `whatsappChatUrl`', () => {
    const chama = (rel: string) => ARQUIVOS.find((a) => a.rel === rel)!.linhas.some((l) => /\bwhatsappChatUrl\(/.test(l))
    expect(chama('widgets/order-detail/ui/BlocoCliente.tsx')).toBe(true)
    expect(chama('widgets/customer-detail/ui/ContatoDaCliente.tsx')).toBe(true)
  })
})

describe('sensores — a régua acusa cada forma e não acusa o que não é uso', () => {
  const U = `https://${DOMINIO}/`
  it.each([
    ['interpolação', 'const u = `' + U + '${numero}`'],
    ['concatenação', "const u = '" + U + "' + numero"],
    ['constante', "const BASE = '" + U + "'"],
    ['atributo de JSX', '<a href="' + U + '5551999990000" />'],
  ])('produção: %s é acusada', (_n, codigo) => {
    expect(infracoes(sintetico('widgets/x/ui/X.tsx', false, codigo))).toHaveLength(1)
  })

  it('teste: o valor esperado (linha com `expect(`) e o título do caso passam', () => {
    expect(infracoes(sintetico('a/__tests__/x.test.tsx', true, "expect(a.href).toBe('" + U + "55')"))).toEqual([])
    expect(infracoes(sintetico('a/__tests__/x.test.tsx', true, "it('abre o " + DOMINIO + " em nova aba', () => {"))).toEqual([])
  })

  it('teste: MONTAR a URL (fora de `expect(`) é acusado — interpolação e concatenação', () => {
    expect(infracoes(sintetico('a/__tests__/x.test.tsx', true, 'const esperado = `' + U + '${n}`'))).toHaveLength(1)
    expect(infracoes(sintetico('a/__tests__/x.test.tsx', true, "const esperado = '" + U + "' + n"))).toHaveLength(1)
  })

  it('teste: a allowlist de UM libera o comparador, e outro teste igual seria acusado', () => {
    const montagem = 'const antes = (n) => `' + U + '${n}`'
    expect(infracoes(sintetico(TESTES_AUTORIZADOS[0], true, montagem))).toEqual([])
    expect(infracoes(sintetico('widgets/order-detail/__tests__/Outro.test.tsx', true, montagem))).toHaveLength(1)
  })

  it('a forma em comentário não conta — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(infracoes(sintetico('x.tsx', false, '// ' + U + '\r\nconst a = 1'))).toEqual([])
    expect(infracoes(sintetico('x.tsx', false, '// ' + U + '\nconst a = 1'))).toEqual([])
    expect(infracoes(sintetico('x.tsx', false, '/* ' + U + ' */ const a = 1'))).toEqual([])
    expect(infracoes(sintetico('x.tsx', false, '// varre apps/**\nconst u = "' + U + '"\n/* fim */'))).toHaveLength(1)
  })

  it('o código DEPOIS do comentário continua acusado (CRLF não engole a linha seguinte)', () => {
    expect(infracoes(sintetico('x.tsx', false, "// nota\r\nconst u = '" + U + "'"))).toHaveLength(1)
  })

  it('o `//` do esquema `https:` não é comentário: o literal depois dele é visto', () => {
    expect(infracoes(sintetico('x.tsx', false, "const u = 'https://" + DOMINIO + "/55'"))).toHaveLength(1)
  })

  it('INVERSO: quem chama `whatsappChatUrl` não é acusado', () => {
    expect(infracoes(sintetico('x.tsx', false, 'const href = whatsappChatUrl(cliente.phone)'))).toEqual([])
  })
})
