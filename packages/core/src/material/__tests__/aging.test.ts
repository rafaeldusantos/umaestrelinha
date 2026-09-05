import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FRESH_UNTIL_DAYS,
  queueAge,
  queueAgeLabel,
  STALE_AFTER_DAYS,
  tierFor,
} from '../aging.ts'

/**
 * `PED-13` — os três degraus da fila do material.
 *
 * O que este arquivo guarda não é "a conta está certa": é que **a fronteira está onde a spec disse
 * que está**. Um degrau que escorrega de 8 para 7 dias não quebra nada — pinta mais linhas de
 * âmbar, a Adri se acostuma com o âmbar, e o alarme deixa de ser alarme sem nenhum sinal.
 */

const AGORA = new Date('2026-08-29T12:00:00.000Z')

/** Uma data a `dias` dias exatos de `AGORA`. */
const haDias = (dias: number) => new Date(AGORA.getTime() - dias * 24 * 60 * 60 * 1000)

describe('queueAge — as fronteiras exatas', () => {
  it('o corte de "parado" é 8 dias, e o número tem origem escrita', () => {
    // Se este número mudar sem a spec mudar junto, é aqui que se descobre.
    expect(STALE_AFTER_DAYS).toBe(8)
    expect(FRESH_UNTIL_DAYS).toBe(3)
  })

  it('3 dias ainda é `fresh`, 4 dias já é `warm` — a fronteira de baixo', () => {
    expect(queueAge(haDias(3), AGORA)).toEqual({ days: 3, tier: 'fresh' })
    expect(queueAge(haDias(4), AGORA)).toEqual({ days: 4, tier: 'warm' })
  })

  it('7 dias ainda é `warm`, 8 dias já é `stale` — a fronteira que importa', () => {
    expect(queueAge(haDias(7), AGORA)).toEqual({ days: 7, tier: 'warm' })
    expect(queueAge(haDias(8), AGORA)).toEqual({ days: 8, tier: 'stale' })
  })

  it('hoje é `fresh` com zero dia', () => {
    expect(queueAge(AGORA, AGORA)).toEqual({ days: 0, tier: 'fresh' })
  })

  it('às 23h do primeiro dia ainda é "há 0 dias" — piso, não arredondamento', () => {
    // `Math.round` faria a fila envelhecer meio dia antes do tempo, e a cor mudaria numa hora que
    // ninguém consegue explicar para quem está olhando a tela.
    const quaseUmDia = new Date(AGORA.getTime() - 23 * 60 * 60 * 1000)
    expect(queueAge(quaseUmDia, AGORA)?.days).toBe(0)

    const pouquinhoMais = new Date(AGORA.getTime() - 25 * 60 * 60 * 1000)
    expect(queueAge(pouquinhoMais, AGORA)?.days).toBe(1)
  })
})

describe('queueAge — o que não é uma data na fila', () => {
  it('`since` ausente devolve null, e NÃO zero dias', () => {
    // Um pedido que nunca entrou na fila e um que entrou hoje são coisas diferentes. Devolver
    // `{ days: 0 }` para os dois faria a tela escrever "há 0 dias" em pedido que não espera nada.
    expect(queueAge(null, AGORA)).toBeNull()
    expect(queueAge(undefined, AGORA)).toBeNull()
    expect(queueAge('', AGORA)).toBeNull()
  })

  it('data ilegível devolve null em vez de NaN dias', () => {
    expect(queueAge('nem data isso é', AGORA)).toBeNull()
  })

  it('data no futuro conta como 0, não como idade negativa', () => {
    // Relógio adiantado, fuso, ou gravação com `now()` do banco à frente do browser. Um `-3` cairia
    // em `fresh` por acidente; o piso põe lá por decisão.
    const amanha = new Date(AGORA.getTime() + 3 * 24 * 60 * 60 * 1000)
    expect(queueAge(amanha, AGORA)).toEqual({ days: 0, tier: 'fresh' })
  })

  it('aceita a string ISO que vem do PostgREST, não só `Date`', () => {
    expect(queueAge('2026-08-21T12:00:00.000Z', AGORA)).toEqual({ days: 8, tier: 'stale' })
  })

  it('o fuso não move o degrau: a mesma instante em -03:00 dá o mesmo veredito', () => {
    // `2026-08-21T09:00:00-03:00` é exatamente `2026-08-21T12:00:00Z`.
    expect(queueAge('2026-08-21T09:00:00-03:00', AGORA)).toEqual({ days: 8, tier: 'stale' })
  })
})

describe('tierFor — o degrau sem a data', () => {
  it('cobre a escala inteira nos dois lados de cada corte', () => {
    expect([0, 1, 2, 3].map(tierFor)).toEqual(['fresh', 'fresh', 'fresh', 'fresh'])
    expect([4, 5, 6, 7].map(tierFor)).toEqual(['warm', 'warm', 'warm', 'warm'])
    expect([8, 9, 40].map(tierFor)).toEqual(['stale', 'stale', 'stale'])
  })
})

describe('queueAgeLabel — "parado" é a palavra do terceiro degrau', () => {
  it('só o degrau `stale` diz "parado"', () => {
    expect(queueAgeLabel({ days: 2, tier: 'fresh' })).toBe('há 2 dias')
    expect(queueAgeLabel({ days: 6, tier: 'warm' })).toBe('há 6 dias')
    expect(queueAgeLabel({ days: 9, tier: 'stale' })).toBe('parado há 9 dias')
  })

  it('um dia é singular', () => {
    expect(queueAgeLabel({ days: 1, tier: 'fresh' })).toBe('há 1 dia')
  })
})

describe('pureza — `core/material` não pode importar runtime nenhum', () => {
  const AQUI = dirname(fileURLToPath(import.meta.url))
  const DIR = resolve(AQUI, '..')

  const arquivos = readdirSync(DIR).filter(f => f.endsWith('.ts'))

  it('a varredura encontrou os arquivos do módulo', () => {
    // Âncora de contagem: um caminho errado varreria zero arquivo e o teste abaixo passaria em
    // silêncio, que é a pior falha possível num teste que varre disco.
    expect(arquivos.length).toBeGreaterThanOrEqual(3)
    expect(arquivos).toContain('aging.ts')
  })

  it('nenhum arquivo importa React, Supabase ou Deno', () => {
    const proibidos = /from\s+['"](react|@supabase\/|@estrelinha\/supabase|https:\/\/deno)/

    const sujos = arquivos.filter(f => proibidos.test(readFileSync(resolve(DIR, f), 'utf8')))

    expect(sujos).toEqual([])
  })

  it('todo import relativo do módulo carrega `.ts` explícito', () => {
    // A regra que torna `core/material` alcançável por Deno e por node. Vite e vitest resolvem as
    // duas formas, então a ausência da extensão não acusa aqui — ela derruba o worker lá.
    const semExtensao: string[] = []

    for (const arquivo of arquivos) {
      const fonte = readFileSync(resolve(DIR, arquivo), 'utf8')
      for (const m of fonte.matchAll(/from\s+['"](\.[^'"]*)['"]/g)) {
        if (!m[1].endsWith('.ts')) semExtensao.push(`${arquivo} → ${m[1]}`)
      }
    }

    expect(semExtensao).toEqual([])
  })
})
