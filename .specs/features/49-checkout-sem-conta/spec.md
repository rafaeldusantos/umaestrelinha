# Checkout sem conta — Especificação

> Feature `49`. A numeração é de ordem de criação e é imutável: a `48` (usuários do painel) nasceu
> antes desta.

## Problem Statement

Quem clica em "Finalizar compra" sem sessão bate numa parede: o `/checkout` tranca em `user`
(`CHK-02`), abre o `AuthOverlay` sozinho e, por trás dele, escreve **"Você precisa estar logada
para finalizar a compra"**. É uma etapa a mais entre a decisão de comprar e o pagamento, e ~90% dos
acessos são de celular, onde ela custa mais.

O peso aqui não é só de conversão. Boa parte de quem abre esta loja acabou de perder alguém — pedir
que essa pessoa crie uma conta antes de encomendar a joia com as cinzas de quem ela perdeu é cobrar
burocracia no pior momento possível.

## Goals

- [ ] Finalizar a compra leva **direto** ao `/checkout`, com ou sem sessão — zero telas
      intermediárias de autenticação.
- [ ] É possível concluir a compra inteira (pedido + pagamento + confirmação) preenchendo apenas os
      dados de contato.
- [ ] Quem já tem conta entra **por dentro** do checkout, sem perder o rascunho já digitado.
- [ ] E-mail que já tem conta não segue como convidada: a loja avisa e pede o código de 6 dígitos,
      **no próprio bloco Contato**.
- [ ] "Como nasce um pedido" passa a ter **um dono só**, que atende convidada e logada.

## Out of Scope

| Fora | Por quê |
| --- | --- |
| Redesenhar o `AuthOverlay` (passos, senha, Google, recuperação) | Ele continua sendo a porta de "Entrar". Esta feature o **abre de outro lugar**, não o refaz. |
| Senha no checkout | O padrão de identidade da loja é o código por e-mail (decisão do usuário). A conta da convidada nasce **sem senha**; a senha continua existindo no overlay para quem já tem uma. |
| Convite pós-compra para definir senha | A conta já existe e entra por código. Um e-mail a mais sem necessidade. |
| CPF/CNPJ como identificador de login | A identidade da loja é o e-mail. `customer_document` continua sendo dado do **pagador**. |
| Carrinho de convidada sincronizado entre dispositivos | O carrinho é `localStorage` e continua sendo. Sem sessão não há onde sincronizar. |
| Telas do backoffice | `customer_directory` (feature `35`) passa a listar **menos** gente pela via de convidada, não mais: a convidada vira `customers` de verdade. Nenhuma tela do painel muda. |
| Prova em navegador das telas novas | Entra na dívida declarada de `32`…`47`. Registrado, não esquecido — ver Riscos. |

---

## Assumptions & Open Questions

| Assunção / decisão | Escolha | Racional | Confirmado? |
| --- | --- | --- | --- |
| O que é "criar cadastro" para a convidada | Conta **sem senha** em `auth.users`, criada pelo servidor no fecho do pedido | Decisão do usuário. `handle_new_customer` já cria a ficha em `customers`, e o pedido nasce ligado a ela — `/conta` funciona assim que ela entrar por código | **sim** |
| Da 2ª compra em diante a mesma pessoa cai no desafio de código | Aceito | Consequência direta da decisão acima, apresentada com o custo e aceita. Numa loja memorial a recompra é rara; em troca, o histórico fica ligado desde o primeiro pedido | **sim** |
| Quem grava o pedido | **Uma** edge function grava TODOS os pedidos — convidada e logada | Decisão do usuário. Dois caminhos de gravação seriam o "defeito 01" no caminho do dinheiro: duas cópias divergindo sem build, `tsc` ou teste acusarem | **sim** |
| Onde aparece o desafio de código | Inline, dentro do bloco Contato, reusando `AuthCodeStep` | Decisão do usuário. Abrir o overlay devolveria a mesma parede modal que a feature remove | **sim** |
| Ícone do convite "Entrar" | Neutro — não é a marca do Google | O board do Paper lidera com o "G" do Google, mas o botão abre o overlay **inteiro** (código, senha, Google). Marca de provedor prometeria um caminho só. Desvio deliberado do board | não |
| Como o e-mail é verificado contra contas existentes | Ação `identify` na mesma edge function, chamada no **blur** do campo e no "Continuar" — nunca a cada tecla | Enumeração de e-mail é risco aceito e **já existente**: com a anon key publicada, `signInWithOtp({ shouldCreateUser: false })` do navegador já responde a mesma pergunta. Mitigado por teto por IP e por a recusa de verdade morar no servidor | não |
| O que acontece ao atingir o teto de consultas | Responde 429; a tela trata como "não cadastrado" e segue | Falha para o lado seguro: quem decide de verdade é a criação do pedido, que recusa e-mail com conta sem sessão | não |
| Validade do acesso da convidada ao próprio pedido | 7 dias a partir da criação | Cobre com folga a janela de pagar e conferir. Depois disso o caminho é entrar por código em `/conta`, que funciona porque o pedido tem `customer_id` | não |
| Onde o token de acesso fica no navegador | `localStorage`, chave nova `estrelinha-order-access` | Sobrevive a fechar a aba, o que `sessionStorage` não faria. Chave **nova**: a regra de não renomear chave de `localStorage` protege chave com estado de cliente real, e esta não tem nenhum | não |
| Ordem de criação: pedido antes da conta | Grava o pedido, **depois** cria a conta, **depois** liga as duas | Se a criação da conta falhar, sobra um pedido órfão — que `customer_directory` e `handle_new_customer` já sabem tratar (feature `35`). O inverso deixaria uma conta órfã que faria a **próxima** tentativa da mesma pessoa cair num desafio de código por um pedido que ela nunca fez | não |

