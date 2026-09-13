# Usuários do painel — especificação

## Problem Statement

Hoje **não existe jeito de criar um segundo acesso ao painel sem mexer no banco**. A única conta de
admin do projeto nasceu do `seed.sql`, e conceder papel a mais alguém exige `INSERT` manual em
`public.user_roles` pelo Studio — operação que a Adri não faz e que ninguém registra. A consequência
prática é que a loja tem **um ponto único de falha humano**: se a dona perde o acesso, ninguém entra;
se ela quiser uma ajudante, a ajudante entra com a senha dela.

E a senha da própria conta só se troca pelo fluxo de **recuperação por e-mail** da loja — que é a
porta de quem esqueceu, não de quem quer trocar. Quem está logada no painel não tem onde mudar a
própria senha.

## Goals

- [ ] A Adri cria, edita e remove quem tem acesso ao painel **sem tocar no banco**, em `/admin/usuarios`.
- [ ] Quem está logada troca a própria senha em `/admin/conta`, provando a senha atual.
- [ ] **É impossível o painel ficar com zero admins** — a garantia é do banco, não da tela.
- [ ] A `service_role` key **nunca** entra no bundle do painel, e um guarda recusa a tentativa.

## Out of Scope

Explicitamente excluído. Registrado para não virar escopo por osmose.

| Item | Razão |
| --- | --- |
| Papéis além de `admin` (`moderator`, `user` do enum `app_role`) | Nenhum código do repositório lê os outros dois hoje. Criar tela para papel que não muda comportamento nenhum é inventar permissão que não existe. O enum continua como está. |
| Permissões por tela (quem vê Pedidos, quem vê Configurações) | O pedido é "usuários ADM", não RBAC. Granularidade exigiria uma tabela de permissões e uma segunda régua em toda policy do schema — dez vezes o trabalho, para uma operação de duas pessoas. |
| Gestão das **clientes** da loja (`/admin/clientes`) | Outra tela, outro domínio. `customer_directory` (`AD-023`) não é `user_roles`. |
| 2FA / MFA | O Supabase suporta, mas ligar MFA muda o fluxo de login de todo mundo e é feature própria. |
| Auditoria de quem criou/removeu quem | Não há tabela de auditoria no projeto e inventar uma aqui seria feature paralela. O `console.log` estruturado da function registra a ação (`USR-27`), e é o que existe. |
| Trocar o **e-mail** exigindo confirmação no endereço novo | `updateUserById` troca direto, com `email_confirm`. O fluxo de dupla confirmação é do GoTrue para o próprio usuário, não para o admin, e misturar os dois abriria um estado "e-mail pendente" que nenhuma tela sabe mostrar. |
| Encerrar a sessão ativa de quem perdeu o acesso | Registrado como limitação conhecida (`A-06`), não como requisito. O supabase-js v2 não expõe logout por id de usuário sem o JWT da pessoa. |

---

## Assumptions & Open Questions

