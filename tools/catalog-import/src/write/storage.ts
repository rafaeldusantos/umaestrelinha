import { type ImagePlan, extensionOf, storagePath } from '../map/image.ts'
import type { BytesCache } from './cache.ts'

export const BUCKET = 'product-images'

export interface UploadError {
  message?: string
  statusCode?: string | number
  error?: string
}

export interface StorageClientLike {
  storage: {
    from(bucket: string): {
      upload(
        path: string,
        body: Uint8Array,
        options: { contentType: string; cacheControl: string; upsert: boolean },
      ): Promise<{ error: UploadError | null }>
      list(
        path: string,
        options?: { limit?: number },
      ): Promise<{ data: Array<{ name: string }> | null; error: UploadError | null }>
    }
  }
}

export interface StorageDeps {
  fetch: typeof globalThis.fetch
  supabase: StorageClientLike
  supabaseUrl: string
  cache: BytesCache
  sleep?: (ms: number) => Promise<void>
  log?: (message: string) => void
}

/**
 * Tentativas de upload antes de declarar o Storage indisponível.
 *
 * Existe porque o primeiro import real morreu com **um** `fetch failed` no meio de 3.651 uploads —
 * um soquete que caiu, não um Storage fora do ar. Sem repetição, a regra do `CAT-06` ("Storage
 * indisponível ⇒ parada limpa") se torna "qualquer blip mata o import de 690 produtos", que não é o
 * que ela quer dizer. Com repetição, uma indisponibilidade de verdade ainda para — só que depois de
 * o Storage recusar três vezes seguidas.
 */
export const UPLOAD_ATTEMPTS = 3

export type ImageOutcome =
  | { kind: 'new'; url: string; path: string }
  | { kind: 'reused'; url: string; path: string }
  | { kind: 'failed'; motivo: string }

/** Erro de infraestrutura de Storage — **não** é falha de uma imagem, e para o import (`CAT-06`). */
export class StorageUnavailableError extends Error {}

/**
 * Os arquivos que a pasta do produto já tem, como caminhos completos.
 *
 * Existe porque descobrir "já está lá" **pelo erro de duplicata custa o corpo inteiro**: o Storage só
 * recusa depois de receber os bytes. Medido: a re-execução reenviava ~410 MB para aprender que nada
 * mudou, e foi isso que produziu **852 timeouts** contra o container local — o próprio ato de
 * verificar derrubava a verificação.
 *
 * Uma listagem por produto (689 chamadas pequenas) substitui até 28 uploads cada.
 *
 * Falha de listagem devolve conjunto vazio de propósito: o pior caso é voltar ao comportamento
 * antigo — subir e receber duplicata —, nunca deixar de gravar uma imagem que falta.
 */
export const existingPaths = async (
  productNuvemshopId: number,
  deps: Pick<StorageDeps, 'supabase' | 'log'>,
): Promise<Set<string>> => {
  const prefix = `nuvemshop/${productNuvemshopId}`
  const { data, error } = await deps.supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })

  if (error !== null || data === null) {
    deps.log?.(`não foi possível listar ${prefix}: ${error?.message ?? 'sem dados'}`)
    return new Set()
  }

  return new Set(data.map(item => `${prefix}/${item.name}`))
}

const CONTENT_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
}

const contentTypeOf = (url: string) => CONTENT_TYPES[extensionOf(url)] ?? 'application/octet-stream'

/**
 * O upload já existente devolve erro — e é assim que a idempotência é detectada.
 *
 * `upsert: false` é deliberado: reenviar 410 MB a cada execução seria o oposto de `CAT-03` ("não
 * apaga imagem já no Storage; só acrescenta o que falta"). O caminho é determinístico, então a
 * segunda execução colide de propósito, e a colisão é o sinal de "já está lá".
 */
const isDuplicate = (error: UploadError): boolean => {
  const status = String(error.statusCode ?? '')
  const message = `${error.message ?? ''} ${error.error ?? ''}`.toLowerCase()
  return status === '409' || message.includes('exists') || message.includes('duplicate')
}

/**
 * Baixa a imagem, preferindo a rendição WebP do CDN, e cai para o original quando ela não serve.
 *
 * Ordem: cache → WebP → cache do original → original. O cache vem primeiro em cada etapa porque o
 * objetivo dele é que a segunda execução **não toque o CDN**.
 */
