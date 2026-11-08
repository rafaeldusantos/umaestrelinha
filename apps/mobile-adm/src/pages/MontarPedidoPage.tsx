import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { formatPrice } from '@estrelinha/core/formatters'
import { adminNoteRefusal } from '@estrelinha/core/orders'
import type { CustomerParseMode } from '@estrelinha/core/customers'
import type { PecaParaProposta } from '@estrelinha/core/proposals'

import { useClientesDaMontagem, useEnderecosSalvos, useFichaPorEmail, nomeDoCliente, type ClienteDaMontagem } from '@/entities/customer'
import { useCatalogoDaMontagem } from '@/entities/product'
import { useRecusaDePapel } from '@/features/access-check'
import {
  FECHAR_A_MONTAGEM,
  MONTAR_PEDIDO,
  SAIR_TITULO,
  SAIR_FRASE,
  SAIR_FRASE_COM_RASCUNHO,
  GUARDAR_RASCUNHO,
  DESCARTAR,
  RASCUNHO_RETOMADO,
  RASCUNHO_SEM_CLIENTE,
  pecasForaDoCatalogo,
  apagarRascunho,
  guardarRascunho,
  lerRascunho,
  rascunhoDaMontagem,
  retomadaDoRascunho,
  CONTINUAR_MONTANDO,
  SAIR,
  CONTINUAR,
  NENHUMA_PECA,
  USANDO_A_FICHA,
  ENDERECO_LIDO_FICOU_COMO_OUTRO,
  ENTREGA_NO_PADRAO,
  passoDeQuatro,
  itensDaBarra,
  FolhaDeConfirmacao,
  FolhaColarTexto,
  LEITURA_DESFEITA,
  useLeituraDoTexto,
  PASSOS_DA_MONTAGEM,
  PassoDaCliente,
  cepCompleto,
  montagemPreenchida,
  montagemVazia,
  motivoDoPassoCliente,
  motivoDoPassoPecas,
  FolhaDaVariacao,
  PassoDasPecas,
  PECA_ACRESCENTADA,
  PECA_ATUALIZADA,
  PECA_REMOVIDA,
  linhaDaEscolha,
  pecaEVariacao,
  type LinhaDaSacola,
  PassoDosDescontos,
  motivoDoPassoDescontos,
  pecasNaSacola,
  pedidoDoResumo,
  useAplicarCupom,
  useResumoDaMontagem,
  usePromocaoDasLinhas,
  type PromocaoDaLinha,
  reduzirMontagem,
  usePassosDaMontagem,
  type Entrega,
  type NumeroDoPasso,
  ALTERACOES_SALVAS,
  CARREGANDO_O_MONTADO,
  CRIANDO_O_LINK,
  CRIAR_LINK,
  EDITAR_PEDIDO_MONTADO,
  LINK_CRIADO,
  NOTA_DO_EDITAR,
  O_LINK_CONTINUA,
  PassoRevisar,
  SALVANDO,
  SALVAR_ALTERACOES,
  agoraEhSoMandar,
  corpoDoSave,
  deixarDesfecho,
  edicaoMarcada,
  enderecoDaEntrega,
  esquecerEdicao,
  montagemDoMontado,
  motivoDaRevisao,
  notaDaRevisao,
  useCotacaoDaRevisao,
  useCriarLink,
  useMontado,
  useRelogioDaMontagem,
} from '@/features/order-proposal'
import { FalhaDoBloco, Traco } from '@/shared/ui/leitura'
import { useFolhaNaEntrada } from '@/shared/lib/useFolhaNaEntrada'

/** Uma chave de idempotência por montagem: o segundo toque em "Criar link" devolve a mesma proposta. */
const chaveNova = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `montagem-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`

