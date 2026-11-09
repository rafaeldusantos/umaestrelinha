#!/usr/bin/env node
// Gera `packages/core/src/visits/datacenterRanges.ts` — as faixas de IP das redes de data center que
// a function `visit` recusa (visitas e pulsos de presença).
//
// Por que existe: em 2026-11-08 e 2026-11-09 um robô rodando um Chrome de verdade, com user agent
// comum, aceitando os cookies e com perfil novo a cada acesso, gravou ~400 "visitas únicas" a partir
// de 157 IPs da ColoCrossing (AS36352, Buffalo). Nenhuma das réguas do navegador o pega; a rede de
// origem pega. Gente comprando joia não navega de dentro de um data center.
//
// Fonte: RIPEstat (`announced-prefixes`), dado público. As faixas são agregadas
// (`collapse`) para a lista ficar curta. Rode de novo quando quiser atualizar:
//
//   node tools/redes-de-datacenter.mjs
//
// Para acrescentar uma rede, acrescente o ASN em REDES abaixo.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REDES = [
  { asn: 36352, nome: 'ColoCrossing' },
  { asn: 24940, nome: 'Hetzner' },
  { asn: 136907, nome: 'Huawei Cloud' },
  { asn: 55990, nome: 'Huawei Cloud (data center)' },
]

const DESTINO = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages/core/src/visits/datacenterRanges.ts')

// ── agregação de CIDR, sem dependência ──────────────────────────────────────────────────────────

function paraBigInt(ip) {
  if (!ip.includes(':')) return ip.split('.').reduce((acc, p) => (acc << 8n) | BigInt(Number(p)), 0n)
  const [esq, dir = ''] = ip.split('::')
  const a = esq ? esq.split(':') : []
  const b = ip.includes('::') ? (dir ? dir.split(':') : []) : []
  const grupos = ip.includes('::') ? [...a, ...Array(8 - a.length - b.length).fill('0'), ...b] : a
  return grupos.reduce((acc, g) => (acc << 16n) | BigInt(parseInt(g || '0', 16)), 0n)
}

function deBigInt(n, v6) {
  if (!v6) return [24n, 16n, 8n, 0n].map((s) => String((n >> s) & 255n)).join('.')
  const grupos = []
  for (let s = 112n; s >= 0n; s -= 16n) grupos.push(((n >> s) & 0xffffn).toString(16))
  return grupos.join(':').replace(/(^|:)0(:0)+(:|$)/, '::').replace(/:{3,}/, '::')
}

function agregar(prefixos, v6) {
  const bits = v6 ? 128n : 32n
  const faixas = prefixos
    .map((p) => {
      const [ip, len] = p.split('/')
      const tam = 1n << (bits - BigInt(len))
      const ini = paraBigInt(ip) & ~(tam - 1n)
      return [ini, ini + tam - 1n]
    })
    .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0))
  const juntas = []
  for (const f of faixas) {
    const u = juntas[juntas.length - 1]
    if (u && f[0] <= u[1] + 1n) u[1] = f[1] > u[1] ? f[1] : u[1]
    else juntas.push([...f])
  }
  // Cada intervalo vira o menor conjunto de CIDRs alinhados.
  const saida = []
  for (let [ini, fim] of juntas) {
    while (ini <= fim) {
      let len = bits
      while (len > 0n) {
        const tam = 1n << (bits - (len - 1n))
        if ((ini & (tam - 1n)) !== 0n || ini + tam - 1n > fim) break
        len -= 1n
      }
      saida.push(`${deBigInt(ini, v6)}/${len}`)
      ini += 1n << (bits - len)
    }
  }
  return saida
}

// ── geração ─────────────────────────────────────────────────────────────────────────────────────

const blocos = []
let total = 0
for (const { asn, nome } of REDES) {
  const r = await fetch(`https://stat.ripe.net/data/announced-prefixes/data.json?resource=AS${asn}`)
  if (!r.ok) throw new Error(`RIPEstat respondeu ${r.status} para AS${asn}`)
  const prefixos = (await r.json()).data.prefixes.map((p) => p.prefix)
  if (prefixos.length === 0) throw new Error(`AS${asn} sem prefixo anunciado — confira o ASN`)
  const cidrs = [...agregar(prefixos.filter((p) => !p.includes(':')), false), ...agregar(prefixos.filter((p) => p.includes(':')), true)]
  total += cidrs.length
  blocos.push(`  // AS${asn} — ${nome} (${cidrs.length} faixas)\n${cidrs.map((c) => `  '${c}',`).join('\n')}`)
}

const hoje = new Date().toISOString().slice(0, 10)
writeFileSync(
  DESTINO,
  `// GERADO por \`tools/redes-de-datacenter.mjs\` em ${hoje} — não edite à mão; rode o script de novo.
//
// As faixas de IP das redes de data center que a function \`visit\` recusa (ver \`datacenter.ts\`).
// Fonte: RIPEstat, prefixos anunciados por ${REDES.map((r) => `AS${r.asn}`).join(', ')}.
//
// ⚠️ Folha alcançável pelo Deno: este arquivo não importa nada.

export const DATACENTER_RANGES: readonly string[] = [
${blocos.join('\n')}
]
`,
)
console.log(`${total} faixas gravadas em ${DESTINO}`)
