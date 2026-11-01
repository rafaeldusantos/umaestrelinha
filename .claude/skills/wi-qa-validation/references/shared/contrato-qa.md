# Contrato de QA — a língua comum

<!-- Uma skill de automação E2E que fale este contrato leva uma cópia dele (references/shared/contrato-qa.md).
     Mude as cópias juntas. -->

Sobre o mesmo Work Item e a mesma árvore de arquivos podem trabalhar esta skill e uma **automação E2E**
(fora desta skill; quando houver uma skill de E2E instalada, ela lê `qa/` por este contrato). Este contrato
fixa os nomes, os IDs e os formatos que as duas escrevem e leem, para que o que uma descobre a outra reuse —
sem refazer, sem traduzir. Sem automação E2E, ele continua valendo: é a forma do registro do QA.

---

## Quem faz o quê

| Quem               | Quem roda   | Quando                                                     | Ambiente        | Pergunta                                                      |
| ------------------ | ----------- | ---------------------------------------------------------- | --------------- | ------------------------------------------------------------- |
| `wi-qa-validation` | o **Dev**   | fim do desenvolvimento: depois da Validation PASS          | **local**       | uma pessoa de verdade consegue fazer o que veio fazer?        |
| automação E2E      | quem a tiver | depois, quando houver — fora desta skill                  | o dela          | o que foi entregue bate com a spec, e se mantém automatizado? |

O Dev planeja e explora; a automação E2E, quando houver, automatiza a partir do mesmo plano. O plano é
**um só** — o do Dev —, e a automação parte dele.

## A árvore

`[ITEM_DIR]` = `.specs/work-items/<WI-ID>-<slug>/`. Uma automação E2E que rode fora deste layout usa a pasta
que o humano indicar, com a mesma árvore.

```
[ITEM_DIR]/
├── item.md · prd.md · spec.md | plan.md · qa-report.md   # wi-workflow — todos só leem
│                                                         #   (exceção: a QA acrescenta linhas em item.md › Gates)
└── qa/
    ├── test-plans/                 # wi-qa-validation escreve · E2E lê e acrescenta casos (ver Casos);
    │                               #   sem plano do Dev, o E2E cria test-plan e personas.md, e o Dev completa
    │   ├── <feature>-test-plan.md  #   envelope qa-plan/v1
    │   ├── personas.md
    │   ├── journeys/J-NN-<slug>.md
    │   └── charters/CH-NN-<slug>.md
    ├── test-cases/<TC-ID>.md       # wi-qa-validation escreve · E2E lê, acrescenta e atualiza o bloco Automação
    ├── sessions/ · retest.md       # wi-qa-validation — E2E só lê
    ├── screenshots/                # wi-qa-validation — E2E só lê
    ├── issues/BUG-NNN.md           # as duas escrevem — numeração única (ver Bugs)
    ├── qa-result.md                # rodada do Dev
    ├── decisoes-produto.md         # wi-qa-validation — respostas às perguntas ao produto e o destino; wi-workflow lê
    └── e2e/                        # da automação E2E — Dev só lê
        ├── qa-e2e-report.md        #   o que a QA do Dev lê dali (gate e2e, casos que falharam)
        └── …                       #   o resto é da automação
```

Ninguém apaga nem reescreve o que é da outra, fora dos pontos de passagem marcados acima.

## Critérios

O ID do critério é **o da fonte, como está nela**: `P1-AC01`, `RN-04` no PRD; `C-nn` no `plan.md` (entrada
sem PRD). Ninguém renumera.

Critério sem ID na fonte ganha `R-nn`, na ordem em que aparece, **uma vez**: quem escreve o plano numera, na
tabela de cobertura do test-plan, com a seção de onde veio (`R-03 — PRD §4.2`). Todos reusam essa
numeração; só sem plano (spec avulsa, fora do Work Item) o E2E numera sozinho e diz isso no relatório.

## Personas e contas

| Campo     | Formato                                                       | Exemplo                       |
| --------- | ------------------------------------------------------------- | ----------------------------- |
| persona   | `PER-NN` — o arquétipo de uso (novo, avançado, mobile…)       | `PER-02`                      |
| conta     | slug kebab-case do perfil de acesso; `anonima` sem login      | `operador-sem-exclusao`       |
| credencial | variáveis `QA_<CONTA>_USUARIO` e `QA_<CONTA>_SENHA`, `<CONTA>` em MAIÚSCULAS com `_` | `QA_OPERADOR_SEM_EXCLUSAO_SENHA` |

`personas.md` é a fonte das duas coisas. Num contrato de automação, o perfil **é** a `conta`, e lista os
`PER-NN` que a usam. "Persona" sem qualificação é sempre o arquétipo.

Credencial vai por referência (o nome da variável), nunca o valor — nem no chat, nem em disco.

## Casos

1. ID `TC-<PREFIXO>-NNN`, três dígitos, sequência por prefixo. Nunca renumere, nunca reuse
2. **O ID do cenário automatizado é o `TC-*`.** Cenário derivado de um caso leva a tag `@TC-…`; o nome do
   teste começa pelo ID (`TC-FUNC-001 — …`)
3. Cenário que o E2E precisa e o plano não tem ⇒ o E2E **cria o caso** em `test-cases/` com o próximo
   número livre do prefixo, `**Origem:**` com o critério e `**Autor:** e2e`, e o acrescenta ao `cases[]` do
   envelope — o plano continua um só