**Open questions:** nenhuma — tudo resolvido ou registrado acima.

---

## User Stories

### P1: Comprar sem criar conta ⭐ MVP

**User Story**: Como quem acabou de escolher uma joia, quero finalizar a compra preenchendo só meus
dados de contato, para não precisar criar uma conta num momento em que isso é a última coisa que eu
quero fazer.

**Why P1**: É a feature. Sem isto, nada mais importa.

**Acceptance Criteria**:

1. WHEN alguém sem sessão abre `/checkout` THEN a loja SHALL renderizar os três blocos do checkout,
   sem overlay de autenticação e sem a tela "Faça login para continuar".
2. WHEN alguém sem sessão preenche Contato, Entrega e Pagamento THEN o CTA de pagar SHALL habilitar
   pelas mesmas regras de `resolveFlow` que valem para quem tem sessão — sem nenhuma condição extra
   de autenticação.
3. WHEN alguém sem sessão aciona o CTA THEN a loja SHALL criar o pedido e seguir para o pagamento
   sem pedir autenticação em ponto nenhum.
4. WHEN o pedido de convidada é criado THEN ele SHALL gravar `customer_name`, `customer_email`,
   `customer_phone` e `customer_document` com o que foi digitado, iguais aos de um pedido com sessão.
5. WHEN o pagamento de um pedido de convidada é aprovado THEN a loja SHALL navegar para
   `/pedido/:id` e mostrar a confirmação completa, sem sessão.
6. WHEN a convidada recarrega `/pedido/:id` dentro da validade do acesso THEN a página SHALL
   continuar mostrando o pedido.
7. WHEN o pedido de convidada é gravado THEN o servidor SHALL criar uma conta sem senha para aquele
   e-mail e ligar o pedido a ela, de modo que entrar por código depois mostre o pedido em `/conta`.
8. WHEN a criação da conta falha THEN o pedido SHALL permanecer válido e pagável, com `customer_id`
   nulo — a venda nunca é bloqueada por falha de identidade.

**Independent Test**: em aba anônima, com o carrinho cheio, ir de `/carrinho` a `/pedido/:id`
aprovado sem nenhuma tela de login.

---

### P1: Entrar por dentro do checkout ⭐ MVP

**User Story**: Como cliente que já comprou aqui, quero entrar sem sair do checkout, para a loja
preencher o que já sabe de mim sem me fazer recomeçar.

**Why P1**: É a contrapartida explícita do portão removido — tirar a obrigação não pode tirar a
opção.

**Acceptance Criteria**:

1. WHEN `/checkout` é aberto sem sessão THEN a loja SHALL exibir, acima do bloco Contato, um convite
   com o rótulo de ação **Entrar**.
2. WHEN o convite é acionado THEN a loja SHALL abrir o `AuthOverlay` com `returnTo` igual a
   `/checkout`.
3. WHEN a autenticação conclui pelo convite THEN a loja SHALL fechar o overlay e permanecer em
   `/checkout`, **sem navegar**, com o rascunho já digitado intacto.
4. WHEN há sessão THEN o convite SHALL não ser renderizado.
5. WHEN a pessoa entra e o bloco Contato tem campos vazios THEN eles SHALL ser preenchidos a partir
   de `customers`, e campos já digitados por ela SHALL ser preservados.
6. WHEN o convite é renderizado THEN o ícone dele SHALL não ser marca de provedor de identidade — o
   botão abre todos os caminhos do overlay, não um.
