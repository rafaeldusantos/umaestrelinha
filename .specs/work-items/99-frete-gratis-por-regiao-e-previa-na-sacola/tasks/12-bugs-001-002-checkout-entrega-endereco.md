## 12 · [apps/store] BUG-001, BUG-002 — Checkout (e Pedido montado) · bloco Entrega — endereço de entrega

**Status:** done

`BUG-001, BUG-002 (QA rodada 1)` — 99

**Objetivo.** Os campos de endereço do bloco Entrega acompanham o CEP e a origem certa: o endereço salvo de quem tem conta chega inteiro na segunda ida da sacola, e trocar para um CEP que a busca não localiza nunca deixa a rua, o bairro, a cidade e a UF do CEP anterior.

**Antes de tocar em qualquer arquivo**, leia por inteiro: `CLAUDE.md` (raiz) › "O defeito 01", "Convenções que valem em
todo o repositório"; `apps/store/CLAUDE.md` › "Carrinho, chrome e checkout" (inclusive "O checkout NÃO exige conta"),
"Mobile — o que quebra e não grita". Divergindo desta tarefa sobre COMO fazer, o arquivo de instruções manda, e a
divergência vai no retorno.

**Depende de.** Tarefas 01..11 fechadas (`done`). Confira que o código delas existe antes de começar.

### Critérios de aceite

### BUG-001 — [Checkout · Entrega] Na segunda ida da sacola, a rua do endereço salvo é trocada — cliente com conta

### BUG-001 · [Checkout · Entrega] Na segunda ida da sacola, a rua do endereço salvo é trocada — cliente com conta

#### Resumo

Teresa tem conta com o endereço salvo em Porto Alegre (Rua dos Andradas, 1234, apto 501, CEP 90010-000). Ela calcula
o frete na sacola com esse mesmo CEP, escolhe a retirada e segue ao checkout: o endereço salvo aparece inteiro e
certo. Ela volta à sacola, troca a retirada pelo PAC e segue de novo ao checkout. Agora o bloco Entrega, que abre
recolhido, mostra "Rua Siqueira Campos, 1234, apto 501": o número e o complemento continuam os dela, mas a rua não.
Ela não abre o bloco, porque ele já está preenchido, e o pedido sairia para uma rua que não é a dela.

**Origem:** sessão CH-03 (e a continuação) · local (loja em http://localhost:8082, Supabase local)

#### Impacto

- **Nível:** Perda de dados — o endereço que ela salvou chega ao pedido com a rua trocada, sem ela pedir e sem que o
  bloco recolhido deixe isso à vista
- **Persona mais atingida:** PER-04 Teresa (fonte a 200 %, bloco recolhido) — outras: qualquer cliente com endereço
  salvo que calcule na sacola com o CEP desse endereço
- **Jornada e passo:** J-05, passo 3 (segue ao checkout, volta à sacola, escolhe o PAC e segue de novo)
- **Frequência:** sempre (2 de 2, em duas sessões)
- **Contorno:** abrir o bloco Entrega e corrigir a rua à mão, se ela perceber a troca. O bloco recolhido não chama
  atenção para isso
- **Gravidade proposta na sessão:** critical — mantida

#### Ambiente

- **URL:** http://localhost:8082/checkout (a partir de `/produtos/pingente-afetivo-barquinho-com-cabelo`)
- **Tela:** Checkout · **Componente:** bloco Entrega — endereço de entrega (resumo recolhido do endereço salvo)
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24) · **Viewport:** 390 × 844, fonte da raiz a 200 %
- **Rede:** local; cotação do Melhor Envio interceptada com a fixture A (PAC R$ 21,40 · SEDEX R$ 38,90) · **Idioma:** pt-BR

#### Passos

1. Entre com a conta `cliente-com-endereco` (endereço salvo: Rua dos Andradas, 1234, apto 501, Centro Histórico, Porto
   Alegre/RS, CEP 90010-000), com a sacola vazia, e abra `/produtos/pingente-afetivo-barquinho-com-cabelo` (R$ 209,90)
2. Toque em "Adicionar à sacola". Na gaveta, digite 90010-000 e toque em "Calcular"
3. Escolha "Retirada no escritório" e toque em "Finalizar Pedido". O bloco Entrega mostra "Rua dos Andradas, 1234,
   apto 501" com a retirada marcada
4. Volte pelo navegador e abra a sacola. Toque em "Frete: Retirada no escritório… Ver as opções", escolha o PAC e toque
   em "Finalizar Pedido"
5. Sem recarregar, leia o bloco Entrega: "Rua Siqueira Campos, 1234, apto 501 · Centro Histórico · Porto Alegre/RS · CEP
   90010-000"

