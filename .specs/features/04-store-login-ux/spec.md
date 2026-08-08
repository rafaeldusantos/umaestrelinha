# Store Login UX Specification

Melhorias de UI/UX do login do cliente na Loja Virtual (`@nanapin/store`). Mobile-first.

## Problem Statement

O login atual (`/entrar`) é uma página dedicada com abas Entrar/Criar Conta baseadas em **e-mail + senha**, obrigando o usuário a criar e memorizar senha e a sair do fluxo de compra para navegar até a página. Isso gera atrito no primeiro acesso e nas ações que exigem conta (checkout, favoritar). O objetivo é um acesso **rápido, passwordless por padrão (código OTP por e-mail)**, disponível **no contexto** (modal no desktop, bottom sheet no mobile), sem perder o carrinho nem o lugar onde o usuário estava.

## Goals

- [ ] Reduzir o atrito de acesso: login/cadastro sem senha via **código OTP de 6 dígitos por e-mail**, com criação de conta implícita.
- [ ] Disponibilizar login **contextual** (modal desktop / bottom sheet mobile) acionável do ícone de conta e de ações gated, mantendo `/entrar` como fallback.
- [ ] Preservar contexto pós-login: **voltar à origem** e **manter o carrinho**.
- [ ] Manter caminhos alternativos: **senha** (login de quem já tem) + **reset de senha** + **Google OAuth** (nome automático).
- [ ] Padronizar a UI com o design system NanaPin (tokens `--nana-*`, shadcn/ui) e os fluxos redesenhados no Paper.

## Out of Scope

| Feature | Motivo |
| ------- | ------ |
| Login por SMS/telefone | Não há provedor de SMS configurado; e-mail cobre o público atual. |
| Login social além do Google (Apple, Facebook) | Só Google está configurado; expansão é trabalho futuro. |
| Novas edge functions | Todo o fluxo usa Supabase Auth nativo + trigger existente. Confirmado na análise. |
| Autenticação/login do backoffice | Escopo é a loja pública; backoffice usa `RequireAdmin` e permanece inalterado. |
| 2FA / MFA para contas | Fora do objetivo de "acesso rápido"; futuro. |
| Migração de senhas de usuários existentes | Usuários com senha continuam podendo usar senha; nada é migrado. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Método passwordless | Código OTP de 6 dígitos por e-mail (não magic link) | Decisão D2 do usuário | y |
| Superfície | Modal (desktop) + bottom sheet (mobile), contextual; `/entrar` = fallback | Decisão D1 | y |
| Coleta de nome | 1º acesso por e-mail pede nome após validar código; Google traz nome do provedor | Decisão D3 | y |
| Pós-login | Voltar à origem + preservar carrinho | Decisão D4 | y |
| Detecção de "primeiro acesso" | `customers.name` vazio após verificar OTP ⇒ mostrar passo de nome | Trigger `handle_new_customer` cria customer com name `''` | y |
| Expiração do código OTP | Padrão Supabase (config no painel); UI comunica "expira em ~10 min" sem hardcode de valor divergente do painel | Config de backend, não código | n |
| Cooldown de reenvio | 60s (alinha ao rate limit padrão do Supabase Auth) | Evita erro de rate limit e spam | n |
| Formato do código | 6 dígitos numéricos | Padrão de OTP e do template Supabase | y |
| Template de e-mail OTP | Usa `{{ .Token }}` (código), não `{{ .ConfirmationURL }}` | Necessário para verificação por código | n (config) |
| Nome do usuário-alvo | Copy pode usar tratamento feminino ("Bem-vinda") como no Paper | Consistência com o design existente | y |

**Open questions:** nenhuma bloqueante — itens de config de backend (expiração/cooldown/template) são parametrizáveis no painel Supabase e estão logados acima; serão confirmados na fase de Design/Execute.

---

## User Stories

### P1: Acesso rápido por código OTP (passwordless) ⭐ MVP

**User Story**: Como cliente da loja, quero entrar/cadastrar informando só meu e-mail e um código recebido, para acessar minha conta sem criar senha.

**Why P1**: É o caminho principal do design e o núcleo do "acesso mais rápido e fácil".

**Acceptance Criteria**:

1. WHEN o usuário informa um e-mail válido e aciona "Enviar código" THEN o sistema SHALL chamar `signInWithOtp({ email, options: { shouldCreateUser: true } })` e avançar para a tela "Digite o código".
2. WHEN o e-mail é inválido ou vazio THEN o sistema SHALL bloquear o envio e exibir mensagem de validação sem chamar o backend.
3. WHEN o usuário informa os 6 dígitos corretos e confirma THEN o sistema SHALL chamar `verifyOtp({ email, token, type: 'email' })`, estabelecer a sessão e prosseguir para o pós-login (AUTH-06) ou, se primeiro acesso, para a captura de nome (AUTH-04).
4. WHEN o código é inválido ou expirado THEN o sistema SHALL manter o usuário na tela de código e exibir erro específico, sem limpar o e-mail em contexto.
5. WHEN a chamada de envio/verificação falha por rede THEN o sistema SHALL exibir erro recuperável e permitir nova tentativa.

