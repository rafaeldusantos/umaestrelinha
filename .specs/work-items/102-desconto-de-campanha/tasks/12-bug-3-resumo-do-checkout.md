## 12 · [apps/store] BUG-003 — [Checkout] Resumo sem a linha “Desconto de campanha” e com subtotal diferente do pedido

**Status:** done

`BUG-003` — 102 · fix task da QA, rodada 1 (`qa/qa-result.md`, lote L3)

**Objetivo.** O resumo do checkout mostra a linha "Desconto de campanha" e o mesmo subtotal do pedido gravado.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas · Baselines · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` (tokens, página do produto, carrinho, checkout); `DESIGN.md`. Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a divergência vai no retorno.

**Depende de.** 11 — o preço de tabela e o de campanha por linha corrigidos (a linha do resumo lê os dois). Confira que a 11 está `done` antes de começar.

**Onde mora.** Checkout · resumo do pedido (`apps/store/src/features/checkout/ui/OrderSummary.tsx`, totais em `apps/store/src/features/checkout/model/useCheckoutTotals.ts`); a linha do pedido/e-mail vem de `packages/core/src/orders/summary.ts`. Localização feita só para saber onde o bug mora — a causa é do diagnóstico de quem executa.

### Critérios de aceite

### BUG-003 — [Checkout] Resumo sem a linha “Desconto de campanha” e com subtotal diferente do pedido

#### Resumo

A cliente leva uma peça em oferta e uma comum ao checkout e confere o resumo antes de pagar. O resumo lista o cupom e
o desconto do PIX, mas não o desconto da campanha, e mostra "Subtotal R$ 648,00". Depois de pagar, a página do pedido
mostra "Subtotal R$ 725,00 · Desconto de campanha −R$ 77,00". O total é o mesmo, mas o desconto da campanha que ela
aceitou só aparece como linha depois, e os subtotais das duas telas não batem.

**Origem:** sessão CH-04 · loja local do worktree `store__feature-102`

#### Impacto

- **Nível:** Dano à confiança
- **Persona mais atingida:** PER-03 Helena (confere o total antes de pagar e desconfia de desconto que some) — outras:
  nenhuma
- **Jornada e passo:** J-04, passo 5 (conferir o checkout) e passo 6 (o pedido)
- **Frequência:** sempre — 2 de 2 (M-A + M-E + `QA10`; M-A + `QAFRETE`)
- **Contorno:** nenhum; o desconto aparece só no "de/por" do item
- **Gravidade proposta na sessão:** medium — **subiu para high**: a divergência é entre o checkout e o pedido gravado,
  no ponto da jornada que a Helena mais vigia (o desconto de campanha some do resumo onde ela confere os descontos e
  reaparece depois, com outro subtotal). Na dúvida entre dois níveis, o maior

#### Ambiente

- **URL:** `http://localhost:8092/checkout` e `http://localhost:8092/pedido/:id`
- **Tela:** Checkout · **Componente:** resumo do pedido ("Seu pedido")
- **Branch / build:** `feature/102`, HEAD `a1c6ea53`, Vite de dev do worktree
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewport:** 1440 × 900
- **Rede:** local, sem limitação · **Idioma:** pt-BR

#### Passos

1. Sem login, com a sacola vazia e a "Black Friday" em vigência, abrir em 1440 × 900 a peça
   `http://localhost:8092/produtos/pulseira-afetiva-com-leite-materno-em-prata-925` (20 % na campanha) e acrescentá-la
   à sacola
2. Acrescentar `http://localhost:8092/produtos/pulseira-afetiva-oval-com-leite-materno-em-prata-925` (peça comum) e
   aplicar o cupom `QA10`
3. Tocar em "Finalizar Pedido" e ler o resumo "Seu pedido" do checkout
4. Preencher como convidada, escolher PIX, pagar e abrir `/pedido/:id`

#### Esperado

O resumo do checkout tem a linha "Desconto de campanha", como o pedido, e os dois mostram o mesmo subtotal e o mesmo
total.