7. WHEN a viewport tem 390px THEN o convite SHALL caber sem rolagem horizontal do body, com alvo de
   toque de no mínimo 44px no botão.

**Independent Test**: preencher metade do Contato sem sessão, entrar pelo convite, e ver a tela
continuar em `/checkout` com o que foi digitado.

---

### P1: E-mail que já tem conta pede o código ⭐ MVP

**User Story**: Como a loja, preciso que ninguém finalize uma compra no e-mail de outra pessoa, e
que quem já tem conta seja reconhecido — sem transformar isso numa parede.

**Why P1**: Sem isto, o caminho de convidada vira porta para anexar pedido a histórico alheio.

**Acceptance Criteria**:

1. WHEN o campo de e-mail perde o foco com um e-mail válido THEN a loja SHALL consultar se aquele
   e-mail já tem conta, **uma vez por e-mail normalizado**, e nunca a cada tecla.
2. WHEN a consulta responde que o e-mail já tem conta THEN a loja SHALL exibir, dentro do bloco
   Contato, o aviso de que aquele e-mail já tem cadastro e o pedido do código de 6 dígitos.
3. WHEN o desafio aparece THEN a loja SHALL enviar o código para aquele e-mail e renderizar o
   `AuthCodeStep` existente inline, com o mesmo reenvio e o mesmo cooldown de 60s.
4. WHEN o desafio está pendente THEN o bloco Contato SHALL não poder ser concluído e o CTA de pagar
   SHALL permanecer desabilitado.
5. WHEN o código é aceito THEN a loja SHALL passar a tratar a pessoa como logada, esconder o
   desafio, e o fluxo SHALL seguir de onde estava, sem navegação e sem perder o rascunho.
6. WHEN a pessoa troca para um e-mail sem conta THEN o desafio SHALL desaparecer e o caminho de
   convidada SHALL voltar a valer.
7. WHEN a identidade muda depois de um pedido já criado (entrar, sair, ou trocar o e-mail desafiado)
   THEN o pedido em curso SHALL ser invalidado pela mesma mecânica de `CHK-08`, para que o próximo
   CTA não pague um pedido de outro dono.
8. WHEN a criação do pedido chega ao servidor sem sessão e com um e-mail que já tem conta THEN o
   servidor SHALL recusar com um motivo legível e **nenhum pedido SHALL ser gravado** — a checagem
   da tela é conveniência, a do servidor é a regra.
9. WHEN a consulta de e-mail falha ou é recusada por excesso de chamadas THEN a tela SHALL seguir
   como se não houvesse conta, deixando a recusa para o servidor.

**Independent Test**: digitar no checkout, sem sessão, um e-mail que já tem conta e ver o desafio
inline; digitar o código e ver o fluxo seguir na mesma tela.

---

### P1: Um dono só para criar o pedido ⭐ MVP

**User Story**: Como quem mantém este repositório, preciso que exista **um** caminho de gravação de
pedido, para que a regra da convidada e a da logada não divirjam em silêncio.

**Why P1**: É o "defeito 01" na sua forma mais cara — no caminho do dinheiro.

**Acceptance Criteria**:

1. WHEN um pedido é criado, com ou sem sessão, THEN ele SHALL ser gravado pela **mesma** edge
   function, com service role.
2. WHEN a loja tem sessão THEN a chamada SHALL levar o JWT, e o pedido SHALL ser ligado ao
   `customers` daquele usuário.
3. WHEN nenhum arquivo de `apps/**` grava em `orders` ou `order_items` pelo PostgREST THEN um
   guarda SHALL manter isso verdadeiro, recusando a volta da segunda gravação.
4. WHEN a mesma tentativa é repetida por falha de rede THEN o servidor SHALL devolver o **mesmo**
   pedido, sem criar um segundo e sem criar uma segunda conta.
5. WHEN o pedido de convidada é criado THEN o servidor SHALL devolver um token de acesso próprio
   daquele pedido, guardado no banco apenas como hash.
6. WHEN a convidada paga THEN `create-payment` SHALL aceitar aquele token como prova de posse do
   pedido, e SHALL continuar aceitando o JWT como hoje para quem tem sessão.
7. WHEN o token não confere, expirou, ou é de outro pedido THEN `create-payment` e a leitura do
   pedido SHALL recusar com 403.
8. WHEN o pedido de convidada é criado THEN o CPF do pagador SHALL ser gravado em `customers` pelo
   servidor, para que `buildPayer` continue tendo um dono só (`PGD-04` intacto).
9. WHEN duas tentativas simultâneas criam conta para o mesmo e-mail novo THEN a segunda SHALL
   reaproveitar a conta criada pela primeira, nunca falhar a venda.

