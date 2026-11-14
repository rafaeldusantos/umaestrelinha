// O texto do card "Perfil de estilo da loja" no painel e do modal da prévia. Mora aqui para o painel
// e os testes lerem a mesma frase, em vez de cada tela escrever a sua.

import type { StyleProfile } from './types.ts'

/** O nome que a dona lê, e a frase que diz o que o perfil veste. */
export const STYLE_PROFILE_LABELS: Record<StyleProfile, { name: string; description: string }> = {
  padrao: {
    name: 'Padrão',
    description: 'Ardósia e ouro, a cara de sempre da loja.',
  },
  'black-friday': {
    name: 'Black Friday',
    description: 'Preto e ouro, para a campanha.',
  },
}

export const STYLE_PROFILE_COPY = {
  title: 'Perfil de estilo da loja',
  description:
    'Muda só as cores da loja. Textos, blocos da Home, preços e menu continuam iguais, e voltar ao Padrão é a mesma escolha.',
  /** Quanto tempo leva para todos verem — o aviso do card. */
  notice:
    'Depois de salvar, quem abrir a loja já vê o perfil novo nas páginas de produto e de categoria em até 5 minutos, e nas outras páginas em até 1 hora. Quem já está com a loja aberta vê ao trocar de página.',
  inUse: 'Em uso',
  previewAction: 'Ver a loja com este perfil',
  save: 'Salvar',
  saved: 'Perfil salvo. Quem abrir a loja vê o perfil novo em até 1 hora.',
  previewSubtitle: 'Prévia, sem salvar. A loja publicada não muda.',
  close: 'Fechar',
  /** A leitura da configuração falhou: o card não sabe qual perfil está salvo. */
  readFailed:
    'Não foi possível ler o perfil salvo da loja. Enquanto ele não carregar, as opções ficam desabilitadas.',
  retry: 'Tentar de novo',
  /** A gravação está parada à espera da rede. */
  offline:
    'Sem conexão. O perfil ainda não foi salvo: ele é gravado quando a conexão voltar, com esta página aberta.',
  /** O rótulo acessível do grupo das duas opções. */
  groupLabel: 'Perfil de estilo',
} as const

/** O título do modal da prévia: "A loja com o perfil Black Friday". */
export const styleProfilePreviewTitle = (profile: StyleProfile): string =>
  `A loja com o perfil ${STYLE_PROFILE_LABELS[profile].name}`
