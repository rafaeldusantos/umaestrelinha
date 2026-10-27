import { Plus } from 'lucide-react'
import { EnvioIcon } from '@estrelinha/ui/icons'
import { cn } from '@estrelinha/ui/lib/utils'
import { materialTrackingEdit, materialTrackingEmpty, materialTrackingOrigin } from '@estrelinha/core/material'
import { COPY_FAILED, TRACKING_COPIED } from '@estrelinha/core/orders'

import type { PedidoDoDetalhe } from '@/entities/order'
import { correiosTrackingUrl } from '@/shared/config/correios'
import { nomeDoLinkExterno } from '@/shared/config/novaAba'
import { BOTAO_SECUNDARIO } from '@/shared/ui/campo'

import { mostrarAviso } from '../model/avisos'
import { devolverFoco } from '../model/foco'
import type { AcaoDoPedido } from '../model/useAcaoDoPedido'
import { useFolhaNoHistorico } from '../model/useFolhaNoHistorico'
import AlertaDaAcao from './AlertaDaAcao'
import FolhaDoRastreio from './FolhaDoRastreio'

export const TITULO_DO_ENVELOPE = 'Envelope da cliente'
export const ROTULO_DO_CODIGO = 'Código dos Correios'
export const COPIAR_CODIGO = 'Copiar código'
export const VER_NOS_CORREIOS = 'Ver nos Correios'
export const INFORMAR_CODIGO = 'Informar código do envelope'

/** O botão secundário de 44 px do app (o mesmo contorno de "Ver cliente"). */
const SECUNDARIO = cn(
  BOTAO_SECUNDARIO,
  'flex min-h-11 items-center justify-center gap-2 border border-estrelinha-primary px-3 py-2 text-center [overflow-wrap:anywhere]',
)

/**
 * "Envelope da cliente" no bloco Material (feature `82`, `ENV-01`, `03`, `04`, `15`, `17`..`20`).
 *
 * A remessa de ENTRADA — o envelope que a cliente posta com o material (`material_tracking_code`) —,
 * nunca o rastreio de saída da joia. Não decide nada: editável e o rótulo do link são de
 * `materialTrackingEdit`; quem informou e quando, de `materialTrackingOrigin`; a frase do "sem código",
 * de `materialTrackingEmpty` — todos em `core/material`, contra o `lido_em` do SERVIDOR.
 *
 * - **Com código** (`ENV-15`, `ENV-17`): o cartão com o código (selecionável inteiro — A9: se a cópia
 *   falhar, ela toca e segura), a linha de origem, e "Copiar código" + "Ver nos Correios" — também
 *   quando não editável. "Alterar" à direita do título só com código E editável (`ENV-04`).
 * - **Sem código** (`ENV-20`, `ENV-03`): a frase, e "Informar código do envelope" só se editável.
 * - "Copiar código" (`ENV-18`): `navigator.clipboard.writeText` e o aviso único do app — "Código
 *   copiado." ou, na falha (sem permissão, sem contexto seguro, sem a API), a frase de A9. As duas de
 *   `core`.
 * - "Ver nos Correios" (`ENV-19`): link de aba nova, com o aviso no nome acessível (`novaAbaAvisada`).
 * - A folha é a MESMA `FolhaDoRastreio`, com `origem="material"` (`ENV-12`), e a ação é a do pedido
 *   (`acao`, a mesma trava do rodapé).
 * - **O erro do envelope fica NO envelope** (feature `82`, Fase 5, T16/T17): com a folha fechada ("Agora
 *   não", o voltar, a tela que saiu por falta de rede), a falha do código aparece aqui, abaixo do cartão,
 *   com "Tentar de novo" quando ela guarda o código — nunca no rodapé, em cima de "Recebi o material"
 *   (`BUG-20261026-erro-de-uma-acao-aparece-em-outra`). Com a folha aberta, quem a desenha é a folha.
 */
export interface EnvelopeDaClienteProps {
  pedido: PedidoDoDetalhe
  lidoEm: string
  acao: AcaoDoPedido
}

const copiar = async (codigo: string) => {
  try {
    await navigator.clipboard.writeText(codigo)
    mostrarAviso({ titulo: TRACKING_COPIED })
  } catch {
    mostrarAviso({ titulo: COPY_FAILED })
  }
}

