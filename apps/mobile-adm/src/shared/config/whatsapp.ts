/**
 * As cores da marca do WhatsApp, para o lembrete do envio (feature `75`, `MAA-17`).
 *
 * Moram aqui, e NÃO na paleta `estrelinha` (`packages/ui/src/tokens/estrelinha.ts`): são a marca de
 * outra empresa, usadas só no botão do lembrete, e entrar na paleta as ofereceria a qualquer tela.
 * Precedente: `apps/store/src/shared/config/instagram.ts` (feature `65`) — a cor do terceiro mora junto
 * do terceiro.
 *
 * O fundo é o verde-escuro da marca (`#075E54`), e não o verde claro (`#25D366`): texto branco sobre o
 * claro fica em ~2:1, abaixo de 4,5:1. `whatsapp.test.ts` calcula a razão.
 */
export const WHATSAPP_FUNDO = '#075E54'
export const WHATSAPP_TEXTO = '#FFFFFF'
