// O bloco "Filtros da loja" do produto — feature 66 (`FLT-11`..`FLT-14`), e desde a 67 também pelas
// variações (`VFL-01`..`VFL-08`, `VFL-29`..`VFL-31`).
//
// Duas seções:
//
// - **Na peça toda** — a da 66: um grupo por linha, na ordem do painel, e os valores como chips de
//   seleção múltipla. Grupo desligado APARECE, com o selo "Desligado na loja", e continua editável
//   (`FLT-14`): desligar tirou o grupo da loja, não a curadoria.
// - **Pelas variações** — só com eixo (`VFL-02`): um cartão por eixo, uma linha por texto de opção,
//   na ordem de `options`. Eixo sem marcação nem sugestão nasce RECOLHIDO — "Colar coração com
//   letra" tem 26 letras e ninguém marca acabamento por letra.
//
// O estado é do formulário (`filter_value_ids` e a projeção `marcacoesVigentes` das marcações por
// opção), e quem grava é o save do produto, pelo diff — esta peça só escolhe. A ÚNICA escrita daqui
// é o "Recusar" de uma sugestão, que grava na hora (`VFL-30`).
//
// **As sugestões são as da fila** (`VFL-31`): `suggestMarks`, de `@estrelinha/core/filters`, chamada
// com a peça como ela está NO FORMULÁRIO — nome, tags, eixos e grade que a dona acabou de mudar —, e
// com as recusas gravadas dela. Escrita nesta tela, a fila diria "nenhuma sugestão" para uma peça cujo
// formulário mostra três, e nada quebraria.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@estrelinha/ui/lib/utils'
import { suggestMarks, suggestionReason, type OptionMark, type Suggestion } from '@estrelinha/core/filters'
import { FormCard } from '@/shared/ui'
import { gravarRecusas, invalidarRecusas, useAdminFilterCatalog, useSuggestionDismissals } from '@/entities/filter'
import { cartoesDeEixo, opcoesLabel, type VariacaoDoFormulario } from '../model/optionRows'
import OptionMarkRow from './OptionMarkRow'
import SuggestionStrip from './SuggestionStrip'

export interface PecaDoFormulario {
  /** `null` em produto novo. */
  id: string | null
  name: string
  tags: readonly string[]
  options: readonly { name: string; values: readonly string[]; position: number }[]
  variants: readonly (VariacaoDoFormulario & { id: string; position?: number | null })[]
}

interface Props {
  selected: readonly string[] | undefined
  onChange: (ids: string[]) => void
  /** Feature 67 — a projeção vigente das marcações por opção. Ausente: a seção não aparece. */
  optionMarks?: readonly OptionMark[]
  onOptionMarksChange?: (marks: OptionMark[]) => void
  /** Feature 67 — a peça como está no formulário, para as linhas e para as sugestões. */
  product?: PecaDoFormulario
}

const CHIP = 'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm'