**Fonte:** TC-FUNC-005 passo 3; PRD CA-13, UC-05; `spec.md` I-06 ("O resumo do pedido tem a linha genérica
'Desconto de campanha'")

#### Observado

- Checkout: "Subtotal R$ 648,00 · Cupom QA10 −R$ 34,00 · Desconto PIX (7%) −R$ 42,98 · Frete … · Total R$ 590,92",
  sem linha de campanha (o desconto aparece só no "de R$ 385,00 por R$ 308,00" do item)
- Pedido #0603: "Subtotal R$ 725,00 · Desconto de campanha −R$ 77,00 · Cupom QA10 −R$ 34,00 · Desconto PIX −R$ 42,98 ·
  Frete R$ 19,90 · Total R$ 590,92"
- Segunda ocorrência: checkout com M-A + `QAFRETE`, "Subtotal R$ 308,00 · PIX −R$ 21,56 · Frete Grátis · Total
  R$ 286,44", também sem a linha

#### Evidência

- `screenshots/CH-04-05-checkout-resumo-1440.png` — o resumo do checkout sem a linha de campanha
- `screenshots/CH-04-06-pedido-0603.png` — o pedido com a linha "Desconto de campanha" e o subtotal de tabela
- `screenshots/CH-04-10-checkout-qafrete-1440.png` — a segunda ocorrência no checkout

#### Relacionados

- **TC:** TC-FUNC-005 (passo 3)
- **Charter:** CH-04
- **Critério:** CA-13, CA-03
- **Protótipo:** —
- **Bugs:** nenhum

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-003 · [Checkout] Resumo sem a linha “Desconto de campanha” e com subtotal diferente do pedido · high
- **Fechamento**: a tarefa fecha com o fix do bug; o bug segue `open` até o reteste do QA
- `spec.md` I-06: o resumo traz a linha genérica "Desconto de campanha" — no pedido (`/pedido/:id`), no e-mail **e no checkout**; o subtotal é o preço de tabela e a linha da campanha desconta a diferença, como o pedido gravado já mostra (Subtotal R$ 725,00 · Desconto de campanha −R$ 77,00). O total já bate: o conserto é de apresentação, sem mudar o valor cobrado.
- Depende da tarefa 11 (o preço de tabela e o de campanha da linha, que este resumo lê): ela roda numa onda anterior.

### Testes

Teste antes do código: cada caso abaixo reprova antes do conserto e passa depois.
- Teste do `OrderSummary` (ou da página real do checkout, como `checkoutCampanha.test.tsx`) com uma peça de campanha (M-A, R$ 385,00 a 20 %) e uma comum: o resumo mostra Subtotal de tabela, a linha "Desconto de campanha −R$ 77,00" e o mesmo total; vermelho antes do conserto.
- Sem peça de campanha, a linha não aparece.

### Obrigações

- Rode, em cada workspace tocado, a suíte (`pnpm --filter @estrelinha/<w> test --testTimeout=20000`, sem o `--`, exit capturado fora de pipe), `npx tsc --noEmit -p <projeto>` e `npx eslint .` no app; compare com as baselines do `CLAUDE.md` (sem regressão). Mudança em `packages/core` roda também a suíte da loja e a do painel (os guardas de lá varrem os dois apps).
- Os guardas do repositório (`touchTarget`, `contrast`, `accentText`, os de dono único) continuam verdes sem afrouxar asserção.
- `packages/core/src/payment/**` só muda se o diagnóstico mostrar que a causa está lá; mudando, a suíte de `payment` não perde caso.

### Não faça

- Não altere dado do banco local para "consertar" a massa (pedidos, marcações, campanhas da QA): corrija a escrita.
- Não mexa no `status` nem no corpo de `qa/issues/BUG-003.md` — é da QA.
- Não amplie o escopo para as sugestões de backlog do `qa-result.md`.
- Não commite: o orquestrador commita.

### Pronto quando

- O teste novo reprovava antes e passa depois; a suíte, os tipos e o lint dos workspaces tocados sem regressão.
- O comportamento esperado do BUG-003 foi visto funcionando no app local (relate como conferiu).

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
