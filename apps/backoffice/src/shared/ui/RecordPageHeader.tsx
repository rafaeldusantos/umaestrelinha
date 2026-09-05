import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'

/**
 * O cabeçalho das telas de **registro** — o pedido e a ficha da cliente (feature 34).
 *
 * ---------------------------------------------------------------------------------------------
 * POR QUE NÃO É O `PageHeader` NEM O `FormPageHeader`
 * ---------------------------------------------------------------------------------------------
 * `PageHeader` é o das listagens: título, subtítulo e ações. Não tem trilha, e não tem onde pôr selo
 * — o que fez os selos do pedido caírem numa linha solta abaixo do cabeçalho, longe do nome do
 * registro a que se referem.
 *
 * `FormPageHeader` tem a trilha, mas é o cabeçalho de um **formulário**: exige `isDirty`, `saving`,
 * `saveLabel` e `onSave`, e prende o `⌘S`. Um registro que se lê não tem save.
 *
 * Sobra o que as duas telas de registro precisam e nenhum dos dois dava: **trilha + título com os
 * selos EM LINHA + subtítulo + ações livres**. Dois consumidores, então mora em `shared/ui`.
 *
 * **O selo fica ao lado do título de propósito.** Ele qualifica o registro — "Pedido #1042, que está
 * pago e aguardando material" é uma frase só. Numa linha separada, vira uma legenda que o olho lê
 * depois do que ela deveria qualificar.
 */
interface Props {
  /** Primeiro nível da trilha — o grupo da sidebar. Não é link: grupo não tem tela. */
  group: string
  /** Segundo nível: a listagem de onde se veio. É o link de volta. */
  parentLabel: string
  /** Terceiro nível da trilha. Costuma ser mais curto que o título (`#1042`). */
  crumb: string
  title: string
  /** Vai **em linha** com o título. Selos de estado, tipicamente. */
  badges?: React.ReactNode
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  onBack: () => void
}

const RecordPageHeader = ({
  group, parentLabel, crumb, title, badges, subtitle, actions, onBack,
}: Props) => (
  <header className="-mx-6 mb-6 border-b border-border bg-estrelinha-admin-card px-6 pb-5 pt-4">
    {/* A trilha é afordância de DESKTOP e some abaixo de `md`: no celular ela seria um alvo de
        16px, e o botão de voltar ao lado — 44px — já leva ao mesmo lugar, com o título dizendo
        onde se está. Manter as duas custaria um alvo pequeno para não dizer nada de novo. */}
    <nav
      className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex"
      aria-label="Trilha"
    >
      <span>{group}</span>
      <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />
      <button type="button" onClick={onBack} className="text-primary hover:underline">
        {parentLabel}
      </button>
      <ChevronRight className="h-3 w-3 opacity-50" aria-hidden="true" />
      <span className="truncate text-estrelinha-admin-text-secondary">{crumb}</span>
    </nav>

    <div className="mt-3.5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {/* O voltar é ícone, e não texto: a trilha logo acima já nomeia para onde ele leva. */}
        <Button
          variant="outline"
          size="icon"
          onClick={onBack}
          aria-label={`Voltar para ${parentLabel}`}
          className="h-11 w-11 shrink-0 rounded-[10px] md:h-[34px] md:w-[34px]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-heading text-2xl font-bold text-foreground">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="text-xs text-estrelinha-admin-text-secondary">{subtitle}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  </header>
)

export default RecordPageHeader
