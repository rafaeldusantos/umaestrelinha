# Personas do projeto

Instâncias, não metodologia (ver `qa-report/references/personas.md`). Atualizar quando o público mudar.

## Adri no celular (dona, administra a loja)

```yaml
persona:
  name: Adri no celular
  base: Mobile User
  goal: acompanhar pedidos, clientes e descontos da loja pelo celular, sem abrir o notebook
  device: phone-large
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 10
```

Faz as joias à mão e atende sozinha. Abre o app entre uma peça e outra, muitas vezes com uma mão só.
É quem mais se machuca se o app disser algo falso sobre a loja (um pedido, um acesso).

## Adri voltando depois de esquecer a senha

```yaml
persona:
  name: Adri recuperando o acesso
  base: Recovering User
  goal: voltar a entrar no ateliê depois de esquecer a senha, sem pedir ajuda
  device: phone-large
  network: 4g
  modality: touch
  locale: pt-BR
  patience_seconds: 30
```

A última tentativa terminou em "E-mail ou senha inválidos". A confiança está baixa: qualquer
instrução que não bata com o e-mail que chegou (link × código) faz ela desistir.

## Cliente da loja que achou o endereço do ateliê

```yaml
persona:
  name: Cliente com conta da loja
  base: Casual User
  goal: entrar com a conta de cliente que ela já tem (não é admin)
  device: phone-small
  network: wifi-fast
  modality: touch
  locale: pt-BR
  patience_seconds: 15
```

Tem conta de cliente (`customers`), nunca teve papel admin. O que ela vê prova o limite de acesso:
nenhum dado da loja, uma frase clara e um jeito de sair.

## Pessoa da equipe com leitor de tela

```yaml
persona:
  name: Equipe com TalkBack
  base: Accessibility-Reliant
  goal: entrar e navegar pelas abas só com o leitor de tela do Android
  device: phone-large
  network: wifi-fast
  modality: screen-reader
  locale: pt-BR
  patience_seconds: 20
```

Hoje a equipe é a Adri sozinha; a persona existe porque o acesso é o mesmo do Backoffice e outra
pessoa pode ganhar papel admin em `/admin/usuarios`. Em navegador ela é aproximada pela árvore de
acessibilidade; o TalkBack de verdade só no aparelho.

## Adri cadastrando peças (painel, celular e notebook)

```yaml
persona:
  name: Adri cadastrando peças
  base: Power User
  goal: cadastrar e publicar peças seguidas, e curar o que aparece no Google, sem travar em texto de marketing
  device: desktop (1440) e phone-large (390), com a fonte do sistema às vezes em 130 % ou 200 %
  network: wifi-fast
  modality: mouse + teclado no notebook; toque no celular
  locale: pt-BR
  patience_seconds: 20
```

Faz a peça, fotografa e cadastra na mesma tarde. Escreve no registro memorial da loja: nada festivo, nada
de urgência. O que mais assusta é perder o texto que ela já escreveu, ou a loja mostrar no Google algo que
ela não viu. Estava em `journeys/J-cadastrar-peca-com-variacoes.md` (`81`); entrou aqui no ciclo da `84`.
