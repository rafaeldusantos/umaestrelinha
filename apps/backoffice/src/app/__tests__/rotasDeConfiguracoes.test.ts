// Feature 55 — as duas rotas de Configurações, e a FORMA delas.
//
// `rotasSobGuarda.test.ts` já prova que toda rota `/admin/*` está sob o `RequireAdmin`, e prova
// também que o `App.tsx` tem **exatamente um** `</Route>` — porque é assim que ele recorta o bloco
// guardado. Este arquivo guarda o outro lado da mesma moeda: que as rotas desta feature existem, e
// que existem na forma que não derruba aquele recorte.
//
// A forma idiomática do react-router para "uma tela com um parâmetro opcional" é uma rota-mãe com
// filhos aninhados (`<Route path="…"><Route path=":secao" /></Route>`). Ela é o que qualquer pessoa
// escreveria — inclusive ao "arrumar" este arquivo — e é exatamente a que faz o
// `indexOf('</Route>')` do outro guarda fechar no lugar errado: ele passaria a medir só até o
// primeiro fechamento, e rotas do painel ficariam fora da varredura **sem nada acusar**.
//
// Por isso a régua aqui é de forma, não só de presença.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SETTINGS_ROOT } from '@/shared/lib/settingsSections'

const APP = resolve(process.cwd(), 'src/app/App.tsx')
const fonte = readFileSync(APP, 'utf8')

/**
 * Remove comentário de linha e de bloco na MESMA varredura.
 *
 * O arquivo explica em prosa, ao lado das rotas, por que elas não podem ser aninhadas — e essa
 * explicação escreve a forma proibida. Sem esta limpeza o guarda acusaria justamente o arquivo que
 * está certo. `[^\n\r]` fecha antes do `\r` para o CRLF do Windows não engolir a linha seguinte.
 */
const semComentario = (texto: string): string =>
  texto.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const codigo = semComentario(fonte)

/**
 * As rotas declaradas, na ordem textual, com a **forma** (auto-fechada ou não).
 *
 * Não é um regex, e a primeira escrita deste arquivo mostrou por quê: `element={<X />}` contém um
 * `/>` DENTRO da própria tag, então qualquer régua preguiçosa (`[\s\S]*?(\/>|>)`) fecha ali e
 * declara **toda** rota auto-fechada — inclusive a aninhada, que é a única coisa que este guarda
 * existe para recusar. As asserções principais passariam em cima do nada; quem acusou foram os dois
 * sensores abaixo.
 *
 * Então o fim da tag é encontrado caminhando, com profundidade de `{}` e ciência de string: só um
 * `>` em profundidade zero fecha a tag.
 */
const rotas = (texto: string): { path: string; autoFechada: boolean }[] => {
  const encontradas: { path: string; autoFechada: boolean }[] = []

  for (const inicio of [...texto.matchAll(/<Route\b/g)].map(m => m.index!)) {
    let profundidade = 0
    let aspas: string | null = null
    let i = inicio + '<Route'.length

    for (; i < texto.length; i++) {
      const c = texto[i]
      if (aspas) {
        if (c === aspas) aspas = null
        continue
      }
      if (c === '"' || c === "'") { aspas = c; continue }
      if (c === '{') { profundidade++; continue }
      if (c === '}') { profundidade--; continue }
      if (profundidade === 0 && c === '>') break
    }

    const tag = texto.slice(inicio, i + 1)
    // O espaço antes de `path` é o que impede `loginPath="/admin/login"` (do `RequireAdmin`) de ser
    // lido como o caminho de uma rota.
    const path = tag.match(/\spath="([^"]+)"/)?.[1]
    if (path) encontradas.push({ path, autoFechada: tag.endsWith('/>') })
  }

  return encontradas
}

const ROTA_DA_SECAO = `${SETTINGS_ROOT}/:secao`

describe('as rotas de Configurações — âncora', () => {
  it('o `App.tsx` foi lido e tem conteúdo', () => {
    expect(fonte.length).toBeGreaterThan(2000)
  })

  it('a varredura encontra rotas, e mais de uma', () => {
    // Sem esta âncora, um regex que parasse de casar varreria zero rota e as asserções de forma
    // abaixo passariam sobre o nada — que é a pior falha possível num guarda de varredura.
    expect(rotas(codigo).length).toBeGreaterThan(15)
  })
})

