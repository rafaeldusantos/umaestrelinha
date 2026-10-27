// Feature `75` · T21 — as alturas do pé da tela têm UM dono (`shared/ui/alturas.ts`, `MAA-31`).
// As classes são literais (o Tailwind só gera o que lê por extenso), então esta régua confere que
// todas carregam a MESMA medida — e que a barra e o layout leem daqui.
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  ALTURA_DA_BARRA,
  ALTURA_MINIMA_DO_RODAPE,
  AVISO_ACIMA_DA_BARRA,
  AVISO_ACIMA_DO_RODAPE,
  CLASSE_DA_BARRA,
  RESERVA_DA_BARRA,
  RESERVA_DO_RODAPE,
  RODAPE_NO_FIM,
  AVISO_NO_FIM,
  VAR_ALTURA_DO_RODAPE,
} from '../alturas'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const ler = (rel: string) => readFileSync(resolve(SRC, rel), 'utf8')

describe('as alturas do pé da tela (MAA-31)', () => {
  it('`h-16` é a barra: 16 × 0,25 rem = 4rem', () => {
    const [, n] = /^h-(\d+)$/.exec(CLASSE_DA_BARRA) ?? []
    expect(`${Number(n) * 0.25}rem`).toBe(ALTURA_DA_BARRA)
  })

  it.each([
    ['RESERVA_DA_BARRA', RESERVA_DA_BARRA],
    ['AVISO_ACIMA_DA_BARRA', AVISO_ACIMA_DA_BARRA],
  ])('%s soma a barra com o inset do sistema', (_n, classe) => {
    expect(classe).toContain(`calc(${ALTURA_DA_BARRA}+`)
    expect(classe).toContain('env(safe-area-inset-bottom)')
  })

  // 2026-10-26 (protótipo): no detalhe a barra some. O rodapé fica no fim com o inset no próprio
  // respiro (a altura medida o inclui), e o aviso não conta mais a barra.
  it('o rodapé fica no fim, com o inset no respiro de baixo', () => {
    expect(RODAPE_NO_FIM).toContain('bottom-0')
    expect(RODAPE_NO_FIM).toContain('env(safe-area-inset-bottom)')
    expect(RODAPE_NO_FIM).not.toContain(`calc(${ALTURA_DA_BARRA}+`)
  })

  it('o aviso acima do rodapé e o do fim não contam a barra', () => {
    expect(AVISO_ACIMA_DO_RODAPE).not.toContain(`calc(${ALTURA_DA_BARRA}+`)
    expect(AVISO_NO_FIM).not.toContain(`calc(${ALTURA_DA_BARRA}+`)
    expect(AVISO_NO_FIM).toContain('env(safe-area-inset-bottom)')
  })

  it('a reserva do detalhe e o aviso leem a MESMA variável do rodapé, com o MESMO piso', () => {
    expect(RESERVA_DO_RODAPE).toBe(`h-[var(${VAR_ALTURA_DO_RODAPE},${ALTURA_MINIMA_DO_RODAPE})]`)
    expect(AVISO_ACIMA_DO_RODAPE).toContain(`var(${VAR_ALTURA_DO_RODAPE},${ALTURA_MINIMA_DO_RODAPE})`)
  })

  it('a barra e o layout leem a constante — nenhum `4rem` escrito à mão neles', () => {
    const barra = ler('widgets/tab-bar/ui/TabBar.tsx')
    const layout = ler('app/layout/MobileLayout.tsx')
    expect(barra).toMatch(/TAB_BAR_HEIGHT = CLASSE_DA_BARRA/)
    expect(layout).toMatch(/RESERVA_DA_BARRA/)
    expect(layout).not.toMatch(/h-\[calc\(4rem/)
    expect(barra.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')).not.toMatch(/'h-16'/)
  })
})
