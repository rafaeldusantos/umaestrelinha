# BUG-20260802-primeiro-login-do-admin-volta-para-a-tela: a senha certa devolve a lojista para o login vazio, sem dizer nada

- **Status:** verified <!-- open | fixed | verified | wont-fix | invalid -->
- **Impact (user-side):** Blocks-Completion
- **Severity:** Critical · **Priority:** P0
- **Persona Affected:** Nana
- **Journey Step:** entrada de **toda** journey de backoffice — o login é o passo 0 de `J-cadastrar-produto-com-grade`, `J-achar-e-corrigir-na-listagem` e das outras seis
- **Scenarios:** ADM-primeiro-login-entra
- **Found:** 2026-08-02 · **Report:** `../reports/2026-08-02-backoffice-catalogo-11-14.md`

## Summary

A lojista abre o backoffice, digita e-mail e senha **corretos** e clica em Entrar. A tela pisca e ela
está de volta no formulário de login — **vazio, sem nenhuma mensagem**. Nada diz que deu certo, nada diz
que deu errado. Do lugar dela, a leitura óbvia é "errei a senha".

Se ela digitar exatamente a mesma senha de novo, entra. O segundo login sempre funciona.

É o portão de entrada de todo o backoffice, e passou meses sem ninguém perceber porque nenhuma persona
havia andado essas telas — este é o primeiro ciclo de QA do backoffice.

## Reproduction

- **Charter:** CH-cadastro-de-produto-com-grade · **Tour:** Feature Tour
- **Environment:** desktop 1440×900, wifi-fast, pt-BR, sessão de navegador **limpa** (o estado limpo é
  parte da reprodução — com `isAdmin` já resolvido em memória o bug não aparece)

1. Abrir `http://localhost:8081/admin/produtos` numa sessão nova → o guard manda para `/admin/login`
2. Preencher `admin@nanapin.dev` / `admin123` (credenciais válidas, papel admin no banco)
3. Enviar o formulário (Enter ou clicar em Entrar)

**Expected:** entrar no painel — a listagem de produtos que ela pediu, ou o dashboard.
**Actual:** volta para `/admin/login` com os dois campos limpos e **sem mensagem de erro**. Repetir o
mesmo login entra normalmente.

## Evidence

- `../evidence/2026-08-02-backoffice-catalogo-11-14/login-primeira-tentativa-nao-entra.png` — formulário
  vazio depois da tentativa com credenciais certas
- **Rede durante a tentativa que falha** (sessão fria): `POST /auth/v1/token?grant_type=password` → **200**;
  `GET /rest/v1/user_roles?...&role=eq.admin` → **200**; `GET /rest/v1/customers?...` → **200**. Ou seja: a
  autenticação **e** a checagem de papel deram certo, e ela foi expulsa mesmo assim.
- **Caminho de leitura independente:** o mesmo `GET user_roles` replicado por `curl` com token real
  devolve `[{"role":"admin"}]` — o papel existe e é legível. O problema não é permissão.
- Numa segunda sessão fria o `user_roles` da tentativa que falha veio **401** em vez de 200, e o resultado
  para a usuária foi idêntico. Ou seja, há um segundo modo de falha (corrida com a propagação do JWT) que
  produz o mesmo sintoma — mas o bug **reproduz com 200**, então permissão não é a causa raiz.
- **Não é regressão do rebrand:** `git show 59acc60 -- AdminLoginPage.tsx` mudou só o texto do `<h1>`
  (`Admin NanaPin` → `Admin Nanita`). O comportamento vem desde o split do monorepo (`07f7527`).

## Fix