**Independent Test**: probe HTTP real contra o banco local — criar pedido com e sem JWT pela
function e conferir as linhas gravadas.

---

### P2: A próxima compra da convidada já vem preenchida

**User Story**: Como quem comprou uma vez como convidada, quero que a loja lembre do meu endereço
quando eu entrar por código, para não digitar tudo de novo.

**Why P2**: Conveniência real, mas a compra fecha sem ela.

**Acceptance Criteria**:

1. WHEN o pedido de convidada é criado THEN o servidor SHALL gravar o endereço em `addresses` para
   aquele `customer_id`.
2. WHEN a gravação do endereço falha THEN o pedido SHALL seguir normalmente — é conveniência, não
   pré-requisito (mesma regra de `ADR-03`).

**Independent Test**: comprar como convidada, entrar por código, e ver o endereço em `/conta`.

---

## Edge Cases

- WHEN o carrinho está vazio em `/checkout` THEN a loja SHALL continuar redirecionando para
  `/carrinho` — sem sessão também.
- WHEN a pessoa entra pelo convite **depois** de o pedido de convidada já ter sido criado THEN o
  pedido em curso SHALL ser invalidado e recriado no próximo CTA (`IDN-07`).
- WHEN a pessoa entra com um e-mail diferente do que estava no bloco Contato THEN o e-mail digitado
  SHALL ser preservado como contato do pedido, e a identidade do pedido SHALL ser a da conta.
- WHEN o e-mail é digitado com maiúsculas THEN a comparação com contas existentes SHALL ser feita em
  `lower()`, nos dois lados.
- WHEN a rede cai entre criar o pedido e pagar THEN o token SHALL já estar gravado antes da
  resposta, de modo que a retentativa com o mesmo `client_request_id` devolva o mesmo pedido e o
  mesmo acesso.
- WHEN alguém abre `/pedido/:id` de um pedido que não é seu, sem sessão e sem token THEN a página
  SHALL dizer que o pedido não foi encontrado, sem vazar nada dele.
- WHEN o acesso da convidada expira THEN `/pedido/:id` SHALL oferecer entrar por código para ver o
  pedido, em vez de um erro seco.
- WHEN o código é digitado errado THEN o `AuthCodeStep` SHALL mostrar o erro e permitir reenviar
  depois do cooldown — comportamento que já existe.

---

## Dimensões implícitas

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | `IDN-01` (e-mail válido antes de consultar), `PED-08` (CPF pelo servidor), token de 32 bytes |
| Falha e falha parcial | `CSC-08` (conta falha, venda segue), `PED-04` (retentativa), `ADR-G2` (endereço falha, pedido segue) |
| Idempotência / retentativa / duplicata | `PED-04` (`client_request_id`), `PGM-08` preservado (pedido `pending` é reusado) |
| Fronteiras de auth e teto de chamadas | `IDN-08` (recusa no servidor), `IDN-09` (teto), `PED-06`/`PED-07` (JWT **ou** token) |
| Concorrência / ordenação | `PED-09` (duas contas simultâneas), e a ordem pedido → conta → vínculo |
| Ciclo de vida do dado | acesso de 7 dias; token só em hash no banco; `estrelinha-order-access` no navegador |
| Observabilidade | a function registra ação, `order_id` e se a identidade veio de sessão ou de convidada; **nunca** registra o token nem o código |
| Falha de dependência externa | GoTrue fora do ar ⇒ `CSC-08`: pedido órfão, pagável |
| Integridade de transição de estado | `RETRYABLE_STATUSES` intacto: token não paga pedido já aprovado (`PED-07`) |

---

## Requirement Traceability

| ID | História | Tasks | Status |
| --- | --- | --- | --- |
| CSC-01 … CSC-03 | P1: Comprar sem criar conta | T3, T11, T15 | Implementado |
| CSC-04 | idem | T7, T10 | Implementado |
| CSC-05 | idem | T11, **+ a espera do PIX** (fora do plano) | Implementado |
| CSC-06 | idem | T8, T13, T14 | Implementado |
| CSC-07, CSC-08 | idem | T7, **+ o recuo do pagador** (fora do plano) | Implementado |
| ENT-01 … ENT-07 | P1: Entrar por dentro do checkout | T16 | Implementado |
| IDN-01, IDN-09 | P1: E-mail que já tem conta pede o código | T6, T17 | Implementado |
| IDN-02, IDN-03, IDN-05, IDN-06 | idem | T18 | Implementado |
| IDN-04 | idem | T3, T18 | Implementado |
| IDN-07 | idem | T19 | Implementado |
| IDN-08 | idem | T7, T11 | Implementado |
| PED-01 … PED-05, PED-08, PED-09 | P1: Um dono só para criar o pedido | T4, T7, T11 | Implementado |
| PED-03 | idem | T12 | Implementado |
| PED-06, PED-07 | idem | T9, **+ o envio do token** (fora do plano) | Implementado |
| ADR-G1, ADR-G2 | P2: A próxima compra já vem preenchida | T7 | Implementado |

