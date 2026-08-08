# CH-url-antiga-continua-chegando: trocar o endereço sem matar o link do Stories

```yaml
charter:
  id: CH-url-antiga-continua-chegando
  mission: "Trocar a URL de um produto publicado e voltar pelo link antigo, como quem clicou no Stories da semana passada — o defeito aqui não gera reclamação, só venda que não acontece"
  mode: charter-with-tour
  persona:
    name: Nana
    device: desktop
    network: wifi-fast
    locale: pt-BR
  journey: J-mudar-url-sem-quebrar-link
  scenarios: [PRD-slug-mora-so-em-seo, PRD-slug-disponibilidade-antes-do-save, PRD-slug-vinculo-com-o-nome, PRD-slug-301-preserva-link-antigo]
  tour: Back-Button Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "Anotar a URL publicada, trocar o slug com o toggle de 301 ligado, salvar, e abrir a URL ANTIGA em aba nova (como Marina, no celular) — tem que chegar ao produto"
      - "Digitar um slug que já existe: Já existe em vermelho, sugestão de sufixo e Salvar bloqueado — sem esperar o UNIQUE do banco"
      - "Mudar o nome antes e depois de editar o slug à mão, conferindo o vínculo e o aviso de que ele foi rompido"
      - "Voltar (back) da loja para o formulário e conferir que a tela não mostra a URL velha como se fosse a atual"
    must_avoid:
      - "Toggle de 301 desligado em produto que outras sessões vão abrir — usar um produto de teste"
```

<!-- The charter is durable and immutable: re-run it in later cycles; each run's debrief goes in that run's report (Session Debriefs), never here. -->
