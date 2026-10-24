// Feature `75` · T27 — a frase de uma ação mora em `core` (design §8.4, Q10; `MAA-29`, A11, `AD-008`).
//
// O app nunca promete e-mail por conta própria nem escreve a frase de falha ou de corrida: quem decide
// é `actionConfirmation` e as constantes de `packages/core/src/orders/appAction.ts`. Uma segunda escrita
// no app divergiria do painel e da regra de A11 — "o e-mail saiu" dito sem `sent === true` — sem nada
// quebrar: build, `tsc` e teste de componente passam com as duas cópias discordando (o "defeito 01").
//
// **A régua**: nenhum LITERAL de produção de `apps/mobile-adm/src` — string, template (cada pedaço) ou
// texto de JSX — contém uma das cinco formas proibidas: o começo da frase de falha de gravação; a
// promessa de envio pelo correio eletrônico; o nome do aviso que a postagem dispara; o miolo da frase de
// corrida ("o pedido … enquanto você olhava"); e o título da confirmação do rastreio. As cinco moram na
// constante `FORMAS`, abaixo — este cabeçalho as DESCREVE e não as escreve (regra dos guardas no
// `CLAUDE.md` da raiz: a prosa que explica o defeito não pode reintroduzi-lo).
//
// **Sem allowlist.** Pela AST do TypeScript: comentário não é literal, então a prosa que cita uma forma
// (`//`, `/* */`, o glob de dois asteriscos) não é acusada por construção.
//
// **O que NÃO é acusado** (inversos): a frase de "acesso não conferido" (`ACCESS_UNCHECKED`, de
// `core/auth`) começa igual à de falha, mas a forma casa a frase de falha INTEIRA até o verbo "salvar";
// e o rótulo "E-mail" do bloco Cliente — só a promessa ("por" + "e-mail") é forma proibida.
//
// **Âncoras**: (1) os arquivos lidos, com os seis componentes da `75` nomeados; (2) a positiva — as cinco
// formas EXISTEM em `appAction.ts` de `core`, lido do disco: sem ela a ausência no app seria verdadeira
// sobre o nada (uma forma escrita errado aqui nunca casaria com nada).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DONO = resolve(SRC, '../../../packages/core/src/orders/appAction.ts')

/** As cinco formas proibidas no app. Só aqui, e em `core`. */
const FORMAS = ['Não consegui salvar', 'por e-mail', 'aviso de postagem', 'mudou enquanto', 'Rastreio salvo'] as const

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const fonteDe = (rel: string, texto: string) =>
  ts.createSourceFile(rel, texto.replace(/\r\n?/g, '\n'), ts.ScriptTarget.Latest, true, rel.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.TSX)

/** Todo literal do arquivo: string, template (cada pedaço) e texto de JSX. */
const literais = (fonte: ts.SourceFile): { texto: string; linha: number }[] => {
  const achados: { texto: string; linha: number }[] = []
  const visitar = (no: ts.Node) => {
    if (
      ts.isStringLiteral(no) ||
      ts.isNoSubstitutionTemplateLiteral(no) ||
      ts.isTemplateHead(no) ||
      ts.isTemplateMiddle(no) ||
      ts.isTemplateTail(no) ||
      ts.isJsxText(no)
    ) {
      achados.push({ texto: no.text, linha: fonte.getLineAndCharacterOfPosition(no.getStart()).line + 1 })
    }
    ts.forEachChild(no, visitar)
  }
  visitar(fonte)
  return achados
}

const acusar = (rel: string, texto: string): string[] =>
  literais(fonteDe(rel, texto)).flatMap(({ texto: t, linha }) =>
    FORMAS.filter((f) => t.includes(f)).map((f) => `${rel}:${linha} «${f}»`),
  )

const PRODUCAO = arquivos(SRC).map((c) => ({ rel: relative(SRC, c).split('\\').join('/'), texto: readFileSync(c, 'utf8') }))

/** Muda o texto e LANÇA se o alvo não estiver lá — a mutação que vira no-op não prova nada. */
const mutar = (texto: string, de: string, para: string): string => {
  if (!texto.includes(de)) throw new Error(`mutar: alvo não encontrado: ${de}`)
  return texto.replace(de, para)
}

