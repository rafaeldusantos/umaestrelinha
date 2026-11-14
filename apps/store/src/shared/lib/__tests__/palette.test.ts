import { describe, it, expect } from 'vitest'
import tailwindConfig from '../../../../tailwind.config'
import atelieConfig from '../../../../../mobile-adm/tailwind.config'
import {
  ESTRELINHA_COLORS,
  ESTRELINHA_COLOR_VARIABLES,
  ESTRELINHA_FONTS,
  ESTRELINHA_PROFILES,
  ESTRELINHA_PROFILE_SHADOW_RGB,
  ESTRELINHA_RADIUS,
  ESTRELINHA_SHADOW,
  ESTRELINHA_SHADOW_VARIABLES,
} from '@estrelinha/ui/tokens/estrelinha'
import { STYLE_PROFILES, type StyleProfile } from '@estrelinha/core/appearance'
import {
  lerAppCss,
  paletteFromSource,
  seletorDoPerfil,
  variaveisDoPerfil,
} from '@/test/paletteFromSource'

/**
 * A paleta da Uma Estrelinha é declarada em DOIS lugares — `src/app/App.css` e
 * `tailwind.config.ts` — e é isso que esta suíte guarda.
 *
 * Um valor certo num lado e velho no outro não quebra build, não quebra tipo e
 * não quebra teste de componente: a loja simplesmente renderiza duas paletas ao
 * mesmo tempo, e quem descobre é a cliente. O teste lê os dois arquivos do
 * disco e compara.
 *
 * Os pisos de contraste NÃO estão aqui — são `contrast.test.ts`. Aqui só se
 * prova que os dois arquivos dizem a mesma coisa.
 *
 * **Desde o perfil de estilo da loja, a paleta tem um bloco por perfil** no
 * `App.css` (`:root` com o Padrão, o atributo do perfil no `<html>` com o Black
 * Friday), e o Tailwind da loja lê as cores POR VARIÁVEL. A comparação passou a
 * ser bloco a bloco contra `ESTRELINHA_PROFILES`: o hex, os canais `-rgb` que o
 * Tailwind lê, a camada HSL do shadcn e a cor da sombra.
 */

/**
 * Os valores canônicos — o arquivo do Paper "Uma Estrelinha", idêntico a
 * `../landing-pages/src/styles/global.css`. Nenhum outro arquivo é fonte disso.
 */
const PALETA = {
  ground: '#FAF8F4', // o chão da loja
  'ground-deep': '#F1EBE1', // faixa de seção, palco de foto
  surface: '#FFFFFF', // card
  line: '#E6DFD4', // divisor — nunca borda de campo
  ink: '#23303A', // texto primário e superfície escura
  'ink-soft': '#54616B', // texto secundário — o piso
  primary: '#34495E', // ação, link, preço, aba ativa
  'primary-strong': '#283A4A', // hover / pressed
  'on-primary': '#F7F3EC', // texto sobre superfície primary
  accent: '#B8945F', // preenchimento, detalhe — nunca texto sobre claro
  'accent-strong': '#A07E4C', // detalhe gráfico ≥24px
  serenity: '#DCE6EC', // faixa pontual — nunca texto
  whatsapp: '#25D366', // só o botão do WhatsApp
  field: '#8C8073', // borda de input e de controle — nasceu na feature 20
  // Feature 59 — os tons do selo da situação do pedido (`SIT-13`), pares texto × fundo.
  wait: '#6B4F24', // "aguardando" — texto
  'wait-soft': '#F4ECDF', // fundo do selo "aguardando"
  alert: '#7E2F2B', // pagamento com problema — texto
  'alert-soft': '#F6E7E5', // fundo do selo de alerta
  done: '#3F5A3B', // entregue — texto
  'done-soft': '#EEF0EC', // fundo do selo "entregue"
  // O papel de desconto (selo "-X%", chip da sacola, barra do frete grátis): no Padrão, a ação.
  sale: '#34495E',
  'on-sale': '#FFFFFF',
  'sale-bar': '#34495E',
} as const

