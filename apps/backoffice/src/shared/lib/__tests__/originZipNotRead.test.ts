import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `store_settings.shipping.origin_zip` é LEGADO, e nenhuma tela o lê.
 *
 * A origem da cotação do Melhor Envio é o `postal_code` do secret `MELHOR_ENVIO_SENDER_JSON` — o
 * mesmo endereço impresso na etiqueta. `origin_zip` foi um segundo dono desde sempre: editável em
 * `/admin/configuracoes`, documentado no tipo como sendo a origem, e **lido por ninguém**. A Adri
 * podia preencher e nada acontecia.
 *
 * **Por que o dono único é o secret, e não o campo do painel.** A etiqueta precisa do endereço por
 * extenso, com CPF e telefone; isso não cabe numa linha de `store_settings`. Se o CEP voltasse a ser
 * configurável na tela, a origem da COTAÇÃO e a origem da ETIQUETA poderiam divergir — a loja
 * cotaria de um endereço e postaria de outro, e nada em tela diria por quê. Divergir sem quebrar é a
 * assinatura do "defeito 01" do `CLAUDE.md`.
 *
 * O input saiu da tela em 2026-09-05. A chave continua no banco (migration aplicada é imutável,
 * `AD-017`) e em `DEFAULT_SHIPPING`, para que o tipo descreva a coluna que existe. Este guarda é o
 * que impede a leitura de voltar.
 *
 * ÂNCORA DUPLA (`L-021`): a varredura prova que leu arquivos **e** que a régua encontra o que
 * procura. Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência deixa passar um
 * caminho errado. Molde de `provenanceNotRead.test.ts`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

const CAMPO = 'origin_zip'

/**
 * `apps/` inteiro — as duas pontas que têm tela.
 *
 * `packages/supabase` fica **de fora**: descrever a coluna num tipo não é lê-la numa tela, e o campo
 * precisa continuar no `ShippingSettings` enquanto a coluna existir no banco. `supabase/migrations`
 * também: é quem a criou.
 */
const ESCOPO = ['apps']

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

/**
 * Permanente e mínima: só arquivos onde a string é o **assunto**, nunca leitura de tela.
 *
 * Entrada nova exige o motivo escrito. Uma tela que "precisa" ler `origin_zip` não precisa: precisa
 * do secret, e mudá-lo é operação de infraestrutura, não de painel.
 */
const ALLOWLIST: Record<string, string> = {
  'apps/backoffice/src/shared/lib/__tests__/originZipNotRead.test.ts':
    'A varredura precisa nomear o que procura.',
  'apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx':
    'A fixture de `store_settings.shipping` espelha a linha do banco, que ainda tem a chave. Montar o objeto não é lê-lo.',
  'apps/store/src/features/checkout/ui/__tests__/DeliveryBlock.test.tsx':
    'Idem — fixture de configuração, não leitura.',
  'apps/store/src/features/checkout/ui/__tests__/OrderSummary.test.tsx':
    'Idem.',
  'apps/store/src/pages/__tests__/CheckoutPage.test.tsx':
    'Idem.',
  'apps/store/src/widgets/cart-drawer/ui/__tests__/CartDrawer.test.tsx':
    'Idem.',
  'apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts':
    'Compara os defaults do TypeScript com o que as migrations gravam — a chave é o assunto dele.',
}

const permitido = (arquivo: string): boolean =>
  Object.prototype.hasOwnProperty.call(ALLOWLIST, arquivo)

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some(ext => entry.name.endsWith(ext)) ? [full] : []
  })

const varridos = ESCOPO.flatMap(d => arquivos(join(ROOT, d)))

interface Ocorrencia {
  arquivo: string
  linha: number
}

const ocorrencias: Ocorrencia[] = []
for (const caminho of varridos) {
  const rel = relative(ROOT, caminho).split('\\').join('/')
  const linhas = readFileSync(caminho, 'utf8').split('\n')
  linhas.forEach((texto, i) => {
    if (texto.includes(CAMPO)) ocorrencias.push({ arquivo: rel, linha: i + 1 })
  })
}

describe('âncora dupla da varredura', () => {
  it('leu os arquivos de `apps/`', () => {
    // Caminho errado varre zero arquivo e passa em VERDE — a pior falha possível aqui.
    expect(varridos.length).toBeGreaterThan(300)
  })

  it('a régua ENCONTRA o campo onde ele está escrito', () => {
    // Se este teste falhar, o `includes` virou no-op e a varredura passa em verde mesmo lendo tudo.
    const neste = ocorrencias.filter(o => o.arquivo.endsWith('originZipNotRead.test.ts'))
    expect(neste.length).toBeGreaterThan(0)
  })
})

describe('nenhuma tela lê `origin_zip`', () => {
  it('não há ocorrência fora da allowlist', () => {
    const fora = ocorrencias.filter(o => !permitido(o.arquivo))
    expect(fora.map(o => `${o.arquivo}:${o.linha}`)).toEqual([])
  })

  it('o formulário de configurações não tem mais o input', () => {
    // A asserção que nomeia a remoção: um `setShipping({ ... origin_zip ... })` de volta na tela
    // reabriria o segundo dono, e o teste acima já o pegaria — este diz POR QUE, na mensagem.
    const form = readFileSync(
      join(ROOT, 'apps/backoffice/src/pages/admin/AdminSettingsPage.tsx'),
      'utf8',
    )
    expect(form).not.toContain('origin_zip')
    // Vizinha: a tela continua explicando de onde vem a origem, para a Adri não procurar o campo.
    expect(form).toContain('Melhor Envio')
  })
})
