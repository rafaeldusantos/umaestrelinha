// A montagem de um pedido sobre o `<App />` real e o supabase-js REAL (`src/test/clientReal.ts`): a busca
// de clientes e os endereços salvos da cliente escolhida. Molde de `clientesComClientReal.test.tsx`.
//
// O cenário a impedir: a RLS devolveria a uma conta SEM papel admin as linhas DELA, sem erro. Aqui
// `customer_list` e `addresses` respondem com os dados de uma cliente, e só a recusa de `atelie_clock`
// (403 `42501`) os barra. Rede caída é falha, nunca recusa.
process.env.TZ = 'UTC'

import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/app/App'
import { real, type RespostaRpcReal } from '@/test/clientReal'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA } from '@/shared/ui/leitura'
import { conferirResumo, lerCotacao, salvarMontado, type CorpoDoSave } from '@/features/order-proposal'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

const RPC_RELOGIO = '/rest/v1/rpc/atelie_clock'
const CUSTOMER_LIST = '/rest/v1/customer_list'
const ADDRESSES = '/rest/v1/addresses'
const ROLES = '/rest/v1/user_roles'

const ID_DELA = '00000000-0000-4000-c094-000000000777'
const NOME_DELA = 'Clarice Sem Papel'
const EMAIL_DELA = 'clarice.sem.papel@exemplo.invalid'
const RUA_DELA = 'Rua Secreta da Clarice'
const DELA = new RegExp(`${NOME_DELA}|${EMAIL_DELA.replace(/\./g, '\\.')}|${RUA_DELA}`)

const ok = (corpo: unknown): RespostaRpcReal => ({ status: 200, corpo })
const RECUSA_403: RespostaRpcReal = { status: 403, corpo: { code: '42501', details: null, hint: null, message: 'acesso restrito ao painel' } }
const RELOGIO_OK: RespostaRpcReal = ok({ lido_em: '2026-11-07T12:00:00.123456+00:00' })

const TABELAS = {
  customer_list: ok([{ id: ID_DELA, name: NOME_DELA, email: EMAIL_DELA, phone: '51988887777', has_account: true, orders_total: 1 }]),
  addresses: ok([
    { id: 'e1', label: null, cep: '90010-000', street: RUA_DELA, number: '1', complement: null, neighborhood: 'Centro', city: 'Porto Alegre', state: 'RS', is_default: true, created_at: '2026-01-01T00:00:00Z' },
  ]),
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

/** A montagem aberta como "Montar pedido" a abre: a sentinela dos passos, que empilha o passo 1. */
const abrir = (relogio: RespostaRpcReal) => {
  const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc: { atelie_clock: relogio }, tabelas: TABELAS })
  window.history.pushState({ usr: { doApp: true, passoDaMontagem: 0 }, key: 'montar', idx: 0 }, '', '/pedidos/montar')
  render(<App />)
  return r
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('a busca de clientes da montagem, sobre o client real', () => {
  it('par: com o papel e a RPC em 200, a cliente aparece na busca — a régua "nenhum texto dela" tem alvo', async () => {
    const r = abrir(RELOGIO_OK)
    for (let i = 0; i < 60 && !document.body.textContent?.includes(NOME_DELA); i++) await andar(50)
    expect(document.body.textContent).toContain(NOME_DELA)
    expect(r.quantos(RPC_RELOGIO)).toBeGreaterThan(0)
    expect(r.quantos(CUSTOMER_LIST)).toBeGreaterThan(0)
  })

  it('conta sem papel: RPC 403 `42501` + a linha DELA do outro lado ⇒ a recusa, e nenhum dado dela em instante nenhum', async () => {
    // A conta abre com o papel conferido (sem ele o guarda nem monta a tela) e o perde quando a primeira
    // confirmação sai: a RPC recusa, e a conferência do papel também.
    const r = abrir(RECUSA_403)
    const instantes: string[] = [document.body.textContent ?? '']
    for (let i = 0; i < 60 && r.quantos(RPC_RELOGIO) === 0; i++) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    r.estado.papel = 'not-admin'
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(r.quantos(CUSTOMER_LIST)).toBeGreaterThan(0)
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })

  it('a RPC com a rede caída ⇒ falha de leitura, NUNCA a recusa, e nenhum dado dela', async () => {
    const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc: { atelie_clock: 'rede' }, tabelas: TABELAS })
    window.history.pushState({ usr: { doApp: true, passoDaMontagem: 0 }, key: 'montar', idx: 0 }, '', '/pedidos/montar')
    render(<App />)
    const instantes: string[] = []
    for (let feito = 0; feito < 5000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(r.quantos(ROLES)).toBe(1)
    expect(instantes.findIndex((t) => DELA.test(t))).toBe(-1)
  })
})

