# CH-06 · Conferência contra o protótipo — a faixa da loja e a tela do painel

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | design-check |
| Prioridade   | P2 |
| Persona      | PER-01 Adri |
| Tour         | — |
| Modo         | — |
| Time-box     | 60 min · orçamento: 50 ações (duas telas) |
| Mudança      | a faixa ouro acima do cabeçalho (UC-01, UC-02) e a tela "Faixa de avisos" do painel (UC-03) |
| Viewport     | os frames do protótipo; 1440 × 900 e 390 × 844 na loja; 1440 × 900 e 1023 de largura no painel |
| Massa        | só lê a faixa do manifesto; não salva nada no painel |
| Driver       | — |
| Entrada      | `http://localhost:8082/` e `http://localhost:8083/admin/faixa-de-avisos` · logada como `admin-loja` |
| Jornadas     | — |
| TC           | TC-UI-004, TC-UI-005 |

## Missão

Conferir, valor a valor, que a faixa da loja e a tela do painel entregam o que o protótipo aprovado desenha — e separar o que é diferença do que a costura já decidiu diferente.

## Deve tentar

1. Listar os arquivos do projeto no Claude Design e ler só as duas telas do charter.
2. Comparar a faixa na Home (texto e imagem) e a tela do painel com o aviso aberto, o card de prévia e a barra de salvar.
3. Provocar o cenário "Destino externo" do protótipo no painel, sem salvar.

## Edge cases sugeridos

- Foco nas setas (o design não desenha — anotar)
- 768 de largura na loja (fonte de 14 px e setas)
- Grade do corpo do aviso abaixo de 1024

## Fora do escopo

- O que a costura decidiu diferente do protótipo (spec › Design, tabela de divergências): giro de 6 s, pausa pelo dedo, altura fixa, subtítulo com 6 segundos, frase do salvo, região "Avisos da loja", arrastar, interruptor que nasce desligado, prévia em iframe com seletor, o link "Black Friday" dos departamentos
- Os textos de exemplo e a arte placeholder do protótipo (artifício de protótipo)
- O resto da Home e do painel desenhados no mesmo protótipo (Campanhas, perfil): são de outros WI

## Design

**Fonte de design:** Claude Design, projeto "Uma Estrelinha - Black Friday" · `claude_design` · `4abe021d-d77e-4fe7-affd-524180315fa3` · de item.md › Insumos

| Tela do app (rota) | No design (frame, nó ou arquivo) | Viewports com frame | Estados a conferir |
| --- | --- | --- | --- |
| loja `/` — a faixa | `Black Friday - Home.html` · `FaixaTopo` (`bf-loja.jsx`), `.faixa*` (`bf.css`) · https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Black+Friday+-+Home.html | os que o arquivo trouxer | Textos · Imagens · Desligada |
| painel `/admin/faixa-de-avisos` | `Painel - Campanhas, faixa e perfil.html` · tela **Faixa de avisos** (`adm-faixa-perfil.jsx`) · https://claude.ai/design/p/4abe021d-d77e-4fe7-affd-524180315fa3?file=Painel+-+Campanhas%2C+faixa+e+perfil.html | os que o arquivo trouxer | padrão · aviso aberto (texto e imagem) · desligada · cenário "Destino externo" |
