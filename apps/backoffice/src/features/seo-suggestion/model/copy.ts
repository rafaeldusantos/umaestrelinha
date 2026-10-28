// Feature 84 — as frases da sugestão de SEO, num dono só (`design.md`, *Error Handling Strategy*).
//
// Cada falha da function vira UMA frase, escrita aqui e lida pelo hook. Escrevê-las no botão ou no
// hook seria um segundo dono do texto — e a prova em navegador e os testes leem estas mesmas
// constantes ao lado do literal da spec.

/** O motivo da falha, como o painel o entende (a tradução da resposta mora em `api/`). */
export type SeoSuggestionReason =
  | 'forbidden'
  | 'not_configured'
  | 'limited'
  | 'bad_request'
  | 'off_rules'
  | 'refusal'
  | 'truncated'
  | 'upstream'
  | 'network'

export const SEO_SUGGESTION_COPY: Record<SeoSuggestionReason, string> = {
  forbidden: 'Você não tem acesso a esta ação.',
  not_configured: 'Sugestão por IA não está configurada.',
  limited: 'Muitas sugestões seguidas. Tente de novo em alguns minutos.',
  bad_request: 'Não consegui montar o pedido de sugestão.',
  off_rules: 'Não consegui uma sugestão dentro das regras da loja. Tente de novo ou escreva à mão.',
  refusal: 'A IA não quis sugerir para esta peça.',
  truncated: 'A sugestão veio incompleta. Tente de novo.',
  // Rede caída e a function fora do ar (404 do gateway, deploy fora de ordem) caem na mesma frase.
  upstream: 'A sugestão não veio desta vez. Os campos continuam editáveis.',
  network: 'A sugestão não veio desta vez. Os campos continuam editáveis.',
}

/** `SIA-25`: a Adri editou o SEO enquanto a sugestão estava no ar. */
export const SEO_SUGGESTION_EDITED_DURING = 'Você editou o SEO enquanto a sugestão chegava; mantive o seu texto.'

/**
 * O sucesso também é dito à região viva (conserto do QA, `BUG-20261027-sugestao-preenchida-sem-aviso-ao-leitor`;
 * `SPEC_DEVIATION`: a spec não dava frase ao 200 e o leitor de tela não ouvia a troca dos campos). Some na
 * próxima edição, sugestão, desfazer ou save.
 */
export const SEO_SUGGESTION_APPLIED = 'Sugestão aplicada ao título e à descrição. Revise antes de salvar.'

/** `SIA-11`: sem nome não há o que sugerir. */
export const SEO_SUGGESTION_NEEDS_NAME = 'Preencha o nome do produto primeiro.'

export const SEO_SUGGESTION_LABEL = 'Sugerir com IA'
export const SEO_SUGGESTION_LOADING = 'Sugerindo…'
export const SEO_SUGGESTION_UNDO = 'Desfazer'
