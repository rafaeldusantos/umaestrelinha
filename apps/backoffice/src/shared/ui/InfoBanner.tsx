// O aviso informativo do painel — feature 55 (`CFG-26`, `CFG-27`).
//
// Eram **quatro** implementações ad hoc da mesma caixa, e elas já tinham divergido: três usavam
// `bg-muted` neutro com `text-primary` no ícone (Material, Checkout, Carrinho abandonado) e a quarta
// — os avisos do `EventCard` — usava `amber-50`/`amber-300`/`amber-900` literais do Tailwind, com
// **quatro classes `dark:`** mantidas à mão porque aquela paleta não é a do painel.
//
// Nada disso quebra: quatro avisos com quatro aparências passam em build, `tsc` e teste de
// componente. Quem paga é quem lê a tela e não sabe se "aquele quadrinho" é a mesma coisa que o
// outro.
//
// ## A cor é o âmbar semântico do painel
//
// `--estrelinha-admin-amber` é o token de "atenção, mas não é erro" — o mesmo de
// `MaterialStatusBadge` e `QueueAge`. Ele existe no preset, acompanha o modo escuro sozinho, e
// `adminTokens.test.ts` **já prova** que o par texto-sobre-fundo-de-10% tem contraste nos dois
// temas. As quatro classes `dark:` do `EventCard` deixam de existir.
//
// A `spec.md` pede as duas coisas ao mesmo tempo: a cor semântica (`CFG-26`) e "equivalente ao
// atual" (`CFG-27`). Lido junto, equivalente é **extração, não redesenho** — mesma posição, mesmo
// ícone, mesmo texto, mesma densidade. A cor unifica, que é a única leitura em que `CFG-26` tem
// efeito.

import { Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'

interface Props {
  /** O ícone do lugar. O default é o genérico; os quatro chamadores de hoje passam o seu. */
  icon?: LucideIcon
  children: React.ReactNode
  /**
   * Slot à direita do texto — hoje o link que `CFG-21` pede ("preencha na seção Frete e Material").
   *
   * Fica no fim da caixa, e não no meio da frase: o texto continua sendo **um nó de DOM**, então
   * `getByText('a frase inteira')` segue casando. Um `<Link>` no meio partiria a frase em vários
   * nós e quebraria as asserções que já provam essas mensagens.
   */
  action?: React.ReactNode
  className?: string
  'data-testid'?: string
  /** `status` quando o aviso pode aparecer depois da carga e a leitora precisa ser avisada. */
  role?: 'status' | 'note'
}

export const InfoBanner = ({
  icon: Icon = Info,
  children,
  action,
  className,
  'data-testid': testId,
  role,
}: Props) => (
  <div
    data-testid={testId}
    role={role}
    className={cn(
      'flex items-start gap-3 rounded-xl border border-estrelinha-admin-amber/20 bg-estrelinha-admin-amber/10 p-3',
      className,
    )}
  >
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-estrelinha-admin-amber" aria-hidden />
    <div className="min-w-0 flex-1 space-y-1 text-xs text-estrelinha-admin-amber">{children}</div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
)

export default InfoBanner
