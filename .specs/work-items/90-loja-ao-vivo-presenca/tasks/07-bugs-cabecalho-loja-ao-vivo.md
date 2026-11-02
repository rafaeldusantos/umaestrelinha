## 07 · [apps/mobile-adm] Bugs da QA — o cabeçalho e o frescor da Loja ao vivo

**Status:** done

**Bug:** BUG-002 (medium), BUG-008 (low) — lote L3 de `qa/qa-result.md`

**Objetivo.** A linha "Atualizado…" nunca afirma frescor que a tela não tem, e o cabeçalho mede 60 px como no protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §Convenções — mobile e fonte a 130/200 %, §Os guardas, §Baselines); `DESIGN.md`; `apps/mobile-adm/CLAUDE.md` (A Início, A Loja ao vivo, Os guardas do app, Testes). Leia também o protótipo local em `.specs/features/83-loja-ao-vivo/prototipo/` (o `Ateliê Admin.dc.html`) para a medida de referência, e `spec.md` › Design. Leia `qa/issues/BUG-002.md` e `BUG-008.md`, e `spec.md` › D-14.

**Arquivos desta tarefa (só estes):** `apps/mobile-adm/src/pages/AoVivoPage.tsx` (e o componente de cabeçalho/frescor que ela usar, se for exclusivo da tela) e um teste novo em `apps/mobile-adm/src/pages/__tests__/`. Não toque em `widgets/store-live/**` nem em `widgets/live-card/**` (outras tarefas). Se o frescor vier de um hook compartilhado com o Início, mude só o uso nesta tela.

### Critérios de aceite

- **BUG-002** O frescor segue a leitura mais antiga das duas (presença e Acessos), como D-14. Com qualquer uma das duas sem dado — carregando ou em falha —, a linha não diz "Atualizado agora" nem "há N s" (não mostra frescor, como a feature 83 faz "nada enquanto não há dado"). Com as duas boas, o comportamento de hoje (a mais velha) continua.
- **BUG-008** O cabeçalho mede 60 px com a borda inferior incluída (`box-border`/altura que conta a borda).

**Testes.** Teste vermelho antes do código, em arquivo de teste **novo** desta tarefa (não edite `aoVivoPresenca.test.tsx` nem `inicioAgoraNaLoja.test.tsx`, que outras tarefas da mesma onda também leem). jsdom não mede layout: para os bugs de fonte grande, a régua é de forma (classes por token exato: `minmax(0,…)`, `min-w-0`, quebra de linha, empilhamento por `flex-wrap`/grade `auto-fit` com piso em `rem`), e a prova de medida fica para o reteste em navegador. Rode só os arquivos tocados e o `tsc` do app; a suíte inteira é da Validation.