describe('os endereços salvos da cliente escolhida, sobre o client real', () => {
  it('par: escolhida com o papel de pé, o endereço salvo dela aparece', async () => {
    const r = abrir(RELOGIO_OK)
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: new RegExp(NOME_DELA) }); i++) await andar(50)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(NOME_DELA) }))
    for (let i = 0; i < 60 && !document.body.textContent?.includes(RUA_DELA); i++) await andar(50)
    expect(document.body.textContent).toContain(RUA_DELA)
    expect(r.quantos(ADDRESSES)).toBe(1)
  })

  it('conta sem papel na leitura dos endereços: RPC 403 `42501` ⇒ a recusa, e o endereço dela em instante nenhum', async () => {
    const r = abrir(RELOGIO_OK)
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: new RegExp(NOME_DELA) }); i++) await andar(50)
    r.estado.rpc.atelie_clock = RECUSA_403
    r.estado.papel = 'not-admin'
    fireEvent.click(screen.getByRole('button', { name: new RegExp(NOME_DELA) }))
    const instantes: string[] = []
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(r.quantos(ADDRESSES)).toBeGreaterThan(0)
    expect(instantes.findIndex((t) => t.includes(RUA_DELA))).toBe(-1)
  })
})

describe('a porta da leitura do texto colado, sobre o client real', () => {
  const FUNCTION_DA_LEITURA = '/functions/v1/customer-parse'
  const FORA_DO_AR = 'A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde.'
  const FORBIDDEN: RespostaRpcReal = { status: 403, corpo: { error: 'forbidden' } }

  /** Cliente nova, a folha aberta e um texto colado — pronto para "Ler o texto". */
  const prepararLeitura = async (leitura: RespostaRpcReal) => {
    const r = abrir(RELOGIO_OK)
    r.estado.functions = { 'customer-parse': leitura }
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: 'Cliente nova' }); i++) await andar(50)
    fireEvent.click(screen.getByRole('button', { name: 'Cliente nova' }))
    await andar(50)
    fireEvent.click(screen.getByRole('button', { name: 'Colar texto da conversa' }))
    await andar(50)
    fireEvent.change(screen.getByLabelText('Texto da conversa'), { target: { value: 'Oi, sou a Clarice' } })
    await andar(50)
    return r
  }
  const lerEObservar = async (ms: number) => {
    fireEvent.click(screen.getByRole('button', { name: 'Ler o texto' }))
    const instantes: string[] = [document.body.textContent ?? '']
    for (let feito = 0; feito < ms; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    return instantes
  }

  it('conta sem papel: a porta em 403 e `atelie_clock` 403 `42501` ⇒ a recusa, e a frase de falha em instante nenhum', async () => {
    const r = await prepararLeitura(FORBIDDEN)
    r.estado.rpc.atelie_clock = RECUSA_403
    r.estado.papel = 'not-admin'
    const instantes = await lerEObservar(4000)
    expect(r.quantos(FUNCTION_DA_LEITURA)).toBe(1)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes(FORA_DO_AR))).toBe(-1)
  })

  it('a porta em 403 com o relógio de pé ⇒ a falha da leitura, nunca a recusa', async () => {
    const r = await prepararLeitura(FORBIDDEN)
    await lerEObservar(2000)
    expect(r.quantos(FUNCTION_DA_LEITURA)).toBe(1)
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(FORA_DO_AR)
  })

  it('a rede caída na porta ⇒ a falha da leitura, sem perguntar o papel', async () => {
    const r = await prepararLeitura('rede')
    const relogioAntes = r.quantos(RPC_RELOGIO)
    await lerEObservar(2000)
    expect(r.quantos(FUNCTION_DA_LEITURA)).toBe(1)
    expect(r.quantos(RPC_RELOGIO)).toBe(relogioAntes)
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByRole('alert')).toHaveTextContent(FORA_DO_AR)
  })
})

