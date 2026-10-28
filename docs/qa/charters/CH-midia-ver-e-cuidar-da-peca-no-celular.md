# CH-midia-ver-e-cuidar-da-peca-no-celular: abrir a peça, reconhecê-la pela foto e cuidar das fotos até salvar, no celular

```yaml
charter:
  id: CH-midia-ver-e-cuidar-da-peca-no-celular
  mission: "Provar que a Adri vê a peça sem rolar, amplia, acrescenta e edita as fotos e que o que ela salvou é o que volta ao reabrir"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-resumo-mostra-a-peca, PNL-midia-zoom-percorrer, PNL-midia-adicionar-pelo-resumo, PNL-midia-modal-edicao-completa]
  tour: Money Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "390×844 com sessionStorage limpo: onde termina a principal? Depois o mesmo em 1440 (Goal)"
      - "Peça TESTE-85-QA- com 3 fotos: acrescentar 2 pelo Resumo, abrir o modal no meio do envio, reordenar, escrever um alt, Gerar outro, remover a principal, pôr um vídeo"
      - "Salvar, conferir products.images/video_url no banco local, reabrir: mesmo Resumo, Vídeo · sim, nada sujo"
      - "Inventário da antiga aba: envio, colar, ordenar, remover, alt, Gerar, selo, vídeo — algum faltou?"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
      - "Gerar alt-text com chamada externa real: interceptar"
```
