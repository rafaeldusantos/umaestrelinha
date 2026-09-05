import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { MENU_ICON_KEYS, MENU_ICON_LABELS, menuIconKey } from '@estrelinha/core/menu'
import { ESTRELINHA_ICONS, MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'

/**
 * O guarda do catálogo de ícones do menu — feature 39.
 *
 * **A chave e o desenho moram em pacotes diferentes de propósito**, e essa é a coisa que este
 * arquivo protege. A chave (`MENU_ICON_KEYS`) é **dado**: vem de `categories.icon`, é gravada pelo
 * painel e lida pela loja, e por isso vive em `@estrelinha/core`, que roda em Node, em Deno e no
 * browser — um `import React` no grafo de `core` derruba edge function em runtime, não em build. O
 * desenho é React e vive em `@estrelinha/ui/icons`.
 *
 * Metade da cobertura é de graça: `MENU_ICON_COMPONENTS` é `Record<MenuIconKey, …>`, então chave sem
 * desenho **não compila**. O que o compilador **não** pega é o outro sentido e as bordas:
 *
 * - desenho no registro que não é chave do catálogo (o painel oferece um ícone que o banco recusaria);
 * - chave sem rótulo (o seletor mostra uma célula sem nome);
 * - um arquivo da loja voltando a importar do **caminho antigo** da biblioteca, que é o "defeito 01"
 *   em miniatura: dois caminhos para o mesmo ícone.
 *
 * O caminho antigo merece guarda porque a falha dele é silenciosa **na direção contrária ao normal**:
 * um `@/shared/ui/icons` que voltasse hoje quebraria o build — mas um barrel de compatibilidade
 * criado "só para não quebrar nada" passaria em tudo, e é exatamente esse o estado que a mudança de
 * casa existe para não ter.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const APPS = resolve(ROOT, 'apps')

/**
 * O caminho de onde a biblioteca SAIU, montado por partes.
 *
 * Montado, e não escrito por extenso, porque este arquivo **está dentro do escopo que ele varre**:
 * um literal aqui faria o guarda se acusar. É a mesma lição que o `brandScan` já cobrou — a régua
 * nunca pode ser o objeto medido.
 */
const PASTA_ANTIGA = ['shared', 'ui', 'icons'].join('/')

/**
 * A régua julga o **import**, não a menção.
 *
 * A diferença é deliberada: comentário que conta de onde a biblioteca veio é informação que se quer
 * preservar (o `icons.test.ts` ao lado tem um), e proibir a citação empurraria a próxima pessoa a
 * apagar justamente a prosa que explica a mudança. O que não pode voltar é o **caminho de import**.
 */
const IMPORT_ANTIGO = new RegExp(`(from|import)\\s*\\(?\\s*['"][^'"]*${PASTA_ANTIGA}['"]`)

function arquivosDeFonte(dir: string, achados: string[] = []): string[] {
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    if (entrada.name === 'node_modules' || entrada.name === 'dist') continue
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) arquivosDeFonte(caminho, achados)
    else if (/\.(ts|tsx)$/.test(entrada.name)) achados.push(caminho)
  }
  return achados
}

const FONTES = arquivosDeFonte(APPS).map((caminho) => ({
  caminho: relative(ROOT, caminho).replace(/\\/g, '/'),
  fonte: readFileSync(caminho, 'utf8'),
}))

/** Quem importa do caminho antigo — a régua, como predicado, para poder ser exercida por mutação. */
const importamDoCaminhoAntigo = (
  arquivos: readonly { caminho: string; fonte: string }[],
): string[] => arquivos.filter(({ fonte }) => IMPORT_ANTIGO.test(fonte)).map(({ caminho }) => caminho)

describe('âncoras — a varredura olhou alguma coisa', () => {
  it('leu os fontes dos dois apps', () => {
    // Sem esta âncora, um caminho errado varre zero arquivo e a asserção de ausência lá embaixo
    // passa em verde por não ter olhado nada. É a pior falha possível num teste que lê disco.
    expect(FONTES.length).toBeGreaterThan(600)
    expect(FONTES.some(({ caminho }) => caminho.startsWith('apps/store/'))).toBe(true)
    expect(FONTES.some(({ caminho }) => caminho.startsWith('apps/backoffice/'))).toBe(true)
    // E o conteúdo chegou: uma lista de caminhos com fonte vazia varreria o nada.
    expect(FONTES.every(({ fonte }) => fonte.length > 0)).toBe(true)
  })

  it('o catálogo tem tamanho de verdade', () => {
    // A segunda metade da âncora dupla: a régua achou alvos, e não uma lista vazia — contra a qual
    // todo laço deste arquivo passaria sem comparar nada.
    expect(MENU_ICON_KEYS.length).toBeGreaterThanOrEqual(20)
    expect(Object.keys(MENU_ICON_COMPONENTS).length).toBe(MENU_ICON_KEYS.length)
  })
})

