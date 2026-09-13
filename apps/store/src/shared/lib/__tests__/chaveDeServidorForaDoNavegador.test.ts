import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * A `service_role` NUNCA entra no bundle do navegador — `USR-25`, feature 48.
 *
 * ---------------------------------------------------------------------------------------------
 * Por que este guarda existe, e por que ele é dos mais importantes do repositório
 * ---------------------------------------------------------------------------------------------
 *
 * A chave de serviço do Supabase **ignora toda RLS**. Um `createClient(url, serviceRoleKey)` em
 * `apps/**` funcionaria perfeitamente: a tela abre, a lista carrega, os testes passam, o `tsc`
 * passa, o build passa. E a chave iria inteira no JavaScript servido a **qualquer visitante da
 * loja** — pedidos, endereços, CPF, e o poder de apagar o catálogo.
 *
 * É a propriedade que torna o erro caro: **errar aqui não quebra nada**. Não há sintoma, não há
 * erro no console, não há teste que reprove. A feature 48 acrescentou a primeira tela do projeto que
 * *precisa* de operações de service role — e, com ela, a primeira tentação real de encurtar o
 * caminho, porque a edge function dá trabalho e o client daria certo na hora.
 *
 * A porta é a function `admin-users`, que roda no servidor. Deste lado só existe
 * `supabase.functions.invoke`.
 *
 * ---------------------------------------------------------------------------------------------
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o que procura.
 *
 * Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado. E o escopo é parte da asserção (`L-035`): ele nomeia **um arquivo de cada app**, porque
 * varrer só um dos dois seria allowlist com outro nome.
 *
 * A régua nunca é o objeto medido: o escopo está escrito **literalmente** aqui, e não derivado de
 * constante que o código sob teste exporte — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: as duas pontas que viram JavaScript servido a um navegador. */
const ESCOPO = ['apps']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

