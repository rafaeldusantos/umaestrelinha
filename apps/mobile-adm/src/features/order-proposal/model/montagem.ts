import { isValidEmail, normalizeEmail, stripCep } from '@estrelinha/core/validators'
import type { CepField, CustomerParseMode, ParsedAddress, ParsedContact } from '@estrelinha/core/customers'
import type { PecaParaProposta } from '@estrelinha/core/proposals'

import type { ClienteDaMontagem } from '@/entities/customer'

import { COMBINADO_DESLIGADO, type CupomAplicado, type DescontoCombinado } from './descontos'
import { MOTIVO_SEM_PECA, linhaRelida, pecasNaSacola, type LinhaDaSacola } from './sacola'

/**
 * O estado da MONTAGEM de um pedido no app — memória da tela: nada vai ao servidor antes do
 * "Criar link". Ao aparelho vai só o rascunho das peças e dos descontos (`rascunho.ts`, o dono da
 * chave), para a volta involuntária; o resto some ao fechar a montagem. Puro: o redutor, o "tem algo
 * preenchido?" e o motivo do bloqueio de cada passo.
 */

export const PASSOS_DA_MONTAGEM = ['Cliente', 'Peças', 'Descontos', 'Revisar'] as const
export type NumeroDoPasso = 1 | 2 | 3 | 4
export const ULTIMO_PASSO: NumeroDoPasso = 4

export type ModoDaCliente = 'cadastrada' | 'nova'

/**
 * Onde a peça chega. Cadastrada: o endereço padrão, outro salvo, outro endereço digitado ou a cliente
 * preenche no link. Nova: informar agora (`outro`) ou a cliente preenche no link.
 */
export type Entrega = 'padrao' | 'salvo' | 'outro' | 'link'

