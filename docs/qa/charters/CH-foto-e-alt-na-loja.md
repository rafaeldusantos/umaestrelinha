# CH-foto-e-alt-na-loja: subir foto com a rede ruim e ver o alt chegar na vitrine

```yaml
charter:
  id: CH-foto-e-alt-na-loja
  mission: "Subir imagens sob rede degradada e arquivos hostis, e seguir o alt-text e a imagem da variação até a página do produto — o upload mentia na copy e o alt não chegava a ninguém"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: flaky
    locale: pt-BR
  journey: J-foto-e-alt-do-produto
  scenarios: [MED-upload-rejeita-antes-de-comprimir, MED-webp-1600-no-storage, MED-alt-gerado-por-template, MED-estudio-nao-grava-sem-aplicar, MED-imagem-por-variacao-na-loja, MED-alt-chega-na-loja]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Tentar um arquivo de 12 MB e conferir que a rejeição nomeia arquivo e motivo SEM a aba travar — a validação vem antes da compressão"
      - "Subir 6 arquivos com a rede em Slow 3G, 2 inválidos: progresso por arquivo, os 4 válidos sobem, falha parcial não cancela o lote; cortar a rede no meio de um upload"
      - "Acionar Gerar no alt-text com o painel de rede aberto: ZERO requisições (é template puro, não IA), e duas gerações dão a mesma string"
      - "Abrir o estúdio, compor, Aplicar a todos e FECHAR sem aplicar; conferir o bucket product-images e products.images intactos"
      - "Apontar imagem para a variação e conferir na loja (Marina) a troca da foto e o atributo alt no HTML (Sofia)"
    must_avoid:
      - "Editor de template de mockup (feature 06) — aqui só o estúdio"
      - "Qualidade visual do composto: é UAT manual por decisão (A12), não veredito de sessão"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