describe('o catálogo do passo 2 · Peças, sobre o client real', () => {
  const PRODUCTS = '/rest/v1/products'
  const NOME_DA_JOIA = 'Joia Que Ninguém Deve Ver'
  const CATALOGO = {
    ...TABELAS,
    products: ok([{ id: '00000000-0000-4000-c094-000000000888', name: NOME_DA_JOIA, base_price: 100, capa: null, image_url: null, is_active: true, stock_policy: 'track', stock_total: 2, options: [] }]),
    product_variants: ok([]),
  }

  /** O passo 1 com a cliente escolhida e o endereço padrão — pronto para "Continuar". */
  const prontaParaAsPecas = async () => {
    const r = real.criar({ sessao: 'valida', papel: 'admin', cadastro: 'ok', rpc: { atelie_clock: RELOGIO_OK }, tabelas: CATALOGO })
    window.history.pushState({ usr: { doApp: true, passoDaMontagem: 0 }, key: 'montar', idx: 0 }, '', '/pedidos/montar')
    render(<App />)
    for (let i = 0; i < 60 && !screen.queryByRole('button', { name: new RegExp(NOME_DELA) }); i++) await andar(50)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(NOME_DELA) }))
    for (let i = 0; i < 60 && !document.body.textContent?.includes(RUA_DELA); i++) await andar(50)
    return r
  }

  it('conta sem papel na leitura do catálogo: RPC 403 `42501` ⇒ a recusa, e nenhuma peça em instante nenhum', async () => {
    const r = await prontaParaAsPecas()
    expect(r.quantos(PRODUCTS)).toBe(0)
    r.estado.rpc.atelie_clock = RECUSA_403
    r.estado.papel = 'not-admin'
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const instantes: string[] = [document.body.textContent ?? '']
    for (let feito = 0; feito < 4000; feito += 50) {
      await andar(50)
      instantes.push(document.body.textContent ?? '')
    }
    expect(r.quantos(PRODUCTS)).toBeGreaterThan(0)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes(NOME_DA_JOIA))).toBe(-1)
  })

  it('a RPC com a rede caída na leitura do catálogo ⇒ a falha do bloco, NUNCA a recusa', async () => {
    const r = await prontaParaAsPecas()
    r.estado.rpc.atelie_clock = 'rede'
    const papelAntes = r.quantos(ROLES)
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    for (let feito = 0; feito < 4000; feito += 50) await andar(50)
    expect(r.quantos(PRODUCTS)).toBeGreaterThan(0)
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(r.quantos(ROLES)).toBe(papelAntes)
    expect(document.body.textContent).not.toContain(NOME_DA_JOIA)
  })
})

