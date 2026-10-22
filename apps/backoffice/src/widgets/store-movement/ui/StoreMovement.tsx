// Feature 71 · o bloco "Movimento da loja" do Dashboard.
//
// Quatro cards (Visitas únicas, Vendas, Faturamento, Ticket médio) em três abas (Hoje, Ontem, Esta
// semana), todos de UMA leitura (`useStoreMovement`). Trocar de aba não lê nada.
//
// **Três estados, e uma releitura nunca vira esqueleto** (o defeito da feature 50):
// - primeira carga, sem dado ⇒ esqueleto nos quatro cards e `aria-busy` (`VIS-05`);
// - erro SEM dado ⇒ uma mensagem e "Tentar de novo", nenhum valor (`VIS-06`);
// - com dado ⇒ os valores, mesmo com uma releitura no ar ou falhada — "Atualizado às" continua com
//   a hora da última leitura boa, que é o que diz a idade do número.
//
// Nenhum dia nem host é decidido aqui: os textos vêm de `model/labels.ts`, que só escreve o que o
// banco devolveu. O ⓘ é Popover, nunca Tooltip — o Tooltip do Radix não abre por toque, e ~90% do
// uso da loja é celular (o painel também é aberto no celular da dona).

import { useId, useState, type ReactNode } from 'react'
import { DollarSign, Eye, Info, Receipt, ShoppingCart } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'
import { Button } from '@estrelinha/ui/button'
import { useStoreMovement, type MovementPeriodKey, type StoreMovement as Movimento } from '@/entities/stats'
import StatCard from '@/shared/ui/StatCard'
import {
  SEM_VENDAS_TEXT,
  TICKET_VAZIO,
  VISIT_INFO_TEXT,
  cappedLine,
  countingSinceLine,
  emptyCounterLine,
  lastVisitLine,
  periodLine,
  periodValues,
  updatedAtLine,
} from '../model/labels'

const ABAS: { valor: MovementPeriodKey; rotulo: string }[] = [
  { valor: 'hoje', rotulo: 'Hoje' },
  { valor: 'ontem', rotulo: 'Ontem' },
  { valor: 'semana', rotulo: 'Esta semana' },
]

/**
 * O valor do card, numa linha só (`VIS-11`): `R$ 99.999,99` num card de ~140px no celular. O corpo
 * é menor no celular e volta ao tamanho do `StatCard` a partir de `sm`.
 */
const Valor = ({ children }: { children: ReactNode }) => (
  <span className="whitespace-nowrap text-xl sm:text-2xl">{children}</span>
)

/** `VIS-08` — o ⓘ: 44×44 de alvo, com margem negativa para o ícone de 16px não crescer o cabeçalho. */
const InfoVisitas = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label="O que conta como visita única"
        className="-m-3.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    {/* `collisionPadding={16}`: sem ele o Radix só desloca o balão até ENCOSTAR na borda da tela —
        medido em 390 × 844 na prova de ponta a ponta (`prova-navegador.md`): borda direita em 390.
        O teto de largura garante os 16px de cada lado mesmo abaixo de 320px. Molde do `MarkPopover`
        (feature 67, D4). */}
    <PopoverContent
      align="start"
      collisionPadding={16}
      className="w-[min(18rem,calc(100vw-32px))] text-sm leading-relaxed motion-reduce:animate-none"
    >
      {VISIT_INFO_TEXT}
    </PopoverContent>
  </Popover>
)

const Periodo = ({ aba, m }: { aba: MovementPeriodKey; m: Movimento | undefined }) => {
  const carregando = !m
  const v = m ? periodValues(aba, m) : null
  const linhas = m
    ? [cappedLine(aba, m), emptyCounterLine(m), lastVisitLine(m), updatedAtLine(m)].filter(
        (l): l is string => l !== null,
      )
    : []

  return (
    <div className="space-y-3">
      {m && <p className="text-sm text-muted-foreground">{periodLine(aba, m)}</p>}

      <div data-grade="movimento" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Visitas únicas"
          loading={carregando}
          value={<Valor>{v?.visitas}</Valor>}
          subtitle={m ? countingSinceLine(aba, m) ?? undefined : undefined}
          info={<InfoVisitas />}
          icon={Eye}
          accent="text-estrelinha-admin-cyan"
        />
        <StatCard
          label="Vendas"
          loading={carregando}
          value={<Valor>{v?.vendas}</Valor>}
          icon={ShoppingCart}
          accent="text-estrelinha-admin-pink"
        />
        <StatCard
          label="Faturamento"
          loading={carregando}
          value={<Valor>{v?.faturamento}</Valor>}
          icon={DollarSign}
          accent="text-emerald-500"
        />
        <StatCard
          label="Ticket médio"
          loading={carregando}
          value={
            <Valor>
              {v?.ticket ?? (
                <>
                  <span aria-hidden="true">{TICKET_VAZIO}</span>
                  <span className="sr-only">{SEM_VENDAS_TEXT}</span>
                </>
              )}
            </Valor>
          }
          icon={Receipt}
          accent="text-estrelinha-admin-violet"
        />
      </div>

      {linhas.length > 0 && (
        // O host (`VIS-39`) não tem espaço: sem `overflow-wrap:anywhere` ele empurraria a largura.
        <div className="space-y-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
          {linhas.map(l => (
            <p key={l}>{l}</p>
          ))}
        </div>
      )}
    </div>
  )
}

const StoreMovement = () => {
  const tituloId = useId()
  const [aba, setAba] = useState<MovementPeriodKey>('hoje')
  const { data, isLoading, isError, refetch } = useStoreMovement()

  return (
    <section aria-labelledby={tituloId} aria-busy={isLoading || undefined} className="space-y-3">
      <h2 id={tituloId} className="font-heading font-bold text-foreground">
        Movimento da loja
      </h2>

      {isError && !data ? (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Não foi possível carregar os números do período.</p>
          <Button type="button" variant="outline" className="h-11" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <Tabs value={aba} onValueChange={valor => setAba(valor as MovementPeriodKey)}>
          <TabsList aria-label="Período" className="h-auto">
            {ABAS.map(a => (
              <TabsTrigger key={a.valor} value={a.valor} className="min-h-11 px-4">
                {a.rotulo}
              </TabsTrigger>
            ))}
          </TabsList>
          {ABAS.map(a => (
            <TabsContent key={a.valor} value={a.valor} className="mt-3">
              <Periodo aba={a.valor} m={data} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </section>
  )
}

export default StoreMovement
