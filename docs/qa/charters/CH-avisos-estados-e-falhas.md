# CH-avisos-estados-e-falhas: cada estado da tela de avisos, e cada falha dizendo a frase certa

```yaml
charter:
  id: CH-avisos-estados-e-falhas
  mission: "Como a Adri no celular, passar pela tela de avisos com permissão negada, navegador sem push, porta caindo ao ativar, ao gravar um interruptor, ao testar e ao parar, porque uma tela que diz ligado quando não está faz ela perder pedido."
  mode: charter-with-tour
  persona:
    name: Adri no celular
    device: phone-large
    network: 3g-flaky
    locale: pt-BR
  journey: J-receber-aviso-de-pedido
  scenarios: [MAD-avisos-permissao-bloqueada, MAD-avisos-navegador-sem-suporte, MAD-avisos-falha-ao-ativar, MAD-avisos-interruptor-por-evento, MAD-avisos-aviso-de-teste, MAD-avisos-teste-antes-de-30s, MAD-avisos-parar-neste-celular]
  tour: Network Tour
  time_box_minutes: 60
  guidance:
    must_try:
      - "rede cortada e 500 em cada ação da porta, uma de cada vez; conferir que nada aparece ligado sem estar"
      - "dois toques rápidos no interruptor e no Avisar neste celular"
      - "teste duas vezes em menos de 30 s, e de novo depois de 30 s"
    must_avoid:
      - "confundir a frase de falha com a recusa de papel: 403 sem 42501 é falha"
```
