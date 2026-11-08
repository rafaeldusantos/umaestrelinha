import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { whatsappChatUrl } from '@estrelinha/core/notifications'
import { formatOrderNumber, formatShortDate } from '@estrelinha/core/orders'
import { proposalLink, proposalRenewText, proposalWhatsappText } from '@estrelinha/core/proposals'

import { montadosHref, montarPedidoHref, pedidoHref } from '@/entities/order'
import { useRecusaDePapel } from '@/features/access-check'
import { FolhaDaObservacao, publicarAlturaDoRodape, registrarRodape, useRecusaDaAcao } from '@/features/order-actions'
import {
  AGORA_NAO,
  CANCELAR_ESTE_PEDIDO,
  CANCELAR_FRASE,
  CANCELAR_PEDIDO,
  CLIENTE,
  CartaoDoLink,
  EDITAR,
  EDITAR_OBSERVACAO,
  FAIXA_CANCELADA,
  FRETE_NO_LINK,
  FolhaDeConfirmacao,
  HISTORICO,
  MANTER,
  NAO_ENCONTREI_O_MONTADO,
  OBSERVACAO_INTERNA,
  PRECOS_MUDARAM_CONFIRMAR,
  RENOVAR,
  SEM_OBSERVACAO,
  SeloDoMontado,
  TOTAL_DOS_ITENS,
  VOLTAR_PARA_MONTADOS,
  cancelarTitulo,
  documentoDoMontado,
  marcarEdicao,
  enderecoDoMontado,
  faixaConcluida,
  faixaExpirada,
  menos,
  nomeDaPeca,
  pecas,
  quantidade,
  renovarTitulo,
  rotuloDoEvento,
  subtituloDoMontado,
  totalNovo,
  tituloDoMontado,
  useAcoesDoMontado,
  useMontado,
  verOPedido,
  type ConteudoDoLink,
  type MontadoAchado,
} from '@/features/order-proposal'
import { origemDaLoja } from '@/shared/config/loja'
import { useFolhaNaEntrada } from '@/shared/lib/useFolhaNaEntrada'
import { RESERVA_DO_RODAPE, RODAPE_NO_FIM } from '@/shared/ui/alturas'
import { BOTAO_SECUNDARIO } from '@/shared/ui/campo'
import FotoDaPeca from '@/shared/ui/FotoDaPeca'
import PullToRefresh from '@/shared/ui/PullToRefresh'
import { FaixaDoTom } from '@/shared/ui/Selo'
import { FalhaDoBloco, LinhaDeFrescor, Traco } from '@/shared/ui/leitura'

const ROTULO_DO_CARTAO = 'font-body text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft'

const Cartao = ({ id, titulo, acao, children }: { id: string; titulo: string; acao?: ReactNode; children: ReactNode }) => (
  <section aria-labelledby={`montado-${id}`} data-cartao={id} className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4">
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h2 id={`montado-${id}`} className={ROTULO_DO_CARTAO}>
        {titulo}
      </h2>
      {acao}
    </div>
    <div className="mt-2">{children}</div>
  </section>
)

/** O voltar do cabeçalho: de dentro do app, volta; aberto direto, vai à visão Montados. */
const BotaoVoltar = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const doApp = (state as { doApp?: boolean } | null)?.doApp === true
  return (
    <button
      type="button"
      onClick={() => (doApp ? navigate(-1) : navigate(montadosHref(), { replace: true }))}
      aria-label={VOLTAR_PARA_MONTADOS}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-estrelinha-ink"
    >
      <ChevronLeft aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.5} />
    </button>
  )
}

/**
 * O rodapé fixo do pedido montado (a ação principal da concluída, "Ver o pedido #0262"): o MESMO
 * desenho e a mesma altura publicada do rodapé da ação do pedido (`RodapeDaAcao`), para o aviso subir
 * acima dele e a reserva no fim do conteúdo não deixar o Histórico por baixo.
 */