#### Esperado

Quando o CEP da gaveta é igual ao do endereço salvo, o endereço salvo entra inteiro (rua, número e complemento) e o bloco
abre recolhido. Isso vale em toda ida ao checkout e também depois de recarregar a página.

**Fonte:** `spec.md` D-11 (1); PRD 97 › Pergunta 1 e CA-09; TC-FUNC-008 passo 2 e a variação "Recarregar";
TC-JOURNEY-003 passo 3 ("o endereço salvo inteiro")

#### Observado

- Na primeira ida (com a retirada), o bloco mostrou "Rua dos Andradas, 1234, apto 501 · Centro Histórico · Porto
  Alegre/RS · CEP 90010-000".
- Na segunda ida (com o PAC), sem recarregar, o bloco mostrou "Rua Siqueira Campos, 1234, apto 501 · Centro Histórico ·
  Porto Alegre/RS · CEP 90010-000".
- Depois de recarregar, a rua continuou trocada (primeira sessão).
- O PAC e o CEP continuaram certos, e o Resumo mostrou R$ 216,61.
- A sessão não isolou o gatilho: pode ser a segunda ida em si ou a troca da retirada pelo PAC.
- A sessão não conferiu se o endereço salvo na conta também mudou.

#### Evidência

- `screenshots/CH-03-06-checkout-retirada.png`: primeira ida, "Rua dos Andradas", com a retirada marcada
- `screenshots/CH-03c-08-checkout-pac-sem-recarregar.png`: segunda ida, antes de recarregar, "Rua Siqueira Campos,
  1234, apto 501"
- `screenshots/CH-03-07-checkout-pac.png`: segunda ida com o PAC (primeira sessão)
- `screenshots/CH-03-08-checkout-recarregado.png`: depois de recarregar, a rua continua trocada

#### Ocorrências

| Sessão                 | Persona       | Passo                                                    | Evidência                                                                           |
| ---------------------- | ------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| CH-03                  | PER-04 Teresa | 08–11 (segunda ida e recarregar)                         | `screenshots/CH-03-07-checkout-pac.png` · `screenshots/CH-03-08-checkout-recarregado.png` |
| CH-03 (continuação)    | PER-04 Teresa | 06–08 (segunda ida, sem recarregar)                      | `screenshots/CH-03c-08-checkout-pac-sem-recarregar.png`                             |

#### Relacionados

- **TC:** TC-FUNC-008, TC-JOURNEY-003
- **Charter:** CH-03
- **Critério:** CA-09 (PRD 97); D-11 (1)
- **Protótipo:** `Sacola - Prévia de frete.html` › checkout › Entrega (o bloco recebendo da sacola)
- **Bugs:** BUG-002 (outro sintoma no mesmo endereço de entrega: os campos não acompanham o CEP)

### BUG-002 — [Entrega] Trocar para um CEP não localizado mantém a rua e a cidade do CEP anterior

### BUG-002 · [Entrega] Trocar para um CEP não localizado mantém a rua e a cidade do CEP anterior

#### Resumo

Cida, de Salvador, corrige o CEP no bloco Entrega: antes estava 01310-100 (São Paulo), agora ela digita 40020-000. O
frete acompanha a troca: o PAC deixa de ser grátis e o Total sobe. Mas o formulário continua dizendo "Avenida Paulista,
Bela Vista, São Paulo, SP" e, ao mesmo tempo, avisa "Não localizamos esse CEP. Preencha o endereço à mão". Ela fica com
um CEP de Salvador e um endereço de São Paulo na mesma tela. Se não corrigir campo a campo, o pedido segue com o
endereço misturado. Se reparar, passa a desconfiar do que a loja preencheu por ela.

