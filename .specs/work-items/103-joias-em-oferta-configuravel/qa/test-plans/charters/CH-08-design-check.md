# CH-08 · design-check — os padrões do protótipo no editor do bloco

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | design-check                                                                  |
| Prioridade   | P2                                                                            |
| Persona      | PER-01 Adri                                                                   |
| Tour         | —                                                                             |
| Modo         | —                                                                             |
| Time-box     | 30 min · orçamento: 25 ações                                                  |
| Mudança      | o editor do bloco adota três padrões do protótipo (D-01): contador "n / teto" ao lado do rótulo, recusa com ícone de alerta abaixo do campo, lista ordenada com subir/descer/tirar como alternativa ao arraste — CA-01.6, CA-03.2, RNF-08 |
| Viewport     | 1440 × 900 (o painel); o protótipo na largura do frame dele                   |
| Massa        | só lê — abre o editor de B-1, provoca uma recusa (título com 61) e **Cancela** |
| Driver       | `—`                                                                           |
| Entrada      | `/admin/home` no painel (`:8083`) · logada como `admin-loja`; o protótipo numa aba separada |
| Jornadas     | —                                                                             |
| TC           | TC-UI-002 — 1 TC em 25 ações                                                  |

## Missão

Conferir se os três padrões que a costura adotou do protótipo estão no editor do bloco como o protótipo os
desenha — e só eles: as telas do bloco não estão no protótipo.

## Deve tentar

1. Abrir o artifact e localizar, na tela de campanha do painel, o campo com contador, a recusa abaixo do campo e a
   lista ordenada. **Liste antes de ler**; padrão que você não localizar vai como `blocked` (design)
2. No editor de B-1: o contador do título e da descrição; a recusa do título com 61 caracteres; a lista de peças
   com subir, descer e tirar. Comparar estrutura e texto do padrão (posição do contador, formato "n / teto",
   ícone e posição da recusa, os três controles por linha)
3. Cancelar

## Edge cases sugeridos

- O estado de foco dos botões subir/descer
- A recusa da descrição (161) além da do título

## Fora do escopo

- o bloco na loja (sem fonte de design nova: a referência é o componente da 102 — TC-FUNC-008)
- a lista da Home, a bandeja e a linha do bloco (sem frame no protótipo)
- a dica do campo nome da campanha no protótipo ("aparece no título … do bloco de ofertas da Home"): é
  comportamento da 102 superado pelo título configurável (D-01) — PRD prevalece, não é diferença
- cor, tipografia e espaço do painel além dos três padrões: não há frame do editor para comparar

## Design

**Fonte de design:** `SQehnBNiiQmbnjkY3QQpbq` · "Painel — Campanhas, faixa de avisos e perfil de estilo" · `link` · https://claude.ai/artifact/SQehnBNiiQmbnjkY3QQpbq · de item.md › Insumos (protótipo desta WI, informado em 2026-11-16)

A outra fonte do Work Item — Claude Design "Black Friday - Home.html" da WI 102 — está **inacessível** (login
recusado) e não entra nesta sessão.

| Tela do app (rota)  | No design (frame, nó ou arquivo) | Viewports com frame | Estados a conferir                 |
| ------------------- | -------------------------------- | ------------------- | ---------------------------------- |
| `/admin/home/<B-1>` — FormCard Conteúdo (título, descrição) | o campo "nome" da campanha, com contador ao lado do rótulo | o do protótipo | padrão · erro (recusa) |
| `/admin/home/<B-1>` — FormCard Peças escolhidas (lista) | a lista ordenada com subir/descer/tirar | o do protótipo | padrão · foco |
| `/admin/home/<B-1>` — o bloco inteiro, a linha e a bandeja | sem frame | — | não comparar — registrar "sem frame" |
