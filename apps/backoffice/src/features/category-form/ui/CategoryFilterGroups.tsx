// "Filtros nesta categoria" — feature 66 (`FLT-35`..`FLT-38`).
//
// Um interruptor por grupo, LIGADO por padrão. Desligar grava uma linha em
// `category_hidden_filter_groups`; religar a apaga. Sem linha, o grupo aparece — e é por isso que um
// grupo novo nasce visível em toda categoria sem ninguém gravar nada (`FLT-37`), e que apagar o grupo
// leva as linhas junto (`on delete cascade`, `FLT-38`).
//
// Grava NA HORA, como o interruptor de ativo das perguntas: o "Salvar" do inspetor é do formulário da
// categoria, e um interruptor que esperasse por ele seria um segundo rascunho na mesma coluna.

import { Link } from 'react-router-dom'
import { Switch } from '@estrelinha/ui/switch'
import { SWITCH_TAP_44 } from '@/shared/ui'
import { useAdminFilterCatalog, useCategoryHiddenGroups } from '@/entities/filter'

interface Props {
  categoryId: string
}

const CategoryFilterGroups = ({ categoryId }: Props) => {
  const { groups, loading: carregandoGrupos, error: erroDosGrupos } = useAdminFilterCatalog()
  const { hidden, loading, error, setGroupVisible } = useCategoryHiddenGroups(categoryId)

  return (
    <section aria-labelledby="filtros-categoria-titulo" className="space-y-2">
      <div>
        <h3 id="filtros-categoria-titulo" className="text-[12.5px] font-semibold text-foreground">
          Filtros nesta categoria
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Desligue o que não faz sentido aqui. Grupo novo nasce ligado em todas.
        </p>
      </div>

      {carregandoGrupos || loading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : erroDosGrupos ? (
        <p role="alert" className="text-xs text-destructive">
          Não foi possível carregar os filtros.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum grupo de filtro criado ainda.{' '}
          <Link to="/admin/filtros" className="font-semibold text-primary hover:underline">
            Criar os filtros da loja
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {groups.map(grupo => {
            const visivel = !hidden.has(grupo.id)
            return (
              <li key={grupo.id} className="flex min-h-[52px] items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-foreground">{grupo.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {!visivel
                      ? 'Escondido nesta categoria'
                      : grupo.is_active
                        ? 'Aparece nesta categoria'
                        : 'Desligado na loja'}
                  </p>
                </div>
                <Switch
                  checked={visivel}
                  onCheckedChange={valor => void setGroupVisible(grupo.id, valor)}
                  aria-label={`Mostrar “${grupo.name}” nesta categoria`}
                  className={SWITCH_TAP_44}
                />
              </li>
            )
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {groups.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Grupo sem nenhuma peça marcada nesta categoria não aparece na loja de qualquer jeito — o
          interruptor é para esconder o que tem peça mas não ajuda.
        </p>
      )}
    </section>
  )
}

export default CategoryFilterGroups
