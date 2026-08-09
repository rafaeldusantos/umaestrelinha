import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A varredura de marca — `REN-05`.
 *
 * Este é o juiz que o rename de tema não tem por natureza. Trocar
 * `nanita-jam` por `estrelinha-primary` e esquecer um arquivo **não quebra
 * nada**: a classe deixa de existir, o elemento sai sem cor, e o build, o
 * `tsc` e todo teste de componente passam. Quem descobre é a cliente.
 *
 * Por isso a varredura lê o fonte **do disco** e conta o que leu. Uma
 * varredura apontada para o caminho errado varre zero arquivo e passa em
 * silêncio — que é a pior falha possível num teste deste tipo.
 *
 * ## As duas listas, e por que são duas
 *
 * `ALLOWLIST` é permanente e mínima: arquivos onde a string da marca anterior
 * é o **assunto**, não resíduo.
 *
 * `PENDENTE` é temporária e tem dono. Ela existe porque esta varredura nasce
 * na Fase 3, e a marca em SVG (Fase 4), o chrome (Fase 5) e a copy, o e-mail e
 * o `config.toml` (Fase 6) ainda não foram convertidos. Cada entrada nomeia a
 * task que a remove, e **a lista se autodestrói**: assim que um arquivo é
 * limpo, o teste `nenhuma entrada de PENDENTE ficou obsoleta` falha até que a
 * linha saia daqui. Ela não pode virar allowlist por esquecimento.
 *
 * O que as duas NÃO fazem é esconder resíduo novo: qualquer arquivo fora
 * delas com uma ocorrência derruba a suíte, com caminho e linha.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** O que a varredura procura, sem distinguir maiúscula de minúscula. */
const MARCA = /nanapin|nanita|nana/i

/**
 * Onde ela procura — `REN-05` AC 1.
 *
 * `.specs/` fica **deliberadamente de fora**, e é o que faz as vezes de allowlist do arquivo
 * (`DOC-03`): desde a T39, a documentação da loja anterior mora inteira em
 * `.specs/archive/nanita/` e **precisa** citar a marca — ela é o assunto de lá. Uma allowlist
 * arquivo a arquivo seriam ~200 entradas para dizer a mesma coisa que uma exclusão de diretório
 * diz melhor. O que se perde é varrer `.specs/features/2x`, e o que se ganha é que nenhuma spec
 * futura precise pedir licença para citar a história.
 *
 * O código, esse sim, é varrido inteiro — e é onde a marca não pode voltar.
 */
const ESCOPO = ['apps', 'packages', 'supabase', 'tools']

/** O arquivo do histórico, que a exclusão acima protege. Existe para o teste de escopo abaixo. */
const ARQUIVO_DA_NANITA = '.specs/archive/nanita'
const ARQUIVOS_DA_RAIZ = ['package.json', 'tsconfig.base.json', 'turbo.json', 'pnpm-workspace.yaml']

/** Diretórios que não são fonte: artefato de build, dependência, runtime. */
const IGNORADOS = new Set([
  'node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git',
  // Saída do importador de catálogo (feature 21), ambos gitignorados: `reports` guarda o relatório
  // de cada execução e `.cache` os bytes das imagens baixadas. O relatório NOMEIA as categorias
  // desativadas por curadoria, e uma delas tem a marca anterior como slug na loja de origem — então
  // varrer a saída acusaria o dado do negócio, não resíduo no código.
  'reports', '.cache',
])

/** Só arquivos de texto que a equipe edita. */
const EXTENSOES = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.css', '.html', '.sql', '.toml', '.md', '.svg', '.yaml', '.yml']

/**
 * Permanente. Cada entrada existe porque a string ali é o ASSUNTO do arquivo.
 * Entrada nova exige o motivo escrito — a lista existe para forçar quem
 * adicionar a justificar, não para amansar o teste.
 */
const ALLOWLIST: Record<string, string> = {
  // Este arquivo cita as strings que procura. Sem a exceção, ele se acusa.
  'apps/store/src/shared/lib/__tests__/brandScan.test.ts':
    'A varredura precisa nomear o que procura.',
  // Captura literal da resposta da API da Nuvemshop (feature 21). A loja REAL tem uma categoria
  // "Brinquedos" cujo handle é a marca anterior — o resíduo está no catálogo do negócio, não no
  // código. Editar a fixture para calar a varredura destruiria a única coisa que ela vale: ser
  // idêntica ao que o servidor devolve. O importador desativa essa categoria por curadoria, e a
  // lista `CURATED_INACTIVE` é chaveada por `nuvemshop_id` justamente para que a string não
  // precise aparecer em nenhum `.ts` de produção.
  'tools/catalog-import/src/__fixtures__/categories.json':
    'Captura da API real: a marca é o dado devolvido pelo servidor, não resíduo do repositório.',
}

/**
 * Temporária, com dono. NÃO acrescente entrada aqui para calar a varredura:
 * uma linha nova só se justifica se a conversão daquele arquivo pertencer,
 * comprovadamente, a uma task posterior desta feature.
 */
const PENDENTE: Record<string, string> = {
  // VAZIA desde a T38, que fechou a varredura. Ela existiu porque este teste nasceu
  // na Fase 3, com a marca em SVG, o chrome, o e-mail e a copy ainda por converter —
  // 42 arquivos, cada um com dono declarado. Todos saíram.
  //
  // Entrada nova aqui exige uma task desta feature que ainda não rodou. Fora disso,
  // resíduo é resíduo: conserte o arquivo.
}

