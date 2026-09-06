import { describe, it, expect } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SYMBOL, SYMBOL_TINY } from '@/shared/ui/brand/paths'

/**
 * Os ativos de marca e a cabeça do documento — `IDN-07`.
 *
 * Ícone é a categoria de bug mais silenciosa que existe: o arquivo some, o
 * `<link>` aponta para o lugar errado, o `theme-color` fica na cor da paleta
 * velha — e nada disso quebra build, tipo ou teste de componente. Só a aba do
 * navegador muda, e ninguém olha para a aba da própria loja.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const STORE = resolve(HERE, '../../..')
const PUBLIC = resolve(STORE, 'public')
const INDEX = readFileSync(resolve(STORE, 'index.html'), 'utf8')

/** Todo `href`/`content` do `<head>` que aponta para um arquivo do próprio site. */
const REFERENCIADOS = [...INDEX.matchAll(/(?:href|content)="\/([^"]+)"/g)].map((m) => m[1])

describe('todo arquivo que o index.html referencia existe no disco', () => {
  it('a leitura encontrou as referências locais', () => {
    // Âncora: um `index.html` lido do lugar errado não referencia nada, e um
    // teste que itera lista vazia passa em silêncio. São seis hoje: os quatro
    // ícones e os dois `preload` de fonte que a feature 38 trouxe para cá.
    expect(REFERENCIADOS.length).toBeGreaterThanOrEqual(6)
  })

  it.each(REFERENCIADOS)('`public/%s`', (file) => {
    const path = resolve(PUBLIC, file)
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).size).toBeGreaterThan(500)
  })
})

describe('favicon.svg — a ABA, com recorte próprio', () => {
  const svg = readFileSync(resolve(PUBLIC, 'favicon.svg'), 'utf8')

  it('é 64×64', () => {
    expect(svg).toMatch(/viewBox="0 0 64 64"/)
  })

  it('tem canto próprio — o navegador não arredonda favicon', () => {
    // 3,84 / 64 = 6%. Canto pequeno de propósito: o extremo deste desenho é a
    // ponta da estrela, na DIAGONAL — exatamente onde um canto grande come
    // área. Um squircle de 28% obrigaria a encolher a arte para 0,856 e o
    // traço cairia de 1,28px para 1,10px a 16px.
    const rx = Number(svg.match(/rx="([\d.]+)"/)?.[1])
    expect(rx).toBe(3.84)
    expect(rx / 64).toBeCloseTo(0.06, 3)
  })

  it('é placa `primary-strong` com a marca em `on-primary`', () => {
    expect(svg).toMatch(/fill="#283A4A"/)
    expect(svg).toMatch(/stroke="#F7F3EC"/)
  })

  it('usa o path do símbolo REDUZIDO, caractere a caractere', () => {
    // Nada foi redesenhado para caber em 16px: a redução veio da prancha
    // `734-0`, e é a mesma que `paths.ts` carrega.
    expect(svg).toContain(SYMBOL_TINY.strokes[0].d)
  })

  it('NÃO usa o símbolo grande, que a 16px vira mancha', () => {
    // A prancha diz, medido: "abaixo de 32px o símbolo completo vira mancha:
    // as pétalas e as fagulhas fecham".
    expect(svg).not.toContain(SYMBOL.strokes[0].d)
  })
})

describe('a espessura do traço a 16px', () => {
  it('a redução tem quase 3× o traço do símbolo grande', () => {
    // "É quase 3x o traço do símbolo grande, e é proposital" — prancha `734-0`.
    expect(SYMBOL_TINY.strokes[0].width / SYMBOL.strokes[0].width).toBeGreaterThan(2.5)
  })

  it('rende ao menos 1,28px de linha numa aba de 16px', () => {
    // O board calibrou a redução para "render pelo menos 1,3px de linha a
    // 16px". A arte é sangrada — ocupa o quadro inteiro —, então a fração do
    // traço sobre o lado é a própria espessura sobre o viewBox de 100.
    const [, , vb] = SYMBOL_TINY.viewBox.split(/\s+/).map(Number)
    expect((SYMBOL_TINY.strokes[0].width / vb) * 16).toBeGreaterThanOrEqual(1.28)
  })

  it('o símbolo GRANDE não alcançaria esse piso a 16px', () => {
    // É o que torna a redução necessária, e não uma preferência: 2,46% × 16 =
    // 0,39px. Se um dia alguém apontar o favicon para o símbolo grande, este
    // teste é o motivo escrito.
    const [, , vb] = SYMBOL.viewBox.split(/\s+/).map(Number)
    expect((SYMBOL.strokes[0].width / vb) * 16).toBeLessThan(1)
  })
})

