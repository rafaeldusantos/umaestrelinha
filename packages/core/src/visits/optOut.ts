// Feature 71 · VIS-42, VIS-43 — o parâmetro que tira um navegador da contagem de visitas.
//
// UM dono para dois apps que não se importam: a loja LÊ o parâmetro (`readOptOutParam`) e o painel
// ESCREVE o link (`optOutHref`, no menu da conta). Duas grafias produziriam um link que a loja não
// reconhece, sem nada quebrar.
//
// `readOptOutParam` devolve um discriminante de TEXTO (`'on' | 'off' | null`): com
// `strictNullChecks` em `false`, união por booleano não estreita.
//
// ⚠️ Este arquivo não importa nada: é folha alcançável pelo Deno.

export const OPT_OUT_PARAM = 'nao-contar'

/** O link que abre a loja ligando (`on`) ou desligando a marca de "não contar" deste navegador. */
export function optOutHref(origin: string, on: boolean): string {
  return `${origin}/?${OPT_OUT_PARAM}=${on ? 1 : 0}`
}

/** `'on'` para `=1`, `'off'` para `=0`; ausente ou qualquer outro valor ⇒ `null`. */
export function readOptOutParam(search: string): 'on' | 'off' | null {
  const valor = new URLSearchParams(search).get(OPT_OUT_PARAM)
  if (valor === '1') return 'on'
  if (valor === '0') return 'off'
  return null
}
