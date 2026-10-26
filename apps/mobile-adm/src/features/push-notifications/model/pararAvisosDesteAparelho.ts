import { desinscrever } from '../api/portaDeAvisos'
import { desfazerNoNavegador, inscricaoDesteNavegador } from './navegador'

export type DesfechoDoParar = 'sem-inscricao' | 'parado' | 'falhou'

/**
 * Parar os avisos DESTE aparelho (feature `79`, design §4.5; `MAN-15`, `MAN-30`). Usado pela tela de
 * avisos e pelo "Sair" do menu da conta — um dono só para "parar", senão a tela e o menu divergiriam.
 *
 * - sem suporte ou sem inscrição no navegador ⇒ `'sem-inscricao'`, **sem** chamada à porta (o "Sair"
 *   de hoje, sem chamada a mais — `MAN-30`);
 * - com inscrição: primeiro a PORTA (`desinscrever`), depois o navegador (`unsubscribe()`) ⇒
 *   `'parado'`;
 * - a porta falhando ⇒ `'falhou'`, e o `unsubscribe()` do navegador **não** é chamado: a linha do
 *   servidor continua, então o aparelho não pode fingir que parou (o menu pergunta antes de sair).
 *
 * A recusa de papel da porta (`recusa()`, `42501`) é RELANÇADA, como em toda porta do app: quem chama
 * decide (a tela a passa à vigia da `72`; o menu da conta, ao sair, encerra a sessão).
 */
export const pararAvisosDesteAparelho = async (): Promise<DesfechoDoParar> => {
  const inscricao = await inscricaoDesteNavegador().catch(() => null)
  if (!inscricao) return 'sem-inscricao'

  const r = await desinscrever(inscricao.endpoint)
  if (r.tipo !== 'ok') return 'falhou'

  await desfazerNoNavegador(inscricao)
  return 'parado'
}
