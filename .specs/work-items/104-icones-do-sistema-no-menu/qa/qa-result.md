```json
{
  "schema": "qa-result/v1",
  "verdict": "pass",
  "executed_at": "2026-11-17T16:49:00-03:00",
  "branch": "feature/104",
  "duration_min": 14,
  "gates": [
    {
      "name": "build",
      "command": "vite build (store e backoffice), com VITE_SUPABASE_* locais inline",
      "status": "pass",
      "summary": "store ✓ · backoffice ✓ (Re-Validation rodada 2, HEAD 86452bf6) — worktree sem .env"
    },
    {
      "name": "lint",
      "command": "npx eslint . (apps/store, apps/backoffice)",
      "status": "pass",
      "summary": "store 2 erros/2 warnings · backoffice 23/5 — igual à Validation 1"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/backoffice test --testTimeout=20000 · pnpm --filter @estrelinha/store test --testTimeout=20000 --pool=forks --maxWorkers=2 · core não remedido",
      "status": "pass",
      "summary": "19758/19758 (backoffice 5603 · store 7873 · core 6282 da Validation 1, sem arquivo de packages/ alterado); store com exit 1 só por timeout de RPC do worker do vitest, nenhuma asserção falhou"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 7,
    "acceptance_covered": 5,
    "items": [
      { "criterion": "C-01", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "C-02", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "C-03", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "C-04", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "C-05", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "partial" },
      { "criterion": "C-06", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "C-07", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "partial" }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-008", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-009", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "retest-BUG-001.png", "url": "screenshots/retest-BUG-001.png" },
    { "label": "retest-BUG-001-celular.png", "url": "screenshots/retest-BUG-001-celular.png" },
    { "label": "retest-BUG-001-outro-dado.png", "url": "screenshots/retest-BUG-001-outro-dado.png" },
    { "label": "retest-BUG-001-tentativa2.png", "url": "screenshots/retest-BUG-001-tentativa2.png" },
    { "label": "retest-BUG-002.png", "url": "screenshots/retest-BUG-002.png" },
    { "label": "retest-BUG-002-teclado.png", "url": "screenshots/retest-BUG-002-teclado.png" },
    { "label": "retest-BUG-002-loja-1440.png", "url": "screenshots/retest-BUG-002-loja-1440.png" },
    { "label": "retest-BUG-002-loja-390.png", "url": "screenshots/retest-BUG-002-loja-390.png" },
    { "label": "CH-01r2-01-previa-computador-rascunho.png", "url": "screenshots/CH-01r2-01-previa-computador-rascunho.png" },
    { "label": "CH-01r2-02-previa-celular-rascunho.png", "url": "screenshots/CH-01r2-02-previa-celular-rascunho.png" },
    { "label": "CH-01r2-03-cancelar-volta-gravado.png", "url": "screenshots/CH-01r2-03-cancelar-volta-gravado.png" },
    { "label": "CH-01r2-05-so-nome-cores-mantidas.png", "url": "screenshots/CH-01r2-05-so-nome-cores-mantidas.png" },
    { "label": "CH-02r2-01-formato-salvar.png", "url": "screenshots/CH-02r2-01-formato-salvar.png" },
    { "label": "CH-02r2-02-contraste-e-lista-vazia.png", "url": "screenshots/CH-02r2-02-contraste-e-lista-vazia.png" },
    { "label": "CH-02r2-03-so-barra-gravada.png", "url": "screenshots/CH-02r2-03-so-barra-gravada.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 104 · Ícones do sistema e cor do texto no Menu da loja

**Gate 3:** confirmado em 2026-11-17 (rodada 2, confirmação; pelo árbitro do orquestrador, sob a política do humano: veredito pass, BUG-001 e BUG-002 open → resolved)

## Resumo

**Veredito:** pass — BUG-001 e BUG-002 resolvidos no reteste, TC-FUNC-004 e TC-FUNC-006 passam agora, e a confirmação não achou regressão nem bug novo.

Esta é a rodada 2, de confirmação. Rodaram o reteste dos dois bugs abertos e os dois charters que tinham TC `fail` na rodada 1: CH-01 (TC-FUNC-004) e CH-02 (TC-FUNC-006). CH-03, CH-04 e CH-05 não rodaram, porque todos os TC deles passaram na rodada 1. O veredito deles vem de lá.

Com o editor aberto, a dona agora vê na prévia o ícone e a cor que escolheu, em Computador e em Celular, antes de gravar. A prévia acompanha cada troca. Cancelar devolve a prévia ao que está gravado, e mudar só o nome mantém o ícone e as duas cores. Apagar o código de um campo agora tira a cor daquela superfície: o código não volta, a recusa da cor apagada some, e Salvar grava o item sem cor, como a loja mostrou a 1440 e a 390. O código fora do formato continua recusado ao Salvar, com a frase "Use o formato #RRGGBB na cor do texto, ou toque em “Usar a cor padrão”.", e nada é gravado.

Nenhum bug fica aberto ao fim da rodada. O único comportamento novo anotado é a recusa de formato, que só aparece ao Salvar e não diz qual dos dois campos está errado. Ele já estava assim na rodada 1, então não é regressão, e vai a Sugestões de backlog.

| TC                                    | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 18 · fail 0 · blocked 0 · skip 0 | 5 de 7 cobertos | 0          | 0         | resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0 |

Dos 18 TC, 2 rodaram nesta rodada (TC-FUNC-004 e TC-FUNC-006) e 16 trazem o `pass` da rodada 1. C-05 e C-07 ficam `partial` pelo mesmo motivo da rodada 1: TC-INT-001 é da suíte do Dev e não roda no browser.

## Rodada

- **Ambiente:** painel http://localhost:8083 (`/admin/menu`) · loja http://localhost:8082 (prévia em `?preview=1`) · Supabase local `:54441`
- **Branch / build:** `feature/104`, HEAD `86452bf6` segundo o `qa-report.md` (correções T03 `f3571f6b` para BUG-001 e T04 `86452bf6` para BUG-002). Nenhuma sessão expôs o build
- **Execução:** 2026-11-17, das 16:49 às 17:03 (14 min), em sequência: o reteste (16:49–16:53), CH-01 (até 16:59) e CH-02 (até 17:03). Horários completados pela thread principal pela hora dos arquivos de sessão.
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewports:** 1440 × 900 no painel; prévia em Computador 1024 × 768 e em Celular 390 × 844; a loja a 1440 × 900 e a 390 × 844 no reteste do BUG-002
- **Personas e acesso:** PER-01 → `admin` (`QA_ADMIN_*`). PER-02 e PER-03 não rodaram nesta rodada
- **Perfil de estilo:** Black Friday durante toda a rodada, sem alteração
- **Orçamento:** CH-01 usou 26 de 25 ações (a 26ª foi a recarga que conferiu a massa). CH-02 usou cerca de 38 de 25: a sessão de browser `CH-02` passou a mostrar outra aplicação (`127.0.0.1:4802`), e a restauração da massa passou do teto. Isso não afeta o veredito do TC. A sessão `CH-02` do agent-browser não foi fechada e ainda guarda o login do admin no painel
- **Massa ao fim:** conferida pela thread principal no banco local, no estado inicial da rodada 2: A "Sobre" com Etiqueta, barra `#E8C77A` e lista `#8A5A2B`; B "Joias afetivas" com Presente e só a lista `#8A5A2B`; C "Personalizados" com Gravação e sem cor; D sem alteração

