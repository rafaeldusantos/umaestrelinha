// Compre Junto — a forma do bloco na loja: como ele abre as escolhas de cada adicional.
//
// É só apresentação: a forma não muda preço, total nem o que vai à sacola. Uma configuração para a
// loja inteira, gravada em `store_settings` na chave `buy_together`. Sem linha gravada, ou com um
// valor que não é nenhuma das três, vale "Na linha".

/** As três formas, na ordem em que o painel as oferece. */
export const BUY_TOGETHER_FORMS = ['inline', 'sheet', 'formula'] as const

export type BuyTogetherForm = (typeof BUY_TOGETHER_FORMS)[number]

/** A forma de quem nunca escolheu. */
export const DEFAULT_BUY_TOGETHER_FORM: BuyTogetherForm = 'inline'

/** O nome que a dona lê, e a frase que diz o que muda na loja. */
export const BUY_TOGETHER_FORM_LABELS: Record<BuyTogetherForm, { name: string; description: string }> = {
  inline: {
    name: 'Na linha',
    description: 'Marcar a peça abre as escolhas ali mesmo, abaixo dela.',
  },
  sheet: {
    name: 'Em folha',
    description:
      'As escolhas abrem numa folha no celular e num diálogo no computador, com o botão "Incluir no conjunto".',
  },
  formula: {
    name: 'Com fórmula',
    description: 'A forma "Na linha", com uma faixa "Esta joia + peça + …" acima da lista.',
  },
}

/** Valor desconhecido, ausente ou de outro tipo vira a forma padrão — a página nunca quebra por ele. */
export const normalizeBuyTogetherForm = (value: unknown): BuyTogetherForm =>
  typeof value === 'string' && (BUY_TOGETHER_FORMS as readonly string[]).includes(value)
    ? (value as BuyTogetherForm)
    : DEFAULT_BUY_TOGETHER_FORM
