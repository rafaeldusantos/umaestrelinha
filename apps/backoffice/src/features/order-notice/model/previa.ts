// Feature `88` · `AVS-22` — "Ver o e-mail": a prévia daquele evento, com o pedido de verdade, numa aba
// nova. Nada é gravado e o diálogo continua aberto.
//
// A prévia é a porta que já existe (`send-notification?action=preview`, feature `53`) — a mesma
// função que envia renderiza, então o que a Adri vê é o que a cliente receberia.
//
// A aba é aberta ANTES da ida ao servidor: aberta depois de um `await`, o navegador a trataria como
// janela não pedida e a bloquearia. O HTML entra num `<iframe sandbox>` (sem scripts, sem a origem do
// painel), nunca escrito direto no documento da aba — que é da mesma origem do painel logado.

import type { NotificationEvent } from '@estrelinha/core/notifications'
import { previewNotification } from '@/features/notification-settings'

export async function abrirPrevia(event: NotificationEvent, orderId: string): Promise<void> {
  const aba = window.open('', '_blank')
  if (!aba) return
  aba.opener = null
  const doc = aba.document
  doc.title = 'Prévia do e-mail'
  doc.body.textContent = 'Gerando a prévia…'

  const r = await previewNotification({ event, draft: {}, orderId })

  doc.body.textContent = ''
  if ('error' in r) {
    doc.body.textContent = r.error
    return
  }
  doc.title = r.subject
  const quadro = doc.createElement('iframe')
  quadro.setAttribute('sandbox', '')
  quadro.setAttribute('title', r.subject)
  quadro.srcdoc = r.html
  quadro.style.cssText = 'border:0;width:100%;height:100vh;display:block'
  doc.body.style.margin = '0'
  doc.body.appendChild(quadro)
}
