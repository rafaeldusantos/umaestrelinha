// Feature 31 — o guia de material, como **dado**.
//
// O desenho é o dos artboards `5MC-0` (desktop) e `6AU-0` (mobile). O conteúdo mora aqui, e não
// dentro dos componentes, por três motivos que já custaram caro neste repositório:
//
// 1. **A âncora é contrato.** `/como-enviar-seu-material-de-dna#cinzas` é o link que a página do
//    produto monta desde a feature 22 (`MaterialNotice`), e `materialAnchor` é quem o produz. Com o
//    conteúdo em dado, um teste percorre `MATERIAL_KINDS` e prova que **todo** material tem destino;
//    com o conteúdo em JSX, a cobertura vira leitura de código.
// 2. **Um lugar para a dona corrigir.** Quantidade, recipiente e ordem dos passos mudam com a
//    prática do ateliê. Espalhados em oito componentes, mudam em sete.
// 3. **A mesma lista serve duas superfícies.** No mobile as fichas são acordeão e no desktop saem
//    abertas — mesmo dado, duas montagens.
//
// O tom é restrição de produto, não escolha de copy (`CLAUDE.md`): quem lê isto muitas vezes acabou
// de perder alguém, e o material que vai postar não tem segunda via.

import { MATERIAL_KINDS, materialAnchor, type MaterialKind } from '@estrelinha/core/material'
import { MATERIAL_GUIDE_PATH, materialGuideHref } from '@estrelinha/core/routes'
import type { EstrelinhaIconName } from '@estrelinha/ui/icons'

/**
 * O caminho canônico da página, reexportado de `@estrelinha/core/routes`.
 *
 * A string mora lá porque quem linka para o guia são `entities` e outros `widgets`, que pela regra de
 * camadas não podem importar deste slice. Aqui ela só reaparece com o nome que o guia usa.
 */
export const GUIA_MATERIAL_PATH = MATERIAL_GUIDE_PATH

/** `/como-enviar-seu-material-de-dna#cinzas` — o destino do link da página do produto. */
export const guiaMaterialHref = (kind: MaterialKind): string =>
  materialGuideHref(materialAnchor(kind))

// ---------------------------------------------------------------------------------------------
// Os quatro passos
// ---------------------------------------------------------------------------------------------

export interface PassoDoEnvio {
  numero: string
  titulo: string
  texto: string
  icone: EstrelinhaIconName
}

export const PASSOS_DO_ENVIO: readonly PassoDoEnvio[] = [
  {
    numero: '01',
    titulo: 'Escolha sua joia',
    texto:
      'Finalize o pedido na loja. Depois do pagamento confirmado, você recebe o endereço de envio no WhatsApp.',
    icone: 'passo-escolha',
  },
  {
    numero: '02',
    titulo: 'Prepare o material',
    texto:
      'Encontre abaixo o seu tipo de material e siga a quantidade e o recipiente indicados.',
    icone: 'passo-material',
  },
  {
    numero: '03',
    titulo: 'Embale e identifique',
    texto: 'Plástico filme, saquinho bem vedado e seu nome completo por fora. Nada solto na caixa.',
    icone: 'passo-embalagem',
  },
  {
    numero: '04',
    titulo: 'Poste e envie o código',
    texto:
      'Prefira SEDEX ou PAC. Mande o código de rastreio no WhatsApp e acompanhamos junto com você.',
    icone: 'envio',
  },
]

// ---------------------------------------------------------------------------------------------
// As fichas ricas — os três materiais que geram mais dúvida
// ---------------------------------------------------------------------------------------------

/**
 * Um aviso dentro da ficha. **Dois tons, e a diferença é o remédio**, não a intensidade:
 *
 * - `calma` é informação que tranquiliza ("se descongelar no caminho, a joia não é afetada") e sai
 *   sobre `serenity`;
 * - `alerta` é um erro que estraga o material ("nunca use fita adesiva") e sai sobre o rosa de
 *   advertência, com a barra à esquerda.
 *
 * Um tom só faria a cliente ler as duas coisas com o mesmo peso — e a que importa é a segunda.
 */
export type TomDoAviso = 'calma' | 'alerta'

export interface AvisoDaFicha {
  tom: TomDoAviso
  texto: string
  icone?: EstrelinhaIconName
}

export interface PassoDePreparo {
  texto: string
  icone: EstrelinhaIconName
}

