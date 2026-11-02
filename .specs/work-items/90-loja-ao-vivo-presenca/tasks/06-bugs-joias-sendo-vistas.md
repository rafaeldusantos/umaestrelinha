## 06 · [apps/mobile-adm] Bugs da QA — "Joias sendo vistas agora" com fonte grande

**Status:** done

**Bug:** BUG-004 (high) — lote L2 de `qa/qa-result.md`

**Objetivo.** O nome da joia e o número de pessoas se leem com a fonte a 200 %, sem sobreposição, em 390, 360 e 320.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §Convenções — mobile e fonte a 130/200 %, §Os guardas, §Baselines); `DESIGN.md`; `apps/mobile-adm/CLAUDE.md` (A Início, A Loja ao vivo, Os guardas do app, Testes). Leia também o protótipo local em `.specs/features/83-loja-ao-vivo/prototipo/` (o `Ateliê Admin.dc.html`) para a medida de referência, e `spec.md` › Design. Leia `qa/issues/BUG-004.md`.

**Arquivos desta tarefa (só estes):** `apps/mobile-adm/src/widgets/store-live/ui/JoiasSendoVistas.tsx` e um teste novo em `apps/mobile-adm/src/widgets/store-live/__tests__/`. Não toque em `estilo.ts`, `AgoraNaLoja.tsx`, `NoCelular.tsx` (tarefa 08) nem em `pages/AoVivoPage.tsx` (tarefa 07).

### Critérios de aceite

- **BUG-004** Com a fonte a 200 %, a coluna do nome tem piso de largura legível (`min-w-0` com quebra normal de palavra, nunca tira de ~50 px); quando o "{n} pessoa(s)" não cabe ao lado do nome, ele desce para baixo do nome (ou a linha passa a empilhar), e nunca é coberto. A 100 % em 390 a linha fica como no protótipo (foto · nome · contagem). Vale também para a linha do Guia de envio.

**Testes.** Teste vermelho antes do código, em arquivo de teste **novo** desta tarefa (não edite `aoVivoPresenca.test.tsx` nem `inicioAgoraNaLoja.test.tsx`, que outras tarefas da mesma onda também leem). jsdom não mede layout: para os bugs de fonte grande, a régua é de forma (classes por token exato: `minmax(0,…)`, `min-w-0`, quebra de linha, empilhamento por `flex-wrap`/grade `auto-fit` com piso em `rem`), e a prova de medida fica para o reteste em navegador. Rode só os arquivos tocados e o `tsc` do app; a suíte inteira é da Validation.
