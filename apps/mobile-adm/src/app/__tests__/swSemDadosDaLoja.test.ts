// Feature 72, T05 — o service worker guarda SÓ a casca (`MAF-20`, `AD-056`).
//
// Dado da loja desatualizado é pior que ausente: um pedido "aguardando pagamento" servido do cache
// depois de pago faria a dona cobrar quem já pagou. A regra é estrutural — o workbox não tem cache
// em tempo de execução nenhum, e o precache não alcança arquivo de dado. A régua lê a configuração
// que o `vite.config.ts` entrega ao plugin (`pwa.config.ts`; a fiação é `manifest.test.ts`).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { VitePWAOptions } from 'vite-plugin-pwa'
import { pwaOptions } from '../../../pwa.config'

type Workbox = NonNullable<VitePWAOptions['workbox']>

/** Os motivos de recusa da configuração do workbox. Vazio = só a casca. */
function recusasDoSw(workbox: Partial<Workbox> | undefined): string[] {
  const motivos: string[] = []
  if (!workbox) return ['sem configuração de workbox']
  const runtime = workbox.runtimeCaching ?? []
  if (runtime.length > 0) motivos.push('runtimeCaching')
  for (const regra of runtime) {
    const padrao = regra.urlPattern
    const casaBanco =
      padrao instanceof RegExp
        ? padrao.test('https://hgkrsfpupypxtygjgthf.supabase.co/rest/v1/orders')
        : typeof padrao === 'string'
          ? padrao.includes('supabase.co')
          : true // função: não há como provar que não casa o banco
    if (casaBanco) motivos.push('urlPattern alcança supabase.co')
  }
  if ((workbox.globPatterns ?? []).some((g) => /json/.test(g))) motivos.push('json no precache')
  return motivos
}

describe('o service worker do ateliê não guarda dado da loja (MAF-20)', () => {
  it('a configuração real é só casca: nenhuma recusa', () => {
    expect(recusasDoSw(pwaOptions.workbox)).toEqual([])
  })

  it('âncora: a configuração existe e pré-carrega a casca (js, css, html, woff2)', () => {
    const globs = pwaOptions.workbox?.globPatterns ?? []
    expect(globs.length).toBeGreaterThan(0)
    for (const ext of ['js', 'css', 'html', 'woff2']) expect(globs.join(' ')).toContain(ext)
    expect(pwaOptions.workbox?.runtimeCaching).toBeUndefined()
  })

  it('MAF-19 — toda navegação offline recebe a casca: `navigateFallback` é o index.html', () => {
    // S15 da verificação r3: sem ele, abrir sem rede num endereço que não seja `/` (o `/pedidos` de
    // um atalho, por exemplo) não recebe a casca, e a tela "Sem conexão" nunca chega a montar.
    expect(pwaOptions.workbox?.navigateFallback).toBe('/index.html')
    const negadas = pwaOptions.workbox?.navigateFallbackDenylist ?? []
    for (const rota of ['/', '/login', '/pedidos', '/clientes', '/descontos']) {
      expect(negadas.some((re) => re.test(rota))).toBe(false)
    }
  })

  it('a versão nova vale na próxima abertura, sem perguntar (`autoUpdate`)', () => {
    // S21 da verificação r3: a spec decide isso (Assumptions, "Atualização do app") e o design o usa
    // como mitigação de bundle velho chamando RPC que mudou. `prompt` deixaria a versão antiga
    // rodando até alguém tocar num aviso.
    expect(pwaOptions.registerType).toBe('autoUpdate')
  })

  it('sensor: cache em tempo de execução para o host do banco reprova', () => {
    const motivos = recusasDoSw({
      globPatterns: ['**/*.{js,css,html}'],
      runtimeCaching: [{ urlPattern: /^https:\/\/.*\.supabase\.co\/.*/, handler: 'NetworkFirst' }],
    })
    expect(motivos).toEqual(['runtimeCaching', 'urlPattern alcança supabase.co'])
  })

  it('sensor: QUALQUER cache em tempo de execução reprova, mesmo de outro host', () => {
    expect(
      recusasDoSw({ runtimeCaching: [{ urlPattern: /^https:\/\/fonts\.example\//, handler: 'CacheFirst' }] }),
    ).toEqual(['runtimeCaching'])
  })

  it('sensor: urlPattern por função é tratado como alcançando o banco', () => {
    expect(recusasDoSw({ runtimeCaching: [{ urlPattern: () => true, handler: 'NetworkFirst' }] })).toContain(
      'urlPattern alcança supabase.co',
    )
  })

  it('sensor: json no precache reprova', () => {
    expect(recusasDoSw({ globPatterns: ['**/*.{js,json}'] })).toEqual(['json no precache'])
  })
})

// Feature `79` (design §6, `MAN-03`, `MAN-22`): o aviso de pedido entra no worker por `importScripts`
// — e SÓ o arquivo dos avisos, que não vai à rede nem guarda nada.
const AVISOS = readFileSync(resolve(__dirname, '../../../public/sw-avisos.js'), 'utf8')

/** Os motivos de recusa do arquivo dos avisos. Comentário sai antes (linha e bloco na mesma passada). */
function recusasDoArquivoDeAvisos(fonte: string): string[] {
  const codigo = fonte.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')
  const motivos: string[] = []
  if (/(?<![\w$])fetch\s*\(/.test(codigo)) motivos.push('fetch(')
  if (/(?<![\w$])caches(?![\w$])/.test(codigo)) motivos.push('caches')
  return motivos
}

describe('o arquivo dos avisos no service worker (feature 79)', () => {
  it('`importScripts` é EXATAMENTE `[\'sw-avisos.js\']`', () => {
    expect(pwaOptions.workbox?.importScripts).toEqual(['sw-avisos.js'])
  })

  it('âncora: o arquivo foi lido e é o dos avisos (os dois ouvintes)', () => {
    expect(AVISOS).toContain("addEventListener('push'")
    expect(AVISOS).toContain("addEventListener('notificationclick'")
  })

  it('`public/sw-avisos.js` não tem `fetch(` nem `caches`', () => {
    expect(recusasDoArquivoDeAvisos(AVISOS)).toEqual([])
  })

  it('sensor: `fetch(` reprova, `caches` reprova — e a prosa não', () => {
    expect(recusasDoArquivoDeAvisos("self.addEventListener('push', () => fetch('/x'))")).toEqual(['fetch('])
    expect(recusasDoArquivoDeAvisos("caches.open('v1')")).toEqual(['caches'])
    expect(recusasDoArquivoDeAvisos('// sem fetch( e sem caches\r\nvar a = 1')).toEqual([])
    expect(recusasDoArquivoDeAvisos('/* fetch( */\nvar a = 1')).toEqual([])
    expect(recusasDoArquivoDeAvisos('var prefetch = 1; var cachesX = 2')).toEqual([])
  })
})