const fetchBytes = async (
  plan: ImagePlan,
  deps: StorageDeps,
): Promise<{ bytes: Uint8Array; servedUrl: string } | { motivo: string }> => {
  const motivos: string[] = []

  for (const url of [plan.webpUrl, plan.originalUrl]) {
    const cached = await deps.cache.get(url)
    if (cached) return { bytes: cached, servedUrl: url }

    let response: Response
    try {
      response = await deps.fetch(url)
    } catch (err) {
      motivos.push(`${url}: ${(err as Error).message}`)
      continue
    }

    if (!response.ok) {
      motivos.push(`${url}: HTTP ${response.status}`)
      continue
    }

    // A rendição WebP só vale se for mesmo WebP: medido, uma das 12 amostras devolveu 200 com outro
    // tipo. Aceitar sem conferir gravaria bytes de erro num arquivo `.webp`.
    if (url === plan.webpUrl && plan.webpUrl !== plan.originalUrl) {
      const tipo = response.headers.get('content-type') ?? ''
      if (!tipo.includes('image/webp')) {
        motivos.push(`${url}: content-type ${tipo || 'ausente'}`)
        continue
      }
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    await deps.cache.set(url, bytes)
    return { bytes, servedUrl: url }
  }

  return { motivo: motivos.join(' · ') }
}

/**
 * Garante uma imagem no Storage e devolve a URL pública.
 *
 * **A divisão entre `CAT-07` e `CAT-06` mora aqui**, e é o que separa "produto entra sem a foto" de
 * "import para":
 *
 *  - falha ao **baixar** (403, 404, rede, tipo errado) é problema **daquela imagem** ⇒ `failed`, o
 *    produto entra sem ela e a falha vai nominal ao relatório;
 *  - falha ao **subir** que não seja duplicata é problema **do Storage** ⇒ lança, e o import para —
 *    porque seguir gravaria produto apontando para URL que não responde.
 */
export const ensureImage = async (
  plan: ImagePlan,
  deps: StorageDeps,
  existing: ReadonlySet<string> = new Set(),
): Promise<ImageOutcome> => {
  // Já gravada: sai ANTES de baixar e antes de subir. Os dois candidatos de extensão são conferidos
  // porque, sem baixar, não se sabe qual URL serviu — WebP ou o original do fallback.
  for (const candidato of [`${plan.storageBase}.webp`, `${plan.storageBase}${extensionOf(plan.originalUrl)}`]) {
    if (existing.has(candidato)) {
      return {
        kind: 'reused',
        url: `${deps.supabaseUrl}/storage/v1/object/public/${BUCKET}/${candidato}`,
        path: candidato,
      }
    }
  }

  const baixado = await fetchBytes(plan, deps)
  if ('motivo' in baixado) {
    deps.log?.(`imagem ${plan.storageBase} falhou: ${baixado.motivo}`)
    return { kind: 'failed', motivo: baixado.motivo }
  }

  const path = storagePath(plan, baixado.servedUrl)
  const url = `${deps.supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
  const sleep = deps.sleep ?? (async () => {})
  let ultimoErro: UploadError = { message: 'erro desconhecido' }

  for (let attempt = 0; attempt < UPLOAD_ATTEMPTS; attempt += 1) {
    let error: UploadError | null
    try {
      ;({ error } = await deps.supabase.storage.from(BUCKET).upload(path, baixado.bytes, {
        contentType: contentTypeOf(baixado.servedUrl),
        cacheControl: '3600',
        upsert: false,
      }))
    } catch (err) {
      // O client também pode LANÇAR em falha de rede, em vez de devolver `error`.
      error = { message: (err as Error).message }
    }

    if (error === null) return { kind: 'new', url, path }
    // Duplicata é resposta esperada e definitiva: o arquivo já está lá (CAT-03). Repetir seria
    // pedir três vezes a mesma negativa.
    if (isDuplicate(error)) return { kind: 'reused', url, path }

    ultimoErro = error
    if (attempt < UPLOAD_ATTEMPTS - 1) {
      deps.log?.(`upload de ${path} falhou (${error.message ?? error.error}); tentativa ${attempt + 2}/${UPLOAD_ATTEMPTS}`)
      await sleep(2 ** attempt * 500)
    }
  }

  throw new StorageUnavailableError(
    `falha ao gravar ${path} no Storage após ${UPLOAD_ATTEMPTS} tentativas: `
    + `${ultimoErro.message ?? ultimoErro.error ?? 'erro desconhecido'}`,
  )
}