| # | Assumption / decisão | Padrão escolhido | Razão | Confirmado? |
| --- | --- | --- | --- | --- |
| A-01 | O que "excluir" faz | **Duas ações distintas e rotuladas**: `Remover do painel` (revoga o papel, conta permanece) como ação principal; `Apagar conta` como ação secundária, recusada com motivo legível quando há histórico | Quatro FKs para `auth.users` sem `ON DELETE` bloqueiam a exclusão de qualquer admin que tenha trabalhado. Oferecer só "apagar" entregaria um botão que quase sempre falha | **sim** (usuário) |
| A-02 | Como o admin novo recebe a senha | **Os dois caminhos**: senha inicial definida na criação (`email_confirm: true`, entra na hora) **e** ação `Enviar link de redefinição` na lista | Entrega de e-mail é o elo frágil do projeto (`BUG-20260728`). Depender só do convite é depender do elo frágil; oferecer só senha inicial obriga a senha a viajar por WhatsApp para sempre | **sim** (usuário) |
| A-03 | Onde as telas entram | Dois itens novos em `footerNavItems`, ao lado de Configurações | É administração do sistema, não um dos quatro eixos por fila da sidebar (Vendas/Descontos/Catálogo/Loja) | **sim** (usuário) |
| A-04 | Trocar a própria senha exige a senha atual | **Sim** — `signInWithPassword` com a senha atual antes de `updateUser` | O GoTrue não exige por padrão. Sem isso, qualquer pessoa numa máquina destravada assume a conta da dona. O custo é um campo a mais | não (decisão do agente) |
| A-05 | O admin novo aparece em `/admin/clientes` | **Sim, e fica assim** | O trigger `on_auth_user_created_customer` grava em `customers` a cada insert em `auth.users`. Filtrar admins da listagem criaria um **segundo dono** de "quem é cliente" — o defeito 01 do projeto. A conta existe de verdade, e a Adri pode comprar da própria loja | não (decisão do agente) |
| A-06 | Revogar o papel **não** derruba a sessão ativa da pessoa | Aceito e declarado | O JWT já emitido continua válido até expirar (`jwt_expiry = 3600`), e `AuthContext` não re-resolve papel em `TOKEN_REFRESHED` (de propósito — foi o conserto do `BUG-20260802`). **Nada que ela faça grava**: toda policy de escrita chama `has_role`, avaliado por requisição. O casco do painel pode seguir na tela dela até recarregar | não (decisão do agente) |
| A-07 | O trigger de adoção de pedidos órfãos dispara ao criar admin | Aceito e declarado | `handle_new_customer` adota pedidos com o mesmo e-mail (`ESP-22`). Criar admin com um e-mail que já comprou como convidada **vincula aqueles pedidos** à conta nova. É o comportamento correto da adoção, e o efeito colateral aqui é benigno — mas torna a conta indelével dali em diante | não (decisão do agente) |
| A-08 | A listagem de admins passa pela edge function, não por uma view | Function é a **porta única** | `auth.users` não é exposto ao PostgREST. Uma view `security definer` sobre ela entregaria o e-mail de toda pessoa cadastrada a qualquer sessão autenticada, e criaria um segundo dono de "quem é admin do painel" ao lado da function que já precisa existir para criar e apagar | não (decisão do agente) |
| A-09 | Onde vive a regra pura (recusas, validação) | `packages/core/src/admin-users` | Dois consumidores previsíveis e já existentes: a edge function (Deno) e o painel (Vite). É a regra nº 1 das consequências do defeito 01 | não (decisão do agente) |
| A-10 | Limite de quantos admins | **Sem teto** | Nenhum custo técnico justifica um número, e um teto arbitrário viraria recusa inexplicável. O piso (≥ 1) é que é invariante | não (decisão do agente) |

**Open questions:** nenhuma — tudo acima está resolvido ou registrado como assumption.

---

## Dimensions sweep (Large — todas as nove)

| Dimensão | Onde resolve |
| --- | --- |
| Validação e limites de entrada | `USR-04`, `USR-05`, `USR-06`, `USR-21` |
| Falha e falha parcial | `USR-08` — conta criada e papel não concedido, o caso que deixa órfão |
| Idempotência / retry / duplicata | `USR-07` (e-mail já existe), `USR-13` (papel já revogado) |
| Fronteiras de auth e rate limit | `USR-01`, `USR-02`, `USR-03`, `USR-19`, `USR-30` |
| Concorrência / ordenação | `USR-16` — duas revogações simultâneas; quem decide é o banco, por contagem no commit |
| Ciclo de vida do dado | `USR-18` (link expira pelo GoTrue), `A-06` (sessão sobrevive à revogação) |
| Observabilidade | `USR-27` |
| Falha de dependência externa | `USR-26` — GoTrue fora do ar ⇒ motivo legível, nunca tela vazia |
| Integridade de transição de estado | `USR-14`, `USR-15`, `USR-16`, `USR-17`, `USR-34` |

---

## User Stories

### P1: A porta única — quem entra no painel se lê e se escreve por uma function ⭐ MVP