const RodapeDoMontado = ({ children }: { children: ReactNode }) => {
  const caixa = useRef<HTMLDivElement>(null)
  useEffect(() => registrarRodape(), [])
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    publicarAlturaDoRodape(el.getBoundingClientRect().height)
    if (typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(() => publicarAlturaDoRodape(el.getBoundingClientRect().height))
    observador.observe(el)
    return () => observador.disconnect()
  }, [])
  return (
    <>
      <div data-testid="reserva-do-rodape-do-montado" aria-hidden="true" className={`${RESERVA_DO_RODAPE} shrink-0`} />
      <div
        ref={caixa}
        data-testid="rodape-do-montado"
        className={`fixed inset-x-0 z-30 bg-estrelinha-surface px-4 pt-3 shadow-[0_-1px_0_0_theme(colors.estrelinha.line)] ${RODAPE_NO_FIM}`}
      >
        <div className="mx-auto max-w-lg">{children}</div>
      </div>
    </>
  )
}

/** O que o cartão do link desenha: o link (do renovar desta tela, senão do `get`), a falta da loja, ou a falta do token. */
const conteudoDoLink = (d: MontadoAchado, renovado: { token: string; expires_at: string } | null): ConteudoDoLink => {
  const token = renovado?.token ?? d.token
  const expiraEm = renovado?.expires_at ?? d.proposal.expires_at
  if (!token) return { tipo: 'sem-token' }
  const origem = origemDaLoja()
  if (!origem) return { tipo: 'sem-loja' }
  const link = proposalLink(origem, token)
  const mensagem = proposalWhatsappText({ name: d.proposal.customer_name, link, expiresAt: expiraEm })
  return { tipo: 'link', link, mensagem, whatsapp: whatsappChatUrl(d.proposal.customer_phone, mensagem), expiraEm }
}

/**
 * O pedido montado no app do ateliê (`/pedidos/montados/:id`, subrota da aba Pedidos, sem a
 * barra de abas). Compõe; a regra (estado, ações, link, mensagem, renovar) é de `core/proposals`, e a
 * leitura e as escritas vão pela porta da `order-proposals`.
 *
 * - **Uma leitura, uma confirmação de papel** (`useMontado` → `lerComPapel`): o `lido_em` é o relógio
 *   de "montado há 2 dias". `42501` ⇒ a vigia reconfere o papel e nenhum dado é desenhado, nem o do
 *   cache; a recusa de uma escrita entra na MESMA vigia.
 * - **O link** vem do `get` enquanto a proposta está aberta (ou do renovar desta tela, que vive só na
 *   memória dela). Sem token: "Gerar link novo" renova direto — o cartão já diz que o anterior para de
 *   funcionar, e a frase da folha de renovar ("O link venceu em…") não vale para a aberta. Sem a loja:
 *   `LINK_WITHOUT_STORE`.
 * - **As ações são as de `actions`** (`proposalActions`, do servidor): aberta ⇒ Cancelar; expirada ⇒
 *   Renovar prazo (a folha com `proposalRenewText`); concluída ⇒ "Ver o pedido #0262"; cancelada ⇒
 *   nenhuma. "Editar" (aberta ou vista) marca a proposta e abre a montagem, que chega preenchida pelo
 *   `get` e salva no mesmo link; o desfecho ("Alterações salvas.", "Link criado." com o link da
 *   criação) chega pelo aviso desta tela.
 * - **A observação interna** é editável em qualquer estado não concluído (a ação `note`).
 * - **As folhas moram no histórico** (`useFolhaNaEntrada`): o voltar do Android as fecha.
 */
