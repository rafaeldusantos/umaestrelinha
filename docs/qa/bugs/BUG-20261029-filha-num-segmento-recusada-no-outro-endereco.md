# BUG-20261029-filha-num-segmento-recusada-no-outro-endereco: o endereço de uma subcategoria com um segmento só, que a loja abre, é recusado como "não há página da loja"

- **Status:** verified
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Adri montando o menu
- **Journey Step:** J-montar-o-menu-da-loja, Adicionar item (ou ao submenu) → Página da loja → Outro endereço da loja
- **Scenarios:** PNL-menu-outro-endereco-invalido
- **Found:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r3.md

## Summary

**Da `86`, do caminho da correção Q03/R01.** A loja abre uma subcategoria também pelo endereço de um segmento só
(`/colar-e-correntes` mostra a coleção "Colar e correntes", filha de "Joias e acessórios" — é a regra de `AD-018`:
`categories.slug` é único, a forma curta resolve). O "Outro endereço da loja" do painel recusa esse mesmo endereço com
"Não há página da loja em “/COLAR-E-CORRENTES”. Escolha a página na lista acima, ou confira o endereço abrindo a página
na loja." — e, se a Adri seguir o conselho e abrir o endereço na loja, a página está lá. A frase afirma o falso. A
forma de dois segmentos (`/joias-e-acessorios/colar-e-correntes`, a que a própria loja usa nos links) passa, então o
caminho de quem copia da barra do navegador funciona; o atrito é de quem lembra só o nome da coleção. Não grava nada
errado: só recusa um endereço bom.

## Reproduction

- **Charter:** CH-menu-limites-e-enderecos-invalidos · **Tour:** Garbage Tour
- **Environment:** 390 × 844, painel dev :8083, loja dev :8082, Supabase local, pt-BR

1. Na loja, abrir `/colar-e-correntes`: a coleção "Colar e correntes" aparece (h1, sem 404).
2. `/admin/menu` → submenu de "Joias afetivas" → "Adicionar ao submenu" → "Página da loja" → "Outro endereço da loja".
3. Endereço `/COLAR-E-CORRENTES` (ou `/colar-e-correntes`), nome "Colares" → "Adicionar".

**Expected:** passa e grava na forma canônica (`/joias-e-acessorios/colar-e-correntes`), como `/SOBRE/` vira `/sobre`; ou, se a forma curta não deve entrar, uma frase que não diga que a página não existe.
**Actual:** o seletor fica aberto com "Não há página da loja em …"; nenhum PATCH.

## Evidence

- Saída da sessão S1 (report): `{"href":"/COLAR-E-CORRENTES","aberto":true,"recusa":"Não há página da loja em …","escritas":[]}`; loja: `/colar-e-correntes → h1 "Colar e correntes", 404? false`.

## Correção (2026-10-29, S01 das "Correções do QA r3")

- `conferirEnderecoDaLoja` (`apps/backoffice/src/features/store-menu/model/enderecoDaLoja.ts`) decide categoria pela régua da loja, `resolveCategoryRoute` (`@estrelinha/core/page/categoryRoute`, `AD-018`), sobre as ativas: a forma de um segmento de uma filha ativa passa, em qualquer caixa e com barra final, e o que se grava é a canônica (`categoryHref`, dois segmentos), com a query e o fragmento que vieram junto. Nenhuma regra nova de rota foi escrita no painel.
- Continuam recusados, cada um com o motivo dele: a coleção desativada ("A coleção de “…” está fora do ar (desativada), e a loja não mostra a página dela. Ative a coleção em Categorias, ou escolha outra página." — nunca "Não há página"), o slug repetido entre duas ativas ("Mais de uma coleção usa o endereço …"), o pai errado (que a loja só redireciona) e três segmentos.
- Testes que reprovaram antes: `enderecoDaLoja.test.ts` bloco "S01" (+10, inclusive a propriedade: o aceito pela forma curta passa em `menuDocumentRefusal` na raiz e no submenu) e duas entradas novas na propriedade R01 (`/joia-afetiva-linha-pet`, `/JOIA-AFETIVA-LINHA-PET/`); `AdminMenuPage.test.tsx` "S01" pela página real (`/aneis` e `/ANEIS/` gravam `/joias/aneis`; `/antiga`, inativa, recusa com "fora do ar" e sem PATCH). **Uma asserção antiga foi invertida pelo requisito**: `conferirEnderecoDaLoja('/aneis')` exigia a recusa — era o bug —, e agora exige `/joias-afetivas/aneis`, com a vizinha `/inventada` recusada ao lado.
- Navegador (390 e 1440, painel :8083, Supabase local): `/COLAR-E-CORRENTES/` grava 1 PATCH e o banco fica com `target.href = /joias-e-acessorios/colar-e-correntes`; `/colar-e-correntes` em seguida é "Já está no menu."; `/black-friday` e `/profissoes` (inativas) dizem "fora do ar", sem PATCH; `/inventada-xyz` continua "Não há página da loja". `store_settings.menu` restaurado, diff vazio com `updated_at`.

## Verification (rodada 4)

- **Retested:** 2026-10-29 · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste-r4.md
- **Result:** verified — pelos passos originais em 390 e 1440: `/COLAR-E-CORRENTES/` (raiz) grava 1 PATCH com `target.href = /joias-e-acessorios/colar-e-correntes`; `/colar-e-correntes` e `/Joias-E-Acessorios/Colar-E-Correntes` em seguida: "Já está no menu."; `/aneis?ordem=novos#topo` grava `/joias-e-acessorios/aneis?ordem=novos#topo`; no submenu `/Nomes/` grava `/personalizados/nomes`. A loja abre as três pelo menu (h1 "Colar e correntes", "Anéis", "Nomes"). `/black-friday`, `/profissoes`, `/personalizados/profissoes` dizem "A coleção de … está fora do ar (desativada)…", sem PATCH; pai errado, 3 segmentos e `/inventada-xyz` seguem "Não há página da loja". Evidência: `r4-01-forma-curta-grava-{390,1440}.png`, `r4-02-fora-do-ar-{390,1440}.png`.
