// Feature 55 (`CFG-22`) — o painel parou de falar em "abas" de Configurações.
//
// A tela tinha oito abas horizontais e virou quatro seções. Duas mensagens ainda mandavam a Adri
// "preencher o logradouro na aba Material", e as duas são **recusas de gravação** — lidas
// exatamente quando ela já está travada. Mandar alguém procurar uma tela que não existe mais é a
// pior hora possível para a copy estar velha.
//
// Nada disso quebra sozinho: a frase é uma string, ela renderiza, o teste que a provava usava
// `toMatch(/Material/)` e continuava verde com o nome novo. Quem descobre é quem lê.
//
// ## O ALCANCE desta régua é estreito de propósito, e está declarado
//
// O painel tem abas de verdade em **outra** tela: o formulário de produto (`aba Geral`, `aba SEO`).
// Elas existem, funcionam, e esta feature não as toca. Uma régua que proibisse a palavra "aba" em
// `apps/backoffice/src/**` nasceria reprovando uma dezena de comentários legítimos — e guarda que
// nasce vermelho é guarda que alguém desliga no primeiro gate.
//
// Então a régua recusa **`aba` seguida de um rótulo que só existiu em Configurações**:
//
// - os seis rótulos de aba inequívocos (Material, Frete, Pagamento, Checkout, Carrinho,
//   Notificações) — nenhum deles é aba do formulário de produto;
// - os quatro rótulos de SEÇÃO novos, porque chamar a seção de "aba" é o mesmo erro ao contrário;
// - a forma `Configurações → <rótulo>`, que é inequívoca pelo prefixo e alcança também `Geral` e
//   `SEO`, os dois que sozinhos seriam ambíguos.
//
// `Geral` e `SEO` **sozinhos** ficam de fora. É uma lacuna conhecida e barata: `aba Geral` num
// arquivo de Configurações passaria. O preço de fechá-la seria acusar `features/product-form`, onde
// a frase está certa.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SETTINGS_SECTIONS } from '../settingsSections'

const RAIZ = resolve(process.cwd(), 'src')

/**
 * O único arquivo que pode escrever as formas proibidas: **este**.
 *
 * Um guarda que recusa uma string precisa escrevê-la nos sensores, e a doutrina do repositório é
 * "descreva a forma proibida, não a escreva" — com a exceção do arquivo que existe para medi-la.
 * A allowlist é de UM, escrita literalmente, e o caso `SENSOR: outro arquivo de teste seria
 * acusado` prova que ela não virou uma porta larga.
 */
const ALLOWLIST = ['shared/lib/__tests__/semAbaEmConfiguracoes.test.ts']

/** Os rótulos das oito abas que deixaram de existir, menos os dois ambíguos — ver o cabeçalho. */
const ROTULOS_DE_ABA_MORTOS = [
  'Material',
  'Frete',
  'Pagamento',
  'Checkout',
  'Carrinho',
  'Notificações',
]

/** Os dois que só são inequívocos depois de `Configurações →`. */
const ROTULOS_AMBIGUOS = ['Geral', 'SEO']

const arquivosDe = (dir: string): string[] =>
  readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) {
      return nome === 'node_modules' ? [] : arquivosDe(caminho)
    }
    return /\.tsx?$/.test(nome) ? [caminho] : []
  })

const relativo = (caminho: string) => caminho.slice(RAIZ.length + 1).replace(/\\/g, '/')

const ARQUIVOS = arquivosDe(RAIZ).filter(c => !ALLOWLIST.includes(relativo(c)))

/**
 * A régua, como **predicado** — a asserção e os sensores chamam a mesma função.
 *
 * Duas escritas da mesma régua (uma na asserção, outra no sensor) divergem, e aí o sensor passa a
 * provar uma régua que ninguém usa.
 */