**Cobertura:** 35 requisitos, 35 mapeados para tasks.

⚠️ **"Implementado" não é "verificado por terceiro".** Esta feature **não tem `validation.md`** nem
verificador independente — mesma pendência da `32`, `33`, `34`, `35`, `37` e `39`. O que existe é
prova por gate: suíte por workspace com exit code fora de pipe, sensor por mutação em cada guarda
novo (um deles reprovou o próprio arquivo certo e foi corrigido por isso), e **probe HTTP real
contra o banco local** para a migration (`AD-012`). **Prova em navegador não foi feita** — dívida
declarada, ver *Riscos*.

---

## Riscos declarados

- **Enumeração de e-mail.** A ação `identify` responde "este e-mail tem conta?". O risco é real e
  **já existe** com a anon key publicada. Mitigação: teto por IP, chamada só no blur/Continuar, e a
  recusa de verdade no servidor. Registrado, não escondido.
- **A 2ª compra pede código.** Consequência aceita da decisão de criar conta. Se o atrito se mostrar
  caro, a saída seria distinguir "conta que já entrou" de "conta criada por compra" — o que é um
  segundo dono de "tem conta?", e por isso não entra agora.
- **Mexe no caminho do dinheiro.** `create-payment` ganha uma segunda prova de posse e a gravação do
  pedido muda de casa. O gate exige probe HTTP real contra o banco local (`AD-012`: tipo escrito à
  mão é afirmação, não verificação) — não basta `tsc` verde.
- **`create-order` cria conta sem autenticação e sem teto por IP.** Achado da verificação
  independente, **não declarado na primeira escrita desta spec**. Um cliente automatizado pode
  chamar a ação com o e-mail de outra pessoa e produzir: (a) uma conta sem senha em `auth.users`
  para aquele e-mail, o que faz a **primeira compra real dessa pessoa** cair no desafio de código; e
  (b) um pedido `pending` falso, que `handle_new_customer` **adota** quando ela criar conta — ele
  apareceria no histórico dela.
  - **O que NÃO é possível**: pagar, ler dado de terceiro, ou tomar a conta. A conta nasce sem senha
    e sem e-mail confirmado, e entrar nela continua exigindo o código que só chega ao dono do
    e-mail.
  - **Por que não foi fechado agora**: um teto em `create-order` é um teto no **caminho do
    dinheiro**, e um throttle que erra bloqueia venda. A mitigação certa é captcha no checkout ou
    limite por IP com folga generosa — decisão de produto, medida com tráfego real.
  - Mitigação parcial que já existe: `client_request_id` é único, então repetir a mesma chave não
    multiplica pedidos.
- **`client_request_id` é uma credencial, e não parece uma.** Quem o apresenta faz o servidor
  **reemitir** o acesso daquele pedido — é o que torna `PED-04` verdadeiro quando a primeira
  resposta se perde. Ele não tem expiração própria e não identifica ninguém. Por isso `get-order`
  **não o devolve** no corpo (senão o token de 7 dias seria renovável para sempre), e ele vive no
  `sessionStorage` do checkout, morrendo com o pedido.
- **Sem prova em navegador.** jsdom devolve 0 para toda medida de layout, e `ENT-07` é medida. Entra
  na fila de `32`…`47`.
- **O probe contra o banco NÃO está no disco.** `checkoutSchema.test.ts` lê o `.sql`, o que é prova
  sobre o **texto** da migration, não sobre o banco. O probe de `AD-012` foi executado (sete
  comportamentos de `account_exists`, as três colunas e o índice parcial) e o resultado está no
  histórico desta feature — mas ele não é reexecutável por quem vier depois.

---

## Success Criteria

- [ ] Em aba anônima, `/carrinho` → `/pedido/:id` aprovado sem uma tela de autenticação sequer.
- [ ] E-mail com conta, sem sessão: desafio inline, código aceito, fluxo segue na mesma tela.
- [ ] Zero gravação de `orders`/`order_items` por `apps/**`, provado por guarda que lê o disco.
- [ ] Baseline sem regressão: lint 27/6, tipos 0·0·0, cinco workspaces medidos um por vez.
