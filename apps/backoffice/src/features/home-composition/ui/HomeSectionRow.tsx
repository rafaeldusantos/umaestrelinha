// Uma linha da lista de seções da Home (feature 24).
//
// A linha responde três perguntas de uma vez, e é por isso que ela não é só um nome: **o que esta
// seção mostra hoje**, **está no ar?**, e **se não está, por quê**. A terceira é `HOME-09`, e é a
// que separa esta tela de uma lista de tipos: uma seção ativa cuja fonte está vazia não aparece na
// loja, e sem o motivo escrito aqui a dona só descobriria abrindo o site.

import {
  ChevronRight,
  CornerDownRight,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Lock,
  Mail,
  Quote,
  Rows3,
  ShoppingBag,
  Sparkles,
  Star,
  Tags,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import { sectionMeta, type HomeSectionType, type ResolvedSection } from '@estrelinha/core/home'

/**
 * O desenho de cada tipo.
 *
 * Mora aqui e não em `sectionMeta` de propósito: `@estrelinha/core/home` é módulo puro, sem React —
 * o guarda que compara o catálogo com a migration precisa importá-lo de dentro de um teste de
 * arquivo, e um `LucideIcon` ali arrastaria a biblioteca inteira para dentro dele.
 */
const ICONS: Record<HomeSectionType, LucideIcon> = {
  hero: ImageIcon,
  trust_bar: Sparkles,
  banner_grid: LayoutGrid,
  collection_rows: Rows3,
  brand_statement: Star,
  trending_tags: Tags,
  newsletter: Mail,
  collection_feature: Quote,
  product_carousel: ShoppingBag,
  category_grid: LayoutGrid,
}

const aspas = (texto: string | undefined): string | null => {
  const valor = (texto ?? '').trim()
  return valor === '' ? null : `“${valor}”`
}

const plural = (n: number, singular: string, prural: string): string =>
  `${n} ${n === 1 ? singular : prural}`

/**
 * O resumo do conteúdo (`HOME-08`) — o que a dona precisa para reconhecer a seção sem abri-la.
 *
 * Duas informações em cada caso, e a segunda é sempre **de onde vem o conteúdo**: curadoria dela ou
 * derivação automática. É o que responde "por que apareceu essa coleção aqui?" sem uma segunda
 * viagem à tela do editor.
 */
const resumo = (entry: ResolvedSection): string => {
  const { section, items } = entry
  const config = section.config ?? {}
  const curado = (section.items ?? []).length > 0
  const fonte = curado ? 'escolhidos por você' : 'automático'

  switch (section.type) {
    case 'hero': {
      const titulo = aspas([config.title_line1, config.title_line2].filter(Boolean).join(' '))
      const arte = config.image_url ? 'foto própria' : 'arte da marca'
      return [titulo, arte].filter(Boolean).join(' · ')
    }
    case 'trust_bar':
      return 'os números vêm de Configurações'
    case 'banner_grid':
      return `${plural(items.length, 'banner', 'banners')} · ${
        curado ? 'arte própria' : 'derivados de Categorias'
      }`
    case 'collection_rows':
      return `${plural(items.length, 'fileira', 'fileiras')} · ${
        curado ? 'escolhidas por você' : 'automático, na ordem de Categorias'
      }`
    case 'brand_statement': {
      const titulo = aspas(config.title)
      const linha = typeof config.interlude_after === 'number'
        ? `entra depois da ${config.interlude_after + 1}ª fileira`
        : null
      return [titulo, linha].filter(Boolean).join(' · ')
    }
    case 'trending_tags':
      return `até ${plural(config.limit ?? items.length, 'chip', 'chips')} · ${
        curado ? 'escolhidos por você' : 'automático, coleções folha'
      }`
    case 'newsletter':
      return aspas(config.title) ?? 'convite para receber novidades'
    case 'collection_feature':
      return [aspas(config.title), items[0]?.label, fonte].filter(Boolean).join(' · ')
    default:
      return fonte
  }
}

// SPEC_DEVIATION: a AC da T22 nomeia `TAP_44` para o alvo de toque; aqui os controles têm 44px de
// verdade (`h-11 w-11 md:h-9 md:w-9`) em vez do auxiliar de pseudo-elemento.
// Reason: `TAP_44` mora em `apps/store/src/shared/lib/touchTarget.ts`, que é `shared/` do OUTRO app
// — copiá-lo para cá criaria um segundo dono da mesma medida, que é exatamente o que o
// `touchTarget.test.ts` da loja existe para impedir ("a medida deixar de morar num lugar só"). O
// pseudo-elemento existe lá porque a caixa pintada é do desenho e mede 36 ou 38; aqui a linha é
// nossa e cabe 44 de fato, então o auxiliar resolveria um problema que esta tela não tem.

interface Props {
  entry: ResolvedSection
  /** A faixa institucional entra DENTRO das fileiras; a linha precisa dizer isso. */
  nested?: boolean
  onToggle: (id: string, next: boolean) => void
  onOpen: (id: string) => void
  /** `draggedId` sai do `dataTransfer`, e não de um estado da lista: o arraste do HTML já carrega o
   *  dado, e guardá-lo em paralelo abriria a chance de os dois discordarem. */
  onDrop: (targetId: string, draggedId: string) => void
  /**
   * O cursor entrou (`id`) ou saiu (`null`) — a linha aponta o bloco na prévia (feature 25).
   *
   * Sai da linha inteira e não do botão do nome: o alvo do apontamento é a seção, e limitar ao rótulo
   * faria o contorno piscar ao atravessar a alça ou o interruptor.
   */
  onHover?: (sectionId: string | null) => void
}

const HomeSectionRow = ({ entry, nested = false, onToggle, onOpen, onDrop, onHover }: Props) => {
  const { section, renders, hiddenReason } = entry
  const meta = sectionMeta(section.type)
  const Icon = ICONS[section.type] ?? LayoutGrid

  // O hero não desliga nem se remove (`HOME-08`). Esconder o controle aqui é UX; quem torna "Home
  // com zero seções" impossível é o trigger da migration. Os dois precisam existir: sem o trigger, a
  // regra morre num `PATCH` direto; sem o controle escondido, a dona clica e leva um erro do banco.
  const indelevel = section.type === 'hero'

  // `HOME-09`: seção LIGADA que mesmo assim não vai aparecer. A desligada não precisa de aviso —
  // "Desligada" já é a resposta, e ela está na coluna de estado.
  const avisoDeAusencia = section.active && !renders ? hiddenReason : null

  return (
    <li
      data-testid={`secao-${section.id}`}
      draggable
      onMouseEnter={() => onHover?.(section.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocusCapture={() => onHover?.(section.id)}
      onBlurCapture={() => onHover?.(null)}
      onDragStart={e => e.dataTransfer.setData('text/plain', section.id)}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        e.preventDefault()
        onDrop(section.id, e.dataTransfer.getData('text/plain'))
      }}
      className={cn(
        'border-b border-border/60 last:border-0',
        nested && 'bg-muted/30',
        !section.active && 'opacity-70',
      )}
    >
      <div className={cn('flex items-center gap-3 px-4 py-2', nested ? 'pl-8' : 'pl-4')}>
        {/* Vão de largura fixa para a alça: sem ele, a linha aninhada puxaria o nome para a
            esquerda e a coluna deixaria de formar uma pista vertical. */}
        <span className="flex w-4 shrink-0 justify-center">
          <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden />
        </span>

        {/* O cotovelo é o que diz "esta entra dentro da de cima". A alça continua ao lado, e não é
            substituída por ele: a spec pede explicitamente que a faixa possa ser arrastada para o
            fim da Home. */}
        {nested && (
          <CornerDownRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}

        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl bg-secondary',
            nested ? 'h-8 w-8' : 'h-9 w-9',
          )}
        >
          <Icon className="h-4 w-4 text-primary" aria-hidden />
        </span>

        <button
          type="button"
          onClick={() => onOpen(section.id)}
          // 44px de altura no mobile — a linha inteira é o alvo de "abrir", que é o gesto principal
          // desta tela. No desktop volta a acompanhar o conteúdo.
          className="flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center text-left md:min-h-0"
        >
          <span className="truncate text-sm font-semibold text-foreground">
            {meta?.label ?? section.type}
          </span>
          <span className="line-clamp-2 text-xs text-muted-foreground">{resumo(entry)}</span>
        </button>

        {/* Feature 25: a palavra saiu de vista e ficou na árvore de acessibilidade. O rail tem
            **380px** desde a inversão do layout, e esses ~50px são do nome da seção — que truncava.
            Visualmente a posição do interruptor e a opacidade da linha já dizem o mesmo; para quem
            usa leitor de tela, o texto continua sendo a resposta em palavras. */}
        <span className="sr-only">
          {indelevel ? 'Sempre no ar' : section.active ? 'No ar' : 'Desligada'}
        </span>

        {/* Vão fixo mesmo no hero: sem ele o cadeado e os interruptores das outras linhas não
            formam a mesma coluna. */}
        <span className="flex h-11 w-11 shrink-0 items-center justify-center md:h-9 md:w-9">
          {indelevel ? (
            <Lock
              className="h-4 w-4 text-muted-foreground"
              aria-label="A chamada principal não pode ser desligada"
            />
          ) : (
            <Switch
              checked={section.active}
              aria-label={`${section.active ? 'Desligar' : 'Ligar'} ${meta?.label ?? section.type}`}
              // Nunca `disabled` por causa do aviso de ausência: `HOME-09` diz que ativar uma seção
              // sem conteúdo É PERMITIDO — a fonte pode encher depois, e travar o interruptor
              // obrigaria a dona a cadastrar na ordem que o painel prefere.
              onCheckedChange={next => onToggle(section.id, next)}
            />
          )}
        </span>

        <button
          type="button"
          onClick={() => onOpen(section.id)}
          aria-label={`Abrir ${meta?.label ?? section.type}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:h-9 md:w-9"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {avisoDeAusencia && (
        <p
          data-testid={`aviso-${section.id}`}
          className={cn(
            'flex items-start gap-2 pb-2.5 pr-4 text-xs text-destructive',
            nested ? 'pl-16' : 'pl-11',
          )}
        >
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {avisoDeAusencia}
        </p>
      )}
    </li>
  )
}

export default HomeSectionRow
