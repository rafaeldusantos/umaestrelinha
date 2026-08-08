# J-cadastrar-lote-grade-rapida — Cadastrar os 20 itens do drop colando do Excel

A journey da feature `13`/P2.3 mais a coluna de imagem que a `14`/P1.3 acrescentou. O ganho prometido
é inteiro ou não é ganho: cadastrar 20 e depois abrir 20 formulários para pôr foto anula metade.

```mermaid
flowchart TD
    A[Entrada: /admin/produtos → Novo produto ▾ → Grade rápida] --> B[Faixa Padrões de todas as linhas:\ncategorias, eixos de opção, preset de peso, salvar como rascunho]
    B --> C[Planilha: # · imagem · Nome* · Categorias · Preço* · Estoque · Tags · SKU base · check]
    C --> D[Cola 8 linhas do Excel com ⌘V]
    D --> D1[Distribui em linhas e células, aplicando as máscaras pt-BR ao interpretar preço]
    D1 --> E{Linha tem erro?}
    E -->|sim| E1[Erro imediato ABAIXO da linha: Preço é obrigatório / já existe um produto com a URL /...]
    E1 --> F[Rodapé: N prontas · M com erro]
    E -->|não| F
    F --> G[Escolhe arquivo na célula de imagem]
    G --> G1[Mesma validação da aba Mídia: PNG/JPG/WebP, 8 MB, WebP 1600 px]
    G1 --> G2{Upload da linha falhou?}
    G2 -->|sim| G3[Linha segue criável SEM imagem, com o motivo nomeado]
    G2 -->|não| G4[Miniatura na célula, com ação de remover]
    G3 --> H[Ação primária: criar]
    G4 --> H
    H --> I[Cria APENAS as linhas válidas, como rascunho]
    I --> I1[As linhas com erro FICAM na tela para correção]
    I --> J[Efeito: um insert de produtos + um de variações + UM refetch]
    J --> K[Cada produto nasce com a grade do cruzamento dos padrões, herdando o preço da linha]
    K --> L[A imagem da linha entra em images como url, alt, source upload]
    L --> M[True end: os N produtos aparecem na listagem como rascunho,\ncom foto, faixa de preço e grade — e a rede registra 1 insert, não N]
    D -.->|cola 500 linhas| X1[Abandono A: limita a 200 com aviso explícito, em vez de travar a aba]
    G4 -.->|remove a linha depois de subir a foto| X2[Abandono B: arquivo fica órfão no Storage — declarado, não resolvido]
    F -.->|desiste no meio| X3[Abandono C: sai da tela — o que já foi criado está criado]
```

```yaml
journey:
  id: J-cadastrar-lote-grade-rapida
  name: "Cadastrar os 20 itens do drop colando do Excel, com foto e grade"
  value_statement: "O drop inteiro entra numa tela, com os padrões preenchendo o que se repete — sem 20 idas ao formulário"
  personas: [Nana, Dora]
  entry_points:
    - url: http://localhost:8081/admin/produtos/grade-rapida
      origin: in-app-nav
  actions:
    - step: 1
      verb: "Abre Novo produto ▾ e escolhe Grade rápida"
      expected_observable: "O menu oferece Novo produto, Grade rápida e Importar CSV; a tela abre com a faixa de padrões e a planilha"
    - step: 2
      verb: "Define os padrões do lote: categorias, eixos de opção, peso"
      expected_observable: "O que a linha não informa é herdado do padrão"
    - step: 3
      verb: "Cola 8 linhas do Excel, uma sem preço"
      expected_observable: "Linhas e células distribuídas; erro imediato abaixo da linha inválida; rodapé 7 prontas · 1 com erro"
    - step: 4
      verb: "Navega com Tab e duplica uma linha com ⌥↓"
      expected_observable: "Foco avança célula a célula; a linha é duplicada"
    - step: 5
      verb: "Escolhe uma foto na célula de imagem de duas linhas"
      expected_observable: "Miniatura na célula com ação de remover; arquivo grande/typo errado rejeitado com o motivo nomeado, sem impedir a criação da linha"
    - step: 6
      verb: "Aciona criar"
      expected_observable: "Só as válidas são criadas, como rascunho; as com erro ficam na tela"
  goal:
    observable: "N produtos rascunho criados com grade de variações e imagem, numa escrita em lote"
    side_effects: [records-inserted, variant-rows-inserted, images-uploaded, single-refetch]
  true_end_state: "Os N produtos estão na listagem como rascunho, com thumb, faixa de preço e contagem de variações; a rede registra um insert de produtos, um de variações e um refetch — não N de cada; e a foto está em products.images com source upload"
  exit:
    natural: "Vai para a listagem conferir o lote, ou corrige as linhas que sobraram com erro"
  abandonment:
    - at_step: 3
      how: "Cola 500 linhas de uma planilha grande"
      resume: "O lote é limitado a 200 com aviso explícito (A24) — a aba não trava"
    - at_step: 5
      how: "Sobe a foto e depois remove a linha da planilha"
      resume: "O arquivo fica órfão no Storage — comportamento declarado na spec, não achado de QA"
  crosses: [backoffice, supabase-postgrest, supabase-storage]
```

## Notas

- **O critério de sucesso é de rede, não de tela.** `PLS-08` nasceu porque o importador de CSV chamava
  `createProduct` num laço e cada chamada terminava em `fetchProducts()` — 40 produtos = 40 `SELECT`s
  do catálogo inteiro. Um lote que cria os produtos certos com N requisições **falha** o requisito
  mesmo com a tela verde. Contar as requisições faz parte da sessão.
- **A coluna de imagem tem que reusar a lib da aba Mídia** (`A30`). Um segundo caminho de upload com
  validação própria divergiria — foi o argumento que manteve a coluna fora da `13`. Então o teste é
  comparativo: o mesmo arquivo de 12 MB rejeitado na aba Mídia tem que ser rejeitado aqui, com a mesma
  mensagem.
- **Herança dos padrões é onde o silêncio é caro:** se um padrão não é aplicado, o produto nasce sem
  categoria ou sem grade e ninguém vê — a linha foi criada, afinal. Conferir no banco o que herdou.