**Origem:** sessão CH-02 · CH-06 (continuações) · local (loja em http://localhost:8082, Supabase local)

#### Impacto

- **Nível:** Dano à confiança. O formulário mostra o endereço de outro CEP, e o pedido pode seguir com CEP e UF que não
  batem
- **Persona mais atingida:** PER-02 Cida — outras: qualquer cliente que corrige o CEP no checkout ou no pedido montado
- **Jornada e passo:** J-02, ramo J-02a (corrige o CEP no checkout); J-04, passo da Entrega do pedido montado
- **Frequência:** sempre que o CEP novo não é localizado pela busca e o anterior foi (3 ocorrências em 2 telas)
- **Contorno:** reescrever Rua, Bairro, Cidade e UF à mão (os campos ficam editáveis), como na CH-06 (continuação 2)
- **Gravidade proposta na sessão:** high (CH-02), mantida. A CH-06 (continuação) classificou o mesmo comportamento no
  pedido montado como spec-gap pré-existente. O triager o conta como bug porque:
  - ele mora na troca de CEP que a mudança exercita (CA-18 e o pedido montado com região);
  - como `high`, viraria bug mesmo se fosse pré-existente.

#### Ambiente

- **URL:** http://localhost:8082/checkout e o link de `/pedido-montado` (P-0046)
- **Tela:** Checkout e Pedido montado · **Componente:** bloco Entrega — endereço de entrega (campos Rua, Bairro, Cidade,
  UF e a linha de status da busca do CEP)
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server; build não exposto
- **Browser:** Chromium headless (playwright-cli 0.1.24) · **Viewport:** 390 × 844
- **Rede:** local, com a busca pública do endereço liberada (ViaCEP); cotação interceptada com a fixture A · **Idioma:** pt-BR

#### Passos

1. Na loja `http://localhost:8082`, entre anônima ou com a conta `cliente-salvador` (sem endereço salvo). Ponha uma peça
   na sacola, com a cotação interceptada pela fixture A
2. Toque em "Finalizar Pedido", preencha o Contato e toque em "Continuar"
3. No bloco Entrega, digite o CEP 01310-100. Rua, Bairro, Cidade e UF se preenchem com "Avenida Paulista", "Bela Vista",
   "São Paulo" e "SP"
4. Troque o CEP para 40020-000

#### Esperado

Rua, Bairro, Cidade e UF acompanham o CEP informado: preenchidos pela busca, ou limpos para preencher à mão quando a busca
não localiza o CEP. O próprio checkout faz assim quando o CEP anterior também não tinha sido localizado: os campos
ficam vazios (CH-02, passo 08). Nunca fica o endereço de outro CEP.

**Fonte:**

- `spec.md` › Design › "Checkout · Entrega com o CEP da sacola": "Rua, Bairro, Cidade e UF preenchidos pela busca (como
  hoje ao digitar)";
- a mensagem da própria tela ("Preencha o endereço à mão");
- PRD 99 UC-10 e CA-18 (trocar o CEP no checkout);
- J-02 ramo J-02a e J-04 ("o CEP corrigido vale para a entrega").

#### Observado

- **Checkout:** com 40020-000 no campo CEP, a linha de status diz "Não localizamos esse CEP. Preencha o endereço à mão —
  a cotação segue pelo CEP informado.", e os campos continuam "Avenida Paulista", "Bela Vista", "São Paulo", "SP".
  - O frete e o Total acompanham a troca: o PAC passa a R$ 21,40, sem "Grátis".
  - Depois da troca, a rede não mostra nenhuma busca do endereço para 40020000.
- **Pedido montado:** o mesmo, com os campos já editáveis.
  - O pedido seguiria com CEP de Salvador e UF SP se ela não os corrigisse.
  - A tela cotou pelo CEP: o PAC veio cobrado.
- **Quando o CEP anterior também não era localizado** (39999-999 → 40020-000), os campos ficaram vazios, com a mesma
  mensagem.
- **O 40020-000 não foi localizado pela busca em nenhuma tela da rodada:**
  - o cabeçalho da gaveta saiu sem a cidade;
  - o checkout e o pedido montado disseram "Não localizamos esse CEP".
  
  A sessão registrou `GET viacep.com.br/ws/40020000/json/ → 200` na gaveta, mas a ViaCEP responde 200 também quando não
  acha o CEP. Se o 40020-000 for localizável, a mensagem "Não localizamos" é um segundo defeito, a confirmar.

#### Evidência

- `screenshots/CH-02-07-checkout-ba-endereco.png`: checkout com o CEP 40020-000, os campos de São Paulo e a mensagem
  "Não localizamos esse CEP"
- `screenshots/CH-06d-01-sp-pac-gratis.png`: pedido montado com 01310-100 e o endereço de São Paulo, o estado de onde
  parte a troca

#### Ocorrências

| Sessão                 | Persona     | Passo                                             | Evidência                                        |
| ---------------------- | ----------- | ------------------------------------------------- | ------------------------------------------------ |
| CH-02                  | PER-02 Cida | 10–11 (checkout, 01310-100 → 40020-000)           | `screenshots/CH-02-07-checkout-ba-endereco.png`  |
| CH-06 (continuação)    | PER-02 Cida | 05–06 (pedido montado, 01310-100 → 40020-000)     | —                                                |
| CH-06 (continuação 2)  | PER-02 Cida | 03–05 (pedido montado, 01310-100 → 40020-000)     | `screenshots/CH-06d-01-sp-pac-gratis.png`        |

#### Relacionados

