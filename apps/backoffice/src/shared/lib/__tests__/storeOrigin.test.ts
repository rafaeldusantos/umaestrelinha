// Feature 25 — a origem da loja, que é o `targetOrigin` do rascunho (`PRV-07`).
//
// Vale por si porque o modo de falhar é silencioso: uma origem errada faz o `postMessage` ser
// descartado pelo navegador **sem erro**, e a prévia fica parada mostrando a composição salva
// enquanto a dona digita. Ninguém vê exceção; ela só acha que "não atualiza".

import { afterEach, describe, expect, it, vi } from 'vitest'
import { storeOrigin } from '../storeOrigin'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

/**
 * O default de `storeOrigin(base = STORE_URL)` lê `import.meta.env` no carregamento do módulo, então
 * exercitá-lo com o módulo já importado **testa o `.env` da máquina**, não o código.
 *
 * Foi defeito real: `expect(storeOrigin(undefined)).toBeNull()` passava em quem não tinha
 * `VITE_STORE_URL` e falhava em quem tinha — e configurá-la é justamente o que o `CLAUDE.md` manda
 * fazer para acender a prévia. O teste dizia "sem env" e media outra coisa.
 *
 * Daí o env ser carimbado aqui e o módulo, reimportado. Os dois lados são asseverados: sem a
 * variável dá `null`, com ela o default a usa.
 */
const comEnv = async (valor: string | undefined) => {
  vi.stubEnv('VITE_STORE_URL', valor as string)
  vi.resetModules()
  return (await import('../storeOrigin')).storeOrigin
}

describe('storeOrigin — o default lê a env, e o teste controla a env', () => {
  it('sem `VITE_STORE_URL` devolve `null` — o painel segue funcionando sem a loja configurada', async () => {
    const semEnv = await comEnv('')
    expect(semEnv()).toBeNull()
  })

  it('com `VITE_STORE_URL` o default a usa, e devolve a origem dela', async () => {
    const comLoja = await comEnv('http://localhost:8082/admin?x=1')
    expect(comLoja()).toBe('http://localhost:8082')
  })

  it('com `VITE_STORE_URL` inválida devolve `null`, sem lançar', async () => {
    const quebrada = await comEnv('nao-e-uma-url')
    expect(quebrada()).toBeNull()
  })
})

describe('storeOrigin — só a origem, nunca o caminho', () => {
  it('descarta caminho, busca e âncora', () => {
    expect(storeOrigin('https://umaestrelinha.com.br/produtos/x?a=1#y')).toBe(
      'https://umaestrelinha.com.br',
    )
  })

  it('preserva a porta, que é o caso de dev', () => {
    expect(storeOrigin('http://localhost:8082')).toBe('http://localhost:8082')
    expect(storeOrigin('http://localhost:8082/')).toBe('http://localhost:8082')
  })

  it('base vazia devolve `null`', () => {
    // O caso do ARGUMENTO explícito, que não passa pelo default e por isso independe do ambiente.
    expect(storeOrigin('')).toBeNull()
  })

  it('valor inválido devolve `null` e NÃO lança — exceção aqui derrubaria /admin/home inteira', () => {
    expect(storeOrigin('nao-e-uma-url')).toBeNull()
    expect(() => storeOrigin('://quebrado')).not.toThrow()
    expect(storeOrigin('://quebrado')).toBeNull()
  })
})
