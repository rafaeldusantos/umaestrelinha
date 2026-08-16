// Feature 30 · GSH-17 — a ordem do cutover, como DADO.
//
// A sequência não é decoração de tela: **errá-la custa o catálogo.** Enquanto a fonte `Content API`
// da Nuvemshop estiver viva na conta `685367464`, ela e o nosso feed disputam os mesmos `offer_id`
// no mesmo rótulo `BR`. E ligar o feed antes de o DNS apontar para a loja nova publicaria 3.233
// links que ainda respondem pela loja antiga.
//
// Fica em `lib/` e não dentro do JSX porque é conteúdo verificável: o teste conta os passos e assere
// a ordem, e um passo perdido numa refatoração de layout quebra ali em vez de sumir da tela.

export interface CutoverStep {
  /** Onde a ação acontece — a dona precisa saber que aba abrir. */
  onde: 'DNS' | 'Aqui' | 'Nuvemshop' | 'Merchant Center'
  titulo: string
  detalhe: string
}

export const CUTOVER_STEPS: readonly CutoverStep[] = [
  {
    onde: 'DNS',
    titulo: 'Aponte umaestrelinha.com.br para a loja nova',
    detalhe:
      'Os 3.233 links do feed apontam para este domínio. Ligar antes da virada publicaria endereços que ainda respondem pela loja antiga.',
  },
  {
    onde: 'Aqui',
    titulo: 'Ligue a integração nesta tela',
    detalhe: 'Enquanto estiver desligada, o endereço do feed responde 404 e o Google não recebe nada.',
  },
  {
    onde: 'Nuvemshop',
    titulo: 'Desconecte o app Google na Nuvemshop',
    detalhe:
      'É ele que alimenta a conta hoje, pela Content API. Enquanto estiver conectado, as duas fontes disputam os mesmos produtos.',
  },
  {
    onde: 'Merchant Center',
    titulo: 'Exclua a fonte de dados “Content API”',
    detalhe:
      'Em Configurações › Fontes de dados. Sem excluir, os produtos dela ficam vivos por até 30 dias e colidem com os do feed novo.',
  },
  {
    onde: 'Merchant Center',
    titulo: 'Crie uma busca agendada apontando para o endereço do feed',
    detalhe: 'Brasil, Português, rótulo BR — as mesmas configurações da fonte que você acabou de excluir.',
  },
]

/**
 * O endereço público do feed.
 *
 * Sai da origem da loja, e não de uma constante própria: o caminho é o `source` do rewrite no
 * `apps/store/vercel.json`, e escrever o host à mão aqui daria um segundo lugar para errar.
 */
export const FEED_PATH = '/feeds/google-shopping.xml'

export const feedUrl = (origin: string | null): string | null =>
  origin ? `${origin.replace(/\/+$/, '')}${FEED_PATH}` : null
