# Suíte de regressão

Regressão pergunta: _uma pessoa de verdade, percorrendo hoje as jornadas de valor, ainda chega aonde
queria?_ — não _"os testes passaram?"_. A suíte se monta por **jornadas**; os casos saem delas.

Saída: `test-plans/<suite>-regression.md`, pelo [template](../../templates/plan/regression-suite.md). A suíte
smoke do escopo `completo` vai como seção do test-plan; arquivo próprio só quando o `escopo` é `regressão`
ou `smoke`.

---

## 1. Reteste não é regressão

| | Reteste | Regressão |
| --- | --- | --- |
| Pergunta | o bug corrigido está corrigido? | a mudança quebrou o que não devia? |
| Escopo | o `BUG-N` e a reprodução estreita dele | as jornadas da suíte |
| Quem | `wi-qa-retester`, na Fase 2, a partir dos bugs abertos | os charters e casos da suíte |
| Fica no plano? | não — sai dos bugs abertos em `issues/` | sim |

Depois de um fix, os dois rodam: o reteste fecha o bug, a regressão confere o entorno.

## 2. Os quatro tiers

| Tier         | Para quê                                   | Jornadas                                                              | Duração   |
| ------------ | ------------------------------------------ | --------------------------------------------------------------------- | --------- |
| **smoke**    | o build não quebrou o crítico              | 2 a 4 jornadas `P0`: entrada/login, o verbo do produto, uma recuperação | 15–30 min |
| **targeted** | o que a mudança toca                       | toda jornada que passa pela superfície alterada + as que cruzam fronteira perto dela + **uma** `P0` que não toca a mudança (canário) | 30–60 min |
| **full**     | antes de release                           | todas as `P0` com a persona principal, todas as `P1` com ao menos uma persona, todas as que cruzam fronteira, as categorias de CFR afetadas | 2–4 h     |
| **sanity**   | depois de hotfix                           | a jornada do hotfix — caminho feliz **e** o caminho em que o bug estava — + uma adjacente | 10–15 min |

O `escopo` do briefing escolhe:

| `escopo`     | Tier                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------- |
| `completo`   | `smoke`, como seção do test-plan                                                          |
| `smoke`      | `smoke`, em `smoke-regression.md`                                                         |
| `regressão`  | `targeted` por padrão; `sanity` quando o Work Item é um hotfix; `full` só se o humano pediu release completo |

## 3. Montar

1. **Jornadas de valor** — as do plano ([journeys.md](journeys.md)) e, para o canário e o `full`, as que o
   produto já tinha. Fonte para estas: os planos anteriores em `test-plans/` e o PRD
2. **Priorizar por impacto na persona**, com o mesmo critério dos casos ([test-cases.md](test-cases.md#4-prioridade)):
   `P0` impede concluir ou perde dado; `P1` abala a confiança ou cria fricção repetida, e as jornadas que
   cruzam fronteira perto da mudança; `P2` secundárias, personas de borda; `P3` cosmético
3. **Agrupar por persona × superfície** — para cada combinação relevante, a jornada que melhor a valida.
   Toda persona do plano aparece ao menos uma vez no `full`
4. **Reusar casos.** A suíte referencia `TC-*` existentes. Caso novo só para o que a mudança exige e nenhum
   caso cobre: `TC-REG-*` para jornada não tocada, ou para o bug corrigido que não pode voltar (origem
   `BUG-N`); `TC-SMOKE-*` quando a conferência rápida não é nenhum caso existente
5. **Marcar automação.** Jornada `P0`/`P1` estável e o smoke ⇒ `e2e`; regressão de bug reproduzível pelo
   browser ⇒ `e2e` + `missing` até existir o spec. Exploração, usabilidade, julgamento visual e tecnologia
   assistiva real ⇒ `manual`

## 4. Ordem de execução

1. **Smoke** — falhou, **pare**: o resto da rodada testa um build quebrado. Leve ao humano
2. **Jornadas `P0`** com a persona principal
3. **`P1`, depois `P2`** — registre fricção mesmo quando o objetivo é alcançado
4. **Charters exploratórios** — tours e sessões por persona
5. **CFR** — nas duas jornadas mais usadas ([CFR](../execution/cfr.md))

A ordem dos charters no plano segue esta sequência: é por ela que a Fase 2 despacha.

## 5. Critérios de saída

Batem com o `verdict` do `qa-result`:

| Veredito  | Quando                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------- |
| `fail`    | caso `P0` falhou, ou há bug `critical` ou `high` aberto — jornada `P0` que não chega ao objetivo, perda de dado em qualquer jornada, achado de CFR que inviabiliza a jornada para uma persona |
| `partial` | caso `P0`/`P1` ficou `blocked`, ou charter não rodou — a rodada não tem como afirmar                |
| `pass`    | todas as jornadas `P0` chegam ao objetivo, nenhum bug `critical`/`high` aberto, todos os charters rodaram |

`pass` com fricção ou dano à confiança isolado é aceitável quando cada achado virou bug `medium`/`low` com
o caminho de contorno descrito. Smoke que falha no passo 1 da ordem dá `fail` sem rodar o resto.

## 6. Manter a suíte viva

- Jornada de funcionalidade que não existe mais sai; persona que deixou de ser público sai
- Cada bug corrigido nesta rodada ganha um `TC-REG-*` com origem `BUG-N` na suíte seguinte
- Tempo por passo se ajusta quando a paciência da persona foi estourada
- Não rode a mesma lista toda vez sem revisar o que mudou

## 7. Armadilhas

- **Só caminho feliz** — os caminhos de abandono acham os bugs de maior impacto
- **Pular a regressão "para ganhar tempo"** — é a única defesa contra quebra que ninguém viu
- **Ignorar fricção em jornada `P0`** — fricção repetida vira dano à confiança
- **Massa de dados desatualizada** — a pré-condição da jornada não vale mais e o caso falha pelo motivo
  errado
