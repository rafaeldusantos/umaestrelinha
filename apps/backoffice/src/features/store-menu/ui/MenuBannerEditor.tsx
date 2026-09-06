// Os banners do painel de uma entrada do menu (feature 39, `NAV-28`..`NAV-35`).
//
// Substitui o `MenuPromoEditor`, e o que ele editava era **um retângulo de cor com texto** apontando
// só para categoria. Esta loja vende peça que se compra pelo olho: o anúncio no lugar onde a cliente
// está decidindo para onde ir precisa de foto.
//
// Três coisas que o card antigo não tinha, e cada uma é uma AC:
//
// - **Até dois por superfície** (`NAV-28`), e o terceiro é RECUSADO com motivo (`NAV-29`). É o único
//   limite desta feature, e ele é de layout do painel — não é contagem de menu. O teto de itens do
//   menu foi removido de propósito.
// - **Uma arte por dispositivo, dentro do MESMO banner** (`NAV-33`): o anúncio é um, o que muda
//   entre 640×380 e o quadrado do acordeão é o recorte da foto. Dois objetos fariam a dona escrever
//   o mesmo título duas vezes e divergir na terceira edição.
// - **Destino de coleção, de peça ou endereço digitado**, com a régua de `menuTargetRefusal` — a
//   MESMA que o item de link usa (`NAV-31`). Duas réguas divergiriam, e uma aceitaria o que a outra
//   recusa.
//
// **Gravar é explícito.** O editor antigo mandava um `update` a cada tecla digitada no título; aqui
// o rascunho fica na tela e a dona salva quando terminou — o que também é o que permite recusar o
// terceiro banner **antes** de qualquer escrita.

import { useEffect, useState } from 'react'
import { AlertTriangle, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Textarea } from '@estrelinha/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  MENU_BANNER_LIMIT,
  menuBannerArt,
  menuBannerImage,
  menuBannerRefusal,
  menuBannerSlots,
  menuTargetRefusal,
  pathLabel,
  resolveMenuTarget,
  type MenuBanner,
  type MenuBanners,
  type MenuCategory,
  type MenuSurface,
  type MenuTarget,
} from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import { uploadBannerImage } from '../lib/uploadBannerImage'
import { MINIMO_PARA_BUSCAR, useMenuProducts } from '../model/useMenuProducts'
import { NOME_DA_SUPERFICIE } from '../model/superficie'

/** Os banners crus de uma superfície, já sem o que não é objeto. */
const listaDe = (raw: unknown, surface: MenuSurface): MenuBanner[] =>
  menuBannerSlots(raw, surface).filter(
    b => b !== null && typeof b === 'object' && !Array.isArray(b),
  ) as MenuBanner[]

const idDoAlvo = (target: MenuTarget | undefined): string =>
  target && (target.kind === 'category' || target.kind === 'product') ? target.id : ''

interface Props {
  surface: MenuSurface
  host: AdminCategory
  categories: AdminCategory[]
  /** Grava o jsonb inteiro. Devolve o motivo da falha, ou `null` quando salvou (`NAV-42`). */
  onSave: (banners: MenuBanners) => Promise<string | null>
}

