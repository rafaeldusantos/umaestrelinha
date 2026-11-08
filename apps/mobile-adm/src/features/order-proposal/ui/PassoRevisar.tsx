import { useId, type ReactNode } from 'react'
import { formatPrice } from '@estrelinha/core/formatters'
import { ORDER_ADMIN_NOTE_MAX, adminNoteLength } from '@estrelinha/core/orders'
import { PICKUP_METHOD_NAME } from '@estrelinha/core/shipping'
import { maskPhone } from '@estrelinha/core/validators'
import type { ShippingQuote } from '@estrelinha/supabase/types'

import FotoDaPeca from '@/shared/ui/FotoDaPeca'
import { AVISO_DE_ERRO, ROTULO } from '@/shared/ui/campo'

import {
  DESCONTO_COMBINADO,
  FRETE_GRATIS,
  PROMOCAO,
  RESUMO_NAO_CONFERIDO,
  TENTAR_DE_NOVO,
  TOTAL,
  cupomNoResumo,
  linhaDoPix,
  menos,
  subtotalDasPecas,
  type CupomAplicado,
} from '../model/descontos'
import type { EnderecoDigitado, EstadoDaMontagem, NumeroDoPasso } from '../model/montagem'
import {
  ALTERAR,
  CLIENTE_DA_REVISAO,
  COTACAO_FALHOU,
  COTANDO,
  ENDERECO_NO_LINK,
  ENTREGA_DA_REVISAO,
  FICHA_NOVA,
  GRATIS,
  NOTA_DA_OBSERVACAO,
  OBSERVACAO_DA_MONTAGEM,
  PREVIA_DO_FRETE,
  SEM_EMAIL,
  SEM_ENTREGA_PARA_O_CEP,
  SEM_TELEFONE_NA_REVISAO,
  alterar,
  detalheDaLinha,
  prazoDaOpcao,
} from '../model/revisao'
import { pecasNaSacola, tituloDaSacola } from '../model/sacola'
import { useRetiradaDaRevisao } from '../model/useCotacaoDaRevisao'
import type { ResumoDaMontagemNaTela } from '../model/useResumoDaMontagem'

export interface PassoRevisarProps {
  estado: EstadoDaMontagem
  /** O endereço da entrega já resolvido; `null` = a cliente preenche no link. */
  endereco: EnderecoDigitado | null
  resumo: ResumoDaMontagemNaTela
  cupom: CupomAplicado | null
  /** A prévia do frete: só com CEP de 8 dígitos e rua (`pronta`). */
  cotacao: { pronta: boolean; carregando: boolean; falhou: boolean; opcoes: ShippingQuote[] | undefined }
  /** A falha da criação (a frase), no topo; `null` sem falha. */
  erroDaCriacao: string | null
  /** "Os preços ficam travados…" — a nota acima do botão. */
  nota: string
  aoAlterar: (passo: NumeroDoPasso) => void
  aoMudarObservacao: (texto: string) => void
}

const ROTULO_DO_CARTAO = 'font-body text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft'

const Cartao = ({ titulo, passo, aoAlterar, children }: { titulo: string; passo: NumeroDoPasso; aoAlterar: (p: NumeroDoPasso) => void; children: ReactNode }) => (
  <section aria-label={titulo} data-bloco-da-revisao={passo} className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h2 className={ROTULO_DO_CARTAO}>{titulo}</h2>
      <button
        type="button"
        aria-label={alterar(titulo)}
        onClick={() => aoAlterar(passo)}
        className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-estrelinha-primary underline underline-offset-4"
      >
        {ALTERAR}
      </button>
    </div>
    <div className="mt-2 space-y-2">{children}</div>
  </section>
)

const Linha = ({ rotulo, valor, testId }: { rotulo: string; valor: string; testId: string }) => (
  <div data-testid={testId} className="flex items-baseline justify-between gap-3 text-sm">
    <dt className="min-w-0 break-words text-estrelinha-ink-soft">{rotulo}</dt>
    <dd className="shrink-0 tabular-nums text-estrelinha-ink">{valor}</dd>
  </div>
)

