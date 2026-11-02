# CH-09 · design-check — cartão "Agora na loja" e tela "Loja ao vivo" · Ateliê Admin.dc.html

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | design-check |
| Prioridade   | P2 |
| Persona      | PER-01 Adri |
| Tour         | — |
| Modo         | — |
| Time-box     | 45 min · orçamento 40 ações |
| Mudança      | o cartão do Início (LAV-01, LAV-02) e os blocos A–E e Acessos (LAV-10, LAV-11, LAV-20, LAV-30, LAV-40, LAV-45, LAV-51) |
| Viewport     | 390 (o protótipo só tem frame de celular) |
| Entrada      | http://localhost:8084/ como `admin-atelie`, com 3 clientes presentes em estados e origens diferentes (como no CH-01 e no CH-04) |
| Jornadas     | J-01, J-02 |
| TC           | TC-UI-001, TC-UI-002, TC-UI-003 |

## Missão

Conferir o cartão e a Loja ao vivo contra o protótipo, propriedade a propriedade, onde o PRD não decidiu
diferente.

## Deve tentar

1. Cartão do Início no estado cheio
2. Blocos A e B no estado cheio
3. Blocos C, D, E e Acessos

## Edge cases sugeridos

- Só o estado cheio está desenhado — os outros não têm régua aqui

## Fora do escopo

- Estados não desenhados (carregando, falha, vazio, não medida, recusa) — régua é o PRD (D-20), não o protótipo
- As 18 divergências design × PRD listadas em `spec.md` › Design — **vale o PRD** (nome acessível, partes que
  somem no zero, "Compraram" sem barra, nota sem prazo, foto no lugar do ícone, faixa "Outros", "o resto pelo
  computador ou tablet", "Visitas"/"Com sacola" no lugar de "Visitantes únicos"/"Sacolas criadas", variação só
  quando medida, seletor com `aria-pressed`, semana desde segunda, `h1`, grades `auto-fit`, barras com
  movimento reduzido); diferença ali é `spec-gap` resolvido, não achado
- Cidades e a célula ao lado de E (D-19: E ocupa a linha inteira)
- Dado fictício do protótipo (números, nomes de joia)

## Design

**Fonte de design:** Ateliê Admin · `claude_design` · projeto `a780eec8-8aba-4d6e-8b4c-2c485e2750c7`, arquivo `Ateliê Admin.dc.html` (etag `1793064028832969`) · de `item.md`. Cópia local e capturas em 390 (`arquivo`, para quando o MCP não estiver na sessão): `.specs/features/83-loja-ao-vivo/prototipo/Atelie-Admin.dc.html`, `01-inicio-390.png`, `02-inicio-cartao-agora-na-loja.png`, `03-ao-vivo-topo-390.png`, `05-ao-vivo-fim-390.png`, `04-acessos-hoje.png`, `04-acessos-ontem.png`, `04-acessos-semana.png`; descrição em `.specs/features/83-loja-ao-vivo/prototipo.md`.

| Tela do app (rota)             | No design (frame, nó ou arquivo)                        | Viewports com frame | Estados a conferir |
| ------------------------------ | ------------------------------------------------------- | ------------------- | ------------------ |
| `/` — cartão "Agora na loja"   | Início › cartão "Agora na loja" · `02-inicio-cartao-agora-na-loja.png`, `01-inicio-390.png` | 390 | padrão (cheio) |
| `/ao-vivo` — cabeçalho, A e B  | Loja ao vivo › topo · `03-ao-vivo-topo-390.png`        | 390                 | padrão (cheio) |
| `/ao-vivo` — C, D, E           | Loja ao vivo › fim · `05-ao-vivo-fim-390.png`          | 390                 | padrão (cheio) |
| `/ao-vivo` — Acessos           | Loja ao vivo › Acessos · `04-acessos-hoje.png`, `-ontem`, `-semana` | 390        | Hoje · Ontem · Semana |
