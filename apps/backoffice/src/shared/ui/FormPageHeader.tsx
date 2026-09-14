// O cabeçalho das telas de formulário do grupo `Descontos` (feature 18 / T3, DSC-03).
//
// É a parte de `ProductFormHeader` que NÃO é do produto. Lá o cabeçalho carrega rascunho automático,
// selo `Publicado`/`Rascunho` e dois botões de save com significados diferentes — coisas do
// formulário de produto, que tem 30 campos e cinco abas. O que sobra é o que qualquer formulário em
// rota própria precisa e nenhum dos dois tinha: a trilha de volta, o aviso de pendência e um save com
// atalho.
//
// Por que sticky: as duas telas rolam (o repetidor de faixas cresce), e um save que sai da viewport
// obriga a subir a página inteira para gravar.

import { useEffect } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Badge } from '@estrelinha/ui/badge'
import { cn } from '@estrelinha/ui/lib/utils'

interface Props {
  /** O primeiro nível da trilha — o grupo da sidebar. Não é link: o grupo não tem tela. */
  group: string
  /** O segundo nível: a listagem de onde se veio. É o link de volta. */
  parentLabel: string
  /** O terceiro nível e o título — o nome do registro, ou `Novo cupom` na criação. */
  title: string
  /** `true` some com o selo de pendência (nada foi mexido ainda). */
  isDirty: boolean
  /**
   * Acabou de salvar (feature 50, `VIV-05`/`VIV-06`, `ANI-01`).
   *
   * **Quem desenha `Salvo` é o BOTÃO de salvar**, não o selo. A gravação tem um dono só: o botão
   * passa por `Salvar X` → `Salvando…` → `Salvo`, que é o que `ANI-01` pede, e o selo ao lado do
   * título fica com a **pendência**, que é outro estado e outra AC (`ANI-02`). Dois lugares dizendo
   * `Salvo` seriam o "defeito 01" no tamanho de uma palavra.
   *
   * **`isDirty` vence**: mexer num campo depois de salvar significa que há pendência de novo, e
   * dizer `Salvo` ali seria dizer o contrário do que a tela tem. Quem faz o `Salvo` sumir sozinho
   * é quem o ligou — aqui ele é só um estado a desenhar.
   *
   * Opcional, e o padrão preserva o cabeçalho de hoje: as duas telas de Descontos não passam nada.
   */
  justSaved?: boolean
  saving: boolean
  /** Rótulo do primário: `Salvar promoção` / `Salvar cupom`. */
  saveLabel: string
  onBack: () => void
  onSave: () => void
  /**
   * O cabeçalho sangra 16px para fora do contêiner?
   *
   * Ele nasceu dentro de uma PÁGINA, onde o `-mx-4` faz a barra fixa cobrir de borda a borda o que
   * rola por baixo dela — inclusive o que passa pelo padding do `<main>`. Numa página isso é de
   * graça: ninguém tem `overflow` no caminho, e a sangria some no padding.
   *
   * **Dentro de uma coluna que rola, ela cobra.** `coluna-secoes` de `/admin/home` declara
   * `overflow-y-auto`, e o CSS promove o outro eixo a `auto` junto — os 16px da direita viravam
   * **barra de rolagem horizontal** no formulário, medidos em navegador: `clientWidth` 560,
   * `scrollWidth` 576. A coluna não tem padding para a sangria cobrir, então ali ela só estoura.
   *
   * O padrão é `true` porque as duas telas de Descontos dependem dele e nada mudou para elas.
   */
  bleed?: boolean
}