export interface FichaDeMaterial {
  /** O material do catálogo. É ele que produz a âncora. */
  kind: MaterialKind
  /**
   * Outros `MaterialKind` que esta mesma ficha atende.
   *
   * `pelo_pet` e `penas` **não têm ficha própria no board**, e não é omissão: o preparo é o mesmo do
   * cabelo (amarrar, embrulhar, identificar). Cada um deles ainda precisa de uma âncora alcançável,
   * porque a página do produto endereça por `MaterialKind` — então a ficha carrega as três.
   */
  tambem?: readonly MaterialKind[]
  titulo: string
  icone: EstrelinhaIconName
  quantidade: { valor: string; nota: string }
  /** `RECIPIENTES ACEITOS` na ficha de leite e cinzas, `TAMBÉM VALE PARA` na de cabelos. */
  listaTitulo: string
  lista: readonly string[]
  passos: readonly PassoDePreparo[]
  avisos: readonly AvisoDaFicha[]
  /** O vídeo desta ficha, se houver — o id é resolvido em `videos.ts`. */
  videoId?: string
}

export const FICHAS_DE_MATERIAL: readonly FichaDeMaterial[] = [
  {
    kind: 'leite_materno',
    titulo: 'Leite materno',
    icone: 'frasco-leite',
    quantidade: { valor: '10 ml', nota: 'de preferência do meio da mamada' },
    listaTitulo: 'Recipientes aceitos',
    lista: [
      'Garrafinha PET de até 200 ml',
      'Tubete plástico',
      'Vidrinho de shampoo tamanho viagem',
      'Saquinho de armazenamento de leite',
    ],
    passos: [
      { texto: 'Colete cerca de 10 ml no recipiente', icone: 'coleta-frasco' },
      { texto: 'Feche bem a tampa, sem risco de vazar', icone: 'tampa-vedada' },
      { texto: 'Envolva o frasco com plástico filme', icone: 'plastico-filme' },
      { texto: 'Coloque em saco zip e escreva seu nome completo', icone: 'saco-identificado' },
    ],
    avisos: [
      {
        tom: 'calma',
        texto:
          'Envie congelado se puder. Se descongelar no caminho, a qualidade da joia não é afetada.',
      },
      {
        tom: 'calma',
        texto:
          'Guardamos seu leite congelado por até 1 ano — para uma nova joia, não precisa enviar de novo.',
      },
    ],
    videoId: 'H4XRcc0ZoUA',
  },
  {
    kind: 'cabelo',
    tambem: ['pelo_pet', 'penas'],
    titulo: 'Cabelos e pelos',
    icone: 'mecha-cabelo',
    quantidade: { valor: '1 mecha', nota: 'uma mecha fina já é suficiente' },
    listaTitulo: 'Também vale para',
    lista: ['Pelos de pet', 'Bigodes (vibrissas)', 'Penas'],
    passos: [
      { texto: 'Amarre a mecha com linha de costura', icone: 'mecha-amarrada' },
      { texto: 'Embrulhe em papel alumínio ou toalha, sem dobrar os fios', icone: 'papel-aluminio' },
      { texto: 'Guarde no saquinho com seu nome completo', icone: 'saco-identificado' },
    ],
    avisos: [
      {
        tom: 'alerta',
        texto:
          'Nunca use fita adesiva para prender os fios: eles grudam e podem se perder no processo.',
      },
      {
        tom: 'calma',
        texto:
          'Só cabelos, pelos e bigodes podem ir por carta registrada — entre duas folhas de papel.',
        icone: 'carta-registrada',
      },
    ],
    videoId: '5uxMagYpWD4',
  },
  {
    kind: 'cinzas',
    titulo: 'Cinzas de cremação',
    icone: 'pote-cinzas',
    quantidade: { valor: 'a que desejar', nota: 'uma colher de chá já é suficiente' },
    listaTitulo: 'Recipientes aceitos',
    lista: ['Pote pequeno com tampa', 'Saquinho zip bem fechado'],
    passos: [
      { texto: 'Coloque as cinzas em pote com tampa ou saco fechado', icone: 'pote-tampa' },
      { texto: 'Envolva com plástico filme para não abrir no caminho', icone: 'plastico-filme' },
      { texto: 'Identifique com seu nome completo', icone: 'saco-identificado' },
    ],
    avisos: [
      {
        tom: 'calma',
        texto:
          'Se preferir, pode enviar tudo — usamos apenas o necessário para a joia e devolvemos o restante junto com a sua peça, na mesma embalagem.',
      },
    ],
  },
]

// ---------------------------------------------------------------------------------------------
// Os materiais de preparo simples
// ---------------------------------------------------------------------------------------------

export interface CartaoDeMaterial {
  /** `null` nos materiais que não são `MaterialKind` — "unhas" é um deles. */
  kind: MaterialKind | null
  /** A âncora. Deriva de `kind` quando existe; caso contrário é escrita à mão. */
  anchor: string
  titulo: string
  icone: EstrelinhaIconName
  itens: readonly string[]
}

