// Feature 86, T15 — editar um item do menu (`MNM-14`, `MNM-16`, `MNM-17`, `MNM-26`, `MNM-33`).
//
// Substitui o `MenuEntryEditor` da `39`, que editava a CATEGORIA (ícone na coluna `icon`, banners em
// `menu_banners`). Aqui se edita o NÓ do documento: o nome dele, o ícone dele e os banners dele. A
// categoria em si não é tocada — ela é de `/admin/categorias`.
//
// - **"Usar o nome da categoria"** (só item de categoria) grava `label: null`: o item acompanha o
//   nome da categoria quando ela for renomeada (`MNM-15`). Desligado, um nome próprio de até 40
//   caracteres, com contador — vazio ou só espaços é recusado com o motivo de `core` (`MNM-16`).
// - **Ícone só no item principal** (`MNM-26`): o submenu não tem ícone, e o editor de um filho nem
//   mostra o seletor.
// - **Banners do painel** (só item principal, categoria **ou** link — `MNM-33`): a caixa mostra a
//   contagem por dispositivo e abre o editor da `39`, que grava pelo nó.
//
// Nada aqui grava sozinho: "Salvar" entrega o patch a quem abriu (a tela, que chama `updateNode`).

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Monitor, Smartphone } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import {
  MENU_LABEL_MAX,
  menuIconKey,
  menuNodeLabelRefusal,
  menuNodeName,
  type MenuBanners,
  type MenuCategory,
  type MenuNode,
  type MenuRootNode,
  type MenuSurface,
} from '@estrelinha/core/menu'
import { CharCounter, SWITCH_TAP_44 } from '@/shared/ui'
import { bannersGravados } from '../model/bannersGravados'
import { deleteBannerImage } from '../lib/uploadBannerImage'
import MenuBannerEditor, { type MenuBannerDraftState } from './MenuBannerEditor'
import MenuIconPicker from './MenuIconPicker'
import { BOTAO_CONTORNO, BOTAO_CTA, BOTAO_FANTASMA, BOTAO_PERIGO } from './estilos'

/** O que "Salvar" entrega. `icon` só vem do item principal. */
export interface MenuItemEdit {
  label: string | null
  icon?: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** O nó em edição. Item principal tem `icon`, `banners` e `children`. */
  node: MenuNode | MenuRootNode | null
  ehRaiz: boolean
  categories: readonly MenuCategory[]
  /** Grava nome e ícone. Devolve o motivo da recusa/falha, ou `null` quando gravou. */
  onSave: (edit: MenuItemEdit) => Promise<string | null>
  /** Grava os banners do item. Mesmo contrato. */
  onSaveBanners: (banners: MenuBanners) => Promise<string | null>
  onRemove: () => void
  /** Q07 — quem abriu decide para onde o foco volta ao fechar. */
  onCloseAutoFocus?: (evento: Event) => void
}

/**
 * Q06b do QA da `86` — o `Button` do design system é `whitespace-nowrap` e `h-10`: com a letra do
 * celular a 200 % um rótulo longo passava da borda do diálogo. Aqui ele quebra linha e cresce.
 */
const QUEBRA = 'h-auto min-h-11 max-w-full whitespace-normal'

const ehRaizNo = (node: MenuNode | MenuRootNode | null): node is MenuRootNode =>
  !!node && 'children' in node