**User Story**: Como dona da loja, quero que a lista de quem acessa o painel venha de um lugar só e
com credencial de servidor, para que o e-mail de ninguém vaze para o navegador e para que não exista
uma segunda definição de "é admin".

**Why P1**: `auth.users` não é alcançável pelo PostgREST, e criar/apagar conta exige `service_role`.
Sem esta peça, nenhuma das outras histórias existe.

**Acceptance Criteria**:

1. `USR-01` — WHEN a function `admin-users` recebe requisição **sem** header `Authorization` THEN ela SHALL responder **401** com `{ error }` e **não** tocar em `auth.users`.
2. `USR-02` — WHEN a requisição chega com a **anon key** como bearer (JWT válido do projeto, sem `sub`) THEN a function SHALL responder **401**.
3. `USR-03` — WHEN a requisição chega autenticada por alguém **sem** papel `admin` THEN a function SHALL responder **403**, e o corpo SHALL dizer que o acesso é restrito ao admin.
4. `USR-19` — WHEN a checagem de papel falha por erro da RPC `has_role` THEN a function SHALL **fechar** o acesso (403) e registrar log distinto — falha de verificação nunca vira permissão.
5. `USR-20` — WHEN `?action=list` é chamado por um admin THEN a function SHALL devolver, para cada admin, `{ id, email, name, created_at, last_sign_in_at, is_self }`, e SHALL **não** devolver hash de senha nem qualquer campo de `raw_user_meta_data` além do nome.
6. `USR-25` — WHEN qualquer arquivo de `apps/**` referencia `SUPABASE_SERVICE_ROLE_KEY`, `service_role` ou `auth.admin.` THEN a suíte SHALL reprovar — a chave de servidor não entra no bundle do navegador.
7. `USR-26` — WHEN a API de administração do GoTrue responde erro ou fica indisponível THEN a tela SHALL mostrar o motivo da falha como **falha de leitura**, distinta de lista vazia, com ação de tentar de novo.
8. `USR-27` — WHEN a function conclui ou recusa uma ação de escrita THEN ela SHALL emitir **uma** linha de log JSON com `{ action, status }` e **sem** a senha em texto.

**Independent Test**: `curl` na function com (a) sem header, (b) anon key, (c) JWT de cliente comum,
(d) JWT de admin — e ver 401 · 401 · 403 · 200 com a lista.

---

### P1: Criar um acesso ao painel ⭐ MVP

**User Story**: Como dona da loja, quero criar um acesso para uma ajudante informando nome, e-mail e
uma senha inicial, para que ela entre no painel hoje sem eu compartilhar a minha senha.

**Why P1**: É o pedido literal, e é o que tira o ponto único de falha humano.

**Acceptance Criteria**:

1. `USR-04` — WHEN a Adri envia nome, e-mail e senha inicial válidos THEN o sistema SHALL criar a conta com **e-mail já confirmado** e conceder o papel `admin`, e a pessoa SHALL conseguir entrar em `/admin/login` imediatamente com aquela senha.
2. `USR-05` — WHEN o e-mail informado não casa `^[^\s@]+@[^\s@]+\.[^\s@]+$` THEN o sistema SHALL recusar **antes** de qualquer escrita, com o motivo `E-mail inválido`.
3. `USR-06` — WHEN a senha informada tem menos de `MIN_PASSWORD_LENGTH` (6) caracteres THEN o sistema SHALL recusar antes de escrever, nomeando o mínimo na mensagem.
4. `USR-21` — WHEN o nome informado é vazio ou só espaços THEN o sistema SHALL recusar com `Informe o nome de quem vai acessar`.
5. `USR-07` — WHEN o e-mail já pertence a uma conta existente THEN o sistema SHALL **não** criar segunda conta, e SHALL responder um motivo que diga o que fazer: se a conta já é admin, que ela já tem acesso; se não é, que o acesso pode ser concedido à conta existente.
6. `USR-08` — WHEN a conta é criada mas a concessão do papel `admin` falha THEN o sistema SHALL **desfazer a criação** (apagar a conta recém-criada) e responder erro — nunca deixar conta órfã sem papel, que é uma conta de loja criada por engano.
7. `USR-22` — WHEN a criação termina bem THEN a lista na tela SHALL passar a mostrar a pessoa **sem recarregar a página**.