describe('chave ↔ desenho — bidirecional', () => {
  it('toda chave do catálogo tem desenho', () => {
    for (const chave of MENU_ICON_KEYS) {
      expect(MENU_ICON_COMPONENTS[chave], `a chave "${chave}" não tem desenho`).toBeTypeOf('function')
    }
  })

  it('SENSOR: uma chave órfã reprova na mesma régua', () => {
    // O `Record<MenuIconKey, …>` já impediria isso em compilação. O sensor prova que a régua **de
    // runtime** também pega — é ela que sobra quando alguém alarga o tipo para `Partial<…>` ou
    // constrói o registro por `reduce`, e aí o compilador cala.
    const mutilado: Record<string, unknown> = { ...MENU_ICON_COMPONENTS }
    delete mutilado[MENU_ICON_KEYS[0]]
    const orfas = MENU_ICON_KEYS.filter((chave) => typeof mutilado[chave] !== 'function')
    expect(orfas).toEqual([MENU_ICON_KEYS[0]])
  })

  it('todo desenho do registro é chave do catálogo', () => {
    // O sentido que o compilador NÃO cobre: um ícone a mais aqui seria oferecido pelo seletor do
    // painel, gravado em `categories.icon`, e depois lido como `null` pela loja — porque
    // `menuIconKey` recusa o que não está no catálogo. A dona escolhe e nada aparece.
    for (const chave of Object.keys(MENU_ICON_COMPONENTS)) {
      expect(menuIconKey(chave), `"${chave}" está no registro mas não no catálogo`).toBe(chave)
    }
  })

  it('toda chave tem rótulo, e nenhum rótulo é vazio', () => {
    for (const chave of MENU_ICON_KEYS) {
      expect(MENU_ICON_LABELS[chave], `a chave "${chave}" não tem rótulo`).toBeTruthy()
      expect(MENU_ICON_LABELS[chave].trim()).not.toBe('')
    }
    expect(Object.keys(MENU_ICON_LABELS)).toHaveLength(MENU_ICON_KEYS.length)
  })

  it('o registro do menu é o MESMO objeto do registro da loja, não uma segunda tabela', () => {
    // Duas tabelas do mesmo mapeamento divergiriam no primeiro ícone novo, em silêncio — a cliente
    // veria um glifo na barra e a Adri outro na tela onde o escolheu.
    expect(MENU_ICON_COMPONENTS).toBe(ESTRELINHA_ICONS)
  })

  it('o `pix` fica de fora, e continua alcançável por nome', () => {
    // A marca oficial do arranjo (grade de 16, preenchida) não obedece às regras do conjunto, e pôr
    // a marca de um meio de pagamento como ícone de departamento diria outra coisa.
    expect(menuIconKey('pix')).toBeNull()
    expect(MENU_ICON_KEYS).not.toContain('pix')
    expect((ESTRELINHA_ICONS as Record<string, unknown>).pix).toBeUndefined()
  })
})

describe('a biblioteca tem UMA casa', () => {
  it('nenhum arquivo de `apps/**` importa do caminho antigo', () => {
    expect(importamDoCaminhoAntigo(FONTES)).toEqual([])
  })

  it('SENSOR: as três formas de import antigo reprovam na mesma régua', () => {
    // Sem este par, a asserção acima é indistinguível de uma régua que nunca casa com nada.
    const formas = [
      `import { PixIcon } from '@/${PASTA_ANTIGA}'`,
      `import type { EstrelinhaIconName } from "@/${PASTA_ANTIGA}"`,
      `const mod = await import('../../${PASTA_ANTIGA}')`,
    ]
    for (const fonte of formas) {
      expect(
        importamDoCaminhoAntigo([{ caminho: 'sintetico.tsx', fonte }]),
        `a régua deixou passar: ${fonte}`,
      ).toEqual(['sintetico.tsx'])
    }
  })

  it('SENSOR: a régua NÃO acusa quem só menciona o caminho em prosa', () => {
    // Contrapartida do sensor acima. O `icons.test.ts` ao lado conta de onde a biblioteca veio, e
    // essa prosa é o que impede a próxima pessoa de "consertar" o caminho de volta. Uma régua que a
    // derrubasse empurraria justamente para apagá-la.
    const prosa = `// a biblioteca morava em apps/store/src/${PASTA_ANTIGA} e mudou de casa na 39`
    expect(importamDoCaminhoAntigo([{ caminho: 'sintetico.ts', fonte: prosa }])).toEqual([])
  })

  it('o barrel antigo não existe mais em disco', () => {
    // Dois caminhos para o mesmo ícone é o "defeito 01" do projeto em miniatura, e um barrel de
    // reexportação "só para não quebrar nada" é exatamente a forma que ele tem quando reaparece.
    expect(() => readdirSync(resolve(ROOT, 'apps/store/src/shared/ui/icons'))).toThrow()
  })
})
