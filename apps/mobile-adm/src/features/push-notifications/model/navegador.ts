/**
 * O que o app pergunta ao navegador sobre o Web Push (feature `79`). Um lugar só, lido pela tela
 * (`usePushNoAparelho`) e pelo "Sair" (`pararAvisosDesteAparelho`).
 */
type Registro = { pushManager: PushManager }
type ContainerDoWorker = { ready: Promise<Registro>; getRegistration: () => Promise<Registro | undefined> }

const container = () => navigator.serviceWorker as unknown as ContainerDoWorker

/** O navegador oferece Web Push? (`MAN-13`) */
export const temSuporteAPush = (): boolean =>
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  typeof window !== 'undefined' &&
  'PushManager' in window &&
  'Notification' in window

/**
 * A inscrição deste navegador, ou `null`. Lida por `getRegistration()`, e NÃO pelo `ready`: sem o
 * worker instalado o `ready` nunca resolve, e o "Sair" ficaria pendurado esperando por ele.
 */
export const inscricaoDesteNavegador = async (): Promise<PushSubscription | null> => {
  if (!temSuporteAPush()) return null
  const registro = await container().getRegistration()
  if (!registro) return null
  return registro.pushManager.getSubscription()
}

/** O registro ATIVO do worker — o único que pode inscrever (`subscribe`). */
export const registroPronto = (): Promise<Registro> => container().ready

/** Desfaz a inscrição do navegador sem deixar a falha dele esconder o desfecho principal. */
export const desfazerNoNavegador = async (inscricao: PushSubscription | null): Promise<void> => {
  try {
    await inscricao?.unsubscribe()
  } catch {
    // O navegador não desinscreveu. A linha do servidor já não existe (ou nunca existiu), e o 410 do
    // envio seguinte a apagaria de todo modo (`MAN-04`).
  }
}
