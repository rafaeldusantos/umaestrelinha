# QA Run Report — 2026-10-24 — mobile-adm-clientes (rodada 1, charter CH-clientes-achar-quem-me-escreveu)

- **Scope:** feature `76`: achar a cliente colando o que a Adri tem dela (nome, e-mail, telefone) e abrir a ficha.
- **Cadence tier:** targeted (rodada 1)
- **Build:** working tree sem commit (`feat/76-mobile-adm-clientes`), `pnpm --filter @estrelinha/mobile-adm build` + `vite preview --port 4376`. Bundle servido conferido: `index-DjYbbA3P.js` contém "Não encontrei esta cliente". Painel desktop (`vite --port 8083`) só para conferir a ficha.
- **Environment:** 390×844 móvel, Supabase local :54441 (sem interceptação do banco, salvo vazios e 500 forçados), `*.supabase.co` e `**/g/collect*` abortados, service worker bloqueado. Fixturas `prova/fixturas.sql` da `76` e oito cadastros `QA76C…` próprios (apagados ao fim). Outras sessões escrevem no mesmo banco (63 clientes ao fim).
- **Nota de processo:** este relatório é separado do `2026-10-24-mobile-adm-clientes.md` porque outra sessão o reescrevia em paralelo e o conteúdo de uma se perdia.
- **Status:** closed

## Session Matrix & Results

| # | Charter | Scenario | Status | Issue |
|---|---|---|---|---|
| 1 | CH-clientes-achar-quem-me-escreveu | MAD-clientes-abrir-a-lista; MAD-clientes-linha-sem-nome-sem-compra | Pass | |
| 2 | idem | MAD-clientes-buscar-nome-email-telefone (29 termos colados, corrida de respostas) | Pass | BUG-20261024-busca-nao-acha-colada-com-espaco-duplo-ou-nbsp; BUG-20261024-busca-nao-acha-email-colado-com-sinais; BUG-20261024-busca-sem-acento-nao-acha-nome-com-acento |
| 3 | idem | MAD-clientes-estados-vazios | Pass | |
| 4 | idem | MAD-cliente-abrir-e-entender (4 fichas contra o painel) | Pass | |
| 5 | idem | MAD-cliente-whatsapp-em-branco | Blocked (needs human verify) | abrir o app do WhatsApp no aparelho |
| 6 | idem | MAD-cliente-email-com-underscore-nao-mistura (app × painel) | Pass | BUG-20261024-painel-ficha-puxa-pedido-de-outra-pessoa-por-underscore (no painel) |

## Session Debriefs

### CH-clientes-achar-quem-me-escreveu, Adri no celular (Paste Tour)

- **Ran:** 2026-10-24, ~60 min (caixa respeitada: sim). Oito cadastros `QA76C…` extras: telefone curto, mascarado, com 55, fixo, só espaços, texto, nome só de espaços, nome com HTML.
- **Passou:** telefone colado como `(51) 99812-4471`, `51998124471`, `+55 51 99812-4471`, `(51)99812-4471`, `55 (51) …`, `51 99812 4471`, `99812` e `8124471` acham a mesma pessoa; tab, quebra de linha e espaço não separável **nas pontas** são aparados; e-mail em maiúsculas e nome em outra caixa acham; `%`, barra invertida, `(`, vírgula, `"` e `'` valem como texto (sem erro, sem curinga) e `_` só acha quem tem sublinhado literal; o par `P76VROSA_RJ`/`P76VROSAXRJ` não se mistura na lista nem na ficha do app; CPF não acha ninguém (esperado); o termo nunca vai à URL; trocar de termo com a resposta velha atrasada 3 s deixa o termo novo; vazios com frase própria e Limpar (base vazia, recorte, busca) e a falha 500 com "Tentar de novo"; ficha: WhatsApp `https://wa.me/55…`, nova aba, `noopener noreferrer`, 44 px, só com telefone válido; sem nome ou só espaços usa o e-mail; HTML no nome sai como texto; gasto, ticket e pagos iguais ao painel; foco no `h1` ao abrir pela lista e busca preservada ao voltar. Zero erro de console.
- **Findings:**
  - Nome colado com dois espaços ou espaço não separável no meio: "Não achei ninguém" (Friction, Low).
  - E-mail colado como `Nome <email>`, `mailto:` ou com ponto final, e rótulos `Cel:`/`Tel`: nada (Friction, Low).
  - Nome sem acento não acha nome com acento, paridade com o painel (Friction, Low, decisão).
  - O painel desktop puxa o pedido de outra cliente na ficha por causa do `_` do e-mail (`Pedidos · 2` com GASTOU R$ 150,00); o app está certo (Trust-Damage, Medium, fora do escopo declarado da `76`; a spec A10 descreve a divergência).
