# Contrato de QA — a língua comum

<!-- Cópia idêntica em pd-qa-validation, pd-workflow-qa e workflow-qa-e2e
     (references/shared/contrato-qa.md). Mude as três juntas; /check-qa-contract confere. -->

Três skills trabalham sobre o mesmo Work Item e a mesma árvore de arquivos. Este contrato fixa os nomes,
os IDs e os formatos que as três escrevem e leem, para que o que uma descobre a outra reuse — sem refazer,
sem traduzir.

---

## Quem faz o quê

| Skill              | Quem roda         | Quando                                               | Ambiente                    | Pergunta                                               |
| ------------------ | ----------------- | ---------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| `pd-qa-validation` | o **Dev**         | fim do desenvolvimento: depois da Validation PASS, antes de o trabalho ir para o QA (com ProductDock, antes de mover o card para `review`) | **local** | uma pessoa de verdade consegue fazer o que veio fazer? |
| `pd-workflow-qa`   | o **eng. de QA**  | depois do handoff: card em `review`, build publicado | **deployed** (homologação)  | o que foi entregue bate com a spec, e se mantém automatizado? |
| `workflow-qa-e2e`  | o **eng. de QA**  | mesma esteira, fora do ProductDock                   | deployed                    | idem, sem plataforma                                   |

O Dev planeja e explora; o QA automatiza e caça divergência no ambiente publicado. O plano é **um só** — o
do Dev —, e o QA parte dele.

## A árvore

`[ITEM_DIR]` = `.productdock/work-items/[WI-ID]-[name]/` com ProductDock, ou `.specs/work-items/[WI-ID]-[slug]/`
sem ele. Fora desses layouts (`workflow-qa-e2e`), a raiz é a pasta que o humano indicar, com a mesma árvore.

```
[ITEM_DIR]/
├── prd.md · spec.md | plan.md · qa-report.md   # pd-workflow — todos só leem
├── item.md                     # pd-workflow, sem ProductDock — a QA do Dev só acrescenta linhas em Gates
└── qa/
    ├── test-plans/                 # pd-qa-validation escreve · E2E lê e acrescenta casos (ver Casos);
    │                               #   sem plano do Dev, o E2E cria test-plan e personas.md, e o Dev completa
    │   ├── <feature>-test-plan.md  #   envelope qa-plan/v1
    │   ├── personas.md
    │   ├── journeys/J-NN-<slug>.md
    │   └── charters/CH-NN-<slug>.md
    ├── test-cases/<TC-ID>.md       # pd-qa-validation escreve · E2E lê, acrescenta e atualiza o bloco Automação
    ├── sessions/ · retest.md       # pd-qa-validation — E2E só lê
    ├── screenshots/                # pd-qa-validation — E2E só lê
    ├── issues/BUG-NNN.md           # as duas escrevem — numeração única (ver Bugs)
    ├── qa-result.md                # rodada do Dev
    ├── decisoes-produto.md         # pd-qa-validation — respostas às perguntas ao produto e o destino; pd-workflow lê
    └── e2e/                        # pd-workflow-qa / workflow-qa-e2e — Dev só lê
        ├── pipeline-state.yaml · context-brief.md · features/ · automation-contract.yaml
        ├── evidence/ · evidence-report.md · review-report.md
        ├── qa-e2e-report.md
        └── qa-result.md            # rodada do QA
```

Ninguém apaga nem reescreve o que é da outra skill, fora dos pontos de passagem marcados acima.

## Critérios

O ID do critério é **o da fonte, como está nela**: `P1-AC01`, `RN-04` no PRD; `C-nn` no `plan.md` (entrada
sem PRD). Ninguém renumera.

Critério sem ID na fonte ganha `R-nn`, na ordem em que aparece, **uma vez**: quem escreve o plano numera, na
tabela de cobertura do test-plan, com a seção de onde veio (`R-03 — PRD §4.2`). Todas as skills reusam essa
numeração; só sem plano (spec avulsa, fora do Work Item) o E2E numera sozinho e diz isso no relatório.

## Personas e contas

| Campo     | Formato                                                       | Exemplo                       |
| --------- | ------------------------------------------------------------- | ----------------------------- |
| persona   | `PER-NN` — o arquétipo de uso (novo, avançado, mobile…)       | `PER-02`                      |
| conta     | slug kebab-case do perfil de acesso; `anonima` sem login      | `operador-sem-exclusao`       |
| credencial | variáveis `QA_<CONTA>_USUARIO` e `QA_<CONTA>_SENHA`, `<CONTA>` em MAIÚSCULAS com `_` | `QA_OPERADOR_SEM_EXCLUSAO_SENHA` |

`personas.md` é a fonte das duas coisas. No contrato do E2E, `perfis[].id` **é** a `conta`, e
`perfis[].personas` lista os `PER-NN` que a usam. "Persona" sem qualificação é sempre o arquétipo.

Credencial vai por referência (o nome da variável), nunca o valor — nem no chat, nem em disco.

## Casos

1. ID `TC-<PREFIXO>-NNN`, três dígitos, sequência por prefixo. Nunca renumere, nunca reuse
2. **O `scenarioId` do E2E é o `TC-*`.** Cenário `.feature` deriva de um caso e leva a tag `@TC-…`; o nome
   do teste Playwright começa pelo ID (`TC-FUNC-001 — …`)
3. Cenário que o E2E precisa e o plano não tem ⇒ o E2E **cria o caso** em `test-cases/` com o próximo
   número livre do prefixo, `**Origem:**` com o critério e `**Autor:** e2e`, e o acrescenta ao `cases[]` do
   envelope. Com plataforma, reenvia o `qa-plan` — o plano continua um só
