# 56 — Tasks

Um commit atômico por task **não** se aplica aqui: o `CLAUDE.md` da raiz sobrepõe o padrão da Skill
e manda gerar os commits completos **ao final** (decisão do usuário, `BL-012`, 2026-08-15). As tasks
abaixo continuam sendo a unidade de gate.

| # | Task | ACs | Done when |
| --- | --- | --- | --- |
| T01 | `core`: catálogo de apresentação — `catalog.ts` (3 mapas + vocabulário de ícones), reexport com `.ts`, guarda `catalog.test.ts` | `LEG-01` `LEG-02` `LEG-03` `LEG-04` | os 3 `Record` compilam completos; nenhum nome igual ao rótulo de histórico; nomes e descrições únicos e não vazios; 15 chaves distintas dentro do vocabulário; `core/notifications` sem React/Supabase/Deno; suíte de `core` verde |
| T02 | `shared/ui`: `CharCounter` + `FieldGroup` com `counter` na linha do rótulo + guarda `contadorComDonoUnico.test.ts` | `LEG-14` `LEG-19` | `FieldGroup` sem `counter` renderiza o markup de hoje; com `counter`, rótulo e contador na mesma linha, contador à direita; a varredura acha `.length}/` **só** em `CharCounter.tsx`, com âncora de contagem e sensor |
| T03 | `shared/ui`: `SettingsSaveButton` com dono único, `disabled` opcional, `w-full sm:w-auto`; os 3 chamadores de Configurações passam a usá-lo | `LEG-20` `LEG-21` | uma única declaração da string de classes em `apps/backoffice/src/**`; `h-11` preservado; `w-full` e `sm:w-auto` presentes; os 4 botões de salvar de Configurações continuam gravando |
| T04 | painel: `eventIcons.ts` (`chave → componente`) + guarda bidirecional | `LEG-03` | toda chave de `NOTIFICATION_ICON_KEYS` tem componente e todo componente tem chave; âncora de contagem = 15 |
| T05 | `EventCard`: cabeçalho recolhível (botão + switch irmãos), ícone 34×34 com os dois tons, descrição, divisor, sinal de travado, contador na linha do rótulo, fim do `ToggleField` | `LEG-05` `LEG-08` `LEG-09` `LEG-11` `LEG-13` `LEG-14` `LEG-15` `LEG-21` | recolhido não tem nenhum dos 5 campos no DOM; `aria-expanded` acompanha; Enter e Espaço alternam; clique no switch chama `onToggle` e **não** `onToggleExpanded`; recusa e aviso viram sinal com motivo em `sr-only`; nenhum `<button>` dentro do `<button>` do cabeçalho |
| T06 | `EmailPreviewFrame`: moldura com barra de título; selo dentro da barra; controles de largura no corpo | `LEG-16` | a barra nomeia a prévia com a frase inteira; `preview-width-*` continuam `h-11`; iframe, versão texto, carga e erro seguem dentro da moldura |
| T07 | `NotificationsTab`: cabeçalho da seção com o campo de prévia, grupos com contagem derivada, acordeão de um por vez que fecha a prévia junto; apaga `NotificationsSection` e religa `panels.tsx` + barrel | `LEG-06` `LEG-07` `LEG-10` `LEG-17` `LEG-18` | nenhum card aberto na montagem; abrir B fecha A; reabrir A mostra o texto editado; fechar fecha a prévia; as 3 contagens vêm de `groupedEvents()`; o campo empilha abaixo de `lg` e fica à direita a partir de `lg` (asserção positiva nas duas); `panels.test.tsx` e `AdminSettingsPage.test.tsx` verdes |
| T08 | as outras três seções: contadores nos 4 campos com limite, rótulos sem o limite embutido, inventário atualizado | `LEG-19` `LEG-20` | os 4 campos mostram `n/limite`; `Título padrão` e `Descrição padrão` sem o parêntese; o inventário de 24 rótulos continua completo e passa |
| T09 | fecho: medição em navegador, baselines, `CLAUDE.md`, `STATE.md`, `validation.md` | `LEG-12` + todas | `scrollHeight` < 2.500px em 1440×1000 e 390×844, medido no Chromium; 5 workspaces medidos um por vez com exit code fora de pipe e `--testTimeout=20000`; lint e tipos sem regressão; `packages/core/src/payment/**` intocado |

## Ordem e dependências

`T01 → T04 → T05` (o card precisa do catálogo e do mapa de ícones).
`T02 → T05` e `T02 → T08` (o contador é a mesma peça nos dois).
`T03` é independente. `T06 → T05` só na leitura (o card monta a prévia). `T07` depois de `T05`.
`T09` por último, sempre.