describe('a frase da ação mora em `core` (§8.4, `AD-008`)', () => {
  it('ÂNCORA: a varredura lê o app de produção, inclusive os seis componentes da `75`', () => {
    expect(PRODUCAO.length).toBeGreaterThanOrEqual(100)
    const rels = PRODUCAO.map((a) => a.rel)
    for (const r of [
      'features/order-actions/ui/AvisoDaAcao.tsx',
      'features/order-actions/ui/BotaoDaAcao.tsx',
      'features/order-actions/ui/EditarRastreio.tsx',
      'features/order-actions/ui/FolhaDoRastreio.tsx',
      'features/order-actions/ui/LembreteDoEnvio.tsx',
      'features/order-actions/ui/RodapeDaAcao.tsx',
      'features/order-actions/model/useAcaoDoPedido.ts',
      'pages/PedidoPage.tsx',
    ])
      expect(rels).toContain(r)
    expect(rels.some((r) => r.includes('__tests__/'))).toBe(false)
    // A varredura acha literais de verdade (um parser quebrado devolveria zero e aprovaria tudo).
    expect(PRODUCAO.flatMap((a) => literais(fonteDe(a.rel, a.texto))).length).toBeGreaterThan(500)
  })

  it('ÂNCORA POSITIVA: as cinco formas EXISTEM no dono (`core/orders/appAction.ts`, lido do disco)', () => {
    const dono = readFileSync(DONO, 'utf8')
    for (const f of FORMAS) expect(acusar('appAction.ts', dono).some((a) => a.endsWith(`«${f}»`))).toBe(true)
  })

  it('nenhum literal de produção do app contém uma das cinco formas — sem allowlist', () => {
    expect(PRODUCAO.flatMap((a) => acusar(a.rel, a.texto))).toEqual([])
  })

  it('SENSOR: string, template e texto de JSX são acusados — com LF e com CRLF', () => {
    expect(acusar('a.ts', "const x = 'Não consegui salvar agora.'\n")).toEqual(['a.ts:1 «Não consegui salvar»'])
    expect(acusar('a.ts', 'const a = 1\r\nconst x = `Ana recebe ${"o aviso"} por e-mail.`\r\n')).toEqual(['a.ts:2 «por e-mail»'])
    expect(acusar('a.tsx', 'const C = () => <p>Este pedido mudou enquanto você olhava.</p>\n')).toEqual(['a.tsx:1 «mudou enquanto»'])
    expect(acusar('a.tsx', 'const C = () => <p title="Rastreio salvo.">x</p>\n')).toEqual(['a.tsx:1 «Rastreio salvo»'])
    expect(acusar('a.ts', "const x = { t: 'o aviso de postagem saiu' }\n")).toEqual(['a.ts:1 «aviso de postagem»'])
  })

  it('SENSOR: comentário NÃO é acusado — `//`, `/* */`, com CRLF e com o glob de dois asteriscos', () => {
    expect(acusar('a.ts', '// Não consegui salvar: a frase é de core\nconst x = 1\n')).toEqual([])
    expect(acusar('a.ts', '/* por e-mail */\r\nconst x = 1\r\n')).toEqual([])
    expect(acusar('a.ts', "// varre apps/**\nconst x = 'Rastreio salvo.'\n/* fim */\n")).toEqual(['a.ts:2 «Rastreio salvo»'])
  })

  it('INVERSOS: a frase de acesso não conferido e o rótulo "E-mail" NÃO são acusados', () => {
    expect(acusar('a.ts', "const ACCESS_UNCHECKED = 'Não consegui conferir seu acesso.'\n")).toEqual([])
    expect(acusar('a.tsx', 'const C = () => <dt>E-mail</dt>\n')).toEqual([])
  })

  it('SENSOR no arquivo REAL: a frase escrita à mão no rodapé seria acusada; `mutar` lança sem alvo', () => {
    const rodape = PRODUCAO.find((a) => a.rel === 'features/order-actions/ui/RodapeDaAcao.tsx')!
    const mutante = mutar(rodape.texto, '{erro.frase}', "{'Não consegui salvar. Tente de novo.'}")
    expect(acusar(rodape.rel, mutante)).toHaveLength(1)
    expect(() => mutar(rodape.texto, 'alvo que não existe', 'x')).toThrow(/alvo não encontrado/)
  })
})
