import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * Onde se paga um pedido — `PIX-P3-04`, feature `58`.
 *
 * ---------------------------------------------------------------------------------------------
 * O que este guarda existe para impedir
 * ---------------------------------------------------------------------------------------------
 *
 * Até esta feature a loja tinha **duas** superfícies montando o mesmo pagamento PIX: o bloco 3 do
 * acordeão do checkout e um diálogo dentro de `/conta`. As duas montavam o mesmo componente com
 * props diferentes, e a de `/conta` já nascia errada — sem `amount`, então o valor em destaque
 * (`CNF-01`) simplesmente não aparecia para quem voltava a pagar. Nenhuma das duas derruba build,
 * `tsc` ou teste de componente: elas renderizam, cada uma do seu jeito, e quem descobre é a cliente
 * na hora de pagar.
 *
 * Hoje a superfície tem endereço (`/pedido/:id/pagamento`) e um dono
 * (`features/order-payment`). Este guarda recusa a volta por três caminhos, que são as três formas
 * pelas quais uma segunda superfície nasceria:
 *
 *   1. **desenhar o QR** em outro lugar (o desenho vem de `qrcode.react`);
 *   2. **pedir um código PIX** ao `create-payment` de outro lugar;
 *   3. **o arquivo apagado voltar** ao disco ou ao barrel.
 *
 * ---------------------------------------------------------------------------------------------
 * A METADE POSITIVA, e por que ela não é opcional
 * ---------------------------------------------------------------------------------------------
 *
 * Uma regra de ausência sobrevive à feature medindo o nada: apagar o dono inteiro deixaria as três
 * negativas **verdadeiras e vazias**. É o modo de falha que `originZipNotRead` teve na `55` — o
 * arquivo medido mudou de nome, a ausência passou por falta de assunto, e quem reprovou foi a
 * asserção positiva ao lado. Por isso o dono é cobrado por nome, e `/conta` é cobrada por LINKAR.
 *
 * ---------------------------------------------------------------------------------------------
 * ÂNCORA DUPLA — arquivos lidos **e** a forma encontrada
 * ---------------------------------------------------------------------------------------------
 *
 * Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. O escopo está escrito **literalmente** aqui, nunca derivado de constante que o código sob
 * teste exporte — a régua não pode ser o objeto medido (lição da `fieldBorder`).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: a loja inteira. O painel não paga nada, e as functions não desenham tela. */
const ESCOPO = 'apps/store/src'

/** O dono, escrito literalmente. Tudo dentro dele pode desenhar e pedir PIX. */
const DONO = 'apps/store/src/features/order-payment/'

/** O arquivo que a feature `58` apagou. Ele tinha DOIS consumidores, e é por isso que voltaria. */
const APAGADO = 'apps/store/src/features/checkout/ui/PixPayment.tsx'

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

/**
 * O fonte **sem os comentários**.
 *
 * Sem isto a régua casa a prosa que explica o defeito, e o conserto vira "edite o comentário" em
 * vez de "conserte o código" — aconteceu duas vezes neste repositório, com dois arquivos escritos
 * para impedir o defeito que reintroduziram. Este arquivo é o exemplo vivo: a explicação acima
 * nomeia a biblioteca do QR de propósito.
 */
const semComentarios = (fonte: string): string =>
  fonte
    // CRLF normalizado PRIMEIRO: em JavaScript `.` não casa `\r`, e num checkout Windows — a
    // plataforma deste projeto — o removedor de linha ficaria inerte (`L-031`).
    .replace(/\r\n/g, '\n')
    // Linha e bloco na MESMA varredura (`BL-027`). Em duas passadas, um comentário de LINHA que
    // cite um glob de dois asteriscos carrega um abre-bloco dentro de si, e a régua de bloco apaga
    // dali até o próximo fecha-bloco — inclusive CÓDIGO. Num guarda cuja asserção é uma ausência,
    // o efeito é aprovar em silêncio o que estiver lá dentro.
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))

interface Arquivo {
  rel: string
  fonte: string
}

const varridos: Arquivo[] = arquivos(join(ROOT, ESCOPO)).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  fonte: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Allowlist de UM: este próprio arquivo, que precisa carregar as formas proibidas nos sensores. */
const ALLOWLIST = ['apps/store/src/shared/lib/__tests__/pagamentoComDonoUnico.test.ts']

