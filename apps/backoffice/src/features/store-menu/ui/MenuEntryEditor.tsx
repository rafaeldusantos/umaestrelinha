// A entrada do menu se edita num lugar só — feature 47, `FOCO-28`..`FOCO-32`.
//
// Antes desta feature os três editores de uma entrada moravam em dois lugares: `MenuPanelEditor` e
// `MenuBannerEditor` empilhados na coluna da esquerda, e `MenuIconPicker` **na coluna da direita**,
// debaixo da prévia. Configurar uma categoria pedia olhar para as duas colunas ao mesmo tempo, e o
// seletor de ícone ficava a uma rolagem de distância do nome do item que ele iconiza.
//
// **Os três editores não mudam por dentro.** Este arquivo é só o invólucro com abas: cada um recebe
// exatamente as props que já recebia. Mexer neles aqui seria reescrever regra que já tem dono.
//
// O nome **não** contém `Preview` de propósito: `previaUnica.test.ts` recusa um segundo arquivo
// `…Preview` em `store-menu/ui`, e a régua é de nome porque é assim que o segundo desenho costuma
// chegar.

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@estrelinha/ui/tabs'
import type { MenuIconKey, MenuBanners, MenuSurface } from '@estrelinha/core/menu'
import type { AdminCategory } from '@/entities/category'
import MenuPanelEditor from './MenuPanelEditor'
import MenuBannerEditor from './MenuBannerEditor'
import { bannersGravados } from '../model/bannersGravados'
import MenuIconPicker from './MenuIconPicker'

interface Props {
  surface: MenuSurface
  /** A entrada selecionada na lista. */
  host: AdminCategory
  categories: AdminCategory[]
  onToggleChild: (id: string, next: boolean) => void
  onSaveBanners: (banners: MenuBanners) => Promise<string | null>
  onIcon: (icon: MenuIconKey | null) => void
}

const MenuEntryEditor = ({
  surface,
  host,
  categories,
  onToggleChild,
  onSaveBanners,
  onIcon,
}: Props) => {
  // A contagem sai da MESMA leitura que o editor usa (`FOCO-32`, `AD-025`). Uma segunda contagem
  // aqui diria "2" com o editor mostrando 3 — e nada quebraria.
  const quantosBanners = bannersGravados(host.menu_banners, surface).length

  return (
    // `key` por superfície:entrada — trocar qualquer um dos dois **remonta** o card. Isso zera a aba
    // (`FOCO-30`) e, de graça, o estado interno dos editores (o `mostrarTodas` do painel, o rascunho
    // dos banners), que é exatamente o que se quer ao passar a editar outra coisa.
    <Tabs
      key={`${surface}:${host.id}`}
      defaultValue="painel"
      data-testid="editor-da-entrada"
      className="rounded-2xl border border-border bg-card"
    >
      <div className="border-b border-border px-4 pt-3">
        <h2 className="font-heading text-sm font-bold text-foreground">{host.name}</h2>
        <TabsList className="mt-2 h-auto bg-transparent p-0">
          <TabsTrigger value="painel" className="min-h-11">
            Painel
          </TabsTrigger>
          <TabsTrigger value="banners" className="min-h-11">
            Banners
            {quantosBanners > 0 && (
              <span
                data-testid="contagem-de-banners"
                className="ml-1.5 rounded-full bg-muted px-1.5 text-[11px] tabular-nums"
              >
                {quantosBanners}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="icone" className="min-h-11">
            Ícone
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="painel" className="mt-0 p-4">
        <MenuPanelEditor
          surface={surface}
          host={host}
          categories={categories}
          onToggleChild={onToggleChild}
        />
      </TabsContent>

      <TabsContent value="banners" className="mt-0 p-4">
        <MenuBannerEditor
          surface={surface}
          host={host}
          categories={categories}
          onSave={onSaveBanners}
        />
      </TabsContent>

      <TabsContent value="icone" className="mt-0 p-4">
        <MenuIconPicker itemName={host.name} value={host.icon ?? null} onChange={onIcon} />
      </TabsContent>
    </Tabs>
  )
}

export default MenuEntryEditor
