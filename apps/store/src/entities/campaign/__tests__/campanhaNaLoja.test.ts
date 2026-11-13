import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { CAMPAIGN_CONTRAST_MIN, CAMPAIGN_DEFAULT_COLORS } from '@estrelinha/core/campaigns'
import { contrastRatio } from '@estrelinha/core/color'

/**
 * Os guardas da campanha de desconto na loja — leem o FONTE do disco.
 *
 * 1. **O selo só usa as cores da campanha.** As duas cores vêm do cadastro, por `style` inline; um
 *    token da paleta da loja (`estrelinha-*`) nos componentes do selo faria a faixa mudar quando a
 *    paleta muda — e nada quebraria: build, `tsc` e teste de componente passam com as duas cores.
 * 2. **A loja não decide a vigência.** Quem decide é a policy pública de `campaigns` (relógio do
 *    banco). Uma chamada à regra de vigência no navegador usaria o relógio do aparelho da cliente, e
 *    a loja mostraria um preço que o servidor não cobra. Allowlist de UM, escrito literalmente: o
 *    mapeador — e a metade positiva prova que ele é quem precifica.
 * 3. **O par de cores com que a campanha nasce passa no contraste** pela medida de `core/color`.
 *
 * Âncora dupla: a varredura leu arquivos E encontrou os componentes do selo e o mapeador.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', 'coverage'])
const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []
  })

const eTeste = (rel: string) => rel.includes('__tests__/') || /\.test\.tsx?$/.test(rel)

/** Remove comentários (linha e bloco na mesma varredura, `BL-027`), preservando as quebras. */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, t => t.replace(/[^\n]/g, ' '))

const producao = arquivos(SRC)
  .map(caminho => ({ rel: relative(SRC, caminho).split('\\').join('/'), codigo: semComentarios(readFileSync(caminho, 'utf8')) }))
  .filter(a => !eTeste(a.rel))

const de = (rel: string) => producao.find(a => a.rel === rel)

/** Os componentes do selo — escritos literalmente, nunca derivados do código sob teste. */
const SELOS = ['entities/campaign/ui/CampaignBand.tsx', 'entities/campaign/ui/CampaignBadgeInline.tsx']
const MAPEADOR = 'entities/product/lib/mapProduct.ts'

/** Um token da paleta da loja: classe `*-estrelinha-*` ou a variável `--estrelinha-*`. */
const TOKEN_DA_LOJA = /estrelinha-/
/** Uma chamada à regra de vigência de `core/campaigns`. */
const VIGENCIA = /\b(isCampaignLive|campaignStatus|campaignStatusLine)\s*\(/

describe('âncoras', () => {
  it('a varredura leu a loja e achou os componentes do selo e o mapeador', () => {
    expect(producao.length).toBeGreaterThan(300)
    for (const rel of [...SELOS, MAPEADOR]) expect(de(rel), rel).toBeDefined()
  })
})

describe('o selo usa só as duas cores da campanha', () => {
  it.each(SELOS)('%s não usa token da paleta da loja', rel => {
    expect(TOKEN_DA_LOJA.test(de(rel)!.codigo)).toBe(false)
  })

  it.each(SELOS)('%s pinta as duas partes com as cores da campanha, cruzadas, por `style`', rel => {
    const codigo = de(rel)!.codigo
    expect(codigo).toContain('style={{ backgroundColor: campaign.band_color, color: campaign.accent_color }}')
    expect(codigo).toContain('style={{ backgroundColor: campaign.accent_color, color: campaign.band_color }}')
  })

  it('sensor: um token da loja num componente do selo é acusado', () => {
    expect(TOKEN_DA_LOJA.test('className="bg-estrelinha-ink text-white"')).toBe(true)
    expect(TOKEN_DA_LOJA.test('className="text-[11px] font-bold uppercase"')).toBe(false)
  })
})

describe('a loja não decide a vigência da campanha', () => {
  it('nenhum arquivo de produção da loja chama a regra de vigência fora do mapeador', () => {
    const achados = producao.filter(a => a.rel !== MAPEADOR && VIGENCIA.test(a.codigo)).map(a => a.rel)
    expect(achados).toEqual([])
  })

  it('o mapeador também não a chama — confia na leitura pública filtrada por `now()`', () => {
    expect(VIGENCIA.test(de(MAPEADOR)!.codigo)).toBe(false)
  })

  it('metade positiva: o mapeador precifica pela função de `core` e pede a marcação pelo embed', () => {
    const codigo = de(MAPEADOR)!.codigo
    expect(codigo).toMatch(/\bcampaignUnitPrice\(/)
    expect(codigo).toContain("'product_campaigns(percent, campaigns(")
  })

  it('sensor: a chamada com o relógio do navegador é acusada, a prosa sem parênteses não', () => {
    expect(VIGENCIA.test('const vale = isCampaignLive(campanha, new Date())')).toBe(true)
    expect(VIGENCIA.test('const s = campaignStatus (c, Date.now())')).toBe(true)
    expect(VIGENCIA.test(semComentarios('// isCampaignLive(c, agora) não roda aqui'))).toBe(false)
  })
})

describe('o par de cores com que a campanha nasce', () => {
  it('é o preto #161514 e o ouro #C2A063 do protótipo', () => {
    expect(CAMPAIGN_DEFAULT_COLORS).toEqual({ band: '#161514', accent: '#C2A063' })
  })

  it('passa no contraste mínimo do selo — 7,4:1 pela medida de `core/color`', () => {
    const razao = contrastRatio(CAMPAIGN_DEFAULT_COLORS.band, CAMPAIGN_DEFAULT_COLORS.accent)
    expect(razao).toBeGreaterThanOrEqual(CAMPAIGN_CONTRAST_MIN)
    expect(CAMPAIGN_CONTRAST_MIN).toBe(4.5)
    expect(Math.round(razao * 10) / 10).toBe(7.4)
  })
})
