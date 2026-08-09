# J-agir-na-selecao-sem-perder-catalogo — Ativar, pausar, duplicar, exportar e excluir a seleção

A journey da feature `14`/P1.1 — as cinco ações diretas que a `13` deixou como lacuna declarada
("o admin seleciona 12 produtos e descobre que a única coisa que dá para fazer com eles é abrir um
painel"). Uma delas é **irreversível e sem desfazer**: excluir. Por isso a confirmação em duas etapas
é o miolo da journey, não um detalhe de UI.

```mermaid
flowchart TD
    A[Entrada: /admin/produtos] --> B[Seleciona 12 linhas]
    B --> C[Barra de massa com as SEIS ações + contagem]
    C --> D{Qual ação?}
    D -->|Ativar / Pausar| E[Muda status numa operação]
    E --> E1[Toast X alterados · Y falharam + Desfazer · 30 s — o mesmo da edição em massa]
    E1 --> E2[True end: a vitrine passa a mostrar / deixa de mostrar os 12]
    D -->|Duplicar| F[Uma cópia por selecionado, num único insert]
    F --> F1[Cada cópia nasce RASCUNHO, com nome sufixado cópia e slug próprio]
    F1 --> F2{Slug da cópia já existe?}
    F2 -->|sim| F3[Sufixo até ficar livre — o UNIQUE do banco não é a 1ª linha de defesa]
    F2 -->|não| F4[True end: as cópias aparecem na listagem como rascunho, sem tocar os originais]
    F3 --> F4
    D -->|Exportar| G[Baixa CSV só dos selecionados]
    G --> G1[Colunas iguais às que o Importar CSV aceita]
    G1 --> G2[Produto com grade leva base_price, não a faixa]
    G2 --> G3[True end: o CSV baixado é relido pelo Importar CSV sem edição manual]
    D -->|Excluir| H[Etapa 1: LISTA os produtos — nome, preço, status]
    H --> H1[Informa quantos são · seleção grande mostra os primeiros N e mais X]
    H1 --> I[Etapa 2: exige a palavra EXCLUIR digitada]
    I -->|excluir minúsculo| I1[Aceito — exigir caixa exata é hostilidade]
    I -->|cancela em qualquer etapa| I2[Abandono A: nada excluído, seleção preservada]
    I1 --> J[Exclusão]
    I --> J
    J -->|parcial| J1[Relata X excluídos · Y falharam — sem a tela mentir]
    J --> K[True end: os 12 saíram da listagem e do banco; nada além deles saiu;\npedido antigo que referencia variação NÃO fica órfão]
    D -.->|seleciona 160 e manda excluir| X1[Abandono B: modal com 160 nomes é ruído, não conhecimento prévio]
```

```yaml
journey:
  id: J-agir-na-selecao-sem-perder-catalogo
  name: "Agir em lote sobre a seleção: ativar, pausar, duplicar, exportar, excluir"
  value_statement: "A seleção serve para alguma coisa — e a ação que não tem volta mostra o que vai apagar antes de apagar"
  personas: [Nana, Dora]
  entry_points:
    - url: http://localhost:8081/admin/produtos
      origin: in-app-nav
  actions:
    - step: 1
      verb: "Seleciona 12 produtos"
      expected_observable: "A barra oferece Editar em massa, Ativar, Pausar, Duplicar, Exportar e Excluir, dizendo quantos são"
    - step: 2
      verb: "Aciona Pausar e depois Ativar"
      expected_observable: "Uma operação; toast X alterados · Y falharam com Desfazer · 30 s"
    - step: 3
      verb: "Aciona Duplicar"
      expected_observable: "Uma cópia por item, como rascunho, com (cópia) no nome e slug próprio livre — num único insert"
    - step: 4
      verb: "Aciona Exportar e reabre o arquivo no Importar CSV"
      expected_observable: "CSV com as colunas do importador, só dos selecionados, e relido sem edição manual"
    - step: 5
      verb: "Aciona Excluir"
      expected_observable: "Etapa 1 lista nome, preço e status de cada um e informa quantos são; etapa 2 exige a palavra EXCLUIR (minúsculas aceitas)"
    - step: 6
      verb: "Cancela na etapa 2, reabre e confirma"
      expected_observable: "No cancelamento nada é excluído e a seleção fica; ao confirmar, relato honesto de X excluídos · Y falharam"
  goal:
    observable: "A ação escolhida se aplicou exatamente aos selecionados, com relato fiel do resultado"
    side_effects: [status-updated, records-inserted, csv-downloaded, records-deleted]
  true_end_state: "Depois de F5: os pausados não aparecem na vitrine, as cópias estão na listagem como rascunho sem tocar os originais, o CSV exportado volta pelo importador, e os excluídos saíram do banco sem levar nada além — nem o histórico de pedidos que referencia variações"
  exit:
    natural: "Listagem recarregada, seleção limpa"
  abandonment:
    - at_step: 5
      how: "Ela lê a lista de exclusão, reconhece um produto que não devia estar ali e cancela"
      resume: "Nada excluído; a seleção permanece para ela desmarcar o item e repetir"
    - at_step: 1
      how: "Seleciona os 160 do filtro e manda excluir"
      resume: "A confirmação mostra os primeiros N e um e mais X — listar 160 nomes não é conhecimento prévio"
  crosses: [backoffice, supabase-postgrest, loja-vitrine, importador-csv]
```

## Notas

- **Excluir não tem desfazer, e isso é a razão do desenho.** `A27`: `useUndoBuffer` restaura valores,
  não linhas apagadas. As duas etapas (listar + digitar `EXCLUIR`) são a única proteção que existe.
- **A exclusão tem uma armadilha de banco conhecida:** a FK `order_items.variant_id →
  product_variants(id)` é `NO ACTION` (`PFM-08 AC 9a`). Excluir produto cujas variações já foram
  vendidas tem que falhar de forma legível — nunca erro de FK cru na cara da lojista, nunca sumir com
  o histórico do pedido. É o cenário de maior severidade desta journey.
- **`Exportar` só está andado quando o CSV volta.** Baixar arquivo é meio caminho; o fecho do ciclo
  (`A26`) é o `Importar CSV` reler o que foi exportado sem edição manual.
