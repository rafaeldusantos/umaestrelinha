import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { MATERIAIS_SEM_ANCORA } from '../guide'

/**
 * `GAV-17` / `GAV-19` — **o conteúdo do guia de material tem UM dono**, e ele é
 * `entities/material/model`.
 *
 * O defeito que este guarda existe para impedir já aconteceu uma vez, nesta mesma matéria: a feature
 * `31` apagou `widgets/material-guide/model/fichas.ts`, que era a segunda escrita do mesmo guia. Com
 * a gaveta da `44` os leitores viraram dois, e dois leitores é exatamente a condição em que a cópia
 * volta — "só um resumo dentro da gaveta" é o pedido razoável que a traz.
 *
 * A propriedade que torna isso caro é a de sempre: **duas escritas da mesma regra não quebram
 * nada.** Build, `tsc` e teste de componente passam com as duas cópias divergindo, e quem descobre é
 * a cliente que mandou 10 ml de leite porque a gaveta dizia 10 e a página dizia 50.
 *
 * ÂNCORA DUPLA: a varredura prova que leu arquivos **e** que a régua encontra o que procura. Só
 * contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um caminho
 * errado, que varre zero e aprova em silêncio.
 *
 * A régua nunca é o objeto medido: o escopo e os nomes estão escritos **literalmente** aqui, e não
 * derivados de constante que o código sob teste exporte — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/** `apps/store/src` — quatro níveis acima de `entities/material/model/__tests__`. */
const SRC = resolve(HERE, '../../../..')

/** O dono. É o único caminho autorizado a declarar o conteúdo. */
const DONO = 'entities/material/model'

/** As declarações que só podem existir no dono, escritas literalmente. */
const DECLARACOES = [
  'FICHAS_DE_MATERIAL',
  'CARTOES_DE_MATERIAL',
  'PREPARO_EM_CASA',
  'PASSOS_DO_ENVIO',
  'ATALHOS_DE_MATERIAL',
  'VIDEOS_DE_PREPARO',
  'FORMAS_DE_ENVIO',
  'CHECKLIST_DO_ENVIO',
] as const

const EXTENSOES = ['.ts', '.tsx']

