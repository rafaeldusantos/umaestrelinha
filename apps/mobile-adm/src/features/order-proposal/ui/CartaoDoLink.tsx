import { LINK_WITHOUT_STORE, RENEW_WITHOUT_LINK_LABEL } from '@estrelinha/core/proposals'

import { nomeDoLinkExterno } from '@/shared/config/novaAba'

import { COPIAR_LINK, ENVIAR_PELO_WHATSAPP, LINK_SEM_CIFRA, MENSAGEM_DO_WHATSAPP, SEM_TELEFONE, linkPara, valeAte } from '../model/frases'

/**
 * O cartão escuro do link: o link da aberta, sempre que ele existe — também ao reabrir, sem
 * gerar um novo para copiar —, "Enviar pelo WhatsApp" (só com telefone que normaliza) e
 * "Copiar link"; e, ao lado, o cartão com a mensagem do WhatsApp escrita.
 *
 * - **Sem token** (a proposta gravada sem cifra, ou o servidor sem a chave): a frase e "Gerar link
 *   novo" (renovar é o único jeito de ter um link para mandar).
 * - **Sem a loja configurada** (`VITE_STORE_URL`): a frase `LINK_WITHOUT_STORE` de `core`.
 * - O WhatsApp é um link de verdade (`<a target="_blank">`), não um `window.open`: o navegador não o
 *   bloqueia, e o toque registra o envio.
 * - **O desenho é o do protótipo** (Montar Pedido, o pedido montado): sobretítulo de 11 px, a caixa do
 *   link com borda translúcida na fonte do corpo, o WhatsApp no verde da paleta com texto `ink` em
 *   display (ink sobre `whatsapp` passa de 4,5:1 — ao contrário do branco, que é por isso que o lembrete
 *   do pedido usa o verde-escuro), "Copiar link" translúcido sobre `ink`. Os tons sobre `ink` que o
 *   protótipo nomeia (`on-ink-border`, `on-ink-surface`) não existem no preset: são o branco a 12 % e a
 *   10 %, como em `AgoraNaLoja`.
 */
export type ConteudoDoLink =
  | { tipo: 'link'; link: string; mensagem: string; whatsapp: string | null; expiraEm: string }
  | { tipo: 'sem-token' }
  | { tipo: 'sem-loja' }

export interface CartaoDoLinkProps {
  nome: string | null
  conteudo: ConteudoDoLink
  travado: boolean
  aoEnviar: (canal: 'whatsapp' | 'copy') => void
  aoGerarLinkNovo: () => void
}

const CartaoDoLink = ({ nome, conteudo, travado, aoEnviar, aoGerarLinkNovo }: CartaoDoLinkProps) => (
  <>
    <section aria-labelledby="cartao-do-link" data-testid="cartao-do-link" className="space-y-3 rounded-lg bg-estrelinha-ink p-[18px] text-estrelinha-on-primary">
      <h2 id="cartao-do-link" className="font-body text-[11px] font-semibold uppercase tracking-[.1em] text-white/80 [overflow-wrap:anywhere]">
        {linkPara(nome)}
      </h2>
      {conteudo.tipo === 'sem-loja' && <p className="text-sm [overflow-wrap:anywhere]">{LINK_WITHOUT_STORE}</p>}
      {conteudo.tipo === 'sem-token' && (
        <>
          <p className="text-sm [overflow-wrap:anywhere]">{LINK_SEM_CIFRA}</p>
          <button
            type="button"
            aria-disabled={travado ? 'true' : undefined}
            onClick={() => {
              if (!travado) aoGerarLinkNovo()
            }}
            className="min-h-12 w-full rounded-sm bg-estrelinha-on-primary px-4 text-base font-medium text-estrelinha-ink aria-disabled:opacity-70"
          >
            {RENEW_WITHOUT_LINK_LABEL}
          </button>
        </>
      )}
      {conteudo.tipo === 'link' && (
        <>
          <p data-testid="o-link" className="rounded-md border border-white/[.12] bg-white/10 p-3 text-sm [overflow-wrap:anywhere]">
            {conteudo.link}
          </p>
          {conteudo.whatsapp ? (
            <a
              href={conteudo.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={nomeDoLinkExterno(ENVIAR_PELO_WHATSAPP)}
              onClick={() => aoEnviar('whatsapp')}
              className="flex min-h-12 w-full items-center justify-center rounded-sm bg-estrelinha-whatsapp px-4 py-2 text-center font-display text-[15px] font-bold text-estrelinha-ink [overflow-wrap:anywhere]"
            >
              {ENVIAR_PELO_WHATSAPP}
            </a>
          ) : (
            <p className="text-sm [overflow-wrap:anywhere]">{SEM_TELEFONE}</p>
          )}
          <button
            type="button"
            aria-disabled={travado ? 'true' : undefined}
            onClick={() => {
              if (!travado) aoEnviar('copy')
            }}
            className="min-h-12 w-full rounded-sm border border-white/[.12] bg-white/10 px-4 text-base font-medium text-estrelinha-on-primary aria-disabled:opacity-70"
          >
            {COPIAR_LINK}
          </button>
          <p className="text-[13px] font-light [overflow-wrap:anywhere]">{valeAte(conteudo.expiraEm)}</p>
        </>
      )}
    </section>
    {conteudo.tipo === 'link' && (
      <section aria-labelledby="mensagem-do-whatsapp" className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4">
        <h2
          id="mensagem-do-whatsapp"
          className="font-body text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft"
        >
          {MENSAGEM_DO_WHATSAPP}
        </h2>
        <p data-testid="mensagem-do-whatsapp" className="mt-2 whitespace-pre-line rounded-md bg-estrelinha-ground-deep p-3 text-sm [overflow-wrap:anywhere]">
          {conteudo.mensagem}
        </p>
      </section>
    )}
  </>
)

export default CartaoDoLink