## Gate técnico

- **Validation do Dev:** `.specs/work-items/104-icones-do-sistema-no-menu/qa-report.md`, Re-Validation da rodada 2, PASS, de 2026-11-17
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | store ✓ · backoffice ✓, com `VITE_SUPABASE_*` locais inline (worktree sem `.env`) |
| lint  | pass   | store 2/2 · backoffice 23/5, igual à Validation 1 |
| test  | pass   | 19758/19758: backoffice 5603 · store 7873 · core 6282, este da Validation 1 (`packages/` não mudou). O exit 1 da store veio do timeout de RPC do worker, não de uma asserção |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| C-01 | plan | TC-FUNC-001, TC-JOURNEY-001 | pass (r1) · pass (r1) | covered |
| C-02 | plan | TC-UI-001 | pass (r1) | covered |
| C-03 | plan | TC-JOURNEY-001, TC-FUNC-004, TC-JOURNEY-002, TC-FUNC-010, TC-JOURNEY-003, TC-FUNC-011 | pass (r1) · **pass (r2)** · pass (r1) · pass (r1) · pass (r1) · pass (r1) | covered |
| C-04 | plan | TC-FUNC-001, TC-FUNC-002, TC-CFR-001 | pass (r1) · pass (r1) · pass (r1) | covered |
| C-05 | plan | TC-FUNC-003, TC-JOURNEY-001, TC-REG-001, TC-INT-001 | pass (r1) · pass (r1) · pass (r1) · não executado | partial |
| C-06 | plan | TC-JOURNEY-001, TC-FUNC-003, TC-FUNC-004, TC-FUNC-007, TC-FUNC-008, TC-JOURNEY-002, TC-FUNC-010, TC-JOURNEY-003, TC-FUNC-011, TC-REG-001, TC-CFR-001 | pass (r1) · pass (r1) · **pass (r2)** · pass (r1) · pass (r1) · pass (r1) · pass (r1) · pass (r1) · pass (r1) · pass (r1) · pass (r1) | covered |
| C-07 | plan | TC-FUNC-005, TC-FUNC-006, TC-FUNC-009, TC-INT-001, TC-CFR-002 | pass (r1) · **pass (r2)** · pass (r1) · não executado · pass (r1) | partial |

