# Reteste — <WI-ID>

<!--
Um arquivo por rodada: retest.md em qa_dir. Quem lê é o wi-qa-triager, que propõe a transição de status;
quem a grava no arquivo do bug é a thread principal, no Gate 3 — o retester não toca em issues/. ID e título
vêm do arquivo do bug, letra por letra. Toda seção é obrigatória; sem conteúdo, `nada`. Nunca escreva aqui
credencial, token ou dado pessoal. Apague este comentário.
-->

| Campo     | Valor                                                                     |
| --------- | ------------------------------------------------------------------------- |
| Rodada    | <data> · início <hh:mm> · fim <hh:mm>                                     |
| Ambiente  | <URL> · build <versão visível, ou `não exposto`> · <engine do browser>    |
| Bugs lidos | X de `issues/` com status `open` ou `still-open`                          |

Contagem: resolved X · still-open X · cannot-reproduce X · blocked X

## BUG-NNN · <título do arquivo do bug, copiado>

| Campo       | Valor                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Resultado   | resolved · still-open · cannot-reproduce · blocked                     |
| Persona     | PER-NN <nome> · conta: <perfil — a referência, nunca o valor>          |
| Passos de   | `issues/BUG-NNN.md`                                                    |
| Tentativas  | 2 · <N>                                                                |
| Viewport    | <largura × altura>                                                     |

**Passos seguidos** — de um estado limpo, como estão no bug:

1. <passo>
2. <passo onde o bug acontecia>

**Esperado:** <o esperado do bug>

**Observado:** <o que aconteceu nas tentativas. `still-open` que acontece de outro jeito: descreva o jeito novo.>

**Entorno:**

| Onde                         | Resultado          | Nota                         |
| ---------------------------- | ------------------ | ---------------------------- |
| Passo anterior da jornada    | ok · quebra (N-1)  |                              |
| Passo seguinte da jornada    | ok · quebra (N-1)  |                              |
| Mesma ação com outro dado    | ok · quebra (N-1)  | <o dado usado>               |

**Evidência:**

- `screenshots/retest-BUG-NNN.png` — <o que a imagem prova>
- console: <`…` · `nada`> · rede: <`… → status` · `nada`>

**Por quê:** <só em `cannot-reproduce` e `blocked`: onde os passos não levaram, ou o que impediu — credencial, massa, ambiente>

## Achados novos no entorno

<!-- Quebra nova perto do fix não é o bug antigo. Um bloco por achado; sem achado, `nada`. -->

### N-1 · <[Superfície] o que quebra — para quem>

| Campo               | Valor                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Perto de            | BUG-NNN                                                               |
| Persona             | PER-NN <nome>                                                         |
| Jornada e passo     | J-NN, passo N (<verbo>)                                               |
| Gravidade proposta  | critical · high · medium · low — <o impacto na persona>               |
| Reproduziu          | sim (2 de 2) · intermitente (1 de 2)                                  |

**Passos para reproduzir** — de um estado limpo:

1. <passo>

**Esperado:** <comportamento certo> — **fonte:** <PRD §… · TC-… · protótipo>

**Observado:** <o que a persona viu>

**Evidência:** `screenshots/retest-BUG-NNN-<slug>.png` — <o que prova>
