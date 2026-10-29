# BUG-20261028-outro-endereco-aceita-pagina-que-nao-existe: "Outro endereço da loja" aceita /produtos/<peça que não existe> e grafias diferentes da mesma página

- **Status:** verified
- **Impact (user-side):** Trust-Damage
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Adri montando o menu → Cliente navegando pelo menu
- **Journey Step:** J-montar-o-menu-da-loja, adicionar página por endereço digitado → J-navegar-pelo-menu-da-loja
- **Scenarios:** PNL-menu-outro-endereco-invalido; LOJA-menu-depois-de-gravar-390-e-1440
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-menu-montado-pela-dona.md

## Summary

**Da `86`.** O campo recusa bem endereço externo, `//host`, `javascript:`, vazio e caminho que não é rota. Mas
**aceita e grava** `/produtos/inexistente`: o item vai para a barra da loja e leva a cliente a "Essa página não
existe." (404). Também aceita `/sobre/` e `/SOBRE` como itens separados de `/sobre` (os três abrem a página no
dev; no servidor de produção a grafia com maiúsculas não foi conferida), e a mesma página pode entrar duas vezes
(`/perguntas-frequentes`) sem "Já está no menu". Detalhes de texto: a recusa de `javascript:alert(1)` cita
"/javascript:alert(1)" (barra acrescentada) e despeja 19 endereços aceitos, entre eles prefixos que não são página
(`/produto`, `/colecao`, `/categoria`, `/pedido`).

## Reproduction

- **Charter:** CH-menu-limites-e-enderecos-invalidos · **Tour:** Garbage Tour
- **Environment:** 390 × 844, painel dev, loja dev, Supabase local

1. `/admin/menu` → Adicionar item → Página da loja → Outro endereço da loja.
2. Nome "TESTE-86-QA- link", endereço `/produtos/inexistente` → Adicionar.
3. Abrir a loja e tocar o item.

**Expected:** recusa com motivo ("não há peça com esse endereço — escolha a peça pelo nome"), como as outras recusas; `/sobre/` e `/SOBRE` gravados como `/sobre` (ou recusados como repetidos).
**Actual:** "“…” entrou no fim do menu."; a loja mostra o item e leva a "Essa página não existe.".

## Evidence

- Relatório, sessão 6 (tabela de entradas e do que foi gravado); recusa de externo: `evidence/2026-10-28-backoffice-menu-montado-pela-dona/86-qa-11-endereco-recusado-390.png`

## Correção

- **Rodada:** correções do QA r1 da `86` (2026-10-29), sem commit.
- **O quê / onde:** `features/store-menu/model/enderecoDaLoja.ts` (`conferirEnderecoDaLoja`: rota fixa de `SITEMAP_STATIC_PATHS`/`NON_INDEXABLE_PATHS`, caminho de categoria ATIVA por `categoryHref`, ou `/produtos/<slug>` conferido por `entities/product/api/activeProductBySlug.ts` — uma leitura por `slug` + `is_active`); a recusa cita o digitado, sem a lista de 19 endereços. Normalização por `menuHrefKey` (`core/menu/menu.ts`: `normalizeMenuHref` + caminho em minúsculas). Repetida: `menuDocumentRefusal` (`core/menu/refusals.ts`) recusa a mesma página no menu principal e no mesmo submenu (tolerando a repetição que já vinha no documento anterior), e o seletor desabilita a página já usada com "Já está no menu".
- **Teste que prova:** core `refusals.test.ts` ("menuHrefKey" e "a mesma página duas vezes (Q03)", 7 casos, 6 vermelhos antes); `enderecoDaLoja.test.ts` (6); `MenuTargetPicker.test.tsx` bloco Q03 (8, vermelhos antes); `AdminMenuPage.test.tsx` 3 casos Q03 pela página real (peça inexistente, peça à venda, `/SOBRE/` repetido).


## Verification

- **Retested:** 2026-10-29, mesma persona/jornada (rodada 2) · **Report:** reports/2026-10-29-backoffice-menu-montado-pela-dona-reteste.md
- **Result:** 390, "Outro endereço da loja": recusados com motivo `https://google.com`, `//evil.com`, `javascript:alert(1)`, vazio, só espaços, `/categoria-que-nao-existe`, `/produtos/inexistente`, `/produtos/<peça inativa>`, `/produtos`, `/perguntas-frequentes/xyz`, `/black-friday` (inativa); `/SOBRE/` gravado como `/sobre`; depois dele `/sobre`, `/sobre/`, `/Sobre ` e `/Perguntas-Frequentes/` recusados com "Já está no menu."; na lista, Sobre e Perguntas frequentes desabilitados com "Já está no menu". Aceitos e gravados: `/produtos/<peça à venda>`, `/conta`, `/perguntas-frequentes`. **Achado novo** (não reabre este): caminho de coleção ativa (`/botanicas`, `/joias-afetivas/joia-afetiva-linha-pet`) passa pelo seletor e é recusado depois, ao gravar — `BUG-20261029-caminho-de-colecao-passa-no-seletor-e-e-recusado-ao-gravar`.