/**
 * A montagem de um pedido no app — a casca dos quatro passos.
 *
 * - **Tela cheia**, sem a barra de abas (`barraNoCaminho`): o "x" (fechar), o título, "Passo n de 4 ·
 *   <nome>" e o indicador de quatro segmentos, que só navega até o passo mais alto alcançado.
 * - **A barra fixa** diz POR QUE o botão está desligado (o motivo do bloqueio), a contagem das peças e
 *   o total.
 * - **O voltar do Android** recua um passo; no primeiro, pergunta antes de sair (a sentinela de
 *   `usePassosDaMontagem`). O "x" com algo preenchido pergunta também ("Sair sem criar o link?"), por
 *   uma folha no histórico (o voltar a fecha); sem nada, fecha direto.
 * - **"Colar texto"**: a folha da leitura (no histórico; o voltar a fecha) lê pela porta
 *   `customer-parse` — contato e endereço em Cliente nova, só o endereço em "Outro endereço" da
 *   cadastrada — e o resultado só preenche a memória da tela, com "Desfazer". Nada é gravado pela
 *   leitura; a recusa da porta entra na MESMA vigia das leituras.
 * - **O passo 2 · Peças**: a busca pela regra de `core` sobre o catálogo lido uma vez (`lerComPapel`), a
 *   folha da variação no histórico (o voltar a fecha) e a sacola com a foto de cada variação. A quantidade
 *   não passa do estoque somando a mesma variação já na sacola. Nenhuma promoção entra na conta aqui.
 * - **O passo 3 · Descontos**: o cupom e o desconto combinado, e o resumo vivo pela prévia do servidor
 *   (`order-proposals?action=preview`), a cada mudança, com a anterior cancelada. O app não lê
 *   promoções, cupons nem pedidos: manda a escolha e recebe o resumo. "Continuar" fica ligado; tocar
 *   com bloqueio marca a tentativa, e só então o motivo aparece.
 * - **O passo 4 · Revisar**: as peças primeiro (com a foto), a cliente e a entrega com a prévia do
 *   frete (`melhor-envio?action=quote`, pela porta da cotação, dentro de `lerComPapel`), cada bloco
 *   com "Alterar", e a observação interna. "Criar link" é a ÚNICA gravação (`order-proposals?action=save`):
 *   a proposta, a ficha nova e o endereço salvo (`save_address`) nascem juntos. Preço mudado no servidor
 *   ⇒ a frase da function no topo, e o resumo e a sacola relidos; outra falha ⇒ "nada foi enviado".
 *   Gravado, abre o pedido montado com "Link criado.".
 * - **Editar**: o pedido montado marca a proposta (`marcarEdicao`) e abre esta tela; a montagem chega
 *   preenchida pelo `get` (peças, cliente, entrega, descontos, observação), e salvar mantém o link
 *   ("Alterações salvas."), voltando ao pedido montado.
 * - **O rascunho** (`model/rascunho.ts`, o dono da chave): a cada mudança, a montagem nova guarda neste
 *   celular só as peças, o cupom e o tipo e o valor do desconto combinado — para a volta involuntária
 *   (o celular bloqueou, o Android encerrou o app). Ao abrir, a montagem retoma o rascunho DESTA conta,
 *   com as linhas refeitas do catálogo relido; a cliente e o motivo do desconto se escolhem de novo.
 *   O "x" (ou o voltar do passo 1) com peças oferece "Guardar rascunho" ou "Descartar"; "Criar link" e a
 *   troca de conta o apagam. Editar um pedido montado não lê nem grava rascunho.
 * - **Nada mais fica no aparelho**: o resto do estado é memória desta tela. As leituras passam por
 *   `lerComPapel`; a recusa (`42501`) entra na vigia da `72`, e enquanto ela vale nenhum dado de cliente
 *   é desenhado.
 */

