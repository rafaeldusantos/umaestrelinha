import { useCallback, useReducer, useRef, useState } from 'react'
import { X } from 'lucide-react'
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
  reduzirMontagem,
  usePassosDaMontagem,
  type Entrega,
  type NumeroDoPasso,
} from '@/features/order-proposal'
import { useFolhaNaEntrada, type FolhaNaEntrada } from '@/shared/lib/useFolhaNaEntrada'

/**
 * A montagem de um pedido no app — a casca dos quatro passos e o
 * passo 1. Os passos 2 a 4 entram depois; aqui só o esqueleto deles.
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
 * - **Nada fica no aparelho**: o estado é memória desta tela. As leituras passam por
 *   `lerComPapel`; a recusa (`42501`) entra na vigia da `72`, e enquanto ela vale nenhum dado de cliente
 *   é desenhado.
 */

const MontarPedidoPage = () => {
  const [estado, despachar] = useReducer(reduzirMontagem, undefined, montagemVazia)
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
  const catalogo = useCatalogoDaMontagem(passos.passo === 2)

  const recusada = useRecusaDePapel(
    [busca.error, enderecos.error, ficha.error, leitura.erroBruto, catalogo.error],
    (naBusca ? !!busca.data && !busca.isError : true) && !enderecos.isError && !ficha.isError && !catalogo.isError,
  )

  // A entrega de quem ainda não escolheu: a cadastrada no endereço padrão (ou no link, sem endereço
  // salvo — a convidada nunca tem); a nova informa agora.
  const semEndereco = estado.cliente !== null && estado.cliente.fichaId === null
  const entregaEfetiva: Entrega | null =
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
  const fichaDoEmail = !recusada && estado.modo === 'nova' ? (ficha.data ?? null) : null

  const motivo =
    passos.passo === 1
      ? motivoDoPassoCliente(estado, { entregaEfetiva, temFicha: fichaDoEmail !== null })
      : passos.passo === 2
        ? motivoDoPassoPecas(estado)
        : null

  const abrirPeca = (peca: PecaParaProposta, linha: LinhaDaSacola | null) => {
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

  // Da sentinela (o voltar no passo 1, com algo preenchido): a mesma pergunta, sem entrada própria.
  const folhaDaSentinela: FolhaNaEntrada = { aberta: passos.perguntandoNaSentinela, abrir: () => {}, fechar: passos.voltarAoPrimeiro }

  return (
    <div className="-mx-4 -mt-4 flex min-h-[100dvh] flex-col bg-estrelinha-ground">
      <header className="sticky top-0 z-10 border-b border-estrelinha-line bg-estrelinha-surface px-2 pb-3 pt-2">
        <div className="flex items-start gap-1">
          <button
            type="button"
            aria-label={FECHAR_A_MONTAGEM}
            onClick={fechar}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-estrelinha-ink hover:bg-estrelinha-ground-deep"
          >
            <X aria-hidden="true" className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="font-display text-xl text-estrelinha-ink">{MONTAR_PEDIDO}</h1>
            <p className="text-sm text-estrelinha-ink-soft">{passoDeQuatro(passos.passo)}</p>
          </div>
        </div>
        <nav aria-label="Passos da montagem" className="mt-3 grid grid-cols-4 gap-1 px-2">
          {PASSOS_DA_MONTAGEM.map((nome, i) => {
            const n = (i + 1) as NumeroDoPasso
            const alcancavel = n <= passos.alcancado
            return (
              <button
                key={nome}
                type="button"
                aria-label={`Passo ${n}: ${nome}`}
                aria-current={n === passos.passo ? 'step' : undefined}
                aria-disabled={alcancavel ? undefined : 'true'}
                onClick={() => passos.irPara(n)}
                className="flex min-h-11 items-center"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 w-full rounded-full ${n <= passos.passo ? 'bg-estrelinha-primary' : alcancavel ? 'bg-estrelinha-primary/40' : 'bg-estrelinha-line'}`}
                />
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
        {passos.passo === 1 && !recusada && (
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
          />
        )}
        {passos.passo > 2 && (
          <section aria-label={PASSOS_DA_MONTAGEM[passos.passo - 1]}>
            <h2 className="font-display text-lg text-estrelinha-ink">{PASSOS_DA_MONTAGEM[passos.passo - 1]}</h2>
          </section>
        )}
        <div aria-hidden="true" className="h-40" />
      </div>

      <div
        data-testid="barra-da-montagem"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-estrelinha-line bg-estrelinha-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-lg space-y-2">
          {motivo && (
            <p id="motivo-do-bloqueio" className="text-sm text-estrelinha-ink">
              {motivo}
            </p>
          )}
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-estrelinha-ink-soft">{itensDaBarra(estado.pecas)}</p>
              <p className="font-display text-lg text-estrelinha-ink">—</p>
            </div>
            {passos.passo < 4 && (
              <button
                type="button"
                disabled={motivo !== null}
                aria-describedby={motivo ? 'motivo-do-bloqueio' : undefined}
                onClick={passos.continuar}
                className="min-h-12 shrink-0 rounded-sm bg-estrelinha-primary px-6 text-base font-medium text-estrelinha-on-primary disabled:opacity-60"
              >
                {CONTINUAR}
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
        frase={SAIR_FRASE}
        manter={CONTINUAR_MONTANDO}
        confirmar={SAIR}
        travado={false}
        erro={null}
        aoConfirmar={() => passos.sair(true)}
      />
      <FolhaDeConfirmacao
        controle={folhaDaSentinela}
        titulo={SAIR_TITULO}
        frase={SAIR_FRASE}
        manter={CONTINUAR_MONTANDO}
        confirmar={SAIR}
        travado={false}
        erro={null}
        aoConfirmar={() => passos.sair()}
      />
    </div>
  )
}

export default MontarPedidoPage
