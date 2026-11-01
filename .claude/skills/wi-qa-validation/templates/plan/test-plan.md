```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — <título do Work Item>",
  "summary": {
    "total_cases": 0,
    "by_priority": { "P0": 0, "P1": 0, "P2": 0, "P3": 0 }
  },
  "acceptance_criteria_covered": 0,
  "strategy": [
    "Exploração por charter no browser real (Playwright MCP ou playwright-cli), uma persona por sessão",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1 determinísticos",
    "Manual p/ usabilidade, acessibilidade e conferência contra o protótipo"
  ],
  "cases": [
    {
      "id": "TC-FUNC-001",
      "title": "<comportamento, em linguagem de usuário>",
      "priority": "P0",
      "type": "functional",
      "automation": { "target": "e2e", "status": "missing" }
    }
  ]
}
```

<!--
Envelope: contrato de QA (references/setup/artefatos.md) — copie a forma, troque os valores. Enums em minúsculo, exceto priority.
  type       ∈ functional · ui · regression · smoke · persona · journey · charter · tour · cfr · integration · security
  priority   ∈ P0 · P1 · P2 · P3
  automation.target ∈ e2e · integration · manual
  automation.status ∈ existing · missing · blocked · na
cases[] lista TODO caso ativo de test-cases/, com o mesmo id, título, prioridade, tipo e automação do arquivo.
total_cases, by_priority e acceptance_criteria_covered são contagens do que está escrito.
Apague este comentário.
-->

# Plano de QA — <WI-ID> · <título>

**Work Item:** <WI-ID> (<tipo>) · **Escopo:** completo | regressão | smoke · **Foco:** <texto ou "—">
**Versão do plano:** <n> · **Escrito em:** <AAAA-MM-DD> · **Modo:** criar | revisar
**Gate 1:** pendente   <!-- sempre `pendente` ao escrever; a thread principal troca para `aprovado em <AAAA-MM-DD>` -->

## Resumo

- **Valor para o usuário:** <um parágrafo em linguagem de usuário: o que o Work Item entrega e a quem>
- **Maior risco para o usuário:** <uma frase: o que pode dar errado para quem usa>
- **Contagens:** personas X · jornadas X · charters X (CFR X · design-check X) · TC X (P0 X · P1 X · P2 X · P3 X)
- **Automação:** e2e X (missing X · existing X · blocked X) · integration X · manual X

## Escopo

**Dentro:** <superfícies, fluxos e critérios que este plano cobre>

**Fora:** <o que fica de fora e por quê — o que a costura exclui, o que o escopo pedido não alcança>

## Fontes

| Fonte      | Caminho                             | Uso                                        |
| ---------- | ----------------------------------- | ------------------------------------------ |
| PRD        | <caminho ou `ausente`>              | critérios de aceite — a régua da cobertura |
| Costura    | <`spec.md` · `plan.md` · `ausente`> | o que o Dev entendeu e o que ficou fora    |
| Fontes de design | <tool · link ou caminho, ou `ausente`> | telas existentes; charter `design-check` |
| Insumos    | <caminhos de `item.md` › Insumos, ou `ausente`> | <o que se usou deles>          |
| Validation | <`qa-report.md` · `ausente`>        | gate técnico antes da execução             |
| Projeto    | <`PROJECT.md` · `ausente`>          | ambiente e comandos                        |

## Personas

Detalhe em [personas.md](personas.md).

| ID     | Nome   | Arquétipo   | Objetivo    | Conta                      | Jornadas   |
| ------ | ------ | ----------- | ----------- | -------------------------- | ---------- |
| PER-01 | <nome> | <arquétipo> | <uma frase> | <anonima · slug do perfil> | J-01, J-02 |

**Não cobertas:** <arquétipo relevante deixado de fora e o motivo, ou "nenhuma">

## Jornadas