const MenuBannerEditor = ({ surface, host, categories, onSave }: Props) => {
  const gravados = listaDe(host.menu_banners, surface)
  /** `null` = mostrando o que está no banco. Qualquer edição materializa o rascunho. */
  const [rascunho, setRascunho] = useState<MenuBanner[] | null>(null)
  const [recusa, setRecusa] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [termo, setTermo] = useState('')

  // Trocar de entrada ou de dispositivo **descarta** o rascunho: mantê-lo faria a dona salvar num
  // banner o que ela digitou em outro, e nada em tela diria que isso aconteceu.
  useEffect(() => {
    setRascunho(null)
    setRecusa(null)
  }, [host.id, surface])

  const lista = rascunho ?? gravados
  const sujo = rascunho !== null
  const pool = categories as unknown as MenuCategory[]
  const destinos = categories.filter(c => c.active)

  const { resultados, porId, buscando } = useMenuProducts(
    termo,
    lista.filter(b => b.target?.kind === 'product').map(b => idDoAlvo(b.target)),
  )
  const produtos = Object.values(porId)

  const editar = (indice: number, mudanca: Partial<MenuBanner>) => {
    setRecusa(null)
    setRascunho(
      lista.map((banner, i) => {
        if (i !== indice) return banner
        const proximo = { ...banner, ...mudanca }
        // Campo apagado SAI do jsonb em vez de virar `""`: string vazia gravada é indistinguível de
        // "quis um título vazio", e a herança do nome do destino (`NAV-32`) deixaria de acontecer.
        for (const chave of ['badge', 'title', 'subtitle', 'image_desktop', 'image_mobile'] as const) {
          if (proximo[chave] !== undefined && String(proximo[chave]).trim() === '') delete proximo[chave]
        }
        return proximo
      }),
    )
  }

  const remover = (indice: number) => {
    setRecusa(null)
    setRascunho(lista.filter((_, i) => i !== indice))
  }

  const adicionar = () => {
    const proximo: MenuBanner[] = [
      ...lista,
      { target: { kind: 'category', id: destinos[0]?.id ?? '' } },
    ]
    // A recusa vive no handler, e não num botão `disabled`: `disabled` some num atalho de teclado e
    // numa chamada direta, e a AC pede **motivo em texto**, não um controle apagado.
    const motivo = menuBannerRefusal(proximo)
    if (motivo) {
      setRecusa(motivo)
      return
    }
    setRascunho(proximo)
    setRecusa(null)
  }

  const enviarArte = async (indice: number, campo: 'image_desktop' | 'image_mobile', file: File) => {
    setOcupado(true)
    const { url, error } = await uploadBannerImage(file)
    setOcupado(false)
    if (error) {
      setRecusa(error)
      return
    }
    editar(indice, { [campo]: url })
  }

  const salvar = async () => {
    const motivoDeContagem = menuBannerRefusal(lista)
    if (motivoDeContagem) {
      setRecusa(motivoDeContagem)
      return
    }
    for (const [i, banner] of lista.entries()) {
      const motivo = menuTargetRefusal(banner.target)
      if (motivo) {
        setRecusa(`Banner ${i + 1}: ${motivo}`)
        return
      }
    }

    setOcupado(true)
    // A superfície que não está sendo editada passa intacta: gravar só a lista corrente apagaria os
    // banners do outro dispositivo — e a dona só descobriria abrindo a loja no celular.
    const falha = await onSave({
      desktop: surface === 'desktop' ? lista : listaDe(host.menu_banners, 'desktop'),
      mobile: surface === 'mobile' ? lista : listaDe(host.menu_banners, 'mobile'),
    })
    setOcupado(false)
    if (falha) {
      setRecusa(falha)
      return
    }
    setRascunho(null)
  }

  const excedentes = lista.length - MENU_BANNER_LIMIT

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="font-heading text-sm font-bold text-foreground">Banners do painel</h2>
          <p className="text-[11px] text-muted-foreground">
            Aparecem no painel de “{host.name}” no {NOME_DA_SUPERFICIE[surface]}.
          </p>
        </div>
        <span
          data-testid="contador-banners"
          className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
        >
          {lista.length} de {MENU_BANNER_LIMIT}
        </span>
      </header>

      {excedentes > 0 && (
        // **A contrapartida de `resolveMenuBanners` truncar na leitura.** A loja mostra dois e ignora
        // o resto; sem este aviso o terceiro ficaria invisível — e indeletável, porque a tela também
        // só desenharia dois. Um estado gravado que nenhuma tela mostra é como um dado errado
        // sobrevive por meses.
        <p
          data-testid="banners-excedentes"
          className="flex items-start gap-1.5 border-b border-border bg-estrelinha-admin-amber/10 px-4 py-2.5 text-xs font-medium text-estrelinha-admin-amber"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {lista.length} banners gravados, {MENU_BANNER_LIMIT} cabem no painel. Os{' '}
          {excedentes === 1 ? 'o último não aparece' : `${excedentes} últimos não aparecem`} na loja —
          apague {excedentes === 1 ? 'o excedente' : 'os excedentes'} abaixo e salve.
        </p>
      )}

      <div className="flex flex-col gap-4 p-4">
        {lista.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {/* `NAV-35` escrito em tela: sem banner o painel não fica com buraco, fica só com a
                lista. É o que permite dizer "nenhum" sem parecer configuração pela metade. */}
            Nenhum banner. O painel de “{host.name}” fica só com a lista de subcategorias — sem espaço
            reservado e sem quadro vazio.
          </p>
        )}

        {lista.map((banner, indice) => {
          const alvo = banner.target
          const kind = alvo?.kind ?? 'category'
          const resolvido = resolveMenuTarget({ categories: pool, products: produtos }, alvo)
          // **A herança da arte é decidida por `core`, não aqui.** Esta tela já reescreveu o
          // predicado uma vez — por truthiness da string crua, enquanto `menuBannerArt` apara espaço
          // —, e uma arte só de espaços fazia a loja reaproveitar a do outro dispositivo enquanto a
          // tela dizia que estava tudo certo. É o "defeito 01" no tamanho de um `||`.
          const { image: arteMostrada, imageReused: reaproveitando } = menuBannerArt(banner, surface)
          const excedente = indice >= MENU_BANNER_LIMIT

          return (
            <div
              key={indice}
              data-testid={`banner-${indice}`}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-3',
                excedente ? 'border-estrelinha-admin-amber/40 bg-estrelinha-admin-amber/5' : 'border-border',
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-muted/40">
                  {arteMostrada ? (
                    <img src={arteMostrada} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-semibold text-muted-foreground">FOTO</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">
                    {banner.title ?? resolvido?.name ?? `Banner ${indice + 1}`}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {resolvido
                      ? `leva para ${resolvido.href}`
                      : 'destino não resolve — o banner não vai aparecer na loja'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Remover o banner ${indice + 1}`}
                  onClick={() => remover(indice)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Aponta para</Label>
                <div className="flex gap-1.5">
                  {(
                    [
                      ['category', 'Coleção'],
                      ['product', 'Peça'],
                      ['url', 'Endereço'],
                    ] as const
                  ).map(([valor, rotulo]) => (
                    <button
                      key={valor}
                      type="button"
                      aria-pressed={kind === valor}
                      onClick={() =>
                        editar(indice, {
                          target:
                            valor === 'url'
                              ? { kind: 'url', href: '' }
                              : { kind: valor, id: valor === kind ? idDoAlvo(alvo) : '' },
                        })
                      }
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-xs font-semibold',
                        kind === valor
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted/40',
                      )}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>

                {kind === 'category' && (
                  <Select
                    value={idDoAlvo(alvo) || undefined}
                    onValueChange={value => editar(indice, { target: { kind: 'category', id: value } })}
                  >
                    <SelectTrigger aria-label={`Coleção de destino do banner ${indice + 1}`}>
                      <SelectValue placeholder="Escolha a coleção de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {destinos.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {pathLabel(pool, c.id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {kind === 'product' && (
                  <div className="flex flex-col gap-1.5">
                    <Input
                      value={termo}
                      placeholder="Procurar a peça pelo nome"
                      aria-label="Procurar a peça de destino"
                      onChange={e => setTermo(e.target.value)}
                    />
                    {termo.trim().length >= MINIMO_PARA_BUSCAR && (
                      <div className="max-h-32 overflow-y-auto rounded-lg border border-border">
                        {buscando && <p className="px-2 py-1.5 text-xs text-muted-foreground">procurando…</p>}
                        {!buscando && resultados.length === 0 && (
                          <p className="px-2 py-1.5 text-xs text-muted-foreground">
                            nenhuma peça com esse nome
                          </p>
                        )}
                        {resultados.map(produto => (
                          <button
                            key={produto.id}
                            type="button"
                            onClick={() => editar(indice, { target: { kind: 'product', id: produto.id } })}
                            className={cn(
                              'flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted/40',
                              idDoAlvo(alvo) === produto.id && 'bg-primary/5 font-semibold',
                            )}
                          >
                            <span className="truncate">{produto.name}</span>
                            {produto.is_active === false && (
                              <span className="shrink-0 text-[10px] text-estrelinha-admin-amber">
                                inativa — não aparece
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {kind === 'url' && (
                  <Input
                    value={alvo && alvo.kind === 'url' ? alvo.href : ''}
                    placeholder="/sobre"
                    aria-label={`Endereço de destino do banner ${indice + 1}`}
                    onChange={e => editar(indice, { target: { kind: 'url', href: e.target.value } })}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`banner-selo-${indice}`}>Selo</Label>
                  <Input
                    id={`banner-selo-${indice}`}
                    value={banner.badge ?? ''}
                    placeholder="sem selo"
                    onChange={e => editar(indice, { badge: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`banner-titulo-${indice}`}>Título</Label>
                  <Input
                    id={`banner-titulo-${indice}`}
                    value={banner.title ?? ''}
                    // O placeholder mostra o valor HERDADO: a dona vê o que a loja vai escrever se
                    // ela não escrever nada, em vez de encarar um campo vazio e achar que é
                    // obrigatório (`NAV-32`).
                    placeholder={resolvido?.name ?? 'nome do destino'}
                    onChange={e => editar(indice, { title: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`banner-texto-${indice}`}>Texto</Label>
                <Textarea
                  id={`banner-texto-${indice}`}
                  rows={2}
                  value={banner.subtitle ?? ''}
                  placeholder={resolvido?.description ?? 'descrição do destino'}
                  onChange={e => editar(indice, { subtitle: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ['image_desktop', 'computador', '640 × 380'],
                    ['image_mobile', 'celular', 'mais quadrada'],
                  ] as const
                ).map(([campo, dispositivo, medida]) => {
                  // Pelo mesmo motivo do bloco acima: quem diz se ESTA superfície tem arte é `core`.
                  // `banner[campo]` cru chamaria `"   "` de arte, e a loja não chamaria.
                  const arte = menuBannerImage(banner, campo === 'image_desktop' ? 'desktop' : 'mobile')
                  return (
                    <div key={campo} className="flex flex-col gap-1.5">
                      <span
                        data-testid={`arte-${campo}-${indice}`}
                        className={cn(
                          'rounded px-2 py-1 text-[10px] font-semibold',
                          arte
                            ? 'bg-estrelinha-admin-emerald/10 text-estrelinha-admin-emerald'
                            : 'bg-estrelinha-admin-amber/10 text-estrelinha-admin-amber',
                        )}
                      >
                        arte do {dispositivo} · {arte ? medida : 'falta'}
                      </span>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary">
                        <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                        {arte ? 'Trocar' : 'Enviar'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          aria-label={`Arte do ${dispositivo} do banner ${indice + 1}`}
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) enviarArte(indice, campo, file)
                          }}
                        />
                      </label>
                      {arte && (
                        <button
                          type="button"
                          onClick={() => editar(indice, { [campo]: '' })}
                          className="text-left text-[11px] text-muted-foreground hover:underline"
                        >
                          remover a arte
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {reaproveitando && (
                // `NAV-34`: a loja renderiza com a arte do outro dispositivo em vez de sumir com o
                // banner. Sem este aviso a dona acharia que enviou as duas.
                <p
                  data-testid={`arte-reaproveitada-${indice}`}
                  className="text-[11px] font-medium text-estrelinha-admin-amber"
                >
                  Sem arte do {NOME_DA_SUPERFICIE[surface]}: a loja vai reaproveitar a do{' '}
                  {surface === 'desktop' ? 'celular' : 'computador'}.
                </p>
              )}
            </div>
          )
        })}

        {recusa && (
          <p
            data-testid="banner-recusa"
            className="flex items-start gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {recusa}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" data-testid="adicionar-banner" onClick={adicionar}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {lista.length === 0 ? 'Adicionar um banner' : 'Adicionar um segundo banner'}
          </Button>
          {sujo && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRascunho(null)}>
                Descartar
              </Button>
              <Button type="button" size="sm" disabled={ocupado} onClick={salvar}>
                {ocupado ? 'Salvando…' : 'Salvar banners'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MenuBannerEditor
