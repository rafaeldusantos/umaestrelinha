import type { ReactNode, Ref } from 'react'
import { MessageSquareText } from 'lucide-react'
import { CUSTOMER_SEARCH_DEBOUNCE_MS } from '@estrelinha/core/customers'
import { maskCpf, maskPhone } from '@estrelinha/core/validators'

import { Inicial, nomeDoCliente, type ClienteDaMontagem, type EnderecoSalvo } from '@/entities/customer'
import CampoDeBusca from '@/shared/ui/CampoDeBusca'
import { FalhaDoBloco, Traco } from '@/shared/ui/leitura'

import {
  CLIENTE_CADASTRADA,
  CLIENTE_NOVA,
  OPCOES_DE_ENTREGA,
  INFORMAR_AGORA,
  ENDERECO_DE_ENTREGA,
  USAR_A_FICHA,
  CORRIGIR_O_EMAIL,
  avisoDaFicha,
  enderecoEmLinha,
  linhaDaCliente,
  pedidosNaLoja,
  SEM_TELEFONE_NO_CARTAO,
  TEM_OS_DADOS_NUMA_MENSAGEM,
  COLE_A_CONVERSA,
  COLAR_TEXTO_DA_CONVERSA,
  LIDO_DO_TEXTO,
  LIDO_E_CONFERIDO_NO_CEP,
  LER_OUTRO_TEXTO,
  DESFAZER,
  resumoDaLeitura,
} from '../model/frasesDaMontagem'
import type { AcaoDaMontagem, CampoLido, EnderecoDigitado, Entrega, EstadoDaMontagem, ModoDaCliente } from '../model/montagem'
import Campo from './CampoDaMontagem'
import FormularioDeEndereco from './FormularioDeEndereco'

/**
 * O passo 1 da montagem — a cliente e a entrega.
 *
 * - **Cliente cadastrada**: a busca de `customer_list` (nome, e-mail, telefone — também pelos dígitos;
 *   nunca o documento), a convidada inclusa. Escolhida, a entrega vem no endereço padrão, ou "A cliente
 *   preenche no link" quando não há endereço salvo.
 * - **Cliente nova**: o contato (nome, e-mail, WhatsApp, documento opcional) e a entrega. O e-mail que
 *   já tem ficha avisa e oferece "Usar a ficha dela" / "Corrigir o e-mail".
 * - O endereço completo e os endereços salvos aparecem SÓ aqui e no pedido montado; nada vai ao
 *   aparelho.
 *
 * A leitura e o motivo do bloqueio são da página (a barra de baixo precisa deles); aqui só o desenho.
 *
 * **A leitura de um texto colado** (a folha é da página): em Cliente nova, o cartão escuro "Tem os dados
 * numa mensagem?" (some depois de uma leitura); em "Outro endereço" da cadastrada, "Colar de uma
 * mensagem" no formulário. Depois da leitura, o aviso no topo conta os campos, nomeia os que faltaram e
 * oferece "Ler outro texto" e "Desfazer"; cada campo preenchido diz "Lido do texto — confira." até ser
 * editado.
 */

const ROTULO_DO_CARTAO = 'font-body text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft'

const Cartao = ({ titulo, acao, escuro = false, children }: { titulo: string; acao?: ReactNode; escuro?: boolean; children: ReactNode }) => (
  <section
    aria-label={titulo}
    className={escuro ? 'rounded-lg bg-estrelinha-ink p-[18px] text-estrelinha-on-primary' : 'rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4'}
  >
    <div className="flex flex-wrap items-center justify-between gap-x-3">
      <h2 className={escuro ? 'font-body text-[15px] font-medium text-estrelinha-on-primary' : ROTULO_DO_CARTAO}>{titulo}</h2>
      {acao}
    </div>
    <div className="mt-2 space-y-3">{children}</div>
  </section>
)