const MontarPedidoPage = () => {
  const { user } = useAuthContext()
  const [estado, despachar] = useReducer(reduzirMontagem, undefined, montagemVazia)
  // Editar: a proposta que o pedido montado marcou — lida ao montar, e esquecida.
  const [editando] = useState(edicaoMarcada)
  // O rascunho: a conta que abriu esta montagem é a dona dele (a troca de conta não grava por cima).
  const contaDaMontagem = useRef(user?.id ?? null)
  const [rascunhoPendente, setRascunhoPendente] = useState(() => (editando === null ? lerRascunho(contaDaMontagem.current) : null))
  useEffect(() => {
    esquecerEdicao()
  }, [])
  const montado = useMontado(editando ?? '', { habilitada: editando !== null })
  const [carregada, setCarregada] = useState(editando === null)
  const [cupomGravado, setCupomGravado] = useState<string | null>(null)
  const chaveDoSave = useRef<string>(chaveNova())
  const criar = useCriarLink()
  const preenchida = montagemPreenchida(estado)
  const passos = usePassosDaMontagem(preenchida)
  const folhaDeSair = useFolhaNaEntrada('sair-da-montagem')
  const folhaDeLeitura = useFolhaNaEntrada('colar-texto')
  const [escopoDaLeitura, setEscopoDaLeitura] = useState<CustomerParseMode>('contact_and_address')
  const fecharFolhaDeLeitura = useRef(folhaDeLeitura.fechar)
  fecharFolhaDeLeitura.current = folhaDeLeitura.fechar
  const leitura = useLeituraDoTexto((lida) => {
    setAviso([])
    despachar({ tipo: 'leitura', lida })
    fecharFolhaDeLeitura.current()
  })
  const [termo, setTermo] = useState('')
  const [aviso, setAviso] = useState<string[]>([])
  const folhaDaVariacao = useFolhaNaEntrada('variacao-da-peca')
  const [escolha, setEscolha] = useState<{ peca: PecaParaProposta; linha: LinhaDaSacola | null } | null>(null)
  const [geracaoDaBusca, setGeracaoDaBusca] = useState(0)
  const proximaChave = useRef(0)
  const refDoEmail = useRef<HTMLInputElement>(null)

  const naBusca = estado.modo === 'cadastrada' && !estado.cliente
  const busca = useClientesDaMontagem(termo, naBusca)
  const enderecos = useEnderecosSalvos(estado.modo === 'cadastrada' ? (estado.cliente?.fichaId ?? null) : null)
  const ficha = useFichaPorEmail(estado.modo === 'nova' ? estado.contato.email : '')
  const catalogo = useCatalogoDaMontagem(passos.passo === 2 || rascunhoPendente !== null)
  const achado = montado.data?.tipo === 'achou' ? montado.data : null
  useEffect(() => {
    if (carregada || !achado) return
    const { estado: reaberta, cupom } = montagemDoMontado(achado)
    despachar({ tipo: 'carregar', estado: reaberta })
    setCupomGravado(cupom)
    setCarregada(true)
  }, [carregada, achado])

  // O rascunho guardado volta quando o catálogo chega (as linhas são refeitas com o preço de hoje).
  useEffect(() => {
    if (!rascunhoPendente || !catalogo.data) return
    const { pecas, cupom, combinado, fora } = retomadaDoRascunho(rascunhoPendente, catalogo.data)
    setRascunhoPendente(null)
    despachar({ tipo: 'retomar-rascunho', pecas, cupom, combinado })
    setAviso([RASCUNHO_RETOMADO, RASCUNHO_SEM_CLIENTE, ...(fora > 0 ? [pecasForaDoCatalogo(fora)] : [])])
  }, [rascunhoPendente, catalogo.data])

  // A cada mudança, o rascunho da montagem nova (só as peças e os descontos). Enquanto o guardado não
  // volta, nada se grava por cima dele.
  useEffect(() => {
    const conta = contaDaMontagem.current
    if (editando !== null || rascunhoPendente !== null || conta === null || (user?.id ?? null) !== conta) return
    guardarRascunho(rascunhoDaMontagem(estado, conta))
  }, [editando, rascunhoPendente, estado, user?.id])

  // O passo 3: a prévia confere a escolha de agora (o e-mail da cliente decide o cupom de primeira compra).
  const emailDaCliente = estado.modo === 'cadastrada' ? (estado.cliente?.email ?? '') : estado.contato.email
  const [tentouNosDescontos, setTentouNosDescontos] = useState(false)
  const cupomAplicavel = useAplicarCupom()
  // A prévia também no passo 2: o total da barra aparece assim que há peça na sacola.
  const resumo = useResumoDaMontagem(
    passos.passo >= 2 && estado.pecas.length > 0
      ? pedidoDoResumo(estado.pecas, estado.cupom?.codigo ?? null, estado.combinado, emailDaCliente)
      : null,
  )
  const recusaDoCombinado = resumo.previa?.manual_refusal ?? null
  // O cupom aplicado que a prévia passou a recusar (as peças ou o e-mail mudaram): sai, com o texto da loja.
  const recusaDoCupomVivo = resumo.recusa?.slug === 'coupon_refused' ? resumo.recusa.frase : null
  const [recusaVista, setRecusaVista] = useState<string | null>(null)
  if (recusaDoCupomVivo !== recusaVista) {
    setRecusaVista(recusaDoCupomVivo)
    if (recusaDoCupomVivo && estado.cupom) {
      despachar({ tipo: 'cupom', cupom: null })
      cupomAplicavel.recusar(recusaDoCupomVivo)
    }
  }

  // Editar: o cupom gravado volta como CÓDIGO e é conferido de novo pela prévia (a regra pode ter mudado).
  useEffect(() => {
    if (!carregada || !cupomGravado || estado.pecas.length === 0) return
    setCupomGravado(null)
    const { coupon_code: _semCupom, ...base } = pedidoDoResumo(estado.pecas, null, estado.combinado, emailDaCliente)
    void cupomAplicavel.aplicar(cupomGravado, base).then((cupom) => {
      if (cupom) despachar({ tipo: 'cupom', cupom })
    })
  }, [carregada, cupomGravado, estado.pecas, estado.combinado, emailDaCliente, cupomAplicavel])

  // O passo 4: o endereço da entrega (o digitado, o salvo, ou nenhum — a cliente preenche no link), a
  // prévia do frete e o relógio do servidor da nota do prazo.
  const enderecoDaRevisao = enderecoDaEntrega(estado, entregaEfetivaDe(), enderecos.data)
  const cotacao = useCotacaoDaRevisao(enderecoDaRevisao, estado.pecas, passos.passo === 4)
  const relogio = useRelogioDaMontagem(passos.passo === 4 && editando === null)

  // A promoção vigente de cada linha da sacola (o passo 2), pela prévia do servidor; e a recusa que a
  // prévia da folha da variação devolver.
  const promocaoDaSacola = usePromocaoDasLinhas(passos.passo === 2 ? estado.pecas : null, emailDaCliente)
  const promocoesDaSacola = new Map<string, PromocaoDaLinha>()
  promocaoDaSacola.promocoes?.forEach((p, i) => {
    if (p && estado.pecas[i]) promocoesDaSacola.set(estado.pecas[i].chave, p)
  })
  const [recusaDaFolha, setRecusaDaFolha] = useState<unknown>(null)

  const recusada = useRecusaDePapel(
    [
      promocaoDaSacola.erroBruto,
      recusaDaFolha,
      busca.error,
      enderecos.error,
      ficha.error,
      leitura.erroBruto,
      catalogo.error,
      resumo.erroBruto,
      cupomAplicavel.erroBruto,
      montado.error,
      cotacao.consulta.error,
      relogio.error,
      criar.erroBruto,
    ],
    (naBusca ? !!busca.data && !busca.isError : true) && !enderecos.isError && !ficha.isError && !catalogo.isError && !montado.isError,
  )

  // O preço mudou no servidor: o resumo e a sacola relidos (o catálogo traz o preço cheio de hoje).
  const mudancasVistas = useRef(0)
  useEffect(() => {
    if (criar.precosMudaram === mudancasVistas.current) return
    mudancasVistas.current = criar.precosMudaram
    resumo.tentarDeNovo()
    void catalogo.refetch().then((r) => {
      if (r.data) despachar({ tipo: 'reprecificar', catalogo: r.data })
    })
  }, [criar.precosMudaram, resumo, catalogo])

  // A entrega de quem ainda não escolheu: a cadastrada no endereço padrão (ou no link, sem endereço
  // salvo — a convidada nunca tem); a nova informa agora.
  const entregaEfetiva: Entrega | null = entregaEfetivaDe()
  function entregaEfetivaDe(): Entrega | null {
    const semEndereco = estado.cliente !== null && estado.cliente.fichaId === null
    return (
    estado.entrega ??
    (estado.modo === 'nova'
      ? 'outro'
      : !estado.cliente
        ? null
        : semEndereco
          ? 'link'
          : enderecos.data
            ? enderecos.data.length > 0
              ? 'padrao'
              : 'link'
            : null)
    )
  }
  const semEndereco = estado.cliente !== null && estado.cliente.fichaId === null
  const fichaDoEmail = !recusada && estado.modo === 'nova' ? (ficha.data ?? null) : null

  const motivo =
    passos.passo === 1
      ? motivoDoPassoCliente(estado, { entregaEfetiva, temFicha: fichaDoEmail !== null })
      : passos.passo === 2
        ? motivoDoPassoPecas(estado)
        : passos.passo === 3
          ? motivoDoPassoDescontos(estado.combinado, recusaDoCombinado)
          : motivoDaRevisao(
              [
                motivoDoPassoCliente(estado, { entregaEfetiva, temFicha: fichaDoEmail !== null }),
                motivoDoPassoPecas(estado),
                motivoDoPassoDescontos(estado.combinado, recusaDoCombinado),
                adminNoteRefusal(estado.observacao),
              ],
              resumo.previa !== null,
            )
  // No passo 3 o motivo só aparece depois da tentativa (o botão fica ligado) — menos a recusa do servidor
  // ao desconto combinado, que vai à barra logo.
  const motivoNaBarra =
    passos.passo === 3 && !tentouNosDescontos ? (estado.combinado.ligado && recusaDoCombinado ? recusaDoCombinado : null) : motivo
  const continuar = () => {
    if (passos.passo === 3 && motivo !== null) {
      setTentouNosDescontos(true)
      return
    }
    passos.continuar()
  }
  const totalNaBarra = passos.passo >= 2 && estado.pecas.length > 0 && resumo.previa ? formatPrice(resumo.previa.summary.items_total) : '—'

  const versaoLida = achado?.proposal.version ?? null
  const gravar = async () => {
    if (motivo !== null || !resumo.previa) return
    const corpo = corpoDoSave(estado, {
      entrega: entregaEfetiva,
      salvos: enderecos.data,
      totalEsperado: resumo.previa.summary.items_total,
      alvo: editando !== null && versaoLida !== null ? { tipo: 'editar', id: editando, versao: versaoLida } : { tipo: 'criar', chave: chaveDoSave.current },
    })
    const salvo = await criar.gravar(corpo)
    if (!salvo) return
    const conta = user?.id ?? null
    if (editando !== null) {
      deixarDesfecho({ id: salvo.id, conta, aviso: { titulo: ALTERACOES_SALVAS, texto: O_LINK_CONTINUA }, link: null })
      // De volta ao pedido montado de onde Editar saiu (a entrada antes da sentinela da montagem).
      passos.sair()
      return
    }
    apagarRascunho()
    deixarDesfecho({
      id: salvo.id,
      conta,
      aviso: { titulo: LINK_CRIADO, texto: agoraEhSoMandar(corpo.customer_name) },
      link: salvo.token && salvo.expires_at ? { id: salvo.id, token: salvo.token, expires_at: salvo.expires_at } : null,
    })
    passos.concluirNoMontado(salvo.id)
  }

  const abrirPeca = (peca: PecaParaProposta, linha: LinhaDaSacola | null) => {
    setRecusaDaFolha(null)
    setEscolha({ peca, linha })
    folhaDaVariacao.abrir()
  }

  const confirmarPeca: Parameters<typeof FolhaDaVariacao>[0]['aoConfirmar'] = ({ variacao, quantidade, gravacao }) => {
    if (!escolha) return
    const chave = escolha.linha?.chave ?? `linha-${(proximaChave.current += 1)}`
    const linha = linhaDaEscolha(chave, escolha.peca, variacao, quantidade, gravacao)
    despachar(escolha.linha ? { tipo: 'atualizar-peca', linha } : { tipo: 'acrescentar-peca', linha })
    setAviso([escolha.linha ? PECA_ATUALIZADA : PECA_ACRESCENTADA, pecaEVariacao(linha)])
    setGeracaoDaBusca((g) => g + 1)
    folhaDaVariacao.fechar()
  }

  const usarFicha = useCallback(
    (c: ClienteDaMontagem) => {
      const comEndereco = cepCompleto(estado.endereco.cep)
      despachar({ tipo: 'usar-ficha', cliente: c })
      setAviso(comEndereco ? [USANDO_A_FICHA(nomeDoCliente(c)), ENDERECO_LIDO_FICOU_COMO_OUTRO] : [ENTREGA_NO_PADRAO])
    },
    [estado.endereco.cep],
  )

  const abrirLeitura = (escopo: CustomerParseMode) => {
    setEscopoDaLeitura(escopo)
    leitura.limpar()
    folhaDeLeitura.abrir()
  }

  const fechar = () => {
    if (preenchida) folhaDeSair.abrir()
    else passos.sair()
  }
  // Com peças na montagem nova, a folha oferece guardar o rascunho ou descartá-lo.
  const comRascunho = editando === null && estado.pecas.length > 0
  const descartarESair = (folhaAberta: boolean) => {
    if (editando === null) apagarRascunho()
    passos.sair(folhaAberta)
  }
  const guardarESair = (folhaAberta: boolean) => {
    const conta = contaDaMontagem.current
    if (conta !== null && (user?.id ?? null) === conta) guardarRascunho(rascunhoDaMontagem(estado, conta))
    passos.sair(folhaAberta)
  }

  // Da sentinela (o voltar no passo 1, com algo preenchido): o passo 1 voltou, e a MESMA folha de sair
  // abre por cima dele, numa entrada própria — o voltar com ela aberta a fecha.
  const perguntarAoSair = passos.perguntarAoSair
  const abrirFolhaDeSair = folhaDeSair.abrir
  useEffect(() => {
    if (!perguntarAoSair) return
    passos.perguntaAtendida()
    abrirFolhaDeSair()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntarAoSair])

  return (
    <div className="-mx-4 -mt-4 flex min-h-[100dvh] flex-col bg-estrelinha-ground">
      {/* Preso ao topo só em tela alta: com a fonte do sistema a 200 % numa tela baixa (ou com o teclado
          aberto), o cabeçalho e a barra fixa juntos cobririam o campo em que se digita. */}
      <header className="top-0 z-10 border-b border-estrelinha-line bg-estrelinha-surface px-2 pb-3 pt-2 [@media(min-height:640px)]:sticky">
        <div className="flex items-start gap-1">
          <button
            type="button"
            aria-label={FECHAR_A_MONTAGEM}
            onClick={fechar}
            className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full text-estrelinha-ink hover:bg-estrelinha-ground-deep"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="font-display text-[17px] text-estrelinha-ink">{editando !== null ? EDITAR_PEDIDO_MONTADO : MONTAR_PEDIDO}</h1>
            <p className="text-[12px] text-estrelinha-ink-soft">{passoDeQuatro(passos.passo)}</p>
          </div>
        </div>
        <nav aria-label="Passos da montagem" className="mt-3 grid grid-cols-4 gap-1 px-2">
          {PASSOS_DA_MONTAGEM.map((nome, i) => {
            const n = (i + 1) as NumeroDoPasso
            const alcancavel = n <= passos.alcancado
            const atual = n === passos.passo
            // O atual em accent, os feitos em primária, o alcançado adiante em primária clara, o resto em line.
            const cor = atual
              ? 'bg-estrelinha-accent'
              : n < passos.passo
                ? 'bg-estrelinha-primary'
                : alcancavel
                  ? 'bg-estrelinha-primary/40'
                  : 'bg-estrelinha-line'
            return (
              <button
                key={nome}
                type="button"
                aria-label={`Passo ${n}: ${nome}`}
                aria-current={atual ? 'step' : undefined}
                aria-disabled={alcancavel ? undefined : 'true'}
                onClick={() => passos.irPara(n)}
                className="flex min-h-[44px] flex-col items-stretch justify-center gap-1"
              >
                <span data-segmento aria-hidden="true" className={`block h-1 w-full rounded-full ${cor}`} />
                <span className={`text-[12px] ${atual ? 'font-semibold text-estrelinha-ink' : 'text-estrelinha-ink-soft'}`}>{nome}</span>
              </button>
            )
          })}
        </nav>
      </header>

      <div className="flex-1 space-y-4 px-4 pt-4">
        {aviso.length > 0 && (
          <div role="status" className="space-y-1 rounded-md bg-estrelinha-ground-deep p-3 text-sm text-estrelinha-ink">
            {aviso.map((a) => (
              <p key={a}>{a}</p>
            ))}
          </div>
        )}
        {!carregada && !recusada && (
          montado.isError ? (
            <FalhaDoBloco tentarDeNovo={() => void montado.refetch()} />
          ) : (
            <div data-testid="montagem-carregando" aria-busy="true" aria-label={CARREGANDO_O_MONTADO} className="space-y-3">
              <Traco className="h-24 w-full" />
              <Traco className="h-40 w-full" />
            </div>
          )
        )}
        {passos.passo === 1 && carregada && !recusada && (
          <PassoDaCliente
            estado={estado}
            despachar={(acao) => {
              // O aviso de "Usar a ficha dela" fica até a próxima ESCOLHA (cliente, segmento, entrega);
              // digitar e o CEP completando o endereço não o apagam.
              if (acao.tipo === 'modo' || acao.tipo === 'escolher-cliente' || acao.tipo === 'trocar-cliente' || acao.tipo === 'entrega') setAviso([])
              despachar(acao)
            }}
            entregaEfetiva={entregaEfetiva}
            busca={{
              termo,
              aoBuscar: setTermo,
              dado: busca.data,
              carregando: busca.isPending,
              falhou: busca.isError && !busca.data,
              tentarDeNovo: () => void busca.refetch(),
            }}
            enderecos={{
              dado: enderecos.data,
              carregando: !semEndereco && enderecos.isPending,
              falhou: enderecos.isError && !enderecos.data,
              tentarDeNovo: () => void enderecos.refetch(),
            }}
            fichaDoEmail={fichaDoEmail}
            aoUsarFicha={usarFicha}
            refDoEmail={refDoEmail}
            aoCorrigirEmail={() => {
              refDoEmail.current?.focus()
              refDoEmail.current?.select()
            }}
            aoColarTexto={abrirLeitura}
            aoDesfazerLeitura={() => {
              despachar({ tipo: 'desfazer-leitura' })
              setAviso(LEITURA_DESFEITA)
            }}
          />
        )}
        {passos.passo === 2 && !recusada && (
          <PassoDasPecas
            sacola={estado.pecas}
            catalogo={{
              dado: catalogo.data,
              carregando: catalogo.isPending,
              falhou: catalogo.isError && !catalogo.data,
              tentarDeNovo: () => void catalogo.refetch(),
            }}
            geracaoDaBusca={geracaoDaBusca}
            aoEscolherPeca={(peca) => abrirPeca(peca, null)}
            aoEditar={(linha) => {
              const peca = catalogo.data?.find((p) => p.id === linha.pecaId)
              if (peca) abrirPeca(peca, linha)
            }}
            aoRemover={(linha) => {
              despachar({ tipo: 'remover-peca', chave: linha.chave })
              setAviso([PECA_REMOVIDA])
            }}
            promocoes={promocoesDaSacola}
          />
        )}
        {passos.passo === 3 && !recusada && (
          <PassoDosDescontos
            cupom={estado.cupom}
            combinado={estado.combinado}
            pecas={pecasNaSacola(estado.pecas)}
            resumo={resumo}
            aplicando={cupomAplicavel.aplicando}
            recusaDoCupom={cupomAplicavel.recusa}
            recusaDoCombinado={recusaDoCombinado}
            tentou={tentouNosDescontos}
            aoAplicar={async (codigo) => {
              const { coupon_code: _semCupom, ...escolha } = pedidoDoResumo(estado.pecas, null, estado.combinado, emailDaCliente)
              const cupom = await cupomAplicavel.aplicar(codigo, escolha)
              if (cupom) despachar({ tipo: 'cupom', cupom })
              return cupom !== null
            }}
            aoRemoverCupom={() => {
              despachar({ tipo: 'cupom', cupom: null })
              cupomAplicavel.recusar(null)
            }}
            aoMudarCombinado={(campos) => despachar({ tipo: 'combinado', campos })}
          />
        )}
        {passos.passo === 4 && carregada && !recusada && (
          <PassoRevisar
            estado={estado}
            endereco={enderecoDaRevisao}
            resumo={resumo}
            cupom={estado.cupom}
            cotacao={{
              pronta: cotacao.pronta,
              carregando: cotacao.consulta.isPending,
              falhou: cotacao.consulta.isError,
              opcoes: cotacao.consulta.data,
            }}
            erroDaCriacao={criar.erro}
            nota={editando !== null ? NOTA_DO_EDITAR : notaDaRevisao(relogio.data ?? null)}
            aoAlterar={(n) => passos.irPara(n)}
            aoMudarObservacao={(texto) => despachar({ tipo: 'observacao', texto })}
          />
        )}
        <div aria-hidden="true" className="h-40" />
      </div>

      <div
        data-testid="barra-da-montagem"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-estrelinha-line bg-estrelinha-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-lg space-y-2">
          {motivoNaBarra && (
            <p id="motivo-do-bloqueio" className="text-[13px] text-estrelinha-wait">
              {motivoNaBarra}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-estrelinha-ink-soft">{itensDaBarra(estado.pecas)}</p>
              <p data-testid="total-da-barra" className="font-display text-lg text-estrelinha-ink">
                {totalNaBarra}
              </p>
            </div>
            {passos.passo < 4 ? (
              <button
                type="button"
                disabled={!carregada || (passos.passo !== 3 && motivo !== null)}
                aria-describedby={motivoNaBarra ? 'motivo-do-bloqueio' : undefined}
                onClick={continuar}
                className="min-h-12 min-w-[190px] shrink-0 rounded-sm bg-estrelinha-primary px-6 text-base font-medium text-estrelinha-on-primary disabled:opacity-60"
              >
                {CONTINUAR}
              </button>
            ) : (
              <button
                type="button"
                disabled={motivo !== null || criar.gravando || recusada}
                aria-describedby={motivoNaBarra ? 'motivo-do-bloqueio' : undefined}
                onClick={() => void gravar()}
                className="min-h-12 min-w-[190px] shrink-0 rounded-sm bg-estrelinha-primary px-6 text-base font-medium text-estrelinha-on-primary disabled:opacity-60"
              >
                {editando !== null ? (criar.gravando ? SALVANDO : SALVAR_ALTERACOES) : criar.gravando ? CRIANDO_O_LINK : CRIAR_LINK}
              </button>
            )}
          </div>
        </div>
      </div>

      <FolhaDaVariacao
        controle={folhaDaVariacao}
        peca={escolha?.peca ?? null}
        editando={escolha?.linha ?? null}
        sacola={estado.pecas}
        aoConfirmar={confirmarPeca}
        emailDaCliente={emailDaCliente}
        aoRecusarPapel={setRecusaDaFolha}
      />
      <FolhaColarTexto
        controle={folhaDeLeitura}
        escopo={escopoDaLeitura}
        lendo={leitura.lendo}
        erro={leitura.erro}
        aoLer={(texto) => void leitura.ler(texto, escopoDaLeitura)}
      />
      <FolhaDeConfirmacao
        controle={folhaDeSair}
        titulo={SAIR_TITULO}
        frase={comRascunho ? SAIR_FRASE_COM_RASCUNHO : SAIR_FRASE}
        manter={CONTINUAR_MONTANDO}
        confirmar={comRascunho ? DESCARTAR : SAIR}
        travado={false}
        erro={null}
        aoConfirmar={() => descartarESair(true)}
        alternativa={comRascunho ? { rotulo: GUARDAR_RASCUNHO, aoEscolher: () => guardarESair(true) } : undefined}
      />
    </div>
  )
}

export default MontarPedidoPage
