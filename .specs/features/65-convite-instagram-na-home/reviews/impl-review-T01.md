Tarefa revisada: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/teste-specflow/.specs/features/65-convite-instagram-na-home/tasks/T01-convite-instagram-na-home.md
Instruções lidas: `CLAUDE.md` (raiz) › Convenções que valem em todo o repositório, Os guardas — o que trava o quê, Baselines, O "defeito 01", Feature-Sliced Design. `apps/store/CLAUDE.md` › Design system, Mobile — o que quebra e não grita, Ícones e marca, A home não salta enquanto carrega (feature 40), A Home é dado (feature 24), Modo prévia (feature 25), Carrinho, chrome e checkout. `DESIGN.md` (Tipografia, Forma, Sombra, Chrome e espaçamento, Checklist). `packages/ui/CLAUDE.md` (Como se importa, ícones, tokens).
Veredito: serve

## Achados
| # | Classe | Gravidade | Arquivo:linha | O defeito | A exigência que ele contraria |
|---|---|---|---|---|---|
| | nada | | | | |

## Cobertura da tarefa
| Asserção | Cumprida em | Bate? |
|---|---|---|
| na Home, com storage vazio e o aviso de cookies respondido, o convite abre uma vez e não volta | `InstagramInvite.tsx:28-39` (atraso, portão de cookies, `inviteSeen`/`markInviteSeen` ao abrir); `model/inviteSeen.ts:12-28`; `HomePage.tsx:63-71` | sim |
| o botão do perfil abre `https://www.instagram.com/umaestrelinha.adri` em nova aba, e o rodapé usa a mesma constante | `InstagramInviteSheet.tsx:65`; `shared/config/instagram.ts:9`; `InstagramStrip.tsx:2`, `Footer.tsx:15,48` | sim |
| o X, "Agora não", o Esc e o véu fecham, com alvos ≥44px e nome acessível | `InstagramInviteSheet.tsx:21` (`onOpenChange` cobre Esc e véu), `:31-38` (X `h-11 w-11` com `aria-label`), `:70-76` (`TAP_ROW`), `:60-69` (`Button`, `min-h-11`, `h-[52px]`), `SheetTitle`/`SheetDescription` `:45-52` | sim |
| o convite não abre em prévia, no esqueleto nem com o aviso de cookies pendente | `HomePage.tsx:63-71` (montado só no ramo `!preview` resolvido); `InstagramInvite.tsx:21-23,34` | sim |
| cada comportamento do bloco `Testes` coberto por um teste que você escreveu | `InstagramInvite.test.tsx`, `homeInstagramInvite.test.tsx`, `Footer.test.tsx:93` | sim |
| testes dos arquivos que você alterou, passando — só deles | — | só execução |
| a verificação mínima de fechar unidade de trabalho de cada repositório | — | só execução |

## Obrigações
- X posicionado: `InstagramInviteSheet.tsx:35`, `absolute ... h-11 w-11` sem `TAP_44`. Aplicada.
- "Agora não": `<button>` com `TAP_ROW` (`:70-76`); o primário é `shared/ui/Button` (`min-h-11` na base) com `h-[52px]` (`:60-64`). Aplicada.
- Fio ouro: `bg-estrelinha-accent` (`:42`), sem `text-estrelinha-accent` no arquivo. Aplicada.
- Ações em `rounded-sm`: vem da base do `Button`; o "Agora não" não tem raio; nada de `rounded-pill` em ação (a pílula fica só no puxador decorativo, `:28`). Aplicada.
- Cores só por token: nenhum `text-[hsl|#|rgb]`. Os `text-[Npx]` são tamanhos, não cores. Aplicada.
- Toaster: nenhum `useToast`/`<Toaster>`. Aplicada.
- Marca anterior: nenhuma ocorrência nos arquivos do diff. Aplicada.
- Chave nova: `CLAUDE.md:298-299` na lista "Chaves em uso hoje", e a seção nova em `apps/store/CLAUDE.md:599-617` (onde mora, quando abre, a chave, por que não é seção). Aplicada.
- FSD: o convite e o rodapé importam de `@/shared/config/instagram`, sem import entre widgets; a `HomePage` importa do barrel `@/widgets/instagram-invite`. Aplicada.
- Copy: sem exclamação (há teste em `InstagramInvite.test.tsx:204-207`), na primeira pessoa ("Lá eu mostro", "o meu trabalho"). Aplicada.