/**
 * Os cartões de preparo simples.
 *
 * **O board tem três; aqui são cinco, e os dois extras têm causa.** `flores` e `outro` são
 * `MaterialKind` desde a feature 22 e a página do produto os endereça por âncora — sem cartão, o
 * link cai numa página que não tem para onde rolar. A copy dos dois vem da ficha da feature 22
 * (`model/fichas.ts`), que é o texto que a Adri já usava, e não invenção nova.
 */
export const CARTOES_DE_MATERIAL: readonly CartaoDeMaterial[] = [
  {
    kind: 'dente_leite',
    anchor: materialAnchor('dente_leite'),
    titulo: 'Dentes de leite',
    icone: 'dente-leite',
    itens: ['Embrulhe em papel toalha', 'Mais de um dente? Embale separadamente, para não trincarem'],
  },
  {
    kind: 'coto_umbilical',
    anchor: materialAnchor('coto_umbilical'),
    titulo: 'Coto umbilical',
    icone: 'coto-umbilical',
    itens: [
      'Coloque direto no saco plástico identificado',
      'Se ainda estiver na presilha, ela volta com a joia',
    ],
  },
  {
    kind: null,
    anchor: 'unhas',
    titulo: 'Unhas (humanas ou de pet)',
    icone: 'unha',
    itens: ['Embrulhe em papel alumínio ou guardanapo', 'Depois coloque no saco plástico identificado'],
  },
  {
    kind: 'flores',
    anchor: materialAnchor('flores'),
    titulo: 'Flores e pétalas',
    icone: 'flor-prensada',
    itens: [
      'Prense entre as páginas de um livro por alguns dias, até secar por completo',
      'Pétala fresca escurece dentro da resina',
    ],
  },
  {
    kind: 'outro',
    anchor: materialAnchor('outro'),
    titulo: 'Outro material',
    icone: 'atendimento',
    itens: [
      'Fale com a gente antes de enviar, para acertar quantidade e preparo',
      'Alguns materiais precisam de preparo específico — não envie antes dessa conversa',
    ],
  },
]

// ---------------------------------------------------------------------------------------------
// O preparo em casa — os dois que chegam desidratados
// ---------------------------------------------------------------------------------------------

export interface PreparoEmCasa {
  kind: MaterialKind | null
  anchor: string
  titulo: string
  icone: EstrelinhaIconName
  aviso: string
  passos: readonly string[]
}

export const PREPARO_EM_CASA: readonly PreparoEmCasa[] = [
  {
    kind: 'placenta',
    anchor: materialAnchor('placenta'),
    titulo: 'Placenta',
    icone: 'placenta',
    aviso: 'Peça ao médico, no parto normal, que a placenta seja separada e congelada',
    passos: [
      'Corte pelo menos 5 cm da placenta em tiras finas',
      'Pique em cubinhos — quanto menores, mais rápido desidrata',
      'Espalhe em assadeira forrada com papel manteiga ou alumínio',
      'Leve ao forno na temperatura mais baixa possível',
      'Confira a cada 20 min até ficar seca e crocante (1 a 3 horas)',
      'Embrulhe em papel alumínio e guarde em saco zip identificado',
    ],
  },
  {
    kind: null,
    anchor: 'sangue-desidratado',
    titulo: 'Sangue desidratado',
    icone: 'gota-afetiva',
    aviso: 'O sangue precisa chegar já desidratado — não trabalhamos com coleta líquida',
    passos: [
      'Forre um recipiente plástico com plástico filme bem esticado',
      'Espalhe o sangue sobre o filme, numa camada bem fina',
      'Se quiser, proteja com uma telinha ou tampa furada',
      'Deixe secar em local seguro, sem umidade',
      'Está pronto quando escurecer e ficar craquelado, sem líquido',
      'Embale com cuidado e envie junto com os demais materiais',
    ],
  },
]

// ---------------------------------------------------------------------------------------------
// O seletor de material — os hiperlinks do topo
// ---------------------------------------------------------------------------------------------

export interface AtalhoDeMaterial {
  anchor: string
  rotulo: string
  /** Ficha rica (com vídeo e passos ilustrados) ou entrada simples — muda só o desenho do atalho. */
  destaque: boolean
}

/**
 * Os atalhos do seletor, na ordem do board: primeiro os três materiais com ficha rica, depois os de
 * preparo simples e os dois de preparo em casa.
 *
 * Derivado das listas acima, e **não escrito de novo**: o board tem oito pílulas e a página tem dez
 * destinos (`flores` e `outro` entraram junto com os cartões). Uma segunda lista à mão significaria
 * um atalho apontando para uma âncora que ninguém renderiza — e o erro sai como rolagem que não
 * acontece, sem nada no console.
 */