4. Caso obsoleto fica no disco com `**Situação:** obsoleto — <motivo>` e sai do `cases[]`

| `type`        | Prefixo       |   | `type`        | Prefixo       |
| ------------- | ------------- | - | ------------- | ------------- |
| `functional`  | `TC-FUNC-`    |   | `cfr`         | `TC-CFR-`     |
| `ui`          | `TC-UI-`      |   | `integration` | `TC-INT-`     |
| `journey`     | `TC-JOURNEY-` |   | `security`    | `TC-SEC-`     |
| `persona`     | `TC-PERSONA-` |   | `charter`     | `TC-CHARTER-` |
| `regression`  | `TC-REG-`     |   | `tour`        | `TC-TOUR-`    |
| `smoke`       | `TC-SMOKE-`   |   |               |               |

Prioridade `P0`–`P3`, maiúscula, em todo lugar — no caso, no envelope e na tag (`@P0`).

### O bloco Automação

```markdown
**Automação:** target `e2e` · status `missing`
**Spec:** —
```

- `target` ∈ `e2e · integration · manual`; `status` ∈ `existing · missing · blocked · na`
- **Quem escreve:** o planejamento cria com `missing` (ou `na`); **a automação E2E, na entrega, passa para
  `existing`** e preenche **Spec** com `caminho/do/arquivo.spec.ts › nome do teste`, ou para `blocked` com
  o motivo — e atualiza o envelope
- Ninguém marca `existing` procurando arquivo por conta: `existing` vem de quem escreveu o teste

## Bugs

1. ID `BUG-NNN`, numeração **única no Work Item**: o próximo livre depois do maior `BUG-N` de `qa/issues/`
2. Um arquivo por bug, `qa/issues/BUG-NNN.md`: envelope `qa-issue/v1` no topo, corpo depois. Quem achou é
   quem escreve, com `**Origem:** sessão CH-NN` (Dev) ou `**Origem:** e2e · <ambiente>` (automação)
3. `status` ∈ `open · still-open · resolved · cannot-reproduce`. **Aberto** = `open` ou `still-open` — é o
   que volta ao Dev como fix task. A identidade é `id` + `title`: mudar de estado é mudar o `status` e
   acrescentar uma linha ao **Histórico** do mesmo arquivo, nunca criar outro
4. Antes de abrir bug, procure em `qa/issues/`: mesmo comportamento, mesmo lugar ⇒ é o mesmo bug. Pelo
   status dele:
   - `open` · `still-open` — não escreva nada; aponte o `BUG-N`
   - `resolved` · `cannot-reproduce` — é reabertura: mesmo `id`, mesmo `title` letra por letra,
     `status: open`, e a linha no Histórico
   - achado igual a um que o humano já descartou num Gate 3 (registrado no `qa-result.md`) — não reabra;
     leve ao humano
5. Severidade pelo **impacto na persona**, não pelo esforço do fix:

   | Impacto                | `severity` | `priority` |
   | ---------------------- | ---------- | ---------- |
   | Bloqueia a conclusão   | `critical` | `P0`       |
   | Perda de dados         | `critical` | `P0`       |
   | Dano à confiança       | `high`     | `P1`       |
   | Fricção                | `medium`   | `P2`       |
   | Cosmético              | `low`      | `P3`       |

6. **Divergência não é bug ainda.** Divergência que a automação acha entre spec e código é achado; vira
   `BUG-NNN` quando a execução confirma o comportamento errado na tela. O corpo pode trazer `**Indício no
   código:** caminho:linha` numa seção própria — nunca no título nem nos passos

## Vereditos

| Escopo              | Valores                                                     |
| ------------------- | ----------------------------------------------------------- |
| caso, no `qa-result` | `pass · fail · blocked · skip`                             |
| caso, no relatório do E2E | `passed · failed · blocked · not-run` — no `qa-result`, `not-run` vira `skip` |
| rodada (`qa-result`) | `pass · fail · partial`                                    |

`fail` com bug `critical` ou `high` aberto, ou caso `P0` em `fail`. `partial` com caso `P0`/`P1`
`blocked` ou parte do escopo que não rodou. `pass` nos demais.

## Evidência

Screenshots em `qa/screenshots/` (Dev) e `qa/e2e/evidence/` (automação). Trace e vídeo também ficam em
disco. Tudo se cita **pelo caminho relativo a `qa/`** — no bug, no corpo do `qa-result.md` e no
`evidence[].path` do envelope.

## O que cada um reusa do outro

| O E2E lê do Dev                     | Para quê                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `test-plans/`, `test-cases/`        | os cenários derivam dos `TC-*` com `e2e`                                  |
| `personas.md`                       | os perfis e as credenciais                                                |
| `sessions/`, `screenshots/`         | telas, rótulos e fluxos já vistos — seletor confirmado em tela é insumo, não suposição |
| `qa-result.md`, `issues/`           | bugs já conhecidos não se reabrem como novos; caso que cobre bug corrigido vira regressão |
| `[ITEM_DIR]/qa-report.md`           | o que a Validation do Dev já provou                                       |

| O Dev lê do E2E                     | Para quê                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `test-cases/` (bloco Automação)     | o que já está automatizado — não se replaneja                             |
| `e2e/qa-e2e-report.md`              | o gate `e2e` do `qa-result` e os casos que falharam lá                    |
| `issues/` com `Origem: e2e`         | os bugs da automação, que voltam ao Dev como fix tasks e se retestam no local |