- **Bugs filed/updated:** os quatro acima (ids na matriz).
- **Scenarios settled:** MAD-clientes-abrir-a-lista pass; MAD-clientes-buscar-nome-email-telefone pass; MAD-clientes-estados-vazios pass; MAD-clientes-linha-sem-nome-sem-compra pass; MAD-cliente-abrir-e-entender pass; MAD-cliente-email-com-underscore-nao-mistura pass (o painel diverge); MAD-cliente-whatsapp-em-branco blocked-verify.
- **Paper cuts:** ver abaixo.
- **Surprises:** `*` e `.` devolvem todos os 63 (`*` vira curinga de um caractere por desenho, declarado em `like.ts`; `.` está em todo e-mail); `(51` vira também o termo de dígitos `51` e acha 35; um fixo de 10 dígitos ganha o botão do WhatsApp; um pedido `P76-QA1` de outra sessão apareceu e sumiu da ficha da Marina no painel durante a medição (dado compartilhado, não defeito).
- **Suggested next charter:** `CH-clientes-do-pedido-a-ficha-e-voltar` e `CH-clientes-numeros-batem-com-o-painel`; "Conversar no WhatsApp" num Android real.

## What Was Fixed

Nada nesta rodada: nenhum dos quatro cabe no governor sem decisão (o dono `core/customers` é compartilhado com o painel, e o acento pede migration).

## Paper Cuts

| Persona | Where | Felt | Sharpness | Outcome |
|---|---|---|---|---|
| Adri | busca com termo gigante | colar 2500 caracteres faz a frase de vazio repetir o termo inteiro e ocupar ~20 linhas, empurrando o Limpar para baixo | baixa | registrado, sem bug |
| Adri | busca | `*` e `(51` devolvem dezenas de clientes como se fossem achados | baixa | registrado, declarado em `like.ts` |

## Decisions for a Human

1. **Sujeira da colagem e acento na busca** (três bugs). Opções: (a) aceitar, mantendo a paridade com o painel; (b) normalizar espaços e e-mail entre sinais no dono `core/customers` (barato, sem migration); (c) dobrar o acento no banco (migration com `unaccent`). Recomendação: (b) agora, (c) só se a Adri sentir falta.
2. **Painel e o sublinhado do e-mail.** Levar `useAdminCustomer` ao `ilikeExact` do dono (uma linha) ou deixar para a feature do painel. Recomendação: corrigir; é Trust-Damage e o dono já existe.

## Final Status

Rodada 1, uma sessão: 6 linhas, 5 pass e 1 blocked-verify. Bugs por impacto: Trust-Damage 1 (no painel), Friction 3, Blocks-Completion 0, Data-Loss 0, Cosmetic 0. Nenhum bloqueia a jornada de achar uma cliente no app. Pendente: WhatsApp num aparelho. Suíte automatizada não executada por esta sessão (nenhum código de produto foi alterado; baseline da `76` em `.specs/features/76-mobile-adm-clientes/baseline.md`).

Evidências: `docs/qa/evidence/2026-10-24-mobile-adm-clientes/` (`sessao-colar.txt`, `busca-longa-390.png`, `ficha-*-390.png`, `vazio-*`, `erro-lista-390.png`, `lista-fixturas-390.png`).