/**
 * O Black Friday — os valores do protótipo, escritos à mão pelo mesmo motivo da
 * `PALETA`: é a afirmação contra a qual o dono e o `App.css` são lidos. O que
 * não está aqui é o do Padrão.
 */
const PALETA_BLACK_FRIDAY = {
  ...PALETA,
  ink: '#161514',
  'ink-soft': '#57524B',
  primary: '#1C1A18',
  'primary-strong': '#0D0C0B',
  accent: '#C2A063',
  'accent-strong': '#9A7A45',
  line: '#E4DDD0',
  'ground-deep': '#F0EADF',
  field: '#857A6C',
  sale: '#C2A063',
  'on-sale': '#161514',
  'sale-bar': '#9A7A45',
} as const

const PALETA_DO_PERFIL: Record<StyleProfile, Record<string, string>> = {
  padrao: PALETA,
  'black-friday': PALETA_BLACK_FRIDAY,
}

/** A cor da sombra suave de cada perfil, em canais — também escrita à mão. */
const SOMBRA_DO_PERFIL: Record<StyleProfile, string> = {
  padrao: '52 73 94',
  'black-friday': '22 21 20',
}

/**
 * A camada HSL do shadcn: cada variável e o token da marca de que ela é a
 * tradução. É o "terceiro lugar" do `DESIGN.md` §2 — sem prefixo da marca,
 * invisível a qualquer busca por nome.
 */
const HSL_DO_SHADCN: Record<string, string> = {
  background: 'ground',
  foreground: 'ink',
  card: 'surface',
  'card-foreground': 'ink',
  popover: 'surface',
  'popover-foreground': 'ink',
  primary: 'primary',
  'primary-foreground': 'on-primary',
  secondary: 'ground-deep',
  'secondary-foreground': 'ink',
  muted: 'ground-deep',
  'muted-foreground': 'ink-soft',
  accent: 'ground-deep',
  'accent-foreground': 'primary',
  border: 'line',
  input: 'field',
  ring: 'primary',
}

/** Os HSL do Padrão como estão escritos hoje: com o perfil Padrão, nada muda. */
const HSL_DO_PADRAO_DE_HOJE: Record<string, string> = {
  background: '40 37% 97%',
  foreground: '206 25% 18%',
  card: '0 0% 100%',
  'card-foreground': '206 25% 18%',
  popover: '0 0% 100%',
  'popover-foreground': '206 25% 18%',
  primary: '210 29% 29%',
  'primary-foreground': '38 41% 95%',
  secondary: '37 36% 91%',
  'secondary-foreground': '206 25% 18%',
  muted: '37 36% 91%',
  'muted-foreground': '206 12% 37%',
  accent: '37 36% 91%',
  'accent-foreground': '210 29% 29%',
  border: '37 26% 87%',
  input: '31 10% 50%',
  ring: '210 29% 29%',
}

function canais(hex: string): string {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ')
}

