import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `POL-19` — **cada seção de política tem um declarante, e `/politicas` não é link de ninguém.**
 *
 * Este arquivo nasceu com TRÊS réguas e hoje tem duas. A primeira ("o índice `/politicas` não contém
 * prosa de política") morreu junto com a página: `/politicas` foi **removida da loja** por decisão do
 * usuário, e a spec desta feature registra `POL-15`/`POL-16` como superseded. Uma régua que guarda um
 * arquivo que não existe é pior que régua nenhuma — ela varre zero e passa.
 *
 * As duas que sobraram ficaram **mais** necessárias, não menos:
 *
 * 1. **Nenhum título de seção é declarado em dois arquivos de `pages/`.** São três documentos
 *    `PolicyDocument` agora — trocas, privacidade e cuidados com a joia —, e o par perigoso já está
 *    na árvore: "Cuidados com a peça" (dentro da política de trocas) e "Cuidados gerais com a joia"
 *    (a página de cuidados) falam do mesmo assunto. No dia em que as duas se chamarem igual, a loja
 *    terá duas instruções de conservação divergindo sem nada quebrar — o "defeito 01" do projeto.
 * 2. **Nada linka para `/politicas`.** Antes eram âncoras mortas (`#trocas`, `#privacidade`,
 *    `#termos` nunca tiveram `id`); agora a rota **não existe**, e um link remanescente é 404.
 *
 * **Âncora dupla** (`L-021`): arquivos lidos **e** títulos encontrados. Uma varredura que lê zero
 * arquivo passa em silêncio, que é a pior falha possível num teste deste tipo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGES_DIR = resolve(HERE, '..')
/** Escopo literal: a régua não pode ser derivada de uma constante do app que ela deveria guardar. */
const STORE_SRC = resolve(HERE, '../../../src')

const TROCAS = join(PAGES_DIR, 'ReturnsPolicyPage.tsx')
const PRIVACIDADE = join(PAGES_DIR, 'PrivacyPolicyPage.tsx')

const ler = (caminho: string): string => readFileSync(caminho, 'utf8')

/**
 * Remove comentário de linha e de bloco **na mesma varredura**, com CRLF normalizado ANTES.
 *
 * `L-031`: em JavaScript o `.` não casa `\r` e o `$` sem flag `m` não ancora antes dele, então num
 * checkout Windows um stripper escrito sem normalizar fica **inerte** — e o guarda passa a acusar a
 * própria prosa que explica o defeito. Este arquivo é o exemplo vivo: o cabeçalho acima cita
 * `/politicas#trocas`, que é uma das formas proibidas.
 */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

/** Todo arquivo `.tsx` de `pages/`, fora dos testes. */
const paginas = (): { nome: string; fonte: string }[] =>
  readdirSync(PAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
    .map((e) => ({ nome: e.name, fonte: ler(join(PAGES_DIR, e.name)) }))

/** Todo `.tsx`/`.ts` de `apps/store/src`, fora de `__tests__`. */
const arquivosDaLoja = (dir: string = STORE_SRC): string[] => {
  const saida: string[] = []
  for (const entrada of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(dir, entrada.name)
    if (entrada.isDirectory()) {
      if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue
      saida.push(...arquivosDaLoja(caminho))
    } else if (/\.tsx?$/.test(entrada.name)) {
      saida.push(caminho)
    }
  }
  return saida
}

/** `titulo="…"` de `PolicySection` e `PolicySubsection` — quem DECLARA uma seção de política. */
const titulosDeclarados = (fonte: string): string[] =>
  [...semComentarios(fonte).matchAll(/<Policy(?:Section|Subsection)\s+titulo="([^"]+)"/g)].map(
    (m) => m[1],
  )

/**
 * Qualquer referência a `/politicas` em string de código — com ou sem fragmento.
 *
 * `\b(?![-\w])` e não `\b` sozinho: `-` não é caractere de palavra, então `\b` **não fecha nada** e
 * `/politicas-de-trocas-e-devolucoes` seria acusado junto (`L-034`). O recorte tem de aceitar o
 * endereço vivo e recusar só o morto.
 */
const REF_POLITICAS = /['"`]\/politicas(?![-\w])/

describe('politicaComDonoUnico — âncoras da varredura (L-021)', () => {
  it('leu os arquivos de política de verdade', () => {
    // Primeira metade. Um caminho errado devolveria string vazia e TODA asserção de ausência abaixo
    // passaria por vacuidade — o no-op verde.
    for (const caminho of [TROCAS, PRIVACIDADE]) {
      expect(ler(caminho).length).toBeGreaterThan(1000)
    }
  })

  it('a régua ENCONTRA os títulos que deveria encontrar', () => {
    // Segunda metade: um regex quebrado varre tudo e não acha nada, e a comparação de duplicata
    // abaixo compararia listas vazias. As contagens são das DUAS páginas desta feature; a de
    // cuidados com a joia é de outra, e ancorá-la aqui faria esta suíte quebrar quando aquela mudar.
    expect(titulosDeclarados(ler(TROCAS))).toHaveLength(11)
    expect(titulosDeclarados(ler(PRIVACIDADE))).toHaveLength(9)
    expect(titulosDeclarados(ler(TROCAS))).toContain('Cuidados com a peça')
  })

  it('há pelo menos TRÊS documentos de política na loja', () => {
    // O que torna a régua de duplicata necessária é haver mais de um declarante. Se este número cair
    // para um, a comparação abaixo vira verdadeira por construção e alguém precisa saber.
    const declarantes = paginas().filter(({ fonte }) => titulosDeclarados(fonte).length > 0)
    expect(declarantes.length).toBeGreaterThanOrEqual(3)
  })

  it('a varredura da loja alcança as duas pontas do escopo', () => {
    // `L-035`: guarda com alcance menor que a regra é allowlist com outro nome. A âncora NOMEIA um
    // arquivo de cada ponta — uma `page` e um `widget` —, então encolher o escopo derruba isto.
    const arquivos = arquivosDaLoja().map((f) => f.replace(/\\/g, '/'))
    expect(arquivos.length).toBeGreaterThan(200)
    expect(arquivos.some((f) => f.endsWith('src/pages/ReturnsPolicyPage.tsx'))).toBe(true)
    expect(arquivos.some((f) => f.endsWith('src/widgets/footer/ui/Footer.tsx'))).toBe(true)
  })
})

describe('politicaComDonoUnico — nenhum título tem dois declarantes (POL-19)', () => {
  it('cada seção de política é declarada em UM arquivo de `pages/`', () => {
    const porTitulo = new Map<string, string[]>()
    for (const { nome, fonte } of paginas()) {
      for (const titulo of titulosDeclarados(fonte)) {
        porTitulo.set(titulo, [...(porTitulo.get(titulo) ?? []), nome])
      }
    }

    const duplicados = [...porTitulo.entries()]
      .filter(([, arquivos]) => arquivos.length > 1)
      .map(([titulo, arquivos]) => `${titulo} — declarado em ${arquivos.join(' e ')}`)

    expect(
      duplicados,
      'duas seções com o mesmo título são duas instruções que vão divergir',
    ).toEqual([])
  })

  it('sensor: duas declarações do mesmo título são visíveis para a régua', () => {
    const a = '<PolicySection titulo="Cuidados com a peça">'
    const b = '<PolicySection titulo="Cuidados com a peça">'
    expect([...titulosDeclarados(a), ...titulosDeclarados(b)]).toEqual([
      'Cuidados com a peça',
      'Cuidados com a peça',
    ])
  })

  it('a régua procura DECLARAÇÃO, nunca menção', () => {
    // Proibir a menção proibiria uma política de citar a outra — que é exatamente o uso legítimo.
    // Mesma distinção de `donoUnicoDoGuia.test.ts`.
    expect(titulosDeclarados('<p>Veja Cuidados com a peça na outra política</p>')).toEqual([])
  })
})

describe('politicaComDonoUnico — `/politicas` não é link de ninguém (POL-17)', () => {
  it('nenhum arquivo da loja linka para `/politicas`, com ou sem fragmento', () => {
    const ofensores = arquivosDaLoja()
      .map((caminho) => ({ caminho, fonte: semComentarios(ler(caminho)) }))
      .filter(({ fonte }) => REF_POLITICAS.test(fonte))
      .map(({ caminho }) => caminho.replace(/\\/g, '/').split('/src/')[1])

    expect(
      ofensores,
      'a rota `/politicas` foi REMOVIDA da loja — todo link para ela é 404',
    ).toEqual([])
  })

  it('sensor: o `to="/politicas#trocas"` que o rodapé tinha é acusado', () => {
    const sintetico = '<FooterLink to="/politicas#trocas">Trocas e devoluções</FooterLink>'
    expect(REF_POLITICAS.test(semComentarios(sintetico))).toBe(true)
  })

  it('sensor: o `to="/politicas"` sem fragmento TAMBÉM é acusado', () => {
    // A régua antiga só pegava `/politicas#`. Com a rota removida, o endereço nu é igualmente 404 —
    // e é a forma que sobreviveria a um "tirei as âncoras" feito pela metade.
    const sintetico = '<FooterLink to="/politicas">Políticas</FooterLink>'
    expect(REF_POLITICAS.test(semComentarios(sintetico))).toBe(true)
  })

  it('sensor inverso: as duas políticas VIVAS não são acusadas (L-034)', () => {
    // `'/politicas-de-trocas-e-devolucoes'` começa com `/politicas`, e `\b` não fecha nada quando o
    // vizinho é hífen. Sem o `(?![-\w])`, esta régua apagaria o link que ela existe para proteger.
    expect(REF_POLITICAS.test('to="/politicas-de-trocas-e-devolucoes"')).toBe(false)
    expect(REF_POLITICAS.test('to="/politica-de-privacidade"')).toBe(false)
  })

  it('sensor de comentário: a prosa que EXPLICA o defeito não é acusada', () => {
    // O cabeçalho deste arquivo cita `/politicas#trocas`. Um stripper inerte acusaria o próprio
    // guarda.
    const corpo = '// veja /politicas#trocas\nconst a = 1'
    expect(REF_POLITICAS.test(semComentarios(`const x = "/politicas"`))).toBe(true)
    expect(REF_POLITICAS.test(semComentarios(corpo))).toBe(false)
  })

  it('sensor de CRLF e de bloco: o stripper funciona nas duas quebras e nas duas formas (L-031)', () => {
    const linha = '// to="/politicas"\nconst a = 1'
    const bloco = '/* to="/politicas" */\nconst a = 1'
    expect(REF_POLITICAS.test(semComentarios(linha))).toBe(false)
    expect(REF_POLITICAS.test(semComentarios(linha.replace(/\n/g, '\r\n')))).toBe(false)
    expect(REF_POLITICAS.test(semComentarios(bloco))).toBe(false)
  })
})
