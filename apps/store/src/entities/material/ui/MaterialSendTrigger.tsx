import { useEffect, useRef } from 'react'
import { ChevronRight } from 'lucide-react'
import { requiresMaterial } from '@estrelinha/core/material'
import type { Product } from '@estrelinha/supabase/types'
import { useMaterialDrawerStore } from '../model/materialDrawerStore'

/**
 * "Como enviar seu material de DNA" — o caminho para a gaveta, na coluna de informação da página do
 * produto (feature `44`, artboard `A · O gatilho`).
 *
 * **Ela diz que EXISTE material; nunca diz QUAL.** A distinção é a feature inteira. O card que saiu
 * desta página em 2026-09-11 anunciava `material_kinds`, e `material_kinds` diz menos que a
 * descrição (`BL-015`): há peça gravada com `{cinzas}` cuja descrição enumera cinco materiais. Quem
 * responde "qual é o seu material" é a **cliente**, dentro da gaveta, e por isso o rótulo e o apoio
 * aqui são genéricos de propósito. `semMaterialNaPaginaDoProduto.test.ts` continua recusando as sete
 * formas que nomeiam material na página; o que ele passou a aceitar é só o interruptor booleano.
 *
 * Mora em `entities/material/ui` e não em `widgets/` porque quem a renderiza é `ProductInfo`, que é
 * `entities` — e `entities` não importa de `widgets`. O cross-import na mesma camada tem precedente
 * direto: `ProductCard.tsx` importa `cartUiStore` de `entities/cart`.
 *
 * **A peça que não exige material não ganha linha nenhuma.** `requires_material` tem três estados, e
 * `null` significa "nunca decidido" — o marcador que deixa o importador semear sem apagar a
 * curadoria da dona. `requiresMaterial()` trata `null` como `false`, que é a leitura certa: convidar
 * a enviar material numa peça que não pede é pior do que não convidar.
 */
interface Props {
  product: Product
}

const MaterialSendTrigger = ({ product }: Props) => {
  const openDrawer = useMaterialDrawerStore(s => s.openDrawer)
  const open = useMaterialDrawerStore(s => s.open)
  const ref = useRef<HTMLButtonElement>(null)
  const estavaAberta = useRef(false)

  /**
   * `GAV-22` — o foco volta para esta linha quando a gaveta fecha.
   *
   * **A devolução automática do Radix não serve aqui**, e foi medido: o `Dialog` restaura o foco
   * para o elemento que estava ativo na montagem, mas esta gaveta não é aberta por um
   * `SheetTrigger` — ela é comandada por store, e o caminho de volta se perde. Sem isto, quem
   * navega por teclado fecha a gaveta e reaparece no `<body>`, tendo de percorrer a página inteira
   * de novo para voltar ao ponto em que estava.
   *
   * Refocar em qualquer fechamento (X, véu, Escape) é o comportamento certo **porque há uma linha
   * por página** — ela é a única porta da gaveta, então todo fechamento veio dela.
   */
  useEffect(() => {
    if (estavaAberta.current && !open) ref.current?.focus()
    estavaAberta.current = open
  }, [open])

  if (!requiresMaterial(product)) return null

  return (
    /* `min-h-[64px]` e não `TAP_44`: o auxiliar existe para **crescer** o alvo de um controle menor
       que 44px, e um pseudo de 44×44 centrado dentro de uma linha de 64px de altura e largura cheia
       declararia uma área de toque menor do que a que já existe. */
    <button
      ref={ref}
      type="button"
      onClick={openDrawer}
      // Diz que isto abre um diálogo, e se ele está aberto. Sem os dois, quem usa leitor de tela
      // ouve "botão" e não sabe que houve mudança de contexto — a gaveta abre num portal, longe
      // deste ponto do DOM.
      aria-haspopup="dialog"
      aria-expanded={open}
      data-testid="material-send-trigger"
      className="mt-4 flex min-h-[64px] w-full items-center gap-3 rounded-md border border-estrelinha-line bg-estrelinha-ground px-3.5 py-3 text-left transition-colors hover:border-estrelinha-field hover:bg-estrelinha-ground-deep"
    >
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-estrelinha-serenity"
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-estrelinha-primary"
        >
          <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" />
          <path d="M3 8.5 12 13l9-4.5" />
          <path d="M12 13v7" />
        </svg>
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold leading-5 text-estrelinha-ink">
          Como enviar seu material de DNA
        </span>
        <span className="text-[13px] leading-[17px] text-estrelinha-ink-soft">
          Passo a passo, vídeo e quantidade certa
        </span>
      </span>

      <ChevronRight aria-hidden className="h-[18px] w-[18px] shrink-0 text-estrelinha-ink-soft" />
    </button>
  )
}

export default MaterialSendTrigger