const caminhar = (alvo: string): string[] =>
  readdirSync(alvo, { withFileTypes: true }).flatMap(entry => {
    const caminho = join(alvo, entry.name)
    if (entry.isDirectory()) return caminhar(caminho)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [caminho] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

/**
 * Remove comentários preservando a NUMERAÇÃO das linhas.
 *
 * Linha e bloco na MESMA varredura (`BL-027`): em duas passadas, um comentário de linha que cite um
 * glob de dois asteriscos abre um bloco para a régua de bloco, que apaga até o próximo fecha-bloco —
 * inclusive CÓDIGO. Num guarda cuja asserção é uma ausência, isso não reprova: aprova em silêncio.
 *
 * CRLF normalizado PRIMEIRO: em JavaScript o ponto não casa `\r`, e num checkout Windows — que é a
 * plataforma deste projeto — nenhum comentário de linha seria removido.
 *
 * Aqui não é precaução teórica: este arquivo e o barrel de `widgets/material-guide` **explicam por
 * escrito** que o conteúdo mudou de casa, e as duas prosas citam os nomes das constantes.
 */
export const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, trecho => trecho.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  linhas: string[]
}

const varridos: Arquivo[] = caminhar(SRC).map(caminho => ({
  rel: relative(SRC, caminho).split('\\').join('/'),
  linhas: semComentarios(readFileSync(caminho, 'utf8')),
}))

const producao = varridos.filter(a => !eTeste(a.rel))

/**
 * A régua da DECLARAÇÃO, como predicado — `const X: ... = [` ou `const X = [`.
 *
 * Procura a declaração, não a menção: `import { FICHAS_DE_MATERIAL }` e
 * `FICHAS_DE_MATERIAL.map(...)` são consumo legítimo e não podem ser acusados, senão o guarda proíbe
 * justamente o uso que ele existe para proteger.
 */
export const declaraConteudo = (linha: string): string | null => {
  for (const nome of DECLARACOES) {
    if (new RegExp(`\\b(?:const|let|var)\\s+${nome}\\b\\s*[:=]`).test(linha)) return nome
  }
  return null
}

/** A régua do IMPORT LATERAL entre os dois widgets que leem o guia. */
export const importaLateralmente = (rel: string, linha: string): boolean => {
  const daGaveta = rel.startsWith('widgets/material-drawer/')
  const doGuia = rel.startsWith('widgets/material-guide/')
  if (daGaveta) return /['"]@\/widgets\/material-guide|['"]\.\.\/\.\.\/material-guide/.test(linha)
  if (doGuia) return /['"]@\/widgets\/material-drawer|['"]\.\.\/\.\.\/material-drawer/.test(linha)
  return false
}

// ───────────────────────────────────────────────────────────────────────────
// Âncoras
// ───────────────────────────────────────────────────────────────────────────

describe('dono único do guia — âncoras', () => {
  it('a varredura enxerga o app inteiro', () => {
    // Varredura que varre zero arquivo passa em silêncio, que é a pior falha possível aqui.
    // Medido em 2026-09-11: 223 arquivos de produção em `apps/store/src`. O piso é folgado o
    // bastante para uma limpeza não o derrubar, e apertado o bastante para um caminho errado —
    // que devolve zero ou um punhado — reprovar.
    expect(producao.length).toBeGreaterThan(180)

    const nomes = producao.map(a => a.rel)
    expect(nomes).toContain('entities/material/model/guide.ts')
    expect(nomes).toContain('entities/material/model/videos.ts')
    expect(nomes).toContain('widgets/material-guide/ui/MaterialsSection.tsx')
  })

  it('a régua ACHA as declarações no dono — as oito', () => {
    // Sem isto, um regex quebrado passaria por "nenhuma ocorrência fora do dono".
    const dono = producao.filter(a => a.rel.startsWith(DONO))
    const achadas = new Set(
      dono.flatMap(a => a.linhas.map(declaraConteudo).filter((n): n is string => n !== null)),
    )
    expect([...achadas].sort()).toEqual([...DECLARACOES].sort())
  })

  it('a régua ACUSA declaração e NÃO acusa consumo', () => {
    expect(declaraConteudo('export const FICHAS_DE_MATERIAL: readonly FichaDeMaterial[] = [')).toBe(
      'FICHAS_DE_MATERIAL',
    )
    expect(declaraConteudo('const PASSOS_DO_ENVIO = [')).toBe('PASSOS_DO_ENVIO')
    // O par: consumo é legítimo e não pode reprovar.
    expect(declaraConteudo("import { FICHAS_DE_MATERIAL } from '@/entities/material'")).toBe(null)
    expect(declaraConteudo('  {FICHAS_DE_MATERIAL.map(ficha => (')).toBe(null)
    expect(declaraConteudo('const primeira = FICHAS_DE_MATERIAL[0]')).toBe(null)
  })

  it('a régua do import lateral acusa os dois sentidos, e só eles', () => {
    expect(
      importaLateralmente(
        'widgets/material-drawer/ui/MaterialDrawer.tsx',
        "import { MaterialFicha } from '@/widgets/material-guide'",
      ),
    ).toBe(true)
    expect(
      importaLateralmente(
        'widgets/material-guide/ui/MaterialsSection.tsx',
        "import { X } from '@/widgets/material-drawer'",
      ),
    ).toBe(true)
    // Os pares: importar do dono é o caminho CERTO, e não pode ser acusado.
    expect(
      importaLateralmente(
        'widgets/material-drawer/ui/MaterialDrawer.tsx',
        "import { FICHAS_DE_MATERIAL } from '@/entities/material'",
      ),
    ).toBe(false)
    // E um terceiro widget qualquer importando o guia não é import lateral entre estes dois.
    expect(
      importaLateralmente(
        'widgets/store-layout/ui/StoreLayout.tsx',
        "import { GUIA_MATERIAL_PATH } from '@/widgets/material-guide'",
      ),
    ).toBe(false)
  })

  it('a remoção de comentário enxerga LF e CRLF, e faz linha e bloco na MESMA passada', () => {
    expect(semComentarios('// const FICHAS_DE_MATERIAL = []\nconst a = 1\n')[0].trim()).toBe('')
    expect(semComentarios('// const FICHAS_DE_MATERIAL = []\r\nconst a = 1\r\n')[0].trim()).toBe('')
    expect(semComentarios('/* const FICHAS_DE_MATERIAL = []\nem bloco */\nconst a = 1\n')[1].trim()).toBe(
      '',
    )

    // `BL-027`: o glob de dois asteriscos dentro de um comentário de LINHA não pode abrir bloco e
    // engolir o código de baixo — é assim que um guarda de ausência aprova em silêncio.
    const comGlob = semComentarios('// varre apps/**/*.tsx\nconst PASSOS_DO_ENVIO = []\n')
    expect(comGlob[1]).toContain('PASSOS_DO_ENVIO')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// A regra
// ───────────────────────────────────────────────────────────────────────────

describe('dono único do guia', () => {
  it('nenhum arquivo fora de `entities/material/model` declara o conteúdo do guia', () => {
    const forasteiros = producao
      .filter(a => !a.rel.startsWith(DONO))
      .flatMap(({ rel, linhas }) =>
        linhas.flatMap((texto, i) => {
          const nome = declaraConteudo(texto)
          return nome ? [`${rel}:${i + 1} declara ${nome}`] : []
        }),
      )

    expect(forasteiros).toEqual([])
  })

  it('`widgets/material-guide/model` não existe mais', () => {
    // O diretório inteiro saiu na feature 44. Deixá-lo no disco com um arquivo sobrando seria a
    // mesma sobra de `deleteSection` na feature 41: exportado, sem consumidor, e divergindo.
    let existe = true
    try {
      statSync(join(SRC, 'widgets/material-guide/model'))
    } catch {
      existe = false
    }
    expect(existe).toBe(false)
  })

  it('a gaveta e o guia não importam um do outro', () => {
    const laterais = producao.flatMap(({ rel, linhas }) =>
      linhas.flatMap((texto, i) => (importaLateralmente(rel, texto) ? [`${rel}:${i + 1}`] : [])),
    )

    expect(laterais).toEqual([])
  })

  it('todo material do catálogo continua tendo destino', () => {
    // `GAV-19`. Âncora quebrada não dá 404: a página abre, não rola, e ninguém descobre.
    expect(MATERIAIS_SEM_ANCORA).toEqual([])
  })
})