describe('as duas rotas existem e apontam para a mesma tela (CFG-15, CFG-16, CFG-17)', () => {
  it('a rota-mãe está declarada', () => {
    expect(rotas(codigo).map(r => r.path)).toContain(SETTINGS_ROOT)
  })

  it('a rota da seção está declarada, logo depois da mãe', () => {
    const caminhos = rotas(codigo).map(r => r.path)
    expect(caminhos).toContain(ROTA_DA_SECAO)
    expect(caminhos.indexOf(ROTA_DA_SECAO)).toBe(caminhos.indexOf(SETTINGS_ROOT) + 1)
  })

  it('as duas montam o MESMO componente', () => {
    // Componentes diferentes seriam duas telas de Configurações — o "defeito 01" no tamanho de uma
    // rota. E `react-router` reconcilia por posição: com o mesmo `element`, trocar de seção não
    // remonta a página, só o painel.
    const elemento = (path: string) => {
      const escapado = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return codigo.match(new RegExp(`<Route\\s+path="${escapado}"\\s+element=\\{<(\\w+)`))?.[1]
    }

    expect(elemento(SETTINGS_ROOT)).toBe('AdminSettingsPage')
    expect(elemento(ROTA_DA_SECAO)).toBe('AdminSettingsPage')
  })

  it('NÃO há redirect da rota-mãe (CFG-17)', () => {
    // A rota-mãe renderiza conteúdo por si. Um `<Navigate>` a trocaria pelo endereço da primeira
    // seção, e o item do rodapé da sidebar passaria a apontar para um lugar que ele não nomeia.
    expect(codigo).not.toMatch(/<Navigate/)
  })
})

describe('a FORMA: irmãs auto-fechadas, nunca aninhadas', () => {
  it('as duas rotas de Configurações são auto-fechadas', () => {
    for (const path of [SETTINGS_ROOT, ROTA_DA_SECAO]) {
      const rota = rotas(codigo).find(r => r.path === path)
      expect(rota, `rota ${path}`).toBeDefined()
      expect(rota!.autoFechada, `rota ${path} precisa ser auto-fechada`).toBe(true)
    }
  })

  it('continua havendo exatamente UM `</Route>` no arquivo', () => {
    // A mesma asserção de `rotasSobGuarda.test.ts`, repetida aqui de propósito: lá ela protege o
    // recorte, aqui ela é a consequência direta da forma que esta feature escolheu. Se alguém
    // aninhar estas duas rotas, os DOIS arquivos reprovam — e o segundo diz por quê.
    expect((codigo.match(/<\/Route>/g) ?? []).length).toBe(1)
  })

  it('SENSOR: a forma aninhada REPROVA na mesma régua', () => {
    // A mutação exata que este guarda existe para impedir — o par de irmãs reescrito como mãe com
    // filha, que é o que alguém escreveria ao "arrumar" o arquivo —, medida contra a régua de
    // verdade e não simulada.
    const mae = `<Route path="${SETTINGS_ROOT}" element={<AdminSettingsPage />} />`
    const filha = `<Route path="${ROTA_DA_SECAO}" element={<AdminSettingsPage />} />`

    // Uma mutação que não acha o alvo vira no-op em silêncio, e o sensor passa a provar nada — foi
    // o que o helper `mutar()` da feature 52 nasceu para impedir. Aqui a exigência é explícita.
    expect(codigo).toContain(mae)
    expect(codigo).toContain(filha)

    const aninhado = codigo
      .replace(filha, '')
      .replace(
        mae,
        `<Route path="${SETTINGS_ROOT}" element={<AdminSettingsPage />}>` +
          `<Route path=":secao" element={<AdminSettingsPage />} /></Route>`,
      )

    expect(aninhado).not.toBe(codigo)
    expect((aninhado.match(/<\/Route>/g) ?? []).length).toBe(2)
    expect(rotas(aninhado).find(r => r.path === SETTINGS_ROOT)!.autoFechada).toBe(false)
  })

  it('SENSOR: a régua de forma distingue `/>` de `>` — não passa por acidente', () => {
    const umaAberta = '<Route path="/admin/teste" element={<X />}>'
    const umaFechada = '<Route path="/admin/teste" element={<X />} />'

    expect(rotas(umaAberta)[0].autoFechada).toBe(false)
    expect(rotas(umaFechada)[0].autoFechada).toBe(true)
  })

  it('SENSOR: o removedor de comentário não apaga código — com LF e com CRLF', () => {
    const rota = `<Route path="${ROTA_DA_SECAO}" element={<AdminSettingsPage />} />`

    for (const quebra of ['\n', '\r\n']) {
      const comProsa = `// nao pode ser aninhada${quebra}${rota}`
      expect(semComentario(comProsa)).toContain(rota)
    }
  })
})
