// Feature 72 — o andaime do app do ateliê (`MAF-03`), lido do disco.
//
// Duas peças que nada mais confere e que quebram em silêncio: o script da raiz que sobe o app (um
// filtro com outro nome roda o workspace errado, ou nenhum) e a porta 8084 (a faixa do projeto, ao
// lado da loja em 8082 e do painel em 8083). A terceira — a `VITE_BACKOFFICE_URL` no `env` do build
// do Turbo — saiu em 2026-10-26 junto com o rodapé que a lia.
//
// O que este guarda NÃO mede: que o `vite build` gera `manifest.webmanifest` e `sw.js`. Isso é
// provado EXECUTANDO o build (o CI roda `pnpm build`; a validação da `72` mediu os quatro arquivos
// no `dist`), e a configuração que os produz é guardada por `manifest.test.ts` e
// `swSemDadosDaLoja.test.ts`.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = resolve(__dirname, '../../../../..')
const ler = (caminho: string) => readFileSync(resolve(raiz, caminho), 'utf8')

const mutar = (texto: string, de: string | RegExp, para: string) => {
  const novo = texto.replace(de, para)
  if (novo === texto) throw new Error(`mutação sem alvo: ${String(de)}`)
  return novo
}

/** O script `dev:mobile-adm` do `package.json` da raiz filtra o workspace do app. */
const scriptSobeOApp = (packageJson: string) =>
  (JSON.parse(packageJson).scripts?.['dev:mobile-adm'] as string | undefined) === 'pnpm --filter @estrelinha/mobile-adm dev'

/** A porta do `server` E a do `preview` do `vite.config.ts` do app. */
const portasDoVite = (viteConfig: string) => {
  const bloco = (nome: string) => viteConfig.match(new RegExp(`\\b${nome}:\\s*\\{([\\s\\S]*?)\\n  \\}`))?.[1] ?? null
  const porta = (b: string | null) => (b === null ? null : (b.match(/\bport:\s*(\d+)/)?.[1] ?? null))
  return { server: porta(bloco('server')), preview: porta(bloco('preview')) }
}

/**
 * O workspace que o filtro procura EXISTE com esse nome e tem `dev`. Sem isto, renomear o pacote
 * deixa o script da raiz apontando para o nada, e o `pnpm --filter` diz "No projects matched" e sai
 * com 0 (medido na verificação r2, mutante N12).
 */
const workspaceDoApp = (pacoteDoApp: string) => {
  const pacote = JSON.parse(pacoteDoApp)
  return pacote.name === '@estrelinha/mobile-adm' && pacote.scripts?.dev === 'vite'
}

const packageJson = ler('package.json')
const pacoteDoApp = ler('apps/mobile-adm/package.json')
const viteConfig = ler('apps/mobile-adm/vite.config.ts')

describe('o andaime do app (MAF-03)', () => {
  it('`pnpm dev:mobile-adm` sobe o workspace @estrelinha/mobile-adm', () => {
    expect(scriptSobeOApp(packageJson)).toBe(true)
    expect(workspaceDoApp(pacoteDoApp)).toBe(true)
  })

  it('o Vite do app roda na 8084, em dev e em preview', () => {
    expect(portasDoVite(viteConfig)).toEqual({ server: '8084', preview: '8084' })
  })
})

describe('sensores (cada régua reprova o mutante dela)', () => {
  it('o script filtrando outro workspace, ou ausente, reprova', () => {
    expect(scriptSobeOApp(mutar(packageJson, '--filter @estrelinha/mobile-adm dev', '--filter @estrelinha/backoffice dev'))).toBe(false)
    expect(scriptSobeOApp(mutar(packageJson, '"dev:mobile-adm"', '"dev:atelie"'))).toBe(false)
  })

  it('o pacote do app renomeado, ou sem `dev`, reprova', () => {
    expect(workspaceDoApp(mutar(pacoteDoApp, '"@estrelinha/mobile-adm"', '"@estrelinha/atelie"'))).toBe(false)
    expect(workspaceDoApp(mutar(pacoteDoApp, /"dev":\s*"vite"/, '"dev": "vite --port 9999"'))).toBe(false)
  })

  it('outra porta no server ou no preview reprova', () => {
    const [primeira] = viteConfig.match(/port: 8084/)!
    expect(portasDoVite(mutar(viteConfig, primeira, 'port: 8083'))).not.toEqual({ server: '8084', preview: '8084' })
    expect(portasDoVite(mutar(viteConfig, /(preview:\s*\{\s*port: )8084/, '$18082'))).not.toEqual({ server: '8084', preview: '8084' })
  })
})
