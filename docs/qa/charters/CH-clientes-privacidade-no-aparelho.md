# CH-clientes-privacidade-no-aparelho: varrer URL, history.state, armazenamento, título e console depois de buscar e abrir fichas

```yaml
charter:
  id: CH-clientes-privacidade-no-aparelho
  mission: "Como a Adri com o celular que pode ser perdido, varrer URL, history.state, armazenamento, título e console depois de buscar e abrir fichas, porque nome, e-mail e telefone de quem confiou algo precioso não podem sobrar no aparelho."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 4g
    locale: pt-BR
  journey: J-achar-uma-cliente
  scenarios: [MAD-clientes-privacidade-nada-no-aparelho, MAD-clientes-troca-de-conta-limpa-tela]
  tour: Garbage Tour
  time_box_minutes: 30
  guidance:
    must_try:
      - "buscar por nome, e-mail e telefone, abrir três fichas, voltar; depois varrer location, history.state, localStorage, sessionStorage, IndexedDB, document.title, caches do service worker e o console"
      - "a aba de rede: só requisições ao Supabase da loja, e nenhuma com e-mail na query string da rota do app"
      - "sair e entrar com outra conta: nada da anterior, nem durante o esqueleto"
    must_avoid:
      - "capturas de tela com dado real: usar só fixturas @exemplo.invalid"
```
