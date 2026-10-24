import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * **Toda rota do app do ateliê está DENTRO do `RequireAdmin` — menos o login** (feature 72, `MAF-16`).
 *
 * Molde: `apps/backoffice/src/app/__tests__/rotasSobGuarda.test.ts`, que nasceu de duas telas do
 * painel vazando para fora do guarda com a suíte inteira verde. A régua mede POSIÇÃO, não presença:
 * ela recorta o bloco entre o `<Route element={<RequireAdmin …>}>` e o `</Route>` que o fecha, e exige
 * que toda rota esteja lá dentro. **Âncora tripla**: o arquivo lido, o bloco recortado (o recorte que
 * falha devolve `null` e REPROVA), e exatamente um `</Route>`.
 *
 * Diferença do molde: aqui não há prefixo `/admin` — o app inteiro é o painel —, então a varredura
 * pega TODO `path="…"`, inclusive o `*` que manda caminho desconhecido para a Início.
 */

const fonte = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')

/**
 * As rotas que PODEM (e devem) ficar de fora, cada uma com a razão:
 * - `/login` — quem não entrou precisa alcançá-lo;
 * - `/recuperar`, `/recuperar/codigo`, `/recuperar/senha` — a recuperação por código (`MAF-24`):
 *   quem esqueceu a senha também não entrou. Cada passo é uma rota para o voltar do Android voltar
 *   um passo. Nenhuma delas lê dado da loja; a senha nova só é gravada com a sessão que o código abriu.
 */
const FORA_POR_DESENHO = ['/login', '/recuperar', '/recuperar/codigo', '/recuperar/senha']

/** Sem comentários (linha e bloco na MESMA varredura), com `[^\n\r]` fechando antes do `\r`. */
const semComentarios = (texto: string): string =>
  texto.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}|\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, (t) => t.replace(/[^\n]/g, ' '))

const rotas = (texto: string): Array<{ path: string; at: number }> =>
  [...texto.matchAll(/path="([^"]*)"/g)].map((m) => ({ path: m[1], at: m.index ?? -1 }))

