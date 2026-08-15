// A bandeja de blocos — o rodapé do cartão da lista (feature 24).
//
// **Ela vive DENTRO do cartão, e não num modal do botão "Adicionar seção".** A diferença não é de
// arrumação: é aqui que se lê quais tipos são únicos e já estão na Home, o que responde a pergunta
// **antes** de a dona clicar e ser recusada. Num modal, a mesma informação só apareceria depois do
// clique, em forma de erro — e um erro que só existe porque a tela não contou o que já sabia é a
// definição de recusa evitável.
//
// As três razões de um bloco não poder ser acrescentado vêm todas do domínio, e nenhuma é
// recalculada aqui: `uniqueTypeRefusal` (já está na Home), `sectionMeta().comingSoon` (P3, sem
// renderer nem editor) e `sectionCapRefusal` (o teto de 30).

import { Plus } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  HOME_SECTION_TYPES,
  sectionCapRefusal,
  sectionMeta,
  uniqueTypeRefusal,
  type HomeSection,
  type HomeSectionType,
} from '@estrelinha/core/home'

interface Props {
  sections: readonly HomeSection[]
  onAdd: (type: HomeSectionType) => void
}

/**
 * Por que este bloco não pode entrar agora — ou `null` quando pode.
 *
 * `motivo` é a frase inteira (fica no `title`); `curto` é o que cabe ao lado do rótulo. Os dois
 * saem juntos para a etiqueta nunca discordar da explicação: com uma só string, a tela teria de
 * adivinhar qual regra falou comparando texto, e mudar uma frase no domínio quebraria a etiqueta em
 * silêncio.
 *
 * A ordem das três importa: **"em breve" vence o teto**. Um bloco que ainda não existe não deixa de
 * existir porque a Home encheu, e dizer "a Home já tem 30 seções" sobre um carrossel que nem tem
 * editor mandaria a dona apagar uma seção à toa.
 */
const impedimento = (
  type: HomeSectionType,
  sections: readonly HomeSection[],
): { motivo: string; curto: string } | null => {
  if (sectionMeta(type)?.comingSoon) {
    return { motivo: 'Este bloco ainda não existe na loja.', curto: 'em breve' }
  }

  const repetido = uniqueTypeRefusal(type, sections)
  if (repetido) return { motivo: repetido, curto: 'já está na Home' }

  const teto = sectionCapRefusal(sections)
  if (teto) return { motivo: teto, curto: 'Home cheia' }

  return null
}

const HomeBlockTray = ({ sections, onAdd }: Props) => (
  <div className="flex flex-col gap-2.5 border-t border-border bg-muted/20 px-4 py-4">
    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      Blocos que você pode acrescentar
    </h3>

    <ul className="flex flex-wrap gap-2">
      {HOME_SECTION_TYPES.map(type => {
        const meta = sectionMeta(type)
        const motivo = impedimento(type, sections)
        const bloqueado = motivo !== null

        return (
          <li key={type}>
            <button
              type="button"
              data-testid={`bloco-${type}`}
              disabled={bloqueado}
              // A frase inteira fica no `title` **e** a etiqueta curta ao lado do rótulo: `title`
              // sozinho não existe no toque, e esta tela também é aberta no celular.
              title={motivo?.motivo}
              onClick={() => onAdd(type)}
              className={cn(
                'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium',
                bloqueado
                  ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                  : 'border-input bg-card text-foreground hover:bg-muted/50',
              )}
            >
              {!bloqueado && <Plus className="h-3.5 w-3.5 text-primary" aria-hidden />}
              {meta?.label ?? type}
              {bloqueado && (
                <span data-testid={`motivo-${type}`} className="text-[11px] font-normal">
                  · {motivo.curto}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>

    <p className="text-xs text-muted-foreground">
      A nova seção nasce desligada — você monta o bloco inteiro antes de a cliente ver.
    </p>
  </div>
)

export default HomeBlockTray
