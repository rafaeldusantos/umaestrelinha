import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * O domínio do remetente do auth — `FIX-01` (feature 42, defeito D1).
 *
 * Até 2026-09-06, `supabase/config.toml`, `.env.example` e `supabase/CLAUDE.md` mandavam ligar o
 * SMTP do auth com um remetente num subdomínio `send.` que **nunca foi criado na conta Resend**. O
 * único domínio verificado é `loja.umaestrelinha.com.br` (medido via `GET /domains`: `status:
 * verified`, região `sa-east-1`). Seguir o passo escrito repetiria o `BUG-20260728`: remetente
 * recusado derruba todo login por código.
 *
 * Errar aqui não quebra nada — é texto de configuração e documentação. Por isso a régua lê o
 * repositório **do disco** e conta o que leu: uma varredura apontada para o caminho errado varre
 * zero arquivo e passa em silêncio, que é a pior falha possível num teste deste tipo. Molde:
 * `brandScan.test.ts`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O domínio antigo, montado em pedaços de propósito: escrito inteiro, este arquivo seria a única
 * ocorrência do repositório e o `grep` do AC (FIX-01, "devolve 0") nunca fecharia. O sensor abaixo
 * prova que a régua montada casa o literal de verdade.
 */
const DOMINIO_ANTIGO = new RegExp(['send', 'umaestrelinha', 'com', 'br'].join('\\.'), 'i')
const DOMINIO_VERIFICADO = /loja\.umaestrelinha\.com\.br/

/** O que a spec exige do `admin_email` — AC 1 da story "A base para de mentir". */
const REMETENTE_DO_AUTH = 'acesso@loja.umaestrelinha.com.br'

/**
 * Onde a varredura procura — o repositório inteiro, fora de `.specs/` (a história da feature cita
 * o domínio antigo como ASSUNTO, e é o único lugar onde ele pode viver). Escrito literalmente,
 * como no `brandScan`: uma âncora que itera a constante que deveria guardar encolhe junto com ela.
 */
const ESCOPO = ['apps', 'packages', 'supabase', 'tools', 'docs', '.github']
const ARQUIVOS_DA_RAIZ = [
  '.env.example', 'CLAUDE.md', 'DESIGN.md', 'README.md',
  'package.json', 'turbo.json', 'pnpm-workspace.yaml', 'tsconfig.base.json', 'eslint.fsd.mjs',
]

/** Diretórios que não são fonte: artefato de build, dependência, runtime. */
const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git', 'reports', '.cache'])
const EXTENSOES = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.css', '.html', '.sql', '.toml', '.md', '.svg', '.yaml', '.yml', '.txt']

/** Os três arquivos que a task reescreveu — a âncora os nomeia para que a falta de um acuse. */
const ARQUIVOS_QUE_PRESCREVEM_O_REMETENTE = ['.env.example', 'supabase/config.toml', 'supabase/CLAUDE.md']

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
 * A régua, pura sobre o TEXTO: toda linha com o domínio antigo, com nome e número. A varredura do
 * disco e o sensor chamam a mesma função — se a régua estiver cega, os dois enxergam o mesmo nada.
 */
function ocorrenciasNoTexto(texto: string, nome: string): string[] {
  return texto
    .split('\n')
    .flatMap((linha, i) => (DOMINIO_ANTIGO.test(linha) ? [`${nome}:${i + 1}  ${linha.trim().slice(0, 90)}`] : []))
}

const conteudo = new Map<string, string>()
function ler(caminho: string): string {
  const guardado = conteudo.get(caminho)
  if (guardado !== undefined) return guardado
  const texto = readFileSync(caminho, 'utf8')
  conteudo.set(caminho, texto)
  return texto
}

/** Ler centenas de arquivos leva segundos; o default de 5s é para teste de unidade. */
const LIMITE_DA_VARREDURA = 60_000

const arquivosVarridos = alvos()