describe('a porta da prévia do passo 3 · Descontos, sobre o client real', () => {
  // O passo 3 não se alcança por este arnês (o catálogo do passo 2 lê a contagem no cabeçalho
  // `Content-Range`, que o `fetch` falso não devolve): a prova aqui é a da PORTA que a tela chama, sobre
  // o supabase-js real. Que a recusa que ela lança leva a tela à vigia (no resumo vivo e no "Aplicar")
  // é provado pela página real, em `pages/__tests__/montarPedido.descontos.test.tsx`.
  const FUNCTION_DA_PREVIA = '/functions/v1/order-proposals'
  const FORBIDDEN: RespostaRpcReal = { status: 403, corpo: { error: 'forbidden' } }
  const ESCOLHA = {
    lines: [{ product_id: '00000000-0000-4000-c094-000000000999', variant_id: null, quantity: 1, engraving_text: null }],
    coupon_code: null,
    manual_discount: null,
    customer_email: EMAIL_DELA,
  }
  const criar = (previa: RespostaRpcReal, relogio: RespostaRpcReal | 'rede') =>
    real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: relogio },
      functions: { 'order-proposals': { porAcao: { preview: previa } } },
    })

  it('par: a prévia em 200 volta o resumo, pela ação literal `preview`, sem perguntar o papel', async () => {
    const r = criar(ok({ summary: { items_total: 120 }, coupon: null, manual_refusal: null, items_pix: null }), RELOGIO_OK)
    const resposta = await conferirResumo(ESCOLHA)
    expect(resposta).toMatchObject({ tipo: 'ok', dado: { summary: { items_total: 120 } } })
    const chamada = r.chamadas.find((c) => c.caminho === FUNCTION_DA_PREVIA)
    expect(chamada?.busca).toBe('?action=preview')
    expect(chamada?.corpo).toEqual(ESCOLHA)
    expect(r.quantos(RPC_RELOGIO)).toBe(0)
  })

  it('conta sem papel: a prévia em 403 e `atelie_clock` 403 `42501` ⇒ a recusa (lançada), não a falha', async () => {
    const r = criar(FORBIDDEN, RECUSA_403)
    const erro = await conferirResumo(ESCOLHA).then(
      () => null,
      (e: unknown) => e,
    )
    expect(isAccessDenied(erro)).toBe(true)
    expect(r.quantos(FUNCTION_DA_PREVIA)).toBe(1)
    expect(r.quantos(RPC_RELOGIO)).toBe(1)
  })

  it('a prévia em 403 com o relógio de pé ⇒ a falha, nunca a recusa', async () => {
    criar(FORBIDDEN, RELOGIO_OK)
    await expect(conferirResumo(ESCOLHA)).resolves.toMatchObject({ tipo: 'falhou' })
  })

  it('a rede caída na prévia ⇒ a falha, sem perguntar o papel', async () => {
    const r = criar('rede', RELOGIO_OK)
    await expect(conferirResumo(ESCOLHA)).resolves.toMatchObject({ tipo: 'falhou' })
    expect(r.quantos(RPC_RELOGIO)).toBe(0)
  })
})

describe('a gravação do passo 4 (`save`), sobre o client real', () => {
  // Como a prévia acima: a prova é a da PORTA que "Criar link" chama, sobre o supabase-js real. Que a
  // recusa leva a tela à vigia (no "Criar link" e na prévia do frete), e que a falha diz "nada foi
  // enviado", é provado pela página real, em `pages/__tests__/montarPedido.revisar.test.tsx`
  // (describe "a conta que perde o papel no passo 4").
  const FUNCTION_DO_SAVE = '/functions/v1/order-proposals'
  const FORBIDDEN: RespostaRpcReal = { status: 403, corpo: { error: 'forbidden' } }
  const CORPO: CorpoDoSave = {
    idempotency_key: 'chave-da-montagem',
    customer_id: ID_DELA,
    customer_name: NOME_DELA,
    customer_email: EMAIL_DELA,
    customer_phone: null,
    customer_document: null,
    address_zip: '90010000',
    address_street: RUA_DELA,
    address_number: '1',
    address_complement: null,
    address_neighborhood: 'Centro',
    address_city: 'Porto Alegre',
    address_state: 'RS',
    lines: [{ product_id: '00000000-0000-4000-c094-000000000999', variant_id: null, quantity: 1, engraving_text: null }],
    coupon_code: null,
    manual_discount: null,
    expected_total: 120,
    admin_note: null,
    save_address: true,
  }
  const criar = (save: RespostaRpcReal | 'rede', relogio: RespostaRpcReal | 'rede') =>
    real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: relogio },
      functions: { 'order-proposals': { porAcao: { save: save as RespostaRpcReal } } },
    })

  it('par: o `save` em 200 volta a proposta, pela ação literal `save`, com o corpo inteiro e sem perguntar o papel', async () => {
    const r = criar(ok({ id: 'p1', number: 'P-0050', version: 1, created: true, token: 't', expires_at: '2026-11-14T12:00:00Z' }), RELOGIO_OK)
    await expect(salvarMontado(CORPO)).resolves.toMatchObject({ tipo: 'ok', dado: { id: 'p1', token: 't' } })
    const chamada = r.chamadas.find((c) => c.caminho === FUNCTION_DO_SAVE)
    expect(chamada?.busca).toBe('?action=save')
    expect(chamada?.corpo).toEqual(CORPO)
    expect(r.quantos(RPC_RELOGIO)).toBe(0)
  })

  it('conta sem papel: o `save` em 403 e `atelie_clock` 403 `42501` ⇒ a recusa (lançada), não a falha', async () => {
    const r = criar(FORBIDDEN, RECUSA_403)
    const erro = await salvarMontado(CORPO).then(
      () => null,
      (e: unknown) => e,
    )
    expect(isAccessDenied(erro)).toBe(true)
    expect(r.quantos(FUNCTION_DO_SAVE)).toBe(1)
    expect(r.quantos(RPC_RELOGIO)).toBe(1)
  })

  it('o `save` em 403 com o relógio de pé ⇒ a falha, nunca a recusa', async () => {
    criar(FORBIDDEN, RELOGIO_OK)
    await expect(salvarMontado(CORPO)).resolves.toMatchObject({ tipo: 'falhou' })
  })

  it('o preço mudado (409 `prices_changed`) volta como erro com a frase da function, nunca como recusa', async () => {
    const r = criar({ status: 409, corpo: { error: 'Os preços mudaram enquanto você montava. Confira o resumo.', code: 'prices_changed', summary: { items_total: 132 } } }, RELOGIO_OK)
    await expect(salvarMontado(CORPO)).resolves.toMatchObject({
      tipo: 'erro',
      slug: 'prices_changed',
      frase: 'Os preços mudaram enquanto você montava. Confira o resumo.',
    })
    expect(r.quantos(RPC_RELOGIO)).toBe(0)
  })

  it('a rede caída no `save` ⇒ a falha, sem perguntar o papel', async () => {
    const r = criar('rede', RELOGIO_OK)
    await expect(salvarMontado(CORPO)).resolves.toMatchObject({ tipo: 'falhou' })
    expect(r.quantos(RPC_RELOGIO)).toBe(0)
  })
})

