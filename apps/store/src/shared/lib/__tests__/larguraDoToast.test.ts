import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import resolveConfig from 'tailwindcss/resolveConfig'
import { describe, expect, it } from 'vitest'

import preset from '../../../../../../packages/ui/tailwind.preset'

/**
 * O guarda da largura do aviso — `packages/ui/src/sonner.tsx` e quem chama `toast.custom`.
 *
 * **O defeito que ele recusa não quebra nada.** Um toast de conteúdo próprio nasce com
 * `data-styled="false"`, e a única regra do sonner que declara `width: var(--width)` é a
 * `[data-styled="true"]`. O `<li>` fica **sem largura nenhuma**, vira shrink-to-fit, e o piso do
 * shrink-to-fit é o **min-content do conteúdo** — que `truncate` (isto é, `white-space: nowrap`)
 * eleva à linha inteira. `min-w-0` dá **piso zero ao item**, nunca **teto à contribuição**: é a
 * mesma mecânica que `dialogGridTrack.test.ts` guarda nos diálogos, num contêiner diferente.
 *
 * Medido em navegador real, na página do produto, com o aviso de "adicionado ao carrinho":
 *
 * | nome do produto | largura do `<li>` | vazamento para fora da janela |
 * | --- | --- | --- |
 * | `Pingente Afetivo Gota com Leite Materno, Cabelo e Coto Umbilical` | 539,8px | **151,8px** |
 * | `Joia Afetiva Cachorro Shih Tzu, Maltês, …` (o mais longo do catálogo) | 680px | **292px** |
 *
 * O trilho tem **356px** e é ancorado à direita, então **o vazamento não depende da largura da
 * tela**: 1440, 1024, 900 e 700 vazaram os mesmos 151,8px. Abaixo de 600px o próprio sonner
 * declara `width: calc(100% - 32px)` com especificidade maior que uma classe — e por isso o
 * celular, que é ~90% dos acessos, nunca mostrou o defeito e nenhuma prova em 390px o acharia.
 *
 * **jsdom devolve 0 para toda medida de layout**, então nenhuma suíte deste repositório encostaria
 * nisso. Daí a forma da régua: ela lê o **fonte do disco** e procura a declaração, não o efeito.
 *
 * **Mora na suíte da loja pelo mesmo motivo que `icons.test.ts` e `dialogGridTrack.test.ts`**:
 * `packages/ui` não tem runner, e guarda que não roda é pior que guarda nenhum. Os dois apps
 * montam este mesmo `Toaster`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escritos um a um, e não derivados de constante: a régua não pode ser o objeto que ela mede. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src']

const FONTE_DO_TOASTER = 'packages/ui/src/sonner.tsx'

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura.
 *
 * `[^\n\r]` fecha antes do `\r`: com `.` o comentário de uma linha em arquivo CRLF engoliria a
 * linha seguinte. Aqui isso não é zelo abstrato — o `sonner.tsx` **explica em prosa** por que a
 * classe de largura precisa existir, citando o nome dela. Uma régua que casasse **menção** em vez
 * de **uso** passaria com a classe apagada, que é o modo de falha mais caro de um guarda de disco.
 */
const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/**
 * Casa o **token inteiro**, e não o prefixo.
 *
 * `-` não é caractere de palavra, então `\b` não fecharia nada: `w-full` responderia por
 * `w-full-x`. A borda da esquerda aceita aspas e crase porque a classe quase sempre chega colada
 * no delimitador de uma string (`"min-w-0 flex-1"`), e não depois de um espaço.
 */
const temToken = (texto: string, token: string) =>
  new RegExp(String.raw`(?:^|[\s"'\`])${token}(?![-\w])`).test(texto)

/**
 * A régua do `<li>`, escrita como **predicado** para a asserção e os sensores chamarem a mesma
 * função. Veredito com motivo é `string | null` de propósito: com `strictNullChecks: false`,
 * união discriminada por booleano literal não estreita, e o ramo do motivo não compilaria.
 */
export const larguraIndefinida = (classes: string): string | null =>
  temToken(classes, 'w-full')
    ? null
    : 'o `<li>` do toast não declara largura — sem ela, um toast de conteúdo próprio vira shrink-to-fit e cresce com o texto'

/** Extrai a string de classes do `toast:` do `Toaster`. Devolve '' quando não conseguir ler — e aí a âncora derruba. */
export const classesDoToast = (fonte: string): string => {
  const achado = semComentario(fonte).match(/\btoast:\s*"([^"]*)"/)
  return achado ? achado[1] : ''
}

/**
 * Recorta, por parênteses balanceados, cada argumento de `toast.custom(`.
 *
 * Devolve `null` quando um parêntese não fecha: recorte que falha **reprova**, em vez de virar
 * lista vazia que aprova tudo. É a lição de `rotasSobGuarda.test.ts`.
 */
export const chamadasDeToastCustom = (fonte: string): string[] | null => {
  const limpo = semComentario(fonte)
  const saida: string[] = []
  for (let i = limpo.indexOf('toast.custom('); i !== -1; ) {
    const abre = limpo.indexOf('(', i)
    let nivel = 0
    let fim = -1
    for (let j = abre; j < limpo.length; j++) {
      if (limpo[j] === '(') nivel++
      else if (limpo[j] === ')' && --nivel === 0) {
        fim = j
        break
      }
    }
    if (fim === -1) return null
    saida.push(limpo.slice(abre + 1, fim))
    i = limpo.indexOf('toast.custom(', fim)
  }
  return saida
}

/**
 * A régua do conteúdo. Com o `<li>` de largura definida, quem ainda pode estourá-lo por dentro é
 * uma linha `nowrap` sem item de piso zero ao lado — o mesmo min-content, um nível abaixo.
 */