/** HSL exato (sem arredondar) de um hex. */
function hslExato(hex: string): [number, number, number] {
  const [r, g, b] = canais(hex)
    .split(' ')
    .map((v) => Number(v) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  if (h < 0) h += 360
  return [h, s * 100, l * 100]
}

/**
 * O HSL escrito é um ARREDONDAMENTO do token? Cada componente a no máximo meio
 * ponto do valor exato (o Padrão de hoje arredonda 37,5 para 37, então a régua
 * aceita os dois lados do meio). Devolve `null` quando confere, ou o motivo.
 */
function hslDivergente(escrito: string, hex: string): string | null {
  const m = /^(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(escrito)
  if (!m) return `forma inválida: "${escrito}"`
  const lido = [Number(m[1]), Number(m[2]), Number(m[3])]
  const exato = hslExato(hex)
  const longe = lido.some((v, i) => Math.abs(v - exato[i]) > 0.5 + 1e-9)
  return longe ? `"${escrito}" não é ${hex} (${exato.map((v) => v.toFixed(2)).join(' ')})` : null
}

/**
 * Tudo o que um bloco do `App.css` diverge do dono, num perfil: hex, canais,
 * HSL do shadcn e sombra. Vazio = conforme. É a mesma função que a asserção e o
 * sensor chamam.
 */
function divergenciasDoPerfil(perfil: StyleProfile, css: string): string[] {
  const vars = variaveisDoPerfil(perfil, css)
  const dono = ESTRELINHA_PROFILES[perfil]
  const erros: string[] = []
  for (const [token, hex] of Object.entries(dono)) {
    const lido = vars[`estrelinha-${token}`]?.toUpperCase()
    if (lido !== hex.toUpperCase()) erros.push(`${perfil} · ${token}: ${lido} ≠ ${hex}`)
    const rgb = vars[`estrelinha-${token}-rgb`]
    if (rgb !== canais(hex)) erros.push(`${perfil} · ${token}-rgb: ${rgb} ≠ ${canais(hex)}`)
  }
  for (const [variavel, token] of Object.entries(HSL_DO_SHADCN)) {
    const motivo = hslDivergente(vars[variavel] ?? '', dono[token as keyof typeof dono])
    if (motivo) erros.push(`${perfil} · --${variavel} (${token}): ${motivo}`)
  }
  const sombra = vars['estrelinha-shadow-rgb']
  if (sombra !== ESTRELINHA_PROFILE_SHADOW_RGB[perfil]) {
    erros.push(`${perfil} · shadow-rgb: ${sombra} ≠ ${ESTRELINHA_PROFILE_SHADOW_RGB[perfil]}`)
  }
  return erros
}

describe('paleta Uma Estrelinha — o dono dos perfis', () => {
  it('declara os dois perfis, e só eles', () => {
    expect(Object.keys(ESTRELINHA_PROFILES).sort()).toEqual([...STYLE_PROFILES].sort())
  })

  it('o Padrão É `ESTRELINHA_COLORS` (a mesma referência)', () => {
    // O ateliê lê `ESTRELINHA_COLORS`: com o Padrão sendo ele, os dois não podem divergir.
    expect(ESTRELINHA_PROFILES.padrao).toBe(ESTRELINHA_COLORS)
  })

  it.each(STYLE_PROFILES)('o perfil `%s` tem os valores do desenho', (perfil) => {
    expect({ ...ESTRELINHA_PROFILES[perfil] }).toEqual(PALETA_DO_PERFIL[perfil])
  })

  it.each(STYLE_PROFILES)('o perfil `%s` tem a cor de sombra do desenho', (perfil) => {
    expect(ESTRELINHA_PROFILE_SHADOW_RGB[perfil]).toBe(SOMBRA_DO_PERFIL[perfil])
  })

  it('os dois perfis têm exatamente o mesmo conjunto de tokens', () => {
    // O perfil é um conjunto de valores dos MESMOS tokens: um token num perfil só deixaria a
    // classe sem valor no outro.
    expect(Object.keys(ESTRELINHA_PROFILES['black-friday']).sort()).toEqual(
      Object.keys(ESTRELINHA_PROFILES.padrao).sort(),
    )
  })
})

describe('paleta Uma Estrelinha — o App.css, bloco a bloco', () => {
  const css = lerAppCss()

  it.each(STYLE_PROFILES)('a leitura do bloco `%s` encontrou a paleta inteira', (perfil) => {
    // Âncora de contagem: um erro de caminho, de seletor ou de regex faria a
    // leitura devolver `{}` e todas as comparações abaixo passariam em silêncio.
    expect(Object.keys(paletteFromSource(perfil)).length).toBeGreaterThanOrEqual(
      Object.keys(PALETA).length,
    )
  })

  it.each(STYLE_PROFILES)(
    'o bloco `%s` é igual ao dono em hex, canais, HSL do shadcn e sombra',
    (perfil) => {
      expect(divergenciasDoPerfil(perfil, css)).toEqual([])
    },
  )

  it.each(Object.entries(PALETA))('`--estrelinha-%s` vale %s no :root (o Padrão)', (token, hex) => {
    expect(paletteFromSource('padrao')[token]).toBe(hex.toUpperCase())
  })

  it.each(Object.entries(PALETA_BLACK_FRIDAY))(
    '`--estrelinha-%s` vale %s no Black Friday',
    (token, hex) => {
      expect(paletteFromSource('black-friday')[token]).toBe(hex.toUpperCase())
    },
  )

  it('o Padrão tem os HSL do shadcn de hoje, byte a byte', () => {
    const vars = variaveisDoPerfil('padrao', css)
    for (const [variavel, valor] of Object.entries(HSL_DO_PADRAO_DE_HOJE)) {
      expect(`--${variavel}: ${vars[variavel]}`).toBe(`--${variavel}: ${valor}`)
    }
  })

  it('o Padrão tem a sombra de hoje (`.glow-*` e a variável)', () => {
    expect(variaveisDoPerfil('padrao', css)['estrelinha-shadow-rgb']).toBe('52 73 94')
    // `.glow-*` lê a variável, e não um valor fixo que ficaria no Padrão no Black Friday.
    expect(css).toMatch(/\.glow-cyan \{\s*\/\*[\s\S]*?\*\/\s*box-shadow: 0 14px 28px -10px rgb\(var\(--estrelinha-shadow-rgb\) \/ 0\.16\);/)
  })

  it('o bloco do Black Friday é selecionado pelo atributo do perfil', () => {
    expect(seletorDoPerfil('black-friday')).toBe('html[data-perfil="black-friday"]')
    expect(css).toContain('html[data-perfil="black-friday"] {')
  })

  it('sensor: um hex do Black Friday trocado no CSS reprova', () => {
    const mutado = css.replace(/(html\[data-perfil="black-friday"\] \{[\s\S]*?--estrelinha-ink: )#161514/, '$1#23303a')
    expect(mutado).not.toBe(css)
    expect(divergenciasDoPerfil('black-friday', mutado)).toEqual([
      'black-friday · ink: #23303A ≠ #161514',
    ])
  })

  it('sensor: um canal, um HSL ou a sombra do Black Friday trocados reprovam', () => {
    const canal = css.replace('--estrelinha-primary-rgb: 28 26 24;', '--estrelinha-primary-rgb: 52 73 94;')
    const hsl = css.replace('--input: 34 10% 47%;', '--input: 31 10% 50%;')
    const sombra = css.replace('--estrelinha-shadow-rgb: 22 21 20;', '--estrelinha-shadow-rgb: 52 73 94;')
    for (const m of [canal, hsl, sombra]) expect(m).not.toBe(css)
    expect(divergenciasDoPerfil('black-friday', canal)).toEqual([
      'black-friday · primary-rgb: 52 73 94 ≠ 28 26 24',
    ])
    expect(divergenciasDoPerfil('black-friday', hsl)).toHaveLength(1)
    expect(divergenciasDoPerfil('black-friday', sombra)).toEqual([
      'black-friday · shadow-rgb: 52 73 94 ≠ 22 21 20',
    ])
  })

  it('sensor: o bloco do Black Friday NÃO vaza para o Padrão', () => {
    // Lido o arquivo inteiro de uma vez, a segunda declaração de `--estrelinha-ink` (a do Black
    // Friday) ganharia, e o Padrão seria medido com a cor do outro perfil.
    expect(paletteFromSource('padrao', css).ink).toBe('#23303A')
    expect(paletteFromSource('black-friday', css).ink).toBe('#161514')
    const semRaiz = css.replace(':root {', ':rot {')
    expect(() => paletteFromSource('padrao', semRaiz)).toThrow(/:root/)
  })

  it('sensor: um seletor do perfil com erro derruba a leitura, em vez de medir o Padrão', () => {
    const errado = css.replace('html[data-perfil="black-friday"] {', 'html[data-perfi="black-friday"] {')
    expect(() => paletteFromSource('black-friday', errado)).toThrow(/black-friday/)
  })

  it('sensor: o HSL do shadcn é conferido contra o token, e não só a forma', () => {
    expect(hslDivergente('206 25% 18%', '#23303A')).toBeNull()
    expect(hslDivergente('40 37% 97%', '#FAF8F4')).toBeNull() // 37,5 escrito 37
    expect(hslDivergente('206 25% 18%', '#161514')).not.toBeNull()
    expect(hslDivergente('206 25 18', '#23303A')).toMatch(/forma inválida/)
  })
})

describe('paleta Uma Estrelinha — o Tailwind da loja lê por variável', () => {
  const cores = (tailwindConfig.theme?.extend?.colors as Record<string, unknown>)
    .estrelinha as Record<string, string>

  it('as cores são as variáveis do dono (identidade)', () => {
    expect(cores).toBe(ESTRELINHA_COLOR_VARIABLES)
  })

  it('cada token vira a variável `-rgb` dele, no formato que preserva a opacidade', () => {
    expect(Object.keys(cores).sort()).toEqual(Object.keys(PALETA).sort())
    for (const [token, valor] of Object.entries(cores)) {
      expect(valor).toBe(`rgb(var(--estrelinha-${token}-rgb) / <alpha-value>)`)
    }
  })

  it('as sombras são as do dono por variável, e no Padrão resolvem nas de sempre', () => {
    const sombras = tailwindConfig.theme?.extend?.boxShadow as Record<string, string>
    expect(sombras).toBe(ESTRELINHA_SHADOW_VARIABLES)
    const padrao = variaveisDoPerfil('padrao')
    const resolvidas = Object.fromEntries(
      Object.entries(sombras).map(([nome, valor]) => [
        nome,
        valor.replace(
          /rgb\(var\(--([a-z-]+)\) \/ ([\d.]+)\)/g,
          (_, v: string, a: string) => `rgba(${padrao[v].split(' ').join(', ')}, ${a})`,
        ),
      ]),
    )
    expect(resolvidas).toEqual(ESTRELINHA_SHADOW)
  })
})

describe('paleta Uma Estrelinha — a escala de raio', () => {
  const radius = tailwindConfig.theme?.extend?.borderRadius as Record<string, string>

  it('é a escala do DS: sm 6 · md 12 · lg 20 · pill 999', () => {
    expect(radius.sm).toBe('6px')
    expect(radius.md).toBe('12px')
    expect(radius.lg).toBe('20px')
    expect(radius.pill).toBe('999px')
  })

  it('a chave custom `button` NÃO existe mais', () => {
    // Ela existia só para vencer o `rounded-md` do shadcn, que o
    // `tailwind-merge` não colapsa contra token custom. Com a ação em 6px o
    // conflito acabou — e uma chave custom viva convidaria a maquinaria de
    // volta (ordem de declaração, allowlist, teste de "é a última chave").
    expect(radius).not.toHaveProperty('button')
  })
})

describe('paleta Uma Estrelinha — as sombras', () => {
  const shadows = ESTRELINHA_SHADOW

  it.each(['estrelinha-soft', 'estrelinha-lift', 'estrelinha-ink'])('`%s` existe', (name) => {
    expect(shadows[name]).toBeTruthy()
  })

  it('nenhuma sombra ficou no rosa da papelaria', () => {
    // Recalibradas para o slate: `primary` 52,73,94 e `ink` 35,48,58. O rosa
    // (233, 58, 109) sob um card sobre `ground` deixa um halo que não é da
    // marca — e sombra errada é o tipo de resíduo que ninguém procura.
    const rosa = Object.entries(shadows)
      .filter(([name]) => name.startsWith('estrelinha-'))
      .filter(([, value]) => /233,\s*58,\s*109/.test(value))
      .map(([name]) => name)

    expect(rosa).toEqual([])
  })
})

/**
 * Feature 72 — o objeto da marca tem UM dono, `packages/ui/src/tokens/estrelinha.ts`.
 *
 * Os testes acima comparam VALORES, e por isso passariam com uma cópia literal do objeto colada de
 * volta no config: a cópia nasce igual e diverge depois, sem nada quebrar (o "defeito 01"). A régua
 * aqui é de IDENTIDADE — o objeto que o config entrega ao Tailwind é o mesmo objeto exportado pelo
 * dono. O app do ateliê é medido pela mesma função, mais abaixo.
 */
type ConfigLido = { theme?: { extend?: Record<string, unknown> } }

function objetosDoConfig(config: ConfigLido) {
  const extend = config.theme?.extend ?? {}
  return {
    colors: (extend.colors as Record<string, unknown> | undefined)?.estrelinha,
    fontFamily: extend.fontFamily,
    borderRadius: extend.borderRadius,
    boxShadow: extend.boxShadow,
  }
}

/** Os objetos do ateliê: a paleta em hex, no Padrão. */
const DONOS_DO_ATELIE = {
  colors: ESTRELINHA_COLORS,
  fontFamily: ESTRELINHA_FONTS,
  borderRadius: ESTRELINHA_RADIUS,
  boxShadow: ESTRELINHA_SHADOW,
} as const

/** Os objetos da loja: cores e sombras por variável, que acompanham o perfil. */
const DONOS_DA_LOJA = {
  colors: ESTRELINHA_COLOR_VARIABLES,
  fontFamily: ESTRELINHA_FONTS,
  borderRadius: ESTRELINHA_RADIUS,
  boxShadow: ESTRELINHA_SHADOW_VARIABLES,
} as const

/** Devolve os nomes dos objetos que NÃO são a referência do dono. Vazio = config conforme. */
function copiasDoDono(
  config: ConfigLido,
  donos: Record<keyof ReturnType<typeof objetosDoConfig>, unknown> = DONOS_DO_ATELIE,
): string[] {
  const lidos = objetosDoConfig(config)
  return (Object.keys(donos) as (keyof typeof donos)[]).filter((k) => lidos[k] !== donos[k])
}

describe('paleta Uma Estrelinha — o dono do objeto (feature 72)', () => {
  it('o config da loja entrega ao Tailwind os objetos de `@estrelinha/ui/tokens` (identidade)', () => {
    const lidos = objetosDoConfig(tailwindConfig as ConfigLido)
    expect(lidos.colors).toBe(ESTRELINHA_COLOR_VARIABLES)
    expect(lidos.fontFamily).toBe(ESTRELINHA_FONTS)
    expect(lidos.borderRadius).toBe(ESTRELINHA_RADIUS)
    expect(lidos.boxShadow).toBe(ESTRELINHA_SHADOW_VARIABLES)
    expect(copiasDoDono(tailwindConfig as ConfigLido, DONOS_DA_LOJA)).toEqual([])
  })

  it('a loja deixou de entregar a paleta em hex (ela lê o perfil pela variável)', () => {
    const lidos = objetosDoConfig(tailwindConfig as ConfigLido)
    expect(lidos.colors).not.toBe(ESTRELINHA_COLORS)
    expect(lidos.boxShadow).not.toBe(ESTRELINHA_SHADOW)
  })

  it('o config do app do ateliê (`apps/mobile-adm`) entrega os MESMOS objetos', () => {
    // O terceiro leitor da paleta. Sem esta asserção, ele poderia nascer com uma cópia. E ele
    // fica no Padrão: os objetos são os em hex, nunca os por variável do perfil.
    expect(copiasDoDono(atelieConfig as ConfigLido)).toEqual([])
    expect(objetosDoConfig(atelieConfig as ConfigLido).colors).toBe(ESTRELINHA_COLORS)
    expect(objetosDoConfig(atelieConfig as ConfigLido).boxShadow).toBe(ESTRELINHA_SHADOW)
  })

  it('o dono declara a paleta canônica inteira', () => {
    // Âncora: o objeto do dono tem exatamente os tokens da PALETA escrita à mão acima.
    expect(Object.keys(ESTRELINHA_COLORS).sort()).toEqual(Object.keys(PALETA).sort())
  })

  it('sensor: um config com CÓPIA literal (valores iguais, outro objeto) reprova', () => {
    const copia: ConfigLido = {
      theme: {
        extend: {
          colors: { estrelinha: { ...ESTRELINHA_COLORS } },
          fontFamily: ESTRELINHA_FONTS,
          borderRadius: { ...ESTRELINHA_RADIUS },
          boxShadow: ESTRELINHA_SHADOW,
        },
      },
    }
    expect(copiasDoDono(copia)).toEqual(['colors', 'borderRadius'])
  })

  it('sensor: um config sem a paleta reprova nos quatro', () => {
    expect(copiasDoDono({})).toEqual(['colors', 'fontFamily', 'borderRadius', 'boxShadow'])
  })
})
