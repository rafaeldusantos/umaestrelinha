import { useState } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import type { CustomerSliceId } from '@estrelinha/core/customers'
import {
  FALHA_DA_LISTA,
  LIMPAR_CLIENTES,
  LIMPOU_CLIENTES,
  SEM_RESULTADO_FALADO,
  LinhaDoCliente,
  VAZIO_EM_ABERTO,
  VAZIO_SEM_CLIENTE,
  VAZIO_SEM_RECORRENTE,
  contagemDaLista,
  vazioDaBusca,
  type JanelaDeClientes,
} from '@/entities/customer'
import { useSentinela } from '@/shared/lib/useSentinela'
import { FalhaDoBloco, TENTAR_DE_NOVO, Traco } from '@/shared/ui/leitura'

/** Quantas linhas de esqueleto a primeira leitura mostra. */
export const LINHAS_DE_ESQUELETO_DE_CLIENTES = 4

export interface ListaDeClientesProps {
  recorte: CustomerSliceId
  /** O termo JÁ debounced — o mesmo que está na chave da leitura. */
  termo: string
  janela: JanelaDeClientes | undefined
  /** A leitura falhou e não há janela nenhuma (ou a leitura foi recusada). */
  falhou: boolean
  tentarDeNovo: () => void
  carregarMais: () => void
  carregandoMais: boolean
  proximaFalhou: boolean
  /** Desfaz o recorte e a busca (o botão "Limpar" do vazio). */
  limpar: () => void
  /** Quanto o teclado virtual cobre do fim da tela, em px (`MAC-34`): o fim dos resultados ganha essa folga. */
  folgaDoTeclado?: number
}

/** A frase de cada causa de lista vazia (`MAC-10`): a busca vence o recorte, e o recorte vence a base. */
const vazioDe = (recorte: CustomerSliceId, termo: string): string => {
  if (termo.trim() !== '') return vazioDaBusca(termo)
  if (recorte === 'em-aberto') return VAZIO_EM_ABERTO
  if (recorte === 'recorrentes') return VAZIO_SEM_RECORRENTE
  return VAZIO_SEM_CLIENTE
}

/**
 * A lista de clientes (feature `76`, `MAC-04`, `MAC-05`, `MAC-10`, `MAC-12`, `MAC-31`, `MAC-34`). Não
 * lê nada: quem lê é a página (`useListaDeClientes`), e a lista desenha.
 *
 * **Quatro estados, exclusivos** (`L-063`), no molde de `ListaDePedidos`: a FALHA sem dado ("Não consegui
 * carregar as clientes." e "Tentar de novo" — nunca um zero, nunca "Ainda não há clientes."); o
 * ESQUELETO da primeira leitura (`aria-busy`, nenhum texto de conteúdo); o VAZIO (uma frase por causa,
 * sem linha de contagem, e "Limpar" só quando há recorte ou busca a desfazer); e o DADO, com a contagem
 * do SERVIDOR (`janela.total`, nunca `linhas.length`) — inclusive enquanto uma releitura está no ar ou
 * falhou.
 *
 * **O fim da lista**: a sentinela carrega a próxima página perto do fim e se rearma; na falha da
 * próxima, as linhas ficam e o rodapé oferece "Tentar de novo"; com `fim`, nada — nem sentinela, nem
 * esqueleto.
 */