export const ATALHOS_DE_MATERIAL: readonly AtalhoDeMaterial[] = [
  ...FICHAS_DE_MATERIAL.map(ficha => ({
    anchor: materialAnchor(ficha.kind),
    rotulo: ficha.titulo,
    destaque: true,
  })),
  ...CARTOES_DE_MATERIAL.map(cartao => ({
    anchor: cartao.anchor,
    rotulo: cartao.titulo,
    destaque: false,
  })),
  ...PREPARO_EM_CASA.map(bloco => ({
    anchor: bloco.anchor,
    rotulo: bloco.titulo,
    destaque: false,
  })),
]

/**
 * Toda âncora que a página renderiza, incluindo as que uma ficha atende por tabela (`tambem`).
 *
 * É a régua do guarda: `MATERIAL_KINDS` inteiro precisa estar aqui, senão a página do produto tem um
 * link que não leva a lugar nenhum — e link quebrado por âncora **não dá 404**, a página abre e não
 * rola. Ninguém descobre.
 */
export const ANCORAS_DO_GUIA: readonly string[] = [
  ...FICHAS_DE_MATERIAL.flatMap(ficha => [
    materialAnchor(ficha.kind),
    ...(ficha.tambem ?? []).map(materialAnchor),
  ]),
  ...CARTOES_DE_MATERIAL.map(cartao => cartao.anchor),
  ...PREPARO_EM_CASA.map(bloco => bloco.anchor),
]

/** Os materiais do catálogo que a página **não** endereça. Vazio é a única resposta aceitável. */
export const MATERIAIS_SEM_ANCORA: readonly MaterialKind[] = MATERIAL_KINDS.filter(
  kind => !ANCORAS_DO_GUIA.includes(materialAnchor(kind)),
)

// ---------------------------------------------------------------------------------------------
// A postagem
// ---------------------------------------------------------------------------------------------

export interface FormaDeEnvio {
  titulo: string
  texto: string
  icone: EstrelinhaIconName
}

export const FORMAS_DE_ENVIO: readonly FormaDeEnvio[] = [
  {
    titulo: 'SEDEX — o mais rápido',
    texto: 'Rastreável de ponta a ponta. Indicado para leite materno e cinzas.',
    icone: 'envio',
  },
  {
    titulo: 'PAC — o mais econômico',
    texto: 'Também rastreável, só demora um pouco mais para chegar.',
    icone: 'caixa-pac',
  },
  {
    titulo: 'Carta registrada — só fios',
    texto: 'Válida apenas para cabelos, pelos e bigodes, entre folhas de papel.',
    icone: 'carta-registrada',
  },
]

export const AVISO_SEM_RASTREIO =
  'Evite qualquer envio sem rastreio: sem código, não há como localizar o material se algo acontecer.'

export const DECLARACAO = {
  intro:
    'Transportadoras não aceitam material biológico. Descreva o conteúdo de forma simples e discreta — é uma formalidade e não muda nada no seu envio.',
  escreva: [
    { rotulo: 'Conteúdo', valor: 'Itens pessoais' },
    { rotulo: 'Ou', valor: 'Lembranças' },
  ],
  nuncaEscreva: ['Leite materno', 'Cinzas / restos humanos', 'Material biológico'],
} as const

export const DEPOIS_DE_POSTAR: readonly { titulo: string; texto: string; icone: EstrelinhaIconName }[] =
  [
    {
      titulo: 'Mande o código de rastreio',
      texto:
        'Assim que postar, envie o código pelo WhatsApp. A partir daí acompanhamos a entrega junto com você e avisamos quando chegar.',
      icone: 'atendimento',
    },
    {
      titulo: 'Mora em Porto Alegre e região?',
      texto:
        'Na capital e região metropolitana você também pode enviar por aplicativo de entrega — combine com a gente pelo WhatsApp.',
      icone: 'gota-afetiva',
    },
  ]

// ---------------------------------------------------------------------------------------------
// A última conferida
// ---------------------------------------------------------------------------------------------

export const CHECKLIST_DO_ENVIO: readonly string[] = [
  'O recipiente está bem fechado, sem risco de vazar',
  'Envolvi o frasco ou pote com plástico filme',
  'Está tudo dentro de um saquinho bem vedado',
  'Meu nome completo está escrito na embalagem',
  'A declaração diz apenas “itens pessoais”',
  'Guardei o código de rastreio para mandar no WhatsApp',
]
