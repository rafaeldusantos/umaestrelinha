// A faixa de uma sugestão no bloco "Filtros da loja" — feature 67 (`VFL-29`, `VFL-30`).
//
// "Aceitar" só muda o estado do formulário: a gravação é a do "Salvar" do produto, como qualquer
// marcação. "Recusar" grava na hora (é a única escrita deste bloco fora do save), e por isso só
// existe para produto que já tem id — a recusa é de (peça, valor, alvo), e peça nova ainda não é peça.

import { Button } from '@estrelinha/ui/button'

interface Props {
  /** "Sugestão: <valor> — <motivo>", montado por quem tem o motivo (`suggestionReason`, de `core`). */
  texto: string
  /** O aviso da troca (`VFL-27`), quando aceitar tira a marcação da peça toda. */
  aviso?: string | null
  onAceitar: () => void
  onRecusar: () => void
  /** `false` em produto novo: não há peça para gravar a recusa. */
  podeRecusar: boolean
  recusando?: boolean
}

const SuggestionStrip = ({ texto, aviso, onAceitar, onRecusar, podeRecusar, recusando = false }: Props) => (
  <div
    data-testid="faixa-sugestao"
    className="flex flex-wrap items-center gap-3 rounded-xl bg-muted/60 px-3 py-2 text-sm text-foreground"
  >
    {/* D3 da prova em navegador: com `flex-1` (base 0) no celular, o texto encolhia a ~55px antes
        de o `flex-wrap` agir — os botões são `shrink-0` — e quebrava palavras ("Sugest/ão"). No
        celular ele ocupa a linha inteira (`w-full flex-none`) e os botões descem; a partir de `sm`
        volta a dividir a linha com eles, como antes. */}
    <div className="w-full min-w-0 flex-none sm:w-auto sm:flex-1">
      <p className="break-words">{texto}</p>
      {aviso && <p className="mt-1 text-xs font-medium text-estrelinha-admin-amber">{aviso}</p>}
      {!podeRecusar && <p className="mt-1 text-xs text-muted-foreground">Salve o produto para poder recusar.</p>}
    </div>
    <div className="flex shrink-0 gap-2">
      <Button type="button" variant="outline" className="h-11" disabled={!podeRecusar || recusando} onClick={onRecusar}>
        Recusar
      </Button>
      <Button type="button" className="h-11" onClick={onAceitar}>
        Aceitar
      </Button>
    </div>
  </div>
)

export default SuggestionStrip
