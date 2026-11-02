## 08 · [apps/mobile-adm] Bugs da QA — o bloco escuro "Agora na loja" e o rótulo de "No celular"

**Status:** done

**Bug:** BUG-005 (low), BUG-006 (low) — lote L4 de `qa/qa-result.md`

**Objetivo.** Os rótulos de bloco e as cores do bloco escuro seguem o protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §Convenções — mobile e fonte a 130/200 %, §Os guardas, §Baselines); `DESIGN.md`; `apps/mobile-adm/CLAUDE.md` (A Início, A Loja ao vivo, Os guardas do app, Testes). Leia também o protótipo local em `.specs/features/83-loja-ao-vivo/prototipo/` (o `Ateliê Admin.dc.html`) para a medida de referência, e `spec.md` › Design. Leia `qa/issues/BUG-005.md` e `BUG-006.md`.

**Arquivos desta tarefa (só estes):** `apps/mobile-adm/src/widgets/store-live/ui/AgoraNaLoja.tsx`, `NoCelular.tsx`, `estilo.ts` e um teste novo em `apps/mobile-adm/src/widgets/store-live/__tests__/`. Não toque em `JoiasSendoVistas.tsx` (tarefa 06). Se mudar uma classe compartilhada em `estilo.ts`, confira que `JoiasSendoVistas`, `OQueEstaoFazendo` e `DeOndeVieram` não mudam de aparência sem querer.

### Critérios de aceite

- **BUG-005** Os eyebrows "Agora na loja" (bloco A) e "No celular" (bloco E) em Outfit (`font-body`) 11/600, caixa alta, .1em, como os de Acessos e do cartão do Início. Se forem `h2` por acessibilidade, mantenha o elemento e troque só a fonte.
- **BUG-006** No bloco escuro: eyebrow e frase "pessoas nos últimos 5 minutos" em branco a 80 % (`on-ink-strong`); legendas "30 min atrás"/"agora" em branco a 62 % (`on-ink`); barras antigas em branco a 12 % (`on-ink-border`). O número e a barra de agora continuam `accent`. Use os tokens do preset se existirem (`packages/ui`); se não existirem, não crie token novo no preset — use a cor do protótipo com o valor do token, e diga isso no retorno. Confira contraste ≥ 4,5:1 do texto sobre o `ink` (o guarda `contrast`/`arbitraryTextColor` da loja pode alcançar o app).

**Testes.** Teste vermelho antes do código, em arquivo de teste **novo** desta tarefa (não edite `aoVivoPresenca.test.tsx` nem `inicioAgoraNaLoja.test.tsx`, que outras tarefas da mesma onda também leem). jsdom não mede layout: para os bugs de fonte grande, a régua é de forma (classes por token exato: `minmax(0,…)`, `min-w-0`, quebra de linha, empilhamento por `flex-wrap`/grade `auto-fit` com piso em `rem`), e a prova de medida fica para o reteste em navegador. Rode só os arquivos tocados e o `tsc` do app; a suíte inteira é da Validation.