function arquivos(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })
}

function alvos(): string[] {
  const daRaiz = ARQUIVOS_DA_RAIZ.map((nome) => join(ROOT, nome))
  return [...ESCOPO.flatMap((dir) => arquivos(join(ROOT, dir))), ...daRaiz]
}

function rel(caminho: string): string {
  return relative(ROOT, caminho).replace(/\\/g, '/')
}

/**
 * Toda ocorrência, com caminho e linha — a falha precisa dizer ONDE.
 *
 * Memorizado porque quatro testes perguntam pelos MESMOS arquivos: sem o cache
 * são 400+ leituras síncronas vezes três, e sob `pnpm test` (quatro workspaces
 * em paralelo nesta máquina) isso estourou o limite de 5s do vitest — uma
 * varredura vermelha por lentidão, não por resíduo.
 */
const cache = new Map<string, string[]>()
function ocorrencias(caminho: string): string[] {
  const guardado = cache.get(caminho)
  if (guardado) return guardado
  const achados = readFileSync(caminho, 'utf8')
    .split('\n')
    .flatMap((linha, i) => (MARCA.test(linha) ? [`${rel(caminho)}:${i + 1}  ${linha.trim().slice(0, 90)}`] : []))
  cache.set(caminho, achados)
  return achados
}

/** Ler 400+ arquivos do disco leva segundos; o default de 5s é para teste de
 *  unidade, não para varredura de repositório. Nenhuma asserção muda com isto. */
const LIMITE_DA_VARREDURA = 60_000

const arquivosVarridos = alvos()

describe('varredura de marca — âncora', () => {
  it('varre os arquivos do repositório', () => {
    // Sem esta âncora, um erro de caminho faz a varredura ler zero arquivo,
    // reportar zero resíduo e passar. Provado apontando `ROOT` para um
    // diretório inexistente: o teste falha, não passa.
    expect(arquivosVarridos.length).toBeGreaterThan(400)
  })

  it('varre os quatro diretórios do escopo e os arquivos da raiz', () => {
    // Os nomes estão escritos AQUI de propósito, e não lidos de `ESCOPO`.
    // Uma âncora que itera a mesma constante que deveria guardar encolhe junto
    // com ela: tirar `supabase` do escopo faria a asserção parar de exigi-lo, e
    // a varredura passaria a ignorar todo o backend em silêncio. É a mesma
    // forma do furo que a `fieldBorder` tinha — a régua e o objeto medido não
    // podem ser a mesma coisa.
    //
    // `tools` entrou na feature 21, que criou um QUARTO diretório de fonte. Um
    // ponto cego aberto por uma feature é dívida dessa feature: sem esta linha,
    // o importador — que grava no banco com service role — não seria varrido.
    for (const dir of ['apps', 'packages', 'supabase', 'tools']) {
      expect(arquivosVarridos.filter((f) => rel(f).startsWith(`${dir}/`)).length).toBeGreaterThan(10)
    }
    expect(arquivosVarridos.filter((f) => !rel(f).includes('/')).length).toBe(ARQUIVOS_DA_RAIZ.length)
  })

  it('não varre o arquivo da loja anterior — e ele existe (DOC-03)', () => {
    // A exclusão só é uma DECISÃO enquanto o arquivo existir. Se alguém apagar
    // `.specs/archive/nanita/`, a história some e este teste avisa; se alguém
    // puser `.specs` no escopo, a varredura passa a acusar ~200 arquivos cujo
    // assunto é justamente a marca anterior, e a saída fácil seria uma allowlist
    // gigante. As duas metades precisam ser asseridas juntas.
    expect(existsSync(join(ROOT, ARQUIVO_DA_NANITA, 'README.md'))).toBe(true)
    expect(arquivosVarridos.filter((f) => rel(f).startsWith('.specs/'))).toEqual([])
  })
})

describe('varredura de marca — resíduo', () => {
  it('nenhum arquivo fora das duas listas cita a marca anterior', () => {
    const encontrados = arquivosVarridos
      .filter((f) => !(rel(f) in ALLOWLIST) && !(rel(f) in PENDENTE))
      .flatMap(ocorrencias)

    expect(encontrados).toEqual([])
  }, LIMITE_DA_VARREDURA)

  it('nenhuma entrada de PENDENTE ficou obsoleta', () => {
    // É o que faz a lista se autodestruir. Sem isto, um arquivo já convertido
    // segue liberado, e o próximo resíduo entra nele sem ninguém ver.
    const limpos = Object.keys(PENDENTE).filter((f) => {
      const cheio = join(ROOT, f)
      return !arquivosVarridos.includes(cheio) || ocorrencias(cheio).length === 0
    })

    expect(limpos).toEqual([])
  }, LIMITE_DA_VARREDURA)

  it('nenhuma entrada de ALLOWLIST ficou obsoleta', () => {
    const limpos = Object.keys(ALLOWLIST).filter((f) => ocorrencias(join(ROOT, f)).length === 0)

    expect(limpos).toEqual([])
  })

  it('toda entrada de PENDENTE nomeia a task que a remove', () => {
    // Sem dono, "pendente" vira "permanente".
    const semDono = Object.entries(PENDENTE)
      .filter(([, motivo]) => !/^T\d+[a-z]?/.test(motivo))
      .map(([arquivo]) => arquivo)

    expect(semDono).toEqual([])
  })
})
