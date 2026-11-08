import { nomeDoCliente, type ClienteDaMontagem, type EnderecoSalvo } from '@/entities/customer'

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
