# O ciclo vermelho → verde

Adaptado da skill `tdd` de Matt Pocock (github.com/mattpocock/skills), com uma diferença que muda o uso:
aqui os seams já vieram acordados no bloco `Testes` da tarefa. Não há negociação de fronteira com o
humano — há o nível declarado, que se respeita

Toda seção aqui vale em toda fatia. Consulte antes e durante o ciclo, não depois

---

## O que é um bom teste

Teste verifica **comportamento através da interface pública**, nunca detalhe de implementação. O código
pode mudar por inteiro; o teste não devia. Um bom teste se lê como especificação — "profissional
navega para o ciclo anterior" diz que capacidade existe — e sobrevive a refatoração porque não sabe nada
da estrutura interna

O vocabulário vem do domínio: os nomes que o arquivo de instruções e o código do repositório usam, e os que o
critério de aceite usa. Teste que inventa vocabulário próprio deixa de ser especificação

**O nome do teste descreve o comportamento, nunca o identificador do processo.** "rejeita e-mail já usado
por membro ativo", e não `VOLU-70 (a)`, `C-08`, `UC-03` nem `TSHOOK-04`: a chave do Work Item e o número do
critério mudam de sentido quando o Work Item fecha, e o teste fica. A rastreabilidade entre teste e critério
mora no relatório da tarefa (`Fatias`) e nos artefatos do Work Item, que continuam citando os
identificadores — a regra é do teste no repositório, não deles

**O valor esperado vem de fonte independente** — o critério de aceite, um literal conhecido, um exemplo
trabalhado à mão. Nunca do mesmo cálculo que o código faz

## Seams — onde o teste mora

Um **seam** é a fronteira pública onde você observa comportamento sem alcançar o interior. Teste mora no
seam, nunca contra o interno

O bloco `Testes` da tarefa nomeia o comportamento e o nível dele — domínio, aplicação, integração,
frontend. **Esse par é o seam, e ele já está acordado.** Nível declarado não se troca por conveniência, e
comportamento que não está no bloco não ganha teste novo por iniciativa sua: se ele devia estar lá e não
está, isso é achado para o retorno, não trabalho a mais na fatia

**O que só a execução prova se prova executando.** O que mora fora do código da linguagem — query,
procedure, view, constraint, permissão ou policy do banco, trigger, mapeamento do ORM, mensagem num broker,
chave num cache, chamada a um serviço que tem emulador — não tem resultado que se trace lendo o código com
confiança: fixture montada pelo que você acha que a query devolve é o mesmo cálculo da implementação feito
de cabeça — tautológico, com o agravante de nunca ter rodado. Com ambiente local declarado, o nível desses
comportamentos é **integração no ambiente local**: aplique a mudança de schema nele, pela ferramenta do
projeto, e assere contra a resposta real. Vale tanto para o ambiente já de pé (container, `docker compose`,
emulador) quanto para o que o próprio teste sobe e derruba (Testcontainers, banco em memória, servidor
embutido). Sem ambiente local, o teste com o lado externo traçado à mão ainda serve — mas diga no retorno
o que ficou sem execução, para a revisão e a Validation saberem

## Anti-padrões

- **Acoplado à implementação** — mocka colaborador interno, testa método privado, ou verifica por canal
  lateral (consulta o banco em vez de usar a interface). O sinal: o teste quebra na refatoração sem o
  comportamento ter mudado

- **Tautológico** — a asserção recalcula o esperado do mesmo jeito que o código (`assertThat(soma(a, b))
.isEqualTo(a + b)`, snapshot derivado à mão pela mesma regra, constante comparada consigo mesma). Passa
  por construção, e nunca vai discordar do código

- **Fatiamento horizontal** — todos os testes primeiro, toda a implementação depois. Teste escrito em lote
  verifica comportamento _imaginado_: você testa a forma das coisas em vez do que o usuário faz, o teste
  fica insensível a mudança real, e você se compromete com a estrutura antes de entender a implementação.
  Fatie **vertical**: um teste → uma implementação → repete, cada fatia respondendo ao que a anterior
  ensinou

