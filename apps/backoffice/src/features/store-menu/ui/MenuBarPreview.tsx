// A barra do topo como a cliente vai vê-la — esquemática, não pixel-perfect.
//
// **Por que não o componente real da loja**: `apps/backoffice` não importa `apps/store`. E mesmo se
// importasse, não deveria: a loja usa os tokens `estrelinha-*` e esta tela usa os `--estrelinha-admin-*` do
// backoffice, então o componente real chegaria aqui com a paleta errada.
//
// O que esta prévia precisa provar é **uma** coisa: se a barra estoura. Com quatro universos de nome
// longo mais "Crie o Seu" e "Sobre", 1440px acaba — e o lugar de descobrir isso é aqui, não na loja.

import { AlertTriangle } from 'lucide-react'
import type { MenuEntry } from '@estrelinha/core/menu'
import { FIXED_ENTRIES } from './MenuSlotList'

interface Props {
  entries: MenuEntry[]
}

const MenuBarPreview = ({ entries }: Props) => (
  <div className="rounded-2xl border border-border bg-card">
    <header className="border-b border-border px-4 py-3">
      <h2 className="font-heading text-sm font-bold text-foreground">Prévia da barra</h2>
      <p className="text-xs text-muted-foreground">
        A ordem daqui também vale para a grade da home e o rodapé da loja.
      </p>
    </header>

    <div className="p-4">
      {entries.length === 0 && (
        <p
          data-testid="previa-vazia"
          className="mb-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Nenhuma categoria no menu — a loja mostra só os dois itens fixos.
        </p>
      )}

      {/* `overflow-x-auto` e não `flex-wrap`: embrulhar em duas linhas ESCONDERIA o estouro, que é
          exatamente o que a prévia existe para mostrar. A barra da loja é uma linha só. */}
      <div className="overflow-x-auto rounded-xl border border-border bg-background px-4 py-3">
        <div className="flex min-w-max items-center gap-6">
          <span className="font-heading text-sm font-bold text-primary">Nanita</span>
          {entries.map(entry => (
            <span key={entry.id} className="whitespace-nowrap text-[13px] font-medium text-foreground">
              {entry.name}
            </span>
          ))}
          {FIXED_ENTRIES.map(({ label }) => (
            <span
              key={label}
              data-testid={`previa-fixa-${label}`}
              className="whitespace-nowrap text-[13px] font-medium text-muted-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
)

export default MenuBarPreview
