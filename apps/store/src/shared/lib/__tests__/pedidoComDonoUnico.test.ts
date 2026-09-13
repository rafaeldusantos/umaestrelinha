import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * `PED-03` — **o pedido tem um gravador só**, e ele é a edge function `checkout`.
 *
 * Até a feature `49` a loja montava a linha de `orders` no navegador e inseria pelo PostgREST,
 * escopada por RLS. Aquele caminho não servia à convidada (não há `auth.uid()` para escopar), e
 * **mantido ao lado do novo seria o "defeito 01" no caminho do dinheiro**: duas montagens da mesma
 * linha, divergindo na primeira coluna que só uma delas ganhasse — sem que build, `tsc` ou teste de
 * componente acusassem. O modo de falhar é a loja gravar um pedido que o servidor não reconhece.
 *
 * ⚠️ **As policies de `INSERT` continuam no banco**, de propósito: entre o `db push` e o deploy da
 * Vercel há minutos em que uma aba já aberta ainda insere pelo caminho antigo, e fechá-la à força
 * custaria venda. **Este guarda é quem impede o segundo gravador**, não a policy. Derrubá-las está
 * registrado no `BACKLOG.md`.
 *
 * Molde: `categoryTreeSingleOwner.test.ts` — zero allowlist, âncora dupla, e os diretórios escritos
 * **literalmente**, porque a régua nunca pode ser o objeto que ela mede.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escritos um a um, e não derivados de constante: a régua não pode ser o objeto medido. */
const ESCOPO = ['apps/store/src', 'apps/backoffice/src']

/** As tabelas que só a edge function pode gravar. */
const TABELAS = ['orders', 'order_items'] as const

interface Arquivo {
  nome: string
  fonte: string
}

/**
 * Remove comentário de linha **e** de bloco na MESMA varredura.
 *
 * `[^\n\r]` fecha antes do `\r`: com `.` o comentário de uma linha em arquivo CRLF engoliria a
 * linha seguinte, e uma gravação escrita logo abaixo de um comentário passaria invisível. É a
 * correção que a `BL-027` aplicou em `freeShippingSingleOwner.test.ts`.
 */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const arquivosDe = (relativo: string): Arquivo[] => {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === 'node_modules' || entrada.name === '__tests__') continue
        andar(caminho)
        continue
      }
      if (!/\.tsx?$/.test(entrada.name)) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').split('/src/')[1] ?? entrada.name,
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(resolve(ROOT, relativo))
  return saida
}

const arquivos = ESCOPO.flatMap(arquivosDe)

/**
 * `from('orders').insert(` — a GRAVAÇÃO, não a leitura.
 *
 * A cadeia pode ter `.select()` ou quebra de linha no meio (é o que o Prettier produz sozinho),
 * então a régua aceita qualquer coisa que não seja outra chamada a `from` entre as duas partes.
 */
const gravaEm = (fonte: string, tabela: string): boolean =>
  new RegExp(`from\\(\\s*['"\`]${tabela}['"\`]\\s*\\)(?:(?!from\\()[\\s\\S]){0,200}?\\.insert\\(`).test(
    semComentario(fonte),
  )

/** Qualquer uso de `from('<tabela>')`, para a âncora — a LEITURA continua existindo e é legítima. */
const tocaEm = (fonte: string, tabela: string): boolean =>
  new RegExp(`from\\(\\s*['"\`]${tabela}['"\`]\\s*\\)`).test(semComentario(fonte))

describe('PED-03 — o pedido tem um gravador só', () => {
  it('a varredura leu os dois apps — âncora de arquivos', () => {
    // Sem âncora, um caminho errado varreria zero arquivo e a asserção de ausência passaria sobre
    // uma lista vazia: a pior falha possível num teste que lê disco.
    expect(arquivos.length).toBeGreaterThanOrEqual(400)
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining(['entities/order/api/useOrders.ts', 'pages/CheckoutPage.tsx']),
    )
  })

  it('alguém ainda LÊ `orders` — âncora de ocorrência', () => {
    // A segunda âncora. Se a régua parasse de casar `from('orders')` por completo (aspas trocadas,
    // formatação nova), a asserção de ausência abaixo continuaria verde sobre nada.
    const leitores = arquivos.filter((a) => tocaEm(a.fonte, 'orders')).map((a) => a.nome)

    expect(leitores.length).toBeGreaterThanOrEqual(2)
  })

  it.each(TABELAS)('nenhum arquivo de produção grava em `%s`', (tabela) => {
    const gravadores = arquivos.filter((a) => gravaEm(a.fonte, tabela)).map((a) => a.nome)

    expect(gravadores).toEqual([])
  })

  it('sensor — uma gravação É acusada, em uma linha e em várias', () => {
    // As duas formas: a compacta e a que o Prettier produz sozinho ao quebrar a cadeia.
    expect(gravaEm(`supabase.from('orders').insert({ total: 1 })`, 'orders')).toBe(true)
    expect(
      gravaEm(
        `const { data } = await supabase\n  .from('orders')\n  .insert(pedido)\n  .select('id')\n  .single()`,
        'orders',
      ),
    ).toBe(true)
    expect(gravaEm(`supabase.from("order_items").insert(itens)`, 'order_items')).toBe(true)
  })

  it('sensor inverso — LER `orders` não é acusado', () => {
    // Sem este par, uma régua que recusasse qualquer `from('orders')` passaria como "sensível" e
    // proibiria a consulta que a confirmação e a conta precisam fazer.
    expect(gravaEm(`supabase.from('orders').select('*').eq('id', id)`, 'orders')).toBe(false)
    expect(gravaEm(`supabase.from('orders').update({ x: 1 }).eq('id', id)`, 'orders')).toBe(false)
  })

  it('sensor — um insert em OUTRA tabela entre as duas partes não é atribuído a `orders`', () => {
    // O falso positivo que uma régua gulosa produziria: ler `orders` e, linhas depois, gravar em
    // `addresses` viraria "grava pedido".
    const fonte = `
      await supabase.from('orders').select('*')
      await supabase.from('addresses').insert(endereco)
    `

    expect(gravaEm(fonte, 'orders')).toBe(false)
  })

  it('sensor do removedor de comentário — CRLF e LF, menção não é uso', () => {
    expect(gravaEm(`// antes: supabase.from('orders').insert(x)\nselect()`, 'orders')).toBe(false)
    expect(gravaEm(`/* from('orders').insert(x) */\r\nconst a = 1`, 'orders')).toBe(false)
    // E o par: fora do comentário, continua sendo acusado.
    expect(
      gravaEm(`// nota em CRLF\r\nsupabase.from('orders').insert(pedido)`, 'orders'),
    ).toBe(true)
  })
})
