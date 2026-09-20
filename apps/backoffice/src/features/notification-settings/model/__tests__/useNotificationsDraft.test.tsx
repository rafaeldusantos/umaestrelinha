// @vitest-environment jsdom
//
// L-030 — `useNotificationsDraft` chama `useNotificationSettings`/`useMaterialSettings`/
// `useUpdateSettings`, que são hooks REAIS do React Query (não dublados aqui): um `renderHook` sem
// `QueryClientProvider` por baixo derruba com "No QueryClient set", mesmo com a produção correta.
// Molde de `packages/core/src/hooks/__tests__/useStoreSettings.test.ts`: mocka só o client do
// Supabase, e deixa os hooks de settings rodarem de verdade.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS, notificationDraftRefusal } from '@estrelinha/core/notifications'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'

const { selectMock, upsertMock } = vi.hoisted(() => ({ selectMock: vi.fn(), upsertMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: selectMock, upsert: upsertMock }) },
}))

import { useNotificationsDraft } from '../useNotificationsDraft'

const rows = (data: Array<{ key: string; value: unknown }>) => {
  selectMock.mockResolvedValue({ data, error: null })
}

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  })
  return { client, Wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children) }
}

/** Monta o hook já com a leitura resolvida — a maioria dos casos não precisa ver o estado "carregando". */
async function mount(fixture: Array<{ key: string; value: unknown }>) {
  rows(fixture)
  const { client, Wrapper } = makeWrapper()
  const { result, unmount } = renderHook(
    () => ({ query: useStoreSettings(), notif: useNotificationsDraft() }),
    { wrapper: Wrapper },
  )
  await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
  return { result, client, Wrapper, unmount }
}

const materialRow = (street: string) => ({
  key: 'material',
  value: { recipient: 'Adri', street, number: '10', complement: '', neighborhood: '', city: '', state: '', zip: '', notes: '' },
})

beforeEach(() => {
  selectMock.mockReset()
  upsertMock.mockReset()
  upsertMock.mockResolvedValue({ error: null })
})

describe('useNotificationsDraft — inicialização', () => {
  it('o draft nasce do estado RESOLVIDO do servidor (evento gravado sobrescreve o default)', async () => {
    const gravado = {
      events: {
        ...DEFAULT_NOTIFICATIONS.events,
        pix_expired: {
          email: { enabled: true, fields: { ...DEFAULT_NOTIFICATIONS.events.pix_expired.email.fields, subject: 'PIX expirado — editado pela Adri' } },
        },
      },
      post_delivery_days: DEFAULT_NOTIFICATIONS.post_delivery_days,
    }
    const { result } = await mount([{ key: 'notifications', value: gravado }])

    await waitFor(() => expect(result.current.notif.draft.pix_expired.fields.subject).toBe('PIX expirado — editado pela Adri'))
    expect(result.current.notif.draft.pix_expired.enabled).toBe(true)
    // Evento não tocado no banco continua no default — não deixa de vir na leitura.
    expect(result.current.notif.draft.order_received.fields.subject).toBe(
      DEFAULT_NOTIFICATIONS.events.order_received.email.fields.subject,
    )
  })

  it('sem linha `notifications` no banco, o draft nasce de DEFAULT_NOTIFICATIONS', async () => {
    const { result } = await mount([{ key: 'general', value: { store_name: 'Uma Estrelinha' } }])
    await waitFor(() => expect(result.current.notif.draft.order_received).toBeDefined())
    expect(result.current.notif.draft.order_received.fields).toEqual(DEFAULT_NOTIFICATIONS.events.order_received.email.fields)
    expect(result.current.notif.draft.material_instructions.enabled).toBe(false)
  })
})

describe('useNotificationsDraft — ABN-12: edição não salva é descartada, sem apagar rascunho em curso', () => {
  it('uma releitura do servidor NÃO sobrescreve edição pendente (isDirty)', async () => {
    const { result, client } = await mount([{ key: 'general', value: {} }])

    act(() => {
      result.current.notif.setField('order_paid', 'subject', 'Assunto editado à mão')
    })
    expect(result.current.notif.isDirty).toBe(true)
    expect(result.current.notif.draft.order_paid.fields.subject).toBe('Assunto editado à mão')

    // Simula um refetch chegando no meio da edição (staleTime, foco de janela, etc.).
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['store_settings'] })
    })

    // O rascunho continua com a edição — não foi apagado pela releitura.
    expect(result.current.notif.draft.order_paid.fields.subject).toBe('Assunto editado à mão')
  })

  it('remontar (sair da aba sem salvar e voltar) mostra o ÚLTIMO ESTADO SALVO, não o rascunho perdido', async () => {
    const { result, unmount, Wrapper } = await mount([{ key: 'general', value: {} }])

    act(() => {
      result.current.notif.setField('order_paid', 'subject', 'Rascunho que não vai ser salvo')
    })
    expect(result.current.notif.draft.order_paid.fields.subject).toBe('Rascunho que não vai ser salvo')

    unmount()

    // Reabre a aba: novo componente, novo hook, mesma leitura do servidor.
    const { result: result2 } = renderHook(() => useNotificationsDraft(), { wrapper: Wrapper })
    await waitFor(() =>
      expect(result2.current.draft.order_paid.fields.subject).toBe(DEFAULT_NOTIFICATIONS.events.order_paid.email.fields.subject),
    )
  })
})

