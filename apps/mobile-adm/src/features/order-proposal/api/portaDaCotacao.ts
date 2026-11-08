import { supabase } from '@estrelinha/supabase/client'
import type { ShippingQuote } from '@estrelinha/supabase/types'

import { invocar, traduzir, type RespostaDaPorta } from '@/shared/api/traduzir'

/**
 * A porta da prévia do frete da montagem: o app fala com a edge function `melhor-envio` SÓ por aqui,
 * com o nome LITERAL `'melhor-envio?action=quote'` — a mesma cotação que a loja e o painel chamam, com o
 * corpo montado por `toQuoteProducts` (`core/shipping`, dono único do seguro por unidade). O molde é
 * `portaDePropostas.ts`.
 *
 * - **A tradução é a das portas** (`shared/api/traduzir.ts`): rede é falha, nunca recusa; só o `42501`
 *   de `conferirPapel` é recusa. A cotação em si é pública na function, então quem confere o papel é a
 *   leitura que a chama (`lerComPapel`, em `model/useCotacaoDaRevisao.ts`).
 * - **Nada fica**: só leitura, e a resposta vive no cache da tela.
 */
export const cotarFrete = async (corpo: { postal_code_to: string; products: unknown[] }): Promise<RespostaDaPorta<ShippingQuote[]>> =>
  traduzir(await invocar(() => supabase.functions.invoke('melhor-envio?action=quote', { body: corpo })))