export const conteudoQueEmpurra = (jsx: string): string | null => {
  if (!temToken(jsx, 'truncate')) return null
  if (temToken(jsx, 'min-w-0')) return null
  return 'usa `truncate` sem `min-w-0` no item que encolhe — a linha inteira vira o mínimo do cartão'
}

interface Arquivo {
  nome: string
  fonte: string
}

const arquivosDe = (relativo: string): Arquivo[] => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules' || entrada.name === '__tests__') continue
        andar(caminho)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name)) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').split('/src/')[1] ?? entrada.name,
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
}

describe('o aviso do sonner cabe no trilho', () => {
  const classes = classesDoToast(readFileSync(resolve(ROOT, FONTE_DO_TOASTER), 'utf8'))
  const arquivos = ESCOPO.flatMap(arquivosDe)
  const comToastCustom = arquivos
    .map(a => ({ ...a, chamadas: chamadasDeToastCustom(a.fonte) }))
    .filter(a => a.chamadas === null || a.chamadas.length > 0)

  // ── Âncora dupla do Toaster: o arquivo foi lido, E a string de classes foi recortada. Sem a
  // segunda metade, um recorte que devolvesse '' deixaria a asserção de largura verde sobre
  // string vazia — a pior falha possível num guarda que lê disco.
  it(`recorta a classe do toast em ${FONTE_DO_TOASTER}`, () => {
    expect(classes.length).toBeGreaterThan(40)
    expect(classes, 'a string lida não é a do `<li>` do toast').toContain(
      'group-[.toaster]:bg-background',
    )
  })

  it('o `<li>` do toast declara largura', () => {
    expect(larguraIndefinida(classes), larguraIndefinida(classes) ?? '').toBeNull()
  })

  // ── Âncora do outro lado: a varredura precisa ACHAR quem chama `toast.custom`. Zero chamadas
  // encontradas não é "está tudo certo", é régua varrendo o diretório errado.
  it('acha quem chama `toast.custom` nos dois apps', () => {
    expect(arquivos.length).toBeGreaterThan(300)
    expect(comToastCustom.length).toBeGreaterThan(0)
    for (const { nome, chamadas } of comToastCustom) {
      expect(chamadas, `${nome}: parêntese não fechou, e o recorte é cego`).not.toBeNull()
    }
  })

  it('nenhum conteúdo de `toast.custom` empurra a largura por dentro', () => {
    for (const { nome, chamadas } of comToastCustom) {
      for (const jsx of chamadas ?? []) {
        expect(conteudoQueEmpurra(jsx), `${nome}: ${conteudoQueEmpurra(jsx) ?? ''}`).toBeNull()
      }
    }
  })

  // ── Sensores. Sem eles, um regex que perdesse tudo passaria como "guarda verde" e o aviso
  // voltaria a sair pela direita da janela com a suíte inteira no azul.
  it('SENSOR — a declaração ANTERIOR à correção reprova na mesma régua', () => {
    expect(larguraIndefinida('group toast group-[.toaster]:bg-background')).not.toBeNull()
  })

  it('SENSOR — `w-full` casa por token, nunca por prefixo', () => {
    expect(larguraIndefinida('group toast w-fulls')).not.toBeNull()
    expect(larguraIndefinida('group toast w-full-x')).not.toBeNull()
  })

  it('SENSOR — menção em comentário NÃO conta como declaração', () => {
    const mentiroso = [
      '        classNames: {',
      '          /* a largura vem de `w-full`, declarado abaixo */',
      '          toast: "group toast group-[.toaster]:bg-background",',
      '        },',
    ].join('\n')
    expect(larguraIndefinida(classesDoToast(mentiroso))).not.toBeNull()
  })

  it('SENSOR — o removedor de comentário não engole a linha seguinte, em CRLF nem em LF', () => {
    for (const quebra of ['\r\n', '\n']) {
      const fonte = ['          // a classe de largura', '          toast: "group toast w-full",'].join(
        quebra,
      )
      expect(classesDoToast(fonte)).toBe('group toast w-full')
    }
  })

  it('SENSOR — recorte ilegível devolve vazio e derruba a âncora, em vez de passar calado', () => {
    expect(classesDoToast('const Toaster = () => null')).toBe('')
  })

  it('SENSOR — parêntese que não fecha devolve `null`, em vez de lista vazia', () => {
    expect(chamadasDeToastCustom('toast.custom(() => <div className="truncate">')).toBeNull()
    expect(chamadasDeToastCustom('const x = 1')).toEqual([])
  })

  it('SENSOR — a régua do conteúdo acusa `truncate` sozinho e absolve o par', () => {
    expect(conteudoQueEmpurra('<p className="truncate text-sm">{nome}</p>')).not.toBeNull()
    expect(
      conteudoQueEmpurra('<div className="min-w-0 flex-1"><p className="truncate">{nome}</p></div>'),
    ).toBeNull()
    expect(conteudoQueEmpurra('<p className="text-sm">{nome}</p>')).toBeNull()
  })

  // ── A âncora final: prova que `w-full` É largura NESTE projeto, em vez de confiar no que o
  // comentário afirma. Se o preset redefinir a chave, o guarda cai junto.
  it('`w-full` compila para `width: 100%` no preset deste repositório', () => {
    const tema = resolveConfig({ presets: [preset], content: [] } as never).theme
    // A tipagem do `resolveConfig` colapsa `width` em `never` (a chave aceita função no tema), e
    // `tsc` recusaria a leitura. O molde declara a forma que o teste lê; o valor continua vindo do
    // preset, não daqui — se a chave sumir, `full` vem `undefined` e a asserção reprova.
    const largura = (tema as unknown as { width: Record<string, string> }).width
    expect(largura.full).toBe('100%')
  })
})