<!-- filled when status moves to fixed -->
- **Root cause:** corrida entre a navegação e a resolução do papel, com um `loading` que nunca volta a
  ser `true`.
  - `AdminLoginPage.handleLogin` ([`AdminLoginPage.tsx:20-26`](../../apps/backoffice/src/pages/admin/AdminLoginPage.tsx#L20-L26))
    chama `signInWithPassword` e **navega imediatamente** para `/admin`, sem esperar o contexto saber que
    ela é admin.
  - `AuthProvider.loadUserData` ([`AuthContext.tsx:69-81`](../../packages/auth/src/AuthContext.tsx#L69-L81))
    é assíncrono (`checkAdmin` + `fetchCustomer` em `Promise.all`) e só faz `setLoading(false)` **no fim** —
    **nunca faz `setLoading(true)` no início**. Depois do `getSession()` inicial (sem sessão), `loading`
    fica `false` para sempre.
  - Resultado: quando `RequireAdmin` ([`RequireAdmin.tsx:14-26`](../../packages/auth/src/RequireAdmin.tsx#L14-L26))
    renderiza, ele lê `loading === false` (obsoleto) e `isAdmin === false` (ainda não resolvido) e conclui
    "não é admin" → `<Navigate to="/admin/login" replace />`. Milissegundos depois `isAdmin` vira `true`,
    mas a tela de login não observa `isAdmin` e ninguém a leva para dentro.
  - No segundo envio o `isAdmin` já está `true` no contexto, então a navegação cola. É por isso que
    "tentar de novo" resolve.
- **Segunda causa, encontrada durante a correção — e é ela que explica o `401`:** `loadUserData` era
  chamada **de dentro** do callback do `onAuthStateChange`, e ela chama `supabase.from(...)`. É a
  armadilha documentada do `supabase-js` (o próprio arquivo já trazia o comentário *"never await inside
  this callback"*, sem cumpri-lo): a leitura de `user_roles` sai antes de a sessão nova estar acoplada
  ao client e o PostgREST responde **401**. `checkAdmin` engole o erro e devolve `false`.
  Foi o que apareceu no retest: com só a correção de navegação aplicada, uma em cada duas sessões frias
  passou a exibir **"Esta conta não tem acesso ao painel."** — uma frase confiante e errada, pior que o
  vaivém silencioso. Sem tirar a leitura de dentro do callback, a correção da navegação **não** resolve.
- **Fix commit:** `f620217` — três peças, uma causa:
  1. `AuthContext`: `loading` volta a `true` enquanto papel e cliente estão em voo (com `resolvedFor`
     para que refresh de token do mesmo usuário não pisque a loja);
  2. `AuthContext`: a resolução sai de dentro do callback do `onAuthStateChange` (`setTimeout(0)`);
  3. `AdminLoginPage`: quem navega é um efeito que espera o papel resolver — e conta autenticada sem
     permissão recebe uma frase em vez de vaivém.
- **Regression test:**
  - `apps/store/src/features/auth/__tests__/authContext.test.tsx` — `loading` fica `true` durante a
    resolução; refresh do mesmo usuário não re-resolve nem pisca. **2 falham** sem a correção.
  - `apps/backoffice/src/pages/admin/AdminLoginPage.test.tsx` — não navega antes de o papel resolver;
    navega quando resolve admin; explica quando não é admin; credencial errada segue avisando.
    **3 falham** sem a correção.

## Verification

- **Retested:** 2026-08-02, mesma persona (Nana) e mesmo caminho de entrada · **Report:**
  `../reports/2026-08-02-backoffice-catalogo-11-14.md`
- **Result:** **5 de 5 sessões de navegador frias entraram no painel na primeira tentativa**, e o
  `GET user_roles` voltou 200 nas que foram inspecionadas. Senha errada continua mostrando "E-mail ou
  senha inválidos". Evidência:
  `../evidence/2026-08-02-backoffice-catalogo-11-14/login-primeira-tentativa-entra-corrigido.png`.
- **Journeys adjacentes re-andadas** (o `AuthProvider` serve os dois apps): loja com 16 cards na home;
  `/conta` deslogada abre o overlay sem travar em "Carregando..."; `/checkout` deslogada mostra "Faça
  login para continuar" sem travar. Nenhuma das duas telas que leem `loading` ficou presa.

<!-- Paper cut observado no retest, não corrigido: entrar por `/admin/produtos` leva ao `/admin`
     (dashboard) depois do login — a intenção do deep link se perde. Comportamento antigo, alheio a
     este bug. -->

