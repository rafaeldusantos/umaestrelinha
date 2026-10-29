// A tela onde a dona MONTA o menu da loja (feature 86, `AD-068` — reescrita da tela da feature 39).
//
// O que ela era: a árvore inteira de categorias, cada uma com uma chave por dispositivo, e o menu
// DEDUZIDO dessas chaves — ligar uma subcategoria podia fazê-la subir para a barra, e arrastar
// reordenava a `sort_order` da árvore, que também ordena a Home e o rodapé.
//
// O que ela é: o documento da dona (`store_settings.menu`, `{ version: 2, items }`), mostrado como a
// cliente o vê — só os itens que estão no menu, na ordem, com o submenu de cada um (`MNM-01..03`).
// Quatro consequências, e nenhuma é cosmética:
//
// 1. **Uma lista, chave por item** (`MNM-28`). O alternador Computador/Celular troca **só a prévia**
//    (`MNM-32`); a lista é uma só, e cada nó diz onde aparece.
// 2. **Nenhuma escrita em `categories`** (`MNM-18`). Reordenar, renomear, trocar ícone e banners
//    mudam o documento; a categoria é só referenciada. Quem grava é `useStoreMenu`, uma linha por vez,
//    com conflito por `updated_at` (`MNM-37`) e volta ao gravado na falha (`MNM-38`).
// 3. **Sem teto no menu principal** — a barra rola. O único teto é o de 24 no submenu, cobrado por
//    `menuDocumentRefusal` antes da rede.
// 4. **O painel não desenha o menu.** A prévia é a loja num iframe (`previaUnica.test.ts`), e a
//    contagem do cabeçalho do card é a que `menuItems` — a mesma porta da loja — devolve.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  Menu as MenuIcon,
  Monitor,
  RefreshCw,
  Smartphone,
} from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  MENU_SUBMENU_LIMIT,
  menuHrefKey,
  menuItems,
  menuNodeName,
  type MenuCategory,
  type MenuDocument,
  type MenuNode,
  type MenuRootNode,
  type MenuSurface,
} from '@estrelinha/core/menu'
import {
  MenuItemEditor,
  MenuLivePreview,
  MenuRemoveConfirm,
  MenuTargetPicker,
  MenuTree,
  addChildNode,
  addRootNode,
  fraseDasSubcategoriasDeFora,
  moveNode,
  removeNode,
  toggleSurface,
  updateNode,
  useStoreMenu,
  type MenuItemEdit,
  type MenuPickerMode,
  type NovoNo,
} from '@/features/store-menu'
import { PageHeader, TableSkeleton } from '@/shared/ui'
import { storeOrigin } from '@/shared/lib/storeOrigin'

/**
 * Falha de leitura é superfície EXPLÍCITA, não lista vazia (`MNM-05`): mostrar o vazio com o banco
 * fora do ar faria a dona montar um menu por cima de um que existe.
 */
const FaixaDeErro = ({
  testId,
  titulo,
  detalhe,
  acao,
  onRetry,
}: {
  testId: string
  titulo: string
  detalhe: string
  acao: string
  onRetry: () => void
}) => (
  <div
    data-testid={testId}
    className="mb-6 flex flex-wrap items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4"
  >
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-destructive">{titulo}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detalhe}</p>
    </div>
    <Button variant="outline" className="min-h-11" onClick={onRetry}>
      <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {acao}
    </Button>
  </div>
)

interface Achado {
  node: MenuNode | MenuRootNode
  ehRaiz: boolean
  pai: MenuRootNode | null
}

const acharNo = (doc: MenuDocument | null, id: string | null): Achado | null => {
  if (!doc || !id) return null
  for (const item of doc.items) {
    if (item.id === id) return { node: item, ehRaiz: true, pai: null }
    const filho = item.children.find(c => c.id === id)
    if (filho) return { node: filho, ehRaiz: false, pai: item }
  }
  return null
}

const TITULO_DA_FALHA = {
  recusa: 'Não foi possível salvar',
  conflito: 'O menu mudou em outra janela',
  falha: 'Não salvou',
  // R02 (QA r2): a tela não sabe se gravou — o título não afirma nem uma coisa nem outra.
  incerto: 'Não deu para confirmar',
} as const

/**
 * O aviso do item novo. Com mais filhas ativas que o teto, entram as 24 primeiras (`addRootNode`) e o
 * aviso diz quantas ficaram de fora (`MNM-09` × `MNM-24`, revisto em 2026-10-28).
 */
