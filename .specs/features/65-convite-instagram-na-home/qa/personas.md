# Personas — Uma Estrelinha (loja pública)

Quem abre a loja muitas vezes acabou de perder alguém (`CLAUDE.md`, topo). Cerca de 90% dos acessos
vêm de celular. As personas abaixo carregam isso e não são as do catálogo-semente copiadas.

## Luciana — chega pela primeira vez, no celular

```yaml
persona:
  name: Luciana
  base: New User
  goal: entender o que a loja faz com as cinzas da mãe dela antes de decidir qualquer coisa, e saber se dá para confiar
  device: phone-small
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 20
```

Ela chega por um link compartilhado num grupo de família, no celular e com uma mão só. Está
fragilizada: qualquer coisa que pareça propaganda insistente a afasta. Um convite que cubra a página
antes de ela ler uma linha conta como intrusão. Um convite calmo, que dá para fechar com
facilidade, ela pode até aceitar: ver o trabalho sendo feito é exatamente o que ela quer.

## Carla — volta para decidir, no computador

```yaml
persona:
  name: Carla
  base: Casual User
  goal: voltar à loja para escolher a joia de leite materno que viu semana passada
  device: desktop
  network: wifi-fast
  modality: mouse-keyboard
  locale: pt-BR
  patience_seconds: 60
```

É a segunda ou terceira visita dela, e o objetivo já está claro. Se o convite voltasse a cada
visita, ela se irritaria; o que ela espera é que a loja lembre que já disse "agora não".

## Teresa — navega por teclado e leitor de tela

```yaml
persona:
  name: Teresa
  base: Accessibility-Reliant
  goal: conhecer o trabalho da loja e seguir o perfil, usando só o teclado e o VoiceOver
  device: laptop
  network: wifi-fast
  modality: keyboard-only
  locale: pt-BR
  patience_seconds: 45
```

Para ela, um diálogo que abre sem anunciar o próprio nome, que prende o foco sem saída ou que não
fecha com Esc é uma parede.

## Fora desta rodada

- **Recovering User:** não há fluxo de erro nesta feature, porque o convite não faz requisição.
- **Power User:** o convite aparece uma vez só; não há atalho nem operação em lote a testar.
