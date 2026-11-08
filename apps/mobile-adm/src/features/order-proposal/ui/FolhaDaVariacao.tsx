import { useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { EnvioIcon } from '@estrelinha/ui/icons'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@estrelinha/ui/sheet'
import { formatPrice } from '@estrelinha/core/formatters'
import { engravingLimit } from '@estrelinha/core/material'
import type { PecaParaProposta, VariacaoDaPeca } from '@estrelinha/core/proposals'

import { devolverFoco } from '@/features/order-actions'
import type { FolhaNaEntrada } from '@/shared/lib/useFolhaNaEntrada'
import FotoDaPeca from '@/shared/ui/FotoDaPeca'
import { CAMPO, ROTULO } from '@/shared/ui/campo'

import {
  AVISO_DE_MATERIAL,
  DICA_DA_GRAVACAO,
  ESGOTADA,
  ESTOQUE_LIVRE,
  FOTO_TROCA_COM_A_VARIACAO,
  NOTA_DA_GRAVACAO,
  O_QUE_GRAVAR,
  QUANTIDADE,
  SEM_PRECO,
  UMA_A_MAIS,
  UMA_A_MENOS,
  acrescentarPor,
  emEstoque,
  escolhaDisponivel,
  escolhaGrava,
  estoqueDaEscolha,
  linhaDaEscolha,
  passaDoEstoque,
  precoDaEscolha,
  promocaoNestaPeca,
  rotuloDoEixo,
  salvarPor,
  soHaEmEstoque,
  variacaoDe,
  variacaoInicial,
  type LinhaDaSacola,
} from '../model/sacola'
import { usePromocaoDasLinhas } from '../model/usePromocaoDasLinhas'

/**
 * A folha da variação do passo 2 — no histórico (o voltar do Android a fecha), molde de `FolhaColarTexto`.
 *
 * - **A foto grande é a da variação escolhida** e troca a cada toque; sem foto própria, a capa (a regra
 *   é de `core`: `mapearPecaParaProposta` já resolveu a foto de cada variação).
 * - Abre na **primeira variação com estoque**; a esgotada fica desligada, com "Esgotada".
 * - **A quantidade não passa do estoque somando a MESMA variação já na sacola**: acima dele, a
 *   frase e o botão desligado.
 * - A gravação só aparece na variação que grava, com o teto da peça.
 * - Editar reabre a mesma folha com a escolha da linha, e o botão diz "Salvar".
 * - O estado da escolha vive no corpo da folha: desmonta ao fechar.
 * - **Confirma uma vez por abertura**: o voltar que fecha a folha é assíncrono e a folha segue montada
 *   na animação de saída; um segundo toque nesse intervalo não entrega a escolha de novo.
 * - Acima do estoque, a linha "N em estoque" VIRA "Só há N em estoque." (no mesmo lugar, uma só).
 * - **A promoção vigente** ("<promoção> · 15% nesta peça") vem da prévia do servidor, com a sacola e a
 *   escolha de agora (a faixa conta as unidades); sem promoção, ou com a prévia falhando, nada aparece.
 */
export interface FolhaDaVariacaoProps {
  controle: FolhaNaEntrada
  peca: PecaParaProposta | null
  /** A linha que está sendo editada, ou `null` para uma peça nova. */
  editando: LinhaDaSacola | null
  sacola: readonly LinhaDaSacola[]
  aoConfirmar: (escolha: { variacao: VariacaoDaPeca | null; quantidade: number; gravacao: string }) => void
  /** O e-mail da cliente, que vai à prévia com a escolha. */
  emailDaCliente: string
  /** A recusa (`42501`) da prévia — a página a entrega à vigia. */
  aoRecusarPapel: (erro: unknown) => void
}

const textoDoChip = (peca: PecaParaProposta, v: VariacaoDaPeca): string =>
  !v.disponivel ? ESGOTADA : peca.politica !== 'track' ? ESTOQUE_LIVRE : emEstoque(v.estoque)

const Corpo = ({
  peca,
  editando,
  sacola,
  aoConfirmar,
  emailDaCliente,
  aoRecusarPapel,
}: Omit<FolhaDaVariacaoProps, 'controle'> & { peca: PecaParaProposta }) => {
  const [variacao, setVariacao] = useState<VariacaoDaPeca | null>(() =>
    editando ? (variacaoDe(peca, editando.variacaoId) ?? variacaoInicial(peca)) : variacaoInicial(peca),
  )
  const [quantidade, setQuantidade] = useState(editando?.quantidade ?? 1)
  const [gravacao, setGravacao] = useState(editando?.gravacao ?? '')
  const confirmou = useRef(false)

  const preco = precoDaEscolha(peca, variacao)
  const estoque = estoqueDaEscolha(peca, variacao)
  const passou = passaDoEstoque(peca, variacao, quantidade, sacola, editando?.chave ?? null)
  const disponivel = escolhaDisponivel(peca, variacao)
  const grava = escolhaGrava(variacao)
  const teto = engravingLimit(peca.limiteDeGravacao)
  const bloqueado = !disponivel || preco === null || passou
  const total = (preco ?? 0) * quantidade
  const foto = variacao ? variacao.imagem : peca.imagem

  // A prévia da sacola com a escolha da folha no lugar da linha editada (a gravação não entra: ela não
  // muda a promoção). Sem a variação que a peça pede, ou sem preço, não há o que perguntar.
  const perguntavel = preco !== null && (peca.variacoes.length === 0 || variacao !== null)
  const linhas = perguntavel
    ? [...sacola.filter((l) => l.chave !== editando?.chave), linhaDaEscolha('escolha-da-folha', peca, variacao, quantidade, '')]
    : null
  const promocao = usePromocaoDasLinhas(linhas, emailDaCliente)
  const daEscolha = promocao.promocoes?.[promocao.promocoes.length - 1] ?? null
  useEffect(() => {
    if (promocao.erroBruto) aoRecusarPapel(promocao.erroBruto)
  }, [promocao.erroBruto, aoRecusarPapel])

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex gap-3">
        <FotoDaPeca foto={foto} tamanho={104} altura={130} />
        <div className="min-w-0 flex-1 space-y-1">
          <SheetTitle className="font-display text-lg text-estrelinha-ink [overflow-wrap:anywhere]">{peca.nome}</SheetTitle>
          <SheetDescription className="font-display text-base font-bold tabular-nums text-estrelinha-primary">{preco === null ? '—' : formatPrice(preco)}</SheetDescription>
          {daEscolha && <p className="text-sm text-estrelinha-ink [overflow-wrap:anywhere]">{promocaoNestaPeca(daEscolha)}</p>}
          {variacao && <p className="text-sm text-estrelinha-ink-soft [overflow-wrap:anywhere]">{variacao.rotulo}</p>}
        </div>
      </div>

      {peca.variacoes.length > 0 && (
        <div className="space-y-2">
          {peca.variacoes.length > 1 && <p className="text-sm text-estrelinha-ink-soft">{FOTO_TROCA_COM_A_VARIACAO}</p>}
          <p id="eixo-da-variacao" className={ROTULO}>
            {rotuloDoEixo(peca)}
          </p>
          <div role="group" aria-labelledby="eixo-da-variacao" className="flex flex-wrap gap-2">
            {peca.variacoes.map((v) => {
              const escolhida = variacao?.id === v.id
              return (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={escolhida}
                  disabled={!v.disponivel}
                  onClick={() => setVariacao(v)}
                  className={`flex min-h-12 max-w-full items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 text-left disabled:opacity-50 ${
                    escolhida ? 'border-estrelinha-primary bg-estrelinha-primary' : 'border-estrelinha-line bg-estrelinha-surface'
                  }`}
                >
                  <FotoDaPeca foto={v.imagem} tamanho={36} className="rounded-full" />
                  <span className="min-w-0">
                    <span
                      className={`block text-sm [overflow-wrap:anywhere] ${escolhida ? 'text-estrelinha-on-primary' : 'text-estrelinha-ink'}`}
                    >
                      {v.rotulo}
                    </span>
                    <span className={`block text-xs ${escolhida ? 'text-estrelinha-on-primary' : 'text-estrelinha-ink-soft'}`}>
                      {textoDoChip(peca, v)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <p id="quantidade-da-peca" className={ROTULO}>
          {QUANTIDADE}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-labelledby="quantidade-da-peca" className="flex items-center gap-1">
            <button
              type="button"
              aria-label={UMA_A_MENOS}
              disabled={quantidade <= 1}
              onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-estrelinha-field text-estrelinha-ink disabled:opacity-50"
            >
              <Minus aria-hidden="true" className="h-5 w-5" />
            </button>
            <output aria-live="polite" className="min-w-10 text-center text-lg tabular-nums text-estrelinha-ink">
              {quantidade}
            </output>
            <button
              type="button"
              aria-label={UMA_A_MAIS}
              onClick={() => setQuantidade((q) => q + 1)}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-estrelinha-field text-estrelinha-ink"
            >
              <Plus aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          {estoque !== null &&
            (passou ? (
              <span id="motivo-da-folha" role="alert" className="text-sm text-estrelinha-alert">
                {soHaEmEstoque(estoque)}
              </span>
            ) : (
              <span className="text-sm text-estrelinha-ink-soft">{emEstoque(estoque)}</span>
            ))}
        </div>
        {!passou && preco === null && disponivel && (
          <p id="motivo-da-folha" role="alert" className="text-sm text-estrelinha-alert">
            {SEM_PRECO}
          </p>
        )}
      </div>

      {grava && (
        <div className="flex flex-col gap-1">
          <label htmlFor="gravacao-da-peca" className={ROTULO}>
            {O_QUE_GRAVAR}
          </label>
          <input
            id="gravacao-da-peca"
            type="text"
            value={gravacao}
            maxLength={teto}
            placeholder={DICA_DA_GRAVACAO}
            aria-describedby="gravacao-da-peca-nota"
            onChange={(e) => setGravacao(e.target.value.slice(0, teto))}
            className={CAMPO}
          />
          <p id="gravacao-da-peca-nota" className="flex flex-wrap justify-between gap-x-3 text-sm text-estrelinha-ink-soft">
            <span>{NOTA_DA_GRAVACAO}</span>
            <span className="tabular-nums">{`${gravacao.length}/${teto}`}</span>
          </p>
        </div>
      )}

      {peca.pedeMaterial && (
        <div data-parte="aviso-de-material" className="flex items-start gap-2 rounded-md bg-estrelinha-ground-deep p-3">
          <EnvioIcon aria-hidden className="h-5 w-5 shrink-0 text-estrelinha-primary" />
          <p className="min-w-0 flex-1 text-sm text-estrelinha-ink">{AVISO_DE_MATERIAL}</p>
        </div>
      )}

      <button
        type="button"
        disabled={bloqueado}
        aria-describedby={passou || (preco === null && disponivel) ? 'motivo-da-folha' : undefined}
        onClick={() => {
          if (confirmou.current) return
          confirmou.current = true
          aoConfirmar({ variacao, quantidade, gravacao })
        }}
        className="min-h-12 w-full rounded-sm bg-estrelinha-primary px-4 text-base font-medium text-estrelinha-on-primary disabled:opacity-60"
      >
        {editando ? salvarPor(total) : acrescentarPor(total)}
      </button>
    </div>
  )
}

const FolhaDaVariacao = ({ controle, peca, ...resto }: FolhaDaVariacaoProps) => {
  const quemAbriu = useRef<HTMLElement | null>(null)
  return (
    <Sheet
      open={controle.aberta && peca !== null}
      onOpenChange={(abrir) => {
        if (!abrir) controle.fechar()
      }}
    >
      <SheetContent
        side="bottom"
        hideClose
        onOpenAutoFocus={() => {
          const ativo = document.activeElement
          quemAbriu.current = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          devolverFoco(quemAbriu.current)
          quemAbriu.current = null
        }}
        overlayClassName="motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
        className="max-h-[90dvh] overflow-y-auto rounded-t-lg border-estrelinha-line bg-estrelinha-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-estrelinha-ink motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      >
        {peca && <Corpo key={`${peca.id}:${resto.editando?.chave ?? 'nova'}`} peca={peca} {...resto} />}
      </SheetContent>
    </Sheet>
  )
}

export default FolhaDaVariacao
