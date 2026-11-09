// "Esta requisição veio de dentro de um data center?" — a régua de rede da function `visit`.
//
// Por que existe: em 2026-11-08 e 2026-11-09 um robô gravou ~400 "visitas únicas" a partir de 157 IPs
// da ColoCrossing. Ele roda um Chrome de verdade, com user agent comum e sem a marca de automação,
// aceita os cookies e começa cada acesso com um perfil zerado — passa por todas as réguas do
// navegador (`visitRefusal`) e pelo teto por IP. A rede de origem é o que o denuncia: gente comprando
// joia não navega de dentro de um data center.
//
// Só o servidor aplica esta régua (o navegador não sabe o próprio IP), e por isso este módulo fica
// FORA do barril de `visits` — a loja não carrega as faixas.
//
// O IP de verdade é o `cf-connecting-ip`, que a Cloudflare escreve e o cliente não forja. O
// `x-forwarded-for` o cliente pode preencher (a Cloudflare acrescenta ao fim, não substitui), então a
// régua confere TODOS os candidatos: basta um deles ser de data center para recusar. Um candidato
// inventado pelo cliente só pode tirar a visita dele mesmo da contagem, nunca pôr uma.
//
// ⚠️ Alcançável pelo Deno: o único import é relativo e com `.ts`.

import { DATACENTER_RANGES } from './datacenterRanges.ts'

/** Uma faixa compilada: o endereço em palavras de 16 bits e o tamanho do prefixo. */
interface Faixa {
  v6: boolean
  palavras: number[]
  bits: number
}

/** IPv4 em 2 palavras de 16 bits; `null` quando não é um IPv4 bem formado. */
function ipv4(ip: string): number[] | null {
  const partes = ip.split('.')
  if (partes.length !== 4) return null
  const n = partes.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN))
  if (n.some((x) => !(x >= 0 && x <= 255))) return null
  return [(n[0] << 8) | n[1], (n[2] << 8) | n[3]]
}

/** IPv6 em 8 palavras de 16 bits (aceita `::` e o IPv4 embutido no fim); `null` quando ilegível. */
function ipv6(ip: string): number[] | null {
  const semZona = ip.split('%')[0]
  const duplo = semZona.split('::')
  if (duplo.length > 2) return null
  const lado = (s: string): number[] | null => {
    if (s === '') return []
    const saida: number[] = []
    const grupos = s.split(':')
    for (let i = 0; i < grupos.length; i++) {
      const g = grupos[i]
      if (i === grupos.length - 1 && g.includes('.')) {
        const v4 = ipv4(g)
        if (!v4) return null
        saida.push(...v4)
      } else if (/^[0-9a-fA-F]{1,4}$/.test(g)) {
        saida.push(parseInt(g, 16))
      } else {
        return null
      }
    }
    return saida
  }
  const esq = lado(duplo[0])
  const dir = duplo.length === 2 ? lado(duplo[1]) : []
  if (!esq || !dir) return null
  if (duplo.length === 1) return esq.length === 8 ? esq : null
  const faltam = 8 - esq.length - dir.length
  if (faltam < 1) return null
  return [...esq, ...Array(faltam).fill(0), ...dir]
}

/** O endereço em palavras de 16 bits, com a família; `null` quando ilegível. */
function palavrasDe(ip: string): { v6: boolean; palavras: number[] } | null {
  const limpo = ip.trim().replace(/^\[|\]$/g, '')
  if (limpo === '') return null
  if (limpo.includes(':')) {
    const p = ipv6(limpo)
    if (!p) return null
    // IPv4 mapeado em IPv6 (`::ffff:a.b.c.d`) é o IPv4.
    if (p.slice(0, 5).every((x) => x === 0) && p[5] === 0xffff) return { v6: false, palavras: p.slice(6) }
    return { v6: true, palavras: p }
  }
  const p = ipv4(limpo)
  return p ? { v6: false, palavras: p } : null
}

function compilar(cidr: string): Faixa | null {
  const [ip, len] = cidr.split('/')
  const end = palavrasDe(ip)
  const bits = Number(len)
  if (!end || !Number.isInteger(bits) || bits < 0 || bits > end.palavras.length * 16) return null
  return { v6: end.v6, palavras: end.palavras, bits }
}

function dentro(end: { v6: boolean; palavras: number[] }, f: Faixa): boolean {
  if (end.v6 !== f.v6) return false
  let resto = f.bits
  for (let i = 0; resto > 0; i++, resto -= 16) {
    const n = Math.min(16, resto)
    const mascara = (0xffff << (16 - n)) & 0xffff
    if ((end.palavras[i] & mascara) !== (f.palavras[i] & mascara)) return false
  }
  return true
}

/** As faixas compiladas, uma vez por processo. Faixa ilegível na lista LANÇA — lista quebrada não pode virar lista vazia. */
let compiladas: Faixa[] | null = null
function faixas(): Faixa[] {
  if (compiladas) return compiladas
  compiladas = DATACENTER_RANGES.map((c) => {
    const f = compilar(c)
    if (!f) throw new Error(`faixa de data center ilegível: ${c}`)
    return f
  })
  return compiladas
}

/** `true` quando o IP está numa das faixas. IP ausente ou ilegível NÃO é data center. */
export function isDatacenterIp(ip: string | null | undefined, ranges?: readonly string[]): boolean {
  if (typeof ip !== 'string') return false
  const end = palavrasDe(ip)
  if (!end) return false
  const lista = ranges === undefined ? faixas() : ranges.map(compilar).filter((f): f is Faixa => f !== null)
  return lista.some((f) => dentro(end, f))
}

/** Os cabeçalhos de onde sai o IP do cliente, do mais confiável ao menos. */
export const IP_HEADERS: readonly string[] = ['cf-connecting-ip', 'x-real-ip', 'x-forwarded-for']

/**
 * `true` quando QUALQUER candidato a IP do cliente é de data center (`cf-connecting-ip`, `x-real-ip`
 * e cada entrada do `x-forwarded-for`). Recebe um leitor de cabeçalho para não depender de `Request`.
 */
export function requestFromDatacenter(header: (nome: string) => string | null): boolean {
  const candidatos: string[] = []
  for (const nome of IP_HEADERS) {
    const v = header(nome)
    if (v) candidatos.push(...v.split(','))
  }
  return candidatos.some((c) => isDatacenterIp(c))
}