4. Caso obsoleto fica no disco com `**Situação:** obsoleto — <motivo>` e sai do `cases[]`

| `type`        | Prefixo       |   | `type`        | Prefixo       |
| ------------- | ------------- | - | ------------- | ------------- |
| `functional`  | `TC-FUNC-`    |   | `cfr`         | `TC-CFR-`     |
| `ui`          | `TC-UI-`      |   | `integration` | `TC-INT-`     |
| `journey`     | `TC-JOURNEY-` |   | `security`    | `TC-SEC-`     |
| `persona`     | `TC-PERSONA-` |   | `charter`     | `TC-CHARTER-` |
| `regression`  | `TC-REG-`     |   | `tour`        | `TC-TOUR-`    |
| `smoke`       | `TC-SMOKE-`   |   |               |               |

Prioridade `P0`–`P3`, maiúscula, em todo lugar — no caso, no envelope, na tag (`@P0`) e no contrato.

### O bloco Automação

```markdown
**Automação:** target `e2e` · status `missing`
**Spec:** —
```

- `target` ∈ `e2e · integration · manual`; `status` ∈ `existing · missing · blocked · na`
- **Quem escreve:** o planejamento cria com `missing` (ou `na`); **o E2E, na entrega, passa para
  `existing`** e preenche **Spec** com `caminho/do/arquivo.spec.ts › nome do teste`, ou para `blocked` com o
  motivo — e atualiza o envelope
- Ninguém marca `existing` procurando arquivo por conta: `existing` vem do E2E que escreveu o teste

## Bugs

1. ID `BUG-NNN`, numeração **única no Work Item**: o próximo livre depois do maior `BUG-N` entre os bugs
   registrados na plataforma (com ProductDock) e `qa/issues/` (sempre)
2. Um arquivo por bug, `qa/issues/BUG-NNN.md`: envelope `qa-issue/v1` no topo, corpo depois. Quem achou é
   quem escreve, com `**Origem:** sessão CH-NN` (Dev) ou `**Origem:** e2e · <ambiente>` (QA)
3. `status` ∈ `open · resolved · invalid`; aberto = `open`. Antes de abrir bug, procure em `qa/issues/` e,
   com ProductDock, nos bugs da plataforma: mesmo comportamento, mesmo lugar ⇒ é o mesmo bug. Pelo status dele:
   - `open` — não escreva nada; aponte o `BUG-N`
   - `resolved` — é reabertura: mesmo `id`, mesmo `title` letra por letra, `status: open`. Sem arquivo em
     `qa/issues/` (registrado na UI), crie-o a partir do registro da plataforma
   - `invalid` — alguém já decidiu que não é bug: não reabra; leve ao humano como pergunta
   - descartado num Gate 3 anterior (anotado no `qa-result.md`) — idem: não reabra; leve ao humano
4. Severidade pelo **impacto na persona**, não pelo esforço do fix:

   | Impacto                | `severity` | `priority` |
   | ---------------------- | ---------- | ---------- |
   | Bloqueia a conclusão   | `critical` | `P0`       |
   | Perda de dados         | `critical` | `P0`       |
   | Dano à confiança       | `high`     | `P1`       |
   | Fricção                | `medium`   | `P2`       |
   | Cosmético              | `low`      | `P3`       |

5. **Divergência não é bug ainda.** O `BC-nn` do E2E (spec × código) é achado; vira `BUG-NNN` quando a
   execução confirma o comportamento errado na tela. O corpo pode trazer `**Indício no código:**
   caminho:linha` numa seção própria — nunca no título nem nos passos

## Vereditos

| Escopo              | Valores                                                     |
| ------------------- | ----------------------------------------------------------- |
| caso, no `qa-result` | `pass · fail · blocked · skip`                             |
| caso, no relatório do E2E | `passed · failed · blocked · not-run` — no `qa-result`, `not-run` vira `skip` |
| rodada (`qa-result`) | `pass · fail · partial`                                    |

`fail` com bug `critical` ou `high` aberto, ou caso `P0` em `fail`. `partial` com caso `P0`/`P1`
`blocked` ou parte do escopo que não rodou. `pass` nos demais.

## Evidência

Screenshots em `qa/screenshots/` (Dev) e `qa/e2e/evidence/` (QA). Só PNG, JPEG, GIF e WEBP sobem para a
plataforma; trace e vídeo ficam em disco e se citam pelo caminho. O bug e o `evidence[].url` do `qa-result`
citam a evidência pelo caminho relativo a `qa/`; com ProductDock, o envio troca esse valor pelo caminho no
storage.

## O que cada uma reusa da outra

| O E2E lê do Dev                     | Para quê                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `test-plans/`, `test-cases/`        | os cenários derivam dos `TC-*` com `e2e` (Fase 1 do E2E)                   |
| `personas.md`                       | os `perfis` do contrato e as credenciais                                  |
| `sessions/`, `screenshots/`         | telas, rótulos e fluxos já vistos — seletor confirmado em tela é insumo, não suposição |
| `qa-result.md`, `issues/`           | bugs já conhecidos não se reabrem como novos; caso que cobre bug corrigido vira regressão |
| `[ITEM_DIR]/qa-report.md`           | o que a Validation do Dev já provou                                       |

| O Dev lê do E2E                     | Para quê                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `test-cases/` (bloco Automação)     | o que já está automatizado — não se replaneja                             |
| `e2e/qa-e2e-report.md`              | o gate `e2e` do `qa-result` e os casos que falharam no deployed           |
| `issues/` com `Origem: e2e`         | os bugs do deployed, que voltam ao Dev como fix tasks e se retestam no local |
