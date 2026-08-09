import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@supabase/supabase-js'

import { createNuvemshopClient } from './nuvemshop/client.ts'
import { run, type StopAfter } from './run.ts'
import { createDiskCache, createMemoryCache } from './write/cache.ts'
import { adaptSupabase, type SupabaseJsLike } from './write/db.ts'

/**
 * Wiring, e só wiring — env, clients, chamada, saída.
 *
 * Sem teste de propósito, pelo mesmo motivo do `index.ts` das edge functions (`AD-004`): tudo o que
 * DECIDE algo vive em `run.ts` e nos mapeadores, que são testados. O que este arquivo prova é
 * provado pela execução real contra o banco local (T17), não por dublê.
 */

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = resolve(AQUI, '../../..')

const flag = (nome: string) => process.argv.includes(`--${nome}`)
const valor = (nome: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${nome}=`))?.split('=').slice(1).join('=')

const exigir = (nome: string): string => {
  const v = process.env[nome]
  if (!v || v.trim() === '') {
    console.error(`\nFalta a variável ${nome}. Preencha o .env da raiz (ver .env.example).\n`)
    process.exit(1)
  }
  return v
}

const main = async () => {
  try {
    process.loadEnvFile(join(RAIZ, '.env'))
  } catch {
    // Sem .env na raiz: as variáveis podem vir do ambiente. `exigir` reclama do que faltar.
  }

  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? 'http://127.0.0.1:54341'
  const serviceRoleKey = exigir('SUPABASE_SERVICE_ROLE_KEY')

  const nuvemshop = createNuvemshopClient(
    {
      storeId: exigir('NUVEMSHOP_STORE_ID'),
      accessToken: exigir('NUVEMSHOP_ACCESS_TOKEN'),
      userAgent: exigir('NUVEMSHOP_USER_AGENT'),
      apiVersion: process.env.NUVEMSHOP_API_VERSION ?? '2025-03',
    },
    {
      fetch: globalThis.fetch,
      sleep: (ms: number) => new Promise(r => setTimeout(r, ms)),
      log: (m: string) => console.log(`  ${m}`),
    },
  )

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const dryRun = flag('dry-run')
  const limite = valor('limit')
  const concorrencia = valor('concurrency')

  console.log(`\nImport do catálogo Nuvemshop → ${supabaseUrl}${dryRun ? '  [DRY-RUN]' : ''}\n`)

  const report = await run(
    {
      nuvemshop,
      supabase: { ...adaptSupabase(client as unknown as SupabaseJsLike), storage: client.storage } as never,
      supabaseUrl,
      cache: flag('no-cache') ? createMemoryCache() : createDiskCache(join(AQUI, '..', '.cache')),
      fetch: globalThis.fetch,
      log: (m: string) => console.log(`  ${m}`),
    },
    {
      dryRun,
      stopAfter: valor('stop-after') as StopAfter | undefined,
      limit: limite ? Number(limite) : undefined,
      concurrency: concorrencia ? Number(concorrencia) : undefined,
    },
  )

  console.log(`\n${report.toText()}\n`)

  const destino = valor('report')
  if (destino) {
    await mkdir(dirname(resolve(destino)), { recursive: true })
    await writeFile(resolve(destino), report.toJSON(), 'utf8')
    console.log(`relatório JSON em ${resolve(destino)}\n`)
  }

  process.exitCode = report.exitCode()
}

main().catch(err => {
  console.error(`\nFALHOU: ${(err as Error).message}\n`)
  process.exitCode = 1
})