const Corpo = ({
  recorte,
  termo,
  janela,
  falhou,
  tentarDeNovo,
  carregarMais,
  carregandoMais,
  proximaFalhou,
  limpar,
  folgaDoTeclado = 0,
}: ListaDeClientesProps) => {
  const temMais = !!janela && !janela.fim && janela.linhas.length > 0
  const sentinela = useSentinela<HTMLDivElement>({
    ativo: temMais && !carregandoMais && !proximaFalhou,
    aoCruzar: carregarMais,
    rearme: janela,
  })
  const folga = { paddingBottom: folgaDoTeclado }

  if (falhou && !janela) {
    return (
      <section aria-label="Clientes" data-estado="falha" style={folga}>
        <div className="space-y-3 py-2">
          <p role="alert" className="text-sm text-estrelinha-ink-soft">
            {FALHA_DA_LISTA}
          </p>
          <button
            type="button"
            onClick={tentarDeNovo}
            className="min-h-12 rounded-sm border border-estrelinha-primary bg-estrelinha-surface px-4 text-sm font-medium text-estrelinha-primary"
          >
            {TENTAR_DE_NOVO}
          </button>
        </div>
      </section>
    )
  }

  if (!janela) {
    return (
      <section aria-label="Clientes" aria-busy="true" data-estado="carregando" className="space-y-3" style={folga}>
        {Array.from({ length: LINHAS_DE_ESQUELETO_DE_CLIENTES }, (_, i) => (
          <Traco key={i} className="h-16 w-full" />
        ))}
      </section>
    )
  }

  if (janela.linhas.length === 0) {
    const comFiltro = recorte !== 'todas' || termo.trim() !== ''
    return (
      <section aria-label="Clientes" data-estado="vazio" className="space-y-3 py-6 text-center" style={folga}>
        <p data-testid="vazio" className="font-display text-lg text-estrelinha-ink [overflow-wrap:anywhere]">
          {vazioDe(recorte, termo)}
        </p>
        {comFiltro && (
          <button
            type="button"
            onClick={limpar}
            className="min-h-11 rounded-sm px-4 text-sm font-medium text-estrelinha-primary underline underline-offset-4"
          >
            {LIMPAR_CLIENTES}
          </button>
        )}
      </section>
    )
  }

  return (
    <section aria-label="Clientes" data-estado="dado" style={folga}>
      <p data-testid="contagem" aria-live="polite" className="text-sm text-estrelinha-ink-soft">
        {contagemDaLista(janela.total, recorte !== 'todas' || termo.trim() !== '')}
      </p>
      <ul className="mt-2 rounded-lg border border-estrelinha-line bg-estrelinha-surface px-4">
        {janela.linhas.map((c, i) => (
          <li key={c.id} className={cn(i > 0 && 'border-t border-estrelinha-line')}>
            <LinhaDoCliente cliente={c} lidoEm={janela.lido_em} />
          </li>
        ))}
      </ul>
      {proximaFalhou ? (
        <div data-testid="fim-com-falha" className="mt-2">
          <FalhaDoBloco tentarDeNovo={carregarMais} />
        </div>
      ) : temMais ? (
        <div className="mt-3" aria-busy={carregandoMais ? 'true' : undefined}>
          {carregandoMais && <Traco className="h-16 w-full" />}
          <div ref={sentinela} data-testid="sentinela" aria-hidden="true" className="h-px" />
        </div>
      ) : null}
    </section>
  )
}

/**
 * **A região viva é a MESMA em todo estado** (`BUG-20261024-vazio-da-busca-nao-e-anunciado`). Uma região
 * que nasce junto com o texto que deveria anunciar muitas vezes passa em silêncio: o vazio da busca era
 * um `<p>` sem papel, montado no lugar da lista, e "Limpar" sumia junto com o botão. Ela fica montada
 * fora do que troca, diz "Nenhum resultado." quando não há ninguém (a frase completa, com o termo, fica no
 * `<p>` visível — repeti-la aqui deixaria o texto duas vezes na árvore), e diz "Busca e recorte desfeitos."
 * depois do "Limpar". A contagem de uma lista com gente continua na sua linha (`aria-live`).
 */
const ListaDeClientes = (props: ListaDeClientesProps) => {
  const [aviso, setAviso] = useState('')
  const vazio = !!props.janela && props.janela.linhas.length === 0
  const texto = vazio ? SEM_RESULTADO_FALADO : aviso
  return (
    <>
      <div data-testid="anuncio-da-lista" aria-live="polite" className="sr-only">
        {texto}
      </div>
      <Corpo
        {...props}
        limpar={() => {
          setAviso(LIMPOU_CLIENTES)
          props.limpar()
        }}
      />
    </>
  )
}

export default ListaDeClientes