Notas sobre os TC que rodaram nesta rodada:

- **TC-FUNC-004: pass** (CH-01, passos 02–04; reteste do BUG-001). Antes de Salvar, a prévia mostra o ícone e a cor nos dois modos, em Computador `rgb(242, 225, 182)` e em Celular `rgb(31, 95, 58)`, e acompanha a troca de valores sem recarregar o quadro. A sessão rodou o passo 3 com outros valores (Coração, `#F2E1B6`, `#1F5F3A`) e terminou em Cancelar, para não regravar a massa. O reteste fez o mesmo com Presente e `#1F5F3A`. A variação "tela cheia" não rodou
- **TC-FUNC-006: pass** (CH-02, passos 02–08; reteste do BUG-002). `E8C77A` e `#12` são recusados ao Salvar com a frase de formato, os códigos ficam no campo e nada é gravado. Na variação "campo vazio", a lista apagada fica vazia, a cor anterior não volta, a barra grava sozinha com a lista vazia, e depois de "Usar a cor padrão" as duas superfícies ficam vazias, o que foi conferido recarregando a página

**Sem cobertura:** TC-INT-001 (C-05, C-07). É um teste de integração da suíte do Dev, e nenhuma sessão de browser o executa. A Validation cobre a leitura tolerante.

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 | Feature (confirmação: TC-FUNC-004 e o entorno da correção) | done | 26 de 25 | pass 1 · fail 0 | 0 | — |
| CH-02 | PER-01 | Garbage (confirmação: TC-FUNC-006 e o entorno da correção) | done | ~38 de 25 (sessão de browser perdida para outra aplicação e restauração da massa) | pass 1 · fail 0 | 0 (+ 1 observação, que vai a backlog) | — |
| CH-03 | PER-02 | Feature | not-run (confirmação: todos os TC passaram na rodada 1) | — | — | — | — |
| CH-04 | PER-03 | Feature | not-run (confirmação: todos os TC passaram na rodada 1) | — | — | — | — |
| CH-05 | PER-01 | — | not-run (confirmação: todos os TC passaram na rodada 1) | — | — | — | — |
| Reteste | PER-01 | — | done | — | — | 0 (+ 1 observação, que vai a backlog) | BUG-001 resolved · BUG-002 resolved |

## CFR

não rodou. Rodada de confirmação: o CH-05 tem todos os TC `pass` da rodada 1 (TC-CFR-001 e TC-CFR-002), e o resultado de CFR é o de `qa-result-2026-11-17-r1.md`. Nesta rodada só se observou que a prévia acompanha a edição com menos de um segundo de atraso, sem recarregar o quadro, e nenhuma sessão leu isso como fricção.

## Design-check

- **Fonte de design:** sem fonte de design no Work Item ("Seguir sem design", `plan.md` › Design)
- **Status:** not-run (sem fonte)
- **Divergências:** nenhuma

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada. Nenhum bug fica aberto ao fim da rodada, desde que o Gate 3 confirme as duas transições para `resolved`.

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | Veredito | Status proposto | Severidade | Evidência |
| --- | ------------------------------------ | ------ | -------- | --------------- | ---------- | --------- |
| BUG-001 | [Menu da loja › editor do item] A prévia não mostra o ícone nem a cor escolhidos antes de Salvar | reteste (e CH-01, confirmação) | resolved | open → resolved | mantida (high) | `screenshots/retest-BUG-001.png` · `screenshots/retest-BUG-001-celular.png` · `screenshots/retest-BUG-001-tentativa2.png` · `screenshots/CH-01r2-01-previa-computador-rascunho.png` |
| BUG-002 | [Menu da loja › Cor do texto] Apagar o código não tira a cor: a anterior segue valendo e volta ao campo | reteste (e CH-02, confirmação) | resolved | open → resolved | mantida (medium) | `screenshots/retest-BUG-002.png` · `screenshots/retest-BUG-002-teclado.png` · `screenshots/retest-BUG-002-loja-1440.png` · `screenshots/CH-02r2-02-contraste-e-lista-vazia.png` |

Os dois foram vistos resolvidos 2 de 2 vezes, com o entorno ok: o passo anterior, o passo seguinte e a mesma ação com outro dado. As sessões de confirmação viram o mesmo resultado.

**Reteste `blocked`:** nada

## Achados que não viraram bug