const FilterValuesCard = ({ selected, onChange, optionMarks, onOptionMarksChange, product }: Props) => {
  const { groups, loading, error } = useAdminFilterCatalog()
  const recusas = useSuggestionDismissals(product ? product.id : null)
  const qc = useQueryClient()
  const [recusando, setRecusando] = useState(false)
  const [erroDaRecusa, setErroDaRecusa] = useState<string | null>(null)
  /** O que a dona abriu ou fechou à mão; o resto segue o padrão (aberto quando tem o que mostrar). */
  const [eixosTocados, setEixosTocados] = useState<Map<string, boolean>>(() => new Map())

  // Rascunho restaurado de antes da feature 66 não tem o campo: tratado como nada marcado.
  const marcados = new Set(selected ?? [])
  const porOpcao = optionMarks ?? []

  const valores = useMemo(() => groups.flatMap(g => g.values), [groups])
  const rotulos = useMemo(() => {
    const m = new Map<string, string>()
    for (const g of groups) for (const v of g.values) m.set(v.id, `${g.name} › ${v.name}`)
    return m
  }, [groups])
  const nomes = useMemo(() => new Map(valores.map(v => [v.id, v.name])), [valores])

  const sugestoes: Suggestion[] = useMemo(() => {
    if (!product || groups.length === 0 || recusas.carregando) return []
    return suggestMarks({
      catalog: {
        groups: groups.map(g => ({ id: g.id, name: g.name, slug: g.slug, is_active: g.is_active, sort_order: g.sort_order })),
        values: valores.map(v => ({ ...v, suggest_terms: v.suggest_terms ?? [] })),
      },
      products: [
        {
          id: product.id ?? 'novo',
          name: product.name,
          tags: product.tags,
          filter_value_ids: [...marcados],
          option_marks: porOpcao,
          variants: product.variants.map((v, i) => ({
            id: v.id,
            option_values: v.option_values,
            is_active: v.is_active,
            position: v.position ?? i,
          })),
        },
      ],
      dismissals: recusas.recusas,
    })
    // `marcados` é derivado de `selected`; listar `selected` é o que o React compara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, groups, valores, selected, porOpcao, recusas.carregando, recusas.recusas])

  const alternar = (id: string) => {
    const proxima = new Set(marcados)
    if (proxima.has(id)) proxima.delete(id)
    else proxima.add(id)
    onChange([...proxima])
  }

  const alternarNaOpcao = (eixo: string, texto: string, valueId: string) => {
    if (!onOptionMarksChange) return
    const tem = porOpcao.some(m => m.option_name === eixo && m.option_value === texto && m.value_id === valueId)
    onOptionMarksChange(
      tem
        ? porOpcao.filter(m => !(m.option_name === eixo && m.option_value === texto && m.value_id === valueId))
        : [...porOpcao, { option_name: eixo, option_value: texto, value_id: valueId }],
    )
  }

  /** "Aceitar" mexe SÓ no estado (`VFL-30`); a gravação é a do "Salvar". */
  const aceitar = (s: Suggestion) => {
    if (s.source === 'option') {
      alternarNaOpcao(s.option_name, s.option_value, s.value_id)
      // A troca (`VFL-27`): aprovar por opção um valor que estava na peça toda tira o da peça toda.
      if (s.replacesWholeMark) onChange([...marcados].filter(id => id !== s.value_id))
      return
    }
    if (!marcados.has(s.value_id)) onChange([...marcados, s.value_id])
  }

  /** "Recusar" grava na hora, e a recusa some da tela pela releitura (a chave invalidada). */
  const recusar = async (s: Suggestion) => {
    if (!product?.id) return
    setRecusando(true)
    setErroDaRecusa(null)
    const motivo = await gravarRecusas([
      { product_id: product.id, value_id: s.value_id, option_name: s.option_name, option_value: s.option_value },
    ])
    if (motivo) setErroDaRecusa(motivo)
    else await invalidarRecusas(qc)
    setRecusando(false)
  }

  const naPeca = sugestoes.filter(s => s.source !== 'option')
  const daOpcao = (eixo: string, texto: string) =>
    sugestoes.filter(s => s.source === 'option' && s.option_name === eixo && s.option_value === texto)

  const cartoes = product && onOptionMarksChange ? cartoesDeEixo(product.options, product.variants) : []
  const podeRecusar = !!product?.id

  return (
    <FormCard
      title="Filtros da loja"
      description="Em que filtros esta peça aparece. Salva junto com o produto."
      action={
        groups.length > 0 ? (
          <Link to="/admin/filtros" className="text-xs font-semibold text-primary hover:underline">
            Gerenciar filtros ›
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando os filtros…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar os filtros. As marcações desta peça não mudam ao salvar.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum filtro criado ainda.{' '}
          <Link to="/admin/filtros" className="font-semibold text-primary hover:underline">
            Criar os filtros da loja
          </Link>
        </p>
      ) : (
        <div className="space-y-5">
          {erroDaRecusa && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {erroDaRecusa}
            </p>
          )}
          <section aria-label="Na peça toda">
            {cartoes.length > 0 && (
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Na peça toda</p>
            )}
            <div className="divide-y divide-border">
              {groups.map(grupo => {
                const sugeridas = naPeca.filter(s => grupo.values.some(v => v.id === s.value_id))
                const idsSugeridos = new Set(sugeridas.map(s => s.value_id))
                return (
                  <div
                    key={grupo.id}
                    role="group"
                    aria-label={grupo.name}
                    className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)]"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{grupo.name}</p>
                      {!grupo.is_active && (
                        <span className="mt-1 inline-block rounded-full bg-estrelinha-admin-amber/10 px-2 py-0.5 text-[11px] font-semibold text-estrelinha-admin-amber">
                          Desligado na loja
                        </span>
                      )}
                    </div>
                    {grupo.values.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum valor neste grupo ainda.</p>
                    ) : (
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {grupo.values.map(valor => {
                            const ativo = marcados.has(valor.id)
                            const sugerido = !ativo && idsSugeridos.has(valor.id)
                            return (
                              <button
                                key={valor.id}
                                type="button"
                                aria-pressed={ativo}
                                data-sugerido={sugerido || undefined}
                                onClick={() => alternar(valor.id)}
                                className={cn(
                                  CHIP,
                                  ativo
                                    ? 'border-primary bg-primary font-medium text-primary-foreground'
                                    : sugerido
                                      ? 'border-dashed border-primary bg-card text-primary hover:bg-muted'
                                      : 'border-border bg-card text-foreground hover:bg-muted',
                                )}
                              >
                                {ativo && <Check aria-hidden className="h-4 w-4" />}
                                {valor.name}
                              </button>
                            )
                          })}
                        </div>
                        {grupo.values
                          .filter(v => idsSugeridos.has(v.id))
                          .map(v => {
                            const daquele = sugeridas.filter(s => s.value_id === v.id)
                            return (
                              <SuggestionStrip
                                key={`faixa-${v.id}`}
                                texto={`Sugestão: ${v.name} — ${daquele.map(suggestionReason).join(' · ')}`}
                                onAceitar={() => aceitar(daquele[0])}
                                onRecusar={() => void recusar(daquele[0])}
                                podeRecusar={podeRecusar}
                                recusando={recusando}
                              />
                            )
                          })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          {cartoes.length > 0 && (
            <section aria-label="Pelas variações" className="border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pelas variações</p>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                Marque o que muda de uma variação para outra. A marcação vale para toda variação com o mesmo
                texto.
              </p>
              <div className="space-y-3">
                {cartoes.map(cartao => {
                  const marcasDoEixo = porOpcao.filter(m => m.option_name === cartao.name)
                  const temSugestao = sugestoes.some(s => s.source === 'option' && s.option_name === cartao.name)
                  const aberto = eixosTocados.get(cartao.name) ?? (marcasDoEixo.length > 0 || temSugestao)
                  const alternarEixo = () =>
                    setEixosTocados(atual => new Map(atual).set(cartao.name, !aberto))
                  return (
                    <div key={cartao.name} className="overflow-hidden rounded-xl border border-border">
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={alternarEixo}
                        className="flex min-h-11 w-full items-center gap-2 px-4 py-2 text-left"
                      >
                        <ChevronRight
                          aria-hidden
                          className={cn('h-4 w-4 shrink-0 text-muted-foreground', aberto && 'rotate-90')}
                        />
                        <span className="text-sm font-semibold text-foreground">{cartao.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {opcoesLabel(cartao.linhas.length)}
                          {!aberto && marcasDoEixo.length === 0 ? ' · nenhuma marcada' : ''}
                        </span>
                      </button>
                      {aberto && (
                        <div className="border-t border-border">
                          {cartao.linhas.map(linha => (
                            <OptionMarkRow
                              key={linha.option_value}
                              linha={linha}
                              grupos={groups}
                              marcados={porOpcao
                                .filter(m => m.option_name === linha.option_name && m.option_value === linha.option_value)
                                .map(m => m.value_id)}
                              naPecaToda={marcados}
                              rotulos={rotulos}
                              nomes={nomes}
                              sugestoes={daOpcao(linha.option_name, linha.option_value)}
                              motivo={suggestionReason}
                              onToggle={valueId => alternarNaOpcao(linha.option_name, linha.option_value, valueId)}
                              onAceitar={aceitar}
                              onRecusar={s => void recusar(s)}
                              podeRecusar={podeRecusar}
                              recusando={recusando}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </FormCard>
  )
}

export default FilterValuesCard
