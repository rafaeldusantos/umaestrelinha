# Severidade por impacto ao usuário

A severidade de um bug sai do que ele faz com uma pessoa tentando usar o produto, não do que ele faz com a
tecnologia nem do esforço da correção. Uma exceção num painel de administração pode pesar menos que um
botão com o texto errado no checkout.

Cada bug recebe **um** nível de impacto. O nível dá a `severity` e a `priority` do envelope `qa-issue/v1`.

---

## Os cinco níveis

| Nível                     | Quando                                                                                                   | Exemplos                                                                                                                       | `severity` | `priority` |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------- |
| **Bloqueia a conclusão**  | a persona não consegue concluir a jornada: desiste, ou contorna e chega a um estado errado               | botão de enviar não faz nada na única tela de pagamento · login falha com credencial válida · rota da jornada dá 404 sem saída | `critical` | `P0`       |
| **Perda de dados**        | dado que a persona digitou, enviou ou configurou some, corrompe ou fica inacessível sem ela pedir — às vezes sem ela perceber | formulário descarta um campo em silêncio · upload diz "enviado" e o arquivo chega vazio · configuração volta ao padrão ao salvar · "Salvo" e o dado some ao recarregar | `critical` | `P0`       |
| **Dano à confiança**      | nada quebrou de fato, mas a persona passa a duvidar de que pode contar com o produto                     | e-mail diz "Pedido #abc", a tela diz "#xyz" · "Erro inesperado, tente novamente" sem próximo passo · "salvo há -3 min" · duas moedas na mesma tela · leitor de tela anuncia "imagem imagem imagem" | `high`     | `P1`       |
| **Fricção**               | a persona conclui, mas com esforço, confusão ou repetição que não deveria haver                          | redigitar dado já informado · controle só no hover, sem equivalente no toque · 3 s sem retorno ao clicar · "Continuar" abaixo da dobra no celular · validação só no envio | `medium`   | `P2`       |
| **Cosmético**             | visual ou texto que não afeta concluir a jornada nem confiar no produto                                  | erro de digitação num tooltip · ícone 2 px fora do alinhamento · hover num tom fora da marca · capitalização inconsistente numa lista | `low`      | `P3`       |

Perda de dados pesa como bloqueio porque a persona não se recupera do que não percebeu.

## Ajustes

O nível dá o ponto de partida; o contexto do achado move a `severity` **um degrau**, no máximo.

| Nível                | Sobe um degrau quando…                                                 | Desce um degrau quando…                                              |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Bloqueia a conclusão | —                                                                      | a jornada bloqueada é P2/P3 no plano e há outro caminho para o objetivo |
| Perda de dados       | —                                                                      | o dado se recupera de outra fonte sem esforço da persona             |
| Dano à confiança     | —                                                                      | o produto se corrige sozinho, sem a persona fazer nada               |
| Fricção              | acontece numa jornada P0 do plano                                      | —                                                                    |
| Cosmético            | está numa superfície de primeira impressão (home, onboarding, login)   | —                                                                    |

**`priority` acompanha a `severity` final:** `critical` → `P0` · `high` → `P1` · `medium` → `P2` · `low` →
`P3`. Envelope com `severity: high` e `priority: P3` é incoerente.

## Regras de desempate

1. **Na dúvida entre dois níveis, o maior.** O Dev pode rebaixar com argumento; o QA erra para o lado do
   usuário
2. **A persona mais atingida decide.** O mesmo bug que é fricção para o usuário avançado e bloqueio para
   quem usa leitor de tela é **Bloqueia a conclusão**
3. **Fricção que faz a persona abandonar não é fricção** — é Bloqueia a conclusão. A sessão diz se ela
   abandonou ou desistiria (o passo da jornada, a paciência da persona)
4. **Cosmético na superfície de primeira impressão** é no mínimo Fricção quando atrapalha entender o que
   fazer, e Dano à confiança quando parece descuido com a marca
5. **A gravidade que o explorer propôs é insumo, não decisão.** Divergiu, diga no bug por quê
6. **Não infle.** `critical` é para bloqueio e perda de dados. Todo bug `critical` desvaloriza a escala
7. **O esforço do fix não entra.** "É uma linha de CSS" não rebaixa um bloqueio

