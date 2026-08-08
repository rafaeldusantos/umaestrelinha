import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
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

/** Onde ela procura — `REN-05` AC 1. `.specs/` e `docs/` ficam de fora: são
 *  histórico, e a Fase 7 os move para `.specs/archive/nanita/`. */
const ESCOPO = ['apps', 'packages', 'supabase']
const ARQUIVOS_DA_RAIZ = ['package.json', 'tsconfig.base.json', 'turbo.json', 'pnpm-workspace.yaml']

/** Diretórios que não são fonte: artefato de build, dependência, runtime. */
const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])

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
}

/**
 * Temporária, com dono. NÃO acrescente entrada aqui para calar a varredura:
 * uma linha nova só se justifica se a conversão daquele arquivo pertencer,
 * comprovadamente, a uma task posterior desta feature.
 */
const PENDENTE: Record<string, string> = {
  'apps/backoffice/index.html':                                            'T35 - metadados do painel',
  'apps/backoffice/src/features/store-menu/ui/MenuBarPreview.tsx':         'T38 - copy institucional e pontos de contato',
  'apps/backoffice/src/pages/admin/AdminLoginPage.tsx':                    'T38 - copy institucional e pontos de contato',
  'apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx':           'T38 - copy institucional e pontos de contato',
  'apps/store/index.html':                                                 'T35 - metadados da loja',
  'apps/store/src/entities/product/ui/ProductInfo.tsx':                    'T38 - copy institucional e pontos de contato',
  'apps/store/src/features/newsletter/ui/NewsletterBanner.tsx':            'T38 - copy institucional e pontos de contato',
  'apps/store/src/features/search/ui/SearchOverlay.tsx':                   'T38 - copy institucional e pontos de contato',
  'apps/store/src/pages/AboutPage.tsx':                                    'T38 - copy institucional e pontos de contato',
  'apps/store/src/widgets/footer/ui/Footer.tsx':                           'T30 - copy e redes sociais do rodape; a marca em SVG ja saiu na T26',
  'apps/store/src/widgets/hero-banner/ui/HeroBanner.tsx':                  'T38 - copy institucional e pontos de contato',
  'apps/store/src/widgets/whatsapp-float/ui/WhatsAppFloat.tsx':            'T38 - copy institucional e pontos de contato',
  'apps/store/tailwind.config.ts':                                         'T28 - o comentario de `fontFamily` cita o monograma que a T26 renomeia',
  'packages/supabase/src/types/settings.ts':                               'T34 - defaults de `store_settings` em TypeScript',
  'supabase/config.toml':                                                  'T36 - assuntos e remetente do auth',
  'supabase/functions/melhor-envio/index.ts':                              'T38 - `User-Agent` que a API do Melhor Envio exige',
  'supabase/functions/mercado-pago/__tests__/fakes.ts':                    'T37 - `RESEND_FROM` de exemplo, distinto do remetente do auth',
  'supabase/functions/mercado-pago/index.ts':                              'T37 - `RESEND_FROM` de exemplo, distinto do remetente do auth',
  'supabase/functions/send-email/__tests__/handlers.test.ts':              'T37 - e-mail transacional',
  'supabase/functions/send-email/__tests__/templates.test.ts':             'T37 - e-mail transacional',
  'supabase/functions/send-email/index.ts':                                'T37 - e-mail transacional',
  'supabase/functions/send-email/layout.ts':                               'T37 - e-mail transacional',
  'supabase/functions/send-email/sender.ts':                               'T37 - e-mail transacional',
  'supabase/templates/confirmation.html':                                  'T36 - templates de auth',
  'supabase/templates/magic_link.html':                                    'T36 - templates de auth',
  'supabase/templates/recovery.html':                                      'T36 - templates de auth',
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

/** Toda ocorrência, com caminho e linha — a falha precisa dizer ONDE. */
function ocorrencias(caminho: string): string[] {
  return readFileSync(caminho, 'utf8')
    .split('\n')
    .flatMap((linha, i) => (MARCA.test(linha) ? [`${rel(caminho)}:${i + 1}  ${linha.trim().slice(0, 90)}`] : []))
}

const arquivosVarridos = alvos()

describe('varredura de marca — âncora', () => {
  it('varre os arquivos do repositório', () => {
    // Sem esta âncora, um erro de caminho faz a varredura ler zero arquivo,
    // reportar zero resíduo e passar. Provado apontando `ROOT` para um
    // diretório inexistente: o teste falha, não passa.
    expect(arquivosVarridos.length).toBeGreaterThan(400)
  })

  it('varre os três diretórios do escopo e os arquivos da raiz', () => {
    // Os nomes estão escritos AQUI de propósito, e não lidos de `ESCOPO`.
    // Uma âncora que itera a mesma constante que deveria guardar encolhe junto
    // com ela: tirar `supabase` do escopo faria a asserção parar de exigi-lo, e
    // a varredura passaria a ignorar todo o backend em silêncio. É a mesma
    // forma do furo que a `fieldBorder` tinha — a régua e o objeto medido não
    // podem ser a mesma coisa.
    for (const dir of ['apps', 'packages', 'supabase']) {
      expect(arquivosVarridos.filter((f) => rel(f).startsWith(`${dir}/`)).length).toBeGreaterThan(10)
    }
    expect(arquivosVarridos.filter((f) => !rel(f).includes('/')).length).toBe(ARQUIVOS_DA_RAIZ.length)
  })
})

describe('varredura de marca — resíduo', () => {
  it('nenhum arquivo fora das duas listas cita a marca anterior', () => {
    const encontrados = arquivosVarridos
      .filter((f) => !(rel(f) in ALLOWLIST) && !(rel(f) in PENDENTE))
      .flatMap(ocorrencias)

    expect(encontrados).toEqual([])
  })

  it('nenhuma entrada de PENDENTE ficou obsoleta', () => {
    // É o que faz a lista se autodestruir. Sem isto, um arquivo já convertido
    // segue liberado, e o próximo resíduo entra nele sem ninguém ver.
    const limpos = Object.keys(PENDENTE).filter((f) => {
      const cheio = join(ROOT, f)
      return !arquivosVarridos.includes(cheio) || ocorrencias(cheio).length === 0
    })

    expect(limpos).toEqual([])
  })

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