const Opcao = ({
  nome,
  marcada,
  titulo,
  frase,
  aoMarcar,
}: {
  nome: string
  marcada: boolean
  titulo: string
  frase: string | null
  aoMarcar: () => void
}) => (
  <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-md px-1 py-2">
    <input type="radio" name={nome} checked={marcada} onChange={aoMarcar} className="mt-1 h-5 w-5 shrink-0 accent-estrelinha-primary" />
    <span className="min-w-0 flex-1 break-words">
      <span className="block text-base text-estrelinha-ink">{titulo}</span>
      {frase && <span className="block text-sm text-estrelinha-ink-soft">{frase}</span>}
    </span>
  </label>
)

export interface PassoDaClienteProps {
  estado: EstadoDaMontagem
  despachar: (acao: AcaoDaMontagem) => void
  entregaEfetiva: Entrega | null
  enderecos: { dado: EnderecoSalvo[] | undefined; carregando: boolean; falhou: boolean; tentarDeNovo: () => void }
  fichaDoEmail: ClienteDaMontagem | null
  aoUsarFicha: (c: ClienteDaMontagem) => void
  busca: BuscaDaMontagem
  refDoEmail: Ref<HTMLInputElement>
  aoCorrigirEmail: () => void
  /** Abre a folha da leitura no escopo da tela: contato e endereço (nova) ou só endereço (cadastrada). */
  aoColarTexto: (escopo: 'contact_and_address' | 'address') => void
  aoDesfazerLeitura: () => void
}

/** A linha de baixo de cada campo que a leitura preencheu e a Adri ainda não editou. */
const marcaDe = (estado: EstadoDaMontagem, campo: CampoLido): string | null => {
  if (!estado.marcas.includes(campo)) return null
  return campo === 'cep' && (estado.leitura?.conferidos.length ?? 0) > 0 ? LIDO_E_CONFERIDO_NO_CEP : LIDO_DO_TEXTO
}

const marcasDoEndereco = (estado: EstadoDaMontagem): Partial<Record<keyof EnderecoDigitado, string>> => {
  const marcas: Partial<Record<keyof EnderecoDigitado, string>> = {}
  for (const campo of ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] as const) {
    const m = marcaDe(estado, campo)
    if (m) marcas[campo] = m
  }
  return marcas
}

const AvisoDaLeitura = ({ estado, aoLerOutro, aoDesfazer }: { estado: EstadoDaMontagem; aoLerOutro: () => void; aoDesfazer: () => void }) => {
  if (!estado.leitura) return null
  const [linha1, linha2] = resumoDaLeitura(estado.leitura)
  return (
    <section aria-label="Leitura do texto" className="space-y-3 rounded-md border border-estrelinha-line bg-estrelinha-ground-deep p-3">
      <div role="status" className="space-y-1 text-sm text-estrelinha-ink">
        <p className="font-medium">{linha1}</p>
        <p className="break-words">{linha2}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={aoLerOutro} className="min-h-12 flex-1 rounded-sm px-4 text-sm font-medium text-estrelinha-primary">
          {LER_OUTRO_TEXTO}
        </button>
        <button type="button" onClick={aoDesfazer} className="min-h-12 flex-1 rounded-sm px-4 text-sm font-medium text-estrelinha-primary">
          {DESFAZER}
        </button>
      </div>
    </section>
  )
}

const Segmento = ({ modo, aoTrocar }: { modo: ModoDaCliente; aoTrocar: (m: ModoDaCliente) => void }) => (
  <div role="group" aria-label="Quem é a cliente" className="grid grid-cols-2 gap-1 rounded-md bg-estrelinha-ground-deep p-1">
    {(['cadastrada', 'nova'] as const).map((m) => (
      <button
        key={m}
        type="button"
        aria-pressed={modo === m}
        onClick={() => aoTrocar(m)}
        className="min-h-11 rounded-sm px-2 text-sm font-medium text-estrelinha-ink aria-pressed:bg-estrelinha-surface aria-pressed:text-estrelinha-primary-strong aria-pressed:shadow-sm"
      >
        {m === 'cadastrada' ? CLIENTE_CADASTRADA : CLIENTE_NOVA}
      </button>
    ))}
  </div>
)