**Independent Test**: criar `ajudante@exemplo.invalid` no painel, sair, e entrar com o e-mail e a
senha inicial — o painel abre.

---

### P1: Trocar a própria senha ⭐ MVP

**User Story**: Como pessoa logada no painel, quero trocar minha senha informando a atual e a nova,
para que eu possa rotacionar a senha sem passar pelo fluxo de "esqueci".

**Why P1**: É a segunda metade literal do pedido, e é independente de tudo acima — demonstrável
sozinha.

**Acceptance Criteria**:

1. `USR-09` — WHEN a pessoa informa a senha atual **correta** e uma senha nova válida THEN o sistema SHALL trocar a senha e confirmar na tela com texto visível.
2. `USR-10` — WHEN a senha atual informada está **errada** THEN o sistema SHALL recusar com `E-mail ou senha inválidos`, SHALL **não** trocar a senha, e a sessão SHALL continuar valendo (a pessoa não é deslogada por errar).
3. `USR-11` — WHEN a senha nova e a confirmação não conferem THEN o sistema SHALL recusar antes de qualquer chamada de rede.
4. `USR-12` — WHEN a senha nova é **igual** à atual THEN o sistema SHALL recusar com `A senha nova precisa ser diferente da atual.`
5. `USR-23` — WHEN a senha nova tem menos de `MIN_PASSWORD_LENGTH` caracteres THEN o sistema SHALL recusar antes de qualquer chamada de rede, nomeando o mínimo.
6. `USR-24` — WHEN qualquer erro do GoTrue chega a esta tela THEN a mensagem exibida SHALL vir de `authErrorMessage` — `error.message` cru **nunca** chega à tela.

**Independent Test**: em `/admin/conta`, trocar a senha, sair, e entrar com a nova.

---

### P1: Tirar alguém do painel, sem perder o painel ⭐ MVP

**User Story**: Como dona da loja, quero remover o acesso de alguém e ter certeza de que não consigo
me trancar para fora, para que a operação nunca fique sem ninguém que entre.

**Why P1**: É a metade destrutiva do CRUD, e a invariante que a torna segura precisa nascer com ela.

**Acceptance Criteria**:

1. `USR-13` — WHEN a Adri remove alguém do painel THEN o sistema SHALL apagar **apenas** a linha de `user_roles` com `role = 'admin'` daquela pessoa; a conta, a ficha de cliente e o histórico dela SHALL permanecer intactos.
2. `USR-14` — WHEN a pessoa a remover é **ela mesma** THEN o sistema SHALL recusar com motivo legível, e SHALL não escrever nada.
3. `USR-15` — WHEN a remoção deixaria o painel com **zero** admins THEN o sistema SHALL recusar com motivo legível, e SHALL não escrever nada.
4. `USR-16` — WHEN uma remoção que esvaziaria o painel chega **direto ao banco** (requisição forjada, `psql`, Studio, ou duas remoções simultâneas) THEN o **banco** SHALL recusar por trigger, decidindo por **contagem de admins restantes** e nunca pela identidade da linha.
5. `USR-17` — WHEN o papel de alguém é revogado THEN a próxima leitura de `has_role` para aquela pessoa SHALL devolver `false`, e toda escrita dela no banco SHALL passar a ser recusada pela RLS.

**Independent Test**: com dois admins, remover o outro (passa), tentar remover a si mesma (recusa
legível), remover o último pelo Studio (o banco recusa).

---

### P2: Editar, reenviar senha e apagar a conta

**User Story**: Como dona da loja, quero corrigir o nome ou o e-mail de um acesso, reenviar um link
de senha quando alguém esquece, e apagar de vez uma conta criada por engano.

