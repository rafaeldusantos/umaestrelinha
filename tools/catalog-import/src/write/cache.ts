import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export interface BytesCache {
  get(url: string): Promise<Uint8Array | null>
  set(url: string, bytes: Uint8Array): Promise<void>
}

const keyOf = (url: string) => createHash('sha1').update(url).digest('hex')

/**
 * Cache em disco das imagens baixadas do CDN.
 *
 * Não é otimização gratuita: `supabase db reset` recria o banco e leva junto `storage.objects`, de
 * modo que toda re-execução depois de um reset precisa subir as 3.660 imagens de novo. Sem cache,
 * isso significa refazer ~410 MB de download no CDN de terceiro a cada reset local.
 *
 * A chave é a URL, e não o caminho no Storage: o que se está guardando são os bytes que aquela URL
 * serviu — inclusive a decisão WebP-ou-original que a URL já carrega.
 */
export const createDiskCache = (dir: string): BytesCache => ({
  async get(url) {
    try {
      return await readFile(join(dir, keyOf(url)))
    } catch {
      // Ausência é o caso normal na primeira execução, não erro.
      return null
    }
  },
  async set(url, bytes) {
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, keyOf(url)), bytes)
  },
})

/** Cache que não persiste — usado nos testes e por `--no-cache`. */
export const createMemoryCache = (): BytesCache => {
  const store = new Map<string, Uint8Array>()
  return {
    async get(url) { return store.get(keyOf(url)) ?? null },
    async set(url, bytes) { store.set(keyOf(url), bytes) },
  }
}