const MenuItemEditor = ({
  open,
  onOpenChange,
  node,
  ehRaiz,
  categories,
  onSave,
  onSaveBanners,
  onRemove,
  onCloseAutoFocus,
}: Props) => {
  const deCategoria = node?.target.kind === 'category'
  const nomeDaCategoria =
    node && node.target.kind === 'category'
      ? (categories.find(c => c.id === (node.target as { category_id: string }).category_id)?.name ?? '')
      : ''

  const [usarNome, setUsarNome] = useState(true)
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState<string | null>(null)
  const [vista, setVista] = useState<'item' | 'banners'>('item')
  const [dispositivo, setDispositivo] = useState<MenuSurface>('desktop')
  const [recusa, setRecusa] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  /**
   * Q05 do QA da `86` — o que o editor de banners tem e não gravou. Esc, fechar ou "Voltar" com
   * alteração não salva PERGUNTA antes ("Descartar as alterações do banner?"); descartar apaga do
   * Storage a arte enviada e não gravada, para não deixar órfão em `home-images/menu/`.
   */
  const rascunhoDosBanners = useRef<MenuBannerDraftState>({ sujo: false, artesNaoGravadas: [] })
  const [descartarPara, setDescartarPara] = useState<'fechar' | 'voltar' | null>(null)
  /**
   * R03 do QA r2 — o controle que abriu a pergunta. "Continuar editando" devolve o foco a ele (ou ao
   * primeiro campo da folha, se ele saiu do DOM); sem isso o Radix o deixava no `<body>`.
   */
  const focoAntesDaPergunta = useRef<HTMLElement | null>(null)
  const descartou = useRef(false)
  const conteudoDoEditor = useRef<HTMLDivElement | null>(null)
  const perguntar = (destino: 'fechar' | 'voltar') => {
    const ativo = typeof document !== 'undefined' ? document.activeElement : null
    focoAntesDaPergunta.current =
      ativo instanceof HTMLElement && conteudoDoEditor.current?.contains(ativo) ? ativo : null
    descartou.current = false
    setDescartarPara(destino)
  }
  const devolverFocoAoEditor = (evento: Event) => {
    if (descartou.current) return
    const caixa = conteudoDoEditor.current
    if (!caixa) return
    evento.preventDefault()
    const origem = focoAntesDaPergunta.current
    const alvo =
      origem && origem.isConnected && caixa.contains(origem)
        ? origem
        : caixa.querySelector<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])',
          )
    alvo?.focus()
  }

  // O rascunho nasce do nó a cada abertura (ou troca de nó). Manter o de uma edição cancelada faria
  // "Salvar" gravar num item o que a dona digitou e desistiu em outro.
  const idDoNo = node?.id ?? null
  useEffect(() => {
    if (!open || !node) return
    const proprio = typeof node.label === 'string' && node.label.trim() !== ''
    setUsarNome(node.target.kind === 'category' ? !proprio : false)
    setNome(proprio ? (node.label as string) : '')
    setIcone(ehRaizNo(node) ? node.icon : null)
    setVista('item')
    setDispositivo('desktop')
    setRecusa(null)
    setDescartarPara(null)
    rascunhoDosBanners.current = { sujo: false, artesNaoGravadas: [] }
    // O nó muda de identidade a cada gravação; reabrir o rascunho a cada uma apagaria o que está
    // sendo digitado. A chave é o id e a abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idDoNo])

  if (!node) return null

  const bannersSujos = () => vista === 'banners' && rascunhoDosBanners.current.sujo

  /** Fechar o editor (Esc, X, fora): com banner não salvo, pergunta antes. */
  const aoMudarAbertura = (aberto: boolean) => {
    if (!aberto && bannersSujos()) {
      perguntar('fechar')
      return
    }
    onOpenChange(aberto)
  }

  const voltarAoItem = () => {
    if (bannersSujos()) {
      perguntar('voltar')
      return
    }
    setVista('item')
  }

  const confirmarDescarte = () => {
    const destino = descartarPara
    const orfas = rascunhoDosBanners.current.artesNaoGravadas
    rascunhoDosBanners.current = { sujo: false, artesNaoGravadas: [] }
    descartou.current = true
    setDescartarPara(null)
    for (const url of orfas) void deleteBannerImage(url)
    if (destino === 'fechar') onOpenChange(false)
    else setVista('item')
  }

  const nomeAtual = menuNodeName(node, categories)
  const raiz = ehRaiz && ehRaizNo(node) ? node : null

  const salvar = async () => {
    let label: string | null
    if (deCategoria && usarNome) {
      label = null
    } else {
      const motivo =
        !deCategoria && nome.trim() === ''
          ? 'Digite o nome do item no menu.'
          : menuNodeLabelRefusal(nome)
      if (motivo) {
        setRecusa(motivo)
        return
      }
      label = nome.trim()
    }
    const edicao: MenuItemEdit = raiz ? { label, icon: icone } : { label }
    setOcupado(true)
    const falha = await onSave(edicao)
    setOcupado(false)
    if (falha) {
      setRecusa(falha)
      return
    }
    onOpenChange(false)
  }

  const bannersNoComputador = raiz ? bannersGravados(raiz.banners, 'desktop').length : 0
  const bannersNoCelular = raiz ? bannersGravados(raiz.banners, 'mobile').length : 0

  return (
    <Dialog open={open} onOpenChange={aoMudarAbertura}>
      <DialogContent
        ref={conteudoDoEditor}
        data-testid="editor-do-item"
        onCloseAutoFocus={onCloseAutoFocus}
        className="flex max-h-[90vh] flex-col gap-4 overflow-y-auto max-sm:bottom-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:p-4 sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>Editar “{nomeAtual || 'item'}”</DialogTitle>
          <DialogDescription>
            {ehRaiz ? 'Item do menu principal.' : 'Item de submenu.'} A mudança é salva ao tocar em
            Salvar.
          </DialogDescription>
        </DialogHeader>

        {vista === 'banners' && raiz ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                className={cn(QUEBRA, BOTAO_FANTASMA)}
                data-testid="voltar-ao-item"
                onClick={voltarAoItem}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Voltar
              </Button>
              <div
                role="group"
                aria-label="Dispositivo dos banners"
                className="flex min-w-0 max-w-full flex-wrap gap-0.5 rounded-xl bg-muted p-0.5"
              >
                {(
                  [
                    ['desktop', 'Computador', Monitor],
                    ['mobile', 'Celular', Smartphone],
                  ] as const
                ).map(([valor, rotulo, Icone]) => (
                  <button
                    key={valor}
                    type="button"
                    data-testid={`banners-${valor}`}
                    aria-pressed={dispositivo === valor}
                    onClick={() => setDispositivo(valor)}
                    className={cn(
                      'flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-[10px] px-3.5 text-xs font-semibold',
                      dispositivo === valor
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Icone className="h-3.5 w-3.5" aria-hidden />
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
            <MenuBannerEditor
              surface={dispositivo}
              item={{ id: raiz.id, name: nomeAtual, banners: raiz.banners }}
              categories={categories}
              onSave={onSaveBanners}
              onDraftChange={estado => {
                rascunhoDosBanners.current = estado
              }}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {deCategoria && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
                <div className="min-w-0">
                  <Label htmlFor="menu-usar-nome" className="text-sm font-semibold">
                    Usar o nome da categoria
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {nomeDaCategoria
                      ? `Hoje: “${nomeDaCategoria}”. Acompanha se a categoria for renomeada.`
                      : 'Acompanha se a categoria for renomeada.'}
                  </p>
                </div>
                <Switch
                  id="menu-usar-nome"
                  data-testid="usar-nome-da-categoria"
                  checked={usarNome}
                  onCheckedChange={valor => {
                    setRecusa(null)
                    setUsarNome(valor)
                    if (!valor && nome.trim() === '') setNome(nomeDaCategoria)
                  }}
                  className={SWITCH_TAP_44}
                />
              </div>
            )}

            {!(deCategoria && usarNome) && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="menu-nome-do-item">Nome no menu</Label>
                  <CharCounter value={nome} limit={MENU_LABEL_MAX} data-testid="contador-nome-item" />
                </div>
                <Input
                  id="menu-nome-do-item"
                  data-testid="nome-do-item"
                  value={nome}
                  onChange={e => {
                    setRecusa(null)
                    setNome(e.target.value)
                  }}
                  className="h-11"
                />
              </div>
            )}

            {raiz && (
              <MenuIconPicker
                itemName={nomeAtual}
                value={menuIconKey(icone)}
                onChange={valor => setIcone(valor)}
              />
            )}

            {raiz && (
              <div
                data-testid="caixa-banners"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Banners do painel</p>
                  <p data-testid="contagem-banners" className="text-xs text-muted-foreground">
                    {bannersNoComputador} no computador · {bannersNoCelular} no celular
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(QUEBRA, BOTAO_CONTORNO)}
                  data-testid="editar-banners"
                  onClick={() => setVista('banners')}
                >
                  Editar banners
                </Button>
              </div>
            )}
          </div>
        )}

        {recusa && (
          <p data-testid="editor-recusa" role="alert" className="text-sm font-medium text-destructive">
            {recusa}
          </p>
        )}

        {vista === 'item' && (
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              // `.btn.danger` do protótipo: no hover, fundo vermelho e texto branco — o `ghost` pintava
              // o fundo de `accent` (o rosa do painel) por baixo do texto vermelho.
              className={cn(QUEBRA, BOTAO_PERIGO)}
              data-testid="editor-remover"
              onClick={onRemove}
            >
              Remover do menu
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className={cn(QUEBRA, BOTAO_CONTORNO)}
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className={cn(QUEBRA, BOTAO_CTA)}
                data-testid="editor-salvar"
                disabled={ocupado}
                onClick={salvar}
              >
                Salvar
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>

      <AlertDialog
        open={descartarPara !== null}
        onOpenChange={aberto => {
          if (!aberto) setDescartarPara(null)
        }}
      >
        <AlertDialogContent data-testid="descartar-banners" onCloseAutoFocus={devolverFocoAoEditor}>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar as alterações do banner?</AlertDialogTitle>
            <AlertDialogDescription>
              O que você mudou nos banners e não salvou se perde, e a arte enviada e não salva é
              apagada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel data-testid="continuar-editando-banners" className={cn('min-h-11', BOTAO_CONTORNO)}>
              Continuar editando
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirmar-descartar-banners"
              className="min-h-11 bg-red-700 text-white hover:bg-red-800"
              onClick={confirmarDescarte}
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}

export default MenuItemEditor
