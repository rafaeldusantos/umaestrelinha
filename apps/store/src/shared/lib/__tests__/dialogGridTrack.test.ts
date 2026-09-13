import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import resolveConfig from 'tailwindcss/resolveConfig'
import preset from '../../../../../../packages/ui/tailwind.preset'

/**
 * O guarda da trilha dos diálogos — `packages/ui/src/dialog.tsx` e `alert-dialog.tsx`.
 *
 * **O defeito que ele recusa não quebra nada, e é por isso que ele existe.** Um `grid` sem trilha
 * declarada cria uma coluna implícita `auto`, cuja **base** é a maior contribuição de min-content
 * entre os filhos. Texto com `white-space: nowrap` — que é o que `truncate` faz — contribui com a
 * linha inteira, e nem `min-w-0` nem `overflow` no caminho derrubam essa contribuição: os dois dão
 * **piso zero ao item**, não **teto à contribuição**.
 *
 * Medido em navegador real no `AddQuestionDialog` (66 entradas, janela de 1280): trilha de
 * **1141,03px** dentro de um cartão de 660. O texto escapava pela direita, o `truncate` nunca
 * aparava nada, e o rodapé — `sm:justify-end` sobre 1084px — punha "Cancelar" e "Adicionar" ~440px
 * fora da tela. `pnpm build`, `tsc` e os testes de componente: todos verdes. **jsdom devolve 0 para
 * toda medida de layout**, então nenhuma suíte deste repositório encostaria nisso.
 *
 * Daí a forma da régua: ela lê o **fonte do disco** e procura a declaração, não o efeito. E os dois
 * arquivos são varridos porque `alert-dialog.tsx` é uma cópia literal da mesma linha do shadcn — o
 * "defeito 01" na sua forma mais barata de aparecer.
 *
 * **Mora na suíte da loja pelo mesmo motivo que `icons.test.ts`**: `packages/ui` não tem runner, e
 * guarda que não roda é pior que guarda nenhum. Os dois apps consomem estes dois componentes.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

const ALVOS = [
  { arquivo: 'packages/ui/src/dialog.tsx', componente: 'DialogContent' },
  { arquivo: 'packages/ui/src/alert-dialog.tsx', componente: 'AlertDialogContent' },
] as const

/**
 * Casa o **token inteiro**, e não o prefixo.
 *
 * `-` não é caractere de palavra, então `\b` não fecha nada: com `\bgrid\b`, a classe
 * `grid-cols-1` responderia por `grid`. É a mesma cicatriz de `L-034` e da régua do rótulo da
 * barra do menu na `39`.
 */
const temToken = (classes: string, token: string) =>
  new RegExp(String.raw`(?:^|\s)${token}(?![-\w])`).test(classes)

/**
 * A régua, escrita como **predicado** para a asserção e os sensores chamarem a mesma função.
 *
 * Devolve `null` quando a trilha tem piso zero, e o motivo quando não tem. Veredito com motivo é
 * `string | null` de propósito: com `strictNullChecks: false`, união discriminada por booleano
 * literal não estreita, e o ramo do motivo não compilaria.
 */
export const trilhaSemPiso = (classes: string): string | null => {
  if (!temToken(classes, 'grid')) return null // não declara `display: grid`: a régua não se aplica
  if (temToken(classes, 'grid-cols-1')) return null
  if (/(?:^|\s)grid-cols-\[[^\]]*minmax\(\s*0/.test(classes)) return null
  return 'declara `grid` sem trilha de piso zero — a coluna implícita `auto` cresce até o min-content do filho mais largo'
}

/** Extrai a string de classes do `cn(` do componente. Devolve '' quando não conseguir ler — e aí a âncora derruba. */
export const classesDe = (fonte: string, componente: string): string => {
  const inicio = fonte.indexOf(`const ${componente} = React.forwardRef<`)
  if (inicio === -1) return ''
  const achado = fonte.slice(inicio).match(/"(fixed[^"]*z-50[^"]*)"/)
  return achado ? achado[1] : ''
}

describe('a trilha dos diálogos tem piso zero', () => {
  const lidos = ALVOS.map(alvo => ({
    ...alvo,
    classes: classesDe(readFileSync(resolve(ROOT, alvo.arquivo), 'utf8'), alvo.componente),
  }))

  // ── Âncora dupla: os dois arquivos foram lidos, E a classe de cada um foi encontrada.
  // Sem a segunda metade, um `classesDe` que devolvesse '' deixaria as asserções abaixo verdes
  // sobre string vazia — a pior falha possível num guarda que lê disco.
  it('varre os DOIS componentes e acha a classe de cada um', () => {
    expect(lidos).toHaveLength(2)
    for (const { arquivo, classes } of lidos) {
      expect(classes.length, `${arquivo}: não consegui ler a string de classes`).toBeGreaterThan(200)
      expect(classes, `${arquivo}: a string lida não é a do contêiner`).toContain('max-w-lg')
    }
  })

  it.each(ALVOS.map(a => a.arquivo))('%s declara a trilha com piso zero', arquivo => {
    const { classes } = lidos.find(l => l.arquivo === arquivo)
    expect(trilhaSemPiso(classes), `${arquivo} ${trilhaSemPiso(classes) ?? ''}`).toBeNull()
  })

  // ── Sensores, nos dois sentidos. Sem o primeiro par, um regex que perdesse tudo passaria
  // como "guarda verde" e o cartão voltaria a estourar com a suíte inteira no azul.
  it('SENSOR — a declaração ANTERIOR à correção reprova na mesma régua', () => {
    const antes = 'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] gap-4 p-6'
    expect(trilhaSemPiso(antes)).not.toBeNull()
  })

  it('SENSOR — a declaração ATUAL, injetada à mão, passa', () => {
    const depois = 'fixed left-[50%] top-[50%] z-50 grid grid-cols-1 w-full max-w-lg gap-4 p-6'
    expect(trilhaSemPiso(depois)).toBeNull()
  })

  it('SENSOR — `grid-cols-2` não conta como piso zero', () => {
    expect(trilhaSemPiso('z-50 grid grid-cols-2 w-full max-w-lg')).not.toBeNull()
  })

  it('SENSOR — trilha arbitrária com `minmax(0,` passa', () => {
    expect(trilhaSemPiso('z-50 grid grid-cols-[minmax(0,1fr)] w-full')).toBeNull()
  })

  it('SENSOR — `grid` casa por token, nunca por prefixo', () => {
    // Com `includes('grid')`, o primeiro caso — que NÃO declara display grid — seria acusado.
    // Com `\b`, `grid-cols-10` responderia por `grid-cols-1` e o segundo passaria.
    expect(trilhaSemPiso('flex w-full max-w-lg gridiron')).toBeNull()
    expect(trilhaSemPiso('z-50 grid w-full grid-cols-10')).not.toBeNull()
  })

  it('SENSOR — classe ilegível devolve vazio e derruba a âncora, em vez de passar calada', () => {
    expect(classesDe('const Outra = React.forwardRef<>(() => null)', 'DialogContent')).toBe('')
  })

  // ── A quarta âncora: prova que `grid-cols-1` É uma trilha de piso zero NESTE projeto, em vez
  // de confiar no que o comentário afirma. Se o preset redefinir a chave, o guarda cai junto.
  it('`grid-cols-1` compila para uma trilha de mínimo zero no preset deste repositório', () => {
    const tema = resolveConfig({ presets: [preset], content: [] } as never).theme
    expect(tema.gridTemplateColumns['1']).toBe('repeat(1, minmax(0, 1fr))')
  })
})