**Independent Test**: Abrir o login, inserir e-mail, receber a tela de código, inserir código válido (ambiente de teste) e verificar sessão criada.

---

### P1: Login contextual (modal desktop / bottom sheet mobile) ⭐ MVP

**User Story**: Como cliente, quero fazer login sem sair da página onde estou, para não perder o contexto de navegação/compra.

**Why P1**: Superfície decidida (D1); habilita o "voltar à origem".

**Acceptance Criteria**:

1. WHEN o usuário aciona login pelo ícone de conta (desktop) THEN o sistema SHALL abrir um **modal** centralizado com o painel de marca à esquerda e o formulário à direita.
2. WHEN o usuário aciona login no mobile THEN o sistema SHALL abrir um **bottom sheet** com o formulário.
3. WHEN o usuário aciona uma ação que exige conta estando deslogado (ex.: finalizar checkout, favoritar) THEN o sistema SHALL abrir a mesma superfície de login no contexto, sem navegar para outra rota.
4. WHEN o usuário acessa `/entrar` diretamente THEN o sistema SHALL renderizar o mesmo componente de login (fallback/deep-link).
5. WHEN o usuário fecha (✕ ou backdrop/gesto) THEN o sistema SHALL fechar a superfície preservando o estado da página de origem.

**Independent Test**: Clicar no ícone de conta deslogado no desktop abre modal; no mobile abre sheet; acessar `/entrar` renderiza o mesmo conteúdo.

---

### P1: Captura de nome no primeiro acesso ⭐ MVP

**User Story**: Como novo cliente que entrou por código, quero informar meu nome uma vez, para personalizar minha conta.

**Why P1**: Sem esse passo, contas criadas por OTP ficam com nome vazio (trigger cria `name=''`).

**Acceptance Criteria**:

1. WHEN um OTP é verificado com sucesso e `customers.name` está vazio THEN o sistema SHALL exibir o passo "Como podemos te chamar?" antes de concluir o login.
2. WHEN o usuário confirma um nome não-vazio THEN o sistema SHALL persistir o nome em `customers.name` e nos metadados do usuário e então prosseguir ao pós-login.
3. WHEN o login é via Google THEN o sistema SHALL NÃO exibir o passo de nome (nome vem do provedor).
4. WHEN o usuário já possui `customers.name` preenchido (acesso recorrente) THEN o sistema SHALL pular o passo de nome.

**Independent Test**: Primeiro acesso por OTP mostra o passo de nome; segundo acesso não mostra.

---

### P1: Pós-login volta à origem e preserva carrinho ⭐ MVP

**User Story**: Como cliente, quero continuar de onde parei após entrar, para concluir a ação que iniciei.

**Why P1**: Decisão D4; principal ganho de "acesso rápido".

**Acceptance Criteria**:

1. WHEN o login conclui a partir de uma ação gated (ex.: checkout) THEN o sistema SHALL retornar o usuário à origem e retomar/possibilitar a ação.
2. WHEN o login conclui THEN o sistema SHALL preservar o conteúdo do carrinho (nenhum item perdido).
3. WHEN o login foi aberto como modal/sheet contextual THEN o sistema SHALL fechar a superfície sem navegar para outra rota.
4. WHEN o login ocorre via ícone de conta (sem origem específica) THEN o sistema SHALL direcionar para `/conta`.

**Independent Test**: Deslogado no checkout → login → retorna ao checkout com o carrinho intacto.

---

### P2: Login por senha (fallback) + mostrar/ocultar

**User Story**: Como cliente que já tem senha, quero poder entrar com senha, para usar meu método habitual.

**Why P2**: Caminho secundário do design; suporta base existente.

**Acceptance Criteria**:

1. WHEN o usuário aciona "Prefere usar senha? Clique aqui" THEN o sistema SHALL exibir o formulário de e-mail + senha.
2. WHEN o usuário aciona o toggle de visibilidade THEN o sistema SHALL alternar entre texto e máscara da senha.
3. WHEN credenciais são inválidas THEN o sistema SHALL exibir "E-mail ou senha inválidos".
4. WHEN o usuário aciona "Sem senha? Receber código por e-mail" THEN o sistema SHALL retornar ao fluxo OTP mantendo o e-mail digitado.

**Independent Test**: Alternar para senha, logar com credenciais válidas, e alternar de volta para OTP preservando o e-mail.

---

### P2: Reenvio de código com cooldown

**User Story**: Como cliente que não recebeu o código, quero reenviá-lo, para concluir o acesso.

**Why P2**: Robustez do fluxo OTP.

**Acceptance Criteria**:

1. WHEN o usuário aciona "Reenviar código" após o cooldown THEN o sistema SHALL reenviar o OTP e reiniciar o cooldown.
2. WHILE o cooldown está ativo THEN o sistema SHALL desabilitar o reenvio e exibir a contagem regressiva.
3. WHEN o reenvio é bloqueado por rate limit do backend THEN o sistema SHALL exibir mensagem orientando aguardar.