const blocoGuardado = (texto: string): { inicio: number; fim: number } | null => {
  const abertura = texto.search(/<Route\s+element=\{[\s\S]{0,200}?<RequireAdmin/)
  if (abertura === -1) return null
  const fim = texto.indexOf('</Route>', abertura)
  if (fim === -1) return null
  return { inicio: abertura, fim }
}

const foraDoBloco = (texto: string): string[] => {
  const codigo = semComentarios(texto)
  const b = blocoGuardado(codigo)
  return rotas(codigo)
    .filter((r) => !FORA_POR_DESENHO.includes(r.path))
    .filter((r) => b === null || r.at < b.inicio || r.at > b.fim)
    .map((r) => r.path)
}

const codigo = semComentarios(fonte)
const bloco = blocoGuardado(codigo)

describe('as rotas do ateliê — âncora tripla', () => {
  it('o `App.tsx` foi lido e tem conteúdo', () => {
    expect(fonte.length).toBeGreaterThan(1000)
  })

  it('o bloco guardado foi RECORTADO', () => {
    expect(bloco).not.toBeNull()
    expect(bloco!.fim).toBeGreaterThan(bloco!.inicio)
  })

  it('a varredura encontra as dez rotas — o login, os três passos da recuperação, as quatro abas, o detalhe do pedido (`74`) e o desconhecido', () => {
    expect(rotas(codigo).map((r) => r.path)).toEqual([
      '/login',
      '/recuperar',
      '/recuperar/codigo',
      '/recuperar/senha',
      '/',
      '/pedidos',
      '/pedidos/:id',
      '/clientes',
      '/descontos',
      '*',
    ])
  })

  it('há exatamente UM `</Route>` — o recorte depende disso', () => {
    expect((codigo.match(/<\/Route>/g) ?? []).length).toBe(1)
  })
})

describe('toda rota fora do login está sob `RequireAdmin` (MAF-16)', () => {
  it('nenhuma rota fica FORA do bloco guardado', () => {
    expect(foraDoBloco(fonte)).toEqual([])
  })

  it('o detalhe do pedido (`/pedidos/:id`, MAP-54) está DENTRO do bloco — e movê-lo para fora é acusado', () => {
    const rota = rotas(codigo).find((r) => r.path === '/pedidos/:id')!
    expect(rota.at).toBeGreaterThan(bloco!.inicio)
    expect(rota.at).toBeLessThan(bloco!.fim)
    const linha = '            <Route path="/pedidos/:id" element={<PedidoPage />} />\n'
    expect(fonte).toContain(linha)
    const doente = fonte.replace(linha, '').replace('</Routes>', `  <Route path="/pedidos/:id" element={<PedidoPage />} />\n        </Routes>`)
    expect(foraDoBloco(doente)).toEqual(['/pedidos/:id'])
  })

  it.each(FORA_POR_DESENHO)('`%s` está FORA, antes do bloco — quem não entrou precisa alcançá-lo', (caminho) => {
    const rota = rotas(codigo).find((r) => r.path === caminho)!
    expect(rota).toBeDefined()
    expect(rota.at).toBeLessThan(bloco!.inicio)
  })

  it('o `RequireAdmin` do bloco manda para `/login`, desenha o fallback que carrega (a splash, ou a tela ocupada numa nova tentativa) e a tela do papel não conferido (MAF-23)', () => {
    expect(codigo).toMatch(
      /<RequireAdmin\s+loginPath="\/login"\s+fallback=\{<CarregandoAcesso\s*\/>\}\s+unknownFallback=\{<TelaDeEntrada><AcessoNaoConferido\s*\/><\/TelaDeEntrada>\}>/,
    )
  })
})

const SAUDAVEL = `
  <Route path="/login" element={<Login />} />
  <Route path="/recuperar" element={<Recuperar />} />
  <Route element={<RequireAdmin loginPath="/login" fallback={<Splash />}><Layout /></RequireAdmin>}>
    <Route path="/" element={<Inicio />} />
    <Route path="/pedidos" element={<Pedidos />} />
  </Route>
`

describe('as rotas do ateliê — os sensores', () => {
  it('SENSOR INVERSO — o arranjo correto NÃO é acusado', () => {
    expect(foraDoBloco(SAUDAVEL)).toEqual([])
  })

  it('SENSOR — uma aba movida para DEPOIS do bloco é acusada', () => {
    const doente = SAUDAVEL.replace('    <Route path="/pedidos" element={<Pedidos />} />\n', '').replace(
      '  </Route>',
      '  </Route>\n  <Route path="/pedidos" element={<Pedidos />} />',
    )
    expect(foraDoBloco(doente)).toEqual(['/pedidos'])
  })

  it('SENSOR — uma aba movida para ANTES do bloco é acusada', () => {
    const doente = SAUDAVEL.replace('    <Route path="/pedidos" element={<Pedidos />} />\n', '').replace(
      '  <Route element={',
      '  <Route path="/pedidos" element={<Pedidos />} />\n  <Route element={',
    )
    expect(foraDoBloco(doente)).toEqual(['/pedidos'])
  })

  it('SENSOR — o `RequireAdmin` sumindo derruba o recorte, e tudo é acusado', () => {
    const doente = SAUDAVEL.replace('<RequireAdmin loginPath="/login" fallback={<Splash />}>', '<>').replace('</RequireAdmin>', '</>')
    expect(blocoGuardado(semComentarios(doente))).toBeNull()
    expect(foraDoBloco(doente)).toEqual(['/', '/pedidos'])
  })

  it('SENSOR — uma rota que não é de entrada, posta ao lado da recuperação, é acusada', () => {
    const doente = SAUDAVEL.replace(
      '  <Route path="/recuperar" element={<Recuperar />} />',
      '  <Route path="/recuperar" element={<Recuperar />} />\n  <Route path="/clientes" element={<Clientes />} />',
    )
    expect(foraDoBloco(doente)).toEqual(['/clientes'])
  })

  it('SENSOR — comentário que MENCIONA uma rota não conta como rota', () => {
    const comProsa = SAUDAVEL.replace('  </Route>', '  {/* path="/inventada" */}\n  </Route>\n  // path="/outra"')
    expect(foraDoBloco(comProsa)).toEqual([])
  })

  it('SENSOR — o removedor de comentário fecha com CRLF e com LF', () => {
    expect(semComentarios('// nada\r\nconst a = 1').trim()).toBe('const a = 1')
    expect(semComentarios('// nada\nconst a = 1').trim()).toBe('const a = 1')
  })
})
