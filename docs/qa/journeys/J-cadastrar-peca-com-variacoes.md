# J-cadastrar-peca-com-variacoes: cadastrar uma peça que repete um padrão do catálogo

Feature `81` (`.specs/features/81-opcoes-e-variacoes-do-produto/`, `AD-063`). Superfície: `apps/backoffice`,
aba **Preços & variações** de `/admin/produtos/novo` e `/admin/produtos/:id/editar`. Área `PNL`.

## Persona desta jornada

> A persona abaixo ainda não está em `personas.md` (que mora na branch `feature/mobile-adm`); entra lá
> no merge. Fica aqui para a jornada não depender do arquivo de outra branch.

```yaml
persona:
  name: Adri cadastrando peças
  base: Power User
  goal: cadastrar várias peças parecidas seguidas (mesmas opções, mesmos tamanhos) sem digitar tudo de novo
  device: desktop (1440) e phone-large (390), com a fonte do sistema às vezes em 130 % ou 200 %
  network: wifi-fast
  modality: mouse + teclado no notebook; toque no celular
  locale: pt-BR
  patience_seconds: 20
```

Faz a peça, fotografa e cadastra na mesma tarde. O que mais custa é repetir: o nome da opção, os
valores e o preço de cada linha. O que mais assusta é a grade apagar uma linha que já foi vendida.

## Mapa

```yaml
journey:
  id: J-cadastrar-peca-com-variacoes
  entry: [/admin/produtos/novo, /admin/produtos/:id/editar → aba Preços & variações]
  goal: a peça salva com as opções certas e uma linha ATIVA por combinação, com preço, preço "de" e peso padrão, e a foto de cada variação
  exit: reabrir o produto mostra a mesma grade, sem "Alterações não salvas"
  side_effects: [products.options, product_variants (insert/update/delete), fotos no bucket product-images, consulta a order_items por variação que sai]
```

## Fluxo

```mermaid
flowchart TD
    A[Entrada: Novo produto ou Editar] --> B[Aba Preços & variações]
    B --> C[Preço, preço de e peso padrão]
    C --> D[Adicionar opção]
    D --> E[Nome da opção: digita e vê os nomes do catálogo]
    E -->|escolhe um nome conhecido| F[Valores usados em outros produtos + Usar os N valores]
    E -->|texto livre| G[Digita valores e Enter]
    F --> H[Linhas nascem ATIVAS com os padrões, no mesmo gesto]
    G --> H
    H --> I{Mais mudanças?}
    I -->|remove valor| J[Linha com id real vai à consulta de pedidos]
    J -->|sem pedido| J1[Linha sai]
    J -->|vendida ou consulta falhou| J2[Linha fica PAUSADA + aviso que a nomeia]
    I -->|renomeia| K[Mesmas linhas, chave nova]
    I -->|segunda opção| L[Linhas existentes ganham o 1º valor; o resto nasce com os padrões]
    I -->|nome repetido| M[Já existe uma opção com este nome. — grade não muda]
    I -->|apaga o nome| N[Grade não perde linha]
    H --> O[Botão de imagem 48px na linha]
    O --> P[Modal: todas as fotos, Usar a principal, Adicionar imagens]
    P -->|escolhe| P1[Miniatura na linha, modal fecha]
    P -->|envia| P2[Salvar travado durante o envio; foto entra na Mídia e fica escolhida]
    P -->|envio falha| P3[Frase de uploadFailureMessage, nada muda]
    P1 --> Q[Salvar rascunho / publicar]
    P2 --> Q
    Q --> R[Side effect: products + product_variants gravados]
    R --> S[FIM VERDADEIRO: reabrir mostra a mesma grade e nada sujo]
    B -.->|F5 / fecha a aba| X1[Abandono: oferta de Restaurar rascunho; a grade volta igual]
    P -.->|Esc / toque fora| X2[Abandono do modal: nada muda na linha]
```

## Cenários derivados

`PNL-variacoes-*` em `../scenarios/`. As dimensões da taxonomia, por jornada: caminho feliz (nascer
ativa, sugestão, imagem), erro e borda (OPV-23..27), dado (linha vendida, posição), ambiente (390, 1440,
fonte 130/200 %) e acesso (alvo de toque, nome acessível). Leitor de tela real e Android real não foram
cobertos neste ciclo — registrado no relatório.