**Independent Test**: Acionar reenvio, ver cooldown ativo, e reenvio habilitado após expirar.

---

### P2: Reset de senha

**User Story**: Como cliente com senha esquecida, quero solicitar redefinição, para recuperar o acesso.

**Why P2**: Presente no design ("Esqueceu a senha?").

**Acceptance Criteria**:

1. WHEN o usuário aciona "Esqueceu a senha?" e informa e-mail válido THEN o sistema SHALL chamar `resetPasswordForEmail` com `redirectTo` apropriado e confirmar o envio.
2. WHEN o e-mail é inválido THEN o sistema SHALL exibir validação sem chamar o backend.

**Independent Test**: Solicitar reset com e-mail válido e ver a confirmação de envio.

---

### P3: Painel de marca/benefícios no modal desktop

**User Story**: Como visitante no desktop, quero ver os benefícios da NanaPin ao logar, para reforçar a decisão de comprar.

**Why P3**: Enriquecimento visual; não bloqueia o acesso.

**Acceptance Criteria**:

1. WHEN o modal de login abre no desktop THEN o sistema SHALL exibir o painel gradiente com logo, tagline e checklist (frete grátis acima de R$150, drops exclusivos, +2.000 colecionadores).
2. WHEN em mobile (bottom sheet) THEN o sistema SHALL omitir o painel de marca por restrição de espaço.

---

### P3: Google OAuth padronizado

**User Story**: Como cliente, quero entrar com Google em um clique, para o acesso mais rápido possível.

**Why P3**: Já existe; entra para padronização visual e integração ao pós-login.

**Acceptance Criteria**:

1. WHEN o usuário aciona "Continuar com Google" THEN o sistema SHALL iniciar `signInWithOAuth` com `redirectTo` que retome a origem quando aplicável.
2. WHEN o retorno do Google conclui THEN o sistema SHALL aplicar o pós-login (AUTH-06) sem passo de nome.

---

## Edge Cases

- WHEN o e-mail contém espaços/maiúsculas THEN o sistema SHALL normalizar (trim/lowercase) antes de enviar.
- WHEN o usuário cola um código com espaços ou de 6 dígitos por partes THEN o sistema SHALL aceitar/normalizar a entrada.
- WHEN o usuário fecha a superfície na tela de código e reabre THEN o sistema SHALL permitir reiniciar informando o e-mail novamente (sem estado órfão).
- WHEN o backend retorna rate limit no envio inicial THEN o sistema SHALL exibir mensagem clara e manter o e-mail digitado.
- WHEN a sessão já está ativa e o usuário aciona login THEN o sistema SHALL não reabrir o fluxo (ou direcionar direto para `/conta`).
- WHEN o nome informado no 1º acesso é só espaços THEN o sistema SHALL rejeitar como vazio.
- WHEN o OTP verifica com sucesso mas a atualização do nome falha THEN o sistema SHALL manter a sessão e permitir completar o nome depois (não travar o acesso).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Login contextual (modal/sheet + /entrar) | Design | Verified |
| AUTH-02 | P1: OTP — envio de código | Design | Verified |
| AUTH-03 | P1: OTP — verificação de código | Design | Verified |
| AUTH-04 | P1: Captura de nome no 1º acesso | Design | Verified |
| AUTH-05 | P1: Pós-login volta à origem + carrinho | Design | Verified |
| AUTH-06 | P2: Login por senha + mostrar/ocultar | Design | Verified |
| AUTH-07 | P2: Reenvio de código com cooldown | Design | Verified |
| AUTH-08 | P2: Reset de senha | Design | Verified |
| AUTH-09 | P3: Painel de marca/benefícios (desktop) | - | Verified |
| AUTH-10 | P3: Google OAuth padronizado + pós-login | Design | Verified |
| AUTH-11 | Config Supabase Auth (template OTP, expiração, rate limit, redirect URLs) | Design | Verified |
| AUTH-12 | Redesenho dos fluxos no Paper (mobile + desktop) | Design | Verified |

**ID format:** `AUTH-[NUMBER]`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 0 mapeados a tasks (Tasks ainda não gerada).

---

## Success Criteria

- [ ] Novo cliente consegue criar conta e entrar apenas com e-mail + código, sem definir senha, em < 60s.
- [ ] Login disponível sem sair da página (modal/sheet) a partir do ícone de conta e de ações gated.
- [ ] Após login iniciado no checkout, o usuário retorna ao checkout com o carrinho intacto.
- [ ] Nenhuma edge function nova é criada; apenas configuração do Supabase Auth.
- [ ] Fluxos redesenhados no Paper (mobile + desktop) refletem OTP + captura de nome e servem de base para a UI.
- [ ] UI segue tokens/`nana-*` e componentes shadcn, aprovada nos checkpoints de review do Paper.
