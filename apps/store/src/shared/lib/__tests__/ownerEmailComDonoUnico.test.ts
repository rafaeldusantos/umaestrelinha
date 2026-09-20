// Feature 57 (`AVD-09`) — "qual é o endereço que recebe os avisos internos?" tem UM dono.
//
// ## O defeito que este guarda prende
//
// Até a 57 a resposta era `general.email`, e três lugares a liam direto. Com o campo próprio de
// avisos — que cai no de contato quando vazio —, a resposta virou uma **regra**, e ela cabe numa
// linha. Uma linha é exatamente o tamanho de código que se reescreve em vez de importar.
//
// | Quem pergunta | Onde |
// | --- | --- |
// | o motor, ao escolher o destino | `dispatch.ts` → `recipientFor` |
// | o motor, ao conferir a pré-condição | `dispatch.ts` → `preconditionFailure({ ownerEmail })` |
// | o painel, ao avisar a dona | `NotificationsTab` → `warningsFor` |
//
// Escrita três vezes, a queda diverge — e a forma da divergência é a pior possível, porque nenhum
// lado quebra: **o painel avisando "nenhum e-mail cadastrado" enquanto o motor manda alegremente
// para o de contato**, ou o inverso (o painel calado e o aviso nunca saindo). As duas telas verdes,
// e quem descobre é a Adri, pelo aviso que não chegou.
//
// ## A régua, e por que ela é sobre o NOME do campo
//
// O campo `notifications_email` só tem uma razão para aparecer num app: **editá-lo**. Qualquer outra
// ocorrência é alguém resolvendo o destinatário à mão. Por isso o allowlist tem **um** arquivo, e é
// o formulário que o edita.
//
// A régua não tenta adivinhar "leitura de `general.email` com intenção de destinatário" — isso não
// se expressa em texto, e uma régua que tentasse acusaria as leituras legítimas do e-mail PÚBLICO
// (`PolicyContact`). O que ela mede é a metade que **é** expressável, mais a asserção POSITIVA de
// que os três consumidores chamam o dono — que é a lição de `originZipNotRead.test.ts`: um guarda de
// ausência precisa de uma presença ao lado, senão ele sobrevive à feature medindo o nada.

import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal — as duas pontas com tela e o motor. Nunca derivado de constante do código medido. */
const ESCOPO = ['apps', 'supabase/functions']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

/**
 * Remove comentário preservando a NUMERAÇÃO — linha e bloco na MESMA varredura (`BL-027`), com CRLF
 * normalizado antes (`L-031`: em JavaScript `.` não casa `\r`, e num checkout Windows o stripper
 * ficaria inerte).
 *
 * Aqui ele não é zelo: **este arquivo escreve o nome do campo proibido em prosa**, na tabela acima.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))
    .split('\n')

const eTeste = (rel: string) =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter((a) => !eTeste(a.rel))

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): string[] => {
  const achados: string[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (padrao.test(texto)) achados.push(`${rel}:${i + 1} → ${texto.trim()}`)
    })
  }
  return achados
}

/**
 * **Allowlist de UM**, escrito literalmente: o formulário que edita o campo.
 *
 * Ele é o único lugar de `apps/**` com motivo para nomear a chave — ele a grava. Uma segunda entrada
 * aqui é uma tela decidindo destinatário por conta própria.
 */
const DONO_DO_FORMULARIO = 'apps/backoffice/src/features/settings/ui/StoreDataSection.tsx'

const CAMPO = /\bnotifications_email\b/