export interface EnderecoDigitado {
  cep: string
  rua: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface ContatoDigitado {
  nome: string
  email: string
  whatsapp: string
  documento: string
}

export interface EstadoDaMontagem {
  modo: ModoDaCliente
  /** A cliente cadastrada escolhida (ou a ficha que a Adri decidiu usar). */
  cliente: ClienteDaMontagem | null
  /** `null` ⇒ ainda não escolhida: vale o padrão (o endereço padrão, ou o link sem endereço salvo). */
  entrega: Entrega | null
  enderecoSalvoId: string | null
  endereco: EnderecoDigitado
  salvarNoCadastro: boolean
  contato: ContatoDigitado
  /** A sacola (o passo 2): as linhas escolhidas, na ordem em que entraram. */
  pecas: LinhaDaSacola[]
  /** O cupom aplicado (o passo 3), já conferido pela prévia; `null` sem cupom. */
  cupom: CupomAplicado | null
  /** O desconto combinado (o passo 3), como está nos campos. */
  combinado: DescontoCombinado
  /** A última leitura de um texto colado — o aviso do passo 1 —, ou `null`. */
  leitura: LeituraNaTela | null
  /** Os campos que a leitura preencheu e a Adri ainda não editou ("Lido do texto — confira."). */
  marcas: CampoLido[]
  /** O estado de antes da última leitura — é para onde "Desfazer" volta, exatamente (menos as peças, que ficam). */
  antesDaLeitura: EstadoDaMontagem | null
  /** A observação interna (o passo 4), como está no campo. Só para quem administra; a cliente nunca a vê. */
  observacao: string
}

/** Um campo do passo 1 que a leitura de um texto pode preencher. */
export type CampoLido = keyof ContatoDigitado | keyof EnderecoDigitado

export const CAMPOS_DE_CONTATO_LIDOS: readonly CampoLido[] = ['nome', 'email', 'whatsapp', 'documento']
export const CAMPOS_DE_ENDERECO_LIDOS: readonly CampoLido[] = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf']

/** O que a leitura de um texto entregou, já com o CEP conferido no serviço (`mergeCep`). */
export interface LeituraRecebida {
  escopo: CustomerParseMode
  contato: ParsedContact | null
  endereco: ParsedAddress
  /** Os campos que vieram do serviço de CEP. */
  conferidos: CepField[]
}

/** O resumo da leitura que o aviso do passo 1 desenha. */
export interface LeituraNaTela {
  escopo: CustomerParseMode
  achados: CampoLido[]
  conferidos: CepField[]
  /** O texto trouxe um CEP, e o serviço não o conferiu. */
  cepSemConferencia: boolean
}

export const ENDERECO_VAZIO: EnderecoDigitado = { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' }
const CONTATO_VAZIO: ContatoDigitado = { nome: '', email: '', whatsapp: '', documento: '' }

export const montagemVazia = (): EstadoDaMontagem => ({
  modo: 'cadastrada',
  cliente: null,
  entrega: null,
  enderecoSalvoId: null,
  endereco: ENDERECO_VAZIO,
  salvarNoCadastro: true,
  contato: CONTATO_VAZIO,
  pecas: [],
  cupom: null,
  combinado: COMBINADO_DESLIGADO,
  leitura: null,
  marcas: [],
  antesDaLeitura: null,
  observacao: '',
})

export type AcaoDaMontagem =
  | { tipo: 'modo'; modo: ModoDaCliente }
  | { tipo: 'escolher-cliente'; cliente: ClienteDaMontagem }
  | { tipo: 'trocar-cliente' }
  | { tipo: 'entrega'; entrega: Entrega; enderecoSalvoId?: string | null }
  /** `origem: 'cep'`: o serviço de CEP completou — não é edição da Adri, e as marcas ficam. */
  | { tipo: 'endereco'; campos: Partial<EnderecoDigitado>; origem?: 'cep' }
  | { tipo: 'contato'; campos: Partial<ContatoDigitado> }
  | { tipo: 'salvar-no-cadastro'; valor: boolean }
  /** "Usar a ficha dela": a nova vira a cadastrada; com CEP completo, o endereço digitado vira "Outro endereço". */
  | { tipo: 'usar-ficha'; cliente: ClienteDaMontagem }
  /** A leitura de um texto colado preencheu o que achou. */
  | { tipo: 'leitura'; lida: LeituraRecebida }
  /** "Desfazer": volta exatamente ao estado de antes da última leitura. */
  | { tipo: 'desfazer-leitura' }
  /** O passo 2: acrescentar uma linha à sacola, trocar a linha da mesma chave (editar), tirar uma linha. */
  | { tipo: 'acrescentar-peca'; linha: LinhaDaSacola }
  | { tipo: 'atualizar-peca'; linha: LinhaDaSacola }
  | { tipo: 'remover-peca'; chave: string }
  /** O passo 3: aplicar (ou tirar, com `null`) o cupom; mudar os campos do desconto combinado. */
  | { tipo: 'cupom'; cupom: CupomAplicado | null }
  | { tipo: 'combinado'; campos: Partial<DescontoCombinado> }
  /** O passo 4: a observação interna. */
  | { tipo: 'observacao'; texto: string }
  /** Editar: a montagem reaberta de um pedido montado, inteira. */
  | { tipo: 'carregar'; estado: EstadoDaMontagem }
  /** O rascunho guardado neste celular: as peças, o cupom e o desconto combinado voltam; o resto fica. */
  | { tipo: 'retomar-rascunho'; pecas: LinhaDaSacola[]; cupom: CupomAplicado | null; combinado: DescontoCombinado }
  /** Os preços mudaram no servidor: as linhas passam a mostrar o preço (e a foto) relidos do catálogo. */
  | { tipo: 'reprecificar'; catalogo: readonly PecaParaProposta[] }

export const cepCompleto = (cep: string): boolean => stripCep(cep).length === 8

const SEM_LEITURA = { leitura: null, marcas: [] as CampoLido[], antesDaLeitura: null }

/** Editar um campo tira a marca dele. */
const semAsMarcasDe = (marcas: CampoLido[], campos: object): CampoLido[] => {
  const editados = new Set(Object.keys(campos))
  return marcas.some((m) => editados.has(m)) ? marcas.filter((m) => !editados.has(m)) : marcas
}

/**
 * Aplica a leitura: preenche SÓ o que ela achou (o resto fica como estava), marca esses campos, e
 * guarda o estado de antes para o "Desfazer". No escopo `address` o contato nunca muda — a leitura não
 * troca dados de uma ficha que existe.
 */
export const aplicarLeitura = (estado: EstadoDaMontagem, lida: LeituraRecebida): EstadoDaMontagem => {
  const achados: CampoLido[] = []
  const contato = { ...estado.contato }
  if (lida.escopo === 'contact_and_address' && lida.contato) {
    const c = lida.contato
    const pares: [keyof ContatoDigitado, string][] = [['nome', c.name], ['email', c.email], ['whatsapp', c.phone], ['documento', c.cpf]]
    for (const [campo, valor] of pares) if (valor !== '') {
      contato[campo] = valor
      achados.push(campo)
    }
  }
  const endereco = { ...estado.endereco }
  const e = lida.endereco
  const paresDoEndereco: [keyof EnderecoDigitado, string][] = [
    ['cep', e.cep], ['rua', e.street], ['numero', e.number], ['complemento', e.complement], ['bairro', e.neighborhood], ['cidade', e.city], ['uf', e.state],
  ]
  let achouEndereco = false
  for (const [campo, valor] of paresDoEndereco) if (valor !== '') {
    endereco[campo] = valor
    achados.push(campo)
    achouEndereco = true
  }
  return {
    ...estado,
    contato,
    endereco,
    entrega: achouEndereco ? 'outro' : estado.entrega,
    enderecoSalvoId: achouEndereco ? null : estado.enderecoSalvoId,
    marcas: [...new Set([...estado.marcas, ...achados])],
    leitura: { escopo: lida.escopo, achados, conferidos: lida.conferidos, cepSemConferencia: e.cep !== '' && lida.conferidos.length === 0 },
    antesDaLeitura: estado,
  }
}

export const reduzirMontagem = (estado: EstadoDaMontagem, acao: AcaoDaMontagem): EstadoDaMontagem => {
  switch (acao.tipo) {
    case 'modo':
      if (acao.modo === estado.modo) return estado
      // Trocar o segmento limpa a cliente, o endereço e as marcas.
      return {
        ...montagemVazia(),
        modo: acao.modo,
        pecas: estado.pecas,
        cupom: estado.cupom,
        combinado: estado.combinado,
        observacao: estado.observacao,
        entrega: acao.modo === 'nova' ? 'outro' : null,
      }
    case 'escolher-cliente':
      return { ...estado, cliente: acao.cliente, entrega: null, enderecoSalvoId: null, endereco: ENDERECO_VAZIO, salvarNoCadastro: true, ...SEM_LEITURA }
    case 'trocar-cliente':
      return { ...estado, cliente: null, entrega: null, enderecoSalvoId: null, endereco: ENDERECO_VAZIO, salvarNoCadastro: true, ...SEM_LEITURA }
    case 'entrega':
      // Sair de "Outro endereço" deixa a leitura para trás: o aviso falaria de campos que não estão na tela.
      return { ...estado, entrega: acao.entrega, enderecoSalvoId: acao.enderecoSalvoId ?? null, ...(acao.entrega === 'outro' ? {} : SEM_LEITURA) }
    case 'endereco':
      return {
        ...estado,
        endereco: { ...estado.endereco, ...acao.campos },
        marcas: acao.origem === 'cep' ? estado.marcas : semAsMarcasDe(estado.marcas, acao.campos),
      }
    case 'contato':
      return { ...estado, contato: { ...estado.contato, ...acao.campos }, marcas: semAsMarcasDe(estado.marcas, acao.campos) }
    case 'leitura':
      return aplicarLeitura(estado, acao.lida)
    case 'desfazer-leitura':
      // Volta o passo 1 ao estado de antes da leitura; as peças e os descontos são de outros passos e
      // ficam como estão.
      return estado.antesDaLeitura
        ? { ...estado.antesDaLeitura, pecas: estado.pecas, cupom: estado.cupom, combinado: estado.combinado, observacao: estado.observacao }
        : estado
    case 'salvar-no-cadastro':
      return { ...estado, salvarNoCadastro: acao.valor }
    case 'acrescentar-peca':
      return { ...estado, pecas: [...estado.pecas, acao.linha] }
    case 'atualizar-peca':
      return { ...estado, pecas: estado.pecas.map((l) => (l.chave === acao.linha.chave ? acao.linha : l)) }
    case 'remover-peca':
      return { ...estado, pecas: estado.pecas.filter((l) => l.chave !== acao.chave) }
    case 'cupom':
      return { ...estado, cupom: acao.cupom }
    case 'combinado':
      return { ...estado, combinado: { ...estado.combinado, ...acao.campos } }
    case 'observacao':
      return { ...estado, observacao: acao.texto }
    case 'carregar':
      return acao.estado
    case 'retomar-rascunho':
      return { ...estado, pecas: acao.pecas, cupom: acao.cupom, combinado: acao.combinado }
    case 'reprecificar':
      return { ...estado, pecas: estado.pecas.map((l) => linhaRelida(l, acao.catalogo)) }
    case 'usar-ficha': {
      const comEndereco = cepCompleto(estado.endereco.cep)
      // A leitura vira leitura só de endereço: as marcas de contato saem junto (e, sem o endereço, todas).
      const doEndereco = (campos: CampoLido[]) => (comEndereco ? campos.filter((c) => CAMPOS_DE_ENDERECO_LIDOS.includes(c)) : [])
      return {
        ...estado,
        modo: 'cadastrada',
        cliente: acao.cliente,
        entrega: comEndereco ? 'outro' : null,
        enderecoSalvoId: null,
        endereco: comEndereco ? estado.endereco : ENDERECO_VAZIO,
        contato: CONTATO_VAZIO,
        marcas: doEndereco(estado.marcas),
        leitura:
          estado.leitura && comEndereco ? { ...estado.leitura, escopo: 'address', achados: doEndereco(estado.leitura.achados) } : null,
        antesDaLeitura: comEndereco ? estado.antesDaLeitura : null,
      }
    }
  }
}

/** Algo foi preenchido? (cliente, nome, e-mail, peças ou CEP) — é o que faz o "x" perguntar antes. */
export const montagemPreenchida = (e: EstadoDaMontagem): boolean =>
  e.cliente !== null ||
  e.contato.nome.trim() !== '' ||
  e.contato.email.trim() !== '' ||
  e.pecas.length > 0 ||
  stripCep(e.endereco.cep) !== ''

/** O endereço digitado tem CEP, rua, número, bairro, cidade e UF (o complemento é opcional). */
export const enderecoCompleto = (e: EnderecoDigitado): boolean =>
  cepCompleto(e.cep) && [e.rua, e.numero, e.bairro, e.cidade, e.uf].every((c) => c.trim() !== '')

export const MOTIVO_ESCOLHA_A_CLIENTE = 'Escolha a cliente para continuar.'
export const MOTIVO_FALTA_O_NOME = 'Falta o nome da cliente.'
export const MOTIVO_FALTA_O_EMAIL = 'Falta o e-mail da cliente — é por ele que o pedido chega a ela.'
export const MOTIVO_CONFIRA_O_EMAIL = 'Confira o e-mail da cliente.'
export const MOTIVO_EMAIL_COM_FICHA = 'Este e-mail já tem ficha. Use a ficha dela ou corrija o e-mail.'
/** O motivo do bloqueio do passo 2, ou `null`: a sacola precisa de ao menos uma peça. */
export const motivoDoPassoPecas = (e: EstadoDaMontagem): string | null => (e.pecas.length === 0 ? MOTIVO_SEM_PECA : null)

export const MOTIVO_COMPLETE_O_ENDERECO = "Complete o endereço, ou escolha 'A cliente preenche no link'."

/**
 * O motivo do bloqueio do passo 1, ou `null`. `entregaEfetiva` é a entrega já resolvida (o padrão de
 * quem não escolheu); `temFicha` diz se o e-mail da cliente nova já pertence a uma ficha.
 */
export const motivoDoPassoCliente = (
  e: EstadoDaMontagem,
  { entregaEfetiva, temFicha }: { entregaEfetiva: Entrega | null; temFicha: boolean },
): string | null => {
  if (e.modo === 'cadastrada') {
    if (!e.cliente) return MOTIVO_ESCOLHA_A_CLIENTE
  } else {
    if (e.contato.nome.trim() === '') return MOTIVO_FALTA_O_NOME
    if (e.contato.email.trim() === '') return MOTIVO_FALTA_O_EMAIL
    if (!isValidEmail(normalizeEmail(e.contato.email.trim()))) return MOTIVO_CONFIRA_O_EMAIL
    if (temFicha) return MOTIVO_EMAIL_COM_FICHA
  }
  if (entregaEfetiva === 'outro' && !enderecoCompleto(e.endereco)) return MOTIVO_COMPLETE_O_ENDERECO
  return null
}

// As frases da casca da montagem.
export const FECHAR_A_MONTAGEM = 'Fechar a montagem'
export const MONTAR_PEDIDO = 'Montar pedido'
export const SAIR_TITULO = 'Sair sem criar o link?'
export const SAIR_FRASE = 'Nada foi gravado ainda. A montagem se perde ao sair.'
/** Com peças na sacola: o que fica guardado neste celular, e o que não fica. */
export const SAIR_FRASE_COM_RASCUNHO =
  'Nada foi gravado ainda. Você pode guardar as peças e os descontos neste celular para continuar depois. Os dados da cliente e o motivo do desconto não ficam guardados.'
export const GUARDAR_RASCUNHO = 'Guardar rascunho'
export const DESCARTAR = 'Descartar'
export const RASCUNHO_RETOMADO = 'Rascunho retomado: as peças e os descontos voltaram.'
export const RASCUNHO_SEM_CLIENTE = 'A cliente e o motivo do desconto não ficam guardados — escolha e escreva de novo.'
export const pecasForaDoCatalogo = (n: number): string =>
  n === 1 ? '1 peça do rascunho saiu do catálogo e não voltou.' : `${n} peças do rascunho saíram do catálogo e não voltaram.`
export const CONTINUAR_MONTANDO = 'Continuar montando'
export const SAIR = 'Sair'
export const CONTINUAR = 'Continuar'
export const NENHUMA_PECA = 'Nenhuma peça ainda'
export const USANDO_A_FICHA = (nome: string) => `Usando a ficha de ${nome}.`
export const ENDERECO_LIDO_FICOU_COMO_OUTRO = 'O endereço lido do texto ficou como “Outro endereço”.'
export const ENTREGA_NO_PADRAO = 'A entrega veio no endereço padrão dela.'

export const passoDeQuatro = (n: NumeroDoPasso): string => `Passo ${n} de 4 · ${PASSOS_DA_MONTAGEM[n - 1]}`
export const itensDaBarra = (sacola: readonly LinhaDaSacola[]): string => {
  const pecas = pecasNaSacola(sacola)
  return pecas === 0 ? NENHUMA_PECA : `Itens · ${pecas === 1 ? '1 peça' : `${pecas} peças`} · frete à parte`
}

