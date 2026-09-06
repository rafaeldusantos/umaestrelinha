// O seletor de ícone de um item do menu (feature 39, `NAV-16`).
//
// **Desenha o mesmo glifo que a loja**, e isso é o ponto inteiro do componente. O desenho vem de
// `@estrelinha/ui/icons` — a biblioteca que mudou de casa na T10 exatamente para chegar aqui —, e
// as chaves vêm de `@estrelinha/core/menu`. Sem a mudança, a alternativa real não era "reusar", era
// **copiar**: `apps/backoffice` não importa de `apps/store` (`previaUnica.test.ts` derruba a suíte
// se importar), e a cliente veria um glifo na barra e a Adri outro na tela onde o escolheu.
//
// **Não há upload.** O conjunto é fechado porque ele é um conjunto: mesma grade de 24, mesmo traço
// de 1,5, mesmo realce. Um PNG enviado pela dona entraria com outro peso e outro humor ao lado dos
// desenhados, e a barra deixaria de parecer uma barra.

import { useMemo, useState } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { Ban, Search } from 'lucide-react'
import { MENU_ICON_COMPONENTS } from '@estrelinha/ui/icons'
import {
  MENU_ICON_KEYS,
  MENU_ICON_LABELS,
  menuIconKey,
  type MenuIconKey,
} from '@estrelinha/core/menu'

/**
 * Sem acento e sem caixa — "gravacao" tem de achar "Gravação" (`NAV-48`).
 *
 * Local **de propósito**: a mesma dobra existe em `category-list`, `product-form`, `quick-grid` e
 * `bulk-edit`, e nenhuma delas é exportada — importá-la daqui seria um import feature→feature, que é
 * exatamente o que a T19 desta feature existiu para fechar. Unificar as cinco é dívida do
 * repositório, não desta task: elas são normalização de texto, não regra de domínio, e a decisão de
 * onde elas moram (um `shared/lib` do painel, ou `@estrelinha/core`) precisa valer para as cinco.
 */
const dobrar = (valor: string) =>
  valor.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Props {
  /** O nome do item cujo ícone está sendo escolhido — o cabeçalho o cita. */
  itemName: string
  /** A chave gravada. Valor fora do catálogo lê como "sem ícone" (`NAV-19`). */
  value: string | null
  onChange: (icon: MenuIconKey | null) => void
}

const CELA =
  'flex h-[76px] w-[100px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-xl border text-center'

const MenuIconPicker = ({ itemName, value, onChange }: Props) => {
  // A leitura passa por `menuIconKey`: um valor que veio por SQL na mão, ou de uma importação,
  // degrada para "sem ícone" em vez de deixar a grade sem nenhuma cela marcada.
  const atual = menuIconKey(value)

  const [busca, setBusca] = useState('')
  const termo = dobrar(busca.trim())

  /**
   * `NAV-48` — o filtro casa o **rótulo e a chave**.
   *
   * O rótulo é o que a Adri lê; a chave é o que fica gravado em `categories.icon` e o que aparece
   * num `select` no banco. Quem está conferindo um valor gravado procura por `gota-afetiva`, e não
   * por "Gota afetiva" — casar só o rótulo faria a busca falhar justamente na conferência.
   */
  const oferecidos = useMemo(
    () =>
      termo === ''
        ? MENU_ICON_KEYS
        : MENU_ICON_KEYS.filter(
            chave =>
              dobrar(MENU_ICON_LABELS[chave]).includes(termo) || dobrar(chave).includes(termo),
          ),
    [termo],
  )

  return (
    <div className="rounded-2xl border border-border bg-card">
      <header className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-bold text-foreground">Ícone de “{itemName}”</h2>
          <span
            data-testid="contador-icones"
            className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
          >
            {termo === ''
              ? `${MENU_ICON_KEYS.length} no conjunto`
              : `${oferecidos.length} de ${MENU_ICON_KEYS.length}`}
          </span>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          São os ícones desenhados para a loja — não há upload. O mesmo traço vale na barra do
          computador e na lista do celular; sem escolha, a entrada aparece só com o nome.
        </p>

        {/* A busca é `type="search"` e não `type="text"`: o navegador dá o "×" de limpar de graça, e
            no celular o teclado abre sem sugestão de autocorreção. */}
        <label className="relative mt-0.5 block">
          <span className="sr-only">Buscar ícone pelo nome</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={busca}
            onChange={event => setBusca(event.target.value)}
            data-testid="busca-icone"
            placeholder="Buscar pelo nome — “gravacao” acha “Gravação”"
            /* `border-input` e não `border-border`: `fieldBorder.test.ts` cobra o token de contorno
               de controle de todo `<input>` do repositório, e `border` reprova os 3:1 da WCAG. */
            className="h-9 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </label>
      </header>

      {/* A grade rola dentro do próprio cartão: com 28 celas de 76px ela empurraria a prévia para
          fora da tela, e o que a dona veio ver aqui é o efeito do ícone, não a lista inteira. */}
      <div className="flex max-h-[280px] flex-wrap gap-2.5 overflow-y-auto p-4">
        {/* "Sem ícone" é a PRIMEIRA cela, e não a última: é o estado inicial de toda entrada e o
            caminho de volta de quem escolheu por engano — enterrá-lo no fim de 28 celas o esconde.

            **E ela NÃO é filtrada pela busca**: não é um resultado, é a saída. Escondê-la porque o
            termo digitado não casa "sem ícone" tiraria da dona o único jeito de limpar a escolha, e
            o caminho de volta seria apagar o que ela acabou de digitar. */}
        <button
          type="button"
          data-testid="icone-nenhum"
          aria-pressed={atual === null}
          onClick={() => onChange(null)}
          className={cn(
            CELA,
            atual === null
              ? 'border-2 border-primary bg-primary/5'
              : 'border-dashed border-border hover:bg-muted/40',
          )}
        >
          <Ban className="h-5 w-5 text-muted-foreground" aria-hidden />
          <span className="text-[11px] font-medium text-muted-foreground">Sem ícone</span>
        </button>

        {oferecidos.map(chave => {
          const Icone = MENU_ICON_COMPONENTS[chave]
          const escolhida = atual === chave

          return (
            <button
              key={chave}
              type="button"
              data-testid={`icone-opcao-${chave}`}
              aria-pressed={escolhida}
              onClick={() => onChange(chave)}
              className={cn(
                CELA,
                escolhida
                  ? 'border-2 border-primary bg-primary/5'
                  : 'border-border hover:bg-muted/40',
              )}
            >
              <Icone className="h-[22px] w-[22px]" aria-hidden />
              {/* O nome ao lado do desenho é AC (`NAV-16`): uma grade de glifos sem rótulo obriga a
                  dona a adivinhar o que cada um significa, e dois deles são parecidos de propósito
                  (mecha de cabelo × mecha amarrada). */}
              <span
                className={cn(
                  'px-1 text-[11px] leading-tight',
                  escolhida ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
                )}
              >
                {MENU_ICON_LABELS[chave]}
              </span>
            </button>
          )
        })}

        {/* Busca sem resultado DIZ isso. Sem esta linha a grade ficaria com a cela "Sem ícone"
            sozinha, o que se lê como "só existe esta opção" e não como "nada casou". */}
        {termo !== '' && oferecidos.length === 0 && (
          <p
            data-testid="icones-sem-resultado"
            className="flex-1 self-center px-2 text-xs text-muted-foreground"
          >
            Nenhum ícone com esse nome. Apague a busca para ver os {MENU_ICON_KEYS.length}.
          </p>
        )}
      </div>
    </div>
  )
}

export default MenuIconPicker
