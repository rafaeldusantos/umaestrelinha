# BUG-20261029-caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar: digitar o caminho de uma coleção ativa fecha o seletor e o item não entra, com a lista antiga de 19 endereços

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando o menu
- **Journey Step:** J-montar-o-menu-da-loja, Adicionar item → Página da loja → Outro endereço da loja
- **Scenarios:** PNL-menu-outro-endereco-invalido
- **Found:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md

## Summary

**Da `86`, introduzido pela correção Q03.** A Adri cola em "Outro endereço da loja" o endereço de uma coleção que existe
e está ativa (ela copiou da barra do navegador): `/botanicas` ou `/joias-afetivas/joia-afetiva-linha-pet`. O seletor
aceita — fecha, como fecha quando dá certo —, mas o item **não entra**: aparece o aviso "Não foi possível salvar ·
“/botanicas” não é um endereço da loja, e o item levaria a uma página que não existe. Endereços aceitos: /, /produtos,
/produto, /colecao, … (19 endereços). Para levar a uma coleção ou a uma peça, escolha o destino pelo nome…". Nenhuma
requisição sai. O que ela digitou se perde, e as duas telas se contradizem: o seletor achou o endereço válido e a
gravação diz que a página não existe; a lista do aviso inclui `/produtos`, que o próprio seletor recusa. São dois
donos da regra "este endereço é da loja?": `conferirEnderecoDaLoja` (painel, aceita caminho de categoria ativa) e a
recusa de link de `core/menu` (só rotas fixas).

## Reproduction

- **Charter:** CH-menu-limites-e-enderecos-invalidos · **Tour:** Garbage Tour
- **Environment:** 390 × 844 (e 1440), painel dev :8083, Supabase local, pt-BR

1. `/admin/menu` → "Adicionar item" → aba "Página da loja" → "Outro endereço da loja".
2. Endereço `/botanicas` (coleção ativa "Coleção Botânicas"), nome "Botânicas" → "Adicionar".

**Expected:** ou o item entra (como link para a coleção, ou convertido para o item de categoria), ou o seletor recusa
ali mesmo, com o campo à vista, dizendo para escolher a coleção na aba Categoria.
**Actual:** o seletor fecha, o aviso "Não foi possível salvar" com a lista de 19 endereços aparece, o menu não muda e
nenhum PATCH é enviado. O mesmo com `/joias-afetivas/joia-afetiva-linha-pet` (subcategoria ativa). `/black-friday`
(inativa) é recusada corretamente no seletor.

## Evidence

- `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste/r2-07-caminho-de-colecao-some-390.png`
- Banco: `store_settings.menu` sem item para os dois caminhos; nenhuma requisição `rest/v1` registrada no clique.

## Correção (2026-10-29, R01 das "Correções do QA r2")

- **Um dono por pergunta.** `core` decide a FORMA do link: `menuLinkPathRefusal` (`packages/core/src/menu/refusals.ts`) aceita qualquer caminho interno bem formado — rota fixa, caminho de categoria (1 ou 2 segmentos), `/produtos/<slug>` — e recusa `javascript:`, espaço, aspas, `<>`, barra dupla, `.`/`..` e `//host`, com uma frase sem a lista de rotas. `internalMenuHrefRefusal` (criação) e `menuDocumentRefusal` (gravação) passam a usá-la. A EXISTÊNCIA fica só em `conferirEnderecoDaLoja` (painel), na hora de criar.
- O destino de **banner** (`menuTargetRefusal`, da 39) **não mudou**: segue restrito às rotas fixas (o banner escolhe coleção pelo nome).
- Testes que reprovaram antes: core `refusals.test.ts` bloco "R01" (16 casos); backoffice `enderecoDaLoja.test.ts` bloco "R01 — propriedade" (para cada endereço aceito pelo seletor — rota fixa, coleção raiz, filha, peça à venda —, `menuDocumentRefusal` do documento resultante é `null`, na raiz e no submenu: 4 reprovavam com a régua antiga); `AdminMenuPage.test.tsx` "R01" pela página real (coleção raiz, filha e grafia da barra gravam, sem aviso de 19 endereços: 3 reprovavam).
- Navegador (painel :8083, Supabase local, 390): `/joias-afetivas/joia-de-leite-materno` e `/botanicas` entraram, 2 PATCH, sem aviso; `store_settings.menu` restaurado (`diff` vazio).

## Verification

- **Retested:** 2026-10-29, Adri montando o menu, 390 × 844, pelos passos originais (rodada 3) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md
- **Result:** no menu principal, `/BOTANICAS/` ("Botânicas") e `/Joias-Afetivas/Joia-Afetiva-Linha-Pet/` ("Linha Pet") fecham o seletor com **um PATCH** cada, sem aviso de 19 endereços; o banco grava `/botanicas` e `/joias-afetivas/joia-afetiva-linha-pet` (normalizados). No submenu de "Joias afetivas", `/Personalizados/Nomes/` grava `/personalizados/nomes` (1 PATCH). Recarregar mostra os três; na loja, a barra de 1440 e a folha de 390 mostram Botânicas e Linha Pet, o acordeão de Joias afetivas traz `/personalizados/nomes`, e os três endereços abrem a coleção certa (h1 "Coleção Botânicas", "Linha Pet", "Nomes"). As recusas seguem (ver o report). Evidência: `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-01-colecao-raiz-grava-390.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-03-colecao-filha-no-submenu-390.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-04-loja-1440.png`, `evidence/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3/r3-04-loja-390.png`.
- **Ao lado (bug novo, não reabre este):** a FILHA escrita com um segmento (`/COLAR-E-CORRENTES`, que a loja serve por `AD-018`) é recusada com "Não há página da loja" — `BUG-20261029-filha-num-segmento-recusada-no-outro-endereco`.