describe('domínio do remetente do auth — âncora (FIX-01)', () => {
  it('varre o repositório, e alcança os três arquivos que prescrevem o remetente', () => {
    // Sem esta âncora, um erro de caminho faz a varredura ler zero arquivo, reportar zero resíduo
    // e passar. Os nomes dos diretórios estão escritos AQUI, não lidos de `ESCOPO`.
    expect(arquivosVarridos.length).toBeGreaterThan(400)
    for (const dir of ['apps', 'packages', 'supabase', 'tools']) {
      expect(arquivosVarridos.filter((f) => rel(f).startsWith(`${dir}/`)).length).toBeGreaterThan(10)
    }
    for (const dir of ['docs', '.github']) {
      expect(arquivosVarridos.filter((f) => rel(f).startsWith(`${dir}/`)).length).toBeGreaterThan(0)
    }
    expect(arquivosVarridos.filter((f) => !rel(f).includes('/')).length).toBe(ARQUIVOS_DA_RAIZ.length)
    expect(arquivosVarridos.filter((f) => rel(f).startsWith('.specs/'))).toEqual([])

    // A segunda metade da âncora: a varredura LEU os arquivos onde o remetente vive, e eles citam o
    // domínio verificado. Se um deles sumir da leitura, a regra abaixo passaria vazia.
    const comDominioVerificado = arquivosVarridos.filter((f) => DOMINIO_VERIFICADO.test(ler(f))).map(rel)
    expect(comDominioVerificado.length).toBeGreaterThanOrEqual(3)
    for (const arquivo of ARQUIVOS_QUE_PRESCREVEM_O_REMETENTE) {
      expect(comDominioVerificado).toContain(arquivo)
    }
  }, LIMITE_DA_VARREDURA)
})

describe('domínio do remetente do auth — regra (FIX-01)', () => {
  it('nenhum arquivo do repositório cita o domínio antigo', () => {
    const encontrados = arquivosVarridos.flatMap((f) => ocorrenciasNoTexto(ler(f), rel(f)))

    expect(encontrados).toEqual([])
  }, LIMITE_DA_VARREDURA)

  it('o `admin_email` do config.toml é o remetente que a spec exige, e o .env.example cita o mesmo', () => {
    // O bloco `[auth.email.smtp]` está comentado de propósito (o SMTP nasce desligado); a régua
    // aceita o bloco com ou sem o `#`, porque é o VALOR que não pode divergir. E lê o `admin_email`
    // que segue o cabeçalho do bloco — o esqueleto do CLI carrega outro, `admin@email.com`, na
    // seção `[auth.email]`, que não é o remetente de ninguém.
    const configToml = ler(join(ROOT, 'supabase/config.toml'))
    // O cabeçalho numa LINHA própria — a prose ao redor cita `[auth.email.smtp]` mais três vezes.
    const cabecalho = /^#?\s*\[auth\.email\.smtp\]\s*$/gm
    expect(configToml.match(cabecalho)).toHaveLength(1)
    const bloco = /^#?\s*\[auth\.email\.smtp\]\s*$[\s\S]*?admin_email\s*=\s*"([^"]+)"/m.exec(configToml)
    expect(bloco).not.toBeNull()
    const adminEmail = bloco![1]

    expect(adminEmail).toBe(REMETENTE_DO_AUTH)
    expect(ler(join(ROOT, '.env.example'))).toContain(REMETENTE_DO_AUTH)
    expect(ler(join(ROOT, 'supabase/CLAUDE.md'))).toContain(REMETENTE_DO_AUTH)
  })
})

describe('domínio do remetente do auth — sensor', () => {
  it('a régua acusa um fixture com o domínio antigo, com nome e linha', () => {
    // O que a regra acima recusaria se a linha voltasse ao config.toml. Montado em pedaços pelo
    // mesmo motivo da constante: este arquivo não pode ser a ocorrência que o `grep` do AC acha.
    const antigo = ['send', 'umaestrelinha', 'com', 'br'].join('.')
    const fixture = ['[auth.email.smtp]', `admin_email = "acesso@${antigo}"`].join('\n')

    expect(ocorrenciasNoTexto(fixture, 'fixture.toml')).toEqual([
      `fixture.toml:2  admin_email = "acesso@${antigo}"`,
    ])

    // E a outra metade: o `.` está escapado, então `sendXumaestrelinha` não passa por ocorrência,
    // e o domínio certo não é recusado — senão a regra derrubaria a própria correção.
    expect(ocorrenciasNoTexto(`admin_email = "${REMETENTE_DO_AUTH}"`, 'ok.toml')).toEqual([])
    expect(ocorrenciasNoTexto('sendXumaestrelinhaXcomXbr', 'quase.toml')).toEqual([])
  })
})
