## 05 · [apps/mobile-adm] Bugs da QA — o cartão "Agora na loja" do Início

**Status:** done

**Bug:** BUG-003 (high), BUG-001 (medium), BUG-007 (low) — lote L1 de `qa/qa-result.md`

**Objetivo.** O cartão do Início se lê com a fonte a 200 % em 390, 360 e 320, diz quando a leitura ao vivo falhou com número na tela, e segue as medidas do protótipo.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz: §Convenções — mobile e fonte a 130/200 %, §Os guardas, §Baselines); `DESIGN.md`; `apps/mobile-adm/CLAUDE.md` (A Início, A Loja ao vivo, Os guardas do app, Testes). Leia também o protótipo local em `.specs/features/83-loja-ao-vivo/prototipo/` (o `Ateliê Admin.dc.html`) para a medida de referência, e `spec.md` › Design. Leia os três bugs: `qa/issues/BUG-003.md`, `BUG-001.md`, `BUG-007.md`.

**Arquivos desta tarefa (só estes):** `apps/mobile-adm/src/widgets/live-card/**`, `apps/mobile-adm/src/pages/InicioPage.tsx` e testes novos em `apps/mobile-adm/src/pages/__tests__/` ou `widgets/live-card/__tests__/`. Não toque em `widgets/store-live/**` nem em `pages/AoVivoPage.tsx` (outras tarefas da onda).

### Critérios de aceite

- **BUG-003** Com a fonte a 200 % (390 × 844, 360 × 800, 320), o eyebrow, o número, "pessoa(s)" e a linha do funil ficam legíveis, sem uma palavra por linha e sem pintar sobre o mini gráfico. A coluna de texto nunca fica com largura zero: o mini gráfico (e, se preciso, a seta) desce para baixo do texto quando não cabe lado a lado, em vez de espremer o texto. A 100 % em 390 o desenho do protótipo continua igual (texto à esquerda, gráfico e seta à direita).
- **BUG-001** Numa releitura que falha com número já na tela, o cartão diz que não conseguiu atualizar e oferece "Tentar de novo" (a frase do app), sem apresentar o número antigo como atual; quando a leitura volta, o aviso some. A falha fria (sem número) continua como está.
- **BUG-007** A área do cartão com 16 px no topo e 20 px nas laterais (cartão de 350 px a 390); 8 px entre o número e "pessoas". Confirme no protótipo; se o recuo de 20 px divergir dos outros blocos do Início, aplique só ao cartão, como o protótipo desenha.

**Testes.** Teste vermelho antes do código, em arquivo de teste **novo** desta tarefa (não edite `aoVivoPresenca.test.tsx` nem `inicioAgoraNaLoja.test.tsx`, que outras tarefas da mesma onda também leem). jsdom não mede layout: para os bugs de fonte grande, a régua é de forma (classes por token exato: `minmax(0,…)`, `min-w-0`, quebra de linha, empilhamento por `flex-wrap`/grade `auto-fit` com piso em `rem`), e a prova de medida fica para o reteste em navegador. Rode só os arquivos tocados e o `tsc` do app; a suíte inteira é da Validation.
