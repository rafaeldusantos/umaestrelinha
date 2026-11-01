```json
{
  "schema": "qa-issue/v1",
  "id": "BUG-NNN",
  "title": "[Superfície] o que quebra — para quem",
  "severity": "critical | high | medium | low",
  "priority": "P0 | P1 | P2 | P3",
  "type": "functional | ui | regression | smoke | persona | journey | charter | tour | cfr | integration | security",
  "status": "open | still-open | resolved | cannot-reproduce",
  "tc_ref": "TC-…"
}
```

<!--
  Envelope: um valor por campo — as listas acima são os enums de qa-issue/v1. Sem TC, remova "tc_ref".
  Quem usa este template é o triager, só para bug novo: "status": "open". Bug existente não se reescreve:
  reteste e reabertura mudam o "status" e acrescentam uma linha ao Histórico — quem grava é a thread
  principal, no Gate 3. "id" e "title" nunca mudam depois do Gate 3 que registrou o bug.
  Como preencher: references/triage/severity.md e references/triage/bug-writing.md. Apague este comentário.
-->

# BUG-NNN · [Superfície] o que quebra — para quem

## Resumo

<Um parágrafo do ponto de vista da persona: o que ela tentou, o que viu, o que esperava.>

**Origem:** sessão CH-NN · reteste · e2e · <ambiente>

## Impacto

- **Nível:** Bloqueia a conclusão | Perda de dados | Dano à confiança | Fricção | Cosmético
- **Persona mais atingida:** <persona de personas.md> — outras: <ou `nenhuma`>
- **Jornada e passo:** <jornada>, passo N (<verbo>)
- **Frequência:** sempre | às vezes | rara
- **Contorno:** <como a persona contorna, ou `nenhum`>
- **Gravidade proposta na sessão:** <critical · high · medium · low> — <por que divergiu, ou `mantida`>

## Ambiente

- **URL:** <página onde acontece>
- **Tela:** <o nome da tela, como o usuário a chama> · **Componente:** <a parte da tela onde quebra, como o
  usuário a vê — formulário de endereço, modal de confirmação, tabela de pedidos>
- **Branch / build:** <o que a rodada testou>
- **Browser:** <nome e versão> · **Viewport:** <largura × altura>
- **Rede:** <perfil> · **Idioma:** <pt-BR · …>

## Passos

1. <Estado limpo: com qual persona, em qual conta, partindo de onde>
2. <Ação em linguagem de usuário>
3. <O passo onde quebra>

## Esperado

<O comportamento certo.>

**Fonte:** <PRD §… · critério P1-AC03 · C-02 · TC-… · protótipo, tela …>

## Observado

<O que a persona viu, ouviu ou deixou de ver. Mensagem de erro copiada exata.>

## Evidência

- `screenshots/<arquivo>.png` — <o que a imagem prova>

## Ocorrências

<!-- Só com mais de uma ocorrência. Senão, remova a seção. -->

| Sessão | Persona | Passo | Evidência       |
| ------ | ------- | ----- | --------------- |
| CH-NN  |         |       | `screenshots/…` |

## Design × implementado

<!-- Só em bug visual do design-check. Senão, remova a seção. -->

| Propriedade | Protótipo | Observado | Confere   |
| ----------- | --------- | --------- | --------- |
|             |           |           | sim · não |

## Perspectiva da persona

<!-- Só em bug de Fricção. Senão, remova a seção. -->

<Por que essa fricção custa caro para esta persona, neste momento da jornada.>

**Risco de abandono:** alto | médio | baixo — <a razão>

## Relacionados

- **TC:** <TC-… ou `nenhum`>
- **Charter:** <CH-NN>
- **Critério:** <ID da fonte, ou `nenhum`>
- **Protótipo:** <fonte e tela, quando visual>
- **Bugs:** <BUG-N ligados, ou `nenhum`>

## Histórico

<!-- Bug novo: remova a seção. A thread principal a cria e acrescenta uma linha a cada transição gravada
no Gate 3. -->

| Rodada | Status                                                                 | O que se viu        | Evidência                        |
| ------ | ---------------------------------------------------------------------- | ------------------- | -------------------------------- |
| <data> | open → resolved · open → still-open · open → cannot-reproduce · resolved → open | <reteste ou sessão> | `screenshots/retest-BUG-NNN.png` |
