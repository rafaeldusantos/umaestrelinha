// Feature 39 — as CHAVES dos ícones do menu. O desenho não mora aqui.
//
// A separação é a razão de este arquivo existir: quem escolhe o ícone é o painel e quem o desenha é
// a loja, e os dois precisam do **mesmo** vocabulário. O desenho é React (`@estrelinha/ui/icons`),
// que este pacote não pode importar — `core` roda em Node, em Deno e no browser, e um `import React`
// no grafo derruba a edge function em runtime, não em build. Então a chave vive em `core` e o
// componente em `ui`, ligados por `MENU_ICON_COMPONENTS`, que é `Record<MenuIconKey, …>`: chave sem
// desenho não compila.
//
// Sem esta divisão, o seletor do painel desenharia um segundo conjunto — o backoffice não importa de
// `apps/store` (`previaUnica.test.ts`), então a alternativa real não era "reusar", era "copiar", e a
// cliente veria um glifo na barra e a dona outro na tela onde escolheu.
//
// O conjunto tem dois grupos: os desenhos da marca e os ícones do sistema (etiqueta, presente,
// calendário…). Os do sistema são vocabulário genérico que o lucide também tem, e **mesmo assim**
// são desenhados no conjunto da casa — é a exceção declarada à regra "o que o lucide resolve
// continua vindo de lá": o vocabulário do menu é composto pela dona, os dois grupos aparecem lado a
// lado na mesma barra, e todo ícone dele precisa do mesmo traço e do mesmo realce.

/**
 * Os desenhos da marca, na ordem em que o seletor os apresenta — o grupo "Da Uma Estrelinha".
 *
 * Junto com `MENU_SYSTEM_ICON_KEYS`, são as chaves de `ESTRELINHA_ICONS` — o registro por nome que a loja já mantém. **`pix` fica de
 * fora de propósito**: aquele desenho é a marca oficial do arranjo (grade de 16, preenchido) e não
 * obedece às regras do conjunto (grade 24, traço 1,5, contorno em `currentColor`). Pôr a marca de um
 * meio de pagamento como ícone de departamento seria dizer outra coisa.
 *
 * O formato `^[a-z][a-z0-9-]*$` não é estética: é a **mesma régua** que a migration usa para limpar
 * `categories.icon`, que guardava emoji do catálogo anterior. Chave que não casa com ela seria
 * apagada pelo banco e degradaria para "sem ícone" na leitura seguinte.
 */
export const MENU_BRAND_ICON_KEYS = [
  'atendimento',
  'caixa-pac',
  'carta-registrada',
  'coleta-frasco',
  'corrente',
  'coto-umbilical',
  'dente-leite',
  'envio',
  'estrela',
  'flor-prensada',
  'frasco-leite',
  'gota-afetiva',
  'gravacao',
  'mecha-amarrada',
  'mecha-cabelo',
  'papel-aluminio',
  'parcelas',
  'passo-embalagem',
  'passo-escolha',
  'passo-material',
  'pingente',
  'placenta',
  'plastico-filme',
  'pote-cinzas',
  'pote-tampa',
  'saco-identificado',
  'sacola',
  'tampa-vedada',
  'unha',
] as const

/**
 * Os ícones do sistema, na ordem em que o seletor os apresenta — o grupo "Do sistema".
 *
 * Vocabulário genérico de loja (oferta, presente, frete, ajuda), desenhado no conjunto da casa e não
 * trazido do lucide: grade 24, traço 1,5, contorno em `currentColor` e realce em ouro, como os da
 * marca. Ficam de fora relógio, raio e estrela de cinco pontas — o tom desta loja é memorial, e a
 * estrela da casa é a da marca.
 *
 * Nenhuma chave nem rótulo daqui contém "mecha" ou "unha": esses termos já são nomes de desenhos da
 * marca, e a busca do seletor os acharia nos dois grupos.
 */
export const MENU_SYSTEM_ICON_KEYS = [
  'etiqueta',
  'porcentagem',
  'presente',
  'coracao',
  'cupom',
  'frete',
  'calendario',
  'informacao',
  'duvida',
  'inicio',
] as const

/**
 * O conjunto inteiro: a marca e depois o sistema. É contra ele que `menuIconKey` lê o valor gravado,
 * então uma chave de qualquer dos dois grupos é lida igual pela loja e pelo painel.
 */
