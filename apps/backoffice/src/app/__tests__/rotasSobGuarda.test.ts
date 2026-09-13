import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * **Toda rota `/admin/*` está DENTRO do `RequireAdmin` — menos o login.**
 *
 * ---------------------------------------------------------------------------------------------
 * Por que este guarda existe
 * ---------------------------------------------------------------------------------------------
 *
 * A verificação independente da feature 48 moveu `/admin/usuarios` e `/admin/conta` para **fora** do
 * `<Route>` guardado e rodou a suíte inteira do painel: **2328 testes verdes**. As duas telas
 * renderizariam para um visitante deslogado — a listagem de quem administra a loja, com e-mail e
 * data do último acesso, e o formulário de troca de senha.
 *
 * `grep -rn RequireAdmin --include=*.test.*` devolvia **uma** ocorrência em todo o painel, e era um
 * comentário. O contrato de autorização do app inteiro não tinha nenhuma asserção.
 *
 * E o guarda que existia não alcançava: `navItems.test.ts` lê o `App.tsx` com um regex **plano**
 * (`/path="(\/admin[^"]*)"/g`), que é cego a aninhamento — para ele, uma rota dentro e uma rota fora
 * do bloco guardado são a mesma coisa.
 *
 * ---------------------------------------------------------------------------------------------
 * A régua mede ANINHAMENTO, não presença
 * ---------------------------------------------------------------------------------------------
 *
 * Ela recorta o bloco entre o `<Route element={<RequireAdmin …>}>` e o `</Route>` que o fecha, e
 * exige que toda rota `/admin/*` esteja **dentro** dele. É deliberadamente sobre a CLASSE inteira, e
 * não sobre as duas rotas que motivaram o guarda: o defeito é "uma rota do painel fora da guarda", e
 * a próxima pode ser qualquer uma.
 *
 * **Âncora tripla**, porque uma régua de recorte que falhe silenciosamente mede o vazio.
 */

const APP = resolve(__dirname, '../App.tsx')
const fonte = readFileSync(APP, 'utf8')

/** A única rota que PODE (e deve) ficar de fora: quem ainda não entrou precisa alcançá-la. */
const FORA_POR_DESENHO = ['/admin/login']

/**
 * O fonte sem comentários, para que a prosa deste arquivo e a do `App.tsx` não vire código medido.
 * `[^\n\r]` fecha antes do `\r` — num checkout Windows, `.` come o `\r` e o stripper fica inerte.
 */
const semComentarios = (texto: string): string =>
  texto.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}|\/\/[^\n\r]*/g, trecho => trecho.replace(/[^\n]/g, ' '))

const codigo = semComentarios(fonte)

/** Todo `path="/admin…"` do arquivo, com a posição — é a posição que decide dentro × fora. */
const rotas = (texto: string): Array<{ path: string; at: number }> =>
  [...texto.matchAll(/path="(\/admin[^"]*)"/g)].map(m => ({ path: m[1], at: m.index ?? -1 }))

/**
 * O recorte do bloco guardado: do `<Route` cujo `element` cita `RequireAdmin` até o `</Route>` que o
 * fecha. Devolve `null` quando não consegue recortar — e `null` **reprova**, em vez de virar um
 * bloco vazio que aprovaria tudo.
 */