const EnvelopeDaCliente = ({ pedido, lidoEm, acao }: EnvelopeDaClienteProps) => {
  const edicao = materialTrackingEdit(pedido)
  const controle = useFolhaNoHistorico(pedido, 'material')
  const codigo = pedido.material_tracking_code?.trim() ?? ''
  const origem = materialTrackingOrigin(pedido, lidoEm)
  const vazio = materialTrackingEmpty(pedido, lidoEm)
  const erro = acao.travado || controle.aberta ? null : acao.erroDe(['rastreio-do-material'])
  const abrir = () => {
    if (!acao.travado) controle.abrir()
  }

  return (
    <div data-parte="envelope" className="mt-4 border-t border-estrelinha-line pt-3.5">
      {/* O ícone e o título são um grupo com piso em rem, e a linha embrulha: com a fonte grande
          "Alterar" desce (à direita) em vez de espremer o título até partir a palavra — a 200 % em
          360/390 saía "Envel/ope/da/client/e" (prova em navegador da `82`, T15). */}
      <div className="flex flex-wrap items-center gap-x-2">
        <div className="flex min-w-[min(100%,9rem)] flex-1 items-center gap-2">
          <EnvioIcon aria-hidden className="h-5 w-5 shrink-0 text-estrelinha-primary" />
          <h3 className="min-w-0 flex-1 font-display text-[15px] font-bold text-estrelinha-ink [overflow-wrap:anywhere]">{TITULO_DO_ENVELOPE}</h3>
        </div>
        {codigo && edicao?.rotulo && (
          <button
            type="button"
            onClick={abrir}
            data-testid="alterar-envelope"
            className="-my-1.5 ml-auto inline-flex min-h-11 shrink-0 items-center px-1 text-sm font-medium text-estrelinha-primary"
          >
            {edicao.rotulo}
            <span className="sr-only"> o código do envelope</span>
          </button>
        )}
      </div>

      {codigo ? (
        <>
          <div data-parte="cartao-do-codigo" className="mt-3 rounded-[12px] bg-estrelinha-ground-deep px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft">{ROTULO_DO_CODIGO}</p>
            <p data-parte="codigo" className="mt-1 select-all text-lg font-semibold tracking-[.08em] text-estrelinha-ink [overflow-wrap:anywhere]">
              {codigo}
            </p>
            {origem && (
              <p data-parte="origem" className="mt-1 text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">
                {origem}
              </p>
            )}
          </div>
          {/* A grade reflui com a fonte (piso em rem, a lição do QA da `73`): lado a lado com a fonte
              padrão, uma coluna quando ela cresce. Com `grid-cols-2` fixo, a 200 % em 360/390 os rótulos
              se partiam no meio da palavra ("Cop/iar/códi/go") — prova em navegador da `82`, T15. */}
          <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(min(100%,7rem),1fr))] gap-2">
            <button type="button" onClick={() => void copiar(codigo)} className={SECUNDARIO}>
              {COPIAR_CODIGO}
            </button>
            <a
              target="_blank"
              href={correiosTrackingUrl(codigo)}
              rel="noopener noreferrer"
              aria-label={nomeDoLinkExterno(VER_NOS_CORREIOS)}
              className={SECUNDARIO}
            >
              {VER_NOS_CORREIOS}
            </a>
          </div>
        </>
      ) : (
        <>
          {vazio && (
            <p data-parte="sem-codigo" className="mt-2 text-[13px] leading-[1.45] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
              {vazio}
            </p>
          )}
          {edicao && (
            <button type="button" onClick={abrir} data-testid="informar-envelope" className={cn(SECUNDARIO, 'mt-3 w-full')}>
              <Plus aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={1.5} />
              {INFORMAR_CODIGO}
            </button>
          )}
        </>
      )}

      {erro && (
        <AlertaDaAcao
          className="mt-3"
          erro={erro}
          aoTentarDeNovo={(retentativa) => {
            if (acao.travado) return
            // O "Tentar de novo" sai da tela com o desfecho — no sucesso (o alerta some) e no `mudou` (a
            // frase fica, sem retentativa). O foco iria ao `<body>` (reteste em navegador, 2026-10-27);
            // vai ao título da página, o molde de "Colocar em produção" (D3) e da folha (C03).
            void acao.executar(pedido, retentativa, { aoConcluir: () => devolverFoco(null) }).then((ok) => {
              if (!ok) setTimeout(() => {
                if (document.activeElement === document.body || !document.activeElement) devolverFoco(null)
              }, 0)
            })
          }}
        />
      )}

      <FolhaDoRastreio row={pedido} origem="material" controle={controle} acao={acao} />
    </div>
  )
}

export default EnvelopeDaCliente
