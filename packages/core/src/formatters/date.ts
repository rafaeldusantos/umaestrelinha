// Formatação de data relativa — só o browser consome (backoffice: carrinhos abandonados).
// Fica separada de `price.ts` porque o `date-fns` é especificador nu e derrubaria a importabilidade
// daquele módulo pelo Deno. Ver o comentário em `price.ts`.
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const formatRelativeDate = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
