import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * As réguas de tom, variável e limite dos e-mails de notificação têm UM dono —
 * `@estrelinha/core/notifications` — e este guarda é o que mantém isso verdadeiro (`ABN-11`).
 *
 * Antes desta feature, a composição "variável → tom → tamanho" só existia dentro da edge function
 * `send-notification` (`draftRefusal`, `handlers.ts`). A feature `53` moveu-a para `core` como
 * `notificationDraftRefusal` exatamente para que o painel pudesse chamar a MESMA função ao salvar —
 * nunca reimplementar a composição. **Sem este guarda, um segundo `URGENCY_TERMS` (ou a mesma
 * lista com uma palavra diferente) nasceria no painel e nada acusaria**: build, `tsc` e teste de
 * componente passam com duas listas divergentes — é o "defeito 01" deste projeto, na roupa de uma
 * régua de conteúdo em vez de uma regra de preço ou de rota.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que existe pelo menos um import de verdade
 * de `@estrelinha/core/notifications` no painel (`EventCard.tsx` importa `COPY_LIMITS` para os
 * contadores de caractere). Só contar arquivos deixaria passar um regex quebrado; só procurar
 * ocorrência deixaria passar um caminho errado.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal: só o painel — é onde a aba de Notificações (feature `53`) vive. */
const ESCOPO = ['apps/backoffice/src']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

interface Arquivo {
  rel: string
  /** As linhas SEM comentário. É sobre estas que a régua roda — nunca sobre a prosa que a explica. */
  linhas: string[]
}

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas — linha e bloco na MESMA varredura
 * (`BL-027`), com CRLF normalizado primeiro. Cópia do stripper de `freeShippingSingleOwner.test.ts`:
 * é a mesma classe de defeito (régua confundida com a prosa sobre a régua), e a forma que funciona já
 * está provada lá.
 */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (trecho) => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

