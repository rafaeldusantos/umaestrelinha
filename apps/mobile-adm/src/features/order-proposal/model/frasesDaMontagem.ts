import type { CepField } from '@estrelinha/core/customers'

import { nomeDoCliente, type ClienteDaMontagem, type EnderecoSalvo } from '@/entities/customer'

import { CAMPOS_DE_CONTATO_LIDOS, CAMPOS_DE_ENDERECO_LIDOS, type CampoLido, type LeituraNaTela } from './montagem'

/**
 * As frases do passo 1 da montagem — a cliente e o endereço. Um lugar só para a tela e o teste
 * lerem a mesma frase.
 */

export const CLIENTE_CADASTRADA = 'Cliente cadastrada'
export const CLIENTE_NOVA = 'Cliente nova'
export const OPCOES_DE_ENTREGA = {
  padrao: { titulo: 'Endereço padrão', frase: null },
  salvo: { titulo: 'Endereço salvo', frase: null },
  outro: { titulo: 'Outro endereço', frase: 'Digite ou cole de uma mensagem.' },
  link: { titulo: 'A cliente preenche no link', frase: 'Ela informa o endereço ao concluir.' },
} as const
export const INFORMAR_AGORA = 'Informar o endereço agora'
export const USAR_A_FICHA = 'Usar a ficha dela'
export const CORRIGIR_O_EMAIL = 'Corrigir o e-mail'

export const pedidosDaCliente = (n: number): string => (n === 1 ? '1 pedido' : `${n} pedidos`)
export const pedidosNaLoja = (n: number): string => `${pedidosDaCliente(n)} na loja`
export const SEM_TELEFONE_NO_CARTAO = 'sem telefone'
export const linhaDaCliente = (c: Pick<ClienteDaMontagem, 'email' | 'pedidos'>): string => `${c.email} · ${pedidosDaCliente(c.pedidos)}`
export const avisoDaFicha = (email: string, c: ClienteDaMontagem): string =>
  `${email} já é de ${nomeDoCliente(c)} · ${pedidosDaCliente(c.pedidos)}. Para não nascer uma segunda ficha, use a dela.`

/** "Rua das Flores, 120, ap 3 — Centro, Porto Alegre/RS · 90000-000". */
export const enderecoEmLinha = (e: Pick<EnderecoSalvo, 'street' | 'number' | 'complement' | 'neighborhood' | 'city' | 'state' | 'cep'>): string =>
  `${[e.street, e.number, e.complement].filter((p) => p && p.trim() !== '').join(', ')} — ${e.neighborhood}, ${e.city}/${e.state} · ${e.cep}`

export const DICA_CEP_NAO_ACHADO = 'Não achei este CEP. Confira, ou preencha o endereço à mão.'
export const dicaCepAchado = (cidade: string, uf: string) => `${cidade}/${uf} · endereço completado pelo CEP.`
export const SALVAR_NO_CADASTRO = 'Salvar no cadastro da cliente'
export const SO_GRAVA_AO_CRIAR = 'Só é gravado quando você criar o link.'

// A leitura de um texto colado (a folha "Colar texto").
export const TEM_OS_DADOS_NUMA_MENSAGEM = 'Tem os dados numa mensagem?'
export const COLE_A_CONVERSA = 'Cole a conversa do WhatsApp. Eu leio e preencho nome, contato e endereço — você confere antes de seguir.'
export const COLAR_TEXTO_DA_CONVERSA = 'Colar texto da conversa'
export const COLAR_DE_UMA_MENSAGEM = 'Colar de uma mensagem'
export const FOLHA_DA_LEITURA = {
  contact_and_address: {
    titulo: 'Colar o texto da conversa',
    frase: 'Eu leio e preencho os campos da cliente e da entrega. Você confere tudo antes de seguir.',
  },
  address: { titulo: 'Colar o endereço', frase: 'Eu leio só o endereço. Os dados da ficha dela não mudam.' },
} as const
export const TEXTO_DA_CONVERSA = 'Texto da conversa'
export const DICA_DO_TEXTO = 'Cole aqui a mensagem com nome, e-mail, telefone e endereço'
export const TEXTO_NAO_FICA_GUARDADO = 'O texto não fica guardado.'
export const CANCELAR = 'Cancelar'
export const PREENCHER_A_MAO = 'Preencher à mão'
export const LER_O_TEXTO = 'Ler o texto'
export const LENDO_O_TEXTO = 'Lendo o texto…'
export const LIDO_DO_TEXTO = 'Lido do texto — confira.'
export const LIDO_E_CONFERIDO_NO_CEP = 'Lido do texto — conferido no serviço de CEP.'
export const LER_OUTRO_TEXTO = 'Ler outro texto'
export const DESFAZER = 'Desfazer'
export const LEITURA_DESFEITA = ['Leitura desfeita.', 'Os campos voltaram ao que estava antes.']
export const SEM_DADOS_NO_TEXTO =
  'Não encontrei nome, contato nem endereço neste texto. Confira se colou a mensagem certa, ou preencha à mão.'
export const LEITURA_FORA_DO_AR = 'A leitura está fora do ar agora. Feche e preencha à mão — nada do que você já fez se perde.'
export const LEITURAS_DEMAIS =
  'Foram muitas leituras em pouco tempo. Espere alguns minutos para ler de novo, ou preencha à mão — nada do que você já fez se perde.'
export const contadorDoTexto = (n: number, max: number) => `${n}/${max}`

/** O nome de cada campo no aviso ("Não achei: e-mail, CPF, complemento."). */
const NOME_DO_CAMPO: Record<CampoLido, string> = {
  nome: 'nome',
  email: 'e-mail',
  whatsapp: 'WhatsApp',
  documento: 'CPF',
  cep: 'CEP',
  rua: 'rua',
  numero: 'número',
  complemento: 'complemento',
  bairro: 'bairro',
  cidade: 'cidade',
  uf: 'UF',
}
const NOME_DO_CAMPO_DO_CEP: Partial<Record<CepField, string>> = { street: 'rua', neighborhood: 'bairro', city: 'cidade' }

/** "a, b e c". */
const emLista = (itens: string[]): string => (itens.length <= 1 ? itens.join('') : `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`)

/** As duas linhas do aviso de uma leitura: quantos campos, e o que faltou e o que o CEP conferiu. */
export const resumoDaLeitura = (l: LeituraNaTela): [string, string] => {
  const campos = l.escopo === 'address' ? CAMPOS_DE_ENDERECO_LIDOS : [...CAMPOS_DE_CONTATO_LIDOS, ...CAMPOS_DE_ENDERECO_LIDOS]
  const faltaram = campos.filter((c) => !l.achados.includes(c)).map((c) => NOME_DO_CAMPO[c])
  const doCep = l.conferidos.map((c) => NOME_DO_CAMPO_DO_CEP[c]).filter((n): n is string => !!n)
  const partes = [faltaram.length === 0 ? 'Achei todos os campos.' : `Não achei: ${faltaram.join(', ')}.`]
  if (doCep.length > 0) partes.push(`O CEP conferiu ${emLista(doCep)}.`)
  else if (l.cepSemConferencia) partes.push('Não consegui conferir o CEP.')
  return [`Preenchi ${l.achados.length} de ${campos.length} campos. Confira antes de seguir.`, partes.join(' ')]
}
