// Dublês desta function. Os genéricos (`fetch` e `supabase`) foram movidos para
// `_shared/testing/fakes.ts` quando a `send-email` passou a precisar dos mesmos — este arquivo
// reexporta, de propósito, para que `handlers.test.ts` não mudasse nem um byte.
//
// O que continua morando aqui é o que é ESPECÍFICO da `mercado-pago`: o env de teste e a montagem
// das `Deps` dela.

import type { Deps } from '../handlers.ts'
import type { FakeFetch, FakeSupabase } from '../../_shared/testing/fakes.ts'

export {
  createFakeFetch,
  createFakeSupabase,
  type FakeFetch,
  type FakeSupabase,
  type FakeSupabaseOptions,
  type FetchCall,
  type FetchRoute,
  type RowFixture,
  type RpcCall,
  type UpdateCall,
} from '../../_shared/testing/fakes.ts'

export const TEST_ENV: Deps['env'] = {
  mpAccessToken: 'APP_USR-test-token',
  mpWebhookSecret: 'segredo-de-teste',
  // Espelha o default de produção (07/T14): estrito. Os testes que exercitam o modo leniente
  // passam `{ strictVariantPricing: false }` explicitamente.
  strictVariantPricing: true,
}

/** Env do e-mail transacional (feature 10). Separado de `TEST_ENV`, que é sobre o Mercado Pago. */
export const TEST_EMAIL_ENV: Deps['email'] = {
  resendApiKey: 're_test_key',
  resendFrom: 'Nanita <onboarding@resend.dev>',
  storePublicUrl: 'https://nanita.com.br',
}

export function createDeps(
  supabase: FakeSupabase,
  fetchDouble: FakeFetch,
  env: Partial<Deps['env']> = {},
  email: Partial<Deps['email']> = {},
): Deps {
  return {
    supabase: supabase.client,
    fetch: fetchDouble.fetch,
    env: { ...TEST_ENV, ...env },
    email: { ...TEST_EMAIL_ENV, ...email },
  }
}