describe('apple-touch-icon — o atalho do iOS, SANGRADO', () => {
  const png = readFileSync(resolve(PUBLIC, 'apple-touch-icon.png'))

  it('é 180×180', () => {
    // Os oito primeiros bytes são a assinatura do PNG; largura e altura vêm no
    // IHDR, em big-endian, a partir do byte 16.
    expect(png.readUInt32BE(16)).toBe(180)
    expect(png.readUInt32BE(20)).toBe(180)
  })

  it('a fonte dele não tem canto — o iOS aplica a própria máscara', () => {
    // Arte pré-arredondada deixa uma sobra entre o desenho e o corte do
    // sistema. Quem decide o raio ali é o iOS, não a arte.
    const fonte = readFileSync(resolve(PUBLIC, 'icon-maskable.svg'), 'utf8')
    expect(fonte).toMatch(/viewBox="0 0 180 180"/)
    expect(fonte).not.toMatch(/<rect[^>]*\srx=/)
  })
})

describe('favicon.ico — três tamanhos', () => {
  const ico = readFileSync(resolve(PUBLIC, 'favicon.ico'))

  it('é um ícone com 3 entradas', () => {
    expect(ico.readUInt16LE(0)).toBe(0) // reservado
    expect(ico.readUInt16LE(2)).toBe(1) // 1 = ícone
    expect(ico.readUInt16LE(4)).toBe(3)
  })

  it('traz 16, 32 e 48', () => {
    const sizes = [0, 1, 2].map((i) => ico.readUInt8(6 + i * 16))
    expect(sizes).toEqual([16, 32, 48])
  })
})

describe('index.html — a cabeça do documento', () => {
  it.each([
    ['icon svg', /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/],
    ['icon ico', /rel="icon" type="image\/x-icon" href="\/favicon\.ico"/],
    ['icon 512', /rel="icon"[^>]*sizes="512x512" href="\/icon-512\.png"/],
    ['apple-touch-icon', /rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/],
  ])('declara %s', (_label, pattern) => {
    expect(INDEX).toMatch(pattern)
  })

  it('`theme-color` está declarado e não é a geleia velha', () => {
    // O VALOR é da T35 (metadados), não desta task. O que se guarda aqui é que
    // ele existe e não voltou ao rosa que a paleta já não tem.
    expect(INDEX).toMatch(/name="theme-color" content="#[0-9A-Fa-f]{6}"/)
    expect(INDEX).not.toContain('#B0176B')
  })
})

/**
 * `PRF-14` — as fontes saem do domínio de terceiro.
 *
 * Até a feature 38 o primeiro texto da loja dependia de DUAS conexões ao
 * Google: uma folha de estilo no `googleapis`, que só então revelava os
 * `woff2` no `gstatic`. Em 4G são dois apertos de mão em série antes do
 * primeiro byte de fonte.
 *
 * Este guarda é a contrapartida escrita disso, e existe porque a regressão é
 * silenciosa nos dois sentidos: um `<link>` do Google que volte por cópia de
 * outro projeto não quebra nada (a loja fica mais lenta e ninguém vê), e um
 * `@font-face` apontando para arquivo que não está no disco também não — a
 * página renderiza, em Georgia, e só quem conhece a marca percebe.
 *
 * As asserções abaixo **substituem** as que liam o `<link>` do Google, e são
 * mais do que ele: além das famílias e dos pesos, cobrem a existência dos
 * bytes no disco, o `swap`, o `preload`, a licença e o caminho servido.
 */
const APP_CSS = readFileSync(resolve(STORE, 'src/app/App.css'), 'utf8')
const FONTS_DIR = resolve(PUBLIC, 'fonts')

