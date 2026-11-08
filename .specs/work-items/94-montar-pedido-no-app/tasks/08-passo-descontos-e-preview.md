## 08 · [supabase · apps/mobile-adm] App: o passo 3 · Descontos, com o resumo pelo servidor

**Status:** done

`UC-07` — 94

**Objetivo.** A Adri aplica cupom e desconto combinado e vê o resumo vivo com o PIX, calculado pelo servidor com as regras da loja, sem o app ler promoções, cupons nem pedidos.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › Comandos, › Alias de import, › O "defeito 01", › Convenções que valem em todo o repositório, › Os guardas, › Baselines, › CI e deploy; `apps/mobile-adm/CLAUDE.md`; `supabase/CLAUDE.md` › Migrations, › RLS — o molde que os guardas cobram, › Edge functions, › order-proposals e o pedido que nasce de uma proposta, › Secrets; `packages/core/CLAUDE.md` › Quando um código pertence a este pacote, › Pureza, › Os módulos, › Dinheiro, › customers, › proposals, › Convenções de tipo. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Trecho da costura.** §3 · spec.md — Design (Passo 3 · Descontos); §7 · spec.md — Decisões (D-02, D-29). É o rastreio da tarefa até a costura: quem executa abre esta seção quando precisa do contexto que a tarefa não repete.

**Depende de.** 07 (a sacola com peças e variações escolhidas). Confira que existe antes de começar.
**Habilita.** 09 (o resumo do passo 4), 10 (o rascunho guarda cupom e valor do desconto).

### Critérios de aceite

### Passo 3 · Descontos
- Cupom com a regra e os textos da loja, considerando a cliente (`first_order_only`).
- Desconto combinado (R$ ou %) com motivo obrigatório (120, interno). Itens abaixo de R$ 1,00 → "O
  desconto não pode zerar o pedido." e o desconto não entra na conta (o total nunca fica negativo).
- Resumo vivo + "No PIX: … nos itens".

### Design — o que a tela faz

Cupom (maiúsculas, dica "Ex.: SAUDADE10") com "Aplicar" e "A mesma regra do checkout da loja, com o e-mail desta cliente."; com cupom, cartão com código, rótulo ("10% de desconto", "Frete grátis", "5% na primeira compra", "R$ 20 de desconto") e "Remover". Erros: "Digite o código do cupom." · "Cupom não encontrado." · "Este cupom vale só para a primeira compra." · "Este cupom pede o e-mail da cliente." (D-29). "Desconto combinado": interruptor ("O valor que você acertou com ela na conversa."), "Em reais | Em %", valor, "Motivo" (dica "Ex.: segunda peça da família", n/120; "Escreva o motivo — ele fica no histórico." depois da tentativa; "Só para você. A cliente não vê o motivo."); recusa "O desconto não pode zerar o pedido." (itens abaixo de R$ 1,00, ou % ≥ 100), que aparece logo e não entra na conta. "Resumo": "Subtotal · N peças", promoção (−), "Cupom CODIGO" (− ou "frete grátis"), desconto combinado (−), Itens, "No PIX: R$ X nos itens (5% de desconto). Frete à parte." No passo 3 o botão "Continuar" fica ligado: tocar com bloqueio marca a tentativa e só então o motivo ("Escreva o motivo do desconto combinado.") aparece. O desenho não mostra carregando nem erro da validação: enquanto o `preview` está no ar o resumo mantém o último valor e indica que está conferindo; falha de rede é falha, com o resumo anterior.

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `order-proposals?action=preview` | VOCÊ CRIA (`case 'preview'` no `switch` de `handlers.ts:1087-1105`; atualize a mensagem de ação desconhecida, `:1104`, e o comentário de `index.ts:3`) | peças (variação, quantidade, gravação), cupom, desconto combinado, e-mail | `resumo()` (`handlers.ts:448`) ou `{ error, code }` 422 com o texto da loja |
| `precificar` (`handlers.ts:314`) e `resumo` (`:448`) | JÁ EXISTE. Consuma (sem RPC, sem gravar) |  |  |
| `priceProposalDraft`, `PROPOSAL_ZERO_REFUSAL`, limites (`packages/core/src/proposals/`) | JÁ EXISTE. Consuma |  |  |
| `portaDePropostas` (04) | JÁ EXISTE. VOCÊ ACRESCENTA a ação literal `preview` |  |  |

### Decisões já tomadas

- D-02: "Uma ação nova `preview` na `order-proposals` (mesma `precificar` do `save`, `requireAdmin`, sem gravar) que devolve o resumo travável e a recusa do cupom com o texto da loja; o app manda só a escolha (peças, cupom, desconto, e-mail) e nunca lê promoções, cupons nem `orders`. O resumo vivo chama `preview` a cada mudança, com a anterior cancelada."
- D-29: "Sem e-mail, o cupom de primeira compra é recusado no resumo: \"Este cupom pede o e-mail da cliente.\"" — hoje `precificar` só pergunta "já comprou?" com e-mail (`handlers.ts:423`).

### Siga a forma de

| O que você vai escrever | Imite |
| ----------------------- | ----- |
| Ação nova na function | `supabase/functions/order-proposals/handlers.ts › note` |

### Testes

- Unidade (functions): `preview` recusa sem papel antes de ler qualquer coisa e não chama RPC nem grava.
- Unidade (functions): `preview` devolve o mesmo resumo que o `save` gravaria; a recusa do cupom com o texto da loja (primeira compra por e-mail; sem e-mail, "Este cupom pede o e-mail da cliente.").
- Página real (app): aplicar e remover cupom; o desconto combinado em R$ e em %, com motivo obrigatório depois da tentativa; "O desconto não pode zerar o pedido." sem entrar na conta; o resumo vivo cancela a chamada anterior a cada mudança; a linha do PIX.
- Client real (app): conta sem papel no `preview` ⇒ a recusa.
- Guardas: `escritaSoPelaPorta` com a ação `preview`; nenhum `from('promotions'|'coupons'|'orders')` no app (`leituraSoComPapel`/`regraDePedidoSoNoCore`).

### Obrigações

- Toda function do app por uma porta com nome literal por ação; recusa só pelo `42501` de `conferirPapel`; rede é falha, nunca recusa.
- Toda leitura do app por `lerComPapel`.
- Tom memorial (sem emoji, sem `!` nos literais do app, sem urgência) e `motion-reduce:` na mesma linha de toda animação.
- Prova de layout é de navegador (jsdom devolve 0): alvo de 44 px e `body` sem rolagem lateral se conferem na QA, não aqui.
- O gate inclui as suítes da loja e do painel (os guardas de lá varrem `apps/**`).
- `index.ts` da function só wiring (`AD-004`).

### Não faça

- Não leia promoções, cupons nem pedidos no app.
- Não grave nada (o `save` é da 09).
- Não guarde o motivo do desconto em storage.

### Pronto quando

- [ ] o resumo do passo 3 vem do `preview`, com cupom, desconto combinado e PIX
- [ ] as recusas têm o texto da loja e não entram na conta
- [ ] cada comportamento do bloco `Testes` coberto por um teste que você escreveu
- [ ] testes dos arquivos que você alterou, passando — só deles
- [ ] a verificação mínima de fechar unidade de trabalho do arquivo de instruções de cada repositório (e a seção Comandos de verificação do `.specs/project/PROJECT.md`)

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
