# Charters exploratórios

Um charter é a missão escrita de uma sessão: _"nos próximos 60 minutos, como esta persona, explore esta
superfície procurando estas falhas"_. É o que separa exploração de clicar a esmo — limita a sessão, força
um foco e produz um log que a triagem consegue usar.

O planner escreve o charter pelo [template](../../templates/plan/charter.md); o `wi-qa-explorer` executa um
por vez e escreve o log pelo [template de sessão](../../templates/execution/session-log.md).

---

## Anatomia

| Parte        | O que é                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------- |
| **Missão**   | uma frase, em termos da persona: o que procurar e por que importa                              |
| **Persona**  | quem você é durante a sessão — uma `PER-NN` de `test-plans/personas.md`                         |
| **Superfície** | a área no escopo, a rota de entrada, e o que fica **fora**                                    |
| **Tour**     | a lente da sessão — exatamente um de [tours.md](tours.md)                                       |
| **Mudança**  | o que o Work Item muda nesta superfície, com os IDs de critério — o resto é **fora**           |
| **Time-box** | 30 · 60 · 90 minutos, teto rígido — para o agent, um orçamento de ações                          |
| **TC**       | os casos `TC-*` que a sessão confere no caminho                                                 |

Missão boa: _"confirmar que quem nunca usou o app consegue se cadastrar pelo celular e chegar ao painel em
menos de 3 minutos"_. Missão ruim: _"testar o cadastro"_.

## Tipos

| Tipo           | O que a sessão faz                                                      | Guia                                 |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `exploratório` | explora a superfície pelo tour, como a persona                          | este arquivo e [tours.md](tours.md)  |
| `cfr`          | refaz jornadas já escolhidas como auditoria das qualidades transversais | [cfr.md](cfr.md)                     |
| `design-check` | confere as telas contra o protótipo do Work Item                        | [design-check.md](design-check.md)   |

O plano tem **um** charter `cfr` e, com protótipo, **um** `design-check`. Os dois não levam tour.

## Quantos charters

Um charter exploratório por **área de risco da mudança** — não por tela que a persona atravessa. O teto sai
do tamanho da costura:

| Work Item                                                        | Exploratórios | Mais                         |
| ---------------------------------------------------------------- | ------------- | ---------------------------- |
| pequeno — ajuste, até ~5 critérios, uma tela                      | até 2         | `cfr` curto · `design-check` |
| médio — até ~12 critérios, poucas telas                           | até 4         | `cfr` · `design-check`       |
| grande — fluxo novo, várias telas ou repositórios                 | até 6         | `cfr` · `design-check`       |

Superfície que a mudança não toca **não** ganha charter, nem quando a jornada passa por ela: o QA real-user
confere a mudança, não audita o app. Precisou de mais charters que o teto, diga por quê no plano.

## Modos do charter exploratório

O tour diz **o quê** procurar; o modo diz **como** conduzir.

| Modo          | Como conduz                                                                              | Use quando                                          | Time-box |
| ------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------- | -------- |
| `com tour`    | segue a lente do tour do começo ao fim                                                   | **padrão** — na dúvida, é este                      | 60       |
| `por técnica` | aplica uma técnica ao longo do tour: valor limite, transição de estado, adivinhação de erro | superfície cheia de entrada ou com estado         | 60       |
| `por cenário` | percorre uma jornada de `test-plans/journeys/` em condições realistas                    | validar uma jornada de ponta a ponta                | 60       |
| `livre`       | improvisa dentro do tour, a partir do que observa                                        | superfície nova, sem edge case conhecido            | 30       |

## Time-box e orçamento

| Box    | Orçamento do agent | Quando                                                                |
| ------ | ------------------ | --------------------------------------------------------------------- |
| 30 min | 25 ações           | superfície nova ou estreita, sanidade                                 |
| 60 min | 50 ações           | o padrão — melhor equilíbrio entre profundidade e cansaço             |
| 90 min | 70 ações           | jornada longa, de muitos passos, ou primeira passada numa área grande |

Minuto não limita um agent; ação limita. **Ação** é cada chamada ao browser — navegar, clicar, digitar,
snapshot, screenshot, evaluate. O `cfr` tem 35; o `design-check`, 25 a 50 conforme o número de telas; a
rodada de confirmação, metade do box. Ler o charter e escrever o log não contam.

