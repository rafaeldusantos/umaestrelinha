# BUG-20260802-gerar-do-seo-nao-gera-nada: o botão diz "Gerar" e só troca de aba, deixando os campos vazios

- **Status:** verified <!-- open | fixed | verified | wont-fix | invalid -->
- **Impact (user-side):** Friction
- **Severity:** Medium · **Priority:** P2
- **Persona Affected:** Dora (e Nana, com menos custo — ela sabe escrever o SEO)
- **Journey Step:** `J-nao-perder-o-trabalho-no-formulario`, passo 7 — o checklist "Pronto para publicar"
- **Scenarios:** PRD-checklist-e-resumo-dizem-a-verdade
- **Found:** 2026-08-02 · **Report:** `../reports/2026-08-02-backoffice-catalogo-11-14.md`

## Summary

No checklist "Pronto para publicar", o item pendente **SEO preenchido** oferece uma ação escrita
**`Gerar`**. Clicando nela, a tela troca para a aba SEO — e os campos *Título* e *Descrição* continuam
**vazios**. Nada foi gerado, e não há nenhum outro botão de gerar na aba.

Para Dora, que clicou em `Gerar` justamente por não saber o que escrever, o resultado é chegar numa aba
em branco sem entender o que aconteceu. Ela não fica bloqueada — dá para digitar à mão — mas a ação
prometeu uma coisa e fez outra.

## Reproduction

- **Charter:** CH-cadastro-de-produto-com-grade · **Tour:** Feature Tour
- **Environment:** backoffice desktop 1440×900, pt-BR

1. Abrir um produto sem SEO em `/admin/produtos/:id/editar`
2. No inspetor à direita, achar o checklist com o item **SEO preenchido — "Preencha título e descrição de SEO."**
3. Clicar na ação **`Gerar`** à direita do item

**Expected:** ou o título e a descrição são preenchidos (é o que "Gerar" promete), ou a ação se chama `Ir →` como nos outros itens pendentes.
**Actual:** navega para a aba SEO com os dois campos vazios; o item do checklist continua pendente.

## Evidence

- Checklist antes: `Pronto para publicar / 5 de 6 … SEO preenchido / Preencha título e descrição de SEO. / Gerar`
- Depois do clique: aba selecionada = `SEO`; `Título para mecanismos de busca` e `Descrição para mecanismos de busca` com valor `""`; checklist continua `5 de 6`
- Rede durante o clique: nenhuma chamada de geração (só uma consulta de disponibilidade de slug, do debounce da própria aba)

## Fix

<!-- filled when status moves to fixed -->
- **Root cause (a apurar):** há uma tensão entre duas decisões de spec, e por isso este bug vai para
  decisão humana em vez de correção direta:
  - `RFN-07` AC 5 (feature `14`) manda o item de SEO mostrar a ação **`Gerar`** — diferente do `Ir →`
    dos outros itens.
  - `AD-011` (features `11`, `12` e `14`) tira **"Gerar com IA" do SEO de escopo**, deliberadamente: não
    há provedor no projeto e nenhuma AC descreve o texto a gerar.
  Ou seja, a AC pede um rótulo para uma ação que outra decisão diz que não existe. A implementação
  ficou no meio: mostra o rótulo e faz o `Ir →`.
- **Nota:** o `Gerar` do **alt-text** (aba Mídia, `PMD-01` AC 2) é outro caso e **está no escopo** —
  é template determinístico, não IA. Não confundir os dois ao corrigir.
- **Decisão aplicada:** opção 1 — o rótulo passa a ser `Ir →`, igual aos outros itens pendentes. Entre
  um rótulo que promete o que não existe e um que descreve o que o clique faz, fica o segundo. A letra
  de `RFN-07` AC 5 (que pede `Gerar`) fica **conscientemente divergente**, porque `AD-011` é a decisão
  mais forte: sem provedor e sem AC descrevendo o texto, não há o que gerar. Gerar SEO por template
  determinístico — como já se faz no alt-text — continua possível como feature própria.
- **Fix commit:** `f620217`
- **Regression test:** `apps/backoffice/src/features/product-form/ui/PublishChecklist.test.tsx` — o teste
  que existia **fixava o rótulo errado** (`expect(screen.getByText('Gerar'))`), e por isso passava
  enquanto a tela mentia. Reescrito: todo item pendente mostra `Ir →`, nenhum mostra `Gerar`, e clicar
  no item de SEO chama `onFocusField`. Falha sem a correção.

## Verification

- **Retested:** 2026-08-02, produto sem SEO aberto no backoffice em execução · **Report:**
  `../reports/2026-08-02-backoffice-catalogo-11-14.md`
- **Result:** o checklist mostra `Ir →` no item de SEO e nenhum `Gerar`. O `Gerar` do **alt-text** (aba
  Mídia, `PMD-01`) segue existindo e funcionando — é outro componente e não foi tocado.