**Why P2**: São os complementos do CRUD. Sem eles a feature entrega valor; com eles ela deixa de
exigir banco para casos comuns.

**Acceptance Criteria**:

1. `USR-28` — WHEN a Adri edita o nome THEN o sistema SHALL gravá-lo em `raw_user_meta_data.full_name` **e** em `public.customers.name` da mesma pessoa, para que as duas telas do painel não divirjam.
2. `USR-29` — WHEN a Adri edita o e-mail THEN o sistema SHALL trocá-lo já confirmado, e SHALL recusar se o endereço novo já pertencer a outra conta.
3. `USR-18` — WHEN a Adri aciona `Enviar link de redefinição` THEN o sistema SHALL disparar o e-mail de recuperação do GoTrue para aquele endereço, e a tela SHALL confirmar o envio nomeando o endereço.
4. `USR-30` — WHEN o envio do link é recusado por rate limit do GoTrue THEN a tela SHALL dizer para aguardar, e **não** SHALL afirmar que o e-mail foi enviado.
5. `USR-31` — WHEN a Adri aciona `Apagar conta` sobre alguém **sem** histórico (nenhum pedido, nenhuma nota, nenhuma mudança de status) THEN o sistema SHALL apagar a conta do `auth`, e a pessoa SHALL sumir da lista.
6. `USR-32` — WHEN a conta a apagar **tem** histórico THEN o sistema SHALL recusar **antes** de tentar apagar, com um motivo que **nomeie o que bloqueia e com quantos registros**, e SHALL oferecer `Remover do painel` como saída.
7. `USR-33` — WHEN o `delete` é tentado assim mesmo e o banco recusa por FK (`23503`) THEN a function SHALL traduzir o erro para o mesmo motivo legível — o banco é quem garante, a tela é quem explica.
8. `USR-34` — WHEN a conta a apagar é a **da própria pessoa logada**, ou a do **último admin**, THEN o sistema SHALL recusar, pelas mesmas réguas de `USR-14`/`USR-15`.
9. `USR-35` — WHEN a Adri aciona `Apagar conta` THEN a tela SHALL exigir confirmação digitando o **e-mail** da conta, e o botão SHALL permanecer desabilitado enquanto o texto não casar exatamente.

**Independent Test**: criar uma conta, apagá-la (passa); criar outra, deixá-la anotar algo num
pedido, tentar apagar (recusa nomeando a nota).

---

### P2: As duas telas na navegação

**User Story**: Como dona da loja, quero achar "Usuários do painel" e "Minha conta" onde já procuro
Configurações, para não caçar num menu de quatro eixos que falam da loja.

**Why P2**: Sem isto as rotas existem e ninguém as encontra.

**Acceptance Criteria**:

1. `USR-36` — WHEN o painel renderiza a coluna de navegação THEN `Usuários do painel` (`/admin/usuarios`) e `Minha conta` (`/admin/conta`) SHALL aparecer no **rodapé**, junto de `Configurações`, e **não** dentro de `navGroups`.
2. `USR-37` — WHEN as rotas são declaradas em `App.tsx` THEN elas SHALL estar sob `RequireAdmin`, e a sequência das rotas SHALL continuar casando com `navGroups` (`navItems.test.ts`).
3. `USR-38` — WHEN o trilho recolhido (`NavRail`) renderiza THEN ele SHALL mostrar os dois destinos novos, porque a lista dele **deriva** de `navGroups` + `footerNavItems` e não declara destino nenhum.

**Independent Test**: abrir o painel em 390px e em 1440px e achar os dois itens no rodapé da coluna.

---

## Edge Cases

