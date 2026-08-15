// Feature 25, `PRV-18` — **a Home tem UM desenho, e ele mora na loja.**
//
// Este guarda existe porque o defeito que a feature eliminou não quebra nada ao voltar. Até a `24` o
// painel tinha `HomePreview.tsx` — 277 linhas redesenhando à mão o que
// `apps/store/src/widgets/home-renderer` já desenhava. As duas versões divergiam sem que build,
// `tsc` ou teste de componente acusassem: o painel prometia um arranjo e a loja renderizava outro.
//
// A tentação de reintroduzi-lo é concreta e simpática: "só um esqueminha para quando o iframe não
// carrega", "só um mini-mapa ao lado". Qualquer uma delas é o segundo dono do desenho de volta.
//
// **Âncora dupla** (a lição da `fieldBorder`, que varreu só as tags minúsculas e deixou 16 campos
// com 1,19:1 passarem): o teste confere que leu arquivos de verdade **e** que achou a superfície que
// deveria achar. Sem as duas, um caminho errado varre zero arquivo e passa em silêncio.

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const AQUI = resolve(__dirname, '..')
const UI = join(AQUI, 'ui')

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : []
  })

const FONTES = arquivos(AQUI).filter(f => !/\.test\.tsx?$/.test(f))
const ler = (caminho: string) => readFileSync(caminho, 'utf8')

describe('âncora — a varredura alcançou a feature de verdade', () => {
  it('leu os arquivos de `home-composition`', () => {
    expect(FONTES.length).toBeGreaterThan(10)
  })

  it('alcançou as superfícies que importam', () => {
    for (const alvo of [
      'ui/HomeLivePreview.tsx',
      'ui/HomeSectionList.tsx',
      'model/usePreviewBridge.ts',
    ]) {
      expect(FONTES.some(f => f.replace(/\\/g, '/').endsWith(alvo))).toBe(true)
    }
  })
})

describe('PRV-18 — o esquema desenhado à mão não existe mais', () => {
  it('`HomePreview.tsx` foi removido', () => {
    expect(existsSync(join(UI, 'HomePreview.tsx'))).toBe(false)
    expect(existsSync(join(UI, 'HomePreview.test.tsx'))).toBe(false)
  })

  it('o barrel não exporta `HomePreview`', () => {
    const barrel = ler(join(AQUI, 'index.ts'))
    expect(barrel).not.toMatch(/export .*\bHomePreview\b.*from/)
    expect(barrel).toContain('HomeLivePreview')
  })

  it('nenhum arquivo importa um `HomePreview`', () => {
    const infratores = FONTES.filter(f => /from ['"].*HomePreview['"]/.test(ler(f)))
    expect(infratores).toEqual([])
  })
})

describe('PRV-18 — existe UMA superfície de prévia, e ela é um iframe', () => {
  it('só um arquivo de UI se chama "…Preview"', () => {
    const previas = readdirSync(UI)
      .filter(nome => /Preview/.test(nome) && !/\.test\./.test(nome))
      .sort()
    expect(previas).toEqual(['HomeLivePreview.tsx'])
  })

  it('o palco monta um `<iframe>` — não desenha a Home, mostra a loja', () => {
    const fonte = ler(join(UI, 'HomeLivePreview.tsx'))
    expect(fonte).toContain('<iframe')
    expect(fonte).toContain('previewSrc')
  })

  it('o palco NÃO ramifica por tipo de seção — ramificar ali é o segundo desenho voltando', () => {
    const fonte = ler(join(UI, 'HomeLivePreview.tsx'))
    // Os dez tipos do catálogo. Nenhum deles pode aparecer como literal no palco: o palco não sabe
    // o que é um hero, e é justamente por não saber que ele não pode divergir da loja.
    for (const tipo of [
      'hero',
      'trust_bar',
      'banner_grid',
      'collection_rows',
      'brand_statement',
      'trending_tags',
      'newsletter',
      'collection_feature',
      'product_carousel',
      'category_grid',
    ]) {
      expect(fonte).not.toContain(`'${tipo}'`)
    }
  })

  it('o painel não importa nada de `apps/store` — a fronteira dos apps segue de pé', () => {
    const infratores = FONTES.filter(f => /from ['"].*apps\/store/.test(ler(f)))
    expect(infratores).toEqual([])
  })
})
