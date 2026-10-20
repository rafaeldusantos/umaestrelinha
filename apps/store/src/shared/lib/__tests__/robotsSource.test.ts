import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// O gerador é o `.mjs` do build; o `tsconfig.app.json` o resolve como JS, sem declaração à parte.
import { gerarRobots } from '../../../../scripts/robots.mjs'

/**
 * `SMP-21`, `SMP-22` e, desde a feature 70, `SMV-05` — o `robots.txt` que o rastreador lê.
 *
 * **Até a `69` a linha `Sitemap:` era o SEGUNDO dono da origem da loja**, escrita à mão em
 * `public/robots.txt`, ao lado da env `STORE_PUBLIC_URL`. Os dois podiam divergir sem nada quebrar —
 * e o Google **ignora referência de sitemap entre domínios**, então a descoberta pararia em silêncio.
 * A feature 70 tirou a linha do arquivo: `public/robots.txt` virou o MODELO, e quem escreve a linha é
 * o build (`scripts/robots.mjs`), a partir da env. Este arquivo foi reescrito para medir as duas
 * metades — o modelo e o que o gerador produz dele —, e nenhuma régua de antes saiu: a de "exatamente
 * uma linha, absoluta, na raiz" passou a ser aplicada ao arquivo GERADO, que é o que é servido.
 *
 * O `robots.txt` continua estático em `dist/` (`AD-022`): servi-lo por função foi recusado por
 * assimetria de dano — `robots.txt` em 5xx faz o Google parar de rastrear o site inteiro.
 *
 * A rotina diária (`.github/workflows/sitemap-check.yml`) continua conferindo que o **host** da linha
 * servida é o host que serve. Este arquivo não sabe qual domínio está no ar.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
/**
 * O caminho escrito por extenso, e não derivado de constante do código medido: a régua nunca pode
 * ser o objeto medido.
 */
const ROBOTS = join(resolve(HERE, '../../../../../..'), 'apps/store/public/robots.txt')

const MODELO = readFileSync(ROBOTS, 'utf8')
const LINHAS_DO_MODELO = MODELO.split(/\r?\n/)
const ehSitemap = (linha: string) => /^\s*sitemap\s*:/i.test(linha)

/** O que o build escreve em `dist/robots.txt`, com uma origem de produção qualquer. */
const GERADO = gerarRobots(MODELO, 'https://umaestrelinha.com.br') as string
const LINHAS_GERADAS = GERADO.split(/\r?\n/)
const SITEMAP_LINES = LINHAS_GERADAS.filter(ehSitemap)

describe('robots.txt — âncora da leitura', () => {
  it('o arquivo lido tem conteúdo de verdade', () => {
    // Sem esta âncora, um caminho errado (ou um arquivo esvaziado) faria as asserções abaixo
    // compararem nada com nada e passarem em silêncio — a pior falha possível num guarda de fonte.
    // Feature 70: o modelo encolheu (a linha `Sitemap:` saiu), e a âncora continua acima de 100.
    expect(MODELO.trim().length).toBeGreaterThan(100)
  })

  it('é o arquivo CERTO: as cinco diretivas `User-agent` continuam lá', () => {
    // Segunda metade da âncora dupla: contou o que leu. Um `robots.txt` de outro app passaria na
    // âncora de tamanho e reprovaria aqui.
    const agents = LINHAS_DO_MODELO.filter((linha) => /^\s*user-agent\s*:/i.test(linha))
    expect(agents).toHaveLength(5)
  })
})

describe('robots.txt — o modelo não tem dono da origem (SMV-05)', () => {
  it('o modelo NÃO traz linha `Sitemap:` — quem a escreve é o build, a partir de STORE_PUBLIC_URL', () => {
    // Uma linha escrita à mão aqui seria o segundo dono da origem de volta. O gerador também a
    // recusa (`robots.test.ts`), e o build falharia — esta asserção diz o porquê antes do build.
    expect(LINHAS_DO_MODELO.filter(ehSitemap)).toEqual([])
  })

  it('nenhum host está escrito no modelo', () => {
    expect(MODELO).not.toMatch(/https?:\/\//)
  })
})

describe('robots.txt gerado — a linha `Sitemap:` (SMP-21, SMV-05)', () => {
  it('existe exatamente UMA', () => {
    // Duas linhas não são erro de sintaxe — o protocolo aceita várias, e o Google leria as duas.
    // Numa loja com um sitemap só, a segunda seria sempre a que alguém esqueceu de apagar.
    expect(SITEMAP_LINES).toHaveLength(1)
  })

  it('a URL é absoluta, https, e é a da origem passada — sem barra dupla', () => {
    // Referência relativa é ignorada pelo Google — e ignorada em silêncio, que é o modo de falha
    // que este arquivo inteiro existe para evitar.
    const url = SITEMAP_LINES[0].split(/:\s*/).slice(1).join(':').trim()
    expect(url).toBe('https://umaestrelinha.com.br/sitemap.xml')
    expect(() => new URL(url)).not.toThrow()
  })

  it('aponta para `/sitemap.xml` na raiz do domínio', () => {
    const url = new URL(SITEMAP_LINES[0].split(/:\s*/).slice(1).join(':').trim())
    // Raiz: um sitemap em subdiretório só pode declarar URLs daquele subdiretório.
    expect(url.pathname).toBe('/sitemap.xml')
  })

  it('as demais linhas são as do modelo, iguais e na mesma ordem', () => {
    expect(LINHAS_GERADAS.filter((l) => !ehSitemap(l)).join('\n').trimEnd()).toBe(MODELO.trimEnd())
  })
})

describe('robots.txt — o que já existia continua intacto (SMP-22)', () => {
  it('os rastreadores nomeados seguem liberados', () => {
    for (const agent of ['Googlebot', 'Bingbot', 'Twitterbot', 'facebookexternalhit', '*']) {
      expect(GERADO).toContain(`User-agent: ${agent}`)
    }
  })

  it('nenhuma diretiva `Disallow` foi introduzida — nem no modelo, nem pelo gerador', () => {
    // Decidir o que bloquear é política de rastreamento, e está fora do escopo da feature 33
    // (`Out of Scope` da spec). Uma linha `Disallow` que entrasse de carona aqui poderia esconder
    // metade do catálogo sem ninguém perceber.
    for (const linhas of [LINHAS_DO_MODELO, LINHAS_GERADAS]) {
      expect(linhas.filter((linha) => /^\s*disallow\s*:/i.test(linha))).toHaveLength(0)
    }
  })
})
