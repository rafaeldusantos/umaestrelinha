# Casos de teste `TC-*`

Um caso é **um comportamento verificável**, do ponto de vista da persona, com o que conferir e como saber
que passou. O `id` dele entra no `cases[]` do `qa-plan` e vira o `tc_ref` do `qa-result` e do `qa-issue` —
por isso é estável.

Saída: `test-cases/<TC-ID>.md`, um por caso, pelo [template](../../templates/plan/test-case.md).

---

## 1. Tipo e prefixo

O prefixo sai do `type`, e o `type` é um dos enums do envelope
([qa-plan/v1](../setup/artefatos.md#qa-planv1--fase-1-aprovado-no-gate-1)).

| `type`        | Prefixo       | Quando                                                                                  |
| ------------- | ------------- | --------------------------------------------------------------------------------------- |
| `functional`  | `TC-FUNC-`    | uma regra de negócio ou critério de aceite, num passo da jornada                        |
| `ui`          | `TC-UI-`      | conformidade visual com o protótipo, estados de componente, quebra por viewport         |
| `journey`     | `TC-JOURNEY-` | a jornada inteira, da entrada ao objetivo, ou um caminho de abandono dela               |
| `persona`     | `TC-PERSONA-` | a experiência de uma persona numa superfície, sob as condições dela                     |
| `regression`  | `TC-REG-`     | jornada que o Work Item **não** devia afetar, ou bug já corrigido que não pode voltar   |
| `smoke`       | `TC-SMOKE-`   | conferência de 2 minutos de que a jornada crítica não está quebrada no build            |
| `cfr`         | `TC-CFR-`     | um requisito transversal — usabilidade, acessibilidade, performance percebida, compatibilidade, recuperação de erro, paridade com produção ([CFR](../execution/cfr.md)) |
| `integration` | `TC-INT-`     | efeito observável fora da tela: e-mail recebido, notificação, dado refletido em outro módulo |
| `security`    | `TC-SEC-`     | segurança visível ao usuário: acesso negado por perfil, URL com ID de outro tenant, sessão que expira, logout que invalida |
| `charter`     | `TC-CHARTER-` | a missão de um charter que precisa de veredito próprio no `qa-result` — o charter em si é o `CH-NN` |
| `tour`        | `TC-TOUR-`    | um tour com critério de aprovação próprio ([tours](../execution/tours.md))              |

Varredura de vulnerabilidade, carga e contrato de API não são `TC-*` desta skill: são da esteira de
testes do Dev. `security` e `integration` aqui são o que **a persona vê** acontecer.

## 2. ID estável

1. Formato `<prefixo><NNN>` — três dígitos, sequência própria por prefixo: `TC-FUNC-001`, `TC-UI-001`
2. **Nunca renumere, nunca reuse.** Em `revisar`, caso existente mantém o ID; caso novo pega o próximo
   número livre do prefixo
3. Caso que deixou de valer não some: o arquivo fica, com `**Situação:** obsoleto — <motivo>`, e sai do
   `cases[]`. O número não volta a ser usado
4. ID herdado de plano anterior em outro formato (`SMOKE-001`) **fica como está** — é o `tc_ref` de rodadas
   passadas
5. **O título descreve o comportamento**, em linguagem de usuário. Identificador de processo (`P1-AC01`,
   `C-03`, `BUG-12`) vai no campo **Origem**, nunca no título
   - bom: `Login SSO redireciona ao Azure AD e retorna sessão`
   - ruim: `P1-AC01 — login SSO`

## 3. Campos obrigatórios

| Campo          | O que é                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **ID e título**| `## TC-FUNC-001: <comportamento>`                                                              |
| **Tipo**       | o `type` do envelope                                                                           |
| **Prioridade** | `P0`–`P3`, pelo critério da seção 4                                                            |
| **Origem**     | o ID do critério na fonte (`P1-AC01` do PRD, `C-03` do `plan.md`), o `BUG-N` que o caso protege, ou `exploratório` com o motivo — ver seção 5 |
| **Persona**    | o `PER-NN` de [personas](personas.md)                                                          |
| **Jornada**    | o `J-NN` e o passo, ou `n/a`                                                                   |
| **Charter**    | o `CH-NN` que executa o caso                                                                   |
| **Objetivo**   | o que se valida, do ponto de vista da persona, e por que importa a ela                         |
| **Pré-condições** | conta e perfil, massa de dados, estado de partida                                           |
| **Condições reais** | dispositivo (viewport), rede, locale, modalidade — só o que difere da persona            |
| **Passos**     | numerados, em verbo de usuário, cada um com `**Esperado:**` observável                         |
| **Esperado e fonte** | o resultado que prova o critério, e de onde ele vem (PRD, `plan.md`, protótipo)          |
| **Variações**  | os desvios de usuário que valem para o caso ([edge cases](../execution/edge-cases.md))         |
| **Automação**  | o bloco da seção 6                                                                             |

Esperado sem fonte não vira caso: é pergunta 🔴 ou 🟡 no plano. Não invente a regra que parece razoável.

**Por tipo**, acrescente:

| `type`     | Seção extra                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| `persona`  | as três hipóteses de fricção da persona nesta superfície; critério de aprovação = objetivo dentro da paciência |
| `journey`  | entrada (URL e origem), tabela de passos com tempo, objetivo e efeitos colaterais, o caminho de abandono |
| `ui`       | o protótipo e a tela, as propriedades a comparar, os viewports (375 · 768 · 1280) — ver [design-check](../execution/design-check.md) |
| `regression` | o que mudou que pode afetar a jornada; os pontos de contato com outras jornadas         |
| `cfr`      | a categoria e as metas (observável · alvo · aceitável)                                    |
| `smoke`    | no máximo três passos, 2 minutos no total                                                 |

## 4. Prioridade

Pela consequência **para a persona** se o comportamento falhar — não pelo esforço de testar nem de corrigir.

| Prioridade | Critério                                                                                                  | Exemplos                                                  |
| ---------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `P0`       | falhar impede a persona de concluir uma jornada de valor, ou perde/corrompe dado dela                      | login, salvar, pagar; o caminho principal de cada critério de aceite |
| `P1`       | falhar abala a confiança ou gera fricção repetida, mas a persona ainda conclui; fluxos alternativos e erros previsíveis | validação de formulário, mensagem de erro, filtro, permissão negada |
| `P2`       | jornada secundária, persona de borda, superfície de pouco tráfego                                         | ordenação, estado vazio, tablet                           |
| `P3`       | cosmético ou continuação de exploração                                                                    | alinhamento, texto auxiliar                               |

1. Todo critério de aceite tem ao menos um caso `P0` ou `P1`
2. A suíte smoke sai dos `P0` ([regression.md](regression.md))
3. Prioridade do caso não é severidade do bug: o bug achado num `P2` pode ser `critical` — a severidade
   sai do impacto observado, na triagem

## 5. Origem e cobertura

O campo **Origem** é a régua da tabela de cobertura do plano e do `coverage` do `qa-result`.

| Fonte                          | Origem                                   |
| ------------------------------ | ---------------------------------------- |
| PRD                            | o ID do critério: `P1-AC01`, `RN-04`     |
| `plan.md` (entrada sem PRD)    | o `C-nn`                                 |
| bug corrigido                  | `BUG-N` — o caso que impede a volta      |
| CFR, tour, exploração          | `exploratório` e o motivo em uma linha   |

1. Use o ID **como está na fonte**. Critério sem ID na fonte ⇒ numere `R-nn` na ordem em que aparece, uma
   vez, na tabela de cobertura do test-plan, com a seção de onde veio (`R-03 — PRD §4.2`) — o E2E reusa essa
   numeração ([contrato](../shared/contrato-qa.md#critérios))
2. Um caso pode cobrir mais de um critério (liste todos); um critério pode ter vários casos
3. `acceptance_criteria_covered` conta critérios **da fonte** com ao menos um caso — não conta casos
4. Critério sem caso vai na tabela de cobertura com o motivo: fora do escopo pedido, depende de integração
   que o QA manual não alcança, aguarda resposta 🔴

## 6. Automação

Todo caso traz o bloco, com os valores do envelope:

```markdown
**Automação:** target `e2e` · status `missing`
**Spec:** —
**Nota:** fluxo P0 público e determinístico; pedido de automação E2E
```

| `target`      | Quando                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------- |
| `e2e`         | fluxo público pelo browser, determinístico, repetível — jornadas e regras P0/P1, smoke, regressão de bug |
| `integration` | o comportamento se confere melhor abaixo da tela: efeito em outro serviço, contrato, permissão no backend |
| `manual`      | exploração, usabilidade, julgamento visual além de estilo computado, tecnologia assistiva real, cenário com várias personas |

| `status`   | Quando                                                                          | Campo **Spec**        |
| ---------- | ------------------------------------------------------------------------------- | --------------------- |
| `existing` | já existe teste que cobre o caso — marcado pela automação E2E na entrega        | o caminho do spec     |
| `missing`  | dá para automatizar e ainda não há teste                                        | —                     |
| `blocked`  | daria, mas falta massa, credencial ou ambiente                                  | — e o bloqueio na nota|
| `na`       | automação não se aplica                                                         | —                     |

1. `target: manual` ⇒ `status: na`. `e2e` e `integration` ⇒ `existing`, `missing` ou `blocked`
2. `existing` e `blocked` vêm da automação E2E, que escreveu o teste ([contrato](../shared/contrato-qa.md#o-bloco-automação)).
   No planejamento, caso novo nasce `missing` ou `na`; caso existente **mantém** o bloco como está
3. `e2e` + `missing` é o **pedido de automação** — o que uma automação E2E, quando houver, consome. Seja criterioso: caso
   instável ou de julgamento visual pedido como `e2e` vira teste frágil
4. Tipos `persona`, `charter`, `tour` e a maior parte de `cfr` ficam `manual`

## 7. Armadilhas

- **Caso sem persona** — _"um usuário consegue se cadastrar"_ testa o sistema, não a pessoa
- **Passo técnico** — _"chamar `POST /orders`"_ não é o que a persona faz
- **Esperado de opinião** — _"a mensagem deve ser clara"_ sem a mensagem da fonte não se confere
- **Caso por clique** — um caso por botão incha o plano; um caso por comportamento verificável
- **Envelope e arquivos divergentes** — todo caso ativo em `test-cases/` está no `cases[]`, com o mesmo ID,
  título, prioridade, tipo e automação
