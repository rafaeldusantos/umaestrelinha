import { useQuery } from '@tanstack/react-query'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { lerComPapel } from '@/shared/api/lerComPapel'

import { lerMontado, listarMontados } from '../api/portaDePropostas'
import type { LeituraDoMontado, ListaDeMontados } from './tipos'

/**
 * As leituras dos pedidos montados. Pela porta da function — as tabelas não têm policy
 * para o navegador —, nunca pelo PostgREST.
 *
 * - **A lista** (`atelie-montados`) traz o relógio do servidor (`agora`); a contagem de abertos do chip
 *   sai da MESMA resposta, sem cursor (a function devolve até 500).
 * - **O detalhe** (`atelie-montado`) passa por `lerComPapel`: a confirmação do papel e o `lido_em` do
 *   servidor (o "montado há 2 dias" da tela) chegam juntos com a proposta.
 * - A recusa (`42501` de `conferirPapel`) chega como erro da consulta, e a vigia da página a desenha; a
 *   falha da porta (rede, 5xx, resposta sem a forma) é falha de leitura, nunca recusa.
 * - A troca de conta limpa as duas chaves com o resto do cache (`LimparCacheNaTrocaDeConta`).
 */
export const MONTADOS_KEY = ['atelie-montados'] as const
export const MONTADO_KEY = 'atelie-montado'
export const chaveDoMontado = (id: string) => [MONTADO_KEY, id] as const

const FALHA_DA_PORTA = 'Não consegui ler os pedidos montados.'

const lerLista = async (): Promise<ListaDeMontados> => {
  const r = await listarMontados()
  if (r.tipo !== 'ok' || !Array.isArray(r.dado?.proposals) || typeof r.dado?.agora !== 'string') throw new Error(FALHA_DA_PORTA)
  return r.dado
}

export const useMontados = ({ habilitada = true }: { habilitada?: boolean } = {}) =>
  useQuery({
    queryKey: MONTADOS_KEY,
    queryFn: lerLista,
    enabled: habilitada,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: retryUnlessDenied,
  })

/**
 * O detalhe; `nao-achou` quando a function diz que a proposta não existe (404). Discriminado por STRING:
 * com `strictNullChecks: false`, união por literal booleano não estreita.
 */
export type MontadoAchado = { tipo: 'achou'; lido_em: string } & LeituraDoMontado
export type DetalheDoMontado = { tipo: 'nao-achou'; lido_em: string } | MontadoAchado

const lerDetalhe = async (id: string): Promise<DetalheDoMontado> => {
  const { resultado: r, lido_em } = await lerComPapel(() => lerMontado(id))
  if (r.tipo === 'erro' && r.status === 404) return { tipo: 'nao-achou', lido_em }
  if (r.tipo !== 'ok' || !r.dado?.proposal) throw new Error(FALHA_DA_PORTA)
  return { tipo: 'achou', lido_em, ...r.dado }
}

export const useMontado = (id: string, { habilitada = true }: { habilitada?: boolean } = {}) =>
  useQuery({
    queryKey: chaveDoMontado(id),
    queryFn: () => lerDetalhe(id),
    enabled: habilitada,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: retryUnlessDenied,
  })
