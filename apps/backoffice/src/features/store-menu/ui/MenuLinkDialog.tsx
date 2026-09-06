// O cadastro de um item de **link** do menu (feature 39, `NAV-09`..`NAV-13`).
//
// Link é o que permite o menu não ter item escrito em código. Antes desta feature o "Sobre" morava
// no JSX do `Header` e da folha do celular: tirá-lo era um deploy, e o painel mostrava ao lado dele
// um "Crie o Seu" que **não existia** — `/crie-seu-botton` nunca foi rota declarada e caía na 404.
//
// **O diálogo não oferece painel, subcategoria nem banner** (`NAV-12`), e a ausência é a regra: dar
// painel a um link o transformaria numa categoria sem produtos — a "segunda árvore" que a feature 16
// recusou, agora com uma página que não existe do outro lado.
//
// **A recusa do destino é a de `@estrelinha/core/menu`**, a mesma que o banner usa (`NAV-31`). Duas
// réguas divergiriam, e uma aceitaria o que a outra recusa — a diferença aparecendo só quando a
// cliente clica.

import { useEffect, useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import { MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'
import {
  MENU_ICON_KEYS,
  MENU_ICON_LABELS,
  menuIconKey,
  type MenuLink,
} from '@estrelinha/core/menu'
import { menuLinkRefusal, type MenuLinkDraft } from '../model/useMenuLinks'

interface Props {
  open: boolean
  onOpenChange: (aberto: boolean) => void
  /** `null` é cadastro novo. */
  link: MenuLink | null
  /** Devolve o motivo da recusa (ou da falha de gravação), ou `null` quando salvou. */
  onSave: (draft: MenuLinkDraft) => Promise<string | null>
  onRemove: (id: string) => Promise<string | null>
}

const VAZIO: MenuLinkDraft = {
  label: '',
  href: '',
  icon: null,
  // Nasce ligado nos dois: quem cadastra um item de menu quer vê-lo no menu, e desligar uma das
  // superfícies é a decisão rara. Nascer desligado faria a dona salvar e não achar o que criou.
  desktop: true,
  mobile: true,
}

const MenuLinkDialog = ({ open, onOpenChange, link, onSave, onRemove }: Props) => {
  const [form, setForm] = useState<MenuLinkDraft>(VAZIO)
  const [recusa, setRecusa] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    setRecusa(null)
    setForm(
      link
        ? {
            id: link.id,
            label: link.label,
            href: link.href,
            icon: link.icon ?? null,
            desktop: link.desktop,
            mobile: link.mobile,
          }
        : VAZIO,
    )
  }, [link, open])

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    // A recusa vive no handler, e não num `disabled`: `disabled` some num atalho de teclado, num
    // submit programático e numa chamada direta ao hook — e aí o destino inválido chega ao banco.
    const motivo = menuLinkRefusal(form)
    if (motivo) {
      setRecusa(motivo)
      return
    }

    setSalvando(true)
    const falha = await onSave(form)
    setSalvando(false)

    // Falha NÃO fecha o diálogo (`NAV-42`): fechar com o motivo num toast faria a dona perder o que
    // digitou e ter de reconstruir o item para tentar de novo.
    if (falha) {
      setRecusa(falha)
      return
    }
    onOpenChange(false)
  }

  const remover = async () => {
    if (!link) return
    setSalvando(true)
    const falha = await onRemove(link.id)
    setSalvando(false)
    if (falha) {
      setRecusa(falha)
      return
    }
    onOpenChange(false)
  }

  const iconeAtual = menuIconKey(form.icon)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{link ? 'Editar item de link' : 'Adicionar um link ao menu'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submeter} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-rotulo">Nome no menu</Label>
            <Input
              id="link-rotulo"
              value={form.label}
              placeholder="Sobre"
              onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="link-destino">Destino</Label>
            <Input
              id="link-destino"
              value={form.href}
              placeholder="/sobre"
              onChange={e => setForm(f => ({ ...f, href: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Uma página da loja (<code>/sobre</code>) ou um endereço de fora começando com{' '}
              <code>https://</code> — o externo abre em nova aba.
            </p>
          </div>

          {recusa && (
            <p
              data-testid="link-recusa"
              className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {recusa}
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Ícone</Label>
            {/* A mesma grade do seletor grande, em miniatura: o desenho vem de
                `@estrelinha/ui/icons`, então é o mesmo glifo que a loja vai mostrar. */}
            <div className="flex max-h-[132px] flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-border p-2">
              <button
                type="button"
                aria-pressed={iconeAtual === null}
                aria-label="Sem ícone"
                onClick={() => setForm(f => ({ ...f, icon: null }))}
                className={cn(
                  'flex h-9 items-center rounded-lg border px-2.5 text-[11px] font-medium',
                  iconeAtual === null
                    ? 'border-2 border-primary bg-primary/5 text-foreground'
                    : 'border-dashed border-border text-muted-foreground hover:bg-muted/40',
                )}
              >
                Sem ícone
              </button>
              {MENU_ICON_KEYS.map(chave => {
                const Icone = MENU_ICON_COMPONENTS[chave]
                return (
                  <button
                    key={chave}
                    type="button"
                    aria-pressed={iconeAtual === chave}
                    aria-label={MENU_ICON_LABELS[chave]}
                    title={MENU_ICON_LABELS[chave]}
                    onClick={() => setForm(f => ({ ...f, icon: chave }))}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg border',
                      iconeAtual === chave
                        ? 'border-2 border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/40',
                    )}
                  >
                    <Icone className="h-[18px] w-[18px]" aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            {/* Ligar por dispositivo é a mesma liberdade que a categoria tem (`NAV-09`): o que cabe
                na barra de 1440 não é o que cabe na folha de 390. */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Aparece no computador</span>
              <Switch
                checked={form.desktop}
                aria-label="Aparece no menu do computador"
                onCheckedChange={next => setForm(f => ({ ...f, desktop: next }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Aparece no celular</span>
              <Switch
                checked={form.mobile}
                aria-label="Aparece no menu do celular"
                onCheckedChange={next => setForm(f => ({ ...f, mobile: next }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            {link ? (
              <Button type="button" variant="ghost" onClick={remover} disabled={salvando}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Remover do menu
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>

          {link && (
            <p className="text-[11px] text-muted-foreground">
              {/* `NAV-13` escrito em tela: a dona precisa saber que tirar do menu não apaga a
                  página — senão ela não tira, com medo de perder o conteúdo. */}
              Remover tira o item do menu. A página <code>{link.href}</code> continua existindo na
              loja.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default MenuLinkDialog