- **Mock do que é seu** — mock existe para a fronteira externa e para o que é lento. Colaborador do
  próprio módulo se usa de verdade

## Regras do ciclo

- **Vermelho antes de verde.** O teste falha primeiro, e só então entra a implementação mínima que o
  passa. Não antecipe o próximo teste, não adicione comportamento especulativo

- **Uma fatia por vez.** Um seam, um teste, uma implementação mínima por ciclo

- **Ver o vermelho é parte do ciclo.** Teste que passou de primeira não provou nada: ou o comportamento já
  existia, ou a asserção não morde. Descubra qual dos dois antes de seguir — pelo **check de mutação** da
  seção abaixo, quando o teste é unitário ou de domínio

- **Refatoração não é do ciclo.** Ela pertence à revisão, e nesta skill a revisão é a do subagent
  `wi-impl-review`, depois das fatias — nunca no meio do vermelho → verde

## Fatia que passou de primeira não é fatia verificada

Fatia cujo comportamento **já existe** nunca passa pelo vermelho, e aí o verde não informa nada: pode ser
asserção que morde num comportamento pré-existente, ou asserção que não morde em nada. O verde é o mesmo
nos dois casos, e é o segundo que passa a fila inteira acreditando em teste vazio

**O check de mutação, em toda fatia de teste unitário ou de domínio que passou de primeira** — é ali que
ele é barato:

1. Copie o arquivo da implementação para fora do repositório. Depois quebre de propósito o que o teste
   diz cobrir — inverta a condição, remova a transformação, devolva o valor errado. Uma mutação só, a mais
   direta
2. Rode o teste daquela fatia. **Vermelho é o resultado esperado**, e é ele que prova que a asserção morde
   naquele ponto
3. Restaure a implementação **pela cópia**, confira com `cmp` que o arquivo voltou byte a byte, e rode de
   novo, para voltar ao verde. Restaurar é parte do check, não epílogo. **Nunca restaure pelo Git**:
   `checkout` e `restore` devolvem o arquivo ao último commit e apagam junto o que a fila escreveu nele
4. **Relate o resultado**, sempre — inclusive quando confirmou. Ficou verde com a implementação quebrada,
   a asserção não verifica o que você pensava: ou ela morde em outro lugar, ou o comportamento vem de onde
   você não olhou, e as duas coisas são achado

**Teste que sobe infraestrutura — banco, container, servidor, navegador — não leva o check.** Cada rodada
a mais é infraestrutura subindo de novo, e a fila inteira paga. Registre em `Divergências e descobertas`
que a fatia passou de primeira sem check, nomeando o teste: a revisão adversarial lê aquela asserção
sabendo que ninguém viu o vermelho. Ler a asserção contra o critério de aceite, e o caso irmão abaixo,
continuam valendo — não custam execução

> Um caso real deste check, e do tipo que nenhuma outra etapa acharia: a case-insensitivity do e-mail não vinha
> do `@Transform` do DTO, e sim de o schema declarar a coluna `COLLATE NOCASE` — a garantia de um critério
> de aceite estava **repartida** entre schema e DTO, e remover qualquer um dos dois quebrava uma metade
> diferente. Sem o check, a fila seguiria acreditando que o DTO sozinho a sustentava.

**O caso irmão: asserção que lê pela mesma reprojeção que a implementação faz.** Ela não pode discordar do
código — passa por construção, exatamente como o tautológico dos Anti-padrões, mas é mais difícil de ver
porque a reprojeção mora na ferramenta de teste, e não no seu código. O caso concreto: comparar texto
renderizado pelo matcher default da Testing Library, que **colapsa espaço em branco antes de comparar** —
um comportamento de "nome com espaços múltiplos" passa por construção, com ou sem implementação.
**Assere do outro lado da transformação**: desligue a normalização (`normalizer` identidade,
`normalizeWhitespace: false`), compare o valor cru, ou pegue o dado antes de a reprojeção acontecer

Os dois pertencem ao mesmo parágrafo porque são as duas formas de teste que passa sem verificar.
