// Feature 86, T14 — o seletor do que entra no menu (`MNM-07`, `MNM-10`..`MNM-12`, `MNM-22`, `MNM-25`).
//
// Substitui o `MenuLinkDialog` da `39`, que só cadastrava link: a categoria entrava no menu por uma
// chave na árvore inteira. Aqui as duas coisas se escolhem no mesmo lugar, e a árvore aparece só
// DENTRO do seletor — nunca na tela do menu (`MNM-03`).
//
// - **Categoria**: busca sem acento e sem caixa pelo dono da dobra (`dobrarTexto`, `AD-036`),
//   casando o nome **e o caminho** — "aneis" acha "Joias › Anéis". A que já está no menu (ou neste
//   submenu) aparece desabilitada com o motivo, e não some: sumir faria a dona procurar por algo que
//   está ali.
// - **Página da loja**: a lista de `PAGINAS_DA_LOJA` (derivada do sitemap) ou outro endereço
//   digitado, conferido por `conferirEnderecoDaLoja` (Q03 do QA: só o que existe — rota fixa,
//   categoria ativa ou peça à venda, uma leitura pelo slug) **antes** de entregar.
//   Externo não entra (`MNM-12`); o já gravado continua lido (`MNM-31`), mas não se cria outro.
//
// O seletor não grava nada: entrega um `NovoNo` a quem o abriu.

import { useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
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
  MENU_SUBMENU_LIMIT,
  MENU_LABEL_MAX,
  menuHrefKey,
  menuNodeLabelRefusal,
  pathLabel,
  type MenuCategory,
} from '@estrelinha/core/menu'
import { activeProductExists } from '@/entities/product'
import { CharCounter } from '@/shared/ui'
import { dobrarTexto } from '@/shared/lib/texto'
import type { NovoNo } from '../model/documentOps'
import { PAGINAS_DA_LOJA } from '../model/paginasDaLoja'
import {
  MOTIVO_PECA_NAO_CONFERIDA,
  MOTIVO_SEM_PECA,
  conferirEnderecoDaLoja,
} from '../model/enderecoDaLoja'
import { MOTIVO_USADA, fraseDasFilhasQueEntram, type MenuPickerMode } from '../model/textosDoMenu'
import { BOTAO_CONTORNO, BOTAO_CTA } from './estilos'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `raiz` = menu principal; `submenu` = dentro de um item (muda o motivo e a dica das filhas). */
  modo: MenuPickerMode
  /** O título do diálogo — "Adicionar item ao menu" ou "Adicionar ao submenu de “Joias”". */
  titulo: string
  categories: readonly MenuCategory[]
  /** As categorias que já estão onde se vai acrescentar (o menu principal, ou este submenu). */
  usadas: ReadonlySet<string>
  /**
   * Q03 — as páginas que já estão onde se vai acrescentar, na grafia de `menuHrefKey`. A da lista
   * aparece desabilitada com o motivo (como a categoria); a digitada é recusada como repetida.
   */
  hrefsUsados?: ReadonlySet<string>
  onPick: (novo: NovoNo) => void
  /** Q07 — quem abriu decide para onde o foco volta ao fechar (o Radix devolvia ao `<body>`). */
  onCloseAutoFocus?: (evento: Event) => void
}

const OUTRO = '__outro__'

/** As abas do seletor são a pílula segmentada do protótipo (`.tabs`), não a barra sublinhada. */
const ABA =
  'min-h-11 flex-1 rounded-[9px] px-3 text-sm transition-colors motion-reduce:transition-none'

/** A linha escolhível (`.pick button`): hover com borda violeta, escolhida com anel violeta claro. */
const OPCAO_ESCOLHIDA = 'border-estrelinha-admin-violet bg-estrelinha-admin-card ring-2 ring-estrelinha-admin-violet/15'
const OPCAO_LIVRE =
  'border-estrelinha-admin-border bg-estrelinha-admin-card hover:border-estrelinha-admin-violet hover:bg-estrelinha-admin-bg'

const NENHUM: ReadonlySet<string> = new Set()

const BOTAO_DO_RODAPE = 'h-auto min-h-11 flex-1 whitespace-normal max-sm:px-2 sm:flex-none'