describe('a prévia do frete do passo 4 (a cotação), sobre o client real', () => {
  // A cotação é pública na function: quem recusa a conta sem papel é a confirmação que sai junto da
  // leitura (`lerComPapel`, `atelie_clock` ⇒ `42501`).
  const FUNCTION_DA_COTACAO = '/functions/v1/melhor-envio'
  const CORPO = { postal_code_to: '90010000', products: [{ id: 'p', width: 11, height: 2, length: 16, weight: 0.1, insurance_value: 120, quantity: 1 }] }
  const OPCOES = [{ id: 1, name: 'PAC', company: 'Correios', price: '20.00', delivery_time: 5 }]
  const criar = (cotacao: RespostaRpcReal | 'rede', relogio: RespostaRpcReal | 'rede') =>
    real.criar({
      sessao: 'valida',
      papel: 'admin',
      cadastro: 'ok',
      rpc: { atelie_clock: relogio },
      functions: { 'melhor-envio': { porAcao: { quote: cotacao as RespostaRpcReal } } },
    })

  it('par: com o papel de pé, as opções voltam, pela ação literal `quote`, com o corpo da cotação', async () => {
    const r = criar(ok(OPCOES), RELOGIO_OK)
    await expect(lerCotacao(CORPO)).resolves.toEqual(OPCOES)
    const chamada = r.chamadas.find((c) => c.caminho === FUNCTION_DA_COTACAO)
    expect(chamada?.busca).toBe('?action=quote')
    expect(chamada?.corpo).toEqual(CORPO)
    expect(r.quantos(RPC_RELOGIO)).toBe(1)
  })

  it('conta sem papel: a cotação em 200 e `atelie_clock` 403 `42501` ⇒ a recusa, e nenhuma opção', async () => {
    criar(ok(OPCOES), RECUSA_403)
    const erro = await lerCotacao(CORPO).then(
      () => null,
      (e: unknown) => e,
    )
    expect(isAccessDenied(erro)).toBe(true)
  })

  it('a rede caída na cotação ⇒ a falha, nunca a recusa', async () => {
    criar('rede', RELOGIO_OK)
    const erro = await lerCotacao(CORPO).then(
      () => null,
      (e: unknown) => e,
    )
    expect(erro).toBeInstanceOf(Error)
    expect(isAccessDenied(erro)).toBe(false)
  })

  it('a rede caída na confirmação ⇒ a falha, nunca a recusa', async () => {
    criar(ok(OPCOES), 'rede')
    const erro = await lerCotacao(CORPO).then(
      () => null,
      (e: unknown) => e,
    )
    expect(erro).not.toBeNull()
    expect(isAccessDenied(erro)).toBe(false)
  })
})
