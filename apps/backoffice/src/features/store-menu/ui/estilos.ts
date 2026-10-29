// As classes de botão e de item de menu da tela `/admin/menu`, num lugar só (fidelidade ao protótipo
// aprovado da `86`, 2026-10-29).
//
// **Por que existem**: o `Button` e o `DropdownMenuItem` de `@estrelinha/ui` pintam o hover/foco com
// `accent`, e no painel o `--accent` é o ROSA da marca (346 100% 62%). Resultado medido em navegador:
// o "Remover do menu" do editor ficava com fundo rosa e texto vermelho, e TODO item do menu ⋯ ficava
// rosa no hover. `packages/ui` é compartilhado e não muda por causa de uma tela; as variantes que esta
// tela usa sobrescrevem o hover aqui, pelo `twMerge` do `cn` (a classe de baixo vence a do componente).
//
// O mapeamento do protótipo para os tokens do painel:
//   --hover #FFF0F5       → estrelinha-admin-card-hover
//   --elev #F3EFF8        → estrelinha-admin-elevated
//   --violet / -soft      → estrelinha-admin-violet e estrelinha-admin-violet/10
//   --red                 → destructive (o painel não tem vermelho próprio em estrelinha-admin-*)
//   --cta (gradiente)     → gradient-cta (o mesmo CTA das outras telas do painel)

/** `.btn` do protótipo: contorno de controle, hover em rosado claro com o texto mantido. */
export const BOTAO_CONTORNO =
  'border border-input bg-estrelinha-admin-card text-estrelinha-admin-text hover:bg-estrelinha-admin-card-hover hover:text-estrelinha-admin-text'

/** `.btn.ghost`: texto violeta, hover em violeta claro. */
export const BOTAO_FANTASMA =
  'font-semibold text-estrelinha-admin-violet hover:bg-estrelinha-admin-violet/10 hover:text-estrelinha-admin-violet'

/** `.btn.cta`: o gradiente do painel, texto branco. */
export const BOTAO_CTA = 'gradient-cta border-0 font-semibold text-white hover:opacity-90 hover:text-white'

/**
 * `.btn.danger`: borda e texto vermelhos; no hover, FUNDO vermelho e texto BRANCO (pedido do usuário,
 * 2026-10-29) — nunca fundo rosa com texto vermelho.
 */
// Hover em red-700 (#B91C1C): branco sobre ele dá ~6,5:1. O `destructive` do painel dá ~3,8:1,
// abaixo dos 4,5:1 de texto pequeno, e é por isso que não é usado aqui.
export const BOTAO_PERIGO =
  'border border-destructive bg-estrelinha-admin-card text-destructive hover:border-red-700 hover:bg-red-700 hover:text-white'

/** `.pop button`: hover/foco em lilás claro, o texto mantém a cor. */
export const ITEM_DE_ACAO =
  'min-h-11 cursor-pointer rounded-lg px-3 text-[13.5px] text-estrelinha-admin-text focus:bg-estrelinha-admin-elevated focus:text-estrelinha-admin-text'

/** `.pop button.red`: vermelho também no hover/foco. */
export const ITEM_DE_ACAO_PERIGO =
  'min-h-11 cursor-pointer rounded-lg px-3 text-[13.5px] text-destructive focus:bg-estrelinha-admin-elevated focus:text-destructive'
