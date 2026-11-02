// O relatório de adesão ao Compre Junto: o período, três indicadores, a regra por escrito e o cartão
// "Por joia principal" / "Por lista" — tabela no computador, cartões no celular, com a barra de valor
// proporcional ao maior valor do recorte. O banco conta; aqui só se escreve o que ele devolveu.

import { useState } from 'react'
import { Coins, Package, ShoppingBag } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import { formatPrice } from '@estrelinha/core/formatters'
import { EmptyState, StatCard } from '@/shared/ui'
import { useBuyTogetherAdoption } from '../api/useBuyTogetherAdoption'
import {
  ADOPTION_PERIODS,
  DEFAULT_ADOPTION_PERIOD,
  NO_TOP_PIECE,
  RULE_NOTE,
  averageLine,
  barWidth,
  emptyLine,
  listLabel,
  periodLabel,
  shareLine,
  type AdoptionPeriod,
  type BuyTogetherAdoption,
} from '../model/adoption'

type Recorte = 'joia' | 'lista'

interface Linha {
  chave: string
  nome: string
  pedidos?: number
  pecas: number
  valor: number
  top: string
}

const linhasDe = (dado: BuyTogetherAdoption, recorte: Recorte): Linha[] =>
  recorte === 'joia'
    ? dado.por_joia.map(j => ({
        chave: j.principal,
        nome: j.nome,
        pedidos: j.pedidos,
        pecas: j.pecas,
        valor: Number(j.valor),
        top: j.top_nome ?? NO_TOP_PIECE,
      }))
    : dado.por_lista.map(l => ({
        chave: l.direto ? 'direto' : (l.lista_id ?? 'sem-lista'),
        nome: listLabel(l),
        pecas: l.pecas,
        valor: Number(l.valor),
        top: l.top_nome ?? NO_TOP_PIECE,
      }))

const Barra = ({ valor, maior }: { valor: number; maior: number }) => (
  <span className="mt-1 block h-1.5 w-full max-w-40 overflow-hidden rounded-full bg-muted" aria-hidden="true">
    <span data-testid="barra-de-valor" className="block h-full rounded-full bg-primary" style={{ width: barWidth(valor, maior) }} />
  </span>
)

const Indicador = ({
  rotulo,
  valor,
  subtitulo,
  icone,
  carregando,
}: {
  rotulo: string
  valor: string
  subtitulo: string
  icone: typeof Coins
  carregando: boolean
}) => (
  <div data-indicador="" data-testid={carregando ? 'adesao-carregando' : undefined} aria-busy={carregando || undefined}>
    <StatCard label={rotulo} value={valor} subtitle={subtitulo} icon={icone} loading={carregando} className="h-full" />
  </div>
)

const Recortes = ({ dado }: { dado: BuyTogetherAdoption }) => {
  const [recorte, setRecorte] = useState<Recorte>('joia')
  const linhas = linhasDe(dado, recorte)
  const maior = Math.max(0, ...linhas.map(l => l.valor))
  const comPedidos = recorte === 'joia'

  return (
    <section className="rounded-2xl border border-border bg-card p-4" aria-label="Recortes do relatório">
      <Tabs value={recorte} onValueChange={v => setRecorte(v as Recorte)}>
        <TabsList aria-label="Recorte" className="h-auto">
          <TabsTrigger value="joia" className="min-h-11 px-4">
            Por joia principal
          </TabsTrigger>
          <TabsTrigger value="lista" className="min-h-11 px-4">
            Por lista
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <table data-testid="adesao-tabela" className="mt-4 hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 font-medium">{comPedidos ? 'Joia principal' : 'Lista'}</th>
            {comPedidos && <th className="py-2 text-right font-medium">Pedidos</th>}
            <th className="py-2 text-right font-medium">Peças</th>
            <th className="py-2 pl-6 font-medium">Valor</th>
            <th className="py-2 font-medium">Peça que mais sai</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => (
            <tr key={l.chave} className="border-b border-border/60 align-top">
              <td className="py-3 pr-4 font-medium text-foreground">{l.nome}</td>
              {comPedidos && <td className="py-3 text-right tabular-nums">{l.pedidos}</td>}
              <td className="py-3 text-right tabular-nums">{l.pecas}</td>
              <td className="py-3 pl-6">
                <span className="tabular-nums">{formatPrice(l.valor)}</span>
                <Barra valor={l.valor} maior={maior} />
              </td>
              <td className="py-3 text-muted-foreground">{l.top}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul data-testid="adesao-cartoes" className="mt-4 space-y-3 md:hidden">
        {linhas.map(l => (
          <li key={l.chave} className="min-w-0 rounded-xl border border-border p-3">
            <p className="break-words font-medium text-foreground">{l.nome}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {comPedidos && (
                <>
                  {l.pedidos} {l.pedidos === 1 ? 'pedido' : 'pedidos'} ·{' '}
                </>
              )}
              {l.pecas} {l.pecas === 1 ? 'peça' : 'peças'} · <span className="tabular-nums">{formatPrice(l.valor)}</span>
            </p>
            <Barra valor={l.valor} maior={maior} />
            <p className="mt-2 break-words text-xs text-muted-foreground">
              Peça que mais sai: <span className="text-foreground">{l.top}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

const AdoptionReport = () => {
  const [dias, setDias] = useState<AdoptionPeriod>(DEFAULT_ADOPTION_PERIOD)
  const { data, isPending, isError, error, refetch } = useBuyTogetherAdoption(dias)
  const carregando = isPending && !data

  return (
    <div className="space-y-4">
      <Tabs value={String(dias)} onValueChange={v => setDias(Number(v) as AdoptionPeriod)}>
        <TabsList aria-label="Período" className="h-auto">
          {ADOPTION_PERIODS.map(p => (
            <TabsTrigger key={p} value={String(p)} className="min-h-11 px-4">
              {periodLabel(p)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isError && !data ? (
        <EmptyState
          icon={ShoppingBag}
          message="Não foi possível ler o relatório."
          hint={error instanceof Error ? error.message : (error as { message?: string } | null)?.message}
          action={<Button onClick={() => void refetch()}>Tentar de novo</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Indicador
              rotulo="Pedidos com Compre Junto"
              valor={String(data?.pedidos_com ?? '')}
              subtitulo={data ? shareLine(data.parte, data.pedidos_pagos) : ''}
              icone={ShoppingBag}
              carregando={carregando}
            />
            <Indicador
              rotulo="Peças levadas junto"
              valor={String(data?.pecas ?? '')}
              subtitulo={data ? averageLine(data.media) : ''}
              icone={Package}
              carregando={carregando}
            />
            <Indicador
              rotulo="Valor das peças levadas junto"
              valor={data ? formatPrice(Number(data.valor)) : ''}
              subtitulo="pelo preço pago em cada peça"
              icone={Coins}
              carregando={carregando}
            />
          </div>

          <p className="text-xs text-muted-foreground">{RULE_NOTE}</p>

          {data &&
            (data.pedidos_com === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {emptyLine(data.dias)}
              </p>
            ) : (
              <Recortes dado={data} />
            ))}
        </>
      )}
    </div>
  )
}

export default AdoptionReport
