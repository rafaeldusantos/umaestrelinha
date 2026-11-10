// O job do cancelamento automático contra o banco LOCAL — a parte do probe `10-cancelamento-automatico.sh`
// que precisa mexer no relógio. Roda o handler REAL (`runUnpaidCancellation`) com o supabase-js real
// (service role, PostgREST local) e o motor de notificação real; só o relógio é empurrado 10 dias à
// frente, para os pedidos semeados depois da data de corte (gravada quando a migration foi aplicada)
// já terem vencido. O Mercado Pago é um fetch que só registra a chamada: nada sai da máquina.
//
// Uso (o .sh chama): npx tsx <este arquivo> <url> <service-role-key> <agora ISO>
import { createClient } from '@supabase/supabase-js'
import { runUnpaidCancellation } from '../../../../supabase/functions/cancel-unpaid-orders/handlers.ts'

const [url, chave, agora] = process.argv.slice(2)
const chamadasMp: string[] = []
const fetchQueSoRegistra = (async (entrada: unknown, init?: RequestInit) => {
  const alvo = String(entrada)
  if (alvo.startsWith('https://api.mercadopago.com/')) {
    chamadasMp.push(`${init?.method ?? 'GET'} ${alvo}`)
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  throw new Error(`o probe não deixa sair: ${alvo}`)
}) as typeof fetch

const r = await runUnpaidCancellation({
  supabase: createClient(url, chave, { auth: { persistSession: false } }),
  fetch: fetchQueSoRegistra,
  env: { mpAccessToken: 'TEST-invalido', jobKey: 'nao-usada' },
  notifications: {
    resendApiKey: 're_invalida',
    resendFrom: 'Uma Estrelinha <loja@exemplo.invalid>',
    storePublicUrl: 'http://localhost:8082',
    adminPublicUrl: 'http://localhost:8083',
  },
  providers: [],
  now: () => new Date(agora),
})
console.log(JSON.stringify({ cancelled: r.cancelled.sort(), mp: chamadasMp.sort() }))