const varridos: Arquivo[] = ESCOPO.flatMap((d) => arquivos(join(ROOT, d))).map((caminho) => ({
  rel: relative(ROOT, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

/**
 * Só produção. Este PRÓPRIO arquivo é teste, e ele PRECISA citar as formas proibidas — nos sensores
 * abaixo, e como string dentro de fixtures sintéticas — para provar que a régua as pegaria. Rodar a
 * regra contra `varridos` faria o guarda reprovar a si mesmo: a régua não pode ser o objeto medido.
 */
const producao = varridos.filter((a) => !eTeste(a.rel))

interface Ocorrencia {
  arquivo: string
  linha: number
  texto: string
}

const procurar = (padrao: RegExp, alvo: Arquivo[] = producao): Ocorrencia[] => {
  const achados: Ocorrencia[] = []
  for (const { rel, linhas } of alvo) {
    linhas.forEach((texto, i) => {
      if (padrao.test(texto)) achados.push({ arquivo: rel, linha: i + 1, texto: texto.trim() })
    })
  }
  return achados
}

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('notificationCopySingleOwner — âncoras da varredura', () => {
  it('a varredura leu arquivos do painel', () => {
    // Caminho errado varre zero arquivo e faz toda asserção abaixo passar por vacuidade.
    expect(varridos.length).toBeGreaterThan(100)
  })

  it('existe pelo menos UM import de verdade de `@estrelinha/core/notifications` no painel', () => {
    // `EventCard.tsx` (T10) importa `COPY_LIMITS` para os contadores de caractere. Se este teste
    // falhar, a régua de import está quebrada, não o código — o painel de fato consome o pacote.
    const imports = procurar(/from\s+['"]@estrelinha\/core\/notifications['"]/)
    expect(imports.length).toBeGreaterThanOrEqual(1)
  })

  it('comentário é REMOVIDO, com CRLF e com LF — sensor do stripper', () => {
    const crlf = semComentarios('const a = 1\r\n// URGENCY_TERMS aqui\r\nconst b = 2\r\n')
    const lf = semComentarios('const a = 1\n// URGENCY_TERMS aqui\nconst b = 2\n')
    const bloco = semComentarios('const a = 1\r\n/**\r\n * URGENCY_TERMS\r\n */\r\nconst b = 2\r\n')

    for (const linhas of [crlf, lf, bloco]) {
      expect(linhas.some((l) => l.includes('URGENCY_TERMS'))).toBe(false)
      expect(linhas.some((l) => l.includes('const a = 1'))).toBe(true)
      expect(linhas.some((l) => l.includes('const b = 2'))).toBe(true)
    }
    expect(bloco).toHaveLength(6)
  })

  // O mesmo glob-armadilha de `freeShippingSingleOwner.test.ts` — montado por CONCATENAÇÃO para não
  // deixar um abre-bloco cru no fonte deste arquivo, o que contaminaria todo guarda vizinho que varre
  // a mesma pasta.
  const GLOB_ARMADILHA = 'apps/backoffice/' + '*'.repeat(2)

  it('comentário de LINHA que cita um glob de dois asteriscos NÃO cega o código abaixo (BL-027)', () => {
    const fonte = [
      '/** a prosa que explica a régua */',
      `// a varredura cobre ${GLOB_ARMADILHA}, e este glob era a armadilha`,
      'const depois = 1',
      '/* bloco de verdade */',
      'const final = 2',
      '',
    ].join('\n')

    const linhas = semComentarios(fonte)

    expect(linhas.some((l) => l.includes('const depois = 1'))).toBe(true)
    expect(linhas.some((l) => l.includes('const final = 2'))).toBe(true)
    expect(linhas.some((l) => l.includes('a prosa que explica'))).toBe(false)
    expect(linhas.some((l) => l.includes('armadilha'))).toBe(false)
    expect(linhas.some((l) => l.includes('bloco de verdade'))).toBe(false)
    expect(linhas).toHaveLength(6)
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra: zero segunda declaração
// ───────────────────────────────────────────────────────────────────────────

/**
 * Declaração de uma das três constantes fechadas de `core/notifications` — `const NOME = …`, nunca
 * `import { NOME } from …`. É a forma que casaria uma segunda lista de termos de urgência, uma
 * segunda lista de variáveis ou um segundo objeto de limites escritos à mão no painel.
 */
const DECLARACAO_DE_CONSTANTE =
  /\b(?:export\s+)?const\s+(?:URGENCY_TERMS|NOTIFICATION_VARIABLES|COPY_LIMITS)\b/

/**
 * Declaração de uma das três funções de recusa — `function nome(` ou `const nome = `, nunca
 * `import { nome } from …`.
 */
const DECLARACAO_DE_FUNCAO =
  /\b(?:export\s+)?(?:function\s+(?:notificationCopyRefusal|variablesRefusal|limitsRefusal)\b|const\s+(?:notificationCopyRefusal|variablesRefusal|limitsRefusal)\s*[:=])/

/**
 * A assinatura da régua de emoji (`\p{Extended_Pictographic}`, em `core/notifications/copy.ts`). Uma
 * segunda escrita — mesmo com sintaxe levemente diferente — carrega esta propriedade Unicode, porque
 * é a única forma correta de cobrir o par substituto inteiro (o motivo pelo qual `core` não usa uma
 * lista de caracteres). Nenhuma outra régua do painel tem motivo para citá-la.
 */
const REGEX_DE_EMOJI = /Extended_Pictographic/

describe('nenhuma segunda declaração das réguas de core/notifications no painel (ABN-11)', () => {
  it('URGENCY_TERMS, NOTIFICATION_VARIABLES e COPY_LIMITS não são REDECLARADOS — só importados', () => {
    const achados = procurar(DECLARACAO_DE_CONSTANTE)
    expect(achados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('notificationCopyRefusal, variablesRefusal e limitsRefusal não são REDECLARADOS — só importados', () => {
    const achados = procurar(DECLARACAO_DE_FUNCAO)
    expect(achados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })

  it('a régua de emoji (`Extended_Pictographic`) não é reescrita no painel', () => {
    const achados = procurar(REGEX_DE_EMOJI)
    expect(achados.map((o) => `${o.arquivo}:${o.linha} — ${o.texto}`)).toEqual([])
  })
})

describe('sensor de injeção real — a régua acusa quando a forma proibida existe', () => {
  it('colar a lista de URGENCY_TERMS num arquivo do painel FAZ o guarda reprovar', () => {
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico/model/copia.ts',
      linhas: semComentarios(
        [
          "export const URGENCY_TERMS = ['últimas unidades', 'corra', 'imperdível'] as const",
          '',
        ].join('\n'),
      ),
    }
    const achados = procurar(DECLARACAO_DE_CONSTANTE, [sintetico])
    expect(achados).toHaveLength(1)
    expect(achados[0].texto).toContain('URGENCY_TERMS')
  })

  it('declarar uma função `notificationCopyRefusal` local FAZ o guarda reprovar (as duas formas)', () => {
    const funcao: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico/model/funcao.ts',
      linhas: semComentarios('export function notificationCopyRefusal(text: string) { return null }\n'),
    }
    const arrow: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico/model/arrow.ts',
      linhas: semComentarios('const variablesRefusal = (text: string) => null\n'),
    }
    expect(procurar(DECLARACAO_DE_FUNCAO, [funcao])).toHaveLength(1)
    expect(procurar(DECLARACAO_DE_FUNCAO, [arrow])).toHaveLength(1)
  })

  it('reescrever a régua de emoji localmente FAZ o guarda reprovar', () => {
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico/model/emoji.ts',
      linhas: semComentarios('const EMOJI = /\\p{Extended_Pictographic}/u\n'),
    }
    expect(procurar(REGEX_DE_EMOJI, [sintetico])).toHaveLength(1)
  })

  it('leitura nova FORA de qualquer allowlist é acusada mesmo atrás do comentário-armadilha (BL-027)', () => {
    const GLOB_ARMADILHA = 'apps/backoffice/' + '*'.repeat(2)
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico/model/escondido.ts',
      linhas: semComentarios(
        [
          `// esta tela varre ${GLOB_ARMADILHA} à procura de nada`,
          'export const COPY_LIMITS = { subject: 999 }',
          '/* fim do arquivo */',
          '',
        ].join('\n'),
      ),
    }
    expect(procurar(DECLARACAO_DE_CONSTANTE, [sintetico])).toHaveLength(1)
  })
})

describe('inverso — o import LEGÍTIMO nunca é acusado', () => {
  it('`import { notificationCopyRefusal, variablesRefusal, limitsRefusal, COPY_LIMITS, NOTIFICATION_VARIABLES } from \'@estrelinha/core/notifications\'` não casa nenhuma das duas réguas', () => {
    const sintetico: Arquivo = {
      rel: 'apps/backoffice/src/features/sintetico/model/import-legitimo.ts',
      linhas: semComentarios(
        [
          'import {',
          '  notificationCopyRefusal,',
          '  variablesRefusal,',
          '  limitsRefusal,',
          '  COPY_LIMITS,',
          '  NOTIFICATION_VARIABLES,',
          "} from '@estrelinha/core/notifications'",
          '',
          'export function usa() {',
          '  return notificationCopyRefusal',
          '}',
          '',
        ].join('\n'),
      ),
    }
    expect(procurar(DECLARACAO_DE_CONSTANTE, [sintetico])).toEqual([])
    expect(procurar(DECLARACAO_DE_FUNCAO, [sintetico])).toEqual([])
  })

  it('o import real de `EventCard.tsx` (que traz `COPY_LIMITS`) não é acusado — prova contra o arquivo de verdade', () => {
    const arquivo = varridos.find((a) => a.rel.endsWith('notification-settings/ui/EventCard.tsx'))
    expect(arquivo).toBeDefined()
    expect(procurar(DECLARACAO_DE_CONSTANTE, [arquivo!])).toEqual([])
    expect(procurar(DECLARACAO_DE_FUNCAO, [arquivo!])).toEqual([])
  })
})
