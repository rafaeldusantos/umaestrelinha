import { create } from 'zustand'

/**
 * A gaveta "Como enviar seu material" — abertura e material escolhido (feature `44`).
 *
 * Mesmo molde do `cartUiStore`, e pelos mesmos dois motivos:
 *
 * 1. **Quem abre e quem desenha estão em camadas diferentes.** O gatilho vive em
 *    `entities/material/ui` porque quem o renderiza é `ProductInfo`, que é `entities` e não pode
 *    importar de `widgets`. A gaveta é `widgets/material-drawer`. O estado no meio precisa morar
 *    numa camada que as duas alcancem.
 * 2. **`useState` na página não sobreviveria.** O `Sheet` do Radix **desmonta o conteúdo ao fechar**
 *    — é isso que faz o vídeo parar de tocar, e queremos manter —, então um estado dentro da gaveta
 *    perderia a escolha da cliente a cada fechamento. `GAV-15` exige o contrário.
 *
 * **Sem `persist`, de propósito.** O material escolhido é contexto de uma visita, não preferência da
 * pessoa: gravá-lo em `localStorage` faria a gaveta abrir meses depois já respondendo sobre cinzas
 * para quem voltou por outro motivo. E a regra de chave nova volta a valer no primeiro cliente real
 * (`CLAUDE.md`) — criar uma agora é dívida sem contrapartida.
 *
 * **`anchor` é `string`, não `MaterialKind`, e isso não é preguiça de tipo**: dois destinos do guia
 * (`unhas` e `sangue-desidratado`) não são `MaterialKind`. Tipar por `MaterialKind` deixaria dois
 * chips sem estado possível de representar.
 */
interface MaterialDrawerState {
  open: boolean
  /** A âncora do material escolhido — a MESMA de `ATALHOS_DE_MATERIAL`. `null` = nenhum ainda. */
  anchor: string | null
  openDrawer: () => void
  /**
   * O ÚNICO caminho de fechamento, e é de propósito.
   *
   * A primeira escrita deste store tinha também um `closeDrawer()`, e a verificação independente
   * mostrou que **nenhuma tela o chamava**: o X, o Escape e o toque no véu passam todos pelo
   * `onOpenChange` do `Sheet`, que é este `setDrawerOpen`. Dois caminhos de fechamento com um
   * consumidor só é a mesma sobra de `deleteSection` na feature `41` — exportado, testado e morto,
   * com o risco de os dois divergirem no dia em que alguém ligar o segundo.
   */
  setDrawerOpen: (open: boolean) => void
  setAnchor: (anchor: string) => void
}

export const useMaterialDrawerStore = create<MaterialDrawerState>((set) => ({
  open: false,
  anchor: null,
  openDrawer: () => set({ open: true }),
  // Fechar NÃO limpa `anchor`: é exatamente o que `GAV-15` pede.
  setDrawerOpen: (open) => set({ open }),
  setAnchor: (anchor) => set({ anchor }),
}))