const PedidoMontadoPage = () => {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const montado = useMontado(id)
  const acoes = useAcoesDoMontado(id)
  const recusaDaAcao = useRecusaDaAcao(acoes.erroBruto, montado.dataUpdatedAt)
  const recusada = useRecusaDePapel([montado.error, recusaDaAcao], !!montado.data && !montado.isError)
  const detalhe = recusada ? undefined : montado.data
  const naoAtualizou = !recusada && montado.isError && !!montado.data
  const falhou = recusada || (montado.isError && !montado.data)

  const folhaCancelar = useFolhaNaEntrada(`${id}:cancelar`)
  const folhaRenovar = useFolhaNaEntrada(`${id}:renovar`)
  const folhaObservacao = useFolhaNaEntrada(`${id}:observacao`)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const achado: MontadoAchado | null = detalhe && detalhe.tipo === 'achou' ? detalhe : null
  const p = achado?.proposal
  const titulo = tituloDoMontado(p?.number)
  // O título do documento é literal: nada do pedido montado vai ao histórico do navegador.
  useEffect(() => {
    document.title = 'Pedido montado · Ateliê'
  }, [])

  const abrirFolha = useCallback(
    (folha: { abrir: () => void }) => {
      acoes.limparErro()
      folha.abrir()
    },
    [acoes],
  )

  const estado = achado?.state
  const podeRenovar = !!achado?.actions?.renew
  const renovarExpirada = podeRenovar && estado === 'expired'

  return (
    <PullToRefresh onRefresh={() => montado.refetch()}>
      <div className="space-y-4">
        <header className="sticky top-0 z-10 -mx-4 -mt-4 flex min-h-[60px] flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-estrelinha-line bg-estrelinha-surface py-2 pl-2 pr-4">
          <BotaoVoltar />
          <div className="min-w-0 flex-[1_1_9rem]">
            <h1 className="font-display text-[17px] font-bold leading-tight [overflow-wrap:anywhere]">{titulo}</h1>
            {achado && p && (
              <p data-parte="subtitulo" className="text-xs text-estrelinha-ink-soft">
                {subtituloDoMontado(achado.state, p.created_at, p.expires_at, achado.lido_em)}
              </p>
            )}
          </div>
          {achado && (
            <div className="ml-auto min-w-0 max-w-full">
              <SeloDoMontado estado={achado.state} />
            </div>
          )}
        </header>

        {acoes.aviso && (
          <div role="status" data-testid="aviso-do-montado" className="rounded-md bg-estrelinha-ground-deep p-3 text-sm text-estrelinha-ink">
            <p className="font-medium">{acoes.aviso.titulo}</p>
            {acoes.aviso.texto && <p>{acoes.aviso.texto}</p>}
          </div>
        )}
        {acoes.erro && !folhaCancelar.aberta && !folhaRenovar.aberta && !folhaObservacao.aberta && (
          <p role="alert" className="rounded-md border border-estrelinha-alert/30 bg-estrelinha-alert-soft p-3 text-sm text-estrelinha-alert">
            {acoes.erro}
          </p>
        )}

        {falhou ? (
          <FalhaDoBloco
            tentarDeNovo={() => {
              void montado.refetch()
            }}
          />
        ) : !detalhe ? (
          <div data-testid="montado-carregando" aria-busy="true" className="space-y-3">
            <Traco className="h-40 w-full" />
            <Traco className="h-24 w-full" />
            <Traco className="h-32 w-full" />
          </div>
        ) : !achado || !p ? (
          <div className="space-y-3">
            <p className="text-sm text-estrelinha-ink">{NAO_ENCONTREI_O_MONTADO}</p>
            <Link to={montadosHref()} replace className="inline-flex min-h-11 items-center font-medium text-estrelinha-primary underline underline-offset-4">
              {VOLTAR_PARA_MONTADOS}
            </Link>
          </div>
        ) : (
          <>
            <LinhaDeFrescor naoAtualizou={naoAtualizou} />

            {(estado === 'open' || estado === 'viewed') && (
              <CartaoDoLink
                nome={p.customer_name}
                conteudo={conteudoDoLink(achado, acoes.linkRenovado)}
                travado={acoes.travado}
                aoEnviar={(canal) => {
                  const c = conteudoDoLink(achado, acoes.linkRenovado)
                  if (c.tipo === 'link') void acoes.enviar(canal, { link: c.link, nome: p.customer_name })
                }}
                aoGerarLinkNovo={() => {
                  acoes.limparErro()
                  void acoes.renovar()
                }}
              />
            )}
            {estado === 'completed' && (
              <FaixaDoTom tom="done" dados={{ 'data-testid': 'faixa-do-montado' }} className="rounded-md p-4 text-sm [overflow-wrap:anywhere]">
                {faixaConcluida(p.customer_name).antes}
                <strong>{formatOrderNumber(p.order_number)}</strong>
                {faixaConcluida(p.customer_name).depois}
              </FaixaDoTom>
            )}
            {estado === 'expired' && (
              <p data-testid="faixa-do-montado" className="rounded-lg bg-estrelinha-ground-deep p-4 text-sm text-estrelinha-ink [overflow-wrap:anywhere]">
                {faixaExpirada(p.expires_at)}
              </p>
            )}
            {estado === 'cancelled' && (
              <p data-testid="faixa-do-montado" className="rounded-lg bg-estrelinha-ground-deep p-4 text-sm text-estrelinha-ink [overflow-wrap:anywhere]">
                {FAIXA_CANCELADA}
              </p>
            )}

            <Cartao id="cliente" titulo={CLIENTE}>
              <p className="text-base font-medium [overflow-wrap:anywhere]">{p.customer_name}</p>
              <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{p.customer_email}</p>
              {p.customer_phone && <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{p.customer_phone}</p>}
              {documentoDoMontado(p) && (
                <p data-testid="documento-do-montado" className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">
                  {documentoDoMontado(p)}
                </p>
              )}
              <p data-testid="endereco-do-montado" className="mt-2 text-sm [overflow-wrap:anywhere]">
                {enderecoDoMontado(p)}
              </p>
            </Cartao>

            <Cartao id="pecas" titulo={pecas(p.items.reduce((n, i) => n + Number(i.quantity ?? 0), 0))}>
              <ul className="space-y-3">
                {p.items.map((item) => (
                  <li key={item.position} data-testid="peca-do-montado" className="flex items-start gap-3">
                    <FotoDaPeca foto={item.product_image} tamanho={48} altura={60} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium [overflow-wrap:anywhere]">
                        {[nomeDaPeca(item), quantidade(item.quantity)].join(' · ')}
                      </p>
                      <p className="text-sm tabular-nums text-estrelinha-ink-soft">{formatPrice(Number(item.unit_price) * Number(item.quantity))}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-estrelinha-line pt-3 text-sm">
                <div className="flex flex-wrap justify-between gap-x-3">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(p.subtotal)}</dd>
                </div>
                {Number(p.promotion_discount) > 0 && (
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <dt>Promoção</dt>
                    <dd className="tabular-nums">{menos(Number(p.promotion_discount))}</dd>
                  </div>
                )}
                {Number(p.coupon_discount) > 0 && (
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <dt>{p.coupon_code ? `Cupom ${p.coupon_code}` : 'Cupom'}</dt>
                    <dd className="tabular-nums">{menos(Number(p.coupon_discount))}</dd>
                  </div>
                )}
                {Number(p.manual_discount) > 0 && (
                  <div className="flex flex-wrap justify-between gap-x-3">
                    <dt>Desconto combinado</dt>
                    <dd className="tabular-nums">{menos(Number(p.manual_discount))}</dd>
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-x-3 font-medium">
                  <dt>{TOTAL_DOS_ITENS}</dt>
                  <dd data-testid="total-dos-itens" className="tabular-nums">
                    {formatPrice(p.items_total)}
                  </dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-estrelinha-ink-soft">{FRETE_NO_LINK}</p>
            </Cartao>

            <Cartao
              id="observacao"
              titulo={OBSERVACAO_INTERNA}
              acao={
                estado !== 'completed' ? (
                  <button
                    type="button"
                    data-testid="editar-observacao-do-montado"
                    onClick={() => {
                      if (!acoes.travado) abrirFolha(folhaObservacao)
                    }}
                    className="inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-estrelinha-primary underline underline-offset-4"
                  >
                    {EDITAR_OBSERVACAO}
                  </button>
                ) : null
              }
            >
              <p data-testid="observacao-do-montado" className="whitespace-pre-line text-sm [overflow-wrap:anywhere]">
                {p.admin_note || SEM_OBSERVACAO}
              </p>
            </Cartao>

            <Cartao id="historico" titulo={HISTORICO}>
              <ol aria-label="Histórico do pedido montado">
                {[...p.events]
                  .sort((a, b) => b.created_at.localeCompare(a.created_at))
                  .map((e, i, todos) => (
                    <li
                      key={`${e.kind}-${e.created_at}-${i}`}
                      data-testid="evento-do-montado"
                      className="relative flex flex-wrap items-baseline justify-between gap-x-3 pb-3 pl-5 text-sm last:pb-0"
                    >
                      <span className="font-medium">{rotuloDoEvento(e, p.order_number)}</span>
                      <span className="text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">{formatShortDate(e.created_at)}</span>
                      <span
                        aria-hidden="true"
                        data-parte="ponto"
                        className={`absolute left-0 top-[6px] h-2 w-2 rounded-full ${i === 0 ? 'bg-estrelinha-accent' : 'bg-estrelinha-line'}`}
                      />
                      {i < todos.length - 1 && (
                        <span aria-hidden="true" data-parte="fio" className="absolute bottom-0 left-[3px] top-[16px] w-px bg-estrelinha-line" />
                      )}
                    </li>
                  ))}
              </ol>
            </Cartao>

            {(achado.actions?.edit || achado.actions?.cancel) && (
              <div className="flex flex-col gap-1">
                {achado.actions?.edit && (
                  <button
                    type="button"
                    onClick={() => {
                      if (acoes.travado) return
                      marcarEdicao(id)
                      navigate(montarPedidoHref(), { state: { doApp: true, passoDaMontagem: 0 } })
                    }}
                    className={cn(BOTAO_SECUNDARIO, 'border border-estrelinha-primary px-4 text-base')}
                  >
                    {EDITAR}
                  </button>
                )}
                {achado.actions?.cancel && (
                  <button
                    type="button"
                    onClick={() => abrirFolha(folhaCancelar)}
                    className="min-h-12 w-full rounded-sm bg-transparent px-4 text-center text-base font-medium text-estrelinha-alert hover:bg-estrelinha-alert-soft"
                  >
                    {CANCELAR_ESTE_PEDIDO}
                  </button>
                )}
              </div>
            )}
            {renovarExpirada && achado.actions.renewLabel && (
              <button
                type="button"
                onClick={() => abrirFolha(folhaRenovar)}
                className="min-h-12 w-full rounded-sm bg-estrelinha-primary px-4 text-base font-medium text-estrelinha-on-primary"
              >
                {achado.actions.renewLabel}
              </button>
            )}
            {achado.actions?.viewOrder && p.order_id && (
              <RodapeDoMontado>
                <Link
                  to={pedidoHref(p.order_id)}
                  state={{ doApp: true }}
                  className="flex min-h-12 w-full items-center justify-center rounded-sm bg-estrelinha-primary px-4 py-2 text-center text-base font-medium text-estrelinha-on-primary hover:bg-estrelinha-primary-strong [overflow-wrap:anywhere]"
                >
                  {verOPedido(p.order_number)}
                </Link>
              </RodapeDoMontado>
            )}

            <FolhaDeConfirmacao
              controle={folhaCancelar}
              titulo={cancelarTitulo(p.number)}
              frase={CANCELAR_FRASE}
              manter={MANTER}
              confirmar={CANCELAR_PEDIDO}
              travado={acoes.travado}
              erro={acoes.erro}
              aoConfirmar={() => void acoes.cancelar(folhaCancelar.fechar)}
            />
            <FolhaDeConfirmacao
              controle={folhaRenovar}
              titulo={renovarTitulo(p.number)}
              frase={
                acoes.precosMudados
                  ? `${acoes.precosMudados.frase} ${totalNovo(formatPrice(acoes.precosMudados.totalRelido))}`
                  : proposalRenewText({ name: p.customer_name, expiresAt: p.expires_at, now: new Date(achado.lido_em) })
              }
              manter={AGORA_NAO}
              confirmar={acoes.precosMudados ? PRECOS_MUDARAM_CONFIRMAR : RENOVAR}
              travado={acoes.travado}
              erro={acoes.erro}
              aoConfirmar={() => void acoes.renovar(folhaRenovar.fechar)}
            />
            <FolhaDaObservacao
              controle={{ folha: { tipo: 'observacao' }, ...folhaObservacao }}
              observacao={{
                travado: acoes.travado,
                erro: acoes.erro ? { frase: acoes.erro, retentativa: null } : null,
                erroBruto: acoes.erroBruto,
                salvar: async (texto, opcoes) => {
                  let salvou = false
                  await acoes.salvarObservacao(texto.trim() === '' ? null : texto, () => {
                    salvou = true
                    opcoes?.aoConcluir?.()
                  })
                  return salvou
                },
              }}
              gravada={p.admin_note ? { note: p.admin_note, updated_by_name: null, updated_at: p.created_at } : null}
            />
          </>
        )}
      </div>
    </PullToRefresh>
  )
}

export default PedidoMontadoPage
