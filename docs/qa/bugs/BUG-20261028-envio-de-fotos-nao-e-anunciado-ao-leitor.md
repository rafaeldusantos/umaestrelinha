# BUG-20261028-envio-de-fotos-nao-e-anunciado-ao-leitor: Quem usa leitor de tela não ouve "enviando" nem "enviada" ao mandar fotos

- **Status:** fixed — retestado em navegador (2026-10-28, working tree, sem commit; `verified` depois do commit) · reteste em `reports/2026-10-28-backoffice-resumo-com-imagens-reteste.md`
- **Impact (user-side):** Friction
- **Severity:** Low · **Priority:** P3
- **Persona Affected:** Equipe com TalkBack
- **Journey Step:** J-ver-e-cuidar-das-fotos-da-peca, Adicionar imagens (Resumo e modal)
- **Scenarios:** PNL-midia-teclado-e-leitor; PNL-midia-adicionar-pelo-resumo
- **Found:** 2026-10-28 · **Report:** reports/2026-10-28-backoffice-resumo-com-imagens.md

## Summary

Ao enviar fotos, as linhas "arquivo · enviando/enviada/falhou" aparecem no Resumo e no modal, mas nenhuma está numa
região viva: o leitor não anuncia o início nem o fim do envio. Só a falha chega ao leitor, pelo toast (região
`assertive`). O cenário pede "progresso e falha de envio são anunciados".

## Reproduction

- **Charter:** CH-midia-teclado-e-leitor · **Tour:** Feature Tour
- **Environment:** 1440×900 e 390×844, Chromium, árvore de acessibilidade

1. Enviar um PNG pelo "Adicionar" do Resumo e pelo modal.
2. Procurar `aria-live`/`role=status` em volta da lista.

**Expected:** "enviando"/"enviada" anunciados (região `polite`).
**Actual:** Resumo: `<ul aria-label="Progresso do envio">` sem `aria-live` nem ancestral vivo; modal: `<ul>` sem nome e sem região viva.
A lista do modal vem da galeria de antes da 85; a do Resumo é nova.

## Evidence

- Relatório, sessão 6 (leitura do DOM).

## Fix

- **Root cause:** as listas de progresso do Resumo e da galeria do modal não estavam em região viva. Achado no conserto: o `aria-hidden` que o Radix põe na página com o modal aberto POUPA regiões vivas, então com as duas vivas o envio seria anunciado em dobro.
- **Fix commit:** commit pendente (sem commit, regra do projeto) — aplicado na working tree: as duas listas dentro de um `<div aria-live="polite">` que existe antes do envio (`ProductMediaSummary.tsx`, `ImageGallery.tsx`); o Resumo recebe `announce={!mediaOpen}` da página e fica `aria-live="off"` com o modal aberto. Sem `role="status"`: a página já tem uma região de status (a frase da sugestão de SEO) e os testes da `84` a procuram como única.
- **Regression test:** `ProductMediaSummary.test.tsx` (região viva antes do envio; `announce={false}` a desliga), `ImageGallery.test.tsx` (região viva no modal) e `AdminProductFormPage.midia.test.tsx` › "o envio é anunciado uma vez só" (uma região falando com o modal fechado, uma com ele aberto) — vermelhos antes. Reteste com leitor de tela real pendente.

## Reteste (2026-10-28) — passou (leitura do DOM; leitor de tela real segue pendente)

390×844, `/admin/produtos/novo`, todas as regiões `[aria-live]` lidas a cada passo:

| momento | regiões vivas de envio |
|---|---|
| modal fechado, antes do envio | Resumo `polite` (vazia, já no DOM) |
| modal fechado, durante | Resumo `polite` = "rt85-azul.png enviando" → "enviada" |
| modal aberto, antes | Resumo **`off`**; modal `polite` (vazia) |
| modal aberto, durante/fim | Resumo `off` ("rt85-vermelho.png enviando/enviada"); modal `polite` = "rt85-vermelho.png 1 KB enviando/enviada" |

Com o modal aberto, nenhuma das duas está sob `aria-hidden`; só UMA fala por vez. A outra `polite` sempre presente é
a seção do Toaster (vazia, do app inteiro). Observação: no modal, o sucesso também sai pelo toast `assertive`
"1 imagem(ns) enviada(s)!" (comportamento da galeria de antes da 85), então o leitor ouve o fim do envio duas vezes
por canais diferentes — não reabre o bug; fica como paper cut no relatório.