- **TC:** nenhum (entorno de TC-FUNC-014 e TC-INT-001, que passaram no que conferem)
- **Charter:** CH-02, CH-06
- **Critério:** CA-18, UC-10 (PRD 99)
- **Protótipo:** `Sacola - Prévia de frete.html` › checkout › Entrega
- **Bugs:** BUG-001 (outro sintoma no mesmo endereço de entrega)

### Contrato

| Item | Dono | Entra | Sai |
| ---- | ---- | ----- | --- |
| `apps/store/src/features/checkout/ui/DeliveryBlock.tsx` (a semeadura do endereço salvo, o preenchimento pela busca do CEP e a troca de CEP) | VOCÊ ALTERA | `cepOrigin` e o rascunho do checkout, o endereço salvo, o resultado de `useCepLookup` | Rua, Bairro, Cidade e UF coerentes com o CEP e a origem |
| `cepOrigin`, `setCepOrigin`, `setAddress` (`features/checkout/model/checkoutStore.ts`) | JÁ EXISTE (tarefas 06 e 10). Consuma; altere só se o fix exigir, e diga no retorno | | |
| `useCepLookup` (`features/checkout/api/useCepLookup.ts`, `entities/address/api/useCepLookup.ts`) | JÁ EXISTE. Consuma; não altere | | |

### Decisões já tomadas

- **Classificação**: qa-issue
- **Bug**: BUG-001 · [Checkout · Entrega] Na segunda ida da sacola, a rua do endereço salvo é trocada — cliente com conta · critical
- **Bug**: BUG-002 · [Entrega] Trocar para um CEP não localizado mantém a rua e a cidade do CEP anterior · high
- **Lote**: mesmo componente `apps/store/src/features/checkout/ui/DeliveryBlock.tsx` — o endereço de entrega (semeadura do endereço salvo, preenchimento pela busca e troca de CEP); o mesmo bloco serve `/checkout` (`pages/CheckoutPage.tsx`) e `/pedido-montado` (`pages/ProposalCheckoutPage.tsx`)
- **Fechamento**: a tarefa fecha com o fix de todos os bugs dela; cada bug segue `open` até o reteste do QA
- D-11 (spec.md › Decisões): CEP da gaveta **igual** ao do endereço salvo de quem tem conta ⇒ o endereço salvo **inteiro** entra (rua, número, complemento, bairro, cidade, UF) e o bloco abre recolhido como hoje — em toda ida da sacola ao checkout, não só na primeira; CEP diferente ⇒ o endereço salvo não é semeado.
- BUG-002: quando a busca não localiza o CEP novo, Rua, Bairro, Cidade e UF ficam **vazios** para preencher à mão, com a mensagem de hoje ("Não localizamos esse CEP. Preencha o endereço à mão — a cotação segue pelo CEP informado."); nunca o endereço de outro CEP. Vale no checkout e no pedido montado (o mesmo componente).
- A cotação continua pelo CEP informado (comportamento de hoje, não muda).

### Testes

- componente: cliente com endereço salvo (CEP 90010-000), sacola com o mesmo CEP — primeira ida com a retirada, volta, troca para o PAC e segunda ida: o bloco mostra a rua salva, com o número e o complemento (BUG-001); também depois de recarregar.
- componente: com o endereço de 01310-100 preenchido pela busca, trocar para um CEP que a busca não localiza ⇒ Rua, Bairro, Cidade e UF vazios e a mensagem de hoje (BUG-002); o mesmo pelo `ProposalCheckoutPage`.
- componente: trocar para um CEP que a busca localiza continua preenchendo pela busca (regressão).

### Obrigações

- `apps/store/src/pages/__tests__/CheckoutPage*.test.tsx`, `checkoutSobreviveAVoltaDaAba.test.tsx`, `ProposalCheckoutPage.test.tsx` e `src/test/sacolaECheckoutMesmoTotal.test.tsx` continuam verdes (ajuste o arnês sem afrouxar asserção).
- `touchTarget` e `fieldBorder` verdes.

### Não faça

- Não altere a gaveta (`widgets/cart-drawer/**`), `deliveryOptions.ts`, `ShippingOptionCard.tsx` nem `OrderSummary.tsx`.
- Não mude a regra do frete grátis nem a cotação.
- Não altere dado existente no banco (endereços salvos).

### Pronto quando

- [ ] BUG-001: na segunda ida da sacola (retirada → PAC), com e sem recarregar, o bloco Entrega mostra o endereço salvo inteiro
- [ ] BUG-002: CEP não localizado ⇒ Rua, Bairro, Cidade e UF vazios, no checkout e no pedido montado
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
