import { useEffect, useState } from 'react'

/** O título do documento enquanto a tela está na frente: a aba de trás não está à vista. */
export const TITULO_SEM_CONEXAO = 'Sem conexão · Ateliê'
import { WifiOff } from 'lucide-react'

/**
 * Sem conexão (feature 72, `MAF-19`). O service worker entrega só a casca: esta tela não mostra
 * dado nenhum, nem de cache — dado de dinheiro desatualizado é pior que ausente (`AD-056`).
 *
 * "Tentar de novo" relê `navigator.onLine`. Se a rede voltou, o evento `online` já teria tirado o
 * app daqui; o botão existe para quando ela continua fora, e então diz isso em vez de não fazer nada.
 */
const OfflineScreen = () => {
  const [aindaSemRede, setAindaSemRede] = useState(false)

  // Paper cut do reteste de QA: com esta tela na frente, o título seguia o da aba de trás. Não há o
  // que devolver ao sair: com a rede de volta o app remonta, e cada tela escreve o próprio título.
  useEffect(() => {
    document.title = TITULO_SEM_CONEXAO
  }, [])

  const tentar = () => {
    if (navigator.onLine) {
      window.dispatchEvent(new Event('online'))
      return
    }
    setAindaSemRede(true)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-estrelinha-ground px-4 text-center text-estrelinha-ink">
      <WifiOff aria-hidden="true" className="h-8 w-8 text-estrelinha-ink-soft" />
      {/* A frase É o título: um "Sem conexão" acima de outra frase que começa com "Sem conexão"
          repetia a notícia (visto em navegador). Ela nasce numa região viva ASSERTIVA (`MAF-30`):
          quando a rede cai com o app aberto, a tela troca inteira, e sem o anúncio o leitor de tela
          ficava mudo — ela só descobria passando o dedo. */}
      <div role="alert" aria-live="assertive">
        <h1 className="max-w-xs text-lg leading-snug">Sem conexão. Os dados da loja aparecem quando a internet voltar.</h1>
      </div>
      <button
        type="button"
        onClick={tentar}
        className="min-h-12 rounded-sm bg-estrelinha-primary px-6 text-sm font-medium text-estrelinha-on-primary"
      >
        Tentar de novo
      </button>
      <p role="status" className="min-h-5 text-sm text-estrelinha-ink-soft">
        {aindaSemRede ? 'Ainda sem conexão.' : ''}
      </p>
    </main>
  )
}

export default OfflineScreen