const ehTeste = (rel: string) => rel.includes('/__tests__/') || /\.test\.tsx?$/.test(rel)

/** Fora do dono e fora da allowlist — o conjunto que as réguas medem. */
const medidos = varridos.filter(a => !a.rel.startsWith(DONO) && !ALLOWLIST.includes(a.rel))

/**
 * Só produção, para a régua do pedido de código.
 *
 * **O recorte é declarado, não escondido.** A forma que ela procura é a do *payload* de
 * `create-payment`, e um teste legitimamente escreve esse payload para asserir sobre ele: o teste
 * da própria porta (`useCreatePayment`) e o dublê que ocupa o lugar da rota nova em
 * `CheckoutPage.test.tsx` fazem exatamente isso. Um guarda que nascesse acusando os dois seria um
 * guarda que alguém desliga — e nenhum arquivo de teste ENTREGA superfície de pagamento a cliente
 * nenhuma, que é o que este guarda existe para impedir. A régua do QR, abaixo, continua valendo
 * para o repositório inteiro.
 */
const producao = medidos.filter(a => !ehTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  trecho: string
}

const procurar = (regua: RegExp, alvo: Arquivo[]): Ocorrencia[] =>
  alvo.flatMap(a => {
    const achado = a.fonte.match(regua)
    return achado ? [{ arquivo: a.rel, trecho: achado[0].slice(0, 80) }] : []
  })

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — uma por FORMA (`L-033`)
// -------------------------------------------------------------------------------------------

/**
 * **Desenhar o QR**: importar a biblioteca que o desenha.
 *
 * A régua é o `from`, e não o nome do componente, porque um teste que **dubla** a biblioteca cita o
 * nome dela sem importar nada — acusá-lo proibiria justamente a forma de testar a tela do dono.
 */