/**
 * Remove comentário de CSS. A EXPLICAÇÃO de uma regra não pode contar como uso
 * dela: o bloco de `App.css` conta por que o Google saiu, e sem esta poda a
 * asserção de "nenhuma origem de terceiro" reprovaria no próprio texto que
 * documenta a decisão. Funciona com CRLF e com LF — `[\s\S]` atravessa os
 * dois, e o arquivo no disco de quem desenvolve no Windows tem CRLF.
 */
function semComentarios(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

type Face = { family: string; style: string; weight: string; display: string; src: string }

/** Toda declaração `@font-face` do CSS, lida do disco. */
function facesDe(css: string): Face[] {
  return [...semComentarios(css).matchAll(/@font-face\s*\{([^}]*)\}/g)].map((bloco) => {
    const corpo = bloco[1]
    const prop = (nome: string) =>
      corpo.match(new RegExp(`(?:^|[;{\\s])${nome}\\s*:\\s*([^;]+)`))?.[1].trim() ?? ''
    return {
      family: prop('font-family').replace(/["']/g, ''),
      style: prop('font-style'),
      weight: prop('font-weight').replace(/\s+/g, ' '),
      display: prop('font-display'),
      src: prop('src').match(/url\(["']?([^"')]+)/)?.[1] ?? '',
    }
  })
}

const FACES = facesDe(APP_CSS)

/**
 * Os pesos do design system, e só eles — `DESIGN.md` §3.
 *
 * Libre Baskerville é hoje uma variável de eixo `wght` 400–700 mais um itálico
 * estático de 400, então as duas primeiras faces apontam para o MESMO arquivo:
 * é o que a folha do Google fazia, e é o que mantém a renderização idêntica.
 * Não há 500 nem 600 aqui porque o DS não usa nenhum dos dois.
 */
const DS: Face[] = [
  {
    family: 'Libre Baskerville',
    style: 'normal',
    weight: '400',
    display: 'swap',
    src: '/fonts/libre-baskerville-v24-latin.woff2',
  },
  {
    family: 'Libre Baskerville',
    style: 'normal',
    weight: '700',
    display: 'swap',
    src: '/fonts/libre-baskerville-v24-latin.woff2',
  },
  {
    family: 'Libre Baskerville',
    style: 'italic',
    weight: '400',
    display: 'swap',
    src: '/fonts/libre-baskerville-v24-latin-italic.woff2',
  },
  {
    family: 'Outfit',
    style: 'normal',
    weight: '300 700',
    display: 'swap',
    src: '/fonts/outfit-v15-latin.woff2',
  },
]

const PRELOADS = [...INDEX.matchAll(/<link rel="preload"[^>]*>/g)].map((m) => m[0])
const PRELOAD_HREFS = PRELOADS.map((linha) => linha.match(/href="([^"]+)"/)?.[1] ?? '')
const NO_DISCO = readdirSync(FONTS_DIR)
const WOFF2_NO_DISCO = NO_DISCO.filter((f) => f.endsWith('.woff2'))
const TERCEIROS = ['fonts.googleapis.com', 'fonts.gstatic.com']

describe('as fontes vêm do próprio domínio (PRF-14)', () => {
  it('a leitura encontrou as faces e os arquivos — âncora dupla', () => {
    // Sem âncora, um regex que deixasse de casar faria toda asserção abaixo
    // iterar lista vazia e passar em silêncio — a pior falha possível num
    // teste que varre disco. São quatro faces sobre três arquivos.
    expect(FACES).toHaveLength(4)
    expect(WOFF2_NO_DISCO).toHaveLength(3)
  })

  it.each(TERCEIROS)('o `index.html` não fala mais com `%s`', (origem) => {
    expect(INDEX).not.toContain(origem)
  })

  it.each(TERCEIROS)('o `App.css` não fala mais com `%s`', (origem) => {
    // Lido SEM comentário: o bloco que explica a saída do Google cita os dois
    // hosts, e citar não é usar.
    expect(semComentarios(APP_CSS)).not.toContain(origem)
  })

  it('nenhuma origem externa sobrou no `<head>`', () => {
    // A régua é a lista de origens, não a busca por um nome: uma terceira CDN
    // de fonte passaria pelas duas asserções acima sem tocar em nenhuma.
    const origens = [...INDEX.matchAll(/<link[^>]*href="(https?:\/\/[^/"]+)/g)].map((m) => m[1])
    expect(origens).toEqual([])
  })

  it.each(DS)('declara $family $style $weight, e aponta para o arquivo dela', (esperada) => {
    const face = FACES.find(
      (f) =>
        f.family === esperada.family && f.style === esperada.style && f.weight === esperada.weight,
    )
    expect(face).toBeDefined()
    expect(face.src).toBe(esperada.src)
  })

  it('nenhum peso além dos do DS é declarado', () => {
    // O par da asserção acima, e o que pega o caso caro: pedir 500 ou 600 de
    // uma família que não os tem faz o navegador SINTETIZAR falso-negrito —
    // não quebra nada, só fica feio, e só na fonte certa.
    const declarados = FACES.map((f) => `${f.family} ${f.style} ${f.weight}`).sort()
    const esperados = DS.map((f) => `${f.family} ${f.style} ${f.weight}`).sort()
    expect(declarados).toEqual(esperados)
  })

  it('SENSOR: a régua reprova um peso que a família não tem', () => {
    // Prova que a asserção acima é sensível ao defeito que ela existe para
    // pegar. Sem isto, um extrator quebrado devolveria lista vazia e a
    // comparação passaria com o CSS pedindo qualquer coisa.
    const defeito = facesDe(
      '@font-face { font-family: "Libre Baskerville"; font-style: normal; font-weight: 600; font-display: swap; src: url("/fonts/x.woff2") format("woff2"); }',
    )
    expect(defeito).toHaveLength(1)
    expect(defeito[0].weight).toBe('600')
    expect(DS.map((f) => `${f.family} ${f.style} ${f.weight}`)).not.toContain(
      'Libre Baskerville normal 600',
    )
  })

  it('SENSOR: a poda de comentário não engole o uso, e atravessa CRLF', () => {
    // Se a poda comesse demais, "nenhuma origem de terceiro" passaria mesmo
    // com um `@import` real do Google no arquivo.
    expect(semComentarios('/* fonts.gstatic.com */\na{color:red}')).not.toContain('gstatic')
    expect(semComentarios('/* nota */\r\na{src:url(https://fonts.gstatic.com/x)}')).toContain(
      'fonts.gstatic.com',
    )
  })

  it.each([...new Set(DS.map((f) => f.src))])('`public%s` existe, e é um woff2 de verdade', (src) => {
    // "Existe" não basta: um arquivo de zero byte ou um HTML de erro salvo com
    // extensão de fonte passaria por `existsSync`. A assinatura `wOF2` é a
    // prova de que os bytes são fonte.
    const arquivo = resolve(PUBLIC, src.slice(1))
    expect(existsSync(arquivo)).toBe(true)
    const bytes = readFileSync(arquivo)
    expect(bytes.toString('latin1', 0, 4)).toBe('wOF2')
    expect(bytes.length).toBeGreaterThan(10_000)
  })

  it('nenhum arquivo de fonte fica órfão no diretório', () => {
    // Bidirecional: a asserção acima pega a fonte que sumiu, esta pega a que
    // ficou para trás — bytes servidos que ninguém pede são peso morto no
    // repositório e no deploy.
    const usados = new Set(DS.map((f) => f.src.replace('/fonts/', '')))
    expect([...WOFF2_NO_DISCO].sort()).toEqual([...usados].sort())
  })

  it.each(FACES)('$family $style $weight usa `font-display: swap`', (face) => {
    // Texto invisível esperando fonte é pior que texto certo na fonte errada
    // por 200 ms. É a política de sempre, e ela não muda ao sair do Google.
    expect(face.display).toBe('swap')
  })
})

describe('o `preload` das duas faces do primeiro texto (PRF-14)', () => {
  it('a leitura encontrou os `preload` — âncora', () => {
    // São dois: o corpo (Outfit) e os títulos (Libre Baskerville). O itálico
    // fica de fora de propósito: é raro e não paga uma requisição adiantada.
    expect(PRELOADS).toHaveLength(2)
  })

  it.each([
    ['/fonts/outfit-v15-latin.woff2', 'o corpo'],
    ['/fonts/libre-baskerville-v24-latin.woff2', 'os títulos'],
  ])('adianta `%s` — %s', (href) => {
    expect(PRELOAD_HREFS).toContain(href)
  })

  it.each(PRELOADS)('%s declara `as`, `type` e `crossorigin`', (linha) => {
    expect(linha).toContain('as="font"')
    expect(linha).toContain('type="font/woff2"')
    // `crossorigin` não é enfeite nem sobra de copiar do Google: fonte é
    // SEMPRE buscada em modo CORS, mesmo do próprio domínio. Sem o atributo o
    // navegador guarda a resposta num balde que o `@font-face` não alcança e
    // baixa tudo de novo — o adiantamento vira o dobro do custo, em silêncio.
    expect(linha).toContain('crossorigin')
  })

  it('nenhum `preload` aponta para face que o CSS não declara', () => {
    // Um `preload` órfão é a regressão mais cara desta task: o arquivo baixa,
    // ninguém usa, e o Lighthouse ainda cobra o byte.
    const declarados = FACES.map((f) => f.src)
    for (const href of PRELOAD_HREFS) expect(declarados).toContain(href)
  })

  it('vem ANTES do `<script type="module">`', () => {
    // O ganho inteiro é o download começar junto com o HTML. Depois do script,
    // o navegador já teria descoberto a fonte pelo CSS por conta própria.
    const script = INDEX.indexOf('<script type="module"')
    expect(script).toBeGreaterThan(-1)
    for (const linha of PRELOADS) expect(INDEX.indexOf(linha)).toBeLessThan(script)
  })
})

describe('a licença OFL viaja junto dos arquivos (PRF-14)', () => {
  const LICENCAS = NO_DISCO.filter((f) => f.startsWith('OFL'))

  it('há uma licença por família, no MESMO diretório dos bytes', () => {
    // Exigência da SIL Open Font License 1.1, não formalidade: redistribuir a
    // fonte sem o aviso de copyright e o texto da licença é redistribuir fora
    // da licença. Duas famílias, dois detentores, dois arquivos.
    expect([...LICENCAS].sort()).toEqual(['OFL-Libre-Baskerville.txt', 'OFL-Outfit.txt'])
  })

  it.each([
    ['OFL-Libre-Baskerville.txt', 'Libre Baskerville'],
    ['OFL-Outfit.txt', 'Outfit'],
  ])('`%s` traz o aviso de copyright e o texto da licença', (arquivo, familia) => {
    const texto = readFileSync(resolve(FONTS_DIR, arquivo), 'utf8')
    expect(texto).toMatch(/^Copyright \d{4} The .+ Project Authors/)
    expect(texto).toContain(familia)
    expect(texto).toContain('SIL OPEN FONT LICENSE Version 1.1')
    expect(texto).toContain('PERMISSION & CONDITIONS')
  })

  it('toda família declarada no CSS tem licença — bidirecional', () => {
    // O par do teste acima: uma terceira família entrando no `@font-face` sem
    // licença ao lado passaria pela lista fixa, mas não por esta varredura.
    const familias = [...new Set(FACES.map((f) => f.family))]
    expect(familias.length).toBeGreaterThanOrEqual(2)
    for (const familia of familias) {
      const encontrada = LICENCAS.some((arquivo) =>
        readFileSync(resolve(FONTS_DIR, arquivo), 'utf8').includes(familia),
      )
      expect(encontrada).toBe(true)
    }
  })
})

/**
 * Os metadados dos DOIS apps — `COP-03`.
 *
 * O `<head>` é a única parte da loja que a cliente vê **sem abrir a loja**: a
 * aba do navegador, o resultado da busca e o card que ela manda para a irmã no
 * WhatsApp saem daqui. Nada disso passa por componente, então nenhum teste de
 * render alcança — e um título com a marca errada sobrevive a build, tipo e
 * suíte inteira.
 */
const ADMIN_INDEX = readFileSync(resolve(STORE, '../backoffice/index.html'), 'utf8')

function meta(html: string, nome: string): string | undefined {
  return html.match(new RegExp(`(?:name|property)="${nome}" content="([^"]*)"`))?.[1]
}

describe('index.html — os metadados dos dois apps (COP-03)', () => {
  it('a leitura encontrou os dois documentos', () => {
    // Âncora: um caminho errado devolveria string vazia, e `not.toContain`
    // sobre string vazia passa sempre.
    expect(INDEX).toContain('<title>')
    expect(ADMIN_INDEX).toContain('<title>')
  })

  it('a loja se apresenta como Uma Estrelinha no título e no autor', () => {
    expect(INDEX).toMatch(/<title>Uma Estrelinha[^<]*<\/title>/)
    expect(meta(INDEX, 'author')).toBe('Uma Estrelinha')
  })

  it('título e descrição são os mesmos no documento, no OG e no Twitter', () => {
    // Três lugares para o mesmo texto: divergir dá um card que promete uma
    // coisa e uma aba que diz outra, sem erro em lugar nenhum.
    const titulo = INDEX.match(/<title>([^<]*)<\/title>/)?.[1]
    expect(meta(INDEX, 'og:title')).toBe(titulo)
    expect(meta(INDEX, 'twitter:title')).toBe(titulo)

    const descricao = meta(INDEX, 'description')
    expect(descricao).toMatch(/resina/)
    expect(meta(INDEX, 'og:description')).toBe(descricao)
    expect(meta(INDEX, 'twitter:description')).toBe(descricao)
  })

  it('a `og:image` é ativo do PRÓPRIO projeto, e o arquivo existe no disco', () => {
    // Ela apontava para `storage.googleapis.com/gpt-engineer-file-uploads/…`,
    // o CDN do template de origem: arte de outro produto, num host que ninguém
    // deste projeto controla e que pode sumir sem aviso.
    const og = meta(INDEX, 'og:image') ?? ''
    expect(og).not.toContain('gpt-engineer')
    expect(og).not.toContain('storage.googleapis.com')

    // Absoluta de propósito — o rastreador do Facebook não resolve relativa.
    expect(og).toMatch(/^https:\/\/umaestrelinha\.com\.br\//)
    expect(meta(INDEX, 'twitter:image')).toBe(og)

    const arquivo = og.slice(og.lastIndexOf('/') + 1)
    expect(existsSync(resolve(PUBLIC, arquivo))).toBe(true)
    expect(statSync(resolve(PUBLIC, arquivo)).size).toBeGreaterThan(5000)
  })

  it('as dimensões declaradas do card são as do arquivo gerado', () => {
    // 1200×630 é o que `_build-og.ps1` rende. Declarar outra medida faz o
    // rastreador recortar por conta própria.
    expect(meta(INDEX, 'og:image:width')).toBe('1200')
    expect(meta(INDEX, 'og:image:height')).toBe('630')

    const png = readFileSync(resolve(PUBLIC, 'og-image.png'))
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
  })

  it('`theme-color` é um token da paleta nova, lido do App.css', () => {
    // "É uma cor" não basta: qualquer hex passaria. O valor tem de estar
    // DECLARADO na paleta — senão o topo do navegador no celular fica numa cor
    // que não existe em lugar nenhum da loja.
    const cor = meta(INDEX, 'theme-color') ?? ''
    const appCss = readFileSync(resolve(STORE, 'src/app/App.css'), 'utf8')
    expect(cor).toMatch(/^#[0-9A-Fa-f]{6}$/)
    // O App.css escreve o hex em minúsculas; o `<head>` não é obrigado a isso.
    expect(appCss.toLowerCase()).toContain(`--estrelinha-primary-strong: ${cor.toLowerCase()}`)
  })

  it('o backoffice se apresenta como Uma Estrelinha e continua fora dos buscadores', () => {
    expect(ADMIN_INDEX).toMatch(/<title>Uma Estrelinha[^<]*Backoffice<\/title>/)
    expect(meta(ADMIN_INDEX, 'robots')).toBe('noindex, nofollow')
  })

  it('o painel não declara card social — não é superfície de compartilhamento', () => {
    expect(ADMIN_INDEX).not.toContain('og:')
    expect(ADMIN_INDEX).not.toContain('twitter:')
  })
})

/**
 * `PRF-04` — a conexão com o Supabase é aberta enquanto o bundle ainda baixa.
 *
 * Medido em 2026-09-05 em perfil móvel: a primeira requisição de dados só saía DEPOIS de o bundle
 * baixar e interpretar, e o aperto de mão (DNS + TCP + TLS) custava de 300 a 600 ms em série. O
 * `preconnect` paga esse custo em paralelo.
 *
 * Este guarda existe porque a regressão é invisível: apagar a linha não quebra build, tipo nem
 * teste de componente. A loja continua funcionando — só mais devagar, e só para quem está no 4G.
 */
describe('index.html — o `preconnect` do Supabase (PRF-04)', () => {
  const ENV_EXAMPLE = readFileSync(resolve(STORE, '.env.example'), 'utf8')
  const preconnects = [...INDEX.matchAll(/<link rel="preconnect"[^>]*>/g)].map((m) => m[0])

  it('a leitura encontrou os `preconnect` do documento — âncora', () => {
    // Sem esta âncora, um regex que deixasse de casar faria toda asserção abaixo passar sobre uma
    // lista vazia. É UM hoje: os dois do Google Fonts saíram com a T18, que trouxe as fontes para
    // o próprio domínio — e origem própria não se aquece, já está aquecida.
    expect(preconnects).toHaveLength(1)
  })

  it('declara `preconnect` para o Supabase, com `crossorigin`', () => {
    // `crossorigin` não é enfeite: as requisições ao Supabase saem em modo CORS, que usa um pool
    // de conexão SEPARADO. Sem o atributo, o navegador aquece a conexão errada e abre outra.
    const supabase = preconnects.filter((l) => l.includes('VITE_SUPABASE_URL'))
    expect(supabase).toHaveLength(1)
    expect(supabase[0]).toMatch(/crossorigin/)
  })

  it('a origem vem da variável que o `.env.example` declara — um dono só', () => {
    // O host NÃO é escrito no HTML. Cravá-lo criaria um segundo dono de "onde fica o Supabase", e
    // o dia em que o projeto mudasse a loja aqueceria a conexão de um host que ninguém usa. Ler o
    // `.env.example` do disco é o que faz um RENOME da variável derrubar a suíte.
    expect(ENV_EXAMPLE).toMatch(/^VITE_SUPABASE_URL=/m)
    expect(INDEX).toContain('href="%VITE_SUPABASE_URL%"')
  })

  it('vem ANTES do `<script type="module">` — senão não adianta nada', () => {
    // O ganho inteiro é abrir a conexão ENQUANTO o bundle baixa. Depois do script, o navegador já
    // teria começado a pedir dados por conta própria, e o `preconnect` viraria enfeite.
    const preconnect = INDEX.indexOf('href="%VITE_SUPABASE_URL%"')
    const script = INDEX.indexOf('<script type="module"')
    expect(preconnect).toBeGreaterThan(-1)
    expect(script).toBeGreaterThan(-1)
    expect(preconnect).toBeLessThan(script)
  })

  it('é o ÚNICO — nenhuma origem de terceiro sobrou para aquecer', () => {
    // A T18 tirou as duas do Google, e esta asserção é a que sobrou no lugar delas: um
    // `preconnect` para uma origem que a loja não usa mais é pior que inútil — custa um aperto de
    // mão no 4G para nada, e ninguém percebe, porque a página funciona.
    expect(preconnects.filter((l) => /https?:\/\//.test(l))).toHaveLength(0)
    expect(preconnects[0]).toContain('%VITE_SUPABASE_URL%')
  })
})


/**
 * **Todo marcador de env do `index.html` está declarado no `turbo.json`** — `PRF-04`.
 *
 * ## O defeito que este guarda existe para pegar, e que aconteceu
 *
 * O `preconnect` de `PRF-04` referencia `VITE_SUPABASE_URL` pelo marcador de substituição do Vite,
 * para não cravar o host do Supabase num segundo lugar. A escolha é certa. O que ninguém mediu é
 * que **o Turbo roda cada task num ambiente filtrado**: variável não declarada em `turbo.json` não
 * chega ao `vite build`.
 *
 * Sem a declaração, o Vite deixa o marcador intacto dentro do `href`, e o `decodeURI` do
 * `vite:build-html` tropeça no `%VI` — escape percentual inválido. O build morre com
 * **`[vite:build-html] URI malformed`**, uma mensagem que **não menciona variável de ambiente
 * nenhuma** e manda procurar no lugar errado.
 *
 * ## Por que nada pegou
 *
 * O build **local** sempre passou: o Vite lê o **arquivo** `.env` do app, que não é ambiente e por
 * isso o Turbo nunca filtrou. A **Vercel** também sempre passou: ela roda `vite build` direto, sem
 * Turbo no meio. Só o CI reprovava — e ele foi o último a ser olhado, porque as duas superfícies
 * que a gente vê estavam verdes. Custou dois ciclos de deploy.
 *
 * ## A régua
 *
 * Bidirecional por construção: todo marcador que o HTML usa tem de estar na lista do `turbo.json`.
 * Ela lê os dois arquivos do disco — o `turbo.json` é a raiz do monorepo, três níveis acima de
 * `apps/store`.
 */
describe('as env do index.html chegam ao build (PRF-04)', () => {
  const TURBO = readFileSync(resolve(STORE, '../..', 'turbo.json'), 'utf8')

  /** Os marcadores `%VITE_*%` que o HTML manda o Vite substituir. */
  const marcadores = [...INDEX.matchAll(/%(VITE_[A-Z0-9_]+)%/g)].map((m) => m[1])

  /** O bloco `env` da task `build`, lido como texto: o JSON tem comentários e não é `JSON.parse`. */
  const envDeclaradas = [...TURBO.matchAll(/"(VITE_[A-Z0-9_]+)"/g)].map((m) => m[1])

  it('o index.html usa ao menos um marcador — senão esta suíte não afirma nada', () => {
    expect(marcadores.length).toBeGreaterThan(0)
    expect(marcadores).toContain('VITE_SUPABASE_URL')
  })

  it('o turbo.json declara variáveis de env no build', () => {
    expect(envDeclaradas.length).toBeGreaterThan(0)
  })

  it('CADA marcador do HTML está declarado no turbo.json', () => {
    const ausentes = marcadores.filter((v) => !envDeclaradas.includes(v))
    expect(ausentes).toEqual([])
  })

  it('as duas que o client do Supabase exige estão lá', () => {
    // O client LANÇA no carregamento sem elas. Se o Turbo as filtrar, o bundle nasce sem valor e a
    // loja quebra em runtime, não no build — pior ainda que o `URI malformed`.
    expect(envDeclaradas).toContain('VITE_SUPABASE_URL')
    expect(envDeclaradas).toContain('VITE_SUPABASE_PUBLISHABLE_KEY')
  })

  describe('sensores — a régua reprova o defeito medido', () => {
    const extrair = (html: string) => [...html.matchAll(/%(VITE_[A-Z0-9_]+)%/g)].map((m) => m[1])
    const declarar = (json: string) => [...json.matchAll(/"(VITE_[A-Z0-9_]+)"/g)].map((m) => m[1])

    it('marcador no HTML sem declaração no turbo é REPROVADO', () => {
      const m = extrair('<link href="%VITE_NOVA_COISA%">')
      const d = declarar('{ "env": ["VITE_SUPABASE_URL"] }')
      expect(m.filter((v) => !d.includes(v))).toEqual(['VITE_NOVA_COISA'])
    })

    it('o mesmo par, com a declaração presente, PASSA', () => {
      const m = extrair('<link href="%VITE_NOVA_COISA%">')
      const d = declarar('{ "env": ["VITE_NOVA_COISA"] }')
      expect(m.filter((v) => !d.includes(v))).toEqual([])
    })

    it('a régua não confunde `VITE_X` com `VITE_X_Y`', () => {
      const m = extrair('<link href="%VITE_STORE%">')
      const d = declarar('{ "env": ["VITE_STORE_URL"] }')
      expect(m.filter((v) => !d.includes(v))).toEqual(['VITE_STORE'])
    })
  })
})