describe('useNotificationsDraft — ABN-08: o gate de material só bloqueia quando LIGADO', () => {
  it('material_instructions ligado + endereço vazio → recusa nomeando a seção (CFG-20)', async () => {
    const gravado = {
      events: {
        ...DEFAULT_NOTIFICATIONS.events,
        material_instructions: { email: { enabled: true, fields: { ...DEFAULT_NOTIFICATIONS.events.material_instructions.email.fields } } },
      },
      post_delivery_days: DEFAULT_NOTIFICATIONS.post_delivery_days,
    }
    const { result } = await mount([{ key: 'notifications', value: gravado }, materialRow('')])
    await waitFor(() => expect(result.current.notif.draft.material_instructions.enabled).toBe(true))

    const recusa = result.current.notif.refusalFor('material_instructions')
    expect(recusa).not.toBeNull()
    // `CFG-20` — a recusa nomeia a SEÇÃO como ela aparece na tela. Até a feature 55 ela apontava
    // para uma das oito abas, e as abas deixaram de existir: a Adri leria isto exatamente quando
    // está travada, e sairia procurando uma tela que não existe mais.
    //
    // (A frase velha não é escrita aqui de propósito: `semAbaEmConfiguracoes.test.ts` varre este
    // arquivo, e prosa que cita a forma proibida quebra o guarda que existe para impedi-la.)
    //
    // `toMatch(/Material/)` sozinho continuaria passando com a frase antiga — as duas contêm a
    // palavra. A asserção precisa dos dois lados: o nome novo presente, e a palavra "aba" ausente.
    expect(recusa).toContain('seção Frete e Material')
    expect(recusa).not.toMatch(/(?:^|\s)aba(?![-\wà-ú])/i)
  })

  it('material_instructions ligado + endereço PREENCHIDO → sem recusa de gate', async () => {
    const gravado = {
      events: {
        ...DEFAULT_NOTIFICATIONS.events,
        material_instructions: { email: { enabled: true, fields: { ...DEFAULT_NOTIFICATIONS.events.material_instructions.email.fields } } },
      },
      post_delivery_days: DEFAULT_NOTIFICATIONS.post_delivery_days,
    }
    const { result } = await mount([{ key: 'notifications', value: gravado }, materialRow('Rua das Flores')])
    await waitFor(() => expect(result.current.notif.draft.material_instructions.enabled).toBe(true))

    expect(result.current.notif.refusalFor('material_instructions')).toBeNull()
  })

  it('material_instructions DESLIGADO + endereço vazio → sem recusa (pode digitar, só não pode LIGAR)', async () => {
    const { result } = await mount([{ key: 'general', value: {} }, materialRow('')])
    await waitFor(() => expect(result.current.notif.draft.material_instructions.enabled).toBe(false))

    expect(result.current.notif.refusalFor('material_instructions')).toBeNull()
  })
})

describe('useNotificationsDraft — refusalFor DELEGA para notificationDraftRefusal (prova indireta de ABN-11)', () => {
  it('a recusa de variável/tom/limite é a MESMA string que a função de core devolveria para o mesmo rascunho', async () => {
    const { result } = await mount([{ key: 'general', value: {} }])

    act(() => {
      result.current.notif.setField('order_paid', 'lead', 'Corra, é imperdível!')
    })

    const esperado = notificationDraftRefusal('order_paid', 'email', result.current.notif.draft.order_paid.fields)
    expect(esperado).not.toBeNull()
    expect(result.current.notif.refusalFor('order_paid')).toBe(esperado)
  })
})

describe('useNotificationsDraft — canSave', () => {
  it('é true quando os 15 eventos passam (estado inicial, todo default limpo)', async () => {
    const { result } = await mount([{ key: 'general', value: {} }])
    await waitFor(() => expect(result.current.notif.draft.order_received).toBeDefined())
    expect(result.current.notif.canSave).toBe(true)
  })

  it('cai para false quando QUALQUER UM dos 15 tem refusalFor não-nulo, e só aquele evento recusa', async () => {
    const { result } = await mount([{ key: 'general', value: {} }])

    act(() => {
      result.current.notif.setField('order_delivered', 'lead', 'Corra, últimas unidades!')
    })

    expect(result.current.notif.canSave).toBe(false)
    expect(result.current.notif.refusalFor('order_delivered')).not.toBeNull()
    expect(result.current.notif.refusalFor('order_paid')).toBeNull()
  })
})

describe('useNotificationsDraft — save()', () => {
  it('recusa salvar (sem chamar upsert) quando canSave é false', async () => {
    const { result } = await mount([{ key: 'general', value: {} }])
    act(() => {
      result.current.notif.setField('order_delivered', 'lead', 'Corra!')
    })

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.notif.save()
    })

    expect(ok).toBe(false)
    expect(upsertMock).not.toHaveBeenCalled()
  })

  it('salva com sucesso: grava a chave `notifications` com os 17 eventos e limpa isDirty', async () => {
    const { result } = await mount([{ key: 'general', value: {} }])

    act(() => {
      result.current.notif.setField('order_paid', 'subject', 'Assunto novo da Adri')
    })
    expect(result.current.notif.isDirty).toBe(true)

    let ok: boolean | undefined
    await act(async () => {
      ok = await result.current.notif.save()
    })

    expect(ok).toBe(true)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    const [payload] = upsertMock.mock.calls[0]
    expect(payload.key).toBe('notifications')
    expect(Object.keys(payload.value.events)).toHaveLength(17)
    expect(payload.value.events.order_paid.email.fields.subject).toBe('Assunto novo da Adri')
    expect(result.current.notif.isDirty).toBe(false)
  })
})
