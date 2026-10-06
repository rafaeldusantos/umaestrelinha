// Feature 61 · CMP-08 — "este tráfego é de produção?".
//
// A homologação usa a MESMA propriedade do GA4 que a loja de verdade. O que separa os números é o
// parâmetro `traffic_type=internal` mais o filtro "Tráfego interno" do GA4. Quem responde a
// pergunta é esta função, lida pelos DOIS lados: o navegador (com `location.hostname`) e o servidor
// (com o host de `STORE_PUBLIC_URL`). Duas escritas divergiriam no `www.` ou na porta, e a mesma
// compra seria interna num lado e real no outro.
//
// O host de produção é CONFIGURAÇÃO (`store_settings.analytics.production_host`), nunca literal no
// código — ele muda uma vez, na troca de domínio.
//
// ⚠️ Este arquivo NÃO importa nada (ver `ids.ts`).

/** Minúsculas, sem porta, sem ponto final e sem o `www.` da frente. */
function canonicalHost(host: string | null | undefined): string {
  if (typeof host !== 'string') return ''
  let h = host.trim().toLowerCase()
  const porta = h.lastIndexOf(':')
  if (porta !== -1 && !h.includes(']')) h = h.slice(0, porta)
  if (h.endsWith('.')) h = h.slice(0, -1)
  if (h.startsWith('www.')) h = h.slice(4)
  return h
}

/**
 * `'internal'` em qualquer host que não seja o de produção; `null` no de produção.
 *
 * **Sem host de produção configurado, tudo é interno.** A dúvida cai para o lado que não polui os
 * relatórios: um número real marcado como interno some do relatório e reaparece ao configurar; um
 * número de teste marcado como real fica misturado à receita para sempre.
 */
export function trafficType(
  host: string | null | undefined,
  productionHost: string | null | undefined,
): 'internal' | null {
  const prod = canonicalHost(productionHost)
  if (prod === '') return 'internal'
  return canonicalHost(host) === prod ? null : 'internal'
}