## Padrões que vão ao relatório, não ao bug

O nível é por bug; o padrão é da rodada. Registre em **Riscos residuais** do `qa-result.md`:

- **Vários Dano à confiança na mesma jornada** — cada um é `high`, e juntos dizem que a jornada não está
  pronta para o usuário
- **Fricção repetida na mesma área** — sinal de redesenho, não de mais um bug
- **Achado `intermitente` sem segunda ocorrência** — não vira bug ([bug-writing.md](bug-writing.md#o-que-não-é-bug)), mas fica
  como risco com o passo e a sessão

## Rollup

| Onde                             | O que conta                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `issues.total` do `qa-result/v1` | os bugs que esta rodada deixa com `status: open` — novos e reabertos                                 |
| `issues.by_severity`             | os mesmos, por `severity`. A soma é igual a `total`, e cada um tem um arquivo `issues/BUG-NNN.md`     |
| corpo do `qa-result.md`          | os mesmos, também por nível de impacto — é o que o produto lê para decidir; a `severity`, o que o Dev lê para priorizar |

Bug `still-open` do reteste não entra no `issues` — não é bug desta rodada —, mas entra no veredito e no
corpo.

## Deduplicação

**Mesmo bug = mesma causa observável:** o mesmo sintoma, no mesmo ponto da jornada (tela, ação, estado de
partida), disparado pelo mesmo gatilho. A causa no código, o triager não vê — não junte por suspeita.

| Situação                                                                     | O que fazer                                                                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| o mesmo sintoma em sessões ou personas diferentes                            | **um** bug, com as ocorrências listadas; a severidade pela persona mais atingida (regra 2)      |
| sintomas diferentes que talvez tenham a mesma origem                          | bugs separados, um citando o outro em **Relacionados**                                          |
| o mesmo sintoma em telas diferentes (o mesmo componente quebrado em três lugares) | um bug, com cada tela como ocorrência — o título diz o componente                           |
| achado do entorno no reteste (`Achados novos no entorno`)                    | trate como achado de sessão: deduplique e tríe igual. **Não** é o bug retestado                  |

**Contra os bugs registrados** (`qa_dir/issues/`) — o mesmo critério, contra o título e os passos dos bugs
já escritos, por esta skill em rodadas anteriores ou pela automação E2E:

| `status` do bug      | O achado da rodada                                                                                                   |
| -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `open` · `still-open` | **não** vira bug novo. Vai aos achados que não viraram bug como `duplicado de BUG-N`; TC que falhou por ele leva `bug_ref: "BUG-N"` |
| `resolved` · `cannot-reproduce` | **reabertura** — ver abaixo                                                                               |

E contra os **descartados**: achado igual a um que um Gate 3 anterior descartou (**Achados que não viraram
bug** de um `qa-result-*.md`, com `descartado no Gate 3`) **não** reabre por conta própria — alguém já
decidiu que não era defeito. Vai aos achados que não viraram bug citando o descarte, e o Gate 3 menciona.

## Reabertura

Um bug `resolved` ou `cannot-reproduce` cujo sintoma voltou numa sessão — o reteste só lê os abertos, então
a reabertura nasce da deduplicação — reabre sob a **mesma identidade**, e quem grava é a thread principal,
no Gate 3. O triager **propõe**:

1. Uma linha na tabela de transições: `BUG-N`, de → `open`, `reabertura`, a sessão e a evidência. O `id` e
   o `title` são os do arquivo, letra por letra — não se cria bug novo, nem se reescreve o título
2. A `severity` reavaliada pelo impacto de agora; não herde a antiga sem conferir
3. O texto da linha do **Histórico**: quando foi resolvido, onde e quando voltou a acontecer, a sessão e a
   evidência
4. Conta em `issues` do `qa-result` (é um bug `open` desta rodada) e aparece no relatório como reaberto,
   separado dos novos

**Nunca reuse número.** Defeito novo é o próximo `BUG-N` livre depois do maior de `issues/`, mesmo que
pareça "continuação" de um bug antigo.
