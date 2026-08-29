import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `SMP-21`, `SMP-22` — a linha `Sitemap:` do `robots.txt`.
 *
 * **Esta linha é o SEGUNDO dono da origem da loja, e isso foi assumido de propósito.** O primeiro é
 * o secret `STORE_PUBLIC_URL`, de que a function do sitemap tira o host de todas as 719 `<loc>` (e
 * de que o `<g:link>` das ofertas do Shopping já dependia). Ter os dois é o "defeito 01" em
 * miniatura: eles podem divergir sem nada quebrar — o `robots.txt` apontaria para um domínio e o
 * sitemap declararia outro, e o Google **ignora referência de sitemap entre domínios**, então a
 * descoberta simplesmente pararia de funcionar em silêncio.
 *
 * A alternativa era servir o `robots.txt` pela mesma edge function, dando um dono só à origem. Ela
 * está **recusada por assimetria de dano**: `robots.txt` em 5xx faz o Google **parar de rastrear o
 * site inteiro** enquanto durar, e um sitemap em 5xx custa uma releitura. Trocar uma divergência de
 * host por um caminho de falha que apaga a loja da busca é um péssimo negócio.
 *
 * A contenção é dupla: este arquivo fixa a **forma** da linha, e a rotina diária
 * (`.github/workflows/sitemap-check.yml`) confere que o **host** dela é o host que serve. Nenhum dos
 * dois sozinho basta — este não sabe qual domínio está no ar, e aquele não roda no CI de PR.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/**
 * O caminho escrito por extenso, e não derivado de constante do código medido: a régua nunca pode
 * ser o objeto medido.
 */
const ROBOTS = join(resolve(HERE, '../../../../../..'), 'apps/store/public/robots.txt')

const RAW = readFileSync(ROBOTS, 'utf8')
const LINHAS = RAW.split(/\r?\n/)
const SITEMAP_LINES = LINHAS.filter((linha) => /^\s*sitemap\s*:/i.test(linha))

describe('robots.txt — âncora da leitura', () => {
  it('o arquivo lido tem conteúdo de verdade', () => {
    // Sem esta âncora, um caminho errado (ou um arquivo esvaziado) faria as asserções abaixo
    // compararem nada com nada e passarem em silêncio — a pior falha possível num guarda de fonte.
    expect(RAW.trim().length).toBeGreaterThan(100)
  })

  it('é o arquivo CERTO: as cinco diretivas `User-agent` continuam lá', () => {
    // Segunda metade da âncora dupla: contou o que leu. Um `robots.txt` de outro app passaria na
    // âncora de tamanho e reprovaria aqui.
    const agents = LINHAS.filter((linha) => /^\s*user-agent\s*:/i.test(linha))
    expect(agents).toHaveLength(5)
  })
})

describe('robots.txt — a linha `Sitemap:` (SMP-21)', () => {
  it('existe exatamente UMA', () => {
    // Duas linhas não são erro de sintaxe — o protocolo aceita várias, e o Google leria as duas.
    // Numa loja com um sitemap só, a segunda seria sempre a que alguém esqueceu de apagar.
    expect(SITEMAP_LINES).toHaveLength(1)
  })

  it('a URL é absoluta e https', () => {
    // Referência relativa é ignorada pelo Google — e ignorada em silêncio, que é o modo de falha
    // que este arquivo inteiro existe para evitar.
    const url = SITEMAP_LINES[0].split(/:\s*/).slice(1).join(':').trim()
    expect(url.startsWith('https://')).toBe(true)
    expect(() => new URL(url)).not.toThrow()
  })

  it('aponta para `/sitemap.xml` na raiz do domínio', () => {
    const url = new URL(SITEMAP_LINES[0].split(/:\s*/).slice(1).join(':').trim())
    // Raiz: um sitemap em subdiretório só pode declarar URLs daquele subdiretório.
    expect(url.pathname).toBe('/sitemap.xml')
  })
})

describe('robots.txt — o que já existia continua intacto (SMP-22)', () => {
  it('os rastreadores nomeados seguem liberados', () => {
    for (const agent of ['Googlebot', 'Bingbot', 'Twitterbot', 'facebookexternalhit', '*']) {
      expect(RAW).toContain(`User-agent: ${agent}`)
    }
  })

  it('nenhuma diretiva `Disallow` foi introduzida', () => {
    // Decidir o que bloquear é política de rastreamento, e está fora do escopo da feature 33
    // (`Out of Scope` da spec). Uma linha `Disallow` que entrasse de carona aqui poderia esconder
    // metade do catálogo sem ninguém perceber.
    expect(LINHAS.filter((linha) => /^\s*disallow\s*:/i.test(linha))).toHaveLength(0)
  })
})