- Reteste (BUG-002, tentativa 2) e CH-02 passo 02, a mesma causa observável: com um código fora do formato (`X`, `E8C77A`, `#12`), nenhuma frase aparece enquanto o campo tem foco nem ao sair dele. A recusa de formato só surge ao Salvar, uma frase só no pé do editor, que não diz qual dos dois campos está errado. É conforme a fonte: TC-FUNC-006 pede a recusa com frase e que nada seja gravado, e as duas coisas acontecem (`screenshots/CH-02r2-01-formato-salvar.png`). Não é regressão: a rodada 1 mostrava a mesma frase no mesmo lugar depois de Salvar (`screenshots/CH-02-04-formato-sem-cerquilha.png`). A nota da sessão de que "na rodada 1 não havia frase alguma" é desmentida por essa screenshot. Na confirmação, isso vai a Sugestões de backlog como polimento
- CH-01 (debrief) e reteste do BUG-001: a prévia leva menos de um segundo para acompanhar Cancelar e a digitação, e uma leitura imediata ainda pega o valor anterior. É conforme a fonte: o esperado é acompanhar "sem recarregar", e as duas sessões o leram como não-achado

## Perguntas ao produto

nada. Na rodada de confirmação não há pergunta ao produto.

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Com um código fora de `#RRGGBB`, nenhuma frase aparece ao digitar nem ao sair do campo. A recusa de formato só surge ao Salvar, uma frase só no pé do editor, que não diz se o erro está na barra ou na lista | painel › Menu da loja › editor do item › Cor do texto | polimento | Cor do texto: a recusa de formato aparece sob o campo errado, ao sair dele |

As 13 sugestões da rodada 1 continuam registradas em `qa-result-2026-11-17-r1.md` › Sugestões de backlog e não se repetem aqui.

## Evidências não enviadas

nada

## Riscos residuais

- A barra no perfil **Padrão** nunca foi vista em navegador com o rótulo colorido. As duas rodadas rodaram em Black Friday, e a troca de perfil do TC-FUNC-009 (passos 1 e 3) não rodou
- A 768 × 1024, não se conferiu se "Sobre" (o item com cor) e "Personalizados" se alcançam rolando a barra ou ficam recortados (rodada 1)
- O duplo clique em Salvar com uma cor válida não foi tentado
- As correções tocaram o editor e a prévia do painel (`apps/backoffice`). A loja não mudou desde a rodada 1 (a Validation diz que nenhum arquivo de `apps/store` mudou), por isso CH-03 e CH-04 não foram reexecutados. Nesta rodada, a loja só foi vista com o item C sem cor, no reteste do BUG-002
- A sessão `CH-02` do agent-browser ficou aberta, tomada por outra aplicação, com o login do admin no painel local. É um ponto do ambiente, não do produto

## Fora da cobertura

- CH-03, CH-04 e CH-05: not-run nesta rodada, que é de confirmação. Os TC deles (TC-JOURNEY-002, TC-FUNC-010, TC-JOURNEY-003, TC-FUNC-011, TC-REG-001, TC-CFR-001, TC-CFR-002) trazem o `pass` da rodada 1
- TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-UI-001, TC-FUNC-005, TC-FUNC-007, TC-FUNC-008 e TC-FUNC-009: não foram reexecutados e trazem o `pass` da rodada 1. O CH-01 desta rodada passou pelo entorno de TC-FUNC-003 (mudar só o nome com a cor gravada mantém as duas cores e o ícone), mas no editor, sem abrir a loja
- TC-INT-001 (P1, integração): fica na suíte do Dev, e nenhuma sessão de browser o executa
- TC-FUNC-004: a variação "tela cheia" não rodou, por orçamento. A gravação do nome "Sobre a marca" não foi conferida com uma recarga entre os passos 07 e 09 do CH-01. A persistência ficou provada pela recarga final
- CH-01: a loja (8082) não foi aberta. A massa foi conferida pela prévia e pelos campos do editor. O item B não foi reaberto no editor
- TC-FUNC-006: `#GGGGGG`, `#E8C77AFF`, as minúsculas e o código colado com espaço não foram repetidos (orçamento). A recusa de contraste na lista (`#E8C77A` na lista) não foi repetida. O efeito na loja não foi conferido no CH-02, mas o reteste do BUG-002 o conferiu a 1440 e a 390
- Da rodada 1 e ainda sem cobrir: TC-CFR-001 passo 3 (130% e 200% de fonte, o painel a 390); TC-FUNC-005 variação "no piso"; TC-FUNC-009 passos 1 e 3; o toque simples em "Sobre" a 390 × 844 (TC-JOURNEY-002); a faixa da barra com muitos itens; o rótulo longo com ícone na folha
- Leitor de tela real; Safari, Firefox e browsers móveis (só Chromium)
- Rodada E2E: não houve. Os 14 casos `e2e` + `missing` continuam como pedido de automação
