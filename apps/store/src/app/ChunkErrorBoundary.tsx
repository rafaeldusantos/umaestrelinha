import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * O que a cliente vê quando um pedaço da loja não termina de baixar — `PRF-10`, edge case da spec.
 *
 * Com as rotas em `React.lazy`, abrir uma página passa a depender de uma requisição que pode falhar:
 * rede que cai no meio, túnel, ou — o caso mais comum e o mais invisível — **um deploy novo enquanto
 * a aba está aberta**. Os arquivos têm hash no nome, então o chunk que a página antiga vai pedir
 * simplesmente não existe mais no servidor. O `import()` rejeita, o React desmonta a árvore, e sem
 * este limite o resultado é **tela branca**, sem mensagem e sem caminho de volta.
 *
 * Recarregar resolve, porque a recarga busca o `index.html` novo com os hashes novos. Por isso o
 * botão é `location.reload()` e não um "tentar de novo" que repetiria o mesmo `import()` morto.
 *
 * Fica **acima** do `Suspense`: o erro nasce dentro dele, e um limite irmão não o pegaria.
 */

interface Props {
  children: ReactNode
}

interface State {
  falhou: boolean
}

class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { falhou: false }

  static getDerivedStateFromError(): State {
    return { falhou: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sem serviço de erro no projeto (`BL-001` é a infraestrutura que falta): o console é o que há,
    // e é onde a dona consegue ler quando reproduzir no computador dela.
    console.error('Falha ao carregar um pedaço da loja', error, info.componentStack)
  }

  render() {
    if (!this.state.falhou) return this.props.children

    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center"
      >
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-estrelinha-ink md:text-[38px]">
            Não conseguimos carregar esta página
          </h1>
          <p className="mx-auto max-w-[420px] text-[16px] leading-relaxed text-estrelinha-ink-soft">
            A conexão falhou no meio do caminho. Recarregar costuma resolver, e nada do seu carrinho
            se perde.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-sm bg-estrelinha-primary px-[30px] py-[15px] font-display text-[16px] font-semibold text-white transition-transform hover:scale-[1.02]"
        >
          Recarregar a página
        </button>
      </div>
    )
  }
}

export default ChunkErrorBoundary
