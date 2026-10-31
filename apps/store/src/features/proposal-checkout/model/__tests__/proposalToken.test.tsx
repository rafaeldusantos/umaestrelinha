import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PROPOSAL_TOKEN_KEY, forgetProposalToken, takeProposalToken } from '../proposalToken'

// Feature 89 · T23 — SEG-02: o token vem SÓ do fragmento, é guardado em `sessionStorage` e apagado
// da barra de endereço. Que nenhum `page_view` o carrega é provado pelo `PageViewTracker` REAL, em
// `app/__tests__/pageViewSemFragmento.test.tsx`.

const TOKEN = 'b64url_TokenDeTeste-0123456789abcdefABCDEF'

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('takeProposalToken (SEG-02)', () => {
  it('lê o fragmento, guarda na sessionStorage e o apaga da barra', () => {
    window.history.replaceState({ key: 'k1' }, '', `/pedido-montado?utm_source=wa#${TOKEN}`)
    expect(takeProposalToken()).toBe(TOKEN)
    expect(sessionStorage.getItem(PROPOSAL_TOKEN_KEY)).toBe(TOKEN)
    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain(TOKEN)
    // A query e o estado do router sobrevivem.
    expect(window.location.pathname + window.location.search).toBe('/pedido-montado?utm_source=wa')
    expect(window.history.state).toEqual({ key: 'k1' })
  })

  it('recarregar (sem fragmento) devolve o guardado', () => {
    window.history.replaceState(null, '', `/pedido-montado#${TOKEN}`)
    takeProposalToken()
    expect(takeProposalToken()).toBe(TOKEN)
  })

  it('um link novo substitui o guardado', () => {
    sessionStorage.setItem(PROPOSAL_TOKEN_KEY, 'antigo')
    window.history.replaceState(null, '', `/pedido-montado#${TOKEN}`)
    expect(takeProposalToken()).toBe(TOKEN)
    expect(sessionStorage.getItem(PROPOSAL_TOKEN_KEY)).toBe(TOKEN)
  })

  it('sem fragmento e sem guardado ⇒ null; a query nunca é fonte do token', () => {
    window.history.replaceState(null, '', `/pedido-montado?token=${TOKEN}`)
    expect(takeProposalToken()).toBeNull()
  })

  it('armazenamento que lança: o token do fragmento vale assim mesmo, e some da barra', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    window.history.replaceState(null, '', `/pedido-montado#${TOKEN}`)
    expect(takeProposalToken()).toBe(TOKEN)
    expect(window.location.hash).toBe('')
    set.mockRestore()
  })

  it('forgetProposalToken esquece', () => {
    sessionStorage.setItem(PROPOSAL_TOKEN_KEY, TOKEN)
    forgetProposalToken()
    expect(takeProposalToken()).toBeNull()
  })
})