describe('e-mail dos avisos — âncoras', () => {
  it('a varredura enxerga os dois apps E as edge functions', () => {
    // Caminho errado varre zero arquivo e faz a asserção de ausência passar por VACUIDADE.
    expect(varridos.length).toBeGreaterThan(400)
    expect(varridos.some((a) => a.rel.startsWith('apps/store/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel.startsWith('apps/backoffice/src/'))).toBe(true)
    expect(varridos.some((a) => a.rel === 'supabase/functions/send-notification/dispatch.ts')).toBe(true)
  })

  it('o allowlist de UM existe no disco, e nomeia o campo', () => {
    // Se o formulário mudar de arquivo, esta âncora cai — em vez de o guarda sobreviver medindo o
    // nada, que é o modo de falha que `originZipNotRead` pagou.
    const dono = producao.find((a) => a.rel === DONO_DO_FORMULARIO)
    expect(dono, DONO_DO_FORMULARIO).toBeDefined()
    expect(procurar(CAMPO, [dono!]).length).toBeGreaterThanOrEqual(1)
  })
})

describe('AVD-09 — o campo só é NOMEADO por quem o edita', () => {
  it('nenhum outro arquivo de produção cita `notifications_email`', () => {
    // Qualquer outra ocorrência é alguém resolvendo o destinatário à mão, e a queda reescrita
    // diverge da do dono sem nada quebrar.
    const fora = procurar(CAMPO).filter((o) => !o.startsWith(`${DONO_DO_FORMULARIO}:`))

    expect(fora).toEqual([])
  })
})

describe('AVD-09 — e os três consumidores CHAMAM o dono', () => {
  /** A metade positiva. Sem ela, apagar as três chamadas deixaria a regra acima verdadeira e vazia. */
  const chama = (rel: string, nome: string) => {
    const arquivo = producao.find((a) => a.rel === rel)
    expect(arquivo, rel).toBeDefined()
    return procurar(new RegExp(`\\b${nome}\\s*\\(`), [arquivo!]).length
  }

  it('o motor resolve o destinatário pelo dono, e não pelo campo cru', () => {
    expect(chama('supabase/functions/send-notification/dispatch.ts', 'resolveOwnerEmail')).toBeGreaterThanOrEqual(2)
  })

  it('o painel pergunta ao dono se há endereço, e não compara string à mão', () => {
    expect(
      chama('apps/backoffice/src/features/notification-settings/ui/NotificationsTab.tsx', 'ownerContactMissing'),
    ).toBeGreaterThanOrEqual(1)
  })

  it('e o painel NÃO compara `general.email` com string vazia para decidir', () => {
    // A forma exata que a 57 removeu. Ela voltaria por "simplificação" — é uma linha a menos — e
    // levaria consigo a queda para o campo de avisos, em silêncio.
    const painel = producao.filter((a) =>
      a.rel.startsWith('apps/backoffice/src/features/notification-settings/'),
    )
    expect(painel.length).toBeGreaterThan(0)

    expect(procurar(/general\.email\s*(\.trim\(\))?\s*===\s*''/, painel)).toEqual([])
  })
})

describe('SENSORES', () => {
  it('a régua acusa o campo escrito à mão', () => {
    expect(CAMPO.test("const to = general.notifications_email ?? general.email")).toBe(true)
    expect(CAMPO.test("value->>'notifications_email'")).toBe(true)
  })

  it('INVERSO: `email` sozinho NÃO é acusado — o e-mail público tem leitores legítimos', () => {
    // `PolicyContact` mostra `general.email` na loja, e a régua não pode alcançá-lo.
    expect(CAMPO.test('const { whatsapp, email, store_name } = useGeneralSettings()')).toBe(false)
    expect(CAMPO.test('href={`mailto:${email}`}')).toBe(false)
  })

  it('comentário é removido, com CRLF e com LF, e o código em volta sobrevive', () => {
    const campo = ['notifications', 'email'].join('_')
    for (const quebra of ['\r\n', '\n']) {
      const linhas = semComentarios(
        ['const antes = 1', `// o campo proibido e ${campo}`, 'const depois = 3'].join(quebra),
      )
      expect(linhas.some((l) => CAMPO.test(l))).toBe(false)
      expect(linhas.some((l) => l.includes('const antes = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const depois = 3'))).toBe(true)
    }
  })

  it('comentário de LINHA que cita um glob não engole o código abaixo', () => {
    const fonte = [
      'const antes = 1',
      '// varre apps/**/*.ts e supabase/functions/**/*.ts',
      'const x = general.notifications_email',
      'const depois = 3',
    ].join('\r\n')

    const linhas = semComentarios(fonte)

    expect(linhas.some((l) => l.includes('varre apps'))).toBe(false)
    expect(linhas.some((l) => CAMPO.test(l))).toBe(true)
    expect(linhas.some((l) => l.includes('const depois = 3'))).toBe(true)
  })
})