O `cfr` tem 45 minutos ([cfr.md](cfr.md#como-rodar)); o `design-check`, 30 a 60 conforme o número de telas.
Mais de 90 minutos é proibido: divida em dois charters. O box acaba quando acaba — achados acumulando no
fim viram sugestão de próximo charter, não extensão da sessão.

## Como conduzir

1. **Prepare.** Leia o charter, a persona, os TC citados e o tour. Confirme o que está fora do escopo
2. **Entre como a persona** pelo [guia de browser](browser.md#login)
3. **Explore pelo tour.** Cada interação responde: _isso importa para o tema deste tour?_ Os itens do tour e
   dos [edge cases](edge-cases.md) são estímulos, não checklist — escolha os que a superfície pede
4. **Confira os TC no caminho**, com veredito e evidência
5. **Registre no momento** — passo, o que tentou, o que viu, screenshot nos pontos que provam. Achado anotado
   depois perde o passo exato
6. **Reproduza** cada achado uma segunda vez, de um estado limpo, antes de registrar

### Status da sessão

| Status    | Quando                                                                                       |
| --------- | -------------------------------------------------------------------------------------------- |
| `done`    | a sessão rodou — com ou sem achado, cobrindo tudo ou não                                     |
| `blocked` | começou e não pôde avançar: credencial que não resolve, massa ausente, ambiente fora do ar   |
| `not-run` | não começou por pré-requisito da sessão: `design-check` sem o MCP da fonte                   |

### Veredito dos TC

| Veredito  | Quando                                                                   |
| --------- | ------------------------------------------------------------------------ |
| `pass`    | o esperado do TC aconteceu, com evidência                                |
| `fail`    | não aconteceu — vira achado, com o TC citado                             |
| `blocked` | a sessão não conseguiu chegar ao passo do TC (credencial, massa, outro bug) |
| `skip`    | o TC está no charter, mas a sessão não chegou nele (orçamento, escopo)  |

## Debrief

Faz parte da sessão, não é opcional — e sai no próprio log:

1. **Pare o relógio.** Nada de "só terminar isto"
2. **Feche os achados** com todos os campos do template
3. **Fora da cobertura** — o que o charter pedia e não foi alcançado, e por quê
4. **Próximo charter** — o que esta sessão mostrou que merece outra sessão
5. **Padrão novo** — se você improvisou um padrão que achou bug (_"duplo clique e recarregar"_), registre: é
   candidato a tour

## Catálogo por superfície

Exemplos para o planner adaptar. Persona por arquétipo (ver [tours.md](tours.md#persona--tour)).

| Superfície        | Charter                                       | Missão                                                                                                       |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cadastro / login  | novo usuário × Feature · 30                   | quem nunca usou consegue se cadastrar no celular (375) e chegar ao painel em 3 minutos, sem ajuda externa    |
| Cadastro / login  | em recuperação × Back-Button · 30                  | quem travou ontem na confirmação de e-mail volta hoje, encontra estado limpo e conclui o cadastro            |
| Checkout          | novo usuário × Money · 60                     | achar qualquer jeito de cobrar duas vezes, criar pedido fantasma ou falhar o pagamento em silêncio           |
| Checkout          | mobile × Network · 60                         | o checkout se recupera quando a conexão cai na confirmação do pagamento                                      |
| Busca / filtro    | ocasional × Garbage · 60                       | termos colados de fora (aspas curvas, tabulação, emoji, texto longo) não falham em silêncio nem corrompem o resultado |
| Busca / filtro    | ocasional (locale ≠ pt-BR) × Locale · 30                 | datas, números e moeda saem no formato do locale, sem quebra de layout                                       |
| Upload            | avançado × Garbage · 60                     | arquivo vazio, enorme, de tipo errado ou com nome estranho nunca dá "sucesso" com o arquivo ausente          |
| Upload            | mobile × Interrupt · 60                       | upload longo interrompido (aba fechada, conexão cortada) não some sem aviso                                  |
| Configurações     | ocasional × Back-Button · 30                   | todo salvar pode ser desfeito pelo voltar sem perder o que a persona digitou                                 |
| Configurações     | avançado × Multi-Tab · 60                   | editar campos diferentes em duas abas e salvar as duas não perde atualização nem mostra estado velho         |
| Edição em massa   | avançado × Garbage · 60                     | colar 200 linhas, desfazer até a metade e editar de novo não corrompe nem aplica pela metade                 |
| Wizard            | ocasional × Back-Button · 60                   | voltar e avançar em cada passo preserva o que foi preenchido e não refaz ação já confirmada                  |

## Anti-padrões

- **Sem missão**, ou missão que é a superfície inteira (_"testar o app"_)
- **Dois tours numa sessão** — dilui os dois. Divida em dois charters
- **Persona de conveniência** — escolher a persona que combina com o que você já queria testar. Escolha a
  persona e deixe ela escolher o teste
- **Deriva** — bug interessante em outra superfície vai para "próximo charter", não para esta sessão
- **Auditoria de caixa-branca** — ler o código, consultar o banco ou medir o DOM para descobrir como a tela
  "deveria" ser. A persona não faz isso, e o que sai daí são perguntas sobre o que ninguém pediu
- **Investigar o `spec-gap`** — descreva e siga. Comportamento sem fonte não é a missão da sessão
- **Pular o debrief** — achado não registrado é achado não encontrado