const linhaDoEndereco = (e: EnderecoDigitado): string =>
  `${[e.rua, e.numero, e.complemento].filter((p) => p && p.trim() !== '').join(', ')} — ${e.bairro}, ${e.cidade}/${e.uf} · ${e.cep}`

/**
 * O passo 4 da montagem — a conferência final antes de gravar, na ordem: as PEÇAS primeiro (cada uma
 * com a foto da variação; a conferência é visual) com o resumo do servidor; a cliente; a entrega com a
 * prévia do frete (só com CEP de 8 dígitos e rua — quem escolhe a entrega é a cliente, no link); e a
 * observação interna, opcional. Cada bloco tem "Alterar", que volta ao passo dele. Nada é gravado aqui:
 * o botão é da barra da página.
 */
const PassoRevisar = ({ estado, endereco, resumo, cupom, cotacao, erroDaCriacao, nota, aoAlterar, aoMudarObservacao }: PassoRevisarProps) => {
  const id = useId()
  const s = resumo.previa?.summary ?? null
  const cadastrada = estado.modo === 'cadastrada' && estado.cliente !== null
  const nome = cadastrada ? (estado.cliente.name ?? '') : estado.contato.nome
  const email = cadastrada ? estado.cliente.email : estado.contato.email
  const telefone = cadastrada ? (estado.cliente.phone ?? '') : estado.contato.whatsapp
  const freteGratis = s?.coupon_free_shipping === true
  // A retirada não é cotação (não passa pelo Melhor Envio): entra na prévia ao lado das opções.
  const retirada = useRetiradaDaRevisao(endereco, cotacao.pronta)
  const opcoes = cotacao.opcoes ?? []

  return (
    <section aria-label="Revisar" className="space-y-4">
      {erroDaCriacao && (
        <p role="alert" data-testid="erro-da-criacao" className={AVISO_DE_ERRO}>
          {erroDaCriacao}
        </p>
      )}

      <Cartao titulo={tituloDaSacola(pecasNaSacola(estado.pecas))} passo={2} aoAlterar={aoAlterar}>
        <ul aria-label="Peças do pedido" className="space-y-3">
          {estado.pecas.map((l) => (
            <li key={l.chave} data-testid="peca-da-revisao" className="flex items-start gap-3">
              <FotoDaPeca foto={l.foto} tamanho={56} altura={70} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium [overflow-wrap:anywhere]">{l.nome}</p>
                <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{detalheDaLinha(l)}</p>
              </div>
              <p className="shrink-0 text-sm tabular-nums">{formatPrice(l.preco * l.quantidade)}</p>
            </li>
          ))}
        </ul>
        {resumo.falhou && (
          <div className={AVISO_DE_ERRO}>
            <p>{RESUMO_NAO_CONFERIDO}</p>
            <button type="button" onClick={resumo.tentarDeNovo} className="mt-1 min-h-11 font-medium underline">
              {TENTAR_DE_NOVO}
            </button>
          </div>
        )}
        {s && (
          <dl aria-label="Resumo" aria-busy={resumo.conferindo || undefined} className="space-y-1.5 border-t border-estrelinha-line pt-3">
            <Linha testId="revisao-subtotal" rotulo={subtotalDasPecas(pecasNaSacola(estado.pecas))} valor={formatPrice(s.subtotal + s.promotion_discount)} />
            {s.promotion_discount > 0 && <Linha testId="revisao-promocao" rotulo={PROMOCAO} valor={menos(s.promotion_discount)} />}
            {cupom && s.coupon_applied && (s.coupon_free_shipping || s.coupon_discount > 0) && (
              <Linha testId="revisao-cupom" rotulo={cupomNoResumo(cupom.codigo)} valor={s.coupon_free_shipping ? FRETE_GRATIS : menos(s.coupon_discount)} />
            )}
            {s.manual_discount > 0 && <Linha testId="revisao-combinado" rotulo={DESCONTO_COMBINADO} valor={menos(s.manual_discount)} />}
            <div data-testid="revisao-total" className="flex items-baseline justify-between gap-3 border-t border-estrelinha-line pt-2 text-base font-semibold text-estrelinha-ink">
              <dt>{TOTAL}</dt>
              <dd className="shrink-0 tabular-nums">{formatPrice(s.items_total)}</dd>
            </div>
          </dl>
        )}
        {resumo.previa?.items_pix && (
          <p data-testid="revisao-pix" className="text-sm text-estrelinha-ink-soft">
            {linhaDoPix(resumo.previa.items_pix.total, resumo.previa.items_pix.percent)}
          </p>
        )}
      </Cartao>

      <Cartao titulo={CLIENTE_DA_REVISAO} passo={1} aoAlterar={aoAlterar}>
        <p className="text-base font-medium [overflow-wrap:anywhere]">{nome}</p>
        <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{email.trim() || SEM_EMAIL}</p>
        <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{telefone.trim() ? maskPhone(telefone) : SEM_TELEFONE_NA_REVISAO}</p>
        {estado.modo === 'nova' && (
          <p data-testid="ficha-nova" className="inline-block rounded-sm bg-estrelinha-ground-deep px-2 py-1 text-xs font-medium text-estrelinha-ink">
            {FICHA_NOVA}
          </p>
        )}
      </Cartao>

      <Cartao titulo={ENTREGA_DA_REVISAO} passo={1} aoAlterar={aoAlterar}>
        <p data-testid="entrega-da-revisao" className="text-sm [overflow-wrap:anywhere]">
          {endereco ? linhaDoEndereco(endereco) : ENDERECO_NO_LINK}
        </p>
        {cotacao.pronta && (
          <div data-testid="previa-do-frete" aria-live="polite" className="space-y-1.5 border-t border-estrelinha-line pt-3">
            {cotacao.carregando ? (
              <p className="text-sm text-estrelinha-ink-soft">{COTANDO}</p>
            ) : (
              <>
                {cotacao.falhou && <p className="text-sm text-estrelinha-ink">{COTACAO_FALHOU}</p>}
                {!cotacao.falhou && opcoes.length === 0 && !retirada && (
                  <p className="text-sm text-estrelinha-ink-soft">{SEM_ENTREGA_PARA_O_CEP}</p>
                )}
                {((!cotacao.falhou && opcoes.length > 0) || retirada) && (
                  <ul aria-label="Opções de entrega" className="space-y-1.5">
                    {!cotacao.falhou &&
                      opcoes.map((q) => (
                        <li key={q.id} data-testid="opcao-de-entrega" className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                          <span className="min-w-0 [overflow-wrap:anywhere]">
                            {q.name} · {prazoDaOpcao(q)}
                          </span>
                          <span className="shrink-0 tabular-nums">{freteGratis ? GRATIS : formatPrice(Number.parseFloat(q.price))}</span>
                        </li>
                      ))}
                    {retirada && (
                      <li data-testid="opcao-de-entrega" className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block">{PICKUP_METHOD_NAME}</span>
                          <span className="block text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">{retirada}</span>
                        </span>
                        <span className="shrink-0">{GRATIS}</span>
                      </li>
                    )}
                  </ul>
                )}
              </>
            )}
            <p className="text-xs text-estrelinha-ink-soft">{PREVIA_DO_FRETE}</p>
          </div>
        )}
      </Cartao>

      <div className="space-y-1">
        <label htmlFor={`${id}-observacao`} className={ROTULO}>
          {OBSERVACAO_DA_MONTAGEM}
        </label>
        <textarea
          id={`${id}-observacao`}
          rows={3}
          value={estado.observacao}
          onChange={(e) => aoMudarObservacao(e.target.value)}
          aria-describedby={`${id}-nota-da-observacao`}
          className="w-full rounded-md border border-estrelinha-field bg-estrelinha-surface p-3 text-base text-estrelinha-ink"
        />
        <div className="flex flex-wrap justify-between gap-x-3 text-xs text-estrelinha-ink-soft">
          <p id={`${id}-nota-da-observacao`}>{NOTA_DA_OBSERVACAO}</p>
          <p className="tabular-nums">
            {adminNoteLength(estado.observacao)} / {ORDER_ADMIN_NOTE_MAX}
          </p>
        </div>
      </div>

      <p data-testid="nota-da-revisao" className="text-sm text-estrelinha-ink-soft">
        {nota}
      </p>
    </section>
  )
}

export default PassoRevisar
