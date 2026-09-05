import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  EAGER_IMAGE_COUNT,
  RENDITION_MAX_WIDTH,
  RENDITION_MIN_WIDTH,
  RENDITION_QUALITY,
  RENDITION_WIDTHS,
  STORAGE_CACHE_CONTROL,
  imagePriority,
  renditionSrcSet,
  renditionUrl,
} from './rendition.ts'

/**
 * `PRF-01`, `PRF-03` (AC 4) e `PRF-05` (AC 2) — o dono único de "como se pede uma imagem".
 *
 * A URL de exemplo é a forma real do Storage deste projeto: `<origem>/storage/v1/object/public/
 * <bucket>/<caminho>`. É essa forma, e só ela, que vira rendição.
 */
const OBJETO =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'
const RENDER =
  'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/render/image/public/product-images/pingente.webp'

describe('rendition.ts não importa nada — a condição de a edge function conseguir usá-lo', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const fonte = readFileSync(join(HERE, 'rendition.ts'), 'utf8')
  /* CRLF normalizado primeiro: num checkout Windows `$` sem a flag `m` não ancora antes do `\r`. */
  const linhas = fonte.replace(/\r\n/g, '\n').split('\n')

  it('a leitura do fonte de fato aconteceu — âncora', () => {
    // Sem esta âncora, um caminho errado leria arquivo vazio e a asserção abaixo passaria por
    // vacuidade, que é a pior falha possível num teste que lê disco.
    expect(linhas.length).toBeGreaterThan(60)
    expect(fonte).toContain('export const renditionUrl')
  })

  it('nenhuma linha de `import` — nem `import type`', () => {
    // Medido na feature `33`: o Deno resolve o grafo de TIPOS, e um `import type` de pacote com
    // alias derruba a edge function com `Failed resolving types` antes da primeira linha rodar.
    const imports = linhas.filter((l) => /^\s*import[\s{*]/.test(l))
    expect(imports).toEqual([])
  })

  it('e a régua DE FATO pegaria um import de volta — sensor por mutação', () => {
    // Sem o sensor, um regex quebrado faria a asserção acima passar para sempre.
    const sintetico = [
      "import type { ProductImage } from '@estrelinha/supabase/types'",
      "import { x } from './y.ts'",
      'import * as z from "node:path"',
      '  import a from "b"',
    ]
    expect(sintetico.filter((l) => /^\s*import[\s{*]/.test(l))).toHaveLength(4)
  })
})

describe('renditionUrl — objeto público do Storage vira rendição (PRF-01 AC 1)', () => {
  it('troca o segmento `object` por `render/image` e acrescenta largura e qualidade', () => {
    expect(renditionUrl(OBJETO, 360)).toBe(`${RENDER}?width=360&quality=75`)
  })

  it('a qualidade vem da constante, não de um literal solto', () => {
    expect(renditionUrl(OBJETO, 480)).toContain(`quality=${RENDITION_QUALITY}`)
  })

  it('cada largura pedida sai na query, e o caminho do objeto não muda', () => {
    for (const w of RENDITION_WIDTHS) {
      expect(renditionUrl(OBJETO, w)).toBe(`${RENDER}?width=${w}&quality=75`)
    }
  })

  it('query existente é preservada, e a rendição entra depois dela', () => {
    // Token de cache-busting do painel (`?t=...`) não pode ser descartado: descartá-lo faria a
    // imagem trocada continuar a mostrar a versão antiga.
    expect(renditionUrl(`${OBJETO}?t=1234`, 720)).toBe(`${RENDER}?t=1234&width=720&quality=75`)
  })

  it('só a PRIMEIRA ocorrência do segmento é trocada', () => {
    const estranho = `${OBJETO.replace('pingente.webp', '')}storage/v1/object/public/x.webp`
    const saida = renditionUrl(estranho, 360)
    expect(saida.indexOf('/storage/v1/render/image/public/')).toBeGreaterThan(0)
    expect(saida).toContain('storage/v1/object/public/x.webp')
  })
})

describe('renditionUrl — o que NÃO é objeto do Storage volta inalterado (PRF-01 AC 2)', () => {
  it('string vazia — o produto sem foto de `VAR-11`', () => {
    expect(renditionUrl('', 360)).toBe('')
  })

  it('host externo — o banner de campanha', () => {
    const externo = 'https://cdn.parceiro.example/campanha-dia-das-maes.jpg'
    expect(renditionUrl(externo, 360)).toBe(externo)
  })

  it('ativo local servido por `/assets`', () => {
    expect(renditionUrl('/assets/estrela.svg', 480)).toBe('/assets/estrela.svg')
  })

  it('URL do Storage que não é pública (`/object/sign/`)', () => {
    const assinada = 'https://x.supabase.co/storage/v1/object/sign/product-images/a.webp?token=abc'
    expect(renditionUrl(assinada, 360)).toBe(assinada)
  })

  it('o segmento aparecendo só na QUERY não conta — a régua olha o caminho', () => {
    const disfarce = 'https://cdn.example/img.jpg?ref=/storage/v1/object/public/x'
    expect(renditionUrl(disfarce, 360)).toBe(disfarce)
  })

  it('entrada que não é string volta como veio, sem lançar', () => {
    // `strictNullChecks` é `false` neste repositório: `null` chega em parâmetro tipado `string`
    // sem o compilador dizer nada, e um `.indexOf` direto derrubaria a vitrine inteira.
    expect(() => renditionUrl(null as unknown as string, 360)).not.toThrow()
    expect(renditionUrl(null as unknown as string, 360)).toBeNull()
    expect(renditionUrl(undefined as unknown as string, 360)).toBeUndefined()
  })
})

describe('renditionUrl — largura fora da faixa é grampeada (PRF-01 AC 3)', () => {
  it('abaixo do mínimo vira o mínimo', () => {
    // O Supabase RECUSA fora de 1..2500, e a resposta seria erro em vez de foto.
    expect(renditionUrl(OBJETO, 0)).toBe(`${RENDER}?width=${RENDITION_MIN_WIDTH}&quality=75`)
    expect(renditionUrl(OBJETO, -800)).toBe(`${RENDER}?width=${RENDITION_MIN_WIDTH}&quality=75`)
  })

  it('acima do máximo vira o máximo', () => {
    expect(renditionUrl(OBJETO, 9000)).toBe(`${RENDER}?width=${RENDITION_MAX_WIDTH}&quality=75`)
  })

  it('os limites em si passam intactos', () => {
    expect(renditionUrl(OBJETO, RENDITION_MIN_WIDTH)).toContain('width=1&')
    expect(renditionUrl(OBJETO, RENDITION_MAX_WIDTH)).toContain('width=2500&')
  })

  it('largura fracionária é arredondada — `width=171.5` não é número que o endpoint aceite', () => {
    expect(renditionUrl(OBJETO, 171.5)).toContain('width=172&')
  })

  it('largura que não é número nunca produz `width=NaN` — grampeia ao limite mais próximo', () => {
    expect(renditionUrl(OBJETO, NaN)).toBe(`${RENDER}?width=1&quality=75`)
    expect(renditionUrl(OBJETO, Infinity)).toBe(`${RENDER}?width=2500&quality=75`)
    expect(renditionUrl(OBJETO, -Infinity)).toBe(`${RENDER}?width=1&quality=75`)
  })
})

describe('renditionSrcSet — as três larguras numa string só', () => {
  it('devolve `url 360w, url 480w, url 720w`', () => {
    expect(renditionSrcSet(OBJETO)).toBe(
      `${RENDER}?width=360&quality=75 360w, ` +
        `${RENDER}?width=480&quality=75 480w, ` +
        `${RENDER}?width=720&quality=75 720w`,
    )
  })

  it('as larguras do `srcset` são exatamente `RENDITION_WIDTHS`', () => {
    // A lista não pode ser reescrita à mão em nenhuma superfície: é ela que o guarda de `PRF-15`
    // usa como régua do que é "cravado em JSX".
    const descritores = renditionSrcSet(OBJETO)
      .split(', ')
      .map((par) => Number(par.split(' ')[1].replace('w', '')))
    expect(descritores).toEqual([...RENDITION_WIDTHS])
  })

  it('aceita larguras próprias — a vaga pequena pede a dela', () => {
    expect(renditionSrcSet(OBJETO, [120, 240])).toBe(
      `${RENDER}?width=120&quality=75 120w, ${RENDER}?width=240&quality=75 240w`,
    )
  })

  it('entrada não transformável devolve string VAZIA, não a URL', () => {
    // `''` é o que faz a superfície omitir o atributo inteiro (`srcSet={x || undefined}`), em vez
    // de emitir um `srcset` de uma URL só que o navegador não usaria para nada.
    expect(renditionSrcSet('')).toBe('')
    expect(renditionSrcSet('https://cdn.parceiro.example/campanha.jpg')).toBe('')
    expect(renditionSrcSet('/assets/estrela.svg')).toBe('')
  })

  it('o descritor acompanha o grampeamento — nunca promete largura que a URL não pede', () => {
    // `"…width=2500… 9000w"` faria o navegador escolher errado para sempre.
    expect(renditionSrcSet(OBJETO, [9000])).toBe(`${RENDER}?width=2500&quality=75 2500w`)
  })
})

describe('imagePriority — o dono único da prioridade do LCP (PRF-03 AC 4)', () => {
  it('índice 0: ansioso, prioridade alta, e SEM animação de entrada', () => {
    expect(imagePriority(0)).toEqual({ loading: 'eager', fetchPriority: 'high', animateIn: false })
  })

  it('índices 1 a 5: ansiosos, sem `fetchPriority`, e sem animação', () => {
    // Mais de um `high` dilui a dica e o navegador passa a ignorar todas.
    for (const i of [1, 2, 3, 4, 5]) {
      expect(imagePriority(i)).toEqual({ loading: 'eager', animateIn: false })
      expect(imagePriority(i).fetchPriority).toBeUndefined()
    }
  })

  it('do índice 6 em diante: preguiçoso, com a animação de entrada de hoje', () => {
    // Abaixo da dobra a animação não custa métrica — é acima dela que ela escondia o LCP.
    for (const i of [6, 7, 23, 680]) {
      expect(imagePriority(i)).toEqual({ loading: 'lazy', animateIn: true })
    }
  })

  it('a fronteira é `EAGER_IMAGE_COUNT`, e ela vale 6 — três linhas de duas colunas em 390px', () => {
    expect(EAGER_IMAGE_COUNT).toBe(6)
    expect(imagePriority(EAGER_IMAGE_COUNT - 1).loading).toBe('eager')
    expect(imagePriority(EAGER_IMAGE_COUNT).loading).toBe('lazy')
  })

  it('índice AUSENTE cai no ramo preguiçoso — o padrão seguro', () => {
    // Superfície que não é listagem (o card do relacionado, o da busca) não passa índice, e o
    // comportamento dela tem de ser o de hoje, nunca "tudo ansioso".
    expect(imagePriority(undefined as unknown as number)).toEqual({
      loading: 'lazy',
      animateIn: true,
    })
    expect(imagePriority(-1)).toEqual({ loading: 'lazy', animateIn: true })
    expect(imagePriority(NaN)).toEqual({ loading: 'lazy', animateIn: true })
  })
})

describe('STORAGE_CACHE_CONTROL — um dono para o cache do Storage (PRF-05 AC 2)', () => {
  it('vale um ano em segundos, como string — é o que o `storage-js` recebe', () => {
    expect(STORAGE_CACHE_CONTROL).toBe('31536000')
    expect(Number(STORAGE_CACHE_CONTROL)).toBe(365 * 24 * 60 * 60)
  })

  it('não é a uma hora de hoje — o literal `3600` está escrito em dois workspaces', () => {
    expect(STORAGE_CACHE_CONTROL).not.toBe('3600')
  })
})
