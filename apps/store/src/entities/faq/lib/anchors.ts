/**
 * Os `id` da página de perguntas — `FAQL-06`, `FAQL-07`.
 *
 * Moram fora dos componentes por duas razões, e a segunda é a que importa: o `react-refresh` avisa
 * quando um arquivo exporta componente **e** função (o hot reload deixa de funcionar para o
 * arquivo inteiro), e uma função pura numa pasta `ui/` é regra de FSD pedindo para virar `lib/`.
 */

/**
 * A âncora de uma pergunta — `/perguntas-frequentes#p-<id>`.
 *
 * ⚠️ **Derivada do `id` da entrada, nunca do texto.** `policySectionId` faz o contrário e está certo
 * lá: o título de uma política é literal de código. Aqui a dona edita a pergunta no painel, e uma
 * âncora derivada do texto mudaria quando ela corrigisse uma vírgula — quebrando todo link já
 * compartilhado por WhatsApp. Feio e estável ganha de bonito e frágil.
 */
export const faqAnchorId = (id: string): string => `p-${id}`

/** A âncora de um assunto — `/perguntas-frequentes#assunto-cuidados`. */
export const faqSubjectId = (category: string): string => `assunto-${category}`