const frasesDoNovo = (nome: string, filhasAtivas: number): string => {
  const filhos = Math.min(filhasAtivas, MENU_SUBMENU_LIMIT)
  const base =
    filhos === 0
      ? `“${nome}” entrou no fim do menu.`
      : `“${nome}” entrou no fim do menu com ${filhos} ${filhos === 1 ? 'item' : 'itens'} no submenu.`
  const deFora = fraseDasSubcategoriasDeFora(filhasAtivas - filhos, MENU_SUBMENU_LIMIT)
  return deFora ? `${base} ${deFora}` : base
}

const AdminMenuPage = () => {
  const lojaOrigem = useMemo(() => storeOrigin(), [])
  const { document, categories, state, error, saving, conflict, apply, reload } = useStoreMenu()

  // O dispositivo da PRÉVIA, e só dela (`MNM-32`): a lista é uma só.
  const [surface, setSurface] = useState<MenuSurface>('desktop')
  // A vista do celular. Abre nos itens: a prévia é para conferir o que já se decidiu.
  const [vista, setVista] = useState<'entradas' | 'previa'>('entradas')
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [seletor, setSeletor] = useState<{ modo: MenuPickerMode; parentId: string | null } | null>(null)
  const [emEdicao, setEmEdicao] = useState<string | null>(null)
  const [aRemover, setARemover] = useState<string | null>(null)

  const pool = categories as MenuCategory[]

  /**
   * Q07 do QA da `86` — para onde o foco vai quando um diálogo fecha, ou quando um item sai.
   *
   * Os diálogos abrem por estado (não por `DialogTrigger`), e o Radix devolvia o foco ao `<body>`: o
   * leitor de tela voltava ao início da página. O alvo é guardado pelo `data-testid` do controle — o
   * nó pode ainda nem existir (o "Adicionar item ao menu" do vazio só nasce depois de o último item
   * sair) —, e cada render tenta de novo até ele receber o foco. Expira em 2 s, para um alvo que não
   * apareceu não roubar o foco depois.
   */
  const focoPendente = useRef<{ alvo: string; ate: number } | null>(null)
  const tentarFoco = () => {
    const pendente = focoPendente.current
    if (!pendente) return false
    if (Date.now() > pendente.ate) {
      focoPendente.current = null
      return false
    }
    const el = window.document.querySelector<HTMLElement>(`[data-testid="${pendente.alvo}"]`)
    if (!el) return false
    el.focus()
    if (window.document.activeElement === el) focoPendente.current = null
    return true
  }
  const focarDepois = (alvo: string) => {
    focoPendente.current = { alvo, ate: Date.now() + 2000 }
    tentarFoco()
  }
  useEffect(() => {
    tentarFoco()
  })
  /** O `onCloseAutoFocus` dos diálogos: com alvo pendente, o foco é nosso (não o do Radix). */
  const devolverFoco = (evento: Event) => {
    if (!focoPendente.current) return
    evento.preventDefault()
    tentarFoco()
  }
  /** Quem abriu cada diálogo — o alvo do foco quando ele fechar sem mudar a lista. */
  const voltarDoSeletor = useRef<string>('adicionar-item')
  const voltarDoEditor = useRef<string | null>(null)
  const removeuAgora = useRef(false)

  /**
   * Q04 — um "Mover" por vez. A trava é um `ref`, e não só o `disabled` da tela: o segundo toque de
   * um toque duplo pode chegar antes de o React desenhar o botão desabilitado. Ela sai quando a
   * gravação termina (gravou, recusou ou falhou).
   */
  const movendo = useRef(false)
  const mover = (parentId: string | null, de: number, para: number) => {
    if (movendo.current || saving === 'saving') return
    movendo.current = true
    aplicar(doc => moveNode(doc, parentId, de, para)).finally(() => {
      movendo.current = false
    })
  }

  // **A mesma porta da loja**: o que o card diz que está no computador e no celular é o que a barra e
  // a folha desenham — inativa e apagada não contam.
  const contagem = useMemo<Record<MenuSurface, number>>(
    () =>
      document
        ? {
            desktop: menuItems({ categories: pool, document }, 'desktop').length,
            mobile: menuItems({ categories: pool, document }, 'mobile').length,
          }
        : { desktop: 0, mobile: 0 },
    [document, pool],
  )

  /** Aplica uma op do documento. Devolve o motivo da recusa/falha; com `avisar`, diz num toast. */
  const aplicar = async (
    op: (doc: MenuDocument) => MenuDocument,
    { avisar = true }: { avisar?: boolean } = {},
  ): Promise<string | null> => {
    const falha = await apply(op)
    if (!falha) return null
    if (avisar) {
      toast({
        title: TITULO_DA_FALHA[falha.kind],
        description: falha.message,
        // Incerteza não é erro: o banco pode ter gravado (R02 do QA r2).
        ...(falha.kind === 'incerto' ? {} : { variant: 'destructive' as const }),
      })
    }
    return falha.message
  }

  // O que já está onde se vai acrescentar: as categorias (`MNM-10`/`MNM-25`) e, desde o Q03 do QA,
  // as páginas — na grafia de `menuHrefKey`, a mesma régua de `menuDocumentRefusal`.
  const { usadas, hrefsUsados } = useMemo(() => {
    const ids = new Set<string>()
    const hrefs = new Set<string>()
    if (!document || !seletor) return { usadas: ids, hrefsUsados: hrefs }
    const lista =
      seletor.modo === 'raiz'
        ? document.items
        : (document.items.find(i => i.id === seletor.parentId)?.children ?? [])
    for (const no of lista) {
      if (no.target.kind === 'category') ids.add(no.target.category_id)
      else hrefs.add(menuHrefKey(no.target.href))
    }
    return { usadas: ids, hrefsUsados: hrefs }
  }, [document, seletor])

  const abrirSeletor = (modo: MenuPickerMode, parentId: string | null) => {
    focoPendente.current = null
    voltarDoSeletor.current =
      modo === 'submenu' && parentId
        ? `adicionar-ao-submenu-${parentId}`
        : document && document.items.length === 0
          ? 'adicionar-primeiro'
          : 'adicionar-item'
    setSeletor({ modo, parentId })
  }

  const fecharSeletor = () => {
    focarDepois(voltarDoSeletor.current)
    setSeletor(null)
  }

  const abrirEditor = (id: string) => {
    focoPendente.current = null
    const achado = acharNo(document, id)
    voltarDoEditor.current = achado?.ehRaiz ? `acoes-${id}` : `editar-${id}`
    setEmEdicao(id)
  }

  const aoEscolher = async (novo: NovoNo) => {
    const alvo = seletor
    fecharSeletor()
    if (!alvo) return

    // O id do item novo é conhecido ANTES de gravar: é o que deixa a prévia abrir o painel dele.
    const idNovo = crypto.randomUUID()
    let primeiro = true
    const gerarId = () => {
      if (primeiro) {
        primeiro = false
        return idNovo
      }
      return crypto.randomUUID()
    }

    const nome =
      novo.target.kind === 'category'
        ? menuNodeName({ target: novo.target, label: null }, pool)
        : (novo.label ?? '')

    if (alvo.modo === 'raiz') {
      const categoriaId = novo.target.kind === 'category' ? novo.target.category_id : null
      const filhas = categoriaId ? pool.filter(c => c.active && c.parent_id === categoriaId).length : 0
      const falha = await aplicar(doc => addRootNode(doc, novo, pool, gerarId))
      if (falha) return
      setSelecionado(idNovo)
      toast({ title: 'Item adicionado', description: frasesDoNovo(nome, filhas) })
      return
    }
    if (!alvo.parentId) return
    const falha = await aplicar(doc => addChildNode(doc, alvo.parentId as string, novo, gerarId))
    if (!falha) setSelecionado(alvo.parentId)
  }

  const editado = acharNo(document, emEdicao)
  const removido = acharNo(document, aRemover)

  const salvarEdicao = (edicao: MenuItemEdit) =>
    emEdicao ? aplicar(doc => updateNode(doc, emEdicao, edicao), { avisar: false }) : Promise.resolve(null)

  /** Q07 — o foco depois de tirar um filho: o "Tirar" do seguinte, do anterior, ou "Adicionar ao submenu". */
  const removerFilho = (id: string) => {
    const achado = acharNo(document, id)
    if (achado?.pai) {
      const irmaos = achado.pai.children
      const k = irmaos.findIndex(c => c.id === id)
      const vizinho = irmaos[k + 1] ?? irmaos[k - 1]
      focarDepois(vizinho ? `tirar-${vizinho.id}` : `adicionar-ao-submenu-${achado.pai.id}`)
    }
    return aplicar(doc => removeNode(doc, id))
  }

  const pedirRemocao = (id: string) => {
    const achado = acharNo(document, id)
    if (!achado) return
    if (achado.ehRaiz) {
      focoPendente.current = null
      setARemover(id)
    } else removerFilho(id)
  }

  /** Q07 — o foco depois de remover um item principal: o ⋯ do seguinte, do anterior, ou o vazio. */
  const focoDepoisDeRemover = (id: string): string => {
    const itens = document?.items ?? []
    const k = itens.findIndex(i => i.id === id)
    const vizinho = itens[k + 1] ?? itens[k - 1]
    return vizinho ? `acoes-${vizinho.id}` : 'adicionar-primeiro'
  }

  const nomeDoNo = (no: MenuNode | null) => (no ? menuNodeName(no, pool) || 'Categoria apagada' : '')

  return (
    /*
      O molde de altura de `/admin/home` (`FOCO-13`): altura cheia na raiz, a grade toma o que sobra,
      e a coluna da esquerda rola dentro de si enquanto o palco fica parado. `AdminMenuPage.test.tsx`
      lê as duas páginas do disco e as compara.
    */
    <div className="lg:flex lg:h-[calc(100vh-3rem)] lg:flex-col">
      <PageHeader
        className="shrink-0"
        title="Menu da loja"
        subtitle="Monte o menu como a cliente vê: os itens da barra, na ordem, e o que abre dentro de cada um. Cada mudança é salva na hora."
        icon={MenuIcon}
        actions={
          <>
            {/* Os DOIS selos no mesmo lugar do cabeçalho, nunca os dois juntos (`VIV-04`), e o nó sai
                do DOM quando não há o que dizer (`FOCO-34`). `Salvo` só depois da confirmação do
                banco (`MNM-38`): é recibo, não otimismo. */}
            {saving === 'saving' ? (
              <span
                data-testid="salvando"
                role="status"
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-opacity motion-reduce:transition-none"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Salvando…
              </span>
            ) : (
              saving === 'saved' && (
                <span
                  data-testid="salvo"
                  role="status"
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-opacity motion-reduce:transition-none"
                >
                  Salvo
                </span>
              )
            )}
            {/* A origem da LOJA (`storeOrigin`), nunca `href="/"`: no painel `/` é a raiz do próprio
                painel, e o botão abria o backoffice em outra aba (achado na prova da 86). Sem
                `VITE_STORE_URL` o botão não existe. */}
            {lojaOrigem && (
              <Button variant="outline" asChild className="min-h-11">
                <a href={`${lojaOrigem}/`} target="_blank" rel="noreferrer">
                  Ver na loja <ExternalLink className="ml-1.5 h-4 w-4" />
                </a>
              </Button>
            )}
          </>
        }
      />

      {state === 'error' && (
        <FaixaDeErro
          testId="menu-erro"
          titulo="Não foi possível carregar o menu"
          // Q08: só a frase da loja. O hook já não devolve o erro cru (sem rede ele chegava como
          // "TypeError: Failed to fetch"); o título diz o quê, o detalhe diz o que fazer.
          detalhe={error ? 'Confira a internet e tente de novo.' : 'Tente de novo em instantes.'}
          acao="Tentar de novo"
          onRetry={() => reload()}
        />
      )}

      {conflict && state === 'ready' && (
        <FaixaDeErro
          testId="menu-conflito"
          titulo="O menu mudou em outra janela"
          detalhe="Recarregue para ver o que está gravado antes de continuar. Nada desta janela sobrescreveu a outra."
          acao="Recarregar"
          onRetry={() => reload()}
        />
      )}

      {state === 'loading' && <TableSkeleton />}

      {state === 'ready' && document && (
        <>
          {/* Abaixo de `lg` a tela alterna entre os itens e a prévia (`FOCO-35`). A barra sublinhada
              é "o que estou vendo"; a pílula do dispositivo, ao lado da prévia, é outra pergunta
              (`FOCO-37`). */}
          <div
            data-testid="abas-vista"
            role="tablist"
            aria-label="O que mostrar"
            className="mb-4 flex gap-4 border-b border-border lg:hidden"
          >
            {(
              [
                ['entradas', 'Itens do menu'],
                ['previa', 'Prévia'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                data-testid={`vista-${valor}`}
                aria-selected={vista === valor}
                onClick={() => setVista(valor)}
                className={cn(
                  'min-h-11 border-b-2 px-1 text-sm font-semibold transition-colors motion-reduce:transition-none',
                  vista === valor
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[560px_minmax(0,1fr)]">
            <div
              data-testid="coluna-entradas"
              className={cn(
                'flex min-h-0 min-w-0 flex-col gap-6 lg:overflow-y-auto',
                vista !== 'entradas' && 'hidden lg:flex',
              )}
            >
              <MenuTree
                document={document}
                categories={pool}
                contagem={contagem}
                onAdd={() => abrirSeletor('raiz', null)}
                onAddChild={parentId => abrirSeletor('submenu', parentId)}
                onToggle={(id, onde, ligado) => aplicar(doc => toggleSurface(doc, id, onde, ligado))}
                onMove={mover}
                moverDesabilitado={saving === 'saving'}
                onEdit={abrirEditor}
                onRemoveRoot={pedirRemocao}
                onRemoveChild={id => removerFilho(id)}
                onSelect={setSelecionado}
              />
            </div>

            <div
              data-testid="coluna-previa-menu"
              className={cn('flex min-h-0 min-w-0 flex-col gap-3', vista !== 'previa' && 'hidden lg:flex')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">Conferir em</p>
                <div
                  role="group"
                  aria-label="Dispositivo da prévia"
                  className="flex gap-0.5 rounded-xl bg-muted p-0.5"
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
                      data-testid={`superficie-${valor}`}
                      aria-pressed={surface === valor}
                      onClick={() => setSurface(valor)}
                      className={cn(
                        'flex min-h-11 items-center gap-1.5 rounded-[10px] px-3.5 text-xs font-semibold',
                        surface === valor
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
              {/* A prévia é a LOJA, num iframe — não um desenho deste painel (`previaUnica`). Ela
                  recebe o documento que a tela mostra (o otimista, durante a gravação) e o id do nó
                  selecionado. */}
              <MenuLivePreview
                surface={surface}
                categories={pool}
                document={document}
                openId={selecionado}
              />
            </div>
          </div>
        </>
      )}

      <MenuTargetPicker
        open={seletor !== null}
        onOpenChange={aberto => {
          if (!aberto) fecharSeletor()
        }}
        onCloseAutoFocus={devolverFoco}
        modo={seletor?.modo ?? 'raiz'}
        titulo={
          seletor?.modo === 'submenu'
            ? `Adicionar ao submenu de “${nomeDoNo(acharNo(document, seletor.parentId)?.node ?? null)}”`
            : 'Adicionar item ao menu'
        }
        categories={pool}
        usadas={usadas}
        hrefsUsados={hrefsUsados}
        onPick={aoEscolher}
      />

      <MenuItemEditor
        open={editado !== null}
        onOpenChange={aberto => {
          if (!aberto) {
            if (voltarDoEditor.current) focarDepois(voltarDoEditor.current)
            setEmEdicao(null)
          }
        }}
        onCloseAutoFocus={devolverFoco}
        node={editado?.node ?? null}
        ehRaiz={editado?.ehRaiz ?? false}
        categories={pool}
        onSave={salvarEdicao}
        onSaveBanners={banners =>
          emEdicao
            ? aplicar(doc => updateNode(doc, emEdicao, { banners }), { avisar: false })
            : Promise.resolve(null)
        }
        onRemove={() => {
          const id = emEdicao
          setEmEdicao(null)
          if (id) pedirRemocao(id)
        }}
      />

      <MenuRemoveConfirm
        open={removido !== null && removido.ehRaiz}
        onOpenChange={aberto => {
          if (!aberto) {
            // Esc ou Cancelar: o foco volta ao ⋯ do item. Depois de "Remover do menu" o alvo já é o
            // vizinho (o Radix fecha DEPOIS do `onConfirm`, com o `aRemover` ainda no fechamento).
            if (aRemover && !removeuAgora.current) focarDepois(`acoes-${aRemover}`)
            removeuAgora.current = false
            setARemover(null)
          }
        }}
        onCloseAutoFocus={devolverFoco}
        nome={nomeDoNo(removido?.node ?? null)}
        kind={removido?.node.target.kind ?? 'category'}
        filhos={removido && removido.ehRaiz ? (removido.node as MenuRootNode).children.length : 0}
        onConfirm={() => {
          const id = aRemover
          removeuAgora.current = true
          if (id) focarDepois(focoDepoisDeRemover(id))
          setARemover(null)
          if (id) aplicar(doc => removeNode(doc, id))
        }}
      />
    </div>
  )
}

export default AdminMenuPage
