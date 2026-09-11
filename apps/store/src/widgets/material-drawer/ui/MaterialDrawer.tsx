import { Info, X } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@estrelinha/ui/sheet'
import { materialGuideHref } from '@estrelinha/core/routes'
import { ATALHOS_DE_MATERIAL, useMaterialDrawerStore } from '@/entities/material'
import MaterialDrawerBody from './MaterialDrawerBody'
import MaterialDrawerChips from './MaterialDrawerChips'
import MaterialDrawerSteps from './MaterialDrawerSteps'

/**
 * "Como enviar seu material" — a gaveta da página do produto (feature `44`, artboards `B` e `C`).
 *
 * **A loja não diz qual é o material da cliente; ela pergunta.** É a decisão que sustenta a feature
 * inteira: `material_kinds` diz menos que a descrição (`BL-015`), então qualquer pré-seleção seria a
 * loja afirmando errado na tela onde a compra se decide. Os chips são a pergunta, e a resposta é
 * dela.
 *
 * **Entra pela direita nos dois tamanhos** — é o lado em que a gaveta do carrinho já abre nesta
 * loja, e repetir o gesto é o que faz a cliente reconhecer o objeto.
 *
 * **A faixa de véu de 48px no celular não é sobra de largura.** Painel colado na borda, ocupando a
 * tela inteira, deixa a cliente sem alvo para "toque fora" — e no Android o instinto seguinte é o
 * gesto de voltar, que sai da página do produto em vez de fechar a gaveta. A integração com o
 * histórico está fora do escopo (nenhuma das quatro superfícies sobrepostas da loja a tem), então o
 * véu é o que resolve.
 *
 * **A ORDEM do corpo é decisão medida, não gosto** (`GAV-09`): a pergunta vem antes dos quatro
 * passos. Com os passos no topo — que é a ordem "lógica" — os chips caem abaixo da dobra numa tela
 * de 390×844, e os chips são o motivo de a gaveta abrir.
 */
const MaterialDrawer = () => {
  const open = useMaterialDrawerStore(s => s.open)
  const anchor = useMaterialDrawerStore(s => s.anchor)
  const setDrawerOpen = useMaterialDrawerStore(s => s.setDrawerOpen)

  /**
   * O destino do rodapé. Com material escolhido vai direto para a ficha dele no guia; sem escolha,
   * para o topo da página. A âncora é contrato desde a feature `22`, e `MATERIAIS_SEM_ANCORA`
   * garante que toda entrada tem destino.
   *
   * **Quem monta a URL é `materialGuideHref`, não este arquivo.** A primeira escrita desta linha
   * concatenava `` `${GUIA_MATERIAL_PATH}#${anchor}` `` à mão — um segundo dono do formato de um
   * endereço que já mudou uma vez (feature `31`), e que já tem função testada tratando nulo e
   * string em branco. Achado pela verificação independente: defeito 01 na sua forma mais discreta,
   * uma interpolação de três tokens.
   */
  const escolhido = ATALHOS_DE_MATERIAL.find(a => a.anchor === anchor) ?? null
  const hrefGuia = materialGuideHref(escolhido?.anchor)

  return (
    <Sheet open={open} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        hideClose
        data-testid="material-drawer"
        className="flex w-[calc(100%-48px)] flex-col gap-0 bg-estrelinha-surface p-0 sm:max-w-[480px]"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-estrelinha-line px-4 py-4 sm:px-7">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <SheetTitle className="font-display text-[19px] font-semibold leading-[25px] tracking-[-0.01em] text-estrelinha-ink sm:text-[22px] sm:leading-7">
              Como enviar seu material
            </SheetTitle>
            <SheetDescription className="text-[13px] leading-[17px] text-estrelinha-ink-soft sm:text-[14px]">
              Leva menos de um minuto para entender
            </SheetDescription>
          </div>

          <SheetClose
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-estrelinha-ground transition-colors hover:bg-estrelinha-ground-deep"
          >
            <X aria-hidden className="h-[19px] w-[19px] text-estrelinha-ink" />
          </SheetClose>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-7">
          <p className="flex items-start gap-2.5 rounded-md bg-estrelinha-serenity px-3.5 py-3.5 text-[14px] leading-[21px] text-estrelinha-ink">
            <Info aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-estrelinha-primary" />
            <span>
              Nada precisa ser enviado agora. Depois do pagamento confirmado, o endereço chega no seu
              WhatsApp.
            </span>
          </p>

          <MaterialDrawerChips />

          {anchor && <MaterialDrawerBody anchor={anchor} />}

          <MaterialDrawerSteps />
        </div>

        <footer className="shrink-0 border-t border-estrelinha-line bg-estrelinha-ground px-4 py-3.5 sm:px-7">
          <a
            href={hrefGuia}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-sm border border-estrelinha-primary text-[15px] font-semibold text-estrelinha-primary transition-colors hover:bg-estrelinha-primary hover:text-estrelinha-on-primary"
          >
            Ver o guia completo
          </a>
        </footer>
      </SheetContent>
    </Sheet>
  )
}

export default MaterialDrawer