| ID   | Jornada (pelo valor) | Persona principal · secundária | Prioridade | Abandono/erro | Cruza fronteira      | Arquivo                         |
| ---- | -------------------- | ------------------------------ | ---------- | ------------- | -------------------- | ------------------------------- |
| J-01 | <verbo + valor>      | PER-01 · PER-02                | P0         | J-01a, J-01b  | <sim: serviço · não> | [J-01](journeys/J-01-<slug>.md) |

## Charters

Ordem de execução — a Fase 2 despacha nesta sequência.

| Ordem | ID    | Missão                               | Persona   | Tour   | Time-box | Prioridade | TC             | Arquivo                           |
| ----- | ----- | ------------------------------------ | --------- | ------ | -------- | ---------- | -------------- | --------------------------------- |
| 1     | CH-01 | <uma frase>                          | PER-01    | <tour> | 60 min   | P0         | TC-FUNC-001, … | [CH-01](charters/CH-01-<slug>.md) |
| …     | CH-NN | CFR — <jornadas>                     | <persona> | —      | 45 min   | P1         | TC-CFR-…       |                                   |
| …     | CH-NN | design-check — <telas> · <protótipo> | <persona> | —      | 30 min   | P1         | TC-UI-…        |                                   |

## Estratégia

- **Como se exercitam as jornadas:** um charter por área de risco, uma persona por sessão, no browser real
  pelo Playwright (MCP ou CLI); os `TC-*` são conferidos dentro do charter que os cita
- **CFR:** <categorias afetadas pelo Work Item e por quê; as não afetadas, com o motivo>
- **Conferência visual:** <telas × protótipo, ou "sem protótipo — fora">
- **Onde termina o simulado:** <integrações reais × mock no ambiente de QA; o que o QA manual não alcança>
- **Automação:** X casos `e2e` + `missing` ficam como pedido de automação E2E; `integration` fica com o Dev;
  `blocked`: <o que bloqueia>

### Suíte smoke

| Ordem | TC   | Jornada | O que prova                            |
| ----- | ---- | ------- | -------------------------------------- |
| 1     | TC-… | J-01    | <entrada alcançável, objetivo visível> |

## Critérios de entrada

- [ ] Validation do Dev com `Status: PASS` no `qa-report.md`
- [ ] App do branch rodando no ambiente local
- [ ] App acessível num ambiente com paridade de produção (auth real, cookies habilitados)
- [ ] Credencial para cada persona que precisa de conta — referência de onde está, nunca o valor
- [ ] Massa de dados que atende as pré-condições das jornadas: <qual>
- [ ] Driver de browser disponível — Playwright MCP headless, ou `playwright-cli` como fallback
- [ ] Com charter `design-check`: fonte de design acessível — o MCP dela, o link ou o arquivo

## Critérios de saída

- **`pass`** — toda jornada `P0` chega ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram
- **`partial`** — caso `P0`/`P1` `blocked` ou charter que não rodou
- **`fail`** — caso `P0` falhou, ou bug `critical`/`high` aberto
- Todo caso `e2e` + `missing`/`blocked` com o pedido de automação registrado

## Cobertura

| Critério | Fonte      | Resumo do critério | TC                          |
| -------- | ---------- | ------------------ | --------------------------- |
| <ID>     | prd · plan | <uma linha>        | TC-FUNC-001, TC-JOURNEY-001 |

**Sem cobertura:** <ID — por quê, um por linha, ou "nada">

## Riscos

| Risco (para o usuário)  | Probabilidade        | Impacto na persona                                                   | Mitigação no plano                 |
| ----------------------- | -------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| <o que pode dar errado> | baixa · média · alta | impede concluir · perde dado · abala confiança · fricção · cosmético | <charter, jornada ou TC que cobre> |

## Perguntas

- 🔴 <bloqueia o plano — o que falta decidir e que TC depende disso>
- 🟡 <o plano assumiu — o que assumiu>
- 🟢 <nota para o produto>

<!-- Sem pergunta: "nada". -->