/**
 * O fonte **sem os comentários**, uma entrada por linha.
 *
 * Sem isto o guarda casa a prosa que explica o defeito — e o conserto vira "edite o comentário", não
 * "conserte o código". Este arquivo é o exemplo vivo: ele cita `service_role` e `auth.admin.` na
 * explicação acima **dezenas de vezes**, e uma régua ingênua acusaria a si mesma.
 *
 * Molde: `freeShippingSingleOwner.test.ts`, com as três correções que ele carrega.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    // CRLF normalizado PRIMEIRO, e isto é correção, não higiene: em JavaScript `.` não casa `\r`, e
    // num checkout Windows — a plataforma deste projeto — o removedor de linha fica inerte (`L-031`).
    .replace(/\r\n/g, '\n')
    // Linha e bloco na MESMA varredura (`BL-027`). Em duas passadas, um comentário de LINHA que cite
    // um glob de dois asteriscos carrega um abre-bloco dentro de si, e a régua de bloco apaga dali
    // até o próximo fecha-bloco — **inclusive código**. Num guarda cuja asserção é uma AUSÊNCIA, o
    // efeito é aprovar em silêncio o que estiver lá dentro.
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap(d => arquivos(join(ROOT, d))).map(caminho => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

/** Só o que a loja e o painel de fato executam — teste pode nomear o que quiser. */
const producao = varridos.filter(a => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (regua: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] =>
  alvo.flatMap(a =>
    a.linhas.flatMap((texto, i) =>
      regua.test(texto) ? [{ arquivo: a.rel, linha: i + 1, texto: texto.trim() }] : [],
    ),
  )

// -------------------------------------------------------------------------------------------
// As réguas, como predicados — para poderem ser exercidas contra texto mutado
// -------------------------------------------------------------------------------------------

/** O nome da env. Achá-lo em `apps/**` significa que alguém tentou lê-la no navegador. */
const REGUA_ENV = /SUPABASE_SERVICE_ROLE_KEY/

/**
 * A string `service_role` em qualquer forma — env, nome de variável, header, comentário de JSON.
 *
 * Deliberadamente ampla: não há **nenhum** uso legítimo dela do lado do navegador, então o custo de
 * um falso positivo é zero e o de um falso negativo é o banco inteiro.
 */
const REGUA_STRING = /service_role/i

/**
 * `auth.admin.` — a superfície de administração do GoTrue.
 *
 * Ela **só** funciona com a chave de serviço: chamada com a publicável, o GoTrue responde 403. Uma
 * ocorrência aqui é, na melhor hipótese, código morto que anuncia a intenção errada; na pior, o
 * companheiro de uma chave que vazou.
 */
const REGUA_ADMIN_API = /\bauth\s*\.\s*admin\s*\./

/**
 * O único arquivo isento, escrito LITERALMENTE.
 *
 * Ele é este — o guarda precisa carregar as três formas proibidas nos sensores, senão não haveria
 * como provar que as réguas enxergam alguma coisa. Derivar este caminho de `import.meta.url` faria a
 * régua ser o objeto medido: um arquivo renomeado se auto-isentaria em silêncio.
 */
const ESTE_ARQUIVO = 'apps/store/src/shared/lib/__tests__/chaveDeServidorForaDoNavegador.test.ts'

/** Montada por concatenação para que o sensor exerça a régua sem depender do literal inteiro. */
const ENV_PROIBIDA = `SUPABASE_${'SERVICE'}_ROLE_KEY`

describe('a chave de servidor fora do navegador — âncora dupla', () => {
  it('a varredura leu os arquivos dos DOIS apps', () => {
    // Primeira âncora. Um caminho errado varreria zero arquivo e TODAS as asserções de ausência
    // abaixo passariam — a pior falha possível num teste deste tipo.
    expect(varridos.length).toBeGreaterThan(300)
    expect(producao.length).toBeGreaterThan(200)
  })

  it('o escopo alcança a loja E o painel, nomeando um arquivo de cada (L-035)', () => {
    // Segunda âncora, e ela é sobre o ESCOPO: varrer só um dos dois apps seria allowlist com outro
    // nome — e foi exatamente assim que `menuSurfaceSingleOwner` deixou a edge function de fora.
    const rels = producao.map(a => a.rel)
    expect(rels).toContain('apps/store/src/app/App.tsx')
    expect(rels).toContain('apps/backoffice/src/app/App.tsx')
  })

  it('a régua de fato ENCONTRA a porta legítima — o extrator funciona', () => {
    // Terceira âncora: prova que a varredura lê código de verdade, e não linhas vazias. Se
    // `functions.invoke` sumisse daqui, as ausências abaixo estariam medindo o nada.
    const invocacoes = procurar(/functions\s*\.\s*invoke\s*\(\s*['"`]admin-users/)
    expect(invocacoes.length).toBeGreaterThan(0)
    expect(invocacoes.map(o => o.arquivo)).toContain(
      'apps/backoffice/src/features/admin-users/api/useAdminUsers.ts',
    )
  })
})

describe('a chave de servidor fora do navegador — as três ausências', () => {
  it('nenhum arquivo de `apps/**` nomeia `SUPABASE_SERVICE_ROLE_KEY`', () => {
    expect(procurar(REGUA_ENV)).toEqual([])
  })

  it('nenhum arquivo de `apps/**` carrega a string `service_role`', () => {
    expect(procurar(REGUA_STRING)).toEqual([])
  })

  it('nenhum arquivo de `apps/**` chama `auth.admin.*`', () => {
    // Ela só funciona com a chave de serviço — com a publicável, o GoTrue responde 403. A porta é a
    // edge function `admin-users`.
    expect(procurar(REGUA_ADMIN_API)).toEqual([])
  })

  it('a CHAVE e a API de admin são proibidas em teste também — um mock não é desculpa', () => {
    // O caminho pelo qual a chave entraria "sem risco" e depois migraria para produção num
    // copiar-colar. O escopo aqui é o conjunto INTEIRO, não só produção.
    //
    // **A régua ampla de `service_role` NÃO entra neste caso, e o recorte é deliberado**: guarda de
    // migration precisa nomear a string para conferir um `grant ... to service_role` no `.sql` —
    // `orderNotificationsSchema.test.ts` faz exatamente isso, e está certo. Proibir a PALAVRA em
    // teste obrigaria aquele guarda a medir o `grant` sem poder escrevê-lo. O que não pode existir em
    // lugar nenhum é a CHAVE (a env) e a API que só ela abre.
    //
    // **Um único arquivo é exceção: este.** Ele precisa carregar as formas proibidas nos sensores
    // abaixo — senão não haveria como provar que as réguas enxergam alguma coisa, e o guarda viraria
    // um no-op verde. O allowlist tem exatamente um item, escrito LITERALMENTE (a régua nunca pode
    // ser derivada do objeto medido), e o caso seguinte prova que ele é uma exceção de um.
    const exceto = (o: Ocorrencia) => o.arquivo !== ESTE_ARQUIVO

    expect(procurar(REGUA_ENV, varridos).filter(exceto)).toEqual([])
    expect(procurar(REGUA_ADMIN_API, varridos).filter(exceto)).toEqual([])
  })

  it('o guarda de migration PODE nomear `service_role` — ele confere um `grant` em SQL', () => {
    // O par que documenta o recorte acima. Sem ele, alguém "endureceria" a régua no futuro e
    // quebraria um guarda legítimo, com a sensação de estar melhorando a segurança.
    const emTeste = procurar(REGUA_STRING, varridos).filter(o => o.arquivo !== ESTE_ARQUIVO)

    expect(emTeste.length).toBeGreaterThan(0)
    expect(emTeste.every(o => eTeste(o.arquivo))).toBe(true)
    expect(emTeste.map(o => o.arquivo)).toContain(
      'apps/store/src/shared/lib/__tests__/orderNotificationsSchema.test.ts',
    )
  })

  it('o allowlist é de UM — outro arquivo de teste com a chave SERIA acusado', () => {
    // Sem este par, um filtro largo demais (por exemplo, isentando todo `__tests__/`) passaria no
    // caso acima e deixaria a chave entrar por qualquer arquivo de teste do repositório.
    const outroTeste: Arquivo[] = [
      {
        rel: 'apps/backoffice/src/features/admin-users/api/useAdminUsers.test.ts',
        linhas: semComentarios(`const k = import.meta.env.${ENV_PROIBIDA}\n`),
      },
    ]
    const acusado = procurar(REGUA_ENV, outroTeste).filter(o => o.arquivo !== ESTE_ARQUIVO)

    expect(acusado).toHaveLength(1)
    expect(acusado[0].arquivo).toBe(
      'apps/backoffice/src/features/admin-users/api/useAdminUsers.test.ts',
    )
  })

  it('o arquivo do allowlist EXISTE mesmo — o caminho não envelheceu', () => {
    // Um allowlist que aponta para um arquivo inexistente isenta ninguém e parece saudável. Esta é a
    // âncora dele.
    expect(varridos.map(a => a.rel)).toContain(ESTE_ARQUIVO)
  })
})

// -------------------------------------------------------------------------------------------
// Sensores — um POR FORMA, nunca um bloco só
//
// Sem eles, uma régua que nunca casa nada é indistinguível de uma que funciona. As formas abaixo são
// as que alguém escreveria de verdade ao "resolver rápido" a criação de um usuário.
// -------------------------------------------------------------------------------------------

const arquivoFalso = (fonte: string): Arquivo[] => [
  { rel: 'apps/backoffice/src/inventado.ts', linhas: semComentarios(fonte) },
]

describe('a chave de servidor fora do navegador — os sensores', () => {
  it('SENSOR — a régua da env ACUSA uma leitura no navegador', () => {
    const doente = arquivoFalso(
      'const chave = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY\n',
    )
    expect(procurar(REGUA_ENV, doente)).toHaveLength(1)
  })

  it('SENSOR — a régua da string ACUSA a chave em um header', () => {
    const doente = arquivoFalso("const headers = { apikey: SERVICE_ROLE, role: 'service_role' }\n")
    expect(procurar(REGUA_STRING, doente)).toHaveLength(1)
  })

  it('SENSOR — a régua da string ACUSA caixa diferente', () => {
    const doente = arquivoFalso('const k = SERVICE_ROLE_KEY\n')
    expect(procurar(REGUA_STRING, doente)).toHaveLength(1)
  })

  it.each([
    ['direto', 'await supabase.auth.admin.createUser({ email })\n'],
    ['com espaço', 'await supabase.auth . admin . deleteUser(id)\n'],
    ['numa variável', 'const api = client.auth.admin.listUsers\n'],
  ])('SENSOR — a régua de `auth.admin` ACUSA a forma %s', (_rotulo, fonte) => {
    expect(procurar(REGUA_ADMIN_API, arquivoFalso(fonte))).toHaveLength(1)
  })

  it('SENSOR INVERSO — `functions.invoke` NÃO é acusado', () => {
    // O par que impede o guarda de proibir o uso que ele existe para proteger. Sem ele, uma régua
    // ampla demais seria "consertada" desligando a chamada legítima.
    const saudavel = arquivoFalso(
      "await supabase.functions.invoke('admin-users?action=create', { body })\n",
    )
    expect(procurar(REGUA_ENV, saudavel)).toEqual([])
    expect(procurar(REGUA_STRING, saudavel)).toEqual([])
    expect(procurar(REGUA_ADMIN_API, saudavel)).toEqual([])
  })

  it('SENSOR INVERSO — `supabase.auth.getUser` e `signInWithPassword` NÃO são acusados', () => {
    // A superfície de auth do PRÓPRIO usuário é legítima no navegador, e é o que `changeOwnPassword`
    // usa. Uma régua de `auth.` genérica derrubaria o login inteiro.
    const saudavel = arquivoFalso(
      'await supabase.auth.getUser()\nawait supabase.auth.signInWithPassword({ email, password })\nawait supabase.auth.updateUser({ password })\n',
    )
    expect(procurar(REGUA_ADMIN_API, saudavel)).toEqual([])
  })

  it('SENSOR — comentário de LINHA não é acusado, com CRLF e com LF (L-031)', () => {
    // Este arquivo cita as três formas proibidas na própria explicação. Sem o removedor, o guarda
    // acusaria a si mesmo — e o conserto "óbvio" seria apagar a prosa que diz por que ele existe.
    const crlf = arquivoFalso('const a = 1\r\n// service_role aqui\r\nconst b = 2\r\n')
    const lf = arquivoFalso('const a = 1\n// auth.admin.createUser aqui\nconst b = 2\n')

    expect(procurar(REGUA_STRING, crlf)).toEqual([])
    expect(procurar(REGUA_ADMIN_API, lf)).toEqual([])
  })

  it('SENSOR — comentário de BLOCO não é acusado', () => {
    const bloco = arquivoFalso('const a = 1\r\n/**\r\n * SUPABASE_SERVICE_ROLE_KEY\r\n */\r\nconst b = 2\r\n')
    expect(procurar(REGUA_ENV, bloco)).toEqual([])
  })

  it('SENSOR — o glob de dois asteriscos num comentário NÃO cega a varredura (BL-027)', () => {
    // O ponto cego que o removedor de duas passadas tinha: um comentário de LINHA que cite um glob
    // carrega um abre-bloco, e a régua de bloco apagaria dali até o próximo fecha-bloco —
    // **inclusive o código proibido logo abaixo**.
    const glob = '/' + '**'
    const doente = arquivoFalso(
      `// varre ${glob} inteiro\nconst k = import.meta.env.SUPABASE_SERVICE_ROLE_KEY\n`,
    )
    expect(procurar(REGUA_ENV, doente)).toHaveLength(1)
  })

  it('SENSOR — o removedor PRESERVA o número da linha', () => {
    // Sem preservar as quebras, o guarda apontaria `arquivo:linha` errado, e quem fosse consertar
    // olharia para outro lugar.
    const doente = arquivoFalso('const a = 1\n// nada\nconst k = SERVICE_ROLE\n')
    expect(procurar(REGUA_STRING, doente)[0].linha).toBe(3)
  })
})