const blocoGuardado = (texto: string): { inicio: number; fim: number } | null => {
  const abertura = texto.search(/<Route\s+element=\{[\s\S]{0,200}?<RequireAdmin/)
  if (abertura === -1) return null

  const fim = texto.indexOf('</Route>', abertura)
  if (fim === -1) return null

  return { inicio: abertura, fim }
}

const bloco = blocoGuardado(codigo)

describe('as rotas do painel — âncora tripla', () => {
  it('o `App.tsx` foi lido e tem conteúdo', () => {
    expect(fonte.length).toBeGreaterThan(2000)
  })

  it('o bloco guardado foi RECORTADO — o recorte não falhou em silêncio', () => {
    // Sem esta âncora, um `App.tsx` reescrito de outra forma faria `bloco` virar `null`, e a
    // asserção principal mediria o nada.
    expect(bloco).not.toBeNull()
    expect(bloco!.fim).toBeGreaterThan(bloco!.inicio)
  })

  it('a varredura encontra as rotas — e mais de uma', () => {
    const todas = rotas(codigo)
    expect(todas.length).toBeGreaterThan(15)
    expect(todas.map(r => r.path)).toContain('/admin/login')
  })

  it('há exatamente UM `</Route>` — o recorte depende disso', () => {
    // Toda rota interna é auto-fechada (`<Route … />`). Se alguém aninhar um `<Route>` com filhos,
    // o `indexOf('</Route>')` acima passaria a fechar no lugar errado — e o guarda encolheria sem
    // avisar. Este caso faz o guarda reprovar ALTO nessa hora, em vez de medir menos.
    expect((codigo.match(/<\/Route>/g) ?? []).length).toBe(1)
  })
})

describe('toda rota `/admin/*` está sob `RequireAdmin`', () => {
  it('nenhuma rota do painel fica FORA do bloco guardado', () => {
    const foraIndevidas = rotas(codigo)
      .filter(r => !FORA_POR_DESENHO.includes(r.path))
      .filter(r => bloco === null || r.at < bloco.inicio || r.at > bloco.fim)
      .map(r => r.path)

    expect(foraIndevidas).toEqual([])
  })

  it('as duas telas da feature 48 estão dentro — nomeadas, porque foram elas que vazaram', () => {
    const dentro = rotas(codigo)
      .filter(r => bloco !== null && r.at > bloco.inicio && r.at < bloco.fim)
      .map(r => r.path)

    expect(dentro).toContain('/admin/usuarios')
    expect(dentro).toContain('/admin/conta')
  })

  it('`/admin/login` está FORA, e é a única — quem não entrou precisa alcançá-la', () => {
    // O sentido inverso. Sem ele, um guarda que exigisse TUDO dentro passaria trancando a própria
    // porta de entrada, e ninguém conseguiria fazer login.
    const login = rotas(codigo).find(r => r.path === '/admin/login')!
    expect(bloco).not.toBeNull()
    expect(login.at).toBeLessThan(bloco!.inicio)
    expect(FORA_POR_DESENHO).toEqual(['/admin/login'])
  })

  it('o `element` do bloco é o `RequireAdmin`, com o `loginPath` do painel', () => {
    // Um `RequireAdmin` sem `loginPath` manda para `/login`, que é a rota da LOJA — a lojista sairia
    // do painel para uma tela de cliente, sem entender por quê.
    expect(codigo).toMatch(/<RequireAdmin\s+loginPath="\/admin\/login"/)
  })
})

// -------------------------------------------------------------------------------------------
// Sensores — a régua exercida contra o `App.tsx` DOENTE
// -------------------------------------------------------------------------------------------

/** O recorte de um `App.tsx` sintético, para provar que a régua acusa e absolve pelos motivos certos. */
const avaliar = (texto: string): string[] => {
  const codigoFalso = semComentarios(texto)
  const b = blocoGuardado(codigoFalso)
  return rotas(codigoFalso)
    .filter(r => !FORA_POR_DESENHO.includes(r.path))
    .filter(r => b === null || r.at < b.inicio || r.at > b.fim)
    .map(r => r.path)
}

const SAUDAVEL = `
  <Route path="/admin/login" element={<Login />} />
  <Route element={<RequireAdmin loginPath="/admin/login"><Layout /></RequireAdmin>}>
    <Route path="/admin" element={<Dash />} />
    <Route path="/admin/usuarios" element={<Users />} />
  </Route>
`

describe('as rotas do painel — os sensores', () => {
  it('SENSOR INVERSO — o arranjo correto NÃO é acusado', () => {
    // Sem este par, uma régua que acusasse tudo passaria em todos os sensores abaixo.
    expect(avaliar(SAUDAVEL)).toEqual([])
  })

  it('SENSOR — a régua ACUSA uma rota movida para DEPOIS do bloco', () => {
    // A mutação exata que a verificação independente fez, e que a suíte inteira do painel deixou
    // passar com 2328 testes verdes.
    const doente = SAUDAVEL.replace(
      '    <Route path="/admin/usuarios" element={<Users />} />\n',
      '',
    ).replace('  </Route>', '  </Route>\n  <Route path="/admin/usuarios" element={<Users />} />')

    expect(avaliar(doente)).toEqual(['/admin/usuarios'])
  })

  it('SENSOR — a régua ACUSA uma rota movida para ANTES do bloco', () => {
    const doente = SAUDAVEL.replace(
      '    <Route path="/admin/usuarios" element={<Users />} />\n',
      '',
    ).replace(
      '  <Route element={',
      '  <Route path="/admin/usuarios" element={<Users />} />\n  <Route element={',
    )

    expect(avaliar(doente)).toEqual(['/admin/usuarios'])
  })

  it('SENSOR — o `RequireAdmin` SUMINDO derruba o recorte, e tudo é acusado', () => {
    // O pior caso possível: o bloco deixa de existir. Um guarda que devolvesse "bloco vazio"
    // aprovaria o painel inteiro desguarnecido.
    const doente = SAUDAVEL.replace('<RequireAdmin loginPath="/admin/login">', '<>').replace(
      '</RequireAdmin>',
      '</>',
    )

    expect(blocoGuardado(semComentarios(doente))).toBeNull()
    expect(avaliar(doente)).toEqual(['/admin', '/admin/usuarios'])
  })

  it('SENSOR — comentário que MENCIONA uma rota não conta como rota', () => {
    // A régua procura declaração, nunca menção. O `App.tsx` real explica em comentário por que
    // `/admin/home/:sectionId` não entra em `navGroups`.
    const comProsa = SAUDAVEL.replace(
      '  </Route>',
      '  {/* path="/admin/inventada" fica fora de propósito */}\n  </Route>',
    )

    expect(avaliar(comProsa)).toEqual([])
  })

  it('SENSOR — o removedor de comentário fecha com CRLF e com LF', () => {
    expect(semComentarios('// nada\r\nconst a = 1').trim()).toBe('const a = 1')
    expect(semComentarios('// nada\nconst a = 1').trim()).toBe('const a = 1')
  })
})