- WHEN a function recebe `?action=` desconhecido THEN ela SHALL responder **400**, nunca 500.
- WHEN o corpo da requisição não é JSON válido THEN a function SHALL responder **400** com motivo.
- WHEN `?action=list` roda e **não há nenhum admin** (estado impossível pelo trigger, mas alcançável por restore de backup) THEN a tela SHALL mostrar estado vazio explicando, e **não** uma tabela em branco.
- WHEN a leitura da lista **falha** THEN a tela SHALL distinguir "quebrou" de "está vazio" — o defeito da tela de Coleções (`AD-014`).
- WHEN o e-mail tem espaços ou caixa alta THEN o sistema SHALL normalizar (`trim` + `toLowerCase`) antes de comparar e gravar.
- WHEN duas abas do painel removem a mesma pessoa ao mesmo tempo THEN a segunda SHALL terminar sem erro para a usuária (a linha já não existe), e não SHALL reportar falha.
- WHEN a pessoa logada troca a própria senha THEN a sessão dela SHALL permanecer ativa (a troca não a expulsa do painel).
- WHEN a senha inicial é digitada THEN a tela SHALL oferecer mostrar/ocultar o texto, e o campo SHALL ser `type="password"` por padrão.

---

## Requirement Traceability

| ID | Story | Fase | Status |
| --- | --- | --- | --- |
| USR-01 | P1: Porta única | Design | Pending |
| USR-02 | P1: Porta única | Design | Pending |
| USR-03 | P1: Porta única | Design | Pending |
| USR-19 | P1: Porta única | Design | Pending |
| USR-20 | P1: Porta única | Design | Pending |
| USR-25 | P1: Porta única | Design | Pending |
| USR-26 | P1: Porta única | Design | Pending |
| USR-27 | P1: Porta única | Design | Pending |
| USR-04 | P1: Criar acesso | Design | Pending |
| USR-05 | P1: Criar acesso | Design | Pending |
| USR-06 | P1: Criar acesso | Design | Pending |
| USR-07 | P1: Criar acesso | Design | Pending |
| USR-08 | P1: Criar acesso | Design | Pending |
| USR-21 | P1: Criar acesso | Design | Pending |
| USR-22 | P1: Criar acesso | Design | Pending |
| USR-09 | P1: Própria senha | Design | Pending |
| USR-10 | P1: Própria senha | Design | Pending |
| USR-11 | P1: Própria senha | Design | Pending |
| USR-12 | P1: Própria senha | Design | Pending |
| USR-23 | P1: Própria senha | Design | Pending |
| USR-24 | P1: Própria senha | Design | Pending |
| USR-13 | P1: Tirar do painel | Design | Pending |
| USR-14 | P1: Tirar do painel | Design | Pending |
| USR-15 | P1: Tirar do painel | Design | Pending |
| USR-16 | P1: Tirar do painel | Design | Pending |
| USR-17 | P1: Tirar do painel | Design | Pending |
| USR-28 | P2: Editar e apagar | Design | Pending |
| USR-29 | P2: Editar e apagar | Design | Pending |
| USR-18 | P2: Editar e apagar | Design | Pending |
| USR-30 | P2: Editar e apagar | Design | Pending |
| USR-31 | P2: Editar e apagar | Design | Pending |
| USR-32 | P2: Editar e apagar | Design | Pending |
| USR-33 | P2: Editar e apagar | Design | Pending |
| USR-34 | P2: Editar e apagar | Design | Pending |
| USR-35 | P2: Editar e apagar | Design | Pending |
| USR-36 | P2: Navegação | Design | Pending |
| USR-37 | P2: Navegação | Design | Pending |
| USR-38 | P2: Navegação | Design | Pending |

**Coverage:** 38 requisitos, 0 mapeados para tasks ainda.

---

## Success Criteria

- [ ] A Adri cria um segundo acesso e a pessoa entra no painel, sem ninguém abrir o Studio.
- [ ] Tentar esvaziar `user_roles` pelo Studio **falha**, com mensagem do trigger.
- [ ] Nenhum arquivo de `apps/**` cita `service_role` ou `auth.admin.`, e um teste garante isso.
- [ ] Trocar a própria senha funciona, e errar a senha atual não desloga nem troca nada.
- [ ] Apagar conta com histórico recusa nomeando o que bloqueia, em vez de vazar `23503`.
