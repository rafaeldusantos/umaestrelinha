// Feature 72, fecho da verificação r3 da Fase 6 (lacuna 4) — as DUAS cópias do arnês do client real
// têm o mesmo código.
//
// Cópia deliberada com guarda (consequência 3 do "defeito 01"): `apps/mobile-adm/src/test/clientReal.ts`
// e `apps/store/src/test/clientReal.ts` existem nos dois apps porque um app não importa do outro e
// `packages/` não tem runner. Só o comentário do topo pode diferir (cada um diz por que existe ali).
// Uma divergência no `fetchFalso`, no storage ou no `voltarAba` faria a loja provar uma ordem de
// eventos diferente da do app — com as duas suítes verdes.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const DO_APP = resolve(__dirname, '../clientReal.ts')
const DA_LOJA = resolve(__dirname, '../../../../store/src/test/clientReal.ts')

/** O arquivo sem o PRIMEIRO comentário de bloco (o cabeçalho), com fim de linha normalizado. */
const semCabecalho = (fonte: string): string => {
  const texto = fonte.replace(/\r\n/g, '\n')
  const inicio = texto.indexOf('/**')
  const fim = texto.indexOf('*/', inicio)
  if (inicio < 0 || fim < 0) throw new Error('clientRealPareado: cabeçalho não encontrado')
  return texto.slice(0, inicio) + texto.slice(fim + 2)
}

const pareados = (a: string, b: string) => semCabecalho(a) === semCabecalho(b)

describe('o arnês do client real é o mesmo código no app e na loja', () => {
  const app = readFileSync(DO_APP, 'utf8')
  const loja = readFileSync(DA_LOJA, 'utf8')

  it('âncora — os dois arquivos foram lidos, são o arnês, e cada cabeçalho cita este guarda', () => {
    for (const f of [app, loja]) {
      expect(f).toContain("import { createClient, type SupabaseClient } from '@supabase/supabase-js'")
      expect(f).toContain('export const supabaseProxy')
      expect(f).toContain('const fetchFalso')
      expect(f).toContain('voltarAba')
      expect(f).toContain('clientRealPareado.test.ts')
    }
    // O código que sobra tem corpo: um recorte que apagasse demais aprovaria tudo.
    expect(semCabecalho(app).length).toBeGreaterThan(app.length * 0.6)
  })

  it('fora do cabeçalho, o código é idêntico', () => {
    expect(semCabecalho(loja)).toBe(semCabecalho(app))
  })

  it('SENSOR — uma linha de código alterada reprova', () => {
    const alterada = loja.replace(
      "if (url.searchParams.get('grant_type') === 'refresh_token') throw FALHA()",
      "if (url.searchParams.get('grant_type') === 'refresh_token') return json({})",
    )
    expect(alterada).not.toBe(loja) // a mutação tem alvo
    expect(pareados(app, alterada)).toBe(false)
  })

  it('SENSOR — o `voltarAba` sem `bubbles` reprova', () => {
    const alterada = loja.replace("new Event('visibilitychange', { bubbles: true })", "new Event('visibilitychange')")
    expect(alterada).not.toBe(loja)
    expect(pareados(app, alterada)).toBe(false)
  })

  it('INVERSO — só o cabeçalho diferente passa (com CRLF também)', () => {
    const outroCabecalho = loja.replace(/\/\*\*[\s\S]*?\*\//, '/**\n * Um cabeçalho qualquer, de outra redação.\n */')
    expect(outroCabecalho).not.toBe(loja)
    expect(pareados(app, outroCabecalho)).toBe(true)
    expect(pareados(app, outroCabecalho.replace(/\n/g, '\r\n'))).toBe(true)
  })
})