export interface BuscaDaMontagem {
  termo: string
  aoBuscar: (termo: string) => void
  dado: ClienteDaMontagem[] | undefined
  carregando: boolean
  falhou: boolean
  tentarDeNovo: () => void
}

const BuscaDeCliente = ({ busca, aoEscolher }: { busca: BuscaDaMontagem; aoEscolher: (c: ClienteDaMontagem) => void }) => {
  const limpo = busca.termo.trim()
  return (
    <div className="space-y-3">
      <CampoDeBusca
        id="busca-da-montagem"
        rotulo="Buscar cliente"
        placeholder="Nome, e-mail ou telefone"
        atraso={CUSTOMER_SEARCH_DEBOUNCE_MS}
        aoBuscar={busca.aoBuscar}
        inicial={busca.termo}
      />
      {busca.carregando ? (
        <div aria-busy="true" aria-label="Carregando clientes" className="space-y-2">
          <Traco className="h-12 w-full" />
          <Traco className="h-12 w-full" />
        </div>
      ) : busca.falhou ? (
        <FalhaDoBloco tentarDeNovo={busca.tentarDeNovo} />
      ) : busca.dado && busca.dado.length === 0 ? (
        <p className="text-sm text-estrelinha-ink-soft">
          Ninguém com “{limpo}”. Se for a primeira compra, use <strong className="font-semibold text-estrelinha-ink">{CLIENTE_NOVA}</strong>.
        </p>
      ) : (
        <ul aria-label="Clientes" className="divide-y divide-estrelinha-line rounded-lg border border-estrelinha-line bg-estrelinha-surface">
          {(busca.dado ?? []).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => aoEscolher(c)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left">
                <Inicial cliente={c} media />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-base text-estrelinha-ink">{nomeDoCliente(c)}</span>
                  <span className="block break-words text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{linhaDaCliente(c)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const EntregaDaCadastrada = ({
  estado,
  despachar,
  entregaEfetiva,
  enderecos,
  aoColarTexto,
}: Pick<PassoDaClienteProps, 'estado' | 'despachar' | 'entregaEfetiva' | 'enderecos' | 'aoColarTexto'>) => {
  if (enderecos.carregando) {
    return (
      <div aria-busy="true" aria-label="Carregando endereços" className="space-y-2">
        <Traco className="h-12 w-full" />
      </div>
    )
  }
  if (enderecos.falhou) return <FalhaDoBloco tentarDeNovo={enderecos.tentarDeNovo} />
  const salvos = enderecos.dado ?? []
  const padrao = salvos.find((e) => e.is_default) ?? salvos[0] ?? null
  const outros = salvos.filter((e) => e !== padrao)
  const escolha = (entrega: Entrega, enderecoSalvoId: string | null = null) => despachar({ tipo: 'entrega', entrega, enderecoSalvoId })
  return (
    <div role="radiogroup" aria-label="Entrega" className="space-y-1">
      {padrao && (
        <Opcao nome="entrega" marcada={entregaEfetiva === 'padrao'} titulo={OPCOES_DE_ENTREGA.padrao.titulo} frase={enderecoEmLinha(padrao)} aoMarcar={() => escolha('padrao')} />
      )}
      {outros.length > 0 && (
        <Opcao
          nome="entrega"
          marcada={entregaEfetiva === 'salvo'}
          titulo={OPCOES_DE_ENTREGA.salvo.titulo}
          frase={null}
          aoMarcar={() => escolha('salvo', estado.enderecoSalvoId ?? outros[0].id)}
        />
      )}
      {entregaEfetiva === 'salvo' && (
        <div role="radiogroup" aria-label="Endereços salvos" className="ml-8 space-y-1">
          {outros.map((e) => (
            <Opcao
              key={e.id}
              nome="endereco-salvo"
              marcada={(estado.enderecoSalvoId ?? outros[0].id) === e.id}
              titulo={e.label?.trim() || enderecoEmLinha(e)}
              frase={e.label?.trim() ? enderecoEmLinha(e) : null}
              aoMarcar={() => escolha('salvo', e.id)}
            />
          ))}
        </div>
      )}
      <Opcao nome="entrega" marcada={entregaEfetiva === 'outro'} titulo={OPCOES_DE_ENTREGA.outro.titulo} frase={OPCOES_DE_ENTREGA.outro.frase} aoMarcar={() => escolha('outro')} />
      {entregaEfetiva === 'outro' && (
        <FormularioDeEndereco
          prefixo="outro"
          endereco={estado.endereco}
          marcas={marcasDoEndereco(estado)}
          aoColar={() => aoColarTexto('address')}
          aoCompletarPeloCep={(campos) => despachar({ tipo: 'endereco', campos, origem: 'cep' })}
          aoMudar={(campos) => despachar({ tipo: 'endereco', campos })}
          salvarNoCadastro={estado.salvarNoCadastro}
          aoTrocarSalvar={(valor) => despachar({ tipo: 'salvar-no-cadastro', valor })}
        />
      )}
      <Opcao nome="entrega" marcada={entregaEfetiva === 'link'} titulo={OPCOES_DE_ENTREGA.link.titulo} frase={OPCOES_DE_ENTREGA.link.frase} aoMarcar={() => escolha('link')} />
    </div>
  )
}

const PassoDaCliente = (p: PassoDaClienteProps) => {
  const { estado, despachar } = p
  const contato = estado.contato
  return (
    <div className="space-y-4">
      <Segmento modo={estado.modo} aoTrocar={(modo) => despachar({ tipo: 'modo', modo })} />
      <AvisoDaLeitura
        estado={estado}
        aoLerOutro={() => p.aoColarTexto(estado.leitura?.escopo ?? 'contact_and_address')}
        aoDesfazer={p.aoDesfazerLeitura}
      />
      {estado.modo === 'cadastrada' ? (
        estado.cliente ? (
          <>
            <Cartao
              titulo="Cliente"
              acao={
                <button type="button" onClick={() => despachar({ tipo: 'trocar-cliente' })} className="min-h-11 px-2 text-sm font-medium text-estrelinha-primary">
                  Trocar
                </button>
              }
            >
              <div className="flex items-center gap-3">
                <Inicial cliente={estado.cliente} />
                <span className="min-w-0 flex-1">
                  <span className="block break-words font-display text-[17px] font-bold text-estrelinha-ink">{nomeDoCliente(estado.cliente)}</span>
                  <span className="block text-sm text-estrelinha-ink-soft">{pedidosNaLoja(estado.cliente.pedidos)}</span>
                </span>
              </div>
              <div className="space-y-0.5 text-sm text-estrelinha-ink">
                <p className="break-words [overflow-wrap:anywhere]">{estado.cliente.email}</p>
                <p className={estado.cliente.phone?.trim() ? undefined : 'text-estrelinha-ink-soft'}>
                  {estado.cliente.phone?.trim() ? maskPhone(estado.cliente.phone) : SEM_TELEFONE_NO_CARTAO}
                </p>
              </div>
            </Cartao>
            <Cartao titulo="Entrega">
              <EntregaDaCadastrada
                estado={estado}
                despachar={despachar}
                entregaEfetiva={p.entregaEfetiva}
                enderecos={p.enderecos}
                aoColarTexto={p.aoColarTexto}
              />
            </Cartao>
          </>
        ) : (
          <BuscaDeCliente busca={p.busca} aoEscolher={(cliente) => despachar({ tipo: 'escolher-cliente', cliente })} />
        )
      ) : (
        <>
          {!estado.leitura && (
            <Cartao titulo={TEM_OS_DADOS_NUMA_MENSAGEM} escuro>
              <div className="flex items-start gap-3">
                <MessageSquareText aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-estrelinha-accent" />
                <p className="min-w-0 flex-1 break-words text-sm">{COLE_A_CONVERSA}</p>
              </div>
              <button
                type="button"
                onClick={() => p.aoColarTexto('contact_and_address')}
                className="min-h-12 w-full rounded-sm bg-estrelinha-surface px-4 text-base font-medium text-estrelinha-ink"
              >
                {COLAR_TEXTO_DA_CONVERSA}
              </button>
            </Cartao>
          )}
          <Cartao titulo="Contato">
            <Campo id="nova-nome" rotulo="Nome" marca={marcaDe(estado, 'nome')} placeholder="Como ela assina" autoComplete="name" valor={contato.nome} aoMudar={(v) => despachar({ tipo: 'contato', campos: { nome: v } })} />
            <Campo
              id="nova-email"
              rotulo="E-mail"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="nome@email.com"
              referencia={p.refDoEmail}
              marca={marcaDe(estado, 'email')}
              valor={contato.email}
              aoMudar={(v) => despachar({ tipo: 'contato', campos: { email: v } })}
            />
            {p.fichaDoEmail && (
              <div role="alert" className="space-y-3 rounded-md border border-estrelinha-line bg-estrelinha-ground-deep p-3">
                <p className="break-words text-sm text-estrelinha-ink [overflow-wrap:anywhere]">{avisoDaFicha(contato.email.trim(), p.fichaDoEmail)}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => p.aoUsarFicha(p.fichaDoEmail as ClienteDaMontagem)}
                    className="min-h-12 flex-1 rounded-sm bg-estrelinha-ink px-4 text-sm font-medium text-estrelinha-on-primary"
                  >
                    {USAR_A_FICHA}
                  </button>
                  <button type="button" onClick={p.aoCorrigirEmail} className="min-h-12 flex-1 rounded-sm px-4 text-sm font-medium text-estrelinha-primary">
                    {CORRIGIR_O_EMAIL}
                  </button>
                </div>
              </div>
            )}
            <Campo
              id="nova-whatsapp"
              rotulo="WhatsApp"
              placeholder="(51) 99999-9999"
              inputMode="tel"
              autoComplete="tel"
              marca={marcaDe(estado, 'whatsapp')}
              valor={contato.whatsapp}
              aoMudar={(v) => despachar({ tipo: 'contato', campos: { whatsapp: maskPhone(v) } })}
            />
            <Campo
              id="nova-documento"
              rotulo="CPF (opcional)"
              placeholder="000.000.000-00"
              marca={marcaDe(estado, 'documento')}
              inputMode="numeric"
              valor={contato.documento}
              aoMudar={(v) => despachar({ tipo: 'contato', campos: { documento: maskCpf(v) } })}
            />
          </Cartao>
          <Cartao titulo="Entrega">
            <div role="radiogroup" aria-label="Entrega" className="space-y-1">
              <Opcao nome="entrega-nova" marcada={p.entregaEfetiva === 'outro'} titulo={INFORMAR_AGORA} frase={null} aoMarcar={() => despachar({ tipo: 'entrega', entrega: 'outro' })} />
              <Opcao
                nome="entrega-nova"
                marcada={p.entregaEfetiva === 'link'}
                titulo={OPCOES_DE_ENTREGA.link.titulo}
                frase={OPCOES_DE_ENTREGA.link.frase}
                aoMarcar={() => despachar({ tipo: 'entrega', entrega: 'link' })}
              />
            </div>
          </Cartao>
          {p.entregaEfetiva === 'outro' && (
            <Cartao titulo={ENDERECO_DE_ENTREGA}>
              <FormularioDeEndereco
                prefixo="nova"
                endereco={estado.endereco}
                marcas={marcasDoEndereco(estado)}
                aoCompletarPeloCep={(campos) => despachar({ tipo: 'endereco', campos, origem: 'cep' })}
                aoMudar={(campos) => despachar({ tipo: 'endereco', campos })}
                salvarNoCadastro={estado.salvarNoCadastro}
                aoTrocarSalvar={(valor) => despachar({ tipo: 'salvar-no-cadastro', valor })}
              />
            </Cartao>
          )}
        </>
      )}
    </div>
  )
}

export default PassoDaCliente
