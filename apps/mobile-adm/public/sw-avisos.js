/*
 * O aviso de pedido no celular (feature 79, design §4.5; MAN-03, MAN-22, MAN-31).
 *
 * Carregado pelo service worker do PWA por importScripts (pwa.config.ts). JS puro, sem build: o
 * worker do workbox o lê do mesmo endereço, e o vercel.json o serve sem cache.
 *
 * O que ele NÃO faz, de propósito: nenhuma ida à rede, nenhum cache, nenhum acesso à sessão. O
 * aviso chega pronto do servidor (título, corpo, tag e o caminho do pedido); o worker só o mostra e,
 * no toque, abre o app nesse caminho. swSemDadosDaLoja.test.ts recusa as duas palavras proibidas.
 */

/* global self, clients */

var ICONE = '/icons/icon-192.png'

/** Só caminho do próprio app: começa com UMA barra. Qualquer outro vira a Início. */
function caminhoInterno(url) {
  return typeof url === 'string' && url.charAt(0) === '/' && url.charAt(1) !== '/' && url.charAt(1) !== '\\' ? url : '/'
}

function lerAviso(event) {
  if (!event.data) return null
  try {
    var dado = event.data.json()
    return dado && typeof dado === 'object' ? dado : null
  } catch (e) {
    return null
  }
}

// MAN-22: mostra SEMPRE, inclusive com o app aberto e visível — nada de silenciar em primeiro plano.
self.addEventListener('push', function (event) {
  var aviso = lerAviso(event)
  if (!aviso || typeof aviso.title !== 'string') return
  event.waitUntil(
    self.registration.showNotification(aviso.title, {
      body: typeof aviso.body === 'string' ? aviso.body : '',
      tag: typeof aviso.tag === 'string' ? aviso.tag : undefined,
      icon: ICONE,
      data: { url: caminhoInterno(aviso.url) },
    }),
  )
})

// MAN-03: o toque abre o pedido — na janela do app que já está aberta, ou numa nova.
self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  var url = caminhoInterno(event.notification.data && event.notification.data.url)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (janelas) {
      var janela = janelas[0]
      if (!janela) return clients.openWindow(url)
      // navigate() rejeita numa janela que este worker não controla: aí abre uma nova.
      return Promise.resolve(janela.focus())
        .then(function () {
          return janela.navigate(url)
        })
        .catch(function () {
          return clients.openWindow(url)
        })
    }),
  )
})
