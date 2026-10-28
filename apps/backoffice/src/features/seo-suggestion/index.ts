// Feature 84 — "Sugerir com IA" na aba SEO do produto. A página monta o hook e o botão lado a lado
// com o `SeoPreview`; nada aqui importa de `product-form` (feature não importa feature).
export { default as SuggestSeoButton } from './ui/SuggestSeoButton'
export { useSeoSuggestion } from './model/useSeoSuggestion'
export type { SeoPair, SeoSuggestionState, SeoSuggestionStatus } from './model/useSeoSuggestion'
export { requestSeoSuggestion } from './api/requestSeoSuggestion'
export type { SeoSuggestionInput, SeoSuggestionOutcome } from './api/requestSeoSuggestion'
export {
  SEO_SUGGESTION_COPY,
  SEO_SUGGESTION_EDITED_DURING,
  SEO_SUGGESTION_NEEDS_NAME,
} from './model/copy'