## Testes
- [sem mutação, fatia 13] `homeComposition.test.tsx` e `homePreview.test.tsx` verdes sem edição: `git status` confirma que os dois estão intocados. Não há asserção nova a ler; se ficam verdes, só a execução diz.
- Abre com storage vazio e o aviso respondido, depois do atraso: `InstagramInvite.test.tsx:57-74`, com o par "não abre antes do atraso". Morde.
- A marca impede a abertura, é gravada ao abrir e a remontagem não reabre: `:78-103`. O caso da gravação confere o storage com o diálogo ainda aberto, então gravar só ao fechar reprovaria. A remontagem zera a memória do módulo, então quem prova é o storage. Morde.
- X, "Agora não", Esc e véu fecham: `:127-155`, cada um com `waitFor` da ausência do diálogo. O véu é localizado pela classe `bg-estrelinha-ink/55`. Morde.
- Botão do perfil (URL com `www`, `_blank`, `noopener`) fecha o convite: `:159-168`. Morde.
- `localStorage` lançando na leitura e na escrita: `:107-123`, abre sem quebrar e não reabre na remontagem (memória do módulo). Morde.
- Nome acessível igual ao título, descrição igual ao texto, foco dentro do diálogo: `:172-177`. Morde.
- Literais e ausência da fileira de fotos: `:181-202`, com zero `img`. Morde.
- Prévia, esqueleto e aviso de cookies pendente; abre quando o aviso é respondido: prévia e esqueleto pela `HomePage` real em `homeInstagramInvite.test.tsx:77-92`; cookies pendente, a resposta ao aviso e as preferências abertas em `InstagramInvite.test.tsx:211-234`. Morde: montar o convite no esqueleto ou na prévia reprovaria os casos da página.
- Fiação pela `HomePage` real: `homeInstagramInvite.test.tsx:70-75` renderiza `HomePage` com o hook de seções dublado, sem montar a árvore à mão. Morde.
- Rodapé e convite com a mesma URL com `www`: `Footer.test.tsx:93` ajustado, e o convite asserido na mesma URL. Morde.

## Premissas
| # | O que ele decidiu | Se sustenta? | Contra o que você conferiu | Raio confere? |
|---|---|---|---|---|
| 1 | Conteúdo pelo `DialogPrimitive.Content` do Radix, dentro de `Sheet` + `SheetPortal` + `SheetOverlay` do pacote | sim | A decisão 8 pede véu próprio e X próprio. `SheetContent` monta véu e X dele. `packages/ui` ficou intacto. `@radix-ui/react-slot` também não está no `package.json` da loja e é importado em `shared/ui/Button.tsx:2` | sim |
| 2 | "Pendente" = `notice === null` ou `preferencesOpen` | sim | C-07 "não briga com outros avisos". O store expõe `preferencesOpen` (`cookieConsentStore.ts`), consumido sem alteração | sim |
| 3 | O atraso conta da montagem; se o aviso for respondido depois, o convite abre na hora | sim | Decisões 4 e 5 | sim |
| 4 | Montado só no ramo resolvido, num Fragment, sem prop `ready` | sim | Decisão 7 e C-07 (fora do esqueleto). O Fragment não acrescenta nó, e os dois testes da Home estão intocados | sim |
| 5 | `lazy` dentro do widget: o portão é estático no chunk da Home, a folha tem chunk próprio | sim | O exemplar citado (`StoreLayout.tsx:27-43`) faz o mesmo: o latch fica estático e o overlay é `lazy`. O barrel não reexporta a folha. O portão só puxa o store de cookies, que já está no layout | sim |
| 6 | Valor `'1'`, e qualquer valor presente conta como "visto" | sim | Nenhuma tarefa seguinte em `tasks/`: só existe a T01 | sim |
| 7 | Memória da sessão em variável de módulo, com `resetInviteSeenForTests` fora do barrel | sim | O barrel `index.ts` exporta só o componente. O precedente `resetAnalyticsForTests` foi citado pelo implementador | sim |
| 8 | Rótulo do X e título em dois `span block` | sim | O nome acessível sai igual ao C-05, e há asserção disso | sim |
| 9 | Sem animação de entrada no conteúdo | sim | O Design da tarefa não especifica movimento | sim |

## Não conferido
- Se as suítes passam, incluindo `homeComposition`/`homePreview` com o convite montado e o relógio real, e os guardas que varrem o fonte (`touchTarget`, `alvoDeToqueNaoRoubaPosicao`, `buttonShape`, `accentText`, `brandScan`, `routeSplitting`): só a execução diz.
- Que a folha de fato sai do chunk inicial da Home (C-07): é propriedade do bundle, só o build mostra.
- O layout em 390 e em 1440: a folha presa ao rodapé, o cartão de 480 centralizado, a folga do texto ao lado do X e a sombra arbitrária voltada para cima (`InstagramInviteSheet.tsx:24`; não existe token de sombra para cima em `DESIGN.md`). Isso pede navegador, que esta revisão não roda.
- Os arquivos novos aparecem como `A` no `git status`, então todos estavam no diff; nenhum ficou sem base.
