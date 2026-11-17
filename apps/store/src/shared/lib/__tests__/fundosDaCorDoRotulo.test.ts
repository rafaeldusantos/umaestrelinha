import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ESTRELINHA_PROFILES } from '@estrelinha/ui/tokens/estrelinha'
import { STYLE_PROFILES } from '@estrelinha/core/appearance'
import { MENU_LABEL_BAR_BACKGROUNDS, MENU_LABEL_SHEET_BACKGROUND } from '@estrelinha/core/menu'

/**
 * Os fundos contra os quais `core/menu/labelColor.ts` mede a cor do rótulo do menu são CÓPIA
 * deliberada: `core/menu` é alcançado pelo Deno e não importa `@estrelinha/ui`, onde mora o dono dos
 * valores (`ESTRELINHA_PROFILES`). Cópia sem guarda é o "defeito 01": trocar o `primary` de um perfil
 * e esquecer a cópia faria o painel aprovar uma cor ilegível — build, `tsc` e teste de componente
 * verdes.
 *
 * Aqui os dois lados são lidos e comparados: a barra do computador é o `primary` de cada perfil, e a
 * folha do celular é branca. E o desenho também é lido do disco — a barra pintada de `primary` no
 * `Header` e a folha pintada de branco no `MobileMenu` —, porque é ele que diz qual é o fundo.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const ler = (rel: string) => readFileSync(join(SRC, rel), 'utf8')

const BRANCO = '#FFFFFF'

/** As divergências entre a cópia e o dono, uma frase por perfil — vazio quando concordam. */
const divergencias = (
  barra: Readonly<Record<string, string>>,
  folha: string,
  perfis: Readonly<Record<string, Readonly<Record<string, string>>>>,
): string[] => {
  const saida: string[] = []
  const nomes = new Set([...Object.keys(perfis), ...Object.keys(barra)])
  for (const perfil of nomes) {
    const dono = perfis[perfil]?.primary?.toUpperCase()
    const copia = barra[perfil]?.toUpperCase()
    if (dono !== copia) saida.push(`barra em ${perfil}: cópia ${copia} × primary ${dono}`)
  }
  if (folha.toUpperCase() !== BRANCO) saida.push(`folha: cópia ${folha} × ${BRANCO}`)
  return saida
}

describe('os fundos da cor do rótulo do menu são os da paleta', () => {
  it('âncora: os dois perfis estão dos dois lados', () => {
    expect(Object.keys(ESTRELINHA_PROFILES).sort()).toEqual([...STYLE_PROFILES].sort())
    expect(Object.keys(MENU_LABEL_BAR_BACKGROUNDS).sort()).toEqual([...STYLE_PROFILES].sort())
  })

  it('a barra é o `primary` de cada perfil, e a folha é branca', () => {
    expect(divergencias(MENU_LABEL_BAR_BACKGROUNDS, MENU_LABEL_SHEET_BACKGROUND, ESTRELINHA_PROFILES)).toEqual([])
  })

  it('o desenho confirma: a barra de departamentos é `primary`, e a folha do celular é branca', () => {
    expect(ler('widgets/header/ui/Header.tsx')).toMatch(/className="hidden bg-estrelinha-primary md:block"/)
    // A PRIMEIRA `className` depois de `<SheetContent` — a da folha, e não uma qualquer adiante.
    const folha = /<SheetContent[^>]*?className="([^"]*)"/.exec(ler('widgets/mobile-menu/ui/MobileMenu.tsx'))
    expect(folha?.[1].split(/\s+/)).toContain('bg-white')
  })

  it('sensor: uma cópia divergente é acusada', () => {
    const copia = { ...MENU_LABEL_BAR_BACKGROUNDS, 'black-friday': '#34495E' }
    expect(divergencias(copia, MENU_LABEL_SHEET_BACKGROUND, ESTRELINHA_PROFILES)).toEqual([
      'barra em black-friday: cópia #34495E × primary #1C1A18',
    ])
    expect(divergencias(MENU_LABEL_BAR_BACKGROUNDS, '#FAF8F4', ESTRELINHA_PROFILES)).toEqual([
      'folha: cópia #FAF8F4 × #FFFFFF',
    ])
  })

  it('sensor: um perfil novo no dono, sem cópia, é acusado', () => {
    const perfis = { ...ESTRELINHA_PROFILES, natal: { ...ESTRELINHA_PROFILES.padrao, primary: '#7A1F1F' } }
    expect(divergencias(MENU_LABEL_BAR_BACKGROUNDS, MENU_LABEL_SHEET_BACKGROUND, perfis)).toEqual([
      'barra em natal: cópia undefined × primary #7A1F1F',
    ])
  })
})
