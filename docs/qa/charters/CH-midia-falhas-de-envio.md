# CH-midia-falhas-de-envio: o envio de fotos falhando sem deixar a Adri sem saber o que entrou

```yaml
charter:
  id: CH-midia-falhas-de-envio
  mission: "Achar falha de envio que some em silêncio, trava o Salvar, deixa foto fantasma ou derruba o lote inteiro"
  mode: charter-with-tour
  persona:
    name: Adri cadastrando peças
    device: phone-large
    network: wifi-fast
    locale: pt-BR
  journey: J-ver-e-cuidar-das-fotos-da-peca
  scenarios: [PNL-midia-falha-de-envio, PNL-midia-adicionar-pelo-resumo]
  tour: Network Tour
  time_box_minutes: 45
  guidance:
    must_try:
      - "Soltar GIF, PDF e HEIC no Resumo e no modal (o seletor filtra, o drop não)"
      - "Lote de 3 com o POST do Storage abortado no 2º: os outros entram? o toast diz qual?"
      - "Ficar offline no meio do envio e voltar; o Salvar volta a habilitar?"
      - "Fechar a aba no meio do envio: o que sobra no Storage local (listar e apagar)"
    must_avoid:
      - "Salvar produto real do catálogo (usar peça TESTE-85-QA- e apagá-la no fim, com os objetos que ela enviou ao Storage); qualquer chamada a *.supabase.co e **/g/collect*"
```