export const MENU_ICON_KEYS = [...MENU_BRAND_ICON_KEYS, ...MENU_SYSTEM_ICON_KEYS] as const

export type MenuIconKey = (typeof MENU_ICON_KEYS)[number]

/** O grupo de uma chave no seletor: os desenhos da marca ou os ícones do sistema. */
export type MenuIconGroup = 'marca' | 'sistema'

/**
 * Os grupos, na ordem do seletor, cada um com as suas chaves. Juntos cobrem `MENU_ICON_KEYS` sem
 * sobreposição. O título que a dona lê é do painel — aqui mora só a partição.
 */
export const MENU_ICON_GROUPS: readonly {
  readonly id: MenuIconGroup
  readonly keys: readonly MenuIconKey[]
}[] = [
  { id: 'marca', keys: MENU_BRAND_ICON_KEYS },
  { id: 'sistema', keys: MENU_SYSTEM_ICON_KEYS },
]

/**
 * O nome que a dona lê no seletor.
 *
 * Mora aqui e não no componente porque o painel lista o conjunto **a partir da chave** — ele nunca
 * tem o desenho na mão antes de escolher. `Record<MenuIconKey, string>` obriga a cobertura: chave
 * nova sem rótulo não compila, e um seletor com uma célula sem nome é exatamente o que a `AC 1` da
 * história do ícone proíbe ("cada um com o desenho de verdade **e o nome**").
 */
export const MENU_ICON_LABELS: Record<MenuIconKey, string> = {
  atendimento: 'Atendimento',
  'caixa-pac': 'Caixa',
  'carta-registrada': 'Carta registrada',
  'coleta-frasco': 'Coleta em frasco',
  corrente: 'Corrente',
  'coto-umbilical': 'Coto umbilical',
  'dente-leite': 'Dente de leite',
  envio: 'Envio',
  estrela: 'Estrela',
  'flor-prensada': 'Flor prensada',
  'frasco-leite': 'Frasco de leite',
  'gota-afetiva': 'Gota afetiva',
  gravacao: 'Gravação',
  'mecha-amarrada': 'Mecha amarrada',
  'mecha-cabelo': 'Mecha de cabelo',
  'papel-aluminio': 'Papel-alumínio',
  parcelas: 'Parcelas',
  'passo-embalagem': 'Embalagem',
  'passo-escolha': 'Escolha',
  'passo-material': 'Material',
  pingente: 'Pingente',
  placenta: 'Placenta',
  'plastico-filme': 'Plástico-filme',
  'pote-cinzas': 'Pote de cinzas',
  'pote-tampa': 'Pote com tampa',
  'saco-identificado': 'Saco identificado',
  sacola: 'Sacola',
  'tampa-vedada': 'Tampa vedada',
  unha: 'Unha',
  etiqueta: 'Etiqueta',
  porcentagem: 'Porcentagem',
  presente: 'Presente',
  coracao: 'Coração',
  cupom: 'Cupom',
  frete: 'Frete',
  calendario: 'Calendário',
  informacao: 'Informação',
  duvida: 'Dúvida',
  inicio: 'Início',
}

const CHAVES = new Set<string>(MENU_ICON_KEYS)

/**
 * A chave gravada, se ela for do conjunto — ou `null`.
 *
 * **Degrada em silêncio de propósito** (`NAV-19`). O valor vem de `categories.icon`, uma coluna que
 * existe desde a migration inicial e que guardou emoji do catálogo anterior; ela não tem `check` em
 * SQL, e pôr um seria copiar este catálogo para dentro do banco — o "defeito 01", com a cópia SQL
 * ficando para trás na primeira chave nova. Ícone não é dinheiro nem segurança: a resposta certa
 * para "não reconheço este valor" é o item sem ícone, não a barra quebrada.
 *
 * A tolerância a espaço e a caixa cobre o valor que chegou por SQL na mão ou por importação. Ela não
 * pode colidir com nada: toda chave do conjunto é minúscula.
 */
export const menuIconKey = (raw: unknown): MenuIconKey | null => {
  if (typeof raw !== 'string') return null
  const chave = raw.trim().toLowerCase()
  return CHAVES.has(chave) ? (chave as MenuIconKey) : null
}
