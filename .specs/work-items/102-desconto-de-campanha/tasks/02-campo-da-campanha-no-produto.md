## 02 · [apps/backoffice] Produto · aba Preço e estoque — o campo da campanha

**Status:** done

`UC-03` — 102

**Objetivo.** Na aba de preço da peça, a dona escolhe o percentual dela em cada campanha agendada ou em vigência e vê o preço resultante por variação.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/backoffice/CLAUDE.md` › Molde dos formulários · Descontos. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Painel · Produto · campo da campanha); §7 · spec.md — Decisões.

**Depende de.** 01 — `apps/backoffice/src/entities/campaign/` (as campanhas agendadas ou em vigência na ordem do início e a porta de escrita das marcações) e `packages/core/src/campaigns/` (preço de campanha, estado, conversão do fim). Confira que existem antes de começar.

### Critérios de aceite

### UC-03 · Marcar a peça
- Em `/admin/produtos`, na aba de preço da peça, aparece um campo por campanha **agendada ou em vigência**, na ordem do
  início, cada um com a sua vigência no rótulo: "Black Friday (13/11 a 30/11): Nenhum · 10% · 15% · 20%", com a prévia do preço
  ("R$ 209,90 → R$ 167,92").
- Vale para todas as variações da peça, cada uma sobre o próprio preço.
- Sem campanha agendada ou em vigência, o campo não aparece.

- **RN-01 · A campanha é um cadastro, e a peça aponta para ela.** Uma tabela de campanhas (nome, texto do selo,
  início, fim, interruptor, percentuais) e a marcação da peça (peça, campanha, percentual), com chave por peça e
  campanha. O percentual marcado tem de ser um dos da campanha (conferido no banco, não só na tela). O preço
  cadastrado (`price`, `compare_price`) **nunca** é alterado pela campanha.

- **RN-06 · Desconto não soma com o "de/por".** Peça com `compare_price` maior que o preço: o preço cheio é o
  `compare_price`; o cobrado é o **menor** entre o preço de hoje e o cheio com o desconto da campanha. Nunca os dois
  descontos multiplicados. O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15%
  sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.

- **CA-01** Cadastrar "Black Friday", 13/11 00:00 a 30/11 23:59, percentuais 10, 15, 20, ligada ⇒ a lista mostra
  "Em vigência"; o cadastro da peça mostra "Black Friday: Nenhum · 10% · 15% · 20%".

- **CA-05** Peça com variações de preços diferentes: cada variação aparece e é cobrada com o percentual sobre o
  próprio preço.

- **CA-06** Peça com `compare_price` R$ 259,90 e preço R$ 239,90, marcada com 10%: cobra R$ 233,91 (o menor), "de"
  R$ 259,90; nunca R$ 215,91.

- **CA-07** Tirar da campanha (ou encerrar a campanha) devolve o preço de sempre em todas as superfícies, e
  `price`/`compare_price` no banco são os mesmos de antes.

### Design — o que a tela faz

Aba **Preço e estoque**, abaixo do cartão Preço. Um cartão por campanha agendada ou em vigência, na ordem do início: cabeçalho com nome, pílula do estado e vigência ("13/11 a 30/11/2026", quebrando se precisar); texto "Desconto desta peça na campanha. Vale para todas as variações."; grupo de escolha única com nome acessível "Desconto na {nome}": "Nenhum · 10% · 15% · 20%" (botões ≥ 64 px de largura, números em negrito, alvo 44 px). Com percentual: preço base riscado → preço com desconto + o selo em linha da campanha (prévia com as cores dela); tabela "Variação / Preço / Na campanha" (coluna Preço some abaixo de 1024 px). Notas literais: em vigência "A loja mostra este preço até 30/11 às 23:59. O preço cadastrado não muda, e cupom não vale nesta peça durante a campanha."; agendada "A loja mostra este preço a partir de 01/12. O preço cadastrado não muda, e cupom não vale nesta peça durante a campanha."; Nenhum "Sem desconto: a peça fica fora da vitrine /ofertas e sem selo." Sem campanha agendada ou em vigência, nenhum cartão.

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| cartão(ões) da campanha na aba de preço | VOCÊ CRIA | as campanhas e a marcação atual da peça | a escolha, gravada pela porta |
| leitura e porta de escrita em `apps/backoffice/src/entities/campaign/` | JÁ EXISTE (tarefa 01). Consuma; não altere. | `(productIds[], campaignId, percent \| null)` | — |
| selo em linha do painel em `apps/backoffice/src/entities/campaign/ui/` | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |
| `packages/core/src/campaigns/` (preço, estado, fim) | JÁ EXISTE (tarefa 01). Consuma; não altere. | | |

### Decisões já tomadas

- H-10: mais de uma campanha ⇒ um cartão por campanha, na ordem do início.
- H-09: o campo é o cartão do design (nome, pílula de estado, vigência, notas, prévia com selo e tabela por variação).
- H-04: a data mostrada do fim é o último minuto que vale (`ends_at` − 1 min), pela conversão de `core/campaigns`.
- T17: o preço de cada variação é `product_variants.price` (e `compare_price` como "de"); da peça sem variação, `products.base_price`/`original_price`.
- A marcação grava junto com o Salvar do formulário (barra "Alterações não salvas"), pela porta da tarefa 01.

### Siga a forma de

| O que você vai escrever | Imite |
| --- | --- |
| cartão na aba de preço | `apps/backoffice/src/features/product-form/ui/tabs/PricingTab.tsx` |
| gravação de vínculo do produto junto do Salvar | o fornecedor da peça (feature 80): `persistSupplier` em `apps/backoffice/src/features/product-form` |

### Testes

- Página real do formulário (jsdom): sem campanha, nenhum cartão; com uma em vigência e uma agendada, dois cartões na ordem do início, cada um com a sua nota.
- Escolher 20% numa peça de R$ 209,90 mostra R$ 167,92 e a tabela por variação com cada preço; com "de" R$ 259,90 e preço R$ 239,90 e 10%, R$ 233,91.
- Salvar grava a marcação pela porta (asserção sobre a chamada com a campanha e o percentual) e "Nenhum" tira a peça.
- Probe da gravação (`AD-012`) contra o banco local.

### Obrigações

- `animacaoRespeitaMovimento.test.ts` (escopo literal): acrescente os arquivos de UI novos desta tarefa, com as âncoras subindo junto — nesta onda só esta tarefa edita esse guarda.
- Alvo de 44 px; o selo da prévia por `style` inline com as cores da campanha.

### Não faça

- Lista de produtos, filtro ou edição em massa (tarefa 03); o selo da loja (tarefa 04); qualquer mudança em `entities/campaign` ou em `core/campaigns` (tarefa 01).

### Pronto quando

- [ ] UC-03 e CA-01 (o campo com "Nenhum · 10% · 15% · 20%") provados pela página real
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório

---

### Confira cada citação desta tarefa quando for usá-la

Todo `caminho:linha` daqui — `Siga a forma de`, `Contrato`, `Obrigações`, `Design` — foi
escrito antes de qualquer tarefa rodar, e as tarefas anteriores mexeram na mesma árvore. Abra
cada um no momento em que ele é usado — o exemplar antes de escrever o artefato, o contrato
quando a fatia o consome —, e nenhuma linha se escreve apoiada em citação não conferida: a
linha deslocou, relocalize pelo alvo que a citação nomeia e siga, registrando no retorno; o
arquivo não está mais lá, é `citação morta` — a regra abaixo manda concluir e propagar sempre
que dê para concluir, e o histórico do Git ainda serve de exemplar.

### Se algo aqui não bater com o repositório

A rota `JÁ EXISTE` não está lá, o exemplar sumiu, a tabela tem outra forma. Dá para concluir
mesmo assim: siga, feche e propague. Não dá: pare e relate até onde chegou. Não conserte
contrato por conta, não improvise, não crie o que era de outra tarefa.

**Propagar** é corrigir, nos arquivos seguintes de `tasks/`, cada afirmação que a sua descoberta
tornou falsa — só a afirmação, e nada mais do arquivo. Feito isso, a divergência está resolvida:
ela vai no seu retorno como registro, não como pendência para alguém decidir.

**Propagar é só para frente.** Afirmação de tarefa de número MENOR, já fechada, que a sua
mudança tornou falsa **não se reescreve**: reescrever o `Pronto quando` de tarefa encerrada
apaga o registro do que de fato foi verificado quando ela fechou. Registre a caducidade na
linha `Caducou` do seu retorno — a tarefa, a afirmação e o que a tornou falsa — e siga.

### Se a verificação não fechar

Leia o erro, corrija, rode de novo. Continuando sem passar, não declare pronto: relate o que
falha, com a saída. Nunca desative teste, marque skip, afrouxe asserção, ignore lint ou
silencie erro de tipo.

### O que devolver no fim

```
Tarefa: <nn>
Caso: fechou limpo | fechou com divergência | parou
Instruções lidas: <os caminhos, raiz e módulos>
Testes escritos: <um por comportamento do bloco `Testes`, com o arquivo; o que ficou sem
  cobertura, e por quê>
Verificações: <o que rodou, e o resultado>
Árvore de trabalho: <o que você alterou; nada é commitado por você>
Citações conferidas: <quantas você abriu ao usá-las; a que deslocou, e a que estava morta>
Propagado: <a tarefa, e o que você corrigiu no arquivo dela>   (só se houve divergência)
Caducou: <tarefa já fechada · a afirmação dela que ficou falsa · o que a tornou falsa>
                                                               (só se houve; não se reescreve)
Bloqueio: <motivo · até onde você chegou>                      (só se parou)
```
