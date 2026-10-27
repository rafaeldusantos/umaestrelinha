import { useEffect } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'

import { AVISO_ACIMA_DA_BARRA, AVISO_ACIMA_DO_RODAPE, AVISO_NO_FIM } from '@/shared/ui/alturas'

import { limparAviso, useAviso } from '../model/avisos'
import { useHaRodape } from '../model/rodape'

/** Quanto a confirmação fica na tela (Q7, TQ9 — **n — confirmar**). */
export const PRAZO_DO_AVISO_MS = 5000

/**
 * A confirmação de uma ação (feature `75`, `MAA-31`, `MAA-33`..`MAA-35`, Q6, Q7; design §3.6).
 *
 * **Host ÚNICO**, montado no `MobileLayout` — dentro do `RequireAdmin`: a recusa desmonta o host, e
 * nenhuma confirmação aparece sobre ela (`MAA-21`/`MAA-23`). O texto vem pronto de
 * `actionConfirmation` (`core`, via `mostrarAviso`); este componente não escreve frase.
 *
 * - `role="status"`: anunciada sem tomar o foco. A região só existe COM aviso: o app já tem outra
 *   região `status` (o "Atualizando…" do puxar, `PullToRefresh`), e uma segunda, vazia e permanente,
 *   tornaria ambígua a leitura dela (as suítes da `73`/`74` a pedem por papel). A região entra JÁ com
 *   o texto, que é a forma que TalkBack e VoiceOver anunciam; a confirmação em leitor real fica com a
 *   prova em navegador e o QA.
 * - Some sozinha em 5 s. Uma nova SUBSTITUI a anterior e REINICIA o prazo — o efeito depende da
 *   `chave` do aviso, que muda a cada `mostrarAviso` mesmo com a mesma frase; e o prazo de um aviso
 *   velho não apaga o novo (`limparAviso(chave)`).
 * - Fica acima da barra de abas e, havendo, do rodapé da ação: as alturas são de `shared/ui/alturas`.
 * - O texto quebra (nada de `truncate`), e o aviso não se move: sem animação, não há o que reduzir.
 * - `pointer-events-none`: nada aqui se toca, e o aviso não pode roubar o toque do botão de baixo.
 */
/**
 * `comBarra`: a tela atual desenha a barra de abas? No detalhe do pedido e da cliente ela some
 * (protótipo, 2026-10-26), e o aviso desce: acima do rodapé quando há um, senão no fim da tela.
 */
const AvisoDaAcao = ({ comBarra = true }: { comBarra?: boolean }) => {
  const aviso = useAviso()
  const haRodape = useHaRodape()
  const chave = aviso?.chave ?? null

  useEffect(() => {
    if (chave === null) return
    const prazo = setTimeout(() => limparAviso(chave), PRAZO_DO_AVISO_MS)
    return () => clearTimeout(prazo)
  }, [chave])

  if (!aviso) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid="aviso-da-acao"
      className={cn('pointer-events-none fixed inset-x-0 z-40 px-4', haRodape ? AVISO_ACIMA_DO_RODAPE : comBarra ? AVISO_ACIMA_DA_BARRA : AVISO_NO_FIM)}
    >
      <div
        data-parte="cartao"
        className="mx-auto max-w-lg rounded-md bg-estrelinha-primary px-4 py-3 text-sm text-estrelinha-on-primary shadow-lg [overflow-wrap:anywhere]"
      >
        <p className="font-semibold">{aviso.titulo}</p>
        <p className="mt-0.5">{aviso.frase}</p>
      </div>
    </div>
  )
}

export default AvisoDaAcao