const FormPageHeader = ({
  group,
  parentLabel,
  title,
  isDirty,
  justSaved = false,
  saving,
  saveLabel,
  onBack,
  onSave,
  bleed = true,
}: Props) => {
  // O `preventDefault` é o ponto do atalho: sem ele o `⌘S` abre o "salvar página como" do navegador,
  // que é a última coisa que se quer ao apertar salvar dentro de um formulário.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 's' || !(event.metaKey || event.ctrlKey)) return
      event.preventDefault()
      if (saving) return
      onSave()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSave, saving])

  /**
   * O estado da gravação, desenhado no botão (`ANI-01`).
   *
   * `null` é repouso. A precedência é a mesma do selo — **pendência vence** —, e ela mora aqui numa
   * expressão só: calculá-la de novo lá embaixo seria a segunda escrita da mesma regra.
   */
  const estadoDaGravacao: 'salvando' | 'salvo' | null = saving
    ? 'salvando'
    : justSaved && !isDirty
      ? 'salvo'
      : null

  return (
    <header
      className={cn(
        'sticky top-0 z-20 mb-6 border-b border-border bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        bleed && '-mx-4 px-4',
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground" aria-label="Trilha">
            <span>{group}</span>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <button type="button" onClick={onBack} className="hover:text-foreground hover:underline">
              {parentLabel}
            </button>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="truncate text-foreground">{title}</span>
          </nav>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="font-heading truncate text-xl font-bold text-foreground">{title}</h1>
            {/* O selo é só da PENDÊNCIA (`ANI-02`). Ele entra e sai depois do título, dentro da
                coluna `flex-1` — o grupo de ações é irmão dela, então nada do que acontece aqui
                move `Cancelar` nem `Salvar`. O `Salvo` mora no botão, com o `Salvando…` (`ANI-01`).
                A transição é de opacidade e vem com o par `motion-reduce:transition-none`, que é a
                convenção de movimento deste repositório (`ANI-05`): quem pediu menos movimento troca
                de estado sem animação nenhuma. */}
            {isDirty && (
              <Badge variant="outline" className="transition-opacity motion-reduce:transition-none">
                Alterações não salvas
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="gradient-cta border-0 text-primary-foreground"
            onClick={onSave}
            disabled={saving}
          >
            {/*
              A vaga do giro, e ela existe SEMPRE (`ANI-01`, segunda metade).

              Antes desta feature o `<Loader2 className="mr-2 h-4 w-4">` **entrava e saía** do botão
              a cada gravação: 16px mais a margem apareciam do nada, o botão crescia e empurrava o
              `Cancelar` ao lado — que é literalmente "mudar de largura a ponto de mover o que está
              ao lado". Reservada a vaga, o giro aparece DENTRO dela e nada se mexe.
            */}
            <span
              data-testid="vaga-do-giro"
              className="mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            </span>

            {/*
              A vaga do rótulo: uma célula de grade, com os dois rótulos EMPILHADOS nela.

              O rótulo de repouso (`Salvar seção`) continua no DOM em todos os estados — é ele que
              dá a medida —, e o estado corrente se desenha por cima, na mesma célula. Assim a
              largura do botão é a mesma nos três estados, por construção, e não por um `min-w`
              chutado que quebraria no dia em que um rótulo ficasse maior que ele.
            */}
            <span className="grid">
              <span
                data-testid="rotulo-de-repouso"
                className={cn(
                  'col-start-1 row-start-1 transition-opacity motion-reduce:transition-none',
                  // `invisible` (`visibility: hidden`) e não `hidden`: ele precisa continuar
                  // ocupando a célula, senão a medida que ele existe para dar some junto.
                  estadoDaGravacao && 'invisible',
                )}
              >
                {saveLabel}
              </span>
              {estadoDaGravacao && (
                <span
                  data-testid={`botao-${estadoDaGravacao}`}
                  className="col-start-1 row-start-1 transition-opacity motion-reduce:transition-none"
                >
                  {estadoDaGravacao === 'salvando' ? 'Salvando…' : 'Salvo'}
                </span>
              )}
            </span>
            {/* O atalho anunciado no próprio botão (board): sem isso ele é um segredo. */}
            <kbd className="ml-2 hidden rounded border border-white/30 px-1 text-[11px] font-normal sm:inline">
              ⌘S
            </kbd>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default FormPageHeader
