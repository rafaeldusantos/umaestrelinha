## 15 · [store] BUG-009 — [Checkout · o valor mudou] Para a convidada, "Confirmar com o novo total" apaga o aviso e pede um código de e-mail sem dizer por quê

**Status:** done

`BUG-009` — 92

**Objetivo.** O bug BUG-009 da rodada 1 da QA deixa de acontecer: o que a tela mostra passa a ser o que o critério de aceite de cada bug diz que é esperado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01", Alias de import, Convenções que valem em todo o repositório, Os guardas, Baselines; `packages/core/CLAUDE.md` (inteiro); `apps/store/CLAUDE.md` › O bloco Compre Junto, O botão único leva o conjunto, Carrinho, chrome e checkout, A sacola v4 e a marca "acompanha", Minha conta e o detalhe do pedido; `.specs/LESSONS.md` › L-013, L-014, L-015. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** as tarefas 01–08 (`done`, commitadas) — o desconto do Compre Junto já está na árvore. Confira que existe antes de começar.

### Critérios de aceite

### BUG-009 — [Checkout · o valor mudou] Para a convidada, "Confirmar com o novo total" apaga o aviso e pede um código de e-mail sem dizer por quê

#### Resumo

Sônia comprava como convidada pela primeira vez. Ao pagar, recebeu o aviso "O valor do seu pedido mudou" e tocou "Confirmar com o novo total". Em vez de seguir para o pagamento, o aviso sumiu e o checkout passou a mostrar "Este e-mail já tem cadastro na loja / Um código foi enviado…". O primeiro pedido tinha criado a conta dela, e nada na tela explica isso nem liga o pedido do código ao novo total.

**Origem:** sessão CH-08 · ambiente local

#### Impacto

- **Nível:** Fricção que sobe um degrau por estar na jornada J-01, que é P0 no plano. O resultado é high
- **Persona mais atingida:** PER-05 Sônia (anônima, primeira compra). Outras: PER-01 Marina (convidada)
- **Jornada e passo:** J-01, passo 6 (pagar), no ramo "o valor mudou"
- **Frequência:** sempre que a convidada passa pelo 422 do valor mudado. Houve 1 ocorrência, mas a evidência é clara: a rede registra `create-order → 409` porque o primeiro pedido criou a conta da convidada
- **Contorno:** achar o código no e-mail, digitar e pagar de novo. Ela fica com dois pedidos pendentes
- **Gravidade proposta na sessão:** medium. Aqui sobe para high: é fricção em jornada P0, no passo de maior ansiedade, com risco de abandono médio a alto

#### Ambiente

- **URL:** http://localhost:8082/checkout
- **Tela:** checkout · **Componente:** aviso "O valor do seu pedido mudou" e o desafio de código
- **Branch / build:** `feature/92`, dev server Vite; painel :8083
- **Browser:** Chromium (Playwright MCP) · **Viewport:** 390 × 844, fonte a 200 %
- **Rede:** local, Mercado Pago com chave inválida · **Idioma:** pt-BR

#### Passos

1. Contexto de navegador novo, anônima, com um e-mail nunca usado (`<novo>@exemplo.com`). Levar o pingente com o QA Berloque Coração pelo bloco, ir ao checkout e preencher como convidada, com PIX
2. No painel (`admin-painel`), baixar o percentual do Berloque na aba Compre junto do pingente e salvar
3. Tocar "Pagar R$ … com PIX". Aparece o aviso "O valor do seu pedido mudou"
4. Tocar "Confirmar com o novo total"

#### Esperado

O pagamento segue com o novo total. Se o código for mesmo necessário, a tela diz que ele é pedido porque o pedido anterior criou a conta, e mantém o novo total à vista.

**Fonte:** `prd.md` CA-04.3 ("no checkout a cliente vê o total novo e confirma a compra outra vez"); `spec.md` D-34 ("Confirmar com o novo total" cria outro pedido); `cfr.md` › Recuperação de erro (próximo passo concreto)

#### Observado

Rede: `checkout?action=create-order → 409`, `auth/v1/otp → 200` e logo `→ 429`. A tela diz "Este e-mail já tem cadastro na loja / Um código foi enviado para … Digite-o para continuar com seus dados salvos.". O aviso do valor some, e o foco fica no `<body>`. Depois do código, o botão volta a "Pagar R$ 323,37 com PIX", o pagamento segue e cria o #0368. Minha conta fica com dois pedidos pendentes: #0367, de R$ 316,87, e #0368, de R$ 323,37.

#### Evidência

- `screenshots/CH-08-05-aviso-valor-mudou-1440.png`: o aviso "O valor do seu pedido mudou"
- `screenshots/CH-08-07-pagamento-falha-390-200.png`: o checkout pedindo o código depois do "Confirmar"

#### Perspectiva da persona

Sônia acabou de aceitar pagar mais e espera ir ao pagamento. A tela troca o aviso por uma mensagem de cadastro que ela não pediu, numa compra sem conta, e o foco cai no `<body>`, então pelo teclado ela não sabe o que mudou na tela. Ela precisa sair da loja, achar o e-mail e voltar.

**Risco de abandono:** médio. Quem não acha o e-mail, ou acha que a loja "perdeu" a compra, desiste. Quem acha o código conclui

#### Relacionados

- **TC:** nenhum. TC-CFR-003 passou, com este achado como ressalva
- **Charter:** CH-08
- **Critério:** CA-04.3
- **Bugs:** nenhum

### Contrato

| Item | Dono | Entra | Sai |
| --- | --- | --- | --- |
| `apps/store/src/features/order-payment/ui/PriceChangedCheckout.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/features/order-payment/ui/PriceChangedContact.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |
| `apps/store/src/pages/CheckoutPage.tsx` — onde o sintoma aparece (localizado pelo planejamento, não diagnosticado) | VOCÊ ALTERA, se a causa estiver aqui | — | — |

Só o que ESTA tarefa cria ou consome. `JÁ EXISTE` é afirmação a conferir no código. A causa é do seu diagnóstico: se ela morar fora destes arquivos, siga até ela e diga no retorno.

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-009 · [Checkout · o valor mudou] Para a convidada, "Confirmar com o novo total" apaga o aviso e pede um código de e-mail sem dizer por quê · high
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA

### Testes

- o comportamento esperado de BUG-009 (a reprodução do bug, que hoje dá o obtido, passa a dar o esperado) — escreva o teste antes do conserto e veja-o reprovar; no nível mais baixo que alcance o defeito (unidade em `core` quando a regra mora lá; componente ou página real quando o defeito é de fiação ou de tela)

### Não faça

- não mude o `status` nem o corpo dos arquivos de `qa/issues/` — reteste e fechamento são da QA
- não corrija outro bug da rodada que não esteja nesta tarefa (BUG-001..013 têm cada um a sua fix task)
- não toque na Adesão por causa da P-01 (`qa/decisoes-produto.md`): o destino é um WI novo
- não altere `packages/core/src/payment/**` sem que o diagnóstico mostre que a causa está lá; se estiver, diga no retorno

### Pronto quando

- [ ] a reprodução de BUG-009 dá o **Esperado** do bug, provado por um teste que reprovou antes do conserto
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
