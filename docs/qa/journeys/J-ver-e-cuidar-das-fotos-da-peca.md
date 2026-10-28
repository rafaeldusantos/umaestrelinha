# J-ver-e-cuidar-das-fotos-da-peca: abrir uma peça, reconhecê-la pela foto e cuidar das fotos sem trocar de aba

Feature `85` (`.specs/features/85-resumo-com-imagens-do-produto/`, `RES-01`..`RES-09`, `ZOM-01`..`ZOM-06`,
`ADI-01`..`ADI-06`, `MOD-01`..`MOD-07`). Superfície: `apps/backoffice`, card **Resumo** da coluna lateral de
`/admin/produtos/:id/editar` (e de `/novo`), o visualizador de zoom e o modal **Mídia** (que substituiu a aba
Mídia). O card "Prévia na loja" saiu. Área `PNL`. Personas: Adri cadastrando peças (principal) e Equipe com
TalkBack (`../personas.md`).

```yaml
journey:
  id: J-ver-e-cuidar-das-fotos-da-peca
  entry: [/admin/produtos/:id/editar, /admin/produtos/novo, pendência "imagens" do checklist Pronto para publicar]
  goal: ver a foto principal sem rolar nem trocar de aba (390×844), conferir detalhe no zoom, acrescentar/ordenar/descrever/remover fotos e o vídeo, e gravar no Salvar
  exit: reabrir a peça mostra no Resumo as mesmas fotos, na mesma ordem, com o alt-text e o "Vídeo · sim/não" salvos, e nada sujo
  side_effects: [objeto novo no bucket product-images (na hora do envio), products.images e products.video_url (no Salvar), product_variants.image_url limpo quando a foto apontada sai (clearMissingVariantImages)]
```

## Fluxo

```mermaid
flowchart TD
    A[Abrir a peça] --> B{Tem imagens?}
    B -->|não| B1[Resumo: Nenhuma imagem ainda + Adicionar imagens]
    B -->|sim| C[Resumo: principal 1:1 + até 7 miniaturas de 72px]
    C -->|mais de 8| C1[Ladrilho +N - Ver mais N imagens]
    C --> D[Toca na principal ou miniatura]
    C1 --> D2[Zoom abre na 9a imagem]
    D --> E[Zoom: n/N, setas, ←/→, gesto > 48px, alt embaixo]
    D2 --> E
    E -->|Esc / Fechar / fundo| E1[Fecha; foco volta à imagem que abriu]
    C --> F[Adicionar imagens: seletor ou arrastar arquivo no card]
    B1 --> F
    F --> F0[Solte para enviar, enquanto arrasta]
    F --> F1[Linha de progresso por arquivo; Salvar desabilitado]
    F1 -->|ok| F2[Fotos novas no fim, alt vazio, origem upload]
    F1 -->|arquivo não aceito / rede| F3[Toast de uploadFailureMessage; o resto do lote segue]
    C --> G[Editar mídia → modal Mídia]
    B1 -->|pendência imagens do checklist| G
    G --> G1[Ordenar, remover, alt-text, Gerar, colar, arrastar, vídeo]
    G1 --> G2[Resumo atrás muda ao vivo; Alterações não salvas]
    G1 -->|remove foto apontada por variação| G3[Linha da variação perde a foto]
    G2 --> H[Concluir / X / Esc: nada é descartado; foco volta a Editar mídia]
    F2 --> I[Salvar rascunho / Salvar e publicar]
    H --> I
    I --> J[Side effect: products.images, video_url, product_variants.image_url]
    J --> K[FIM VERDADEIRO: reabrir com sessionStorage limpo mostra o mesmo Resumo e nada sujo]
    C -.->|sai sem salvar / F5| X1[Abandono: guarda de saída; Há um rascunho não salvo na volta]
    F1 -.->|fecha a aba no meio do envio| X2[Abandono: objeto no Storage sem dono; nada em products]
```

## Dimensões (taxonomia)

| Dimensão | Coberto por |
| --- | --- |
| Caminho feliz | ver a peça, zoom, adicionar pelo botão, editar no modal, salvar e reabrir |
| Erro e borda | arquivo não aceito, rede caindo no envio, produto sem imagem, 9 e 28 fotos, imagem que não carrega |
| Dado | ordem após remover a principal, foto apontada por variação, `alt` vazio ("Imagem 1"), vídeo sim/não, "+N" com N = 1 |
| Ambiente | 360/390/412 e 1024/1440, fonte 100/130/200 %, arrasto nativo do sistema (só humano), gesto com dedo real (Android) |
| Acesso | nomes acessíveis ("Ampliar imagem n de N", "Ver mais N imagens"), foco devolvido pelo zoom e pelo modal, alvos de 44px (MOD-07, ZOM-06) |

Pré-existente, registrado como bug e não da `85`: `BUG-20261028-produto-abre-com-alteracoes-nao-salvas`.