export const frasesDeAbaEm = (texto: string): string[] => {
  const rotulos = [...ROTULOS_DE_ABA_MORTOS, ...SETTINGS_SECTIONS.map(s => s.label)]

  // `(?![-\wà-ú])` e não `\b`: o hífen não é caractere de palavra, então `\b` não fecha nada depois
  // de "Frete e Material"; e o acento faria `\b` fechar no meio de "Notificações". É `L-034`.
  const comAba = new RegExp(
    `(?:^|[^-\\wà-ú])abas?\\s+(?:${rotulos.map(escapar).join('|')})(?![-\\wà-ú])`,
    'gi',
  )
  // A forma com seta acusa só o que DEIXOU de ser destino, e o recorte precisa de DUAS partes —
  // a primeira escrita desta régua tinha só metade e reprovou a copy nova duas vezes:
  //
  // 1. `Notificações` é rótulo de aba morta **e** de seção viva, então `Configurações →
  //    Notificações` está certo hoje. O `filter` tira os rótulos que sobreviveram.
  // 2. `Frete` é rótulo morto e **prefixo** de `Frete e Material`, que é vivo. Como o recorte à
  //    direita é `(?![-\wà-ú])` e o caractere seguinte ali é um espaço, `Configurações → Frete e
  //    Material` casava por `Frete`. O lookahead negativo abaixo descarta a seta inteira quando o
  //    que vem depois dela é uma seção viva.
  //
  // Uma régua que reprova o conserto é pior que régua nenhuma: ela empurra quem consertou de volta
  // para a frase velha.
  const secoesVivas = SETTINGS_SECTIONS.map(secao => escapar(secao.label)).join('|')
  const rotulosDeSeta = [...ROTULOS_DE_ABA_MORTOS, ...ROTULOS_AMBIGUOS].filter(
    r => !SETTINGS_SECTIONS.some(secao => secao.label === r),
  )
  const comSeta = new RegExp(
    `Configura(?:ç|c)(?:õ|o)es\\s*(?:→|->)\\s*` +
      `(?!(?:${secoesVivas})(?![-\\wà-ú]))` +
      `(?:${rotulosDeSeta.map(escapar).join('|')})(?![-\\wà-ú])`,
    'gi',
  )

  return [...(texto.match(comAba) ?? []), ...(texto.match(comSeta) ?? [])].map(m => m.trim())
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

describe('sem "aba" apontando para Configurações — âncora dupla', () => {
  it('a varredura lê os arquivos do painel', () => {
    expect(ARQUIVOS.length).toBeGreaterThan(200)
  })

  it('os rótulos medidos saem do REGISTRO, não de uma lista escrita aqui', () => {
    // Sem esta âncora, um registro renomeado deixaria a régua medindo nomes que já não existem —
    // ela varreria tudo, encontraria zero, e passaria em silêncio. Que é a pior falha possível num
    // guarda cuja asserção é uma ausência.
    expect(SETTINGS_SECTIONS.length).toBeGreaterThan(0)
    for (const secao of SETTINGS_SECTIONS) {
      expect(frasesDeAbaEm(`foi para a aba ${secao.label} ontem`)).toHaveLength(1)
    }
  })
})

describe('CFG-22: nenhum arquivo do painel chama uma seção de Configurações de "aba"', () => {
  it('a varredura não encontra nenhuma', () => {
    const achados = ARQUIVOS.flatMap(caminho =>
      frasesDeAbaEm(readFileSync(caminho, 'utf8')).map(frase => `${relativo(caminho)}: ${frase}`),
    )

    expect(achados).toEqual([])
  })

  it('SENSOR: outro arquivo de teste SERIA acusado — a allowlist é de um só', () => {
    // O par da allowlist. Sem ele, "só este arquivo pode" poderia virar "qualquer teste pode" sem
    // nada reprovar — e os arquivos de teste são justamente onde a frase velha sobrevive mais tempo.
    expect(ALLOWLIST).toHaveLength(1)
    expect(ALLOWLIST[0]).toBe('shared/lib/__tests__/semAbaEmConfiguracoes.test.ts')

    const outroTeste = relativo(join(RAIZ, 'shared', 'lib', '__tests__', 'outro.test.ts'))
    expect(ALLOWLIST).not.toContain(outroTeste)
  })
})

describe('SENSOR — a régua reprova de verdade', () => {
  it('as duas frases que a feature 55 consertou voltam a ser acusadas', () => {
    const recusa = 'O endereço do ateliê está vazio — preencha o logradouro na aba Material antes de ligar este aviso.'
    const aviso = 'O endereço do ateliê ainda não foi preenchido na aba Material — o texto usa a variável.'

    expect(frasesDeAbaEm(recusa)).toHaveLength(1)
    expect(frasesDeAbaEm(aviso)).toHaveLength(1)
  })

  it('cada rótulo morto é acusado — um caso por rótulo, não um bloco', () => {
    // Um bloco só deixaria uma régua que perdesse cinco dos seis passar como "funcionando".
    for (const rotulo of ROTULOS_DE_ABA_MORTOS) {
      expect(frasesDeAbaEm(`ver na aba ${rotulo} do painel`), rotulo).toHaveLength(1)
    }
  })

  it('o plural também é acusado', () => {
    expect(frasesDeAbaEm('as abas Frete e Pagamento sumiram')).not.toHaveLength(0)
  })

  it('a forma `Configurações → <rótulo>` é acusada, inclusive nos dois ambíguos', () => {
    // É o que alcança `Geral` e `SEO`: prefixados assim, eles só podem ser Configurações.
    expect(frasesDeAbaEm('cadastrado em Configurações → Geral')).toHaveLength(1)
    expect(frasesDeAbaEm('está em Configurações -> SEO')).toHaveLength(1)
    expect(frasesDeAbaEm('em Configuracoes → Frete')).toHaveLength(1)
  })

  it('INVERSO: `Configurações → <seção viva>` NÃO é acusada', () => {
    // O recorte que a primeira escrita desta régua não tinha: ela acusava `Dados da loja`, que é a
    // copy nova. Uma régua que reprova o conserto é pior que régua nenhuma — ela empurra quem
    // consertou de volta para a frase velha.
    for (const secao of SETTINGS_SECTIONS) {
      expect(frasesDeAbaEm(`cadastrado em Configurações → ${secao.label}`), secao.label).toEqual([])
    }
  })

  it('INVERSO: a copy nova passa', () => {
    expect(frasesDeAbaEm('preencha o logradouro na seção Frete e Material')).toEqual([])
    expect(frasesDeAbaEm('cadastrado em Configurações → Dados da loja')).toEqual([])
  })

  it('INVERSO: as abas REAIS do formulário de produto não são acusadas', () => {
    // O motivo pelo qual `Geral` e `SEO` sozinhos ficam fora da régua. Estas frases estão certas, e
    // um guarda que as acusasse seria desligado no primeiro gate.
    expect(frasesDeAbaEm('o campo está na aba SEO do produto')).toEqual([])
    expect(frasesDeAbaEm('validateProduct — nome (aba Geral)')).toEqual([])
    expect(frasesDeAbaEm('a aba Geral em três cards')).toEqual([])
  })

  it('INVERSO: palavra que só COMEÇA com "aba" não é acusada', () => {
    // `abaixo`, `abacaxi`, `abandonado` — sem o recorte à direita da palavra, "abaixo de Frete"
    // cairia junto.
    expect(frasesDeAbaEm('logo abaixo de Frete')).toEqual([])
    expect(frasesDeAbaEm('o carrinho abandonado Checkout')).toEqual([])
  })

  it('INVERSO: o rótulo sozinho, sem "aba" na frente, não é acusado', () => {
    // A régua mede a palavra "aba" APONTANDO para um rótulo. "Frete" e "Material" aparecem às
    // centenas no painel, e proibi-los seria proibir o assunto.
    expect(frasesDeAbaEm('a seção Material grava nove campos')).toEqual([])
    expect(frasesDeAbaEm('const DEFAULT_SHIPPING = { ... } // Frete')).toEqual([])
  })

  it('INVERSO: rótulo próximo mas diferente não casa — o recorte é por token exato', () => {
    // `(?![-\\wà-ú])` é o que impede "aba Materiais" e "aba Fretes" de passarem por Material/Frete.
    // Com `\\b` no lugar dele, "aba Frete-e-Material" cairia junto com o hífen.
    expect(frasesDeAbaEm('a aba Materiais antigos')).toEqual([])
    expect(frasesDeAbaEm('a aba Fretes internacionais')).toEqual([])
  })
})