const MenuTargetPicker = ({
  open,
  onOpenChange,
  modo,
  titulo,
  categories,
  usadas,
  hrefsUsados = NENHUM,
  onPick,
  onCloseAutoFocus,
}: Props) => {
  const [aba, setAba] = useState<'categoria' | 'pagina'>('categoria')
  const buscaRef = useRef<HTMLInputElement | null>(null)
  const [busca, setBusca] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)
  const [pagina, setPagina] = useState<string | null>(null)
  const [outro, setOutro] = useState('')
  const [nome, setNome] = useState('')
  const [recusa, setRecusa] = useState<string | null>(null)
  /** A conferência da peça no banco está no ar: o "Adicionar" espera (sem toque duplo). */
  const [conferindo, setConferindo] = useState(false)

  // Abrir de novo começa do zero: o que ficou de uma escolha anterior seria acrescentado sem a dona
  // ter escolhido de novo.
  //
  // S02 do QA r3: o zero é aplicado DURANTE o render em que `open` vira verdadeiro (o padrão do React
  // para "estado que depende de uma prop"), e não num efeito. Com o efeito, o primeiro quadro aberto
  // ainda tinha a aba "Página da loja" de quando o seletor fechou: a busca não existia, o
  // `onOpenAutoFocus` não a achava, e o Radix punha o foco na aba "Categoria".
  const [abertoAntes, setAbertoAntes] = useState(open)
  if (open !== abertoAntes) {
    setAbertoAntes(open)
    if (open) {
      setAba('categoria')
      setBusca('')
      setCategoria(null)
      setPagina(null)
      setOutro('')
      setNome('')
      setRecusa(null)
      setConferindo(false)
    }
  }

  const linhas = useMemo(() => {
    const todas = (categories ?? []).filter(Boolean)
    return todas
      .map(c => {
        const caminho = pathLabel(todas, c.id)
        const filhasAtivas = todas.filter(f => f.parent_id === c.id && f.active).length
        return { categoria: c, caminho, filhasAtivas }
      })
      .sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt-BR'))
  }, [categories])

  const termo = dobrarTexto(busca.trim())
  const oferecidas = termo === ''
    ? linhas
    : linhas.filter(l => dobrarTexto(l.caminho).includes(termo) || dobrarTexto(l.categoria.name).includes(termo))

  const escolherPagina = (path: string) => {
    setRecusa(null)
    setPagina(path)
    const conhecida = PAGINAS_DA_LOJA.find(p => p.path === path)
    if (conhecida) setNome(conhecida.nomeSugerido)
  }

  const podeAdicionar = (aba === 'categoria' ? categoria !== null : pagina !== null) && !conferindo

  const adicionar = async () => {
    if (conferindo) return
    if (aba === 'categoria') {
      if (!categoria || usadas.has(categoria)) return
      onPick({ target: { kind: 'category', category_id: categoria } })
      return
    }
    if (!pagina) return

    // Q03: o endereço DIGITADO passa por `conferirEnderecoDaLoja` — existe, e na grafia da loja. Os
    // da lista já são páginas da loja (vêm do sitemap).
    const conferido =
      pagina === OUTRO ? conferirEnderecoDaLoja(outro, categories ?? []) : ({ kind: 'ok', href: pagina } as const)
    if (conferido.kind === 'recusa') {
      setRecusa(conferido.motivo)
      return
    }
    const href = conferido.href
    if (hrefsUsados.has(menuHrefKey(href))) {
      setRecusa(`${MOTIVO_USADA[modo]}.`)
      return
    }
    const motivoDoNome =
      nome.trim() === '' ? 'Digite o nome do item no menu.' : menuNodeLabelRefusal(nome)
    if (motivoDoNome) {
      setRecusa(motivoDoNome)
      return
    }
    if (conferido.kind === 'peca') {
      setConferindo(true)
      const existe = await activeProductExists(conferido.slug)
      setConferindo(false)
      if (existe === null) {
        setRecusa(MOTIVO_PECA_NAO_CONFERIDA)
        return
      }
      if (!existe) {
        setRecusa(MOTIVO_SEM_PECA(href))
        return
      }
    }
    onPick({ target: { kind: 'link', href }, label: nome.trim() })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="seletor-do-menu"
        onCloseAutoFocus={onCloseAutoFocus}
        // R04 do QA r2: abre com o foco na busca (o Radix punha na primeira aba, e quem chega por
        // teclado tinha de andar até ela). Sem a busca à mão, o padrão do Radix vale.
        onOpenAutoFocus={evento => {
          const campo = buscaRef.current
          if (!campo) return
          evento.preventDefault()
          campo.focus()
        }}
        // Em 390 é folha de baixo: o diálogo centrado deixava a lista com metade da altura útil e o
        // botão "Adicionar" atrás do teclado. A partir de `sm` volta a ser o diálogo do painel.
        // Q06b do QA: no celular a folha tem a altura da tela (menos 8 px, em px de propósito — `rem`
        // cresceria com a fonte) e respiro compacto; a 200 % de fonte, com 90 % da altura e `p-6`, a
        // lista ficava com ~40 px entre cabeçalho e rodapé.
        className="flex max-h-[90vh] flex-col gap-4 overflow-hidden max-sm:bottom-0 max-sm:top-auto max-sm:h-[calc(100dvh-8px)] max-sm:max-h-[calc(100dvh-8px)] max-sm:max-w-none max-sm:translate-y-0 max-sm:gap-2 max-sm:rounded-b-none max-sm:rounded-t-2xl max-sm:p-3"
      >
        <DialogHeader>
          {/* `pr-8`: o título longo não corre por baixo do X (que é `absolute`). */}
          <DialogTitle className="break-words pr-8 max-sm:text-base">{titulo}</DialogTitle>
          {/* No celular a frase vira só do leitor de tela: o título e as abas já dizem o que fazer,
              e a 200 % ela ocupava três linhas da altura da lista. */}
          <DialogDescription className="max-sm:sr-only">
            Escolha uma categoria ou uma página da loja. O item entra no fim da lista.
          </DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="O que adicionar" className="flex gap-1 rounded-xl bg-estrelinha-admin-elevated p-1">
          {(
            [
              ['categoria', 'Categoria'],
              ['pagina', 'Página da loja'],
            ] as const
          ).map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              data-testid={`aba-${valor}`}
              aria-selected={aba === valor}
              onClick={() => {
                setAba(valor)
                setRecusa(null)
              }}
              className={cn(
                ABA,
                aba === valor
                  ? 'bg-estrelinha-admin-card font-semibold text-estrelinha-admin-text shadow-sm'
                  : 'text-estrelinha-admin-text-secondary hover:text-estrelinha-admin-text',
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>

        <div data-testid="lista-do-seletor" className="min-h-0 flex-1 overflow-y-auto">
          {aba === 'categoria' ? (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  ref={buscaRef}
                  data-testid="busca-categoria"
                  aria-label="Buscar categoria ou subcategoria"
                  placeholder="Buscar categoria ou subcategoria"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
              {oferecidas.length === 0 ? (
                <p data-testid="categorias-sem-resultado" className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma categoria com “{busca.trim()}”.
                </p>
              ) : (
                <ul className="flex flex-col gap-1" aria-label="Categorias">
                  {oferecidas.map(({ categoria: c, caminho, filhasAtivas }) => {
                    const usada = usadas.has(c.id)
                    const escolhida = categoria === c.id
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          data-testid={`opcao-categoria-${c.id}`}
                          aria-pressed={escolhida}
                          disabled={usada}
                          onClick={() => setCategoria(c.id)}
                          className={cn(
                            'flex min-h-11 w-full min-w-0 flex-col items-start rounded-xl border px-3 py-2 text-left',
                            escolhida ? OPCAO_ESCOLHIDA : OPCAO_LIVRE,
                            usada && 'cursor-not-allowed opacity-60 hover:border-estrelinha-admin-border hover:bg-estrelinha-admin-card',
                          )}
                        >
                          <span className="flex w-full min-w-0 items-center gap-2">
                            <span className="min-w-0 break-words text-sm font-semibold text-foreground">{c.name}</span>
                            {!c.active && (
                              <span className="shrink-0 rounded-full bg-estrelinha-admin-amber/10 px-2 py-0.5 text-[11px] font-semibold text-estrelinha-admin-amber">
                                Inativa
                              </span>
                            )}
                          </span>
                          <span className="w-full min-w-0 break-words text-xs text-muted-foreground">{caminho}</span>
                          {usada ? (
                            <span data-testid={`motivo-${c.id}`} className="text-xs font-semibold text-muted-foreground">
                              {MOTIVO_USADA[modo]}
                            </span>
                          ) : (
                            modo === 'raiz' &&
                            filhasAtivas > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {fraseDasFilhasQueEntram(filhasAtivas, MENU_SUBMENU_LIMIT)}
                              </span>
                            )
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-1" aria-label="Páginas da loja">
                {PAGINAS_DA_LOJA.map(p => {
                  const usada = hrefsUsados.has(menuHrefKey(p.path))
                  return (
                    <li key={p.path}>
                      <button
                        type="button"
                        data-testid={`opcao-pagina-${p.path}`}
                        aria-pressed={pagina === p.path}
                        disabled={usada}
                        onClick={() => escolherPagina(p.path)}
                        className={cn(
                          'flex min-h-11 w-full min-w-0 flex-col items-start rounded-xl border px-3 py-2 text-left',
                          pagina === p.path ? OPCAO_ESCOLHIDA : OPCAO_LIVRE,
                          usada && 'cursor-not-allowed opacity-60 hover:border-estrelinha-admin-border hover:bg-estrelinha-admin-card',
                        )}
                      >
                        <span className="w-full min-w-0 break-words text-sm font-semibold text-foreground">{p.titulo}</span>
                        <span className="w-full min-w-0 break-words text-xs text-muted-foreground">{p.path}</span>
                        {usada && (
                          <span data-testid={`motivo-pagina-${p.path}`} className="text-xs font-semibold text-muted-foreground">
                            {MOTIVO_USADA[modo]}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
                <li>
                  <button
                    type="button"
                    data-testid="opcao-pagina-outro"
                    aria-pressed={pagina === OUTRO}
                    onClick={() => {
                      setRecusa(null)
                      setPagina(OUTRO)
                    }}
                    className={cn(
                      'flex min-h-11 w-full items-center rounded-xl border px-3 py-2 text-left text-sm font-semibold',
                      pagina === OUTRO ? OPCAO_ESCOLHIDA : OPCAO_LIVRE,
                    )}
                  >
                    Outro endereço da loja
                  </button>
                </li>
              </ul>

              {pagina === OUTRO && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="menu-outro-endereco">Endereço</Label>
                  <Input
                    id="menu-outro-endereco"
                    data-testid="outro-endereco"
                    placeholder="/sobre"
                    value={outro}
                    onChange={e => {
                      setRecusa(null)
                      setOutro(e.target.value)
                    }}
                    className="h-11"
                  />
                </div>
              )}

              {pagina !== null && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="menu-nome-do-link">Nome no menu</Label>
                    <CharCounter value={nome} limit={MENU_LABEL_MAX} data-testid="contador-nome-link" />
                  </div>
                  <Input
                    id="menu-nome-do-link"
                    data-testid="nome-do-link"
                    value={nome}
                    onChange={e => {
                      setRecusa(null)
                      setNome(e.target.value)
                    }}
                    className="h-11"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {recusa && (
          <p data-testid="seletor-recusa" role="alert" className="text-sm font-medium text-destructive">
            {recusa}
          </p>
        )}

        {/* Lado a lado enquanto couberem (empilhados, a 200 % os dois tomavam ~190 px da altura da
            lista), e embrulhando quando não cabem: lado a lado a 200 % em 360–412 o "Adicionar" ia até
            x = 423. O texto quebra linha (o `Button` é `whitespace-nowrap`). */}
        <DialogFooter className="flex-row flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className={cn(BOTAO_DO_RODAPE, BOTAO_CONTORNO)}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            data-testid="seletor-adicionar"
            className={cn(BOTAO_DO_RODAPE, BOTAO_CTA)}
            disabled={!podeAdicionar}
            onClick={adicionar}
          >
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MenuTargetPicker