const REGUA_QR = /from\s*['"]qrcode\.react['"]/

/**
 * **Pedir um código PIX** ao `create-payment`.
 *
 * O corpo do dono é escrito em várias linhas (é o que o Prettier produz sozinho), então a régua é
 * sobre o arquivo inteiro e não por linha. A janela de 160 caracteres é o que separa "este objeto
 * pede um PIX para este pedido" de duas ocorrências soltas em pontas opostas de um arquivo.
 *
 * O recorte é por **token exato** dos dois lados: sem o `(?<![-\w])` à esquerda, `payment_method:
 * 'pix'` — que toda fixture de pedido carrega — cairia junto (`L-034`).
 *
 * E o fecho (`[,}\)]` depois do literal) é o que separa **chamar** a porta de **declarar** a porta:
 * `useCreatePayment` define `order_id: string` e `method: 'pix' | 'card'` no próprio tipo, e sem o
 * fecho o guarda nasceria acusando o arquivo que É a porta — a régua medindo a si mesma. Achado na
 * primeira execução.
 */
const REGUA_PEDIDO_DE_PIX =
  /(?<![-\w])order_id(?![-\w])[\s\S]{0,160}?(?<![-\w])method\s*:\s*(['"`])pix\1\s*[,})]/

/** O formato antigo, para o caso de o arquivo apagado voltar por outro nome. */
const REGUA_COMPONENTE_APAGADO = /(?<![-\w])PixPayment(?![-\w])/

/**
 * **O ENDEREÇO da rota, montado à mão** — a quarta forma, e a que a `58` entregou já quebrada.
 *
 * `orderPaymentPath` é declarado, no próprio arquivo, como *"o endereço da superfície de pagamento
 * de um pedido — montado num lugar só"*. `/conta` e `/pedido/:id` o chamavam; o **checkout**
 * escrevia o caminho à mão. Medido na verificação independente: renomeando a rota nas três pontas
 * declaradas (`App.tsx`, `routes.ts` e o dono), quem reprovava eram os literais de duas suítes — e
 * `CheckoutPage.test.tsx` **passava**, porque ele declara a própria `<Route>` dentro do arquivo de
 * teste. Consertados aqueles dois literais (o reflexo natural), o checkout passava a navegar para
 * uma URL que não existe **com a suíte inteira verde**.
 *
 * A régua procura o endereço com o id **interpolado** ou **concatenado**, que é o que distingue
 * *montar* de *declarar*: a rota em `App.tsx` é `path="/pedido/:id/pagamento"`, um literal sem
 * expressão nenhuma, e continua legítima. É o mesmo recorte que separa chamar de declarar na régua
 * do pedido de PIX, acima.
 */
const REGUA_ENDERECO_A_MAO = new RegExp(
  // template literal: `/pedido/${…}/pagamento`
  '`/pedido/\\$\\{[^}]*\\}/pagamento' +
    // concatenação: '/pedido/' + id + '/pagamento'
    "|['\"]/pedido/['\"]\\s*\\+|\\+\\s*['\"]/pagamento['\"]",
)

/** O único arquivo que pode montar o endereço: o dono declarado dele. */
const DONO_DO_ENDERECO = 'apps/store/src/entities/order/lib/podePagarComPix.ts'

const cita = (rel: string): Arquivo => {
  const achado = varridos.find(a => a.rel === rel)
  // Um caminho que mudou de nome faria a asserção positiva passar por ausência de assunto — que é
  // exatamente como `originZipNotRead` sobreviveu à feature `55` medindo o nada.
  if (!achado) throw new Error(`arquivo fora da varredura: ${rel}`)
  return achado
}

// -------------------------------------------------------------------------------------------

describe('o pagamento com dono único — âncoras da varredura', () => {
  it('a varredura leu a loja inteira, e alcança as telas que já montaram pagamento', () => {
    // Sem esta âncora, um caminho errado varreria zero arquivo e as asserções de ausência abaixo
    // passariam em silêncio — a pior falha possível num teste que lê disco.
    expect(varridos.length).toBeGreaterThan(300)
    expect(varridos.map(a => a.rel)).toEqual(
      expect.arrayContaining([
        'apps/store/src/pages/AccountPage.tsx',
        'apps/store/src/pages/CheckoutPage.tsx',
        'apps/store/src/features/checkout/ui/PaymentBlock.tsx',
        'apps/store/src/features/order-payment/ui/PixSurface.tsx',
      ]),
    )
    // E o recorte de produção precisa continuar tendo massa: se ele virasse vazio, a régua do
    // pedido de código passaria por ausência de assunto.
    expect(producao.length).toBeGreaterThan(200)
  })

  it('as três réguas encontram a forma que procuram — âncora de contagem', () => {
    // A segunda metade da âncora dupla, medida **no dono**: uma régua que não achasse nada em lugar
    // nenhum seria indistinguível de uma régua quebrada.
    expect(REGUA_QR.test(cita('apps/store/src/features/order-payment/ui/PixSurface.tsx').fonte)).toBe(
      true,
    )
    expect(
      REGUA_PEDIDO_DE_PIX.test(
        cita('apps/store/src/features/order-payment/model/usePixPayment.ts').fonte,
      ),
    ).toBe(true)
    expect(REGUA_ENDERECO_A_MAO.test(cita(DONO_DO_ENDERECO).fonte)).toBe(true)
  })
})

describe('só o dono desenha o QR e pede o código (PIX-P3-04)', () => {
  it('nenhum arquivo fora de `features/order-payment` importa a biblioteca do QR', () => {
    expect(procurar(REGUA_QR, medidos)).toEqual([])
  })

  it('nenhum arquivo de produção fora do dono pede um código PIX ao `create-payment`', () => {
    expect(procurar(REGUA_PEDIDO_DE_PIX, producao)).toEqual([])
  })

  it('ninguém MONTA o endereço da rota à mão — ele tem um dono declarado', () => {
    const fora = procurar(
      REGUA_ENDERECO_A_MAO,
      medidos.filter(a => a.rel !== DONO_DO_ENDERECO),
    )

    expect(fora).toEqual([])
  })

  it('o componente apagado não voltou ao disco nem ao barrel', () => {
    expect(existsSync(join(ROOT, APAGADO))).toBe(false)
    expect(
      REGUA_COMPONENTE_APAGADO.test(cita('apps/store/src/features/checkout/index.ts').fonte),
    ).toBe(false)
    expect(procurar(REGUA_COMPONENTE_APAGADO, producao)).toEqual([])
  })
})

describe('sensores — a régua acusa o defeito e não acusa o conserto', () => {
  it('a importação do QR é acusada; o dublê que só cita o nome, não', () => {
    expect(REGUA_QR.test("import { QRCodeSVG } from 'qrcode.react'")).toBe(true)
    expect(REGUA_QR.test('import { QRCodeSVG } from "qrcode.react"')).toBe(true)
    // Sem este par, testar a tela do dono passaria a ser impossível sem reprovar o guarda.
    expect(REGUA_QR.test("vi.mock('qrcode.react', () => ({ QRCodeSVG: Fake }))")).toBe(false)
  })

  it('o pedido de código é acusado nas duas formas de escrever o objeto', () => {
    expect(REGUA_PEDIDO_DE_PIX.test("mutateAsync({ order_id: id, method: 'pix' })")).toBe(true)
    expect(
      REGUA_PEDIDO_DE_PIX.test(
        ['const r = await mutate({', '  order_id: orderId,', "  method: 'pix',", '})'].join('\n'),
      ),
    ).toBe(true)
  })

  it('sensor inverso — a fixture de um pedido NÃO é acusada', () => {
    // `payment_method: 'pix'` é o que toda fixture de pedido carrega, e o recorte à esquerda por
    // token exato é o que a mantém de fora (`L-034`). Sem este par, o guarda nasceria acusando
    // meia dúzia de arquivos legítimos.
    expect(
      REGUA_PEDIDO_DE_PIX.test("const o = { id: 'ord-1', payment_method: 'pix', total: 46.55 }"),
    ).toBe(false)
    expect(REGUA_PEDIDO_DE_PIX.test("setPayment({ method: 'pix' })")).toBe(false)
    expect(REGUA_PEDIDO_DE_PIX.test("const p = { order_id: 'o1', method: 'card' }")).toBe(false)
  })

  it('sensor inverso — DECLARAR a porta não é CHAMAR a porta', () => {
    // A primeira escrita desta régua acusava `useCreatePayment.ts`, que é a porta compartilhada
    // pelos dois métodos: o tipo dela nomeia `order_id` e `method: 'pix' | 'card'`. Um guarda que
    // reprova o arquivo que ele existe para proteger é um guarda que alguém desliga.
    const tipo = ['interface Entrada {', '  order_id: string', "  method: 'pix' | 'card'", '}'].join(
      '\n',
    )
    expect(REGUA_PEDIDO_DE_PIX.test(tipo)).toBe(false)
    // E a chamada de verdade, no mesmo formato de várias linhas, continua acusada.
    expect(
      REGUA_PEDIDO_DE_PIX.test(
        ['await mutate({', '  order_id: orderId,', "  method: 'pix',", '})'].join('\n'),
      ),
    ).toBe(true)
  })

  it('sensor inverso — o cartão continua podendo cobrar do checkout', () => {
    // O caminho do cartão chama o MESMO `create-payment` e não pode ser acusado: ele não desenha
    // QR nenhum, e a superfície dele é o Brick, que precisa continuar no checkout (`PGM-08`).
    expect(
      REGUA_PEDIDO_DE_PIX.test("createPayment.mutateAsync({ order_id: id, method: 'card', card })"),
    ).toBe(false)
  })

  it('o endereço montado à mão é acusado nas duas formas de juntar', () => {
    expect(REGUA_ENDERECO_A_MAO.test('navigate(`/pedido/${payingOrderId}/pagamento`)')).toBe(true)
    expect(REGUA_ENDERECO_A_MAO.test("navigate('/pedido/' + id + '/pagamento')")).toBe(true)
  })

  it('sensor inverso — DECLARAR a rota e navegar pelo dono NÃO são acusados', () => {
    // `App.tsx` declara `path="/pedido/:id/pagamento"`, e o teste do checkout declara a mesma rota
    // de destino: são literais sem expressão, e um guarda que os acusasse nasceria reprovando a
    // declaração da própria rota — guarda que alguém desliga.
    expect(REGUA_ENDERECO_A_MAO.test('<Route path="/pedido/:id/pagamento" element={<X />} />')).toBe(
      false,
    )
    expect(REGUA_ENDERECO_A_MAO.test("montar('/pedido/ord-1/pagamento')")).toBe(false)
    expect(REGUA_ENDERECO_A_MAO.test('navigate(orderPaymentPath(payingOrderId))')).toBe(false)
    expect(REGUA_ENDERECO_A_MAO.test("to={orderPaymentPath(order.id)}")).toBe(false)
  })

  it('a janela da régua não junta duas ocorrências distantes', () => {
    const longe = ["const a = { order_id: 'o1' }", 'x'.repeat(200), "const b = { method: 'pix' }"].join(
      '\n',
    )
    expect(REGUA_PEDIDO_DE_PIX.test(longe)).toBe(false)
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada, o USO é', () => {
    const acusa = (fonte: string) => REGUA_QR.test(semComentarios(fonte))

    expect(acusa("// antes vinha de 'qrcode.react' aqui\nconst x = 1")).toBe(false)
    expect(acusa("/* era `from 'qrcode.react'` */\r\nconst x = 1")).toBe(false)
    // CRLF e LF, o mesmo uso, os dois acusados.
    expect(acusa("// nota\r\nimport { QRCodeSVG } from 'qrcode.react'")).toBe(true)
    expect(acusa("// nota\nimport { QRCodeSVG } from 'qrcode.react'")).toBe(true)
  })

  it('sensor do glob de dois asteriscos — o comentário de linha não cega a varredura', () => {
    // `BL-027`: em duas passadas, um comentário de linha citando um glob terminado em dois
    // asteriscos carrega um abre-bloco, e a régua de bloco apagaria daí até o próximo fecha-bloco —
    // inclusive o código que vem depois. Aqui a passada é uma só.
    const fonte = [
      '// varre apps/store/** e para por aqui',
      "import { QRCodeSVG } from 'qrcode.react'",
      '/* um bloco de verdade, mais abaixo */',
      'const u = 2',
    ].join('\n')

    expect(REGUA_QR.test(semComentarios(fonte))).toBe(true)
  })

  it('a allowlist tem UM arquivo, e outro arquivo SERIA acusado', () => {
    // Sem esta prova, "o guarda é isento" viraria a porta por onde a forma volta ao repositório.
    expect(ALLOWLIST).toHaveLength(1)

    const outro: Arquivo = {
      rel: 'apps/store/src/pages/QualquerPagina.tsx',
      fonte: "import { QRCodeSVG } from 'qrcode.react'",
    }
    expect(procurar(REGUA_QR, [outro])).toHaveLength(1)
  })

  it('sensor — um arquivo fora da varredura derruba a régua em vez de passar', () => {
    expect(() => cita('apps/store/src/pages/PaginaQueNaoExiste.tsx')).toThrow(/fora da varredura/)
  })
})

describe('a metade positiva — o dono continua sendo o dono', () => {
  it('a máquina do dono é quem chama a porta do pagamento', () => {
    const maquina = cita('apps/store/src/features/order-payment/model/usePixPayment.ts')
    expect(/useCreatePayment/.test(maquina.fonte)).toBe(true)
  })

  it('a tela do dono é quem desenha o QR', () => {
    expect(REGUA_QR.test(cita('apps/store/src/features/order-payment/ui/PixSurface.tsx').fonte)).toBe(
      true,
    )
  })

  it('`/conta` LINKA para a rota do pagamento em vez de montar uma superfície', () => {
    // A ausência sozinha seria verdadeira com a ação apagada da tela: quem saiu do PIX sem pagar
    // voltaria a não ter caminho nenhum, que é o estado anterior a esta feature.
    const conta = cita('apps/store/src/pages/AccountPage.tsx')
    expect(/orderPaymentPath\s*\(/.test(conta.fonte)).toBe(true)
    expect(REGUA_QR.test(conta.fonte)).toBe(false)
  })

  it('`/pedido/:id` LINKA para a rota do pagamento quando o pedido ainda pode ser pago', () => {
    const confirmacao = cita('apps/store/src/pages/OrderConfirmationPage.tsx')
    expect(/orderPaymentPath\s*\(/.test(confirmacao.fonte)).toBe(true)
    expect(/podePagarComPix\s*\(/.test(confirmacao.fonte)).toBe(true)
  })

  it('o CHECKOUT entrega o bastão pelo mesmo dono — ele é o terceiro consumidor', () => {
    // A ausência sozinha (a régua acima) seria verdadeira com a navegação apagada do checkout: o
    // PIX deixaria de ter para onde ir, e nenhuma régua de "ninguém monta à mão" notaria. É a
    // mesma metade positiva que `originZipNotRead` só ganhou depois de sobreviver a uma feature
    // inteira medindo o nada.
    const checkout = cita('apps/store/src/pages/CheckoutPage.tsx')
    expect(/orderPaymentPath\s*\(/.test(checkout.fonte)).toBe(true)
  })
})
