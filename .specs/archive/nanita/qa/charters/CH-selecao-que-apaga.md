# CH-selecao-que-apaga: as seis ações da barra, com a irreversível no centro

```yaml
charter:
  id: CH-selecao-que-apaga
  mission: "Exercitar as seis ações da barra de massa com duas abas abertas, procurando exclusão sem conhecimento prévio, cópia que vaza para a vitrine e lista velha que engana — a única ação do backoffice sem desfazer está aqui"
  mode: charter-with-tour
  persona:
    name: Dora
    device: laptop
    network: wifi-fast
    locale: pt-BR
  journey: J-agir-na-selecao-sem-perder-catalogo
  scenarios: [BLK-barra-oferece-as-seis-acoes, BLK-duplicar-nasce-rascunho, BLK-exportar-volta-pelo-importador, BLK-excluir-mostra-antes-de-apagar, BLK-excluir-nao-orfana-pedido]
  tour: Multi-Tab Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "Excluir: ler a lista da etapa 1 (nome, preço, status), cancelar, reabrir, digitar excluir em minúsculas e confirmar — conferindo que só os selecionados saíram"
      - "Abrir a listagem em duas abas: excluir na aba A e agir sobre a mesma linha na aba B; e duplicar na A enquanto a B ainda mostra a lista antiga"
      - "Exportar o CSV dos selecionados e reimportá-lo pelo Importar CSV sem editar nada"
      - "Tentar excluir um produto cujas variações já foram vendidas e conferir a mensagem E a página do pedido antigo depois"
    must_avoid:
      - "Painel de Editar em massa — é CH-massa-mexe-em-dinheiro"
      - "Excluir produtos do seed que outras sessões deste ciclo ainda vão usar: duplicar primeiro e excluir as cópias"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
